-- S2 bis · 31/42 — « J'y vais » (remplace la version s2-12, même nom ; le déclencheur t4-03 ne change pas).
-- En plus de s2-12 : le pseudo recopié doit être au format (pseudo_valide, s2-26), sinon PSEUDO_REQUIS.
create or replace function public.presences_avant_insertion()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  profil record;
  fin date;
begin
  if auth.uid() is null or new.user_id is distinct from auth.uid() then
    raise exception 'NON_CONNECTE';
  end if;
  select pseudo, classement_p into profil from public.profiles where id = new.user_id;
  if not found or not public.pseudo_valide(profil.pseudo) then
    raise exception 'PSEUDO_REQUIS';
  end if;
  select date_fin into fin from public.tournois_ref where id = new.tournoi_id;
  if not found then
    raise exception 'TOURNOI_INCONNU';
  end if;
  if fin < current_date then
    raise exception 'TOURNOI_TERMINE';
  end if;
  new.pseudo := profil.pseudo;
  new.classement_p := profil.classement_p;
  new.created_at := now();
  return new;
end;
$fn$;
revoke all on function public.presences_avant_insertion() from public, anon, authenticated;
