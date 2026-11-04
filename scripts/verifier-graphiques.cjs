/* Vérification des graphiques SVG du compteur de match (score.html, récapitulatif) et de Mon espace (courbe de progression),
   dessinés avec les outils communs assets/js/graphique-svg.js (aussi utilisés par le barème) ; Edge à 390 et 320 px :
   une barre par donnée et longueur juste, courbe du match point par point (deux séries, trait plein / pointillés),
   étiquette sur le dernier point seulement, aria-label juste, info-bulle (souris et toucher), hauteur réservée,
   aucun défilement horizontal, mouvement réduit, contrastes ≥ 3:1 d'après les jetons, aucune couleur en dur, 0 erreur console.
   Lancer depuis la racine du site : node scripts/verifier-graphiques.cjs */
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

/* ---- Contrastes et jetons (sans navigateur) ---- */
function statique(){
 const css=fs.readFileSync(path.join(racine,'assets/style.css'),'utf8');
 const jeton=n=>css.match(new RegExp('--'+n+':(#[0-9a-fA-F]{6})'))[1];
 const lum=h=>{const c=[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255).map(v=>v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4));return .2126*c[0]+.7152*c[1]+.0722*c[2];};
 const ratio=(a,b)=>{const [x,y]=[lum(a),lum(b)].sort((p,q)=>q-p);return (x+.05)/(y+.05);};
 const ratios={};
 for(const n of ['turf','sky','dim','muted'])ratios[n]=ratio(jeton(n),jeton('bg'));
 for(const [n,r] of Object.entries(ratios))assert.ok(r>=3,`--${n} sur --bg : ${r.toFixed(2)}:1`);
 const feuille=fs.readFileSync(path.join(racine,'assets/css/joueur.css'),'utf8');
 // Les cadres des graphiques sont sur --bg ; séries et barres par jetons
 assert.match(feuille,/\.sc-graph\{[^}]*background:var\(--bg\)/);assert.match(feuille,/\.esp-figure\{[^}]*background:var\(--bg\)/);
 assert.match(feuille,/\.sc-barre-rempli\{fill:var\(--turf\)\}/);assert.match(feuille,/\.sc-barre\.b \.sc-barre-rempli\{fill:var\(--sky\)\}/);
 assert.match(feuille,/\.sc-courbe\{[^}]*stroke:var\(--turf\)/);assert.match(feuille,/\.sc-courbe\.b\{stroke:var\(--sky\);stroke-dasharray:/);
 assert.match(feuille,/\.esp-trace\{[^}]*stroke:var\(--turf\)[^}]*stroke-linecap:round/);
 // Aucune couleur en dur dans les règles des graphiques
 const regles=feuille.split('\n').filter(l=>/^\.(sc-(graph|svg|grille|axe|barre|courbe|marque|guide|legende|cle|bulle)|esp-(figure|courbe|grille|axe|trace|point|valeur|survol|bulle))/.test(l));
 assert.ok(regles.length>=20,'règles des graphiques trouvées : '+regles.length);
 regles.forEach(l=>assert.doesNotMatch(l,/#[0-9a-fA-F]{3,6}\b|rgba?\(\d/,'couleur en dur : '+l));
 // Le module commun ne contient ni couleur ni innerHTML ; ni score.js ni espace.js ne mettent de donnée en innerHTML
 const module=fs.readFileSync(path.join(racine,'assets/js/graphique-svg.js'),'utf8');
 assert.doesNotMatch(module,/\.innerHTML\s*=|insertAdjacentHTML|#[0-9a-fA-F]{6}/);
 assert.doesNotMatch(fs.readFileSync(path.join(racine,'assets/js/score.js'),'utf8'),/\.innerHTML\s*=|insertAdjacentHTML/);
 const espace=fs.readFileSync(path.join(racine,'assets/js/espace.js'),'utf8');
 // espace.js : seuls des en-têtes de tableau fixes (chaînes sans variable) passent par innerHTML
 (espace.match(/innerHTML=[^;]*/g)||[]).forEach(m=>assert.match(m,/^innerHTML="[^+`$]*"$/,'innerHTML avec donnée : '+m));
 // Chargement : graphique-svg.js avant les scripts qui l'utilisent, versionné, dans le shell hors connexion
 for(const [page,suivant] of [['score.html','score'],['espace.html','espace'],['bareme.html','bareme-donnees']]){
  const html=fs.readFileSync(path.join(racine,page),'utf8');
  assert.match(html,new RegExp('<script src="assets/js/graphique-svg\\.js\\?v=[0-9a-f]+" defer></script>\\n<script src="assets/js/'+suivant+'\\.js'),page);
 }
 const sw=fs.readFileSync(path.join(racine,'sw.js'),'utf8');
 assert.match(sw,/"assets\/js\/graphique-svg\.js"/);assert.match(sw,/const CACHE = "pa-v56-graphiques"/);
 ok('contrastes sur --bg : --turf '+ratios.turf.toFixed(2)+':1, --sky '+ratios.sky.toFixed(2)+':1, --muted '+ratios.muted.toFixed(2)+':1, --dim '+ratios.dim.toFixed(2)+':1 ; jetons seulement, pas d\'innerHTML de données');
 ok('graphique-svg.js chargé avant score.js, espace.js et le barème, versionné, dans le shell (pa-v56-graphiques)');
}

// Match de test : A gagne le 1er set 6-2, B mène le 2e 3-1 quand le match est arrêté ; motifs variés
function matchTest(){
 const P=[],ajoute=(g,m,n=1)=>{for(let i=0;i<n;i++)P.push({g,m});};
 const jeu=(g,m,adverse=0)=>{ajoute(1-g,null,adverse);ajoute(g,m,4);}; // 4 points gagnants (adverse < 3 : pas d'égalité)
 for(let i=0;i<6;i++){jeu(0,i%2?'smash':'volee',i%3);if(i<2)jeu(1,'faute',1);}
 jeu(0,'double');jeu(1,'gagnant',2);jeu(1,'double');jeu(1,'vitre',1);
 return {cle:'test-graphiques',config:{nomA:'Sam & Léo',nomB:'Les Rouennais du Club Padel',serveur:0,egalite:'decisif',dernierSet:'super'},
  points:P,fin:'2026-11-02T18:30:00.000Z',interrompu:true,score:'6-2 1-3',vainqueur:null,partenaire:null,type:'amical',saisie:'compteur'};
}

async function score(navigateur,base,erreurs){
 const match=matchTest(),n=match.points.length;
 const ctx=await navigateur.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
 await ctx.route(/goatcounter|gc\.zgo\.at/,r=>r.fulfill({status:200,contentType:'text/javascript',body:''}));
 await ctx.addInitScript(m=>{if(!sessionStorage.getItem('pose')){localStorage.setItem('pa-score-historique',JSON.stringify([m]));sessionStorage.setItem('pose','1');}},match);
 const page=await ctx.newPage();
 page.on('console',m=>{if(m.type()==='error')erreurs.push('score : '+m.text());});
 page.on('pageerror',e=>erreurs.push('score : '+e.message));
 await page.goto(base+'/score.html',{waitUntil:'load'});
 await page.click('#sc-historique li:first-child button');
 await page.waitForSelector('#sc-recap .sc-graph-courbe polyline');
 await page.waitForTimeout(700); // redessin à la vraie largeur (ResizeObserver) et fin du défilement doux vers le titre

 // Données attendues, calculées ici à partir des points (sans passer par le récap)
 const cumul=[0,0];match.points.forEach(p=>cumul[p.g]++);
 const motifs=[{},{}];match.points.forEach(p=>{if(p.m)motifs[p.g][p.m]=(motifs[p.g][p.m]||0)+1;});
 const r=await page.evaluate(()=>[...document.querySelectorAll('#sc-recap .sc-bloc')].map(b=>({
  titre:b.querySelector('h3').textContent,
  aria:(b.querySelector('svg')||{getAttribute:()=>null}).getAttribute('aria-label'),
  barres:[...b.querySelectorAll('.sc-barre')].map(g=>({v:+g.dataset.valeur,b:g.classList.contains('b'),nom:g.querySelector('.sc-barre-nom').textContent,val:g.querySelector('.sc-barre-val').textContent,
   l:g.querySelector('.sc-barre-rempli')?g.querySelector('.sc-barre-rempli').getBBox().width:0})),
  plot:b.querySelector('svg')?b.querySelector('svg').viewBox.baseVal.width-2:0})));
 const bloc=t=>r.find(x=>x.titre===t);
 const pg=bloc('Points gagnés');
 assert.deepEqual(pg.barres.map(x=>x.v),cumul,'points gagnés');
 const total=cumul[0]+cumul[1];
 pg.barres.forEach((x,i)=>assert.ok(Math.abs(x.l-x.v/total*pg.plot)<1,'longueur de la barre '+i+' : '+x.l));
 assert.equal(pg.barres[0].val,`${cumul[0]} (${Math.round(100*cumul[0]/total)} %)`);
 assert.equal(pg.aria,`Points gagnés : Sam & Léo ${pg.barres[0].val}, Les Rouennais du Club Padel ${pg.barres[1].val}.`);
 assert.equal(bloc('Points gagnés sur son service').barres.length,2);
 for(const [i,nom] of [[0,'Sam & Léo'],[1,'Les Rouennais du Club Padel']]){
  const bm=bloc('Points gagnés par '+nom),attendus=Object.entries(motifs[i]).sort((a,b)=>b[1]-a[1]);
  assert.equal(bm.barres.length,attendus.length,nom+' : une barre par motif');
  assert.deepEqual(bm.barres.map(x=>x.v),attendus.map(a=>a[1]),nom+' : valeurs des motifs');
  assert.ok(bm.barres.every(x=>x.b===(i===1)),nom+' : couleur de la paire');
  attendus.forEach(([, v])=>assert.match(bm.aria,new RegExp(' '+v+'(,|\\.)')));
 }
 // Libellé long coupé avec « … » sur le graphique, mais entier dans l'aria-label
 const motifsA=bloc('Points gagnés par Sam & Léo');
 assert.ok(motifsA.aria.includes('Double faute de Les Rouennais du Club Padel 4'));
 const coupe=motifsA.barres.find(x=>x.nom.startsWith('Double faute')).nom;
 assert.ok(coupe.endsWith('…')&&coupe.length<43,'libellé coupé : '+coupe);
 assert.ok(bloc('Points gagnés par Les Rouennais du Club Padel').aria.includes('Faute directe de Sam & Léo 8'));
 ok('récap : une barre par donnée (points, service, motifs), longueur proportionnelle, valeur écrite au bout, aria-label complet');

 // Courbe : deux séries de n+1 points, étiquette au dernier point seulement, aria-label (total, sets)
 const c=await page.evaluate(()=>{const f=document.querySelector('.sc-graph-courbe'),s=f.querySelector('svg');
  return {aria:s.getAttribute('aria-label'),role:s.getAttribute('role'),series:[...s.querySelectorAll('polyline.sc-courbe')].map(p=>({b:p.classList.contains('b'),n:p.points.numberOfItems,
   dernier:p.points.getItem(p.points.numberOfItems-1).y,tiret:getComputedStyle(p).strokeDasharray})),
   valeurs:[...s.querySelectorAll('.sc-courbe-valeur')].map(t=>({p:+t.dataset.paire,t:t.textContent,x:+t.getAttribute('x')})),
   marques:[...s.querySelectorAll(':scope > g:not(.sc-repere) .sc-marque')].map(m=>m.tagName),
   legende:f.querySelector('figcaption').textContent,points:f.dataset.points,larg:s.viewBox.baseVal.width};});
 assert.equal(c.role,'img');assert.equal(+c.points,n);
 assert.equal(c.series.length,2);assert.ok(c.series.every(s=>s.n===n+1),'n+1 points par série');
 assert.equal(c.series[0].tiret,'none');assert.notEqual(c.series[1].tiret,'none');
 assert.deepEqual(c.marques,['circle','rect'],'rond et carré au dernier point');
 assert.deepEqual(c.valeurs.map(v=>v.t),cumul.map(String),'étiquettes du dernier point = totaux');
 assert.equal(c.valeurs.length,2,'aucune autre étiquette de valeur');
 assert.ok(c.series[0].dernier<c.series[1].dernier,'la paire qui a le plus de points finit plus haut');
 assert.match(c.aria,new RegExp(`^Points gagnés au fil du match, ${n} points joués : Sam & Léo ${cumul[0]}, Les Rouennais du Club Padel ${cumul[1]}\\.`));
 assert.match(c.aria,/Set 1 \(6-2\) terminé au point \d+ : Sam & Léo \d+, Les Rouennais du Club Padel \d+\./);
 assert.match(c.legende,/Sam & Léo \(trait plein\).*\(pointillés\)/);
 ok(`courbe du match : 2 séries de ${n+1} points (plein / pointillés, rond / carré), étiquette sur le dernier point seulement, aria-label juste`);

 // Info-bulle au survol de la courbe et d'une barre
 await page.$eval('.sc-graph-courbe',f=>f.scrollIntoView({block:'center',behavior:'instant'}));
 const cible=await page.evaluate(()=>{const s=document.querySelector('.sc-graph-courbe svg'),r=s.getBoundingClientRect(),p=s.querySelector('polyline').points.getItem(10);
  return {x:r.left+p.x*r.width/s.viewBox.baseVal.width,y:r.top+r.height/2};});
 await page.mouse.move(cible.x,cible.y);
 const attendu10=[0,0];match.points.slice(0,10).forEach(p=>attendu10[p.g]++);
 assert.equal(await page.$eval('.sc-graph-courbe .sc-bulle',b=>b.hidden?'cachée':b.textContent),`Point 10 : Sam & Léo ${attendu10[0]} · Les Rouennais du Club Padel ${attendu10[1]}`);
 assert.equal(await page.$eval('.sc-graph-courbe .sc-bulle',b=>b.getAttribute('aria-hidden')),'true');
 await page.mouse.move(2,2);
 assert.equal(await page.$eval('.sc-graph-courbe .sc-bulle',b=>b.hidden),true);
 ok('info-bulle de la courbe au survol (score au point visé), cachée en sortant, aria-hidden');

 // Hauteurs réservées : identiques à 390 et 320 px, redessin à la largeur, aucun défilement horizontal
 const mesure=()=>page.evaluate(()=>({h:[...document.querySelectorAll('#sc-recap svg')].map(s=>Math.round(s.getBoundingClientRect().height)),
  vb:[...document.querySelectorAll('#sc-recap svg')].map(s=>s.viewBox.baseVal.width===Math.round(s.getBoundingClientRect().width)),
  deborde:document.documentElement.scrollWidth>document.documentElement.clientWidth,
  dehors:[...document.querySelectorAll('#sc-recap .sc-graph')].some(f=>{const r=f.getBoundingClientRect();return r.left<0||r.right>innerWidth;})}));
 const a390=await mesure();
 if(process.env.CAPTURES)await page.locator('#sc-recap').screenshot({path:path.join(process.env.CAPTURES,'graphiques-score-390.png')});
 await page.setViewportSize({width:320,height:800});await page.waitForTimeout(200);
 const a320=await mesure();
 assert.deepEqual(a320.h,a390.h,'hauteur stable entre 390 et 320 px');
 for(const [l,m] of [[390,a390],[320,a320]]){assert.equal(m.deborde,false,l+' px : défilement horizontal');assert.equal(m.dehors,false,l+' px : graphique hors écran');assert.ok(m.vb.every(Boolean),l+' px : redessin à la largeur');}
 // Au toucher : appui sur la 1re barre des points gagnés
 const ctxT=await navigateur.newContext({viewport:{width:320,height:800},hasTouch:true,isMobile:true,serviceWorkers:'block'});
 await ctxT.route(/goatcounter|gc\.zgo\.at/,r=>r.fulfill({status:200,contentType:'text/javascript',body:''}));
 await ctxT.addInitScript(m=>localStorage.setItem('pa-score-historique',JSON.stringify([m])),match);
 const pt=await ctxT.newPage();pt.on('pageerror',e=>erreurs.push('score tactile : '+e.message));
 await pt.goto(base+'/score.html',{waitUntil:'load'});await pt.tap('#sc-historique li:first-child button');
 await pt.waitForSelector('.sc-graph-barres .sc-barre-rempli');await pt.waitForTimeout(700);
 await pt.$eval('.sc-graph-barres',f=>f.scrollIntoView({block:'center',behavior:'instant'}));
 const zone=await pt.$eval('.sc-graph-barres .sc-barre-rempli',b=>{const r=b.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};});
 await pt.touchscreen.tap(zone.x,zone.y);
 const t=await pt.evaluate(()=>{const f=document.querySelector('.sc-graph-barres'),b=f.querySelector('.sc-bulle'),rf=f.getBoundingClientRect(),rb=b.getBoundingClientRect();
  return {texte:b.hidden?null:b.textContent,dedans:rb.left>=rf.left&&rb.right<=rf.right,survol:f.querySelectorAll('.sc-barre.survol').length};});
 assert.equal(t.texte,`Sam & Léo : ${cumul[0]} points sur ${total} (${Math.round(100*cumul[0]/total)} %)`);assert.ok(t.dedans,'bulle dans le cadre');assert.equal(t.survol,1);
 assert.equal(await pt.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth),false);
 await ctxT.close();
 ok('320 et 390 px : hauteurs identiques ('+a390.h.join(', ')+' px), redessin à la largeur, aucun débordement ; info-bulle au toucher dans le cadre');

 // Mouvement réduit : aucune transition
 await page.emulateMedia({reducedMotion:'reduce'});
 assert.ok(parseFloat(await page.$eval('.sc-barre-rempli',b=>getComputedStyle(b).transitionDuration))<0.001);
 await page.emulateMedia({reducedMotion:'no-preference'});
 ok('prefers-reduced-motion : aucune transition');

 // Match d'un seul point : pas de courbe (deux points au moins), barres quand même
 await page.evaluate(m=>{localStorage.setItem('pa-score-historique',JSON.stringify([{...m,cle:'court',points:[{g:1,m:'smash'}],score:''}]));},match);
 await page.reload({waitUntil:'load'});await page.click('#sc-historique li:first-child button');
 assert.equal(await page.locator('.sc-graph-courbe').count(),0);
 assert.deepEqual(await page.$eval('.sc-graph-barres',f=>[...f.querySelectorAll('.sc-barre')].map(x=>x.dataset.valeur)),['0','1']);
 assert.equal(await page.locator('.sc-graph-barres').first().locator('.sc-barre-rempli').count(),1,'aucune barre dessinée pour zéro');
 ok('match d\'un point : pas de courbe, barre absente pour zéro');
 await ctx.close();
}

async function espace(navigateur,base,erreurs){
 const ctx=await navigateur.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
 await ctx.route('**/assets/vendor/supabase-*.js*',x=>x.fulfill({contentType:'text/javascript',body:''}));
 await ctx.route(/goatcounter|gc\.zgo\.at/,r=>r.fulfill({status:200,contentType:'text/javascript',body:''}));
 // Trois tournois datés dans les 12 derniers mois
 await ctx.addInitScript(()=>{
  if(sessionStorage.getItem('pose'))return;sessionStorage.setItem('pose','1');
  const il=j=>{const d=new Date(Date.now()-j*864e5);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
  localStorage.setItem('pa-sim-resultats',JSON.stringify([{cat:'P100',place:1,nb:16,sexe:'messieurs',date:il(300)},{cat:'P250',place:5,nb:16,sexe:'messieurs',date:il(150)},{cat:'P50',place:2,nb:16,sexe:'messieurs',date:il(40)}]));
 });
 const page=await ctx.newPage();
 page.on('console',m=>{if(m.type()==='error')erreurs.push('espace : '+m.text());});
 page.on('pageerror',e=>erreurs.push('espace : '+e.message));
 await page.goto(base+'/espace.html',{waitUntil:'load'});
 const r=await page.evaluate(()=>{
  const B=window.PA_BAREME,liste=JSON.parse(localStorage.getItem('pa-sim-resultats')),fin=new Date(),mois=['janv.','févr.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.'],att=[];
  // Classement attendu à chaque fin de mois, recalculé ici (même règle que la page)
  for(let i=11;i>=0;i--){const d=new Date(fin.getFullYear(),fin.getMonth()-i+1,0,12),m=new Date(fin.getFullYear(),fin.getMonth()-i,1);
   const jour=i===0?B.simIso(new Date()):B.simIso(d);att.push({t:mois[m.getMonth()]+' '+m.getFullYear(),v:B.classementEstime(liste,jour).total});}
  const s=document.querySelector('#esp-progression svg'),vb=s.viewBox.baseVal;
  return {att,aria:s.getAttribute('aria-label'),role:s.getAttribute('role'),points:[...s.querySelectorAll('circle.esp-point')].map(c=>+c.getAttribute('cy')),
   etiquettes:[...s.querySelectorAll('.esp-valeur')].map(t=>t.textContent),trace:s.querySelector('polyline.esp-trace').points.numberOfItems,
   cap:getComputedStyle(s.querySelector('polyline.esp-trace')).strokeLinecap,lignes:s.querySelectorAll('line.esp-grille').length,
   larg:vb.width===Math.round(s.getBoundingClientRect().width),zone:Math.round(document.getElementById('esp-progression').getBoundingClientRect().height)};
 });
 const nombre=v=>v.toLocaleString('fr-FR');
 assert.equal(r.role,'img');assert.equal(r.points.length,12);assert.equal(r.trace,12);assert.equal(r.cap,'round');assert.equal(r.lignes,5);assert.ok(r.larg);
 assert.ok(r.att.some(a=>a.v>0),'données de test');
 const meilleur=r.att.reduce((m,a)=>a.v>m.v?a:m,r.att[0]),dernier=r.att[11];
 assert.equal(r.aria,`Classement estimé à la fin de chaque mois, sur les 12 derniers mois : ${r.att[0].t} ${nombre(r.att[0].v)} points, ${dernier.t} ${nombre(dernier.v)} points ; meilleur classement : ${nombre(meilleur.v)} points (${meilleur.t}).`);
 assert.deepEqual(r.etiquettes,[nombre(dernier.v)+' pts'],'étiquette sur le dernier point seulement');
 // Plus le classement est haut, plus le point est haut (y plus petit)
 for(let i=1;i<12;i++)if(r.att[i].v>r.att[i-1].v)assert.ok(r.points[i]<r.points[i-1],'ordre des points '+i);
 ok('courbe d\'espace : 12 points = 12 mois, extrémités arrondies, grille, étiquette sur le dernier point seulement, aria-label (premier, dernier, meilleur : '+nombre(meilleur.v)+' pts)');

 // Info-bulle au survol d'un mois, au toucher sur téléphone
 await page.$eval('#esp-progression',z=>z.scrollIntoView({block:'center',behavior:'instant'}));
 await page.locator('#esp-progression .esp-survol').nth(3).hover();
 assert.equal(await page.textContent('#esp-bulle'),`${r.att[3].t} : ${nombre(r.att[3].v)} points`);
 assert.equal(await page.locator('#esp-progression circle.actif').count(),1);
 await page.mouse.move(2,2);assert.equal(await page.$eval('#esp-bulle',b=>b.hidden),true);
 if(process.env.CAPTURES)await page.locator('#esp-bloc-progression').screenshot({path:path.join(process.env.CAPTURES,'graphiques-espace-390.png')});

 // Hauteur réservée : zone vide (script de l'espace bloqué) = zone dessinée ; 320 px sans débordement, même hauteur
 const ctx2=await navigateur.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
 await ctx2.route('**/assets/vendor/supabase-*.js*',x=>x.fulfill({contentType:'text/javascript',body:''}));
 await ctx2.route(/goatcounter|gc\.zgo\.at|assets\/js\/espace\.js/,x=>x.abort());
 const p2=await ctx2.newPage();await p2.goto(base+'/espace.html',{waitUntil:'load'});
 const hAvant=await p2.$eval('#esp-progression',z=>Math.round(z.getBoundingClientRect().height));
 await ctx2.close();
 assert.equal(r.zone,hAvant,'hauteur réservée '+hAvant+' px, dessinée '+r.zone+' px');
 await page.setViewportSize({width:320,height:800});await page.waitForTimeout(400);
 const m320=await page.evaluate(()=>{const s=document.querySelector('#esp-progression svg');return {deborde:document.documentElement.scrollWidth>document.documentElement.clientWidth,
  larg:s.viewBox.baseVal.width===Math.round(s.getBoundingClientRect().width),zone:Math.round(document.getElementById('esp-progression').getBoundingClientRect().height),
  etiquette:(()=>{const t=s.querySelector('.esp-valeur').getBoundingClientRect(),f=document.querySelector('.esp-figure').getBoundingClientRect();return t.left>=f.left&&t.right<=f.right;})()};});
 assert.equal(m320.deborde,false,'320 px : défilement horizontal');assert.ok(m320.larg,'320 px : redessin à la largeur');assert.equal(m320.zone,hAvant,'320 px : hauteur');
 assert.ok(m320.etiquette,'320 px : étiquette du dernier point dans le cadre');
 ok('courbe d\'espace : hauteur réservée ('+hAvant+' px, identique à 390 et 320 px), 320 px sans débordement, étiquette dans le cadre');
 const ctxT=await navigateur.newContext({viewport:{width:320,height:800},hasTouch:true,isMobile:true,serviceWorkers:'block'});
 await ctxT.route('**/assets/vendor/supabase-*.js*',x=>x.fulfill({contentType:'text/javascript',body:''}));
 await ctxT.route(/goatcounter|gc\.zgo\.at/,x=>x.fulfill({status:200,contentType:'text/javascript',body:''}));
 await ctxT.addInitScript(l=>localStorage.setItem('pa-sim-resultats',l),await page.evaluate(()=>localStorage.getItem('pa-sim-resultats')));
 const pt=await ctxT.newPage();pt.on('pageerror',e=>erreurs.push('espace tactile : '+e.message));
 await pt.goto(base+'/espace.html',{waitUntil:'load'});await pt.waitForSelector('#esp-progression svg');
 await pt.$eval('#esp-progression',z=>z.scrollIntoView({block:'center',behavior:'instant'}));
 const z=await pt.$eval('#esp-progression .esp-survol:nth-of-type(12)',x=>{const b=x.getBoundingClientRect();return {x:b.left+b.width/2,y:b.top+b.height/2};}).catch(async()=>pt.evaluate(()=>{const b=document.querySelectorAll('#esp-progression .esp-survol')[11].getBoundingClientRect();return {x:b.left+b.width/2,y:b.top+b.height/2};}));
 await pt.touchscreen.tap(z.x,z.y);
 const bt=await pt.evaluate(()=>{const b=document.getElementById('esp-bulle'),rb=b.getBoundingClientRect(),rf=b.parentElement.getBoundingClientRect();return {texte:b.hidden?null:b.textContent,dedans:rb.left>=rf.left-1&&rb.right<=rf.right+1};});
 assert.equal(bt.texte,`${dernier.t} : ${nombre(dernier.v)} points`);assert.ok(bt.dedans,'bulle dans le cadre');
 await ctxT.close();
 ok('courbe d\'espace : info-bulle au survol et au toucher, dans le cadre, cachée en sortant');
 await page.emulateMedia({reducedMotion:'reduce'});
 assert.ok(parseFloat(await page.$eval('.esp-point',c=>getComputedStyle(c).transitionDuration))<0.001);
 await page.emulateMedia({reducedMotion:'no-preference'});
 ok('courbe d\'espace : aucune transition en mouvement réduit');
 await ctx.close();
}

(async()=>{
 statique();
 await new Promise(r=>serveur.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+serveur.address().port;
 const navigateur=await chromium.launch({channel:'msedge',headless:true});
 const erreurs=[];
 try{
  await score(navigateur,base,erreurs);
  await espace(navigateur,base,erreurs);
  assert.deepEqual(erreurs,[],'erreurs console');
  ok('0 erreur console');
 }finally{await navigateur.close();serveur.close();}
 console.log(nb+' contrôles OK');
})().catch(e=>{console.error(e);serveur.close();process.exitCode=1;});
