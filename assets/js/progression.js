/* TABLEAU DE BORD DE PROGRESSION (espace.html, bloc #esp-bord)
   Relie le test de niveau, les objectifs de jeu, le programme d'exercices, les matchs et l'entraînement :
     - mon niveau, en quatre lignes distinctes, sans aucune conversion de l'une à l'autre : niveau déclaré (pa-academie,
       grille FFT 1 à 10), quiz de l'académie (pa-academie-quiz), test de niveau (pa-quiz-dernier ou compte : catégorie de
       tournoi estimée, avec sa date et sa méthode) et classement FFT saisi (pa-classement-fft), le seul officiel ;
     - objectifs de jeu : OBJECTIFS_JEU (exercices-donnees.js), gardés par joueur-sync.js (pa-objectifs-jeu, compte si "progression") ;
     - programme de la semaine : PA_EXERCICES.programme (thèmes du test, des matchs et des objectifs ; nombre selon la fréquence de jeu) ;
     - derniers matchs : PA_JOURNAL ; historique : exercices faits (pa-exercices-faits) et semaines du plan validées (pa-weeks-v2).
   Aucune statistique estimée : seulement des comptes de ce que le joueur a fait sur le site.
   Dépend de exercices-donnees.js, exercices.js, journal.js et joueur-sync.js (chargés avant). */
(function(){
 const zone=document.getElementById("esp-bord");
 const E=window.PA_EXERCICES,J=window.PA_JOUEUR;
 if(!zone||!E||typeof OBJECTIFS_JEU==="undefined")return;
 const el=(b,c,t)=>{const e=document.createElement(b);if(c)e.className=c;if(t!==undefined)e.textContent=t;return e;};
 const lire=(cle,defaut)=>{try{const v=JSON.parse(localStorage.getItem(cle)||"null");return v===null?defaut:v;}catch(e){return defaut;}};
 const ecrire=(cle,v)=>{try{localStorage.setItem(cle,JSON.stringify(v));}catch(e){}};
 const jourIso=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
 const dateFr=s=>new Date(s).toLocaleDateString("fr-FR",{day:"numeric",month:"long"});
 const pluriel=(n,mot,motPluriel)=>n+" "+(n>1?(motPluriel||mot+"s"):mot);
 const FIABILITE={classement:"basé sur ton classement FFT",resultats:"basé sur tes résultats en tournoi",technique:"à confirmer en tournoi"};
 const FREQUENCES=["moins d'une fois par semaine","une fois par semaine","deux ou trois fois par semaine","quatre fois ou plus par semaine"];
 const faits=()=>{const f=lire(E.CLE_FAITS,{});return f&&typeof f==="object"?f:{};};
 const signaler=()=>window.dispatchEvent(new Event("pa-progression"));

 function objectifsActifs(){return J&&J.lireObjectifsJeu?J.lireObjectifsJeu():[];}
 function basculerObjectif(id){
  if(!J||!J.ecrireObjectifsJeu)return;
  const liste=objectifsActifs();
  const nouvelle=liste.some(o=>o.objectif===id)?liste.filter(o=>o.objectif!==id):[...liste,{objectif:id,depuis:jourIso(new Date())}];
  J.ecrireObjectifsJeu(nouvelle);
  if(J.synchroniser)J.synchroniser();
  signaler();
 }
 function semainesPlan(){
  const c=window.PA_COMPTE,id=c&&c.user?c.user.id:null;
  const d=lire("pa-weeks-v2:"+(id||"invite"),null);
  return d&&Array.isArray(d.done)?d.done.filter(n=>Number.isInteger(n)&&n>=0&&n<8).length:0;
 }

 function blocNiveau(quiz){
  const b=el("div","bord-bloc bord-niveau");b.appendChild(el("h3","","Mon niveau"));
  const dl=el("dl","bord-niveaux");
  const ligne=(cls,titre,valeur,detail,lien)=>{
   const d=el("div","bord-niv bord-niv-"+cls);d.appendChild(el("dt","",titre));
   const dd=el("dd");if(valeur)dd.appendChild(valeur);
   if(detail)dd.appendChild(el("span","acc-muted bord-niv-detail",detail));
   if(lien){const a=el("a","",lien[0]);a.href=lien[1];dd.appendChild(a);}
   d.appendChild(dd);dl.appendChild(d);
  };
  // 1. Niveau déclaré dans Mon académie (grille FFT 1 à 10)
  const C=window.PA_ACADEMIE_CONTENUS,niv=C?C.niveauDeclare():null;
  if(niv)ligne("declare","Niveau déclaré (grille FFT 1 à 10)",el("b","bord-niv-valeur",niv+" · "+((C.NOMS||{})[niv]||"")),null,["Changer","academie.html#niveaux"]);
  else ligne("declare","Niveau déclaré (grille FFT 1 à 10)",null,"Pas encore choisi. ",["Choisir mon niveau de 1 à 10","academie.html#niveaux"]);
  // 2. Quiz de l'académie
  const seances=C?C.seancesQuiz():[],der=seances[seances.length-1];
  if(der)ligne("quiz","Quiz de l'académie",el("b","bord-niv-valeur",der.reponses.filter(r=>r.juste).length+" sur "+der.reponses.length),
   " au niveau "+der.niveau+", le "+dateFr(der.debut)+(seances.length>1?" ("+pluriel(seances.length,"quiz")+")":"")+". ",["Nouveau quiz","academie.html#quiz"]);
  else ligne("quiz","Quiz de l'académie",null,"Aucun quiz pour l'instant. ",["Faire un quiz","academie.html#quiz"]);
  // 3. Test de niveau : catégorie de tournoi estimée
  if(quiz){
   const v2=Number.isInteger(quiz.palier)&&E.PALIERS[quiz.palier];
   ligne("test","Test de niveau (catégorie de tournoi estimée)",el("span","bord-palier",v2?E.PALIERS[quiz.palier]:"Niveau "+quiz.niveau+" sur 4"),
    "Test du "+dateFr(quiz.date)+(quiz.source&&FIABILITE[quiz.source]?" · "+FIABILITE[quiz.source]:"")+". ",["Refaire le test de niveau","niveau.html"]);
  }else ligne("test","Test de niveau (catégorie de tournoi estimée)",null,"Pas encore de test : 14 questions pour estimer ta catégorie de tournoi et tes 3 priorités. ",["Passer le test de niveau","niveau.html"]);
  // 4. Classement FFT saisi dans Mon padel
  const r=lire("pa-classement-fft",null);
  if(r&&Number.isInteger(r.rang))ligne("fft","Classement FFT",el("b","bord-niv-valeur",r.rang.toLocaleString("fr-FR")+"e"),r.sexe?" ("+r.sexe+"). ":". ",["Modifier","#mon-padel"]);
  else ligne("fft","Classement FFT",null,"Non renseigné. ",["Saisir mon classement","#mon-padel"]);
  b.appendChild(dl);
  b.appendChild(el("p","bord-avert","Seul le classement FFT est officiel : il vient de tes résultats en tournoi. Le niveau déclaré, les quiz et le test servent à personnaliser ton parcours ; aucun n'est converti en un autre."));
  return b;
 }
 function blocObjectifs(){
  const b=el("div","bord-bloc bord-objectifs");b.appendChild(el("h3","","Mes objectifs de jeu"));
  b.appendChild(el("p","acc-muted","Choisis ce que tu veux travailler (2 ou 3, c'est l'idéal) : ton programme en tient compte."));
  const actifs=new Set(objectifsActifs().map(o=>o.objectif));
  const liste=el("div","bord-puces");liste.setAttribute("role","group");liste.setAttribute("aria-label","Objectifs de jeu");
  OBJECTIFS_JEU.forEach(o=>{
   const bt=el("button","bord-puce",o.libelle);bt.type="button";bt.dataset.objectif=o.id;bt.setAttribute("aria-pressed",String(actifs.has(o.id)));
   bt.addEventListener("click",()=>basculerObjectif(o.id));
   liste.appendChild(bt);
  });
  b.appendChild(liste);
  return b;
 }
 function blocProgramme(quiz,themes){
  const b=el("div","bord-bloc bord-programme");b.appendChild(el("h3","","Mon programme de la semaine"));
  const freq=quiz&&quiz.reperes&&Number.isInteger(quiz.reperes.frequence)?quiz.reperes.frequence:null;
  const declare=window.PA_ACADEMIE_CONTENUS?window.PA_ACADEMIE_CONTENUS.niveauExerciceDeclare():null;
  const niveau=declare||(quiz&&Number.isInteger(quiz.niveau)&&quiz.niveau>=1&&quiz.niveau<=4?quiz.niveau:2);
  if(!themes.length){
   b.appendChild(el("p","acc-muted","Passe le test de niveau, choisis un objectif ou compte un match : ton programme apparaîtra ici."));
   return b;
  }
  const f=faits(),programme=E.programme(themes,niveau,freq,f);
  b.appendChild(el("p","acc-muted",pluriel(programme.length,"exercice")+" cette semaine"+(freq!==null?", parce que tu joues "+FREQUENCES[freq]+" (test de niveau).":" (indique ta fréquence de jeu dans le test de niveau pour l'ajuster).")));
  const ol=el("ol","bord-liste");
  let prochainMarque=false;
  programme.forEach(p=>{
   const e=p.exercice,fait=f[e.id]&&(Date.now()-Date.parse(f[e.id]))<6*86400000;
   const li=el("li","bord-ex"+(fait?" bord-fait":""));
   if(!fait&&!prochainMarque){li.classList.add("bord-prochain");li.appendChild(el("span","bord-etiquette","Prochain exercice"));prochainMarque=true;}
   li.appendChild(el("b","",e.titre));
   li.appendChild(el("span","bord-meta",e.duree+" · "+e.joueurs+" · "+(E.LIBELLES[p.theme]||p.theme)));
   li.appendChild(el("span","bord-pourquoi","Pourquoi : "+[...new Set(p.raisons)].slice(0,2).join(" · ")));
   const bt=el("button","btn ghost bord-fait-btn",fait?"Fait le "+new Date(f[e.id]).toLocaleDateString("fr-FR"):"Je l'ai fait");
   bt.type="button";bt.dataset.exercice=e.id;bt.setAttribute("aria-pressed",String(!!fait));
   bt.addEventListener("click",()=>{
    const g=faits(),annuler=!!(g[e.id]&&fait);
    if(annuler)delete g[e.id];else g[e.id]=new Date().toISOString();
    // Après le rendu : « fait » → focus sur le prochain exercice (sinon le titre du programme) ; annulé → même bouton
    focusFait={id:e.id,annuler};
    ecrire(E.CLE_FAITS,g);signaler();
    annoncer(annuler?"« "+e.titre+" » n'est plus marqué comme fait.":"« "+e.titre+" » marqué comme fait.");
   });
   li.appendChild(bt);
   ol.appendChild(li);
  });
  b.appendChild(ol);
  if(!prochainMarque)b.appendChild(el("p","acc-ok","Programme de la semaine terminé. De nouveaux exercices arrivent dans quelques jours."));
  const a=el("a","","Le détail des exercices recommandés");a.href="#esp-bloc-exercices";b.appendChild(a);
  return b;
 }
 function blocMatchs(){
  const b=el("div","bord-bloc bord-matchs");b.appendChild(el("h3","","Mes derniers matchs"));
  const liste=window.PA_JOURNAL?window.PA_JOURNAL.liste().slice(0,3):[];
  if(!liste.length){
   const p=el("p","acc-muted","Aucun match pour l'instant. ");const a=el("a","","Compte ton prochain match");a.href="score.html";p.appendChild(a);b.appendChild(p);return b;
  }
  const ul=el("ul","bord-liste-simple");
  liste.forEach(m=>{
   const res=m.vainqueur===0?"gagné":m.vainqueur===1?"perdu":m.interrompu?"arrêté":"";
   ul.appendChild(el("li","",new Date(m.fin).toLocaleDateString("fr-FR")+" · contre "+(m.adversaires||"?")+(m.score?" · "+m.score:"")+(res?" ("+res+")":"")));
  });
  b.appendChild(ul);
  const a=el("a","","Tout le journal");a.href="#esp-bloc-matchs";b.appendChild(a);
  return b;
 }
 function blocHistorique(){
  const b=el("div","bord-bloc bord-historique");b.appendChild(el("h3","","Mon entraînement"));
  const f=faits(),depuis=Date.now()-30*86400000;
  const recents=Object.entries(f).filter(([,d])=>Date.parse(d)>=depuis).sort((a,b)=>Date.parse(b[1])-Date.parse(a[1]));
  const matchsMois=window.PA_JOURNAL?window.PA_JOURNAL.liste().filter(m=>Date.parse(m.fin)>=depuis).length:0;
  const ul=el("ul","bord-chiffres");
  [[recents.length,pluriel(recents.length,"exercice fait","exercices faits")+" ces 30 derniers jours"],
   [semainesPlan(),"semaine"+(semainesPlan()>1?"s":"")+" du plan validée"+(semainesPlan()>1?"s":"")+" sur 8"],
   [matchsMois,pluriel(matchsMois,"match")+" sur 30 jours"]].forEach(([n,t])=>{const li=el("li");li.append(el("b","",String(n)),el("span","",t.replace(/^\d+ /,"")));ul.appendChild(li);});
  b.appendChild(ul);
  if(recents.length){
   const titres=Object.fromEntries((typeof EXERCICES!=="undefined"?EXERCICES:[]).map(e=>[e.id,e.titre]));
   const ol=el("ul","bord-liste-simple");
   recents.slice(0,3).forEach(([id,d])=>{if(titres[id])ol.appendChild(el("li","",new Date(d).toLocaleDateString("fr-FR")+" · "+titres[id]));});
   b.appendChild(ol);
  }
  const a=el("a","","Le plan d'entraînement 8 semaines");a.href="entrainement.html";b.appendChild(a);
  return b;
 }
 function rendre(){
  const quiz=E.dernierQuiz?E.dernierQuiz():null;
  const matchs=window.PA_JOURNAL?window.PA_JOURNAL.liste():[];
  const themes=E.themesPrioritaires(quiz,matchs,objectifsActifs().map(o=>o.objectif),window.PA_DIAGNOSTIC?window.PA_DIAGNOSTIC.difficultes():[],window.PA_ACADEMIE_CONTENUS?window.PA_ACADEMIE_CONTENUS.pourExercices():[]);
  zone.textContent="";
  zone.append(blocNiveau(quiz),blocObjectifs(),blocProgramme(quiz,themes),blocMatchs(),blocHistorique());
  // Le focus reste sur la puce qu'on vient de basculer
  if(focusObjectif){const p=zone.querySelector('.bord-puce[data-objectif="'+focusObjectif+'"]');if(p)p.focus();focusObjectif=null;}
  if(focusFait){
   const prochain=zone.querySelector(".bord-prochain .bord-fait-btn"),meme=zone.querySelector('.bord-fait-btn[data-exercice="'+focusFait.id+'"]');
   const titre=zone.querySelector(".bord-programme h3");
   const cible=focusFait.annuler?meme:prochain;
   if(cible)cible.focus();else if(titre){titre.setAttribute("tabindex","-1");titre.focus();}
   focusFait=null;
  }
 }
 let focusObjectif=null,focusFait=null;
 // Annonce pour les lecteurs d'écran (zone #esp-annonce d'espace.html)
 function annoncer(texte){const z=document.getElementById("esp-annonce");if(!z)return;z.textContent="";setTimeout(()=>{z.textContent=texte;},60);}
 zone.addEventListener("click",e=>{const p=e.target.closest(".bord-puce");if(p)focusObjectif=p.dataset.objectif;},true);
 window.addEventListener("pa-progression",rendre);
 if(window.PA_JOURNAL)window.PA_JOURNAL.onChange(rendre);
 if(J&&J.onChange)J.onChange(rendre);
 const c=window.PA_COMPTE;
 if(c&&c.actif)c.onChange(()=>setTimeout(rendre,50));
 document.addEventListener("visibilitychange",()=>{if(!document.hidden)rendre();});
 rendre();
})();
