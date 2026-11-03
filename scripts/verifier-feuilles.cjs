/* Vérification des feuilles de style par groupe de pages (assets/css/*.css, lot 3b de l'audit du 03/11), sans navigateur :
   1) chaque page (racine, tournoi/, tournois/) charge style.css puis exactement les feuilles de son groupe (table FEUILLES de
      scripts/gabarit.js), dans l'ordre de la cascade, avec la bonne empreinte ?v= ; les polices restent préchargées avant style.css ;
   2) chaque classe ou identifiant propre à une feuille (absent de style.css et des autres feuilles) utilisé par une page
      (attribut class/id du HTML, ou mot d'un script que la page charge) : la page charge cette feuille ;
   3) une feuille ne redéfinit pas les jetons (:root), n'est pas vide, est précachée par sw.js ; style.css n'a pas regrossi.
   Lancer depuis la racine du site : node scripts/verifier-feuilles.cjs */
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const { FEUILLES, ORDRE_FEUILLES, feuillesDe, empreinte } = require('./gabarit');
const racine = path.join(__dirname, '..');
let nb = 0;
const ok = nom => { nb++; console.log('OK ' + nom); };
const lire = f => fs.readFileSync(path.join(racine, f), 'utf8');

// Taille maximale de style.css (octets) : le lot 3b l'a ramené de 156 Ko à 55 Ko ; au-delà, c'est qu'on y a remis ce qui est propre à une page.
const STYLE_MAX = 60000;

const pages = fs.readdirSync(racine).filter(f => f.endsWith('.html'));
for (const d of ['tournoi', 'tournois']) pages.push(...fs.readdirSync(path.join(racine, d)).filter(f => f.endsWith('.html')).map(f => d + '/' + f));
assert.ok(pages.length > 1000, 'pages trouvées : ' + pages.length);

const nomsFeuilles = ORDRE_FEUILLES.slice();
const fichiersFeuilles = fs.readdirSync(path.join(racine, 'assets/css')).filter(f => f.endsWith('.css')).map(f => f.replace(/\.css$/, '')).sort();
assert.deepEqual(fichiersFeuilles, nomsFeuilles.slice().sort(), 'feuilles de assets/css = ORDRE_FEUILLES');
assert.deepEqual(Object.keys(FEUILLES).sort(), nomsFeuilles.slice().sort(), 'FEUILLES = ORDRE_FEUILLES');
for (const nom of nomsFeuilles) {
  const css = lire('assets/css/' + nom + '.css');
  assert.ok(css.length > 1000, nom + ' : feuille quasi vide');
  assert.ok(!/:root\s*\{/.test(css), nom + ' : les jetons (:root) restent dans style.css');
  assert.ok(!/@font-face|@import|url\(/.test(css), nom + ' : pas de police, d\'import ni d\'adresse relative dans une feuille de groupe');
}
for (const p of Object.values(FEUILLES).flat().filter(p => !p.endsWith('/*'))) assert.ok(pages.includes(p), 'FEUILLES cite une page absente : ' + p);
const sw = lire('sw.js');
for (const nom of nomsFeuilles) assert.ok(sw.includes('"assets/css/' + nom + '.css"'), nom + ' : absente du précache de sw.js (SHELL)');
assert.ok(fs.statSync(path.join(racine, 'assets/style.css')).size <= STYLE_MAX, 'assets/style.css dépasse ' + STYLE_MAX + ' octets : ce qui ne sert qu\'à une page va dans assets/css/');
ok('feuilles : ' + nomsFeuilles.join(', ') + ' (jetons dans style.css, précachées, style.css ≤ ' + STYLE_MAX / 1000 + ' Ko)');

// 1) liens de chaque page
for (const p of pages) {
  const h = lire(p);
  const liens = [...h.matchAll(/<link rel="stylesheet" href="([^"]+)">/g)].map(m => m[1]);
  const profondeur = p.split('/').length - 1;
  const pre = p === '404.html' ? '/' : '../'.repeat(profondeur);
  const attendu = ['assets/style.css', ...feuillesDe(p).map(n => 'assets/css/' + n + '.css')];
  const trouves = liens.map(l => l.replace(/\?v=[0-9a-f]+$/, '')).filter(l => /assets\/(style|css\/[\w-]+)\.css$/.test(l));
  assert.deepEqual(trouves, attendu.map(a => pre + a), p + ' : feuilles chargées');
  for (const a of attendu) assert.ok(liens.includes(`${pre}${a}?v=${empreinte(a)}`), p + ' : ' + a + ' sans l\'empreinte à jour (node scripts/appliquer-gabarit.js)');
  const iStyle = h.indexOf('assets/style.css');
  assert.ok(h.indexOf('assets/fonts/manrope-latin.woff2') < iStyle && h.indexOf('assets/fonts/big-shoulders-display-latin.woff2') < iStyle, p + ' : polices préchargées après style.css');
}
ok('liens : ' + pages.length + ' pages chargent style.css puis les feuilles de leur groupe, versionnées, polices préchargées avant');

// 2) une page qui utilise une classe propre à une feuille charge cette feuille
const jetons = css => { const s = new Set(); for (const m of css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/[.#]([A-Za-z_][\w-]*)/g)) s.add(m[1]); return s; };
const selecteurs = css => { const s = new Set(); for (const m of css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{/g)) if (!m[1].trim().startsWith('@')) for (const x of m[1].matchAll(/[.#]([A-Za-z_][\w-]*)/g)) s.add(x[1]); return s; };
const parFeuille = {};
for (const nom of ['style', ...nomsFeuilles]) parFeuille[nom] = selecteurs(lire(nom === 'style' ? 'assets/style.css' : 'assets/css/' + nom + '.css'));
const propres = {};
for (const nom of nomsFeuilles) {
  propres[nom] = [...parFeuille[nom]].filter(t => t.length >= 4 && !Object.keys(parFeuille).some(n => n !== nom && parFeuille[n].has(t)));
  assert.ok(propres[nom].length > 5, nom + ' : aucune classe propre ?');
}
const scriptsDe = {}, texteScript = f => scriptsDe[f] ??= (fs.existsSync(path.join(racine, f)) ? lire(f) : '');
// Dans un script : un jeton à tiret, souligné ou chiffre (« vitre-scene ») est une classe où qu'il soit ; un mot simple (« espace », « proche »)
// est du texte, sauf s'il est dans un attribut class="…" ou un appel className / classList
const motDans = (texte, t) => (/[-_\d]/.test(t)
  ? new RegExp('(^|[^\\w-])' + t.replace(/-/g, '\\-') + '($|[^\\w-])')
  : new RegExp('(?:classList\\.\\w+\\(|className\\s*\\+?=|class=\\\\?)\\s*["\'`](?:[^"\'`]*\\s)?' + t + '(?:\\s[^"\'`]*)?["\'`]')).test(texte);
const echantillon = pages.filter(p => !p.startsWith('tournoi/') || /tournoi\/(2825|2891)/.test(p)); // fiches : une dizaine suffit (même gabarit)
let manques = [];
for (const p of echantillon) {
  const h = lire(p);
  const jetonsHtml = new Set(); for (const m of h.matchAll(/\b(?:class|id)="([^"]*)"/g)) m[1].split(/\s+/).forEach(x => jetonsHtml.add(x));
  const scripts = [...h.matchAll(/src="((?:\.\.\/)*assets\/js\/[\w-]+\.js)/g)].map(m => m[1].replace(/^(\.\.\/)+/, ''));
  const texte = scripts.map(texteScript).join('\n');
  const chargees = feuillesDe(p);
  for (const nom of nomsFeuilles) {
    if (chargees.includes(nom)) continue;
    const usage = propres[nom].filter(t => jetonsHtml.has(t) || motDans(texte, t));
    if (usage.length) manques.push(`${p} utilise ${usage.slice(0, 4).join(', ')} (feuille ${nom}) sans la charger`);
  }
}
assert.deepEqual(manques, [], 'pages sans la feuille dont elles utilisent des classes :\n  ' + manques.join('\n  '));
ok('usage : aucune page n\'utilise une classe propre à une feuille qu\'elle ne charge pas (' + echantillon.length + ' pages, ' + nomsFeuilles.map(n => propres[n].length).reduce((a, b) => a + b) + ' classes propres)');

console.log(`\n${nb} contrôles OK`);
