-- Académie · 2/3 — Séances terminées du quiz adaptatif (assets/js/academie-quiz.js, clé pa-academie-quiz).
-- cle : identifiant de séance du site (s-<date>-<aléa>) ; reponses : [{id, choix, juste, type, theme}] (tableau JSON,
-- 40 réponses au plus, taille bornée). Le score ne modifie jamais le niveau déclaré. RLS : chacun ses lignes ; pas de
-- modification (une séance terminée ne change plus).
-- PRÉPARÉ, NON APPLIQUÉ : à exécuter seulement avec l'accord de Samuel, après academie-01.
create table if not exists public.academie_quiz (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  cle        text not null check (cle ~ '^s-[0-9a-z]{4,16}-[0-9a-z]{1,8}$'),
  niveau     smallint not null check (niveau between 1 and 10),
  debut      timestamptz not null,
  fin        timestamptz,
  score      smallint not null check (score >= 0),
  total      smallint not null check (total between 1 and 40),
  reponses   jsonb not null check (jsonb_typeof(reponses) = 'array' and jsonb_array_length(reponses) = total and pg_column_size(reponses) < 8000),
  created_at timestamptz not null default now(),
  check (score <= total),
  unique (user_id, cle)
);
alter table public.academie_quiz enable row level security;
drop policy if exists "academie_quiz_select" on public.academie_quiz;
drop policy if exists "academie_quiz_insert" on public.academie_quiz;
drop policy if exists "academie_quiz_delete" on public.academie_quiz;
create policy "academie_quiz_select" on public.academie_quiz for select to authenticated using (auth.uid() = user_id);
create policy "academie_quiz_insert" on public.academie_quiz for insert to authenticated with check (auth.uid() = user_id);
create policy "academie_quiz_delete" on public.academie_quiz for delete to authenticated using (auth.uid() = user_id);
