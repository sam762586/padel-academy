/* PAGES DU SIMULATEUR 3D : une page par scénario, pour que chaque coup ait son adresse (et soit trouvé par les moteurs).
   Lancer : node scripts/generer-pages-3d.js   (puis le script lance appliquer-gabarit.js : menu, pied, versions)
   Source : simulateur-3d.html (page modèle), la liste SCENARIOS de assets/js/p3d/simulateur.js (noms et familles),
   et les scénarios assets/3d/scenarios/<id>.json (textes). Écrit :
     simulateur-3d-<id>.html   une page par scénario : titre, description, fil d'Ariane, textes du scénario dans le HTML
                               (lisibles sans JavaScript), simulateur ouvert sur ce scénario (data-scenario)
     simulateur-3d.html        la liste de toutes les pages, entre <!-- scenarios:debut --> et <!-- scenarios:fin -->
     sitemap.xml               une entrée par page (date changée seulement si la page change)
   Une page dont le scénario a disparu est supprimée, et retirée du sitemap. */
"use strict";
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const RACINE = path.join(__dirname, "..");
const SITE = "https://apprendre-padel.fr/";
const lire = f => fs.readFileSync(path.join(RACINE, f), "utf8").replace(/\r\n/g, "\n");
const ecrire = (f, t) => fs.writeFileSync(path.join(RACINE, f), t);
const html = t => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const page = id => "simulateur-3d-" + id + ".html";

// Liste et familles : celles du sélecteur de la page (une seule source)
const source = lire("assets/js/p3d/simulateur.js");
const SCENARIOS = [...source.matchAll(/\{ id: '([a-z0-9-]+)', nom: '([^']+)', groupe: '([^']+)' \}/g)].map(m => ({ id: m[1], nom: m[2].replace(/\\'/g, "'"), groupe: m[3] }));
const GROUPES = [...new Set(SCENARIOS.map(x => x.groupe))];
if (SCENARIOS.length < 10) throw new Error("Liste des scénarios introuvable dans simulateur.js");
const fiches = Object.fromEntries(SCENARIOS.map(x => [x.id, JSON.parse(lire("assets/3d/scenarios/" + x.id + ".json"))]));

// Description de moins de 160 caractères : première idée clé, coupée au mot
function description(s) {
  const fin = " À revoir en 3D, pas à pas, et en mode quiz.";
  let d = s.explication[0];
  if (d.length + fin.length > 158) { d = d.slice(0, 158 - fin.length - 1); d = d.slice(0, d.lastIndexOf(" ")).replace(/[ ,:;]+$/, "") + "…"; }
  return d + fin;
}

// Liste de toutes les pages, par famille (page principale et pages de scénario)
function listeScenarios(actuel) {
  return GROUPES.map(g => `      <div><h3>${html(g)}</h3><ul>${SCENARIOS.filter(x => x.groupe === g).map(x =>
    x.id === actuel ? `<li><b>${html(x.nom)}</b></li>` : `<li><a href="${page(x.id)}">${html(x.nom)}</a></li>`).join("")}</ul></div>`).join("\n");
}
const BLOC = /<!-- scenarios:debut -->[\s\S]*?<!-- scenarios:fin -->/;
const bloc = actuel => `<!-- scenarios:debut -->\n${listeScenarios(actuel)}\n      <!-- scenarios:fin -->`;

const modele = lire("simulateur-3d.html");
if (!BLOC.test(modele)) throw new Error("Marqueurs <!-- scenarios:debut/fin --> absents de simulateur-3d.html");
const remplacer = (texte, motif, valeur) => {
  if (!motif.test(texte)) throw new Error("Motif introuvable dans le modèle : " + motif);
  return texte.replace(motif, () => valeur);
};

const ecrites = [];
for (const x of SCENARIOS) {
  const s = fiches[x.id], f = page(x.id), url = SITE + f;
  const titre = s.titre + " au padel, en 3D", desc = description(s);
  let t = modele;
  t = remplacer(t, /<title>[^<]*<\/title>/, `<title>${html(titre)}</title>`);
  t = remplacer(t, /<meta name="description" content="[^"]*">/, `<meta name="description" content="${html(desc)}">`);
  t = remplacer(t, /<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${url}">`);
  t = remplacer(t, /<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${url}">`);
  t = remplacer(t, /<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${html(titre)}">`);
  t = remplacer(t, /<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${html(desc)}">`);
  const ariane = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
    { "@type": "ListItem", position: 1, name: "Accueil", item: SITE },
    { "@type": "ListItem", position: 2, name: "Simulateur 3D", item: SITE + "simulateur-3d.html" },
    { "@type": "ListItem", position: 3, name: s.titre, item: url }] };
  t = remplacer(t, /<script type="application\/ld\+json">[^<]*<\/script>/, `<script type="application/ld+json">${JSON.stringify(ariane).replace(/</g, "\\u003c")}</script>`);
  // En-tête : titre du coup, situation ; le simulateur s'ouvre sur ce scénario
  t = remplacer(t, /<section id="simulateur" class="alt">/, `<section id="simulateur" class="alt" data-scenario="${x.id}">`);
  t = remplacer(t, /<div><p class="eyebrow">[^<]*<\/p><h1>[^<]*<\/h1><\/div>\n      <p>[^<]*<\/p>/,
    `<div><p class="eyebrow">Simulateur 3D · ${html(x.groupe)}</p><h1>${html(s.titre)}</h1></div>\n      <p>${html(s.situation)} Regarde la scène sous tous les angles, pas à pas, ou passe en mode quiz.</p>`);
  // Textes du scénario écrits dans la page (le script les remplace par les mêmes)
  const li = l => l.map(e => `<li>${html(e)}</li>`).join("");
  t = remplacer(t, /<h2 id="p3d-etape-titre">[^<]*<\/h2>/, `<h2 id="p3d-etape-titre">${html(s.etapes[0].titre)}</h2>`);
  t = remplacer(t, /<p class="p3d-etape-texte" id="p3d-etape-texte" aria-live="polite"><\/p>/, `<p class="p3d-etape-texte" id="p3d-etape-texte" aria-live="polite">${html(s.etapes[0].texte)}</p>`);
  t = remplacer(t, /<p class="eyebrow" id="p3d-niveau">[^<]*<\/p><h2 id="p3d-titre-scenario">[^<]*<\/h2>/, `<p class="eyebrow" id="p3d-niveau">${html(s.niveau)}</p><h2 id="p3d-titre-scenario">Ce qu'il faut retenir</h2>`);
  t = remplacer(t, /<p id="p3d-situation"><\/p>/, `<p id="p3d-situation">${html(s.conclusion)}</p>`);
  t = remplacer(t, /<ul id="p3d-explication"><\/ul>/, `<ul id="p3d-explication">${li(s.explication)}</ul>`);
  t = remplacer(t, /<ul id="p3d-erreurs"><\/ul>/, `<ul id="p3d-erreurs">${li(s.erreurs)}</ul>`);
  t = remplacer(t, /<p id="p3d-conclusion"><\/p>/, `<p id="p3d-conclusion">${html(s.conclusion)}</p>`);
  t = remplacer(t, /<p id="p3d-exercice"><\/p>/, `<p id="p3d-exercice">${html(s.exercice)}</p>`);
  if (s.lien) {
    const libelle = { "technique.html": "Voir la fiche du coup", "tutos.html": "Voir les tutos", "regles.html": "Voir les règles", "tactique.html": "Voir le placement" }[s.lien.split("#")[0]] || "En savoir plus";
    t = remplacer(t, /<a id="p3d-lien" href="[^"]*">[^<]*<\/a>/, `<a id="p3d-lien" href="${html(s.lien)}">${libelle}</a>`);
  }
  // Déroulé complet (texte lisible par tous, y compris sans 3D)
  const deroule = `<section id="deroule" class="alt">
  <div class="wrap">
    <h2>Le déroulé, étape par étape</h2>
    <ol class="p3d-deroule">${s.etapes.map(e => `<li><b>${html(e.titre)}.</b> ${html(e.texte)}</li>`).join("")}</ol>
  </div>
</section>
<section id="tous-les-coups">`;
  t = remplacer(t, /<section id="tous-les-coups">/, deroule);
  t = remplacer(t, BLOC, bloc(x.id));
  ecrites.push(f);
  const avant = fs.existsSync(path.join(RACINE, f)) ? lire(f) : null;
  if (avant !== t) ecrire(f, t);
}

// Page principale : la liste de toutes les pages
const principale = modele.replace(BLOC, () => bloc(null));
if (principale !== modele) ecrire("simulateur-3d.html", principale);

// Pages de scénarios disparus
const supprimees = fs.readdirSync(RACINE).filter(n => /^simulateur-3d-[a-z0-9-]+\.html$/.test(n) && !ecrites.includes(n));
supprimees.forEach(n => fs.unlinkSync(path.join(RACINE, n)));

// Les gabarits (menu, pied, versions) sont posés par appliquer-gabarit.js, avant de calculer les dates du sitemap
execFileSync(process.execPath, [path.join(__dirname, "appliquer-gabarit.js")], { stdio: "inherit" });

// Sitemap : une entrée par page ; la date ne change que si la page a changé (empreinte gardée dans scripts/cache)
const crypto = require("crypto");
const fichierEmpreintes = path.join(__dirname, "cache", "pages-3d-empreintes.json");
const empreintes = fs.existsSync(fichierEmpreintes) ? JSON.parse(fs.readFileSync(fichierEmpreintes, "utf8")) : {};
const aujourdhui = new Date().toISOString().slice(0, 10);
let sitemap = lire("sitemap.xml");
for (const f of supprimees) sitemap = sitemap.replace(new RegExp(`\\s*<url>\\s*<loc>${SITE.replace(/\./g, "\\.")}${f.replace(/\./g, "\\.")}</loc>[\\s\\S]*?</url>`), "");
const entrees = [];
for (const f of ecrites) {
  const e = crypto.createHash("sha1").update(lire(f)).digest("hex");
  const existante = sitemap.match(new RegExp(`<url>\\s*<loc>${SITE.replace(/\./g, "\\.")}${f.replace(/\./g, "\\.")}</loc>\\s*<lastmod>([^<]+)</lastmod>[\\s\\S]*?</url>`));
  const date = existante && empreintes[f] === e ? existante[1] : aujourdhui;
  empreintes[f] = e;
  const entree = `<url>\n    <loc>${SITE}${f}</loc>\n    <lastmod>${date}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.6</priority>\n  </url>`;
  if (existante) sitemap = sitemap.replace(existante[0], entree);
  else entrees.push("  " + entree);
}
Object.keys(empreintes).filter(f => !ecrites.includes(f)).forEach(f => delete empreintes[f]);
if (entrees.length) {
  // Après l'entrée du simulateur principal
  const ancre = sitemap.match(/  <url>\s*<loc>https:\/\/apprendre-padel\.fr\/simulateur-3d\.html<\/loc>[\s\S]*?<\/url>\n/);
  if (!ancre) throw new Error("Entrée simulateur-3d.html absente du sitemap");
  sitemap = sitemap.replace(ancre[0], ancre[0] + entrees.join("\n") + "\n");
}
ecrire("sitemap.xml", sitemap);
fs.mkdirSync(path.dirname(fichierEmpreintes), { recursive: true });
fs.writeFileSync(fichierEmpreintes, JSON.stringify(empreintes, null, 1) + "\n");
console.log(`Pages 3D : ${ecrites.length} (supprimées : ${supprimees.length}), sitemap : ${entrees.length} ajoutée(s).`);
