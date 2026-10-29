-- S2 · 20/23 — Limite quotidienne sur les signalements d'annonces (schema-partenaires.sql).
drop trigger if exists signalements_limite on public.signalements;
create trigger signalements_limite before insert on public.signalements for each row execute function public.signalements_limite_jour();
