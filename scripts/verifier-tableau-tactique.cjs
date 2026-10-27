/* Vérification du tableau tactique (tactique.html#tableau, assets/js/tableau-tactique.js) :
   1) sous Node : positions de départ (4 phases de Placement, 55 scènes du quiz), contrôle des tableaux relus depuis
      l'appareil, image d'export ;
   2) dans Edge : déplacer à la souris et au clavier, flèches tracées en glissant et au doigt (deux touchers), annuler et
      effacer, positions de départ, sauvegarde (nom obligatoire, 5 au plus, remplacement, réouverture après rechargement,
      suppression), export PNG (580 × 1220), 390 et 320 px sans débordement, console sans erreur.
   Lancer depuis la racine du site : node scripts/verifier-tableau-tactique.cjs */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),vm=require('node:vm');
const {chromium}=require('playwright');
const racine=path.join(__dirname,'..');
let nb=0;
function ok(nom){nb++;console.log('OK '+nom);}
const lire=f=>fs.readFileSync(path.join(racine,f),'utf8');

function horsNavigateur(){
 const ctx={window:{},document:{getElementById:()=>null},localStorage:{getItem:()=>null}};vm.createContext(ctx);
 vm.runInContext(lire('assets/js/placement.js').replace(/drawPhase\("def"\);\s*$/,'').replace(/document\.querySelectorAll[^\n]*addEventListener[^\n]*\n/,'')+';this.PH=PH;',ctx);
 vm.runInContext(lire('assets/js/quiz-tactique-donnees.js')+';this.Q=QUIZ_TACTIQUE;',ctx);
 vm.runInContext(lire('assets/js/tableau-tactique.js'),ctx);
 const {depuisPhase,depuisQuiz,valide,svg}=ctx.window.PA_TABLEAU;
 for(const k of ['def','trans','att','smash']){
  const e=depuisPhase(k);assert.ok(valide(e),k);
  assert.ok(e.pions.A1[1]<0&&e.pions.A2[1]<0&&e.pions.B1[1]>0&&e.pions.B2[1]>0,k+' : chaque paire dans son camp');
 }
 assert.ok(depuisPhase('def').pions.A1[1]<-6&&depuisPhase('att').pions.A1[1]>-4,'défense au fond, attaque au filet');
 ctx.Q.forEach(q=>{const e=depuisQuiz(q);assert.ok(valide(e),q.id);const a1=q.joueurs.find(j=>j[0]==="A1");assert.deepEqual([...e.pions.A1],[a1[2],a1[3]]);});
 const base=depuisPhase('def'),essai=f=>{const e=JSON.parse(JSON.stringify(base));f(e);return valide(e);};
 assert.equal(essai(e=>{e.pions.A1=[NaN,0];}),false);
 assert.equal(essai(e=>{e.pions.B2=[0,12];}),false);
 assert.equal(essai(e=>{delete e.pions.balle;}),false);
 assert.equal(essai(e=>{e.fleches=[{type:'script',de:[0,0],a:[1,1]}];}),false);
 assert.equal(essai(e=>{e.fleches=Array(41).fill({type:'depl',de:[0,0],a:[1,1]});}),false);
 assert.equal(valide(null),false);
 const image=svg(base,{fond:'#000',sol:'#00f',ligne:'#fff',cadre:'#fff',texte:'#fff',discret:'#aaa',nous:'#0f0',eux:'#f00',balle:'#ff0',contour:'#000'},'<Mon plan>');
 assert.match(image,/width="580" height="1220"/);assert.match(image,/&lt;Mon plan&gt;/);assert.doesNotMatch(image,/<Mon plan>/);
 ok('départs valides (4 phases de Placement, '+ctx.Q.length+' scènes du quiz), tableaux relus contrôlés, image d’export échappée');
}

const TYPES={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.webmanifest':'application/manifest+json'};
const serveur=http.createServer((req,res)=>{
 const rel=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\//,'')||'index.html';
 const p=path.resolve(racine,rel);
 if(!p.startsWith(racine+path.sep)){res.writeHead(403);res.end();return;}
 fs.readFile(p,(e,b)=>{if(e){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',TYPES[path.extname(p)]||'text/plain');res.end(b);});
});

// Position (en mètres) des pions lue dans le dessin, et point de l'écran correspondant à une position
const pions=page=>page.$$eval('#tb-svg [data-pion]',gs=>Object.fromEntries(gs.map(g=>{const c=g.querySelector('circle');return [g.dataset.pion,[-Number(c.getAttribute('cx')),-Number(c.getAttribute('cy'))]];})));
const ecran=(page,x,z)=>page.$eval('#tb-svg',(s,[x,z])=>{const p=new DOMPoint(-x,-z).matrixTransform(s.getScreenCTM());return [p.x,p.y];},[x,z]);
const fleches=page=>page.$$eval('#tb-svg [data-fleche]',l=>l.map(x=>x.classList.contains('tb-balle')?'balle':'depl'));

async function dansLeNavigateur(base){
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const erreurs=[];
 try{
  // Ordinateur : souris, clavier, départs, sauvegarde, export
  let ctx=await browser.newContext({serviceWorkers:'block',viewport:{width:1280,height:900}});
  await ctx.route('https://**',r=>r.fulfill({status:200,body:''}));
  let page=await ctx.newPage();
  page.on('pageerror',e=>erreurs.push(e.message));page.on('console',m=>{if(m.type()==='error')erreurs.push(m.text());});
  await page.goto(base+'/tactique.html#tableau');
  await page.locator('#tb-svg').scrollIntoViewIfNeeded();
  assert.equal(await page.locator('#tb-svg [data-pion]').count(),5);
  assert.deepEqual(await fleches(page),[]);
  assert.equal(await page.isDisabled('#tb-annuler'),true);
  // Souris : Toi glissé jusqu'au filet, au centre
  let p=await pions(page);
  let [sx,sy]=await ecran(page,...p.A1),[cx,cy]=await ecran(page,0,-3);
  await page.mouse.move(sx,sy);await page.mouse.down();await page.mouse.move(cx,cy,{steps:8});await page.mouse.up();
  p=await pions(page);
  assert.ok(Math.hypot(p.A1[0]-0,p.A1[1]+3)<0.15,'Toi déplacé à la souris : '+p.A1);
  assert.match(await page.textContent('#tb-statut'),/^Toi : dans ton camp, près du filet, au centre\.$/);
  // Hors du terrain : la position reste dans l'enceinte
  [sx,sy]=await ecran(page,...p.B1);
  await page.mouse.move(sx,sy);await page.mouse.down();await page.mouse.move(sx,1,{steps:6});await page.mouse.up();
  p=await pions(page);assert.equal(p.B1[1],10,'pion borné au fond du terrain');
  // Clavier : Partenaire avance de 1 m (4 × 0,25) et se décale d'1 m vers la gauche (Maj)
  const a2=p.A2;
  await page.locator('[data-pion="A2"]').focus();
  for(let i=0;i<4;i++)await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Shift+ArrowLeft');
  p=await pions(page);
  assert.ok(Math.abs(p.A2[1]-(a2[1]+1))<0.01&&Math.abs(p.A2[0]-Math.min(5,a2[0]+1))<0.01,'Partenaire déplacé au clavier');
  assert.equal(await page.evaluate(()=>document.activeElement.dataset.pion),'A2','le focus reste sur le pion');
  // Flèche de déplacement en glissant ; un glisser trop court ne trace rien
  await page.click('[data-mode="depl"]');
  [sx,sy]=await ecran(page,-2,-8);[cx,cy]=await ecran(page,-2,-3);
  await page.mouse.move(sx,sy);await page.mouse.down();await page.mouse.move(cx,cy,{steps:5});await page.mouse.up();
  assert.deepEqual(await fleches(page),['depl']);
  await page.click('[data-mode="balle"]');
  [sx,sy]=await ecran(page,2,8);[cx,cy]=await ecran(page,-3,-7);
  await page.mouse.move(sx,sy);await page.mouse.down();await page.mouse.move(cx,cy,{steps:5});await page.mouse.up();
  assert.deepEqual(await fleches(page),['depl','balle']);
  await page.click('#tb-annuler');assert.deepEqual(await fleches(page),['depl']);
  // Départs : une phase, puis une scène du quiz (positions du moteur, trace de la balle en flèche)
  await page.selectOption('#tb-depart','phase:att');
  const att=await page.evaluate(()=>PA_TABLEAU.depuisPhase('att'));
  p=await pions(page);
  for(const id of Object.keys(att.pions))assert.ok(Math.hypot(p[id][0]-att.pions[id][0],p[id][1]-att.pions[id][1])<0.01,'phase attaque : '+id);
  assert.deepEqual(await fleches(page),[],'nouveau départ : flèches effacées');
  const scene=await page.evaluate(()=>QUIZ_TACTIQUE.find(q=>q.trace.length));
  await page.selectOption('#tb-depart','quiz:'+scene.id);
  p=await pions(page);
  assert.ok(Math.hypot(p.balle[0]-scene.balle[0],p.balle[1]-scene.balle[2])<0.01,'scène du quiz : balle');
  assert.deepEqual(await fleches(page),['balle']);
  assert.equal(await page.locator('#tb-depart option').count(),4+await page.evaluate(()=>QUIZ_TACTIQUE.length));
  ok('souris (glisser, borné au terrain), clavier (pas de 0,25 et 1 m), flèches tracées et annulées, départs : phases et scènes du quiz');
  // Sauvegarde : nom obligatoire, 5 au plus, même nom = remplacement, réouverture après rechargement, suppression
  await page.click('#tb-sauver');
  assert.match(await page.textContent('#tb-statut'),/Donne un nom/);
  for(const n of ['Plan 1','Plan 2','Plan 3','Plan 4','Plan 5']){await page.fill('#tb-nom',n);await page.click('#tb-sauver');}
  await page.fill('#tb-nom','Plan 6');await page.click('#tb-sauver');
  assert.match(await page.textContent('#tb-statut'),/5 tableaux au plus/);
  await page.click('#tb-effacer');
  await page.fill('#tb-nom','Plan 2');await page.click('#tb-sauver');
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('pa-tableaux-tactiques')).length),5);
  await page.reload();
  await page.locator('#tb-sauves').scrollIntoViewIfNeeded();
  assert.equal(await page.locator('.tb-liste li').count(),5);
  await page.click('[data-ouvrir="0"]');
  assert.deepEqual(await fleches(page),['balle'],'Plan 1 rouvert avec sa flèche');
  assert.equal(await page.inputValue('#tb-nom'),'Plan 1');
  await page.click('[data-ouvrir="1"]');
  assert.deepEqual(await fleches(page),[],'Plan 2 remplacé (sans flèche)');
  await page.click('[data-supprimer="4"]');
  assert.equal(await page.locator('.tb-liste li').count(),4);
  // Tableau corrompu sur l'appareil : ignoré, sans erreur
  await page.evaluate(()=>{const l=JSON.parse(localStorage.getItem('pa-tableaux-tactiques'));l.push({nom:'cassé',etat:{pions:{},fleches:'x'}});localStorage.setItem('pa-tableaux-tactiques',JSON.stringify(l));});
  await page.reload();
  assert.equal(await page.locator('.tb-liste li').count(),4,'tableau invalide ignoré');
  ok('sauvegarde sur l’appareil : nom obligatoire, 5 au plus, remplacement, réouverture après rechargement, suppression, tableau invalide ignoré');
  // Export PNG : le lien de téléchargement est intercepté dans la page (le mécanisme de téléchargement d'Edge sans
  // affichage laisse un onglet ouvert qui bloque la fermeture) ; on relit l'image produite
  await page.evaluate(()=>{HTMLAnchorElement.prototype.click=function(){if(this.download)window.__export=fetch(this.href).then(r=>r.arrayBuffer()).then(b=>({nom:this.download,octets:[...new Uint8Array(b)]}));};});
  await page.fill('#tb-nom','Défense à deux');
  await page.click('#tb-png');
  await page.waitForFunction(()=>window.__export);
  const exp=await page.evaluate(()=>window.__export);
  assert.equal(exp.nom,'defense-a-deux.png');
  const b=Buffer.from(exp.octets);
  assert.equal(b.subarray(1,4).toString(),'PNG');
  assert.deepEqual([b.readUInt32BE(16),b.readUInt32BE(20)],[580,1220]);
  assert.equal(await page.textContent('#tb-statut'),'Image exportée.');
  ok('export PNG : '+b.length+' octets, 580 × 1220, nom de fichier tiré du titre');
  await ctx.close();

  // Mobile : flèche au doigt (deux touchers), pas de débordement
  for(const [largeur,hauteur] of [[390,844],[320,700]]){
   ctx=await browser.newContext({serviceWorkers:'block',viewport:{width:largeur,height:hauteur},hasTouch:true,isMobile:true});
   await ctx.route('https://**',r=>r.fulfill({status:200,body:''}));
   page=await ctx.newPage();
   page.on('pageerror',e=>erreurs.push(e.message));page.on('console',m=>{if(m.type()==='error')erreurs.push(m.text());});
   await page.goto(base+'/tactique.html#tableau');
   await page.tap('[data-mode="balle"]');
   await page.$eval('#tb-svg',e=>e.scrollIntoView({block:'center',behavior:'instant'})); // pas sous le menu fixe, sans défilement animé
   const [x1,y1]=await ecran(page,1,5),[x2,y2]=await ecran(page,-2,-6);
   await page.touchscreen.tap(x1,y1);
   assert.match(await page.textContent('#tb-statut'),/Départ placé/);
   await page.touchscreen.tap(x2,y2);
   assert.deepEqual(await fleches(page),['balle'],largeur+' px : flèche au doigt');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,largeur+' px : pas de débordement');
   await ctx.close();
  }
  ok('390 et 320 px : flèche tracée au doigt, aucun débordement');
 }finally{await browser.close();}
 assert.deepEqual(erreurs,[]);
 ok('aucune erreur dans la console');
}

(async()=>{
 horsNavigateur();
 await new Promise(r=>serveur.listen(0,'127.0.0.1',r));
 try{await dansLeNavigateur('http://127.0.0.1:'+serveur.address().port);}
 finally{serveur.close();}
 console.log(nb+' vérifications réussies.');
})().catch(e=>{console.error(e);process.exitCode=1;serveur.close();});
