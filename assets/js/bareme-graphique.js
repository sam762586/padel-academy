/* GRAPHIQUE DU BARÈME (bareme.html) : une barre par place finale, la place choisie en vert.
   Lit le choix dans les attributs data-cat, data-nb, data-sexe, data-place du <figure class="bar-graph" id="b-graph">,
   posés par renderTable() (bareme.js), et les points dans bareme-donnees.js (window.PA_BAREME, chargé avant).
   SVG construit avec createElementNS (aucune donnée en innerHTML), couleurs par classes CSS (assets/css/contenu.css, section barème).
   Redessiné quand la largeur du graphique change (ResizeObserver, un dessin par image au plus).
   Outils SVG communs (éléments, graduation, barre arrondie, suivi de largeur, info-bulle) : graphique-svg.js, chargé avant.
   Exposé : window.PA_BAREME_GRAPHIQUE.dessiner(fig) et .places(cat, nb, sexe) (utilisé aussi par le test). */
(function(){
 const G=window.PA_GRAPHIQUE;
 if(!G)return;
 const {el,pasGrille,largeurTexte}=G;
 // Repères de l'axe horizontal : seulement les places qui ouvrent un tour (les autres se lisent au survol)
 const JALONS=[{place:1,texte:"V"},{place:2,texte:"F"},{place:3,texte:"½"},{place:5,texte:"¼"},{place:9,texte:"⅛"},{place:17,texte:"17e"},{place:25,texte:"25e"}];
 const MARGES={haut:22,droite:6,bas:22,gauche:30}; // px : étiquette de la barre choisie en haut, repères en bas, points à gauche
 const ECART=2;
 const etats=new WeakMap(); // figure → {barres, geometrie, svg, bulle}

 // Places existantes pour un tableau : même règle que ptsFor (place > nombre de paires = inexistante), les null coupés
 function places(cat,nb,sexe){
  const B=window.PA_BAREME;if(!B)return [];
  const liste=[];
  const dames=B.BAREME[cat]&&B.BAREME[cat].dames&&sexe==="dames";
  const derniere=dames?B.BAREME[cat].dames.length:32;
  for(let place=1;place<=derniere;place++){
   const points=B.ptsFor(cat,place,nb,sexe);
   if(points===null||points===undefined)continue;
   let libelle=B.PLACE_LABEL(place-1);
   if(dames&&place===derniere)libelle=place+"e et plus";
   liste.push({place,points,libelle});
  }
  return liste;
 }
 // Place à surligner : les dames au-delà de la 25e prennent les points de la 25e (« 25e et plus »)
 function placeChoisie(barres,place){
  if(barres.some(b=>b.place===place))return place;
  const derniere=barres[barres.length-1];
  return derniere&&/et plus/.test(derniere.libelle)&&place>derniere.place?derniere.place:null;
 }
 function libelleTableau(cat,nb,sexe){
  const B=window.PA_BAREME,d=B&&B.BAREME[cat];
  if(Array.isArray(d)&&Array.isArray(d[0]))return cat+", "+nb+" paires";
  if(d&&d.messieurs)return cat+", tableau "+sexe;
  return cat;
 }
 const pts=n=>n+" pt"+(n>1?"s":"");

 function preparer(fig){
  let etat=etats.get(fig);
  if(etat)return etat;
  const svg=el("svg",{role:"img",class:"bar-svg",focusable:"false"});
  const bulle=document.createElement("div");
  bulle.className="bar-bulle";bulle.setAttribute("aria-hidden","true");bulle.hidden=true;
  const legende=document.createElement("figcaption");legende.className="bar-legende";
  fig.textContent="";fig.append(svg,bulle,legende);
  etat={svg,bulle,legende,barres:[],geo:null,survol:null};
  etats.set(fig,etat);
  // Info-bulle : la cible est toute la colonne (pas seulement la barre), au survol comme au toucher
  const viser=e=>{
   if(!etat.geo||!etat.barres.length)return;
   const r=svg.getBoundingClientRect(),x=e.clientX-r.left-etat.geo.gauche;
   const i=Math.floor(x/etat.geo.pas);
   if(i<0||i>=etat.barres.length){cacher();return;}
   montrer(fig,etat,i);
  };
  const cacher=()=>{bulle.hidden=true;if(etat.survol)etat.survol.classList.remove("survol");etat.survol=null;};
  svg.addEventListener("pointermove",viser);
  svg.addEventListener("pointerdown",viser);
  svg.addEventListener("pointerleave",e=>{if(e.pointerType==="mouse")cacher();});
  etat.cacher=cacher;
  // Redessin quand la largeur change (rotation, fenêtre) : un seul dessin par image
  G.suivreLargeur(fig,l=>{if(l)dessiner(fig);});
  return etat;
 }
 function montrer(fig,etat,i){
  const b=etat.barres[i],g=etat.geo;
  if(etat.survol)etat.survol.classList.remove("survol");
  etat.survol=b.noeud;b.noeud.classList.add("survol");
  etat.bulle.textContent=b.libelle+" : "+pts(b.points);
  etat.bulle.hidden=false;
  // Position dans la figure : centre de la colonne, au-dessus de la barre, sans sortir du cadre
  G.placerBulle(fig,etat.svg,etat.bulle,g.gauche+i*g.pas+g.pas/2,b.y);
 }

 function dessiner(fig){
  if(!fig||!window.PA_BAREME)return;
  const etat=preparer(fig),svg=etat.svg;
  const cat=fig.dataset.cat||"P100",sexe=fig.dataset.sexe==="dames"?"dames":"messieurs";
  const nb=parseInt(fig.dataset.nb,10)||16,place=parseInt(fig.dataset.place,10)||1;
  const barres=places(cat,nb,sexe),choisie=placeChoisie(barres,place);
  etat.barres=barres;etat.cacher();
  while(svg.firstChild)svg.removeChild(svg.firstChild);
  const tableau=libelleTableau(cat,nb,sexe);
  const selection=barres.find(b=>b.place===choisie);
  // Texte lu par les lecteurs d'écran : toutes les valeurs, place → points
  svg.setAttribute("aria-label","Points par place finale, "+tableau+" : "+barres.map(b=>b.libelle+" "+pts(b.points)).join(", ")+"."+
   (selection?" Ta place : "+selection.libelle+", "+pts(selection.points)+".":" Ta place n'existe pas dans ce tableau."));
  // Légende : tableau affiché, pastille de la place choisie, mode d'emploi
  etat.legende.textContent="";
  const titre=document.createElement("b");titre.textContent="Points par place · "+tableau;
  const pastille=document.createElement("span");pastille.className="bar-pastille";pastille.setAttribute("aria-hidden","true");
  const suite=document.createElement("span");
  suite.textContent=selection?" ta place. Touche ou survole une barre pour lire ses points.":" Ta place n'existe pas ici. Touche ou survole une barre pour lire ses points.";
  etat.legende.append(titre," ",pastille,suite);

  const r=svg.getBoundingClientRect(),L=Math.round(r.width),H=Math.round(r.height);
  if(!L||!H||!barres.length){etat.geo=null;return;}
  svg.setAttribute("viewBox",`0 0 ${L} ${H}`);
  const max=barres[0].points,pas=pasGrille(max),haut=Math.ceil(max/pas)*pas;
  const g={gauche:MARGES.gauche,haut:MARGES.haut,largeur:L-MARGES.gauche-MARGES.droite,hauteur:H-MARGES.haut-MARGES.bas};
  g.pas=g.largeur/barres.length;
  etat.geo=g;
  const yDe=v=>g.haut+g.hauteur*(1-v/haut);
  // Grille discrète et graduation des points
  const grille=el("g",{class:"bar-grille","aria-hidden":"true"},svg);
  for(let v=0;v<=haut+1e-9;v+=pas){
   const y=Math.round(yDe(v))+.5;
   el("line",{x1:g.gauche,x2:L-MARGES.droite,y1:y,y2:y},grille);
   const t=el("text",{x:g.gauche-6,y:y+4,class:"bar-axe","text-anchor":"end"},grille);
   t.textContent=String(Math.round(v*10)/10);
  }
  // Barres : 2 px d'écart, hauteur minimale d'1 px pour que les petites valeurs restent visibles
  const groupe=el("g",{class:"bar-barres","aria-hidden":"true"},svg);
  const lb=Math.max(1,g.pas-ECART);
  barres.forEach((b,i)=>{
   const x=g.gauche+i*g.pas+ECART/2,y=Math.min(yDe(b.points),g.haut+g.hauteur-1),h=g.haut+g.hauteur-y;
   b.y=y;
   b.noeud=el("path",{d:G.barreVerticale(x,y,lb,h),class:"bar-barre"+(b.place===choisie?" choisie":""),"data-place":b.place,"data-points":b.points},groupe);
  });
  // Repères de l'axe : jalons présents dans ce tableau, puis la dernière place ; pas de chevauchement
  const axe=el("g",{class:"bar-reperes","aria-hidden":"true"},svg);
  const derniere=barres[barres.length-1];
  const reperes=JALONS.filter(j=>j.place<derniere.place).map(j=>({...j}));
  const texteDerniere=/et plus/.test(derniere.libelle)?derniere.place+"e+":(JALONS.find(j=>j.place===derniere.place)||{texte:derniere.place+"e"}).texte;
  reperes.push({place:derniere.place,texte:texteDerniere});
  let finPrecedente=-Infinity;
  const yBas=g.haut+g.hauteur;
  // La dernière place est toujours écrite : on retire d'abord les jalons qui la toucheraient
  const xDe=p=>g.gauche+(barres.findIndex(b=>b.place===p)+.5)*g.pas;
  const xDerniere=xDe(derniere.place),debutDerniere=Math.min(xDerniere-largeurTexte(texteDerniere)/2,L-MARGES.droite-largeurTexte(texteDerniere));
  reperes.forEach((j,k)=>{
   const x=xDe(j.place),demi=largeurTexte(j.texte)/2,estDerniere=k===reperes.length-1;
   if(!estDerniere&&(x-demi<finPrecedente||x+demi>debutDerniere))return;
   el("line",{x1:Math.round(x)+.5,x2:Math.round(x)+.5,y1:yBas,y2:yBas+4,class:"bar-tic"},axe);
   const ancre=estDerniere&&x+demi>L-MARGES.droite?"end":"middle";
   const t=el("text",{x:ancre==="end"?L-MARGES.droite:x,y:yBas+16,class:"bar-axe","text-anchor":ancre},axe);
   t.textContent=j.texte;
   finPrecedente=x+demi;
  });
  // Étiquette directe sur la seule barre choisie
  if(selection){
   const i=barres.indexOf(selection),cx=g.gauche+(i+.5)*g.pas;
   const texte=pts(selection.points),demi=largeurTexte(texte)/2;
   const t=el("text",{x:Math.max(g.gauche+demi,Math.min(L-MARGES.droite-demi,cx)),y:Math.max(14,selection.y-6),class:"bar-valeur","text-anchor":"middle","aria-hidden":"true"},svg);
   t.textContent=texte;
  }
 }
 window.PA_BAREME_GRAPHIQUE={dessiner,places};
})();
