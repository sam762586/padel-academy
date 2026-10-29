-- S2 · 12/23 — « J'y vais » (remplace la version t4-02) : le tournoi doit exister dans tournois_ref et ne pas être terminé.
-- ATTENTION (S2 bis) : remplacé(e) par 2026-10-29-s2-31. Si tu relances ce fichier, relance ensuite s2-31 (sinon la faille corrigée revient).
-- Sa date de fin permet de supprimer les présences une fois le tournoi passé (purger_donnees, fichier s2-23).
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
  if not found or profil.pseudo is null or char_length(btrim(profil.pseudo)) = 0 then
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
