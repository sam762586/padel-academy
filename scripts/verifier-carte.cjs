/* Vérification de « Ma carte de joueur » (carte.html, assets/js/carte.js, carte-donnees.js, carte-rendu.js, assets/carte.css) :
   1) moteur (sans navigateur) : les exemples de carte-donnees.js (encore utilisés pour convertir les cartes version 1) ;
   2) navigateur (Edge, 390 px, toute adresse https bloquée) : intro sans questionnaire ; 6 curseurs 1 à 99 + champs numériques
      (bornés au clavier, à la souris et à la saisie), globale recalculée, poste, rang suggéré puis choisi librement (Élite avec une
      globale de 40 → rendu en rang elite, choix gardé quand la globale change) ; pa-carte au format 2 ; pseudo invalide refusé,
      photo recadrée et gardée après rechargement, téléchargement WebP (JPEG si le navigateur ne sait pas l'encoder) aux bonnes
      dimensions (carte et story) et ≤ 500 Ko, aperçu canvas décrit (aria-label), carte retrouvée au rechargement, « Retirer la photo » ;
      choix du modèle (4 boutons aria-pressed, miniatures, aperçu et export changés, modèle gardé, repli sans MODELES) ;
      « Modifier mes notes » (tout gardé) ; « Faire une nouvelle carte » (notes à 60, poste et rang par défaut, sans photo ni nom,
      ancienne carte gardée jusqu'à la validation des notes) ; migration d'une carte version 1 ; aucune lecture de pa-quiz-dernier
      ni de pa-academie ; événement GoatCounter « carte-generee » à chaque téléchargement ou partage (aucun si skipgc) ; total public
      affiché ou rien ; aucun débordement à 390 et 320 px, 0 erreur console.
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
// Pose une note par son champ numérique (saisie puis sortie du champ) : la valeur affichée est bornée de 1 à 99
async function poserNote(page,cle,valeur){await page.fill('#cj-v-'+cle,String(valeur));await page.press('#cj-v-'+cle,'Tab');}
async function poserNotes(page,notes){for(const [k,v] of Object.entries(notes))await poserNote(page,k,v);}
const lireNotes=page=>page.evaluate(()=>Object.fromEntries(window.PA_CARTE.CLES.map(k=>[k,Number(document.getElementById('cj-n-'+k).value)])));
const presse=(page,groupe)=>page.$$eval(groupe+' button',bs=>bs.filter(b=>b.getAttribute('aria-pressed')==='true').map(b=>b.textContent));
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
  // Lectures du stockage faites par les scripts de la carte (carte.js, carte-*.js) : relevées dans la console (type debug)
  await ctx.addInitScript(()=>{const g=Storage.prototype.getItem;Storage.prototype.getItem=function(k){try{if(/\/assets\/js\/carte(-[a-z]+)?\.js/.test(new Error().stack||''))console.debug('PA-LU '+k);}catch(e){}return g.call(this,k);};});
  const lus=new Set();
  page.on('console',m=>{const t=m.text();if(m.type()==='debug'&&t.startsWith('PA-LU '))lus.add(t.slice(6));});
  // Données d'autres pages : test de niveau et Mon académie ; la carte ne les lit pas et ne les écrit jamais
  const quizAvant=JSON.stringify({date:'2026-10-01T10:00:00.000Z',version:2,palier:2,niveau:2,score:12,reponses:[]});
  const acadAvant=JSON.stringify({niveau:7,historique:[{niveau:7,date:'2026-10-01'}]});
  await page.goto(base+'/carte.html');
  await page.evaluate(([q,a])=>{localStorage.setItem('pa-quiz-dernier',q);localStorage.setItem('pa-academie',a);},[quizAvant,acadAvant]);
  await page.goto(base+'/carte.html');
  assert.equal(await page.locator('#cj-intro').isVisible(),true);
  assert.equal(await page.locator('#cj-apercu').isVisible(),false);
  assert.equal(await page.evaluate(()=>document.activeElement===document.body),true,'rien ne reçoit le focus au chargement');
  assert.equal(await page.locator('#cj-quiz, #cj-qopts, #cj-sans-base, #cj-base, [id^="cj-refaire"]').count(),0,'plus de questionnaire ni de repère');
  assert.deepEqual(await page.$$eval('#cj-pas li',l=>l.map(x=>x.dataset.pas)),['notes','photo','pseudo','final']);
  assert.match(await page.textContent('#cj-intro'),/Choisis tes notes, ton rang, ta photo et ton modèle/);
  assert.ok(!/situations|questionnaire/i.test(await page.textContent('#cj-intro')));
  const desc=await page.getAttribute('meta[name="description"]','content');
  assert.ok(desc.length<=160&&/1 à 99/.test(desc)&&/Bronze à Élite/.test(desc)&&!/situations/.test(desc),'meta description : '+desc);
  ok('page : intro (notes, rang, photo, modèle), aucun questionnaire, fil en 4 étapes, meta description à jour, aucun focus déplacé');
  // Commencer au clavier : 6 curseurs à 60, poste et rang suggérés
  await page.focus('#cj-commencer');await page.keyboard.press('Enter');
  assert.equal(await page.locator('#cj-notes').isVisible(),true);
  assert.equal(await page.evaluate(()=>document.activeElement.tagName+'|'+document.activeElement.closest('.cj-etape').id),'H2|cj-notes');
  assert.equal(await page.getAttribute('#cj-pas li[data-pas="notes"]','aria-current'),'step');
  const CLES=['VOL','AER','DEF','LOB','SER','TAC'];
  for(const k of CLES){
   const r=await page.$eval('#cj-n-'+k,i=>[i.type,i.min,i.max,i.step,i.value,i.labels[0]&&i.labels[0].textContent]);
   assert.deepEqual(r.slice(0,5),['range','1','99','1','60'],k);
   assert.ok(r[5].length>10,'curseur '+k+' étiqueté avec la description');
   assert.deepEqual(await page.$eval('#cj-v-'+k,i=>[i.type,i.min,i.max,i.value]),['number','1','99','60']);
   assert.match(await page.getAttribute('#cj-v-'+k,'aria-label'),/note de 1 à 99/);
  }
  assert.deepEqual(await page.$$eval('#cj-notes-liste .cj-note-libelle b',b=>b.map(x=>x.textContent)),await page.evaluate(()=>window.PA_CARTE.ATTRIBUTS.map(a=>a.libelle)));
  assert.equal(await page.textContent('#cj-globale'),'60');assert.equal(await page.textContent('#cj-rang-tag'),'Argent');
  assert.deepEqual(await presse(page,'#cj-postes'),['Polyvalent']);
  assert.deepEqual(await presse(page,'#cj-rangs-choix'),['Argent']);
  assert.deepEqual(await page.$$eval('#cj-rangs-choix button',b=>b.map(x=>x.textContent)),['Bronze','Argent','Or','Élite']);
  assert.equal(await page.getAttribute('#cj-rangs-choix','role'),'group');
  assert.match(await page.textContent('#cj-rang-suggere'),/^Suggéré : Argent/);
  assert.equal(await page.locator('#cj-apercu').isVisible(),true);
  assert.equal(await page.locator('#cj-apercu-canvas.rang-argent').count(),1);
  assert.equal(await page.evaluate(()=>localStorage.getItem('pa-carte')),null,'rien de gardé avant de valider les notes');
  ok('notes : 6 curseurs 1 à 99 (pas 1) à 60 + champs numériques étiquetés, globale 60, Polyvalent et Argent suggérés et pressés, aperçu');
  // Curseurs au clavier : bornés à 1 et 99
  await page.focus('#cj-n-VOL');await page.keyboard.press('End');await page.keyboard.press('ArrowRight');
  assert.equal(await page.inputValue('#cj-n-VOL'),'99');assert.equal(await page.inputValue('#cj-v-VOL'),'99');
  assert.equal(await page.getAttribute('#cj-n-VOL','aria-valuetext'),'99 sur 99');
  await page.keyboard.press('Home');await page.keyboard.press('ArrowLeft');
  assert.equal(await page.inputValue('#cj-n-VOL'),'1');
  for(let k=0;k<4;k++)await page.keyboard.press('ArrowRight');
  assert.equal(await page.inputValue('#cj-v-VOL'),'5');
  ok('curseur au clavier : Fin → 99, flèche au-delà sans effet, Début → 1, flèches pas à pas, champ numérique synchronisé');
  // Curseur à la souris : bords gauche et droit
  await page.locator('#cj-n-AER').scrollIntoViewIfNeeded();const boite=await page.locator('#cj-n-AER').boundingBox();
  await page.mouse.click(boite.x+boite.width-1,boite.y+boite.height/2);
  assert.equal(await page.inputValue('#cj-n-AER'),'99');assert.equal(await page.inputValue('#cj-v-AER'),'99');
  await page.mouse.click(boite.x+1,boite.y+boite.height/2);
  assert.equal(await page.inputValue('#cj-n-AER'),'1');
  await page.evaluate(()=>{const i=document.getElementById('cj-n-AER');i.value='150';i.dispatchEvent(new Event('input',{bubbles:true}));});
  assert.equal(await page.inputValue('#cj-v-AER'),'99');
  ok('curseur à la souris : bord droit 99, bord gauche 1, valeur forcée à 150 ramenée à 99');
  // Champ numérique : 150 → 99, 0 → 1, vide → note précédente, flèche haut à 99 sans effet
  await poserNote(page,'DEF',150);assert.equal(await page.inputValue('#cj-v-DEF'),'99');assert.equal(await page.inputValue('#cj-n-DEF'),'99');
  await poserNote(page,'DEF',0);assert.equal(await page.inputValue('#cj-v-DEF'),'1');
  await poserNote(page,'DEF',72);await poserNote(page,'DEF','');assert.equal(await page.inputValue('#cj-v-DEF'),'72','champ vidé : note précédente');
  await poserNote(page,'DEF',99);await page.focus('#cj-v-DEF');await page.keyboard.press('ArrowUp');
  assert.equal(await page.inputValue('#cj-n-DEF'),'99');
  ok('champ numérique : 150 → 99, 0 → 1, vide → note précédente, flèche haut bornée à 99');
  // Globale recalculée en direct ; rang suggéré tant qu'aucun n'est choisi
  await poserNotes(page,{VOL:40,AER:40,DEF:40,LOB:40,SER:40,TAC:40});
  assert.equal(await page.textContent('#cj-globale'),'40');
  assert.equal(await page.textContent('#cj-rang-tag'),'Bronze');
  assert.deepEqual(await presse(page,'#cj-rangs-choix'),['Bronze'],'rang suggéré suivi tant que rien n\'est choisi');
  await poserNotes(page,{VOL:45,AER:80});
  const n1={VOL:45,AER:80,DEF:40,LOB:40,SER:40,TAC:40};
  assert.equal(await page.evaluate(n=>window.PA_CARTE.calcul.posteSuggere(n,null),n1),'gauche');
  assert.deepEqual(await presse(page,'#cj-postes'),['Gauche'],"poste suggéré d'après les notes (aérien fort)");
  assert.match(await page.textContent('#cj-suggestion'),/Poste suggéré d'après tes notes\s: Gauche/);
  assert.equal(Number(await page.textContent('#cj-globale')),await page.evaluate(n=>window.PA_CARTE.calcul.globale(n,'gauche'),n1));
  ok('globale recalculée à chaque note (40 partout → 40 Bronze suggéré ; aérien à 80 → Gauche suggéré, globale de PA_CARTE)');
  // Poste
  for(const [i,cle,lib] of [[3,'polyvalent','Polyvalent'],[1,'droite','Droite']]){
   await page.click('#cj-postes button:nth-child('+i+')');
   assert.deepEqual(await presse(page,'#cj-postes'),[lib]);
   assert.equal(Number(await page.textContent('#cj-globale')),await page.evaluate(([n,c])=>window.PA_CARTE.calcul.globale(n,c),[n1,cle]),'globale '+cle);
  }
  assert.ok(!/garde la suggestion/.test(await page.textContent('#cj-suggestion')));
  ok('poste : Polyvalent puis Droite choisis (aria-pressed), globale recalculée avec les poids du poste');
  // Rang choisi librement : Élite avec une globale de 40, gardé quand la globale change
  await poserNotes(page,{VOL:40,AER:40});
  assert.equal(await page.textContent('#cj-globale'),'40');
  await page.focus('#cj-rangs-choix button:nth-child(4)');await page.keyboard.press('Enter');
  assert.deepEqual(await presse(page,'#cj-rangs-choix'),['Élite']);
  assert.equal(await page.textContent('#cj-rang-tag'),'Élite');
  assert.match(await page.textContent('#cj-rang-suggere'),/^Suggéré : Bronze\. Tu as choisi Élite\./);
  await page.waitForFunction(()=>document.getElementById('cj-apercu-canvas').classList.contains('rang-elite'));
  assert.match(await page.getAttribute('#cj-apercu-canvas','aria-label'),/^Carte de joueur\s: 40, Élite, poste droite\./);
  // Le rang passé au dessin (CARTE_RENDU.animer, même dessin que l'export) est bien le rang choisi
  await page.evaluate(()=>{const R=window.CARTE_RENDU,f=R.animer;window.__rangs=[];R.animer=function(c,d){window.__rangs.push(d.rang);return f.apply(this,arguments);};});
  await poserNote(page,'VOL',95);
  assert.deepEqual(await presse(page,'#cj-rangs-choix'),['Élite'],'choix gardé quand la globale change');
  await page.waitForFunction(()=>window.__rangs.length>0);
  assert.ok((await page.evaluate(()=>window.__rangs)).every(r=>r==='elite'),'données du rendu : rang elite');
  await poserNote(page,'VOL',40);
  ok('rang : Élite choisi avec une globale de 40 (suggéré Bronze) → aperçu en rang elite, décrit « 40, Élite », choix gardé si la globale change');
  // Notes d'Hugo (droite), rang Argent choisi, puis on valide : carte gardée au format 2
  await poserNotes(page,{VOL:64,AER:59,DEF:63,LOB:64,SER:63,TAC:63});
  assert.equal(await page.textContent('#cj-globale'),'63');
  await page.click('#cj-rangs-choix button:nth-child(2)');
  await page.click('#cj-vers-photo');
  assert.equal(await page.evaluate(()=>document.activeElement.closest('.cj-etape').id),'cj-photo');
  const v2=await page.evaluate(()=>JSON.parse(localStorage.getItem('pa-carte')));
  assert.equal(v2.version,2);assert.deepEqual(v2.notes,{VOL:64,AER:59,DEF:63,LOB:64,SER:63,TAC:63});
  assert.equal(v2.poste,'droite');assert.equal(v2.rang,'argent');assert.equal(v2.rangChoisi,true);assert.equal(v2.pseudo,'');assert.equal(v2.modele,'neon');assert.equal(v2.photo,false);
  assert.ok(!('reponses' in v2)&&!('base' in v2)&&!('sansBase' in v2));
  ok('pa-carte au format 2 à la sortie de l\'étape notes : notes, poste droite, rang argent choisi, sans réponses ni repère');
  // Photo : fichier généré par un canvas, recadré, gardé
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
  assert.match(await page.getAttribute('#cj-apercu-canvas','aria-label'),/^Carte de joueur de Hugo D\.\s: 63, Argent, poste droite\. Volée 64, Jeu aérien 59/);
  assert.equal((await page.textContent('#cj-modifier-notes')).trim(),'Modifier mes notes');
  assert.equal(await page.locator('#cj-final button',{hasText:'Refaire'}).count(),0,'plus de « Refaire mes réponses »');
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
  // Compteur public activé (option GoatCounter cochée par Samuel le 30/10/2026) : lu en lecture seule, sur la seule adresse de l'événement
  assert.ok(demandesCompteur.every(u=>/\/counter\/carte-generee\.json$/.test(u)),'total public : seule l\'adresse du compteur de cartes est lue');
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
  assert.match(await page.getAttribute('#cj-apercu-canvas','aria-label'),/: 63, Argent.*Avec ta photo\./);
  assert.equal(await page.evaluate(()=>document.activeElement===document.body),true);
  ok('rechargement : carte, pseudo, notes, rang et photo retrouvés, sans déplacer le focus');
  // Choix du modèle : un bouton par modèle de CARTE_RENDU.MODELES, miniature dessinée, aperçu et export changés, choix gardé
  const MODELES=await page.evaluate(()=>window.CARTE_RENDU.MODELES);
  assert.ok(Array.isArray(MODELES)&&MODELES.length===4,'4 modèles dans CARTE_RENDU.MODELES');
  assert.equal(await page.locator('#cj-modeles-bloc').isVisible(),true);
  assert.equal(await page.getAttribute('#cj-modeles','role'),'group');assert.equal(await page.getAttribute('#cj-modeles','aria-label'),'Modèle de carte');
  assert.equal(await page.locator('#cj-modeles button.cj-modele[type="button"]').count(),4);
  assert.deepEqual(await page.$$eval('#cj-modeles .cj-modele',bs=>bs.map(b=>b.getAttribute('aria-pressed'))),['true','false','false','false'],'Néon par défaut');
  assert.deepEqual(await page.$$eval('#cj-modeles .cj-modele .cj-modele-nom',s=>s.map(x=>x.textContent)),MODELES.map(m=>m.nom));
  await page.waitForFunction(()=>[...document.querySelectorAll('#cj-modeles .cj-modele canvas')].every(c=>{const d=c.getContext('2d').getImageData(c.width/2,c.height/2,1,1).data;return d[3]>0;}),null,{timeout:15000});
  const notesAvant=await page.evaluate(()=>JSON.parse(localStorage.getItem('pa-carte')).notes);
  const apercuAvant=await page.evaluate(()=>document.getElementById('cj-apercu-canvas').toDataURL());
  const exportAvant=await page.evaluate(()=>document.getElementById('cj-canvas').toDataURL('image/jpeg',.5));
  const deuxieme=MODELES[1];
  await page.click('#cj-modeles .cj-modele:nth-child(2)');
  assert.deepEqual(await page.$$eval('#cj-modeles .cj-modele',bs=>bs.map(b=>b.getAttribute('aria-pressed'))),['false','true','false','false']);
  await page.waitForFunction(a=>document.getElementById('cj-apercu-canvas').toDataURL()!==a,apercuAvant,{timeout:15000});
  await page.waitForFunction(a=>document.getElementById('cj-canvas').toDataURL('image/jpeg',.5)!==a,exportAvant,{timeout:15000});
  assert.match(await page.getAttribute('#cj-apercu-canvas','aria-label'),new RegExp(' Modèle '+deuxieme.nom+'\\.$'));
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('pa-carte')).modele),deuxieme.cle);
  assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('pa-carte')).notes),notesAvant,'notes inchangées');
  assert.equal(await page.locator('#cj-final').isVisible(),true,'toujours à l\'étape carte');
  [dl]=await Promise.all([page.waitForEvent('download'),page.click('#cj-telecharger')]);
  assert.equal(dl.suggestedFilename(),'ma-carte-padel.'+EXT_ATTENDUE);
  await page.goto(base+'/carte.html');
  await page.waitForSelector('#cj-modeles .cj-modele');
  assert.equal(await page.getAttribute('#cj-modeles .cj-modele:nth-child(2)','aria-pressed'),'true','modèle retrouvé au rechargement');
  assert.match(await page.getAttribute('#cj-apercu-canvas','aria-label'),new RegExp(' Modèle '+deuxieme.nom+'\\.$'));
  await page.click('#cj-modeles .cj-modele:nth-child(1)');
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('pa-carte')).modele),'neon');
  ok('modèles : 4 boutons (groupe nommé, aria-pressed, miniatures dessinées) ; '+deuxieme.nom+' change aperçu et export, aria-label, gardé dans pa-carte et au rechargement, sans toucher aux notes');
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
  // « Modifier mes notes » : retour à l'étape notes, tout est gardé (notes, poste, rang choisi, nom), changement enregistré
  await page.click('#cj-retour-notes');
  assert.equal(await page.locator('#cj-notes').isVisible(),true);
  assert.deepEqual(await lireNotes(page),{VOL:64,AER:59,DEF:63,LOB:64,SER:63,TAC:63});
  assert.deepEqual(await presse(page,'#cj-postes'),['Droite']);assert.deepEqual(await presse(page,'#cj-rangs-choix'),['Argent']);
  await poserNote(page,'VOL',90);
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('pa-carte')).notes.VOL),90,'note modifiée gardée');
  assert.deepEqual(await presse(page,'#cj-rangs-choix'),['Argent'],'rang choisi gardé');
  await page.click('#cj-vers-photo');
  await page.setInputFiles('#cj-fichier',{name:'moi.png',mimeType:'image/png',buffer:png});
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('pa-carte')).photo===true&&!!localStorage.getItem('pa-carte-photo'));
  await page.click('#cj-vers-pseudo');
  assert.equal(await page.inputValue('#cj-pseudo'),'Hugo D.');
  await page.focus('#cj-pseudo');await page.keyboard.press('Enter');
  await page.focus('#cj-modifier-notes');await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(()=>document.activeElement.tagName+'|'+document.activeElement.closest('.cj-etape').id),'H2|cj-notes');
  assert.equal(await page.inputValue('#cj-n-VOL'),'90');
  await page.click('#cj-vers-photo');assert.equal(await page.locator('#cj-depot-apercu').isVisible(),true,'photo gardée');
  await page.click('#cj-vers-pseudo');await page.focus('#cj-pseudo');await page.keyboard.press('Enter');
  const gHugo=await page.evaluate(()=>window.PA_CARTE.calcul.globale({VOL:90,AER:59,DEF:63,LOB:64,SER:63,TAC:63},'droite'));
  assert.match(await page.getAttribute('#cj-apercu-canvas','aria-label'),new RegExp('^Carte de joueur de Hugo D\\.\\s: '+gHugo+', Argent, poste droite\\. Volée 90.*Avec ta photo\\.'));
  ok('« Modifier mes notes » (étapes photo et carte) : notes, poste, rang choisi, nom et photo gardés, note modifiée enregistrée');
  // « Faire une nouvelle carte » (pour un ami) depuis l'étape carte, au clavier
  await page.click('#cj-modeles .cj-modele:nth-child(3)');
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('pa-carte')).modele!=='neon');
  const ancienne=await page.evaluate(()=>localStorage.getItem('pa-carte'));
  const photoAncienne=await page.evaluate(()=>localStorage.getItem('pa-carte-photo'));
  assert.equal(await page.locator('#cj-nouvelle-haut').isHidden(),true,'étape carte : un seul bouton « Faire une nouvelle carte »');
  assert.equal((await page.textContent('#cj-nouvelle-2')).trim(),'Faire une nouvelle carte');
  assert.equal(await page.textContent('#cj-nouvelle-aide-2'),"Pour toi ou pour quelqu'un d'autre : tout repart de zéro.");
  assert.equal(await page.getAttribute('#cj-nouvelle-2','aria-describedby'),'cj-nouvelle-aide-2');
  await page.focus('#cj-nouvelle-2');await page.keyboard.press('Enter');
  assert.equal(await page.locator('#cj-notes').isVisible(),true);
  assert.equal(await page.evaluate(()=>document.activeElement.tagName+'|'+document.activeElement.closest('.cj-etape').id),'H2|cj-notes','focus sur le titre des notes');
  await page.waitForFunction(()=>document.getElementById('cj-annonce').textContent==='Nouvelle carte : tout repart de zéro.');
  assert.equal(await page.getAttribute('#cj-annonce','aria-live'),'polite');
  assert.deepEqual(await lireNotes(page),{VOL:60,AER:60,DEF:60,LOB:60,SER:60,TAC:60},'notes remises à 60');
  for(const k of CLES)assert.equal(await page.inputValue('#cj-v-'+k),'60');
  assert.deepEqual(await presse(page,'#cj-postes'),['Polyvalent']);
  assert.deepEqual(await presse(page,'#cj-rangs-choix'),['Argent'],'rang suggéré, plus le rang choisi');
  assert.match(await page.textContent('#cj-rang-suggere'),/garde la suggestion/);
  assert.equal(await page.locator('#cj-retrouvee').isVisible(),false);
  assert.equal(await page.locator('#cj-nouvelle-haut').isVisible(),true,'carte gardée : bouton du haut proposé pendant les notes');
  assert.equal(await page.inputValue('#cj-pseudo'),'','pseudo vide');
  assert.match(await page.getAttribute('#cj-apercu-canvas','aria-label'),/^Carte de joueur\s: 60, Argent, poste polyvalent\..*Sans photo\./);
  assert.equal(await page.evaluate(()=>localStorage.getItem('pa-carte')),ancienne,'ancienne carte gardée au clic');
  await poserNote(page,'TAC',80);
  assert.equal(await page.evaluate(()=>localStorage.getItem('pa-carte')),ancienne,'ancienne carte gardée tant que les notes ne sont pas validées');
  assert.equal(await page.evaluate(()=>localStorage.getItem('pa-carte-photo')),photoAncienne,'ancienne photo gardée au clic');
  ok('« Faire une nouvelle carte » : notes à 60, Polyvalent et rang suggéré, focus sur le titre, annonce aria-live, pseudo vide, sans photo, ancienne carte et photo gardées');
  await page.click('#cj-vers-photo');
  const nouvelle=await page.evaluate(()=>JSON.parse(localStorage.getItem('pa-carte')));
  assert.deepEqual(nouvelle.notes,{VOL:60,AER:60,DEF:60,LOB:60,SER:60,TAC:80});
  assert.equal(nouvelle.version,2);assert.equal(nouvelle.pseudo,'');assert.equal(nouvelle.modele,'neon');assert.equal(nouvelle.photo,false);
  assert.equal(nouvelle.poste,'polyvalent');assert.equal(nouvelle.posteChoisi,false);assert.equal(nouvelle.rangChoisi,false);
  assert.equal(nouvelle.rang,await page.evaluate(n=>window.PA_CARTE.calcul.rang(window.PA_CARTE.calcul.globale(n,'polyvalent')),nouvelle.notes));
  assert.equal(await page.evaluate(()=>localStorage.getItem('pa-carte-photo')),photoAncienne,'photo jamais effacée par la nouvelle carte');
  assert.equal(await page.locator('#cj-depot-apercu').isVisible(),false);
  ok('nouvelle carte : pa-carte remplacée seulement en validant les notes (format 2, rang non choisi, nom et modèle remis à zéro, pas de photo)');
  // Rechargement en cours de route : la nouvelle carte (sans nom) est reprise à l'étape nom, sans l'ancienne photo
  await page.goto(base+'/carte.html');
  assert.equal(await page.locator('#cj-pseudo-etape').isVisible(),true);
  assert.equal(await page.locator('#cj-nouvelle-haut').isVisible(),true);
  assert.equal(await page.inputValue('#cj-pseudo'),'');
  assert.match(await page.getAttribute('#cj-apercu-canvas','aria-label'),/Sans photo\./,'ancienne photo pas reposée');
  await page.click('#cj-retour-photo');
  assert.equal(await page.locator('#cj-depot-apercu').isVisible(),false);
  assert.equal(await page.locator('#cj-retirer-photo').isVisible(),false);
  await page.click('#cj-vers-pseudo');await page.fill('#cj-pseudo','Nina R.');await page.keyboard.press('Enter');
  assert.equal(await page.locator('#cj-final').isVisible(),true);
  assert.equal(await page.locator('#cj-nouvelle-haut').isHidden(),true);
  assert.match(await page.getAttribute('#cj-apercu-canvas','aria-label'),/^Carte de joueur de Nina R\.\s: .*Sans photo, initiales NR\./);
  await page.waitForSelector('#cj-modeles .cj-modele');
  assert.equal(await page.getAttribute('#cj-modeles .cj-modele:nth-child(1)','aria-pressed'),'true','modèle Néon par défaut');
  ok("nouvelle carte après rechargement : reprise à l'étape nom sans l'ancienne photo, « Nina R. » en Néon");
  // Migration d'une carte version 1 (ancien questionnaire) : mêmes notes, poste, nom, modèle et photo ; rang = rang calculé
  const MODELE3=MODELES[2].cle;
  const v1={version:1,date:'2026-10-20T10:00:00.000Z',reponses:[1,3,3,1,0,3,2,3,3,1,2,3],ajustements:{VOL:5,AER:-5,DEF:0,LOB:0,SER:0,TAC:0},
   poste:'droite',pseudo:'Hugo D.',sansBase:false,base:{palier:2},modele:MODELE3,photo:true};
  await page.evaluate(([c,ph])=>{localStorage.setItem('pa-carte',JSON.stringify(c));localStorage.setItem('pa-carte-photo',ph);},[v1,photoAncienne]);
  await page.goto(base+'/carte.html');
  assert.equal(await page.locator('#cj-final').isVisible(),true);
  const attenduV1={VOL:69,AER:54,DEF:63,LOB:64,SER:63,TAC:63};
  const gV1=await page.evaluate(n=>window.PA_CARTE.calcul.globale(n,'droite'),attenduV1),rV1=await page.evaluate(g=>window.PA_CARTE.calcul.rang(g),gV1);
  const migree=await page.evaluate(()=>JSON.parse(localStorage.getItem('pa-carte')));
  assert.equal(migree.version,2);assert.deepEqual(migree.notes,attenduV1);
  assert.equal(migree.poste,'droite');assert.equal(migree.rang,rV1);assert.equal(migree.rangChoisi,false);
  assert.equal(migree.pseudo,'Hugo D.');assert.equal(migree.modele,MODELE3);assert.equal(migree.photo,true);
  assert.ok(!('reponses' in migree));
  assert.match(await page.getAttribute('#cj-apercu-canvas','aria-label'),new RegExp('^Carte de joueur de Hugo D\\.\\s: '+gV1+', .*poste droite\\. Volée 69, Jeu aérien 54.*Avec ta photo\\.'));
  await page.click('#cj-modifier-notes');
  assert.deepEqual(await lireNotes(page),attenduV1);
  // Carte version 1 sans poste ni repère : poste suggéré par le calcul d'origine
  const v1b={version:1,date:'2026-10-20T10:00:00.000Z',reponses:[2,1,1,0,1,0,1,0,2,3,1,2],ajustements:{},poste:null,pseudo:'Léa',sansBase:true,base:null,modele:'neon',photo:false};
  await page.evaluate(c=>localStorage.setItem('pa-carte',JSON.stringify(c)),v1b);
  await page.goto(base+'/carte.html');
  const migreeB=await page.evaluate(()=>JSON.parse(localStorage.getItem('pa-carte')));
  assert.deepEqual(migreeB.notes,{VOL:16,AER:16,DEF:20,LOB:16,SER:28,TAC:26});assert.equal(migreeB.poste,'polyvalent');assert.equal(migreeB.rang,'bronze');assert.equal(migreeB.photo,false);
  assert.match(await page.getAttribute('#cj-apercu-canvas','aria-label'),/^Carte de joueur de Léa\s: 20, Bronze, poste polyvalent\..*Sans photo/);
  // Carte illisible : page d'accueil, et rien n'est écrasé
  const cassee=JSON.stringify({version:2,notes:{VOL:'x'}});
  await page.evaluate(c=>localStorage.setItem('pa-carte',c),cassee);
  await page.goto(base+'/carte.html');
  assert.equal(await page.locator('#cj-intro').isVisible(),true);
  assert.equal(await page.evaluate(()=>localStorage.getItem('pa-carte')),cassee,'carte illisible laissée telle quelle');
  ok('migration v1 → v2 : Hugo (69 / 54 / 63…, droite, modèle '+MODELE3+', photo) et Léa (poste suggéré, 20 Bronze) repris au format 2 ; carte illisible jamais écrasée');
  // Aucune lecture ni écriture des données d'autres pages
  assert.equal(await page.evaluate(()=>localStorage.getItem('pa-quiz-dernier')),quizAvant);
  assert.equal(await page.evaluate(()=>localStorage.getItem('pa-academie')),acadAvant);
  assert.ok(lus.has('pa-carte'),'relevé des lectures actif');
  assert.ok(!lus.has('pa-quiz-dernier')&&!lus.has('pa-academie'),'lectures de la carte : '+[...lus].join(', '));
  ok('pa-quiz-dernier et pa-academie ni lus ni écrits par la carte (lectures : '+[...lus].sort().join(', ')+')');
  // Carte de Nina remise pour la suite
  await page.evaluate(()=>localStorage.setItem('pa-carte',JSON.stringify({version:2,notes:{VOL:60,AER:60,DEF:60,LOB:60,SER:60,TAC:80},poste:'polyvalent',posteChoisi:false,rang:'argent',rangChoisi:false,pseudo:'Nina R.',modele:'neon',photo:false})));
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
