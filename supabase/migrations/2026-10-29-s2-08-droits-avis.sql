-- S2 · 8/23 — Avis : plus personne ne lit user_id (identifiant du compte, qui permettait de relier les avis, présences et
-- annonces d'un même joueur). Lecture par colonnes ; « mon avis » passe par mon_avis() (fichier s2-09).
-- Les règles RLS (t4-07) ne changent pas : avis visibles après la fin du tournoi, les siens toujours, tout pour l'admin.
-- Le retrait des droits de table retire aussi les droits par colonne : relancer ce fichier remet exactement la liste ci-dessous.
revoke all on public.avis from anon;
revoke all on public.avis from authenticated;
grant select (id, tournoi_id, tournoi_date_debut, tournoi_date_fin, club, pseudo, organisation, niveau_reel, recommande, texte, created_at) on public.avis to anon;
grant select (id, tournoi_id, tournoi_date_debut, tournoi_date_fin, club, pseudo, organisation, niveau_reel, recommande, texte, masque, nb_signalements, created_at) on public.avis to authenticated;
grant insert, delete on public.avis to authenticated;
