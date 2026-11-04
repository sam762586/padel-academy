/* OUTILS COMMUNS DES GRAPHIQUES SVG (barème, récapitulatif du compteur de match, courbe de Mon espace).
   Aucune donnée ni couleur ici : chaque graphique garde ses classes CSS (jetons du design system) et son texte.
   Les nœuds sont créés avec createElementNS et leurs textes posés en textContent (jamais d'innerHTML).
   Exposé : window.PA_GRAPHIQUE = { el, pasGrille, barreVerticale, barreHorizontale, largeurTexte, ajuster, suivreLargeur, placerBulle }.
   À charger avant les scripts qui l'utilisent (defer, dans l'ordre). */
(function(){
 const SVG="http://www.w3.org/2000/svg";
 const ARRONDI=4; // px : coins arrondis côté donnée (haut d'une barre verticale, bout d'une barre horizontale)

 // Élément SVG avec ses attributs, ajouté à « parent » s'il est donné
 function el(nom,attributs,parent){
  const n=document.createElementNS(SVG,nom);
  for(const k in attributs)n.setAttribute(k,String(attributs[k]));
  if(parent)parent.appendChild(n);
  return n;
 }
 // Pas de graduation « rond » (1, 2, 2,5, 5 × 10^n) : environ 4 lignes de grille jusqu'à max
 function pasGrille(max){
  if(!(max>0))return 1;
  const brut=max/4,p=Math.pow(10,Math.floor(Math.log10(brut)));
  for(const m of [1,2,2.5,5,10])if(m*p>=brut)return m*p;
  return 10*p;
 }
 // Barre verticale arrondie en haut seulement, base droite sur l'axe
 function barreVerticale(x,y,l,h,r=ARRONDI){
  r=Math.max(0,Math.min(r,l/2,h));
  return `M${x},${y+h}V${y+r}A${r},${r} 0 0 1 ${x+r},${y}H${x+l-r}A${r},${r} 0 0 1 ${x+l},${y+r}V${y+h}Z`;
 }
 // Barre horizontale arrondie au bout seulement (côté valeur), départ droit sur l'axe de gauche
 function barreHorizontale(x,y,l,h,r=ARRONDI){
  r=Math.max(0,Math.min(r,h/2,l));
  return `M${x},${y}H${x+l-r}A${r},${r} 0 0 1 ${x+l},${y+r}V${y+h-r}A${r},${r} 0 0 1 ${x+l-r},${y+h}H${x}Z`;
 }
 // Largeur estimée d'un texte (px) quand on ne peut pas le mesurer (graphique pas encore affiché)
 const largeurTexte=(t,parCaractere=7)=>String(t).length*parCaractere+6;
 // Coupe un <text> SVG (avec « … ») pour qu'il tienne dans « largeurMax » px ; mesure réelle si le texte est affiché
 function ajuster(noeud,texte,largeurMax,parCaractere=7){
  noeud.textContent=texte;
  const mesurer=()=>{const l=noeud.getComputedTextLength?noeud.getComputedTextLength():0;return l>0?l:largeurTexte(noeud.textContent,parCaractere)-6;};
  if(mesurer()<=largeurMax)return false;
  let n=texte.length;
  while(n>1){n--;noeud.textContent=texte.slice(0,n).trimEnd()+"…";if(mesurer()<=largeurMax)break;}
  return true;
 }
 // Rappelle « rappel(largeur) » quand la largeur du nœud change (rotation, fenêtre, écran affiché) : un appel par image au plus.
 // Renvoie l'observateur (à déconnecter quand le graphique est remplacé) ou null sans ResizeObserver.
 function suivreLargeur(noeud,rappel){
  if(typeof ResizeObserver!=="function")return null;
  let attente=0,largeur=-1;
  const obs=new ResizeObserver(entrees=>{
   const l=Math.round(entrees[0].contentRect.width);
   if(l===largeur)return;largeur=l;
   cancelAnimationFrame(attente);attente=requestAnimationFrame(()=>rappel(l));
  });
  obs.observe(noeud);
  return obs;
 }
 // Place l'info-bulle (enfant de « conteneur », en position absolue) au-dessus du point (cx, cy) du SVG, sans sortir du cadre.
 // cx, cy sont dans le repère du viewBox (égal aux pixels quand le graphique est dessiné à sa taille réelle).
 // Un élément SVG n'a pas d'offsetLeft : on mesure l'écart entre les deux boîtes. La bulle doit être visible (hidden=false) avant l'appel.
 function placerBulle(conteneur,svg,bulle,cx,cy){
  const rs=svg.getBoundingClientRect(),rc=conteneur.getBoundingClientRect();
  const vb=svg.viewBox&&svg.viewBox.baseVal,sx=vb&&vb.width?rs.width/vb.width:1,sy=vb&&vb.height?rs.height/vb.height:1;
  const decalX=rs.left-rc.left-conteneur.clientLeft,decalY=rs.top-rc.top-conteneur.clientTop;
  const lb=bulle.offsetWidth,lc=conteneur.clientWidth;
  const x=decalX+cx*sx;
  bulle.style.left=Math.max(4,Math.min(lc-lb-4,x-lb/2))+"px";
  bulle.style.top=Math.max(4,decalY+cy*sy-30)+"px";
 }
 window.PA_GRAPHIQUE={el,pasGrille,barreVerticale,barreHorizontale,largeurTexte,ajuster,suivreLargeur,placerBulle,ARRONDI};
})();
