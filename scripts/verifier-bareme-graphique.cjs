/* Vérification du graphique du barème (bareme.html, assets/js/bareme-graphique.js) dans Edge à 390 et 320 px :
   une barre par place existante pour chaque catégorie et tranche, place choisie surlignée, aucune valeur null dessinée,
   aria-label complet, hauteur réservée (aucun décalage), pas de défilement horizontal, info-bulle, contraste, 0 erreur console.
   Lancer depuis la racine du site : node scripts/verifier-bareme-graphique.cjs */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const racine=path.join(__dirname,'..');
let nb=0;
function ok(nom){nb++;console.log('OK '+nom);}
const serveur=http.createServer((req,res)=>{
 const rel=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\//,'')||'index.html';
 const p=path.resolve(racine,rel);
 if(!p.startsWith(racine+path.sep)){res.writeHead(403);res.end();return;}
 fs.readFile(p,(e,b)=>{if(e){res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2'})[path.extname(p)]||'text/plain');res.end(b);
 });
});

/* ---- Contraste des barres sur le fond du graphique, d'après les jetons de style.css ---- */
function contraste(){
 const css=fs.readFileSync(path.join(racine,'assets/style.css'),'utf8');
 const jeton=n=>css.match(new RegExp('--'+n+':(#[0-9a-fA-F]{6})'))[1];
 const lum=h=>{const c=[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255).map(v=>v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4));return .2126*c[0]+.7152*c[1]+.0722*c[2];};
 const ratio=(a,b)=>{const [x,y]=[lum(a),lum(b)].sort((p,q)=>q-p);return (x+.05)/(y+.05);};
 const r=ratio(jeton('terrain'),jeton('bg'));
 assert.ok(r>=3,'barres --terrain sur --bg : '+r.toFixed(2)+':1');
 const feuille=fs.readFileSync(path.join(racine,'assets/css/contenu.css'),'utf8');
 assert.match(feuille,/\.bar-graph\{[^}]*background:var\(--bg\)/,'fond du graphique : --bg');
 assert.match(feuille,/\.bar-barre\{fill:var\(--terrain\)\}/);assert.match(feuille,/\.bar-barre\.choisie\{fill:var\(--turf\)\}/);assert.match(feuille,/\.bar-barre\.survol\{fill:var\(--sky\)\}/);
 ok('contraste barres --terrain / fond --bg : '+r.toFixed(2)+':1 (≥ 3:1), couleurs par jetons');
}

// Toutes les combinaisons du barème : P25 à P250 × 7 tranches (et une tranche coupée par le nombre de paires), P500/P1000 × sexe, P2000, P3000
function combinaisons(){
 const liste=[];
 for(const cat of ['P25','P50','P100','P250'])for(const n of [6,8,10,12,14,16,18,20,22,24,26,28,32,40])liste.push({cat,nb:n,sexe:'messieurs',place:Math.min(n,5)});
 for(const cat of ['P500','P1000'])for(const sexe of ['messieurs','dames'])liste.push({cat,nb:16,sexe,place:sexe==='dames'?25:32});
 liste.push({cat:'P2000',nb:16,sexe:'messieurs',place:1},{cat:'P3000',nb:16,sexe:'messieurs',place:17});
 liste.push({cat:'P100',nb:12,sexe:'messieurs',place:20}); // place inexistante : aucune barre surlignée
 return liste;
}

async function choisir(page,c){
 await page.evaluate(c=>{
  const fixer=(id,v)=>{const e=document.getElementById(id);e.value=String(v);e.dispatchEvent(new Event('input',{bubbles:true}));};
  fixer('b-cat',c.cat);
  const radio=document.querySelector('input[name="b-sexe"][value="'+c.sexe+'"]');radio.checked=true;radio.dispatchEvent(new Event('change',{bubbles:true}));
  fixer('b-nb',c.nb);fixer('b-place',c.place);
 },c);
}

async function principal(){
 contraste();
 await new Promise(r=>serveur.listen(0,r));
 const url=`http://localhost:${serveur.address().port}/bareme.html`;
 const navigateur=await chromium.launch({channel:'msedge',headless:true});
 const erreurs=[];
 const contexte=await navigateur.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
 // Mesure d'audience remplacée par un script vide (une requête coupée laisserait une erreur dans la console)
 await contexte.route(/goatcounter|gc\.zgo\.at/,r=>r.fulfill({status:200,contentType:'text/javascript',body:''}));
 try{
  const page=await contexte.newPage();
  page.on('console',m=>{if(m.type()==='error')erreurs.push(m.text());});
  page.on('pageerror',e=>erreurs.push(e.message));
  await page.goto(url,{waitUntil:'load'});
  await page.waitForSelector('#b-graph .bar-barre');

  // Une barre par place existante, place choisie surlignée, aucune valeur null
  let vues=0;
  for(const c of combinaisons()){
   await choisir(page,c);
   const r=await page.evaluate(()=>{
    const B=window.PA_BAREME,f=document.getElementById('b-graph');
    const cat=f.dataset.cat,nb=+f.dataset.nb,sexe=f.dataset.sexe,place=+f.dataset.place;
    // Places attendues, calculées ici sans passer par le module du graphique
    const d=B.BAREME[cat],derniere=d.dames&&sexe==='dames'?d.dames.length:32,attendues=[];
    for(let p=1;p<=derniere;p++){const v=B.ptsFor(cat,p,nb,sexe);if(v!==null&&v!==undefined)attendues.push({p,v});}
    const barres=[...f.querySelectorAll('.bar-barre')].map(b=>({p:+b.dataset.place,v:b.dataset.points,choisie:b.classList.contains('choisie'),h:b.getBBox().height}));
    return {cat,nb,sexe,place,attendues,barres,aria:f.querySelector('svg').getAttribute('aria-label'),
     valeur:(f.querySelector('.bar-valeur')||{}).textContent||null,legende:f.querySelector('figcaption').textContent,
     points:B.ptsFor(cat,place,nb,sexe),libelles:attendues.map(a=>B.PLACE_LABEL(a.p-1))};
   });
   const nom=`${r.cat} ${r.nb} paires ${r.sexe} place ${r.place}`;
   assert.equal(r.barres.length,r.attendues.length,nom+' : nombre de barres');
   assert.deepEqual(r.barres.map(b=>b.p),r.attendues.map(a=>a.p),nom+' : places dessinées');
   assert.deepEqual(r.barres.map(b=>Number(b.v)),r.attendues.map(a=>a.v),nom+' : points des barres');
   assert.ok(r.barres.every(b=>/^\d+$/.test(b.v)&&b.h>=1),nom+' : aucune valeur null ou vide dessinée');
   const choisies=r.barres.filter(b=>b.choisie).map(b=>b.p);
   if(r.points===null){assert.deepEqual(choisies,[],nom+' : aucune barre choisie');assert.equal(r.valeur,null);assert.match(r.aria,/n'existe pas/);}
   else{
    const attendue=Math.min(r.place,r.attendues[r.attendues.length-1].p);
    assert.deepEqual(choisies,[attendue],nom+' : barre choisie');
    assert.equal(r.valeur,r.points+' pt'+(r.points>1?'s':''),nom+' : étiquette de la barre choisie');
    assert.match(r.aria,new RegExp('Ta place : .*'+r.points+' pt'));
   }
   assert.ok(r.aria&&r.aria.startsWith('Points par place finale, '+r.cat),nom+' : aria-label');
   // Chaque place apparaît dans l'aria-label avec ses points, dans l'ordre
   let curseur=0;
   r.attendues.forEach((a,i)=>{
    const libelle=(r.sexe==='dames'&&a.p===25)?'25e et plus':r.libelles[i];
    const morceau=libelle+' '+a.v+' pt'+(a.v>1?'s':'');
    const pos=r.aria.indexOf(morceau,curseur);assert.ok(pos>=0,nom+' : aria-label sans « '+morceau+' »');curseur=pos+morceau.length;
   });
   assert.ok(r.legende.includes(r.cat),nom+' : légende');
   vues++;
  }
  ok(vues+' tableaux : une barre par place existante, place choisie surlignée, aucune valeur null, aria-label complet');

  // Info-bulle : survol d'une colonne (au-dessus de la barre, pas seulement sur elle)
  await choisir(page,{cat:'P100',nb:16,sexe:'messieurs',place:5});
  await page.$eval('#b-graph',f=>f.scrollIntoView({block:'center',behavior:'instant'}));
  const cible=await page.evaluate(()=>{const s=document.querySelector('#b-graph svg').getBoundingClientRect(),b=document.querySelectorAll('#b-graph .bar-barre')[7].getBoundingClientRect();return {x:b.left+b.width/2,y:s.top+30};});
  await page.mouse.move(cible.x,cible.y);
  const bulle=await page.evaluate(()=>{const b=document.querySelector('#b-graph .bar-bulle');return {hidden:b.hidden,texte:b.textContent,survol:[...document.querySelectorAll('#b-graph .bar-barre.survol')].map(e=>e.dataset.place)};});
  assert.equal(bulle.hidden,false);assert.equal(bulle.texte,'8e (¼ finale) : 30 pts');assert.deepEqual(bulle.survol,['8']);
  await page.mouse.move(5,5);
  assert.equal(await page.$eval('#b-graph .bar-bulle',b=>b.hidden),true);
  ok('info-bulle au survol de toute la colonne, cachée en sortant');

  // Au toucher (téléphone) : un appui dans la colonne montre la bulle, placée au-dessus de la colonne et dans le cadre
  const ctxTactile=await navigateur.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,serviceWorkers:'block'});
  await ctxTactile.route(/goatcounter|gc\.zgo\.at/,r=>r.fulfill({status:200,contentType:'text/javascript',body:''}));
  const pt=await ctxTactile.newPage();pt.on('pageerror',e=>erreurs.push(e.message));
  await pt.goto(url,{waitUntil:'load'});await pt.waitForSelector('#b-graph .bar-barre');
  await pt.$eval('#b-graph',f=>f.scrollIntoView({block:'center',behavior:'instant'}));
  const zone=await pt.evaluate(()=>{const s=document.querySelector('#b-graph svg').getBoundingClientRect(),b=document.querySelectorAll('#b-graph .bar-barre')[2].getBoundingClientRect();return {x:b.left+b.width/2,y:s.top+12};});
  await pt.touchscreen.tap(zone.x,zone.y);
  const tactile=await pt.evaluate(()=>{const f=document.getElementById('b-graph').getBoundingClientRect(),b=document.querySelector('#b-graph .bar-bulle'),r=b.getBoundingClientRect(),barre=document.querySelectorAll('#b-graph .bar-barre')[2].getBoundingClientRect();
   return {hidden:b.hidden,texte:b.textContent,dedans:r.left>=f.left&&r.right<=f.right&&r.top>=f.top,centre:Math.abs((r.left+r.right)/2-(barre.left+barre.right)/2)};});
  await ctxTactile.close();
  assert.equal(tactile.hidden,false);assert.equal(tactile.texte,'3e (½ finale) : 70 pts');assert.ok(tactile.dedans,'bulle hors du cadre');
  assert.ok(tactile.centre<2,'bulle centrée sur la colonne');
  ok('info-bulle au toucher, centrée sur la colonne et dans le cadre du graphique');

  // Hauteur réservée : identique sans le script du graphique (avant dessin) et après dessin
  const hApres=await page.$eval('#b-graph',f=>f.getBoundingClientRect().height);
  const ctx2=await navigateur.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
  await ctx2.route(/goatcounter|gc\.zgo\.at|bareme-graphique\.js/,r=>r.abort());
  const p2=await ctx2.newPage();await p2.goto(url,{waitUntil:'load'});
  const hAvant=await p2.$eval('#b-graph',f=>f.getBoundingClientRect().height);
  await ctx2.close();
  assert.ok(hAvant>=280,'hauteur réservée : '+hAvant);assert.equal(hApres,hAvant,'hauteur avant / après dessin');
  ok('hauteur du graphique réservée : '+hAvant+' px avant et après dessin');

  // Ordre sur téléphone : résultat, graphique, puis le tableau complet
  const ordre=await page.evaluate(()=>{const v=document.getElementById('b-verdict').getBoundingClientRect(),g=document.getElementById('b-graph').getBoundingClientRect(),t=document.getElementById('b-table').getBoundingClientRect();return v.bottom<=g.top&&g.bottom<=t.top;});
  assert.ok(ordre,'ordre résultat → graphique → tableau à 390 px');
  ok('à 390 px : résultat, graphique puis tableau');

  // 320 et 390 px : pas de défilement horizontal, le graphique tient dans sa colonne ; redessin à la nouvelle largeur
  for(const largeur of [320,390]){
   await page.setViewportSize({width:largeur,height:800});
   await page.waitForTimeout(150);
   const m=await page.evaluate(()=>{const f=document.getElementById('b-graph'),s=f.querySelector('svg'),r=f.getBoundingClientRect();
    return {deborde:document.documentElement.scrollWidth>document.documentElement.clientWidth,droite:r.right,gauche:r.left,vb:s.getAttribute('viewBox'),l:Math.round(s.getBoundingClientRect().width)};});
   assert.equal(m.deborde,false,largeur+' px : défilement horizontal');
   assert.ok(m.gauche>=16&&m.droite<=largeur-16,largeur+' px : gouttière');
   assert.equal(m.vb.split(' ')[2],String(m.l),largeur+' px : redessiné à la largeur');
  }
  ok('320 et 390 px : aucun défilement horizontal, gouttière respectée, redessin à la largeur');

  // Mouvement réduit : aucune transition
  await page.emulateMedia({reducedMotion:'reduce'});
  assert.ok(parseFloat(await page.$eval('#b-graph .bar-barre',b=>getComputedStyle(b).transitionDuration))<0.001);
  await page.emulateMedia({reducedMotion:'no-preference'});
  const duree=parseFloat(await page.$eval('#b-graph .bar-barre',b=>getComputedStyle(b).transitionDuration));assert.ok(duree>0&&duree<=0.3);
  ok('prefers-reduced-motion : aucune transition ; sinon une transition courte');

  // Sans JavaScript : renvoi au tableau
  const html=fs.readFileSync(path.join(racine,'bareme.html'),'utf8');
  assert.match(html,/<figure class="bar-graph" id="b-graph"[^>]*><noscript>[^]*?href="#b-table"[^]*?<\/noscript><\/figure>/);
  assert.match(html,/bareme-donnees\.js[^"]*" defer><\/script>\n<script src="assets\/js\/bareme-graphique\.js\?v=[0-9a-f]+" defer><\/script>\n<script src="assets\/js\/bareme\.js/);
  ok('noscript renvoie au tableau ; script chargé entre les données et bareme.js, versionné');

  assert.deepEqual(erreurs,[],'erreurs console');
  ok('0 erreur console');
 }finally{await navigateur.close();serveur.close();}
 console.log(nb+' contrôles OK');
}
principal().catch(e=>{console.error(e);serveur.close();process.exit(1);});
