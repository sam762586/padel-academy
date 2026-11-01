/* Vérification de la page « Actus pro » (actus-pro.html, scripts/generer-pro.js, données assets/data/pro.json) :
   1) génération sur une fixture (scripts/fixtures/actus-pro/pro.json), dans un dossier temporaire : vainqueurs, finalistes et
      score présents, tournoi terminé sans résultats -> « Résultats non disponibles » et lien source, genre manquant signalé,
      noms et villes mis en forme (casse, espaces), ordre (du plus récent au plus ancien), tournoi en cours à la une,
      calendrier trié, mention de source et date de mise à jour à l'heure de Paris, lastmod du sitemap ;
   2) échappement : un nom contenant < et &, une adresse avec & ;
   3) idempotence : seconde exécution = fichier identique, non réécrit ;
   4) pro.json invalide (JSON cassé, statut inconnu, adresse non https) -> code 1, page et sitemap inchangés ;
   5) page réelle : à jour avec pro.json, dans le menu et le sitemap ; dans Edge à 390 et 320 px : titre, résultats, aucun
      débordement horizontal, aucune image externe, liens sortants en nouvel onglet avec rel="noopener", console sans erreur.
   Lancer depuis la racine du site : node scripts/verifier-actus-pro.cjs */
const assert = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path'), http = require('node:http');
const { spawnSync } = require('node:child_process');
const { chromium } = require('playwright');
const racine = path.join(__dirname, '..');
const G = require('./gabarit');
let nb = 0; const ok = m => { nb++; console.log('OK ' + m); };
const lire = f => fs.readFileSync(f, 'utf8');
const SCRIPT = path.join(__dirname, 'generer-pro.js');
const FIXTURE = path.join(__dirname, 'fixtures', 'actus-pro', 'pro.json');
const N = ' '; // espace insécable
const lancer = (donnees, page, sitemap) => spawnSync(process.execPath, [SCRIPT, '--donnees', donnees, '--page', page, '--sitemap', sitemap], { encoding: 'utf8' });

/* ---------- 1 à 4 : générateur, sous Node ---------- */
function generateur() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'actus-pro-'));
  const page = path.join(dir, 'actus-pro.html'), sitemap = path.join(dir, 'sitemap.xml'), donnees = path.join(dir, 'pro.json');
  fs.copyFileSync(path.join(racine, 'actus-pro.html'), page);
  fs.copyFileSync(FIXTURE, donnees);
  fs.writeFileSync(sitemap, '<urlset>\n  <url>\n    <loc>https://apprendre-padel.fr/actus-pro.html</loc>\n    <lastmod>2000-01-01</lastmod>\n  </url>\n</urlset>\n');
  try {
    let r = lancer(donnees, page, sitemap);
    assert.equal(r.status, 0, r.stderr);
    const h = lire(page);
    const zone = h.slice(h.indexOf('<!-- pro:debut -->'), h.indexOf('<!-- pro:fin -->'));
    const cartes = zone.split('<article').slice(1);
    // Vainqueurs, finalistes, score
    assert.match(zone, /<dt>Vainqueurs<\/dt><dd><b>Coello \/ Tapia<\/b><\/dd>/);
    assert.match(zone, /<dt>Finalistes<\/dt><dd>Chingotto \/ Galan<\/dd>/);
    assert.match(zone, /<dd class="pro-score">6-4 6-2<\/dd>/);
    assert.match(zone, /<dd class="pro-score">3-6 6-1 6-4<\/dd>/);
    ok('fixture : vainqueurs, finalistes et score de la finale (hommes et femmes)');
    // Tournoi sans résultats, genre manquant
    const qatar = cartes.find(c => c.includes('Qatar Major'));
    assert.ok(qatar, 'carte du Qatar Major');
    assert.match(qatar, /Résultats non disponibles/);
    assert.match(qatar, /href="https:\/\/premierpadel\.com\/en\/tournaments-detail\/qatar-major-2" target="_blank" rel="noopener">Voir le tableau complet sur le site officiel/);
    assert.ok(!/Vainqueurs/.test(qatar), 'rien d’inventé pour un tournoi sans résultats');
    const madrid = cartes.find(c => c.includes('Comunidad de Madrid P1'));
    assert.match(madrid, /<h4>Hommes<\/h4><dl>/); assert.match(madrid, /<h4>Femmes<\/h4><p class="pro-absent">Résultats non disponibles/);
    ok('tournoi terminé sans résultats : « Résultats non disponibles » et lien vers la source ; genre manquant signalé seul');
    // Mise en forme et ordre
    assert.match(zone, /<h3>Test Alpha P2<\/h3>/, 'nom : casse de titre, doubles espaces retirés');
    assert.match(zone, /San José, Espagne/, 'ville : casse de titre, espaces normalisés ; pays en français');
    // Plages de dates : espaces insécables autour du tiret, jamais d'espace ordinaire
    assert.ok(zone.includes('28 juin' + N + '–' + N + '5 juillet 2026') && zone.includes('1er' + N + '–' + N + '8 mars 2026'), 'plages de dates : espaces insécables');
    assert.ok(!/ –|– /.test(zone), 'tiret de plage entouré d’espaces ordinaires');
    const res = zone.slice(zone.indexOf('id="resultats"'), zone.indexOf('id="calendrier"'));
    const ordre = ['Comunidad de Madrid P1', 'Qatar Major', 'Test Alpha P2'].map(n => res.indexOf(n));
    assert.ok(ordre.every(i => i > 0) && ordre[0] < ordre[1] && ordre[1] < ordre[2], 'résultats du plus récent au plus ancien');
    assert.ok(!res.includes('London P1') && !res.includes('Dubai P1'), 'seuls les tournois terminés sont dans les résultats');
    const une = zone.slice(zone.indexOf('id="a-la-une"'), zone.indexOf('id="resultats"'));
    assert.match(une, /Tournoi en cours/);
    assert.match(une, /<h3>London P1<\/h3>/, 'nom du tournoi : celui de l’API');
    assert.match(une, /Londres, Royaume-Uni/, 'ville : nom usuel en français');
    assert.ok(une.includes('En cours' + N + ': les résultats'), 'espace insécable avant « : »');
    const cal = zone.slice(zone.indexOf('id="calendrier"'));
    assert.ok(cal.indexOf('Dubai P1') > 0 && cal.indexOf('Dubai P1') < cal.indexOf('Tournoi d&#39;Espagne II'), 'calendrier trié par date');
    // Casse : petits mots après apostrophe et trait d'union, chiffres romains en capitales ; ville = pays -> pays seul
    assert.match(cal, /<b>Tournoi d&#39;Espagne II<\/b>/);
    assert.match(cal, /Saint-Jean-de-Luz, France/);
    assert.match(cal, /<span class="pro-lieu">Koweït<\/span>/, 'Koweït, Koweït -> Koweït');
    const GP = require('./generer-pro.js');
    assert.equal(GP.casseTitre("OPEN  IV DE L'HOSPITALET"), "Open IV de l'Hospitalet");
    assert.equal(GP.casseTitre('VIVA MIX P1'), 'Viva Mix P1');
    assert.equal(GP.casseTitre('SAINT-JEAN-DE-LUZ'), 'Saint-Jean-de-Luz');
    for (const [v, p, attendu] of [['BRUSSELS', 'Belgium', 'Bruxelles, Belgique'], ['ROMA', 'Italy', 'Rome, Italie'], ['MILANO', 'Italy', 'Milan, Italie'],
      ['ASUNCIÓN', 'Paraguay', 'Asunción, Paraguay'], ['DUSSELDORF', 'Germany', 'Düsseldorf, Allemagne'], ['RIYADH', 'Saudi Arabia', 'Riyad, Arabie saoudite'],
      ['BARCELONA', 'Spain', 'Barcelone, Espagne'], ['KUWAIT', 'Kuwait', 'Koweït'], ['VILLE  INCONNUE', 'Atlantis', 'Ville Inconnue, Atlantis']])
      assert.equal(GP.lieu({ ville: v, pays: p }), attendu);
    assert.ok(cal.includes('Source' + N + ': <a href="https://premierpadel.com/en/tournaments" target="_blank" rel="noopener">site officiel de Premier Padel'));
    assert.ok(cal.includes("Apprendre Padel n'est affilié ni à Premier Padel ni à la FIP, et n'est approuvé ni par l'un ni par l'autre."));
    // 22 h 30 UTC le 15 juillet = 0 h 30 le 16 juillet à Paris (heure d'été)
    assert.ok(cal.includes('Dernière mise à jour' + N + ': <time datetime="2026-07-15T22:30:00.000Z">16 juillet 2026 à 0' + N + 'h' + N + '30</time> (heure de Paris)'), 'mise à jour à l’heure de Paris');
    assert.match(lire(sitemap), /<lastmod>2026-07-16<\/lastmod>/);
    ok('mise en forme (casse avec petits mots et chiffres romains, villes et pays en français, ville = pays, dates à espaces insécables), ordre, tournoi en cours à la une, calendrier, source et mise à jour à l’heure de Paris, lastmod');
    // Échappement
    assert.match(zone, /Dupont &amp; &lt;Fils&gt; \/ Triay Pons/);
    assert.ok(!zone.includes('<Fils>'), 'balise injectée');
    assert.match(zone, /alpha-p2\?a=1&amp;b=2/);
    ok('échappement : nom contenant < et &, adresse contenant &');
    // Idempotence
    const avant = lire(page), mtime = fs.statSync(page).mtimeMs, smAvant = lire(sitemap);
    r = lancer(donnees, page, sitemap);
    assert.equal(r.status, 0, r.stderr); assert.match(r.stdout, /déjà à jour/);
    assert.equal(lire(page), avant); assert.equal(fs.statSync(page).mtimeMs, mtime, 'fichier non réécrit'); assert.equal(lire(sitemap), smAvant);
    ok('idempotence : pro.json identique, page identique et non réécrite');
    // pro.json invalide
    const base = JSON.parse(lire(FIXTURE));
    const cas = {
      'JSON cassé': '{"maj": "2026-07-15", "tournois": [',
      'statut inconnu': JSON.stringify({ ...base, tournois: [{ ...base.tournois[0], statut: 'fini' }] }),
      'adresse non https': JSON.stringify({ ...base, tournois: [{ ...base.tournois[0], url_source: 'javascript:alert(1)' }] }),
      'liste vide': JSON.stringify({ ...base, tournois: [] }),
      'vainqueurs absents': JSON.stringify({ ...base, tournois: [{ ...base.tournois[0], resultats: { hommes: { score: '6-0 6-0' } } }] }),
    };
    for (const [nom, contenu] of Object.entries(cas)) {
      fs.writeFileSync(donnees, contenu);
      r = lancer(donnees, page, sitemap);
      assert.equal(r.status, 1, nom + ' : code 1 attendu');
      assert.match(r.stderr, /Page non modifiée|illisible|invalide/, nom);
      assert.equal(lire(page), avant, nom + ' : page modifiée'); assert.equal(lire(sitemap), smAvant, nom + ' : sitemap modifié');
    }
    ok('pro.json invalide (' + Object.keys(cas).join(', ') + ') : code 1, page et sitemap inchangés');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

/* ---------- 5 : page réelle ---------- */
function pageReelle() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'actus-pro-reel-'));
  try {
    const copie = path.join(dir, 'actus-pro.html');
    fs.copyFileSync(path.join(racine, 'actus-pro.html'), copie);
    const r = lancer(path.join(racine, 'assets', 'data', 'pro.json'), copie, 'aucun');
    assert.equal(r.status, 0, r.stderr);
    assert.equal(lire(copie), lire(path.join(racine, 'actus-pro.html')), 'actus-pro.html en retard sur pro.json : lancer node scripts/generer-pro.js');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  assert.ok(G.PAGES_MENU.some(([p, l]) => p === 'actus-pro.html' && l === 'Actus pro'), 'Actus pro dans le menu');
  const competition = G.MENU.find(e => !Array.isArray(e) && e.id === 'competition');
  assert.ok(competition.liens.some(([p]) => p === 'actus-pro.html'), 'Actus pro dans le groupe Compétition');
  assert.match(lire(path.join(racine, 'sitemap.xml')), /<loc>https:\/\/apprendre-padel\.fr\/actus-pro\.html<\/loc>/);
  const h = lire(path.join(racine, 'actus-pro.html'));
  assert.ok(!/<img\b[^>]*src="https?:/.test(h), 'aucune image externe');
  for (const m of h.matchAll(/<a\b[^>]*href="https:\/\/premierpadel\.com[^"]*"[^>]*>/g)) assert.match(m[0], /target="_blank" rel="noopener"/);
  ok('page réelle à jour avec pro.json ; dans le menu (groupe Compétition) et le sitemap ; aucune image externe, liens sortants noopener');
}

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json' };
const serveur = http.createServer((req, res) => {
  const rel = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/^\//, '') || 'index.html';
  const p = path.resolve(racine, rel);
  if (!p.startsWith(racine + path.sep)) { res.writeHead(403); res.end(); return; }
  fs.readFile(p, (e, b) => { if (e) { res.writeHead(404); res.end(); return; } res.setHeader('Content-Type', TYPES[path.extname(p)] || 'text/plain'); res.end(b); });
});

async function dansLeNavigateur(base) {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const erreurs = [];
  try {
    for (const largeur of [390, 320]) {
      const page = await browser.newPage({ viewport: { width: largeur, height: 800 } });
      // Rien hors du site (compteur de visites externe compris)
      await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
      page.on('console', m => { if (m.type() === 'error' && !/net::ERR_FAILED|ERR_BLOCKED|Failed to load resource/.test(m.text())) erreurs.push(largeur + ' : ' + m.text()); });
      page.on('pageerror', e => erreurs.push(largeur + ' : ' + e.message));
      await page.goto(base + '/actus-pro.html');
      assert.equal(await page.locator('h1').textContent(), 'Actus pro');
      assert.ok(await page.locator('#resultats article').count() > 0, 'résultats affichés');
      assert.ok(await page.locator('#resultats article').first().isVisible());
      assert.equal(await page.locator('.pro-source').count(), 2);
      assert.equal(await page.locator('#nav-competition a[href="actus-pro.html"][aria-current="page"]').count(), 1, 'page active dans le menu');
      const deborde = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      assert.ok(deborde <= 0, largeur + ' px : débordement horizontal de ' + deborde + ' px');
      await page.close();
    }
  } finally { await browser.close(); }
  assert.deepEqual(erreurs, [], 'console');
  ok('Edge à 390 et 320 px : titre, résultats, mentions, page active dans le menu, aucun débordement, console sans erreur');
}

(async () => {
  generateur();
  pageReelle();
  await new Promise(r => serveur.listen(0, '127.0.0.1', r));
  try { await dansLeNavigateur('http://127.0.0.1:' + serveur.address().port); } finally { serveur.close(); }
  console.log(`\n${nb} vérifications réussies.`);
})().catch(e => { console.error(e); process.exitCode = 1; serveur.close(); });
