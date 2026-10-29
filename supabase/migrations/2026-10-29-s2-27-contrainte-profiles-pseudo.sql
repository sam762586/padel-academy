-- S2 bis · 27/42 — Contrainte du pseudo (remplace celle de s2-03, même nom) : pseudo_valide (s2-26), qui refuse en plus les
-- chiffres non latins et applique le filtre de coordonnées v3.
-- NOT VALID : les pseudos existants ne sont ni relus ni modifiés ; la règle s'applique à toute nouvelle écriture du profil.
alter table public.profiles drop constraint if exists profiles_pseudo_format;
alter table public.profiles add constraint profiles_pseudo_format check (pseudo is null or public.pseudo_valide(pseudo)) not valid;
