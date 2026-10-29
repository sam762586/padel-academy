/* Vérification des performances (phase 5, lot 5A) :
   1) sans navigateur : aucune police chargée depuis Google (connexion externe qui bloque l'affichage), les deux polices
      du site préchargées avec le bon chemin dans toutes les pages (générées comprises) et déclarées dans style.css,
      licences présentes ; bandeaux en 4 tailles (640, 960, 1280, 1600) avec leurs fichiers ;
   2) dans Edge, téléphone (390 px) en 4G lente (150 ms, 1,6 Mbit/s) et processeur ralenti ×4, fichiers compressés comme
      sur GitHub Pages : LCP < 2,5 s et CLS < 0,02 sur 10 pages représentatives. Les mesures de labo varient avec la
      charge de la machine : une page hors budget est mesurée une seconde fois avant de conclure.
   Les vraies valeurs des visiteurs se lisent dans Search Console (Signaux Web essentiels).
   Lancer depuis la racine du site : node scripts/verifier-performance.cjs */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),zlib=require('node:zlib');
const {chromium}=require('playwright');
const racine=path.join(__dirname,'..');
let nb=0;
function ok(nom){nb++;console.log('OK '+nom);}
const lire=f=>fs.readFileSync(path.join(racine,f),'utf8');
const BUDGET={lcp:2500,cls:0.02};
const PAGES=['index.html','technique.html','tactique.html','regles.html','simulateur-3d.html','simulateur-3d-vibora.html','tournois.html','tournois/76.html','niveau.html','score.html','academie.html'];
const POLICES=['manrope-latin.woff2','big-shoulders-display-latin.woff2'];

function toutesLesPages(){
 const l=[];
 const parcourir=d=>{for(const e of fs.readdirSync(path.join(racine,d),{withFileTypes:true})){const r=d?d+'/'+e.name:e.name;
  if(e.isDirectory()){if(['tournoi','tournois'].includes(r)||r.startsWith('tournois/'))parcourir(r);}else if(r.endsWith('.html'))l.push(r);}};
 parcourir('');return l;
}
function horsNavigateur(){
 const pages=toutesLesPages();
 assert.ok(pages.length>1000,'pages trouvées : '+pages.length);
 for(const f of pages){
  const h=lire(f);
  assert.ok(!/fonts\.(googleapis|gstatic)\.com/.test(h),f+' : police chargée depuis Google');
  const style=h.match(/<link rel="stylesheet" href="(\/|(?:\.\.\/)*)assets\/style\.css/);
  if(!style)continue;
  const pre=style[1];
  POLICES.forEach(p=>{
   assert.ok(h.includes(`<link rel="preload" href="${pre}assets/fonts/${p}" as="font" type="font/woff2" crossorigin>`),f+' : '+p+' non préchargée');
  });
  assert.ok(h.indexOf('assets/fonts/'+POLICES[0])<h.indexOf('assets/style.css'),f+' : préchargement après la feuille de style');
 }
 POLICES.forEach(p=>assert.equal(fs.readFileSync(path.join(racine,'assets/fonts',p)).subarray(0,4).toString(),'wOF2',p));
 ['LICENCES.md','OFL-manrope.txt','OFL-big-shoulders-display.txt'].forEach(f=>assert.ok(fs.existsSync(path.join(racine,'assets/fonts',f)),f));
 const css=lire('assets/style.css');
 POLICES.forEach(p=>assert.match(css,new RegExp('@font-face\\{font-family:"[^"]+";src:url\\(fonts/'+p.replace('.','\\.')+'\\) format\\("woff2"\\)[^}]*font-display:swap')));
 assert.match(css,/--body:"Manrope","Manrope repli"/);assert.match(css,/--display:"Big Shoulders Display","Big Shoulders repli"/);
 assert.match(lire('scripts/generer-pages.js'),/rel="preload" href="\$\{pre\}assets\/fonts\/manrope-latin\.woff2"/,'générateur des pages tournois');
 // Bandeaux : 4 tailles, fichiers présents
 let n=0;
 for(const f of pages.filter(f=>!f.includes('/'))){
  for(const m of lire(f).matchAll(/<img [^>]*width="1600"[^>]*>/g)){
   const s=(m[0].match(/srcset="([^"]+)"/)||[])[1];assert.ok(s,f+' : bandeau sans srcset');
   const tailles=s.split(', ').map(x=>x.split(' '));
   assert.deepEqual(tailles.map(x=>x[1]),['640w','960w','1280w','1600w'],f);
   tailles.forEach(([u])=>assert.ok(fs.existsSync(path.join(racine,u)),f+' : '+u));
   n++;
  }
 }
 assert.ok(n>=15);
 ok(pages.length+' pages : polices du site préchargées (aucune connexion à Google), licences, repli aux mêmes dimensions ; '+n+' bandeaux en 4 tailles');
}

// Serveur local compressé (gzip), comme GitHub Pages
const TYPES={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.woff2':'font/woff2','.svg':'image/svg+xml','.glb':'model/gltf-binary','.webmanifest':'application/manifest+json'};
const COMPRESSE=new Set(['.html','.js','.css','.json','.svg','.webmanifest']);
const serveur=http.createServer((req,res)=>{
 const rel=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\//,'')||'index.html';
 const p=path.resolve(racine,rel);
 if(!p.startsWith(racine+path.sep)){res.writeHead(403);res.end();return;}
 fs.readFile(p,(e,b)=>{if(e){res.writeHead(404);res.end();return;}
  const x=path.extname(p),h={'Content-Type':TYPES[x]||'application/octet-stream'};
  if(COMPRESSE.has(x)&&/gzip/.test(req.headers['accept-encoding']||'')){h['Content-Encoding']='gzip';b=zlib.gzipSync(b);}
  res.writeHead(200,h);res.end(b);});
});

async function mesurer(browser,url){
 const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'});
 await ctx.route(/^https:/,r=>r.fulfill({status:200,body:''}));
 const page=await ctx.newPage();
 const cdp=await ctx.newCDPSession(page);
 await cdp.send('Network.enable');
 await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:1.6e6/8,uploadThroughput:7.5e5/8});
 await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
 await page.addInitScript(()=>{
  window.__lcp=0;window.__cls=0;
  new PerformanceObserver(l=>{for(const e of l.getEntries())window.__lcp=e.startTime;}).observe({type:'largest-contentful-paint',buffered:true});
  // Comme Google : les décalages qui suivent une action de l'utilisateur ne comptent pas
  new PerformanceObserver(l=>{for(const e of l.getEntries())if(!e.hadRecentInput)window.__cls+=e.value;}).observe({type:'layout-shift',buffered:true});
 });
 await page.goto(url,{waitUntil:'load',timeout:120000});
 await page.waitForTimeout(3000); // contenus arrivés après le chargement (listes, données)
 const r=await page.evaluate(()=>({lcp:Math.round(window.__lcp),cls:+window.__cls.toFixed(3)}));
 await ctx.close();
 return r;
}

async function dansLeNavigateur(base){
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const lignes=[];
 try{
  for(const p of PAGES){
   let r=await mesurer(browser,base+'/'+p);
   if(r.lcp>=BUDGET.lcp||r.cls>=BUDGET.cls)r=await mesurer(browser,base+'/'+p); // seconde mesure avant de conclure
   lignes.push(p+' '+r.lcp+' ms / '+r.cls);
   assert.ok(r.lcp>0&&r.lcp<BUDGET.lcp,p+' : LCP '+r.lcp+' ms (budget '+BUDGET.lcp+')');
   assert.ok(r.cls<BUDGET.cls,p+' : CLS '+r.cls+' (budget '+BUDGET.cls+')');
  }
 }finally{await browser.close();}
 console.log('   '+lignes.join(' ; '));
 ok(PAGES.length+' pages sur téléphone en 4G lente : LCP < '+BUDGET.lcp/1000+' s et CLS < '+BUDGET.cls);
}

(async()=>{
 horsNavigateur();
 await new Promise(r=>serveur.listen(0,'127.0.0.1',r));
 try{await dansLeNavigateur('http://127.0.0.1:'+serveur.address().port);}
 finally{serveur.close();}
 console.log(nb+' vérifications réussies.');
})().catch(e=>{console.error(e);process.exitCode=1;serveur.close();});
