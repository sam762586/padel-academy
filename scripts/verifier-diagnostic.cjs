/* Vérification du diagnostic après match (chantier 5, assets/js/diagnostic.js) :
   1) moteur : bilan nettoyé (identifiants inconnus, textes bornés, bilan vide refusé), clé identique au journal (anciens
      matchs compris), jusqu'à 3 axes expliqués avec fiche, exercice au niveau et objectif, difficultés récentes → exercices ;
   2) SQL : colonne diagnostic bornée ; modification limitée à ses propres matchs et à la seule colonne diagnostic ;
   3) compteur (score.html) : invitation après le match, bilan vide refusé, enregistrement, recommandations, ajout aux
      objectifs, modification, suppression ; bilan retrouvé depuis l'historique ; mobile 390 px ;
   4) espace (journal) : « Bilan ✓ » pour un match avec bilan, bilan d'un ancien match fait au compteur retrouvé, nouveau bilan
      depuis le journal, difficultés reprises dans le programme ; envoi au compte seulement avec "journal" + "diagnostic".
   Lancer depuis la racine du site : node scripts/verifier-diagnostic.cjs */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),vm=require('node:vm');
const {chromium}=require('playwright');
const racine=path.join(__dirname,'..');
let nb=0;
function ok(nom){nb++;console.log('OK '+nom);}
process.on('unhandledRejection',e=>{if(e&&e.name==='TargetClosedError')return;console.error(e);process.exitCode=1;});
const J=x=>JSON.parse(JSON.stringify(x));

function moteur(){
 const bac={window:{addEventListener(){}},document:{getElementById:()=>null,addEventListener(){}},localStorage:{getItem:()=>null,setItem(){}}};
 vm.runInNewContext(fs.readFileSync(path.join(racine,'assets/js/exercices-donnees.js'),'utf8')+';this.__E=EXERCICES;',bac);
 vm.runInNewContext(fs.readFileSync(path.join(racine,'assets/js/exercices.js'),'utf8'),bac);
 vm.runInNewContext(fs.readFileSync(path.join(racine,'assets/js/diagnostic.js'),'utf8'),bac);
 const D=bac.window.PA_DIAGNOSTIC,E=bac.window.PA_EXERCICES;
 // Nettoyage
 let n=J(D.normaliser({ressenti:7,techniques:['volees','inconnu','volees'],tactiques:['lobs'],positif:'x'.repeat(300),prochain:'  Monter plus  '}));
 assert.equal(n.ressenti,null);assert.deepEqual(n.techniques,['volees']);assert.deepEqual(n.tactiques,['lobs']);
 assert.equal(n.positif.length,200);assert.equal(n.prochain,'Monter plus');
 assert.equal(D.normaliser({ressenti:null,techniques:[],tactiques:[],positif:'  '}),null);
 assert.equal(J(D.normaliser({ressenti:3})).ressenti,3);
 // Clé : celle du match, sinon déduite de la date de fin (comme journal.js)
 assert.equal(D.cleMatch({cle:'match-abcdef01',fin:'2026-10-27T10:00:00Z'}),'match-abcdef01');
 assert.equal(D.cleMatch({fin:'2026-10-27T10:00:00Z'}),'m-'+Date.parse('2026-10-27T10:00:00Z').toString(36));
 assert.ok(fs.readFileSync(path.join(racine,'assets/js/journal.js'),'utf8').includes('"m-"+Date.parse(m.fin).toString(36)'));
 ok('bilan nettoyé (identifiants, textes bornés, bilan vide refusé) ; clé identique au journal, anciens matchs compris');
 // Recommandations
 const recos=J(D.recommandations({techniques:['volees','bandeja'],tactiques:['lobs','pression'],ressenti:2},1,E.exercicesPour));
 assert.equal(recos.length,3);
 assert.equal(recos[0].theme,'placement');
 assert.match(recos[0].raisons.join(' '),/Tu as noté en technique : volées/);assert.match(recos[0].raisons.join(' '),/gestion des lobs/);
 recos.forEach(r=>{assert.ok(r.exercice&&r.exercice.niveaux.includes(1),r.theme);assert.ok(r.fiche&&fs.existsSync(path.join(racine,r.fiche[0].split('#')[0])),r.theme);});
 assert.equal(recos.find(r=>r.theme==='aerien').objectif,'bandeja');
 assert.deepEqual(J(D.recommandations({techniques:['autre'],tactiques:[]},2,E.exercicesPour)),[]);
 ok('recommandations : 3 axes au plus, expliqués, avec fiche existante, exercice au niveau du joueur et objectif proposé');
 // Difficultés récentes → exercices recommandés
 const maintenant=Date.parse('2026-10-27T12:00:00Z');
 const tous={a:{techniques:['volees'],tactiques:[],maj:'2026-10-25T12:00:00Z'},b:{techniques:['smash'],tactiques:[],maj:'2026-08-01T12:00:00Z'}};
 const dif=J(D.difficultesDe(tous,maintenant));
 assert.equal(dif.length,1);assert.equal(dif[0].theme,'placement');assert.match(dif[0].raison,/Ton bilan du 25 octobre : volées/);
 const th=J(E.themesPrioritaires(null,[],[],dif));
 assert.equal(th[0].theme,'placement');assert.match(th[0].raisons[0],/Ton bilan du 25 octobre/);
 ok('difficultés des bilans des 30 derniers jours reprises dans les exercices recommandés, avec leur raison');
}
function sql(){
 const s1=fs.readFileSync(path.join(racine,'supabase/migrations/2026-10-27-diagnostic-01-colonne-diagnostic.sql'),'utf8');
 const s2=fs.readFileSync(path.join(racine,'supabase/migrations/2026-10-27-diagnostic-02-modification-diagnostic.sql'),'utf8');
 assert.match(s1,/add column if not exists diagnostic jsonb check \(diagnostic is null or \(jsonb_typeof\(diagnostic\) = 'object' and pg_column_size\(diagnostic\) < 4000\)\)/);
 assert.match(s2,/for update to authenticated using \(auth\.uid\(\) = user_id\) with check \(auth\.uid\(\) = user_id\)/);
 assert.match(s2,/revoke update on public\.matchs from authenticated;/);
 assert.match(s2,/grant update \(diagnostic\) on public\.matchs to authenticated;/);
 ok('SQL : colonne bornée ; un joueur ne modifie que ses matchs, et seulement leur bilan');
}

const SDK=`(function(){
 window.__ops=[];
 const session=()=>sessionStorage.getItem('session')?{user:{id:'u1',email:'j@t.fr'}}:null;
 const requete=table=>{const q=new Proxy({},{get(_,k){
  if(k==='then')return ok=>ok({data:[],error:null});
  if(k==='maybeSingle'||k==='single')return ()=>Promise.resolve({data:null,error:null});
  if(['upsert','insert','delete','update'].includes(k))return v=>{window.__ops.push(table+':'+k+(k==='update'?':'+JSON.stringify(v).slice(0,40):''));return q;};
  return ()=>q;}});return q;};
 window.supabase={createClient(){return {auth:{getSession:async()=>({data:{session:session()}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),signOut:async()=>({})},
  from:requete,rpc:async()=>({data:null,error:null})};}};
})();`;
const CONFIG=liste=>fs.readFileSync(path.join(racine,'assets/js/supabase-config.js'),'utf8')+'\nwindow.PA_SUPABASE.activees='+JSON.stringify(liste)+';\n';
const serveur=http.createServer((req,res)=>{
 const rel=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\//,'')||'index.html';
 const p=path.resolve(racine,rel);
 if(!p.startsWith(racine+path.sep)){res.writeHead(403);res.end();return;}
 fs.readFile(p,(e,b)=>{if(e){res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.webp':'image/webp','.webmanifest':'application/manifest+json'})[path.extname(p)]||'text/plain');res.end(b);
 });
});
(async()=>{
 moteur();sql();
 await new Promise(r=>serveur.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+serveur.address().port;
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const erreurs=[];
 const ouvrir=async({activees=[],connecte=true,avant}={})=>{
  const ctx=await browser.newContext({serviceWorkers:'block',viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await ctx.route('https://**',r=>r.fulfill({body:''}));
  await ctx.route('**/supabase-js@*/**',r=>r.fulfill({contentType:'text/javascript',body:SDK}));
  await ctx.route('**/assets/js/supabase-config.js*',r=>r.fulfill({contentType:'text/javascript',body:CONFIG(activees)}));
  const page=await ctx.newPage();
  page.on('pageerror',e=>erreurs.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))erreurs.push(m.text());});
  await page.goto(base+'/index.html');
  if(connecte)await page.evaluate(()=>sessionStorage.setItem('session','1'));
  if(avant)await page.evaluate(avant);
  return {ctx,page};
 };
 const jouer=async page=>{
  await page.goto(base+'/score.html');await page.click('text=Commencer le match');
  for(let i=0;i<8;i++){
   await page.getByRole('button',{name:i%2?/Eux/:/Nous/}).first().click();
   const m=page.getByRole('button',{name:i%2?/faute/i:/gagnant/i}).first();if(await m.count()&&await m.isVisible())await m.click();
  }
  await page.click('text=Arrêter le match');
  const c=page.getByRole('button',{name:/confirmer|oui/i}).first();if(await c.count()&&await c.isVisible())await c.click();
  await page.waitForSelector('#sc-diagnostic .dg-ouvrir');
 };
 try{
  // ---- Compteur ----
  let {ctx,page}=await ouvrir({connecte:false});
  await jouer(page);
  assert.match(await page.textContent('#sc-diagnostic'),/Comment s'est passé ton match/);
  assert.equal(await page.getAttribute('a:has-text("Mon journal de matchs")','href'),'espace.html#esp-bloc-matchs');
  assert.ok((await page.$$eval('.sc-barre-nom',e=>e.map(x=>x.textContent))).includes('Faute directe de Nous'));
  await page.click('#sc-diagnostic .dg-ouvrir');
  await page.click('#sc-diagnostic button[type=submit]');
  assert.match(await page.textContent('#sc-diagnostic .acc-err'),/au moins une réponse/);
  ok('compteur : invitation au bilan après le match, lien vers le journal, faute attribuée à la bonne paire, bilan vide refusé');
  await page.click('#sc-diagnostic label:has-text("2 · Difficile")');
  await page.click('#sc-diagnostic label:has-text("Bandeja")');
  await page.click('#sc-diagnostic label:has-text("Gestion des lobs")');
  await page.fill('#sc-diagnostic textarea >> nth=0','Bonne défense');
  await page.fill('#sc-diagnostic textarea >> nth=1','Monter derrière chaque lob');
  await page.click('#sc-diagnostic button[type=submit]');
  await page.waitForSelector('#sc-diagnostic .dg-reco');
  const texte=await page.textContent('#sc-diagnostic');
  assert.match(texte,/Ressenti : 2\/5 · Difficile/);assert.match(texte,/Objectif du prochain match : Monter derrière chaque lob/);
  assert.match(texte,/c'est ton ressenti, pas une mesure/);
  assert.ok(await page.locator('#sc-diagnostic .dg-reco').count()>=2);
  const cle=await page.evaluate(()=>Object.keys(JSON.parse(localStorage.getItem('pa-diagnostics')))[0]);
  const histo=await page.evaluate(()=>JSON.parse(localStorage.getItem('pa-score-historique'))[0].cle);
  assert.equal(cle,histo);
  ok('enregistrement : résumé, recommandations (ressenti, pas une mesure), bilan rattaché au match par sa clé');
  // Ajouter à mes objectifs
  const bouton=page.locator('#sc-diagnostic .dg-reco',{hasText:'Bandeja'}).locator('.dg-objectif');
  await bouton.click();
  assert.equal(await bouton.isDisabled(),true);assert.match(await bouton.textContent(),/Dans mes objectifs : maîtriser la bandeja/);
  assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('pa-objectifs-jeu')).map(o=>o.objectif)),['bandeja']);
  ok('« Ajouter à mes objectifs » : objectif de jeu ajouté (bandeja), bouton désactivé');
  // Modifier : formulaire pré-rempli
  await page.click('#sc-diagnostic button:has-text("Modifier le bilan")');
  assert.equal(await page.locator('#sc-diagnostic input[value="bandeja"]').isChecked(),true);
  assert.equal(await page.inputValue('#sc-diagnostic textarea >> nth=1'),'Monter derrière chaque lob');
  await page.click('#sc-diagnostic label:has-text("4 · Bon")');
  await page.click('#sc-diagnostic button[type=submit]');
  await page.waitForSelector('#sc-diagnostic .dg-resume');
  assert.match(await page.textContent('#sc-diagnostic'),/Ressenti : 4\/5 · Bon/);
  // Retrouvé depuis l'historique du compteur
  await page.reload();
  await page.locator('#sc-historique button.sc-histo').first().click();
  await page.waitForSelector('#sc-diagnostic .dg-resume');
  assert.match(await page.textContent('#sc-diagnostic'),/4\/5/);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),390);
  ok('modification pré-remplie et enregistrée ; bilan retrouvé depuis l\'historique du compteur ; 390 px');
  // Supprimer (confirmation)
  await page.click('#sc-diagnostic .dg-supprimer');
  assert.match(await page.textContent('#sc-diagnostic .dg-supprimer'),/Confirmer/);
  await page.click('#sc-diagnostic .dg-supprimer');
  await page.waitForSelector('#sc-diagnostic .dg-ouvrir');
  assert.equal(await page.evaluate(()=>Object.keys(JSON.parse(localStorage.getItem('pa-diagnostics'))).length),0);
  await ctx.close();
  ok('suppression avec confirmation : bilan effacé, invitation de nouveau proposée');
  // ---- Espace : journal ----
  ({ctx,page}=await ouvrir({avant:()=>{
   const fin1='2026-10-20T18:00:00.000Z',fin2='2026-10-26T18:00:00.000Z';
   const pts=[{g:0,m:'gagnant'},{g:1,m:'faute'}];
   const cfg={nomA:'Nous',nomB:'Léo et Max',serveur:0,egalite:'decisif',dernierSet:'super'};
   // Ancien match sans clé (clé déduite de la date) + match récent sans bilan
   localStorage.setItem('pa-score-historique',JSON.stringify([{config:{...cfg,nomB:'Récents'},points:pts,fin:fin2,score:'6-3',vainqueur:0,interrompu:false},{config:cfg,points:pts,fin:fin1,score:'4-6',vainqueur:1,interrompu:false}]));
   localStorage.setItem('pa-diagnostics',JSON.stringify({['m-'+Date.parse(fin1).toString(36)]:{ressenti:2,techniques:['volees'],tactiques:[],positif:'',prochain:'',maj:new Date().toISOString()}}));
  }}));
  await page.goto(base+'/espace.html');await page.waitForSelector('.esp-bilan');
  const etiquettes=await page.locator('.esp-bilan').allTextContents();
  assert.deepEqual(etiquettes,['Bilan','Bilan ✓']);
  await page.locator('.esp-bilan').nth(1).click();
  assert.equal(await page.locator('.esp-bilan').nth(1).getAttribute('aria-expanded'),'true');
  await page.waitForSelector('.esp-bilan-panneau .dg-resume');
  assert.match(await page.textContent('.esp-bilan-panneau:not([hidden])'),/Technique : Volées/);
  assert.match(await page.textContent('.bord-programme'),/Ton bilan du \d+ \w+ : volées/);
  ok('journal : « Bilan ✓ » pour l\'ancien match (clé déduite), bilan affiché sous le match, difficulté reprise dans le programme');
  await page.locator('.esp-bilan').first().click();
  await page.waitForSelector('.esp-bilan-panneau:not([hidden]) .dg-form');
  await page.locator('.esp-bilan-panneau:not([hidden]) label:has-text("Sortie de vitre")').first().click();
  await page.locator('.esp-bilan-panneau:not([hidden]) button[type=submit]').first().click();
  await page.waitForFunction(()=>Object.keys(JSON.parse(localStorage.getItem('pa-diagnostics'))).length===2);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),390);
  await ctx.close();
  ok('journal : nouveau bilan fait depuis l\'espace ; 390 px');
  // ---- Compte : envoi seulement avec "journal" + "diagnostic" ----
  for(const [liste,attendu] of [[['journal'],false],[['journal','diagnostic'],true]]){
   ({ctx,page}=await ouvrir({activees:liste}));
   await jouer(page);
   await page.click('#sc-diagnostic .dg-ouvrir');await page.click('#sc-diagnostic label:has-text("Lob")');await page.click('#sc-diagnostic button[type=submit]');
   await page.waitForSelector('#sc-diagnostic .dg-resume');await page.waitForTimeout(200);
   const ops=await page.evaluate(()=>window.__ops);
   assert.equal(ops.some(o=>o.startsWith('matchs:update:{"diagnostic"')),attendu,liste.join('+')+' : '+ops.join(','));
   await ctx.close();
  }
  ok('compte : bilan écrit dans la ligne du match seulement si "journal" et "diagnostic" sont actifs');
  assert.deepEqual(erreurs,[]);
  ok('aucune erreur console');
  console.log('TOTAL '+nb+' contrôles réussis.');
 }finally{await browser.close();serveur.close();}
})().catch(e=>{console.error(e);serveur.close();process.exitCode=1;});
