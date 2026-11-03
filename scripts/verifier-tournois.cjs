/* Vérification du chargement des tournois (tournois.html, assets/js/tournois.js) et du bloc de l'accueil
   (assets/js/accueil-tournois.js), avec des données de test isolées (interceptées, les vraies ne sont pas touchées) :
   chargement visible, liste valide, liste vide (vraie absence), erreur HTTP, JSON invalide, connexion coupée, délai,
   « Réessayer », repli sur la copie .js, filtres catégorie et département, mobile, rechargement, accueil,
   tournois terminés depuis la collecte hebdomadaire retirés (liste, carte, pages département), favoris passés gardés.
   Entrée légère (aperçu, index du département, fichier national seulement quand il le faut) : requêtes comptées,
   « Voir plus » sans recréer les cartes, filtres pendant le chargement, échec du national, hors connexion, fiches à la demande,
   URL ?v=, poids à l'entrée avec les vraies données, ouverture en file://.
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

// 0. Fichiers générés (index par département, aperçu, empreintes) : contrôle statique, sans navigateur
function verifierGeneres(){
 const crypto=require('node:crypto');
 const lire=r=>fs.readFileSync(path.join(racine,r));
 const sha10=b=>crypto.createHash('sha256').update(b).digest('hex').slice(0,10);
 const nat=JSON.parse(lire('assets/data/tournois.json'));
 const pages=new Function('window',lire('assets/data/pages-tournois.js').toString()+';return window.PA_PAGES_TOURNOIS;')({});
 const codes=Object.keys(pages.noms).sort();
 assert.equal(codes.length,101,"101 départements dans PA_PAGES_TOURNOIS.noms");
 const emp=pages.empreintes;
 assert.ok(emp&&emp.national&&emp.apercu&&emp.index,'empreintes dans pages-tournois.js');
 const fichiers=fs.readdirSync(path.join(racine,'assets/data/index'));
 assert.equal(fichiers.filter(x=>x.endsWith('.json')).length,102,'101 fichiers index json + hors-dep');
 assert.equal(fichiers.filter(x=>x.endsWith('.js')).length,102,'101 copies index js + hors-dep');
 const union=[];
 for(const dep of [...codes,'hors-dep']){
  const buf=lire('assets/data/index/'+dep+'.json'),i=JSON.parse(buf);
  assert.equal(i.dep,dep==='hors-dep'?'':dep);assert.equal(i.genere_le,nat.genere_le);assert.equal(i.source,nat.source);assert.deepEqual(i.periode,nat.periode);
  assert.ok(i.tournois.every(x=>dep==='hors-dep'?!codes.includes(x.dep):x.dep===dep),'index '+dep+' : un seul département');
  assert.equal(emp.index[dep],sha10(buf),'empreinte index '+dep);
  assert.ok(lire("assets/data/index/"+dep+".js").toString().includes("[\""+dep+"\"]={"));
  union.push(...i.tournois);
 }
 assert.equal(union.length,nat.tournois.length,'union des index = même nombre que tournois.json');
 const cle=x=>JSON.stringify(x);
 assert.deepEqual(union.map(cle).sort(),nat.tournois.map(cle).sort(),'union des index = entrées de tournois.json');
 ok('index par département : 101 fichiers, union identique à tournois.json ('+union.length+' tournois), empreintes exactes');
 assert.equal(emp.national,sha10(lire('assets/data/tournois.json')),'empreinte nationale');
 const bufA=lire('assets/data/tournois-apercu.json'),a=JSON.parse(bufA);
 assert.equal(emp.apercu,sha10(bufA));assert.equal(a.apercu,true);
 assert.ok(bufA.length<100*1024,'aperçu < 100 Ko ('+bufA.length+' octets)');
 assert.ok(a.tournois.length<=100);
 for(let k=1;k<a.tournois.length;k++){const p=a.tournois[k-1],q=a.tournois[k];assert.ok(p.date_debut<q.date_debut||(p.date_debut===q.date_debut&&String(p.nom).localeCompare(String(q.nom))<=0),'aperçu trié');}
 const dateGen=a.genere_le;void dateGen;
 // Total et par département recalculés à la date de génération du fichier (jour de l'écriture, pas d'aujourd'hui)
 const jourFichier=new Date(fs.statSync(path.join(racine,'assets/data/tournois-apercu.json')).mtime);
 const iso=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
 const jours=[iso(jourFichier),iso(new Date()),iso(new Date(Date.now()-86400000))];
 const calc=j=>{const v=nat.tournois.filter(x=>(x.date_fin||x.date_debut)>=j);const pd={};v.forEach(x=>pd[x.dep]=(pd[x.dep]||0)+1);return {n:v.length,pd};};
 const bon=jours.map(calc).find(c=>c.n===a.total);
 assert.ok(bon,'total de l aperçu = tournois non terminés');
 assert.deepEqual(a.par_dep,Object.fromEntries(Object.keys(bon.pd).sort().map(d=>[d,bon.pd[d]])));
 assert.equal(Object.values(a.par_dep).reduce((x,y)=>x+y,0),a.total);
 assert.equal(typeof a.limite_inscription,'boolean');
 assert.ok(a.categories.length>0);
 assert.ok(a.tournois.every(x=>a.categories.includes(x.categorie)||!x.categorie));
 assert.ok(fs.readFileSync(path.join(racine,'assets/data/tournois-apercu.js'),'utf8').includes('window.TOURNOIS_APERCU='));
 ok('aperçu : '+a.tournois.length+' tournois triés sur '+a.total+', '+(bufA.length/1024).toFixed(1)+' Ko, total et par département cohérents, empreintes exactes');
}
(async()=>{
 verifierGeneres();
 await new Promise(r=>serveur.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+serveur.address().port;
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const erreurs=[];
 /* Trois formes des données de test, comme scripts/generer-pages.js : aperçu (100 premiers, total, par département),
    index d'un département, fichier national. Interceptées : les vrais fichiers ne sont pas lus.
    reponse(r,n) : n-ième appel à l'entrée « France » (tournois-apercu.json) ; national(r,n) : tournois.json ;
    repli : comportement des copies .js ; avant : script lancé avant la page (localStorage de départ). */
 const parDate=(a,b)=>a.date_debut<b.date_debut?-1:a.date_debut>b.date_debut?1:String(a.nom).localeCompare(String(b.nom));
 const apercuDe=(D,total)=>{const pd={};D.tournois.forEach(x=>{pd[x.dep]=(pd[x.dep]||0)+1;});
  return {genere_le:D.genere_le,source:D.source,periode:D.periode,apercu:true,total:total===undefined?D.tournois.length:total,par_dep:pd,
   categories:[...new Set(D.tournois.map(x=>x.categorie).filter(Boolean))].sort(),limite_inscription:D.tournois.some(x=>'limite_inscription' in x),
   tournois:[...D.tournois].sort(parDate).slice(0,100)};};
 const indexDe=(D,dep)=>({genere_le:D.genere_le,source:D.source,periode:D.periode,dep,tournois:D.tournois.filter(x=>x.dep===dep)});
 const json=(r,obj,entetes)=>r.fulfill({contentType:'application/json',headers:entetes,body:JSON.stringify(obj)});
 const ouvrir=async({reponse,national,repli='echec',page:url='/tournois.html',mobile=true,donnees=DONNEES,avant})=>{
  const ctx=await browser.newContext({serviceWorkers:'block',viewport:mobile?{width:390,height:844}:{width:1280,height:800},isMobile:mobile,hasTouch:mobile});
  await ctx.route('**/assets/vendor/supabase-*.js*',r=>r.fulfill({contentType:'text/javascript',body:''}));
  await ctx.route(/^https:/,r=>r.fulfill({body:''}));
  if(avant) await ctx.addInitScript(avant);
  const c={apercu:0,national:0,index:{},urls:[]};
  await ctx.route('**/assets/data/tournois-apercu.json*',async r=>{c.apercu++;c.urls.push(r.request().url());await (reponse?reponse(r,c.apercu):json(r,apercuDe(donnees)));});
  await ctx.route('**/assets/data/tournois.json*',async r=>{c.national++;c.urls.push(r.request().url());await (national?national(r,c.national):json(r,donnees));});
  await ctx.route(/\/assets\/data\/index\/[^/]+\.json/,async r=>{const dep=/index\/([^/.]+)\.json/.exec(r.request().url())[1];c.index[dep]=(c.index[dep]||0)+1;c.urls.push(r.request().url());await json(r,indexDe(donnees,dep));});
  await ctx.route(/\/assets\/data\/(tournois|tournois-apercu|index\/[^/.]+)\.js(\?|$)/,r=>{
   if(repli!=='ok') return r.abort('connectionrefused');
   const u=r.request().url();
   const corps=/tournois-apercu\.js/.test(u)?'window.TOURNOIS_APERCU='+JSON.stringify(apercuDe(donnees))
    :/index\//.test(u)?(d=>'(window.TOURNOIS_INDEX=window.TOURNOIS_INDEX||{})["'+d+'"]='+JSON.stringify(indexDe(donnees,d)))(/index\/([^/.]+)\.js/.exec(u)[1])
    :'window.TOURNOIS_DATA='+JSON.stringify(donnees);
   return r.fulfill({contentType:'text/javascript',body:corps+';'});
  });
  const page=await ctx.newPage();
  page.on('pageerror',e=>erreurs.push(e.message));
  page.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource|net::ERR/.test(m.text()))erreurs.push(m.text());});
  await page.goto(base+url);
  return {ctx,page,appels:()=>c.apercu,compte:c};
 };
 const visibles=page=>page.evaluate(()=>['tournois-chargement','tournois-erreur','tournois-vide','tournois-contenu'].filter(id=>!document.getElementById(id).hidden));
 const okJson=r=>json(r,apercuDe(DONNEES));
 const cartes=page=>page.locator('#tournois-liste article').count();
 // Localstorage de départ, posé une seule fois (pas à chaque rechargement)
 const depart=valeurs=>`if(!sessionStorage.getItem('depart-pose')){sessionStorage.setItem('depart-pose','1');${Object.entries(valeurs).map(([k,v])=>`localStorage.setItem(${JSON.stringify(k)},${JSON.stringify(v)});`).join('')}}`;
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
  ({ctx,page}=await ouvrir({reponse:r=>json(r,{...apercuDe({...DONNEES,tournois:[]}),total:0})}));
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
   await c2.route('**/assets/vendor/supabase-*.js*',r=>r.fulfill({contentType:'text/javascript',body:''})); // comptes indisponibles : le SDK (sur le site) est bloqué aussi
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
  // 10. Tournois terminés depuis la dernière collecte (fichier hebdomadaire) : retirés chaque jour côté navigateur
  const PASSES={...DONNEES,periode:{du:jour(-6),au:jour(90)},tournois:[
   t(910001,'76','P100','HIER',-1),                          // terminé hier : retiré
   t(910002,'76','P100','AUJOURDHUI',0),                     // se joue aujourd'hui : reste
   {...t(910003,'76','P250','EN COURS',-3),date_fin:jour(1)}, // commencé avant-hier, finit demain : reste
   {...t(910004,'27','P25','SANS FIN',-2),date_fin:null},     // sans date de fin, commencé avant-hier : retiré
   t(910005,'76','P25','DEMAIN',1)]};
  ({ctx,page}=await ouvrir({donnees:PASSES}));
  await page.evaluate(()=>{localStorage.setItem('pa-tournois-favoris',JSON.stringify(['910001','910002']));localStorage.removeItem('pa-tournois-filtres');});
  await page.reload();
  await page.waitForSelector('#tournois-contenu:not([hidden])');
  const villes=await page.$$eval('#tournois-liste article',a=>a.map(x=>x.textContent));
  assert.equal(villes.length,3,villes.join(' | '));
  assert.ok(!villes.some(v=>/HIER|SANS FIN/i.test(v)),'un tournoi terminé est encore affiché');
  assert.ok(villes.some(v=>/AUJOURDHUI/i.test(v))&&villes.some(v=>/EN COURS/i.test(v))&&villes.some(v=>/DEMAIN/i.test(v)));
  assert.equal(await page.textContent('#tournois-compteur'),'3 tournois');
  ok('tournoi d\'hier (et sans date de fin, commencé avant-hier) retiré ; tournoi d\'aujourd\'hui et en cours gardés ; compteur à 3');
  // Le texte de période commence aujourd'hui, pas à la date de la collecte
  const auj=new Date(),MOIS=['janv.','févr.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.'];
  assert.match(await page.textContent('#tournois-maj'),new RegExp('Tournois du '+auj.getDate()+' '+MOIS[auj.getMonth()].replace('.','\\.')+' au'));
  ok('période annoncée à partir d\'aujourd\'hui');
  // Département 27 : son seul tournoi est terminé, la carte ne le compte plus
  await page.click('label:has(input[name=zone-mode][value=dep])');
  await page.selectOption('#zone-dep','27');
  await page.waitForFunction(()=>!document.getElementById('tournois-aucun').hidden);
  assert.equal(await page.locator('#tournois-liste article').count(),0);
  ok('filtre département : un département dont les tournois sont terminés n\'en montre plus');
  // « Mes tournois » : le favori passé reste visible, grisé, pour pouvoir le retirer
  await page.waitForSelector('#tournois-mes:not([hidden])');
  const mes=await page.$$eval('#tournois-mes-liste article',a=>a.map(x=>({texte:x.textContent,passe:x.classList.contains('tpasse')})));
  assert.equal(mes.length,2,JSON.stringify(mes));
  assert.ok(mes.find(m=>/HIER/i.test(m.texte)).passe,'favori passé non grisé');
  assert.ok(!mes.find(m=>/AUJOURDHUI/i.test(m.texte)).passe,'favori du jour grisé à tort');
  assert.equal(await page.evaluate(()=>localStorage.getItem('pa-tournois-favoris')),'["910001","910002"]');
  await ctx.close();
  ok('« Mes tournois » : favori d\'hier toujours affiché (grisé, classe tpasse), favoris conservés');
  // 11. Pages département générées (liste-tournois.js) : un tournoi terminé depuis la génération est retiré
  ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true});
  page=await ctx.newPage(); // page vide : seul liste-tournois.js est chargé
  page.on('pageerror',e=>erreurs.push(e.message));
  page.on('console',m=>{if(m.type()==='error')erreurs.push(m.text());});
  await page.setContent(`<!doctype html><html lang="fr"><body><form id="gl-filtres"></form><p id="gl-compteur"></p>
<ul id="gl-liste"><li class="gen-item" data-cat="P100" data-sexes="messieurs" data-debut="${jour(-1)}" data-fin="${jour(-1)}">HIER</li>
<li class="gen-item" data-cat="P100" data-sexes="messieurs" data-debut="${jour(0)}" data-fin="${jour(0)}">AUJOURDHUI</li>
<li class="gen-item" data-cat="P25" data-sexes="dames" data-debut="${jour(-2)}" data-fin="${jour(2)}">EN COURS</li></ul>
<p id="gl-aucun" hidden>Aucun</p></body></html>`);
  await page.addScriptTag({path:path.join(racine,'assets/js/liste-tournois.js')});
  assert.deepEqual(await page.$$eval('#gl-liste .gen-item',l=>l.map(x=>x.textContent)),['AUJOURDHUI','EN COURS']);
  assert.equal(await page.textContent('#gl-compteur'),'2 tournois à venir');
  // Page région × catégorie : liste seule, sans filtres ni compteur (le script tolère leur absence)
  await page.setContent(`<!doctype html><html lang="fr"><body><ul id="gl-liste"><li class="gen-item" data-debut="${jour(-1)}" data-fin="${jour(-1)}">HIER</li><li class="gen-item" data-debut="${jour(0)}" data-fin="${jour(0)}">AUJOURDHUI</li></ul></body></html>`);
  await page.addScriptTag({path:path.join(racine,'assets/js/liste-tournois.js')});
  assert.deepEqual(await page.$$eval('#gl-liste .gen-item',l=>l.map(x=>x.textContent)),['AUJOURDHUI']);
  await ctx.close();
  ok('pages département et région : tournoi d\'hier retiré, tournoi d\'aujourd\'hui gardé, compteur « 2 tournois à venir »');
  // 12. Entrée légère (audit du 03/11, lot 2) : 130 tournois sur 3 départements, aperçu limité à 100
  let compte;
  const pause=ms=>new Promise(x=>setTimeout(x,ms));
  const GROS={...DONNEES,tournois:Array.from({length:130},(_,i)=>t(920000+i,['76','27','13'][i%3],['P25','P100','P250','P500'][i%4],'VILLE'+i,1+Math.floor(i/3))).sort(parDate)};
  const combien=(f)=>GROS.tournois.filter(f).length;
  const compteurVaut=(page,n)=>page.waitForFunction(n=>document.getElementById('tournois-compteur').textContent===n.toLocaleString('fr-FR')+' tournois',n);
  ({ctx,page,compte}=await ouvrir({donnees:GROS,national:async r=>{await pause(600);await json(r,GROS);}}));
  const fiches=[];page.on('request',q=>{if(/\/assets\/data\/fiches\//.test(q.url()))fiches.push(q.url());});
  await page.waitForSelector('#tournois-contenu:not([hidden])');
  assert.equal(await cartes(page),50);
  assert.equal(await page.textContent('#tournois-compteur'),'130 tournois');
  assert.match(await page.textContent('#tournois-plus'),/80 restants/);
  assert.equal(compte.apercu,1);assert.equal(compte.national,0);assert.deepEqual(compte.index,{});
  ok('entrée sans état : aperçu seul (aucune requête vers tournois.json ni index), 50 cartes, compteur = total de l\'aperçu');
  // Fiches détaillées : seulement pour les cartes qui approchent de l'écran
  await page.waitForTimeout(300);
  assert.equal(fiches.length,0,'fiches chargées pour des cartes hors de l\'écran : '+fiches.join(' '));
  await page.locator('#tournois-liste article').first().scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>performance.getEntriesByType('resource').some(e=>/\/fiches\//.test(e.name)));
  assert.ok(fiches.length>=1&&fiches.length<=3,fiches.join(' '));
  ok('fiches détaillées chargées quand les cartes approchent de l\'écran ('+fiches.length+' département(s)), aucune à l\'entrée');
  // « Voir plus » : 50 → 100 dans l'aperçu, puis 100 → 130 avec le fichier national, cartes affichées gardées
  await page.evaluate(()=>document.querySelectorAll('#tournois-liste article').forEach(a=>{a.dataset.marque='1';}));
  await page.click('#tournois-plus');
  await page.waitForFunction(()=>document.querySelectorAll('#tournois-liste article').length===100);
  assert.equal(await page.locator('#tournois-liste article[data-marque="1"]').count(),50);
  assert.equal(compte.national,0);
  await page.evaluate(()=>document.querySelectorAll('#tournois-liste article').forEach(a=>{a.dataset.marque='1';}));
  await page.click('#tournois-plus');
  await page.waitForFunction(()=>document.getElementById('tournois-plus').getAttribute('aria-busy')==='true');
  assert.ok(await page.isDisabled('#tournois-plus'));
  assert.equal(await cartes(page),100);
  await page.waitForFunction(()=>document.querySelectorAll('#tournois-liste article').length===130);
  assert.equal(compte.national,1);
  assert.equal(await page.locator('#tournois-liste article[data-marque="1"]').count(),100,'les 100 cartes affichées ont été recréées');
  assert.deepEqual(await page.$$eval('#tournois-liste article',a=>a.map(x=>x.dataset.id)),GROS.tournois.map(x=>x.id));
  assert.ok(await page.isHidden('#tournois-plus'));
  assert.equal(await page.textContent('#tournois-compteur'),'130 tournois');
  await ctx.close();
  ok('« Voir plus » : aperçu jusqu\'à 100, puis fichier national chargé une fois (bouton en chargement), 30 cartes ajoutées, les 100 premières gardées');
  // 13. Filtre catégorie en France : fichier national chargé une fois, message dans la liste, filtres utilisables
  ({ctx,page,compte}=await ouvrir({donnees:GROS,national:async r=>{await pause(800);await json(r,GROS);}}));
  await page.waitForSelector('#tournois-contenu:not([hidden])');
  const hauteur=await page.evaluate(()=>document.getElementById('tournois-liste').offsetHeight);
  await page.click('#filtre-categories label:has-text("P250")');
  await page.waitForSelector('#tournois-liste .tattente');
  assert.match(await page.textContent('#tournois-liste'),/Chargement de tous les tournois de France/);
  assert.ok(await page.evaluate(()=>document.getElementById('tournois-liste').offsetHeight)>=hauteur,'la liste a rétréci pendant le chargement');
  assert.deepEqual(await visibles(page),['tournois-contenu']);
  await page.click('#filtre-categories label:has-text("P500")'); // filtre utilisable pendant le chargement
  const attendu=combien(x=>x.categorie==='P250'||x.categorie==='P500');
  await compteurVaut(page,attendu);
  assert.equal(compte.national,1);
  assert.equal(await cartes(page),50);
  assert.ok((await page.$$eval('#tournois-liste .tbadge',b=>b.map(x=>x.textContent))).every(c=>c==='P250'||c==='P500'));
  await page.click('#filtre-categories label:has-text("P100")');
  await compteurVaut(page,attendu+combien(x=>x.categorie==='P100'));
  assert.equal(compte.national,1);
  await ctx.close();
  ok('filtre catégorie en France : message dans la liste (hauteur gardée), fichier national chargé une seule fois, '+attendu+' résultats corrects');
  // 14. Département mémorisé (pa-mon-departement) sans état enregistré : index du département seul
  const n76=combien(x=>x.dep==='76'),n27=combien(x=>x.dep==='27');
  ({ctx,page,compte}=await ouvrir({donnees:GROS,avant:depart({'pa-mon-departement':'76'})}));
  await page.waitForSelector('#tournois-contenu:not([hidden])');
  await compteurVaut(page,n76);
  assert.deepEqual(compte.index,{'76':1});assert.equal(compte.national,0);
  assert.ok(await page.isChecked('input[name=zone-mode][value=dep]'));
  assert.equal(await page.inputValue('#zone-dep'),'76');
  assert.equal(await cartes(page),n76);
  assert.ok((await page.$$eval('#tournois-liste .tlieu',l=>l.map(x=>x.textContent))).every(x=>x.endsWith('(76)')));
  ok('pa-mon-departement=76 : seul index/76.json (+ aperçu), pas de fichier national, '+n76+' tournois du 76');
  // Filtre dans le département : l'index suffit
  await page.click('#filtre-categories label:has-text("P100")');
  await compteurVaut(page,combien(x=>x.dep==='76'&&x.categorie==='P100'));
  assert.equal(compte.national,0);
  await page.click('#filtre-categories label:has-text("P100")');
  await compteurVaut(page,n76);
  // Changement de département : nouvel index, gardé en mémoire
  await page.selectOption('#zone-dep','27');
  await compteurVaut(page,n27);
  assert.ok((await page.$$eval('#tournois-liste .tlieu',l=>l.map(x=>x.textContent))).every(x=>x.endsWith('(27)')));
  await page.selectOption('#zone-dep','76');
  await compteurVaut(page,n76);
  assert.deepEqual(compte.index,{'76':1,'27':1});assert.equal(compte.national,0);
  await ctx.close();
  ok('filtre dans le département sur l\'index seul ; changement de département → index/27.json, retour au 76 sans nouvelle requête');
  // État enregistré « Toute la France » : respecté même avec un département mémorisé
  ({ctx,page,compte}=await ouvrir({donnees:GROS,avant:depart({'pa-mon-departement':'76','pa-tournois-filtres':JSON.stringify({categories:[],sexes:[],du:'',au:'',ouvertes:false,texte:'',croissant:true,tri:'date',zone:{mode:'france',dep:'',ville:null,rayon:50}})})}));
  await page.waitForSelector('#tournois-contenu:not([hidden])');
  assert.equal(await cartes(page),50);assert.deepEqual(compte.index,{});assert.equal(compte.national,0);
  await ctx.close();
  ok('état enregistré « Toute la France » gardé malgré pa-mon-departement');
  // 15. Favori d'un autre département : fichier national en arrière-plan, la liste du département ne bouge pas
  const fav27=GROS.tournois.slice(100).find(x=>x.dep==='27').id; // absent de l'aperçu (100 premiers)
  ({ctx,page,compte}=await ouvrir({donnees:GROS,avant:depart({'pa-mon-departement':'76','pa-tournois-favoris':JSON.stringify([fav27])})}));
  await page.waitForSelector('#tournois-mes-liste article');
  assert.equal(await page.getAttribute('#tournois-mes-liste article','data-id'),fav27);
  assert.equal(compte.national,1);
  assert.equal(await cartes(page),n76);
  await ctx.close();
  ok('favori du 27 vu depuis le 76 : retrouvé par le fichier national chargé en arrière-plan');
  // 16. Fichier national en échec : message clair, vue légère (aperçu filtré) gardée, « Réessayer »
  let panne=true;
  ({ctx,page,compte}=await ouvrir({donnees:GROS,national:r=>panne?r.abort('internetdisconnected'):json(r,GROS)}));
  await page.waitForSelector('#tournois-contenu:not([hidden])');
  await page.click('#filtre-categories label:has-text("P250")');
  await page.waitForSelector('.tsource-msg:not([hidden])');
  assert.match(await page.textContent('.tsource-msg'),/toute la France n'a pas pu être chargée.*connexion/);
  const partiel=GROS.tournois.slice(0,100).filter(x=>x.categorie==='P250').length;
  assert.equal(await page.textContent('#tournois-compteur'),partiel+' tournois (liste partielle)');
  assert.equal(await cartes(page),partiel);
  assert.deepEqual(await visibles(page),['tournois-contenu']);
  panne=false;
  await page.click('.tsource-msg button');
  await compteurVaut(page,combien(x=>x.categorie==='P250'));
  assert.ok(await page.isHidden('.tsource-msg'));
  assert.equal(compte.national,2);
  await ctx.close();
  ok('fichier national injoignable : message « toute la France n\'a pas pu être chargée », '+partiel+' tournois de l\'aperçu gardés, « Réessayer » charge la liste');
  // 17. Hors connexion : aperçu ou fichier national servis par le service worker (X-Depuis-Cache)
  ({ctx,page}=await ouvrir({reponse:r=>json(r,apercuDe(DONNEES),{'X-Depuis-Cache':'1'})}));
  await page.waitForSelector('#tournois-contenu:not([hidden])');
  assert.match(await page.textContent('#tournois-maj'),/^Hors connexion : liste du /);
  await ctx.close();
  ({ctx,page}=await ouvrir({national:r=>json(r,DONNEES,{'X-Depuis-Cache':'1'})}));
  await page.waitForSelector('#tournois-contenu:not([hidden])');
  assert.match(await page.textContent('#tournois-maj'),/^Mis à jour le /);
  await page.click('#filtre-categories label:has-text("P100")');
  await page.waitForFunction(()=>/^Hors connexion : liste du /.test(document.getElementById('tournois-maj').textContent));
  await ctx.close();
  ok('hors connexion : « Hors connexion : liste du … » pour l\'aperçu comme pour le fichier national');
  // 18. Vraies données : URL versionnées, poids à l'entrée, ouverture en file://
  const pagesT=new Function('window',fs.readFileSync(path.join(racine,'assets/data/pages-tournois.js'),'utf8')+';return window.PA_PAGES_TOURNOIS;')({});
  const poids={};
  for(const cas of ['','76','13']){
   const c3=await browser.newContext({serviceWorkers:'block',viewport:{width:390,height:844},isMobile:true,hasTouch:true});
   await c3.route(/^https:/,r=>r.fulfill({body:''}));
   if(cas) await c3.addInitScript(depart({'pa-mon-departement':cas}));
   const p3=await c3.newPage();
   p3.on('pageerror',e=>erreurs.push(e.message));
   const corps=[],urls=[];
   p3.on('response',r=>{if(r.url().startsWith(base)){urls.push(r.url().slice(base.length));corps.push(r.body().then(b=>b.length,()=>0));}});
   await p3.goto(base+'/tournois.html',{waitUntil:'networkidle'});
   await p3.waitForSelector('#tournois-liste article');
   await p3.waitForTimeout(500);
   const total=(await Promise.all(corps)).reduce((a,b)=>a+b,0);
   poids[cas||'sans état']=Math.round(total/1024);
   assert.ok(!urls.some(u=>/\/assets\/data\/tournois\.json/.test(u)),'tournois.json chargé à l\'entrée ('+(cas||'sans état')+')');
   assert.ok(urls.includes('/assets/data/tournois-apercu.json?v='+pagesT.empreintes.apercu),'aperçu versionné : '+urls.filter(u=>/apercu/.test(u)).join(' '));
   if(cas) assert.ok(urls.includes('/assets/data/index/'+cas+'.json?v='+pagesT.empreintes.index[cas]),'index versionné');
   if(cas!=='13') assert.ok(total<600*1024,'poids à l\'entrée '+(cas||'sans état')+' : '+Math.round(total/1024)+' Ko');
   await c3.close();
  }
  ok('vraies données : URL ?v=<empreinte>, aucun tournois.json à l\'entrée ; poids (Ko) '+JSON.stringify(poids)+' (< 600 sans état et 76 ; le 13 est donné pour information)');
  {
   const c4=await browser.newContext({viewport:{width:390,height:844}});
   await c4.route(/^https:/,r=>r.fulfill({body:''}));
   const p4=await c4.newPage();
   p4.on('pageerror',e=>erreurs.push(e.message));
   await p4.goto('file:///'+path.join(racine,'tournois.html').replace(/\\/g,'/'));
   await p4.waitForSelector('#tournois-contenu:not([hidden])');
   assert.equal(await p4.locator('#tournois-liste article').count(),50);
   await c4.close();
  }
  ok('ouverture en file:// : copie tournois-apercu.js, 50 cartes');
  assert.deepEqual(erreurs,[]);
  ok('aucune erreur JavaScript non gérée');
  console.log('TOTAL '+nb+' contrôles réussis.');
 }finally{await browser.close();serveur.close();}
})().catch(e=>{console.error(e);serveur.close();process.exitCode=1;});
