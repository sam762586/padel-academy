-- S2 · 10/23 — 50 avis au maximum par joueur.
drop trigger if exists avis_limite on public.avis;
create trigger avis_limite before insert on public.avis for each row execute function public.limite_lignes_joueur('50');
