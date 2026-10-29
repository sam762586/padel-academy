-- S2 · 19/23 — 10 signalements au maximum par joueur sur 24 heures glissantes, annonces et avis confondus.
-- Les signalements ne s'écrivent que par signaler_annonce() et signaler_avis() (SECURITY DEFINER) : ce déclencheur
-- s'exécute dans leur contexte et voit donc toutes les lignes ; il n'a pas besoin d'être SECURITY DEFINER.
create or replace function public.signalements_limite_jour()
returns trigger
language plpgsql
set search_path = public
as $fn$
declare
  nb integer;
begin
  perform pg_advisory_xact_lock(hashtext('signalements:' || new.user_id::text));
  select (select count(*) from public.signalements where user_id = new.user_id and created_at > now() - interval '24 hours') + (select count(*) from public.signalements_avis where user_id = new.user_id and created_at > now() - interval '24 hours') into nb;
  if nb >= 10 then
    raise exception 'LIMITE_SIGNALEMENTS';
  end if;
  return new;
end;
$fn$;
revoke all on function public.signalements_limite_jour() from public, anon, authenticated;
