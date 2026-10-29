-- S2 · 7/23 — Avis : identifiant de tournoi au format Ten'Up (le déclencheur s2-06 exige en plus qu'il soit dans tournois_ref).
-- NOT VALID par prudence : si des avis existent déjà, ils ne sont ni relus ni modifiés.
alter table public.avis drop constraint if exists avis_tournoi_id_format;
alter table public.avis add constraint avis_tournoi_id_format check (tournoi_id ~ '^(FED_)?[0-9]{1,12}$') not valid;
