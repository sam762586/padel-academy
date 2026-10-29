-- S2 · 14/23 — 200 « J'y vais » au maximum par joueur.
drop trigger if exists presences_limite on public.presences;
create trigger presences_limite before insert on public.presences for each row execute function public.limite_lignes_joueur('200');
