/* VISITEURS EN CE MOMENT · pastille « 3 joueurs sur le site en ce moment » (index.html et carte.html seulement).
   Supabase Realtime Presence : chaque onglet ouvert rejoint le canal « presence-site » sous une clé tirée au hasard
   (jamais gardée), et annonce sa présence avec un objet VIDE : aucune donnée envoyée, rien d'écrit en base, aucun SQL.
   Le nombre affiché est le nombre de clés présentes sur le canal (l'onglet courant compris).
   - Démarrage différé : après le chargement de la page, quand le navigateur est inactif (repli : 3 s).
   - SDK : celui de la page s'il est déjà là (carte.html), sinon chargé à la demande depuis assets/vendor (jamais de CDN),
     avec la configuration publique de supabase-config.js (chargée à la demande sur l'accueil).
   - Client : celui des comptes (PA_COMPTE.client) s'il existe, sinon un client sans session (persistSession false) :
     rien n'est lu ni écrit dans le stockage du navigateur, la session d'un joueur connecté n'est jamais touchée.
   - Rien ne se passe hors connexion, sans configuration, onglet caché (connexion au retour sur l'onglet), ni dans un
     navigateur piloté par un robot (navigator.webdriver : robots d'indexation et tests automatiques ne sont pas des joueurs).
   - Départ du canal à la fermeture de la page (pagehide), retour si la page est restaurée depuis le cache (pageshow).
   - Affichage : texte visible mis à jour à chaque synchronisation ; annonce aux lecteurs d'écran (aria-live polite)
     au plus toutes les 30 s. Rien n'est affiché si personne n'est compté ou en cas d'erreur (la ligne reste réservée). */
(function(){
 "use strict";
 const zone=document.getElementById("pa-presence");
 if(!zone)return;
 const visible=zone.querySelector("[data-presence-texte]"),annonce=zone.querySelector("[data-presence-annonce]");
 const CANAL="presence-site",DELAI_ANNONCE=30000,VIDE=" "; // espace insécable : la ligne garde sa hauteur
 const SDK="assets/vendor/supabase-2.45.4.js?v=8596965fe9",CONFIG="assets/js/supabase-config.js?v=b683a23f68";
 let client=null,canal=null,demarre=false,derniereAnnonce=0,minuteurAnnonce=0;

 /* ---- Affichage ---- */
 const phrase=n=>n===1?"1 joueur sur le site en ce moment":n+" joueurs sur le site en ce moment";
 function annoncer(txt){
  if(!annonce)return;
  clearTimeout(minuteurAnnonce);
  const attente=DELAI_ANNONCE-(Date.now()-derniereAnnonce);
  if(attente<=0){annonce.textContent=txt;derniereAnnonce=Date.now();return;}
  minuteurAnnonce=setTimeout(()=>{annonce.textContent=txt;derniereAnnonce=Date.now();},attente); // seule la dernière valeur est dite
 }
 function afficher(n){
  const txt=Number.isInteger(n)&&n>0?phrase(n):"";
  if(visible)visible.textContent=txt||VIDE;
  zone.classList.toggle("presence-active",!!txt);
  annoncer(txt);
 }

 /* ---- Chargement à la demande (SDK et configuration publique), chemins versionnés par scripts/gabarit.js ---- */
 function charger(src){
  return new Promise((ok,ko)=>{const s=document.createElement("script");s.src=src;s.async=true;s.onload=ok;s.onerror=ko;document.head.appendChild(s);});
 }
 async function preparer(){
  if(!window.PA_SUPABASE)await charger(CONFIG);
  const conf=window.PA_SUPABASE||{};
  if(!conf.url||!conf.anonKey)return null;
  const compte=window.PA_COMPTE;
  if(compte&&compte.client&&typeof compte.client.channel==="function")return compte.client;
  if(!(window.supabase&&typeof window.supabase.createClient==="function"))await charger(SDK);
  if(!(window.supabase&&typeof window.supabase.createClient==="function"))return null;
  return window.supabase.createClient(conf.url,conf.anonKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
 }
 // Clé de présence aléatoire, jamais gardée (une nouvelle à chaque connexion)
 function cleAleatoire(){
  try{if(window.crypto&&typeof crypto.randomUUID==="function")return crypto.randomUUID();}catch(e){}
  const o=new Uint8Array(16);crypto.getRandomValues(o);return Array.from(o,x=>x.toString(16).padStart(2,"0")).join("");
 }

 /* ---- Connexion au canal ---- */
 const robot=()=>navigator.webdriver===true;
 const peutSeConnecter=()=>!robot()&&navigator.onLine!==false&&document.visibilityState!=="hidden";
 async function connecter(){
  if(canal||demarre||!peutSeConnecter())return;
  demarre=true;
  try{
   if(!client)client=await preparer();
   if(!client||!peutSeConnecter()){demarre=false;return;}
   const c=client.channel(CANAL,{config:{presence:{key:cleAleatoire()}}});
   canal=c;
   c.on("presence",{event:"sync"},()=>{
    if(canal!==c)return;
    try{afficher(Object.keys(c.presenceState()||{}).length);}catch(e){afficher(0);}
   });
   c.subscribe(statut=>{
    if(canal!==c)return;
    if(statut==="SUBSCRIBED"){Promise.resolve().then(()=>c.track({})).catch(()=>afficher(0));} // objet vide : aucune donnée
    else if(statut==="CHANNEL_ERROR"||statut==="TIMED_OUT"||statut==="CLOSED")afficher(0);
   });
  }catch(e){
   canal=null;afficher(0);
  }finally{demarre=false;}
 }
 function deconnecter(){
  const c=canal;canal=null;
  if(!c)return;
  try{if(client&&typeof client.removeChannel==="function")client.removeChannel(c);else if(typeof c.unsubscribe==="function")c.unsubscribe();}catch(e){}
 }

 /* ---- Cycle de vie de la page ---- */
 document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")connecter();});
 window.addEventListener("online",()=>connecter());
 window.addEventListener("offline",()=>{deconnecter();afficher(0);});
 window.addEventListener("pagehide",()=>deconnecter());
 window.addEventListener("pageshow",e=>{if(e.persisted)connecter();});
 function plusTard(){
  if(typeof window.requestIdleCallback==="function")window.requestIdleCallback(()=>connecter(),{timeout:6000});
  else setTimeout(connecter,3000);
 }
 if(document.readyState==="complete")plusTard();
 else window.addEventListener("load",plusTard,{once:true});
})();
