/* Vérification du menu et de l'identité (scripts/gabarit.js, assets/js/nav.js) :
   1) gabarit : 6 entrées (Accueil, Apprendre, S'entraîner, Tactique 3D, Compétition, Mon espace) + bouton raquette, chaque page du menu
      existe, page et groupe actifs marqués, aucune page de contenu oubliée ;
   2) ordinateur (900, 1024, 1280 px) : menu sur une ligne, groupes au clic, un seul ouvert, Échap (focus rendu), clic ailleurs,
      parcours complet au clavier ;
   3) mobile (390 px, et 320 px) : hamburger, groupe de la page en cours déplié, accordéon, panneau opaque, Échap ferme et rend
      le focus, aucun débordement ;
   4) sans nav.js : liens visibles et utilisables (mobile et ordinateur) ;
   5) accessibilité : zones qui défilent atteignables au clavier, liens du pied de page ≥ 24 px, liste du compteur stylée ;
   6) toutes les pages : au plus une page active, aucune erreur console.
   Lancer depuis la racine du site : node scripts/verifier-menu.cjs */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const G=require('./gabarit');
const racine=path.join(__dirname,'..');
let nb=0;
function ok(nom){nb++;console.log('OK '+nom);}
process.on('unhandledRejection',e=>{if(e&&e.name==='TargetClosedError')return;console.error(e);process.exitCode=1;});

function gabarit(){
 G.PAGES_MENU.forEach(([href])=>assert.ok(fs.existsSync(path.join(racine,href)),href));
 assert.equal(new Set(G.PAGES_MENU.map(p=>p[0])).size,G.PAGES_MENU.length);
 const entrees=G.MENU.map(e=>Array.isArray(e)?e[1]:e.nom);
 assert.deepEqual(entrees,['Accueil','Apprendre','S\'entraîner','Tactique 3D','Compétition','Mon espace']);
 assert.deepEqual(G.APPEL,['materiel.html#raquette','Choisir sa raquette','Raquette']);
 const html=G.nav('bareme.html');
 assert.equal((html.match(/aria-current="page"/g)||[]).length,1);
 assert.match(html,/class="nav-titre active"[^>]*aria-controls="nav-competition"/);
 assert.equal((G.nav('espace.html').match(/nav-titre active/g)||[]).length,0);
 assert.match(G.nav('index.html'),/href="index\.html" class="active" aria-current="page">Accueil/);
 assert.match(G.nav('404.html','/'),/href="\/index\.html"/);
 // Pages de contenu absentes du menu : seulement les pages de service, et les pages rattachées à une entrée (SECTIONS)
 const hors=fs.readdirSync(racine).filter(n=>n.endsWith('.html')&&!G.PAGES_MENU.some(p=>p[0]===n)&&!/^simulateur-3d-/.test(n));
 // Pages de scénario du simulateur 3D : rattachées à l'entrée « Tactique 3D », aucun groupe marqué
 assert.match(G.nav('simulateur-3d-vibora.html'),/href="simulateur-3d\.html" class="active">Tactique 3D/);
 assert.equal((G.nav('simulateur-3d-vibora.html').match(/nav-titre active/g)||[]).length,0);
 assert.deepEqual(hors.sort(),['404.html','compte.html','confidentialite.html','connexion.html','hors-ligne.html','mentions-legales.html']);
 // Simulateur 3D : entrée principale « Tactique 3D », marquée comme page en cours
 assert.match(G.nav('simulateur-3d.html'),/href="simulateur-3d\.html" class="active" aria-current="page">Tactique 3D/);
 ok('gabarit : Accueil, Apprendre, S\'entraîner, Tactique 3D, Compétition, Mon espace + bouton raquette ; pages actives ; aucune page oubliée');
}

const serveur=http.createServer((req,res)=>{
 const rel=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\//,'')||'index.html';
 const p=path.resolve(racine,rel);
 if(!p.startsWith(racine+path.sep)){res.writeHead(403);res.end();return;}
 fs.readFile(p,(e,b)=>{if(e){res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.webp':'image/webp','.webmanifest':'application/manifest+json'})[path.extname(p)]||'text/plain');res.end(b);
 });
});
async function contexte(browser,options,sansNav){
 const ctx=await browser.newContext({serviceWorkers:'block',...options});
 await ctx.route('**/supabase-js@*/**',r=>r.fulfill({contentType:'text/javascript',body:''}));
 await ctx.route('https://gc.zgo.at/**',r=>r.fulfill({contentType:'text/javascript',body:''}));
 if(sansNav) await ctx.route('**/assets/js/nav.js*',r=>r.abort('failed'));
 return ctx;
}
(async()=>{
 gabarit();
 await new Promise(r=>serveur.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+serveur.address().port;
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const erreurs=[];
 const suivre=page=>{page.on('pageerror',e=>erreurs.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource|net::ERR_FAILED/.test(m.text()))erreurs.push(m.text());});};
 try{
  // ---- Ordinateur ----
  for(const largeur of [900,1024,1280]){
   const ctx=await contexte(browser,{viewport:{width:largeur,height:800}});
   const page=await ctx.newPage();suivre(page);
   await page.goto(base+'/bareme.html');
   const hauteur=await page.evaluate(()=>document.querySelector('.nav').getBoundingClientRect().height);
   assert.ok(hauteur<80,'menu sur une ligne à '+largeur+' px ('+hauteur+')');
   await ctx.close();
  }
  ok('ordinateur : menu sur une seule ligne à 900, 1024 et 1280 px');
  let ctx=await contexte(browser,{viewport:{width:1280,height:800}});
  let page=await ctx.newPage();suivre(page);
  await page.goto(base+'/bareme.html');
  const titre=n=>page.locator('.nav-titre',{hasText:n});
  assert.equal(await page.locator('#nav-competition').isVisible(),false);
  await titre('Compétition').click();
  assert.equal(await titre('Compétition').getAttribute('aria-expanded'),'true');
  assert.equal(await page.locator('#nav-competition').isVisible(),true);
  await titre('Apprendre').click();
  assert.equal(await titre('Compétition').getAttribute('aria-expanded'),'false');
  assert.equal(await page.locator('#nav-apprendre a',{hasText:'Lexique'}).isVisible(),true);
  ok('ordinateur : groupe ouvert au clic, un seul à la fois');
  await page.keyboard.press('Escape');
  assert.equal(await titre('Apprendre').getAttribute('aria-expanded'),'false');
  assert.equal(await page.evaluate(()=>document.activeElement.textContent),'Apprendre');
  await titre('S\'entraîner').click();await page.mouse.click(600,600);
  assert.equal(await titre('S\'entraîner').getAttribute('aria-expanded'),'false');
  ok('ordinateur : Échap ferme et rend le focus, clic ailleurs ferme');
  // Parcours au clavier seul : Tab jusqu'à « S'entraîner », Entrée, Tab jusqu'à « Mon niveau », Entrée
  await page.goto(base+'/bareme.html');await page.mouse.move(5,700);
  let essais=0;
  while(await page.evaluate(()=>document.activeElement.textContent.trim())!=='S\'entraîner'&&essais++<20)await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  assert.equal(await titre('S\'entraîner').getAttribute('aria-expanded'),'true');
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(()=>document.activeElement.textContent.trim()),'Mon niveau');
  await page.keyboard.press('Enter');
  await page.waitForURL(/niveau\.html$/);
  assert.equal(await page.locator('.nav-titre.active').textContent(),'S\'entraîner');
  assert.equal(await page.locator('a[aria-current="page"]').textContent(),'Mon niveau');
  ok('ordinateur : navigation complète au clavier, groupe et page actifs à l\'arrivée');
  // Accueil actif sur l'accueil
  await page.goto(base+'/index.html');
  assert.equal(await page.locator('#nav-menu a[aria-current="page"]').textContent(),'Accueil');
  await ctx.close();
  // ---- Mobile ----
  ctx=await contexte(browser,{viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  page=await ctx.newPage();suivre(page);
  await page.goto(base+'/bareme.html');
  assert.equal(await page.locator('#nav-menu').isVisible(),false);
  await page.click('.nav-toggle');
  assert.equal(await page.locator('#nav-menu').isVisible(),true);
  assert.equal(await page.getAttribute('.nav-toggle','aria-label'),'Fermer le menu');
  assert.equal(await page.locator('.nav-titre',{hasText:'Compétition'}).getAttribute('aria-expanded'),'true');
  assert.equal(await page.locator('#nav-apprendre').isVisible(),false);
  assert.equal(await page.evaluate(()=>getComputedStyle(document.getElementById('nav-menu')).backgroundColor),'rgb(16, 31, 53)');
  await page.locator('.nav-titre',{hasText:'Apprendre'}).click();
  assert.equal(await page.locator('#nav-apprendre').isVisible(),true);
  assert.equal(await page.locator('#nav-competition').isVisible(),false);
  // Cibles tactiles confortables dans le panneau
  const petites=await page.evaluate(()=>[...document.querySelectorAll('#nav-menu a,#nav-menu button')].filter(e=>e.offsetParent).filter(e=>e.getBoundingClientRect().height<44).map(e=>e.textContent));
  assert.deepEqual(petites,[]);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#nav-menu').isVisible(),false);
  assert.ok(await page.evaluate(()=>document.activeElement.classList.contains('nav-toggle')));
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),390);
  ok('mobile : groupe de la page en cours déplié, accordéon, cibles ≥ 44 px, Échap ferme et rend le focus, aucun débordement');
  await page.click('.nav-toggle');await page.locator('.nav-titre',{hasText:'Apprendre'}).click();
  await page.locator('#nav-apprendre a',{hasText:'Règles'}).click();
  await page.waitForURL(/regles\.html$/);
  assert.equal(await page.locator('#nav-menu').isVisible(),false);
  ok('mobile : un lien ferme le menu et ouvre la page');
  await ctx.close();
  ctx=await contexte(browser,{viewport:{width:320,height:640},isMobile:true,hasTouch:true});
  page=await ctx.newPage();suivre(page);
  for(const f of ['index.html','tournois.html','score.html','espace.html']){await page.goto(base+'/'+f);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),320,f);}
  await ctx.close();
  ok('320 px : aucun débordement (accueil, tournois, compteur, espace)');
  // ---- Sans nav.js ----
  ctx=await contexte(browser,{viewport:{width:390,height:844},isMobile:true,hasTouch:true},true);
  page=await ctx.newPage();
  await page.goto(base+'/technique.html');
  assert.equal(await page.evaluate(()=>document.documentElement.classList.contains('nav-js')),false);
  assert.equal(await page.locator('#nav-menu').isVisible(),true);
  assert.equal(await page.locator('.nav-toggle').isVisible(),false);
  assert.equal(await page.locator('#nav-competition a',{hasText:'Trouver un tournoi'}).isVisible(),true);
  await page.locator('#nav-competition a',{hasText:'Trouver un tournoi'}).click();
  await page.waitForURL(/tournois\.html$/);
  await ctx.close();
  ctx=await contexte(browser,{viewport:{width:1280,height:800}},true);
  page=await ctx.newPage();
  await page.goto(base+'/technique.html');
  await page.focus('.nav-titre:has-text("Compétition")');
  assert.equal(await page.locator('#nav-competition').isVisible(),true);
  await ctx.close();
  ok('sans nav.js : menu visible et utilisable sur mobile, groupes ouverts au clavier sur ordinateur');
  // ---- Accessibilité ----
  ctx=await contexte(browser,{viewport:{width:390,height:844},isMobile:true});
  page=await ctx.newPage();suivre(page);
  await page.goto(base+'/bareme.html');await page.waitForTimeout(400);
  const zones=await page.evaluate(()=>[...document.querySelectorAll('.tbl,.acc-scroll')].map(z=>({t:z.getAttribute('tabindex'),r:z.getAttribute('role'),n:z.getAttribute('aria-label')})));
  assert.ok(zones.length>0);zones.forEach(z=>{assert.equal(z.t,'0');assert.equal(z.r,'region');assert.ok(z.n&&z.n.length>2);});
  const pied=await page.evaluate(()=>[...document.querySelectorAll('footer a')].map(a=>a.getBoundingClientRect().height));
  assert.ok(pied.every(h=>h>=24),pied.join(','));
  await page.goto(base+'/score.html');
  const s=await page.evaluate(()=>{const c=getComputedStyle(document.getElementById('sc-type'));return {h:parseFloat(c.height),w:document.getElementById('sc-type').getBoundingClientRect().width,parent:document.getElementById('sc-type').parentElement.getBoundingClientRect().width};});
  assert.ok(s.h>=48&&Math.abs(s.w-s.parent)<2,JSON.stringify(s));
  await ctx.close();
  ok('accessibilité : tableaux atteignables au clavier et nommés, liens du pied ≥ 24 px, liste du compteur stylée');
  // ---- Toutes les pages ----
  ctx=await contexte(browser,{viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  page=await ctx.newPage();suivre(page);
  for(const f of fs.readdirSync(racine).filter(n=>n.endsWith('.html')&&n!=='404.html')){
   await page.goto(base+'/'+f);
   assert.ok(await page.locator('#nav-menu a[aria-current="page"]').count()<=1,f);
   assert.equal(await page.locator('.brand').textContent(),'Apprendre Padel',f);
  }
  await ctx.close();
  ok('toutes les pages : marque « Apprendre Padel », au plus une page active');
  assert.deepEqual(erreurs,[]);
  ok('aucune erreur console');
  console.log('TOTAL '+nb+' contrôles réussis.');
 }finally{await browser.close();serveur.close();}
})().catch(e=>{console.error(e);serveur.close();process.exitCode=1;});
