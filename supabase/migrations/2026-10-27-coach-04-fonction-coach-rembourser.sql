-- Coach IA · 4/4 — Rend une question du jour quand le coach n'a pas pu répondre (erreur, refus).
-- Réservée à la clé de service (fonction « coach ») : un joueur ne peut pas remettre son compteur à zéro.
create or replace function public.coach_rembourser(p_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
begin
  update public.coach_usage set nb = nb - 1 where user_id = p_user and jour = current_date and nb > 0;
end;
$fn$;
revoke execute on function public.coach_rembourser(uuid) from public, anon, authenticated;
grant execute on function public.coach_rembourser(uuid) to service_role;
