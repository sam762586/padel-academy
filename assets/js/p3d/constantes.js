/* SIMULATEUR 3D · Dimensions et constantes physiques (sans dépendance, testées par scripts/verifier-simulateur-3d.cjs)
   Source des dimensions : FIP, Rules of Padel (application au 01.01.2026), sections Dimensions, Net, Enclosures, Access, The ball.
   Repère du simulateur : mètres ; x en largeur (-5 à 5), z en longueur (-10 à 10, filet en z = 0), y en hauteur.
   L'équipe A (le joueur suivi) défend le côté z < 0. */
export const TERRAIN = Object.freeze({
  longueur: 20,            // intérieur
  largeur: 10,
  ligneService: 6.95,      // distance au filet
  largeurLigne: 0.05,
  filetCentre: 0.88,
  filetPoteaux: 0.92,
  fondVitre: 3,            // fonds : 3 m de mur, puis grillage jusqu'à 4 m
  hauteurTotale: 4,
  // Côtés, variante 1 : marches vitrées à chaque bout (3 m de haut sur 2 m, puis 2 m de haut sur 2 m),
  // grillage jusqu'à 3 m sur les 6 m du centre et jusqu'à 4 m ailleurs
  marche1: { longueur: 2, hauteur: 3 },
  marche2: { longueur: 2, hauteur: 2 },
  grillageCentre: { longueur: 6, hauteur: 3 },
  // Accès latéraux : non simulés (la balle y rebondit comme sur le grillage), voir la documentation
});

export const BALLE = Object.freeze({
  diametre: 0.065,         // entre 6,35 et 6,77 cm
  masse: 0.057,            // entre 56 et 59,4 g
  // Rebond réglementaire : lâchée de 2,54 m, elle remonte entre 1,35 et 1,45 m. On vise 1,40 m : sans air, ce serait
  // √(1,40 / 2,54) ≈ 0,742 ; avec le freinage de l'air ci-dessous, la valeur calibrée (par dichotomie) est 0,769
  restitutionSol: 0.769,
});

// Approximations (documentées, à ne pas présenter comme une mesure) :
export const PHYSIQUE = Object.freeze({
  gravite: 9.81,
  pas: 1 / 240,            // pas fixe : même trajectoire quelle que soit la fréquence d'affichage
  // Freinage de l'air : k = ½·ρ·Cx·S / m, avec ρ = 1,2 kg/m³, Cx ≈ 0,55, S = π·(0,0325 m)², m = 0,057 kg
  trainee: 0.5 * 1.2 * 0.55 * Math.PI * 0.0325 * 0.0325 / 0.057,
  frottementSol: 0.85,     // vitesse horizontale gardée au rebond sur le sol
  restitutionVitre: 0.72,  // vitre : rebond franc
  frottementVitre: 0.9,
  restitutionGrille: 0.3,  // grillage : la balle meurt
  frottementGrille: 0.6,
  restitutionFilet: 0.15,
});

export const RAQUETTE = Object.freeze({ longueur: 0.455, largeur: 0.26, epaisseur: 0.038 });

// Hauteur du filet à la position x (0,88 m au centre, 0,92 m aux poteaux)
export const hauteurFilet = x => TERRAIN.filetCentre + (TERRAIN.filetPoteaux - TERRAIN.filetCentre) * Math.min(1, Math.abs(x) / (TERRAIN.largeur / 2));

// Côtés : hauteur de la vitre et de l'enceinte à la position z
export function paroiLaterale(z) {
  const d = TERRAIN.longueur / 2 - Math.abs(z); // distance au fond
  const vitre = d < TERRAIN.marche1.longueur ? TERRAIN.marche1.hauteur
    : d < TERRAIN.marche1.longueur + TERRAIN.marche2.longueur ? TERRAIN.marche2.hauteur : 0;
  const haut = Math.abs(z) < TERRAIN.grillageCentre.longueur / 2 ? TERRAIN.grillageCentre.hauteur : TERRAIN.hauteurTotale;
  return { vitre, haut };
}
