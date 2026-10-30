/* MA CARTE DE JOUEUR · logique de la page carte.html.
   Données et moteur : carte-donnees.js (window.PA_CARTE) ; rendu image : carte-rendu.js (window.CARTE_RENDU) ;
   styles : assets/carte.css. Tout se passe sur l'appareil :
   - pa-carte : réponses, ajustements, poste, pseudo, choix du repère, modèle de carte, présence d'une photo (JSON, version 1) ;
   - pa-carte-photo : photo recadrée en 600 × 480 (dataURL JPEG, bien en dessous de 1 Mo), jamais envoyée ;
   - pa-quiz-dernier (palier du test de niveau) et pa-academie (niveau Mon académie) : LUS pour proposer un point de départ,
     jamais écrits, jamais convertis l'un en l'autre.
   Parcours : intro → questionnaire (12 situations, une par une) → notes et poste → photo → nom → carte (image à télécharger
   ou partager). « Refaire mes réponses » garde le joueur (poste, nom, photo, repère) ; « Faire une nouvelle carte » repart
   de zéro (pour soi ou pour un ami), repère ignoré par défaut, et ne remplace la carte gardée qu'à la fin du questionnaire.
   Chaque étape a son titre (tabindex -1) qui reçoit le focus quand on y arrive au clavier.
   Mesure : un téléchargement ou un partage réussi envoie à GoatCounter l'événement « carte-generee », sans aucune donnée
   de la carte (rien si le visiteur a refusé la mesure : clé skipgc). Le total public n'est lu que si COMPTEUR.actif. */
(function(){
 "use strict";
 const page=document.getElementById("cj-page"),D=window.PA_CARTE;
 if(!page||!D)return;
 const CALC=D.calcul,CLES=D.CLES,NB=D.QUESTIONS.length;
 const CLE_CARTE="pa-carte",CLE_PHOTO="pa-carte-photo";
 // Libellés des paliers du test de niveau (0 à 5) : affichage seulement, jamais convertis en niveau 1 à 10
 const PALIERS=["Découverte","P25","P100","P250","P500","P1000 et +"];
 const PHOTO_L=600,PHOTO_H=480; // zone photo de la carte (600 × 480 sur une base de 600 × 900), même rapport que le recadrage
 const el=(b,c,t)=>{const x=document.createElement(b);if(c)x.className=c;if(t!==undefined)x.textContent=t;return x;};
 const $=id=>document.getElementById(id);
 const borne=n=>Math.max(1,Math.min(99,Math.round(n)));
 const lireJ=(cle,defaut)=>{try{const v=JSON.parse(localStorage.getItem(cle)||"null");return v===null?defaut:v;}catch(e){return defaut;}};
 const ecrire=(cle,v)=>{try{localStorage.setItem(cle,typeof v==="string"?v:JSON.stringify(v));return true;}catch(e){return false;}};
 const retirer=cle=>{try{localStorage.removeItem(cle);}catch(e){}};

 /* ---- État ---- */
 const etat={reponses:Array(NB).fill(null),ajustements:{},poste:null,pseudo:"",sansBase:false,photo:null,imgPhoto:null,etape:"intro",modele:"neon"};
 let iQuestion=0;

 /* ---- Modèles de carte (dessinés par carte-rendu.js) : repli sur le seul modèle Néon si la liste n'existe pas ---- */
 const MODELE_DEFAUT={cle:"neon",nom:"Néon",description:""};
 function modeles(){
  const R=window.CARTE_RENDU,l=R&&Array.isArray(R.MODELES)?R.MODELES.filter(m=>m&&typeof m.cle==="string"&&m.cle):[];
  return l.length?l:[MODELE_DEFAUT];
 }
 const choixPossible=()=>modeles().length>1;
 const modeleValide=cle=>modeles().some(m=>m.cle===cle);
 const modeleCourant=()=>modeles().find(m=>m.cle===etat.modele)||modeles()[0];

 /* ---- Repère de départ (lecture seule) : palier du test, sinon niveau Mon académie ---- */
 function lireRepere(){
  const q=lireJ("pa-quiz-dernier",null);
  if(q&&Number.isInteger(q.palier)&&q.palier>=0&&q.palier<=5)return {palier:q.palier,libelle:PALIERS[q.palier]+" (test de niveau)",carte:PALIERS[q.palier]+" · test de niveau"};
  const a=lireJ("pa-academie",null);
  if(a&&Number.isInteger(a.niveau)&&a.niveau>=1&&a.niveau<=10)return {niveau:a.niveau,libelle:"niveau "+a.niveau+" sur 10 (Mon académie)",carte:"Niveau "+a.niveau+" sur 10 · Mon académie"};
  return null;
 }
 const repere=lireRepere();
 const baseCalcul=()=>repere&&!etat.sansBase?(Number.isInteger(repere.palier)?{palier:repere.palier}:{niveau:repere.niveau}):null;

 /* ---- Calcul : notes brutes + ajustements bornés, globale, rang ---- */
 function ajustement(cle){const a=Number(etat.ajustements[cle])||0;return Math.max(-5,Math.min(5,Math.round(a)));}
 function calculer(){
  const c=CALC.carte(etat.reponses,{base:baseCalcul(),poste:etat.poste});
  const notes={};CLES.forEach(k=>{notes[k]=borne(c.notes[k]+ajustement(k));});
  const poste=etat.poste||c.posteSuggere,globale=CALC.globale(notes,poste);
  return {brutes:c.notes,notes,poste,posteSuggere:c.posteSuggere,globale,rang:CALC.rang(globale)};
 }
 const complet=()=>etat.reponses.every((r,i)=>Number.isInteger(r)&&r>=0&&r<D.QUESTIONS[i].r.length);
 const libPoste=cle=>(D.POSTES.find(p=>p.cle===cle)||{}).libelle||"";
 const libRang=cle=>(D.RANGS.find(r=>r.cle===cle)||{}).libelle||"";
 const libAttr=cle=>(D.ATTRIBUTS.find(a=>a.cle===cle)||{}).libelle||cle;

 /* ---- Sauvegarde de la carte (sans la photo, gardée à part) ---- */
 function sauver(){
  if(!complet())return;
  ecrire(CLE_CARTE,{version:1,date:new Date().toISOString(),reponses:etat.reponses.slice(),ajustements:CLES.reduce((o,k)=>{o[k]=ajustement(k);return o;},{}),
   poste:etat.poste,pseudo:etat.pseudo,sansBase:etat.sansBase,base:baseCalcul(),modele:modeleCourant().cle,
   photo:!!etat.photo}); // photo:false : la photo encore gardée dans pa-carte-photo appartient à une carte précédente
 }
 function restaurer(){
  const s=lireJ(CLE_CARTE,null);
  if(!s||s.version!==1||!Array.isArray(s.reponses)||s.reponses.length!==NB)return false;
  etat.reponses=s.reponses.map((r,i)=>Number.isInteger(r)&&r>=0&&r<D.QUESTIONS[i].r.length?r:null);
  if(!complet()){etat.reponses=Array(NB).fill(null);return false;}
  etat.ajustements={};CLES.forEach(k=>{etat.ajustements[k]=Math.max(-5,Math.min(5,Number(s.ajustements&&s.ajustements[k])||0));});
  etat.poste=D.POSTES.some(p=>p.cle===s.poste)?s.poste:null;
  etat.pseudo=typeof s.pseudo==="string"?s.pseudo:"";
  etat.sansBase=!!s.sansBase;
  if(typeof s.modele==="string"&&modeleValide(s.modele))etat.modele=s.modele; // modèle inconnu (retiré depuis) : premier de la liste
  return s;
 }

 /* ---- Étapes ---- */
 const ETAPES=["intro","quiz","notes","photo","pseudo","final"];
 const carteGardee=()=>{const s=lireJ(CLE_CARTE,null);return !!(s&&s.version===1&&Array.isArray(s.reponses)&&s.reponses.length===NB);};
 function allerA(nom,focus){
  etat.etape=nom;
  page.querySelectorAll(".cj-etape").forEach(z=>{z.hidden=z.dataset.etape!==nom;});
  const pas=$("cj-pas");
  if(pas){
   const k=ETAPES.indexOf(nom);
   pas.querySelectorAll("li").forEach(li=>{
    const j=ETAPES.indexOf(li.dataset.pas);
    if(j===k)li.setAttribute("aria-current","step");else li.removeAttribute("aria-current");
    li.classList.toggle("cj-pas-fait",j<k);
   });
  }
  // « Faire une nouvelle carte » en haut : seulement si une carte est gardée, et hors étape Carte (qui a son propre bouton)
  const haut=$("cj-nouvelle-haut");
  if(haut)haut.hidden=nom==="final"||!carteGardee();
  const apercu=$("cj-apercu");
  if(apercu){apercu.hidden=!complet()||nom==="quiz"||nom==="intro";if(!apercu.hidden)rendreApercu();else if(arretApercu){arretApercu();arretApercu=null;}}
  if(focus){
   const z=page.querySelector('.cj-etape[data-etape="'+nom+'"] h2');
   if(z){z.scrollIntoView({block:"nearest"});z.focus({preventScroll:true});}
  }
 }

 /* ---- Questionnaire ---- */
 function melanger(n){const a=[...Array(n).keys()];for(let k=n-1;k>0;k--){const j=Math.floor(Math.random()*(k+1));[a[k],a[j]]=[a[j],a[k]];}return a;}
 function montrerRepere(){
  const bloc=$("cj-base"),txt=$("cj-base-txt"),case_=$("cj-sans-base");
  if(!bloc||!txt||!case_)return;
  if(!repere){bloc.hidden=true;return;}
  bloc.hidden=false;
  // Le texte suit la case : repère appliqué, ou ignoré (cas par défaut d'une nouvelle carte, peut-être pour quelqu'un d'autre)
  const texte=()=>{txt.textContent=etat.sansBase
   ?"Repère de ton niveau ignoré : décoche la case pour l'utiliser si la carte est pour toi. Ton repère : "+repere.libelle+"."
   :"Tes notes partent de ton repère : "+repere.libelle+". Elles resteront dans une plage cohérente avec ce repère.";};
  case_.checked=etat.sansBase;texte();
  case_.onchange=()=>{etat.sansBase=case_.checked;texte();if(complet()){rendreNotes();sauver();}};
 }
 function rendreQuestion(focus){
  const q=D.QUESTIONS[iQuestion],titre=$("cj-qtext"),opts=$("cj-qopts");
  $("cj-qnum").textContent="Situation "+(iQuestion+1)+" sur "+NB;
  $("cj-qbar").style.width=(iQuestion/NB*100)+"%";
  titre.textContent=q.q;
  opts.textContent="";
  melanger(q.r.length).forEach(k=>{
   const b=el("button","qopt",q.r[k].t);b.type="button";
   b.addEventListener("click",()=>{
    etat.reponses[iQuestion]=k;
    iQuestion++;
    if(iQuestion<NB){rendreQuestion(true);return;}
    // Questionnaire terminé : ajustements remis à zéro, poste à choisir
    etat.ajustements={};
    sauver();rendreNotes();allerA("notes",true);
   });
   opts.appendChild(b);
  });
  if(focus)titre.focus();
 }
 function demarrerQuestionnaire(focus){
  iQuestion=0;etat.reponses=Array(NB).fill(null);etat.ajustements={};
  montrerRepere();allerA("quiz",false);rendreQuestion(focus);
 }
 /* Nouvelle carte (pour soi ou pour un ami) : tout repart de zéro, repère ignoré par défaut. Rien n'est effacé ici :
    pa-carte n'est remplacée qu'à la fin du questionnaire (sauver), pa-carte-photo seulement au choix d'une nouvelle photo. */
 function nouvelleCarte(){
  etat.reponses=Array(NB).fill(null);etat.ajustements={};etat.poste=null;etat.pseudo="";
  etat.modele=MODELE_DEFAUT.cle;etat.sansBase=true;
  // Photo en mémoire seulement (le fichier gardé reste sur l'appareil tant qu'aucune nouvelle photo n'est choisie)
  clearTimeout(minuteurPhoto);rec.img=null;rec.z=1;rec.drag=null;
  const recad=$("cj-recadrage");if(recad)recad.hidden=true;
  if(zoom){zoom.value="1";if(zoomVal)zoomVal.textContent="×1,0";}
  poserPhoto(null,false);messagePhoto("");
  if(champPseudo){champPseudo.value="";champPseudo.removeAttribute("aria-invalid");const c=champPseudo.closest(".champ");if(c)c.classList.remove("invalide");}
  if(errPseudo)errPseudo.textContent="";
  majBoutonsModeles();messageFinal("");
  const fmt=page.querySelector('input[name="cj-format"][value="carte"]');if(fmt)fmt.checked=true;
  const m=$("cj-retrouvee");if(m){m.hidden=true;m.textContent="";} // le message parlait de la carte précédente
  demarrerQuestionnaire(false);
  annoncer("Nouvelle carte : tout repart de zéro.");
  const t=page.querySelector('.cj-etape[data-etape="quiz"] h2');
  if(t){t.scrollIntoView({block:"nearest"});t.focus({preventScroll:true});}
 }
 // Annonce aux lecteurs d'écran (vidée puis posée : une même phrase est relue)
 function annoncer(txt){
  const z=$("cj-annonce");if(!z)return;
  z.textContent="";requestAnimationFrame(()=>{z.textContent=txt;});
 }

 /* ---- Notes et poste ---- */
 function rendreNotes(){
  const r=calculer();
  $("cj-globale").textContent=r.globale;
  const tag=$("cj-rang-tag");tag.textContent=libRang(r.rang);tag.className="tag rang-"+r.rang;
  $("cj-suggestion").textContent="Poste suggéré d'après tes réponses : "+libPoste(r.posteSuggere)+"."+(etat.poste?"":" Choisis ton poste, ou garde la suggestion.");
  const postes=$("cj-postes");postes.textContent="";
  D.POSTES.forEach(p=>{
   const b=el("button","",p.libelle);b.type="button";b.setAttribute("aria-pressed",String(r.poste===p.cle));b.title=p.desc;
   b.addEventListener("click",()=>{etat.poste=p.cle;rendreNotes();sauver();});
   postes.appendChild(b);
  });
  const liste=$("cj-notes-liste");liste.textContent="";
  D.ATTRIBUTS.forEach(a=>{
   const li=el("li","cj-note");
   const lab=el("label","cj-note-libelle");lab.htmlFor="cj-n-"+a.cle;lab.append(el("b","",a.libelle)," ",el("small","",a.desc));
   const range=el("div","range");
   const inp=document.createElement("input");inp.type="range";inp.id="cj-n-"+a.cle;inp.step="1";
   const brute=r.brutes[a.cle];inp.min=String(Math.max(1,brute-5));inp.max=String(Math.min(99,brute+5));inp.value=String(r.notes[a.cle]);
   inp.setAttribute("aria-valuetext",r.notes[a.cle]+" sur 99, valeur calculée "+brute);
   const out=el("output","",String(r.notes[a.cle]));out.htmlFor=inp.id;
   inp.addEventListener("input",()=>{
    const v=Math.max(Number(inp.min),Math.min(Number(inp.max),Math.round(Number(inp.value)||brute)));
    etat.ajustements[a.cle]=v-brute;
    const rr=calculer();
    out.textContent=rr.notes[a.cle];inp.setAttribute("aria-valuetext",rr.notes[a.cle]+" sur 99, valeur calculée "+brute);
    $("cj-globale").textContent=rr.globale;tag.textContent=libRang(rr.rang);tag.className="tag rang-"+rr.rang;
    rendreApercu();
   });
   inp.addEventListener("change",sauver);
   range.append(inp,out);
   li.append(lab,range);
   liste.appendChild(li);
  });
  rendreApercu();
 }

 /* ---- Photo : choix, recadrage (zoom + déplacement), résultat gardé en 600 × 480 ---- */
 const cadre=$("cj-cadre"),zoom=$("cj-zoom"),zoomVal=$("cj-zoom-val");
 const rec={img:null,z:1,ox:0,oy:0,drag:null};
 let minuteurPhoto=0;
 function messagePhoto(txt,classe){
  const m=$("cj-photo-msg");if(!m)return;
  m.hidden=!txt;m.textContent=txt||"";m.className="msg "+(classe||"msg-alerte");
 }
 // Dimensions de l'image à l'échelle courante, et bornes du déplacement (l'image couvre toujours le cadre)
 function geometrie(){
  const iw=rec.img.width,ih=rec.img.height,s0=Math.max(PHOTO_L/iw,PHOTO_H/ih),s=s0*rec.z;
  return {dw:iw*s,dh:ih*s};
 }
 function bornerOffset(){
  const g=geometrie();
  rec.ox=Math.min(0,Math.max(PHOTO_L-g.dw,rec.ox));rec.oy=Math.min(0,Math.max(PHOTO_H-g.dh,rec.oy));
 }
 function dessinerCadre(){
  if(!cadre||!rec.img)return;
  const ctx=cadre.getContext("2d"),g=geometrie();
  bornerOffset();
  ctx.clearRect(0,0,PHOTO_L,PHOTO_H);
  ctx.drawImage(rec.img,rec.ox,rec.oy,g.dw,g.dh);
 }
 // Résultat du recadrage : dataURL JPEG 600 × 480, gardé sur l'appareil et posé sur l'aperçu
 function validerRecadrage(){
  if(!rec.img)return;
  const c=document.createElement("canvas");c.width=PHOTO_L;c.height=PHOTO_H;
  const ctx=c.getContext("2d"),g=geometrie();
  ctx.fillStyle="#101F35";ctx.fillRect(0,0,PHOTO_L,PHOTO_H);
  ctx.drawImage(rec.img,rec.ox,rec.oy,g.dw,g.dh);
  let url=c.toDataURL("image/jpeg",0.86);
  if(url.length>900000)url=c.toDataURL("image/jpeg",0.6); // sécurité : jamais au-dessus de ~1 Mo
  poserPhoto(url,true);
 }
 function recadragePlusTard(){clearTimeout(minuteurPhoto);minuteurPhoto=setTimeout(validerRecadrage,150);}
 function poserPhoto(url,sauvegarder){
  etat.photo=url||null;
  const ap=$("cj-depot-apercu"),ret=$("cj-retirer-photo");
  if(ap){ap.hidden=!url;if(url)ap.src=url;else ap.removeAttribute("src");}
  if(ret)ret.hidden=!url;
  if(sauvegarder){
   if(url){if(!ecrire(CLE_PHOTO,url))messagePhoto("La photo est gardée pour cette visite seulement : ton navigateur manque de place pour la conserver.","msg-alerte");}
   else retirer(CLE_PHOTO);
   sauver(); // présence de la photo notée dans pa-carte (rien si la carte n'est pas terminée)
  }
  if(!url){etat.imgPhoto=null;rendreApercu();return;}
  const img=new Image();
  img.onload=()=>{etat.imgPhoto=img;rendreApercu();};
  img.src=url;
 }
 // Image choisie : décodée, réduite si elle est très grande (dessin fluide), puis recadrage ouvert
 function chargerFichier(fichier){
  if(!fichier)return;
  if(!/^image\//.test(fichier.type||"")){messagePhoto("Choisis un fichier image (JPG, PNG ou WebP).");return;}
  messagePhoto("");
  const url=URL.createObjectURL(fichier),img=new Image();
  img.onload=()=>{
   URL.revokeObjectURL(url);
   const max=1600,k=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight));
   const c=document.createElement("canvas");c.width=Math.max(1,Math.round(img.naturalWidth*k));c.height=Math.max(1,Math.round(img.naturalHeight*k));
   c.getContext("2d").drawImage(img,0,0,c.width,c.height);
   rec.img=c;rec.z=1;
   if(zoom){zoom.value="1";zoomVal.textContent="×1,0";}
   const g=geometrie();rec.ox=(PHOTO_L-g.dw)/2;rec.oy=(PHOTO_H-g.dh)*0.25;
   $("cj-recadrage").hidden=false;
   dessinerCadre();validerRecadrage();
   cadre.focus({preventScroll:true});cadre.scrollIntoView({block:"nearest"});
  };
  img.onerror=()=>{URL.revokeObjectURL(url);messagePhoto("Ce format d'image n'est pas lu par ton navigateur. Essaie avec un JPG ou un PNG.");};
  img.src=url;
 }
 ["cj-fichier","cj-capture"].forEach(id=>{const i=$(id);if(i)i.addEventListener("change",()=>{chargerFichier(i.files&&i.files[0]);i.value="";});});
 if(cadre){
  // Déplacement au doigt ou à la souris (coordonnées ramenées à l'échelle 600 × 480 du canvas)
  const echelle=()=>PHOTO_L/(cadre.getBoundingClientRect().width||PHOTO_L);
  cadre.addEventListener("pointerdown",e=>{if(!rec.img)return;rec.drag={x:e.clientX,y:e.clientY,ox:rec.ox,oy:rec.oy};cadre.setPointerCapture(e.pointerId);e.preventDefault();});
  cadre.addEventListener("pointermove",e=>{if(!rec.drag)return;const k=echelle();rec.ox=rec.drag.ox+(e.clientX-rec.drag.x)*k;rec.oy=rec.drag.oy+(e.clientY-rec.drag.y)*k;dessinerCadre();});
  const fin=()=>{if(!rec.drag)return;rec.drag=null;recadragePlusTard();};
  cadre.addEventListener("pointerup",fin);cadre.addEventListener("pointercancel",fin);
  // Clavier : flèches = déplacement de 10 px (image), + et - = zoom
  cadre.addEventListener("keydown",e=>{
   if(!rec.img)return;
   const pas=e.shiftKey?40:10;let fait=true;
   if(e.key==="ArrowLeft")rec.ox-=pas;else if(e.key==="ArrowRight")rec.ox+=pas;else if(e.key==="ArrowUp")rec.oy-=pas;else if(e.key==="ArrowDown")rec.oy+=pas;
   else if(e.key==="+"||e.key==="=")reglerZoom(rec.z+0.1);else if(e.key==="-")reglerZoom(rec.z-0.1);else fait=false;
   if(!fait)return;
   e.preventDefault();dessinerCadre();recadragePlusTard();
  });
 }
 function reglerZoom(z){
  const avant=geometrie();
  rec.z=Math.max(1,Math.min(3,Math.round(z*20)/20));
  const apres=geometrie();
  // Le zoom garde le centre du cadre en place
  rec.ox=PHOTO_L/2-(PHOTO_L/2-rec.ox)*apres.dw/avant.dw;rec.oy=PHOTO_H/2-(PHOTO_H/2-rec.oy)*apres.dh/avant.dh;
  if(zoom){zoom.value=String(rec.z);zoomVal.textContent="×"+rec.z.toFixed(1).replace(".",",");}
 }
 if(zoom)zoom.addEventListener("input",()=>{if(!rec.img)return;reglerZoom(Number(zoom.value));dessinerCadre();recadragePlusTard();});
 const retirerBtn=$("cj-retirer-photo");
 if(retirerBtn)retirerBtn.addEventListener("click",()=>{
  rec.img=null;$("cj-recadrage").hidden=true;poserPhoto(null,true);messagePhoto("Photo retirée : la carte affichera tes initiales.","msg-info");
  const f=$("cj-fichier");if(f)f.focus();
 });

 /* ---- Pseudo ---- */
 const REGLE_PSEUDO=/^[\p{L}\p{N} _.'’-]{2,30}$/u;
 function pseudoValide(p){
  if(typeof p!=="string")return false;
  const t=p.trim();
  if(!REGLE_PSEUDO.test(t))return false;
  const c=window.PA_COMPTE;
  if(c&&typeof c.pseudoValide==="function")return c.pseudoValide(t);
  // Règle locale si compte.js n'est pas là : ni adresse, ni numéro de téléphone
  if(/@|\.(fr|com|net|org|eu|io)(?![\p{L}])/u.test(t.toLowerCase()))return false;
  return !/[0-9]{9,}/.test(t.replace(/[^\p{L}\p{N}]/gu,""));
 }
 const champPseudo=$("cj-pseudo"),errPseudo=$("cj-pseudo-err"),formPseudo=$("cj-pseudo-form");
 if(formPseudo)formPseudo.addEventListener("submit",ev=>{
  ev.preventDefault();
  const v=(champPseudo.value||"").trim();
  if(!pseudoValide(v)){
   errPseudo.textContent=v.length<2?"Entre au moins 2 caractères.":"Ce nom n'est pas accepté. 2 à 30 caractères : lettres, chiffres, espaces, tirets bas, points, apostrophes ou tirets. Pas d'e-mail, de numéro ni de lien.";
   champPseudo.setAttribute("aria-invalid","true");champPseudo.closest(".champ").classList.add("invalide");champPseudo.focus();return;
  }
  errPseudo.textContent="";champPseudo.removeAttribute("aria-invalid");champPseudo.closest(".champ").classList.remove("invalide");
  etat.pseudo=v;sauver();rendreFinal();allerA("final",true);
 });
 if(champPseudo)champPseudo.addEventListener("input",()=>{champPseudo.removeAttribute("aria-invalid");errPseudo.textContent="";champPseudo.closest(".champ").classList.remove("invalide");});
 // Pseudo du profil, si le joueur est connecté et si la table des profils est activée (sinon aucun appel)
 function proposerPseudoDuProfil(){
  const c=window.PA_COMPTE;
  if(!c||!c.actif||!champPseudo)return;
  const activee=((window.PA_SUPABASE||{}).activees||[]).includes("profiles");
  if(!activee||typeof c.loadProfile!=="function")return;
  c.ready.then(async()=>{
   if(!c.user||etat.pseudo||champPseudo.value)return;
   try{const r=await c.loadProfile();if(r&&r.ok&&r.profile&&typeof r.profile.pseudo==="string"&&pseudoValide(r.profile.pseudo)&&!champPseudo.value)champPseudo.value=r.profile.pseudo;}catch(e){}
  });
 }

 /* ---- Aperçu (canvas dessiné par carte-rendu.js, même dessin que l'image exportée) et description accessible ---- */
 function initiales(p){
  const R=window.CARTE_RENDU;
  if(R&&typeof R.initiales==="function")return R.initiales(p);
  const m=String(p||"").trim().split(/[\s-]+/).filter(Boolean);
  return m.length?(m.length>1?m[0][0]+m[m.length-1][0]:m[0].slice(0,2)).toUpperCase():"";
 }
 function description(r){
  const nom=etat.pseudo?" de "+etat.pseudo:"",ini=initiales(etat.pseudo);
  return "Carte de joueur"+nom+" : "+r.globale+", "+libRang(r.rang)+", poste "+libPoste(r.poste).toLowerCase()+". "+
   CLES.map(k=>libAttr(k)+" "+r.notes[k]).join(", ")+". "+(etat.photo?"Avec ta photo.":"Sans photo"+(ini?", initiales "+ini:"")+".")+
   (choixPossible()?" Modèle "+modeleCourant().nom+".":"");
 }
 function donneesRendu(r){
  return {pseudo:etat.pseudo||"Joueur",poste:libPoste(r.poste),globale:r.globale,rang:r.rang,attributs:CLES.map(k=>({cle:k,note:r.notes[k]})),
   photo:etat.imgPhoto,niveau:repere&&!etat.sansBase?repere.carte:""};
 }
 // Le dessin (coûteux) est regroupé par image d'écran ; la description et le rang sont posés tout de suite.
 // Élite : la bordure est animée par CARTE_RENDU.animer, qui renvoie une fonction d'arrêt (appelée avant tout nouveau dessin).
 let arretApercu=null,apercuPrevu=0;
 function rendreApercu(){
  const canvas=$("cj-apercu-canvas"),R=window.CARTE_RENDU;
  if(!canvas||!R||!complet())return;
  const r=calculer();
  canvas.setAttribute("aria-label",description(r));
  canvas.className="cj-apercu-canvas rang-"+r.rang;
  canvas.dataset.modele=modeleCourant().cle;
  if(etat.etape==="final")miniaturesPlusTard();
  if(apercuPrevu)return;
  apercuPrevu=requestAnimationFrame(()=>{
   apercuPrevu=0;if(arretApercu)arretApercu();
   arretApercu=R.animer(canvas,donneesRendu(calculer()),{format:"carte",modele:modeleCourant().cle,largeur:Math.min(1200,Math.round(420*Math.max(1,window.devicePixelRatio||1)))});
  });
 }

 /* ---- Choix du modèle : un bouton par modèle, avec une miniature dessinée avec les vraies données (sans animation) ---- */
 const groupeModeles=$("cj-modeles"),blocModeles=$("cj-modeles-bloc");
 let miniaturesPrevu=0,generationMiniatures=0;
 function construireModeles(){
  if(!groupeModeles)return;
  const liste=modeles();
  if(blocModeles)blocModeles.hidden=liste.length<2; // un seul modèle : rien à choisir, groupe masqué
  if(liste.length<2||groupeModeles.childElementCount)return;
  liste.forEach(m=>{
   const b=el("button","cj-modele");b.type="button";b.dataset.modele=m.cle;
   if(m.description)b.title=m.description;
   const c=document.createElement("canvas");c.width=300;c.height=450;c.setAttribute("aria-hidden","true");
   b.append(c,el("span","cj-modele-nom",m.nom||m.cle));
   b.addEventListener("click",()=>choisirModele(m.cle));
   groupeModeles.appendChild(b);
  });
 }
 function majBoutonsModeles(){
  if(!groupeModeles)return;
  const cle=modeleCourant().cle;
  groupeModeles.querySelectorAll(".cj-modele").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.modele===cle)));
 }
 // Nouveau modèle : aperçu, image d'export et sauvegarde ; le questionnaire n'est pas refait
 function choisirModele(cle){
  if(!modeleValide(cle)||cle===etat.modele)return;
  etat.modele=cle;majBoutonsModeles();sauver();rendreApercu();
  if(etat.etape==="final")rendreImage(formatChoisi()).catch(()=>{});
 }
 // Miniatures redessinées une à une (la page reste fluide) quand les données de la carte changent
 function miniaturesPlusTard(){
  if(!groupeModeles||!choixPossible())return;
  clearTimeout(miniaturesPrevu);miniaturesPrevu=setTimeout(dessinerMiniatures,120);
 }
 async function dessinerMiniatures(){
  const R=window.CARTE_RENDU;
  if(!R||!complet())return;
  const gen=++generationMiniatures,donnees=donneesRendu(calculer());
  for(const b of groupeModeles.querySelectorAll(".cj-modele")){
   if(gen!==generationMiniatures)return; // un dessin plus récent a été demandé
   try{await R.dessiner(b.querySelector("canvas"),donnees,{format:"carte",modele:b.dataset.modele,largeur:300});}catch(e){}
  }
 }

 /* ---- Carte finale : image (carte ou story), téléchargement, partage ---- */
 function formatChoisi(){const r=page.querySelector('input[name="cj-format"]:checked');return r&&r.value==="story"?"story":"carte";}
 function messageFinal(txt,classe){const m=$("cj-final-msg");if(!m)return;m.hidden=!txt;m.textContent=txt||"";m.className="msg "+(classe||"msg-ok");}
 async function rendreImage(format){
  const R=window.CARTE_RENDU,canvas=$("cj-canvas");
  if(!R||!canvas)throw new Error("rendu indisponible");
  await R.dessiner(canvas,donneesRendu(calculer()),{format,modele:modeleCourant().cle,export:true});
  return canvas;
 }
 // Image exportée : WebP quand le navigateur sait l'encoder (Edge, Chrome, Firefox), sinon JPEG (Safari) ; qualité 0,9 dans les deux cas
 const EXPORT=(()=>{try{const c=document.createElement("canvas");c.width=c.height=1;return c.toDataURL("image/webp").startsWith("data:image/webp")?{type:"image/webp",ext:"webp"}:{type:"image/jpeg",ext:"jpg"};}catch(e){return {type:"image/jpeg",ext:"jpg"};}})();
 const NOM_FICHIER="ma-carte-padel."+EXPORT.ext;
 const enBlob=(canvas,q)=>new Promise((res,rej)=>{try{canvas.toBlob(b=>b?res(b):rej(new Error("image vide")),EXPORT.type,q);}catch(e){rej(e);}});
 // Objectif : 500 Ko au plus (WebP ≈ 300 Ko ; JPEG ≈ 480 Ko, ré-encodé à 0,82 si une photo très détaillée dépasse)
 const versBlob=async canvas=>{const b=await enBlob(canvas,0.9);return b.size>512000?enBlob(canvas,0.82):b;};
 function telechargerBlob(blob){
  const url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download=NOM_FICHIER;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),10000);
 }
 // Un bouton pendant son travail : désactivé, libellé « … », puis rendu tel quel
 async function avecAttente(btn,libelle,travail){
  const avant=btn.textContent;btn.disabled=true;btn.textContent=libelle;
  try{await travail();}finally{btn.disabled=false;btn.textContent=avant;}
 }
 function rendreFinal(){
  const r=calculer();
  $("cj-resume").textContent=(etat.pseudo||"Toi")+" : "+r.globale+" en "+libRang(r.rang)+", poste "+libPoste(r.poste).toLowerCase()+". "+
   (etat.photo?"Avec ta photo.":"Sans photo : tes initiales apparaissent.")+" Choisis un format puis télécharge ou partage l'image.";
  messageFinal("");
  const R=window.CARTE_RENDU,t=$("cj-telecharger"),p=$("cj-partager");
  if(!R){t.disabled=true;p.disabled=true;messageFinal("Le rendu de l'image n'est pas disponible sur cette version de la page.","msg-alerte");}
  construireModeles();majBoutonsModeles();miniaturesPlusTard();
  rendreImage(formatChoisi()).catch(()=>{});
 }
 /* ---- Mesure : une carte générée = un événement GoatCounter, sans aucune donnée de la carte ---- */
 function compterCarte(){
  try{if(localStorage.getItem("skipgc")==="t")return;}catch(e){} // refus de la mesure (case de la page Confidentialité)
  try{const g=window.goatcounter;if(g&&typeof g.count==="function")g.count({path:"carte-generee",title:"Carte de joueur générée",event:true});}catch(e){}
 }
 /* Total public des cartes générées : compteur de visites GoatCounter au format JSON, {count:"1 234"} (chaîne avec le
    séparateur de milliers choisi dans les réglages ; 404 tant qu'aucune carte n'a été comptée). Tant que l'option
    « Allow adding visitor counts on your website » n'est pas cochée dans GoatCounter, l'adresse répond 403 sans en-tête
    CORS, ce qui affiche une erreur dans la console du visiteur : actif reste à false jusqu'à ce que Samuel l'ait cochée. */
 const COMPTEUR={actif:true,adresse:"https://apprendre-padel.goatcounter.com/counter/carte-generee.json"};
 function afficherCompteur(){
  const zone=$("cj-compteur");
  if(!zone||!COMPTEUR.actif||navigator.onLine===false||typeof fetch!=="function")return;
  try{
   fetch(COMPTEUR.adresse,{credentials:"omit",cache:"no-store"})
    .then(r=>r.ok?r.json():null)
    .then(j=>{
     const n=j&&(typeof j.count==="string"||typeof j.count==="number")?parseInt(String(j.count).replace(/\D/g,""),10):NaN;
     if(!Number.isFinite(n)||n<1)return;
     zone.textContent=n.toLocaleString("fr-FR")+(n>1?" cartes créées":" carte créée")+" sur Apprendre Padel";
    })
    .catch(()=>{});
  }catch(e){}
 }
 const btnTel=$("cj-telecharger"),btnPart=$("cj-partager");
 if(btnTel)btnTel.addEventListener("click",()=>avecAttente(btnTel,"Préparation…",async()=>{
  try{const blob=await versBlob(await rendreImage(formatChoisi()));telechargerBlob(blob);compterCarte();messageFinal("Image prête : "+NOM_FICHIER+" ("+(formatChoisi()==="story"?"1080 × 1920":"1200 × 1800")+").","msg-ok");}
  catch(e){messageFinal("Impossible de fabriquer l'image. Réessaie, ou change de navigateur.","msg-erreur");}
 }));
 if(btnPart)btnPart.addEventListener("click",()=>avecAttente(btnPart,"Préparation…",async()=>{
  try{
   const blob=await versBlob(await rendreImage(formatChoisi()));
   let fichier=null;
   try{fichier=new File([blob],NOM_FICHIER,{type:EXPORT.type});}catch(e){}
   if(fichier&&navigator.share&&navigator.canShare&&navigator.canShare({files:[fichier]})){
    try{await navigator.share({files:[fichier],title:"Ma carte de joueur de padel",text:"Ma carte de joueur de padel, faite sur apprendre-padel.fr"});compterCarte();messageFinal("Carte partagée.","msg-ok");}
    catch(e){if(e&&e.name!=="AbortError"){messageFinal("Le partage n'a pas abouti : l'image a été téléchargée à la place.","msg-alerte");telechargerBlob(blob);compterCarte();}}
   }else{telechargerBlob(blob);compterCarte();messageFinal("Ton navigateur ne propose pas le partage de fichiers : l'image est téléchargée, à partager depuis ton dossier de téléchargements.","msg-info");}
  }catch(e){messageFinal("Impossible de fabriquer l'image. Réessaie, ou change de navigateur.","msg-erreur");}
 }));
 page.querySelectorAll('input[name="cj-format"]').forEach(r=>r.addEventListener("change",()=>{if(etat.etape==="final")rendreImage(formatChoisi()).catch(()=>{});}));

 /* ---- Navigation entre étapes ---- */
 const sur=(id,fn)=>{const b=$(id);if(b)b.addEventListener("click",fn);};
 sur("cj-commencer",()=>demarrerQuestionnaire(true));
 sur("cj-refaire-1",()=>demarrerQuestionnaire(true));
 sur("cj-refaire-2",()=>demarrerQuestionnaire(true));
 sur("cj-nouvelle-1",nouvelleCarte);
 sur("cj-nouvelle-2",nouvelleCarte);
 sur("cj-vers-photo",()=>allerA("photo",true));
 sur("cj-retour-notes",()=>{rendreNotes();allerA("notes",true);});
 sur("cj-vers-pseudo",()=>{if(champPseudo&&!champPseudo.value&&etat.pseudo)champPseudo.value=etat.pseudo;allerA("pseudo",true);});
 sur("cj-retour-photo",()=>allerA("photo",true));
 sur("cj-modifier-notes",()=>{rendreNotes();allerA("notes",true);});
 sur("cj-modifier-photo",()=>allerA("photo",true));
 sur("cj-modifier-pseudo",()=>{if(champPseudo)champPseudo.value=etat.pseudo;allerA("pseudo",true);});

 /* ---- Démarrage : carte retrouvée ou intro ---- */
 const photoGardee=(()=>{try{const v=localStorage.getItem(CLE_PHOTO);return v&&/^data:image\//.test(v)&&v.length<1500000?v:null;}catch(e){return null;}})();
 const sauvee=restaurer();
 // Photo gardée posée, sauf si la carte gardée a été faite sans photo (photo:false : c'est celle d'une carte précédente)
 if(photoGardee&&!(sauvee&&sauvee.photo===false))poserPhoto(photoGardee,false);
 proposerPseudoDuProfil();
 afficherCompteur();
 if(sauvee){
  montrerRepere();rendreNotes();
  if(champPseudo)champPseudo.value=etat.pseudo;
  const quand=(()=>{try{return new Date(sauvee.date).toLocaleDateString("fr-FR",{day:"numeric",month:"long"});}catch(e){return "";}})();
  const m=$("cj-retrouvee");if(m){m.hidden=false;m.textContent="Ta carte"+(quand?" du "+quand:"")+" est gardée sur cet appareil : tu la retrouves ci-dessous, et tu peux la modifier, refaire tes réponses ou faire une nouvelle carte.";}
  if(etat.pseudo){rendreFinal();allerA("final",false);}
  else allerA("pseudo",false);
 }else allerA("intro",false);
})();
