-- T4 · 1/12 — Table « presences » : « J'y vais » sur la fiche d'un tournoi.
-- ATTENTION (S2) : remplacé en partie par les migrations 2026-10-29-s2. Si tu relances ce fichier après elles, relance ensuite s2-11 à s2-14 puis s2-31 et s2-32 (sinon la faille corrigée par S2 revient).
-- À exécuter après schema.sql et schema-partenaires.sql. Relançable sans risque.
-- Pseudo et classement sont copiés au moment du clic (la table profiles n'est lisible que par son propriétaire).
create table if not exists public.presences (
  user_id      uuid not null references auth.users(id) on delete cascade,
  tournoi_id   text not null check (tournoi_id ~ '^[0-9A-Za-z_-]{1,20}$'),
  pseudo       text not null check (char_length(pseudo) between 1 and 30),
  classement_p text check (classement_p in ('P25','P50','P100','P250','P500','P1000','P2000','P3000')),
  created_at   timestamptz not null default now(),
  primary key (user_id, tournoi_id)
);
create index if not exists presences_tournoi_idx on public.presences (tournoi_id);
alter table public.presences enable row level security;
drop policy if exists "presences_select" on public.presences;
drop policy if exists "presences_insert" on public.presences;
drop policy if exists "presences_delete" on public.presences;
-- Lecture : tous les joueurs connectés ; écriture et suppression : seulement soi
create policy "presences_select" on public.presences for select to authenticated using (true);
create policy "presences_insert" on public.presences for insert to authenticated with check (user_id = auth.uid());
create policy "presences_delete" on public.presences for delete to authenticated using (user_id = auth.uid());
