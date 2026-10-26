# Activer les comptes joueurs (phase 1)

Tant que ces étapes ne sont pas faites, le site fonctionne normalement et la page « Mon compte » indique que les comptes ne sont pas activés.

1. **Créer le projet** sur https://supabase.com, avec une région UE (par exemple Frankfurt ou Paris). Note le mot de passe de la base quelque part.
2. **Créer les tables** : menu *SQL Editor*, colle tout le contenu de `supabase/schema.sql`, puis *Run*. Tu peux le relancer sans risque.
3. **Régler les URLs** : *Authentication > URL Configuration*.
   - Site URL : `https://sam762586.github.io/padel-academy/`
   - Redirect URLs : ajoute `https://sam762586.github.io/padel-academy/compte.html` et `http://localhost:3000/compte.html` (ou, plus large, `https://sam762586.github.io/padel-academy/**` et `http://localhost:3000/**`).
4. **Copier les clés** : *Project Settings > API*. Recopie « Project URL » et la clé `anon` (publique) dans `assets/js/supabase-config.js`. Ne copie JAMAIS la clé `service_role`.
5. **Tester en local** : dans le dossier du site, lance `npx serve -l 3000`, puis ouvre http://localhost:3000/compte.html. En double-cliquant sur le fichier (file://), les comptes restent désactivés : c'est voulu.
6. **SMTP avant l'ouverture au public** : le serveur d'e-mails par défaut de Supabase est limité à quelques e-mails par heure. Configure un SMTP (Brevo ou Resend) dans *Project Settings > Authentication > SMTP Settings*.
7. **Pause du projet gratuit** : sans activité pendant environ 7 jours, le projet gratuit se met en pause. Le site continue de marcher, mais les comptes sont indisponibles jusqu'à ce que tu le relances depuis le tableau de bord Supabase.
