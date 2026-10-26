/* LISTE DE TOURNOIS (pages générées tournois/<dep>.html) : filtres catégorie, tableau et dates.
   La liste est déjà dans la page (lisible sans JavaScript et par Google) : ce script masque seulement
   les tournois qui ne correspondent pas. Le département consulté est mémorisé pour l'accueil et les distances. */
(function(){
 const form=document.getElementById("gl-filtres"),liste=document.getElementById("gl-liste");
 if(!form||!liste)return;
 const compteur=document.getElementById("gl-compteur"),aucun=document.getElementById("gl-aucun");
 const du=document.getElementById("gl-du"),au=document.getElementById("gl-au");
 const elements=[...liste.querySelectorAll(".gen-item")];
 function filtrer(){
  const cats=[...form.querySelectorAll('input[name="cat"]:checked')].map(i=>i.value);
  const sexes=[...form.querySelectorAll('input[name="sexe"]:checked')].map(i=>i.value);
  let n=0;
  elements.forEach(li=>{
   const d=li.dataset;
   const ok=(!cats.length||cats.includes(d.cat))&&(!sexes.length||d.sexes.split(" ").some(s=>sexes.includes(s)))&&
    (!du.value||d.fin>=du.value)&&(!au.value||d.debut<=au.value);
   li.hidden=!ok;if(ok)n++;
  });
  compteur.textContent=n+" tournoi"+(n>1?"s":"")+(n===elements.length?" à venir":" sur "+elements.length);
  aucun.hidden=n>0;
 }
 form.addEventListener("change",filtrer);
 [du,au].forEach(c=>c.addEventListener("input",filtrer));
 form.addEventListener("submit",e=>e.preventDefault());
 // Département consulté : retenu (confort) pour l'accueil « près de chez toi » et le calcul des distances
 const dep=(/tournois\/([0-9AB]{2,3})\.html/.exec(location.pathname)||[])[1];
 if(dep)try{localStorage.setItem("pa-mon-departement",dep);}catch(e){}
 filtrer();
})();
