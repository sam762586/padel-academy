/* TOURNOIS : tournois de padel de toute la France, avec choix de la zone.
   Données : assets/data/tournois.json (index léger, ~7 800 tournois), copie assets/data/tournois.js en file://.
   Détails : assets/data/fiches/<dep>.json (copie .js en file://), chargés à la demande par département.
   Zone : département exact, ville + rayon (autocomplétion IGN Géoplateforme) ou « autour de moi » (géolocalisation au clic).
   Aucune donnée (ni réponse de l'IGN) n'est insérée avec innerHTML : tout passe par textContent. */

// Départements (code + nom), embarqués ici comme les autres données du site
const TOURNOIS_DEPARTEMENTS=[
 ["01","Ain"],["02","Aisne"],["03","Allier"],["04","Alpes-de-Haute-Provence"],["05","Hautes-Alpes"],["06","Alpes-Maritimes"],["07","Ardèche"],["08","Ardennes"],["09","Ariège"],["10","Aube"],
 ["11","Aude"],["12","Aveyron"],["13","Bouches-du-Rhône"],["14","Calvados"],["15","Cantal"],["16","Charente"],["17","Charente-Maritime"],["18","Cher"],["19","Corrèze"],["2A","Corse-du-Sud"],
 ["2B","Haute-Corse"],["21","Côte-d'Or"],["22","Côtes-d'Armor"],["23","Creuse"],["24","Dordogne"],["25","Doubs"],["26","Drôme"],["27","Eure"],["28","Eure-et-Loir"],["29","Finistère"],
 ["30","Gard"],["31","Haute-Garonne"],["32","Gers"],["33","Gironde"],["34","Hérault"],["35","Ille-et-Vilaine"],["36","Indre"],["37","Indre-et-Loire"],["38","Isère"],["39","Jura"],
 ["40","Landes"],["41","Loir-et-Cher"],["42","Loire"],["43","Haute-Loire"],["44","Loire-Atlantique"],["45","Loiret"],["46","Lot"],["47","Lot-et-Garonne"],["48","Lozère"],["49","Maine-et-Loire"],
 ["50","Manche"],["51","Marne"],["52","Haute-Marne"],["53","Mayenne"],["54","Meurthe-et-Moselle"],["55","Meuse"],["56","Morbihan"],["57","Moselle"],["58","Nièvre"],["59","Nord"],
 ["60","Oise"],["61","Orne"],["62","Pas-de-Calais"],["63","Puy-de-Dôme"],["64","Pyrénées-Atlantiques"],["65","Hautes-Pyrénées"],["66","Pyrénées-Orientales"],["67","Bas-Rhin"],["68","Haut-Rhin"],["69","Rhône"],
 ["70","Haute-Saône"],["71","Saône-et-Loire"],["72","Sarthe"],["73","Savoie"],["74","Haute-Savoie"],["75","Paris"],["76","Seine-Maritime"],["77","Seine-et-Marne"],["78","Yvelines"],["79","Deux-Sèvres"],
 ["80","Somme"],["81","Tarn"],["82","Tarn-et-Garonne"],["83","Var"],["84","Vaucluse"],["85","Vendée"],["86","Vienne"],["87","Haute-Vienne"],["88","Vosges"],["89","Yonne"],
 ["90","Territoire de Belfort"],["91","Essonne"],["92","Hauts-de-Seine"],["93","Seine-Saint-Denis"],["94","Val-de-Marne"],["95","Val-d'Oise"],
 ["971","Guadeloupe"],["972","Martinique"],["973","Guyane"],["974","La Réunion"],["976","Mayotte"]
];

(function(){
 const racine=document.getElementById("tournois-app");
 if(!racine) return; // page sans bloc tournois : on ne fait rien
 const messageVide=document.getElementById("tournois-vide");
 const vide=()=>{if(messageVide) messageVide.hidden=false;};
 const enHttp=/^https?:$/.test(location.protocol);

 // Injection d'un <script> de données (seul moyen de charger un fichier en file://)
 function chargerScript(url){
  return new Promise((resolve,reject)=>{
   const s=document.createElement("script");s.src=url;
   s.onload=resolve;s.onerror=()=>reject(new Error("script"));
   document.body.appendChild(s);
  });
 }
 function repliScript(){
  chargerScript("assets/data/tournois.js").then(()=>window.TOURNOIS_DATA?demarrer(window.TOURNOIS_DATA):vide()).catch(vide);
 }
 if(enHttp){
  fetch("assets/data/tournois.json",{cache:"no-cache"}).then(r=>{if(!r.ok) throw new Error(r.status);return r.json();})
   .then(demarrer).catch(repliScript);
 } else repliScript();

function demarrer(donnees){
 const contenu=document.getElementById("tournois-contenu");
 if(!donnees||!Array.isArray(donnees.tournois)){ vide(); return; }
 try{ initialiser(donnees,contenu); }catch(e){ vide(); }
}

function initialiser(donnees,contenu){
 if(messageVide) messageVide.hidden=true;
 contenu.hidden=false;

 const CLE_STOCKAGE="pa-tournois-filtres";
 const PAGE=50; // nombre de cartes ajoutées à chaque « Voir plus »
 const URL_IGN="https://data.geopf.fr/geocodage/search";
 const MOIS=["janv.","févr.","mars","avr.","mai","juin","juil.","août","sept.","oct.","nov.","déc."];
 const JOURS=["dim.","lun.","mar.","mer.","jeu.","ven.","sam."];
 const SEXES=[["messieurs","Messieurs"],["dames","Dames"],["mixte","Mixte"]];
 const tournois=donnees.tournois.filter(t=>t&&t.nom&&/^\d{4}-\d{2}-\d{2}$/.test(t.date_debut||""));
 // Sexe : liste « sexes » (une entrée par épreuve), ou ancien champ « sexe »
 const sexesDe=t=>Array.isArray(t.sexes)?t.sexes:(t.sexe?[t.sexe]:[]);

 // ----- Dates (ISO AAAA-MM-JJ, comparables comme du texte) -----
 const dateLocale=iso=>{const p=iso.split("-");return new Date(+p[0],+p[1]-1,+p[2]);};
 const versIso=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
 const aujourdhui=versIso(new Date());
 const anneeCourante=new Date().getFullYear();
 const ecartJours=iso=>Math.round((dateLocale(iso)-dateLocale(aujourdhui))/86400000);
 function formaterPeriode(debut,fin){
  const d=dateLocale(debut);
  if(!fin||fin===debut){
   return JOURS[d.getDay()]+" "+d.getDate()+" "+MOIS[d.getMonth()]+(d.getFullYear()!==anneeCourante?" "+d.getFullYear():"");
  }
  const f=dateLocale(fin);
  const fin_txt=f.getDate()+" "+MOIS[f.getMonth()]+" "+f.getFullYear();
  if(d.getMonth()===f.getMonth()&&d.getFullYear()===f.getFullYear()) return d.getDate()+"–"+fin_txt;
  const debut_txt=d.getDate()+" "+MOIS[d.getMonth()]+(d.getFullYear()!==f.getFullYear()?" "+d.getFullYear():"");
  return debut_txt+" – "+fin_txt;
 }
 const formaterJour=iso=>{const d=dateLocale(iso);return d.getDate()+" "+MOIS[d.getMonth()]+(d.getFullYear()!==anneeCourante?" "+d.getFullYear():"");};
 const sansAccent=s=>String(s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"");
 const majuscule=s=>s.charAt(0).toUpperCase()+s.slice(1);

 // Distance à vol d'oiseau (haversine), en km
 function distanceKm(lat1,lng1,lat2,lng2){
  const r=Math.PI/180,a=Math.sin((lat2-lat1)*r/2)**2+Math.cos(lat1*r)*Math.cos(lat2*r)*Math.sin((lng2-lng1)*r/2)**2;
  return 2*6371*Math.asin(Math.sqrt(a));
 }
 const aPosition=t=>typeof t.lat==="number"&&typeof t.lng==="number";

 // ----- En-tête -----
 const maj=document.getElementById("tournois-maj");
 const dateGeneree=donnees.genere_le?new Date(donnees.genere_le):null;
 let texteMaj="";
 if(dateGeneree&&!isNaN(dateGeneree)) texteMaj+="Mis à jour le "+dateGeneree.toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"})+". ";
 if(donnees.periode&&donnees.periode.du&&donnees.periode.au&&/^\d{4}-/.test(donnees.periode.du)&&/^\d{4}-/.test(donnees.periode.au)) texteMaj+="Tournois du "+formaterJour(donnees.periode.du)+" au "+formaterJour(donnees.periode.au)+". ";
 maj.textContent=texteMaj;
 if(donnees.source) document.getElementById("tournois-source").textContent=donnees.source;

 // ----- Éléments -----
 const formulaire=document.getElementById("tournois-filtres");
 const zoneCategories=document.getElementById("filtre-categories");
 const zoneSexes=document.getElementById("filtre-sexes");
 const champDu=document.getElementById("filtre-du");
 const champAu=document.getElementById("filtre-au");
 const caseOuvertes=document.getElementById("filtre-ouvertes");
 const champRecherche=document.getElementById("filtre-texte");
 const boutonTri=document.getElementById("tournois-tri");
 const boutonTriDistance=document.getElementById("tournois-tri-distance");
 const liste=document.getElementById("tournois-liste");
 const compteur=document.getElementById("tournois-compteur");
 const detailCompteur=document.getElementById("tournois-detail");
 const boutonReinit=document.getElementById("filtre-reinit");
 const boutonPlus=document.getElementById("tournois-plus");
 const messageAucun=document.getElementById("tournois-aucun");
 const selectDep=document.getElementById("zone-dep");
 const champVille=document.getElementById("zone-ville");
 const listeSuggestions=document.getElementById("zone-suggestions");
 const curseurRayon=document.getElementById("zone-rayon");
 const sortieRayon=document.getElementById("zone-rayon-val");
 const boutonMoi=document.getElementById("zone-moi");
 const messageZone=document.getElementById("zone-msg");
 const panneaux={dep:document.getElementById("zone-panneau-dep"),ville:document.getElementById("zone-panneau-ville"),moi:document.getElementById("zone-panneau-moi")};
 const panneauRayon=document.getElementById("zone-panneau-rayon");

 function creerCase(zone,nom,valeur,libelle){
  const label=document.createElement("label");label.className="tchip";
  const input=document.createElement("input");input.type="checkbox";input.name=nom;input.value=valeur;
  const span=document.createElement("span");span.textContent=libelle;
  label.append(input,span);zone.appendChild(label);
 }
 // Catégories construites depuis les données, triées par valeur numérique (P25 < P100 < ... < P3000)
 const ordreCategorie=c=>{const m=/^P(\d+)$/.exec(c);return m?+m[1]:1e9;};
 [...new Set(tournois.map(t=>t.categorie).filter(Boolean))]
  .sort((a,b)=>ordreCategorie(a)-ordreCategorie(b)||a.localeCompare(b))
  .forEach(c=>creerCase(zoneCategories,"categorie",c,c));
 if(!zoneCategories.children.length) zoneCategories.parentNode.hidden=true;
 SEXES.forEach(s=>creerCase(zoneSexes,"sexe",s[0],s[1]));
 if(!tournois.some(t=>t.limite_inscription)) caseOuvertes.closest("label").style.display="none";
 // Départements présents dans les données, en tête de liste de choix
 const optionTous=document.createElement("option");optionTous.value="";optionTous.textContent="Tous les départements";selectDep.appendChild(optionTous);
 TOURNOIS_DEPARTEMENTS.forEach(d=>{const o=document.createElement("option");o.value=d[0];o.textContent=d[0]+" · "+d[1];selectDep.appendChild(o);});

 // ----- État (mémorisé en localStorage, confort uniquement) -----
 // zone : {mode:"france"|"dep"|"ville"|"moi", dep, ville:{label,lat,lng}|null, rayon}
 // La position « autour de moi » n'est JAMAIS mémorisée : elle reste en mémoire le temps de la visite.
 let ordreCroissant=true, tri="date";
 let zone={mode:"france",dep:"",ville:null,rayon:50};
 let positionMoi=null;
 const coches=z=>[...z.querySelectorAll("input:checked")].map(i=>i.value);
 const modeCourant=()=>(document.querySelector("input[name=zone-mode]:checked")||{}).value||"france";
 function lireEtat(){
  return {categories:coches(zoneCategories),sexes:coches(zoneSexes),du:champDu.value,au:champAu.value,
   ouvertes:caseOuvertes.checked,texte:champRecherche.value,croissant:ordreCroissant,tri:tri,
   zone:{mode:zone.mode,dep:zone.dep,ville:zone.ville,rayon:zone.rayon}};
 }
 const dateValide=v=>/^\d{4}-\d{2}-\d{2}$/.test(v||"")?v:"";
 function appliquerEtat(etat){
  if(!etat||typeof etat!=="object") return;
  zoneCategories.querySelectorAll("input").forEach(i=>{i.checked=Array.isArray(etat.categories)&&etat.categories.includes(i.value);});
  zoneSexes.querySelectorAll("input").forEach(i=>{i.checked=Array.isArray(etat.sexes)&&etat.sexes.includes(i.value);});
  champDu.value=dateValide(etat.du);champAu.value=dateValide(etat.au);
  caseOuvertes.checked=!!etat.ouvertes;
  champRecherche.value=typeof etat.texte==="string"?etat.texte:"";
  ordreCroissant=etat.croissant!==false;
  tri=etat.tri==="distance"?"distance":"date";
  const z=etat.zone;
  if(z&&typeof z==="object"){
   zone.mode=["france","dep","ville","moi"].includes(z.mode)?z.mode:"france";
   zone.dep=TOURNOIS_DEPARTEMENTS.some(d=>d[0]===z.dep)?z.dep:"";
   zone.rayon=Math.min(200,Math.max(10,Math.round(+z.rayon)||50));
   const v=z.ville;
   zone.ville=v&&typeof v.label==="string"&&isFinite(v.lat)&&isFinite(v.lng)?{label:v.label,lat:+v.lat,lng:+v.lng}:null;
  }
 }
 try{ appliquerEtat(JSON.parse(localStorage.getItem(CLE_STOCKAGE)||"null")); }catch(e){}
 function synchroniserZoneVersFormulaire(){
  const radio=document.querySelector("input[name=zone-mode][value="+zone.mode+"]");
  if(radio) radio.checked=true;
  selectDep.value=zone.dep;
  curseurRayon.value=String(zone.rayon);sortieRayon.textContent=zone.rayon+" km";
  champVille.value=zone.ville?zone.ville.label:"";
  panneaux.dep.hidden=zone.mode!=="dep";
  panneaux.ville.hidden=zone.mode!=="ville";
  panneaux.moi.hidden=zone.mode!=="moi";
  panneauRayon.hidden=!(zone.mode==="ville"||zone.mode==="moi");
 }
 synchroniserZoneVersFormulaire();

 // Point de référence actuel (ou null)
 function pointDeReference(){
  if(zone.mode==="ville"&&zone.ville) return {lat:zone.ville.lat,lng:zone.ville.lng};
  if(zone.mode==="moi"&&positionMoi) return positionMoi;
  return null;
 }

 // ----- Fiches détaillées par département (chargées à la demande, mises en cache) -----
 const fiches={};      // dep -> objet des fiches, ou null si indisponible
 const enAttente={};   // dep -> promesse en cours
 function chargerFiches(dep){
  if(!/^[0-9AB]{2,3}$/.test(dep)) return Promise.resolve(null);
  if(dep in fiches) return Promise.resolve(fiches[dep]);
  if(enAttente[dep]) return enAttente[dep];
  const fin=obj=>{fiches[dep]=obj;delete enAttente[dep];return obj;};
  const depuisScript=()=>chargerScript("assets/data/fiches/"+dep+".js").then(()=>fin((window.TOURNOIS_FICHES||{})[dep]||null)).catch(()=>fin(null));
  enAttente[dep]=enHttp
   ?fetch("assets/data/fiches/"+dep+".json").then(r=>{if(!r.ok) throw new Error(r.status);return r.json();}).then(fin).catch(()=>fin(null))
   :depuisScript();
  return enAttente[dep];
 }

 // ----- Cartes -----
 function ajouterTexte(parent,balise,classe,texte){
  const el=document.createElement(balise);if(classe) el.className=classe;el.textContent=texte;parent.appendChild(el);return el;
 }
 const prixFr=n=>n.toLocaleString("fr-FR",{minimumFractionDigits:0,maximumFractionDigits:2});
 function lienFiche(t){
  if(/^\d+$/.test(String(t.id||""))) return "https://tenup.fft.fr/tournoi/"+t.id;
  return t.lien&&/^https?:\/\//i.test(t.lien)?t.lien:null;
 }
 function creerCarte(t){
  const carte=document.createElement("article");carte.className="tcard";carte.dataset.id=String(t.id||"");
  const haut=document.createElement("div");haut.className="tcard-top";
  ajouterTexte(haut,"h3","",t.nom);
  if(t.categorie) ajouterTexte(haut,"span","tbadge",t.categorie);
  carte.appendChild(haut);
  const lieu=[t.club,t.ville].filter(Boolean).join(" · ");
  if(lieu) ajouterTexte(carte,"p","tlieu",lieu+(t.dep?" ("+t.dep+")":""));
  const infos=document.createElement("ul");infos.className="tinfos";
  ajouterTexte(infos,"li","",formaterPeriode(t.date_debut,t.date_fin));
  const sx=sexesDe(t);
  if(sx.length) ajouterTexte(infos,"li","",majuscule(sx.join(" / ")));
  if(typeof t.distance_km==="number") ajouterTexte(infos,"li","tdist","à "+Math.round(t.distance_km)+" km");
  carte.appendChild(infos);
  const plus=document.createElement("div");plus.className="tplus";carte.appendChild(plus);
  if(t.limite_inscription){
   const reste=ecartJours(t.limite_inscription);
   if(reste<0) ajouterTexte(carte,"p","tlimite clos","Clôturé (inscriptions jusqu'au "+formaterJour(t.limite_inscription)+")");
   else if(reste<7) ajouterTexte(carte,"p","tlimite proche","Dernière ligne droite : inscriptions jusqu'au "+formaterJour(t.limite_inscription)+(reste===0?" (aujourd'hui)":reste===1?" (demain)":" (dans "+reste+" jours)"));
   else ajouterTexte(carte,"p","tlimite","Inscriptions jusqu'au "+formaterJour(t.limite_inscription));
  }
  const url=lienFiche(t);
  if(url){
   const lien=ajouterTexte(carte,"a","tlien","Voir sur Ten'Up");
   lien.href=url;lien.target="_blank";lien.rel="noopener";
  }
  return carte;
 }
 // Enrichit une carte avec la fiche du tournoi (tarif, places, cut, adresse, commentaire...)
 function enrichirCarte(carte,fiche){
  const zonePlus=carte.querySelector(".tplus");
  if(!zonePlus||zonePlus.dataset.rempli||!fiche) return;
  zonePlus.dataset.rempli="1";
  const epreuves=Array.isArray(fiche.epreuves)?fiche.epreuves:[];
  const infos=[];
  const tarifs=epreuves.map(e=>e&&e.tarif).filter(v=>typeof v==="number");
  if(tarifs.length) infos.push(prixFr(Math.min(...tarifs))+" € par joueur"+(Math.max(...tarifs)!==Math.min(...tarifs)?" (dès)":""));
  const tableaux=epreuves.map(e=>e&&e.tableau).filter(v=>typeof v==="number"&&v>0);
  if(tableaux.length) infos.push(Math.max(...tableaux)+" places");
  if(infos.length){const ul=document.createElement("ul");ul.className="tinfos";infos.forEach(i=>ajouterTexte(ul,"li","",i));zonePlus.appendChild(ul);}
  const cuts=[...new Set(epreuves.map(e=>e&&e.cut).filter(Boolean))];
  if(cuts.length) ajouterTexte(zonePlus,"p","tlimite",cuts.join(" · "));
  if(fiche.adresse) ajouterTexte(zonePlus,"p","tlieu",String(fiche.adresse));
  if(fiche.horaires) ajouterTexte(zonePlus,"p","tlieu","Horaires : "+fiche.horaires);
  if(fiche.balles) ajouterTexte(zonePlus,"p","tlieu","Balles : "+fiche.balles);
  if(fiche.commentaire){const c=String(fiche.commentaire);ajouterTexte(zonePlus,"p","tlieu",c.length>180?c.slice(0,177)+"…":c);}
 }
 // Charge les fiches des départements des cartes données, puis enrichit les cartes
 function enrichirCartes(cartes){
  const parDep={};
  cartes.forEach(c=>{const t=parId.get(c.dataset.id);if(t&&t.dep) (parDep[t.dep]=parDep[t.dep]||[]).push(c);});
  Object.keys(parDep).forEach(dep=>{
   chargerFiches(dep).then(f=>{
    if(!f) return;
    parDep[dep].forEach(c=>{if(c.isConnected) enrichirCarte(c,f[c.dataset.id]);});
   });
  });
 }
 const parId=new Map(tournois.map(t=>[String(t.id||""),t]));

 // ----- Filtrage, tri, rendu paginé -----
 let resultats=[], affiches=0;
 function correspond(t,etat,point){
  if(etat.categories.length&&!etat.categories.includes(t.categorie)) return false;
  if(etat.sexes.length&&!sexesDe(t).some(s=>etat.sexes.includes(s))) return false;
  const fin=t.date_fin||t.date_debut;
  if(etat.du&&fin<etat.du) return false;
  if(etat.au&&t.date_debut>etat.au) return false;
  if(etat.ouvertes&&t.limite_inscription&&t.limite_inscription<aujourdhui) return false;
  if(zone.mode==="dep"&&zone.dep&&t.dep!==zone.dep) return false;
  if(point&&(typeof t.distance_km!=="number"||t.distance_km>zone.rayon)) return false;
  if(recherche){
   if(t._r===undefined) t._r=sansAccent([t.nom,t.club,t.ville].filter(Boolean).join(" "));
   if(!t._r.includes(recherche)) return false;
  }
  return true;
 }
 let recherche="";
 function afficher(){
  const etat=lireEtat();
  recherche=sansAccent(etat.texte.trim());
  const point=pointDeReference();
  let sansPosition=0;
  // Distance de chaque tournoi au point choisi (null si pas de point ou pas de coordonnées)
  tournois.forEach(t=>{t.distance_km=point&&aPosition(t)?distanceKm(point.lat,point.lng,t.lat,t.lng):null;});
  if(point) sansPosition=tournois.filter(t=>!aPosition(t)).length;
  if(tri==="distance"&&!point) tri="date";
  resultats=tournois.filter(t=>correspond(t,etat,point));
  const sens=etat.croissant?1:-1;
  if(tri==="distance") resultats.sort((a,b)=>a.distance_km-b.distance_km||(a.date_debut<b.date_debut?-1:1));
  else resultats.sort((a,b)=>(a.date_debut<b.date_debut?-1:a.date_debut>b.date_debut?1:0)*sens);
  liste.textContent="";affiches=0;
  ajouterCartes();
  compteur.textContent=resultats.length.toLocaleString("fr-FR")+" tournoi"+(resultats.length>1?"s":"");
  detailCompteur.textContent=point&&sansPosition?sansPosition.toLocaleString("fr-FR")+" tournoi"+(sansPosition>1?"s":"")+" sans position connue "+(sansPosition>1?"ne sont":"n'est")+" pas pris en compte pour la distance.":"";
  detailCompteur.hidden=!detailCompteur.textContent;
  boutonTri.textContent=tri==="date"?(etat.croissant?"Date : les plus proches d'abord":"Date : les plus lointains d'abord"):"Trier par date";
  boutonTri.setAttribute("aria-pressed",String(tri==="date"));
  boutonTriDistance.hidden=!point;
  boutonTriDistance.setAttribute("aria-pressed",String(tri==="distance"));
  messageAucun.hidden=resultats.length>0;
  try{ localStorage.setItem(CLE_STOCKAGE,JSON.stringify(lireEtat())); }catch(e){}
 }
 // Ajoute la page suivante de cartes (50 à la fois)
 function ajouterCartes(){
  const fragment=document.createDocumentFragment();
  const nouvelles=[];
  resultats.slice(affiches,affiches+PAGE).forEach(t=>{const c=creerCarte(t);fragment.appendChild(c);nouvelles.push(c);});
  affiches=Math.min(resultats.length,affiches+PAGE);
  liste.appendChild(fragment);
  const restants=resultats.length-affiches;
  boutonPlus.hidden=restants<=0;
  boutonPlus.textContent="Voir plus ("+restants.toLocaleString("fr-FR")+" restant"+(restants>1?"s":"")+")";
  enrichirCartes(nouvelles);
 }

 // ----- Zone : messages, départements, ville (IGN), géolocalisation -----
 function messageDeZone(texte,erreur){
  messageZone.hidden=!texte;messageZone.textContent=texte||"";
  messageZone.classList.toggle("acc-err",!!erreur);
 }
 function changerMode(mode){
  zone.mode=mode;
  synchroniserZoneVersFormulaire();
  messageDeZone("",false);
  if(mode==="moi"&&!positionMoi) messageDeZone("Clique sur « Me localiser » pour trouver les tournois autour de toi.",false);
  if(mode==="ville"&&!zone.ville) messageDeZone("Commence à taper le nom d'une ville (3 lettres minimum).",false);
  afficher();
 }
 document.querySelectorAll("input[name=zone-mode]").forEach(r=>r.addEventListener("change",()=>changerMode(r.value)));
 selectDep.addEventListener("change",()=>{zone.dep=selectDep.value;afficher();});
 curseurRayon.addEventListener("input",()=>{zone.rayon=+curseurRayon.value;sortieRayon.textContent=zone.rayon+" km";afficher();});

 // Autocomplétion des communes (API Géoplateforme de l'IGN), debounce 300 ms, 3 caractères minimum
 let minuterie=null, requeteIgn=null;
 function fermerSuggestions(){listeSuggestions.hidden=true;listeSuggestions.textContent="";champVille.setAttribute("aria-expanded","false");}
 function afficherSuggestions(features){
  listeSuggestions.textContent="";
  features.forEach(f=>{
   const p=f&&f.properties,g=f&&f.geometry&&f.geometry.coordinates;
   if(!p||!g||!isFinite(g[0])||!isFinite(g[1])) return;
   const li=document.createElement("li");
   const bouton=document.createElement("button");bouton.type="button";
   bouton.textContent=String(p.label||p.city||"")+(p.postcode?" ("+p.postcode+")":"");
   bouton.addEventListener("click",()=>{
    zone.ville={label:bouton.textContent,lat:+g[1],lng:+g[0]};
    champVille.value=zone.ville.label;fermerSuggestions();messageDeZone("",false);afficher();
   });
   li.appendChild(bouton);listeSuggestions.appendChild(li);
  });
  const ok=listeSuggestions.children.length>0;
  listeSuggestions.hidden=!ok;champVille.setAttribute("aria-expanded",String(ok));
  if(!ok) messageDeZone("Aucune commune trouvée. Vérifie l'orthographe.",false);
 }
 async function chercherVille(texte){
  if(requeteIgn) requeteIgn.abort();
  requeteIgn=typeof AbortController==="function"?new AbortController():null;
  messageDeZone("Recherche…",false);
  try{
   const reponse=await fetch(URL_IGN+"?q="+encodeURIComponent(texte)+"&type=municipality&autocomplete=1&limit=6",requeteIgn?{signal:requeteIgn.signal}:undefined);
   if(!reponse.ok) throw new Error(reponse.status);
   const json=await reponse.json();
   messageDeZone("",false);
   afficherSuggestions(Array.isArray(json.features)?json.features:[]);
  }catch(e){
   if(e&&e.name==="AbortError") return;
   fermerSuggestions();
   messageDeZone("La recherche de ville ne répond pas pour le moment. Tu peux utiliser le mode « Département » en attendant.",true);
  }
 }
 champVille.addEventListener("input",()=>{
  clearTimeout(minuterie);
  const texte=champVille.value.trim();
  if(zone.ville&&texte!==zone.ville.label){zone.ville=null;afficher();}
  if(texte.length<3){fermerSuggestions();if(requeteIgn) requeteIgn.abort();messageDeZone(texte?"Tape au moins 3 lettres.":"",false);return;}
  minuterie=setTimeout(()=>chercherVille(texte),300);
 });
 champVille.addEventListener("keydown",e=>{
  if(e.key==="Escape") fermerSuggestions();
  if(e.key==="ArrowDown"&&!listeSuggestions.hidden){e.preventDefault();const b=listeSuggestions.querySelector("button");if(b) b.focus();}
  if(e.key==="Enter") e.preventDefault();
 });
 listeSuggestions.addEventListener("keydown",e=>{
  const boutons=[...listeSuggestions.querySelectorAll("button")],i=boutons.indexOf(document.activeElement);
  if(e.key==="ArrowDown"&&boutons[i+1]){e.preventDefault();boutons[i+1].focus();}
  if(e.key==="ArrowUp"){e.preventDefault();(boutons[i-1]||champVille).focus();}
  if(e.key==="Escape"){fermerSuggestions();champVille.focus();}
 });
 document.addEventListener("click",e=>{if(!e.target.closest(".tville")) fermerSuggestions();});

 // Géolocalisation : seulement au clic, position gardée en mémoire (jamais stockée ni envoyée)
 boutonMoi.addEventListener("click",()=>{
  if(!navigator.geolocation){messageDeZone("La localisation n'est pas disponible sur cet appareil. Choisis un département ou une ville.",true);return;}
  boutonMoi.disabled=true;messageDeZone("Localisation en cours…",false);
  navigator.geolocation.getCurrentPosition(pos=>{
   boutonMoi.disabled=false;
   positionMoi={lat:pos.coords.latitude,lng:pos.coords.longitude};
   messageDeZone("Position trouvée. Elle reste dans ton navigateur.",false);
   afficher();
  },err=>{
   boutonMoi.disabled=false;
   messageDeZone(err&&err.code===1
    ?"Tu as refusé la localisation. Pas de souci : choisis un département ou une ville à la place."
    :"Impossible de te localiser pour le moment. Choisis un département ou une ville à la place.",true);
  },{timeout:10000,maximumAge:600000});
 });

 // ----- Événements généraux -----
 let minuterieTexte=null;
 formulaire.addEventListener("submit",e=>e.preventDefault()); // pas de soumission réelle
 formulaire.addEventListener("change",e=>{if(e.target.closest(".tzone")) return;afficher();});
 champRecherche.addEventListener("input",()=>{clearTimeout(minuterieTexte);minuterieTexte=setTimeout(afficher,150);});
 [champDu,champAu].forEach(c=>c.addEventListener("input",afficher));
 boutonTri.addEventListener("click",()=>{if(tri==="date") ordreCroissant=!ordreCroissant;else tri="date";afficher();});
 boutonTriDistance.addEventListener("click",()=>{tri="distance";afficher();});
 boutonPlus.addEventListener("click",ajouterCartes);
 boutonReinit.addEventListener("click",()=>{
  appliquerEtat({categories:[],sexes:[],du:"",au:"",ouvertes:false,texte:"",croissant:true,tri:"date",zone:{mode:"france",dep:"",ville:null,rayon:50}});
  positionMoi=null;fermerSuggestions();messageDeZone("",false);
  synchroniserZoneVersFormulaire();afficher();
 });
 if(zone.mode==="moi") messageDeZone("Clique sur « Me localiser » pour trouver les tournois autour de toi.",false);
 afficher();
}
})();
