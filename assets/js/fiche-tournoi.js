/* FICHE TOURNOI (pages générées tournoi/<id>.html)
   Distance « depuis chez toi » : position enregistrée au clic (géolocalisation, gardée sur l'appareil),
   sinon centre du département mémorisé. Export calendrier via favoris.js (PA_FAVORIS.telechargerIcs).
   Les données du tournoi sont dans <script type="application/json" id="tournoi-donnees">. */
const FT_CLE_POSITION="pa-ma-position";      // {lat,lng,maj} : position obtenue au clic
const FT_CLE_DEPARTEMENT="pa-mon-departement"; // "76" : département choisi sur le site

(function(){
 const bloc=document.getElementById("tournoi-donnees");
 if(!bloc)return;
 let t=null;try{t=JSON.parse(bloc.textContent);}catch(e){return;}
 const $=id=>document.getElementById(id);
 const zoneDistance=$("ft-distance"),message=$("ft-message"),boutonPosition=$("ft-position");
 function lire(cle){try{return JSON.parse(localStorage.getItem(cle)||"null");}catch(e){return null;}}
 function info(texte,erreur){message.textContent=texte||"";message.hidden=!texte;message.classList.toggle("acc-err",!!erreur);}
 function distanceKm(a,b){
  const r=Math.PI/180,h=Math.sin((b[0]-a[0])*r/2)**2+Math.cos(a[0]*r)*Math.cos(b[0]*r)*Math.sin((b[1]-a[1])*r/2)**2;
  return 2*6371*Math.asin(Math.sqrt(h));
 }
 // Point de départ : position précise, sinon centre du département mémorisé
 function depart(){
  const p=lire(FT_CLE_POSITION);
  if(p&&typeof p.lat==="number"&&typeof p.lng==="number")return {coord:[p.lat,p.lng],texte:"de ta position"};
  let dep=null;try{dep=localStorage.getItem(FT_CLE_DEPARTEMENT);}catch(e){}
  const pages=window.PA_PAGES_TOURNOIS;
  if(dep&&pages&&pages.centres&&pages.centres[dep])return {coord:pages.centres[dep],texte:"du centre "+(pages.noms&&pages.noms[dep]?"de ton département ("+pages.noms[dep]+")":"de ton département"),approx:true};
  return null;
 }
 function afficherDistance(){
  if(typeof t.lat!=="number"||typeof t.lng!=="number"){boutonPosition.hidden=true;return;}
  const d=depart();
  if(!d){zoneDistance.hidden=true;return;}
  const km=distanceKm(d.coord,[t.lat,t.lng]);
  zoneDistance.textContent="";
  const chiffre=document.createElement("b");chiffre.textContent=(km<10?km.toFixed(1).replace(".",","):Math.round(km))+" km";
  zoneDistance.append(chiffre,` à vol d'oiseau ${d.texte}`);
  zoneDistance.hidden=false;
  boutonPosition.textContent=d.approx?"Distance précise depuis chez moi":"Mettre à jour ma position";
 }
 boutonPosition.addEventListener("click",()=>{
  if(!("geolocation" in navigator)){info("Ton navigateur ne permet pas la localisation.",true);return;}
  boutonPosition.disabled=true;info("Recherche de ta position…");
  navigator.geolocation.getCurrentPosition(pos=>{
   boutonPosition.disabled=false;
   try{localStorage.setItem(FT_CLE_POSITION,JSON.stringify({lat:+pos.coords.latitude.toFixed(3),lng:+pos.coords.longitude.toFixed(3),maj:new Date().toISOString()}));}catch(e){}
   info("Position trouvée. Elle reste sur cet appareil et sert uniquement à calculer les distances.");
   afficherDistance();
  },err=>{
   boutonPosition.disabled=false;
   info(err&&err.code===1?"Tu as refusé la localisation : pas de souci, la distance ne s'affichera pas.":"Impossible de te localiser pour le moment.",true);
  },{timeout:10000,maximumAge:600000});
 });
 $("ft-calendrier").addEventListener("click",()=>{
  const fav=window.PA_FAVORIS;
  if(!fav||!fav.telechargerIcs(t,t.adresse?{adresse:t.adresse}:null))info("Impossible de créer le fichier calendrier.",true);
 });
 afficherDistance();
})();
