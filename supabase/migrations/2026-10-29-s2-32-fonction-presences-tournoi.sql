-- S2 bis · 32/42 — Liste « J'y vais » d'un tournoi (remplace la version s2-13, même nom, même colonnes renvoyées).
-- Les autres joueurs ne sont listés que pour un tournoi qui n'est pas terminé ET qui commence dans les 60 prochains jours
-- (dates de tournois_ref) : on ne peut plus reconstituer l'agenda d'un pseudo en interrogeant tous les tournois de l'année.
-- En dehors de cette fenêtre, seule la ligne de l'appelant est renvoyée (est_moi = vrai), pour que le bouton reste juste ;
-- le nombre d'inscrits reste public par nb_presences (t4-04). Jamais de user_id. 100 lignes au plus, ordre d'inscription.
create or replace function public.presences_tournoi(p_tournoi text)
returns table (pseudo text, classement_p text, est_moi boolean)
language sql
stable
security definer
set search_path = public
as $fn$
  select p.pseudo, p.classement_p, p.user_id = auth.uid() from public.presences p where auth.uid() is not null and p.tournoi_id = p_tournoi and (p.user_id = auth.uid() or exists (select 1 from public.tournois_ref r where r.id = p_tournoi and r.date_fin >= current_date and r.date_debut <= current_date + 60)) order by p.created_at limit 100;
$fn$;
revoke all on function public.presences_tournoi(text) from public, anon;
grant execute on function public.presences_tournoi(text) to authenticated;
