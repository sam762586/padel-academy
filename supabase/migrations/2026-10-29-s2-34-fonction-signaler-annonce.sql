-- S2 bis · 34/42 — Signaler une annonce (remplace la version de schema-partenaires.sql, même nom, même signature).
-- Même règle que les avis (s2-33) : masquage automatique à 3 signaleurs dont le compte a plus de 7 jours et un e-mail
-- confirmé ; les autres signalements sont enregistrés et comptés dans nb_signalements, sans masquer.
create or replace function public.signaler_annonce(p_annonce uuid, p_motif text, p_detail text default null)
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
  if p_motif is null or p_motif not in ('contact','commercial','irrespectueux','faux','autre') then
    raise exception 'MOTIF_INVALIDE';
  end if;
  if p_detail is not null and char_length(p_detail) > 200 then
    raise exception 'DETAIL_TROP_LONG';
  end if;
  select user_id, masquee, tournoi_date_fin into cible from public.annonces where id = p_annonce for update;
  if not found or (not public.est_admin() and (cible.masquee or cible.tournoi_date_fin < current_date)) then
    raise exception 'ANNONCE_INTROUVABLE';
  end if;
  if cible.user_id = auth.uid() then
    raise exception 'ANNONCE_PROPRE';
  end if;
  begin
    insert into public.signalements (annonce_id, user_id, motif, detail) values (p_annonce, auth.uid(), p_motif, nullif(btrim(p_detail), ''));
  exception when unique_violation then
    raise exception 'DEJA_SIGNALE';
  end;
  select count(distinct user_id) into nb from public.signalements where annonce_id = p_annonce;
  select count(distinct s.user_id) into nb_fiables from public.signalements s join auth.users u on u.id = s.user_id where s.annonce_id = p_annonce and u.email_confirmed_at is not null and u.created_at < now() - interval '7 days';
  update public.annonces set nb_signalements = nb, masquee = (masquee or nb_fiables >= 3) where id = p_annonce;
  return nb;
end;
$fn$;
revoke all on function public.signaler_annonce(uuid, text, text) from public, anon;
grant execute on function public.signaler_annonce(uuid, text, text) to authenticated;
