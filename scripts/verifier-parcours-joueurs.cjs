/* Parcours complets de joueurs (filet de sécurité de l'expérience personnalisée, lot 0) dans Edge, téléphone 390 px :
   1. nouvel utilisateur : accueil → choix du niveau → quiz complet → parcours → défi → plan d'entraînement ;
   2. joueurs de niveau 2, 5 et 8 : contenus recommandés dans leur niveau, niveau d'exercice et défi correspondants,
      Mon espace qui suit le niveau déclaré, plan 8 semaines générique toujours présent ;
   3. utilisateur connecté (Supabase simulé, session) : Mon espace ouvert, académie sur l'appareil, aucune écriture
      vers des tables de l'académie (synchronisation pas encore écrite) ;
   4. utilisateur non connecté (Supabase simulé, sans session) : Mon espace renvoie vers la connexion, Mon académie
      reste utilisable sans compte ;
   5. retour après 11 jours (mêmes données, horloge avancée) : niveau, historique, défi relevé, exercice fait et semaine
      du plan conservés ; nouveau défi ; nouveau quiz sans les questions de la séance précédente ;
   et pour tous : les données déjà présentes (test de niveau, classement FFT, matchs) ne sont jamais modifiées.
   Lancer depuis la racine du site : node scripts/verifier-parcours-joueurs.cjs */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const racine=path.join(__dirname,'..');
let nb=0;
function ok(nom){nb++;console.log('OK '+nom);}
const TYPES={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.woff2':'font/woff2','.webmanifest':'application/manifest+json'};
const serveur=http.createServer((req,res)=>{
 const rel=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\//,'')||'index.html';
 const p=path.resolve(racine,rel);
 if(!p.startsWith(racine+path.sep)){res.writeHead(403);res.end();return;}
 fs.readFile(p,(e,b)=>{if(e){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',TYPES[path.extname(p)]||'application/octet-stream');res.end(b);});
});
// Supabase simulé (même principe que verifier-diagnostic.cjs) : session selon sessionStorage, écritures notées
const SDK=`(function(){
 window.__ops=[];
 const session=()=>sessionStorage.getItem('session')?{user:{id:'u1',email:'j@t.fr'}}:null;
 const requete=table=>{const q=new Proxy({},{get(_,k){
  if(k==='then')return ok=>ok({data:[],error:null});
  if(k==='maybeSingle'||k==='single')return ()=>Promise.resolve({data:null,error:null});
  if(['upsert','insert','delete','update'].includes(k))return v=>{window.__ops.push(table+':'+k);return q;};
  return ()=>q;}});return q;};
 window.supabase={createClient(){return {auth:{getSession:async()=>({data:{session:session()}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),signOut:async()=>({})},
  from:requete,rpc:async()=>({data:null,error:null})};}};
})();`;
// Données déjà présentes sur l'appareil, qui ne doivent jamais être modifiées par l'académie
const EXISTANT={
 'pa-quiz-dernier':JSON.stringify({date:'2026-10-12T10:00:00.000Z',palier:2,niveau:2,reponses:[],methode:'test-niveau-v2'}),
 'pa-classement-fft':JSON.stringify({rang:12500,sexe:'messieurs'}),
 'pa-score-historique':JSON.stringify([{cle:'m-existant',config:{nomA:'Nous',nomB:'Eux',serveur:0,egalite:'decisif',dernierSet:'super'},points:[{g:0,m:'gagnant'},{g:1,m:'faute'}],fin:'2026-10-20T18:00:00.000Z',score:'6-4 6-3',vainqueur:0,partenaire:'Léa',type:'amical'}]),
};

async function dansLeNavigateur(base){
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const erreurs=[];
 async function ouvrir({quand='2026-10-29T10:00:00',etat=null,comptes='indisponibles',connecte=false}={}){
  const ctx=await browser.newContext({serviceWorkers:'block',viewport:{width:390,height:844},isMobile:true,hasTouch:true,storageState:etat||undefined});
  if(comptes==='indisponibles')await ctx.route('https://**',r=>r.fulfill({status:200,body:''}));
  else{await ctx.route('https://**',r=>r.fulfill({body:''}));await ctx.route('**/supabase-js@*/**',r=>r.fulfill({contentType:'text/javascript',body:SDK}));}
  const page=await ctx.newPage();
  page.on('pageerror',e=>erreurs.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))erreurs.push(m.text());});
  await page.clock.setFixedTime(new Date(quand));
  await page.goto(base+'/index.html');
  if(!etat)await page.evaluate(x=>Object.entries(x).forEach(([k,v])=>localStorage.setItem(k,v)),EXISTANT);
  if(connecte)await page.evaluate(()=>sessionStorage.setItem('session','1'));
  return {ctx,page};
 }
 const existantIntact=async(page,qui)=>{const v=await page.evaluate(k=>Object.fromEntries(k.map(x=>[x,localStorage.getItem(x)])),Object.keys(EXISTANT));assert.deepEqual(v,EXISTANT,qui+' : données existantes modifiées');};
 async function quizComplet(page,strategie=()=>true){
  await page.click('#aq-nouveau');
  for(let i=0;i<10;i++){
   const bonne=await page.evaluate(()=>{const e=JSON.parse(localStorage.getItem('pa-academie-quiz')).enCours;const q=ACADEMIE_QUESTIONS.find(x=>x.id===e.questions[e.reponses.length].id);return q.choix[q.bonne];});
   const t=await page.locator('.qt-reponse').allTextContents();
   await page.locator('.qt-reponse').nth(strategie(i)?t.indexOf(bonne):t.findIndex(x=>x!==bonne)).click();
   // Après une erreur : article, exercice et scène 3D de la question ; rien après une bonne réponse
   const rv=await page.evaluate(()=>{const z=document.querySelector('#aq-correction .qt-revoir');return z&&{liens:[...z.querySelectorAll('a')].map(a=>a.getAttribute('href')),exo:(z.querySelector('summary b')||{}).textContent};});
   if(strategie(i))assert.equal(rv,null);
   else{const q=await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('pa-academie-quiz'));const e=s.enCours||s.seances[s.seances.length-1];const x=ACADEMIE_QUESTIONS.find(y=>y.id===e.reponses[e.reponses.length-1].id);return {article:x.revoir.article.url,scene:x.scenario,exo:x.exercice?EXERCICES.find(y=>y.id===x.exercice).titre:undefined};});
    assert.equal(rv.liens[0],q.article);assert.equal(rv.exo,q.exo);if(q.scene)assert.equal(rv.liens[rv.liens.length-1],'simulateur-3d-'+q.scene+'.html#mode-quiz');}
   await page.click('#aq-suite');
  }
  return page.evaluate(()=>JSON.parse(localStorage.getItem('pa-academie-quiz')).seances.slice(-1)[0]);
 }
 async function verifierNiveau(page,n){
  // Contenus recommandés dans le niveau
  const r=await page.evaluate(n=>{
   const titres=[...document.querySelectorAll('#ap .ap-bloc:nth-child(2) a')].map(a=>a.getAttribute('href'));
   const arts=titres.map(u=>ACADEMIE_ARTICLES.find(a=>a.url===u));
   const scenes=[...document.querySelectorAll('#ap .ap-bloc:nth-child(4) li a:first-child')].map(a=>a.getAttribute('href').replace(/^simulateur-3d-|\.html$/g,''));
   const sc=PA_PARCOURS.scenes(ACADEMIE_QUESTIONS);
   return {arts:arts.map(a=>a&&a.niveaux),scenes:scenes.map(id=>(sc.find(x=>x.id===id)||{}).niveaux)};
  },n);
  assert.ok(r.arts.length>=2&&r.arts.every(x=>x&&x[0]<=n&&n<=x[1]),'niveau '+n+' : articles du niveau');
  assert.ok(r.scenes.length>=1&&r.scenes.every(x=>x&&x[0]<=n&&n<=x[1]),'niveau '+n+' : scènes du niveau');
  const nivEx=n<=3?1:n<=5?2:n<=7?3:4;
  const defi=await page.textContent('#ac-defi h3');
  assert.equal(defi,await page.evaluate(k=>PA_DEFIS.defi(PA_DEFIS.lundi(new Date()),k).exercice.titre,nivEx),'niveau '+n+' : défi au niveau d’exercice '+nivEx);
 }
 const GENERIQUE=['La vitre est ton amie','Volée de blocage',"Le lob d'attaque",'Monter à deux','La bandeja','Chiquita et transition','Smash ou pas smash','Semaine match'];
 async function planGenerique(page,n){
  await page.goto(page.url().replace(/[^/]*$/,'entrainement.html'));
  const t=await page.$$eval('#weeks article.week h3',h=>h.map(x=>x.textContent));
  assert.deepEqual(t,GENERIQUE,'plan 8 semaines générique');
  if(!n)return;
  // Mon plan : les 8 mêmes semaines, priorités en tête, Semaine match en dernier, exercices au niveau d'exercice
  const mp=await page.evaluate(()=>[...document.querySelectorAll('#mon-plan .mp-semaine')].map(li=>({titre:li.querySelector('h3').textContent,
   prio:!!li.querySelector('.ap-etat'),exo:(li.querySelector('summary b')||{}).textContent,voisin:!!li.querySelector('.mp-voisin'),i:Number(li.querySelector('.mp-valider').dataset.i)})));
  assert.deepEqual(mp.map(x=>x.titre).slice().sort(),GENERIQUE.slice().sort(),'niveau '+n+' : les mêmes 8 semaines');
  assert.equal(mp[7].titre,'Semaine match');
  const k=mp.findIndex(x=>!x.prio);assert.ok(k>0&&mp.slice(k,7).every(x=>!x.prio),'niveau '+n+' : semaines prioritaires en tête');
  const nivEx=n<=3?1:n<=5?2:n<=7?3:4;
  // Au niveau d'exercice, sauf la 2e semaine d'un même thème : niveau voisin, signalé
  const ex=await page.evaluate(titres=>titres.map(t=>{const e=EXERCICES.find(x=>x.titre===t);return {theme:e.theme,niveaux:e.niveaux};}),mp.map(x=>x.exo));
  ex.forEach((e,k)=>{const auNiveau=e.niveaux.includes(nivEx);assert.equal(mp[k].voisin,!auNiveau,'niveau '+n+' : '+mp[k].exo);
   if(!auNiveau)assert.ok(ex.some((f,j)=>j<k&&f.theme===e.theme&&f.niveaux.includes(nivEx)),'niveau '+n+' : niveau voisin seulement pour un thème déjà pris');});
  assert.ok(mp.filter(x=>x.voisin).length<=1,'niveau '+n+' : au plus une semaine au niveau voisin');
  assert.equal(new Set(mp.map(x=>x.exo)).size,8,'niveau '+n+' : 8 exercices différents');
 }
 try{
  // 1. Nouvel utilisateur
  {const {ctx,page}=await ouvrir();
   await page.goto(base+'/espace.html');
   assert.match(await page.textContent('#ac-semaine'),/Choisis ton niveau de 1 à 10/,'Ta semaine : invitation à choisir son niveau');
   assert.match(await page.textContent('.bord-niv-declare'),/Pas encore choisi/);
   await page.goto(base+'/index.html');
   await page.click('.ac-accueil a');await page.waitForURL(/academie\.html#niveaux$/);
   assert.equal(await page.textContent('.ac-moi-titre'),'Choisis ton niveau pour commencer');
   assert.equal(await page.isVisible('[data-semaine-bloc]'),false,'Ta semaine masquée tant que le niveau n\u2019est pas choisi');
   await page.goto(base+'/entrainement.html');
   assert.match(await page.textContent('#mon-plan'),/Choisis ton niveau de 1 à 10/,'Mon plan : invitation sans niveau');
   await page.goto(base+'/academie.html#niveaux');
   await page.click('.ac-rapide-btn[data-choisir="2"]');
   const s=await quizComplet(page,i=>i%2===0);
   assert.equal(s.reponses.length,10);assert.match(await page.textContent('#aq-score'),/^Score : 5 sur 10$/);
   assert.equal(await page.locator('#ap .ap-bloc').count(),6);
   await verifierNiveau(page,2);
   await planGenerique(page,2);
   await page.click('#mon-plan .mp-valider[data-i="0"]');
   assert.equal(await page.isChecked('#w0'),true,'valider dans Mon plan coche le plan générique');
   assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('pa-weeks-v2:invite')).done),[0]);
   assert.equal(await page.getAttribute('#mon-plan .mp-valider[data-i="0"]','aria-pressed'),'true');
   await page.check('#w1');
   assert.equal(await page.getAttribute('#mon-plan .mp-valider[data-i="1"]','aria-pressed'),'true','cocher le plan générique met Mon plan à jour');
   await page.uncheck('#w1');
   await existantIntact(page,'nouvel utilisateur');
   await ctx.close();}
  ok('nouvel utilisateur : accueil → niveau 2 en un toucher → quiz complet → parcours (6 blocs) → défi → semaine 1 du plan validée');
  // 2. Niveaux 2, 5 et 8
  for(const n of [2,5,8]){
   const {ctx,page}=await ouvrir();
   await page.goto(base+'/academie.html');
   await page.click(`.ac-rapide-btn[data-choisir="${n}"]`);
   await quizComplet(page);
   await verifierNiveau(page,n);
   // Ta semaine : niveau, quiz, 3 priorités, 1 exercice, 1 scène du niveau, objectif = défi de la semaine
   const sem=async()=>page.evaluate(()=>({vu:!!document.querySelector('[data-semaine-bloc]:not([hidden])'),niveau:document.querySelector('.ac-semaine-niveau .ac-moi-num').textContent,
    prio:document.querySelectorAll('.ac-semaine-prio li').length,exo:!!document.querySelector('.ac-semaine-exercice details'),
    scene:(document.querySelector('.ac-semaine-scene a')||{}).getAttribute?.('href'),objectif:document.querySelector('.ac-semaine-objectif b').textContent,
    quiz:document.querySelector('.ac-semaine-quiz').textContent}));
   for(const ou of ['academie','espace']){
    if(ou==='espace')await page.goto(base+'/espace.html');
    const s=await sem();
    assert.ok(s.vu&&s.niveau===String(n)&&s.prio===3&&s.exo,ou+' : Ta semaine complète au niveau '+n+' '+JSON.stringify(s));
    const id=s.scene.replace(/^(academie\.html)?simulateur-3d-|\.html$/g,'');
    assert.ok(await page.evaluate(([id,n])=>{const x=PA_PARCOURS.scenes(ACADEMIE_QUESTIONS).find(y=>y.id===id);return x&&x.niveaux[0]<=n&&n<=x.niveaux[1];},[id,n]),ou+' : scène du niveau');
    assert.equal(s.objectif,await page.evaluate(k=>PA_DEFIS.defi(PA_DEFIS.lundi(new Date()),k).exercice.titre,n<=3?1:n<=5?2:n<=7?3:4),ou+' : objectif = défi de la semaine');
    assert.match(s.quiz,new RegExp('6 au niveau '+n));
   }
   // Tableau de bord : quatre lignes distinctes, aucune conversion
   assert.match(await page.textContent('.bord-niv-declare'),new RegExp('^Niveau déclaré \\(grille FFT 1 à 10\\)'+n+' · '));
   assert.match(await page.textContent('.bord-niv-quiz'),/sur 10/);
   assert.match(await page.textContent('.bord-niv-test'),/catégorie de tournoi estimée/);
   assert.match(await page.textContent('.bord-niv-fft'),/12\s500e/);
   assert.match(await page.textContent('#esp-exercices'),new RegExp('niveau déclaré \\('+n+' sur 10'),'Mon espace suit le niveau '+n);
   await planGenerique(page,n);
   await existantIntact(page,'niveau '+n);
   await ctx.close();
  }
  ok('joueurs de niveau 2, 5 et 8 : articles et scènes du niveau, défi au bon niveau d’exercice, Mon espace qui suit le niveau, plan générique présent');
  // 3. Connecté
  {const {ctx,page}=await ouvrir({comptes:'simules',connecte:true});
   await page.goto(base+'/espace.html');await page.waitForTimeout(400);
   assert.match(page.url(),/espace\.html$/,'connecté : Mon espace reste ouvert');
   await page.goto(base+'/academie.html');
   await page.click('.ac-rapide-btn[data-choisir="6"]');await quizComplet(page);
   // "academie" activé : Mon académie charge Supabase à la demande et envoie le niveau et le quiz dans le compte
   await page.waitForFunction(()=>(window.__ops||[]).includes('academie_quiz:upsert'),null,{timeout:10000});
   const ops=await page.evaluate(()=>window.__ops);
   assert.ok(ops.includes('academie_niveaux:upsert')&&ops.includes('academie_quiz:upsert'),'niveau et quiz envoyés : '+ops.join(', '));
   assert.ok(ops.every(o=>/^academie_/.test(o)),'aucune autre table touchée : '+ops.join(', '));
   assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('pa-academie')).niveau),6);
   await existantIntact(page,'connecté');
   await ctx.close();}
  // 4. Non connecté (comptes actifs, pas de session)
  {const {ctx,page}=await ouvrir({comptes:'simules',connecte:false});
   await page.goto(base+'/espace.html');await page.waitForURL(/connexion\.html\?suite=espace\.html$/);
   await page.goto(base+'/academie.html');
   assert.match(page.url(),/academie\.html$/,'Mon académie sans compte');
   await page.click('.ac-rapide-btn[data-choisir="3"]');
   assert.match(await page.textContent('.ac-moi-titre'),/Ton niveau déclaré : 3/);
   await existantIntact(page,'non connecté');
   await ctx.close();}
  ok('connecté : Mon espace ouvert, niveau et quiz de l’académie envoyés dans le compte (et rien d’autre) ; non connecté : Mon espace → connexion, Mon académie utilisable sans compte');
  // 5. Retour après 11 jours
  {let {ctx,page}=await ouvrir({quand:'2026-10-29T10:00:00'});
   await page.goto(base+'/academie.html');
   await page.click('.ac-rapide-btn[data-choisir="5"]');
   const s1=await quizComplet(page);
   await page.click('#ac-defi .df-releve');
   const exo=await page.getAttribute('.ap-fait >> nth=0','data-exo');
   await page.locator('.ap-exos details >> nth=0').evaluate(d=>{d.open=true;});await page.click('.ap-fait >> nth=0');
   const defi1=await page.textContent('#ac-defi h3');
   await page.goto(base+'/entrainement.html');await page.check('#w2');
   const etat=await ctx.storageState();await ctx.close();
   ({ctx,page}=await ouvrir({quand:'2026-11-09T09:00:00',etat}));
   await page.goto(base+'/academie.html');
   assert.match(await page.textContent('.ac-moi-titre'),/Ton niveau déclaré : 5/);
   assert.match(await page.textContent('#ap'),/Défis relevés : 1/);assert.match(await page.textContent('#ap'),/Exercices faits : 2/,'l’exercice coché et celui du défi relevé');
   assert.ok(await page.evaluate(id=>!!JSON.parse(localStorage.getItem('pa-exercices-faits'))[id],exo));
   assert.match(await page.textContent('#ap'),/Quiz : .*niveau 5/,'historique des quiz');
   assert.notEqual(await page.textContent('#ac-defi h3'),defi1,'nouveau défi la semaine suivante');
   assert.match(await page.textContent('#ac-defi .df-serie'),/Pas encore de série/,'semaine sautée : série perdue');
   await page.click('#aq-nouveau');
   const vues=new Set(s1.reponses.map(r=>r.id));
   assert.ok(await page.evaluate(v=>JSON.parse(localStorage.getItem('pa-academie-quiz')).enCours.questions.every(x=>!v.includes(x.id)),[...vues]),'nouveau quiz sans les questions précédentes');
   await page.goto(base+'/entrainement.html');
   assert.equal(await page.isChecked('#w2'),true,'semaine 3 du plan conservée');
   await existantIntact(page,'retour');
   await ctx.close();}
  ok('retour après 11 jours : niveau, historique des quiz, défi relevé, exercice fait et semaine du plan conservés ; nouveau défi ; quiz sans répétition');
 }finally{await browser.close();}
 assert.deepEqual(erreurs,[]);
 ok('données déjà présentes (test de niveau, classement FFT, matchs) jamais modifiées ; aucune erreur dans la console');
}

(async()=>{
 await new Promise(r=>serveur.listen(0,'127.0.0.1',r));
 try{await dansLeNavigateur('http://127.0.0.1:'+serveur.address().port);}
 finally{serveur.close();}
 console.log(nb+' vérifications réussies.');
})().catch(e=>{console.error(e);process.exitCode=1;serveur.close();});
