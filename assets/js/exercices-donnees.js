/* EXERCICES RECOMMANDÉS (espace joueur) : données lues par assets/js/exercices.js.
   3 exercices par thème du test de niveau (quiz-niveau.js : vitre, service, aerien, couple, placement,
   montee, regularite, transition, communication, compet), soit 30 exercices.
   - niveaux : paliers du test (1 = débutant P25, 2 = loisir P100, 3 = intermédiaire P250, 4 = P500 et +).
   - joueurs : "seul", "à 2" ou "à 4" ; un exercice "seul" se fait avec un panier de balles, un mur ou la vitre.
   - reussite : objectif mesurable, à compter pendant l'exercice.
   - lien : page interne du site (ancres vérifiées dans les .html), ou null.
   Repères terrain : 20 m × 10 m, ligne de service à 6,95 m du filet (donc à environ 3 m de la vitre du fond),
   zone offensive à 2–2,5 m du filet, défense à 1–1,5 m de la vitre. */
const EXERCICES=[
 /* ---------- Sorties de vitre ---------- */
 {id:"vitre-1",theme:"vitre",niveaux:[1,2],titre:"Lancer contre la vitre, laisser revenir",duree:"15 min",joueurs:"seul",
  consigne:"Place-toi à 2 m de la vitre du fond, de profil. Lance la balle à la main pour qu'elle rebondisse au sol puis touche la vitre, laisse-la revenir vers toi et frappe-la en lob vers le filet, quand elle redescend à hauteur de hanche. Fais 3 séries de 10 en coup droit, puis 3 séries de 10 en revers.",
  reussite:"7 balles sur 10 jouées après le retour de la vitre (aucune frappée avant) et qui passent le filet.",lien:"technique.html#coups-fond"},
 {id:"vitre-2",theme:"vitre",niveaux:[2,3],titre:"Sortie de vitre en lob profond",duree:"20 min",joueurs:"à 2",
  consigne:"Ton partenaire, au filet, t'envoie des balles qui rebondissent dans ton carré de service puis touchent la vitre du fond. Tu pivotes, tu accompagnes la balle en reculant à peine, et tu joues un lob qui doit retomber derrière la ligne de service adverse. Pose une serviette 1 m devant la vitre adverse comme cible. 3 séries de 15 balles, en alternant coup droit et revers.",
  reussite:"7 sorties de vitre sur 10 qui retombent au-delà de la ligne de service adverse, dont au moins 2 dans le mètre devant la vitre.",lien:"technique.html#coups-fond"},
 {id:"vitre-3",theme:"vitre",niveaux:[3,4],titre:"Sortie de vitre : bajada ou lob selon la balle",duree:"20 min",joueurs:"à 2",
  consigne:"Ton partenaire varie : balles hautes qui rebondissent fort sur la vitre, et balles plus courtes. Sur une balle qui ressort haute, tu attaques en bajada à plat dans les pieds du volleyeur ou au centre ; sur une balle qui ressort basse, tu lobes. Annonce « bajada » ou « lob » à voix haute avant la frappe. 4 séries de 12 balles.",
  reussite:"10 décisions justes sur 12 par série (choix validé par le partenaire) et pas plus de 2 fautes directes par série.",lien:"technique.html#coups-fond"},

 /* ---------- Service ---------- */
 {id:"service-1",theme:"service",niveaux:[1,2],titre:"Service régulier dans le carré",duree:"15 min",joueurs:"seul",
  consigne:"Prends un panier de 20 balles. Laisse rebondir la balle derrière ta ligne de service, frappe sous la ceinture, en diagonale, sans chercher la vitesse. Sers 10 balles depuis le côté droit, puis 10 depuis le côté gauche, et recommence.",
  reussite:"18 services sur 20 qui rebondissent dans le bon carré, avec zéro double faute sur une série de 10 doubles tentatives (premier et second service).",lien:"technique.html#coups-service"},
 {id:"service-2",theme:"service",niveaux:[2,3],titre:"Service ciblé : vitre latérale et T",duree:"15 min",joueurs:"seul",
  consigne:"Pose deux cibles dans le carré adverse : une à 1 m de la vitre latérale, l'autre près du T (le centre de la ligne de service). Sers avec un peu de slice pour que la balle reste basse après le rebond. 4 séries de 10 services, en alternant les deux cibles.",
  reussite:"6 services sur 10 qui rebondissent à moins d'1 m de la cible annoncée, et 9 sur 10 dans le carré.",lien:"technique.html#coups-service"},
 {id:"service-3",theme:"service",niveaux:[3,4],titre:"Service, montée et première volée",duree:"20 min",joueurs:"à 2",
  consigne:"Tu sers, puis tu montes en diagonale vers ta zone de filet, à petits pas, avec un split step au moment où le relanceur frappe. Ton partenaire relance en croisé, bas ou dans les pieds ; tu joues une première volée longue au centre ou vers la vitre latérale. 4 séries de 8 services, en variant zone et effet à chaque balle.",
  reussite:"6 premières volées sur 8 jouées à 2–3 m du filet (pas à mi-court) et qui retombent derrière la ligne de service adverse.",lien:"technique.html#coups-service"},

 /* ---------- Jeu aérien : bandeja, víbora, smash ---------- */
 {id:"aerien-1",theme:"aerien",niveaux:[1,2],titre:"Bandeja sur lancer à la main",duree:"15 min",joueurs:"seul",
  consigne:"Place-toi à 3 m du filet, de profil, épaule gauche vers le filet si tu es droitier. Lance la balle haut devant toi, recule en pas chassés (jamais de dos), et frappe à hauteur d'épaule en coupant la balle, raquette qui finit vers le filet. Cible : la moitié adverse côté vitre latérale. 3 séries de 10 balles.",
  reussite:"7 bandejas sur 10 qui rebondissent avant la vitre du fond adverse et restent sous la hauteur de ta hanche après le rebond.",lien:"technique.html#coups-filet"},
 {id:"aerien-2",theme:"aerien",niveaux:[2,3],titre:"Bandeja et retour au filet",duree:"20 min",joueurs:"à 2",
  consigne:"Ton partenaire, au fond, te lobe à mi-court. Tu recules de côté, tu joues la bandeja vers la vitre latérale adverse, puis tu reviens à 2–2,5 m du filet avant sa frappe suivante. Il te renvoie une balle basse que tu bloques en volée. 4 séries de 10.",
  reussite:"8 bandejas sur 10 qui gardent le filet : rebond avant la vitre du fond, et toi revenu dans la zone des 2–2,5 m pour la volée suivante.",lien:"technique.html#coups-filet"},
 {id:"aerien-3",theme:"aerien",niveaux:[3,4],titre:"Smash, bandeja ou víbora : décider vite",duree:"20 min",joueurs:"à 2",
  consigne:"Ton partenaire envoie 20 lobs de profondeurs variées. Tu annonces avant la frappe : « smash » seulement sur un lob court où tu es sous la balle, « víbora » sur un lob mi-court à hauteur d'épaule, « bandeja » sinon, ou « laisse » s'il faut jouer après la vitre. Smash plat vers le fond, víbora latéralisée vers la vitre latérale. 2 séries de 20.",
  reussite:"17 décisions justes sur 20 (validées par le partenaire) et pas plus de 3 smashs ou víboras dans le filet ou dehors par série.",lien:"technique.html#coups-filet"},

 /* ---------- Bouger avec son partenaire ---------- */
 {id:"couple-1",theme:"couple",niveaux:[1,2],titre:"La corde : bouger en miroir",duree:"10 min",joueurs:"à 2",
  consigne:"Placez-vous côte à côte au filet, à 3–4 m l'un de l'autre. Un troisième joueur, ou l'un de vous qui annonce, désigne une zone (gauche, droite, lob) : vous vous déplacez ensemble, comme reliés par une corde, puis vous reculez ensemble sur l'annonce « lob ». 5 séries de 1 min, sans balle puis avec balles faciles.",
  reussite:"Sur 10 annonces « lob », 10 reculs à deux : jamais un joueur au filet pendant que l'autre est au fond.",lien:"tutos.html#pair"},
 {id:"couple-2",theme:"couple",niveaux:[2,3],titre:"Reculer et remonter ensemble",duree:"20 min",joueurs:"à 4",
  consigne:"Paire A au filet, paire B au fond. B lobe ; A recule à deux, joue la balle (bandeja ou sortie de vitre) et remonte ensemble si la balle le permet. Le point se joue ensuite librement sur 4 frappes maximum. 10 points, puis on inverse les rôles.",
  reussite:"8 points sur 10 où la paire lobée reste à la même hauteur (pas plus de 2 m d'écart en profondeur entre les deux partenaires).",lien:"tutos.html#pair"},
 {id:"couple-3",theme:"couple",niveaux:[3,4],titre:"Ton partenaire est lobé : couvrir ou reculer",duree:"20 min",joueurs:"à 4",
  consigne:"Paire A au filet. La paire B lobe au-dessus d'un seul joueur de A. Si le lob est assez court pour que ton partenaire joue une bandeja, tu glisses vers le centre et tu gardes le filet ; s'il doit laisser passer la balle vers la vitre, tu recules avec lui. 3 séries de 8 lobs, en variant la profondeur.",
  reussite:"7 bonnes réactions sur 8 (couvrir le centre ou reculer selon la profondeur), validées par la paire adverse.",lien:"tutos.html#pair"},

 /* ---------- Placement au filet ---------- */
 {id:"placement-1",theme:"placement",niveaux:[1,2],titre:"Split step à 2,5 m du filet",duree:"10 min",joueurs:"seul",
  consigne:"Trace un repère au sol à 2,5 m du filet. Sans balle, pars de ce repère, fais 2 pas vers le filet, revient à petits pas, et fais un petit saut d'arrêt (split step) en imaginant la frappe adverse, raquette haute devant toi. Enchaîne vers la gauche, la droite et un demi-pas en arrière. 5 séries de 1 min avec 30 s de repos.",
  reussite:"Sur 20 split steps, 18 posés sur le repère des 2,5 m (à un demi-pas près) avec la raquette au-dessus de la hauteur du filet.",lien:"tactique.html#placement"},
 {id:"placement-2",theme:"placement",niveaux:[2,3],titre:"Volée de blocage à la bonne distance",duree:"15 min",joueurs:"à 2",
  consigne:"Tu te places à 2–2,5 m du filet, ton partenaire au fond. Il t'envoie des balles à mi-hauteur, alternant coup droit et revers ; tu bloques, geste court, raquette ouverte, long au centre. Après chaque volée, tu reviens à ta position de base. 3 séries de 15 balles.",
  reussite:"12 volées sur 15 qui retombent dans le tiers du fond adverse (derrière la ligne de service), sans que tu avances à moins d'1,5 m du filet.",lien:"tactique.html#placement"},
 {id:"placement-3",theme:"placement",niveaux:[3,4],titre:"Avancer, reculer selon la balle adverse",duree:"20 min",joueurs:"à 2",
  consigne:"Ton partenaire, au fond, alterne trois balles : basse (tu restes à 2,5 m et tu bloques), haute et lente (tu fais un pas en avant et tu conclus), et lob (tu fais un demi-pas en arrière avant sa frappe pour pouvoir jouer la bandeja). Il ne t'annonce rien : tu lis sa préparation. 4 séries de 12 balles.",
  reussite:"10 placements justes sur 12 par série, et aucun lob qui te passe par-dessus sans que tu aies pu le toucher.",lien:"tactique.html#placement"},

 /* ---------- Quand et comment monter ---------- */
 {id:"montee-1",theme:"montee",niveaux:[1,2],titre:"Lob profond sur cible",duree:"15 min",joueurs:"seul",
  consigne:"Pose une serviette à 1 m de la vitre du fond adverse. Depuis ta ligne de fond, laisse rebondir la balle lancée à la main et joue un lob haut, en ouvrant la raquette et en accompagnant vers le haut. 3 séries de 15 lobs croisés, puis 3 séries de 15 lobs parallèles. Note à part les lobs trop courts (ceux qui tombent avant la ligne de service).",
  reussite:"6 lobs sur 10 qui retombent à moins de 1,5 m de la vitre du fond adverse, et pas plus de 2 sur 10 avant la ligne de service.",lien:"tutos.html#monter-opts"},
 {id:"montee-2",theme:"montee",niveaux:[2,3],titre:"Lob, on monte, split step",duree:"20 min",joueurs:"à 2",
  consigne:"Ton partenaire est au filet et te donne une balle. Tu lobes par-dessus lui, tu dis « on monte ! », tu avances à petits pas et tu fais un split step au moment où il frappe la balle qui revient (il joue une bandeja). Tu finis par une volée longue au centre. 3 séries de 10, puis vous inversez.",
  reussite:"Sur 10 lobs, monter à chaque lob qui passe le volleyeur, ne jamais monter sur un lob court, et être à moins de 3 m du filet au moment de la volée 7 fois sur 10.",lien:"tutos.html#monter-opts"},
 {id:"montee-3",theme:"montee",niveaux:[3,4],titre:"Reprendre le filet en moins de 3 balles",duree:"20 min",joueurs:"à 4",
  consigne:"Points à thème : une paire commence au fond, l'autre au filet. La paire du fond doit reprendre le filet en moins de 3 frappes, avec lob ou chiquita selon les balles reçues ; si elle n'y arrive pas, le point est perdu. 10 points, puis on inverse.",
  reussite:"Reprendre le filet sur 5 points sur 10, avec aucune montée faite derrière un lob court smashé.",lien:"tutos.html#monter-opts"},

 /* ---------- Régularité, moins de fautes ---------- */
 {id:"regularite-1",theme:"regularite",niveaux:[1,2],titre:"Échanges contre le mur à vitesse moyenne",duree:"15 min",joueurs:"seul",
  consigne:"Face à un mur ou à la vitre du fond, place-toi à 4–5 m. Frappe en coup droit puis en revers à vitesse moyenne, en visant une zone d'environ 1 m de haut juste au-dessus de la hauteur du filet (0,88 m). Laisse rebondir avant chaque frappe. Compte les frappes sans faute.",
  reussite:"3 séries de 20 frappes de suite sans faute, toutes au-dessus de la hauteur du filet.",lien:"conseils.html#erreurs"},
 {id:"regularite-2",theme:"regularite",niveaux:[2,3],titre:"Croisé de fond : 20 balles sans faute",duree:"15 min",joueurs:"à 2",
  consigne:"Vous êtes tous les deux au fond, en diagonale. Échangez en croisé, à 60 % de votre puissance, en laissant jouer la vitre quand il le faut. Chaque faute remet le compteur à zéro. Changez de diagonale à mi-temps.",
  reussite:"Atteindre 20 frappes de suite sans faute, 3 fois dans la séance.",lien:"conseils.html#erreurs"},
 {id:"regularite-3",theme:"regularite",niveaux:[3,4],titre:"Points sans coup gagnant",duree:"20 min",joueurs:"à 4",
  consigne:"Match en jeux normaux, avec une règle : un point gagné sur coup gagnant ne compte que si la balle frappée était haute (au-dessus de l'épaule) ou très facile. Sur toute autre balle, tu dois remettre en jeu (lob, balle basse au centre, bandeja). Notez les fautes directes de chaque joueur.",
  reussite:"Moins de 3 fautes directes par joueur sur un set de 6 jeux.",lien:"conseils.html#erreurs"},

 /* ---------- Chiquita et transition ---------- */
 {id:"transition-1",theme:"transition",niveaux:[1,2],titre:"Chiquita dans les pieds",duree:"15 min",joueurs:"à 2",
  consigne:"Ton partenaire est au filet, à 2–2,5 m. Depuis la ligne de service, tu joues une balle lente qui passe juste au-dessus du filet et retombe dans ses pieds. Il te renvoie une volée facile. 3 séries de 12 balles, en coup droit puis en revers.",
  reussite:"7 chiquitas sur 10 qui obligent le volleyeur à jouer sous la hauteur du filet (volée basse ou demi-volée).",lien:"technique.html#coups-trans"},
 {id:"transition-2",theme:"transition",niveaux:[2,3],titre:"Chiquita puis montée",duree:"20 min",joueurs:"à 2",
  consigne:"Depuis le fond, tu joues une chiquita dans les pieds de ton partenaire au filet, tu avances de 2–3 m derrière, tu joues sa réponse en volée basse ou demi-volée, puis tu finis au filet. 3 séries de 12. Variante : il se décale et tu vises le centre.",
  reussite:"Finir au filet (à moins de 3 m) sur 7 enchaînements sur 10, sans faute sur la volée basse de transition.",lien:"technique.html#coups-trans"},
 {id:"transition-3",theme:"transition",niveaux:[3,4],titre:"Changer de rythme : lob ou chiquita",duree:"20 min",joueurs:"à 4",
  consigne:"Paire au fond contre paire au filet. La paire du fond alterne lob et chiquita, au centre ou vers le moins bon volleyeur, et cherche à faire lever la balle avant d'attaquer. Interdiction de frapper fort une balle sous la hauteur du filet. 10 points, puis on inverse.",
  reussite:"Sur 10 points, au moins 6 où la paire au filet doit jouer une volée sous la hauteur du filet après la chiquita.",lien:"technique.html#coups-trans"},

 /* ---------- Communication ---------- */
 {id:"communication-1",theme:"communication",niveaux:[1,2],titre:"Annoncer chaque balle",duree:"10 min",joueurs:"à 2",
  consigne:"Jouez au fond, côte à côte, contre un lanceur ou un mur, ou à 4 en balles faciles. Avant chaque balle au centre, l'un de vous annonce « moi » ou « toi » avant le rebond. Sur chaque lob, annoncez « lob » puis « on monte » ou « on reste ».",
  reussite:"Zéro balle au centre sans annonce, et zéro balle laissée passer entre vous sur 20 balles.",lien:"tutos.html#pair"},
 {id:"communication-2",theme:"communication",niveaux:[2,3],titre:"Qui prend le centre ?",duree:"15 min",joueurs:"à 4",
  consigne:"Avant de commencer, décidez qui prend les balles au centre (souvent le coup droit, ou celui qui a joué la balle précédente en diagonale). La paire adverse joue toutes ses balles au centre pendant 10 points. Celui qui ne prend pas la balle annonce « toi » et couvre.",
  reussite:"Aucun choc de raquettes et aucune balle laissée au centre sur 10 points.",lien:"tutos.html#pair"},
 {id:"communication-3",theme:"communication",niveaux:[3,4],titre:"Plan de jeu et bilan entre les jeux",duree:"20 min",joueurs:"à 4",
  consigne:"Jouez un set de 6 jeux. Avant le set, fixez à deux un plan : qui prend les lobs au centre, sur quel joueur adverse vous jouez, qui dirige. À chaque changement de côté, prenez 30 s pour un bilan : une chose qui marche, une chose à changer, rien de plus.",
  reussite:"Un bilan fait à chaque changement de côté, et au moins une décision du plan appliquée pendant tout le set (à vérifier ensemble à la fin).",lien:"tactique.html#placement"},

 /* ---------- Compétition ---------- */
 {id:"compet-1",theme:"compet",niveaux:[1,2],titre:"Échauffement d'avant-match en 10 minutes",duree:"10 min",joueurs:"seul",
  consigne:"Fais-le avant chaque match : 3 min de footing léger et de pas chassés, 2 min de mobilité (épaules, hanches, chevilles), puis 5 min d'ombre (coups sans balle) : 10 coups droits, 10 revers, 10 volées, 10 bandejas, 5 services. Termine par 3 sprints courts de 5 m.",
  reussite:"Routine faite en entier avant 3 matchs de suite, sans avoir à regarder la liste la troisième fois.",lien:"competition.html#competition"},
 {id:"compet-2",theme:"compet",niveaux:[2,3],titre:"Jeux décisifs au point en or",duree:"20 min",joueurs:"à 4",
  consigne:"Jouez des jeux qui commencent tous à 40-40, au point décisif : la paire qui relance choisit le côté de relance. Avant chaque point, la paire au service annonce sa zone de service et son plan. 10 points décisifs, en changeant de serveur à chaque point.",
  reussite:"Gagner au moins 6 points décisifs sur 10 au service, avec zéro double faute.",lien:"regles.html#regles"},
 {id:"compet-3",theme:"compet",niveaux:[3,4],titre:"Tie-breaks sous pression",duree:"20 min",joueurs:"à 4",
  consigne:"Jouez des tie-breaks en 7 points (2 points d'écart), puis un super tie-break en 10 points. Chaque paire part avec un handicap tiré au sort (commencer à 2-4 ou à 4-5). Entre deux points, routine de 15 s maximum : souffle, regard vers ton partenaire, annonce du prochain plan.",
  reussite:"Remonter un handicap de 2 points au moins une fois sur 3 tie-breaks, avec moins de 2 fautes directes par joueur et par tie-break.",lien:"competition.html#competition"},
];

// Points PERDUS en match, par motif (le motif décrit comment l'adversaire a gagné le point) -> thème du test à travailler
const MOTIF_VERS_THEME={
 faute:"regularite",   // l'adversaire gagne sur ta faute directe : frappes trop fortes ou mauvais choix sur balles difficiles
 double:"service",     // tes doubles fautes : service irrégulier, à rendre fiable avant de chercher la vitesse
 smash:"montee",       // l'adversaire conclut au smash : tes lobs sont trop courts ; le lob profond est le coup de montée à travailler
 volee:"transition",   // l'adversaire gagne à la volée : tes balles de fond arrivent hautes au filet ; il faut des balles basses (chiquita, balles dans les pieds)
 lob:"placement",      // tu te fais lober au filet : souvent trop près du filet (au lieu de 2–2,5 m) ou sans demi-pas en arrière sur balle haute
 vitre:"aerien",       // l'adversaire gagne en sortie de vitre : tes smashs et bandejas trop longs ou trop hauts lui offrent des balles faciles après la vitre
 gagnant:"couple",     // coup gagnant adverse : souvent un trou entre les partenaires ou au centre ; garder la corde de 3–4 m et couvrir ensemble
};
// Phrase courte qui explique le lien, affichée au joueur : « En match, 32 % des points perdus <explication> »
const MOTIF_EXPLICATION={
 faute:"viennent de tes fautes directes",
 double:"viennent de doubles fautes au service",
 smash:"finissent sur un smash adverse, signe que tes lobs sont souvent trop courts",
 volee:"finissent sur une volée adverse : tes balles arrivent trop hautes au filet",
 lob:"finissent sur un lob adverse qui te passe par-dessus au filet",
 vitre:"finissent sur une sortie de vitre adverse : tes attaques leur laissent des balles faciles",
 gagnant:"finissent sur un coup gagnant adverse, souvent dans un trou entre toi et ton partenaire",
};
