-- Diagnostic · 1/2 — Bilan après match (assets/js/diagnostic.js), rangé dans la ligne du match : pas de second journal.
-- Contenu : { ressenti 1-5, techniques [...], tactiques [...], positif, prochain, maj }. Objet JSON de taille limitée.
-- Les règles RLS de la table matchs s'appliquent : chaque joueur ne lit et ne modifie que ses matchs.
-- À exécuter après les migrations journal-01 à 03, puis ajouter "diagnostic" à PA_SUPABASE.activees (avec "journal").
alter table public.matchs add column if not exists diagnostic jsonb check (diagnostic is null or (jsonb_typeof(diagnostic) = 'object' and pg_column_size(diagnostic) < 4000));
