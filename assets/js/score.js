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
 // Récapitulatif : vainqueur, score, points gagnés (barres), courbe du match, points au service, motifs, plus longue série.
 // Graphiques SVG dessinés avec graphique-svg.js (chargé avant) ; chaque valeur est aussi écrite en clair sur le graphique
 // (étiquettes directes) et dans l'aria-label. Sans graphique-svg.js, les mêmes valeurs en liste de texte.
 function rendreRecap(match,zone){
  suivis.forEach(o=>o.disconnect());suivis=[];
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
  const pct=(a,n)=>Math.round(100*a/n)+" %";
  // Points gagnés : une barre par paire (part du total)
  zone.appendChild(blocBarres("Points gagnés",[0,1].map(i=>({libelle:noms[i],valeur:e.stats.points[i],part:e.stats.points[i]/total,paire:i,
   texte:`${e.stats.points[i]} (${pct(e.stats.points[i],total)})`,detail:`${e.stats.points[i]} points sur ${total} (${pct(e.stats.points[i],total)})`})),SC_QUARTS));
  // Courbe : points gagnés par chaque paire au fil du match (seulement les points pris en compte par le score)
  const courbe=blocCourbe(c,match.points.slice(0,e.joues),noms);
  if(courbe)zone.appendChild(courbe);
  // Points gagnés au service (utile pour voir qui tient sa mise en jeu)
  zone.appendChild(blocBarres("Points gagnés sur son service",[0,1].map(i=>{const [gagnes,perdus]=e.stats.pointsService[i];const n=gagnes+perdus;
   return {libelle:noms[i],valeur:gagnes,part:n?gagnes/n:0,paire:i,texte:n?`${gagnes}/${n} (${pct(gagnes,n)})`:"–",
    detail:n?`${gagnes} points gagnés sur ${n} servis (${pct(gagnes,n)})`:"aucun point servi"};}),SC_QUARTS));
  // Motifs : comment chaque paire a gagné ses points
  [0,1].forEach(i=>{
   const motifs=e.stats.motifs[i],nbAvecMotif=Object.values(motifs).reduce((s,n)=>s+n,0);
   const titreMotifs=`Points gagnés par ${noms[i]}`;
   if(!nbAvecMotif){
    const bloc=titreBloc(titreMotifs);
    const p=document.createElement("p");p.className="acc-muted";p.textContent="Aucun motif renseigné.";
    bloc.appendChild(p);zone.appendChild(bloc);return;
   }
   // Échelle commune aux motifs d'une paire : graduation ronde au-dessus du plus grand nombre
   const max=Math.max(1,...Object.values(motifs)),pas=GR?GR.pasGrille(max):max,haut=Math.ceil(max/pas)*pas;
   const graduations=[];for(let v=0;v<=haut+1e-9;v+=pas)graduations.push(v/haut);
   // Faute directe et double faute sont commises par l'autre paire : on le dit
   const libelle=m=>m.id==="faute"?"Faute directe de "+noms[1-i]:m.id==="double"?"Double faute de "+noms[1-i]:m.label;
   const lignes=SC_MOTIFS.filter(m=>motifs[m.id]).sort((x,y)=>motifs[y.id]-motifs[x.id]).map(m=>({libelle:libelle(m),valeur:motifs[m.id],part:motifs[m.id]/haut,paire:i,
    texte:String(motifs[m.id]),detail:motifs[m.id]+" point"+(motifs[m.id]>1?"s":"")}));
   zone.appendChild(blocBarres(titreMotifs,lignes,graduations));
  });
  const serie=document.createElement("p");serie.className="sc-serie";
  serie.textContent=`Plus longue série de points : ${noms[0]} ${e.stats.serie[0]} · ${noms[1]} ${e.stats.serie[1]}`;
  zone.appendChild(serie);
 }

 /* --- Graphiques du récapitulatif (SVG) --- */
 const GR=window.PA_GRAPHIQUE;
 const SC_QUARTS=[0,.25,.5,.75,1]; // grille des barres en pourcentage
 const SC_LARGEUR_DEFAUT=600; // px : largeur de dessin tant que l'écran de fin est caché (redessiné à la vraie largeur)
 let suivis=[]; // observateurs de largeur des graphiques affichés (déconnectés quand le récap est refait)
 function titreBloc(texte){const bloc=document.createElement("div");bloc.className="sc-bloc";const h=document.createElement("h3");h.textContent=texte;bloc.appendChild(h);return bloc;}
 // Cadre commun : <figure> (fond --bg, hauteur du SVG fixée avant le dessin), SVG role="img", info-bulle aria-hidden
 function cadreGraphique(classe,hauteur,aria){
  const fig=document.createElement("figure");fig.className="sc-graph "+classe;
  const svg=GR.el("svg",{class:"sc-svg",role:"img",focusable:"false","aria-label":aria});
  svg.style.height=hauteur+"px";
  const bulle=document.createElement("div");bulle.className="sc-bulle";bulle.setAttribute("aria-hidden","true");bulle.hidden=true;
  fig.append(svg,bulle);
  return {fig,svg,bulle};
 }
 // Suivi du pointeur (souris ou doigt) : viser(x, y) en px du SVG ; la bulle se cache quand la souris sort
 function suivrePointeur(svg,viser,cacher){
  const relatif=ev=>{const r=svg.getBoundingClientRect();viser(ev.clientX-r.left,ev.clientY-r.top);};
  svg.addEventListener("pointermove",relatif);
  svg.addEventListener("pointerdown",relatif);
  svg.addEventListener("pointerleave",ev=>{if(ev.pointerType==="mouse")cacher();});
 }
 const largeurDe=svg=>Math.round(svg.getBoundingClientRect().width)||SC_LARGEUR_DEFAUT;

 // Barres horizontales : nom à gauche et valeur à droite au-dessus de chaque barre (étiquettes directes), grille verticale discrète.
 // lignes : {libelle, valeur, part (0 à 1 de la largeur), texte (affiché), detail (info-bulle), paire (0 ou 1 : couleur)}
 function blocBarres(titre,lignes,graduations){
  const bloc=titreBloc(titre);
  const aria=titre+" : "+lignes.map(l=>l.libelle+" "+l.texte).join(", ")+".";
  if(!GR){ // secours sans graphique : les mêmes valeurs en texte
   const ul=document.createElement("ul");ul.className="sc-valeurs";
   lignes.forEach(l=>{const li=document.createElement("li");li.textContent=l.libelle+" : "+l.texte;ul.appendChild(li);});
   bloc.appendChild(ul);return bloc;
  }
  const LIGNE=38,HAUT=2,H=HAUT+lignes.length*LIGNE+2;
  const {fig,svg,bulle}=cadreGraphique("sc-graph-barres",H,aria);
  let survol=null;
  const cacher=()=>{bulle.hidden=true;if(survol)survol.classList.remove("survol");survol=null;};
  function dessiner(){
   const L=largeurDe(svg),plot=L-2;
   cacher();
   while(svg.firstChild)svg.removeChild(svg.firstChild);
   svg.setAttribute("viewBox",`0 0 ${L} ${H}`);
   const grille=GR.el("g",{class:"sc-grille","aria-hidden":"true"},svg);
   graduations.forEach(f=>{const x=Math.round(f*plot)+.5;GR.el("line",{x1:x,x2:x,y1:HAUT,y2:H-2},grille);});
   lignes.forEach((l,k)=>{
    const y=HAUT+k*LIGNE;
    const g=GR.el("g",{class:"sc-barre"+(l.paire===1?" b":""),"data-valeur":l.valeur,"aria-hidden":"true"},svg);
    const val=GR.el("text",{x:L-2,y:y+14,class:"sc-barre-val","text-anchor":"end"},g);val.textContent=l.texte;
    const lv=val.getComputedTextLength?val.getComputedTextLength():0;
    const nom=GR.el("text",{x:0,y:y+14,class:"sc-barre-nom"},g);
    GR.ajuster(nom,l.libelle,Math.max(20,L-2-(lv>0?lv:GR.largeurTexte(l.texte,8))-12),7.5);
    // Longueur : 1 px au moins pour une valeur non nulle, rien pour zéro
    const longueur=l.valeur>0?Math.max(1,Math.min(1,l.part)*plot):0;
    if(longueur)GR.el("path",{d:GR.barreHorizontale(0,y+20,longueur,12),class:"sc-barre-rempli"},g);
    l.noeud=g;l.fin={x:Math.max(longueur,8),y:y+20};
   });
  }
  suivrePointeur(svg,(x,y)=>{
   const k=Math.floor((y-HAUT)/LIGNE);
   if(k<0||k>=lignes.length||!lignes[k].noeud){cacher();return;}
   const l=lignes[k];
   if(survol)survol.classList.remove("survol");
   survol=l.noeud;survol.classList.add("survol");
   bulle.textContent=l.libelle+" : "+l.detail;bulle.hidden=false;
   GR.placerBulle(fig,svg,bulle,l.fin.x,l.fin.y);
  },cacher);
  dessiner();
  const obs=GR.suivreLargeur(fig,lg=>{if(lg)dessiner();});if(obs)suivis.push(obs);
  bloc.appendChild(fig);
  return bloc;
 }

 // Fins de set : numéro du point qui termine chaque set et score du set (le score est rejoué point par point)
 function finsDeSet(config,liste){
  const fins=[];let avant=0;
  for(let k=1;k<=liste.length;k++){
   const e=calculer(config,liste.slice(0,k));
   if(e.sets.length>avant){avant=e.sets.length;const s=e.sets[avant-1];fins.push({k,numero:avant,score:s.superTb?`[${s.tb[0]}-${s.tb[1]}]`:`${s.a}-${s.b}`});}
  }
  return fins;
 }
 // Courbe : nombre de points gagnés par chaque paire après chaque point joué (ceux de l'une sont les points perdus de l'autre).
 // Paire 1 en --turf trait plein avec un rond au bout, paire 2 en --sky pointillé avec un carré : pas seulement la couleur.
 function blocCourbe(config,liste,noms){
  const n=liste.length;
  if(n<2||!GR)return null;
  const cumul=[[0],[0]];
  liste.forEach((p,k)=>{cumul[0].push(cumul[0][k]+(p.g===0?1:0));cumul[1].push(cumul[1][k]+(p.g===1?1:0));});
  const fins=finsDeSet(config,liste),fin=[cumul[0][n],cumul[1][n]];
  const aria=`Points gagnés au fil du match, ${n} points joués : ${noms[0]} ${fin[0]}, ${noms[1]} ${fin[1]}.`+
   fins.map(f=>` Set ${f.numero} (${f.score}) terminé au point ${f.k} : ${noms[0]} ${cumul[0][f.k]}, ${noms[1]} ${cumul[1][f.k]}.`).join("");
  const bloc=titreBloc("Points gagnés et perdus au fil du match");
  const H=200;
  const {fig,svg,bulle}=cadreGraphique("sc-graph-courbe",H,aria);
  fig.dataset.points=String(n);
  // Légende : clé de chaque trait (couleur et forme), mode d'emploi
  const legende=document.createElement("figcaption");legende.className="sc-legende";
  [0,1].forEach(i=>{
   const cle=document.createElement("span");cle.className="sc-cle"+(i===1?" b":"");cle.setAttribute("aria-hidden","true");
   const nom=document.createElement("b");nom.textContent=noms[i];
   legende.append(cle," ",nom,i===0?" (trait plein) · ":" (pointillés). ");
  });
  legende.append("Chaque point gagné fait monter la courbe de sa paire. Touche ou survole la courbe pour lire le score.");
  fig.appendChild(legende);
  const max=Math.max(fin[0],fin[1]),pas=GR.pasGrille(max),haut=Math.ceil(max/pas)*pas;
  let geo=null,repere=null;
  const cacher=()=>{bulle.hidden=true;if(repere)repere.setAttribute("visibility","hidden");};
  // Rond pour la paire 1, carré pour la paire 2
  function marqueur(parent,i,x,y,classe){
   return i===0?GR.el("circle",{cx:x,cy:y,r:4.5,class:classe,"data-paire":0},parent):GR.el("rect",{x:x-4,y:y-4,width:8,height:8,rx:1.5,class:classe,"data-paire":1},parent);
  }
  function dessiner(){
   const L=largeurDe(svg);
   while(svg.firstChild)svg.removeChild(svg.firstChild);
   svg.setAttribute("viewBox",`0 0 ${L} ${H}`);
   const m={haut:14,bas:22,gauche:30,droite:GR.largeurTexte(String(max))+8};
   const g={x:k=>m.gauche+k*(L-m.gauche-m.droite)/n,y:v=>m.haut+(H-m.haut-m.bas)*(1-v/haut)};
   geo=g;
   const grille=GR.el("g",{class:"sc-grille","aria-hidden":"true"},svg);
   for(let v=0;v<=haut+1e-9;v+=pas){
    const y=Math.round(g.y(v))+.5;
    GR.el("line",{x1:m.gauche,x2:L-m.droite,y1:y,y2:y},grille);
    GR.el("text",{x:m.gauche-6,y:y+4,class:"sc-axe","text-anchor":"end"},grille).textContent=String(Math.round(v*10)/10);
   }
   // Fins de set : trait vertical et « S1 », « S2 » sous l'axe ; à droite, le nombre de points joués
   const yBas=H-m.bas,finTexte=`${n} pts`,debutFin=L-m.droite-GR.largeurTexte(finTexte);
   fins.filter(f=>f.k<n).forEach(f=>{
    const x=Math.round(g.x(f.k))+.5;
    GR.el("line",{x1:x,x2:x,y1:m.haut,y2:yBas,class:"sc-set"},grille);
    if(x+12<debutFin)GR.el("text",{x,y:yBas+16,class:"sc-axe","text-anchor":"middle"},grille).textContent="S"+f.numero;
   });
   GR.el("text",{x:L-m.droite,y:yBas+16,class:"sc-axe","text-anchor":"end"},grille).textContent=finTexte;
   // Les deux courbes, puis un repère au dernier point de chacune
   [0,1].forEach(i=>{
    GR.el("polyline",{points:cumul[i].map((v,k)=>g.x(k).toFixed(1)+","+g.y(v).toFixed(1)).join(" "),class:"sc-courbe"+(i===1?" b":""),"data-paire":i,"aria-hidden":"true"},svg);
   });
   const arrivees=GR.el("g",{"aria-hidden":"true"},svg);
   [0,1].forEach(i=>marqueur(arrivees,i,g.x(n),g.y(fin[i]),"sc-marque"+(i===1?" b":"")));
   // Étiquettes du dernier point seulement, écartées si les deux arrivées sont trop proches
   let y0=g.y(fin[0])+4,y1=g.y(fin[1])+4;
   if(Math.abs(y0-y1)<14){const milieu=(y0+y1)/2,dessus=fin[0]>=fin[1]?0:1;y0=milieu+(dessus===0?-7:7);y1=milieu+(dessus===0?7:-7);}
   [[0,y0],[1,y1]].forEach(([i,y])=>{
    GR.el("text",{x:g.x(n)+8,y:Math.max(12,Math.min(H-4,y)),class:"sc-courbe-valeur","data-paire":i},arrivees).textContent=String(fin[i]);
   });
   // Repère du survol : trait vertical et les deux marqueurs au point visé
   repere=GR.el("g",{class:"sc-repere",visibility:"hidden","aria-hidden":"true"},svg);
   GR.el("line",{x1:0,x2:0,y1:m.haut,y2:yBas,class:"sc-guide"},repere);
   marqueur(repere,0,0,0,"sc-marque");marqueur(repere,1,0,0,"sc-marque b");
   bulle.hidden=true;
  }
  suivrePointeur(svg,x=>{
   if(!geo||!repere)return;
   const pasX=geo.x(1)-geo.x(0),k=Math.max(0,Math.min(n,Math.round((x-geo.x(0))/pasX)));
   const cx=geo.x(k),ya=geo.y(cumul[0][k]),yb=geo.y(cumul[1][k]);
   repere.setAttribute("visibility","visible");
   const [ligne,rond,carre]=repere.children;
   ligne.setAttribute("x1",cx);ligne.setAttribute("x2",cx);
   rond.setAttribute("cx",cx);rond.setAttribute("cy",ya);carre.setAttribute("x",cx-4);carre.setAttribute("y",yb-4);
   bulle.textContent=k===0?"Début du match":`Point ${k} : ${noms[0]} ${cumul[0][k]} · ${noms[1]} ${cumul[1][k]}`;
   bulle.hidden=false;
   GR.placerBulle(fig,svg,bulle,cx,Math.min(ya,yb)-4);
  },cacher);
  dessiner();
  const obs=GR.suivreLargeur(fig,lg=>{if(lg)dessiner();});if(obs)suivis.push(obs);
  bloc.appendChild(fig);
  return bloc;
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
