/* GABARIT COMMUN : menu, pied de page et auteur du site (Node, aucune dépendance)
   Seule source du menu et du pied de page. Utilisé par :
     scripts/appliquer-gabarit.js   recopie le menu et le pied de page dans les pages HTML de la racine ;
     scripts/generer-pages.js       pages tournois générées (liens préfixés « ../ »).
   Modifier le menu = modifier MENU ici, puis lancer : node scripts/appliquer-gabarit.js */
"use strict";
const NOM_SITE = "Apprendre Padel";
const AUTEUR = {
  nom: "Samuel",
  presentation: "joueur de droite, licencié FFT, compétiteur en P50/P100 en Normandie",
};
// [page, libellé] dans l'ordre du menu ; le dernier lien est le bouton d'appel
const MENU = [
  ["technique.html", "Technique"], ["tactique.html", "Tactique"], ["tutos.html", "Tutos"], ["niveau.html", "Mon niveau"],
  ["entrainement.html", "Entraînement"], ["score.html", "Compteur"], ["videos.html", "Vidéos"], ["regles.html", "Règles"],
  ["conseils.html", "Conseils"], ["materiel.html", "Matériel"], ["competition.html", "Compétition"], ["bareme.html", "Barème"],
  ["tournois.html", "Tournois"], ["partenaires.html", "Partenaires"], ["lexique.html", "Lexique"], ["espace.html", "Mon espace"],
];
const APPEL = ["materiel.html#raquette", "Choisir sa raquette"];

// prefixe : "" (racine), "../" (sous-dossier) ou "/" (404.html, servie à n'importe quelle adresse)
function nav(actif, prefixe = "") {
  const lien = ([href, nom]) => `<li><a href="${prefixe}${href}"${href === actif ? ' class="active"' : ""}>${nom}</a></li>`;
  return `<nav class="nav" aria-label="Navigation principale">
  <div class="wrap">
    <a class="brand" href="${prefixe === "/" ? "/" : prefixe + "index.html"}"><i></i>Apprendre <span>Padel</span></a>
    <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="nav-menu" aria-label="Ouvrir le menu"><span></span><span></span><span></span></button>
    <ul id="nav-menu">${MENU.map(lien).join("")}<li><a class="cta" href="${prefixe}${APPEL[0]}">${APPEL[1]}</a></li></ul>
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
module.exports = { NOM_SITE, AUTEUR, MENU, APPEL, nav, footer };
