-- Concours · annulation 1/7 (concours-18) — Colonnes d'annulation d'un concours (04/11/2026 : « Ton pack Nox offert »
-- annulé pour un problème technique). Annuler ne supprime rien : participations, exclusions et gagnants restent, la purge
-- habituelle (concours-16) s'applique telle quelle (90 jours après la fin pour un concours jamais tiré).
--   annule_le        : date de l'annulation (null = concours non annulé) ;
--   motif_annulation : texte public court (3 à 200 caractères), obligatoire si et seulement si annule_le est rempli.
-- Lisibles par tous (droit de lecture de la table, concours-01) : le site peut afficher « concours annulé » et le motif.
-- Écrits depuis le SQL Editor seulement : aucun droit de modification par colonne n'est donné au site (le compte admin
-- connecté ne peut ni annuler ni « désannuler »). Ajout de colonnes nullables : la ligne existante n'est pas réécrite.
-- PRÉPARÉ, NON APPLIQUÉ (04/11/2026) : à exécuter par Samuel, voir supabase/LISEZMOI.md « Jeu concours ».
alter table public.concours add column if not exists annule_le timestamptz;
alter table public.concours add column if not exists motif_annulation text;
alter table public.concours drop constraint if exists concours_annulation;
alter table public.concours add constraint concours_annulation check ((annule_le is null and motif_annulation is null) or (annule_le is not null and motif_annulation is not null and char_length(btrim(motif_annulation)) between 3 and 200));
