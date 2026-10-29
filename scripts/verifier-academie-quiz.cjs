/* Vérification du quiz adaptatif de Mon académie (academie.html#quiz, assets/js/academie-quiz.js) :
   1) sous Node, pour les 10 niveaux : questions de référence posables au niveau, sans doublon, thèmes variés,
      prérequis respectés ; adaptation (découverte N+1, consolidation N−1, référence) et bornes 1 et 10 ; répartition
      réglable ; pas de question des 2 dernières séances tant que la banque le permet ; bilan (score, thèmes, forts,
      à renforcer, recommandations) ; données abîmées ignorées ; questions validées seulement ;
   2) dans Edge : sans niveau, séance complète au niveau 5 avec découverte du niveau 6, reprise après rechargement
      (même question, mêmes réponses dans le même ordre), bilan, niveau déclaré inchangé, nouvelle séance sans
      répétition, niveau 1 (pas de consolidation), 390 et 320 px, console sans erreur.
   Lancer depuis la racine du site : node scripts/verifier-academie-quiz.cjs */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),vm=require('node:vm');
const {chromium}=require('playwright');
const racine=path.join(__dirname,'..');
let nb=0;
function ok(nom){nb++;console.log('OK '+nom);}
const lire=f=>fs.readFileSync(path.join(racine,f),'utf8');

function horsNavigateur(){
 const ctx={window:{},document:{getElementById:()=>null},localStorage:{getItem:()=>null}};vm.createContext(ctx);
 vm.runInContext(lire('assets/js/academie-questions.js')+';'+lire('assets/js/academie-quiz.js')+';this.Q=ACADEMIE_QUESTIONS;',ctx);
 const Q=JSON.parse(JSON.stringify(ctx.Q)),A=ctx.window.PA_ACADEMIE_QUIZ,C=JSON.parse(JSON.stringify(A.CONFIG));
 const parId=Object.fromEntries(Q.map(q=>[q.id,q]));
 let g=7;const alea=()=>(g=(g*16807)%2147483647)/2147483647;
 const posable=(q,n)=>q.statut==='validee'&&q.niveauMin<=n&&n<=q.niveauMax;
 // Joue une séance en répondant juste (true), faux (false) ou au hasard
 const jouer=(n,seances,strategie)=>{
  let s=JSON.parse(JSON.stringify(A.nouvelle(Q,n,seances,alea)));
  while(s.reponses.length<s.questions.length){const q=parId[s.questions[s.reponses.length].id],juste=strategie==='juste'||(strategie==='hasard'&&alea()<.6);
   s=JSON.parse(JSON.stringify(A.repondre(Q,s,juste?q.bonne:(q.bonne+1)%q.choix.length,seances,alea)));}
  return s;
 };
 const prerequisRespectes=(s,seances)=>{const maitrisees=new Set();seances.forEach(x=>x.reponses.forEach(r=>{if(r.juste)maitrisees.add(r.id);}));
  s.questions.forEach((x,i)=>parId[x.id].prerequis.forEach(p=>assert.ok(maitrisees.has(p)||s.questions.slice(0,i).some(y=>y.id===p),x.id+' posée avant son prérequis '+p)));};
 for(let n=1;n<=10;n++){
  for(const strat of ['juste','faux','hasard']){
   const s=jouer(n,[],strat);
   const ref=s.questions.filter(x=>x.type==='reference'&&x.cible===n);
   assert.equal(s.questions.length,C.reference+C.adaptation,n+' '+strat+' : 10 questions');
   assert.equal(new Set(s.questions.map(x=>x.id)).size,s.questions.length,'sans doublon');
   s.questions.slice(0,C.reference).forEach(x=>{assert.equal(x.type,'reference');assert.ok(posable(parId[x.id],n),x.id+' posable au niveau '+n);});
   assert.ok(new Set(s.questions.slice(0,C.reference).map(x=>parId[x.id].theme)).size>=4,'niveau '+n+' : thèmes variés');
   s.questions.forEach(x=>{assert.ok(posable(parId[x.id],x.cible),x.id+' posable au niveau '+x.cible);assert.equal(JSON.stringify([...x.ordre].sort()),JSON.stringify(parId[x.id].choix.map((_,i)=>i)),'ordre des réponses');});
   prerequisRespectes(s,[]);
   // Adaptation et bornes
   const attendu=strat==='juste'?(n<10?['decouverte',n+1]:['reference',10]):strat==='faux'?(n>1?['consolidation',n-1]:['reference',1]):null;
   if(attendu){assert.deepEqual([s.adaptation.mode,s.adaptation.cible],attendu,n+' '+strat);
    s.questions.slice(C.reference).forEach(x=>assert.deepEqual([x.type,x.cible],attendu));}
   if(attendu&&attendu[0]==='decouverte'){const nouv=Q.filter(q=>posable(q,n+1)&&q.niveauMin>n).length;
    assert.ok(s.questions.slice(C.reference).filter(x=>parId[x.id].niveauMin>n).length===Math.min(C.adaptation,nouv),n+' : découverte, d’abord des questions au-dessus du niveau');}
   // Bilan
   const b=A.bilan(Q,s);
   assert.equal(b.total,s.questions.length);assert.equal(b.score,s.reponses.filter(r=>r.juste).length);
   assert.equal(Object.values(b.parTheme).reduce((a,t)=>a+t.total,0),b.total);
   assert.equal(b.forts.length+b.aRenforcer.length,Object.keys(b.parTheme).length);
   assert.ok(b.recommandations.length<=3&&b.recommandations.every(r=>r.article&&(r.exercice||["materiel","culture"].includes(r.theme))));
   if(strat==='juste'){assert.equal(b.score,b.total);assert.equal(b.aRenforcer.length,0);}
  }
 }
 assert.deepEqual([...Object.values(A.adaptation(5,4))],['reference',5],'score moyen : on reste au niveau');
 ok('10 niveaux × 3 profils de réponses : 10 questions sans doublon, posables, thèmes variés, prérequis respectés ; découverte N+1, consolidation N−1, bornes 1 et 10 ; bilan cohérent');
 // Répartition réglable
 const s4=A.nouvelle(Q,5,[],alea,{...C,reference:4,adaptation:2});assert.equal(s4.questions.length,4);
 // Non-répétition : 3 séances au niveau 5 (banque large), puis niveau 10 (banque juste)
 for(const n of [5,10]){
  const seances=[];
  for(let k=0;k<3;k++){const s=jouer(n,seances,'hasard');prerequisRespectes(s,seances);
   const vues=new Set(seances.slice(-C.seancesSansRepetition).flatMap(x=>x.reponses.map(r=>r.id)));
   // Inédites réellement posables : prérequis maîtrisés ou eux-mêmes inédits (une question dont le prérequis a été raté
   // récemment attend qu'on le repose : la reprendre est alors voulu)
   const {maitrisees}=A.memoire(seances,C),inedites=new Set(Q.filter(q=>posable(q,n)&&!vues.has(q.id)).map(q=>q.id));
   const disponibles=[...inedites].filter(id=>Q.find(q=>q.id===id).prerequis.every(p=>maitrisees.has(p)||inedites.has(p))).length;
   const repetees=s.questions.slice(0,C.reference).filter(x=>vues.has(x.id)).length;
   assert.ok(repetees<=Math.max(0,C.reference-disponibles),'niveau '+n+', séance '+(k+1)+' : '+repetees+' question(s) répétée(s) alors que '+disponibles+' restaient');
   seances.push(s);}
 }
 ok('répartition réglable ; pas de question des 2 dernières séances tant que la banque le permet (niveaux 5 et 10)');
 // Données abîmées, questions non validées
 assert.deepEqual(JSON.parse(JSON.stringify(A.normaliser({enCours:{id:'x',niveau:12,questions:[],reponses:[]},seances:'z'},Q))),{enCours:null,seances:[]});
 const Qb=Q.map(q=>({...q,statut:q.id.startsWith('regles')?'brouillon':q.statut}));
 assert.ok(A.nouvelle(Qb,1,[],alea).questions.every(x=>!x.id.startsWith('regles')),'questions non validées jamais posées');
 ok('données abîmées ignorées ; questions non validées jamais posées');
}

const TYPES={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.woff2':'font/woff2','.webmanifest':'application/manifest+json'};
const serveur=http.createServer((req,res)=>{
 const rel=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\//,'')||'index.html';
 const p=path.resolve(racine,rel);
 if(!p.startsWith(racine+path.sep)){res.writeHead(403);res.end();return;}
 fs.readFile(p,(e,b)=>{if(e){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',TYPES[path.extname(p)]||'application/octet-stream');res.end(b);});
});

async function dansLeNavigateur(base){
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const erreurs=[];
 const enCours=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('pa-academie-quiz')||'{}').enCours||null);
 async function repondre(page,juste){
  const s=await enCours(page),id=s.questions[s.reponses.length].id;
  const q=await page.evaluate(id=>ACADEMIE_QUESTIONS.find(x=>x.id===id),id);
  const textes=await page.locator('.qt-reponse').allTextContents();
  const k=juste?textes.indexOf(q.choix[q.bonne]):textes.findIndex(t=>t!==q.choix[q.bonne]);
  await page.locator('.qt-reponse').nth(k).click();
  assert.equal(await page.locator('.qt-reponse.bonne').count(),1);
  assert.match(await page.textContent('#aq-correction .msg'),juste?/^Bonne réponse\./:/^Pas tout à fait\./);
  await page.click('#aq-suite');
 }
 try{
  for(const [largeur,hauteur] of [[1280,900],[390,844],[320,700]]){
   const ctx=await browser.newContext({serviceWorkers:'block',viewport:{width:largeur,height:hauteur}});
   await ctx.route(/^https:/,r=>r.fulfill({status:200,body:''}));
   const page=await ctx.newPage();
   page.on('pageerror',e=>erreurs.push(e.message));page.on('console',m=>{if(m.type()==='error')erreurs.push(m.text());});
   await page.goto(base+'/academie.html');
   assert.match(await page.textContent('#aq'),/Choisis d'abord ton niveau/,'sans niveau : invitation');
   await page.click('.ac-carte [data-choisir="5"]');
   assert.match(await page.textContent('#aq'),/10 questions, une à la fois/);
   await page.click('#aq-nouveau');
   for(let i=0;i<3;i++){assert.match(await page.textContent('.aq-avancement'),new RegExp('^Question '+(i+1)+' sur 10'));await repondre(page,true);}
   // Interruption : rechargement, reprise sur la même question, réponses dans le même ordre
   const avant=await enCours(page),idAvant=avant.questions[3].id,ordreAvant=await page.locator('.qt-reponse').allTextContents();
   await page.reload();
   assert.match(await page.textContent('#aq'),/quiz en cours \(niveau 5\) : question 4 sur 6 au moins/);
   await page.click('#aq-reprendre');
   assert.equal((await enCours(page)).questions[3].id,idAvant);
   assert.deepEqual(await page.locator('.qt-reponse').allTextContents(),ordreAvant,'mêmes réponses, même ordre');
   for(let i=3;i<6;i++)await repondre(page,true);
   assert.match(await page.textContent('.aq-avancement'),/^Question 7 sur 10 · .*Découverte · niveau 6/);
   for(let i=6;i<10;i++)await repondre(page,i!==7);
   // Bilan
   assert.equal(await page.textContent('#aq-score'),'Score : 9 sur 10');
   assert.match(await page.textContent('.aq-bilan'),/Tes réponses t'ont fait découvrir des questions du niveau 6\. Ton niveau déclaré reste le 5/);
   assert.equal(await page.locator('.aq-erreurs li').count(),1);
   assert.ok(await page.locator('.aq-reco a.btn.primary').count()>=1,'Travailler cette compétence');
   const etat=await page.evaluate(()=>({niveau:JSON.parse(localStorage.getItem('pa-academie')).niveau,q:JSON.parse(localStorage.getItem('pa-academie-quiz'))}));
   assert.equal(etat.niveau,5,'niveau déclaré inchangé');assert.equal(etat.q.enCours,null);assert.equal(etat.q.seances.length,1);
   // Nouvelle séance : aucune question de la précédente (banque large au niveau 5)
   await page.click('#aq-refaire');
   const vues=new Set(etat.q.seances[0].reponses.map(r=>r.id));
   assert.ok((await enCours(page)).questions.every(x=>!vues.has(x.id)),'pas de répétition');
   // Niveau 1, tout faux : pas de consolidation sous le niveau 1
   await page.evaluate(()=>localStorage.removeItem('pa-academie-quiz'));
   await page.click('.ac-carte [data-choisir="1"]');await page.click('#aq-nouveau');
   for(let i=0;i<10;i++)await repondre(page,false);
   const s1=await page.evaluate(()=>JSON.parse(localStorage.getItem('pa-academie-quiz')).seances[0]);
   assert.ok(s1.questions.every(x=>x.type==='reference'&&x.cible===1),'niveau 1 : pas de consolidation');
   assert.equal(await page.textContent('#aq-score'),'Score : 0 sur 10');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,largeur+' px : pas de débordement');
   await ctx.close();
  }
  ok('Edge : sans niveau, séance au niveau 5 avec découverte du niveau 6, reprise après interruption, bilan, niveau inchangé, pas de répétition, niveau 1 sans consolidation, 1280 / 390 / 320 px');
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
