-- Auto · 2/3 — actualiser_tournois_ref() : lit le tournois.json publié sur le site et remplit tournois_ref (upsert).
-- Remplace, sans clé secrète ni ordinateur allumé, le collage hebdomadaire des fichiers de scripts/generer-tournois-ref.js.
-- 1) GET de l'adresse publique (connexion 10 s, réponse 60 s au plus) ; statut 200, type « application/json », 20 Mo au
--    plus, JSON lisible avec un tableau « tournois » non vide : sinon exception claire et RIEN n'est modifié.
-- 2) Mêmes règles que lignesRef() de scripts/generer-tournois-ref.js (si l'un change, l'autre aussi) :
--    id « ^(FED_)?[0-9]{1,12}$ » ; club nettoyé (contrôles → espace, blancs regroupés, bords retirés), 1 à 120 caractères ;
--    dates AAAA-MM-JJ réelles, date_fin absente = date_debut, fin >= début ; sinon ligne ignorée.
--    nom (200), ville (100), categorie (20) : nettoyés comme club, vides, trop longs ou avec coordonnées
--    (not message_sans_contact) => null ; dep : bords retirés, « ^[0-9A-Za-z]{1,3}$ » sinon null.
--    Longueurs comptées comme en JavaScript (un emoji compte pour 2). Même identifiant deux fois : la dernière ligne gagne.
--    Écart voulu : un champ texte qui n'est ni chaîne, ni nombre, ni booléen (objet, tableau) est traité comme absent
--    (le script JavaScript l'écrirait « [object Object] ») ; tournois.json n'en contient pas.
-- 3) insert … on conflict (id) do update, maj = now(). Aucune ligne supprimée (les avis gardent les tournois passés).
-- Renvoie le nombre de lignes insérées ou mises à jour. Bilan détaillé en NOTICE (visible dans le SQL Editor).
-- NON EXPOSÉE : seulement pg_cron (auto-03) ou le SQL Editor (select public.actualiser_tournois_ref();).
-- Prérequis : auto-01 (extension http), s2-01, s2-25 et s2-28. Relançable sans risque.
create or replace function public.actualiser_tournois_ref()
returns integer
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $fn$
declare
  v_adresse constant text := 'https://apprendre-padel.fr/assets/data/tournois.json';
  v_taille_max constant integer := 20000000;
  v_blancs constant text := '[\t\n\v\f\r    -     　﻿]';
  v_statut integer;
  v_type text;
  v_contenu text;
  v_source jsonb;
  v_e jsonb;
  v_j jsonb;
  v_id text;
  v_club text;
  v_txt text;
  v_dtxt text;
  v_ftxt text;
  v_debut date;
  v_fin date;
  v_nom text;
  v_ville text;
  v_cat text;
  v_dep text;
  v_ok boolean;
  v_a integer;
  v_m integer;
  v_d integer;
  v_total integer := 0;
  v_invalides integer := 0;
  t_id text[] := '{}';
  t_club text[] := '{}';
  t_debut date[] := '{}';
  t_fin date[] := '{}';
  t_nom text[] := '{}';
  t_ville text[] := '{}';
  t_cat text[] := '{}';
  t_dep text[] := '{}';
  v_nb integer;
begin
  -- 1. Téléchargement
  begin
    perform extensions.http_set_curlopt('CURLOPT_CONNECTTIMEOUT', '10');
    perform extensions.http_set_curlopt('CURLOPT_TIMEOUT', '60');
    select r.status, r.content_type, r.content into v_statut, v_type, v_contenu from extensions.http_get(v_adresse) as r;
  exception when others then
    raise exception 'TOURNOIS_REF_TELECHARGEMENT : % (adresse %)', sqlerrm, v_adresse;
  end;
  if v_statut is distinct from 200 then
    raise exception 'TOURNOIS_REF_STATUT : HTTP % au lieu de 200 (adresse %)', v_statut, v_adresse;
  end if;
  if v_type is null or v_type !~* '^application/json' then
    raise exception 'TOURNOIS_REF_TYPE : type « % » au lieu de application/json', v_type;
  end if;
  if v_contenu is null or octet_length(v_contenu) > v_taille_max then
    raise exception 'TOURNOIS_REF_TAILLE : % octets (maximum %)', octet_length(v_contenu), v_taille_max;
  end if;
  begin
    v_source := v_contenu::jsonb;
  exception when others then
    raise exception 'TOURNOIS_REF_JSON : contenu illisible (%)', sqlerrm;
  end;
  if jsonb_typeof(v_source) <> 'object' or jsonb_typeof(v_source -> 'tournois') is distinct from 'array' or jsonb_array_length(v_source -> 'tournois') = 0 then
    raise exception 'TOURNOIS_REF_JSON : pas de tableau « tournois » non vide';
  end if;

  -- 2. Validation, ligne par ligne, comme lignesRef()
  for v_e in select value from jsonb_array_elements(v_source -> 'tournois') loop
    v_total := v_total + 1;
    if jsonb_typeof(v_e) <> 'object' then
      v_invalides := v_invalides + 1;
      continue;
    end if;
    -- id : String(t.id) ; un nombre entier s'écrit sans décimales
    v_j := v_e -> 'id';
    v_id := '';
    if jsonb_typeof(v_j) = 'string' then
      v_id := v_j #>> '{}';
    elsif jsonb_typeof(v_j) = 'number' and (v_j #>> '{}')::numeric = trunc((v_j #>> '{}')::numeric) then
      v_id := trunc((v_j #>> '{}')::numeric)::text;
    end if;
    if v_id !~ '^(FED_)?[0-9]{1,12}$' then
      v_invalides := v_invalides + 1;
      continue;
    end if;
    -- club : String(t.club || '') nettoyé ; « faux » (absent, null, "", 0, false) = vide
    v_j := v_e -> 'club';
    v_club := '';
    if jsonb_typeof(v_j) in ('string', 'number', 'boolean') and v_j not in ('""'::jsonb, '0'::jsonb, 'false'::jsonb) then
      v_club := btrim(regexp_replace(regexp_replace(v_j #>> '{}', '[\u0001-\u001f\u007f]', ' ', 'g'), v_blancs || '+', ' ', 'g'), ' ');
    end if;
    if v_club = '' or char_length(v_club) + char_length(regexp_replace(v_club, '[^\U00010000-\U0010ffff]', '', 'g')) > 120 then
      v_invalides := v_invalides + 1;
      continue;
    end if;
    -- dates : date_fin « faux » = date_debut ; chaîne AAAA-MM-JJ d'un jour réel (année >= 100, comme Date.UTC)
    v_dtxt := case when jsonb_typeof(v_e -> 'date_debut') = 'string' then v_e ->> 'date_debut' end;
    v_j := v_e -> 'date_fin';
    if v_j is null or v_j in ('null'::jsonb, '""'::jsonb, '0'::jsonb, 'false'::jsonb) then
      v_ftxt := v_dtxt;
    else
      v_ftxt := case when jsonb_typeof(v_j) = 'string' then v_j #>> '{}' end;
    end if;
    v_debut := null;
    v_fin := null;
    v_ok := coalesce(v_dtxt ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$', false);
    if v_ok then
      v_a := substr(v_dtxt, 1, 4)::integer;
      v_m := substr(v_dtxt, 6, 2)::integer;
      v_d := substr(v_dtxt, 9, 2)::integer;
      v_ok := v_a >= 100 and v_m between 1 and 12 and v_d between 1 and 31;
    end if;
    if v_ok then
      v_debut := make_date(v_a, v_m, 1) + (v_d - 1);
      v_ok := extract(month from v_debut) = v_m;
    end if;
    v_ok := v_ok and coalesce(v_ftxt ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$', false);
    if v_ok then
      v_a := substr(v_ftxt, 1, 4)::integer;
      v_m := substr(v_ftxt, 6, 2)::integer;
      v_d := substr(v_ftxt, 9, 2)::integer;
      v_ok := v_a >= 100 and v_m between 1 and 12 and v_d between 1 and 31;
    end if;
    if v_ok then
      v_fin := make_date(v_a, v_m, 1) + (v_d - 1);
      v_ok := extract(month from v_fin) = v_m;
    end if;
    if not v_ok or v_fin < v_debut then
      v_invalides := v_invalides + 1;
      continue;
    end if;
    -- nom, ville, categorie : texteFacultatif()
    v_j := v_e -> 'nom';
    v_nom := null;
    if jsonb_typeof(v_j) in ('string', 'number', 'boolean') then
      v_txt := btrim(regexp_replace(regexp_replace(v_j #>> '{}', '[\u0001-\u001f\u007f]', ' ', 'g'), v_blancs || '+', ' ', 'g'), ' ');
      if v_txt <> '' and char_length(v_txt) + char_length(regexp_replace(v_txt, '[^\U00010000-\U0010ffff]', '', 'g')) <= 200 and public.message_sans_contact(v_txt) then
        v_nom := v_txt;
      end if;
    end if;
    v_j := v_e -> 'ville';
    v_ville := null;
    if jsonb_typeof(v_j) in ('string', 'number', 'boolean') then
      v_txt := btrim(regexp_replace(regexp_replace(v_j #>> '{}', '[\u0001-\u001f\u007f]', ' ', 'g'), v_blancs || '+', ' ', 'g'), ' ');
      if v_txt <> '' and char_length(v_txt) + char_length(regexp_replace(v_txt, '[^\U00010000-\U0010ffff]', '', 'g')) <= 100 and public.message_sans_contact(v_txt) then
        v_ville := v_txt;
      end if;
    end if;
    v_j := v_e -> 'categorie';
    v_cat := null;
    if jsonb_typeof(v_j) in ('string', 'number', 'boolean') then
      v_txt := btrim(regexp_replace(regexp_replace(v_j #>> '{}', '[\u0001-\u001f\u007f]', ' ', 'g'), v_blancs || '+', ' ', 'g'), ' ');
      if v_txt <> '' and char_length(v_txt) + char_length(regexp_replace(v_txt, '[^\U00010000-\U0010ffff]', '', 'g')) <= 20 and public.message_sans_contact(v_txt) then
        v_cat := v_txt;
      end if;
    end if;
    -- dep : String(t.dep).trim(), 1 à 3 lettres ou chiffres, sinon null
    v_j := v_e -> 'dep';
    v_dep := null;
    if jsonb_typeof(v_j) in ('string', 'number', 'boolean') then
      v_txt := regexp_replace(v_j #>> '{}', '^' || v_blancs || '+|' || v_blancs || '+$', '', 'g');
      if v_txt ~ '^[0-9A-Za-z]{1,3}$' then
        v_dep := v_txt;
      end if;
    end if;
    t_id := t_id || v_id;
    t_club := t_club || v_club;
    t_debut := t_debut || v_debut;
    t_fin := t_fin || v_fin;
    t_nom := t_nom || v_nom;
    t_ville := t_ville || v_ville;
    t_cat := t_cat || v_cat;
    t_dep := t_dep || v_dep;
  end loop;
  if cardinality(t_id) = 0 then
    raise exception 'TOURNOIS_REF_VIDE : aucun tournoi valide sur %', v_total;
  end if;

  -- 3. Upsert (doublons : la dernière ligne gagne), sans aucune suppression
  insert into public.tournois_ref (id, club, date_debut, date_fin, nom, ville, categorie, dep)
  select distinct on (u.id) u.id, u.club, u.debut, u.fin, u.nom, u.ville, u.cat, u.dep
  from unnest(t_id, t_club, t_debut, t_fin, t_nom, t_ville, t_cat, t_dep) with ordinality as u(id, club, debut, fin, nom, ville, cat, dep, n)
  order by u.id, u.n desc
  on conflict (id) do update set club = excluded.club, date_debut = excluded.date_debut, date_fin = excluded.date_fin, nom = excluded.nom, ville = excluded.ville, categorie = excluded.categorie, dep = excluded.dep, maj = now();
  get diagnostics v_nb = row_count;
  raise notice 'tournois_ref : % tournois lus, % ignorés, % doublons fusionnés, % lignes insérées ou mises à jour', v_total, v_invalides, cardinality(t_id) - v_nb, v_nb;
  return v_nb;
end;
$fn$;
revoke all on function public.actualiser_tournois_ref() from public, anon, authenticated;
