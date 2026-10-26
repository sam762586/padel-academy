-- Padel Academy : schéma Supabase (phase 2 : « Trouver un partenaire » pour un tournoi)
-- À exécuter à la main dans Supabase > SQL Editor, APRÈS schema.sql. Peut être relancé sans risque (idempotent).
--
-- Règles appliquées ici :
--  - les annonces ne sont lisibles que par les utilisateurs connectés (RLS, jamais par les anonymes) ;
--  - aucun e-mail ni téléphone dans une annonce (CHECK côté base) ;
--  - 5 annonces actives maximum par utilisateur (trigger) ;
--  - les compteurs, le masquage automatique, l'acceptation et la modération passent par des fonctions
--    SECURITY DEFINER : le client n'a AUCUN droit d'UPDATE sur ces tables ;
--  - tout part en cascade quand un compte est supprimé (delete_my_account() de schema.sql suffit).

-- ============================================================
-- 1. Colonnes en plus sur profiles : admin et consentements
-- ============================================================
alter table public.profiles add column if not exists is_admin           boolean not null default false;
alter table public.profiles add column if not exists age_confirme_at    timestamptz;
alter table public.profiles add column if not exists charte_acceptee_at timestamptz;
alter table public.profiles add column if not exists charte_version     smallint;

-- Un utilisateur peut modifier son profil (policy profiles_update) : on l'empêche de se donner le rôle
-- admin ou de falsifier ses consentements. Ces 4 colonnes ne sont modifiables que depuis le SQL Editor
-- (rôle postgres) ou par les fonctions SECURITY DEFINER ci-dessous.
create or replace function public.profiles_proteger_colonnes()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      new.is_admin := false;
      new.age_confirme_at := null;
      new.charte_acceptee_at := null;
      new.charte_version := null;
    else
      new.is_admin := old.is_admin;
      new.age_confirme_at := old.age_confirme_at;
      new.charte_acceptee_at := old.charte_acceptee_at;
      new.charte_version := old.charte_version;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_proteger_colonnes on public.profiles;
create trigger profiles_proteger_colonnes
  before insert or update on public.profiles
  for each row execute function public.profiles_proteger_colonnes();

-- ============================================================
-- 2. Fonctions utilitaires
-- ============================================================
-- Vrai si l'appelant est admin (lit profiles avec les droits du propriétaire)
create or replace function public.est_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- Faux si le texte contient un e-mail, un numéro de téléphone (9 chiffres ou plus, séparateurs tolérés),
-- un lien ou une messagerie. Utilisée par le CHECK des annonces ; le même filtre existe côté navigateur.
create or replace function public.message_sans_contact(p_texte text)
returns boolean
language sql
immutable
set search_path = public
as $$
  select p_texte is null or not (
    position('@' in p_texte) > 0
    or p_texte ~* '(arobase|\[at\]|\(at\))'
    or p_texte ~ '[0-9]([[:space:].-]{0,3}[0-9]){8,}'
    or p_texte ~* '(https?:|www\.)'
    or p_texte ~* '\y(gmail|hotmail|outlook|yahoo|icloud|whatsapp|telegram|snapchat|instagram|facebook|messenger)\y'
  );
$$;

-- ============================================================
-- 3. Table annonces
--    (tournoi_* = instantané des données du tournoi, car tournois.json est statique)
-- ============================================================
create table if not exists public.annonces (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  tournoi_id        text not null check (char_length(tournoi_id) between 1 and 40),
  tournoi_nom       text not null check (char_length(tournoi_nom) between 1 and 200),
  tournoi_date_debut date not null,
  tournoi_date_fin  date not null,
  tournoi_ville     text check (tournoi_ville is null or char_length(tournoi_ville) <= 100),
  tournoi_dep       text check (tournoi_dep is null or char_length(tournoi_dep) <= 3),
  tournoi_categorie text check (tournoi_categorie is null or char_length(tournoi_categorie) <= 20),
  pseudo            text not null check (char_length(pseudo) between 1 and 30),
  niveau_declare    smallint check (niveau_declare between 1 and 4),
  classement_p      text check (classement_p in ('P25','P50','P100','P250','P500','P1000','P2000','P3000')),
  cote              text not null default 'indifferent' check (cote in ('droite','gauche','indifferent')),
  sexe              text not null check (sexe in ('messieurs','dames','mixte')),
  message           text not null default '' check (char_length(message) <= 500),
  statut            text not null default 'active' check (statut in ('active','complete')),
  masquee           boolean not null default false,
  nb_signalements   integer not null default 0,
  created_at        timestamptz not null default now(),
  constraint annonces_message_sans_contact check (public.message_sans_contact(message)),
  constraint annonces_dates_coherentes check (tournoi_date_fin >= tournoi_date_debut)
);
create index if not exists annonces_tournoi_idx on public.annonces (tournoi_id);
create index if not exists annonces_fin_idx     on public.annonces (tournoi_date_fin);
create index if not exists annonces_user_idx    on public.annonces (user_id);
-- Une seule annonce par utilisateur, tournoi et épreuve
create unique index if not exists annonces_unique_idx on public.annonces (user_id, tournoi_id, sexe);

-- Avant insertion : contrôles et valeurs imposées par la base (le client ne décide pas de ces champs)
create or replace function public.annonces_avant_insertion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  profil record;
  nb_actives integer;
begin
  if auth.uid() is null or new.user_id is distinct from auth.uid() then
    raise exception 'NON_CONNECTE';
  end if;
  -- Évite deux insertions simultanées qui contourneraient la limite
  perform pg_advisory_xact_lock(hashtext('annonces:' || new.user_id::text));

  select pseudo, niveau_declare, classement_p, age_confirme_at, charte_acceptee_at
    into profil from public.profiles where id = new.user_id;
  if not found or profil.age_confirme_at is null or profil.charte_acceptee_at is null then
    raise exception 'CHARTE_REQUISE';
  end if;
  if profil.pseudo is null or char_length(btrim(profil.pseudo)) = 0 then
    raise exception 'PSEUDO_REQUIS';
  end if;
  if new.tournoi_date_fin < current_date then
    raise exception 'TOURNOI_PASSE';
  end if;

  select count(*) into nb_actives from public.annonces
   where user_id = new.user_id and statut = 'active' and tournoi_date_fin >= current_date;
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
$$;

drop trigger if exists annonces_avant_insertion on public.annonces;
create trigger annonces_avant_insertion
  before insert on public.annonces
  for each row execute function public.annonces_avant_insertion();

-- ============================================================
-- 4. Table reponses : « Je suis intéressé·e » (privée entre les deux joueurs)
--    Ces messages sont volontairement SANS filtre de contact : c'est le seul canal pour s'organiser,
--    et seuls l'auteur de l'annonce et l'auteur de la réponse peuvent les lire.
-- ============================================================
create table if not exists public.reponses (
  id             uuid primary key default gen_random_uuid(),
  annonce_id     uuid not null references public.annonces(id) on delete cascade,
  user_id        uuid not null references auth.users(id) on delete cascade,
  pseudo         text not null check (char_length(pseudo) between 1 and 30),
  message        text not null check (char_length(message) between 1 and 300),
  statut         text not null default 'en_attente' check (statut in ('en_attente','acceptee','refusee')),
  message_retour text check (message_retour is null or char_length(message_retour) <= 300),
  created_at     timestamptz not null default now(),
  unique (annonce_id, user_id)
);
create index if not exists reponses_user_idx on public.reponses (user_id);

create or replace function public.reponses_avant_insertion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  profil record;
  cible record;
begin
  if auth.uid() is null or new.user_id is distinct from auth.uid() then
    raise exception 'NON_CONNECTE';
  end if;
  select user_id, statut, masquee, tournoi_date_fin into cible from public.annonces where id = new.annonce_id;
  if not found or cible.masquee or cible.statut <> 'active' or cible.tournoi_date_fin < current_date then
    raise exception 'ANNONCE_INDISPONIBLE';
  end if;
  if cible.user_id = new.user_id then
    raise exception 'ANNONCE_PROPRE';
  end if;
  select pseudo, age_confirme_at, charte_acceptee_at into profil from public.profiles where id = new.user_id;
  if not found or profil.age_confirme_at is null or profil.charte_acceptee_at is null then
    raise exception 'CHARTE_REQUISE';
  end if;
  if profil.pseudo is null or char_length(btrim(profil.pseudo)) = 0 then
    raise exception 'PSEUDO_REQUIS';
  end if;
  new.pseudo := profil.pseudo;
  new.statut := 'en_attente';
  new.message_retour := null;
  new.created_at := now();
  return new;
end;
$$;

drop trigger if exists reponses_avant_insertion on public.reponses;
create trigger reponses_avant_insertion
  before insert on public.reponses
  for each row execute function public.reponses_avant_insertion();

-- ============================================================
-- 5. Table signalements (écrite uniquement par signaler_annonce)
-- ============================================================
create table if not exists public.signalements (
  id         uuid primary key default gen_random_uuid(),
  annonce_id uuid not null references public.annonces(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  motif      text not null check (motif in ('contact','commercial','irrespectueux','faux','autre')),
  detail     text check (detail is null or char_length(detail) <= 200),
  created_at timestamptz not null default now(),
  unique (annonce_id, user_id)
);
create index if not exists signalements_annonce_idx on public.signalements (annonce_id);

-- ============================================================
-- 6. Row Level Security
-- ============================================================
alter table public.annonces     enable row level security;
alter table public.reponses     enable row level security;
alter table public.signalements enable row level security;

-- Droits de table : pas d'UPDATE pour le client, rien du tout pour les anonymes
revoke all on public.annonces, public.reponses, public.signalements from anon;
revoke all on public.annonces, public.reponses, public.signalements from authenticated;
grant select, insert, delete on public.annonces to authenticated;
grant select, insert, delete on public.reponses to authenticated;
grant select on public.signalements to authenticated;

drop policy if exists "annonces_select" on public.annonces;
drop policy if exists "annonces_insert" on public.annonces;
drop policy if exists "annonces_delete" on public.annonces;
-- Connecté uniquement : annonces non masquées et à venir, plus les siennes, plus tout pour un admin
create policy "annonces_select" on public.annonces for select to authenticated
  using (user_id = auth.uid() or public.est_admin() or (masquee = false and tournoi_date_fin >= current_date));
create policy "annonces_insert" on public.annonces for insert to authenticated
  with check (user_id = auth.uid());
create policy "annonces_delete" on public.annonces for delete to authenticated
  using (user_id = auth.uid());

drop policy if exists "reponses_select" on public.reponses;
drop policy if exists "reponses_insert" on public.reponses;
drop policy if exists "reponses_delete" on public.reponses;
-- Lisible par l'auteur de la réponse et par l'auteur de l'annonce, personne d'autre (admin compris)
create policy "reponses_select" on public.reponses for select to authenticated
  using (user_id = auth.uid()
         or exists (select 1 from public.annonces a where a.id = reponses.annonce_id and a.user_id = auth.uid()));
create policy "reponses_insert" on public.reponses for insert to authenticated
  with check (user_id = auth.uid());
create policy "reponses_delete" on public.reponses for delete to authenticated
  using (user_id = auth.uid());

drop policy if exists "signalements_select" on public.signalements;
create policy "signalements_select" on public.signalements for select to authenticated
  using (user_id = auth.uid() or public.est_admin());

-- ============================================================
-- 7. Fonctions appelées par le site (SECURITY DEFINER, search_path fixé)
-- ============================================================
-- 7.1 Enregistre le consentement (15 ans ou plus + charte) avec horodatage
create or replace function public.accepter_charte(p_version smallint default 1)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'NON_CONNECTE'; end if;
  insert into public.profiles (id, age_confirme_at, charte_acceptee_at, charte_version)
    values (auth.uid(), now(), now(), p_version)
  on conflict (id) do update
    set age_confirme_at = now(), charte_acceptee_at = now(), charte_version = p_version, updated_at = now();
end;
$$;

-- 7.2 Signalement : un seul par utilisateur et par annonce ; masquage automatique à 3 signalements distincts
create or replace function public.signaler_annonce(p_annonce uuid, p_motif text, p_detail text default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  cible record;
  nb integer;
begin
  if auth.uid() is null then raise exception 'NON_CONNECTE'; end if;
  if p_motif is null or p_motif not in ('contact','commercial','irrespectueux','faux','autre') then
    raise exception 'MOTIF_INVALIDE';
  end if;
  if p_detail is not null and char_length(p_detail) > 200 then
    raise exception 'DETAIL_TROP_LONG';
  end if;
  select user_id, masquee, tournoi_date_fin into cible from public.annonces where id = p_annonce for update;
  -- On ne signale que ce qu'on peut voir
  if not found or (not public.est_admin() and (cible.masquee or cible.tournoi_date_fin < current_date)) then
    raise exception 'ANNONCE_INTROUVABLE';
  end if;
  if cible.user_id = auth.uid() then
    raise exception 'ANNONCE_PROPRE';
  end if;
  begin
    insert into public.signalements (annonce_id, user_id, motif, detail)
      values (p_annonce, auth.uid(), p_motif, nullif(btrim(p_detail), ''));
  exception when unique_violation then
    raise exception 'DEJA_SIGNALE';
  end;
  select count(distinct user_id) into nb from public.signalements where annonce_id = p_annonce;
  update public.annonces set nb_signalements = nb, masquee = (masquee or nb >= 3) where id = p_annonce;
  return nb;
end;
$$;

-- 7.3 Décision de l'auteur sur une réponse. Accepter => l'annonce passe à « complète »
--     et les autres réponses en attente sont refusées.
create or replace function public.repondre_decision(p_reponse uuid, p_accepter boolean, p_message text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  ligne record;
  retour text := nullif(btrim(coalesce(p_message, '')), '');
begin
  if auth.uid() is null then raise exception 'NON_CONNECTE'; end if;
  if retour is not null and char_length(retour) > 300 then raise exception 'MESSAGE_TROP_LONG'; end if;
  select r.id, r.annonce_id, r.statut as statut_reponse, a.user_id as auteur, a.statut as statut_annonce, a.masquee
    into ligne
    from public.reponses r join public.annonces a on a.id = r.annonce_id
   where r.id = p_reponse
     for update of a;
  if not found then raise exception 'REPONSE_INTROUVABLE'; end if;
  if ligne.auteur <> auth.uid() then raise exception 'INTERDIT'; end if;
  if ligne.statut_reponse <> 'en_attente' then raise exception 'DEJA_TRAITEE'; end if;

  if p_accepter then
    if ligne.masquee then raise exception 'ANNONCE_MASQUEE'; end if;
    if ligne.statut_annonce <> 'active' then raise exception 'ANNONCE_COMPLETE'; end if;
    update public.reponses set statut = 'acceptee', message_retour = retour where id = p_reponse;
    update public.annonces set statut = 'complete' where id = ligne.annonce_id;
    update public.reponses set statut = 'refusee'
      where annonce_id = ligne.annonce_id and id <> p_reponse and statut = 'en_attente';
  else
    update public.reponses set statut = 'refusee', message_retour = retour where id = p_reponse;
  end if;
end;
$$;

-- 7.4 Modération par un admin : masquer, rétablir (efface aussi les signalements) ou supprimer
create or replace function public.admin_moderer(p_annonce uuid, p_action text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.est_admin() then raise exception 'INTERDIT'; end if;
  if p_action = 'masquer' then
    update public.annonces set masquee = true where id = p_annonce;
  elsif p_action = 'retablir' then
    delete from public.signalements where annonce_id = p_annonce;
    update public.annonces set masquee = false, nb_signalements = 0 where id = p_annonce;
  elsif p_action = 'supprimer' then
    delete from public.annonces where id = p_annonce;
  else
    raise exception 'ACTION_INVALIDE';
  end if;
end;
$$;

-- 7.5 Purge : supprime les annonces dont le tournoi est fini depuis plus de 30 jours
--     (les réponses et signalements partent en cascade). Réservée au propriétaire (pg_cron / SQL Editor).
create or replace function public.purger_annonces()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  nb integer;
begin
  delete from public.annonces where tournoi_date_fin < current_date - 30;
  get diagnostics nb = row_count;
  return nb;
end;
$$;

-- Droits d'exécution : jamais les anonymes. Les fonctions de trigger ne sont appelées par personne.
revoke all on function public.profiles_proteger_colonnes() from public, anon, authenticated;
revoke all on function public.annonces_avant_insertion()   from public, anon, authenticated;
revoke all on function public.reponses_avant_insertion()   from public, anon, authenticated;
revoke all on function public.est_admin()                  from public, anon;
revoke all on function public.accepter_charte(smallint)    from public, anon;
revoke all on function public.signaler_annonce(uuid, text, text) from public, anon;
revoke all on function public.repondre_decision(uuid, boolean, text) from public, anon;
revoke all on function public.admin_moderer(uuid, text)    from public, anon;
revoke all on function public.purger_annonces()            from public, anon, authenticated;
grant execute on function public.est_admin()                  to authenticated;
grant execute on function public.accepter_charte(smallint)    to authenticated;
grant execute on function public.signaler_annonce(uuid, text, text) to authenticated;
grant execute on function public.repondre_decision(uuid, boolean, text) to authenticated;
grant execute on function public.admin_moderer(uuid, text)    to authenticated;
-- message_sans_contact() reste exécutable (le CHECK l'appelle avec les droits de l'appelant)
grant execute on function public.message_sans_contact(text)   to authenticated;

-- ============================================================
-- 8. OPTIONNEL : purge hebdomadaire avec pg_cron
--    Prérequis : Database > Extensions > activer « pg_cron ». Puis décommenter et lancer :
-- ============================================================
-- select cron.schedule('purger-annonces', '0 3 * * 1', $$select public.purger_annonces()$$);
-- Pour l'arrêter : select cron.unschedule('purger-annonces');
-- Sans pg_cron, tu peux lancer à la main de temps en temps : select public.purger_annonces();
