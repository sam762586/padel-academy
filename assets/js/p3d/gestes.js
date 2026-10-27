/* SIMULATEUR 3D · Gestes techniques (données, sans rendu)
   Chaque geste est décrit par des angles (degrés) sur cinq instants autour du contact :
     -1 début de préparation, -0.4 armé, 0 contact, 0.5 accompagnement, 1 retour en position.
   Les angles sont abstraits (rotation des épaules, bras levé vers l'avant ou sur le côté, flexion du coude, flexion des
   genoux) et appliqués aux os du personnage par joueurs.js. Statut honnête :
     - "simplifie" : mouvement crédible mais schématique (pas une capture de mouvement) ;
     - "a_venir"   : pas encore construit : le joueur reste en position d'attente, et l'interface le signale.
   Les gestes pourront être remplacés par des animations réalisées dans Blender (même nom, voir joueurs.js). */
export const INSTANTS = [-1, -0.4, 0, 0.5, 1];

// tronc : rotation des épaules (négatif = épaules tournées vers la droite, préparation coup droit)
// avant : bras levé vers l'avant ; cote : bras écarté sur le côté ; coude : flexion ; poignet : raquette relevée par rapport
// à l'avant-bras ; genoux : flexion
export const GESTES = Object.freeze({
  lob: {
    nom: 'Lob', statut: 'simplifie',
    phases: ['Préparation basse, raquette sous la balle', 'Contact devant le corps, tamis ouvert', 'Accompagnement vers le haut et vers la cible'],
    tronc: [0, -45, -5, 25, 0], avant: [15, -10, 25, 115, 20], cote: [15, 25, 30, 35, 15], coude: [40, 25, 10, 35, 50], poignet: [45, 15, 0, 20, 45], genoux: [10, 30, 25, 10, 10],
  },
  bandeja: {
    nom: 'Bandeja', statut: 'simplifie',
    phases: ['Profil, épaule gauche vers le filet, raquette armée derrière la tête', 'Contact devant et sur le côté droit, bras presque tendu', 'Accompagnement en travers vers le bas, sans casser le poignet'],
    tronc: [0, -70, -25, 10, 0], avant: [15, 80, 150, 70, 20], cote: [15, 70, 30, 25, 15], coude: [40, 110, 15, 30, 50], poignet: [45, 40, 5, 10, 45], genoux: [10, 15, 10, 10, 10],
  },
  sortie_vitre: {
    nom: 'Sortie de vitre', statut: 'simplifie',
    phases: ['Laisser la balle sortir de la vitre, se placer derrière elle', 'Genoux fléchis, frappe en remontant', 'Accompagnement vers le haut (lob) ou vers l\'avant (balle basse)'],
    tronc: [0, -50, -10, 20, 0], avant: [15, -15, 20, 95, 20], cote: [15, 25, 30, 35, 15], coude: [40, 30, 15, 35, 50], poignet: [45, 15, 0, 20, 45], genoux: [15, 40, 35, 15, 10],
  },
  volee_cd: {
    nom: 'Volée de coup droit', statut: 'simplifie',
    phases: ['Raquette haute devant soi, petite préparation', 'Contact devant le corps, poignet ferme', 'Accompagnement court vers la cible'],
    tronc: [0, -25, -5, 5, 0], avant: [20, 25, 55, 60, 20], cote: [20, 45, 35, 30, 20], coude: [60, 70, 25, 25, 55], poignet: [45, 45, 25, 25, 45], genoux: [15, 20, 25, 15, 10],
  },
  coup_droit: {
    nom: 'Coup droit', statut: 'simplifie',
    phases: ['Épaules tournées, raquette en arrière à hauteur de hanche', 'Contact devant la jambe avant, genoux fléchis', 'Accompagnement vers l\'avant et en travers, vers la cible'],
    tronc: [0, -60, -10, 35, 0], avant: [15, -20, 45, 80, 20], cote: [15, 60, 50, -30, 15], coude: [40, 40, 15, 75, 50], poignet: [45, 30, 10, 30, 45], genoux: [10, 30, 25, 15, 10],
  },
  revers: {
    nom: 'Revers', statut: 'simplifie',
    phases: ['Épaules tournées vers la gauche, raquette en arrière côté revers', 'Contact devant le corps, bras presque tendu', 'Accompagnement vers l\'avant, les épaules s\'ouvrent'],
    tronc: [0, 70, 15, -25, 0], avant: [15, 15, 45, 70, 20], cote: [15, -60, -40, 30, 15], coude: [40, 70, 15, 35, 50], poignet: [45, 30, 10, 30, 45], genoux: [10, 30, 25, 15, 10],
  },
  volee_revers: {
    nom: 'Volée de revers', statut: 'simplifie',
    phases: ['Raquette haute côté revers, épaules légèrement tournées', 'Contact devant le corps, poignet ferme', 'Accompagnement court vers la cible'],
    tronc: [0, 45, 10, 0, 0], avant: [20, 35, 55, 60, 20], cote: [20, -35, -30, -20, 20], coude: [60, 80, 25, 25, 55], poignet: [45, 45, 25, 25, 45], genoux: [15, 20, 25, 15, 10],
  },
  vibora: {
    nom: 'Víbora', statut: 'simplifie',
    phases: ['Profil, raquette armée derrière l\'épaule, plus bas que pour la bandeja', 'Contact sur le côté droit, à hauteur d\'épaule, en coupant la balle', 'Accompagnement en travers vers la gauche, le bras traverse le corps'],
    tronc: [0, -75, -20, 25, 0], avant: [15, 85, 120, 50, 20], cote: [15, 75, 60, -15, 15], coude: [40, 115, 10, 25, 50], poignet: [45, 55, 0, 30, 45], genoux: [10, 15, 10, 10, 10],
  },
  smash: {
    nom: 'Smash', statut: 'simplifie',
    phases: ['Profil, raquette tombée derrière la tête, coude haut', 'Contact au plus haut, devant la tête, bras tendu', 'Accompagnement vers le bas et vers la gauche, les épaules ont tourné'],
    tronc: [0, -80, 0, 40, 0], avant: [15, 120, 165, 35, 20], cote: [15, 60, 15, -35, 15], coude: [40, 130, 5, 25, 50], poignet: [45, 70, 0, 15, 45], genoux: [10, 25, 5, 15, 10],
  },
  defense_double_vitre: {
    nom: 'Défense après double vitre', statut: 'simplifie',
    phases: ['Suivre la balle dans l\'angle, très bas sur les jambes', 'Contact tard, en remontant sous la balle', 'Accompagnement vers le haut : lob ou balle lente au centre'],
    tronc: [0, -60, -15, 25, 0], avant: [15, -20, 15, 105, 20], cote: [15, 35, 35, 30, 15], coude: [40, 30, 15, 40, 50], poignet: [45, 15, 0, 25, 45], genoux: [15, 45, 40, 15, 10],
  },
  service: {
    nom: 'Service', statut: 'simplifie',
    phases: ['De profil, laisser rebondir la balle, raquette en arrière', 'Contact sous la taille, devant le pied avant', 'Accompagnement vers la cible, dans la diagonale'],
    tronc: [0, -50, -10, 30, 0], avant: [15, -25, 30, 60, 20], cote: [15, 45, 35, 0, 15], coude: [40, 25, 10, 30, 50], poignet: [45, 20, 5, 20, 45], genoux: [10, 25, 20, 10, 10],
  },
  retour: {
    nom: 'Retour de service', statut: 'simplifie',
    phases: ['Petite préparation, épaules tournées', 'Contact devant, genoux fléchis', 'Accompagnement vers l\'avant pour viser les pieds ou le lob'],
    tronc: [0, -45, -5, 25, 0], avant: [20, 5, 45, 75, 20], cote: [20, 55, 40, -10, 20], coude: [55, 45, 15, 60, 55], poignet: [45, 30, 10, 35, 45], genoux: [15, 35, 25, 15, 10],
  },
  gancho: {
    nom: 'Gancho', statut: 'simplifie',
    phases: ['Lob très haut et profond : profil, raquette armée haute derrière la tête', 'Contact au-dessus de la tête, bras tendu, la raquette « crochète » la balle', 'Le bras repasse au-dessus de la tête, balle lente et profonde'],
    tronc: [0, -50, -20, 10, 0], avant: [15, 120, 175, 120, 20], cote: [15, 40, -5, -40, 15], coude: [40, 120, 10, 60, 50], poignet: [45, 60, 10, 30, 45], genoux: [10, 20, 5, 10, 10],
  },
  bajada: {
    nom: 'Bajada', statut: 'simplifie',
    phases: ['La balle ressort haute de la vitre : épaules tournées, raquette armée haute', 'Contact à hauteur d\'épaule, en descendant sur la balle', 'Accompagnement vers l\'avant et vers le bas, on continue d\'avancer'],
    tronc: [0, -70, -15, 30, 0], avant: [15, 70, 100, 60, 20], cote: [15, 80, 50, -30, 15], coude: [40, 100, 15, 40, 50], poignet: [45, 50, 10, 30, 45], genoux: [10, 20, 15, 10, 10],
  },
  amorti: {
    nom: 'Amorti', statut: 'simplifie',
    phases: ['Raquette devant soi, tamis ouvert, aucune préparation', 'Contact souple : on absorbe la vitesse de la balle', 'Presque pas d\'accompagnement, la balle tombe juste derrière le filet'],
    tronc: [0, -15, -5, 0, 0], avant: [20, 40, 55, 50, 20], cote: [20, 40, 35, 35, 20], coude: [60, 70, 35, 35, 55], poignet: [45, 55, 40, 45, 45], genoux: [15, 20, 25, 20, 10],
  },
  volee_basse: {
    nom: 'Volée basse', statut: 'simplifie',
    phases: ['Très bas sur les jambes, raquette ouverte devant soi', 'Contact sous le niveau du filet, sans frapper', 'Court accompagnement vers le haut et la profondeur, on continue de monter'],
    tronc: [0, -20, -5, 5, 0], avant: [20, 5, 15, 30, 20], cote: [20, 40, 35, 30, 20], coude: [60, 45, 25, 30, 55], poignet: [45, 40, 30, 35, 45], genoux: [15, 40, 50, 30, 10],
  },
});

// Garde (position d'attente) : raquette devant la poitrine
export const GARDE = Object.freeze({ tronc: 0, avant: 20, cote: 15, coude: 55, poignet: 45, genoux: 12 });

// Angles du geste à la phase p (-1 à 1) ; geste « à venir » : garde
export function angles(geste, p) {
  const g = GESTES[geste];
  if (!g || g.statut === 'a_venir') return { ...GARDE };
  const q = Math.max(-1, Math.min(1, p));
  let i = 0;
  while (i < INSTANTS.length - 2 && q > INSTANTS[i + 1]) i++;
  const u = (q - INSTANTS[i]) / (INSTANTS[i + 1] - INSTANTS[i]), s = u * u * (3 - 2 * u);
  const r = {};
  ['tronc', 'avant', 'cote', 'coude', 'poignet', 'genoux'].forEach(k => { r[k] = g[k][i] + (g[k][i + 1] - g[k][i]) * s; });
  return r;
}
