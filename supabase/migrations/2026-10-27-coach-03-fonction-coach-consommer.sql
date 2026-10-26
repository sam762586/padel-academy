-- Coach IA · 3/4 — Compte une question du jour pour un joueur. Renvoie le nombre de questions restantes, ou -1 si
-- le quota du jour est atteint (rien n'est compté). Réservée à la clé de service (fonction « coach »).
create or replace function public.coach_consommer(p_user uuid, p_limite integer)
returns integer
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_nb integer;
begin
  if p_user is null or p_limite is null or p_limite < 1 or p_limite > 100 then
    raise exception 'paramètres invalides';
  end if;
  insert into public.coach_usage as u (user_id, jour, nb) values (p_user, current_date, 1)
  on conflict (user_id, jour) do update set nb = u.nb + 1 where u.nb < p_limite
  returning u.nb into v_nb;
  if v_nb is null then
    return -1;
  end if;
  return p_limite - v_nb;
end;
$fn$;
revoke execute on function public.coach_consommer(uuid, integer) from public, anon, authenticated;
grant execute on function public.coach_consommer(uuid, integer) to service_role;
