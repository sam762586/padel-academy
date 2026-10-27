/* SIMULATEUR 3D · Labo des trajectoires (simulateur-3d.html#labo, sans three.js)
   Tu règles une frappe (point de frappe, cible, temps de vol) ; la trajectoire est celle du moteur du simulateur
   (physique.js) : gravité, freinage de l'air, rebonds moyens, pas d'effet. Deux vues : de dessus et de côté.
   analyser() est sans rendu (testée sous Node) ; l'interface ne démarre que si la page a une section #labo.
   Repère du simulateur, en mètres : x de -5 à 5 (ta droite vers -x), y la hauteur, z de -10 (ton fond) à 10. */
import { trajectoire, viser } from './physique.js';
import { TERRAIN, BALLE, PHYSIQUE, hauteurFilet } from './constantes.js';

const R = BALLE.diametre / 2, DUREE_MAX = 5;
// Préréglages : frappes réelles des scénarios (point de départ calculé par le moteur, cible et temps de vol du JSON)
export const PREREGLAGES = Object.freeze([
  { id: 'lob', nom: 'Lob défensif', source: 'retour-lob', depart: [-2.94, 0.97, -7.96], cible: [-1.6, 8.4], passage: null, vol: 1.9 },
  { id: 'sortie', nom: 'Sortie de vitre en lob', source: 'monter-apres-lob', depart: [4.12, 0.72, -8.92], cible: [2.6, 8.5], passage: null, vol: 2 },
  { id: 'bandeja', nom: 'Bandeja', source: 'bandeja-garder-filet', depart: [-2.3, 2.15, -5.7], cible: [1.9, 7.4], passage: null, vol: 1.05 },
  { id: 'volee', nom: 'Volée profonde', source: 'bandeja-garder-filet', depart: [-2, 0.95, -2.4], cible: [0.4, 8], passage: null, vol: 0.8 },
  { id: 'coup-droit', nom: 'Coup droit de fond', source: 'coup-droit-fond', depart: [-3.01, 0.84, -8.4], cible: [2.1, 3], passage: 0.45, vol: 1.05 },
  { id: 'smash', nom: 'Smash', source: 'smash-lob-court', depart: [-1.2, 2.7, -4.6], cible: [0.6, 6.2], passage: null, vol: 0.42 },
]);

const DEMI_L = TERRAIN.longueur / 2, DEMI_W = TERRAIN.largeur / 2;
const paroi = (p, type) => Math.abs(p[2]) >= DEMI_L - 0.1 ? 'du fond' : type === 'vitre' ? 'latérale' : 'latéral';
const lieu = z => z < 0 ? 'dans ton camp' : z <= TERRAIN.ligneService ? 'dans le carré de service' : 'entre la ligne de service et la vitre';

/* Analyse d'une frappe : réglages { depart: [x, y, z], cible: [x, z], passage: hauteur ou null (rebond), vol }.
   Renvoie la trajectoire (jusqu'au 2e rebond adverse, une sortie ou 5 s), la vitesse au départ, le passage du filet,
   la hauteur maximale, le premier rebond et ce qui suit, et le verdict (balle bonne ou faute). */
export function analyser(r) {
  const cible = [r.cible[0], r.passage == null ? R : r.passage, r.cible[1]];
  const v = viser(r.depart, cible, r.vol);
  const tr = trajectoire(r.depart, v, DUREE_MAX);
  // On s'arrête au 2e rebond au sol chez l'adversaire (le point est joué) ou à la sortie
  // (ou au premier rebond dans ton camp) ; l'événement d'indice i a lieu au point d'indice i (t / pas)
  const indice = t => Math.round(t / PHYSIQUE.pas);
  let fin = tr.points.length - 1, sols = 0;
  const evenements = [];
  for (const e of tr.evenements) {
    evenements.push(e);
    if (e.type === 'dehors' || (e.type === 'sol' && (e.p[2] < 0 || ++sols === 2))) { fin = indice(e.t); break; }
  }
  const points = tr.points.slice(0, fin + 1);
  // Passage du filet : premier point au-delà de z = 0
  let filet = null;
  const iFilet = points.findIndex(p => p[2] > 0);
  const touche = evenements.find(e => e.type === 'filet');
  if (touche && (iFilet < 0 || indice(touche.t) <= iFilet)) filet = { touche: true };
  else if (iFilet > 0) {
    const a = points[iFilet - 1], b = points[iFilet], u = a[2] / (a[2] - b[2]);
    const x = a[0] + (b[0] - a[0]) * u, y = a[1] + (b[1] - a[1]) * u;
    filet = { touche: false, hauteur: y, marge: y - R - hauteurFilet(x) };
  }
  const premierSol = evenements.find(e => e.type === 'sol');
  const avantSol = premierSol ? evenements.filter(e => e.t < premierSol.t) : evenements;
  const iMax = premierSol ? indice(premierSol.t) : points.length - 1;
  const hauteurMax = Math.max(...points.slice(0, iMax + 1).map(p => p[1]));
  // Verdict (règle du padel : la balle doit rebondir au sol chez l'adversaire avant de toucher une paroi)
  let verdict;
  if (!filet || filet.touche) verdict = { bonne: false, texte: 'Faute : la balle ne passe pas le filet.' };
  else if (avantSol.some(e => e.type === 'vitre' || e.type === 'grille' || e.type === 'dehors')) {
    const e = avantSol.find(e => e.type !== 'filet');
    verdict = { bonne: false, texte: e.type === 'dehors' ? 'Faute : la balle sort sans rebondir.' : `Faute : la balle touche ${e.type === 'vitre' ? 'la vitre' : 'le grillage'} ${paroi(e.p, e.type)} avant le sol.` };
  } else if (!premierSol) verdict = { bonne: false, texte: 'La balle ne retombe pas dans le temps calculé.' };
  else verdict = { bonne: true, texte: 'Balle bonne : premier rebond ' + lieu(premierSol.p[2]) + '.' };
  // Suite après le premier rebond, en mots
  const suite = premierSol ? evenements.filter(e => e.t > premierSol.t).map(e => {
    if (e.type === 'sol') return { type: e.type, texte: '2e rebond à ' + fr(e.p[2]) + ' du filet' };
    if (e.type === 'dehors') return { type: e.type, texte: 'la balle sort du terrain (par 3 ou par 4)' };
    return { type: e.type, texte: (e.type === 'vitre' ? 'vitre ' : 'grillage ') + paroi(e.p, e.type) + ' à ' + fr(e.p[1]) + ' de haut' };
  }) : [];
  return {
    points, evenements, vitesse: Math.hypot(...v) * 3.6, filet, hauteurMax,
    rebond: premierSol ? { x: premierSol.p[0], z: premierSol.p[2], lieu: lieu(premierSol.p[2]) } : null,
    suite, verdict,
  };
}
const fr = (v, d = 1) => v.toFixed(d).replace('.', ',') + ' m';

/* ---------- Interface ---------- */
function demarrer(section) {
  const $ = id => section.querySelector('#' + id);
  const etat = JSON.parse(JSON.stringify(PREREGLAGES[0]));
  // Curseurs : côté (x écran = -x), profondeur, hauteurs, temps de vol
  const CURSEURS = [
    ['labo-fx', 'Côté', -4.8, 4.8, () => -etat.depart[0], v => { etat.depart[0] = -v; }, v => cote(-v)],
    ['labo-fz', 'Distance au filet', 0.3, 9.8, () => -etat.depart[2], v => { etat.depart[2] = -v; }, v => fr(v)],
    ['labo-fy', 'Hauteur de frappe', 0.3, 3, () => etat.depart[1], v => { etat.depart[1] = v; }, v => fr(v, 2)],
    ['labo-cx', 'Côté', -4.8, 4.8, () => -etat.cible[0], v => { etat.cible[0] = -v; }, v => cote(-v)],
    ['labo-cz', 'Distance au filet', 0.3, 9.8, () => etat.cible[1], v => { etat.cible[1] = v; }, v => fr(v)],
    ['labo-ch', 'Hauteur de passage', 0.2, 3, () => etat.passage ?? 1, v => { etat.passage = v; }, v => fr(v, 2)],
    ['labo-vol', 'Temps de vol', 0.4, 2.5, () => etat.vol, v => { etat.vol = v; }, v => v.toFixed(2).replace('.', ',') + ' s'],
  ];
  const cote = x => Math.abs(x) < 0.25 ? 'au centre' : fr(Math.abs(x)) + (x < 0 ? ' à droite' : ' à gauche');
  const curseur = ([id, nom, min, max]) => `<div class="champ labo-curseur"><label for="${id}">${nom} <output id="${id}-val"></output></label><input type="range" id="${id}" min="${min}" max="${max}" step="0.01"></div>`;
  $('labo-app').innerHTML = `
    <div class="phases labo-prereglages" role="group" aria-label="Préréglages">${PREREGLAGES.map(p => `<button type="button" data-prereglage="${p.id}" aria-pressed="false">${p.nom}</button>`).join('')}</div>
    <div class="labo-grille">
      <figure class="labo-dessus"><svg id="labo-svg-dessus" viewBox="-5.8 -10.8 11.6 21.6" role="img" aria-label="Vue de dessus de la trajectoire"></svg>
        <figcaption>Vue de dessus. Touche ton camp pour placer la frappe, le camp adverse pour la cible.</figcaption></figure>
      <div class="labo-reglages">
        <fieldset><legend>Ta frappe</legend>${CURSEURS.slice(0, 3).map(curseur).join('')}</fieldset>
        <fieldset><legend>La cible</legend>
          <div class="phases labo-mode" role="group" aria-label="Type de cible"><button type="button" data-mode="rebond" aria-pressed="true">Rebond ici</button><button type="button" data-mode="passage" aria-pressed="false">Passage ici</button></div>
          ${CURSEURS.slice(3, 6).map(curseur).join('')}${curseur(CURSEURS[6])}</fieldset>
      </div>
    </div>
    <figure class="labo-cote"><svg id="labo-svg-cote" viewBox="-10.5 -5.5 21 6" role="img" aria-label="Vue de côté de la trajectoire"></svg>
      <figcaption>Vue de côté : ton camp à gauche. Filet de 0,88 m au centre, vitres de 3 m au fond, grillage jusqu'à 4 m.</figcaption></figure>
    <div class="labo-resultat" id="labo-resultat" aria-live="polite"></div>`;
  CURSEURS.forEach(([id, , , , lire, ecrire, texte]) => {
    $(id).addEventListener('input', () => { ecrire(Number($(id).value)); $(id + '-val').textContent = texte(Number($(id).value)); calculerEtDessiner(false); });
  });
  section.querySelectorAll('[data-prereglage]').forEach(b => b.addEventListener('click', () => {
    Object.assign(etat, JSON.parse(JSON.stringify(PREREGLAGES.find(p => p.id === b.dataset.prereglage))));
    calculerEtDessiner(true);
  }));
  section.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => {
    etat.passage = b.dataset.mode === 'rebond' ? null : (etat.passage ?? 1);
    calculerEtDessiner(true);
  }));
  // Toucher sur la vue de dessus : ton camp = point de frappe, camp adverse = cible
  $('labo-svg-dessus').addEventListener('click', ev => {
    const svg = $('labo-svg-dessus'), p = new DOMPoint(ev.clientX, ev.clientY).matrixTransform(svg.getScreenCTM().inverse());
    const x = Math.max(-4.8, Math.min(4.8, -p.x)), z = -p.y;
    if (z < 0) { etat.depart[0] = x; etat.depart[2] = Math.max(-9.8, Math.min(-0.3, z)); }
    else { etat.cible[0] = x; etat.cible[1] = Math.max(0.3, Math.min(9.8, z)); }
    calculerEtDessiner(true);
  });

  function calculerEtDessiner(curseurs) {
    if (curseurs) CURSEURS.forEach(([id, , , , lire, , texte]) => { $(id).value = String(lire()); $(id + '-val').textContent = texte(lire()); });
    section.querySelectorAll('[data-prereglage]').forEach(b => {
      const p = PREREGLAGES.find(x => x.id === b.dataset.prereglage);
      b.setAttribute('aria-pressed', String(JSON.stringify([p.depart, p.cible, p.passage, p.vol]) === JSON.stringify([etat.depart, etat.cible, etat.passage, etat.vol])));
    });
    section.querySelectorAll('[data-mode]').forEach(b => b.setAttribute('aria-pressed', String((b.dataset.mode === 'rebond') === (etat.passage == null))));
    $('labo-ch').closest('.labo-curseur').hidden = etat.passage == null;
    const a = analyser(etat);
    dessiner(a);
    const filet = a.filet?.touche ? 'touché' : a.filet ? (a.filet.marge >= 0 ? fr(a.filet.marge, 2) + ' au-dessus' : 'touché') : 'pas atteint';
    $('labo-resultat').innerHTML = `<p class="msg ${a.verdict.bonne ? 'msg-ok' : 'msg-erreur'}" id="labo-verdict">${a.verdict.texte}</p>
      <dl class="labo-chiffres">
        <div><dt>Vitesse au départ</dt><dd id="labo-vitesse">${Math.round(a.vitesse)} km/h</dd></div>
        <div><dt>Filet</dt><dd id="labo-filet">${filet}</dd></div>
        <div><dt>Hauteur maximale</dt><dd id="labo-hmax">${fr(a.hauteurMax)}</dd></div>
        <div><dt>Premier rebond</dt><dd id="labo-rebond">${a.rebond ? 'à ' + fr(Math.abs(a.rebond.z)) + ' du filet, ' + a.rebond.lieu : 'aucun'}</dd></div>
      </dl>
      ${a.suite.length ? `<p class="labo-suite" id="labo-suite"><b>Ensuite :</b> ${a.suite.map(s => s.texte).join(', puis ')}.</p>` : ''}`;
  }

  function dessiner(a) {
    // Vue de dessus : x écran = -x, y écran = -z
    const P = p => (-p[0]).toFixed(2) + ',' + (-p[2]).toFixed(2), pas = Math.max(1, Math.floor(a.points.length / 300));
    const trace = a.points.filter((_, i) => i % pas === 0 || i === a.points.length - 1);
    const marques = a.evenements.filter(e => e.type !== 'dehors');
    const [cx, cz] = etat.cible;
    $('labo-svg-dessus').innerHTML = `<rect class="qt-sol" x="-5" y="-10" width="10" height="20"/><path class="qt-ligne" d="M-5,-6.95H5M-5,6.95H5M0,-6.95V6.95"/>` +
      `<rect class="qt-cadre" x="-5" y="-10" width="10" height="20"/><line class="qt-filet" x1="-5.3" y1="0" x2="5.3" y2="0"/>` +
      `<polyline class="labo-trace" points="${trace.map(P).join(' ')}"/>` +
      marques.map(e => `<circle class="labo-ev labo-ev-${e.type}" cx="${(-e.p[0]).toFixed(2)}" cy="${(-e.p[2]).toFixed(2)}" r="0.18"/>`).join('') +
      `<path class="labo-cible" d="M${(-cx - 0.4).toFixed(2)},${(-cz).toFixed(2)}h0.8M${(-cx).toFixed(2)},${(-cz - 0.4).toFixed(2)}v0.8"/>` +
      `<circle class="labo-frappeur" cx="${(-etat.depart[0]).toFixed(2)}" cy="${(-etat.depart[2]).toFixed(2)}" r="0.4"/>`;
    // Vue de côté : z en abscisse (ton camp à gauche), hauteur vers le haut ; l'échelle s'agrandit si le lob monte haut.
    // Écran étroit : hauteurs étirées (k) pour rester lisibles, graduations en vrais mètres
    const haut = Math.max(5, Math.ceil(a.hauteurMax + 0.5)), k = section.clientWidth < 600 ? 2.2 : 1;
    const svg = $('labo-svg-cote');
    const gauche = k > 1 ? 11.4 : 10.5, taille = k > 1 ? 0.75 : 0.32;
    svg.setAttribute('viewBox', `${-gauche} ${(-haut - 0.5) * k} ${gauche + 10.5} ${(haut + 1) * k}`);
    const Q = p => p[2].toFixed(2) + ',' + (-p[1] * k).toFixed(2);
    const graduations = Array.from({ length: haut }, (_, i) => i + 1).map(h => `<line class="labo-grad" x1="-10" y1="${-h * k}" x2="10" y2="${-h * k}"/><text class="labo-grad-txt" x="-10.3" y="${-h * k + taille * 0.35}" style="font-size:${taille}px">${h}</text>`).join('');
    svg.innerHTML = graduations +
      `<line class="labo-sol" x1="-10" y1="0" x2="10" y2="0"/>` +
      `<line class="labo-vitre" x1="-10" y1="0" x2="-10" y2="${-3 * k}"/><line class="labo-vitre" x1="10" y1="0" x2="10" y2="${-3 * k}"/>` +
      `<line class="labo-grillage" x1="-10" y1="${-3 * k}" x2="-10" y2="${-4 * k}"/><line class="labo-grillage" x1="10" y1="${-3 * k}" x2="10" y2="${-4 * k}"/>` +
      `<line class="labo-filet" x1="0" y1="0" x2="0" y2="${-TERRAIN.filetCentre * k}"/>` +
      `<line class="labo-ligne-service" x1="-6.95" y1="0" x2="-6.95" y2="0.15"/><line class="labo-ligne-service" x1="6.95" y1="0" x2="6.95" y2="0.15"/>` +
      `<polyline class="labo-trace" points="${trace.map(Q).join(' ')}"/>` +
      marques.map(e => `<circle class="labo-ev labo-ev-${e.type}" cx="${e.p[2].toFixed(2)}" cy="${(-e.p[1] * k).toFixed(2)}" r="0.14"/>`).join('') +
      `<circle class="labo-frappeur" cx="${etat.depart[2].toFixed(2)}" cy="${(-etat.depart[1] * k).toFixed(2)}" r="0.16"/>`;
  }
  calculerEtDessiner(true);
  // Largeur changée (rotation du téléphone) : l'échelle de la vue de côté peut changer
  let largeur = section.clientWidth;
  addEventListener('resize', () => { if ((section.clientWidth < 600) !== (largeur < 600)) calculerEtDessiner(false); largeur = section.clientWidth; });
}
if (typeof document !== 'undefined') {
  const section = document.getElementById('labo');
  if (section) demarrer(section);
  window.P3D_LABO = { analyser, PREREGLAGES }; // utilisé par les tests (scripts/verifier-labo-trajectoires.cjs)
}
