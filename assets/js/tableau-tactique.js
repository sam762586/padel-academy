/* TABLEAU TACTIQUE (tactique.html#tableau)
   Terrain vu de dessus, de derrière toi (même dessin que le quiz tactique) : quatre joueurs et la balle à déplacer au
   doigt, à la souris ou au clavier ; flèches de déplacement (trait plein) et de trajectoire de balle (pointillés).
   Positions de départ : les 4 phases de la section Placement (PH, placement.js) ou une scène du quiz (QUIZ_TACTIQUE).
   Sauvegarde sur l'appareil (pa-tableaux-tactiques, 5 tableaux au plus) et export en image PNG.
   Repère en mètres, celui du simulateur : x de -5 à 5 (ta droite vers -x), z de -10 (ton fond) à 10. */
const TB_CLE="pa-tableaux-tactiques";
const TB_MAX=5;
const TB_PIONS=[["A1","Toi","nous"],["A2","Partenaire","nous"],["B1","Adv. 1","eux"],["B2","Adv. 2","eux"],["balle","Balle","balle"]];
const TB_PHASES=[["def","Défense"],["trans","Transition"],["att","Attaque"],["smash","Smash adverse"]];
const tbBorner=(v,a,b)=>Math.max(a,Math.min(b,v));
const tbR=v=>Math.round(v*100)/100;

// Phases de la section Placement (schéma horizontal de 440 × 240, ton camp à gauche) converties en mètres
function tbDepuisPhase(k){
 const p=PH[k],m=([sx,sy])=>[tbR(-(sy-120)/22),tbR((sx-220)/21)];
 return {pions:{A1:m(p.you[0]),A2:m(p.you[1]),B1:m(p.opp[0]),B2:m(p.opp[1]),balle:m(p.ball)},fleches:[]};
}
// Scène du quiz : positions à l'instant de la question, et la trace de la balle en flèche
function tbDepuisQuiz(q){
 const pions={balle:[q.balle[0],q.balle[2]]};
 q.joueurs.forEach(([id,,x,z])=>{pions[id]=[x,z];});
 const fleches=q.trace.length?[{type:"balle",de:q.trace[0],a:[q.balle[0],q.balle[2]]}]:[];
 return {pions,fleches};
}
// Un tableau lu depuis l'appareil n'est accepté que s'il a la bonne forme (nombres finis, dans le terrain)
function tbValide(e){
 const pt=p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)&&Math.abs(p[0])<=5&&Math.abs(p[1])<=10;
 return !!e&&typeof e==="object"&&TB_PIONS.every(([id])=>pt(e.pions?.[id]))&&Array.isArray(e.fleches)&&e.fleches.length<=40&&
  e.fleches.every(f=>f&&(f.type==="depl"||f.type==="balle")&&pt(f.de)&&pt(f.a));
}
function tbOu(x,z){
 const cote=x<-1?"côté droit":x>1?"côté gauche":"au centre";
 const camp=z<0?"dans ton camp":"chez les adversaires",d=Math.abs(z),prof=d<4.5?"près du filet":d<7.5?"à mi-terrain":"au fond";
 return camp+", "+prof+", "+cote;
}
const tbEchapper=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[c]);

// Dessin : x écran = -x, y écran = -z. couleurs : null pour la page (classes CSS), un objet pour l'export PNG
function tbSvg(e,couleurs,titre){
 const c=couleurs,st=(cls,style)=>c?`style="${style}"`:`class="${cls}"`;
 const P=([x,z])=>[(-x).toFixed(2),(-z).toFixed(2)];
 let s=`<rect ${st("qt-sol",`fill:${c&&c.sol}`)} x="-5" y="-10" width="10" height="20"/>`+
  `<path ${st("qt-ligne",`fill:none;stroke:${c&&c.ligne};stroke-width:.06`)} d="M-5,-6.95H5M-5,6.95H5M0,-6.95V6.95"/>`+
  `<rect ${st("qt-cadre",`fill:none;stroke:${c&&c.cadre};stroke-width:.12`)} x="-5" y="-10" width="10" height="20"/>`+
  `<line ${st("qt-filet",`stroke:${c&&c.texte};stroke-width:.14`)} x1="-5.3" y1="0" x2="5.3" y2="0"/>`;
 e.fleches.forEach((f,i)=>{
  const [x1,y1]=P(f.de),[x2,y2]=P(f.a),coul=f.type==="balle"?c&&c.balle:c&&c.texte;
  s+=`<line ${st("tb-fleche tb-"+f.type,`stroke:${coul};stroke-width:.1;${f.type==="balle"?"stroke-dasharray:.3 .2;":""}`)} x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" marker-end="url(#tb-pointe-${f.type}${c?"-x":""})" data-fleche="${i}"/>`;
 });
 TB_PIONS.forEach(([id,nom,cls])=>{
  const [x,y]=P(e.pions[id]),balle=id==="balle";
  const fond=balle?c&&c.balle:cls==="nous"?c&&c.nous:c&&c.eux;
  s+=`<g ${c?"":`class="tb-pion qt-${cls}" tabindex="0" role="button" data-pion="${id}" aria-label="${nom} : ${tbOu(...e.pions[id])}. Flèches du clavier pour déplacer."`}>`+
   `<circle cx="${x}" cy="${y}" r="${balle?0.24:0.42}" ${c?`style="fill:${fond};stroke:${c.contour};stroke-width:.08"`:""}/>`+
   (balle?"":`<text x="${x}" y="${(Number(y)-0.72).toFixed(2)}" ${c?`style="font:700 .62px sans-serif;fill:${c.texte};text-anchor:middle"`:""}>${nom}</text>`)+`</g>`;
 });
 const pointes=["depl","balle"].map(t=>`<marker id="tb-pointe-${t}${c?"-x":""}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" ${st("tb-pointe-"+t,`fill:${t==="balle"?c&&c.balle:c&&c.texte}`)}/></marker>`).join("");
 if(!c)return `<svg class="tb-svg" id="tb-svg" viewBox="-5.8 -10.8 11.6 21.6" role="group" aria-label="Tableau tactique : terrain vu de dessus, ton équipe en bas"><defs>${pointes}</defs>${s}</svg>`;
 // Export : titre en haut, adresse du site en bas, fond plein
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-5.8 -12.4 11.6 24.4" width="580" height="1220"><defs>${pointes}</defs>`+
  `<rect x="-5.8" y="-12.4" width="11.6" height="24.4" style="fill:${c.fond}"/>`+
  `<text x="0" y="-11.3" style="font:800 .8px sans-serif;fill:${c.texte};text-anchor:middle">${tbEchapper(titre||"Tableau tactique")}</text>${s}`+
  `<text x="0" y="11.6" style="font:600 .5px sans-serif;fill:${c.discret};text-anchor:middle">apprendre-padel.fr · Tableau tactique</text></svg>`;
}

function tbListe(){try{const l=JSON.parse(localStorage.getItem(TB_CLE)||"[]");return Array.isArray(l)?l.filter(t=>t&&typeof t.nom==="string"&&tbValide(t.etat)):[];}catch(e){return [];}}
function tbEcrireListe(l){try{localStorage.setItem(TB_CLE,JSON.stringify(l));return true;}catch(e){return false;}}

function tbDemarrer(){
 const zone=document.getElementById("tb");
 if(!zone||typeof PH==="undefined")return;
 const scenes=typeof QUIZ_TACTIQUE!=="undefined"?QUIZ_TACTIQUE:[];
 let etat=tbDepuisPhase("def"),mode="deplacer",debut=null,glisse=null;
 const groupes=[...new Map(scenes.map(q=>[q.scenario,q.titre])).entries()];
 zone.innerHTML=`<div class="tb-grille">
  <div class="tb-terrain"><div id="tb-dessin"></div>
   <p class="qt-legende"><span class="qt-l-nous">Ton équipe</span><span class="qt-l-eux">Adversaires</span><span class="qt-l-balle">Balle</span></p></div>
  <div class="tb-outils">
   <div class="champ"><label for="tb-depart">Position de départ</label>
    <select id="tb-depart"><optgroup label="Phases du point">${TB_PHASES.map(([k,n])=>`<option value="phase:${k}">${n}</option>`).join("")}</optgroup>
    ${groupes.map(([id,titre])=>`<optgroup label="${tbEchapper(titre)}">${scenes.filter(q=>q.scenario===id).map(q=>`<option value="quiz:${q.id}">${tbEchapper(q.question.length>70?q.question.slice(0,68)+"…":q.question)}</option>`).join("")}</optgroup>`).join("")}</select></div>
   <div class="phases tb-modes" role="group" aria-label="Outil">
    <button type="button" data-mode="deplacer" aria-pressed="true">Déplacer</button>
    <button type="button" data-mode="depl" aria-pressed="false">Flèche déplacement</button>
    <button type="button" data-mode="balle" aria-pressed="false">Flèche balle</button>
   </div>
   <p class="tb-aide" id="tb-aide"></p>
   <p class="tb-actions"><button type="button" class="btn ghost" id="tb-annuler">Annuler la flèche</button><button type="button" class="btn ghost" id="tb-effacer">Effacer les flèches</button></p>
   <div class="champ"><label for="tb-nom">Nom du tableau</label><input type="text" id="tb-nom" maxlength="40" placeholder="Ex. : retour de service contre gaucher" autocomplete="off"></div>
   <p class="tb-actions"><button type="button" class="btn primary" id="tb-sauver">Sauvegarder</button><button type="button" class="btn ghost" id="tb-png">Exporter en PNG</button></p>
   <p class="tb-statut" id="tb-statut" role="status" aria-live="polite"></p>
   <div id="tb-sauves"></div>
  </div></div>`;
 const $=id=>zone.querySelector("#"+id);
 const statut=t=>{$("tb-statut").textContent=t;};
 const AIDES={deplacer:"Fais glisser un joueur ou la balle. Au clavier : Tab pour choisir, flèches pour déplacer (Maj : 1 m).",
  depl:"Trace le déplacement : glisse du départ à l'arrivée, ou touche le départ puis l'arrivée.",
  balle:"Trace la trajectoire de la balle : glisse du départ à l'arrivée, ou touche le départ puis l'arrivée."};

 function dessiner(focusId){
  $("tb-dessin").innerHTML=tbSvg(etat);
  $("tb-annuler").disabled=$("tb-effacer").disabled=!etat.fleches.length;
  if(focusId){const g=zone.querySelector(`[data-pion="${focusId}"]`);if(g)g.focus();}
 }
 function point(ev){
  const svg=$("tb-svg"),m=svg.getScreenCTM().inverse(),p=new DOMPoint(ev.clientX,ev.clientY).matrixTransform(m);
  return [tbR(tbBorner(-p.x,-5,5)),tbR(tbBorner(-p.y,-10,10))];
 }
 function choisirMode(m){
  mode=m;debut=null;
  zone.querySelectorAll("[data-mode]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.mode===m)));
  $("tb-aide").textContent=AIDES[m];
 }
 function ajouterFleche(de,a){
  if(Math.hypot(a[0]-de[0],a[1]-de[1])<0.5)return false;
  if(etat.fleches.length>=40){statut("40 flèches au plus.");return true;}
  etat.fleches.push({type:mode,de,a});dessiner();statut(mode==="balle"?"Trajectoire de balle ajoutée.":"Déplacement ajouté.");
  return true;
 }

 // Souris et doigt : un seul pointeur à la fois
 $("tb-dessin").addEventListener("pointerdown",ev=>{
  if(!ev.target.closest("#tb-svg"))return;
  ev.preventDefault();
  const p=point(ev);
  if(mode==="deplacer"){
   const g=ev.target.closest("[data-pion]");
   if(!g)return;
   glisse={id:g.dataset.pion,pointeur:ev.pointerId};
   try{$("tb-svg").setPointerCapture(ev.pointerId);}catch(e){/* capture refusée : le glisser marche tant que le pointeur reste sur le terrain */}
  }else glisse={depart:p,pointeur:ev.pointerId};
 });
 $("tb-dessin").addEventListener("pointermove",ev=>{
  if(!glisse||glisse.pointeur!==ev.pointerId||!glisse.id)return;
  etat.pions[glisse.id]=point(ev);
  const g=zone.querySelector(`[data-pion="${glisse.id}"]`),[x,z]=etat.pions[glisse.id];
  // Déplacement sans redessiner tout le terrain : on bouge le cercle et l'étiquette
  g.querySelector("circle").setAttribute("cx",(-x).toFixed(2));g.querySelector("circle").setAttribute("cy",(-z).toFixed(2));
  const t=g.querySelector("text");if(t){t.setAttribute("x",(-x).toFixed(2));t.setAttribute("y",(-z-0.72).toFixed(2));}
 });
 const finGlisse=ev=>{
  if(!glisse||glisse.pointeur!==ev.pointerId)return;
  const g=glisse;glisse=null;
  if(g.id){const nom=TB_PIONS.find(p=>p[0]===g.id)[1];dessiner();statut(nom+" : "+tbOu(...etat.pions[g.id])+".");return;}
  if(ev.type==="pointercancel")return;
  const a=point(ev);
  if(ajouterFleche(g.depart,a)){debut=null;return;}
  // Simple toucher : premier appui = départ, second = arrivée
  if(debut){ajouterFleche(debut,a);debut=null;}
  else{debut=a;statut("Départ placé : touche maintenant l'arrivée.");}
 };
 $("tb-dessin").addEventListener("pointerup",finGlisse);
 $("tb-dessin").addEventListener("pointercancel",finGlisse);
 // Clavier : flèches sur le pion choisi (0,25 m ; 1 m avec Maj)
 $("tb-dessin").addEventListener("keydown",ev=>{
  const g=ev.target.closest("[data-pion]"),d={ArrowLeft:[1,0],ArrowRight:[-1,0],ArrowUp:[0,1],ArrowDown:[0,-1]}[ev.key];
  if(!g||!d)return;
  ev.preventDefault();
  const id=g.dataset.pion,pas=ev.shiftKey?1:0.25,[x,z]=etat.pions[id];
  etat.pions[id]=[tbR(tbBorner(x+d[0]*pas,-5,5)),tbR(tbBorner(z+d[1]*pas,-10,10))];
  dessiner(id);statut(TB_PIONS.find(p=>p[0]===id)[1]+" : "+tbOu(...etat.pions[id])+".");
 });

 zone.querySelectorAll("[data-mode]").forEach(b=>b.addEventListener("click",()=>choisirMode(b.dataset.mode)));
 $("tb-depart").addEventListener("change",()=>{
  const [type,id]=$("tb-depart").value.split(":");
  etat=type==="phase"?tbDepuisPhase(id):tbDepuisQuiz(scenes.find(q=>q.id===id));
  dessiner();statut("Position de départ chargée.");
 });
 $("tb-annuler").addEventListener("click",()=>{etat.fleches.pop();dessiner();statut("Dernière flèche retirée.");});
 $("tb-effacer").addEventListener("click",()=>{etat.fleches=[];dessiner();statut("Flèches effacées.");});

 // Sauvegarde : le même nom remplace l'ancien tableau
 function afficherSauves(){
  const l=tbListe();
  $("tb-sauves").innerHTML=l.length?`<h3 class="tb-label">Mes tableaux (${l.length} sur ${TB_MAX})</h3><ul class="tb-liste">${l.map((t,i)=>`<li><span>${tbEchapper(t.nom)}</span><button type="button" class="btn ghost" data-ouvrir="${i}">Ouvrir</button><button type="button" class="btn ghost" data-supprimer="${i}" aria-label="Supprimer ${tbEchapper(t.nom)}">Supprimer</button></li>`).join("")}</ul>`:"";
 }
 $("tb-sauver").addEventListener("click",()=>{
  const nom=$("tb-nom").value.trim();
  if(!nom){statut("Donne un nom au tableau pour le sauvegarder.");$("tb-nom").focus();return;}
  const l=tbListe(),i=l.findIndex(t=>t.nom===nom);
  if(i<0&&l.length>=TB_MAX){statut(TB_MAX+" tableaux au plus : supprime-en un, ou reprends un nom existant pour le remplacer.");return;}
  const t={nom,date:new Date().toISOString().slice(0,10),etat:JSON.parse(JSON.stringify(etat))};
  if(i<0)l.push(t);else l[i]=t;
  statut(tbEcrireListe(l)?"Tableau « "+nom+" » sauvegardé sur cet appareil.":"Sauvegarde impossible sur cet appareil.");
  afficherSauves();
 });
 $("tb-sauves").addEventListener("click",ev=>{
  const o=ev.target.closest("[data-ouvrir]"),s=ev.target.closest("[data-supprimer]"),l=tbListe();
  if(o){const t=l[Number(o.dataset.ouvrir)];etat=JSON.parse(JSON.stringify(t.etat));$("tb-nom").value=t.nom;dessiner();statut("Tableau « "+t.nom+" » ouvert.");}
  if(s){const t=l.splice(Number(s.dataset.supprimer),1)[0];tbEcrireListe(l);afficherSauves();statut("Tableau « "+t.nom+" » supprimé.");}
 });

 // Export PNG : le dessin en couleurs du site (lues dans le style), rendu dans un canvas
 $("tb-png").addEventListener("click",()=>{
  const v=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const couleurs={fond:v("--bg"),sol:v("--terrain"),ligne:"rgba(255,255,255,.6)",cadre:"rgba(255,255,255,.3)",texte:v("--fg"),discret:v("--muted"),
   nous:v("--turf"),eux:v("--coral"),balle:v("--sand"),contour:v("--navy")};
  const nom=$("tb-nom").value.trim()||"Tableau tactique";
  const img=new Image(),url=URL.createObjectURL(new Blob([tbSvg(etat,couleurs,nom)],{type:"image/svg+xml"}));
  img.onload=()=>{
   const cv=document.createElement("canvas");cv.width=580;cv.height=1220;
   cv.getContext("2d").drawImage(img,0,0,580,1220);URL.revokeObjectURL(url);
   cv.toBlob(b=>{
    const a=document.createElement("a");a.href=URL.createObjectURL(b);
    a.download=(nom.normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||"tableau-tactique")+".png";
    document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
    statut("Image exportée.");
   },"image/png");
  };
  img.onerror=()=>{URL.revokeObjectURL(url);statut("Export impossible dans ce navigateur.");};
  img.src=url;
 });

 choisirMode("deplacer");dessiner();afficherSauves();
}
window.PA_TABLEAU={depuisPhase:tbDepuisPhase,depuisQuiz:tbDepuisQuiz,valide:tbValide,svg:tbSvg};
tbDemarrer();
