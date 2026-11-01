/* Vérification du jeu concours (concours.html, assets/js/concours.js, scripts/generer-concours.js) :
   1) sous Node, le générateur : aucun concours → « Aucun concours en ce moment » ; concours de test → titre, dates,
      lot, valeur, règlement rempli (aucun champ {…} restant, liste de l'article 3), texte échappé, SQL d'insertion
      affiché ; relancé sans changement → page identique ; données invalides → code 1, rien d'écrit ; page publiée à jour ;
      données du site : tableau CONCOURS vide, "concours" absent de PA_SUPABASE.activees ;
   2) dans Edge (390 px, horloge simulée), avec un faux Supabase en mémoire qui reprend les règles des migrations
      2026-11-01-concours-* : page publiée (aucun concours) ; fonction non activée (« bientôt disponible », aucun appel
      à la base) ; non connecté (lien de connexion avec retour) ; cases non cochées refusées sans envoi ; participation,
      compteur, rechargement, retrait avec confirmation ; terminé en attente du tirage ; tiré : graine, méthode,
      empreintes des gagnants, gagnant (« Tu as gagné », case « afficher mon pseudo »), perdant (son empreinte calculée
      dans le navigateur, plus grande que celle du dernier gagnant), jamais l'identifiant d'un autre joueur ;
      durée d'affichage (tant que non tiré, puis 60 jours après le tirage) ; partage facultatif (navigator.share, sinon
      liens WhatsApp, Facebook, X et « Copier le lien », aucune requête tierce) ; notes internes du règlement retirées et
      espaces insécables ; 320 px sans débordement ; aucune erreur console.
   Lancer depuis la racine du site : node scripts/verifier-concours.cjs */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),os=require('node:os'),crypto=require('node:crypto');
const {spawnSync}=require('node:child_process');
const {chromium}=require('playwright');
const racine=path.join(__dirname,'..');
let nb=0;
function ok(nom){nb++;console.log('OK '+nom);}
process.on('unhandledRejection',e=>{if(e&&e.name==='TargetClosedError')return;console.error(e);process.exitCode=1;});
const lire=f=>fs.readFileSync(path.join(racine,f),'utf8');
const generer=args=>spawnSync(process.execPath,['scripts/generer-concours.js',...args],{cwd:racine,encoding:'utf8'});
const sha=t=>crypto.createHash('sha256').update(t,'utf8').digest('hex');

/* ---------- Données de test ---------- */
const OUVERT={id:'2026-11-raquette',titre:'La raquette <de> Noël & "toi"',lot:"une raquette d'essai",valeur:249.95,date_debut:'2026-11-01',date_fin:'2026-11-30',nb_gagnants:1};
const PASSE={id:'2026-10-sac',titre:"Le sac d'octobre",lot:'un sac de padel',valeur:60,date_debut:'2026-10-01',date_fin:'2026-10-15',nb_gagnants:2,tire:true};
const fixture=liste=>'const CONCOURS='+JSON.stringify(liste)+';\n';
const GRAINE='2026-12-01:3-14-25-36-47:2-9';
// Deux comptes : le gagnant est celui dont l'empreinte « graine:id » est la plus petite
const IDS=['11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222'].sort((a,b)=>sha(GRAINE+':'+a)<sha(GRAINE+':'+b)?-1:1);
const GAGNANT=IDS[0],PERDANT=IDS[1];

const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'concours-'));
const PAGE_TEST=path.join(tmp,'concours.html'),DONNEES_TEST=path.join(tmp,'donnees.js');

function testerGenerateur(){
 // Données du site : concours lancés par l'organisateur seulement, fonction non activée sans son accord écrit
 const donnees=lire('assets/js/concours-donnees.js');
 const vide=/const CONCOURS=\[\s*\];/.test(donnees);
 const active=/activees\s*=\s*\[[^\]]*"concours"/.test(lire('assets/js/supabase-config.js'));
 assert.ok(!(active&&vide),'"concours" activé sans aucun concours dans les données');
 let r=generer(['--verifier']);
 assert.equal(r.status,0,r.stderr);
 if(vide){
  assert.match(lire('concours.html'),/<!-- concours:debut -->\n<p class="msg msg-info cc-aucun" id="cc-aucun">Aucun concours en ce moment, reviens bientôt\.<\/p>\n<!-- concours:fin -->/);
  ok('données du site : aucun concours, "concours" non activé, page publiée à jour (« Aucun concours en ce moment »)');
 }else{
  assert.doesNotMatch(lire('concours.html'),/<!-- concours:debut -->\n<p class="msg msg-info cc-aucun"/,'la page doit afficher le concours');
  ok('données du site : concours valides, "concours" '+(active?'activé':'non activé')+', page publiée à jour');
 }

 fs.copyFileSync(path.join(racine,'concours.html'),PAGE_TEST);
 fs.writeFileSync(DONNEES_TEST,fixture([PASSE,OUVERT]));
 r=generer(['--donnees',DONNEES_TEST,'--page',PAGE_TEST]);
 assert.equal(r.status,0,r.stderr);
 const html=fs.readFileSync(PAGE_TEST,'utf8');
 const blocBrut=html.slice(html.indexOf('<!-- concours:debut -->')+23,html.indexOf('<!-- concours:fin -->'));
 // Notes internes du règlement (commentaires HTML) jamais publiées
 assert.ok(!/<!--/.test(blocBrut),'commentaire HTML du règlement publié');
 assert.ok(!/brouillon|Mention courte|NOTES INTERNES|Variante plus courte/i.test(blocBrut),'note interne du règlement publiée');
 // Typographie : espace insécable avant : ; ? ! et dans « », jamais d'espace ordinaire à ces places (texte seulement)
 const textes=[...blocBrut.matchAll(/>([^<]+)</g)].map(m=>m[1]).join('\n');
 assert.ok(!/ [:;?!»]|« /.test(textes),'espace ordinaire avant : ; ? ! ou dans « » : '+(textes.match(/.{0,30}(?: [:;?!»]|« ).{0,10}/)||[''])[0]);
 assert.ok(textes.includes('«\u00a0graine:identifiant du compte\u00a0»'),'« graine:identifiant du compte » : insécables autour, aucune espace ajoutée après « graine »');
 assert.ok(textes.includes('Contact\u00a0: samuelkyllian@hotmail.com'));
 assert.ok(textes.includes('Le jeu concours «\u00a0La raquette &lt;de&gt; Noël &amp; &quot;toi&quot;\u00a0»'));
 assert.ok(!/href="[^"]*\u00a0/.test(blocBrut),'espace insécable dans une adresse');
 ok('règlement : notes internes (commentaires <!-- -->) retirées ; espaces insécables avant : ; ? ! et dans « », « graine:identifiant » intact');
 const bloc=blocBrut.replace(/\u00a0/g,' ');
 assert.ok(bloc.indexOf('id="concours-2026-11-raquette"')<bloc.indexOf('id="concours-2026-10-sac"'),'le plus récent en premier');
 assert.match(bloc,/<h2 id="cc-titre-2026-11-raquette">La raquette &lt;de&gt; Noël &amp; &quot;toi&quot;<\/h2>/);
 assert.match(bloc,/Du 1er novembre 2026 au 30 novembre 2026 inclus \(heure de Paris\)/);
 assert.match(bloc,/<dd>249,95 € TTC<\/dd>/);
 assert.match(bloc,/<dd>2 gagnants, tirés au sort<\/dd>/);
 assert.match(bloc,/Le jeu comporte 2 gagnants, désignés par tirage/);
 assert.match(bloc,/Les 2 participations qui ont les plus petites empreintes gagnent\./);
 assert.doesNotMatch(bloc,/\(s\)/,"pas de « (s) » dans le règlement");
 assert.match(bloc,/<dt>Tirage au sort<\/dt><dd>fait : graine, empreintes des gagnants/);
 assert.ok(!/gagnants_publics|pseudo :/.test(bloc),'donnée de gagnant dans le fichier de données');
 assert.match(bloc,/Le jeu concours « La raquette &lt;de&gt; Noël &amp; &quot;toi&quot; » \(ci-après/);
 assert.match(bloc,/<p>2\.2\. Le jeu est ouvert du 1er novembre 2026 au 30 novembre 2026 inclus/);
 assert.match(bloc,/d'une valeur commerciale indicative de 249,95 € TTC/);
 assert.match(bloc,/<ul>\n<li>La « graine » est formée/);
 assert.match(bloc,/<a href="confidentialite\.html#jeu-concours">Confidentialité<\/a>/);
 assert.equal(/\{[a-z_]+\}/.test(bloc),false,'champ {…} non rempli');
 assert.equal(/<(?!\/?(?:article|h2|h3|p|dl|div|dt|dd|details|summary|ul|li|a)\b)[a-z]/i.test(bloc.replace(/<!--[^>]*-->/g,'')),false,'balise inattendue (texte non échappé)');
 assert.match(r.stdout,/insert into public\.concours \(id, titre, date_debut, date_fin, nb_gagnants\)\nvalues \('2026-11-raquette', 'La raquette <de> Noël & "toi"', '2026-11-01 00:00 Europe\/Paris', '2026-11-30 23:59:59 Europe\/Paris', 1\)/);
 assert.match(r.stdout,/'Le sac d''octobre'/);
 assert.equal((r.stdout.match(/on conflict \(id\) do nothing;/g)||[]).length,2,'SQL : on conflict (id) do nothing');
 assert.ok(!/do update/.test(r.stdout),'SQL : jamais de mise à jour silencieuse');
 ok('générateur : titre, dates, lot, valeur, tirage fait (aucune donnée de gagnant dans le fichier), règlement rempli sans champ {…}, texte échappé, SQL « on conflict (id) do nothing »');

 r=generer(['--donnees',DONNEES_TEST,'--page',PAGE_TEST]);
 assert.equal(r.status,0);assert.match(r.stdout,/inchangée/);
 assert.equal(fs.readFileSync(PAGE_TEST,'utf8'),html);
 assert.equal(generer(['--donnees',DONNEES_TEST,'--page',PAGE_TEST,'--verifier']).status,0);
 ok('générateur idempotent : relancé sans changement, page identique');

 const invalides=[
  [{...OUVERT,id:'raquette'}],[{...OUVERT,date_fin:'2026-10-01'}],[{...OUVERT,valeur:'250'}],[{...OUVERT,nb_gagnants:0}],
  [{...OUVERT,titre:'Le {lot}'}],[{...OUVERT,gagnants_publics:['Zoé']}],[{...OUVERT,tire:'oui'}],[OUVERT,OUVERT],[{...OUVERT,date_debut:'2026-02-30'}]
 ];
 for(const liste of invalides){
  fs.writeFileSync(DONNEES_TEST,fixture(liste));
  r=generer(['--donnees',DONNEES_TEST,'--page',PAGE_TEST]);
  assert.equal(r.status,1,'données invalides acceptées : '+JSON.stringify(liste).slice(0,80));
  assert.match(r.stderr,/rien n'est écrit/);
  assert.equal(fs.readFileSync(PAGE_TEST,'utf8'),html,'page modifiée malgré des données invalides');
 }
 fs.writeFileSync(DONNEES_TEST,fixture([PASSE,OUVERT]));
 ok('données invalides (id, dates, valeur, gagnants, champ {…}, doublon, gagnants_publics, tire non booléen) : code 1, page inchangée');
}

/* ---------- Faux Supabase (règles des migrations concours-01 à 10) ----------
   État dans sessionStorage (survit aux rechargements) ; chaque appel noté dans « journal ». */
const FAUX=`(function(){
 const base=JSON.parse(sessionStorage.getItem('base')||'null')||{utilisateur:null,concours:[],concours_participations:[],concours_gagnants:[],concours_exclusions:[]};
 const garder=()=>sessionStorage.setItem('base',JSON.stringify(base));
 const noter=x=>{const j=JSON.parse(sessionStorage.getItem('journal')||'[]');j.push(x);sessionStorage.setItem('journal',JSON.stringify(j));};
 const erreur=(message,code)=>({data:null,error:{message,code}});
 const ouvert=c=>c&&!c.tire_le&&Date.parse(c.date_debut)<=Date.now()&&Date.now()<Date.parse(c.date_fin);
 function requete(table){
  let op='select',ligne=null,filtres=[],colonnes='*',unique=false,retour=null;
  const q={
   select(c){if(op==='select')colonnes=c;else retour=c;return q;},eq(c,v){filtres.push([c,v]);return q;},
   insert(l){op='insert';ligne=l;return q;},delete(){op='delete';return q;},update(l){op='update';ligne=l;return q;},
   maybeSingle(){unique=true;return q;},then(res,rej){return Promise.resolve(executer()).then(res,rej);}
  };
  function executer(){
   const u=base.utilisateur;
   noter({table,op,connecte:!!u});
   const projeter=r=>(retour||colonnes)==='*'?{...r}:Object.fromEntries(String(retour||colonnes).split(',').map(c=>[c,r[c]]));
   // RLS de lecture : concours publics ; participations et gagnants, sa propre ligne seulement
   const visible=r=>table==='concours'||(u&&r.user_id===u);
   const garde=r=>visible(r)&&filtres.every(([c,v])=>String(r[c])===String(v));
   if(table!=='concours'&&!u&&op!=='select')return erreur('permission denied','42501');
   if(op==='insert'){
    const c=base.concours.find(x=>x.id===ligne.concours_id);
    if(!c)return erreur('CONCOURS_INCONNU','P0001');
    if(Date.now()<Date.parse(c.date_debut))return erreur('CONCOURS_PAS_COMMENCE','P0001');
    if(!ouvert(c))return erreur('CONCOURS_TERMINE','P0001');
    if((base.concours_exclusions||[]).some(e=>e.concours_id===ligne.concours_id&&e.user_id===u))return erreur('PARTICIPATION_EXCLUE','P0001');
    if(ligne.atteste_majeur_ou_accord!==true||ligne.accepte_reglement!==true)return erreur('CASES_NON_COCHEES','P0001');
    if('user_id' in ligne||'cree_le' in ligne)return erreur('permission denied for column','42501');
    if(base.concours_participations.some(p=>p.concours_id===ligne.concours_id&&p.user_id===u))return erreur('duplicate key value violates unique constraint','23505');
    base.concours_participations.push({...ligne,user_id:u,cree_le:new Date().toISOString()});garder();
    return {data:null,error:null};
   }
   if(op==='delete'){
    const sup=base.concours_participations.filter(r=>garde(r)&&ouvert(base.concours.find(c=>c.id===r.concours_id)));
    base.concours_participations=base.concours_participations.filter(r=>!sup.includes(r));garder();
    return {data:retour?sup.map(projeter):null,error:null};
   }
   if(op==='update'){
    if(table!=='concours_gagnants'||Object.keys(ligne).some(k=>k!=='affiche_publiquement'))return erreur('permission denied','42501');
    const maj=base.concours_gagnants.filter(garde);maj.forEach(r=>Object.assign(r,ligne));garder();
    return {data:retour?maj.map(projeter):null,error:null};
   }
   const res=(base[table]||[]).filter(garde).map(projeter);
   return {data:unique?(res[0]||null):res,error:null};
  }
  return q;
 }
 window.supabase={createClient(){return {
  auth:{getSession:async()=>({data:{session:base.utilisateur?{user:{id:base.utilisateur,email:'joueur@test.fr'}}:null}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),signOut:async()=>({})},
  from:requete,
  async rpc(nom,a){
   noter({rpc:nom,connecte:!!base.utilisateur});
   const c=base.concours.find(x=>x.id===a.p_concours);
   if(nom==='concours_nb_participants')return {data:c?(c.nb_participants??base.concours_participations.filter(p=>p.concours_id===a.p_concours).length):0,error:null};
   if(nom==='concours_gagnants_publics')return {data:base.concours_gagnants.filter(g=>g.concours_id===a.p_concours).sort((x,y)=>x.rang-y.rang).map(g=>({rang:g.rang,pseudo:g.affiche_publiquement?g.pseudo:null,empreinte:g.empreinte})),error:null};
   return erreur('fonction inconnue','PGRST202');
  }
 };}};
})();`;
const CONFIG=lire('assets/js/supabase-config.js')+'\nwindow.PA_SUPABASE.activees=window.PA_SUPABASE.activees.filter(n=>n!=="concours");\n';
const CONFIG_ACTIVE=CONFIG+'\nwindow.PA_SUPABASE.activees=window.PA_SUPABASE.activees.concat(["concours"]);\n';
// Ligne de public.concours du concours ouvert (heures de Paris en UTC : novembre = UTC+1)
const LIGNE={id:OUVERT.id,titre:OUVERT.titre,date_debut:'2026-10-31T23:00:00Z',date_fin:'2026-11-30T22:59:59Z',nb_gagnants:1,tire_le:null,graine:null,graine_empreinte:null,nb_participants:null};

const serveur=http.createServer((req,res)=>{
 const rel=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\//,'')||'index.html';
 const p=path.resolve(racine,rel);
 if(!p.startsWith(racine+path.sep)){res.writeHead(403);res.end();return;}
 fs.readFile(p,(e,b)=>{if(e){res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2','.webmanifest':'application/manifest+json'})[path.extname(p)]||'text/plain');res.end(b);
 });
});

(async()=>{
 testerGenerateur();
 await new Promise(r=>serveur.listen(0,'127.0.0.1',r));
 const adresse='http://127.0.0.1:'+serveur.address().port;
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const erreurs=[];
 const pageTest=fs.readFileSync(PAGE_TEST,'utf8');
 // Nouveau contexte : page de test (concours de la fixture) ou page publiée, faux Supabase, base et utilisateur choisis
 const tiers=[]; // requêtes vers un autre domaine : aucune ne doit viser un réseau social
 const ouvrir=async({date='2026-11-15T10:00:00+01:00',active=true,publiee=false,utilisateur=null,etat=null,largeur=390,init=null}={})=>{
  const ctx=await browser.newContext({serviceWorkers:'block',viewport:{width:largeur,height:844},isMobile:true,hasTouch:true});
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>{tiers.push(r.request().url());return r.fulfill({contentType:'text/javascript',body:''});});
  await ctx.route('**/assets/vendor/supabase-*.js*',r=>r.fulfill({contentType:'text/javascript',body:FAUX}));
  await ctx.route('**/assets/js/supabase-config.js*',r=>r.fulfill({contentType:'text/javascript',body:active?CONFIG_ACTIVE:CONFIG}));
  if(!publiee){
   await ctx.route('**/concours.html',r=>r.fulfill({contentType:'text/html; charset=utf-8',body:pageTest}));
   await ctx.route('**/assets/js/concours-donnees.js*',r=>r.fulfill({contentType:'text/javascript',body:fixture([PASSE,OUVERT])}));
  }
  const page=await ctx.newPage();
  await page.clock.install({time:new Date(date)});
  if(init)await page.addInitScript(init);
  page.on('pageerror',e=>erreurs.push(e.message));
  page.on('console',m=>{if(m.type()==='error')erreurs.push(m.text());});
  await page.goto(adresse+'/index.html');
  await page.evaluate(([e,u])=>{e.utilisateur=u;sessionStorage.setItem('base',JSON.stringify(e));sessionStorage.removeItem('journal');},
   [etat||{concours:[{...LIGNE}],concours_participations:[],concours_gagnants:[]},utilisateur]);
  await page.goto(adresse+'/concours.html');
  return {ctx,page};
 };
 const action='#concours-2026-11-raquette [data-action]';
 // Textes comparés avec les espaces insécables (U+00A0 avant : ; ? ! et dans « ») remplacées par des espaces ordinaires ;
 // leur présence est contrôlée à part
 const texte=async page=>(await page.textContent(action)).replace(/\u00a0/g,' ');
 const attendre=(page,re)=>page.waitForFunction(([s,src])=>new RegExp(src).test(document.querySelector(s).textContent.replace(/\u00a0/g,' ')),[action,re.source]);
 const journal=page=>page.evaluate(()=>JSON.parse(sessionStorage.getItem('journal')||'[]'));
 const base=page=>page.evaluate(()=>JSON.parse(sessionStorage.getItem('base')));
 const largeurOk=async(page,l)=>assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),l,'débordement horizontal à '+l+' px');
 try{
  /* Page publiée : aucun concours */
  let {ctx,page}=await ouvrir({publiee:true,active:false});
  await page.waitForLoadState('load');
  const publieVide=/const CONCOURS=\[\s*\];/.test(lire('assets/js/concours-donnees.js'));
  if(publieVide){
   assert.equal(await page.locator('#cc-aucun').isVisible(),true);
   assert.equal(await page.textContent('#cc-aucun'),'Aucun concours en ce moment, reviens bientôt.');
  }else{
   assert.equal(await page.locator('#cc-aucun').count(),0,'concours publié : pas de « Aucun concours »');
   assert.ok(await page.locator('[id^="concours-"]').count()>=1,'concours publié : carte du concours absente');
  }
  assert.match(await page.textContent('#cc-mention'),/^Jeu gratuit sans obligation d'achat\. Participation réservée aux joueurs connectés, une par compte\. Tirage au sort\. Règlement ci-dessous\.$/);
  assert.ok(await page.locator('a[href="confidentialite.html#jeu-concours"]').count()>=1);
  assert.equal(await page.locator('#nav-menu a[aria-current="page"]').textContent(),'Jeu concours');
  await largeurOk(page,390);
  ok('page publiée : concours ou « Aucun concours en ce moment », mention courte, lien Confidentialité, menu « Jeu concours »');
  await ctx.close();

  /* Fonction non activée : « bientôt disponible », aucun appel à la base */
  ({ctx,page}=await ouvrir({active:false,utilisateur:PERDANT}));
  await attendre(page,/bientôt disponible/);
  await page.waitForTimeout(300);
  assert.deepEqual((await journal(page)).filter(x=>x.table||x.rpc),[],'appel à la base sans activation');
  assert.equal(await page.locator(action+' form').count(),0);
  assert.equal(await page.textContent('#concours-2026-10-sac [data-action]'),'Jeu terminé, tirage au sort fait.');
  assert.equal(await page.locator('#cc-etat').isHidden(),true);
  ok('non activé : « La participation en ligne au jeu concours sera bientôt disponible », aucune requête vers les tables ni rpc ; ancien concours « Jeu terminé »');
  await ctx.close();

  /* Activé, non connecté */
  ({ctx,page}=await ouvrir());
  await attendre(page,/Connecte-toi pour participer/);
  assert.equal(await page.getAttribute(action+' a.btn','href'),'connexion.html?suite=concours.html');
  await page.waitForFunction(s=>/Aucun participant/.test(document.querySelector(s+' .cc-compteur').textContent),action);
  assert.ok(!(await journal(page)).some(x=>x.table==='concours_participations'),'participation lue sans compte');
  await largeurOk(page,390);
  ok('non connecté : « Connecte-toi pour participer » et lien connexion.html?suite=concours.html ; compteur « Aucun participant »');
  await ctx.close();

  /* Connecté : cases obligatoires, participation, rechargement, retrait */
  ({ctx,page}=await ouvrir({utilisateur:PERDANT}));
  await page.waitForSelector(action+' form');
  await page.click(action+' button[type=submit]');
  await attendre(page,/Coche les deux cases pour participer/);
  assert.equal(await page.evaluate(()=>document.activeElement.id),'cc-case-reglement');
  assert.equal(await page.getAttribute('#cc-case-age','aria-invalid'),'true');
  await page.check('#cc-case-reglement');
  await page.click(action+' button[type=submit]');
  assert.equal(await page.evaluate(()=>document.activeElement.id),'cc-case-age');
  assert.ok(!(await journal(page)).some(x=>x.op==='insert'),'envoi malgré les cases non cochées');
  assert.equal((await base(page)).concours_participations.length,0);
  ok('cases non cochées (aucune, puis une seule) : « Coche les deux cases pour participer », focus sur la case manquante, rien d\'envoyé');
  await page.check('#cc-case-age');
  await page.click(action+' button[type=submit]');
  await attendre(page,/Tu participes au tirage au sort/);
  assert.match(await texte(page),/C'est enregistré/);
  await page.waitForFunction(s=>document.querySelector(s+' .cc-compteur').textContent==='1 joueur participe.',action);
  const b1=await base(page);
  assert.deepEqual(b1.concours_participations.map(p=>[p.concours_id,p.user_id,p.atteste_majeur_ou_accord,p.accepte_reglement]),[[OUVERT.id,PERDANT,true,true]]);
  await page.reload();
  await attendre(page,/Tu participes au tirage au sort\. Tirage après le 30 novembre 2026, résultat sur cette page. Bonne chance !/);
  assert.equal(await page.locator(action+' button',{hasText:'Retirer ma participation'}).count(),1);
  assert.deepEqual(await page.evaluate(()=>Object.keys(localStorage).filter(k=>/concours/.test(k))),[]);
  ok('participation : « Tu participes », compteur à 1, une ligne en base (deux cases vraies), gardée au rechargement, rien dans localStorage');
  await page.click(action+' button:has-text("Retirer ma participation")');
  await attendre(page,/Retirer ta participation \?/);
  await page.click(action+' button:has-text("Annuler")');
  await attendre(page,/Tu participes au tirage/);
  assert.equal((await base(page)).concours_participations.length,1);
  await page.click(action+' button:has-text("Retirer ma participation")');
  await page.click(action+' button:has-text("Oui, retirer ma participation")');
  await attendre(page,/Ta participation est retirée/);
  await page.waitForSelector(action+' form');
  assert.equal((await base(page)).concours_participations.length,0);
  await page.waitForFunction(s=>/Aucun participant/.test(document.querySelector(s+' .cc-compteur').textContent),action);
  await largeurOk(page,390);
  ok('retrait : confirmation dans la page (Annuler garde la participation), puis « Ta participation est retirée », formulaire de retour');
  await ctx.close();

  /* Terminé, en attente du tirage */
  const participations=[{concours_id:OUVERT.id,user_id:PERDANT,cree_le:'2026-11-10T10:00:00Z',atteste_majeur_ou_accord:true,accepte_reglement:true},
   {concours_id:OUVERT.id,user_id:GAGNANT,cree_le:'2026-11-11T10:00:00Z',atteste_majeur_ou_accord:true,accepte_reglement:true}];
  ({ctx,page}=await ouvrir({date:'2026-12-02T10:00:00+01:00',utilisateur:PERDANT,etat:{concours:[{...LIGNE}],concours_participations:participations,concours_gagnants:[]}}));
  await attendre(page,/Le jeu est terminé\. Le tirage au sort a lieu dans les 7 jours qui suivent le premier tirage EuroMillions après le 30 novembre 2026 \(article 3 du règlement\)\./);
  await attendre(page,/Tu participes au tirage/);
  assert.equal(await page.locator(action+' form').count(),0);
  ok('terminé, tirage pas encore fait : message EuroMillions, « Tu participes au tirage », plus de formulaire');
  await ctx.close();

  /* Tiré */
  const tire={concours:[{...LIGNE,tire_le:'2026-12-03T20:00:00Z',graine:GRAINE,nb_participants:2,nb_exclusions:1}],concours_participations:participations,concours_exclusions:[],
   concours_gagnants:[{concours_id:OUVERT.id,rang:1,user_id:GAGNANT,pseudo:'Gagnant<b>',empreinte:sha(GRAINE+':'+GAGNANT),affiche_publiquement:false,tire_le:'2026-12-03T20:00:00Z'}]};
  // Sans compte : résultat public (graine, méthode, empreinte du gagnant, pseudo masqué sans accord)
  ({ctx,page}=await ouvrir({date:'2026-12-10T10:00:00+01:00',etat:tire}));
  await attendre(page,/Résultat du tirage/);
  let t=await texte(page);
  assert.match(t,/connecte-toi pour voir si tu as gagné/);
  assert.ok(t.includes("Graine du tirage, telle qu'enregistrée : "+GRAINE),'graine affichée telle qu\'enregistrée');
  assert.match(t,/Format : AAAA-MM-JJ:n1-n2-n3-n4-n5:e1-e2 \(numéros dans l'ordre de sortie\)\./);
  assert.match(t,/Participations au tirage : 2 · participations écartées : 1\./);
  assert.match(t,/empreinte SHA-256 \(écriture hexadécimale\) du texte « graine:identifiant du compte », encodé en UTF-8\. La plus petite empreinte gagne\./);
  assert.match(t,new RegExp('Pseudo non publié · empreinte '+sha(GRAINE+':'+GAGNANT)));
  assert.ok(!t.includes(GAGNANT)&&!t.includes(PERDANT)&&!t.includes('Gagnant<b>'),'identifiant ou pseudo non publié affiché');
  ok('tiré, sans compte : graine, nombre de participations, méthode (SHA-256 de « graine:identifiant », plus petite empreinte), empreinte du gagnant, pseudo masqué');
  await ctx.close();

  // Gagnant : « Tu as gagné », case pour afficher son pseudo, empreinte vérifiée
  ({ctx,page}=await ouvrir({date:'2026-12-10T10:00:00+01:00',etat:tire,utilisateur:GAGNANT}));
  await attendre(page,/Vérifie ton tirage/);
  t=await texte(page);
  assert.match(t,/Tu as gagné !Regarde ta boîte e-mail/);
  assert.match(t,/C'est bien l'empreinte enregistrée pour ta participation gagnante/);
  assert.equal(await page.isChecked('#cc-case-pseudo'),false);
  await page.check('#cc-case-pseudo');
  await attendre(page,/Ton pseudo est affiché parmi les gagnants/);
  assert.equal((await base(page)).concours_gagnants[0].affiche_publiquement,true);
  await page.reload();
  await attendre(page,/Gagnant<b> · empreinte/);
  assert.equal(await page.locator(action+' .cc-gagnants b').first().textContent(),'Gagnant<b>');
  assert.equal(await page.isChecked('#cc-case-pseudo'),true);
  await largeurOk(page,390);
  ok('tiré, gagnant : « Tu as gagné, regarde ta boîte e-mail », empreinte vérifiée, case « afficher mon pseudo » enregistrée, pseudo affiché en texte');
  await ctx.close();

  // Perdant : son empreinte, calculée dans le navigateur, plus grande que celle du dernier gagnant
  ({ctx,page}=await ouvrir({date:'2026-12-10T10:00:00+01:00',etat:tire,utilisateur:PERDANT,largeur:320}));
  await attendre(page,/Vérifie ton tirage/);
  t=await texte(page);
  assert.match(t,/Tu n'as pas gagné cette fois/);
  assert.match(t,new RegExp('Ton empreinte, calculée dans ton navigateur : '+sha(GRAINE+':'+PERDANT)));
  assert.match(t,/Ton empreinte est plus grande que celle du dernier gagnant : le tirage est conforme pour toi\./);
  assert.ok(!(await page.content()).includes(GAGNANT),'identifiant du gagnant présent dans la page');
  assert.equal(await page.locator('#cc-case-pseudo').count(),0);
  await largeurOk(page,320);
  ok('tiré, perdant : son empreinte SHA-256 calculée dans le navigateur, « plus grande que celle du dernier gagnant », aucun identifiant d\'un autre joueur ; 320 px sans débordement');
  await ctx.close();

  // Participation écartée (table concours_exclusions, ligne du joueur) : motif affiché en texte, pas de vérification d'empreinte
  const exclu=[{concours_id:OUVERT.id,user_id:PERDANT,motif:"Deux comptes <même personne>"}];
  ({ctx,page}=await ouvrir({date:"2026-12-02T10:00:00+01:00",utilisateur:PERDANT,etat:{concours:[{...LIGNE}],concours_participations:participations.filter(p=>p.user_id!==PERDANT),concours_gagnants:[],concours_exclusions:exclu}}));
  await attendre(page,/Ta participation a été écartée : motif « Deux comptes <même personne> ». Pour toute question, écris à l'organisateur/);
  assert.ok(!/Tu participes au tirage/.test(await texte(page)));
  ok("terminé, participation écartée : « Ta participation a été écartée : motif … » (texte brut), plus de « Tu participes »");
  await ctx.close();
  ({ctx,page}=await ouvrir({date:"2026-12-10T10:00:00+01:00",utilisateur:PERDANT,etat:{...tire,concours_participations:participations.filter(p=>p.user_id!==PERDANT),concours_exclusions:exclu}}));
  await attendre(page,/Résultat du tirage/);
  t=await texte(page);
  assert.match(t,/Ta participation a été écartée : motif « Deux comptes <même personne> »/);
  assert.ok(!/Vérifie ton tirage|Tu n'as pas gagné/.test(t));
  assert.equal(await page.locator(action+" b",{hasText:"même personne"}).count(),0);
  ok("tiré, participation écartée : motif affiché, résultat public, pas de comparaison d'empreinte");
  await ctx.close();
  ({ctx,page}=await ouvrir({utilisateur:PERDANT,etat:{concours:[{...LIGNE}],concours_participations:[],concours_gagnants:[],concours_exclusions:exclu}}));
  await attendre(page,/Ta participation a été écartée : motif « Deux comptes <même personne> »/);
  assert.equal(await page.locator(action+' form').count(),0);
  ok("jeu ouvert, participation écartée : motif affiché, pas de formulaire pour se réinscrire");
  await ctx.close();

  // Durée d'affichage : 60 jours après le TIRAGE (tire_le), pas après la fin du jeu
  const tireTard={...tire,concours:[{...tire.concours[0],tire_le:'2027-01-20T20:00:00Z'}]};
  ({ctx,page}=await ouvrir({date:'2027-03-01T10:00:00+01:00',etat:tireTard}));
  await attendre(page,/Résultat du tirage/);
  assert.equal(await page.locator('#cc-etat').isHidden(),true);
  ok('tiré il y a 40 jours (fin du jeu il y a 3 mois) : toujours mis en avant avec le résultat');
  await ctx.close();
  ({ctx,page}=await ouvrir({date:'2027-03-25T10:00:00+01:00',etat:tireTard}));
  await page.waitForFunction(()=>!document.getElementById('cc-etat').hidden);
  assert.equal(await page.textContent('#cc-etat'),'Aucun concours en ce moment, reviens bientôt.');
  assert.equal(await page.textContent(action),'Jeu terminé, tirage au sort fait.');
  ok('tiré il y a plus de 60 jours : plus mis en avant, « Aucun concours en ce moment, reviens bientôt » en tête');
  await ctx.close();
  // Non tiré : reste affiché, même longtemps après la fin
  ({ctx,page}=await ouvrir({date:'2027-03-25T10:00:00+01:00'}));
  await attendre(page,/Le jeu est terminé\. Le tirage au sort a lieu/);
  assert.equal(await page.locator('#cc-etat').isHidden(),true);
  ok('pas encore tiré, 4 mois après la fin : toujours mis en avant (attente du tirage)');
  await ctx.close();

  /* Partager le concours (facultatif) */
  const SANS_PARTAGE_NATIF=()=>{
   Object.defineProperty(Navigator.prototype,'share',{value:undefined,configurable:true});
   window.__copie=null;
   Object.defineProperty(Navigator.prototype,'clipboard',{value:{writeText:async t=>{window.__copie=t;}},configurable:true});
  };
  tiers.length=0;
  ({ctx,page}=await ouvrir({init:SANS_PARTAGE_NATIF}));
  await attendre(page,/Connecte-toi pour participer/);
  const bp=page.locator(action+' button',{hasText:'Partager le concours'});
  assert.equal(await bp.count(),1);
  assert.match(await texte(page),/Partager est facultatif et ne donne aucune chance supplémentaire\./);
  assert.equal(await page.locator('#cc-partage-options').isHidden(),true);
  assert.deepEqual(tiers.filter(u=>!/^https:\/\/gc\.zgo\.at\//.test(u)),[],'requête vers un domaine tiers au chargement');
  await bp.click();
  assert.equal(await bp.getAttribute('aria-expanded'),'true');
  const hrefs=await page.$$eval('#cc-partage-options a',l=>l.map(a=>[a.textContent,a.getAttribute('href'),a.target,a.rel]));
  const texteP="Je participe au jeu concours d'Apprendre Padel\u00a0: une raquette d'essai à gagner, c'est gratuit\u00a0!";
  const url='https://apprendre-padel.fr/concours.html';
  assert.deepEqual(hrefs,[
   ['WhatsApp (nouvel onglet)','https://wa.me/?text='+encodeURIComponent(texteP+' '+url),'_blank','noopener noreferrer'],
   ['Facebook (nouvel onglet)','https://www.facebook.com/sharer.php?u='+encodeURIComponent(url),'_blank','noopener noreferrer'],
   ['X (nouvel onglet)','https://x.com/intent/post?text='+encodeURIComponent(texteP)+'&url='+encodeURIComponent(url),'_blank','noopener noreferrer']]);
  await page.click(action+' button:has-text("Copier le lien")');
  await attendre(page,/Lien copié : https:\/\/apprendre-padel\.fr\/concours\.html/);
  assert.equal(await page.evaluate(()=>window.__copie),url);
  assert.equal(await page.locator(action+' img,'+action+' iframe').count(),0,'image ou cadre de réseau social');
  assert.deepEqual(tiers.filter(u=>/facebook|whatsapp|wa\.me|x\.com|twitter/.test(u)),[],'requête vers un réseau social');
  assert.ok(!/partenaire officiel|sponsoris|parrain|en partenariat/i.test(await texte(page)),'mention de parrainage');
  await largeurOk(page,390);
  ok('partager (sans partage natif) : bouton et mention « facultatif », liens WhatsApp, Facebook, X en nouvel onglet, « Copier le lien » confirmé, aucune requête tierce ni image de réseau');
  await ctx.close();
  // Partage natif du téléphone, mis en avant après une participation
  ({ctx,page}=await ouvrir({utilisateur:PERDANT,init:()=>{window.__partage=null;Object.defineProperty(Navigator.prototype,'share',{value:async d=>{window.__partage=d;},configurable:true});}}));
  await page.waitForSelector(action+' form');
  assert.match(await page.getAttribute(action+' button:has-text("Partager le concours")','class'),/ghost/);
  await page.check('#cc-case-reglement');await page.check('#cc-case-age');
  await page.click(action+' button[type=submit]');
  await attendre(page,/C'est enregistré/);
  assert.match(await page.getAttribute(action+' button:has-text("Partager le concours")','class'),/primary/);
  await page.click(action+' button:has-text("Partager le concours")');
  assert.deepEqual(await page.evaluate(()=>window.__partage),{title:"Jeu concours d'Apprendre Padel",text:texteP,url});
  assert.equal(await page.locator('#cc-partage-options').isHidden(),true);
  ok('partage natif (navigator.share) : titre, texte tout prêt et adresse ; bouton mis en avant juste après la participation');
  await ctx.close();
  // Pas de bouton de partage hors période d'ouverture
  ({ctx,page}=await ouvrir({date:'2026-12-02T10:00:00+01:00'}));
  await attendre(page,/Le jeu est terminé/);
  assert.equal(await page.locator(action+' button:has-text("Partager le concours")').count(),0);
  ok('jeu terminé : pas de bouton de partage');
  await ctx.close();

  // Espaces insécables dans les textes de la page (hors règlement, déjà contrôlé)
  ({ctx,page}=await ouvrir({publiee:true,active:false}));
  const visibles=await page.evaluate(()=>document.querySelector('main').innerText);
  assert.ok(!/ [:;?!]/.test(visibles),'espace ordinaire avant : ; ? ! dans concours.html : '+(visibles.match(/.{0,30} [:;?!].{0,5}/)||[''])[0]);
  ok('concours.html : espaces insécables avant : ; ? !');
  await ctx.close();

  assert.deepEqual(erreurs,[]);
  ok('aucune erreur console');
  console.log('TOTAL '+nb+' contrôles réussis.');
 }finally{await browser.close();serveur.close();fs.rmSync(tmp,{recursive:true,force:true});}
})().catch(e=>{console.error(e);serveur.close();process.exitCode=1;});
