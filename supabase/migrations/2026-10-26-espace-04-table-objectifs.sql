-- Espace · 4/6 — Objectifs du joueur. Types :
--   points    : atteindre <cible> points au classement estimé (12 meilleurs résultats sur 12 mois)
--   rang      : entrer dans le top <cible> du classement FFT
--   victoires : gagner <cible> matchs comptés avec le compteur, depuis la création de l'objectif
--   tournois  : jouer <cible> tournois (résultats saisis), depuis la création de l'objectif
-- La progression est calculée dans le navigateur à partir des autres données du joueur.
create table if not exists public.objectifs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  cle        text not null check (cle ~ '^[0-9A-Za-z-]{8,40}$'),
  type       text not null check (type in ('points','rang','victoires','tournois')),
  cible      integer not null check (cible between 1 and 500000),
  echeance   date,
  depuis     date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, cle)
);
alter table public.objectifs enable row level security;
drop policy if exists "objectifs_select" on public.objectifs;
drop policy if exists "objectifs_insert" on public.objectifs;
drop policy if exists "objectifs_update" on public.objectifs;
drop policy if exists "objectifs_delete" on public.objectifs;
create policy "objectifs_select" on public.objectifs for select to authenticated using (auth.uid() = user_id);
create policy "objectifs_insert" on public.objectifs for insert to authenticated with check (auth.uid() = user_id);
create policy "objectifs_update" on public.objectifs for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "objectifs_delete" on public.objectifs for delete to authenticated using (auth.uid() = user_id);
