-- S2 · 9/23 — Identifiant de MON avis sur un tournoi (ou null). Remplace la comparaison avis.user_id = moi côté navigateur,
-- user_id n'étant plus lisible (fichier s2-08). Ne renvoie qu'un identifiant, et seulement celui de l'appelant.
create or replace function public.mon_avis(p_tournoi text)
returns uuid
language sql
stable
security definer
set search_path = public
as $fn$
  select id from public.avis where user_id = auth.uid() and tournoi_id = p_tournoi limit 1;
$fn$;
revoke all on function public.mon_avis(text) from public, anon;
grant execute on function public.mon_avis(text) to authenticated;
