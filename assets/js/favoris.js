/* FAVORIS TOURNOIS (tournois.html, compte.html) + export calendrier (.ics)
   Les favoris sont gardés sur l'appareil (clé pa-tournois-favoris : tableau d'identifiants Ten'Up).
   Connecté, ils sont aussi enregistrés dans le compte (table favoris). Les changements faits sans réseau
   restent dans une file d'attente (pa-tournois-favoris-attente) : un favori retiré hors connexion
   n'est donc pas remis par la synchronisation suivante. */
const FAV_CLE="pa-tournois-favoris";
const FAV_CLE_ATTENTE="pa-tournois-favoris-attente";
const FAV_MAX=200;
const FAV_ID_VALIDE=/^[0-9A-Za-z_-]{1,20}$/;

(function(){
 const ecouteurs=[];
 function lire(cle,defaut){try{const v=JSON.parse(localStorage.getItem(cle)||"null");return v===null?defaut:v;}catch(e){return defaut;}}
 function ecrire(cle,v){try{localStorage.setItem(cle,JSON.stringify(v));return true;}catch(e){return false;}}
 const nettoyer=liste=>Array.isArray(liste)?[...new Set(liste.map(String).filter(x=>FAV_ID_VALIDE.test(x)))].slice(0,FAV_MAX):[];
 let ids=nettoyer(lire(FAV_CLE,[]));
 // File d'attente des changements pas encore envoyés au compte : { id: true (ajout) | false (retrait) }
 let attente=(()=>{const a=lire(FAV_CLE_ATTENTE,{});const p={};if(a&&typeof a==="object")Object.keys(a).forEach(k=>{if(FAV_ID_VALIDE.test(k)&&typeof a[k]==="boolean")p[k]=a[k];});return p;})();
 let message={texte:"",erreur:false};
 function sauver(){
  if(!ecrire(FAV_CLE,ids)||!ecrire(FAV_CLE_ATTENTE,attente))message={texte:"Le stockage de cet appareil est indisponible : tes favoris seront perdus à la fermeture de la page.",erreur:true};
 }
 function prevenir(){ecouteurs.slice().forEach(f=>{try{f(ids.slice(),message);}catch(e){}});}

 const compte=()=>window.PA_COMPTE;
 const connecte=()=>{const c=compte();return !!(c&&c.actif&&c.user&&typeof c.loadFavoris==="function");};

 /* Synchronisation : on vide la file d'attente, puis on reprend la liste du compte (+ ce qui reste en attente) */
 let enCours=false,relancer=false;
 async function synchroniser(){
  if(!connecte())return;
  if(enCours){relancer=true;return;}
  enCours=true;
  const c=compte(),proprietaire=c.user.id;
  try{
   do{
    relancer=false;
    for(const id of Object.keys(attente)){
     const valeur=attente[id];
     const r=await c.saveFavori(id,valeur,proprietaire);
     if(!c.user||c.user.id!==proprietaire)return; // session changée entre-temps
     if(!r.ok)throw new Error(r.message);
     if(attente[id]===valeur)delete attente[id]; // un nouveau clic pendant l'envoi sera renvoyé
    }
    const serveur=await c.loadFavoris(proprietaire);
    if(!c.user||c.user.id!==proprietaire)return;
    if(!serveur.ok)throw new Error(serveur.message);
    const fusion=new Set(serveur.ids);
    // Favoris ajoutés sur cet appareil avant la connexion : envoyés au compte au prochain tour
    ids.forEach(id=>{if(!fusion.has(id)&&!(id in attente)){attente[id]=true;relancer=true;}});
    Object.entries(attente).forEach(([id,v])=>v?fusion.add(id):fusion.delete(id));
    ids=nettoyer([...fusion]);message={texte:"",erreur:false};sauver();prevenir();
   }while(relancer||Object.keys(attente).length);
  }catch(e){
   message={texte:"Favoris non synchronisés avec ton compte pour le moment : ils restent sur cet appareil et seront envoyés plus tard.",erreur:true};
   prevenir();
  }finally{enCours=false;}
 }

 const api={
  liste:()=>ids.slice(),
  estFavori:id=>ids.includes(String(id)),
  basculer(id){
   id=String(id);if(!FAV_ID_VALIDE.test(id))return false;
   const actif=!ids.includes(id);
   if(actif){if(ids.length>=FAV_MAX){message={texte:`${FAV_MAX} favoris au maximum : retire un tournoi passé pour en ajouter un.`,erreur:true};prevenir();return false;}ids.push(id);}
   else ids=ids.filter(x=>x!==id);
   // Hors connexion (ou sans compte), on garde aussi le changement : il partira à la prochaine connexion
   if(compte()&&compte().actif)attente[id]=actif;
   message={texte:"",erreur:false};sauver();prevenir();synchroniser();
   return actif;
  },
  onChange(f){if(typeof f==="function")ecouteurs.push(f);},
  synchroniser
 };

 /* ---------- Export calendrier (.ics, RFC 5545) ---------- */
 const versIsoJour=d=>d.getFullYear()+String(d.getMonth()+1).padStart(2,"0")+String(d.getDate()).padStart(2,"0");
 const lireJour=iso=>{const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(iso||"");return m?new Date(+m[1],+m[2]-1,+m[3],12):null;};
 // Texte ICS : antislash, point-virgule, virgule et retours à la ligne échappés
 const echapper=s=>String(s||"").replace(/\\/g,"\\\\").replace(/;/g,"\\;").replace(/,/g,"\\,").replace(/\r?\n/g,"\\n");
 // Lignes de 75 octets maximum (UTF-8), suite précédée d'un espace
 function plier(ligne){
  const enc=new TextEncoder();const morceaux=[];let courant="",taille=0;
  for(const car of ligne){
   const n=enc.encode(car).length;
   if(taille+n>(morceaux.length?74:75)){morceaux.push(courant);courant="";taille=0;}
   courant+=car;taille+=n;
  }
  morceaux.push(courant);
  return morceaux.join("\r\n ");
 }
 function horodatageUtc(d){return d.toISOString().replace(/[-:]/g,"").replace(/\.\d{3}/,"");}
 // fiche facultative : adresse détaillée (fiches/<dep>.json)
 api.ics=function(t,fiche){
  const debut=lireJour(t.date_debut);if(!debut)return null;
  let fin=lireJour(t.date_fin)||debut;
  // Certaines fiches couvrent un circuit de plusieurs mois : l'événement ne garde alors que le premier jour
  if(fin<debut||(fin-debut)/86400000>6)fin=debut;
  const lendemain=new Date(fin);lendemain.setDate(lendemain.getDate()+1);
  const lien=/^\d+$/.test(String(t.id||""))?"https://tenup.fft.fr/tournoi/"+t.id:"";
  const lieu=[t.club,fiche&&fiche.adresse?fiche.adresse:t.ville].filter(Boolean).join(", ");
  const description=[`Tournoi de padel ${t.categorie||""}`.trim(),t.limite_inscription?"Inscriptions jusqu'au "+lireJour(t.limite_inscription).toLocaleDateString("fr-FR"):"",
   lien?"Fiche Ten'Up : "+lien:"","Vérifie les horaires et les conditions sur la fiche du tournoi.","Ajouté depuis apprendre-padel.fr"].filter(Boolean).join("\n");
  const lignes=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Padel Academy//apprendre-padel.fr//FR","CALSCALE:GREGORIAN","METHOD:PUBLISH",
   "BEGIN:VEVENT",`UID:tournoi-${String(t.id||versIsoJour(debut))}@apprendre-padel.fr`,`DTSTAMP:${horodatageUtc(new Date())}`,
   `DTSTART;VALUE=DATE:${versIsoJour(debut)}`,`DTEND;VALUE=DATE:${versIsoJour(lendemain)}`,
   `SUMMARY:${echapper([t.categorie,t.nom&&t.nom!==t.categorie?t.nom:"",t.ville].filter(Boolean).join(" · "))}`,
   lieu?`LOCATION:${echapper(lieu)}`:"",`DESCRIPTION:${echapper(description)}`,lien?`URL:${lien}`:"",
   // Rappel 7 jours avant le tournoi
   "BEGIN:VALARM","ACTION:DISPLAY",`DESCRIPTION:${echapper("Tournoi de padel dans 7 jours : "+(t.nom||t.categorie||""))}`,"TRIGGER:-P7D","END:VALARM"];
  // Rappel la veille de la clôture des inscriptions (à 8 h, heure de Paris approximée en UTC), si elle est à venir
  const limite=lireJour(t.limite_inscription);
  if(limite){
   const veille=new Date(Date.UTC(limite.getFullYear(),limite.getMonth(),limite.getDate()-1,7,0,0));
   if(veille>new Date())lignes.push("BEGIN:VALARM","ACTION:DISPLAY",`DESCRIPTION:${echapper("Dernier jour demain pour s'inscrire : "+(t.nom||t.categorie||""))}`,`TRIGGER;VALUE=DATE-TIME:${horodatageUtc(veille)}`,"END:VALARM");
  }
  lignes.push("END:VEVENT","END:VCALENDAR");
  return lignes.filter(Boolean).map(plier).join("\r\n")+"\r\n";
 };
 api.telechargerIcs=function(t,fiche){
  const texte=api.ics(t,fiche);if(!texte)return false;
  const url=URL.createObjectURL(new Blob([texte],{type:"text/calendar;charset=utf-8"}));
  const a=document.createElement("a");a.href=url;a.download="tournoi-"+String(t.id||"padel")+".ics";
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  return true;
 };

 window.PA_FAVORIS=api;
 // Synchronisation à l'ouverture de la page et à chaque connexion / déconnexion
 const c=compte();
 if(c&&c.actif){c.ready.then(synchroniser);c.onChange(()=>synchroniser());}
 window.addEventListener("online",synchroniser);
 // Un autre onglet a modifié les favoris
 window.addEventListener("storage",e=>{if(e.key===FAV_CLE){ids=nettoyer(lire(FAV_CLE,[]));prevenir();}});
})();
