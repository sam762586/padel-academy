/* Vérification de « Ma carte de joueur » (carte.html, assets/js/carte.js, carte-donnees.js, carte-rendu.js, assets/carte.css) :
   1) moteur (sans navigateur) : les trois exemples de carte-donnees.js et les extrêmes donnent les notes attendues ;
   2) navigateur (Edge, 390 px, toute adresse https bloquée) : repère lu dans pa-quiz-dernier (jamais écrit), parcours complet
      au clavier jusqu'à la carte (focus sur la question suivante, compteur aria-live, groupe nommé), ajustement borné à ±5,
      pseudo invalide refusé, photo recadrée et gardée après rechargement, téléchargement PNG aux bonnes dimensions (carte
      et story), carte retrouvée au rechargement, « Retirer la photo », aucun débordement à 390 et 320 px, 0 erreur console.
   Lancer depuis la racine du site : node scripts/verifier-carte.cjs */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),vm=require('node:vm'),os=require('node:os');
const {chromium}=require('playwright');
const racine=path.join(__dirname,'..');
let nb=0;
function ok(nom){nb++;console.log('OK '+nom);}
process.on('unhandledRejection',e=>{if(e&&e.name==='TargetClosedError')return;console.error(e);process.exitCode=1;});

/* ---- 1. Moteur pur ---- */
function moteur(){
 const bac={window:{}};
 vm.runInNewContext(fs.readFileSync(path.join(racine,'assets/js/carte-donnees.js'),'utf8'),bac);
 const C=bac.window.PA_CARTE,J=x=>JSON.parse(JSON.stringify(x));
 assert.equal(C.QUESTIONS.length,12);assert.equal(C.CLES.length,6);C.QUESTIONS.forEach(q=>assert.equal(q.r.length,4));
 // Léa, sans repère
 let r=J(C.calcul.carte([2,1,1,0,1,0,1,0,2,3,1,2]));
 assert.deepEqual(r.notes,{VOL:16,AER:16,DEF:20,LOB:16,SER:28,TAC:26});assert.equal(r.posteSuggere,'polyvalent');assert.equal(r.globale,20);assert.equal(r.rang,'bronze');
 // Hugo, droite, palier 2
 r=J(C.calcul.carte([1,3,3,1,0,3,2,3,3,1,2,3],{base:{palier:2},poste:'droite'}));
 assert.deepEqual(r.notes,{VOL:64,AER:59,DEF:63,LOB:64,SER:63,TAC:63});assert.equal(r.posteSuggere,'droite');assert.equal(r.poste,'droite');assert.equal(r.globale,63);assert.equal(r.rang,'argent');
 // Karim, gauche, niveau 7
 r=J(C.calcul.carte([3,0,2,3,0,3,0,3,3,1,3,2],{base:{niveau:7},poste:'gauche'}));
 assert.deepEqual(r.notes,{VOL:71,AER:80,DEF:75,LOB:73,SER:74,TAC:72});assert.equal(r.posteSuggere,'gauche');assert.equal(r.globale,75);assert.equal(r.rang,'or');
 ok('moteur : Léa (bronze 20), Hugo (argent 63, droite), Karim (or 75, gauche) conformes aux exemples');
 const meilleures=[1,2,2,3,3,1,2,1,1,2,2,1],pires=[2,1,1,0,1,0,1,0,2,0,1,0];
 r=J(C.calcul.carte(meilleures));C.CLES.forEach(k=>assert.equal(r.notes[k],90));assert.equal(r.globale,90);assert.equal(r.rang,'elite');
 r=J(C.calcul.carte(pires));C.CLES.forEach(k=>assert.equal(r.notes[k],16));assert.equal(r.globale,16);assert.equal(r.rang,'bronze');
 r=J(C.calcul.carte(meilleures,{base:{palier:5}}));C.CLES.forEach(k=>assert.equal(r.notes[k],99));
 r=J(C.calcul.carte(pires,{base:{palier:0}}));C.CLES.forEach(k=>assert.equal(r.notes[k],15));
 r=J(C.calcul.carte([]));C.CLES.forEach(k=>assert.ok(r.notes[k]>=1&&r.notes[k]<=99));
 ok('moteur : extrêmes (90 / 16 sans repère, 99 / 15 aux paliers 5 et 0), tableau vide toléré');
}

/* ---- 2. Navigateur ---- */
const serveur=http.createServer((req,res)=>{
 const rel=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\//,'')||'index.html';
 const p=path.resolve(racine,rel);
 if(!p.startsWith(racine+path.sep)){res.writeHead(403);res.end();return;}
 fs.readFile(p,(e,b)=>{if(e){res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2','.webmanifest':'application/manifest+json'})[path.extname(p)]||'text/plain');res.end(b);
 });
});
// Dimensions d'un PNG (en-tête IHDR)
function dimsPng(buf){assert.equal(buf.toString('latin1',1,4),'PNG');return [buf.readUInt32BE(16),buf.readUInt32BE(20)];}
// Répond à une question au clavier : le bouton voulu reçoit le focus, Entrée
async function repondreClavier(page,reponses){
 for(let i=0;i<12;i++){
  // Après chaque réponse, le focus est sur le titre de la question suivante (la première : vérifié après « Commencer »)
  if(i)assert.equal(await page.evaluate(()=>document.activeElement&&document.activeElement.id),'cj-qtext','focus sur la question '+(i+1));
  assert.match(await page.textContent('#cj-qnum'),new RegExp('Situation '+(i+1)+' / 12'));
  const texte=await page.evaluate(i=>window.PA_CARTE.QUESTIONS[i].r[0].t,i); // on vérifie que les 4 réponses sont là, mélangées ou non
  assert.equal(await page.locator('#cj-qopts .qopt').count(),4);
  const voulu=await page.evaluate(([i,k])=>window.PA_CARTE.QUESTIONS[i].r[k].t,[i,reponses[i]]);
  await page.locator('#cj-qopts .qopt',{hasText:voulu}).first().focus();
  await page.keyboard.press('Enter');
  void texte;
 }
}
(async()=>{
 moteur();
 await new Promise(r=>serveur.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+serveur.address().port;
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const erreurs=[],dossier=fs.mkdtempSync(path.join(os.tmpdir(),'padel-carte-'));
 try{
  const ctx=await browser.newContext({serviceWorkers:'block',viewport:{width:390,height:844},isMobile:true,hasTouch:true,acceptDownloads:true});
  await ctx.route(/^https:/,r=>r.fulfill({status:204,body:''})); // aucun service externe
  const page=await ctx.newPage();
  page.on('pageerror',e=>erreurs.push(e.message));
  page.on('console',m=>{if(m.type()==='error')erreurs.push(m.text());});
  page.on('response',r=>{if(r.status()>=400&&r.url().startsWith(base))erreurs.push(r.status()+' '+r.url());});
  // Repères existants : palier 2 au test de niveau, niveau 7 dans Mon académie (le palier l'emporte) ; jamais modifiés
  const quizAvant=JSON.stringify({date:'2026-10-01T10:00:00.000Z',version:2,palier:2,niveau:2,score:12,reponses:[]});
  const acadAvant=JSON.stringify({niveau:7,historique:[{niveau:7,date:'2026-10-01'}]});
  await page.goto(base+'/carte.html');
  await page.evaluate(([q,a])=>{localStorage.setItem('pa-quiz-dernier',q);localStorage.setItem('pa-academie',a);},[quizAvant,acadAvant]);
  await page.goto(base+'/carte.html');
  assert.equal(await page.locator('#cj-intro').isVisible(),true);
  assert.equal(await page.locator('#cj-apercu').isVisible(),false);
  assert.equal(await page.evaluate(()=>document.activeElement===document.body),true,'rien ne reçoit le focus au chargement');
  ok('page : intro visible, aperçu caché, aucun focus déplacé au chargement');
  // Commencer au clavier
  await page.focus('#cj-commencer');await page.keyboard.press('Enter');
  assert.equal(await page.locator('#cj-quiz').isVisible(),true);
  assert.match(await page.textContent('#cj-base-txt'),/Tes notes partent de ton niveau\s: P100 \(test de niveau\)/);
  assert.equal(await page.getAttribute('#cj-qnum','aria-live'),'polite');
  assert.equal(await page.getAttribute('#cj-qopts','role'),'group');
  assert.equal(await page.getAttribute('#cj-qopts','aria-labelledby'),'cj-qtext');
  assert.equal(await page.evaluate(()=>document.activeElement.id),'cj-qtext');
  ok('questionnaire : repère P100 proposé (palier avant niveau), compteur aria-live, groupe nommé, focus sur la question');
  // Parcours de Hugo (palier 2, droite) au clavier
  await repondreClavier(page,[1,3,3,1,0,3,2,3,3,1,2,3]);
  assert.equal(await page.locator('#cj-notes').isVisible(),true);
  assert.equal(await page.evaluate(()=>document.activeElement.tagName+'|'+document.activeElement.closest('.cj-etape').id),'H2|cj-notes');
  assert.match(await page.textContent('#cj-suggestion'),/Poste suggéré.*Droite/);
  assert.equal(await page.inputValue('#cj-n-VOL'),'64');assert.equal(await page.inputValue('#cj-n-AER'),'59');
  assert.equal(await page.textContent('#cj-globale'),'63');assert.equal(await page.textContent('#cj-rang-tag'),'Argent');
  assert.equal(await page.getAttribute('#cj-postes button:nth-child(1)','aria-pressed'),'true','suggestion droite pressée');
  assert.equal(await page.locator('#cj-apercu').isVisible(),true);
  assert.equal(await page.locator('#cj-apercu-html .carte-joueur.rang-argent').count(),1);
  ok('notes : Hugo → VOL 64, AER 59, globale 63 Argent, droite suggérée et pressée, aperçu HTML en rang argent');
  // Poste : gauche change la globale
  await page.click('#cj-postes button:nth-child(2)');
  assert.equal(await page.getAttribute('#cj-postes button:nth-child(2)','aria-pressed'),'true');
  const gGauche=Number(await page.textContent('#cj-globale'));assert.ok(gGauche<63,'globale plus basse à gauche (aérien faible)');
  await page.click('#cj-postes button:nth-child(1)');
  assert.equal(await page.textContent('#cj-globale'),'63');
  ok('poste : choix au bouton (aria-pressed), globale recalculée');
  // Ajustement borné à ±5
  assert.equal(await page.getAttribute('#cj-n-VOL','min'),'59');assert.equal(await page.getAttribute('#cj-n-VOL','max'),'69');
  await page.evaluate(()=>{const i=document.getElementById('cj-n-VOL');i.value='99';i.dispatchEvent(new Event('input',{bubbles:true}));i.dispatchEvent(new Event('change',{bubbles:true}));});
  assert.equal(await page.inputValue('#cj-n-VOL'),'69');
  assert.equal(await page.evaluate(()=>document.querySelector('#cj-n-VOL+output').textContent),'69');
  assert.match(await page.getAttribute('#cj-n-VOL','aria-valuetext'),/69 sur 99, calcul 64/);
  await page.focus('#cj-n-AER');for(let k=0;k<9;k++)await page.keyboard.press('ArrowLeft');
  assert.equal(await page.inputValue('#cj-n-AER'),'54');
  const gAj=Number(await page.textContent('#cj-globale'));
  assert.equal(gAj,await page.evaluate(()=>window.PA_CARTE.calcul.globale({VOL:69,AER:54,DEF:63,LOB:64,SER:63,TAC:63},'droite')),'globale recalculée avec les notes ajustées');
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('pa-carte')).ajustements.VOL),5);
  ok('ajustements : bornés à +5 / −5 (curseur et clavier), globale recalculée, ajustement gardé dans pa-carte');
  // Photo : fichier généré par un canvas, recadré, gardé
  await page.click('#cj-vers-photo');
  assert.equal(await page.evaluate(()=>document.activeElement.closest('.cj-etape').id),'cj-photo');
  const png=Buffer.from((await page.evaluate(()=>{const c=document.createElement('canvas');c.width=800;c.height=1000;const x=c.getContext('2d');x.fillStyle='#2a6';x.fillRect(0,0,800,1000);x.fillStyle='#fc3';x.beginPath();x.arc(400,300,180,0,7);x.fill();return c.toDataURL('image/png');})).split(',')[1],'base64');
  await page.setInputFiles('#cj-fichier',{name:'moi.png',mimeType:'image/png',buffer:png});
  await page.waitForSelector('#cj-recadrage:not([hidden])');
  await page.waitForFunction(()=>/^data:image\/jpeg/.test(localStorage.getItem('pa-carte-photo')||''));
  const taille=await page.evaluate(()=>localStorage.getItem('pa-carte-photo').length);
  assert.ok(taille>1000&&taille<1000000,'photo gardée en dataURL JPEG, moins de 1 Mo ('+taille+')');
  const dims=await page.evaluate(()=>new Promise(res=>{const i=new Image();i.onload=()=>res([i.naturalWidth,i.naturalHeight]);i.src=localStorage.getItem('pa-carte-photo');}));
  assert.deepEqual(dims,[600,480]);
  // Déplacement au clavier et zoom : la photo est régénérée
  const avant=await page.evaluate(()=>localStorage.getItem('pa-carte-photo'));
  await page.focus('#cj-cadre');await page.keyboard.press('ArrowDown');await page.keyboard.press('ArrowDown');
  await page.evaluate(()=>{const z=document.getElementById('cj-zoom');z.value='1.5';z.dispatchEvent(new Event('input',{bubbles:true}));});
  assert.equal(await page.textContent('#cj-zoom-val'),'×1,5');
  await page.waitForFunction(a=>localStorage.getItem('pa-carte-photo')!==a,avant);
  assert.equal(await page.locator('#cj-apercu-html .cj-photo img').count(),1);
  assert.equal(await page.locator('#cj-retirer-photo').isVisible(),true);
  ok('photo : fichier accepté, recadrage 600 × 480 en JPEG < 1 Mo, déplacement au clavier et zoom régénèrent la photo, aperçu avec image');
  // Pseudo : invalide refusé, puis valide
  await page.click('#cj-vers-pseudo');
  assert.equal(await page.evaluate(()=>document.activeElement.closest('.cj-etape').id),'cj-pseudo-etape');
  for(const mauvais of ['a','hugo@gmail.com','06 12 34 56 78 9']){
   await page.fill('#cj-pseudo',mauvais);await page.keyboard.press('Enter');
   assert.equal(await page.getAttribute('#cj-pseudo','aria-invalid'),'true',mauvais);
   assert.ok((await page.textContent('#cj-pseudo-err')).length>5);
   assert.equal(await page.locator('#cj-final').isVisible(),false);
  }
  await page.fill('#cj-pseudo','Hugo D.');await page.keyboard.press('Enter');
  assert.equal(await page.locator('#cj-final').isVisible(),true);
  assert.equal(await page.evaluate(()=>document.activeElement.closest('.cj-etape').id),'cj-final');
  assert.equal(await page.textContent('#cj-apercu-html .cj-nom'),'HUGO D.');
  assert.match(await page.getAttribute('#cj-canvas','aria-label'),/^Carte de joueur de Hugo D\.\s: \d+, Argent, poste droite\. Volée 69, Jeu aérien 54/);
  assert.equal(await page.getAttribute('#cj-canvas','role'),'img');
  // Le canvas rendu porte bien la photo : le disque jaune du fichier de test est au centre de la zone photo
  await page.waitForFunction(()=>document.getElementById('cj-canvas').width===1200);
  const px=await page.evaluate(()=>[...document.getElementById('cj-canvas').getContext('2d').getImageData(600,300,1,1).data]);
  assert.ok(px[0]>180&&px[1]>120&&px[2]<140,'pixel de la photo sur le canvas : '+px.join(','));
  ok('pseudo : « a », e-mail et numéro refusés (aria-invalid + message) ; « Hugo D. » accepté, carte décrite sur le canvas, photo dessinée');
  // Téléchargement : PNG carte puis story
  let [dl]=await Promise.all([page.waitForEvent('download'),page.click('#cj-telecharger')]);
  assert.equal(dl.suggestedFilename(),'ma-carte-padel.png');
  let f=path.join(dossier,'carte.png');await dl.saveAs(f);
  let buf=fs.readFileSync(f);assert.ok(buf.length>20000,'PNG carte non vide');assert.deepEqual(dimsPng(buf),[1200,1800]);
  await page.click('.cj-formats label:has(input[value="story"])'); // le bouton radio est masqué, c'est son libellé qui se clique
  assert.equal(await page.isChecked('input[name="cj-format"][value="story"]'),true);
  [dl]=await Promise.all([page.waitForEvent('download'),page.click('#cj-telecharger')]);
  f=path.join(dossier,'story.png');await dl.saveAs(f);
  buf=fs.readFileSync(f);assert.ok(buf.length>20000,'PNG story non vide');assert.deepEqual(dimsPng(buf),[1080,1920]);
  assert.match(await page.textContent('#cj-final-msg'),/Image prête/);
  assert.equal(await page.isEnabled('#cj-telecharger'),true);
  ok('téléchargement : ma-carte-padel.png en 1200 × 1800 (carte) et 1080 × 1920 (story), message de confirmation');
  // Partager sans navigator.share : repli sur le téléchargement
  await page.evaluate(()=>{Object.defineProperty(navigator,'canShare',{value:undefined,configurable:true});Object.defineProperty(navigator,'share',{value:undefined,configurable:true});});
  [dl]=await Promise.all([page.waitForEvent('download'),page.click('#cj-partager')]);
  assert.equal(dl.suggestedFilename(),'ma-carte-padel.png');
  ok('partager sans navigator.share : l\'image est téléchargée à la place');
  // Rien n'a été écrit dans les repères
  assert.equal(await page.evaluate(()=>localStorage.getItem('pa-quiz-dernier')),quizAvant);
  assert.equal(await page.evaluate(()=>localStorage.getItem('pa-academie')),acadAvant);
  ok('pa-quiz-dernier et pa-academie intacts après tout le parcours');
  // Rechargement : carte retrouvée, photo conservée
  await page.goto(base+'/carte.html');
  assert.equal(await page.locator('#cj-final').isVisible(),true);
  assert.match(await page.textContent('#cj-retrouvee'),/gardée sur cet appareil/);
  assert.equal(await page.inputValue('#cj-pseudo'),'Hugo D.');
  assert.equal(await page.locator('#cj-apercu-html .cj-photo img').count(),1);
  assert.equal(await page.textContent('#cj-apercu-html .cj-globale'),String(gAj));
  assert.equal(await page.evaluate(()=>document.activeElement===document.body),true);
  ok('rechargement : carte, pseudo, ajustements et photo retrouvés, sans déplacer le focus');
  // Retirer la photo : initiales
  await page.click('#cj-modifier-photo');await page.click('#cj-retirer-photo');
  assert.equal(await page.evaluate(()=>localStorage.getItem('pa-carte-photo')),null);
  assert.equal(await page.locator('#cj-apercu-html .cj-photo img').count(),0);
  assert.equal(await page.textContent('#cj-apercu-html .cj-initiales'),'HD');
  ok('« Retirer la photo » : pa-carte-photo effacée, initiales HD sur la carte');
  // Repère ignoré : notes sans repère (plage 16 à 90)
  await page.click('#cj-retour-notes');await page.click('#cj-refaire-1');
  await page.check('#cj-sans-base');
  await repondreClavier(page,[1,3,3,1,0,3,2,3,3,1,2,3]);
  const sansBase=Number(await page.inputValue('#cj-n-VOL'));assert.ok(sansBase>69,'sans repère, la volée de Hugo dépasse la plage P100 ('+sansBase+')');
  ok('« Ne pas en tenir compte » : notes calculées sans repère');
  // Débordement : 390 puis 320 px, à chaque étape
  for(const w of [390,320]){
   await page.setViewportSize({width:w,height:844});
   for(const id of ['cj-modifier-notes','cj-modifier-photo','cj-modifier-pseudo']){
    await page.goto(base+'/carte.html');await page.click('#'+id);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),w,id+' à '+w);
   }
   await page.goto(base+'/carte.html');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),w,'carte à '+w);
  }
  ok('aucun débordement à 390 et 320 px (notes, photo, nom, carte)');
  assert.deepEqual(erreurs,[]);
  ok('aucune erreur console ni ressource manquante');
  console.log('TOTAL '+nb+' contrôles réussis.');
 }finally{await browser.close();serveur.close();fs.rmSync(dossier,{recursive:true,force:true});}
})().catch(e=>{console.error(e);serveur.close();process.exitCode=1;});
