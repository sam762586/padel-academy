-- S2 · 1/23 — Table « tournois_ref » : référence des tournois (identifiant Ten'Up, club, dates), remplie par le robot.
-- Les avis et les « J'y vais » ne font plus confiance au navigateur : club et dates sont recopiés depuis cette table.
-- Lecture par tous (ce sont les données publiques de tournois.json) ; écriture réservée au service (robot, clé service_role
-- utilisée hors du site), au SQL Editor ou à un admin. Aucune donnée personnelle. Relançable sans risque.
-- Identifiant : chiffres Ten'Up (1 à 12) ou « FED_ » + chiffres (championnats fédéraux présents dans tournois.json).
create table if not exists public.tournois_ref (
  id         text primary key check (id ~ '^(FED_)?[0-9]{1,12}$'),
  club       text not null check (char_length(club) between 1 and 120),
  date_debut date not null,
  date_fin   date not null,
  maj        timestamptz not null default now(),
  constraint tournois_ref_dates check (date_fin >= date_debut)
);
create index if not exists tournois_ref_fin_idx on public.tournois_ref (date_fin);
alter table public.tournois_ref enable row level security;
revoke all on public.tournois_ref from anon;
revoke all on public.tournois_ref from authenticated;
grant select on public.tournois_ref to anon, authenticated;
grant insert, update, delete on public.tournois_ref to authenticated;
drop policy if exists "tournois_ref_select" on public.tournois_ref;
drop policy if exists "tournois_ref_insert" on public.tournois_ref;
drop policy if exists "tournois_ref_update" on public.tournois_ref;
drop policy if exists "tournois_ref_delete" on public.tournois_ref;
create policy "tournois_ref_select" on public.tournois_ref for select to anon, authenticated using (true);
create policy "tournois_ref_insert" on public.tournois_ref for insert to authenticated with check (public.est_admin());
create policy "tournois_ref_update" on public.tournois_ref for update to authenticated using (public.est_admin()) with check (public.est_admin());
create policy "tournois_ref_delete" on public.tournois_ref for delete to authenticated using (public.est_admin());
