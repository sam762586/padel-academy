# Matrice : ce qu'il faut relancer et vérifier

Les noms de suites sont les noms courts de `node scripts/tout-verifier.cjs --liste` (`academie*` = toutes les suites academie-…).
Commande : `node scripts/tout-verifier.cjs --seulement <noms séparés par des virgules>`.
En cas de doute sur ce qu'une suite couvre : lire son en-tête dans `scripts/verifier-<nom>.*`, ou chercher le nom du fichier modifié dans `scripts/verifier-*`.

| Si tu modifies… | Relance, dans cet ordre | Suites |
|---|---|---|
| `assets/style.css` | `node scripts/appliquer-gabarit.js` puis `node scripts/generer-pages.js` | design, menu, performance, cache, pages, corrections |
| un `assets/js/*.js` (hors 3D) | `node scripts/appliquer-gabarit.js` (+ `generer-pages.js` s'il sert aux pages tournois) | la suite de la fonctionnalité, cache, corrections |
| menu ou pied de page (`scripts/gabarit.js`) | `appliquer-gabarit.js`, `generer-pages.js` | menu, pages, seo, connexion, design |
| données pré-rendues (`coups.js`, `lexique.js`, `bareme.js`, `bareme-donnees.js`, `plan.js`) | `node scripts/prerendre-contenu.js`, `appliquer-gabarit.js` | seo, contenus, corrections (+ pages pour le barème) |
| article (`regles`, `conseils`, `technique`, `tactique`, `tutos`, `premier-tournoi`, `score`, `entrainement`) | `prerendre-contenu.js` si un bloc pré-rendu est touché | contenus, seo, design (+ diagnostic-paire pour tactique et tutos) |
| `exercices-donnees.js` | `appliquer-gabarit.js` | exercices, contenus, defis, progression, academie-parcours, diagnostic-paire, parcours-joueurs |
| scénario 3D (`assets/3d/scenarios/*.json`), `assets/js/p3d/`, `simulateur-3d.html` | `generer-affiches-3d.cjs <id…>` → `generer-pages-3d.js` → `generer-quiz-tactique.mjs` → `generer-academie-questions.mjs` → `appliquer-gabarit.js` | simulateur-3d, labo-trajectoires, quiz-tactique, tableau-tactique, academie-questions, seo |
| académie (questions, contenus, parcours, `academie*.js`) | `node scripts/generer-academie-questions.mjs` si les questions changent | academie*, parcours-joueurs |
| compte, espace, connexion, synchronisation (`compte*.js`, `connexion.js`, `espace.js`, `joueur-sync.js`, `journal.js`, `carnet-outils.js`, `diagnostic.js`, `progression.js`, `defis.js`, `mon-padel.js`, `favoris.js`) | `appliquer-gabarit.js` | connexion, espace, mon-padel, journal, carnet, diagnostic, progression, defis, favoris, parcours-joueurs, corrections |
| communauté (`communaute-tournoi.js`, `partenaires.js`) | `appliquer-gabarit.js` | communaute, connexion + revue de `securite` |
| test de niveau (`quiz-niveau.js`, `niveau.html`) | `appliquer-gabarit.js` | niveau, corrections, exercices, progression |
| accueil (`index.html`, `accueil-tournois.js`) | — | profils, accueil, design, performance, seo |
| raquettes (`raquettes.js`) | `node --check assets/js/raquettes.js`, `appliquer-gabarit.js` | raquettes, corrections |
| compteur (`score.html`) | — | score, journal |
| tournois (robot, `assets/data/`, `generer-pages.js`) | `node scripts/verifier-json.js` → `node scripts/generer-pages.js` | json, pages, tournois, accueil, seo |
| `sw.js` ou la liste SHELL | changer `CACHE` dans sw.js | cache |
| images, polices | `appliquer-gabarit.js` si un lien change | performance, design, seo |
| migration SQL (`supabase/migrations/`) | aucune exécution en ligne ; vérification sur Postgres en mémoire (modèle `verifier-academie-sql.mjs`) | academie-sql + la vérification du lot, revue de `securite` |
| nouvelle page | copier le squelette d'une page existante, `appliquer-gabarit.js`, sitemap par le générateur | design, menu, seo, performance |
| avant toute publication | — | toutes : `node scripts/tout-verifier.cjs` |

Ne jamais modifier à la main : `simulateur-3d-<id>.html`, `assets/3d/affiches/`, `tournoi/`, `tournois/`, `sitemap.xml`, `assets/js/quiz-tactique-donnees.js`, `assets/js/academie-questions.js`, les blocs `<!-- prerendu:… -->`, le menu et le pied de page des pages.
