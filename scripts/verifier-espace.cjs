/* Vérification de l'espace joueur (espace.html, joueur-sync.js) :
   1) fusion à trois voies (appareil / compte / dernière synchronisation), hors navigateur ;
   2) page sans compte : objectifs, résultats partagés avec le simulateur, courbe de progression, 390 px ;
   3) connecté (faux Supabase en mémoire) : envoi, récupération, suppression, rang le plus récent.
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
  auth:{getSession:async()=>({data:{session:base.utilisateur?{user:{id:base.utilisateur,email:'t@t.fr'}}:null}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),signOut:async()=>({})},
  from:requete,rpc:async()=>({data:null,error:null})};}};
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
  assert.match(await page.textContent('#esp-statut'),/gardées sur cet appareil/);
  assert.match(await page.textContent('#esp-objectifs'),/Aucun objectif/);
  // Résultat : P100, vainqueur, 16 paires, il y a 10 jours = 100 points
  await page.selectOption('#esp-cat','P100');await page.fill('#esp-place','1');await page.fill('#esp-nb','16');await page.fill('#esp-date',ilYa(10));
  await page.click('#esp-form-resultat button[type=submit]');
  assert.equal(await page.textContent('#esp-total'),'100');
  assert.equal(await page.locator('#esp-resultats tbody tr').count(),1);
  // Place impossible : refusée
  await page.fill('#esp-place','20');await page.fill('#esp-nb','8');
  await page.click('#esp-form-resultat button[type=submit]');
  assert.match(await page.textContent('#esp-bloc-resultats .esp-msg'),/n'existe pas/);
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
  ok('objectifs : ajout, avancement en %, cible invalide refusée');
  // Courbe : 12 points, tableau équivalent, survol
  assert.equal(await page.locator('#esp-progression circle').count(),12);
  assert.equal(await page.locator('#esp-progression .esp-donnees tbody tr').count(),12);
  await page.locator('#esp-progression .esp-survol').nth(11).focus();
  assert.match(await page.textContent('#esp-bulle'),/100 points/);
  ok('progression : courbe de 12 mois, tableau équivalent, infobulle au clavier');
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
