-- Quiz · 4/5 — Contrôle d'un résultat, ancien test et test v2.
-- Sans palier : règles de l'ancien test (quiz_resultat_valide, fichier quiz-01).
-- Avec palier : palier 0 à 5, niveau = niveau des exercices du palier (1,1,2,3,4,4), 10 réponses dans l'ordre des thèmes,
-- chacune avec pts (0 à 3) et palier (0 à 5), somme des pts = score.
create or replace function public.quiz_resultat_valide_v2(p_score integer, p_niveau smallint, p_palier smallint, p_reponses jsonb)
returns boolean
language plpgsql
immutable
set search_path = public
as $fn$
declare
  themes text[] := array['vitre','service','aerien','couple','placement','montee','regularite','transition','communication','compet'];
  niveaux smallint[] := array[1,1,2,3,4,4];
  reponse jsonb;
  points numeric;
  palier_theme numeric;
  total integer := 0;
  i integer;
begin
  if p_palier is null then
    return public.quiz_resultat_valide(p_score, p_niveau, p_reponses);
  end if;
  if p_score is null or p_score < 0 or p_score > 30 or p_palier < 0 or p_palier > 5 or p_niveau is distinct from niveaux[p_palier + 1] then
    return false;
  end if;
  if jsonb_typeof(p_reponses) is distinct from 'array' or jsonb_array_length(p_reponses) <> 10 then
    return false;
  end if;
  for i in 0..9 loop
    reponse := p_reponses -> i;
    if jsonb_typeof(reponse) is distinct from 'object' or jsonb_typeof(reponse -> 'pts') is distinct from 'number' or jsonb_typeof(reponse -> 'palier') is distinct from 'number' or (reponse ->> 'theme') is distinct from themes[i + 1] then
      return false;
    end if;
    points := (reponse ->> 'pts')::numeric;
    palier_theme := (reponse ->> 'palier')::numeric;
    if points < 0 or points > 3 or points <> trunc(points) or palier_theme < 0 or palier_theme > 5 or palier_theme <> trunc(palier_theme) then
      return false;
    end if;
    total := total + points::integer;
  end loop;
  return total = p_score;
end;
$fn$;
