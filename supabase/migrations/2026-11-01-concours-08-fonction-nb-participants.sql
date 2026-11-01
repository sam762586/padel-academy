-- Concours · 8/17 — Nombre de participants d'un concours, lisible par tous (compteur de concours.html). Ne renvoie qu'un
-- nombre, jamais qui participe. Après le tirage, renvoie le nombre figé au moment du tirage (concours.nb_participants) :
-- le compteur reste juste après la purge des participations. Concours inconnu : 0. Exclusions : concours_resume (09).
create or replace function public.concours_nb_participants(p_concours text)
returns integer
language sql
stable
security definer
set search_path = ''
as $fn$
  select coalesce((select coalesce(c.nb_participants, (select count(*)::integer from public.concours_participations p where p.concours_id = c.id)) from public.concours c where c.id = p_concours), 0);
$fn$;
revoke all on function public.concours_nb_participants(text) from public;
grant execute on function public.concours_nb_participants(text) to anon, authenticated;
