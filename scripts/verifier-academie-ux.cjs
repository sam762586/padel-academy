/* Vérification de l'expérience de Mon académie (phase 5) dans Edge :
   choix du niveau en un toucher au premier passage (visible sans défiler sur téléphone), puis par « Changer de niveau » ;
   sommaire de la page ; reprise d'un quiz interrompu depuis le haut de la page ; niveau changé pendant un quiz ;
   stockage bloqué (messages clairs) ; questions qui ne se chargent pas (message d'erreur, pas de page cassée) ;
   1280 / 390 / 320 px sans débordement ; console sans erreur (hors fichier volontairement absent).
   Lancer depuis la racine du site : node scripts/verifier-academie-ux.cjs */
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

async function dansLeNavigateur(base){
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const erreurs=[];
 const contexte=async(largeur,hauteur,init)=>{
  const ctx=await browser.newContext({serviceWorkers:'block',viewport:{width:largeur,height:hauteur}});
  await ctx.route('https://**',r=>r.fulfill({status:200,body:''}));
  if(init)await ctx.addInitScript(init);
  const page=await ctx.newPage();
  page.on('pageerror',e=>erreurs.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!/404|Failed to load resource/.test(m.text()))erreurs.push(m.text());});
  return {ctx,page};
 };
 const repondre=async page=>{await page.locator('.qt-reponse').first().click();await page.click('#aq-suite');};
 try{
  for(const [largeur,hauteur] of [[1280,900],[390,844],[320,700]]){
   const {ctx,page}=await contexte(largeur,hauteur);
   await page.goto(base+'/academie.html');
   // Sommaire
   assert.deepEqual(await page.$$eval('.ac-sommaire a',l=>l.map(a=>a.getAttribute('href'))),['#academie','#quiz','#parcours','#niveaux']);
   for(const a of ['academie','quiz','parcours','niveaux'])assert.equal(await page.locator('#'+a).count(),1);
   // Premier passage : 10 boutons de choix rapide, le premier visible sans défiler trop loin
   assert.equal(await page.locator('.ac-rapide .ac-rapide-btn').count(),10);
   assert.match(await page.textContent('.ac-rapide-btn >> nth=0'),/^1 Débutant$/);
   assert.match(await page.textContent('.ac-rapide-btn >> nth=9'),/^10 Élite$/);
   const y=(await page.locator('.ac-rapide-btn >> nth=0').boundingBox()).y;
   assert.ok(y<hauteur*1.6,largeur+' px : choix rapide atteint en un geste (y = '+Math.round(y)+')');
   await page.click('.ac-rapide-btn[data-choisir="7"]');
   assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('pa-academie')).niveau),7);
   assert.match(await page.textContent('.ac-moi-titre'),/Ton niveau déclaré : 7 · Avancé \+/);
   // Changer de niveau : le choix rapide est replié sous « Changer de niveau »
   await page.click('.ac-changer summary');
   assert.equal(await page.getAttribute('.ac-changer .ac-rapide-btn[data-choisir="7"]','aria-pressed'),'true');
   await page.click('.ac-changer .ac-rapide-btn[data-choisir="3"]');
   assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('pa-academie')).niveau),3);
   assert.equal(await page.locator('.ac-carte.choisi').getAttribute('data-niveau'),'3');
   // Quiz interrompu : reprise proposée en haut de la page
   await page.click('#aq-nouveau');await repondre(page);await repondre(page);
   const id=await page.evaluate(()=>{const e=JSON.parse(localStorage.getItem('pa-academie-quiz')).enCours;return e.questions[2].id;});
   await page.reload();
   assert.match(await page.textContent('.ac-reprise'),/Tu as un quiz en cours \(question 3\)/);
   await page.click('#ac-reprendre');
   assert.equal(await page.textContent('#aq-intitule'),await page.evaluate(id=>ACADEMIE_QUESTIONS.find(q=>q.id===id).question,id));
   assert.equal(await page.evaluate(()=>document.activeElement.id),'aq-intitule');
   // Niveau changé pendant le quiz : la question reste, puis l'accueil du quiz le signale
   await page.click('.ac-carte [data-choisir="6"]');
   assert.equal(await page.locator('#aq-intitule').count(),1,'la question affichée reste');
   await page.reload();
   assert.match(await page.textContent('#aq'),/Ce quiz a commencé au niveau 3 ; ton niveau déclaré est maintenant le 6\./);
   assert.equal(await page.textContent('#aq-nouveau'),'Nouveau quiz au niveau 6');
   await page.click('#aq-nouveau');
   assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('pa-academie-quiz')).enCours.niveau),6);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,largeur+' px : pas de débordement');
   await ctx.close();
  }
  ok('choix du niveau en un toucher (1280 / 390 / 320 px), « Changer de niveau », sommaire, reprise depuis le haut de la page, niveau changé pendant un quiz');
  // Stockage bloqué : messages clairs, pas de page cassée
  {const {ctx,page}=await contexte(390,844,()=>{Storage.prototype.setItem=function(){throw new Error('bloqué');};});
   await page.goto(base+'/academie.html');
   assert.match(await page.textContent('#ac-moi .msg-alerte'),/ne permet pas d'enregistrer sur cet appareil/);
   await page.click('.ac-rapide-btn[data-choisir="4"]');
   assert.match(await page.textContent('#ac-moi'),/Impossible d'enregistrer sur cet appareil/);
   await ctx.close();}
  // Questions qui ne se chargent pas : message d'erreur à la place du quiz et du parcours
  {const {ctx,page}=await contexte(1280,900);
   await page.route('**/academie-questions.js*',r=>r.fulfill({status:404,body:''}));
   await page.goto(base+'/academie.html');
   await page.click('.ac-rapide-btn[data-choisir="5"]');
   assert.match(await page.textContent('#aq'),/Les questions n'ont pas pu se charger/);
   assert.match(await page.textContent('#ap'),/Ton parcours n'a pas pu se charger/);
   assert.match(await page.textContent('.ac-moi-titre'),/Ton niveau déclaré : 5/,'le choix du niveau marche toujours');
   await ctx.close();}
  ok('stockage bloqué et questions indisponibles : messages clairs, choix du niveau toujours possible');
 }finally{await browser.close();}
 assert.deepEqual(erreurs,[]);
 ok('aucune erreur dans la console');
}

(async()=>{
 await new Promise(r=>serveur.listen(0,'127.0.0.1',r));
 try{await dansLeNavigateur('http://127.0.0.1:'+serveur.address().port);}
 finally{serveur.close();}
 console.log(nb+' vérifications réussies.');
})().catch(e=>{console.error(e);process.exitCode=1;serveur.close();});
