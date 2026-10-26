# Activer les comptes joueurs (phase 1)

Tant que ces étapes ne sont pas faites, le site fonctionne normalement et la page « Mon compte » indique que les comptes ne sont pas activés.

1. **Créer le projet** sur https://supabase.com, avec une région UE (par exemple Frankfurt ou Paris). Note le mot de passe de la base quelque part.
2. **Créer les tables** : menu *SQL Editor*, colle tout le contenu de `supabase/schema.sql`, puis *Run*. Tu peux le relancer sans risque.
3. **Régler les URLs** : *Authentication > URL Configuration*.
   - Site URL : `https://apprendre-padel.fr/`
   - Redirect URLs : ajoute `https://apprendre-padel.fr/compte.html` et, pour les essais locaux, `http://localhost:3000/compte.html`. Conserve aussi l’ancienne URL GitHub Pages si elle est encore utilisée.
4. **Copier les clés** : *Project Settings > API*. Recopie « Project URL » et la clé `anon` (publique) dans `assets/js/supabase-config.js`. Ne copie JAMAIS la clé `service_role`.
5. **Tester en local** : dans le dossier du site, lance `npx serve -l 3000`, puis ouvre http://localhost:3000/compte.html. En double-cliquant sur le fichier (file://), les comptes restent désactivés : c'est voulu.
6. **SMTP avant l'ouverture au public** : le serveur d'e-mails par défaut de Supabase est limité à quelques e-mails par heure. Configure un SMTP (Brevo ou Resend) dans *Project Settings > Authentication > SMTP Settings*.
7. **Pause du projet gratuit** : sans activité pendant environ 7 jours, le projet gratuit se met en pause. Le site continue de marcher, mais les comptes sont indisponibles jusqu'à ce que tu le relances depuis le tableau de bord Supabase.

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
- `"communaute"` : les 12 fichiers `supabase/migrations/2026-10-26-t4-01-…` à `t4-12-…`, **dans l'ordre des numéros** (« J'y vais », annonces et avis sur les fiches tournois, modération des avis dans Mon compte).

# Communauté sur les fiches tournois (T4)

Prérequis : `schema.sql` et `schema-partenaires.sql` déjà exécutés (fonctions `est_admin`, `message_sans_contact`, `accepter_charte`).
Exécute les fichiers `2026-10-26-t4-01` à `t4-12` un par un dans le SQL Editor (un fichier = un objet ; les fonctions utilisent le tag `$fn$`). Ils sont relançables sans risque. Puis ajoute `"communaute"` à la liste ci-dessus.

- `presences` : « J'y vais ». Lecture par les joueurs connectés ; le nombre est visible par tous via `nb_presences()`.
- `annonces` (existante) : le nombre d'annonces d'un tournoi est visible par tous via `nb_annonces_tournoi()`, le contenu reste réservé aux connectés.
- `avis` : 3 questions + texte de 300 caractères maximum, filtré (`avis_texte_correct()` : pas de contact, pas d'insulte). Un avis par joueur et par tournoi, possible dès le premier jour du tournoi, visible par tous après la fin. 3 signalements de joueurs différents masquent l'avis (`signaler_avis()`) ; l'admin voit les avis signalés dans Mon compte et peut les masquer, les rétablir ou les supprimer (`admin_moderer_avis()`).
- Suppression de compte : tout part en cascade.

# Catégories P de la saison 2026/2027

Depuis le 1er septembre 2026, le P1500 est devenu P2000 et l'ancien P2000 est devenu P3000. Exécute `2026-10-26-classements-01-profiles.sql` puis `2026-10-26-classements-02-annonces.sql` : les valeurs déjà saisies sont converties et la liste autorisée devient P25, P50, P100, P250, P500, P1000, P2000, P3000 (celle du formulaire de profil).

# Ordre conseillé pour tout le SQL en attente (format `$fn$`, un objet par fichier)

1. `2026-10-26-classements-01` et `-02` ;
2. `2026-10-26-quiz-01` à `-05`, puis ajoute `"quiz2"` à `PA_SUPABASE.activees` ;
3. `2026-10-26-favoris-01` à `-03`, puis ajoute `"favoris"` à `PA_SUPABASE.activees` ;
4. `2026-10-26-t4-01` à `-12`, puis ajoute `"communaute"` à `PA_SUPABASE.activees`.
5. `2026-10-26-espace-01` à `-06`, puis ajoute `"espace"` à `PA_SUPABASE.activees`.
6. `2026-10-26-journal-01` à `-03` (après `20261026_matchs.sql`, déjà exécuté), puis ajoute `"journal"` à `PA_SUPABASE.activees`.

# Espace joueur (espace.html)

`2026-10-26-espace-01` à `-06` (après `classements-01`) : tables `resultats_tournois` (résultats du simulateur du barème) et `objectifs`, 300 lignes au maximum par joueur, et colonnes `rang_fft`, `rang_sexe`, `rang_maj` dans `profiles`. Chaque joueur ne voit que ses lignes (RLS). Ajoute ensuite `"espace"` à `PA_SUPABASE.activees`.

Tant que ce n'est pas fait, l'espace joueur marche entièrement sur l'appareil. Une fois activé, `assets/js/joueur-sync.js` fusionne l'appareil et le compte à chaque visite de l'espace ou de Mon compte (fusion à trois voies : un ajout, une modification ou une suppression d'un côté est reporté de l'autre ; pour le rang, la saisie la plus récente gagne).

# Journal de matchs (espace joueur)

`2026-10-26-journal-01` à `-03` complètent la table `matchs` : identifiant `cle` (un match du téléphone n'est jamais copié deux fois ; les anciens matchs prennent leur `id`), `partenaire`, `type_match` (amical, tournoi, entraînement), `saisie` (compteur ou manuelle) ; la liste des points peut être vide pour un match saisi après coup. Ajoute ensuite `"journal"` à `PA_SUPABASE.activees`.

Le compte sert d'archive : effacer l'historique du compteur sur un téléphone ne supprime rien dans le compte. Seule la suppression d'un match depuis le journal de l'espace joueur l'efface partout (mise en attente si le téléphone est hors connexion).
