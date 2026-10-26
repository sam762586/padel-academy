-- T4 · 10/12 — Signalements d'avis (même principe que les signalements d'annonces).
create table if not exists public.signalements_avis (
  id         uuid primary key default gen_random_uuid(),
  avis_id    uuid not null references public.avis(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  motif      text not null check (motif in ('contact','nom','irrespectueux','faux','autre')),
  created_at timestamptz not null default now(),
  unique (avis_id, user_id)
);
alter table public.signalements_avis enable row level security;
drop policy if exists "signalements_avis_select" on public.signalements_avis;
create policy "signalements_avis_select" on public.signalements_avis for select to authenticated using (user_id = auth.uid() or public.est_admin());
