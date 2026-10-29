-- S2 bis · 25/42 — Filtre de coordonnées, 3e version (remplace celle de s2-02, même nom, même signature).
-- Vrai si le texte ne contient AUCUN contact. Utilisé par les contraintes des annonces (message, tournoi_*), des avis
-- (via avis_texte_correct) et du pseudo (via pseudo_valide, s2-26). Les lignes déjà enregistrées ne sont pas relues.
-- Corrige les contournements trouvés le 29/10/2026 : lettres entre les chiffres (06 et 12 et 34…, 06a12b34…, 06 l2 34…),
-- effacement en chaîne des dates et heures (06/12/34 5678, 06:12 23:45 67), chiffres non latins (٠٦١٢…, ०६१२…),
-- réseaux espacés ou abrégés (i n s t a, s n a p, ig : jean, t me jean).
--   1. NFKC, minuscules, caractères invisibles retirés, chiffres non latins convertis (chiffres_ascii, s2-24) ;
--   2. e-mail, lien (http, www, domaines, « point com », « t me »), réseaux et messageries (y compris écrits lettre par
--      lettre : les suites de lettres isolées sont recollées avant la recherche) ;
--   3. une seule passe d'effacement, d'abord des catégories (P250, P100H, +45, 2v2, « 250 » en tête), puis des dates et
--      heures (12/11/2026, 12/11, 2026-11-12, 141126, 18:30, 18h30, 9h-12h, « 14/11 de 9h à 18h »), protégées des deux côtés :
--      une date ou heure collée (par de simples séparateurs) à 3 chiffres ou plus à gauche n'est pas effacée, une date
--      courte (12/11) ou une heure suivie d'un chiffre non plus ; une date complète n'est acceptée qu'avec une année 2024-2029
--      (24-29) : 06/12/34 ou 06.12.2034 ne sont pas des dates ;
--   4. téléphone : 9 chiffres ou plus une fois les séparateurs retirés, ou une chaîne de groupes de chiffres séparés par au
--      plus 4 caractères quelconques (lettres comprises) qui totalise 9 chiffres ou plus.
-- Le même filtre existe côté navigateur (communaute-tournoi.js et partenaires.js) : garder les deux identiques (référence
-- JavaScript : filtreJs dans scripts/verifier-securite-sql.cjs, comparée à cette fonction par la suite de tests).
-- Limites connues (traitées par les signalements) : nombres écrits en lettres, numéro découpé en dates 2024-2029.
create or replace function public.message_sans_contact(p_texte text)
returns boolean
language plpgsql
immutable
set search_path = public
as $fn$
declare
  t text;
  j text;
begin
  if p_texte is null then
    return true;
  end if;
  t := lower(normalize(p_texte, NFKC));
  t := translate(t, chr(173) || chr(8203) || chr(8204) || chr(8205) || chr(8206) || chr(8207) || chr(8288) || chr(65279), '');
  t := public.chiffres_ascii(t);
  if position('@' in t) > 0 or t ~ '(arobase|\[at\]|\(at\))' then
    return false;
  end if;
  if t ~ '(https?:|www\.)' or t ~ '\.(fr|com|net|org|eu|io|be|ch|me|gg|ly|ee|co|app|info|link)\M' or t ~ '\m(point|dot)[[:space:]]*(com|fr|net)\M' or t ~ '\m(t|wa)[^[:alnum:]]+me\M' then
    return false;
  end if;
  j := regexp_replace(t, '(?<![[:alnum:]])([[:alpha:]])[^[:alnum:]]+(?=[[:alpha:]](?![[:alnum:]]))', '\1', 'g');
  if j ~ '\m(gmail|hotmail|outlook|yahoo|icloud|whatsapp|wtsp|telegram|snapchat|snap|instagram|insta|ig|facebook|fb|messenger|tiktok|discord|signal)\M' then
    return false;
  end if;
  if regexp_replace(t, '[^[:alpha:]]', '', 'g') ~ '(whatsapp|instagram|snapchat|telegram|tiktok)' then
    return false;
  end if;
  t := regexp_replace(t, '(?<![[:alnum:]])(p[^[:alnum:]]?(25|50|100|250|500|1000|1500|2000|3000)[hdfmx]?|[+][^[:alnum:]]*(35|45|55|60|65)|[1-4]v[1-4])(?![0-9])|^(100|250|500|1000|2000|3000)(?![0-9])', ' ', 'g');
  t := regexp_replace(t, '(?<![[:alnum:]])(?<![0-9]([^[:alnum:]]*[0-9]){2}[^[:alnum:]]*)(((0?[1-9]|[12][0-9]|3[01])[/.-](0?[1-9]|1[0-2])[/.-](20)?2[4-9]|202[4-9]-(0?[1-9]|1[0-2])-(0?[1-9]|[12][0-9]|3[01])|(0[1-9]|[12][0-9]|3[01])(0[1-9]|1[0-2])(20)?2[4-9])([^[:alnum:]]+((à|a|de|dès|des|vers)[^[:alnum:]]+)?([01]?[0-9]|2[0-3])(:[0-5][0-9]|h([0-5][0-9])?)([^[:alnum:]]*([-–/]|à)[^[:alnum:]]*([01]?[0-9]|2[0-3])(:[0-5][0-9]|h([0-5][0-9])?)?)?)?(?![[:alnum:]])|(((0?[1-9]|[12][0-9]|3[01])/(0?[1-9]|1[0-2]))([^[:alnum:]]+((à|a|de|dès|des|vers)[^[:alnum:]]+)?([01]?[0-9]|2[0-3])(:[0-5][0-9]|h([0-5][0-9])?)([^[:alnum:]]*([-–/]|à)[^[:alnum:]]*([01]?[0-9]|2[0-3])(:[0-5][0-9]|h([0-5][0-9])?)?)?)?|([01]?[0-9]|2[0-3])(:[0-5][0-9]|h([0-5][0-9])?)([^[:alnum:]]*([-–/]|à)[^[:alnum:]]*([01]?[0-9]|2[0-3])(:[0-5][0-9]|h([0-5][0-9])?)?)?)(?![[:alnum:]])(?![^[:alnum:]]*[0-9]))', ' ', 'g');
  if regexp_replace(t, '[^[:alnum:]]', '', 'g') ~ '[0-9]{9,}' then
    return false;
  end if;
  if exists (select 1 from regexp_matches(t, '[0-9]+(?:[^0-9]{1,4}[0-9]+)*', 'g') as m(x) where char_length(regexp_replace(m.x[1], '[^0-9]', '', 'g')) >= 9) then
    return false;
  end if;
  return true;
end;
$fn$;
grant execute on function public.message_sans_contact(text) to authenticated;
