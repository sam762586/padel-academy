-- S2 bis · 42/42 — MES réponses (« Je suis intéressé·e » envoyées), les plus récentes d'abord, sans user_id.
-- Remplace from("reponses").eq("user_id", moi) côté navigateur.
create or replace function public.mes_reponses()
returns table (id uuid, annonce_id uuid, pseudo text, message text, statut text, message_retour text, created_at timestamptz)
language sql
stable
security definer
set search_path = public
as $fn$
  select r.id, r.annonce_id, r.pseudo, r.message, r.statut, r.message_retour, r.created_at from public.reponses r where auth.uid() is not null and r.user_id = auth.uid() order by r.created_at desc;
$fn$;
revoke all on function public.mes_reponses() from public, anon;
grant execute on function public.mes_reponses() to authenticated;
