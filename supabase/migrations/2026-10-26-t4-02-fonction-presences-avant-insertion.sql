-- T4 · 2/12 — Remplit pseudo et classement depuis le profil ; pseudo obligatoire.
-- ATTENTION (S2) : remplacé en partie par les migrations 2026-10-29-s2. Si tu relances ce fichier après elles, relance ensuite s2-31 (sinon la faille corrigée par S2 revient).
create or replace function public.presences_avant_insertion()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  profil record;
begin
  if auth.uid() is null or new.user_id is distinct from auth.uid() then
    raise exception 'NON_CONNECTE';
  end if;
  select pseudo, classement_p into profil from public.profiles where id = new.user_id;
  if not found or profil.pseudo is null or char_length(btrim(profil.pseudo)) = 0 then
    raise exception 'PSEUDO_REQUIS';
  end if;
  new.pseudo := profil.pseudo;
  new.classement_p := profil.classement_p;
  new.created_at := now();
  return new;
end;
$fn$;
