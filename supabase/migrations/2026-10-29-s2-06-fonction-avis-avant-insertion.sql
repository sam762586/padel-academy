-- S2 · 6/23 — Contrôles à l'écriture d'un avis (remplace la version t4-08) : le tournoi doit exister dans tournois_ref,
-- ATTENTION (S2 bis) : remplacé(e) par 2026-10-29-s2-30. Si tu relances ce fichier, relance ensuite s2-30 (sinon la faille corrigée revient).
-- et le club et les dates sont recopiés depuis cette table (ce que le navigateur envoie pour ces champs est ignoré).
create or replace function public.avis_avant_insertion()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  profil record;
  ref record;
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
  select club, date_debut, date_fin into ref from public.tournois_ref where id = new.tournoi_id;
  if not found then
    raise exception 'TOURNOI_INCONNU';
  end if;
  if ref.date_debut > current_date then
    raise exception 'TOURNOI_PAS_COMMENCE';
  end if;
  new.club := ref.club;
  new.tournoi_date_debut := ref.date_debut;
  new.tournoi_date_fin := ref.date_fin;
  new.pseudo := profil.pseudo;
  new.texte := btrim(coalesce(new.texte, ''));
  new.masque := false;
  new.nb_signalements := 0;
  new.created_at := now();
  return new;
end;
$fn$;
revoke all on function public.avis_avant_insertion() from public, anon, authenticated;
