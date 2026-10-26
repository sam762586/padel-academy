-- Journal · 1/3 — Colonnes du journal de matchs (espace joueur) sur la table matchs (déjà créée par 20261026_matchs.sql).
--   cle         identifiant créé par le navigateur : un match du téléphone n'est jamais copié deux fois dans le compte
--   partenaire  ton partenaire pour ce match (facultatif, 30 caractères)
--   type_match  amical, tournoi ou entrainement (facultatif)
--   saisie      compteur (point par point) ou manuelle (score saisi après coup)
alter table public.matchs add column if not exists cle text check (cle is null or cle ~ '^[0-9A-Za-z-]{8,40}$');
alter table public.matchs add column if not exists partenaire text check (partenaire is null or char_length(btrim(partenaire)) between 1 and 30);
alter table public.matchs add column if not exists type_match text check (type_match is null or type_match in ('amical','tournoi','entrainement'));
alter table public.matchs add column if not exists saisie text not null default 'compteur' check (saisie in ('compteur','manuelle'));
