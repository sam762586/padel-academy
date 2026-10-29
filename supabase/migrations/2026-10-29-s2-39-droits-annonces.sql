-- S2 bis · 39/42 — Annonces : plus personne ne lit user_id (identifiant du compte, qui permettait de relier les annonces,
-- réponses, présences et avis d'un même joueur). Lecture par colonnes ; « mes annonces » par mes_annonces() (s2-41).
-- Les règles RLS ne changent pas (annonces à venir non masquées, les siennes, tout pour l'admin). L'écriture ne change pas.
-- Le retrait des droits de table retire aussi les droits par colonne : relancer ce fichier remet exactement la liste ci-dessous.
-- ATTENTION : casse partenaires.js tant qu'il fait select("*") ou filtre sur user_id (voir supabase/LISEZMOI.md).
revoke all on public.annonces from anon;
revoke all on public.annonces from authenticated;
grant select (id, tournoi_id, tournoi_nom, tournoi_date_debut, tournoi_date_fin, tournoi_ville, tournoi_dep, tournoi_categorie, pseudo, niveau_declare, classement_p, cote, sexe, message, statut, masquee, nb_signalements, created_at) on public.annonces to authenticated;
grant insert, delete on public.annonces to authenticated;
