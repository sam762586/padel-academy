-- Concours · 5/17 — Exclusions pour fraude (comptes multiples, etc.), écrites par admin_exclure_participation
-- (concours-13) seulement. Lisibles par le joueur concerné (sa ligne, avec le motif) et par l'admin ; aucun ajout,
-- modification ni suppression depuis le site. Le nombre d'exclusions est public (concours_resume, concours-09), figé au
-- tirage. Un joueur exclu ne peut pas se réinscrire au même concours (PARTICIPATION_EXCLUE, concours-06).
-- Compte supprimé : ses lignes partent en cascade. Purgées avec les participations (concours-16).
create table if not exists public.concours_exclusions (
  concours_id text not null references public.concours(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  motif       text not null check (char_length(btrim(motif)) between 3 and 200),
  exclu_le    timestamptz not null default now(),
  primary key (concours_id, user_id)
);
create index if not exists concours_exclusions_user_idx on public.concours_exclusions (user_id);
alter table public.concours_exclusions enable row level security;
drop policy if exists "concours_exclusions_select" on public.concours_exclusions;
create policy "concours_exclusions_select" on public.concours_exclusions for select to authenticated using (user_id = auth.uid() or public.est_admin());
-- Pas de politique d'ajout, de modification ni de suppression : seule admin_exclure_participation écrit ici.
revoke all on public.concours_exclusions from anon;
revoke all on public.concours_exclusions from authenticated;
grant select (concours_id, user_id, motif, exclu_le) on public.concours_exclusions to authenticated;
