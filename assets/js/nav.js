/* Menu : hamburger sur mobile, groupes dépliables (menu déroulant sur ordinateur, accordéon sur mobile).
   Le menu lui-même vient du gabarit commun (scripts/gabarit.js). La classe .nav-js sur <html> active le menu replié :
   sans ce script, le CSS laisse tous les liens visibles (navigation possible même si ce fichier ne charge pas).
   Aussi : lien « Mon espace » selon la connexion, et zones qui défilent (tableaux .tbl, .acc-scroll) atteignables au clavier. */
(function(){
  // Retour de Google ou d'un lien reçu par e-mail arrivé sur une page qui ne gère pas la connexion (par exemple l'accueil,
  // si Supabase renvoie vers l'adresse du site) : on le transmet à connexion.html, qui ouvre la session ou affiche l'erreur
  var h=location.hash||'';
  if(/[#&](access_token|error_code|error_description)=/.test(h)&&!/\/(connexion|compte)\.html$/.test(location.pathname)&&(!window.PA_COMPTE||/[#&]error/.test(h))){
    var lien=document.querySelector('#nav-menu a[data-espace]');
    var racine=lien?lien.getAttribute('href').replace(/(espace|connexion)\.html.*$/,''):'';
    location.replace(racine+'connexion.html'+h);
    return;
  }
  document.documentElement.classList.add('nav-js');
  var btn=document.querySelector('.nav-toggle'), ul=document.getElementById('nav-menu');
  if(btn&&ul){
    var groupes=[].slice.call(ul.querySelectorAll('.nav-groupe'));
    var ouvrirGroupe=function(g,ouvert){g.classList.toggle('ouvert',ouvert);g.querySelector('.nav-titre').setAttribute('aria-expanded',String(ouvert));};
    var fermerGroupes=function(sauf){groupes.forEach(function(g){if(g!==sauf) ouvrirGroupe(g,false);});};
    var bureau=function(){return innerWidth>860;};
    // Hamburger : nom fixe, l'état ouvert ou fermé est porté par aria-expanded seul (pas de double information)
    btn.setAttribute('aria-label','Menu');
    var set=function(open){
      btn.setAttribute('aria-expanded',String(open));
      ul.classList.toggle('open',open);document.body.classList.toggle('nav-open',open);
      // Sur mobile, le groupe de la page en cours est déplié à l'ouverture
      if(open){var actif=ul.querySelector('.nav-titre.active');fermerGroupes(null);if(actif) ouvrirGroupe(actif.parentNode,true);}
    };
    btn.addEventListener('click',function(){set(btn.getAttribute('aria-expanded')!=='true');});
    groupes.forEach(function(g){
      g.querySelector('.nav-titre').addEventListener('click',function(){var o=!g.classList.contains('ouvert');fermerGroupes(g);ouvrirGroupe(g,o);});
      // Ordinateur : le menu déroulant se ferme quand le focus le quitte (Tab au-delà du dernier lien).
      // relatedTarget vide (clic sur une zone non focalisable, changement de fenêtre) : le clic ailleurs s'en charge déjà.
      g.addEventListener('focusout',function(e){
        if(bureau()&&g.classList.contains('ouvert')&&e.relatedTarget&&!g.contains(e.relatedTarget)) ouvrirGroupe(g,false);
      });
    });
    // Mobile : le panneau ouvert couvre la page ; si le focus part dans le contenu caché derrière (Tab après le dernier lien,
    // Maj+Tab avant le hamburger), le panneau se ferme pour que le visiteur voie où il est
    document.addEventListener('focusin',function(e){
      if(btn.getAttribute('aria-expanded')==='true'&&!ul.contains(e.target)&&e.target!==btn) set(false);
    });
    ul.addEventListener('click',function(e){if(e.target.closest('a')){set(false);fermerGroupes(null);}});
    // Clic ailleurs : les menus déroulants se ferment
    document.addEventListener('click',function(e){if(!e.target.closest('.nav-groupe,.nav-toggle')) fermerGroupes(null);});
    window.addEventListener('resize',function(){if(bureau()) set(false);});
    document.addEventListener('keydown',function(e){
      if(e.key!=='Escape') return;
      var ouvert=ul.querySelector('.nav-groupe.ouvert');
      if(ouvert&&bureau()){fermerGroupes(null);ouvert.querySelector('.nav-titre').focus();return;}
      if(btn.getAttribute('aria-expanded')==='true'){set(false);btn.focus();}
    });
  }
  // « Mon espace » : connexion.html?suite=espace.html pour un visiteur non connecté, espace.html sinon.
  // Pages avec compte.js : PA_COMPTE.user (et ses changements) ; autres pages : session Supabase gardée dans le navigateur.
  var lienEspace=document.querySelector('#nav-menu a[data-espace]');
  if(lienEspace){
    var racineLien=lienEspace.getAttribute('href').replace(/espace\.html$/,'');
    var pointer=function(connecte){lienEspace.setAttribute('href',racineLien+(connecte?'espace.html':'connexion.html?suite=espace.html'));};
    var sessionGardee=function(){
      try{for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(/^sb-.+-auth-token$/.test(k)){var v=JSON.parse(localStorage.getItem(k)||'null');if(v&&(v.access_token||v.refresh_token||v.currentSession)) return true;}}}catch(e){}
      return false;
    };
    var compte=window.PA_COMPTE;
    if(compte&&compte.actif){
      pointer(sessionGardee());
      compte.ready.then(function(){pointer(!!compte.user);});
      compte.onChange(function(){pointer(!!compte.user);});
    }else pointer(sessionGardee());
  }
  // Zones qui défilent horizontalement : tabindex pour le clavier, nom tiré du titre ou de la légende le plus proche
  var nommer=function(z){
    var cap=z.querySelector('caption');if(cap) return cap.textContent.trim();
    for(var e=z.previousElementSibling;e;e=e.previousElementSibling){if(/^H[2-4]$/.test(e.tagName)||e.classList.contains('subhead')) return e.textContent.trim();}
    return 'Tableau';
  };
  var rendreAccessibles=function(){
    [].slice.call(document.querySelectorAll('.tbl,.acc-scroll')).forEach(function(z){
      if(z.hasAttribute('tabindex')) return;
      z.setAttribute('tabindex','0');
      if(!z.hasAttribute('role')) z.setAttribute('role','region');
      if(!z.hasAttribute('aria-label')) z.setAttribute('aria-label',nommer(z).slice(0,80));
    });
  };
  rendreAccessibles();
  // Tableaux créés plus tard par les autres scripts (barème, espace, compte…)
  if(window.MutationObserver){
    var minuteur=null;
    new MutationObserver(function(){clearTimeout(minuteur);minuteur=setTimeout(rendreAccessibles,150);}).observe(document.body,{childList:true,subtree:true});
  }
})();
