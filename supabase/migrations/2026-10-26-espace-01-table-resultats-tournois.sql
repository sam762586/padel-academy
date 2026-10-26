-- Espace · 1/6 — Résultats de tournois saisis par le joueur (simulateur du barème, espace joueur).
-- « cle » = identifiant créé par le navigateur : il permet de synchroniser la liste du téléphone et celle du compte.
-- À exécuter après schema.sql et 2026-10-26-classements-01. Relançable sans risque.
create table if not exists public.resultats_tournois (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  cle          text not null check (cle ~ '^[0-9A-Za-z-]{8,40}$'),
  categorie    text not null check (categorie in ('P25','P50','P100','P250','P500','P1000','P2000','P3000')),
  place        smallint not null check (place between 1 and 32),
  nb_paires    smallint not null check (nb_paires between 4 and 40),
  sexe         text not null check (sexe in ('messieurs','dames')),
  date_tournoi date check (date_tournoi is null or date_tournoi >= date '1900-01-01'),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (user_id, cle)
);
alter table public.resultats_tournois enable row level security;
drop policy if exists "resultats_select" on public.resultats_tournois;
drop policy if exists "resultats_insert" on public.resultats_tournois;
drop policy if exists "resultats_update" on public.resultats_tournois;
drop policy if exists "resultats_delete" on public.resultats_tournois;
create policy "resultats_select" on public.resultats_tournois for select to authenticated using (auth.uid() = user_id);
create policy "resultats_insert" on public.resultats_tournois for insert to authenticated with check (auth.uid() = user_id);
create policy "resultats_update" on public.resultats_tournois for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "resultats_delete" on public.resultats_tournois for delete to authenticated using (auth.uid() = user_id);
