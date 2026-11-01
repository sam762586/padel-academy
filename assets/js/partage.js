/* PARTAGE (module commun, sans dépendance) : window.PA_PARTAGE
   Un bouton « Partager » réutilisable sur toute page : partage natif du téléphone (navigator.share) s'il existe,
   sinon des options dépliées sous le bouton : WhatsApp, Facebook, X (nouvel onglet) et « Copier le texte et le lien ».
   Aucun script, pixel ni image de réseau social : de simples liens, rien n'est envoyé à un réseau tant que le joueur
   ne clique pas. Aucune donnée personnelle : seulement le texte et l'adresse passés par la page.
   Modèle : le bloc « Partager le concours » de concours.js.

   API : PA_PARTAGE.bouton({titre, texte, url, libelle, classe}) -> élément DOM (div.pa-partage)
     titre   : titre du partage natif (ex. « Test de niveau padel · Apprendre Padel »)
     texte   : phrase partagée (sans l'adresse : elle est ajoutée après, séparée par un espace)
     url     : adresse partagée (absolue, https)
     libelle : texte du bouton (défaut : « Partager »)
     classe  : classes du bouton (défaut : « btn ghost »)
   Le texte copié dans le presse-papiers = texte + " " + url. Le retour (« Texte et lien copiés ») s'affiche dans une zone role=status.
   À charger AVANT le script qui s'en sert (balises defer : ordre du HTML respecté). Style : classes pa-partage,
   pa-partage-options et pa-partage-retour (style.css). */
(function(){
 if(window.PA_PARTAGE) return;
 let compteur=0; // identifiants uniques quand plusieurs boutons coexistent sur une page
 function el(balise,classe,texte){
  const n=document.createElement(balise);
  if(classe) n.className=classe;
  if(texte!==undefined&&texte!==null) n.textContent=texte;
  return n;
 }
 function message(texte,genre){
  const p=el("p","msg msg-"+(genre||"info"),texte);
  return p;
 }
 // Lien de partage vers un réseau : nouvel onglet, sans referrer, annoncé aux lecteurs d'écran
 function lien(nom,adresse){
  const a=el("a","btn ghost petit",nom);
  a.href=adresse; a.target="_blank"; a.rel="noopener noreferrer";
  a.append(el("span","sr-only"," (nouvel onglet)"));
  return a;
 }
 // Adresses de partage (les réseaux ne sont contactés qu'au clic du joueur)
 function liens(texte,url){
  return {
   whatsapp:"https://wa.me/?text="+encodeURIComponent(texte+" "+url),
   facebook:"https://www.facebook.com/sharer.php?u="+encodeURIComponent(url),
   x:"https://x.com/intent/post?text="+encodeURIComponent(texte)+"&url="+encodeURIComponent(url)
  };
 }
 function bouton(options){
  const o=options||{};
  const titre=String(o.titre||document.title||"");
  const texte=String(o.texte||"");
  const url=String(o.url||location.href);
  const complet=texte?texte+" "+url:url; // ce qui est copié et envoyé à WhatsApp
  compteur++;
  const conteneur=el("div","pa-partage");
  const declencheur=el("button",o.classe||"btn ghost",o.libelle||"Partager");
  declencheur.type="button";
  const zone=el("div","pa-partage-options");
  zone.id="pa-partage-options-"+compteur;
  zone.hidden=true;
  const retour=el("div","pa-partage-retour");
  retour.setAttribute("role","status");
  const adresses=liens(texte,url);
  const copier=el("button","btn ghost petit","Copier le texte et le lien");
  copier.type="button";
  copier.addEventListener("click",async()=>{
   copier.disabled=true;
   try{
    if(!(navigator.clipboard&&navigator.clipboard.writeText)) throw new Error("presse-papiers indisponible");
    await navigator.clipboard.writeText(complet);
    retour.replaceChildren(message("Texte et lien copiés : "+complet,"ok"));
   }catch(e){
    retour.replaceChildren(message("Copie impossible sur cet appareil. Voici le texte à copier : "+complet,"alerte"));
   }
   copier.disabled=false;
  });
  const ligne=el("div","btns");
  ligne.append(lien("WhatsApp",adresses.whatsapp),lien("Facebook",adresses.facebook),lien("X",adresses.x),copier);
  zone.append(ligne,retour);
  declencheur.setAttribute("aria-expanded","false");
  declencheur.setAttribute("aria-controls",zone.id);
  declencheur.addEventListener("click",async()=>{
   if(typeof navigator.share==="function"){
    try{ await navigator.share({title:titre,text:texte,url:url}); return; }
    catch(e){ if(e&&e.name==="AbortError") return; } // partage annulé par le joueur ; autre échec : options ci-dessous
   }
   zone.hidden=!zone.hidden;
   declencheur.setAttribute("aria-expanded",String(!zone.hidden));
  });
  conteneur.append(declencheur,zone);
  return conteneur;
 }
 window.PA_PARTAGE={bouton:bouton,liens:liens};
})();
