/* Vérification du bouton « Installer l'appli » (pied de page commun scripts/gabarit.js, assets/js/pwa.js) :
   1) pages : le bouton est dans le pied de page de toutes les pages de la racine (caché par défaut, attribut hidden) ;
   2) manifest.webmanifest : critères d'installabilité (nom, adresse de départ, standalone, icônes 192 et 512, couleurs) ;
   3) navigateur (Edge, 390 px, toute adresse https bloquée) : caché au chargement ; affiché après un beforeinstallprompt
      simulé ; clic → prompt() appelé, bouton caché ; appinstalled → caché et événement GoatCounter « appli-installee »
      (aucun si skipgc) ; agent iPhone → bouton affiché, message d'aide au clic ; mode standalone simulé → caché
      (même après beforeinstallprompt) ; aucun débordement à 320 px, 0 erreur console.
   Lancer depuis la racine du site : node scripts/verifier-installer.cjs */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const racine=path.join(__dirname,'..');
let nb=0;
function ok(nom){nb++;console.log('OK '+nom);}
process.on('unhandledRejection',e=>{if(e&&e.name==='TargetClosedError')return;console.error(e);process.exitCode=1;});

const MESSAGE_IOS='Sur iPhone : touche le bouton Partager, puis « Sur l\'écran d\'accueil ».';
const UA_IPHONE='Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';

/* ---- 1. Pages ---- */
for(const f of fs.readdirSync(racine).filter(n=>n.endsWith('.html'))){
 const html=fs.readFileSync(path.join(racine,f),'utf8');
 const pied=(html.match(/<footer>[\s\S]*?<\/footer>/)||[''])[0];
 assert.match(pied,/<div class="pied-installer" id="pa-installer" hidden><button type="button" class="btn ghost petit" id="pa-installer-bouton" hidden>Installer l'appli<\/button><div id="pa-installer-aide" role="status"><\/div><\/div>/,f+' : bouton d\'installation absent du pied de page');
}
ok('pages de la racine : bouton « Installer l\'appli » dans le pied de page, caché par défaut');

/* ---- 2. Manifest ---- */
{
 const m=JSON.parse(fs.readFileSync(path.join(racine,'manifest.webmanifest'),'utf8'));
 assert.ok(m.name&&m.short_name,'name / short_name');
 assert.ok(m.start_url,'start_url');
 assert.equal(m.display,'standalone');
 assert.ok(m.theme_color&&m.background_color,'couleurs');
 for(const t of ['192x192','512x512']){
  const i=m.icons.find(x=>x.sizes===t&&(x.purpose||'any').includes('any'));
  assert.ok(i,'icône '+t);assert.ok(fs.existsSync(path.join(racine,i.src)),'fichier '+i.src);
 }
 for(const i of m.icons)assert.ok(fs.existsSync(path.join(racine,i.src)),'fichier '+i.src);
 ok('manifest : nom, adresse de départ, standalone, couleurs, icônes 192 et 512 présentes');
}

/* ---- 3. Navigateur ---- */
const serveur=http.createServer((req,res)=>{
 const rel=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\//,'')||'index.html';
 const p=path.resolve(racine,rel);
 if(!p.startsWith(racine+path.sep)){res.writeHead(403);res.end();return;}
 fs.readFile(p,(e,b)=>{if(e){res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2','.webmanifest':'application/manifest+json','.jpg':'image/jpeg','.svg':'image/svg+xml'})[path.extname(p)]||'text/plain');res.end(b);
 });
});

// GoatCounter factice (le vrai script est bloqué) et invite d'installation simulée
const INIT=()=>{
 window.__gc=[];
 Object.defineProperty(window,'goatcounter',{configurable:true,get(){return {count:o=>window.__gc.push(o)};},set(){}});
 window.__simulerInvite=()=>{
  const ev=new Event('beforeinstallprompt',{cancelable:true});
  window.__invite={appels:0};
  ev.prompt=()=>{window.__invite.appels++;return Promise.resolve();};
  ev.userChoice=Promise.resolve({outcome:'accepted',platform:'web'});
  window.dispatchEvent(ev);
  window.__invite.annule=ev.defaultPrevented;
 };
};

(async()=>{
 await new Promise(r=>serveur.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+serveur.address().port+'/';
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const erreurs=[];
 async function contexte(opts={},avant){
  const ctx=await browser.newContext(Object.assign({serviceWorkers:'block',viewport:{width:390,height:844},isMobile:true,hasTouch:true},opts));
  await ctx.route(/^https:/,r=>r.fulfill({status:204,body:''})); // aucun service externe
  await ctx.route('**/assets/vendor/supabase-*.js*',r=>r.fulfill({contentType:'text/javascript',body:''}));
  await ctx.addInitScript(INIT);
  if(avant)await ctx.addInitScript(avant);
  const page=await ctx.newPage();
  page.on('console',m=>{if(m.type()==='error')erreurs.push(m.text());});
  page.on('pageerror',e=>erreurs.push(e.message));
  page.on('response',r=>{if(r.status()>=400&&r.url().startsWith(base))erreurs.push(r.status()+' '+r.url());});
  return {ctx,page};
 }
 const visible=(page)=>page.evaluate(()=>{const z=document.getElementById('pa-installer'),b=document.getElementById('pa-installer-bouton');return !!(z&&b&&!z.hidden&&!b.hidden&&b.getBoundingClientRect().height>0);});
 try{
  // Chrome / Edge : invite simulée
  {
   const {ctx,page}=await contexte();
   await page.goto(base+'index.html',{waitUntil:'load'});
   assert.equal(await visible(page),false);
   ok('Edge : bouton caché au chargement (pas d\'invite)');
   await page.evaluate(()=>window.__simulerInvite());
   assert.equal(await page.evaluate(()=>window.__invite.annule),true,'preventDefault non appelé');
   assert.equal(await visible(page),true);
   assert.equal(await page.locator('#pa-installer-bouton').innerText(),'INSTALLER L\'APPLI'); // .btn en capitales (CSS)
   assert.equal(await page.locator('#pa-installer-bouton').textContent(),'Installer l\'appli');
   ok('Edge : beforeinstallprompt → invite gardée (preventDefault), bouton « Installer l\'appli » affiché');
   await page.locator('#pa-installer-bouton').click();
   assert.equal(await page.evaluate(()=>window.__invite.appels),1);
   assert.equal(await visible(page),false);
   ok('Edge : clic → prompt() appelé une fois, bouton caché');
   await page.evaluate(()=>window.__simulerInvite());
   assert.equal(await visible(page),true);
   await page.evaluate(()=>window.dispatchEvent(new Event('appinstalled')));
   assert.equal(await visible(page),false);
   assert.deepEqual(await page.evaluate(()=>window.__gc),[{path:'appli-installee',title:'Appli installée',event:true}]);
   ok('Edge : appinstalled → bouton caché, événement GoatCounter « appli-installee »');
   await page.evaluate(()=>{localStorage.setItem('skipgc','t');window.__gc=[];window.dispatchEvent(new Event('appinstalled'));});
   assert.deepEqual(await page.evaluate(()=>window.__gc),[]);
   await page.evaluate(()=>localStorage.removeItem('skipgc'));
   ok('Edge : refus de la mesure (skipgc) → aucun événement');
   // Page tournoi en sous-dossier : même comportement
   const tournoi=fs.readdirSync(path.join(racine,'tournoi')).find(n=>n.endsWith('.html'));
   if(tournoi){
    await page.goto(base+'tournoi/'+tournoi,{waitUntil:'load'});
    assert.equal(await visible(page),false);
    await page.evaluate(()=>window.__simulerInvite());
    assert.equal(await visible(page),true);
    ok('page tournoi (tournoi/'+tournoi+') : bouton caché puis affiché après l\'invite');
   }
   // 320 px, bouton affiché : aucun débordement
   await page.goto(base+'index.html',{waitUntil:'load'});
   await page.setViewportSize({width:320,height:700});
   await page.evaluate(()=>window.__simulerInvite());
   await page.locator('#pa-installer-bouton').scrollIntoViewIfNeeded();
   const deb=await page.evaluate(()=>({doc:document.documentElement.scrollWidth,vue:document.documentElement.clientWidth,b:document.getElementById('pa-installer-bouton').getBoundingClientRect().right}));
   assert.ok(deb.doc<=deb.vue,'débordement horizontal : '+JSON.stringify(deb));
   assert.ok(deb.b<=deb.vue-16+0.5,'bouton hors gouttière : '+JSON.stringify(deb));
   ok('320 px : bouton affiché sans débordement horizontal');
   await ctx.close();
  }
  // iPhone : pas d'invite, explication au clic
  {
   const {ctx,page}=await contexte({userAgent:UA_IPHONE});
   await page.goto(base+'index.html',{waitUntil:'load'});
   assert.equal(await visible(page),true);
   assert.equal(await page.locator('#pa-installer-aide').textContent(),'');
   ok('iPhone : bouton affiché sans invite du navigateur');
   await page.locator('#pa-installer-bouton').click();
   const msg=page.locator('#pa-installer-aide p.msg.msg-info');
   assert.equal(await msg.count(),1);
   assert.equal(await msg.textContent(),MESSAGE_IOS);
   assert.equal(await page.locator('#pa-installer-aide').getAttribute('role'),'status');
   await page.locator('#pa-installer-bouton').click();
   assert.equal(await msg.count(),1,'message répété');
   ok('iPhone : clic → « '+MESSAGE_IOS+' » (role="status"), affiché une seule fois');
   await page.setViewportSize({width:320,height:700});
   const deb=await page.evaluate(()=>({doc:document.documentElement.scrollWidth,vue:document.documentElement.clientWidth}));
   assert.ok(deb.doc<=deb.vue,'débordement horizontal : '+JSON.stringify(deb));
   ok('iPhone, 320 px : message sans débordement horizontal');
   await ctx.close();
  }
  // Déjà installé : mode standalone simulé (Edge) et navigator.standalone (iPhone)
  {
   const {ctx,page}=await contexte({},()=>{const mm=window.matchMedia.bind(window);window.matchMedia=q=>/display-mode:\s*standalone/.test(q)?{matches:true,media:q,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}}:mm(q);});
   await page.goto(base+'index.html',{waitUntil:'load'});
   await page.evaluate(()=>window.__simulerInvite());
   assert.equal(await visible(page),false);
   ok('mode standalone (application ouverte) : bouton caché, même après une invite');
   await ctx.close();
   const c2=await contexte({userAgent:UA_IPHONE},()=>{Object.defineProperty(navigator,'standalone',{configurable:true,get:()=>true});});
   await c2.page.goto(base+'index.html',{waitUntil:'load'});
   assert.equal(await visible(c2.page),false);
   ok('iPhone déjà sur l\'écran d\'accueil (navigator.standalone) : bouton caché');
   await c2.ctx.close();
  }
  // Navigateur sans installation (pas d'invite, pas iOS) : caché
  {
   const {ctx,page}=await contexte({userAgent:'Mozilla/5.0 (X11; Linux x86_64; rv:131.0) Gecko/20100101 Firefox/131.0',isMobile:false,hasTouch:false,viewport:{width:1280,height:800}});
   await page.goto(base+'technique.html',{waitUntil:'load'});
   assert.equal(await visible(page),false);
   ok('navigateur sans installation (Firefox) : bouton caché');
   await ctx.close();
  }
  assert.deepEqual(erreurs,[]);
  ok('aucune erreur console ni ressource manquante');
  console.log('TOTAL '+nb+' contrôles réussis.');
 }finally{await browser.close();serveur.close();}
})().catch(e=>{console.error(e);serveur.close();process.exitCode=1;});
