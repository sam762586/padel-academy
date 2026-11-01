/* GÉNÉRATION DE LA PAGE « ACTUS PRO » (actus-pro.html) à partir de assets/data/pro.json (produit par scripts/scrape-pro.js).
   Réécrit le contenu entre <!-- pro:debut --> et <!-- pro:fin --> : prochain tournoi ou tournoi en cours, derniers résultats
   (du plus récent au plus ancien), calendrier, source et date de mise à jour. Contenu écrit dans le HTML : lisible sans
   JavaScript et par les moteurs de recherche.
   - Toutes les données sont échappées (noms, villes, scores, adresses).
   - Rien n'est inventé : un tournoi terminé sans résultats affiche « Résultats non disponibles » et le lien vers la source.
   - Idempotent : la sortie ne dépend que de pro.json (aucune date du jour) ; page identique = fichier non réécrit.
   - pro.json invalide : message d'erreur, sortie en code 1, page inchangée.
   - Sitemap : la date « lastmod » de actus-pro.html suit la date de mise à jour des données (heure de Paris), si la page change.
   Usage : node scripts/generer-pro.js [--donnees chemin/pro.json] [--page chemin/actus-pro.html] [--sitemap chemin|aucun] */
"use strict";
const fs = require("fs");
const path = require("path");
const RACINE = path.join(__dirname, "..");

// Options de la ligne de commande (les tests passent leurs propres fichiers)
function option(nom, defaut) {
  const i = process.argv.indexOf("--" + nom);
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : defaut;
}

const DEBUT = "<!-- pro:debut -->";
const FIN = "<!-- pro:fin -->";
const STATUTS = ["termine", "en_cours", "a_venir"];
const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
// Pays : l'API les donne en anglais ; traduction pour l'affichage, sinon le nom reçu tel quel
const PAYS = {
  "Argentina": "Argentine", "Australia": "Australie", "Austria": "Autriche", "Bahrain": "Bahreïn", "Belgium": "Belgique",
  "Brazil": "Brésil", "Chile": "Chili", "China": "Chine", "Denmark": "Danemark", "Egypt": "Égypte", "Finland": "Finlande",
  "France": "France", "Germany": "Allemagne", "Great Britain": "Royaume-Uni", "Greece": "Grèce", "Italy": "Italie",
  "Japan": "Japon", "Kuwait": "Koweït", "Mexico": "Mexique", "Morocco": "Maroc", "Netherlands": "Pays-Bas",
  "Paraguay": "Paraguay", "Portugal": "Portugal", "Puerto Rico": "Porto Rico", "Qatar": "Qatar", "Saudi Arabia": "Arabie saoudite",
  "South Africa": "Afrique du Sud", "Spain": "Espagne", "Sweden": "Suède", "Switzerland": "Suisse", "Tunisia": "Tunisie",
  "United Arab Emirates": "Émirats arabes unis", "United Kingdom": "Royaume-Uni", "United States": "États-Unis", "Uruguay": "Uruguay",
  "Venezuela": "Venezuela",
  "Turkey": "Turquie", "Türkiye": "Turquie", "Poland": "Pologne", "Ireland": "Irlande", "Canada": "Canada", "Andorra": "Andorre",
  "Dominican Republic": "République dominicaine", "Colombia": "Colombie", "Peru": "Pérou", "Ecuador": "Équateur", "Bolivia": "Bolivie",
  "India": "Inde", "Thailand": "Thaïlande", "Singapore": "Singapour", "Indonesia": "Indonésie", "Hungary": "Hongrie", "Croatia": "Croatie",
  "Czech Republic": "Tchéquie", "Czechia": "Tchéquie", "Romania": "Roumanie", "Norway": "Norvège", "Israel": "Israël", "Jordan": "Jordanie",
  "Serbia": "Serbie", "New Zealand": "Nouvelle-Zélande", "Oman": "Oman", "Lebanon": "Liban", "Cyprus": "Chypre", "Malta": "Malte",
  "Luxembourg": "Luxembourg", "Monaco": "Monaco", "Estonia": "Estonie", "Latvia": "Lettonie", "Lithuania": "Lituanie", "Slovenia": "Slovénie",
  "Slovakia": "Slovaquie", "Bulgaria": "Bulgarie", "Ukraine": "Ukraine", "Algeria": "Algérie", "Senegal": "Sénégal", "Ivory Coast": "Côte d'Ivoire",
  "Kenya": "Kenya", "Costa Rica": "Costa Rica", "Panama": "Panama", "Guatemala": "Guatemala", "El Salvador": "Salvador", "Cuba": "Cuba",
  "South Korea": "Corée du Sud", "Philippines": "Philippines", "Malaysia": "Malaisie", "Vietnam": "Viêt Nam", "Hong Kong": "Hong Kong",
  "Kazakhstan": "Kazakhstan", "Scotland": "Écosse", "England": "Angleterre", "Wales": "Pays de Galles", "Iceland": "Islande",
};
// Villes : nom usuel en français (clé : nom de l'API en capitales, sans accents ni doubles espaces), sinon le nom reçu en casse de titre.
// Les noms de tournois, eux, restent ceux de l'API.
const VILLES = {
  "BRUSSELS": "Bruxelles", "BRUXELLES": "Bruxelles", "LONDON": "Londres", "ROMA": "Rome", "MILANO": "Milan", "VALENCIA": "Valence",
  "RIYADH": "Riyad", "BARCELONA": "Barcelone", "DUSSELDORF": "Düsseldorf", "DUESSELDORF": "Düsseldorf", "MALAGA": "Malaga",
  "ASUNCION": "Asunción", "SEVILLA": "Séville", "SEVILLE": "Séville", "GENOVA": "Gênes", "NAPOLI": "Naples", "VENEZIA": "Venise",
  "TORINO": "Turin", "FIRENZE": "Florence", "KUWAIT": "Koweït", "KUWAIT CITY": "Koweït", "DOHA": "Doha", "GIZA": "Gizeh", "CAIRO": "Le Caire",
  "CANCUN": "Cancún", "GIJON": "Gijón", "ZARAGOZA": "Saragosse", "A CORUNA": "La Corogne", "SAN SEBASTIAN": "Saint-Sébastien",
  "MUNCHEN": "Munich", "MUNICH": "Munich", "KOLN": "Cologne", "COLOGNE": "Cologne", "ANTWERP": "Anvers", "ANTWERPEN": "Anvers",
  "GENEVA": "Genève", "GENEVE": "Genève", "LISBOA": "Lisbonne", "LISBON": "Lisbonne", "ATHENS": "Athènes", "COPENHAGEN": "Copenhague",
  "WARSAW": "Varsovie", "VIENNA": "Vienne", "WIEN": "Vienne", "PRAHA": "Prague", "MEXICO CITY": "Mexico", "CIUDAD DE MEXICO": "Mexico",
  "ABU DHABI": "Abou Dabi", "DUBAI": "Dubaï", "JEDDAH": "Djeddah", "MUSCAT": "Mascate", "THE HAGUE": "La Haye", "EDINBURGH": "Édimbourg",
  "HAMBURG": "Hambourg", "FRANKFURT": "Francfort", "BASEL": "Bâle", "SAO PAULO": "São Paulo",
};
// Petits mots laissés en minuscules dans un nom (sauf en tête), y compris après une apostrophe ou un trait d'union
const MINUSCULES = new Set(["de", "del", "la", "las", "el", "los", "y", "di", "da", "do", "du", "des", "et", "of", "the",
  "d", "l", "le", "les", "sur", "en", "lès", "aux", "au"]);
// Chiffres romains gardés en capitales (« Open II », « IV ») : I à XXXIX
const ROMAIN = /^(?=[IVX])X{0,3}(IX|IV|V?I{0,3})$/i;
// Espace insécable (avant « : », autour du tiret des dates, dans « 4 h 34 »)
const NBSP = " ";

/* ---------- Mise en forme ---------- */
const echapper = t => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const espaces = t => String(t).replace(/\s+/g, " ").trim();
// « CUPRA ROTTERDAM  PREMIER PADEL P2 » -> « Cupra Rotterdam Premier Padel P2 » ; les codes de catégorie (P1, P2) restent en capitales
// Majuscule en début de mot seulement ; après une apostrophe ou un trait d'union, les petits mots restent en minuscules
// (« Tournoi d'Espagne », « Saint-Jean-de-Luz ») ; codes de catégorie (P1) et chiffres romains (II, IV) en capitales.
function casseTitre(t) {
  let tete = true;
  return espaces(t).split(" ").map(mot => mot.split(/([-'’])/).map(part => {
    if (part === "" || /^[-'’]$/.test(part)) return part;
    const enTete = tete; tete = false;
    if (/^P\d+$/i.test(part) || ROMAIN.test(part)) return part.toUpperCase();
    const bas = part.toLowerCase();
    if (!enTete && MINUSCULES.has(bas)) return bas;
    return bas.charAt(0).toUpperCase() + bas.slice(1);
  }).join("")).join(" ");
}
const pays = p => PAYS[espaces(p)] || espaces(p);
const cleVille = v => espaces(v).normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();
const ville = v => VILLES[cleVille(v)] || casseTitre(v);
// « Rome, Italie » ; si la ville porte le nom du pays (« Koweït, Koweït »), le pays seul
function lieu(t) {
  const v = t.ville && espaces(t.ville) ? ville(t.ville) : "", p = t.pays && espaces(t.pays) ? pays(t.pays) : "";
  return v && p && v.toLowerCase() === p.toLowerCase() ? p : [v, p].filter(Boolean).join(", ");
}
const partiesDate = d => { const [a, m, j] = d.split("-").map(Number); return { a, m, j }; };
// « 7 – 14 février 2026 », « 28 juin – 5 juillet 2026 », « 28 décembre 2026 – 3 janvier 2027 » (espaces insécables autour du tiret)
function periode(debut, fin) {
  const d = partiesDate(debut), f = partiesDate(fin);
  const jour = j => (j === 1 ? "1er" : String(j));
  const tiret = NBSP + "–" + NBSP;
  if (debut === fin) return `${jour(d.j)} ${MOIS[d.m - 1]} ${d.a}`;
  if (d.a !== f.a) return `${jour(d.j)} ${MOIS[d.m - 1]} ${d.a}${tiret}${jour(f.j)} ${MOIS[f.m - 1]} ${f.a}`;
  if (d.m !== f.m) return `${jour(d.j)} ${MOIS[d.m - 1]}${tiret}${jour(f.j)} ${MOIS[f.m - 1]} ${f.a}`;
  return `${jour(d.j)}${tiret}${jour(f.j)} ${MOIS[f.m - 1]} ${f.a}`;
}
// Date de mise à jour à l'heure de Paris : « 1er novembre 2026 à 4 h 34 » et « 2026-11-01 » (sitemap)
function heureParis(iso) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "2-digit", hourCycle: "h23" })
    .formatToParts(new Date(iso)).map(x => [x.type, x.value]));
  const j = Number(p.day), m = Number(p.month);
  return {
    texte: `${j === 1 ? "1er" : j} ${MOIS[m - 1]} ${p.year} à ${Number(p.hour)}${NBSP}h${NBSP}${p.minute}`,
    jour: `${p.year}-${String(m).padStart(2, "0")}-${String(j).padStart(2, "0")}`,
  };
}
const paire = noms => noms.map(espaces).join(" / ");
const lienSource = (url, texte) => `<a href="${echapper(url)}" target="_blank" rel="noopener">${texte}<span class="sr-only"> (nouvel onglet)</span></a>`;

/* ---------- Validation (le moindre écart : on n'écrit rien) ---------- */
function valider(d) {
  const err = m => { throw new Error("pro.json invalide : " + m); };
  const texte = v => typeof v === "string" && v.trim() !== "";
  const date = v => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(Date.parse(v));
  const https = v => typeof v === "string" && /^https:\/\/[^\s"<>]+$/.test(v);
  if (!d || typeof d !== "object") err("objet attendu");
  if (!texte(d.maj) || isNaN(Date.parse(d.maj))) err("« maj » absente ou illisible");
  if (!https(d.source)) err("« source » doit être une adresse https");
  if (!Array.isArray(d.tournois) || !d.tournois.length) err("« tournois » doit être une liste non vide");
  d.tournois.forEach((t, i) => {
    const ou = `tournoi n°${NBSP}${i + 1}`;
    if (!t || typeof t !== "object") err(ou + " : objet attendu");
    for (const c of ["id", "nom", "categorie"]) if (!texte(String(t[c] ?? ""))) err(`${ou} : « ${c} » manquant`);
    for (const c of ["ville", "pays"]) if (t[c] != null && typeof t[c] !== "string") err(`${ou} : « ${c} » doit être un texte`);
    if (!date(t.date_debut) || !date(t.date_fin)) err(ou + " : dates au format AAAA-MM-JJ attendues");
    if (!STATUTS.includes(t.statut)) err(`${ou} : statut « ${t.statut} » inconnu`);
    if (!https(t.url_source)) err(ou + " : « url_source » doit être une adresse https");
    if (t.resultats === null || t.resultats === undefined) return;
    if (typeof t.resultats !== "object") err(ou + " : « resultats » doit être un objet ou null");
    for (const g of ["hommes", "femmes"]) {
      const r = t.resultats[g];
      if (r === null || r === undefined) continue;
      const noms = l => Array.isArray(l) && l.length > 0 && l.every(texte);
      if (!noms(r.vainqueurs) || !noms(r.finalistes)) err(`${ou} (${g}) : vainqueurs et finalistes attendus`);
      if (r.score != null && typeof r.score !== "string") err(`${ou} (${g}) : score attendu en texte`);
    }
  });
  return d;
}

/* ---------- Rendu ---------- */
const parDate = (a, b) => a.date_debut.localeCompare(b.date_debut) || a.date_fin.localeCompare(b.date_fin) || String(a.id).localeCompare(String(b.id));

function finale(nom, r) {
  if (!r) return `<div class="pro-finale"><h4>${nom}</h4><p class="pro-absent">Résultats non disponibles.</p></div>`;
  const score = r.score && r.score.trim() ? espaces(r.score) : "";
  return `<div class="pro-finale"><h4>${nom}</h4><dl>`
    + `<div><dt>Vainqueurs</dt><dd><b>${echapper(paire(r.vainqueurs))}</b></dd></div>`
    + `<div><dt>Finalistes</dt><dd>${echapper(paire(r.finalistes))}</dd></div>`
    + (score ? `<div><dt>Finale</dt><dd class="pro-score">${echapper(score)}</dd></div>` : "")
    + `</dl></div>`;
}

function enTete(t, niveau) {
  return `<div class="top"><h${niveau}>${echapper(casseTitre(t.nom))}</h${niveau}><span class="tag tact">${echapper(espaces(t.categorie))}</span></div>`
    + `<p class="pro-lieu">${echapper(lieu(t))}<br><time datetime="${t.date_debut}">${periode(t.date_debut, t.date_fin)}</time></p>`;
}

function carteResultat(t) {
  const r = t.resultats || {};
  const corps = !r.hommes && !r.femmes
    ? `<p class="pro-absent">Résultats non disponibles.</p>`
    : `<div class="pro-finales">${finale("Hommes", r.hommes)}${finale("Femmes", r.femmes)}</div>`;
  return `<article class="card pro-tournoi">${enTete(t, 3)}${corps}`
    + `<p class="pro-lien">${lienSource(t.url_source, "Voir le tableau complet sur le site officiel")}</p></article>`;
}

function rendre(d) {
  const tournois = d.tournois.slice();
  const termines = tournois.filter(t => t.statut === "termine").sort((a, b) => -parDate(a, b));
  const enCours = tournois.filter(t => t.statut === "en_cours").sort(parDate);
  const aVenir = tournois.filter(t => t.statut === "a_venir").sort(parDate);
  // À la une : les tournois en cours, sinon le prochain ; le calendrier reprend les tournois à venir restants
  const uneEnCours = enCours.length > 0;
  const une = uneEnCours ? enCours : aVenir.slice(0, 1);
  const calendrier = uneEnCours ? aVenir : aVenir.slice(1);
  const maj = heureParis(d.maj);
  const L = [];

  L.push(`<section id="a-la-une" aria-labelledby="titre-a-la-une">`, `  <div class="wrap">`,
    `    <h2 id="titre-a-la-une">${uneEnCours ? (enCours.length > 1 ? "Tournois en cours" : "Tournoi en cours") : "Prochain tournoi"}</h2>`);
  if (une.length) {
    L.push(`    <div class="pro-grille">`);
    for (const t of une) {
      L.push(`      <article class="card pro-tournoi pro-une">${enTete(t, 3)}`
        + `<p>${uneEnCours ? `En cours${NBSP}: les résultats de la finale seront ajoutés après la dernière journée.` : "À venir."}</p>`
        + `<p class="pro-lien">${lienSource(t.url_source, uneEnCours ? "Suivre le tableau sur le site officiel" : "Voir la fiche du tournoi sur le site officiel")}</p></article>`);
    }
    L.push(`    </div>`);
  } else {
    L.push(`    <p class="pro-absent">Aucun tournoi annoncé pour le moment.</p>`);
  }
  L.push(`  </div>`, `</section>`);

  L.push(`<section id="resultats" class="alt" aria-labelledby="titre-resultats">`, `  <div class="wrap">`,
    `    <h2 id="titre-resultats">Derniers résultats</h2>`,
    `    <p class="pro-intro">Finales hommes et femmes, du tournoi le plus récent au plus ancien. Les joueurs sont cités par leur nom de famille, comme sur le tableau officiel.</p>`);
  if (termines.length) {
    L.push(`    <div class="pro-grille">`);
    for (const t of termines) L.push("      " + carteResultat(t));
    L.push(`    </div>`);
  } else {
    L.push(`    <p class="pro-absent">Aucun tournoi terminé cette saison pour le moment.</p>`);
  }
  L.push(`  </div>`, `</section>`);

  L.push(`<section id="calendrier" aria-labelledby="titre-calendrier">`, `  <div class="wrap">`,
    `    <h2 id="titre-calendrier">Calendrier des prochains tournois</h2>`);
  if (calendrier.length) {
    L.push(`    <ul class="pro-calendrier">`);
    for (const t of calendrier) {
      L.push(`      <li><time datetime="${t.date_debut}">${periode(t.date_debut, t.date_fin)}</time>`
        + ` <span class="tag tact">${echapper(espaces(t.categorie))}</span>`
        + ` <b>${echapper(casseTitre(t.nom))}</b> <span class="pro-lieu">${echapper(lieu(t))}</span></li>`);
    }
    L.push(`    </ul>`);
  } else {
    L.push(`    <p class="pro-absent">Aucun autre tournoi annoncé pour la saison.</p>`);
  }
  L.push(`    <p class="pro-source">Source${NBSP}: ${lienSource(d.source, "site officiel de Premier Padel")}. Données reprises sous forme de faits (noms, dates, scores). Apprendre Padel n'est affilié ni à Premier Padel ni à la FIP, et n'est approuvé ni par l'un ni par l'autre.</p>`,
    `    <p class="pro-source">Dernière mise à jour${NBSP}: <time datetime="${echapper(d.maj)}">${maj.texte}</time> (heure de Paris).</p>`,
    `  </div>`, `</section>`);
  return { html: L.join("\n"), jour: maj.jour };
}

/* ---------- Écriture ---------- */
function principal() {
  const fichierDonnees = path.resolve(option("donnees", path.join(RACINE, "assets", "data", "pro.json")));
  const fichierPage = path.resolve(option("page", path.join(RACINE, "actus-pro.html")));
  const optSitemap = option("sitemap", path.join(RACINE, "sitemap.xml"));
  let donnees, page;
  try {
    donnees = valider(JSON.parse(fs.readFileSync(fichierDonnees, "utf8")));
  } catch (e) {
    console.error("generer-pro : " + (e instanceof SyntaxError ? "pro.json illisible (" + e.message + ")" : e.message) + ". Page non modifiée.");
    return 1;
  }
  try { page = fs.readFileSync(fichierPage, "utf8"); } catch (e) { console.error("generer-pro : page introuvable " + fichierPage); return 1; }
  const a = page.indexOf(DEBUT), b = page.indexOf(FIN);
  if (a < 0 || b < a) { console.error("generer-pro : repères " + DEBUT + " / " + FIN + " absents de la page"); return 1; }
  const { html, jour } = rendre(donnees);
  const nouvelle = page.slice(0, a + DEBUT.length) + "\n" + html + "\n" + page.slice(b);
  if (nouvelle === page) { console.log("generer-pro : page déjà à jour."); return 0; }
  fs.writeFileSync(fichierPage, nouvelle);
  // Sitemap : lastmod de la page = jour de la mise à jour des données
  if (optSitemap !== "aucun" && fs.existsSync(optSitemap)) {
    const nom = path.basename(fichierPage).replace(/\./g, "\\.");
    const s = fs.readFileSync(optSitemap, "utf8");
    const s2 = s.replace(new RegExp(`(<loc>https://apprendre-padel\\.fr/${nom}</loc>\\s*<lastmod>)[^<]+(</lastmod>)`), `$1${jour}$2`);
    if (s2 !== s) fs.writeFileSync(optSitemap, s2);
  }
  const t = donnees.tournois;
  console.log(`generer-pro : ${path.basename(fichierPage)} écrite (${t.filter(x => x.statut === "termine").length} résultats, ${t.filter(x => x.statut === "a_venir").length} à venir).`);
  return 0;
}

if (require.main === module) process.exitCode = principal();
module.exports = { valider, rendre, casseTitre, periode, heureParis, echapper, lieu };
