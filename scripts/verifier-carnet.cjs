/* Vérification des ajouts du carnet de match (espace.html, « Mes matchs » ; assets/js/carnet-outils.js ; liens 3D du
   diagnostic après match) :
   1) sous Node : filtres (période, type, partenaire), tendance des points perdus (seulement des comptes), export CSV
      (BOM, « ; », guillemets, formules neutralisées), motifs relus du point de vue du joueur = motifs du compteur,
      scène 3D de chaque thème du diagnostic (fichier et titre) ;
   2) dans Edge (comptes indisponibles : données de l'appareil) : filtres appliqués aux statistiques et au journal,
      tendance 5 / 10 matchs, export CSV des matchs filtrés, liens « Voir en 3D » et « Te tester » dans un bilan,
      390 et 320 px sans débordement, console sans erreur.
   Lancer depuis la racine du site : node scripts/verifier-carnet.cjs */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),vm=require('node:vm');
const {chromium}=require('playwright');
const racine=path.join(__dirname,'..');
let nb=0;
function ok(nom){nb++;console.log('OK '+nom);}
const lire=f=>fs.readFileSync(path.join(racine,f),'utf8');

// Journal d'essai : 12 matchs comptés (motifs variés, 3 partenaires, 2 types) et 1 match saisi après coup
const JOUR=86400000,MAINTENANT=Date.parse('2026-10-27T12:00:00Z');
function matchsEssai(){
 const motifs=['faute','smash','lob','faute','vitre','faute','gagnant','double','volee','faute','smash','lob'];
 const partenaires=['Léa','Léa','Tom','Léa',null,'Tom','Léa','Tom','Léa','Max','Léa','Tom'];
 return motifs.map((mo,i)=>{
  const points=[];
  for(let k=0;k<20;k++)points.push({g:k%2,m:k%2?(k%4===1?mo:(k%8===3?'faute':null)):'gagnant'});
  return {cle:'m-essai-'+i,config:{nomA:'Nous',nomB:'Adv '+i,serveur:0,egalite:'decisif',dernierSet:'super'},points,
   fin:new Date(MAINTENANT-(i*9+1)*JOUR).toISOString(),score:'6-4 6-3',vainqueur:i%3?0:1,partenaire:partenaires[i],type:i%4===3?'tournoi':'amical'};
 });
}

function horsNavigateur(){
 const ctx={window:{}};vm.createContext(ctx);
 vm.runInContext(lire('assets/js/carnet-outils.js'),ctx);
 const C=ctx.window.PA_CARNET;
 // Motifs : les mêmes que ceux du compteur
 const ids=[...lire('assets/js/score.js').match(/const SC_MOTIFS=\[([\s\S]*?)\];/)[1].matchAll(/id:"([a-z]+)"/g)].map(m=>m[1]).sort();
 assert.deepEqual(Object.keys(C.PERDUS).sort(),ids,'motifs du compteur');
 // Entrées au format du journal (journal.js)
 const J=matchsEssai().map(m=>{const pg=m.points.filter(p=>p.g===0).length,mp={};m.points.forEach(p=>{if(p.g===1&&p.m)mp[p.m]=(mp[p.m]||0)+1;});
  return {cle:m.cle,fin:m.fin,partenaire:m.partenaire,adversaires:m.config.nomB,score:m.score,vainqueur:m.vainqueur,type:m.type,saisie:'compteur',pointsGagnes:pg,pointsTotal:20,motifsPerdus:mp};});
 J.push({cle:'man',fin:new Date(MAINTENANT-2*JOUR).toISOString(),partenaire:'=HYPERLINK("x")',adversaires:'Les "Rapides"; Rouen',score:'',vainqueur:0,type:'amical',saisie:'manuelle',pointsGagnes:0,pointsTotal:0,motifsPerdus:{}});
 assert.equal(C.filtrer(J,{maintenant:MAINTENANT}).length,13);
 assert.equal(C.filtrer(J,{jours:30,maintenant:MAINTENANT}).length,J.filter(m=>MAINTENANT-Date.parse(m.fin)<=30*JOUR).length);
 assert.ok(C.filtrer(J,{type:'tournoi',maintenant:MAINTENANT}).every(m=>m.type==='tournoi'));
 assert.equal(C.filtrer(J,{partenaire:'Léa',maintenant:MAINTENANT}).length,6);
 assert.equal(C.filtrer(J,{partenaire:C.SANS_PARTENAIRE,maintenant:MAINTENANT}).length,1);
 assert.deepEqual([...C.partenaires(J)].slice(0,2),['Léa','Tom'],'du plus fréquent au moins fréquent');
 // Tendance : seulement les matchs comptés, les n plus récents, motifs connus ; parts qui somment à 1
 const t5=C.tendance(J,5),t10=C.tendance(J,10);
 assert.equal(t5.matchs,5);assert.equal(t10.matchs,10);
 const attendu={};J.filter(m=>m.pointsTotal).sort((a,b)=>Date.parse(b.fin)-Date.parse(a.fin)).slice(0,5).forEach(m=>Object.entries(m.motifsPerdus).forEach(([k,v])=>{attendu[k]=(attendu[k]||0)+v;}));
 assert.deepEqual(Object.fromEntries(t5.motifs.map(m=>[m.motif,m.n])),attendu);
 assert.ok(Math.abs(t10.motifs.reduce((s,m)=>s+m.part,0)-1)<1e-9);
 assert.ok(t10.motifs.every((m,i)=>!i||t10.motifs[i-1].n>=m.n),'motifs triés');
 assert.equal(C.tendance([{pointsTotal:10,fin:'2026-10-01',motifsPerdus:{inconnu:4,faute:-2}}],5).total,0,'motifs inconnus ou invalides ignorés');
 // CSV
 const csv=C.csv(J,{amical:'Amical',tournoi:'Tournoi'});
 assert.ok(csv.startsWith('﻿Date;Type;Partenaire;Adversaires;Score;Résultat;Points gagnés;Points joués;Saisie;Points perdus par motif\r\n'));
 const lignes=csv.slice(1).trim().split('\r\n');assert.equal(lignes.length,14);
 assert.ok(lignes.slice(1).every((l,i,t)=>!i||t[i-1].slice(0,10)>=l.slice(0,10)),'du plus récent au plus ancien');
 const manuel=lignes.find(l=>l.includes('HYPERLINK')),compte=lignes.find(l=>l.startsWith('2026-10-26'));
 assert.match(manuel,/^2026-10-25;Amical;"?'=HYPERLINK\(""x""\)"?;/,'formule neutralisée');
 assert.match(manuel,/;"Les ""Rapides""; Rouen";/,'guillemets et point-virgule protégés');
 assert.match(manuel,/;Victoire;;;Après coup;$/);
 assert.match(compte,/;Compteur;.*Tes fautes directes : \d+/);
 ok('filtres (période, type, partenaire, sans partenaire), tendance sur les 5 / 10 derniers matchs comptés, CSV (BOM, « ; », guillemets, formule neutralisée), motifs du compteur');
 // Scènes 3D du diagnostic : chaque thème (sauf compétition) a une scène qui existe, avec son vrai titre
 const dg=lire('assets/js/diagnostic.js');
 const scenes=Object.fromEntries([...dg.match(/const DG_SCENES=\{([\s\S]*?)\};/)[1].matchAll(/([a-z]+):\["([a-z0-9-]+)","([^"]+)"\]/g)].map(m=>[m[1],[m[2],m[3]]]));
 const themes=[...dg.match(/const DG_FICHES=\{([\s\S]*?)\};/)[1].matchAll(/([a-z]+):\[/g)].map(m=>m[1]).filter(t=>t!=='compet');
 assert.deepEqual(Object.keys(scenes).sort(),themes.sort());
 for(const [t,[id,titre]] of Object.entries(scenes)){
  assert.ok(fs.existsSync(path.join(racine,'simulateur-3d-'+id+'.html')),t+' : page 3D');
  assert.equal(JSON.parse(lire('assets/3d/scenarios/'+id+'.json')).titre,titre,t+' : titre');
 }
 ok('diagnostic après match : une scène 3D pour chacun des '+themes.length+' thèmes (hors compétition), page et titre exacts');
}

const TYPES={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.webmanifest':'application/manifest+json'};
const serveur=http.createServer((req,res)=>{
 const rel=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\//,'')||'index.html';
 const p=path.resolve(racine,rel);
 if(!p.startsWith(racine+path.sep)){res.writeHead(403);res.end();return;}
 fs.readFile(p,(e,b)=>{if(e){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',TYPES[path.extname(p)]||'text/plain');res.end(b);});
});

async function dansLeNavigateur(base){
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const erreurs=[];
 try{
  for(const [largeur,hauteur] of [[1280,900],[390,844],[320,700]]){
   const ctx=await browser.newContext({serviceWorkers:'block',viewport:{width:largeur,height:hauteur}});
   await ctx.route(/^https:/,r=>r.fulfill({status:200,body:''})); // comptes indisponibles : données de l'appareil
   await ctx.route('**/assets/vendor/supabase-*.js*',r=>r.fulfill({contentType:'text/javascript',body:''})); // comptes indisponibles : le SDK (sur le site) est bloqué aussi
   const page=await ctx.newPage();
   page.on('pageerror',e=>erreurs.push(e.message));page.on('console',m=>{if(m.type()==='error')erreurs.push(m.text());});
   await page.clock.setFixedTime(new Date(MAINTENANT));
   await page.goto(base+'/espace.html');
   await page.evaluate(h=>localStorage.setItem('pa-score-historique',JSON.stringify(h)),matchsEssai());
   await page.reload();
   await page.click('label.tchip:has(input[name="esp-periode"][value="tout"])'); // le bouton radio est masqué : on clique son étiquette
   const nbJournal=()=>page.locator('ul.esp-journal > li:not(.esp-bilan-panneau)').count();
   // Filtres remplis : types fixes, partenaires du journal (plus « non précisé »)
   assert.deepEqual(await page.$$eval('#esp-f-partenaire option',o=>o.map(x=>x.textContent)),['Tous','Léa','Tom','Max','Partenaire non précisé']);
   assert.ok(await page.locator('#esp-f-type option').count()>2);
   assert.equal(await page.textContent('#esp-export'),'Exporter en CSV (12 matchs)');
   // Tendance : identique au moteur
   const t=await page.evaluate(()=>{const C=PA_CARNET,l=PA_JOURNAL.liste();return [C.tendance(l,5),C.tendance(l,10)];});
   const lignes=await page.$$eval('.esp-tendance tbody tr',r=>r.map(x=>[...x.cells].map(c=>c.textContent)));
   assert.equal(lignes.length,t[1].motifs.length);
   const PERDUS=await page.evaluate(()=>PA_CARNET.PERDUS);
   t[1].motifs.forEach((m,i)=>{assert.equal(lignes[i][0],PERDUS[m.motif]);assert.equal(lignes[i][2],Math.round(100*m.part)+' % ('+m.n+')');});
   assert.match(await page.textContent('.esp-tendance-texte'),new RegExp('^Sur tes 10 derniers matchs comptés, '+Math.round(100*t[1].motifs[0].part)+' % des points perdus '));
   // Filtre partenaire : statistiques et journal ne gardent que ses matchs ; le choix survit au nouvel affichage
   await page.selectOption('#esp-f-partenaire','Léa');
   assert.equal(await page.textContent('#esp-export'),'Exporter en CSV (6 matchs)');
   assert.equal(await nbJournal(),6);
   assert.ok((await page.$$eval('ul.esp-journal .esp-journal-texte',s=>s.map(x=>x.textContent))).every(x=>x.includes('Avec Léa')));
   assert.equal(await page.inputValue('#esp-f-partenaire'),'Léa');
   await page.selectOption('#esp-f-type','tournoi');
   const n=await nbJournal();
   assert.ok(n>=1&&n<6,'type et partenaire combinés');
   await page.selectOption('#esp-f-type','');await page.selectOption('#esp-f-partenaire','');
   if(largeur===1280){
    // Export CSV : lien intercepté dans la page (le téléchargement réel dépend du navigateur)
    await page.evaluate(()=>{HTMLAnchorElement.prototype.click=function(){if(this.download)window.__export=fetch(this.href).then(r=>r.text()).then(t=>({nom:this.download,texte:t}));};});
    await page.selectOption('#esp-f-partenaire','Tom');
    await page.click('#esp-export');
    await page.waitForFunction(()=>window.__export);
    const exp=await page.evaluate(()=>window.__export);
    assert.equal(exp.nom,'padel-matchs-2026-10-27.csv');
    const l=exp.texte.replace(/^﻿/,'').trim().split('\r\n');
    assert.equal(l.length,1+4,'en-tête et les 4 matchs avec Tom');
    assert.ok(l.slice(1).every(x=>x.split(';')[2]==='Tom'));
    await page.selectOption('#esp-f-partenaire','');
    // Bilan d'un match : les axes proposent la scène 3D et ses questions
    await page.click('ul.esp-journal .esp-bilan >> nth=0');
    await page.click('.esp-bilan-panneau label:has-text("Bandeja")');
    await page.click('.esp-bilan-panneau button[type=submit]');
    await page.waitForSelector('.esp-bilan-panneau .dg-reco');
    const liens=await page.$$eval('.esp-bilan-panneau .dg-scene',a=>a.map(x=>x.getAttribute('href')));
    assert.ok(liens.includes('simulateur-3d-bandeja-garder-filet.html')&&liens.includes('simulateur-3d-bandeja-garder-filet.html#mode-quiz'),liens.join(', '));
   }
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,largeur+' px : pas de débordement');
   await ctx.close();
  }
  ok('Edge : filtres sur statistiques et journal, tendance = moteur, export CSV des matchs filtrés, liens 3D dans le bilan, 1280 / 390 / 320 px');
 }finally{await browser.close();}
 assert.deepEqual(erreurs,[]);
 ok('aucune erreur dans la console');
}

(async()=>{
 horsNavigateur();
 await new Promise(r=>serveur.listen(0,'127.0.0.1',r));
 try{await dansLeNavigateur('http://127.0.0.1:'+serveur.address().port);}
 finally{serveur.close();}
 console.log(nb+' vérifications réussies.');
})().catch(e=>{console.error(e);process.exitCode=1;serveur.close();});
