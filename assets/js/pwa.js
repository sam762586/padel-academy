/* PWA : enregistre le service worker (sw.js) pour rendre le site installable et les tournois consultables hors connexion,
   et gère le bouton « Installer l'appli » du pied de page (scripts/gabarit.js, footer()).
   Uniquement en https ou sur localhost : en file:// (double-clic) ce script ne fait rien et le bouton reste caché.
   Bouton d'installation :
   - Chrome, Edge, Android : l'invite du navigateur (beforeinstallprompt) est gardée ; le bouton apparaît et l'ouvre au clic ;
   - iPhone, iPad (pas d'invite) : le bouton apparaît ; au clic, un message explique l'ajout à l'écran d'accueil ;
   - site déjà ouvert comme application, ou navigateur sans installation possible : bouton caché.
   Mesure : une installation envoie à GoatCounter l'événement « appli-installee » (rien si refus de la mesure : clé skipgc). */
(function(){
 "use strict";
 const hote=location.hostname;
 const localhost=hote==="localhost"||hote==="127.0.0.1"||hote==="[::1]";
 if(location.protocol!=="https:"&&!(location.protocol==="http:"&&localhost)) return;

 /* ---- Service worker ---- */
 if("serviceWorker" in navigator){
  // sw.js est à la racine du site : son adresse est déduite de celle de ce script (assets/js/pwa.js),
  // pour fonctionner aussi depuis les pages générées en sous-dossier (tournoi/, tournois/…)
  const script=document.currentScript;
  const adresseSw=script&&script.src?new URL("../../sw.js",script.src).href:"sw.js";
  window.addEventListener("load",function(){
   // L'enregistrement ne doit jamais gêner la page : toute erreur est ignorée
   navigator.serviceWorker.register(adresseSw).catch(function(){});
  });
 }

 /* ---- Bouton « Installer l'appli » ---- */
 const MESSAGE_IOS="Sur iPhone : touche le bouton Partager, puis « Sur l'écran d'accueil ».";
 let invite=null; // événement beforeinstallprompt gardé (utilisable une seule fois)

 // Site déjà ouvert comme application installée
 function dejaInstalle(){
  try{if(window.matchMedia&&window.matchMedia("(display-mode: standalone)").matches)return true;}catch(e){}
  return window.navigator.standalone===true;
 }
 // iPhone, iPad (iPadOS se présente comme un Mac, mais tactile)
 function estIos(){
  const ua=navigator.userAgent||"";
  return /iPhone|iPad|iPod/.test(ua)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
 }
 const zone=()=>document.getElementById("pa-installer");
 const bouton=()=>document.getElementById("pa-installer-bouton");
 const aide=()=>document.getElementById("pa-installer-aide");

 function afficher(){
  const z=zone(),b=bouton();
  if(!z||!b||dejaInstalle())return;
  z.hidden=false;b.hidden=false;
 }
 function masquer(){
  const z=zone(),b=bouton(),a=aide();
  if(b)b.hidden=true;
  if(z)z.hidden=true;
  if(a)a.textContent="";
 }
 // Message sous le bouton (zone role="status", déjà affichée : le lecteur d'écran l'annonce)
 function expliquer(texte){
  const a=aide();if(!a)return;
  a.textContent="";
  const p=document.createElement("p");
  p.className="msg msg-info";
  p.textContent=texte;
  a.appendChild(p);
 }
 function compterInstallation(){
  try{if(localStorage.getItem("skipgc")==="t")return;}catch(e){} // refus de la mesure (case de la page Confidentialité)
  try{const g=window.goatcounter;if(g&&typeof g.count==="function")g.count({path:"appli-installee",title:"Appli installée",event:true});}catch(e){}
 }

 if(dejaInstalle())return;

 window.addEventListener("beforeinstallprompt",function(ev){
  ev.preventDefault(); // pas de bandeau automatique : l'invite est ouverte par le bouton
  invite=ev;
  afficher();
 });
 window.addEventListener("appinstalled",function(){
  invite=null;
  masquer();
  compterInstallation();
 });

 function brancher(){
  const b=bouton();if(!b)return;
  b.addEventListener("click",function(){
   if(invite){
    const ev=invite;invite=null;
    try{
     const r=ev.prompt();
     if(r&&typeof r.catch==="function")r.catch(function(){});
    }catch(e){}
    masquer();
    return;
   }
   if(estIos())expliquer(MESSAGE_IOS.replace("iPhone",/iPad/.test(navigator.userAgent||"")||navigator.platform==="MacIntel"?"iPad":"iPhone"));
  });
  // iPhone, iPad : pas d'invite, le bouton est proposé d'emblée
  if(estIos())afficher();
 }
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",brancher);else brancher();
})();
