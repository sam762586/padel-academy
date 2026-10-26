-- T4 · 8/12 — Contrôles à l'écriture d'un avis : charte acceptée, pseudo, tournoi commencé.
create or replace function public.avis_avant_insertion()
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
  select pseudo, age_confirme_at, charte_acceptee_at into profil from public.profiles where id = new.user_id;
  if not found or profil.age_confirme_at is null or profil.charte_acceptee_at is null then
    raise exception 'CHARTE_REQUISE';
  end if;
  if profil.pseudo is null or char_length(btrim(profil.pseudo)) = 0 then
    raise exception 'PSEUDO_REQUIS';
  end if;
  if new.tournoi_date_debut > current_date then
    raise exception 'TOURNOI_PAS_COMMENCE';
  end if;
  new.pseudo := profil.pseudo;
  new.texte := btrim(coalesce(new.texte, ''));
  new.masque := false;
  new.nb_signalements := 0;
  new.created_at := now();
  return new;
end;
$fn$;
