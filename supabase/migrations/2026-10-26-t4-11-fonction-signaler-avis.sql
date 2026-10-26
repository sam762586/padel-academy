-- T4 · 11/12 — Signaler un avis : un signalement par joueur ; masqué automatiquement à 3 joueurs différents.
create or replace function public.signaler_avis(p_avis uuid, p_motif text)
returns integer
language plpgsql
security definer
set search_path = public
as $fn$
declare
  cible record;
  nb integer;
begin
  if auth.uid() is null then
    raise exception 'NON_CONNECTE';
  end if;
  if p_motif is null or p_motif not in ('contact','nom','irrespectueux','faux','autre') then
    raise exception 'MOTIF_INVALIDE';
  end if;
  select user_id, masque into cible from public.avis where id = p_avis for update;
  if not found or (cible.masque and not public.est_admin()) then
    raise exception 'AVIS_INTROUVABLE';
  end if;
  if cible.user_id = auth.uid() then
    raise exception 'AVIS_PROPRE';
  end if;
  begin
    insert into public.signalements_avis (avis_id, user_id, motif) values (p_avis, auth.uid(), p_motif);
  exception when unique_violation then
    raise exception 'DEJA_SIGNALE';
  end;
  select count(distinct user_id) into nb from public.signalements_avis where avis_id = p_avis;
  update public.avis set nb_signalements = nb, masque = (masque or nb >= 3) where id = p_avis;
  return nb;
end;
$fn$;
revoke all on function public.signaler_avis(uuid, text) from public;
grant execute on function public.signaler_avis(uuid, text) to authenticated;
