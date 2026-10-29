-- S2 · 5/23 — Garde-fou commun : nombre maximum de lignes par joueur, passé en argument du déclencheur
-- (ex. execute function public.limite_lignes_joueur('500')). Même principe que espace_limite_lignes (espace-02).
-- SECURITY DEFINER : le compte doit voir toutes les lignes du joueur, même quand une colonne (avis.user_id) ne lui est
-- pas lisible. Fonction de déclencheur : personne ne peut l'appeler directement.
create or replace function public.limite_lignes_joueur()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  nb integer;
  maxi integer := tg_argv[0]::integer;
begin
  perform pg_advisory_xact_lock(hashtext(tg_table_name || ':' || new.user_id::text));
  execute format('select count(*) from public.%I where user_id = $1', tg_table_name) into nb using new.user_id;
  if nb >= maxi then
    raise exception 'LIMITE_LIGNES';
  end if;
  return new;
end;
$fn$;
revoke all on function public.limite_lignes_joueur() from public, anon, authenticated;
