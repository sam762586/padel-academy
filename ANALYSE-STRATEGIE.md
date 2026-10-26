# apprendre-padel.fr — Analyse et stratégie

*Analyse réalisée le 26 octobre 2026 sur le site en ligne (ordinateur et mobile 390 px), le code du projet, la concurrence et les requêtes Google réelles (Google Suggest, 85 amorces testées, fichier `strat/suggest.json`). Direct, sans jargon. Les sources sont en fin de document.*

---

## 1. Le diagnostic en 10 lignes

1. **Force : une largeur que personne d'autre n'a seul.** 20 pages, 5 outils interactifs (test de niveau, tutos, sélecteur de raquette, barème avec simulateur, compteur de match), 7 742 tournois de toute la France, un espace partenaires, des comptes. Aucun indépendant français n'a ça ; les boutiques ont du contenu mais pas d'outils, Ten'Up a les données mais pas de pédagogie.
2. **Force : des réponses personnalisées.** « Combien de points si je finis 5e d'un P100 à 16 paires » ou « quelle raquette pour moi à 150 € » : le site répond en 10 secondes là où la concurrence donne un article de 1 500 mots.
3. **Force : une identité visuelle propre et cohérente**, un vrai menu mobile, pas d'erreur technique, un barème exact et daté. Ça inspire confiance.
4. **Faiblesse n°1 : c'est une encyclopédie, pas un endroit où l'on apprend.** 22 coups sur une seule page, zéro photo, zéro vidéo intégrée, zéro visage. Pour un geste, le joueur part sur YouTube en 10 secondes et ne revient pas.
5. **Faiblesse n°2 : aucune preuve humaine.** On ne sait pas qui parle, à quel niveau il joue, dans quel club. Un joueur fait confiance à un joueur, pas à une « Academy » anonyme. Ni avis, ni témoignage, ni chiffre de fréquentation.
6. **Faiblesse n°3 : le plus gros atout est invisible.** 7 742 tournois enfermés dans une page de 400 Ko : pour Google, c'est **zéro** page de tournoi. Or « tournoi padel p25 lyon », « tournoi padel p100 ile de france », « tournoi padel p25 autour de moi » sont des recherches réelles auxquelles **personne** ne répond bien (vérifié : journaux locaux, offices de tourisme et HelloAsso ressortent ; Ten'Up n'est même pas indexé).
7. **Faiblesse n°4 : rien ne donne envie de revenir cette semaine.** Pas d'alerte, pas de « nouveau depuis ta dernière visite », pas de « ce week-end près de chez toi ». Sans compte, la visite est unique.
8. **Faiblesse n°5 : deux noms.** « Padel Academy » (utilisé par des dizaines de clubs et d'écoles) sur le site, `apprendre-padel.fr` dans l'adresse. Une marque, c'est un seul nom.
9. **Ce qui se copie en un après-midi** : lexique, règles, 10 erreurs, liens vidéos, plan 8 semaines, 22 fiches courtes. **Ce qui est rare** : le barème interactif selon le nombre de paires, la base tournois nationale géolocalisée, le sélecteur de raquette, les partenaires par tournoi, les tutos interactifs, le compteur de match.
10. **Ce qui manque pour devenir une référence** : une raison d'exister en une phrase, une page par question (et non une page par thème), et une boucle où les joueurs apportent eux-mêmes de la valeur (présence, avis, résultats) sans que tu aies à tout écrire.

---

## 2. L'idée signature

> **Chaque tournoi de padel de France a sa page vivante sur apprendre-padel.fr : ce qu'il rapporte, qui y va, avec qui jouer, comment s'y préparer.**

Personne ne fait ça. Ten'Up a les données brutes et une recherche, mais pas de pages publiques indexées, pas de points, pas de communauté. Les applis de calendrier (Padel Agenda Tournois) sont fermées sur mobile, sans contenu. Les médias et boutiques ne traitent que les gros tournois.

**À quoi ça ressemble à l'écran (la fiche tournoi)**
- En haut : badge de catégorie en gros (P100), nom, club, ville, dates, distance depuis chez toi, bouton « Voir sur Ten'Up » (inscription) et « Ajouter à mon calendrier ».
- Bloc « Ce que ça rapporte » : le barème de la catégorie, en colonnes selon le nombre de paires, ta place surlignée si tu as saisi ton objectif. Lien vers le simulateur.
- Bloc « Qui y va » : les joueurs du site qui ont cliqué « J'y vais » (pseudo, classement déclaré), et les annonces « cherche partenaire » de ce tournoi (déjà existantes).
- Bloc « Se préparer » : 3 liens contextuels selon la catégorie (premier P25 → « ton premier tournoi », P250 → « gérer un point décisif », mixte → « tactique en mixte »).
- Bloc « Après » : résultats et avis des joueurs (organisation, balles, horaires, niveau réel du tableau), note moyenne du club.
- Autour : pages d'agrégation automatiques « Tournois de padel P25 à Lyon », « Tournois de padel en Seine-Maritime ce mois-ci », « Tournois mixtes en Île-de-France », chacune avec sa liste et sa carte.

**Pourquoi les gens viendront**
Parce que c'est la recherche n°1 des compétiteurs (vérifié dans Google Suggest : « tournoi padel p25 autour de moi », « tournoi padel p25 ile de france / lyon / var », « tournoi padel p100 bordeaux / paris », « tournoi padel p25 points », « p250 padel quel niveau »). Un joueur qui cherche son prochain tournoi tombe sur ta page, y trouve ce que Ten'Up ne dit pas (points, niveau réel, partenaires), puis découvre les tutos.

**Comment ça se nourrit tout seul**
- Les données : le robot Ten'Up tourne chaque semaine, les pages se régénèrent, Google voit un site mis à jour.
- Les joueurs : « J'y vais » (1 clic), « cherche partenaire » (existe), « avis après tournoi » (3 questions, 30 secondes), résultat saisi (qui alimente le simulateur de classement). Chaque contribution rend la page plus utile pour le suivant.
- Les clubs : ils ont intérêt à partager « leur » page (plus d'inscrits) : c'est ton canal de liens entrants et de bouche-à-oreille.

**Pourquoi c'est difficile à copier**
Il faut à la fois le robot de collecte (salle d'attente Queue-it, pages serveur, un format qui change), le barème exact et à jour selon le nombre de paires, la génération de milliers de pages, et une communauté qui a commencé à contribuer. Un concurrent peut copier une page ; il ne rattrape pas un an de contributions ni l'antériorité Google sur 8 000 adresses. Ten'Up ne le fera pas (ce n'est pas son rôle), Playtomic ne gère pas les tournois FFT, les médias n'ont pas les données.

**Le second pilier, celui qui fait rester.** L'étude de concurrence le confirme : personne en France ne propose gratuitement *test de niveau → parcours → plan d'entraînement → carnet de match*. Tu as déjà les quatre briques. Reliées entre elles et branchées sur la fiche tournoi (« tu vises un P100 dans 6 semaines ? voici ton plan »), elles transforment le visiteur venu pour un tournoi en joueur qui revient chaque semaine. Les fiches tournois font venir, le parcours fait rester.

**Les contraintes sont respectées** : les pages sont générées en HTML statique par un script Node lancé après le robot (GitHub Pages accepte des dizaines de milliers de fichiers), les contributions passent par Supabase (tables + RLS, comme les annonces), rien n'est à écrire à la main.

---

## 3. Quinze améliorations classées

| # | Idée | Pour qui | Ce que ça change pour le joueur | Impact | Effort | Dur à copier |
|---|------|----------|--------------------------------|:------:|:------:|:------------:|
| 1 | **Une page par tournoi** (générée) + pages par ville / département / catégorie, dans le sitemap | Compétiteur, débutant qui cherche son 1er tournoi | Trouve le bon tournoi depuis Google, voit points et niveau avant de s'inscrire | 5 | 3 | oui |
| 2 | **« J'y vais » + avis après tournoi** sur chaque fiche | Compétiteur | Sait qui sera là et si le tournoi vaut le déplacement | 5 | 3 | oui |
| 3 | **Alertes hebdo par e-mail** (zone + catégorie + sexe) | Compétiteur, capitaine | Ne rate plus une ouverture d'inscriptions | 5 | 3 | oui |
| 4 | **Convertisseur de niveau** : niveau Playtomic (1-7) ↔ classement FFT ↔ catégorie P, à partir du test existant | Débutant, joueur loisir | Répond à « padel niveau 3 c'est quoi » et « p250 quel niveau », recherches très fréquentes | 4 | 2 | non |
| 5 | **Une page par coup** avec geste en 4 étapes, erreurs, exercices, vidéo intégrée, FAQ | Débutant, P100 | Apprend vraiment un geste sans partir sur YouTube | 4 | 3 | partiellement |
| 6 | **Rebaptiser le site « Apprendre Padel »** (= le domaine), avec un auteur visible : prénom, niveau, club, photo | Tous | Confiance immédiate, marque mémorisable, plus de confusion avec les clubs « Padel Academy » | 4 | 1 | non |
| 7 | **Hub « Ton premier tournoi »** : P25 c'est quoi, cut, inscription Ten'Up pas à pas, licence, quoi apporter, points | Débutant | Lève la peur du premier tournoi, l'amène vers la liste des tournois | 4 | 2 | non |
| 8 | **Fiche club** générée (nom, ville, terrains, tournois organisés, avis, lien Ten'Up) | Tous, local | Répond à « padel rouen prix », « club padel normandie » | 4 | 3 | partiellement |
| 9 | **Compteur de match → carnet du joueur** : historique, courbe de progression, « ton point faible du mois » | P100 qui veut monter | Une raison de revenir après chaque match | 4 | 3 | oui (avec la base de données) |
| 10 | **Carte de résultat à partager** (niveau, classement estimé, raquette) au format story | Tous | Chaque partage amène 2 ou 3 visiteurs gratuits | 3 | 2 | non |
| 11 | **« S'entraîner seul »** : page dédiée (vitre, service, échauffement sans partenaire) | Débutant, joueur sans partenaire | Requêtes réelles « padel entrainement seul », « exercice padel seul » sans bonne réponse | 3 | 1 | non |
| 12 | **Santé : coude, épaule, genou** avec un kiné ou un coach cité | P100+ qui joue 3 fois/semaine | « padel douleur coude », « tendinite padel » : fortes recherches, réponses médiocres | 3 | 2 | non |
| 13 | **Diagrammes animés** (balle, déplacements, corde) sur tactique et tutos | Tous | Comprend un placement en 5 secondes ; signature visuelle du site | 3 | 3 | partiellement |
| 14 | **Widget « prochains tournois du club »** à coller sur les sites de clubs | Clubs | Des liens entrants depuis des dizaines de sites de clubs | 3 | 2 | oui |
| 15 | **Rôle joueur de gauche / de droite** : 2 pages dédiées (tactique, raquette, exercices) | P100, P250 | « padel joueur de gauche », « tactique padel joueur de droite » : recherches précises, bien ciblées | 3 | 1 | non |

Lecture : commencer par 1, 6, 4, 7 (effort faible ou moyen, impact fort), puis 2, 3, 5.

---

## 4. La direction visuelle

**Ce qui rend le site reconnaissable au premier coup d'œil**
- **Le terrain vu de dessus comme signature.** Il existe déjà (hero, tactique, tutos). En faire le système graphique du site : chaque page, chaque outil, chaque carte a son mini-terrain (icône, badge de catégorie, fond de section). Pas un logo abstrait : le terrain, toujours le même dessin, toujours dans le même vert.
- **La balle jaune comme marqueur d'action.** Aujourd'hui tout est vert (texte, boutons, badges). Réserver le jaune de la balle (#f5f04a) à ce qui se touche : bouton principal, point actif sur un schéma, position sélectionnée. Le vert reste pour le terrain et la marque. L'œil sait immédiatement où cliquer.
- **Les gestes en silhouettes.** Pas de photos de stock : des silhouettes vectorielles blanches sur fond nuit, 4 par coup (préparation, armé, frappe, accompagnement), trait épais, raquette en vert, balle en jaune. Reconnaissable partout, cohérent avec l'identité, et ça se décline en animation et en image de partage.
- **La nuit sous les projecteurs, mais avec un éclairage.** Garder le fond nuit ; ajouter des halos de projecteurs plus marqués en haut des pages de contenu, et de vraies photos de terrain traitées sombres quand il y en aura. Le site doit ressembler à une session de 21 h sous les lumières, pas à un tableau de bord.
- **Les chiffres en gros.** Le site vit de chiffres (points, distance, prix, niveau). Les mettre en typographie display XXL partout où ils sont la réponse (comme le « 280 POINTS » du barème). Un joueur doit pouvoir lire la réponse de loin.

**Écran 1 — l'accueil repensé**
Trois zones, dans cet ordre, sans long hero :
1. *Bandeau « Cette semaine près de chez toi »* : département mémorisé (ou choix en un clic), 5 tournois à venir en cartes compactes (catégorie en badge coloré, ville, date, distance), bouton « Tous les tournois ». Si le département n'est pas connu : la carte de France cliquable.
2. *Trois outils, trois gros boutons* : « Quelle raquette ? », « Mon niveau », « Compter un match ». Chacun avec un chiffre vivant (« 60 raquettes », « 10 questions · 2 min », « 142 matchs comptés »).
3. *Apprendre* : une grille de 6 coups illustrés par leur silhouette, puis « Le conseil de la semaine » (une phrase, un lien), puis « Qui est derrière le site » (photo, prénom, niveau, club). Le titre « Le padel, du premier lob à la bandeja » passe en bas, en signature, plutôt qu'en hero de 60 % d'écran.

**Écran 2 — une page de coup (ex. bandeja)**
- En-tête : H1 « Comment faire une bandeja au padel ? », niveau (badge), « quand / cible / risque » en trois cases sur une ligne.
- Bande des 4 silhouettes, pleine largeur, légende d'un mot sous chacune ; au survol ou au tap, la phrase clé du geste.
- Mini-terrain animé à droite (ou sous, sur mobile) : le lob adverse, ton déplacement latéral, la bandeja croisée, la balle qui meurt dans la vitre. Boutons lecture / pause.
- Colonne « Les 3 erreurs » avec, pour chacune, silhouette fausse barrée / silhouette juste.
- « 2 exercices à faire au club » (durée, répétitions, avec qui).
- Vidéo intégrée (lien YouTube choisi, pas une recherche).
- FAQ (4 questions) et « Coups liés » (víbora, smash, lob) en cartes avec silhouette.
- Pied de page : « Testé par [prénom], P250 » : la preuve humaine.

**Écran 3 — l'outil phare : la fiche tournoi**
Décrite en section 2. Détails de dessin : le badge de catégorie est un carré de couleur (P25 vert, P50 turquoise, P100 jaune, P250 orange, P500 corail, P1000+ violet) repris partout dans le site (liste, carte, calendrier, cartes de l'accueil) pour que la catégorie se lise sans lire. La distance s'affiche en display XXL (« 12 km »). La table des points est celle du barème, colonne surlignée. « J'y vais » est un bouton jaune ; les avatars des joueurs présents sont des pastilles avec initiale et classement. Sur mobile, les trois actions (Ten'Up, calendrier, partenaire) sont fixées en bas d'écran.

---

## 5. Les contenus qui attireront depuis Google

Requêtes relevées dans Google Suggest le 26/10/2026 (France, français). Chaque ligne : la requête telle que les joueurs la tapent, la page à créer, et pourquoi elle peut être la meilleure réponse en français.

| # | Requête réelle | Page à créer | Pourquoi tu peux gagner |
|---|----------------|--------------|-------------------------|
| 1 | tournoi padel p25 autour de moi | `/tournois/p25/` + pages département | Aucun site n'y répond ; tu as les données géolocalisées |
| 2 | tournoi padel p25 ile de france (idem lyon, var, bordeaux, paris) | `/tournois/ile-de-france/p25/` (généré) | Résultats actuels = journaux et HelloAsso |
| 3 | tournoi padel p100 niveau | « Un P100, c'est quel niveau ? » | Tu as le cut, les points et le test de niveau |
| 4 | points padel p100 16 equipes / 8 equipes | `/bareme/p100/` (une page par catégorie) | Seuls des PDF de fédérations répondent aujourd'hui |
| 5 | p250 padel c est quoi / quel niveau | `/bareme/p250/` + convertisseur | Même chose, avec le cut Top 800 et les points |
| 6 | bareme padel septembre 2026 | `/bareme/` daté dans le titre | Les joueurs cherchent la version datée ; tu l'as |
| 7 | padel cut p25 / p100 / cut 2026 | `/cut-padel/` | Personne n'explique le cut simplement |
| 8 | comment faire une bandeja au padel | `/bandeja/` | Page dédiée avec geste en 4 étapes |
| 9 | padel bandeja ou vibora | `/bandeja-ou-vibora/` (comparatif) | Question précise, réponse en tableau |
| 10 | padel smash par 3 / par 4 | `/smash-par-3/` | Rien de clair en français |
| 11 | padel comment compter les points | `/compter-les-points/` + compteur | Réponse + outil |
| 12 | padel joueur de gauche / tactique padel joueur de droite | `/joueur-de-gauche/`, `/joueur-de-droite/` | Tu as déjà le contenu, dispersé |
| 13 | padel placement au filet / au service / au fond | `/placement/` découpé en 3 ancres | Diagrammes animés |
| 14 | padel entrainement seul / exercice padel seul | `/s-entrainer-seul/` | Aucune bonne page française |
| 15 | padel douleur coude / tendinite padel coude | `/coude-padel/` | Forte demande, réponses de boutiques |
| 16 | padel niveau 3 / 4 / 5 (Playtomic) | `/niveau-padel/` convertisseur | Réponse unique en France |
| 17 | quelle raquette de padel choisir débutant / intermédiaire | `/raquette-debutant/`, `/raquette-intermediaire/` | Sélecteur + 60 raquettes datées |
| 18 | raquette padel joueur de gauche / gaucher | `/raquette-joueur-de-gauche/` | Niche précise, personne ne la traite |
| 19 | trouver partenaire padel paris / lyon / lille… | `/partenaire/paris/` (généré par ville) | Tu as l'outil ; il faut des pages d'entrée |
| 20 | padel rouen prix / club padel normandie | fiches clubs générées | Local, ta région d'abord |

Règle : une requête = une page = un H1 formulé comme la question. Les pages thématiques actuelles (Technique, Tactique…) deviennent des sommaires qui renvoient vers ces pages.

---

## 6. Ce qu'il faut arrêter ou supprimer

- **« Vidéos »** en l'état : des liens de recherche YouTube n'apportent rien, ni au joueur ni à Google. Supprimer la page ; intégrer une vraie vidéo choisie dans chaque page de coup.
- **« Conseils » (10 erreurs)** : à fondre dans les pages de coups et de placement (chaque erreur à côté du geste concerné). La page seule est copiable et ne se positionne sur rien.
- **Le hero de l'accueil** à 60 % d'écran : joli, mais il cache les outils. L'accueil doit montrer ce qu'on peut faire, pas une phrase.
- **Le nom « Padel Academy »** : générique, déjà pris par des clubs, différent du domaine. Passer à « Apprendre Padel ».
- **Thème clair, kit club PDF, newsletter séparée** (dans la feuille de route) : à repousser. Tant que les fiches tournois et les alertes n'existent pas, ce sont des distractions.
- **Le plan 8 semaines** : à garder, mais arrêter de le présenter comme un produit ; c'est une page de contenu parmi d'autres.
- **Tout ajouter à la main** : chaque nouvelle page doit sortir d'un script (tournois, clubs, barèmes par catégorie, villes) ou être une vraie page de fond. Sinon le site ne sera jamais maintenu.

---

## 7. Le plan des 90 jours

**Jours 1-30 — Les fondations du hub tournois**
- Script de génération : une page par tournoi, par département, par catégorie × région ; fiches clubs ; pages barème par catégorie ; sitemap automatique.
- Robot Ten'Up planifié chaque lundi (Planificateur de tâches Windows), publication automatique.
- Renommage « Apprendre Padel » + bloc auteur sur l'accueil.
- Convertisseur de niveau + hub « Ton premier tournoi ».
- *Indicateur : 2 000 pages indexées dans Search Console et 50 clics Google par jour.*

**Jours 31-60 — La boucle communautaire**
- « J'y vais », avis après tournoi, résultats saisis depuis la fiche (SQL + RLS, comme les annonces).
- Alertes e-mail hebdomadaires (Resend) + favoris + fichier calendrier.
- Widget « prochains tournois du club » proposé à 10 clubs normands.
- *Indicateur : 150 comptes, 50 « J'y vais » par semaine, 5 clubs qui affichent le widget.*

**Jours 61-90 — Le contenu signature**
- 8 pages de coups avec silhouettes en 4 étapes, diagrammes animés, vidéo intégrée, FAQ.
- Pages joueur de gauche / de droite, s'entraîner seul, coude.
- Carte de résultat à partager ; carnet du joueur branché sur le compteur de match.
- *Indicateur : 5 pages dans le top 10 Google sur leurs requêtes, 500 visiteurs par semaine, 25 % de visiteurs qui reviennent (GoatCounter).*

---

## 8. La concurrence, vérifiée

*(section complétée à partir de l'étude détaillée, voir sources)*

**Méthode.** 18 acteurs étudiés le 26/10/2026 (pages lues directement, sauf mention « non vérifié »). Les chiffres sont ceux affichés par les sites eux-mêmes.

| Acteur | Ce qu'il fait | Ce qu'il fait mieux que toi | Le trou qu'il laisse |
|---|---|---|---|
| **Padel Magazine** (padelmagazine.fr) | Média quotidien : actu, interviews, « Tech & Tac », tests, annuaire pro, **liste de 3 843 tournois** (tournois.padelmagazine.fr), YouTube 41 400 abonnés | Volume, fraîcheur, réseau, notoriété | Tech & Tac = articles isolés, aucun outil. Sa liste de tournois n'a ni géolocalisation (filtres club/ligue/catégorie seulement), ni page par tournoi, ni points, ni source citée |
| **Univers Padel** (univers-padel.fr) | ~2 000 produits notés /100, baromètres de prix, pages par coup, barème, carte de 2 000+ clubs (OpenStreetMap) | Base matériel exhaustive | Pédagogie statique orientée achat (affiliation Amazon) ; pas de test, de parcours ni de simulateur |
| **Padel Speak** (padelspeak.com) | Codes promo, comparatifs, barème P25→P3000, annuaire 900+ clubs, classements | Référencement sur le barème et les codes promo | Aucun tutoriel technique ou tactique, aucun outil interactif |
| **Padel Reference** (blog boutique) | ~30 articles (Progresser / Compétitions / Infos pratiques), rythme faible | Vend les raquettes | Profondeur quasi nulle ; article Ten'Up de 3 minutes sans capture |
| **Padel Nuestro FR** | 82 articles raquettes, 47 analyses, 20 conseils, traduit de l'espagnol | Catalogue | Tactique inexistante, texte non rédigé en français |
| **Padelya** (padelya.fr) | Recherche de partenaires dans 10 grandes villes (niveau 1-10, dispos), annuaire coachs, quelques guides | Effet réseau en ville | Rien sur les tournois ni les clubs ; vide hors grandes villes |
| **Smatchup** (smatchup.fr) | Plateforme d'organisation : inscription, paiement, poules, partenaire par tournoi ; 250+ tournois, 2 300 joueurs depuis 01/2026 ; clubs à 10 €/tournoi | Inscription intégrée | Ne couvre que ses tournois ; zéro pédagogie |
| **PadelTournoiManager** | Logiciel juge-arbitre (05/2026), pages SEO « organiser un P25 », barème | Outil club | Rien pour le joueur |
| **Ten'Up** (FFT) | Appli officielle : réservation, tournois « près de chez vous », classement, **simulation de classement** (derrière connexion), 7 800 clubs ; 4,6/5 sur ~88 000 notes | Source officielle, inscription | Tout derrière un compte, pages de tournois **non indexées par Google** (vérifié), aucune pédagogie, pas d'API |
| **Playtomic** (non lu, bloqué) | Réservation + matchmatching + niveau 1-7 ; les applis FR se positionnent « en complément » | Réservation, niveau auto-évalué | Pas de tournois FFT, pas d'apprentissage. À traiter comme une infrastructure, pas un concurrent |
| **PadelNow** (appli, site HS) | Réservation + matchmaking + compétitions + stats ; commission par réservation | — | Jeune, traction inconnue |
| **Padel Agenda Tournois / Padel Calendriers** (applis iOS) | Calendrier des tournois par département, favoris, rappel 30 jours | Simplicité mobile | Fermé dans une appli, invisible pour Google, aucun contenu |
| **Applis de score** (7 sur l'App Store FR) | Compteurs de points, certains Apple Watch | Marché saturé | Aucune ne relie le score à une progression ou à un contenu |
| **The Padel School** (EN) | Parcours par niveau, défis hebdo, journal, 426 000 abonnés YouTube, payant | La pédagogie de référence mondiale | **Anglais seulement**, payant |
| **YouTube FR** | Jules Marie 135 000 (matchs), Esprit Padel Shop 33 200 (coaching + boutique), vlogs | Vidéo | **Aucune chaîne française de coaching indépendante d'une boutique** |
| **Communautés FR** | Aucun forum ou Discord francophone structuré (seul un fil sur forum.hardware.fr) | — | Trou réel, mais piège sans masse critique |

**Les cinq choses que personne ne fait bien en français (vérifié)**
1. Un parcours d'apprentissage gratuit et progressif (débutant → classé). Les sites FR publient des articles isolés ; seule The Padel School le fait, en anglais et payant.
2. Un test de niveau relié aux repères réels (P25/P100, niveau Playtomic). Aucun site FR n'en a.
3. Un simulateur de classement public et expliqué (« quart en P250 = combien de points, quels tournois viser »). Le barème statique est partout ; la simulation Ten'Up est derrière connexion.
4. Un plan d'entraînement sans coach. Rien en français.
5. Une pédagogie indépendante du commerce : tous les sites FR sauf Padel Magazine sont des boutiques ou des sites de codes promo.

**Où ne pas se battre** : l'actualité (Padel Magazine), la réservation et le niveau de jeu (Playtomic), l'inscription et la gestion de tournois (Ten'Up, Smatchup, Moja), la base matériel exhaustive (Univers Padel), la vidéo de masse (The Padel School, chaînes espagnoles).

**Ce que l'étude conclut pour un indépendant sans budget** : posséder le combo *test de niveau → parcours → plan → carnet de match*, les outils calculables (simulateur, convertisseur de niveau, « quel tournoi viser »), le guide « mon premier tournoi » de bout en bout, un sélecteur de raquette neutre, et la niche locale Normandie. Elle juge la liste nationale de tournois **contestée** (Ten'Up, Padel Magazine, Smatchup, applis) et déconseille de la garder « comme produit autonome ».

**Mon arbitrage (voir section 2)** : les concurrents ont des *listes*, pas des *pages*. Aucun ne répond aux recherches réelles « tournoi padel p25 + ville » (vérifié : ni Ten'Up, ni Padel Magazine, ni les applis ne ressortent dans Google). La fiche tournoi n'est donc pas une liste de plus : c'est l'outil calculable (points) + la communauté + le parcours, rassemblés à l'endroit exact où le joueur cherche. Elle reste l'idée signature, à une condition : **réduire la dépendance au robot Ten'Up**. Padel Magazine collecte visiblement les mêmes données sans citer de source, ce qui montre une pratique tolérée, mais pas garantie. Parade : lier systématiquement vers Ten'Up pour l'inscription, ne reprendre que les données factuelles (nom, catégorie, dates, club), ne jamais copier les descriptions, garder une cadence modérée, et prévoir dès le départ un second canal (les clubs déposent eux-mêmes leurs tournois via un formulaire, et le widget « tournois du club » les y incite). Si la FFT demande l'arrêt du robot, les pages continuent de vivre avec les contributions des clubs et des joueurs.

**Données réutilisables sans robot** : data.gouv.fr « Équipements sportifs » (recensement national, terrains de padel géolocalisés, licence ouverte) pour les fiches clubs ; OpenStreetMap (`sport=padel`) pour la carte ; le barème FFT (règlement public) ; les vidéos YouTube intégrables des chaînes citées.

---

## Sources

- Google Suggest (autocomplétion), France, 26/10/2026 : 85 amorces, résultats bruts dans `strat/suggest.json`.
- Recherche Google « tournoi padel p25 lyon » (26/10/2026) : aucun site spécialisé dans les 10 premiers résultats (Lyon Capitale, offices de tourisme, HelloAsso).
- Recherche « points padel p100 16 équipes » : seuls des PDF de fédérations (AFP Belgique, ligues régionales) répondent.
- Recherche `site:tenup.fft.fr tournoi padel` : aucune page de tournoi Ten'Up indexée.
- Barème FFT 2026/2027 : règlement Chapitre II (voir bareme.html).
- Étude de concurrence (26/10/2026) : padelmagazine.fr et tournois.padelmagazine.fr, univers-padel.fr, padelspeak.com, padelreference.com/blog, padelnuestro.com/fr/blog, padelya.fr, smatchup.fr, padeltournoimanager.fr, thepadelschool.com, padeladdict.com, fiche App Store Ten'Up (id1457871907), PadelNow (id6743403759), applis de score App Store FR, thehiveindex.com, forum.hardware.fr, data.gouv.fr « Équipements sportifs ». Non lisibles : playtomic.io, tenup.fft.fr (hors recherche), padelio.app, padel-now.co.

---

## Trois questions pour transformer cette analyse en feuille de route

1. **Le nom.** Es-tu d'accord pour passer de « Padel Academy » à « Apprendre Padel » (le domaine), et pour apparaître comme auteur avec ton prénom, ton niveau et ton club ? Sans visage, la partie « confiance » ne marchera pas.
2. **L'ambition sur les tournois.** On part sur « une page par tournoi pour toute la France » dès le premier mois (plusieurs milliers de pages, robot automatisé chaque lundi), ou on commence par la Normandie et les 5 plus grandes régions ? La première option va plus vite pour Google, la seconde est plus facile à surveiller.
3. **La communauté.** Es-tu prêt à modérer des avis publics de joueurs sur des clubs et des tournois (et à répondre aux clubs mécontents), ou veut-on limiter la communauté à « J'y vais » et aux partenaires ? Ça change la conception des tables et de la charte.
