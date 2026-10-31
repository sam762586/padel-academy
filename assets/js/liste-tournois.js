/* LISTE DE TOURNOIS (pages générées tournois/<dep>.html et tournois/<region>/<cat>.html) : filtres catégorie, tableau et dates.
   La liste est déjà dans la page (lisible sans JavaScript et par Google) : ce script masque seulement
   les tournois qui ne correspondent pas. Le département consulté est mémorisé pour l'accueil et les distances.
   Les pages ne sont régénérées qu'une fois par semaine : les tournois terminés depuis (date de fin, sinon de début,
   avant aujourd'hui sur l'appareil) sont retirés au chargement. */
(function(){
 const liste=document.getElementById("gl-liste");
 if(!liste)return;
 const form=document.getElementById("gl-filtres");
 const compteur=document.getElementById("gl-compteur"),aucun=document.getElementById("gl-aucun");
 const du=document.getElementById("gl-du"),au=document.getElementById("gl-au");
 // Date du jour de l'appareil (AAAA-MM-JJ, comparable comme du texte)
 const maintenant=new Date();
 const aujourdhui=maintenant.getFullYear()+"-"+String(maintenant.getMonth()+1).padStart(2,"0")+"-"+String(maintenant.getDate()).padStart(2,"0");
 // Tournois terminés : retirés de la page une fois pour toutes
 const elements=[...liste.querySelectorAll(".gen-item")].filter(li=>{
  const fin=li.dataset.fin||li.dataset.debut||"";
  if(fin&&fin<aujourdhui){li.remove();return false;}
  return true;
 });
 function filtrer(){
  const cats=form?[...form.querySelectorAll('input[name="cat"]:checked')].map(i=>i.value):[];
  const sexes=form?[...form.querySelectorAll('input[name="sexe"]:checked')].map(i=>i.value):[];
  const vdu=du?du.value:"",vau=au?au.value:"";
  let n=0;
  elements.forEach(li=>{
   const d=li.dataset;
   const ok=(!cats.length||cats.includes(d.cat))&&(!sexes.length||(d.sexes||"").split(" ").some(s=>sexes.includes(s)))&&
    (!vdu||d.fin>=vdu)&&(!vau||d.debut<=vau);
   li.hidden=!ok;if(ok)n++;
  });
  if(compteur)compteur.textContent=n+" tournoi"+(n>1?"s":"")+(n===elements.length?" à venir":" sur "+elements.length);
  if(aucun){
   // Plus aucun tournoi à venir (tous terminés depuis la dernière mise à jour) : message adapté
   if(!elements.length)aucun.textContent="Aucun tournoi à venir pour le moment : la liste est mise à jour chaque semaine.";
   aucun.hidden=n>0;
  }
 }
 if(form){
  form.addEventListener("change",filtrer);
  form.addEventListener("submit",e=>e.preventDefault());
 }
 [du,au].forEach(c=>{if(c)c.addEventListener("input",filtrer);});
 // Département consulté : retenu (confort) pour l'accueil « près de chez toi » et le calcul des distances
 const dep=(/tournois\/([0-9AB]{2,3})\.html/.exec(location.pathname)||[])[1];
 if(dep)try{localStorage.setItem("pa-mon-departement",dep);}catch(e){}
 filtrer();
})();
