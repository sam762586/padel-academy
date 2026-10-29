/* ANTI-CADRE (connexion.html, compte.html, espace.html, partenaires.html et fiches tournoi tournoi/<id>.html)
   Empêche l'affichage de la page dans un cadre (iframe) d'un autre site : protection contre le « clickjacking »
   (un site piège superpose nos boutons à son propre contenu : connexion, suppression de compte, publication
   d'une annonce, « J'y vais », avis, signalement).
   Chargé dans <head>, sans defer : la page est masquée avant d'être dessinée. Dans un cadre, on tente d'ouvrir
   la page en plein écran ; si le navigateur le refuse (cadre d'un autre site, cadre « sandbox »), la page reste masquée.
   Fichier séparé (pas de script en ligne) pour la future politique de sécurité CSP, qui ajoutera frame-ancestors. */
(function(){
 var dansUnCadre=true;
 try{ dansUnCadre=window.top!==window.self; }catch(e){ dansUnCadre=true; }
 if(!dansUnCadre) return;
 document.documentElement.style.setProperty("display","none","important");
 try{ window.top.location.replace(window.self.location.href); }catch(e){ /* refusé : la page reste masquée */ }
})();
