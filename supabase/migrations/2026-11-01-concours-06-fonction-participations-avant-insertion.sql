-- Concours · 6/17 — Messages clairs avant l'ajout d'une participation (la règle RLS de concours-04 reste le vrai verrou ;
-- ce déclencheur passe AVANT elle et dit pourquoi c'est refusé, au lieu du message générique « row-level security ») :
--   CONCOURS_INCONNU, ORGANISATEUR_EXCLU (compte admin), PARTICIPATION_EXCLUE (exclu pour fraude de ce concours),
--   CONCOURS_PAS_COMMENCE, CONCOURS_TERMINE (fin passée ou tirage fait), CASES_NON_COCHEES.
-- La date d'inscription est toujours celle de la base.
create or replace function public.concours_participations_avant_insertion()
returns trigger
language plpgsql
set search_path = public
as $fn$
declare
  c record;
begin
  select date_debut, date_fin, tire_le into c from public.concours where id = new.concours_id;
  if not found then
    raise exception 'CONCOURS_INCONNU';
  end if;
  if public.est_admin() then
    raise exception 'ORGANISATEUR_EXCLU';
  end if;
  if exists (select 1 from public.concours_exclusions e where e.concours_id = new.concours_id and e.user_id = new.user_id) then
    raise exception 'PARTICIPATION_EXCLUE';
  end if;
  if now() < c.date_debut then
    raise exception 'CONCOURS_PAS_COMMENCE';
  end if;
  if now() >= c.date_fin or c.tire_le is not null then
    raise exception 'CONCOURS_TERMINE';
  end if;
  if new.atteste_majeur_ou_accord is not true or new.accepte_reglement is not true then
    raise exception 'CASES_NON_COCHEES';
  end if;
  new.cree_le := now();
  return new;
end;
$fn$;
revoke all on function public.concours_participations_avant_insertion() from public, anon, authenticated;
