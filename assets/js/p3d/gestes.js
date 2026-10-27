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
// Gestes « v2 » (facultatif, tous ensemble) : penche (buste vers l'avant, négatif vers l'arrière), inclinaison (épaule droite
// qui descend), gAvant / gCote / gCoude (bras gauche, mêmes conventions que le bras droit, en miroir) ; avec eux, la rotation
// des épaules est répartie sur toute la colonne (joueurs.js).
export const GESTES = Object.freeze({
  lob: {
    nom: 'Lob', statut: 'simplifie',
    phases: ['Préparation basse, raquette sous la balle', 'Contact devant le corps, tamis ouvert', 'Accompagnement vers le haut et vers la cible'],
    tronc: [0, -45, -5, 25, 0], avant: [15, -10, 25, 115, 20], cote: [15, 25, 30, 35, 15], coude: [40, 25, 10, 35, 50], poignet: [45, 15, 0, 20, 45], genoux: [10, 30, 25, 10, 10],
    // v2 : épaule droite qui descend sous la balle, puis le buste se redresse en accompagnant vers le haut
    penche: [5, 18, 10, -4, 0], inclinaison: [0, 10, 6, -2, 0], gAvant: [20, 50, 35, 25, 20], gCote: [10, -15, 15, 25, 10], gCoude: [45, 35, 45, 55, 50],
  },
  bandeja: {
    nom: 'Bandeja', statut: 'simplifie',
    phases: ['Profil, épaule gauche vers le filet, raquette armée derrière la tête', 'Contact devant et sur le côté droit, bras presque tendu', 'Accompagnement en travers vers le bas, sans casser le poignet'],
    tronc: [0, -80, -30, 10, 0], avant: [15, 80, 150, 70, 20], cote: [15, 70, 30, 25, 15], coude: [40, 110, 15, 30, 50], poignet: [45, 40, 5, 10, 45], genoux: [10, 20, 10, 10, 10],
    // v2 : buste légèrement en arrière à l'armé, main gauche qui pointe la balle, puis le buste revient vers l'avant
    penche: [0, -10, -4, 8, 0], inclinaison: [0, 10, 4, -4, 0], gAvant: [20, 135, 110, 40, 20], gCote: [10, 15, 25, 10, 10], gCoude: [45, 15, 25, 60, 50],
  },
  sortie_vitre: {
    nom: 'Sortie de vitre', statut: 'simplifie',
    phases: ['Laisser la balle sortir de la vitre, se placer derrière elle', 'Genoux fléchis, frappe en remontant', 'Accompagnement vers le haut (lob) ou vers l\'avant (balle basse)'],
    tronc: [0, -50, -10, 20, 0], avant: [15, -15, 20, 95, 20], cote: [15, 25, 30, 35, 15], coude: [40, 30, 15, 35, 50], poignet: [45, 15, 0, 20, 45], genoux: [15, 40, 35, 15, 10],
    // v2 : buste penché et épaule droite basse derrière la balle, main gauche devant pour l'équilibre, puis on se redresse
    penche: [5, 15, 12, 0, 0], inclinaison: [0, 10, 6, 0, 0], gAvant: [20, 50, 30, 25, 20], gCote: [10, -15, 15, 25, 10], gCoude: [45, 35, 45, 55, 50],
  },
  volee_cd: {
    nom: 'Volée de coup droit', statut: 'simplifie',
    phases: ['Raquette haute devant soi, petite préparation', 'Contact devant le corps, poignet ferme', 'Accompagnement court vers la cible'],
    tronc: [0, -25, -5, 5, 0], avant: [20, 25, 55, 60, 20], cote: [20, 45, 35, 30, 20], coude: [60, 70, 25, 25, 55], poignet: [45, 45, 25, 25, 45], genoux: [15, 20, 25, 15, 10],
    // v2 : buste penché vers la balle, main gauche devant qui accompagne la petite préparation
    penche: [8, 10, 12, 8, 5], inclinaison: [0, 3, 4, 2, 0], gAvant: [30, 55, 45, 40, 20], gCote: [10, -15, 5, 10, 10], gCoude: [50, 50, 60, 60, 50],
  },
  coup_droit: {
    nom: 'Coup droit', statut: 'simplifie',
    phases: ['Épaules tournées, raquette en arrière à hauteur de hanche', 'Contact devant la jambe avant, genoux fléchis', 'Accompagnement vers l\'avant et en travers, vers la cible'],
    tronc: [0, -70, -10, 40, 0], avant: [15, -20, 45, 60, 20], cote: [15, 60, 50, -30, 15], coude: [40, 40, 15, 55, 50], poignet: [45, 30, 10, 30, 45], genoux: [10, 35, 30, 15, 10],
    // v2 : buste penché vers la balle, main gauche devant (elle accompagne la rotation), qui revient contre le corps à la frappe
    penche: [5, 14, 18, 10, 5], inclinaison: [0, 6, 8, 0, 0], gAvant: [20, 55, 30, 45, 20], gCote: [10, -20, 25, 5, 10], gCoude: [45, 25, 50, 70, 50],
  },
  revers: {
    nom: 'Revers', statut: 'simplifie',
    phases: ['Épaules tournées vers la gauche, raquette en arrière côté revers', 'Contact devant le corps, bras presque tendu', 'Accompagnement vers l\'avant, les épaules s\'ouvrent'],
    tronc: [0, 70, 15, -25, 0], avant: [15, 15, 45, 70, 20], cote: [15, -60, -40, 30, 15], coude: [40, 70, 15, 35, 50], poignet: [45, 30, 10, 30, 45], genoux: [10, 30, 25, 15, 10],
    // v2 : main gauche sur le cœur de la raquette à la préparation, puis elle part en arrière pour équilibrer la frappe
    penche: [5, 12, 15, 8, 5], inclinaison: [0, 4, 6, 0, 0], gAvant: [25, 35, -20, -10, 20], gCote: [10, 10, 35, 40, 10], gCoude: [45, 85, 20, 30, 50],
  },
  volee_revers: {
    nom: 'Volée de revers', statut: 'simplifie',
    phases: ['Raquette haute côté revers, épaules légèrement tournées', 'Contact devant le corps, poignet ferme', 'Accompagnement court vers la cible'],
    tronc: [0, 45, 10, 0, 0], avant: [20, 35, 55, 60, 20], cote: [20, -35, -30, -20, 20], coude: [60, 80, 25, 25, 55], poignet: [45, 45, 25, 25, 45], genoux: [15, 20, 25, 15, 10],
    // v2 : main gauche sur le cœur de la raquette à la préparation, lâchée en arrière au contact
    penche: [8, 10, 12, 8, 5], inclinaison: [0, -2, 2, 0, 0], gAvant: [30, 40, 0, -5, 20], gCote: [10, -5, 30, 30, 10], gCoude: [50, 85, 25, 30, 50],
  },
  vibora: {
    nom: 'Víbora', statut: 'simplifie',
    phases: ['Profil, raquette armée derrière l\'épaule, plus bas que pour la bandeja', 'Contact sur le côté droit, à hauteur d\'épaule, en coupant la balle', 'Accompagnement en travers vers la gauche, le bras traverse le corps'],
    tronc: [0, -75, -20, 25, 0], avant: [15, 85, 120, 50, 20], cote: [15, 75, 60, -15, 15], coude: [40, 115, 10, 25, 50], poignet: [45, 55, 0, 30, 45], genoux: [10, 15, 10, 10, 10],
    // v2 : comme la bandeja, la main gauche pointe la balle, puis le buste tourne et se penche en coupant la balle
    penche: [0, -6, 0, 12, 0], inclinaison: [0, 8, 2, -6, 0], gAvant: [20, 120, 85, 30, 20], gCote: [10, 15, 25, 30, 10], gCoude: [45, 15, 30, 70, 50],
  },
  smash: {
    nom: 'Smash', statut: 'simplifie',
    phases: ['Profil, raquette tombée derrière la tête, coude haut', 'Contact au plus haut, devant la tête, bras tendu', 'Accompagnement vers le bas et vers la gauche, les épaules ont tourné'],
    tronc: [0, -80, 0, 40, 0], avant: [15, 120, 165, 35, 20], cote: [15, 60, 15, -35, 15], coude: [40, 130, 5, 25, 50], poignet: [45, 70, 0, 15, 45], genoux: [10, 25, 5, 15, 10],
    // v2 : main gauche tendue vers la balle, ramenée contre le corps au contact pour lancer la rotation, buste cambré puis vers l'avant
    penche: [0, -15, 5, 20, 0], inclinaison: [0, 15, -5, -5, 0], gAvant: [20, 150, 60, 20, 20], gCote: [10, 10, 20, 15, 10], gCoude: [45, 15, 80, 70, 50],
  },
  defense_double_vitre: {
    nom: 'Défense après double vitre', statut: 'simplifie',
    phases: ['Suivre la balle dans l\'angle, très bas sur les jambes', 'Contact tard, en remontant sous la balle', 'Accompagnement vers le haut : lob ou balle lente au centre'],
    tronc: [0, -60, -15, 25, 0], avant: [15, -20, 15, 105, 20], cote: [15, 35, 35, 30, 15], coude: [40, 30, 15, 40, 50], poignet: [45, 15, 0, 25, 45], genoux: [15, 45, 40, 15, 10],
    // v2 : buste très penché dans l'angle, main gauche écartée pour l'équilibre, puis on se redresse sous la balle
    penche: [5, 20, 15, 0, 0], inclinaison: [0, 12, 8, 0, 0], gAvant: [20, 45, 30, 20, 20], gCote: [10, -10, 20, 30, 10], gCoude: [45, 40, 50, 55, 50],
  },
  service: {
    nom: 'Service', statut: 'simplifie',
    phases: ['De profil, laisser rebondir la balle, raquette en arrière', 'Contact sous la taille, devant le pied avant', 'Accompagnement vers la cible, dans la diagonale'],
    tronc: [0, -50, -10, 30, 0], avant: [15, -25, 30, 60, 20], cote: [15, 45, 35, 0, 15], coude: [40, 25, 10, 30, 50], poignet: [45, 20, 5, 20, 45], genoux: [10, 25, 20, 10, 10],
    // v2 : la main gauche lâche la balle devant soi, puis s'écarte pendant que le buste se penche sur la frappe
    penche: [5, 12, 15, 8, 5], inclinaison: [0, 6, 8, 2, 0], gAvant: [45, 30, 15, 20, 20], gCote: [10, 15, 25, 20, 10], gCoude: [40, 30, 25, 40, 50],
  },
  retour: {
    nom: 'Retour de service', statut: 'simplifie',
    phases: ['Petite préparation, épaules tournées', 'Contact devant, genoux fléchis', 'Accompagnement vers l\'avant pour viser les pieds ou le lob'],
    tronc: [0, -45, -5, 25, 0], avant: [20, 5, 45, 75, 20], cote: [20, 55, 40, -10, 20], coude: [55, 45, 15, 60, 55], poignet: [45, 30, 10, 35, 45], genoux: [15, 35, 25, 15, 10],
    // v2 : comme un coup droit court : buste vers la balle, main gauche devant qui revient contre le corps
    penche: [8, 12, 14, 8, 5], inclinaison: [0, 4, 6, 0, 0], gAvant: [30, 50, 30, 40, 20], gCote: [10, -20, 20, 10, 10], gCoude: [50, 30, 50, 65, 50],
  },
  gancho: {
    nom: 'Gancho', statut: 'simplifie',
    phases: ['Lob très haut et profond : profil, raquette armée haute derrière la tête', 'Contact au-dessus de la tête, bras tendu, la raquette « crochète » la balle', 'Le bras repasse au-dessus de la tête, balle lente et profonde'],
    tronc: [0, -50, -20, 10, 0], avant: [15, 120, 175, 120, 20], cote: [15, 40, -5, -40, 15], coude: [40, 120, 10, 60, 50], poignet: [45, 60, 10, 30, 45], genoux: [10, 20, 5, 10, 10],
    // v2 : main gauche qui pointe le lob très haut, buste cambré, puis l'épaule droite monte au contact
    penche: [0, -12, -6, 5, 0], inclinaison: [0, 12, -8, -4, 0], gAvant: [20, 140, 90, 30, 20], gCote: [10, 10, 20, 25, 10], gCoude: [45, 15, 40, 65, 50],
  },
  bajada: {
    nom: 'Bajada', statut: 'simplifie',
    phases: ['La balle ressort haute de la vitre : épaules tournées, raquette armée haute', 'Contact à hauteur d\'épaule, en descendant sur la balle', 'Accompagnement vers l\'avant et vers le bas, on continue d\'avancer'],
    tronc: [0, -70, -15, 30, 0], avant: [15, 70, 100, 60, 20], cote: [15, 80, 50, -30, 15], coude: [40, 100, 15, 40, 50], poignet: [45, 50, 10, 30, 45], genoux: [10, 20, 15, 10, 10],
    // v2 : main gauche qui vise la balle sortie de la vitre, puis le buste descend vers l'avant avec la frappe
    penche: [0, 0, 8, 12, 5], inclinaison: [0, 8, 3, -3, 0], gAvant: [20, 100, 60, 35, 20], gCote: [10, -10, 20, 25, 10], gCoude: [45, 20, 45, 65, 50],
  },
  amorti: {
    nom: 'Amorti', statut: 'simplifie',
    phases: ['Raquette devant soi, tamis ouvert, aucune préparation', 'Contact souple : on absorbe la vitesse de la balle', 'Presque pas d\'accompagnement, la balle tombe juste derrière le filet'],
    tronc: [0, -15, -5, 0, 0], avant: [20, 40, 55, 50, 20], cote: [20, 40, 35, 35, 20], coude: [60, 70, 35, 35, 55], poignet: [45, 55, 40, 45, 45], genoux: [15, 20, 25, 20, 10],
    // v2 : presque immobile : buste légèrement vers la balle, main gauche devant
    penche: [8, 10, 12, 10, 5], inclinaison: [0, 2, 3, 2, 0], gAvant: [30, 45, 40, 35, 20], gCote: [10, -10, 0, 5, 10], gCoude: [50, 50, 55, 55, 50],
  },
  volee_basse: {
    nom: 'Volée basse', statut: 'simplifie',
    phases: ['Très bas sur les jambes, raquette ouverte devant soi', 'Contact sous le niveau du filet, sans frapper', 'Court accompagnement vers le haut et la profondeur, on continue de monter'],
    tronc: [0, -20, -5, 5, 0], avant: [20, 5, 15, 30, 20], cote: [20, 40, 35, 30, 20], coude: [60, 45, 25, 30, 55], poignet: [45, 40, 30, 35, 45], genoux: [15, 40, 50, 30, 10],
    // v2 : buste très penché au-dessus de la balle basse, main gauche écartée pour rester équilibré
    penche: [10, 20, 25, 15, 5], inclinaison: [0, 5, 8, 4, 0], gAvant: [30, 45, 40, 35, 20], gCote: [10, 10, 25, 25, 10], gCoude: [50, 45, 45, 50, 50],
  },
});

// Valeurs des gestes v2 (facultatives)
export const V2 = Object.freeze(['penche', 'inclinaison', 'gAvant', 'gCote', 'gCoude']);

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
  ['tronc', 'avant', 'cote', 'coude', 'poignet', 'genoux'].concat(V2.filter(k => g[k])).forEach(k => { r[k] = g[k][i] + (g[k][i + 1] - g[k][i]) * s; });
  return r;
}
