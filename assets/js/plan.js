/* PLAN 8 SEMAINES */
/* Typo :   = espace insécable dans le texte affiché.
   « match » doit commencer par « En match : » : le rendu met en gras ce qui précède le premier « : ». */
const WEEKS=[
 {t:"La vitre est ton amie",obj:"Jouer 20 sorties de vitre de suite sans faute, en lob.",ex:"Partenaire au filet qui envoie des balles vers la vitre du fond. Tu laisses rebondir, tu pivotes, tu lobes. 3 × 20 balles, en alternant coup droit et revers. Compte les lobs qui dépassent la ligne de service adverse.",match:"En match : interdiction de frapper une balle avant la vitre si elle va la toucher."},
 {t:"Volée de blocage",obj:"Volée placée dans les pieds 8 fois sur 10.",ex:"Volée-volée à 2–2,5 m du filet, geste court, raquette ouverte. Puis le partenaire au fond t'envoie des balles à mi-hauteur : tu bloques long au centre. 3 × 2 min + 3 × 15 balles.",match:"En match : aucune volée « frappée ». On place, on avance d'un pas."},
 {t:"Le lob d'attaque",obj:"Lob qui retombe à moins d'1 m de la vitre 6 fois sur 10.",ex:"Cible : une serviette posée à 1 m de la vitre du fond adverse. 3 × 15 lobs croisés, 3 × 15 lobs parallèles. Note les lobs trop courts (smash) et trop longs (vitre directe).",match:"En match : chaque fois que tu es sous pression au fond, lob. Compte les montées au filet obtenues."},
 {t:"Monter à deux",obj:"Monter 100 % des fois derrière un bon lob, 0 % derrière un mauvais.",ex:"Exercice « lob → montée → split » : le partenaire au filet te donne 10 balles. Tu lobes, tu montes à petits pas, split step à sa frappe, volée longue au centre. 3 × 10, puis on inverse. Dis « on monte ! » à voix haute.",match:"En match : règle de la corde. Un seul objectif, ne jamais être un devant / un derrière."},
 {t:"La bandeja",obj:"10 bandejas de suite qui rebondissent avant la vitre et restent basses.",ex:"Partenaire qui lobe à mi-court. Tu te déplaces de côté (jamais en reculant), frappe à hauteur d'épaule, coupée, cible la vitre latérale adverse. 4 × 10. Puis la même chose en annonçant « bandeja ! » avant la frappe.",match:"En match : interdiction de smasher. Tout lob profond ou mi-court se joue en bandeja. Compte combien de fois tu gardes le filet."},
 {t:"Chiquita et transition",obj:"Chiquita qui force une volée basse 7 fois sur 10.",ex:"Partenaire au filet. Depuis le fond tu joues une balle molle et basse dans ses pieds, tu avances derrière, demi-volée si besoin, puis tu finis au filet. 3 × 12. Variante : chiquita au centre entre deux volleyeurs.",match:"En match : alterner lob et chiquita pour monter. Observer lequel marche le mieux contre cette paire."},
 {t:"Smash ou pas smash",obj:"Bonne décision 9 fois sur 10 sur lob (smash / bandeja / laisser).",ex:"Lanceur qui envoie 20 lobs de profondeurs variées. Tu annonces la décision avant la frappe. Sur les lobs courts : smash plat vers la ligne de fond, puis essai de par 3. 2 × 20.",match:"En match : smash uniquement sur balle courte avec toi sous la balle. Sinon bandeja. Note les smashs qui reviennent."},
 {t:"Semaine match",obj:"Mettre tout ensemble, jouer un tournoi P25 ou P100.",ex:"Séance de points joués à thème : 1) points qui commencent par un lob, 2) points où l'équipe au fond doit monter en moins de 3 balles, 3) tie-breaks à 7 points avec punto de oro.",match:"En match : inscris-toi sur Ten'Up à un tournoi avec un partenaire de niveau proche. Objectif : zéro faute directe inutile, pas le résultat."},
];
const wk=document.getElementById("weeks");
const wCompte=window.PA_COMPTE;
const wCle=id=>"pa-weeks-v2:"+(id||"invite");
const wSemaines=liste=>Array.isArray(liste)?[...new Set(liste.filter(n=>Number.isInteger(n)&&n>=0&&n<WEEKS.length))]:[];
let wPret=!(wCompte&&wCompte.actif), wEtat=null;
function wLire(id){
 let data=null;
 try{
  const brut=localStorage.getItem(wCle(id));
  data=brut?JSON.parse(brut):null;
  // L'ancien stockage n'a pas de propriétaire : proposer son import, jamais le fusionner automatiquement.
  if(!data&&!id) data={done:JSON.parse(localStorage.getItem("pa-weeks")||"[]")};
 }catch(e){}
 const etat={id,done:wSemaines(data&&data.done),pending:{},running:false};
 if(id&&data&&data.pending&&typeof data.pending==="object"){
  for(let i=0;i<WEEKS.length;i++){
   if(typeof data.pending[i]==="boolean") etat.pending[i]=data.pending[i];
  }
 }
 wAppliquer(etat);
 return etat;
}
function wAppliquer(etat){
 const faites=new Set(etat.done);
 Object.entries(etat.pending).forEach(([i,valeur])=>valeur?faites.add(+i):faites.delete(+i));
 etat.done=[...faites].sort((a,b)=>a-b);
}
wEtat=wLire(null);
function wRender(){
 const focus=wk.contains(document.activeElement)?document.activeElement.id:null;
 wk.innerHTML=WEEKS.map((w,i)=>`<article class="week ${wEtat.done.includes(i)?'done':''}">
  <label class="wcheck"><input type="checkbox" id="w${i}" aria-label="Valider la semaine ${i+1} : ${w.t}" ${wEtat.done.includes(i)?'checked':''} ${wPret?'':'disabled'} data-i="${i}"><span></span></label>
  <div class="wnum">S${i+1}</div>
  <div class="wbody"><h3>${w.t}</h3><p class="wobj"><b>Objectif :</b> ${w.obj}</p>
  <details><summary>Exercice clé + consigne match</summary><p><b>Exercice (45 min) :</b> ${w.ex}</p><p style="margin-top:8px"><b>${w.match.split(":")[0].trim()} :</b>${w.match.split(":").slice(1).join(":")}</p></details></div>
 </article>`).join("");
 if(focus){const champ=document.getElementById(focus);if(champ) champ.focus();}
}
function wSauver(etat=wEtat){
 try{localStorage.setItem(wCle(etat.id),JSON.stringify({done:etat.done,pending:etat.pending}));return true;}
 catch(err){wInfo("Le stockage de cet appareil est indisponible. Garde cette page ouverte pour ne pas perdre les changements non synchronisés.",true);return false;}
}
const wMessage=document.createElement("p"), wActions=document.createElement("div");
wMessage.setAttribute("role","status");wMessage.className="acc-msg";wMessage.hidden=true;
wActions.className="plan-actions";
wk.before(wMessage,wActions);
const wImporter=document.createElement("button"), wReessayer=document.createElement("button");
wImporter.type=wReessayer.type="button";wImporter.className=wReessayer.className="btn ghost";
wImporter.textContent="Importer les semaines enregistrées sans compte dans mon compte";
wReessayer.textContent="Réessayer la synchronisation";
wImporter.hidden=wReessayer.hidden=true;
wActions.append(wImporter,wReessayer);
function wInfo(texte,erreur){
 wMessage.hidden=!texte;wMessage.textContent=texte||"";wMessage.classList.toggle("acc-err",!!erreur);
}
function wActuel(etat){return wEtat===etat&&wCompte&&wCompte.user&&wCompte.user.id===etat.id;}
wk.addEventListener("change",e=>{
 const i=Number(e.target.dataset.i);
 if(!wPret||e.target.type!=="checkbox"||!Number.isInteger(i)||i<0||i>=WEEKS.length)return;
 const coche=e.target.checked;
 wEtat.done=coche?wSemaines([...wEtat.done,i]):wEtat.done.filter(x=>x!==i);
 if(wEtat.id) wEtat.pending[i]=coche;
 wSauver();wRender();
 wSynchroniser();
});
/* Une file par compte conserve aussi les décochages. Les réponses d'une ancienne session sont ignorées. */
async function wSynchroniser(){
 const etat=wEtat;
 if(!wPret||!etat.id||!wActuel(etat)||etat.running)return;
 etat.running=true;wReessayer.hidden=true;
 try{
  do{
   while(Object.keys(etat.pending).length){
    if(!wActuel(etat))return;
    const i=Object.keys(etat.pending)[0], valeur=etat.pending[i];
    const reponse=await wCompte.savePlanWeek(+i,valeur,etat.id);
    if(!wActuel(etat))return;
    if(!reponse.ok)throw new Error(reponse.message);
    // Un second clic pendant la requête doit encore être envoyé.
    if(etat.pending[i]===valeur)delete etat.pending[i];
    wSauver(etat);
   }
   const serveur=await wCompte.loadPlan(etat.id);
   if(!wActuel(etat))return;
   if(!serveur.ok)throw new Error(serveur.message);
   etat.done=wSemaines(serveur.weeks);wAppliquer(etat);
   const sauve=wSauver(etat);wRender();
   if(sauve)wInfo("Progression synchronisée.",false);
  }while(Object.keys(etat.pending).length);
 }catch(e){
  if(wActuel(etat)){
   wInfo("Synchronisation impossible pour le moment. Tes changements restent en attente sur cette page ; réessaie dès que la connexion revient.",true);
   wReessayer.hidden=false;
  }
 }finally{etat.running=false;}
}
wImporter.addEventListener("click",()=>{
 if(!wEtat.id||!wActuel(wEtat))return;
 const invite=wLire(null);
 invite.done.forEach(i=>{wEtat.pending[i]=true;});wAppliquer(wEtat);
 if(wSauver()){
  try{localStorage.setItem(wCle(null),JSON.stringify({done:[],pending:{}}));localStorage.removeItem("pa-weeks");}catch(e){}
  wImporter.hidden=true;
 }
 wRender();wSynchroniser();
});
function wChangerCompte(){
 const id=wCompte&&wCompte.user?wCompte.user.id:null;
 wPret=true;
 if(wEtat.id!==id)wEtat=wLire(id);
 wInfo("",false);wReessayer.hidden=true;
 wImporter.hidden=!id||!wLire(null).done.length;
 wRender();wSynchroniser();
}
wReessayer.addEventListener("click",wSynchroniser);
window.addEventListener("online",wSynchroniser);
wRender();
if(wCompte&&wCompte.actif){
 wCompte.onChange(wChangerCompte);
 wCompte.ready.then(wChangerCompte).catch(()=>{wPret=true;wRender();wInfo("Connexion au compte indisponible. La progression reste locale.",true);});
}
