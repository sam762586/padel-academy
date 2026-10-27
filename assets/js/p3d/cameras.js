/* SIMULATEUR 3D · Caméras
   Six vues : aérienne, tactique, derrière toi (A1), latérale, libre (orbite à la souris ou au doigt), suivi de balle.
   Les vues fixes et suivies glissent en douceur vers leur cible ; la vue libre rend la main à OrbitControls. */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons';

export const VUES = [
  { id: 'tactique', nom: 'Tactique' },
  { id: 'aerienne', nom: 'Aérienne' },
  { id: 'joueur', nom: 'Derrière toi' },
  { id: 'laterale', nom: 'Latérale' },
  { id: 'balle', nom: 'Suivi balle' },
  { id: 'libre', nom: 'Libre' },
];

export function creerCameras(camera, element) {
  const controles = new OrbitControls(camera, element);
  controles.enableDamping = true; controles.dampingFactor = 0.08;
  controles.maxPolarAngle = Math.PI / 2 - 0.05; controles.minDistance = 3; controles.maxDistance = 40;
  controles.target.set(0, 0.5, 0);
  controles.enabled = false;
  let vue = 'tactique';
  const pos = new THREE.Vector3(), cible = new THREE.Vector3(), regard = new THREE.Vector3(0, 0.5, 0);
  let premiere = true;

  // Position et point visé de chaque vue, selon l'état de la scène (joueur suivi, balle)
  function viser(etat) {
    const portrait = camera.aspect < 1; // écran de téléphone en hauteur : on recule pour voir tout le terrain
    const recul = portrait ? 1.35 : 1;
    switch (vue) {
      case 'aerienne': pos.set(0, 25 * recul, -0.01); cible.set(0, 0, 0); break;
      // En hauteur sur téléphone : plus haut et plus plongeant, le terrain remplit l'écran
      case 'tactique': if (portrait) { pos.set(0, 15, -17); cible.set(0, 0, 0.8); } else { pos.set(0, 9, -19); cible.set(0, 0, 1.5); } break;
      case 'laterale': pos.set(-14 * recul, 4.5, 0); cible.set(0, 1, 0); break;
      case 'joueur': {
        const [x, z] = etat.joueur;
        // Derrière le joueur, mais toujours dans l'enceinte (devant la vitre du fond)
        pos.set(x * 0.7, 3.2, Math.max(-9.4, z - 5.5 * (portrait ? 1.3 : 1))); cible.set(x * 0.4, 1.2, z + 6);
        break;
      }
      case 'balle': {
        const b = etat.balle;
        pos.set(b[0] * 0.5 - 6, Math.max(2.5, b[1] + 2), Math.max(-14, Math.min(14, b[2] - 6))); cible.set(b[0], b[1], b[2]);
        break;
      }
      default: break;
    }
  }
  return {
    controles,
    get vue() { return vue; },
    choisir(id) {
      if (!VUES.some(v => v.id === id)) return;
      vue = id;
      controles.enabled = id === 'libre';
      if (id === 'libre') controles.target.copy(regard);
    },
    // dt : temps réel écoulé (s) ; etat : { joueur:[x,z], balle:[x,y,z] }
    mettreAJour(dt, etat) {
      if (vue === 'libre') { controles.update(); return; }
      viser(etat);
      const k = premiere ? 1 : 1 - Math.exp(-dt * (vue === 'balle' ? 4 : 3));
      camera.position.lerp(pos, k);
      regard.lerp(cible, k);
      camera.lookAt(regard);
      premiere = false;
    },
  };
}
