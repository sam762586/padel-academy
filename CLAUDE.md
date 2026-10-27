# Apprendre Padel — site d'apprentissage du padel

## Ce que c'est
Site statique multi-pages en français (HTML/CSS/JS vanilla, aucun build). Public : joueurs amateurs, du débutant au P500.
Pages : index, technique, tactique, tutos, niveau, entrainement, videos, regles, conseils, materiel (+ sélecteur de raquette), competition, lexique.

## Structure
- `assets/style.css` : tout le style. Tokens dans `:root` (palette "night session" : fond nuit, vert turf #35e27f, sable #ffb547, corail #ff5d4a). Fonts : Big Shoulders Display (titres) + Manrope (texte).
- `assets/js/*.js` : un fichier par fonctionnalité. Les données (coups, raquettes, lexique, quiz, plan) sont DANS ces fichiers, en tête, sous forme de tableaux d'objets. Modifier le contenu = modifier ces tableaux.
- Chaque page inclut uniquement les scripts dont elle a besoin (voir le bas de chaque .html).
- Simulateur 3D (`simulateur-3d.html`, lié depuis Tactique) : modules ES dans `assets/js/p3d/` (physique, scénarios et gestes sans dépendance, testables sous Node ; terrain, caméras, joueurs et page avec three.js), three.js recopié dans `assets/3d/vendor/`, modèle CC0 dans `assets/3d/modeles/`, scénarios JSON dans `assets/3d/scenarios/`, style propre dans `assets/simulateur-3d.css`. Les modules sont versionnés par la carte d'import de la page (réécrite par `appliquer-gabarit.js`). Tout asset ajouté doit être inscrit avec sa licence dans `assets/3d/LICENCES-3D.md`. Un scénario par coup de la page Technique (`p3d` dans `assets/js/coups.js` → bouton « Voir en 3D ») ; liste et familles dans `SCENARIOS` de `simulateur.js` ; questions du mode quiz dans le champ `questions` de chaque JSON. Une page par scénario (`simulateur-3d-<id>.html`, pour les moteurs de recherche) : générée par `node scripts/generer-pages-3d.js` depuis `simulateur-3d.html` et les JSON — à relancer après tout changement de scénario ou de la page modèle (ne pas modifier ces pages à la main). Tests : `node scripts/verifier-simulateur-3d.cjs`.

## Règles de travail
- Français partout (contenu, commentaires, commits). Tutoiement dans le contenu.
- Pas de framework, pas de bundler, pas de dépendance npm : on doit pouvoir ouvrir index.html en double-cliquant.
- Menu et pied de page : une seule source, `scripts/gabarit.js`. Pour changer le menu (ou ajouter une page au menu), modifier `MENU` puis lancer `node scripts/appliquer-gabarit.js` : toutes les pages de la racine sont mises à jour, et les pages tournois le seront à la prochaine génération (`node scripts/generer-pages.js`).
- Après toute modification de `assets/style.css` ou d'un `assets/js/*.js` : lancer `node scripts/appliquer-gabarit.js` (et `node scripts/generer-pages.js` pour les pages tournois). Les liens portent `?v=<empreinte>` : sans ça, le cache hors connexion peut servir une page neuve avec un ancien style. `appliquer-gabarit.js --verifier` (et `verifier-pages.cjs`) signale les pages en retard.
- Nouvelle page = copier le squelette d'une page existante (entre `<nav class="nav"` … `</nav>` et `<footer>` … `</footer>`, le script remet le gabarit).
- Responsive obligatoire (tester à 400 px). Gouttière 16 px minimum.
- Pas d'images externes ni de iframes YouTube dans le dépôt : liens sortants uniquement, sauf si des photos sont ajoutées dans `assets/img/`.
- Contenu padel : vérifier les règles contre le règlement FFT/FIP avant de modifier `regles.html`. Prix des raquettes : indicatifs, à dater.
- Avant de livrer : ouvrir chaque page, vérifier la console (0 erreur), tester le sélecteur de raquette et le quiz.

## Prochaines étapes envisagées
- Photos / illustrations des gestes (`assets/img/`).
- Comptes joueurs (profil, raquettes testées) : nécessitera un backend (Supabase ou équivalent) — à décider.
- Déploiement : Netlify / GitHub Pages (site statique, rien à configurer).
