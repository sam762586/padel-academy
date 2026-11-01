-- Concours · 2/17 — Garde-fou des modifications et suppressions faites depuis le site (compte admin connecté, auth.uid()
-- renseigné). Code unique : CONCOURS_FIGE.
--   concours tiré                 : plus aucune modification ni suppression ;
--   concours commencé (début passé) : date_debut et nb_gagnants ne changent plus, la date de fin peut seulement reculer
--                                   (prolonger, jamais raccourcir), le concours ne se supprime plus ;
--   concours fini (fin passée)    : date_fin ne change plus.
-- Le SQL Editor (auth.uid() vide) n'est pas bloqué : c'est le recours en cas d'erreur de saisie.
-- Le tirage (concours-11) écrit tire_le, graine, nb_participants et nb_exclusions sans toucher aux dates : il passe.
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
  if old.tire_le is not null then
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
