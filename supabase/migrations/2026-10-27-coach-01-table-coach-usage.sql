-- Coach IA · 1/4 — Nombre de questions posées au coach, par joueur et par jour (quota).
create table if not exists public.coach_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  jour date not null default current_date,
  nb integer not null default 0 check (nb >= 0),
  primary key (user_id, jour)
);
