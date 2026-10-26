-- Quiz · 3/5 — Test de niveau v2 : palier estimé (0 Découverte, 1 P25, 2 P100, 3 P250, 4 P500, 5 P1000 et +).
-- Vide pour les anciens résultats (test sur 30 points).
alter table public.quiz_results add column if not exists palier smallint check (palier between 0 and 5);
