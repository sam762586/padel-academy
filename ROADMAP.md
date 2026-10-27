# Feuille de route v3 — apprendre-padel.fr (mission « Apprendre Padel V3 », 27/10/2026)

Objectif : faire d'apprendre-padel.fr une plateforme francophone de référence pour apprendre et progresser au padel :
premium, rapide, responsive, riche en contenus, différenciée par son simulateur 3D, gratuite, sans API d'IA payante
ni service payant.

## Règles de la v3 (en plus de CLAUDE.md)
- Une phase à la fois : plan détaillé → accord de Samuel → développement → tests → présentation → commits locaux →
  validation avant la phase suivante. **Aucun push ni déploiement sans autorisation explicite.**
- Ne pas reconstruire ce qui fonctionne ; préserver pages, URLs, comptes et données ; garder le simulateur 2D ;
  ne pas remplacer le simulateur 3D sans justification ; pas de coach IA, pas d'API payante, pas d'abonnement.
- Licences vérifiées pour tout modèle, image, icône, animation. Aucune règle, statistique, mesure ou résultat de test
  inventé. Pas de FAQPage (voir SEO.md).
- Chaque fonctionnalité marche sur mobile (390 et 320 px) et a ses tests.
- Une page existante améliorée plutôt qu'une nouvelle page ; pas de suppression de page sans redirection
  (GitHub Pages : pas de 301, seulement une page de renvoi).

## Phase 0 — Audit ✅ 27/10/2026
Inventaire, risques et ordre des phases présentés et validés. Points ouverts : synchronisation des comptes désactivée
(`PA_SUPABASE.activees = []`, à confirmer avec Samuel avant toute activation) ; performances réelles à lire dans
Search Console.

## Phase 1 — Design system et accueil (branche `feature/apprendre-padel-v3`)
- [x] Palette de la marque en tokens (`assets/style.css`, en-tête) : bleu nuit #101F35, bleu terrain #1674A6,
  vert énergie #C8F14B, blanc froid #F4F7FA ; contrastes AA contrôlés par `scripts/verifier-design.cjs`.
- [x] Échelles (espacements, tailles de texte, rayons) et composants communs : focus clavier, boutons (désactivé,
  chargement), champs (aide, erreur), messages, indicateur de chargement, icônes.
- [x] Menu : Accueil · Apprendre · S'entraîner · Tactique 3D · Compétition · Mon espace (+ bouton raquette).
- [x] Accueil : « Progresse au padel, point après point. », trois accès (apprendre, simulateur 3D, niveau),
  parcours Débutant / Intermédiaire / Compétiteur, vitrine du simulateur 3D.
- [x] Icônes, image de partage, couleur du navigateur et manifeste aux nouvelles couleurs ; cache hors ligne pa-v20.
- [x] Validation de Samuel (27/10/2026).

## Phase 2 — Académie pédagogique (branche `feature/apprendre-padel-v3`)
- [x] 2A. Fiches de coups en 11 parties, générées par `scripts/generer-pages-3d.js` (publié le 27/10/2026, 42cc5e1f).
- [x] 2B. Débutant : règles (comptage, service, 12 cas litigieux, vérifiés sur le règlement FIP du 28/11/2025),
  20 erreurs du débutant, section vitres (Technique), lexique relié aux fiches.
- [x] 2C. Intermédiaire : schémas tactiques, construire le point, partenaire de niveau différent (Tactique) ;
  face à un lob, défendre contre deux volleyeurs (Tutos).
- [x] 2D. Compétiteur : `premier-tournoi.html` (seule page créée), s'adapter à l'adversaire (gaucher compris),
  score et moments importants, communication (Tactique), analyser ses matchs (Compteur), préparation physique.
- [x] 2E. Parcours relié : « Et maintenant ? » en fin d'article (exercice → 3D → quiz → suivi), fiches reliées à
  l'espace joueur, parcours de l'accueil mis à jour. Test : `scripts/verifier-contenus.cjs`.
- [ ] Relecture de Samuel (passages d'expérience : partenaire de niveau différent, moments importants,
  communication ; gestes techniques des fiches). BLOQUÉ : captures du parcours Ten'Up (compte de Samuel).
- [x] Validation de Samuel (27/10/2026), publiée.

## Phase 3 — Simulateur 3D v2
- [x] 3A. Prototype (27/10/2026) : terrain (vitres lisibles et cadre acier, salle éclairée, parois regroupées :
  appels de dessin par image 194 → 65 sur ordinateur, 147 → 45 sur mobile), qualité économique / équilibrée / élevée,
  boutons Trajectoire et Placements, couleurs d'équipe du site, pieds qui glissent moins, gestes v2 coup droit et
  bandeja (buste, bras gauche), champ « conseil » (bandeja, sortie de vitre de fond).
- [x] Validation du prototype par Samuel (27/10/2026, gestes coup droit et bandeja compris).
- [x] 3B. Autres gestes en v2, par groupes validés :
  - [x] Groupe 1 (27/10/2026) : revers, volée de coup droit, volée de revers, lob, víbora, smash, défense après double vitre.
  - [x] Validation du groupe 1 par Samuel (27/10/2026).
  - [x] Groupe 2 (27/10/2026) : sortie de vitre, service, retour, gancho, bajada, amorti, volée basse.
  - [x] Validation du groupe 2 par Samuel (27/10/2026).
- [x] 3C (27/10/2026). Scénarios « partenaire lobé (cambio) » et « couverture du centre » ; conseil sur les 6 scénarios prioritaires
  (cambio, bandeja-garder-filet, servir-monter, sortie-vitre-fond, couverture-centre, retour-lob).
- [x] Validation du 3C par Samuel (27/10/2026).
- [x] 3D (27/10/2026). Fiches : la 3D démarre au clic (image de la scène en attendant), page Simulateur inchangée ; niveaux
  « du coup » et « de la scène » distingués.
  Images : `scripts/generer-affiches-3d.cjs` (captures de la vraie scène, 23 × environ 31 Ko). three.js et le modèle ne sont
  téléchargés qu'au clic (image, Lecture, Quiz, Trajectoire, Placements) ; lien direct vers le quiz : démarrage immédiat.
- [x] Validation du 3D et de la phase 3 par Samuel (27/10/2026).
Limite gardée : pas d'effet de balle (slice, lift), affichée sur la page.

## Phase 4 — Outils interactifs
Plan validé par Samuel (27/10/2026) : un lot à la fois, validé avant le suivant ; aucune nouvelle page.
- [x] 4A. Quiz tactique sans 3D (27/10/2026) : `tactique.html#quiz`, les 55 questions des scénarios 3D, scène figée
  dessinée en 2D (positions calculées par le moteur, `scripts/generer-quiz-tactique.mjs`), séries de 10 par niveau,
  réponses mélangées, correction, lien vers la scène en 3D, scénarios à revoir, meilleur score sur l'appareil ;
  lien depuis l'espace joueur. Tests : `scripts/verifier-quiz-tactique.cjs`.
- [x] Validation du 4A par Samuel (27/10/2026).
- [x] 4B. Tableau tactique (27/10/2026) : `tactique.html#tableau`, même terrain que le quiz ; joueurs et balle à
  déplacer (doigt, souris, clavier), flèches de déplacement et de balle (glisser ou deux touchers), départ depuis les
  4 phases de Placement ou les 55 scènes du quiz, 5 tableaux sauvegardés sur l'appareil, export PNG 580 × 1220.
  Tests : `scripts/verifier-tableau-tactique.cjs`.
- [x] Validation du 4B par Samuel (27/10/2026).
- [x] 4C. Labo des trajectoires (27/10/2026) : `simulateur-3d.html#labo` (page principale seulement), moteur physique du
  simulateur sans 3D ; point de frappe, cible (rebond ou passage), temps de vol ; vues de dessus et de côté ; vitesse,
  marge au-dessus du filet, hauteur maximale, rebond, suite (vitre, grillage, sortie), faute reconnue ; 6 préréglages
  copiés des scénarios ; limites affichées. Tests : `scripts/verifier-labo-trajectoires.cjs`.
- [x] Validation du 4C par Samuel (27/10/2026).
- [x] 4D. Diagnostic de paire (27/10/2026) : `tactique.html#diagnostic-paire`, dans « Jouer avec un partenaire de niveau
  différent » ; questionnaire sur les deux joueurs ; côtés, balle au centre, rôles si niveaux différents, 3 priorités
  avec un exercice de l'espace joueur au niveau de la paire ; règles fixes reprises des textes du site ; présenté comme
  une aide, pas un avis de professionnel ; réponses gardées sur l'appareil. Tests : `scripts/verifier-diagnostic-paire.cjs`
  (toutes les combinaisons de réponses).
- [x] Validation du 4D par Samuel (27/10/2026).
- [x] 4E. Défi de la semaine (27/10/2026) : `espace.html#esp-bloc-defi`, après le tableau de bord ; un thème par semaine ISO
  pour tous (cycle des 10 thèmes), exercice au niveau du dernier test ; « J'ai relevé le défi » (auto-évaluation),
  compté comme exercice fait ; série et 8 dernières semaines ; sur l'appareil. Tests : `scripts/verifier-defis.cjs`.
- [x] Validation du 4E par Samuel (27/10/2026).
- [x] 4F. Carnet de match (27/10/2026), choix de Samuel : filtres type et partenaire (en plus de la période) et export CSV
  des matchs filtrés ; tendance des points perdus sur les 5 et 10 derniers matchs comptés (motifs notés au compteur,
  des comptes seulement) ; dans le diagnostic après match, scène 3D et « Te tester » pour chaque axe. Le bilan par
  partenaire et par type existait déjà : gardé tel quel. Corrigé : barre vide sous chaque match du journal (bilan
  fermé encore affiché). Tests : `scripts/verifier-carnet.cjs`.
- [x] Validation du 4F et de la phase 4 par Samuel (27/10/2026).

## Phase 5 — SEO et performance (continu)
Suivi dans SEO.md ; `verifier-seo.cjs` à chaque livraison ; mesures réelles via Search Console et PageSpeed.
Plan présenté le 27/10/2026, Samuel commence par 5A. Toutes les suites de tests (30) avant chaque publication.
- [x] 5A. Performance (27/10/2026) : polices Big Shoulders Display et Manrope hébergées (`assets/fonts`, OFL), préchargées
  dans les 1 067 pages et le générateur des pages tournois, repli aux mêmes dimensions (size-adjust) ; bandeaux en
  640 / 960 / 1280 / 1600 px ; date des tournois avec sa place réservée. Labo (téléphone, 4G lente, CPU ×4) : LCP de
  2,5–3,7 s à 1,4–2,4 s, CLS de 0,05–0,08 à 0. Test : `scripts/verifier-performance.cjs` (budget LCP < 2,5 s, CLS < 0,02).
- [ ] Validation du 5A par Samuel.
- [ ] 5B. SEO des nouveautés : titres et descriptions des pages Tactique et Simulateur (quiz, tableau, labo,
  diagnostic), liens internes vers ces outils, règle « 3 pages liées » dans `verifier-seo.cjs`, sauts de titres.
- [ ] 5C. Search Console (vérification du domaine par DNS, à faire avec Samuel) puis suivi mensuel dans SEO.md.
- [ ] 5D. Contenus de novembre (SEO.md § 2) : débuter au padel, compter les points, le service ; règles vérifiées
  FFT/FIP, relues par Samuel.

## Phase 6 — Stabilisation
Parcours visiteur et connecté complets, clavier, contrastes, PWA, compatibilité (appareils réellement testés seulement).

---

## Archive : feuille de route v2 (26/10/2026)
Conservée pour mémoire. Remplacée par la v3 sur ces points : **C3** (pages `bandeja.html`, `vibora.html`…) devient
l'enrichissement des fiches 3D déjà indexées ; **C6** (suppression de videos.html et conseils.html) est abandonné ;
les **FAQ en FAQPage** du lot C sont abandonnées ; **V1** (badges, couleurs) est couvert par la phase 1.

### Mode d'emploi pour Claude Code
- Lis d'abord CLAUDE.md puis ANALYSE-STRATEGIE.md (le « pourquoi » de chaque tâche est dedans).
- Traite les tâches **dans l'ordre**, une à la fois. Pour chaque tâche : code → test (navigateur headless : 0 erreur console, 390 px sans débordement, interactions cliquées) → **un commit par tâche** (message en français, préfixé par le numéro de tâche) → coche la case ici avec la date et le hash.
- **Ne pousse jamais** (`git push` interdit) : Samuel publie lui-même.
- Délègue : contenu padel → `@agent-expert-padel`, visuel → `@agent-webdesigner`, JS/scripts → `@agent-dev-front`, relecture à la fin de chaque lot → `@agent-relecteur`.
- S'il te manque quelque chose (photo, compte externe, clé, décision) : marque `BLOQUÉ : <quoi>` et passe à la tâche suivante. Ne pose pas de question : décide dans l'esprit du site et note ton choix dans le Journal en bas.
- Supabase : tu n'exécutes rien toi-même. Écris le SQL dans `supabase/migrations/AAAA-MM-JJ-nom.sql` et liste-le dans le Journal (« SQL à exécuter »). **Important** : l'éditeur SQL de Supabase coupe les fonctions plpgsql sur les `;` internes si le corps est en `$$` sur une ligne complexe → écris chaque fonction avec un tag nommé (`$fn$ … $fn$`), une instruction par ligne, et un fichier par objet.
- Identité visuelle : garde les tokens de assets/style.css (thème nuit, Big Shoulders Display + Manrope). Les évolutions visuelles sont décrites dans le lot V, pas ailleurs.
- Toute nouvelle page générée sort d'un script (jamais à la main) et est ajoutée au sitemap par ce script.

### Décisions prises par Samuel (26/10/2026)
1. **Nom** : le site s'appelle désormais **« Apprendre Padel »** (= le domaine). Auteur visible : **Samuel**, joueur de droite, licencié FFT, compétiteur en P50/P100 en Normandie (Rouen). Pas de numéro de licence, pas de club nommé tant qu'il ne l'a pas confirmé. Photo : BLOQUÉ jusqu'à réception.
2. **Tournois** : une page par tournoi pour **toute la France**, en deux temps : Normandie + Île-de-France d'abord (validation du rendu), puis tout.
3. **Communauté** : « J'y vais », partenaires, et **avis après tournoi** limités à 3 questions structurées + un texte court filtré (pas de nom de personne, pas de coordonnées, pas d'insulte). Modération par les règles existantes (3 signalements = masqué, admin).

---

### Lot T — Le hub tournois (jours 1-30)

- [x] **T1. Script de génération `scripts/generer-pages.js`** (Node, sans dépendance). Lit `assets/data/tournois.json` + `assets/data/fiches/*.json` + `assets/js/bareme.js` et écrit : ✅ 26/10/2026, commit d5f989e (avec T2).
  - `tournoi/<id>.html` : une page par tournoi (voir T2 pour le contenu).
  - `tournois/<dep>.html` (ex. `tournois/76.html`) : liste du département, carte, filtres catégorie/sexe/date, H1 « Tournois de padel en Seine-Maritime ».
  - `tournois/<region>/<categorie>.html` (13 régions × P25…P1000) : H1 « Tournois de padel P25 en Normandie ».
  - `sitemap.xml` régénéré (toutes les pages, `lastmod`).
  Un gabarit HTML partagé (nav + footer identiques aux autres pages), aucun JS lourd par page, < 25 Ko par page. Lance-le d'abord sur les départements 76, 27, 14, 50, 61, 75, 77, 78, 91, 92, 93, 94, 95 ; vérifie 10 pages au hasard ; puis sur tout. Les pages des tournois terminés restent 60 jours (bandeau « Terminé »), puis passent en `noindex` et renvoient vers la page du département.

- [x] **T2. Contenu de la fiche tournoi** (gabarit de T1) : ✅ 26/10/2026, commit d5f989e (gabarit du générateur T1).
  - En-tête : badge de catégorie (couleurs : P25 vert, P50 turquoise, P100 jaune, P250 orange, P500 corail, P1000+ violet, à définir en tokens CSS et réutiliser partout), nom, club, ville, dates, distance « depuis chez toi » (département mémorisé en localStorage ou géoloc sur clic), boutons « S'inscrire sur Ten'Up » (lien vers `https://tenup.fft.fr/tournoi/<id>`) et « Ajouter à mon calendrier » (.ics).
  - « Ce que ça rapporte » : table du barème de la catégorie (réutiliser les données de bareme.js) en colonnes selon le nombre de paires ; si la fiche connaît la taille du tableau (`tableau`), surligner la colonne. Lien vers le simulateur.
  - Épreuves (code, libellé, cut, tarif, taille du tableau), juge-arbitre, balles, commentaire organisateur (données de `fiches/`), adresse + lien itinéraire.
  - « Se préparer » : 3 liens contextuels selon la catégorie (P25 → ton premier tournoi ; P100/P250 → gérer un point décisif, quand monter au filet ; mixte → tactique en mixte).
  - Emplacements vides prévus pour T4 (« Qui y va », annonces partenaires, avis).
  - Données structurées `SportsEvent` (nom, dates, lieu, organisateur), `BreadcrumbList`, meta description générée (« Tournoi de padel P100 à Rouen les 12-13 déc. 2026 : points, inscriptions, partenaires »).

- [x] **T3. Brancher le site sur les nouvelles pages** : chaque carte de `tournois.html` renvoie vers `tournoi/<id>.html` ; la nav « Tournois » renvoie vers la liste nationale ; la page d'accueil reçoit le bloc « Cette semaine près de chez toi » (5 tournois du département mémorisé, sinon carte de France cliquable). Supprime le détail en modale de tournois.html s'il fait doublon. ✅ 26/10/2026, commit 40af575.

- [x] **T4. Communauté sur la fiche** (SQL dans `supabase/migrations/`) : ✅ 26/10/2026, commit b748978. SQL à exécuter : supabase/migrations/2026-10-26-t4-01 à t4-12 (dans l'ordre), puis ajouter "communaute" à PA_SUPABASE.activees.
  - « J'y vais » (table `presences` : user_id, tournoi_id, unique ; RLS lecture pour tous les connectés, écriture pour soi) ; affichage des pseudos + classement déclaré ; compteur visible même déconnecté (via une fonction `security definer` qui ne renvoie que le nombre).
  - Annonces partenaires du tournoi (réutiliser `annonces`, filtrées par `tournoi_id`) affichées sur la fiche, avec le formulaire existant.
  - Avis après tournoi (table `avis` : organisation 1-5, niveau réel 1-5, « je recommande » oui/non, texte ≤ 300 caractères passé par `message_sans_contact()` + liste de mots interdits ; 1 avis par joueur et par tournoi ; visible après la date de fin ; signalement et modération comme `annonces`). Note moyenne du club calculée côté client à partir des avis de ses tournois.

- [x] **T5. Automatisation hebdomadaire** : `scripts/maj-hebdo.bat` (Windows) qui enchaîne robot Ten'Up → `generer-pages.js` → `git add` + `git commit` (pas de push). Documente dans README.md comment le planifier chaque lundi 6 h avec le Planificateur de tâches Windows. Ajoute au robot une **limite de politesse** (1 requête/s, User-Agent normal) et un mode `--departements 76,27` pour les tests. ✅ 26/10/2026, commit 2c621b5. User-Agent « normal » non fait : refusé par la sécurité (le robot reste identifiable).

- [ ] **T6. Second canal de données** : page `proposer-un-tournoi.html` (formulaire connecté : club, ville, catégorie, dates, lien d'inscription) → table `tournois_proposes` (RLS : écriture pour soi, lecture admin) ; l'admin valide depuis compte.html et le script de génération intègre les tournois validés. Objectif : ne plus dépendre uniquement du robot.

- [ ] **T7. Favoris + rappels** (ex-A3) : étoile sur les cartes et les fiches (localStorage + table `favoris` si connecté), section « Mes tournois » dans compte.html, fichier .ics avec rappel J-7. Dépend de T2.

- [x] **T8. Vérifier les cuts 2026/2027** : `@agent-expert-padel` compare les cuts affichés (P100 Top 3 000 / P250 Top 800 messieurs) au règlement FFT 2026/2027 (Chapitre I ou II, saison depuis le 1er septembre 2026 ; Padel Magazine annonce Top 2 000 / Top 500). Corrige compte.html, bareme.html et les fiches ; cite la source dans le Journal. ✅ 26/10/2026, commit 5fd5163 : valeurs relevées sur les fiches Ten'Up (champ « cut » de milliers d'épreuves).

### Lot M — Marque et confiance (jours 1-30, en parallèle de T)

- [x] **M1. Renommage « Apprendre Padel »** : `<title>`, logo texte de la nav (« Apprendre <span>Padel</span> »), footer, manifest PWA, og:site_name, mentions légales, README, CLAUDE.md. Garde « Padel Academy » nulle part, sauf une ligne dans mentions-legales.html (« anciennement Padel Academy »). ✅ 26/10/2026 (étape 4 : gabarit commun scripts/gabarit.js).
- [x] **M2. Bloc auteur** sur l'accueil et en pied de chaque page de contenu : « Écrit par Samuel, joueur de droite, licencié FFT, compétiteur en P50/P100 en Normandie. » Emplacement photo prévu (BLOQUÉ : photo). Données structurées `Person` reliées au `WebSite`. ✅ 26/10/2026 : bloc sur l'accueil (initiale « S » à la place de la photo, BLOQUÉ : photo), auteur dans le pied de chaque page, Person relié au WebSite.
- [ ] **M3. Accueil repensé** (voir ANALYSE-STRATEGIE.md § 4, écran 1) : bandeau « Cette semaine près de chez toi » (T3), trois gros boutons outils avec un chiffre vivant chacun, grille de 6 coups, « Le conseil de la semaine » (60 conseils courts rédigés par expert-padel, rotation hebdomadaire déterministe), bloc auteur. Le grand titre actuel descend en bas de page en signature.
- [ ] **M4. Convertisseur de niveau** `niveau-padel.html` : niveau Playtomic (1-7, auto-déclaré) ↔ niveau Ten'Up ↔ catégorie P (P25-P500) ↔ classement FFT approximatif, basé sur le test de niveau existant + une table de correspondance assumée comme indicative. H1 « Niveau padel 3, 4, 5 : ça veut dire quoi ? ». FAQ.
- [ ] **M5. Hub « Ton premier tournoi »** `premier-tournoi.html` : P25 c'est quoi, le cut, la licence (où, prix), s'inscrire sur Ten'Up pas à pas (captures d'écran du vrai parcours), quoi apporter, comment se passe une journée, les points, lien vers la liste des P25 du département. FAQ. Lié depuis chaque fiche P25.

### Lot C — Contenu qui répond à une recherche (jours 31-60)

Règle : une requête = une page = un H1 formulé comme la question, 700-900 mots, FAQ en `FAQPage`, 3 liens internes minimum, ajout au sitemap. Les pages thématiques existantes deviennent des sommaires qui renvoient vers ces pages.

- [ ] **C1. Barème par catégorie** : `bareme/p25.html` … `bareme/p3000.html` générées par script depuis bareme.js. H1 « Points P100 padel : barème selon le nombre de paires ». Chacune avec le calculateur préréglé.
- [ ] **C2. `cut-padel.html`** : le cut expliqué, par catégorie, messieurs/dames, avec exemples ; mis à jour avec T8.
- [ ] **C3. Pages de coups** : `bandeja.html`, `vibora.html`, `smash.html` (plat, par 3, par 4), `lob.html`, `volee.html`, `sortie-de-vitre.html`, `chiquita.html`, `service.html`. Contenu : quand / cible / risque, geste en 4 étapes (silhouettes du lot V), 3 erreurs, 2 exercices, une vidéo YouTube choisie et intégrée, FAQ, coups liés. `bandeja-ou-vibora.html` en comparatif.
- [ ] **C4. Rôles** : `joueur-de-gauche.html`, `joueur-de-droite.html` (tactique, raquette, exercices, erreurs).
- [ ] **C5. `s-entrainer-seul.html`** (vitre, service, échauffement sans partenaire, 20 min) et `coude-padel.html` (prévention, grip, poids de raquette, quand consulter ; sans diagnostic médical, renvoi vers un professionnel).
- [ ] **C6. Supprimer / fusionner** : `videos.html` supprimé (redirection vers technique.html, chaque vidéo intégrée dans sa page de coup) ; `conseils.html` fusionné (chaque erreur dans la page du coup concerné, redirection) ; `lexique.html` conservé mais chaque terme renvoie vers sa page.
- [ ] **C7. Fiches clubs** générées : `club/<slug>.html` à partir des clubs présents dans tournois.json (nom, ville, tournois à venir et passés, avis agrégés, lien Ten'Up), enrichies avec data.gouv.fr « Équipements sportifs » (nombre de terrains, intérieur/extérieur) si le jeu de données est exploitable sans effort démesuré. Normandie d'abord.
- [ ] **C8. Partenaires par ville** : `partenaire/<ville>.html` pour les 20 plus grandes villes (annonces filtrées + formulaire), H1 « Trouver un partenaire de padel à Lyon ».

### Lot V — Visuel signature (jours 31-90, en parallèle)

- [ ] **V1. Système de badges de catégorie** (couleurs de T2) + le terrain vu de dessus comme icône système (favicon, badges, fonds de section), le jaune de la balle réservé aux actions (bouton principal, élément sélectionné), le vert gardé pour la marque et le terrain. Audit de contraste AA après changement.
- [ ] **V2. Silhouettes de gestes** : pour chaque coup de C3, 4 vignettes SVG (préparation, armé, frappe, accompagnement), silhouette blanche trait épais, raquette verte, balle jaune, légende d'un mot ; version « erreur » barrée pour les 3 erreurs. Un seul fichier `assets/js/silhouettes.js` qui dessine à partir de données (pas 32 fichiers SVG à la main).
- [ ] **V3. Diagrammes animés** (tactique.html, tutos.html, pages de coups) : Web Animations API, balle + déplacements + corde qui se tend (vert → rouge), lecture/pause/rejouer, image fixe si `prefers-reduced-motion`.
- [ ] **V4. Carte de résultat à partager** (test de niveau, convertisseur, simulateur, compteur de match) : image 1080×1920 générée en canvas aux couleurs du site, Web Share API sinon téléchargement.
- [ ] **V5. Photos** — BLOQUÉ : photos de Samuel dans `assets/img/gestes/` (WebP, `loading="lazy"`, alt descriptif, étalonnage sombre cohérent).

### Lot R — Revenir chaque semaine (jours 61-90)

- [ ] **R1. Alertes e-mail hebdomadaires** : table `alertes` (zone département ou ville + rayon, catégories, sexe), UI dans compte.html, Edge Function `alertes-hebdo` (lundi 7 h) qui envoie les nouveaux tournois et les inscriptions qui ouvrent, via Resend. BLOQUÉ : compte Resend + clé + domaine d'envoi (documente la mise en route dans supabase/LISEZMOI.md).
- [ ] **R2. Carnet du joueur** : compte.html relie le compteur de match (historique, courbe, « ton point faible du mois »), les résultats saisis (simulateur), les favoris et les présences ; « ton prochain objectif » calculé (points manquants pour le palier suivant).
- [ ] **R3. Widget « prochains tournois du club »** : `widget.html?club=<slug>` intégrable en iframe + page `clubs.html` qui l'explique aux clubs (avec le code à copier). Pas de PDF.
- [ ] **R4. Passe SEO finale** : sitemap complet, maillage interne (chaque page → 3 pages liées), données structurées validées, titres et descriptions uniques, relecture `@agent-relecteur` de tout le site.

### Abandonné (voir ANALYSE-STRATEGIE.md § 6)
- Thème clair, kit club PDF, newsletter séparée (remplacée par R1), plan d'entraînement comme « produit » (reste une page), guide clubs Normandie écrit à la main (remplacé par C7 généré).

### Déjà fait (feuille de route v1)
- [x] A1. Compteur de match (`score.html`) — 26/10/2026, commit 172b3c0. SQL exécuté le 26/10 (table `matchs`).
- [x] A2. Tableau de bord « Mon padel » — 26/10/2026, commit c05699f. Cuts à vérifier : voir T8.
- [x] Audit technique, SEO de base, mentions légales, GoatCounter, mobile, domaine apprendre-padel.fr.

---

## Journal
(à compléter par Claude Code à la fin de chaque lot : fait, bloqué et pourquoi, SQL à exécuter, choix pris)

### 26/10/2026 — Lot T (T1 à T5), audit, étapes 0 et 1 de l'espace joueur
**Fait** : T1-T2 (d5f989e), T3 (40af575), T4 (b748978), T5 (2c621b5) ; puis, après l'audit demandé par Samuel : étape 0 (37b45ed) et étape 1 « espace joueur » (811f2cb). Publié jusqu'à T4 inclus ; T5 et les étapes 0-1 sont commités, non poussés.
**Bloqué / non fait** : T5, User-Agent « normal » du robot refusé par la sécurité (le robot reste identifiable). T6 à T8 et lots M, C, V, R : en attente, l'audit a réorienté les priorités (espace joueur, puis coach IA et Premium).
**SQL à exécuter (dans cet ordre, voir supabase/LISEZMOI.md)** : classements-01/02 ; quiz-01/02 ; favoris-01 à 03 puis "favoris" ; t4-01 à 12 puis "communaute" ; espace-01 à 06 puis "espace" (noms à ajouter dans PA_SUPABASE.activees, assets/js/supabase-config.js).
**Choix pris** : pages tournois générées pour Normandie + Île-de-France seulement (validation du rendu) ; T8 fait d'après les fiches Ten'Up (P100 top 5 000 M / 500 D, P250 top 1 000 M / 100 D) ; plus de push automatique dans la mise à jour hebdomadaire ; « Mon compte » devient « Mon espace » dans la nav.


### 26/10/2026 — Test de niveau v2 (demande de Samuel : « pas du tout réaliste »)
**Fait** : test refait en 14 questions. 5 repères (classement FFT, résultats en tournoi, ancienneté, fréquence, passé en raquette) puis 9 situations de match, réponses mélangées. 6 paliers, de Découverte à P1000 et +. Le classement fait foi, les résultats servent de plancher, l'ancienneté plafonne la technique, et sans tournoi le test s'arrête à P250. Profil par thème et 3 priorités. L'espace joueur (exercices) et Mon compte lisent les deux formats. Tests : scripts/verifier-niveau.cjs (13), verifier-corrections et verifier-exercices mis à jour.
**SQL à exécuter** : quiz-03 (colonne palier), quiz-04 (contrôle v2), quiz-05 (contrainte), puis "quiz2" dans PA_SUPABASE.activees. Avant ça, le test marche sur l'appareil mais ne propose pas l'enregistrement dans le profil.
**Choix pris** : repères de classement messieurs P1000+ ≤ 200e, P500 ≤ 1 000e, P250 ≤ 5 000e, P100 ≤ 15 000e (dames ÷ 10), cohérents avec les cuts relevés en T8. Les seuils 200 et 15 000 sont un choix, à ajuster si tu as de meilleurs repères.

### 26/10/2026 — Étape 4 : gabarit commun, « Apprendre Padel », bloc auteur
**Fait** : scripts/gabarit.js devient la seule source du menu et du pied de page. scripts/appliquer-gabarit.js les recopie dans les 22 pages de la racine (`--verifier` pour contrôler), et generer-pages.js s'en sert pour les 1 019 pages tournois (régénérées). M1 : renommage partout (titres, og:site_name, manifest, ics, CLAUDE.md, README, agents). « Padel Academy » ne reste que dans « anciennement Padel Academy » (mentions légales) et dans la chaîne YouTube Hello Padel Academy. M2 : bloc auteur sur l'accueil, auteur dans chaque pied de page, données Person. Test : verifier-pages (13).
**Bloqué** : photo de Samuel (l'initiale « S » tient la place).
**À voir** : le menu a 17 liens et passe sur deux lignes sur ordinateur. Le regrouper (Apprendre / Jouer / Tournois / Mon espace) simplifierait la navigation, c'est une décision de structure à prendre.

### 26/10/2026 — Menu regroupé (demande de Samuel)
**Fait** : le menu passe de 17 liens à 3 groupes + Mon espace + « Choisir sa raquette » :
- Apprendre : Technique, Tactique, Tutos, Règles, Conseils, Matériel, Vidéos, Lexique ;
- Progresser : Mon niveau, Entraînement, Compteur ;
- Tournois : Trouver un tournoi, Jouer en compétition, Barème des points, Trouver un partenaire.
Sur ordinateur, ce sont des menus déroulants (au clic et au survol ; Échap et un clic ailleurs les ferment), sur une seule ligne dès 861 px. Sur mobile, ce sont des accordéons, et le groupe de la page en cours est déplié. Corrigé au passage : le panneau mobile laissait voir la page dessous. Test : scripts/verifier-menu.cjs (9).

### 26/10/2026 — Correctif : menu mal affiché sur PC après publication
**Cause** : le cache hors connexion (sw.js, « stale-while-revalidate ») pouvait servir la nouvelle page avec l'ancien style.css, et le menu s'affichait en vrac. **Fait** : style.css et les scripts sont appelés avec `?v=<empreinte du contenu>` (gabarit.js, appliqué aux pages de la racine et aux pages générées). Le service worker précharge avec `cache: "reload"`, ne garde qu'une version par fichier et, hors connexion, sert la dernière connue. Test : scripts/verifier-cache.cjs (5) simule une publication avec le service worker actif.

### 27/10/2026 — Raquettes : 176 modèles, 21 marques, choix par marque (demande de Samuel)
**Fait** : la base passe de 65 à 176 raquettes (veille du 27/10 chez Padel Reference, Padelpoint, Decathlon et Bandeja Shop, une source par modèle). Ajout de Dunlop, Black Crown, Vibora, Royal Padel, Oxdog, Joma, Puma, Tecnifibre, Enebe et Lok, et de nombreux modèles chez les marques déjà présentes. Les modèles en rupture et ceux sans année vérifiable sont écartés (14). Sélecteur : « Marques préférées » (facultatif, plusieurs marques possibles, filtre strict, liste générée depuis la base) et « Voir les suivantes » (jusqu'à 12 de plus). Test : scripts/verifier-raquettes.cjs (6).
**À vérifier** : dans l'ancienne base, les revendeurs décrivent en 2026 la Siux Electra Pro comme une goutte (notée diamant) et la Diablo Pro comme hybride (notée ronde). Bullpadel, Siux et Star Vie vendent déjà leur gamme 2027 : à intégrer lors de la prochaine veille.

### 27/10/2026 — Coach IA abandonné (décision de Samuel)
L'étape 5 (coach IA : page, fonction Supabase, quota, base de connaissances, commit 51f5b07) a été annulée avant publication par un commit de retour en arrière ; elle reste dans l'historique git si l'idée revient. Seule la correction « test en 14 questions » des pages tournois est conservée.

### 27/10/2026 — v3, phase 1 : design system et accueil
**Fait** : palette de la marque en tokens (bleu nuit, bleu terrain, vert énergie, blanc froid), échelles et composants communs, menu avec « Tactique 3D », accueil « Progresse au padel, point après point. » avec vitrine du simulateur 3D (capture du simulateur), icônes et image de partage refaites, cache pa-v20. Corrigé au passage : débordements à 320 px (grilles, titres longs, page 404). Test : scripts/verifier-design.cjs (5) ; verifier-menu et verifier-profils mis à jour. Commit local, non poussé.
**Choix pris** : site sombre conservé ; le bleu terrain sert aux surfaces (trop sombre pour du texte sur le fond, 3,2:1), les liens prennent une version éclaircie (#5CB2E3) ; « Choisir sa raquette » s'affiche « Raquette » entre 861 et 1 180 px pour garder le menu sur une ligne ; couleurs du simulateur 3D inchangées jusqu'à la phase 3.
**À confirmer** : SQL Supabase exécuté ? (`activees` est vide en ligne).

### 27/10/2026 — v3, phase 2 : académie pédagogique
**Fait** : lots 2A à 2E (voir la phase 2 ci-dessus). Sources des règles : règlement FIP (révision du 28/11/2025) ; formats et temps de repos des tournois FFT d'après le résumé du Guide de la compétition 2026 publié par Padel Magazine (le guide officiel n'était pas accessible en ligne). Corrigé au passage : numéros de règles FIP cités, « point décisif systématique » (page Compétition), prix de cours non sourcé retiré, « P25 → P3000 ».
**Choix pris** : une seule page créée (premier-tournoi.html, au menu Compétition) ; gaucher, partenaire de niveau différent et analyse de match traités en sections de pages existantes ; chaque encadré « Exercice » cite un exercice réel de l'espace joueur, mot pour mot ; cache pa-v21.
**À relire par Samuel** : les passages d'expérience listés dans la phase 2.
