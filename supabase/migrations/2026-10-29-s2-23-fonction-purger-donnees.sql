-- S2 · 23/23 — Purge des durées de conservation décidées par Samuel le 29/10/2026. Renvoie le nombre total de lignes supprimées.
--   présences : dès le lendemain de la date de fin du tournoi (tournois_ref) ;
--   avis      : 24 mois après leur création ;
--   annonces  : 30 jours après la fin du tournoi (purger_annonces, schema-partenaires.sql, inchangée) ;
--   comptes   : sans connexion depuis 3 ans (purger_comptes_inactifs, fichier s2-22).
-- NON EXPOSÉE : seulement pg_cron ou le SQL Editor (select public.purger_donnees();).
create or replace function public.purger_donnees()
returns integer
language plpgsql
security definer
set search_path = public
as $fn$
declare
  nb integer;
  total integer := 0;
begin
  delete from public.presences p using public.tournois_ref r where r.id = p.tournoi_id and r.date_fin < current_date;
  get diagnostics nb = row_count;
  total := total + nb;
  delete from public.avis where created_at < now() - interval '24 months';
  get diagnostics nb = row_count;
  total := total + nb;
  total := total + public.purger_annonces();
  total := total + public.purger_comptes_inactifs();
  return total;
end;
$fn$;
revoke all on function public.purger_donnees() from public, anon, authenticated;
-- OPTIONNEL : purge chaque nuit à 3 h 30 avec pg_cron (Database > Extensions > activer « pg_cron »), puis décommenter et lancer :
-- select cron.schedule('purger-donnees', '30 3 * * *', $$select public.purger_donnees()$$);
-- Pour l'arrêter : select cron.unschedule('purger-donnees');
-- Si le job « purger-annonces » existe déjà, il peut rester : purger_donnees() appelle aussi purger_annonces().
-- Sans pg_cron, lance de temps en temps à la main : select public.purger_donnees();
