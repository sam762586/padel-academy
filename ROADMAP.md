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
- [x] Validation du 5A par Samuel (27/10/2026).
- [ ] Point ouvert (mesure en ligne après publication) : CLS 0 partout, mais LCP encore au-dessus de 2,5 s sur Tactique
  (3,7 s) et Tournois (3,5 s) ; le test local ne reproduit pas le coût réseau réel de ces pages (nombreux fichiers,
  données des tournois). À analyser plus tard (choix de Samuel : 5B d'abord).
- [x] 5B. SEO des nouveautés (27/10/2026) : titres et descriptions de tactique.html et simulateur-3d.html (quiz, tableau,
  diagnostic, labo), sommaire des outils en tête de ces pages, liens vers les outils depuis tutos, technique et
  entraînement, « À voir aussi » sur 4 pages peu reliées ; plan des titres corrigé sur 13 modèles de page (intertitres
  invisibles) ; `verifier-seo.cjs` : titres sans saut et 3 pages liées au moins (1 060 pages).
- [x] Validation du 5B par Samuel (27/10/2026).
- [x] 5C. Search Console (27/10/2026) : propriété « Domaine » vérifiée par TXT dans la zone DNS OVH (fait par Samuel,
  enregistrement contrôlé sur 8.8.8.8, 1.1.1.1 et ns103.ovh.net), sitemap envoyé.
- [ ] Suivi mensuel : tableau de SEO.md § 4 à remplir le 1er du mois (première ligne : 1er décembre 2026, données de
  novembre) ; relire alors les vrais LCP / CLS (point ouvert Tactique et Tournois).
- [x] 5D. Contenus de novembre (27/10/2026) : « compter les points » et « le service » étaient déjà couverts par
  regles.html (rien à ajouter) ; conseils.html enrichi d'« Avant ton premier match » (trouver un club, matériel minimal,
  règles du premier match), uniquement à partir des règles déjà vérifiées de regles.html et des conseils de
  materiel.html, H1 « Débuter au padel : les 20 erreurs à corriger ».
- [x] Relecture et validation du 5D par Samuel (27/10/2026), publié.

## Académie personnalisée — niveaux 1 à 10 (demande de Samuel du 27/10/2026)
Référence : grille « Niveaux Padel » de la FFT (PDF, juillet 2024), critères cités mot pour mot avec la source (validé
par Samuel). La grille 1 à 8 de la première demande est remplacée par celle-ci ; aucun système 1 à 8 n'existait.
Audit : 6 échelles déjà présentes (palier du test 0–5, niveau d'exercice 1–4, `quiz_results.niveau` 1–4,
`profiles.niveau_declare` 1–4, Débutant / Intermédiaire / Avancé des contenus, classement FFT) : gardées, jamais
converties. Architecture validée : Mon académie = parcours d'apprentissage, sans compte obligatoire (données sur
l'appareil) ; Mon espace = suivi sportif ; un seul moteur de recommandations. Aucun push, déploiement ni migration
en production sans accord explicite. Une phase à la fois, validée avant la suivante.
- [x] Phase 1 (27/10/2026) : `academie.html` (10 cartes : numéro, intitulé, critères FFT, compétences et scènes 3D
  proposées par le site, bouton de sélection), niveau déclaré et historique sur l'appareil (`pa-academie`), ancien test
  affiché à part ; « Mon académie » dans le menu S'entraîner (« Mon niveau » devient « Test de niveau »), accès depuis
  l'accueil. Test : `scripts/verifier-academie.cjs`.
- [x] Validation de la phase 1 par Samuel (27/10/2026).
- [x] Phase 2 (27/10/2026) : banque de 75 questions (`assets/js/academie-questions.js`, générée) : les 55 questions des
  scénarios classées par thème (11), niveaux 1–10, difficulté, prérequis (question précédente de la même scène),
  article, exercice et scène 3D ; 20 questions rédigées (règles, communication, placement, défense, construction, lob,
  víbora) reprises de phrases du site, en brouillon. Validées posables : 1:6 2:12 3:20 4:40 5:40 6:39 7:33 8:15 9:13 10:13.
  Test : `scripts/verifier-academie-questions.cjs`.
- [x] Relecture de Samuel (27/10/2026) : les 20 questions rédigées validées, classement des 55 questions accepté.
- [x] Phase 3 (27/10/2026) : quiz adaptatif dans Mon académie (`academie.html#quiz`) : 6 questions de référence au
  niveau N, puis 4 en découverte N+1 (5 bonnes sur 6 ou plus), consolidation N−1 (3 ou moins) ou au niveau N ; bornes 1
  et 10 ; thèmes variés, prérequis respectés, pas de question des 2 dernières séances tant que la banque le permet ;
  une question à la fois, schéma 2D pour les questions de scène, progression, reprise après interruption ; bilan
  (score, réussite par thème, erreurs expliquées, points forts, à renforcer, 3 recommandations avec exercice, article et
  scène 3D, « Refaire un quiz ») ; niveau déclaré jamais modifié. Test : `scripts/verifier-academie-quiz.cjs`.
- [x] Validation de la phase 3 par Samuel (27/10/2026).
- [x] Phase 4 (27/10/2026) : classement des contenus (`academie-contenus.js` : 24 sections d'articles, 30 exercices
  classés par règle, scènes 3D par leurs questions) ; parcours dans Mon académie (compétences à travailler, priorités
  choisies (3), articles, exercices, scènes 3D, défi de la semaine, historique) ; moteur d'exercices commun avec Mon
  espace (thèmes faibles des quiz en entrée), niveau d'exercice et défi tirés du niveau déclaré dans les deux pages ;
  lien de Mon espace vers l'académie. Test : `scripts/verifier-academie-parcours.cjs`.
- [x] Validation de la phase 4 par Samuel (27/10/2026), tableau de classement compris.
- [x] Phase 5 (27/10/2026) : choix du niveau en un toucher dès l'arrivée (10 boutons, puis « Changer de niveau »),
  sommaire de la page, reprise d'un quiz interrompu proposée en haut, niveau changé pendant un quiz signalé, messages si
  le stockage est bloqué ou si les questions ne se chargent pas. Test : `scripts/verifier-academie-ux.cjs`.
- [x] Validation de la phase 5 par Samuel (27/10/2026).
- [x] Phase 6 (27/10/2026) : migrations `2026-10-27-academie-01` à `-03` préparées, NON APPLIQUÉES (`academie_niveaux`,
  `academie_quiz`, RLS chacun ses lignes, aucune modification, 300 lignes au plus, cascade), vérifiées sur Postgres en
  mémoire (`scripts/verifier-academie-sql.mjs`, pglite installé hors package.json) ; synchronisation côté site à écrire
  plus tard ; Mon académie dans le test de performance ; quiz au clavier seul ; 38 suites de tests.
- [x] Validation de la phase 6 par Samuel et accord de publication (27/10/2026) : académie publiée.
- [x] Synchronisation côté site écrite (29/10/2026) : assets/js/academie-sync.js (union des niveaux par date et des quiz
  par séance ; appareil partagé : rien d'un compte n'est envoyé dans un autre), inactive tant que "academie" n'est pas
  dans activees ; testée sur deux appareils et deux comptes avec les vraies migrations (verifier-academie-sync.mjs).
- [x] 29/10/2026, à la demande de Samuel : espace-02 (fonction espace_limite_lignes) puis academie-01 à 03 exécutés dans le
  SQL Editor de production ; vérifié : fonction, 2 déclencheurs, RLS sur les 2 tables, 6 politiques. "academie" ajouté à
  activees.
- [x] Publication de l'activation (accord de Samuel, 29/10/2026).

## Expérience joueur personnalisée (audit du 27/10/2026, plan validé par Samuel)
Constats vérifiés : accueil en « 6 paliers » à côté du 1 à 10 (vrai) ; menu identique sur les 1 068 pages mais 9 libellés
pour le test de niveau ; plan 8 semaines commun à tous (vrai) ; Mon espace en 8 blocs, académie secondaire (vrai) ;
quiz reliés aux contenus seulement au bilan (vrai en partie) ; banque déséquilibrée (niveaux 8–10, difficulté 3).
Aucun push, déploiement ni migration sans accord ; aucune donnée effacée ; un lot à la fois.
- [x] Lot 0 (27/10/2026) : `scripts/verifier-parcours-joueurs.cjs` fige le comportement actuel : nouvel utilisateur,
  niveaux 2 / 5 / 8, connecté (Mon académie ne charge pas Supabase : aucune écriture en base), non connecté (Mon espace →
  connexion, académie sans compte), retour après 11 jours (tout conservé, nouveau défi, quiz sans répétition), données
  existantes jamais modifiées. À relancer à chaque lot.
- [x] Validation du lot 0 par Samuel (27/10/2026).
- [x] Lot 1 (27/10/2026) : accueil sans « 6 paliers » (le test estime une catégorie de tournoi, le niveau se choisit de 1 à
  10) ; tableau de bord « Mon niveau » en 4 lignes distinctes (niveau déclaré, quiz de l'académie, test de niveau,
  classement FFT, seul officiel), sans conversion ; fin du test : lien « Choisir mon niveau de 1 à 10 ».
- [x] Lot 2 (27/10/2026) : carte « Ta semaine » (apSemaine, academie-parcours.js) en haut de Mon académie et de Mon espace :
  niveau, prochain quiz, 3 priorités, 1 exercice (pas le défi), 1 scène 3D, objectif = défi de la semaine. Priorités
  complétées par les compétences des niveaux voisins quand le niveau en a moins de 4 (niveaux 1, 2, 3, 8, 9, 10).
- [x] Validation des lots 1 et 2 par Samuel (27/10/2026).
- [x] Lot 3b (27/10/2026) : les 120 questions de Samuel intégrées (texte tel quel, convertir-questions-samuel.py →
  academie-questions-samuel.json) : banque de 195 questions, 186 posées (niveau 8 : 17 → 28 ; niveau 10 : 13 → 21).
  3 thèmes ajoutés : Matériel, Compétition, Culture padel (articles materiel.html, competition.html, bareme.html,
  lexique.html ; pas d'exercice pour Matériel et Culture). Thème des questions [Technique] / [Tactique] : table THEMES_TT.
- [x] Les 9 questions de Samuel à fait daté ou chiffré vérifiées le 28/10/2026 (FIP, Premier Padel, barème FFT du site) et
  ouvertes au quiz (champ verification dans academie-questions-samuel.json).
- [x] Validation du lot 3b par Samuel (27/10/2026) ; les 9 brouillons attendent sa confirmation.
- [x] Lot 3a (27/10/2026) : « Pour revoir ce point » après chaque erreur (quiz de l'académie, quiz tactique, mode quiz
  3D) : section d'article du thème couvrant les niveaux de la question, exercice, scène 3D ; calculé par
  generer-academie-questions.mjs (champ revoir, assets/3d/revoir.json chargé à la première erreur dans le simulateur).
- [x] Validation du lot 3a par Samuel (27/10/2026).
- [x] Lot 4 (27/10/2026) : « Mon plan, à mon niveau » (mon-plan.js) au-dessus du plan générique inchangé : les mêmes
  8 semaines, celles des 3 priorités en tête (Semaine match toujours dernière), un exercice par semaine au niveau
  d'exercice (la 2e semaine « aérien » reçoit celui d'un niveau voisin, signalé : un seul exercice par thème et par
  niveau). Valider dans Mon plan coche la case du plan générique : même stockage, même synchronisation.
- [x] Validation du lot 4 par Samuel (27/10/2026).
- [ ] Lot 3b : 25 à 35 questions de plus (niveaux 8–10, vitres niveau 1, difficulté 3), en brouillon jusqu'à relecture.
- [x] Lot 5 (27/10/2026) : intitulés du test de niveau ramenés à « Test de niveau » / « Passer (Refaire) le test de
  niveau » (accueil, compte, tableau de bord, 942 pages tournois relibellées sans régénération) ; .btn.petit unique à la
  place de 7 réglages locaux ; un seul style de choix de réponse (test de niveau, quiz, mode quiz 3D) ; un seul style
  de bouton-lien ; verifier-design.cjs refuse les réglages locaux et les libellés hors liste.
- [x] Validation du lot 5 par Samuel et accord de publication (27/10/2026) : lots 0 à 5 publiés.

## Phase 6 — Stabilisation
Parcours visiteur et connecté complets, clavier, contrastes, PWA, compatibilité (appareils réellement testés seulement).

Bilan du 29/10/2026 (fait par erreur sur une ancienne branche, `feature/ux-parcours-joueur-v2`, puis reporté sur main dans `feature/stabilisation-main`) :
- [x] **6.0 Outillage** ✅ 29/10/2026, 03043769, e799cf8b : équipe d'agents et `scripts/tout-verifier.cjs`, copie de travail en LF (`.gitattributes`), Playwright 1.64.1, `_config.yml`, blocage réseau des suites en expression régulière (21 suites appelaient réellement jsDelivr et GoatCounter).
- [x] **6.1 Données personnelles des pages tournois** ✅ 29/10/2026, 3810fda2, c04b0962 : noms de juges-arbitres retirés (pages, fiches publiées, robot, exemples du code), adresses « Interdit au top… » écartées, villes (« Bagnoles de l'Orne »), `data-fin` échappé, note des périodes longues.
- [x] **6.2 Connexion et appareil partagé** ✅ 29/10/2026, 6abb69fe, 97c10755, e3396c8d, d25bee08 : case « J'ai 15 ans ou plus », messages annoncés, `error_description` jamais affiché, récupération du mot de passe sur `PASSWORD_RECOVERY`, anti-cadre (connexion, compte, espace, partenaires), données d'un autre compte jamais envoyées sans choix, effacement de l'appareil confirmé, cache pa-v39 avec `compte.js` versionné.
- [x] **6.3 Pages légales** ✅ 29/10/2026, 6822ef89 : confidentialité et mentions légales fidèles au site (académie, Google, jsDelivr, droits, CNIL, LCEN), opposition à GoatCounter, registre des photos.
- [x] **6.4 Accessibilité** ✅ 29/10/2026, 1a5bca43, c58f0456, 816f6e83 : lien d'évitement et `<main>`, focus visible du menu, bordures 3:1 (à recalculer pour #101F35), mouvement réduit global, cibles 44 px, clavier du test de niveau et du tuto « la paire », annonces (tutos, placement).
- [x] **6.5 Textes** ✅ 29/10/2026 : tutoiement des exercices (`exercices-donnees.js`), « reviens », libellés.
- [x] **6.6 Vitesse et sécurité** ✅ 29/10/2026, 69aa031f, aee0949b (2 P2 de la revue à corriger : déconnexion par lien forgé, pages ?code= en cache) : supabase-js hébergé sur le site (plus de jsDelivr), connexion en PKCE (lien piégé `#access_token`), `defer`, `srcset` des cartes.
- [x] **6.7 Communauté** ✅ 29/10/2026, de1e3863, 50555804, 288ddccf (SQL écrit, NON exécuté ; ordre pour Samuel dans supabase/LISEZMOI.md, section « Communauté (phase 6.7) ») : migrations s2-01 à s2-42, `tournois_ref`, JS de la communauté (reprenables de `feature/ux-parcours-joueur-v2`), puis contrôle `securite-sql` avec les migrations academie.

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
- [ ] **V4. Carte de résultat à partager** — EN COURS le 29/10/2026 sous la forme « Ma carte de joueur » (carte.html, direction « Néon » choisie par Samuel ; questionnaire 12 situations, notes ±5, photo sur l'appareil, export JPEG/WebP + partage ; galerie publique demandée par Samuel, prévue en 2e temps avec SQL et modération). Choix de Samuel : aucune phrase d'avertissement sur l'âge dans la page (la photo ne quitte pas l'appareil). Ancien libellé : (test de niveau, convertisseur, simulateur, compteur de match) : image 1080×1920 générée en canvas aux couleurs du site, Web Share API sinon téléchargement.
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

### 29/10/2026 — Phase 6, stabilisation (étapes 0 à 3)
**Fait** : voir 6.0 à 6.3. Les 39 suites passent (lancées en trois groupes : le passage d'un seul tenant a été arrêté faute de mémoire sur le poste).
**Erreur de méthode, corrigée** : le bilan et le lot S du matin ont été faits sur `feature/ux-parcours-joueur-v2`, partie du 27/10, sans les 79 commits de main (3D, académie, design v3). Rien de cette branche n'a été publié ; elle sert de référence pour les étapes 6.4 à 6.7.
**À faire par Samuel** : lire les CGU de Ten'Up dans un navigateur (enquête : republication non tranchée, avis d'avocat conseillé) ; confirmer l'adresse de contact des pages légales et l'identité communiquée à GitHub (LCEN) ; vérifier que pg_cron purge bien les annonces (la page annonce 30 jours) ; Supabase : « Confirm email », CAPTCHA, adresses de redirection limitées à apprendre-padel.fr.
**Choix pris** : noms de juges-arbitres retirés aussi des fichiers de données ; durées décidées (présences, avis 24 mois, comptes inactifs 3 ans) non affichées tant qu'elles ne sont pas codées ; case « 15 ans » déclarative ; cases « Effacer les données de cet appareil » décochées tant que tout n'est pas dans le compte ; réglage de qualité 3D conservé à la déconnexion.
**Publié le 29/10/2026** : phase 6, étapes 6.0 à 6.3, publiées à la demande de Samuel avant les corrections de textes signalées par la relecture (affirmations inexactes sur la synchronisation de l'espace joueur et du journal de matchs, liste de suppression du compte, durée des annonces, registre des photos) : corrigées dans la publication suivante.
**Publié le 29/10/2026 (2e publication)** : corrections de la relecture (synchronisation réelle annoncée sur connexion et espace, pages légales : matchs du compteur, liste de suppression du compte, déclaration d'âge datée, annonces, registre des photos) et retrait du prénom de l'auteur partout (décision de Samuel). Seconde relecture non faite, à la demande de Samuel.
**Publié le 29/10/2026 (3e publication)** : 6.4 accessibilité (lien d'évitement et main sur toutes les pages, focus visible, bordures 3:1, mouvement réduit, cibles 44 px, test de niveau, tutos, tactique et menu au clavier). 39 suites vertes.
**Publié le 29/10/2026 (4e publication)** : 6.5 textes (exercices au tutoiement, thèmes harmonisés, plus de « vous » pluriel). 39 suites vertes ; textes revus par expert-padel, sans passage du relecteur.
**Publié le 29/10/2026 (5e publication)** : 6.6 supabase-js hébergé (plus de jsDelivr), connexion en flux PKCE, defer, srcset, cache pa-v40. Supabase : Redirect URL `https://apprendre-padel.fr/connexion.html**` ajoutée (par Claude, dans le navigateur de Samuel), modèles d'e-mail vérifiés ({{ .ConfirmationURL }}). À tester en vrai par Samuel : inscription, lien magique, Google, mot de passe oublié.
**29/10/2026, validation de Samuel** : connexion testée en vrai après la 5e publication (inscription, lien magique, Google, mot de passe oublié, lien ouvert dans un autre navigateur) : « tout fonctionne ».
**Publié le 29/10/2026 (6e publication)** : correctifs P2 de la revue 6.6 (échange du code PKCE à la main, liens forgés sans effet, pages de retour hors du cache, sw.js pa-v41) et bug signalé par Samuel « je n'arrive plus à me déconnecter » (déconnexion de cet appareil seulement, terminée localement si le serveur ne connaît plus la session).
**29/10/2026, validation de Samuel** : déconnexion testée après la 6e publication (Chrome et téléphone : se déconnecter sur l'un laisse l'autre connecté, « Me déconnecter » fonctionne) : OK.
**Publié le 29/10/2026 (7e publication)** : 6.7 communauté (JS avec repli, 42 migrations dans le dépôt NON exécutées, générateur tournois_ref). Phase 6 terminée. Ouverture de la communauté : SQL à exécuter par Samuel (supabase/LISEZMOI.md, « Communauté (phase 6.7) »), puis confidentialite.html à compléter (activité Mon académie comptée pour la purge).
**Publié le 29/10/2026 (8e publication)** : « Ma carte de joueur » (carte.html, V4 première partie) : 12 situations, 6 notes ajustables, poste, photo sur l'appareil, carte Néon en 4 rangs, export WebP/JPEG et story, partage ; confidentialité à jour ; cache pa-v42. 42 suites vertes, relecture faite. Reste : galerie publique (2e temps, SQL + modération), à lancer sur demande de Samuel.

### 30/10/2026 — Modèles de carte, visiteurs en direct, compteur de cartes
**Fait** : 4 modèles de carte au choix (Néon, Blason inspiré des cartes de football mais dessin original, Stade, Vignette), validés par Samuel ; pastille « joueurs sur le site en ce moment » (Supabase Realtime Presence, accueil et page carte, sans donnée ni stockage) ; événement GoatCounter « carte-generee » et total public affiché (option « visitor counts » cochée par Samuel) ; confidentialité à jour ; cache pa-v43. 44 suites vertes.
**À faire par Samuel** : GoatCounter : tableau de bord visible par « N'importe qui » (à restreindre si non voulu) et conservation des données à 0 jour = illimitée (CNIL : 25 mois max).
**Publié le 30/10/2026 (9e publication).**
**Publié le 30/10/2026 (10e publication)** : bouton « Faire une nouvelle carte » (pour soi ou un ami, repère de niveau ignoré par défaut), « Refaire mes réponses » ; demande de Samuel (« ça me garde l'ancienne, toujours Élite »).
**Publié le 30/10/2026 (11e publication)** : carte de joueur libre (demande de Samuel) : plus de questionnaire, 6 notes de 1 à 99 au curseur, rang Bronze à Élite choisi librement, cartes v1 reprises. Lot V+ : étude des concurrents faite, maquettes d'accueil « Nocturne » et « Vitre » dans scripts/debug/ ; choix de Samuel en attente.
**Publié le 30/10/2026 (12e publication)** : lot V+ — accueil « Vitre » choisi par Samuel (scène du simulateur sans étiquettes, PADEL géant, terrain et balle, tableau de score réel via assets/data/stats.json, parcours en cartes de joueur) ; logo de Samuel (menu, accueil avec signature en texte, pied de page, icônes, image de partage) ; carte : une seule sans compte, illimité connecté. Choix : transition animée entre pages laissée désactivée (erreurs Edge au retour arrière). 44 suites OK.
**Publié le 30/10/2026 (13e publication)** : ouverture de la communauté. SQL exécuté dans le Chrome de Samuel (il a confirmé chaque avertissement Supabase) : t4-01…12, s2-01…23, s2-28, tournois_ref remplie (7 742 tournois depuis tournois.json), s2-24…42 ; contrôles OK (pseudos invalides 0, comptes inactifs 0). `"communaute"` ajouté à PA_SUPABASE.activees, fiches tournois régénérées, confidentialite.html à jour (purge programmée mais pas encore automatique). À faire : activer pg_cron pour la purge, puis passer la page confidentialité à « sont supprimés ».
**30/10/2026 — automatisation Supabase** : auto-01…03 exécutés dans le Chrome de Samuel à sa demande (pg_cron + http ; actualiser_tournois_ref() le mardi 5 h UTC ; purger_donnees() chaque nuit 3 h 30 UTC). Contrôle : 7 742 tournois actualisés, 0 compte inactif, 2 tâches planifiées. confidentialite.html : suppressions désormais « automatiques », paragraphe « pas encore automatique » retiré.
**Publié le 30/10/2026 (14e publication)** : purge et mise à jour hebdomadaire des tournois actives, page confidentialité à jour. 13 suites OK (pages, seo, connexion, securite-sql, design, contenus, communaute, clavier, menu, corrections, cache, json, accueil).
**30/10/2026 — bouton « Installer l'appli »** (demande de Samuel) : pied de page de toutes les pages, assets/js/pwa.js (invite Chrome/Edge/Android, message pour iPhone et iPad, caché si déjà installé), événement GoatCounter appli-installee, cache sw pa-v46-installer, suite verifier-installer (16 contrôles). 9 suites OK.
**Publié le 30/10/2026 (15e publication)** : bouton « Installer l'appli ». 13 suites OK (communaute relancée seule après une erreur réseau ERR_NO_BUFFER_SPACE de la machine).
**30/10/2026 — bilan complet** (7 agents + tests en ligne ; scripts/logs/bilan-2026-10-30.md, non commité) : 45/45 suites OK ; 4 P1 (promesses du compte contradictoires, appli-installee non déclaré, registre photos, fiches tournoi passées indexables). Corrigé dans ce lot : appli-installee et 3 clés de stockage dans confidentialite.html.
**30/10/2026 — « Mon club » sur la carte de joueur** (demande de Samuel) : champ facultatif (30 caractères) avec liste de 710 clubs (assets/data/clubs.json généré par generer-pages.js depuis tournois.json, 13,9 Ko), club dessiné sous le pseudo sur les 4 modèles et la story, gardé dans pa-carte (cartes anciennes inchangées) ; cache sw pa-v47-club ; pied de story « FAIS TA CARTE GRATUITEMENT » ; confidentialite.html à jour. verifier-carte : 36 contrôles.
**Publié le 30/10/2026 (16e publication)** : « Mon club » sur la carte, confidentialité complétée. 16 suites OK (carte, profils, accueil, pages, seo, contenus, cache, tournois, json, design, clavier, menu, corrections, performance, installer, parcours-joueurs) ; 45/45 au bilan du matin.
**Publié le 30/10/2026 (17e publication)** : compteur public des cartes corrigé (GoatCounter interrogé avec start=2026-01-01 : 4 au lieu de 1). Suites carte, profils, accueil, pages, cache OK.
**30/10/2026 — corrections du bilan (P1/P2 rapides)** : promesses du compte alignées sur le code (compte : profil, Mon académie, matchs du compteur, plan 8 semaines ; le reste sur l'appareil) sur accueil, compte, espace, connexion, académie, confidentialité ; « J'ai déjà un compte » → connexion ; P25 à P1000 partout ; typographie et relecture (index, niveau, matériel, espace, connexion, carte, confidentialité) ; simulateur 3D : mouvement réduit (pause, caméra sans glisser), curseurs ≥ 24 px, focus en contour ; « Mon club » à 40 caractères (742 clubs). 45/45 suites OK (connexion relancée seule après un délai sous charge). À décider : repère P25 « au-delà de 15 000e » alors que le P25 est fermé au top 30 000 (bareme-donnees.js) ; synchro du test de niveau (quiz2) non activée.
**Publié le 30/10/2026 (18e publication)** : corrections du bilan, club à 40 caractères. 45/45 suites OK.
**30/10/2026 — test de niveau dans le compte** : SQL quiz-01…05 exécuté (Samuel a cliqué Run ; contrôle : colonne palier, fonctions, contrainte, résultat v2 valide accepté). `"quiz2"` ajouté à PA_SUPABASE.activees (accord de Samuel), bouton « Enregistrer dans mon profil », textes du compte et confidentialité à jour. Repère P25 corrigé (top 30 000 / dames 3 000, cartes et moteur). À voir : retrait du consentement d'un seul résultat (seulement par suppression du compte aujourd'hui) ; meta d'espace.html « sauvegarde bientôt ».
**Publié le 30/10/2026 (19e publication)** : test de niveau dans le compte, repère P25. 23 suites OK (niveau, connexion, espace, parcours-joueurs, profils, pages, seo, contenus, cache, mon-padel, academie-sync, corrections, progression, tournois, communaute, presence, carte, accueil, design, menu, json, score).
**30/10/2026 — suppression d'un résultat de test et « Ma carte » dans le menu** : bouton « Supprimer » par résultat du test de niveau dans Mon compte (confirmation en page, delete vérifié, RLS quiz_delete contrôlée en production), confidentialité (retrait du consentement) ; meta d'espace.html exacte ; « Ma carte » en entrée directe du menu (sortie de S'entraîner), menu resserré sur ordinateur et nom du site masqué visuellement entre 861 et 1000 px pour tenir sur une ligne. Suites OK.
