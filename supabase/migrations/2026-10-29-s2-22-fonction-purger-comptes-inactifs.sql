-- S2 · 22/23 — Supprime les comptes sans connexion depuis 3 ans (durée décidée par Samuel le 29/10/2026).
-- ATTENTION (S2 bis) : remplacé(e) par 2026-10-29-s2-36. Si tu relances ce fichier, relance ensuite s2-35 et s2-36 (sinon la faille corrigée revient).
-- Date retenue : dernière connexion (auth.users.last_sign_in_at), ou création du compte s'il ne s'est jamais connecté.
-- La cascade (on delete cascade) efface profil, résultats, matchs, favoris, annonces, présences, avis, signalements…
-- NON EXPOSÉE : ni les visiteurs ni les joueurs ne peuvent l'appeler ; seulement pg_cron ou le SQL Editor.
create or replace function public.purger_comptes_inactifs()
returns integer
language plpgsql
security definer
set search_path = public
as $fn$
declare
  nb integer;
begin
  delete from auth.users where coalesce(last_sign_in_at, created_at) < now() - interval '3 years';
  get diagnostics nb = row_count;
  return nb;
end;
$fn$;
revoke all on function public.purger_comptes_inactifs() from public, anon, authenticated;
