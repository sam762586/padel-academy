/* Test du robot « Actus pro » (scripts/scrape-pro.js) sans réseau extérieur : fixtures réelles allégées
   (scripts/fixtures/pro/, sans image) servies par un petit serveur local.
   1) analyse : liste et tirages -> JSON attendu (vainqueurs, finalistes, score, null si absent) ;
   2) exécution complète : pro.json écrit, valide, écriture atomique (aucun fichier temporaire) ;
   3) échecs : format changé, HTTP 500, blocage 429 -> sortie 1 et fichier existant conservé.
   Lancer depuis la racine du site : node scripts/verifier-pro.cjs */
const assert = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path'), http = require('node:http');
const { spawn } = require('node:child_process');
const robot = require('./scrape-pro.js');
let n = 0; const ok = m => { n++; console.log('OK ' + m); };
const fx = f => JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'pro', f), 'utf8'));

/* 1) analyse */
const liste = robot.analyserListe(fx('liste.json'), 2026);
assert.equal(liste.length, 4);
const kuwait = liste.find(t => t.slug === 'kuwait-p1-2');
assert.equal(kuwait.categorie, 'Major'); assert.equal(kuwait.statut, 'termine');
assert.equal(kuwait.date_debut, '2026-10-23'); assert.equal(kuwait.date_fin, '2026-10-31');
assert.equal(kuwait.url_source, 'https://premierpadel.com/en/tournaments-detail/kuwait-p1-2');
assert.equal(liste.find(t => t.slug === 'germany-p2').categorie, 'P2');
assert.equal(liste.find(t => t.slug === 'dubai-p1-3').statut, 'a_venir');
assert.deepEqual(liste.map(t => t.date_debut), [...liste.map(t => t.date_debut)].sort());
assert.equal(robot.analyserListe(fx('liste.json'), 2025).length, 0);
ok('liste : catégories, statuts, dates, url_source, tri chronologique, filtre par saison');
assert.deepEqual(robot.analyserTirage(fx('tirage-hommes.json')),
  { vainqueurs: ['Coello', 'Tapia'], finalistes: ['Tello', 'Arce Simo'], score: '6-1 6-1' });
assert.deepEqual(robot.analyserTirage(fx('tirage-femmes.json')),
  { vainqueurs: ['Triay Pons', 'Brea Senesi'], finalistes: ['Sanchez Fallada', 'Ustero Prieto'], score: '3-6 6-1 6-1' });
assert.equal(robot.analyserTirage(fx('tirage-absent.json')), null);
ok('tirages : finale hommes et femmes (score du point de vue du vainqueur), tirage absent -> null');
assert.throws(() => robot.analyserListe({ status: true, data: { x: 1 } }, 2026), robot.FormatInattendu);
assert.throws(() => robot.analyserTirage({ status: true, data: { rounds: [], matches: [], contestants: {} } }), robot.FormatInattendu);
ok('format inattendu : exception explicite');

/* 2 et 3) exécutions du vrai script contre un serveur local */
let mode = 'ok';
const serveur = http.createServer((req, rep) => {
  let c = ''; req.on('data', d => c += d); req.on('end', () => {
    const json = o => { rep.setHeader('Content-Type', 'application/json'); rep.end(JSON.stringify(o)); };
    if (mode === 'http500') { rep.statusCode = 500; return rep.end('boom'); }
    if (mode === 'http429') { rep.statusCode = 429; return rep.end('stop'); }
    if (mode === 'html') return rep.end('<html>changé</html>');
    if (req.url.endsWith('/getTournaments')) return json(mode === 'format' ? { status: true, data: { tournaments: [] } } : fx('liste.json'));
    const corps = JSON.parse(c || '{}');
    if (corps.slug !== 'kuwait-p1-2' && corps.slug !== 'germany-p2') return json(fx('tirage-absent.json'));
    json(fx(corps.draw_type === 'WD' ? 'tirage-femmes.json' : 'tirage-hommes.json'));
  });
});
const lancer = (sortie, base) => new Promise(res => {
  const p = spawn(process.execPath, [path.join(__dirname, 'scrape-pro.js'), '--sortie', sortie, '--base', base],
    { env: { ...process.env, PRO_PAUSE_MS: '0', PRO_MIN: '3' } });
  let o = ''; p.stdout.on('data', d => o += d); p.stderr.on('data', d => o += d);
  p.on('close', code => res({ code, o }));
});

serveur.listen(0, '127.0.0.1', async () => {
  const base = 'http://127.0.0.1:' + serveur.address().port;
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'pro-'));
  const sortie = path.join(dossier, 'pro.json');
  try {
    let r = await lancer(sortie, base);
    assert.equal(r.code, 0, r.o);
    const doc = JSON.parse(fs.readFileSync(sortie, 'utf8'));
    assert.deepEqual(Object.keys(doc), ['maj', 'source', 'tournois']);
    assert.ok(!Number.isNaN(Date.parse(doc.maj)));
    const k = doc.tournois.find(t => t.id === kuwait.id);
    assert.deepEqual(k.resultats.hommes, { vainqueurs: ['Coello', 'Tapia'], finalistes: ['Tello', 'Arce Simo'], score: '6-1 6-1' });
    assert.equal(k.resultats.femmes.score, '3-6 6-1 6-1');
    const qatar = doc.tournois.find(t => /qatar/i.test(t.nom));
    assert.deepEqual(qatar.resultats, { hommes: null, femmes: null });
    assert.deepEqual(doc.tournois.find(t => t.statut === 'a_venir').resultats, { hommes: null, femmes: null });
    assert.ok(!('slug' in k));
    assert.deepEqual(fs.readdirSync(dossier), ['pro.json']);
    ok('exécution complète : pro.json valide, absences à null, aucun fichier temporaire');

    const avant = fs.readFileSync(sortie, 'utf8');
    for (const m of ['format', 'http500', 'http429', 'html']) {
      mode = m; r = await lancer(sortie, base);
      assert.equal(r.code, 1, m + ' : ' + r.o);
      assert.equal(fs.readFileSync(sortie, 'utf8'), avant, m + ' : fichier écrasé');
      assert.deepEqual(fs.readdirSync(dossier), ['pro.json'], m + ' : fichier temporaire resté');
    }
    ok('format changé, HTTP 500, blocage 429, réponse HTML : sortie 1 et fichier conservé');

    mode = 'ok'; r = await lancer(path.join(dossier, 'neuf.json'), 'http://127.0.0.1:1');
    assert.equal(r.code, 1); assert.ok(!fs.existsSync(path.join(dossier, 'neuf.json')));
    ok('serveur injoignable : sortie 1, rien d\'écrit');

    assert.throws(() => robot.controler({ tournois: doc.tournois.slice(0, 1) }), robot.FormatInattendu);
    assert.throws(() => robot.controler({ tournois: doc.tournois.map(t => ({ ...t, date_fin: 'invalide' })) }, 1), robot.FormatInattendu);
    ok('contrôle de cohérence : trop peu de tournois et dates invalides refusés');
    console.log(`\n${n} vérifications réussies.`);
  } catch (e) { console.error(e); process.exitCode = 1; }
  finally { fs.rmSync(dossier, { recursive: true, force: true }); serveur.close(); }
});
