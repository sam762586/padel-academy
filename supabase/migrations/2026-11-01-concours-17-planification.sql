-- Concours · 17/17 — Planification pg_cron (heure UTC) : purger-concours chaque nuit à 3 h 45 UTC, un quart d'heure après
-- purger-donnees (auto-03, inchangé). Job séparé : purger_donnees() n'est pas réécrite.
-- Prérequis : pg_cron actif (auto-01, déjà exécuté le 30/10/2026) et concours-16.
-- Relançable sans risque : le job est retiré s'il existe, puis recréé (jamais en double).
select cron.unschedule(jobid) from cron.job where jobname = 'purger-concours';
select cron.schedule('purger-concours', '45 3 * * *', $$select public.purger_concours()$$);
-- Pour arrêter : select cron.unschedule('purger-concours');
