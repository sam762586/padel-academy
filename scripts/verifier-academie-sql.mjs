/* Vérification des migrations PRÉPARÉES de Mon académie (supabase/migrations/2026-10-27-academie-01 à 03), sans
   toucher à la base en ligne : Postgres en mémoire (pglite), avec ce que fournit Supabase recréé (auth.users, auth.uid(),
   rôles authenticated et anon, droits par défaut). Contrôles : migrations rejouables ; chacun ne voit, n'ajoute et ne
   supprime que ses lignes ; aucune modification possible ; anonymes sans accès ; niveaux 1 à 10 ; séances cohérentes
   (score, total, réponses, identifiant, taille) ; limite de 300 lignes ; suppression du compte en cascade ; une séance
   produite par le quiz du site s'enregistre telle quelle.
   Outil : @electric-sql/pglite (hors site, installé sans l'ajouter au package.json :
   cd ../padel-academy/scripts && npm install --no-save @electric-sql/pglite@0.2.12).
   Lancer depuis la racine du site : NODE_PATH=../padel-academy/scripts/node_modules node scripts/verifier-academie-sql.mjs */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
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

const db = new PGlite();
const A = '11111111-1111-4111-8111-111111111111', B = '22222222-2222-4222-8222-222222222222';
// Ce que Supabase fournit
await db.exec(`
 create schema auth;
 create table auth.users (id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
 create role authenticated; create role anon;
 grant usage on schema public, auth to authenticated, anon;
 grant execute on function auth.uid() to authenticated, anon;
 alter default privileges in schema public grant all on tables to authenticated, anon;
 insert into auth.users values ('${A}'), ('${B}');`);
const migrations = ['2026-10-26-espace-02-fonction-limite-lignes.sql', '2026-10-27-academie-01-table-niveaux.sql', '2026-10-27-academie-02-table-quiz.sql', '2026-10-27-academie-03-triggers-limites.sql'];
for (let fois = 0; fois < 2; fois++) for (const m of migrations) await db.exec(lire('supabase/migrations/' + m));
for (const m of migrations.slice(1)) assert.match(lire('supabase/migrations/' + m), /APPLIQUÉ EN PRODUCTION LE 29\/10\/2026/, m + ' : date d’application notée');
ok('migrations academie-01 à 03 rejouables (deux passages sans erreur), date d’application en production notée');

// Exécute une requête en tant que joueur connecté (ou anonyme)
async function en(qui, sql, params = []) {
  await db.exec(qui ? `set role authenticated; select set_config('request.jwt.claim.sub', '${qui}', false);` : `set role anon; select set_config('request.jwt.claim.sub', '', false);`);
  try { return await db.query(sql, params); } finally { await db.exec('reset role;'); }
}
const echoue = async (qui, sql, params, motif) => { await assert.rejects(en(qui, sql, params), motif); };

// Niveaux
await en(A, `insert into academie_niveaux (user_id, niveau, choisi_le) values ($1, 5, now())`, [A]);
await echoue(A, `insert into academie_niveaux (user_id, niveau, choisi_le) values ($1, 5, now())`, [B], /row-level security/);
for (const n of [0, 11]) await echoue(A, `insert into academie_niveaux (user_id, niveau, choisi_le) values ($1, $2, now())`, [A, n], /check constraint/);
for (const n of [1, 10]) await en(A, `insert into academie_niveaux (user_id, niveau, choisi_le) values ($1, $2::smallint, now() + make_interval(mins => $2::int))`, [A, n]);
assert.equal((await en(A, `select count(*)::int n from academie_niveaux`)).rows[0].n, 3);
assert.equal((await en(B, `select count(*)::int n from academie_niveaux`)).rows[0].n, 0, 'B ne voit pas les lignes de A');
const maj = await en(A, `update academie_niveaux set niveau = 9`);
assert.equal(maj.affectedRows || 0, 0, 'aucune modification possible');
assert.equal((await db.query(`select count(*)::int n from academie_niveaux where niveau = 9`)).rows[0].n, 0);
assert.equal((await en(B, `delete from academie_niveaux`)).affectedRows || 0, 0, 'B ne supprime pas les lignes de A');
assert.equal((await en(null, `select count(*)::int n from academie_niveaux`)).rows[0].n, 0, 'anonyme : aucune ligne');
await echoue(null, `insert into academie_niveaux (user_id, niveau, choisi_le) values ($1, 5, now())`, [A], /row-level security/);
ok('academie_niveaux : chacun ses lignes, niveaux 1 à 10 seulement (0 et 11 refusés), aucune modification, anonyme sans accès');

// Séance réelle produite par le quiz du site
const ctx = { window: {}, document: { getElementById: () => null }, localStorage: { getItem: () => null } }; vm.createContext(ctx);
vm.runInContext(lire('assets/js/academie-questions.js') + ';' + lire('assets/js/academie-quiz.js') + ';this.Q=ACADEMIE_QUESTIONS;', ctx);
const Aq = ctx.window.PA_ACADEMIE_QUIZ, Q = ctx.Q;
let g = 3; const alea = () => (g = (g * 16807) % 2147483647) / 2147483647;
let s = Aq.nouvelle(Q, 5, [], alea);
while (s.reponses.length < s.questions.length) { const q = Q.find(x => x.id === s.questions[s.reponses.length].id); s = Aq.repondre(Q, s, alea() < .7 ? q.bonne : (q.bonne + 1) % q.choix.length, [], alea); }
const ligne = [A, s.id, s.niveau, s.debut, s.fin, s.reponses.filter(r => r.juste).length, s.reponses.length, JSON.stringify(s.reponses)];
const inserer = `insert into academie_quiz (user_id, cle, niveau, debut, fin, score, total, reponses) values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)`;
await en(A, inserer, ligne);
await echoue(A, inserer, ligne, /duplicate key/);
const r = (await en(A, `select cle, score, total, jsonb_array_length(reponses)::int n from academie_quiz`)).rows[0];
assert.deepEqual([r.cle, r.score, r.total, r.n], [s.id, ligne[5], ligne[6], ligne[6]]);
// Séances incohérentes refusées
const variante = (i, v) => { const l = ligne.slice(); l[1] = 's-mjx0abcd-' + (i + 1); l[i] = v; return l; };
await echoue(A, inserer, variante(5, 11), /check constraint/);                          // score > total
await echoue(A, inserer, variante(7, '{"a":1}'), /check constraint/);                   // réponses : pas un tableau
await echoue(A, inserer, variante(7, '[]'), /check constraint/);                        // réponses ≠ total
await echoue(A, inserer, [...variante(0, A).slice(0, 1), 'pas-une-cle', ...ligne.slice(2)], /check constraint/);
await echoue(A, inserer, variante(7, JSON.stringify(Array.from({ length: 10 }, () => 'x'.repeat(1000)))), /check constraint/); // trop gros
await echoue(A, inserer, variante(0, B), /row-level security/);
assert.equal((await en(B, `select count(*)::int n from academie_quiz`)).rows[0].n, 0);
assert.equal((await en(A, `update academie_quiz set score = 0`)).affectedRows || 0, 0, 'séance non modifiable');
ok('academie_quiz : une séance réelle du site s’enregistre telle quelle ; doublon, score > total, réponses incohérentes ou trop grosses, mauvais identifiant et lignes d’un autre joueur refusés');

// Limite de 300 lignes et cascade
await db.exec(`insert into academie_niveaux (user_id, niveau, choisi_le) select '${B}', 1 + (i % 10), now() + (i || ' seconds')::interval from generate_series(1, 300) i`);
await echoue(B, `insert into academie_niveaux (user_id, niveau, choisi_le) values ($1, 3, now() + interval '1 day')`, [B], /LIMITE_LIGNES/);
await db.exec(`delete from auth.users where id = '${A}'`);
assert.equal((await db.query(`select (select count(*) from academie_niveaux where user_id = '${A}')::int + (select count(*) from academie_quiz where user_id = '${A}')::int n`)).rows[0].n, 0, 'cascade');
ok('300 lignes au plus par joueur (LIMITE_LIGNES) ; compte supprimé : niveaux et séances supprimés en cascade');
console.log(nb + ' vérifications réussies.');
