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
// Tous les scénarios du dossier (chaque fichier doit être proposé par la page)
const SCENARIOS=fs.readdirSync(path.join(racine,'assets/3d/scenarios')).filter(f=>f.endsWith('.json')).map(f=>f.slice(0,-5)).sort((a,b)=>a==='bandeja-garder-filet'?-1:b==='bandeja-garder-filet'?1:a.localeCompare(b));

/* ---- 1. Sans navigateur ---- */
async function horsNavigateur(){
 const {TERRAIN,BALLE,PHYSIQUE,RAQUETTE,hauteurFilet,paroiLaterale}=await module3d('constantes.js');
 const {pas,trajectoire,viser}=await module3d('physique.js');
 const {valider,calculer,ecartsHorsPortee,positionBalle,positionJoueur,frappeProche}=await module3d('scenarios.js');
 const {GESTES,INSTANTS,angles,V2}=await module3d('gestes.js');

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
  // Une balle ne sort du terrain (par 3, par 4) qu'après la dernière frappe : c'est le point gagnant, jamais un raté
  const derniere=s.frappes[s.frappes.length-1].t;
  assert.ok(!c.evenements.some(e=>e.type==='dehors'&&e.t<derniere),id+' : balle sortie avant la dernière frappe');
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
 // Questions du quiz
 assert.ok(essai(s=>{s.questions[0].bonne=7;}).length);
 assert.ok(essai(s=>{s.questions[0].choix=['seul'];}).length);
 assert.ok(essai(s=>{s.questions[0].t=s.duree+1;}).length);
 assert.ok(essai(s=>{s.questions[0].html='<b>';}).length);
 assert.ok(essai(s=>{s.questions[1].t=s.questions[0].t;}).length);
 assert.deepEqual(essai(s=>{delete s.questions;}),[],'questions facultatives');
 ok('validation stricte : champ inconnu, lien externe, geste inconnu, nombres invalides, positions incohérentes, questions mal formées refusés');
 // Chaque scénario a 2 à 6 questions, posées avant la frappe dont elles parlent (le geste n'est pas encore affiché)
 for(const id of SCENARIOS){
  const s=lireScenario(id);
  assert.ok(s.questions&&s.questions.length>=2,id+' : au moins 2 questions');
  s.questions.forEach(q=>assert.ok(!s.frappes.some(f=>q.t>f.t-0.4&&q.t<f.t),id+' question à '+q.t+' : geste déjà annoncé'));
 }
 ok('quiz : chaque scénario pose 2 à 6 questions, avant que le geste ne soit annoncé à l\'écran');

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
 ok('gestes : les '+Object.keys(GESTES).length+' coups construits (statut « simplifié »), chacun montré dans un scénario');
 // Gestes v2 (buste et bras gauche) : toutes les valeurs ou aucune ; depuis le 3B, tous les gestes sont en v2
 for(const [id,g] of Object.entries(GESTES)){
  const n=V2.filter(k=>g[k]).length;
  assert.ok(n===0||n===V2.length,id+' : valeurs v2 incomplètes');
  V2.filter(k=>g[k]).forEach(k=>assert.equal(g[k].length,INSTANTS.length,id+' '+k));
 }
 assert.deepEqual(Object.keys(GESTES).filter(id=>!GESTES[id].penche),[],'tous les gestes en v2');
 assert.ok(angles('gancho',-0.4).gAvant>120,'gancho : la main gauche pointe le lob à l’armé');
 assert.ok(angles('smash',-0.4).gAvant>120,'smash : la main gauche pointe la balle à l’armé');
 assert.ok(angles('revers',0).gAvant<0,'revers : la main gauche part en arrière au contact');
 assert.ok(angles('bandeja',0).gAvant>90,'bandeja : la main gauche pointe la balle au contact');
 assert.ok(angles('coup_droit',-0.4).penche>0,'coup droit : buste penché vers la balle à la préparation');
 const srcJoueurs=fs.readFileSync(path.join(racine,'assets/js/p3d/joueurs.js'),'utf8');
 assert.match(srcJoueurs,/COULEURS = \{ A: 0xc8f14b, B: 0xff6b57 \}/,'couleurs d\'équipe du site');
 assert.match(srcJoueurs,/j\.repos\.forEach\(\(\[o, q\]\) => o\.quaternion\.copy\(q\)\)/,'vertèbres remises au repos à chaque image');
 ok('gestes v2 : les '+Object.keys(GESTES).length+' gestes (buste, bras gauche), valeurs complètes ; couleurs d\'équipe du site ; colonne remise au repos à chaque image');
 // Conseil (facultatif) : affiché sur la page des scénarios qui en ont un, bloc masqué sinon
 for(const id of SCENARIOS){
  const s=lireScenario(id),h=fs.readFileSync(path.join(racine,'simulateur-3d-'+id+'.html'),'utf8');
  if(s.conseil)assert.ok(h.includes('<div id="p3d-conseil-bloc"><h3>Le conseil</h3><p id="p3d-conseil">'),id+' : conseil absent du HTML');
  else assert.ok(h.includes('<div id="p3d-conseil-bloc" hidden>'),id+' : bloc conseil visible sans conseil');
 }
 // Les 6 scénarios prioritaires (défense de lob, bandeja, montée au filet, sortie de vitre, centre, défense-attaque) ont leur conseil
 ['partenaire-lobe-cambio','bandeja-garder-filet','servir-monter','sortie-vitre-fond','couverture-centre','retour-lob'].forEach(id=>assert.ok(lireScenario(id).conseil,id+' : conseil manquant'));
 ok('conseil : les 6 scénarios prioritaires, écrit dans le HTML de leur page');

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

 // Une page par scénario : adresse, titre et description propres, textes du scénario dans le HTML, sitemap
 const sitemap=fs.readFileSync(path.join(racine,'sitemap.xml'),'utf8'),principale=fs.readFileSync(path.join(racine,'simulateur-3d.html'),'utf8');
 const titres=new Set(),descriptions=new Set();
 const decoder=t=>t.replace(/&quot;/g,'"').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
 for(const id of SCENARIOS){
  const f='simulateur-3d-'+id+'.html',h=fs.readFileSync(path.join(racine,f),'utf8'),s=lireScenario(id);
  assert.ok(h.includes('data-scenario="'+id+'"'),f+' : scénario de la page');
  assert.ok(h.includes('<link rel="canonical" href="https://apprendre-padel.fr/'+f+'">'),f+' : adresse canonique');
  const titre=h.match(/<title>([^<]*)<\/title>/)[1],desc=h.match(/<meta name="description" content="([^"]*)">/)[1];
  assert.ok(!titres.has(titre)&&!descriptions.has(desc),f+' : titre et description uniques');titres.add(titre);descriptions.add(desc);
  assert.ok(decoder(desc).length<=160,f+' : description trop longue');
  const texte=decoder(h);
  [s.explication[0],s.erreurs[0],s.exercice,s.etapes[s.etapes.length-1].texte].forEach(x=>assert.ok(texte.includes(x),f+' : texte absent du HTML : '+x.slice(0,40)));
  assert.ok(sitemap.includes('<loc>https://apprendre-padel.fr/'+f+'</loc>'),f+' : absente du sitemap');
  assert.ok(principale.includes('href="'+f+'"'),f+' : absente de la liste de la page principale');
 }
 assert.deepEqual(fs.readdirSync(racine).filter(n=>/^simulateur-3d-.+\.html$/.test(n)&&!SCENARIOS.includes(n.slice(14,-5))),[],'pages de scénarios disparus');
 ok('une page par scénario ('+SCENARIOS.length+') : adresse, titre et description uniques, textes dans le HTML, sitemap, liste sur la page principale');

 // Fiches de coups : la structure commune en 11 parties (scripts/generer-pages-3d.js), pour chaque coup de la page Technique
 const COUPS=new Function(fs.readFileSync(path.join(racine,'assets/js/coups.js'),'utf8').split('function cardCoup')[0]+';return COUPS;')();
 const EXOS=new Function(fs.readFileSync(path.join(racine,'assets/js/exercices-donnees.js'),'utf8')+';return EXERCICES;')();
 const parPage={};
 for(const c of Object.values(COUPS).flat())(parPage[c.p3d]=parPage[c.p3d]||[]).push(c);
 const sansBalise=t=>decoder(t.replace(/<[^>]+>/g,' ')).replace(/\s+/g,' ');
 let nbCoups=0;
 for(const [id,cartes] of Object.entries(parPage)){
  const f='simulateur-3d-'+id+'.html',h=fs.readFileSync(path.join(racine,f),'utf8');
  assert.ok(!/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(h),f+' : caractère de contrôle');
  const tete=h.slice(h.indexOf('<section id="simulateur"'),h.indexOf('id="p3d-mode"'));
  const fiche=h.slice(h.indexOf('<section id="fiche-coup"'),h.indexOf('</section>',h.indexOf('<section id="fiche-coup"')));
  // 1-3 : titre (h1), niveau, objectif
  assert.match(tete,/<h1>[^<]+<\/h1><p class="fiche-tete"><span class="lvl" data-l="(Débutant|Intermédiaire|Avancé)">/,f+' : niveau dans l\'en-tête');
  for(const c of cartes){
   nbCoups++;
   const t=sansBalise(cartes.length>1?fiche:tete+fiche);
   assert.ok(t.includes('Objectif : '+sansBalise(c.obj)),f+' : objectif de '+c.n);
   // 4, 6, 7, 8 : explication, 4 étapes, chaque erreur suivie de sa correction
   assert.ok(t.includes(sansBalise(c.q)),f+' : explication');
   c.etapes.forEach(([titre,x])=>assert.ok(t.includes(titre+' '+sansBalise(x)),f+' : étape '+titre));
   c.err.forEach((e,i)=>assert.ok(t.includes('Erreur '+sansBalise(e)+' Correction '+sansBalise(c.corr[i])),f+' : erreur et correction '+(i+1)));
   // 9 : exercices de l'espace joueur cités
   c.ex.forEach(x=>assert.ok(t.includes(EXOS.find(e=>e.id===x).titre.replace(/\s+/g,' ')),f+' : exercice '+x));
  }
  const titres=[...fiche.matchAll(/<h3>([^<]+)<\/h3>/g)].map(m=>m[1]);
  const attendus=['Explication','Les étapes du geste','Erreurs fréquentes et corrections','Exercice pratique'];
  assert.deepEqual(titres,[...cartes.flatMap(()=>attendus),'Revoir en 3D','Contenus associés'],f+' : parties et ordre');
  // 5 : l'animation est plus haut (le simulateur) ; 10 : revoir, quiz, déroulé ; 11 : au moins 3 contenus associés
  for(const a of ['#simulateur','#mode-quiz','#deroule'])assert.ok(fiche.includes('href="'+a+'"'),f+' : lien '+a);
  const associes=fiche.slice(fiche.indexOf('<h3>Contenus associés</h3>'));
  assert.ok((associes.match(/<a href=/g)||[]).length>=3,f+' : contenus associés');
 }
 assert.equal(nbCoups,Object.values(COUPS).flat().length);
 ok('fiches de coups ('+nbCoups+' coups, '+Object.keys(parPage).length+' pages) : titre, niveau, objectif, explication, animation, 4 étapes, erreurs et corrections, exercices, revoir en 3D, contenus associés');
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
 await ctx.route(/^https:/,r=>r.fulfill({status:200,body:''})); // aucun accès extérieur (polices, compteur)
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
  assert.equal(await page.locator('#p3d-scenarios option').count(),SCENARIOS.length);
  assert.equal(await page.locator('#p3d-etiquettes .p3d-etiquette').count(),4);
  assert.match(await page.textContent('#p3d-titre-scenario'),/bandeja/i);
  assert.equal(await page.locator('#p3d-explication li').count(),3);
  ok('chargement : terrain, quatre joueurs animés, balle, textes du scénario');

  // Affichage : qualité élevée par défaut sur ordinateur, appels de dessin limités, trajectoire et placements, qualité mémorisée
  assert.equal(await page.evaluate(()=>P3D.etat.qualite),'elevee');
  const appels=await page.evaluate(()=>P3D.etat.appels);
  assert.ok(appels>0&&appels<80,'appels de dessin par image : '+appels);
  await page.click('#p3d-trajectoire');
  assert.equal(await page.getAttribute('#p3d-trajectoire','aria-pressed'),'true');
  assert.equal(await page.evaluate(()=>P3D.etat.trajectoire),true);
  await page.click('#p3d-placements');
  assert.equal(await page.isVisible('#p3d-legende'),true);
  assert.equal(await page.locator('#p3d-legende span').count(),3);
  await page.click('#p3d-placements');
  assert.equal(await page.isHidden('#p3d-legende'),true);
  await page.click('#p3d-trajectoire');
  await Promise.all([page.waitForNavigation(),page.selectOption('#p3d-qualite','economique')]);
  await pret(page);
  assert.equal(await page.evaluate(()=>P3D.etat.qualite),'economique');
  assert.equal(await page.inputValue('#p3d-qualite'),'economique');
  await Promise.all([page.waitForNavigation(),page.selectOption('#p3d-qualite','elevee')]);
  await pret(page);
  ok('affichage : '+appels+' appels de dessin par image, trajectoire complète, zones de placement et légende, qualité économique / élevée mémorisée');

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

  await page.selectOption('#p3d-scenarios','monter-apres-lob');
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
   await page.selectOption('#p3d-scenarios',id);
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

  // Mode quiz : la scène se fige, on répond, l'explication s'affiche, la lecture reprend, score final
  await page.selectOption('#p3d-scenarios','smash-lob-court');
  await page.waitForFunction(()=>P3D.etat.scenario.id==='smash-lob-court');
  await page.click('#p3d-mode button[data-mode="quiz"]');
  assert.equal(await page.isHidden('#p3d-etapes'),true,'quiz : étapes masquées (elles donnent les réponses)');
  assert.match(await page.textContent('#p3d-quiz-question'),/s'arrêtera 2 fois/);
  const qs=await page.evaluate(()=>P3D.etat.scenario.questions);
  await page.click('#p3d-lecture');
  await page.waitForFunction(()=>P3D.quiz.enCours===0,null,{timeout:20000});
  assert.equal(await page.evaluate(()=>P3D.etat.t),qs[0].t,'scène figée à l\'instant de la question');
  assert.equal(await page.evaluate(()=>P3D.etat.lecture),false);
  assert.equal(await page.textContent('#p3d-quiz-question'),qs[0].question);
  await page.click('#p3d-lecture');await page.waitForTimeout(300);
  assert.equal(await page.evaluate(()=>P3D.etat.t),qs[0].t,'lecture bloquée tant que la question attend');
  const fausse=(qs[0].bonne+1)%qs[0].choix.length;
  await page.click(`#p3d-quiz-choix button[data-k="${fausse}"]`);
  assert.match(await page.getAttribute(`#p3d-quiz-choix button[data-k="${fausse}"]`,'class'),/fausse/);
  assert.match(await page.getAttribute(`#p3d-quiz-choix button[data-k="${qs[0].bonne}"]`,'class'),/bonne/);
  assert.match(await page.textContent('#p3d-quiz-explication'),/^Pas tout à fait/);
  // Après une erreur : « Pour revoir ce point » (article et exercice de la question, assets/3d/revoir.json)
  await page.waitForSelector('#p3d-quiz-revoir:not([hidden])');
  const rv=JSON.parse(fs.readFileSync(path.join(racine,'assets/3d/revoir.json'),'utf8'))['smash-lob-court-1'];
  assert.equal(await page.getAttribute('#p3d-quiz-revoir a','href'),rv.article.url);
  assert.equal(await page.textContent('#p3d-quiz-revoir summary b'),rv.exercice.titre);
  await page.click('#p3d-quiz-suite');
  await page.waitForFunction(()=>P3D.quiz.enCours===1,null,{timeout:20000});
  await page.click(`#p3d-quiz-choix button[data-k="${qs[1].bonne}"]`);
  assert.match(await page.textContent('#p3d-quiz-explication'),/^Bonne réponse/);
  assert.equal(await page.isHidden('#p3d-quiz-revoir'),true,'pas de « Pour revoir » sur une bonne réponse');
  await page.click('#p3d-quiz-suite');
  await page.waitForFunction(()=>P3D.etat.t>=P3D.etat.scenario.duree,null,{timeout:20000});
  assert.match(await page.textContent('#p3d-quiz-question'),/Score : 1 sur 2/);
  await page.click('#p3d-mode button[data-mode="regarder"]');
  assert.equal(await page.isHidden('#p3d-quiz'),true);
  assert.equal(await page.isHidden('#p3d-etapes'),false);
  ok('mode quiz : scène figée avant la frappe, réponse corrigée et expliquée, reprise, score final, retour au mode regarder');
  // Lien « Te tester en mode quiz » d'une fiche de coup : la page s'ouvre en mode quiz, étapes (les réponses) masquées
  await page.goto(base+'/simulateur-3d-vibora.html#mode-quiz');
  await pret(page);
  await page.waitForFunction(()=>P3D.etat.mode==='quiz',null,{timeout:20000});
  assert.equal(await page.getAttribute('#mode-quiz','aria-pressed'),'true');
  assert.equal(await page.isHidden('#p3d-etapes'),true);
  await page.click('#p3d-mode button[data-mode="regarder"]');
  await page.click('a[href="#mode-quiz"]');
  await page.waitForFunction(()=>P3D.etat.mode==='quiz',null,{timeout:20000});
  ok('lien direct vers le quiz depuis une fiche (#mode-quiz), à l\'ouverture et depuis la fiche');
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

  // Page Technique : chaque coup a son bouton « Voir en 3D », qui ouvre le bon scénario
  ctx=await contexte(browser,{viewport:{width:1280,height:900}});
  page=await ctx.newPage();suivre(page,erreurs);
  await page.goto(base+'/technique.html');
  const liens=await page.$$eval('#coups .card',cartes=>cartes.map(c=>({coup:c.querySelector('h3').textContent,href:c.querySelector('a.coup-3d')?.getAttribute('href')})));
  assert.ok(liens.length>=20,'cartes de coups');
  liens.forEach(l=>{
   assert.ok(l.href,l.coup+' : bouton « Voir en 3D »');
   const id=(l.href.match(/^simulateur-3d-([a-z0-9-]+)\.html$/)||[])[1];
   assert.ok(SCENARIOS.includes(id),l.coup+' : scénario '+id+' introuvable');
  });
  // Fiche d'un coup : image de la scène, la 3D (three.js) n'est téléchargée qu'au clic ; deux niveaux distincts
  const demandes3d=[];page.on('request',r=>{if(/three\.module|joueur\.glb/.test(r.url()))demandes3d.push(r.url());});
  await page.click('#coups .card a.coup-3d[href="simulateur-3d-vibora.html"]');
  await page.waitForFunction(()=>window.P3D&&P3D.etat.scenario?.id==='vibora');
  await page.waitForTimeout(1500);
  assert.equal(await page.evaluate(()=>P3D.etat.pret3d),false,'3D non démarrée avant le clic');
  assert.deepEqual(demandes3d,[],'three.js et le modèle ne sont pas téléchargés avant le clic');
  assert.equal(await page.isVisible('#p3d-affiche'),true);
  assert.equal(await page.isHidden('#p3d-chargement'),true);
  assert.ok(await page.$eval('#p3d-affiche img',i=>i.complete&&i.naturalWidth===960),'image de la scène chargée');
  assert.equal(await page.textContent('.fiche-tete .lvl'),'Niveau du coup : Avancé');
  assert.equal(await page.textContent('#p3d-niveau'),'Niveau de la scène : Avancé');
  await page.click('#p3d-affiche');
  await pret(page);
  assert.equal(await page.isHidden('#p3d-affiche'),true);
  assert.equal(await page.evaluate(()=>P3D.etat.lecture),true,'le clic sur l’image lance la lecture');
  assert.match(page.url(),/simulateur-3d-vibora\.html$/);
  assert.equal(await page.evaluate(()=>P3D.etat.scenario.id),'vibora');
  assert.equal(await page.inputValue('#p3d-scenarios'),'vibora');
  // Sur une page de scénario, choisir un autre scénario mène à sa page
  await Promise.all([page.waitForURL(/simulateur-3d-gancho\.html$/),page.selectOption('#p3d-scenarios','gancho')]);
  await page.click('#p3d-lecture'); // Lecture démarre aussi la 3D
  await pret(page);
  assert.equal(await page.evaluate(()=>P3D.etat.scenario.id),'gancho');
  // Sur la page principale, l'ancre de l'adresse choisit le scénario
  await page.goto(base+'/simulateur-3d.html#amorti');await pret(page);
  await page.evaluate(()=>{location.hash='gancho';});
  await page.waitForFunction(()=>P3D.etat.scenario.id==='gancho');
  ok('page Technique : les '+liens.length+' coups ouvrent la page de leur scénario (image, 3D au clic, niveau du coup et de la scène) ; autre scénario = autre page ; ancre suivie sur la page principale');
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
