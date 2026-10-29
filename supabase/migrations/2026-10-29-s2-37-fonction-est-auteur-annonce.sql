-- S2 bis · 37/42 — Vrai si l'appelant est l'auteur de l'annonce. Utilisée par la règle de lecture des réponses (s2-38) :
-- une fois user_id des annonces retiré de la lecture (s2-39), une règle RLS ne peut plus lire annonces.user_id avec les
-- droits du joueur (« permission denied for table annonces »). Ne renvoie qu'un booléen, et seulement pour l'appelant.
create or replace function public.est_auteur_annonce(p_annonce uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $fn$
  select exists (select 1 from public.annonces where id = p_annonce and user_id = auth.uid());
$fn$;
revoke all on function public.est_auteur_annonce(uuid) from public, anon;
grant execute on function public.est_auteur_annonce(uuid) to authenticated;
