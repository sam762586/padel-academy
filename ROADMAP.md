# Feuille de route v2 — apprendre-padel.fr (issue de ANALYSE-STRATEGIE.md)

## Mode d'emploi pour Claude Code
- Lis d'abord CLAUDE.md puis ANALYSE-STRATEGIE.md (le « pourquoi » de chaque tâche est dedans).
- Traite les tâches **dans l'ordre**, une à la fois. Pour chaque tâche : code → test (navigateur headless : 0 erreur console, 390 px sans débordement, interactions cliquées) → **un commit par tâche** (message en français, préfixé par le numéro de tâche) → coche la case ici avec la date et le hash.
- **Ne pousse jamais** (`git push` interdit) : Samuel publie lui-même.
- Délègue : contenu padel → `@agent-expert-padel`, visuel → `@agent-webdesigner`, JS/scripts → `@agent-dev-front`, relecture à la fin de chaque lot → `@agent-relecteur`.
- S'il te manque quelque chose (photo, compte externe, clé, décision) : marque `BLOQUÉ : <quoi>` et passe à la tâche suivante. Ne pose pas de question : décide dans l'esprit du site et note ton choix dans le Journal en bas.
- Supabase : tu n'exécutes rien toi-même. Écris le SQL dans `supabase/migrations/AAAA-MM-JJ-nom.sql` et liste-le dans le Journal (« SQL à exécuter »). **Important** : l'éditeur SQL de Supabase coupe les fonctions plpgsql sur les `;` internes si le corps est en `$$` sur une ligne complexe → écris chaque fonction avec un tag nommé (`$fn$ … $fn$`), une instruction par ligne, et un fichier par objet.
- Identité visuelle : garde les tokens de assets/style.css (thème nuit, Big Shoulders Display + Manrope). Les évolutions visuelles sont décrites dans le lot V, pas ailleurs.
- Toute nouvelle page générée sort d'un script (jamais à la main) et est ajoutée au sitemap par ce script.

## Décisions prises par Samuel (26/10/2026)
1. **Nom** : le site s'appelle désormais **« Apprendre Padel »** (= le domaine). Auteur visible : **Samuel**, joueur de droite, licencié FFT, compétiteur en P50/P100 en Normandie (Rouen). Pas de numéro de licence, pas de club nommé tant qu'il ne l'a pas confirmé. Photo : BLOQUÉ jusqu'à réception.
2. **Tournois** : une page par tournoi pour **toute la France**, en deux temps : Normandie + Île-de-France d'abord (validation du rendu), puis tout.
3. **Communauté** : « J'y vais », partenaires, et **avis après tournoi** limités à 3 questions structurées + un texte court filtré (pas de nom de personne, pas de coordonnées, pas d'insulte). Modération par les règles existantes (3 signalements = masqué, admin).

---

## Lot T — Le hub tournois (jours 1-30)

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

## Lot M — Marque et confiance (jours 1-30, en parallèle de T)

- [ ] **M1. Renommage « Apprendre Padel »** : `<title>`, logo texte de la nav (« Apprendre <span>Padel</span> »), footer, manifest PWA, og:site_name, mentions légales, README, CLAUDE.md. Garde « Padel Academy » nulle part, sauf une ligne dans mentions-legales.html (« anciennement Padel Academy »).
- [ ] **M2. Bloc auteur** sur l'accueil et en pied de chaque page de contenu : « Écrit par Samuel, joueur de droite, licencié FFT, compétiteur en P50/P100 en Normandie. » Emplacement photo prévu (BLOQUÉ : photo). Données structurées `Person` reliées au `WebSite`.
- [ ] **M3. Accueil repensé** (voir ANALYSE-STRATEGIE.md § 4, écran 1) : bandeau « Cette semaine près de chez toi » (T3), trois gros boutons outils avec un chiffre vivant chacun, grille de 6 coups, « Le conseil de la semaine » (60 conseils courts rédigés par expert-padel, rotation hebdomadaire déterministe), bloc auteur. Le grand titre actuel descend en bas de page en signature.
- [ ] **M4. Convertisseur de niveau** `niveau-padel.html` : niveau Playtomic (1-7, auto-déclaré) ↔ niveau Ten'Up ↔ catégorie P (P25-P500) ↔ classement FFT approximatif, basé sur le test de niveau existant + une table de correspondance assumée comme indicative. H1 « Niveau padel 3, 4, 5 : ça veut dire quoi ? ». FAQ.
- [ ] **M5. Hub « Ton premier tournoi »** `premier-tournoi.html` : P25 c'est quoi, le cut, la licence (où, prix), s'inscrire sur Ten'Up pas à pas (captures d'écran du vrai parcours), quoi apporter, comment se passe une journée, les points, lien vers la liste des P25 du département. FAQ. Lié depuis chaque fiche P25.

## Lot C — Contenu qui répond à une recherche (jours 31-60)

Règle : une requête = une page = un H1 formulé comme la question, 700-900 mots, FAQ en `FAQPage`, 3 liens internes minimum, ajout au sitemap. Les pages thématiques existantes deviennent des sommaires qui renvoient vers ces pages.

- [ ] **C1. Barème par catégorie** : `bareme/p25.html` … `bareme/p3000.html` générées par script depuis bareme.js. H1 « Points P100 padel : barème selon le nombre de paires ». Chacune avec le calculateur préréglé.
- [ ] **C2. `cut-padel.html`** : le cut expliqué, par catégorie, messieurs/dames, avec exemples ; mis à jour avec T8.
- [ ] **C3. Pages de coups** : `bandeja.html`, `vibora.html`, `smash.html` (plat, par 3, par 4), `lob.html`, `volee.html`, `sortie-de-vitre.html`, `chiquita.html`, `service.html`. Contenu : quand / cible / risque, geste en 4 étapes (silhouettes du lot V), 3 erreurs, 2 exercices, une vidéo YouTube choisie et intégrée, FAQ, coups liés. `bandeja-ou-vibora.html` en comparatif.
- [ ] **C4. Rôles** : `joueur-de-gauche.html`, `joueur-de-droite.html` (tactique, raquette, exercices, erreurs).
- [ ] **C5. `s-entrainer-seul.html`** (vitre, service, échauffement sans partenaire, 20 min) et `coude-padel.html` (prévention, grip, poids de raquette, quand consulter ; sans diagnostic médical, renvoi vers un professionnel).
- [ ] **C6. Supprimer / fusionner** : `videos.html` supprimé (redirection vers technique.html, chaque vidéo intégrée dans sa page de coup) ; `conseils.html` fusionné (chaque erreur dans la page du coup concerné, redirection) ; `lexique.html` conservé mais chaque terme renvoie vers sa page.
- [ ] **C7. Fiches clubs** générées : `club/<slug>.html` à partir des clubs présents dans tournois.json (nom, ville, tournois à venir et passés, avis agrégés, lien Ten'Up), enrichies avec data.gouv.fr « Équipements sportifs » (nombre de terrains, intérieur/extérieur) si le jeu de données est exploitable sans effort démesuré. Normandie d'abord.
- [ ] **C8. Partenaires par ville** : `partenaire/<ville>.html` pour les 20 plus grandes villes (annonces filtrées + formulaire), H1 « Trouver un partenaire de padel à Lyon ».

## Lot V — Visuel signature (jours 31-90, en parallèle)

- [ ] **V1. Système de badges de catégorie** (couleurs de T2) + le terrain vu de dessus comme icône système (favicon, badges, fonds de section), le jaune de la balle réservé aux actions (bouton principal, élément sélectionné), le vert gardé pour la marque et le terrain. Audit de contraste AA après changement.
- [ ] **V2. Silhouettes de gestes** : pour chaque coup de C3, 4 vignettes SVG (préparation, armé, frappe, accompagnement), silhouette blanche trait épais, raquette verte, balle jaune, légende d'un mot ; version « erreur » barrée pour les 3 erreurs. Un seul fichier `assets/js/silhouettes.js` qui dessine à partir de données (pas 32 fichiers SVG à la main).
- [ ] **V3. Diagrammes animés** (tactique.html, tutos.html, pages de coups) : Web Animations API, balle + déplacements + corde qui se tend (vert → rouge), lecture/pause/rejouer, image fixe si `prefers-reduced-motion`.
- [ ] **V4. Carte de résultat à partager** (test de niveau, convertisseur, simulateur, compteur de match) : image 1080×1920 générée en canvas aux couleurs du site, Web Share API sinon téléchargement.
- [ ] **V5. Photos** — BLOQUÉ : photos de Samuel dans `assets/img/gestes/` (WebP, `loading="lazy"`, alt descriptif, étalonnage sombre cohérent).

## Lot R — Revenir chaque semaine (jours 61-90)

- [ ] **R1. Alertes e-mail hebdomadaires** : table `alertes` (zone département ou ville + rayon, catégories, sexe), UI dans compte.html, Edge Function `alertes-hebdo` (lundi 7 h) qui envoie les nouveaux tournois et les inscriptions qui ouvrent, via Resend. BLOQUÉ : compte Resend + clé + domaine d'envoi (documente la mise en route dans supabase/LISEZMOI.md).
- [ ] **R2. Carnet du joueur** : compte.html relie le compteur de match (historique, courbe, « ton point faible du mois »), les résultats saisis (simulateur), les favoris et les présences ; « ton prochain objectif » calculé (points manquants pour le palier suivant).
- [ ] **R3. Widget « prochains tournois du club »** : `widget.html?club=<slug>` intégrable en iframe + page `clubs.html` qui l'explique aux clubs (avec le code à copier). Pas de PDF.
- [ ] **R4. Passe SEO finale** : sitemap complet, maillage interne (chaque page → 3 pages liées), données structurées validées, titres et descriptions uniques, relecture `@agent-relecteur` de tout le site.

## Abandonné (voir ANALYSE-STRATEGIE.md § 6)
- Thème clair, kit club PDF, newsletter séparée (remplacée par R1), plan d'entraînement comme « produit » (reste une page), guide clubs Normandie écrit à la main (remplacé par C7 généré).

## Déjà fait (feuille de route v1)
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

