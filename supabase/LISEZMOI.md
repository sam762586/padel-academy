# Activer les comptes joueurs (phase 1)

Tant que ces étapes ne sont pas faites, le site fonctionne normalement et la page « Mon compte » indique que les comptes ne sont pas activés.

1. **Créer le projet** sur https://supabase.com, avec une région UE (par exemple Frankfurt ou Paris). Note le mot de passe de la base quelque part.
2. **Créer les tables** : menu *SQL Editor*, colle tout le contenu de `supabase/schema.sql`, puis *Run*. Tu peux le relancer sans risque.
3. **Régler les URLs** : *Authentication > URL Configuration*.
   - Site URL : `https://apprendre-padel.fr/`
   - Redirect URLs : depuis le passage en flux PKCE (6.6), tous les liens reviennent sur `connexion.html` : voir la section « Connexion en flux PKCE » ci-dessous. Conserve aussi l’ancienne URL GitHub Pages si elle est encore utilisée.
4. **Copier les clés** : *Project Settings > API*. Recopie « Project URL » et la clé `anon` (publique) dans `assets/js/supabase-config.js`. Ne copie JAMAIS la clé `service_role`.
5. **Tester en local** : dans le dossier du site, lance `npx serve -l 3000`, puis ouvre http://localhost:3000/compte.html. En double-cliquant sur le fichier (file://), les comptes restent désactivés : c'est voulu.
6. **SMTP avant l'ouverture au public** : le serveur d'e-mails par défaut de Supabase est limité à quelques e-mails par heure. Configure un SMTP (Brevo ou Resend) dans *Project Settings > Authentication > SMTP Settings*.
7. **Pause du projet gratuit** : sans activité pendant environ 7 jours, le projet gratuit se met en pause. Le site continue de marcher, mais les comptes sont indisponibles jusqu'à ce que tu le relances depuis le tableau de bord Supabase.

# Connexion en flux PKCE (sécurité, 6.6)

Depuis la phase 6.6, `assets/js/compte.js` crée le client avec `flowType: "pkce"`. Une session ne s'ouvre plus qu'avec un `?code=` renvoyé par Supabase et échangé contre un secret (le « code_verifier ») gardé dans le navigateur qui a fait la demande. Un lien piégé `…#access_token=…&refresh_token=…` (jetons du compte d'un autre) n'ouvre plus rien : il est effacé de l'adresse. Contrepartie : **un lien reçu par e-mail ne marche que dans le navigateur où la demande a été faite** (sinon, message « Ouvre le lien dans le même navigateur que celui où tu as fait la demande, ou redemande un lien »).

À vérifier dans le tableau de bord Supabase (rien n'est à changer dans le SQL) :

1. *Authentication > URL Configuration* :
   - Site URL : `https://apprendre-padel.fr/`
   - Redirect URLs : `https://apprendre-padel.fr/connexion.html` **avec ses paramètres**. Le plus simple : `https://apprendre-padel.fr/connexion.html**` (le site ajoute `?suite=…`, `?confirme=1&suite=compte.html` ou `?mode=nouveau`). Ajoute aussi `https://www.apprendre-padel.fr/connexion.html**` si le domaine avec www sert le site, et pour les essais locaux `http://localhost:3000/connexion.html**`. L'ancienne entrée `…/compte.html` peut rester (inoffensive) ou être retirée.
   - Si une adresse de retour n'est pas autorisée, Supabase renvoie vers la Site URL : l'accueil transmet alors le `?code=` à `connexion.html`, mais le mode « nouveau mot de passe » et la page de suite sont perdus. D'où l'intérêt d'autoriser `connexion.html**`.
2. *Authentication > Email Templates* : chaque modèle (Confirm signup, Magic Link, Reset Password, Change Email Address, Invite user) doit utiliser `{{ .ConfirmationURL }}` pour le lien (c'est le cas des modèles d'origine). Un modèle personnalisé qui construit son lien avec `{{ .Token }}`, `{{ .TokenHash }}` ou `{{ .SiteURL }}#access_token…` ne marchera plus.
3. *Authentication > Providers > Google* : rien à changer ; l'URL de rappel autorisée chez Google reste `https://bvhfizdfgccrkhdfqzkf.supabase.co/auth/v1/callback`.
4. Les e-mails envoyés **avant** la publication (anciens liens vers `compte.html#access_token=…`) ne marchent plus : il suffit de redemander un lien.

Test manuel à faire après publication (sur https://apprendre-padel.fr, fenêtre privée de préférence) :

| Parcours | Même navigateur que la demande | Autre navigateur (ou autre appareil) |
|---|---|---|
| Inscription : créer un compte, cliquer le lien de confirmation | Connecté, arrivée sur `compte.html?bienvenue=1` | Message « Ton e-mail est confirmé. Connecte-toi… » ; la connexion par mot de passe marche |
| Lien magique (« Recevoir un lien de connexion par e-mail » sous le formulaire de connexion) | Connecté, arrivée sur la page de suite (espace par défaut) | Message « Ouvre le lien dans le même navigateur… », pas de session |
| Continuer avec Google | Connecté (compte neuf : `compte.html?bienvenue=1`) | Sans objet (tout se passe dans le même onglet) |
| Mot de passe oublié : demander le lien, cliquer | Formulaire « Nouveau mot de passe », enregistrement, connecté | Message « Ouvre le lien dans le même navigateur… », pas de formulaire |

Contrôles complémentaires : recliquer un lien déjà utilisé → message « Ce lien n'a pas pu ouvrir ta session (déjà utilisé, ou ouvert dans un autre navigateur)… » ; ouvrir `https://apprendre-padel.fr/connexion.html?mode=nouveau` à la main → pas de formulaire ; ouvrir `https://apprendre-padel.fr/academie.html#access_token=x&refresh_token=y` → l'adresse est nettoyée, aucune connexion. Dans l'outil réseau du navigateur, l'échange du code apparaît comme `POST …/auth/v1/token?grant_type=pkce`.

# Activer « Trouver un partenaire » (phase 2)

Prérequis : les étapes ci-dessus sont faites (comptes actifs, `schema.sql` exécuté). Tant que ce qui suit n'est pas fait, la page `partenaires.html` s'affiche mais les requêtes sont refusées et un message « fonction pas encore activée » apparaît.

1. **Créer les tables** : *SQL Editor*, colle tout le contenu de `supabase/schema-partenaires.sql`, puis *Run*. À lancer APRÈS `schema.sql`. Tu peux le relancer sans risque. Il crée `annonces`, `reponses` et `signalements`, ajoute 4 colonnes à `profiles` (`is_admin`, `age_confirme_at`, `charte_acceptee_at`, `charte_version`) et active les règles RLS.
2. **Te donner le rôle admin** (une seule fois, à la main). Le rôle ne peut pas être modifié depuis le site, seulement depuis le SQL Editor. Remplace l'adresse par celle de ton compte :

   ```sql
   update public.profiles set is_admin = true
   where id = (select id from auth.users where email = 'toi@exemple.fr');
   ```

   Une fois reconnecté, la section « Modération (admin) » apparaît en bas de `partenaires.html`. Pour retirer le rôle : même requête avec `false`.
3. **Purge automatique (optionnel)** : la fonction `purger_annonces()` supprime les annonces dont le tournoi est fini depuis plus de 30 jours (avec leurs réponses et signalements). Pour la lancer chaque lundi à 3 h : *Database > Extensions*, active `pg_cron`, puis dans le SQL Editor :

   ```sql
   select cron.schedule('purger-annonces', '0 3 * * 1', $$select public.purger_annonces()$$);
   ```

   Sans pg_cron, les annonces passées restent invisibles dans les listes, mais ne sont effacées de la base que si tu lances `select public.purger_annonces();` à la main de temps en temps. Pour arrêter le job : `select cron.unschedule('purger-annonces');`.
4. **Vérifier** : connecte-toi, renseigne un pseudo dans *Mon compte*, ouvre `partenaires.html`, choisis un tournoi et publie une annonce. Contrôle ensuite dans *Table Editor* que `annonces`, `reponses` et `signalements` affichent bien « RLS enabled ».

Notes :
- Les signalements : 3 joueurs différents masquent l'annonce automatiquement ; « Rétablir » (admin) efface les signalements de l'annonce.
- Suppression de compte : `delete_my_account()` n'a pas besoin de changement, les annonces, réponses et signalements partent en cascade.
- Les messages des annonces sont filtrés (e-mail, téléphone, liens) côté navigateur ET par une contrainte SQL. Les réponses privées ne sont pas filtrées : c'est le canal pour échanger ses coordonnées.

# Validation des résultats du quiz

Après le schéma initial, appliquer `supabase/migrations/2026-10-26-quiz-01-fonction-quiz-resultat-valide.sql` puis `2026-10-26-quiz-02-contrainte-quiz-resultat-coherent.sql` dans le SQL Editor. Cette migration contrôle le score (0 à 30), sa cohérence avec le niveau et les réponses fournies. Elle ne supprime ni ne réécrit les résultats existants. La contrainte `NOT VALID` contrôle les nouvelles écritures ; les anciennes lignes sont à examiner avant validation globale. Cette migration doit aussi être appliquée sur une nouvelle base.

Test de niveau v2 (6 paliers, de Découverte à P1000 et +) : `2026-10-26-quiz-03` ajoute la colonne `palier`, `-04` crée le contrôle `quiz_resultat_valide_v2` (il reprend l'ancien contrôle pour les résultats sans palier), `-05` fait pointer la contrainte dessus. Ajoute ensuite `"quiz2"` à `PA_SUPABASE.activees`. Avant ça, le nouveau test fonctionne entièrement sur l'appareil (et dans l'espace joueur), mais le bouton « Enregistrer dans mon profil » n'apparaît pas.

# Sauvegarde des matchs du compteur (score.html)

Le compteur fonctionne sans compte : les matchs restent sur l'appareil. Pour que les joueurs connectés retrouvent leurs matchs sur tous leurs appareils, applique `supabase/migrations/20261026_matchs.sql` dans le SQL Editor (après `schema.sql`, relançable sans risque). Il crée la table `matchs` avec les règles RLS (chacun ne voit que ses matchs, pas de modification après enregistrement). Tant que ce n'est pas fait, la fin de match affiche « La sauvegarde des matchs n'est pas encore activée » et le match reste enregistré sur l'appareil. Suppression de compte : les matchs partent en cascade, `delete_my_account()` ne change pas.

# Favoris tournois (tournois.html)

Les favoris ★ fonctionnent sans compte (gardés sur l'appareil). Pour qu'un joueur connecté les retrouve sur tous ses appareils, applique `supabase/migrations/2026-10-26-favoris-01-table.sql`, puis `-02-fonction-favoris-limite.sql` et `-03-trigger.sql` dans le SQL Editor (après `schema.sql`, relançable sans risque) : table `favoris` (clé : joueur + identifiant Ten'Up), RLS, 500 favoris maximum par joueur. Tant que ce n'est pas fait, la page Tournois affiche que les favoris ne sont pas synchronisés et les garde sur l'appareil. Suppression de compte : cascade, rien à changer.

# Activer une fonction après avoir exécuté son SQL

Le site n'appelle une table que si son nom figure dans `window.PA_SUPABASE.activees` (fin de `assets/js/supabase-config.js`). Tant qu'il manque, rien n'est demandé à Supabase : pas d'erreur 404 dans la console des visiteurs. Après avoir exécuté le SQL d'une fonction, ajoute son nom puis publie :

```js
window.PA_SUPABASE.activees = ["favoris", "communaute"];
```

- `"favoris"` : `supabase/migrations/2026-10-26-favoris-01-table.sql`, puis `-02-fonction-favoris-limite.sql` et `-03-trigger.sql` (étoiles des tournois synchronisées avec le compte).
- `"communaute"` : les 12 fichiers `supabase/migrations/2026-10-26-t4-01-…` à `t4-12-…`, **dans l'ordre des numéros** (« J'y vais », annonces et avis sur les fiches tournois, modération des avis dans Mon compte), **puis** les 42 fichiers `2026-10-29-s2-01-…` à `s2-42-…` (voir « Stabilisation S2 » et « S2 bis ») ; à n'ajouter que lorsque `tournois_ref` est remplie (avec nom, ville, catégorie, département) et que le site a été adapté à S2 bis.

# Communauté sur les fiches tournois (T4)

Prérequis : `schema.sql` et `schema-partenaires.sql` déjà exécutés (fonctions `est_admin`, `message_sans_contact`, `accepter_charte`).
Exécute les fichiers `2026-10-26-t4-01` à `t4-12` un par un dans le SQL Editor (un fichier = un objet ; les fonctions utilisent le tag `$fn$`). Ils sont relançables sans risque. Puis ajoute `"communaute"` à la liste ci-dessus.

- `presences` : « J'y vais ». Après S2, chacun ne lit que ses lignes ; la liste d'un tournoi passe par `presences_tournoi()` (connectés) ; le nombre est visible par tous via `nb_presences()`.
- `annonces` (existante) : le nombre d'annonces d'un tournoi est visible par tous via `nb_annonces_tournoi()`, le contenu reste réservé aux connectés.
- `avis` : 3 questions + texte de 300 caractères maximum, filtré (`avis_texte_correct()` : pas de contact, pas d'insulte). Un avis par joueur et par tournoi, possible dès le premier jour du tournoi, visible par tous après la fin. 3 signalements de joueurs différents masquent l'avis (`signaler_avis()`) ; l'admin voit les avis signalés dans Mon compte et peut les masquer, les rétablir ou les supprimer (`admin_moderer_avis()`).
- Suppression de compte : tout part en cascade.

# Catégories P de la saison 2026/2027

Depuis le 1er septembre 2026, le P1500 est devenu P2000 et l'ancien P2000 est devenu P3000. Exécute `2026-10-26-classements-01-profiles.sql` puis `2026-10-26-classements-02-annonces.sql` : les valeurs déjà saisies sont converties et la liste autorisée devient P25, P50, P100, P250, P500, P1000, P2000, P3000 (celle du formulaire de profil).

# Ordre conseillé pour tout le SQL en attente (format `$fn$`, un objet par fichier)

1. `2026-10-26-classements-01` et `-02` ;
2. `2026-10-26-quiz-01` à `-05`, puis ajoute `"quiz2"` à `PA_SUPABASE.activees` ;
3. `2026-10-26-favoris-01` à `-03`, puis ajoute `"favoris"` à `PA_SUPABASE.activees` ;
4. `2026-10-26-t4-01` à `-12`, puis `2026-10-29-s2-01` à `-23` et `s2-28` (section « Stabilisation S2 » : remplir `tournois_ref`), puis `2026-10-29-s2-24` à `-42` (section « S2 bis » : **après** la publication du site adapté par dev-front), puis seulement ajoute `"communaute"` à `PA_SUPABASE.activees`.
5. `2026-10-26-espace-01` à `-06`, puis ajoute `"espace"` à `PA_SUPABASE.activees`.
6. `2026-10-26-journal-01` à `-03` (après `20261026_matchs.sql`, déjà exécuté), puis ajoute `"journal"` à `PA_SUPABASE.activees`.
7. `2026-10-27-progression-01` et `-02` (après les migrations espace), puis ajoute `"progression"` à `PA_SUPABASE.activees`.
8. `2026-10-27-diagnostic-01` et `-02` (après les migrations journal), puis ajoute `"diagnostic"` à `PA_SUPABASE.activees`.

# Espace joueur (espace.html)

`2026-10-26-espace-01` à `-06` (après `classements-01`) : tables `resultats_tournois` (résultats du simulateur du barème) et `objectifs`, 300 lignes au maximum par joueur, et colonnes `rang_fft`, `rang_sexe`, `rang_maj` dans `profiles`. Chaque joueur ne voit que ses lignes (RLS). Ajoute ensuite `"espace"` à `PA_SUPABASE.activees`.

Tant que ce n'est pas fait, l'espace joueur marche entièrement sur l'appareil. Une fois activé, `assets/js/joueur-sync.js` fusionne l'appareil et le compte à chaque visite de l'espace ou de Mon compte (fusion à trois voies : un ajout, une modification ou une suppression d'un côté est reporté de l'autre ; pour le rang, la saisie la plus récente gagne).

# Journal de matchs (espace joueur)

`2026-10-26-journal-01` à `-03` complètent la table `matchs` : identifiant `cle` (un match du téléphone n'est jamais copié deux fois ; les anciens matchs prennent leur `id`), `partenaire`, `type_match` (amical, tournoi, entraînement), `saisie` (compteur ou manuelle) ; la liste des points peut être vide pour un match saisi après coup. Ajoute ensuite `"journal"` à `PA_SUPABASE.activees`.

Le compte sert d'archive : effacer l'historique du compteur sur un téléphone ne supprime rien dans le compte. Seule la suppression d'un match depuis le journal de l'espace joueur l'efface partout (mise en attente si le téléphone est hors connexion).

# Progression (tableau de bord de l'espace joueur)

`2026-10-27-progression-01` crée la table `objectifs_jeu` (objectifs de jeu choisis dans l'espace : défense, sorties de vitre, volées, bandeja, placement, fautes directes, préparer un tournoi), avec RLS : chaque joueur ne lit et ne modifie que ses lignes. `-02` ajoute la limite de 300 lignes (fonction commune `espace_limite_lignes`). À exécuter après les migrations espace (avec `"espace"` dans `activees`), puis ajoute `"progression"`. Avant ça, les objectifs de jeu, le programme de la semaine et le tableau de bord fonctionnent sur l'appareil.

# Diagnostic après match (bilan)

`2026-10-27-diagnostic-01` ajoute la colonne `diagnostic` (objet JSON limité) à la table `matchs` : le bilan reste attaché à son match, sans second journal. `-02` ajoute la règle qui manquait pour modifier une ligne de `matchs` : chaque joueur peut modifier ses propres matchs, et uniquement la colonne `diagnostic` (le score et les points restent figés). À exécuter après les migrations journal, puis ajoute `"diagnostic"` (avec `"journal"`). Avant ça, les bilans sont gardés sur l'appareil.

# Mon académie (niveau déclaré et quiz) — APPLIQUÉ EN PRODUCTION LE 29/10/2026

(Texte de préparation conservé pour l'historique ; les étapes sont dans la section suivante, `"academie"` est activé.)

`2026-10-27-academie-01` à `-03` créent `academie_niveaux` (historique des niveaux déclarés, 1 à 10 de la grille FFT)
et `academie_quiz` (séances terminées du quiz adaptatif), avec le garde-fou de 300 lignes par joueur (fonction
`espace_limite_lignes` de `espace-02`). Chaque joueur ne voit, n'ajoute et ne supprime que ses lignes ; rien n'est
modifiable après coup ; la suppression du compte efface tout en cascade. Ce niveau est une autre échelle que
`quiz_results.niveau` et `profiles.niveau_declare` (1 à 4) : aucune conversion, aucune donnée existante touchée.

**Ne pas exécuter sans l'accord de Samuel.** Ces migrations sont vérifiées hors ligne sur un Postgres en mémoire
(`scripts/verifier-academie-sql.mjs`). La synchronisation côté site (copier `pa-academie` et `pa-academie-quiz` vers ces
tables) reste à écrire : tant qu'elle ne l'est pas, Mon académie marche entièrement sur l'appareil, et ajouter
"academie" à `PA_SUPABASE.activees` n'aurait aucun effet.

# Mon académie : niveau et quiz dans le compte

Sans cette étape, Mon académie marche comme avant : le niveau déclaré et les quiz restent sur l'appareil. Avec elle, un
joueur connecté retrouve son niveau (1 à 10) et ses quiz terminés sur tous ses appareils.

1. **Prérequis** : la fonction `espace_limite_lignes` doit exister (migration `2026-10-26-espace-02-fonction-limite-lignes.sql`).
   Pour le savoir, lance dans le *SQL Editor* : `select proname from pg_proc where proname = 'espace_limite_lignes';`
   Une ligne : c'est bon. Aucune ligne : exécute d'abord `2026-10-26-espace-02-fonction-limite-lignes.sql`.
2. **Exécute, dans l'ordre**, `2026-10-27-academie-01-table-niveaux.sql`, `-02-table-quiz.sql`, `-03-triggers-limites.sql`.
   Ils sont relançables sans risque et ne touchent à aucune table existante.
3. **Préviens Claude** (ou ajoute toi-même `"academie"` à `window.PA_SUPABASE.activees` dans `assets/js/supabase-config.js`),
   puis publie le site.

Ce que fait le site (`assets/js/academie-sync.js`) : union des choix de niveau (par date) et des quiz terminés (par
séance) entre l'appareil et le compte ; le niveau actuel est le choix le plus récent. Les tables n'acceptent que des
ajouts : rien n'est jamais modifié ni effacé, sauf à la suppression du compte (cascade). Sur un appareil partagé, ce qui a
déjà été synchronisé avec un compte n'est jamais envoyé dans un autre. Tests : `scripts/verifier-academie-sync.mjs`
(deux appareils, deux comptes, vrai Postgres en mémoire avec ces migrations).

# Communauté (phase 6.7) : ordre complet pour Samuel

Résumé des sections « Stabilisation S2 » et « S2 bis » ci-dessous (le détail de chaque fichier y est). Rien de ceci ne
touche aux tables de Mon académie (`academie_niveaux`, `academie_quiz`, déjà en production) : S2 n'utilise ni ne remplace
`espace_limite_lignes` (ses quotas passent par une autre fonction, `limite_lignes_joueur`) ; la suite
`scripts/verifier-securite-sql.cjs` rejoue academie-01 à 03 dans l'ordre de production avant les fichiers S2 et le vérifie.

1. **Prérequis** (SQL Editor) : `select 'é' ~ '[[:alnum:]]';` → `true` ; les 12 fichiers `2026-10-26-t4-01` à `-12`
   exécutés (sinon : les exécuter d'abord, dans l'ordre, sans activer `"communaute"`). Contrôle :
   `select count(*) from pg_tables where schemaname = 'public' and tablename in ('presences','avis','signalements_avis');` → `3`.
2. **S2** : `2026-10-29-s2-01` à `s2-23`, un par un, dans l'ordre. Sans effet visible sur le site en ligne
   (`"communaute"` n'est pas activé ; `partenaires.html` continue de marcher).
3. **`s2-28` tout de suite après** (`2026-10-29-s2-28-colonnes-tournois-ref`) : il ne fait qu'ajouter les colonnes
   facultatives `nom`, `ville`, `categorie`, `dep` à `tournois_ref`, dont les fichiers de remplissage ont besoin.
4. **Remplir `tournois_ref`** : coller `supabase/donnees/tournois-ref-01.sql`, `-02.sql`… dans l'ordre (étape 3 de
   « Stabilisation S2 »). Contrôle : `select count(*) as total, count(nom) as avec_nom from public.tournois_ref;`.
5. **Attendre la publication du site adapté** (`partenaires.js` et `communaute-tournoi.js` par dev-front) : **le
   JavaScript de `partenaires.js` doit être en ligne AVANT `s2-39` et `s2-40`** (sinon la page partenaires ne peut plus
   lire ni publier d'annonces), et avant `s2-25` et `s2-29` (messages d'erreur).
6. **S2 bis** : `s2-24` à `s2-42`, un par un, dans l'ordre (relancer `s2-28` est sans risque). Vérifications de
   l'étape 5 de « S2 bis », puis ouvrir `partenaires.html` connecté.
7. **Purge** (facultatif, seulement après l'étape 6) : `select count(*) from public.comptes_inactifs();`, puis si le
   nombre est plausible `select public.purger_donnees();` (ou pg_cron).
8. **Ensuite seulement**, ajouter `"communaute"` à `PA_SUPABASE.activees` et publier. **Ne pas activer `"communaute"`
   avant** les étapes 1 à 6.

Données personnelles : rien de nouveau n'est collecté (voir « Notes » de S2 bis).

# Stabilisation S2 (sécurité, quotas, durées de conservation)

Corrige les constats de l'audit du 29/10/2026 : avis falsifiables, textes publics non filtrés, liste des présences lisible en entier, `user_id` des avis lisible, absence de quotas, signalements illimités, aucune durée de conservation. Rien n'est supprimé ni réécrit à l'exécution : les contraintes ajoutées à des tables qui ont déjà des lignes sont en `NOT VALID` (les anciennes lignes ne sont pas relues, les nouvelles écritures sont contrôlées).

**Prérequis** : `schema.sql`, `schema-partenaires.sql`, `20261026_matchs.sql` (déjà exécutés) et **les 12 fichiers t4** (`2026-10-26-t4-01` à `-12`). Si les t4 n'ont pas encore été exécutés, exécute-les d'abord, dans l'ordre, puis les s2 juste après, sans activer `"communaute"` entre les deux. Les fichiers quiz, espace, journal, progression et diagnostic ne sont pas nécessaires (S2 marche avec ou sans eux).

## Étapes pour Samuel

1. **Vérifier la langue de la base** (une fois, dans le SQL Editor) : `select 'é' ~ '[[:alnum:]]';` doit répondre `true`. Sinon, préviens backend-supabase avant d'aller plus loin (le filtre et les pseudos accentués se comporteraient autrement que sur le site).
2. **Exécuter les 23 fichiers, un par un, dans l'ordre** (SQL Editor, coller le fichier, *Run*). Chacun est relançable sans risque.
   1. `2026-10-29-s2-01-table-tournois-ref` : table de référence des tournois (identifiant, club, dates).
   2. `2026-10-29-s2-02-fonction-message-sans-contact` : filtre de coordonnées renforcé (NFKC, séparateurs, réseaux, domaines).
   3. `2026-10-29-s2-03-contrainte-profiles-pseudo` : pseudo de 2 à 30 caractères, sans coordonnées (NOT VALID).
   4. `2026-10-29-s2-04-contraintes-annonces` : identifiant Ten'Up et textes du tournoi filtrés (NOT VALID).
   5. `2026-10-29-s2-05-fonction-limite-lignes-joueur` : quota de lignes par joueur (fonction commune).
   6. `2026-10-29-s2-06-fonction-avis-avant-insertion` : tournoi connu de `tournois_ref` obligatoire, club et dates recopiés.
   7. `2026-10-29-s2-07-contrainte-avis-tournoi` : identifiant Ten'Up (NOT VALID).
   8. `2026-10-29-s2-08-droits-avis` : lecture par colonnes, sans `user_id`.
   9. `2026-10-29-s2-09-fonction-mon-avis` : `mon_avis(p_tournoi)` renvoie l'identifiant de MON avis.
   10. `2026-10-29-s2-10-trigger-avis-limite` : 50 avis par joueur.
   11. `2026-10-29-s2-11-droits-presences` : chacun ne lit que ses présences.
   12. `2026-10-29-s2-12-fonction-presences-avant-insertion` : tournoi connu et non terminé obligatoire.
   13. `2026-10-29-s2-13-fonction-presences-tournoi` : `presences_tournoi(p_tournoi)` (pseudo, classement, est_moi).
   14. `2026-10-29-s2-14-trigger-presences-limite` : 200 présences par joueur.
   15. `2026-10-29-s2-15-contrainte-matchs-tailles` : points < 50 000 octets, format < 200 octets (NOT VALID).
   16. `2026-10-29-s2-16-trigger-matchs-limite` : 500 matchs par joueur.
   17. `2026-10-29-s2-17-contrainte-quiz-taille` : réponses du test < 3 000 octets (NOT VALID).
   18. `2026-10-29-s2-18-trigger-quiz-limite` : 100 résultats par joueur.
   19. `2026-10-29-s2-19-fonction-signalements-limite` : 10 signalements par joueur sur 24 h (annonces et avis confondus).
   20. `2026-10-29-s2-20-trigger-signalements-limite` : sur les signalements d'annonces.
   21. `2026-10-29-s2-21-trigger-signalements-avis-limite` : sur les signalements d'avis.
   22. `2026-10-29-s2-22-fonction-purger-comptes-inactifs` : comptes sans connexion depuis 3 ans (non appelable par le site).
   23. `2026-10-29-s2-23-fonction-purger-donnees` : purge des durées de conservation (non appelable par le site).
3. **Remplir `tournois_ref`** : sans elle, plus aucun avis ni « J'y vais » n'est accepté (`TOURNOI_INCONNU`). Elle reprend les tournois de `assets/data/tournois.json` (id, club, dates, puis nom, ville, catégorie et département : colonnes ajoutées par `s2-28`, **à exécuter juste après `s2-23` et avant les fichiers générés** (il ne fait qu'ajouter des colonnes facultatives) ; un texte vide, trop long ou contenant des coordonnées de contact est remplacé par null, et le bilan du script le compte ; date de fin absente = date de début) et doit être mise à jour à chaque mise à jour des tournois. Après chaque mise à jour des tournois (lundi), `scripts/maj-hebdo.bat` génère `supabase/donnees/tournois-ref-NN.sql` (étape 3 bis, aucun envoi). Colle les fichiers dans l'ordre dans le SQL Editor, après la migration `2026-10-29-s2-28-colonnes-tournois-ref.sql`. Les fichiers sont ignorés par git. Pour les régénérer à la main : `node scripts/generer-tournois-ref.js` (environ 7 700 tournois, 8 colonnes, 8 fichiers au 29/10/2026).
   - **Par le SQL Editor (recommandé)** : `node scripts/generer-tournois-ref.js` écrit `supabase/donnees/tournois-ref-01.sql`, `-02.sql`… (1 000 tournois au plus par fichier, environ 60 Ko, taille acceptée par l'éditeur). Colle-les et lance-les **dans l'ordre** ; ils sont relançables (`insert … on conflict (id) do update`). Ce dossier est ignoré par git : ces fichiers changent à chaque mise à jour et se recréent en une seconde. Le script ignore et compte les lignes invalides (identifiant hors `^(FED_)?[0-9]{1,12}$`, date impossible, club vide) et affiche le bilan. Le remplissage est à refaire après chaque mise à jour hebdomadaire : les tournois nouveaux sont refusés tant qu'ils ne sont pas dans la table.
   - **Par l'API (option)** : avec `SUPABASE_URL` (`https://xxxx.supabase.co`) et `SUPABASE_SERVICE_ROLE` (clé `service_role`, **dans l'environnement seulement**, jamais dans un fichier ni dans le dépôt, jamais dans le site) : `node scripts/generer-tournois-ref.js --envoyer`. Il refuse de démarrer si l'une des deux manque. À lancer depuis ton ordinateur seulement.
   - Les tournois terminés restent dans la table (les avis en ont besoin) ; la purge `purger_donnees()` ne la vide pas.
   Seuls le SQL Editor, le service (`service_role`) et un admin peuvent écrire dans cette table ; tout le monde peut la lire (ce sont des données publiques). Test : `node scripts/verifier-tournois-ref.cjs`.
4. **Purge** (seulement **après S2 bis** : la version de `s2-22` ne regarde que la dernière connexion ; `s2-35`/`s2-36` ajoutent sessions, profil et Mon académie) : `select public.purger_donnees();` dans le SQL Editor efface les présences des tournois terminés, les avis de plus de 24 mois, les annonces finies depuis 30 jours (`purger_annonces()`, inchangée) et les comptes sans connexion depuis 3 ans (avec tout leur contenu, par cascade). Elle renvoie le nombre de lignes supprimées. Avant le premier lancement, regarde combien de comptes partiraient : `select count(*) from public.comptes_inactifs();` (fonction ajoutée par S2 bis, fichier `s2-35` ; elle tient compte des sessions, du profil et de Mon académie, voir « S2 bis »). Pour l'automatiser : *Database > Extensions*, active `pg_cron`, puis `select cron.schedule('purger-donnees', '30 3 * * *', $$select public.purger_donnees()$$);` (arrêt : `select cron.unschedule('purger-donnees');`). L'ancien job `purger-annonces` peut rester.
5. **Vérifier** :
   - `select policyname, qual from pg_policies where tablename = 'presences';` : la règle `presences_select` vaut `(user_id = auth.uid())`, plus `true`.
   - *Table Editor* : `tournois_ref` affiche « RLS enabled ».
   - Anciennes lignes qui ne passent pas les nouvelles règles (à corriger ou supprimer à la main) :
     ```sql
     select id, pseudo from public.profiles where pseudo is not null and not public.pseudo_valide(pseudo);
     select id, tournoi_id, tournoi_nom, message from public.annonces where not (tournoi_id ~ '^(FED_)?[0-9]{1,12}$' and public.message_sans_contact(tournoi_nom) and public.message_sans_contact(tournoi_ville) and public.message_sans_contact(tournoi_categorie) and public.message_sans_contact(message));
     select id, texte from public.avis where not (tournoi_id ~ '^(FED_)?[0-9]{1,12}$' and public.avis_texte_correct(texte));
     select id from public.matchs where pg_column_size(points) >= 50000 or pg_column_size(format) >= 200;
     select id from public.quiz_results where pg_column_size(reponses) >= 3000;
     ```
     (La première requête utilise `pseudo_valide`, du fichier `s2-26` : à lancer après S2 bis.)
     Quand elles ne renvoient plus rien, tu peux valider les contraintes : `alter table public.profiles validate constraint profiles_pseudo_format;` (même chose pour `annonces_tournoi_id_format`, `annonces_tournoi_sans_contact`, `avis_tournoi_id_format`, `matchs_tailles`, `quiz_results_reponses_taille`). Ce n'est pas obligatoire : `NOT VALID` contrôle déjà toutes les nouvelles écritures.
6. **N'ajoute `"communaute"` à `PA_SUPABASE.activees` qu'après** les étapes 2 et 3, **les 19 fichiers S2 bis** (`s2-24` à `s2-42`, section suivante) **et** la mise à jour du site par dev-front (ci-dessous et « S2 bis »).

## Ce qui change pour le site (dev-front : `assets/js/communaute-tournoi.js` et `partenaires.js`)

Tant que le JavaScript n'est pas adapté, avec `"communaute"` activé :
- la liste « J'y vais » serait vide (lecture de `presences` limitée à ses propres lignes) ;
- les avis ne s'afficheraient plus du tout (`select("id,user_id,…")` refusé : `user_id` n'est plus lisible), ni pour les visiteurs ni pour les joueurs ;
- les nouvelles erreurs (`TOURNOI_INCONNU`, `TOURNOI_TERMINE`, `LIMITE_LIGNES`, `LIMITE_SIGNALEMENTS`, `profiles_pseudo_format`, `annonces_tournoi_sans_contact`) afficheraient le message générique.

Changements attendus :
- « J'y vais » : `c.rpc("presences_tournoi", {p_tournoi: t.id})` (renvoie `pseudo, classement_p, est_moi`) à la place de `from("presences").select("user_id,pseudo,classement_p")…` ; « je suis inscrit » = une ligne avec `est_moi` ; la suppression reste `delete().eq("user_id", moi()).eq("tournoi_id", t.id)`.
- Avis : retirer `user_id` du `select` ; appeler `c.rpc("mon_avis", {p_tournoi: t.id})` (identifiant ou `null`) et comparer `a.id` à cet identifiant (affichage avant la fin, bouton « Supprimer mon avis », pas de « Signaler » sur son propre avis). À l'envoi, `club`, `tournoi_date_debut` et `tournoi_date_fin` sont ignorés par la base (on peut ne plus les envoyer).
- Filtre de coordonnées identique à la base (référence : `filtreJs` dans `scripts/verifier-securite-sql.cjs`), dans les deux fichiers.

Les autres pages ne changent pas : les quotas (matchs 500, résultats du test 100) ne gênent qu'au-delà de ces nombres (erreur `LIMITE_LIGNES`). Un joueur dont l'ancien pseudo ne passe pas la nouvelle règle devra le corriger à son prochain enregistrement du profil (erreur `profiles_pseudo_format`). Une ancienne annonce ou un ancien avis dont le texte ne passe plus le filtre ne peut plus être signalé ni masqué (toute modification de la ligne est refusée) : l'admin peut le supprimer.

Les fichiers t4-01, 02, 07 et 08 portent un avertissement : les relancer après S2 sans relancer les s2 correspondants rouvrirait les failles.

Vérification hors ligne : `node scripts/verifier-securite-sql.cjs` (contrôles statiques ; avec `@electric-sql/pglite` disponible, exécution complète dans un Postgres en mémoire avec plusieurs joueurs, un visiteur et un admin).

# S2 bis (complément de la revue de sécurité du 29/10/2026)

Ce que ça corrige :
- **N1** : les annonces faisaient encore confiance au navigateur pour le tournoi. Désormais le tournoi doit être dans `tournois_ref` (`TOURNOI_INCONNU`), les dates sont recopiées depuis la table, ainsi que nom, ville, catégorie et département quand le générateur les fournit (nouvelles colonnes de `tournois_ref`). Sans ces colonnes, le nom envoyé par le navigateur passe le filtre d'insultes (`TEXTE_TOURNOI_INCORRECT`).
- **N2** : filtre de coordonnées v3. Refuse les numéros entrecoupés de lettres (`06 et 12 et 34 et 56 et 78`, `06a12b34c56d78`, `06 l2 34 56 78`), les numéros déguisés en dates ou heures (`06/12/34 5678`, `06.12.2034 5678`, `06:12 23:45 67`), les chiffres non latins (`٠٦١٢٣٤٥٦٧٨`, `०६१२३४५६७८`), les réseaux espacés ou abrégés (`i n s t a`, `s n a p`, `ig : jean`, `t me jean`). Les noms de tournois de `tournois.json` et les phrases habituelles (« dispo le 12/11 à 18h30 », « P250 + 45 ans », scores, prix) passent toujours. Un pseudo ne peut plus contenir de chiffres non latins.
- **N3** : la purge des comptes inactifs prend la dernière activité réelle : connexion, session rafraîchie (`auth.sessions`), profil modifié, ou dernier niveau déclaré / dernier quiz de Mon académie (`academie_niveaux`, `academie_quiz`, colonne `created_at`), la plus récente. Les tables de Mon académie sont effacées avec le compte (`on delete cascade`).
- **N4** : avis, « J'y vais » et annonces refusent un ancien pseudo qui ne respecte pas le format (`PSEUDO_REQUIS`) au lieu de le recopier.
- **N5** : un avis exige un e-mail confirmé (`EMAIL_NON_CONFIRME`) et un compte créé avant le premier jour du tournoi (`AVIS_COMPTE_RECENT`). Le masquage automatique (3 signalements) ne compte plus que les signaleurs dont le compte a plus de 7 jours et un e-mail confirmé (avis et annonces).
- **N7** : `user_id` n'est plus lisible dans les annonces ni dans les réponses (il permettait de relier toutes les activités d'un joueur). « Mes annonces » et « mes réponses » passent par `mes_annonces()` et `mes_reponses()`. `presences_tournoi()` ne liste les autres joueurs que pour un tournoi non terminé qui commence dans les 60 prochains jours (sinon seulement sa propre ligne ; le nombre reste public) : on ne peut plus reconstituer l'agenda d'un pseudo.

Aucune donnée existante n'est supprimée ni réécrite : nouvelles fonctions, fonctions remplacées (`create or replace`), colonnes facultatives ajoutées, contrainte de pseudo remplacée en `NOT VALID`, droits de lecture par colonnes.

## Attention : partenaires.html est en ligne et n'attend pas `activees`

`partenaires.js` appelle Supabase dès que `schema-partenaires.sql` est exécuté (il n'est pas conditionné par `PA_SUPABASE.activees`). Tant que le site n'est pas adapté, exécuter S2 bis le casse :
- après `s2-39` et `s2-40` : liste des annonces, « Mes annonces », réponses reçues et envoyées, publication d'une annonce ou d'une réponse et vue admin échouent (« Impossible de charger les annonces », « Impossible de publier l'annonce ») : `select("*")`, `.select()` après un `insert` et les filtres `eq("user_id", …)` sont refusés (`permission denied`) ;
- après `s2-29` : publication refusée (`TOURNOI_INCONNU`) si `tournois_ref` n'est pas remplie, et nouveaux messages d'erreur non traduits (`TEXTE_TOURNOI_INCORRECT`, `PSEUDO_REQUIS`) ;
- après `s2-25` : un message accepté par l'ancien filtre du navigateur peut être refusé par la base (`annonces_message_sans_contact`), avec le message d'erreur générique.

**Donc : publie d'abord le site adapté par dev-front** (ses appels marchent avant ET après S2 bis : colonnes listées sans `user_id`, `mes_annonces()` et `mes_reponses()` avec repli sur l'ancienne requête tant que la fonction n'existe pas), **puis** exécute S2 bis. La page « communauté » des fiches tournois n'est pas concernée tant que `"communaute"` n'est pas activé.

## Étapes pour Samuel

1. **Attendre** que dev-front ait publié `partenaires.js` et `communaute-tournoi.js` adaptés (ci-dessous) et que robot-tournois ait mis à jour `scripts/generer-tournois-ref.js` (8 colonnes).
2. **Exécuter les 19 fichiers, un par un, dans l'ordre** (SQL Editor, coller le fichier, *Run*). Chacun est relançable sans risque.
   1. `2026-10-29-s2-24-fonction-chiffres-ascii` : chiffres non latins convertis en 0-9.
   2. `2026-10-29-s2-25-fonction-message-sans-contact` : filtre de coordonnées v3.
   3. `2026-10-29-s2-26-fonction-pseudo-valide` : format du pseudo (une seule définition).
   4. `2026-10-29-s2-27-contrainte-profiles-pseudo` : contrainte du pseudo, `NOT VALID`.
   5. `2026-10-29-s2-28-colonnes-tournois-ref` : colonnes `nom`, `ville`, `categorie`, `dep` (facultatives).
   6. `2026-10-29-s2-29-fonction-annonces-avant-insertion` : tournoi de `tournois_ref` obligatoire, textes et dates recopiés.
   7. `2026-10-29-s2-30-fonction-avis-avant-insertion` : e-mail confirmé, compte créé avant le tournoi, pseudo au format.
   8. `2026-10-29-s2-31-fonction-presences-avant-insertion` : pseudo au format.
   9. `2026-10-29-s2-32-fonction-presences-tournoi` : liste limitée aux tournois des 60 prochains jours.
   10. `2026-10-29-s2-33-fonction-signaler-avis` : masquage par 3 signaleurs fiables.
   11. `2026-10-29-s2-34-fonction-signaler-annonce` : même règle pour les annonces.
   12. `2026-10-29-s2-35-fonction-comptes-inactifs` : liste des comptes sans activité depuis 3 ans (non appelable par le site).
   13. `2026-10-29-s2-36-fonction-purger-comptes-inactifs` : la purge utilise cette liste.
   14. `2026-10-29-s2-37-fonction-est-auteur-annonce` : utilisée par la règle des réponses.
   15. `2026-10-29-s2-38-politique-reponses-select` : règle de lecture des réponses (**avant** s2-39 et s2-40).
   16. `2026-10-29-s2-39-droits-annonces` : annonces lisibles sans `user_id`.
   17. `2026-10-29-s2-40-droits-reponses` : réponses lisibles sans `user_id`.
   18. `2026-10-29-s2-41-fonction-mes-annonces` : `mes_annonces()`.
   19. `2026-10-29-s2-42-fonction-mes-reponses` : `mes_reponses()`.
3. **Remplir à nouveau `tournois_ref`** (inutile si l'étape 3 de S2 a déjà été faite après `s2-28` avec les fichiers de la semaine) avec le générateur mis à jour (`node scripts/generer-tournois-ref.js`, puis les fichiers `supabase/donnees/tournois-ref-NN.sql` dans l'ordre, comme à l'étape 3 de S2). Contrôle : `select count(*) as total, count(nom) as avec_nom from public.tournois_ref;` : les deux nombres doivent être proches.
4. **Avant toute purge**, compte les comptes qui partiraient : `select count(*) from public.comptes_inactifs();`
5. **Vérifier** :
   - `select public.message_sans_contact('06 et 12 et 34 et 56 et 78');` doit répondre `false`, et `select public.message_sans_contact('Dispo le 12/11 à 18h30, P250 + 45 ans');` doit répondre `true` ;
   - `select table_name, grantee from information_schema.column_privileges where table_schema = 'public' and table_name in ('annonces','reponses','avis') and column_name = 'user_id' and grantee in ('anon','authenticated');` ne doit renvoyer aucune ligne ;
   - pseudos existants qui ne passent plus (à faire corriger) : `select id, pseudo from public.profiles where pseudo is not null and not public.pseudo_valide(pseudo);`
   - ouvre `partenaires.html` connecté : la liste, « Mes annonces » et les réponses s'affichent, la publication marche.
6. **Ne pas activer `"communaute"` avant** : les 23 fichiers S2 et les 19 fichiers S2 bis exécutés, `tournois_ref` remplie avec les 8 colonnes, le site adapté par dev-front **publié**, et la vérification de l'étape 5 faite. Ensuite seulement, ajoute `"communaute"` à `PA_SUPABASE.activees`.

## Ce qui change pour le site (dev-front)

`partenaires.js` :
- liste (`annonces()`, ~ligne 126), annonces par identifiants (~135) et vue admin (~168) : `select("id,tournoi_id,tournoi_nom,tournoi_date_debut,tournoi_date_fin,tournoi_ville,tournoi_dep,tournoi_categorie,pseudo,niveau_declare,classement_p,cote,sexe,message,statut,masquee,nb_signalements,created_at")` au lieu de `select("*")` ;
- « Mes annonces » (~132) : `c.rpc("mes_annonces")` (mêmes colonnes, les plus récentes d'abord) au lieu de `from("annonces").select("*").eq("user_id", …)` ;
- « Ton annonce » (~230 et ~245) : plus de `annonce.user_id === moi` ; comparer `annonce.id` aux identifiants renvoyés par `mes_annonces()` ;
- réponses reçues (~138) : `select("id,annonce_id,pseudo,message,statut,message_retour,created_at")` ; « Mes réponses » (~141) : `c.rpc("mes_reponses")` (mêmes colonnes) ;
- après un `insert` (~147 et ~153) : `.select(<mêmes colonnes>)` au lieu de `.select()` ; continuer d'envoyer `user_id` dans l'insert ;
- les champs `tournoi_nom`, `tournoi_date_*`, `tournoi_ville`, `tournoi_dep`, `tournoi_categorie` envoyés à la publication sont remplacés par la base (on peut continuer de les envoyer : ils servent tant que `tournois_ref.nom` est vide) ;
- messages à traduire : `TOURNOI_INCONNU`, `TEXTE_TOURNOI_INCORRECT`, `PSEUDO_REQUIS` (pseudo à corriger dans Mon compte).

`communaute-tournoi.js` : messages `AVIS_COMPTE_RECENT` (« ton compte doit avoir été créé avant le début du tournoi ») et `EMAIL_NON_CONFIRME` (« confirme ton adresse e-mail ») ; liste « J'y vais » : pour un tournoi dans plus de 60 jours, seule sa propre ligne revient (afficher le nombre `nb_presences`, pas la liste).

Les deux : filtre de coordonnées v3, à recopier exactement depuis `filtreJs` de `scripts/verifier-securite-sql.cjs` (constantes `PA_DATE_HEURE`, `PA_CATEGORIE`, `PA_CHIFFRES_ZEROS`, `PA_CHIFFRES` et la fonction). La suite vérifie que les expressions JavaScript et SQL sont identiques au caractère près et donnent le même résultat sur tous les textes de `tournois.json`, sur le corpus et sur 5 000 textes tirés au hasard.

## Notes

- Limites connues du filtre (traitées par les signalements) : nombres écrits en lettres, numéro découpé en vraies dates de 2024 à 2029. Les années acceptées comme dates (2024 à 2029, ou 24 à 29) sont à élargir en 2029, dans le SQL et dans le JavaScript en même temps.
- Relancer un ancien fichier remplacé rouvrirait la faille : `s2-02`, `s2-03`, `s2-06`, `s2-12`, `s2-13`, `s2-22`, `t4-11` et `schema-partenaires.sql` portent un avertissement « ATTENTION (S2 bis) » ou « ATTENTION (S2) » qui indique quoi relancer ensuite.
- Données personnelles : rien de nouveau n'est collecté. La date de création du compte et la confirmation de l'e-mail (déjà stockées par Supabase) servent désormais aussi à accepter un avis et à compter un signalement ; les sessions et les dates d'ajout des lignes de Mon académie (déjà stockées) servent à dater la dernière activité avant la purge.

# Mise à jour automatique de tournois_ref (30/10/2026)

Plus besoin de coller chaque semaine les fichiers `tournois-ref-NN.sql` : la base lit elle-même le `tournois.json` publié (https://apprendre-padel.fr/assets/data/tournois.json) chaque **mardi à 5 h UTC** (6 h ou 7 h à Paris), avec exactement les règles de `scripts/generer-tournois-ref.js` (identifiant, club, dates, nom/ville/catégorie à null si trop longs ou avec des coordonnées, département). Aucune clé secrète, aucun ordinateur allumé. Rien n'est jamais supprimé de `tournois_ref`. Si le fichier est inaccessible (statut autre que 200, redirection comprise), n'est pas du JSON, dépasse 20 Mo ou ne contient aucun tournoi valide : erreur claire, et la table reste telle quelle.

Le même lot planifie aussi la **purge quotidienne** `purger_donnees()` (accord écrit de Samuel du 30/10/2026) à **3 h 30 UTC** : présences des tournois finis, avis de plus de 24 mois, annonces finies depuis 30 jours, comptes sans activité depuis 3 ans. L'ancien job facultatif `purger-annonces` est retiré s'il existe, car `purger_donnees()` appelle déjà `purger_annonces()`.

## Étapes pour Samuel

1. **Avant** : compte ce que la première purge supprimerait : `select count(*) from public.comptes_inactifs();` (comptes), et si besoin lance une fois la purge à la main pour voir le nombre : `select public.purger_donnees();`.
2. **Exécuter dans l'ordre** (SQL Editor, coller le fichier, *Run* ; chacun est relançable sans risque) :
   1. `2026-10-30-auto-01-extensions` : extensions `pg_cron` et `http` (équivaut à les activer dans *Database > Extensions*).
   2. `2026-10-30-auto-02-fonction-actualiser-tournois-ref` : la fonction `actualiser_tournois_ref()` (non appelable par le site).
   3. `2026-10-30-auto-03-planification` : les deux jobs `actualiser-tournois-ref` (mardi 5 h UTC) et `purger-donnees` (chaque nuit 3 h 30 UTC).
3. **Contrôler** :
   - lance une fois à la main `select public.actualiser_tournois_ref();` : réponse = un nombre (environ 7 700 aujourd'hui), le bilan s'affiche en message (*NOTICE*) ; puis `select count(*), max(maj) from public.tournois_ref;` : `maj` vient de changer ;
   - `select * from cron.job;` : deux lignes, `actualiser-tournois-ref` (`0 5 * * 2`) et `purger-donnees` (`30 3 * * *`), pas de `purger-annonces` ;
   - après le premier passage : `select * from cron.job_run_details order by start_time desc limit 5;` : `status` = `succeeded`, sinon le message d'erreur (`TOURNOIS_REF_…`) dit pourquoi.
4. Rien à ajouter à `PA_SUPABASE.activees` : le site ne change pas.

Pour arrêter : `select cron.unschedule('actualiser-tournois-ref');` et/ou `select cron.unschedule('purger-donnees');`. Le remplissage à la main (`node scripts/generer-tournois-ref.js`) reste possible à tout moment ; les deux donnent les mêmes lignes.

Notes : si l'extension `http` n'était pas proposée sur le projet, l'alternative est `pg_net` (asynchrone : la réponse arrive dans `net._http_response` et doit être lue par un second job) ; à me redemander. Le robot doit publier `tournois.json` avant le mardi 5 h UTC ; sinon les tournois de la semaine précédente sont simplement remis à jour (sans perte).
