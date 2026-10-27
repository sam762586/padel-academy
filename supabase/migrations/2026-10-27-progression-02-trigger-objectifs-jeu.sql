-- Progression · 2/2 — Limite de lignes sur objectifs_jeu (fonction commune espace_limite_lignes, migration espace-02).
drop trigger if exists objectifs_jeu_limite on public.objectifs_jeu;
create trigger objectifs_jeu_limite before insert on public.objectifs_jeu for each row execute function public.espace_limite_lignes();
