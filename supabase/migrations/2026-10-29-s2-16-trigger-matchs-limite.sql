-- S2 · 16/23 — 500 matchs au maximum par joueur.
drop trigger if exists matchs_limite on public.matchs;
create trigger matchs_limite before insert on public.matchs for each row execute function public.limite_lignes_joueur('500');
