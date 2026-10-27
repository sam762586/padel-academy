/* Vérification de la connexion (connexion.html, connexion.js) et de son branchement dans le site :
   1) gabarit : « Mon espace » marqué (data-espace), section active sur connexion.html et compte.html ;
   2) lien « Mon espace » : connexion.html?suite=espace.html sans session, espace.html avec (pages avec et sans compte.js,
      page en sous-dossier) ;
   3) espace.html sans compte : redirection vers connexion.html ; connecté, l'espace s'affiche ;
   4) compte.html : plus de formulaire de lien magique, redirection vers connexion.html si non connecté ;
   5) connexion.html : mot de passe faux refusé, connexion puis retour sur la page demandée, adresse de retour externe
      refusée, fiche tournoi acceptée ; compte confirmé → compte.html?bienvenue=1, profil en premier ;
   6) liens « Connecte-toi » du site, mobile 390 px, aucune erreur console.
   Supabase est simulé (aucun appel réseau). Lancer depuis la racine du site : node scripts/verifier-connexion.cjs */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const G=require('./gabarit');
const racine=path.join(__dirname,'..');
let nb=0;
function ok(nom){nb++;console.log('OK '+nom);}
process.on('unhandledRejection',e=>{if(e&&e.name==='TargetClosedError')return;console.error(e);process.exitCode=1;});

// Supabase simulé : session dans sessionStorage « session » ; mot de passe accepté : « bonmotdepasse »
const SDK=`(function(){
 const session=()=>{const s=sessionStorage.getItem('session');return s?{user:{id:'u1',email:'joueur@test.fr'}}:null;};
 const ecouteurs=[];
 const requete=()=>{const q=new Proxy({},{get(_,k){
  if(k==='then')return (ok)=>ok({data:[],error:null});
  if(k==='maybeSingle'||k==='single')return ()=>Promise.resolve({data:null,error:null});
  return ()=>q;}});return q;};
 window.supabase={createClient(){return {
  auth:{
   getSession:async()=>({data:{session:session()}}),
   onAuthStateChange:f=>{ecouteurs.push(f);return {data:{subscription:{unsubscribe(){}}}};},
   signInWithPassword:async({password})=>{if(password!=='bonmotdepasse')return {data:{},error:{message:'Invalid login credentials'}};
    sessionStorage.setItem('session','1');ecouteurs.forEach(f=>f('SIGNED_IN',session()));return {data:{session:session()},error:null};},
   signUp:async()=>({data:{user:{identities:[{}]},session:null},error:null}),
   signOut:async()=>{sessionStorage.removeItem('session');ecouteurs.forEach(f=>f('SIGNED_OUT',null));return {error:null};},
   signInWithOtp:async()=>({error:null}),resetPasswordForEmail:async()=>({error:null}),updateUser:async()=>({error:null})},
  from:requete,rpc:async()=>({data:null,error:null}),functions:{invoke:async()=>({data:null,error:null})}
 };}};
})();`;

const serveur=http.createServer((req,res)=>{
 const rel=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\//,'')||'index.html';
 const p=path.resolve(racine,rel);
 if(!p.startsWith(racine+path.sep)){res.writeHead(403);res.end();return;}
 fs.readFile(p,(e,b)=>{if(e){res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.webp':'image/webp','.webmanifest':'application/manifest+json'})[path.extname(p)]||'text/plain');res.end(b);
 });
});
(async()=>{
 // 1. Gabarit
 assert.match(G.nav('connexion.html'),/<a href="espace\.html" class="active" data-espace>Mon espace/);
 assert.match(G.nav('compte.html'),/<a href="espace\.html" class="active" data-espace>Mon espace/);
 assert.match(G.nav('espace.html'),/class="active" aria-current="page" data-espace>Mon espace/);
 assert.equal((G.nav('technique.html').match(/data-espace/g)||[]).length,1);
 const htmlConnexion=fs.readFileSync(path.join(racine,'connexion.html'),'utf8');
 assert.ok(htmlConnexion.includes(G.nav('connexion.html'))&&!/<style/.test(htmlConnexion));
 assert.ok(!fs.readFileSync(path.join(racine,'compte.html'),'utf8').includes('compte-form-mail'));
 ok('gabarit : « Mon espace » marqué, section active sur connexion et compte ; connexion.html sans style en ligne ; compte.html sans lien magique');

 await new Promise(r=>serveur.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+serveur.address().port;
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const erreurs=[];
 const ouvrir=async()=>{
  const ctx=await browser.newContext({serviceWorkers:'block',viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  // La dernière route déclarée est prioritaire : Supabase simulé après le filet « tout le reste »
  await ctx.route('https://**',r=>r.fulfill({body:''}));
  await ctx.route('**/supabase-js@*/**',r=>r.fulfill({contentType:'text/javascript',body:SDK}));
  const page=await ctx.newPage();
  page.on('pageerror',e=>erreurs.push(e.message));
  page.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))erreurs.push(m.text());});
  return {ctx,page};
 };
 const hrefEspace=page=>page.getAttribute('#nav-menu a[data-espace]','href');
 try{
  // 2. Lien « Mon espace »
  let {ctx,page}=await ouvrir();
  await page.goto(base+'/technique.html');
  assert.equal(await hrefEspace(page),'connexion.html?suite=espace.html');
  const fiche=fs.readdirSync(path.join(racine,'tournoi'))[0];
  await page.goto(base+'/tournoi/'+fiche);
  assert.equal(await hrefEspace(page),'../connexion.html?suite=espace.html');
  await page.evaluate(()=>localStorage.setItem('sb-test-auth-token',JSON.stringify({access_token:'jeton',refresh_token:'r'})));
  await page.goto(base+'/technique.html');
  assert.equal(await hrefEspace(page),'espace.html');
  await page.evaluate(()=>localStorage.removeItem('sb-test-auth-token'));
  ok('« Mon espace » : connexion.html?suite=espace.html sans session (racine et sous-dossier), espace.html avec une session gardée');
  // 3. espace.html sans compte : redirection vers la connexion (décision du 27/10/2026)
  await page.goto(base+'/espace.html');
  await page.waitForURL(/connexion\.html\?suite=espace\.html$/);
  ok('espace.html sans compte : redirection vers connexion.html?suite=espace.html');
  // 4. compte.html non connecté : redirection
  await page.goto(base+'/compte.html');
  await page.waitForURL(/connexion\.html\?suite=compte\.html$/);
  ok('compte.html non connecté : redirection vers connexion.html?suite=compte.html');
  // 5. Connexion : mauvais mot de passe, puis bon, retour sur la page demandée
  await page.goto(base+'/connexion.html?suite=score.html');
  await page.fill('#cx-email','joueur@test.fr');await page.fill('#cx-mdp','mauvais1');await page.click('#cx-valider');
  await page.waitForSelector('#cx-connexion-msg:not([hidden])');
  assert.match(await page.textContent('#cx-connexion-msg'),/incorrect/);
  await page.fill('#cx-mdp','bonmotdepasse');await page.click('#cx-valider');
  await page.waitForURL(/score\.html$/);
  assert.equal(await hrefEspace(page),'espace.html');
  // Connecté : l'espace s'affiche, sans redirection
  await page.goto(base+'/espace.html');await page.waitForSelector('#esp-bord .bord-bloc');
  assert.match(page.url(),/espace\.html$/);assert.equal(await page.locator('#espace').isVisible(),true);
  ok('connexion : mot de passe faux refusé, puis retour sur la page demandée ; connecté, l\'espace s\'affiche');
  // Déjà connecté : connexion.html renvoie vers la suite ; adresses de retour vérifiées
  await page.goto(base+'/connexion.html?suite='+encodeURIComponent('https://exemple.com/piege.html'));
  await page.waitForURL(/\/espace\.html$/);
  await page.goto(base+'/connexion.html?suite='+encodeURIComponent('tournoi/'+fiche));
  await page.waitForURL(new RegExp('tournoi/'+fiche.replace('.','\\.')+'$'));
  ok('adresse de retour externe refusée (espace.html), fiche tournoi acceptée');
  // Compte confirmé : bienvenue, profil en premier
  await page.goto(base+'/connexion.html?confirme=1&suite=compte.html');
  await page.waitForURL(/compte\.html(\?bienvenue=1)?$/);
  await page.waitForSelector('#compte-profil:not([hidden])');
  await page.waitForFunction(()=>!location.search);
  assert.match(await page.textContent('#compte-msg'),/Bienvenue/);
  const ordre=await page.evaluate(()=>{const p=document.getElementById('compte-profil'),c=document.querySelector('.esp-lien-carte');return !!(p.compareDocumentPosition(c)&Node.DOCUMENT_POSITION_FOLLOWING);});
  assert.equal(ordre,true);
  assert.equal(await page.evaluate(()=>document.activeElement.id),'pf-pseudo');
  // Rechargement : pas de nouvel accueil
  await page.reload();await page.waitForSelector('#compte-profil:not([hidden])');await page.waitForTimeout(300);
  assert.ok(!/Bienvenue/.test(await page.textContent('#compte-msg'))||await page.locator('#compte-msg').isHidden());
  ok('premier passage : compte.html?bienvenue=1, message d\'accueil, profil en premier, pseudo sélectionné, une seule fois');
  // Déconnexion depuis compte.html : direction la connexion
  await page.click('#compte-deco');
  await page.waitForURL(/connexion\.html\?suite=compte\.html$/);
  ok('déconnexion depuis compte.html : retour à la connexion');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),390);
  await ctx.close();
  // 6. Liens « Connecte-toi » du site
  const src=f=>fs.readFileSync(path.join(racine,f),'utf8');
  assert.ok(src('assets/js/score.js').includes('connexion.html?suite=score.html'));
  assert.ok(src('assets/js/quiz-niveau.js').includes('connexion.html?suite=niveau.html&onglet=inscription'));
  assert.ok(src('partenaires.html').includes('href="connexion.html?suite=partenaires.html"'));
  assert.ok(src('assets/js/communaute-tournoi.js').includes('"connexion.html?suite="'));
  ok('liens « Connecte-toi » : compteur, test de niveau, partenaires, fiches tournoi');
  assert.deepEqual(erreurs,[]);
  ok('aucune erreur console, aucun débordement à 390 px');
  console.log('TOTAL '+nb+' contrôles réussis.');
 }finally{await browser.close();serveur.close();}
})().catch(e=>{console.error(e);serveur.close();process.exitCode=1;});
