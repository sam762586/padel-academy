/* Vérification du test de niveau v2 (niveau.html, assets/js/quiz-niveau.js) :
   1) moteur : profils de joueurs types -> palier attendu (classement, résultats, plafonds d'ancienneté, trous techniques) ;
   2) navigateur : parcours complet sans classement, parcours avec un rang déjà saisi dans l'espace, résultat gardé
      sur l'appareil au format v2, bouton « Enregistrer dans mon profil » avec "quiz2" (compte simulé), aucun sans "quiz2", options mélangées, aucun débordement.
   Lancer depuis la racine du site : node scripts/verifier-niveau.cjs */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),vm=require('node:vm');
const {chromium}=require('playwright');
const racine=path.join(__dirname,'..');
let nb=0;
function ok(nom){nb++;console.log('OK '+nom);}
process.on('unhandledRejection',e=>{if(e&&e.name==='TargetClosedError')return;console.error(e);process.exitCode=1;});
const TECH=['vitre','service','aerien','couple','placement','montee','regularite','transition','communication'];
const tech=(v,autres={})=>Object.fromEntries(TECH.map(t=>[t,t in autres?autres[t]:v]));

function moteur(){
 const bac={window:{},document:{getElementById:()=>null}};
 vm.runInNewContext(fs.readFileSync(path.join(racine,'assets/js/quiz-niveau.js'),'utf8'),bac);
 const N=bac.window.PA_NIVEAU,nom=e=>N.PALIERS[N.estimer(e).palier].nom;
 // Données : chaque situation couvre au moins les paliers 0 à 4, une option par palier, thèmes dans l'ordre de la validation SQL
 assert.equal(N.SITUATIONS.length,9);
 const J=x=>JSON.parse(JSON.stringify(x)); // tableaux du bac à sable -> tableaux de ce contexte
 J(N.SITUATIONS).forEach(s=>{const p=s.o.map(o=>o[1]);assert.deepEqual(p,[...p].sort((a,b)=>a-b));assert.equal(new Set(p).size,p.length);[0,1,2,3,4].forEach(x=>assert.ok(p.includes(x),s.theme+' '+x));});
 assert.deepEqual(J(N.THEMES),['vitre','service','aerien','couple','placement','montee','regularite','transition','communication','compet']);
 ok('données : 9 situations, paliers 0 à 4 couverts, une option par palier');
 // Classement FFT : il fait foi
 assert.equal(N.palierDuRang(150,'messieurs'),5);assert.equal(N.palierDuRang(800,'messieurs'),4);assert.equal(N.palierDuRang(3500,'messieurs'),3);
 assert.equal(N.palierDuRang(12000,'messieurs'),2);assert.equal(N.palierDuRang(20000,'messieurs'),2);assert.equal(N.palierDuRang(30000,'messieurs'),2);assert.equal(N.palierDuRang(30001,'messieurs'),1);assert.equal(N.palierDuRang(40000,'messieurs'),1);
 assert.equal(N.palierDuRang(80,'dames'),4);assert.equal(N.palierDuRang(350,'dames'),3);assert.equal(N.palierDuRang(2500,'dames'),2);assert.equal(N.palierDuRang(3001,'dames'),1);
 ok('classement -> palier (messieurs et dames, repères alignés sur les cuts)');
 const base={resultats:null,anciennete:3,frequence:2,raquette:0};
 // Le « théoricien » : 4 mois de padel, coche les meilleures réponses -> P25, pas P500
 assert.equal(nom({...base,anciennete:0,frequence:1,technique:tech(4)}),'P25');
 // Ex-tennis 2e série, 1 an, 3 fois par semaine, jamais de tournoi -> plafonné à P250 « à confirmer »
 let r=N.estimer({...base,anciennete:1,raquette:2,technique:tech(4)});
 assert.equal(N.PALIERS[r.palier].nom,'P250');assert.equal(r.source,'technique');assert.match(r.notes.join(' '),/sans résultat en tournoi/);
 // Vrai débutant
 assert.equal(nom({...base,anciennete:0,frequence:1,technique:tech(0)}),'Découverte');
 // Joueur loisir solide, 5 ans, jamais de tournoi
 assert.equal(nom({...base,technique:tech(2)}),'P100');
 // Joue rarement : plafond P250 même avec une bonne technique
 assert.equal(nom({...base,frequence:0,resultats:3,technique:tech(4)}),'P250');
 ok('profils sans classement : théoricien débutant P25, ex-tennisman P250 à confirmer, débutant, loisir, joueur occasionnel');
 // Résultats : plancher, au plus un palier au-dessus
 assert.equal(nom({...base,resultats:1.5,technique:tech(2)}),'P100');
 assert.equal(nom({...base,resultats:1,technique:tech(4)}),'P100');
 assert.equal(nom({...base,resultats:3,technique:tech(1)}),'P250');
 // Un trou sur un coup clé bloque : sans jeu aérien (0), le reste à 4 ne suffit pas, on reste au palier des résultats
 r=N.estimer({...base,resultats:2,technique:tech(4,{aerien:0})});
 assert.equal(N.PALIERS[r.palier].nom,'P100');assert.equal(r.priorites[0],'aerien');
 ok('résultats en tournoi : plancher et plafond, coup clé manquant en tête des priorités');
 // Classement : fait foi, +1 seulement si le jeu décrit est nettement au-dessus
 assert.equal(nom({...base,rang:3500,sexe:'messieurs',resultats:3,technique:tech(2)}),'P250');
 r=N.estimer({...base,rang:40000,sexe:'messieurs',resultats:1,technique:tech(4)}); // rang P25, jeu décrit P500 : P100 au plus
 assert.equal(N.PALIERS[r.palier].nom,'P100');assert.match(r.notes.join(' '),/au-dessus de ton classement/);
 r=N.estimer({...base,rang:600,sexe:'messieurs',resultats:4,technique:tech(1)});
 assert.equal(N.PALIERS[r.palier].nom,'P500');assert.match(r.notes.join(' '),/sous-estimes/);
 assert.equal(nom({...base,rang:120,sexe:'messieurs',resultats:5,technique:tech(4)}),'P1000 et +');
 ok('classement : fait foi, un palier de plus au maximum, notes explicatives');
 // Thèmes : 10, points 0 à 3, priorités techniques au palier ou en dessous, la compétition n'y entre pas
 r=N.estimer({...base,resultats:1,technique:tech(3,{vitre:1,regularite:2})});
 assert.equal(r.themes.length,10);r.themes.forEach(x=>assert.ok(Number.isInteger(x.pts)&&x.pts>=0&&x.pts<=3));
 assert.deepEqual(J(r.priorites.slice(0,2)),['vitre','regularite']);assert.ok(!r.priorites.includes('compet'));
 ok('thèmes et priorités : coups les plus faibles d\'abord, sans la compétition');
}

const serveur=http.createServer((req,res)=>{
 const rel=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\//,'')||'index.html';
 const p=path.resolve(racine,rel);
 if(!p.startsWith(racine+path.sep)){res.writeHead(403);res.end();return;}
 fs.readFile(p,(e,b)=>{if(e){res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.webp':'image/webp','.webmanifest':'application/manifest+json'})[path.extname(p)]||'text/plain');res.end(b);
 });
});
// Répond à chaque question : choix(question) -> valeur voulue (repères) ou palier (situations)
async function repondre(page,choix){
 const etapes=await page.evaluate(()=>[...window.PA_NIVEAU.REPERES.map(r=>({id:r.id,o:r.o})),...window.PA_NIVEAU.SITUATIONS.map(s=>({id:s.theme,o:s.o}))]);
 for(const et of etapes){
  const v=choix(et.id);
  const texte=et.o.find(o=>o[1]===v)[0];
  await page.locator('#qopts .qopt',{hasText:texte}).first().click();
 }
}
(async()=>{
 moteur();
 await new Promise(r=>serveur.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+serveur.address().port;
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const erreurs=[];
 try{
  const ctx=await browser.newContext({serviceWorkers:'block',viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await ctx.route('**/assets/vendor/supabase-*.js*',r=>r.fulfill({contentType:'text/javascript',body:''}));
  await ctx.route('https://gc.zgo.at/**',r=>r.fulfill({contentType:'text/javascript',body:''}));
  const page=await ctx.newPage();
  page.on('pageerror',e=>erreurs.push(e.message));
  page.on('console',m=>{if(m.type()==='error')erreurs.push(m.text());});
  page.on('response',r=>{if(r.status()>=400&&r.url().startsWith(base))erreurs.push(r.status()+' '+r.url());});
  await page.goto(base+'/niveau.html');
  assert.match(await page.textContent('#qnum'),/Repères · 1 \/ 14/);
  // Rang invalide refusé
  await page.click('.qrang button[type=submit]');
  assert.match(await page.textContent('.qrang .acc-err'),/Entre ton rang/);
  ok('étape classement : rang vide refusé avec un message');
  // Parcours sans classement : 2 ans de padel, jamais de tournoi, bonnes réponses -> plafonné, fiabilité indicative
  await page.click('text=Je ne suis pas classé(e)');
  const ordre1=await page.locator('#qopts .qopt').allTextContents();
  await repondre(page,id=>({resultats:null,anciennete:1,frequence:2,raquette:0}[id]!==undefined?{resultats:null,anciennete:1,frequence:2,raquette:0}[id]:3));
  await page.waitForSelector('#qresult:not([hidden])');
  assert.equal(await page.textContent('#qresult .vtag'),'P100');
  assert.match(await page.textContent('#qresult'),/Indicatif\s: à confirmer en tournoi/);
  assert.match(await page.textContent('#qresult'),/temps de jeu/);
  assert.equal(await page.locator('#qsave').isHidden(),true);
  const q=await page.evaluate(()=>JSON.parse(localStorage.getItem('pa-quiz-dernier')));
  assert.equal(q.version,2);assert.equal(q.palier,2);assert.equal(q.niveau,2);assert.equal(q.reponses.length,10);
  assert.equal(q.score,q.reponses.reduce((s,x)=>s+x.pts,0));
  ok('parcours sans classement : P100 plafonné par l\'ancienneté, résultat v2 gardé sur l\'appareil, pas de bouton sans compte actif');
  // Options mélangées : sur plusieurs affichages, l'ordre de la première situation change
  const ordres=new Set();
  for(let k=0;k<6;k++){
   await page.goto(base+'/niveau.html');await page.click('text=Je ne suis pas classé(e)');
   ordres.add((await page.locator('#qopts .qopt').allTextContents()).join('|'));
  }
  assert.ok(ordres.size>1);assert.equal(ordre1.length,7);
  ok('options mélangées à chaque affichage');
  // Rang déjà saisi dans l'espace joueur : pré-rempli, il fait foi
  await page.evaluate(()=>localStorage.setItem('pa-classement-fft',JSON.stringify({rang:800,sexe:'messieurs',maj:new Date().toISOString()})));
  await page.goto(base+'/niveau.html');
  assert.equal(await page.inputValue('#qrang'),'800');
  await page.click('.qrang button[type=submit]');
  await repondre(page,id=>({resultats:4,anciennete:3,frequence:3,raquette:0}[id]!==undefined?{resultats:4,anciennete:3,frequence:3,raquette:0}[id]:3));
  await page.waitForSelector('#qresult:not([hidden])');
  assert.equal(await page.textContent('#qresult .vtag'),'P500');
  assert.match(await page.textContent('#qresult'),/Fiable\s: basé sur ton classement FFT/);
  assert.equal(await page.locator('#qresult .qprofil-liste li').count(),9);
  ok('rang de l\'espace pré-rempli : P500, fiabilité « classement », profil sur 9 thèmes');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),390);
  await page.click('#qresult summary');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),390);
  ok('aucun débordement à 390 px');
  // Refaire le test : retour à la première étape
  await page.click('text=Refaire le test');
  assert.match(await page.textContent('#qnum'),/1 \/ 14/);
  ok('« Refaire le test » repart de la première étape');
  // Enregistrement dans le profil : "quiz2" activé dans la configuration (SQL quiz-01 à 05 appliqué le 30/10/2026).
  // Compte simulé (le SDK est neutralisé) : on vérifie le bouton, ce qu'il envoie à saveQuiz et ses états.
  const enreg=await page.evaluate(async()=>{
   const actives=[...(window.PA_SUPABASE.activees||[])];
   const dernier=JSON.parse(localStorage.getItem('pa-quiz-dernier'));
   const resume={version:2,score:dernier.score,niveau:dernier.niveau,palier:dernier.palier,reponses:dernier.reponses};
   const envois=[];let liberer;
   const attente=new Promise(r=>{liberer=r;});
   const zone=document.createElement('div');zone.hidden=true;document.body.appendChild(zone);
   const vrai=window.PA_COMPTE;
   window.PA_COMPTE={actif:true,user:{id:'u1'},ready:Promise.resolve(),saveQuiz:async r=>{envois.push(r);await attente;return {ok:true};}};
   qCompte(zone,resume);await new Promise(r=>setTimeout(r,20));
   const bouton=zone.querySelector('button');
   const libelle=bouton&&bouton.textContent,visible=!zone.hidden;
   bouton.click();await new Promise(r=>setTimeout(r,0));
   const pendant={desactive:bouton.disabled,texte:zone.textContent};
   liberer();await new Promise(r=>setTimeout(r,20));
   const apres=zone.textContent;
   // Sans "quiz2" : pas de bouton, pas de promesse « bientôt »
   window.PA_SUPABASE.activees=actives.filter(n=>n!=='quiz2');
   const zone2=document.createElement('div');document.body.appendChild(zone2);
   qCompte(zone2,resume);await new Promise(r=>setTimeout(r,20));
   const sans={bouton:!!zone2.querySelector('button'),texte:zone2.textContent};
   window.PA_SUPABASE.activees=actives;window.PA_COMPTE=vrai;zone.remove();zone2.remove();
   return {actives,libelle,visible,pendant,apres,envois,sans};
  });
  assert.ok(enreg.actives.includes('quiz2'),'quiz2 doit être dans PA_SUPABASE.activees');
  assert.equal(enreg.visible,true);assert.equal(enreg.libelle,'Enregistrer dans mon profil');
  assert.equal(enreg.pendant.desactive,true);assert.match(enreg.pendant.texte,/Enregistrement…/);
  assert.match(enreg.apres,/Résultat enregistré dans ton profil\./);
  assert.equal(enreg.envois.length,1);
  const env=enreg.envois[0];
  assert.equal(env.palier,4);assert.equal(env.niveau,4);assert.equal(env.reponses.length,10);
  env.reponses.forEach(x=>assert.ok(Number.isInteger(x.palier)&&Number.isInteger(x.pts)&&typeof x.theme==='string'));
  assert.equal(env.score,env.reponses.reduce((s,x)=>s+x.pts,0));
  assert.equal(enreg.sans.bouton,false);assert.doesNotMatch(enreg.sans.texte,/bientôt/);
  ok('"quiz2" actif : bouton « Enregistrer dans mon profil », chargement puis confirmation, résultat v2 envoyé (palier, 10 thèmes) ; sans "quiz2", pas de bouton');
  assert.deepEqual(erreurs,[]);
  ok('aucune erreur console ni ressource manquante');
  console.log('TOTAL '+nb+' contrôles réussis.');
 }finally{await browser.close();serveur.close();}
})().catch(e=>{console.error(e);serveur.close();process.exitCode=1;});
