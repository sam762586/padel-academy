-- Coach IA · 2/4 — Chaque joueur peut lire son propre compteur ; personne ne l'écrit depuis le site
-- (seule la fonction « coach », avec la clé de service, le modifie via coach_consommer / coach_rembourser).
alter table public.coach_usage enable row level security;
drop policy if exists "coach_usage_lecture" on public.coach_usage;
create policy "coach_usage_lecture" on public.coach_usage for select using (auth.uid() = user_id);
