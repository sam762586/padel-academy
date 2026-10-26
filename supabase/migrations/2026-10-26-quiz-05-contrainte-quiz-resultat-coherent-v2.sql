-- Quiz · 5/5 — La contrainte utilise désormais le contrôle v2 (qui reprend l'ancien pour les résultats sans palier).
-- NOT VALID : les lignes existantes ne sont pas relues. Ensuite, ajoute "quiz2" à PA_SUPABASE.activees.
alter table public.quiz_results drop constraint if exists quiz_resultat_coherent;
alter table public.quiz_results add constraint quiz_resultat_coherent check (public.quiz_resultat_valide_v2(score, niveau, palier, reponses)) not valid;
