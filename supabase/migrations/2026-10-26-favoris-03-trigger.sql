-- Favoris · 3/3 — Déclencheur de la limite.
drop trigger if exists favoris_limite on public.favoris;
create trigger favoris_limite before insert on public.favoris for each row execute function public.favoris_limite();
