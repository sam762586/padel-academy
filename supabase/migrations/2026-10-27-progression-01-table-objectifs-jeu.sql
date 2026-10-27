-- Progression · 1/2 — Objectifs de jeu choisis par le joueur dans son espace (assets/js/progression.js).
-- Ils orientent le programme d'exercices. Chaque joueur ne voit et ne modifie que ses lignes (RLS).
-- À exécuter après les migrations espace-01 à 06 (fonction espace_limite_lignes), puis ajouter "progression"
-- à PA_SUPABASE.activees (avec "espace").
create table if not exists public.objectifs_jeu (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  cle        text not null check (cle ~ '^[0-9A-Za-z-]{8,40}$'),
  objectif   text not null check (objectif in ('defense','vitre','volees','bandeja','placement','fautes','tournoi')),
  depuis     date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, cle)
);
alter table public.objectifs_jeu enable row level security;
drop policy if exists "objectifs_jeu_select" on public.objectifs_jeu;
drop policy if exists "objectifs_jeu_insert" on public.objectifs_jeu;
drop policy if exists "objectifs_jeu_update" on public.objectifs_jeu;
drop policy if exists "objectifs_jeu_delete" on public.objectifs_jeu;
create policy "objectifs_jeu_select" on public.objectifs_jeu for select to authenticated using (auth.uid() = user_id);
create policy "objectifs_jeu_insert" on public.objectifs_jeu for insert to authenticated with check (auth.uid() = user_id);
create policy "objectifs_jeu_update" on public.objectifs_jeu for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "objectifs_jeu_delete" on public.objectifs_jeu for delete to authenticated using (auth.uid() = user_id);
