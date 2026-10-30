/* TEST DE NIVEAU (niveau.html)
   Deux parties :
     1. Repères : classement FFT, résultats en tournoi, ancienneté, fréquence de jeu, passé en sport de raquette ;
     2. En match : 9 situations. Chaque réponse décrit ce qu'on observe chez les joueurs d'un palier donné (0 à 5).
   Le palier final (0 Découverte … 5 P1000 et +) se décide ainsi (pnEstimer, moteur pur, testé) :
     - classement FFT saisi : il fait foi (un palier de plus seulement si le jeu décrit est nettement au-dessus) ;
     - sinon résultats en tournoi : plancher, et au plus un palier au-dessus ;
     - sinon technique seule : plafonnée à P250 (« à confirmer en tournoi ») ;
     - dans tous les cas, l'ancienneté, la fréquence et le passé en raquette plafonnent ce que la technique peut annoncer.
   Les options sont mélangées à chaque affichage : la bonne réponse ne se devine pas à sa place. */
const PN_PALIERS=[
 {nom:"Découverte",cls:"go",txt:"Tu apprends les bases : laisser la balle sortir de la vitre, tenir l'échange en fond de court, passer ton service à chaque fois. Le premier tournoi viendra quand tu tiendras 10 échanges de suite. Joue deux fois par semaine et prends quelques cours collectifs : c'est le palier où l'on progresse le plus vite."},
 {nom:"P25",cls:"go",txt:"Tu peux t'inscrire en P25 : tu y joueras des paires de ton niveau. Ici, la paire qui gagne est celle qui fait le moins de fautes : défense patiente, lobs hauts et profonds, service qui passe toujours. Ta bandeja n'a pas besoin d'être belle, elle doit te laisser au filet."},
 {nom:"P100",cls:"go",txt:"Tu es à ta place en P100, et en P50 si tu es classé au-delà du top 10 000 (dames : 1 000). Pour gagner des matchs en P250 : une bandeja qui te garde au filet 7 fois sur 10, des sorties de vitre (double vitre comprise) sans balle facile pour l'adversaire, et monter à deux derrière chaque lob qui les fait reculer."},
 {nom:"P250",cls:"maybe",txt:"Tu es un bon joueur de club, à ta place en P250. Ce qui sépare du P500 : la vitesse de balle adverse, une víbora qui fait mal, les balles basses au milieu du court (chiquita, volée basse) et la régularité sur trois sets. Dans le classement FFT, ce palier correspond environ aux places 1 000 à 5 000 chez les messieurs (100 à 500 chez les dames)."},
 {nom:"P500",cls:"stop",txt:"Tu fais partie des meilleurs joueurs de ta région. En P500, les points se gagnent sur la décision : le choix du coup selon la paire adverse, le déplacement sans la balle, le smash par 3 quand la balle le permet. Le cap P1000 demande un entraînement encadré (coach, physique, vidéo) plus que du volume de matchs."},
 {nom:"P1000 et +",cls:"stop",txt:"Tu joues au niveau national. Ton classement en dit plus que ce test : travaille avec un coach sur des points précis, filme tes matchs et soigne la récupération entre les tours."},
];
const PN_NIVEAU_EXERCICES=[1,1,2,3,4,4]; // palier -> niveau des exercices de l'espace joueur (1 à 4)
// Ordre des thèmes enregistrés (même ordre que la validation SQL)
const PN_THEMES=["vitre","service","aerien","couple","placement","montee","regularite","transition","communication","compet"];
const QL_THEMES={vitre:["Sorties de vitre","technique.html#coups"],service:["Service et première volée","technique.html#coups"],aerien:["Bandeja, víbora et smash","tutos.html"],couple:["Bouger avec son partenaire","tutos.html"],placement:["Placement au filet","tactique.html#placement"],montee:["Reprendre le filet","tutos.html"],regularite:["Régularité en défense","conseils.html#erreurs"],transition:["Balles basses et chiquita","technique.html#coups"],communication:["Communication","tactique.html#placement"],compet:["Compétition","competition.html"]};
// Poids dans la moyenne technique : les coups qui décident des matchs amateurs comptent plus
const PN_POIDS={vitre:1.5,aerien:1.5,regularite:1.5,placement:1,couple:1,montee:1,service:.75,transition:.75,communication:.5};
const PN_CLES=["vitre","aerien","regularite"]; // un trou sur l'un d'eux limite le palier (au plus 2 au-dessus)
// Ordre des priorités pour les paliers Découverte et P25 : d'abord défendre, sortir de la vitre et se placer ; le jeu aérien vient après
const PN_POIDS_DEBUT={regularite:1.6,vitre:1.5,placement:1.2,couple:1.1,service:1,communication:.8,montee:.7,transition:.6,aerien:.5};

// Repères : chaque option porte sa valeur (v)
const PN_REPERES=[
 {id:"resultats",q:"Tes résultats en tournoi FFT sur les 12 derniers mois :",o:[
  ["Je n'ai jamais joué de tournoi",null],
  ["Quelques P25 ou P50, je perds souvent mon premier match",1],
  ["Je gagne des matchs en P25 ou P50",1.5],
  ["Je gagne des P25 / P50, ou je passe des tours en P100",2],
  ["Je passe des tours en P250",3],
  ["Je passe des tours en P500",4],
  ["Je gagne des matchs en P1000 ou plus",5]]},
 {id:"anciennete",q:"Tu joues au padel depuis…",o:[["Moins de 6 mois",0],["6 mois à 2 ans",1],["2 à 4 ans",2],["Plus de 4 ans",3]]},
 {id:"frequence",q:"En moyenne, tu joues…",o:[["Moins d'une fois par semaine",0],["Une fois par semaine",1],["Deux ou trois fois par semaine",2],["Quatre fois ou plus, ou avec des entraînements encadrés",3]]},
 {id:"raquette",q:"Avant le padel, tu as pratiqué un sport de raquette ?",o:[["Non, ou très peu",0],["Oui, en loisir (tennis, squash, badminton…)",0],["Oui, en compétition : tennis classé, squash ou badminton en club",1],["Oui, à bon niveau : tennis 2e série ou mieux, squash ou badminton national",2]]},
];
const PN_PLAFOND_ANCIENNETE=[1,2,3,5];   // moins de 6 mois : P25 au plus ; 6 mois à 2 ans : P100 ; 2 à 4 ans : P250
const PN_PLAFOND_FREQUENCE=[3,4,5,5];    // moins d'une fois par semaine : P250 au plus

// Situations de match : [texte, palier observé]
const PN_SITUATIONS=[
 {theme:"vitre",q:"Une balle adverse passe à côté de toi et rebondit dans la vitre du fond. En match, le plus souvent…",o:[
  ["Je frappe avant qu'elle touche la vitre, ou je la rate à la sortie",0],
  ["Je la remets après la vitre, mais haute et courte, au milieu",1],
  ["Je la remets en lob correct sur une vitre simple ; sur un double vitre, je galère",2],
  ["Lob profond ou balle basse au centre, double vitre compris",3],
  ["Je choisis lob, chiquita ou accélération selon la position des volleyeurs",4],
  ["Si elle ressort haute, j'attaque en bajada de pared et je reprends le filet",5]]},
 {theme:"service",q:"Ton service et la balle qui suit, en match :",o:[
  ["Je fais surtout attention à le passer, il m'arrive de faire double faute",0],
  ["Il passe presque toujours, mais je reste au fond après",1],
  ["Je sers et je monte, mais ma première volée part souvent dans le filet ou courte",2],
  ["Service slicé sur la vitre ou au T, je monte et ma première volée part profonde",3],
  ["Je varie zone, effet et rythme selon le relanceur ; ma première volée le met sous pression",4]]},
 {theme:"aerien",q:"Lob adverse mi-profond, tu es au filet. Ce qui se passe le plus souvent :",o:[
  ["Je recule en courant et je la renvoie comme je peux, souvent après le rebond",0],
  ["Je smashe à plat ou je la laisse passer, et on perd le filet",1],
  ["Bandeja la plupart du temps, mais elle sort ou reste courte au milieu",2],
  ["Bandeja profonde qui me laisse au filet environ 7 fois sur 10",3],
  ["Bandeja ou víbora selon la hauteur, placée sur la grille ou sur le moins bon défenseur",4],
  ["Sur une balle haute, je sors la balle par 3 ou par 4 ; sinon víbora qui fait mal",5]]},
 {theme:"couple",q:"Ton partenaire se fait lober et recule. Toi, en général :",o:[
  ["Je regarde ce qu'il fait, on se retrouve souvent du même côté",0],
  ["Je recule aussi, mais tard : on finit un au filet, un au fond",1],
  ["On recule ensemble et on remonte ensemble quand on peut",2],
  ["Si c'est moi qui prends le lob, on change de côté sans se gêner",3],
  ["Je tiens le centre s'il peut jouer la bandeja, je recule seulement s'il doit la laisser passer",4]]},
 {theme:"placement",q:"Toi au filet, sur un match, les lobs adverses…",o:[
  ["Me passent presque tous au-dessus, je suis souvent collé au filet",0],
  ["Me passent souvent ; ou alors je recule trop et je prends des balles dans les pieds",1],
  ["Je touche les lobs moyens, les bons lobs me passent",2],
  ["Seuls les très bons lobs me passent : j'avance et je recule avec la balle adverse",3],
  ["Je sens le lob venir, et j'avance pour fermer dès que l'adversaire est en difficulté",4]]},
 {theme:"montee",q:"Après avoir défendu au fond, on reprend le filet…",o:[
  ["Rarement, on passe le point au fond",0],
  ["Dès qu'on peut, mais on se fait souvent passer ou toucher dans les pieds",1],
  ["Après un bon lob, mais pas toujours ensemble",2],
  ["Après un lob profond ou une chiquita, ensemble, plusieurs fois par jeu",3],
  ["Quand on l'a décidé ; on sait aussi rester au fond quand notre lob est court",4]]},
 {theme:"regularite",q:"En défense contre des volleyeurs de ton niveau, tu remets en moyenne…",o:[
  ["2 ou 3 balles, ensuite je fais la faute",0],
  ["5 ou 6 balles si elles ne vont pas trop vite",1],
  ["Souvent 10 balles, mais je perds patience et je tente un coup",2],
  ["Autant qu'il faut ; mes fautes viennent quand l'adversaire accélère",3],
  ["Autant qu'il faut, avec peu de fautes même contre des frappes fortes",4],
  ["Je ne fais presque pas de fautes : l'adversaire doit construire chaque point",5]]},
 {theme:"transition",q:"Une balle basse arrive alors que tu es au milieu du court…",o:[
  ["Je frappe fort, souvent dans le filet ou dehors",0],
  ["Je la remets haute et elle se fait smasher",1],
  ["Je la remets en jeu, puis je recule au fond",2],
  ["Volée basse ou chiquita dans les pieds, puis je monte",3],
  ["Chiquita, lob ou accélération selon les volleyeurs, sans perdre l'avantage",4]]},
 {theme:"communication",q:"Pendant le match, avec ton partenaire…",o:[
  ["On ne se parle pas pendant le point",0],
  ["On annonce parfois, souvent trop tard",1],
  ["« Moi », « toi », « lob » à chaque balle disputée",2],
  ["On parle aussi entre les points : où servir, qui prend les balles au centre",3],
  ["On a un plan de jeu et on l'adapte aux adversaires pendant le match",4]]},
];

/* Palier d'après le classement FFT. Les seuils suivent les cuts des épreuves seniors
   (CUTS et CUTS_NUM de assets/js/bareme-donnees.js, relevés sur Ten'Up le 26/10/2026) :
   on ne conseille jamais une catégorie fermée au joueur (P25 fermé au top 30 000, P100 au top 5 000, P250 au top 1 000).
   bareme-donnees.js n'est pas chargé sur niveau.html : copie ci-dessous, à tenir à jour avec CUTS_NUM.
   Le seuil P1000 (top 200) est un repère : P500 et au-dessus sont ouverts à tous. */
const PN_CUTS={P25:{messieurs:30000,dames:3000},P100:{messieurs:5000,dames:500},P250:{messieurs:1000,dames:100},P1000:{messieurs:200,dames:20}};
function pnPalierDuRang(rang,sexe){
 if(!Number.isInteger(rang)||rang<1)return null;
 const s=sexe==="dames"?"dames":"messieurs";
 return rang<=PN_CUTS.P1000[s]?5:rang<=PN_CUTS.P250[s]?4:rang<=PN_CUTS.P100[s]?3:rang<=PN_CUTS.P25[s]?2:1;
}
/* Moteur. e = { rang, sexe, resultats (null ou 1 à 5), anciennete et frequence (0 à 3), raquette (bonus 0 à 2), technique : { theme: palier } }
   Renvoie { palier, source, moyenne, notes, themes : [{theme, palier, pts}], priorites : [theme] } */
function pnEstimer(e){
 const t=e.technique||{};
 const themesTech=Object.keys(PN_POIDS);
 let somme=0,poids=0;
 themesTech.forEach(th=>{somme+=PN_POIDS[th]*t[th];poids+=PN_POIDS[th];});
 const moyenne=somme/poids;
 let tech=Math.round(moyenne);
 tech=Math.min(tech,Math.min(...PN_CLES.map(th=>t[th]))+2);
 const plafond=Math.min(5,PN_PLAFOND_ANCIENNETE[e.anciennete]+(e.raquette||0),PN_PLAFOND_FREQUENCE[e.frequence]);
 const techPlafonnee=Math.min(tech,plafond);
 const R=e.resultats===null||e.resultats===undefined?null:Math.floor(e.resultats);
 const K=pnPalierDuRang(e.rang,e.sexe);
 const notes=[];
 let palier,source;
 if(K!==null){
  source="classement";
  palier=Math.max(K,R!==null?Math.min(R,K+1):K);
  if(tech>=palier+2){palier++;notes.push("Ton jeu décrit est nettement au-dessus de ton classement : joue plus de tournois, ton classement devrait suivre.");}
  else if(tech<=palier-2)notes.push("Tu as décrit ton jeu plus modestement que ton classement : tu te sous-estimes peut-être. Le classement reste la meilleure mesure.");
 }else if(R!==null){
  source="resultats";
  palier=Math.max(R,Math.min(techPlafonnee,R+1));
 }else{
  source="technique";
  palier=Math.min(techPlafonnee,3);
  if(techPlafonnee>3)notes.push("Ton jeu décrit va au-delà du P250, mais sans résultat en tournoi on ne peut pas aller plus loin : un ou deux P250 te situeront vite.");
 }
 palier=Math.max(0,Math.min(5,palier));
 if(source!=="classement"&&tech>palier&&plafond<=palier)notes.push("Ta technique est au-dessus de ce palier, mais avec ton temps de jeu, les matchs serrés se gagnent encore à l'expérience. Ça viendra en jouant.");
 if(source!=="classement"&&palier<5&&tech<=palier&&moyenne-palier>=.35)notes.push("Tu es proche du palier suivant ("+PN_PALIERS[palier+1].nom+").");
 if(R!==null&&R<palier)notes.push("Tes résultats sont en dessous de ton niveau de jeu : inscris-toi en "+PN_PALIERS[palier].nom+", c'est là que tu progresseras.");
 // Compétition : palier des résultats (sans tournoi : neutre). Elle n'entre pas dans les priorités techniques.
 const paliers={...t,compet:R===null?palier:R};
 const themes=PN_THEMES.map(th=>({theme:th,palier:paliers[th],pts:Math.max(0,Math.min(3,3-(palier+1-paliers[th])))}));
 const priorites=themes.filter(x=>x.theme!=="compet"&&x.palier<=palier)
  .sort((a,b)=>{const P=palier<=1?PN_POIDS_DEBUT:PN_POIDS;return a.palier-b.palier||P[b.theme]-P[a.theme]||PN_THEMES.indexOf(a.theme)-PN_THEMES.indexOf(b.theme);})
  .slice(0,3).map(x=>x.theme);
 return {palier,source,moyenne,notes,themes,priorites};
}
window.PA_NIVEAU={PALIERS:PN_PALIERS,REPERES:PN_REPERES,SITUATIONS:PN_SITUATIONS,THEMES:PN_THEMES,NIVEAU_EXERCICES:PN_NIVEAU_EXERCICES,palierDuRang:pnPalierDuRang,estimer:pnEstimer};

(function(){
 const carte=document.getElementById("qcard");
 if(!carte)return;
 const etapes=[{type:"rang"},...PN_REPERES.map(r=>({type:"repere",d:r})),...PN_SITUATIONS.map(s=>({type:"situation",d:s}))];
 let i=0,rep={};
 const el=(b,c,t)=>{const x=document.createElement(b);if(c)x.className=c;if(t!==undefined)x.textContent=t;return x;};
 function melanger(n){const a=[...Array(n).keys()];for(let k=n-1;k>0;k--){const j=Math.floor(Math.random()*(k+1));[a[k],a[j]]=[a[j],a[k]];}return a;}
 function rangEnregistre(){try{const r=JSON.parse(localStorage.getItem("pa-classement-fft")||"null");return r&&Number.isInteger(r.rang)&&["messieurs","dames"].includes(r.sexe)?r:null;}catch(e){return null;}}
 // Clavier et lecteurs d'écran : le bouton cliqué disparaît à chaque étape, le focus va donc sur le titre de la question suivante
 function suivant(){i++;if(i<etapes.length)rendre(true);else resultat();}
 // focus : vrai après une réponse ou « Refaire le test », faux au premier affichage (on ne déplace pas le visiteur qui arrive)
 function rendre(focus){
  const et=etapes[i],opts=document.getElementById("qopts"),titre=document.getElementById("qtext");
  const placerFocus=()=>{if(focus&&titre)titre.focus();};
  document.getElementById("qnum").textContent=(i<=PN_REPERES.length?"Repères":"En match")+" · "+(i+1)+" / "+etapes.length;
  document.getElementById("qbarfill").style.width=(i/etapes.length*100)+"%";
  opts.textContent="";
  if(et.type==="rang"){
   titre.textContent="As-tu un classement FFT padel ?";
   const f=el("form","qrang");f.noValidate=true;
   const deja=rangEnregistre();
   // Le choix dit de quel classement vient le rang (messieurs ou dames) : groupe nommé par une légende lue par les lecteurs d'écran
   const sexes=el("fieldset","qrang-sexe");sexes.appendChild(el("legend","sr-only","Classement messieurs ou dames"));
   [["messieurs","Messieurs"],["dames","Dames"]].forEach(([v,l],k)=>{
    const lab=el("label","");const r=document.createElement("input");r.type="radio";r.name="qsexe";r.value=v;r.checked=deja?deja.sexe===v:k===0;lab.append(r," "+l);sexes.appendChild(lab);
   });
   const lab=el("label","qrang-champ","Ton rang");const champ=document.createElement("input");champ.type="number";champ.id="qrang";champ.min="1";champ.max="500000";champ.inputMode="numeric";champ.placeholder="ex. 12 500";
   if(deja)champ.value=deja.rang;
   lab.appendChild(champ);
   const valider=el("button","btn primary","Valider mon rang");valider.type="submit";
   const err=el("p","acc-err");err.id="qrang-err";err.setAttribute("role","status");
   champ.setAttribute("aria-describedby","qrang-err");
   champ.addEventListener("input",()=>{champ.removeAttribute("aria-invalid");});
   f.append(sexes,lab,valider,err);
   f.addEventListener("submit",ev=>{
    ev.preventDefault();
    const n=Number(champ.value);
    if(!Number.isInteger(n)||n<1||n>500000){err.textContent="Entre ton rang (un nombre entier), ou choisis « Je ne suis pas classé ».";champ.setAttribute("aria-invalid","true");champ.focus();return;}
    rep.rang=n;rep.sexe=f.querySelector('input[name="qsexe"]:checked').value;suivant();
   });
   const non=el("button","qopt","Je ne suis pas classé(e)");non.type="button";
   non.addEventListener("click",()=>{rep.rang=null;rep.sexe=null;suivant();});
   opts.append(f,non);
   placerFocus();
   return;
  }
  titre.textContent=et.d.q;
  melanger(et.d.o.length).forEach(k=>{
   const b=el("button","qopt",et.d.o[k][0]);b.type="button";
   b.addEventListener("click",()=>{
    if(et.type==="repere")rep[et.d.id]=et.d.o[k][1];
    else (rep.technique=rep.technique||{})[et.d.theme]=et.d.o[k][1];
    suivant();
   });
   opts.appendChild(b);
  });
  placerFocus();
 }
 function resultat(){
  const r=pnEstimer(rep),P=PN_PALIERS[r.palier];
  const fiabilite={classement:"Fiable : basé sur ton classement FFT",resultats:"Assez fiable : basé sur tes résultats en tournoi",technique:"Indicatif : à confirmer en tournoi"}[r.source];
  carte.hidden=true;
  const z=document.getElementById("qresult");z.hidden=false;z.textContent="";
  // Titre du résultat : il reçoit le focus (le bouton de la dernière réponse a disparu)
  const titre=el("h3","");titre.tabIndex=-1;
  titre.append(el("span","sr-only","Ton palier : "),el("span","vtag "+P.cls,P.nom));
  z.append(titre,el("p","score",fiabilite),el("p","",P.txt));
  z.appendChild(el("p","qnote","Ce résultat estime la catégorie de tournoi qui te correspond. Ton niveau de 1 à 10 (grille FFT) se choisit à part, dans Mon académie : l'un n'est pas converti en l'autre."));
  r.notes.forEach(n=>z.appendChild(el("p","qnote",n)));
  if(r.priorites.length){
   z.appendChild(el("h4","qtitre","À travailler en priorité"));
   const ul=el("ul","steps");
   r.priorites.forEach(th=>{const li=el("li","");const a=el("a","",QL_THEMES[th][0]);a.href=QL_THEMES[th][1];li.appendChild(a);ul.appendChild(li);});
   z.appendChild(ul);
  }
  const det=el("details","qprofil");det.appendChild(el("summary","","Ton profil, thème par thème"));
  const ul=el("ul","qprofil-liste");
  r.themes.filter(x=>x.theme!=="compet").sort((a,b)=>b.palier-a.palier).forEach(x=>{
   const li=el("li","");li.append(el("span","",QL_THEMES[x.theme][0]),el("b","",PN_PALIERS[x.palier].nom));ul.appendChild(li);
  });
  det.appendChild(ul);z.appendChild(det);
  const btns=el("div","btns");
  const prog=el("a","btn primary","Voir mon programme");prog.href="espace.html#esp-bord";btns.appendChild(prog);
  const plan=el("a","btn ghost","Le plan 8 semaines");plan.href="entrainement.html";btns.appendChild(plan);
  const acad=el("a","btn ghost","Choisir mon niveau de 1 à 10");acad.href="academie.html#niveaux";btns.appendChild(acad);
  if(r.palier>=1){const t=el("a","btn ghost","Trouver un tournoi");t.href="tournois.html";btns.appendChild(t);}
  const raq=el("a","btn ghost","Choisir ma raquette");raq.href="materiel.html#raquette";btns.appendChild(raq);
  const encore=el("button","btn ghost","Refaire le test");encore.type="button";btns.appendChild(encore);
  z.appendChild(btns);
  const save=el("div","acc-save");save.id="qsave";save.hidden=true;z.appendChild(save);
  const resume={version:2,score:r.themes.reduce((s,x)=>s+x.pts,0),niveau:PN_NIVEAU_EXERCICES[r.palier],palier:r.palier,
   reponses:r.themes.map(x=>({theme:x.theme,pts:x.pts,palier:x.palier}))};
  // Dernier résultat gardé sur l'appareil : l'espace joueur s'en sert pour recommander des exercices
  // methode et reperes : l'espace joueur affiche comment le niveau a été estimé et règle le programme sur la fréquence de jeu
  try{localStorage.setItem("pa-quiz-dernier",JSON.stringify({date:new Date().toISOString(),...resume,priorites:r.priorites,methode:"test-niveau-v2",source:r.source,
   reperes:{anciennete:rep.anciennete,frequence:rep.frequence,raquette:rep.raquette,resultats:rep.resultats===undefined?null:rep.resultats}}));}catch(e){}
  qCompte(save,resume);
  encore.addEventListener("click",()=>{i=0;rep={};z.hidden=true;carte.hidden=false;rendre(true);});
  titre.scrollIntoView({block:"nearest"});titre.focus({preventScroll:true});
 }
 rendre();
})();
/* Après le résultat : non connecté, invitation à créer un compte ; connecté, enregistrement dans le profil si le SQL du test v2
   est appliqué ("quiz2" dans PA_SUPABASE.activees), sinon le résultat reste sur l'appareil (et dans l'espace joueur). */
function qCompte(zone,resultat){
 const compte=window.PA_COMPTE;
 if(!zone||!compte||!compte.actif) return;
 const enregistrable=((window.PA_SUPABASE||{}).activees||[]).includes("quiz2");
 compte.ready.then(()=>{
  zone.hidden=false;zone.textContent="";
  if(!compte.user){
   const lien=document.createElement("a");lien.href="connexion.html?suite=niveau.html&onglet=inscription";lien.textContent="Crée un compte gratuit";
   const p=document.createElement("p");p.append(lien," pour retrouver ton niveau et ton programme dans ton espace joueur, sur tous tes appareils.");
   zone.appendChild(p);return;
  }
  if(!enregistrable){
   const p=document.createElement("p");p.className="acc-muted";
   p.textContent="Ton résultat est gardé sur cet appareil et apparaît dans ton espace joueur.";
   zone.appendChild(p);return;
  }
  const bouton=document.createElement("button");bouton.type="button";bouton.className="btn solid";bouton.textContent="Enregistrer dans mon profil";
  const retour=document.createElement("p");retour.setAttribute("role","status");
  bouton.addEventListener("click",async()=>{
   bouton.disabled=true;retour.className="";retour.textContent="Enregistrement…";
   const reponse=await compte.saveQuiz(resultat);
   if(reponse.ok){retour.className="acc-ok";retour.textContent="Résultat enregistré dans ton profil.";}
   else{bouton.disabled=false;retour.className="acc-err";retour.textContent=reponse.message;}
  });
  zone.append(bouton,retour);
 }).catch(()=>{});
}
