-- Concours · 16/17 — Purge (confidentialite.html, section « Jeu concours ») :
--   concours tiré depuis plus de 60 jours      : participations, exclusions ET gagnants supprimés ;
--   concours jamais tiré, fini depuis 90 jours : participations et exclusions supprimées.
-- Le concours garde seulement sa graine et ses nombres de participants et d'exclusions (aucune donnée personnelle).
-- Renvoie le nombre total de lignes supprimées. NON EXPOSÉE : seulement pg_cron (concours-17) ou le SQL Editor
-- (select public.purger_concours();).
create or replace function public.purger_concours()
returns integer
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  nb integer;
  total integer := 0;
begin
  delete from public.concours_participations p using public.concours c where c.id = p.concours_id and ((c.tire_le is not null and c.tire_le < now() - interval '60 days') or (c.tire_le is null and c.date_fin < now() - interval '90 days'));
  get diagnostics nb = row_count;
  total := total + nb;
  delete from public.concours_exclusions e using public.concours c where c.id = e.concours_id and ((c.tire_le is not null and c.tire_le < now() - interval '60 days') or (c.tire_le is null and c.date_fin < now() - interval '90 days'));
  get diagnostics nb = row_count;
  total := total + nb;
  delete from public.concours_gagnants g using public.concours c where c.id = g.concours_id and c.tire_le is not null and c.tire_le < now() - interval '60 days';
  get diagnostics nb = row_count;
  total := total + nb;
  return total;
end;
$fn$;
revoke all on function public.purger_concours() from public, anon, authenticated;
