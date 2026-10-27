/* SIMULATEUR 3D · Terrain (Three.js), aux dimensions de constantes.js (FIP)
   Sol bleu et lignes (texture générée), vitres transparentes, grillage (texture ajourée générée), poteaux et structure,
   filet et sa bande blanche, éclairage, décor discret. Aucune image externe : toutes les textures sont dessinées ici. */
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

export function creerTerrain(qualite) {
  const groupe = new THREE.Group();
  groupe.name = 'terrain';
  // Sol du terrain et abords
  const sol = new THREE.Mesh(new THREE.PlaneGeometry(W, L), new THREE.MeshStandardMaterial({ map: textureSol(), roughness: 0.95 }));
  sol.rotation.x = -Math.PI / 2; sol.receiveShadow = true; groupe.add(sol);
  const abords = new THREE.Mesh(new THREE.PlaneGeometry(W + 14, L + 16), new THREE.MeshStandardMaterial({ color: 0x2a2f38, roughness: 1 }));
  abords.rotation.x = -Math.PI / 2; abords.position.y = -0.005; abords.receiveShadow = true; groupe.add(abords);
  // Vitres et grillage
  const verre = new THREE.MeshStandardMaterial({ color: 0xcfe8ff, transparent: true, opacity: 0.16, roughness: 0.05, metalness: 0, depthWrite: false, side: THREE.DoubleSide });
  const metal = new THREE.MeshStandardMaterial({ color: 0x2b2f36, roughness: 0.6, metalness: 0.6 });
  const texG = textureGrillage();
  const grille = (largeur, hauteur) => {
    const t = texG.clone(); t.repeat.set(largeur * 6, hauteur * 6); t.needsUpdate = true;
    return new THREE.MeshStandardMaterial({ map: t, alphaTest: 0.5, transparent: false, side: THREE.DoubleSide, roughness: 0.7, metalness: 0.4 });
  };
  const panneau = (largeur, hauteur, materiau, x, y, z, ry) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(largeur, hauteur), materiau);
    m.position.set(x, y, z); m.rotation.y = ry; m.renderOrder = materiau === verre ? 2 : 0; groupe.add(m); return m;
  };
  // Fonds : 3 m de vitre, puis 1 m de grillage
  [-1, 1].forEach(s => {
    panneau(W, TERRAIN.fondVitre, verre, 0, TERRAIN.fondVitre / 2, s * L / 2, 0);
    panneau(W, TERRAIN.hauteurTotale - TERRAIN.fondVitre, grille(W, 1), 0, TERRAIN.fondVitre + 0.5, s * L / 2, 0);
  });
  // Côtés, par tronçons de 1 m : vitre en bas, grillage au-dessus jusqu'à la hauteur de l'enceinte
  [-1, 1].forEach(sx => {
    for (let z = -L / 2; z < L / 2; z += 1) {
      const zc = z + 0.5, paroi = paroiLaterale(zc);
      if (paroi.vitre > 0) panneau(1, paroi.vitre, verre, sx * W / 2, paroi.vitre / 2, zc, Math.PI / 2);
      const hg = paroi.haut - paroi.vitre;
      if (hg > 0) panneau(1, hg, grille(1, hg), sx * W / 2, paroi.vitre + hg / 2, zc, Math.PI / 2);
    }
  });
  // Montants verticaux tous les 2 m et lisses hautes
  const montant = new THREE.CylinderGeometry(0.04, 0.04, 1, 8);
  const ajouterMontant = (x, z, h) => { const m = new THREE.Mesh(montant, metal); m.scale.y = h; m.position.set(x, h / 2, z); m.castShadow = qualite.ombres; groupe.add(m); };
  for (let z = -L / 2; z <= L / 2 + 0.01; z += 2) [-1, 1].forEach(sx => ajouterMontant(sx * W / 2, z, paroiLaterale(Math.min(Math.abs(z), L / 2 - 0.01) * Math.sign(z || 1)).haut));
  for (let x = -W / 2 + 2; x < W / 2; x += 2) [-1, 1].forEach(s => ajouterMontant(x, s * L / 2, TERRAIN.hauteurTotale));
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
  [-1, 1].forEach(s => { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.05, 12), metal); p.position.set(s * (W / 2 + 0.03), 0.525, 0); p.castShadow = qualite.ombres; groupe.add(p); });
  // Décor discret : murs de la salle et bancs
  const salle = new THREE.MeshStandardMaterial({ color: 0x1b2230, roughness: 1, side: THREE.BackSide });
  const boite = new THREE.Mesh(new THREE.BoxGeometry(W + 14, 12, L + 16), salle); boite.position.y = 5.9; groupe.add(boite); // fond sous le sol
  const banc = new THREE.MeshStandardMaterial({ color: 0x3a4250, roughness: 0.8 });
  [-1, 1].forEach(s => { const b = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 2.2), banc); b.position.set(s * (W / 2 + 1.6), 0.225, 0); b.castShadow = qualite.ombres; groupe.add(b); });
  return groupe;
}

export function creerLumieres(scene, qualite) {
  scene.add(new THREE.HemisphereLight(0xeef3ff, 0x30343c, 1.6));
  // Projecteurs de salle : une lumière directionnelle principale qui porte les ombres
  const soleil = new THREE.DirectionalLight(0xffffff, 2.6);
  soleil.position.set(6, 14, -4);
  soleil.castShadow = qualite.ombres;
  if (qualite.ombres) {
    soleil.shadow.mapSize.set(qualite.tailleOmbres, qualite.tailleOmbres);
    const c = soleil.shadow.camera; c.left = -8; c.right = 8; c.top = 12; c.bottom = -12; c.near = 1; c.far = 40;
    soleil.shadow.bias = -0.0005; soleil.shadow.normalBias = 0.02;
  }
  scene.add(soleil);
  const appoint = new THREE.DirectionalLight(0xbcd4ff, 0.9); appoint.position.set(-8, 10, 8); scene.add(appoint);
  return soleil;
}
