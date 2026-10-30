/* Vérification de la question du jour (accueil et Mon espace, assets/js/question-jour.js, banque
   assets/data/questions-jour.json générée par scripts/generer-question-jour.mjs) :
   1) sous Node : banque à jour, sans question inventée (toutes viennent des questions validées de Mon académie, texte
      identique), légère, liens existants, thèmes qui alternent ; jour de Paris (heure d'été, d'hiver, minuit), même
      question toute la journée et nouvelle le lendemain ; série (+1 le lendemain, remise à 1 après un jour sauté, record
      gardé, une seule réponse par jour, 60 jours gardés, données abîmées ignorées) ;
   2) dans Edge (horloge simulée, 390 et 320 px) : chargement seulement à l'approche du bloc, place réservée (rien ne
      bouge), même question pour deux heures du même jour, autre question le lendemain, réponse juste puis fausse,
      corrigé (explication, « En savoir plus », « Reviens demain »), une seule réponse par jour (même après
      rechargement), série et record, jour sauté, clavier et focus, cibles de 44 px, Mon espace, banque indisponible
      (message court, aucune erreur), pas de débordement, console sans erreur.
   Lancer depuis la racine du site : node scripts/verifier-question-jour.cjs */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),vm=require('node:vm');
const {execFileSync}=require('node:child_process');
const {chromium}=require('playwright');
const racine=path.join(__dirname,'..');
let nb=0;
function ok(nom){nb++;console.log('OK '+nom);}
const lire=f=>fs.readFileSync(path.join(racine,f),'utf8');
const BANQUE=JSON.parse(lire('assets/data/questions-jour.json'));
const QUESTIONS=BANQUE.questions.map(t=>Object.fromEntries(BANQUE.champs.map((c,i)=>[c,t[i]])));

function banque(){
 execFileSync(process.execPath,['scripts/generer-question-jour.mjs','--verifier'],{cwd:racine,stdio:'pipe'});
 const poids=fs.statSync(path.join(racine,'assets/data/questions-jour.json')).size;
 assert.ok(poids<60*1024,'banque de '+poids+' octets');
 const ctx={};vm.createContext(ctx);
 vm.runInContext(lire('assets/js/academie-questions.js')+';this.Q=ACADEMIE_QUESTIONS;',ctx);
 const academie=new Map(JSON.parse(JSON.stringify(ctx.Q)).map(q=>[q.id,q]));
 const attendues=[...academie.values()].filter(q=>q.statut==='validee'&&!q.prerequis.length).map(q=>q.id).sort();
 assert.deepEqual(QUESTIONS.map(q=>q.id).sort(),attendues,'toutes les questions validées sans prérequis, et elles seules');
 for(const q of QUESTIONS){
  const a=academie.get(q.id);
  assert.equal(q.question,a.question,q.id);assert.equal(q.situation,a.situation||'',q.id);assert.equal(q.explication,a.explication,q.id);
  assert.equal(q.theme,a.theme);assert.equal(q.niveauMin,a.niveauMin);assert.equal(q.niveauMax,a.niveauMax);
  assert.deepEqual(q.choix.slice().sort(),a.choix.slice().sort(),q.id+' : mêmes choix');
  assert.equal(q.choix[q.bonne],a.choix[a.bonne],q.id+' : même bonne réponse');
  assert.ok(q.choix.length>=3&&q.choix.length<=4);
  const l=BANQUE.liens[q.lien];assert.ok(l&&fs.existsSync(path.join(racine,l.split('#')[0])),q.id+' : lien '+l);
  assert.ok(BANQUE.themes[q.theme],q.id+' : thème nommé');
 }
 for(let i=1;i<QUESTIONS.length;i++)assert.notEqual(QUESTIONS[i].theme,QUESTIONS[i-1].theme,'même thème deux jours de suite ('+i+')');
 ok('banque à jour : '+QUESTIONS.length+' questions validées de Mon académie (textes identiques, aucune inventée), '+poids+' octets, liens existants, thèmes alternés');
}

function horsNavigateur(){
 const ctx={window:{},document:{querySelectorAll:()=>[]}};vm.createContext(ctx);
 vm.runInContext(lire('assets/js/question-jour.js'),ctx);
 const Q=ctx.window.PA_QUESTION_JOUR;
 // Jour de Paris : heure d'hiver (UTC+1), heure d'été (UTC+2), autour de minuit
 assert.equal(Q.jourParis(new Date('2026-10-30T22:59:00Z')),'2026-10-30');
 assert.equal(Q.jourParis(new Date('2026-10-30T23:00:00Z')),'2026-10-31');
 assert.equal(Q.jourParis(new Date('2026-07-01T21:59:00Z')),'2026-07-01');
 assert.equal(Q.jourParis(new Date('2026-07-01T22:00:00Z')),'2026-07-02');
 assert.equal(Q.numeroJour('2026-01-01'),0);assert.equal(Q.numeroJour('2026-03-30'),88);assert.equal(Q.numeroJour('2027-01-01'),365);
 assert.equal(Q.jourPrecedent('2026-03-01'),'2026-02-28');assert.equal(Q.jourPrecedent('2026-01-01'),'2025-12-31');
 const n=QUESTIONS.length;
 assert.equal(Q.indexDuJour('2026-01-01',n),0);assert.equal(Q.indexDuJour('2025-12-31',n),n-1,'avant le départ : fin de la banque');
 assert.equal(Q.indexDuJour(Q.jourParis(new Date('2026-10-30T06:00:00Z')),n),Q.indexDuJour(Q.jourParis(new Date('2026-10-30T22:30:00Z')),n),'même question toute la journée');
 assert.notEqual(Q.indexDuJour('2026-10-31',n),Q.indexDuJour('2026-10-30',n),'nouvelle question le lendemain');
 assert.equal(Q.indexDuJour('2026-01-01',n),Q.indexDuJour(new Date(Date.UTC(2026,0,1+n)).toISOString().slice(0,10),n),'cycle de '+n+' jours');
 // Série
 const r={ok:true,c:0,q:'x'};
 let e=Q.normaliser(null);
 e=Q.enregistrer(e,'2026-10-28',r);assert.equal(e.serie,1);assert.equal(e.meilleure,1);
 assert.equal(Q.enregistrer(e,'2026-10-28',r),null,'une seule réponse par jour');
 e=Q.enregistrer(e,'2026-10-29',{ok:false,c:1,q:'y'});assert.equal(e.serie,2,'réponse fausse : la série continue');
 e=Q.enregistrer(e,'2026-10-30',r);assert.equal(e.serie,3);assert.equal(e.meilleure,3);
 assert.equal(Q.serieDuJour(e,'2026-10-31'),3,'série encore valable le lendemain');
 assert.equal(Q.serieDuJour(e,'2026-11-01'),0,'jour sauté : série perdue');
 e=Q.enregistrer(e,'2026-11-01',r);assert.equal(e.serie,1,'jour sauté : la série repart à 1');assert.equal(e.meilleure,3,'record gardé');
 assert.equal(e.dernier,'2026-11-01');assert.equal(e.v,1);
 e=Q.enregistrer(e,'2026-11-02',r);assert.equal(e.serie,2);assert.equal(e.meilleure,3);
 // 60 derniers jours seulement
 let f=Q.normaliser(null);
 for(let k=0;k<70;k++)f=Q.enregistrer(f,new Date(Date.UTC(2026,0,1+k)).toISOString().slice(0,10),r);
 assert.equal(Object.keys(f.reponses).length,60);assert.ok(!f.reponses['2026-01-10']&&f.reponses['2026-03-11']);
 assert.equal(f.serie,70);assert.equal(f.meilleure,70);
 // Données abîmées
 for(const brut of [[1,2],'x',{v:2,serie:4},{v:1,serie:'4',dernier:'hier',reponses:[1]}]){
  const g=Q.normaliser(brut);assert.equal(g.serie,0);assert.equal(g.dernier,null);assert.deepEqual(Object.keys(g.reponses),[]);
 }
 assert.equal(Q.normaliser({v:1,serie:5,meilleure:2,dernier:'2026-10-30',reponses:{}}).meilleure,5,'record jamais sous la série');
 ok('jour de Paris (été, hiver, minuit), même question toute la journée, nouvelle le lendemain, série (+1, remise à 1, record), une réponse par jour, 60 jours, données abîmées');
}

const TYPES={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.woff2':'font/woff2','.webmanifest':'application/manifest+json'};
const serveur=http.createServer((req,res)=>{
 const rel=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\//,'')||'index.html';
 const p=path.resolve(racine,rel);
 if(!p.startsWith(racine+path.sep)){res.writeHead(403);res.end();return;}
 fs.readFile(p,(e,b)=>{if(e){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',TYPES[path.extname(p)]||'text/plain');res.end(b);});
});

// Question attendue pour une date (heure de Paris)
const attendue=jour=>QUESTIONS[(((Math.round((Date.UTC(...jour.split('-').map((x,i)=>i===1?x-1:+x))-Date.UTC(2026,0,1))/86400000))%QUESTIONS.length)+QUESTIONS.length)%QUESTIONS.length];

async function dansLeNavigateur(base){
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const erreurs=[];
 const suivre=page=>{page.on('pageerror',e=>erreurs.push(e.message));page.on('console',m=>{if(m.type()==='error')erreurs.push(m.text());});};
 const contexte=async(largeur,hauteur)=>{
  const ctx=await browser.newContext({serviceWorkers:'block',viewport:{width:largeur,height:hauteur}});
  await ctx.route(/^https:/,r=>r.fulfill({status:200,body:''})); // GoatCounter, comptes : hors test
  await ctx.route('**/assets/vendor/supabase-*.js*',r=>r.fulfill({contentType:'text/javascript',body:''}));
  return ctx;
 };
 let visite=0;
 // Chargement complet à chaque fois (une adresse qui ne diffère que par #… ne recharge pas la page)
 const ouvrir=async(page,url)=>{
  await page.goto(url.replace('#','?visite='+(++visite)+'#'));
  await page.locator('[data-question-jour]').first().scrollIntoViewIfNeeded();
  await page.waitForSelector('.qj-zone .qt-reponse,.qj-zone .qj-echec');
 };
 const sansDebordement=async(page,l)=>assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,l+' px : débordement');
 try{
  for(const [largeur,hauteur] of [[390,844],[320,700]]){
   const ctx=await contexte(largeur,hauteur);
   const page=await ctx.newPage();suivre(page);
   const demandes=[];page.on('request',r=>{if(r.url().includes('questions-jour.json'))demandes.push(r.url());});
   // Jeudi 29 octobre 2026, 9 h à Paris
   await page.clock.setFixedTime(new Date('2026-10-29T09:00:00+01:00'));
   await page.goto(base+'/index.html');
   await page.waitForLoadState('load');await page.waitForTimeout(300);
   assert.equal(demandes.length,0,'banque chargée seulement à l\'approche du bloc');
   const hauteurAvant=await page.evaluate(()=>document.querySelector('#question-du-jour .qj-zone').getBoundingClientRect().height);
   await ouvrir(page,base+'/index.html#question-du-jour');
   assert.equal(demandes.length,1);
   const hauteurApres=await page.evaluate(()=>document.querySelector('#question-du-jour .qj-zone').getBoundingClientRect().height);
   assert.equal(hauteurApres,hauteurAvant,largeur+' px : la question tient dans la place réservée');
   const q1=attendue('2026-10-29');
   assert.equal(await page.textContent('.qj-question'),q1.question);
   assert.equal(await page.locator('.qj-choix .qt-reponse').count(),q1.choix.length);
   assert.equal(await page.textContent('.qj-meta'),BANQUE.themes[q1.theme]+' · '+(q1.niveauMin===q1.niveauMax?'niveau '+q1.niveauMin:'niveaux '+q1.niveauMin+' à '+q1.niveauMax));
   assert.equal(await page.locator('fieldset.qj-choix > legend').count(),1,'groupe nommé (fieldset et legend)');
   assert.equal(await page.textContent('.qj-serie'),'Série : 0 jour · Record : 0 jour');
   for(const h of await page.locator('.qj-choix .qt-reponse').evaluateAll(l=>l.map(b=>b.getBoundingClientRect().height)))assert.ok(h>=44,'cible de '+h+' px');
   await sansDebordement(page,largeur);
   // Même jour, 23 h 30 à Paris : même question
   await page.clock.setFixedTime(new Date('2026-10-29T23:30:00+01:00'));
   await ouvrir(page,base+'/index.html#question-du-jour');
   assert.equal(await page.textContent('.qj-question'),q1.question,'même question toute la journée');
   // Bonne réponse
   await page.locator('.qj-choix .qt-reponse').nth(q1.bonne).click();
   assert.equal(await page.textContent('.qj-resultat .msg b'),'Bonne réponse !');
   assert.equal(await page.textContent('.qj-explication'),q1.explication);
   assert.equal(await page.getAttribute('.qj-lien','href'),BANQUE.liens[q1.lien]);
   assert.equal(await page.textContent('.qj-lien'),'En savoir plus');
   assert.equal(await page.textContent('.qj-demain'),'Reviens demain pour la suivante.');
   assert.equal(await page.getAttribute('.qj-resultat','role'),'status');
   assert.equal(await page.evaluate(()=>document.activeElement.classList.contains('qj-resultat')),true,'focus sur le résultat');
   assert.equal(await page.locator('.qj-choix .qt-reponse:disabled').count(),q1.choix.length,'une seule réponse');
   assert.equal(await page.locator('.qt-reponse.bonne[aria-pressed="true"]').count(),1);
   assert.equal(await page.textContent('.qj-serie'),'Série : 1 jour · Record : 1 jour');
   let etat=await page.evaluate(()=>JSON.parse(localStorage.getItem('pa-question-jour')));
   assert.deepEqual(etat,{v:1,dernier:'2026-10-29',serie:1,meilleure:1,reponses:{'2026-10-29':{ok:true,c:q1.bonne,q:q1.id}}});
   await sansDebordement(page,largeur);
   // Rechargé le même jour : corrigé affiché, pas de seconde réponse
   await ouvrir(page,base+'/index.html#question-du-jour');
   assert.equal(await page.locator('.qj-choix .qt-reponse:disabled').count(),q1.choix.length);
   assert.equal(await page.textContent('.qj-resultat .msg b'),'Bonne réponse !');
   assert.equal(await page.textContent('.qj-serie'),'Série : 1 jour · Record : 1 jour');
   // Lendemain, 0 h 10 à Paris : autre question, réponse fausse, la série continue
   await page.clock.setFixedTime(new Date('2026-10-30T00:10:00+01:00'));
   await ouvrir(page,base+'/index.html#question-du-jour');
   const q2=attendue('2026-10-30');
   assert.notEqual(q2.id,q1.id);
   assert.equal(await page.textContent('.qj-question'),q2.question,'nouvelle question le lendemain');
   assert.equal(await page.textContent('.qj-serie'),'Série : 1 jour · Record : 1 jour. Réponds aujourd\'hui pour la prolonger.');
   const fausse=q2.bonne===0?1:0;
   await page.locator('.qj-choix .qt-reponse').nth(fausse).click();
   assert.equal(await page.textContent('.qj-resultat .msg'),'Pas cette fois. La bonne réponse : '+q2.choix[q2.bonne]+'.');
   assert.equal(await page.locator('.qt-reponse.fausse').count(),1);assert.equal(await page.locator('.qt-reponse.bonne').count(),1);
   assert.equal(await page.textContent('.qj-serie'),'Série : 2 jours · Record : 2 jours');
   // Jour sauté (31 octobre) : série remise à 1 le 1er novembre, record gardé
   await page.clock.setFixedTime(new Date('2026-11-01T12:00:00+01:00'));
   await ouvrir(page,base+'/index.html#question-du-jour');
   assert.equal(await page.textContent('.qj-serie'),'Série : 0 jour · Record : 2 jours');
   await page.locator('.qj-choix .qt-reponse').first().click();
   assert.equal(await page.textContent('.qj-serie'),'Série : 1 jour · Record : 2 jours');
   etat=await page.evaluate(()=>JSON.parse(localStorage.getItem('pa-question-jour')));
   assert.deepEqual(Object.keys(etat.reponses).sort(),['2026-10-29','2026-10-30','2026-11-01']);
   assert.equal(etat.meilleure,2);
   await sansDebordement(page,largeur);
   // Mon espace : même module, même réponse du jour
   await ouvrir(page,base+'/espace.html#esp-bloc-question');
   assert.equal(await page.textContent('#esp-bloc-question .qj-question'),attendue('2026-11-01').question);
   assert.equal(await page.locator('#esp-bloc-question .qt-reponse:disabled').count(),attendue('2026-11-01').choix.length,'déjà répondu sur l\'accueil');
   assert.equal(await page.textContent('#esp-bloc-question .qj-serie'),'Série : 1 jour · Record : 2 jours');
   await sansDebordement(page,largeur);
   await ctx.close();
  }
  ok('accueil 390 et 320 px : chargement à l\'approche, place réservée, même question le même jour, nouvelle le lendemain, juste puis faux, corrigé, une réponse par jour, série, jour sauté, record, Mon espace, cibles 44 px, sans débordement');

  // Clavier : Tab jusqu'aux choix, flèche de tabulation entre eux, Entrée pour répondre, focus sur le résultat
  {
   const ctx=await contexte(390,844);const page=await ctx.newPage();suivre(page);
   await page.clock.setFixedTime(new Date('2026-10-29T09:00:00+01:00'));
   await ouvrir(page,base+'/index.html#question-du-jour');
   await page.focus('#question-du-jour .qj-intro a');
   await page.keyboard.press('Tab');
   assert.equal(await page.evaluate(()=>document.activeElement.dataset.i),'0','Tab : premier choix');
   await page.keyboard.press('Tab');
   assert.equal(await page.evaluate(()=>document.activeElement.dataset.i),'1','Tab : deuxième choix');
   await page.keyboard.press('Enter');
   assert.equal(await page.evaluate(()=>document.activeElement.classList.contains('qj-resultat')),true);
   assert.match(await page.textContent('.qj-resultat .msg b'),/^(Bonne réponse !|Pas cette fois\.)$/);
   await page.keyboard.press('Tab');
   assert.equal(await page.evaluate(()=>document.activeElement.textContent),'En savoir plus','Tab suivant : le lien');
   await ctx.close();
   ok('clavier : choix au Tab, Entrée pour répondre, focus sur le résultat puis le lien');
  }

  // Banque indisponible : message court, place gardée, aucune erreur
  {
   const ctx=await contexte(390,844);const page=await ctx.newPage();
   page.on('pageerror',e=>erreurs.push(e.message));
   page.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))erreurs.push(m.text());});
   await ctx.route('**/assets/data/questions-jour.json',r=>r.fulfill({status:404,body:''}));
   await ouvrir(page,base+'/index.html#question-du-jour');
   assert.equal(await page.textContent('.qj-echec'),'La question du jour n\'a pas pu être chargée. Reviens un peu plus tard.');
   assert.equal(await page.locator('.qj-zone .qt-reponse').count(),0);
   await sansDebordement(page,390);
   await ctx.close();
   ok('banque indisponible : message court, aucune erreur');
  }
 }finally{await browser.close();}
 assert.deepEqual(erreurs,[]);
 ok('aucune erreur dans la console');
}

(async()=>{
 banque();
 horsNavigateur();
 await new Promise(r=>serveur.listen(0,'127.0.0.1',r));
 try{await dansLeNavigateur('http://127.0.0.1:'+serveur.address().port);}
 finally{serveur.close();}
 console.log(nb+' vérifications réussies.');
})().catch(e=>{console.error(e);process.exitCode=1;serveur.close();});
