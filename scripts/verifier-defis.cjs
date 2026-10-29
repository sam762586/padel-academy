/* Vérification du défi de la semaine (espace.html#esp-bloc-defi, assets/js/defis.js) :
   1) sous Node : semaines ISO (passages d'année, années de 53 semaines), cycle des 10 thèmes, même défi toute la
      semaine et nouveau défi le lundi, exercice au niveau du joueur, série (semaine en cours, semaine sautée) ;
   2) dans Edge (horloge fixée, comptes indisponibles : l'espace s'affiche avec les données de l'appareil) : défi affiché,
      relevé puis décoché, lien avec les exercices faits (ajouté seulement s'il ne l'était pas), série et 8 semaines,
      niveau du test, 390 et 320 px sans débordement, console sans erreur.
   Lancer depuis la racine du site : node scripts/verifier-defis.cjs */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),vm=require('node:vm');
const {chromium}=require('playwright');
const racine=path.join(__dirname,'..');
let nb=0;
function ok(nom){nb++;console.log('OK '+nom);}
const lire=f=>fs.readFileSync(path.join(racine,f),'utf8');

function horsNavigateur(){
 const ctx={window:{},document:{getElementById:()=>null},localStorage:{getItem:()=>null}};vm.createContext(ctx);
 vm.runInContext(lire('assets/js/exercices-donnees.js')+';'+lire('assets/js/defis.js')+';this.EX=EXERCICES;',ctx);
 const {lundi,semaine,defi,serie}=ctx.window.PA_DEFIS,THEMES=[...ctx.window.PA_DEFIS.THEMES],EX=ctx.EX; // copie : tableau d'un autre contexte vm
 const L=(a,m,j)=>lundi(new Date(a,m-1,j,12));
 // Semaines ISO, y compris en fin et début d'année
 [[2025,12,29,'2026-W01'],[2026,1,4,'2026-W01'],[2026,1,5,'2026-W02'],[2026,10,29,'2026-W44'],[2026,12,31,'2026-W53'],
  [2027,1,3,'2026-W53'],[2027,1,4,'2027-W01'],[2027,12,31,'2027-W52'],[2028,1,2,'2027-W52'],[2028,1,3,'2028-W01'],[2020,12,31,'2020-W53'],[2021,1,4,'2021-W01']]
  .forEach(([a,m,j,s])=>assert.equal(semaine(L(a,m,j)),s,a+'-'+m+'-'+j));
 // Même défi du lundi au dimanche, nouveau le lundi suivant ; cycle de 10 thèmes
 const lu=L(2026,10,26);
 for(let j=0;j<7;j++)assert.equal(lundi(new Date(2026,9,26+j,j===6?23:0)),lu,'jour '+j);
 assert.notEqual(lundi(new Date(2026,10,2,0,1)),lu);
 const vus=[];for(let k=0;k<20;k++)vus.push(defi(lu+k*7*86400000,2).theme);
 assert.deepEqual(vus.slice(0,10).slice().sort(),THEMES.slice().sort(),'10 thèmes en 10 semaines');
 assert.deepEqual(vus.slice(10),vus.slice(0,10),'cycle de 10 semaines');
 assert.equal(defi(L(2025,12,29),2).theme,THEMES[0],'le cycle commence en 2026-W01');
 assert.equal(defi(L(2025,12,22),2).theme,THEMES[9],'avant le début du cycle : thème précédent');
 // Exercice au niveau du joueur (chaque thème a un exercice pour chaque niveau)
 for(const t of THEMES)for(const n of [1,2,3,4]){
  const k=THEMES.indexOf(t),d=defi(L(2025,12,29)+k*7*86400000,n);
  assert.equal(d.theme,t);assert.ok(EX.includes(d.exercice)&&d.exercice.theme===t&&d.exercice.niveaux.includes(n),t+' niveau '+n);
 }
 // Série
 const s=(...w)=>Object.fromEntries(w.map(x=>[x,{}]));
 assert.equal(serie(s('2026-W44','2026-W43','2026-W42','2026-W40'),lu),3);
 assert.equal(serie(s('2026-W43','2026-W42'),lu),2,'semaine en cours pas encore relevée : la série tient');
 assert.equal(serie(s('2026-W42'),lu),0,'semaine sautée : série perdue');
 assert.equal(serie(s('2026-W53','2027-W01'),L(2027,1,4)),2,'série à cheval sur deux années');
 assert.equal(serie({},lu),0);
 ok('semaines ISO (fins d’année, années de 53 semaines), cycle de 10 thèmes, même défi toute la semaine, exercice au niveau, série');
}

const TYPES={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.webmanifest':'application/manifest+json'};
const serveur=http.createServer((req,res)=>{
 const rel=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\//,'')||'index.html';
 const p=path.resolve(racine,rel);
 if(!p.startsWith(racine+path.sep)){res.writeHead(403);res.end();return;}
 fs.readFile(p,(e,b)=>{if(e){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',TYPES[path.extname(p)]||'text/plain');res.end(b);});
});

async function dansLeNavigateur(base){
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const erreurs=[];
 try{
  for(const [largeur,hauteur] of [[1280,900],[390,844],[320,700]]){
   const ctx=await browser.newContext({serviceWorkers:'block',viewport:{width:largeur,height:hauteur}});
   await ctx.route(/^https:/,r=>r.fulfill({status:200,body:''})); // comptes indisponibles : espace sur l'appareil
   const page=await ctx.newPage();
   page.on('pageerror',e=>erreurs.push(e.message));page.on('console',m=>{if(m.type()==='error')erreurs.push(m.text());});
   await page.clock.setFixedTime(new Date('2026-10-29T10:00:00')); // jeudi de la semaine 2026-W44
   await page.goto(base+'/espace.html#esp-bloc-defi');
   const attendu=await page.evaluate(()=>PA_DEFIS.defi(PA_DEFIS.lundi(new Date()),2));
   assert.equal(attendu.semaine,'2026-W44');
   assert.equal(await page.textContent('#esp-defi h3'),attendu.exercice.titre);
   assert.equal(await page.textContent('.df-theme'),await page.evaluate(t=>PA_EXERCICES.LIBELLES[t],attendu.theme));
   assert.equal(await page.textContent('.df-echeance'),'Nouveau défi lundi, dans 4 jours');
   assert.match(await page.textContent('#esp-defi .ex-reussite'),new RegExp('Objectif : '));
   assert.equal(await page.locator('.df-pastille').count(),8);
   assert.match(await page.textContent('.df-serie'),/Pas encore de série/);
   // Relever le défi : la série démarre, l'exercice compte comme fait (aussi dans les exercices recommandés)
   await page.click('.df-releve');
   assert.equal(await page.getAttribute('.df-releve','aria-pressed'),'true');
   assert.match(await page.textContent('.df-releve'),/^Défi relevé le 29\/10\/2026$/);
   assert.equal(await page.textContent('.df-serie'),'Série : 1 semaine d\'affilée');
   assert.equal(await page.locator('.df-pastille.ok.encours').count(),1);
   let faits=await page.evaluate(()=>JSON.parse(localStorage.getItem('pa-exercices-faits')||'{}'));
   assert.ok(faits[attendu.exercice.id],'exercice compté comme fait');
   assert.equal(await page.evaluate(()=>document.activeElement.classList.contains('df-releve')),true,'le focus reste sur le bouton');
   // Décocher : l'exercice ajouté par le défi est retiré
   await page.click('.df-releve');
   faits=await page.evaluate(()=>JSON.parse(localStorage.getItem('pa-exercices-faits')||'{}'));
   assert.ok(!faits[attendu.exercice.id]);
   assert.equal(await page.evaluate(()=>localStorage.getItem('pa-defis')),'{}');
   // Exercice déjà fait avant le défi : décocher le défi ne l'efface pas
   await page.evaluate(id=>localStorage.setItem('pa-exercices-faits',JSON.stringify({[id]:'2026-10-01T10:00:00.000Z'})),attendu.exercice.id);
   await page.reload();
   await page.click('.df-releve');await page.click('.df-releve');
   faits=await page.evaluate(()=>JSON.parse(localStorage.getItem('pa-exercices-faits')||'{}'));
   assert.equal(faits[attendu.exercice.id],'2026-10-01T10:00:00.000Z');
   // Série de 3 semaines (la W40 isolée ne compte pas), niveau du dernier test de niveau
   await page.evaluate(()=>{localStorage.setItem('pa-defis',JSON.stringify({'2026-W43':{id:'x',date:'2026-10-20T10:00:00Z',fait:false},'2026-W42':{id:'x',date:'2026-10-13T10:00:00Z',fait:false},'2026-W40':{id:'x',date:'2026-09-30T10:00:00Z',fait:false}}));
    localStorage.setItem('pa-quiz-dernier',JSON.stringify({date:'2026-10-01T10:00:00Z',niveau:4,reponses:[]}));});
   await page.reload();
   assert.equal(await page.textContent('.df-serie'),'Série : 2 semaines d\'affilée');
   assert.equal(await page.locator('.df-pastille.ok').count(),3);
   const n4=await page.evaluate(()=>PA_DEFIS.defi(PA_DEFIS.lundi(new Date()),4).exercice.titre);
   assert.equal(await page.textContent('#esp-defi h3'),n4,'exercice du niveau 4');
   await page.click('.df-releve');
   assert.equal(await page.textContent('.df-serie'),'Série : 3 semaines d\'affilée');
   // Données abîmées : ignorées
   await page.evaluate(()=>localStorage.setItem('pa-defis','[1,2]'));
   await page.reload();
   assert.match(await page.textContent('.df-serie'),/Pas encore de série/);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,largeur+' px : pas de débordement');
   await ctx.close();
  }
  // Dimanche soir : nouveau défi demain
  const ctx=await browser.newContext({serviceWorkers:'block'});
  await ctx.route(/^https:/,r=>r.fulfill({status:200,body:''}));
  const page=await ctx.newPage();
  await page.clock.setFixedTime(new Date('2026-11-01T22:00:00'));
  await page.goto(base+'/espace.html');
  assert.equal(await page.textContent('.df-echeance'),'Nouveau défi demain, lundi');
  await ctx.close();
  ok('défi affiché, relevé et décoché, exercices faits (sans effacer un exercice déjà fait), série et 8 semaines, niveau du test, données abîmées ignorées, 1280 / 390 / 320 px');
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
