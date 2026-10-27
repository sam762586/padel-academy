/* Vérification SEO de toutes les pages (racine, tournoi/, tournois/), statique sauf le point 8 (navigateur) :
   1) title et meta description présents et uniques, description de 160 caractères au plus (pages indexables) ;
   2) un seul H1, lang="fr", viewport, URL canonique = adresse de la page ;
   3) liens internes et ancres : aucun lien cassé ;
   4) images : alt et dimensions ;
   5) sitemap : seulement des pages existantes, indexables et canoniques ; toute page indexable y figure ;
   6) pages privées (compte, espace, connexion, hors-ligne, 404) en noindex et hors du sitemap ;
   7) données structurées : JSON valide, pas de FAQPage (non éligible pour ce site) ;
   8) contenu pré-rendu (scripts/prerendre-contenu.js) présent dans le HTML et identique à ce que construit le JavaScript.
   Lancer depuis la racine du site : node scripts/verifier-seo.cjs */
const assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path");
const racine = path.join(__dirname, "..");
const SITE = "https://apprendre-padel.fr/";
let n = 0; const ok = m => { n++; console.log("OK " + m); };

const fichiers = fs.readdirSync(racine).filter(f => f.endsWith(".html"));
for (const d of ["tournoi", "tournois"]) {
  const walk = rel => { for (const f of fs.readdirSync(path.join(racine, rel))) { const p = rel + "/" + f; if (fs.statSync(path.join(racine, p)).isDirectory()) walk(p); else if (f.endsWith(".html")) fichiers.push(p); } };
  if (fs.existsSync(path.join(racine, d))) walk(d);
}
const dec = t => t.replace(/&amp;/g, "&").replace(/&#39;|&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const lire = f => fs.readFileSync(path.join(racine, f), "utf8");
const PRIVEES = ["404.html", "hors-ligne.html", "compte.html", "espace.html", "connexion.html"];
const pages = fichiers.map(f => {
  const h = lire(f);
  return {
    f, h,
    title: dec((h.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || "").trim(),
    desc: dec((h.match(/<meta name="description" content="([^"]*)"/) || [])[1] || ""),
    canonical: (h.match(/<link rel="canonical" href="([^"]+)"/) || [])[1] || "",
    noindex: /<meta name="robots" content="[^"]*noindex/.test(h),
    url: SITE + (f === "index.html" ? "" : f),
  };
});
const indexables = pages.filter(p => !p.noindex);

// 1) titres et descriptions
for (const p of pages) assert.ok(p.title, p.f + " : title vide");
for (const p of indexables) {
  assert.ok(p.desc, p.f + " : description absente");
  assert.ok(p.desc.length <= 160, p.f + " : description de " + p.desc.length + " caractères");
}
const unique = (cle, nom) => {
  const vus = {};
  for (const p of indexables) { const v = p[cle]; assert.ok(!vus[v], `${nom} en double : ${p.f} et ${vus[v]} (« ${v} »)`); vus[v] = p.f; }
};
unique("title", "title"); unique("desc", "description");
ok(`titles et descriptions : ${indexables.length} pages indexables, tous uniques, descriptions ≤ 160 caractères`);

// 2) structure de base
for (const p of pages) {
  const corps = p.h.split(/<body[^>]*>/)[1] || "";
  assert.equal((corps.match(/<h1[\s>]/g) || []).length, 1, p.f + " : un seul H1");
  assert.match(p.h, /<html[^>]*lang="fr"/, p.f + " : lang fr");
  assert.match(p.h, /<meta name="viewport"/, p.f + " : viewport");
  if (!p.noindex) assert.equal(p.canonical, p.url, p.f + " : canonique");
}
ok("un H1 par page, lang fr, viewport, URL canonique = adresse de la page");

// 3) liens internes
const ids = {};
const idsDe = f => ids[f] || (ids[f] = new Set([...lire(f).matchAll(/\sid="([^"]+)"/g)].map(m => m[1])));
let nbLiens = 0;
for (const p of pages) {
  const dir = path.posix.dirname(p.f), corps = p.h.split(/<body[^>]*>/)[1] || "";
  for (const m of corps.matchAll(/<a\b[^>]*href="([^"]+)"/g)) {
    let href = dec(m[1]);
    if (href.startsWith(SITE)) href = "/" + href.slice(SITE.length);
    else if (/^(https?:|mailto:|tel:|javascript:|\$\{)/.test(href)) continue;
    nbLiens++;
    const [chemin, ancre] = href.split("#");
    let cible = chemin === "" ? p.f : chemin.startsWith("/") ? chemin.slice(1) : path.posix.normalize(path.posix.join(dir, chemin.split("?")[0]));
    cible = cible.split("?")[0];
    if (cible === "" || cible.endsWith("/")) cible += "index.html";
    assert.ok(fs.existsSync(path.join(racine, cible)), `${p.f} : lien cassé ${href}`);
    if (ancre && cible.endsWith(".html")) assert.ok(idsDe(cible).has(ancre), `${p.f} : ancre absente ${href}`);
  }
}
ok(`liens internes : ${nbLiens} liens vérifiés, aucun cassé (ancres comprises)`);

// 4) images
for (const p of pages) for (const m of p.h.matchAll(/<img\b[^>]*>/g)) {
  assert.match(m[0], /\salt="/, p.f + " : image sans alt");
  assert.match(m[0], /\swidth="\d+"[^>]*\sheight="\d+"|\sheight="\d+"[^>]*\swidth="\d+"/, p.f + " : image sans dimensions (décalage de mise en page)");
  // Grands bandeaux (1600 px) : une version 960 px pour les écrans qui n'ont pas besoin de plus
  if (/\swidth="1600"/.test(m[0])) assert.match(m[0], /\ssrcset="[^"]*960w/, p.f + " : bandeau sans version 960 px (srcset)");
  const srcset = (m[0].match(/\ssrcset="([^"]+)"/) || [])[1];
  if (srcset) for (const c of srcset.split(",")) {
    const fichier = c.trim().split(/\s+/)[0];
    assert.ok(fs.existsSync(path.join(racine, path.posix.dirname(p.f), fichier)), p.f + " : srcset vers un fichier absent " + fichier);
  }
}
ok("images : texte alternatif et dimensions partout, bandeaux en deux tailles (srcset)");

// 5) sitemap
const sitemap = lire("sitemap.xml");
const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
assert.equal(new Set(locs).size, locs.length, "sitemap : adresses en double");
const parUrl = Object.fromEntries(pages.map(p => [p.url, p]));
for (const u of locs) {
  const p = parUrl[u];
  assert.ok(p, "sitemap : page inexistante " + u);
  assert.ok(!p.noindex, "sitemap : page en noindex " + u);
}
for (const p of indexables) assert.ok(locs.includes(p.url), "page indexable absente du sitemap : " + p.f);
for (const d of [...sitemap.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map(m => m[1])) assert.match(d, /^\d{4}-\d{2}-\d{2}$/);
ok(`sitemap : ${locs.length} adresses, toutes existantes et indexables ; aucune page indexable oubliée`);

// 6) pages privées
for (const f of PRIVEES) {
  const p = pages.find(x => x.f === f);
  assert.ok(p && p.noindex, f + " : noindex attendu");
}
const robots = lire("robots.txt");
assert.match(robots, /Sitemap: https:\/\/apprendre-padel\.fr\/sitemap\.xml/);
assert.ok(!/Disallow: \/assets/.test(robots), "robots.txt ne doit pas bloquer les ressources (assets)");
ok("pages privées en noindex et hors sitemap ; robots.txt n'empêche pas le rendu");

// 7) données structurées
for (const p of pages) for (const m of p.h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
  let j; assert.doesNotThrow(() => { j = JSON.parse(m[1]); }, p.f + " : JSON-LD invalide");
  assert.ok(!JSON.stringify(j).includes('"FAQPage"'), p.f + " : FAQPage (résultats enrichis réservés aux sites gouvernementaux et de santé)");
}
ok("données structurées : JSON valide, pas de FAQPage");
// 8) contenu pré-rendu : présent sans JavaScript, et à jour (le JavaScript reconstruit exactement le même contenu)
const { CIBLES, principal } = require("./prerendre-contenu.js");
const motsSansJs = h => dec((h.split(/<body[^>]*>/)[1] || "").replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<[^>]+>/g, " ")).split(/\s+/).filter(Boolean).length;
for (const [page, ids] of Object.entries(CIBLES)) {
  const h = lire(page);
  for (const id of ids) {
    const a = h.indexOf(`<!-- prerendu:${id} -->`), b = h.indexOf(`<!-- /prerendu:${id} -->`);
    assert.ok(a >= 0 && b - a > 80, `${page} : contenu pré-rendu absent pour #${id} (node scripts/prerendre-contenu.js)`);
  }
}
assert.ok(motsSansJs(lire("technique.html")) > 1000, "technique.html : les fiches de coups doivent être lisibles sans JavaScript");
principal({ verifier: true }).then(ecarts => {
  assert.deepEqual(ecarts, [], "contenu pré-rendu en retard sur le JavaScript : lancer node scripts/prerendre-contenu.js");
  ok("contenu pré-rendu : fiches de coups, lexique, barème et plan lisibles sans JavaScript, identiques au rendu");
  console.log(`\n${n} vérifications réussies.`);
}).catch(e => { console.error(e); process.exitCode = 1; });
