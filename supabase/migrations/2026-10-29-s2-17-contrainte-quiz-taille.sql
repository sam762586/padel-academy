-- S2 · 17/23 — Résultats du test de niveau : réponses de moins de 3 000 octets (10 réponses ≈ 500 octets).
-- NOT VALID : la table quiz_results contient déjà des résultats ; ils ne sont ni relus ni modifiés.
alter table public.quiz_results drop constraint if exists quiz_results_reponses_taille;
alter table public.quiz_results add constraint quiz_results_reponses_taille check (reponses is null or pg_column_size(reponses) < 3000) not valid;
