-- S2 · 4/23 — Annonces : identifiant de tournoi au format Ten'Up, et textes du tournoi (nom, ville, catégorie, envoyés
-- par le navigateur et affichés aux autres joueurs) sans coordonnées.
-- NOT VALID : la table annonces contient déjà des lignes ; elles ne sont ni relues ni modifiées.
alter table public.annonces drop constraint if exists annonces_tournoi_id_format;
alter table public.annonces add constraint annonces_tournoi_id_format check (tournoi_id ~ '^(FED_)?[0-9]{1,12}$') not valid;
alter table public.annonces drop constraint if exists annonces_tournoi_sans_contact;
alter table public.annonces add constraint annonces_tournoi_sans_contact check (public.message_sans_contact(tournoi_nom) and public.message_sans_contact(tournoi_ville) and public.message_sans_contact(tournoi_categorie)) not valid;
