/* Lance les suites de tests du site (scripts/verifier-*) et résume les résultats.
   Outil hors site, sans dépendance. Lancer depuis la racine du site :
     node scripts/tout-verifier.cjs                         toutes les suites, l'une après l'autre
     node scripts/tout-verifier.cjs --liste                 liste des suites (nom court utilisable ci-dessous)
     node scripts/tout-verifier.cjs --seulement design,menu,academie*   suites choisies (* = n'importe quelle suite)
     node scripts/tout-verifier.cjs --sauf performance      toutes sauf celles-ci
     node scripts/tout-verifier.cjs --parallele 3           3 suites à la fois (plus rapide, plus gourmand)
     node scripts/tout-verifier.cjs --delai 900             durée maximale d'une suite, en secondes (600 par défaut)
   Code de sortie : 0 = tout est passé ; 1 = au moins une suite en échec (ou dépassement du délai) ;
   2 = aucun échec, mais au moins une suite n'a pas pu tourner (Microsoft Edge ou module Node absent).
   Journal complet : scripts/logs/verifier-AAAA-MM-JJ_HHhMM-SS.log (dossier non commité). */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {spawn} = require('node:child_process');

const ici = __dirname;
const racine = path.join(ici, '..');
const RE_SUITE = /^verifier-.+\.(cjs|mjs|js)$/;
const court = f => f.replace(/^verifier-/, '').replace(/\.(cjs|mjs|js)$/, '');

/* ---- Options ---- */
function lireOptions(argv) {
  const o = {liste: false, seulement: null, sauf: null, parallele: 1, delai: 600};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const valeur = () => {
      const v = argv[++i];
      if (v === undefined || v.startsWith('--')) arreter(`Il manque une valeur après ${a}.`);
      return v;
    };
    if (a === '--liste') o.liste = true;
    else if (a === '--seulement') o.seulement = valeur();
    else if (a === '--sauf') o.sauf = valeur();
    else if (a === '--parallele') o.parallele = entier(valeur(), a);
    else if (a === '--delai') o.delai = entier(valeur(), a);
    else if (a === '--aide' || a === '-h' || a === '--help') { console.log(aide()); process.exit(0); }
    else arreter(`Option inconnue : ${a}\n\n${aide()}`);
  }
  return o;
}
function entier(v, nom) {
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1) arreter(`${nom} attend un nombre entier positif (reçu : ${v}).`);
  return n;
}
function aide() {
  const lignes = fs.readFileSync(__filename, 'utf8').split('\n');
  return lignes.slice(0, lignes.findIndex(l => l.includes('*/')) + 1).join('\n');
}
function arreter(message) { console.error(message); process.exit(1); }

/* ---- Choix des suites : noms courts (design, academie-quiz…) ou noms de fichier, * comme joker ---- */
function filtre(texte, toutes) {
  const choix = new Set();
  for (const brut of texte.split(',').map(s => s.trim()).filter(Boolean)) {
    const motif = court(brut.replace(/^scripts[\\/]/, ''));
    const re = new RegExp('^' + motif.split('*').map(p => p.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$', 'i');
    const trouves = toutes.filter(f => re.test(court(f)));
    if (!trouves.length) arreter(`Aucune suite ne correspond à « ${brut} ». Suites : ${toutes.map(court).join(', ')}`);
    trouves.forEach(f => choix.add(f));
  }
  return choix;
}

/* ---- Classement d'une suite qui n'est pas passée ---- */
function diagnostic(sortie) {
  // Message d'une suite qui signale elle-même un outil manquant (ex. « pglite introuvable : … npm install … »)
  const signale = sortie.match(/^.*\bintrouvable\b.*\bnpm (?:install|ci)\b.*$/im);
  if (signale) return {etat: 'ENV', raison: signale[0].trim().slice(0, 140)};
  // Module Node absent : seulement un paquet (playwright, @electric-sql/pglite…), pas un fichier du site
  const paquet = sortie.match(/Cannot find (?:package|module) '([^']+)'/);
  if (paquet && !/^[./\\]|^[A-Za-z]:[\\/]/.test(paquet[1])) {
    return {etat: 'ENV', raison: `module absent : ${paquet[1]} (npm ci --prefix scripts, ou l'installer)`};
  }
  if (/distribution 'msedge' is not found|msedge.*(?:not found|introuvable)|Executable doesn't exist/i.test(sortie)) {
    return {etat: 'ENV', raison: 'Microsoft Edge introuvable pour Playwright'};
  }
  return {etat: 'ECHEC', raison: ''};
}

/* ---- Exécution d'une suite ---- */
function lancer(fichier, delaiS) {
  return new Promise(resolve => {
    const debut = Date.now();
    let sortie = '';
    let depasse = false;
    let envVu = false;
    let fini = false;
    let arret = null;
    const enfant = spawn(process.execPath, [path.join(ici, fichier)], {cwd: racine, env: process.env, windowsHide: true});
    const recevoir = d => {
      sortie += d;
      // Edge ou module absent : certaines suites restent bloquées après l'erreur (serveur local encore ouvert).
      // On les arrête au lieu d'attendre la fin du délai.
      if (!envVu && diagnostic(sortie).etat === 'ENV') {
        envVu = true;
        arret = setTimeout(() => { if (!fini) enfant.kill(); }, 1500);
      }
    };
    enfant.stdout.on('data', recevoir);
    enfant.stderr.on('data', recevoir);
    const minuteur = setTimeout(() => { depasse = true; enfant.kill(); }, delaiS * 1000);
    const fin = code => {
      if (fini) return;
      fini = true;
      clearTimeout(minuteur);
      clearTimeout(arret);
      const duree = (Date.now() - debut) / 1000;
      const controles = (sortie.match(/^OK\b/gm) || []).length;
      let r;
      if (code === 0) r = {etat: 'OK', raison: ''};
      else if (envVu) r = diagnostic(sortie);
      else if (depasse) r = {etat: 'DELAI', raison: `plus de ${delaiS} s`};
      else r = diagnostic(sortie);
      resolve({fichier, nom: court(fichier), duree, controles, sortie, ...r});
    };
    enfant.on('error', e => { sortie += `\n${e.stack || e}`; fin(1); });
    enfant.on('close', fin);
  });
}

async function pourChaque(liste, simultanes, travail) {
  const resultats = new Array(liste.length);
  let suivant = 0;
  const ouvrier = async () => {
    while (suivant < liste.length) {
      const i = suivant++;
      resultats[i] = await travail(liste[i]);
    }
  };
  await Promise.all(Array.from({length: Math.min(simultanes, liste.length)}, ouvrier));
  return resultats;
}

/* ---- Affichage ---- */
const secondes = s => s.toFixed(1).replace('.', ',') + ' s';
const largeur = 28;
function ligne(r) {
  const etat = {OK: 'OK   ', ECHEC: 'ECHEC', ENV: 'ENV  ', DELAI: 'DELAI'}[r.etat];
  const detail = r.etat !== 'OK' ? r.raison
    : r.controles ? `${r.controles} contrôle${r.controles > 1 ? 's' : ''}` : 'terminée sans erreur';
  return `${etat}  ${r.nom.padEnd(largeur)} ${secondes(r.duree).padStart(8)}  ${detail}`.trimEnd();
}
function horodatage() {
  const d = new Date();
  const z = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}_${z(d.getHours())}h${z(d.getMinutes())}-${z(d.getSeconds())}`;
}

async function principal() {
  const o = lireOptions(process.argv.slice(2));
  const toutes = fs.readdirSync(ici).filter(f => RE_SUITE.test(f)).sort();
  if (!toutes.length) arreter('Aucune suite scripts/verifier-* trouvée.');

  if (o.liste) {
    console.log(`${toutes.length} suites (nom court → fichier) :`);
    toutes.forEach(f => console.log(`  ${court(f).padEnd(largeur)} scripts/${f}`));
    return 0;
  }

  let choisies = toutes;
  if (o.seulement) { const s = filtre(o.seulement, toutes); choisies = choisies.filter(f => s.has(f)); }
  if (o.sauf) { const s = filtre(o.sauf, toutes); choisies = choisies.filter(f => !s.has(f)); }
  if (!choisies.length) arreter('Aucune suite à lancer après --seulement / --sauf.');

  const pw = path.join(ici, 'node_modules', 'playwright');
  if (!fs.existsSync(pw)) {
    console.log('Note : Playwright n\'est pas installé dans scripts/ ; les suites qui ouvrent Edge ne pourront pas tourner.');
    console.log('       Pour l\'installer une fois : npm ci --prefix scripts\n');
  }

  console.log(`${choisies.length} suite${choisies.length > 1 ? 's' : ''} à lancer` +
    (o.parallele > 1 ? `, ${o.parallele} à la fois` : '') + ` (délai ${o.delai} s par suite)\n`);
  const debut = Date.now();
  const resultats = await pourChaque(choisies, o.parallele, async f => {
    const r = await lancer(f, o.delai);
    console.log(ligne(r));
    return r;
  });

  // Journal complet, pour relire le détail d'une suite
  const dossier = path.join(ici, 'logs');
  fs.mkdirSync(dossier, {recursive: true});
  const journal = path.join(dossier, `verifier-${horodatage()}.log`);
  fs.writeFileSync(journal, resultats.map(r => `===== ${r.nom} : ${r.etat} (${secondes(r.duree)})\n${r.sortie}\n`).join('\n'));

  const compte = e => resultats.filter(r => r.etat === e).length;
  const ko = resultats.filter(r => r.etat === 'ECHEC' || r.etat === 'DELAI');
  const env = resultats.filter(r => r.etat === 'ENV');

  for (const r of ko) {
    const fin = r.sortie.trimEnd().split('\n').slice(-25).join('\n    ');
    console.log(`\n--- ${r.nom} (${r.etat}) : fin de la sortie ---\n    ${fin}`);
  }

  console.log(`\nRésultat : ${compte('OK')} OK, ${ko.length} en échec, ${env.length} non lancée${env.length > 1 ? 's' : ''} ` +
    `(environnement), en ${secondes((Date.now() - debut) / 1000)}.`);
  if (ko.length) console.log(`En échec : ${ko.map(r => r.nom).join(', ')}`);
  if (env.length) {
    const parRaison = new Map();
    for (const r of env) parRaison.set(r.raison, [...(parRaison.get(r.raison) || []), r.nom]);
    console.log('Non lancées :');
    for (const [raison, noms] of parRaison) console.log(`  ${raison} → ${noms.join(', ')}`);
  }
  console.log(`Journal complet : ${path.relative(racine, journal).replace(/\\/g, '/')}`);

  return ko.length ? 1 : env.length ? 2 : 0;
}

principal().then(code => { process.exitCode = code; }, e => { console.error(e); process.exitCode = 1; });
