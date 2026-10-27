/* DIAGNOSTIC DE PAIRE (tactique.html#diagnostic-paire)
   Questionnaire sur les deux joueurs (main, côté habituel, balles hautes, défense, volée), l'expérience et le niveau de
   la paire. Les recommandations viennent de règles fixes, et chaque règle reprend ce que le site dit déjà :
     - côtés : le joueur de gauche est le « finisseur » (balles hautes, centre ; souvent le plus expérimenté, et le gaucher
       y est redoutable), celui de droite le « régulateur » (défense, sortie de vitre, lob) : tactique.html#placement ;
     - centre : par défaut le coup droit au centre, sinon celui qui annonce le premier ou va vers la balle (tutos.html#pair) ;
       paire avec un gaucher : deux revers ou deux coups droits au centre (tactique.html#adversaire) ;
     - niveaux différents : rôles et pièges de tactique.html#partenaire-niveau ;
     - priorités : exercices de l'espace joueur (exercices-donnees.js), au niveau de la paire.
   Une aide pour en parler à deux, jamais présentée comme un avis de professionnel. Réponses gardées sur l'appareil
   (pa-diagnostic-paire). */
const DP_CLE="pa-diagnostic-paire";
const DP_NIVEAUX=["Peu à l'aise","Moyen","À l'aise"]; // 1, 2, 3
const DP_PALIERS=[[1,"Débutant (P25)"],[2,"Loisir (P100)"],[3,"Intermédiaire (P250)"],[4,"P500 et +"]];
const DP_DEFAUT={joueurs:[{main:"droitier",cote:"droite",haut:2,defense:2,volee:2},{main:"droitier",cote:"gauche",haut:2,defense:2,volee:2}],experience:"egal",niveau:2};
const DP_NOMS=["Toi","Ton partenaire"];

// Réponses valides seulement (relues depuis l'appareil ou le formulaire)
function dpValide(r){
 const n=v=>[1,2,3].includes(v);
 return !!r&&Array.isArray(r.joueurs)&&r.joueurs.length===2&&r.joueurs.every(j=>j&&["droitier","gaucher"].includes(j.main)&&["droite","gauche","egal"].includes(j.cote)&&n(j.haut)&&n(j.defense)&&n(j.volee))&&
  ["egal","toi","partenaire"].includes(r.experience)&&[1,2,3,4].includes(r.niveau);
}

// Exercice d'un thème au niveau de la paire (sinon le plus proche)
function dpExercice(theme,niveau){
 const l=(typeof EXERCICES!=="undefined"?EXERCICES:[]).filter(e=>e.theme===theme);
 return l.find(e=>e.niveaux.includes(niveau))||l.slice().sort((a,b)=>Math.abs(a.niveaux[0]-niveau)-Math.abs(b.niveaux[0]-niveau))[0]||null;
}

/* Le diagnostic. Renvoie { gauche, droite (indices 0 / 1), egalite, cotes: [textes], centre: [textes], roles: [textes],
   priorites: [{ titre, texte, exercice }], annonces }. */
function dpDiagnostic(r){
 const J=r.joueurs,exp=i=>r.experience===(i===0?"toi":"partenaire");
 // Qui à gauche : balles hautes d'abord (le finisseur), puis expérience, main gauche, et le côté habituel pour départager.
 // Un niveau d'écart en balles hautes (5) pèse plus que tous les autres critères réunis (2 + 1 + 1)
 const score=i=>J[i].haut*5+(exp(i)?2:0)+(J[i].main==="gaucher"?1:0)+(J[i].cote==="gauche"?0.5:J[i].cote==="droite"?-0.5:0);
 const s0=score(0),s1=score(1),egalite=s0===s1;
 const gauche=egalite?(J[0].cote==="gauche"||J[1].cote==="droite"?0:1):(s0>s1?0:1),droite=1-gauche;
 const nom=i=>DP_NOMS[i],G=J[gauche],D=J[droite];
 const sujet=(i,tu,il)=>i===0?"Tu "+tu:"Ton partenaire "+il; // « tu reçois » / « ton partenaire reçoit »
 const cotes=[];
 if(egalite)cotes.push(`Sur vos réponses, les deux répartitions se valent : ${nom(gauche).toLowerCase()} à gauche et ${nom(droite).toLowerCase()} à droite garde vos habitudes. Essayez aussi l'inverse et gardez celle où vous concluez le plus de points.`);
 else{
  const raisons=[];
  if(G.haut>D.haut)raisons.push("plus à l'aise dans les balles hautes");
  if(exp(gauche))raisons.push("plus expérimenté");
  if(G.main==="gaucher"&&D.main==="droitier")raisons.push("gaucher : à gauche, il joue en coup droit sur les balles hautes");
  cotes.push(`À gauche, ${nom(gauche).toLowerCase()}, en « finisseur »${raisons.length?" : "+raisons.join(", "):""}. Le joueur de gauche reçoit la majorité des lobs et doit conclure : smash, víbora, volée agressive.`);
 }
 cotes.push(`À droite, ${nom(droite).toLowerCase()}, en « régulateur » : tenir la cadence, défendre, lober pour remettre la paire au filet.`);
 if(G.cote==="droite"||D.cote==="gauche")cotes.push("C'est l'inverse de vos habitudes pour au moins l'un de vous : essayez sur quelques matchs amicaux avant un tournoi.");
 // Centre
 const centre=[];
 if(G.main==="droitier"&&D.main==="droitier")centre.push(`Deux droitiers : la balle au centre est pour ${nom(gauche).toLowerCase()}, à gauche, en coup droit.`);
 else if(G.main==="gaucher"&&D.main==="gaucher")centre.push(`Deux gauchers : la balle au centre est pour ${nom(droite).toLowerCase()}, à droite, en coup droit.`);
 else if(G.main==="gaucher")centre.push("Gaucher à gauche, droitier à droite : vos deux revers sont au centre, et les adversaires le savent. Décidez avant le match qui prend la balle au centre, et gardez-la basse et longue pour ne pas leur donner d'angle.");
 else centre.push("Droitier à gauche, gaucher à droite : vos deux coups droits sont au centre, c'est une force ; les adversaires joueront plutôt vers les vitres latérales. Au centre, celui qui annonce le premier ou qui va vers la balle la prend.");
 centre.push("Dans tous les cas : celui qui annonce le premier, fort (« moi ! »), prend la balle ; l'autre annonce « toi » et couvre.");
 // Niveaux différents
 const roles=[];
 if(r.experience!=="egal"){
  const fort=r.experience==="toi"?0:1,autre=1-fort;
  roles.push(`L'adversaire va jouer sur ${nom(autre).toLowerCase()}. ${nom(autre)} : joue simple et au centre, sans forcer pour « se rattraper ».`);
  roles.push(`${nom(fort)} : couvre le centre et prends les balles annoncées, sans quitter ta zone pour tout jouer ; un côté vide coûte plus cher qu'une balle moyenne.`);
 }
 // Priorités de travail : d'abord le rôle de chacun, puis les points faibles communs ; 3 au plus
 const priorites=[],ajouter=(theme,titre,texte)=>{if(priorites.length<3&&!priorites.some(p=>p.theme===theme))priorites.push({theme,titre,texte,exercice:dpExercice(theme,r.niveau)});};
 if(D.defense===1)ajouter("vitre","Sorties de vitre",`${sujet(droite,"défends","défend")} beaucoup, à droite : la sortie de vitre est la première chose à travailler.`);
 if(G.haut<=2)ajouter("aerien","Bandeja et balles hautes",`${sujet(gauche,"reçois","reçoit")}, à gauche, la majorité des lobs : la bandeja doit devenir sûre.`);
 if(J[0].defense===1&&J[1].defense===1)ajouter("vitre","Sorties de vitre","Vous êtes tous les deux peu à l'aise en défense : les sorties de vitre d'abord.");
 if(J[0].volee===1||J[1].volee===1)ajouter("placement","Volée et placement au filet",`${J[0].volee===1&&J[1].volee===1?"Vous êtes tous les deux":sujet(J[0].volee===1?0:1,"es","est")} peu à l'aise à la volée : à la bonne distance du filet, la volée de blocage suffit.`);
 if(J[0].haut===1&&J[1].haut===1)ajouter("aerien","Bandeja et balles hautes","Vous êtes tous les deux peu à l'aise dans les balles hautes : sans bandeja, chaque lob vous renvoie au fond.");
 ajouter("communication","Qui prend le centre ?","Mettez-vous d'accord sur la balle au centre et annoncez chaque balle.");
 if(r.experience!=="egal")ajouter("couple","Bouger ensemble","Avec des niveaux différents, bouger ensemble évite le trou au centre.");
 return {gauche,droite,egalite,cotes,centre,roles,priorites};
}

function dpLire(){try{const r=JSON.parse(localStorage.getItem(DP_CLE)||"null");return dpValide(r)?r:null;}catch(e){return null;}}
const dpEchapper=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[c]);

function dpDemarrer(){
 const zone=document.getElementById("dp");
 if(!zone)return;
 const r=dpLire()||JSON.parse(JSON.stringify(DP_DEFAUT));
 const options=(l,v)=>l.map(([val,txt])=>`<option value="${val}"${String(val)===String(v)?" selected":""}>${txt}</option>`).join("");
 const joueur=(j,i)=>`<fieldset class="dp-joueur"><legend>${DP_NOMS[i]}</legend>
  <div class="champ"><label for="dp-main-${i}">Main</label><select id="dp-main-${i}">${options([["droitier","Droitier"],["gaucher","Gaucher"]],j.main)}</select></div>
  <div class="champ"><label for="dp-cote-${i}">Côté habituel</label><select id="dp-cote-${i}">${options([["droite","Droite"],["gauche","Gauche"],["egal","Indifférent"]],j.cote)}</select></div>
  ${[["haut","Balles hautes (bandeja, smash)"],["defense","Défense (sortie de vitre, lob)"],["volee","Volée"]].map(([k,t])=>`<div class="champ"><label for="dp-${k}-${i}">${t}</label><select id="dp-${k}-${i}">${options(DP_NIVEAUX.map((n,x)=>[x+1,n]),j[k])}</select></div>`).join("")}
 </fieldset>`;
 zone.innerHTML=`<form class="dp-form" id="dp-form" novalidate>
  <div class="dp-joueurs">${r.joueurs.map(joueur).join("")}</div>
  <div class="dp-paire">
   <div class="champ"><label for="dp-experience">Expérience</label><select id="dp-experience">${options([["egal","Même niveau"],["toi","Tu es plus expérimenté"],["partenaire","Ton partenaire est plus expérimenté"]],r.experience)}</select></div>
   <div class="champ"><label for="dp-niveau">Niveau de la paire</label><select id="dp-niveau">${options(DP_PALIERS,r.niveau)}</select></div>
  </div>
  <button type="submit" class="btn primary">Voir le diagnostic</button>
 </form>
 <div class="dp-resultat" id="dp-resultat" tabindex="-1" aria-live="polite"></div>`;
 const $=id=>zone.querySelector("#"+id);
 const lireForm=()=>({joueurs:[0,1].map(i=>({main:$("dp-main-"+i).value,cote:$("dp-cote-"+i).value,haut:Number($("dp-haut-"+i).value),defense:Number($("dp-defense-"+i).value),volee:Number($("dp-volee-"+i).value)})),
  experience:$("dp-experience").value,niveau:Number($("dp-niveau").value)});
 function afficher(d){
  const liste=l=>`<ul>${l.map(t=>`<li>${dpEchapper(t)}</li>`).join("")}</ul>`;
  $("dp-resultat").innerHTML=`<h3>Ce que proposent les fiches du site, pour votre paire</h3>
   <div class="grille-blocs">
    <div class="bloc"><h4>Vos côtés</h4>${liste(d.cotes)}</div>
    <div class="bloc"><h4>La balle au centre</h4>${liste(d.centre)}<p class="note"><a href="tutos.html#pair">Les priorités au centre</a></p></div>
    ${d.roles.length?`<div class="bloc"><h4>Niveaux différents</h4>${liste(d.roles)}</div>`:""}
   </div>
   <h4>À travailler ensemble</h4>
   <ol class="dp-priorites">${d.priorites.map(p=>`<li><b>${dpEchapper(p.titre)}.</b> ${dpEchapper(p.texte)}${p.exercice?` <span class="dp-exo">Exercice : « ${dpEchapper(p.exercice.titre)} » (${dpEchapper(p.exercice.duree)}, ${dpEchapper(p.exercice.joueurs)})${p.exercice.lien?`, <a href="${dpEchapper(p.exercice.lien)}">la fiche</a>`:""}.</span>`:""}</li>`).join("")}</ol>
   <p class="note">Les annonces pendant le point (« moi », « toi », « lob », « cambio ») : <a href="tactique.html#communication">parler avec son partenaire</a>. Les exercices sont dans <a href="espace.html#esp-bloc-exercices">ton espace joueur</a>.</p>
   <p class="msg msg-alerte dp-avertissement">Une aide pour en parler à deux, tirée des fiches du site et de vos réponses : pas l'avis d'un professionnel. C'est à vous de décider, et un entraîneur qui vous voit jouer en saura toujours plus.</p>`;
 }
 $("dp-form").addEventListener("submit",ev=>{
  ev.preventDefault();
  const rep=lireForm();
  if(!dpValide(rep))return;
  try{localStorage.setItem(DP_CLE,JSON.stringify(rep));}catch(e){/* stockage indisponible */}
  afficher(dpDiagnostic(rep));
  $("dp-resultat").focus();
 });
 if(dpLire())afficher(dpDiagnostic(r)); // dernières réponses : le diagnostic est déjà là
}
window.PA_DIAGNOSTIC_PAIRE={diagnostic:dpDiagnostic,valide:dpValide,exercice:dpExercice,DEFAUT:DP_DEFAUT};
dpDemarrer();
