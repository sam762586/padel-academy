-- Concours · 1/17 — Jeux concours gratuits de concours.html (tirage au sort, lots offerts par Samuel).
-- Le fichier de données du site décrit chaque concours (titre, lot, textes) ; cette table n'en garde que ce dont la base a
-- besoin pour refuser une participation hors période et faire le tirage. Remplie par l'admin seulement (SQL Editor ou
-- compte admin). Dates en timestamptz : écrire l'heure de Paris explicitement, par exemple
--   '2026-11-01 00:00 Europe/Paris' et '2026-11-30 23:59:59 Europe/Paris'.
-- Lecture publique (anonymes compris) : aucune colonne n'est personnelle.
--   graine          : résultat du premier tirage EuroMillions APRÈS la fin du concours, au format exact
--                     « AAAA-MM-JJ:n1-n2-n3-n4-n5:e1-e2 » (date du tirage EuroMillions, 5 numéros de 1 à 50 puis 2 étoiles
--                     de 1 à 12, dans l'ordre de sortie), voir concours-11 ;
--   graine, tire_le, nb_participants, nb_exclusions : écrits par admin_tirer_au_sort (concours-11) seulement.
-- Modifications et suppression depuis le site encadrées par concours-02/03 (CONCOURS_FIGE).
-- PRÉPARÉ, NON APPLIQUÉ (01/11/2026) : à exécuter par Samuel, voir supabase/LISEZMOI.md « Jeu concours ».
create table if not exists public.concours (
  id              text primary key check (id ~ '^[0-9]{4}-[0-9]{2}-[a-z0-9-]{1,40}$'),
  titre           text not null check (char_length(titre) between 1 and 120),
  date_debut      timestamptz not null,
  date_fin        timestamptz not null,
  nb_gagnants     integer not null default 1 check (nb_gagnants between 1 and 20),
  graine          text check (graine is null or graine ~ '^\d{4}-\d{2}-\d{2}:([1-9]|[1-4]\d|50)(-([1-9]|[1-4]\d|50)){4}:([1-9]|1[0-2])-([1-9]|1[0-2])$'),
  nb_participants integer check (nb_participants is null or nb_participants >= 0),
  nb_exclusions   integer check (nb_exclusions is null or nb_exclusions >= 0),
  tire_le         timestamptz,
  created_at      timestamptz not null default now(),
  constraint concours_dates check (date_fin > date_debut)
);
alter table public.concours enable row level security;
drop policy if exists "concours_select" on public.concours;
drop policy if exists "concours_insert" on public.concours;
drop policy if exists "concours_update" on public.concours;
drop policy if exists "concours_delete" on public.concours;
create policy "concours_select" on public.concours for select to anon, authenticated using (true);
create policy "concours_insert" on public.concours for insert to authenticated with check (public.est_admin());
create policy "concours_update" on public.concours for update to authenticated using (public.est_admin()) with check (public.est_admin());
create policy "concours_delete" on public.concours for delete to authenticated using (public.est_admin());
-- Droits par colonne : le retrait des droits de table retire aussi ceux par colonne ; relancer ce fichier remet cette liste.
revoke all on public.concours from anon;
revoke all on public.concours from authenticated;
grant select on public.concours to anon, authenticated;
grant insert (id, titre, date_debut, date_fin, nb_gagnants) on public.concours to authenticated;
grant update (titre, date_debut, date_fin, nb_gagnants) on public.concours to authenticated;
grant delete on public.concours to authenticated;
