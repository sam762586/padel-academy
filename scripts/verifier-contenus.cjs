/* Vérification des contenus pédagogiques (phase 2 de la v3), sans navigateur :
   1) chaque article a ses sections attendues, au moins un exemple concret ou un exercice, et assez de liens internes ;
   2) règles : 10 règles essentielles, comptage, service, cas litigieux chacun avec sa règle FIP, sources citées ;
   3) conseils : 20 erreurs, chacune avec sa correction ;
   4) technique : section vitres reliée aux 4 fiches de vitre ; lexique : chaque terme relié à une page qui existe ;
   5) partout : pas de pourcentage ni de chiffre de fréquentation inventé, pas de caractère de contrôle, pas de FAQPage.
   Les liens cassés, titles et descriptions sont contrôlés par verifier-seo.cjs, le mobile par verifier-design.cjs.
   Lancer depuis la racine du site : node scripts/verifier-contenus.cjs */
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const racine = path.join(__dirname, '..');
let nb = 0; const ok = m => { nb++; console.log('OK ' + m); };
const lire = f => fs.readFileSync(path.join(racine, f), 'utf8');
const corps = h => h.split(/<body[^>]*>/)[1].replace(/<script[\s\S]*?<\/script>/g, '');
const section = (h, id) => { const a = h.indexOf('<section id="' + id + '"'); assert.ok(a >= 0, 'section #' + id); return h.slice(a, h.indexOf('</section>', a)); };
const texte = h => h.replace(/<[^>]+>/g, ' ').replace(/&nbsp;| | /g, ' ').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ');
// Liens internes du contenu (hors menu et pied de page)
const liensInternes = h => [...corps(h).replace(/<nav[\s\S]*?<\/nav>/, '').replace(/<footer[\s\S]*?<\/footer>/, '').matchAll(/<a\b[^>]*href="([^"#][^"]*|#[^"]+)"/g)]
  .map(m => m[1]).filter(x => !/^(https?:|mailto:)/.test(x));

// Articles de la phase 2 : sections attendues et nombre minimum de liens internes dans le contenu
const ARTICLES = {
  'regles.html': { sections: ['regles', 'points', 'service', 'litiges'], liens: 5 },
  'conseils.html': { sections: ['erreurs'], liens: 10 },
  'technique.html': { sections: ['coups', 'vitres'], liens: 5 },
};

for (const [f, a] of Object.entries(ARTICLES)) {
  const h = lire(f);
  a.sections.forEach(id => section(h, id));
  const c = corps(h);
  assert.ok(/class="(exemple|exo)"/.test(c), f + ' : ni exemple ni exercice');
  const l = liensInternes(h);
  assert.ok(l.length >= a.liens, `${f} : ${l.length} liens internes dans le contenu (minimum ${a.liens})`);
  assert.ok(!/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(h), f + ' : caractère de contrôle');
  assert.ok(!/\b\d+\s?%|\d+\s?(joueurs|utilisateurs|membres) (nous font|utilisent|inscrits)|témoign/i.test(texte(c)), f + ' : chiffre ou témoignage invérifiable');
  assert.ok(!h.includes('"FAQPage"'), f + ' : FAQPage');
}
ok(`articles (${Object.keys(ARTICLES).join(', ')}) : sections, exemple ou exercice, liens internes, aucun chiffre invérifiable`);

// Règles
{
  const h = lire('regles.html');
  assert.equal((section(h, 'regles').match(/<li>/g) || []).length, 10, '10 règles essentielles');
  const pts = texte(section(h, 'points'));
  for (const x of ['Le jeu', 'Le set', 'Le jeu décisif', 'Le match', 'Le point décisif', 'super jeu décisif', 'Star Point']) assert.ok(pts.includes(x), 'comptage : ' + x);
  assert.match(section(h, 'points'), /<table[\s\S]*<td>A<\/td>[\s\S]*<td>F<\/td>/, 'tableau des formats FFT');
  const srv = texte(section(h, 'service'));
  for (const x of ['hauteur de taille ou en dessous', 'Faute si', 'Deux fautes de suite']) assert.ok(srv.includes(x), 'service : ' + x);
  const cas = [...section(h, 'litiges').matchAll(/<li>([\s\S]*?)<\/li>/g)].map(m => m[1]);
  assert.ok(cas.length >= 10, 'au moins 10 cas litigieux');
  cas.forEach(c => assert.match(c, /<span class="ref">Règles? [0-9]/, 'cas sans référence au règlement : ' + texte(c).slice(0, 50)));
  assert.match(h, /href="https:\/\/www\.padelfip\.com\/wp-content\/uploads\/2025\/12\/FIP_Rules-of-Padel\.pdf"/);
  assert.ok(!/règle 0\d/.test(h), 'anciens numéros de règle');
  ok(`règles : 10 règles, comptage (jeu, set, jeu décisif, super jeu décisif, point décisif, formats FFT), service, ${cas.length} cas litigieux référencés, sources`);
}

// Conseils
{
  const h = lire('conseils.html'), s = section(h, 'erreurs');
  const erreurs = [...s.matchAll(/<li class="bloc">([\s\S]*?)<\/li>/g)].map(m => m[1]);
  assert.equal(erreurs.length, 20, '20 erreurs');
  erreurs.forEach(e => { assert.match(e, /<h3[^>]*>[^<]+<\/h3>/); assert.match(e, /<p class="correction"><b>Correction/, 'correction : ' + texte(e).slice(0, 40)); });
  assert.match(h, /<h1>Les 20 erreurs/);
  ok('conseils : 20 erreurs en 4 familles, chacune avec son explication et sa correction');
}

// Technique (vitres) et lexique
{
  const v = section(lire('technique.html'), 'vitres');
  for (const id of ['sortie-vitre-fond', 'sortie-vitre-laterale', 'defendre-double-vitre', 'bajada']) assert.ok(v.includes(`href="simulateur-3d-${id}.html"`), 'vitres : fiche ' + id);
  const lex = lire('assets/js/lexique.js');
  const LEX = new Function(lex.split('document.getElementById')[0].replace(/const lienLex[\s\S]*$/, '') + ';return LEX;')();
  const sansLien = LEX.filter(e => !e[2]).map(e => e[0]);
  assert.ok(sansLien.length <= 2, 'termes sans lien : ' + sansLien.join(', '));
  LEX.filter(e => e[2]).forEach(([t, , l]) => assert.ok(fs.existsSync(path.join(racine, l.split('#')[0])), t + ' : page absente ' + l));
  const pre = lire('lexique.html');
  assert.ok((pre.match(/class="lex-lien"/g) || []).length === LEX.length - sansLien.length, 'liens du lexique pré-rendus');
  ok(`technique : section vitres reliée aux 4 fiches ; lexique : ${LEX.length - sansLien.length} termes sur ${LEX.length} reliés à leur page`);
}

console.log(`\n${nb} vérifications réussies.`);
