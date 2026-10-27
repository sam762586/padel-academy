/* MON ACADÉMIE · Classement des contenus (phase 4), partagé par Mon académie et Mon espace
   Proposition d'Apprendre Padel, à valider par Samuel : niveaux sur la grille FFT 1 à 10, thèmes de l'académie
   (ACADEMIE_THEMES), difficulté 1 à 3, prérequis. Rien n'est masqué ailleurs sur le site : ce classement ne sert qu'à
   recommander.
   - Articles : sections des pages du site (ACADEMIE_ARTICLES).
   - Exercices (exercices-donnees.js) : classés par règle à partir de leurs données (acExerciceClasse) : niveau d'exercice
     1 à 4 → plage sur la grille (1→1–3, 2→4–5, 3→6–7, 4→8–10) ; rang dans le thème → difficulté ; exercice précédent du
     thème → prérequis.
   - Scènes 3D : classées par leurs questions (academie-questions.js), dans academie-parcours.js.
   - Niveau d'exercice du joueur : celui de son niveau déclaré dans Mon académie s'il en a un, sinon rien (les pages
     gardent alors le niveau du test de niveau, comme avant). Aucune donnée n'est convertie ni modifiée. */
const ACADEMIE_ARTICLES=[
 {id:"regles-points",titre:"Compter les points",url:"regles.html#points",niveaux:[1,4],themes:["regles"],difficulte:1,prerequis:[]},
 {id:"regles-service",titre:"Le service en détail",url:"regles.html#service",niveaux:[1,4],themes:["regles"],difficulte:1,prerequis:[]},
 {id:"regles-litiges",titre:"Les cas litigieux",url:"regles.html#litiges",niveaux:[3,7],themes:["regles","vitres"],difficulte:2,prerequis:["regles-points","regles-service"]},
 {id:"debuter",titre:"Avant ton premier match",url:"conseils.html#bien-commencer",niveaux:[1,2],themes:["regles","placement"],difficulte:1,prerequis:[]},
 {id:"erreurs-debutant",titre:"Les 20 erreurs du débutant",url:"conseils.html#erreurs",niveaux:[1,4],themes:["placement","vitres","volee","lob"],difficulte:1,prerequis:[]},
 {id:"coups-fond",titre:"Les coups de fond de court et de défense",url:"technique.html#coups-fond",niveaux:[1,5],themes:["defense","vitres","lob"],difficulte:1,prerequis:[]},
 {id:"coups-filet",titre:"Les coups au filet",url:"technique.html#coups-filet",niveaux:[2,6],themes:["volee","bandeja","vibora"],difficulte:2,prerequis:[]},
 {id:"coups-service",titre:"Le service et le retour",url:"technique.html#coups-service",niveaux:[1,4],themes:["regles","transition"],difficulte:1,prerequis:[]},
 {id:"coups-transition",titre:"Les coups de transition",url:"technique.html#coups-trans",niveaux:[3,7],themes:["transition","volee"],difficulte:2,prerequis:["coups-fond"]},
 {id:"vitres",titre:"Bien utiliser les vitres",url:"technique.html#vitres",niveaux:[2,6],themes:["vitres","defense"],difficulte:1,prerequis:[]},
 {id:"trois-decisions",titre:"Les 3 décisions qui font gagner",url:"tutos.html#tutos",niveaux:[3,7],themes:["construction","placement"],difficulte:2,prerequis:[]},
 {id:"face-lob",titre:"Face à un lob : smash, bandeja, víbora ou laisser passer",url:"tutos.html#face-lob",niveaux:[3,7],themes:["bandeja","vibora","lob"],difficulte:2,prerequis:["coups-filet"]},
 {id:"defendre-filet",titre:"Défendre contre deux joueurs au filet",url:"tutos.html#defendre-filet",niveaux:[3,7],themes:["defense","lob","construction"],difficulte:2,prerequis:["coups-fond"]},
 {id:"placement",titre:"Les quatre phases du point",url:"tactique.html#placement",niveaux:[1,5],themes:["placement","transition"],difficulte:1,prerequis:[]},
 {id:"schemas",titre:"Les schémas tactiques essentiels",url:"tactique.html#schemas",niveaux:[3,7],themes:["placement","construction"],difficulte:2,prerequis:["placement"]},
 {id:"construire",titre:"Construire le point (sans frapper fort)",url:"tactique.html#construire",niveaux:[4,8],themes:["construction"],difficulte:2,prerequis:[]},
 {id:"partenaire-niveau",titre:"Jouer avec un partenaire de niveau différent",url:"tactique.html#partenaire-niveau",niveaux:[3,8],themes:["communication","placement"],difficulte:2,prerequis:[]},
 {id:"adversaire",titre:"S'adapter à l'adversaire",url:"tactique.html#adversaire",niveaux:[5,10],themes:["construction"],difficulte:3,prerequis:["construire"]},
 {id:"moments",titre:"Jouer selon le score et les moments importants",url:"tactique.html#moments",niveaux:[5,10],themes:["construction","communication"],difficulte:3,prerequis:["construire"]},
 {id:"communication",titre:"Parler avec son partenaire",url:"tactique.html#communication",niveaux:[1,6],themes:["communication"],difficulte:1,prerequis:[]},
 {id:"premier-tournoi",titre:"Ton premier tournoi",url:"premier-tournoi.html#premier-tournoi",niveaux:[3,6],themes:["regles","competition"],difficulte:1,prerequis:["regles-points"]},
 {id:"plan-8-semaines",titre:"Plan de progression 8 semaines",url:"entrainement.html#entrainement",niveaux:[2,6],themes:["vitres","lob","volee","placement"],difficulte:1,prerequis:[]},
 {id:"analyser-matchs",titre:"Analyser tes matchs pour progresser",url:"score.html#analyser",niveaux:[4,10],themes:["construction"],difficulte:2,prerequis:[]},
 {id:"choisir-raquette",titre:"Quelle raquette pour moi ?",url:"materiel.html#raquette",niveaux:[1,10],themes:["materiel"],difficulte:1,prerequis:[]},
 {id:"comprendre-materiel",titre:"Comprendre une raquette",url:"materiel.html#materiel",niveaux:[3,10],themes:["materiel"],difficulte:2,prerequis:[]},
 {id:"competition",titre:"Jouer en compétition en France",url:"competition.html#competition",niveaux:[3,10],themes:["competition"],difficulte:1,prerequis:[]},
 {id:"bareme",titre:"Combien de points rapporte un tournoi ?",url:"bareme.html#bareme",niveaux:[4,10],themes:["competition"],difficulte:2,prerequis:["competition"]},
 {id:"lexique",titre:"Lexique du padel",url:"lexique.html#lexique",niveaux:[1,10],themes:["culture"],difficulte:1,prerequis:[]},
 {id:"labo",titre:"Le labo des trajectoires",url:"simulateur-3d.html#labo",niveaux:[3,10],themes:["lob","bandeja","vitres"],difficulte:2,prerequis:[]},
];
// Intitulés des niveaux de la grille FFT (cartes de academie.html)
const ACADEMIE_NIVEAUX_NOMS={1:"Débutant",2:"Débutant +",3:"Élémentaire",4:"Intermédiaire",5:"Confirmé",6:"Avancé",7:"Avancé +",8:"Expert",9:"Expert +",10:"Élite"};
// Compétences associées à chaque niveau (cartes de academie.html, proposition du site)
const ACADEMIE_NIVEAUX_THEMES={1:["regles","volee","transition"],2:["vitres","defense"],3:["lob","bandeja","vitres"],4:["vitres","defense","transition","construction"],
 5:["lob","volee","defense","bandeja","vibora"],6:["construction","volee","bandeja","vibora"],7:["defense","vitres","bandeja","vibora","construction"],8:["construction","defense"],9:[],10:[]};
// Thème d'exercices (exercices-donnees.js) de chaque thème de l'académie, et l'inverse pour classer les exercices
const ACADEMIE_THEME_EXERCICES={placement:"placement",defense:"vitre",vitres:"vitre",bandeja:"aerien",vibora:"aerien",volee:"placement",lob:"montee",transition:"transition",communication:"communication",construction:"regularite",regles:"service",competition:"compet",materiel:null,culture:null};
const AC_EXERCICE_THEMES={vitre:["vitres","defense"],service:["transition"],aerien:["bandeja","vibora"],couple:["placement","communication"],placement:["placement","volee"],
 montee:["lob","transition"],regularite:["construction","defense"],transition:["transition","volee"],communication:["communication"],compet:["construction","competition"]};
const AC_PLAGES_EXERCICE={1:[1,3],2:[4,5],3:[6,7],4:[8,10]};

// Niveau d'exercice (1 à 4) d'un niveau de la grille (1 à 10)
const acNiveauExercice=n=>n<=3?1:n<=5?2:n<=7?3:4;
// Classement d'un exercice : niveaux, thèmes, difficulté, prérequis
function acExerciceClasse(e){
 const rang=Number((e.id.match(/-(\d+)$/)||[])[1])||1;
 return {id:e.id,niveaux:[Math.min(...e.niveaux.map(n=>AC_PLAGES_EXERCICE[n][0])),Math.max(...e.niveaux.map(n=>AC_PLAGES_EXERCICE[n][1]))],
  themes:AC_EXERCICE_THEMES[e.theme]||[],difficulte:Math.min(3,rang),prerequis:rang>1?[e.id.replace(/\d+$/,String(rang-1))]:[]};
}
// Niveau déclaré dans Mon académie (pa-academie), ou null
function acNiveauDeclare(){
 try{const e=JSON.parse(localStorage.getItem("pa-academie")||"null");return e&&Number.isInteger(e.niveau)&&e.niveau>=1&&e.niveau<=10?e.niveau:null;}catch(err){return null;}
}
// Thèmes faibles des derniers quiz de l'académie (pa-academie-quiz) : [{theme, bonnes, total, taux}], du plus faible au moins faible.
// Un thème est faible sous 60 % de réussite avec au moins 2 réponses, ou s'il a été manqué au dernier quiz.
function acThemesFaibles(seances,nbSeances=3){
 const recentes=(seances||[]).slice(-nbSeances),stats={};
 recentes.forEach(s=>s.reponses.forEach(r=>{const t=stats[r.theme]=stats[r.theme]||{theme:r.theme,bonnes:0,total:0};t.total++;if(r.juste)t.bonnes++;}));
 const derniere=recentes[recentes.length-1],manques=new Set(derniere?derniere.reponses.filter(r=>!r.juste).map(r=>r.theme):[]);
 return Object.values(stats).map(t=>({...t,taux:t.bonnes/t.total})).filter(t=>(t.total>=2&&t.taux<0.6)||manques.has(t.theme))
  .sort((a,b)=>a.taux-b.taux||b.total-a.total||a.theme.localeCompare(b.theme));
}
function acSeancesQuiz(){
 try{const e=JSON.parse(localStorage.getItem("pa-academie-quiz")||"null");return e&&Array.isArray(e.seances)?e.seances.filter(s=>s&&Array.isArray(s.reponses)&&s.reponses.every(r=>r&&typeof r.theme==="string"&&typeof r.juste==="boolean")):[];}catch(err){return [];}
}
// Entrée du moteur d'exercices (exercices.js) : thèmes faibles des quiz de l'académie, traduits en thèmes d'exercices
function acPourExercices(seances){
 const noms=typeof ACADEMIE_THEMES!=="undefined"?ACADEMIE_THEMES:{};
 return acThemesFaibles(seances).map(t=>({theme:ACADEMIE_THEME_EXERCICES[t.theme],points:2,raison:"Quiz de l'académie : "+t.bonnes+" sur "+t.total+(noms[t.theme]?" en "+noms[t.theme].nom.toLowerCase():"")})).filter(x=>x.theme);
}
window.PA_ACADEMIE_CONTENUS={NOMS:ACADEMIE_NIVEAUX_NOMS,ARTICLES:ACADEMIE_ARTICLES,NIVEAUX_THEMES:ACADEMIE_NIVEAUX_THEMES,THEME_EXERCICES:ACADEMIE_THEME_EXERCICES,
 niveauExercice:acNiveauExercice,exerciceClasse:acExerciceClasse,niveauDeclare:acNiveauDeclare,
 niveauExerciceDeclare:()=>{const n=acNiveauDeclare();return n?acNiveauExercice(n):null;},
 themesFaibles:acThemesFaibles,seancesQuiz:acSeancesQuiz,pourExercices:()=>acPourExercices(acSeancesQuiz())};
