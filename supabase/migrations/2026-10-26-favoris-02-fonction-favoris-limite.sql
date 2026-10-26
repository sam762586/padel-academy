-- Favoris · 2/3 — 500 favoris au maximum par joueur (le site en garde 200).
create or replace function public.favoris_limite()
returns trigger
language plpgsql
set search_path = public
as $fn$
begin
  if (select count(*) from public.favoris where user_id = new.user_id) >= 500 then
    raise exception 'Trop de favoris';
  end if;
  return new;
end;
$fn$;
