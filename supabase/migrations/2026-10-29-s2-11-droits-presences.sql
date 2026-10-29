-- S2 · 11/23 — Présences : la table n'est plus lisible en entier par tout joueur connecté (t4-01 : using (true)).
-- Chacun ne lit que ses lignes ; la liste d'un tournoi passe par presences_tournoi() (fichier s2-13), sans user_id.
-- Le nombre public (nb_presences, t4-04) ne change pas.
revoke all on public.presences from anon;
revoke all on public.presences from authenticated;
grant select, insert, delete on public.presences to authenticated;
drop policy if exists "presences_select" on public.presences;
create policy "presences_select" on public.presences for select to authenticated using (user_id = auth.uid());
