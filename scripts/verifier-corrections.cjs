const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),vm=require('node:vm');
const {chromium}=require('playwright');
const racine=path.join(__dirname,'..');
const captures=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'padel-tests-'));
let nb=0;
function ok(nom){nb++;console.log('OK '+nom);}
const serveur=http.createServer((req,res)=>{
 const rel=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\//,'')||'index.html';
 const p=path.resolve(racine,rel);
 if(!p.startsWith(racine+path.sep)){res.writeHead(403);res.end();return;}
 fs.readFile(p,(e,b)=>{if(e){res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.svg':'image/svg+xml'})[path.extname(p)]||'text/plain');res.end(b);
 });
});
function fauxCompte(){
 window.mock={db:{A:[0],B:[3]},offline:false,hold:false,holdSave:false,waiters:[],saveWaiters:[],calls:[]};
 const listeners=[];
 window.PA_COMPTE={actif:true,user:{id:'A'},ready:Promise.resolve(),onChange:f=>listeners.push(f),
  async loadPlan(id){
   const m=window.mock;if(m.offline)return {ok:false};
   const result={ok:true,weeks:[...(m.db[id]||[])]};
   if(m.hold)return new Promise(resolve=>m.waiters.push(()=>resolve(result)));
   return result;
  },
  async savePlanWeek(i,done,id){
   const m=window.mock;m.calls.push({i,done,id});if(m.offline)return {ok:false};
   if(window.PA_COMPTE.user?.id!==id)throw new Error('Mauvais propriétaire');
   if(m.holdSave)await new Promise(resolve=>m.saveWaiters.push(resolve));
   m.db[id]=done?[...new Set([...m.db[id],i])]:m.db[id].filter(n=>n!==i);
   return {ok:true};
  }
 };
 window.changer=id=>{window.PA_COMPTE.user=id?{id}:null;listeners.forEach(f=>f());};
}
async function compteUnitaires(){
 let ecritures=0,authCallback;
 const client={auth:{getSession:async()=>({data:{session:{user:{id:'A'}}}}),onAuthStateChange:f=>authCallback=f},from:()=>({insert:async()=>{ecritures++;return{};},upsert:async()=>{ecritures++;return{};}})};
 const bac={window:{PA_SUPABASE:{url:'simulation',anonKey:'simulation'},supabase:{createClient:()=>client}},location:{protocol:'https:'},URL,localStorage:{removeItem(){}}};
 vm.runInNewContext(fs.readFileSync(path.join(racine,'assets/js/compte.js'),'utf8'),bac);
 const c=bac.window.PA_COMPTE;await c.ready;
 const themes=['vitre','service','aerien','couple','placement','montee','regularite','transition','communication','compet'];
 const resultat={score:20,niveau:3,reponses:themes.map(theme=>({theme,pts:2}))};
 assert.equal((await c.saveQuiz(resultat)).ok,true);
 for(const invalide of [null,{...resultat,score:31},{...resultat,niveau:4},{...resultat,reponses:[]},{...resultat,score:19},{...resultat,reponses:themes.map(theme=>({theme,pts:2.1}))}])assert.equal((await c.saveQuiz(invalide)).ok,false);
 assert.equal(ecritures,1);ok('validation du quiz : score, niveau, réponses et somme');
 // Test v2 : palier 0 à 5, niveau des exercices du palier, palier par réponse ; seulement avec "quiz2"
 const v2={score:20,niveau:3,palier:3,reponses:themes.map(theme=>({theme,pts:2,palier:3}))};
 assert.equal((await c.saveQuiz(v2)).ok,false);
 bac.window.PA_SUPABASE.activees=['quiz2'];
 assert.equal((await c.saveQuiz(v2)).ok,true);
 for(const invalide of [{...v2,palier:6},{...v2,niveau:4},{...v2,palier:0},{...v2,reponses:themes.map(theme=>({theme,pts:2}))},{...v2,reponses:themes.map(theme=>({theme,pts:2,palier:9}))}])assert.equal((await c.saveQuiz(invalide)).ok,false);
 assert.equal(ecritures,2);ecritures=1;ok('validation du quiz v2 : palier, niveau associé, palier par thème, drapeau "quiz2"');
 assert.equal((await c.savePlanWeek(8,true,'A')).ok,false);
 assert.equal((await c.savePlanWeek(0,'oui','A')).ok,false);
 assert.equal((await c.savePlanWeek(0,true,'B')).ok,false);
 assert.equal((await c.savePlanWeeks([0,9])).ok,false);
 assert.equal(ecritures,1);ok('requêtes du plan : indices, types et propriétaire');
}
(async()=>{
 await compteUnitaires();
 await new Promise(r=>serveur.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+serveur.address().port;
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const ctx=await browser.newContext({viewport:{width:400,height:850},serviceWorkers:'block'});
  await ctx.route('**/*',route=>{
   if(route.request().url().startsWith(base))return route.continue();
   return route.fulfill({status:200,body:'',contentType:route.request().resourceType()==='stylesheet'?'text/css':'text/javascript'});
  });
  const page=await ctx.newPage(),erreurs=[];page.on('pageerror',e=>erreurs.push(e.message));
  page.on('console',msg=>{if(msg.type()==='error')erreurs.push(msg.text());});
  for(const f of fs.readdirSync(racine).filter(n=>n.endsWith('.html'))){await page.goto(base+'/'+f);await page.waitForTimeout(80);}
  assert.deepEqual(erreurs,[]);ok('toutes les pages HTML ouvertes à 400 px : aucune exception JavaScript');
  await page.goto(base+'/niveau.html');
  for(let i=0;i<14;i++)await page.locator('.qopt').last().click(); // classement : « Je ne suis pas classé(e) », puis une option au hasard
  await page.locator('#qresult .vtag').waitFor();ok('quiz complet dans le navigateur');
  await page.goto(base+'/materiel.html');
  assert.ok(await page.locator('.rk').count()>0);ok('sélecteur de raquettes : recommandations affichées');
  await page.goto(base+'/bareme.html');
  await page.evaluate(()=>localStorage.setItem('pa-sim-resultats',JSON.stringify([
   {cat:'P100',place:1,nb:16,sexe:'messieurs'},
   {cat:'<img src=x onerror=alert(1)>',place:1,nb:16,sexe:'messieurs'},
   {cat:'P100',place:1,nb:16,sexe:'messieurs',date:'2000-01-01'}
  ])));
  await page.reload();
  assert.equal(await page.locator('#sim-list tr').count(),2);
  assert.equal(await page.locator('#sim-total').innerText(),'0');
  ok('résultats anciens conservés, dates manquantes et résultats expirés exclus, données invalides rejetées');
  const aujourd=await page.evaluate(()=>simIso(new Date()));
  await page.locator('#sim-list input').first().fill(aujourd);
  await page.locator('#sim-list input').first().dispatchEvent('change');
  assert.equal(await page.locator('#sim-total').innerText(),'100');
  await page.locator('#sim-list .x').nth(1).click();
  assert.equal(await page.locator('#sim-total').innerText(),'100');ok('date modifiable et suppression du bon résultat malgré des scores identiques');
  const bornes=await page.evaluate(()=>({invalide:simLireDate('2026-02-30'),bissextile:simExpire('2024-02-29'),normale:simExpire('2025-10-26')}));
  assert.deepEqual(bornes,{invalide:null,bissextile:'2025-02-28',normale:'2026-10-26'});ok('dates impossibles et anniversaire du 29 février');
  await page.evaluate(()=>{sim=Array.from({length:13},()=>({cat:'P100',place:1,nb:16,sexe:'messieurs',date:simIso(new Date())}));simRender();});
  assert.equal(await page.locator('#sim-total').innerText(),'1200');ok('maximum de 12 résultats retenus');
  await page.evaluate(()=>localStorage.setItem('pa-sim-resultats','{}'));await page.reload();
  assert.equal(await page.locator('#sim-total').innerText(),'0');ok('stockage simulateur mal formé récupéré sans plantage');
  await page.locator('#sim-add').click();
  assert.equal(await page.locator('#sim-list tr').count(),1);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:path.join(captures,'bareme-mobile.png'),fullPage:true});ok('simulateur utilisable à 400 px sans débordement de page');
  await ctx.route('**/assets/js/compte.js',route=>route.fulfill({contentType:'text/javascript',body:'('+fauxCompte.toString()+')()'}));
  await page.evaluate(()=>{localStorage.clear();localStorage.setItem('pa-weeks','[4]');});
  await page.goto(base+'/entrainement.html');
  await page.waitForFunction(()=>window.PA_COMPTE&&document.querySelector('#w0').checked);
  assert.equal(await page.locator('#w4').isChecked(),false);
  assert.equal(await page.evaluate(()=>mock.calls.length),0);ok('aucune fusion automatique de la progression anonyme');
  await page.evaluate(()=>changer('B'));
  await page.waitForFunction(()=>document.querySelector('#w3').checked);
  assert.equal(await page.locator('#w0').isChecked(),false);ok('changement de compte : progression isolée');
  await page.evaluate(()=>changer(null));
  assert.equal(await page.locator('#w4').isChecked(),true);
  assert.equal(await page.locator('#w3').isChecked(),false);ok('déconnexion : retour à la progression anonyme');
  await page.evaluate(()=>changer('A'));
  await page.waitForFunction(()=>document.querySelector('#w0').checked);
  await page.evaluate(()=>mock.offline=true);await page.locator('#w0').uncheck();
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('pa-weeks-v2:A')).pending['0']===false);
  await page.reload();
  await page.waitForFunction(()=>window.mock&&mock.calls.some(c=>c.i===0&&c.done===false));
  assert.equal(await page.locator('#w0').isChecked(),false);ok('décochage hors connexion conservé après rechargement et synchronisé');
  await page.getByRole('button',{name:'Importer les semaines enregistrées sans compte dans mon compte'}).click();
  await page.waitForFunction(()=>mock.db.A.includes(4));
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('pa-weeks-v2:invite')).done.length),0);ok('import explicite de la progression anonyme');
  await page.evaluate(()=>{mock.hold=true;changer('B');});
  await page.waitForFunction(()=>mock.waiters.length===1);
  await page.evaluate(()=>{mock.hold=false;changer('A');});
  await page.waitForFunction(()=>document.querySelector('#w4').checked);
  await page.evaluate(()=>mock.waiters.shift()());await page.waitForTimeout(40);
  assert.equal(await page.locator('#w3').isChecked(),false);ok('réponse réseau tardive du compte précédent ignorée');
  await page.evaluate(()=>{mock.holdSave=true;});
  await page.locator('#w2').check();
  await page.waitForFunction(()=>mock.saveWaiters.length===1);
  await page.locator('#w2').uncheck();
  await page.evaluate(()=>{mock.holdSave=false;mock.saveWaiters.shift()();});
  await page.waitForFunction(()=>!mock.db.A.includes(2)&&Object.keys(wEtat.pending).length===0&&!wEtat.running);
  assert.equal(await page.locator('#w2').isChecked(),false);ok('clics rapides : le dernier choix est envoyé après la requête en cours');
  await page.evaluate(()=>mock.offline=true);await page.locator('#w5').check();
  await page.getByRole('button',{name:'Réessayer la synchronisation'}).waitFor();
  await page.evaluate(()=>{mock.offline=false;window.dispatchEvent(new Event('online'));});
  await page.waitForFunction(()=>mock.db.A.includes(5)&&Object.keys(wEtat.pending).length===0);ok('retour du réseau : reprise automatique des changements en attente');
  await page.locator('#w1').focus();await page.keyboard.press('Space');
  assert.equal(await page.locator('#w1').getAttribute('aria-label'),'Valider la semaine 2 : Volée de blocage');
  assert.equal(await page.evaluate(()=>document.activeElement.id),'w1');ok('cases accessibles au clavier et focus conservé');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:path.join(captures,'entrainement-mobile.png'),fullPage:true});
  await page.setViewportSize({width:1280,height:900});await page.screenshot({path:path.join(captures,'entrainement-desktop.png'),fullPage:true});
  await page.evaluate(()=>{localStorage.setItem('pa-weeks-v2:A','{"done":{},"pending":{"99":true,"0":"oui"}}');});
  await page.reload();await page.waitForFunction(()=>window.PA_COMPTE&&document.querySelector('#w0').checked);ok('progression locale mal formée récupérée sans plantage');
  assert.deepEqual(erreurs,[]);ok('aucune exception pendant les parcours corrigés');
  await ctx.close();
 }finally{await browser.close();serveur.close();}
 console.log('TOTAL '+nb+' contrôles réussis.');
})().catch(e=>{console.error(e);serveur.close();process.exitCode=1;});
