-- Espace · 3/6 — Limite de lignes sur resultats_tournois.
drop trigger if exists resultats_limite on public.resultats_tournois;
create trigger resultats_limite before insert on public.resultats_tournois for each row execute function public.espace_limite_lignes();
