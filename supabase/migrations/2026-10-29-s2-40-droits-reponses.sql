-- S2 bis · 40/42 — Réponses : user_id n'est plus lisible (l'auteur d'une annonce voyait l'identifiant du compte de chaque
-- joueur qui lui répondait). Lecture par colonnes ; « mes réponses » par mes_reponses() (s2-42). Règles RLS : s2-38.
-- Le retrait des droits de table retire aussi les droits par colonne : relancer ce fichier remet exactement la liste ci-dessous.
-- ATTENTION : casse partenaires.js tant qu'il fait select("*") ou filtre sur user_id (voir supabase/LISEZMOI.md).
revoke all on public.reponses from anon;
revoke all on public.reponses from authenticated;
grant select (id, annonce_id, pseudo, message, statut, message_retour, created_at) on public.reponses to authenticated;
grant insert, delete on public.reponses to authenticated;
