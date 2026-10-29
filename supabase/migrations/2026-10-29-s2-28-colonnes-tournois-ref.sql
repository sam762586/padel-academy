-- S2 bis · 28/42 — tournois_ref : nom, ville, catégorie et département du tournoi (données publiques de tournois.json).
-- Recopiés dans les annonces par annonces_avant_insertion (s2-29) : le navigateur ne décide plus de ces textes.
-- Colonnes facultatives : tant que le générateur ne les remplit pas, les annonces gardent les textes envoyés par le
-- navigateur, passés au filtre d'insultes (avis_texte_correct) en plus du filtre de coordonnées. Relançable sans risque.
alter table public.tournois_ref add column if not exists nom text check (nom is null or char_length(nom) between 1 and 200);
alter table public.tournois_ref add column if not exists ville text check (ville is null or char_length(ville) between 1 and 100);
alter table public.tournois_ref add column if not exists categorie text check (categorie is null or char_length(categorie) between 1 and 20);
alter table public.tournois_ref add column if not exists dep text check (dep is null or dep ~ '^[0-9A-Za-z]{1,3}$');
