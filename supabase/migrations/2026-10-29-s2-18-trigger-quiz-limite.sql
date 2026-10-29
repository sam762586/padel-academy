-- S2 · 18/23 — 100 résultats du test de niveau au maximum par joueur.
drop trigger if exists quiz_results_limite on public.quiz_results;
create trigger quiz_results_limite before insert on public.quiz_results for each row execute function public.limite_lignes_joueur('100');
