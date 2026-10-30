/* MA CARTE DE JOUEUR · logique de la page carte.html.
   Données et moteur : carte-donnees.js (window.PA_CARTE : attributs, postes, rangs, calcul de la globale) ;
   rendu image : carte-rendu.js (window.CARTE_RENDU) ; styles : assets/carte.css. Tout se passe sur l'appareil :
   - pa-carte : la carte (JSON, version 2) : {version:2, date, notes:{VOL,AER,DEF,LOB,SER,TAC} de 1 à 99, poste,
     posteChoisi, rang (bronze, argent, or, elite), rangChoisi, pseudo, club (facultatif, "" par défaut ; une carte gardée
     avant l'ajout du club se lit sans, rien à convertir), modele, photo (présence d'une photo)} ;
     une carte version 1 (faite avec l'ancien questionnaire) est convertie sans rien perdre au premier chargement :
     notes calculées + ajustements, poste, pseudo, modèle, photo ; rang = rang calculé (non choisi) ;
   - pa-carte-photo : photo recadrée en 600 × 480 (dataURL JPEG, bien en dessous de 1 Mo), jamais envoyée.
   La page ne lit aucune autre donnée du joueur (ni le test de niveau, ni Mon académie).
   Club : champ libre de l'étape nom (40 caractères), suggestions tirées de assets/data/clubs.json (généré par
   scripts/generer-pages.js) chargées à la première prise de focus ; échec silencieux (hors connexion, fichier ouvert en local) :
   le champ reste libre. Texte nettoyé (caractères de contrôle retirés, espaces réduits), dessiné par carte-rendu.js.
   Parcours : intro → notes (6 curseurs de 1 à 99, poste, rang choisi librement) → photo → nom → carte (image à
   télécharger ou partager). Le rang suit la suggestion (CARTE_CALCUL.rang de la note globale) tant que le joueur n'en a
   pas choisi un ; ensuite son choix est gardé, même si la globale change. « Modifier mes notes » revient à l'étape notes en
   gardant tout ; « Faire une nouvelle carte » remet les notes à 60, poste et rang par défaut, sans photo ni nom, et ne
   remplace la carte gardée qu'au passage à l'étape photo (« Continuer : ma photo »).
   Une seule carte sans compte : un visiteur non connecté qui a déjà une carte gardée (pa-carte valide) peut la modifier
   (notes, photo, nom, modèle, format, téléchargement, partage), mais « Faire une nouvelle carte » affiche un message avec un
   lien vers connexion.html?suite=carte.html au lieu de repartir de zéro. Connecté : nouvelles cartes illimitées.
   Connexion constatée sans rien envoyer : PA_COMPTE.user une fois PA_COMPTE.ready résolu ; avant, ou si compte.js est
   inactif (SDK absent, hors connexion), session Supabase gardée dans le navigateur (sb-…-auth-token, même règle que nav.js).
   Le moindre doute (lecture impossible) compte comme « non connecté ».
   Chaque étape a son titre (tabindex -1) qui reçoit le focus quand on y arrive au clavier.
   Duel de cartes : « Défier un ami » (étape Carte) produit https://apprendre-padel.fr/carte.html#duel=<code> avec les notes de
   la carte (jamais la photo) ; à l'ouverture d'un tel lien, bandeau « <pseudo> te défie ! », puis écran du duel (voir plus bas).
   La carte de l'ami n'est jamais gardée sur l'appareil : elle vit dans le fragment de l'adresse et en mémoire.
   Mesure : un téléchargement ou un partage réussi envoie à GoatCounter l'événement « carte-generee », sans aucune donnée
   de la carte (rien si le visiteur a refusé la mesure : clé skipgc). Le total public n'est lu que si COMPTEUR.actif. */
(function(){
 "use strict";
 const page=document.getElementById("cj-page"),D=window.PA_CARTE;
 if(!page||!D)return;
 const CALC=D.calcul,CLES=D.CLES;
 const CLE_CARTE="pa-carte",CLE_PHOTO="pa-carte-photo";
 const NOTE_DEFAUT=60; // note de départ de chaque attribut (nouvelle carte)
 const PHOTO_L=600,PHOTO_H=480; // zone photo de la carte (600 × 480 sur une base de 600 × 900), même rapport que le recadrage
 const el=(b,c,t)=>{const x=document.createElement(b);if(c)x.className=c;if(t!==undefined)x.textContent=t;return x;};
 const $=id=>document.getElementById(id);
 const borne=n=>Math.max(1,Math.min(99,Math.round(n)));
 const lireJ=(cle,defaut)=>{try{const v=JSON.parse(localStorage.getItem(cle)||"null");return v===null?defaut:v;}catch(e){return defaut;}};
 const ecrire=(cle,v)=>{try{localStorage.setItem(cle,typeof v==="string"?v:JSON.stringify(v));return true;}catch(e){return false;}};
 const retirer=cle=>{try{localStorage.removeItem(cle);}catch(e){}};
 const notesDefaut=()=>CLES.reduce((o,k)=>{o[k]=NOTE_DEFAUT;return o;},{});
 const posteValide=cle=>D.POSTES.some(p=>p.cle===cle);
 const rangValide=cle=>D.RANGS.some(r=>r.cle===cle);
 /* Club : caractères de contrôle et marques de direction retirés, espaces réduits, 40 caractères au plus (sans couper un emoji).
    Même règle que CARTE_RENDU.nettoyerClub (repli local si carte-rendu.js est absent). */
 const CLUB_MAX=40;
 function nettoyerClub(s){
  const R=window.CARTE_RENDU;
  if(R&&typeof R.nettoyerClub==="function")return R.nettoyerClub(s);
  const t=String(typeof s==="string"?s:"").replace(/\p{Cc}/gu," ").replace(/[\u200B\u200E\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g,"").replace(/\s+/g," ").trim();
  return Array.from(t).slice(0,CLUB_MAX).join("").trim();
 }

 /* ---- État ----
    poste : null = suivre le poste suggéré ; rang : null = suivre le rang suggéré (rangChoisi false).
    enregistrable : false pour une carte neuve tant que l'étape notes n'est pas validée (l'ancienne carte reste gardée). */
 const etat={notes:notesDefaut(),poste:null,rang:null,rangChoisi:false,pseudo:"",club:"",photo:null,imgPhoto:null,etape:"intro",modele:"neon",enregistrable:false,
  duel:null}; // duel : {code, ami} tant qu'un défi reçu est ouvert (en mémoire seulement)

 /* ---- Modèles de carte (dessinés par carte-rendu.js) : repli sur le seul modèle Néon si la liste n'existe pas ---- */
 const MODELE_DEFAUT={cle:"neon",nom:"Néon",description:""};
 function modeles(){
  const R=window.CARTE_RENDU,l=R&&Array.isArray(R.MODELES)?R.MODELES.filter(m=>m&&typeof m.cle==="string"&&m.cle):[];
  return l.length?l:[MODELE_DEFAUT];
 }
 const choixPossible=()=>modeles().length>1;
 const modeleValide=cle=>modeles().some(m=>m.cle===cle);
 const modeleCourant=()=>modeles().find(m=>m.cle===etat.modele)||modeles()[0];

 /* ---- Calcul : globale d'après les notes et le poste, rang suggéré, rang retenu ---- */
 function calculer(){
  const notes={};CLES.forEach(k=>{notes[k]=borne(Number(etat.notes[k])||NOTE_DEFAUT);});
  const posteSuggere=CALC.posteSuggere(notes,null),poste=etat.poste||posteSuggere;
  const globale=CALC.globale(notes,poste),rangSuggere=CALC.rang(globale);
  const rang=etat.rangChoisi&&rangValide(etat.rang)?etat.rang:rangSuggere;
  return {notes,poste,posteSuggere,globale,rangSuggere,rang};
 }
 const libPoste=cle=>(D.POSTES.find(p=>p.cle===cle)||{}).libelle||"";
 const libRang=cle=>(D.RANGS.find(r=>r.cle===cle)||{}).libelle||"";
 const libAttr=cle=>(D.ATTRIBUTS.find(a=>a.cle===cle)||{}).libelle||cle;

 /* ---- Lecture de la carte gardée : version 2, ou version 1 convertie (sans écrire : voir restaurer) ---- */
 function lireCarte(){
  const s=lireJ(CLE_CARTE,null);
  if(!s||typeof s!=="object")return null;
  const commun={date:typeof s.date==="string"?s.date:"",pseudo:typeof s.pseudo==="string"?s.pseudo:"",club:nettoyerClub(s.club),
   modele:typeof s.modele==="string"?s.modele:"",photo:s.photo};
  if(s.version===2&&s.notes&&typeof s.notes==="object"){
   const notes={};
   for(const k of CLES){const v=Number(s.notes[k]);if(!Number.isFinite(v))return null;notes[k]=borne(v);}
   const rangChoisi=s.rangChoisi===true&&rangValide(s.rang);
   const poste=posteValide(s.poste)&&s.posteChoisi!==false?s.poste:null;
   return {...commun,notes,poste,rang:rangChoisi?s.rang:null,rangChoisi,migree:false};
  }
  // Version 1 (questionnaire) : notes = calcul des réponses avec le repère enregistré dans la carte + ajustements (±5)
  if(s.version===1&&Array.isArray(s.reponses)&&D.QUESTIONS&&s.reponses.length===D.QUESTIONS.length){
   const ok=s.reponses.every((r,i)=>Number.isInteger(r)&&r>=0&&r<D.QUESTIONS[i].r.length);
   if(!ok)return null;
   const base=s.base&&(Number.isInteger(s.base.palier)||Number.isInteger(s.base.niveau))?s.base:null;
   const brutes=CALC.notes(s.reponses,base),notes={};
   CLES.forEach(k=>{const a=Math.max(-5,Math.min(5,Math.round(Number(s.ajustements&&s.ajustements[k])||0)));notes[k]=borne(brutes[k]+a);});
   const poste=posteValide(s.poste)?s.poste:CALC.posteSuggere(notes,base);
   return {...commun,notes,poste,rang:null,rangChoisi:false,migree:true};
  }
  return null;
 }

 /* ---- Sauvegarde de la carte (sans la photo, gardée à part) ---- */
 function sauver(){
  if(!etat.enregistrable)return;
  const r=calculer();
  ecrire(CLE_CARTE,{version:2,date:new Date().toISOString(),notes:r.notes,poste:r.poste,posteChoisi:!!etat.poste,
   rang:r.rang,rangChoisi:etat.rangChoisi,pseudo:etat.pseudo,club:etat.club,modele:modeleCourant().cle,
   photo:!!etat.photo}); // photo:false : la photo encore gardée dans pa-carte-photo appartient à une carte précédente
 }
 function restaurer(){
  const s=lireCarte();
  if(!s)return false;
  etat.notes=s.notes;etat.poste=s.poste;etat.rang=s.rang;etat.rangChoisi=s.rangChoisi;etat.pseudo=s.pseudo;etat.club=s.club;
  if(s.modele&&modeleValide(s.modele))etat.modele=s.modele; // modèle inconnu (retiré depuis) : premier de la liste
  etat.enregistrable=true;
  return s;
 }

 /* ---- Étapes ---- */
 const ETAPES=["intro","notes","photo","pseudo","final"];
 const carteGardee=()=>!!lireCarte();
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
  masquerLimite();majAidesNouvelle();
  const apercu=$("cj-apercu");
  if(apercu){apercu.hidden=nom==="intro";if(!apercu.hidden)rendreApercu();else if(arretApercu){arretApercu();arretApercu=null;}}
  if(focus){
   const z=page.querySelector('.cj-etape[data-etape="'+nom+'"] h2');
   if(z){z.scrollIntoView({block:"nearest"});z.focus({preventScroll:true});}
  }
 }

 /* ---- Une seule carte sans compte ---- */
 // Session Supabase gardée dans le navigateur (lecture locale seulement, même règle que nav.js)
 function sessionGardee(){
  try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(/^sb-.+-auth-token$/.test(k||"")){const v=JSON.parse(localStorage.getItem(k)||"null");if(v&&(v.access_token||v.refresh_token||v.currentSession))return true;}}}catch(e){}
  return false;
 }
 let compteVerifie=false; // PA_COMPTE.ready résolu : PA_COMPTE.user fait foi
 function estConnecte(){
  try{
   const c=window.PA_COMPTE;
   if(c&&c.actif&&compteVerifie)return !!c.user;
   return sessionGardee();
  }catch(e){return false;}
 }
 // Nouvelle carte refusée : visiteur sans compte qui a déjà sa carte sur l'appareil
 const nouvelleLimitee=()=>!estConnecte()&&carteGardee();
 const AIDE_NOUVELLE_LIMITEE="Sans compte : une seule carte par appareil. Ta carte reste modifiable.";
 const aidesNouvelle={}; // id → texte d'origine de l'aide sous le bouton (écrit dans carte.html)
 function majAidesNouvelle(){
  ["cj-nouvelle-aide-1","cj-nouvelle-aide-2"].forEach(id=>{
   const a=$(id);if(!a)return;
   if(!(id in aidesNouvelle))aidesNouvelle[id]=a.textContent;
   a.textContent=nouvelleLimitee()?AIDE_NOUVELLE_LIMITEE:aidesNouvelle[id];
  });
 }
 function masquerLimite(){page.querySelectorAll(".cj-limite").forEach(m=>{m.hidden=true;});}
 // Message posé sous le bouton cliqué (créé une fois par bouton), puis focus dessus
 function montrerLimite(bouton){
  const bloc=bouton&&bouton.closest(".cj-nouvelle");if(!bloc)return;
  let m=bloc.querySelector(".cj-limite");
  if(!m){
   m=el("p","msg msg-info cj-limite");m.setAttribute("role","status");m.tabIndex=-1;
   const lien=el("a","","Crée un compte gratuit ou connecte-toi");lien.href="connexion.html?suite=carte.html";
   m.append("Sans compte, une seule carte par appareil. ",lien," pour en faire d'autres, par exemple pour tes amis. Ta carte actuelle reste modifiable.");
   bloc.appendChild(m);
  }
  m.hidden=false;
  m.focus({preventScroll:true});m.scrollIntoView({block:"nearest"});
 }
 function demanderNouvelleCarte(ev){
  if(nouvelleLimitee()){montrerLimite(ev&&ev.currentTarget);return;}
  masquerLimite();nouvelleCarte();
 }

 /* Nouvelle carte (pour soi ou pour un ami) : notes à 60, poste et rang suggérés, sans photo, ni nom, ni club. Rien n'est effacé ici :
    pa-carte n'est remplacée qu'en quittant l'étape notes, pa-carte-photo seulement au choix d'une nouvelle photo. */
 function nouvelleCarte(){
  etat.notes=notesDefaut();etat.poste=null;etat.rang=null;etat.rangChoisi=false;etat.pseudo="";etat.club="";
  etat.modele=MODELE_DEFAUT.cle;etat.enregistrable=false;
  // Photo en mémoire seulement (le fichier gardé reste sur l'appareil tant qu'aucune nouvelle photo n'est choisie)
  clearTimeout(minuteurPhoto);rec.img=null;rec.z=1;rec.drag=null;
  const recad=$("cj-recadrage");if(recad)recad.hidden=true;
  if(zoom){zoom.value="1";if(zoomVal)zoomVal.textContent="×1,0";}
  poserPhoto(null,false);messagePhoto("");
  if(champPseudo){champPseudo.value="";champPseudo.removeAttribute("aria-invalid");const c=champPseudo.closest(".champ");if(c)c.classList.remove("invalide");}
  if(errPseudo)errPseudo.textContent="";
  if(champClub)champClub.value="";
  majBoutonsModeles();messageFinal("");
  const fmt=page.querySelector('input[name="cj-format"][value="carte"]');if(fmt)fmt.checked=true;
  const m=$("cj-retrouvee");if(m){m.hidden=true;m.textContent="";} // le message parlait de la carte précédente
  rendreNotes();allerA("notes",true);
  annoncer("Nouvelle carte : tout repart de zéro.");
 }
 // Annonce aux lecteurs d'écran (vidée puis posée : une même phrase est relue)
 function annoncer(txt){
  const z=$("cj-annonce");if(!z)return;
  z.textContent="";requestAnimationFrame(()=>{z.textContent=txt;});
 }

 /* ---- Notes, poste et rang : les contrôles sont construits une fois (le focus reste en place), puis mis à jour ---- */
 const champs={}; // cle → {range, nombre}
 function construireNotes(){
  const liste=$("cj-notes-liste");
  if(liste&&!liste.childElementCount)D.ATTRIBUTS.forEach(a=>{
   const li=el("li","cj-note");
   const lab=el("label","cj-note-libelle");lab.htmlFor="cj-n-"+a.cle;lab.id="cj-l-"+a.cle;
   lab.append(el("b","",a.libelle)," ",el("small","",a.desc));
   const range=el("div","range");
   const inp=document.createElement("input");inp.type="range";inp.id="cj-n-"+a.cle;inp.min="1";inp.max="99";inp.step="1";
   const nb=document.createElement("input");nb.type="number";nb.id="cj-v-"+a.cle;nb.min="1";nb.max="99";nb.step="1";nb.inputMode="numeric";
   nb.setAttribute("aria-label",a.libelle+", note de 1 à 99");
   // Curseur : souris, doigt ou flèches du clavier (le navigateur borne déjà de 1 à 99)
   inp.addEventListener("input",()=>reglerNote(a.cle,inp.value,false));
   inp.addEventListener("change",()=>reglerNote(a.cle,inp.value,true));
   // Champ numérique : appliqué dès qu'il contient un nombre, borné et nettoyé en sortie de champ
   nb.addEventListener("input",()=>{if(nb.value!==""&&Number.isFinite(Number(nb.value)))reglerNote(a.cle,nb.value,false,true);});
   nb.addEventListener("change",()=>reglerNote(a.cle,nb.value,true));
   range.append(inp,nb);li.append(lab,range);liste.appendChild(li);
   champs[a.cle]={range:inp,nombre:nb};
  });
  const postes=$("cj-postes");
  if(postes&&!postes.childElementCount)D.POSTES.forEach(p=>{
   const b=el("button","",p.libelle);b.type="button";b.dataset.poste=p.cle;b.title=p.desc;
   b.addEventListener("click",()=>{etat.poste=p.cle;majNotes();sauver();});
   postes.appendChild(b);
  });
  const rangs=$("cj-rangs-choix");
  if(rangs&&!rangs.childElementCount)D.RANGS.forEach(x=>{
   const b=el("button","",x.libelle);b.type="button";b.dataset.rang=x.cle;
   b.addEventListener("click",()=>{etat.rang=x.cle;etat.rangChoisi=true;majNotes();sauver();});
   rangs.appendChild(b);
  });
 }
 // Nouvelle valeur d'une note : bornée de 1 à 99 ; un champ vide ou illisible reprend la note précédente.
 // pendantSaisie : le champ numérique n'est pas réécrit (on ne coupe pas la frappe de « 7 » avant « 75 »).
 function reglerNote(cle,valeur,enregistrer,pendantSaisie){
  const v=Number(valeur);
  if(valeur!==""&&Number.isFinite(v))etat.notes[cle]=borne(v);
  majNotes(pendantSaisie?cle:null);
  if(enregistrer)sauver();
 }
 function majNotes(saisie){
  const r=calculer();
  CLES.forEach(k=>{
   const c=champs[k];if(!c)return;
   c.range.value=String(r.notes[k]);c.range.setAttribute("aria-valuetext",r.notes[k]+" sur 99");
   if(k!==saisie)c.nombre.value=String(r.notes[k]);
  });
  const g=$("cj-globale");if(g)g.textContent=r.globale;
  const tag=$("cj-rang-tag");if(tag){tag.textContent=libRang(r.rang);tag.className="tag rang-"+r.rang;}
  const sug=$("cj-suggestion");
  if(sug)sug.textContent="Poste suggéré d'après tes notes : "+libPoste(r.posteSuggere)+"."+(etat.poste?"":" Choisis ton poste, ou garde la suggestion.");
  page.querySelectorAll("#cj-postes button").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.poste===r.poste)));
  const rs=$("cj-rang-suggere");
  if(rs)rs.textContent="Suggéré : "+libRang(r.rangSuggere)+(etat.rangChoisi?". Tu as choisi "+libRang(r.rang)+".":", d'après ta note globale. Choisis ton rang, ou garde la suggestion.");
  page.querySelectorAll("#cj-rangs-choix button").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.rang===r.rang)));
  rendreApercu();
 }
 function rendreNotes(){construireNotes();majNotes();}

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
  etat.pseudo=v;
  if(champClub){etat.club=nettoyerClub(champClub.value);champClub.value=etat.club;}
  sauver();rendreFinal();allerA("final",true);
  if(etat.duel)afficherDuel(true); // défi reçu : la carte est prête, le duel s'affiche
 });
 /* ---- Club : suggestions chargées une seule fois, à la première prise de focus (options créées en DOM, jamais innerHTML) ---- */
 const champClub=$("cj-club"),listeClubs=$("cj-clubs");
 let clubsDemandes=false;
 function chargerClubs(){
  if(clubsDemandes||!listeClubs||typeof fetch!=="function")return;
  clubsDemandes=true;
  try{
   fetch("assets/data/clubs.json")
    .then(r=>r.ok?r.json():null)
    .then(l=>{
     if(!Array.isArray(l)||listeClubs.childElementCount)return;
     const frag=document.createDocumentFragment();
     l.forEach(nom=>{const v=typeof nom==="string"?nettoyerClub(nom):"";if(!v)return;const o=document.createElement("option");o.value=v;frag.appendChild(o);});
     listeClubs.appendChild(frag);
    })
    .catch(()=>{}); // hors connexion ou fichier local : le champ reste libre
  }catch(e){}
 }
 if(champClub)champClub.addEventListener("focus",chargerClubs);
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
   (etat.club?" Club : "+etat.club+".":"")+
   (choixPossible()?" Modèle "+modeleCourant().nom+".":"");
 }
 function donneesRendu(r){
  return {pseudo:etat.pseudo||"Joueur",poste:libPoste(r.poste),globale:r.globale,rang:r.rang,attributs:CLES.map(k=>({cle:k,note:r.notes[k]})),
   photo:etat.imgPhoto,niveau:"",club:etat.club};
 }
 // Le dessin (coûteux) est regroupé par image d'écran ; la description et le rang sont posés tout de suite.
 // Élite : la bordure est animée par CARTE_RENDU.animer, qui renvoie une fonction d'arrêt (appelée avant tout nouveau dessin).
 let arretApercu=null,apercuPrevu=0;
 function rendreApercu(){
  const canvas=$("cj-apercu-canvas"),R=window.CARTE_RENDU;
  if(!canvas||!R)return;
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
 // Nouveau modèle : aperçu, image d'export et sauvegarde ; les notes ne changent pas
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
  if(!R)return;
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
 function telechargerBlob(blob,nom){
  const url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download=nom||NOM_FICHIER;document.body.appendChild(a);a.click();a.remove();
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
 const COMPTEUR={actif:true,adresse:"https://apprendre-padel.goatcounter.com/counter/carte-generee.json?start=2026-01-01"}; // sans start, GoatCounter ne renvoie pas le total depuis le début (1 au lieu de 4 le 30/10/2026)
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
 sur("cj-commencer",()=>{rendreNotes();allerA("notes",true);});
 sur("cj-nouvelle-1",demanderNouvelleCarte);
 sur("cj-nouvelle-2",demanderNouvelleCarte);
 // Quitter l'étape notes valide la carte : elle est gardée (et remplace, pour une nouvelle carte, celle d'avant)
 sur("cj-vers-photo",()=>{etat.enregistrable=true;sauver();allerA("photo",true);});
 sur("cj-retour-notes",()=>{rendreNotes();allerA("notes",true);});
 sur("cj-vers-pseudo",()=>{if(champPseudo&&!champPseudo.value&&etat.pseudo)champPseudo.value=etat.pseudo;if(champClub&&!champClub.value&&etat.club)champClub.value=etat.club;allerA("pseudo",true);});
 sur("cj-retour-photo",()=>allerA("photo",true));
 sur("cj-modifier-notes",()=>{rendreNotes();allerA("notes",true);});
 sur("cj-modifier-photo",()=>allerA("photo",true));
 sur("cj-modifier-pseudo",()=>{if(champPseudo)champPseudo.value=etat.pseudo;if(champClub)champClub.value=etat.club;allerA("pseudo",true);});

 /* ---- Duel de cartes ----
    Lien : https://apprendre-padel.fr/carte.html#duel=<code>. Le code est le JSON
    [version, VOL, AER, DEF, LOB, SER, TAC, poste, rang, modèle, pseudo, club] (version 1) en UTF-8, encodé en base64url sans « = ».
    Jamais la photo ; la note globale n'est pas transmise : elle est recalculée (notes + poste), comme pour sa propre carte.
    Le fragment (#…) n'est envoyé à aucun serveur. Lecture stricte : version 1, 12 valeurs, notes entières de 1 à 99, poste, rang
    et modèle pris dans leurs listes, pseudo accepté par la même règle que la saisie (pseudoValide), club déjà nettoyé
    (nettoyerClub) et sans adresse ni numéro ; sinon « Ce lien de duel n'est pas valide. » et la page reste normale.
    Parcours : bandeau « <pseudo> te défie ! » (carte de l'ami sans photo : initiales) ; « Faire ma carte pour le duel »
    (pas de carte) ou « Comparer avec ma carte » (carte gardée : jamais de deuxième carte) ; après « Voir ma carte », écran du
    duel : cartes côte à côte, tableau note par note, score sur les 6 notes (la globale départage une égalité), verdict.
    L'adresse devient #duel=<code>&ecran=duel : recharger réaffiche le duel ; « Retour à ma carte » retire le fragment.
    La carte de l'ami n'est jamais écrite dans le stockage ; ses textes passent par textContent ou le canvas. */
 const DUEL_VERSION=1,DUEL_CODE_MAX=800,DUEL_LIEN="https://apprendre-padel.fr/carte.html#duel=";
 const DUEL_TEXTE="Je te défie : fais ta carte de padel et compare-la à la mienne";
 const MSG_DUEL_INVALIDE="Ce lien de duel n'est pas valide.";
 const NOM_DUEL="duel-carte-padel."+EXPORT.ext;
 function versB64u(texte){
  let b="";new TextEncoder().encode(texte).forEach(o=>{b+=String.fromCharCode(o);});
  return btoa(b).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
 }
 function depuisB64u(code){
  let t=code.replace(/-/g,"+").replace(/_/g,"/");while(t.length%4)t+="=";
  const b=atob(t),o=new Uint8Array(b.length);for(let i=0;i<b.length;i++)o[i]=b.charCodeAt(i);
  return new TextDecoder("utf-8",{fatal:true}).decode(o); // octets UTF-8 invalides : erreur
 }
 // Ma carte telle qu'elle part dans le lien (ni photo, ni date)
 function maCarteDuel(){
  const r=calculer();
  return {notes:r.notes,poste:r.poste,rang:r.rang,modele:modeleCourant().cle,pseudo:etat.pseudo,club:etat.club,globale:r.globale};
 }
 function encoderDuel(c){
  return versB64u(JSON.stringify([DUEL_VERSION,...CLES.map(k=>borne(c.notes[k])),c.poste,c.rang,c.modele,c.pseudo,c.club||""]));
 }
 // Club reçu : pas d'adresse e-mail, de lien ni de numéro (le champ de saisie ne les produit pas, un lien fabriqué si)
 const clubAcceptable=c=>!/@|https?:|www\.|\.(fr|com|net|org|eu|io|be|ch|me|gg|ly|co|app|info|link)(?![\p{L}\p{N}])/iu.test(c)&&!/[0-9]{9,}/.test(c.replace(/[^\p{L}\p{N}]/gu,""));
 function decoderDuel(code){
  try{
   if(typeof code!=="string"||!code||code.length>DUEL_CODE_MAX||!/^[A-Za-z0-9_-]+$/.test(code))return null;
   const v=JSON.parse(depuisB64u(code)),n=CLES.length;
   if(!Array.isArray(v)||v.length!==n+6||v[0]!==DUEL_VERSION)return null;
   const notes={};
   for(let i=0;i<n;i++){const x=v[1+i];if(!Number.isInteger(x)||x<1||x>99)return null;notes[CLES[i]]=x;}
   const [poste,rang,modele,pseudo,club]=v.slice(n+1);
   if(typeof poste!=="string"||!posteValide(poste)||typeof rang!=="string"||!rangValide(rang))return null;
   if(typeof modele!=="string"||!modeleValide(modele))return null;
   if(typeof pseudo!=="string"||pseudo!==pseudo.trim()||!pseudoValide(pseudo))return null;
   if(typeof club!=="string"||club.length>CLUB_MAX*2)return null;
   const propre=nettoyerClub(club);
   if(propre!==club||(propre&&!clubAcceptable(propre)))return null;
   return {notes,poste,rang,modele,pseudo,club:propre,globale:CALC.globale(notes,poste)};
  }catch(e){return null;}
 }
 // Comparaison note par note : la plus haute gagne la ligne ; score sur les 6 notes ; égalité de score → la globale départage
 function comparerDuel(moi,ami){
  const qui=(a,b)=>a>b?"moi":a<b?"ami":"egal";
  const lignes=CLES.map(k=>({cle:k,moi:moi.notes[k],ami:ami.notes[k],gagnant:qui(moi.notes[k],ami.notes[k])}));
  const score={moi:lignes.filter(l=>l.gagnant==="moi").length,ami:lignes.filter(l=>l.gagnant==="ami").length};
  const globale={moi:moi.globale,ami:ami.globale,gagnant:qui(moi.globale,ami.globale)};
  let vainqueur=qui(score.moi,score.ami),departage=false;
  if(vainqueur==="egal"&&globale.gagnant!=="egal"){vainqueur=globale.gagnant;departage=true;}
  return {lignes,globale,score,vainqueur,departage};
 }
 window.PA_DUEL={encoder:encoderDuel,decoder:decoderDuel,comparer:comparerDuel,lien:c=>DUEL_LIEN+encoderDuel(c)}; // pour les tests
 function donneesAmi(a){
  return {pseudo:a.pseudo,poste:libPoste(a.poste),globale:a.globale,rang:a.rang,attributs:CLES.map(k=>({cle:k,note:a.notes[k]})),photo:null,niveau:"",club:a.club};
 }
 function descriptionAmi(a){
  return "Carte de joueur de "+a.pseudo+" : "+a.globale+", "+libRang(a.rang)+", poste "+libPoste(a.poste).toLowerCase()+". "+
   CLES.map(k=>libAttr(k)+" "+a.notes[k]).join(", ")+". Initiales "+initiales(a.pseudo)+"."+(a.club?" Club : "+a.club+".":"");
 }
 // Fragment de l'adresse : #duel=<code>&ecran=duel → {duel, ecran} (objet sans prototype)
 function lireFragment(){
  const f=Object.create(null),h=String(location.hash||"").replace(/^#/,"");
  h.split("&").forEach(x=>{const i=x.indexOf("=");if(i>0)f[x.slice(0,i)]=x.slice(i+1);});
  return f;
 }
 function poserFragment(h){try{history.replaceState(history.state,"",location.pathname+location.search+(h?"#"+h:""));}catch(e){}}
 const carteComplete=()=>carteGardee()&&!!etat.pseudo;
 const sections=()=>({defi:$("cj-defi"),duel:$("cj-duel"),erreur:$("cj-duel-erreur")});
 function arreterApercu(){if(arretApercu){arretApercu();arretApercu=null;}}
 function focusSur(z){if(!z)return;z.scrollIntoView({block:"start"});z.focus({preventScroll:true});}
 function duelDepuisFragment(){
  const f=lireFragment(),S=sections();
  if(!("duel" in f))return;
  const ami=decoderDuel(f.duel);
  if(!ami){
   etat.duel=null;
   if(S.defi)S.defi.hidden=true;
   if(S.duel&&!S.duel.hidden){S.duel.hidden=true;page.hidden=false;}
   poserFragment("");
   if(S.erreur){S.erreur.hidden=false;S.erreur.textContent=MSG_DUEL_INVALIDE;}
   return;
  }
  if(S.erreur){S.erreur.hidden=true;S.erreur.textContent="";}
  etat.duel={code:f.duel,ami};
  if(f.ecran==="duel"&&carteComplete())afficherDuel(true);
  else ouvrirDefi(true);
 }
 // Bandeau du défi : carte de l'ami (sans photo), bouton selon que le visiteur a déjà sa carte ou non
 function ouvrirDefi(focus){
  const S=sections(),a=etat.duel&&etat.duel.ami;
  if(!S.defi||!a)return;
  if(S.duel)S.duel.hidden=true;
  page.hidden=false;S.defi.hidden=false;
  $("cj-defi-titre").textContent=a.pseudo+" te défie !";
  $("cj-defi-resume").textContent=a.pseudo+" a une carte à "+a.globale+" en "+libRang(a.rang)+", poste "+libPoste(a.poste).toLowerCase()+
   (a.club?", au club "+a.club:"")+". Fais ta carte, puis comparez vos notes une à une.";
  majBoutonDefi();
  const c=$("cj-defi-canvas"),R=window.CARTE_RENDU;
  if(c){c.setAttribute("aria-label",descriptionAmi(a));if(R)R.dessiner(c,donneesAmi(a),{format:"carte",modele:a.modele,largeur:420}).catch(()=>{});}
  if(focus)focusSur($("cj-defi-titre"));
 }
 function majBoutonDefi(){
  const b=$("cj-defi-go"),aide=$("cj-defi-aide");if(!b)return;
  b.hidden=false;
  if(carteComplete()){b.textContent="Comparer avec ma carte";if(aide)aide.textContent="Ta carte gardée sur cet appareil est comparée à la sienne. Rien n'est envoyé.";}
  else{b.textContent="Faire ma carte pour le duel";if(aide)aide.textContent="Notes, poste, rang et nom : le duel s'affiche dès que ta carte est prête. Rien n'est envoyé.";}
 }
 function lancerDefi(){
  if(!etat.duel)return;
  if(carteComplete()){afficherDuel(true);return;}
  const b=$("cj-defi-go"),aide=$("cj-defi-aide");
  if(b)b.hidden=true;
  if(aide)aide.textContent="Fais ta carte ci-dessous : le duel s'affiche quand tu cliques sur « Voir ma carte ».";
  if(carteGardee()){allerA("pseudo",true);return;} // carte gardée sans nom : seulement le nom à donner, pas de nouvelle carte
  rendreNotes();allerA("notes",true);
 }
 const NOM_LIGNE={VOL:"Volée",AER:"Jeu aérien",DEF:"Défense",LOB:"Lob et montée",SER:"Service et retour",TAC:"Tactique"};
 function libelleGagnant(g,a){return g==="moi"?"Toi":g==="ami"?a.pseudo:"Égalité";}
 function celluleGagnant(g,a){
  const td=el("td","cj-duel-gagnant cj-duel-"+g);
  const icone=el("span","cj-duel-icone",g==="moi"?"◀":g==="ami"?"▶":"=");icone.setAttribute("aria-hidden","true");
  td.append(icone," ",libelleGagnant(g,a));
  return td;
 }
 function ligneDuel(th,vMoi,vAmi,g,a,classe){
  const tr=el("tr",classe||"");
  const t=el("th","",th);t.scope="row";
  const cm=el("td",g==="moi"?"cj-duel-mieux":"",String(vMoi)),ca=el("td",g==="ami"?"cj-duel-mieux":"",String(vAmi));
  tr.append(t,cm,ca,celluleGagnant(g,a));
  return tr;
 }
 function verdictDuel(res,a){return res.vainqueur==="moi"?"Tu gagnes le duel !":res.vainqueur==="ami"?a.pseudo+" gagne le duel":"Égalité";}
 function afficherDuel(focus){
  const S=sections(),a=etat.duel&&etat.duel.ami,R=window.CARTE_RENDU;
  if(!S.duel||!a)return;
  const moi=maCarteDuel(),res=comparerDuel(moi,a);
  arreterApercu();
  page.hidden=true;if(S.defi)S.defi.hidden=true;S.duel.hidden=false;
  messageDuel("");const lb=$("cj-duel-lien-bloc");if(lb)lb.hidden=true;
  $("cj-duel-nom-moi").textContent="Toi : "+moi.pseudo;$("cj-duel-nom-ami").textContent=a.pseudo;
  $("cj-duel-th-ami").textContent=a.pseudo;
  $("cj-duel-score").textContent=res.score.moi+" – "+res.score.ami;
  $("cj-duel-score-texte").textContent="Score : "+res.score.moi+" note"+(res.score.moi>1?"s":"")+" pour toi, "+res.score.ami+" pour "+a.pseudo+".";
  const v=$("cj-duel-verdict");v.textContent=verdictDuel(res,a);v.className="cj-duel-verdict-"+res.vainqueur;
  $("cj-duel-detail").textContent=res.departage?"Égalité sur les notes, départagée à la note globale : "+moi.globale+" contre "+a.globale+".":
   "Note globale : "+moi.globale+" pour toi, "+a.globale+" pour "+a.pseudo+".";
  const corps=$("cj-duel-lignes");
  corps.replaceChildren(...res.lignes.map(l=>ligneDuel(NOM_LIGNE[l.cle]||libAttr(l.cle),l.moi,l.ami,l.gagnant,a)),
   ligneDuel("Note globale",res.globale.moi,res.globale.ami,res.globale.gagnant,a,"cj-duel-globale"));
  const cm=$("cj-duel-moi"),ca=$("cj-duel-ami");
  cm.setAttribute("aria-label",description(calculer()));ca.setAttribute("aria-label",descriptionAmi(a));
  if(R){
   const l=Math.min(1200,Math.round(360*Math.max(1,window.devicePixelRatio||1)));
   R.dessiner(cm,donneesRendu(calculer()),{format:"carte",modele:moi.modele,largeur:l}).catch(()=>{});
   R.dessiner(ca,donneesAmi(a),{format:"carte",modele:a.modele,largeur:l}).catch(()=>{});
  }
  const t=$("cj-duel-telecharger");if(t)t.disabled=!(R&&typeof R.dessinerDuel==="function");
  poserFragment("duel="+etat.duel.code+"&ecran=duel"); // recharger la page réaffiche le duel
  if(focus)focusSur(v);
 }
 function fermerDuel(){
  const S=sections();
  etat.duel=null;
  if(S.duel)S.duel.hidden=true;if(S.defi)S.defi.hidden=true;
  page.hidden=false;poserFragment("");
  if(carteComplete()){rendreFinal();allerA("final",true);}else allerA(etat.etape,true);
 }
 function messageDuel(txt,classe){const m=$("cj-duel-msg");if(!m)return;m.hidden=!txt;m.textContent=txt||"";m.className="msg "+(classe||"msg-ok");}
 function messageDefier(txt,classe){const m=$("cj-defier-msg");if(!m)return;m.hidden=!txt;m.textContent=txt||"";m.className="msg "+(classe||"msg-ok");}
 /* Envoyer le défi (ma carte) : menu de partage de l'appareil, sinon presse-papiers (« Lien copié »), sinon champ à copier */
 async function envoyerDefi(btn,dire,blocId,champId){
  const lien=DUEL_LIEN+encoderDuel(maCarteDuel()),bloc=$(blocId),champ=$(champId);
  if(bloc)bloc.hidden=true;dire("");
  await avecAttente(btn,"Préparation…",async()=>{
   if(navigator.share){
    try{await navigator.share({title:"Duel de cartes de padel",text:DUEL_TEXTE,url:lien});dire("Défi envoyé. Quand ton ami aura fait sa carte, vous verrez qui gagne.","msg-ok");return;}
    catch(e){if(e&&e.name==="AbortError")return;} // autre échec : on passe à la copie
   }
   try{
    if(!navigator.clipboard||typeof navigator.clipboard.writeText!=="function")throw new Error("presse-papiers absent");
    await navigator.clipboard.writeText(lien);
    dire("Lien copié. Colle-le dans un message à ton ami.","msg-ok");return;
   }catch(e){}
   if(champ){champ.value=lien;if(bloc)bloc.hidden=false;}
   dire("Copie ce lien et envoie-le à ton ami.","msg-info");
  });
  // Champ de repli : sélectionné après la remise en état du bouton (le focus n'est pas repris par avecAttente)
  if(bloc&&!bloc.hidden&&champ){champ.focus();champ.select();}
 }
 sur("cj-defi-go",lancerDefi);
 sur("cj-duel-retour",fermerDuel);
 sur("cj-defier",ev=>envoyerDefi(ev.currentTarget,messageDefier,"cj-defier-lien-bloc","cj-defier-lien"));
 sur("cj-duel-renvoyer",ev=>envoyerDefi(ev.currentTarget,messageDuel,"cj-duel-lien-bloc","cj-duel-lien"));
 sur("cj-duel-telecharger",ev=>{
  const btn=ev.currentTarget,a=etat.duel&&etat.duel.ami,R=window.CARTE_RENDU;
  if(!a||!R||typeof R.dessinerDuel!=="function")return;
  avecAttente(btn,"Préparation…",async()=>{
   try{
    const moi=maCarteDuel(),res=comparerDuel(moi,a),c=document.createElement("canvas");
    const verdict=res.vainqueur==="moi"?moi.pseudo+" gagne le duel":res.vainqueur==="ami"?a.pseudo+" gagne le duel":"Égalité";
    await R.dessinerDuel(c,{gauche:{donnees:donneesRendu(calculer()),modele:moi.modele},droite:{donnees:donneesAmi(a),modele:a.modele},
     score:[res.score.moi,res.score.ami],verdict});
    telechargerBlob(await versBlob(c),NOM_DUEL);
    messageDuel("Image prête : "+NOM_DUEL+" (1200 × 1200).","msg-ok");
   }catch(e){messageDuel("Impossible de fabriquer l'image. Réessaie, ou change de navigateur.","msg-erreur");}
  });
 });

 /* ---- Démarrage : carte retrouvée ou intro ---- */
 const photoGardee=(()=>{try{const v=localStorage.getItem(CLE_PHOTO);return v&&/^data:image\//.test(v)&&v.length<1500000?v:null;}catch(e){return null;}})();
 const sauvee=restaurer();
 // Photo gardée posée, sauf si la carte gardée a été faite sans photo (photo:false : c'est celle d'une carte précédente)
 if(photoGardee&&!(sauvee&&sauvee.photo===false))poserPhoto(photoGardee,false);
 proposerPseudoDuProfil();
 afficherCompteur();
 // Session confirmée (ou fermée) par compte.js : aides des boutons « Faire une nouvelle carte » mises à jour
 (()=>{
  const c=window.PA_COMPTE;if(!c||!c.actif)return;
  const maj=()=>{compteVerifie=true;majAidesNouvelle();if(!nouvelleLimitee())masquerLimite();};
  try{Promise.resolve(c.ready).then(maj,maj);if(typeof c.onChange==="function")c.onChange(maj);}catch(e){}
 })();
 if(sauvee){
  // Carte version 1 (ancien questionnaire) : réécrite au format 2 avec les mêmes notes, poste, nom, modèle et photo
  if(sauvee.migree)sauver();
  rendreNotes();
  if(champPseudo)champPseudo.value=etat.pseudo;
  if(champClub)champClub.value=etat.club;
  const quand=(()=>{try{const d=new Date(sauvee.date);return isNaN(d)?"":d.toLocaleDateString("fr-FR",{day:"numeric",month:"long"});}catch(e){return "";}})();
  const m=$("cj-retrouvee");if(m){m.hidden=false;m.textContent="Ta carte"+(quand?" du "+quand:"")+" est gardée sur cet appareil : tu la retrouves ci-dessous. Tu peux modifier tes notes, ta photo ou ton nom, ou faire une nouvelle carte.";}
  if(etat.pseudo){rendreFinal();allerA("final",false);}
  else allerA("pseudo",false);
 }else allerA("intro",false);
 duelDepuisFragment(); // lien carte.html#duel=… : bandeau du défi, ou duel déjà affiché (rechargement)
 window.addEventListener("hashchange",duelDepuisFragment);
})();
