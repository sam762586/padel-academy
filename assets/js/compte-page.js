/* PAGE « MON COMPTE » : connexion, profil, historique du quiz, progression du plan, suppression.
   Dépend de compte.js (PA_COMPTE). Tout le texte venant de la base est inséré avec textContent. */
const NIVEAUX_QUIZ=[ // ancien test (niveau 1 à 4)
 "Débutant · P25","Loisir · P100","Intermédiaire · P250","Avancé · P500 et +"
];
const PALIERS_QUIZ=["Découverte","P25","P100","P250","P500","P1000 et +"]; // test v2 : mêmes noms que quiz-niveau.js
// Catégories 2026/2027 : le P1500 est devenu P2000, l'ancien P2000 est devenu P3000
const CLASSEMENTS_P=["P25","P50","P100","P250","P500","P1000","P2000","P3000"];
const NB_SEMAINES_PLAN=8;

(function(){
 const zoneMessage=document.getElementById("compte-msg");
 if(!zoneMessage) return; // page sans bloc compte : on ne fait rien
 const compte=window.PA_COMPTE;
 const blocConnexion=document.getElementById("compte-connexion");
 const blocProfil=document.getElementById("compte-profil");
 let versionSession=0;

 // Affiche un message (texte seul) dans un paragraphe, avec un état : "ok", "err" ou ""
 function afficher(element,texte,etat){
  if(!element) return;
  element.hidden=!texte;
  element.textContent=texte||"";
  element.classList.remove("acc-ok","acc-err");
  if(etat) element.classList.add(etat==="ok"?"acc-ok":"acc-err");
 }
 function ajouterOption(select,valeur,libelle){
  const option=document.createElement("option");
  option.value=valeur;option.textContent=libelle;select.appendChild(option);
 }

 // --- Comptes inactifs : message clair, tout le reste reste caché ---
 if(!compte||!compte.actif){
  const raison=compte?compte.raisonInactif:"config";
  let texte="Les comptes ne sont pas encore activés. Le reste du site fonctionne normalement, sans compte.";
  if(raison==="file") texte="Ouvre le site en ligne pour te connecter : les comptes ne fonctionnent pas quand la page est ouverte depuis un fichier.";
  if(raison==="cdn") texte="Le service de comptes ne répond pas pour le moment. Vérifie ta connexion puis recharge la page. Le reste du site fonctionne normalement.";
  afficher(zoneMessage,texte,"");
  return;
 }

 // --- Remplissage des listes du profil ---
 const selNiveau=document.getElementById("pf-niveau");
 const selClassement=document.getElementById("pf-classement");
 ajouterOption(selNiveau,"","Non précisé");
 NIVEAUX_QUIZ.forEach((libelle,i)=>ajouterOption(selNiveau,String(i+1),libelle));
 ajouterOption(selClassement,"","Aucun");
 CLASSEMENTS_P.forEach(c=>ajouterOption(selClassement,c,c));

 const champPseudo=document.getElementById("pf-pseudo");
 const champCote=document.getElementById("pf-cote");
 const champMain=document.getElementById("pf-main");
 const champClub=document.getElementById("pf-club");

 // --- Connexion par lien magique ---
 const formMail=document.getElementById("compte-form-mail");
 const champEmail=document.getElementById("compte-email");
 const boutonEnvoyer=document.getElementById("compte-envoyer");
 const messageMail=document.getElementById("compte-mail-msg");
 formMail.addEventListener("submit",async e=>{
  e.preventDefault();
  const adresse=champEmail.value.trim();
  if(!adresse||!champEmail.checkValidity()){afficher(messageMail,"Saisis une adresse e-mail valide.","err");return;}
  boutonEnvoyer.disabled=true;afficher(messageMail,"Envoi du lien…","");
  const reponse=await compte.signIn(adresse);
  boutonEnvoyer.disabled=false;
  if(reponse.ok) afficher(messageMail,"Lien envoyé. Ouvre ta boîte mail (pense aux spams) et clique sur le lien pour te connecter.","ok");
  else afficher(messageMail,reponse.message,"err");
 });

 // --- Déconnexion ---
 document.getElementById("compte-deco").addEventListener("click",async()=>{
  const reponse=await compte.signOut();
  if(!reponse.ok) afficher(document.getElementById("pf-msg"),reponse.message,"err");
 });

 // --- Profil ---
 const formProfil=document.getElementById("compte-form-profil");
 const messageProfil=document.getElementById("pf-msg");
 async function chargerProfil(){
  const version=versionSession;
  const reponse=await compte.loadProfile();
  if(version!==versionSession||!compte.user)return;
  if(!reponse.ok){afficher(messageProfil,reponse.message,"err");return;}
  const profil=reponse.profile;
  champPseudo.value=profil.pseudo||"";
  selNiveau.value=profil.niveau_declare?String(profil.niveau_declare):"";
  selClassement.value=profil.classement_p||"";
  champCote.value=profil.cote||"";
  champMain.value=profil.main||"";
  champClub.value=profil.club||"";
 }
 formProfil.addEventListener("submit",async e=>{
  e.preventDefault();
  const bouton=document.getElementById("pf-enregistrer");
  bouton.disabled=true;afficher(messageProfil,"Enregistrement…","");
  const reponse=await compte.saveProfile({
   pseudo:champPseudo.value.trim()||null,
   niveau_declare:selNiveau.value?Number(selNiveau.value):null,
   classement_p:selClassement.value||null,
   cote:champCote.value||null,
   main:champMain.value||null,
   club:champClub.value.trim()||null
  });
  bouton.disabled=false;
  afficher(messageProfil,reponse.ok?"Profil enregistré.":reponse.message,reponse.ok?"ok":"err");
 });

 // --- Historique du quiz ---
 async function chargerQuiz(){
  const version=versionSession;
  const zone=document.getElementById("compte-quiz");
  const reponse=await compte.loadQuizzes();
  if(version!==versionSession||!compte.user)return;
  zone.textContent="";
  if(!reponse.ok){const p=document.createElement("p");p.className="acc-msg acc-err";p.textContent=reponse.message;zone.appendChild(p);return;}
  if(!reponse.results.length){const p=document.createElement("p");p.className="acc-muted";p.textContent="Aucun résultat enregistré pour l'instant. Passe le test, puis clique sur « Enregistrer dans mon profil ».";zone.appendChild(p);return;}
  const tableau=document.createElement("table");
  const entete=tableau.createTHead().insertRow();
  ["Date","Score","Palier"].forEach(t=>{const th=document.createElement("th");th.textContent=t;entete.appendChild(th);});
  const corps=tableau.createTBody();
  reponse.results.forEach(r=>{
   const ligne=corps.insertRow();
   ligne.insertCell().textContent=new Date(r.created_at).toLocaleDateString("fr-FR");
   const v2=Number.isInteger(r.palier);
   ligne.insertCell().textContent=v2?"—":r.score+" / 30"; // le score v2 n'est qu'une somme interne, le palier suffit
   ligne.insertCell().textContent=(v2?PALIERS_QUIZ[r.palier]:NIVEAUX_QUIZ[r.niveau-1])||"—";
  });
  const defilement=document.createElement("div");defilement.className="acc-scroll";defilement.appendChild(tableau);
  zone.appendChild(defilement);
 }

 // --- Progression du plan ---
 async function chargerPlan(){
  const version=versionSession;
  const zone=document.getElementById("compte-plan");
  const reponse=await compte.loadPlan();
  if(version!==versionSession||!compte.user)return;
  zone.textContent="";
  const p=document.createElement("p");
  if(!reponse.ok){p.className="acc-msg acc-err";p.textContent=reponse.message;zone.appendChild(p);return;}
  const faites=reponse.weeks.filter(n=>n>=0&&n<NB_SEMAINES_PLAN).length;
  p.className="acc-muted";p.textContent=faites+" semaine"+(faites>1?"s":"")+" validée"+(faites>1?"s":"")+" sur "+NB_SEMAINES_PLAN+".";
  const barre=document.createElement("div");barre.className="acc-bar";
  const remplissage=document.createElement("i");remplissage.style.width=(faites/NB_SEMAINES_PLAN*100)+"%";barre.appendChild(remplissage);
  zone.append(p,barre);
 }

 // --- Mes annonces et réponses (« Trouver un partenaire »), rendu fourni par partenaires.js ---
 function chargerPartenaires(){
  const zone=document.getElementById("compte-partenaires");
  if(!zone) return;
  if(!window.PA_PARTENAIRES||typeof window.PA_PARTENAIRES.rendreMesAnnonces!=="function"){
   zone.textContent="";const p=document.createElement("p");p.className="acc-muted";p.textContent="Cette section n'est pas disponible pour le moment.";zone.appendChild(p);return;
  }
  window.PA_PARTENAIRES.rendreMesAnnonces(zone).catch(()=>{
   zone.textContent="";const p=document.createElement("p");p.className="acc-msg acc-err";p.textContent="Impossible de charger tes annonces pour le moment.";zone.appendChild(p);
  });
 }

 // --- Suppression du compte (confirmation intégrée, sans confirm()) ---
 const boutonDemander=document.getElementById("sup-demander");
 const boutonConfirmer=document.getElementById("sup-confirmer");
 const boutonAnnuler=document.getElementById("sup-annuler");
 const messageSuppression=document.getElementById("sup-msg");
 function modeConfirmation(actif){
  boutonDemander.hidden=actif;boutonConfirmer.hidden=!actif;boutonAnnuler.hidden=!actif;
  if(actif) boutonConfirmer.focus();
 }
 boutonDemander.addEventListener("click",()=>{
  afficher(messageSuppression,"Tu es sur le point de supprimer ton compte et toutes tes données. Cette action est définitive.","err");
  modeConfirmation(true);
 });
 boutonAnnuler.addEventListener("click",()=>{afficher(messageSuppression,"","");modeConfirmation(false);});
 boutonConfirmer.addEventListener("click",async()=>{
  boutonConfirmer.disabled=true;afficher(messageSuppression,"Suppression en cours…","");
  const reponse=await compte.deleteAccount();
  boutonConfirmer.disabled=false;
  if(reponse.ok){
   modeConfirmation(false);
   afficher(zoneMessage,"Ton compte et toutes tes données ont été supprimés.","ok");
   afficherEtat();
  }else{
   afficher(messageSuppression,reponse.message,"err");
  }
 });

 // --- Bascule connecté / non connecté ---
 function afficherEtat(){
  versionSession++;
  formProfil.reset();
  document.getElementById("compte-adresse").textContent="";
  document.getElementById("compte-quiz").textContent="";
  document.getElementById("compte-plan").textContent="";
  if(compte.user){
   blocConnexion.hidden=true;blocProfil.hidden=false;
   zoneMessage.hidden=true;
   document.getElementById("compte-adresse").textContent=compte.user.email||"";
   afficher(messageProfil,"","");afficher(messageSuppression,"","");modeConfirmation(false);
   chargerProfil();chargerQuiz();chargerPlan();chargerPartenaires();
  }else{
   blocProfil.hidden=true;blocConnexion.hidden=false;
   if(!zoneMessage.classList.contains("acc-ok")) zoneMessage.hidden=true;
  }
 }
 compte.ready.then(()=>{
  if(!compte.user) zoneMessage.hidden=true;
  afficherEtat();
  compte.onChange(afficherEtat);
 }).catch(()=>{ afficher(zoneMessage,"Impossible de charger ton compte pour le moment. Recharge la page.","err"); });
})();
