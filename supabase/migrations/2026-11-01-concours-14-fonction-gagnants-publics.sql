-- Concours · 14/17 — Résultat public d'un concours tiré, lisible par tous : rang, pseudo SEULEMENT si le gagnant a accepté
-- (affiche_publiquement ; pseudo lu dans profiles au moment de l'appel, jamais copié), et empreinte de tirage (pour que
-- chacun puisse vérifier le tirage, voir concours-11). Jamais de user_id ni d'e-mail.
-- Concours non tiré, inconnu ou purgé (60 jours après le tirage) : aucune ligne.
create or replace function public.concours_gagnants_publics(p_concours text)
returns table (rang integer, pseudo text, empreinte text)
language sql
stable
security definer
set search_path = ''
as $fn$
  select g.rang, case when g.affiche_publiquement then pr.pseudo end, g.empreinte from public.concours_gagnants g left join public.profiles pr on pr.id = g.user_id where g.concours_id = p_concours order by g.rang;
$fn$;
revoke all on function public.concours_gagnants_publics(text) from public;
grant execute on function public.concours_gagnants_publics(text) to anon, authenticated;
