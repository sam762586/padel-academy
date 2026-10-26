/* Vérification du tableau de bord « Mon padel » (compte.html) : calcul du classement estimé + page dans Edge à 390 px.
   Supabase n'est jamais contacté : le script du CDN est remplacé par un faux client.
   Lancer depuis la racine du site : node scripts/verifier-mon-padel.cjs */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),vm=require('node:vm');
const {chromium}=require('playwright');
const racine=path.join(__dirname,'..');
let nb=0;
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
const ilYa=(jours,mois=0)=>{const d=new Date();d.setMonth(d.getMonth()-mois);d.setDate(d.getDate()-jours);return iso(d);};

function calculs(){
 const fen={};
 vm.runInNewContext(fs.readFileSync(path.join(racine,'assets/js/bareme-donnees.js'),'utf8'),{window:fen});
 const B=fen.PA_BAREME,jour=iso(new Date());
 // 13 résultats : le plus faible ne compte pas ; un résultat expiré et un sans date sont exclus
 const res=[];
 for(let i=0;i<13;i++)res.push({cat:'P100',place:1+i,nb:16,sexe:'messieurs',date:ilYa(i)});
 res.push({cat:'P250',place:1,nb:16,sexe:'messieurs',date:ilYa(1,13)});
 res.push({cat:'P250',place:1,nb:16,sexe:'messieurs',date:null});
 const c=B.classementEstime(res,jour);
 assert.equal(c.retenus.length,12);
 const attendu=[100,80,60,40,25,10,5,1,5,3,2,1].sort((a,b)=>b-a).reduce((s,n)=>s+n,0); // P100, 13-16 paires (la 13e place vaut moins)
 assert.equal(c.total,res.slice(0,13).map(r=>B.ptsFor(r.cat,r.place,r.nb,r.sexe)).sort((a,b)=>b-a).slice(0,12).reduce((s,n)=>s+n,0));
 assert.ok(c.total>0&&attendu>0);
 // Un résultat de 11 mois et 15 jours sort dans les 30 jours ; le 13e reprend sa place
 const r2=[{cat:'P250',place:1,nb:16,sexe:'messieurs',date:ilYa(15,11)},{cat:'P25',place:1,nb:8,sexe:'messieurs',date:ilYa(1)}];
 const dans30=new Date();dans30.setDate(dans30.getDate()+30);
 assert.equal(B.classementEstime(r2,jour).total,275);
 assert.equal(B.classementEstime(r2,iso(dans30)).total,25);
 ok('classement estimé : 12 meilleurs, 12 mois glissants, points qui sortent sous 30 jours');
}

// Faux SDK Supabase servi à la place du CDN : session connectée + 2 matchs dans le compte (dont un aussi sur l'appareil)
function fauxSdk(matchCommun){
 return `window.supabase={createClient(){
  const session={user:{id:'U1',email:'test@exemple.fr'}};
  const reponse=(data)=>{const q={select(){return q;},eq(){return q;},order(){return q;},limit(){return Promise.resolve({data,error:null});},in(){return q;},gte(){return q;},maybeSingle(){return Promise.resolve({data:null,error:null});},single(){return Promise.resolve({data:null,error:null});},then(r){return Promise.resolve({data,error:null}).then(r);}};return q;};
  return {auth:{getSession:async()=>({data:{session}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),signOut:async()=>({})},
   rpc:async()=>({data:null,error:null}),
   from(table){
    if(table==='matchs')return reponse([
     ${JSON.stringify(matchCommun)},
     {joue_le:'2026-01-10T18:00:00+00:00',nom_a:'Nous',nom_b:'Club',format:{egalite:'decisif',dernierSet:'super',serveur:0},points:[{g:0,m:null},{g:0,m:null},{g:1,m:null}],score:'6-1 6-2',vainqueur:0,interrompu:false}
    ]);
    return reponse([]);
   }};
 }};`;
}

(async()=>{
 calculs();
 await new Promise(r=>serveur.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+serveur.address().port;
 const tournois=JSON.parse(fs.readFileSync(path.join(racine,'assets/data/tournois.json'),'utf8')).tournois;
 const jour=iso(new Date());
 const futurs=tournois.filter(t=>t.date_debut>jour).sort((a,b)=>a.date_debut<b.date_debut?-1:1).slice(0,2);
 const absent='999999999'; // identifiant inconnu (tournoi passé ou retiré de la liste)
 // Matchs du compteur : 6 matchs, % de points gagnés en hausse sur les 3 derniers
 const pts=(gagnes,total)=>Array.from({length:total},(_,i)=>({g:i<gagnes?0:1,m:null}));
 const cfg={nomA:'Nous',nomB:'Eux',serveur:0,egalite:'decisif',dernierSet:'super'};
 const historique=[70,65,60,40,35,30].map((p,i)=>({config:cfg,points:pts(p,100),fin:new Date(Date.now()-i*86400000*3).toISOString(),interrompu:false,score:p>50?'6-3 6-4':'3-6 4-6',vainqueur:p>50?0:1}));
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const erreurs=[];
 try{
  const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  // Sans compte : le CDN Supabase est remplacé par un script vide (comptes inactifs)
  await ctx.route('**/supabase-js@*/**',r=>r.fulfill({contentType:'text/javascript',body:'/* hors ligne */'}));
  await ctx.route('**/*.supabase.co/**',r=>r.abort());
  await ctx.route('https://gc.zgo.at/**',r=>r.fulfill({contentType:'text/javascript',body:''}));
  const page=await ctx.newPage();
  page.on('pageerror',e=>erreurs.push(e.message));
  page.on('console',m=>{if(m.type()==='error')erreurs.push(m.text());});
  await page.goto(base+'/compte.html');
  assert.match(await page.textContent('#mp-points'),/Aucun résultat saisi/);
  assert.match(await page.textContent('#mp-matchs'),/Aucun match/);
  assert.match(await page.textContent('#mp-favoris'),/Aucun tournoi/);
  ok('sans données : messages d\'accueil, aucune erreur');
  await page.evaluate(([h,fav,res])=>{
   localStorage.setItem('pa-score-historique',JSON.stringify(h));
   localStorage.setItem('pa-tournois-favoris',JSON.stringify(fav));
   localStorage.setItem('pa-sim-resultats',JSON.stringify(res));
  },[historique,[...futurs.map(t=>String(t.id)),absent,'<script>'],[{cat:'P250',place:1,nb:16,sexe:'messieurs',date:ilYa(15,11)},{cat:'P100',place:2,nb:16,sexe:'messieurs',date:ilYa(3)}]]);
  await page.reload();
  const points=await page.textContent('#mp-points');
  assert.match(points,/330/);assert.match(points,/−250/);assert.match(points,/sortent le/);
  ok('classement estimé affiché : total, points qui sortent, date de sortie');
  const matchs=await page.textContent('#mp-matchs');
  assert.match(matchs,/3 victoires sur 5/);assert.match(matchs,/en progrès/);
  assert.equal(await page.locator('#mp-matchs li').count(),5);
  assert.equal(await page.locator('#mp-matchs .mp-issue.v').count(),3);
  ok('derniers matchs : 5 affichés, victoires, tendance en hausse');
  await page.waitForFunction(()=>document.querySelectorAll('#mp-favoris li').length>0);
  const fav=await page.textContent('#mp-favoris');
  assert.equal(await page.locator('#mp-favoris li').count(),futurs.length);
  futurs.forEach(t=>assert.ok(fav.includes(t.ville),t.ville));
  ok('tournois favoris : ceux de la liste, identifiants inconnus ou invalides ignorés');
  await page.fill('#mp-rang','0');await page.click('#mp-form-rang button[type=submit]');
  assert.ok(await page.isVisible('#mp-rang-msg'));
  await page.fill('#mp-rang','4512');await page.click('#mp-form-rang button[type=submit]');
  let palier=await page.textContent('#mp-palier');
  assert.match(palier,/P100, P250, P500 et plus/);assert.match(palier,/Top 3 000|Top 3 000/);assert.match(palier,/1 512|1 512/);assert.match(palier,/P100 te seront fermés/);
  await page.click('label.tchip:has(input[value=dames])');await page.fill('#mp-rang','250');await page.click('#mp-form-rang button[type=submit]');
  palier=await page.textContent('#mp-palier');
  assert.match(palier,/P250, P500 et plus/);assert.match(palier,/Top 100/);
  await page.reload();
  assert.equal(await page.inputValue('#mp-rang'),'250');assert.ok(await page.isChecked('input[name=mp-sexe][value=dames]'));
  ok('rang : validation, catégories ouvertes, prochain cut, gardé après rechargement');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),390);
  ok('aucun débordement à 390 px');
  await page.close();

  // Connecté (faux client) : fusion des matchs du compte et de l'appareil, sans doublon
  const ctx2=await browser.newContext({viewport:{width:390,height:844}});
  const commun={joue_le:historique[0].fin.replace('Z','+00:00').replace(/\.\d{3}/,''),nom_a:'Nous',nom_b:'Eux',format:{egalite:'decisif',dernierSet:'super',serveur:0},points:historique[0].points,score:historique[0].score,vainqueur:0,interrompu:false};
  await ctx2.route('**/supabase-js@*/**',r=>r.fulfill({contentType:'text/javascript',body:fauxSdk(commun)}));
  await ctx2.route('**/*.supabase.co/**',r=>r.abort());
  await ctx2.route('https://gc.zgo.at/**',r=>r.fulfill({contentType:'text/javascript',body:''}));
  const page2=await ctx2.newPage();
  page2.on('pageerror',e=>erreurs.push(e.message));
  await page2.goto(base+'/compte.html');
  await page2.evaluate(h=>localStorage.setItem('pa-score-historique',JSON.stringify(h.slice(0,1))),historique);
  await page2.reload();
  await page2.waitForFunction(()=>document.querySelectorAll('#mp-matchs li').length===2);
  assert.match(await page2.textContent('#mp-matchs'),/Club/);
  ok('connecté : matchs du compte ajoutés, match présent des deux côtés affiché une seule fois');
  await ctx2.close();
  assert.deepEqual(erreurs,[]);
  ok('aucune erreur console');
  console.log('TOTAL '+nb+' contrôles réussis.');
 }finally{await browser.close();serveur.close();}
})().catch(e=>{console.error(e);serveur.close();process.exitCode=1;});
