/* Vérification de Mon académie, phase 1 (academie.html, assets/js/academie.js) :
   1) sans navigateur : les 10 niveaux et leurs critères identiques à la grille officielle de la FFT (« Niveaux Padel »,
      juillet 2024, recopiée ci-dessous depuis le PDF), source citée, propositions du site séparées des critères, scènes 3D
      existantes ; moteur : niveaux 1 à 10 seulement, historique sans doublon, données abîmées ignorées ;
   2) dans Edge : état vide, choix, changement, bornes 1 et 10, historique, sauvegarde après rechargement, ancien test de
      niveau affiché à part et jamais modifié, accès depuis l'accueil et le menu, 1280 / 390 / 320 px, console sans erreur.
   Lancer depuis la racine du site : node scripts/verifier-academie.cjs */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),vm=require('node:vm');
const {chromium}=require('playwright');
const racine=path.join(__dirname,'..');
let nb=0;
function ok(nom){nb++;console.log('OK '+nom);}
const lire=f=>fs.readFileSync(path.join(racine,f),'utf8');
const SOURCE='https://guidedudirigeant.fft.fr/wp-content/uploads/2024/07/A3-Padel-Grille-de-niveaux.pdf';
// Grille FFT, mot pour mot (texte du PDF officiel)
const GRILLE=[
 ['Débutant',['J’apprends les coups de base (service, coup droit, volée, revers)','Je commence à jouer','Je connais les règles du jeu','Je monte au filet après mon service']],
 ['Débutant +',['Je maîtrise les coups de base en direct (sans la vitre)','Je commence à jouer après un rebond sur la vitre et deux rebonds au sol','Je joue à vitesse lente','Mes échanges font trois ou quatre frappes']],
 ['Élémentaire',['Je commence à être plus régulier sur mes lobs','Je commence à reculer pour jouer des balles au dessus de la tête','Je suis en capacité de renvoyer quelques balles après un rebond sur la vitre du fond et un rebond au sol','J’arrive à garder la balle en jeu à une vitesse lente']],
 ['Intermédiaire',['Je sais jouer la balle après rebond sur la vitre du fond et après la paroi latérale','Je réussis parfois à remettre la balle en défense de doubles vitres','Je fais encore souvent des fautes directes non provoquées','Je sais monter au filet et redescendre plusieurs fois de suite pendant un échange']],
 ['Confirmé',['Je commence à jouer avec les effets','Je suis en capacité de retourner les services en lob et dans les pieds adverses','Je suis précis dans mes zones à la volée','Je suis en capacité de défendre avec toutes les vitres sur des balles à vitesse moyenne','Je sais faire une bandeja ou vibora lente pour garder le filet','Je sais contre attaquer sur les smashs adverses']],
 ['Avancé',['Je fais peu de fautes directes non provoquées','Je maîtrise le jeu rapide','Je maîtrise les effets dans tous les secteurs de jeu','Je suis capable d’accélérer mes volées, mes bandejas et/ou viboras et mes smashs pour terminer le point au bon moment']],
 ['Avancé +',['J’arrive à remettre les balles rapides en défense double vitre','Je maîtrise parfaitement les effets notamment la bandeja et/ou la vibora','Je termine les points par des coups gagnants (PAR 3, PAR 4, amorties) face à une défense solide','J’utilise les vitres en contre-attaque sur les balles faciles','Je joue juste même à haute intensité','Je gagne des matchs en P500']],
 ['Expert',['Je maîtrise parfaitement les coups d’attaque et de défense à mon niveau','Je suis capable de varier la vitesse et les coups sur la même balle produite par mon adversaire','Je suis classée entre la 101e et 200e place au classement FFT Dames','Je suis classé entre la 401e et 1000e place au classement FFT Messieurs','J’arrive dans le dernier carré des P500']],
 ['Expert +',['Je suis classée entre la 31e et 100e place au classement FFT Dames','Je suis classé entre la 101e et 400e place au classement FFT Messieurs']],
 ['Élite',['Je suis classée dans le top 30 au classement FFT Dames','Je suis classé dans le top 100 au classement FFT Messieurs']],
];
const texte=h=>h.replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').replace(/&#x27;|&#39;/g,"'").replace(/ /g,' ').trim();

function horsNavigateur(){
 const h=lire('academie.html');
 const cartes=[...h.matchAll(/<li class="ac-carte[^"]*" id="niveau-(\d+)" data-niveau="(\d+)">([\s\S]*?)<\/li>\n/g)];
 assert.deepEqual(cartes.map(c=>+c[1]),[1,2,3,4,5,6,7,8,9,10]);
 cartes.forEach((c,i)=>{
  assert.equal(+c[2],i+1);
  const corps=c[3];
  assert.equal(texte(corps.match(/<span class="ac-nom">([\s\S]*?)<\/span>/)[1]),GRILLE[i][0],'niveau '+(i+1)+' : intitulé');
  const criteres=[...corps.match(/<ul class="ac-criteres"[^>]*>([\s\S]*?)<\/ul>/)[1].matchAll(/<li>([\s\S]*?)<\/li>/g)].map(m=>texte(m[1]));
  assert.deepEqual(criteres,GRILLE[i][1],'niveau '+(i+1)+' : critères mot pour mot');
  assert.match(corps,new RegExp('<button type="button" class="btn ghost ac-choisir" data-choisir="'+(i+1)+'" aria-pressed="false">'));
  // Ce que propose le site, séparé des critères officiels ; scènes 3D existantes
  const site=corps.match(/<div class="ac-site">([\s\S]*?)<\/div>/)[1];
  assert.match(site,/Compétences|classement FFT/);
  [...site.matchAll(/href="(simulateur-3d[a-z0-9-]*\.html)"/g)].forEach(m=>assert.ok(fs.existsSync(path.join(racine,m[1])),m[1]));
 });
 assert.ok(h.includes('href="'+SOURCE+'"'),'source citée');
 assert.match(texte(h),/ce n'est pas une certification/);
 assert.match(texte(h),/deux échelles différentes/);
 // Moteur
 const ctx={window:{},document:{getElementById:()=>null},localStorage:{getItem:()=>null}};vm.createContext(ctx);
 vm.runInContext(lire('assets/js/academie.js'),ctx);
 const A=ctx.window.PA_ACADEMIE;
 [0,11,-1,5.5,'5',null].forEach(v=>assert.equal(A.niveauValide(v),false,String(v)));
 [1,10].forEach(v=>assert.equal(A.niveauValide(v),true));
 let e=A.normaliser(null);assert.equal(e.niveau,null);
 e=A.choisir(e,5,'2026-10-27T10:00:00Z');e=A.choisir(e,5,'2026-10-27T11:00:00Z');e=A.choisir(e,11);e=A.choisir(e,1,'2026-10-27T12:00:00Z');e=A.choisir(e,10,'2026-10-27T13:00:00Z');
 assert.equal(e.niveau,10);assert.deepEqual([...e.historique.map(x=>x.niveau)],[5,1,10],'même niveau non répété, 11 refusé');
 for(let k=0;k<60;k++)e=A.choisir(e,k%2?3:4,'2026-10-28T10:00:00Z');
 assert.equal(e.historique.length,50,'historique limité aux 50 derniers choix');
 assert.deepEqual(JSON.parse(JSON.stringify(A.normaliser({niveau:42,historique:[{niveau:3,date:'x'},{niveau:2,date:'2026-10-01T00:00:00Z'},'z']}))),{version:1,niveau:null,historique:[{niveau:2,date:'2026-10-01T00:00:00Z'}]});
 ok('10 niveaux et '+GRILLE.reduce((a,g)=>a+g[1].length,0)+' critères identiques à la grille FFT, source citée, propositions du site séparées ; moteur : bornes 1 et 10, historique, données abîmées');
}

const TYPES={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.woff2':'font/woff2','.webmanifest':'application/manifest+json'};
const serveur=http.createServer((req,res)=>{
 const rel=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\//,'')||'index.html';
 const p=path.resolve(racine,rel);
 if(!p.startsWith(racine+path.sep)){res.writeHead(403);res.end();return;}
 fs.readFile(p,(e,b)=>{if(e){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',TYPES[path.extname(p)]||'application/octet-stream');res.end(b);});
});

async function dansLeNavigateur(base){
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const erreurs=[];
 try{
  for(const [largeur,hauteur] of [[1280,900],[390,844],[320,700]]){
   const ctx=await browser.newContext({serviceWorkers:'block',viewport:{width:largeur,height:hauteur}});
   await ctx.route('https://**',r=>r.fulfill({status:200,body:''}));
   const page=await ctx.newPage();
   page.on('pageerror',e=>erreurs.push(e.message));page.on('console',m=>{if(m.type()==='error')erreurs.push(m.text());});
   // Accès depuis l'accueil
   await page.goto(base+'/index.html');
   const lien=page.locator('.ac-accueil a');
   assert.equal(await lien.getAttribute('href'),'academie.html#niveaux');
   await page.goto(base+'/academie.html');
   // État vide
   assert.equal(await page.textContent('.ac-moi-titre'),'Choisis ton niveau pour commencer');
   assert.equal(await page.locator('.ac-carte.choisi').count(),0);
   // Ancien test de niveau : affiché à part, jamais modifié
   const ancien={date:'2026-10-12T10:00:00.000Z',palier:2,niveau:2,reponses:[],methode:'test-niveau-v2'};
   await page.evaluate(a=>localStorage.setItem('pa-quiz-dernier',JSON.stringify(a)),ancien);
   await page.reload();
   assert.match(await page.textContent('.ac-ancien'),/catégorie de tournoi P100\. C'est une autre échelle que les niveaux 1 à 10/);
   // Choix, changement, bornes
   for(const n of [5,1,10]){
    await page.click(`.ac-carte [data-choisir="${n}"]`);
    assert.equal(await page.getAttribute(`.ac-carte [data-choisir="${n}"]`,'aria-pressed'),'true');
    assert.equal(await page.locator('.ac-carte.choisi').count(),1);
    assert.equal(await page.textContent('.ac-moi-num'),String(n));
    assert.equal(await page.evaluate(()=>document.activeElement.classList.contains('ac-moi-titre')),true,'focus sur le niveau choisi');
   }
   assert.match(await page.textContent('.ac-moi-titre'),/Ton niveau déclaré : 10 · Élite/);
   await page.click('.ac-carte [data-choisir="10"]'); // même niveau : pas de nouvelle entrée
   const etat=await page.evaluate(()=>JSON.parse(localStorage.getItem('pa-academie')));
   assert.deepEqual(etat.historique.map(h=>h.niveau),[5,1,10]);
   assert.equal(etat.niveau,10);
   // Sauvegarde après rechargement ; historique visible ; ancien test intact
   await page.reload();
   assert.equal(await page.textContent('.ac-moi-num'),'10');
   assert.match(await page.textContent('.ac-historique summary'),/3 choix/);
   assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('pa-quiz-dernier'))),ancien,'ancien test non modifié');
   // Données abîmées : état vide, sans erreur
   await page.evaluate(()=>localStorage.setItem('pa-academie','{"niveau":"dix"'));
   await page.reload();
   assert.equal(await page.textContent('.ac-moi-titre'),'Choisis ton niveau pour commencer');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,largeur+' px : pas de débordement');
   await ctx.close();
  }
  ok('Edge : état vide, choix et changement, bornes 1 et 10, historique sans doublon, sauvegarde, ancien test intact, accès depuis l’accueil, 1280 / 390 / 320 px');
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
