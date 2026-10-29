/* MA CARTE DE JOUEUR · Données et moteur de calcul (lus par le JS de la page carte)
   Une carte à partager : photo, poste, note globale et 6 notes de 1 à 99, comme les cartes de joueurs des jeux de
   football, mais avec des notes propres au padel. C'est un jeu : la carte ne remplace ni le test de niveau (palier
   0 à 5), ni le niveau déclaré dans Mon académie (grille FFT 1 à 10), ni le classement FFT.

   Ce que le fichier définit (tout est exposé sur window, et regroupé dans window.PA_CARTE) :
   - CARTE_ATTRIBUTS : les 6 attributs (clé de 3 lettres, libellé, description, thèmes du test de niveau liés) ;
   - CARTE_POSTES : Droite, Gauche, Polyvalent, avec les poids de la note globale ;
   - CARTE_QUESTIONS : 12 situations de match, 4 réponses chacune, chaque réponse donne des points (effets) sur
     un ou plusieurs attributs. L'ordre des réponses est déjà mélangé dans les données, et la page peut les
     mélanger encore : la meilleure n'est jamais reconnaissable à sa place ;
   - CARTE_BASES : point de départ indicatif d'après le palier du test de niveau OU le niveau Mon académie ;
   - CARTE_RANGS : rangs d'affichage de la carte (bronze, argent, or, élite) d'après la note globale ;
   - CARTE_CALCUL : fonctions pures (notes, globale, posteSuggere, rang, carte), testables sans le DOM.

   Pourquoi ces 6 attributs (choix d'Apprendre Padel) :
   - VOL Volée : la paire qui tient le filet gagne la plupart des points amateurs ; la première volée après le service
     et la volée de blocage à 2–2,5 m du filet sont les coups les plus joués d'un match.
   - AER Jeu aérien : bandeja (garder le filet), víbora, smash (conclure sur lob court). C'est ce qui fait la différence
     entre P100 et P250 et c'est le coup qui sépare le joueur de gauche du joueur de droite.
   - DEF Défense : sorties de vitre (double vitre comprise) et régularité à 1–1,5 m de la vitre. Un attribut à part
     parce que c'est le premier palier de progression (Découverte, P25) et que la régularité en défense est un des
     trois thèmes clés du test de niveau (vitre, aerien, regularite).
   - LOB Lob et montée : lob profond, puis reprendre le filet à deux. Le lob est le coup de construction du padel ;
     sans lui, on ne récupère jamais le filet.
   - SER Service et retour : chaque point commence par ces deux coups ; service slicé placé, retour en lob ou dans
     les pieds. Le thème « service » existe dans le test de niveau.
   - TAC Tactique : lecture du jeu, choix du coup (chiquita, lob, accélération), communication et plan de jeu
     avec le partenaire. Regroupe les thèmes communication, couple et transition du test de niveau.
   La régularité n'est pas un attribut séparé : elle est comptée dans DEF (tenir l'échange) et dans TAC (choisir
   le bon coup plutôt que forcer).

   Calcul (CARTE_CALCUL.notes) : pour chaque attribut, on additionne les effets des réponses choisies, puis on place
   ce total entre son minimum et son maximum théoriques (calculés à partir des questions : la pire et la meilleure
   réponse de chaque question pour cet attribut). Ce rapport, de 0 à 1, est projeté sur la plage de notes du repère
   du joueur (CARTE_BASES) : sans repère, de 16 à 90 ; avec un repère, une plage plus étroite autour du point de
   départ du palier ou du niveau. Les notes restent donc toujours entre 1 et 99, et cohérentes avec le niveau réel
   quand il est connu. Aucune donnée existante n'est modifiée : pa-quiz-dernier et pa-academie sont lus, jamais
   écrits (voir CLAUDE.md et .claude/rules). */

// Thèmes du test de niveau (QL_THEMES de quiz-niveau.js) : vitre, service, aerien, couple, placement, montee,
// regularite, transition, communication, compet. "themes" = ceux qui nourrissent l'attribut, le premier est le principal.
const CARTE_ATTRIBUTS=[
 {cle:"VOL",libelle:"Volée",desc:"Bloquer au filet à 2–2,5 m, première volée après le service, volée basse.",themes:["placement","service"]},
 {cle:"AER",libelle:"Jeu aérien",desc:"Bandeja pour garder le filet, víbora, smash pour conclure sur un lob court.",themes:["aerien"]},
 {cle:"DEF",libelle:"Défense",desc:"Sorties de vitre, double vitre, tenir l'échange à 1–1,5 m de la vitre sans faute.",themes:["vitre","regularite"]},
 {cle:"LOB",libelle:"Lob et montée",desc:"Lob haut et profond, puis reprendre le filet à deux.",themes:["montee","couple"]},
 {cle:"SER",libelle:"Service et retour",desc:"Service slicé et placé, retour en lob ou dans les pieds du serveur.",themes:["service"]},
 {cle:"TAC",libelle:"Tactique",desc:"Lire le jeu, choisir le bon coup, parler et construire avec son partenaire.",themes:["communication","transition","couple"]},
];
const CARTE_CLES=CARTE_ATTRIBUTS.map(a=>a.cle);

/* Postes. poids : pondération de chaque attribut dans la note globale.
   - Droite : le joueur qui construit et sécurise ; volée, tactique, lob et défense comptent plus, l'aérien moins.
   - Gauche : le joueur qui conclut ; l'aérien compte le plus, la volée et la tactique restent importantes.
   - Polyvalent : moyenne simple des 6 notes.
   Le joueur choisit son poste. S'il ne choisit pas, CARTE_CALCUL.posteSuggere propose un poste d'après ses notes (voir
   CARTE_SUGGESTION) ; la page peut afficher la suggestion à côté du choix. */
const CARTE_POSTES=[
 {cle:"droite",libelle:"Droite",desc:"Tu construis le point : volées sûres, lobs profonds, peu de fautes.",poids:{VOL:1.3,TAC:1.3,DEF:1.1,LOB:1.1,SER:1.0,AER:0.7}},
 {cle:"gauche",libelle:"Gauche",desc:"Tu conclus le point : bandeja, víbora et smash sur les balles hautes.",poids:{AER:1.6,VOL:1.1,TAC:1.0,DEF:1.0,LOB:0.8,SER:0.8}},
 {cle:"polyvalent",libelle:"Polyvalent",desc:"Tu joues des deux côtés selon ton partenaire.",poids:{VOL:1,AER:1,DEF:1,LOB:1,SER:1,TAC:1}},
];
/* Suggestion de poste : on compare la position de l'aérien à celle de la volée et de la tactique, chacune ramenée
   entre 0 et 1 sur sa plage (voir CARTE_CALCUL.posteSuggere). Si l'aérien dépasse la moyenne volée + tactique d'au
   moins "ecart", on suggère Gauche ; s'il est en dessous d'au moins "ecart", Droite ; sinon Polyvalent. */
const CARTE_SUGGESTION={ecart:0.2};

/* Point de départ indicatif, en lecture seule. Deux tables distinctes : l'une pour le palier du test de niveau
   (0 Découverte, 1 P25, 2 P100, 3 P250, 4 P500, 5 P1000 et +), l'autre pour le niveau déclaré dans Mon académie
   (grille FFT 1 à 10). Aucune des deux n'est déduite de l'autre, et la carte ne convertit jamais un palier en niveau
   ni l'inverse. Les notes d'un attribut vont de depart - marge (pires réponses) à depart + marge (meilleures).
   Ces plages sont un choix d'affichage d'Apprendre Padel (indicatif), pas une mesure. */
const CARTE_BASES={
 defaut:{depart:53,marge:37},            // sans repère : de 16 à 90
 palier:[
  {depart:25,marge:10},                   // 0 Découverte : 15 à 35
  {depart:40,marge:9},                    // 1 P25 : 31 à 49
  {depart:60,marge:8},                    // 2 P100 : 52 à 68
  {depart:70,marge:8},                    // 3 P250 : 62 à 78
  {depart:80,marge:7},                    // 4 P500 : 73 à 87
  {depart:90,marge:9},                    // 5 P1000 et + : 81 à 99
 ],
 niveau:[null,                            // index 0 inutilisé : les niveaux vont de 1 à 10
  {depart:21,marge:9},                    // 1 : 12 à 30
  {depart:29,marge:9},                    // 2 : 20 à 38
  {depart:37,marge:9},                    // 3 : 28 à 46
  {depart:45,marge:9},                    // 4 : 36 à 54
  {depart:53,marge:9},                    // 5 : 44 à 62
  {depart:62,marge:9},                    // 6 : 53 à 71
  {depart:71,marge:9},                    // 7 : 62 à 80
  {depart:80,marge:9},                    // 8 : 71 à 89
  {depart:87,marge:9},                    // 9 : 78 à 96
  {depart:92,marge:7},                    // 10 : 85 à 99
 ],
};

/* Rangs d'affichage d'après la note globale (min inclus). Le design (couleurs, fond de carte) est fait par le
   webdesigner : ici seulement les clés et les libellés. */
const CARTE_RANGS=[
 {cle:"bronze",libelle:"Bronze",min:1},
 {cle:"argent",libelle:"Argent",min:50},
 {cle:"or",libelle:"Or",min:70},
 {cle:"elite",libelle:"Élite",min:85},
];

/* 12 situations de match. Chaque question a un attribut principal (attr) et 4 réponses (r) ; chaque réponse porte ses
   effets. Barème de l'attribut principal : +14 (meilleure), +8, +2, -6 (pire) ; effets secondaires de -4 à +4.
   La meilleure réponse d'une question (plus grand total) est aussi la meilleure pour chacun de ses attributs, et la pire
   est la pire pour chacun : les extrêmes du questionnaire atteignent exactement depart ± marge sur les 6 attributs.
   Deux questions par attribut : VOL q01 q02 · AER q03 q04 · DEF q05 q06 · LOB q07 q08 · SER q09 q10 · TAC q11 q12.
   Repères du site : zone offensive à 2–2,5 m du filet, défense à 1–1,5 m de la vitre, 3–4 m entre partenaires,
   on monte à deux ou personne, bandeja = garder le filet, smash = conclure sur lob court. */
const CARTE_QUESTIONS=[
 {id:"q01",attr:"VOL",q:"Tu es au filet, à 2–2,5 m, et une balle adverse arrive à mi-hauteur sur ton revers. Le plus souvent…",r:[
  {t:"Je frappe fort pour conclure ; une fois sur deux, elle finit dans le filet",effets:{VOL:+2,TAC:-2}},
  {t:"Je bloque, geste court, raquette ouverte, long au centre : l'adversaire doit rejouer",effets:{VOL:+14,TAC:+2}},
  {t:"Je recule ou je la laisse à mon partenaire : le revers à la volée, ce n'est pas mon coup",effets:{VOL:-6,TAC:-2}},
  {t:"Volée solide mais peu placée : elle revient, et on continue le point",effets:{VOL:+8}}]},
 {id:"q02",attr:"VOL",q:"Tu viens de servir et tu montes. Ta première volée, en match :",r:[
  {t:"Je monte, mais elle part souvent dans le filet ou reste courte",effets:{VOL:+2}},
  {t:"Je reste au fond après mon service",effets:{VOL:-6,SER:-4,TAC:-2}},
  {t:"Split step au moment où le relanceur frappe, puis volée profonde vers la vitre latérale ou au centre",effets:{VOL:+14,SER:+4,TAC:+2}},
  {t:"Elle est correcte, mais je la joue souvent à mi-court plutôt qu'à 2–3 m du filet",effets:{VOL:+8,SER:+2}}]},
 {id:"q03",attr:"AER",q:"Lob adverse mi-profond, tu es au filet. Ce qui se passe le plus souvent :",r:[
  {t:"Bandeja profonde qui me laisse au filet environ 7 fois sur 10",effets:{AER:+8}},
  {t:"Je recule en courant et je la renvoie comme je peux, souvent après le rebond",effets:{AER:-6,LOB:-2}},
  {t:"Bandeja ou víbora selon la hauteur, placée vers la grille ou sur le moins bon défenseur, et je garde le filet",effets:{AER:+14,TAC:+3}},
  {t:"Bandeja la plupart du temps, mais elle sort ou reste courte au milieu",effets:{AER:+2}}]},
 {id:"q04",attr:"AER",q:"Lob court : tu es sous la balle, à 3 m du filet. Tu fais quoi ?",r:[
  {t:"Je smashe de toutes mes forces : filet, dehors, ou la balle ressort de la vitre et ils contre-attaquent",effets:{AER:-6,TAC:-2}},
  {t:"Une bandeja de sécurité, même sur un lob court",effets:{AER:+3,TAC:+1}},
  {t:"Smash puissant mais à plat et pas toujours placé : il termine le point une fois sur deux",effets:{AER:+8}},
  {t:"Smash à plat vers le fond, ou par 3 ou par 4 si la balle est assez haute : le point se termine",effets:{AER:+14,TAC:+2}}]},
 {id:"q05",attr:"DEF",q:"Une balle adverse passe à côté de toi et rebondit dans la vitre du fond. En général…",r:[
  {t:"Je la remets en lob correct après une vitre simple ; sur une double vitre, c'est plus dur",effets:{DEF:+8,LOB:+2}},
  {t:"Je frappe avant la vitre, ou je la rate à la sortie",effets:{DEF:-6,LOB:-2}},
  {t:"Je la remets après la vitre, mais haute et courte, au milieu",effets:{DEF:+2,LOB:-2}},
  {t:"Je laisse revenir la balle, de profil, puis lob profond ou balle basse au centre selon les volleyeurs, double vitre comprise",effets:{DEF:+14,LOB:+3,TAC:+2}}]},
 {id:"q06",attr:"DEF",q:"Les adversaires volleyent dans tes pieds, balle après balle. Toi :",r:[
  {t:"Je remets 2 ou 3 balles, ensuite je fais la faute",effets:{DEF:-6,TAC:-2}},
  {t:"Je tiens l'échange autant qu'il faut, à 1–1,5 m de la vitre, et j'attends la balle plus haute pour lober",effets:{DEF:+14,LOB:+3,TAC:+2}},
  {t:"Je remets quelques balles, puis je perds patience et je tente un coup",effets:{DEF:+2,TAC:-2}},
  {t:"Je remets autant qu'il faut ; mes fautes viennent quand ils accélèrent",effets:{DEF:+8}}]},
 {id:"q07",attr:"LOB",q:"Tu es au fond, les deux adversaires au filet. Ton lob, en match :",r:[
  {t:"Il passe au-dessus du volleyeur, mais retombe souvent à mi-court ; on hésite à monter",effets:{LOB:+8}},
  {t:"Je ne lobe presque jamais : je préfère frapper fort entre les deux",effets:{LOB:-6,TAC:-2}},
  {t:"Haut et profond, il retombe dans le dernier mètre, et on monte à deux dès qu'il les fait reculer",effets:{LOB:+14,TAC:+3}},
  {t:"Trop court une fois sur deux : il se fait smasher",effets:{LOB:+2}}]},
 {id:"q08",attr:"LOB",q:"Ton lob vient de passer les adversaires, ils reculent. Et toi, avec ton partenaire ?",r:[
  {t:"On reste au fond : au filet, on prend des balles dans les pieds",effets:{LOB:-6,VOL:-2,TAC:-2}},
  {t:"On monte à deux, à petits pas, split step au moment de leur frappe, et on se place à 2–2,5 m du filet",effets:{LOB:+14,VOL:+3,TAC:+2}},
  {t:"Je monte seul, mon partenaire reste au fond",effets:{LOB:+2,TAC:-2}},
  {t:"On monte, mais pas toujours ensemble : un au filet, l'autre à mi-court",effets:{LOB:+8}}]},
 {id:"q09",attr:"SER",q:"Ton service, sur un match entier :",r:[
  {t:"Il passe presque toujours, mais au milieu du carré : le retour est facile",effets:{SER:+2}},
  {t:"Slicé, placé vers la vitre latérale ou au T, bas après le rebond ; je varie selon le relanceur",effets:{SER:+14,TAC:+2}},
  {t:"Il m'arrive de faire des doubles fautes",effets:{SER:-6}},
  {t:"Il passe presque toujours, un peu placé, mais avec peu d'effet",effets:{SER:+8}}]},
 {id:"q10",attr:"SER",q:"Tu retournes le service. Le plus souvent…",r:[
  {t:"Je tente de passer le serveur fort ; ça finit souvent dans le filet ou dehors",effets:{SER:-6,TAC:-2}},
  {t:"Retour croisé, bas, en jeu, puis je défends",effets:{SER:+8}},
  {t:"Lob profond sur le serveur qui monte, ou balle basse dans ses pieds, selon sa montée",effets:{SER:+14,LOB:+3,TAC:+2}},
  {t:"Je remets en jeu mais haute : première volée facile pour eux",effets:{SER:+2}}]},
 {id:"q11",attr:"TAC",q:"Au changement de côté, avec ton partenaire…",r:[
  {t:"On commente les points perdus, sans plan pour la suite",effets:{TAC:+2}},
  {t:"On ne se parle pas pendant le match",effets:{TAC:-6}},
  {t:"On fait le point : qui prend le centre, où servir, quel adversaire est le plus faible, et on adapte",effets:{TAC:+14}},
  {t:"On se dit « moi », « toi », « lob » pendant les points, mais on ne parle pas de plan",effets:{TAC:+8}}]},
 {id:"q12",attr:"TAC",q:"Balle basse à mi-court, les deux adversaires au filet. Tu joues…",r:[
  {t:"Je frappe fort, souvent dans le filet ou dehors",effets:{TAC:-6,DEF:-2}},
  {t:"Chiquita dans les pieds du volleyeur le moins à l'aise, ou lob si l'un des deux est trop près du filet, puis je monte",effets:{TAC:+14,LOB:+4,VOL:+2}},
  {t:"Je la remets haute : elle se fait smasher",effets:{TAC:+2}},
  {t:"Une balle basse au centre, en jeu, puis je recule au fond",effets:{TAC:+8,LOB:+2}}]},
];

/* Moteur : fonctions pures.
   reponses : tableau de 12 index (0 à 3), dans l'ordre de CARTE_QUESTIONS ; null ou index invalide = pas de réponse
   (effet nul). base : null, {palier:0..5} (test de niveau) ou {niveau:1..10} (Mon académie) ; si les deux sont donnés,
   le palier du test l'emporte (il peut s'appuyer sur un classement). poste : clé de CARTE_POSTES, sinon "polyvalent". */
const CARTE_CALCUL=(function(){
 const borne=n=>Math.max(1,Math.min(99,Math.round(n)));
 // Bornes théoriques par attribut : somme des pires et des meilleures réponses de chaque question pour cet attribut
 function bornes(){
  const b={};
  CARTE_CLES.forEach(c=>{
   let min=0,max=0;
   CARTE_QUESTIONS.forEach(q=>{const v=q.r.map(r=>r.effets[c]||0);min+=Math.min(...v);max+=Math.max(...v);});
   b[c]={min,max};
  });
  return b;
 }
 const BORNES=bornes();
 // Plage de notes du repère : {depart, marge}
 function plage(base){
  if(base&&Number.isInteger(base.palier)&&CARTE_BASES.palier[base.palier])return CARTE_BASES.palier[base.palier];
  if(base&&Number.isInteger(base.niveau)&&CARTE_BASES.niveau[base.niveau])return CARTE_BASES.niveau[base.niveau];
  return CARTE_BASES.defaut;
 }
 // Totaux bruts par attribut
 function totaux(reponses){
  const t={};CARTE_CLES.forEach(c=>{t[c]=0;});
  CARTE_QUESTIONS.forEach((q,i)=>{
   const k=reponses&&reponses[i];
   const r=Number.isInteger(k)?q.r[k]:null;
   if(!r)return;
   Object.keys(r.effets).forEach(c=>{if(c in t)t[c]+=r.effets[c];});
  });
  return t;
 }
 // Rapport 0..1 d'un total brut sur sa plage théorique
 const rapport=(c,total)=>{const b=BORNES[c];return b.max===b.min?0.5:Math.max(0,Math.min(1,(total-b.min)/(b.max-b.min)));};
 function notes(reponses,base){
  const t=totaux(reponses),p=plage(base),n={};
  CARTE_CLES.forEach(c=>{n[c]=borne(p.depart-p.marge+2*p.marge*rapport(c,t[c]));});
  return n;
 }
 function globale(notes,poste){
  const P=CARTE_POSTES.find(x=>x.cle===poste)||CARTE_POSTES[2];
  let s=0,w=0;
  CARTE_CLES.forEach(c=>{const k=P.poids[c]||0;s+=k*(notes[c]||0);w+=k;});
  return borne(w?s/w:1);
 }
 // Suggestion de poste d'après les notes (ramenées entre 0 et 1 sur la plage du repère)
 function posteSuggere(notes,base){
  const p=plage(base),r=c=>p.marge?Math.max(0,Math.min(1,(notes[c]-(p.depart-p.marge))/(2*p.marge))):0.5;
  const ecart=r("AER")-(r("VOL")+r("TAC"))/2;
  return ecart>=CARTE_SUGGESTION.ecart?"gauche":ecart<=-CARTE_SUGGESTION.ecart?"droite":"polyvalent";
 }
 function rang(g){
  let res=CARTE_RANGS[0];
  CARTE_RANGS.forEach(x=>{if(g>=x.min)res=x;});
  return res.cle;
 }
 // Tout en un : {notes, poste, posteChoisi, posteSuggere, globale, rang}
 function carte(reponses,options){
  const o=options||{},n=notes(reponses,o.base),sug=posteSuggere(n,o.base);
  const choisi=CARTE_POSTES.some(x=>x.cle===o.poste)?o.poste:null;
  const poste=choisi||sug,g=globale(n,poste);
  return {notes:n,poste,posteChoisi:choisi,posteSuggere:sug,globale:g,rang:rang(g)};
 }
 return {bornes:()=>({...BORNES}),plage,totaux,notes,globale,posteSuggere,rang,carte};
})();

/* Exemples pour les tests (dev-front). reponses = index dans l'ordre des données (q01 à q12), valeurs calculées
   avec ce fichier (script de vérification du 29/10/2026).
   1. Léa, découverte, sans repère (base null, pas de poste choisi). Réponses : [2,1,1,0,1,0,1,0,2,3,1,2]
      (pires réponses presque partout ; q09 au milieu du carré, q10 retour haut, q11 commente sans plan). Attendu :
      VOL 16, AER 16, DEF 20, LOB 16, SER 28, TAC 26 ; suggestion polyvalent (écart -0,07) ; globale 20 ; bronze.
   2. Hugo, joueur de droite, palier 2 (P100) au test de niveau : base {palier:2}, poste "droite". Réponses :
      [1,3,3,1,0,3,2,3,3,1,2,3] (volée, défense et tactique au-dessus, bandeja qui sort ou reste courte, pas de smash).
      Attendu : VOL 64, AER 59, DEF 63, LOB 64, SER 63, TAC 63 ; suggestion droite (écart -0,28) ; globale 63 ; argent.
   3. Karim, joueur de gauche, niveau 7 déclaré dans Mon académie : base {niveau:7}, poste "gauche". Réponses :
      [3,0,2,3,0,3,0,3,3,1,3,2] (aérien parfait, volée et tactique moyennes). Attendu :
      VOL 71, AER 80, DEF 75, LOB 73, SER 74, TAC 72 ; suggestion gauche (écart +0,47) ; globale 75 ; or.
   Extrêmes : sans repère, meilleures réponses partout (q01 1, q02 2, q03 2, q04 3, q05 3, q06 1, q07 2, q08 1, q09 1,
   q10 2, q11 2, q12 1) → 90 sur les 6 attributs, globale 90, élite ; pires partout (q01 2, q02 1, q03 1, q04 0, q05 1,
   q06 0, q07 1, q08 0, q09 2, q10 0, q11 1, q12 0) → 16 partout, globale 16, bronze. Avec {palier:5}, meilleures → 99
   partout ; avec {palier:0}, pires → 15 partout. Tableau vide, null ou index invalides → note au milieu de la plage
   (effet nul = rapport calculé sur 0). */
window.CARTE_ATTRIBUTS=CARTE_ATTRIBUTS;window.CARTE_POSTES=CARTE_POSTES;window.CARTE_QUESTIONS=CARTE_QUESTIONS;
window.CARTE_BASES=CARTE_BASES;window.CARTE_RANGS=CARTE_RANGS;window.CARTE_SUGGESTION=CARTE_SUGGESTION;window.CARTE_CALCUL=CARTE_CALCUL;
window.PA_CARTE={ATTRIBUTS:CARTE_ATTRIBUTS,CLES:CARTE_CLES,POSTES:CARTE_POSTES,QUESTIONS:CARTE_QUESTIONS,BASES:CARTE_BASES,RANGS:CARTE_RANGS,SUGGESTION:CARTE_SUGGESTION,calcul:CARTE_CALCUL};
