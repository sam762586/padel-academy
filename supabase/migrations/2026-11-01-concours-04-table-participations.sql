-- Concours · 4/17 — Participations : réservées aux joueurs connectés, une seule par compte et par concours.
-- Le joueur coche deux cases sur concours.html : « j'ai 18 ans ou l'accord de mes parents » et « j'accepte le règlement » ;
-- les deux doivent être vraies (règle d'insertion, contrainte, et message clair du déclencheur concours-06/07).
-- RLS :
--   ajout        : pour soi seulement, concours ouvert (début <= maintenant < fin, pas encore tiré), deux cases cochées,
--                  et pas l'organisateur (un compte admin ne participe pas) ;
--   lecture      : sa propre ligne, ou l'admin (personne ne voit qui d'autre participe ; le nombre passe par concours-08/09) ;
--   modification : aucune ;
--   suppression  : pendant le concours seulement : sa propre ligne (retrait), ou l'admin. Pour écarter un fraudeur (même
--                  après la fin, avant le tirage), l'admin passe par admin_exclure_participation (concours-13), qui garde
--                  une trace dans concours_exclusions.
-- cree_le est posé par la base. Aucun e-mail ni pseudo copié ici : seulement l'identifiant du compte.
-- Compte supprimé (delete_my_account de schema.sql, ou purge des comptes inactifs) : ses participations partent en cascade.
-- Durée de conservation : 60 jours après le tirage, 90 jours après la fin si le concours n'est jamais tiré (concours-16).
-- Pas de garde-fou de 300 lignes : une ligne par concours, et seuls les concours créés par l'admin sont acceptés.
create table if not exists public.concours_participations (
  concours_id              text not null references public.concours(id) on delete cascade,
  user_id                  uuid not null default auth.uid() references auth.users(id) on delete cascade,
  cree_le                  timestamptz not null default now(),
  atteste_majeur_ou_accord boolean not null,
  accepte_reglement        boolean not null,
  constraint concours_participations_cases check (atteste_majeur_ou_accord and accepte_reglement),
  unique (concours_id, user_id)
);
create index if not exists concours_participations_user_idx on public.concours_participations (user_id);
alter table public.concours_participations enable row level security;
drop policy if exists "concours_participations_select" on public.concours_participations;
drop policy if exists "concours_participations_insert" on public.concours_participations;
drop policy if exists "concours_participations_delete" on public.concours_participations;
create policy "concours_participations_select" on public.concours_participations for select to authenticated using (user_id = auth.uid() or public.est_admin());
create policy "concours_participations_insert" on public.concours_participations for insert to authenticated with check (user_id = auth.uid() and atteste_majeur_ou_accord and accepte_reglement and not public.est_admin() and exists (select 1 from public.concours c where c.id = concours_id and c.tire_le is null and c.date_debut <= now() and now() < c.date_fin));
create policy "concours_participations_delete" on public.concours_participations for delete to authenticated using ((user_id = auth.uid() or public.est_admin()) and exists (select 1 from public.concours c where c.id = concours_id and c.tire_le is null and c.date_debut <= now() and now() < c.date_fin));
-- Pas de politique de modification : une participation ne se modifie pas (on se retire, puis on se réinscrit).
revoke all on public.concours_participations from anon;
revoke all on public.concours_participations from authenticated;
grant select (concours_id, user_id, cree_le, atteste_majeur_ou_accord, accepte_reglement) on public.concours_participations to authenticated;
grant insert (concours_id, user_id, atteste_majeur_ou_accord, accepte_reglement) on public.concours_participations to authenticated;
grant delete on public.concours_participations to authenticated;
