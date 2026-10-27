/* SIMULATEUR 3D · Physique de la balle (sans rendu, déterministe, testée sous Node)
   Pas fixe (PHYSIQUE.pas), gravité, freinage de l'air, rebonds sur le sol, les vitres, le grillage et le filet.
   Approximations assumées : pas d'effet (lift, slice), coefficients de rebond moyens, accès latéraux non simulés,
   balle ponctuelle de rayon fixe. C'est une trajectoire pédagogique, pas une mesure. */
import { TERRAIN, BALLE, PHYSIQUE, hauteurFilet, paroiLaterale } from './constantes.js';

const R = BALLE.diametre / 2;
const DEMI_L = TERRAIN.longueur / 2, DEMI_W = TERRAIN.largeur / 2;

// Un pas de simulation. etat = { p:[x,y,z], v:[vx,vy,vz] } ; renvoie le nouvel état et l'événement éventuel
export function pas(etat) {
  const h = PHYSIQUE.pas, k = PHYSIQUE.trainee;
  const [vx, vy, vz] = etat.v;
  const vit = Math.hypot(vx, vy, vz);
  const v = [vx - k * vit * vx * h, vy - (PHYSIQUE.gravite + k * vit * vy) * h, vz - k * vit * vz * h];
  const p = [etat.p[0] + v[0] * h, etat.p[1] + v[1] * h, etat.p[2] + v[2] * h];
  let evenement = null;
  // Filet : passage du plan z = 0 sous la bande
  if (Math.sign(etat.p[2]) !== Math.sign(p[2]) && etat.p[2] !== 0) {
    const f = etat.p[2] / (etat.p[2] - p[2]);
    const x = etat.p[0] + (p[0] - etat.p[0]) * f, y = etat.p[1] + (p[1] - etat.p[1]) * f;
    if (y - R < hauteurFilet(x) && Math.abs(x) <= DEMI_W) {
      p[2] = Math.sign(etat.p[2]) * R;
      v[2] = -v[2] * PHYSIQUE.restitutionFilet; v[0] *= 0.3; v[1] *= 0.3;
      evenement = 'filet';
    }
  }
  // Sol
  if (p[1] < R) {
    p[1] = R;
    if (v[1] < 0) {
      v[1] = -v[1] * BALLE.restitutionSol; v[0] *= PHYSIQUE.frottementSol; v[2] *= PHYSIQUE.frottementSol;
      if (Math.abs(v[1]) > 0.05) evenement = evenement || 'sol';
      else v[1] = 0;
    }
  }
  // Fonds (z = ±10)
  if (Math.abs(p[2]) > DEMI_L - R) {
    const s = Math.sign(p[2]);
    if (p[1] > TERRAIN.hauteurTotale) evenement = 'dehors';
    else {
      const vitre = p[1] <= TERRAIN.fondVitre;
      p[2] = s * (DEMI_L - R);
      if (v[2] * s > 0) {
        v[2] = -v[2] * (vitre ? PHYSIQUE.restitutionVitre : PHYSIQUE.restitutionGrille);
        const fr = vitre ? PHYSIQUE.frottementVitre : PHYSIQUE.frottementGrille;
        v[0] *= fr; v[1] *= fr;
        evenement = vitre ? 'vitre' : 'grille';
      }
    }
  }
  // Côtés (x = ±5)
  if (Math.abs(p[0]) > DEMI_W - R) {
    const s = Math.sign(p[0]), paroi = paroiLaterale(p[2]);
    if (p[1] > paroi.haut) evenement = 'dehors';
    else {
      const vitre = p[1] <= paroi.vitre;
      p[0] = s * (DEMI_W - R);
      if (v[0] * s > 0) {
        v[0] = -v[0] * (vitre ? PHYSIQUE.restitutionVitre : PHYSIQUE.restitutionGrille);
        const fr = vitre ? PHYSIQUE.frottementVitre : PHYSIQUE.frottementGrille;
        v[2] *= fr; v[1] *= fr;
        evenement = vitre ? 'vitre' : 'grille';
      }
    }
  }
  return { etat: { p, v }, evenement };
}

// Trajectoire sur une durée : échantillons à chaque pas et événements (rebonds)
export function trajectoire(depart, vitesse, duree) {
  let etat = { p: depart.slice(), v: vitesse.slice() };
  const n = Math.round(duree / PHYSIQUE.pas);
  const points = [etat.p.slice()], evenements = [];
  for (let i = 1; i <= n; i++) {
    const r = pas(etat);
    etat = r.etat;
    points.push(etat.p.slice());
    if (r.evenement) {
      evenements.push({ t: i * PHYSIQUE.pas, type: r.evenement, p: etat.p.slice() });
      if (r.evenement === 'dehors') break;
    }
  }
  return { points, evenements, final: etat };
}

// Vitesse de départ pour atteindre « cible » en « vol » secondes (avec le freinage de l'air) : corrections successives.
// La cible est supposée atteinte avant tout rebond (frappe vers un point de l'espace ou du sol).
export function viser(depart, cible, vol) {
  const g = PHYSIQUE.gravite;
  let v = [(cible[0] - depart[0]) / vol, (cible[1] - depart[1] + 0.5 * g * vol * vol) / vol, (cible[2] - depart[2]) / vol];
  for (let i = 0; i < 25; i++) {
    const p = volLibre(depart, v, vol);
    const e = [cible[0] - p[0], cible[1] - p[1], cible[2] - p[2]];
    if (Math.hypot(...e) < 0.002) break;
    v = [v[0] + e[0] / vol, v[1] + e[1] / vol, v[2] + e[2] / vol];
  }
  return v;
}
// Position après « duree » sans collision (gravité et freinage seuls)
function volLibre(depart, vitesse, duree) {
  const h = PHYSIQUE.pas, k = PHYSIQUE.trainee, n = Math.round(duree / h);
  let p = depart.slice(), v = vitesse.slice();
  for (let i = 0; i < n; i++) {
    const vit = Math.hypot(...v);
    v = [v[0] - k * vit * v[0] * h, v[1] - (PHYSIQUE.gravite + k * vit * v[1]) * h, v[2] - k * vit * v[2] * h];
    p = [p[0] + v[0] * h, p[1] + v[1] * h, p[2] + v[2] * h];
  }
  return p;
}
