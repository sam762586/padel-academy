-- Auto · 1/3 — Extensions pour la mise à jour automatique de tournois_ref (30/10/2026).
-- pg_cron : tâches planifiées dans la base (syntaxe recommandée par Supabase : schéma pg_catalog, le schéma « cron »
-- est créé par l'extension). http : requête HTTP synchrone (pgsql-http), installée dans le schéma « extensions » comme
-- le recommande Supabase. Équivalent du tableau de bord : Database > Extensions > « pg_cron » et « http ».
-- Le schéma « extensions » n'est pas exposé par l'API du site (seuls public et graphql_public le sont) : le navigateur
-- ne peut pas appeler http_get. Relançable sans risque : rien n'est fait si l'extension est déjà active.
create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;
create extension if not exists http with schema extensions;
