-- Concours · 9/17 — Résumé public d'un concours, lisible par tous : nombre de participants et nombre d'exclusions pour
-- fraude (transparence du tirage). Jamais qui. Figés au moment du tirage (nb_participants, nb_exclusions), en direct
-- avant. Concours inconnu : aucune ligne.
create or replace function public.concours_resume(p_concours text)
returns table (participants integer, exclusions integer)
language sql
stable
security definer
set search_path = ''
as $fn$
  select coalesce(c.nb_participants, (select count(*)::integer from public.concours_participations p where p.concours_id = c.id)), coalesce(c.nb_exclusions, (select count(*)::integer from public.concours_exclusions e where e.concours_id = c.id)) from public.concours c where c.id = p_concours;
$fn$;
revoke all on function public.concours_resume(text) from public;
grant execute on function public.concours_resume(text) to anon, authenticated;
