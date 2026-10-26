/* ESPACE JOUEUR (espace.html) : objectifs, résultats de tournois, progression du classement estimé.
   Les données restent sur l'appareil ; connecté, joueur-sync.js les garde aussi dans le compte.
   Dépend de bareme-donnees.js (PA_BAREME), score.js (PA_SCORE), joueur-sync.js (PA_JOUEUR). */
const ESP_LIBELLES_OBJECTIF={
 points:{titre:"Atteindre un total de points",unite:"points",aide:"Total du classement estimé : tes 12 meilleurs résultats des 12 derniers mois."},
 rang:{titre:"Entrer dans le top",unite:"e place ou mieux",aide:"Ton classement FFT, à mettre à jour dans « Mon rang » (visible sur Ten'Up)."},
 victoires:{titre:"Gagner des matchs",unite:"victoires",aide:"Matchs gagnés avec le compteur (paire 1 = toi), depuis la création de l'objectif."},
 tournois:{titre:"Jouer des tournois",unite:"tournois",aide:"Résultats de tournois saisis ci-dessous, depuis la création de l'objectif."}
};
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
 function info(zone,texte,erreur){let p=zone.querySelector(":scope > .esp-msg");if(!p){p=el("p","acc-msg esp-msg");p.setAttribute("role","status");zone.appendChild(p);}p.textContent=texte||"";p.hidden=!texte;p.classList.toggle("acc-err",!!erreur);}
 const lireResultats=()=>B.simNormaliser(lire(B.SIM_KEY,[]));
 let matchsCompte=[];

 /* ---------- Statut de synchronisation ---------- */
 function rendreStatut(){
  const zone=$("esp-statut"),c=window.PA_COMPTE;zone.textContent="";
  if(!c||!c.actif||!c.user){
   const p=el("p","acc-muted");const a=el("a","","Connecte-toi");a.href="compte.html";
   p.append("Tes données sont gardées sur cet appareil. ",a," pour les retrouver sur ton téléphone et ton ordinateur.");zone.appendChild(p);return;
  }
  const e=J.etat();
  if(!J.activee()){zone.append(el("p","acc-muted","Connecté. La sauvegarde de l'espace joueur dans le compte arrive bientôt : pour l'instant, tes données restent sur cet appareil."));return;}
  if(e.texte){zone.append(el("p","acc-msg acc-err",e.texte));return;}
  zone.append(el("p","acc-muted",e.derniere?"Synchronisé avec ton compte à "+new Date(e.derniere).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})+".":"Synchronisation avec ton compte…"));
 }

 /* ---------- Objectifs ---------- */
 function matchsDepuis(jour){
  const locaux=lire(S?S.CLE_HISTORIQUE:"pa-score-historique",[]);
  const liste=(Array.isArray(locaux)?locaux:[]).filter(m=>m&&typeof m.fin==="string").map(m=>({fin:m.fin,score:m.score||"",vainqueur:m.vainqueur}));
  matchsCompte.forEach(m=>{if(!liste.some(x=>Math.floor(Date.parse(x.fin)/1000)===Math.floor(Date.parse(m.joue_le)/1000)&&x.score===m.score))liste.push({fin:m.joue_le,score:m.score,vainqueur:m.vainqueur});});
  return liste.filter(m=>B.simIso(new Date(m.fin))>=jour);
 }
 // Avancement d'un objectif : { actuel (texte), part (0 à 1), atteint }
 function avancement(o){
  if(o.type==="points"){const t=B.classementEstime(lireResultats(),aujourdhui()).total;return {actuel:nombre(t)+" points",part:Math.min(1,t/o.cible),atteint:t>=o.cible};}
  if(o.type==="rang"){
   const r=lire("pa-classement-fft",null);
   if(!r||!Number.isInteger(r.rang))return {actuel:"Rang non saisi",part:0,atteint:false};
   return {actuel:nombre(r.rang)+"e"+(r.rang>o.cible?" · encore "+nombre(r.rang-o.cible)+" places":""),part:r.rang<=o.cible?1:o.cible/r.rang,atteint:r.rang<=o.cible};
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
  if(!liste.length){zone.append(el("p","acc-muted","Aucun objectif pour l'instant. Fixe-en un : un total de points, une place au classement, des victoires ou des tournois à jouer."));return;}
  const ul=el("ul","esp-objectifs");
  liste.forEach(o=>{
   const a=avancement(o),li=el("li","esp-objectif"+(a.atteint?" atteint":""));
   const tete=el("div","esp-objectif-tete");
   tete.append(el("b","",titreObjectif(o)));
   if(a.atteint)tete.append(el("span","esp-badge","Atteint"));
   li.appendChild(tete);
   const barre=el("div","esp-barre");barre.setAttribute("role","progressbar");barre.setAttribute("aria-valuemin","0");barre.setAttribute("aria-valuemax","100");
   barre.setAttribute("aria-valuenow",String(Math.round(100*a.part)));barre.setAttribute("aria-label","Avancement : "+titreObjectif(o));
   const plein=el("span");plein.style.width=Math.round(100*a.part)+"%";barre.appendChild(plein);
   li.append(barre);
   const details=el("p","esp-objectif-details",a.actuel);
   if(o.echeance){
    const reste=Math.round((B.simLireDate(o.echeance)-B.simLireDate(aujourdhui()))/86400000);
    details.append(" · "+(reste<0?"échéance dépassée ("+B.simLireDate(o.echeance).toLocaleDateString("fr-FR")+")":reste===0?"échéance aujourd'hui":"plus que "+reste+" jour"+(reste>1?"s":"")));
   }
   li.appendChild(details);
   const sup=el("button","esp-lien","Retirer cet objectif");sup.type="button";
   sup.setAttribute("aria-label","Retirer l'objectif : "+titreObjectif(o));
   sup.addEventListener("click",()=>{J.ecrireObjectifs(J.lireObjectifs().filter(x=>x.cle!==o.cle));rendreTout();J.synchroniser();});
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
  if(!Number.isInteger(cible)||cible<1||cible>500000){info(zone,"Indique un nombre entier entre 1 et 500 000.",true);formObjectif.elements["esp-cible"].focus();return;}
  if(echeance&&(!B.simLireDate(echeance)||echeance<aujourdhui())){info(zone,"Choisis une échéance aujourd'hui ou plus tard (ou laisse vide).",true);return;}
  const liste=J.lireObjectifs();
  if(liste.length>=20){info(zone,"20 objectifs au maximum : retires-en un d'abord.",true);return;}
  liste.push({cle:B.simNouvelleCle(),type,cible,echeance:echeance||null,depuis:aujourdhui()});
  if(!J.ecrireObjectifs(liste)){info(zone,"Le stockage de cet appareil est indisponible.",true);return;}
  info(zone,"");formObjectif.reset();majAideObjectif();rendreTout();J.synchroniser();
 });

 /* ---------- Résultats de tournois (même liste que le simulateur du barème) ---------- */
 function rendreResultats(){
  const zone=$("esp-resultats");zone.textContent="";
  const jour=aujourdhui(),liste=lireResultats();
  const {retenus,total}=B.classementEstime(liste,jour),garde=new Set(retenus.map(r=>r.cle));
  $("esp-total").textContent=nombre(total);
  if(!liste.length){zone.append(el("p","acc-muted","Aucun résultat saisi. Ajoute tes tournois : ton classement estimé et ta courbe de progression se calculent tout seuls."));return;}
  const tbl=el("div","tbl"),table=el("table"),tete=el("thead"),corps=el("tbody");
  tete.innerHTML="<tr><th scope=\"col\">Date</th><th scope=\"col\">Tournoi</th><th scope=\"col\">Place</th><th scope=\"col\">Points</th><th scope=\"col\">Statut</th><th scope=\"col\"><span class=\"sr-only\">Supprimer</span></th></tr>";
  liste.slice().sort((a,b)=>(b.date||"").localeCompare(a.date||"")).forEach(r=>{
   const tr=corps.insertRow(),pts=B.ptsFor(r.cat,r.place,r.nb,r.sexe);
   const statut=!r.date?"Date à renseigner":r.date>jour?"À venir":B.simExpire(r.date)<=jour?"Expiré":garde.has(r.cle)?"Retenu":"Hors des 12 meilleurs";
   [r.date?B.simLireDate(r.date).toLocaleDateString("fr-FR"):"–",r.cat+(["P500","P1000"].includes(r.cat)?" "+r.sexe:" · "+r.nb+" paires"),B.PLACE_LABEL(r.place-1),String(pts),statut].forEach(t=>{tr.insertCell().textContent=t;});
   if(!garde.has(r.cle))tr.className="dim";
   const b=el("button","x","✕");b.type="button";b.setAttribute("aria-label","Supprimer le résultat : "+r.cat+", "+B.PLACE_LABEL(r.place-1));
   b.addEventListener("click",()=>{ecrire(B.SIM_KEY,lireResultats().filter(x=>x.cle!==r.cle));rendreTout();J.synchroniser();});
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
  if(!B.simLireDate(r.date)||r.date>aujourdhui()){info(zone,"Choisis la date du tournoi (aujourd'hui ou avant).",true);f["esp-date"].focus();return;}
  if(B.ptsFor(r.cat,r.place,r.nb,r.sexe)===null){info(zone,"Cette place n'existe pas pour ce tableau (vérifie la place et le nombre de paires).",true);f["esp-place"].focus();return;}
  const liste=lireResultats();liste.push(r);
  if(!ecrire(B.SIM_KEY,liste)){info(zone,"Le stockage de cet appareil est indisponible.",true);return;}
  info(zone,"Résultat ajouté : "+B.ptsFor(r.cat,r.place,r.nb,r.sexe)+" points.");rendreTout();J.synchroniser();
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
  svg.setAttribute("aria-label","Classement estimé à la fin de chaque mois, des 12 derniers mois : de "+nombre(pts[0].total)+" à "+nombre(pts[11].total)+" points");
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
   const zoneSurvol=ajouter("rect",{x:x(i)-(L-g-d)/22,y:h,width:(L-g-d)/11,height:H-h-b,class:"esp-survol",tabindex:"0"});
   const texte=ESP_MOIS[p.mois.getMonth()]+" "+p.mois.getFullYear()+" : "+nombre(p.total)+" points";
   zoneSurvol.setAttribute("aria-label",texte);
   const montrer=()=>{point.classList.add("actif");bulle.textContent=texte;bulle.hidden=false;
    // Centrée sur le point, mais toujours entièrement dans le cadre du graphique
    const r=svg.getBoundingClientRect(),cadre=zone.getBoundingClientRect(),largeur=bulle.offsetWidth;
    bulle.style.left=Math.max(0,Math.min(r.width-largeur,x(i)*r.width/L-largeur/2))+"px";bulle.style.top=(y(p.total)*r.height/H-44+r.top-cadre.top)+"px";};
   const cacher=()=>{point.classList.remove("actif");bulle.hidden=true;};
   zoneSurvol.addEventListener("mouseenter",montrer);zoneSurvol.addEventListener("focus",montrer);
   zoneSurvol.addEventListener("mouseleave",cacher);zoneSurvol.addEventListener("blur",cacher);
  });
  zone.appendChild(svg);
  // Équivalent en tableau (lecteurs d'écran, lecture précise)
  const details=el("details","esp-donnees");details.appendChild(el("summary","","Voir les données"));
  const tbl=el("div","tbl"),table=el("table");
  table.innerHTML="<thead><tr><th scope=\"col\">Fin du mois</th><th scope=\"col\">Classement estimé</th></tr></thead>";
  const corps=el("tbody");pts.forEach(p=>{const tr=corps.insertRow();tr.insertCell().textContent=ESP_MOIS[p.mois.getMonth()]+" "+p.mois.getFullYear();tr.insertCell().textContent=nombre(p.total)+" pts";});
  table.appendChild(corps);tbl.appendChild(table);details.appendChild(tbl);zone.appendChild(details);
 }

 function rendreTout(){rendreStatut();rendreObjectifs();rendreResultats();rendreProgression();}
 J.onChange(rendreTout);
 let minuterieTaille=null;
 window.addEventListener("resize",()=>{clearTimeout(minuterieTaille);minuterieTaille=setTimeout(rendreProgression,150);});
 const c=window.PA_COMPTE;
 async function chargerMatchs(){
  if(!c||!c.actif||typeof c.loadMatches!=="function")return;
  await c.ready;if(!c.user){matchsCompte=[];rendreTout();return;}
  const r=await c.loadMatches(50);matchsCompte=r.ok?r.matchs:[];rendreTout();
 }
 if(c&&c.actif){c.onChange(()=>{rendreStatut();chargerMatchs();});chargerMatchs();}
 document.addEventListener("visibilitychange",()=>{if(!document.hidden)rendreTout();});
 majAideObjectif();majChampsResultat();rendreTout();
})();
