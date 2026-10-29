/* Vérification de « Ma carte de joueur » (carte.html, assets/js/carte.js, carte-donnees.js, carte-rendu.js, assets/carte.css) :
   1) moteur (sans navigateur) : les trois exemples de carte-donnees.js et les extrêmes donnent les notes attendues ;
   2) navigateur (Edge, 390 px, toute adresse https bloquée) : repère lu dans pa-quiz-dernier (jamais écrit), parcours complet
      au clavier jusqu'à la carte (focus sur la question suivante, compteur aria-live, groupe nommé), ajustement borné à ±5,
      pseudo invalide refusé, photo recadrée et gardée après rechargement, téléchargement WebP (JPEG si le navigateur ne sait pas
      l'encoder) aux bonnes dimensions (carte et story) et ≤ 500 Ko, aperçu canvas décrit (aria-label), carte retrouvée au rechargement, « Retirer la photo », aucun débordement à 390 et 320 px, 0 erreur console ;
      choix du modèle (4 boutons aria-pressed, miniatures, aperçu et export changés, modèle gardé, repli sans MODELES) ;
      événement GoatCounter « carte-generee » à chaque téléchargement ou partage (aucun si skipgc) ; total public affiché ou rien.
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
// Dimensions d'une image téléchargée (WebP ou JPEG), lues par le navigateur
async function dimsImage(page,buf,type){return page.evaluate(([b,t])=>new Promise((res,rej)=>{const i=new Image();i.onload=()=>res([i.naturalWidth,i.naturalHeight]);i.onerror=()=>rej(new Error('image illisible'));i.src='data:'+t+';base64,'+b;}),[buf.toString('base64'),type]);}
const EXT_ATTENDUE='webp',TYPE_ATTENDU='image/webp'; // Edge encode le WebP ; Safari tomberait sur ma-carte-padel.jpg
// Répond à une question au clavier : le bouton voulu reçoit le focus, Entrée
async function repondreClavier(page,reponses){
 for(let i=0;i<12;i++){
  // Après chaque réponse, le focus est sur le titre de la question suivante (la première : vérifié après « Commencer »)
  if(i)assert.equal(await page.evaluate(()=>document.activeElement&&document.activeElement.id),'cj-qtext','focus sur la question '+(i+1));
  assert.match(await page.textContent('#cj-qnum'),new RegExp('Situation '+(i+1)+'\\ssur\\s12'));
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
  // Faux GoatCounter : count.js est bloqué, window.goatcounter.count enregistre les événements envoyés
  await ctx.addInitScript(()=>{window.__gc=[];window.goatcounter={count:o=>{window.__gc.push(JSON.parse(JSON.stringify(o)));}};});
  const demandesCompteur=[];ctx.on('request',r=>{if(/goatcounter\.com\/counter\//.test(r.url()))demandesCompteur.push(r.url());});
  const gc=p=>p.evaluate(()=>window.__gc);
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
  assert.match(await page.textContent('#cj-base-txt'),/Tes notes partent de ton repère\s: P100 \(test de niveau\)/);
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
  assert.equal(await page.locator('#cj-apercu-canvas.rang-argent').count(),1);
  assert.match(await page.getAttribute('#cj-apercu-canvas','aria-label'),/: 63, Argent, poste droite\./);
  ok('notes : Hugo → VOL 64, AER 59, globale 63 Argent, droite suggérée et pressée, aperçu canvas en rang argent et décrit');
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
  assert.match(await page.getAttribute('#cj-n-VOL','aria-valuetext'),/69\ssur\s99, valeur calculée 64/);
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
  assert.match(await page.getAttribute('#cj-apercu-canvas','aria-label'),/Avec ta photo\./);
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
  assert.match(await page.getAttribute('#cj-apercu-canvas','aria-label'),/^Carte de joueur de Hugo D\.\s: \d+, Argent, poste droite\. Volée 69, Jeu aérien 54/);
  assert.equal(await page.getAttribute('#cj-apercu-canvas','role'),'img');
  assert.equal(await page.getAttribute('#cj-canvas','aria-hidden'),'true',"canvas d'export masqué aux lecteurs d'écran (doublon)");
  // Le canvas d'export porte bien la photo en duotone : le disque jaune (clair) du fichier de test, au centre de la zone photo,
  // devient la couleur du rang (argent, bleu-gris clair) alors que le fond vert (plus sombre) tire vers le bleu terrain
  await page.waitForFunction(()=>document.getElementById('cj-canvas').width===1200);
  const px=await page.evaluate(()=>{const d=document.getElementById('cj-canvas').getContext('2d').getImageData(598,298,5,5).data;let m=[0,0,0];for(let i=0;i<d.length;i+=4)if(d[i]+d[i+1]+d[i+2]>m[0]+m[1]+m[2])m=[d[i],d[i+1],d[i+2]];return m;});
  assert.ok(px[0]>100&&px[1]>130&&px[2]>150&&px[2]>px[0],'pixel de la photo (duotone argent) sur le canvas : '+px.join(','));
  ok('pseudo : « a », e-mail et numéro refusés (aria-invalid + message) ; « Hugo D. » accepté, aperçu décrit (role img), export aria-hidden, photo dessinée en duotone');
  // Téléchargement : WebP carte puis story, ≤ 500 Ko
  let [dl]=await Promise.all([page.waitForEvent('download'),page.click('#cj-telecharger')]);
  assert.equal(dl.suggestedFilename(),'ma-carte-padel.'+EXT_ATTENDUE);
  let f=path.join(dossier,'carte.'+EXT_ATTENDUE);await dl.saveAs(f);
  let buf=fs.readFileSync(f);assert.ok(buf.length>20000&&buf.length<=512000,'image carte entre 20 et 500 Ko ('+buf.length+')');assert.deepEqual(await dimsImage(page,buf,TYPE_ATTENDU),[1200,1800]);
  const evenement={path:'carte-generee',title:'Carte de joueur générée',event:true};
  assert.deepEqual(await gc(page),[evenement],'un événement GoatCounter par téléchargement, sans aucune donnée de la carte');
  await page.click('.cj-formats label:has(input[value="story"])'); // le bouton radio est masqué, c'est son libellé qui se clique
  assert.equal(await page.isChecked('input[name="cj-format"][value="story"]'),true);
  [dl]=await Promise.all([page.waitForEvent('download'),page.click('#cj-telecharger')]);
  f=path.join(dossier,'story.'+EXT_ATTENDUE);await dl.saveAs(f);
  buf=fs.readFileSync(f);assert.ok(buf.length>20000&&buf.length<=512000,'image story entre 20 et 500 Ko ('+buf.length+')');assert.deepEqual(await dimsImage(page,buf,TYPE_ATTENDU),[1080,1920]);
  assert.match(await page.textContent('#cj-final-msg'),new RegExp('Image prête\\s: ma-carte-padel\\.'+EXT_ATTENDUE));
  assert.equal(await page.isEnabled('#cj-telecharger'),true);
  ok('téléchargement : ma-carte-padel.'+EXT_ATTENDUE+' en 1200 × 1800 (carte) et 1080 × 1920 (story), ≤ 500 Ko, message de confirmation');
  // Partager sans navigator.share : repli sur le téléchargement
  await page.evaluate(()=>{Object.defineProperty(navigator,'canShare',{value:undefined,configurable:true});Object.defineProperty(navigator,'share',{value:undefined,configurable:true});});
  [dl]=await Promise.all([page.waitForEvent('download'),page.click('#cj-partager')]);
  assert.equal(dl.suggestedFilename(),'ma-carte-padel.'+EXT_ATTENDUE);
  ok('partager sans navigator.share : l\'image est téléchargée à la place');
  assert.deepEqual(await gc(page),[evenement,evenement,evenement],'carte, story et partage : trois événements');
  // Refus de la mesure (clé skipgc de count.js) : aucun événement
  await page.evaluate(()=>localStorage.setItem('skipgc','t'));
  [dl]=await Promise.all([page.waitForEvent('download'),page.click('#cj-telecharger')]);
  assert.equal((await gc(page)).length,3,'aucun événement si skipgc = t');
  await page.evaluate(()=>localStorage.removeItem('skipgc'));
  assert.deepEqual(demandesCompteur,[],'total public pas demandé tant que COMPTEUR.actif est false');
  ok('GoatCounter : événement « carte-generee » (path, title, event seulement) à chaque téléchargement ou partage, aucun si skipgc');
  // Rien n'a été écrit dans les repères
  assert.equal(await page.evaluate(()=>localStorage.getItem('pa-quiz-dernier')),quizAvant);
  assert.equal(await page.evaluate(()=>localStorage.getItem('pa-academie')),acadAvant);
  ok('pa-quiz-dernier et pa-academie intacts après tout le parcours');
  // Rechargement : carte retrouvée, photo conservée
  await page.goto(base+'/carte.html');
  assert.equal(await page.locator('#cj-final').isVisible(),true);
  assert.match(await page.textContent('#cj-retrouvee'),/gardée sur cet appareil/);
  assert.equal(await page.inputValue('#cj-pseudo'),'Hugo D.');
  assert.match(await page.getAttribute('#cj-apercu-canvas','aria-label'),new RegExp(': '+gAj+', Argent.*Avec ta photo\.'));
  assert.equal(await page.evaluate(()=>document.activeElement===document.body),true);
  ok('rechargement : carte, pseudo, ajustements et photo retrouvés, sans déplacer le focus');
  // Choix du modèle : un bouton par modèle de CARTE_RENDU.MODELES, miniature dessinée, aperçu et export changés, choix gardé
  const MODELES=await page.evaluate(()=>window.CARTE_RENDU.MODELES);
  assert.ok(Array.isArray(MODELES)&&MODELES.length===4,'4 modèles dans CARTE_RENDU.MODELES');
  assert.equal(await page.locator('#cj-modeles-bloc').isVisible(),true);
  assert.equal(await page.getAttribute('#cj-modeles','role'),'group');assert.equal(await page.getAttribute('#cj-modeles','aria-label'),'Modèle de carte');
  assert.equal(await page.locator('#cj-modeles button.cj-modele[type="button"]').count(),4);
  assert.deepEqual(await page.$$eval('#cj-modeles .cj-modele',bs=>bs.map(b=>b.getAttribute('aria-pressed'))),['true','false','false','false'],'Néon par défaut');
  assert.deepEqual(await page.$$eval('#cj-modeles .cj-modele .cj-modele-nom',s=>s.map(x=>x.textContent)),MODELES.map(m=>m.nom));
  await page.waitForFunction(()=>[...document.querySelectorAll('#cj-modeles .cj-modele canvas')].every(c=>{const d=c.getContext('2d').getImageData(c.width/2,c.height/2,1,1).data;return d[3]>0;}),null,{timeout:15000});
  const reponsesAvant=await page.evaluate(()=>JSON.parse(localStorage.getItem('pa-carte')).reponses);
  const apercuAvant=await page.evaluate(()=>document.getElementById('cj-apercu-canvas').toDataURL());
  const exportAvant=await page.evaluate(()=>document.getElementById('cj-canvas').toDataURL('image/jpeg',.5));
  const deuxieme=MODELES[1];
  await page.click('#cj-modeles .cj-modele:nth-child(2)');
  assert.deepEqual(await page.$$eval('#cj-modeles .cj-modele',bs=>bs.map(b=>b.getAttribute('aria-pressed'))),['false','true','false','false']);
  await page.waitForFunction(a=>document.getElementById('cj-apercu-canvas').toDataURL()!==a,apercuAvant,{timeout:15000});
  await page.waitForFunction(a=>document.getElementById('cj-canvas').toDataURL('image/jpeg',.5)!==a,exportAvant,{timeout:15000});
  assert.match(await page.getAttribute('#cj-apercu-canvas','aria-label'),new RegExp(' Modèle '+deuxieme.nom+'\\.$'));
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('pa-carte')).modele),deuxieme.cle);
  assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('pa-carte')).reponses),reponsesAvant,'réponses inchangées');
  assert.equal(await page.locator('#cj-final').isVisible(),true,'toujours à l\'étape carte : pas de questionnaire refait');
  [dl]=await Promise.all([page.waitForEvent('download'),page.click('#cj-telecharger')]);
  assert.equal(dl.suggestedFilename(),'ma-carte-padel.'+EXT_ATTENDUE);
  await page.goto(base+'/carte.html');
  await page.waitForSelector('#cj-modeles .cj-modele');
  assert.equal(await page.getAttribute('#cj-modeles .cj-modele:nth-child(2)','aria-pressed'),'true','modèle retrouvé au rechargement');
  assert.match(await page.getAttribute('#cj-apercu-canvas','aria-label'),new RegExp(' Modèle '+deuxieme.nom+'\\.$'));
  await page.click('#cj-modeles .cj-modele:nth-child(1)');
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('pa-carte')).modele),'neon');
  ok('modèles : 4 boutons (groupe nommé, aria-pressed, miniatures dessinées) ; '+deuxieme.nom+' change aperçu et export, aria-label, gardé dans pa-carte et au rechargement, sans refaire le questionnaire');
  // Repli : carte-rendu.js sans MODELES (ancienne version en cache) → un seul modèle, groupe masqué, rien ne casse
  {
   const p2=await ctx.newPage();p2.on('pageerror',e=>erreurs.push(e.message));
   await p2.route(/\/assets\/js\/carte-rendu\.js/,async r=>{const rep=await r.fetch();r.fulfill({response:rep,body:(await rep.text())+';delete window.CARTE_RENDU.MODELES;'});});
   await p2.goto(base+'/carte.html');
   assert.equal(await p2.locator('#cj-final').isVisible(),true);
   assert.equal(await p2.locator('#cj-modeles-bloc').isHidden(),true);
   assert.equal(await p2.locator('#cj-modeles .cj-modele').count(),0);
   assert.ok(!/Modèle/.test(await p2.getAttribute('#cj-apercu-canvas','aria-label')));
   await p2.close();
  }
  ok('repli sans CARTE_RENDU.MODELES : groupe masqué, carte affichée normalement');
  // Total public des cartes (COMPTEUR.actif forcé à true pour le test) : réponse simulée affichée, rien en cas d'échec
  for(const [reponse,attendu] of [[{status:200,body:'{"count":"1 234","count_unique":"1 234"}'},/^1\s234 cartes créées sur Apprendre Padel$/],[{status:200,body:'{"count":"1"}'},/^1 carte créée sur Apprendre Padel$/],[{status:403,body:'<!DOCTYPE html>'},/^$/],[null,/^$/]]){
   const p3=await ctx.newPage();const erreursJs=[];p3.on('pageerror',e=>erreursJs.push(e.message));
   await p3.route(/\/assets\/js\/carte\.js/,async r=>{const rep=await r.fetch();r.fulfill({response:rep,body:(await rep.text()).replace('actif:false','actif:true')});});
   let demande=false;
   await p3.route(/goatcounter\.com\/counter\/carte-generee\.json$/,r=>{demande=true;if(!reponse)return r.abort('failed');r.fulfill({status:reponse.status,contentType:reponse.status===200?'application/json':'text/html',headers:{'Access-Control-Allow-Origin':'*'},body:reponse.body});});
   await p3.goto(base+'/carte.html');
   if(reponse&&reponse.status===200)await p3.waitForFunction(()=>document.getElementById('cj-compteur').textContent!=='');
   else await p3.waitForTimeout(500);
   assert.equal(demande,true,'total demandé à GoatCounter');
   assert.match(await p3.textContent('#cj-compteur'),attendu);
   assert.deepEqual(erreursJs,[],'aucune exception');
   await p3.close();
  }
  ok('compteur : « 1 234 cartes créées sur Apprendre Padel », singulier pour 1, rien si 403 ou réseau en échec, aucune exception');
  // Retirer la photo : initiales
  await page.click('#cj-modifier-photo');await page.click('#cj-retirer-photo');
  assert.equal(await page.evaluate(()=>localStorage.getItem('pa-carte-photo')),null);
  assert.match(await page.getAttribute('#cj-apercu-canvas','aria-label'),/Sans photo, initiales HD\./);
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
