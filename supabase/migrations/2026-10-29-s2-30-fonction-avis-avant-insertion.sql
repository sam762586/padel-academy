-- S2 bis · 30/42 — Contrôles à l'écriture d'un avis (remplace la version s2-06, même nom ; le déclencheur t4-09 ne change pas).
-- En plus de s2-06 : pseudo au format (PSEUDO_REQUIS), e-mail du compte confirmé (EMAIL_NON_CONFIRME) et compte créé AVANT
-- le premier jour du tournoi (AVIS_COMPTE_RECENT) : on ne crée pas un compte pour noter un tournoi en cours.
-- auth.users (date de création, confirmation de l'e-mail) est lu grâce à SECURITY DEFINER ; rien n'en est renvoyé.
create or replace function public.avis_avant_insertion()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  profil record;
  ref record;
  compte record;
begin
  if auth.uid() is null or new.user_id is distinct from auth.uid() then
    raise exception 'NON_CONNECTE';
  end if;
  select pseudo, age_confirme_at, charte_acceptee_at into profil from public.profiles where id = new.user_id;
  if not found or profil.age_confirme_at is null or profil.charte_acceptee_at is null then
    raise exception 'CHARTE_REQUISE';
  end if;
  if not public.pseudo_valide(profil.pseudo) then
    raise exception 'PSEUDO_REQUIS';
  end if;
  select club, date_debut, date_fin into ref from public.tournois_ref where id = new.tournoi_id;
  if not found then
    raise exception 'TOURNOI_INCONNU';
  end if;
  if ref.date_debut > current_date then
    raise exception 'TOURNOI_PAS_COMMENCE';
  end if;
  select created_at, email_confirmed_at into compte from auth.users where id = new.user_id;
  if not found or compte.email_confirmed_at is null then
    raise exception 'EMAIL_NON_CONFIRME';
  end if;
  if compte.created_at >= ref.date_debut::timestamptz then
    raise exception 'AVIS_COMPTE_RECENT';
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
