/* Vérification du simulateur 3D (simulateur-3d.html, assets/js/p3d/, assets/3d/) :
   1) sous Node, sans navigateur : dimensions FIP, physique de la balle (rebond réglementaire, déterminisme, filet, vitres),
      visée, scénarios (validation stricte, synchronisation balle / joueurs), gestes, licences, versionnement, service worker ;
   2) dans Edge (rendu logiciel) : chargement sans erreur, lecture / pause / étapes / vitesse, six caméras, changement de
      scénario, 390 px sans débordement, repli sans WebGL, repli si le modèle 3D ne se charge pas.
   Le rendu logiciel de la machine de test ne dit rien de la fluidité réelle : à mesurer sur de vrais appareils.
   Lancer depuis la racine du site : node scripts/verifier-simulateur-3d.cjs */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {execFileSync}=require('node:child_process');
const {pathToFileURL}=require('node:url');
const {chromium}=require('playwright');
const racine=path.join(__dirname,'..');
let nb=0;
function ok(nom){nb++;console.log('OK '+nom);}
const module3d=f=>import(pathToFileURL(path.join(racine,'assets/js/p3d',f)).href);
const lireScenario=id=>JSON.parse(fs.readFileSync(path.join(racine,'assets/3d/scenarios',id+'.json'),'utf8'));
const SCENARIOS=['bandeja-garder-filet','monter-apres-lob','servir-monter','smash-lob-court','defendre-double-vitre'];

/* ---- 1. Sans navigateur ---- */
async function horsNavigateur(){
 const {TERRAIN,BALLE,PHYSIQUE,RAQUETTE,hauteurFilet,paroiLaterale}=await module3d('constantes.js');
 const {pas,trajectoire,viser}=await module3d('physique.js');
 const {valider,calculer,ecartsHorsPortee,positionBalle,positionJoueur,frappeProche}=await module3d('scenarios.js');
 const {GESTES,INSTANTS,angles}=await module3d('gestes.js');

 assert.equal(TERRAIN.longueur,20);assert.equal(TERRAIN.largeur,10);assert.equal(TERRAIN.ligneService,6.95);
 assert.equal(hauteurFilet(0),0.88);assert.equal(hauteurFilet(5),0.92);assert.equal(hauteurFilet(-5),0.92);
 assert.equal(TERRAIN.fondVitre,3);assert.equal(TERRAIN.hauteurTotale,4);
 assert.deepEqual(paroiLaterale(9.5),{vitre:3,haut:4});assert.deepEqual(paroiLaterale(-7),{vitre:2,haut:4});
 assert.deepEqual(paroiLaterale(4),{vitre:0,haut:4});assert.deepEqual(paroiLaterale(0),{vitre:0,haut:3});
 assert.ok(BALLE.diametre>=0.0635&&BALLE.diametre<=0.0677);assert.ok(BALLE.masse>=0.056&&BALLE.masse<=0.0594);
 assert.ok(RAQUETTE.longueur<=0.455&&RAQUETTE.largeur<=0.26&&RAQUETTE.epaisseur<=0.038);
 ok('dimensions du règlement FIP : terrain, filet, enceinte (variante 1), balle, raquette');

 // Rebond réglementaire : lâchée de 2,54 m, la balle remonte entre 1,35 et 1,45 m
 const chute=trajectoire([0,2.54,-5],[0,0,0],2.5);
 const premier=chute.evenements.find(e=>e.type==='sol');
 const second=chute.evenements.filter(e=>e.type==='sol')[1];
 const apres=chute.points.slice(Math.round(premier.t/PHYSIQUE.pas),second?Math.round(second.t/PHYSIQUE.pas):undefined);
 const remontee=Math.max(...apres.map(p=>p[1]));
 assert.ok(remontee>=1.35&&remontee<=1.45,'remontée '+remontee);
 ok('rebond au sol réglementaire : '+remontee.toFixed(3).replace('.',',')+' m (FIP : 1,35 à 1,45 m)');

 const a=trajectoire([1,1,-8],[-2,6,14],2),b=trajectoire([1,1,-8],[-2,6,14],2);
 assert.deepEqual(a.points,b.points);assert.deepEqual(a.evenements,b.evenements);
 ok('physique déterministe : mêmes conditions, même trajectoire au pas fixe');

 const cible=[-2,0.033,7],v=viser([1,1,-8],cible,1.3),arrivee=trajectoire([1,1,-8],v,1.3).final.p;
 assert.ok(Math.hypot(...arrivee.map((x,i)=>x-cible[i]))<0.01);
 ok('visée : la balle atteint la cible demandée à moins de 1 cm, au temps de vol demandé');

 assert.equal(trajectoire([0,0.5,-3],[0,1,12],1).evenements[0].type,'filet');
 assert.equal(trajectoire([0,1,5],[0,2,18],1.5).evenements[0].type,'vitre');
 assert.equal(trajectoire([0,1,5],[0,8,14],1.5).evenements[0].type,'grille');
 const vitre=trajectoire([0,1,5],[0,2,18],1.5),rebond=vitre.evenements[0];
 const vz=pas({p:rebond.p,v:[0,0,0]}).etat.v[2];assert.ok(vz<=0);
 ok('collisions : balle basse dans le filet, balle dans la vitre du fond, balle haute dans le grillage');

 for(const id of SCENARIOS){
  const s=lireScenario(id);
  assert.deepEqual(valider(s),[],id);
  const c=calculer(s);
  assert.deepEqual(ecartsHorsPortee(c),[],id+' : balle hors de portée d\'un frappeur');
  c.ecarts.forEach(e=>assert.ok(e.horizontale<1.2,id+' frappe '+e.frappe));
  assert.ok(!c.evenements.some(e=>e.type==='dehors'),id+' : balle sortie');
  // Chaque frappe passe le filet sans le toucher, et part du côté du frappeur
  c.frappes.forEach((f,i)=>{
   const camp=f.joueur[0]==='A'?-1:1;
   assert.equal(Math.sign(f.depart[2]),camp,id+' frappe '+(i+1)+' : départ du bon côté');
   assert.equal(Math.sign(f.cible[2]),-camp,id+' frappe '+(i+1)+' : cible chez l\'adversaire');
   const fin=i+1<c.frappes.length?c.frappes[i+1].t:s.duree;
   assert.ok(!c.evenements.some(e=>e.type==='filet'&&e.t>=f.t&&e.t<fin),id+' frappe '+(i+1)+' : filet touché');
   // Synchronisation : à l'instant de la frappe, la balle est au point de départ calculé
   assert.deepEqual(positionBalle(c,f.t),f.depart);
   assert.ok(frappeProche(c,f.joueur,f.t).phase===0);
  });
  // Joueurs dans l'enceinte et à une vitesse humaine (moins de 7 m/s)
  for(const [jid,cles] of Object.entries(s.positions)){
   for(let t=0;t<=s.duree;t+=0.05){
    const p=positionJoueur(cles,t),q=positionJoueur(cles,t+0.05);
    assert.ok(Math.abs(p[0])<=5&&Math.abs(p[1])<=10,id+' '+jid+' dans l\'enceinte');
    assert.ok(Math.hypot(q[0]-p[0],q[1]-p[1])/0.05<7,id+' '+jid+' vitesse humaine à '+t.toFixed(2));
   }
  }
 }
 ok(SCENARIOS.length+' scénarios valides et synchronisés : balle à portée de chaque frappeur, filet franchi, joueurs à vitesse humaine');

 const base=lireScenario(SCENARIOS[0]);
 const essai=modif=>{const s=JSON.parse(JSON.stringify(base));modif(s);return valider(s);};
 assert.ok(essai(s=>{s.code='alert(1)';}).length);
 assert.ok(essai(s=>{s.lien='javascript:alert(1)';}).length);
 assert.ok(essai(s=>{s.lien='https://exemple.com/';}).length);
 assert.ok(essai(s=>{s.joueurs.pop();}).length);
 assert.ok(essai(s=>{s.frappes[1].geste='coup_magique';}).length);
 assert.ok(essai(s=>{s.frappes[1].depart=[0,1,0];}).length);
 assert.ok(essai(s=>{s.frappes[0].cible=[0,'1',0];}).length);
 assert.ok(essai(s=>{s.positions.A1[2][0]=0.1;}).length);
 assert.ok(essai(s=>{s.positions.A1[1][1]=40;}).length);
 assert.ok(essai(s=>{s.titre='x'.repeat(5000);}).length);
 assert.ok(essai(s=>{s.duree=Infinity;}).length);
 assert.deepEqual(valider(null),['Le scénario doit être un objet JSON.']);
 ok('validation stricte : champ inconnu, lien externe, geste inconnu, nombres invalides, positions incohérentes refusés');

 for(const [id,g] of Object.entries(GESTES)){
  assert.equal(g.statut,'simplifie',id);
  assert.equal(g.phases.length,3,id+' : trois phases expliquées');
  ['tronc','avant','cote','coude','poignet','genoux'].forEach(k=>assert.equal(g[k].length,INSTANTS.length,id+' '+k));
  for(let p=-1;p<=1;p+=0.05)Object.values(angles(id,p)).forEach(x=>assert.ok(Number.isFinite(x)));
  // Au contact, le bras n'est pas en position d'attente
  assert.notDeepEqual(angles(id,0),angles(null,0),id+' : contact différent de la garde');
 }
 assert.deepEqual(angles('coup_magique',0),angles(null,0),'geste inconnu : position d\'attente');
 const utilises=new Set(SCENARIOS.flatMap(id=>lireScenario(id).frappes.map(f=>f.geste)));
 assert.deepEqual([...utilises].sort(),Object.keys(GESTES).sort(),'chaque geste est montré dans au moins un scénario');
 ok('gestes : les 12 coups construits (statut « simplifié »), chacun montré dans un scénario');

 const licences=fs.readFileSync(path.join(racine,'assets/3d/LICENCES-3D.md'),'utf8');
 for(const dossier of ['assets/3d/vendor','assets/3d/modeles'])
  for(const f of fs.readdirSync(path.join(racine,dossier)))assert.ok(licences.includes(f),f+' absent de LICENCES-3D.md');
 assert.match(licences,/CC0/);assert.match(licences,/MIT/);assert.match(licences,/Quaternius/);
 assert.ok(fs.readFileSync(path.join(racine,'assets/3d/vendor/three.module.min.js'),'utf8').length>500000);
 ok('assets 3D : chaque fichier a sa source, son auteur et sa licence dans LICENCES-3D.md');

 const html=fs.readFileSync(path.join(racine,'simulateur-3d.html'),'utf8');
 const carte=JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports;
 assert.match(carte.three,/^\.\/assets\/3d\/vendor\/three\.module\.min\.js\?v=[0-9a-f]{10}$/);
 for(const f of fs.readdirSync(path.join(racine,'assets/js/p3d')))assert.match(carte['./assets/js/p3d/'+f],/\?v=[0-9a-f]{10}$/,f);
 assert.match(html,/assets\/simulateur-3d\.css\?v=[0-9a-f]{10}/);
 execFileSync(process.execPath,[path.join(__dirname,'appliquer-gabarit.js'),'--verifier'],{encoding:'utf8'});
 const sw=fs.readFileSync(path.join(racine,'sw.js'),'utf8');
 const shell=sw.slice(sw.indexOf('const SHELL'),sw.indexOf('];',sw.indexOf('const SHELL')));
 assert.ok(!shell.includes('3d')&&!shell.includes('simulateur'),'rien de la 3D dans le précache');
 assert.match(sw,/\/assets\/3d\//);
 assert.match(fs.readFileSync(path.join(racine,'tactique.html'),'utf8'),/href="simulateur-3d\.html"/);
 ok('page : modules versionnés par la carte d\'import, gabarit à jour, 3D hors précache, lien depuis Tactique');
}

/* ---- 2. Dans le navigateur ---- */
const TYPES={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.webp':'image/webp','.glb':'model/gltf-binary','.webmanifest':'application/manifest+json'};
const serveur=http.createServer((req,res)=>{
 const rel=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\//,'')||'index.html';
 const p=path.resolve(racine,rel);
 if(!p.startsWith(racine+path.sep)){res.writeHead(403);res.end();return;}
 fs.readFile(p,(e,b)=>{if(e){res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type',TYPES[path.extname(p)]||'text/plain');res.end(b);
 });
});
async function contexte(browser,options={}){
 const ctx=await browser.newContext({serviceWorkers:'block',...options});
 await ctx.route('https://**',r=>r.fulfill({status:200,body:''})); // aucun accès extérieur (polices, compteur)
 await ctx.route('https://gc.zgo.at/**',r=>r.fulfill({contentType:'text/javascript',body:''}));
 return ctx;
}
function suivre(page,erreurs){
 page.on('pageerror',e=>erreurs.push(e.message));
 page.on('console',m=>{if(m.type()==='error')erreurs.push(m.text());});
}
const pret=page=>page.waitForFunction(()=>window.P3D&&P3D.etat.pret3d&&P3D.etat.images>2,null,{timeout:60000});

async function dansLeNavigateur(base){
 const browser=await chromium.launch({channel:'msedge',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const erreurs=[];
 try{
  let ctx=await contexte(browser,{viewport:{width:1280,height:800}});
  let page=await ctx.newPage();suivre(page,erreurs);
  await page.goto(base+'/simulateur-3d.html');
  await pret(page);
  assert.equal(await page.evaluate(()=>P3D.etat.modele),true,'modèle 3D chargé');
  assert.equal(await page.isHidden('#p3d-chargement'),true);
  assert.equal(await page.isHidden('#p3d-sans-3d'),true);
  assert.equal(await page.locator('#p3d-scenarios button').count(),SCENARIOS.length);
  assert.equal(await page.locator('#p3d-etiquettes .p3d-etiquette').count(),4);
  assert.match(await page.textContent('#p3d-titre-scenario'),/bandeja/i);
  assert.equal(await page.locator('#p3d-explication li').count(),3);
  ok('chargement : terrain, quatre joueurs animés, balle, textes du scénario');

  await page.click('#p3d-lecture');
  await page.waitForFunction(()=>P3D.etat.t>0.3);
  assert.equal(await page.getAttribute('#p3d-lecture','aria-pressed'),'true');
  await page.click('#p3d-lecture');
  const t1=await page.evaluate(()=>P3D.etat.t);await page.waitForTimeout(400);
  assert.equal(await page.evaluate(()=>P3D.etat.t),t1,'pause : le temps ne bouge plus');
  await page.click('#p3d-suiv');
  const etapes=await page.evaluate(()=>P3D.etat.scenario.etapes.map(e=>e.t));
  const t2=await page.evaluate(()=>P3D.etat.t);
  assert.ok(etapes.includes(t2)&&t2>t1-1e-9,'étape suivante');
  assert.match(await page.textContent('#p3d-etape-num'),new RegExp('Étape '+(etapes.indexOf(t2)+1)+' sur '+etapes.length));
  await page.click('#p3d-prec');
  assert.ok(await page.evaluate(()=>P3D.etat.t)<t2);
  await page.click('#p3d-debut');
  assert.equal(await page.evaluate(()=>P3D.etat.t),0);
  await page.click('#p3d-etapes li:nth-child(3) button');
  assert.equal(await page.evaluate(()=>P3D.etat.t),etapes[2]);
  assert.equal(await page.getAttribute('#p3d-etapes li:nth-child(3) button','aria-current'),'step');
  ok('lecteur : lecture, pause, étape suivante et précédente, recommencer, étapes cliquables');

  await page.click('#p3d-debut');
  await page.selectOption('#p3d-vitesse','0.25');
  await page.click('#p3d-lecture');
  await page.waitForTimeout(1200);await page.click('#p3d-lecture');
  const lent=await page.evaluate(()=>P3D.etat.t);
  assert.ok(lent>0.05&&lent<0.6,'vitesse × 0,25 : '+lent);
  await page.focus('#p3d-scene');await page.keyboard.press('ArrowRight');
  assert.ok(await page.evaluate(()=>P3D.etat.t)>lent);
  await page.keyboard.press('Space');
  assert.equal(await page.evaluate(()=>P3D.etat.lecture),true);
  await page.keyboard.press('Space');
  ok('vitesse réduite (× 0,25) et commandes au clavier');

  const vues=await page.$$eval('#p3d-vues button',l=>l.map(b=>b.dataset.vue));
  assert.deepEqual([...vues].sort(),['aerienne','balle','joueur','laterale','libre','tactique']);
  for(const v of vues){
   await page.click(`#p3d-vues button[data-vue="${v}"]`);
   assert.equal(await page.getAttribute(`#p3d-vues button[data-vue="${v}"]`,'aria-pressed'),'true');
   const avant=await page.evaluate(()=>P3D.etat.images);
   await page.waitForFunction(n=>P3D.etat.images>n+1,avant);
  }
  assert.match(await page.textContent('#p3d-aide-libre'),/Fais glisser/);
  ok('six caméras : tactique, aérienne, derrière toi, latérale, suivi balle, libre');

  await page.click('#p3d-scenarios button[data-id="monter-apres-lob"]');
  await page.waitForFunction(()=>P3D.etat.scenario.id==='monter-apres-lob');
  assert.equal(await page.evaluate(()=>location.hash),'#monter-apres-lob');
  assert.equal(await page.evaluate(()=>P3D.etat.t),0);
  assert.match(await page.textContent('#p3d-titre-scenario'),/Monter au filet/);
  assert.equal(await page.locator('#p3d-etiquettes .p3d-etiquette').count(),4);
  await page.evaluate(()=>P3D.aller(1.3));
  assert.match(await page.textContent('#p3d-geste'),/Partenaire · Sortie de vitre \(geste simplifié\)/);
  ok('changement de scénario : textes, joueurs, adresse (#monter-apres-lob), geste en cours affiché avec son statut');
  // Chaque scénario se charge et affiche, à chaque frappe, le joueur et le geste joués
  for(const id of SCENARIOS){
   await page.click(`#p3d-scenarios button[data-id="${id}"]`);
   await page.waitForFunction(id=>P3D.etat.scenario.id===id,id);
   for(const f of await page.evaluate(()=>P3D.etat.scenario.frappes)){
    await page.evaluate(t=>P3D.aller(t),f.t);
    const n=await page.evaluate(()=>P3D.etat.images);
    await page.waitForFunction(n=>P3D.etat.images>n,n);
    const nom=await page.evaluate(f=>P3D.etat.scenario.joueurs.find(j=>j.id===f.joueur).nom,f);
    assert.ok((await page.textContent('#p3d-geste')).startsWith(nom+' · '),id+' t='+f.t);
   }
  }
  ok('les '+SCENARIOS.length+' scénarios se jouent : à chaque frappe, joueur et geste affichés');
  await ctx.close();

  // Téléphone : 390 px, pas de débordement, lien direct vers un scénario
  ctx=await contexte(browser,{viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  page=await ctx.newPage();suivre(page,erreurs);
  await page.goto(base+'/simulateur-3d.html#monter-apres-lob');
  await pret(page);
  assert.equal(await page.evaluate(()=>P3D.etat.scenario.id),'monter-apres-lob');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),390);
  const boite=await page.locator('#p3d-scene').boundingBox();
  assert.ok(boite.width>=350&&boite.height>=300);
  fs.mkdirSync(path.join(racine,'scripts/captures'),{recursive:true});
  await page.screenshot({path:path.join(racine,'scripts/captures/simulateur-3d-mobile.png')});
  ok('390 px : scène lisible, aucune barre de défilement horizontale, lien direct vers un scénario');
  await ctx.close();

  // Sans WebGL : message, lien vers le 2D, étapes lisibles
  ctx=await contexte(browser,{viewport:{width:390,height:844}});
  await ctx.addInitScript(()=>{const d=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(t,...r){return /webgl/.test(t)?null:d.call(this,t,...r);};});
  page=await ctx.newPage();suivre(page,erreurs);
  await page.goto(base+'/simulateur-3d.html');
  await page.waitForSelector('#p3d-sans-3d:not([hidden])');
  assert.equal(await page.isHidden('#p3d-scene'),true);
  assert.equal(await page.getAttribute('#p3d-sans-3d a','href'),'tactique.html#placement');
  assert.ok(await page.locator('#p3d-etapes li').count()>=5);
  await page.click('#p3d-suiv');
  assert.match(await page.textContent('#p3d-etape-num'),/Étape 2/);
  ok('sans WebGL : message, lien vers le simulateur 2D, étapes du scénario lisibles et navigables');
  await ctx.close();

  // Modèle 3D indisponible : mannequins simplifiés, la scène reste utilisable
  ctx=await contexte(browser,{viewport:{width:1280,height:800}});
  await ctx.route('**/assets/3d/modeles/**',r=>r.abort());
  page=await ctx.newPage();
  const erreursModele=[];suivre(page,erreursModele);
  await page.goto(base+'/simulateur-3d.html');
  await pret(page);
  assert.equal(await page.evaluate(()=>P3D.etat.modele),false);
  await page.click('#p3d-lecture');await page.waitForFunction(()=>P3D.etat.t>0.3);
  assert.deepEqual(erreursModele.filter(e=>!/joueur\.glb|ERR_FAILED/.test(e)),[]);
  ok('modèle 3D indisponible : mannequins simplifiés, lecture possible');
  await ctx.close();
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
