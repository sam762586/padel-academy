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
  coup_droit: { nom: 'Coup droit', statut: 'a_venir' },
  revers: { nom: 'Revers', statut: 'a_venir' },
  volee_revers: { nom: 'Volée de revers', statut: 'a_venir' },
  vibora: { nom: 'Víbora', statut: 'a_venir' },
  smash: { nom: 'Smash', statut: 'a_venir' },
  defense_double_vitre: { nom: 'Défense après double vitre', statut: 'a_venir' },
  service: { nom: 'Service', statut: 'a_venir' },
  retour: { nom: 'Retour de service', statut: 'a_venir' },
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
