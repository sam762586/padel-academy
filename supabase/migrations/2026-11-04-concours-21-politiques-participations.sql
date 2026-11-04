-- Concours · annulation 4/7 (concours-21) — Règles d'ajout et de suppression des participations (remplacent celles de
-- concours-04 ; lecture, droits par colonne et absence de modification inchangés) :
--   ajout       : comme avant, et concours non annulé (verrou réel ; le message CONCOURS_ANNULE vient de concours-20) ;
--   suppression : comme avant (pendant le concours : le joueur pour lui, ou l'admin) ; en plus, sur un concours annulé et
--                 non tiré, le joueur peut toujours retirer SA participation, même après la date de fin (il garde la
--                 main sur sa donnée). L'admin n'obtient aucun droit de suppression en plus : rien n'est effacé par
--                 l'annulation, la purge habituelle (concours-16) s'en charge.
drop policy if exists "concours_participations_insert" on public.concours_participations;
drop policy if exists "concours_participations_delete" on public.concours_participations;
create policy "concours_participations_insert" on public.concours_participations for insert to authenticated with check (user_id = auth.uid() and atteste_majeur_ou_accord and accepte_reglement and not public.est_admin() and exists (select 1 from public.concours c where c.id = concours_id and c.tire_le is null and c.annule_le is null and c.date_debut <= now() and now() < c.date_fin));
create policy "concours_participations_delete" on public.concours_participations for delete to authenticated using (((user_id = auth.uid() or public.est_admin()) and exists (select 1 from public.concours c where c.id = concours_id and c.tire_le is null and c.date_debut <= now() and now() < c.date_fin)) or (user_id = auth.uid() and exists (select 1 from public.concours c where c.id = concours_id and c.tire_le is null and c.annule_le is not null)));
