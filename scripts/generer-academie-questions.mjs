/* Banque de questions de Mon académie : assets/js/academie-questions.js (fichier généré, ne pas modifier à la main)
   Sources :
     - les questions des scénarios 3D (assets/3d/scenarios/*.json) : texte, choix, explication, situation de la scène ;
       leur classement (thème, niveaux 1 à 10, difficulté) est dans scripts/donnees/academie-classement.json ;
     - les questions rédigées pour l'académie (scripts/donnees/academie-questions-redigees.json), chacune reprise d'une
       phrase publiée sur le site (champ source) ; statut « brouillon » tant que Samuel ne les a pas relues.
   Pour chaque question : article (page du thème ou source), exercice de l'espace joueur du thème au niveau correspondant,
   scène 3D (celle de la question, ou celle du thème). Seules les questions « validee » sont posées par le quiz.
   Lancer depuis la racine du site : node scripts/generer-academie-questions.mjs [--verifier] [--relecture <fichier.html>] */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const lire = f => fs.readFileSync(path.join(RACINE, f), 'utf8');
const SORTIE = path.join(RACINE, 'assets/js/academie-questions.js');

// Thèmes demandés par Samuel : page de référence, thème d'exercices de l'espace joueur, scène 3D par défaut
export const THEMES = {
  placement: { nom: 'Placement', article: 'tactique.html#placement', exercices: 'placement', scene: 'couverture-centre' },
  defense: { nom: 'Défense', article: 'technique.html#coups-fond', exercices: 'vitre', scene: 'defendre-double-vitre' },
  vitres: { nom: 'Vitres', article: 'technique.html#coups-fond', exercices: 'vitre', scene: 'sortie-vitre-fond' },
  bandeja: { nom: 'Bandeja et jeu aérien', article: 'tutos.html', exercices: 'aerien', scene: 'bandeja-garder-filet' },
  vibora: { nom: 'Víbora', article: 'simulateur-3d-vibora.html', exercices: 'aerien', scene: 'vibora' },
  volee: { nom: 'Volée', article: 'simulateur-3d-volee-coup-droit.html', exercices: 'placement', scene: 'volee-coup-droit' },
  lob: { nom: 'Lob', article: 'tutos.html', exercices: 'montee', scene: 'monter-apres-lob' },
  transition: { nom: 'Transition', article: 'simulateur-3d-volee-basse-transition.html', exercices: 'transition', scene: 'volee-basse-transition' },
  communication: { nom: 'Communication', article: 'tactique.html#communication', exercices: 'communication', scene: 'partenaire-lobe-cambio' },
  construction: { nom: 'Construction du point', article: 'tactique.html#construire', exercices: 'regularite', scene: 'contre-pied' },
  regles: { nom: 'Règles', article: 'regles.html', exercices: 'service', scene: 'servir-monter' },
};

const ctx = {}; vm.createContext(ctx);
vm.runInContext(lire('assets/js/exercices-donnees.js') + ';this.EX=EXERCICES;', ctx);
const EXERCICES = ctx.EX;
// Niveau d'exercice (1 à 4) correspondant au milieu de la plage de la question (grille 1 à 10) : correspondance de contenus
const niveauExercice = (min, max) => { const m = (min + max) / 2; return m <= 3 ? 1 : m <= 5 ? 2 : m <= 7 ? 3 : 4; };
function exercice(theme, min, max) {
  const n = niveauExercice(min, max), l = EXERCICES.filter(e => e.theme === THEMES[theme].exercices);
  return (l.find(e => e.niveaux.includes(n)) || l[0]).id;
}

export function construire() {
  const classement = JSON.parse(lire('scripts/donnees/academie-classement.json'));
  const redigees = JSON.parse(lire('scripts/donnees/academie-questions-redigees.json')).questions;
  const questions = [], titres = {};
  const dossier = path.join(RACINE, 'assets/3d/scenarios');
  for (const f of fs.readdirSync(dossier).filter(f => f.endsWith('.json')).sort()) {
    const s = JSON.parse(fs.readFileSync(path.join(dossier, f), 'utf8'));
    titres[s.id] = s.titre;
    (s.questions || []).forEach((q, i) => {
      const id = s.id + '-' + (i + 1), c = classement[id];
      if (!c) throw new Error('Question sans classement : ' + id + ' (scripts/donnees/academie-classement.json)');
      questions.push({ id, statut: 'validee', origine: 'scenario', source: 'simulateur-3d-' + s.id + '.html', theme: c.theme,
        niveauMin: c.niveaux[0], niveauMax: c.niveaux[1], difficulte: c.difficulte, situation: s.situation,
        question: q.question, choix: q.choix, bonne: q.bonne, explication: q.explication,
        article: THEMES[c.theme].article, exercice: exercice(c.theme, ...c.niveaux), scenario: s.id,
        prerequis: i ? [s.id + '-' + i] : [] });
    });
  }
  const scenarios = new Set(questions.map(q => q.scenario));
  Object.keys(classement).filter(k => !k.startsWith('_')).forEach(k => { if (!questions.some(q => q.id === k)) throw new Error('Classement d\'une question disparue : ' + k); });
  for (const r of redigees) {
    questions.push({ id: r.id, statut: r.statut, origine: 'redaction', source: r.source, theme: r.theme,
      niveauMin: r.niveaux[0], niveauMax: r.niveaux[1], difficulte: r.difficulte, situation: r.situation,
      question: r.question, choix: r.choix, bonne: r.bonne, explication: r.explication,
      article: r.source.split('#')[0] === 'regles.html' || r.source.startsWith('tactique.html') ? r.source : THEMES[r.theme].article,
      exercice: exercice(r.theme, ...r.niveaux), scenario: r.scenario || (scenarios.has(THEMES[r.theme].scene) ? THEMES[r.theme].scene : null),
      prerequis: r.prerequis || [] });
  }
  construire.titres = titres; // titres des scènes 3D (ACADEMIE_SCENES)
  return questions;
}

function fichier(questions) {
  const th = Object.fromEntries(Object.entries(THEMES).map(([k, v]) => [k, { nom: v.nom, article: v.article }]));
  return `/* MON ACADÉMIE · Banque de questions (fichier généré par scripts/generer-academie-questions.mjs : ne pas modifier à la main)
   ${questions.length} questions, dont ${questions.filter(q => q.statut === 'validee').length} validées. Seules les questions au statut « validee » sont posées.
   niveauMin / niveauMax : grille des niveaux de padel de la FFT (1 à 10) ; difficulte : 1 à 3 ; prerequis : questions à
   connaître avant (même scène) ; article, exercice (exercices-donnees.js), scenario (simulateur-3d-<id>.html). */
const ACADEMIE_THEMES = ${JSON.stringify(th)};
// Titres des scènes 3D (simulateur-3d-<id>.html)
const ACADEMIE_SCENES = ${JSON.stringify(construire.titres || {})};
const ACADEMIE_QUESTIONS = ${JSON.stringify(questions).replace(/\},\{"id"/g, '},\n{"id"')};
`;
}

// Couverture : questions posables par niveau (validées) et brouillons en attente
export function couverture(questions) {
  return Array.from({ length: 10 }, (_, i) => {
    const n = i + 1, l = questions.filter(q => q.niveauMin <= n && n <= q.niveauMax);
    return { niveau: n, validees: l.filter(q => q.statut === 'validee').length, brouillons: l.filter(q => q.statut === 'brouillon').length,
      themes: [...new Set(l.filter(q => q.statut === 'validee').map(q => q.theme))].length };
  });
}

function relecture(questions) {
  const e = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const cov = couverture(questions);
  const ligne = q => `<tr><td><code>${e(q.id)}</code></td><td>${e(THEMES[q.theme].nom)}</td><td>${q.niveauMin}–${q.niveauMax}</td><td>${q.difficulte}</td><td>${e(q.question)}<br><small>✓ ${e(q.choix[q.bonne])}</small></td></tr>`;
  const brouillons = questions.filter(q => q.statut === 'brouillon');
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Relecture : banque de questions</title>
<style>body{font:15px/1.5 system-ui,sans-serif;max-width:1100px;margin:24px auto;padding:0 16px;color:#1b2333}h1{font-size:1.6rem}h2{margin-top:2em}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccd;padding:6px 8px;text-align:left;vertical-align:top}th{background:#eef}.q{border:1px solid #ccd;border-radius:8px;padding:12px 14px;margin:12px 0}.q h3{margin:0 0 6px;font-size:1rem}.ok{color:#176b2c;font-weight:600}small{color:#556}</style></head><body>
<h1>Mon académie : banque de questions à relire</h1>
<p>${questions.length} questions : ${questions.length - brouillons.length} validées (questions des scénarios 3D, déjà relues), ${brouillons.length} brouillons à relire. Pour chaque brouillon : la phrase du site dont il vient (source). Pour les questions des scénarios : le classement proposé (thème, niveaux, difficulté).</p>
<h2>Couverture par niveau</h2><table><tr><th>Niveau</th><th>Questions validées posables</th><th>Thèmes couverts</th><th>Brouillons en attente</th></tr>${cov.map(c => `<tr><td>${c.niveau}</td><td>${c.validees}</td><td>${c.themes} / 11</td><td>${c.brouillons}</td></tr>`).join('')}</table>
<h2>Brouillons à relire (${brouillons.length})</h2>${brouillons.map(q => `<div class="q"><h3>${e(q.question)} <small>· ${e(THEMES[q.theme].nom)} · niveaux ${q.niveauMin}–${q.niveauMax} · difficulté ${q.difficulte} · <code>${e(q.id)}</code></small></h3><p><b>Situation :</b> ${e(q.situation)}</p><ol>${q.choix.map((c, i) => `<li${i === q.bonne ? ' class="ok"' : ''}>${e(c)}${i === q.bonne ? ' ✓' : ''}</li>`).join('')}</ol><p><b>Explication :</b> ${e(q.explication)}</p><p><small>Source : ${e(q.source)} · article : ${e(q.article)} · exercice : ${e(q.exercice)} · scène 3D : ${e(q.scenario || '—')}</small></p></div>`).join('')}
<h2>Classement des questions des scénarios (${questions.length - brouillons.length})</h2><table><tr><th>Question</th><th>Thème</th><th>Niveaux</th><th>Diff.</th><th>Texte</th></tr>${questions.filter(q => q.statut === 'validee').map(ligne).join('')}</table>
</body></html>`;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const questions = construire(), contenu = fichier(questions);
  const i = process.argv.indexOf('--relecture');
  if (i > 0) fs.writeFileSync(process.argv[i + 1], relecture(questions));
  if (process.argv.includes('--verifier')) {
    if ((fs.existsSync(SORTIE) ? fs.readFileSync(SORTIE, 'utf8') : '') !== contenu) { console.error('academie-questions.js n\'est pas à jour : lancer node scripts/generer-academie-questions.mjs'); process.exit(1); }
    console.log('Banque de questions à jour : ' + questions.length + ' questions.');
  } else {
    fs.writeFileSync(SORTIE, contenu);
    const cov = couverture(questions);
    console.log('Banque : ' + questions.length + ' questions (' + questions.filter(q => q.statut === 'validee').length + ' validées) ; validées par niveau : ' + cov.map(c => c.niveau + ':' + c.validees).join(' '));
  }
}
