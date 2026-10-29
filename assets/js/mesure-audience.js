/* Mesure d'audience : droit d'opposition du visiteur (exemption de consentement CNIL).
   Le site compte les pages vues avec GoatCounter (count.js chargé sur chaque page).
   Ce script construit, dans #mesure-audience-choix (page confidentialite.html), une case
   « Ne pas compter mes visites sur cet appareil ». Sur les autres pages : rien.

   Mécanisme reconnu par GoatCounter (vérifié le 29/10/2026) :
   - Documentation officielle, « Prevent tracking my own pageviews » :
     https://www.goatcounter.com/help/skip-dev
     (ajouter #toggle-goatcounter à l'adresse bloque le navigateur).
   - Source de count.js (https://gc.zgo.at/count.js) : #toggle-goatcounter écrit
     localStorage.setItem('skipgc', 't') (et removeItem('skipgc') pour revenir), et
     goatcounter.filter() refuse de compter si localStorage.getItem('skipgc') === 't'.
   On utilise donc exactement cette clé et cette valeur. La clé n'est pas préfixée « pa- » :
   c'est celle que lit count.js, elle ne peut pas changer. Le choix vaut pour les visites
   suivantes (la page en cours a pu être comptée avant le clic). */
(function(){
  'use strict';

  var CLE_GOATCOUNTER = 'skipgc';   // clé lue par count.js
  var VALEUR_EXCLU = 't';           // valeur qui bloque le comptage

  var TEXTES = {
    libelle: 'Ne pas compter mes visites sur cet appareil',
    exclu: 'Tes visites ne sont plus comptées sur cet appareil.',
    compte: 'Tes visites sont comptées dans des statistiques globales, sans ton nom ni ton e-mail.',
    // U+00A0 avant « : »
    indisponible: 'Ton navigateur bloque le stockage local : impossible d\'enregistrer ce choix sur cet appareil.'
  };

  /* Lecture de l'état : true = visites exclues, false = comptées, null = stockage inaccessible */
  function lireExclusion(){
    try { return localStorage.getItem(CLE_GOATCOUNTER) === VALEUR_EXCLU; }
    catch(e){ return null; }
  }

  /* Écriture de l'état ; renvoie false si le stockage est inaccessible */
  function ecrireExclusion(exclure){
    try {
      if (exclure) localStorage.setItem(CLE_GOATCOUNTER, VALEUR_EXCLU);
      else localStorage.removeItem(CLE_GOATCOUNTER);
      return true;
    } catch(e){ return false; }
  }

  function construire(){
    var conteneur = document.getElementById('mesure-audience-choix');
    if (!conteneur || conteneur.querySelector('.ma-case')) return;

    // Case à cocher dans le style des cases du compte (.cx-case)
    var libelle = document.createElement('label');
    libelle.className = 'cx-case ma-case';
    var caseACocher = document.createElement('input');
    caseACocher.type = 'checkbox';
    caseACocher.id = 'mesure-audience-exclure';
    var texte = document.createElement('span');
    texte.textContent = TEXTES.libelle;
    libelle.appendChild(caseACocher);
    libelle.appendChild(texte);

    // Message d'état, toujours présent pour être annoncé à chaque changement
    var message = document.createElement('p');
    message.className = 'acc-msg';
    message.id = 'mesure-audience-etat';
    message.setAttribute('role', 'status');
    caseACocher.setAttribute('aria-describedby', message.id);

    function afficher(exclu){
      if (exclu === null){
        caseACocher.checked = false;
        caseACocher.disabled = true;
        message.className = 'acc-msg acc-err';
        message.textContent = TEXTES.indisponible;
        return;
      }
      caseACocher.disabled = false;
      caseACocher.checked = exclu;
      message.className = 'acc-msg';
      message.textContent = exclu ? TEXTES.exclu : TEXTES.compte;
    }

    caseACocher.addEventListener('change', function(){
      var voulu = caseACocher.checked;
      afficher(ecrireExclusion(voulu) ? lireExclusion() : null);
    });

    // Choix modifié dans un autre onglet (ou via #toggle-goatcounter) : on suit
    window.addEventListener('storage', function(ev){
      if (ev.key === null || ev.key === CLE_GOATCOUNTER) afficher(lireExclusion());
    });

    afficher(lireExclusion());
    conteneur.appendChild(libelle);
    conteneur.appendChild(message);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', construire);
  else construire();
})();
