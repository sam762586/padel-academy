-- Padel Academy : table « matchs » du compteur de match (score.html)
-- À exécuter à la main dans Supabase > SQL Editor, APRÈS schema.sql. Peut être relancé sans risque (idempotent).
-- Chaque joueur ne lit et n'écrit que ses propres matchs (RLS). Les matchs partent en cascade quand le compte
-- est supprimé : delete_my_account() n'a pas besoin de changement.
begin;

create table if not exists public.matchs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  joue_le    timestamptz not null,
  nom_a      text not null check (char_length(btrim(nom_a)) between 1 and 30),
  nom_b      text not null check (char_length(btrim(nom_b)) between 1 and 30),
  -- { egalite: "decisif" | "avantages", dernierSet: "set" | "super", serveur: 0 | 1 }
  format     jsonb not null check (
               jsonb_typeof(format) = 'object'
               and format ->> 'egalite' in ('decisif', 'avantages')
               and format ->> 'dernierSet' in ('set', 'super')
               and format ->> 'serveur' in ('0', '1')
             ),
  -- liste des points : [{ "g": 0 | 1, "m": motif | null }, ...]
  points     jsonb not null check (jsonb_typeof(points) = 'array' and jsonb_array_length(points) between 1 and 1000),
  score      text not null check (char_length(score) <= 60),
  vainqueur  smallint check (vainqueur in (0, 1)),
  interrompu boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists matchs_user_idx on public.matchs (user_id, joue_le desc);

alter table public.matchs enable row level security;

drop policy if exists "matchs_select" on public.matchs;
drop policy if exists "matchs_insert" on public.matchs;
drop policy if exists "matchs_delete" on public.matchs;
create policy "matchs_select" on public.matchs for select to authenticated using (auth.uid() = user_id);
create policy "matchs_insert" on public.matchs for insert to authenticated with check (auth.uid() = user_id);
create policy "matchs_delete" on public.matchs for delete to authenticated using (auth.uid() = user_id);
-- Pas de policy UPDATE : un match enregistré ne se modifie pas.

commit;
