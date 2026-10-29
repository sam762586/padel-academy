-- S2 bis · 35/42 — Identifiants des comptes sans activité depuis 3 ans (utilisée par purger_comptes_inactifs, s2-36,
-- et pour compter AVANT de purger : select count(*) from public.comptes_inactifs();).
-- Dernière activité = la plus récente de : dernière connexion (auth.users.last_sign_in_at, ou création du compte s'il ne
-- s'est jamais connecté), dernier rafraîchissement de session (auth.sessions.refreshed_at et updated_at) et dernière
-- modification du profil (profiles.updated_at), et dernier ajout dans Mon académie (academie_niveaux.created_at,
-- academie_quiz.created_at : tables en production depuis le 29/10/2026, lignes jamais modifiées). Une session restée
-- ouverte des mois sans nouvelle connexion compte donc, comme un joueur qui ne fait que l'académie.
-- Code défensif : chaque table ou colonne n'est utilisée que si elle existe (le schéma auth de Supabase évolue).
-- NON EXPOSÉE : ni les visiteurs ni les joueurs ne peuvent l'appeler ; seulement le SQL Editor et les fonctions de purge.
create or replace function public.comptes_inactifs()
returns setof uuid
language plpgsql
stable
security definer
set search_path = public
as $fn$
declare
  derniere text := 'coalesce(u.last_sign_in_at, u.created_at)';
begin
  if exists (select 1 from pg_attribute where attrelid = to_regclass('auth.sessions') and attname = 'refreshed_at' and not attisdropped) then
    derniere := 'greatest(' || derniere || ', (select max(s.refreshed_at)::timestamptz from auth.sessions s where s.user_id = u.id))';
  end if;
  if exists (select 1 from pg_attribute where attrelid = to_regclass('auth.sessions') and attname = 'updated_at' and not attisdropped) then
    derniere := 'greatest(' || derniere || ', (select max(s.updated_at)::timestamptz from auth.sessions s where s.user_id = u.id))';
  end if;
  if exists (select 1 from pg_attribute where attrelid = to_regclass('public.profiles') and attname = 'updated_at' and not attisdropped) then
    derniere := 'greatest(' || derniere || ', (select p.updated_at::timestamptz from public.profiles p where p.id = u.id))';
  end if;
  if to_regclass('public.academie_niveaux') is not null then
    derniere := 'greatest(' || derniere || ', (select max(a.created_at) from public.academie_niveaux a where a.user_id = u.id))';
  end if;
  if to_regclass('public.academie_quiz') is not null then
    derniere := 'greatest(' || derniere || ', (select max(a.created_at) from public.academie_quiz a where a.user_id = u.id))';
  end if;
  return query execute 'select u.id from auth.users u where ' || derniere || ' < now() - interval ''3 years''';
end;
$fn$;
revoke all on function public.comptes_inactifs() from public, anon, authenticated;
