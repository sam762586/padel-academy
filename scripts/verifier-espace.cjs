/* Vérification de l'espace joueur (espace.html, joueur-sync.js) :
   1) fusion à trois voies (appareil / compte / dernière synchronisation), hors navigateur ;
   2) page sans compte : objectifs, résultats partagés avec le simulateur, courbe de progression, 390 px ;
   3) connecté (faux Supabase en mémoire) : envoi, récupération, suppression, rang le plus récent ;
   4) accessibilité (S3) : zones de message présentes dès l'ouverture, erreur en role=alert reliée au champ (aria-invalid,
      aria-describedby, focus), suppression annoncée (#esp-annonce) avec focus sur l'élément suivant, courbe sans arrêt
      clavier par mois (le tableau « Voir les données » sert d'alternative) ;
   5) appareil partagé (S4) : données d'un autre compte jamais envoyées sans accord (« ajouter » ou « effacer ») ;
      « effacer » passe par une confirmation dans la page (Annuler et Échap n'effacent rien) ;
      compte.html : case « Effacer les données de cet appareil » à la déconnexion et à la suppression du compte
      (clés pa-* de jeu effacées, réglages gardés ; case décochée : propriétaire de l'appareil oublié), pseudo contrôlé avant l'envoi et refus de la base relié au champ.
   Lancer depuis la racine du site : node scripts/verifier-espace.cjs */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),vm=require('node:vm');
const {chromium}=require('playwright');
const racine=path.join(__dirname,'..');
let nb=0;
function ok(nom){nb++;console.log('OK '+nom);}
process.on('unhandledRejection',e=>{if(e&&e.name==='TargetClosedError')return;console.error(e);process.exitCode=1;});
const iso=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const ilYa=j=>{const d=new Date();d.setDate(d.getDate()-j);return iso(d);};

/* ---- 1. Fusion à trois voies ---- */
function fusion(){
 const fen={addEventListener(){}},stock={};
 const bac={window:fen,document:{addEventListener(){},getElementById:()=>null},localStorage:{getItem:k=>stock[k]??null,setItem:(k,v)=>{stock[k]=v;}},crypto:require('node:crypto').webcrypto};
 for(const f of ['bareme-donnees.js','joueur-sync.js'])vm.runInNewContext(fs.readFileSync(path.join(racine,'assets/js',f),'utf8'),bac);
 const J=fen.PA_JOUEUR,def=J._LISTES.resultats;
 const r=(cle,place,date='2026-10-01')=>({cle,cat:'P100',place,nb:16,sexe:'messieurs',date});
 const base=liste=>Object.fromEntries(liste.map(x=>[x.cle,def.empreinte(x)]));
 const appliquer=(L,S,Bs)=>{const x=J._fusionner(def,L,S,base(Bs));return {cles:x.resultat.map(y=>y.cle+':'+y.place).sort().join(),ops:x.operations.map(o=>o.type+':'+(o.cle||o.ligne.cle)).sort().join()};};
 let x=appliquer([r('aaaaaaaa1',1)],[],[]);assert.deepEqual(x,{cles:'aaaaaaaa1:1',ops:'ecrire:aaaaaaaa1'});
 x=appliquer([],[r('bbbbbbbb1',2)],[]);assert.deepEqual(x,{cles:'bbbbbbbb1:2',ops:''});
 x=appliquer([],[r('cccccccc1',3)],[r('cccccccc1',3)]);assert.deepEqual(x,{cles:'',ops:'supprimer:cccccccc1'});
 x=appliquer([r('dddddddd1',4)],[],[r('dddddddd1',4)]);assert.deepEqual(x,{cles:'',ops:''});
 x=appliquer([r('eeeeeeee1',1)],[r('eeeeeeee1',5)],[r('eeeeeeee1',5)]);assert.deepEqual(x,{cles:'eeeeeeee1:1',ops:'ecrire:eeeeeeee1'});
 x=appliquer([r('ffffffff1',5)],[r('ffffffff1',2)],[r('ffffffff1',5)]);assert.deepEqual(x,{cles:'ffffffff1:2',ops:''});
 x=appliquer([r('gggggggg1',1)],[r('gggggggg1',2)],[r('gggggggg1',5)]);assert.deepEqual(x,{cles:'gggggggg1:1',ops:'ecrire:gggggggg1'});
 x=appliquer([r('hhhhhhhh1',7)],[],[r('hhhhhhhh1',5)]);assert.deepEqual(x,{cles:'hhhhhhhh1:7',ops:'ecrire:hhhhhhhh1'});
 x=appliquer([],[r('iiiiiiii1',7)],[r('iiiiiiii1',5)]);assert.deepEqual(x,{cles:'iiiiiiii1:7',ops:''});
 ok('fusion à trois voies : ajouts, suppressions et modifications de chaque côté');
 // Les anciens résultats sans identifiant en reçoivent un
 const n=fen.PA_BAREME.simNormaliser([{cat:'P25',place:1,nb:8,sexe:'messieurs',date:'2026-01-01'}]);
 assert.match(n[0].cle,/^[0-9A-Za-z-]{8,40}$/);
 ok('anciens résultats du simulateur : identifiant attribué');
}

// Faux Supabase : tables resultats_tournois, objectifs, profiles (rang)
const FAUX=`(function(){
 const base=JSON.parse(sessionStorage.getItem('base')||'null')||{utilisateur:null,resultats_tournois:[],objectifs:[],profiles:{},appels:[]};
 const garder=()=>sessionStorage.setItem('base',JSON.stringify(base));window.__base=base;
 function requete(table){
  let op='select',ligne=null,filtres=[],conflit=null;
  const q={select(){return q;},eq(c,v){filtres.push([c,v]);return q;},order(){return q;},limit(){return q;},
   upsert(l,o){op='upsert';ligne=l;conflit=o&&o.onConflict;return q;},update(l){op='update';ligne=l;return q;},delete(){op='delete';return q;},
   maybeSingle(){op=op==='select'?'single':op;return q;},then(a,b){return Promise.resolve(executer()).then(a,b);}};
  function executer(){
   const garde=r=>filtres.every(([c,v])=>String(r[c])===String(v));
   if(table==='profiles'){
    const p=base.profiles[base.utilisateur]||{};
    if(op==='update'){Object.assign(p,ligne);base.profiles[base.utilisateur]=p;base.appels.push('profil');garder();return {data:null,error:null};}
    if(op==='upsert'){
     if(ligne.pseudo==='refus serveur')return {data:null,error:{code:'23514',message:'new row for relation "profiles" violates check constraint "profiles_pseudo_format"'}};
     Object.assign(p,ligne);base.profiles[base.utilisateur]=p;base.appels.push('profil:'+ligne.pseudo);garder();return {data:null,error:null};
    }
    return {data:{id:base.utilisateur,...p},error:null};
   }
   if(!(table in base))return {data:null,error:{message:'relation does not exist',code:'42P01'}};
   if(op==='upsert'){const i=base[table].findIndex(r=>r.user_id===ligne.user_id&&r.cle===ligne.cle);if(i>=0)base[table][i]={...base[table][i],...ligne};else base[table].push(ligne);base.appels.push('+'+table+':'+ligne.cle);garder();return {data:null,error:null};}
   if(op==='delete'){const avant=base[table].length;base[table]=base[table].filter(r=>!garde(r));if(base[table].length!==avant)base.appels.push('-'+table+':'+filtres.find(f=>f[0]==='cle')[1]);garder();return {data:null,error:null};}
   return {data:base[table].filter(garde),error:null};
  }
  return q;
 }
 window.supabase={createClient(){return {
  auth:{getSession:async()=>({data:{session:base.utilisateur?{user:{id:base.utilisateur,email:'t@t.fr'}}:null}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),signOut:async()=>{base.appels.push('deconnexion');garder();return {error:null};}},
  from:requete,rpc:async(nom)=>{base.appels.push('rpc:'+nom);garder();return {data:null,error:null};}};}};
})();`;
const CONFIG_ACTIVE=fs.readFileSync(path.join(racine,'assets/js/supabase-config.js'),'utf8')+'\nwindow.PA_SUPABASE.activees=["espace"];\n';

const serveur=http.createServer((req,res)=>{
 const rel=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\//,'')||'index.html';
 const p=path.resolve(racine,rel);
 if(!p.startsWith(racine+path.sep)){res.writeHead(403);res.end();return;}
 fs.readFile(p,(e,b)=>{if(e){res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.webp':'image/webp','.webmanifest':'application/manifest+json'})[path.extname(p)]||'text/plain');res.end(b);
 });
});

(async()=>{
 fusion();
 await new Promise(r=>serveur.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+serveur.address().port;
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const erreurs=[];
 const nouveau=async({sdk,config,etat}={})=>{
  const ctx=await browser.newContext({serviceWorkers:'block',viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await ctx.route('**/supabase-js@*/**',r=>r.fulfill({contentType:'text/javascript',body:sdk||''}));
  if(config)await ctx.route('**/assets/js/supabase-config.js*',r=>r.fulfill({contentType:'text/javascript',body:config}));
  await ctx.route('https://gc.zgo.at/**',r=>r.fulfill({contentType:'text/javascript',body:''}));
  const page=await ctx.newPage();
  page.on('pageerror',e=>erreurs.push(e.message));
  page.on('console',m=>{if(m.type()==='error')erreurs.push(m.text());});
  page.on('response',r=>{if(r.status()>=400&&r.url().startsWith(base))erreurs.push(r.status()+' '+r.url());});
  if(etat){await page.goto(base+'/index.html');await page.evaluate(([e,l])=>{sessionStorage.setItem('base',JSON.stringify(e));Object.entries(l||{}).forEach(([k,v])=>localStorage.setItem(k,JSON.stringify(v)));},etat);}
  await page.goto(base+'/espace.html');
  return {ctx,page};
 };
 try{
  /* Sans compte */
  let {ctx,page}=await nouveau();
  // Zones de message présentes et vides dès l'ouverture ; zone d'annonce permanente
  for(const id of ['esp-bloc-objectifs-msg','esp-bloc-resultats-msg','esp-bloc-matchs-msg']){
   assert.equal(await page.evaluate(i=>{const p=document.getElementById(i);return p&&!p.hidden&&p.textContent==='';},id),true,id);
  }
  assert.equal(await page.getAttribute('#esp-annonce','role'),'status');
  ok('zones de message des formulaires et zone d\'annonce présentes dès l\'ouverture');
  assert.match(await page.textContent('#esp-statut'),/gardées sur cet appareil/);
  assert.match(await page.textContent('#esp-objectifs'),/Aucun objectif/);
  // Résultat : P100, vainqueur, 16 paires, il y a 10 jours = 100 points
  await page.selectOption('#esp-cat','P100');await page.fill('#esp-place','1');await page.fill('#esp-nb','16');await page.fill('#esp-date',ilYa(10));
  await page.click('#esp-form-resultat button[type=submit]');
  assert.equal(await page.textContent('#esp-total'),'100');
  assert.equal(await page.locator('#esp-resultats tbody tr').count(),1);
  // Place impossible : refusée, erreur annoncée et reliée au champ
  await page.fill('#esp-place','20');await page.fill('#esp-nb','8');
  await page.click('#esp-form-resultat button[type=submit]');
  assert.match(await page.textContent('#esp-bloc-resultats .esp-msg'),/n'existe pas/);
  assert.equal(await page.getAttribute('#esp-bloc-resultats-msg','role'),'alert');
  assert.equal(await page.getAttribute('#esp-place','aria-invalid'),'true');
  assert.equal(await page.getAttribute('#esp-place','aria-describedby'),'esp-bloc-resultats-msg');
  assert.equal(await page.evaluate(()=>document.activeElement.id),'esp-place');
  // P500 : le tableau messieurs/dames remplace le nombre de paires
  await page.selectOption('#esp-cat','P500');
  assert.ok(await page.isVisible('#esp-champ-sexe'));assert.ok(await page.isHidden('#esp-champ-nb'));
  ok('résultats : ajout, points, place impossible refusée, champs selon la catégorie');
  // Objectifs : 150 points (67 %) et 1 tournoi (atteint)
  await page.selectOption('#esp-type','points');await page.fill('#esp-cible','150');
  await page.click('#esp-form-objectif button[type=submit]');
  await page.selectOption('#esp-type','tournois');await page.fill('#esp-cible','1');
  await page.click('#esp-form-objectif button[type=submit]');
  assert.equal(await page.locator('.esp-objectif').count(),2);
  assert.equal(await page.getAttribute('.esp-objectif >> nth=0 >> [role=progressbar]','aria-valuenow'),'67');
  assert.equal(await page.locator('.esp-objectif.atteint').count(),0,'le tournoi saisi date d\'avant la création de l\'objectif');
  await page.fill('#esp-cible','0');await page.click('#esp-form-objectif button[type=submit]');
  assert.match(await page.textContent('#esp-bloc-objectifs .esp-msg'),/entier/);
  assert.equal(await page.getAttribute('#esp-cible','aria-invalid'),'true');assert.equal(await page.evaluate(()=>document.activeElement.id),'esp-cible');
  await page.fill('#esp-cible','3');await page.click('#esp-form-objectif button[type=submit]');
  assert.equal(await page.getAttribute('#esp-cible','aria-invalid'),null);assert.equal(await page.getAttribute('#esp-bloc-objectifs-msg','role'),'status');
  // Retirer un objectif : annoncé, focus sur l'objectif suivant
  await page.locator('.esp-objectif .esp-lien').nth(1).click();
  assert.equal(await page.locator('.esp-objectif').count(),2);
  await page.waitForFunction(()=>/Objectif retiré/.test(document.getElementById('esp-annonce').textContent));
  assert.equal(await page.evaluate(()=>document.activeElement===document.querySelectorAll('.esp-objectif .esp-lien')[1]),true);
  // Dernier de la liste retiré : focus sur le précédent ; liste vide : focus sur le titre de la section
  await page.locator('.esp-objectif .esp-lien').nth(1).click();
  assert.equal(await page.evaluate(()=>document.activeElement===document.querySelector('.esp-objectif .esp-lien')),true);
  await page.locator('.esp-objectif .esp-lien').first().click();
  assert.equal(await page.evaluate(()=>document.activeElement.textContent),'Mes objectifs');
  ok('objectifs : erreur reliée au champ et retirée une fois corrigée ; retrait annoncé, focus sur le suivant puis le titre');
  await page.selectOption('#esp-type','points');await page.fill('#esp-cible','150');
  await page.click('#esp-form-objectif button[type=submit]');
  await page.selectOption('#esp-type','tournois');await page.fill('#esp-cible','1');
  await page.click('#esp-form-objectif button[type=submit]');
  ok('objectifs : ajout, avancement en %, cible invalide refusée');
  // Courbe : 12 points, tableau équivalent (alternative au clavier et aux lecteurs d'écran), survol à la souris
  assert.equal(await page.locator('#esp-progression circle').count(),12);
  assert.equal(await page.locator('#esp-progression .esp-donnees tbody tr').count(),12);
  assert.equal(await page.locator('#esp-progression [tabindex], #esp-progression rect[aria-label]').count(),0);
  assert.equal(await page.getAttribute('#esp-progression svg','role'),'img');
  assert.equal(await page.getAttribute('#esp-bulle','aria-hidden'),'true');
  await page.locator('#esp-progression .esp-survol').nth(11).hover();
  assert.match(await page.textContent('#esp-bulle'),/100 points/);
  ok('progression : courbe de 12 mois sans arrêt clavier par mois, tableau « Voir les données », infobulle au survol');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),390);
  ok('aucun débordement à 390 px');
  // Même liste que le simulateur du barème
  await page.goto(base+'/bareme.html');
  assert.equal(await page.locator('#sim-list tr').count(),1);assert.equal(await page.textContent('#sim-total'),'100');
  ok('le résultat apparaît dans le simulateur de la page Barème');
  await ctx.close();

  /* Connecté : synchronisation */
  const ancien='2026-01-01T00:00:00.000Z',recent=new Date().toISOString();
  const etatServeur={utilisateur:'U1',resultats_tournois:[{user_id:'U1',cle:'serveur-0001',categorie:'P250',place:2,nb_paires:16,sexe:'messieurs',date_tournoi:ilYa(20)}],
   objectifs:[],profiles:{U1:{rang_fft:9000,rang_sexe:'messieurs',rang_maj:ancien}},appels:[]};
  const local={'pa-sim-resultats':[{cle:'local-00001',cat:'P100',place:1,nb:16,sexe:'messieurs',date:ilYa(5)}],'pa-classement-fft':{rang:4512,sexe:'messieurs',maj:recent}};
  ({ctx,page}=await nouveau({sdk:FAUX,config:CONFIG_ACTIVE,etat:[etatServeur,local]}));
  await page.waitForFunction(()=>/Synchronisé avec ton compte/.test(document.getElementById('esp-statut').textContent));
  assert.equal(await page.textContent('#esp-total'),'300');
  const b1=await page.evaluate(()=>window.__base);
  assert.ok(b1.resultats_tournois.some(r=>r.cle==='local-00001'&&r.categorie==='P100'));
  assert.equal(b1.profiles.U1.rang_fft,4512);
  ok('connecté : résultat de l\'appareil envoyé, résultat du compte récupéré, rang le plus récent gardé');
  // Suppression locale -> supprimée du compte
  await page.locator('#esp-resultats button.x').first().click();
  await page.waitForFunction(()=>window.__base.resultats_tournois.length===1);
  await page.waitForFunction(()=>/Résultat supprimé/.test(document.getElementById('esp-annonce').textContent));
  assert.equal(await page.evaluate(()=>document.activeElement===document.querySelector('#esp-resultats button.x')),true);
  assert.equal(await page.textContent('#esp-total'),await page.evaluate(()=>String(window.__base.resultats_tournois[0].categorie==='P250'?200:100)));
  // Objectif créé ici -> envoyé au compte
  await page.selectOption('#esp-type','rang');await page.fill('#esp-cible','3000');
  await page.click('#esp-form-objectif button[type=submit]');
  await page.waitForFunction(()=>window.__base.objectifs.length===1);
  assert.match(await page.textContent('.esp-objectif'),/encore 1 512 places|encore 1 512 places/);
  ok('connecté : suppression et objectif reportés dans le compte');
  // Un autre appareil supprime un résultat et le compte a un rang plus récent
  await page.evaluate(()=>{const b=JSON.parse(sessionStorage.getItem('base'));b.resultats_tournois=[];b.profiles.U1={rang_fft:2500,rang_sexe:'messieurs',rang_maj:new Date(Date.now()+60000).toISOString()};sessionStorage.setItem('base',JSON.stringify(b));});
  await page.reload();
  await page.waitForFunction(()=>document.getElementById('esp-total').textContent==='0');
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('pa-classement-fft')).rang),2500);
  assert.equal(await page.locator('.esp-objectif.atteint').count(),1);
  ok('autre appareil : suppression récupérée, rang plus récent du compte appliqué, objectif atteint');
  await ctx.close();

  /* Appareil partagé : données synchronisées avant avec un autre compte (AUTRE), U1 se connecte */
  const serveurU1=()=>({utilisateur:'U1',resultats_tournois:[{user_id:'U1',cle:'serveur-0001',categorie:'P250',place:2,nb_paires:16,sexe:'messieurs',date_tournoi:ilYa(20)}],objectifs:[],profiles:{U1:{}},appels:[]});
  const localAutre={'pa-sim-resultats':[{cle:'autre-00001',cat:'P100',place:1,nb:16,sexe:'messieurs',date:ilYa(5)}],'pa-synchro-resultats:AUTRE':{'autre-00001':'x'},'pa-mon-departement':'76'};
  ({ctx,page}=await nouveau({sdk:FAUX,config:CONFIG_ACTIVE,etat:[serveurU1(),localAutre]}));
  await page.waitForSelector('#esp-appareil-ajouter');
  await page.waitForTimeout(400);
  assert.deepEqual(await page.evaluate(()=>window.__base.appels),[],'rien n\'est envoyé sans accord');
  assert.match(await page.textContent('#esp-statut'),/autre compte/);
  // Le journal, les favoris et le compteur ne peuvent pas non plus copier dans ce compte
  assert.equal(await page.evaluate(()=>window.PA_COMPTE.saveFavori('123',true).then(r=>r.ok)),false);
  await page.click('#esp-appareil-ajouter');
  await page.waitForFunction(()=>window.__base.appels.includes('+resultats_tournois:autre-00001'));
  assert.equal(await page.evaluate(()=>localStorage.getItem('pa-appareil-compte')),'U1');
  await page.waitForFunction(()=>/Synchronisé avec ton compte/.test(document.getElementById('esp-statut').textContent));
  // Le bloc a été redessiné : le focus est sur la zone de statut (stable), pas retombé sur BODY
  assert.equal(await page.evaluate(()=>document.activeElement.id),'esp-statut','focus après « Les ajouter à mon compte »');
  await page.waitForFunction(()=>/partent dans ton compte/.test(document.getElementById('esp-annonce').textContent));
  ok('appareil partagé : données d\'un autre compte retenues jusqu\'à « Les ajouter à mon compte », puis envoyées, focus sur le statut');
  await ctx.close();
  ({ctx,page}=await nouveau({sdk:FAUX,config:CONFIG_ACTIVE,etat:[serveurU1(),localAutre]}));
  await page.waitForSelector('#esp-appareil-effacer');
  assert.match(await page.textContent('#esp-statut'),/sont peut-être les tiennes, enregistrées avant ta connexion/);
  // Confirmation obligatoire : un clic n'efface rien, focus sur « Annuler », liste de ce qui sera effacé « définitivement »
  const avantEffacement=await page.evaluate(()=>JSON.stringify(localStorage));
  await page.click('#esp-appareil-effacer');
  await page.waitForSelector('#esp-appareil-confirmer');
  assert.equal(await page.evaluate(()=>document.activeElement.id),'esp-appareil-annuler','ouverture : focus sur « Annuler »');
  assert.equal(await page.textContent('#esp-appareil-confirmer'),'Effacer définitivement');
  const texteConf=await page.textContent('#esp-appareil');
  for(const mot of [/définitivement/,/résultats de tournois/,/objectifs/,/matchs/,/bilans/,/favoris/,/test de niveau/,/exercices/,/défis/,/plan 8 semaines/,/tableaux tactiques/,/Mon académie pas encore synchronisés/])assert.match(texteConf,mot);
  assert.match(await page.getAttribute('#esp-appareil-confirmer','aria-describedby'),/esp-appareil-conf-msg/);
  assert.equal(await page.evaluate(()=>JSON.stringify(localStorage)),avantEffacement,"rien d'effacé avant confirmation");
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),390,'confirmation sans débordement à 390 px');
  ok("appareil partagé : « Les effacer » ouvre une confirmation (liste des données, « définitivement »), focus sur « Annuler », rien d'effacé");
  // Annuler : rien n'est effacé, focus rendu à « Les effacer de cet appareil »
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('#esp-appareil-confirmer').count(),0);
  assert.equal(await page.evaluate(()=>document.activeElement.id),'esp-appareil-effacer','« Annuler » : focus rendu');
  await page.waitForFunction(()=>/rien n'a été effacé/.test(document.getElementById('esp-annonce').textContent));
  // Échap : même chose
  await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(()=>document.activeElement.id),'esp-appareil-annuler');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#esp-appareil-confirmer').count(),0);
  assert.equal(await page.evaluate(()=>document.activeElement.id),'esp-appareil-effacer','Échap : focus rendu');
  assert.equal(await page.evaluate(()=>JSON.stringify(localStorage)),avantEffacement,"rien d'effacé après Annuler et Échap");
  assert.deepEqual(await page.evaluate(()=>window.__base.appels.filter(a=>a[0]==='+')),[]);
  ok('appareil partagé : « Annuler » et Échap ferment la confirmation sans rien effacer, focus rendu, annonce');
  await Promise.all([page.waitForEvent('load'),(async()=>{await page.click('#esp-appareil-effacer');await page.click('#esp-appareil-confirmer');})()]);
  await page.waitForFunction(()=>/Synchronisé avec ton compte/.test(document.getElementById('esp-statut').textContent));
  assert.equal(await page.textContent('#esp-total'),'200');
  assert.deepEqual(await page.evaluate(()=>window.__base.appels.filter(a=>a[0]==='+')),[]);
  assert.equal(await page.evaluate(()=>localStorage.getItem('pa-mon-departement')),'"76"','réglage gardé');
  assert.equal(await page.evaluate(()=>localStorage.getItem('pa-appareil-compte')),'U1');
  // Page rechargée : le focus revient sur la zone de statut, l'effacement est annoncé
  assert.equal(await page.evaluate(()=>document.activeElement.id),'esp-statut','focus après « Les effacer de cet appareil »');
  await page.waitForFunction(()=>/effacées de cet appareil/.test(document.getElementById('esp-annonce').textContent));
  ok('appareil partagé : « Les effacer de cet appareil » efface les données de l\'autre compte, rien n\'est envoyé, le compte est repris, focus sur le statut');
  await ctx.close();
  // Même compte qu'avant : aucune question
  ({ctx,page}=await nouveau({sdk:FAUX,config:CONFIG_ACTIVE,etat:[serveurU1(),{'pa-sim-resultats':localAutre['pa-sim-resultats'],'pa-synchro-resultats:U1':{}}]}));
  await page.waitForFunction(()=>/Synchronisé avec ton compte/.test(document.getElementById('esp-statut').textContent));
  assert.equal(await page.locator('#esp-appareil-ajouter').count(),0);
  ok('appareil du même compte : synchronisation sans question');
  await ctx.close();
  // Site en ligne (seule « academie » activée) : niveau de Mon académie synchronisé avant avec un autre compte
  const CONFIG_ACADEMIE=CONFIG_ACTIVE.replace('activees=["espace"]','activees=["academie"]');
  const localAcademie={'pa-academie':{version:1,niveau:3,historique:[{niveau:3,date:'2026-10-02T09:00:00.000Z'}]},'pa-academie-synchro:AUTRE':{niveaux:['2026-10-02T09:00:00.000Z'],quiz:[]},'pa-mon-departement':'76'};
  ({ctx,page}=await nouveau({sdk:FAUX,config:CONFIG_ACADEMIE,etat:[serveurU1(),localAcademie]}));
  await page.waitForSelector('#esp-appareil-effacer');
  assert.match(await page.textContent('#esp-statut'),/Mon académie/);
  await page.click('#esp-appareil-effacer');
  assert.equal(await page.evaluate(()=>localStorage.getItem('pa-academie-synchro:AUTRE'))!==null,true,"rien d'effacé avant confirmation");
  await page.click('#esp-appareil-confirmer');
  await page.waitForFunction(()=>document.activeElement&&document.activeElement.id==='esp-statut');
  assert.equal(await page.evaluate(()=>localStorage.getItem('pa-academie-synchro:AUTRE')),null);
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('pa-academie')||'{"historique":[]}').historique.length),0,'niveau de l\'autre compte effacé');
  assert.equal(await page.evaluate(()=>localStorage.getItem('pa-appareil-compte')),'U1');
  assert.equal(await page.locator('#esp-appareil-effacer').count(),0);
  ok('site en ligne (« academie » seule) : niveau de Mon académie d\'un autre compte détecté, « Les effacer » le retire, le compte est repris');
  await ctx.close();

  /* compte.html : déconnexion et suppression avec effacement, pseudo */
  const donneesJeu={'pa-sim-resultats':[{cle:'x-0000001',cat:'P100',place:1,nb:16,sexe:'messieurs',date:ilYa(5)}],'pa-objectifs':[],'pa-quiz-dernier':{palier:2},
   'pa-score-historique':[],'pa-tournois-favoris':['123'],'pa-weeks-v2:U1':{done:[1]},'pa-synchro-objectifs:U1':{},'pa-ma-position':{lat:49,lng:1},
   'pa-mon-departement':'76','pa-tournois-filtres':{}};
  const clesPa=page=>page.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('pa-')).sort());
  // Toutes les listes synchronisées : drapeaux actifs, tables présentes, rien de gardé seulement sur l'appareil
  const CONFIG_TOUT=CONFIG_ACTIVE.replace('activees=["espace"]','activees=["espace","journal","favoris","progression","diagnostic","academie"]');
  const donneesSynchro={'pa-sim-resultats':donneesJeu['pa-sim-resultats'],'pa-mon-departement':'76','pa-tournois-filtres':{}};
  const ouvrirCompte=async(tout,local)=>{const x=await nouveau({sdk:FAUX,config:tout?CONFIG_TOUT:CONFIG_ACTIVE,
    etat:[{...serveurU1(),resultats_tournois:[],objectifs_jeu:[],favoris:[]},local||(tout?donneesSynchro:donneesJeu)]});
   await x.page.goto(base+'/compte.html');await x.page.waitForSelector('#compte-profil:not([hidden])');return x;};
  // 1. Une partie des données n'est que sur l'appareil : cases décochées, avertissement, rien d'effacé sans accord
  ({ctx,page}=await ouvrirCompte(false));
  await page.waitForTimeout(400);
  assert.equal(await page.isChecked('#compte-deco-effacer'),false,'décochée : données pas toutes dans le compte');
  assert.equal(await page.isChecked('#sup-effacer'),false);
  assert.match(await page.textContent('#compte-deco-aide'),/supprime définitivement/);
  assert.match(await page.textContent('#sup-effacer-aide'),/supprime définitivement/);
  assert.equal(await page.getAttribute('#sup-effacer','aria-describedby'),'sup-effacer-aide');
  await page.click('#compte-deco');
  await page.waitForFunction(()=>window.__base.appels.includes('deconnexion'));
  assert.ok((await clesPa(page)).includes('pa-sim-resultats'));
  ok('données pas toutes dans le compte : cases décochées par défaut, avertissement « supprime définitivement », rien d\'effacé');
  await ctx.close();
  ({ctx,page}=await ouvrirCompte(false));
  await page.check('#compte-deco-effacer');await page.click('#compte-deco');
  await page.waitForFunction(()=>window.__base.appels.includes('deconnexion'));
  assert.deepEqual(await clesPa(page),['pa-mon-departement','pa-tournois-filtres']);
  ok('case cochée par le joueur : toutes les clés pa-* de jeu effacées, réglages de recherche gardés');
  await ctx.close();
  // 2. Tout est synchronisé : cases cochées d'office (appareil partagé)
  ({ctx,page}=await ouvrirCompte(true));
  await page.waitForFunction(()=>document.getElementById('compte-deco-effacer').checked);
  assert.equal(await page.isChecked('#sup-effacer'),true);
  assert.match(await page.textContent('#compte-deco-aide'),/Tout est sauvegardé dans ton compte/);
  await page.click('#compte-deco');
  await page.waitForFunction(()=>window.__base.appels.includes('deconnexion'));
  assert.deepEqual(await clesPa(page),['pa-mon-departement','pa-tournois-filtres']);
  ok('tout est dans le compte : cases cochées d\'office, données de l\'appareil effacées à la déconnexion');
  await ctx.close();
  // Mon académie : un choix de niveau pas encore marqué comme synchronisé avec ce compte → case décochée ; marqué → cochée
  const choixNiveau={version:1,niveau:4,historique:[{niveau:4,date:'2026-10-01T10:00:00.000Z'}]};
  ({ctx,page}=await ouvrirCompte(true,{...donneesSynchro,'pa-academie':choixNiveau}));
  await page.waitForTimeout(400);
  assert.equal(await page.isChecked('#compte-deco-effacer'),false,'académie pas encore dans le compte');
  await ctx.close();
  ({ctx,page}=await ouvrirCompte(true,{...donneesSynchro,'pa-academie':choixNiveau,'pa-academie-synchro:U1':{niveaux:[choixNiveau.historique[0].date],quiz:[]}}));
  await page.waitForFunction(()=>document.getElementById('compte-deco-effacer').checked);
  await page.click('#compte-deco');
  await page.waitForFunction(()=>window.__base.appels.includes('deconnexion'));
  assert.deepEqual(await clesPa(page),['pa-mon-departement','pa-tournois-filtres']);
  ok('Mon académie : case décochée tant qu\'un choix de niveau n\'est pas synchronisé, cochée ensuite ; pa-academie effacé avec le reste');
  await ctx.close();
  ({ctx,page}=await ouvrirCompte(false));
  // Pseudo : contrôlé avant l'envoi, refus de la base relié au champ
  await page.goto(base+'/compte.html');await page.waitForSelector('#compte-profil:not([hidden])');
  for(const mauvais of ['a','06 12 34 56 78','moi@site','joueur.fr']){
   await page.fill('#pf-pseudo',mauvais);await page.click('#pf-enregistrer');
   assert.match(await page.textContent('#pf-msg'),/2 à 30 caractères/,mauvais);
   assert.equal(await page.getAttribute('#pf-msg','role'),'alert');
   assert.equal(await page.getAttribute('#pf-pseudo','aria-invalid'),'true');
   assert.match(await page.getAttribute('#pf-pseudo','aria-describedby'),/\bpf-msg\b/);
   assert.equal(await page.evaluate(()=>document.activeElement.id),'pf-pseudo');
  }
  assert.ok(!(await page.evaluate(()=>window.__base.appels)).some(a=>a.startsWith('profil')),'rien n\'est envoyé');
  await page.fill('#pf-pseudo','refus serveur');await page.click('#pf-enregistrer');
  await page.waitForFunction(()=>document.getElementById('pf-pseudo').getAttribute('aria-invalid')==='true');
  assert.match(await page.textContent('#pf-msg'),/2 à 30 caractères\s: lettres, chiffres, espaces.*Pas d.e-mail, de numéro, de lien ni de nom de réseau social\./);
  await page.fill('#pf-pseudo','Léo_76 d\'Évreux');await page.click('#pf-enregistrer');
  await page.waitForFunction(()=>window.__base.appels.includes("profil:Léo_76 d'Évreux"));
  assert.equal(await page.textContent('#pf-msg'),'Profil enregistré.');
  assert.equal(await page.getAttribute('#pf-pseudo','aria-invalid'),null);
  ok('pseudo : règle de la base vérifiée avant l\'envoi, refus 23514 de la base annoncé et relié au champ, pseudo valide enregistré');
  await ctx.close();
  // Suppression du compte : case décochée par défaut (données pas toutes dans le compte) → l'appareil garde ses données
  ({ctx,page}=await ouvrirCompte(false));
  // Clavier : focus sur « Annuler » à l'ouverture, avertissement relié au bouton destructeur ; Annuler et Échap rendent le focus
  const focusId=()=>page.evaluate(()=>document.activeElement.id);
  assert.equal(await page.getAttribute('#sup-confirmer','aria-describedby'),'sup-msg');
  await page.focus('#sup-demander');await page.keyboard.press('Enter');
  assert.equal(await focusId(),'sup-annuler','ouverture : focus sur « Annuler »');
  assert.match(await page.textContent('#sup-msg'),/définitive/);
  await page.keyboard.press('Enter');
  assert.equal(await focusId(),'sup-demander','« Annuler » : focus rendu à « Supprimer mon compte »');
  assert.ok(await page.isHidden('#sup-confirmer'));assert.ok(await page.isHidden('#sup-msg'));
  await page.keyboard.press('Enter');await page.keyboard.press('Escape');
  assert.equal(await focusId(),'sup-demander','Échap : focus rendu à « Supprimer mon compte »');
  assert.ok(await page.isHidden('#sup-confirmer'));
  assert.ok(!(await page.evaluate(()=>window.__base.appels)).includes('rpc:delete_my_account'),'rien n\'est supprimé');
  ok('suppression du compte : focus sur « Annuler » à l\'ouverture, « Annuler » et Échap rendent le focus à « Supprimer mon compte »');
  await page.click('#sup-demander');await page.click('#sup-confirmer');
  await page.waitForFunction(()=>window.__base.appels.includes('rpc:delete_my_account'));
  await page.waitForFunction(()=>/supprimés/.test(document.getElementById('compte-msg').textContent));
  assert.ok((await clesPa(page)).includes('pa-sim-resultats'));
  assert.equal(await focusId(),'compte-msg','suppression réussie : focus sur le message');
  assert.equal(await page.getAttribute('#compte-msg','tabindex'),'-1');
  ok('suppression du compte réussie : focus sur le message de confirmation');
  // Case décochée : données de jeu gardées, mais l'appareil n'appartient plus au compte supprimé
  const restantes=await clesPa(page);
  assert.ok(!restantes.includes('pa-appareil-compte'),'propriétaire retiré');
  assert.ok(!restantes.includes('pa-synchro-objectifs:U1'),'marques de synchronisation du compte supprimé retirées');
  for(const k of ['pa-sim-resultats','pa-objectifs','pa-quiz-dernier','pa-score-historique','pa-tournois-favoris','pa-ma-position'])assert.ok(restantes.includes(k),k+' gardé');
  // Le même joueur recrée un compte (U2) : pas présenté comme « un autre compte »
  await page.evaluate(()=>{const b=JSON.parse(sessionStorage.getItem('base'));b.utilisateur='U2';b.profiles.U2={};b.appels=[];sessionStorage.setItem('base',JSON.stringify(b));});
  await page.goto(base+'/espace.html');
  await page.waitForFunction(()=>/Synchronisé avec ton compte/.test(document.getElementById('esp-statut').textContent));
  assert.equal(await page.locator('#esp-appareil-ajouter').count(),0);
  assert.equal(await page.evaluate(()=>localStorage.getItem('pa-appareil-compte')),'U2');
  ok('suppression sans effacement : pa-appareil-compte et marques du compte retirés, données gardées, nouveau compte sans question');
  await ctx.close();
  // Tout synchronisé : case cochée d'office → données de l'appareil effacées
  ({ctx,page}=await ouvrirCompte(true));
  await page.waitForFunction(()=>document.getElementById('sup-effacer').checked);
  await page.click('#sup-demander');await page.click('#sup-confirmer');
  await page.waitForFunction(()=>window.__base.appels.includes('rpc:delete_my_account'));
  await page.waitForFunction(()=>/supprimés/.test(document.getElementById('compte-msg').textContent));
  assert.deepEqual(await clesPa(page),['pa-mon-departement','pa-tournois-filtres']);
  ok('suppression du compte : données de l\'appareil gardées par défaut si elles ne sont pas toutes dans le compte, effacées sinon');
  await ctx.close();

  /* Compte : lien vers l'espace, plus de tableau de bord en double */
  ({ctx,page}=await nouveau());
  await page.goto(base+'/compte.html');
  assert.equal(await page.locator('#mon-padel').count(),0);
  assert.equal(await page.getAttribute('.esp-lien-carte a','href'),'espace.html');
  ok('Mon compte renvoie vers l\'espace joueur');
  await ctx.close();
  assert.deepEqual(erreurs,[]);
  ok('aucune erreur console ni ressource manquante');
  console.log('TOTAL '+nb+' contrôles réussis.');
 }finally{await browser.close();serveur.close();}
})().catch(e=>{console.error(e);serveur.close();process.exitCode=1;});
