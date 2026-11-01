-- Concours · 15/17 — Coordonnées des gagnants (et remplaçants) pour que Samuel les contacte (admin seulement, NON_ADMIN
-- sinon) : rang, user_id, e-mail du compte et pseudo, lus dans auth.users et profiles au moment de l'appel (jamais copiés).
-- Depuis le SQL Editor : même préambule set_config que pour admin_tirer_au_sort (concours-11).
create or replace function public.admin_contact_gagnants(p_concours text)
returns table (rang integer, user_id uuid, email text, pseudo text)
language plpgsql
stable
security definer
set search_path = ''
as $fn$
begin
  if not public.est_admin() then
    raise exception 'NON_ADMIN';
  end if;
  return query select g.rang, g.user_id, u.email::text, pr.pseudo from public.concours_gagnants g join auth.users u on u.id = g.user_id left join public.profiles pr on pr.id = g.user_id where g.concours_id = p_concours order by g.rang;
end;
$fn$;
revoke all on function public.admin_contact_gagnants(text) from public, anon;
grant execute on function public.admin_contact_gagnants(text) to authenticated;
