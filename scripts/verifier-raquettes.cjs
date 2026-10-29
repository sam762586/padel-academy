/* Vérification du sélecteur de raquettes (materiel.html, assets/js/raquettes.js) :
   1) données : champs valides, années, aucun doublon, chaque marque a au moins 1 modèle, matrice forme × niveau couverte ;
   2) navigateur : marques générées depuis la base, filtre strict par marque, résumé, « Toutes les marques »,
      message quand aucune raquette d'une marque ne correspond, « Voir les suivantes », aucun débordement à 390 px.
   Lancer depuis la racine du site : node scripts/verifier-raquettes.cjs */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),vm=require('node:vm');
const {chromium}=require('playwright');
const racine=path.join(__dirname,'..');
let nb=0;
function ok(nom){nb++;console.log('OK '+nom);}
process.on('unhandledRejection',e=>{if(e&&e.name==='TargetClosedError')return;console.error(e);process.exitCode=1;});

const src=fs.readFileSync(path.join(racine,'assets/js/raquettes.js'),'utf8');
const bac={};vm.runInNewContext(src.slice(0,src.indexOf('const STYLE_T'))+';this.R=JSON.parse(JSON.stringify(RACKETS));',bac);
const R=bac.R;
R.forEach(r=>{
 const id=r.marque+' '+r.modele;
 assert.ok(r.marque&&/\((2024|2025|2026)\)$/.test(r.modele),id);
 assert.ok(['ronde','goutte','diamant'].includes(r.forme)&&['bas','moyen','haut'].includes(r.balance),id);
 assert.match(r.poids,/^\d{3}-\d{3}$/,id);
 assert.ok([1,2,3].includes(r.niveau)&&['mixte','femme'].includes(r.genre),id);
 ['controle','puissance','confort'].forEach(k=>assert.ok(Number.isInteger(r[k])&&r[k]>=1&&r[k]<=5,id+' '+k));
 assert.ok(Number.isInteger(r.prix)&&r.prix>=25&&r.prix<=600,id+' prix');
 assert.ok(r.desc.length>=30,id+' desc');
});
const cle=r=>(r.marque+' '+r.modele).toLowerCase();
assert.equal(new Set(R.map(cle)).size,R.length,'doublon');
assert.ok(R.length>=150);
['ronde','goutte','diamant'].forEach(f=>[1,2,3].forEach(n=>assert.ok(R.some(r=>r.forme===f&&r.niveau===n),f+' niveau '+n)));
const MARQUES=[...new Set(R.map(r=>r.marque))];
assert.ok(MARQUES.length>=15);
ok('données : '+R.length+' raquettes, '+MARQUES.length+' marques, champs valides, sans doublon, chaque forme à chaque niveau');

const serveur=http.createServer((req,res)=>{
 const rel=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\//,'')||'index.html';
 const p=path.resolve(racine,rel);
 if(!p.startsWith(racine+path.sep)){res.writeHead(403);res.end();return;}
 fs.readFile(p,(e,b)=>{if(e){res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.webp':'image/webp','.webmanifest':'application/manifest+json'})[path.extname(p)]||'text/plain');res.end(b);
 });
});
(async()=>{
 await new Promise(r=>serveur.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+serveur.address().port;
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const erreurs=[];
 try{
  const ctx=await browser.newContext({serviceWorkers:'block',viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await ctx.route(/^https:/,r=>r.fulfill({body:''}));
  await ctx.route('**/assets/vendor/supabase-*.js*',r=>r.fulfill({contentType:'text/javascript',body:''})); // comptes indisponibles : le SDK (sur le site) est bloqué aussi
  const page=await ctx.newPage();
  page.on('pageerror',e=>erreurs.push(e.message));page.on('console',m=>{if(m.type()==='error')erreurs.push(m.text());});
  await page.goto(base+'/materiel.html');
  assert.equal(await page.locator('#marques input').count(),MARQUES.length);
  assert.equal(await page.textContent('#marques-resume'),'Toutes les marques');
  assert.match(await page.textContent('#res-count'),new RegExp('sur '+R.length+'$'));
  ok('marques générées depuis la base, aucune cochée au départ');
  // Filtre : Nox seulement
  await page.click('#marques-resume');
  await page.locator('#marques label',{hasText:/^Nox/}).click();
  assert.equal(await page.textContent('#marques-resume'),'Nox');
  const marquesAffichees=await page.locator('#results .brand-l').allTextContents();
  assert.ok(marquesAffichees.length>0&&marquesAffichees.every(m=>m==='Nox'),marquesAffichees.join(','));
  assert.match(await page.textContent('#res-count'),new RegExp('sur '+R.filter(r=>r.marque==='Nox').length+' \\(Nox\\)'));
  // Deux marques : seulement ces deux-là, y compris dans « les suivantes »
  await page.locator('#marques label',{hasText:/^Head/}).click();
  assert.equal(await page.textContent('#marques-resume'),'Head, Nox');
  const toutes=[...await page.locator('#results .brand-l').allTextContents(),...await page.locator('.rk-plus li b').allTextContents()];
  assert.ok(toutes.every(m=>m==='Nox'||m==='Head'),toutes.join(','));
  ok('filtre strict par marque, résumé et compteur à jour, y compris dans les suivantes');
  // « Voir les suivantes »
  await page.click('.rk-plus summary');
  assert.ok(await page.locator('.rk-plus li').count()>=1);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),390);
  ok('« Voir les suivantes » et aucun débordement à 390 px');
  // Budget minimal avec une seule marque haut de gamme : message dédié, puis retour à toutes les marques
  await page.locator('#marques label',{hasText:/^Head/}).click();await page.locator('#marques label',{hasText:/^Nox/}).click();
  const chere=MARQUES.find(m=>R.filter(r=>r.marque===m).every(r=>r.prix>60));
  await page.locator('#marques label',{hasText:new RegExp('^'+chere)}).click();
  await page.locator('#budget').evaluate(e=>{e.value='50';e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));});
  assert.match(await page.textContent('#results .empty'),new RegExp('Aucune raquette '+chere));
  await page.click('#toutes-marques');
  assert.equal(await page.textContent('#marques-resume'),'Toutes les marques');
  assert.equal(await page.locator('#marques input:checked').count(),0);
  ok('aucune raquette de la marque dans le budget : message, puis « toutes les marques »');
  assert.deepEqual(erreurs,[]);
  ok('aucune erreur console');
  console.log('TOTAL '+nb+' contrôles réussis.');
 }finally{await browser.close();serveur.close();}
})().catch(e=>{console.error(e);serveur.close();process.exitCode=1;});
