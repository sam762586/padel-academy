/* SIMULATEUR 3D · Terrain (Three.js), aux dimensions de constantes.js (FIP)
   Sol bleu et lignes (texture générée), vitres légèrement teintées, grillage (texture ajourée générée), structure en acier,
   filet et sa bande blanche, salle éclairée, zones de placement (bouton « Placements »). Aucune image externe : toutes les
   textures sont dessinées ici. Parois et pièces répétées regroupées (une géométrie ou des instances) pour les mobiles. */
import * as THREE from 'three';
import { TERRAIN, hauteurFilet, paroiLaterale } from './constantes.js';

const L = TERRAIN.longueur, W = TERRAIN.largeur;

function textureSol() {
  const px = 40, c = document.createElement('canvas'); // 40 px par mètre
  c.width = W * px; c.height = L * px;
  const g = c.getContext('2d');
  g.fillStyle = '#1f5fa8'; g.fillRect(0, 0, c.width, c.height);
  // Grain du gazon synthétique : bruit léger et déterministe
  let graine = 7;
  const alea = () => (graine = (graine * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 14000; i++) { g.fillStyle = alea() < 0.5 ? 'rgba(255,255,255,.035)' : 'rgba(0,0,0,.05)'; g.fillRect(alea() * c.width, alea() * c.height, 2, 2); }
  g.fillStyle = '#f4f7fb';
  const ligne = TERRAIN.largeurLigne * px;
  const yService1 = (L / 2 - TERRAIN.ligneService) * px, yService2 = (L / 2 + TERRAIN.ligneService) * px;
  g.fillRect(0, yService1 - ligne / 2, c.width, ligne);
  g.fillRect(0, yService2 - ligne / 2, c.width, ligne);
  g.fillRect(c.width / 2 - ligne / 2, yService1, ligne, yService2 - yService1); // ligne centrale de service (jusqu'au-delà du filet)
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
function textureGrillage() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  g.strokeStyle = 'rgba(40,46,56,1)'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(0, 0); g.lineTo(64, 64); g.moveTo(64, 0); g.lineTo(0, 64); g.stroke();
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Assemble des rectangles verticaux en une seule géométrie (un seul appel de dessin par matériau : léger sur mobile).
// Chaque rectangle : centre [x, y, z], largeur, hauteur, orientation (0 : face à l'axe z, π/2 : face à l'axe x).
// Coordonnées de texture en mètres (u le long de la paroi, v en hauteur) : la maille du grillage garde la même taille partout.
function rectangles(liste) {
  const pos = [], nor = [], uv = [], idx = [];
  liste.forEach(([c, l, h, ry]) => {
    const dx = Math.cos(ry) * l / 2, dz = -Math.sin(ry) * l / 2, nx = Math.sin(ry), nz = Math.cos(ry);
    const u0 = (ry ? c[2] : c[0]) - l / 2, v0 = c[1] - h / 2, n = pos.length / 3;
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy]) => {
      pos.push(c[0] + sx * dx, c[1] + sy * h / 2, c[2] + sx * dz);
      nor.push(nx, 0, nz);
      uv.push(u0 + (sx + 1) / 2 * l, v0 + (sy + 1) / 2 * h);
    });
    idx.push(n, n + 1, n + 2, n, n + 2, n + 3);
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

// Pièces répétées (montants, cadres, luminaires) : une seule instance de géométrie dessinée n fois
function instances(geometrie, materiau, matrices, ombres) {
  const m = new THREE.InstancedMesh(geometrie, materiau, matrices.length);
  matrices.forEach((x, i) => m.setMatrixAt(i, x));
  m.castShadow = ombres; m.instanceMatrix.needsUpdate = true;
  return m;
}
const matrice = (x, y, z, sx, sy, sz) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion(), new THREE.Vector3(sx, sy, sz));

export function creerTerrain(qualite) {
  const groupe = new THREE.Group();
  groupe.name = 'terrain';
  // Sol du terrain et abords
  const sol = new THREE.Mesh(new THREE.PlaneGeometry(W, L), new THREE.MeshStandardMaterial({ map: textureSol(), roughness: 0.95 }));
  sol.rotation.x = -Math.PI / 2; sol.receiveShadow = true; groupe.add(sol);
  const abords = new THREE.Mesh(new THREE.PlaneGeometry(W + 14, L + 16), new THREE.MeshStandardMaterial({ color: 0x343d4e, roughness: 1 }));
  abords.rotation.x = -Math.PI / 2; abords.position.y = -0.005; abords.receiveShadow = true; groupe.add(abords);

  // Parois : vitres (légèrement teintées, pour qu'on les voie) et grillage, chacun en une seule géométrie
  const vitres = [], grilles = [];
  [-1, 1].forEach(s => {
    vitres.push([[0, TERRAIN.fondVitre / 2, s * L / 2], W, TERRAIN.fondVitre, 0]);
    grilles.push([[0, TERRAIN.fondVitre + (TERRAIN.hauteurTotale - TERRAIN.fondVitre) / 2, s * L / 2], W, TERRAIN.hauteurTotale - TERRAIN.fondVitre, 0]);
  });
  [-1, 1].forEach(sx => {
    for (let z = -L / 2; z < L / 2; z += 1) {
      const zc = z + 0.5, paroi = paroiLaterale(zc), hg = paroi.haut - paroi.vitre;
      if (paroi.vitre > 0) vitres.push([[sx * W / 2, paroi.vitre / 2, zc], 1, paroi.vitre, Math.PI / 2]);
      if (hg > 0) grilles.push([[sx * W / 2, paroi.vitre + hg / 2, zc], 1, hg, Math.PI / 2]);
    }
  });
  const verre = new THREE.MeshStandardMaterial({ color: 0xbfe3ff, transparent: true, opacity: 0.22, roughness: 0.08, metalness: 0.2, depthWrite: false, side: THREE.DoubleSide });
  const mVitres = new THREE.Mesh(rectangles(vitres), verre); mVitres.renderOrder = 2; groupe.add(mVitres);
  const texG = textureGrillage(); texG.repeat.set(6, 6);
  groupe.add(new THREE.Mesh(rectangles(grilles), new THREE.MeshStandardMaterial({ map: texG, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.7, metalness: 0.4 })));

  // Structure en acier clair : montants tous les 2 m et cadre en haut des vitres (rend les vitres lisibles)
  const acier = new THREE.MeshStandardMaterial({ color: 0x8792a6, roughness: 0.45, metalness: 0.7 });
  const montants = [];
  for (let z = -L / 2; z <= L / 2 + 0.01; z += 2) [-1, 1].forEach(sx => { const h = paroiLaterale(Math.min(Math.abs(z), L / 2 - 0.01) * Math.sign(z || 1)).haut; montants.push(matrice(sx * W / 2, h / 2, z, 1, h, 1)); });
  for (let x = -W / 2 + 2; x < W / 2; x += 2) [-1, 1].forEach(s => montants.push(matrice(x, TERRAIN.hauteurTotale / 2, s * L / 2, 1, TERRAIN.hauteurTotale, 1)));
  groupe.add(instances(new THREE.CylinderGeometry(0.03, 0.03, 1, 8), acier, montants, qualite.ombres));
  const cadres = [];
  [-1, 1].forEach(s => cadres.push(matrice(0, TERRAIN.fondVitre, s * L / 2, W, 1, 1)));
  [-1, 1].forEach(sx => {
    for (let z = -L / 2; z < L / 2; z += 1) { const v = paroiLaterale(z + 0.5).vitre; if (v > 0) cadres.push(matrice(sx * W / 2, v, z + 0.5, 0.05, 1, 20)); } // boîte de 1 × 0,05 × 0,05 m tournée le long de z
  });
  groupe.add(instances(new THREE.BoxGeometry(1, 0.05, 0.05), acier, cadres, false));

  // Filet : voile sombre, bande blanche, poteaux
  const nFilet = 24, geo = new THREE.BufferGeometry(), sommets = [];
  for (let i = 0; i <= nFilet; i++) { const x = -W / 2 + W * i / nFilet; sommets.push(x, 0, 0, x, hauteurFilet(x), 0); }
  const indices = [];
  for (let i = 0; i < nFilet; i++) { const a = i * 2; indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  geo.setAttribute('position', new THREE.Float32BufferAttribute(sommets, 3)); geo.setIndex(indices); geo.computeVertexNormals();
  // Maille fine : invisible à distance si elle est dessinée maille par maille, donc un voile sombre semi-transparent
  const filet = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x0d1117, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false, roughness: 1 }));
  filet.castShadow = qualite.ombres; groupe.add(filet);
  const bande = new THREE.Mesh(new THREE.BoxGeometry(W, 0.06, 0.012), new THREE.MeshStandardMaterial({ color: 0xffffff }));
  bande.position.set(0, (TERRAIN.filetCentre + TERRAIN.filetPoteaux) / 2 - 0.03, 0); groupe.add(bande);
  [-1, 1].forEach(s => { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.05, 12), acier); p.position.set(s * (W / 2 + 0.03), 0.525, 0); p.castShadow = qualite.ombres; groupe.add(p); });

  // Salle : murs gris-bleu, rampes de projecteurs au plafond, bancs
  const salle = new THREE.MeshStandardMaterial({ color: 0x2b374f, roughness: 1, side: THREE.BackSide });
  const boite = new THREE.Mesh(new THREE.BoxGeometry(W + 14, 12, L + 16), salle); boite.position.y = 5.9; groupe.add(boite); // fond sous le sol
  const rampes = [];
  [-1, 1].forEach(s => [-7, 0, 7].forEach(z => rampes.push(matrice(s * (W / 2 + 2.5), 9.6, z, 1, 1, 1)))); // hors de l'aplomb du terrain : la vue aérienne reste dégagée
  groupe.add(instances(new THREE.BoxGeometry(0.5, 0.08, 4), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xf4f7fa, emissiveIntensity: 1.4 }), rampes, false));
  const banc = new THREE.MeshStandardMaterial({ color: 0x4a5468, roughness: 0.8 });
  [-1, 1].forEach(s => { const b = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 2.2), banc); b.position.set(s * (W / 2 + 1.6), 0.225, 0); b.castShadow = qualite.ombres; groupe.add(b); });
  return groupe;
}

/* Zones de placement au sol (bouton « Placements ») : pour chaque moitié, la position au filet (2 à 2,5 m du filet),
   la zone à éviter (de 3 m du filet à la ligne de service) et la position de défense (1 à 1,5 m devant la vitre du fond).
   Mêmes repères que les pages du site (tactique.html, exercices). */
export const ZONES = Object.freeze([
  { id: 'filet', nom: 'Au filet : 2 à 2,5 m', de: 2, a: 2.5, couleur: 0xc8f14b },
  { id: 'eviter', nom: 'Zone à éviter', de: 3, a: TERRAIN.ligneService, couleur: 0xff6b57 },
  { id: 'defense', nom: 'Défense : 1 à 1,5 m de la vitre', de: L / 2 - 1.5, a: L / 2 - 1, couleur: 0x5cb2e3 },
]);
export function creerZones() {
  const groupe = new THREE.Group();
  groupe.name = 'zones';
  ZONES.forEach(zone => [-1, 1].forEach(s => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(W, zone.a - zone.de),
      new THREE.MeshBasicMaterial({ color: zone.couleur, transparent: true, opacity: 0.55, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.set(0, 0.012, s * (zone.de + zone.a) / 2); m.renderOrder = 1;
    groupe.add(m);
  }));
  groupe.visible = false;
  return groupe;
}

export function creerLumieres(scene, qualite) {
  scene.add(new THREE.HemisphereLight(0xeef3ff, 0x3a4256, 1.8));
  // Projecteurs de salle : une lumière directionnelle principale qui porte les ombres
  const soleil = new THREE.DirectionalLight(0xffffff, 2.4);
  soleil.position.set(6, 14, -4);
  const c = soleil.shadow.camera; c.left = -8; c.right = 8; c.top = 12; c.bottom = -12; c.near = 1; c.far = 40;
  soleil.shadow.bias = -0.0005; soleil.shadow.normalBias = 0.02;
  regler(soleil, qualite);
  scene.add(soleil);
  const appoint = new THREE.DirectionalLight(0xbcd4ff, 1.0); appoint.position.set(-8, 10, 8); scene.add(appoint);
  return soleil;
}
// Ombres de la lumière principale selon la qualité (appelé aussi quand le visiteur change la qualité)
export function regler(soleil, qualite) {
  soleil.castShadow = qualite.ombres;
  if (qualite.ombres && soleil.shadow.mapSize.x !== qualite.tailleOmbres) {
    soleil.shadow.mapSize.set(qualite.tailleOmbres, qualite.tailleOmbres);
    if (soleil.shadow.map) { soleil.shadow.map.dispose(); soleil.shadow.map = null; }
  }
}
