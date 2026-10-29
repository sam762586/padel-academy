-- S2 · 15/23 — Matchs : taille bornée des points (1 000 points avec motif ≈ 44 Ko) et du format (≈ 80 octets).
-- NOT VALID : la table matchs contient déjà des matchs ; ils ne sont ni relus ni modifiés.
alter table public.matchs drop constraint if exists matchs_tailles;
alter table public.matchs add constraint matchs_tailles check (pg_column_size(points) < 50000 and pg_column_size(format) < 200) not valid;
