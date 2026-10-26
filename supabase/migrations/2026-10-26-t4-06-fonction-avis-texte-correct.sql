-- T4 · 6/12 — Texte d'avis acceptable : aucun contact (message_sans_contact, de schema-partenaires.sql)
-- et aucune insulte de la liste. Le même filtre existe côté navigateur (communaute-tournoi.js).
-- Les noms de personnes sont interdits par la charte et traités par signalement : impossible à détecter de façon fiable.
create or replace function public.avis_texte_correct(p_texte text)
returns boolean
language sql
immutable
set search_path = public
as $fn$
  select p_texte is null or (public.message_sans_contact(p_texte) and not (lower(p_texte) ~ '(connard|connasse|salop|encul|enfoir|putain|\mpute|abruti|crétin|cretin|débile|debile|bouffon|batard|bâtard|merdique|\mnique|\mntm\M|\mfdp\M|tocard|minable)'));
$fn$;
