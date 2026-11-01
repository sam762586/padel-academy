-- Concours · 10/17 — Gagnants, écrits par admin_tirer_au_sort (concours-11) et admin_designer_remplacant (concours-12)
-- seulement. Rangs 1 à nb_gagnants : gagnants du tirage ; rangs suivants : remplaçants désignés dans le même classement.
--   empreinte            : SHA-256 de « graine:user_id », la valeur qui a classé le joueur (rang 1 = la plus petite) ;
--   affiche_publiquement : faux par défaut. Seul le gagnant lui-même peut le passer à vrai (son accord pour que son pseudo,
--                          lu dans profiles au moment de l'affichage, soit annoncé). Aucun pseudo ni e-mail copié ici.
-- RLS : lecture par l'admin, et par le gagnant de sa propre ligne (« Tu as gagné ») ; modification de affiche_publiquement
-- par le gagnant seulement ; aucun ajout ni suppression depuis le site. Liste publique : concours_gagnants_publics
-- (concours-14). Compte supprimé : sa ligne part en cascade. Purge : 60 jours après le tirage (concours-16).
create table if not exists public.concours_gagnants (
  concours_id          text not null references public.concours(id) on delete cascade,
  rang                 integer not null check (rang between 1 and 1000),
  user_id              uuid not null references auth.users(id) on delete cascade,
  empreinte            text not null check (empreinte ~ '^[0-9a-f]{64}$'),
  affiche_publiquement boolean not null default false,
  tire_le              timestamptz not null default now(),
  primary key (concours_id, rang),
  unique (concours_id, user_id)
);
create index if not exists concours_gagnants_user_idx on public.concours_gagnants (user_id);
alter table public.concours_gagnants enable row level security;
drop policy if exists "concours_gagnants_select" on public.concours_gagnants;
drop policy if exists "concours_gagnants_update" on public.concours_gagnants;
create policy "concours_gagnants_select" on public.concours_gagnants for select to authenticated using (user_id = auth.uid() or public.est_admin());
create policy "concours_gagnants_update" on public.concours_gagnants for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
-- Pas de politique d'ajout ni de suppression : seuls le tirage et la désignation d'un remplaçant écrivent ici.
revoke all on public.concours_gagnants from anon;
revoke all on public.concours_gagnants from authenticated;
grant select (concours_id, rang, user_id, empreinte, affiche_publiquement, tire_le) on public.concours_gagnants to authenticated;
grant update (affiche_publiquement) on public.concours_gagnants to authenticated;
