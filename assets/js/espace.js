/* ESPACE JOUEUR (espace.html) : objectifs, résultats de tournois, progression du classement estimé.
   Les données restent sur l'appareil ; connecté, joueur-sync.js les garde aussi dans le compte.
   Dépend de bareme-donnees.js (PA_BAREME), score.js (PA_SCORE), joueur-sync.js (PA_JOUEUR). */
const ESP_LIBELLES_OBJECTIF={
 points:{titre:"Atteindre un total de points",unite:"(points)",aide:"Total du classement estimé : tes 12 meilleurs résultats des 12 derniers mois."},
 rang:{titre:"Entrer dans le top",unite:"(place visée au classement FFT)",aide:"Ton classement FFT, à mettre à jour dans « Mon classement FFT » (visible sur Ten'Up)."},
 victoires:{titre:"Gagner des matchs",unite:"(victoires)",aide:"Matchs gagnés avec le compteur (paire 1 = toi), depuis la création de l'objectif."},
 tournois:{titre:"Jouer des tournois",unite:"(tournois)",aide:"Résultats de tournois saisis ci-dessous, depuis la création de l'objectif."}
};
// Drapeau de session : après « Les effacer de cet appareil » (page rechargée), le focus revient sur le statut
const ESP_CLE_FOCUS_STATUT="pa-espace-focus-statut";
const ESP_MOIS=["janv.","févr.","mars","avr.","mai","juin","juil.","août","sept.","oct.","nov.","déc."];

(function(){
 const racine=document.getElementById("espace");
 if(!racine||!window.PA_BAREME||!window.PA_JOUEUR)return;
 const B=window.PA_BAREME,J=window.PA_JOUEUR,S=window.PA_SCORE;
 const $=id=>document.getElementById(id);
 function el(b,c,t){const e=document.createElement(b);if(c)e.className=c;if(t!==undefined)e.textContent=t;return e;}
 function lire(cle,defaut){try{const v=JSON.parse(localStorage.getItem(cle)||"null");return v===null?defaut:v;}catch(e){return defaut;}}
 function ecrire(cle,v){try{localStorage.setItem(cle,JSON.stringify(v));return true;}catch(e){return false;}}
 const nombre=n=>n.toLocaleString("fr-FR");
 const aujourdhui=()=>B.simIso(new Date());
 /* ---------- Messages des formulaires et annonces (accessibilité) ----------
    Chaque formulaire a sa zone de message, présente dès l'ouverture (vide quand il n'y a rien à dire) : role=alert pour
    une erreur, status sinon. Le champ en cause est marqué (aria-invalid + aria-describedby vers le message) et reçoit le
    focus. Les actions sans message visible (« Match supprimé »…) sont annoncées dans #esp-annonce. */
 function zoneMessage(zone){
  let p=zone.querySelector(":scope > .esp-msg");
  if(!p){p=el("p","acc-msg esp-msg");p.id=zone.id+"-msg";p.setAttribute("role","status");zone.appendChild(p);}
  return p;
 }
 function info(zone,texte,erreur,champs){
  const p=zoneMessage(zone);
  zone.querySelectorAll('[aria-describedby~="'+p.id+'"]').forEach(c=>{
   const reste=(c.getAttribute("aria-describedby")||"").split(/\s+/).filter(x=>x&&x!==p.id);
   if(reste.length)c.setAttribute("aria-describedby",reste.join(" "));else c.removeAttribute("aria-describedby");
   c.removeAttribute("aria-invalid");
  });
  p.hidden=false;p.setAttribute("role",erreur?"alert":"status");
  p.textContent=texte||"";p.classList.toggle("acc-err",!!erreur);
  const liste=(Array.isArray(champs)?champs:[champs]).filter(Boolean);
  if(erreur&&liste.length){
   liste.forEach(c=>{c.setAttribute("aria-invalid","true");const ids=(c.getAttribute("aria-describedby")||"").split(/\s+/).filter(Boolean);if(!ids.includes(p.id))ids.push(p.id);c.setAttribute("aria-describedby",ids.join(" "));});
   liste[0].focus();
  }
 }
 // Annonce brève pour les lecteurs d'écran (vidée puis remplie : la même phrase deux fois de suite est relue)
 function annoncer(texte){const z=$("esp-annonce");if(!z)return;z.textContent="";setTimeout(()=>{z.textContent=texte;},60);}
 // Focus sur un titre de section (rendu focalisable au besoin)
 function focusTitre(bloc){const h=bloc&&bloc.querySelector(".esp-titre");if(!h)return;if(!h.hasAttribute("tabindex"))h.setAttribute("tabindex","-1");h.focus();}
 // Focus sur le bouton de même rang dans une liste rendue à nouveau, sinon le précédent, sinon le titre de la section
 function focusSuivant(boutons,rang,bloc){const b=boutons[Math.min(rang,boutons.length-1)];if(b)b.focus();else focusTitre(bloc);}
 const lireResultats=()=>B.simNormaliser(lire(B.SIM_KEY,[]));

 /* ---------- Accès : espace réservé aux joueurs connectés (décision du 27/10/2026) ----------
    Sans session : direction connexion.html?suite=espace.html (aussi après une déconnexion). Le contenu reste masqué
    tant que la session n'est pas connue. Comptes indisponibles (config vide, fichier local, service injoignable) :
    l'espace reste affiché, avec les données gardées sur l'appareil. */
 const compteAcces=window.PA_COMPTE;
 if(compteAcces&&compteAcces.actif){
  document.documentElement.classList.add("esp-attente");
  const verifierAcces=()=>{
   if(!compteAcces.user){location.replace("connexion.html?suite=espace.html");return;}
   document.documentElement.classList.remove("esp-attente");
  };
  compteAcces.ready.then(verifierAcces,()=>document.documentElement.classList.remove("esp-attente"));
  compteAcces.onChange(verifierAcces);
 }

 /* ---------- Statut de synchronisation ---------- */
 // Zone de statut focalisable : point d'arrivée stable du focus après le choix « appareil partagé »
 function focusStatut(){const z=$("esp-statut");if(!z)return;z.setAttribute("tabindex","-1");z.focus();}
 /* Effacement des données de l'appareil : confirmation dans la page (sans confirm()). En ligne, seule Mon académie est
    synchronisée : tout le reste n'existe que sur l'appareil et peut appartenir au joueur connecté lui-même. */
 let appareilAConfirmer=false,appareilErreur="";
 const ESP_DONNEES_EFFACEES=["résultats de tournois et rang FFT déclaré","objectifs","matchs, score en cours et bilans après match",
  "tournois favoris","test de niveau et quiz","exercices faits","défis","plan 8 semaines","tableaux tactiques",
  "niveau et quiz de Mon académie pas encore synchronisés"];
 function rendreConfirmationAppareil(bloc){
  const question=el("p","");question.id="esp-appareil-conf-msg";
  question.append("Effacer définitivement de cet appareil toutes ces données ?");
  const liste=el("ul","");ESP_DONNEES_EFFACEES.forEach(t=>liste.appendChild(el("li","",t)));
  const suite=el("p","","Ce qui n'est que sur cet appareil sera perdu. Si ce sont tes données, choisis plutôt « Les ajouter à mon compte ». Tes réglages de recherche (département, filtres) sont gardés.");
  suite.id="esp-appareil-conf-suite";
  bloc.append(question,liste,suite);
  if(appareilErreur){const err=el("p","acc-err",appareilErreur);err.setAttribute("role","alert");bloc.appendChild(err);}
  const btns=el("div","btns");
  const oui=el("button","btn danger","Effacer définitivement");oui.type="button";oui.id="esp-appareil-confirmer";oui.dataset.focus="appareil-confirmer";
  oui.setAttribute("aria-describedby","esp-appareil-conf-msg esp-appareil-conf-suite");
  const non=el("button","btn ghost","Annuler");non.type="button";non.id="esp-appareil-annuler";non.dataset.focus="appareil-annuler";
  // Annuler (bouton ou Échap) : rien n'est effacé, le focus revient sur « Les effacer de cet appareil »
  const annuler=()=>{
   appareilAConfirmer=false;appareilErreur="";rendreStatut();
   const b=$("esp-appareil-effacer");if(b)b.focus();
   annoncer("Effacement annulé : rien n'a été effacé.");
  };
  non.addEventListener("click",annuler);
  bloc.addEventListener("keydown",e=>{if(e.key==="Escape"&&!oui.disabled){e.preventDefault();annuler();}});
  // Confirmé : effacement puis page rechargée (les autres modules gardent une copie en mémoire) ; au retour, le focus
  // va sur la zone de statut et l'effacement est annoncé
  oui.addEventListener("click",()=>{
   oui.disabled=non.disabled=true;oui.setAttribute("aria-busy","true");oui.textContent="Effacement…";
   try{sessionStorage.setItem(ESP_CLE_FOCUS_STATUT,"1");}catch(e){}
   if(!J.resoudreAppareil("effacer")){
    try{sessionStorage.removeItem(ESP_CLE_FOCUS_STATUT);}catch(e){}
    appareilErreur="Effacement impossible pour le moment : rien n'a été effacé.";rendreStatut();
    const b=$("esp-appareil-annuler");if(b)b.focus();
   }
  });
  btns.append(oui,non);bloc.appendChild(btns);
 }
 function rendreStatut(){
  const zone=$("esp-statut"),c=window.PA_COMPTE;zone.textContent="";
  if(!c||!c.actif||!c.user){
   const p=el("p","acc-muted");const a=el("a","","Connecte-toi");a.href="connexion.html?suite=espace.html";
   p.append("Connexion au compte indisponible pour le moment : tes données sont gardées sur cet appareil. ",a," dès que possible pour les retrouver sur ton téléphone et ton ordinateur.");zone.appendChild(p);return;
  }
  const e=J.etat();
  // Appareil partagé : données d'un autre compte sur l'appareil, rien n'est envoyé sans l'accord du joueur
  // (seulement si une synchronisation est active : sinon rien ne partirait de toute façon ; « academie » : academie-sync.js)
  const activees=(window.PA_SUPABASE||{}).activees||[];
  if(["espace","journal","favoris","academie"].some(n=>activees.includes(n))&&J.appareilAutreCompte&&J.appareilAutreCompte()){
   const bloc=el("div","acc-msg acc-err");bloc.id="esp-appareil";
   bloc.append(el("p","","Cet appareil contient des données d'un autre compte ou d'une session précédente : résultats, objectifs, matchs, favoris, niveau et quiz de Mon académie. Elles sont peut-être les tiennes, enregistrées avant ta connexion. Elles ne partent pas dans ton compte sans ton accord."));
   if(appareilAConfirmer){rendreConfirmationAppareil(bloc);zone.appendChild(bloc);return;}
   const btns=el("div","btns");
   const ajouter=el("button","btn ghost","Les ajouter à mon compte");ajouter.type="button";ajouter.id="esp-appareil-ajouter";
   const effacer=el("button","btn ghost","Les effacer de cet appareil");effacer.type="button";effacer.id="esp-appareil-effacer";effacer.dataset.focus="appareil-effacer";
   effacer.setAttribute("aria-expanded","false");
   // Le bloc est redessiné juste après le choix : le focus va sur la zone de statut elle-même, qui ne disparaît
   // jamais (sinon il retomberait sur BODY)
   ajouter.addEventListener("click",()=>{if(J.resoudreAppareil("ajouter")){focusStatut();annoncer("Les données de cet appareil partent dans ton compte.");}});
   // « Effacer » ne supprime rien tout de suite : il ouvre la confirmation (focus sur « Annuler »)
   effacer.addEventListener("click",()=>{
    appareilAConfirmer=true;appareilErreur="";rendreStatut();
    const non=$("esp-appareil-annuler");if(non)non.focus();
   });
   btns.append(ajouter,effacer);bloc.appendChild(btns);zone.appendChild(bloc);return;
  }
  appareilAConfirmer=false;appareilErreur="";
  if(!J.activee()){zone.append(el("p","acc-muted","Connecté. La sauvegarde de l'espace joueur dans le compte arrive bientôt : pour l'instant, tes données restent sur cet appareil."));return;}
  if(e.texte){zone.append(el("p","acc-msg acc-err",e.texte));return;}
  zone.append(el("p","acc-muted",e.derniere?"Synchronisé avec ton compte à "+new Date(e.derniere).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})+".":"Synchronisation avec ton compte…"));
 }

 /* ---------- Objectifs ---------- */
 // Matchs du journal (compteur, saisis après coup, compte) joués depuis une date
 function matchsDepuis(jour){
  const liste=window.PA_JOURNAL?window.PA_JOURNAL.liste():[];
  return liste.filter(m=>B.simIso(new Date(m.fin))>=jour);
 }
 // Avancement d'un objectif : { actuel (texte), part (0 à 1), atteint }
 function avancement(o){
  if(o.type==="points"){const t=B.classementEstime(lireResultats(),aujourdhui()).total;return {actuel:nombre(t)+" points",part:Math.min(1,t/o.cible),atteint:t>=o.cible};}
  if(o.type==="rang"){
   const r=lire("pa-classement-fft",null);
   if(!r||!Number.isInteger(r.rang))return {actuel:"Rang non saisi",part:0,atteint:false};
   return {actuel:nombre(r.rang)+"e"+(r.rang>o.cible?" · encore "+nombre(r.rang-o.cible)+" place"+(r.rang-o.cible>1?"s":""):""),part:r.rang<=o.cible?1:o.cible/r.rang,atteint:r.rang<=o.cible};
  }
  if(o.type==="victoires"){const v=matchsDepuis(o.depuis).filter(m=>m.vainqueur===0).length;return {actuel:v+" victoire"+(v>1?"s":""),part:Math.min(1,v/o.cible),atteint:v>=o.cible};}
  const n=lireResultats().filter(r=>r.date&&r.date>=o.depuis).length;
  return {actuel:n+" tournoi"+(n>1?"s":""),part:Math.min(1,n/o.cible),atteint:n>=o.cible};
 }
 function titreObjectif(o){
  if(o.type==="rang")return "Entrer dans le top "+nombre(o.cible);
  if(o.type==="points")return "Atteindre "+nombre(o.cible)+" points";
  if(o.type==="victoires")return "Gagner "+o.cible+" match"+(o.cible>1?"s":"");
  return "Jouer "+o.cible+" tournoi"+(o.cible>1?"s":"");
 }
 function rendreObjectifs(){
  const zone=$("esp-objectifs");zone.textContent="";
  const liste=J.lireObjectifs();
  if(!liste.length){zone.append(el("p","acc-muted","Aucun objectif pour l'instant. Fixe-en un : un total de points, une place au classement, des victoires ou des tournois à jouer."));return;}
  const ul=el("ul","esp-objectifs");
  liste.forEach(o=>{
   const a=avancement(o),li=el("li","esp-objectif"+(a.atteint?" atteint":""));
   const tete=el("div","esp-objectif-tete");
   tete.append(el("b","",titreObjectif(o)));
   if(a.atteint)tete.append(el("span","esp-badge","Atteint"));
   li.appendChild(tete);
   const barre=el("div","esp-barre");barre.setAttribute("role","progressbar");barre.setAttribute("aria-valuemin","0");barre.setAttribute("aria-valuemax","100");
   barre.setAttribute("aria-valuenow",String(Math.round(100*a.part)));barre.setAttribute("aria-label","Avancement : "+titreObjectif(o));
   const plein=el("span");plein.style.width=Math.round(100*a.part)+"%";barre.appendChild(plein);
   li.append(barre);
   const details=el("p","esp-objectif-details",a.actuel);
   if(o.echeance){
    const reste=Math.round((B.simLireDate(o.echeance)-B.simLireDate(aujourdhui()))/86400000);
    details.append(" · "+(reste<0?"échéance dépassée ("+B.simLireDate(o.echeance).toLocaleDateString("fr-FR")+")":reste===0?"échéance aujourd'hui":"plus que "+reste+" jour"+(reste>1?"s":"")));
   }
   li.appendChild(details);
   const sup=el("button","esp-lien","Retirer cet objectif");sup.type="button";sup.dataset.focus="objectif:"+o.cle;
   sup.setAttribute("aria-label","Retirer l'objectif : "+titreObjectif(o));
   sup.addEventListener("click",()=>{
    const rang=[...zone.querySelectorAll(".esp-objectif .esp-lien")].indexOf(sup);
    J.ecrireObjectifs(J.lireObjectifs().filter(x=>x.cle!==o.cle));rendreTout();J.synchroniser();
    annoncer("Objectif retiré : "+titreObjectif(o)+".");
    focusSuivant([...$("esp-objectifs").querySelectorAll(".esp-objectif .esp-lien")],rang,$("esp-bloc-objectifs"));
   });
   li.appendChild(sup);
   ul.appendChild(li);
  });
  zone.appendChild(ul);
 }
 const formObjectif=$("esp-form-objectif");
 function majAideObjectif(){
  const t=formObjectif.elements["esp-type"].value;
  $("esp-unite").textContent=ESP_LIBELLES_OBJECTIF[t].unite;$("esp-aide-objectif").textContent=ESP_LIBELLES_OBJECTIF[t].aide;
 }
 formObjectif.elements["esp-type"].addEventListener("change",majAideObjectif);
 formObjectif.addEventListener("submit",e=>{
  e.preventDefault();
  const type=formObjectif.elements["esp-type"].value,cible=Number(formObjectif.elements["esp-cible"].value),echeance=formObjectif.elements["esp-echeance"].value;
  const zone=formObjectif.parentElement;
  if(!Number.isInteger(cible)||cible<1||cible>500000){info(zone,"Indique un nombre entier entre 1 et 500 000.",true,formObjectif.elements["esp-cible"]);return;}
  if(echeance&&(!B.simLireDate(echeance)||echeance<aujourdhui())){info(zone,"Choisis une échéance aujourd'hui ou plus tard (ou laisse vide).",true,formObjectif.elements["esp-echeance"]);return;}
  const liste=J.lireObjectifs();
  if(liste.length>=20){info(zone,"20 objectifs au maximum : retires-en un d'abord.",true);return;}
  liste.push({cle:B.simNouvelleCle(),type,cible,echeance:echeance||null,depuis:aujourdhui()});
  if(!J.ecrireObjectifs(liste)){info(zone,"Le stockage de cet appareil est indisponible.",true);return;}
  info(zone,"Objectif ajouté : "+titreObjectif(liste[liste.length-1])+".");formObjectif.reset();majAideObjectif();rendreTout();J.synchroniser();
 });

 /* ---------- Résultats de tournois (même liste que le simulateur du barème) ---------- */
 function rendreResultats(){
  const zone=$("esp-resultats");zone.textContent="";
  const jour=aujourdhui(),liste=lireResultats();
  const {retenus,total}=B.classementEstime(liste,jour),garde=new Set(retenus.map(r=>r.cle));
  $("esp-total").textContent=nombre(total);
  if(!liste.length){zone.append(el("p","acc-muted","Aucun résultat saisi. Ajoute tes tournois : ton classement estimé et ta courbe de progression se calculent automatiquement."));return;}
  const tbl=el("div","tbl"),table=el("table"),tete=el("thead"),corps=el("tbody");
  tete.innerHTML="<tr><th scope=\"col\">Date</th><th scope=\"col\">Catégorie</th><th scope=\"col\">Place</th><th scope=\"col\">Points</th><th scope=\"col\">Statut</th><th scope=\"col\"><span class=\"sr-only\">Supprimer</span></th></tr>";
  liste.slice().sort((a,b)=>(b.date||"").localeCompare(a.date||"")).forEach(r=>{
   const tr=corps.insertRow(),pts=B.ptsFor(r.cat,r.place,r.nb,r.sexe);
   const statut=!r.date?"Date à renseigner":r.date>jour?"À venir":B.simExpire(r.date)<=jour?"Expiré":garde.has(r.cle)?"Retenu":"Hors des 12 meilleurs";
   [r.date?B.simLireDate(r.date).toLocaleDateString("fr-FR"):"–",r.cat+(["P500","P1000"].includes(r.cat)?" "+r.sexe:" · "+r.nb+" paires"),B.PLACE_LABEL(r.place-1),String(pts),statut].forEach(t=>{tr.insertCell().textContent=t;});
   if(!garde.has(r.cle))tr.className="dim";
   const b=el("button","x","✕");b.type="button";b.dataset.focus="resultat:"+r.cle;b.setAttribute("aria-label","Supprimer le résultat : "+r.cat+", "+B.PLACE_LABEL(r.place-1));
   b.addEventListener("click",()=>{
    const rang=[...zone.querySelectorAll("button.x")].indexOf(b);
    ecrire(B.SIM_KEY,lireResultats().filter(x=>x.cle!==r.cle));rendreTout();J.synchroniser();
    annoncer("Résultat supprimé : "+r.cat+", "+B.PLACE_LABEL(r.place-1)+".");
    focusSuivant([...$("esp-resultats").querySelectorAll("button.x")],rang,$("esp-bloc-resultats"));
   });
   tr.insertCell().appendChild(b);
  });
  table.append(tete,corps);tbl.appendChild(table);zone.appendChild(tbl);
 }
 const formResultat=$("esp-form-resultat");
 formResultat.elements["esp-date"].max=aujourdhui();
 formResultat.addEventListener("submit",e=>{
  e.preventDefault();
  const f=formResultat.elements,zone=formResultat.parentElement;
  const r={cle:B.simNouvelleCle(),cat:f["esp-cat"].value,place:Number(f["esp-place"].value),nb:Number(f["esp-nb"].value),sexe:f["esp-sexe"].value,date:f["esp-date"].value};
  if(!B.simLireDate(r.date)||r.date>aujourdhui()){info(zone,"Choisis la date du tournoi (aujourd'hui ou avant).",true,f["esp-date"]);return;}
  if(B.ptsFor(r.cat,r.place,r.nb,r.sexe)===null){info(zone,"Cette place n'existe pas pour ce tableau (vérifie la place et le nombre de paires).",true,f["esp-place"]);return;}
  const liste=lireResultats();liste.push(r);
  if(!ecrire(B.SIM_KEY,liste)){info(zone,"Le stockage de cet appareil est indisponible.",true);return;}
  info(zone,"Résultat ajouté : "+B.ptsFor(r.cat,r.place,r.nb,r.sexe)+" points.");rendreTout();J.synchroniser();
 });
 // Le nombre de paires ne compte que pour P25 à P250, le tableau messieurs/dames que pour P500 et P1000
 function majChampsResultat(){
  const cat=formResultat.elements["esp-cat"].value,parSexe=["P500","P1000"].includes(cat),parPaires=["P25","P50","P100","P250"].includes(cat);
  $("esp-champ-nb").hidden=!parPaires;$("esp-champ-sexe").hidden=!parSexe;
 }
 formResultat.elements["esp-cat"].addEventListener("change",majChampsResultat);

 /* ---------- Progression : classement estimé à la fin de chaque mois (12 mois) ---------- */
 function pointsParMois(){
  const liste=lireResultats(),fin=new Date(),points=[];
  for(let i=11;i>=0;i--){
   const d=new Date(fin.getFullYear(),fin.getMonth()-i+1,0,12); // dernier jour du mois
   const jour=i===0?aujourdhui():B.simIso(d);
   points.push({mois:new Date(fin.getFullYear(),fin.getMonth()-i,1),jour,total:B.classementEstime(liste,jour).total});
  }
  return points;
 }
 function rendreProgression(){
  const zone=$("esp-progression");zone.textContent="";
  const pts=pointsParMois(),max=Math.max(...pts.map(p=>p.total));
  if(!max){zone.append(el("p","acc-muted","La courbe apparaîtra dès que tu auras saisi des résultats de tournois datés."));return;}
  // Graduation lisible : 4 paliers ronds
  const pas=[10,20,25,50,100,200,250,500,1000,2000,2500,5000].find(p=>p*4>=max)||Math.ceil(max/4);
  // Dessiné à la largeur réelle du cadre : le texte garde sa taille (12 px) sur mobile
  const haut=pas*4,L=Math.max(300,Math.min(720,Math.round(zone.clientWidth)||640)),H=L<480?200:240,g=44,d=12,h=16,b=28;
  const x=i=>g+i*(L-g-d)/11,y=v=>h+(H-h-b)*(1-v/haut);
  const NS="http://www.w3.org/2000/svg",svg=document.createElementNS(NS,"svg");
  svg.setAttribute("viewBox",`0 0 ${L} ${H}`);svg.setAttribute("class","esp-courbe");svg.setAttribute("role","img");
  svg.setAttribute("aria-label","Classement estimé à la fin de chaque mois, des 12 derniers mois : de "+nombre(pts[0].total)+" à "+nombre(pts[11].total)+" points");
  const ajouter=(nom,attrs,parent=svg)=>{const n=document.createElementNS(NS,nom);Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,v));parent.appendChild(n);return n;};
  for(let k=0;k<=4;k++){
   ajouter("line",{x1:g,x2:L-d,y1:y(k*pas),y2:y(k*pas),class:"esp-grille"});
   ajouter("text",{x:g-8,y:y(k*pas)+4,"text-anchor":"end",class:"esp-axe"}).textContent=nombre(k*pas);
  }
  const pasMois=L<480?3:2;
  pts.forEach((p,i)=>{if((11-i)%pasMois===0)ajouter("text",{x:x(i),y:H-8,"text-anchor":"middle",class:"esp-axe"}).textContent=ESP_MOIS[p.mois.getMonth()];});
  ajouter("polyline",{points:pts.map((p,i)=>x(i)+","+y(p.total)).join(" "),class:"esp-ligne"});
  const bulle=$("esp-bulle");
  pts.forEach((p,i)=>{
   const point=ajouter("circle",{cx:x(i),cy:y(p.total),r:4.5,class:"esp-point"});
   // Zone de survol plus large que le point (doigt ou souris)
   const zoneSurvol=ajouter("rect",{x:x(i)-(L-g-d)/22,y:h,width:(L-g-d)/11,height:H-h-b,class:"esp-survol"});
   const texte=ESP_MOIS[p.mois.getMonth()]+" "+p.mois.getFullYear()+" : "+nombre(p.total)+" points";
   const montrer=()=>{point.classList.add("actif");bulle.textContent=texte;bulle.hidden=false;
    // Centrée sur le point, mais toujours entièrement dans le cadre du graphique
    const r=svg.getBoundingClientRect(),cadre=zone.getBoundingClientRect(),largeur=bulle.offsetWidth;
    bulle.style.left=Math.max(0,Math.min(r.width-largeur,x(i)*r.width/L-largeur/2))+"px";bulle.style.top=(y(p.total)*r.height/H-44+r.top-cadre.top)+"px";};
   const cacher=()=>{point.classList.remove("actif");bulle.hidden=true;};
   zoneSurvol.addEventListener("mouseenter",montrer);
   zoneSurvol.addEventListener("mouseleave",cacher);
  });
  zone.appendChild(svg);
  // Équivalent en tableau (lecteurs d'écran, lecture précise)
  const details=el("details","esp-donnees");details.appendChild(el("summary","","Voir les données"));
  const tbl=el("div","tbl"),table=el("table");
  table.innerHTML="<thead><tr><th scope=\"col\">Fin du mois</th><th scope=\"col\">Classement estimé</th></tr></thead>";
  const corps=el("tbody");pts.forEach(p=>{const tr=corps.insertRow();tr.insertCell().textContent=ESP_MOIS[p.mois.getMonth()]+" "+p.mois.getFullYear();tr.insertCell().textContent=nombre(p.total)+" pts";});
  table.appendChild(corps);tbl.appendChild(table);details.appendChild(tbl);zone.appendChild(details);
 }

 /* ---------- Mes matchs : statistiques par période, par partenaire, par type, journal ---------- */
 const JN=window.PA_JOURNAL;
 let nbJournal=10;
 // Suppression d'un match en deux temps (sans confirm()) : identifiant du match dont la confirmation est ouverte
 let matchAConfirmer=null;
 // Bouton à focaliser dans chaque ligne du journal (suppression, sinon bilan)
 const boutonsJournal=()=>[...$("esp-journal").querySelectorAll(".esp-journal > li:not(.esp-bilan-panneau)")].map(li=>li.querySelector("button.x")||li.querySelector("button")).filter(Boolean);
 const pourcent=(a,b)=>b?Math.round(100*a/b)+" %":"–";
 function periode(){const v=(document.querySelector('input[name="esp-periode"]:checked')||{}).value||"90";return v==="tout"?null:Number(v);}
 function rendreMatchs(){
  const zoneS=$("esp-stats"),zoneJ=$("esp-journal");zoneS.textContent="";zoneJ.textContent="";
  if(!JN)return;
  const tous=JN.liste(),jours=periode(),C=window.PA_CARNET;
  remplirFiltres(tous);
  // Période, type de match et partenaire (carnet-outils.js)
  const liste=C?C.filtrer(tous,{jours,type:$("esp-f-type").value,partenaire:$("esp-f-partenaire").value}):tous;
  $("esp-export").disabled=!liste.length;
  $("esp-export").textContent=liste.length?"Exporter en CSV ("+liste.length+" match"+(liste.length>1?"s":"")+")":"Exporter en CSV";
  const joues=liste.filter(m=>m.vainqueur===0||m.vainqueur===1),v=joues.filter(m=>m.vainqueur===0).length,d=joues.length-v;
  const comptes=liste.filter(m=>m.pointsTotal>0),pg=comptes.reduce((s,m)=>s+m.pointsGagnes,0),pt=comptes.reduce((s,m)=>s+m.pointsTotal,0);
  if(JN.etat().texte)zoneS.append(el("p","acc-msg acc-err",JN.etat().texte));
  if(!tous.length){zoneS.append(el("p","acc-muted","Aucun match pour l'instant. Compte ton prochain match avec le compteur, ou ajoute un match déjà joué ci-dessous."));}
  else{
   const tuiles=el("div","esp-tuiles");
   const tuile=(valeur,libelle)=>{const t=el("div","esp-tuile");t.append(el("b","",valeur),el("span","",libelle));return t;};
   tuiles.append(tuile(String(liste.length),"match"+(liste.length>1?"s":"")),tuile(v+" – "+d,"victoires – défaites"),tuile(pourcent(v,joues.length),"de victoires"),
    tuile(pourcent(pg,pt),"des points gagnés"+(comptes.length&&comptes.length<liste.length?" ("+comptes.length+" match"+(comptes.length>1?"s comptés":" compté")+")":"")));
   zoneS.appendChild(tuiles);
   // Par partenaire
   const parPartenaire=new Map();
   joues.forEach(m=>{const k=m.partenaire||"Partenaire non précisé";const x=parPartenaire.get(k)||{v:0,d:0};if(m.vainqueur===0)x.v++;else x.d++;parPartenaire.set(k,x);});
   if(parPartenaire.size){
    zoneS.appendChild(el("h3","esp-sous-titre","Par partenaire"));
    const tbl=el("div","tbl esp-tbl-compact"),table=el("table"),corps=el("tbody");
    table.innerHTML="<thead><tr><th scope=\"col\">Partenaire</th><th scope=\"col\">Matchs</th><th scope=\"col\">V – D</th><th scope=\"col\">%</th></tr></thead>";
    [...parPartenaire.entries()].sort((a,b)=>(b[1].v+b[1].d)-(a[1].v+a[1].d)).forEach(([nom,x])=>{
     const tr=corps.insertRow();[nom,String(x.v+x.d),x.v+" – "+x.d,pourcent(x.v,x.v+x.d)].forEach(t=>{tr.insertCell().textContent=t;});
    });
    table.appendChild(corps);tbl.appendChild(table);zoneS.appendChild(tbl);
   }
   // Par type de match
   const parType=Object.keys(JN.TYPES).map(t=>{const l=joues.filter(m=>m.type===t);return [t,l.length,l.filter(m=>m.vainqueur===0).length];}).filter(x=>x[1]);
   if(parType.length){
    const p=el("p","esp-types");
    parType.forEach(([t,n,vt],i)=>{if(i)p.append(" · ");p.append(el("b","",JN.TYPES[t])," "+n+" match"+(n>1?"s":"")+", "+pourcent(vt,n)+" de victoires");});
    zoneS.appendChild(p);
   }
   rendreTendance(zoneS,liste);
  }
  // Journal
  if(!liste.length){if(tous.length)zoneJ.append(el("p","acc-muted","Aucun match avec cette période et ces filtres."));return;}
  zoneJ.appendChild(el("h3","esp-sous-titre","Journal"));
  const ul=el("ul","esp-journal");
  liste.slice(0,nbJournal).forEach(m=>{
   const li=el("li");
   const issue=m.vainqueur===0?["v","V","Victoire"]:m.vainqueur===1?["d","D","Défaite"]:["n","–","Match arrêté"];
   const badge=el("span","mp-issue "+issue[0],issue[1]);badge.setAttribute("aria-label",issue[2]);
   const texte=el("span","esp-journal-texte");
   texte.append(el("span","mp-match-date",new Date(m.fin).toLocaleDateString("fr-FR",{day:"numeric",month:"short",year:"numeric"})+(m.type?" · "+JN.TYPES[m.type]:"")),
    el("span","",(m.partenaire?"Avec "+m.partenaire:"Partenaire non précisé")+" contre "+m.adversaires),
    el("span","mp-match-score",(m.score||"Score non saisi")+(m.interrompu?" (arrêté)":"")));
   li.append(badge,texte);
   // Bilan du match (diagnostic.js) : ouvert sous la ligne, sans quitter le journal
   if(window.PA_DIAGNOSTIC){
    const D=window.PA_DIAGNOSTIC;
    const bilan=el("button","btn ghost esp-bilan",D.existe(m.cle)?"Bilan ✓":"Bilan");bilan.type="button";bilan.dataset.focus="bilan:"+m.cle;
    bilan.setAttribute("aria-expanded","false");
    bilan.setAttribute("aria-label",(D.existe(m.cle)?"Voir le bilan":"Faire le bilan")+" du match du "+new Date(m.fin).toLocaleDateString("fr-FR"));
    const panneau=el("li","dg-bloc esp-bilan-panneau");panneau.hidden=true;
    bilan.addEventListener("click",()=>{
     const ouvrir=panneau.hidden;panneau.hidden=!ouvrir;bilan.setAttribute("aria-expanded",String(ouvrir));
     if(ouvrir)D.bloc(panneau,m.cle,{invitation:false,direct:true});
    });
    li.appendChild(bilan);
    queueMicrotask(()=>li.after(panneau));
   }
   // Suppression partout ; un match déjà dans le compte ne peut l'être qu'avec le journal activé
   const supprimable=!m.dansCompte||JN.actif(),jour=new Date(m.fin).toLocaleDateString("fr-FR");
   if(supprimable){
    const b=el("button","x","✕");b.type="button";b.dataset.cle=m.cle;b.dataset.focus="match:"+m.cle;b.setAttribute("aria-label","Supprimer le match du "+jour);
    b.setAttribute("aria-expanded",String(matchAConfirmer===m.cle));
    b.addEventListener("click",()=>{
     matchAConfirmer=m.cle;rendreMatchs();
     // Focus sur « Annuler » (pas sur le bouton destructeur) ; la question est lue grâce à aria-describedby
     const non=$("esp-journal").querySelector(".esp-annuler");if(non)non.focus();
    });
    li.appendChild(b);
   }
   ul.appendChild(li);
   // Confirmation en ligne, sous le match
   if(supprimable&&matchAConfirmer===m.cle){
    const conf=el("li","esp-bilan-panneau esp-confirmation");
    const question=el("p","","Supprimer le match du "+jour+" ? Il sera effacé de cet appareil"+(m.dansCompte?" et de ton compte":"")+".");
    question.id="esp-conf-msg";conf.appendChild(question);
    const btns=el("div","btns");
    const oui=el("button","btn danger esp-confirmer","Confirmer la suppression");oui.type="button";oui.dataset.focus="confirmer:"+m.cle;oui.setAttribute("aria-describedby","esp-conf-msg");
    const non=el("button","btn ghost esp-annuler","Annuler");non.type="button";non.dataset.focus="annuler:"+m.cle;
    oui.addEventListener("click",async()=>{
     const rang=boutonsJournal().findIndex(x=>x.dataset.cle===m.cle);
     matchAConfirmer=null;oui.disabled=non.disabled=true;
     await JN.supprimer(m.cle);
     rendreMatchs();
     annoncer("Match du "+jour+" supprimé.");
     focusSuivant(boutonsJournal(),Math.max(0,rang),$("esp-bloc-matchs"));
    });
    // Annuler (bouton ou Échap) : la confirmation se ferme, le focus revient sur le ✕ du match
    const annuler=()=>{
     matchAConfirmer=null;rendreMatchs();
     const b=boutonsJournal().find(x=>x.dataset.cle===m.cle);if(b)b.focus();
    };
    non.addEventListener("click",annuler);
    conf.addEventListener("keydown",e=>{if(e.key==="Escape"&&!non.disabled){e.preventDefault();annuler();}});
    btns.append(oui,non);conf.appendChild(btns);ul.appendChild(conf);
   }
  });
  zoneJ.appendChild(ul);
  if(liste.length>nbJournal){const b=el("button","btn ghost","Afficher plus ("+(liste.length-nbJournal)+")");b.type="button";b.addEventListener("click",()=>{nbJournal+=20;rendreMatchs();});zoneJ.appendChild(b);}
 }
 // Tendance des points perdus : motifs notés au compteur, sur les 5 et 10 derniers matchs comptés (des comptes, pas une estimation)
 function rendreTendance(zone,liste){
  const C=window.PA_CARNET;if(!C)return;
  const t5=C.tendance(liste,5),t10=C.tendance(liste,10);
  if(!t10.total)return;
  zone.appendChild(el("h3","esp-sous-titre","Tes points perdus"));
  const tbl=el("div","tbl esp-tbl-compact esp-tendance"),table=el("table"),tete=el("thead"),corps=el("tbody");
  const col=(t,n)=>"Sur "+Math.min(t.matchs,n)+" match"+(Math.min(t.matchs,n)>1?"s":""); // les plus récents
  const lt=tete.insertRow();["Motif",col(t5,5),col(t10,10)].forEach(t=>{const th=el("th","",t);th.scope="col";lt.appendChild(th);});
  const part=(t,motif)=>{const x=t.motifs.find(m=>m.motif===motif);return x?Math.round(100*x.part)+" % ("+x.n+")":"–";};
  t10.motifs.forEach(m=>{const tr=corps.insertRow();[C.PERDUS[m.motif],part(t5,m.motif),part(t10,m.motif)].forEach(v=>{tr.insertCell().textContent=v;});});
  table.append(tete,corps);tbl.appendChild(table);zone.appendChild(tbl);
  const premier=t10.motifs[0],expl=typeof MOTIF_EXPLICATION!=="undefined"?MOTIF_EXPLICATION[premier.motif]:"";
  if(expl)zone.appendChild(el("p","esp-tendance-texte","Sur "+(t10.matchs>1?"tes "+t10.matchs+" derniers matchs comptés":"ton dernier match compté")+", "+Math.round(100*premier.part)+" % des points perdus "+expl+"."));
  zone.appendChild(el("p","note","D'après les motifs notés au compteur : "+t10.total+" point"+(t10.total>1?"s":"")+" perdu"+(t10.total>1?"s":"")+" avec un motif. Les exercices recommandés en tiennent déjà compte."));
 }
 // Filtres : types de match (fixes) et partenaires présents dans le journal ; le choix en cours est gardé
 function remplirFiltres(tous){
  const ft=$("esp-f-type"),fp=$("esp-f-partenaire"),C=window.PA_CARNET;
  if(ft.options.length===1)Object.entries(JN.TYPES).forEach(([k,v])=>ft.add(new Option(v,k)));
  if(!C)return;
  const choix=fp.value,noms=C.partenaires(tous),avecSans=tous.some(m=>!m.partenaire);
  fp.length=1;
  noms.forEach(n=>fp.add(new Option(n,n)));
  if(avecSans)fp.add(new Option("Partenaire non précisé",C.SANS_PARTENAIRE));
  fp.value=[...fp.options].some(o=>o.value===choix)?choix:"";
 }
 ["esp-f-type","esp-f-partenaire"].forEach(id=>$(id).addEventListener("change",()=>{nbJournal=10;rendreMatchs();}));
 // Export CSV des matchs affichés (période et filtres en cours)
 $("esp-export").addEventListener("click",()=>{
  const C=window.PA_CARNET;if(!C||!JN)return;
  const liste=C.filtrer(JN.liste(),{jours:periode(),type:$("esp-f-type").value,partenaire:$("esp-f-partenaire").value});
  const a=el("a");a.href=URL.createObjectURL(new Blob([C.csv(liste,JN.TYPES)],{type:"text/csv;charset=utf-8"}));
  a.download="padel-matchs-"+aujourdhui()+".csv";
  document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
 });
 document.querySelectorAll('input[name="esp-periode"]').forEach(i=>i.addEventListener("change",()=>{nbJournal=10;rendreMatchs();}));
 const formMatch=$("esp-form-match");
 formMatch.elements["esp-m-date"].max=aujourdhui();formMatch.elements["esp-m-date"].value=aujourdhui();
 formMatch.addEventListener("submit",e=>{
  e.preventDefault();
  const f=formMatch.elements,zone=formMatch.parentElement;
  const date=f["esp-m-date"].value,res=(formMatch.querySelector('input[name="esp-m-resultat"]:checked')||{}).value;
  const score=f["esp-m-score"].value.trim().replace(/\s+/g," ");
  if(!B.simLireDate(date)||date>aujourdhui()){info(zone,"Choisis la date du match (aujourd'hui ou avant).",true,f["esp-m-date"]);return;}
  if(res!=="0"&&res!=="1"){info(zone,"Indique si c'est une victoire ou une défaite.",true,[...formMatch.querySelectorAll('input[name="esp-m-resultat"]')]);return;}
  if(score&&!/^[0-9\-\s\[\]()\/]{3,40}$/.test(score)){info(zone,"Score : chiffres, tirets et espaces seulement (les signes / ( ) [ ] sont acceptés), par exemple 6-4 3-6 10-8.",true,f["esp-m-score"]);return;}
  const r=JN.ajouterManuel({date,type:f["esp-m-type"].value,partenaire:f["esp-m-partenaire"].value.trim().slice(0,30)||null,adversaires:f["esp-m-adversaires"].value.trim().slice(0,30)||"Adversaires",vainqueur:Number(res),score});
  if(!r.ok){info(zone,r.message,true);return;}
  info(zone,"Match ajouté au journal.");
  f["esp-m-score"].value="";f["esp-m-adversaires"].value="";formMatch.querySelectorAll('input[name="esp-m-resultat"]').forEach(i=>{i.checked=false;});
 });

 // Les listes sont redessinées à chaque synchronisation : le bouton qui avait le focus (repéré par data-focus) le retrouve
 function garderFocus(rendu){
  const actif=document.activeElement,cle=actif&&actif.dataset?actif.dataset.focus:null;
  rendu();
  if(!cle||(document.activeElement&&document.activeElement!==document.body&&racine.contains(document.activeElement)))return;
  const n=[...racine.querySelectorAll("[data-focus]")].find(x=>x.dataset.focus===cle);
  if(n)n.focus();
 }
 function rendreTout(){garderFocus(()=>{rendreStatut();rendreObjectifs();rendreMatchs();rendreResultats();rendreProgression();});}
 J.onChange(rendreTout);
 if(JN)JN.onChange(()=>garderFocus(()=>{rendreObjectifs();rendreMatchs();}));
 let minuterieTaille=null;
 window.addEventListener("resize",()=>{clearTimeout(minuterieTaille);minuterieTaille=setTimeout(rendreProgression,150);});
 const c=window.PA_COMPTE;
 if(c&&c.actif)c.onChange(()=>garderFocus(rendreStatut));
 document.addEventListener("visibilitychange",()=>{if(!document.hidden)rendreTout();});
 // Zones de message des formulaires présentes dès l'ouverture (annonces fiables)
 [formObjectif,formResultat,formMatch].forEach(f=>zoneMessage(f.parentElement));
 majAideObjectif();majChampsResultat();rendreTout();
 // Retour après « Les effacer de cet appareil » : focus sur le statut et annonce
 let retourEffacement=false;
 try{retourEffacement=sessionStorage.getItem(ESP_CLE_FOCUS_STATUT)==="1";sessionStorage.removeItem(ESP_CLE_FOCUS_STATUT);}catch(e){}
 if(retourEffacement){
  const retour=()=>{focusStatut();annoncer("Les données qui n'étaient pas rattachées à ton compte ont été effacées de cet appareil.");};
  // L'espace reste masqué (esp-attente) tant que la session n'est pas connue : le focus attend qu'il s'affiche
  if(compteAcces&&compteAcces.actif)compteAcces.ready.then(retour,retour);else retour();
 }
})();
