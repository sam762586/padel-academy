/* Vérification des migrations du jeu concours (supabase/migrations/2026-11-01-concours-01 à 17, puis l'annulation
   2026-11-04-concours-18 à 25), sans toucher
   à la base en ligne : Postgres en mémoire (pglite), avec ce que fournit Supabase recréé (auth.users, auth.uid(), rôles
   authenticated et anon, droits par défaut, pg_cron simulé), profiles + est_admin() (schema-partenaires.sql) et la vraie
   fonction delete_my_account() de schema.sql. Trois joueurs (A, B, C) et un admin.
   Contrôles : migrations rejouables ; concours lisibles par tous, écrits par l'admin seulement, figés une fois commencés
   (dates, nombre de lots, suppression) ; participation hors période, double, cases non cochées, pour un autre, sans compte
   ou de l'organisateur refusée ; chacun ne voit que sa participation ; retrait seulement pendant le concours ; exclusion
   pour fraude tracée et comptée ; compteur et résumé justes (figés au tirage) ; tirage refusé avant la fin, à un non-admin,
   avec une graine EuroMillions mal formée ou mal datée, non rejouable ; gagnants recalculés à l'identique ; remplaçant du
   même classement ; le gagnant voit sa ligne, l'autre non ; pseudo public seulement après accord du gagnant lui-même ;
   contact réservé à l'admin, e-mail jamais copié ; purge (60 jours après le tirage, 90 jours après la fin sans tirage) ;
   job pg_cron unique ; suppression du compte en cascade ; fonctions SECURITY DEFINER en search_path vide.
   Annulation (18 à 25, par-dessus 01 à 17) : tout ce qui précède repasse avec les fonctions remplacées ; 2026-11-pack-nox
   annulé par concours-25, le dernier fichier (relançable, date conservée) ; participer refusé (CONCOURS_ANNULE, et règle
   RLS seule) ; tirage, remplaçant et exclusion refusés ; l'admin ne supprime aucune participation d'un concours annulé ; le joueur retire sa participation, même après la fin, pas celle d'un autre ; concours annulé
   figé depuis le site ; annulation lisible par tous, non modifiable depuis le site ; aucune ligne supprimée.
   Outil : @electric-sql/pglite (hors site, installé sans l'ajouter au package.json :
   cd ../padel-academy/scripts && npm install --no-save @electric-sql/pglite@0.2.12).
   Lancer depuis la racine du site : node scripts/verifier-concours-sql.mjs */
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const racine = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const lire = f => fs.readFileSync(path.join(racine, f), 'utf8');
let nb = 0; const ok = m => { nb++; console.log('OK ' + m); };
const require = createRequire(path.join(path.resolve(racine, process.env.NODE_PATH || '../padel-academy/scripts/node_modules'), 'x.js'));
let PGlite;
try { ({ PGlite } = await import(pathToFile(require.resolve('@electric-sql/pglite')))); }
catch (e) { console.error('pglite introuvable : cd ../padel-academy/scripts && npm install --no-save @electric-sql/pglite@0.2.12'); process.exit(1); }
function pathToFile(p) { return new URL('file:///' + p.replace(/\\/g, '/')).href; }
const sha = t => crypto.createHash('sha256').update(t, 'utf8').digest('hex');
const binaire = (x, y) => (x < y ? -1 : x > y ? 1 : 0); // ordre "C" sur de l'hexadécimal minuscule

const db = new PGlite();
const A = '11111111-1111-4111-8111-111111111111', B = '22222222-2222-4222-8222-222222222222', C = '44444444-4444-4444-8444-444444444444', ADM = '33333333-3333-4333-8333-333333333333';
// Ce que Supabase fournit (auth.uid() comme sur Supabase : claim.sub, sinon claims->>'sub'), et un pg_cron simulé
await db.exec(`
 create schema auth;
 create table auth.users (id uuid primary key, email text);
 create function auth.uid() returns uuid language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claim.sub', true), ''), (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'))::uuid $$;
 create role authenticated; create role anon;
 grant usage on schema public, auth to authenticated, anon;
 grant execute on function auth.uid() to authenticated, anon;
 alter default privileges in schema public grant all on tables to authenticated, anon;
 create schema cron;
 create table cron.job (jobid bigserial primary key, jobname text, schedule text, command text);
 create function cron.schedule(n text, s text, c text) returns bigint language sql as $$ insert into cron.job (jobname, schedule, command) values (n, s, c) returning jobid $$;
 create function cron.unschedule(j bigint) returns boolean language sql as $$ delete from cron.job where jobid = j returning true $$;
 insert into auth.users values ('${A}', 'a@exemple.fr'), ('${B}', 'b@exemple.fr'), ('${C}', 'c@exemple.fr'), ('${ADM}', 'admin@exemple.fr');
 create table public.profiles (id uuid primary key references auth.users(id) on delete cascade, pseudo text, is_admin boolean not null default false);
 insert into public.profiles values ('${A}', 'Alpha', false), ('${B}', 'Bravo', false), ('${C}', null, false), ('${ADM}', 'Samuel', true);`);
const estAdmin = lire('supabase/schema-partenaires.sql').match(/create or replace function public\.est_admin\(\)[\s\S]*?\n\$\$;/)[0];
const supprimerCompte = lire('supabase/schema.sql').match(/create or replace function public\.delete_my_account\(\)[\s\S]*?\n\$\$;/)[0];
await db.exec(estAdmin + `\nrevoke all on function public.est_admin() from public, anon; grant execute on function public.est_admin() to authenticated;\n`);
await db.exec(supprimerCompte + `\nrevoke all on function public.delete_my_account() from public, anon; grant execute on function public.delete_my_account() to authenticated;\n`);
const migrations = fs.readdirSync(path.join(racine, 'supabase/migrations')).filter(f => f.startsWith('2026-11-01-concours-')).sort();
assert.equal(migrations.length, 17, '17 fichiers concours');
migrations.forEach((m, i) => assert.ok(m.startsWith('2026-11-01-concours-' + String(i + 1).padStart(2, '0') + '-'), 'numérotation ' + m));
for (let fois = 0; fois < 2; fois++) for (const m of migrations) await db.exec(lire('supabase/migrations/' + m));
const annulation = fs.readdirSync(path.join(racine, 'supabase/migrations')).filter(f => f.startsWith('2026-11-04-concours-')).sort();
assert.equal(annulation.length, 8, '8 fichiers d’annulation');
assert.match(annulation[annulation.length - 1], /-annuler-pack-nox\.sql$/, 'l’UPDATE d’annulation est le dernier fichier');
annulation.forEach((m, i) => assert.ok(m.startsWith('2026-11-04-concours-' + (18 + i) + '-'), 'numérotation ' + m));
for (let fois = 0; fois < 2; fois++) for (const m of annulation) await db.exec(lire('supabase/migrations/' + m));
for (const m of annulation) {
  const t = lire('supabase/migrations/' + m);
  assert.match(t, /^-- Concours · annulation \d\/8 \(concours-\d+\) — /, m + ' : en-tête commenté');
  assert.doesNotMatch(t, /\$\$/, m + ' : tag $fn$');
  assert.doesNotMatch(t.replace(/\$fn\$[\s\S]*?\$fn\$/g, '').split('\n').filter(l => !/^\s*--/.test(l)).join('\n'), /\bdelete\s+from\b|\btruncate\b|\bdrop table\b|\bdrop column\b|\binsert into\b/i, m + ' : aucune suppression ni ajout de ligne hors des corps de fonction');
  if (/create or replace function/.test(t)) assert.match(t, /set search_path = ''/, m + ' : fonction en search_path vide');
}
ok('8 migrations d’annulation concours-18 à 25 rejouables (l’UPDATE en dernier, fonctions en search_path vide) (deux passages, par-dessus 01 à 17 : toutes les vérifications suivantes passent avec les fonctions remplacées), en-têtes, tag $fn$, aucune suppression ni ajout de ligne');
for (const m of migrations) {
  const t = lire('supabase/migrations/' + m);
  assert.match(t, /^-- Concours · \d+\/17 — /, m + ' : en-tête commenté');
  assert.doesNotMatch(t, /\$\$\s*\n?\s*(begin|declare)/i, m + ' : corps plpgsql avec le tag $fn$');
  assert.doesNotMatch(t, /insert into[^;]*(email|pseudo)/i, m + ' : ni e-mail ni pseudo copiés');
  if (/security definer/.test(t)) assert.match(t, /set search_path = ''/, m + ' : SECURITY DEFINER en search_path vide');
  if (/order by t\.empreinte/.test(t)) assert.doesNotMatch(t.replace(/order by t\.empreinte collate "C"/g, ''), /order by t\.empreinte/, m + ' : classement en collation "C"');
}
assert.doesNotMatch(migrations.map(m => lire('supabase/migrations/' + m)).join('\n'), /gen_random_uuid|graine_empreinte/, 'ni graine aléatoire ni mode engagement');
ok('17 migrations concours-01 à 17 rejouables (deux passages), fonctions en $fn$, SECURITY DEFINER en search_path vide, classement en collation "C", ni e-mail ni pseudo copiés, plus de graine aléatoire');

// Exécute une requête en tant que joueur connecté (ou anonyme), puis revient au superutilisateur sans identité
async function en(qui, sql, params = []) {
  await db.exec(qui ? `set role authenticated; select set_config('request.jwt.claim.sub', '${qui}', false);` : `set role anon; select set_config('request.jwt.claim.sub', '', false);`);
  try { return await db.query(sql, params); } finally { await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`); }
}
const echoue = async (qui, sql, params, motif) => { await assert.rejects(en(qui, sql, params), motif); };
const n = async (qui, sql, params = []) => (await en(qui, sql, params)).rows[0].n;
const su = (sql, params) => db.query(sql, params);

// Concours : lecture publique, écriture admin seulement
const creer = `insert into concours (id, titre, date_debut, date_fin, nb_gagnants) values ($1, $2, now() + $3::interval, now() + $4::interval, $5)`;
await echoue(A, creer, ['2026-11-pirate', 'Pirate', '-1 day', '1 day', 1], /row-level security/);
await echoue(null, creer, ['2026-11-pirate', 'Pirate', '-1 day', '1 day', 1], /permission denied/);
await en(ADM, creer, ['2026-11-raquette', 'Raquette', '-1 day', '1 day', 1]);
await en(ADM, creer, ['2026-11-passe', 'Passé', '-10 days', '-1 day', 1]);
await en(ADM, creer, ['2026-12-futur', 'Futur', '1 day', '10 days', 1]);
await en(ADM, creer, ['2026-11-vide', 'Vide', '-1 day', '1 day', 1]);
await en(ADM, creer, ['2026-11-sacs', 'Sacs', '-1 day', '1 day', 3]);
await en(ADM, creer, ['2026-11-oublie', 'Oublié', '-1 day', '1 day', 1]);
await en(ADM, creer, ['2026-11-cascade', 'Cascade', '-1 day', '1 day', 2]);
await echoue(ADM, creer, ['2026-11-dates', 'Dates', '1 day', '-1 day', 1], /check constraint/);
await echoue(ADM, creer, ['Mauvais Id', 'X', '-1 day', '1 day', 1], /check constraint/);
assert.equal(await n(null, `select count(*)::int n from concours`), 7, 'anonyme : lit les concours');
assert.equal((await en(A, `update concours set titre = 'Piraté'`)).affectedRows || 0, 0, 'joueur : aucune modification');
assert.equal((await en(B, `delete from concours`)).affectedRows || 0, 0, 'joueur : aucune suppression');
await echoue(ADM, `update concours set tire_le = now() where id = '2026-11-vide'`, [], /permission denied/);
await echoue(ADM, `update concours set graine = '2026-12-01:1-2-3-4-5:1-2' where id = '2026-11-vide'`, [], /permission denied/);
ok('concours : lisibles par tous ; création et modification par l’admin seulement ; dates et identifiant contrôlés ; tirage et graine non modifiables à la main');

// I1 / M2 : concours figés une fois commencés
await echoue(ADM, `update concours set date_debut = date_debut - interval '1 day' where id = '2026-11-raquette'`, [], /CONCOURS_FIGE/);
await echoue(ADM, `update concours set nb_gagnants = 2 where id = '2026-11-raquette'`, [], /CONCOURS_FIGE/);
await echoue(ADM, `update concours set date_fin = date_fin - interval '1 hour' where id = '2026-11-raquette'`, [], /CONCOURS_FIGE/);
assert.equal((await en(ADM, `update concours set date_fin = date_fin + interval '1 hour', titre = 'Raquette pro' where id = '2026-11-raquette'`)).affectedRows, 1, 'prolonger pendant le jeu : permis');
await echoue(ADM, `update concours set date_fin = date_fin + interval '1 day' where id = '2026-11-passe'`, [], /CONCOURS_FIGE/);
assert.equal((await en(ADM, `update concours set date_debut = date_debut + interval '1 day', date_fin = date_fin - interval '1 day', nb_gagnants = 2 where id = '2026-12-futur'`)).affectedRows, 1, 'avant le début : tout se règle');
await echoue(ADM, `delete from concours where id = '2026-11-raquette'`, [], /CONCOURS_FIGE/);
assert.equal((await en(ADM, `delete from concours where id = '2026-12-futur'`)).affectedRows, 1, 'avant le début : suppression permise');
await en(ADM, creer, ['2026-12-futur', 'Futur', '1 day', '10 days', 1]);
ok('concours commencé : date de début, nombre de lots et raccourcissement refusés (CONCOURS_FIGE), prolongation permise ; fin passée : date de fin figée ; suppression refusée une fois commencé, permise avant');

// Participations
const participer = `insert into concours_participations (concours_id, atteste_majeur_ou_accord, accepte_reglement) values ($1, $2, $3)`;
await echoue(A, participer, ['2026-11-passe', true, true], /CONCOURS_TERMINE/);
await echoue(A, participer, ['2026-12-futur', true, true], /CONCOURS_PAS_COMMENCE/);
await echoue(A, participer, ['2026-11-inconnu', true, true], /CONCOURS_INCONNU/);
await echoue(A, participer, ['2026-11-raquette', false, true], /CASES_NON_COCHEES/);
await echoue(A, participer, ['2026-11-raquette', true, false], /CASES_NON_COCHEES/);
await echoue(A, `insert into concours_participations (concours_id, atteste_majeur_ou_accord, accepte_reglement) values ('2026-11-raquette', true, null)`, [], /CASES_NON_COCHEES|not-null/);
await echoue(null, participer, ['2026-11-raquette', true, true], /permission denied/);
await echoue(ADM, participer, ['2026-11-raquette', true, true], /ORGANISATEUR_EXCLU/);
await echoue(A, `insert into concours_participations (concours_id, user_id, atteste_majeur_ou_accord, accepte_reglement) values ('2026-11-raquette', $1, true, true)`, [B], /row-level security/);
await echoue(A, `insert into concours_participations (concours_id, atteste_majeur_ou_accord, accepte_reglement, cree_le) values ('2026-11-raquette', true, true, now() - interval '1 year')`, [], /permission denied/);
await en(A, participer, ['2026-11-raquette', true, true]);
await echoue(A, participer, ['2026-11-raquette', true, true], /duplicate key/);
await en(B, `insert into concours_participations (concours_id, user_id, atteste_majeur_ou_accord, accepte_reglement) values ('2026-11-raquette', $1, true, true)`, [B]);
assert.equal(await n(A, `select count(*)::int n from concours_participations`), 1, 'A ne voit que sa ligne');
assert.equal((await en(A, `select user_id::text u from concours_participations`)).rows[0].u, A);
assert.equal(await n(B, `select count(*)::int n from concours_participations where user_id = $1`, [A]), 0, 'B ne voit pas la ligne de A');
assert.equal(await n(ADM, `select count(*)::int n from concours_participations`), 2, 'l’admin voit tout');
await echoue(null, `select count(*) from concours_participations`, [], /permission denied/);
await echoue(A, `update concours_participations set accepte_reglement = true`, [], /permission denied/);
assert.equal((await en(A, `delete from concours_participations where user_id = $1`, [B])).affectedRows || 0, 0, 'A ne retire pas B');
assert.equal((await en(B, `delete from concours_participations`)).affectedRows, 1, 'B se retire pendant le concours');
assert.equal(await n(null, `select concours_nb_participants('2026-11-raquette') n`), 1);
await en(B, participer, ['2026-11-raquette', true, true]);
for (const qui of [A, B, C]) await en(qui, participer, ['2026-11-sacs', true, true]);
for (const qui of [A, B]) await en(qui, participer, ['2026-11-cascade', true, true]);
await en(A, participer, ['2026-11-oublie', true, true]);
assert.equal(await n(null, `select concours_nb_participants('2026-11-raquette') n`), 2, 'compteur anonyme');
assert.equal(await n(A, `select concours_nb_participants('2026-11-raquette') n`), 2, 'compteur connecté');
assert.equal(await n(null, `select concours_nb_participants('2026-11-inconnu') n`), 0);
ok('participations : hors période, concours inconnu, cases non cochées, sans compte, organisateur (ORGANISATEUR_EXCLU), pour un autre, date imposée et doublon refusés ; chacun ne voit que sa ligne (admin : tout) ; aucune modification ; retrait de sa seule ligne ; compteur juste pour tous');

// I2 : exclusion pour fraude
const exclure = `select admin_exclure_participation($1, $2, $3) n`;
await echoue(A, exclure, ['2026-11-sacs', C, 'Comptes multiples'], /NON_ADMIN/);
await echoue(null, exclure, ['2026-11-sacs', C, 'Comptes multiples'], /permission denied/);
await echoue(ADM, exclure, ['2026-11-sacs', C, 'x'], /MOTIF_INCORRECT/);
await echoue(ADM, exclure, ['2026-11-vide', C, 'Comptes multiples'], /PARTICIPATION_INCONNUE/);
assert.equal(await n(ADM, exclure, ['2026-11-sacs', C, 'Comptes multiples']), 1);
await echoue(C, participer, ['2026-11-sacs', true, true], /PARTICIPATION_EXCLUE/);
assert.deepEqual((await en(C, `select concours_id, motif from concours_exclusions`)).rows, [{ concours_id: '2026-11-sacs', motif: 'Comptes multiples' }], 'l’exclu voit sa ligne et le motif');
assert.equal(await n(A, `select count(*)::int n from concours_exclusions`), 0, 'les autres non');
assert.equal(await n(ADM, `select count(*)::int n from concours_exclusions`), 1, 'l’admin oui');
await echoue(null, `select * from concours_exclusions`, [], /permission denied/);
await echoue(ADM, `insert into concours_exclusions (concours_id, user_id, motif) values ('2026-11-sacs', $1, 'Test manuel')`, [A], /permission denied/);
await echoue(C, `delete from concours_exclusions`, [], /permission denied/);
assert.deepEqual((await en(null, `select participants, exclusions from concours_resume('2026-11-sacs')`)).rows, [{ participants: 2, exclusions: 1 }], 'résumé public');
assert.equal((await en(null, `select * from concours_resume('2026-11-inconnu')`)).rows.length, 0);
ok('exclusion pour fraude : admin seulement, motif obligatoire, participation supprimée et tracée, réinscription refusée (PARTICIPATION_EXCLUE), trace lisible par l’exclu et l’admin seulement, non modifiable ; résumé public (participants, exclusions)');

// Fin des concours (temps simulé par le SQL Editor, auth.uid() vide)
await su(`update concours set date_debut = now() - interval '10 days', date_fin = now() - interval '3 days' where id in ('2026-11-raquette', '2026-11-vide', '2026-11-sacs', '2026-11-cascade')`);
const jour = (await su(`select to_char((now() at time zone 'Europe/Paris')::date, 'YYYY-MM-DD') j, to_char(((now() - interval '3 days') at time zone 'Europe/Paris')::date, 'YYYY-MM-DD') f, to_char((now() at time zone 'Europe/Paris')::date + 1, 'YYYY-MM-DD') d`)).rows[0];
const GRAINE = jour.j + ':3-14-25-36-47:2-9';
await echoue(B, participer, ['2026-11-vide', true, true], /CONCOURS_TERMINE/);
assert.equal((await en(B, `delete from concours_participations where concours_id = '2026-11-raquette'`)).affectedRows || 0, 0, 'plus de retrait après la fin');
assert.equal((await en(ADM, `delete from concours_participations where concours_id = '2026-11-raquette'`)).affectedRows || 0, 0, 'admin : plus de suppression directe après la fin');
await echoue(ADM, `update concours set date_fin = date_fin + interval '1 day' where id = '2026-11-raquette'`, [], /CONCOURS_FIGE/);

// Annulation (concours-18 à 24) : « Ton pack Nox offert » annulé pour un problème technique, rien n'est supprimé
const NOX = '2026-11-pack-nox';
assert.equal((await su(`select count(*)::int n from concours where annule_le is not null`)).rows[0].n, 0, 'concours-25 sans la ligne : rien d’annulé');
await su(`insert into concours (id, titre, date_debut, date_fin, nb_gagnants) values ($1, 'Ton pack Nox offert', now() - interval '3 days', now() + interval '26 days', 1)`, [NOX]);
await en(A, participer, [NOX, true, true]);
await en(B, participer, [NOX, true, true]);
await su(`insert into concours_exclusions (concours_id, user_id, motif) values ($1, $2, 'Trace de test')`, [NOX, ADM]);
const lignes = async () => (await su(`select (select count(*) from concours)::int c, (select count(*) from concours_participations)::int p, (select count(*) from concours_exclusions)::int e, (select count(*) from concours_gagnants)::int g`)).rows[0];
const avant = await lignes();
const annuler = lire('supabase/migrations/2026-11-04-concours-25-annuler-pack-nox.sql');
await db.exec(annuler);
const nox = (await su(`select annule_le, motif_annulation from concours where id = $1`, [NOX])).rows[0];
assert.ok(nox.annule_le instanceof Date && nox.motif_annulation === 'Problème technique', 'pack Nox annulé, motif « Problème technique »');
await db.exec(annuler);
assert.equal((await su(`select annule_le from concours where id = $1`, [NOX])).rows[0].annule_le.getTime(), nox.annule_le.getTime(), 'relancer concours-25 garde la date d’annulation');
for (let fois = 0; fois < 2; fois++) for (const m of annulation) await db.exec(lire('supabase/migrations/' + m));
assert.deepEqual(await lignes(), avant, 'annulation (et migrations 18 à 25 relancées) : aucune ligne supprimée ni ajoutée');
assert.equal((await su(`select count(*)::int n from concours where annule_le is not null`)).rows[0].n, 1, 'seul le pack Nox est annulé');
assert.deepEqual((await en(null, `select motif_annulation, annule_le is not null a from concours where id = $1`, [NOX])).rows, [{ motif_annulation: 'Problème technique', a: true }], 'annulation lisible sans compte');
await assert.rejects(su(`update concours set annule_le = now() where id = '2026-11-oublie'`), /check constraint/, 'annulation sans motif refusée');
await assert.rejects(su(`update concours set annule_le = now(), motif_annulation = 'x' where id = '2026-11-oublie'`), /check constraint/, 'motif trop court refusé');
await echoue(ADM, `update concours set annule_le = null, motif_annulation = null where id = $1`, [NOX], /permission denied/);
await echoue(ADM, `update concours set annule_le = now(), motif_annulation = 'Depuis le site' where id = '2026-11-oublie'`, [], /permission denied/);
await echoue(ADM, `update concours set titre = 'Autre' where id = $1`, [NOX], /CONCOURS_FIGE/);
await echoue(ADM, `update concours set date_fin = date_fin + interval '1 day' where id = $1`, [NOX], /CONCOURS_FIGE/);
await echoue(ADM, `delete from concours where id = $1`, [NOX], /CONCOURS_FIGE/);
await echoue(C, participer, [NOX, true, true], /CONCOURS_ANNULE/);
await su(`alter table concours_participations disable trigger concours_participations_avant_insertion`);
try { await echoue(C, participer, [NOX, true, true], /row-level security/); } finally { await su(`alter table concours_participations enable trigger concours_participations_avant_insertion`); }
assert.equal(await n(null, `select concours_nb_participants($1) n`, [NOX]), 2, 'compteur inchangé');
assert.equal((await en(A, `delete from concours_participations where user_id = $1 and concours_id = $2`, [B, NOX])).affectedRows || 0, 0, 'A ne retire pas B');
assert.equal((await en(ADM, `delete from concours_participations where concours_id = $1`, [NOX])).affectedRows || 0, 0, 'admin : aucune suppression directe d’un concours annulé, même avant la fin');
await echoue(ADM, exclure, [NOX, A, 'Comptes multiples'], /CONCOURS_ANNULE/);
assert.equal(await n(null, `select concours_nb_participants($1) n`, [NOX]), 2, 'exclusion refusée : rien supprimé');
assert.equal((await en(B, `delete from concours_participations where concours_id = $1`, [NOX])).affectedRows, 1, 'B retire sa participation au concours annulé');
await echoue(B, participer, [NOX, true, true], /CONCOURS_ANNULE/);
await su(`update concours set date_debut = now() - interval '10 days', date_fin = now() - interval '3 days' where id = $1`, [NOX]);
assert.equal((await en(ADM, `delete from concours_participations where concours_id = $1`, [NOX])).affectedRows || 0, 0, 'admin : aucune suppression directe après la fin, même annulé');
await echoue(ADM, `select u::text from admin_tirer_au_sort($1, $2) u`, [NOX, GRAINE], /CONCOURS_ANNULE/);
await db.exec(`begin; select set_config('request.jwt.claims', json_build_object('sub', (select id from auth.users where email = 'admin@exemple.fr'))::text, true);`);
await assert.rejects(db.query(`select public.admin_tirer_au_sort($1, $2)`, [NOX, GRAINE]), /CONCOURS_ANNULE/, 'SQL Editor avec préambule : tirage refusé aussi');
await db.exec(`rollback;`);
await echoue(ADM, `select admin_designer_remplacant($1)::text u`, [NOX], /CONCOURS_ANNULE/);
assert.equal((await su(`select tire_le from concours where id = $1`, [NOX])).rows[0].tire_le, null, 'pack Nox jamais tiré');
assert.equal(await n(A, `select count(*)::int n from concours_participations where concours_id = $1`, [NOX]), 1, 'A voit toujours sa participation conservée');
assert.deepEqual(await lignes(), { ...avant, p: avant.p - 1 }, 'seul le retrait volontaire de B a enlevé une ligne');
assert.equal((await en(A, `delete from concours_participations where concours_id = $1`, [NOX])).affectedRows, 1, 'A peut encore se retirer après la fin du concours annulé');
assert.deepEqual(await lignes(), { ...avant, p: avant.p - 2 }, 'seuls les deux retraits volontaires ont enlevé des lignes');
await su(`delete from concours_exclusions where concours_id = $1`, [NOX]);
ok('annulation du pack Nox (concours-25, relançable, date conservée) : rien de supprimé ; lisible par tous, non modifiable ni annulable depuis le site, motif obligatoire ; participer refusé (CONCOURS_ANNULE, et RLS seule sans déclencheur) ; tirage (site et SQL Editor), remplaçant et exclusion refusés (CONCOURS_ANNULE) ; chacun retire sa seule participation, même après la fin ; l’admin ne supprime aucune participation d’un concours annulé, ni avant ni après la fin');

// I3 : tirage et graine EuroMillions
const tirer = `select u::text from admin_tirer_au_sort($1, $2) u`;
await echoue(A, tirer, ['2026-11-raquette', GRAINE], /NON_ADMIN/);
await echoue(null, tirer, ['2026-11-raquette', GRAINE], /permission denied/);
await echoue(ADM, tirer, ['2026-11-oublie', GRAINE], /CONCOURS_NON_TERMINE/);
await echoue(ADM, tirer, ['2026-11-inconnu', GRAINE], /CONCOURS_INCONNU/);
for (const g of [null, 'mauvaise', jour.j + ':3-14-25-36-51:2-9', jour.j + ':3-14-25-36-47:2-13', jour.j + ':03-14-25-36-47:2-9', jour.j + ':0-14-25-36-47:2-9', jour.j + ':3-14-25-36:2-9', jour.j + ':3-14-25-36-47:2', jour.j + ':3-3-25-36-47:2-9', jour.j + ':3-14-25-36-47:9-9', '2026-02-30:3-14-25-36-47:2-9', ' ' + GRAINE])
  await echoue(ADM, tirer, ['2026-11-raquette', g], /GRAINE_INCORRECTE/);
for (const d of [jour.f, jour.d]) await echoue(ADM, tirer, ['2026-11-raquette', d + ':3-14-25-36-47:2-9'], /GRAINE_DATE_INCORRECTE/);
const gagnants = (await en(ADM, tirer, ['2026-11-raquette', GRAINE])).rows.map(r => r.u);
const classement = [A, B].map(u => ({ u, e: sha(GRAINE + ':' + u) })).sort((x, y) => binaire(x.e, y.e));
assert.deepEqual(gagnants, [classement[0].u], 'gagnant = plus petite empreinte sha256("graine:user_id"), recalculée hors base');
const W = classement[0].u, L = classement[1].u;
await echoue(ADM, tirer, ['2026-11-raquette', GRAINE], /CONCOURS_DEJA_TIRE/);
const cr = (await su(`select graine, nb_participants, nb_exclusions, tire_le is not null t from concours where id = '2026-11-raquette'`)).rows[0];
assert.deepEqual([cr.graine, cr.nb_participants, cr.nb_exclusions, cr.t], [GRAINE, 2, 0, true]);
await echoue(ADM, `update concours set titre = 'Autre' where id = '2026-11-raquette'`, [], /CONCOURS_FIGE/);
await echoue(ADM, `delete from concours where id = '2026-11-raquette'`, [], /CONCOURS_FIGE/);
assert.equal((await en(ADM, tirer, ['2026-11-vide', GRAINE])).rows.length, 0, 'aucun participant : aucun gagnant');
assert.equal((await su(`select nb_participants n from concours where id = '2026-11-vide' and tire_le is not null`)).rows[0].n, 0);
// Depuis le SQL Editor : préambule set_config (request.jwt.claims) dans la même exécution
await db.exec(`begin; select set_config('request.jwt.claims', json_build_object('sub', (select id from auth.users where email = 'admin@exemple.fr'))::text, true); create temp table t_sacs as select u from public.admin_tirer_au_sort('2026-11-sacs', '${GRAINE}') u; commit;`);
assert.equal((await su(`select count(*)::int n from t_sacs`)).rows[0].n, 2, '3 lots, 2 participants après exclusion : les 2 gagnent');
await assert.rejects(su(`select public.admin_tirer_au_sort('2026-11-cascade', '${GRAINE}')`), /NON_ADMIN/, 'SQL Editor sans préambule : refusé');
await echoue(ADM, exclure, ['2026-11-sacs', A, 'Trop tard'], /CONCOURS_DEJA_TIRE/);
assert.deepEqual((await en(null, `select participants, exclusions from concours_resume('2026-11-sacs')`)).rows, [{ participants: 2, exclusions: 1 }], 'résumé figé au tirage');
ok('tirage : refusé à un joueur, sans compte, avant la fin, avec une graine absente, mal formée (hors bornes, zéro devant, doublon, date impossible) ou mal datée (pas après le jour de fin, ou future) ; accepté à l’admin (site ou SQL Editor avec préambule) ; gagnant recalculé à l’identique hors base ; non rejouable ; concours tiré figé ; exclusions figées au tirage');

// Gagnants
assert.equal(await n(W, `select count(*)::int n from concours_gagnants where concours_id = '2026-11-raquette'`), 1, 'le gagnant voit sa ligne');
assert.equal(await n(L, `select count(*)::int n from concours_gagnants where concours_id = '2026-11-raquette'`), 0, 'l’autre non');
await echoue(null, `select * from concours_gagnants`, [], /permission denied/);
await echoue(L, `insert into concours_gagnants (concours_id, rang, user_id, empreinte) values ('2026-11-raquette', 2, $1, $2)`, [L, sha('x')], /permission denied/);
await echoue(W, `update concours_gagnants set rang = 5`, [], /permission denied/);
assert.equal((await en(L, `update concours_gagnants set affiche_publiquement = true where concours_id = '2026-11-raquette'`)).affectedRows || 0, 0, 'l’autre ne change pas la ligne du gagnant');
assert.equal((await en(ADM, `update concours_gagnants set affiche_publiquement = true where concours_id = '2026-11-raquette'`)).affectedRows || 0, 0, 'l’admin ne donne pas l’accord à la place du gagnant');
await echoue(W, `delete from concours_gagnants where concours_id = '2026-11-raquette'`, [], /permission denied/);
let pub = (await en(null, `select rang, pseudo, empreinte from concours_gagnants_publics('2026-11-raquette')`)).rows;
assert.deepEqual(pub, [{ rang: 1, pseudo: null, empreinte: classement[0].e }], 'public : pseudo masqué sans accord, empreinte visible');
assert.equal((await en(W, `update concours_gagnants set affiche_publiquement = true where concours_id = '2026-11-raquette'`)).affectedRows, 1);
pub = (await en(null, `select * from concours_gagnants_publics('2026-11-raquette')`)).rows;
assert.equal(pub[0].pseudo, W === A ? 'Alpha' : 'Bravo', 'pseudo du profil affiché après accord');
assert.ok(!Object.keys(pub[0]).includes('user_id'));
ok('gagnants : le gagnant voit sa ligne, l’autre et les anonymes non ; seul le gagnant peut accepter l’affichage (ni l’autre, ni l’admin) ; liste publique sans user_id, pseudo lu dans le profil seulement après accord');

// M3 : remplaçant
const remplacer = `select admin_designer_remplacant($1)::text u`;
await echoue(A, remplacer, ['2026-11-raquette'], /NON_ADMIN/);
await echoue(null, remplacer, ['2026-11-raquette'], /permission denied/);
await echoue(ADM, remplacer, ['2026-11-cascade'], /CONCOURS_NON_TIRE/);
await echoue(ADM, remplacer, ['2026-11-inconnu'], /CONCOURS_INCONNU/);
assert.equal((await en(ADM, remplacer, ['2026-11-raquette'])).rows[0].u, L, 'remplaçant = suivant du même classement');
assert.deepEqual((await en(L, `select rang, empreinte from concours_gagnants where concours_id = '2026-11-raquette'`)).rows, [{ rang: 2, empreinte: classement[1].e }], 'rang 2, même empreinte ; le remplaçant voit sa ligne');
await echoue(ADM, remplacer, ['2026-11-raquette'], /AUCUN_REMPLACANT/);
await echoue(ADM, remplacer, ['2026-11-sacs'], /AUCUN_REMPLACANT/);
ok('remplaçant : admin seulement, concours tiré, participant suivant du même classement au rang suivant, aucun quand le classement est épuisé');

// Contact
await echoue(A, `select * from admin_contact_gagnants('2026-11-raquette')`, [], /NON_ADMIN/);
await echoue(B, `select * from admin_contact_gagnants('2026-11-raquette')`, [], /NON_ADMIN/);
await echoue(null, `select * from admin_contact_gagnants('2026-11-raquette')`, [], /permission denied/);
const contact = (await en(ADM, `select rang, user_id::text, email, pseudo from admin_contact_gagnants('2026-11-raquette')`)).rows;
const fiche = u => ({ email: u === A ? 'a@exemple.fr' : 'b@exemple.fr', pseudo: u === A ? 'Alpha' : 'Bravo' });
assert.deepEqual(contact, [{ rang: 1, user_id: W, ...fiche(W) }, { rang: 2, user_id: L, ...fiche(L) }]);
const colonnes = (await su(`select column_name from information_schema.columns where table_schema = 'public' and table_name like 'concours%'`)).rows;
assert.ok(!colonnes.some(r => /mail|pseudo/i.test(r.column_name)), 'ni e-mail ni pseudo dans les tables du concours');
ok('contact des gagnants et remplaçants : admin seulement (rang, user_id, e-mail et pseudo lus à l’appel) ; aucune colonne e-mail ou pseudo dans les tables du concours');

// Purge : 60 jours après le tirage, 90 jours après la fin sans tirage
await assert.rejects(en(ADM, `select purger_concours()`), /permission denied/, 'purge non appelable depuis le site');
assert.equal((await su(`select purger_concours() n`)).rows[0].n, 0, 'rien avant les délais');
await su(`update concours set tire_le = now() - interval '61 days' where id = '2026-11-raquette'`);
await su(`update concours set tire_le = now() - interval '61 days' where id = '2026-11-sacs'`);
await su(`update concours set date_debut = now() - interval '100 days', date_fin = now() - interval '89 days' where id = '2026-11-oublie'`);
assert.equal((await su(`select purger_concours() n`)).rows[0].n, 9, 'raquette : 2 participations + 2 gagnants ; sacs : 2 participations + 1 exclusion + 2 gagnants ; oublié (89 jours) : rien');
const reste = (await su(`select c.id as concours_id, (select count(*) from concours_participations p where p.concours_id = c.id)::int p, (select count(*) from concours_exclusions e where e.concours_id = c.id)::int e, (select count(*) from concours_gagnants g where g.concours_id = c.id)::int g from concours c where c.id in ('2026-11-raquette', '2026-11-sacs', '2026-11-oublie', '2026-11-cascade') order by c.id`)).rows;
assert.deepEqual(reste, [{ concours_id: '2026-11-cascade', p: 2, e: 0, g: 0 }, { concours_id: '2026-11-oublie', p: 1, e: 0, g: 0 }, { concours_id: '2026-11-raquette', p: 0, e: 0, g: 0 }, { concours_id: '2026-11-sacs', p: 0, e: 0, g: 0 }]);
await su(`update concours set date_fin = now() - interval '91 days' where id = '2026-11-oublie'`);
assert.equal((await su(`select purger_concours() n`)).rows[0].n, 1, 'concours jamais tiré : participations purgées 90 jours après la fin');
assert.equal(await n(null, `select concours_nb_participants('2026-11-raquette') n`), 2, 'compteur figé après la purge');
assert.deepEqual((await en(null, `select participants, exclusions from concours_resume('2026-11-sacs')`)).rows, [{ participants: 2, exclusions: 1 }], 'résumé figé après la purge');
for (let fois = 0; fois < 2; fois++) await db.exec(lire('supabase/migrations/2026-11-01-concours-17-planification.sql'));
const jobs = (await su(`select schedule, command from cron.job where jobname = 'purger-concours'`)).rows;
assert.deepEqual(jobs, [{ schedule: '45 3 * * *', command: 'select public.purger_concours()' }], 'un seul job purger-concours');
ok('purge : participations, exclusions et gagnants supprimés 60 jours après le tirage ; participations d’un concours jamais tiré 90 jours après la fin (pas avant) ; compteur et résumé figés ; non appelable par le site ; job pg_cron unique (3 h 45 UTC)');

// Suppression du compte : vraie delete_my_account() de schema.sql, puis cascade
await en(ADM, `select u from admin_tirer_au_sort('2026-11-cascade', '${GRAINE}') u`);
await su(`insert into concours_exclusions (concours_id, user_id, motif) values ('2026-11-vide', '${A}', 'Trace de test')`);
await en(A, `select delete_my_account()`);
const apres = (await su(`select (select count(*) from concours_participations where user_id = '${A}')::int p, (select count(*) from concours_gagnants where user_id = '${A}')::int g, (select count(*) from concours_exclusions where user_id = '${A}')::int e, (select count(*) from concours_gagnants where user_id = '${B}')::int gb`)).rows[0];
assert.deepEqual(apres, { p: 0, g: 0, e: 0, gb: 1 }, 'participations, gagnant et exclusions de A supprimés, B intact');
ok('suppression du compte (delete_my_account de schema.sql, inchangée) : participations, lignes de gagnant et exclusions parties en cascade, l’autre joueur intact');
console.log(nb + ' vérifications réussies.');
