-- T4 · 5/12 — Nombre d'annonces « cherche partenaire » visibles d'un tournoi, lisible même sans compte.
-- Le contenu des annonces reste réservé aux joueurs connectés (règles de schema-partenaires.sql).
create or replace function public.nb_annonces_tournoi(p_tournoi text)
returns integer
language sql
stable
security definer
set search_path = public
as $fn$
  select count(*)::integer from public.annonces where tournoi_id = p_tournoi and masquee = false and statut = 'active' and tournoi_date_fin >= current_date;
$fn$;
revoke all on function public.nb_annonces_tournoi(text) from public;
grant execute on function public.nb_annonces_tournoi(text) to anon, authenticated;
