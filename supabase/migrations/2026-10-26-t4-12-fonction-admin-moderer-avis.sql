-- T4 · 12/12 — Modération (admin) : masquer, rétablir (efface les signalements) ou supprimer un avis.
create or replace function public.admin_moderer_avis(p_avis uuid, p_action text)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if not public.est_admin() then
    raise exception 'NON_ADMIN';
  end if;
  if p_action = 'masquer' then
    update public.avis set masque = true where id = p_avis;
  elsif p_action = 'retablir' then
    delete from public.signalements_avis where avis_id = p_avis;
    update public.avis set masque = false, nb_signalements = 0 where id = p_avis;
  elsif p_action = 'supprimer' then
    delete from public.avis where id = p_avis;
  else
    raise exception 'ACTION_INVALIDE';
  end if;
end;
$fn$;
revoke all on function public.admin_moderer_avis(uuid, text) from public;
grant execute on function public.admin_moderer_avis(uuid, text) to authenticated;
