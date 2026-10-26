/* TOURNOIS : liste filtrable alimentée par assets/data/tournois.js (window.TOURNOIS_DATA).
   Aucune donnée n'est insérée avec innerHTML : tout passe par textContent. */
(function(){
 const racine=document.getElementById("tournois-app");
 if(!racine) return; // page sans bloc tournois : on ne fait rien
 const donnees=window.TOURNOIS_DATA;
 const messageVide=document.getElementById("tournois-vide");
 const contenu=document.getElementById("tournois-contenu");
 if(!donnees||!Array.isArray(donnees.tournois)){
  // Données absentes (fichier pas encore généré) : message clair, rien d'autre
  if(messageVide) messageVide.hidden=false;
  return;
 }
 if(messageVide) messageVide.hidden=true;
 contenu.hidden=false;

 const CLE_STOCKAGE="pa-tournois-filtres";
 const MOIS=["janv.","févr.","mars","avr.","mai","juin","juil.","août","sept.","oct.","nov.","déc."];
 const JOURS=["dim.","lun.","mar.","mer.","jeu.","ven.","sam."];
 const SEXES=[["messieurs","Messieurs"],["dames","Dames"],["mixte","Mixte"]];
 const tournois=donnees.tournois.filter(t=>t&&t.nom&&/^\d{4}-\d{2}-\d{2}$/.test(t.date_debut||""));

 // ----- Outils de dates (ISO AAAA-MM-JJ, comparables comme du texte) -----
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

 // ----- En-tête -----
 const titre=document.getElementById("tournois-titre");
 const rayon=donnees.rayon_km, origine=donnees.origine;
 titre.textContent="Tournois de padel"+(rayon?" à moins de "+rayon+" km":"")+(origine?" de "+origine:"");
 const maj=document.getElementById("tournois-maj");
 const dateGeneree=donnees.genere_le?new Date(donnees.genere_le):null;
 if(dateGeneree&&!isNaN(dateGeneree)) maj.textContent="Mis à jour le "+dateGeneree.toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"})+". ";
 const source=document.getElementById("tournois-source");
 if(donnees.source) source.textContent=donnees.source;

 // ----- Éléments du formulaire -----
 const formulaire=document.getElementById("tournois-filtres");
 const zoneCategories=document.getElementById("filtre-categories");
 const zoneSexes=document.getElementById("filtre-sexes");
 const selectDistance=document.getElementById("filtre-distance");
 const champDu=document.getElementById("filtre-du");
 const champAu=document.getElementById("filtre-au");
 const caseOuvertes=document.getElementById("filtre-ouvertes");
 const champRecherche=document.getElementById("filtre-texte");
 const boutonTri=document.getElementById("tournois-tri");
 const liste=document.getElementById("tournois-liste");
 const compteur=document.getElementById("tournois-compteur");
 const boutonReinit=document.getElementById("filtre-reinit");

 function creerCase(zone,nom,valeur,libelle){
  const label=document.createElement("label");label.className="tchip";
  const input=document.createElement("input");input.type="checkbox";input.name=nom;input.value=valeur;
  const span=document.createElement("span");span.textContent=libelle;
  label.append(input,span);zone.appendChild(label);
 }
 // Catégories construites depuis les données, triées par valeur numérique (P25 < P100 < ...)
 const ordreCategorie=c=>{const m=/^P(\d+)$/.exec(c);return m?+m[1]:1e9;};
 [...new Set(tournois.map(t=>t.categorie).filter(Boolean))]
  .sort((a,b)=>ordreCategorie(a)-ordreCategorie(b)||a.localeCompare(b))
  .forEach(c=>creerCase(zoneCategories,"categorie",c,c));
 if(!zoneCategories.children.length) zoneCategories.parentNode.hidden=true;
 SEXES.forEach(s=>creerCase(zoneSexes,"sexe",s[0],s[1]));
 const optionToutes=document.createElement("option");optionToutes.value="";optionToutes.textContent="Toutes distances";
 selectDistance.appendChild(optionToutes);
 [20,40,60,80].forEach(n=>{const o=document.createElement("option");o.value=String(n);o.textContent="Jusqu'à "+n+" km";selectDistance.appendChild(o);});

 // ----- État des filtres, avec mémorisation (confort uniquement) -----
 let ordreCroissant=true;
 const coches=zone=>[...zone.querySelectorAll("input:checked")].map(i=>i.value);
 function lireEtat(){
  return {categories:coches(zoneCategories),sexes:coches(zoneSexes),distance:selectDistance.value,du:champDu.value,au:champAu.value,
   ouvertes:caseOuvertes.checked,texte:champRecherche.value,croissant:ordreCroissant};
 }
 function appliquerEtat(etat){
  if(!etat||typeof etat!=="object") return;
  zoneCategories.querySelectorAll("input").forEach(i=>{i.checked=Array.isArray(etat.categories)&&etat.categories.includes(i.value);});
  zoneSexes.querySelectorAll("input").forEach(i=>{i.checked=Array.isArray(etat.sexes)&&etat.sexes.includes(i.value);});
  if([...selectDistance.options].some(o=>o.value===etat.distance)) selectDistance.value=etat.distance;
  champDu.value=/^\d{4}-\d{2}-\d{2}$/.test(etat.du||"")?etat.du:"";
  champAu.value=/^\d{4}-\d{2}-\d{2}$/.test(etat.au||"")?etat.au:"";
  caseOuvertes.checked=!!etat.ouvertes;
  champRecherche.value=typeof etat.texte==="string"?etat.texte:"";
  ordreCroissant=etat.croissant!==false;
 }
 try{ appliquerEtat(JSON.parse(localStorage.getItem(CLE_STOCKAGE)||"null")); }catch(e){}

 // ----- Filtrage et rendu -----
 function correspond(t,etat){
  if(etat.categories.length&&!etat.categories.includes(t.categorie)) return false;
  if(etat.sexes.length&&!etat.sexes.includes(t.sexe)) return false;
  if(etat.distance&&t.distance_km!=null&&t.distance_km>+etat.distance) return false;
  const fin=t.date_fin||t.date_debut;
  if(etat.du&&fin<etat.du) return false;
  if(etat.au&&t.date_debut>etat.au) return false;
  if(etat.ouvertes&&t.limite_inscription&&t.limite_inscription<aujourdhui) return false;
  const recherche=sansAccent(etat.texte.trim());
  if(recherche&&!sansAccent([t.nom,t.club,t.ville].filter(Boolean).join(" ")).includes(recherche)) return false;
  return true;
 }
 function ajouterTexte(parent,balise,classe,texte){
  const el=document.createElement(balise);if(classe) el.className=classe;el.textContent=texte;parent.appendChild(el);return el;
 }
 function creerCarte(t){
  const carte=document.createElement("article");carte.className="tcard";
  const haut=document.createElement("div");haut.className="tcard-top";
  ajouterTexte(haut,"h3","",t.nom);
  if(t.categorie) ajouterTexte(haut,"span","tbadge",t.categorie);
  carte.appendChild(haut);
  const lieu=[t.club,t.ville].filter(Boolean).join(" · ");
  if(lieu) ajouterTexte(carte,"p","tlieu",lieu);
  const infos=document.createElement("ul");infos.className="tinfos";
  ajouterTexte(infos,"li","",formaterPeriode(t.date_debut,t.date_fin));
  if(t.sexe) ajouterTexte(infos,"li","",t.sexe.charAt(0).toUpperCase()+t.sexe.slice(1));
  if(t.distance_km!=null) ajouterTexte(infos,"li","","à "+t.distance_km+" km");
  carte.appendChild(infos);
  if(t.limite_inscription){
   const reste=ecartJours(t.limite_inscription);
   if(reste<0) ajouterTexte(carte,"p","tlimite clos","Clôturé (inscriptions jusqu'au "+formaterJour(t.limite_inscription)+")");
   else if(reste<7) ajouterTexte(carte,"p","tlimite proche","Dernière ligne droite : inscriptions jusqu'au "+formaterJour(t.limite_inscription)+(reste===0?" (aujourd'hui)":reste===1?" (demain)":" (dans "+reste+" jours)"));
   else ajouterTexte(carte,"p","tlimite","Inscriptions jusqu'au "+formaterJour(t.limite_inscription));
  }
  if(t.lien&&/^https?:\/\//i.test(t.lien)){
   const lien=ajouterTexte(carte,"a","tlien","Voir sur Ten'Up");
   lien.href=t.lien;lien.target="_blank";lien.rel="noopener";
  }
  return carte;
 }
 function afficher(){
  const etat=lireEtat();
  const trouves=tournois.filter(t=>correspond(t,etat)).sort((a,b)=>(a.date_debut<b.date_debut?-1:a.date_debut>b.date_debut?1:0)*(etat.croissant?1:-1));
  liste.textContent="";
  trouves.forEach(t=>liste.appendChild(creerCarte(t)));
  compteur.textContent=trouves.length+" tournoi"+(trouves.length>1?"s":"");
  boutonTri.textContent=etat.croissant?"Date : les plus proches d'abord":"Date : les plus lointains d'abord";
  document.getElementById("tournois-aucun").hidden=trouves.length>0;
  try{ localStorage.setItem(CLE_STOCKAGE,JSON.stringify(etat)); }catch(e){}
 }

 formulaire.addEventListener("submit",e=>e.preventDefault()); // pas de soumission réelle
 formulaire.addEventListener("input",afficher);
 formulaire.addEventListener("change",afficher);
 boutonTri.addEventListener("click",()=>{ordreCroissant=!ordreCroissant;afficher();});
 boutonReinit.addEventListener("click",()=>{
  appliquerEtat({categories:[],sexes:[],distance:"",du:"",au:"",ouvertes:false,texte:"",croissant:true});
  afficher();
 });
 afficher();
})();
