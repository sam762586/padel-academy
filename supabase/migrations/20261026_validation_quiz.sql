-- À appliquer dans Supabase après sauvegarde et revue ; aucune donnée existante n'est supprimée.
-- NOT VALID conserve les anciens résultats, tout en contrôlant les nouvelles écritures.
begin;

create or replace function public.quiz_resultat_valide(p_score integer, p_niveau smallint, p_reponses jsonb)
returns boolean
language plpgsql
immutable
set search_path = public
as $$
declare
  themes text[] := array['vitre','service','aerien','couple','placement','montee','regularite','transition','communication','compet'];
  reponse jsonb;
  points numeric;
  total integer := 0;
  i integer;
begin
  if p_score is null or p_score < 0 or p_score > 30 or p_niveau is null then return false; end if;
  if p_niveau <> case when p_score < 9 then 1 when p_score < 17 then 2 when p_score < 24 then 3 else 4 end then return false; end if;
  -- Les anciens clients pouvaient omettre les réponses : score et niveau restent contrôlés.
  if p_reponses is null then return true; end if;
  if jsonb_typeof(p_reponses) is distinct from 'array' then return false; end if;
  if jsonb_array_length(p_reponses) <> 10 then return false; end if;
  for i in 0..9 loop
    reponse := p_reponses -> i;
    if jsonb_typeof(reponse) is distinct from 'object'
       or jsonb_typeof(reponse -> 'pts') is distinct from 'number'
       or (reponse ->> 'theme') is distinct from themes[i+1] then return false; end if;
    points := (reponse ->> 'pts')::numeric;
    if points < 0 or points > 3 or points <> trunc(points) then return false; end if;
    total := total + points::integer;
  end loop;
  return total = p_score;
end;
$$;

alter table public.quiz_results drop constraint if exists quiz_resultat_coherent;
alter table public.quiz_results add constraint quiz_resultat_coherent
  check (public.quiz_resultat_valide(score, niveau, reponses)) not valid;

commit;

-- Après revue des éventuelles anciennes lignes incohérentes, une validation complète peut être faite :
-- alter table public.quiz_results validate constraint quiz_resultat_coherent;
