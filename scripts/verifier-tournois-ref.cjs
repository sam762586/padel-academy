/* Vérification de scripts/generer-tournois-ref.js (remplissage de la table Supabase « tournois_ref »).
   1) génération dans un dossier temporaire : nombre de lignes = tournois valides, paquets <= 1 000, apostrophes échappées,
      lignes invalides ignorées et comptées, date de fin absente = date de début, sortie identique d'une exécution à l'autre ;
   2) si pglite est disponible (scripts/node_modules/@electric-sql/pglite, ou PA_PGLITE) : s2-01, s2-28 puis les fichiers générés
      exécutés deux fois dans un Postgres en mémoire (aucune ligne refusée, aucun doublon, mise à jour d'une ligne existante).
   Lancer depuis la racine du site : node scripts/verifier-tournois-ref.cjs */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {spawnSync} = require('node:child_process');

const racine = path.join(__dirname, '..');
const gen = path.join(__dirname, 'generer-tournois-ref.js');
const {lignesRef, sqlPaquet, TAILLE_PAQUET} = require(gen);
let nb = 0;
const ok = nom => { nb++; console.log('OK ' + nom); };

function lancer(dossier) {
  const r = spawnSync(process.execPath, [gen, '--sortie', dossier], {cwd: racine, encoding: 'utf8'});
  assert.equal(r.status, 0, r.stderr + r.stdout);
  return r.stdout;
}
const lireDossier = d => fs.readdirSync(d).filter(f => /^tournois-ref-\d+\.sql$/.test(f)).sort().map(f => [f, fs.readFileSync(path.join(d, f), 'utf8')]);
const compter = sql => (sql.match(/^ {2}\('/gm) || []).length;

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tournois-ref-'));
(async () => {
  try {
    const source = JSON.parse(fs.readFileSync(path.join(racine, 'assets', 'data', 'tournois.json'), 'utf8')).tournois;
    const attendu = lignesRef(source);
    assert.ok(attendu.lignes.length > 1000, 'tournois.json devrait donner plusieurs paquets');

    const a = path.join(tmp, 'a'), b = path.join(tmp, 'b');
    lancer(a);
    const fichiers = lireDossier(a);
    assert.equal(fichiers.length, Math.ceil(attendu.lignes.length / TAILLE_PAQUET));
    assert.equal(fichiers.reduce((n, [, s]) => n + compter(s), 0), attendu.bilan.valides);
    assert.equal(attendu.bilan.valides + attendu.bilan.invalides + attendu.bilan.doublons, attendu.bilan.total);
    fichiers.forEach(([f, s], i) => {
      assert.ok(compter(s) <= 1000, f);
      assert.match(f, new RegExp('^tournois-ref-' + String(i + 1).padStart(2, '0') + '\\.sql$'));
      assert.match(s, /\non conflict \(id\) do update set club = excluded\.club, date_debut = excluded\.date_debut, date_fin = excluded\.date_fin, nom = excluded\.nom, ville = excluded\.ville, categorie = excluded\.categorie, dep = excluded\.dep, maj = now\(\);\n$/);
      assert.ok(Buffer.byteLength(s) < 1000000, 'fichier trop gros pour l\'éditeur : ' + f);
    });
    ok(`${attendu.bilan.valides} tournois valides sur ${attendu.bilan.total} : ${fichiers.length} fichiers de ${TAILLE_PAQUET} lignes au plus, instruction on conflict`);

    lancer(b);
    assert.deepEqual(lireDossier(b), fichiers);
    lancer(a); // relance dans le même dossier : anciens fichiers remplacés, rien en trop
    assert.deepEqual(lireDossier(a), fichiers);
    ok('idempotence : deux exécutions donnent exactement les mêmes fichiers (triés par identifiant, sans horodatage)');

    // Cas limites sur des données fabriquées
    const t = (id, club, d, f) => ({id, club, date_debut: d, date_fin: f});
    const essai = lignesRef([
      t('1', "L'ARÈNE DE L'EST", '2026-11-01', '2026-11-02'), t('2', 'SANS FIN', '2026-11-03', undefined), t('FED_82670679', 'COMITE', '2026-11-01', '2026-11-01'),
      t('abc', 'X', '2026-11-01', '2026-11-01'), t('1234567890123', 'X', '2026-11-01', '2026-11-01'), t('3', '', '2026-11-01', '2026-11-01'),
      t('4', 'X', '2026-02-31', '2026-03-01'), t('5', 'X', '2026-11-05', '2026-11-01'), t('6', 'X', null, null), t('7', 'X'.repeat(121), '2026-11-01', '2026-11-01'),
      t('2', 'SANS FIN BIS', '2026-11-03', '2026-11-03'),
    ]);
    assert.equal(essai.bilan.valides, 3);
    assert.equal(essai.bilan.invalides, 7);
    assert.equal(essai.bilan.doublons, 1);
    assert.deepEqual(essai.lignes.map(l => l.id), ['1', '2', 'FED_82670679']);
    assert.equal(essai.lignes[1].club, 'SANS FIN BIS');
    assert.equal(lignesRef([t('9', 'A', '2026-12-24', '')]).lignes[0].date_fin, '2026-12-24');
    assert.equal(lignesRef([t('9', 'A', '2026-12-24', undefined)]).lignes[0].date_fin, '2026-12-24');
    const sql = sqlPaquet(essai.lignes, 1, 1, '2026-10-26');
    assert.ok(sql.includes("('1', 'L''ARÈNE DE L''EST', '2026-11-01', '2026-11-02', null, null, null, null)"), sql);
    assert.match(sql, /insert into public\.tournois_ref \(id, club, date_debut, date_fin, nom, ville, categorie, dep\) values/);
    assert.ok(!sql.includes("L'ARÈNE"));
    ok('apostrophes doublées, identifiants et dates invalides ignorés et comptés, date de fin absente = date de début, doublon fusionné');

    // Nouvelles colonnes : nom, ville, catégorie, département
    const u = (id, extra) => ({id, club: 'C', date_debut: '2026-11-01', date_fin: '2026-11-01', ...extra});
    const nv = lignesRef([
      u('10', {nom: "  P250 L'Été\u0007  ", ville: 'ST-ÉTIENNE', categorie: 'P250', dep: '42'}), u('11', {nom: '', ville: '', categorie: '', dep: ''}),
      u('12', {nom: 'x'.repeat(201), ville: 'v'.repeat(101), categorie: 'c'.repeat(21), dep: '2A'}), u('13', {dep: 'ABCD'}), u('14', {dep: '7 6'}),
      u('15', {nom: 'Écris-moi sur insta', ville: 'jean@gmail.com', categorie: '06 12 34 56 78'}), u('16', {nom: 'P25 26/10/26 18H MAISON PADEL', dep: '976'}),
      u('17', {nom: 'x'.repeat(200), ville: 'v'.repeat(100), categorie: 'c'.repeat(20)}),
    ]);
    const par = Object.fromEntries(nv.lignes.map(l => [l.id, l]));
    assert.deepEqual([par[10].nom, par[10].ville, par[10].categorie, par[10].dep], ["P250 L'Été", 'ST-ÉTIENNE', 'P250', '42']);
    assert.deepEqual([par[11].nom, par[11].ville, par[11].categorie, par[11].dep], [null, null, null, null]);
    assert.deepEqual([par[12].nom, par[12].ville, par[12].categorie, par[12].dep], [null, null, null, '2A']);
    assert.equal(par[13].dep, null); assert.equal(par[14].dep, null);
    assert.deepEqual([par[15].nom, par[15].ville, par[15].categorie], [null, null, null]);
    assert.equal(par[16].nom, 'P25 26/10/26 18H MAISON PADEL'); assert.equal(par[16].dep, '976');
    assert.equal(par[17].nom.length, 200); assert.equal(par[17].ville.length, 100); assert.equal(par[17].categorie.length, 20);
    assert.deepEqual(nv.bilan.mis_a_null, {nom: 2, ville: 2, categorie: 2, dep: 2});
    const sqlNv = sqlPaquet(nv.lignes.filter(l => l.id === '10'), 1, 1, 'x');
    assert.ok(sqlNv.includes("'P250 L''Été', 'ST-ÉTIENNE', 'P250', '42')"), sqlNv);
    ok('nom, ville, catégorie, département : nettoyés, vides et trop longs = null, dep invalide = null, coordonnées refusées et comptées');

    // Postgres en mémoire
    let pg = null;
    try { pg = require(require.resolve('@electric-sql/pglite', {paths: [__dirname, process.env.PA_PGLITE].filter(Boolean)})); } catch (e) { /* absent */ }
    if (!pg) {
      console.log('Note : pglite absent (scripts/node_modules/@electric-sql/pglite) : exécution dans Postgres sautée.');
    } else {
      const db = await pg.PGlite.create();
      await db.exec('create role anon nologin; create role authenticated nologin; create schema auth;');
      await db.exec('create function public.est_admin() returns boolean language sql stable as $f$ select false $f$;');
      await db.exec(fs.readFileSync(path.join(racine, 'supabase', 'migrations', '2026-10-29-s2-01-table-tournois-ref.sql'), 'utf8'));
      await db.exec(fs.readFileSync(path.join(racine, 'supabase', 'migrations', '2026-10-29-s2-28-colonnes-tournois-ref.sql'), 'utf8'));
      for (let tour = 0; tour < 2; tour++) for (const [, s] of fichiers) await db.exec(s);
      const n = (await db.query('select count(*)::int n, count(distinct id)::int d from public.tournois_ref')).rows[0];
      assert.deepEqual(n, {n: attendu.bilan.valides, d: attendu.bilan.valides});
      const ligne = attendu.lignes[0];
      const base = (await db.query('select club, date_debut::text d, date_fin::text f, nom, ville, categorie, dep from public.tournois_ref where id = $1', [ligne.id])).rows[0];
      assert.deepEqual([base.club, base.d, base.f, base.nom, base.ville, base.categorie, base.dep], [ligne.club, ligne.date_debut, ligne.date_fin, ligne.nom, ligne.ville, ligne.categorie, ligne.dep]);
      const nbCol = (await db.query('select count(nom)::int nom, count(ville)::int ville, count(categorie)::int categorie, count(dep)::int dep from public.tournois_ref')).rows[0];
      for (const k of Object.keys(nbCol)) assert.equal(nbCol[k], attendu.lignes.filter(l => l[k] !== null).length, 'colonne ' + k);
      await db.exec(`update public.tournois_ref set club = 'PIRATE' where id = '${ligne.id}'`);
      await db.exec(fichiers[0][1]);
      assert.equal((await db.query('select club from public.tournois_ref where id = $1', [ligne.id])).rows[0].club, ligne.club);
      const avecApos = attendu.lignes.find(l => l.club.includes("'"));
      if (avecApos) assert.equal((await db.query('select club from public.tournois_ref where id = $1', [avecApos.id])).rows[0].club, avecApos.club);
      await db.close();
      ok(`pglite : s2-01, s2-28 puis les ${fichiers.length} fichiers exécutés deux fois : ${n.n} lignes, aucun doublon, ligne modifiée remise à jour`);
    }
    console.log(`\n${nb} contrôles passés.`);
  } finally {
    fs.rmSync(tmp, {recursive: true, force: true});
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
