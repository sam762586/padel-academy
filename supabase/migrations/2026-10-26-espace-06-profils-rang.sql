-- Espace · 6/6 — Rang FFT déclaré par le joueur (saisi dans l'espace joueur), gardé dans son profil.
-- rang_maj sert à garder la saisie la plus récente entre l'appareil et le compte.
alter table public.profiles add column if not exists rang_fft integer check (rang_fft is null or rang_fft between 1 and 500000);
alter table public.profiles add column if not exists rang_sexe text check (rang_sexe is null or rang_sexe in ('messieurs','dames'));
alter table public.profiles add column if not exists rang_maj timestamptz;
