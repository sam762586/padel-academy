/* QUESTION DU JOUR (accueil et Mon espace) : une question de padel par jour, la même pour tous les joueurs du site.
   - Banque : assets/data/questions-jour.json, générée par scripts/generer-question-jour.mjs à partir des questions
     validées de Mon académie (aucune question écrite ici). Chargée seulement quand le bloc approche de l'écran.
   - Question du jour : (jours écoulés depuis le 1er janvier 2026, à l'heure de Paris) modulo la taille de la banque.
   - Une seule réponse par jour ; série de jours d'affilée et record, gardés sur l'appareil (pa-question-jour) :
     {v:1, dernier:"AAAA-MM-JJ", serie, meilleure, reponses:{"AAAA-MM-JJ":{ok, c:choix, q:id}}} (60 derniers jours).
     Répondre aujourd'hui (juste ou faux) prolonge la série si hier a été répondu, sinon elle repart à 1.
   - Un bloc = un élément [data-question-jour] contenant .qj-zone ; le script ne fait rien s'il n'y en a pas. */
(function(){
 const QJ_CLE="pa-question-jour";
 const QJ_URL="assets/data/questions-jour.json";
 const QJ_DEPART=Date.UTC(2026,0,1);
 const QJ_JOURS_GARDES=60;
 const JOUR_MS=86400000;

 /* ---------- Dates (heure de Paris) ---------- */
 // Date du jour à Paris, "AAAA-MM-JJ" (repli : date locale de l'appareil si le fuseau n'est pas connu)
 function jourParis(date){
  const d=date||new Date();
  try{
   const p={};
   new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Paris",year:"numeric",month:"2-digit",day:"2-digit"})
    .formatToParts(d).forEach(x=>{p[x.type]=x.value;});
   if(p.year&&p.month&&p.day)return p.year+"-"+p.month+"-"+p.day;
  }catch(e){}
  return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
 }
 const versUTC=jour=>{const [a,m,j]=jour.split("-").map(Number);return Date.UTC(a,m-1,j);};
 const numeroJour=jour=>Math.round((versUTC(jour)-QJ_DEPART)/JOUR_MS);
 const jourPrecedent=jour=>new Date(versUTC(jour)-JOUR_MS).toISOString().slice(0,10);
 // Index de la question du jour dans une banque de n questions (positif même avant le 1er janvier 2026)
 const indexDuJour=(jour,n)=>((numeroJour(jour)%n)+n)%n;

 /* ---------- Série (fonctions pures) ---------- */
 const etatVide=()=>({v:1,dernier:null,serie:0,meilleure:0,reponses:{}});
 const RE_JOUR=/^\d{4}-\d{2}-\d{2}$/;
 // Données de l'appareil relues avec prudence : une valeur abîmée est ignorée
 function normaliser(brut){
  if(!brut||typeof brut!=="object"||Array.isArray(brut)||brut.v!==1)return etatVide();
  const e=etatVide();
  if(RE_JOUR.test(brut.dernier||""))e.dernier=brut.dernier;
  if(Number.isInteger(brut.serie)&&brut.serie>0)e.serie=brut.serie;
  if(Number.isInteger(brut.meilleure)&&brut.meilleure>0)e.meilleure=brut.meilleure;
  e.meilleure=Math.max(e.meilleure,e.serie);
  if(brut.reponses&&typeof brut.reponses==="object"&&!Array.isArray(brut.reponses))
   Object.keys(brut.reponses).forEach(k=>{const r=brut.reponses[k];if(RE_JOUR.test(k)&&r&&typeof r==="object")e.reponses[k]=r;});
  return e;
 }
 // Série affichée un jour donné : elle tient si la dernière réponse date d'aujourd'hui ou d'hier
 function serieDuJour(etat,jour){
  return etat.dernier===jour||etat.dernier===jourPrecedent(jour)?etat.serie:0;
 }
 // Nouvel état après une réponse ; null si ce jour a déjà sa réponse
 function enregistrer(etat,jour,reponse){
  if(etat.reponses[jour])return null;
  const serie=etat.dernier===jourPrecedent(jour)?etat.serie+1:1;
  const reponses=Object.assign({},etat.reponses,{[jour]:reponse});
  const gardees={};
  Object.keys(reponses).sort().reverse().slice(0,QJ_JOURS_GARDES).forEach(k=>{gardees[k]=reponses[k];});
  return {v:1,dernier:jour,serie,meilleure:Math.max(etat.meilleure||0,serie),reponses:gardees};
 }

 /* ---------- Stockage de l'appareil ---------- */
 function lireEtat(){try{return normaliser(JSON.parse(localStorage.getItem(QJ_CLE)||"null"));}catch(e){return etatVide();}}
 function ecrireEtat(etat){try{localStorage.setItem(QJ_CLE,JSON.stringify(etat));return true;}catch(e){return false;}}

 window.PA_QUESTION_JOUR={jourParis,numeroJour,jourPrecedent,indexDuJour,serieDuJour,enregistrer,normaliser,CLE:QJ_CLE};

 const blocs=[...document.querySelectorAll("[data-question-jour]")];
 if(!blocs.length)return;

 /* ---------- Banque (chargée une seule fois) ---------- */
 let banque=null;
 function chargerBanque(){
  if(!banque)banque=fetch(QJ_URL).then(r=>{if(!r.ok)throw new Error("HTTP "+r.status);return r.json();}).then(d=>{
   if(!d||!Array.isArray(d.questions)||!d.questions.length||!Array.isArray(d.champs))throw new Error("banque vide");
   // Chaque question est un tableau dans l'ordre de d.champs
   const questions=d.questions.map(t=>{const q={};d.champs.forEach((c,i)=>{q[c]=t[i];});return q;});
   return {questions,themes:d.themes||{},liens:d.liens||[]};
  });
  return banque;
 }

 /* ---------- Affichage ---------- */
 const el=(balise,classe,texte)=>{const n=document.createElement(balise);if(classe)n.className=classe;if(texte!=null)n.textContent=texte;return n;};
 const jours=n=>n+(n>1?" jours":" jour");
 let compteur=0;

 function texteSerie(etat,jour){
  const s=serieDuJour(etat,jour);
  let t="Série : "+jours(s)+" · Record : "+jours(etat.meilleure);
  if(!etat.reponses[jour]&&s>0)t+=". Réponds aujourd'hui pour la prolonger.";
  return t;
 }

 function afficher(bloc,b){
  const zone=bloc.querySelector(".qj-zone");
  const jour=jourParis(new Date());
  const q=b.questions[indexDuJour(jour,b.questions.length)];
  const etat=lireEtat();
  const n=++compteur,idQuestion="qj-question-"+n;
  zone.textContent="";
  zone.setAttribute("aria-busy","false");

  const niveaux=q.niveauMin===q.niveauMax?"niveau "+q.niveauMin:"niveaux "+q.niveauMin+" à "+q.niveauMax;
  zone.appendChild(el("p","qj-meta",(b.themes[q.theme]||q.theme)+" · "+niveaux));
  if(q.situation)zone.appendChild(el("p","qj-situation",q.situation));
  const groupe=el("fieldset","qj-choix");
  const legende=el("legend","qj-question",q.question);legende.id=idQuestion;
  groupe.appendChild(legende);
  const boutons=q.choix.map((texte,i)=>{
   const bt=el("button","qt-reponse",texte);bt.type="button";bt.dataset.i=String(i);
   groupe.appendChild(bt);return bt;
  });
  zone.appendChild(groupe);
  const resultat=el("div","qj-resultat");
  resultat.setAttribute("role","status");resultat.tabIndex=-1;
  zone.appendChild(resultat);
  const serie=el("p","qj-serie",texteSerie(etat,jour));
  zone.appendChild(serie);

  // Corrigé : bonne réponse marquée, choix du joueur, explication, lien vers la page du site
  function corriger(choix,ok){
   boutons.forEach((bt,i)=>{
    bt.disabled=true;
    if(i===q.bonne)bt.classList.add("bonne");
    if(i===choix&&!ok)bt.classList.add("fausse");
    if(i===choix)bt.setAttribute("aria-pressed","true");
   });
   resultat.textContent="";
   const verdict=el("p","msg "+(ok?"msg-ok":"msg-erreur"));
   verdict.appendChild(el("b",null,ok?"Bonne réponse !":"Pas cette fois."));
   if(!ok)verdict.appendChild(document.createTextNode(" La bonne réponse : "+q.choix[q.bonne]+"."));
   resultat.appendChild(verdict);
   resultat.appendChild(el("p","qj-explication",q.explication));
   const lien=b.liens[q.lien];
   if(lien){const a=el("a","qj-lien","En savoir plus");a.href=lien;resultat.appendChild(a);}
   resultat.appendChild(el("p","qj-demain","Reviens demain pour la suivante."));
  }

  const deja=etat.reponses[jour];
  if(deja){
   // Déjà répondu aujourd'hui : le corrigé, sans nouvelle réponse possible
   const memeQuestion=deja.q===q.id&&Number.isInteger(deja.c);
   corriger(memeQuestion?deja.c:-1,!!deja.ok);
   return;
  }

  boutons.forEach((bt,i)=>bt.addEventListener("click",()=>{
   const maintenant=jourParis(new Date());
   if(maintenant!==jour){afficher(bloc,b);return;} // minuit est passé : la question a changé
   const ok=i===q.bonne;
   const nouvel=enregistrer(lireEtat(),jour,{ok,c:i,q:q.id});
   if(nouvel)ecrireEtat(nouvel);
   corriger(i,ok);
   serie.textContent=texteSerie(nouvel||lireEtat(),jour);
   // Les autres blocs de la page (s'il y en a) suivent
   blocs.filter(x=>x!==bloc&&x.dataset.qjCharge==="1").forEach(x=>afficher(x,b));
   resultat.focus();
  }));
 }

 function echec(bloc){
  const zone=bloc.querySelector(".qj-zone");
  zone.textContent="";
  zone.setAttribute("aria-busy","false");
  zone.appendChild(el("p","msg msg-alerte qj-echec","La question du jour n'a pas pu être chargée. Reviens un peu plus tard."));
 }

 function demarrer(bloc){
  if(bloc.dataset.qjCharge)return;
  bloc.dataset.qjCharge="1";
  chargerBanque().then(b=>afficher(bloc,b)).catch(()=>echec(bloc));
 }

 blocs.forEach(bloc=>{
  const zone=bloc.querySelector(".qj-zone");
  if(!zone)return;
  zone.textContent="";
  zone.setAttribute("aria-busy","true");
  zone.appendChild(el("p","chargement","Chargement de la question…"));
  // Chargement quand le bloc approche de l'écran (bien avant qu'il soit visible : la place est réservée)
  if("IntersectionObserver" in window){
   const obs=new IntersectionObserver(entrees=>{
    if(entrees.some(e=>e.isIntersecting)){obs.disconnect();demarrer(bloc);}
   },{rootMargin:"800px 0px"});
   obs.observe(bloc);
  }else demarrer(bloc);
 });
})();
