-- S2 bis · 29/42 — Contrôles à la publication d'une annonce (remplace la version de schema-partenaires.sql, même nom ;
-- le déclencheur annonces_avant_insertion existant l'appelle sans changement).
-- Nouveau : le tournoi doit exister dans tournois_ref (sinon TOURNOI_INCONNU) ; ses dates sont recopiées depuis la table,
-- ainsi que nom, ville, catégorie et département quand le générateur les a remplis (s2-28). Sinon (colonne nom vide), les
-- textes envoyés par le navigateur sont gardés mais doivent passer le filtre d'insultes et de coordonnées
-- (avis_texte_correct) ; un département qui n'a pas la forme 33, 974, 2A est effacé. Pseudo au format (PSEUDO_REQUIS).
create or replace function public.annonces_avant_insertion()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  profil record;
  ref record;
  nb_actives integer;
begin
  if auth.uid() is null or new.user_id is distinct from auth.uid() then
    raise exception 'NON_CONNECTE';
  end if;
  perform pg_advisory_xact_lock(hashtext('annonces:' || new.user_id::text));
  select pseudo, niveau_declare, classement_p, age_confirme_at, charte_acceptee_at into profil from public.profiles where id = new.user_id;
  if not found or profil.age_confirme_at is null or profil.charte_acceptee_at is null then
    raise exception 'CHARTE_REQUISE';
  end if;
  if not public.pseudo_valide(profil.pseudo) then
    raise exception 'PSEUDO_REQUIS';
  end if;
  select date_debut, date_fin, nom, ville, categorie, dep into ref from public.tournois_ref where id = new.tournoi_id;
  if not found then
    raise exception 'TOURNOI_INCONNU';
  end if;
  new.tournoi_date_debut := ref.date_debut;
  new.tournoi_date_fin := ref.date_fin;
  if ref.nom is not null then
    new.tournoi_nom := ref.nom;
    new.tournoi_ville := ref.ville;
    new.tournoi_categorie := ref.categorie;
    new.tournoi_dep := ref.dep;
  else
    new.tournoi_nom := btrim(coalesce(new.tournoi_nom, ''));
    new.tournoi_ville := nullif(btrim(coalesce(new.tournoi_ville, '')), '');
    new.tournoi_categorie := nullif(btrim(coalesce(new.tournoi_categorie, '')), '');
    if not (public.avis_texte_correct(new.tournoi_nom) and public.avis_texte_correct(new.tournoi_ville) and public.avis_texte_correct(new.tournoi_categorie)) then
      raise exception 'TEXTE_TOURNOI_INCORRECT';
    end if;
    if new.tournoi_dep is not null and new.tournoi_dep !~ '^([0-9]{2,3}|2[ABab])$' then
      new.tournoi_dep := null;
    end if;
  end if;
  if new.tournoi_date_fin < current_date then
    raise exception 'TOURNOI_PASSE';
  end if;
  select count(*) into nb_actives from public.annonces where user_id = new.user_id and statut = 'active' and tournoi_date_fin >= current_date;
  if nb_actives >= 5 then
    raise exception 'LIMITE_ANNONCES';
  end if;
  new.pseudo := profil.pseudo;
  new.niveau_declare := profil.niveau_declare;
  new.classement_p := profil.classement_p;
  new.statut := 'active';
  new.masquee := false;
  new.nb_signalements := 0;
  new.created_at := now();
  return new;
end;
$fn$;
revoke all on function public.annonces_avant_insertion() from public, anon, authenticated;
