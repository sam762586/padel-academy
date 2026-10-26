-- Padel Academy : schéma Supabase (phase 1 : comptes joueurs)
-- À exécuter à la main dans Supabase > SQL Editor. Peut être relancé sans risque (idempotent).

-- ============================================================
-- 1. Table profiles : un profil par compte
-- ============================================================
create table if not exists public.profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  pseudo         text check (pseudo is null or char_length(pseudo) <= 30),
  niveau_declare smallint check (niveau_declare between 1 and 4),
  classement_p   text check (classement_p in ('P25','P50','P100','P250','P500','P1000','P1500','P2000')),
  cote           text check (cote in ('droite','gauche')),
  main           text check (main in ('droite','gauche')),
  club           text check (club is null or char_length(club) <= 80),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- Création automatique de la ligne profiles à l'inscription
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- 2. Table quiz_results : historique des résultats du quiz de niveau
-- ============================================================
create table if not exists public.quiz_results (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  score      int  not null check (score >= 0),
  niveau     smallint not null check (niveau between 1 and 4),
  reponses   jsonb,
  created_at timestamptz not null default now()
);
create index if not exists quiz_results_user_idx on public.quiz_results (user_id, created_at desc);

-- ============================================================
-- 3. Table plan_progress : semaines validées du plan de 8 semaines
--    (semaine = indice 0 à 7, comme dans plan.js)
-- ============================================================
create table if not exists public.plan_progress (
  user_id  uuid not null references auth.users(id) on delete cascade,
  semaine  smallint not null check (semaine between 0 and 7),
  done_at  timestamptz not null default now(),
  primary key (user_id, semaine)
);

-- ============================================================
-- 4. Row Level Security : chacun ne voit et ne modifie que ses lignes
-- ============================================================
alter table public.profiles      enable row level security;
alter table public.quiz_results  enable row level security;
alter table public.plan_progress enable row level security;

-- profiles (clé = id)
drop policy if exists "profiles_select" on public.profiles;
drop policy if exists "profiles_insert" on public.profiles;
drop policy if exists "profiles_update" on public.profiles;
drop policy if exists "profiles_delete" on public.profiles;
create policy "profiles_select" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "profiles_insert" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "profiles_update" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles_delete" on public.profiles for delete to authenticated using (auth.uid() = id);

-- quiz_results (clé = user_id)
drop policy if exists "quiz_select" on public.quiz_results;
drop policy if exists "quiz_insert" on public.quiz_results;
drop policy if exists "quiz_update" on public.quiz_results;
drop policy if exists "quiz_delete" on public.quiz_results;
create policy "quiz_select" on public.quiz_results for select to authenticated using (auth.uid() = user_id);
create policy "quiz_insert" on public.quiz_results for insert to authenticated with check (auth.uid() = user_id);
create policy "quiz_update" on public.quiz_results for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "quiz_delete" on public.quiz_results for delete to authenticated using (auth.uid() = user_id);

-- plan_progress (clé = user_id)
drop policy if exists "plan_select" on public.plan_progress;
drop policy if exists "plan_insert" on public.plan_progress;
drop policy if exists "plan_update" on public.plan_progress;
drop policy if exists "plan_delete" on public.plan_progress;
create policy "plan_select" on public.plan_progress for select to authenticated using (auth.uid() = user_id);
create policy "plan_insert" on public.plan_progress for insert to authenticated with check (auth.uid() = user_id);
create policy "plan_update" on public.plan_progress for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "plan_delete" on public.plan_progress for delete to authenticated using (auth.uid() = user_id);

-- ============================================================
-- 5. Suppression du compte par l'utilisateur lui-même
-- ============================================================
-- SECURITY DEFINER : la fonction s'exécute avec les droits de son propriétaire, car un utilisateur
-- ne peut pas supprimer sa ligne auth.users directement. Elle ne supprime QUE l'appelant (auth.uid()).
-- La cascade (on delete cascade) efface profiles, quiz_results et plan_progress.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null then
    raise exception 'Non connecté';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_my_account() from public;
revoke all on function public.delete_my_account() from anon;
grant execute on function public.delete_my_account() to authenticated;
