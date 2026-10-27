/* MON ACADÉMIE · Parcours personnalisé (academie.html#parcours), phase 4
   Moteur de règles fixes (aucune IA), à partir du niveau déclaré (pa-academie), des quiz (pa-academie-quiz), des thèmes
   faibles, des exercices faits (pa-exercices-faits), des défis relevés (pa-defis) et des priorités choisies par le joueur
   (pa-academie-priorites, 3 thèmes au plus).
   Priorités : thèmes choisis, puis thèmes faibles aux quiz, puis compétences du niveau (cartes de niveau).
   Recommandations : articles (ACADEMIE_ARTICLES) et scènes 3D (classées par leurs questions) dont la plage de niveaux
   contient le niveau déclaré, triés par priorité ; exercices par le moteur commun de Mon espace (exercices.js), au niveau
   d'exercice du niveau déclaré ; défi de la semaine de Mon espace (defis.js), le même pour les deux pages.
   « Ta semaine » (#ac-semaine, Mon académie et Mon espace) résume ce parcours : niveau, prochain quiz, 3 priorités,
   1 exercice, 1 scène 3D et l'objectif de la semaine (le défi).
   Rien n'est masqué ailleurs sur le site. */
const AP_CLE_PRIORITES="pa-academie-priorites";
const AP_MAX_PRIORITES=3;

/* ---------- Moteur (pur, testé sous Node) ---------- */
// Statistiques par thème sur les 3 derniers quiz
function apStats(seances,nb=3){
 const s={};(seances||[]).slice(-nb).forEach(x=>x.reponses.forEach(r=>{const t=s[r.theme]=s[r.theme]||{bonnes:0,total:0};t.total++;if(r.juste)t.bonnes++;}));
 return s;
}
// Compétences du niveau, puis, s'il en manque, celles des niveaux voisins (n-1, n+1, n-2, n+2…)
function apThemesNiveau(niveau){
 const l=[...(ACADEMIE_NIVEAUX_THEMES[niveau]||[])];
 for(let d=1;d<10;d++)[niveau-d,niveau+d].forEach(n=>l.push(...(ACADEMIE_NIVEAUX_THEMES[n]||[])));
 return l;
}
function apPriorites({niveau,faibles=[],choisis=[],max=4}){
 const l=[...choisis,...faibles.map(f=>f.theme),...apThemesNiveau(niveau)];
 return [...new Set(l)].filter(t=>ACADEMIE_THEMES[t]).slice(0,max);
}
// Compétences : thèmes prioritaires et leur état d'après les quiz
function apCompetences(priorites,stats){
 return priorites.map(t=>{const v=stats[t];
  const etat=!v?"non-evalue":v.total>=2&&v.bonnes/v.total>=0.8?"acquis":v.bonnes/v.total<0.6||v.bonnes<v.total&&v.total<2?"a-travailler":"en-cours";
  return {theme:t,etat,bonnes:v?v.bonnes:0,total:v?v.total:0};});
}
const apDans=(niveaux,n)=>niveaux[0]<=n&&n<=niveaux[1];
const apRang=(themes,priorites)=>Math.min(...themes.map(t=>{const i=priorites.indexOf(t);return i<0?99:i;}));
function apArticles(niveau,priorites,nb=4){
 return ACADEMIE_ARTICLES.filter(a=>apDans(a.niveaux,niveau)).map(a=>({a,r:apRang(a.themes,priorites)}))
  .sort((x,y)=>x.r-y.r||x.a.difficulte-y.a.difficulte||ACADEMIE_ARTICLES.indexOf(x.a)-ACADEMIE_ARTICLES.indexOf(y.a)).slice(0,nb).map(x=>x.a);
}
// Scènes 3D : plage de niveaux et thèmes de leurs questions validées
function apScenes(Q){
 const s={};
 Q.filter(q=>q.statut==="validee"&&q.origine==="scenario").forEach(q=>{const x=s[q.scenario]=s[q.scenario]||{id:q.scenario,niveaux:[10,1],themes:new Set()};
  x.niveaux=[Math.min(x.niveaux[0],q.niveauMin),Math.max(x.niveaux[1],q.niveauMax)];x.themes.add(q.theme);});
 return Object.values(s).map(x=>({...x,themes:[...x.themes]})).sort((a,b)=>a.id.localeCompare(b.id));
}
function apScenesRecommandees(Q,niveau,priorites,nb=3){
 return apScenes(Q).filter(x=>apDans(x.niveaux,niveau)).map(x=>({x,r:apRang(x.themes,priorites)})).sort((a,b)=>a.r-b.r||a.x.id.localeCompare(b.x.id)).slice(0,nb).map(y=>y.x);
}
// Entrée du moteur d'exercices commun : priorités choisies, thèmes faibles des quiz, compétences du niveau
function apEntreeExercices(niveau,choisis,faibles){
 const nom=t=>ACADEMIE_THEMES[t]?ACADEMIE_THEMES[t].nom.toLowerCase():t;
 return [...choisis.map(t=>({theme:ACADEMIE_THEME_EXERCICES[t],points:3,raison:"Ta priorité : "+nom(t)})),
  ...faibles.map(f=>({theme:ACADEMIE_THEME_EXERCICES[f.theme],points:2,raison:"Quiz : "+f.bonnes+" sur "+f.total+" en "+nom(f.theme)})),
  ...(ACADEMIE_NIVEAUX_THEMES[niveau]||[]).map(t=>({theme:ACADEMIE_THEME_EXERCICES[t],points:1,raison:"Compétence du niveau "+niveau+" : "+nom(t)}))].filter(x=>x.theme);
}

// Exercices recommandés par le moteur commun (exercices.js) : un par thème prioritaire, au niveau d'exercice du niveau déclaré
function apExercices(E,niveau,choisis,faibles){
 if(!E)return [];
 const nivEx=acNiveauExercice(niveau),vus=new Set(),l=[];
 E.themesPrioritaires(null,[],[],[],apEntreeExercices(niveau,choisis,faibles)).forEach(t=>{
  const e=E.exercicesPour(t.theme,nivEx).find(x=>!vus.has(x.id));if(e){vus.add(e.id);l.push({e,raison:t.raisons[0]});}});
 return l;
}
// « Ta semaine » : niveau, prochain quiz, 3 priorités, 1 exercice, 1 scène 3D, objectif de la semaine (défi de la semaine).
// Exercice : le premier recommandé qui n'est pas le défi, de préférence pas encore fait. Rien de nouveau n'est calculé :
// mêmes règles que le parcours ci-dessous et que le défi de Mon espace.
function apSemaine({Q,E,D,niveau,seances=[],enCours=null,choisis=[],faits={},releves={},maintenant=new Date()}){
 const faibles=acThemesFaibles(seances),stats=apStats(seances);
 const priorites=apCompetences(apPriorites({niveau,faibles,choisis,max:3}),stats);
 const lundi=D?D.lundi(maintenant):null,defi=D?D.defi(lundi,acNiveauExercice(niveau)):null;
 const exos=apExercices(E,niveau,choisis,faibles).filter(x=>!defi||!defi.exercice||x.e.id!==defi.exercice.id);
 const scene=Q?apScenesRecommandees(Q,niveau,priorites.map(p=>p.theme),1)[0]||null:null;
 return {niveau,priorites,
  quiz:enCours&&Array.isArray(enCours.reponses)?{enCours:true,question:enCours.reponses.length+1,total:enCours.questions.length,niveau:enCours.niveau}:{enCours:false,niveau},
  exercice:exos.find(x=>!faits[x.e.id])||exos[0]||null,
  scene:scene?scene.id:null,
  objectif:defi&&defi.exercice?{semaine:defi.semaine,exercice:defi.exercice,releve:!!releves[defi.semaine]}:null};
}

/* ---------- Interface ---------- */
const apEsc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[c]);
const apLireJ=(cle,def)=>{try{const v=JSON.parse(localStorage.getItem(cle)||"null");return v===null?def:v;}catch(e){return def;}};
const apChoisis=()=>{const p=apLireJ(AP_CLE_PRIORITES,{});return (Array.isArray(p.themes)?p.themes:[]).filter(t=>typeof ACADEMIE_THEMES!=="undefined"&&ACADEMIE_THEMES[t]).slice(0,AP_MAX_PRIORITES);};
const AP_ETATS={"a-travailler":"À travailler","en-cours":"En progrès","acquis":"Acquis","non-evalue":"Pas encore évalué"};

// Carte « Ta semaine » (#ac-semaine) : en haut de Mon académie et de Mon espace
function apSemaineDemarrer(){
 const zone=document.getElementById("ac-semaine");
 if(!zone)return;
 const bloc=zone.closest("[data-semaine-bloc]")||zone,surAcademie=!!document.getElementById("ap");
 const ici=surAcademie?"":"academie.html",lien=(h,t)=>`<a href="${ici}${h}">${t}</a>`;
 function rendre(){
  const C=window.PA_ACADEMIE_CONTENUS,niveau=C?C.niveauDeclare():null;
  if(!niveau||typeof ACADEMIE_QUESTIONS==="undefined"){
   // Mon académie affiche déjà le choix du niveau ; Mon espace invite à le choisir
   if(surAcademie||!C){bloc.hidden=true;return;}
   bloc.hidden=false;
   zone.innerHTML=`<p class="ac-semaine-vide">Choisis ton niveau de 1 à 10 : ton prochain quiz, tes 3 priorités, un exercice, une scène 3D et ton objectif de la semaine s'afficheront ici.</p><p><a class="btn primary" href="academie.html#niveaux">Choisir mon niveau de 1 à 10</a></p>`;
   return;
  }
  bloc.hidden=false;
  const aq=apLireJ("pa-academie-quiz",{}),T=ACADEMIE_THEMES,noms=C.NOMS||{};
  const s=apSemaine({Q:ACADEMIE_QUESTIONS,E:window.PA_EXERCICES,D:window.PA_DEFIS,niveau,seances:C.seancesQuiz(),enCours:aq&&aq.enCours,
   choisis:apChoisis(),faits:apLireJ("pa-exercices-faits",{}),releves:apLireJ("pa-defis",{})});
  const titreScene=s.scene?(typeof ACADEMIE_SCENES!=="undefined"&&ACADEMIE_SCENES[s.scene])||s.scene:null;
  const quiz=s.quiz.enCours
   ?`Quiz en cours${s.quiz.niveau!==niveau?" (niveau "+s.quiz.niveau+")":""} : question ${s.quiz.question} sur ${s.quiz.total}. ${lien("#quiz","Reprendre mon quiz")}`
   :`10 questions : 6 au niveau ${niveau}, puis 4 adaptées à tes réponses. ${lien("#quiz","Lancer mon quiz")}`;
  const ligne=(cls,lib,contenu)=>`<li class="ac-semaine-${cls}"><span class="ac-semaine-lib">${lib}</span><div>${contenu}</div></li>`;
  const ex=s.exercice&&s.exercice.e;
  zone.innerHTML=`<p class="ac-semaine-niveau"><span class="ac-moi-num">${niveau}</span> ${apEsc(noms[niveau]||"")} <span class="ap-tag">niveau déclaré, grille FFT 1 à 10</span>${surAcademie?"":` · ${lien("#niveaux","changer")}`}</p>
  <ul class="ac-semaine-liste">
   ${ligne("quiz","Prochain quiz",quiz)}
   ${ligne("priorites","Mes 3 priorités",`<ol class="ac-semaine-prio">${s.priorites.map(p=>`<li><b>${apEsc(T[p.theme].nom)}</b> <span class="ap-etat ap-${p.etat}">${AP_ETATS[p.etat]}${p.total?` · ${p.bonnes}/${p.total}`:""}</span></li>`).join("")}</ol>`)}
   ${ligne("exercice","Mon exercice",ex?`<details><summary><b>${apEsc(ex.titre)}</b> <span class="ap-tag">${apEsc(ex.duree)} · ${apEsc(ex.joueurs)}</span></summary><p>${apEsc(ex.consigne)}</p><p class="ex-reussite"><b>Objectif :</b> ${apEsc(ex.reussite)}</p><p class="note">${apEsc(s.exercice.raison)}</p></details>`:`<span class="note">Les exercices ne sont pas disponibles sur cet appareil.</span>`)}
   ${ligne("scene","Ma scène 3D",titreScene?`<a href="simulateur-3d-${apEsc(s.scene)}.html">${apEsc(titreScene)}</a> · <a href="simulateur-3d-${apEsc(s.scene)}.html#mode-quiz">te tester</a>`:`<a href="simulateur-3d.html">Le simulateur 3D</a>`)}
   ${ligne("objectif","Objectif de la semaine",s.objectif?`<b>${apEsc(s.objectif.exercice.titre)}</b> : ${apEsc(s.objectif.exercice.reussite)} ${s.objectif.releve?`<span class="ap-etat ap-acquis">Défi relevé</span>`:`<a href="${surAcademie?"#ac-defi":"#esp-bloc-defi"}">Mon défi de la semaine</a>`}`:`<span class="note">Pas de défi disponible sur cet appareil.</span>`)}
  </ul>`;
 }
 ["pa-academie","pa-academie-quiz","pa-progression","pa-academie-priorites"].forEach(ev=>window.addEventListener(ev,rendre));
 document.addEventListener("visibilitychange",()=>{if(!document.hidden)rendre();});
 rendre();
}
function apDemarrer(){
 const zone=document.getElementById("ap");
 if(!zone)return;
 if(typeof ACADEMIE_QUESTIONS==="undefined"||typeof ACADEMIE_ARTICLES==="undefined"){zone.innerHTML=`<p class="msg msg-erreur">Ton parcours n'a pas pu se charger (connexion interrompue ?). Recharge la page.</p>`;return;}
 const Q=ACADEMIE_QUESTIONS,T=ACADEMIE_THEMES,E=window.PA_EXERCICES,C=window.PA_ACADEMIE_CONTENUS;
 const scenes=typeof ACADEMIE_SCENES!=="undefined"?ACADEMIE_SCENES:{};
 const esc=apEsc,lireJ=apLireJ,choisis=apChoisis,ETATS=AP_ETATS;
 const jour=d=>new Date(d).toLocaleDateString("fr-FR",{day:"numeric",month:"short",year:"numeric"});
 function rendre(){
  const niveau=C.niveauDeclare();
  if(!niveau){zone.innerHTML=`<p class="aq-vide">Choisis ton niveau : ton parcours (compétences, articles, exercices, scènes 3D, défis) se construira tout seul. <a href="#academie">Choisir mon niveau</a>.</p>`;return;}
  const seances=C.seancesQuiz(),faibles=C.themesFaibles(seances),ch=choisis(),stats=apStats(seances);
  const prio=apPriorites({niveau,faibles,choisis:ch}),comp=apCompetences(prio,stats);
  const faits=lireJ("pa-exercices-faits",{});
  // Exercices : moteur commun (exercices.js)
  const exos=apExercices(E,niveau,ch,faibles);
  const articles=apArticles(niveau,prio),sc=apScenesRecommandees(Q,niveau,prio);
  const hist=lireJ("pa-academie",{}),changements=Array.isArray(hist.historique)?hist.historique.length:0;
  const releves=Object.keys(lireJ("pa-defis",{})).length,nbFaits=Object.keys(faits).length;
  zone.innerHTML=`<div class="ap-grille">
   <article class="ap-bloc ap-competences"><h3>Mes compétences à travailler</h3>
    <ul class="ap-liste">${comp.map(c=>`<li><span>${esc(T[c.theme].nom)}</span> <span class="ap-etat ap-${c.etat}">${ETATS[c.etat]}${c.total?` · ${c.bonnes}/${c.total}`:""}</span></li>`).join("")}</ul>
    <p class="note">${seances.length?(seances.length>1?"D'après tes "+Math.min(seances.length,3)+" derniers quiz":"D'après ton dernier quiz")+", tes priorités et ton niveau.":"Fais ton premier quiz pour savoir où tu en es."}</p>
    <details class="ap-priorites"><summary>Mes priorités (${ch.length}/${AP_MAX_PRIORITES})</summary><div class="ap-choix">${Object.entries(T).map(([k,v])=>`<label><input type="checkbox" value="${k}"${ch.includes(k)?" checked":""}> ${esc(v.nom)}</label>`).join("")}</div></details></article>
   <article class="ap-bloc"><h3>Mes articles recommandés</h3><ul class="ap-liste">${articles.map(a=>`<li><a href="${esc(a.url)}">${esc(a.titre)}</a> <span class="ap-tag">${a.themes.map(t=>esc(T[t].nom)).join(" · ")}</span></li>`).join("")}</ul></article>
   <article class="ap-bloc"><h3>Mes exercices recommandés</h3>${exos.length?`<ul class="ap-liste ap-exos">${exos.map(({e,raison})=>`<li><details><summary><b>${esc(e.titre)}</b> <span class="ap-tag">${esc(e.duree)} · ${esc(e.joueurs)}</span>${faits[e.id]?' <span class="ap-etat ap-acquis">Fait</span>':""}</summary><p>${esc(e.consigne)}</p><p class="ex-reussite"><b>Objectif :</b> ${esc(e.reussite)}</p><p class="note">${esc(raison)}</p>
     <button type="button" class="btn ghost ap-fait" data-exo="${e.id}" aria-pressed="${!!faits[e.id]}">${faits[e.id]?"Fait le "+jour(faits[e.id]):"Je l'ai fait"}</button></details></li>`).join("")}</ul>`:`<p class="note">Les exercices ne sont pas disponibles sur cet appareil.</p>`}</article>
   <article class="ap-bloc"><h3>Mes scénarios tactiques 3D</h3><ul class="ap-liste">${sc.map(x=>`<li><a href="simulateur-3d-${x.id}.html">${esc(scenes[x.id]||x.id)}</a> · <a href="simulateur-3d-${x.id}.html#mode-quiz">te tester</a></li>`).join("")}</ul><p class="note"><a href="simulateur-3d.html">Toutes les scènes du simulateur</a></p></article>
   <article class="ap-bloc ap-defi"><h3>Mon défi de la semaine</h3><div id="ac-defi"></div></article>
   <article class="ap-bloc"><h3>Mon historique</h3><ul class="ap-liste">
    <li>Niveau déclaré : ${niveau}${changements>1?` (${changements} choix)`:""}</li>
    <li>Quiz : ${seances.length?seances.slice(-3).reverse().map(s=>`${jour(s.debut)} · niveau ${s.niveau} · ${s.reponses.filter(r=>r.juste).length}/${s.reponses.length}`).join(" ; "):"aucun pour l'instant"}</li>
    <li>Exercices faits : ${nbFaits}</li><li>Défis relevés : ${releves}</li></ul></article>
  </div>`;
  zone.querySelectorAll(".ap-choix input").forEach(i=>i.addEventListener("change",()=>{
   // ordre de sélection gardé : la première priorité cochée reste la première
   const l=choisis().filter(t=>t!==i.value);
   if(i.checked){if(l.length>=AP_MAX_PRIORITES){i.checked=false;return;}l.push(i.value);}
   try{localStorage.setItem(AP_CLE_PRIORITES,JSON.stringify({themes:l}));}catch(e){}
   rendre();window.dispatchEvent(new Event("pa-academie-priorites"));const d=zone.querySelector(".ap-priorites");if(d)d.open=true;
  }));
  zone.querySelectorAll(".ap-fait").forEach(b=>b.addEventListener("click",()=>{
   const f=lireJ("pa-exercices-faits",{});if(f[b.dataset.exo])delete f[b.dataset.exo];else f[b.dataset.exo]=new Date().toISOString();
   try{localStorage.setItem("pa-exercices-faits",JSON.stringify(f));}catch(e){}
   window.dispatchEvent(new Event("pa-progression"));
  }));
  // Défi de la semaine : rendu par defis.js dans #ac-defi (même défi et même stockage que Mon espace)
  if(window.PA_DEFIS_RENDRE)window.PA_DEFIS_RENDRE();
 }
 ["pa-academie","pa-academie-quiz","pa-progression"].forEach(ev=>window.addEventListener(ev,rendre));
 rendre();
}
window.PA_PARCOURS={semaine:apSemaine,exercices:apExercices,stats:apStats,priorites:apPriorites,competences:apCompetences,articles:apArticles,scenes:apScenes,scenesRecommandees:apScenesRecommandees,entreeExercices:apEntreeExercices,CLE_PRIORITES:AP_CLE_PRIORITES};
apDemarrer();
apSemaineDemarrer();
