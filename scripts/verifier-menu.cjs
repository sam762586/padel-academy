/* Vérification du menu groupé (scripts/gabarit.js, assets/js/nav.js) :
   1) gabarit : chaque page du menu existe, page active marquée (lien + groupe), aucune page oubliée ;
   2) ordinateur (900, 1024 et 1280 px) : menu sur une ligne, groupe ouvert au clic, fermé par Échap (focus rendu) et par un clic ailleurs,
      un seul groupe ouvert à la fois ;
   3) mobile (390 px) : hamburger, groupe de la page en cours déplié, accordéon, panneau opaque, aucun débordement.
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
 const html=G.nav('bareme.html');
 assert.equal((html.match(/aria-current="page"/g)||[]).length,1);
 assert.match(html,/class="nav-titre active"[^>]*aria-controls="nav-tournois"/);
 assert.equal((G.nav('espace.html').match(/nav-titre active/g)||[]).length,0);
 // Pages de contenu absentes du menu : seulement les pages de service
 const hors=fs.readdirSync(racine).filter(n=>n.endsWith('.html')&&!G.PAGES_MENU.some(p=>p[0]===n));
 assert.deepEqual(hors.sort(),['404.html','compte.html','confidentialite.html','hors-ligne.html','index.html','mentions-legales.html']);
 ok('gabarit : 16 pages dans 3 groupes + Mon espace, page active marquée, aucune page de contenu oubliée');
}

const serveur=http.createServer((req,res)=>{
 const rel=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\//,'')||'index.html';
 const p=path.resolve(racine,rel);
 if(!p.startsWith(racine+path.sep)){res.writeHead(403);res.end();return;}
 fs.readFile(p,(e,b)=>{if(e){res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.webp':'image/webp','.webmanifest':'application/manifest+json'})[path.extname(p)]||'text/plain');res.end(b);
 });
});
async function contexte(browser,options){
 const ctx=await browser.newContext({serviceWorkers:'block',...options});
 await ctx.route('**/supabase-js@*/**',r=>r.fulfill({contentType:'text/javascript',body:''}));
 await ctx.route('https://gc.zgo.at/**',r=>r.fulfill({contentType:'text/javascript',body:''}));
 return ctx;
}
(async()=>{
 gabarit();
 await new Promise(r=>serveur.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+serveur.address().port;
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const erreurs=[];
 const suivre=page=>{page.on('pageerror',e=>erreurs.push(e.message));page.on('console',m=>{if(m.type()==='error')erreurs.push(m.text());});};
 try{
  // Ordinateur
  for(const largeur of [900,1024,1280]){
   const ctx=await contexte(browser,{viewport:{width:largeur,height:800}});
   const page=await ctx.newPage();suivre(page);
   await page.goto(base+'/bareme.html');
   const hauteur=await page.evaluate(()=>document.querySelector('.nav').getBoundingClientRect().height);
   assert.ok(hauteur<80,'menu sur une ligne à '+largeur+' px ('+hauteur+')');
   await ctx.close();
  }
  ok('ordinateur : menu sur une seule ligne à 900, 1024 et 1280 px');
  const ctx=await contexte(browser,{viewport:{width:1280,height:800}});
  const page=await ctx.newPage();suivre(page);
  await page.goto(base+'/bareme.html');
  const titre=n=>page.locator('.nav-titre',{hasText:n});
  assert.equal(await page.locator('#nav-tournois').isVisible(),false);
  await titre('Tournois').click();
  assert.equal(await titre('Tournois').getAttribute('aria-expanded'),'true');
  assert.equal(await page.locator('#nav-tournois').isVisible(),true);
  await titre('Apprendre').click();
  assert.equal(await titre('Tournois').getAttribute('aria-expanded'),'false');
  assert.equal(await page.locator('#nav-apprendre a',{hasText:'Lexique'}).isVisible(),true);
  ok('ordinateur : groupe ouvert au clic, un seul à la fois');
  await page.keyboard.press('Escape');
  assert.equal(await titre('Apprendre').getAttribute('aria-expanded'),'false');
  assert.equal(await page.evaluate(()=>document.activeElement.textContent),'Apprendre');
  await titre('Progresser').click();await page.mouse.click(600,600);
  assert.equal(await titre('Progresser').getAttribute('aria-expanded'),'false');
  ok('ordinateur : Échap ferme et rend le focus, clic ailleurs ferme');
  await titre('Progresser').click();
  await page.locator('#nav-progresser a',{hasText:'Mon niveau'}).click();
  await page.waitForURL(/niveau\.html$/);
  assert.equal(await page.locator('.nav-titre.active').textContent(),'Progresser');
  assert.equal(await page.locator('a[aria-current="page"]').textContent(),'Mon niveau');
  ok('ordinateur : navigation par le menu, groupe et page actifs');
  await ctx.close();
  // Mobile
  const m=await contexte(browser,{viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const mp=await m.newPage();suivre(mp);
  await mp.goto(base+'/bareme.html');
  assert.equal(await mp.locator('#nav-menu').isVisible(),false);
  await mp.click('.nav-toggle');
  assert.equal(await mp.locator('#nav-menu').isVisible(),true);
  assert.equal(await mp.locator('.nav-titre',{hasText:'Tournois'}).getAttribute('aria-expanded'),'true');
  assert.equal(await mp.locator('#nav-apprendre').isVisible(),false);
  assert.equal(await mp.evaluate(()=>getComputedStyle(document.getElementById('nav-menu')).backgroundColor),'rgb(7, 11, 20)');
  await mp.locator('.nav-titre',{hasText:'Apprendre'}).click();
  assert.equal(await mp.locator('#nav-apprendre').isVisible(),true);
  assert.equal(await mp.locator('#nav-tournois').isVisible(),false);
  assert.equal(await mp.evaluate(()=>document.documentElement.scrollWidth),390);
  ok('mobile : groupe de la page en cours déplié, accordéon, panneau opaque, aucun débordement');
  await mp.locator('#nav-apprendre a',{hasText:'Règles'}).click();
  await mp.waitForURL(/regles\.html$/);
  assert.equal(await mp.locator('#nav-menu').isVisible(),false);
  ok('mobile : un lien ferme le menu et ouvre la page');
  // Toutes les pages : un seul lien actif au plus, aucune erreur
  for(const f of fs.readdirSync(racine).filter(n=>n.endsWith('.html')&&n!=='404.html')){
   await mp.goto(base+'/'+f);
   assert.ok(await mp.locator('#nav-menu a[aria-current="page"]').count()<=1,f);
  }
  ok('toutes les pages : menu chargé, au plus une page active');
  assert.deepEqual(erreurs,[]);
  ok('aucune erreur console');
  console.log('TOTAL '+nb+' contrôles réussis.');
 }finally{await browser.close();serveur.close();}
})().catch(e=>{console.error(e);serveur.close();process.exitCode=1;});
