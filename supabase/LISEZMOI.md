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

Après le schéma initial, appliquer `supabase/migrations/20261026_validation_quiz.sql` dans le SQL Editor. Cette migration contrôle le score (0 à 30), sa cohérence avec le niveau et les réponses fournies. Elle ne supprime ni ne réécrit les résultats existants. La contrainte `NOT VALID` contrôle les nouvelles écritures ; les anciennes lignes sont à examiner avant validation globale. Cette migration doit aussi être appliquée sur une nouvelle base.

# Sauvegarde des matchs du compteur (score.html)

Le compteur fonctionne sans compte : les matchs restent sur l'appareil. Pour que les joueurs connectés retrouvent leurs matchs sur tous leurs appareils, applique `supabase/migrations/20261026_matchs.sql` dans le SQL Editor (après `schema.sql`, relançable sans risque). Il crée la table `matchs` avec les règles RLS (chacun ne voit que ses matchs, pas de modification après enregistrement). Tant que ce n'est pas fait, la fin de match affiche « La sauvegarde des matchs n'est pas encore activée » et le match reste enregistré sur l'appareil. Suppression de compte : les matchs partent en cascade, `delete_my_account()` ne change pas.
