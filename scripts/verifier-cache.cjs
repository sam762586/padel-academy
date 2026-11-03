/* Vérification du cache hors connexion (sw.js) avec les fichiers versionnés (?v=<empreinte>, scripts/gabarit.js) :
   on simule une publication (nouvelle page + nouveau style) avec le service worker actif. À chaque rechargement, la page
   et son style doivent être de la même version (jamais une page neuve avec un ancien style), puis la nouvelle version
   doit arriver ; hors connexion, la page reste stylée. Aussi : toutes les pages de la racine sont versionnées.
   Lancer depuis la racine du site : node scripts/verifier-cache.cjs */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const racine=path.join(__dirname,'..');
let nb=0;
function ok(nom){nb++;console.log('OK '+nom);}
process.on('unhandledRejection',e=>{if(e&&e.name==='TargetClosedError')return;console.error(e);process.exitCode=1;});

// Toutes les pages de la racine : style et scripts locaux versionnés
for(const f of fs.readdirSync(racine).filter(n=>n.endsWith('.html'))){
 const html=fs.readFileSync(path.join(racine,f),'utf8');
 assert.ok(!/(href|src)="\/?assets\/(style\.css|js\/[\w-]+\.js)"/.test(html),f+' : lien non versionné');
}
ok('pages de la racine : style et scripts tous versionnés');

// Scripts chargés à la volée (academie-sync.js -> compte.js) : versionnés, et fichiers du shell tous présents
{
 const sync=fs.readFileSync(path.join(racine,'assets/js/academie-sync.js'),'utf8');
 assert.match(sync,/"assets\/js\/compte\.js\?v=[0-9a-f]{10}"/,'academie-sync.js : compte.js chargé sans empreinte à jour');
 const {empreinte}=require('./gabarit.js');
 assert.ok(sync.includes('compte.js?v='+empreinte('assets/js/compte.js')),'academie-sync.js : empreinte de compte.js périmée (appliquer-gabarit)');
 const sw=fs.readFileSync(path.join(racine,'sw.js'),'utf8');
 const shell=eval(sw.match(/const SHELL = (\[[\s\S]*?\n\]);/)[1]);
 const absents=shell.filter(u=>u!=='./'&&!fs.existsSync(path.join(racine,u)));
 assert.deepEqual(absents,[],'sw.js : fichiers du SHELL absents');
 assert.ok(/\(fiches\|prochains\)/.test(sw),'sw.js : prochains/*.json en network-first');
 for(const f of fs.readdirSync(racine).filter(n=>n.endsWith('.html')))
  for(const m of fs.readFileSync(path.join(racine,f),'utf8').matchAll(/src="(assets\/js\/[\w-]+\.js)/g))
   assert.ok(shell.includes(m[1]),f+' : '+m[1]+' absent du SHELL');
}
{
 // Pages du menu : toutes dans le SHELL ; navigations en network-first
 const {MENU}=require('./gabarit.js');
 const liens=[];for(const m of MENU){if(Array.isArray(m))liens.push(m[0]);else for(const l of m.liens)liens.push(l[0]);}
 const sw2=fs.readFileSync(path.join(racine,'sw.js'),'utf8');
 const shell2=eval(sw2.match(/const SHELL = (\[[\s\S]*?\n\]);/)[1]);
 const manque=liens.map(l=>l.split('#')[0]).filter(l=>l!=='simulateur-3d.html'&&!shell2.includes(l));
 assert.deepEqual(manque,[],'pages du menu absentes du SHELL');
 assert.ok(/pageReseauDabord\(event\)/.test(sw2)&&/navigation \? pageReseauDabord/.test(sw2),'navigations : network-first');
}
ok('pages du menu toutes dans le SHELL ; navigations en network-first');
{
 // Données des tournois légers : reconnues avec ?v=, une version gardée, repli sur la précédente marquée hors connexion
 const swd=fs.readFileSync(path.join(racine,'sw.js'),'utf8');
 const estDonnee=eval('('+swd.match(/const estDonnee = (chemin => .*);\r?\n/)[1]+')');
 for(const c of ['/assets/data/tournois-apercu.json','/assets/data/tournois.json','/assets/data/index/75.json','/assets/data/index/2A.json','/assets/data/index/971.json'])
  assert.ok(estDonnee(c),c+' : non reconnu par estDonnee');
 for(const c of ['/assets/data/index/7.json','/assets/data/index/75.js','/assets/data/tournois-apercu.js','/assets/data/autre.json'])
  assert.ok(!estDonnee(c),c+' : reconnu à tort');
 assert.ok(swd.includes('searchParams.has("v")) await retirerAnciennesVersions'),'reseauDabord : une seule version gardée');
 assert.ok(swd.includes('await cache.match(requete, { ignoreSearch: true })'),'reseauDabord : repli sur la dernière version connue');
}
ok('academie-sync : compte.js versionné ; SHELL complet, sans fichier absent ; prochains en network-first');

// Serveur : le site réel, sauf index.html et style.css qui changent à la « publication »
let version=1;
const pageIndex=()=>fs.readFileSync(path.join(racine,'index.html'),'utf8').replace(/assets\/style\.css\?v=[0-9a-f]+/,'assets/style.css?v=00000'+version)
 .replace('<h1','<h1 data-version="'+version+'"');
const serveur=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');
 const rel=decodeURIComponent(url.pathname).replace(/^\//,'')||'index.html';
 if(rel==='index.html'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(pageIndex());return;}
 if(rel==='assets/style.css'){
  const v=url.searchParams.get('v');
  res.setHeader('Content-Type','text/css; charset=utf-8');
  res.end(fs.readFileSync(path.join(racine,'assets/style.css'),'utf8')+'\nbody{--version-style:'+(v?Number(v):0)+'}');return;
 }
 const p=path.resolve(racine,rel);
 if(!p.startsWith(racine+path.sep)){res.writeHead(403);res.end();return;}
 // Données légères des tournois : maquette si le fichier n'existe pas encore (le test vise le service worker, pas les données)
 if(/^assets\/data\/(tournois-apercu|index\/[0-9AB]{2,3})\.json$/.test(rel)&&!fs.existsSync(p)){res.setHeader('Content-Type','application/json');res.end('[]');return;}
 fs.readFile(p,(e,b)=>{if(e){res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.webp':'image/webp','.webmanifest':'application/manifest+json'})[path.extname(p)]||'text/plain');res.end(b);
 });
});
(async()=>{
 await new Promise(r=>serveur.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+serveur.address().port;
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const ctx=await browser.newContext({viewport:{width:1280,height:800}});
  await ctx.route('**/assets/vendor/supabase-*.js*',r=>r.fulfill({contentType:'text/javascript',body:''}));
  await ctx.route(/^https:/,r=>r.fulfill({body:''}));
  const page=await ctx.newPage();
  const etat=()=>page.evaluate(()=>({page:Number(document.querySelector('h1').dataset.version),style:Number(getComputedStyle(document.body).getPropertyValue('--version-style')),sw:!!navigator.serviceWorker.controller}));
  await page.goto(base+'/index.html');
  await page.evaluate(()=>navigator.serviceWorker.ready);
  await page.reload();
  let e=await etat();
  assert.deepEqual(e,{page:1,style:1,sw:true});
  ok('version 1 servie par le service worker, page et style cohérents');
  // Publication : nouvelle page, nouveau style
  version=2;
  const vus=[];
  for(let k=0;k<3;k++){
   await page.reload();await page.waitForTimeout(300);
   e=await etat();vus.push(e.page);
   assert.equal(e.style,e.page,'rechargement '+(k+1)+' : page v'+e.page+' avec style v'+e.style);
  }
  assert.equal(vus[0],2,'première visite après publication : version du réseau attendue, pas la copie du cache');
  assert.equal(vus[vus.length-1],2);
  ok('après publication : page et style toujours de la même version, puis la nouvelle arrive ('+vus.join(' → ')+')');
  // Une seule version du style gardée dans le cache
  const cles=await page.evaluate(async()=>{const noms=await caches.keys();const c=await caches.open(noms.find(n=>n.startsWith('pa-')));return (await c.keys()).map(r=>r.url).filter(u=>u.includes('style.css'));});
  assert.equal(cles.length,1);assert.match(cles[0],/v=000002/);
  ok('cache : une seule version du style gardée');
  // Retour de connexion : jamais de query sensible ni de variante ?suite= dans Cache Storage
  await page.goto(base+'/connexion.html?code=abc&suite=espace.html');
  await page.goto(base+'/connexion.html?suite=compte.html');
  await page.goto(base+'/connexion.html?error_description=x&error=y');
  await page.waitForTimeout(300);
  const toutes=await page.evaluate(async()=>{const r=[];for(const n of await caches.keys()){const c=await caches.open(n);for(const k of await c.keys())r.push(k.url);}return r;});
  const mauvaises=toutes.filter(u=>/[?&](code|error|error_code|error_description|access_token|refresh_token|token_hash|type)=/.test(u));
  assert.deepEqual(mauvaises,[],'clés sensibles dans Cache Storage');
  assert.equal(toutes.filter(u=>/connexion\.html/.test(u)).length,1,'connexion.html : une seule entrée attendue');
  ok('cache : aucune clé avec code=/error=…, une seule entrée connexion.html');
  await page.goto(base+'/index.html');
  // Hors connexion : page et style de la dernière version
  await ctx.setOffline(true);
  await page.reload();
  e=await etat();
  assert.deepEqual(e,{page:2,style:2,sw:true});
  ok('hors connexion : page et style de la dernière version');
  // Hors connexion, une page jamais visitée mais précachée (actus-pro.html) vient du cache
  const r=await page.goto(base+'/actus-pro.html');
  assert.ok(r.ok()&&(await page.title()).length>0,'actus-pro.html hors connexion');
  ok('hors connexion : actus-pro.html servie depuis le cache');
  await ctx.setOffline(false);
  // Données versionnées : v=aaaa puis v=bbbb (une seule gardée), puis hors connexion avec v=cccc absent -> dernière marquée
  await page.goto(base+'/index.html');
  const lire=(u)=>page.evaluate(async u=>{try{const r=await fetch(u);return {ok:r.ok,depuis:r.headers.get('X-Depuis-Cache')};}catch(e){return {err:String(e)};}},u);
  for(const f of ['assets/data/tournois-apercu.json','assets/data/index/75.json','assets/data/tournois.json']){
   assert.equal((await lire('/'+f+'?v=aaaaaaaaaa')).ok,true,f+' v1');
   assert.equal((await lire('/'+f+'?v=bbbbbbbbbb')).ok,true,f+' v2');
  }
  const gardees=await page.evaluate(async()=>{const noms=await caches.keys();const c=await caches.open(noms.find(n=>n.startsWith('pa-')));return (await c.keys()).map(r=>r.url).filter(u=>/tournois(-apercu)?\.json|index\/75\.json/.test(u));});
  assert.equal(gardees.length,3,'une seule version par fichier : '+gardees.join(' '));
  assert.ok(gardees.every(u=>u.endsWith('v=bbbbbbbbbb')));
  await ctx.setOffline(true);
  for(const f of ['assets/data/tournois-apercu.json','assets/data/index/75.json','assets/data/tournois.json']){
   const r=await lire('/'+f+'?v=cccccccccc');
   assert.deepEqual(r,{ok:true,depuis:'1'},f+' hors connexion : dernière version marquée attendue');
  }
  await ctx.setOffline(false);
  ok('données des tournois : une version gardée par fichier, hors connexion la précédente est servie, marquée X-Depuis-Cache');
  console.log('TOTAL '+nb+' contrôles réussis.');
 }finally{await browser.close();serveur.close();}
})().catch(e=>{console.error(e);serveur.close();process.exitCode=1;});
