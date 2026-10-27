/* MON ACADÉMIE · Quiz adaptatif (academie.html#quiz), phase 3
   Questions : ACADEMIE_QUESTIONS (academie-questions.js), seulement celles au statut « validee ».
   Une séance (réglable, AQ_CONFIG) :
     1. questions de référence au niveau déclaré N ;
     2. puis questions d'adaptation : découverte au niveau N+1 si les réponses de référence sont presque toutes justes,
        consolidation au niveau N−1 si elles sont souvent fausses, sinon encore le niveau N ; bornes 1 et 10 respectées
        (pas de consolidation au niveau 1, pas de découverte au niveau 10 : on reste au niveau N).
   Thèmes variés, prérequis respectés (une question qui suit une autre dans la même scène n'est posée qu'après elle, ou si
   elle a déjà été réussie), pas de question des 2 dernières séances tant que la banque le permet, réponses mélangées.
   Le niveau déclaré n'est jamais modifié par le score. Séance en cours et historique sur l'appareil (pa-academie-quiz),
   à part du niveau (pa-academie) : une séance interrompue reprend où elle s'était arrêtée. */
const AQ_CLE="pa-academie-quiz";
const AQ_CONFIG={reference:6,adaptation:4,seuilDecouverte:5,seuilConsolidation:3,seancesSansRepetition:2,maxSeances:30};

/* ---------- Moteur (pur, testé sous Node) ---------- */
function aqMelanger(l,alea){const r=l.slice();for(let i=r.length-1;i>0;i--){const j=Math.floor(alea()*(i+1));[r[i],r[j]]=[r[j],r[i]];}return r;}
const aqPosable=(q,n)=>q.statut==="validee"&&q.niveauMin<=n&&n<=q.niveauMax;
// Questions déjà vues (dernières séances) et réussies (toutes séances)
function aqMemoire(seances,config=AQ_CONFIG){
 const exclus=new Set(),maitrisees=new Set();
 seances.slice(-config.seancesSansRepetition).forEach(s=>s.reponses.forEach(r=>exclus.add(r.id)));
 seances.forEach(s=>s.reponses.forEach(r=>{if(r.juste)maitrisees.add(r.id);}));
 return {exclus,maitrisees};
}
/* Tirage de nb questions au niveau cible. mode : "reference" | "decouverte" (de préférence des questions qui commencent
   au-dessus du niveau du joueur) | "consolidation" (de préférence des questions qui s'arrêtent sous son niveau).
   Ordre de préférence : préférées non vues, autres non vues, préférées déjà vues, autres déjà vues. Chaque question est
   choisie dans le premier palier qui en propose une permise (prérequis connu), dans le thème le moins représenté.
   Une question déjà vue qui débloque une question inédite (son prérequis) passe avant les autres déjà vues. */
function aqTirer(Q,{niveau,cible=niveau,mode="reference",nb,deja=[],exclus=new Set(),maitrisees=new Set()},alea=Math.random){
 const pris=new Set(deja),choisies=[];
 const pool=aqMelanger(Q.filter(q=>aqPosable(q,cible)&&!pris.has(q.id)),alea);
 const prefere=q=>mode==="decouverte"?q.niveauMin>niveau:mode==="consolidation"?q.niveauMax<niveau:true;
 const paliers=[pool.filter(q=>prefere(q)&&!exclus.has(q.id)),pool.filter(q=>!prefere(q)&&!exclus.has(q.id)),pool.filter(q=>prefere(q)&&exclus.has(q.id)),pool.filter(q=>!prefere(q)&&exclus.has(q.id))];
 const permis=q=>q.prerequis.every(p=>maitrisees.has(p)||pris.has(p));
 const nbTheme=t=>choisies.filter(q=>q.theme===t).length;
 while(choisies.length<nb){
  // prérequis des questions inédites encore bloquées
  const debloque=new Set(pool.filter(q=>!exclus.has(q.id)&&!pris.has(q.id)&&!permis(q)).flatMap(q=>q.prerequis));
  let q=null;
  for(const palier of paliers){
   const permises=palier.filter(x=>!pris.has(x.id)&&permis(x));
   if(!permises.length)continue;
   q=permises.reduce((a,b)=>{
    const ka=[exclus.has(a.id)&&!debloque.has(a.id)?1:0,nbTheme(a.theme)],kb=[exclus.has(b.id)&&!debloque.has(b.id)?1:0,nbTheme(b.theme)];
    return kb[0]<ka[0]||(kb[0]===ka[0]&&kb[1]<ka[1])?b:a;
   });
   break;
  }
  if(!q)break;
  choisies.push(q);pris.add(q.id);
 }
 return choisies;
}
// Nouvelle séance : les questions de référence, réponses mélangées une fois pour toutes (reprise identique)
function aqNouvelle(Q,niveau,seances,alea=Math.random,config=AQ_CONFIG,date=new Date().toISOString()){
 const {exclus,maitrisees}=aqMemoire(seances,config);
 const qs=aqTirer(Q,{niveau,nb:config.reference,exclus,maitrisees},alea);
 return {id:"s-"+Date.parse(date).toString(36)+"-"+Math.floor(alea()*1e6).toString(36),niveau,debut:date,
  questions:qs.map(q=>({id:q.id,type:"reference",cible:niveau,ordre:aqMelanger(q.choix.map((_,i)=>i),alea)})),reponses:[],adaptee:false};
}
// Décision d'adaptation d'après les réponses de référence
function aqAdaptation(niveau,bonnes,config=AQ_CONFIG){
 if(bonnes>=config.seuilDecouverte&&niveau<10)return {mode:"decouverte",cible:niveau+1};
 if(bonnes<=config.seuilConsolidation&&niveau>1)return {mode:"consolidation",cible:niveau-1};
 return {mode:"reference",cible:niveau};
}
// Réponse à la question en cours (choix = indice d'origine) ; ajoute les questions d'adaptation après la référence
function aqRepondre(Q,seance,choix,seances,alea=Math.random,config=AQ_CONFIG){
 const i=seance.reponses.length,item=seance.questions[i];
 if(!item)return seance;
 const q=Q.find(x=>x.id===item.id);
 const s={...seance,questions:seance.questions.slice(),reponses:seance.reponses.concat([{id:q.id,choix,juste:choix===q.bonne,type:item.type,theme:q.theme}])};
 const nbRef=s.questions.filter(x=>x.type==="reference"&&!s.adaptee).length;
 if(!s.adaptee&&s.reponses.length===nbRef){
  const bonnes=s.reponses.filter(r=>r.juste).length,a=aqAdaptation(s.niveau,bonnes,config);
  const {exclus,maitrisees}=aqMemoire(seances,config);
  s.reponses.forEach(r=>{if(r.juste)maitrisees.add(r.id);});
  const ajout=aqTirer(Q,{niveau:s.niveau,cible:a.cible,mode:a.mode,nb:config.adaptation,deja:s.questions.map(x=>x.id),exclus,maitrisees},alea);
  s.questions=s.questions.concat(ajout.map(x=>({id:x.id,type:a.mode,cible:a.cible,ordre:aqMelanger(x.choix.map((_,k)=>k),alea)})));
  s.adaptee=true;s.adaptation=a;
 }
 if(s.reponses.length===s.questions.length)s.fin=new Date().toISOString();
 return s;
}
// Bilan d'une séance terminée
function aqBilan(Q,seance){
 const parTheme={};
 seance.reponses.forEach(r=>{const t=parTheme[r.theme]=parTheme[r.theme]||{bonnes:0,total:0};t.total++;if(r.juste)t.bonnes++;});
 const themes=Object.keys(parTheme);
 const forts=themes.filter(t=>parTheme[t].bonnes===parTheme[t].total).sort((a,b)=>parTheme[b].total-parTheme[a].total);
 const aRenforcer=themes.filter(t=>parTheme[t].bonnes<parTheme[t].total).sort((a,b)=>(parTheme[a].bonnes/parTheme[a].total)-(parTheme[b].bonnes/parTheme[b].total)||parTheme[b].total-parTheme[a].total);
 const erreurs=seance.reponses.filter(r=>!r.juste).map(r=>({question:Q.find(q=>q.id===r.id),choix:r.choix}));
 // Une recommandation par thème à renforcer (3 au plus) : article, exercice et scène 3D de la question manquée
 const recommandations=aRenforcer.slice(0,3).map(t=>{const q=erreurs.find(e=>e.question.theme===t).question;return {theme:t,article:q.article,exercice:q.exercice,scenario:q.scenario};});
 return {score:seance.reponses.filter(r=>r.juste).length,total:seance.reponses.length,parTheme,forts,aRenforcer,erreurs,recommandations,adaptation:seance.adaptation||null};
}
// Stockage relu avec contrôle
function aqNormaliser(e,Q){
 const ids=new Set((Q||[]).map(q=>q.id));
 const reponseValide=r=>r&&ids.has(r.id)&&Number.isInteger(r.choix)&&typeof r.juste==="boolean"&&typeof r.theme==="string";
 const seanceValide=s=>s&&typeof s.id==="string"&&Number.isInteger(s.niveau)&&s.niveau>=1&&s.niveau<=10&&Array.isArray(s.questions)&&s.questions.length&&
  s.questions.every(x=>x&&ids.has(x.id)&&Array.isArray(x.ordre))&&Array.isArray(s.reponses)&&s.reponses.length<=s.questions.length&&s.reponses.every(reponseValide);
 if(!e||typeof e!=="object")return {enCours:null,seances:[]};
 const seances=(Array.isArray(e.seances)?e.seances:[]).filter(s=>seanceValide(s)&&s.reponses.length===s.questions.length).slice(-AQ_CONFIG.maxSeances);
 const enCours=seanceValide(e.enCours)&&e.enCours.reponses.length<e.enCours.questions.length?e.enCours:null;
 return {enCours,seances};
}

/* ---------- Interface ---------- */
function aqDemarrer(){
 const zone=document.getElementById("aq");
 if(!zone)return;
 if(typeof ACADEMIE_QUESTIONS==="undefined"){zone.innerHTML=`<p class="msg msg-erreur">Les questions n'ont pas pu se charger (connexion interrompue ?). Recharge la page pour faire ton quiz.</p>`;return;}
 const Q=ACADEMIE_QUESTIONS,T=ACADEMIE_THEMES;
 const EX=typeof EXERCICES!=="undefined"?EXERCICES:[];
 const scenes=typeof QUIZ_TACTIQUE!=="undefined"?QUIZ_TACTIQUE:[];
 const lire=()=>{try{return aqNormaliser(JSON.parse(localStorage.getItem(AQ_CLE)||"null"),Q);}catch(e){return aqNormaliser(null,Q);}};
 const ecrire=e=>{try{localStorage.setItem(AQ_CLE,JSON.stringify(e));return true;}catch(err){return false;}};
 const niveau=()=>window.PA_ACADEMIE?window.PA_ACADEMIE.lire().niveau:null;
 const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[c]);
 const TYPE={reference:"Ton niveau",decouverte:"Découverte",consolidation:"Consolidation"};
 const focus=sel=>{const el=zone.querySelector(sel);if(!el)return;if(zone.getBoundingClientRect().top<0)zone.scrollIntoView({block:"start"});el.focus({preventScroll:true});};

 function accueil(){
  const n=niveau(),e=lire();
  if(!n){zone.innerHTML=`<p class="aq-vide">Choisis d'abord ton niveau : ton quiz sera construit pour lui. <a href="#academie">Choisir mon niveau</a>.</p>`;return;}
  const der=e.seances[e.seances.length-1];
  let html="";
  if(e.enCours){
   const s=e.enCours,autre=s.niveau!==n;
   html=`<p>Tu as un quiz en cours (niveau ${s.niveau}) : question ${s.reponses.length+1} sur ${s.questions.length}${s.adaptee?"":" au moins"}.</p>
    ${autre?`<p class="msg msg-alerte">Ce quiz a commencé au niveau ${s.niveau} ; ton niveau déclaré est maintenant le ${n}.</p>`:""}
    <p class="aq-actions"><button type="button" class="btn primary" id="aq-reprendre">Reprendre mon quiz</button><button type="button" class="btn ghost" id="aq-nouveau">${autre?"Nouveau quiz au niveau "+n:"Recommencer"}</button></p>`;
  }else{
   html=`<p>${AQ_CONFIG.reference+AQ_CONFIG.adaptation} questions, une à la fois, sur les situations de jeu de ton niveau (${n}). Selon tes réponses, les dernières questions te font découvrir le niveau du dessus ou revoir celui du dessous. Ton niveau déclaré ne change pas.</p>
    <p class="aq-actions"><button type="button" class="btn primary" id="aq-nouveau">${der?"Refaire un quiz":"Commencer mon quiz"}</button></p>`;
  }
  if(der){const b=aqBilan(Q,der);html+=`<p class="note">Dernier quiz (${new Date(der.debut).toLocaleDateString("fr-FR")}, niveau ${der.niveau}) : ${b.score} sur ${b.total}${b.aRenforcer.length?" ; à renforcer : "+b.aRenforcer.slice(0,3).map(t=>T[t].nom.toLowerCase()).join(", "):""}.</p>`;}
  zone.innerHTML=html;
  zone.querySelector("#aq-reprendre")?.addEventListener("click",()=>question());
  zone.querySelector("#aq-nouveau").addEventListener("click",()=>{
   const e2=lire(),s=aqNouvelle(Q,niveau(),e2.seances);
   if(!s.questions.length){zone.innerHTML=`<p class="msg msg-erreur">Pas encore de questions pour ce niveau.</p>`;return;}
   e2.enCours=s;if(!ecrire(e2)){zone.insertAdjacentHTML("afterbegin",`<p class="msg msg-erreur">Impossible d'enregistrer ton quiz sur cet appareil.</p>`);return;}
   question();
  });
 }

 function question(){
  const e=lire(),s=e.enCours;if(!s){accueil();return;}
  const i=s.reponses.length,item=s.questions[i],q=Q.find(x=>x.id===item.id);
  const total=s.adaptee?s.questions.length:AQ_CONFIG.reference+AQ_CONFIG.adaptation;
  const sc=scenes.find(x=>x.id===q.id),schema=sc&&typeof qtSchema==="function"?`<div class="qt-scene aq-scene">${qtSchema(sc)}</div>`:"";
  const type=item.type==="reference"?"":`<span class="aq-type aq-${item.type}">${TYPE[item.type]} · niveau ${item.cible}</span>`;
  zone.innerHTML=`<div class="aq-question${schema?" aq-avec-schema":""}">
   <div class="aq-tete"><p class="aq-avancement">Question ${i+1} sur ${total} · ${esc(T[q.theme].nom)} ${type}</p>
   <div class="aq-barre" role="progressbar" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${i}" aria-label="Progression du quiz"><span style="width:${Math.round(100*i/total)}%"></span></div></div>
   ${schema}
   <div class="aq-texte"><p class="qt-scenario">${esc(q.situation)}</p>
   <h3 id="aq-intitule" tabindex="-1">${esc(q.question)}</h3>
   <div class="qt-choix" role="group" aria-labelledby="aq-intitule">${item.ordre.map(k=>`<button type="button" class="qt-reponse" data-k="${k}">${esc(q.choix[k])}</button>`).join("")}</div>
   <div class="qt-correction" id="aq-correction" aria-live="polite"></div></div></div>`;
  zone.querySelectorAll(".qt-reponse").forEach(b=>b.addEventListener("click",()=>repondre(Number(b.dataset.k))));
  focus("#aq-intitule");
 }

 function repondre(k){
  const e=lire(),s0=e.enCours;if(!s0)return;
  const q=Q.find(x=>x.id===s0.questions[s0.reponses.length].id),s=aqRepondre(Q,s0,k,e.seances);
  zone.querySelectorAll(".qt-reponse").forEach(b=>{const v=Number(b.dataset.k);b.disabled=true;if(v===q.bonne)b.classList.add("bonne");else if(v===k)b.classList.add("fausse");if(v===k)b.setAttribute("aria-pressed","true");});
  const fini=s.reponses.length===s.questions.length;
  if(fini){e.enCours=null;e.seances=e.seances.concat([s]).slice(-AQ_CONFIG.maxSeances);}else e.enCours=s;
  const garde=ecrire(e);
  if(fini)window.dispatchEvent(new Event("pa-academie-quiz")); // parcours : compétences et recommandations à jour
  const juste=k===q.bonne;
  zone.querySelector("#aq-correction").innerHTML=`<p class="msg ${juste?"msg-ok":"msg-erreur"}"><b>${juste?"Bonne réponse.":"Pas tout à fait."}</b> ${esc(q.explication)}</p>
   ${garde?"":`<p class="msg msg-alerte">Ta réponse n'a pas pu être enregistrée sur cet appareil : si tu fermes la page, le quiz ne reprendra pas ici.</p>`}
   <p class="qt-actions"><button type="button" class="btn primary" id="aq-suite">${fini?"Voir mon bilan":"Question suivante"}</button>${q.scenario?`<a class="btn ghost" href="simulateur-3d-${q.scenario}.html">Voir la scène en 3D</a>`:""}</p>`;
  zone.querySelector("#aq-suite").addEventListener("click",()=>fini?bilan(s):question());
  focus("#aq-suite");
 }

 function bilan(s){
  const b=aqBilan(Q,s);
  const ligne=t=>{const v=b.parTheme[t];return `<tr><th scope="row">${esc(T[t].nom)}</th><td>${v.bonnes} sur ${v.total}</td></tr>`;};
  const adapt=b.adaptation?{decouverte:`Tes réponses t'ont fait découvrir des questions du niveau ${b.adaptation.cible}.`,consolidation:`Les dernières questions revenaient sur le niveau ${b.adaptation.cible}, pour consolider les bases.`,reference:`Toutes les questions étaient de ton niveau (${s.niveau}).`}[b.adaptation.mode]:"";
  const reco=b.recommandations.map(r=>{const ex=EX.find(x=>x.id===r.exercice);
   return `<article class="aq-reco"><h4>${esc(T[r.theme].nom)}</h4>
    ${ex?`<p><b>Exercice :</b> ${esc(ex.titre)} (${esc(ex.duree)}, ${esc(ex.joueurs)}). ${esc(ex.consigne)}</p><p class="ex-reussite"><b>Objectif :</b> ${esc(ex.reussite)}</p>`:""}
    <p class="qt-actions"><a class="btn primary" href="${esc(r.article)}">Travailler cette compétence</a>${r.scenario?`<a class="btn ghost" href="simulateur-3d-${r.scenario}.html">Voir en 3D</a>`:""}</p></article>`;}).join("");
  zone.innerHTML=`<div class="aq-bilan">
   <h3 id="aq-score" tabindex="-1">Score : ${b.score} sur ${b.total}</h3>
   <p>${adapt} Ton niveau déclaré reste le ${s.niveau} : un quiz mesure tes connaissances, pas ton jeu sur le terrain.</p>
   <h4>Réussite par thème</h4><div class="tbl esp-tbl-compact"><table><tbody>${Object.keys(b.parTheme).map(ligne).join("")}</tbody></table></div>
   ${b.forts.length?`<p><b>Tes points forts :</b> ${b.forts.map(t=>esc(T[t].nom.toLowerCase())).join(", ")}.</p>`:""}
   ${b.aRenforcer.length?`<p><b>À renforcer :</b> ${b.aRenforcer.map(t=>esc(T[t].nom.toLowerCase())).join(", ")}.</p>`:"<p><b>Sans faute :</b> rien à renforcer sur ces questions.</p>"}
   ${b.erreurs.length?`<h4>Tes erreurs, expliquées</h4><ol class="aq-erreurs">${b.erreurs.map(x=>`<li><p class="qt-scenario">${esc(x.question.situation)}</p><p><b>${esc(x.question.question)}</b></p><p>Ta réponse : ${esc(x.question.choix[x.choix])}. Bonne réponse : ${esc(x.question.choix[x.question.bonne])}.</p><p class="note">${esc(x.question.explication)}</p></li>`).join("")}</ol>`:""}
   ${reco?`<h4>Pour progresser</h4><div class="aq-recos">${reco}</div>`:""}
   <p class="aq-actions"><button type="button" class="btn primary" id="aq-refaire">Refaire un quiz</button><a class="btn ghost" href="simulateur-3d.html">Ouvrir le simulateur 3D</a></p></div>`;
  zone.querySelector("#aq-refaire").addEventListener("click",()=>{
   const e=lire(),n=aqNouvelle(Q,niveau(),e.seances);e.enCours=n;ecrire(e);question();
  });
  focus("#aq-score");
 }
 // Niveau changé : on garde la question affichée d'un quiz en cours, sinon on revient à l'accueil du quiz
 window.addEventListener("pa-academie",()=>{if(!zone.querySelector(".aq-question")||!lire().enCours)accueil();});
 // « Reprendre mon quiz » en haut de la page
 window.addEventListener("pa-academie-reprendre",()=>{zone.scrollIntoView({block:"start"});question();});
 accueil();
}
window.PA_ACADEMIE_QUIZ={CONFIG:AQ_CONFIG,CLE:AQ_CLE,tirer:aqTirer,nouvelle:aqNouvelle,repondre:aqRepondre,adaptation:aqAdaptation,bilan:aqBilan,memoire:aqMemoire,normaliser:aqNormaliser};
aqDemarrer();
