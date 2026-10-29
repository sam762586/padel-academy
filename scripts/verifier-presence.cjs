/* Vérification de « Visiteurs en ce moment » (assets/js/presence.js, index.html et carte.html).
   Faux SDK Supabase servi à la place de assets/vendor/supabase-*.js (createClient → channel / on('presence',{event:'sync'}) /
   subscribe / track / presenceState / removeChannel) : aucune connexion réelle. Edge headless, 390 px.
   Contrôles : 3 clés → « 3 joueurs… », 1 clé → « 1 joueur… », erreur du canal → rien (ligne gardée), onglet caché → pas de
   connexion puis connexion au retour, hors connexion et navigateur piloté (webdriver) → rien, track({}) sans aucune donnée,
   client sans session (persistSession false) ou client des comptes réutilisé, localStorage inchangé, annonce aria-live au plus
   toutes les 30 s, départ du canal sur pagehide, ligne réservée (pas de saut), presence.js absent des autres pages, 0 erreur console.
   Lancer depuis la racine du site : node scripts/verifier-presence.cjs */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const racine=path.join(__dirname,'..');
let nb=0;
function ok(nom){nb++;console.log('OK '+nom);}
process.on('unhandledRejection',e=>{if(e&&e.name==='TargetClosedError')return;console.error(e);process.exitCode=1;});
const serveur=http.createServer((req,res)=>{
 const rel=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\//,'')||'index.html';
 const p=path.resolve(racine,rel);
 if(!p.startsWith(racine+path.sep)){res.writeHead(403);res.end();return;}
 fs.readFile(p,(e,b)=>{if(e){res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2','.webmanifest':'application/manifest+json'})[path.extname(p)]||'text/plain');res.end(b);
 });
});

/* ---- 1. Inclusion : presence.js seulement sur index.html et carte.html (pages de la racine et pages générées) ---- */
function pagesHtml(dossier,profondeur){
 let l=[];
 for(const n of fs.readdirSync(dossier,{withFileTypes:true})){
  if(n.isDirectory()){if(profondeur>0&&!/^(scripts|node_modules|supabase|strat|agents-a-installer|\.)/.test(n.name))l=l.concat(pagesHtml(path.join(dossier,n.name),profondeur-1));}
  else if(n.name.endsWith('.html'))l.push(path.join(dossier,n.name));
 }
 return l;
}
function inclusion(){
 const avec=pagesHtml(racine,2).filter(f=>/assets\/js\/presence\.js/.test(fs.readFileSync(f,'utf8'))).map(f=>path.relative(racine,f).replace(/\\/g,'/')).sort();
 assert.deepEqual(avec,['carte.html','index.html']);
 for(const f of avec)assert.match(fs.readFileSync(path.join(racine,f),'utf8'),/<script src="assets\/js\/presence\.js\?v=[0-9a-f]{10}" defer><\/script>/,f+' : presence.js versionné et différé');
 assert.ok(!/assets\/vendor\/supabase/.test(fs.readFileSync(path.join(racine,'index.html'),'utf8')),"l'accueil ne charge pas le SDK d'emblée");
 const src=fs.readFileSync(path.join(racine,'assets/js/presence.js'),'utf8');
 assert.match(src,/"assets\/vendor\/supabase-[\d.]+\.js\?v=[0-9a-f]{10}"/,'SDK chargé à la demande avec son empreinte');
 assert.match(src,/"assets\/js\/supabase-config\.js\?v=[0-9a-f]{10}"/,'configuration chargée à la demande avec son empreinte');
 assert.ok(!/https?:\/\/(?!apprendre)/.test(src.replace(/\/\*[\s\S]*?\*\//g,'')),'aucune adresse externe (pas de CDN)');
 assert.ok(fs.readFileSync(path.join(racine,'sw.js'),'utf8').includes('"assets/js/presence.js"'),'presence.js dans le SHELL du service worker');
 ok('presence.js inclus seulement sur index.html et carte.html (versionné, defer), SDK et configuration chargés à la demande, dans le SHELL');
}

/* ---- 2. Navigateur avec faux SDK ---- */
// Faux supabase-js : enregistre clients, canaux, track et départs dans window.__faux
const FAUX_SDK=`window.supabase={createClient(url,cle,opts){const S=window.__faux;S.clients.push({url,cle,opts:JSON.parse(JSON.stringify(opts||{}))});
 return {channel(nom,o){const S=window.__faux;const ch={nom,o:JSON.parse(JSON.stringify(o||{})),ecoute:null,
   on(t,f,cb){S.ecoutes.push([t,f&&f.event]);if(t==='presence'&&f&&f.event==='sync')this.ecoute=cb;return this;},
   subscribe(cb){S.canaux.push(this);setTimeout(()=>cb(S.mode==='erreur'?'CHANNEL_ERROR':'SUBSCRIBED'),20);return this;},
   track(p){S.tracks.push(JSON.parse(JSON.stringify(p===undefined?null:p)));setTimeout(()=>this.ecoute&&this.ecoute(),20);return Promise.resolve('ok');},
   presenceState(){const r={};for(let i=0;i<S.n;i++)r['cle'+i]=[{presence_ref:'r'+i}];return r;},
   unsubscribe(){S.partis++;return Promise.resolve('ok');}};return ch;},
  removeChannel(c){window.__faux.partis++;return Promise.resolve('ok');}};}};`;
async function ouvrir(browser,base,page_,reglages,options){
 const o=Object.assign({robot:false,cache:false,horsLigne:false,compte:false},options||{});
 const ctx=await browser.newContext({serviceWorkers:'block',viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 await ctx.route(/^https:/,r=>r.fulfill({status:204,body:''})); // aucun service externe
 await ctx.route(/\/assets\/vendor\/supabase-[\d.]+\.js/,r=>r.fulfill({contentType:'text/javascript',body:FAUX_SDK}));
 // carte.html : module de compte remplacé (aucun appel d'authentification) ; avec compte, un client « des comptes » est exposé
 await ctx.route(/\/assets\/js\/compte\.js/,r=>r.fulfill({contentType:'text/javascript',body:o.compte?"window.PA_COMPTE={actif:true,ready:Promise.resolve(),user:null,onChange(){},client:window.supabase.createClient('https://compte.test','cle',{marque:'compte'})};":''}));
 await ctx.addInitScript(([r,opt])=>{
  window.__faux=Object.assign({mode:'ok',n:3,clients:[],canaux:[],tracks:[],ecoutes:[],partis:0},r);
  if(!opt.robot)Object.defineProperty(Navigator.prototype,'webdriver',{get:()=>false,configurable:true});
  if(opt.horsLigne)Object.defineProperty(Navigator.prototype,'onLine',{get:()=>false,configurable:true});
  if(opt.cache){window.__visi='hidden';Object.defineProperty(Document.prototype,'visibilityState',{get:()=>window.__visi,configurable:true});Object.defineProperty(Document.prototype,'hidden',{get:()=>window.__visi==='hidden',configurable:true});}
  // Session d'un joueur déjà connecté (fausse) et données du site : ne doivent pas bouger
  try{localStorage.setItem('sb-bvhfizdfgccrkhdfqzkf-auth-token','{"faux":true}');localStorage.setItem('pa-test','1');}catch(e){}
 },[reglages||{},o]);
 const page=await ctx.newPage();
 const erreurs=[];
 page.on('pageerror',e=>erreurs.push(page_+' : '+e.message+' '+String(e.stack||'').split('\n').slice(0,3).join(' | ')));
 page.on('console',m=>{if(m.type()==='error')erreurs.push(m.text());});
 page.on('response',r=>{if(r.status()>=400&&r.url().startsWith(base))erreurs.push(r.status()+' '+r.url());});
 await page.goto(base+'/'+page_);
 return {ctx,page,erreurs};
}
const texte=page=>page.evaluate(()=>document.querySelector('#pa-presence [data-presence-texte]').textContent);
const annonce=page=>page.evaluate(()=>document.querySelector('#pa-presence [data-presence-annonce]').textContent);
const faux=page=>page.evaluate(()=>JSON.parse(JSON.stringify(window.__faux,(k,v)=>k==='ecoute'?undefined:v)));
const stockage=page=>page.evaluate(()=>{const o={};for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);o[k]=localStorage.getItem(k);}return o;});
const attendre=ms=>new Promise(r=>setTimeout(r,ms));

(async()=>{
 inclusion();
 await new Promise(r=>serveur.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+serveur.address().port;
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const toutes=[];
 try{
  // Accueil, 3 joueurs
  let {ctx,page,erreurs}=await ouvrir(browser,base,'index.html',{n:3});
  const hAvant=await page.evaluate(()=>document.getElementById('pa-presence').closest('p').getBoundingClientRect().height);
  assert.equal(await texte(page),' ','ligne réservée (espace insécable) avant la connexion');
  assert.ok(hAvant>0,'ligne réservée : hauteur non nulle avant la connexion');
  await page.waitForFunction(()=>/joueurs/.test(document.querySelector('#pa-presence [data-presence-texte]').textContent));
  assert.equal(await texte(page),'3 joueurs sur le site en ce moment');
  assert.equal(await annonce(page),'3 joueurs sur le site en ce moment');
  assert.equal(await page.getAttribute('#pa-presence [data-presence-annonce]','aria-live'),'polite');
  assert.equal(await page.getAttribute('#pa-presence [data-presence-texte]','aria-hidden'),'true');
  assert.equal(await page.evaluate(()=>document.getElementById('pa-presence').closest('p').getBoundingClientRect().height),hAvant,'pas de saut de mise en page');
  let f=await faux(page);
  assert.equal(f.clients.length,1);
  assert.equal(f.clients[0].url,'https://bvhfizdfgccrkhdfqzkf.supabase.co','URL lue dans supabase-config.js');
  assert.deepEqual(f.clients[0].opts,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}},'client sans session');
  assert.equal(f.canaux.length,1);assert.equal(f.canaux[0].nom,'presence-site');
  const cle=f.canaux[0].o.config.presence.key;assert.match(cle,/^[0-9a-f-]{32,36}$/,'clé aléatoire');
  assert.deepEqual(f.ecoutes,[['presence','sync']]);
  assert.deepEqual(f.tracks,[{}],'track({}) : aucune donnée envoyée');
  ok('accueil : « 3 joueurs sur le site en ce moment », canal presence-site, clé aléatoire, track({}) vide, client sans session');
  // Aucune donnée gardée : ni la clé de présence, ni session créée ou modifiée
  const st=await stockage(page);
  assert.deepEqual(st,{'sb-bvhfizdfgccrkhdfqzkf-auth-token':'{"faux":true}','pa-test':'1'});
  assert.ok(!JSON.stringify(st).includes(cle));
  ok('localStorage inchangé : session existante intacte, aucune clé de présence ni session ajoutée');
  // Annonce aria-live : au plus toutes les 30 s (le texte visible, lui, suit tout de suite)
  await page.evaluate(()=>{window.__faux.n=5;});
  await page.evaluate(()=>window.__faux.canaux[0].ecoute());
  assert.equal(await texte(page),'5 joueurs sur le site en ce moment');
  assert.equal(await annonce(page),'3 joueurs sur le site en ce moment','annonce pas répétée avant 30 s');
  ok('texte visible mis à jour tout de suite, annonce aria-live retenue (30 s minimum entre deux annonces)');
  // Départ du canal à la fermeture de la page
  await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:false})));
  assert.equal((await faux(page)).partis,1);
  ok('pagehide : départ du canal');
  // 390 px : pas de débordement
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),390);
  toutes.push(...erreurs);await ctx.close();

  // Un seul joueur : singulier
  ({ctx,page,erreurs}=await ouvrir(browser,base,'index.html',{n:1}));
  await page.waitForFunction(()=>/joueur/.test(document.querySelector('#pa-presence [data-presence-texte]').textContent));
  assert.equal(await texte(page),'1 joueur sur le site en ce moment');
  ok('1 clé : « 1 joueur sur le site en ce moment » (singulier)');
  toutes.push(...erreurs);await ctx.close();

  // Erreur du canal : rien d'affiché, la ligne reste réservée
  ({ctx,page,erreurs}=await ouvrir(browser,base,'index.html',{mode:'erreur'}));
  await page.waitForFunction(()=>window.__faux.canaux.length===1);await attendre(300);
  assert.equal(await texte(page),' ');assert.equal(await annonce(page),'');
  assert.deepEqual((await faux(page)).tracks,[],'pas de track sans abonnement');
  ok('erreur du canal : rien affiché, rien annoncé');
  toutes.push(...erreurs);await ctx.close();

  // Onglet caché : pas de connexion ; au retour sur l'onglet, connexion
  ({ctx,page,erreurs}=await ouvrir(browser,base,'index.html',{n:2},{cache:true}));
  await page.waitForLoadState('load');await attendre(3600);
  f=await faux(page);
  assert.equal(f.clients.length+f.canaux.length,0,'aucune connexion onglet caché');
  await page.evaluate(()=>{window.__visi='visible';document.dispatchEvent(new Event('visibilitychange'));});
  await page.waitForFunction(()=>/2 joueurs/.test(document.querySelector('#pa-presence [data-presence-texte]').textContent));
  ok('onglet caché : aucune connexion ; connexion au retour sur l\'onglet (« 2 joueurs… »)');
  toutes.push(...erreurs);await ctx.close();

  // Hors connexion, et navigateur piloté par un robot : rien du tout (ni SDK chargé)
  for(const [nom,opt] of [['hors connexion',{horsLigne:true}],['navigateur piloté (webdriver)',{robot:true}]]){
   ({ctx,page,erreurs}=await ouvrir(browser,base,'index.html',{},opt));
   const demandes=[];page.on('request',r=>{if(/supabase/.test(r.url()))demandes.push(r.url());});
   await page.waitForLoadState('load');await attendre(3600);
   f=await faux(page);
   assert.equal(f.clients.length+f.canaux.length,0,nom);
   assert.deepEqual(demandes,[],nom+' : SDK et configuration pas chargés');
   assert.equal(await texte(page),' ');
   ok(nom+' : aucune connexion, SDK pas chargé, rien affiché');
   toutes.push(...erreurs);await ctx.close();
  }

  // Ma carte de joueur : pastille présente ; client des comptes réutilisé s'il existe
  ({ctx,page,erreurs}=await ouvrir(browser,base,'carte.html',{n:4}));
  await page.waitForFunction(()=>/4 joueurs/.test(document.querySelector('#pa-presence [data-presence-texte]').textContent));
  f=await faux(page);assert.equal(f.clients.length,1);assert.equal(f.clients[0].opts.auth.persistSession,false);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),390);
  ok('carte.html : « 4 joueurs sur le site en ce moment », client sans session');
  toutes.push(...erreurs);await ctx.close();
  ({ctx,page,erreurs}=await ouvrir(browser,base,'carte.html',{n:2},{compte:true}));
  await page.waitForFunction(()=>/2 joueurs/.test(document.querySelector('#pa-presence [data-presence-texte]').textContent));
  f=await faux(page);
  assert.equal(f.clients.length,1,'aucun second client');assert.equal(f.clients[0].opts.marque,'compte');
  ok('carte.html avec compte : le client des comptes (PA_COMPTE.client) est réutilisé, aucun second client');
  toutes.push(...erreurs);await ctx.close();

  assert.deepEqual(toutes,[]);
  ok('aucune erreur console ni ressource manquante');
  console.log('TOTAL '+nb+' contrôles réussis.');
 }finally{await browser.close();serveur.close();}
})().catch(e=>{console.error(e);serveur.close();process.exitCode=1;});
