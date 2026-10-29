/* Vérification de l'accueil orienté profils (index.html) :
   1) structure : promesse, « Commencer à apprendre » → #parcours, 3 profils avec leur action principale et leurs étapes,
      outils gratuits, progression, contenus, auteur ; titres h1 unique / h2 de section ; description à jour ;
   2) liens : chaque lien interne mène à une page existante (ancre comprise) ; aucun lien important ne disparaît ;
   3) navigateur : actions au clavier, ancre « Commencer à apprendre », mobile 390 et 320 px sans débordement,
      ordinateur 1366 px, bloc tournois toujours présent, aucune erreur console.
   Lancer depuis la racine du site : node scripts/verifier-profils.cjs */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const racine=path.join(__dirname,'..');
let nb=0;
function ok(nom){nb++;console.log('OK '+nom);}
process.on('unhandledRejection',e=>{if(e&&e.name==='TargetClosedError')return;console.error(e);process.exitCode=1;});

const html=fs.readFileSync(path.join(racine,'index.html'),'utf8');
// Liens que l'accueil doit toujours proposer (pages de contenu, outils, espace)
const INDISPENSABLES=['regles.html','technique.html','tactique.html','tutos.html','conseils.html','niveau.html','entrainement.html','score.html','videos.html',
 'materiel.html','materiel.html#raquette','competition.html','bareme.html','tournois.html','partenaires.html','lexique.html','espace.html'];
const PROFILS=[['debutant','Commencer à apprendre','regles.html'],['intermediaire','Passer le test de niveau','niveau.html'],['competiteur','Préparer mes compétitions','tournois.html']];

const serveur=http.createServer((req,res)=>{
 const rel=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\//,'')||'index.html';
 const p=path.resolve(racine,rel);
 if(!p.startsWith(racine+path.sep)){res.writeHead(403);res.end();return;}
 fs.readFile(p,(e,b)=>{if(e){res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.webp':'image/webp','.webmanifest':'application/manifest+json'})[path.extname(p)]||'text/plain');res.end(b);
 });
});
(async()=>{
 // 1. Structure
 assert.equal((html.match(/<h1\b/g)||[]).length,1);
 assert.match(html,/<a class="btn primary" href="#parcours">Commencer à apprendre<\/a>/);
 assert.match(html,/<meta name="description" content="Apprendre le padel gratuitement[^"]*parcours[^"]*">/);
 for(const id of ['parcours-titre','pdt-titre','outils-titre','progression-titre','contenus-titre','auteur-titre'])assert.match(html,new RegExp('<h2 id="'+id+'"'),id);
 PROFILS.forEach(([cle,appel,cible])=>{
  const bloc=html.slice(html.indexOf('profil-'+cle+'"'),html.indexOf('</article>',html.indexOf('profil-'+cle+'"')));
  assert.ok(bloc.includes('href="'+cible+'">'+appel+'</a>'),cle);
  assert.equal((bloc.match(/<li><a href=/g)||[]).length,5,cle+' : 5 étapes');
 });
 assert.ok(!/\b\d+\s?%|\b\d+ joueurs|témoign/i.test(html.replace(/<script[\s\S]*?<\/script>/g,'')),'pas de statistique ni de témoignage inventés');
 ok('structure : promesse et appel principal, 3 profils (action + 5 étapes), outils, progression, contenus, auteur ; un seul h1');
 // 2. Liens
 const liens=[...new Set([...html.matchAll(/href="([^"]+)"/g)].map(m=>m[1].replace(/&amp;/g,'&')))].filter(h=>!/^(https?:|mailto:|#)/.test(h)&&!h.startsWith('assets/')&&!/\.(png|webmanifest)$/.test(h));
 for(const h of liens){
  const [fichier,ancre]=h.split('?')[0].split('#');
  assert.ok(fs.existsSync(path.join(racine,fichier)),'page manquante : '+h);
  if(ancre)assert.ok(fs.readFileSync(path.join(racine,fichier),'utf8').includes('id="'+ancre+'"'),'ancre manquante : '+h);
 }
 INDISPENSABLES.forEach(h=>assert.ok(liens.includes(h),'lien disparu : '+h));
 ok('liens : '+liens.length+' liens internes valides (pages et ancres), aucun lien important disparu');

 await new Promise(r=>serveur.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+serveur.address().port;
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const erreurs=[];
 const ouvrir=async(vp,mobile)=>{
  const ctx=await browser.newContext({serviceWorkers:'block',viewport:vp,isMobile:mobile,hasTouch:mobile});
  await ctx.route(/^https:/,r=>r.fulfill({body:''}));
  const page=await ctx.newPage();
  page.on('pageerror',e=>erreurs.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))erreurs.push(m.text());});
  await page.goto(base+'/index.html');
  return {ctx,page};
 };
 try{
  // 3. Clavier : depuis le haut, Tab atteint « Commencer à apprendre », Entrée amène aux profils
  let {ctx,page}=await ouvrir({width:1366,height:900},false);
  let n=0;
  while(await page.evaluate(()=>document.activeElement.textContent.trim())!=='Commencer à apprendre'&&n++<40)await page.keyboard.press('Tab');
  assert.ok(n<40,'bouton atteint au clavier');
  await page.keyboard.press('Enter');
  await page.waitForFunction(()=>location.hash==='#parcours');
  // Défilement doux (scroll-behavior) : on attend la fin, la section arrive sous le menu fixe (scroll-padding-top)
  await page.waitForFunction(()=>{const t=document.getElementById('parcours').getBoundingClientRect().top;return t>=-5&&t<200;},null,{timeout:5000}).catch(()=>{});
  const haut=await page.evaluate(()=>document.getElementById('parcours').getBoundingClientRect().top);
  assert.ok(haut>=-5&&haut<200,'section parcours en haut de l\'écran ('+haut+')');
  // Chaque action principale de profil est atteignable au clavier et mène à la bonne page
  for(const [cle,appel,cible] of PROFILS){
   const bouton=page.locator('.profil-'+cle+' a.btn');
   await bouton.focus();
   assert.equal(await page.evaluate(()=>document.activeElement.textContent),appel);
   const [r]=await Promise.all([page.waitForNavigation(),page.keyboard.press('Enter')]);
   assert.ok(page.url().endsWith('/'+cible),cle+' → '+page.url());
   await page.goBack();
  }
  ok('clavier : « Commencer à apprendre » amène aux profils ; chaque action de profil s\'ouvre au clavier sur la bonne page');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),1366);
  assert.equal(await page.locator('.profils .profil').count(),3);
  const colonnes=await page.evaluate(()=>getComputedStyle(document.querySelector('.profils')).gridTemplateColumns.split(' ').length);
  assert.equal(colonnes,3);
  await ctx.close();
  ok('ordinateur 1366 px : 3 profils côte à côte, aucun débordement');
  for(const largeur of [390,320]){
   ({ctx,page}=await ouvrir({width:largeur,height:800},true));
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),largeur);
   assert.equal(await page.locator('.hero .hero-photo').isVisible(),false);
   assert.equal(await page.locator('.home-grid .card p').first().isVisible(),false);
   assert.ok(await page.locator('#pres-de-chez-toi').isVisible());
   const hauteur=await page.evaluate(()=>document.documentElement.scrollHeight);
   // Accueil v3 : la vitrine du simulateur 3D ajoute une section (environ 600 px sur mobile)
   if(largeur===390)assert.ok(hauteur<9000,'accueil sans rallongement imprévu ('+hauteur+' px)');
   await ctx.close();
  }
  ok('mobile 390 et 320 px : aucun débordement, cartes compactes, bloc tournois présent, hauteur maîtrisée');
  assert.deepEqual(erreurs,[]);
  ok('aucune erreur console');
  console.log('TOTAL '+nb+' contrôles réussis.');
 }finally{await browser.close();serveur.close();}
})().catch(e=>{console.error(e);serveur.close();process.exitCode=1;});
