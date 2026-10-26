/* Vérification des pages générées (scripts/generer-pages.js) :
   1) dans une copie temporaire du site : cycle de vie des tournois terminés (bandeau, noindex, suppression),
      mode partiel sans effet sur le sitemap, sortie déterministe ;
   2) sur le site : fiche (distance, calendrier), page département (filtres), à 390 px, sans erreur console.
   Lancer depuis la racine du site : node scripts/verifier-pages.cjs */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),os=require('node:os');
const {execFileSync}=require('node:child_process');
const {chromium}=require('playwright');
const racine=path.join(__dirname,'..');
let nb=0;
function ok(nom){nb++;console.log('OK '+nom);}
process.on('unhandledRejection',e=>{if(e&&e.name==='TargetClosedError')return;console.error(e);process.exitCode=1;});

/* ---- 1. Génération dans une copie ---- */
function copie(){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'padel-gen-'));
 for(const f of ['index.html','sitemap.xml','tournois.html'])fs.copyFileSync(path.join(racine,f),path.join(dir,f));
 fs.cpSync(path.join(racine,'assets/js'),path.join(dir,'assets/js'),{recursive:true});
 fs.mkdirSync(path.join(dir,'assets/data/fiches'),{recursive:true});
 fs.mkdirSync(path.join(dir,'scripts/cache'),{recursive:true});
 fs.copyFileSync(path.join(__dirname,'generer-pages.js'),path.join(dir,'scripts/generer-pages.js'));
 // Données réduites : 3 tournois en Seine-Maritime, 1 dans l'Eure
 const t=(id,dep,debut,fin,cat)=>({id,nom:'Tournoi '+id,categorie:cat,club:'CLUB '+id,ville:'ROUEN',cp:'76000',dep,lat:49.44,lng:1.1,date_debut:debut,date_fin:fin,sexes:['messieurs']});
 const tournois=[t('900001','76','2026-11-10','2026-11-10','P100'),t('900002','76','2026-11-20','2026-11-21','P25'),t('900003','76','2026-12-05','2026-12-05','P250'),t('900004','27','2026-11-15','2026-11-15','P50')];
 const ecrireDonnees=liste=>fs.writeFileSync(path.join(dir,'assets/data/tournois.json'),JSON.stringify({genere_le:'2026-10-26T00:00:00Z',tournois:liste}));
 ecrireDonnees(tournois);
 fs.writeFileSync(path.join(dir,'assets/data/fiches/76.json'),JSON.stringify({'900001':{adresse:'1 rue du Padel, 76000 Rouen',horaires:null,balles:'Head',commentaire:'Début à 9h.',epreuves:[{code:'DM',libelle:'DOUBLE MESSIEURS SENIOR',categorie:'P100',cut:'Interdit au top 5000',tarif:20,tableau:16}]}}));
 const lancer=(...a)=>execFileSync(process.execPath,[path.join(dir,'scripts/generer-pages.js'),'--departements','76,27','--tout',...a],{cwd:dir,encoding:'utf8'});
 return {dir,lancer,ecrireDonnees,tournois};
}
function generation(){
 const {dir,lancer,ecrireDonnees,tournois}=copie();
 const lire=f=>fs.readFileSync(path.join(dir,f),'utf8');
 lancer('--date','2026-10-26');
 const fiche=lire('tournoi/900001.html');
 assert.match(fiche,/<h1>Tournoi 900001<\/h1>/);assert.ok(!fiche.includes('noindex'));assert.ok(!fiche.includes('gen-termine'));
 assert.match(fiche,/"@type":"SportsEvent"/);assert.match(fiche,/class="hi"/,'colonne du tableau de 16 surlignée');
 assert.match(fiche,/Interdit au top 5000/);assert.match(fiche,/https:\/\/tenup\.fft\.fr\/tournoi\/900001/);
 assert.ok(Buffer.byteLength(fiche)<25000,'fiche < 25 Ko');
 assert.match(lire('tournois/76.html'),/Tournois de padel en Seine-Maritime/);assert.match(lire('tournois/27.html'),/Tournois de padel dans l&#39;Eure|Tournois de padel dans l'Eure/);
 assert.match(lire('sitemap.xml'),/tournoi\/900001\.html/);
 ok('génération : fiche, pages département, sitemap, taille < 25 Ko');
 const avant=lire('tournoi/900002.html');
 const sortie=lancer('--date','2026-10-26');
 assert.match(sortie,/Pages écrites : 0/);assert.equal(lire('tournoi/900002.html'),avant);
 ok('sortie déterministe : rien n\'est réécrit sans changement');
 // Le 900001 disparaît de Ten'Up après sa date : bandeau « Terminé », toujours indexé
 ecrireDonnees(tournois.slice(1));
 lancer('--date','2026-11-20');
 let f1=lire('tournoi/900001.html');
 assert.match(f1,/gen-termine/);assert.ok(!f1.includes('noindex'));assert.match(lire('sitemap.xml'),/tournoi\/900001\.html/);
 assert.ok(!lire('tournois/76.html').includes('tournoi/900001.html'),'plus dans la liste des tournois à venir');
 ok('tournoi terminé : bandeau « Terminé », page gardée et indexée');
 lancer('--date','2027-01-20');
 f1=lire('tournoi/900001.html');
 assert.match(f1,/noindex/);assert.ok(!lire('sitemap.xml').includes('tournoi/900001.html'));assert.match(f1,/tournois\/76\.html/);
 ok('après 60 jours : noindex, sorti du sitemap, renvoi vers le département');
 lancer('--date','2027-12-01');
 assert.ok(!fs.existsSync(path.join(dir,'tournoi/900001.html')));
 ok('après un an : page supprimée');
 // Tournoi retiré de Ten'Up avant sa date : pas de page fantôme
 ecrireDonnees(tournois.filter(t=>t.id!=='900003'));
 lancer('--date','2026-10-27');
 assert.ok(!fs.existsSync(path.join(dir,'tournoi/900003.html')));
 ok('tournoi annulé avant sa date : page supprimée');
 // Mode partiel : ni sitemap ni liste des départements modifiés
 const sitemap=lire('sitemap.xml');
 execFileSync(process.execPath,[path.join(dir,'scripts/generer-pages.js'),'--departements','27','--date','2026-10-27'],{cwd:dir});
 assert.equal(lire('sitemap.xml'),sitemap);
 ok('mode partiel : sitemap inchangé');
 fs.rmSync(dir,{recursive:true,force:true});
}

/* ---- 2. Pages du site, dans le navigateur ---- */
const serveur=http.createServer((req,res)=>{
 const rel=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\//,'')||'index.html';
 const p=path.resolve(racine,rel);
 if(!p.startsWith(racine+path.sep)){res.writeHead(403);res.end();return;}
 fs.readFile(p,(e,b)=>{if(e){res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.webp':'image/webp','.webmanifest':'application/manifest+json'})[path.extname(p)]||'text/plain');res.end(b);
 });
});
(async()=>{
 generation();
 await new Promise(r=>serveur.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+serveur.address().port;
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const erreurs=[];
 try{
  const ctx=await browser.newContext({serviceWorkers:'block',viewport:{width:390,height:844},isMobile:true,hasTouch:true,acceptDownloads:true,geolocation:{latitude:49.44,longitude:1.1},permissions:['geolocation']});
  await ctx.route('https://gc.zgo.at/**',r=>r.fulfill({contentType:'text/javascript',body:''}));
  const page=await ctx.newPage();
  page.on('pageerror',e=>erreurs.push(e.message));
  page.on('console',m=>{if(m.type()==='error')erreurs.push(m.text());});
  // Page département : filtres + département mémorisé
  await page.goto(base+'/tournois/76.html');
  const total=await page.locator('#gl-liste .gen-item').count();
  assert.ok(total>5);
  await page.click('label.tchip:has(input[value="P25"])');
  const visibles=await page.locator('#gl-liste .gen-item:not([hidden])').count();
  assert.ok(visibles>0&&visibles<total);
  assert.equal(await page.locator('#gl-liste .gen-item:not([hidden]) .cat-badge').filter({hasNotText:'P25'}).count(),0);
  assert.match(await page.textContent('#gl-compteur'),new RegExp(visibles+' tournoi'));
  assert.equal(await page.evaluate(()=>localStorage.getItem('pa-mon-departement')),'76');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),390);
  ok('page département : filtre catégorie, compteur, département mémorisé, 390 px');
  // Fiche : distance depuis le département, puis position précise, calendrier
  const lien=await page.locator('#gl-liste .gen-item:not([hidden]) a').first().getAttribute('href');
  await page.goto(new URL(lien,base+'/tournois/76.html').href);
  await page.waitForSelector('#ft-distance:not([hidden])');
  assert.match(await page.textContent('#ft-distance'),/km.*Seine-Maritime/);
  await page.click('#ft-position');
  await page.waitForFunction(()=>/de ta position/.test(document.getElementById('ft-distance').textContent));
  assert.ok(await page.evaluate(()=>!!JSON.parse(localStorage.getItem('pa-ma-position')).lat));
  ok('fiche : distance depuis le département, puis depuis la position précise');
  const [dl]=await Promise.all([page.waitForEvent('download'),page.click('#ft-calendrier')]);
  const ics=fs.readFileSync(await dl.path(),'utf8');
  assert.match(ics,/BEGIN:VEVENT/);assert.match(ics,/TRIGGER:-P7D/);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),390);
  ok('fiche : fichier calendrier, aucun débordement à 390 px');
  // Région × catégorie
  await page.goto(base+'/tournois/normandie/p100.html');
  assert.match(await page.textContent('h1'),/P100 en Normandie/);
  ok('page région × catégorie');
  assert.deepEqual(erreurs,[]);
  ok('aucune erreur console');
  console.log('TOTAL '+nb+' contrôles réussis.');
 }finally{await browser.close();serveur.close();}
})().catch(e=>{console.error(e);serveur.close();process.exitCode=1;});
