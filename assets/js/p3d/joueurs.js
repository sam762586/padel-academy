/* SIMULATEUR 3D · Joueurs
   Personnage : mannequin « Universal Animation Library » de Quaternius (CC0, voir assets/3d/LICENCES-3D.md), cloné quatre fois.
   Déplacements : animations du modèle (attente, marche, trot, course, accroupi) choisies selon la vitesse, jouées à l'envers
   quand le joueur recule face au filet. Gestes de frappe : bras droit et rotation des épaules posés par le code (gestes.js),
   par-dessus l'animation des jambes. Statut « simplifié » : pas de capture de mouvement.
   Si le modèle ne se charge pas, chaque joueur est un mannequin géométrique (capsule) : la scène reste lisible. */
import * as THREE from 'three';
import { GLTFLoader, SkeletonUtils } from 'three/addons';
import { RAQUETTE } from './constantes.js';
import { angles } from './gestes.js';

export const COULEURS = { A: 0xc8f14b, B: 0xff6b57 }; // vert énergie et corail, comme le site
const ALLURES = [ // [nom de l'animation, vitesse (m/s) à laquelle elle est naturelle]
  ['Idle_Loop', 0], ['Walk_Loop', 1.4], ['Jog_Fwd_Loop', 3.2], ['Sprint_Loop', 5.5],
];
const RAD = Math.PI / 180;

export async function chargerModele(url) {
  const gltf = await new GLTFLoader().loadAsync(url);
  return gltf;
}

function creerRaquette(couleur) {
  const g = new THREE.Group();
  const manche = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.018, 0.17, 10), new THREE.MeshStandardMaterial({ color: 0x15181d, roughness: 0.7 }));
  manche.position.y = 0.085; g.add(manche);
  const formeTamis = new THREE.Shape();
  formeTamis.absellipse(0, 0, RAQUETTE.largeur / 2, (RAQUETTE.longueur - 0.17) / 2 + 0.02, 0, Math.PI * 2);
  const tamis = new THREE.Mesh(new THREE.ExtrudeGeometry(formeTamis, { depth: RAQUETTE.epaisseur, bevelEnabled: false, curveSegments: 24 }),
    new THREE.MeshStandardMaterial({ color: couleur, roughness: 0.45, metalness: 0.1 }));
  tamis.geometry.translate(0, 0, -RAQUETTE.epaisseur / 2);
  tamis.position.y = 0.17 + (RAQUETTE.longueur - 0.17) / 2;
  g.add(tamis);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}

function mannequinDeSecours(couleur) {
  const g = new THREE.Group();
  const corps = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 1.1, 6, 12), new THREE.MeshStandardMaterial({ color: couleur, roughness: 0.6 }));
  corps.position.y = 0.85; corps.castShadow = true; g.add(corps);
  const tete = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), new THREE.MeshStandardMaterial({ color: 0xe8d6c4 }));
  tete.position.y = 1.62; g.add(tete);
  const raquette = creerRaquette(0x222831); raquette.position.set(-0.32, 0.9, 0.15); raquette.rotation.x = 0.5; g.add(raquette);
  return g;
}

// Pose un os pour que l'axe os → enfant pointe dans la direction voulue (repère monde)
const _q = new THREE.Quaternion(), _qp = new THREE.Quaternion(), _qw = new THREE.Quaternion();
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _d = new THREE.Vector3();
function orienter(os, enfant, direction) {
  os.getWorldPosition(_a); enfant.getWorldPosition(_b);
  _d.subVectors(_b, _a).normalize();
  _q.setFromUnitVectors(_d, direction);
  os.getWorldQuaternion(_qw);
  _qw.premultiply(_q);
  os.parent.getWorldQuaternion(_qp);
  os.quaternion.copy(_qp.invert().multiply(_qw));
  os.updateMatrixWorld(true);
}

// Tourne un os autour d'un axe du repère monde (les os ont des parents tournés : rotateOnWorldAxis ne convient pas)
function tournerMonde(os, axe, angle) {
  _q.setFromAxisAngle(axe, angle);
  os.getWorldQuaternion(_qw);
  _qw.premultiply(_q);
  os.parent.getWorldQuaternion(_qp);
  os.quaternion.copy(_qp.invert().multiply(_qw));
  os.updateMatrixWorld(true);
}

export function creerJoueurs(scene, definitions, gltf, qualite) {
  return definitions.map(def => {
    const couleur = COULEURS[def.equipe];
    const racine = new THREE.Group();
    racine.name = 'joueur-' + def.id;
    scene.add(racine);
    const j = { id: def.id, equipe: def.equipe, racine, cap: def.equipe === 'A' ? 0 : Math.PI, precedent: null, modele: !!gltf };
    if (!gltf) { racine.add(mannequinDeSecours(couleur)); return j; }
    const corps = SkeletonUtils.clone(gltf.scene);
    corps.traverse(o => {
      if (o.isMesh) {
        o.castShadow = qualite.ombres; o.frustumCulled = false;
        // Teinte d'équipe sur le matériau principal, articulations sombres
        o.material = Array.isArray(o.material) ? o.material.map(m => m.clone()) : o.material.clone();
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach(m => { if (m.name === 'M_Main') m.color.set(couleur).multiplyScalar(0.85); else m.color.set(0x1d2129); });
      }
    });
    racine.add(corps);
    // GLTFLoader retire les points des noms de nœuds : « DEF-upper_arm.R » devient « DEF-upper_armR »
    const os = n => corps.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(n));
    j.os = {
      colonne: os('DEF-spine.001'), colonne2: os('DEF-spine.002'), colonne3: os('DEF-spine.003'),
      epaule: os('DEF-upper_arm.R'), avantBras: os('DEF-forearm.R'), main: os('DEF-hand.R'),
      epauleG: os('DEF-upper_arm.L'), avantBrasG: os('DEF-forearm.L'), mainG: os('DEF-hand.L'),
    };
    // Pose de repos des vertèbres : celles que l'animation ne pilote pas sont remises à zéro à chaque image (sinon les
    // rotations des gestes s'additionneraient d'une image à l'autre)
    j.repos = ['colonne', 'colonne2', 'colonne3'].map(n => [j.os[n], j.os[n].quaternion.clone()]);
    const raquette = creerRaquette(0x20242b);
    // Raquette dans l'axe de la main (l'axe Y de l'os de la main suit l'avant-bras), tamis perpendiculaire à la paume
    raquette.position.set(0, 0.06, 0);
    j.os.main.add(raquette);
    j.pointe = new THREE.Object3D(); j.pointe.position.set(0, RAQUETTE.longueur, 0); raquette.add(j.pointe);
    j.mixer = new THREE.AnimationMixer(corps);
    j.actions = {};
    ALLURES.concat([['Crouch_Idle_Loop', 0]]).forEach(([nom]) => {
      const clip = THREE.AnimationClip.findByName(gltf.animations, nom);
      if (!clip) return;
      const a = j.mixer.clipAction(clip);
      a.play(); a.setEffectiveWeight(nom === 'Idle_Loop' ? 1 : 0);
      j.actions[nom] = a;
    });
    return j;
  });
}

// Place un joueur à l'instant t. position : [x, z] ; vitesse : [vx, vz] (m/s) ; geste : { geste, phase } ou null ;
// dtScene : temps du scénario écoulé (négatif en arrière, pour les jambes) ; dt : temps réel (pour tourner en douceur)
export function poserJoueur(j, position, vitesse, cibleRegard, geste, dtScene, dt) {
  j.racine.position.set(position[0], 0, position[1]);
  // Orientation : face au filet, tournée vers la balle (sans jamais tourner le dos au filet)
  const versFilet = j.equipe === 'A' ? 0 : Math.PI;
  let cap = versFilet;
  if (cibleRegard) {
    const vers = Math.atan2(cibleRegard[0] - position[0], cibleRegard[1] - position[1]);
    let ecart = Math.atan2(Math.sin(vers - versFilet), Math.cos(vers - versFilet));
    ecart = Math.max(-1.1, Math.min(1.1, ecart));
    cap = versFilet + ecart * 0.6;
  }
  j.cap += Math.atan2(Math.sin(cap - j.cap), Math.cos(cap - j.cap)) * Math.min(1, dt * 8);
  j.racine.rotation.y = j.cap;
  if (!j.modele) return;
  // Allure : poids des animations selon la vitesse ; marche arrière si le joueur recule face au filet
  const v = Math.hypot(vitesse[0], vitesse[1]);
  const avant = vitesse[0] * Math.sin(j.cap) + vitesse[1] * Math.cos(j.cap);
  const sens = avant < -0.35 * v ? -1 : 1;
  const poids = {};
  ALLURES.forEach(([n]) => { poids[n] = 0; });
  if (v < 0.12) poids.Idle_Loop = 1;
  else {
    for (let i = 1; i < ALLURES.length; i++) {
      const [n, vn] = ALLURES[i], [np, vp] = ALLURES[i - 1];
      if (v <= vn || i === ALLURES.length - 1) {
        const u = Math.min(1, (v - vp) / (vn - vp));
        poids[n] = u; poids[np] = 1 - u;
        break;
      }
    }
  }
  const g = geste ? angles(geste.geste, geste.phase) : null;
  const accroupi = g ? Math.min(0.6, g.genoux / 60) : 0;
  Object.entries(j.actions).forEach(([n, a]) => {
    const w = n === 'Crouch_Idle_Loop' ? accroupi * (poids.Idle_Loop || 0) : (poids[n] || 0) * (n === 'Idle_Loop' ? 1 - accroupi : 1);
    a.setEffectiveWeight(w);
    const vn = (ALLURES.find(x => x[0] === n) || [n, 0])[1];
    // Cadence des pas proportionnelle à la vitesse réelle : les pieds glissent moins sur le sol
    a.setEffectiveTimeScale(vn ? sens * Math.max(0.3, Math.min(2, v / vn)) : 1);
  });
  j.repos.forEach(([o, q]) => o.quaternion.copy(q));
  j.mixer.update(dtScene);
  j.racine.updateMatrixWorld(true);
  // Bras droit et épaules : garde ou geste en cours
  const p = g || angles(null, 0);
  const torsion = p.tronc * RAD;
  const haut = new THREE.Vector3(0, 1, 0);
  // Gestes « v2 » (penche, inclinaison, bras gauche) : rotation des épaules répartie sur les trois vertèbres, buste qui
  // penche et s'incline. Les autres gestes gardent la rotation sur une seule vertèbre.
  const v2 = p.penche !== undefined;
  if (v2) {
    tournerMonde(j.os.colonne, haut, torsion * 0.5);
    tournerMonde(j.os.colonne2, haut, torsion * 0.3);
    tournerMonde(j.os.colonne3, haut, torsion * 0.2);
    const cap = j.cap + torsion;
    // penche : buste vers l'avant (positif) ou l'arrière ; inclinaison : épaule droite qui descend (positif)
    tournerMonde(j.os.colonne2, new THREE.Vector3(-Math.cos(cap), 0, Math.sin(cap)), p.penche * RAD);
    tournerMonde(j.os.colonne2, new THREE.Vector3(Math.sin(cap), 0, Math.cos(cap)), p.inclinaison * RAD);
  } else tournerMonde(j.os.colonne, haut, torsion);
  // Direction du bras dans le repère du joueur (avant +Z, droite -X, haut +Y), tournée avec les épaules
  const av = p.avant * RAD, co = p.cote * RAD;
  const bras = new THREE.Vector3(-Math.sin(co), -Math.cos(av) * Math.cos(co), Math.sin(av) * Math.cos(co)).normalize();
  const tourner = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), j.cap + torsion);
  orienter(j.os.epaule, j.os.avantBras, bras.clone().applyQuaternion(tourner));
  // Coude : l'avant-bras se replie vers l'avant et le haut
  const indice = new THREE.Vector3(0, 0.7, 0.5).normalize();
  const axe = new THREE.Vector3().crossVectors(bras, indice);
  if (axe.lengthSq() < 1e-6) axe.set(1, 0, 0);
  axe.normalize();
  const avantBras = bras.clone().applyAxisAngle(axe, p.coude * RAD);
  orienter(j.os.avantBras, j.os.main, avantBras.clone().applyQuaternion(tourner));
  // Poignet : la raquette se relève dans le même plan que le coude
  orienter(j.os.main, j.pointe, avantBras.applyAxisAngle(axe, p.poignet * RAD).applyQuaternion(tourner));
  // Bras gauche (gestes v2) : même convention que le bras droit, en miroir (gauche = +X) ; sinon, l'animation le garde
  if (v2 && p.gAvant !== undefined) {
    const ga = p.gAvant * RAD, gc = p.gCote * RAD;
    const brasG = new THREE.Vector3(Math.sin(gc), -Math.cos(ga) * Math.cos(gc), Math.sin(ga) * Math.cos(gc)).normalize();
    orienter(j.os.epauleG, j.os.avantBrasG, brasG.clone().applyQuaternion(tourner));
    const axeG = new THREE.Vector3().crossVectors(brasG, indice); // le miroir d'une rotation garde cette formule
    if (axeG.lengthSq() < 1e-6) axeG.set(1, 0, 0);
    axeG.normalize();
    orienter(j.os.avantBrasG, j.os.mainG, brasG.applyAxisAngle(axeG, p.gCoude * RAD).applyQuaternion(tourner));
  }
}
