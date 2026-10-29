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
   8) sécurité (S4) : error_description de l'adresse jamais affiché, ?mode=nouveau refusé sans PASSWORD_RECOVERY,
      case « J'ai 15 ans ou plus » obligatoire (e-mail et Google) et enregistrée dans les métadonnées, anti-cadre.
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
 if(/access_token=/.test(location.hash))sessionStorage.setItem('session',/nouveau/.test(location.hash)?'nouveau':'1');
 const session=()=>{const s=sessionStorage.getItem('session');return s?{user:{id:'u1',email:'joueur@test.fr',created_at:s==='nouveau'?new Date().toISOString():'2026-01-01T00:00:00Z'}}:null;};
 const ecouteurs=[];
 // Appels notés dans sessionStorage « appels » (gardés d'une page à l'autre)
 const noter=(nom,args)=>{const l=JSON.parse(sessionStorage.getItem('appels')||'[]');l.push({nom,args});sessionStorage.setItem('appels',JSON.stringify(l));};
 // Retour d'un lien « mot de passe oublié » (flux PKCE) : ?code=recup ouvre une session de récupération
 const recup=/[?&]code=recup/.test(location.search);
 if(recup)sessionStorage.setItem('session','1');
 const requete=()=>{const q=new Proxy({},{get(_,k){
  if(k==='then')return (ok)=>ok({data:[],error:null});
  if(k==='maybeSingle'||k==='single')return ()=>Promise.resolve({data:null,error:null});
  return ()=>q;}});return q;};
 window.supabase={createClient(){return {
  auth:{
   getSession:async()=>{await new Promise(r=>setTimeout(r,0));if(recup)ecouteurs.forEach(f=>f('PASSWORD_RECOVERY',session()));return {data:{session:session()}};},
   onAuthStateChange:f=>{ecouteurs.push(f);return {data:{subscription:{unsubscribe(){}}}};},
   signInWithPassword:async({password})=>{if(password!=='bonmotdepasse')return {data:{},error:{message:'Invalid login credentials'}};
    sessionStorage.setItem('session','1');ecouteurs.forEach(f=>f('SIGNED_IN',session()));return {data:{session:session()},error:null};},
   signUp:async(o)=>{noter('signUp',{email:o.email,options:o.options});return {data:{user:{identities:[{}]},session:null},error:null};},
   signInWithOAuth:async(o)=>{noter('signInWithOAuth',o);return {data:{},error:null};},
   signOut:async()=>{sessionStorage.removeItem('session');ecouteurs.forEach(f=>f('SIGNED_OUT',null));return {error:null};},
   signInWithOtp:async()=>({error:null}),resetPasswordForEmail:async()=>({error:null}),updateUser:async(o)=>{noter('updateUser',o);return {error:null};}},
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
  // Retour de Google ou d'un lien : erreurs affichées, jeton arrivé sur l'accueil transmis à la connexion, compte neuf → profil
  await page.goto(base+'/connexion.html?suite=espace.html#error=server_error&error_code=unexpected_failure&error_description=Database+error+saving+new+user');
  await page.waitForFunction(()=>document.getElementById('cx-msg').textContent.trim());
  assert.match(await page.textContent('#cx-msg'),/problème de notre côté/);
  assert.ok(!/Database/.test(await page.textContent('#cx-msg')),'le texte de l\'adresse n\'est pas repris');
  assert.ok(!/error/.test(await page.evaluate(()=>location.href)),'adresse nettoyée');
  await page.goto(base+'/connexion.html?error=access_denied&error_code=access_denied&error_description=User+cancelled');
  await page.waitForFunction(()=>document.getElementById('cx-msg').textContent.trim());
  assert.match(await page.textContent('#cx-msg'),/Connexion annulée/);
  await page.goto(base+'/index.html#access_token=jeton&refresh_token=r&type=bearer');
  await page.waitForURL(/espace\.html$/); // accueil → connexion.html (lit le jeton) → espace
  ok('retour de Google : erreur affichée (création, annulation), adresse nettoyée ; jeton arrivé sur l\'accueil → connexion → espace');
  await page.evaluate(()=>{sessionStorage.clear();sessionStorage.setItem('pa-age-15-google','2026-10-29T10:00:00.000Z');});
  await page.goto(base+'/connexion.html#access_token=jeton&refresh_token=r&nouveau=1');
  await page.waitForURL(/compte\.html(\?bienvenue=1)?$/);
  await page.waitForSelector('#compte-profil:not([hidden])');
  assert.match(await page.textContent('#compte-msg'),/Bienvenue/);
  const majAge=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('appels')||'[]').filter(a=>a.nom==='updateUser'));
  assert.deepEqual(majAge.map(a=>a.args),[{data:{age_15_confirme:true,age_15_confirme_le:'2026-10-29T10:00:00.000Z'}}]);
  assert.equal(await page.evaluate(()=>sessionStorage.getItem('pa-age-15-google')),null);
  ok('compte créé à l\'instant avec Google : direction le profil (compte.html?bienvenue=1), 15 ans enregistrés dans les métadonnées');
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
  await page.waitForURL(/score\.html$/);
  await page.evaluate(()=>sessionStorage.clear());
  await page.goto(base+'/connexion.html?mode=nouveau&code=recup');
  await page.waitForSelector('#cx-nouveau:not([hidden])');
  assert.ok(await page.isHidden('#cx-connexion'));
  ok('?mode=nouveau : formulaire seulement sur PASSWORD_RECOVERY (pas pour une session ouverte ni sans jeton)');
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
   await ctxCadre.route('**/supabase-js@*/**',r=>r.fulfill({contentType:'text/javascript',body:SDK}));
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
