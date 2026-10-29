/* GABARIT COMMUN : menu, pied de page et auteur du site (Node, aucune dépendance)
   Seule source du menu et du pied de page. Utilisé par :
     scripts/appliquer-gabarit.js   recopie le menu et le pied de page dans les pages HTML de la racine ;
     scripts/generer-pages.js       pages tournois générées (liens préfixés « ../ »).
   Modifier le menu = modifier MENU ici, puis lancer : node scripts/appliquer-gabarit.js (et regénérer les pages tournois).
   Comportement du menu (ouverture des groupes, hamburger) : assets/js/nav.js. */
"use strict";
const NOM_SITE = "Apprendre Padel";
const AUTEUR = {
  nom: "Samuel",
  presentation: "joueur de droite, licencié FFT, compétiteur en P50/P100 en Normandie",
};
// Menu : groupes (menu déroulant sur ordinateur, accordéon sur mobile) et liens directs, dans l'ordre d'affichage.
// Un lien direct = [page, libellé] ; un groupe = { id, nom, liens: [[page, libellé], ...] }. Le bouton d'appel ferme la marche.
const MENU = [
  ["index.html", "Accueil"],
  { id: "apprendre", nom: "Apprendre", liens: [["regles.html", "Règles"], ["technique.html", "Technique"], ["tactique.html", "Tactique"],
    ["tutos.html", "Tutos"], ["conseils.html", "Conseils"], ["videos.html", "Vidéos"], ["lexique.html", "Lexique"], ["materiel.html", "Matériel"]] },
  { id: "entrainer", nom: "S'entraîner", liens: [["academie.html", "Mon académie"], ["niveau.html", "Test de niveau"], ["entrainement.html", "Plan d'entraînement"], ["score.html", "Compteur de match"]] },
  ["simulateur-3d.html", "Tactique 3D"],
  { id: "competition", nom: "Compétition", liens: [["tournois.html", "Trouver un tournoi"], ["premier-tournoi.html", "Ton premier tournoi"], ["competition.html", "Jouer en compétition"],
    ["bareme.html", "Barème des points"], ["partenaires.html", "Trouver un partenaire"]] },
  ["espace.html", "Mon espace"],
];
// Bouton d'appel : [page, libellé, libellé court affiché quand la place manque sur ordinateur (le libellé complet reste lu)]
const APPEL = ["materiel.html#raquette", "Choisir sa raquette", "Raquette"];
// Pages hors menu rattachées à une entrée (marquée comme section en cours) : connexion et compte → « Mon espace »
// et les pages de scénario du simulateur 3D (simulateur-3d-<id>.html, générées par generer-pages-3d.js) → « Tactique 3D »
const SECTIONS = { "connexion.html": "espace.html", "compte.html": "espace.html" };
const section = actif => SECTIONS[actif] || (/^simulateur-3d-[a-z0-9-]+\.html$/.test(actif) ? "simulateur-3d.html" : undefined);
// Toutes les pages du menu (contrôles, sitemap éventuel)
const PAGES_MENU = MENU.flatMap(e => Array.isArray(e) ? [e] : e.liens);

// prefixe : "" (racine), "../" (sous-dossier) ou "/" (404.html, servie à n'importe quelle adresse)
function nav(actif, prefixe = "") {
  // « Mon espace » porte data-espace : nav.js le fait pointer vers connexion.html?suite=espace.html si le visiteur n'est pas connecté
  const lien = ([href, nom]) => `<li><a href="${prefixe}${href}"${href === actif ? ' class="active" aria-current="page"' : section(actif) === href ? ' class="active"' : ""}${href === "espace.html" ? " data-espace" : ""}>${nom}</a></li>`;
  const entree = e => {
    if (Array.isArray(e)) return lien(e);
    const dedans = e.liens.some(([href]) => href === actif || href === section(actif));
    return `<li class="nav-groupe"><button type="button" class="nav-titre${dedans ? " active" : ""}" aria-expanded="false" aria-controls="nav-${e.id}">${e.nom}</button>`
      + `<ul class="nav-sous" id="nav-${e.id}">${e.liens.map(lien).join("")}</ul></li>`;
  };
  return `<nav class="nav" aria-label="Navigation principale">
  <div class="wrap">
    <a class="brand" href="${prefixe === "/" ? "/" : prefixe + "index.html"}"><i></i>Apprendre <span>Padel</span></a>
    <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="nav-menu" aria-label="Ouvrir le menu"><span></span><span></span><span></span></button>
    <ul id="nav-menu">${MENU.map(entree).join("")}<li><a class="cta" href="${prefixe}${APPEL[0]}"><span class="cta-long">${APPEL[1]}</span><span class="cta-court" aria-hidden="true">${APPEL[2]}</span></a></li></ul>
  </div>
</nav>`;
}
function footer(prefixe = "") {
  return `<footer>
  <div class="wrap">
    <div><b>${NOM_SITE}</b> · Guide d'apprentissage du padel, des tournois et du matériel, pour les joueurs amateurs. Écrit par ${AUTEUR.nom}, ${AUTEUR.presentation}.</div>
    <div>Sources utiles : <a href="https://www.fft.fr/nos-sports/padel" target="_blank" rel="noopener">FFT Padel</a> · <a href="https://www.padelfip.com" target="_blank" rel="noopener">FIP (règles officielles)</a></div>
    <div><a href="${prefixe}confidentialite.html">Confidentialité</a> · <a href="${prefixe}mentions-legales.html">Mentions légales</a></div>
  </div>
</footer>`;
}
/* Versions des fichiers : chaque lien vers assets/style.css ou assets/js/*.js reçoit « ?v=<empreinte du contenu> ».
   Une page publiée ne peut donc jamais être servie avec un ancien style ou un ancien script gardé en cache
   (service worker, navigateur) : quand le fichier change, son adresse change. Empreinte calculée sur le contenu
   aux fins de ligne normalisées (identique sous Windows et sous Linux). assets/data/ n'est pas versionné (jamais mis en cache).
   Feuilles de style propres à une page (assets/<nom>.css) : versionnées de la même façon.
   Modules ES (simulateur 3D) : la carte d'import de la page (<script type="importmap">) est réécrite par carteModules(),
   chaque module y reçoit son « ?v=<empreinte> », y compris ceux qu'il importe lui-même (imports relatifs). */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const RACINE = path.join(__dirname, "..");
const empreintes = {};
/* Scripts qui en chargent d'autres dynamiquement (createElement("script")) : leurs chemins "assets/js/xxx.js" entre guillemets
   reçoivent aussi « ?v=<empreinte> ». Sans cela le service worker (stale-while-revalidate) pourrait servir un ancien script
   chargé à la volée. L'empreinte d'un tel fichier est calculée sur son contenu déjà réécrit ; appliquer-gabarit.js l'écrit. */
const SCRIPTS_DYNAMIQUES = ["assets/js/academie-sync.js"];
function versionnerJs(source) {
  return source.replace(/(["'])(assets\/js\/[\w-]+\.js)(?:\?v=[0-9a-f]+)?\1/g,
    (m, q, fichier) => `${q}${fichier}?v=${empreinte(fichier)}${q}`);
}
function empreinte(relatif) {
  if (!(relatif in empreintes)) {
    let contenu = fs.readFileSync(path.join(RACINE, relatif), "utf8").replace(/\r\n/g, "\n");
    if (SCRIPTS_DYNAMIQUES.includes(relatif)) contenu = versionnerJs(contenu);
    empreintes[relatif] = crypto.createHash("sha256").update(contenu).digest("hex").slice(0, 10);
  }
  return empreintes[relatif];
}
function versionner(html) {
  return html.replace(/(href|src)="((?:\.\.\/)*|\/)?(assets\/(?:[\w-]+\.css|js\/[\w-]+\.js))(?:\?v=[0-9a-f]+)?"/g,
    (m, attr, prefixe, fichier) => `${attr}="${prefixe || ""}${fichier}?v=${empreinte(fichier)}"`)
    .replace(/<script type="importmap">[\s\S]*?<\/script>/, () => `<script type="importmap">${carteModules()}</script>`);
}
// Carte d'import du simulateur 3D : Three.js (fichiers recopiés dans assets/3d/vendor) et modules assets/js/p3d/*.js
function carteModules() {
  const imports = {
    three: "./assets/3d/vendor/three.module.min.js",
    "three/addons": "./assets/3d/vendor/three-addons.min.js",
  };
  for (const f of fs.readdirSync(path.join(RACINE, "assets/js/p3d")).filter(n => n.endsWith(".js")).sort()) imports["./assets/js/p3d/" + f] = "./assets/js/p3d/" + f;
  for (const cle of Object.keys(imports)) imports[cle] += "?v=" + empreinte(imports[cle].slice(2));
  return JSON.stringify({ imports });
}
module.exports = { NOM_SITE, AUTEUR, MENU, APPEL, SECTIONS, section, PAGES_MENU, nav, footer, versionner, versionnerJs, SCRIPTS_DYNAMIQUES, empreinte, carteModules };
