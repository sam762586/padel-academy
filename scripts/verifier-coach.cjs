/* Vérification du coach IA :
   1) logique de la fonction (supabase/functions/coach/logique.ts, lue directement par Node) : validation de la demande,
      contexte du joueur, requête au modèle (cache du contenu du site, repli en cas de refus), lecture de la réponse ;
   2) base de connaissances générée à jour ;
   3) navigateur (coach.html, Supabase simulé) : sans "coach" actif, sans connexion, conversation (envoi, réponse mise
      en forme, liens internes seulement, contexte du joueur envoyé ou non), quota atteint, conversation gardée, aucun débordement.
   Lancer depuis la racine du site : node scripts/verifier-coach.cjs */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {execFileSync}=require('node:child_process');
const {pathToFileURL}=require('node:url');
const {chromium}=require('playwright');
const racine=path.join(__dirname,'..');
let nb=0;
function ok(nom){nb++;console.log('OK '+nom);}
process.on('unhandledRejection',e=>{if(e&&e.name==='TargetClosedError')return;console.error(e);process.exitCode=1;});
process.removeAllListeners('warning');

async function logique(){
 const L=await import(pathToFileURL(path.join(racine,'supabase/functions/coach/logique.ts')).href);
 assert.equal(L.validerDemande(null).ok,false);
 assert.equal(L.validerDemande({question:'   '}).ok,false);
 assert.equal(L.validerDemande({question:'x'.repeat(L.MAX_QUESTION+1)}).ok,false);
 const longue=[...Array(20)].map((_,i)=>({role:i%2?'assistant':'user',texte:'message '+i}));
 let v=L.validerDemande({question:'Comment sortir de la vitre ?\u0007',historique:[{role:'assistant',texte:'orphelin'},...longue,{role:'pirate',texte:'x'},{texte:''}],
  contexte:{palier:'P250',priorites:['Sorties de vitre',42,'Régularité'],classement:'3 500e messieurs',matchs:'x'.repeat(900),inconnu:'à ignorer'}});
 assert.equal(v.ok,true);
 const d=v.demande;
 assert.equal(d.question,'Comment sortir de la vitre ?');
 assert.ok(d.historique.length<=L.MAX_TOURS&&d.historique[0].role==='user');
 assert.equal(d.contexte.matchs.length,400);assert.deepEqual([...d.contexte.priorites],['Sorties de vitre','Régularité']);assert.equal(d.contexte.inconnu,undefined);
 ok('validation : question obligatoire et bornée, historique limité et commençant par le joueur, contexte nettoyé');
 const r=L.construireRequete(d,'CONTENU');
 assert.equal(r.model,'claude-opus-5-5');assert.equal(r.fallbacks,'default');assert.deepEqual([...r.betas],['server-side-fallback-2026-07-01']);
 assert.equal(r.system[1].text,'CONTENU');assert.deepEqual({...r.system[1].cache_control},{type:'ephemeral'});
 assert.ok(!('cache_control' in r.system[0]));
 const dernier=r.messages[r.messages.length-1];
 assert.equal(dernier.role,'user');assert.match(dernier.content,/<contexte_joueur>[\s\S]*Palier au test de niveau : P250[\s\S]*<\/contexte_joueur>\n\nComment sortir/);
 assert.ok(!('temperature' in r)&&!('thinking' in r));
 assert.equal(L.construireRequete({question:'Q',historique:[],contexte:{}},'C').messages[0].content,'Q');
 ok('requête : contenu du site mis en cache après les consignes, repli automatique, contexte avant la question');
 assert.deepEqual({...L.lireReponse({stop_reason:'end_turn',content:[{type:'thinking',thinking:''},{type:'text',text:' Bonjour '}]})},{ok:true,texte:'Bonjour'});
 assert.equal(L.lireReponse({stop_reason:'refusal',content:[]}).ok,false);
 assert.equal(L.lireReponse({stop_reason:'end_turn',content:[]}).ok,false);
 assert.match(L.lireReponse({stop_reason:'max_tokens',content:[{type:'text',text:'Début'}]}).texte,/\[…\]$/);
 ok('réponse : texte seul, refus et réponse vide signalés, réponse coupée marquée');
 // Base de connaissances à jour avec le site
 const sortie=execFileSync(process.execPath,[path.join(__dirname,'generer-connaissances.js')],{encoding:'utf8'});
 assert.match(sortie,/^Inchangé/,'connaissances.ts en retard : lancer node scripts/generer-connaissances.js');
 const k=fs.readFileSync(path.join(racine,'supabase/functions/coach/connaissances.ts'),'utf8');
 assert.ok(k.includes('Page https://apprendre-padel.fr/regles.html')&&k.includes('bandeja')&&k.includes('Données : raquettes'));
 assert.ok(!/<nav|<footer|<script/.test(k));
 ok('base de connaissances à jour : pages, données des coups, raquettes, sans menu ni scripts');
}

// Supabase simulé : session selon sessionStorage « connecte », fonction « coach » selon « mode »
const SDK=`(function(){
 window.__appels=[];
 window.supabase={createClient(){return {
  auth:{getSession:async()=>({data:{session:sessionStorage.getItem('connecte')?{user:{id:'u1',email:'t@t.fr'}}:null}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),signOut:async()=>({})},
  from(){return {select(){return this;},eq(){return this;},order(){return this;},limit(){return Promise.resolve({data:[],error:null});},maybeSingle(){return Promise.resolve({data:null,error:null});}};},
  rpc:async()=>({data:null,error:null}),
  functions:{invoke:async(nom,{body})=>{
   window.__appels.push({nom,body:JSON.parse(JSON.stringify(body))});
   await new Promise(r=>setTimeout(r,60));
   const mode=sessionStorage.getItem('mode')||'ok';
   if(mode==='quota')return {data:null,error:{message:'Edge Function returned a non-2xx status code',context:new Response(JSON.stringify({erreur:'Tu as posé tes 10 questions du jour. Le coach te retrouve demain.',restant:0}),{status:429})}};
   return {data:{reponse:"Laisse la balle sortir de la vitre, **puis** joue haut.\\n\\n- Recule tôt\\n- Joue un lob profond\\n\\nPlus de détails : https://apprendre-padel.fr/technique.html. À éviter : https://exemple.com/piege",restant:9},error:null};
  }}
 };}};
})();`;
const CONFIG=(liste)=>fs.readFileSync(path.join(racine,'assets/js/supabase-config.js'),'utf8')+'\nwindow.PA_SUPABASE.url="https://faux.supabase.co";window.PA_SUPABASE.anonKey="cle";window.PA_SUPABASE.activees='+JSON.stringify(liste)+';\n';

const serveur=http.createServer((req,res)=>{
 const rel=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\//,'')||'index.html';
 const p=path.resolve(racine,rel);
 if(!p.startsWith(racine+path.sep)){res.writeHead(403);res.end();return;}
 fs.readFile(p,(e,b)=>{if(e){res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.webp':'image/webp','.webmanifest':'application/manifest+json'})[path.extname(p)]||'text/plain');res.end(b);
 });
});
(async()=>{
 await logique();
 await new Promise(r=>serveur.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+serveur.address().port;
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const erreurs=[];
 const ouvrir=async(activees,avant)=>{
  const ctx=await browser.newContext({serviceWorkers:'block',viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await ctx.route('**/supabase-js@*/**',r=>r.fulfill({contentType:'text/javascript',body:SDK}));
  await ctx.route('**/assets/js/supabase-config.js*',r=>r.fulfill({contentType:'text/javascript',body:CONFIG(activees)}));
  await ctx.route('https://gc.zgo.at/**',r=>r.fulfill({contentType:'text/javascript',body:''}));
  await ctx.route('https://fonts.**',r=>r.fulfill({body:''}));
  const page=await ctx.newPage();
  page.on('pageerror',e=>erreurs.push(e.message));page.on('console',m=>{if(m.type()==='error')erreurs.push(m.text());});
  if(avant){await page.goto(base+'/index.html');await page.evaluate(avant);}
  await page.goto(base+'/coach.html');
  await page.waitForFunction(()=>document.getElementById('coach-statut').childElementCount||!document.getElementById('coach-zone').hidden);
  return {ctx,page};
 };
 try{
  // Coach pas encore activé
  let {ctx,page}=await ouvrir([]);
  assert.match(await page.textContent('#coach-statut'),/arrive bientôt/);assert.equal(await page.locator('#coach-zone').isHidden(),true);
  await ctx.close();
  // Activé, pas connecté
  ({ctx,page}=await ouvrir(['coach']));
  assert.match(await page.textContent('#coach-statut'),/Connecte-toi/);assert.equal(await page.locator('#coach-zone').isHidden(),true);
  await ctx.close();
  ok('sans "coach" actif : « bientôt » ; sans connexion : invitation à se connecter');
  // Connecté, avec un profil (test v2, rang, un match compté)
  ({ctx,page}=await ouvrir(['coach'],()=>{
   sessionStorage.setItem('connecte','1');
   localStorage.setItem('pa-quiz-dernier',JSON.stringify({version:2,date:new Date().toISOString(),palier:2,niveau:2,score:20,priorites:['vitre','aerien'],reponses:[]}));
   localStorage.setItem('pa-classement-fft',JSON.stringify({rang:12500,sexe:'messieurs',maj:new Date().toISOString()}));
   const pts=[...Array(6)].map(()=>({g:1,m:'faute'})).concat([...Array(4)].map(()=>({g:0,m:'gagnant'})));
   localStorage.setItem('pa-score-historique',JSON.stringify([{cle:'match-test-01',config:{nomA:'Nous',nomB:'Eux',serveur:0,egalite:'decisif',dernierSet:'super'},points:pts,fin:new Date().toISOString(),score:'6-4',vainqueur:0,interrompu:false}]));
  }));
  assert.equal(await page.locator('#coach-zone').isVisible(),true);
  const suggestions=await page.locator('.coach-suggestion').allTextContents();
  assert.equal(suggestions.length,3);assert.match(suggestions[0],/vitre/);
  await page.click('.coach-contexte summary');
  const contexte=await page.textContent('#coach-contexte-liste');
  assert.match(contexte,/P100/);assert.match(contexte,/12\s500e messieurs/);assert.match(contexte,/faute directe 100 %/);
  ok('connecté : suggestions tirées des priorités, « ce que le coach sait de toi » (palier, rang, matchs)');
  await page.fill('#coach-question','Comment sortir de la double vitre ?');
  await page.click('#coach-envoyer');
  await page.waitForSelector('.coach-attente');
  await page.waitForSelector('.coach-coach:not(.coach-attente)');
  const appel=(await page.evaluate(()=>window.__appels))[0];
  assert.equal(appel.nom,'coach');assert.equal(appel.body.question,'Comment sortir de la double vitre ?');
  assert.deepEqual(appel.body.historique,[]);assert.equal(appel.body.contexte.palier,'P100');assert.deepEqual(appel.body.contexte.priorites,['Sorties de vitre','Bandeja, víbora, smash']);
  const rep=page.locator('.coach-coach').last();
  assert.equal(await rep.locator('b').textContent(),'puis');assert.equal(await rep.locator('li').count(),2);
  const liens=await rep.locator('a').evaluateAll(a=>a.map(x=>x.getAttribute('href')));
  assert.deepEqual(liens,['technique.html']);assert.equal(await rep.locator('a').textContent(),'page Technique');assert.match(await rep.textContent(),/https:\/\/exemple\.com\/piege/);
  assert.match(await page.textContent('#coach-restant'),/Encore 9 questions/);
  ok('envoi : question, historique et contexte envoyés ; réponse mise en forme ; seul le lien du site est cliquable');
  // Deuxième question sans partage du profil : l'historique part, le contexte non
  await page.uncheck('#coach-partage');
  await page.fill('#coach-question','Et en mixte ?');await page.keyboard.press('Control+Enter');
  await page.waitForFunction(()=>document.querySelectorAll('.coach-coach:not(.coach-attente)').length===2);
  const appel2=(await page.evaluate(()=>window.__appels))[1];
  assert.equal(appel2.body.historique.length,2);assert.deepEqual(appel2.body.contexte,{});
  ok('suite de conversation : historique envoyé, profil non partagé si la case est décochée (Ctrl+Entrée envoie)');
  // Conversation gardée après rechargement, puis quota atteint : message, question remise dans le champ
  await page.evaluate(()=>sessionStorage.setItem('mode','quota'));
  await page.reload();await page.waitForSelector('#coach-zone:not([hidden])');
  assert.equal(await page.locator('.coach-joueur').count(),2);assert.equal(await page.isChecked('#coach-partage'),false);
  await page.fill('#coach-question','Une troisième ?');await page.click('#coach-envoyer');
  await page.waitForSelector('.coach-erreur');
  assert.match(await page.textContent('.coach-erreur'),/10 questions du jour/);
  assert.equal(await page.inputValue('#coach-question'),'Une troisième ?');
  assert.equal(await page.locator('.coach-joueur').count(),2);
  assert.match(await page.textContent('#coach-restant'),/à demain/);
  ok('conversation gardée sur l\'appareil ; quota atteint : message clair, question rendue au champ');
  await page.click('#coach-nouvelle');
  assert.equal(await page.locator('.coach-msg').count(),0);assert.equal(await page.locator('.coach-suggestion').count(),3);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),390);
  ok('« Nouvelle conversation » efface tout ; aucun débordement à 390 px');
  await ctx.close();
  assert.deepEqual(erreurs,[]);
  ok('aucune erreur console');
  console.log('TOTAL '+nb+' contrôles réussis.');
 }finally{await browser.close();serveur.close();}
})().catch(e=>{console.error(e);serveur.close();process.exitCode=1;});
