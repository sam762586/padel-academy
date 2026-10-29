-- S2 bis · 41/42 — MES annonces (toutes : actives, complètes, masquées, passées), les plus récentes d'abord, avec les mêmes
-- colonnes que la lecture directe (s2-39), sans user_id. Remplace from("annonces").eq("user_id", moi) côté navigateur et
-- sert aussi à reconnaître « Ton annonce » dans une liste (comparer les id).
create or replace function public.mes_annonces()
returns table (id uuid, tournoi_id text, tournoi_nom text, tournoi_date_debut date, tournoi_date_fin date, tournoi_ville text, tournoi_dep text, tournoi_categorie text, pseudo text, niveau_declare smallint, classement_p text, cote text, sexe text, message text, statut text, masquee boolean, nb_signalements integer, created_at timestamptz)
language sql
stable
security definer
set search_path = public
as $fn$
  select a.id, a.tournoi_id, a.tournoi_nom, a.tournoi_date_debut, a.tournoi_date_fin, a.tournoi_ville, a.tournoi_dep, a.tournoi_categorie, a.pseudo, a.niveau_declare, a.classement_p, a.cote, a.sexe, a.message, a.statut, a.masquee, a.nb_signalements, a.created_at from public.annonces a where auth.uid() is not null and a.user_id = auth.uid() order by a.created_at desc;
$fn$;
revoke all on function public.mes_annonces() from public, anon;
grant execute on function public.mes_annonces() to authenticated;
