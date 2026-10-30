-- Auto · 3/3 — Planification pg_cron (heures en UTC, l'horloge de pg_cron sur Supabase).
--   actualiser-tournois-ref : chaque mardi à 5 h UTC (6 h ou 7 h à Paris), le lendemain de la mise à jour du lundi du site.
--   purger-donnees          : chaque nuit à 3 h 30 UTC, durées de conservation de s2-23 (présences des tournois finis,
--                             avis de plus de 24 mois, annonces finies depuis 30 jours, comptes sans activité depuis 3 ans).
--                             Accord écrit de Samuel du 30/10/2026. SUPPRIME des données chaque nuit : compter avant
--                             (select count(*) from public.comptes_inactifs();).
--   purger-annonces (ancien job facultatif de schema-partenaires.sql) : retiré s'il existe, car purger_donnees() appelle
--                             déjà purger_annonces() (sinon la même purge tournerait deux fois).
-- Relançable sans risque : chaque job est retiré s'il existe, puis recréé (jamais en double). Prérequis : auto-01, auto-02.
select cron.unschedule(jobid) from cron.job where jobname = 'actualiser-tournois-ref';
select cron.schedule('actualiser-tournois-ref', '0 5 * * 2', $$select public.actualiser_tournois_ref()$$);
select cron.unschedule(jobid) from cron.job where jobname = 'purger-donnees';
select cron.schedule('purger-donnees', '30 3 * * *', $$select public.purger_donnees()$$);
select cron.unschedule(jobid) from cron.job where jobname = 'purger-annonces';
-- Pour arrêter :
-- select cron.unschedule('actualiser-tournois-ref');
-- select cron.unschedule('purger-donnees');
