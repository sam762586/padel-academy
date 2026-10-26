-- Classements · 2/2 — Même mise à jour pour annonces.classement_p (copie du profil au moment de l'annonce).
alter table public.annonces drop constraint if exists annonces_classement_p_check;
update public.annonces set classement_p = 'P3000' where classement_p = 'P2000';
update public.annonces set classement_p = 'P2000' where classement_p = 'P1500';
alter table public.annonces add constraint annonces_classement_p_check check (classement_p in ('P25','P50','P100','P250','P500','P1000','P2000','P3000'));
