-- Concours · 12/17 — Remplaçant (admin seulement) : si un gagnant ne répond pas, renonce ou est écarté, désigne le
-- participant suivant du MÊME classement (même graine, même empreinte SHA-256, ordre "C") qui n'est pas déjà dans
-- concours_gagnants. Ajoute une ligne de rang suivant (> nb_gagnants) ; la ligne du premier gagnant reste (trace).
-- Renvoie le user_id du remplaçant. Refus : NON_ADMIN, CONCOURS_INCONNU, CONCOURS_NON_TIRE, AUCUN_REMPLACANT (plus
-- personne dans le classement, ou participations déjà purgées).
-- Depuis le SQL Editor : même préambule set_config que pour admin_tirer_au_sort (concours-11).
create or replace function public.admin_designer_remplacant(p_concours text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  c public.concours%rowtype;
  v_user uuid;
  v_empreinte text;
  v_rang integer;
begin
  if not public.est_admin() then
    raise exception 'NON_ADMIN';
  end if;
  select * into c from public.concours where id = p_concours for update;
  if not found then
    raise exception 'CONCOURS_INCONNU';
  end if;
  if c.tire_le is null or c.graine is null then
    raise exception 'CONCOURS_NON_TIRE';
  end if;
  select t.user_id, t.empreinte into v_user, v_empreinte from (select p.user_id, encode(sha256(convert_to(c.graine || ':' || p.user_id::text, 'UTF8')), 'hex') as empreinte from public.concours_participations p where p.concours_id = p_concours and not exists (select 1 from public.concours_gagnants g where g.concours_id = p_concours and g.user_id = p.user_id)) t order by t.empreinte collate "C", t.user_id limit 1;
  if v_user is null then
    raise exception 'AUCUN_REMPLACANT';
  end if;
  select greatest(coalesce(max(g.rang), 0), c.nb_gagnants) + 1 into v_rang from public.concours_gagnants g where g.concours_id = p_concours;
  insert into public.concours_gagnants (concours_id, rang, user_id, empreinte, tire_le) values (p_concours, v_rang, v_user, v_empreinte, now());
  return v_user;
end;
$fn$;
revoke all on function public.admin_designer_remplacant(text) from public, anon;
grant execute on function public.admin_designer_remplacant(text) to authenticated;
