-- Concours · annulation 5/7 (concours-22) — Remplace concours-11 : le tirage d'un concours annulé est refusé
-- (CONCOURS_ANNULE, après CONCOURS_DEJA_TIRE). Méthode, graine EuroMillions, droits et autres refus inchangés (voir les
-- commentaires de concours-11).
create or replace function public.admin_tirer_au_sort(p_concours text, p_graine text)
returns setof uuid
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  c public.concours%rowtype;
  v_date date;
  v_nb integer;
  v_excl integer;
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
  if c.annule_le is not null then
    raise exception 'CONCOURS_ANNULE';
  end if;
  if now() < c.date_fin then
    raise exception 'CONCOURS_NON_TERMINE';
  end if;
  if p_graine is null or p_graine !~ '^\d{4}-\d{2}-\d{2}:([1-9]|[1-4]\d|50)(-([1-9]|[1-4]\d|50)){4}:([1-9]|1[0-2])-([1-9]|1[0-2])$' then
    raise exception 'GRAINE_INCORRECTE';
  end if;
  if (select count(distinct x) from unnest(string_to_array(split_part(p_graine, ':', 2), '-')) x) <> 5 or split_part(split_part(p_graine, ':', 3), '-', 1) = split_part(split_part(p_graine, ':', 3), '-', 2) then
    raise exception 'GRAINE_INCORRECTE';
  end if;
  begin
    v_date := substr(p_graine, 1, 10)::date;
  exception when others then
    raise exception 'GRAINE_INCORRECTE';
  end;
  if v_date <= (c.date_fin at time zone 'Europe/Paris')::date or v_date > (now() at time zone 'Europe/Paris')::date then
    raise exception 'GRAINE_DATE_INCORRECTE';
  end if;
  select count(*) into v_nb from public.concours_participations where concours_id = p_concours;
  select count(*) into v_excl from public.concours_exclusions where concours_id = p_concours;
  insert into public.concours_gagnants (concours_id, rang, user_id, empreinte, tire_le) select p_concours, row_number() over (order by t.empreinte collate "C", t.user_id), t.user_id, t.empreinte, now() from (select p.user_id, encode(sha256(convert_to(p_graine || ':' || p.user_id::text, 'UTF8')), 'hex') as empreinte from public.concours_participations p where p.concours_id = p_concours) t order by t.empreinte collate "C", t.user_id limit c.nb_gagnants;
  update public.concours set tire_le = now(), graine = p_graine, nb_participants = v_nb, nb_exclusions = v_excl where id = p_concours;
  return query select g.user_id from public.concours_gagnants g where g.concours_id = p_concours order by g.rang;
end;
$fn$;
revoke all on function public.admin_tirer_au_sort(text, text) from public, anon;
grant execute on function public.admin_tirer_au_sort(text, text) to authenticated;
