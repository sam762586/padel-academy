/* MON PLAN (entrainement.html#mon-plan) : le plan 8 semaines, personnalisé
   Les mêmes 8 semaines que le plan générique (WEEKS, plan.js), qui reste affiché et inchangé en dessous :
     - ordre : les semaines dont le thème fait partie des 3 priorités (moteur du parcours : priorités choisies, thèmes
       faibles aux quiz de l'académie, compétences du niveau) passent en tête, dans l'ordre des priorités ; les autres
       gardent leur ordre ; la « Semaine match » reste la dernière ;
     - exercice : pour chaque semaine, l'exercice de son thème (exercices-donnees.js) au niveau d'exercice du niveau
       déclaré dans Mon académie, sans doublon : il n'y a qu'un exercice par thème et par niveau, donc la 2e semaine
       d'un même thème (la bandeja, puis smash ou pas smash) reçoit celui d'un niveau voisin, signalé comme tel.
   Valider une semaine ici coche la même semaine du plan générique (même case, même stockage, même synchronisation) :
   aucune progression n'est dupliquée ni perdue. Sans niveau déclaré : invitation à le choisir, plan générique seul.
   Dépend de plan.js (WEEKS), exercices-donnees.js, exercices.js, academie-questions.js, academie-contenus.js et
   academie-parcours.js (chargés avant). */
// Thèmes de l'académie et thème d'exercices de chaque semaine du plan générique (même ordre que WEEKS)
const MP_SEMAINES=[
 {themes:["vitres","defense"],exercices:"vitre"},          // La vitre est ton amie
 {themes:["volee"],exercices:"placement"},                 // Volée de blocage
 {themes:["lob"],exercices:"montee"},                      // Le lob d'attaque
 {themes:["transition","placement","communication"],exercices:"couple"}, // Monter à deux
 {themes:["bandeja","vibora"],exercices:"aerien"},          // La bandeja
 {themes:["transition","volee"],exercices:"transition"},   // Chiquita et transition
 {themes:["bandeja","vibora","lob"],exercices:"aerien"},    // Smash ou pas smash
 {themes:["construction","regles"],exercices:"compet"},     // Semaine match (toujours la dernière)
];

// Plan personnalisé : [{i (indice dans WEEKS), priorite (thème ou null), exercice}]
function mpPlan({priorites,nivEx,E}){
 const rang=i=>{const r=Math.min(...MP_SEMAINES[i].themes.map(t=>{const k=priorites.indexOf(t);return k<0?99:k;}));return r;};
 const ordre=[0,1,2,3,4,5,6].sort((a,b)=>rang(a)-rang(b)||a-b).concat(7);
 const vus=new Set();
 return ordre.map(i=>{
  const r=rang(i),l=E?E.exercicesPour(MP_SEMAINES[i].exercices,nivEx):[];
  const e=l.find(x=>!vus.has(x.id))||l[0]||null;if(e)vus.add(e.id);
  return {i,priorite:i<7&&r<99?priorites[r]:null,exercice:e,voisin:!!e&&!e.niveaux.includes(nivEx)};
 });
}

(function(){
 const zone=document.getElementById("mon-plan"),wk=document.getElementById("weeks");
 if(!zone||!wk||typeof WEEKS==="undefined")return;
 const C=window.PA_ACADEMIE_CONTENUS,P=window.PA_PARCOURS,E=window.PA_EXERCICES;
 const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[c]);
 const lireJ=(cle,def)=>{try{const v=JSON.parse(localStorage.getItem(cle)||"null");return v===null?def:v;}catch(e){return def;}};
 function rendre(){
  const niveau=C?C.niveauDeclare():null;
  if(!niveau||!P||typeof ACADEMIE_THEMES==="undefined"){
   zone.innerHTML=`<p>Choisis ton niveau de 1 à 10 dans Mon académie : ces 8 semaines se remettront dans l'ordre de tes priorités, avec un exercice à ton niveau pour chacune.</p><p><a class="btn primary" href="academie.html#niveaux">Choisir mon niveau de 1 à 10</a></p>`;
   return;
  }
  const seances=C.seancesQuiz(),faibles=C.themesFaibles(seances);
  const choisis=(lireJ(P.CLE_PRIORITES,{}).themes||[]).filter(t=>ACADEMIE_THEMES[t]).slice(0,3);
  const priorites=P.priorites({niveau,faibles,choisis,max:3});
  const plan=mpPlan({priorites,nivEx:C.niveauExercice(niveau),E});
  const T=ACADEMIE_THEMES,nom=t=>T[t].nom;
  const raison=t=>choisis.includes(t)?"ta priorité":faibles.some(f=>f.theme===t)?"à revoir d'après tes quiz":"compétence de ton niveau";
  zone.innerHTML=`<p class="mp-intro">Niveau déclaré <b>${niveau}</b> · tes 3 priorités : ${priorites.map(t=>"<b>"+esc(nom(t))+"</b>").join(", ")}. Les semaines de tes priorités passent en tête ; chaque semaine a un exercice à ton niveau. <a href="academie.html#parcours">Changer mes priorités</a>.</p>
  <ol class="mp-liste">${plan.map((p,k)=>{const w=WEEKS[p.i],fait=!!(wk.querySelector("#w"+p.i)||{}).checked,e=p.exercice;
   return `<li class="mp-semaine${fait?" done":""}"><div class="mp-tete"><span class="mp-num">${k+1}</span><div><h3>${esc(w.t)}</h3><p class="ap-tag">Semaine ${p.i+1} du plan générique${p.priorite?` · <span class="ap-etat ap-a-travailler">${esc(nom(p.priorite))} : ${raison(p.priorite)}</span>`:""}</p></div></div>
    <p class="wobj"><b>Objectif :</b> ${esc(w.obj)}</p>
    ${e?`<details><summary>${p.voisin?"Exercice":"Exercice à ton niveau"} : <b>${esc(e.titre)}</b> <span class="ap-tag">${esc(e.duree)} · ${esc(e.joueurs)}${p.voisin?` · <span class="mp-voisin">niveau voisin</span>`:""}</span></summary><p>${esc(e.consigne)}</p><p class="ex-reussite"><b>Objectif :</b> ${esc(e.reussite)}</p></details>`:""}
    <button type="button" class="btn ghost mp-valider" data-i="${p.i}" aria-pressed="${fait}"${(wk.querySelector("#w"+p.i)||{}).disabled?" disabled":""}>${fait?"Semaine validée":"Valider cette semaine"}</button></li>`;}).join("")}</ol>`;
 }
 // Valider ici = cocher la même semaine du plan générique (plan.js enregistre et synchronise)
 zone.addEventListener("click",e=>{
  const b=e.target.closest(".mp-valider");if(!b)return;
  const c=wk.querySelector("#w"+b.dataset.i);if(!c||c.disabled)return;
  c.click();
  const n=zone.querySelector('.mp-valider[data-i="'+b.dataset.i+'"]');if(n)n.focus();
 });
 // Le plan générique se redessine (case cochée, synchronisation, compte) : Mon plan suit
 new MutationObserver(()=>rendre()).observe(wk,{childList:true,subtree:true,attributes:true,attributeFilter:["disabled"]});
 ["pa-academie","pa-academie-quiz","pa-academie-priorites"].forEach(ev=>window.addEventListener(ev,rendre));
 document.addEventListener("visibilitychange",()=>{if(!document.hidden)rendre();});
 rendre();
})();
window.PA_MON_PLAN={plan:mpPlan,SEMAINES:MP_SEMAINES};
