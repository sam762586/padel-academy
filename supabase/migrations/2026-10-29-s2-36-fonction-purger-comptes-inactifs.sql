-- S2 bis · 36/42 — Supprime les comptes sans activité depuis 3 ans (remplace la version s2-22, même nom, même valeur renvoyée).
-- « Activité » : voir comptes_inactifs (s2-35) — connexion, session rafraîchie, profil modifié ou ajout dans Mon académie, la plus récente.
-- La cascade (on delete cascade) efface profil, résultats, matchs, favoris, annonces, présences, avis, signalements, Mon académie…
-- NON EXPOSÉE : seulement pg_cron ou le SQL Editor (appelée aussi par purger_donnees, s2-23). Compter avant :
-- select count(*) from public.comptes_inactifs();
create or replace function public.purger_comptes_inactifs()
returns integer
language plpgsql
security definer
set search_path = public
as $fn$
declare
  nb integer;
begin
  delete from auth.users where id in (select public.comptes_inactifs());
  get diagnostics nb = row_count;
  return nb;
end;
$fn$;
revoke all on function public.purger_comptes_inactifs() from public, anon, authenticated;
