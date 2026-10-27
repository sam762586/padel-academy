# Apprendre Padel — site d'apprentissage du padel

## Ce que c'est
Site statique multi-pages en français (HTML/CSS/JS vanilla, aucun build). Public : joueurs amateurs, du débutant au P500.
Pages : index, technique, tactique, tutos, niveau, entrainement, videos, regles, conseils, materiel (+ sélecteur de raquette), competition, lexique.

## Structure
- `assets/style.css` : tout le style. Design system v3 décrit en tête du fichier : tokens dans `:root` (bleu nuit #101F35 en fond, vert énergie #C8F14B pour les actions — variable `--turf` —, bleu terrain #1674A6 pour les surfaces, jamais pour du texte, liens en `--sky`, blanc froid #F4F7FA ; sable et corail pour niveaux et alertes), échelles `--s-*` et `--fs-*`, puis composants communs en fin de fichier (`.btn` et ses états, `.champ`, `.msg`, `.chargement`, `.icone`) : les réutiliser plutôt que redéfinir un style local. Pas de couleur en dur : `rgba(var(--turf-rgb),.2)`. Contrastes et couleurs contrôlés par `node scripts/verifier-design.cjs`. Fonts : Big Shoulders Display (titres) + Manrope (texte).
- `assets/js/*.js` : un fichier par fonctionnalité. Les données (coups, raquettes, lexique, quiz, plan) sont DANS ces fichiers, en tête, sous forme de tableaux d'objets. Modifier le contenu = modifier ces tableaux.
- Chaque page inclut uniquement les scripts dont elle a besoin (voir le bas de chaque .html).
- Simulateur 3D (`simulateur-3d.html`, entrée « Tactique 3D » du menu) : modules ES dans `assets/js/p3d/` (physique, scénarios et gestes sans dépendance, testables sous Node ; terrain, caméras, joueurs et page avec three.js), three.js recopié dans `assets/3d/vendor/`, modèle CC0 dans `assets/3d/modeles/`, scénarios JSON dans `assets/3d/scenarios/`, style propre dans `assets/simulateur-3d.css`. Les modules sont versionnés par la carte d'import de la page (réécrite par `appliquer-gabarit.js`). Tout asset ajouté doit être inscrit avec sa licence dans `assets/3d/LICENCES-3D.md`. Un scénario par coup de la page Technique (`p3d` dans `assets/js/coups.js` → bouton « Voir en 3D ») ; liste et familles dans `SCENARIOS` de `simulateur.js` ; questions du mode quiz dans le champ `questions` de chaque JSON. Une page par scénario (`simulateur-3d-<id>.html`, pour les moteurs de recherche) : générée par `node scripts/generer-pages-3d.js` depuis `simulateur-3d.html` et les JSON — à relancer après tout changement de scénario ou de la page modèle (ne pas modifier ces pages à la main). Tests : `node scripts/verifier-simulateur-3d.cjs`.

## Règles de travail
- Français partout (contenu, commentaires, commits). Tutoiement dans le contenu.
- Pas de framework, pas de bundler, pas de dépendance npm : on doit pouvoir ouvrir index.html en double-cliquant.
- Menu et pied de page : une seule source, `scripts/gabarit.js`. Pour changer le menu (ou ajouter une page au menu), modifier `MENU` puis lancer `node scripts/appliquer-gabarit.js` : toutes les pages de la racine sont mises à jour, et les pages tournois le seront à la prochaine génération (`node scripts/generer-pages.js`).
- Après toute modification de `assets/style.css` ou d'un `assets/js/*.js` : lancer `node scripts/appliquer-gabarit.js` (et `node scripts/generer-pages.js` pour les pages tournois). Les liens portent `?v=<empreinte>` : sans ça, le cache hors connexion peut servir une page neuve avec un ancien style. `appliquer-gabarit.js --verifier` (et `verifier-pages.cjs`) signale les pages en retard.
- Nouvelle page = copier le squelette d'une page existante (entre `<nav class="nav"` … `</nav>` et `<footer>` … `</footer>`, le script remet le gabarit).
- Responsive obligatoire (tester à 390 et 320 px ; `verifier-design.cjs` contrôle toutes les pages de la racine). Gouttière 16 px minimum. Dans une grille, `minmax(min(300px,100%),1fr)` plutôt que `minmax(300px,1fr)`.
- Feuille de route : `ROADMAP.md` (v3, une phase à la fois, validation de Samuel avant la suivante, aucun push sans autorisation).
- Pas d'images externes ni de iframes YouTube dans le dépôt : liens sortants uniquement, sauf si des photos sont ajoutées dans `assets/img/`.
- Contenu padel : vérifier les règles contre le règlement FFT/FIP avant de modifier `regles.html`. Prix des raquettes : indicatifs, à dater.
- Contenu construit en JavaScript (fiches de coups, lexique, barème, plan 8 semaines) : il est aussi écrit dans le HTML pour les moteurs de recherche, entre `<!-- prerendu:id -->` et `<!-- /prerendu:id -->`. Après toute modification de ces données, lancer `node scripts/prerendre-contenu.js` (ne pas modifier ces blocs à la main).
- SEO : état, calendrier éditorial et suivi dans `SEO.md`. `node scripts/verifier-seo.cjs` vérifie titles et descriptions uniques (≤ 160 caractères), canoniques, liens internes, sitemap, noindex des pages privées, données structurées et contenu pré-rendu à jour. Pas de FAQPage (Google ne l'affiche plus pour ce type de site).
- Avant de livrer : ouvrir chaque page, vérifier la console (0 erreur), tester le sélecteur de raquette et le quiz.

## Prochaines étapes envisagées
- Photos / illustrations des gestes (`assets/img/`).
- Comptes joueurs (profil, raquettes testées) : nécessitera un backend (Supabase ou équivalent) — à décider.
- Déploiement : Netlify / GitHub Pages (site statique, rien à configurer).
