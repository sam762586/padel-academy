/* PAGE « POUR LES CLUBS » (clubs.html) : choix du département (met à jour l'aperçu du widget, le code à coller et le texte
   pour les adhérents), boutons « Copier » (presse-papiers, retour role="status", texte affiché en secours).
   Le widget lui-même est assets/js/widget-tournois.js (chargé avant ce script) ; les départements qui ont leur page
   tournois/<dep>.html viennent de assets/data/pages-tournois.js (window.PA_PAGES_TOURNOIS), quand il est chargé. */
(function(){
 "use strict";
 // Départements (code + nom), embarqués ici comme les autres données du site
 const DEPARTEMENTS=[
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
 const SITE="https://apprendre-padel.fr/";
 const NOMBRE=5; // tournois affichés dans le code proposé (data-nombre)

 const demo=document.getElementById("clubs-demo"),select=document.getElementById("clubs-dep"),code=document.getElementById("clubs-code"),texte=document.getElementById("clubs-texte");
 if(!demo||!select||!code||!texte) return;
 const noms=Object.fromEntries(DEPARTEMENTS);

 function el(balise,classe,contenu){const e=document.createElement(balise);if(classe)e.className=classe;if(contenu!==undefined)e.textContent=contenu;return e;}
 // Page tournois/<dep>.html publiée sur le site ? (liste écrite par scripts/generer-pages.js)
 function pageDep(dep){const p=window.PA_PAGES_TOURNOIS;return !!(p&&Array.isArray(p.departements)&&p.departements.includes(dep));}
 const urlTournois=dep=>pageDep(dep)?SITE+"tournois/"+dep+".html":SITE+"tournois.html";
 // Le code exact à coller sur le site du club : deux lignes, adresse absolue en https, sans « ?v= »
 const codeDe=dep=>'<div data-apprendre-padel-tournois="'+dep+'" data-nombre="'+NOMBRE+'"></div>\n<script src="'+SITE+'assets/js/widget-tournois.js" async></script>';
 // Trois lignes pour la newsletter ou le groupe WhatsApp du club : messages aux joueurs, donc tutoiement (règle du site)
 const lignesDe=dep=>[
  "Tu débutes au padel ? Règles, technique, tactique et test de niveau, gratuits et sans inscription : "+SITE,
  "Tu cherches un tournoi ? Les tournois de ton département"+(noms[dep]?" ("+noms[dep]+")":"")+", près de chez toi et mis à jour chaque semaine : "+urlTournois(dep),
  "Un tournoi en vue ? Le guide pas à pas, de la licence au jour J : "+SITE+"premier-tournoi.html"
 ];

 // Liste déroulante : tous les départements, celui de la démo sélectionné
 const actuel=(demo.getAttribute("data-apprendre-padel-tournois")||"76").toUpperCase();
 select.replaceChildren(...DEPARTEMENTS.map(([c,n])=>{const o=el("option","",c+" · "+n);o.value=c;o.selected=c===actuel;return o;}));

 function appliquer(dep){
  code.textContent=codeDe(dep);
  texte.replaceChildren(...lignesDe(dep).map(l=>el("p","",l)));
  demo.setAttribute("data-apprendre-padel-tournois",dep);
  if(window.ApprendrePadelTournois) window.ApprendrePadelTournois.rendre(demo);
 }
 select.addEventListener("change",()=>appliquer(select.value));
 appliquer(actuel);

 // Copie dans le presse-papiers : bouton occupé pendant la copie, retour dans la zone role="status" ; secours : texte à copier à la main
 function copieur(idBouton,idRetour,contenu,libelleOk){
  const bouton=document.getElementById(idBouton),retour=document.getElementById(idRetour);
  if(!bouton||!retour) return;
  bouton.addEventListener("click",async()=>{
   bouton.disabled=true;bouton.setAttribute("aria-busy","true");
   const msg=el("p","msg");
   try{
    if(!(navigator.clipboard&&navigator.clipboard.writeText)) throw new Error("presse-papiers indisponible");
    await navigator.clipboard.writeText(contenu());
    msg.classList.add("msg-ok");msg.append(el("b","","Copié.")," "+libelleOk);
   }catch(e){
    msg.classList.add("msg-alerte");msg.append(el("b","","Copie impossible sur cet appareil.")," Sélectionnez le texte ci-dessus et copiez-le à la main.");
   }
   retour.replaceChildren(msg);
   bouton.disabled=false;bouton.removeAttribute("aria-busy");
  });
 }
 copieur("clubs-copier-code","clubs-retour-code",()=>code.textContent,"Collez les deux lignes dans une page de votre site, là où la liste doit apparaître.");
 copieur("clubs-copier-texte","clubs-retour-texte",()=>[...texte.querySelectorAll("p")].map(p=>p.textContent).join("\n"),"Collez le texte dans votre lettre d'information ou votre groupe WhatsApp.");
})();
