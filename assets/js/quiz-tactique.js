/* QUIZ TACTIQUE (tactique.html#quiz)
   Les questions des scénarios 3D, sans la 3D : la scène figée à l'instant de la question est dessinée en 2D, vue de
   dessus et de derrière toi (ton équipe en bas, ta droite à droite). Données : assets/js/quiz-tactique-donnees.js,
   générées depuis les scénarios par scripts/generer-quiz-tactique.mjs (positions calculées par le moteur du simulateur).
   Séries de 10 questions (ou moins si le niveau en a moins), tirées au hasard ; réponses mélangées à chaque affichage.
   Après chaque réponse : correction, explication et lien vers la scène en 3D (mode quiz) ; après une erreur, « Pour
   revoir ce point » : article, exercice et scène 3D de la question (qtRevoir, partagé avec Mon académie). À la fin : score et
   scénarios à revoir. Meilleur score par niveau gardé sur l'appareil (pa-quiz-tactique). */
const QT_NIVEAUX=["Tous","Débutant","Intermédiaire","Avancé"];
const QT_SERIE=10;
const QT_CLE="pa-quiz-tactique";

// Tirage de n questions (mélange de Fisher-Yates) ; alea : fonction de 0 à 1 (remplaçable dans les tests)
function qtTirer(pool,n,alea=Math.random){
 const l=pool.slice();
 for(let i=l.length-1;i>0;i--){const j=Math.floor(alea()*(i+1));[l[i],l[j]]=[l[j],l[i]];}
 return l.slice(0,Math.min(n,l.length));
}
// Choix dans un ordre mélangé : la bonne réponse ne se devine pas à sa place
function qtMelanger(q,alea=Math.random){
 const ordre=qtTirer(q.choix.map((_,i)=>i),q.choix.length,alea);
 return {choix:ordre.map(i=>q.choix[i]),bonne:ordre.indexOf(q.bonne)};
}
const qtEchapper=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[c]);
// « Pour revoir ce point » après une erreur : article, exercice (EXERCICES si la page les charge) et scène 3D
function qtRevoir({article,exercice,scene,titreScene}){
 const e=typeof exercice==="string"?(typeof EXERCICES!=="undefined"?EXERCICES.find(x=>x.id===exercice):null):exercice;
 const l=[];
 if(article)l.push(`<li><span class="qt-revoir-lib">Article</span> <a href="${qtEchapper(article.url)}">${qtEchapper(article.titre)}</a></li>`);
 if(e)l.push(`<li><span class="qt-revoir-lib">Exercice</span> <details><summary><b>${qtEchapper(e.titre)}</b> <span class="ap-tag">${qtEchapper(e.duree)} · ${qtEchapper(e.joueurs)}</span></summary><p>${qtEchapper(e.consigne)}</p><p class="ex-reussite"><b>Objectif :</b> ${qtEchapper(e.reussite)}</p></details></li>`);
 if(scene)l.push(`<li><span class="qt-revoir-lib">Scène 3D</span> <a href="simulateur-3d-${qtEchapper(scene)}.html#mode-quiz">${qtEchapper(titreScene||scene)}</a></li>`);
 return l.length?`<div class="qt-revoir"><p class="qt-revoir-titre">Pour revoir ce point</p><ul>${l.join("")}</ul></div>`:"";
}
const qtMetres=v=>v.toFixed(1).replace(".",",")+" m";

// Description en mots (lecteurs d'écran) : où sont les joueurs et la balle, vus de derrière toi
function qtOu(x,z){
 const cote=x<-1?"côté droit":x>1?"côté gauche":"au centre";
 const d=Math.abs(z),prof=d<4.5?"près du filet":d<7.5?"à mi-terrain":"au fond";
 return prof+", "+cote;
}
function qtDescription(q){
 const j=q.joueurs.map(([,nom,x,z])=>nom+" : "+qtOu(x,z)).join(" ; ");
 const b=q.balle;
 return "Schéma du terrain vu de dessus, ton équipe en bas. "+j+". Balle à "+qtMetres(b[1])+" de haut, "+(b[2]<0?"dans ton camp":"chez les adversaires")+", "+qtOu(b[0],b[2])+".";
}

// Schéma SVG en mètres : x écran = -x (ta droite à droite), y écran = -z (ton camp en bas)
function qtSchema(q){
 const P=(x,z)=>(-x).toFixed(2)+","+(-z).toFixed(2);
 const lignes=`<rect class="qt-sol" x="-5" y="-10" width="10" height="20"/>`+
  `<path class="qt-ligne" d="M-5,-6.95H5M-5,6.95H5M0,-6.95V6.95"/>`+
  `<rect class="qt-cadre" x="-5" y="-10" width="10" height="20"/>`+
  `<line class="qt-filet" x1="-5.3" y1="0" x2="5.3" y2="0"/>`;
 const trace=q.trace.length?`<polyline class="qt-trace" points="${q.trace.concat([[q.balle[0],q.balle[2]]]).map(([x,z])=>P(x,z)).join(" ")}"/>`:"";
 const joueurs=q.joueurs.map(([id,nom,x,z])=>{
  const sx=-x,sy=-z,court=nom.replace("Adversaire ","Adv. ");
  return `<g class="qt-joueur qt-${id[0]==="A"?"nous":"eux"}"><circle cx="${sx.toFixed(2)}" cy="${sy.toFixed(2)}" r="0.42"/>`+
   `<text x="${sx.toFixed(2)}" y="${(sy-0.72).toFixed(2)}">${qtEchapper(court)}</text></g>`;
 }).join("");
 const [bx,bh,bz]=q.balle;
 // Balle : son ombre au sol et la balle elle-même, avec sa hauteur écrite à côté
 const balle=`<g class="qt-balle"><ellipse class="qt-ombre" cx="${(-bx).toFixed(2)}" cy="${(-bz).toFixed(2)}" rx="0.2" ry="0.12"/>`+
  `<circle cx="${(-bx).toFixed(2)}" cy="${(-bz).toFixed(2)}" r="0.2"/>`+
  `<text x="${(-bx+(bx<-3?-0.4:0.4)).toFixed(2)}" y="${(-bz+0.2).toFixed(2)}" text-anchor="${bx<-3?"end":"start"}">${qtMetres(bh)}</text></g>`;
 return `<svg class="qt-schema" viewBox="-5.8 -10.8 11.6 21.6" role="img" aria-label="${qtEchapper(qtDescription(q))}">${lignes}${trace}${joueurs}${balle}</svg>`;
}

// Meilleur score par niveau, sur l'appareil
function qtMeilleurs(){try{const m=JSON.parse(localStorage.getItem(QT_CLE)||"{}");return m&&typeof m==="object"?m:{};}catch(e){return {};}}
function qtEnregistrer(niveau,score,sur){
 const m=qtMeilleurs(),a=m[niveau];
 if(!a||score/sur>a.score/a.sur||(score/sur===a.score/a.sur&&sur>a.sur)){m[niveau]={score,sur,date:new Date().toISOString().slice(0,10)};
  try{localStorage.setItem(QT_CLE,JSON.stringify(m));}catch(e){/* stockage indisponible */}}
 return qtMeilleurs()[niveau]||{score,sur};
}

function qtDemarrer(){
 const zone=document.getElementById("qt");
 if(!zone||typeof QUIZ_TACTIQUE==="undefined")return;
 const etat={niveau:"Tous",serie:[],i:0,score:0,manquees:[],melange:null};
 const pool=n=>n==="Tous"?QUIZ_TACTIQUE:QUIZ_TACTIQUE.filter(q=>q.niveau===n);
 // Nouvel écran : on revient en haut du quiz (le schéma reste visible sur mobile), puis le focus va au texte utile
 const focus=(sel,remonter)=>{if(remonter&&zone.getBoundingClientRect().top<0)zone.scrollIntoView({block:"start"});const el=zone.querySelector(sel);if(el)el.focus({preventScroll:!!remonter});};

 function accueil(){
  const m=qtMeilleurs();
  zone.innerHTML=`<p class="qt-consigne">Choisis un niveau : ${QT_SERIE} questions tirées au hasard parmi les ${QUIZ_TACTIQUE.length} des scénarios 3D. Chaque question montre la scène, figée juste avant le coup.</p>
   <div class="phases qt-niveaux" role="group" aria-label="Niveau des questions">${QT_NIVEAUX.map(n=>`<button type="button" data-niveau="${n}" aria-pressed="${n===etat.niveau}">${n} <span class="qt-nb">${pool(n).length}</span></button>`).join("")}</div>
   <p class="qt-record" id="qt-record"></p>
   <button type="button" class="btn primary" id="qt-commencer">Commencer</button>`;
  const record=()=>{const r=m[etat.niveau];zone.querySelector("#qt-record").textContent=r?`Ton meilleur score (${etat.niveau.toLowerCase()}) : ${r.score} sur ${r.sur}.`:"";};
  zone.querySelectorAll("[data-niveau]").forEach(b=>b.addEventListener("click",()=>{
   etat.niveau=b.dataset.niveau;
   zone.querySelectorAll("[data-niveau]").forEach(x=>x.setAttribute("aria-pressed",String(x===b)));
   record();
  }));
  record();
  zone.querySelector("#qt-commencer").addEventListener("click",()=>{
   Object.assign(etat,{serie:qtTirer(pool(etat.niveau),QT_SERIE),i:0,score:0,manquees:[]});
   question();
  });
 }

 function question(){
  const q=etat.serie[etat.i];
  etat.melange=qtMelanger(q);
  zone.innerHTML=`<div class="qt-question">
   <div class="qt-scene">${qtSchema(q)}<p class="qt-legende"><span class="qt-l-nous">Ton équipe</span><span class="qt-l-eux">Adversaires</span><span class="qt-l-balle">Balle (hauteur)</span></p></div>
   <div class="qt-texte">
    <p class="qt-avancement">Question ${etat.i+1} sur ${etat.serie.length} · <span class="lvl" data-l="${q.niveau}">${q.niveau}</span></p>
    <p class="qt-scenario"><b>${qtEchapper(q.titre)}.</b> ${qtEchapper(q.situation)}</p>
    <h3 id="qt-intitule" tabindex="-1">${qtEchapper(q.question)}</h3>
    <div class="qt-choix" role="group" aria-labelledby="qt-intitule">${etat.melange.choix.map((c,i)=>`<button type="button" class="qt-reponse" data-i="${i}">${qtEchapper(c)}</button>`).join("")}</div>
    <div class="qt-correction" id="qt-correction" aria-live="polite"></div>
   </div></div>`;
  zone.querySelectorAll(".qt-reponse").forEach(b=>b.addEventListener("click",()=>repondre(Number(b.dataset.i))));
  focus("#qt-intitule",true);
 }

 function repondre(i){
  const q=etat.serie[etat.i],bonne=etat.melange.bonne,juste=i===bonne;
  if(juste)etat.score++;else etat.manquees.push(q);
  zone.querySelectorAll(".qt-reponse").forEach((b,k)=>{
   b.disabled=true;
   if(k===bonne)b.classList.add("bonne");
   else if(k===i)b.classList.add("fausse");
   if(k===i)b.setAttribute("aria-pressed","true");
  });
  const der=etat.i===etat.serie.length-1;
  zone.querySelector("#qt-correction").innerHTML=`<p class="msg ${juste?"msg-ok":"msg-erreur"}"><b>${juste?"Bonne réponse.":"Pas tout à fait."}</b> ${qtEchapper(q.explication)}</p>
   ${!juste&&q.revoir?qtRevoir({...q.revoir,scene:q.scenario,titreScene:q.titre}):""}
   <p class="qt-actions"><button type="button" class="btn primary" id="qt-suite">${der?"Voir mon score":"Question suivante"}</button>
   <a class="btn ghost" href="simulateur-3d-${q.scenario}.html#mode-quiz">Voir la scène en 3D</a></p>`;
  zone.querySelector("#qt-suite").addEventListener("click",()=>{if(der)fin();else{etat.i++;question();}});
  focus("#qt-suite");
 }

 function fin(){
  const sur=etat.serie.length,r=qtEnregistrer(etat.niveau,etat.score,sur);
  const scenarios=[...new Map(etat.manquees.map(q=>[q.scenario,q])).values()];
  const bilan=etat.score===sur?"Sans faute : tu lis bien le jeu.":etat.score/sur>=0.7?"Bonne lecture du jeu : revois les scènes manquées.":"Revois les scènes ci-dessous en 3D, pas à pas : la réponse se lit dans les placements.";
  zone.innerHTML=`<div class="qt-fin">
   <h3 id="qt-score" tabindex="-1">Score : ${etat.score} sur ${sur}</h3>
   <p>${bilan} Ton meilleur score (${etat.niveau.toLowerCase()}) : ${r.score} sur ${r.sur}.</p>
   ${scenarios.length?`<h4>À revoir</h4><ul class="qt-revoir">${scenarios.map(q=>`<li><a href="simulateur-3d-${q.scenario}.html">${qtEchapper(q.titre)}</a> <span class="lvl" data-l="${q.niveau}">${q.niveau}</span></li>`).join("")}</ul>`:""}
   <p class="qt-actions"><button type="button" class="btn primary" id="qt-rejouer">Nouvelle série</button> <button type="button" class="btn ghost" id="qt-niveau">Changer de niveau</button></p></div>`;
  zone.querySelector("#qt-rejouer").addEventListener("click",()=>{Object.assign(etat,{serie:qtTirer(pool(etat.niveau),QT_SERIE),i:0,score:0,manquees:[]});question();});
  zone.querySelector("#qt-niveau").addEventListener("click",accueil);
  focus("#qt-score",true);
 }

 accueil();
}
window.PA_QUIZ_TACTIQUE={tirer:qtTirer,melanger:qtMelanger,schema:qtSchema,description:qtDescription};
qtDemarrer();
