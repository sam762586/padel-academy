-- S2 · 21/23 — Limite quotidienne sur les signalements d'avis (t4-10).
drop trigger if exists signalements_avis_limite on public.signalements_avis;
create trigger signalements_avis_limite before insert on public.signalements_avis for each row execute function public.signalements_limite_jour();
