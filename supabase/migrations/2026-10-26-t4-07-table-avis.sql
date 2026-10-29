-- T4 · 7/12 — Table « avis » : 3 questions + texte court, un avis par joueur et par tournoi.
-- ATTENTION (S2) : remplacé en partie par les migrations 2026-10-29-s2. Si tu relances ce fichier après elles, relance ensuite s2-07 à s2-10 (sinon la faille corrigée par S2 revient).
-- tournoi_* et club = instantané des données du tournoi (tournois.json est statique).
-- Lecture publique (même sans compte) des avis non masqués, une fois le tournoi terminé.
create table if not exists public.avis (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  tournoi_id         text not null check (tournoi_id ~ '^[0-9A-Za-z_-]{1,20}$'),
  tournoi_date_debut date not null,
  tournoi_date_fin   date not null,
  club               text not null check (char_length(club) between 1 and 120),
  pseudo             text not null check (char_length(pseudo) between 1 and 30),
  organisation       smallint not null check (organisation between 1 and 5),
  niveau_reel        smallint not null check (niveau_reel between 1 and 5),
  recommande         boolean not null,
  texte              text not null default '' check (char_length(texte) <= 300),
  masque             boolean not null default false,
  nb_signalements    integer not null default 0,
  created_at         timestamptz not null default now(),
  constraint avis_texte_correct check (public.avis_texte_correct(texte)),
  constraint avis_dates check (tournoi_date_fin >= tournoi_date_debut),
  unique (user_id, tournoi_id)
);
create index if not exists avis_tournoi_idx on public.avis (tournoi_id);
create index if not exists avis_club_idx on public.avis (club);
alter table public.avis enable row level security;
drop policy if exists "avis_select_public" on public.avis;
drop policy if exists "avis_select_connecte" on public.avis;
drop policy if exists "avis_insert" on public.avis;
drop policy if exists "avis_delete" on public.avis;
create policy "avis_select_public" on public.avis for select to anon using (masque = false and tournoi_date_fin < current_date);
create policy "avis_select_connecte" on public.avis for select to authenticated using (user_id = auth.uid() or public.est_admin() or (masque = false and tournoi_date_fin < current_date));
create policy "avis_insert" on public.avis for insert to authenticated with check (user_id = auth.uid());
create policy "avis_delete" on public.avis for delete to authenticated using (user_id = auth.uid() or public.est_admin());
grant select on public.avis to anon;
