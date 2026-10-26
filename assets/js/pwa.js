/* PWA : enregistre le service worker (sw.js) pour rendre le site installable et les tournois consultables hors connexion.
   Uniquement en https ou sur localhost : en file:// (double-clic) ce script ne fait rien. */
(function(){
 if(!("serviceWorker" in navigator)) return;
 const hote=location.hostname;
 const localhost=hote==="localhost"||hote==="127.0.0.1"||hote==="[::1]";
 if(location.protocol!=="https:"&&!(location.protocol==="http:"&&localhost)) return;
 window.addEventListener("load",function(){
  // L'enregistrement ne doit jamais gêner la page : toute erreur est ignorée
  navigator.serviceWorker.register("sw.js").catch(function(){});
 });
})();
