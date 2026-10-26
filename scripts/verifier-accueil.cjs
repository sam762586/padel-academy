/* Vérification du branchement des pages tournois (T3) : bloc « Cette semaine près de chez toi » de l'accueil,
   liens des cartes de tournois.html vers les fiches, département mémorisé. Edge, 390 px.
   Lancer depuis la racine du site : node scripts/verifier-accueil.cjs */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const racine=path.join(__dirname,'..');
let nb=0;
function ok(nom){nb++;console.log('OK '+nom);}
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
  const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await ctx.route('https://gc.zgo.at/**',r=>r.fulfill({contentType:'text/javascript',body:''}));
  await ctx.route('**/supabase-js@*/**',r=>r.fulfill({contentType:'text/javascript',body:''}));
  await ctx.route('https://data.geopf.fr/**',r=>r.abort());
  const page=await ctx.newPage();
  page.on('pageerror',e=>erreurs.push(e.message));
  page.on('console',m=>{if(m.type()==='error')erreurs.push(m.text());});
  page.on('response',r=>{if(r.status()>=400&&r.url().startsWith(base))erreurs.push(r.status()+' '+r.url());});
  await page.goto(base+'/index.html');
  await page.waitForFunction(()=>document.querySelectorAll('#pres-de-chez-toi .pdt-carte path').length>90);
  assert.ok(await page.isVisible('#pdt-dep'));
  assert.match(await page.textContent('#pdt-titre'),/Tes prochains tournois/);
  ok('accueil sans département : carte de France cliquable et liste déroulante');
  await page.selectOption('#pdt-dep','76');
  await page.waitForSelector('#pres-de-chez-toi .pdt-liste li');
  const n=await page.locator('#pres-de-chez-toi .pdt-liste li').count();
  assert.ok(n>=1&&n<=5);
  const href=await page.locator('#pres-de-chez-toi .pdt-liste a').first().getAttribute('href');
  assert.match(href,/^tournoi\/\d+\.html$/);assert.ok(fs.existsSync(path.join(racine,href)),'fiche existante');
  assert.equal(await page.getAttribute('#pres-de-chez-toi .btns a','href'),'tournois/76.html');
  assert.equal(await page.evaluate(()=>localStorage.getItem('pa-mon-departement')),'76');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),390);
  ok('choix du département : 5 tournois au plus, liens vers les fiches, département mémorisé');
  await page.reload();
  await page.waitForSelector('#pres-de-chez-toi .pdt-liste li');
  assert.match(await page.textContent('#pdt-titre'),/Cette semaine près de chez toi/);
  ok('retour sur l\'accueil : département retenu');
  // Département sans pages générées : lien vers Ten'Up et vers la liste nationale
  await page.click('.pdt-changer');await page.selectOption('#pdt-dep','33');
  await page.waitForFunction(()=>document.querySelector('#pres-de-chez-toi .pdt-aide b')&&/Gironde/.test(document.querySelector('#pres-de-chez-toi .pdt-aide b').textContent));
  await page.waitForSelector('#pres-de-chez-toi .pdt-liste li');
  assert.match(await page.locator('#pres-de-chez-toi .pdt-liste a').first().getAttribute('href'),/^https:\/\/tenup\.fft\.fr\/tournoi\//);
  assert.equal(await page.getAttribute('#pres-de-chez-toi .btns a','href'),'tournois.html');
  ok('département sans fiches : liens Ten\'Up et liste nationale');
  // Page Tournois : cartes reliées aux fiches des départements publiés
  await page.goto(base+'/tournois.html');
  await page.waitForSelector('#tournois-liste .tcard');
  const infos=await page.evaluate(()=>{
   const pubs=new Set(window.PA_PAGES_TOURNOIS.departements);
   return [...document.querySelectorAll('#tournois-liste .tcard')].map(c=>({lien:c.querySelector('a.tcard-lien')?.getAttribute('href')||null,dep:(c.querySelector('.tlieu')?.textContent.match(/\(([0-9AB]{2,3})\)/)||[])[1],pub:null})).map(x=>({...x,pub:pubs.has(x.dep)}));
  });
  assert.ok(infos.some(x=>x.pub)&&infos.some(x=>!x.pub),'la première page mélange départements publiés et non publiés');
  infos.forEach(x=>{if(x.pub)assert.match(x.lien,/^tournoi\/\d+\.html$/);else assert.equal(x.lien,null);});
  ok('tournois.html : titre relié à la fiche pour les départements publiés seulement');
  await page.click('label.tchip:has(input[value=dep])');
  await page.selectOption('#zone-dep','14');
  await page.waitForFunction(()=>localStorage.getItem('pa-mon-departement')==='14');
  ok('tournois.html : département choisi mémorisé pour l\'accueil');
  assert.deepEqual(erreurs,[]);
  ok('aucune erreur console ni ressource manquante');
  console.log('TOTAL '+nb+' contrôles réussis.');
 }finally{await browser.close();serveur.close();}
})().catch(e=>{console.error(e);serveur.close();process.exitCode=1;});
