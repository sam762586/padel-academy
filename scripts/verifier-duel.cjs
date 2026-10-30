/* Vérification du « Duel de cartes » (carte.html#duel=<code>, assets/js/carte.js, dessinerDuel de carte-rendu.js, assets/carte.css) :
   encodage et décodage aller-retour (accents, 3 postes, 4 rangs, 4 modèles), aucune photo dans le lien ; codes invalides (version,
   notes 0 / 100 / décimale, poste, rang ou modèle inconnus, pseudo avec e-mail ou lien, club avec lien, chaîne tronquée, énorme,
   illisible) → « Ce lien de duel n'est pas valide. », page normale, fragment retiré, 0 erreur ; visiteur sans carte → bandeau,
   « Faire ma carte pour le duel », parcours complet jusqu'au duel ; visiteur avec carte → « Comparer avec ma carte », comparaison
   directe, aucune nouvelle carte (pa-carte inchangée) ; calcul du gagnant, départage à la globale, égalité ; tableau note par note
   (gagnant écrit en toutes lettres) ; rechargement → duel réaffiché ; « Retour à ma carte » retire le fragment ; carte de l'ami
   jamais gardée ; texte de l'ami jamais interprété comme du HTML ; partage (navigator.share), copie (« Lien copié »), champ de repli ;
   image du duel 1200 × 1200 ; aucun événement GoatCounter ajouté ; clavier et focus ; 390, 320 et 1280 px ; animation coupée si
   prefers-reduced-motion ; 0 erreur console. Captures PNG si DUEL_CAPTURES=<dossier>.
   Lancer depuis la racine du site : node scripts/verifier-duel.cjs */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const racine=path.join(__dirname,'..');
let nb=0;
function ok(nom){nb++;console.log('OK '+nom);}
process.on('unhandledRejection',e=>{if(e&&e.name==='TargetClosedError')return;console.error(e);process.exitCode=1;});
const CAPTURES=process.env.DUEL_CAPTURES||'';

const serveur=http.createServer((req,res)=>{
 const rel=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\//,'')||'index.html';
 const p=path.resolve(racine,rel);
 if(!p.startsWith(racine+path.sep)){res.writeHead(403);res.end();return;}
 fs.readFile(p,(e,b)=>{if(e){res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2','.webmanifest':'application/manifest+json'})[path.extname(p)]||'text/plain');res.end(b);
 });
});
// Faux SDK Supabase (aucun appel réseau, jamais connecté)
const SDK_SIMULE=`window.supabase={createClient(){return {auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),signOut:async()=>({})},
 from:()=>({select:()=>Promise.resolve({data:[],error:null})}),rpc:async()=>({data:null,error:null})};}};`;
// Code de duel fabriqué comme carte.js : JSON [1, 6 notes, poste, rang, modèle, pseudo, club] en base64url sans « = »
const code=v=>Buffer.from(JSON.stringify(v),'utf8').toString('base64url');
const decode=c=>JSON.parse(Buffer.from(c,'base64url').toString('utf8'));
const LIEN='https://apprendre-padel.fr/carte.html#duel=';
const AMI=[1,70,60,70,50,50,80,'gauche','or','stade','Léa','TC Rouen'];
const MA_CARTE={version:2,date:'2026-10-20T10:00:00.000Z',notes:{VOL:80,AER:50,DEF:70,LOB:60,SER:40,TAC:90},poste:'droite',posteChoisi:true,rang:'or',rangChoisi:false,pseudo:'Nina R.',club:'',modele:'neon',photo:false};
const largeurDoc=p=>p.evaluate(()=>document.documentElement.scrollWidth);
const actif=p=>p.evaluate(()=>document.activeElement&&(document.activeElement.id||document.activeElement.tagName));
async function dimsImage(page,buf,type){return page.evaluate(([b,t])=>new Promise((res,rej)=>{const i=new Image();i.onload=()=>res([i.naturalWidth,i.naturalHeight]);i.onerror=()=>rej(new Error('image illisible'));i.src='data:'+t+';base64,'+b;}),[buf.toString('base64'),type]);}
async function poserNote(page,cle,valeur){await page.fill('#cj-v-'+cle,String(valeur));await page.press('#cj-v-'+cle,'Tab');}

(async()=>{
 await new Promise(r=>serveur.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+serveur.address().port;
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const erreurs=[];
 const suivre=p=>{p.on('pageerror',e=>erreurs.push(e.message));p.on('console',m=>{if(m.type()==='error')erreurs.push(m.text());});
  p.on('response',r=>{if(r.status()>=400&&r.url().startsWith(base))erreurs.push(r.status()+' '+r.url());});return p;};
 async function contexte(o){
  const ctx=await browser.newContext(Object.assign({serviceWorkers:'block',viewport:{width:390,height:844},isMobile:true,hasTouch:true,acceptDownloads:true},o||{}));
  await ctx.route(/^https:/,r=>r.fulfill({status:204,body:''}));
  await ctx.route('**/assets/vendor/supabase-*.js*',r=>r.fulfill({contentType:'text/javascript',body:SDK_SIMULE}));
  await ctx.addInitScript(()=>{window.__gc=[];window.goatcounter={count:o=>{window.__gc.push(o);}};});
  return ctx;
 }
 try{
  /* ---- 1. Encodage, décodage, comparaison (fonctions de la page, exposées dans window.PA_DUEL) ---- */
  const ctx=await contexte();
  const page=suivre(await ctx.newPage());
  await page.goto(base+'/carte.html');
  const r1=await page.evaluate(()=>{
   const D=window.PA_DUEL,P=window.PA_CARTE,res=[];
   const postes=P.POSTES.map(p=>p.cle),rangs=P.RANGS.map(r=>r.cle),modeles=window.CARTE_RENDU.MODELES.map(m=>m.cle);
   let i=0;
   for(const poste of postes)for(const rang of rangs){
    const c={notes:{VOL:1+i,AER:99-i,DEF:50,LOB:33,SER:2*i+1,TAC:77},poste,rang,modele:modeles[i%modeles.length],pseudo:['Léa-Zoé','Ñandú','O’Neil','J.B. 75'][i%4],club:['','TC Saint-Étienne','Padel Club 4 Murs'][i%3]};
    const lien=D.lien(c),d=D.decoder(D.encoder(c));
    res.push({c,lien,d,globale:P.calcul.globale(c.notes,poste)});i++;
   }
   return res;
  });
  assert.equal(r1.length,12);
  for(const x of r1){
   assert.ok(x.lien.startsWith(LIEN),'lien : '+x.lien);
   const c=x.lien.slice(LIEN.length);
   assert.match(c,/^[A-Za-z0-9_-]+$/);assert.ok(c.length<200,'code compact ('+c.length+')');
   const j=decode(c);
   assert.equal(j.length,12);assert.equal(j[0],1);
   assert.deepEqual(x.d.notes,x.c.notes);
   for(const k of ['poste','rang','modele','pseudo','club'])assert.equal(x.d[k],x.c[k],k);
   assert.equal(x.d.globale,x.globale,'globale recalculée');
  }
  ok('encodage / décodage aller-retour : 12 cartes (3 postes × 4 rangs, 4 modèles, accents, apostrophe, club vide ou non), code base64url < 200 caractères, globale recalculée');
  const r2=await page.evaluate(()=>{
   const C=window.PA_DUEL.comparer,n=(a,b,c,d,e,f)=>({VOL:a,AER:b,DEF:c,LOB:d,SER:e,TAC:f});
   return {
    gagne:C({notes:n(80,50,70,60,40,90),globale:66},{notes:n(70,60,70,50,50,80),globale:63}),
    perd:C({notes:n(10,10,10,10,10,10),globale:10},{notes:n(20,20,20,20,20,5),globale:17}),
    departage:C({notes:n(60,60,60,40,40,40),globale:51},{notes:n(40,40,40,60,60,60),globale:49}),
    egal:C({notes:n(60,60,60,40,40,40),globale:50},{notes:n(40,40,40,60,60,60),globale:50}),
    pareil:C({notes:n(55,55,55,55,55,55),globale:55},{notes:n(55,55,55,55,55,55),globale:55})
   };
  });
  assert.deepEqual(r2.gagne.score,{moi:3,ami:2});assert.equal(r2.gagne.vainqueur,'moi');assert.equal(r2.gagne.departage,false);
  assert.deepEqual(r2.gagne.lignes.map(l=>l.gagnant),['moi','ami','egal','moi','ami','moi']);
  assert.deepEqual(r2.perd.score,{moi:1,ami:5});assert.equal(r2.perd.vainqueur,'ami');
  assert.deepEqual(r2.departage.score,{moi:3,ami:3});assert.equal(r2.departage.vainqueur,'moi');assert.equal(r2.departage.departage,true);
  assert.deepEqual(r2.egal.score,{moi:3,ami:3});assert.equal(r2.egal.vainqueur,'egal');assert.equal(r2.egal.globale.gagnant,'egal');
  assert.deepEqual(r2.pareil.score,{moi:0,ami:0});assert.equal(r2.pareil.vainqueur,'egal');
  ok('gagnant : note par note (égalité de ligne comptée pour personne), score 3 – 2, défaite 1 – 5, 3 – 3 départagé à la globale, égalité complète');

  /* ---- 2. Codes invalides : message, page normale, fragment retiré, aucune erreur ---- */
  const valide=code(AMI);
  const variantes={
   'version 2':[2,...AMI.slice(1)],'version texte':['1',...AMI.slice(1)],'note 0':[1,0,...AMI.slice(2)],'note 100':[1,100,...AMI.slice(2)],
   'note décimale':[1,50.5,...AMI.slice(2)],'note texte':[1,'70',...AMI.slice(2)],
   'poste inconnu':[...AMI.slice(0,7),'centre',...AMI.slice(8)],'rang inconnu':[...AMI.slice(0,8),'platine',...AMI.slice(9)],
   'modèle inconnu':[...AMI.slice(0,9),'holo',...AMI.slice(10)],'pseudo e-mail':[...AMI.slice(0,10),'lea@mail.fr','TC Rouen'],
   'pseudo lien':[...AMI.slice(0,10),'www.padel.com','TC Rouen'],'pseudo instagram':[...AMI.slice(0,10),'insta lea','TC Rouen'],
   'pseudo trop court':[...AMI.slice(0,10),'L','TC Rouen'],'pseudo 31 caractères':[...AMI.slice(0,10),'L'.repeat(31),'TC Rouen'],
   'pseudo avec espaces autour':[...AMI.slice(0,10),' Léa ','TC Rouen'],'club avec lien':[...AMI.slice(0,10),'Léa','voir https://x.io'],
   'club 41 caractères':[...AMI.slice(0,10),'Léa','C'.repeat(41)],'club avec contrôle':[...AMI.slice(0,10),'Léa','TC\u0007Rouen'],
   'club non texte':[...AMI.slice(0,10),'Léa',null],'11 valeurs':AMI.slice(0,11),'13 valeurs':[...AMI,'x'],'objet':{v:1}
  };
  const codes=Object.fromEntries(Object.entries(variantes).map(([k,v])=>[k,code(v)]));
  Object.assign(codes,{'tronqué':valide.slice(0,valide.length-7),'énorme':'A'.repeat(5000),'caractères interdits':'!!<script>','vide':'',
   'UTF-8 invalide':Buffer.from([0x5b,0x31,0xff,0xfe,0x5d]).toString('base64url'),'pas du JSON':Buffer.from('bonjour').toString('base64url')});
  const r3=await page.evaluate(cs=>Object.fromEntries(Object.entries(cs).map(([k,c])=>[k,window.PA_DUEL.decoder(c)])),codes);
  for(const [k,v] of Object.entries(r3))assert.equal(v,null,'décodeur : '+k+' refusé');
  assert.ok(await page.evaluate(c=>!!window.PA_DUEL.decoder(c),valide),'code de référence accepté');
  for(const k of ['version 2','note 0','note 100','poste inconnu','pseudo e-mail','pseudo lien','club avec lien','tronqué','énorme','UTF-8 invalide','vide']){
   await page.goto(base+'/carte.html#duel='+codes[k]);
   assert.equal(await page.locator('#cj-duel-erreur').isVisible(),true,k+' : message');
   assert.equal(await page.textContent('#cj-duel-erreur'),'Ce lien de duel n\'est pas valide.');
   assert.equal(await page.getAttribute('#cj-duel-erreur','role'),'status');
   assert.equal(await page.locator('#cj-defi').isVisible(),false,k+' : pas de bandeau');
   assert.equal(await page.locator('#cj-duel').isVisible(),false);
   assert.equal(await page.locator('#cj-intro').isVisible(),true,k+' : page normale');
   assert.equal(await page.evaluate(()=>location.hash),'',k+' : fragment retiré');
   await page.goto('about:blank');
  }
  assert.deepEqual(erreurs,[],'codes invalides : aucune erreur console');
  ok('codes invalides ('+Object.keys(codes).length+' cas : version, notes 0 / 100 / décimale, poste, rang, modèle, pseudo e-mail, lien, Instagram, trop court ou long, club avec lien, contrôle ou trop long, longueur, tronqué, énorme, UTF-8 invalide…) refusés ; à l\'ouverture : « Ce lien de duel n\'est pas valide. », page normale, fragment retiré, 0 erreur');

  /* ---- 3. Visiteur sans carte : bandeau, création de la carte, duel ---- */
  await page.goto(base+'/carte.html#duel='+valide);
  assert.equal(await page.locator('#cj-defi').isVisible(),true);
  assert.equal(await page.textContent('#cj-defi-titre'),'Léa te défie !');
  assert.equal(await actif(page),'cj-defi-titre','focus sur le titre du bandeau');
  assert.equal(await page.textContent('#cj-defi-go'),'Faire ma carte pour le duel');
  assert.match(await page.textContent('#cj-defi-resume'),/^Léa a une carte à \d+ en Or, poste gauche, au club TC Rouen\./);
  assert.match(await page.getAttribute('#cj-defi-canvas','aria-label'),/^Carte de joueur de Léa : \d+, Or, poste gauche\. Volée 70, Jeu aérien 60, .*Initiales LÉ\. Club : TC Rouen\.$/);
  await page.waitForFunction(()=>{const c=document.getElementById('cj-defi-canvas');return c.width===420&&c.getContext('2d').getImageData(210,315,1,1).data[3]>0;});
  assert.equal(await page.locator('#cj-intro').isVisible(),true,'atelier visible sous le bandeau');
  if(CAPTURES)await page.screenshot({path:path.join(CAPTURES,'duel-bandeau-390.png'),fullPage:false});
  // Clavier : Tab mène au bouton, Entrée lance la carte
  await page.keyboard.press('Tab');
  assert.equal(await actif(page),'cj-defi-go');
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('#cj-notes').isVisible(),true);
  assert.equal(await page.locator('#cj-defi-go').isVisible(),false,'bouton remplacé par l\'aide');
  assert.match(await page.textContent('#cj-defi-aide'),/le duel s'affiche quand tu cliques sur « Voir ma carte »/);
  const n={VOL:80,AER:50,DEF:70,LOB:60,SER:40,TAC:90};
  for(const [k,v] of Object.entries(n))await poserNote(page,k,v);
  await page.click('#cj-postes button[data-poste="droite"]');
  await page.click('#cj-vers-photo');await page.click('#cj-vers-pseudo');
  await page.fill('#cj-pseudo','Nina R.');await page.press('#cj-pseudo','Enter');
  assert.equal(await page.locator('#cj-duel').isVisible(),true,'duel affiché dès la carte prête');
  assert.equal(await page.locator('#cj-page').isVisible(),false);
  assert.equal(await actif(page),'cj-duel-verdict','focus sur le verdict');
  assert.equal(await page.textContent('#cj-duel-verdict'),'Tu gagnes le duel !');
  assert.equal(await page.textContent('#cj-duel-score'),'3 – 2');
  assert.equal(await page.textContent('#cj-duel-score-texte'),'Score : 3 notes pour toi, 2 pour Léa.');
  const lignes=await page.$$eval('#cj-duel-lignes tr',l=>l.map(tr=>[...tr.children].map(c=>c.textContent.trim())));
  assert.deepEqual(lignes.slice(0,6),[['Volée','80','70','◀ Toi'],['Jeu aérien','50','60','▶ Léa'],['Défense','70','70','= Égalité'],['Lob et montée','60','50','◀ Toi'],['Service et retour','40','50','▶ Léa'],['Tactique','90','80','◀ Toi']]);
  assert.equal(lignes[6][0],'Note globale');assert.equal(lignes.length,7);
  assert.equal(await page.$$eval('#cj-duel-lignes th[scope="row"]',l=>l.length),7);
  assert.equal(await page.$$eval('#cj-duel-lignes .cj-duel-icone',l=>l.every(i=>i.getAttribute('aria-hidden')==='true')),true,'flèches décoratives');
  assert.equal(await page.textContent('#cj-duel-th-ami'),'Léa');
  assert.match(await page.evaluate(()=>location.hash),/^#duel=[A-Za-z0-9_-]+&ecran=duel$/);
  const cles=await page.evaluate(()=>Object.keys(localStorage).map(k=>k+'='+localStorage.getItem(k)));
  assert.ok(cles.every(x=>!/Léa|TC Rouen|duel/.test(x)),'carte de l\'ami jamais gardée : '+cles.join(' | '));
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('pa-carte')).pseudo),'Nina R.');
  ok('visiteur sans carte : bandeau « Léa te défie ! » (focus, carte sans photo décrite), Tab + Entrée → notes → photo → nom → duel (focus sur le verdict), 3 – 2, tableau de 7 lignes avec gagnant écrit, carte de l\'ami jamais gardée');
  // Rechargement : le duel revient
  await page.reload();
  assert.equal(await page.locator('#cj-duel').isVisible(),true,'rechargement : duel réaffiché');
  assert.equal(await page.textContent('#cj-duel-verdict'),'Tu gagnes le duel !');
  // Retour à ma carte : fragment retiré, étape Carte
  await page.focus('#cj-duel-retour');await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(()=>location.hash),'');
  assert.equal(await page.locator('#cj-duel').isVisible(),false);
  assert.equal(await page.locator('#cj-final').isVisible(),true);
  assert.equal(await actif(page),'H2');
  await page.reload();
  assert.equal(await page.locator('#cj-defi').isVisible(),false,'après le retour, plus de duel');
  ok('rechargement : duel réaffiché ; « Retour à ma carte » au clavier : fragment retiré, étape Carte, plus de duel au rechargement');

  /* ---- 4. Visiteur avec carte, sans compte : comparaison directe, aucune nouvelle carte ---- */
  const avant=JSON.stringify(MA_CARTE);
  await page.evaluate(c=>{localStorage.setItem('pa-carte',c);localStorage.removeItem('pa-carte-photo');},avant);
  await page.goto(base+'/carte.html#duel='+valide);
  assert.equal(await page.textContent('#cj-defi-go'),'Comparer avec ma carte');
  await page.click('#cj-defi-go');
  assert.equal(await page.locator('#cj-duel').isVisible(),true);
  assert.equal(await page.textContent('#cj-duel-verdict'),'Tu gagnes le duel !');
  assert.equal(await page.textContent('#cj-duel-nom-moi'),'Toi : Nina R.');
  assert.equal(await page.evaluate(()=>localStorage.getItem('pa-carte')),avant,'pa-carte inchangée');
  assert.equal(await page.evaluate(()=>window.__gc.length),0,'aucun événement GoatCounter');
  ok('visiteur avec carte (sans compte) : « Comparer avec ma carte » → duel direct, carte gardée intacte, aucune nouvelle carte, aucun événement de mesure');
  // Image du duel : 1200 × 1200
  const [tel]=await Promise.all([page.waitForEvent('download'),page.click('#cj-duel-telecharger')]);
  assert.equal(tel.suggestedFilename(),'duel-carte-padel.webp');
  const buf=fs.readFileSync(await tel.path());
  assert.deepEqual(await dimsImage(page,buf,'image/webp'),[1200,1200]);
  assert.equal(await page.textContent('#cj-duel-msg'),'Image prête : duel-carte-padel.webp (1200 × 1200).');
  assert.equal(await page.getAttribute('#cj-duel-msg','role'),'status');
  assert.equal(await page.evaluate(()=>window.__gc.length),0,'image du duel : aucun événement GoatCounter');
  if(CAPTURES)fs.writeFileSync(path.join(CAPTURES,'duel-image.webp'),buf);
  ok('image du duel : duel-carte-padel.webp en 1200 × 1200, message role=status, aucun événement de mesure');
  // Défaite et égalité affichées
  await page.goto(base+'/carte.html#duel='+code([1,90,90,90,90,90,10,'gauche','elite','blason','Léa','']));
  await page.click('#cj-defi-go');
  assert.equal(await page.textContent('#cj-duel-verdict'),'Léa gagne le duel');
  assert.equal(await page.textContent('#cj-duel-score'),'1 – 5');
  await page.goto(base+'/carte.html#duel='+code([1,80,50,70,60,40,90,'droite','or','vignette','Max','']));
  await page.click('#cj-defi-go');
  assert.equal(await page.textContent('#cj-duel-verdict'),'Égalité');
  assert.equal(await page.textContent('#cj-duel-score'),'0 – 0');
  assert.match(await page.textContent('#cj-duel-detail'),/^Note globale : (\d+) pour toi, \1 pour Max\.$/);
  // Départage à la globale (3 – 3) : même score, globale différente
  await page.goto(base+'/carte.html#duel='+code([1,70,51,60,61,41,80,'droite','or','neon','Max','']));
  await page.click('#cj-defi-go');
  assert.equal(await page.textContent('#cj-duel-score'),'3 – 3');
  assert.match(await page.textContent('#cj-duel-detail'),/^Égalité sur les notes, départagée à la note globale : \d+ contre \d+\.$/);
  assert.notEqual(await page.textContent('#cj-duel-verdict'),'Égalité');
  ok('verdicts : « Léa gagne le duel » (1 – 5), « Égalité » (0 – 0, mêmes notes), 3 – 3 départagé à la note globale');
  // Texte de l'ami jamais interprété comme du HTML (club accepté par la règle du club, affiché tel quel)
  await page.goto(base+'/carte.html#duel='+code([1,50,50,50,50,50,50,'droite','argent','neon','Léa','<img src=x onerror=alert(1)>']));
  assert.equal(await page.locator('#cj-defi img, #cj-duel img').count(),0);
  assert.match(await page.textContent('#cj-defi-resume'),/au club <img src=x onerror=alert\(1\)>\./);
  await page.click('#cj-defi-go');
  assert.equal(await page.locator('#cj-duel img').count(),0);
  ok('texte de l\'ami écrit avec textContent : un club « <img …> » s\'affiche tel quel, aucun élément créé');

  /* ---- 5. Défier un ami : partage, copie, champ de repli ; jamais la photo ---- */
  await ctx.close();
  const photo='data:image/jpeg;base64,'+fs.readFileSync(path.join(racine,'apple-touch-icon.png')).toString('base64');
  async function pageDefi(script){
   const c=await contexte();await c.addInitScript(script);
   const p=suivre(await c.newPage());
   await p.goto(base+'/carte.html');
   await p.evaluate(([carte,ph])=>{localStorage.setItem('pa-carte',carte);localStorage.setItem('pa-carte-photo',ph);},[JSON.stringify(Object.assign({},MA_CARTE,{photo:true,club:'TC Caen'})),photo]);
   await p.goto(base+'/carte.html');
   return {c,p};
  }
  {
   const {c,p}=await pageDefi(()=>{window.__partages=[];navigator.share=async d=>{window.__partages.push(d);};});
   assert.equal(await p.locator('#cj-final').isVisible(),true);
   assert.equal(await p.textContent('#cj-defier'),'Défier un ami');
   await p.click('#cj-defier');
   await p.waitForFunction(()=>window.__partages.length===1);
   const d=await p.evaluate(()=>window.__partages[0]);
   assert.equal(d.text,'Je te défie : fais ta carte de padel et compare-la à la mienne');
   assert.ok(d.url.startsWith(LIEN));
   const j=decode(d.url.slice(LIEN.length));
   assert.deepEqual(j,[1,80,50,70,60,40,90,'droite','argent','neon','Nina R.','TC Caen']);
   assert.ok(!/data:|photo|base64/i.test(JSON.stringify(j))&&d.url.length<200,'aucune photo dans le lien');
   assert.equal(await p.textContent('#cj-defier-msg'),'Défi envoyé. Quand ton ami aura fait sa carte, vous verrez qui gagne.');
   assert.equal(await p.evaluate(()=>window.__gc.length),0,'défi : aucun événement GoatCounter');
   // Menu de partage fermé par le joueur : aucun message
   await p.evaluate(()=>{navigator.share=async()=>{throw new DOMException('fermé','AbortError');};});
   await p.click('#cj-defier');await p.waitForTimeout(100);
   assert.equal(await p.locator('#cj-defier-msg').isVisible(),false);
   assert.equal(await p.locator('#cj-defier').isDisabled(),false);
   await c.close();
  }
  ok('« Défier un ami » : navigator.share avec le texte prévu et https://apprendre-padel.fr/carte.html#duel=…, notes, poste, rang, modèle, nom et club, jamais la photo (carte avec photo) ; partage annulé : rien');
  {
   const {c,p}=await pageDefi(()=>{try{delete Navigator.prototype.share;}catch(e){}navigator.share=undefined;window.__copies=[];
    Object.defineProperty(navigator,'clipboard',{value:{writeText:async t=>{window.__copies.push(t);}},configurable:true});});
   await p.click('#cj-defier');
   await p.waitForFunction(()=>window.__copies.length===1);
   assert.ok((await p.evaluate(()=>window.__copies[0])).startsWith(LIEN));
   assert.equal(await p.textContent('#cj-defier-msg'),'Lien copié. Colle-le dans un message à ton ami.');
   assert.equal(await p.getAttribute('#cj-defier-msg','role'),'status');
   await c.close();
  }
  ok('sans partage : lien copié dans le presse-papiers, message « Lien copié » (role=status)');
  {
   const {c,p}=await pageDefi(()=>{navigator.share=undefined;Object.defineProperty(navigator,'clipboard',{value:undefined,configurable:true});});
   await p.click('#cj-defier');
   await p.waitForSelector('#cj-defier-lien-bloc:not([hidden])');
   const v=await p.inputValue('#cj-defier-lien');
   assert.ok(v.startsWith(LIEN));
   assert.equal(await actif(p),'cj-defier-lien','champ sélectionné');
   assert.equal(await p.evaluate(()=>{const i=document.getElementById('cj-defier-lien');return i.selectionStart===0&&i.selectionEnd===i.value.length;}),true);
   assert.equal(await p.textContent('#cj-defier-msg'),'Copie ce lien et envoie-le à ton ami.');
   // Renvoyer le défi depuis l'écran du duel : lien avec MA carte
   await p.goto(base+'/carte.html#duel='+valide);await p.click('#cj-defi-go');
   await p.click('#cj-duel-renvoyer');
   await p.waitForSelector('#cj-duel-lien-bloc:not([hidden])');
   const j=decode((await p.inputValue('#cj-duel-lien')).slice(LIEN.length));
   assert.equal(j[10],'Nina R.','renvoi : ma carte');
   await c.close();
  }
  ok('ni partage ni presse-papiers : champ texte avec le lien, sélectionné ; « Renvoyer le défi » renvoie un lien avec ma carte');

  /* ---- 6. Mise en page : 390, 320, 1280 px ; animation ; cibles ---- */
  {
   const c=await contexte();const p=suivre(await c.newPage());
   await p.goto(base+'/carte.html?init');await p.evaluate(x=>localStorage.setItem('pa-carte',x),JSON.stringify(MA_CARTE));
   for(const w of [390,320]){
    await p.setViewportSize({width:w,height:844});
    await p.goto(base+'/carte.html#duel='+code([1,70,60,70,50,50,80,'gauche','or','stade','Maximilien-Alexandre','Padel Club des Quatre Murs']));
    assert.equal(await largeurDoc(p),w,'bandeau à '+w);
    await p.click('#cj-defi-go');
    await p.waitForTimeout(700);
    assert.equal(await largeurDoc(p),w,'duel à '+w+' : '+await p.evaluate(()=>[...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>391).slice(0,4).map(e=>e.tagName+'.'+e.className+'#'+e.id+' '+Math.round(e.getBoundingClientRect().right)).join(', ')));
    const tops=await p.$$eval('.cj-duel-cartes figure',l=>l.map(f=>Math.round(f.getBoundingClientRect().top)));
    assert.ok(tops[1]>tops[0]+100,'cartes empilées à '+w+' : '+tops);
    const petites=await p.$$eval('#cj-duel button, #cj-defi button',l=>l.filter(b=>b.offsetParent&&(b.getBoundingClientRect().height<24||b.getBoundingClientRect().width<24)).map(b=>b.id));
    assert.deepEqual(petites,[],'cibles ≥ 24 px');
    if(CAPTURES&&w===390)await p.screenshot({path:path.join(CAPTURES,'duel-ecran-390.png'),fullPage:true});
   }
   await p.setViewportSize({width:1280,height:900});
   await p.goto(base+'/carte.html#duel='+valide);await p.click('#cj-defi-go');await p.waitForTimeout(700);
   assert.equal(await largeurDoc(p),1280);
   const tops=await p.$$eval('.cj-duel-cartes figure',l=>l.map(f=>Math.round(f.getBoundingClientRect().top)));
   assert.equal(tops[0],tops[1],'côte à côte à 1280 px');
   if(CAPTURES)await p.screenshot({path:path.join(CAPTURES,'duel-ecran-1280.png'),fullPage:true});
   assert.equal(await p.$eval('.cj-duel-cartes figure',f=>getComputedStyle(f).animationName),'cj-revele');
   await c.close();
   const c2=await contexte({reducedMotion:'reduce'});const p2=suivre(await c2.newPage());
   await p2.goto(base+'/carte.html?init');await p2.evaluate(x=>localStorage.setItem('pa-carte',x),JSON.stringify(MA_CARTE));
   await p2.goto(base+'/carte.html#duel='+valide);await p2.click('#cj-defi-go');
   assert.equal(await p2.$eval('.cj-duel-cartes figure',f=>getComputedStyle(f).animationName),'none');
   await c2.close();
  }
  ok('390 et 320 px : bandeau et duel sans débordement (pseudo et club longs), cartes empilées, boutons ≥ 24 px ; 1280 px : côte à côte ; révélation animée, coupée si prefers-reduced-motion');
  // Lien de duel collé dans un onglet déjà ouvert (hashchange) : bandeau
  {
   const c=await contexte();const p=suivre(await c.newPage());
   await p.goto(base+'/carte.html');
   await p.evaluate(v=>{location.hash='duel='+v;},valide);
   await p.waitForSelector('#cj-defi:not([hidden])');
   assert.equal(await p.textContent('#cj-defi-titre'),'Léa te défie !');
   await p.evaluate(()=>{location.hash='duel=abc';});
   await p.waitForSelector('#cj-duel-erreur:not([hidden])');
   assert.equal(await p.locator('#cj-defi').isVisible(),false);
   await c.close();
  }
  ok('lien collé dans un onglet déjà ouvert (hashchange) : bandeau, puis code invalide → message');
  assert.deepEqual(erreurs,[]);
  ok('aucune erreur console ni ressource manquante');
  console.log('TOTAL '+nb+' contrôles réussis.');
 }finally{await browser.close();serveur.close();}
})().catch(e=>{console.error(e);serveur.close();process.exitCode=1;});
