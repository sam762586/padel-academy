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
  { id: "apprendre", nom: "Apprendre", liens: [["technique.html", "Technique"], ["tactique.html", "Tactique"], ["tutos.html", "Tutos"],
    ["regles.html", "Règles"], ["conseils.html", "Conseils"], ["materiel.html", "Matériel"], ["videos.html", "Vidéos"], ["lexique.html", "Lexique"]] },
  { id: "progresser", nom: "Progresser", liens: [["niveau.html", "Mon niveau"], ["entrainement.html", "Entraînement"], ["score.html", "Compteur"]] },
  { id: "tournois", nom: "Tournois", liens: [["tournois.html", "Trouver un tournoi"], ["competition.html", "Jouer en compétition"],
    ["bareme.html", "Barème des points"], ["partenaires.html", "Trouver un partenaire"]] },
  ["espace.html", "Mon espace"],
];
const APPEL = ["materiel.html#raquette", "Choisir sa raquette"];
// Toutes les pages du menu (contrôles, sitemap éventuel)
const PAGES_MENU = MENU.flatMap(e => Array.isArray(e) ? [e] : e.liens);

// prefixe : "" (racine), "../" (sous-dossier) ou "/" (404.html, servie à n'importe quelle adresse)
function nav(actif, prefixe = "") {
  const lien = ([href, nom]) => `<li><a href="${prefixe}${href}"${href === actif ? ' class="active" aria-current="page"' : ""}>${nom}</a></li>`;
  const entree = e => {
    if (Array.isArray(e)) return lien(e);
    const dedans = e.liens.some(([href]) => href === actif);
    return `<li class="nav-groupe"><button type="button" class="nav-titre${dedans ? " active" : ""}" aria-expanded="false" aria-controls="nav-${e.id}">${e.nom}</button>`
      + `<ul class="nav-sous" id="nav-${e.id}">${e.liens.map(lien).join("")}</ul></li>`;
  };
  return `<nav class="nav" aria-label="Navigation principale">
  <div class="wrap">
    <a class="brand" href="${prefixe === "/" ? "/" : prefixe + "index.html"}"><i></i>Apprendre <span>Padel</span></a>
    <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="nav-menu" aria-label="Ouvrir le menu"><span></span><span></span><span></span></button>
    <ul id="nav-menu">${MENU.map(entree).join("")}<li><a class="cta" href="${prefixe}${APPEL[0]}">${APPEL[1]}</a></li></ul>
  </div>
</nav>`;
}
function footer(prefixe = "") {
  return `<footer>
  <div class="wrap">
    <div><b>${NOM_SITE}</b> · Guide d'apprentissage du padel, des tournois et du matériel, pour les joueurs amateurs. Écrit par ${AUTEUR.nom}, ${AUTEUR.presentation}.</div>
    <div>Sources utiles : <a href="https://www.fft.fr/nos-sports/padel" target="_blank" rel="noopener">FFT Padel</a> · <a href="https://www.padelfip.com" target="_blank" rel="noopener">FIP (règles officielles)</a></div>
    <div><a href="${prefixe}confidentialite.html">Confidentialité</a> · <a href="${prefixe}mentions-legales.html">Mentions légales</a></div>
  </div>
</footer>`;
}
module.exports = { NOM_SITE, AUTEUR, MENU, APPEL, PAGES_MENU, nav, footer };
