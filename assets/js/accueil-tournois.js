/* ACCUEIL : « Cette semaine près de chez toi »
   Département mémorisé (pa-mon-departement, choisi ici, sur la page Tournois ou une page département) :
   les 5 prochains tournois (assets/data/prochains/<dep>.json, écrit par scripts/generer-pages.js).
   Sinon : carte de France cliquable (carte-france.js, chargée seulement dans ce cas) + liste déroulante. */
const AT_CLE_DEPARTEMENT="pa-mon-departement";
const AT_NB=5;

(function(){
 const zone=document.getElementById("pres-de-chez-toi");
 if(!zone)return;
 const contenu=document.getElementById("pdt-contenu"),titre=document.getElementById("pdt-titre");
 const pages=window.PA_PAGES_TOURNOIS||{departements:[],noms:{},centres:{}};
 const noms=pages.noms||{};
 const MOIS=["janv.","févr.","mars","avr.","mai","juin","juil.","août","sept.","oct.","nov.","déc."],JOURS=["dim.","lun.","mar.","mer.","jeu.","ven.","sam."];
 const iso=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
 const jour=s=>{const p=s.split("-");const d=new Date(+p[0],+p[1]-1,+p[2]);return JOURS[d.getDay()]+" "+d.getDate()+" "+MOIS[d.getMonth()];};
 function el(b,c,t){const e=document.createElement(b);if(c)e.className=c;if(t!==undefined)e.textContent=t;return e;}
 function lireDep(){try{const d=localStorage.getItem(AT_CLE_DEPARTEMENT);return d&&noms[d]?d:null;}catch(e){return null;}}
 function choisir(dep){try{localStorage.setItem(AT_CLE_DEPARTEMENT,dep);}catch(e){}afficher(dep);}
 function position(){try{const p=JSON.parse(localStorage.getItem("pa-ma-position")||"null");return p&&typeof p.lat==="number"?[p.lat,p.lng]:null;}catch(e){return null;}}
 function km(a,b){const r=Math.PI/180,h=Math.sin((b[0]-a[0])*r/2)**2+Math.cos(a[0]*r)*Math.cos(b[0]*r)*Math.sin((b[1]-a[1])*r/2)**2;return Math.round(2*6371*Math.asin(Math.sqrt(h)));}
 // Liste déroulante des départements (accessible au clavier, à côté de la carte)
 function selecteur(actuel){
  const f=el("div","pdt-choix");
  const l=el("label","","Département");l.htmlFor="pdt-dep";
  const s=el("select");s.id="pdt-dep";
  s.append(new Option("Choisis ton département…",""));
  Object.keys(noms).sort((a,b)=>a.localeCompare(b,"fr",{numeric:true})).forEach(d=>s.append(new Option(d+" · "+noms[d],d,false,d===actuel)));
  s.addEventListener("change",()=>{if(s.value)choisir(s.value);});
  f.append(l,s);return f;
 }
 function chargerCarte(){
  if(window.CARTE_FRANCE)return Promise.resolve();
  return new Promise((ok,ko)=>{const s=document.createElement("script");s.src="assets/js/carte-france.js";s.onload=ok;s.onerror=ko;document.body.appendChild(s);});
 }
 async function afficherCarte(){
  titre.textContent="Tes prochains tournois";
  contenu.textContent="";
  contenu.append(el("p","pdt-aide","Choisis ton département : on te montre les prochains tournois, et le site s'en souvient."),selecteur(null));
  try{await chargerCarte();}catch(e){return;}
  if(typeof CARTE_FRANCE==="undefined")return;
  const NS="http://www.w3.org/2000/svg",svg=document.createElementNS(NS,"svg");
  svg.setAttribute("viewBox","0 0 "+CARTE_FRANCE_VIEWBOX.join(" "));svg.setAttribute("class","pdt-carte");
  svg.setAttribute("aria-hidden","true"); // la liste déroulante est l'équivalent accessible
  CARTE_FRANCE.forEach(d=>{
   const p=document.createElementNS(NS,"path");p.setAttribute("d",d.d);
   const t=document.createElementNS(NS,"title");t.textContent=d.code+" · "+d.nom;p.appendChild(t);
   p.addEventListener("click",()=>choisir(d.code));svg.appendChild(p);
  });
  contenu.appendChild(svg);
 }
 async function afficher(dep){
  if(!dep){afficherCarte();return;}
  titre.textContent="Cette semaine près de chez toi";
  contenu.textContent="";
  const tete=el("p","pdt-aide");
  tete.append("Prochains tournois · ",el("b","",noms[dep]+" ("+dep+")"));
  const changer=el("button","pdt-changer","Changer");changer.type="button";
  changer.addEventListener("click",()=>{contenu.textContent="";contenu.append(selecteur(dep));contenu.querySelector("select").focus();});
  tete.append(" ",changer);
  contenu.appendChild(tete);
  let donnees=null;
  try{const r=await fetch("assets/data/prochains/"+dep+".json",{cache:"no-cache"});if(r.ok)donnees=await r.json();}catch(e){}
  const aujourdhui=iso(new Date());
  const liste=donnees&&Array.isArray(donnees.tournois)?donnees.tournois.filter(t=>t.date_fin>=aujourdhui).slice(0,AT_NB):[];
  if(!liste.length){contenu.append(el("p","acc-muted",donnees?"Aucun tournoi annoncé pour le moment dans ce département.":"Liste indisponible pour le moment."));}
  else{
   const ul=el("ul","pdt-liste"),pos=position();
   liste.forEach(t=>{
    const li=el("li"),a=el("a");
    a.href=t.page?"tournoi/"+encodeURIComponent(t.id)+".html":"https://tenup.fft.fr/tournoi/"+encodeURIComponent(t.id);
    if(!t.page){a.target="_blank";a.rel="noopener";}
    const badge=el("span","cat-badge "+(/^P(25|50|100|250|500|1000|2000|3000)$/.test(t.categorie||"")?"cat-"+t.categorie.toLowerCase():"cat-autre"),t.categorie||"?");
    const texte=el("span","pdt-texte");texte.append(el("b","",t.nom),el("span","",t.ville+(pos&&typeof t.lat==="number"?" · "+km(pos,[t.lat,t.lng])+" km":"")));
    a.append(badge,texte,el("span","pdt-date",jour(t.date_debut)));
    li.appendChild(a);ul.appendChild(li);
   });
   contenu.appendChild(ul);
  }
  const tous=el("a","btn ghost","Tous les tournois du département");
  tous.href=(pages.departements||[]).includes(dep)?"tournois/"+dep+".html":"tournois.html";
  const div=el("div","btns");div.appendChild(tous);contenu.appendChild(div);
 }
 afficher(lireDep());
})();
