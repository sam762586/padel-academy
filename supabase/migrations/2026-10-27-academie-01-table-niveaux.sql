-- Académie · 1/3 — Historique des niveaux déclarés dans Mon académie (assets/js/academie.js, clé pa-academie).
-- Niveau de 1 à 10 de la grille « Niveaux Padel » de la FFT, DÉCLARÉ par le joueur : ce n'est ni le palier du test de
-- niveau (quiz_results), ni profiles.niveau_declare (1 à 4) ; aucune conversion. Une ligne par choix, jamais modifiée :
-- le niveau actuel est la ligne la plus récente. Chaque joueur ne voit, n'ajoute et ne supprime que ses lignes (RLS).
-- APPLIQUÉ EN PRODUCTION LE 29/10/2026 (accord de Samuel), après espace-02 (fonction espace_limite_lignes).
-- (fonction espace_limite_lignes). Synchronisation côté site : assets/js/academie-sync.js (PA_SUPABASE.activees : "academie").
create table if not exists public.academie_niveaux (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  niveau     smallint not null check (niveau between 1 and 10),
  choisi_le  timestamptz not null,
  created_at timestamptz not null default now(),
  unique (user_id, choisi_le)
);
alter table public.academie_niveaux enable row level security;
drop policy if exists "academie_niveaux_select" on public.academie_niveaux;
drop policy if exists "academie_niveaux_insert" on public.academie_niveaux;
drop policy if exists "academie_niveaux_delete" on public.academie_niveaux;
create policy "academie_niveaux_select" on public.academie_niveaux for select to authenticated using (auth.uid() = user_id);
create policy "academie_niveaux_insert" on public.academie_niveaux for insert to authenticated with check (auth.uid() = user_id);
create policy "academie_niveaux_delete" on public.academie_niveaux for delete to authenticated using (auth.uid() = user_id);
-- Pas de politique de modification : l'historique n'est jamais réécrit.
