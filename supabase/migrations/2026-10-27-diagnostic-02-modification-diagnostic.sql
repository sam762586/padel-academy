-- Diagnostic · 2/2 — La table matchs n'avait pas de règle de modification : un joueur peut désormais modifier ses propres
-- matchs (RLS), et seulement la colonne diagnostic (droit par colonne). Le score et les points d'un match restent figés.
drop policy if exists "matchs_update_diagnostic" on public.matchs;
create policy "matchs_update_diagnostic" on public.matchs for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
revoke update on public.matchs from authenticated;
grant update (diagnostic) on public.matchs to authenticated;
