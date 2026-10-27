/* SIMULATEUR 3D · Scénarios : validation stricte et calcul (sans rendu, testés sous Node)
   Un scénario est une donnée JSON (assets/3d/scenarios/*.json) : jamais de code. La validation n'accepte que des nombres,
   des textes bornés et des gestes connus ; tout le reste est refusé (fichiers importés compris).
   La balle n'est pas animée à la main : chaque frappe donne une cible et un temps de vol, la trajectoire est calculée par
   physique.js. La synchronisation est vérifiée : à chaque frappe, la balle doit être à portée de raquette du joueur. */
import { trajectoire, viser } from './physique.js';
import { PHYSIQUE } from './constantes.js';
import { GESTES } from './gestes.js';

const MAX_TEXTE = 600, MAX_DUREE = 60;
const estNombre = v => typeof v === 'number' && Number.isFinite(v);
const texte = (v, max = MAX_TEXTE) => typeof v === 'string' && v.length > 0 && v.length <= max;
const point3 = v => Array.isArray(v) && v.length === 3 && v.every(estNombre);

// Portée de frappe : distance horizontale entre le joueur et la balle, et hauteur de contact
export const PORTEE = Object.freeze({ horizontale: 1.2, hauteurMin: 0.15, hauteurMax: 3.1 });

export function valider(s) {
  const e = [];
  if (!s || typeof s !== 'object' || Array.isArray(s)) return ['Le scénario doit être un objet JSON.'];
  const autorisees = ['id', 'titre', 'niveau', 'duree', 'situation', 'explication', 'erreurs', 'conclusion', 'conseil', 'exercice', 'lien', 'joueurs', 'positions', 'frappes', 'etapes', 'questions'];
  Object.keys(s).forEach(k => { if (!autorisees.includes(k)) e.push('Champ inconnu : ' + k); });
  if (!(typeof s.id === 'string' && /^[a-z0-9-]{3,60}$/.test(s.id))) e.push('id invalide');
  ['titre', 'niveau', 'situation', 'conclusion', 'exercice'].forEach(k => { if (!texte(s[k])) e.push(k + ' manquant ou trop long'); });
  if (s.conseil !== undefined && !texte(s.conseil)) e.push('conseil trop long ou vide'); // facultatif
  if (s.lien !== undefined && !(typeof s.lien === 'string' && /^[a-z0-9-]+\.html(#[a-z0-9-]+)?$/.test(s.lien))) e.push('lien invalide (page du site uniquement)');
  ['explication', 'erreurs'].forEach(k => { if (!(Array.isArray(s[k]) && s[k].length >= 1 && s[k].length <= 8 && s[k].every(x => texte(x)))) e.push(k + ' : 1 à 8 textes'); });
  if (!(estNombre(s.duree) && s.duree > 1 && s.duree <= MAX_DUREE)) e.push('duree invalide');
  // Joueurs : exactement 4, deux par équipe
  const ids = [];
  if (!(Array.isArray(s.joueurs) && s.joueurs.length === 4)) e.push('4 joueurs attendus');
  else s.joueurs.forEach(j => {
    if (!(j && /^[AB][12]$/.test(j.id) && texte(j.nom, 30) && (j.equipe === 'A' || j.equipe === 'B') && j.id[0] === j.equipe)) e.push('joueur invalide');
    else ids.push(j.id);
  });
  if (new Set(ids).size !== 4) e.push('identifiants de joueurs : A1, A2, B1, B2');
  // Positions : [t, x, z] croissantes, dans l'enceinte (avec un peu de marge pour les sorties)
  if (!s.positions || typeof s.positions !== 'object') e.push('positions manquantes');
  else ids.forEach(id => {
    const l = s.positions[id];
    if (!(Array.isArray(l) && l.length >= 1 && l.length <= 200)) { e.push('positions de ' + id + ' manquantes'); return; }
    let avant = -1;
    l.forEach(k => {
      if (!(Array.isArray(k) && k.length === 3 && k.every(estNombre))) { e.push('position invalide (' + id + ')'); return; }
      if (k[0] <= avant || k[0] < 0 || k[0] > s.duree) e.push('temps de position non croissant (' + id + ')');
      if (Math.abs(k[1]) > 5.5 || Math.abs(k[2]) > 10.5) e.push('position hors du terrain (' + id + ')');
      avant = k[0];
    });
  });
  // Frappes
  if (!(Array.isArray(s.frappes) && s.frappes.length >= 1 && s.frappes.length <= 60)) e.push('1 à 60 frappes');
  else {
    let avant = -1;
    s.frappes.forEach((f, i) => {
      if (!(f && estNombre(f.t) && f.t > avant && f.t < s.duree)) e.push('frappe ' + (i + 1) + ' : temps invalide');
      if (!(f && ids.includes(f.joueur))) e.push('frappe ' + (i + 1) + ' : joueur inconnu');
      if (!(f && Object.prototype.hasOwnProperty.call(GESTES, f.geste))) e.push('frappe ' + (i + 1) + ' : geste inconnu');
      if (!(f && point3(f.cible) && f.cible[1] >= 0)) e.push('frappe ' + (i + 1) + ' : cible invalide');
      if (!(f && estNombre(f.vol) && f.vol >= 0.2 && f.vol <= 4)) e.push('frappe ' + (i + 1) + ' : temps de vol invalide');
      if (i === 0 && !(f && point3(f.depart))) e.push('la première frappe donne le point de départ de la balle');
      if (i > 0 && f && f.depart !== undefined) e.push('frappe ' + (i + 1) + ' : départ calculé, pas à fournir');
      if (f) Object.keys(f).forEach(k => { if (!['t', 'joueur', 'geste', 'cible', 'vol', 'depart'].includes(k)) e.push('frappe ' + (i + 1) + ' : champ inconnu ' + k); });
      if (f && estNombre(f.t)) avant = f.t;
    });
  }
  // Étapes d'explication
  if (!(Array.isArray(s.etapes) && s.etapes.length >= 1 && s.etapes.length <= 40)) e.push('1 à 40 étapes');
  else {
    let avant = -1;
    s.etapes.forEach((x, i) => {
      if (!(x && estNombre(x.t) && x.t > avant && x.t <= s.duree && texte(x.titre, 80) && texte(x.texte))) e.push('étape ' + (i + 1) + ' invalide');
      else avant = x.t;
    });
  }
  // Questions du mode quiz (facultatives) : la scène se fige à l'instant t, 2 à 4 choix, une seule bonne réponse
  if (s.questions !== undefined) {
    if (!(Array.isArray(s.questions) && s.questions.length <= 6)) e.push('questions : 0 à 6');
    else {
      let avant = -1;
      s.questions.forEach((q, i) => {
        const ok = q && typeof q === 'object' && estNombre(q.t) && q.t > avant && q.t > 0 && q.t < s.duree && texte(q.question, 160) &&
          Array.isArray(q.choix) && q.choix.length >= 2 && q.choix.length <= 4 && q.choix.every(c => texte(c, 120)) &&
          Number.isInteger(q.bonne) && q.bonne >= 0 && q.bonne < q.choix.length && texte(q.explication) &&
          Object.keys(q).every(k => ['t', 'question', 'choix', 'bonne', 'explication'].includes(k));
        if (!ok) e.push('question ' + (i + 1) + ' invalide');
        else avant = q.t;
      });
    }
  }
  return e;
}

// Position d'un joueur à l'instant t : interpolation douce entre les points clés (départs et arrêts sans à-coup)
export function positionJoueur(cles, t) {
  if (t <= cles[0][0]) return [cles[0][1], cles[0][2]];
  for (let i = 1; i < cles.length; i++) {
    if (t <= cles[i][0]) {
      const a = cles[i - 1], b = cles[i], u = (t - a[0]) / (b[0] - a[0]), s = u * u * (3 - 2 * u);
      return [a[1] + (b[1] - a[1]) * s, a[2] + (b[2] - a[2]) * s];
    }
  }
  const d = cles[cles.length - 1];
  return [d[1], d[2]];
}

// Calcul complet : segments de balle (un par frappe), événements, frappes avec leur point de départ, contrôle de portée
export function calculer(s) {
  const segments = [], evenements = [], frappes = [], ecarts = [];
  let depart = s.frappes[0].depart.slice();
  s.frappes.forEach((f, i) => {
    const fin = i + 1 < s.frappes.length ? s.frappes[i + 1].t : s.duree;
    const vitesse = viser(depart, f.cible, f.vol);
    const tr = trajectoire(depart, vitesse, fin - f.t);
    segments.push({ t: f.t, points: tr.points });
    tr.evenements.forEach(ev => evenements.push({ ...ev, t: f.t + ev.t }));
    frappes.push({ ...f, depart: depart.slice(), vitesse });
    // Portée : le joueur qui frappe doit être assez près de la balle
    const [jx, jz] = positionJoueur(s.positions[f.joueur], f.t);
    ecarts.push({ frappe: i + 1, joueur: f.joueur, horizontale: Math.hypot(depart[0] - jx, depart[2] - jz), hauteur: depart[1] });
    depart = tr.final.p.slice();
  });
  return { segments, evenements, frappes, ecarts };
}
export function ecartsHorsPortee(calcul) {
  return calcul.ecarts.filter(x => x.horizontale > PORTEE.horizontale || x.hauteur < PORTEE.hauteurMin || x.hauteur > PORTEE.hauteurMax);
}
// Position de la balle à l'instant t (point calculé le plus proche, au pas fixe)
export function positionBalle(calcul, t) {
  let seg = calcul.segments[0];
  for (const s of calcul.segments) if (t >= s.t) seg = s;
  const i = Math.max(0, Math.min(seg.points.length - 1, Math.round((t - seg.t) / PHYSIQUE.pas)));
  return seg.points[i];
}
// Frappe en cours ou proche pour un joueur (pour animer le geste) : { frappe, phase de -1 à 1 autour du contact }
export function frappeProche(calcul, joueur, t, avant = 0.6, apres = 0.5) {
  for (const f of calcul.frappes) {
    if (f.joueur !== joueur) continue;
    if (t >= f.t - avant && t <= f.t + apres) return { frappe: f, phase: t < f.t ? (t - f.t) / avant : (t - f.t) / apres };
  }
  return null;
}
