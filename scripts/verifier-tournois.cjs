/* Vérification du chargement des tournois (tournois.html, assets/js/tournois.js) et du bloc de l'accueil
   (assets/js/accueil-tournois.js), avec des données de test isolées (interceptées, les vraies ne sont pas touchées) :
   chargement visible, liste valide, liste vide (vraie absence), erreur HTTP, JSON invalide, connexion coupée, délai,
   « Réessayer », repli sur la copie .js, filtres catégorie et département, mobile, rechargement, accueil.
   Lancer depuis la racine du site : node scripts/verifier-tournois.cjs */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const racine=path.join(__dirname,'..');
let nb=0;
function ok(nom){nb++;console.log('OK '+nom);}
process.on('unhandledRejection',e=>{if(e&&e.name==='TargetClosedError')return;console.error(e);process.exitCode=1;});

// Données de test : dates calculées à partir d'aujourd'hui pour rester « à venir »
const jour=n=>{const d=new Date();d.setDate(d.getDate()+n);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
const t=(id,dep,cat,ville,n)=>({id:String(id),nom:'Tournoi test '+id,categorie:cat,club:'CLUB '+id,ville,cp:dep+'000',dep,lat:49.4,lng:1.1,date_debut:jour(n),date_fin:jour(n),sexes:['messieurs']});
const DONNEES={genere_le:new Date().toISOString(),source:'Ten\'Up (FFT)',periode:{du:jour(0),au:jour(90)},
 tournois:[t(900001,'76','P100','ROUEN',3),t(900002,'76','P25','LE HAVRE',5),t(900003,'27','P100','EVREUX',8),t(900004,'13','P250','MARSEILLE',10)]};
const JSON_OK=JSON.stringify(DONNEES);

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
 // reponse(n) : comportement du n-ième appel à tournois.json ; repli : comportement de la copie tournois.js
 const ouvrir=async({reponse,repli='echec',page:url='/tournois.html',mobile=true})=>{
  const ctx=await browser.newContext({serviceWorkers:'block',viewport:mobile?{width:390,height:844}:{width:1280,height:800},isMobile:mobile,hasTouch:mobile});
  await ctx.route('**/supabase-js@*/**',r=>r.fulfill({contentType:'text/javascript',body:''}));
  await ctx.route(/^https:/,r=>r.fulfill({body:''}));
  let n=0;
  await ctx.route('**/assets/data/tournois.json*',async r=>{n++;await reponse(r,n);});
  await ctx.route(/\/assets\/data\/tournois\.js(\?|$)/,r=>repli==='ok'?r.fulfill({contentType:'text/javascript',body:'window.TOURNOIS_DATA='+JSON_OK+';'}):r.abort('connectionrefused'));
  const page=await ctx.newPage();
  page.on('pageerror',e=>erreurs.push(e.message));
  page.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource|net::ERR/.test(m.text()))erreurs.push(m.text());});
  await page.goto(base+url);
  return {ctx,page,appels:()=>n};
 };
 const visibles=page=>page.evaluate(()=>['tournois-chargement','tournois-erreur','tournois-vide','tournois-contenu'].filter(id=>!document.getElementById(id).hidden));
 const okJson=r=>r.fulfill({contentType:'application/json',body:JSON_OK});
 try{
  // 1. Chargement visible, puis liste valide
  let {ctx,page}=await ouvrir({reponse:async r=>{await new Promise(x=>setTimeout(x,700));await okJson(r);}});
  assert.deepEqual(await visibles(page),['tournois-chargement']);
  assert.match(await page.textContent('#tournois-chargement'),/Chargement des tournois/);
  await page.waitForSelector('#tournois-contenu:not([hidden])');
  assert.deepEqual(await visibles(page),['tournois-contenu']);
  assert.equal(await page.locator('#tournois-liste article').count(),4);
  assert.match(await page.textContent('#tournois-maj'),/Mis à jour le/);
  ok('chargement visible, puis 4 tournois et la date de mise à jour');
  // 2. Filtres : catégorie P100, puis département 76
  await page.click('#filtre-categories label:has-text("P100")');
  await page.waitForFunction(()=>document.querySelectorAll('#tournois-liste article').length===2);
  await page.click('label:has(input[name=zone-mode][value=dep])');
  await page.selectOption('#zone-dep','76');
  await page.waitForFunction(()=>document.querySelectorAll('#tournois-liste article').length===1);
  assert.match(await page.textContent('#tournois-liste article'),/ROUEN/);
  // Aucun résultat pour ces filtres : message propre, pas l'erreur
  await page.fill('#filtre-texte','introuvable');
  await page.waitForFunction(()=>!document.getElementById('tournois-aucun').hidden);
  assert.deepEqual(await visibles(page),['tournois-contenu']);
  ok('filtres catégorie et département ; « aucun résultat » distinct de l\'erreur');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),390);
  // 3. Rechargement : filtres gardés, données rechargées
  await page.fill('#filtre-texte','');
  await page.waitForFunction(()=>document.querySelectorAll('#tournois-liste article').length===1);
  await page.waitForTimeout(400);
  await page.reload();
  await page.waitForSelector('#tournois-contenu:not([hidden])');
  assert.equal(await page.locator('#tournois-liste article').count(),1);
  assert.equal(await page.inputValue('#zone-dep'),'76');
  ok('mobile sans débordement ; après actualisation, filtres conservés et liste rechargée');
  await ctx.close();
  // 4. Réponse valide mais vide : vraie absence
  ({ctx,page}=await ouvrir({reponse:r=>r.fulfill({contentType:'application/json',body:JSON.stringify({...DONNEES,tournois:[]})})}));
  await page.waitForSelector('#tournois-vide:not([hidden])');
  assert.deepEqual(await visibles(page),['tournois-vide']);
  assert.match(await page.textContent('#tournois-vide'),/Aucun tournoi n'est annoncé/);
  await ctx.close();
  ok('liste vide : « aucun tournoi annoncé », sans message d\'erreur');
  // 5. Erreurs : HTTP 500, JSON invalide, connexion coupée — jamais présentées comme une absence de tournois
  for(const [nom,reponse,attendu] of [
   ['HTTP 500',r=>r.fulfill({status:500,body:'erreur'}),/serveur/],
   ['JSON invalide',r=>r.fulfill({contentType:'application/json',body:'{"tournois":[ tronqué'}),/illisible/],
   ['connexion coupée',r=>r.abort('internetdisconnected'),/connexion/]]){
   ({ctx,page}=await ouvrir({reponse}));
   await page.waitForSelector('#tournois-erreur:not([hidden])');
   assert.deepEqual(await visibles(page),['tournois-erreur'],nom);
   const texte=await page.textContent('#tournois-erreur');
   assert.match(texte,attendu,nom);assert.match(texte,/Ce n'est pas une absence de tournois/);
   assert.ok(!/Aucun tournoi n'est annoncé/.test(await page.evaluate(()=>[...document.querySelectorAll('#tournois-app :not([hidden])>p')].map(p=>p.textContent).join(' '))),nom);
   await ctx.close();
  }
  ok('HTTP 500, JSON invalide, connexion coupée : état « indisponible » avec le bon message');
  // 6. « Réessayer » : 1er appel en échec, 2e réussi
  let appels;
  ({ctx,page,appels}=await ouvrir({reponse:async(r,n)=>n===1?r.abort('internetdisconnected'):okJson(r)}));
  await page.waitForSelector('#tournois-erreur:not([hidden])');
  await page.click('#tournois-reessayer');
  await page.waitForSelector('#tournois-contenu:not([hidden])');
  assert.equal(appels(),2);assert.equal(await page.locator('#tournois-liste article').count(),4);
  assert.deepEqual(await visibles(page),['tournois-contenu']);
  await ctx.close();
  ok('« Réessayer » relance le chargement et affiche la liste');
  // 7. Repli sur la copie .js quand le .json est illisible
  ({ctx,page}=await ouvrir({reponse:r=>r.fulfill({contentType:'application/json',body:'pas du json'}),repli:'ok'}));
  await page.waitForSelector('#tournois-contenu:not([hidden])');
  assert.equal(await page.locator('#tournois-liste article').count(),4);
  await ctx.close();
  ok('JSON illisible mais copie .js disponible : la liste s\'affiche');
  // 8. Ordinateur : liste valide
  ({ctx,page}=await ouvrir({reponse:okJson,mobile:false}));
  await page.waitForSelector('#tournois-contenu:not([hidden])');
  assert.equal(await page.locator('#tournois-liste article').count(),4);
  await ctx.close();
  ok('ordinateur : liste affichée');
  // 9. Accueil, bloc « près de chez toi » : erreur puis « Réessayer », et vraie absence
  for(const cas of ['erreur','vide']){
   const c2=await browser.newContext({serviceWorkers:'block',viewport:{width:390,height:844},isMobile:true});
   await c2.route(/^https:/,r=>r.fulfill({body:''}));
   let n=0;
   await c2.route('**/assets/data/prochains/76.json*',r=>{n++;
    if(cas==='erreur'&&n===1)return r.fulfill({status:503,body:''});
    return r.fulfill({contentType:'application/json',body:JSON.stringify({tournois:cas==='vide'?[]:[{...DONNEES.tournois[0],page:false}]})});});
   const p2=await c2.newPage();
   p2.on('pageerror',e=>erreurs.push(e.message));
   await p2.goto(base+'/index.html');await p2.evaluate(()=>localStorage.setItem('pa-mon-departement','76'));await p2.reload();
   if(cas==='erreur'){
    await p2.waitForSelector('#pdt-contenu .acc-err');
    assert.match(await p2.textContent('#pdt-contenu'),/n'a pas pu être chargée/);
    await p2.click('#pdt-contenu .acc-err button');
    await p2.waitForSelector('#pdt-contenu .pdt-liste li');
    assert.equal(n,2);
   }else{
    await p2.waitForFunction(()=>/Aucun tournoi annoncé/.test(document.getElementById('pdt-contenu').textContent));
    assert.equal(await p2.locator('#pdt-contenu .acc-err').count(),0);
   }
   await c2.close();
  }
  ok('accueil : erreur avec « Réessayer », vraie absence sans message d\'erreur');
  assert.deepEqual(erreurs,[]);
  ok('aucune erreur JavaScript non gérée');
  console.log('TOTAL '+nb+' contrôles réussis.');
 }finally{await browser.close();serveur.close();}
})().catch(e=>{console.error(e);serveur.close();process.exitCode=1;});
