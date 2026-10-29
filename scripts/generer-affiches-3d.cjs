/* Images des scènes 3D (assets/3d/affiches/<id>.jpg), affichées sur les pages d'un scénario tant que la 3D n'est pas
   lancée. Chaque image est une capture de la vraie scène (page simulateur-3d.html, qualité élevée, Edge en rendu
   logiciel), à l'instant de la première frappe du joueur « Toi » (sinon de la deuxième frappe), caméra par défaut.
   À relancer après tout changement de scénario, de terrain ou de joueurs, puis node scripts/generer-pages-3d.js.
   Lancer depuis la racine du site : node scripts/generer-affiches-3d.cjs [id …] */
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const racine=path.join(__dirname,'..');
const dossier=path.join(racine,'assets/3d/affiches');
const TYPES={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.glb':'model/gltf-binary','.webmanifest':'application/manifest+json'};
const tous=fs.readdirSync(path.join(racine,'assets/3d/scenarios')).filter(f=>f.endsWith('.json')).map(f=>f.slice(0,-5));
const ids=process.argv.length>2?process.argv.slice(2):tous;
const serveur=http.createServer((req,res)=>{
 const rel=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\//,'')||'index.html';
 const p=path.resolve(racine,rel);
 if(!p.startsWith(racine+path.sep)){res.writeHead(403);res.end();return;}
 fs.readFile(p,(e,b)=>{if(e){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',TYPES[path.extname(p)]||'text/plain');res.end(b);});
});
(async()=>{
 await new Promise(r=>serveur.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+serveur.address().port;
 const browser=await chromium.launch({channel:'msedge',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  fs.mkdirSync(dossier,{recursive:true});
  const ctx=await browser.newContext({serviceWorkers:'block',viewport:{width:1280,height:900}});
  await ctx.route(/^https:/,r=>r.fulfill({status:200,body:''})); // aucun accès extérieur
  await ctx.addInitScript(()=>{try{localStorage.setItem('pa-p3d-qualite','elevee');}catch(e){}});
  const page=await ctx.newPage();
  page.on('pageerror',e=>console.error('page :',e.message));page.on('console',m=>{if(m.type()==='error')console.error('console :',m.text());});
  for(const id of ids){
   const s=JSON.parse(fs.readFileSync(path.join(racine,'assets/3d/scenarios',id+'.json'),'utf8'));
   const f=s.frappes.find(x=>x.joueur==='A1')||s.frappes[1]||s.frappes[0];
   await page.goto(base+'/simulateur-3d.html#'+id);
   // Scène à 960 × 540 : la taille de l'image
   await page.addStyleTag({content:'#p3d-scene{width:960px!important;max-width:none!important;max-height:none!important;aspect-ratio:16/9!important}#p3d-geste{display:none!important}'});
   await page.waitForFunction(i=>window.P3D&&P3D.etat.pret3d&&P3D.etat.scenario?.id===i&&P3D.etat.images>2,id,{timeout:90000});
   await page.evaluate(t=>P3D.aller(t),f.t);
   await page.waitForFunction(n=>P3D.etat.images>n+3,await page.evaluate(()=>P3D.etat.images),{timeout:30000});
   const fichier=path.join(dossier,id+'.jpg');
   await page.locator('#p3d-scene').screenshot({path:fichier,type:'jpeg',quality:72});
   console.log(id+'.jpg', Math.round(fs.statSync(fichier).size/1024)+' Ko');
  }
 }finally{await browser.close();serveur.close();}
})().catch(e=>{console.error(e);process.exitCode=1;serveur.close();});
