-- Concours · 7/17 — Déclencheur de concours-06 (avant chaque ajout de participation).
drop trigger if exists concours_participations_avant_insertion on public.concours_participations;
create trigger concours_participations_avant_insertion before insert on public.concours_participations for each row execute function public.concours_participations_avant_insertion();
