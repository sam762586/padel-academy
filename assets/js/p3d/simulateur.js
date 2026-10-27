/* SIMULATEUR 3D · Page simulateur-3d.html : scène, lecteur et interface
   Le temps du scénario (t) avance au rythme choisi ; tout ce qui est affiché en découle (positions, balle, gestes) :
   pause, retour en arrière, pas à pas et changement de vitesse donnent toujours la même image au même instant.
   Sans WebGL, ou si la 3D ne démarre pas : message, lien vers le simulateur 2D, et les étapes restent lisibles en texte. */
import { valider, calculer, positionJoueur, positionBalle, frappeProche } from './scenarios.js';
import { GESTES } from './gestes.js';
import { BALLE } from './constantes.js';

// Classés comme sur la page Technique, dans le même ordre (chaque coup y renvoie par simulateur-3d.html#id)
const SCENARIOS = [
  { id: 'coup-droit-fond', nom: 'Coup droit de fond', groupe: 'Fond de court et défense' },
  { id: 'revers-fond', nom: 'Revers de fond', groupe: 'Fond de court et défense' },
  { id: 'monter-apres-lob', nom: 'Lob : monter après un lob', groupe: 'Fond de court et défense' },
  { id: 'sortie-vitre-fond', nom: 'Sortie de vitre de fond', groupe: 'Fond de court et défense' },
  { id: 'sortie-vitre-laterale', nom: 'Sortie de vitre latérale', groupe: 'Fond de court et défense' },
  { id: 'defendre-double-vitre', nom: 'Défendre la double vitre', groupe: 'Fond de court et défense' },
  { id: 'contre-pied', nom: 'Contre-pied : jouer sur le corps', groupe: 'Fond de court et défense' },
  { id: 'chiquita', nom: 'Chiquita', groupe: 'Transition et coups spéciaux' },
  { id: 'volee-basse-transition', nom: 'Volée basse de transition', groupe: 'Transition et coups spéciaux' },
  { id: 'bajada', nom: 'Bajada', groupe: 'Transition et coups spéciaux' },
  { id: 'amorti', nom: 'Amorti (dejada)', groupe: 'Transition et coups spéciaux' },
  { id: 'volee-coup-droit', nom: 'Volée de coup droit', groupe: 'Filet et attaque' },
  { id: 'volee-revers', nom: 'Volée de revers', groupe: 'Filet et attaque' },
  { id: 'duel-filet', nom: 'Duel au filet', groupe: 'Filet et attaque' },
  { id: 'bandeja-garder-filet', nom: 'Bandeja : garder le filet', groupe: 'Filet et attaque' },
  { id: 'vibora', nom: 'Víbora', groupe: 'Filet et attaque' },
  { id: 'smash-lob-court', nom: 'Smash sur lob court', groupe: 'Filet et attaque' },
  { id: 'smash-par-3', nom: 'Smash par 3 (et rulo)', groupe: 'Filet et attaque' },
  { id: 'gancho', nom: 'Gancho', groupe: 'Filet et attaque' },
  { id: 'servir-monter', nom: 'Servir et monter', groupe: 'Service et retour' },
  { id: 'retour-lob', nom: 'Retourner en lob', groupe: 'Service et retour' },
];
const DEFAUT = 'bandeja-garder-filet'; // scénario ouvert sans lien direct
// Page d'un scénario (simulateur-3d-<id>.html, générée par scripts/generer-pages-3d.js) : elle s'ouvre sur ce scénario,
// et choisir un autre scénario mène à sa page. Sur simulateur-3d.html, le scénario suit l'ancre (#id).
const PAGE_SCENARIO = document.getElementById('simulateur')?.dataset.scenario || null;
const adressePage = id => 'simulateur-3d-' + id + '.html';
const GROUPES = ['Fond de court et défense', 'Transition et coups spéciaux', 'Filet et attaque', 'Service et retour'];
const VITESSES = [0.25, 0.5, 1];
const $ = id => document.getElementById(id);

const etat = { scenario: null, calcul: null, t: 0, lecture: false, vitesse: 1, pret3d: false, mode: 'regarder' };
// Quiz : réponse choisie pour chaque question (null = pas encore posée), question affichée
const quiz = { reponses: [], enCours: null };
window.P3D = { etat, quiz, aller: t => aller(t) }; // utilisé par les tests (scripts/verifier-simulateur-3d.cjs)

/* ---------- Interface (indépendante de la 3D) ---------- */
function texte(el, valeur) { el.textContent = valeur; }
function liste(el, elements) { el.replaceChildren(...elements.map(x => { const li = document.createElement('li'); li.textContent = x; return li; })); }

// Libellé du lien de fin de fiche selon la page visée
function texteLien(href) {
  const page = href.split('#')[0];
  return { 'technique.html': 'Voir la fiche du coup', 'tutos.html': 'Voir les tutos', 'regles.html': 'Voir les règles', 'tactique.html': 'Voir le placement' }[page] || 'En savoir plus';
}
function afficherScenario(s) {
  texte($('p3d-titre-scenario'), s.titre);
  texte($('p3d-niveau'), s.niveau);
  texte($('p3d-situation'), s.situation);
  liste($('p3d-explication'), s.explication);
  liste($('p3d-erreurs'), s.erreurs);
  texte($('p3d-conclusion'), s.conclusion);
  texte($('p3d-exercice'), s.exercice);
  const lien = $('p3d-lien');
  lien.hidden = !s.lien; if (s.lien) { lien.href = s.lien; texte(lien, texteLien(s.lien)); }
  // Gestes du scénario et leur statut
  const vus = [...new Set(s.frappes.map(f => f.geste))];
  liste($('p3d-gestes'), vus.map(g => GESTES[g].nom + ' : ' + (GESTES[g].statut === 'simplifie' ? 'geste simplifié' : 'geste à venir (position d\'attente)')));
  // Étapes cliquables
  $('p3d-etapes').replaceChildren(...s.etapes.map((e, i) => {
    const li = document.createElement('li'), b = document.createElement('button');
    b.type = 'button'; b.dataset.i = i; b.textContent = e.titre;
    b.addEventListener('click', () => { aller(e.t); pause(); });
    li.append(b); return li;
  }));
  $('p3d-temps').max = String(s.duree);
}
function etapeCourante(t) {
  let i = 0;
  etat.scenario.etapes.forEach((e, k) => { if (t >= e.t - 1e-6) i = k; });
  return i;
}
let etapeAffichee = -1;
function majInterface() {
  const s = etat.scenario;
  const i = etapeCourante(etat.t);
  if (i !== etapeAffichee) {
    etapeAffichee = i;
    texte($('p3d-etape-num'), 'Étape ' + (i + 1) + ' sur ' + s.etapes.length);
    texte($('p3d-etape-titre'), s.etapes[i].titre);
    texte($('p3d-etape-texte'), s.etapes[i].texte);
    $('p3d-etapes').querySelectorAll('button').forEach((b, k) => b.setAttribute('aria-current', k === i ? 'step' : 'false'));
  }
  $('p3d-temps').value = String(etat.t);
  texte($('p3d-chrono'), etat.t.toFixed(1).replace('.', ',') + ' s');
  const bouton = $('p3d-lecture');
  bouton.textContent = etat.lecture ? 'Pause' : (etat.t >= s.duree ? 'Revoir' : 'Lecture');
  bouton.setAttribute('aria-pressed', String(etat.lecture));
  // Geste en cours (badge)
  let actif = null;
  for (const f of etat.calcul.frappes) if (etat.t >= f.t - 0.35 && etat.t <= f.t + 0.45) actif = f;
  const badge = $('p3d-geste');
  if (actif) {
    const g = GESTES[actif.geste];
    const nom = s.joueurs.find(j => j.id === actif.joueur).nom;
    badge.hidden = false;
    texte(badge, nom + ' · ' + g.nom + (g.statut === 'simplifie' ? ' (geste simplifié)' : ' (geste à venir)'));
  } else badge.hidden = true;
}
function aller(t) { etat.t = Math.max(0, Math.min(etat.scenario.duree, t)); majInterface(); }
function lecture() {
  if (quiz.enCours !== null) return; // une question attend sa réponse
  if (etat.t >= etat.scenario.duree) { etat.t = 0; if (etat.mode === 'quiz') reinitialiserQuiz(); }
  etat.lecture = true; majInterface();
}
function pause() { etat.lecture = false; majInterface(); }

// Avance la lecture de dt secondes (temps réel). En mode quiz, la scène se fige sur la prochaine question non posée.
function avancer(dt) {
  const s = etat.scenario, suivant = Math.min(s.duree, etat.t + dt * etat.vitesse);
  if (etat.mode === 'quiz') {
    const i = (s.questions || []).findIndex((q, k) => quiz.reponses[k] === null && q.t > etat.t - 1e-9 && q.t <= suivant);
    if (i >= 0) { etat.t = s.questions[i].t; etat.lecture = false; poserQuestion(i); majInterface(); return; }
  }
  etat.t = suivant;
  if (etat.t >= s.duree) { etat.lecture = false; if (etat.mode === 'quiz') afficherScore(); }
  majInterface();
}

/* ---------- Mode quiz ---------- */
function reinitialiserQuiz() {
  quiz.reponses = (etat.scenario.questions || []).map(() => null);
  quiz.enCours = null;
  if (etat.mode === 'quiz') introQuiz();
}
function bonnesReponses() { return quiz.reponses.filter((r, k) => r !== null && r === etat.scenario.questions[k].bonne).length; }
function introQuiz() {
  const n = (etat.scenario.questions || []).length;
  $('p3d-quiz').hidden = false;
  texte($('p3d-quiz-score'), 'Mode quiz');
  texte($('p3d-quiz-question'), n ? 'Lance la lecture : la scène s\'arrêtera ' + (n > 1 ? n + ' fois' : 'une fois') + ' pour te demander ce que tu ferais.' : 'Pas de question pour ce scénario.');
  $('p3d-quiz-choix').replaceChildren();
  $('p3d-quiz-explication').hidden = true;
  $('p3d-quiz-suite').hidden = true;
}
function poserQuestion(i) {
  const q = etat.scenario.questions[i], n = etat.scenario.questions.length;
  quiz.enCours = i;
  $('p3d-quiz').hidden = false;
  texte($('p3d-quiz-score'), 'Question ' + (i + 1) + ' sur ' + n);
  texte($('p3d-quiz-question'), q.question);
  $('p3d-quiz-choix').replaceChildren(...q.choix.map((c, k) => {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = c; b.dataset.k = k;
    b.addEventListener('click', () => repondre(k));
    return b;
  }));
  $('p3d-quiz-explication').hidden = true;
  $('p3d-quiz-suite').hidden = true;
  $('p3d-quiz-question').focus({ preventScroll: true });
}
function repondre(k) {
  const i = quiz.enCours;
  if (i === null || quiz.reponses[i] !== null) return;
  const q = etat.scenario.questions[i];
  quiz.reponses[i] = k;
  $('p3d-quiz-choix').querySelectorAll('button').forEach((b, j) => {
    b.disabled = true;
    if (j === q.bonne) b.classList.add('bonne');
    else if (j === k) b.classList.add('fausse');
  });
  const ex = $('p3d-quiz-explication');
  ex.hidden = false;
  texte(ex, (k === q.bonne ? 'Bonne réponse. ' : 'Pas tout à fait. ') + q.explication);
  $('p3d-quiz-suite').hidden = false;
}
function suiteQuiz() {
  quiz.enCours = null;
  introQuiz();
  texte($('p3d-quiz-score'), 'Score : ' + bonnesReponses() + ' sur ' + quiz.reponses.filter(r => r !== null).length);
  texte($('p3d-quiz-question'), 'La lecture reprend : regarde la bonne réponse jouée sur le terrain.');
  lecture();
}
function afficherScore() {
  const n = (etat.scenario.questions || []).length;
  if (!n) return;
  quiz.enCours = null;
  $('p3d-quiz').hidden = false;
  $('p3d-quiz-choix').replaceChildren();
  $('p3d-quiz-explication').hidden = true;
  $('p3d-quiz-suite').hidden = true;
  const b = bonnesReponses();
  texte($('p3d-quiz-score'), 'Quiz terminé');
  texte($('p3d-quiz-question'), 'Score : ' + b + ' sur ' + n + (b === n ? '. Tu lis le jeu comme en match.' : '. Relance la lecture pour réessayer.'));
}
function choisirMode(mode) {
  etat.mode = mode === 'quiz' ? 'quiz' : 'regarder';
  $('p3d-mode').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === etat.mode)));
  // En quiz, la liste des étapes (qui donne les réponses) est masquée
  $('p3d-etapes').hidden = etat.mode === 'quiz';
  pause();
  if (etat.mode === 'quiz') { aller(0); reinitialiserQuiz(); }
  else { quiz.enCours = null; $('p3d-quiz').hidden = true; }
}

function brancherCommandes() {
  $('p3d-lecture').addEventListener('click', () => (etat.lecture ? pause() : lecture()));
  $('p3d-debut').addEventListener('click', () => { aller(0); pause(); if (etat.mode === 'quiz') reinitialiserQuiz(); });
  $('p3d-mode').querySelectorAll('button').forEach(b => b.addEventListener('click', () => choisirMode(b.dataset.mode)));
  $('p3d-quiz-suite').addEventListener('click', suiteQuiz);
  $('p3d-scenarios').addEventListener('change', ev => {
    if (PAGE_SCENARIO) location.href = adressePage(ev.target.value);
    else choisirScenario(ev.target.value).catch(erreurScenario);
  });
  $('p3d-prec').addEventListener('click', () => {
    pause();
    const i = etapeCourante(etat.t), e = etat.scenario.etapes;
    // Au milieu d'une étape : retour à son début ; à son début : étape précédente
    aller(etat.t - e[i].t > 0.3 || i === 0 ? e[i].t : e[i - 1].t);
  });
  $('p3d-suiv').addEventListener('click', () => {
    pause();
    const i = etapeCourante(etat.t), e = etat.scenario.etapes;
    aller(i + 1 < e.length ? e[i + 1].t : etat.scenario.duree);
  });
  $('p3d-temps').addEventListener('input', ev => { pause(); aller(Number(ev.target.value)); });
  const vit = $('p3d-vitesse');
  vit.addEventListener('change', () => { etat.vitesse = VITESSES.includes(Number(vit.value)) ? Number(vit.value) : 1; });
  // Clavier : espace (lecture/pause), flèches (étapes) quand la scène a le focus
  $('p3d-scene').addEventListener('keydown', ev => {
    if (ev.key === ' ') { ev.preventDefault(); $('p3d-lecture').click(); }
    else if (ev.key === 'ArrowRight') { ev.preventDefault(); $('p3d-suiv').click(); }
    else if (ev.key === 'ArrowLeft') { ev.preventDefault(); $('p3d-prec').click(); }
  });
}

async function chargerScenario(id) {
  const reponse = await fetch('assets/3d/scenarios/' + id + '.json');
  if (!reponse.ok) throw new Error('Scénario introuvable');
  const s = await reponse.json();
  const erreurs = valider(s);
  if (erreurs.length) throw new Error('Scénario invalide : ' + erreurs.slice(0, 3).join(' ; '));
  return s;
}
async function choisirScenario(id) {
  const s = await chargerScenario(id);
  etat.scenario = s; etat.calcul = calculer(s); etat.t = 0; etat.lecture = false; etapeAffichee = -1;
  $('p3d-scenarios').value = id;
  afficherScenario(s);
  reinitialiserQuiz();
  majInterface();
  if (scene3d) scene3d.nouveauScenario(s);
  if (!PAGE_SCENARIO) try { history.replaceState(null, '', '#' + id); } catch (e) { /* adresse inchangée */ }
}

/* ---------- 3D ---------- */
function webglDisponible() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch (e) { return false; }
}
function sans3d(raison) {
  $('p3d-scene').hidden = true;
  $('p3d-vues').hidden = true;
  // Le quiz suit la lecture de la scène : sans 3D, seul le mode « Regarder » (étapes en texte) reste
  $('p3d-mode').hidden = true;
  if (etat.mode === 'quiz') choisirMode('regarder');
  $('p3d-sans-3d').hidden = false;
  if (raison) texte($('p3d-sans-3d-raison'), raison);
}

let scene3d = null;
async function demarrer3d() {
  const THREE = await import('three');
  const { creerTerrain, creerLumieres } = await import('./terrain.js');
  const { creerCameras, VUES } = await import('./cameras.js');
  const { chargerModele, creerJoueurs, poserJoueur } = await import('./joueurs.js');

  const conteneur = $('p3d-scene'), canvas = $('p3d-canvas');
  const mobile = matchMedia('(pointer: coarse)').matches || Math.min(screen.width, screen.height) < 700;
  const qualite = { ombres: !mobile, tailleOmbres: 2048, pixelRatio: Math.min(devicePixelRatio || 1, mobile ? 1.5 : 2) };
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !mobile, powerPreference: 'high-performance' });
  renderer.setPixelRatio(qualite.pixelRatio);
  renderer.shadowMap.enabled = qualite.ombres;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b1019);
  scene.fog = new THREE.Fog(0x0b1019, 30, 60);
  const camera = new THREE.PerspectiveCamera(45, 16 / 9, 0.1, 120);
  scene.add(creerTerrain(qualite));
  creerLumieres(scene, qualite);
  const cameras = creerCameras(camera, canvas);

  // Balle et son ombre (disque au sol, utile même sans ombres portées)
  // Balle grossie deux fois à l'affichage pour rester visible de loin (la physique garde le vrai diamètre)
  const balle = new THREE.Mesh(new THREE.SphereGeometry(BALLE.diametre / 2 * 2, 20, 14), new THREE.MeshStandardMaterial({ color: 0xe4ff3a, emissive: 0x4a5a00, roughness: 0.5 }));
  balle.castShadow = qualite.ombres; scene.add(balle);
  const ombre = new THREE.Mesh(new THREE.CircleGeometry(0.07, 20), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false }));
  ombre.rotation.x = -Math.PI / 2; scene.add(ombre);
  // Traînée : la trajectoire de la frappe en cours, jusqu'à la position actuelle
  const MAX_TRAINEE = 2000;
  const geoTrainee = new THREE.BufferGeometry();
  geoTrainee.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAX_TRAINEE * 3), 3));
  const trainee = new THREE.Line(geoTrainee, new THREE.LineBasicMaterial({ color: 0xe4ff3a, transparent: true, opacity: 0.45 }));
  trainee.frustumCulled = false; scene.add(trainee);
  // Rebonds : anneau qui s'efface (sol) ou éclat sur la paroi
  const anneaux = [];
  function preparerRebonds(calcul) {
    anneaux.forEach(a => scene.remove(a.mesh)); anneaux.length = 0;
    calcul.evenements.filter(e => e.type === 'sol' || e.type === 'vitre' || e.type === 'grille').forEach(e => {
      const mesh = new THREE.Mesh(new THREE.RingGeometry(0.08, 0.13, 24), new THREE.MeshBasicMaterial({ color: e.type === 'sol' ? 0xffffff : 0x5ab0ff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
      mesh.position.set(e.p[0], Math.max(0.01, e.p[1]), e.p[2]);
      if (e.type === 'sol') mesh.rotation.x = -Math.PI / 2;
      else if (Math.abs(e.p[2]) > 9.9) mesh.rotation.y = 0;
      else mesh.rotation.y = Math.PI / 2;
      scene.add(mesh); anneaux.push({ t: e.t, mesh });
    });
  }

  // Joueurs : modèle 3D (CC0), ou mannequins géométriques si le chargement échoue
  let gltf = null;
  texte($('p3d-chargement'), 'Chargement des joueurs…');
  try { gltf = await chargerModele('assets/3d/modeles/joueur.glb'); } catch (e) { console.warn('Modèle 3D indisponible, mannequins simplifiés', e); }
  let joueurs = [];
  const etiquettes = $('p3d-etiquettes');

  function nouveauScenario(s) {
    joueurs.forEach(j => scene.remove(j.racine));
    joueurs = creerJoueurs(scene, s.joueurs, gltf, qualite);
    etiquettes.replaceChildren(...s.joueurs.map(j => {
      const d = document.createElement('span'); d.className = 'p3d-etiquette eq-' + j.equipe; d.textContent = j.nom; return d;
    }));
    preparerRebonds(etat.calcul);
  }

  // Taille du rendu : suit le conteneur
  function redimensionner() {
    const l = conteneur.clientWidth, h = conteneur.clientHeight;
    if (!l || !h) return;
    renderer.setSize(l, h, false);
    camera.aspect = l / h; camera.updateProjectionMatrix();
  }
  new ResizeObserver(redimensionner).observe(conteneur);
  redimensionner();

  // Boutons de caméra
  $('p3d-vues').replaceChildren(...VUES.map(v => {
    const b = document.createElement('button');
    b.type = 'button'; b.dataset.vue = v.id; b.textContent = v.nom;
    b.setAttribute('aria-pressed', String(v.id === cameras.vue));
    b.addEventListener('click', () => {
      cameras.choisir(v.id);
      $('p3d-vues').querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      texte($('p3d-aide-libre'), v.id === 'libre' ? 'Fais glisser pour tourner autour du terrain, pince ou molette pour zoomer.' : '');
    });
    return b;
  }));

  // Rendu seulement quand la scène est visible et l'onglet actif (batterie)
  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(conteneur);

  const v3 = new THREE.Vector3();
  let precedent = performance.now(), tPrecedent = 0;
  function image(maintenant) {
    requestAnimationFrame(image);
    const dt = Math.min(0.1, (maintenant - precedent) / 1000);
    precedent = maintenant;
    if (!etat.scenario) return;
    if (etat.lecture) avancer(dt);
    if (!visible || document.hidden) return;
    const s = etat.scenario, c = etat.calcul, t = etat.t;
    // Temps du scénario écoulé depuis l'image précédente (négatif en arrière) : les jambes suivent le curseur
    const dtScene = Math.max(-0.5, Math.min(0.5, t - tPrecedent));
    tPrecedent = t;
    const b = positionBalle(c, t);
    balle.position.set(b[0], b[1], b[2]);
    // Balle sortie du terrain (smash par 3 ou par 4) : elle disparaît, comme hors de l'enceinte
    const sortie = c.evenements.find(e => e.type === 'dehors');
    balle.visible = ombre.visible = !(sortie && t > sortie.t);
    ombre.position.set(b[0], 0.006, b[2]);
    ombre.material.opacity = Math.max(0.08, 0.4 - b[1] * 0.08);
    // Traînée de la frappe en cours
    let seg = c.segments[0];
    for (const x of c.segments) if (t >= x.t) seg = x;
    const fin = Math.min(seg.points.length - 1, Math.round((t - seg.t) * 240)), tab = geoTrainee.attributes.position.array;
    let k = 0;
    for (let i = 0; i <= fin && k < MAX_TRAINEE; i = i < fin && i + 2 > fin ? fin : i + 2, k++) { const p = seg.points[i]; tab[k * 3] = p[0]; tab[k * 3 + 1] = p[1]; tab[k * 3 + 2] = p[2]; }
    geoTrainee.setDrawRange(0, k); geoTrainee.attributes.position.needsUpdate = true;
    anneaux.forEach(a => { const age = t - a.t; a.mesh.material.opacity = age >= 0 && age < 0.7 ? 0.9 * (1 - age / 0.7) : 0; a.mesh.scale.setScalar(1 + Math.max(0, age) * 2.5); });
    // Joueurs : position, allure (vitesse estimée sur ±0,05 s), geste
    joueurs.forEach((j, i) => {
      const cles = s.positions[j.id];
      const p = positionJoueur(cles, t), pa = positionJoueur(cles, t - 0.05), pb = positionJoueur(cles, t + 0.05);
      const vit = [(pb[0] - pa[0]) / 0.1, (pb[1] - pa[1]) / 0.1];
      const g = frappeProche(c, j.id, t);
      poserJoueur(j, p, vit, [b[0], b[2]], g ? { geste: g.frappe.geste, phase: g.phase } : null, dtScene, dt);
      // Étiquette au-dessus de la tête
      v3.set(p[0], 2.05, p[1]).project(camera);
      const el = etiquettes.children[i];
      if (el) {
        const derriere = v3.z > 1;
        el.style.transform = 'translate(' + ((v3.x + 1) / 2 * conteneur.clientWidth).toFixed(1) + 'px,' + ((1 - v3.y) / 2 * conteneur.clientHeight).toFixed(1) + 'px) translate(-50%,-100%)';
        el.style.opacity = derriere ? '0' : '1';
      }
    });
    const a1 = positionJoueur(s.positions.A1, t);
    cameras.mettreAJour(dt, { joueur: a1, balle: b });
    renderer.render(scene, camera);
    etat.images = (etat.images || 0) + 1;
  }
  requestAnimationFrame(image);
  $('p3d-chargement').hidden = true;
  etat.pret3d = true;
  etat.modele = !!gltf;
  return { nouveauScenario };
}

/* ---------- Démarrage ---------- */
async function demarrer() {
  $('p3d-scenarios').replaceChildren(...GROUPES.map(g => {
    const groupe = document.createElement('optgroup');
    groupe.label = g;
    groupe.append(...SCENARIOS.filter(x => x.groupe === g).map(x => {
      const o = document.createElement('option'); o.value = x.id; o.textContent = x.nom; return o;
    }));
    return groupe;
  }));
  $('p3d-vitesse').replaceChildren(...VITESSES.map(v => {
    const o = document.createElement('option'); o.value = String(v); o.textContent = '× ' + String(v).replace('.', ','); o.selected = v === 1; return o;
  }));
  brancherCommandes();
  const demande = location.hash.slice(1);
  const premier = SCENARIOS.some(x => x.id === PAGE_SCENARIO) ? PAGE_SCENARIO : SCENARIOS.some(x => x.id === demande) ? demande : DEFAUT;
  await choisirScenario(premier).catch(erreurScenario);
  // Lien vers un autre scénario sur la même page (ou retour arrière) : l'ancre change sans recharger
  if (!PAGE_SCENARIO) addEventListener('hashchange', () => {
    const id = location.hash.slice(1);
    if (SCENARIOS.some(x => x.id === id) && id !== etat.scenario?.id) choisirScenario(id).catch(erreurScenario);
  });
  if (!webglDisponible()) { sans3d('Ton navigateur ou ton appareil n\'affiche pas la 3D (WebGL indisponible).'); return; }
  try {
    scene3d = await demarrer3d();
    if (etat.scenario) scene3d.nouveauScenario(etat.scenario);
  } catch (e) {
    console.error(e);
    sans3d('La scène 3D n\'a pas pu démarrer sur cet appareil.');
  }
}
function erreurScenario(e) {
  console.error(e);
  texte($('p3d-etape-titre'), 'Scénario indisponible');
  texte($('p3d-etape-texte'), 'Ce scénario n\'a pas pu être chargé. Recharge la page ou choisis un autre scénario.');
}
demarrer();
