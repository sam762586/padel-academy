-- Classements · 1/2 — Catégories P de la saison 2026/2027 dans profiles.classement_p.
-- Depuis le 1er septembre 2026, le P1500 est devenu P2000 et l'ancien P2000 est devenu P3000.
-- Les valeurs déjà saisies sont converties dans cet ordre (P2000 -> P3000 d'abord), puis la liste autorisée est remplacée.
alter table public.profiles drop constraint if exists profiles_classement_p_check;
update public.profiles set classement_p = 'P3000' where classement_p = 'P2000';
update public.profiles set classement_p = 'P2000' where classement_p = 'P1500';
alter table public.profiles add constraint profiles_classement_p_check check (classement_p in ('P25','P50','P100','P250','P500','P1000','P2000','P3000'));
