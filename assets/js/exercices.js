/* EXERCICES RECOMMANDÉS (espace joueur)
   Choisit 3 thèmes à travailler à partir :
     - du dernier test de niveau : sur l'appareil (pa-quiz-dernier) ou dans le compte. Test v2 (champ palier) : thèmes où le jeu
       décrit est au palier du joueur ou en dessous, les plus bas d'abord ; ancien test : réponses à 0 ou 1 point sur 3 ;
     - des 10 derniers matchs comptés au compteur : motifs des points perdus (MOTIF_VERS_THEME, exercices-donnees.js).
     - des objectifs de jeu choisis dans l'espace (pa-objectifs-jeu, OBJECTIFS_JEU) ;
     - des difficultés notées dans les bilans après match des 30 derniers jours (diagnostic.js) ;
   Puis propose 2 exercices par thème, adaptés au niveau du test. « Je l'ai fait » est gardé sur l'appareil.
   exProgramme : le programme de la semaine (nombre d'exercices selon la fréquence de jeu déclarée au test, exercices
   faits ces 6 derniers jours mis de côté), utilisé par le tableau de bord (progression.js).
   Dépend de exercices-donnees.js (EXERCICES, MOTIF_VERS_THEME, MOTIF_EXPLICATION, OBJECTIFS_JEU), journal.js (PA_JOURNAL)
   et joueur-sync.js (PA_JOUEUR, objectifs de jeu). */
const EX_LIBELLES_THEMES={vitre:"Sorties de vitre",service:"Service et montée",aerien:"Bandeja, víbora et smash",couple:"Bouger avec son partenaire",
 placement:"Placement au filet",montee:"Monter au filet",regularite:"Régularité",transition:"Transition et chiquita",communication:"Communication",compet:"Compétition"};
const EX_PALIERS=["Découverte","P25","P100","P250","P500","P1000 et +"]; // mêmes noms que quiz-niveau.js
const EX_CLE_FAITS="pa-exercices-faits";
const EX_NB_MATCHS=10;      // matchs comptés pris en compte
const EX_MIN_POINTS=5;      // points perdus minimum sur un motif pour qu'il compte
const EX_PART_MIN=0.2;      // part minimale des points perdus
const EX_PAR_SEMAINE=[1,2,3,4]; // exercices par semaine selon la fréquence de jeu du test (moins d'une fois … 4 fois et plus)
const EX_REPOS_JOURS=6;     // un exercice fait depuis moins de 6 jours laisse la place à un autre
const exPluriel=(n,mot)=>n+" "+mot+(n>1?"s":"");

// Moteur pur (testable) : renvoie [{theme, score, raisons:[texte]}] triés, au plus 3.
// objectifs : identifiants d'objectifs de jeu (OBJECTIFS_JEU) ; difficultes : [{theme, raison}] des bilans après match
// (diagnostic.js) ; à score égal, l'ordre des priorités du test est gardé.
function exThemesPrioritaires(quiz,matchs,objectifs,difficultes){
 const ordreTest={};
 const scores={};
 const ajouter=(theme,points,raison)=>{if(!EX_LIBELLES_THEMES[theme])return;const s=scores[theme]=scores[theme]||{theme,score:0,raisons:[]};s.score+=points;s.raisons.push(raison);};
 if(quiz&&Array.isArray(quiz.reponses)&&Number.isInteger(quiz.palier)){
  const valides=quiz.reponses.filter(r=>r&&r.theme!=="compet"&&Number.isInteger(r.pts)&&Number.isInteger(r.palier));
  const prio=Array.isArray(quiz.priorites)?quiz.priorites:valides.filter(r=>r.pts<=2).sort((a,b)=>a.pts-b.pts).slice(0,3).map(r=>r.theme);
  prio.forEach((th,i)=>{const r=valides.find(x=>x.theme===th);ordreTest[th]=i;if(r&&EX_PALIERS[r.palier])ajouter(th,3-r.pts,"Test de niveau : ton jeu ici correspond au palier "+EX_PALIERS[r.palier]);});
 }else if(quiz&&Array.isArray(quiz.reponses)){
  quiz.reponses.forEach(r=>{if(r&&Number.isInteger(r.pts)&&r.pts<=1)ajouter(r.theme,2-r.pts,"Test de niveau : "+r.pts+" point sur 3 sur ce thème");});
 }
 const comptes=(matchs||[]).filter(m=>m.pointsTotal>0&&m.motifsPerdus).slice(0,EX_NB_MATCHS);
 const perdus={};let total=0;
 comptes.forEach(m=>Object.entries(m.motifsPerdus).forEach(([motif,n])=>{perdus[motif]=(perdus[motif]||0)+n;total+=n;}));
 Object.entries(perdus).forEach(([motif,n])=>{
  const part=total?n/total:0,theme=(typeof MOTIF_VERS_THEME!=="undefined"?MOTIF_VERS_THEME:{})[motif];
  if(theme&&n>=EX_MIN_POINTS&&part>=EX_PART_MIN){
   const expl=(typeof MOTIF_EXPLICATION!=="undefined"?MOTIF_EXPLICATION:{})[motif]||"";
   ajouter(theme,Math.round(part*6),"En match, "+Math.round(100*part)+" % des points perdus "+expl+" ("+exPluriel(comptes.length,"match")+" "+(comptes.length>1?"comptés":"compté")+")");
  }
 });
 const defs=typeof OBJECTIFS_JEU!=="undefined"?OBJECTIFS_JEU:[];
 (objectifs||[]).forEach(id=>{
  const o=defs.find(x=>x.id===id);
  if(o)o.themes.forEach((th,i)=>ajouter(th,i===0?3:2,"Ton objectif : "+o.libelle.toLowerCase()));
 });
 (difficultes||[]).forEach(d=>{if(d&&typeof d.raison==="string")ajouter(d.theme,1,d.raison);});
 const rang=th=>th in ordreTest?ordreTest[th]:99;
 return Object.values(scores).sort((a,b)=>b.score-a.score||rang(a.theme)-rang(b.theme)||a.theme.localeCompare(b.theme)).slice(0,3);
}
// Programme de la semaine : exercices pris tour à tour dans les thèmes prioritaires, au niveau du joueur.
// frequence : 0 à 3 (question du test), sinon 2 exercices. faits : { id: date ISO }. Renvoie [{exercice, theme, raisons}].
function exProgramme(themes,niveau,frequence,faits,maintenant){
 const n=EX_PAR_SEMAINE[Number.isInteger(frequence)&&frequence>=0&&frequence<=3?frequence:1];
 const recent=id=>faits&&faits[id]&&((maintenant||Date.now())-Date.parse(faits[id]))<EX_REPOS_JOURS*86400000;
 const files=themes.map(t=>exExercicesPour(t.theme,niveau).map(e=>({exercice:e,theme:t.theme,raisons:t.raisons})));
 const ordre=[];
 for(let i=0;files.some(f=>f[i]);i++)files.forEach(f=>{if(f[i])ordre.push(f[i]);});
 return [...ordre.filter(x=>!recent(x.exercice.id)),...ordre.filter(x=>recent(x.exercice.id))].slice(0,n);
}
// 2 exercices du thème adaptés au niveau (1 à 4), sinon les plus proches
function exExercicesPour(theme,niveau){
 const liste=(typeof EXERCICES!=="undefined"?EXERCICES:[]).filter(e=>e.theme===theme);
 const adaptes=liste.filter(e=>e.niveaux.includes(niveau));
 const autres=liste.filter(e=>!e.niveaux.includes(niveau)).sort((a,b)=>Math.min(...a.niveaux.map(n=>Math.abs(n-niveau)))-Math.min(...b.niveaux.map(n=>Math.abs(n-niveau))));
 return [...adaptes,...autres].slice(0,2);
}
window.PA_EXERCICES={themesPrioritaires:exThemesPrioritaires,exercicesPour:exExercicesPour,programme:exProgramme,LIBELLES:EX_LIBELLES_THEMES,PALIERS:EX_PALIERS,CLE_FAITS:EX_CLE_FAITS,
 objectifsJeu:()=>window.PA_JOUEUR&&typeof window.PA_JOUEUR.lireObjectifsJeu==="function"?window.PA_JOUEUR.lireObjectifsJeu().map(o=>o.objectif):[]};

(function(){
 const zone=document.getElementById("esp-exercices");
 if(!zone||typeof EXERCICES==="undefined")return;
 function el(b,c,t){const e=document.createElement(b);if(c)e.className=c;if(t!==undefined)e.textContent=t;return e;}
 function lire(cle,defaut){try{const v=JSON.parse(localStorage.getItem(cle)||"null");return v===null?defaut:v;}catch(e){return defaut;}}
 let quizCompte=null;
 // Dernier test : le plus récent entre l'appareil et le compte
 function dernierQuiz(){
  const local=lire("pa-quiz-dernier",null);
  const l=local&&Array.isArray(local.reponses)?local:null;
  if(!quizCompte)return l;
  if(!l)return quizCompte;
  return Date.parse(quizCompte.date)>Date.parse(l.date)?quizCompte:l;
 }
 function faits(){const f=lire(EX_CLE_FAITS,{});return f&&typeof f==="object"?f:{};}
 function carteExercice(e){
  const art=el("article","ex-carte");
  const tete=el("div","ex-tete");tete.append(el("h4","",e.titre),el("span","ex-meta",e.duree+" · "+e.joueurs));
  art.append(tete,el("p","",e.consigne));
  const r=el("p","ex-reussite");r.append(el("b","","Objectif : "),e.reussite);art.appendChild(r);
  const pied=el("div","ex-pied");
  if(e.lien){const a=el("a","","Revoir le geste");a.href=e.lien;pied.appendChild(a);}
  const fait=faits()[e.id];
  const b=el("button","btn ghost ex-fait",fait?"Fait le "+new Date(fait).toLocaleDateString("fr-FR"):"Je l'ai fait");b.type="button";
  b.setAttribute("aria-pressed",String(!!fait));
  b.addEventListener("click",()=>{
   const f=faits();if(f[e.id])delete f[e.id];else f[e.id]=new Date().toISOString();
   try{localStorage.setItem(EX_CLE_FAITS,JSON.stringify(f));}catch(err){}
   window.dispatchEvent(new Event("pa-progression")); // tableau de bord (progression.js)
   rendre();
  });
  pied.appendChild(b);art.appendChild(pied);
  return art;
 }
 function rendre(){
  zone.textContent="";
  const quiz=dernierQuiz(),matchs=window.PA_JOURNAL?window.PA_JOURNAL.liste():[];
  const niveau=quiz&&Number.isInteger(quiz.niveau)&&quiz.niveau>=1&&quiz.niveau<=4?quiz.niveau:2;
  const themes=exThemesPrioritaires(quiz,matchs,window.PA_EXERCICES.objectifsJeu(),window.PA_DIAGNOSTIC?window.PA_DIAGNOSTIC.difficultes():[]);
  const base=el("p","acc-muted");
  base.append(quiz?"Basé sur ton test de niveau du "+new Date(quiz.date).toLocaleDateString("fr-FR")+(EX_PALIERS[quiz.palier]?" (palier "+EX_PALIERS[quiz.palier]+")":" (niveau "+niveau+" sur 4)"):"Pas encore de test de niveau",
   (n=>n?" et sur "+n+" match"+(n>1?"s":"")+" compté"+(n>1?"s":"")+" au compteur.":", sans match compté au compteur.")(matchs.filter(m=>m.pointsTotal>0).slice(0,EX_NB_MATCHS).length));
  zone.appendChild(base);
  if(!themes.length){
   const p=el("p","");
   const lienMatchs=el("a","","compte tes matchs avec le compteur");lienMatchs.href="score.html";
   if(quiz)p.append("Aucun point faible marqué au test : bravo. Pour des conseils plus précis, ",lienMatchs,". En attendant, trois exercices de base :");
   else{const lienTest=el("a","","Passe le test de niveau");lienTest.href="niveau.html";p.append(lienTest," et ",lienMatchs," : les exercices s'adapteront à tes points faibles. En attendant, trois exercices de base :");}
   zone.appendChild(p);
   ["regularite","placement","communication"].forEach(th=>{
    const bloc=el("section","ex-theme");bloc.appendChild(el("h3","",EX_LIBELLES_THEMES[th]));
    exExercicesPour(th,niveau).slice(0,1).forEach(e=>bloc.appendChild(carteExercice(e)));zone.appendChild(bloc);
   });
   return;
  }
  themes.forEach((t,i)=>{
   const bloc=el("section","ex-theme");
   bloc.appendChild(el("h3","",(i+1)+". "+EX_LIBELLES_THEMES[t.theme]));
   const ul=el("ul","ex-raisons");t.raisons.forEach(r=>ul.appendChild(el("li","",r)));bloc.appendChild(ul);
   exExercicesPour(t.theme,niveau).forEach(e=>bloc.appendChild(carteExercice(e)));
   zone.appendChild(bloc);
  });
 }
 // Dernier test enregistré dans le compte (avec le détail des réponses)
 async function chargerQuizCompte(){
  const c=window.PA_COMPTE;
  if(!c||!c.actif||typeof c.loadQuizzes!=="function")return;
  await c.ready;
  if(!c.user){quizCompte=null;rendre();return;}
  const r=await c.loadQuizzes();
  const d=r.ok&&r.results.find(q=>Array.isArray(q.reponses));
  quizCompte=d?{date:d.created_at,score:d.score,niveau:d.niveau,palier:Number.isInteger(d.palier)?d.palier:undefined,reponses:d.reponses}:null;
  rendre();
 }
 if(window.PA_JOURNAL)window.PA_JOURNAL.onChange(rendre);
 // Objectifs de jeu ou exercice coché depuis le tableau de bord
 window.addEventListener("pa-progression",()=>rendre());
 // Dernier test (appareil ou compte), pour le tableau de bord
 window.PA_EXERCICES.dernierQuiz=dernierQuiz;
 const c=window.PA_COMPTE;
 if(c&&c.actif){c.onChange(chargerQuizCompte);chargerQuizCompte();}
 document.addEventListener("visibilitychange",()=>{if(!document.hidden)rendre();});
 rendre();
})();
