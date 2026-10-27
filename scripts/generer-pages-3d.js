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

// Cartes de la page Technique (assets/js/coups.js) : chaque coup y désigne son scénario (champ p3d). La page du
// scénario devient la fiche complète du coup : elle reprend la carte (en bref, quand, où viser, erreurs).
const COUPS = new Function(lire("assets/js/coups.js").split("function cardCoup")[0] + ";return COUPS;")();
const cartesDe = id => Object.entries(COUPS).flatMap(([cle, l]) => l.filter(c => c.p3d === id).map(c => ({ ...c, cle })));
const nbsp = t => String(t).replace(/[  ]/g, " ");
// Nom court du coup pour le title : « Lob (globo) » → « Lob » ; deux cartes sur une page → nom commun
const NOMS_COMMUNS = { "smash-par-3": "Smash par 3 et rulo", "servir-monter": "Service et montée au filet" };
const nomCourt = (id, cartes) => NOMS_COMMUNS[id] || (cartes[0] ? nbsp(cartes[0].n).replace(/\s*\(.*\)$/, "").replace(/\s*\/.*$/, "") : null);
const ANCRES = { fond: "coups-fond", trans: "coups-trans", filet: "coups-filet", service: "coups-service" };
const FAMILLES = { fond: "Fond de court et défense", trans: "Transition", filet: "Au filet", service: "Service et retour" };
// Exercices de l'espace joueur (assets/js/exercices-donnees.js), cités par les coups (champ ex)
const EXERCICES = new Function(lire("assets/js/exercices-donnees.js") + ";return EXERCICES;")();
const PALIERS = ["", "débutant", "loisir", "intermédiaire", "P500 et +"];
const exercice = id => {
  const e = EXERCICES.find(x => x.id === id);
  if (!e) throw new Error("Exercice inconnu : " + id);
  return e;
};
/* FICHE DU COUP : structure commune à toutes les fiches (mission v3, phase 2)
   1 titre, 2 niveau, 3 objectif (en-tête de la page ; dans chaque fiche quand la page réunit deux coups),
   4 explication, 5 animation (le simulateur, plus haut), 6 étapes du geste, 7 erreurs fréquentes, 8 corrections,
   9 exercice pratique, 10 lien vers le simulateur (revoir, quiz), 11 contenus associés. */
function ficheUnCoup(c, s, plusieurs) {
  const exos = c.ex.map(exercice);
  return `${plusieurs ? `<h2>${html(nbsp(c.n))}</h2>
    <p class="fiche-tete"><span class="lvl" data-l="${html(c.lvl)}">${html(c.lvl)}</span> <b>Objectif :</b> ${html(nbsp(c.obj))}</p>
    ` : ""}<div class="fiche-grille">
      <div class="fiche-bloc"><h3>Explication</h3>
        <p>${html(nbsp(c.q))}</p>
        <dl class="p3d-cle"><dt>Quand le jouer</dt><dd>${html(nbsp(c.quand))}</dd><dt>Où viser</dt><dd>${html(nbsp(c.cible))}</dd></dl></div>
      <div class="fiche-bloc"><h3>Les étapes du geste</h3>
        <ol class="fiche-etapes">${c.etapes.map(([t, x]) => `<li><b>${html(t)}</b> ${html(nbsp(x))}</li>`).join("")}</ol></div>
    </div>
    <div class="fiche-bloc"><h3>Erreurs fréquentes et corrections</h3>
      <ul class="fiche-erreurs">${c.err.map((e, i) => `<li><p class="fiche-erreur"><span>Erreur</span> ${html(nbsp(e))}</p><p class="fiche-correction"><span>Correction</span> ${html(nbsp(c.corr[i]))}</p></li>`).join("")}</ul></div>
    <div class="fiche-bloc"><h3>Exercice pratique</h3>
      <div class="fiche-exos">${exos.map(e => `<article class="fiche-exo">
        <p class="fiche-exo-titre">${html(nbsp(e.titre))}</p>
        <p class="fiche-exo-meta">${html(e.duree)} · ${html(e.joueurs)} · niveau ${html(e.niveaux.map(n => PALIERS[n]).join(" à "))}</p>
        <p>${html(nbsp(e.consigne))}</p>
        <p class="fiche-exo-reussite"><b>Réussi si :</b> ${html(nbsp(e.reussite))}</p></article>`).join("")}${!plusieurs && s.exercice ? `
        <article class="fiche-exo"><p class="fiche-exo-titre">L'exercice de la scène</p><p>${html(s.exercice)}</p></article>` : ""}</div></div>`;
}
function ficheCoup(cartes, s, id) {
  const plusieurs = cartes.length > 1;
  // Contenus associés : les autres coups de la même famille (avec leur fiche), la famille, et la page liée au scénario
  const famille = cartes[0].cle;
  const voisins = COUPS[famille].filter(c => c.p3d && c.p3d !== id).filter((c, i, l) => l.findIndex(x => x.p3d === c.p3d) === i).slice(0, 4);
  const lienScene = s.lien && !s.lien.startsWith("technique.html") ? `<li><a href="${html(s.lien)}">${html({ "tutos.html": "Les tutos tactiques", "regles.html": "Les règles", "tactique.html": "Le placement en double" }[s.lien.split("#")[0]] || "En savoir plus")}</a></li>` : "";
  return `<section id="fiche-coup" class="alt">
  <div class="wrap fiche">
    ${plusieurs ? "" : "<h2>La fiche du coup</h2>\n    "}${cartes.map(c => ficheUnCoup(c, s, plusieurs)).join("\n    ")}
    <div class="fiche-grille">
      <div class="fiche-bloc"><h3>Revoir en 3D</h3>
        <ul class="fiche-liens"><li><a href="#simulateur">Revoir la scène pas à pas</a></li><li><a href="#mode-quiz">Te tester en mode quiz</a></li><li><a href="#deroule">Lire le déroulé complet</a></li><li><a href="espace.html">Suivre ta progression dans ton espace joueur</a></li></ul></div>
      <div class="fiche-bloc"><h3>Contenus associés</h3>
        <ul class="fiche-liens">${voisins.map(c => `<li><a href="${page(c.p3d)}">${html(nbsp(c.n))}</a></li>`).join("")}<li><a href="technique.html#${ANCRES[famille]}">${html(FAMILLES[famille])} : tous les coups</a></li>${lienScene}</ul></div>
    </div>
  </div>
</section>
`;
}
// Descriptions rédigées pour chaque page (160 caractères au plus) ; à défaut, résumé de la carte ou du scénario
const DESCRIPTIONS = {
  "coup-droit-fond": "Le coup droit de fond au padel : geste compact après le rebond, balle basse dans les pieds du volleyeur ou long et croisé. Expliqué pas à pas en 3D.",
  "revers-fond": "Le revers de fond au padel : geste court, revers coupé pour garder la balle basse, croisé bas ou lob. Expliqué pas à pas en 3D, avec quiz.",
  "monter-apres-lob": "Le lob au padel : balle haute et profonde au-dessus des volleyeurs, puis montée au filet à deux. Quand le jouer, où viser, en 3D pas à pas.",
  "sortie-vitre-fond": "Sortie de vitre de fond au padel : laisser taper la vitre, pivoter, frapper la balle qui redescend, puis lober. Expliqué pas à pas en 3D.",
  "sortie-vitre-laterale": "Sortie de vitre latérale au padel : se décaler vers le centre, attendre que la balle revienne, la jouer basse au centre. Expliqué en 3D.",
  "defendre-double-vitre": "Défendre la double vitre au padel : laisser travailler les deux vitres, jouer lent et bas au centre, attendre la balle à accélérer. En 3D.",
  "contre-pied": "Le contre-pied au padel : quand les volleyeurs ferment les angles, viser le corps ou les pieds pour gêner la volée. Expliqué pas à pas en 3D.",
  "chiquita": "La chiquita au padel : balle lente et basse dans les pieds des volleyeurs pour reprendre le filet à deux. Quand la jouer, où viser, en 3D.",
  "volee-basse-transition": "La volée basse de transition au padel : remettre long au centre la balle qui arrive dans les pieds pendant la montée. Expliquée en 3D.",
  "bajada": "La bajada au padel : frapper en descendant le lob trop long qui ressort haut de la vitre, puis reprendre le filet. Expliquée pas à pas en 3D.",
  "amorti": "L'amorti (dejada) au padel : une volée qui tombe juste derrière le filet quand les adversaires sont au fond. Quand le jouer, en 3D.",
  "volee-coup-droit": "La volée de coup droit au padel : un blocage, raquette ouverte, geste court, balle placée profond ou dans le coin. Expliquée pas à pas en 3D.",
  "volee-revers": "La volée de revers au padel : coude devant, raquette coupée, geste compact, croisé bas ou au centre. Expliquée pas à pas en 3D, avec quiz.",
  "duel-filet": "Le duel au filet au padel : remettre basse la balle basse, attaquer celle qui monte, viser les pieds ou le centre. En 3D, pas à pas.",
  "bandeja-garder-filet": "La bandeja au padel : sur un lob mi-profond, frappe coupée vers la vitre du fond pour garder le filet. Technique et placement en 3D.",
  "vibora": "La víbora au padel : frappe sur le côté de la balle, plus rapide que la bandeja, vers le coin vitre-grille. Quand la jouer, en 3D.",
  "smash-lob-court": "Le smash plat au padel : sur un lob court, frapper fort au centre puis remonter au filet. Quand smasher, quand jouer la bandeja, en 3D.",
  "smash-par-3": "Le smash par 3 et le rulo au padel : smash croisé avec angle vers la vitre latérale pour sortir la balle. Placement et cible en 3D.",
  "gancho": "Le gancho au padel : smash crochet joué très haut sur un lob trop profond pour la bandeja, lent et profond pour garder le filet. En 3D.",
  "servir-monter": "Le service au padel et la montée au filet : service à la cuillère sous la taille, montée immédiate, première volée profonde. En 3D.",
  "retour-lob": "Le retour de service au padel : lob profond par-dessus le joueur au filet ou balle basse dans les pieds du serveur. Expliqué pas à pas en 3D.",
};
// Description : texte rédigé, sinon « en bref » de la carte (sinon première idée clé du scénario), 160 caractères au plus
function descriptionCoup(s, cartes) {
  if (DESCRIPTIONS[s.id]) return DESCRIPTIONS[s.id];
  const fin = " Explication pas à pas en 3D.";
  const q = cartes[0] && nbsp(cartes[0].q);
  if (!q) return description(s);
  // Phrases entières de la carte tant qu'elles tiennent, sinon coupure au mot
  let d = "";
  for (const phrase of q.match(/[^.!?]+[.!?]+/g) || [q]) { if ((d + phrase).trim().length + fin.length > 160) break; d += phrase; }
  d = d.trim();
  if (!d) { d = q.slice(0, 159 - fin.length); d = d.slice(0, d.lastIndexOf(" ")).replace(/[ ,:;]+$/, "") + "…"; }
  return d + fin;
}

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

// En-tête d'une fiche : niveau, et objectif quand la page ne traite qu'un coup (sinon, objectif dans chaque fiche)
const tete = cartes => !cartes.length ? "" : `<p class="fiche-tete"><span class="lvl" data-l="${html(cartes[0].lvl)}">Niveau du coup : ${html(cartes[0].lvl)}</span>${cartes.length === 1 ? ` <b>Objectif :</b> ${html(nbsp(cartes[0].obj))}` : ""}</p>`;

const ecrites = [];
for (const x of SCENARIOS) {
  const s = fiches[x.id], f = page(x.id), url = SITE + f;
  const cartes = cartesDe(x.id), nom = nomCourt(x.id, cartes);
  // Title : le coup (sujet de la recherche) ; scénario sans carte (situation de jeu) : son titre
  const titre = nom ? `${nom} au padel : technique et conseils en 3D` : `${s.titre} au padel, en 3D`;
  const desc = descriptionCoup(s, cartes);
  let t = modele;
  t = remplacer(t, /<title>[^<]*<\/title>/, `<title>${html(titre)} | Apprendre Padel</title>`);
  t = remplacer(t, /<meta name="description" content="[^"]*">/, `<meta name="description" content="${html(desc)}">`);
  t = remplacer(t, /<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${url}">`);
  t = remplacer(t, /<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${url}">`);
  t = remplacer(t, /<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${html(titre)}">`);
  t = remplacer(t, /<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${html(desc)}">`);
  const ariane = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
    { "@type": "ListItem", position: 1, name: "Accueil", item: SITE },
    cartes.length ? { "@type": "ListItem", position: 2, name: "Les coups du padel", item: SITE + "technique.html" }
      : { "@type": "ListItem", position: 2, name: "Simulateur 3D", item: SITE + "simulateur-3d.html" },
    { "@type": "ListItem", position: 3, name: nom || s.titre, item: url }] };
  t = remplacer(t, /<script type="application\/ld\+json">[^<]*<\/script>/, `<script type="application/ld+json">${JSON.stringify(ariane).replace(/</g, "\\u003c")}</script>`);
  // En-tête : titre du coup, situation ; le simulateur s'ouvre sur ce scénario
  t = remplacer(t, /<section id="simulateur" class="alt">/, `<section id="simulateur" class="alt" data-scenario="${x.id}">`);
  t = remplacer(t, /<div><p class="eyebrow">[^<]*<\/p><h1>[^<]*<\/h1><\/div>\n      <p>[^<]*<\/p>/,
    `<div><p class="eyebrow">${cartes.length ? "Technique" : "Tactique 3D"} · ${html(x.groupe)}</p><h1>${html(s.titre)}</h1>${tete(cartes)}</div>\n      <p>${html(s.situation)} Regarde la scène sous tous les angles, pas à pas, ou passe en mode quiz.</p>`);
  if (cartes.length) t = remplacer(t, /<section id="tous-les-coups">/, ficheCoup(cartes, s, x.id) + `<section id="tous-les-coups">`);
  // La 3D démarre au clic : image de la scène en attendant (assets/3d/affiches, faite par generer-affiches-3d.cjs)
  if (!fs.existsSync(path.join(RACINE, `assets/3d/affiches/${x.id}.jpg`))) throw new Error(`Image manquante : assets/3d/affiches/${x.id}.jpg (lancer node scripts/generer-affiches-3d.cjs)`);
  t = remplacer(t, /<p class="p3d-chargement" id="p3d-chargement">[^<]*<\/p>/, `<p class="p3d-chargement" id="p3d-chargement" hidden>Chargement de la scène…</p>
      <button type="button" class="p3d-affiche" id="p3d-affiche"><img src="assets/3d/affiches/${x.id}.jpg" alt="${html("Scène 3D : " + s.titre)}" width="960" height="540" decoding="async"><span class="btn primary">Lancer la scène 3D</span></button>`);
  // Textes du scénario écrits dans la page (le script les remplace par les mêmes)
  const li = l => l.map(e => `<li>${html(e)}</li>`).join("");
  t = remplacer(t, /<h2 id="p3d-etape-titre">[^<]*<\/h2>/, `<h2 id="p3d-etape-titre">${html(s.etapes[0].titre)}</h2>`);
  t = remplacer(t, /<p class="p3d-etape-texte" id="p3d-etape-texte" aria-live="polite"><\/p>/, `<p class="p3d-etape-texte" id="p3d-etape-texte" aria-live="polite">${html(s.etapes[0].texte)}</p>`);
  t = remplacer(t, /<p class="eyebrow" id="p3d-niveau">[^<]*<\/p><h2 id="p3d-titre-scenario">[^<]*<\/h2>/, `<p class="eyebrow" id="p3d-niveau">Niveau de la scène : ${html(s.niveau)}</p><h2 id="p3d-titre-scenario">Ce qu'il faut retenir</h2>`);
  t = remplacer(t, /<p id="p3d-situation"><\/p>/, `<p id="p3d-situation">${html(s.conclusion)}</p>`);
  t = remplacer(t, /<ul id="p3d-explication"><\/ul>/, `<ul id="p3d-explication">${li(s.explication)}</ul>`);
  t = remplacer(t, /<ul id="p3d-erreurs"><\/ul>/, `<ul id="p3d-erreurs">${li(s.erreurs)}</ul>`);
  t = remplacer(t, /<p id="p3d-conclusion"><\/p>/, `<p id="p3d-conclusion">${html(s.conclusion)}</p>`);
  if (s.conseil) t = remplacer(t, /<div id="p3d-conseil-bloc" hidden><h3>Le conseil<\/h3><p id="p3d-conseil"><\/p><\/div>/, `<div id="p3d-conseil-bloc"><h3>Le conseil</h3><p id="p3d-conseil">${html(s.conseil)}</p></div>`);
  t = remplacer(t, /<p id="p3d-exercice"><\/p>/, `<p id="p3d-exercice">${html(s.exercice)}</p>`);
  if (s.lien) {
    const libelle = { "technique.html": "Tous les coups du padel", "tutos.html": "Voir les tutos", "regles.html": "Voir les règles", "tactique.html": "Voir le placement" }[s.lien.split("#")[0]] || "En savoir plus";
    t = remplacer(t, /<a id="p3d-lien" href="[^"]*">[^<]*<\/a>/, `<a id="p3d-lien" href="${html(s.lien)}">${libelle}</a>`);
  }
  // Déroulé complet (texte lisible par tous, y compris sans 3D)
  const deroule = `<section id="deroule"${cartes.length ? "" : ' class="alt"'}>
  <div class="wrap">
    <h2>Le déroulé, étape par étape</h2>
    <ol class="p3d-deroule">${s.etapes.map(e => `<li><b>${html(e.titre)}.</b> ${html(e.texte)}</li>`).join("")}</ol>
  </div>
</section>
`;
  // Ordre : simulateur, à retenir, fiche du coup, déroulé, tous les coups, limites
  t = remplacer(t, /<section id="tous-les-coups">/, deroule + `<section id="tous-les-coups">`);
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
