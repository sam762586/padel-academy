/* Données du quiz tactique (tactique.html#quiz) : assets/js/quiz-tactique-donnees.js
   Les questions sont celles des scénarios 3D (assets/3d/scenarios/*.json, champ « questions ») : aucune n'est écrite ici.
   Pour chacune, la scène est figée à l'instant de la question par le moteur du simulateur (scenarios.js, physique.js) :
   position des quatre joueurs, de la balle (avec sa hauteur) et de sa trace sur la demi-seconde précédente.
   Le quiz n'a donc rien à calculer : il dessine un schéma 2D, sans three.js.
   À relancer après tout changement de scénario : scripts/verifier-quiz-tactique.cjs signale des données en retard.
   Lancer depuis la racine du site : node scripts/generer-quiz-tactique.mjs [--verifier] */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const module3d = f => import(pathToFileURL(path.join(RACINE, 'assets/js/p3d', f)).href);
const { valider, calculer, positionJoueur, positionBalle } = await module3d('scenarios.js');
const DOSSIER = path.join(RACINE, 'assets/3d/scenarios');
const SORTIE = path.join(RACINE, 'assets/js/quiz-tactique-donnees.js');
const r = v => Math.round(v * 100) / 100;
// « À revoir » après une erreur : celui de la banque de Mon académie (mêmes identifiants), exercice compris
const { construire } = await import(pathToFileURL(path.join(RACINE, 'scripts/generer-academie-questions.mjs')).href);
const banque = Object.fromEntries(construire().map(q => [q.id, q]));

const questions = [];
for (const f of fs.readdirSync(DOSSIER).filter(f => f.endsWith('.json')).sort()) {
  const s = JSON.parse(fs.readFileSync(path.join(DOSSIER, f), 'utf8'));
  const erreurs = valider(s);
  if (erreurs.length) throw new Error(f + ' : ' + erreurs.join(', '));
  const c = calculer(s);
  (s.questions || []).forEach((q, i) => {
    const joueurs = s.joueurs.map(j => [j.id, j.nom, ...positionJoueur(s.positions[j.id], q.t).map(r)]);
    const b = positionBalle(c, q.t);
    // Trace : la balle sur la demi-seconde précédente (sans remonter avant la dernière frappe)
    const frappe = [...s.frappes].reverse().find(x => x.t <= q.t);
    const trace = [];
    for (let k = 5; k >= 1; k--) {
      const t = q.t - k * 0.1;
      if (t >= frappe.t) { const p = positionBalle(c, t); trace.push([r(p[0]), r(p[2])]); }
    }
    questions.push({
      id: s.id + '-' + (i + 1), scenario: s.id, titre: s.titre, niveau: s.niveau, situation: s.situation,
      question: q.question, choix: q.choix, bonne: q.bonne, explication: q.explication,
      joueurs, balle: [r(b[0]), r(b[1]), r(b[2])], trace,
      revoir: { article: banque[s.id + '-' + (i + 1)].revoir.article, exercice: banque[s.id + '-' + (i + 1)].exercice },
    });
  });
}

const contenu = `/* QUIZ TACTIQUE · Données (fichier généré par scripts/generer-quiz-tactique.mjs : ne pas modifier à la main)
   Les ${questions.length} questions des scénarios 3D, scène figée à l'instant de la question.
   joueurs : [id, nom, x, z] ; balle : [x, hauteur, z] ; trace : [x, z] sur la demi-seconde précédente.
   revoir : article et exercice (exercices-donnees.js) à revoir après une erreur, ceux de la banque de Mon académie.
   Repère du simulateur, en mètres : x de -5 à 5 (la droite de ton équipe vers -x), z de -10 (ton fond) à 10. */
const QUIZ_TACTIQUE = ${JSON.stringify(questions).replace(/\},\{"id"/g, '},\n{"id"')};
`;

if (process.argv.includes('--verifier')) {
  const actuel = fs.existsSync(SORTIE) ? fs.readFileSync(SORTIE, 'utf8') : '';
  if (actuel !== contenu) { console.error('quiz-tactique-donnees.js n\'est pas à jour : lancer node scripts/generer-quiz-tactique.mjs'); process.exit(1); }
  console.log('Quiz tactique à jour : ' + questions.length + ' questions.');
} else {
  fs.writeFileSync(SORTIE, contenu);
  console.log('Quiz tactique : ' + questions.length + ' questions écrites dans assets/js/quiz-tactique-donnees.js');
}
