-- Concours · 13/17 — Exclusion pour fraude (admin seulement) : supprime la participation et l'écrit dans
-- concours_exclusions (motif de 3 à 200 caractères, lisible par le joueur concerné). Possible tant que le concours n'est
-- pas tiré (y compris entre la fin et le tirage, le moment des contrôles). Le nombre d'exclusions est public
-- (concours_resume) et figé au tirage. Renvoie 1 si une participation a été supprimée, 0 sinon.
-- Refus : NON_ADMIN, CONCOURS_INCONNU, CONCOURS_DEJA_TIRE, MOTIF_INCORRECT, PARTICIPATION_INCONNUE.
-- Depuis le SQL Editor : même préambule set_config que pour admin_tirer_au_sort (concours-11).
create or replace function public.admin_exclure_participation(p_concours text, p_user uuid, p_motif text)
returns integer
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  c public.concours%rowtype;
  nb integer;
begin
  if not public.est_admin() then
    raise exception 'NON_ADMIN';
  end if;
  select * into c from public.concours where id = p_concours for update;
  if not found then
    raise exception 'CONCOURS_INCONNU';
  end if;
  if c.tire_le is not null then
    raise exception 'CONCOURS_DEJA_TIRE';
  end if;
  if p_motif is null or char_length(btrim(p_motif)) not between 3 and 200 then
    raise exception 'MOTIF_INCORRECT';
  end if;
  delete from public.concours_participations where concours_id = p_concours and user_id = p_user;
  get diagnostics nb = row_count;
  if nb = 0 then
    raise exception 'PARTICIPATION_INCONNUE';
  end if;
  insert into public.concours_exclusions (concours_id, user_id, motif, exclu_le) values (p_concours, p_user, btrim(p_motif), now()) on conflict (concours_id, user_id) do nothing;
  return nb;
end;
$fn$;
revoke all on function public.admin_exclure_participation(text, uuid, text) from public, anon;
grant execute on function public.admin_exclure_participation(text, uuid, text) to authenticated;
