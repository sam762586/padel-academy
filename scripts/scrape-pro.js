#!/usr/bin/env node
/* Robot « Actus pro » : saison en cours du circuit Premier Padel (Major, P1, P2, Finals)
   -> assets/data/pro.json. Voir scripts/PRO-NOTES.md pour le fonctionnement de l'API.

   - Source unique : l'API publique de premierpadel.com (api-prod.premierpadel.com), celle que le site
     appelle lui-même, sans compte ni connexion. Jamais padelfip.com (ses CGU interdisent les robots).
   - Politesse : une requête par seconde au plus, une exécution par jour. Les tournois déjà terminés
     dont les résultats sont connus dans pro.json ne sont pas redemandés.
   - Uniquement des faits : tournoi, dates, ville, pays, noms de famille des joueurs, score. Pas d'image.
   - Une donnée absente reste null. Échec réseau ou format inattendu : code 1, fichier existant intact.
     Écriture atomique (fichier temporaire puis renommage).

   Usage : node scripts/scrape-pro.js [--annee 2026] [--sortie fichier.json] [--base url-api]
   (variables d'environnement équivalentes pour les tests : PRO_BASE, PRO_SORTIE, PRO_PAUSE_MS) */
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const BASE_DEFAUT = 'https://api-prod.premierpadel.com/api';
const SITE = 'https://premierpadel.com';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const MIN_TOURNOIS = 8;
const CATEGORIES = { MAJOR: 'Major', P1: 'P1', P2: 'P2', FINALS: 'Finals' };
const STATUTS = { F: 'termine', N: 'a_venir' };

class FormatInattendu extends Error {}
const dormir = ms => new Promise(r => setTimeout(r, ms));
const dateIso = v => {
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(String(v || ''));
  return m && !Number.isNaN(Date.parse(m[1])) ? m[1] : null;
};
const texte = v => (typeof v === 'string' && v.trim() ? v.trim() : null);

/* ---------- Analyse (fonctions pures, testées sur fixtures) ---------- */

/* Réponse de /tournament/getTournaments -> liste de tournois sans résultats. */
function analyserListe(rep, annee) {
  if (!rep || rep.status !== true || !Array.isArray(rep.data)) throw new FormatInattendu('liste des tournois : format inattendu');
  const sortie = [];
  for (const t of rep.data) {
    if (!t || typeof t !== 'object') throw new FormatInattendu('tournoi illisible');
    if (t.organization !== 'FIP' || Number(t.year) !== annee) continue;
    const categorie = CATEGORIES[String(t.type).toUpperCase()];
    if (!categorie) continue; // type inconnu : ignoré, pas deviné
    const debut = dateIso(t.start_date_utc), fin = dateIso(t.end_date_utc);
    if (!t.slug || !debut || !fin) throw new FormatInattendu('tournoi sans slug ou sans dates : ' + JSON.stringify(t.slug));
    sortie.push({
      id: String(t.id),
      nom: texte(t.name) || texte(t.display_name),
      categorie,
      ville: texte(t.city),
      pays: texte(t.country),
      date_debut: debut,
      date_fin: fin,
      statut: STATUTS[t.status] || 'en_cours',
      url_source: SITE + '/en/tournaments-detail/' + t.slug,
      slug: t.slug,
      resultats: { hommes: null, femmes: null },
    });
  }
  sortie.sort((a, b) => a.date_debut.localeCompare(b.date_debut));
  return sortie;
}

const nomsEquipe = (tirage, id) => {
  const c = tirage.contestants && tirage.contestants[id];
  if (!c || !Array.isArray(c.players)) return null;
  const noms = c.players.map(p => texte(p && p.title)).filter(Boolean);
  return noms.length ? noms : null;
};

/* Score du point de vue du vainqueur : "6-4 6-3" (tie-breaks ignorés). */
function formaterScore(gagnant, perdant) {
  const a = gagnant.scores || [], b = perdant.scores || [];
  if (!a.length || a.length !== b.length) return null;
  const sets = [];
  for (let i = 0; i < a.length; i++) {
    const x = a[i] && a[i].mainScore, y = b[i] && b[i].mainScore;
    if (!/^\d+$/.test(String(x)) || !/^\d+$/.test(String(y))) return null;
    sets.push(x + '-' + y);
  }
  return sets.join(' ');
}

/* Réponse de /tournament/getTournamentMatchDraws -> résultat de la finale, ou null si pas jouée. */
function analyserTirage(rep) {
  // Tirage absent côté Premier Padel (« Draws not found », data vide) : pas de résultat, donnée absente.
  if (rep && rep.status === true && rep.data && typeof rep.data === 'object' && !Array.isArray(rep.data) && !Object.keys(rep.data).length) return null;
  if (!rep || rep.status !== true || !rep.data || !Array.isArray(rep.data.rounds)
    || !Array.isArray(rep.data.matches) || typeof rep.data.contestants !== 'object') {
    throw new FormatInattendu('tirage : format inattendu');
  }
  const d = rep.data;
  const idxFinale = d.rounds.findIndex(r => r && r.name === 'Final');
  if (idxFinale < 0) throw new FormatInattendu('tirage sans manche « Final »');
  const finale = d.matches.find(m => m && m.roundIndex === idxFinale);
  if (!finale || !Array.isArray(finale.sides) || finale.sides.length !== 2) return null;
  const gagnant = finale.sides.find(s => s.isWinner === true);
  const perdant = finale.sides.find(s => s.isWinner === false);
  if (!gagnant || !perdant) return null;
  return {
    vainqueurs: nomsEquipe(d, gagnant.contestantId),
    finalistes: nomsEquipe(d, perdant.contestantId),
    score: formaterScore(gagnant, perdant),
  };
}

/* Contrôle de cohérence avant écriture. */
function controler(doc, min = MIN_TOURNOIS) {
  const ko = m => { throw new FormatInattendu('contrôle de cohérence : ' + m); };
  if (!Array.isArray(doc.tournois) || doc.tournois.length < min) ko('trop peu de tournois (' + (doc.tournois || []).length + ')');
  const ids = new Set();
  for (const t of doc.tournois) {
    if (!t.id || ids.has(t.id)) ko('identifiant manquant ou en double');
    ids.add(t.id);
    if (!dateIso(t.date_debut) || !dateIso(t.date_fin) || t.date_fin < t.date_debut) ko('dates invalides pour ' + t.id);
    if (!Object.values(CATEGORIES).includes(t.categorie)) ko('catégorie inconnue pour ' + t.id);
  }
  if (!doc.tournois.some(t => t.statut === 'termine')) ko('aucun tournoi terminé');
  const avecResultat = doc.tournois.filter(t => t.resultats && (t.resultats.hommes || t.resultats.femmes));
  if (!avecResultat.length) ko('aucun résultat trouvé');
}

/* ---------- Collecte ---------- */

function creerClient(base, pauseMs) {
  let dernier = 0;
  return async function appeler(chemin, corps) {
    const attente = dernier + pauseMs - Date.now();
    if (attente > 0) await dormir(attente);
    dernier = Date.now();
    let rep;
    try {
      rep = await fetch(base + chemin, {
        method: 'POST',
        headers: { 'User-Agent': UA, 'Content-Type': 'application/json', Accept: 'application/json', Origin: SITE, Referer: SITE + '/' },
        body: JSON.stringify(corps),
        signal: AbortSignal.timeout(30000),
      });
    } catch (e) { throw new Error('réseau : ' + chemin + ' : ' + e.message); }
    if (rep.status === 401 || rep.status === 403 || rep.status === 429) {
      throw new Error('blocage : HTTP ' + rep.status + ' sur ' + chemin + ' : arrêt, prévenir Samuel (pas de contournement)');
    }
    if (!rep.ok) throw new Error('HTTP ' + rep.status + ' sur ' + chemin);
    try { return await rep.json(); } catch { throw new FormatInattendu('réponse non JSON : ' + chemin); }
  };
}

async function construire(appeler, { annee, precedent, journal = () => {} }) {
  const liste = await appeler('/tournament/getTournaments', { year: annee, type: 'P1' });
  const tournois = analyserListe(liste, annee);
  const connus = new Map(((precedent && precedent.tournois) || []).map(t => [t.id, t]));
  for (const t of tournois) {
    if (t.statut === 'a_venir') continue;
    const avant = connus.get(t.id);
    if (t.statut === 'termine' && avant && avant.statut === 'termine' && avant.resultats
      && (avant.resultats.hommes || avant.resultats.femmes)) {
      t.resultats = avant.resultats; // déjà connu : pas de nouvelle requête
      continue;
    }
    for (const [sexe, type] of [['hommes', 'MD'], ['femmes', 'WD']]) {
      t.resultats[sexe] = analyserTirage(await appeler('/tournament/getTournamentMatchDraws', { slug: t.slug, draw_type: type }));
    }
    journal(t.nom + ' : résultats lus');
  }
  for (const t of tournois) delete t.slug;
  return { maj: new Date().toISOString(), source: SITE + '/en/tournaments', tournois };
}

function ecrireAtomique(fichier, doc) {
  fs.mkdirSync(path.dirname(fichier), { recursive: true });
  const tmp = fichier + '.tmp-' + process.pid;
  fs.writeFileSync(tmp, JSON.stringify(doc, null, 2) + '\n');
  fs.renameSync(tmp, fichier);
}

async function principal(argv, env) {
  const arg = (nom, defaut) => { const i = argv.indexOf('--' + nom); return i >= 0 ? argv[i + 1] : defaut; };
  const annee = Number(arg('annee', new Date().getFullYear()));
  const fichier = arg('sortie', env.PRO_SORTIE || path.join(__dirname, '..', 'assets', 'data', 'pro.json'));
  const base = arg('base', env.PRO_BASE || BASE_DEFAUT);
  const pause = Number(env.PRO_PAUSE_MS || 1100);
  let precedent = null;
  try { precedent = JSON.parse(fs.readFileSync(fichier, 'utf8')); } catch { /* premier passage */ }
  const doc = await construire(creerClient(base, pause), { annee, precedent, journal: m => console.log('  ' + m) });
  controler(doc, Number(env.PRO_MIN || MIN_TOURNOIS));
  ecrireAtomique(fichier, doc);
  console.log('pro.json écrit : ' + doc.tournois.length + ' tournois, '
    + doc.tournois.filter(t => t.statut === 'termine').length + ' terminés (' + fichier + ')');
}

module.exports = { analyserListe, analyserTirage, formaterScore, controler, construire, ecrireAtomique, FormatInattendu };

if (require.main === module) {
  principal(process.argv.slice(2), process.env).catch(e => {
    console.error('ÉCHEC : ' + e.message + ' (fichier existant conservé)');
    process.exit(1);
  });
}
