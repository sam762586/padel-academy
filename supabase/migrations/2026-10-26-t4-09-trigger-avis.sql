-- T4 · 9/12 — Déclencheur de la table avis.
drop trigger if exists avis_avant_insertion on public.avis;
create trigger avis_avant_insertion before insert on public.avis for each row execute function public.avis_avant_insertion();
