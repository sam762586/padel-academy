-- Favoris · 1/3 — Table « favoris » (étoiles de tournois.html). Remplace 20261026_favoris.sql (format $fn$, un objet par fichier).
-- Chaque joueur ne lit et n'écrit que ses favoris ; tout part en cascade à la suppression du compte.
create table if not exists public.favoris (
  user_id    uuid not null references auth.users(id) on delete cascade,
  tournoi_id text not null check (tournoi_id ~ '^[0-9A-Za-z_-]{1,20}$'),
  created_at timestamptz not null default now(),
  primary key (user_id, tournoi_id)
);
alter table public.favoris enable row level security;
drop policy if exists "favoris_select" on public.favoris;
drop policy if exists "favoris_insert" on public.favoris;
drop policy if exists "favoris_update" on public.favoris;
drop policy if exists "favoris_delete" on public.favoris;
create policy "favoris_select" on public.favoris for select to authenticated using (auth.uid() = user_id);
create policy "favoris_insert" on public.favoris for insert to authenticated with check (auth.uid() = user_id);
-- UPDATE nécessaire pour l'upsert (ajout d'un favori déjà présent)
create policy "favoris_update" on public.favoris for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "favoris_delete" on public.favoris for delete to authenticated using (auth.uid() = user_id);
