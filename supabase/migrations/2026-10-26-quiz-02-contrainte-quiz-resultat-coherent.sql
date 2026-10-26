-- Quiz · 2/2 — Contrainte sur quiz_results. NOT VALID : les anciens résultats sont conservés, les nouvelles écritures contrôlées.
alter table public.quiz_results drop constraint if exists quiz_resultat_coherent;
alter table public.quiz_results add constraint quiz_resultat_coherent check (public.quiz_resultat_valide(score, niveau, reponses)) not valid;
-- Plus tard, après revue des anciennes lignes : alter table public.quiz_results validate constraint quiz_resultat_coherent;
