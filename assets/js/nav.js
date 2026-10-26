/* Menu : hamburger sur mobile, groupes dépliables (menu déroulant sur ordinateur, accordéon sur mobile).
   Le menu lui-même vient du gabarit commun (scripts/gabarit.js). */
(function(){
  var btn=document.querySelector('.nav-toggle'), ul=document.getElementById('nav-menu');
  if(!btn||!ul) return;
  var groupes=[].slice.call(ul.querySelectorAll('.nav-groupe'));
  function ouvrirGroupe(g,ouvert){g.classList.toggle('ouvert',ouvert);g.querySelector('.nav-titre').setAttribute('aria-expanded',String(ouvert));}
  function fermerGroupes(sauf){groupes.forEach(function(g){if(g!==sauf) ouvrirGroupe(g,false);});}
  function set(open){
    btn.setAttribute('aria-expanded',String(open));ul.classList.toggle('open',open);document.body.classList.toggle('nav-open',open);
    // Sur mobile, le groupe de la page en cours est déplié à l'ouverture
    if(open){var actif=ul.querySelector('.nav-titre.active');fermerGroupes(null);if(actif) ouvrirGroupe(actif.parentNode,true);}
  }
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
    set(false);
  });
})();
