/* Vérification du design system v3 (assets/style.css) et de l'accueil :
   1) tokens : couleurs de la marque (#101F35, #1674A6, #C8F14B, #F4F7FA) ; contraste ≥ 4,5:1 du texte (--fg, --muted, --dim,
      liens --sky, --turf, --sand, --erreur) sur les fonds --bg, --bg-2 et --bg-3, du texte des boutons d'action et des badges
      de catégorie ; le bleu terrain n'est pas utilisé comme couleur de texte ; plus aucune couleur de l'ancien thème ;
   2) accueil (1366 px) : titre, sous-titre et trois accès principaux sur une ligne (apprendre, simulateur 3D, niveau),
      vitrine du simulateur 3D avec image chargée ;
   3) clavier : un contour de focus visible sur les boutons, les liens du contenu et les champs ;
   4) composants communs : bouton désactivé et en chargement, champ en erreur, messages, indicateur de chargement ;
   5) mobile (390 et 320 px) : aucune page de la racine ne déborde, menu « Tactique 3D » présent.
   Lancer depuis la racine du site : node scripts/verifier-design.cjs */
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const { chromium } = require('playwright');
const racine = path.join(__dirname, '..');
let nb = 0; const ok = m => { nb++; console.log('OK ' + m); };

// Contraste WCAG entre deux couleurs #rrggbb
const lum = hex => { const c = hex.replace('#', ''); return [0, 2, 4].map(i => parseInt(c.slice(i, i + 2), 16) / 255).map(v => v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0); };
const contraste = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

function tokens() {
  const css = fs.readFileSync(path.join(racine, 'assets/style.css'), 'utf8');
  const bloc = css.slice(css.indexOf(':root{'), css.indexOf('}', css.indexOf(':root{')));
  const T = {};
  for (const m of bloc.matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)) T[m[1]] = m[2].trim();
  const val = n => { let v = T[n]; while (v && v.startsWith('var(--')) v = T[v.slice(6, -1)]; return v; };
  assert.deepEqual([val('navy'), val('terrain'), val('energie'), val('blanc')].map(s => s.toUpperCase()), ['#101F35', '#1674A6', '#C8F14B', '#F4F7FA']);
  assert.equal(val('bg').toUpperCase(), '#101F35'); assert.equal(val('fg').toUpperCase(), '#F4F7FA'); assert.equal(val('turf').toUpperCase(), '#C8F14B');
  const fonds = ['bg', 'bg-2', 'bg-3'], textes = ['fg', 'muted', 'dim', 'sky', 'turf', 'sand', 'erreur', 'coral'];
  for (const f of fonds) for (const t of textes) {
    const r = contraste(val(t), val(f));
    assert.ok(r >= 4.5, `--${t} sur --${f} : ${r.toFixed(2)}:1`);
  }
  assert.ok(contraste(val('accent-fg'), val('turf')) >= 4.5, 'texte des boutons d\'action');
  assert.ok(contraste(val('accent-fg'), val('turf-hover')) >= 4.5, 'texte des boutons d\'action au survol');
  for (const c of ['p25', 'p50', 'p100', 'p250', 'p500', 'p1000', 'autre']) assert.ok(contraste(val('cat-fg'), val('cat-' + c)) >= 4.5, 'badge ' + c);
  // Le bleu terrain sert aux surfaces : trop sombre pour du texte sur le fond
  assert.ok(contraste(val('terrain'), val('bg')) < 4.5);
  assert.ok(!/(^|[;{\s])color:\s*var\(--terrain\)/.test(css), 'bleu terrain utilisé comme couleur de texte');
  // Plus aucune couleur de l'ancien thème (hors badge P25, couleur de catégorie)
  const anciens = /#070b14|53,\s*226,\s*127|7,\s*11,\s*20|#5df09a|#06110b/i;
  const fichiers = ['assets/style.css', 'assets/simulateur-3d.css', 'manifest.webmanifest', 'assets/img/icons/icon.svg', 'assets/img/icons/icon-maskable.svg',
    ...fs.readdirSync(racine).filter(f => f.endsWith('.html')),
    ...fs.readdirSync(path.join(racine, 'assets/js')).filter(f => f.endsWith('.js')).map(f => 'assets/js/' + f)];
  for (const f of fichiers) assert.ok(!anciens.test(fs.readFileSync(path.join(racine, f), 'utf8')), f + ' : couleur de l\'ancien thème');
  assert.equal((css.match(/#35e27f/gi) || []).length, 1, '#35e27f réservé au badge P25');
  const ratios = textes.map(t => `${t} ${contraste(val(t), val('bg')).toFixed(1)}`).join(', ');
  ok(`tokens : couleurs de la marque, contrastes AA sur les 3 fonds (sur --bg : ${ratios}), boutons et badges ; aucune couleur de l'ancien thème`);
}

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
const serveur = http.createServer((req, res) => {
  const rel = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/^\//, '') || 'index.html';
  const p = path.resolve(racine, rel);
  if (!p.startsWith(racine + path.sep)) { res.writeHead(403); res.end(); return; }
  fs.readFile(p, (e, b) => { if (e) { res.writeHead(404); res.end(); return; } res.setHeader('Content-Type', TYPES[path.extname(p)] || 'application/octet-stream'); res.end(b); });
});
async function contexte(browser, viewport) {
  const ctx = await browser.newContext({ viewport, serviceWorkers: 'block' });
  await ctx.route(/supabase-js@|gc\.zgo\.at|fonts\.(googleapis|gstatic)/, r => r.fulfill({ contentType: 'text/javascript', body: '' }));
  return ctx;
}

(async () => {
  tokens();
  await new Promise(r => serveur.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + serveur.address().port;
  const browser = await chromium.launch({ channel: 'msedge' });
  const erreurs = [];
  try {
    // 2) Accueil sur ordinateur
    let ctx = await contexte(browser, { width: 1366, height: 900 });
    let page = await ctx.newPage();
    page.on('pageerror', e => erreurs.push(e.message));
    await page.goto(base + '/index.html');
    assert.equal((await page.textContent('h1')).replace(/\s+/g, ' ').trim(), 'Progresse au padel, point après point.');
    assert.equal((await page.textContent('.hero .lead')).trim(), 'Apprends les bons gestes, comprends les placements et développe ton jeu grâce à des exercices et outils interactifs.');
    const acces = await page.$$eval('.hero .btns .btn', l => l.map(a => [a.textContent.trim(), a.getAttribute('href'), Math.round(a.getBoundingClientRect().top)]));
    assert.deepEqual(acces.map(a => a.slice(0, 2)), [['Commencer à apprendre', '#parcours'], ['Explorer le simulateur 3D', 'simulateur-3d.html'], ['Tester mon niveau', 'niveau.html']]);
    assert.equal(new Set(acces.map(a => a[2])).size, 1, 'trois accès sur une ligne');
    assert.deepEqual(await page.$$eval('.profil-tag', l => l.map(p => p.textContent)), ['Débutant', 'Intermédiaire', 'Compétiteur']);
    await page.locator('.vitrine-3d').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => { const i = document.querySelector('.vitrine-3d img'); return i.complete && i.naturalWidth > 0; });
    assert.ok(await page.locator('.vitrine-3d a.btn[href="simulateur-3d.html"]').isVisible());
    ok('accueil : titre et sous-titre, 3 accès principaux sur une ligne, parcours Débutant / Intermédiaire / Compétiteur, vitrine 3D');

    // 3) Focus clavier visible (contour non nul) sur bouton, lien de contenu et champ
    await page.goto(base + '/index.html');
    let n = 0;
    while (await page.evaluate(() => document.activeElement.textContent.trim()) !== 'Commencer à apprendre' && n++ < 40) await page.keyboard.press('Tab');
    const contour = () => page.evaluate(() => { const s = getComputedStyle(document.activeElement); return s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) >= 2; });
    assert.ok(await contour(), 'focus du bouton');
    await page.focus('.profil-etapes a'); await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Tab');
    assert.ok(await contour(), 'focus d\'un lien de contenu');
    await page.goto(base + '/bareme.html');
    // Un champ reçoit le focus (pour un champ, :focus-visible s'applique aussi au focus donné par le script)
    await page.focus('#b-cat');
    assert.ok(await page.evaluate(() => document.activeElement.matches('select')));
    assert.ok(await contour(), 'focus d\'un champ');
    ok('clavier : contour de focus visible sur les boutons, les liens et les champs');

    // 4) Composants communs, rendus avec la vraie feuille de style
    await page.goto(base + '/404.html');
    await page.evaluate(() => {
      const m = document.querySelector('main') || document.body;
      m.insertAdjacentHTML('beforeend', `<div id="ds">
        <button class="btn primary" disabled>Désactivé</button><button class="btn ghost" aria-busy="true">Envoi</button>
        <div class="champ invalide"><label for="ds-c">Ville</label><input id="ds-c"><p class="champ-erreur">Indique une ville.</p></div>
        <p class="msg msg-ok" role="status">Enregistré.</p><p class="msg msg-erreur" role="alert">Échec.</p><p class="msg msg-alerte">Attention.</p>
        <span class="chargement">Chargement…</span></div>`);
    });
    const s = await page.evaluate(() => {
      const g = (q, p) => getComputedStyle(document.querySelector('#ds ' + q))[p];
      const avant = q => getComputedStyle(document.querySelector('#ds ' + q), '::before');
      return { opacite: g('.btn[disabled]', 'opacity'), curseur: g('.btn[disabled]', 'cursor'), busy: avant('.btn[aria-busy]').animationName,
        bordure: g('.champ input', 'borderTopColor'), erreur: g('.champ-erreur', 'color'), ok: g('.msg-ok', 'borderLeftColor'), ko: g('.msg-erreur', 'borderLeftColor'),
        rond: avant('.chargement').borderTopStyle, largeur: document.querySelector('#ds .champ input').getBoundingClientRect().width };
    });
    assert.equal(s.opacite, '0.5'); assert.equal(s.curseur, 'not-allowed'); assert.equal(s.busy, 'tourner');
    assert.equal(s.bordure, s.erreur, 'bordure du champ en erreur'); assert.notEqual(s.ok, s.ko); assert.equal(s.rond, 'solid'); assert.ok(s.largeur > 100);
    await ctx.close();
    ok('composants : bouton désactivé et en chargement, champ en erreur, messages ok/erreur/alerte, indicateur de chargement');

    // 5) Mobile : aucune page de la racine ne déborde (pages de scénario 3D : testées par verifier-simulateur-3d)
    const pages = fs.readdirSync(racine).filter(f => f.endsWith('.html') && !/^simulateur-3d-/.test(f));
    for (const largeur of [390, 320]) {
      ctx = await contexte(browser, { width: largeur, height: 800 });
      page = await ctx.newPage();
      page.on('pageerror', e => erreurs.push(e.message));
      for (const f of pages) {
        await page.goto(base + '/' + f, { waitUntil: 'load' });
        const w = await page.evaluate(() => document.documentElement.scrollWidth);
        assert.equal(w, largeur, `${f} déborde à ${largeur} px (${w})`);
      }
      await page.goto(base + '/index.html');
      await page.click('.nav-toggle, [aria-controls="nav-menu"]');
      assert.ok(await page.locator('#nav-menu a[href="simulateur-3d.html"]', { hasText: 'Tactique 3D' }).isVisible());
      await ctx.close();
    }
    ok(`mobile 390 et 320 px : ${pages.length} pages sans débordement, « Tactique 3D » dans le menu`);
    assert.deepEqual(erreurs, []);
    console.log(`\n${nb} vérifications réussies.`);
  } finally { await browser.close(); serveur.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
