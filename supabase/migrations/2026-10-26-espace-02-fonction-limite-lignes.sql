-- Espace · 2/6 — Garde-fou commun : 300 lignes au maximum par joueur dans resultats_tournois et objectifs.
create or replace function public.espace_limite_lignes()
returns trigger
language plpgsql
set search_path = public
as $fn$
declare
  nb integer;
begin
  execute format('select count(*) from public.%I where user_id = $1', tg_table_name) into nb using new.user_id;
  if nb >= 300 then
    raise exception 'LIMITE_LIGNES';
  end if;
  return new;
end;
$fn$;
