/* COMPTEUR DE MATCH (score.html)
   Le score n'est jamais modifié « à la main » : il est recalculé à partir de la liste des points joués
   (calculer). « Annuler le dernier point » retire simplement le dernier élément de la liste, et un match
   en cours survit à un rechargement de la page. Le moteur est exposé (window.PA_SCORE) pour être réutilisé
   par le tableau de bord du compte. */

// Motifs proposés après chaque point (du point de vue de la paire qui GAGNE le point)
const SC_MOTIFS=[
 {id:"faute",   label:"Faute directe"},
 {id:"gagnant", label:"Coup gagnant"},
 {id:"smash",   label:"Smash"},
 {id:"volee",   label:"Volée"},
 {id:"lob",     label:"Lob"},
 {id:"vitre",   label:"Sortie de vitre"},
 {id:"double",  label:"Double faute"},
];
const SC_LIBELLES_POINTS=["0","15","30","40"];
const SC_CLE_EN_COURS="pa-score-en-cours";
const SC_CLE_HISTORIQUE="pa-score-historique";
const SC_MAX_HISTORIQUE=50;
const SC_MAX_POINTS=1000; // garde-fou : un match en 3 sets dépasse rarement 250 points

/* ---------- Moteur (pur, sans DOM) ---------- */
function scConfigValide(c){
 return !!c&&typeof c==="object"&&
  typeof c.nomA==="string"&&c.nomA.trim().length>0&&c.nomA.length<=30&&
  typeof c.nomB==="string"&&c.nomB.trim().length>0&&c.nomB.length<=30&&
  ["decisif","avantages"].includes(c.egalite)&&["set","super"].includes(c.dernierSet)&&
  (c.serveur===0||c.serveur===1);
}
function scPointsValides(points){
 return Array.isArray(points)&&points.length<=SC_MAX_POINTS&&points.every(p=>p&&(p.g===0||p.g===1)&&(p.m===null||SC_MOTIFS.some(m=>m.id===p.m)));
}

// Rejoue tous les points et renvoie l'état complet du match (score, service, statistiques)
function calculer(config,points){
 const e={
  sets:[],            // sets terminés : {a,b,tb:[a,b]|null,superTb:bool}
  jeux:[0,0],         // jeux du set en cours
  pts:[0,0],          // points du jeu en cours (ou du tie-break)
  setsGagnes:[0,0],
  tieBreak:null,      // null, ou {cible:7|10, premier:0|1, joues:n}
  serveur:config.serveur,
  fini:false,vainqueur:null,
  stats:{points:[0,0],motifs:[{},{}],serie:[0,0],pointsService:[[0,0],[0,0]]},
  joues:0             // points réellement pris en compte
 };
 let serieEnCours=0,dernierGagnant=null;
 // Le 3e set se joue en super tie-break si l'option est choisie
 const ouvrirSetSuivant=()=>{
  e.jeux=[0,0];e.pts=[0,0];
  if(config.dernierSet==="super"&&e.setsGagnes[0]===1&&e.setsGagnes[1]===1){
   e.tieBreak={cible:10,premier:e.serveur,joues:0};
  }
 };
 const terminerSet=(g,tb,superTb)=>{
  e.sets.push({a:e.jeux[0],b:e.jeux[1],tb:tb?[tb[0],tb[1]]:null,superTb:!!superTb});
  e.setsGagnes[g]++;
  if(e.setsGagnes[g]===2){e.fini=true;e.vainqueur=g;return;}
  ouvrirSetSuivant();
 };
 for(const p of points){
  if(e.fini)break;
  const g=p.g,o=1-g;
  // Statistiques (avant de faire évoluer le score)
  e.stats.points[g]++;
  if(p.m)e.stats.motifs[g][p.m]=(e.stats.motifs[g][p.m]||0)+1;
  e.stats.pointsService[e.serveur][g===e.serveur?0:1]++;
  serieEnCours=g===dernierGagnant?serieEnCours+1:1;dernierGagnant=g;
  if(serieEnCours>e.stats.serie[g])e.stats.serie[g]=serieEnCours;
  e.joues++;
  if(e.tieBreak){
   const tb=e.tieBreak;
   e.pts[g]++;tb.joues++;
   if(e.pts[g]>=tb.cible&&e.pts[g]-e.pts[o]>=2){
    // La paire qui a reçu en premier dans le tie-break sert le jeu suivant
    const tbPoints=[e.pts[0],e.pts[1]];
    if(tb.cible===10){e.jeux=[g===0?1:0,g===1?1:0];}else{e.jeux[g]++;}
    const superTb=tb.cible===10;
    e.serveur=1-tb.premier;e.tieBreak=null;
    // terminerSet peut ouvrir un super tie-break pour le 3e set
    terminerSet(g,tbPoints,superTb);
   }else{
    // 1er point servi par « premier », puis 2 points chacun
    e.serveur=Math.floor((tb.joues+1)/2)%2===0?tb.premier:1-tb.premier;
   }
   continue;
  }
  e.pts[g]++;
  const decisif=config.egalite==="decisif"&&e.pts[g]===4&&e.pts[o]===3;
  if(e.pts[g]>=4&&(e.pts[g]-e.pts[o]>=2||decisif)){
   e.jeux[g]++;e.pts=[0,0];e.serveur=1-e.serveur;
   if(e.jeux[g]>=6&&e.jeux[g]-e.jeux[o]>=2){terminerSet(g,null,false);}
   else if(e.jeux[0]===6&&e.jeux[1]===6){e.tieBreak={cible:7,premier:e.serveur,joues:0};}
  }
 }
 return e;
}

// Libellés du jeu en cours pour l'affichage : ["40","AV"], ["5","3"] en tie-break…
function libellesPoints(config,e){
 const [a,b]=e.pts;
 if(e.tieBreak)return [String(a),String(b)];
 if(a>=3&&b>=3){
  if(a===b)return ["40","40"];
  return a>b?["AV","40"]:["40","AV"];
 }
 return [SC_LIBELLES_POINTS[a],SC_LIBELLES_POINTS[b]];
}
// Situation particulière du jeu en cours, à afficher sous le score
function situation(config,e){
 if(e.fini)return "";
 if(e.tieBreak)return e.tieBreak.cible===10?"Super tie-break (10 points)":"Tie-break (7 points)";
 const [a,b]=e.pts;
 if(a>=3&&b>=3&&a===b)return config.egalite==="decisif"?"Point décisif : la paire qui reçoit choisit le côté":"Égalité";
 return "";
}
// Score lisible : « 6-4 3-6 [10-8] » ; tie-break perdant entre parenthèses : « 7-6 (7-5) »
function scoreTexte(e){
 const sets=e.sets.map(s=>{
  if(s.superTb)return `[${s.tb[0]}-${s.tb[1]}]`;
  return s.tb?`${s.a}-${s.b} (${s.tb[0]}-${s.tb[1]})`:`${s.a}-${s.b}`;
 });
 if(!e.fini){
  if(e.tieBreak&&e.tieBreak.cible===10)sets.push(`[${e.pts[0]}-${e.pts[1]}]`);
  else if(e.jeux[0]||e.jeux[1]||e.pts[0]||e.pts[1])sets.push(`${e.jeux[0]}-${e.jeux[1]}`);
 }
 return sets.join(" ");
}
// Identifiant d'un match (journal de l'espace joueur : jamais copié deux fois dans le compte)
function scNouvelleCle(){
 try{if(typeof crypto!=="undefined"&&crypto.randomUUID)return crypto.randomUUID();}catch(e){}
 return Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,12);
}
window.PA_SCORE={nouvelleCle:scNouvelleCle,MOTIFS:SC_MOTIFS,calculer,libellesPoints,situation,scoreTexte,configValide:scConfigValide,pointsValides:scPointsValides,CLE_HISTORIQUE:SC_CLE_HISTORIQUE};

/* ---------- Interface ---------- */
(function(){
 const racine=document.getElementById("score-app");
 if(!racine)return;
 const $=id=>document.getElementById(id);
 const ecranReglages=$("sc-reglages"),ecranMatch=$("sc-match"),ecranFin=$("sc-fin");
 const formReglages=$("sc-form");
 const zoneMotifs=$("sc-motifs"),zoneGagnants=$("sc-gagnants");
 const message=$("sc-message");
 let config=null,points=[],gagnantEnAttente=null,verrouEcran=null,matchFini=null;

 function lireJSON(cle,defaut){try{const v=JSON.parse(localStorage.getItem(cle)||"null");return v===null?defaut:v;}catch(e){return defaut;}}
 function ecrireJSON(cle,valeur){try{localStorage.setItem(cle,JSON.stringify(valeur));return true;}catch(e){return false;}}
 function supprimer(cle){try{localStorage.removeItem(cle);}catch(e){}}
 function info(texte,erreur){message.textContent=texte||"";message.hidden=!texte;message.classList.toggle("acc-err",!!erreur);}
 function lireHistorique(){
  const liste=lireJSON(SC_CLE_HISTORIQUE,[]);
  return Array.isArray(liste)?liste.filter(m=>m&&scConfigValide(m.config)&&scPointsValides(m.points)&&typeof m.fin==="string"):[];
 }
 function afficherEcran(ecran){
  [ecranReglages,ecranMatch,ecranFin].forEach(x=>{x.hidden=x!==ecran;});
  // Pendant le match, le tableau et les gros boutons doivent tenir à l'écran sans faire défiler
  if(ecran===ecranMatch)$("sc-tableau").scrollIntoView({block:"start"});
  if(ecran===ecranMatch)demanderVerrou();else libererVerrou();
 }

 /* Écran allumé pendant le match (Wake Lock), quand le navigateur le permet */
 async function demanderVerrou(){
  if(!("wakeLock" in navigator)||verrouEcran||document.hidden)return;
  try{verrouEcran=await navigator.wakeLock.request("screen");verrouEcran.addEventListener("release",()=>{verrouEcran=null;});}
  catch(e){verrouEcran=null;}
 }
 function libererVerrou(){if(verrouEcran){verrouEcran.release().catch(()=>{});verrouEcran=null;}}
 document.addEventListener("visibilitychange",()=>{if(!document.hidden&&!ecranMatch.hidden)demanderVerrou();});

 /* --- Réglages --- */
 function lireReglages(){
  const f=formReglages;
  return {
   nomA:f.elements["sc-nom-a"].value.trim().slice(0,30)||"Nous",
   nomB:f.elements["sc-nom-b"].value.trim().slice(0,30)||"Eux",
   serveur:f.elements["sc-serveur"].value==="1"?1:0,
   egalite:f.elements["sc-egalite"].value==="avantages"?"avantages":"decisif",
   dernierSet:f.elements["sc-dernier"].value==="set"?"set":"super",
   // Journal de l'espace joueur : partenaire et type de match (facultatifs)
   partenaire:f.elements["sc-partenaire"].value.trim().slice(0,30)||null,
   type:["amical","tournoi","entrainement"].includes(f.elements["sc-type"].value)?f.elements["sc-type"].value:"amical",
  };
 }
 function remplirReglages(c){
  const f=formReglages;
  f.elements["sc-nom-a"].value=c.nomA;f.elements["sc-nom-b"].value=c.nomB;
  f.elements["sc-serveur"].value=String(c.serveur);f.elements["sc-egalite"].value=c.egalite;f.elements["sc-dernier"].value=c.dernierSet;
  f.elements["sc-partenaire"].value=c.partenaire||"";f.elements["sc-type"].value=c.type||"amical";
 }
 // Noms affichés sur les choix « qui sert en premier » quand on tape les noms
 function majLibellesServeur(){
  const c=lireReglages();
  $("sc-serveur-a").textContent=c.nomA;$("sc-serveur-b").textContent=c.nomB;
 }
 formReglages.addEventListener("input",majLibellesServeur);
 formReglages.addEventListener("submit",e=>{
  e.preventDefault();
  demarrer({...lireReglages(),debut:new Date().toISOString()});
 });
 function demarrer(c){
  config=c;points=[];gagnantEnAttente=null;info("");
  sauverEnCours();rendreMatch();afficherEcran(ecranMatch);
  $("sc-point-0").focus();
 }

 /* --- Match --- */
 function sauverEnCours(){
  if(!ecrireJSON(SC_CLE_EN_COURS,{config,points}))info("Le stockage de cet appareil est indisponible : le match sera perdu si tu fermes la page.",true);
 }
 function rendreMatch(){
  const e=calculer(config,points);
  const lib=libellesPoints(config,e);
  [0,1].forEach(i=>{
   const nom=i===0?config.nomA:config.nomB;
   $("sc-nom-"+i).textContent=nom;
   $("sc-service-"+i).hidden=e.serveur!==i;
   $("sc-pts-"+i).textContent=lib[i];
   $("sc-jeux-"+i).textContent=e.tieBreak&&e.tieBreak.cible===10?"–":String(e.jeux[i]);
   $("sc-sets-"+i).textContent=e.sets.map(s=>s.superTb?`[${s.tb[i]}]`:(i===0?s.a:s.b)).join(" ");
   $("sc-point-"+i).querySelector("span").textContent=nom;
  });
  $("sc-situation").textContent=situation(config,e);
  $("sc-annuler").disabled=!points.length;
  // Annonce vocale (lecteurs d'écran) : score du jeu
  $("sc-annonce").textContent=`${config.nomA} ${lib[0]}, ${config.nomB} ${lib[1]}. Jeux ${e.jeux[0]}-${e.jeux[1]}.`;
  fermerMotifs(false);
  if(e.fini)terminer(false);
 }
 function ouvrirMotifs(g){
  gagnantEnAttente=g;
  $("sc-motifs-titre").textContent=`Point pour ${g===0?config.nomA:config.nomB} : comment ?`;
  zoneGagnants.hidden=true;zoneMotifs.hidden=false;
  zoneMotifs.querySelector("button").focus();
 }
 function fermerMotifs(focus){
  gagnantEnAttente=null;zoneMotifs.hidden=true;zoneGagnants.hidden=false;
  if(focus)$("sc-point-0").focus();
 }
 [0,1].forEach(g=>$("sc-point-"+g).addEventListener("click",()=>ouvrirMotifs(g)));
 zoneMotifs.addEventListener("click",e=>{
  const b=e.target.closest("button[data-motif]");
  if(!b||gagnantEnAttente===null)return;
  if(b.dataset.motif==="retour"){fermerMotifs(true);return;}
  if(points.length>=SC_MAX_POINTS)return;
  points.push({g:gagnantEnAttente,m:b.dataset.motif==="aucun"?null:b.dataset.motif});
  sauverEnCours();rendreMatch();
  if(!ecranMatch.hidden)$("sc-point-0").focus();
 });
 $("sc-annuler").addEventListener("click",()=>{
  if(!points.length)return;
  points.pop();sauverEnCours();rendreMatch();
  info("Dernier point annulé.");
 });
 // Arrêt avant la fin (créneau terminé…) : confirmation intégrée, sans confirm()
 $("sc-arreter").addEventListener("click",()=>{$("sc-arret-confirmation").hidden=false;$("sc-arret-oui").focus();});
 $("sc-arret-non").addEventListener("click",()=>{$("sc-arret-confirmation").hidden=true;$("sc-arreter").focus();});
 $("sc-arret-oui").addEventListener("click",()=>{$("sc-arret-confirmation").hidden=true;terminer(true);});

 /* --- Fin de match --- */
 function terminer(interrompu){
  const e=calculer(config,points);
  const match={cle:scNouvelleCle(),config,points:points.slice(),fin:new Date().toISOString(),interrompu:!!interrompu&&!e.fini,score:scoreTexte(e),vainqueur:e.fini?e.vainqueur:null,
   partenaire:config.partenaire||null,type:config.type||"amical",saisie:"compteur"};
  const historique=lireHistorique();
  historique.unshift(match);
  if(!ecrireJSON(SC_CLE_HISTORIQUE,historique.slice(0,SC_MAX_HISTORIQUE)))info("Le stockage de cet appareil est indisponible : ce match n'est pas gardé dans l'historique.",true);
  supprimer(SC_CLE_EN_COURS);
  matchFini=match;
  rendreRecap(match,$("sc-recap"));
  proposerBilan(match);
  afficherEcran(ecranFin);
  rendreHistorique();
  enregistrerCompte(match);
  $("sc-fin-titre").focus();
 }
 // Bilan facultatif du match (diagnostic.js, chargé après ce fichier) : rattaché au match par sa clé
 function proposerBilan(m){const z=$("sc-diagnostic");if(z&&window.PA_DIAGNOSTIC)window.PA_DIAGNOSTIC.bloc(z,window.PA_DIAGNOSTIC.cleMatch(m));else if(z)z.textContent="";}
 // Récapitulatif : vainqueur, score, % de points, motifs en barres, plus longue série
 function rendreRecap(match,zone){
  const c=match.config,e=calculer(c,match.points),noms=[c.nomA,c.nomB];
  zone.textContent="";
  const titre=document.createElement("p");titre.className="sc-recap-vainqueur";
  titre.textContent=match.vainqueur===0||match.vainqueur===1?`Victoire : ${noms[match.vainqueur]}`:"Match arrêté avant la fin";
  const score=document.createElement("p");score.className="sc-recap-score";score.textContent=match.score||"Aucun jeu terminé";
  const date=document.createElement("p");date.className="acc-muted";
  date.textContent=new Date(match.fin).toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long",hour:"2-digit",minute:"2-digit"})+` · ${match.points.length} points joués`;
  zone.append(titre,score,date);
  const total=e.stats.points[0]+e.stats.points[1];
  if(!total)return;
  // Points gagnés : une barre par paire
  const blocPoints=document.createElement("div");blocPoints.className="sc-bloc";
  const h=document.createElement("h3");h.textContent="Points gagnés";blocPoints.appendChild(h);
  [0,1].forEach(i=>blocPoints.appendChild(barre(noms[i],e.stats.points[i],total,`${e.stats.points[i]} (${Math.round(100*e.stats.points[i]/total)} %)`,i)));
  zone.appendChild(blocPoints);
  // Points gagnés au service (utile pour voir qui tient sa mise en jeu)
  const blocService=document.createElement("div");blocService.className="sc-bloc";
  const hs=document.createElement("h3");hs.textContent="Points gagnés sur son service";blocService.appendChild(hs);
  [0,1].forEach(i=>{const [gagnes,perdus]=e.stats.pointsService[i];const n=gagnes+perdus;
   blocService.appendChild(barre(noms[i],gagnes,n||1,n?`${gagnes}/${n} (${Math.round(100*gagnes/n)} %)`:"–",i));});
  zone.appendChild(blocService);
  // Motifs : comment chaque paire a gagné ses points
  [0,1].forEach(i=>{
   const motifs=e.stats.motifs[i],nbAvecMotif=Object.values(motifs).reduce((s,n)=>s+n,0);
   const bloc=document.createElement("div");bloc.className="sc-bloc";
   const hm=document.createElement("h3");hm.textContent=`Points gagnés par ${noms[i]}`;bloc.appendChild(hm);
   if(!nbAvecMotif){const p=document.createElement("p");p.className="acc-muted";p.textContent="Aucun motif renseigné.";bloc.appendChild(p);}
   const max=Math.max(1,...Object.values(motifs));
   // Faute directe et double faute sont commises par l'autre paire : on le dit
   const libelle=m=>m.id==="faute"?"Faute directe de "+noms[1-i]:m.id==="double"?"Double faute de "+noms[1-i]:m.label;
   SC_MOTIFS.filter(m=>motifs[m.id]).sort((x,y)=>motifs[y.id]-motifs[x.id]).forEach(m=>bloc.appendChild(barre(libelle(m),motifs[m.id],max,String(motifs[m.id]),i)));
   zone.appendChild(bloc);
  });
  const serie=document.createElement("p");serie.className="sc-serie";
  serie.textContent=`Plus longue série de points : ${noms[0]} ${e.stats.serie[0]} · ${noms[1]} ${e.stats.serie[1]}`;
  zone.appendChild(serie);
 }
 function barre(libelle,valeur,max,texte,paire){
  const ligne=document.createElement("div");ligne.className="sc-barre";
  const nom=document.createElement("span");nom.className="sc-barre-nom";nom.textContent=libelle;
  const piste=document.createElement("span");piste.className="sc-barre-piste";
  const rempli=document.createElement("span");rempli.className="sc-barre-rempli"+(paire===1?" b":"");
  rempli.style.width=Math.round(100*valeur/max)+"%";piste.appendChild(rempli);
  const val=document.createElement("span");val.className="sc-barre-val";val.textContent=texte;
  ligne.append(nom,piste,val);return ligne;
 }
 $("sc-nouveau").addEventListener("click",()=>{afficherEcran(ecranReglages);info("");$("sc-nom-a").focus();});
 $("sc-revanche").addEventListener("click",()=>{if(matchFini)demarrer({...matchFini.config,debut:new Date().toISOString()});});

 /* --- Compte (facultatif) : sauvegarde du match terminé --- */
 async function enregistrerCompte(match){
  const compte=window.PA_COMPTE,zone=$("sc-compte");
  zone.textContent="";
  if(!compte||!compte.actif||typeof compte.saveMatch!=="function")return;
  await compte.ready;
  if(!compte.user){const a=document.createElement("a");a.href="connexion.html?suite=score.html";a.textContent="Connecte-toi";zone.append(a," pour garder tes matchs sur tous tes appareils (tu les retrouves dans Mon espace).");return;}
  zone.textContent="Enregistrement dans ton compte…";
  const reponse=await compte.saveMatch(match);
  if(matchFini!==match)return; // un autre match a commencé entre-temps
  zone.textContent=reponse.ok?"Match enregistré dans ton compte.":reponse.message;
  if(!reponse.ok){
   const b=document.createElement("button");b.type="button";b.className="btn ghost";b.textContent="Réessayer";
   b.addEventListener("click",()=>enregistrerCompte(match));zone.append(" ",b);
  }
 }

 /* --- Historique local --- */
 function rendreHistorique(){
  const liste=lireHistorique(),zone=$("sc-historique");
  zone.textContent="";
  $("sc-historique-vide").hidden=liste.length>0;
  $("sc-effacer").hidden=!liste.length;
  liste.forEach((m,i)=>{
   const li=document.createElement("li");
   const b=document.createElement("button");b.type="button";b.className="sc-histo";b.dataset.i=String(i);
   const quand=document.createElement("span");quand.className="sc-histo-date";
   quand.textContent=new Date(m.fin).toLocaleDateString("fr-FR",{day:"numeric",month:"short"});
   const qui=document.createElement("span");qui.className="sc-histo-noms";
   qui.textContent=`${m.config.nomA} – ${m.config.nomB}`;
   const score=document.createElement("span");score.className="sc-histo-score";
   score.textContent=(m.score||"–")+(m.interrompu?" (arrêté)":"");
   b.append(quand,qui,score);li.appendChild(b);zone.appendChild(li);
  });
 }
 $("sc-historique").addEventListener("click",e=>{
  const b=e.target.closest("button.sc-histo");if(!b)return;
  const m=lireHistorique()[Number(b.dataset.i)];if(!m)return;
  matchFini=m;rendreRecap(m,$("sc-recap"));$("sc-compte").textContent="";proposerBilan(m);
  afficherEcran(ecranFin);$("sc-fin-titre").focus();
 });
 $("sc-effacer").addEventListener("click",()=>{$("sc-effacer-confirmation").hidden=false;$("sc-effacer-oui").focus();});
 $("sc-effacer-non").addEventListener("click",()=>{$("sc-effacer-confirmation").hidden=true;$("sc-effacer").focus();});
 $("sc-effacer-oui").addEventListener("click",()=>{
  supprimer(SC_CLE_HISTORIQUE);$("sc-effacer-confirmation").hidden=true;rendreHistorique();info("Historique effacé de cet appareil.");
 });

 /* --- Démarrage : reprise d'un match en cours s'il y en a un --- */
 const enCours=lireJSON(SC_CLE_EN_COURS,null);
 rendreHistorique();
 if(enCours&&scConfigValide(enCours.config)&&scPointsValides(enCours.points)){
  config=enCours.config;points=enCours.points;
  remplirReglages(config);majLibellesServeur();
  if(calculer(config,points).fini){terminer(false);}
  else{rendreMatch();afficherEcran(ecranMatch);info("Match en cours repris.");}
 }else{
  if(enCours)supprimer(SC_CLE_EN_COURS);
  majLibellesServeur();afficherEcran(ecranReglages);
 }
})();
