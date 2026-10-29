-- S2 bis · 38/42 — Lecture des réponses (remplace la règle de schema-partenaires.sql, même nom, même effet) :
-- l'auteur de la réponse et l'auteur de l'annonce, personne d'autre (admin compris). À exécuter AVANT s2-39.
drop policy if exists "reponses_select" on public.reponses;
create policy "reponses_select" on public.reponses for select to authenticated using (user_id = auth.uid() or public.est_auteur_annonce(annonce_id));
