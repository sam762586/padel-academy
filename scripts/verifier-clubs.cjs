/* Vérification de la page « Pour les clubs » (clubs.html, assets/js/clubs.js) et du widget « Prochains tournois »
   (assets/js/widget-tournois.js) à coller sur le site d'un club :
   1) statique : title ≤ 60, description ≤ 160, canonique, un seul H1, polices préchargées, lien vers l'affiche PDF
      (le fichier n'est pas exigé), adresse de contact déjà publiée, page dans le sitemap et le shell du service worker,
      « Pour les clubs » dans le pied de page de toutes les pages ; widget sans « ?v= », sans cookie ni stockage, sans
      domaine tiers ; code affiché aux clubs = code produit par clubs.js ;
   2) dans Edge (390 px, horloge figée au premier tournoi du JSON) : widget rendu sur clubs.html avec les tournois du 76,
      lien « Tous les tournois en Seine-Maritime » hors Shadow DOM ; page d'un club (CSS hostile, script chargé avant
      les conteneurs et deux fois) : filtre des tournois passés, tri par date, N respecté, liens fiche / Ten'Up, dates
      en français, texte échappé, département inconnu et sans données → messages en français, aucune fuite de style
      dans les deux sens ; « Copier le code » (presse-papiers + role="status") ; changement de département (code,
      texte, aperçu) ; 320 px sans débordement ; aucune erreur console.
   Lancer depuis la racine du site : node scripts/verifier-clubs.cjs */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const racine=path.join(__dirname,'..');
let nb=0;
function ok(nom){nb++;console.log('OK '+nom);}
process.on('unhandledRejection',e=>{if(e&&e.name==='TargetClosedError')return;console.error(e);process.exitCode=1;});
const lire=f=>fs.readFileSync(path.join(racine,f),'utf8');
const dec=t=>t.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#x27;|&#39;/g,"'").replace(/&amp;/g,'&');

/* ---------- 1) Contrôles statiques ---------- */
function statique(){
 const h=lire('clubs.html');
 const title=dec((h.match(/<title>([^<]*)<\/title>/)||[])[1]||'');
 const desc=dec((h.match(/<meta name="description" content="([^"]*)"/)||[])[1]||'');
 assert.ok(title&&title.length<=60,'title : '+title.length+' caractères');
 assert.ok(desc&&desc.length<=160,'description : '+desc.length+' caractères');
 assert.ok(h.includes('<link rel="canonical" href="https://apprendre-padel.fr/clubs.html">'),'canonique');
 assert.ok(!/noindex/.test(h),'page indexable');
 const corps=h.split(/<body[^>]*>/)[1];
 assert.equal((corps.match(/<h1[\s>]/g)||[]).length,1,'un seul H1');
 assert.ok(/<link rel="preload" href="assets\/fonts\/manrope-latin\.woff2"/.test(h)&&/<link rel="preload" href="assets\/fonts\/big-shoulders-display-latin\.woff2"/.test(h),'polices préchargées');
 assert.ok(/"@type": "BreadcrumbList"/.test(h),'fil d\'Ariane (JSON-LD)');
 assert.ok(/<main id="contenu" tabindex="-1">/.test(h),'<main> posé par le gabarit');
 ok('clubs.html : title ≤ 60, description ≤ 160, canonique, un H1, polices préchargées, fil d\'Ariane');

 assert.ok(/href="assets\/affiches\/affiche-club-a4\.pdf"/.test(corps),'lien vers l\'affiche A4 (le fichier sera ajouté avant publication)');
 const contact=(lire('mentions-legales.html').match(/mailto:([^"]+)"/)||[])[1];
 assert.ok(contact,'adresse de contact des mentions légales');
 assert.ok(corps.includes('mailto:'+contact),'la page renvoie à l\'adresse déjà publiée : '+contact);
 // Vouvoiement (on s'adresse à un club), sauf le texte pour les adhérents (#clubs-texte), qui tutoie les joueurs comme le reste du site
 const horsAdherents=corps.replace(/<script[\s\S]*?<\/script>/g,'').replace(/<div class="exemple clubs-texte" id="clubs-texte">[\s\S]*?<\/div>/,'');
 assert.ok(/vous/i.test(horsAdherents)&&!/\btu\b/.test(horsAdherents),'vouvoiement (on s\'adresse à un club)');
 for(const id of ['clubs-demo','clubs-dep','clubs-code','clubs-copier-code','clubs-retour-code','clubs-texte','clubs-copier-texte','clubs-retour-texte']) assert.ok(corps.includes('id="'+id+'"'),'élément #'+id);
 assert.ok(/<div id="clubs-retour-code" class="clubs-retour" role="status">/.test(corps),'zone de retour role="status"');
 ok('clubs.html : lien vers l\'affiche, contact = adresse des mentions légales, vouvoiement, éléments de la page');

 const sitemap=lire('sitemap.xml');
 assert.ok(sitemap.includes('<loc>https://apprendre-padel.fr/clubs.html</loc>'),'clubs.html dans le sitemap');
 const sw=lire('sw.js');
 for(const f of ['clubs.html','assets/js/clubs.js','assets/js/widget-tournois.js']) assert.ok(sw.includes('"'+f+'"'),f+' dans le shell du service worker');
 const pied=/<a href="(?:\.\.\/)*clubs\.html">Pour les clubs<\/a>/;
 for(const f of fs.readdirSync(racine).filter(n=>n.endsWith('.html')&&n!=='404.html')) assert.match((lire(f).match(/<footer>[\s\S]*?<\/footer>/)||[''])[0],pied,f+' : « Pour les clubs » dans le pied de page');
 assert.match(lire('tournois/76.html'),pied,'pages tournois : pied de page régénéré');
 assert.match(lire('404.html'),/<a href="\/clubs\.html">Pour les clubs<\/a>/,'404 : lien absolu');
 ok('sitemap, shell du service worker et pied de page de toutes les pages (racine, tournois, 404) : « Pour les clubs »');

 const w=lire('assets/js/widget-tournois.js').replace(/\/\*[\s\S]*?\*\/|^\s*\/\/.*$/gm,''); // code seul, sans les commentaires
 assert.ok(!/\?v=/.test(w),'widget : aucun « ?v= » (appelé par des sites tiers à une adresse fixe)');
 assert.ok(!/localStorage|sessionStorage|document\.cookie|indexedDB/.test(w),'widget : ni stockage ni cookie');
 const domaines=[...w.matchAll(/https?:\/\/([a-z0-9.-]+)/g)].map(m=>m[1]);
 assert.deepEqual([...new Set(domaines)].sort(),['apprendre-padel.fr','tenup.fft.fr'],'widget : seuls apprendre-padel.fr (données, pages) et tenup.fft.fr (liens) sont cités');
 assert.ok(!/innerHTML|insertAdjacentHTML/.test(w),'widget : aucun innerHTML (noms de tournois en textContent)');
 assert.ok(/attachShadow\(\{mode:"open"\}\)/.test(w),'widget : Shadow DOM');
 // Le code montré aux clubs dans la page = celui que clubs.js produit (deux lignes, adresse absolue en https)
 const codeHtml=dec((lire('clubs.html').match(/<code id="clubs-code">([\s\S]*?)<\/code>/)||[])[1]||'');
 const attendu='<div data-apprendre-padel-tournois="76" data-nombre="5"></div>\n<script src="https://apprendre-padel.fr/assets/js/widget-tournois.js" async></script>';
 assert.equal(codeHtml.replace(/\r\n/g,'\n'),attendu,'code à coller affiché dans la page');
 assert.ok(lire('assets/js/clubs.js').includes(`'<div data-apprendre-padel-tournois="'+dep+'" data-nombre="'+NOMBRE+'"></div>\\n<script src="'+SITE+'assets/js/widget-tournois.js" async></script>'`),'clubs.js produit le même code');
 ok('widget : sans ?v=, sans stockage, sans domaine tiers, sans innerHTML, Shadow DOM ; code à coller identique dans la page et clubs.js');
}

/* ---------- Départements : un JSON par département (101), même sans tournoi ; un département vide pour les tests ---------- */
const PROCHAINS=fs.readdirSync(path.join(racine,'assets/data/prochains')).filter(f=>f.endsWith('.json')).map(f=>JSON.parse(lire('assets/data/prochains/'+f)));
assert.equal(PROCHAINS.length,101,'un fichier prochains/<dep>.json par département');
for(const d of PROCHAINS){assert.ok(/^(0[1-9]|[1-8][0-9]|9[0-5]|2A|2B|97[1-6])$/.test(d.dep)&&d.nom&&d.lieu&&typeof d.page_dep==='boolean'&&Array.isArray(d.tournois),'prochains/'+d.dep+'.json : dep, nom, lieu, page_dep, tournois');}
const VIDE=PROCHAINS.find(d=>!d.tournois.length);
assert.ok(VIDE,'au moins un département sans tournoi pour le test');
ok('assets/data/prochains : 101 fichiers (dep, nom, lieu, page_dep, tournois), dont des départements vides (ex. '+VIDE.dep+' : '+VIDE.lieu+')');

/* ---------- Serveur local : le site, plus une « page de club » hostile ---------- */
const PAGE_CLUB=`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{font-family:Georgia,serif;color:#222;background:#fafafa}li{display:none}a{color:rgb(255,0,0)}ul{padding-left:80px}.wt-item{display:block}p{margin:0}</style>
<script src="/assets/js/widget-tournois.js" async></script>
</head><body>
<h1>Padel Club de Test</h1>
<div id="c14" data-apprendre-padel-tournois="14" data-nombre="3"></div>
<div id="cxx" data-apprendre-padel-tournois="XX"></div>
<div id="cvide" data-apprendre-padel-tournois="${VIDE.dep.toLowerCase()}"></div>
<ul id="dehors"><li class="wt-item">dehors</li></ul>
<script src="/assets/js/widget-tournois.js" async></script>
</body></html>`;
// Données du département 14 pour la page de club : désordre, un passé, un circuit en cours, nom à échapper, fiche / Ten'Up
const FAUX_14={dep:'14',nom:'Calvados',lieu:'dans le Calvados',page_dep:false,tournois:[
 {id:'5',nom:'P250 décembre',categorie:'P250',ville:'Caen',date_debut:'2026-12-01',date_fin:'2026-12-01',page:true},
 {id:'3',nom:'P100 <b>Test</b> & co',categorie:'P100',ville:'Bayeux',date_debut:'2026-11-05',date_fin:'2026-11-05',page:false},
 {id:'1',nom:'P25 passé',categorie:'P25',ville:'Vire',date_debut:'2026-10-20',date_fin:'2026-10-25',page:true},
 {id:'2',nom:'Circuit P50',categorie:'P50',ville:'Lisieux',date_debut:'2026-10-30',date_fin:'2027-08-31',page:true},
 {id:'4',nom:'P500 week-end',categorie:'P500',ville:'Caen',date_debut:'2026-11-02',date_fin:'2026-11-03',page:true}]};
const serveur=http.createServer((req,res)=>{
 const rel=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\//,'')||'index.html';
 if(rel==='club.html'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(PAGE_CLUB);return;}
 const p=path.resolve(racine,rel);
 if(!p.startsWith(racine+path.sep)){res.writeHead(403);res.end();return;}
 fs.readFile(p,(e,b)=>{if(e){res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2','.webmanifest':'application/manifest+json'})[path.extname(p)]||'text/plain');res.end(b);
 });
});

// Lecture du Shadow DOM depuis le test : éléments du widget d'un conteneur
const DANS=`((sel,id)=>{const r=document.getElementById(id).shadowRoot;return r?[...r.querySelectorAll(sel)]:[];})`;

(async()=>{
 statique();
 await new Promise(r=>serveur.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+serveur.address().port;
 const d76=JSON.parse(lire('assets/data/prochains/76.json'));
 assert.ok(d76.tournois.length,'76.json : des tournois');
 // Horloge figée au premier jour de tournoi du fichier : la liste ne dépend pas du jour où le test tourne
 const jour=d76.tournois.map(t=>t.date_debut).sort()[0];
 const attendus76=d76.tournois.filter(t=>(t.date_fin||t.date_debut)>=jour).sort((a,b)=>a.date_debut.localeCompare(b.date_debut)).slice(0,5);
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const erreurs=[];
 try{
  const ctx=await browser.newContext({serviceWorkers:'block',viewport:{width:390,height:844},isMobile:true,hasTouch:true,permissions:['clipboard-read','clipboard-write']});
  await ctx.route('https://gc.zgo.at/**',r=>r.fulfill({contentType:'text/javascript',body:''}));
  // Toute erreur console compte (un JSON existe pour chaque département, même vide : jamais de 404)
  const ecouter=p=>{
   p.on('pageerror',e=>erreurs.push(e.message));
   p.on('console',m=>{if(m.type()==='error')erreurs.push(m.text()+' @ '+((m.location()&&m.location().url)||''));});
  };
  const page=await ctx.newPage();
  ecouter(page);
  await page.clock.setFixedTime(new Date(jour+'T12:00:00'));

  /* ---- clubs.html : widget en démonstration (76) ---- */
  await page.goto(base+'/clubs.html');
  await page.waitForFunction(`${DANS}('.wt-item','clubs-demo').length>0`);
  const items=await page.evaluate(`${DANS}('.wt-item','clubs-demo').map(li=>({cat:li.querySelector('.wt-cat').textContent,nom:li.querySelector('.wt-nom').textContent,href:li.querySelector('.wt-nom').href,detail:li.querySelector('.wt-detail').textContent}))`);
  assert.equal(items.length,attendus76.length,'5 tournois au plus, tous à venir');
  attendus76.forEach((t,i)=>{
   assert.equal(items[i].nom,t.nom);assert.equal(items[i].cat,t.categorie);
   assert.equal(items[i].href,t.page?'https://apprendre-padel.fr/tournoi/'+t.id+'.html':'https://tenup.fft.fr/tournoi/'+t.id);
   assert.ok(items[i].detail.startsWith(t.ville+' · '),'ville puis dates : '+items[i].detail);
  });
  const titre=await page.evaluate(`${DANS}('.wt-titre','clubs-demo')[0].textContent`);
  assert.equal(titre,'Prochains tournois de padel · Seine-Maritime');
  ok('clubs.html : widget rendu avec les '+items.length+' prochains tournois du 76 (catégorie, nom, ville, dates, liens fiche ou Ten\'Up)');

  // Lien de bas de liste : dans la page (hors Shadow DOM, lisible par tous les robots), affiché dans le cadre par le <slot>
  const pied=await page.evaluate(()=>{const a=document.querySelector('#clubs-demo > p[slot="pied"] a');return a&&{texte:a.textContent,href:a.href,visible:a.getClientRects().length>0};});
  assert.ok(pied,'lien « Tous les tournois » enfant du conteneur');
  assert.equal(pied.texte,'Tous les tournois en Seine-Maritime sur apprendre-padel.fr');
  assert.equal(pied.href,'https://apprendre-padel.fr/tournois/76.html');
  assert.ok(pied.visible,'lien affiché via le slot');
  assert.ok(fs.existsSync(path.join(racine,'tournois/76.html')),'la page tournois/76.html existe bien');
  ok('lien « Tous les tournois en Seine-Maritime sur apprendre-padel.fr » → tournois/76.html, hors Shadow DOM et visible');

  /* ---- Copier le code ---- */
  await page.click('#clubs-copier-code');
  await page.waitForSelector('#clubs-retour-code .msg');
  const retour=await page.evaluate(()=>({classe:document.querySelector('#clubs-retour-code .msg').className,texte:document.querySelector('#clubs-retour-code').textContent}));
  assert.ok(retour.classe.includes('msg-ok'),'copie réussie : '+retour.texte);
  // Windows écrit \r\n dans le presse-papiers : on normalise avant de comparer
  const presse=(await page.evaluate(()=>navigator.clipboard.readText())).replace(/\r\n/g,'\n');
  assert.equal(presse,'<div data-apprendre-padel-tournois="76" data-nombre="5"></div>\n<script src="https://apprendre-padel.fr/assets/js/widget-tournois.js" async></script>');
  assert.equal(await page.getAttribute('#clubs-copier-code','disabled'),null,'bouton réactivé');
  ok('« Copier le code » : presse-papiers = les deux lignes à coller, retour role="status", bouton réactivé');

  /* ---- Changement de département : code, texte, aperçu ---- */
  assert.ok((await page.locator('#clubs-dep option').count())>=100,'liste des départements remplie');
  await page.selectOption('#clubs-dep','14');
  await page.waitForFunction(`document.querySelector('#clubs-demo > p[slot="pied"] a')&&document.querySelector('#clubs-demo > p[slot="pied"] a').textContent.includes('Calvados')`);
  assert.equal(await page.textContent('#clubs-code'),'<div data-apprendre-padel-tournois="14" data-nombre="5"></div>\n<script src="https://apprendre-padel.fr/assets/js/widget-tournois.js" async></script>');
  const lignes=await page.evaluate(()=>[...document.querySelectorAll('#clubs-texte p')].map(p=>p.textContent));
  assert.equal(lignes.length,3);
  assert.ok(lignes[1].includes('(Calvados)')&&lignes[1].endsWith('https://apprendre-padel.fr/tournois/14.html'),lignes[1]);
  assert.equal(await page.evaluate(`${DANS}('.wt-titre','clubs-demo')[0].textContent`),'Prochains tournois de padel · Calvados');
  await page.click('#clubs-copier-texte');
  await page.waitForSelector('#clubs-retour-texte .msg-ok');
  assert.equal((await page.evaluate(()=>navigator.clipboard.readText())).replace(/\r\n/g,'\n'),lignes.join('\n'));
  // Département sans tournoi (JSON avec tournois: [], aucun 404) : widget « Aucun tournoi connu pour le moment <lieu> », texte et lien cohérents
  const urlVide='https://apprendre-padel.fr/'+(VIDE.page_dep?'tournois/'+VIDE.dep+'.html':'tournois.html');
  await page.selectOption('#clubs-dep',VIDE.dep);
  await page.waitForFunction(`${DANS}('.wt-msg','clubs-demo').some(p=>p.textContent===${JSON.stringify('Aucun tournoi connu pour le moment '+VIDE.lieu+'.')})`);
  assert.ok((await page.evaluate(()=>document.querySelectorAll('#clubs-texte p')[1].textContent)).endsWith(urlVide));
  assert.equal(await page.evaluate(()=>document.querySelector('#clubs-demo > p[slot="pied"] a').href),urlVide);
  ok('changement de département : code, texte (3 lignes copiables) et aperçu mis à jour ; département sans tournoi ('+VIDE.dep+') → « Aucun tournoi connu pour le moment '+VIDE.lieu+' » et lien cohérent');

  /* ---- 320 px : pas de débordement ---- */
  await page.setViewportSize({width:320,height:700});
  await page.selectOption('#clubs-dep','76');
  await page.waitForFunction(`${DANS}('.wt-item','clubs-demo').length>0`);
  const largeur=await page.evaluate(()=>document.documentElement.scrollWidth);
  assert.ok(largeur<=320,'débordement à 320 px : '+largeur);
  ok('320 px : aucun débordement horizontal (code à coller et widget compris)');

  /* ---- Page d'un club : filtre, tri, N, dates, liens, échappement, erreurs, isolation ---- */
  const page2=await ctx.newPage();
  ecouter(page2);
  await page2.clock.setFixedTime(new Date('2026-11-01T12:00:00'));
  await page2.route('**/assets/data/prochains/14.json',r=>r.fulfill({contentType:'application/json',body:JSON.stringify(FAUX_14)}));
  await page2.goto(base+'/club.html');
  await page2.waitForFunction(`${DANS}('.wt-item','c14').length>0&&${DANS}('.wt-msg','cxx').length>0&&${DANS}('.wt-msg','cvide').some(p=>!/Chargement/.test(p.textContent))`);
  const l14=await page2.evaluate(`${DANS}('.wt-item','c14').map(li=>({cat:li.querySelector('.wt-cat').textContent,nom:li.querySelector('.wt-nom').textContent,href:li.querySelector('.wt-nom').href,cible:li.querySelector('.wt-nom').target,detail:li.querySelector('.wt-detail').textContent,gras:li.querySelectorAll('b').length}))`);
  assert.deepEqual(l14.map(x=>x.nom),['Circuit P50','P500 week-end','P100 <b>Test</b> & co'],'tri par date de début, passé exclu, 3 au plus');
  assert.deepEqual(l14.map(x=>x.detail),['Lisieux · du 30 oct. au 31 août 2027','Caen · du 2 au 3 nov.','Bayeux · le 5 nov.'],'dates en français');
  assert.equal(l14[0].href,'https://apprendre-padel.fr/tournoi/2.html');assert.equal(l14[0].cible,'');
  assert.equal(l14[2].href,'https://tenup.fft.fr/tournoi/3');assert.equal(l14[2].cible,'_blank');
  assert.equal(l14[2].gras,0,'nom échappé (textContent)');
  const pied14=await page2.evaluate(()=>{const a=document.querySelector('#c14 > p[slot="pied"] a');return {texte:a.textContent,href:a.href};});
  assert.deepEqual(pied14,{texte:'Tous les tournois dans le Calvados sur apprendre-padel.fr',href:'https://apprendre-padel.fr/tournois.html'},'pas de page département → tournois.html');
  ok('page d\'un club : tournois passés exclus, tri par date, data-nombre respecté, dates « du 30 oct. au 31 août 2027 » / « le 5 nov. », liens fiche ou Ten\'Up, nom échappé');

  const mxx=await page2.evaluate(`${DANS}('.wt-msg','cxx').map(p=>({role:p.getAttribute('role'),texte:p.textContent}))[0]`);
  assert.equal(mxx.role,'alert');assert.match(mxx.texte,/^Département inconnu : « XX »\. Indiquez son numéro .* 971 à 974 et 976\)\.$/,'espaces insécables, départements d\'outre-mer réels');
  assert.equal(await page2.evaluate(()=>document.querySelector('#cxx > p[slot="pied"] a').href),'https://apprendre-padel.fr/tournois.html');
  const mvide=await page2.evaluate(`${DANS}('.wt-msg','cvide').map(p=>({role:p.getAttribute('role'),texte:p.textContent}))[0]`);
  assert.deepEqual(mvide,{role:'status',texte:'Aucun tournoi connu pour le moment '+VIDE.lieu+'.'},'département vide (JSON avec tournois: [])');
  assert.equal(await page2.evaluate(()=>document.querySelector('#cvide > p[slot="pied"] a').href),'https://apprendre-padel.fr/'+(VIDE.page_dep?'tournois/'+VIDE.dep+'.html':'tournois.html'));
  ok('département inconnu → « Département inconnu : « XX » … » (role="alert") ; département vide ('+VIDE.dep+', JSON sans tournoi, aucun 404) → « Aucun tournoi connu pour le moment '+VIDE.lieu+' » ; lien de bas de liste conservé');

  // Isolation : la CSS du club (li masqués, liens rouges, ul décalés, .wt-item en bloc) n'entre pas ; le style du widget ne sort pas
  const iso=await page2.evaluate(`(()=>{const li=${DANS}('.wt-item','c14')[0],a=li.querySelector('a'),ul=${DANS}('.wt-liste','c14')[0];const cs=getComputedStyle;
   return {li:cs(li).display,a:cs(a).color,ul:cs(ul).paddingLeft,taille:cs(li).fontSize,dehors:cs(document.querySelector('#dehors .wt-item')).display,
    police:cs(${DANS}('.wt','c14')[0]).fontFamily,instances:document.querySelectorAll('#c14 > p[slot="pied"]').length};})()`);
  assert.equal(iso.li,'grid','li du widget visible malgré li{display:none} du club');
  assert.notEqual(iso.a,'rgb(255, 0, 0)','a{color:red} du club n\'entre pas');
  assert.equal(iso.ul,'0px','ul{padding-left} du club n\'entre pas');
  assert.equal(iso.taille,'16px','16 px minimum');
  assert.equal(iso.dehors,'block','.wt-item hors du widget : le style du widget (grid) ne sort pas, la CSS du club (block) s\'applique');
  assert.ok(/system-ui|Segoe UI|-apple-system/.test(iso.police),'polices système');
  assert.equal(iso.instances,1,'script chargé deux fois → un seul rendu');
  assert.equal(await page2.evaluate(()=>typeof window.ApprendrePadelTournois.rendre),'function');
  ok('Shadow DOM : aucune fuite de style dans un sens ni dans l\'autre, 16 px, polices système ; script dans <head> (avant les conteneurs) et chargé deux fois → un seul rendu');

  assert.deepEqual(erreurs,[],'erreurs console : '+erreurs.join(' | '));
  ok('aucune erreur console sur clubs.html et sur la page du club');
 }finally{
  await browser.close();
  serveur.close();
 }
 console.log(`\n${nb} vérifications réussies.`);
})().catch(e=>{console.error(e);process.exitCode=1;serveur.close();});
