-- Journal · 2/3 — Identifiant des matchs déjà enregistrés, puis unicité par joueur.
-- Les anciens matchs prennent leur id comme identifiant ; le site les reconnaît ainsi sans les recopier.
update public.matchs set cle = id::text where cle is null;
create unique index if not exists matchs_user_cle_idx on public.matchs (user_id, cle);
