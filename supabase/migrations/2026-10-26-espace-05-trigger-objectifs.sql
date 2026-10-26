-- Espace · 5/6 — Limite de lignes sur objectifs.
drop trigger if exists objectifs_limite on public.objectifs;
create trigger objectifs_limite before insert on public.objectifs for each row execute function public.espace_limite_lignes();
