/* Vérification du compteur de match (score.html) : moteur de score + parcours complet dans Edge à 390 px.
   Lancer depuis la racine du site : node scripts/verifier-score.cjs */
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

/* ---- Moteur, hors navigateur ---- */
function moteur(){
 const fen={};
 vm.runInNewContext(fs.readFileSync(path.join(racine,'assets/js/score.js'),'utf8'),{window:fen,document:{getElementById:()=>null}});
 const J=x=>JSON.parse(JSON.stringify(x)),R=fen.PA_SCORE;
 const S={...R,calculer:(c,p)=>J(R.calculer(c,p)),libellesPoints:(c,e)=>J(R.libellesPoints(c,e))};
 const cfg=(o={})=>({nomA:'A',nomB:'B',serveur:0,egalite:'decisif',dernierSet:'super',...o});
 const P=s=>[...s].map(c=>({g:c==='a'?0:1,m:null}));
 const jeu=w=>w.repeat(4);
 let e=S.calculer(cfg(),P('aaabbb'));
 assert.deepEqual(S.libellesPoints(cfg(),e),['40','40']);assert.match(S.situation(cfg(),e),/décisif/);
 e=S.calculer(cfg(),P('aaabbbb'));assert.deepEqual(e.jeux,[0,1]);assert.equal(e.serveur,1);
 ok('point décisif à 40-40 et changement de serveur');
 const av=cfg({egalite:'avantages'});
 assert.deepEqual(S.libellesPoints(av,S.calculer(av,P('aaabbbb'))),['40','AV']);
 assert.deepEqual(S.libellesPoints(av,S.calculer(av,P('aaabbbba'))),['40','40']);
 assert.deepEqual(S.calculer(av,P('aaabbbbaaa')).jeux,[1,0]);
 ok('avantages : AV, retour à égalité, jeu');
 assert.equal(S.scoreTexte(S.calculer(cfg(),P((jeu('a')+jeu('b')).repeat(5)+jeu('a')+jeu('a')))),'7-5');
 const six6=(jeu('a')+jeu('b')).repeat(6);
 e=S.calculer(cfg(),P(six6));assert.equal(e.tieBreak.cible,7);assert.equal(e.serveur,0);
 const ordre=[];for(let n=0;n<7;n++)ordre.push(S.calculer(cfg(),P(six6+'ababab'.slice(0,n))).serveur);
 assert.deepEqual(ordre,[0,1,1,0,0,1,1]);
 e=S.calculer(cfg(),P(six6+'aaaaaaa'));assert.equal(S.scoreTexte(e),'7-6 (7-0)');assert.equal(e.serveur,1);
 assert.equal(S.scoreTexte(S.calculer(cfg(),P(six6+'ababababababaa'))),'7-6 (8-6)');
 ok('tie-break : 7 points, 2 d\'écart, ordre de service A-BB-AA, la paire qui a reçu en premier sert ensuite');
 const setA=jeu('a').repeat(6),setB=jeu('b').repeat(6);
 e=S.calculer(cfg(),P(setA+setB));assert.equal(e.tieBreak.cible,10);
 e=S.calculer(cfg(),P(setA+setB+'a'.repeat(9)+'b'.repeat(9)+'aa'));assert.ok(e.fini);assert.equal(S.scoreTexte(e),'6-0 0-6 [11-9]');
 e=S.calculer(cfg({dernierSet:'set'}),P(setA+setB+setA));assert.equal(S.scoreTexte(e),'6-0 0-6 6-0');
 e=S.calculer(cfg(),P(setA+setA+'bbbb'));assert.ok(e.fini);assert.equal(e.joues,48);
 ok('super tie-break ou 3e set, fin de match, points ignorés après la fin');
 e=S.calculer(cfg(),[{g:0,m:'smash'},{g:0,m:'smash'},{g:1,m:'double'},{g:0,m:null},{g:0,m:'lob'}]);
 assert.deepEqual(e.stats.points,[4,1]);assert.equal(e.stats.motifs[0].smash,2);assert.deepEqual(e.stats.serie,[2,1]);
 assert.ok(!S.pointsValides([{g:2,m:null}]));assert.ok(!S.pointsValides([{g:0,m:'inconnu'}]));assert.ok(!S.configValide({...cfg(),nomA:''}));
 ok('statistiques et validation des données');
}

/* ---- Envoi au compte (compte.js) avec un faux client Supabase ---- */
async function compteMatchs(){
 const inserts=[];let erreur=null;
 const client={auth:{getSession:async()=>({data:{session:{user:{id:'U1'}}}}),onAuthStateChange:()=>{}},
  from:table=>({insert:async ligne=>{inserts.push({table,ligne});return {error:erreur};}})};
 const fen={PA_SUPABASE:{url:'simulation',anonKey:'simulation'},supabase:{createClient:()=>client}};
 const bac={window:fen,document:{getElementById:()=>null},location:{protocol:'https:'},URL,localStorage:{removeItem(){}}};
 vm.runInNewContext(fs.readFileSync(path.join(racine,'assets/js/score.js'),'utf8'),bac);
 vm.runInNewContext(fs.readFileSync(path.join(racine,'assets/js/compte.js'),'utf8'),bac);
 const compte=fen.PA_COMPTE;await compte.ready;
 const match={config:{nomA:'Nous',nomB:'Eux',serveur:1,egalite:'decisif',dernierSet:'super'},points:[{g:0,m:'smash'},{g:1,m:null}],fin:'2026-10-26T18:00:00.000Z',interrompu:true,score:'',vainqueur:null};
 let r=await compte.saveMatch(match);
 assert.equal(r.ok,true);assert.equal(inserts.length,1);assert.equal(inserts[0].table,'matchs');
 const l=inserts[0].ligne;
 assert.equal(l.user_id,'U1');assert.equal(l.nom_a,'Nous');assert.equal(JSON.stringify(l.format),'{"egalite":"decisif","dernierSet":"super","serveur":1}');assert.equal(l.points.length,2);assert.equal(l.interrompu,true);
 r=await compte.saveMatch({...match,points:[{g:3,m:null}]});assert.equal(r.ok,false);
 r=await compte.saveMatch({...match,vainqueur:2});assert.equal(r.ok,false);
 r=await compte.saveMatch({...match,points:[]});assert.equal(r.ok,false);
 assert.equal(inserts.length,1);
 erreur={code:'PGRST205',message:'Could not find the table'};
 r=await compte.saveMatch(match);assert.equal(r.ok,false);assert.match(r.message,/pas encore activée/);
 ok('compte : match envoyé à la table matchs, données invalides refusées, table absente expliquée');
}

(async()=>{
 moteur();
 await compteMatchs();
 await new Promise(r=>serveur.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+serveur.address().port;
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const erreurs=[];
 try{
  const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const page=await ctx.newPage();
  page.on('pageerror',e=>erreurs.push(e.message));
  page.on('console',m=>{if(m.type()==='error')erreurs.push(m.text());});
  await page.goto(base+'/score.html');
  await page.fill('#sc-nom-a','Sam & Léo');await page.fill('#sc-nom-b','Les Rouennais');
  assert.equal(await page.textContent('#sc-serveur-b'),'Les Rouennais');
  await page.click('label.tchip:has(input[name=sc-serveur][value="1"])');
  await page.click('#sc-form button[type=submit]');
  assert.ok(await page.isVisible('#sc-match'));assert.ok(await page.isHidden('#sc-reglages'));
  assert.ok(await page.isVisible('#sc-service-1'));assert.ok(await page.isHidden('#sc-service-0'));
  ok('réglages : noms, serveur choisi, démarrage');
  const point=async(g,motif)=>{await page.click('#sc-point-'+g);await page.click(`#sc-motifs button[data-motif="${motif}"]`);};
  await point(0,'smash');
  assert.equal(await page.textContent('#sc-pts-0'),'15');
  await page.click('#sc-point-1');assert.ok(await page.isVisible('#sc-motifs'));
  await page.click('#sc-motifs button[data-motif="retour"]');
  assert.ok(await page.isVisible('#sc-gagnants'));assert.equal(await page.textContent('#sc-pts-1'),'0');
  await point(1,'faute');await page.click('#sc-annuler');
  assert.equal(await page.textContent('#sc-pts-1'),'0');assert.equal(await page.textContent('#sc-pts-0'),'15');
  ok('point + motif, retour sans compter, annulation du dernier point');
  for(let i=0;i<3;i++)await point(1,'aucun');
  for(let i=0;i<2;i++)await point(0,'volee');
  assert.equal(await page.textContent('#sc-pts-0'),'40');assert.equal(await page.textContent('#sc-pts-1'),'40');
  assert.match(await page.textContent('#sc-situation'),/décisif/);
  await page.reload();
  assert.ok(await page.isVisible('#sc-match'));assert.equal(await page.textContent('#sc-pts-0'),'40');
  assert.equal(await page.textContent('#sc-nom-0'),'Sam & Léo');
  ok('rechargement : match en cours repris au même score');
  // Tailles tactiles et débordement à 390 px
  const tailles=await page.evaluate(()=>[...document.querySelectorAll('#sc-match button')].filter(b=>b.offsetParent).map(b=>Math.round(b.getBoundingClientRect().height)));
  assert.ok(tailles.every(h=>h>=48),'boutons trop petits : '+tailles);
  assert.ok(await page.evaluate(()=>document.querySelector('#sc-point-0').getBoundingClientRect().height>=56));
  await page.click('#sc-point-0');
  const motifs=await page.evaluate(()=>[...document.querySelectorAll('#sc-motifs button')].map(b=>Math.round(b.getBoundingClientRect().height)));
  assert.ok(motifs.every(h=>h>=56),'motifs trop petits : '+motifs);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),390);
  await page.click('#sc-motifs button[data-motif="lob"]');
  assert.equal(await page.textContent('#sc-jeux-0'),'1');
  ok('boutons tactiles ≥ 56 px pour les points et motifs, aucun débordement à 390 px');
  // Fin du match : 6-0 6-0 depuis 1-0
  for(let i=0;i<11*4;i++){await page.click('#sc-point-0');await page.click('#sc-motifs button[data-motif="gagnant"]');}
  assert.ok(await page.isVisible('#sc-fin'));
  assert.match(await page.textContent('.sc-recap-vainqueur'),/Sam & Léo/);
  assert.equal(await page.textContent('.sc-recap-score'),'6-0 6-0');
  assert.ok(await page.locator('.sc-barre').count()>=4);
  assert.match(await page.textContent('.sc-serie'),/Sam & Léo 4[0-9]/);
  assert.equal(await page.evaluate(()=>localStorage.getItem('pa-score-en-cours')),null);
  assert.equal(await page.locator('#sc-historique li').count(),1);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),390);
  ok('fin de match : récap (vainqueur, score, barres, série), historique, match en cours effacé');
  await page.click('#sc-revanche');
  assert.ok(await page.isVisible('#sc-match'));assert.equal(await page.textContent('#sc-nom-1'),'Les Rouennais');
  await point(1,'double');
  await page.click('#sc-arreter');await page.click('#sc-arret-non');assert.ok(await page.isVisible('#sc-match'));
  await page.click('#sc-arreter');await page.click('#sc-arret-oui');
  assert.match(await page.textContent('.sc-recap-vainqueur'),/arrêté/);
  assert.equal(await page.locator('#sc-historique li').count(),2);
  assert.match(await page.textContent('#sc-historique li:first-child'),/arrêté/);
  ok('revanche, arrêt avec confirmation intégrée');
  await page.click('#sc-historique li:last-child button');
  assert.equal(await page.textContent('.sc-recap-score'),'6-0 6-0');
  await page.click('#sc-effacer');await page.click('#sc-effacer-oui');
  assert.equal(await page.locator('#sc-historique li').count(),0);assert.ok(await page.isVisible('#sc-historique-vide'));
  ok('consultation d\'un ancien match, effacement de l\'historique');
  // Stockage corrompu : la page démarre quand même
  await page.evaluate(()=>{localStorage.setItem('pa-score-en-cours','{"config":{"nomA":""},"points":"x"}');localStorage.setItem('pa-score-historique','[1,null,{"x":2}]');});
  await page.reload();
  assert.ok(await page.isVisible('#sc-reglages'));assert.equal(await page.locator('#sc-historique li').count(),0);
  ok('stockage local mal formé ignoré sans plantage');
  assert.deepEqual(erreurs,[]);
  ok('aucune erreur console');
  console.log('TOTAL '+nb+' contrôles réussis.');
 }finally{await browser.close();serveur.close();}
})().catch(e=>{console.error(e);serveur.close();process.exitCode=1;});
