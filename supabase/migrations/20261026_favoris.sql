-- Padel Academy : table « favoris » (tournois mis en favori sur tournois.html)
-- À exécuter à la main dans Supabase > SQL Editor, APRÈS schema.sql. Peut être relancé sans risque (idempotent).
-- Chaque joueur ne lit et n'écrit que ses propres favoris (RLS). Les favoris partent en cascade quand le compte
-- est supprimé : delete_my_account() n'a pas besoin de changement.
begin;

create table if not exists public.favoris (
  user_id    uuid not null references auth.users(id) on delete cascade,
  -- identifiant du tournoi sur Ten'Up (le même que dans assets/data/tournois.json)
  tournoi_id text not null check (tournoi_id ~ '^[0-9A-Za-z_-]{1,20}$'),
  created_at timestamptz not null default now(),
  primary key (user_id, tournoi_id)
);

alter table public.favoris enable row level security;

drop policy if exists "favoris_select" on public.favoris;
drop policy if exists "favoris_insert" on public.favoris;
drop policy if exists "favoris_update" on public.favoris;
drop policy if exists "favoris_delete" on public.favoris;
create policy "favoris_select" on public.favoris for select to authenticated using (auth.uid() = user_id);
create policy "favoris_insert" on public.favoris for insert to authenticated with check (auth.uid() = user_id);
-- UPDATE nécessaire pour l'upsert (ajout d'un favori déjà présent)
create policy "favoris_update" on public.favoris for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "favoris_delete" on public.favoris for delete to authenticated using (auth.uid() = user_id);

-- 500 favoris au maximum par joueur (le site en garde 200)
create or replace function public.favoris_limite()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if (select count(*) from public.favoris where user_id = new.user_id) >= 500 then
    raise exception 'Trop de favoris';
  end if;
  return new;
end;
$$;
drop trigger if exists favoris_limite on public.favoris;
create trigger favoris_limite before insert on public.favoris for each row execute function public.favoris_limite();

commit;
