/* Fond de l'accueil (direction « Vitre ») : une scène du simulateur 3D SANS étiquettes, zones ni interface,
   rendue par le vrai moteur (page simulateur-3d.html, qualité élevée, Edge en rendu logiciel) puis encodée en WebP
   par le navigateur lui-même (aucune dépendance npm).
   Scène : smash-lob-court, juste avant la frappe du smash de « Toi » (balle haute, quatre joueurs en place).
   Sorties : assets/img/photos/fond-vitre-1920.webp (1920 × 1080), fond-vitre-1280.webp (1280 × 720, même rendu
   réduit) et fond-vitre-mobile-900.webp (900 × 1600, cadrage portrait, sujet centré).
   À relancer après tout changement du terrain, des joueurs ou de ce scénario.
   Lancer depuis la racine du site : node scripts/generer-fond-accueil.cjs
   Option --apercu : copie aussi les rendus en PNG dans scripts/debug/ (fond-vitre-*.png). */
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const racine=path.join(__dirname,'..');
const dossier=path.join(racine,'assets/img/photos');
const debug=path.join(__dirname,'debug');
const apercu=process.argv.includes('--apercu');
const SCENARIO='smash-lob-court';
const INSTANT=1.5; // s : « Toi » armé pour le smash, la balle tombe sur lui (frappe à 1,55 s)
const QUALITE=0.75;
// Caméras (vue libre posée à la main), côté « Toi » : le smasheur de dos, les adversaires face à nous. Paysage : dans
// l'enceinte, en hauteur devant la vitre du fond ; portrait : plus haut et plus loin, au-dessus du grillage du fond (4 m),
// pour garder les quatre joueurs dans un cadre étroit, sujet centré.
const CADRAGES=[
 {nom:'paysage',l:1920,h:1080,pos:[2.8,5.0,-9.6],cible:[-0.4,1.4,2.5],
  sorties:[{fichier:'fond-vitre-1920.webp',l:1920,h:1080},{fichier:'fond-vitre-1280.webp',l:1280,h:720}]},
 {nom:'portrait',l:900,h:1600,pos:[0.4,6.6,-12.5],cible:[0.2,1.2,2.5],
  sorties:[{fichier:'fond-vitre-mobile-900.webp',l:900,h:1600}]},
];
const TYPES={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.glb':'model/gltf-binary','.webmanifest':'application/manifest+json'};
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
  for(const c of CADRAGES){
   const ctx=await browser.newContext({serviceWorkers:'block',viewport:{width:c.l+200,height:c.h+200},deviceScaleFactor:1});
   await ctx.route(/^https:/,r=>r.fulfill({status:200,body:''})); // aucun accès extérieur
   await ctx.addInitScript(()=>{try{localStorage.setItem('pa-p3d-qualite','elevee');}catch(e){}});
   const page=await ctx.newPage();
   page.on('pageerror',e=>console.error('page :',e.message));page.on('console',m=>{if(m.type()==='error')console.error('console :',m.text());});
   await page.goto(base+'/simulateur-3d.html#'+SCENARIO);
   // Scène à la taille exacte de l'image, posée seule en haut de page ; étiquettes, geste, chargement masqués
   await page.addStyleTag({content:`#p3d-scene{position:fixed!important;left:0!important;top:0!important;z-index:9999!important;margin:0!important;border:0!important;border-radius:0!important;outline:0!important;box-shadow:none!important;width:${c.l}px!important;height:${c.h}px!important;max-width:none!important;max-height:none!important;aspect-ratio:auto!important}#p3d-scene canvas{width:100%!important;height:100%!important;display:block!important}#p3d-etiquettes,#p3d-geste,#p3d-chargement{display:none!important}`});
   await page.waitForFunction(i=>window.P3D&&P3D.etat.pret3d&&P3D.etat.scenario?.id===i&&P3D.etat.images>2&&P3D.vue3d,SCENARIO,{timeout:90000});
   await page.evaluate(({pos,cible,t})=>{
    const {camera,cameras}=P3D.vue3d;
    P3D.etat.placements=false;P3D.etat.trajectoire=false;
    cameras.choisir('libre');
    camera.position.set(...pos);cameras.controles.target.set(...cible);cameras.controles.update();
    P3D.aller(t);
   },{pos:c.pos,cible:c.cible,t:INSTANT});
   await page.waitForFunction(n=>P3D.etat.images>n+4,await page.evaluate(()=>P3D.etat.images),{timeout:60000});
   const png=await page.screenshot({type:'png',clip:{x:0,y:0,width:c.l,height:c.h}});
   if(apercu){fs.mkdirSync(debug,{recursive:true});fs.writeFileSync(path.join(debug,'fond-vitre-'+c.nom+'.png'),png);}
   // Encodage WebP par le navigateur (canvas.toDataURL), avec réduction éventuelle
   for(const s of c.sorties){
    const url=await page.evaluate(async({b64,l,h,q})=>{
     const img=new Image();img.src='data:image/png;base64,'+b64;await img.decode();
     const cv=document.createElement('canvas');cv.width=l;cv.height=h;
     const g=cv.getContext('2d');g.imageSmoothingQuality='high';g.drawImage(img,0,0,l,h);
     return cv.toDataURL('image/webp',q);
    },{b64:png.toString('base64'),l:s.l,h:s.h,q:QUALITE});
    if(!url.startsWith('data:image/webp'))throw new Error('Encodage WebP indisponible dans ce navigateur');
    const fichier=path.join(dossier,s.fichier);
    fs.writeFileSync(fichier,Buffer.from(url.split(',')[1],'base64'));
    console.log(s.fichier,s.l+'×'+s.h,Math.round(fs.statSync(fichier).size/1024)+' Ko');
   }
   await ctx.close();
  }
 }finally{await browser.close();serveur.close();}
})().catch(e=>{console.error(e);process.exitCode=1;serveur.close();});
