/* Vérification du labo des trajectoires (simulateur-3d.html#labo, assets/js/p3d/labo.js) :
   1) sous Node : préréglages copiés des scénarios, chiffres cohérents avec le moteur (vitesse, filet, rebond),
      fautes reconnues (filet, paroi avant le sol), labo absent des pages de scénario ;
   2) dans Edge : préréglages et curseurs (chiffres affichés = analyse du moteur), cible et frappe placées en touchant
      la vue de dessus, cible « passage », 1280 / 390 / 320 px sans débordement, console sans erreur.
   Lancer depuis la racine du site : node scripts/verifier-labo-trajectoires.cjs */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {pathToFileURL}=require('node:url');
const {chromium}=require('playwright');
const racine=path.join(__dirname,'..');
let nb=0;
function ok(nom){nb++;console.log('OK '+nom);}
const module3d=f=>import(pathToFileURL(path.join(racine,'assets/js/p3d',f)).href);

async function horsNavigateur(){
 const {analyser,PREREGLAGES}=await module3d('labo.js');
 const {viser,trajectoire}=await module3d('physique.js');
 const {calculer}=await module3d('scenarios.js');
 const {BALLE,TERRAIN}=await module3d('constantes.js');
 // Préréglages : frappes réelles des scénarios (départ calculé, cible et temps de vol du JSON)
 for(const p of PREREGLAGES){
  const s=JSON.parse(fs.readFileSync(path.join(racine,'assets/3d/scenarios',p.source+'.json'),'utf8')),c=calculer(s);
  const f=c.frappes.find(f=>Math.abs(f.cible[0]-p.cible[0])<1e-9&&Math.abs(f.cible[2]-p.cible[1])<1e-9&&f.vol===p.vol);
  assert.ok(f,p.id+' : frappe introuvable dans '+p.source);
  assert.ok(f.depart.every((v,i)=>Math.abs(v-p.depart[i])<0.01),p.id+' : point de départ');
  assert.equal(p.passage,f.cible[1]<0.05?null:f.cible[1],p.id+' : rebond ou passage');
  const a=analyser(p);
  assert.ok(a.verdict.bonne,p.id+' : '+a.verdict.texte);
  // Vitesse et rebond : ceux du moteur
  const v=viser(p.depart,[p.cible[0],p.passage??BALLE.diametre/2,p.cible[1]],p.vol);
  assert.ok(Math.abs(a.vitesse-Math.hypot(...v)*3.6)<1e-9,p.id+' vitesse');
  const sol=trajectoire(p.depart,v,5).evenements.find(e=>e.type==='sol');
  assert.ok(Math.abs(a.rebond.z-sol.p[2])<1e-9&&a.rebond.z>0,p.id+' rebond');
  assert.ok(a.filet&&!a.filet.touche&&a.filet.marge>0,p.id+' filet passé');
  assert.ok(a.hauteurMax>=Math.max(p.depart[1],a.filet.hauteur)-1e-9,p.id+' hauteur maximale');
  // Rebond à la cible, à la résolution du moteur près (distance parcourue en un pas de 1/240 s)
  if(p.passage==null)assert.ok(Math.hypot(sol.p[0]-p.cible[0],sol.p[2]-p.cible[1])<0.05+a.vitesse/3.6/240,p.id+' : rebond à la cible');
 }
 ok('6 préréglages = frappes des scénarios ; vitesse, rebond et passage du filet = moteur du simulateur ; balles bonnes');
 // Fautes
 const filet=analyser({depart:[0,0.5,-8],cible:[0,6],passage:null,vol:0.6});
 assert.equal(filet.verdict.bonne,false);assert.ok(filet.filet.touche);assert.match(filet.verdict.texte,/filet/);
 const vitre=analyser({depart:[0,1,-3],cible:[0,9.95],passage:2.5,vol:0.5});
 assert.equal(vitre.verdict.bonne,false);assert.match(vitre.verdict.texte,/vitre du fond avant le sol/);
 const lateral=analyser({depart:[0,1,-3],cible:[-4.97,5],passage:1.5,vol:0.5});
 assert.equal(lateral.verdict.bonne,false);assert.match(lateral.verdict.texte,/latérale? avant le sol/);
 const service=analyser({depart:[0,1,-3],cible:[1,4],passage:null,vol:0.9});
 assert.match(service.verdict.texte,/carré de service/);assert.ok(service.rebond.z<=TERRAIN.ligneService);
 ok('fautes reconnues : filet, vitre du fond et paroi latérale avant le sol ; lieu du rebond (carré de service / fond)');
 // Le labo reste sur la page principale
 const pages=fs.readdirSync(racine).filter(f=>/^simulateur-3d-.+\.html$/.test(f));
 assert.ok(pages.length>=20);
 pages.forEach(f=>{const h=fs.readFileSync(path.join(racine,f),'utf8');assert.ok(!h.includes('id="labo"')&&!h.includes('import "./assets/js/p3d/labo.js"'),f);});
 const h=fs.readFileSync(path.join(racine,'simulateur-3d.html'),'utf8');
 assert.ok(h.indexOf('<script type="importmap">')<h.indexOf('import "./assets/js/p3d/labo.js"'),'labo chargé après la carte d’import');
 ok('labo sur la page principale seulement (absent des '+pages.length+' pages de scénario), chargé après la carte d’import');
}

const TYPES={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.glb':'model/gltf-binary','.webmanifest':'application/manifest+json'};
const serveur=http.createServer((req,res)=>{
 const rel=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\//,'')||'index.html';
 const p=path.resolve(racine,rel);
 if(!p.startsWith(racine+path.sep)){res.writeHead(403);res.end();return;}
 fs.readFile(p,(e,b)=>{if(e){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',TYPES[path.extname(p)]||'text/plain');res.end(b);});
});

async function dansLeNavigateur(base){
 // Sans 3D (le labo n'en a pas besoin) : WebGL coupé, la page affiche son message et le labo marche
 const browser=await chromium.launch({channel:'msedge',headless:true,args:['--disable-gpu','--disable-webgl']});
 const erreurs=[];
 try{
  for(const [largeur,hauteur] of [[1280,900],[390,844],[320,700]]){
   const ctx=await browser.newContext({serviceWorkers:'block',viewport:{width:largeur,height:hauteur}});
   await ctx.route(/^https:/,r=>r.fulfill({status:200,body:''}));
   await ctx.route('**/assets/vendor/supabase-*.js*',r=>r.fulfill({contentType:'text/javascript',body:''})); // comptes indisponibles : le SDK (sur le site) est bloqué aussi
   const page=await ctx.newPage();
   page.on('pageerror',e=>erreurs.push(e.message));
   page.on('console',m=>{if(m.type()==='error'&&!/WebGL|3D/i.test(m.text()))erreurs.push(m.text());});
   await page.goto(base+'/simulateur-3d.html#labo');
   await page.waitForSelector('#labo-verdict');
   const affiche=()=>page.evaluate(()=>({vitesse:document.getElementById('labo-vitesse').textContent,filet:document.getElementById('labo-filet').textContent,verdict:document.getElementById('labo-verdict').textContent,rebond:document.getElementById('labo-rebond').textContent}));
   const attendu=r=>page.evaluate(r=>{const a=P3D_LABO.analyser(r);return {vitesse:Math.round(a.vitesse)+' km/h',verdict:a.verdict.texte};},r);
   if(largeur===1280){
    assert.equal(await page.locator('[data-prereglage]').count(),6);
    for(const id of ['lob','sortie','bandeja','volee','coup-droit','smash']){
     await page.click(`[data-prereglage="${id}"]`);
     assert.equal(await page.getAttribute(`[data-prereglage="${id}"]`,'aria-pressed'),'true');
     const p=await page.evaluate(id=>P3D_LABO.PREREGLAGES.find(x=>x.id===id),id);
     const a=await affiche(),e=await attendu(p);
     assert.equal(a.vitesse,e.vitesse,id);assert.equal(a.verdict,e.verdict,id);
     assert.equal(await page.isVisible('#labo-ch'),p.passage!=null,id+' : curseur de passage');
     assert.ok(await page.locator('#labo-svg-cote .labo-trace').count()===1&&await page.locator('#labo-svg-dessus .labo-ev-sol').count()>=1,id+' : trajectoire et rebond dessinés');
    }
    // Curseur : temps de vol plus court = frappe plus rapide ; le préréglage n'est plus « actif »
    await page.click('[data-prereglage="bandeja"]');
    const avant=parseInt((await affiche()).vitesse);
    await page.$eval('#labo-vol',e=>{e.value='0.6';e.dispatchEvent(new Event('input'));});
    assert.ok(parseInt((await affiche()).vitesse)>avant,'temps de vol plus court, frappe plus rapide');
    assert.equal(await page.textContent('#labo-vol-val'),'0,60 s');
    assert.equal(await page.getAttribute('[data-prereglage="bandeja"]','aria-pressed'),'false');
    // Toucher la vue de dessus : camp adverse = cible, ton camp = frappe (x écran = -x, y écran = -z)
    const clic=async(x,z)=>{const [sx,sy]=await page.$eval('#labo-svg-dessus',(s,[x,z])=>{const p=new DOMPoint(-x,-z).matrixTransform(s.getScreenCTM());return [p.x,p.y];},[x,z]);await page.mouse.click(sx,sy);};
    await page.$eval('#labo-svg-dessus',e=>e.scrollIntoView({block:'center',behavior:'instant'}));
    await clic(-3,5);
    assert.ok(Math.abs(Number(await page.inputValue('#labo-cx'))-3)<0.05&&Math.abs(Number(await page.inputValue('#labo-cz'))-5)<0.05,'cible placée au toucher');
    await clic(2,-6);
    assert.ok(Math.abs(Number(await page.inputValue('#labo-fx'))+2)<0.05&&Math.abs(Number(await page.inputValue('#labo-fz'))-6)<0.05,'frappe placée au toucher');
    // Cible « passage » : curseur de hauteur, cible à hauteur choisie
    await page.click('[data-mode="passage"]');
    assert.equal(await page.isVisible('#labo-ch'),true);
    const r=await page.evaluate(()=>({depart:[2,Number(document.getElementById('labo-fy').value),-6],cible:[-3,5],passage:Number(document.getElementById('labo-ch').value),vol:0.6}));
    assert.equal((await affiche()).vitesse,(await attendu(r)).vitesse,'passage : chiffres du moteur');
    await page.click('[data-mode="rebond"]');
    assert.equal(await page.isVisible('#labo-ch'),false);
    ok('1280 px : 6 préréglages (chiffres = moteur), curseurs, frappe et cible placées au toucher, cible « passage »');
   }else{
    await page.click('[data-prereglage="smash"]');
    // Vue de côté lisible sur téléphone : au moins 150 px de haut
    const h=await page.$eval('#labo-svg-cote',s=>s.getBoundingClientRect().height);
    assert.ok(h>=150,largeur+' px : vue de côté de '+Math.round(h)+' px');
   }
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,largeur+' px : pas de débordement');
   await ctx.close();
  }
  ok('390 et 320 px : vue de côté étirée et lisible, aucun débordement');
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
