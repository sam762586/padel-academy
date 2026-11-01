-- Concours · 3/17 — Déclencheur du garde-fou concours-02 (avant chaque modification ou suppression d'un concours).
drop trigger if exists concours_avant_modification on public.concours;
create trigger concours_avant_modification before update or delete on public.concours for each row execute function public.concours_avant_modification();
