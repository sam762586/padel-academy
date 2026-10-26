-- T4 · 4/12 — Nombre de « J'y vais » d'un tournoi, lisible même sans compte (ne renvoie que le nombre).
create or replace function public.nb_presences(p_tournoi text)
returns integer
language sql
stable
security definer
set search_path = public
as $fn$
  select count(*)::integer from public.presences where tournoi_id = p_tournoi;
$fn$;
revoke all on function public.nb_presences(text) from public;
grant execute on function public.nb_presences(text) to anon, authenticated;
