/* MON ACADÉMIE · Parcours personnalisé (academie.html#parcours), phase 4
   Moteur de règles fixes (aucune IA), à partir du niveau déclaré (pa-academie), des quiz (pa-academie-quiz), des thèmes
   faibles, des exercices faits (pa-exercices-faits), des défis relevés (pa-defis) et des priorités choisies par le joueur
   (pa-academie-priorites, 3 thèmes au plus).
   Priorités : thèmes choisis, puis thèmes faibles aux quiz, puis compétences du niveau (cartes de niveau).
   Recommandations : articles (ACADEMIE_ARTICLES) et scènes 3D (classées par leurs questions) dont la plage de niveaux
   contient le niveau déclaré, triés par priorité ; exercices par le moteur commun de Mon espace (exercices.js), au niveau
   d'exercice du niveau déclaré ; défi de la semaine de Mon espace (defis.js), le même pour les deux pages.
   Rien n'est masqué ailleurs sur le site. */
const AP_CLE_PRIORITES="pa-academie-priorites";
const AP_MAX_PRIORITES=3;

/* ---------- Moteur (pur, testé sous Node) ---------- */
// Statistiques par thème sur les 3 derniers quiz
function apStats(seances,nb=3){
 const s={};(seances||[]).slice(-nb).forEach(x=>x.reponses.forEach(r=>{const t=s[r.theme]=s[r.theme]||{bonnes:0,total:0};t.total++;if(r.juste)t.bonnes++;}));
 return s;
}
function apPriorites({niveau,faibles=[],choisis=[],max=4}){
 const l=[...choisis,...faibles.map(f=>f.theme),...(ACADEMIE_NIVEAUX_THEMES[niveau]||[])];
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

/* ---------- Interface ---------- */
function apDemarrer(){
 const zone=document.getElementById("ap");
 if(!zone||typeof ACADEMIE_QUESTIONS==="undefined"||typeof ACADEMIE_ARTICLES==="undefined")return;
 const Q=ACADEMIE_QUESTIONS,T=ACADEMIE_THEMES,E=window.PA_EXERCICES,C=window.PA_ACADEMIE_CONTENUS;
 const scenes=typeof QUIZ_TACTIQUE!=="undefined"?Object.fromEntries(QUIZ_TACTIQUE.map(q=>[q.scenario,q.titre])):{};
 const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[c]);
 const lireJ=(cle,def)=>{try{const v=JSON.parse(localStorage.getItem(cle)||"null");return v===null?def:v;}catch(e){return def;}};
 const choisis=()=>{const p=lireJ(AP_CLE_PRIORITES,{});return (Array.isArray(p.themes)?p.themes:[]).filter(t=>T[t]).slice(0,AP_MAX_PRIORITES);};
 const jour=d=>new Date(d).toLocaleDateString("fr-FR",{day:"numeric",month:"short",year:"numeric"});
 const ETATS={"a-travailler":"À travailler","en-cours":"En progrès","acquis":"Acquis","non-evalue":"Pas encore évalué"};
 function rendre(){
  const niveau=C.niveauDeclare();
  if(!niveau){zone.innerHTML=`<p class="aq-vide">Choisis ton niveau : ton parcours (compétences, articles, exercices, scènes 3D, défis) se construira tout seul. <a href="#niveaux">Voir les 10 niveaux</a>.</p>`;return;}
  const seances=C.seancesQuiz(),faibles=C.themesFaibles(seances),ch=choisis(),stats=apStats(seances);
  const prio=apPriorites({niveau,faibles,choisis:ch}),comp=apCompetences(prio,stats);
  const nivEx=C.niveauExercice(niveau),faits=lireJ("pa-exercices-faits",{});
  // Exercices : moteur commun (exercices.js)
  let exos=[];
  if(E){const th=E.themesPrioritaires(null,[],[],[],apEntreeExercices(niveau,ch,faibles));
   const vus=new Set();th.forEach(t=>{const e=E.exercicesPour(t.theme,nivEx).find(x=>!vus.has(x.id));if(e){vus.add(e.id);exos.push({e,raison:t.raisons[0]});}});}
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
   rendre();const d=zone.querySelector(".ap-priorites");if(d)d.open=true;
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
window.PA_PARCOURS={stats:apStats,priorites:apPriorites,competences:apCompetences,articles:apArticles,scenes:apScenes,scenesRecommandees:apScenesRecommandees,entreeExercices:apEntreeExercices,CLE_PRIORITES:AP_CLE_PRIORITES};
apDemarrer();
