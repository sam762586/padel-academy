-- T4 · 3/12 — Déclencheur de la table presences.
drop trigger if exists presences_avant_insertion on public.presences;
create trigger presences_avant_insertion before insert on public.presences for each row execute function public.presences_avant_insertion();
