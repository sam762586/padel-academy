/* Menu : hamburger sur mobile, groupes dépliables (menu déroulant sur ordinateur, accordéon sur mobile).
   Le menu lui-même vient du gabarit commun (scripts/gabarit.js). La classe .nav-js sur <html> active le menu replié :
   sans ce script, le CSS laisse tous les liens visibles (navigation possible même si ce fichier ne charge pas).
   Aussi : les zones qui défilent (tableaux .tbl, .acc-scroll) deviennent atteignables au clavier. */
(function(){
  document.documentElement.classList.add('nav-js');
  var btn=document.querySelector('.nav-toggle'), ul=document.getElementById('nav-menu');
  if(btn&&ul){
    var groupes=[].slice.call(ul.querySelectorAll('.nav-groupe'));
    var ouvrirGroupe=function(g,ouvert){g.classList.toggle('ouvert',ouvert);g.querySelector('.nav-titre').setAttribute('aria-expanded',String(ouvert));};
    var fermerGroupes=function(sauf){groupes.forEach(function(g){if(g!==sauf) ouvrirGroupe(g,false);});};
    var set=function(open){
      btn.setAttribute('aria-expanded',String(open));btn.setAttribute('aria-label',open?'Fermer le menu':'Ouvrir le menu');
      ul.classList.toggle('open',open);document.body.classList.toggle('nav-open',open);
      // Sur mobile, le groupe de la page en cours est déplié à l'ouverture
      if(open){var actif=ul.querySelector('.nav-titre.active');fermerGroupes(null);if(actif) ouvrirGroupe(actif.parentNode,true);}
    };
    btn.addEventListener('click',function(){set(btn.getAttribute('aria-expanded')!=='true');});
    groupes.forEach(function(g){
      g.querySelector('.nav-titre').addEventListener('click',function(){var o=!g.classList.contains('ouvert');fermerGroupes(g);ouvrirGroupe(g,o);});
    });
    ul.addEventListener('click',function(e){if(e.target.closest('a')){set(false);fermerGroupes(null);}});
    // Clic ailleurs : les menus déroulants se ferment
    document.addEventListener('click',function(e){if(!e.target.closest('.nav-groupe,.nav-toggle')) fermerGroupes(null);});
    window.addEventListener('resize',function(){if(innerWidth>860) set(false);});
    document.addEventListener('keydown',function(e){
      if(e.key!=='Escape') return;
      var ouvert=ul.querySelector('.nav-groupe.ouvert');
      if(ouvert&&innerWidth>860){fermerGroupes(null);ouvert.querySelector('.nav-titre').focus();return;}
      if(btn.getAttribute('aria-expanded')==='true'){set(false);btn.focus();}
    });
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
