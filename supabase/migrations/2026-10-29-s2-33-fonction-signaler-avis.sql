-- S2 bis · 33/42 — Signaler un avis (remplace la version t4-11, même nom, même signature, même valeur renvoyée).
-- Masquage automatique à 3 signaleurs « fiables » seulement : compte de plus de 7 jours ET e-mail confirmé (auth.users, lu
-- grâce à SECURITY DEFINER). Trois comptes créés pour l'occasion ne font plus disparaître un avis. Les autres signalements
-- sont enregistrés et comptés dans nb_signalements (l'admin les voit dans Mon compte) mais ne masquent pas.
create or replace function public.signaler_avis(p_avis uuid, p_motif text)
returns integer
language plpgsql
security definer
set search_path = public
as $fn$
declare
  cible record;
  nb integer;
  nb_fiables integer;
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
  select count(distinct s.user_id) into nb_fiables from public.signalements_avis s join auth.users u on u.id = s.user_id where s.avis_id = p_avis and u.email_confirmed_at is not null and u.created_at < now() - interval '7 days';
  update public.avis set nb_signalements = nb, masque = (masque or nb_fiables >= 3) where id = p_avis;
  return nb;
end;
$fn$;
revoke all on function public.signaler_avis(uuid, text) from public, anon;
grant execute on function public.signaler_avis(uuid, text) to authenticated;
