/* Vérification du journal de matchs (espace.html, journal.js) et des réglages du compteur (partenaire, type) :
   1) sans compte : match saisi après coup, statistiques par période, par partenaire et par type, suppression ;
   2) compteur : partenaire et type enregistrés avec le match, visible dans le journal ;
   3) connecté, journal activé (faux Supabase) : copie dans le compte sans doublon (anciens matchs compris),
      suppression partout, suppression hors connexion mise en attente puis envoyée.
   Lancer depuis la racine du site : node scripts/verifier-journal.cjs */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const racine=path.join(__dirname,'..');
let nb=0;
function ok(nom){nb++;console.log('OK '+nom);}
process.on('unhandledRejection',e=>{if(e&&e.name==='TargetClosedError')return;console.error(e);process.exitCode=1;});
const iso=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const ilYa=j=>{const d=new Date();d.setDate(d.getDate()-j);return iso(d);};

// Faux Supabase : table matchs (colonnes du journal), pannes simulées par base.panne
const FAUX=`(function(){
 const base=JSON.parse(sessionStorage.getItem('base')||'null')||{utilisateur:null,matchs:[],appels:[],panne:false};
 const garder=()=>sessionStorage.setItem('base',JSON.stringify(base));window.__base=base;
 function requete(table){
  let op='select',ligne=null,filtres=[],opts={};
  const q={select(){return q;},eq(c,v){filtres.push([c,v]);return q;},order(){return q;},limit(){return q;},
   insert(l){op='insert';ligne=l;return q;},upsert(l,o){op='upsert';ligne=l;opts=o||{};return q;},delete(){op='delete';return q;},
   maybeSingle(){return q;},then(a,b){return Promise.resolve(executer()).then(a,b);}};
  function executer(){
   if(base.panne)return {data:null,error:{message:'Failed to fetch'}};
   if(table!=='matchs')return {data:table==='profiles'?{}:[],error:null};
   const garde=r=>filtres.every(([c,v])=>String(r[c])===String(v));
   if(op==='insert'||op==='upsert'){
    if(op==='upsert'&&base.matchs.some(r=>r.user_id===ligne.user_id&&r.cle===ligne.cle)){base.appels.push('doublon:'+ligne.cle);garder();return {data:null,error:null};}
    base.matchs.push({id:'id-'+(base.matchs.length+1)+'-xxxxxxxx',...ligne});base.appels.push('+'+(ligne.cle||'sans-cle'));garder();return {data:null,error:null};
   }
   if(op==='delete'){base.matchs=base.matchs.filter(r=>!garde(r));base.appels.push('-'+filtres.find(f=>f[0]==='cle')[1]);garder();return {data:null,error:null};}
   return {data:base.matchs.filter(garde),error:null};
  }
  return q;
 }
 window.supabase={createClient(){return {
  auth:{getSession:async()=>({data:{session:base.utilisateur?{user:{id:base.utilisateur,email:'t@t.fr'}}:null}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),signOut:async()=>({})},
  from:requete,rpc:async()=>({data:null,error:null})};}};
})();`;
const CONFIG_ACTIVE=fs.readFileSync(path.join(racine,'assets/js/supabase-config.js'),'utf8')+'\nwindow.PA_SUPABASE.activees=["journal"];\n';

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
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const erreurs=[];
 const nouveau=async({sdk,config,etat,local}={})=>{
  const ctx=await browser.newContext({serviceWorkers:'block',viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await ctx.route('**/supabase-js@*/**',r=>r.fulfill({contentType:'text/javascript',body:sdk||''}));
  if(config)await ctx.route('**/assets/js/supabase-config.js*',r=>r.fulfill({contentType:'text/javascript',body:config}));
  await ctx.route('https://gc.zgo.at/**',r=>r.fulfill({contentType:'text/javascript',body:''}));
  const page=await ctx.newPage();
  page.on('pageerror',e=>erreurs.push(e.message));
  page.on('console',m=>{if(m.type()==='error')erreurs.push(m.text());});
  page.on('response',r=>{if(r.status()>=400&&r.url().startsWith(base))erreurs.push(r.status()+' '+r.url());});
  await page.goto(base+'/index.html');
  await page.evaluate(([e,l])=>{if(e)sessionStorage.setItem('base',JSON.stringify(e));Object.entries(l||{}).forEach(([k,v])=>localStorage.setItem(k,JSON.stringify(v)));},[etat||null,local||null]);
  await page.goto(base+'/espace.html');
  return {ctx,page};
 };
 const ajouter=async(page,{date,type,partenaire,adversaires,victoire,score})=>{
  await page.fill('#esp-m-date',date);await page.selectOption('#esp-m-type',type);
  await page.fill('#esp-m-partenaire',partenaire||'');await page.fill('#esp-m-adversaires',adversaires||'');await page.fill('#esp-m-score',score||'');
  if(victoire!==undefined)await page.click(`#esp-form-match label.tchip:has(input[value="${victoire?0:1}"])`);
  await page.click('#esp-form-match button[type=submit]');
 };
 try{
  /* 1. Sans compte */
  let {ctx,page}=await nouveau();
  assert.match(await page.textContent('#esp-stats'),/Aucun match/);
  await ajouter(page,{date:ilYa(3),type:'tournoi',partenaire:'Léo',adversaires:'Paul et Max',score:'6-4 6-3'});
  assert.match(await page.textContent('#esp-bloc-matchs .esp-msg'),/victoire ou une défaite/);
  await ajouter(page,{date:ilYa(3),type:'tournoi',partenaire:'Léo',adversaires:'Paul et Max',victoire:true,score:'6-4 abc'});
  assert.match(await page.textContent('#esp-bloc-matchs .esp-msg'),/chiffres et des tirets/);
  await ajouter(page,{date:ilYa(3),type:'tournoi',partenaire:'Léo',adversaires:'Paul et Max',victoire:true,score:'6-4 6-3'});
  await ajouter(page,{date:ilYa(10),type:'amical',partenaire:'Léo',victoire:false,score:'4-6 6-7 (5-7)'});
  await ajouter(page,{date:ilYa(200),type:'amical',partenaire:'Hugo',victoire:true});
  ok('match saisi après coup : résultat obligatoire, score contrôlé, ajout au journal');
  // Période 3 mois : 2 matchs (1-1), Léo seul partenaire ; « Tout » : 3 matchs, Hugo apparaît
  let stats=await page.textContent('#esp-stats');
  assert.match(stats,/2\s*matchs/);assert.match(stats,/1 – 1/);assert.match(stats,/50 %/);
  assert.equal(await page.locator('#esp-stats tbody tr').count(),1);
  assert.match(stats,/Amical 1 match, 0 % de victoires · Tournoi 1 match, 100 % de victoires/);
  await page.click('#esp-bloc-matchs label.tchip:has(input[value="tout"])');
  stats=await page.textContent('#esp-stats');
  assert.match(stats,/3\s*matchs/);assert.match(stats,/2 – 1/);
  assert.match(await page.textContent('#esp-stats tbody'),/Hugo/);
  assert.equal(await page.locator('#esp-journal li:not(.esp-bilan-panneau)').count(),3);
  ok('statistiques : période, victoires/défaites, % par partenaire et par type');
  // Résumé « Mon padel » : pas de % de points pour un match saisi après coup
  assert.match(await page.textContent('#mp-matchs'),/–/);
  // Suppression
  await page.locator('#esp-journal li:not(.esp-bilan-panneau)').first().locator('button.x').click();
  assert.equal(await page.locator('#esp-journal li:not(.esp-bilan-panneau)').count(),2);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),390);
  ok('suppression d\'un match ; résumé sans % de points inventé ; 390 px sans débordement');
  // 2. Compteur : partenaire et type
  await page.goto(base+'/score.html');
  await page.fill('#sc-partenaire','Nina');await page.selectOption('#sc-type','entrainement');
  await page.click('#sc-form button[type=submit]');
  for(let i=0;i<4;i++){await page.click('#sc-point-0');await page.click('#sc-motifs button[data-motif="gagnant"]');}
  await page.click('#sc-arreter');await page.click('#sc-arret-oui');
  const enregistre=await page.evaluate(()=>JSON.parse(localStorage.getItem('pa-score-historique'))[0]);
  assert.equal(enregistre.partenaire,'Nina');assert.equal(enregistre.type,'entrainement');assert.match(enregistre.cle,/^[0-9A-Za-z-]{8,40}$/);
  await page.goto(base+'/espace.html');
  await page.click('#esp-bloc-matchs label.tchip:has(input[value="30"])');
  assert.match(await page.textContent('#esp-journal'),/Avec Nina/);assert.match(await page.textContent('#esp-journal'),/Entraînement/);
  assert.match(await page.textContent('#esp-stats'),/100 %\s*des points gagnés/);
  ok('compteur : partenaire, type et identifiant enregistrés, match visible dans le journal');
  await ctx.close();

  /* 3. Connecté, journal activé */
  const ancienFin=new Date(Date.now()-5*86400000).toISOString();
  const etat={utilisateur:'U1',appels:[],panne:false,matchs:[
   // Ancien match déjà dans le compte (copié avant le journal : identifiant = id)
   {id:'11111111-aaaa-bbbb-cccc-000000000001',cle:'11111111-aaaa-bbbb-cccc-000000000001',user_id:'U1',joue_le:ancienFin.replace('Z','+00:00'),nom_a:'Nous',nom_b:'Eux',format:{},points:[{g:0,m:null}],score:'6-0 6-0',vainqueur:0,interrompu:false,saisie:'compteur'},
   // Match ajouté sur un autre appareil
   {id:'x2',cle:'autre-appareil-01',user_id:'U1',joue_le:new Date(Date.now()-86400000).toISOString(),nom_a:'Nous',nom_b:'Club',format:{},points:[],score:'7-5 6-4',vainqueur:0,interrompu:false,partenaire:'Zoé',type_match:'tournoi',saisie:'manuelle'}]};
  const local={'pa-score-historique':[
   {config:{nomA:'Nous',nomB:'Eux',serveur:0,egalite:'decisif',dernierSet:'super'},points:[{g:0,m:null}],fin:ancienFin,score:'6-0 6-0',vainqueur:0,interrompu:false},
   {cle:'local-nouveau-01',config:{nomA:'Nous',nomB:'Rivaux',serveur:0,egalite:'decisif',dernierSet:'super'},points:[{g:1,m:null}],fin:new Date().toISOString(),score:'',vainqueur:null,interrompu:true,partenaire:'Léo',type:'amical',saisie:'compteur'}]};
  ({ctx,page}=await nouveau({sdk:FAUX,config:CONFIG_ACTIVE,etat,local}));
  await page.waitForFunction(()=>window.__base.appels.includes('+local-nouveau-01'));
  await page.click('#esp-bloc-matchs label.tchip:has(input[value="tout"])');
  await page.waitForFunction(()=>document.querySelectorAll('#esp-journal li:not(.esp-bilan-panneau)').length===3);
  const appels=await page.evaluate(()=>window.__base.appels);
  assert.deepEqual(appels,['+local-nouveau-01'],'l\'ancien match n\'est pas recopié');
  assert.match(await page.textContent('#esp-journal'),/Avec Zoé/);
  ok('connecté : match de l\'appareil copié une fois, ancien match reconnu, match d\'un autre appareil affiché');
  // Suppression d'un match du compte
  const iZoe=await page.locator('#esp-journal li:not(.esp-bilan-panneau)').evaluateAll(l=>l.findIndex(x=>/Zoé/.test(x.textContent)));
  await page.locator('#esp-journal li:not(.esp-bilan-panneau)').nth(iZoe).locator('button.x').click();
  await page.waitForFunction(()=>window.__base.appels.includes('-autre-appareil-01'));
  ok('suppression d\'un match du compte depuis le journal');
  // Hors connexion : suppression mise en attente, envoyée au retour
  await page.evaluate(()=>{window.__base.panne=true;window.__garder&&0;sessionStorage.setItem('base',JSON.stringify(window.__base));});
  await page.locator('#esp-journal li:not(.esp-bilan-panneau)').first().locator('button.x').click();
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('pa-journal-suppressions')).length),1);
  await page.evaluate(()=>{const b=JSON.parse(sessionStorage.getItem('base'));b.panne=false;sessionStorage.setItem('base',JSON.stringify(b));});
  await page.reload();
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('pa-journal-suppressions')||'[]').length===0);
  assert.ok(await page.evaluate(()=>window.__base.appels.some(a=>a==='-local-nouveau-01')));
  ok('suppression hors connexion : mise en attente, envoyée au retour');
  await ctx.close();

  /* Journal non activé : un match du compte ne peut pas être supprimé (pas de bouton) */
  ({ctx,page}=await nouveau({sdk:FAUX,etat:{...etat,matchs:[etat.matchs[1]]}}));
  await page.click('#esp-bloc-matchs label.tchip:has(input[value="tout"])');
  await page.waitForFunction(()=>/Zoé/.test(document.getElementById('esp-journal').textContent));
  assert.equal(await page.locator('#esp-journal li button.x').count(),0);
  ok('journal non activé : pas de suppression possible d\'un match du compte');
  await ctx.close();

  assert.deepEqual(erreurs,[]);
  ok('aucune erreur console ni ressource manquante');
  console.log('TOTAL '+nb+' contrôles réussis.');
 }finally{await browser.close();serveur.close();}
})().catch(e=>{console.error(e);serveur.close();process.exitCode=1;});
