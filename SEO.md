# SEO — apprendre-padel.fr

Document de référence du référencement naturel : ce qui a été corrigé (octobre 2026), comment le garder en bon état,
le calendrier éditorial des trois prochains mois et le suivi dans les outils gratuits.
Règles : aucun outil payant, aucun chiffre inventé (volumes de recherche, positions, notes), aucune page créée pour les
moteurs seulement. Les mots-clés ci-dessous sont **indicatifs** : ils décrivent l'intention, pas un volume mesuré.

## 1. État après l'audit du 27/10/2026

Vérifié automatiquement à chaque modification par `node scripts/verifier-seo.cjs` (1 064 pages) :

- title et meta description présents et **uniques** sur les 1 059 pages indexables, descriptions ≤ 160 caractères ;
  titles des pages de contenu au format « Sujet | Apprendre Padel » ;
- un seul H1 par page, `lang="fr"`, viewport, URL canonique = adresse de la page ;
- aucun lien interne cassé (ancres comprises), images avec `alt` et dimensions, bandeaux en deux tailles (srcset) ;
- sitemap : uniquement des pages existantes et indexables ; dates `lastmod` modifiées seulement quand le **contenu**
  change (pas pour le menu, le pied de page ou les numéros de version) ;
- pages privées (compte, espace, connexion, hors-ligne, 404) en `noindex` et hors sitemap ; robots.txt ne bloque
  aucune ressource utile au rendu ;
- données structurées : WebSite, Person, Organization (accueil), BreadcrumbList (toutes les pages), SportsEvent (fiches
  tournoi) ; pas de FAQPage (Google ne l'affiche plus pour ce type de site depuis 2023) ;
- contenu construit en JavaScript (fiches de coups, lexique, barème, plan 8 semaines) aussi écrit dans le HTML
  (`node scripts/prerendre-contenu.js`), contrôlé identique au rendu.

Vérifié en ligne le 27/10 : HTTP, www et sam762586.github.io redirigent (301) vers https://apprendre-padel.fr/ ;
la page 404 répond bien 404. GitHub Pages sert aussi `/tactique` sans `.html` : sans conséquence, l'URL canonique
désigne l'adresse avec `.html`.

### Restent à traiter (mineur)
- Sauts de niveau de titres (h1 → h3) dans des cartes sur une dizaine de pages : sans effet sur le référencement,
  à corriger au fil des refontes visuelles (changer le niveau change le style).
- `tournois.html` : la liste nationale reste construite en JavaScript (fichier de 310 Ko) ; les pages départements
  et région × catégorie, en HTML, sont liées en bas de page.
- Performances (lot 5A, 27/10/2026) : polices hébergées sur le site, préchargées, repli aux mêmes dimensions ; bandeaux
  en 4 tailles ; place réservée pour la date des tournois. Labo, téléphone en 4G lente et processeur ×4 : avant, en
  ligne, LCP 2,5 à 3,7 s et CLS 0,05 à 0,08 ; après, LCP 1,4 à 2,4 s et CLS 0 (`scripts/verifier-performance.cjs`,
  10 pages). Les vraies valeurs (75e percentile des visiteurs) viendront de Search Console (Signaux Web essentiels).

## 2. Calendrier éditorial (novembre 2026 → janvier 2027)

Principe : améliorer d'abord les pages existantes ; une nouvelle page seulement quand aucune ne répond à l'intention.
Toute règle sportive est vérifiée dans le règlement FFT/FIP en vigueur avant publication (CLAUDE.md).

| Mois | Sujet | Intention | Public | Page | Mot-clé indicatif | Priorité |
|---|---|---|---|---|---|---|
| Nov. | Débuter au padel | Savoir par où commencer | Débutant | **Enrichir** conseils.html | débuter au padel | P1 |
| Nov. | Compter les points | Comprendre le score, le point décisif | Débutant | **Enrichir** regles.html | comment compter les points au padel | P1 |
| Nov. | Le service | Servir sans faute | Débutant | **Enrichir** regles.html (+ lien 3D service) | service padel règle | P1 |
| Déc. | Ton premier tournoi | S'inscrire et jouer un P25 | Débutant → compétiteur | **Nouvelle** premier-tournoi.html (ROADMAP M5) | premier tournoi padel P25 | P1 |
| Déc. | Défendre un lob | Que faire quand on est lobé | Intermédiaire | **Enrichir** tutos.html | défendre un lob padel | P2 |
| Déc. | Parler avec son partenaire | Les annonces en match | Tous | **Enrichir** tactique.html | communication padel partenaire | P2 |
| Janv. | Choisir sa première raquette | Acheter sans se tromper | Débutant | **Enrichir** materiel.html | première raquette padel | P2 |
| Janv. | Exercices par niveau | S'entraîner seul ou à deux | Tous | **Enrichir** entrainement.html | exercices padel | P2 |
| Janv. | Analyser son match | Comprendre ses points perdus | Intermédiaire | **Enrichir** score.html (statistiques) | analyser son match de padel | P3 |

### Structure proposée par contenu

**Débuter au padel** (conseils.html) — H1 : Débuter au padel : les 10 erreurs à corriger
- H2 Trouver un club et une première séance · H2 Le matériel minimal · H2 Les règles à connaître dès le premier match
  (lien regles.html) · H2 Les 10 erreurs du débutant (existant) · H2 Et après ? (liens niveau.html, entrainement.html,
  simulateur 3D « Coup droit de fond »).
- Expressions secondaires : padel débutant, premier cours de padel, apprendre le padel seul.

**Compter les points et le service** (regles.html) — H2 Compter les points (jeu, set, tie-break, point décisif ou
avantages, vérifié au règlement FFT en vigueur) · H2 Le service (à la cuillère, sous la taille, diagonale ; lien
simulateur-3d-servir-monter.html) · H2 Les vitres et la grille (existant) · lien score.html.
- Expressions secondaires : point décisif padel, règle du service padel, faute au service.

**Ton premier tournoi** (premier-tournoi.html, nouvelle) — voir ROADMAP M5. H2 Le P25 · H2 La licence ·
H2 S'inscrire sur Ten'Up · H2 Le jour J · H2 Les points (lien bareme.html) · H2 Trouver un partenaire (lien
partenaires.html) · liste des P25 du département (pages tournois/). Contenu le plus susceptible d'être partagé par
les clubs : à leur proposer une fois publié.

**Défendre un lob** (tutos.html) — H3 Lob court : smash (lien 3D smash) · H3 Lob mi-profond : bandeja (lien 3D) ·
H3 Lob profond : vitre et bajada (lien 3D bajada) · H3 Le partenaire lobé (existant).

**Parler avec son partenaire** (tactique.html) — H2 Les annonces (« à moi », « laisse », « vitre ») · H2 Qui prend
le centre (lien tutos.html) · H2 Entre les points. Contenu d'expérience : à écrire par Samuel.

**Première raquette** (materiel.html) — H2 Ta première raquette : forme ronde, mousse souple, poids moyen, budget ;
lien vers le sélecteur. **Exercices** (entrainement.html) — H2 Exercices par niveau, chacun relié à la fiche 3D du
coup travaillé. **Analyser son match** (score.html) — H2 Lire les statistiques du compteur, H2 Quoi travailler
ensuite (liens fiches 3D).

### Contenus qui peuvent obtenir des liens naturellement
- Les 21 fiches de coups en 3D (gratuites, sans inscription) : à présenter aux éducateurs et aux clubs.
- Le barème et simulateur de classement, le test de niveau, la liste des tournois par département.
- Le guide « Ton premier tournoi » une fois publié.
Démarche : un message personnel aux clubs de Normandie et d'Île-de-France que tu connais, et partage dans les
groupes de joueurs quand c'est utile à la discussion. Pas d'échange de liens ni d'annuaires.

## 3. Outils gratuits de suivi

Aucun script de suivi supplémentaire n'est ajouté au site (GoatCounter reste le seul compteur).

### Google Search Console
1. https://search.google.com/search-console → « Ajouter une propriété ».
2. Choisir **Domaine** et saisir `apprendre-padel.fr` (couvre http, https, www). Google donne un enregistrement
   **TXT** : l'ajouter dans la zone DNS chez le registraire du domaine, puis « Valider » (quelques minutes à 48 h).
   À défaut, propriété « Préfixe d'URL » `https://apprendre-padel.fr/` validée par un fichier HTML que Google fournit :
   le déposer à la racine du dépôt et publier (à demander à Claude).
3. « Sitemaps » → envoyer `sitemap.xml`.
4. « Inspection de l'URL » → tester puis « Demander une indexation » pour l'accueil, technique.html,
   simulateur-3d.html et 2 ou 3 fiches de coups.
5. À consulter ensuite : Performances (clics, impressions, CTR, position), Pages (indexées / non indexées et
   pourquoi), Signaux Web essentiels (LCP, INP, CLS réels), Améliorations (fil d'Ariane, événements).

### Bing Webmaster Tools
https://www.bing.com/webmasters → « Importer depuis Google Search Console » (le plus simple) ; le sitemap est repris.

### Contrôles ponctuels
- **PageSpeed Insights** (https://pagespeed.web.dev/) : accueil, technique, une fiche 3D, une page tournoi ; noter
  les données « réelles » quand elles apparaissent (il faut assez de visiteurs).
- **Lighthouse** : Chrome → outils de développement → onglet Lighthouse, mode mobile.
- **Test des résultats enrichis** (https://search.google.com/test/rich-results) : fil d'Ariane d'une fiche 3D,
  SportsEvent d'une fiche tournoi.

## 4. Tableau de suivi mensuel

À remplir le 1er de chaque mois depuis Search Console (Performances : 28 derniers jours) et PageSpeed Insights.

| Mois | Clics | Impressions | CTR | Position moy. | Pages indexées | Requêtes principales | Pages en progression | Pages à améliorer | LCP / INP / CLS (réel, mobile) |
|---|---|---|---|---|---|---|---|---|---|
| Nov. 2026 | | | | | | | | | |
| Déc. 2026 | | | | | | | | | |
| Janv. 2027 | | | | | | | | | |

Lecture : une page avec beaucoup d'impressions et un CTR faible → revoir son title et sa description ; une page
« Explorée, actuellement non indexée » → enrichir son contenu ou la relier davantage ; une requête en position 8 à 20
→ le contenu existe mais doit mieux y répondre (ajouter la section qui manque).
