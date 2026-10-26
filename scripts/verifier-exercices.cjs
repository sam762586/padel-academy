/* Vérification des exercices recommandés (espace joueur) :
   1) données (exercices-donnees.js) : 30 exercices, 3 par thème, niveaux couverts, liens internes valides ;
   2) moteur : thèmes tirés du test de niveau et des points perdus en match, seuils, choix selon le niveau ;
   3) navigateur : carte sans données, avec test et matchs, « Je l'ai fait », test passé sur niveau.html gardé.
   Lancer depuis la racine du site : node scripts/verifier-exercices.cjs */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),vm=require('node:vm');
const {chromium}=require('playwright');
const racine=path.join(__dirname,'..');
let nb=0;
function ok(nom){nb++;console.log('OK '+nom);}
process.on('unhandledRejection',e=>{if(e&&e.name==='TargetClosedError')return;console.error(e);process.exitCode=1;});
const THEMES=['vitre','service','aerien','couple','placement','montee','regularite','transition','communication','compet'];
const MOTIFS=['faute','gagnant','smash','volee','lob','vitre','double'];

function moteur(){
 const bac={window:{},document:{getElementById:()=>null,addEventListener(){}}};
 vm.runInNewContext(fs.readFileSync(path.join(racine,'assets/js/exercices-donnees.js'),'utf8')+';this.__E=EXERCICES;this.__M=MOTIF_VERS_THEME;this.__X=MOTIF_EXPLICATION;',bac);
 vm.runInNewContext(fs.readFileSync(path.join(racine,'assets/js/exercices.js'),'utf8'),bac);
 const E=JSON.parse(JSON.stringify(bac.__E)),M=bac.__M,X=bac.__X,P=bac.window.PA_EXERCICES;
 // Données
 assert.equal(E.length,30);
 assert.equal(new Set(E.map(e=>e.id)).size,30);
 THEMES.forEach(t=>{
  const l=E.filter(e=>e.theme===t);assert.equal(l.length,3,t);
  assert.ok(l.some(e=>e.niveaux.some(n=>n<=2))&&l.some(e=>e.niveaux.some(n=>n>=3)),'niveaux '+t);
 });
 E.forEach(e=>{
  assert.ok(['seul','à 2','à 4'].includes(e.joueurs),e.id);assert.ok(e.titre&&e.consigne&&e.reussite&&e.duree,e.id);
  if(e.lien){const [f,ancre]=e.lien.split('#');const html=fs.readFileSync(path.join(racine,f),'utf8');if(ancre)assert.ok(html.includes('id="'+ancre+'"'),'ancre '+e.lien);}
 });
 assert.ok(E.filter(e=>e.joueurs==='seul').length>=6);
 MOTIFS.forEach(m=>{assert.ok(THEMES.includes(M[m]),'motif '+m);assert.ok(typeof X[m]==='string'&&X[m].length>5,'explication '+m);});
 ok('données : 30 exercices, 3 par thème, niveaux couverts, liens valides, 7 motifs reliés à un thème');
 // Moteur : test de niveau
 const quiz={niveau:2,reponses:THEMES.map(t=>({theme:t,pts:t==='vitre'?0:t==='service'?1:3}))};
 let r=JSON.parse(JSON.stringify(P.themesPrioritaires(quiz,[])));
 assert.deepEqual(r.map(x=>x.theme),['vitre','service']);
 assert.match(r[0].raisons[0],/0 point sur 3/);
 // Moteur : matchs (faute directe = 75 % des points perdus) + seuil de 5 points
 const matchs=[{pointsTotal:20,motifsPerdus:{faute:4,smash:1}},{pointsTotal:15,motifsPerdus:{faute:2,smash:1,lob:4}}];
 r=JSON.parse(JSON.stringify(P.themesPrioritaires(null,matchs)));
 assert.equal(r.length,1);assert.equal(r[0].theme,M.faute);assert.match(r[0].raisons[0],/50 % des points perdus/);
 // lob : 4 points seulement -> ignoré ; smash : 2 points -> ignoré
 // Matchs non comptés (saisis après coup) : ignorés
 assert.equal(P.themesPrioritaires(null,[{pointsTotal:0,motifsPerdus:{}}]).length,0);
 ok('moteur : points faibles du test, motifs de points perdus avec seuils, matchs saisis ignorés');
 // Choix selon le niveau
 THEMES.forEach(t=>[1,2,3,4].forEach(n=>{const l=P.exercicesPour(t,n);assert.equal(l.length,2);assert.ok(l.some(e=>e.niveaux.includes(n))||!E.some(e=>e.theme===t&&e.niveaux.includes(n)),t+' '+n);}));
 ok('choix : 2 exercices par thème, adaptés au niveau quand il y en a');
}

const serveur=http.createServer((req,res)=>{
 const rel=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\//,'')||'index.html';
 const p=path.resolve(racine,rel);
 if(!p.startsWith(racine+path.sep)){res.writeHead(403);res.end();return;}
 fs.readFile(p,(e,b)=>{if(e){res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.webp':'image/webp','.webmanifest':'application/manifest+json'})[path.extname(p)]||'text/plain');res.end(b);
 });
});
(async()=>{
 moteur();
 await new Promise(r=>serveur.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+serveur.address().port;
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const erreurs=[];
 try{
  const ctx=await browser.newContext({serviceWorkers:'block',viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await ctx.route('**/supabase-js@*/**',r=>r.fulfill({contentType:'text/javascript',body:''}));
  await ctx.route('https://gc.zgo.at/**',r=>r.fulfill({contentType:'text/javascript',body:''}));
  const page=await ctx.newPage();
  page.on('pageerror',e=>erreurs.push(e.message));
  page.on('console',m=>{if(m.type()==='error')erreurs.push(m.text());});
  page.on('response',r=>{if(r.status()>=400&&r.url().startsWith(base))erreurs.push(r.status()+' '+r.url());});
  await page.goto(base+'/espace.html');
  assert.match(await page.textContent('#esp-exercices'),/Passe le test de niveau/);
  assert.equal(await page.locator('#esp-exercices .ex-carte').count(),3);
  ok('sans données : invitation au test et au compteur, 3 exercices de base');
  // Test de niveau passé sur niveau.html : gardé sur l'appareil
  await page.goto(base+'/niveau.html');
  for(let i=0;i<10;i++){await page.locator('#qopts .qopt').first().click();}
  await page.waitForSelector('#qresult:not([hidden])');
  const q=await page.evaluate(()=>JSON.parse(localStorage.getItem('pa-quiz-dernier')));
  assert.equal(q.reponses.length,10);assert.equal(q.niveau,1);
  ok('test de niveau : dernier résultat gardé sur l\'appareil');
  // Espace : 3 thèmes (toutes les réponses à 0 -> priorité par ordre alphabétique à égalité), exercices de niveau 1
  await page.goto(base+'/espace.html');
  assert.equal(await page.locator('#esp-exercices .ex-theme').count(),3);
  assert.match(await page.textContent('#esp-exercices'),/niveau 1 sur 4/);
  assert.match(await page.textContent('#esp-exercices .ex-raisons'),/0 point sur 3/);
  // Matchs comptés : 8 points perdus sur faute directe -> régularité en tête
  await page.evaluate(()=>{
   const pts=[...Array(8)].map(()=>({g:1,m:'faute'})).concat([...Array(4)].map(()=>({g:0,m:'gagnant'})));
   localStorage.setItem('pa-quiz-dernier',JSON.stringify({date:new Date().toISOString(),score:27,niveau:4,reponses:['vitre','service','aerien','couple','placement','montee','regularite','transition','communication','compet'].map(t=>({theme:t,pts:3}))}));
   localStorage.setItem('pa-score-historique',JSON.stringify([{cle:'match-test-01',config:{nomA:'Nous',nomB:'Eux',serveur:0,egalite:'decisif',dernierSet:'super'},points:pts,fin:new Date().toISOString(),score:'',vainqueur:null,interrompu:true}]));
  });
  await page.reload();
  const texte=await page.textContent('#esp-exercices');
  assert.match(texte,/100 % des points perdus/);assert.match(texte,/niveau 4 sur 4/);
  assert.equal(await page.locator('#esp-exercices .ex-theme').count(),1);
  ok('matchs comptés : thème tiré des fautes directes, niveau 4 appliqué');
  // Je l'ai fait
  const b=page.locator('#esp-exercices .ex-fait').first();
  await b.click();
  assert.equal(await page.locator('#esp-exercices .ex-fait').first().getAttribute('aria-pressed'),'true');
  await page.reload();
  assert.match(await page.locator('#esp-exercices .ex-fait').first().textContent(),/Fait le/);
  ok('« Je l\'ai fait » gardé sur l\'appareil');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),390);
  ok('aucun débordement à 390 px');
  assert.deepEqual(erreurs,[]);
  ok('aucune erreur console ni ressource manquante');
  console.log('TOTAL '+nb+' contrôles réussis.');
 }finally{await browser.close();serveur.close();}
})().catch(e=>{console.error(e);serveur.close();process.exitCode=1;});
