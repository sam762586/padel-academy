-- S2 · 13/23 — Joueurs du site inscrits à UN tournoi (« J'y vais ») : pseudo, classement, et est_moi pour l'appelant.
-- ATTENTION (S2 bis) : remplacé(e) par 2026-10-29-s2-32. Si tu relances ce fichier, relance ensuite s2-32 (sinon la faille corrigée revient).
-- Réservée aux joueurs connectés ; ne renvoie jamais user_id. 100 lignes au plus, dans l'ordre d'inscription.
create or replace function public.presences_tournoi(p_tournoi text)
returns table (pseudo text, classement_p text, est_moi boolean)
language sql
stable
security definer
set search_path = public
as $fn$
  select p.pseudo, p.classement_p, p.user_id = auth.uid() from public.presences p where auth.uid() is not null and p.tournoi_id = p_tournoi order by p.created_at limit 100;
$fn$;
revoke all on function public.presences_tournoi(text) from public, anon;
grant execute on function public.presences_tournoi(text) to authenticated;
