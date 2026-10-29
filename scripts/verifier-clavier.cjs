/* Vérification de l'utilisation au clavier seul et des annonces aux lecteurs d'écran (lot S3) :
   1) test de niveau (niveau.html, quiz-niveau.js) : rien ne bouge au chargement ; après chaque réponse (Tab puis Entrée), le focus
      va sur le titre de la question suivante ; compteur en aria-live, options groupées et nommées par la question, barre
      décorative cachée ; groupe « Classement messieurs ou dames » en fieldset/legend ; rang invalide : aria-invalid + message relié ;
      focus sur le titre du résultat, puis sur la question après « Refaire le test » ;
   2) tutos (tutos.html) : tuto 1 groupé et nommé, réponse changée aux flèches ; terrain du tuto 3 atteint avec Tab, balle déplacée
      aux flèches (pas de 20, bornée au terrain, sans faire défiler la page), verdict mis à jour en aria-live ;
   3) tactique (tactique.html) : changement de phase au clavier, nouveau nom accessible du terrain et annonce de la phase ;
   4) titres : pas de saut de niveau (h1 puis h2, h3…) sur les trois pages ;
   5) menu (nav.js) : ordinateur, le menu déroulant se ferme quand le focus le quitte, Échap ferme et rend le focus ;
      mobile, hamburger « Menu » + aria-expanded, Échap ferme, le panneau se ferme quand le focus part dans la page ;
   6) aucune erreur console.
   Lancer depuis la racine du site : node scripts/verifier-clavier.cjs */
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
  res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.webp':'image/webp','.webmanifest':'application/manifest+json'})[path.extname(p)]||'text/plain');res.end(b);
 });
});

// Appuie sur Tab (ou Maj+Tab) jusqu'à ce que l'élément focalisé vérifie le test ; échoue au-delà de max appuis
async function tabJusqua(page,test,arg,max=80,touche='Tab'){
 for(let k=0;k<max;k++){
  await page.keyboard.press(touche);
  if(await page.evaluate(test,arg))return k+1;
 }
 throw new Error('focus jamais atteint : '+test.toString().slice(0,120));
}
const actif=page=>page.evaluate(()=>{const a=document.activeElement;return {id:a.id,tag:a.tagName,texte:a.textContent.trim()};});
const texteFocus=t=>document.activeElement&&document.activeElement.textContent.trim()===t;
// Niveaux des titres visibles ou lus (sr-only compris) dans l'ordre du document, hors menu et pied de page
const sautsDeTitres=page=>page.evaluate(()=>{
 const t=[...document.querySelectorAll('main h1,main h2,main h3,main h4,main h5,main h6,section h1,section h2,section h3,section h4,section h5,section h6')]
  .filter((h,i,tous)=>tous.indexOf(h)===i&&!h.closest('[hidden]'));
 const niveaux=t.map(h=>Number(h.tagName[1]));
 const sauts=[];
 niveaux.forEach((n,i)=>{if(i===0?n!==1:n>niveaux[i-1]+1)sauts.push((i?'h'+niveaux[i-1]+' → ':'')+'h'+n+' « '+t[i].textContent.trim().slice(0,40)+' »');});
 return sauts;
});

(async()=>{
 await new Promise(r=>serveur.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+serveur.address().port;
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const erreurs=[];
 const nouveauContexte=async largeur=>{
  const ctx=await browser.newContext({serviceWorkers:'block',viewport:{width:largeur,height:844}});
  // Hors ligne : toute requête https (SDK Supabase du CDN, mesure d'audience) reçoit une réponse vide, le site doit marcher sans
  await ctx.route(/^https:/,r=>r.fulfill({contentType:'text/javascript',body:''}));
  await ctx.route('**/assets/vendor/supabase-*.js*',r=>r.fulfill({contentType:'text/javascript',body:''}));
  const page=await ctx.newPage();
  page.on('pageerror',e=>erreurs.push(e.message));
  page.on('console',m=>{if(m.type()==='error')erreurs.push(m.text());});
  page.on('response',r=>{if(r.status()>=400&&r.url().startsWith(base))erreurs.push(r.status()+' '+r.url());});
  return {ctx,page};
 };
 try{
  // ---- 1) Test de niveau, 390 px ----
  let {ctx,page}=await nouveauContexte(390);
  await page.goto(base+'/niveau.html');
  assert.notEqual((await actif(page)).id,'qtext','pas de focus déplacé au chargement');
  const struct=await page.evaluate(()=>({
   live:document.getElementById('qnum').getAttribute('aria-live'),
   groupe:document.getElementById('qopts').getAttribute('role'),nomGroupe:document.getElementById('qopts').getAttribute('aria-labelledby'),
   barre:document.querySelector('.qbar').getAttribute('aria-hidden'),tab:document.getElementById('qtext').getAttribute('tabindex'),
   legende:(document.querySelector('fieldset.qrang-sexe legend')||{}).textContent,
   radios:document.querySelectorAll('fieldset.qrang-sexe input[type=radio]').length}));
  assert.deepEqual(struct,{live:'polite',groupe:'group',nomGroupe:'qtext',barre:'true',tab:'-1',legende:'Classement messieurs ou dames',radios:2});
  ok('test : compteur en aria-live, options groupées et nommées par la question, barre cachée, fieldset « Classement messieurs ou dames »');
  // Rang vide validé au clavier : champ marqué invalide, message relié au champ
  await tabJusqua(page,texteFocus,'Valider mon rang');
  await page.keyboard.press('Enter');
  const champ=await page.evaluate(()=>{const c=document.getElementById('qrang');const m=document.getElementById(c.getAttribute('aria-describedby'));
   return {focus:document.activeElement===c,invalide:c.getAttribute('aria-invalid'),message:m?m.textContent:''};});
  assert.equal(champ.focus,true);assert.equal(champ.invalide,'true');assert.match(champ.message,/Entre ton rang/);
  await page.keyboard.type('12');
  assert.equal(await page.getAttribute('#qrang','aria-invalid'),null);
  await page.keyboard.press('Backspace');await page.keyboard.press('Backspace');
  ok('test : rang invalide signalé (aria-invalid, message relié par aria-describedby), marque retirée à la saisie');
  // Question 1 : « Je ne suis pas classé(e) » au clavier -> focus sur la question 2
  await tabJusqua(page,texteFocus,'Je ne suis pas classé(e)');
  await page.keyboard.press('Enter');
  let a=await actif(page);
  assert.equal(a.id,'qtext');assert.match(await page.textContent('#qnum'),/Repères · 2 \/ 14/);
  assert.equal(a.texte,await page.textContent('#qtext'));
  // Question 2 : Tab amène sur la première option, Entrée répond -> focus sur la question 3
  await page.keyboard.press('Tab');
  assert.ok(await page.evaluate(()=>document.activeElement.classList.contains('qopt')));
  await page.keyboard.press('Enter');
  a=await actif(page);
  assert.equal(a.id,'qtext');assert.match(await page.textContent('#qnum'),/Repères · 3 \/ 14/);
  ok('test : 2 questions répondues avec Tab et Entrée, le focus est chaque fois sur le titre de la question suivante');
  // Fin du test au clavier : focus sur le titre du résultat
  for(let k=3;k<=14;k++){await page.keyboard.press('Tab');await page.keyboard.press('Enter');}
  await page.waitForSelector('#qresult:not([hidden])');
  const res=await page.evaluate(()=>{const a=document.activeElement;return {dans:!!a.closest('#qresult'),tag:a.tagName,vtag:!!a.querySelector('.vtag'),texte:a.textContent};});
  assert.equal(res.dans,true);assert.equal(res.tag,'H3');assert.equal(res.vtag,true);assert.match(res.texte,/^Ton palier : /);
  ok('test : au résultat, focus sur son titre (« Ton palier : … » pour les lecteurs d\'écran)');
  // Le titre du résultat (h3) suit le h2 de structure « Le test », placé hors de la carte des questions masquée
  assert.deepEqual(await sautsDeTitres(page),[]);
  await tabJusqua(page,texteFocus,'Refaire le test');
  await page.keyboard.press('Enter');
  assert.equal((await actif(page)).id,'qtext');assert.match(await page.textContent('#qnum'),/1 \/ 14/);
  ok('test : « Refaire le test » au clavier, focus sur la première question');
  assert.deepEqual(await sautsDeTitres(page),[]);
  await ctx.close();

  // ---- 2) Tutos, 390 px ----
  ({ctx,page}=await nouveauContexte(390));
  await page.goto(base+'/tutos.html');
  const tutos=await page.evaluate(()=>{const g=document.getElementById('monter-opts');const n=document.getElementById(g.getAttribute('aria-labelledby'));
   return {role:g.getAttribute('role'),nom:n?n.textContent:'',lives:['monter-verdict','lob-verdict','pair-verdict'].map(id=>document.getElementById(id).getAttribute('aria-live')),
    fieldsets:document.querySelectorAll('.tuto-ctl fieldset legend').length};});
  assert.equal(tutos.role,'radiogroup');assert.match(tutos.nom,/Je viens de jouer/);
  assert.deepEqual(tutos.lives,['polite','polite','polite']);assert.equal(tutos.fieldsets,4);
  // Tuto 1 : la réponse change aux flèches, le verdict suit
  await tabJusqua(page,()=>document.activeElement.name==='monter');
  const avant1=await page.textContent('#monter-verdict .vtag');
  await page.keyboard.press('ArrowDown');
  assert.equal(await page.evaluate(()=>document.querySelector('input[name=monter]:checked').value),'lobC');
  assert.notEqual(await page.textContent('#monter-verdict .vtag'),avant1);
  ok('tutos : questions groupées et nommées, verdicts en aria-live, tuto 1 répondu aux flèches');
  // Tuto 3 : terrain atteint avec Tab, consigne clavier
  await tabJusqua(page,()=>document.activeElement.id==='pair');
  const terrain=await page.evaluate(()=>{const s=document.getElementById('pair');return {role:s.getAttribute('role'),nom:s.getAttribute('aria-label'),aide:document.getElementById(s.getAttribute('aria-describedby')).textContent};});
  assert.equal(terrain.role,'application');assert.ok(terrain.nom.length>10);assert.match(terrain.aide,/flèches/);
  const balle=()=>page.evaluate(()=>{const b=document.getElementById('pair-ball');return [Number(b.getAttribute('cx')),Number(b.getAttribute('cy'))];});
  assert.deepEqual(await balle(),[340,175]);
  await page.keyboard.press('ArrowLeft');
  assert.deepEqual(await balle(),[320,175]);
  // Les flèches ne font pas défiler la page : leur action par défaut est annulée (contrôle sur l'événement lui-même,
  // la position de défilement bougeant aussi avec le chargement des images et le défilement doux)
  await page.evaluate(()=>{window.__fleches=[];document.addEventListener('keydown',e=>{if(/^Arrow/.test(e.key))window.__fleches.push(e.defaultPrevented);});});
  await page.keyboard.press('ArrowUp');
  assert.deepEqual(await balle(),[320,155]);
  assert.deepEqual(await page.evaluate(()=>window.__fleches),[true],'les flèches ne font pas défiler la page');
  // La balle passe dans notre camp, devant nous : verdict « balle dans nos pieds »
  for(let k=0;k<5;k++)await page.keyboard.press('ArrowLeft');
  assert.deepEqual(await balle(),[220,155]);
  assert.match(await page.textContent('#pair-verdict'),/Balle dans nos pieds/);
  // Derrière nous : « lob passé »
  for(let k=0;k<6;k++)await page.keyboard.press('ArrowLeft');
  assert.match(await page.textContent('#pair-verdict'),/Lob passé/);
  // Bornes : comme au clic, la balle reste sur le terrain (15 à 425, 15 à 225)
  for(let k=0;k<20;k++){await page.keyboard.press('ArrowLeft');await page.keyboard.press('ArrowDown');}
  assert.deepEqual(await balle(),[15,225]);
  assert.equal((await actif(page)).id,'pair');
  ok('tutos : balle du tuto 3 déplacée aux flèches (pas de 20, bornée), verdict lu (« Balle dans nos pieds », « Lob passé »), page immobile');
  assert.deepEqual(await sautsDeTitres(page),[]);
  await ctx.close();

  // ---- 3) Tactique, 390 px ----
  ({ctx,page}=await nouveauContexte(390));
  await page.goto(base+'/tactique.html');
  assert.match(await page.getAttribute('#court','aria-label'),/Défense : Au fond, derrière la ligne de service/);
  assert.equal(await page.textContent('#phase-annonce'),'');
  assert.equal(await page.getAttribute('#phase-annonce','aria-live'),'polite');
  await tabJusqua(page,texteFocus,'2 · Transition');
  await page.keyboard.press('Enter');
  assert.equal(await page.getAttribute('[data-phase="trans"]','aria-pressed'),'true');
  const nom=await page.getAttribute('#court','aria-label');
  assert.match(nom,/^Positions des joueurs sur le terrain, phase Transition : Monter sur un bon lob ou une chiquita$/);
  assert.equal(await page.textContent('#phase-annonce'),'Phase Transition : Monter sur un bon lob ou une chiquita');
  await page.keyboard.press('Tab');await page.keyboard.press('Enter');
  assert.match(await page.getAttribute('#court','aria-label'),/phase Attaque/);
  assert.match(await page.textContent('#phase-annonce'),/^Phase Attaque/);
  ok('tactique : phase changée au clavier, nom accessible du terrain mis à jour, changement annoncé (aria-live)');
  assert.deepEqual(await sautsDeTitres(page),[]);
  ok('titres : niveau, tutos et tactique sans saut de niveau (h1, puis h2, h3…)');
  await ctx.close();

  // ---- 4) Menu, ordinateur 1280 px ----
  ({ctx,page}=await nouveauContexte(1280));
  await page.goto(base+'/bareme.html');await page.mouse.move(5,700);
  const titre=n=>page.locator('.nav-titre',{hasText:n});
  await tabJusqua(page,texteFocus,'Compétition');
  await page.keyboard.press('Enter');
  assert.equal(await titre('Compétition').getAttribute('aria-expanded'),'true');
  const liens=await page.locator('#nav-competition a').count();
  for(let k=0;k<liens;k++)await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(()=>document.activeElement.closest('#nav-competition')!==null),true);
  await page.keyboard.press('Tab'); // le focus quitte le menu déroulant
  assert.equal(await titre('Compétition').getAttribute('aria-expanded'),'false');
  assert.equal(await page.locator('#nav-competition').isVisible(),false);
  ok('menu ordinateur : le menu déroulant se ferme quand le focus le quitte (Tab après le dernier lien)');
  // Retour en arrière vers « Apprendre » : les groupes traversés restent fermés (le focus seul n'ouvre rien)
  await tabJusqua(page,texteFocus,'Apprendre',20,'Shift+Tab');
  assert.equal(await page.locator('.nav-groupe.ouvert').count(),0);
  await page.keyboard.press('Enter');
  await page.keyboard.press('Tab');
  assert.equal(await titre('Apprendre').getAttribute('aria-expanded'),'true');
  await page.keyboard.press('Escape');
  assert.equal(await titre('Apprendre').getAttribute('aria-expanded'),'false');
  assert.equal((await actif(page)).texte,'Apprendre');
  ok('menu ordinateur : Échap ferme le menu déroulant et rend le focus à son titre');
  await ctx.close();

  // ---- 5) Menu, mobile 390 px ----
  ({ctx,page}=await nouveauContexte(390));
  await page.goto(base+'/bareme.html');
  await tabJusqua(page,()=>document.activeElement.classList.contains('nav-toggle'));
  assert.equal(await page.getAttribute('.nav-toggle','aria-label'),'Menu');
  assert.equal(await page.getAttribute('.nav-toggle','aria-expanded'),'false');
  await page.keyboard.press('Enter');
  assert.equal(await page.getAttribute('.nav-toggle','aria-label'),'Menu');
  assert.equal(await page.getAttribute('.nav-toggle','aria-expanded'),'true');
  assert.equal(await page.locator('#nav-menu').isVisible(),true);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#nav-menu').isVisible(),false);
  assert.ok(await page.evaluate(()=>document.activeElement.classList.contains('nav-toggle')));
  ok('menu mobile : hamburger au nom fixe « Menu », état dans aria-expanded, Échap ferme et rend le focus');
  // Tab jusqu'à sortir du panneau : il se ferme, le focus est dans la page visible
  await page.keyboard.press('Enter');
  const appuis=await tabJusqua(page,()=>!document.getElementById('nav-menu').contains(document.activeElement),null,30);
  assert.ok(appuis>3);
  assert.equal(await page.getAttribute('.nav-toggle','aria-expanded'),'false');
  assert.equal(await page.locator('#nav-menu').isVisible(),false);
  assert.equal(await page.evaluate(()=>!!document.activeElement.closest('.nav')),false);
  // Maj+Tab depuis le hamburger (vers la marque) : le panneau se ferme aussi
  await tabJusqua(page,()=>document.activeElement.classList.contains('nav-toggle'),null,40,'Shift+Tab');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Shift+Tab');
  assert.equal(await page.getAttribute('.nav-toggle','aria-expanded'),'false');
  ok('menu mobile : le panneau se ferme quand le focus part dans la page (Tab après le dernier lien, Maj+Tab avant le hamburger)');
  await ctx.close();

  assert.deepEqual(erreurs,[]);
  ok('aucune erreur console ni ressource manquante');
  console.log('TOTAL '+nb+' contrôles réussis.');
 }finally{await browser.close();serveur.close();}
})().catch(e=>{console.error(e);serveur.close();process.exitCode=1;});
