/* Question du jour : banque assets/data/questions-jour.json (fichier généré, ne pas modifier à la main)
   Source unique : la banque de Mon académie (assets/js/academie-questions.js, elle-même générée par
   scripts/generer-academie-questions.mjs). Aucune question n'est inventée ici. On garde :
     - les questions au statut « validee » ;
     - sans prérequis : une question qui suit une autre dans la même scène 3D (« Ton amorti est parti… ») ne se pose
       pas seule. Les questions du quiz tactique (quiz-tactique-donnees.js) sont ces mêmes questions de scènes, avec un
       schéma : elles sont déjà là par la banque de l'académie (texte de la situation à la place du schéma).
   Ordre des questions mélangé avec une graine fixe, puis réarrangé pour que deux jours de suite n'aient pas le même
   thème. Choix des questions de scènes et rédigées mélangés aussi (la bonne réponse y est souvent la première) ;
   les questions de Samuel gardent l'ordre de leurs choix.
   Lien « En savoir plus » : la page du site d'où vient la question (source), sinon la section d'article à revoir.
   Format compact : {v, depart, champs, themes:{code:nom}, liens:[pages], questions:[[…champs]]} ; chaque question est
   un tableau dans l'ordre de CHAMPS (ci-dessous).
   À relancer après scripts/generer-academie-questions.mjs.
   Lancer depuis la racine du site : node scripts/generer-question-jour.mjs [--verifier] */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SORTIE = path.join(RACINE, 'assets/data/questions-jour.json');
const GRAINE = 20260101;
const POIDS_MAX = 60 * 1024;
// Champs de chaque question (tableau, pour un fichier plus léger) : niveaux de la grille FFT 1 à 10, situation vide si
// la question se pose sans mise en situation, bonne = index dans choix, lien = index dans liens
export const CHAMPS = ['id', 'theme', 'niveauMin', 'niveauMax', 'situation', 'question', 'choix', 'bonne', 'explication', 'lien'];

// Générateur pseudo-aléatoire reproductible (mulberry32)
function aleatoire(graine) {
  let a = graine >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function melanger(liste, hasard) {
  const l = liste.slice();
  for (let i = l.length - 1; i > 0; i--) { const j = Math.floor(hasard() * (i + 1)); [l[i], l[j]] = [l[j], l[i]]; }
  return l;
}
// Réarrange pour éviter deux fois de suite le même thème (y compris entre le dernier et le premier jour du cycle)
function alternerThemes(liste) {
  const reste = liste.slice(), sortie = [];
  while (reste.length) {
    const avant = sortie.length ? sortie[sortie.length - 1].theme : null;
    let k = reste.findIndex(q => q.theme !== avant && (reste.length > 1 || !sortie.length || q.theme !== sortie[0].theme));
    if (k < 0) k = reste.findIndex(q => q.theme !== avant);
    if (k < 0) k = 0;
    sortie.push(reste.splice(k, 1)[0]);
  }
  return sortie;
}
// Lien vers la page du site : la source si c'est une page, sinon l'article à revoir ; la page doit exister
function lien(q) {
  const l = /\.html(#|$)/.test(q.source || '') ? q.source : (q.revoir && q.revoir.article && q.revoir.article.url) || q.article;
  if (!l || !fs.existsSync(path.join(RACINE, l.split('#')[0]))) throw new Error('Lien introuvable pour ' + q.id + ' : ' + l);
  return l;
}

export function construire() {
  const ctx = {}; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(RACINE, 'assets/js/academie-questions.js'), 'utf8') +
    ';this.Q=ACADEMIE_QUESTIONS;this.T=ACADEMIE_THEMES;', ctx);
  const banque = JSON.parse(JSON.stringify(ctx.Q)), themes = JSON.parse(JSON.stringify(ctx.T));
  const retenues = banque.filter(q => q.statut === 'validee' && !(q.prerequis || []).length);
  const hasard = aleatoire(GRAINE);
  const ordre = alternerThemes(melanger(retenues, hasard));
  const liens = [];
  const questions = ordre.map(q => {
    let choix = q.choix.map((texte, i) => ({ texte, bonne: i === q.bonne }));
    if (q.origine !== 'samuel') choix = melanger(choix, hasard);
    const l = lien(q);
    if (!liens.includes(l)) liens.push(l);
    // Une question = un tableau, dans l'ordre de CHAMPS
    return [q.id, q.theme, q.niveauMin, q.niveauMax, q.situation || '', q.question, choix.map(c => c.texte),
      choix.findIndex(c => c.bonne), q.explication, liens.indexOf(l)];
  });
  const utilises = [...new Set(questions.map(q => q[1]))].sort();
  return {
    v: 1, depart: '2026-01-01', champs: CHAMPS,
    themes: Object.fromEntries(utilises.map(t => [t, themes[t].nom])),
    liens, questions,
  };
}

const estPrincipal = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (estPrincipal) {
  const texte = JSON.stringify(construire()) + '\n';
  const nb = JSON.parse(texte).questions.length, poids = Buffer.byteLength(texte);
  if (poids > POIDS_MAX) { console.error('Banque trop lourde : ' + poids + ' octets (maximum ' + POIDS_MAX + ').'); process.exit(1); }
  if (process.argv.includes('--verifier')) {
    const actuel = fs.existsSync(SORTIE) ? fs.readFileSync(SORTIE, 'utf8') : '';
    if (actuel !== texte) { console.error('assets/data/questions-jour.json n\'est pas à jour : node scripts/generer-question-jour.mjs'); process.exit(1); }
    console.log('Question du jour à jour : ' + nb + ' questions, ' + poids + ' octets.');
  } else {
    fs.writeFileSync(SORTIE, texte);
    console.log('assets/data/questions-jour.json : ' + nb + ' questions, ' + poids + ' octets.');
  }
}
