-- S2 · 2/23 — Filtre de coordonnées renforcé (remplace la version de schema-partenaires.sql, même nom, même signature).
-- ATTENTION (S2 bis) : remplacé(e) par 2026-10-29-s2-25. Si tu relances ce fichier, relance ensuite s2-24 et s2-25 (sinon la faille corrigée revient).
-- Vrai si le texte ne contient AUCUN contact. Utilisé par les contraintes des annonces (message, tournoi_*), des avis
-- (via avis_texte_correct) et du pseudo des profils. Les lignes déjà enregistrées ne sont pas relues.
--   1. normalisation NFKC (chiffres et lettres « pleine largeur », ①, 𝟎…), minuscules, caractères invisibles retirés ;
--   2. e-mail (@, arobase, [at]), lien (http, www, .fr .com .ly…, « point com »), réseaux et messageries ;
--   3. dates (12/11/2026, 20/11, 2026-11-12, 141126) et heures (18:30) neutralisées, sauf si d'autres chiffres suivent
--      (06.12.34.56.78 n'est pas une date), puis TOUS les séparateurs retirés :
--      9 chiffres ou plus à la suite = numéro de téléphone (06 12 34 56 78, 06_12_34_56_78, ０６/12…).
-- Le même filtre existe côté navigateur (communaute-tournoi.js et partenaires.js) : garder les deux identiques
-- (référence JavaScript : filtreJs dans scripts/verifier-securite-sql.cjs, comparée à cette fonction par la suite de tests).
create or replace function public.message_sans_contact(p_texte text)
returns boolean
language plpgsql
immutable
set search_path = public
as $fn$
declare
  t text;
  i integer;
begin
  if p_texte is null then
    return true;
  end if;
  t := lower(normalize(p_texte, NFKC));
  t := translate(t, chr(173) || chr(8203) || chr(8204) || chr(8205) || chr(8206) || chr(8207) || chr(8288) || chr(65279), '');
  if position('@' in t) > 0 or t ~ '(arobase|\[at\]|\(at\))' then
    return false;
  end if;
  if t ~ '(https?:|www\.)' or t ~ '\.(fr|com|net|org|eu|io|be|ch|me|gg|ly|ee|co|app|info|link)\M' or t ~ '\m(point|dot)[[:space:]]*(com|fr|net)\M' then
    return false;
  end if;
  if t ~ '\m(gmail|hotmail|outlook|yahoo|icloud|whatsapp|telegram|snapchat|snap|instagram|insta|facebook|messenger|tiktok|discord|signal)\M' then
    return false;
  end if;
  if regexp_replace(t, '[^[:alpha:]]', '', 'g') ~ '(whatsapp|instagram|snapchat|telegram|tiktok)' then
    return false;
  end if;
  for i in 1..3 loop
    t := regexp_replace(t, '\m((0?[1-9]|[12][0-9]|3[01])[/.-](0?[1-9]|1[0-2])[/.-](20[0-9]{2}|[0-9]{2})|(0?[1-9]|[12][0-9]|3[01])/(0?[1-9]|1[0-2])|20[0-9]{2}-[0-9]{2}-[0-9]{2}|(0[1-9]|[12][0-9]|3[01])(0[1-9]|1[0-2])(20)?2[0-9]|([01]?[0-9]|2[0-3]):[0-5][0-9])\M(?![^[:alnum:]]*[0-9]+[^[:alnum:]]+[0-9])', ' ', 'g');
  end loop;
  return not (regexp_replace(t, '[^[:alnum:]]', '', 'g') ~ '[0-9]{9,}');
end;
$fn$;
grant execute on function public.message_sans_contact(text) to authenticated;
