-- Journal · 3/3 — Un match saisi après coup n'a pas le détail des points : la liste peut être vide.
alter table public.matchs drop constraint if exists matchs_points_check;
alter table public.matchs add constraint matchs_points_check check (jsonb_typeof(points) = 'array' and jsonb_array_length(points) between 0 and 1000);
