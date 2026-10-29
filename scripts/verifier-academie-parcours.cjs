/* Vérification du parcours personnalisé de Mon académie (phase 4) : classement des contenus (academie-contenus.js),
   moteur du parcours (academie-parcours.js), moteur d'exercices commun avec Mon espace (exercices.js) et défi partagé
   (defis.js).
   1) sans navigateur : articles (liens, niveaux, thèmes, prérequis), compétences des niveaux identiques aux cartes,
      correspondance des thèmes identique à la banque de questions, classement des 30 exercices, niveau d'exercice,
      thèmes faibles ; pour les 10 niveaux : priorités, articles et scènes 3D du niveau, exercices du moteur commun ;
   2) dans Edge : parcours vide sans niveau ; parcours au niveau 5 ; quiz manqué → compétence à travailler ; priorités
      (3 au plus) ; exercice fait (même stockage que Mon espace) ; défi relevé depuis l'académie ; Mon espace suit le
      niveau déclaré (exercices et défi) et les thèmes faibles des quiz ; 390 et 320 px ; console sans erreur.
   Lancer depuis la racine du site : node scripts/verifier-academie-parcours.cjs */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),vm=require('node:vm');
const {pathToFileURL}=require('node:url');
const {chromium}=require('playwright');
const racine=path.join(__dirname,'..');
let nb=0;
function ok(nom){nb++;console.log('OK '+nom);}
const lire=f=>fs.readFileSync(path.join(racine,f),'utf8');
const lienValide=l=>{const [page,ancre]=l.split('#');return fs.existsSync(path.join(racine,page))&&(!ancre||lire(page).includes('id="'+ancre+'"'));};
const copie=v=>JSON.parse(JSON.stringify(v));

async function horsNavigateur(){
 const doc={getElementById:()=>null};
 const ctx={window:{},document:doc,localStorage:{getItem:()=>null}};vm.createContext(ctx);
 vm.runInContext(['exercices-donnees','academie-questions','academie-contenus','exercices','academie-parcours'].map(f=>lire('assets/js/'+f+'.js')).join(';\n')+';this.Q=ACADEMIE_QUESTIONS;this.T=ACADEMIE_THEMES;this.EX=EXERCICES;this.A=ACADEMIE_ARTICLES;',ctx);
 const C=ctx.window.PA_ACADEMIE_CONTENUS,P=ctx.window.PA_PARCOURS,E=ctx.window.PA_EXERCICES,Q=copie(ctx.Q),T=copie(ctx.T),EX=copie(ctx.EX),A=copie(ctx.A);
 const THEMES=Object.keys(T);
 // Articles
 assert.equal(new Set(A.map(a=>a.id)).size,A.length);
 A.forEach(a=>{assert.ok(lienValide(a.url),a.id+' : '+a.url);assert.ok(1<=a.niveaux[0]&&a.niveaux[0]<=a.niveaux[1]&&a.niveaux[1]<=10,a.id);
  assert.ok(a.themes.length&&a.themes.every(t=>THEMES.includes(t)),a.id+' : thèmes');assert.ok([1,2,3].includes(a.difficulte));
  a.prerequis.forEach(p=>assert.ok(A.some(x=>x.id===p),a.id+' : prérequis '+p));});
 for(let n=1;n<=10;n++)assert.ok(A.filter(a=>a.niveaux[0]<=n&&n<=a.niveaux[1]).length>=2,'niveau '+n+' : 2 articles au moins');
 THEMES.forEach(t=>assert.ok(A.some(a=>a.themes.includes(t)),t+' : un article au moins'));
 // Compétences des niveaux = cartes de academie.html
 const LIBELLES={'Règles':'regles','Volée':'volee','Transition':'transition','Vitres':'vitres','Défense':'defense','Lob':'lob','Bandeja':'bandeja','Vibora':'vibora','Víbora':'vibora','Construction du point':'construction','Placement':'placement','Communication':'communication'};
 const h=lire('academie.html');
 for(let n=1;n<=10;n++){
  const carte=h.match(new RegExp('id="niveau-'+n+'"[\\s\\S]*?</li>\\n'))[0];
  const m=carte.match(/Compétences à travailler :<\/b> ([^.]*)\./);
  assert.deepEqual(m?m[1].split(', ').map(l=>LIBELLES[l]):[],[...C.NIVEAUX_THEMES[n]],'niveau '+n+' : compétences de la carte');
 }
 // Correspondance des thèmes = banque de questions (générateur)
 const {THEMES:GEN}=await import(pathToFileURL(path.join(__dirname,'generer-academie-questions.mjs')).href);
 assert.deepEqual(copie(C.THEME_EXERCICES),Object.fromEntries(Object.entries(GEN).map(([k,v])=>[k,v.exercices])));
 // Exercices
 EX.forEach(e=>{const c=copie(C.exerciceClasse(e));
  assert.ok(1<=c.niveaux[0]&&c.niveaux[1]<=10&&c.themes.length&&c.themes.every(t=>THEMES.includes(t)),e.id);
  e.niveaux.forEach(nv=>assert.equal(C.niveauExercice(c.niveaux[0])<=nv&&nv<=C.niveauExercice(c.niveaux[1]),true,e.id+' : niveau '+nv));
  c.prerequis.forEach(p=>assert.ok(EX.some(x=>x.id===p),e.id+' : prérequis '+p));});
 assert.deepEqual([1,2,3,4,5,6,7,8,9,10].map(C.niveauExercice),[1,1,1,2,2,3,3,4,4,4]);
 // Thèmes faibles
 const s=(th,juste)=>({reponses:th.map((t,i)=>({id:'x'+i,theme:t,juste:juste[i]}))});
 assert.deepEqual(copie(C.themesFaibles([s(['lob','lob','volee'],[false,false,true])])).map(f=>f.theme),['lob']);
 assert.deepEqual(copie(C.themesFaibles([s(['lob','volee'],[true,true]),s(['regles'],[false])])).map(f=>f.theme),['regles'],'manqué au dernier quiz');
 ok(A.length+' articles (liens, niveaux, thèmes, prérequis), compétences identiques aux cartes, thèmes identiques à la banque, 30 exercices classés, niveau d’exercice, thèmes faibles');
 // Parcours pour les 10 niveaux
 for(let n=1;n<=10;n++){
  const prio=copie(P.priorites({niveau:n}));
  // compétences du niveau d'abord, complétées par celles des niveaux voisins (n-1, n+1, n-2…) : toujours 4
  const voisins=[n];for(let d=1;d<10;d++)voisins.push(n-d,n+d);
  assert.deepEqual(prio,[...new Set(voisins.flatMap(k=>C.NIVEAUX_THEMES[k]||[]))].slice(0,4),'niveau '+n+' : priorités');
  assert.equal(prio.length,4,'niveau '+n+' : 4 compétences, donc 3 priorités dans Ta semaine');
  const arts=copie(P.articles(n,prio));assert.ok(arts.length>=2&&arts.every(a=>a.niveaux[0]<=n&&n<=a.niveaux[1]),'niveau '+n+' : articles');
  const sc=copie(P.scenesRecommandees(Q,n,prio));assert.ok(sc.length>=1&&sc.every(x=>x.niveaux[0]<=n&&n<=x.niveaux[1]),'niveau '+n+' : scènes');
  const th=copie(E.themesPrioritaires(null,[],[],[],P.entreeExercices(n,['communication'],[])));
  assert.equal(th[0].theme,'communication','priorité choisie en tête des exercices');
 }
 const prio=copie(P.priorites({niveau:5,faibles:[{theme:'regles'}],choisis:['communication']}));
 assert.deepEqual(prio.slice(0,2),['communication','regles'],'priorités : choisies, puis faibles, puis niveau');
 ok('10 niveaux : priorités, articles et scènes 3D du niveau, exercices du moteur commun (priorité choisie en tête)');
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
 try{
  for(const [largeur,hauteur] of [[1280,900],[390,844],[320,700]]){
   const ctx=await browser.newContext({serviceWorkers:'block',viewport:{width:largeur,height:hauteur}});
   await ctx.route(/^https:/,r=>r.fulfill({status:200,body:''})); // comptes indisponibles : données de l'appareil
   await ctx.route('**/assets/vendor/supabase-*.js*',r=>r.fulfill({contentType:'text/javascript',body:''})); // comptes indisponibles : le SDK (sur le site) est bloqué aussi
   const page=await ctx.newPage();
   page.on('pageerror',e=>erreurs.push(e.message));page.on('console',m=>{if(m.type()==='error')erreurs.push(m.text());});
   await page.clock.setFixedTime(new Date('2026-10-29T10:00:00'));
   await page.goto(base+'/academie.html');
   assert.match(await page.textContent('#ap'),/Choisis ton niveau : ton parcours/);
   await page.click('.ac-carte [data-choisir="5"]');
   assert.equal(await page.locator('#ap .ap-bloc').count(),6,'six blocs');
   assert.match(await page.textContent('.ap-competences'),/Pas encore évalué/);
   // Quiz terminé avec la víbora manquée : compétence à travailler, en tête
   const seance={id:'s-test',niveau:5,debut:'2026-10-28T10:00:00.000Z',adaptee:true,questions:[{id:'vibora-1',type:'reference',cible:5,ordre:[0,1,2]},{id:'volee-revers-1',type:'reference',cible:5,ordre:[0,1,2]}],
    reponses:[{id:'vibora-1',choix:0,juste:false,type:'reference',theme:'vibora'},{id:'volee-revers-1',choix:0,juste:true,type:'reference',theme:'volee'}]};
   await page.evaluate(s=>{localStorage.setItem('pa-academie-quiz',JSON.stringify({enCours:null,seances:[s]}));window.dispatchEvent(new Event('pa-academie-quiz'));},seance);
   assert.match(await page.textContent('.ap-competences .ap-liste li:first-child'),/^Víbora À travailler · 0\/1$/);
   assert.match(await page.textContent('.ap-competences .note'),/D'après ton dernier quiz/);
   // Priorités : 3 au plus, la priorité choisie passe en tête
   await page.click('.ap-priorites summary');
   for(const t of ['regles','communication','lob'])await page.check(`.ap-choix input[value="${t}"]`);
   await page.locator('.ap-choix input[value="placement"]').click();
   assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('pa-academie-priorites')).themes),['regles','communication','lob']);
   assert.equal(await page.isChecked('.ap-choix input[value="placement"]'),false,'4e priorité refusée');
   assert.match(await page.textContent('.ap-competences .ap-liste li:first-child'),/^Règles/);
   // Exercice fait : même stockage que Mon espace, historique à jour
   const exo=await page.getAttribute('.ap-fait >> nth=0','data-exo');
   await page.locator('.ap-exos details >> nth=0').evaluate(d=>{d.open=true;});
   await page.click('.ap-fait >> nth=0');
   assert.ok(await page.evaluate(id=>!!JSON.parse(localStorage.getItem('pa-exercices-faits'))[id],exo));
   assert.match(await page.textContent('#ap'),/Exercices faits : 1/);
   // Défi de la semaine : rendu dans l'académie, au niveau d'exercice du niveau déclaré (5 → 2), relevé partagé
   const attendu=await page.evaluate(()=>PA_DEFIS.defi(PA_DEFIS.lundi(new Date()),2).exercice.titre);
   assert.equal(await page.textContent('#ac-defi h3'),attendu);
   await page.click('#ac-defi .df-releve');
   assert.ok(await page.evaluate(()=>!!JSON.parse(localStorage.getItem('pa-defis'))['2026-W44']));
   assert.match(await page.textContent('#ap'),/Défis relevés : 1/);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,largeur+' px : pas de débordement');
   // Mon espace suit le niveau déclaré et les thèmes faibles des quiz
   if(largeur===1280){
    await page.click('.ac-carte [data-choisir="8"]');
    await page.goto(base+'/espace.html');
    assert.match(await page.textContent('#esp-exercices'),/niveau déclaré \(8 sur 10/);
    assert.match(await page.textContent('#esp-exercices'),/Quiz de l'académie/);
    const defiEspace=await page.textContent('#esp-defi h3');
    assert.equal(defiEspace,await page.evaluate(()=>PA_DEFIS.defi(PA_DEFIS.lundi(new Date()),4).exercice.titre),'défi au niveau d’exercice 4');
    assert.match(await page.textContent('#esp-bloc-defi .note'),/niveau déclaré dans Mon académie/);
   }
   await ctx.close();
  }
  ok('Edge : parcours vide puis au niveau 5, compétence manquée en tête, priorités (3 au plus), exercice fait, défi partagé ; Mon espace suit le niveau déclaré et les quiz ; 1280 / 390 / 320 px');
 }finally{await browser.close();}
 assert.deepEqual(erreurs,[]);
 ok('aucune erreur dans la console');
}

(async()=>{
 await horsNavigateur();
 await new Promise(r=>serveur.listen(0,'127.0.0.1',r));
 try{await dansLeNavigateur('http://127.0.0.1:'+serveur.address().port);}
 finally{serveur.close();}
 console.log(nb+' vérifications réussies.');
})().catch(e=>{console.error(e);process.exitCode=1;serveur.close();});
