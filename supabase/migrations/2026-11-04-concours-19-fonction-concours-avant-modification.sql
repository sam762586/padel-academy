-- Concours · annulation 2/7 (concours-19) — Remplace concours-02 (même déclencheur, concours-03 inchangé) : en plus, un
-- concours annulé ne se modifie plus et ne se supprime plus depuis le site (CONCOURS_FIGE). Le SQL Editor (auth.uid()
-- vide) reste le recours, comme avant. Le reste est identique à concours-02.
create or replace function public.concours_avant_modification()
returns trigger
language plpgsql
set search_path = public
as $fn$
begin
  if auth.uid() is null and tg_op = 'DELETE' then
    return old;
  end if;
  if auth.uid() is null then
    return new;
  end if;
  if old.tire_le is not null or old.annule_le is not null then
    raise exception 'CONCOURS_FIGE';
  end if;
  if tg_op = 'DELETE' then
    if now() >= old.date_debut then
      raise exception 'CONCOURS_FIGE';
    end if;
    return old;
  end if;
  if now() >= old.date_debut and (new.date_debut is distinct from old.date_debut or new.nb_gagnants is distinct from old.nb_gagnants or new.date_fin < old.date_fin) then
    raise exception 'CONCOURS_FIGE';
  end if;
  if now() >= old.date_fin and new.date_fin is distinct from old.date_fin then
    raise exception 'CONCOURS_FIGE';
  end if;
  return new;
end;
$fn$;
revoke all on function public.concours_avant_modification() from public, anon, authenticated;
