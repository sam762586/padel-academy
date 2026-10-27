/* DÉFI DE LA SEMAINE (espace.html#esp-bloc-defi)
   Un thème par semaine (lundi → dimanche, semaine ISO), le même pour tout le monde : les 10 thèmes des exercices tournent
   dans un ordre fixe, soit un cycle de 10 semaines. Dans ce thème, l'exercice du niveau du joueur (dernier test de niveau,
   niveau déclaré dans Mon académie, sinon pa-quiz-dernier ; niveau 2 sans test), pris dans exercices-donnees.js : consigne, durée, objectif mesurable.
   « J'ai relevé le défi » : auto-évaluation, gardée sur l'appareil (pa-defis : { "2026-W44": { id, date, fait } }) ;
   l'exercice compte aussi comme fait (pa-exercices-faits) s'il ne l'était pas déjà, et seulement dans ce cas il est
   retiré si on décoche. Série : semaines d'affilée relevées (la semaine en cours ne la casse pas tant qu'elle dure). */
const DF_CLE="pa-defis";
const DF_THEMES=["vitre","service","aerien","couple","placement","montee","regularite","transition","communication","compet"];
const DF_ORIGINE=Date.UTC(2025,11,29); // lundi de la semaine 2026-W01 : début du cycle
const DF_JOUR=86400000;

// Lundi (minuit UTC) de la semaine d'une date, d'après sa date locale
function dfLundi(d){const j=Date.UTC(d.getFullYear(),d.getMonth(),d.getDate());return j-((new Date(j).getUTCDay()+6)%7)*DF_JOUR;}
// Semaine ISO « 2026-W44 » d'un lundi (l'année ISO est celle du jeudi de la semaine)
function dfSemaine(lundi){
 const jeudi=new Date(lundi+3*DF_JOUR),an=jeudi.getUTCFullYear();
 const n=1+Math.floor((jeudi-Date.UTC(an,0,1))/DF_JOUR/7);
 return an+"-W"+String(n).padStart(2,"0");
}
// Le défi d'une semaine pour un niveau (1 à 4) : thème du cycle, exercice de ce niveau (sinon le plus proche)
function dfDefi(lundi,niveau){
 const rang=Math.round((lundi-DF_ORIGINE)/DF_JOUR/7),theme=DF_THEMES[((rang%10)+10)%10];
 const l=(typeof EXERCICES!=="undefined"?EXERCICES:[]).filter(e=>e.theme===theme);
 const exercice=l.find(e=>e.niveaux.includes(niveau))||l.slice().sort((a,b)=>Math.abs(a.niveaux[0]-niveau)-Math.abs(b.niveaux[0]-niveau))[0]||null;
 return {semaine:dfSemaine(lundi),lundi,theme,exercice};
}
// Série : semaines relevées d'affilée, en partant de la semaine en cours (ou de la précédente si celle-ci n'est pas relevée)
function dfSerie(releves,lundi){
 let l=releves[dfSemaine(lundi)]?lundi:lundi-7*DF_JOUR,n=0;
 while(releves[dfSemaine(l)]){n++;l-=7*DF_JOUR;}
 return n;
}
function dfNiveau(){
 const declare=window.PA_ACADEMIE_CONTENUS?window.PA_ACADEMIE_CONTENUS.niveauExerciceDeclare():null;
 if(declare)return declare; // niveau déclaré dans Mon académie
 try{const q=JSON.parse(localStorage.getItem("pa-quiz-dernier")||"null");if(q&&Number.isInteger(q.niveau)&&q.niveau>=1&&q.niveau<=4)return q.niveau;}catch(e){}
 return 2;
}
function dfLire(cle){try{const v=JSON.parse(localStorage.getItem(cle)||"{}");return v&&typeof v==="object"&&!Array.isArray(v)?v:{};}catch(e){return {};}}
function dfEcrire(cle,v){try{localStorage.setItem(cle,JSON.stringify(v));}catch(e){/* stockage indisponible */}}

function dfDemarrer(){
 // Mon espace (#esp-defi) ou Mon académie (#ac-defi, redessinée par academie-parcours.js) : même défi, même stockage.
 // La zone est retrouvée à chaque affichage ; PA_DEFIS_RENDRE permet à l'académie de redemander l'affichage.
 const trouver=()=>document.getElementById("esp-defi")||document.getElementById("ac-defi");
 // pages sans défi : rien à faire (le parcours de l'académie, #ap, crée sa zone #ac-defi plus tard)
 if(typeof EXERCICES==="undefined"||(!trouver()&&!document.getElementById("ap")))return;
 const libelles=window.PA_EXERCICES&&window.PA_EXERCICES.LIBELLES||{};
 const cleFaits=window.PA_EXERCICES&&window.PA_EXERCICES.CLE_FAITS||"pa-exercices-faits";
 const el=(b,c,t)=>{const e=document.createElement(b);if(c)e.className=c;if(t!==undefined)e.textContent=t;return e;};
 let zone=null;
 function rendre(){
  zone=trouver();
  if(!zone)return;
  const maintenant=new Date(),lundi=dfLundi(maintenant),d=dfDefi(lundi,dfNiveau()),releves=dfLire(DF_CLE);
  const releve=releves[d.semaine],e=d.exercice;
  zone.textContent="";
  if(!e)return;
  const tete=el("p","df-tete");
  tete.append(el("span","df-theme",libelles[d.theme]||d.theme));
  const restants=Math.round((lundi+7*DF_JOUR-Date.UTC(maintenant.getFullYear(),maintenant.getMonth(),maintenant.getDate()))/DF_JOUR);
  tete.append(el("span","df-echeance",restants<=1?"Nouveau défi demain, lundi":"Nouveau défi lundi, dans "+restants+" jours"));
  const art=el("article","df-carte");
  const t=el("div","ex-tete");t.append(el("h3","",e.titre),el("span","ex-meta",e.duree+" · "+e.joueurs));
  art.append(t,el("p","",e.consigne));
  const r=el("p","ex-reussite");r.append(el("b","","Objectif : "),e.reussite);art.appendChild(r);
  const pied=el("div","ex-pied");
  if(e.lien){const a=el("a","","Revoir le geste");a.href=e.lien;pied.appendChild(a);}
  const b=el("button","btn "+(releve?"ghost":"primary")+" df-releve",releve?"Défi relevé le "+new Date(releve.date).toLocaleDateString("fr-FR"):"J'ai relevé le défi");
  b.type="button";b.setAttribute("aria-pressed",String(!!releve));
  b.addEventListener("click",()=>{
   const rel=dfLire(DF_CLE),faits=dfLire(cleFaits);
   if(rel[d.semaine]){
    if(rel[d.semaine].fait)delete faits[rel[d.semaine].id]; // retiré seulement si c'est le défi qui l'avait ajouté
    delete rel[d.semaine];
   }else{
    const date=new Date().toISOString(),ajoute=!faits[e.id];
    if(ajoute)faits[e.id]=date;
    rel[d.semaine]={id:e.id,date,fait:ajoute};
   }
   dfEcrire(DF_CLE,rel);dfEcrire(cleFaits,faits);
   window.dispatchEvent(new Event("pa-progression")); // exercices recommandés et tableau de bord
   zone.querySelector(".df-releve")?.focus();
  });
  pied.appendChild(b);art.appendChild(pied);
  // Série et 8 dernières semaines
  const serie=dfSerie(releves,lundi),suivi=el("div","df-suivi");
  suivi.append(el("p","df-serie",serie?"Série : "+serie+" semaine"+(serie>1?"s":"")+" d'affilée":"Pas encore de série : relève le défi de cette semaine pour la lancer."));
  const pastilles=el("ol","df-semaines");pastilles.setAttribute("aria-label","Les 8 dernières semaines");
  for(let k=7;k>=0;k--){
   const s=dfSemaine(lundi-k*7*DF_JOUR),ok=!!releves[s],li=el("li","df-pastille"+(ok?" ok":"")+(k===0?" encours":""));
   li.title=s+(ok?" : défi relevé":" : non relevé");
   li.append(el("span","sr-only",(k===0?"Cette semaine":"Semaine "+s.slice(-2))+(ok?" : relevé":" : non relevé")));
   pastilles.appendChild(li);
  }
  suivi.appendChild(pastilles);
  zone.append(tete,art,suivi);
 }
 window.addEventListener("pa-progression",rendre);
 window.PA_DEFIS_RENDRE=rendre;
 rendre();
}
window.PA_DEFIS={lundi:dfLundi,semaine:dfSemaine,defi:dfDefi,serie:dfSerie,THEMES:DF_THEMES,CLE:DF_CLE};
dfDemarrer();
