/* MON ACADÉMIE (academie.html) · phase 1 : choix du niveau de 1 à 10 (grille des niveaux de padel de la FFT, 2024)
   Les dix cartes sont écrites dans le HTML (lisibles sans JavaScript) ; ce script garde le niveau déclaré et son historique.
   - Niveau déclaré par le joueur : jamais présenté comme une certification, jamais modifié par un score de quiz.
   - Autres échelles du site gardées à part, sans aucune conversion : palier du test de niveau (0 à 5, pa-quiz-dernier),
     niveau d'exercice (1 à 4), niveau déclaré du compte (1 à 4). Elles sont seulement affichées, jamais écrites ici.
   Stockage sur l'appareil (pas de compte nécessaire) : pa-academie = { version: 1, niveau: 1..10 | null,
   historique: [{ niveau, date }] } ; historique des changements gardé (50 derniers). */
const AC_CLE="pa-academie";
const AC_MAX_HISTORIQUE=50;
const AC_PALIERS=["Découverte","P25","P100","P250","P500","P1000 et +"]; // mêmes noms que quiz-niveau.js (autre échelle)

const acNiveauValide=n=>Number.isInteger(n)&&n>=1&&n<=10;
// État relu avec contrôle : une donnée abîmée redevient un état vide, sans erreur
function acNormaliser(e){
 const vide={version:1,niveau:null,historique:[]};
 if(!e||typeof e!=="object"||Array.isArray(e))return vide;
 const historique=(Array.isArray(e.historique)?e.historique:[]).filter(h=>h&&acNiveauValide(h.niveau)&&typeof h.date==="string"&&!isNaN(Date.parse(h.date))).slice(-AC_MAX_HISTORIQUE);
 return {version:1,niveau:acNiveauValide(e.niveau)?e.niveau:null,historique};
}
function acLire(){try{return acNormaliser(JSON.parse(localStorage.getItem(AC_CLE)||"null"));}catch(e){return acNormaliser(null);}}
// Choisir un niveau : ajouté à l'historique seulement s'il change ; renvoie le nouvel état
function acChoisir(etat,niveau,date=new Date().toISOString()){
 if(!acNiveauValide(niveau))return etat;
 if(etat.niveau===niveau)return etat;
 return {version:1,niveau,historique:etat.historique.concat([{niveau,date}]).slice(-AC_MAX_HISTORIQUE)};
}
function acEcrire(etat){try{localStorage.setItem(AC_CLE,JSON.stringify(etat));return true;}catch(e){return false;}}
// Le navigateur permet-il d'enregistrer ? (navigation privée stricte, stockage bloqué ou plein)
function acStockageDisponible(){try{localStorage.setItem("pa-test","1");localStorage.removeItem("pa-test");return true;}catch(e){return false;}}

function acDemarrer(){
 const zone=document.getElementById("ac-moi");
 if(!zone)return;
 const cartes=[...document.querySelectorAll(".ac-carte[data-niveau]")];
 const nomDe=n=>{const c=cartes.find(x=>Number(x.dataset.niveau)===n);return c?c.querySelector(".ac-nom").textContent:"";};
 const el=(b,c,t)=>{const e=document.createElement(b);if(c)e.className=c;if(t!==undefined)e.textContent=t;return e;};
 const jour=d=>new Date(d).toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"});
 // Choix rapide des 10 niveaux (un toucher) : mêmes boutons data-choisir que les cartes
 function choixRapide(etat){
  const g=el("div","ac-rapide");g.setAttribute("role","group");g.setAttribute("aria-label","Choisir mon niveau");
  cartes.forEach(c=>{const n=Number(c.dataset.niveau),b=el("button","ac-rapide-btn");b.type="button";b.dataset.choisir=String(n);
   b.setAttribute("aria-pressed",String(n===etat.niveau));b.append(el("b","",String(n)),el("span",""," "+nomDe(n)));g.append(b);});
  return g;
 }
 function rendre(){
  const etat=acLire();
  zone.textContent="";
  if(!acStockageDisponible())zone.append(el("p","msg msg-alerte","Ton navigateur ne permet pas d'enregistrer sur cet appareil (navigation privée ou stockage bloqué) : ton niveau et tes quiz ne seront pas gardés après la fermeture de la page."));
  if(etat.niveau){
   const h=el("h2","ac-moi-titre");h.append("Ton niveau déclaré : ",el("span","ac-moi-num",String(etat.niveau)),el("span","ac-moi-nom"," · "+nomDe(etat.niveau)));
   zone.append(h);
   const dernier=etat.historique[etat.historique.length-1];
   const p=el("p","ac-moi-info");p.append((dernier?"Choisi le "+jour(dernier.date)+". ":"")+"Tu peux le changer à tout moment : ");
   const a=el("a","","revoir les niveaux");a.href="#niveaux";p.append(a,".");
   zone.append(p);
   const ch=el("details","ac-changer");ch.append(el("summary","","Changer de niveau"),choixRapide(etat));zone.append(ch);
   if(etat.historique.length>1){
    const d=el("details","ac-historique");d.append(el("summary","","Historique de ton niveau ("+etat.historique.length+" choix)"));
    const ul=el("ul");etat.historique.slice().reverse().slice(0,10).forEach(x=>ul.append(el("li","",jour(x.date)+" : niveau "+x.niveau+" · "+nomDe(x.niveau))));
    d.append(ul);zone.append(d);
   }
  }else{
   zone.append(el("h2","ac-moi-titre","Choisis ton niveau pour commencer"));
   const p=el("p","ac-moi-info");p.append("Un toucher suffit. Pour lire les critères de chaque niveau : ");const a=el("a","","les 10 niveaux en détail");a.href="#niveaux";p.append(a,".");
   zone.append(p,choixRapide(etat));
  }
  // Quiz interrompu : la reprise est proposée dès le haut de la page
  let quiz=null;try{quiz=JSON.parse(localStorage.getItem("pa-academie-quiz")||"null");}catch(e){}
  const enCours=quiz&&quiz.enCours&&Array.isArray(quiz.enCours.questions)&&Array.isArray(quiz.enCours.reponses)&&quiz.enCours.reponses.length<quiz.enCours.questions.length?quiz.enCours:null;
  if(etat.niveau&&enCours){
   const p=el("p","ac-reprise");p.append("Tu as un quiz en cours (question "+(enCours.reponses.length+1)+"). ");
   const b=el("button","btn primary","Reprendre mon quiz");b.type="button";b.id="ac-reprendre";
   b.addEventListener("click",()=>window.dispatchEvent(new Event("pa-academie-reprendre")));
   p.append(b);zone.append(p);
  }
  // Ancien test de niveau : autre échelle, affiché à part, jamais converti
  let test=null;try{test=JSON.parse(localStorage.getItem("pa-quiz-dernier")||"null");}catch(e){}
  if(test&&Number.isInteger(test.palier)&&AC_PALIERS[test.palier]&&!isNaN(Date.parse(test.date))){
   const p=el("p","note ac-ancien");
   p.append("Ton dernier ");const a=el("a","","test de niveau");a.href="niveau.html";
   p.append(a," ("+jour(test.date)+") estimait la catégorie de tournoi "+AC_PALIERS[test.palier]+". C'est une autre échelle que les niveaux 1 à 10 : les deux sont gardés séparément.");
   zone.append(p);
  }
  cartes.forEach(c=>{
   const n=Number(c.dataset.niveau),choisi=n===etat.niveau,b=c.querySelector(".ac-choisir");
   c.classList.toggle("choisi",choisi);
   b.setAttribute("aria-pressed",String(choisi));
   b.textContent=choisi?"Mon niveau ✓":"C'est mon niveau";
  });
 }
 // Cartes et choix rapide : un seul gestionnaire (les boutons du choix rapide sont recréés à chaque affichage)
 document.addEventListener("click",ev=>{
  const b=ev.target.closest("[data-choisir]");if(!b)return;
  const etat=acChoisir(acLire(),Number(b.dataset.choisir));
  if(!acEcrire(etat)){zone.prepend(el("p","msg msg-erreur","Impossible d'enregistrer sur cet appareil (stockage désactivé ou plein)."));return;}
  rendre();
  window.dispatchEvent(new CustomEvent("pa-academie",{detail:{niveau:etat.niveau}})); // pour les blocs des phases suivantes
  zone.scrollIntoView({block:"start"});
  const t=zone.querySelector(".ac-moi-titre");if(t){t.tabIndex=-1;t.focus({preventScroll:true});}
 });
 window.addEventListener("pa-academie-quiz",rendre);
 rendre();
}
window.PA_ACADEMIE={stockageDisponible:acStockageDisponible,CLE:AC_CLE,lire:acLire,choisir:acChoisir,normaliser:acNormaliser,niveauValide:acNiveauValide};
acDemarrer();
