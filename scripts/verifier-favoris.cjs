/* Vérification des favoris tournois (étoile, « Mes tournois », synchronisation compte) et de l'export calendrier .ics.
   Supabase n'est jamais contacté : le script du CDN est remplacé par un faux client piloté par le test.
   Lancer depuis la racine du site : node scripts/verifier-favoris.cjs */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),vm=require('node:vm');
const {chromium}=require('playwright');
const racine=path.join(__dirname,'..');
let nb=0;
// Playwright (Edge) rejette une promesse interne à la fermeture après un téléchargement : seule cette erreur est ignorée
process.on('unhandledRejection',e=>{if(e&&e.name==='TargetClosedError')return;console.error(e);process.exitCode=1;});
function ok(nom){nb++;console.log('OK '+nom);}
const serveur=http.createServer((req,res)=>{
 const rel=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\//,'')||'index.html';
 const p=path.resolve(racine,rel);
 if(!p.startsWith(racine+path.sep)){res.writeHead(403);res.end();return;}
 fs.readFile(p,(e,b)=>{if(e){res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png'})[path.extname(p)]||'text/plain');res.end(b);
 });
});
const iso=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const dans=j=>{const d=new Date();d.setDate(d.getDate()+j);return iso(d);};

/* ---- Fichier .ics, hors navigateur ---- */
function ics(){
 const fen={};const stockage={};
 vm.runInNewContext(fs.readFileSync(path.join(racine,'assets/js/favoris.js'),'utf8'),{window:Object.assign(fen,{addEventListener(){}}),TextEncoder,URL,
  localStorage:{getItem:k=>stockage[k]??null,setItem:(k,v)=>{stockage[k]=v;}}});
 const F=fen.PA_FAVORIS;
 const t={id:'123456',nom:'P100 du Club, édition « automne »; nocturne',categorie:'P100',club:'Padel Club de Rouen',ville:'ROUEN',date_debut:dans(20),date_fin:dans(21),limite_inscription:dans(15)};
 const texte=F.ics(t,{adresse:'12 rue des Sports, 76000 Rouen'});
 const lignes=texte.split('\r\n');
 assert.ok(texte.endsWith('\r\n'));assert.ok(!/[^\r]\n/.test(texte),'fins de ligne CRLF');
 lignes.forEach(l=>assert.ok(Buffer.byteLength(l,'utf8')<=75,'ligne trop longue : '+l));
 const deplie=texte.replace(/\r\n /g,'');
 assert.match(deplie,/DTSTART;VALUE=DATE:\d{8}\r\n/);
 assert.ok(deplie.includes('DTSTART;VALUE=DATE:'+dans(20).replace(/-/g,'')));
 assert.ok(deplie.includes('DTEND;VALUE=DATE:'+dans(22).replace(/-/g,'')),'DTEND = lendemain du dernier jour');
 assert.ok(deplie.includes('TRIGGER:-P7D'));
 assert.match(deplie,/TRIGGER;VALUE=DATE-TIME:\d{8}T070000Z/);
 assert.ok(deplie.includes('SUMMARY:P100 · P100 du Club\\, édition « automne »\\; nocturne · ROUEN'));
 assert.ok(deplie.includes('LOCATION:Padel Club de Rouen\\, 12 rue des Sports\\, 76000 Rouen'));
 assert.ok(deplie.includes('URL:https://tenup.fft.fr/tournoi/123456'));
 assert.equal((deplie.match(/BEGIN:VALARM/g)||[]).length,2);
 // Circuit de plusieurs mois : un seul jour ; clôture passée : pas de rappel d'inscription
 const circuit=F.ics({...t,date_debut:dans(3),date_fin:dans(200),limite_inscription:dans(-2)}).replace(/\r\n /g,'');
 assert.ok(circuit.includes('DTEND;VALUE=DATE:'+dans(4).replace(/-/g,'')));
 assert.equal((circuit.match(/BEGIN:VALARM/g)||[]).length,1);
 assert.equal(F.ics({...t,date_debut:'pas une date'}),null);
 ok('fichier .ics : CRLF, lignes ≤ 75 octets, échappement, dates, rappel J-7 et veille de clôture');
}

// Faux SDK Supabase : connecté (U1), favoris du compte et appels enregistrés dans window.__faux
const FAUX_SDK=`(function(){
 const f=window.__faux=JSON.parse(sessionStorage.getItem('faux')||'{"serveur":["SERVEUR1"],"appels":[],"panne":false}');
 const garder=()=>sessionStorage.setItem('faux',JSON.stringify(f));
 window.supabase={createClient(){
  const session={user:{id:'U1',email:'test@exemple.fr'}};
  function requete(table){
   let op='select',ligne=null,filtres={};
   const q={
    select(){return q;},order(){return q;},limit(){return q;},
    eq(c,v){filtres[c]=v;return q;},
    upsert(l){op='upsert';ligne=l;return q;},
    delete(){op='delete';return q;},
    then(resoudre){
     if(table!=='favoris')return Promise.resolve({data:[],error:null}).then(resoudre);
     if(f.panne)return Promise.resolve({data:null,error:{message:'Failed to fetch'}}).then(resoudre);
     if(op==='upsert'){f.appels.push('+'+ligne.tournoi_id);if(!f.serveur.includes(ligne.tournoi_id))f.serveur.push(ligne.tournoi_id);}
     if(op==='delete'){f.appels.push('-'+filtres.tournoi_id);f.serveur=f.serveur.filter(x=>x!==filtres.tournoi_id);}
     garder();
     return Promise.resolve({data:op==='select'?f.serveur.map(x=>({tournoi_id:x})):null,error:null}).then(resoudre);
    }
   };
   return q;
  }
  return {auth:{getSession:async()=>({data:{session}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),signOut:async()=>({})},
   rpc:async()=>({data:null,error:null}),from:requete};
 }};
})();`;

// Fonctions activées pour le test (sur le site, la liste de supabase-config.js est vide tant que le SQL n'est pas exécuté)
const CONFIG_ACTIVE=fs.readFileSync(path.join(__dirname,'..','assets/js/supabase-config.js'),'utf8')+'\nwindow.PA_SUPABASE.activees=["favoris","communaute"];\n';
(async()=>{
 ics();
 await new Promise(r=>serveur.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+serveur.address().port;
 const donnees=JSON.parse(fs.readFileSync(path.join(racine,'assets/data/tournois.json'),'utf8')).tournois;
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const erreurs=[];
 const routes=async(ctx,sdk)=>{
  await ctx.route('**/supabase-js@*/**',r=>r.fulfill({contentType:'text/javascript',body:sdk||'/* comptes inactifs */'}));
  await ctx.route('**/assets/js/supabase-config.js',r=>r.fulfill({contentType:'text/javascript',body:CONFIG_ACTIVE}));
  await ctx.route('**/*.supabase.co/**',r=>r.abort());
  await ctx.route('https://gc.zgo.at/**',r=>r.fulfill({contentType:'text/javascript',body:''}));
  await ctx.route('https://data.geopf.fr/**',r=>r.abort());
 };
 try{
  /* Sans compte */
  const ctx=await browser.newContext({serviceWorkers:'block',viewport:{width:390,height:844},isMobile:true,hasTouch:true,acceptDownloads:true});
  await routes(ctx);
  const page=await ctx.newPage();
  page.on('pageerror',e=>erreurs.push(e.message));
  page.on('console',m=>{if(m.type()==='error')erreurs.push(m.text());});
  await page.goto(base+'/tournois.html');
  await page.waitForSelector('#tournois-liste .tcard');
  assert.ok(await page.isHidden('#tournois-mes'));
  const premiere=page.locator('#tournois-liste .tcard').first();
  const id=await premiere.getAttribute('data-id');
  const etoile=premiere.locator('button.tfav');
  assert.equal(await etoile.getAttribute('aria-pressed'),'false');
  const h=await etoile.evaluate(b=>b.getBoundingClientRect().height);assert.ok(h>=44);
  await etoile.click();
  assert.equal(await etoile.getAttribute('aria-pressed'),'true');
  assert.ok(await page.isVisible('#tournois-mes'));
  assert.equal(await page.locator('#tournois-mes-liste .tcard').count(),1);
  assert.equal(await page.locator('#tournois-mes-liste .tcard').getAttribute('data-id'),id);
  assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('pa-tournois-favoris'))),[id]);
  assert.ok(await page.evaluate(()=>document.activeElement&&document.activeElement.classList.contains('tfav')));
  ok('étoile : favori ajouté, section « Mes tournois » affichée, focus conservé');
  await page.reload();await page.waitForSelector('#tournois-mes-liste .tcard');
  assert.equal(await page.locator(`#tournois-liste .tcard[data-id="${id}"] button.tfav`).getAttribute('aria-pressed'),'true');
  ok('favori gardé après rechargement');
  const [telechargement]=await Promise.all([page.waitForEvent('download'),page.locator('#tournois-mes-liste button.tcal').click()]);
  assert.equal(telechargement.suggestedFilename(),`tournoi-${id}.ics`);
  const contenu=fs.readFileSync(await telechargement.path(),'utf8');
  assert.match(contenu,/^BEGIN:VCALENDAR\r\n/);assert.ok(contenu.includes('TRIGGER:-P7D'));
  const t=donnees.find(x=>String(x.id)===id);
  assert.ok(contenu.replace(/\r\n /g,'').includes('DTSTART;VALUE=DATE:'+t.date_debut.replace(/-/g,'')));
  ok('« Ajouter au calendrier » télécharge un .ics valide pour ce tournoi');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),390);
  ok('aucun débordement à 390 px avec la section « Mes tournois »');
  // Favori inconnu (tournoi retiré de la liste) : signalé, sans plantage
  await page.evaluate(i=>localStorage.setItem('pa-tournois-favoris',JSON.stringify([i,'999999999','<script>'])),id);
  await page.reload();await page.waitForSelector('#tournois-mes-liste .tcard');
  assert.match(await page.textContent('#tournois-mes-note'),/1 favori n'est plus dans la liste/);
  await page.locator('#tournois-mes-liste button.tfav').click();
  assert.equal(await page.locator('#tournois-mes-liste .tcard').count(),0);
  assert.equal(await page.locator(`#tournois-liste .tcard[data-id="${id}"] button.tfav`).getAttribute('aria-pressed'),'false');
  ok('retrait depuis « Mes tournois » ; favori inconnu signalé, identifiant invalide ignoré');
  // Le tableau de bord du compte affiche le favori à venir
  await page.evaluate(i=>localStorage.setItem('pa-tournois-favoris',JSON.stringify([i])),id);
  await page.goto(base+'/compte.html');
  await page.waitForFunction(()=>document.querySelectorAll('#mp-favoris li').length===1);
  assert.ok((await page.textContent('#mp-favoris')).includes(t.ville));
  ok('tableau de bord « Mon padel » : prochain tournoi favori affiché');
  await ctx.close();

  /* Connecté (faux client) */
  const ctx2=await browser.newContext({serviceWorkers:'block',viewport:{width:1280,height:900}});
  await routes(ctx2,FAUX_SDK);
  const p2=await ctx2.newPage();
  p2.on('pageerror',e=>erreurs.push(e.message));
  await p2.goto(base+'/tournois.html');
  // Favori ajouté sur l'appareil avant la connexion
  await p2.evaluate(i=>localStorage.setItem('pa-tournois-favoris',JSON.stringify([i])),id);
  await p2.reload();
  await p2.waitForFunction(i=>window.__faux.appels.includes('+'+i)&&JSON.parse(localStorage.getItem('pa-tournois-favoris')).includes('SERVEUR1'),id);
  assert.deepEqual((await p2.evaluate(()=>JSON.parse(localStorage.getItem('pa-tournois-favoris')))).sort(),[id,'SERVEUR1'].sort());
  ok('connexion : favoris de l\'appareil envoyés au compte, favoris du compte récupérés');
  // Retrait pendant une panne réseau : gardé en attente, puis envoyé au retour
  await p2.evaluate(()=>{window.__faux.panne=true;sessionStorage.setItem('faux',JSON.stringify(window.__faux));});
  await p2.locator(`#tournois-mes-liste .tcard[data-id="${id}"] button.tfav`).click();
  await p2.waitForFunction(()=>!document.getElementById('tournois-fav-msg').hidden);
  assert.match(await p2.textContent('#tournois-fav-msg'),/non synchronisés/);
  assert.deepEqual(await p2.evaluate(()=>JSON.parse(localStorage.getItem('pa-tournois-favoris-attente'))),{[id]:false});
  await p2.evaluate(()=>{const f=JSON.parse(sessionStorage.getItem('faux'));f.panne=false;sessionStorage.setItem('faux',JSON.stringify(f));});
  await p2.reload();
  await p2.waitForFunction(i=>window.__faux.appels.includes('-'+i),id);
  await p2.waitForFunction(()=>Object.keys(JSON.parse(localStorage.getItem('pa-tournois-favoris-attente')||'{}')).length===0);
  assert.deepEqual(await p2.evaluate(()=>JSON.parse(localStorage.getItem('pa-tournois-favoris'))),['SERVEUR1']);
  assert.ok(await p2.isHidden('#tournois-fav-msg'));
  ok('retrait hors connexion : gardé en attente, envoyé au retour, pas remis par la synchronisation');
  await ctx2.close();
  assert.deepEqual(erreurs,[]);
  ok('aucune erreur console');
  console.log('TOTAL '+nb+' contrôles réussis.');
 }finally{await browser.close();serveur.close();}
})().catch(e=>{console.error(e);serveur.close();process.exitCode=1;});
