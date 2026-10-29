/* Vérification de la communauté sur la fiche tournoi (T4) : « J'y vais », annonces du tournoi, avis, note du club,
   signalement, modération admin. Supabase est remplacé par un faux serveur en mémoire (tables + règles des
   déclencheurs SQL : pseudo obligatoire, charte, unicité). Edge, 390 px.
   Lancer depuis la racine du site : node scripts/verifier-communaute.cjs */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const racine=path.join(__dirname,'..');
let nb=0;
function ok(nom){nb++;console.log('OK '+nom);}
process.on('unhandledRejection',e=>{if(e&&e.name==='TargetClosedError')return;console.error(e);process.exitCode=1;});

// Faux SDK : état dans sessionStorage (survit aux rechargements), utilisateur choisi par window.__utilisateur
const FAUX=`(function(){
 const lire=()=>JSON.parse(sessionStorage.getItem('base')||'null');
 const base=lire()||{utilisateur:null,profils:{},presences:[],annonces:[],avis:[],signalements:[],admins:[]};
 const garder=()=>sessionStorage.setItem('base',JSON.stringify(base));
 window.__base=base;window.__garder=garder;
 const erreur=(message,code)=>({data:null,error:{message,code}});
 function requete(table){
  let op='select',ligne=null,filtres=[],ordre=null,limite=1000,ou=null;
  const q={
   select(){return q;},eq(c,v){filtres.push([c,v]);return q;},order(c,o){ordre=[c,o&&o.ascending];return q;},limit(n){limite=n;return q;},
   or(expr){ou=expr.split(',').map(x=>x.split('.'));return q;},insert(l){op='insert';ligne=l;return q;},delete(){op='delete';return q;},
   maybeSingle(){op='single';return q;},
   then(res,rej){return Promise.resolve(executer()).then(res,rej);}
  };
  function executer(){
   const u=base.utilisateur,lignes=base[table]||[];
   const garde=r=>filtres.every(([c,v])=>String(r[c])===String(v))&&(!ou||ou.some(([c,o,v])=>o==='eq'?String(r[c])===v:o==='gt'?r[c]>+v:false));
   if(table==='profiles'){const p=u?base.profils[u]:null;return {data:p?{id:u,...p}:null,error:null};}
   if(op==='insert'){
    if(!u||ligne.user_id!==u)return erreur('NON_CONNECTE');
    const p=base.profils[u]||{};
    if(table==='presences'){
     if(!p.pseudo)return erreur('PSEUDO_REQUIS','P0001');
     if(lignes.some(r=>r.user_id===u&&r.tournoi_id===ligne.tournoi_id))return erreur('duplicate key value','23505');
     lignes.push({...ligne,pseudo:p.pseudo,classement_p:p.classement_p||null,created_at:new Date().toISOString()});
    }
    if(table==='avis'){
     if(!p.charte)return erreur('CHARTE_REQUISE','P0001');
     if(!p.pseudo)return erreur('PSEUDO_REQUIS','P0001');
     if(/connard|@/.test(ligne.texte))return erreur('new row violates check constraint "avis_texte_correct"','23514');
     if(lignes.some(r=>r.user_id===u&&r.tournoi_id===ligne.tournoi_id))return erreur('duplicate key value','23505');
     lignes.push({...ligne,id:'avis-'+(lignes.length+1),pseudo:p.pseudo,masque:false,nb_signalements:0,created_at:new Date().toISOString()});
    }
    garder();return {data:null,error:null};
   }
   if(op==='delete'){const garde2=lignes.filter(r=>!garde(r));base[table]=garde2;garder();return {data:null,error:null};}
   let res=lignes.filter(garde);
   // Règles de lecture (RLS) des avis : masqués invisibles sauf pour l'admin et l'auteur
   if(table==='avis')res=res.filter(r=>!r.masque||r.user_id===u||base.admins.includes(u));
   if(table==='annonces'&&!u)res=[];
   if(ordre)res=res.slice().sort((a,b)=>(a[ordre[0]]<b[ordre[0]]?-1:1)*(ordre[1]?1:-1));
   return {data:res.slice(0,limite),error:null};
  }
  return q;
 }
 window.supabase={createClient(){
  return {
   auth:{getSession:async()=>({data:{session:base.utilisateur?{user:{id:base.utilisateur,email:base.utilisateur+'@test.fr'}}:null}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),signOut:async()=>({})},
   from:requete,
   async rpc(nom,a){
    const u=base.utilisateur;
    if(nom==='nb_presences')return {data:base.presences.filter(p=>p.tournoi_id===a.p_tournoi).length,error:null};
    if(nom==='nb_annonces_tournoi')return {data:base.annonces.filter(p=>p.tournoi_id===a.p_tournoi).length,error:null};
    if(nom==='accepter_charte'){base.profils[u].charte=true;base.profils[u].age_confirme_at=base.profils[u].charte_acceptee_at=new Date().toISOString();garder();return {data:null,error:null};}
    if(nom==='est_admin')return {data:base.admins.includes(u),error:null};
    if(nom==='signaler_avis'){
     const av=base.avis.find(x=>x.id===a.p_avis);if(av.user_id===u)return erreur('AVIS_PROPRE');
     if(base.signalements.some(s=>s.avis_id===a.p_avis&&s.user_id===u))return erreur('DEJA_SIGNALE');
     base.signalements.push({avis_id:a.p_avis,user_id:u});av.nb_signalements=base.signalements.filter(s=>s.avis_id===a.p_avis).length;if(av.nb_signalements>=3)av.masque=true;garder();return {data:av.nb_signalements,error:null};
    }
    if(nom==='admin_moderer_avis'){
     if(!base.admins.includes(u))return erreur('NON_ADMIN');
     const av=base.avis.find(x=>x.id===a.p_avis);
     if(a.p_action==='retablir'){av.masque=false;av.nb_signalements=0;base.signalements=base.signalements.filter(s=>s.avis_id!==a.p_avis);}
     if(a.p_action==='supprimer')base.avis=base.avis.filter(x=>x.id!==a.p_avis);
     if(a.p_action==='masquer')av.masque=true;
     garder();return {data:null,error:null};
    }
    return erreur('fonction inconnue','PGRST202');
   }
  };
 }};
})();`;

// Fonctions activées pour le test (sur le site, la liste de supabase-config.js est vide tant que le SQL n'est pas exécuté)
const CONFIG_ACTIVE=fs.readFileSync(path.join(__dirname,'..','assets/js/supabase-config.js'),'utf8')+'\nwindow.PA_SUPABASE.activees=["favoris","communaute"];\n';
const serveur=http.createServer((req,res)=>{
 const rel=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\//,'')||'index.html';
 const p=path.resolve(racine,rel);
 if(!p.startsWith(racine+path.sep)){res.writeHead(403);res.end();return;}
 fs.readFile(p,(e,b)=>{if(e){res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.webp':'image/webp','.webmanifest':'application/manifest+json'})[path.extname(p)]||'text/plain');res.end(b);
 });
});

(async()=>{
 await new Promise(r=>serveur.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+serveur.address().port;
 // Tournoi de test : le premier tournoi publié qui commence dans le futur, et un autre du même club pour la note
 const donnees=JSON.parse(fs.readFileSync(path.join(racine,'assets/data/tournois.json'),'utf8')).tournois;
 const auj=new Date().toISOString().slice(0,10);
 const t=donnees.find(x=>x.dep==='76'&&x.date_debut>auj&&fs.existsSync(path.join(racine,'tournoi',x.id+'.html')));
 const page0=`/tournoi/${t.id}.html`;
 const etatInitial={utilisateur:null,profils:{U1:{pseudo:'Sam',classement_p:'P100'},U2:{pseudo:'Léo',classement_p:'P50',charte:true},U3:{pseudo:''},ADM:{pseudo:'Admin',charte:true}},
  presences:[{user_id:'U2',tournoi_id:t.id,pseudo:'Léo',classement_p:'P50',created_at:'2026-10-20T10:00:00Z'}],
  annonces:[{id:'a1',tournoi_id:t.id,pseudo:'Léo',classement_p:'P50',cote:'gauche',sexe:'messieurs',message:'Cherche partenaire côté droit',created_at:'2026-10-20T10:00:00Z'}],
  avis:[{id:'avis-0',user_id:'U2',tournoi_id:'autre',club:t.club,pseudo:'Léo',organisation:4,niveau_reel:3,recommande:true,texte:'Bien organisé.',masque:false,nb_signalements:0,created_at:'2026-09-01T10:00:00Z'}],
  signalements:[],admins:['ADM']};
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const erreurs=[];
 const nouveau=async(options={})=>{
  const ctx=await browser.newContext({serviceWorkers:'block',viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await ctx.route('**/assets/vendor/supabase-*.js*',r=>r.fulfill({contentType:'text/javascript',body:FAUX}));
  await ctx.route('**/assets/js/supabase-config.js*',r=>r.fulfill({contentType:'text/javascript',body:CONFIG_ACTIVE}));
  // Les fiches publiées ne chargent supabase-js que si « favoris » ou « communaute » est activé dans supabase-config.js
  // (scripts/generer-pages.js) : on simule la page régénérée après activation
  await ctx.route('**/tournoi/*.html',async r=>{
   const rep=await r.fetch();
   const html=(await rep.text()).replace(/(<script src="\.\.\/assets\/js\/supabase-config\.js)/,'<script src="../assets/vendor/supabase-2.45.4.js" defer></script>\n$1');
   await r.fulfill({response:rep,body:html});
  });
  await ctx.route('https://gc.zgo.at/**',r=>r.fulfill({contentType:'text/javascript',body:''}));
  const page=await ctx.newPage();
  if(options.date)await page.clock.install({time:new Date(options.date)});
  page.on('pageerror',e=>erreurs.push(e.message));
  page.on('console',m=>{if(m.type()==='error')erreurs.push(m.text());});
  await page.goto(base+'/index.html');
  await page.evaluate(([e,u])=>{e.utilisateur=u;sessionStorage.setItem('base',JSON.stringify(e));},[options.etat||etatInitial,options.utilisateur||null]);
  await page.goto(base+(options.url||page0));
  return {ctx,page};
 };
 try{
  /* Sans compte */
  let {ctx,page}=await nouveau();
  await page.waitForFunction(()=>/joueur du site y va/.test(document.getElementById('ft-presences').textContent));
  assert.match(await page.textContent('#ft-presences'),/1 joueur du site y va/);
  assert.match(await page.textContent('#ft-presences'),/Connecte-toi/);
  await page.waitForFunction(()=>/annonce pour ce tournoi/.test(document.getElementById('ft-annonces').textContent));
  assert.match(await page.textContent('#ft-annonces'),/Connecte-toi pour lire les annonces/);
  await page.waitForFunction(()=>/Note du club/.test(document.getElementById('ft-avis').textContent));
  assert.match(await page.textContent('#ft-avis'),/Note du club : 4\/5 sur 1 avis · 100 % recommandent/);
  assert.match(await page.textContent('#ft-avis'),/apparaîtront après le tournoi/);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),390);
  ok('sans compte : nombre de « J\'y vais » et d\'annonces, note du club, invitation à se connecter');
  await ctx.close();

  /* Connecté avec pseudo : J'y vais */
  ({ctx,page}=await nouveau({utilisateur:'U1'}));
  await page.waitForSelector('#ft-presences .ct-jyvais');
  assert.equal(await page.getAttribute('#ft-presences .ct-jyvais','aria-pressed'),'false');
  assert.match(await page.textContent('#ft-presences .ct-joueurs'),/Léo · P50/);
  await page.click('#ft-presences .ct-jyvais');
  await page.waitForFunction(()=>/2 joueurs du site y vont/.test(document.getElementById('ft-presences').textContent));
  assert.match(await page.textContent('#ft-presences .ct-joueurs'),/Sam · P100/);
  assert.equal(await page.getAttribute('#ft-presences .ct-jyvais','aria-pressed'),'true');
  await page.click('#ft-presences .ct-jyvais');
  await page.waitForFunction(()=>/1 joueur du site y va/.test(document.getElementById('ft-presences').textContent));
  ok('connecté : « J\'y vais » ajoute puis retire le joueur (pseudo + classement)');
  await page.waitForSelector('#ft-annonces .ct-annonces li');
  assert.match(await page.textContent('#ft-annonces'),/Cherche partenaire côté droit/);
  assert.match(await page.getAttribute('#ft-annonces a.btn','href'),new RegExp('partenaires\\.html\\?tournoi='+t.id));
  ok('connecté : annonces du tournoi listées, lien vers le formulaire');
  await ctx.close();

  /* Sans pseudo : message clair */
  ({ctx,page}=await nouveau({utilisateur:'U3'}));
  await page.waitForSelector('#ft-presences .ct-jyvais');
  await page.click('#ft-presences .ct-jyvais');
  await page.waitForFunction(()=>/pseudo/.test((document.querySelector('#ft-presences .ct-msg')||{}).textContent||''));
  ok('sans pseudo : « J\'y vais » refusé avec un message clair');
  await ctx.close();

  /* Pendant le tournoi : formulaire d'avis (charte à accepter), filtres */
  const pendant=new Date(t.date_debut+'T12:00:00');
  ({ctx,page}=await nouveau({utilisateur:'U1',date:pendant}));
  await page.waitForSelector('#ft-avis form.ct-form');
  assert.ok(await page.isHidden('#ft-presences .ct-jyvais')===false);
  await page.click('#ft-avis button[type=submit]');
  assert.match(await page.textContent('#ft-avis .ct-msg'),/trois questions/);
  await page.click('#ft-avis label.tchip:has(input[name=organisation][value="5"])');
  await page.click('#ft-avis label.tchip:has(input[name=niveau][value="4"])');
  await page.click('#ft-avis label.tchip:has(input[name=recommande][value="1"])');
  await page.fill('#ct-texte','Écris-moi sur jean@mail.fr');
  await page.click('#ft-avis button[type=submit]');
  assert.match(await page.textContent('#ft-avis .ct-msg'),/coordonnées/);
  await page.fill('#ct-texte','Super ambiance, balles neuves.');
  await page.click('#ft-avis button[type=submit]');
  assert.match(await page.textContent('#ft-avis .ct-msg'),/15 ans/);
  await page.check('#ft-avis .ct-charte input');
  await page.click('#ft-avis button[type=submit]');
  await page.waitForFunction(()=>/visible par les autres joueurs après la fin/.test(document.getElementById('ft-avis').textContent));
  assert.ok(await page.isHidden('#ft-avis form.ct-form').catch(()=>true));
  const stocke=await page.evaluate(()=>window.__base.avis.find(a=>a.user_id==='U1'));
  assert.equal(stocke.organisation,5);assert.equal(stocke.niveau_reel,4);assert.equal(stocke.recommande,true);assert.equal(stocke.club,t.club);
  assert.equal(await page.evaluate(()=>window.__base.profils.U1.charte),true);
  ok('avis : 3 questions obligatoires, coordonnées refusées, charte acceptée puis avis enregistré');
  await ctx.close();

  /* Après le tournoi : avis visibles par tous, signalement, masquage à 3 */
  const apres=new Date(new Date((t.date_fin||t.date_debut)+'T12:00:00').getTime()+5*86400000);
  const etatApres=JSON.parse(JSON.stringify(etatInitial));
  etatApres.avis.push({id:'avis-9',user_id:'U2',tournoi_id:t.id,club:t.club,pseudo:'Léo',organisation:2,niveau_reel:5,recommande:false,texte:'Tableau très relevé.',masque:false,nb_signalements:2,created_at:'2026-12-01T10:00:00Z'});
  etatApres.signalements=[{avis_id:'avis-9',user_id:'X1'},{avis_id:'avis-9',user_id:'X2'}];
  ({ctx,page}=await nouveau({date:apres,etat:etatApres}));
  await page.waitForSelector('#ft-avis .ct-avis');
  assert.match(await page.textContent('#ft-avis'),/Tableau très relevé/);assert.match(await page.textContent('#ft-avis'),/Ne le recommande pas/);
  assert.match(await page.textContent('#ft-avis'),/Note du club : 3\/5 sur 2 avis · 50 % recommandent/);
  assert.equal(await page.locator('#ft-presences .ct-jyvais').count(),0);
  assert.match(await page.textContent('#ft-presences'),/y était/);
  ok('après le tournoi : avis visibles sans compte, note du club recalculée, plus de « J\'y vais »');
  await ctx.close();
  ({ctx,page}=await nouveau({date:apres,etat:etatApres,utilisateur:'U1'}));
  await page.waitForSelector('#ft-avis .ct-signaler');
  await page.click('#ft-avis .ct-signaler summary');
  await page.selectOption('#ft-avis .ct-signaler select','nom');
  await page.click('#ft-avis .ct-signaler button');
  await page.waitForFunction(()=>/Merci/.test(document.querySelector('#ft-avis .ct-signaler').textContent));
  assert.equal(await page.evaluate(()=>window.__base.avis.find(a=>a.id==='avis-9').masque),true);
  ok('signalement : 3e signalement, avis masqué automatiquement');
  await ctx.close();

  /* Modération admin dans compte.html */
  ({ctx,page}=await nouveau({utilisateur:'ADM',url:'/compte.html',etat:{...etatApres,avis:etatApres.avis.map(a=>a.id==='avis-9'?{...a,masque:true,nb_signalements:3}:a)}}));
  await page.waitForSelector('#moderation-avis:not([hidden]) .ct-avis');
  assert.match(await page.textContent('#moderation-avis'),/Tableau très relevé.*3 signalements|3 signalements/);
  await page.click('#moderation-avis button:has-text("Rétablir")');
  await page.waitForFunction(()=>/Aucun avis signalé/.test(document.getElementById('moderation-avis').textContent));
  assert.equal(await page.evaluate(()=>window.__base.avis.find(a=>a.id==='avis-9').masque),false);
  ok('admin : avis signalés listés dans Mon compte, « Rétablir » efface les signalements');
  await ctx.close();
  ({ctx,page}=await nouveau({utilisateur:'U1',url:'/compte.html'}));
  await page.waitForTimeout(800);
  assert.ok(await page.isHidden('#moderation-avis'));
  ok('non admin : section de modération invisible');
  await ctx.close();

  assert.deepEqual(erreurs,[]);
  ok('aucune erreur console');
  console.log('TOTAL '+nb+' contrôles réussis.');
 }finally{await browser.close();serveur.close();}
})().catch(e=>{console.error(e);serveur.close();process.exitCode=1;});
