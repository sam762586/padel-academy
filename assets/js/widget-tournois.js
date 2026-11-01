/* WIDGET « PROCHAINS TOURNOIS » POUR LES SITES DE CLUBS (page clubs.html)
   Un club colle sur son site :
     <div data-apprendre-padel-tournois="76" data-nombre="5"></div>
     <script src="https://apprendre-padel.fr/assets/js/widget-tournois.js" async></script>
   Le script lit assets/data/prochains/<dep>.json (écrit par scripts/generer-pages.js) sur le serveur d'où il vient,
   garde les tournois à venir, les trie par date et affiche les N premiers dans un Shadow DOM (styles isolés : rien ne
   fuit vers le site du club, rien du site du club ne déforme la liste). En bas, le lien vers la page des tournois du
   département sur apprendre-padel.fr : il est posé dans la page du club (élément slotté, hors du Shadow DOM) pour être
   lu par tous les robots.
   Aucun cookie, aucun stockage, aucune requête vers un autre domaine que celui du script. Plusieurs conteneurs possibles.
   Les JSON doivent être servis avec l'en-tête Access-Control-Allow-Origin: * (GitHub Pages l'envoie) : sans lui, la
   lecture depuis le site d'un club est refusée par le navigateur (message « n'ont pas pu être chargés »).
   Ce fichier est appelé par des sites tiers à une adresse sans « ?v= » : il ne dépend ni du cache ni des autres scripts
   du site. API publique : window.ApprendrePadelTournois.rendre(conteneur) / .tout(). */
(function(){
 "use strict";
 if(window.ApprendrePadelTournois) return; // chargé deux fois sur la même page : une seule instance
 const SITE="https://apprendre-padel.fr/";
 const ATTRIBUT="data-apprendre-padel-tournois";
 const MOIS=["janv.","févr.","mars","avr.","mai","juin","juil.","août","sept.","oct.","nov.","déc."];
 const DEP_VALIDE=/^(0[1-9]|[1-8][0-9]|9[0-5]|2A|2B|97[1-4]|976)$/; // 975 n'existe pas (Saint-Pierre-et-Miquelon n'est pas un département)
 const ID_VALIDE=/^\d{1,12}$/; // identifiants Ten'Up : chiffres seulement (défense en profondeur sur les liens)
 const PAR_DEFAUT=5,MAXI=12; // les JSON contiennent 12 tournois au plus

 // Dossier des données : celui du serveur qui a fourni ce script (le site, ou un serveur local pour la démo et les tests)
 function baseDonnees(){
  const script=document.currentScript||document.querySelector('script[src*="widget-tournois.js"]');
  const src=script&&script.src||"";
  const m=/^(.*\/)assets\/js\/widget-tournois\.js(?:[?#].*)?$/.exec(src);
  return (m?m[1]:SITE)+"assets/data/prochains/";
 }
 const BASE=baseDonnees();

 const STYLE=`
:host{display:block;box-sizing:border-box;max-width:100%;font:16px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;color:inherit}
*,*::before,*::after{box-sizing:border-box}
.wt{border:1px solid rgba(128,128,128,.45);border-radius:12px;padding:16px;background:rgba(128,128,128,.07)}
.wt-titre{margin:0 0 12px;font-size:1em;font-weight:700}
.wt-msg{margin:0;font-size:1em}
.wt-liste{list-style:none;margin:0;padding:0;display:grid;gap:10px}
.wt-item{display:grid;grid-template-columns:auto minmax(0,1fr);gap:2px 10px;align-items:start;padding-top:10px;border-top:1px solid rgba(128,128,128,.35)}
.wt-cat{font-weight:700;font-size:1em;line-height:1.3;padding:3px 9px;border-radius:999px;border:1px solid currentColor;white-space:nowrap}
.wt-nom{font-weight:700;color:inherit;text-decoration:underline;overflow-wrap:anywhere}
.wt-detail{grid-column:2;font-size:1em;opacity:.85;overflow-wrap:anywhere}
a{color:inherit}
::slotted(p){margin:12px 0 0;font-size:1em}`;

 function el(balise,classe,texte){const e=document.createElement(balise);if(classe)e.className=classe;if(texte!==undefined)e.textContent=texte;return e;}
 const iso=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
 // Date « AAAA-MM-JJ » → Date locale ; null si la chaîne n'a pas cette forme ou ne donne pas une date valide
 const lireDate=s=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(String(s||""))) return null;const p=s.split("-"),d=new Date(+p[0],+p[1]-1,+p[2]);return isNaN(d.getTime())?null:d;};
 // Dates en français : « le 30 oct. », « du 2 au 3 nov. », « du 30 oct. au 31 août » ; l'année n'est ajoutée que si elle change
 function jour(d,avecMois,avecAnnee){return d.getDate()+(avecMois?" "+MOIS[d.getMonth()]:"")+(avecAnnee?" "+d.getFullYear():"");}
 function periode(debut,fin,annee){
  const a=lireDate(debut),b=lireDate(fin)||a;
  if(!a) return "";
  const anneeB=b.getFullYear()!==annee;
  if(a.getTime()===b.getTime()) return "le "+jour(a,true,anneeB);
  const memeMois=a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth();
  return "du "+jour(a,!memeMois,false)+" au "+jour(b,true,anneeB);
 }
 function lienTournoi(t){return t.page?SITE+"tournoi/"+encodeURIComponent(t.id)+".html":"https://tenup.fft.fr/tournoi/"+encodeURIComponent(t.id);}

 // Lien « Tous les tournois … » : enfant du conteneur (page du club), affiché par le <slot> du Shadow DOM
 // lieu : « en Seine-Maritime », « dans le Calvados » (champ du JSON) ; à défaut « de <nom> » ; sans département : phrase générale
 function pied(conteneur,lieu,url){
  conteneur.querySelectorAll('[slot="pied"]').forEach(x=>x.remove());
  const p=el("p","apprendre-padel-pied");p.slot="pied";
  const a=el("a","","Tous les tournois"+(lieu?" "+lieu:"")+" sur apprendre-padel.fr");
  a.href=url;
  p.appendChild(a);
  conteneur.appendChild(p);
 }
 // Shadow DOM : style, cadre et <slot name="pied"> (le lien de bas de liste, enfant du conteneur, s'affiche dans le cadre)
 function cadre(racine){
  const style=el("style");style.textContent=STYLE;
  const boite=el("div","wt"),slot=el("slot");slot.name="pied";
  boite.appendChild(slot);
  racine.replaceChildren(style,boite);
  return {boite,slot};
 }
 function message(boite,slot,texte,alerte){
  const p=el("p","wt-msg",texte);p.setAttribute("role",alerte?"alert":"status");
  boite.replaceChildren(p,slot);
 }

 async function rendre(conteneur){
  if(!conteneur||typeof conteneur.getAttribute!=="function") return;
  const demande=(conteneur.__wtDemande=(conteneur.__wtDemande||0)+1);
  const dep=String(conteneur.getAttribute(ATTRIBUT)||"").trim().toUpperCase();
  const n=Math.min(MAXI,Math.max(1,parseInt(conteneur.getAttribute("data-nombre"),10)||PAR_DEFAUT));
  let racine=conteneur.shadowRoot;
  if(!racine){try{racine=conteneur.attachShadow({mode:"open"});}catch(e){return;}} // élément qui n'accepte pas de Shadow DOM : rien
  const {boite,slot}=cadre(racine);
  if(!DEP_VALIDE.test(dep)){
   message(boite,slot,"Département inconnu : "+(dep?"« "+dep+" »":"(vide)")+". Indiquez son numéro dans "+ATTRIBUT+" (01 à 95, 2A, 2B, 971 à 974 et 976).",true);
   pied(conteneur,"",SITE+"tournois.html");
   return;
  }
  message(boite,slot,"Chargement des prochains tournois…");
  let donnees=null,etat="reseau";
  try{
   const r=await fetch(BASE+dep+".json",{cache:"default",mode:"cors",credentials:"omit"});
   if(r.status===404) etat="aucun";
   else if(r.ok){const d=await r.json();if(d&&Array.isArray(d.tournois)){donnees=d;etat="ok";}}
  }catch(e){}
  if(demande!==conteneur.__wtDemande) return; // un autre rendu a été demandé entre-temps (changement de département)
  const aujourdhui=new Date(),ref=iso(aujourdhui);
  const nomDep=donnees&&donnees.nom||"";
  const lieu=donnees&&donnees.lieu||""; // sans lieu : « dans ce département » / phrase générale
  // Page tournois/<dep>.html du site : champ page_dep du JSON (sinon, le drapeau « page » des tournois, posé par département)
  const pageDep=!!donnees&&(typeof donnees.page_dep==="boolean"?donnees.page_dep:donnees.tournois.some(t=>t.page));
  const urlTous=pageDep?SITE+"tournois/"+encodeURIComponent(dep)+".html":SITE+"tournois.html";
  // Le site écrit un JSON pour chaque département, même vide (tournois: []) ; le 404 reste traité comme « aucun tournoi »
  const aucun="Aucun tournoi connu pour le moment "+(lieu?lieu:"dans ce département")+".";
  if(etat!=="ok"){
   message(boite,slot,etat==="aucun"?aucun:"Les tournois n'ont pas pu être chargés (connexion ou serveur).",etat!=="aucun");
   pied(conteneur,lieu,urlTous);
   return;
  }
  const liste=donnees.tournois.filter(t=>t&&ID_VALIDE.test(String(t.id))&&(t.date_fin||t.date_debut||"")>=ref)
   .sort((a,b)=>String(a.date_debut).localeCompare(String(b.date_debut))).slice(0,n);
  boite.replaceChildren(el("p","wt-titre","Prochains tournois de padel"+(nomDep?" · "+nomDep:"")));
  if(!liste.length){const p=el("p","wt-msg",aucun);p.setAttribute("role","status");boite.appendChild(p);}
  else{
   const ul=el("ul","wt-liste");
   liste.forEach(t=>{
    const li=el("li","wt-item");
    const a=el("a","wt-nom",String(t.nom||"Tournoi"));a.href=lienTournoi(t);
    if(!t.page){a.target="_blank";a.rel="noopener";}
    const detail=el("span","wt-detail",[t.ville,periode(t.date_debut,t.date_fin,aujourdhui.getFullYear())].filter(Boolean).join(" · "));
    li.append(el("span","wt-cat",String(t.categorie||"?")),a,detail);
    ul.appendChild(li);
   });
   boite.appendChild(ul);
  }
  boite.appendChild(slot);
  pied(conteneur,lieu,urlTous);
 }
 function tout(){document.querySelectorAll("["+ATTRIBUT+"]").forEach(c=>{if(!c.shadowRoot)rendre(c);});}
 window.ApprendrePadelTournois={rendre,tout};
 // Chargé avant les conteneurs (défer, ou async très tôt) : on attend la fin de l'analyse ; sinon on rend tout de suite
 if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",tout,{once:true});
 else tout();
})();
