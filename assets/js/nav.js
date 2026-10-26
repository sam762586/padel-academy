/* Menu mobile : ouverture/fermeture du hamburger */
(function(){
  var btn=document.querySelector('.nav-toggle'), ul=document.querySelector('.nav ul');
  if(!btn||!ul) return;
  function set(open){btn.setAttribute('aria-expanded',String(open));ul.classList.toggle('open',open);document.body.classList.toggle('nav-open',open);}
  btn.addEventListener('click',function(){set(btn.getAttribute('aria-expanded')!=='true');});
  ul.addEventListener('click',function(e){if(e.target.closest('a')) set(false);});
  window.addEventListener('resize',function(){if(innerWidth>860) set(false);});
  document.addEventListener('keydown',function(e){if(e.key==='Escape') set(false);});
})();
