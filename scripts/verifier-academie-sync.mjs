/* Synchronisation de Mon académie avec le compte (assets/js/academie-sync.js), sans toucher à la base en ligne :
   le navigateur (Edge) parle à un Supabase simulé dont les données vivent dans un vrai Postgres en mémoire (pglite) avec
   les migrations academie-01 à 03 (RLS, contraintes, limites) : chaque requête est jouée en tant que le joueur connecté.
   Contrôles :
     1. fusion (sous Node) : union des niveaux par date, niveau actuel = le plus récent, union des séances par identifiant ;
     2. "academie" absent de activees : Mon académie ne charge pas Supabase, aucune requête ;
     3. appareil 1, joueur A : niveaux et quiz terminé envoyés, ligne de quiz conforme aux contraintes SQL ;
     4. appareil 2 : choix fait sans compte puis connexion de A → envoyé dans le compte de A, quiz et niveaux de
        l'appareil 1 reçus, niveau actuel = le choix le plus récent ; l'appareil 1 le reçoit à son tour ;
     5. appareil 2, déconnexion puis joueur B : rien de A n'est envoyé dans le compte de B ;
     6. base indisponible : message clair, données de l'appareil intactes ;
     7. aucune erreur dans la console.
   Lancer depuis la racine du site : NODE_PATH=../padel-academy/scripts/node_modules node scripts/verifier-academie-sync.mjs */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const racine = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const lire = f => fs.readFileSync(path.join(racine, f), 'utf8');
let nb = 0; const ok = m => { nb++; console.log('OK ' + m); };
const require = createRequire(path.join(path.resolve(racine, process.env.NODE_PATH || '../padel-academy/scripts/node_modules'), 'x.js'));
const fichier = p => new URL('file:///' + p.replace(/\\/g, '/')).href;
const { PGlite } = await import(fichier(require.resolve('@electric-sql/pglite')));
const { chromium } = require('playwright');

/* ---------- 1. Fusion ---------- */
{
  const c = { window: {} }; vm.createContext(c);
  vm.runInContext(lire('assets/js/academie-sync.js'), c);
  const F = c.window.PA_ACADEMIE_SYNC_FUSION;
  const local = { version: 1, niveau: 6, historique: [{ niveau: 4, date: '2026-10-01T10:00:00.000Z' }, { niveau: 6, date: '2026-10-03T10:00:00.000Z' }] };
  const r = JSON.parse(JSON.stringify(F.niveaux(local, [{ niveau: 4, choisi_le: '2026-10-01T10:00:00+00:00' }, { niveau: 3, choisi_le: '2026-10-05T08:00:00+00:00' }])));
  assert.deepEqual(r.historique.map(h => h.niveau), [4, 6, 3], 'union par date, sans doublon');
  assert.equal(r.niveau, 3, 'niveau actuel : le plus récent');
  const s = { id: 's-abcd-1', niveau: 5, debut: '2026-10-02T10:00:00.000Z', questions: [{ id: 'q1', ordre: [0] }], reponses: [{ id: 'q1', choix: 0, juste: true, type: 'reference', theme: 'lob' }] };
  const q = JSON.parse(JSON.stringify(F.quiz({ enCours: null, seances: [s] }, [{ cle: 's-abcd-1', niveau: 5, debut: s.debut, reponses: s.reponses }, { cle: 's-abce-2', niveau: 6, debut: '2026-10-01T10:00:00.000Z', reponses: s.reponses }])));
  assert.deepEqual(q.seances.map(x => x.id), ['s-abce-2', 's-abcd-1'], 'union par séance, dans l’ordre de début');
  assert.deepEqual(JSON.parse(JSON.stringify(F.ligneQuiz(s, 'u'))), { user_id: 'u', cle: 's-abcd-1', niveau: 5, debut: s.debut, fin: null, score: 1, total: 1, reponses: s.reponses });
  ok('fusion : niveaux réunis par date (niveau actuel = le plus récent), séances réunies par identifiant, ligne de quiz');
}

/* ---------- Base : Postgres en mémoire avec les migrations ---------- */
const db = new PGlite();
const A = '11111111-1111-4111-8111-111111111111', B = '22222222-2222-4222-8222-222222222222';
await db.exec(`create schema auth; create table auth.users (id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
 create role authenticated; create role anon; grant usage on schema public, auth to authenticated, anon;
 grant execute on function auth.uid() to authenticated, anon; alter default privileges in schema public grant all on tables to authenticated, anon;
 insert into auth.users values ('${A}'), ('${B}');`);
for (const m of ['2026-10-26-espace-02-fonction-limite-lignes.sql', '2026-10-27-academie-01-table-niveaux.sql', '2026-10-27-academie-02-table-quiz.sql', '2026-10-27-academie-03-triggers-limites.sql'])
  await db.exec(lire('supabase/migrations/' + m));
const TABLES = { academie_niveaux: ['niveau', 'choisi_le'], academie_quiz: ['cle', 'niveau', 'debut', 'fin', 'score', 'total', 'reponses'] };
let file = Promise.resolve(), panne = false, requetes = 0;
const enTantQue = (uid, f) => (file = file.then(async () => {
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${uid}', false);`);
  try { return await f(); } finally { await db.exec('reset role;'); }
}));
async function api(corps) {
  requetes++;
  if (panne) throw new Error('base indisponible');
  const { table, uid, op, lignes } = corps;
  if (!TABLES[table]) throw new Error('table inconnue');
  if (op === 'select') return (await enTantQue(uid, () => db.query(`select ${TABLES[table].join(',')} from public.${table} where user_id = $1`, [uid]))).rows
    .map(r => ({ ...r, choisi_le: r.choisi_le && new Date(r.choisi_le).toISOString(), debut: r.debut && new Date(r.debut).toISOString(), fin: r.fin && new Date(r.fin).toISOString() }));
  for (const l of lignes) {
    const cols = ['user_id', ...TABLES[table]].filter(k => k in l);
    await enTantQue(uid, () => db.query(`insert into public.${table} (${cols.join(',')}) values (${cols.map((_, i) => '$' + (i + 1)).join(',')}) on conflict do nothing`,
      cols.map(k => k === 'reponses' ? JSON.stringify(l[k]) : l[k])));
  }
  return [];
}
const compter = async (table, uid) => (await db.query(`select count(*)::int n from public.${table} where user_id = $1`, [uid])).rows[0].n;

/* ---------- Supabase simulé dans le navigateur (relayé vers /db) ---------- */
const SDK = `(function(){
 const uid=()=>sessionStorage.getItem('uid');
 const appel=c=>fetch('/db',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(c)}).then(r=>r.json());
 function requete(table){
  const etat={table,op:'select'};
  const q={select(){return q;},eq(){return q;},
   upsert(lignes){etat.op='insert';etat.lignes=lignes;return q;},
   then(ok,ko){return appel({...etat,uid:uid()}).then(r=>r.erreur?{data:null,error:{message:r.erreur}}:{data:r.lignes,error:null}).then(ok,ko);}};
  return q;
 }
 window.supabase={createClient(){return {
  auth:{getSession:async()=>({data:{session:uid()?{user:{id:uid(),email:'j@t.fr'}}:null}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),signOut:async()=>({})},
  from:requete,rpc:async()=>({data:null,error:null})};}};
})();`;
const CONFIG = liste => lire('assets/js/supabase-config.js') + '\nwindow.PA_SUPABASE.activees=' + JSON.stringify(liste) + ';\n';
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webp': 'image/webp', '.woff2': 'font/woff2', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const serveur = http.createServer((req, res) => {
  if (req.url === '/db') {
    let corps = ''; req.on('data', d => corps += d);
    req.on('end', () => api(JSON.parse(corps)).then(lignes => res.end(JSON.stringify({ lignes })), e => { res.writeHead(500); res.end(JSON.stringify({ erreur: e.message })); }));
    return;
  }
  const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\//, '') || 'index.html', p = path.resolve(racine, rel);
  if (!p.startsWith(racine + path.sep)) { res.writeHead(403); res.end(); return; }
  fs.readFile(p, (e, b) => { if (e) { res.writeHead(404); res.end(); return; } res.setHeader('Content-Type', TYPES[path.extname(p)] || 'application/octet-stream'); res.end(b); });
});
await new Promise(r => serveur.listen(0, '127.0.0.1', r));
const base = 'http://127.0.0.1:' + serveur.address().port;
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const erreurs = [];
async function appareil(activees) {
  const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 390, height: 844 } });
  await ctx.route('https://**', r => r.fulfill({ body: '' }));
  await ctx.route('**/supabase-js@*/**', r => r.fulfill({ contentType: 'text/javascript', body: SDK }));
  await ctx.route('**/assets/js/supabase-config.js*', r => r.fulfill({ contentType: 'text/javascript', body: CONFIG(activees) }));
  const page = await ctx.newPage();
  page.on('pageerror', e => erreurs.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) erreurs.push(m.text()); });
  return { ctx, page };
}
const connecter = async (page, uid) => { await page.goto(base + '/index.html'); await page.evaluate(u => u ? sessionStorage.setItem('uid', u) : sessionStorage.removeItem('uid'), uid); };
const synchro = async page => { await page.waitForFunction(() => window.PA_ACADEMIE_SYNC && window.PA_ACADEMIE_SYNC.etat().ok !== null, null, { timeout: 15000 }); await page.waitForTimeout(400); };
const niveau = page => page.evaluate(() => JSON.parse(localStorage.getItem('pa-academie')).niveau);
async function quiz(page) {
  await page.click('#aq-nouveau');
  for (let i = 0; i < 10; i++) { await page.locator('.qt-reponse').first().click(); await page.click('#aq-suite'); }
}

try {
  /* 2. Non activée */
  {
    const { ctx, page } = await appareil([]);
    await connecter(page, A); await page.goto(base + '/academie.html');
    await page.click('.ac-rapide-btn[data-choisir="4"]'); await page.waitForTimeout(500);
    assert.equal(await page.evaluate(() => typeof window.supabase), 'undefined', 'Supabase non chargé');
    assert.equal(requetes, 0, 'aucune requête');
    await ctx.close();
    ok('"academie" absent de activees : Mon académie ne charge pas Supabase et n’appelle rien');
  }
  /* 3. Appareil 1, joueur A */
  const d1 = await appareil(['academie']);
  await connecter(d1.page, A); await d1.page.goto(base + '/academie.html');
  await d1.page.click('.ac-rapide-btn[data-choisir="4"]'); await d1.page.click('.ac-changer summary'); await d1.page.click('.ac-changer .ac-rapide-btn[data-choisir="6"]');
  await quiz(d1.page); await synchro(d1.page);
  assert.equal(await compter('academie_niveaux', A), 2, 'deux choix de niveau envoyés');
  assert.equal(await compter('academie_quiz', A), 1, 'quiz terminé envoyé');
  const ligne = (await db.query(`select score, total, jsonb_array_length(reponses) n from academie_quiz where user_id = $1`, [A])).rows[0];
  const local = await d1.page.evaluate(() => JSON.parse(localStorage.getItem('pa-academie-quiz')).seances[0]);
  assert.deepEqual([ligne.score, ligne.total, ligne.n], [local.reponses.filter(r => r.juste).length, 10, 10]);
  ok('appareil 1 (A) : 2 niveaux et le quiz terminé envoyés, conformes aux contraintes SQL (score, total, réponses)');
  /* 4. Appareil 2 : choix sans compte, puis connexion de A */
  const d2 = await appareil(['academie']);
  await connecter(d2.page, null); await d2.page.goto(base + '/academie.html');
  await d2.page.click('.ac-rapide-btn[data-choisir="3"]');
  assert.equal(await compter('academie_niveaux', A), 2, 'sans compte : rien envoyé');
  await connecter(d2.page, A); await d2.page.goto(base + '/academie.html'); await synchro(d2.page);
  assert.equal(await compter('academie_niveaux', A), 3, 'le choix fait sans compte rejoint le compte de A');
  assert.equal(await niveau(d2.page), 3, 'niveau actuel : le choix le plus récent');
  assert.deepEqual(await d2.page.evaluate(() => JSON.parse(localStorage.getItem('pa-academie')).historique.map(h => h.niveau)), [4, 6, 3]);
  assert.equal(await d2.page.evaluate(() => JSON.parse(localStorage.getItem('pa-academie-quiz')).seances.length), 1, 'quiz de l’appareil 1 reçu');
  assert.match(await d2.page.textContent('.ac-moi-titre'), /Ton niveau déclaré : 3/);
  assert.match(await d2.page.textContent('#ap'), /Quiz : .*niveau 6/, 'historique des quiz affiché');
  await d1.page.reload(); await synchro(d1.page);
  assert.equal(await niveau(d1.page), 3, 'l’appareil 1 reçoit le choix de l’appareil 2');
  ok('appareil 2 : choix fait sans compte envoyé à la connexion de A ; quiz et niveaux de l’appareil 1 reçus ; niveau actuel = le plus récent, des deux côtés');
  /* 5. Appareil 2 : joueur B */
  await connecter(d2.page, B); await d2.page.goto(base + '/academie.html'); await synchro(d2.page);
  assert.equal(await compter('academie_niveaux', B), 0, 'rien de A dans le compte de B');
  assert.equal(await compter('academie_quiz', B), 0);
  await d2.page.click('.ac-changer summary'); await d2.page.click('.ac-changer .ac-rapide-btn[data-choisir="8"]'); await d2.page.waitForTimeout(800);
  assert.deepEqual((await db.query(`select niveau from academie_niveaux where user_id = $1`, [B])).rows.map(r => r.niveau), [8], 'seul le choix de B part chez B');
  assert.equal(await compter('academie_niveaux', A), 3, 'compte de A inchangé');
  ok('appareil partagé : rien de A n’est envoyé dans le compte de B ; le choix fait par B va chez B seulement');
  /* 6. Base indisponible */
  panne = true;
  await d1.page.reload(); await synchro(d1.page);
  assert.equal(await d1.page.evaluate(() => PA_ACADEMIE_SYNC.etat().ok), false);
  assert.match(await d1.page.evaluate(() => PA_ACADEMIE_SYNC.etat().message), /tout reste sur cet appareil/);
  assert.equal(await niveau(d1.page), 3, 'données de l’appareil intactes');
  panne = false;
  ok('base indisponible : message clair, rien de perdu sur l’appareil');
  await d1.ctx.close(); await d2.ctx.close();
} finally { await browser.close(); serveur.close(); }
assert.deepEqual(erreurs.filter(e => !/500/.test(e)), []);
ok('aucune erreur dans la console');
console.log(nb + ' vérifications réussies.');
