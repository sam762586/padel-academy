#!/usr/bin/env node
/* GÉNÉRATION DES PAGES TOURNOIS (Node, aucune dépendance)
   Lit assets/data/tournois.json, assets/data/fiches/*.json, assets/js/bareme-donnees.js, assets/js/carte-france.js
   et écrit :
     tournoi/<id>.html                 une page par tournoi
     tournois/<dep>.html               les tournois d'un département (liste, carte, filtres)
     tournois/<region>/<cat>.html      les tournois d'une catégorie dans une région (P25 à P1000)
     assets/data/pages-tournois.js     départements publiés (lu par tournois.html et l'accueil)
     sitemap.xml                       régénéré : pages fixes + pages générées
   Usage :
     node scripts/generer-pages.js                     départements publiés (Normandie + Île-de-France)
     node scripts/generer-pages.js --departements 76,27
     node scripts/generer-pages.js --tout              toute la France
   Sortie déterministe : une page ne change que si ses données changent (pas d'horodatage dans le HTML),
   pour que le commit hebdomadaire reste petit. La date « lastmod » du sitemap ne bouge que si la page change.
   Tournois terminés : page gardée 60 jours avec un bandeau « Terminé », puis noindex et renvoi vers le
   département ; supprimée au bout d'un an. Les tournois sortis de tournois.json sont gardés dans
   scripts/cache/tournois-archive.json. */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const crypto = require("crypto");

const RACINE = path.join(__dirname, "..");
const SITE = "https://apprendre-padel.fr/";
const ARCHIVE = path.join(__dirname, "cache", "tournois-archive.json");
const EMPREINTES = path.join(__dirname, "cache", "pages-empreintes.json");
// Premier temps (décision du 26/10/2026) : Normandie + Île-de-France, validation du rendu avant tout le reste
const DEPARTEMENTS_PUBLIES = ["14", "27", "50", "61", "76", "75", "77", "78", "91", "92", "93", "94", "95"];
const JOURS_TERMINE = 60;      // bandeau « Terminé », page toujours indexée
const JOURS_SUPPRESSION = 365; // au-delà, la page est supprimée
const CATEGORIES_REGION = ["P25", "P50", "P100", "P250", "P500", "P1000"];

/* ---------- Référentiels ---------- */
// Régions métropolitaines : slug, nom, préposition, départements
const REGIONS = [
  ["auvergne-rhone-alpes", "Auvergne-Rhône-Alpes", "en", ["01", "03", "07", "15", "26", "38", "42", "43", "63", "69", "73", "74"]],
  ["bourgogne-franche-comte", "Bourgogne-Franche-Comté", "en", ["21", "25", "39", "58", "70", "71", "89", "90"]],
  ["bretagne", "Bretagne", "en", ["22", "29", "35", "56"]],
  ["centre-val-de-loire", "Centre-Val de Loire", "en", ["18", "28", "36", "37", "41", "45"]],
  ["corse", "Corse", "en", ["2A", "2B"]],
  ["grand-est", "Grand Est", "dans le", ["08", "10", "51", "52", "54", "55", "57", "67", "68", "88"]],
  ["hauts-de-france", "Hauts-de-France", "dans les", ["02", "59", "60", "62", "80"]],
  ["ile-de-france", "Île-de-France", "en", ["75", "77", "78", "91", "92", "93", "94", "95"]],
  ["normandie", "Normandie", "en", ["14", "27", "50", "61", "76"]],
  ["nouvelle-aquitaine", "Nouvelle-Aquitaine", "en", ["16", "17", "19", "23", "24", "33", "40", "47", "64", "79", "86", "87"]],
  ["occitanie", "Occitanie", "en", ["09", "11", "12", "30", "31", "32", "34", "46", "48", "65", "66", "81", "82"]],
  ["pays-de-la-loire", "Pays de la Loire", "dans les", ["44", "49", "53", "72", "85"]],
  ["provence-alpes-cote-d-azur", "Provence-Alpes-Côte d'Azur", "en", ["04", "05", "06", "13", "83", "84"]],
].map(([slug, nom, prep, deps]) => ({ slug, nom, prep, deps }));
const regionDe = dep => REGIONS.find(r => r.deps.includes(dep)) || null;
// Préposition devant le nom du département (« en Seine-Maritime », « dans l'Eure », « à Paris »)
const PREP_DEP = {
  "01": "dans l'", "02": "dans l'", "03": "dans l'", "04": "dans les ", "05": "dans les ", "06": "dans les ", "07": "en ", "08": "dans les ", "09": "en ",
  "10": "dans l'", "11": "dans l'", "12": "en ", "13": "dans les ", "14": "dans le ", "15": "dans le ", "16": "en ", "17": "en ", "18": "dans le ", "19": "en ",
  "2A": "en ", "2B": "en ", "21": "en ", "22": "dans les ", "23": "dans la ", "24": "en ", "25": "dans le ", "26": "dans la ", "27": "dans l'", "28": "en ", "29": "dans le ",
  "30": "dans le ", "31": "en ", "32": "dans le ", "33": "en ", "34": "dans l'", "35": "en ", "36": "dans l'", "37": "en ", "38": "en ", "39": "dans le ",
  "40": "dans les ", "41": "en ", "42": "dans la ", "43": "en ", "44": "en ", "45": "dans le ", "46": "dans le ", "47": "en ", "48": "en ", "49": "en ",
  "50": "dans la ", "51": "dans la ", "52": "en ", "53": "en ", "54": "en ", "55": "dans la ", "56": "dans le ", "57": "en ", "58": "dans la ", "59": "dans le ",
  "60": "dans l'", "61": "dans l'", "62": "dans le ", "63": "dans le ", "64": "dans les ", "65": "dans les ", "66": "dans les ", "67": "dans le ", "68": "dans le ", "69": "dans le ",
  "70": "en ", "71": "en ", "72": "dans la ", "73": "en ", "74": "en ", "75": "à ", "76": "en ", "77": "en ", "78": "dans les ", "79": "dans les ",
  "80": "dans la ", "81": "dans le ", "82": "dans le ", "83": "dans le ", "84": "dans le ", "85": "en ", "86": "dans la ", "87": "en ", "88": "dans les ", "89": "dans l'",
  "90": "dans le ", "91": "dans l'", "92": "dans les ", "93": "en ", "94": "dans le ", "95": "dans le ", "971": "en ", "972": "en ", "973": "en ", "974": "à ", "976": "à ",
};

/* ---------- Chargement des sources ---------- */
function lireJson(f, defaut) { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch (e) { return defaut; } }
// Fichier JS du site exécuté dans un bac à sable, avec une ligne d'export ajoutée à la fin
function chargerJs(fichier, exporter) {
  const bac = { window: {}, document: { getElementById: () => null, querySelector: () => null }, localStorage: { getItem: () => null }, location: { protocol: "https:" } };
  vm.runInNewContext(fs.readFileSync(path.join(RACINE, fichier), "utf8") + "\n;this.__export=(" + exporter + ");", bac);
  return bac.__export;
}
const B = chargerJs("assets/js/bareme-donnees.js", "window.PA_BAREME");
const DEPARTEMENTS = new Map(chargerJs("assets/js/tournois.js", "TOURNOIS_DEPARTEMENTS"));
const CARTE = chargerJs("assets/js/carte-france.js", "{traces:CARTE_FRANCE,vue:CARTE_FRANCE_VIEWBOX}");

/* ---------- Outils ---------- */
const echapper = s => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const jsonDansHtml = o => JSON.stringify(o).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const MOIS_LONGS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const JOURS = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];
const lireJour = iso => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ""); return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : null; };
const versIso = d => d.toISOString().slice(0, 10);
const ajouterJours = (iso, n) => { const d = lireJour(iso); d.setUTCDate(d.getUTCDate() + n); return versIso(d); };
const ecartJours = (a, b) => Math.round((lireJour(b) - lireJour(a)) / 86400000);
function periode(debut, fin) {
  const d = lireJour(debut), f = lireJour(fin) || d;
  const jour = x => JOURS[x.getUTCDay()] + " " + x.getUTCDate() + " " + MOIS[x.getUTCMonth()];
  if (!fin || fin === debut) return jour(d) + " " + d.getUTCFullYear();
  if (d.getUTCFullYear() === f.getUTCFullYear()) return jour(d) + " – " + jour(f) + " " + f.getUTCFullYear();
  return jour(d) + " " + d.getUTCFullYear() + " – " + jour(f) + " " + f.getUTCFullYear();
}
// « les 12-13 déc. 2026 », « le 12 déc. 2026 » (meta description)
function periodeCourte(debut, fin) {
  const d = lireJour(debut), f = lireJour(fin) || d;
  if (!fin || fin === debut) return "le " + d.getUTCDate() + " " + MOIS[d.getUTCMonth()] + " " + d.getUTCFullYear();
  if (d.getUTCMonth() === f.getUTCMonth() && d.getUTCFullYear() === f.getUTCFullYear()) return "les " + d.getUTCDate() + "-" + f.getUTCDate() + " " + MOIS[f.getUTCMonth()] + " " + f.getUTCFullYear();
  return "du " + d.getUTCDate() + " " + MOIS[d.getUTCMonth()] + " au " + f.getUTCDate() + " " + MOIS[f.getUTCMonth()] + " " + f.getUTCFullYear();
}
// Ville en casse lisible : « LE PETIT QUEVILLY » -> « Le Petit Quevilly »
const MOTS_MINUSCULES = new Set(["de", "du", "des", "la", "le", "les", "sur", "sous", "en", "et", "lès", "lez", "aux", "au", "d", "l"]);
function casse(s) {
  return String(s || "").toLowerCase().replace(/(^|[\s\-'’])([a-zàâäçéèêëîïôöùûüÿœ]+)/g, (m, sep, mot, i) =>
    sep + (i > 0 && MOTS_MINUSCULES.has(mot) && sep !== "" ? mot : mot.charAt(0).toUpperCase() + mot.slice(1)));
}
const nomDep = dep => DEPARTEMENTS.get(dep) || dep;
const dansDep = dep => (PREP_DEP[dep] || "en ") + nomDep(dep);
const libelleCat = c => c || "Catégorie non précisée";
const classeCat = c => /^P(25|50|100|250|500|1000|2000|3000)$/.test(c || "") ? "cat-" + c.toLowerCase() : "cat-autre";
const sexesDe = t => Array.isArray(t.sexes) ? t.sexes : [];
const SEXES = { messieurs: "Messieurs", dames: "Dames", mixte: "Mixte" };
const majuscule = s => s.charAt(0).toUpperCase() + s.slice(1);

/* ---------- Gabarit : nav et footer recopiés depuis index.html ---------- */
const INDEX = fs.readFileSync(path.join(RACINE, "index.html"), "utf8");
function extraire(debut, fin) {
  const i = INDEX.indexOf(debut), j = INDEX.indexOf(fin, i);
  if (i < 0 || j < 0) throw new Error("Gabarit introuvable dans index.html : " + debut);
  return INDEX.slice(i, j + fin.length);
}
// Liens relatifs du site préfixés (« ../ ») pour les pages en sous-dossier
const prefixer = (html, prefixe) => html.replace(/(href|src)="(?!https?:|\/|#|mailto:|tel:|data:)([^"]*)"/g, (m, attr, url) => `${attr}="${prefixe}${url}"`);
const NAV = extraire('<nav class="nav"', "</nav>").replace(/ class="active"/g, "");
const FOOTER = extraire("<footer>", "</footer>");
const NOM_SITE = (/"@type": "WebSite"[^}]*"name": "([^"]+)"/.exec(INDEX) || [])[1] || "Apprendre Padel";

function page({ chemin, titre, description, h1, corps, jsonLd = [], noindex = false, scripts = [], navActif = "tournois.html" }) {
  const profondeur = chemin.split("/").length - 1;
  const pre = "../".repeat(profondeur);
  const url = SITE + chemin;
  const nav = prefixer(NAV.replace(`href="${navActif}"`, `href="${navActif}" class="active"`), pre);
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${echapper(titre)}</title>
<meta name="description" content="${echapper(description)}">
${noindex ? '<meta name="robots" content="noindex,follow">\n' : ""}<link rel="canonical" href="${url}">
<link rel="icon" type="image/png" href="${pre}favicon.png">
<link rel="apple-touch-icon" href="${pre}apple-touch-icon.png">
<meta name="theme-color" content="#070b14">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${echapper(NOM_SITE)} · apprendre-padel.fr">
<meta property="og:locale" content="fr_FR">
<meta property="og:url" content="${url}">
<meta property="og:title" content="${echapper(titre)}">
<meta property="og:description" content="${echapper(description)}">
<meta property="og:image" content="${SITE}assets/img/og-image.png">
<meta name="twitter:card" content="summary_large_image">
${jsonLd.map(o => `<script type="application/ld+json">${jsonDansHtml(o)}</script>`).join("\n")}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@700;800;900&family=Manrope:wght@400;500;600;700&display=swap">
<link rel="stylesheet" href="${pre}assets/style.css">
<link rel="manifest" href="${pre}manifest.webmanifest">
<script src="${pre}assets/js/pwa.js" defer></script>
</head>
<body>
${nav}
<main class="gen">
<div class="wrap">
${h1}
${corps}
</div>
</main>
${prefixer(FOOTER, pre)}
${scripts.map(s => `<script src="${s.startsWith("http") ? s : pre + s}"></script>`).join("\n")}
<script src="${pre}assets/js/nav.js"></script>
<script data-goatcounter="https://apprendre-padel.goatcounter.com/count" async src="https://gc.zgo.at/count.js"></script>
</body>
</html>
`;
}
const fil = (elements) => ({ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: elements.map(([nom, url], i) => ({ "@type": "ListItem", position: i + 1, name: nom, item: SITE + url })) });
function filHtml(elements, pre) {
  return `<nav class="gen-fil" aria-label="Fil d'Ariane"><ol>${elements.map(([nom, url], i) =>
    i === elements.length - 1 ? `<li aria-current="page">${echapper(nom)}</li>` : `<li><a href="${pre}${url}">${echapper(nom)}</a></li>`).join("")}</ol></nav>`;
}

/* ---------- Carte d'un département : tracé + points des tournois ---------- */
// Projection identique à scripts/build-carte-france.js (constantes recalculées depuis la même source GeoJSON)
const rad = Math.PI / 180, phi1 = 44 * rad, phi2 = 49 * rad, phi0 = 46.5 * rad, lam0 = 3 * rad;
const nL = Math.log(Math.cos(phi1) / Math.cos(phi2)) / Math.log(Math.tan(Math.PI / 4 + phi2 / 2) / Math.tan(Math.PI / 4 + phi1 / 2));
const FL = Math.cos(phi1) * Math.pow(Math.tan(Math.PI / 4 + phi1 / 2), nL) / nL;
const rhoL = p => FL / Math.pow(Math.tan(Math.PI / 4 + p / 2), nL), rho0 = rhoL(phi0);
const CARTE_MIN_X = -0.09362313780269853, CARTE_MAX_Y = 0.08010727139522333, CARTE_ECHELLE = 3293.4280552334067, CARTE_MARGE = 6;
function versCarte(lng, lat) {
  const r = rhoL(lat * rad), th = nL * (lng * rad - lam0);
  return [(r * Math.sin(th) - CARTE_MIN_X) * CARTE_ECHELLE + CARTE_MARGE, (CARTE_MAX_Y - (rho0 - r * Math.cos(th))) * CARTE_ECHELLE + CARTE_MARGE];
}
// Boîte englobante d'un tracé « M x y l dx dy ... » (commandes relatives)
function boite(d) {
  let x = 0, y = 0, minx = 1e9, miny = 1e9, maxx = -1e9, maxy = -1e9;
  const re = /([MlZz])([^MlZz]*)/g; let m;
  while ((m = re.exec(d))) {
    const n = (m[2].match(/-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi) || []).map(Number);
    if (m[1] === "M") { x = n[0]; y = n[1]; for (let i = 2; i + 1 < n.length; i += 2) { x += n[i]; y += n[i + 1]; minx = Math.min(minx, x); maxx = Math.max(maxx, x); miny = Math.min(miny, y); maxy = Math.max(maxy, y); } }
    else if (m[1] === "l") for (let i = 0; i + 1 < n.length; i += 2) { x += n[i]; y += n[i + 1]; minx = Math.min(minx, x); maxx = Math.max(maxx, x); miny = Math.min(miny, y); maxy = Math.max(maxy, y); }
    if (m[1] === "M") { minx = Math.min(minx, n[0]); maxx = Math.max(maxx, n[0]); miny = Math.min(miny, n[1]); maxy = Math.max(maxy, n[1]); }
  }
  return [minx, miny, maxx, maxy];
}
function carteDepartement(dep, tournois) {
  const trace = CARTE.traces.find(t => t.code === dep);
  if (!trace) return "";
  const [x0, y0, x1, y1] = boite(trace.d), marge = Math.max(x1 - x0, y1 - y0) * 0.06;
  const vb = [x0 - marge, y0 - marge, x1 - x0 + 2 * marge, y1 - y0 + 2 * marge].map(v => +v.toFixed(1));
  const r = +(Math.max(vb[2], vb[3]) / 70).toFixed(2);
  // Un point par club (plusieurs tournois au même endroit = un seul point, plus gros)
  const parLieu = new Map();
  tournois.filter(t => typeof t.lat === "number" && typeof t.lng === "number").forEach(t => {
    const cle = t.lat.toFixed(3) + "," + t.lng.toFixed(3);
    if (!parLieu.has(cle)) parLieu.set(cle, { t, n: 0 });
    parLieu.get(cle).n++;
  });
  const points = [...parLieu.values()].sort((a, b) => b.n - a.n).map(({ t, n }) => {
    const [x, y] = versCarte(t.lng, t.lat);
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(r * Math.min(2.2, 1 + Math.log2(n) / 3)).toFixed(2)}"><title>${echapper(casse(t.ville))} : ${n} tournoi${n > 1 ? "s" : ""}</title></circle>`;
  }).join("");
  return `<figure class="gen-carte"><svg viewBox="${vb.join(" ")}" role="img" aria-label="Carte ${echapper(dansDep(dep))} : ${parLieu.size} lieu${parLieu.size > 1 ? "x" : ""} de tournoi"><path d="${trace.d}"/>${points}</svg><figcaption>Un point par lieu de tournoi (plus gros quand il y en a plusieurs).</figcaption></figure>`;
}

/* ---------- Barème de la catégorie ---------- */
function tableBareme(cat, nbPaires, maxLignes = 32) {
  const d = B.BAREME[cat];
  if (!d) return "";
  let tete, lignes, note;
  if (Array.isArray(d) && Array.isArray(d[0])) {
    const ti = nbPaires ? B.trancheIdx(nbPaires) : -1;
    tete = `<tr><th scope="col">Place</th>${B.TRANCHES.map((t, i) => `<th scope="col"${i === ti ? ' class="hi"' : ""}>${t}<span> paires</span></th>`).join("")}</tr>`;
    lignes = d.slice(0, maxLignes).map((r, i) => r.some(v => v !== null) ? `<tr><th scope="row">${echapper(B.PLACE_LABEL(i))}</th>${r.map((v, j) => `<td${j === ti ? ' class="hi"' : ""}>${v === null ? "–" : v}</td>`).join("")}</tr>` : "").join("");
    note = ti >= 0 ? `Colonne surlignée : tableau de ${nbPaires} places annoncé sur Ten'Up (${B.TRANCHES[ti]} paires).` : "Les points dépendent du nombre de paires inscrites : regarde la colonne qui correspond au tableau.";
  } else if (Array.isArray(d)) {
    tete = `<tr><th scope="col">Place</th><th scope="col">Points</th></tr>`;
    lignes = d.slice(0, maxLignes).map((v, i) => `<tr><th scope="row">${echapper(B.PLACE_LABEL(i))}</th><td>${v}</td></tr>`).join("");
    note = "Barème commun messieurs et dames, indépendant du nombre de paires.";
  } else {
    tete = `<tr><th scope="col">Place</th><th scope="col">Messieurs</th><th scope="col">Dames</th></tr>`;
    lignes = d.messieurs.slice(0, maxLignes).map((v, i) => `<tr><th scope="row">${echapper(B.PLACE_LABEL(i))}</th><td>${v}</td><td>${d.dames[i] !== undefined ? d.dames[i] : "–"}</td></tr>`).join("");
    note = "Barèmes distincts messieurs et dames, indépendants du nombre de paires.";
  }
  const coupe = maxLignes < 32 ? ` Les ${maxLignes} premières places sont affichées : le barème complet est sur la page Barème.` : "";
  return `<div class="tbl gen-bareme"><table><caption class="sr-only">Points ${cat} selon la place</caption><thead>${tete}</thead><tbody>${lignes}</tbody></table></div><p class="note">${echapper(note + coupe)} Barème FFT 2026/2027.</p>`;
}

/* ---------- Liens « Se préparer » selon la catégorie ---------- */
function sePreparer(t) {
  const mixte = sexesDe(t).includes("mixte");
  const liens = [];
  if (t.categorie === "P25" || t.categorie === "P50") liens.push(["competition.html", "Ton premier tournoi : licence, inscription, déroulé"]);
  if (["P100", "P250", "P500"].includes(t.categorie)) liens.push(["tutos.html", "Quand monter au filet, que faire sur un lob : les décisions qui font gagner"]);
  if (["P100", "P250", "P500", "P1000"].includes(t.categorie)) liens.push(["regles.html", "Point décisif, let, vitres : les règles qui coûtent des points"]);
  if (mixte) liens.push(["tactique.html", "Tactique en mixte : placement et répartition des balles"]);
  liens.push(["niveau.html", "Quel est ton niveau ? Le test en 10 questions"]);
  liens.push(["entrainement.html", "Plan d'entraînement 8 semaines pour arriver prêt"]);
  return liens.slice(0, 3);
}

/* ---------- Données ---------- */
const args = process.argv.slice(2);
const tout = args.includes("--tout");
const iDeps = args.indexOf("--departements");
const depsDemandes = iDeps >= 0 ? (args[iDeps + 1] || "").split(",").map(s => s.trim()).filter(Boolean) : null;
const aujourdhui = (() => { const i = args.indexOf("--date"); return i >= 0 ? args[i + 1] : versIso(new Date()); })(); // --date pour les tests

const donnees = lireJson(path.join(RACINE, "assets/data/tournois.json"), null);
if (!donnees || !Array.isArray(donnees.tournois)) { console.error("assets/data/tournois.json illisible"); process.exit(1); }
const fiches = {};
for (const f of fs.readdirSync(path.join(RACINE, "assets/data/fiches")).filter(f => f.endsWith(".json"))) Object.assign(fiches, lireJson(path.join(RACINE, "assets/data/fiches", f), {}));

// Archive : dernière version connue de chaque tournoi (pour les pages des tournois terminés)
const archive = lireJson(ARCHIVE, {});
const valide = t => t && /^\d{1,12}$/.test(String(t.id)) && t.nom && lireJour(t.date_debut) && /^[0-9AB]{2,3}$/.test(t.dep || "");
donnees.tournois.filter(valide).forEach(t => { archive[t.id] = { t, fiche: fiches[t.id] || null }; });
// Tournois retirés de Ten'Up avant leur date : on ne garde pas leur page (pas de tournoi fantôme)
const enLigne = new Set(donnees.tournois.map(t => String(t.id)));
for (const id of Object.keys(archive)) {
  const fin = archive[id].t.date_fin || archive[id].t.date_debut;
  if (!enLigne.has(id) && fin >= aujourdhui) delete archive[id];
  else if (ecartJours(fin, aujourdhui) > JOURS_SUPPRESSION) delete archive[id];
}

const publies = tout ? [...new Set(Object.values(archive).map(a => a.t.dep))] : (depsDemandes || DEPARTEMENTS_PUBLIES);
// Mode partiel (--departements, pour les tests) : on écrit seulement ces pages, sans toucher au sitemap,
// à la liste des départements publiés ni aux pages des autres départements
const partiel = !!depsDemandes && !tout;
// L'archive ne garde que le périmètre publié (sinon plusieurs Mo réécrits chaque semaine)
const perimetreArchive = new Set(tout ? publies : [...DEPARTEMENTS_PUBLIES, ...(depsDemandes || [])]);
for (const id of Object.keys(archive)) if (!perimetreArchive.has(archive[id].t.dep)) delete archive[id];
const dansPerimetre = t => publies.includes(t.dep);
const tous = Object.values(archive).filter(a => dansPerimetre(a.t));
const aVenir = t => (t.date_fin || t.date_debut) >= aujourdhui;
const parDate = (a, b) => a.date_debut < b.date_debut ? -1 : a.date_debut > b.date_debut ? 1 : String(a.nom).localeCompare(String(b.nom));

/* ---------- Écriture (seulement si le contenu change) ---------- */
// JSON avec une entrée par ligne, triée : les différences git restent lisibles d'une semaine à l'autre
const enLignes = obj => "{\n" + Object.keys(obj).sort().map(k => JSON.stringify(k) + ":" + JSON.stringify(obj[k])).join(",\n") + "\n}\n";
const empreintes = lireJson(EMPREINTES, {});
const ecrites = new Set();
let nbEcrites = 0, nbInchangees = 0;
function ecrire(chemin, html, { indexer = true } = {}) {
  const f = path.join(RACINE, chemin);
  const h = crypto.createHash("sha1").update(html).digest("hex").slice(0, 16);
  const avant = empreintes[chemin];
  if (!avant || avant.h !== h || !fs.existsSync(f)) {
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, html);
    empreintes[chemin] = { h, lastmod: aujourdhui };
    nbEcrites++;
  } else nbInchangees++;
  empreintes[chemin].indexer = indexer;
  ecrites.add(chemin);
}

/* ---------- Pages des tournois ---------- */
function carteTournoiHtml(t, pre) {
  return `<li class="gen-item" data-cat="${echapper(t.categorie || "")}" data-sexes="${echapper(sexesDe(t).join(" "))}" data-debut="${t.date_debut}" data-fin="${t.date_fin || t.date_debut}"${typeof t.lat === "number" ? ` data-lat="${t.lat}" data-lng="${t.lng}"` : ""}>
<a href="${pre}tournoi/${t.id}.html"><span class="cat-badge ${classeCat(t.categorie)}">${echapper(t.categorie || "?")}</span><span class="gen-item-texte"><b>${echapper(t.nom)}</b><span>${echapper(casse(t.club))} · ${echapper(casse(t.ville))}</span></span><span class="gen-item-date">${echapper(periode(t.date_debut, t.date_fin))}</span></a></li>`;
}

for (const { t, fiche } of tous) {
  const chemin = `tournoi/${t.id}.html`, pre = "../";
  const fin = t.date_fin || t.date_debut;
  const termine = fin < aujourdhui;
  const joursDepuis = termine ? ecartJours(fin, aujourdhui) : 0;
  const indexer = !termine || joursDepuis <= JOURS_TERMINE;
  const ville = casse(t.ville), club = casse(t.club);
  const region = regionDe(t.dep);
  const epreuves = fiche && Array.isArray(fiche.epreuves) ? fiche.epreuves : [];
  const tableaux = epreuves.map(e => e && e.tableau).filter(v => typeof v === "number" && v > 0);
  const nbPaires = tableaux.length ? Math.max(...tableaux) : null;
  const titre = `Tournoi de padel ${t.categorie ? t.categorie + " " : ""}à ${ville} (${t.dep}) · ${periodeCourte(t.date_debut, t.date_fin).replace(/^(le|les|du) /, "")}`;
  const description = `Tournoi de padel ${t.categorie || ""} à ${ville} ${periodeCourte(t.date_debut, t.date_fin)} : points selon le nombre de paires, épreuves, inscription sur Ten'Up et partenaires.`.replace(/\s+/g, " ");
  const lienTenup = `https://tenup.fft.fr/tournoi/${t.id}`;
  const adresse = fiche && fiche.adresse ? String(fiche.adresse) : `${club}, ${ville}`;
  const itineraire = "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(fiche && fiche.adresse ? fiche.adresse : `${t.club} ${t.cp || ""} ${t.ville}`);
  const sx = sexesDe(t).map(s => SEXES[s] || s);
  const jsonLd = [
    {
      "@context": "https://schema.org", "@type": "SportsEvent", name: t.nom + (t.categorie && !String(t.nom).includes(t.categorie) ? " (" + t.categorie + ")" : ""),
      sport: "Padel", startDate: t.date_debut, endDate: fin, eventStatus: "https://schema.org/EventScheduled", eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
      location: { "@type": "Place", name: club, address: { "@type": "PostalAddress", streetAddress: fiche && fiche.adresse ? fiche.adresse : undefined, addressLocality: ville, postalCode: t.cp || undefined, addressCountry: "FR" }, ...(typeof t.lat === "number" ? { geo: { "@type": "GeoCoordinates", latitude: t.lat, longitude: t.lng } } : {}) },
      organizer: { "@type": "Organization", name: club }, url: SITE + chemin,
    },
    fil([["Accueil", ""], ["Tournois", "tournois.html"], [nomDep(t.dep), `tournois/${t.dep}.html`], [t.nom, chemin]]),
  ];
  const lignesEpreuves = epreuves.map(e => `<tr><td>${echapper(e.libelle ? majuscule(String(e.libelle).toLowerCase()) : e.code || "")}</td><td>${echapper(e.categorie || t.categorie || "")}</td><td>${echapper(e.cut ? String(e.cut).replace(/\s*Vainqueur\s*:.*$/i, "") : "–")}</td><td>${typeof e.tarif === "number" ? echapper(String(e.tarif).replace(".", ",")) + " €" : "–"}</td><td>${typeof e.tableau === "number" && e.tableau > 0 ? e.tableau : "–"}</td></tr>`).join("");
  const commentaire = fiche && fiche.commentaire ? String(fiche.commentaire).trim() : "";
  const donneesPage = { id: String(t.id), nom: t.nom, categorie: t.categorie, club: t.club, ville: t.ville, cp: t.cp, dep: t.dep, lat: t.lat, lng: t.lng, date_debut: t.date_debut, date_fin: t.date_fin, sexes: t.sexes, adresse: fiche && fiche.adresse ? fiche.adresse : null };
  const h1 = `${filHtml([["Accueil", "index.html"], ["Tournois", "tournois.html"], [nomDep(t.dep), `tournois/${t.dep}.html`], [t.nom, chemin]], pre)}
<header class="gen-tete">
${termine ? `<p class="gen-termine" role="status">Terminé${indexer ? "" : " depuis plus de 2 mois"} : ce tournoi a eu lieu ${periodeCourte(t.date_debut, t.date_fin)}. <a href="${pre}tournois/${t.dep}.html">Voir les prochains tournois ${echapper(dansDep(t.dep))}</a>.</p>` : ""}
<div class="gen-tete-ligne"><span class="cat-badge cat-badge-xl ${classeCat(t.categorie)}">${echapper(t.categorie || "?")}</span><h1>${echapper(t.nom)}</h1></div>
<p class="gen-lieu">${echapper(club)} · ${echapper(ville)} (${t.dep})</p>
<p class="gen-dates">${echapper(periode(t.date_debut, t.date_fin))}${sx.length ? " · " + echapper(sx.join(" / ")) : ""}</p>
<p class="gen-distance" id="ft-distance" hidden></p>
<div class="gen-actions">
<a class="btn primary" href="${lienTenup}" target="_blank" rel="noopener">S'inscrire sur Ten'Up</a>
<button type="button" class="btn ghost" id="ft-calendrier">Ajouter à mon calendrier</button>
<button type="button" class="btn ghost" id="ft-position">Distance depuis chez moi</button>
</div>
<p class="acc-msg" id="ft-message" role="status" hidden></p>
</header>`;
  const corps = `<script type="application/json" id="tournoi-donnees">${jsonDansHtml(donneesPage)}</script>
<section class="gen-bloc" aria-labelledby="gb-points"><h2 id="gb-points">Ce que ça rapporte</h2>
${t.categorie && B.BAREME[t.categorie] ? tableBareme(t.categorie, nbPaires, 16) + `<p><a href="${pre}bareme.html#b-form">Calcule tes points et ton classement avec le simulateur</a></p>` : "<p>Catégorie non précisée sur Ten'Up : vérifie-la sur la fiche du tournoi.</p>"}
</section>
<section class="gen-bloc" aria-labelledby="gb-epreuves"><h2 id="gb-epreuves">Épreuves et infos pratiques</h2>
${lignesEpreuves ? `<div class="tbl"><table><thead><tr><th scope="col">Épreuve</th><th scope="col">Catégorie</th><th scope="col">Cut</th><th scope="col">Tarif</th><th scope="col">Tableau</th></tr></thead><tbody>${lignesEpreuves}</tbody></table></div>` : "<p>Le détail des épreuves n'est pas encore disponible : consulte la fiche Ten'Up.</p>"}
<ul class="gen-infos">
<li><b>Adresse :</b> ${echapper(adresse)} · <a href="${echapper(itineraire)}" target="_blank" rel="noopener">Itinéraire</a></li>
${fiche && fiche.horaires ? `<li><b>Horaires :</b> ${echapper(fiche.horaires)}</li>` : ""}
${fiche && fiche.balles ? `<li><b>Balles :</b> ${echapper(fiche.balles)}</li>` : ""}
${commentaire ? `<li><b>Mot de l'organisateur :</b> ${echapper(commentaire.length > 300 ? commentaire.slice(0, 297) + "…" : commentaire)}</li>` : ""}
</ul>
<p class="note">Données Ten'Up (FFT) relevées chaque semaine. Seule la fiche Ten'Up fait foi pour les dates, horaires et conditions d'inscription.</p>
</section>
<section class="gen-bloc" aria-labelledby="gb-preparer"><h2 id="gb-preparer">Se préparer</h2>
<ul class="gen-liens">${sePreparer(t).map(([u, l]) => `<li><a href="${pre}${u}">${echapper(l)}</a></li>`).join("")}</ul>
</section>
<section class="gen-bloc" id="ft-communaute" aria-labelledby="gb-qui"><h2 id="gb-qui">Qui y va</h2>
<div id="ft-presences"><p class="acc-muted">Bientôt : les joueurs du site qui participent à ce tournoi.</p></div>
<div id="ft-annonces"><p><a href="${pre}partenaires.html?tournoi=${t.id}">Trouver un partenaire pour ce tournoi</a></p></div>
<div id="ft-avis"></div>
</section>
<section class="gen-bloc" aria-labelledby="gb-autour"><h2 id="gb-autour">Autour de ce tournoi</h2>
<ul class="gen-liens"><li><a href="${pre}tournois/${t.dep}.html">Tous les tournois ${echapper(dansDep(t.dep))}</a></li>${region && t.categorie && CATEGORIES_REGION.includes(t.categorie) ? `<li><a href="${pre}tournois/${region.slug}/${t.categorie.toLowerCase()}.html">Tournois ${t.categorie} ${echapper(region.prep)} ${echapper(region.nom)}</a></li>` : ""}<li><a href="${pre}tournois.html">Carte de tous les tournois de France</a></li></ul>
</section>`;
  ecrire(chemin, page({ chemin, titre, description, h1, corps, jsonLd, noindex: !indexer, scripts: ["assets/data/pages-tournois.js", "assets/js/favoris.js", "assets/js/fiche-tournoi.js"] }), { indexer });
}

/* ---------- Pages département ---------- */
const filtresHtml = (cats) => `<form class="gen-filtres" id="gl-filtres" novalidate>
<fieldset><legend>Catégorie</legend><div class="tchips">${cats.map(c => `<label class="tchip"><input type="checkbox" name="cat" value="${echapper(c)}"><span>${echapper(c)}</span></label>`).join("")}</div></fieldset>
<fieldset><legend>Tableau</legend><div class="tchips">${Object.entries(SEXES).map(([v, l]) => `<label class="tchip"><input type="checkbox" name="sexe" value="${v}"><span>${l}</span></label>`).join("")}</div></fieldset>
<div class="gen-filtres-dates"><div><label for="gl-du">Du</label><input type="date" id="gl-du"></div><div><label for="gl-au">Au</label><input type="date" id="gl-au"></div></div>
</form>
<p class="tcompteur" id="gl-compteur" role="status" aria-live="polite"></p>`;

const depsPublies = [...new Set(tous.map(a => a.t.dep))].sort();
for (const dep of depsPublies) {
  const chemin = `tournois/${dep}.html`, pre = "../";
  const liste = tous.map(a => a.t).filter(t => t.dep === dep && aVenir(t)).sort(parDate);
  const cats = [...new Set(liste.map(t => t.categorie).filter(Boolean))].sort((a, b) => parseInt(a.slice(1)) - parseInt(b.slice(1)));
  const region = regionDe(dep);
  const titre = `Tournois de padel ${dansDep(dep)} (${dep}) : P25, P100, P250…`;
  const description = `${liste.length} tournoi${liste.length > 1 ? "s" : ""} de padel à venir ${dansDep(dep)} : dates, clubs, catégories (P25 à P1000), points et inscriptions sur Ten'Up. Mis à jour chaque semaine.`;
  const h1 = `${filHtml([["Accueil", "index.html"], ["Tournois", "tournois.html"], [nomDep(dep), chemin]], pre)}
<header class="gen-tete"><p class="eyebrow">Tournois · ${echapper(region ? region.nom : "Outre-mer")}</p><h1>Tournois de padel ${echapper(dansDep(dep))}</h1>
<p class="gen-intro">${liste.length} tournoi${liste.length > 1 ? "s" : ""} à venir, mis à jour chaque semaine depuis Ten'Up. Clique sur un tournoi pour voir ce qu'il rapporte, les épreuves et comment t'inscrire.</p></header>`;
  const corps = `<div class="gen-dep">${carteDepartement(dep, liste)}<div>${filtresHtml(cats)}</div></div>
<ul class="gen-liste" id="gl-liste">${liste.map(t => carteTournoiHtml(t, pre)).join("\n")}</ul>
<p class="acc-msg" id="gl-aucun" hidden>Aucun tournoi ne correspond à ces filtres.</p>
${region ? `<section class="gen-bloc"><h2>Par catégorie ${echapper(region.prep)} ${echapper(region.nom)}</h2><ul class="gen-liens gen-liens-ligne">${CATEGORIES_REGION.map(c => `<li><a href="${pre}tournois/${region.slug}/${c.toLowerCase()}.html">${c}</a></li>`).join("")}</ul>
<h2>Départements voisins ${echapper(region.prep)} ${echapper(region.nom)}</h2><ul class="gen-liens gen-liens-ligne">${region.deps.filter(d => d !== dep && depsPublies.includes(d)).map(d => `<li><a href="${pre}tournois/${d}.html">${echapper(nomDep(d))} (${d})</a></li>`).join("")}</ul></section>` : ""}`;
  ecrire(chemin, page({ chemin, titre, description, h1, corps, jsonLd: [fil([["Accueil", ""], ["Tournois", "tournois.html"], [nomDep(dep), chemin]])], scripts: ["assets/js/liste-tournois.js"] }));
}

/* ---------- Pages région × catégorie (régions entièrement publiées) ---------- */
for (const region of REGIONS.filter(r => r.deps.every(d => publies.includes(d)))) {
  for (const cat of CATEGORIES_REGION) {
    const chemin = `tournois/${region.slug}/${cat.toLowerCase()}.html`, pre = "../../";
    const liste = tous.map(a => a.t).filter(t => region.deps.includes(t.dep) && t.categorie === cat && aVenir(t)).sort(parDate);
    const titre = `Tournois de padel ${cat} ${region.prep} ${region.nom} : dates et inscriptions`;
    const description = `${liste.length} tournoi${liste.length > 1 ? "s" : ""} de padel ${cat} à venir ${region.prep} ${region.nom} : dates, clubs, points selon le nombre de paires et inscription sur Ten'Up.`;
    const h1 = `${filHtml([["Accueil", "index.html"], ["Tournois", "tournois.html"], [region.nom + " · " + cat, chemin]], pre)}
<header class="gen-tete"><p class="eyebrow">Tournois · ${echapper(region.nom)}</p><h1>Tournois de padel ${cat} ${echapper(region.prep)} ${echapper(region.nom)}</h1>
<p class="gen-intro">${liste.length ? `${liste.length} tournoi${liste.length > 1 ? "s" : ""} ${cat} à venir dans les ${region.deps.length} départements de la région.` : `Aucun tournoi ${cat} annoncé pour le moment dans la région.`} Un ${cat} gagné rapporte ${B.BAREME[cat] ? (Array.isArray(B.BAREME[cat]) ? (Array.isArray(B.BAREME[cat][0]) ? B.BAREME[cat][0][0] : B.BAREME[cat][0]) : B.BAREME[cat].messieurs[0]) : "?"} points.</p></header>`;
    const corps = `<ul class="gen-liste" id="gl-liste">${liste.map(t => carteTournoiHtml(t, pre)).join("\n")}</ul>
<section class="gen-bloc"><h2>Combien de points rapporte un ${cat} ?</h2>${tableBareme(cat, null)}</section>
<section class="gen-bloc"><h2>Par département</h2><ul class="gen-liens gen-liens-ligne">${region.deps.filter(d => depsPublies.includes(d)).map(d => `<li><a href="${pre}tournois/${d}.html">${echapper(nomDep(d))} (${d})</a></li>`).join("")}</ul>
<h2>Autres catégories</h2><ul class="gen-liens gen-liens-ligne">${CATEGORIES_REGION.filter(c => c !== cat).map(c => `<li><a href="${c.toLowerCase()}.html">${c}</a></li>`).join("")}</ul></section>`;
    ecrire(chemin, page({ chemin, titre, description, h1, corps, jsonLd: [fil([["Accueil", ""], ["Tournois", "tournois.html"], [region.nom + " " + cat, chemin]])], noindex: !liste.length }), { indexer: liste.length > 0 });
  }
}

/* ---------- Prochains tournois par département (accueil « Cette semaine près de chez toi ») ----------
   Pour TOUS les départements (pas seulement ceux publiés) : le bloc de l'accueil marche partout,
   avec un lien vers la fiche quand elle existe. Les tournois passés sont filtrés côté navigateur. */
if (!partiel) {
  const parDep = {};
  donnees.tournois.filter(valide).forEach(t => { (parDep[t.dep] = parDep[t.dep] || []).push(t); });
  const dossierProchains = path.join(RACINE, "assets/data/prochains");
  fs.mkdirSync(dossierProchains, { recursive: true });
  const attendus = new Set();
  for (const dep of Object.keys(parDep).sort()) {
    const prochains = parDep[dep].filter(aVenir).sort(parDate).slice(0, 12).map(t => ({
      id: String(t.id), nom: t.nom, categorie: t.categorie || null, ville: casse(t.ville), date_debut: t.date_debut, date_fin: t.date_fin || t.date_debut,
      ...(typeof t.lat === "number" ? { lat: t.lat, lng: t.lng } : {}), page: publies.includes(dep),
    }));
    const f = path.join(dossierProchains, dep + ".json"), contenu = JSON.stringify({ dep, nom: nomDep(dep), tournois: prochains }) + "\n";
    attendus.add(dep + ".json");
    if (!fs.existsSync(f) || fs.readFileSync(f, "utf8") !== contenu) fs.writeFileSync(f, contenu);
  }
  fs.readdirSync(dossierProchains).filter(f => !attendus.has(f)).forEach(f => fs.unlinkSync(path.join(dossierProchains, f)));
}

/* ---------- Pages devenues inutiles (tournois supprimés de l'archive, hors périmètre) ---------- */
let nbSupprimees = 0;
if (partiel) {
  fs.writeFileSync(EMPREINTES, enLignes(empreintes));
  console.log(`Mode partiel (${publies.join(", ")}) : ${nbEcrites} pages écrites, ${nbInchangees} inchangées. Sitemap et liste des départements non modifiés.`);
  process.exit(0);
}
for (const dossier of ["tournoi", "tournois"]) {
  const base = path.join(RACINE, dossier);
  if (!fs.existsSync(base)) continue;
  const parcourir = d => fs.readdirSync(d, { withFileTypes: true }).forEach(e => {
    const f = path.join(d, e.name);
    if (e.isDirectory()) { parcourir(f); if (!fs.readdirSync(f).length) fs.rmdirSync(f); return; }
    const rel = path.relative(RACINE, f).split(path.sep).join("/");
    if (rel.endsWith(".html") && !ecrites.has(rel)) { fs.unlinkSync(f); delete empreintes[rel]; nbSupprimees++; }
  });
  parcourir(base);
}

/* ---------- Départements publiés (tournois.html, accueil) ---------- */
// Centre approximatif de chaque département (moyenne des lieux de tournoi) : distance « depuis chez toi »
// quand seul le département est connu
const sommes = {};
donnees.tournois.filter(t => typeof t.lat === "number" && typeof t.lng === "number" && /^[0-9AB]{2,3}$/.test(t.dep || "")).forEach(t => {
  const s = sommes[t.dep] = sommes[t.dep] || [0, 0, 0]; s[0] += t.lat; s[1] += t.lng; s[2]++;
});
const centres = Object.fromEntries(Object.keys(sommes).sort().map(d => [d, [+(sommes[d][0] / sommes[d][2]).toFixed(3), +(sommes[d][1] / sommes[d][2]).toFixed(3)]]));
const nomsDeps = Object.fromEntries([...DEPARTEMENTS.entries()]);
const pagesJs = `/* Généré par scripts/generer-pages.js : départements qui ont leurs pages tournoi/<id>.html et tournois/<dep>.html,\n   noms et centres approximatifs des départements (moyenne des lieux de tournoi). */\nwindow.PA_PAGES_TOURNOIS={departements:${JSON.stringify(depsPublies)},noms:${JSON.stringify(nomsDeps)},centres:${JSON.stringify(centres)}};\n`;
fs.writeFileSync(path.join(RACINE, "assets/data/pages-tournois.js"), pagesJs);

/* ---------- Sitemap ---------- */
const sitemapActuel = fs.existsSync(path.join(RACINE, "sitemap.xml")) ? fs.readFileSync(path.join(RACINE, "sitemap.xml"), "utf8") : "";
// Pages fixes : on garde les entrées existantes qui ne sont pas générées
const fixes = [...sitemapActuel.matchAll(/<url>[\s\S]*?<\/url>/g)].map(m => m[0]).filter(u => !/<loc>https:\/\/apprendre-padel\.fr\/(tournoi|tournois)\//.test(u));
const generees = [...ecrites].filter(c => empreintes[c] && empreintes[c].indexer).sort().map(c =>
  `  <url>\n    <loc>${SITE}${c}</loc>\n    <lastmod>${empreintes[c].lastmod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>${c.startsWith("tournoi/") ? "0.6" : "0.7"}</priority>\n  </url>`);
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${fixes.map(u => "  " + u.trim()).join("\n")}\n${generees.join("\n")}\n</urlset>\n`;
fs.writeFileSync(path.join(RACINE, "sitemap.xml"), sitemap);

fs.mkdirSync(path.dirname(ARCHIVE), { recursive: true });
fs.writeFileSync(ARCHIVE, enLignes(archive));
fs.writeFileSync(EMPREINTES, enLignes(empreintes));
console.log(`Départements : ${depsPublies.join(", ")}`);
console.log(`Pages écrites : ${nbEcrites}, inchangées : ${nbInchangees}, supprimées : ${nbSupprimees}. Sitemap : ${fixes.length} pages fixes + ${generees.length} pages générées.`);
