/* Vérification du parcours de progression (chantier 4) :
   1) moteur (exercices.js) : objectifs de jeu pris en compte et expliqués, ordre des priorités du test conservé à égalité,
      programme de la semaine selon la fréquence, exercices faits récemment mis de côté ; test de niveau : priorités
      Découverte / P25 sans le jeu aérien en tête ; détails gardés (méthode, fréquence) ;
   2) données : mêmes objectifs dans exercices-donnees.js, joueur-sync.js et le SQL ; RLS sur les 4 opérations ;
   3) navigateur (espace.html) : visiteur sans données, objectifs (choix, focus, rechargement), programme et « Je l'ai fait »,
      niveau estimé distinct du classement FFT, derniers matchs, historique, mobile ; test de niveau → « Voir mon programme » ;
      connecté : synchronisation des objectifs seulement avec "espace" + "progression".
   Lancer depuis la racine du site : node scripts/verifier-progression.cjs */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),vm=require('node:vm');
const {chromium}=require('playwright');
const racine=path.join(__dirname,'..');
let nb=0;
function ok(nom){nb++;console.log('OK '+nom);}
process.on('unhandledRejection',e=>{if(e&&e.name==='TargetClosedError')return;console.error(e);process.exitCode=1;});
const THEMES=['vitre','service','aerien','couple','placement','montee','regularite','transition','communication','compet'];
const J=x=>JSON.parse(JSON.stringify(x));

function moteur(){
 const bac={window:{},document:{getElementById:()=>null,addEventListener(){}},addEventListener(){}};
 bac.window.addEventListener=()=>{};
 vm.runInNewContext(fs.readFileSync(path.join(racine,'assets/js/exercices-donnees.js'),'utf8')+';this.__O=OBJECTIFS_JEU;',bac);
 vm.runInNewContext(fs.readFileSync(path.join(racine,'assets/js/exercices.js'),'utf8'),bac);
 const P=bac.window.PA_EXERCICES,O=J(bac.__O);
 // Objectifs de jeu : thèmes et raison
 let r=J(P.themesPrioritaires(null,[],['bandeja']));
 assert.equal(r[0].theme,'aerien');assert.match(r[0].raisons[0],/Ton objectif : maîtriser la bandeja/);
 r=J(P.themesPrioritaires(null,[],['defense']));
 assert.deepEqual(r.map(x=>x.theme),['regularite','vitre']);
 assert.equal(J(P.themesPrioritaires(null,[],['inconnu'])).length,0);
 // À égalité, l'ordre du test est gardé (vitre avant aerien), plus l'ordre alphabétique
 const quiz={palier:2,niveau:2,priorites:['vitre','aerien','regularite'],reponses:THEMES.map(t=>({theme:t,pts:['vitre','aerien','regularite'].includes(t)?2:3,palier:2}))};
 assert.deepEqual(J(P.themesPrioritaires(quiz,[])).map(x=>x.theme),['vitre','aerien','regularite']);
 ok('moteur : objectifs de jeu pris en compte et expliqués ; à égalité, l\'ordre des priorités du test est gardé');
 // Programme : nombre selon la fréquence, rotation entre thèmes, exercices faits récemment après les autres
 const themes=J(P.themesPrioritaires(quiz,[]));
 assert.equal(P.programme(themes,2,0,{}).length,1);
 assert.equal(P.programme(themes,2,3,{}).length,4);
 assert.equal(P.programme(themes,2,null,{}).length,2);
 const prog=J(P.programme(themes,2,2,{}));
 assert.deepEqual(prog.map(p=>p.theme),['vitre','aerien','regularite']);
 const premier=prog[0].exercice.id,maintenant=Date.parse('2026-10-27T12:00:00Z');
 const apres=J(P.programme(themes,2,2,{[premier]:'2026-10-25T12:00:00Z'},maintenant));
 assert.ok(!apres.some(p=>p.exercice.id===premier),'fait il y a 2 jours : remplacé');
 const longtemps=J(P.programme(themes,2,2,{[premier]:'2026-10-01T12:00:00Z'},maintenant));
 assert.equal(longtemps[0].exercice.id,premier);
 ok('programme : 1 à 4 exercices selon la fréquence (2 par défaut), un thème après l\'autre, exercice fait depuis moins de 6 jours remplacé');
 // Test de niveau : priorités des débutants
 const b2={window:{},document:{getElementById:()=>null}};
 vm.runInNewContext(fs.readFileSync(path.join(racine,'assets/js/quiz-niveau.js'),'utf8'),b2);
 const N=b2.window.PA_NIVEAU;
 const tech=v=>Object.fromEntries(['vitre','service','aerien','couple','placement','montee','regularite','transition','communication'].map(t=>[t,v]));
 const deb=N.estimer({resultats:null,anciennete:0,frequence:1,raquette:0,technique:tech(0)});
 assert.equal(deb.palier,0);assert.deepEqual(J(deb.priorites),['regularite','vitre','placement']);
 const p100=N.estimer({resultats:2,anciennete:3,frequence:2,raquette:0,technique:{...tech(3),aerien:1}});
 assert.equal(J(p100.priorites)[0],'aerien');
 ok('test de niveau : Découverte → défense, vitre, placement (pas la bandeja) ; P100 avec un trou aérien → bandeja en tête');
 return O;
}

function donnees(O){
 const ids=O.map(o=>o.id);
 assert.deepEqual(ids,['defense','vitre','volees','bandeja','placement','fautes','tournoi']);
 const sync=fs.readFileSync(path.join(racine,'assets/js/joueur-sync.js'),'utf8');
 assert.ok(sync.includes('const JS_OBJECTIFS_JEU='+JSON.stringify(ids)));
 const sql=fs.readFileSync(path.join(racine,'supabase/migrations/2026-10-27-progression-01-table-objectifs-jeu.sql'),'utf8');
 assert.ok(sql.includes("check (objectif in ("+ids.map(i=>"'"+i+"'").join(',')+"))"));
 assert.match(sql,/enable row level security/);
 for(const op of ['select','insert','update','delete'])assert.match(sql,new RegExp('for '+op+' to authenticated (using|with check) \\(auth\\.uid\\(\\) = user_id\\)'));
 O.forEach(o=>{const [f,a]=o.lien.split('#');assert.ok(fs.existsSync(path.join(racine,f)));if(a)assert.ok(fs.readFileSync(path.join(racine,f),'utf8').includes('id="'+a+'"'),o.lien);});
 ok('données : 7 objectifs identiques (données, synchronisation, SQL) ; RLS sur lecture, ajout, modification, suppression ; liens valides');
}

// Supabase simulé : session selon sessionStorage « session », enregistre les tables appelées
const SDK=`(function(){
 window.__tables=[];
 const session=()=>sessionStorage.getItem('session')?{user:{id:'u1',email:'j@t.fr'}}:null;
 const requete=table=>{window.__tables.push(table);const q=new Proxy({},{get(_,k){
  if(k==='then')return ok=>ok({data:[],error:null});
  if(k==='maybeSingle'||k==='single')return ()=>Promise.resolve({data:null,error:null});
  if(k==='upsert'||k==='insert'||k==='delete'||k==='update')return ()=>{window.__tables.push(table+':'+k);return q;};
  return ()=>q;}});return q;};
 window.supabase={createClient(){return {auth:{getSession:async()=>({data:{session:session()}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),signOut:async()=>({})},
  from:requete,rpc:async()=>({data:null,error:null})};}};
})();`;
const CONFIG=liste=>fs.readFileSync(path.join(racine,'assets/js/supabase-config.js'),'utf8')+'\nwindow.PA_SUPABASE.activees='+JSON.stringify(liste)+';\n';

const serveur=http.createServer((req,res)=>{
 const rel=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\//,'')||'index.html';
 const p=path.resolve(racine,rel);
 if(!p.startsWith(racine+path.sep)){res.writeHead(403);res.end();return;}
 fs.readFile(p,(e,b)=>{if(e){res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.webp':'image/webp','.webmanifest':'application/manifest+json'})[path.extname(p)]||'text/plain');res.end(b);
 });
});
(async()=>{
 donnees(moteur());
 await new Promise(r=>serveur.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+serveur.address().port;
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const erreurs=[];
 // L'espace est réservé aux joueurs connectés : sauf « visiteur », chaque parcours ouvre une session simulée
 const ouvrir=async({activees=[],avant,visiteur=false}={})=>{
  const ctx=await browser.newContext({serviceWorkers:'block',viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await ctx.route('https://**',r=>r.fulfill({body:''}));
  await ctx.route('**/supabase-js@*/**',r=>r.fulfill({contentType:'text/javascript',body:SDK}));
  await ctx.route('**/assets/js/supabase-config.js*',r=>r.fulfill({contentType:'text/javascript',body:CONFIG(activees)}));
  const page=await ctx.newPage();
  page.on('pageerror',e=>erreurs.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))erreurs.push(m.text());});
  await page.goto(base+'/index.html');
  if(!visiteur)await page.evaluate(()=>sessionStorage.setItem('session','1'));
  if(avant)await page.evaluate(avant);
  await page.goto(base+'/espace.html');
  if(!visiteur)await page.waitForSelector('#esp-bord .bord-bloc');
  return {ctx,page};
 };
 try{
  // Visiteur non connecté : redirection vers la connexion
  let {ctx,page}=await ouvrir({visiteur:true});
  await page.waitForURL(/connexion\.html\?suite=espace\.html$/);
  await ctx.close();
  ok('visiteur non connecté : espace.html redirige vers la connexion');
  // Joueur connecté sans données
  ({ctx,page}=await ouvrir());
  assert.match(await page.textContent('#esp-bord .bord-niveau'),/Pas encore de test/);
  assert.equal(await page.getAttribute('#esp-bord .bord-niv-test a','href'),'niveau.html');assert.equal(await page.getAttribute('#esp-bord .bord-niv-declare a','href'),'academie.html#niveaux');
  assert.match(await page.textContent('#esp-bord .bord-programme'),/ton programme apparaîtra ici/);
  assert.match(await page.textContent('#esp-bord .bord-matchs'),/Aucun match/);
  ok('joueur connecté sans données : invitation au test, programme vide expliqué, aucun match');
  // Choisir un objectif : programme expliqué, focus gardé, gardé après rechargement
  await page.click('.bord-puce[data-objectif="bandeja"]');
  assert.equal(await page.getAttribute('.bord-puce[data-objectif="bandeja"]','aria-pressed'),'true');
  assert.equal(await page.evaluate(()=>document.activeElement.dataset.objectif),'bandeja');
  assert.match(await page.textContent('.bord-programme'),/Ton objectif : maîtriser la bandeja/);
  assert.equal(await page.locator('.bord-ex').count(),2);
  assert.match(await page.textContent('#esp-exercices'),/Bandeja/);
  await page.reload();await page.waitForSelector('#esp-bord .bord-bloc');
  assert.equal(await page.getAttribute('.bord-puce[data-objectif="bandeja"]','aria-pressed'),'true');
  ok('objectif de jeu : choisi, expliqué dans le programme et les exercices, focus gardé, conservé après rechargement');
  // « Je l'ai fait » : marqué, l'exercice suivant devient « prochain », historique à jour, carte des exercices aussi
  const premier=await page.locator('.bord-ex').first().locator('b').textContent();
  await page.locator('.bord-ex').first().locator('.bord-fait-btn').click();
  // L'exercice fait passe en fin de liste, marqué ; le suivant devient « Prochain exercice »
  const fait=page.locator('.bord-ex',{hasText:premier});
  assert.match(await fait.locator('.bord-fait-btn').textContent(),/Fait le/);
  assert.equal(await page.locator('.bord-ex').last().locator('b').textContent(),premier);
  assert.match(await page.locator('.bord-prochain b').textContent(),/./);
  assert.notEqual(await page.locator('.bord-prochain b').textContent(),premier);
  assert.match(await page.textContent('.bord-historique'),/1\s*exercice fait ces 30 derniers jours/);
  assert.match(await page.textContent('#esp-exercices'),/Fait le/);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),390);
  await ctx.close();
  ok('« Je l\'ai fait » : exercice marqué, le suivant devient prochain, historique et carte des exercices à jour ; 390 px');
  // Test passé (P100, 2-3 fois par semaine) et un match : niveau, fréquence, matchs
  ({ctx,page}=await ouvrir({avant:()=>{
   const d=new Date().toISOString();
   localStorage.setItem('pa-quiz-dernier',JSON.stringify({version:2,date:d,palier:2,niveau:2,score:20,priorites:['vitre','aerien','regularite'],methode:'test-niveau-v2',source:'resultats',reperes:{anciennete:2,frequence:2,raquette:0,resultats:2},
    reponses:['vitre','service','aerien','couple','placement','montee','regularite','transition','communication','compet'].map(t=>({theme:t,pts:2,palier:2}))}));
   localStorage.setItem('pa-score-historique',JSON.stringify([{cle:'match-progression-01',config:{nomA:'Nous',nomB:'Léo et Max',serveur:0,egalite:'decisif',dernierSet:'super'},points:[{g:0,m:'gagnant'},{g:1,m:'faute'}],fin:d,score:'6-4',vainqueur:0,interrompu:false}]));
  }}));
  const niveau=await page.textContent('.bord-niveau');
  assert.match(niveau,/P100/);assert.match(niveau,/basé sur tes résultats en tournoi/);assert.match(niveau,/Seul le classement FFT est officiel/);
  assert.match(await page.textContent('.bord-programme'),/3 exercices cette semaine, parce que tu joues deux ou trois fois par semaine/);
  assert.equal(await page.locator('.bord-ex').count(),3);
  assert.match(await page.textContent('.bord-matchs'),/contre Léo et Max · 6-4 \(gagné\)/);
  assert.match(await page.textContent('.bord-historique'),/1\s*match sur 30 jours/);
  await ctx.close();
  ok('test passé : palier et fiabilité, distinct du classement FFT ; programme réglé sur la fréquence ; derniers matchs et historique');
  // Test de niveau → « Voir mon programme »
  ({ctx,page}=await ouvrir());
  await page.goto(base+'/niveau.html');await page.click('text=Je ne suis pas classé(e)');
  const textes=await page.evaluate(()=>[...PA_NIVEAU.REPERES,...PA_NIVEAU.SITUATIONS].map(x=>x.o[0][0]));
  for(const t of textes)await page.locator('#qopts .qopt',{hasText:t}).first().click();
  await page.waitForSelector('#qresult:not([hidden])');
  const q=await page.evaluate(()=>JSON.parse(localStorage.getItem('pa-quiz-dernier')));
  assert.equal(q.methode,'test-niveau-v2');assert.equal(q.reperes.frequence,0);assert.equal(q.source,'technique');
  await page.click('#qresult a:has-text("Voir mon programme")');
  await page.waitForURL(/espace\.html#esp-bord$/);await page.waitForSelector('.bord-niveau .bord-palier');
  assert.equal(await page.textContent('.bord-palier'),'Découverte');
  assert.match(await page.textContent('.bord-programme'),/1 exercice cette semaine, parce que tu joues moins d'une fois par semaine/);
  await ctx.close();
  ok('test de niveau → « Voir mon programme » : méthode et fréquence gardées, palier et programme dans l\'espace');
  // Connecté : objectifs envoyés au compte seulement avec "espace" + "progression"
  for(const [liste,attendu] of [[['espace'],false],[['espace','progression'],true]]){
   ({ctx,page}=await ouvrir({activees:liste,avant:()=>{sessionStorage.setItem('session','1');localStorage.setItem('pa-objectifs-jeu',JSON.stringify([{cle:'objectif-sync-01',objectif:'vitre',depuis:'2026-10-27'}]));}}));
   await page.waitForTimeout(800);
   const tables=await page.evaluate(()=>window.__tables);
   assert.equal(tables.includes('objectifs_jeu:upsert'),attendu,liste.join('+')+' : '+tables.join(','));
   assert.equal(tables.includes('objectifs_jeu'),attendu);
   await ctx.close();
  }
  ok('connecté : objectifs de jeu envoyés au compte seulement si "espace" et "progression" sont actifs');
  // Connecté, test enregistrable plus tard : message clair sur niveau.html
  ({ctx,page}=await ouvrir({activees:['espace'],avant:()=>sessionStorage.setItem('session','1')}));
  await page.goto(base+'/niveau.html');await page.click('text=Je ne suis pas classé(e)');
  const t2=await page.evaluate(()=>[...PA_NIVEAU.REPERES,...PA_NIVEAU.SITUATIONS].map(x=>x.o[0][0]));
  for(const t of t2)await page.locator('#qopts .qopt',{hasText:t}).first().click();
  await page.waitForSelector('#qsave:not([hidden]) p');
  assert.match(await page.textContent('#qsave'),/gardé sur cet appareil et apparaît dans ton espace joueur/);
  await ctx.close();
  ok('connecté sans enregistrement dans le compte ("quiz2" absent) : le résultat est expliqué, pas perdu');
  assert.deepEqual(erreurs,[]);
  ok('aucune erreur console');
  console.log('TOTAL '+nb+' contrôles réussis.');
 }finally{await browser.close();serveur.close();}
})().catch(e=>{console.error(e);serveur.close();process.exitCode=1;});
