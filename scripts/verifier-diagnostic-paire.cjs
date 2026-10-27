/* Vérification du diagnostic de paire (tactique.html#diagnostic-paire, assets/js/diagnostic-paire.js) :
   1) sous Node : toutes les combinaisons de réponses (côtés distincts, 1 à 3 priorités, chacune avec un exercice
      existant au bon niveau, liens vers des ancres qui existent), règles tirées du site (phrases sources toujours
      présentes), cas typiques, réponses invalides refusées ;
   2) dans Edge : formulaire, diagnostic, avertissement, réponses gardées et diagnostic réaffiché après rechargement,
      1280 / 390 / 320 px sans débordement, console sans erreur.
   Lancer depuis la racine du site : node scripts/verifier-diagnostic-paire.cjs */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),vm=require('node:vm');
const {chromium}=require('playwright');
const racine=path.join(__dirname,'..');
let nb=0;
function ok(nom){nb++;console.log('OK '+nom);}
const lire=f=>fs.readFileSync(path.join(racine,f),'utf8');
// Un lien interne « page.html#ancre » doit mener à une ancre qui existe
const lienValide=l=>{const [page,ancre]=l.split('#');if(!fs.existsSync(path.join(racine,page)))return false;return !ancre||new RegExp('id="'+ancre+'"').test(lire(page));};

function horsNavigateur(){
 const ctx={window:{},document:{getElementById:()=>null},localStorage:{getItem:()=>null}};vm.createContext(ctx);
 vm.runInContext(lire('assets/js/exercices-donnees.js')+';'+lire('assets/js/diagnostic-paire.js')+';this.EX=EXERCICES;',ctx);
 const {diagnostic,valide,DEFAUT}=ctx.window.PA_DIAGNOSTIC_PAIRE,EX=ctx.EX;
 // Les règles reprennent ces phrases du site : si l'une disparaît, le diagnostic est à revoir
 const sources=[['tactique.html','le gaucher y est redoutable'],['tactique.html','Le « régulateur »'],['tactique.html','Le « finisseur »'],
  ['tutos.html','Par défaut, le coup droit au centre'],['tutos.html','Celui qui l\'annonce le premier'],
  ['tactique.html','leurs deux revers sont au centre'],['tactique.html','leurs deux coups droits sont au centre'],
  ['tactique.html','L\'adversaire va jouer sur le moins fort des deux'],['tactique.html','un côté vide coûte plus cher qu\'une balle moyenne']];
 const espaces=t=>t.replace(/[  ]|&nbsp;/g,' ').replace(/\s+/g,' '); // espaces insécables de la typographie française
 sources.forEach(([f,t])=>assert.ok(espaces(lire(f).replace(/<[^>]+>/g,'')).includes(t),f+' : « '+t+' » introuvable'));
 ['tutos.html#pair','tactique.html#communication','espace.html#esp-bloc-exercices'].forEach(l=>assert.ok(lienValide(l),l));
 // Toutes les combinaisons
 let n=0;
 for(const m0 of ['droitier','gaucher'])for(const m1 of ['droitier','gaucher'])for(const c0 of ['droite','gauche','egal'])for(const c1 of ['droite','gauche','egal'])
 for(const h0 of [1,2,3])for(const h1 of [1,2,3])for(const d0 of [1,2,3])for(const d1 of [1,2,3])for(const v0 of [1,2,3])for(const v1 of [1,2,3])
 for(const ex of ['egal','toi','partenaire'])for(const niv of [1,2,3,4]){
  const r={joueurs:[{main:m0,cote:c0,haut:h0,defense:d0,volee:v0},{main:m1,cote:c1,haut:h1,defense:d1,volee:v1}],experience:ex,niveau:niv};
  assert.ok(valide(r));
  const d=diagnostic(r);n++;
  assert.ok([0,1].includes(d.gauche)&&d.droite===1-d.gauche);
  assert.ok(d.cotes.length>=2&&d.centre.length===2);
  assert.equal(d.roles.length,ex==='egal'?0:2);
  assert.ok(d.priorites.length>=1&&d.priorites.length<=3);
  assert.equal(new Set(d.priorites.map(p=>p.theme)).size,d.priorites.length,'priorité en double');
  d.priorites.forEach(p=>{
   assert.ok(p.exercice&&EX.includes(p.exercice)&&p.exercice.theme===p.theme,'exercice existant');
   if(EX.some(e=>e.theme===p.theme&&e.niveaux.includes(niv)))assert.ok(p.exercice.niveaux.includes(niv),'exercice au niveau de la paire');
  });
  // Le plus à l'aise dans les balles hautes joue à gauche
  if(h0!==h1)assert.equal(d.gauche,h0>h1?0:1);
 }
 assert.equal(n,2*2*3*3*3*3*3*3*3*3*3*4);
 EX.filter(e=>e.lien).forEach(e=>assert.ok(lienValide(e.lien),e.id+' : '+e.lien));
 ok(n+' combinaisons : côtés distincts, rôles si niveaux différents, 1 à 3 priorités avec un exercice existant au bon niveau ; liens et phrases sources du site présents');
 // Cas typiques
 const base=()=>JSON.parse(JSON.stringify(DEFAUT));
 let r=base(),d=diagnostic(r);
 assert.equal(d.egalite,false);assert.equal(d.gauche,1,'même jeu : le côté habituel départage');
 { const e=base();e.joueurs.forEach(j=>{j.cote='egal';});const de=diagnostic(e);assert.equal(de.egalite,true);assert.match(de.cotes[0],/les deux répartitions se valent/); }
 assert.match(d.centre[0],/^Deux droitiers : la balle au centre est pour ton partenaire, à gauche, en coup droit\.$/);
 r=base();r.joueurs[0].main='gaucher';r.joueurs[0].cote='egal';r.joueurs[1].cote='egal';d=diagnostic(r);
 assert.equal(d.gauche,0,'à égalité de jeu, le gaucher à gauche');assert.match(d.centre[0],/vos deux revers sont au centre/);
 r=base();r.experience='toi';d=diagnostic(r);
 assert.equal(d.gauche,0,'le plus expérimenté à gauche');assert.match(d.roles[0],/^L'adversaire va jouer sur ton partenaire\./);
 r=base();r.joueurs[1].defense=1;r.joueurs[0].defense=1;d=diagnostic(r);
 assert.equal(d.priorites[0].theme,'vitre','défense faible : sorties de vitre d’abord');
 r=base();r.joueurs.forEach(j=>{j.main='gaucher';});d=diagnostic(r);
 assert.match(d.centre[0],/^Deux gauchers : la balle au centre est pour toi, à droite, en coup droit\.$/);
 [x=>{x.joueurs.pop();},x=>{x.joueurs[0].haut=4;},x=>{x.experience='moi';},x=>{x.niveau=0;},x=>{x.joueurs[1].main='ambidextre';}].forEach(f=>{const x=base();f(x);assert.equal(valide(x),false);});
 assert.equal(valide(null),false);
 ok('cas typiques (égalité, gaucher, plus expérimenté, défense faible, deux gauchers) et réponses invalides refusées');
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
   await ctx.route('https://**',r=>r.fulfill({status:200,body:''}));
   const page=await ctx.newPage();
   page.on('pageerror',e=>erreurs.push(e.message));page.on('console',m=>{if(m.type()==='error')erreurs.push(m.text());});
   await page.goto(base+'/tactique.html#diagnostic-paire');
   assert.equal(await page.locator('#dp-form select').count(),12);
   assert.equal(await page.textContent('#dp-resultat'),'','pas de diagnostic avant de répondre');
   await page.selectOption('#dp-main-1','gaucher');
   await page.selectOption('#dp-haut-0','3');
   await page.selectOption('#dp-defense-1','1');
   await page.selectOption('#dp-experience','toi');
   await page.selectOption('#dp-niveau','3');
   await page.click('#dp-form button[type=submit]');
   const attendu=await page.evaluate(()=>PA_DIAGNOSTIC_PAIRE.diagnostic({joueurs:[{main:'droitier',cote:'droite',haut:3,defense:2,volee:2},{main:'gaucher',cote:'gauche',haut:2,defense:1,volee:2}],experience:'toi',niveau:3}));
   const blocs=await page.$$eval('#dp-resultat .bloc ul',u=>u.map(x=>[...x.querySelectorAll('li')].map(l=>l.textContent)));
   assert.deepEqual(blocs,[attendu.cotes,attendu.centre,attendu.roles]);
   assert.equal(attendu.gauche,0,'Toi à gauche (balles hautes, expérience)');
   const prios=await page.$$eval('.dp-priorites li',l=>l.map(x=>x.textContent));
   assert.equal(prios.length,attendu.priorites.length);
   attendu.priorites.forEach((p,i)=>assert.ok(prios[i].includes(p.texte)&&prios[i].includes('« '+p.exercice.titre+' »')));
   assert.match(await page.textContent('.dp-avertissement'),/pas l'avis d'un professionnel/);
   assert.equal(await page.evaluate(()=>document.activeElement.id),'dp-resultat');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,largeur+' px : pas de débordement');
   // Rechargement : réponses et diagnostic retrouvés
   await page.reload();
   assert.equal(await page.inputValue('#dp-main-1'),'gaucher');
   assert.equal(await page.inputValue('#dp-niveau'),'3');
   assert.equal(await page.locator('.dp-priorites li').count(),attendu.priorites.length);
   // Réponses abîmées sur l'appareil : formulaire par défaut, sans erreur
   await page.evaluate(()=>localStorage.setItem('pa-diagnostic-paire','{"joueurs":"x"}'));
   await page.reload();
   assert.equal(await page.inputValue('#dp-main-1'),'droitier');
   assert.equal(await page.textContent('#dp-resultat'),'');
   await ctx.close();
  }
  ok('formulaire, diagnostic identique aux règles, avertissement, réponses gardées, données abîmées ignorées, 1280 / 390 / 320 px sans débordement');
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
