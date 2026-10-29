/* Vérification du quiz tactique (tactique.html#quiz, assets/js/quiz-tactique*.js) :
   1) sous Node : données à jour, une entrée par question de scénario, scène figée identique au moteur du simulateur,
      tirage et mélange des réponses ;
   2) dans Edge : une série complète (bonne puis mauvaises réponses), correction et explication, lien vers la scène en
      3D, score, scénarios à revoir, meilleur score mémorisé, niveaux, 390 et 320 px sans débordement, console sans erreur.
   Lancer depuis la racine du site : node scripts/verifier-quiz-tactique.cjs */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),vm=require('node:vm');
const {execFileSync}=require('node:child_process');
const {pathToFileURL}=require('node:url');
const {chromium}=require('playwright');
const racine=path.join(__dirname,'..');
let nb=0;
function ok(nom){nb++;console.log('OK '+nom);}
const lire=f=>fs.readFileSync(path.join(racine,f),'utf8');

async function horsNavigateur(){
 execFileSync(process.execPath,[path.join(__dirname,'generer-quiz-tactique.mjs'),'--verifier'],{cwd:racine,stdio:'pipe'});
 const ctx={};vm.createContext(ctx);
 vm.runInContext(lire('assets/js/quiz-tactique-donnees.js')+';this.Q=QUIZ_TACTIQUE;',ctx);
 const Q=ctx.Q;
 const {positionJoueur,positionBalle,calculer}=await import(pathToFileURL(path.join(racine,'assets/js/p3d/scenarios.js')).href);
 const dossier=path.join(racine,'assets/3d/scenarios');
 let attendu=0;
 for(const f of fs.readdirSync(dossier).filter(f=>f.endsWith('.json'))){
  const s=JSON.parse(fs.readFileSync(path.join(dossier,f),'utf8')),c=calculer(s);
  (s.questions||[]).forEach((q,i)=>{
   attendu++;
   const e=Q.find(x=>x.id===s.id+'-'+(i+1));
   assert.ok(e,s.id+' question '+(i+1)+' absente');
   assert.equal(e.question,q.question);assert.deepEqual([...e.choix],q.choix);assert.equal(e.bonne,q.bonne);assert.equal(e.explication,q.explication);
   e.joueurs.forEach(([id,,x,z])=>{const p=positionJoueur(s.positions[id],q.t);assert.ok(Math.abs(p[0]-x)<0.01&&Math.abs(p[1]-z)<0.01,e.id+' '+id);});
   const b=positionBalle(c,q.t);assert.ok(e.balle.every((v,k)=>Math.abs(v-b[k])<0.01),e.id+' balle');
   assert.ok(fs.existsSync(path.join(racine,'simulateur-3d-'+s.id+'.html')),e.id+' : page 3D');
  });
 }
 assert.equal(Q.length,attendu);assert.equal(new Set(Q.map(q=>q.id)).size,Q.length);
 ok('données à jour : les '+Q.length+' questions des scénarios, scène figée identique au moteur du simulateur, page 3D de chaque scénario');
 // Tirage et mélange (fonctions du script, avec un hasard fixé)
 const ctx2={window:{},document:{getElementById:()=>null},localStorage:{getItem:()=>null}};vm.createContext(ctx2);
 vm.runInContext(lire('assets/js/quiz-tactique.js'),ctx2);
 const {tirer,melanger}=ctx2.window.PA_QUIZ_TACTIQUE;
 let g=1;const alea=()=>(g=(g*16807)%2147483647)/2147483647;
 const t=tirer(Q,10,alea);assert.equal(t.length,10);assert.equal(new Set(t.map(q=>q.id)).size,10);
 assert.equal(tirer(Q.slice(0,4),10,alea).length,4);
 for(const q of Q){const m=melanger(q,alea);assert.equal(m.choix[m.bonne],q.choix[q.bonne]);assert.deepEqual([...m.choix].sort(),[...q.choix].sort());}
 ok('tirage sans doublon (10 au plus), réponses mélangées sans perdre la bonne');
 return Q;
}

const TYPES={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.webmanifest':'application/manifest+json'};
const serveur=http.createServer((req,res)=>{
 const rel=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\//,'')||'index.html';
 const p=path.resolve(racine,rel);
 if(!p.startsWith(racine+path.sep)){res.writeHead(403);res.end();return;}
 fs.readFile(p,(e,b)=>{if(e){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',TYPES[path.extname(p)]||'text/plain');res.end(b);});
});

async function dansLeNavigateur(base,Q){
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const erreurs=[];
 try{
  for(const [largeur,hauteur] of [[1280,900],[390,844],[320,700]]){
   const ctx=await browser.newContext({serviceWorkers:'block',viewport:{width:largeur,height:hauteur}});
   await ctx.route(/^https:/,r=>r.fulfill({status:200,body:''}));
   const page=await ctx.newPage();
   page.on('pageerror',e=>erreurs.push(e.message));page.on('console',m=>{if(m.type()==='error')erreurs.push(m.text());});
   await page.goto(base+'/tactique.html#quiz');
   const debordement=()=>page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
   // Accueil : 4 niveaux, nombre de questions de chacun
   const niveaux=await page.$$eval('#qt [data-niveau]',b=>b.map(x=>[x.dataset.niveau,Number(x.querySelector('.qt-nb').textContent)]));
   assert.deepEqual(niveaux.map(n=>n[0]),['Tous','Débutant','Intermédiaire','Avancé']);
   assert.equal(niveaux[0][1],Q.length);
   assert.equal(niveaux.slice(1).reduce((a,n)=>a+n[1],0),Q.length,'chaque question a un niveau connu');
   const niveau=largeur===1280?'Tous':'Débutant',nbNiveau=niveaux.find(n=>n[0]===niveau)[1];
   await page.click(`#qt [data-niveau="${niveau}"]`);
   await page.click('#qt-commencer');
   const sur=Math.min(10,nbNiveau),vues=[];
   for(let i=0;i<sur;i++){
    assert.match(await page.textContent('.qt-avancement'),new RegExp('Question '+(i+1)+' sur '+sur));
    const intitule=await page.textContent('#qt-intitule'),scenario=await page.textContent('.qt-scenario');
    const q=Q.find(x=>x.question===intitule&&scenario.startsWith(x.titre));
    assert.ok(q,'question inconnue : '+intitule);
    if(niveau!=='Tous')assert.equal(q.niveau,niveau);
    assert.ok(!vues.includes(q.id),'question posée deux fois');vues.push(q.id);
    // Schéma : terrain, 4 joueurs nommés, balle et sa hauteur, description pour les lecteurs d'écran
    assert.equal(await page.locator('.qt-schema .qt-joueur').count(),4);
    assert.equal(await page.locator('.qt-schema .qt-balle circle').count(),1);
    assert.match(await page.getAttribute('.qt-schema','aria-label'),/^Schéma du terrain vu de dessus.*Toi : .*Balle à \d+,\d m de haut/);
    if(i===0&&largeur===1280){
     // Placement : « Toi » (A1) dessiné à -x, -z du repère du simulateur
     const toi=q.joueurs.find(j=>j[0]==='A1');
     const cx=Number(await page.getAttribute('#qt .qt-nous circle >> nth=0','cx')),cy=Number(await page.getAttribute('#qt .qt-nous circle >> nth=0','cy'));
     assert.ok(Math.abs(cx+toi[2])<0.01&&Math.abs(cy+toi[3])<0.01,'position de Toi sur le schéma');
    }
    // Réponse : la bonne à la première question, une fausse ensuite
    const boutons=page.locator('.qt-reponse');
    const textes=await boutons.allTextContents();
    const k=i===0?textes.indexOf(q.choix[q.bonne]):textes.findIndex(t=>t!==q.choix[q.bonne]);
    assert.ok(k>=0);
    await boutons.nth(k).click();
    assert.equal(await page.locator('.qt-reponse:disabled').count(),textes.length,'réponses verrouillées');
    assert.equal(await page.locator('.qt-reponse.bonne').count(),1);
    assert.equal(await page.textContent('.qt-reponse.bonne'),q.choix[q.bonne]);
    const msg=await page.textContent('#qt-correction .msg');
    assert.ok(msg.startsWith(i===0?'Bonne réponse.':'Pas tout à fait.')&&msg.includes(q.explication),'correction et explication');
    assert.equal(await page.getAttribute('#qt-correction .qt-actions a','href'),'simulateur-3d-'+q.scenario+'.html#mode-quiz');
    // Après une erreur seulement : article, exercice et scène de la question
    if(i===0)assert.equal(await page.locator('#qt-correction .qt-revoir').count(),0,'pas de « Pour revoir » sur une bonne réponse');
    else{
     assert.equal(await page.getAttribute('.qt-revoir li:nth-child(1) a','href'),q.revoir.article.url);
     assert.equal(await page.textContent('.qt-revoir li:nth-child(2) summary b'),await page.evaluate(id=>EXERCICES.find(e=>e.id===id).titre,q.revoir.exercice));
     assert.equal(await page.getAttribute('.qt-revoir li:nth-child(3) a','href'),'simulateur-3d-'+q.scenario+'.html#mode-quiz');
    }
    if(i===0)assert.equal(await debordement(),false,largeur+' px : question sans débordement');
    await page.click('#qt-suite');
   }
   // Fin : score, scénarios à revoir (les questions manquées), meilleur score mémorisé
   assert.equal(await page.textContent('#qt-score'),'Score : 1 sur '+sur);
   const manques=new Set(vues.slice(1).map(id=>Q.find(q=>q.id===id).scenario));
   assert.equal(await page.locator('.qt-revoir li').count(),manques.size);
   const record=await page.evaluate(()=>JSON.parse(localStorage.getItem('pa-quiz-tactique')));
   assert.deepEqual([record[niveau].score,record[niveau].sur],[1,sur]);
   assert.equal(await debordement(),false,largeur+' px : bilan sans débordement');
   await page.click('#qt-niveau');
   await page.click(`#qt [data-niveau="${niveau}"]`);
   assert.match(await page.textContent('#qt-record'),new RegExp('1 sur '+sur));
   assert.equal(await debordement(),false,largeur+' px : accueil sans débordement');
   await ctx.close();
  }
  ok('série complète à 1280 px (tous niveaux) et à 390 / 320 px (débutant) : schéma fidèle, correction, lien 3D, score, à revoir, meilleur score, sans débordement');
  // Lien depuis l'espace joueur
  assert.match(lire('espace.html'),/href="tactique\.html#quiz"/);
  ok('lien vers le quiz depuis l’espace joueur');
 }finally{await browser.close();}
 assert.deepEqual(erreurs,[]);
 ok('aucune erreur dans la console');
}

(async()=>{
 const Q=await horsNavigateur();
 await new Promise(r=>serveur.listen(0,'127.0.0.1',r));
 try{await dansLeNavigateur('http://127.0.0.1:'+serveur.address().port,Q);}
 finally{serveur.close();}
 console.log(nb+' vérifications réussies.');
})().catch(e=>{console.error(e);process.exitCode=1;serveur.close();});
