/* Vérification de la connexion (connexion.html, connexion.js) et de son branchement dans le site :
   1) gabarit : « Mon espace » marqué (data-espace), section active sur connexion.html et compte.html ;
   2) lien « Mon espace » : connexion.html?suite=espace.html sans session, espace.html avec (pages avec et sans compte.js,
      page en sous-dossier) ;
   3) espace.html sans compte : redirection vers connexion.html ; connecté, l'espace s'affiche ;
   4) compte.html : plus de formulaire de lien magique, redirection vers connexion.html si non connecté ;
   5) connexion.html : mot de passe faux refusé, connexion puis retour sur la page demandée, adresse de retour externe
      refusée, fiche tournoi acceptée ; compte confirmé → compte.html?bienvenue=1, profil en premier ;
   6) liens « Connecte-toi » du site, mobile 390 px, aucune erreur console ;
   7) accessibilité (S3) : zones de message toujours présentes, erreur annoncée (role=alert) avec aria-invalid,
      aria-describedby et focus sur le champ ; onglets en boutons aria-pressed ; bouton « œil » au nom fixe ;
      liens-boutons ; focus sur la confirmation d'inscription ;
   8) sécurité (S4) : error_description de l'adresse jamais affiché, ?mode=nouveau refusé sans vrai retour de récupération,
      case « J'ai 15 ans ou plus » obligatoire (e-mail et Google) et enregistrée dans les métadonnées, anti-cadre ;
   9) flux PKCE (6.6) : client en flowType "pkce" ; inscription, lien magique, Google et mot de passe oublié reviennent
      sur connexion.html ; ?code= échangé seulement avec le vérificateur de ce navigateur ; récupération seulement après
      un code échangé avec le vérificateur « mot de passe oublié » ; autre navigateur, code refusé ou périmé : message
      clair ; lien piégé #access_token=… : aucune session, adresse nettoyée, visiteur connecté pas déconnecté ;
      correctif P2 : supabase-js ne lit plus l'adresse (detectSessionInUrl:false, échange manuel du ?code= avec
      vérificateur) : ?access_token=, #%61ccess_token=, ?error_description=, #error_description= ne déconnectent plus ;
      ?code= arrivé sur une fiche tournoi (sans SDK) transmis à connexion.html ;
   10) déconnexion : session inconnue du serveur (AuthSessionMissingError de supabase-js 2.45.4) → session terminée sur
      l'appareil (jeton local effacé), y compris après la suppression du compte ; réseau coupé : message, rien d'effacé.
   Supabase est simulé (aucun appel réseau). Lancer depuis la racine du site : node scripts/verifier-connexion.cjs */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const G=require('./gabarit');
const racine=path.join(__dirname,'..');
let nb=0;
function ok(nom){nb++;console.log('OK '+nom);}
process.on('unhandledRejection',e=>{if(e&&e.name==='TargetClosedError')return;console.error(e);process.exitCode=1;});

// Supabase simulé : session dans sessionStorage « session » ; mot de passe accepté : « bonmotdepasse ».
// Imite supabase-js 2.45.4 : avec flowType "pkce", les demandes qui produisent un lien (signUp, signInWithOtp,
// signInWithOAuth, resetPasswordForEmail) posent un vérificateur dans localStorage (« …/PASSWORD_RECOVERY » pour la
// récupération) ; exchangeCodeForSession(code) lit et retire ce vérificateur (code « bon » ou « neuf » : session ouverte,
// SIGNED_IN, redirectType ; autre code : erreur bad_code_verifier, « perime » : flow_state_expired, session en place
// gardée) ; jamais d'événement PASSWORD_RECOVERY en PKCE. Avec detectSessionInUrl:true (plus utilisé depuis le
// correctif P2), l'initialisation lirait l'adresse comme le vrai SDK : query et fragment, clés décodées ; un
// access_token ou un error_description en PKCE : erreur et session supprimée (c'est la déconnexion par lien forgé).
const SDK=`(function(){
 // « jetonLocal » : la session n'existe que tant que le jeton est aussi dans localStorage (comme le vrai SDK, qui la lit là)
 const session=()=>{const s=sessionStorage.getItem('session');
  if(s&&sessionStorage.getItem('jetonLocal')&&!localStorage.getItem('sb-bvhfizdfgccrkhdfqzkf-auth-token'))return null;
  return s?{user:{id:'u1',email:'joueur@test.fr',created_at:s==='nouveau'?new Date().toISOString():'2026-01-01T00:00:00Z'}}:null;};
 const ecouteurs=[];
 // Appels notés dans sessionStorage « appels » (gardés d'une page à l'autre)
 const noter=(nom,args)=>{const l=JSON.parse(sessionStorage.getItem('appels')||'[]');l.push({nom,args});sessionStorage.setItem('appels',JSON.stringify(l));};
 const prevenir=(ev)=>setTimeout(()=>ecouteurs.forEach(f=>f(ev,session())),0);
 const requete=()=>{const q=new Proxy({},{get(_,k){
  if(k==='then')return (ok)=>ok({data:[],error:null});
  if(k==='maybeSingle'||k==='single')return ()=>Promise.resolve({data:null,error:null});
  return ()=>q;}});return q;};
 window.supabase={createClient(url,cleApi,options){
  const auth=(options&&options.auth)||{};
  window.__optionsAuth=auth;
  const pkce=auth.flowType==='pkce';
  const cleV='sb-'+new URL(url).hostname.split('.')[0]+'-auth-token-code-verifier';
  const poserVerificateur=recup=>{if(pkce)localStorage.setItem(cleV,JSON.stringify('verif123'+(recup?'/PASSWORD_RECOVERY':'')));};
  const supprimerSession=()=>{if(sessionStorage.getItem('session'))noter('sessionSupprimee',{});sessionStorage.removeItem('session');};
  // Échange PKCE (comme _exchangeCodeForSession de 2.45.4 : vérificateur retiré dans tous les cas, session gardée en cas d'échec)
  const echanger=code=>{
   const verif=JSON.parse(localStorage.getItem(cleV)||'null');
   localStorage.removeItem(cleV);
   noter('tentativeEchange',{code});
   if(!verif||(code!=='bon'&&code!=='neuf'))
    return {data:{session:null,user:null,redirectType:null},error:code==='perime'?{code:'flow_state_expired',message:'invalid flow state, flow state has expired'}:{code:'bad_code_verifier',message:'code challenge does not match previously saved code verifier'}};
   noter('echange',{code});
   sessionStorage.setItem('session',code==='neuf'?'nouveau':'1');
   prevenir('SIGNED_IN');
   return {data:{session:session(),user:session().user,redirectType:verif.split('/')[1]||null},error:null};
  };
  const init=(async()=>{
   await new Promise(r=>setTimeout(r,0));
   if(!auth.detectSessionInUrl)return {error:null};
   const u=new URL(location.href),p={};
   new URLSearchParams(u.hash.slice(1)).forEach((v,k)=>p[k]=v);u.searchParams.forEach((v,k)=>p[k]=v);
   if(p.access_token||p.refresh_token)noter('jetonVuParLeSdk',{});
   if(pkce&&p.code&&localStorage.getItem(cleV)){
    const r=echanger(p.code);if(r.error){supprimerSession();return {error:r.error};}
    u.searchParams.delete('code');history.replaceState(history.state,'',u.toString());return {error:null};
   }
   if(p.access_token||p.error_description){
    if(pkce){supprimerSession();return {error:{message:'Not a valid PKCE flow url.'}};}
    if(p.access_token){sessionStorage.setItem('session','1');location.hash='';prevenir(p.type==='recovery'?'PASSWORD_RECOVERY':'SIGNED_IN');}
   }
   return {error:null};
  })();
  return {
  auth:{
   initialize:()=>init,
   exchangeCodeForSession:async code=>{await init;return echanger(code);},
   getSession:async()=>{await init;return {data:{session:session()}};},
   onAuthStateChange:f=>{ecouteurs.push(f);return {data:{subscription:{unsubscribe(){}}}};},
   signInWithPassword:async({password})=>{if(password!=='bonmotdepasse')return {data:{},error:{message:'Invalid login credentials'}};
    sessionStorage.setItem('session','1');ecouteurs.forEach(f=>f('SIGNED_IN',session()));return {data:{session:session()},error:null};},
   signUp:async(o)=>{poserVerificateur(false);noter('signUp',{email:o.email,options:o.options});return {data:{user:{identities:[{}]},session:null},error:null};},
   signInWithOAuth:async(o)=>{poserVerificateur(false);noter('signInWithOAuth',o);return {data:{},error:null};},
   // « signOutManquant » : le serveur ne connaît plus la session (session_not_found) ; comme 2.45.4, le SDK renvoie
   // AuthSessionMissingError et GARDE la session locale, quel que soit le scope. « signOutReseau » : réseau coupé.
   signOut:async(o)=>{noter('signOut',o||{});
    if(sessionStorage.getItem('signOutManquant'))return {error:{name:'AuthSessionMissingError',message:'Auth session missing!',status:400}};
    if(sessionStorage.getItem('signOutReseau'))return {error:{name:'AuthRetryableFetchError',message:'Failed to fetch',status:0}};
    sessionStorage.removeItem('session');ecouteurs.forEach(f=>f('SIGNED_OUT',null));return {error:null};},
   signInWithOtp:async(o)=>{poserVerificateur(false);noter('signInWithOtp',o);return {error:null};},
   resetPasswordForEmail:async(email,o)=>{poserVerificateur(true);noter('resetPasswordForEmail',{email,options:o});return {error:null};},
   updateUser:async(o)=>{noter('updateUser',o);return {error:null};}},
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
 const htmlConnexion=fs.readFileSync(path.join(racine,'connexion.html'),'utf8').replace(/\r\n/g,'\n');
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
  await ctx.route(/^https:/,r=>r.fulfill({body:''}));
  await ctx.route('**/assets/vendor/supabase-*.js*',r=>r.fulfill({contentType:'text/javascript',body:SDK}));
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
  await page.waitForFunction(()=>document.getElementById('cx-connexion-msg').textContent.trim());
  assert.match(await page.textContent('#cx-connexion-msg'),/incorrect/);
  // Erreur annoncée, champs marqués et reliés au message, focus sur l'e-mail
  assert.equal(await page.getAttribute('#cx-connexion-msg','role'),'alert');
  for(const id of ['cx-email','cx-mdp']){
   assert.equal(await page.getAttribute('#'+id,'aria-invalid'),'true');
   assert.match(await page.getAttribute('#'+id,'aria-describedby'),/\bcx-connexion-msg\b/);
  }
  assert.equal(await page.evaluate(()=>document.activeElement.id),'cx-email');
  ok('erreur de connexion : role=alert, aria-invalid et aria-describedby sur les champs, focus sur l\'e-mail');
  await page.fill('#cx-mdp','bonmotdepasse');await page.click('#cx-valider');
  await page.waitForURL(/\/score\.html$/);
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
  await page.waitForURL(/\/compte\.html(\?bienvenue=1)?$/);
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
  // Session inconnue du serveur (fermée ailleurs, compte supprimé) : AuthSessionMissingError → déconnexion terminée ici
  const cleJeton='sb-bvhfizdfgccrkhdfqzkf-auth-token';
  const ouvrirSessionLocale=()=>page.evaluate(c=>{sessionStorage.setItem('session','1');sessionStorage.setItem('jetonLocal','1');
   localStorage.setItem(c,JSON.stringify({access_token:'a',refresh_token:'r',expires_at:4102444800}));localStorage.setItem(c+'-code-verifier','"v"');},cleJeton);
  await ouvrirSessionLocale();
  await page.evaluate(()=>sessionStorage.setItem('signOutReseau','1'));
  await page.goto(base+'/compte.html');await page.waitForSelector('#compte-profil:not([hidden])');
  await page.click('#compte-deco');
  await page.waitForFunction(()=>/réseau/.test(document.getElementById('pf-msg').textContent));
  assert.match(page.url(),/\/compte\.html$/);
  assert.ok(await page.evaluate(c=>!!localStorage.getItem(c),cleJeton),'réseau coupé : rien n\'est effacé');
  assert.equal(await page.isEnabled('#compte-deco'),true);
  await page.evaluate(()=>{sessionStorage.removeItem('signOutReseau');sessionStorage.setItem('signOutManquant','1');});
  await page.click('#compte-deco');
  await page.waitForURL(/connexion\.html\?suite=compte\.html$/);
  assert.equal(await page.evaluate(c=>localStorage.getItem(c),cleJeton),null,'plus de jeton local');
  assert.equal(await page.evaluate(c=>localStorage.getItem(c+'-code-verifier'),cleJeton),null);
  assert.ok((await page.evaluate(()=>JSON.parse(sessionStorage.getItem('appels')||'[]').filter(a=>a.nom==='signOut').map(a=>a.args.scope||'global'))).includes('local'));
  await page.waitForTimeout(200);
  assert.match(page.url(),/connexion\.html\?suite=compte\.html$/,'la page de connexion reste affichée (déconnecté)');
  assert.ok(await page.isVisible('#cx-form-connexion'));
  assert.equal(await hrefEspace(page),'connexion.html?suite=espace.html');
  ok('« Me déconnecter » quand le serveur ne connaît plus la session (AuthSessionMissingError) : déconnecté, plus de jeton local ; réseau coupé : message, rien d\'effacé');
  // Suppression du compte : même fin de session locale si le serveur a déjà oublié la session
  await ouvrirSessionLocale();
  await page.goto(base+'/compte.html');await page.waitForSelector('#compte-profil:not([hidden])');
  // (compte.html renvoie vers la connexion dès que la session est terminée)
  await page.evaluate(()=>{window.PA_COMPTE.deleteAccount({effacer:false});});
  await page.waitForURL(/connexion\.html\?suite=compte\.html$/);
  assert.equal(await page.evaluate(c=>localStorage.getItem(c),cleJeton),null);
  await page.evaluate(()=>{['signOutManquant','jetonLocal','session'].forEach(k=>sessionStorage.removeItem(k));});
  ok('suppression du compte puis session inconnue du serveur : session terminée sur l\'appareil');
  // Retour de Google ou d'un lien : erreurs affichées, jeton arrivé sur l'accueil transmis à la connexion, compte neuf → profil
  await page.goto(base+'/connexion.html?suite=espace.html#error=server_error&error_code=unexpected_failure&error_description=Database+error+saving+new+user');
  await page.waitForFunction(()=>document.getElementById('cx-msg').textContent.trim());
  assert.match(await page.textContent('#cx-msg'),/problème de notre côté/);
  assert.ok(!/Database/.test(await page.textContent('#cx-msg')),'le texte de l\'adresse n\'est pas repris');
  assert.ok(!/error/.test(await page.evaluate(()=>location.href)),'adresse nettoyée');
  await page.goto(base+'/connexion.html?error=access_denied&error_code=access_denied&error_description=User+cancelled');
  await page.waitForFunction(()=>document.getElementById('cx-msg').textContent.trim());
  assert.match(await page.textContent('#cx-msg'),/Connexion annulée/);
  ok('retour de Google : erreur affichée (création, annulation), adresse nettoyée');
  // Google en PKCE : le vérificateur est posé au départ (même navigateur), le code est échangé au retour
  await page.evaluate(()=>{sessionStorage.clear();sessionStorage.setItem('pa-age-15-google','2026-10-29T10:00:00.000Z');
   localStorage.setItem('sb-bvhfizdfgccrkhdfqzkf-auth-token-code-verifier',JSON.stringify('verif123'));});
  await page.goto(base+'/connexion.html?suite=espace.html&code=neuf');
  await page.waitForURL(/\/compte\.html(\?bienvenue=1)?$/);
  await page.waitForSelector('#compte-profil:not([hidden])');
  assert.match(await page.textContent('#compte-msg'),/Bienvenue/);
  const majAge=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('appels')||'[]').filter(a=>a.nom==='updateUser'));
  assert.deepEqual(majAge.map(a=>a.args),[{data:{age_15_confirme:true,age_15_confirme_le:'2026-10-29T10:00:00.000Z'}}]);
  assert.equal(await page.evaluate(()=>sessionStorage.getItem('pa-age-15-google')),null);
  assert.equal(await page.evaluate(()=>localStorage.getItem('sb-bvhfizdfgccrkhdfqzkf-auth-token-code-verifier')),null,'vérificateur consommé');
  ok('compte créé à l\'instant avec Google (?code= échangé) : direction le profil (compte.html?bienvenue=1), 15 ans enregistrés dans les métadonnées');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),390);
  await ctx.close();

  // 7. Accessibilité de la page de connexion
  ({ctx,page}=await ouvrir());
  await page.goto(base+'/connexion.html');
  await page.waitForFunction(()=>window.PA_COMPTE&&window.PA_COMPTE.actif);await page.waitForTimeout(100);
  assert.equal(await page.locator('.cx-panneau .acc-msg[hidden], #cx-msg[hidden]').count(),0,'zones de message jamais masquées');
  assert.equal(await page.locator('[role=tab], [role=tabpanel], [role=tablist]').count(),0);
  assert.deepEqual(await page.$$eval('.cx-onglet',l=>l.map(b=>b.tagName+':'+b.getAttribute('aria-pressed'))),['BUTTON:true','BUTTON:false']);
  await page.click('.cx-onglet[data-cible="inscription"]');
  assert.deepEqual(await page.$$eval('.cx-onglet',l=>l.map(b=>b.getAttribute('aria-pressed'))),['false','true']);
  assert.equal(await page.evaluate(()=>document.activeElement.dataset.cible),'inscription','le focus reste sur le bouton');
  assert.ok(await page.isVisible('#cx-inscription'));assert.ok(await page.isHidden('#cx-connexion'));
  ok('onglets : boutons aria-pressed (sans role=tab), le focus reste sur le bouton choisi');
  assert.equal(await page.locator('a[href="#"]').count(),0);
  assert.deepEqual(await page.$$eval('[data-aller]',l=>[...new Set(l.map(b=>b.tagName+':'+b.type))]),['BUTTON:button']);
  await page.click('.cx-onglet[data-cible="connexion"]');
  await page.click('#cx-connexion [data-aller="oubli"]');
  assert.ok(await page.isVisible('#cx-oubli'));
  assert.equal(await page.getAttribute('#cx-oubli','role'),'region');
  assert.equal(await page.evaluate(()=>document.getElementById(document.getElementById('cx-oubli').getAttribute('aria-labelledby')).textContent),'Mot de passe oublié');
  assert.equal(await page.evaluate(()=>document.activeElement.id),'cx-oubli-titre');
  assert.equal(await page.getAttribute('#cx-nouveau','role'),'region');
  await page.click('#cx-oubli [data-aller="connexion"]');
  assert.equal(await page.evaluate(()=>document.activeElement.dataset.cible),'connexion');
  ok('liens du formulaire : vrais boutons ; « mot de passe oublié » en role=region nommé par son titre, focus sur le titre');
  const oeil=page.locator('.cx-oeil[data-pour="cx-mdp"]');
  assert.equal(await oeil.getAttribute('aria-label'),'Afficher le mot de passe');
  const texteOeil=await oeil.textContent();
  await oeil.click();
  assert.equal(await oeil.getAttribute('aria-pressed'),'true');assert.equal(await page.getAttribute('#cx-mdp','type'),'text');
  assert.equal(await oeil.getAttribute('aria-label'),'Afficher le mot de passe');assert.equal(await oeil.textContent(),texteOeil);
  await oeil.click();
  assert.equal(await oeil.getAttribute('aria-pressed'),'false');assert.equal(await page.getAttribute('#cx-mdp','type'),'password');
  ok('bouton « œil » : nom fixe « Afficher le mot de passe », état dans aria-pressed');
  // E-mail invalide : erreur sur le champ
  await page.fill('#cx-email','pas-un-email');await page.click('#cx-valider');
  assert.equal(await page.getAttribute('#cx-email','aria-invalid'),'true');assert.equal(await page.evaluate(()=>document.activeElement.id),'cx-email');
  await page.fill('#cx-email','joueur@test.fr');await page.click('#cx-valider');
  assert.equal(await page.getAttribute('#cx-email','aria-invalid'),null,'erreur corrigée : marque retirée');
  assert.equal(await page.getAttribute('#cx-mdp','aria-invalid'),'true');assert.equal(await page.evaluate(()=>document.activeElement.id),'cx-mdp');
  ok('erreur corrigée : marque retirée ; nouvelle erreur sur le champ suivant');

  // 8. Case « J'ai 15 ans ou plus »
  await page.click('.cx-onglet[data-cible="inscription"]');
  await page.fill('#ins-email','nouveau@test.fr');await page.fill('#ins-mdp','motdepasse1');await page.fill('#ins-mdp2','motdepasse1');await page.check('#ins-charte');
  await page.click('#ins-valider');
  assert.match(await page.textContent('#cx-inscription-msg'),/15\sans ou plus/);
  assert.equal(await page.getAttribute('#cx-inscription-msg','role'),'alert');
  assert.equal(await page.getAttribute('#ins-age','aria-invalid'),'true');assert.equal(await page.evaluate(()=>document.activeElement.id),'ins-age');
  assert.equal(await page.evaluate(()=>(JSON.parse(sessionStorage.getItem('appels')||'[]')).filter(a=>a.nom==='signUp').length),0);
  // Google sans la case : rien ne part
  await page.click('#cx-inscription .cx-google');
  assert.equal(await page.evaluate(()=>(JSON.parse(sessionStorage.getItem('appels')||'[]')).filter(a=>a.nom==='signInWithOAuth').length),0);
  assert.equal(await page.evaluate(()=>document.activeElement.id),'ins-age');
  await page.check('#ins-age');await page.click('#ins-valider');
  await page.waitForFunction(()=>document.getElementById('cx-form-inscription').hidden);
  const inscription=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('appels')).find(a=>a.nom==='signUp'));
  assert.equal(inscription.args.options.data.age_15_confirme,true);assert.ok(!isNaN(Date.parse(inscription.args.options.data.age_15_confirme_le)));
  assert.equal(await page.evaluate(()=>document.activeElement.id),'cx-inscription-msg');
  assert.equal(await page.getAttribute('#cx-inscription-msg','role'),'status');
  ok('inscription : case 15 ans obligatoire (message annoncé, focus sur la case), confirmation dans options.data, focus sur la confirmation');
  await page.click('.cx-onglet[data-cible="connexion"]');
  await page.click('#cx-connexion .cx-google');
  assert.match(await page.textContent('#cx-connexion-msg'),/15\sans ou plus/);
  assert.equal(await page.evaluate(()=>document.activeElement.id),'cx-age');
  await page.check('#cx-age');await page.click('#cx-connexion .cx-google');
  await page.waitForFunction(()=>(JSON.parse(sessionStorage.getItem('appels')||'[]')).some(a=>a.nom==='signInWithOAuth'));
  assert.ok(await page.evaluate(()=>!isNaN(Date.parse(sessionStorage.getItem('pa-age-15-google')))));
  ok('Google : confirmation des 15 ans demandée avant signInWithOAuth, gardée pour le retour');
  await ctx.close();

  // error_description jamais affiché ; code inconnu → message générique
  ({ctx,page}=await ouvrir());
  await page.goto(base+'/connexion.html?error=x&error_code=inconnu&error_description='+encodeURIComponent('Appelle le 0612345678 ou va sur piege.example'));
  await page.waitForFunction(()=>document.getElementById('cx-msg').textContent.trim());
  assert.equal(await page.textContent('#cx-msg'),'La connexion n\'a pas abouti. Réessaie.');
  await page.goto(base+'/connexion.html#error=access_denied&error_description='+encodeURIComponent('<b>piège</b>'));
  await page.waitForFunction(()=>document.getElementById('cx-msg').textContent.trim());
  assert.ok(!/piège/.test(await page.textContent('#cx-msg')));
  ok('retour en erreur : error_description ignoré, seuls des messages connus s\'affichent');
  // ?mode=nouveau : sans PASSWORD_RECOVERY, pas de formulaire ; connecté, direction la suite
  await page.goto(base+'/connexion.html?mode=nouveau');
  await page.waitForFunction(()=>document.getElementById('cx-msg').textContent.trim());
  assert.ok(await page.isHidden('#cx-nouveau'));assert.match(await page.textContent('#cx-msg'),/plus valable/);
  await page.evaluate(()=>sessionStorage.setItem('session','1'));
  await page.goto(base+'/connexion.html?mode=nouveau&suite=score.html');
  await page.waitForURL(/\/score\.html$/);
  await page.evaluate(()=>sessionStorage.clear());
  // Code échangé mais vérificateur d'une connexion ordinaire (pas « mot de passe oublié ») : pas de formulaire
  await page.evaluate(()=>localStorage.setItem('sb-bvhfizdfgccrkhdfqzkf-auth-token-code-verifier',JSON.stringify('verif123')));
  await page.goto(base+'/connexion.html?mode=nouveau&suite=score.html&code=bon');
  await page.waitForURL(/\/score\.html$/);
  await page.evaluate(()=>sessionStorage.clear());
  ok('?mode=nouveau : pas de formulaire seul, ni pour une session déjà ouverte, ni pour un code d\'une connexion ordinaire');
  await ctx.close();

  // 9. Flux PKCE (revue de sécurité 6.6)
  ({ctx,page}=await ouvrir());
  await page.goto(base+'/connexion.html');
  await page.waitForFunction(()=>window.PA_COMPTE&&window.PA_COMPTE.actif);
  const optionsAuth=await page.evaluate(()=>window.__optionsAuth);
  assert.deepEqual(optionsAuth,{flowType:'pkce',persistSession:true,autoRefreshToken:true,detectSessionInUrl:false});
  ok('client Supabase en flux PKCE (persistSession, autoRefreshToken), adresse jamais lue par le SDK (detectSessionInUrl:false)');
  const appels=nom=>page.evaluate(n=>JSON.parse(sessionStorage.getItem('appels')||'[]').filter(a=>a.nom===n).map(a=>a.args),nom);
  const verificateur=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('sb-bvhfizdfgccrkhdfqzkf-auth-token-code-verifier')));
  const poserVerif=()=>page.evaluate(()=>localStorage.setItem('sb-bvhfizdfgccrkhdfqzkf-auth-token-code-verifier',JSON.stringify('verif123')));
  const origine=base+'/connexion.html';
  // Inscription : retour sur connexion.html?confirme=1&suite=compte.html
  await page.click('.cx-onglet[data-cible="inscription"]');
  await page.fill('#ins-email','nouveau@test.fr');await page.fill('#ins-mdp','motdepasse1');await page.fill('#ins-mdp2','motdepasse1');
  await page.check('#ins-age');await page.check('#ins-charte');await page.click('#ins-valider');
  await page.waitForFunction(()=>document.getElementById('cx-form-inscription').hidden);
  assert.equal((await appels('signUp'))[0].options.emailRedirectTo,origine+'?confirme=1&suite=compte.html');
  assert.equal(await verificateur(),'verif123');
  // Lien magique : retour sur connexion.html avec la suite
  await page.goto(base+'/connexion.html?suite=score.html');
  await page.evaluate(()=>document.querySelector('.cx-lien-magique').open=true);
  await page.fill('#lien-email','joueur@test.fr');await page.click('#lien-valider');
  await page.waitForFunction(()=>/Lien envoyé/.test(document.getElementById('cx-lien-msg').textContent));
  const otp=(await appels('signInWithOtp'))[0];
  assert.equal(otp.options.emailRedirectTo,origine+'?suite=score.html');assert.equal(otp.options.shouldCreateUser,false);
  // Google : retour sur connexion.html avec la suite
  await page.check('#cx-age');await page.click('#cx-connexion .cx-google');
  await page.waitForFunction(()=>(JSON.parse(sessionStorage.getItem('appels')||'[]')).some(a=>a.nom==='signInWithOAuth'));
  assert.equal((await appels('signInWithOAuth'))[0].options.redirectTo,origine+'?suite=score.html');
  // Mot de passe oublié : retour sur connexion.html?mode=nouveau, vérificateur marqué « récupération »
  await page.click('#cx-connexion [data-aller="oubli"]');
  await page.fill('#oubli-email','joueur@test.fr');await page.click('#oubli-valider');
  await page.waitForFunction(()=>/Si un compte existe/.test(document.getElementById('cx-oubli-msg').textContent));
  assert.equal((await appels('resetPasswordForEmail'))[0].options.redirectTo,origine+'?mode=nouveau');
  assert.equal(await verificateur(),'verif123/PASSWORD_RECOVERY');
  ok('inscription, lien magique, Google et mot de passe oublié reviennent sur connexion.html (suite gardée), vérificateur PKCE posé');
  // Retour de récupération dans ce navigateur : code échangé, formulaire « nouveau mot de passe », adresse sans code
  await page.goto(base+'/connexion.html?mode=nouveau&code=bon');
  await page.waitForSelector('#cx-nouveau:not([hidden])');
  assert.ok(await page.isHidden('#cx-connexion'));
  assert.ok(!/code=/.test(page.url()),'code retiré de l\'adresse');
  await page.fill('#nv-mdp','nouveaumdp1');await page.fill('#nv-mdp2','nouveaumdp1');await page.click('#nv-valider');
  await page.waitForFunction(()=>/Mot de passe enregistré/.test(document.getElementById('cx-nouveau-msg').textContent));
  assert.deepEqual((await appels('updateUser')).pop(),{password:'nouveaumdp1'});
  await page.waitForURL(/\/espace\.html$/);
  ok('récupération : formulaire après un vrai retour (code échangé avec le vérificateur « mot de passe oublié »), mot de passe enregistré');
  await page.evaluate(()=>sessionStorage.clear());
  // Lien ouvert dans un autre navigateur (aucun vérificateur) : pas de session, message clair, adresse nettoyée
  await page.evaluate(()=>localStorage.removeItem('sb-bvhfizdfgccrkhdfqzkf-auth-token-code-verifier'));
  await page.goto(base+'/connexion.html?mode=nouveau&code=bon');
  await page.waitForFunction(()=>document.getElementById('cx-msg').textContent.trim());
  assert.match(await page.textContent('#cx-msg'),/même navigateur que celui où tu as fait la demande, ou redemande un lien/);
  assert.equal(await page.getAttribute('#cx-msg','role'),'alert');
  assert.ok(await page.isHidden('#cx-nouveau'));
  assert.equal(await page.evaluate(()=>location.search),'?suite=espace.html');
  assert.equal(await page.evaluate(()=>sessionStorage.getItem('session')),null);
  // Code refusé (bad_code_verifier) et code périmé : messages clairs
  await poserVerif();
  await page.goto(base+'/connexion.html?code=piege');
  await page.waitForFunction(()=>document.getElementById('cx-msg').textContent.trim());
  assert.match(await page.textContent('#cx-msg'),/même navigateur que celui où tu as fait la demande/);
  assert.ok(!/code=/.test(page.url()));
  await poserVerif();
  await page.goto(base+'/connexion.html?code=perime');
  await page.waitForFunction(()=>document.getElementById('cx-msg').textContent.trim());
  assert.match(await page.textContent('#cx-msg'),/expiré ou a déjà servi/);
  // Confirmation d'inscription ouverte dans un autre navigateur : e-mail confirmé, invitation à se connecter
  await page.goto(base+'/connexion.html?confirme=1&suite=compte.html&code=bon');
  await page.waitForFunction(()=>document.getElementById('cx-msg').textContent.trim());
  assert.match(await page.textContent('#cx-msg'),/e-mail est confirmé/);
  assert.equal(await page.getAttribute('#cx-msg','role'),'status');
  ok('code non échangé (autre navigateur, code refusé ou périmé) : aucune session, message clair, adresse nettoyée');
  // Retour du lien magique dans ce navigateur : session ouverte, direction la suite
  await poserVerif();
  await page.goto(base+'/connexion.html?suite=score.html&code=bon');
  await page.waitForURL(/\/score\.html$/);
  ok('retour ?code= valide dans le même navigateur : session ouverte, direction la page demandée');
  await page.evaluate(()=>sessionStorage.clear());
  // Lien piégé : jetons du flux implicite d'un autre compte (pages avec et sans compte.js)
  for(const chemin of ['/academie.html','/index.html','/connexion.html','/tournois.html']){
   await page.goto(base+chemin+'#access_token=jeton-autre&refresh_token=r-autre&expires_in=3600&token_type=bearer&type=recovery');
   await page.waitForTimeout(400);
   assert.ok(!/access_token|refresh_token/.test(page.url()),'jetons effacés de l\'adresse ('+chemin+')');
   assert.equal(await page.evaluate(()=>sessionStorage.getItem('session')),null,'aucune session ('+chemin+')');
   assert.equal((await appels('jetonVuParLeSdk')).length,0,'le SDK ne voit jamais les jetons ('+chemin+')');
  }
  await page.goto(base+'/connexion.html#access_token=jeton-autre&refresh_token=r-autre&type=recovery');
  await page.waitForTimeout(300);
  assert.ok(await page.isHidden('#cx-nouveau'),'pas de formulaire de récupération');
  ok('lien piégé #access_token=… (Mon académie, accueil, connexion, tournois) : aucune session, jetons effacés de l\'adresse');
  // Visiteur déjà connecté : le lien piégé ne le déconnecte pas
  await page.evaluate(()=>sessionStorage.setItem('session','1'));
  await page.goto(base+'/score.html#access_token=jeton-autre&refresh_token=r-autre');
  await page.waitForTimeout(400);
  assert.equal(await page.evaluate(()=>sessionStorage.getItem('session')),'1');
  assert.equal((await appels('sessionSupprimee')).length,0);
  ok('lien piégé sur une page avec compte.js : la session du visiteur connecté reste intacte');
  // Correctif P2 : liens forgés qui faisaient supprimer la session par le SDK (query, clé encodée, error_description)
  for(const lien of ['/espace.html?access_token=x','/espace.html#%61ccess_token=x','/espace.html?%72efresh_token=x&provider_token=y',
   '/connexion.html?error_description=x','/connexion.html#error_description=x']){
   // Passage par une autre page : sinon espace.html → espace.html#… ne serait qu'un saut d'ancre, sans rechargement
   await page.goto(base+'/lexique.html');
   await page.goto(base+lien);
   await page.waitForURL(/\/espace\.html$/,{timeout:5000}).catch(()=>{throw new Error(lien+' -> '+page.url());});
   await page.waitForSelector('#esp-bord .bord-bloc');
   await page.waitForTimeout(200);
   assert.equal(await page.evaluate(()=>sessionStorage.getItem('session')),'1','session gardée ('+lien+')');
   assert.equal((await appels('sessionSupprimee')).length,0,'aucune suppression de session ('+lien+')');
   assert.ok(!/token|error/.test(page.url()),'adresse nettoyée ('+lien+') : '+page.url());
   assert.equal(await page.locator('#espace').isVisible(),true);
  }
  ok('lien forgé (espace.html?access_token=x, #%61ccess_token=x, connexion.html?error_description=x et #error_description=x) : visiteur connecté pas déconnecté, adresse nettoyée');
  // Jetons dans la query : retirés, le reste de l'adresse gardé (visiteur non connecté)
  await page.evaluate(()=>sessionStorage.clear());
  await page.goto(base+'/score.html?x=1&access_token=a&%72efresh_token=b#regles');
  await page.waitForTimeout(300);
  assert.equal(await page.evaluate(()=>location.search+location.hash),'?x=1#regles');
  assert.equal(await page.evaluate(()=>sessionStorage.getItem('session')),null);
  assert.equal((await appels('jetonVuParLeSdk')).length,0);
  ok('jetons dans la query (clé encodée comprise) : retirés de l\'adresse, autres paramètres et ancre gardés, aucune session');
  // Code sans vérificateur dans ce navigateur : aucun échange tenté
  const tentatives=(await appels('tentativeEchange')).length;
  await page.evaluate(()=>localStorage.removeItem('sb-bvhfizdfgccrkhdfqzkf-auth-token-code-verifier'));
  await page.goto(base+'/connexion.html?code=bon');
  await page.waitForFunction(()=>document.getElementById('cx-msg').textContent.trim());
  assert.equal((await appels('tentativeEchange')).length,tentatives,'aucun échange sans vérificateur');
  assert.equal(await page.evaluate(()=>sessionStorage.getItem('session')),null);
  // Code refusé alors qu'une session est ouverte : la session reste
  await page.evaluate(()=>sessionStorage.setItem('session','1'));
  await poserVerif();
  await page.goto(base+'/espace.html?code=piege');
  await page.waitForFunction(()=>window.PA_COMPTE&&window.PA_COMPTE.erreurCode==='bad_code_verifier');
  assert.equal(await page.evaluate(()=>sessionStorage.getItem('session')),'1');
  assert.equal((await appels('sessionSupprimee')).length,0);
  ok('?code= : échangé seulement avec un vérificateur ; un code refusé ne ferme pas la session ouverte');
  await page.evaluate(()=>sessionStorage.clear());
  // ?code= et erreur arrivés sur l'accueil (adresse de retour non autorisée) : transmis à connexion.html
  await poserVerif();
  await page.goto(base+'/index.html?code=bon');
  await page.waitForURL(/\/espace\.html$/);
  assert.equal((await appels('echange')).length,1,'code échangé une seule fois');
  await page.evaluate(()=>sessionStorage.clear());
  await page.goto(base+'/index.html?error=access_denied&error_code=otp_expired&error_description=x');
  await page.waitForURL(/connexion\.html/);
  await page.waitForFunction(()=>document.getElementById('cx-msg').textContent.trim());
  assert.match(await page.textContent('#cx-msg'),/expiré ou a déjà servi/);
  ok('?code= et erreurs arrivés sur l\'accueil : transmis à connexion.html (code échangé une seule fois)');
  // Fiche tournoi (compte.js sans SDK : PA_COMPTE inactif) : le ?code= est transmis à connexion.html malgré le vérificateur
  await page.evaluate(()=>sessionStorage.clear());
  await poserVerif();
  await page.goto(base+'/tournoi/'+fs.readdirSync(path.join(racine,'tournoi'))[0]+'?code=bon');
  await page.waitForURL(/\/espace\.html$/);
  assert.equal((await appels('echange')).length,1,'code échangé une seule fois, sur connexion.html');
  assert.equal(await page.evaluate(()=>sessionStorage.getItem('session')),'1');
  await page.evaluate(()=>sessionStorage.clear());
  ok('?code= arrivé sur une fiche tournoi (sans SDK) : transmis à connexion.html, session ouverte');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),390);
  await ctx.close();

  // Anti-cadre : connexion.html et compte.html masquées dans le cadre d'un autre site
  const tete=f=>fs.readFileSync(path.join(racine,f),'utf8').split('</head>')[0];
  for(const f of ['connexion.html','compte.html','espace.html','partenaires.html']){
   const h=tete(f);
   assert.match(h,/<script src="assets\/js\/anti-cadre\.js(\?v=[0-9a-f]+)?"><\/script>/);
   assert.ok(h.indexOf('anti-cadre.js')<h.indexOf('<script src="assets/js/pwa.js'));
  }
  {
   const ctxCadre=await browser.newContext({serviceWorkers:'block'});
   await ctxCadre.route(/^https:/,r=>r.fulfill({body:''}));
   await ctxCadre.route('**/assets/vendor/supabase-*.js*',r=>r.fulfill({contentType:'text/javascript',body:SDK}));
   // Edge refuse un cadre en 127.0.0.1 dans une page publique : le site est servi sous une origine fictive
   // (site.example, relayée vers le serveur local) et le piège sous une autre (piege.example)
   const site='http://site.example',autre='http://piege.example';
   await ctxCadre.route(site+'/**',async r=>r.fulfill({response:await r.fetch({url:r.request().url().replace(site,base)})}));
   await ctxCadre.route(autre+'/piege.html',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><title>piège</title><iframe id="a" src="'+site+'/connexion.html"></iframe><iframe id="b" src="'+site+'/compte.html"></iframe><iframe id="c" src="'+site+'/lexique.html"></iframe>'}));
   const p=await ctxCadre.newPage();
   await p.goto(autre+'/piege.html');await p.waitForTimeout(600);
   const affichage=async id=>{const cadre=await (await p.$('#'+id)).contentFrame();
    assert.match(cadre.url(),/^http:\/\/site\.example\//);return cadre.evaluate(()=>getComputedStyle(document.documentElement).display);};
   assert.equal(await affichage('a'),'none');assert.equal(await affichage('b'),'none');
   assert.notEqual(await affichage('c'),'none','témoin : une page sans anti-cadre reste visible');
   assert.match(p.url(),/piege\.html$/);
   await ctxCadre.close();
  }
  ok('anti-cadre : script en tête de connexion.html, compte.html, espace.html et partenaires.html, page masquée dans le cadre d\'un autre site');
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
