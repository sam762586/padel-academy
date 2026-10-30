/* PAGE « MON COMPTE » : connexion, profil, historique du quiz, progression du plan, suppression.
   Dépend de compte.js (PA_COMPTE). Tout le texte venant de la base est inséré avec textContent. */
const NIVEAUX_QUIZ=[ // ancien test (niveau 1 à 4)
 "Débutant · P25","Loisir · P100","Intermédiaire · P250","Avancé · P500 et +"
];
const PALIERS_QUIZ=["Découverte","P25","P100","P250","P500","P1000 et +"]; // test v2 : mêmes noms que quiz-niveau.js
// Catégories 2026/2027 : le P1500 est devenu P2000, l'ancien P2000 est devenu P3000
const CLASSEMENTS_P=["P25","P50","P100","P250","P500","P1000","P2000","P3000"];
const NB_SEMAINES_PLAN=8;
// Effacement des données de l'appareil : la case n'est cochée d'office que si ces drapeaux sont actifs (synchronisation
// dans le compte) et qu'aucune de ces clés, gardées seulement sur l'appareil (ou invérifiables ici), n'a de contenu.
// Sur le site en ligne, seule « academie » est active : la case reste donc décochée d'office tant que les autres
// synchronisations (espace, journal, favoris, progression, diagnostic) ne sont pas activées.
const EFFACEMENT_DRAPEAUX=["espace","journal","favoris","progression","diagnostic","academie"];
const EFFACEMENT_CLES_LOCALES=["pa-exercices-faits","pa-quiz-dernier","pa-score-en-cours","pa-score-historique","pa-journal-manuels",
 "pa-journal-suppressions","pa-tournois-favoris-attente","pa-weeks","pa-weeks-v2:invite",
 "pa-defis","pa-tableaux-tactiques","pa-quiz-tactique","pa-diagnostic-paire","pa-academie-priorites"];

(function(){
 const zoneMessage=document.getElementById("compte-msg");
 if(!zoneMessage) return; // page sans bloc compte : on ne fait rien
 const compte=window.PA_COMPTE;
 const blocProfil=document.getElementById("compte-profil");
 let versionSession=0;
 // Compte supprimé : la page reste sur le message de confirmation, même si la session met un instant à se fermer
 let compteSupprime=false;

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
  if(raison==="file") texte="Ouvre le site en ligne pour te connecter : les comptes ne fonctionnent pas quand la page est ouverte depuis un fichier.";
  if(raison==="cdn") texte="Les comptes sont indisponibles pour le moment. Vérifie ta connexion puis recharge la page. Le reste du site fonctionne normalement.";
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

 // --- Première visite après l'inscription (compte.html?bienvenue=1) : le profil passe en premier ---
 const params=new URLSearchParams(location.search);
 let bienvenue=params.get("bienvenue")==="1";
 function accueillir(){
  if(!bienvenue) return;
  bienvenue=false;
  const carteEspace=document.querySelector(".esp-lien-carte");
  if(carteEspace&&carteEspace.parentNode===blocProfil.parentNode) blocProfil.parentNode.insertBefore(blocProfil,carteEspace);
  afficher(zoneMessage,"Bienvenue ! Commence par ton profil : un pseudo, ton niveau et ton côté de jeu. Ils servent aux annonces « Trouver un partenaire » et à ton espace joueur.","ok");
  champPseudo.focus({preventScroll:true});
  blocProfil.scrollIntoView({block:"start"});
  try{history.replaceState(null,"",location.pathname+location.hash);}catch(e){} // un rechargement ne répète pas l'accueil
 }

 /* --- Cases « Effacer les données de cet appareil » (déconnexion, suppression du compte) ---
    Garde-fou : aucune donnée de joueur effacée sans accord explicite. Les cases ne sont cochées d'office que si tout ce
    qu'elles effacent est déjà dans le compte (toutesDonneesDansLeCompte) ; sinon décochées, avec un avertissement.
    Tant que le joueur n'y a pas touché, la case suit l'état de la synchronisation. */
 const caseEffacerDeco=document.getElementById("compte-deco-effacer");
 const caseEffacerSup=document.getElementById("sup-effacer");
 const aidesEffacement={"compte-deco-effacer":document.getElementById("compte-deco-aide"),"sup-effacer":document.getElementById("sup-effacer-aide")};
 const lireLocal=cle=>{try{return JSON.parse(localStorage.getItem(cle)||"null");}catch(e){return null;}};
 const nonVide=v=>Array.isArray(v)?v.length>0:v&&typeof v==="object"?Object.keys(v).length>0:v!==null&&v!=="";
 function toutesDonneesDansLeCompte(){
  const activees=(window.PA_SUPABASE||{}).activees||[];
  if(!EFFACEMENT_DRAPEAUX.every(n=>activees.includes(n)))return false;
  // Espace (résultats, objectifs, rang, objectifs de jeu) : dernière synchronisation réussie, sans conflit d'appareil
  const J=window.PA_JOUEUR,e=J&&J.etat?J.etat():null;
  if(!e||!e.derniere||e.erreur||e.conflit)return false;
  // Données gardées seulement ici, ou qu'on ne peut pas vérifier depuis cette page (journal non chargé)
  if(EFFACEMENT_CLES_LOCALES.some(cle=>nonVide(lireLocal(cle))))return false;
  // Plan : changements encore en attente d'envoi
  const plan=compte.user?lireLocal("pa-weeks-v2:"+compte.user.id):null;
  if(plan&&nonVide(plan.pending))return false;
  // Mon académie (academie-sync.js, non chargé ici) : chaque choix de niveau et chaque quiz terminé doit être marqué comme
  // synchronisé avec ce compte (pa-academie-synchro:<compte>), et aucun quiz en cours
  const marque=compte.user?lireLocal("pa-academie-synchro:"+compte.user.id)||{}:{};
  const niveaux=lireLocal("pa-academie")||{},quiz=lireLocal("pa-academie-quiz")||{};
  if(quiz.enCours)return false;
  if((niveaux.historique||[]).some(h=>!(marque.niveaux||[]).includes(h&&h.date)))return false;
  if((quiz.seances||[]).some(s=>!(marque.quiz||[]).includes(s&&s.id)))return false;
  return true;
 }
 function majCasesEffacement(){
  const dansLeCompte=toutesDonneesDansLeCompte();
  [caseEffacerDeco,caseEffacerSup].forEach(c=>{
   if(!c)return;
   if(c.dataset.touchee!=="1")c.checked=dansLeCompte;
   const aide=aidesEffacement[c.id];if(!aide)return;
   aide.textContent=dansLeCompte
    ?"Tout est sauvegardé dans ton compte : tu retrouveras tes données en te reconnectant. Sur un appareil partagé, garde la case cochée."
    :"Attention : une partie de ces données (résultats, objectifs, matchs, favoris, test de niveau non enregistré dans ton profil, exercices, défis, tableaux tactiques, plan) n'est que sur cet appareil, pas dans ton compte. Cocher la case les supprime définitivement.";
  });
 }
 [caseEffacerDeco,caseEffacerSup].forEach(c=>{if(c)c.addEventListener("change",()=>{c.dataset.touchee="1";});});
 majCasesEffacement();
 // joueur-sync.js est chargé après ce script : abonnement une fois la page lue (et à chaque changement de session)
 let abonneSynchro=false;
 function suivreSynchro(){if(!abonneSynchro&&window.PA_JOUEUR&&window.PA_JOUEUR.onChange){abonneSynchro=true;window.PA_JOUEUR.onChange(majCasesEffacement);}majCasesEffacement();}
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",suivreSynchro);else setTimeout(suivreSynchro,0);

 // --- Déconnexion ---
 document.getElementById("compte-deco").addEventListener("click",async e=>{
  const bouton=e.currentTarget;bouton.disabled=true;
  const reponse=await compte.signOut({effacer:!!(caseEffacerDeco&&caseEffacerDeco.checked)});
  bouton.disabled=false;
  if(!reponse.ok) afficher(document.getElementById("pf-msg"),reponse.message,"err");
 });

 // --- Profil ---
 const formProfil=document.getElementById("compte-form-profil");
 const messageProfil=document.getElementById("pf-msg");
 // Pseudo refusé : message annoncé (role=alert), champ marqué et relié au message, focus dessus
 function pseudoEnErreur(texte){
  messageProfil.setAttribute("role","alert");afficher(messageProfil,texte,"err");
  champPseudo.setAttribute("aria-invalid","true");
  champPseudo.setAttribute("aria-describedby","pf-pseudo-aide pf-msg");
  champPseudo.focus();
 }
 function pseudoCorrect(){
  messageProfil.setAttribute("role","status");
  champPseudo.removeAttribute("aria-invalid");champPseudo.setAttribute("aria-describedby","pf-pseudo-aide");
 }
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
  const pseudo=champPseudo.value.trim().replace(/\s+/g," ")||null;
  pseudoCorrect();
  // Même règle que la base (contrainte profiles_pseudo_format) : vérifiée avant l'envoi
  if(compte.pseudoValide&&!compte.pseudoValide(pseudo)) return pseudoEnErreur(typeof PA_MESSAGE_PSEUDO==="string"?PA_MESSAGE_PSEUDO:"Pseudo invalide.");
  bouton.disabled=true;afficher(messageProfil,"Enregistrement…","");
  const reponse=await compte.saveProfile({
   pseudo:pseudo,
   niveau_declare:selNiveau.value?Number(selNiveau.value):null,
   classement_p:selClassement.value||null,
   cote:champCote.value||null,
   main:champMain.value||null,
   club:champClub.value.trim()||null
  });
  bouton.disabled=false;
  if(!reponse.ok&&reponse.champ==="pseudo") return pseudoEnErreur(reponse.message);
  if(!reponse.ok) messageProfil.setAttribute("role","alert");
  afficher(messageProfil,reponse.ok?"Profil enregistré.":reponse.message,reponse.ok?"ok":"err");
 });

 // --- Historique du quiz ---
 // Chaque résultat a son bouton « Supprimer » : confirmation dans la ligne (sans confirm()), puis suppression dans le
 // compte (compte.deleteQuiz). Le résultat gardé sur l'appareil (pa-quiz-dernier) n'est pas touché.
 const messageQuiz=document.getElementById("compte-quiz-msg");
 const titreQuiz=document.getElementById("historique-test");
 function annoncerQuiz(texte,etat){
  if(!messageQuiz) return;
  messageQuiz.hidden=!texte;
  messageQuiz.textContent=texte||"";
  messageQuiz.classList.remove("msg-ok","msg-erreur");
  if(etat) messageQuiz.classList.add(etat==="ok"?"msg-ok":"msg-erreur");
 }
 function texteAucunQuiz(){
  const p=document.createElement("p");p.className="acc-muted";
  p.textContent="Aucun résultat enregistré pour l'instant. Passe le test, puis clique sur « Enregistrer dans mon profil ».";
  return p;
 }
 function creerBouton(texte,classes){
  const b=document.createElement("button");b.type="button";b.className="btn petit "+classes;b.textContent=texte;return b;
 }
 // Cellule « Supprimer » d'un résultat : état normal ou confirmation
 function remplirActionQuiz(cellule,r,dateLisible){
  const version=versionSession;
  cellule.textContent="";
  const supprimer=creerBouton("Supprimer","ghost");
  supprimer.setAttribute("aria-label","Supprimer le résultat du "+dateLisible);
  supprimer.dataset.quizSupprimer=String(r.id);
  supprimer.addEventListener("click",()=>{
   annoncerQuiz("","");
   cellule.textContent="";
   const confirmer=creerBouton("Confirmer la suppression","danger");
   confirmer.setAttribute("aria-label","Confirmer la suppression du résultat du "+dateLisible);
   const annuler=creerBouton("Annuler","ghost");
   annuler.setAttribute("aria-label","Annuler la suppression du résultat du "+dateLisible);
   const revenir=()=>{remplirActionQuiz(cellule,r,dateLisible);const b=cellule.querySelector("button");if(b)b.focus();};
   annuler.addEventListener("click",revenir);
   [confirmer,annuler].forEach(b=>b.addEventListener("keydown",e=>{if(e.key==="Escape"&&!confirmer.disabled){e.preventDefault();revenir();}}));
   confirmer.addEventListener("click",async()=>{
    confirmer.disabled=true;annuler.disabled=true;confirmer.setAttribute("aria-busy","true");
    annoncerQuiz("Suppression en cours…","");
    const reponse=await compte.deleteQuiz(r.id);
    if(version!==versionSession||!compte.user) return; // session changée entre-temps : la liste a été rechargée
    if(!reponse.ok){
     // Rien n'est retiré : la confirmation reste ouverte pour réessayer ou annuler
     confirmer.disabled=false;annuler.disabled=false;confirmer.removeAttribute("aria-busy");
     annoncerQuiz(reponse.message,"err");
     confirmer.focus();
     return;
    }
    // Ligne retirée ; le focus va au résultat suivant, sinon au précédent, sinon au titre de la liste
    const ligne=cellule.closest("tr"),corps=ligne.parentNode;
    const voisine=ligne.nextElementSibling||ligne.previousElementSibling;
    ligne.remove();
    if(!corps.rows.length){
     const zone=document.getElementById("compte-quiz");zone.textContent="";zone.appendChild(texteAucunQuiz());
    }
    annoncerQuiz("Résultat supprimé.","ok");
    const cible=voisine&&voisine.querySelector("button[data-quiz-supprimer]");
    if(cible) cible.focus(); else if(titreQuiz) titreQuiz.focus();
   });
   cellule.append(confirmer," ",annuler);
   annuler.focus(); // pas sur le bouton destructeur
  });
  cellule.appendChild(supprimer);
 }
 async function chargerQuiz(){
  const version=versionSession;
  const zone=document.getElementById("compte-quiz");
  annoncerQuiz("","");
  const reponse=await compte.loadQuizzes();
  if(version!==versionSession||!compte.user)return;
  zone.textContent="";
  if(!reponse.ok){const p=document.createElement("p");p.className="acc-msg acc-err";p.textContent=reponse.message;zone.appendChild(p);return;}
  if(!reponse.results.length){zone.appendChild(texteAucunQuiz());return;}
  const tableau=document.createElement("table");
  const entete=tableau.createTHead().insertRow();
  ["Date","Score","Palier"].forEach(t=>{const th=document.createElement("th");th.textContent=t;entete.appendChild(th);});
  const thAction=document.createElement("th");thAction.className="sr-only";thAction.textContent="Supprimer";entete.appendChild(thAction);
  const corps=tableau.createTBody();
  reponse.results.forEach(r=>{
   const ligne=corps.insertRow();
   const dateLisible=new Date(r.created_at).toLocaleDateString("fr-FR");
   ligne.insertCell().textContent=dateLisible;
   const v2=Number.isInteger(r.palier);
   ligne.insertCell().textContent=v2?"—":r.score+" / 30"; // le score v2 n'est qu'une somme interne, le palier suffit
   ligne.insertCell().textContent=(v2?PALIERS_QUIZ[r.palier]:NIVEAUX_QUIZ[r.niveau-1])||"—";
   remplirActionQuiz(ligne.insertCell(),r,dateLisible);
  });
  const defilement=document.createElement("div");defilement.className="acc-scroll";defilement.appendChild(tableau);
  zone.appendChild(defilement);
  // Arrivée par le lien de la politique de confidentialité (compte.html#historique-test) : la liste vient de s'afficher
  if(location.hash==="#historique-test"&&titreQuiz&&!chargerQuiz.dejaAmene){chargerQuiz.dejaAmene=true;titreQuiz.scrollIntoView();}
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
 // À l'ouverture, le focus va sur « Annuler » (pas sur le bouton destructeur) ; le message d'avertissement est lu
 // avec le bouton de confirmation (aria-describedby="sup-msg")
 function modeConfirmation(actif){
  boutonDemander.hidden=actif;boutonConfirmer.hidden=!actif;boutonAnnuler.hidden=!actif;
  if(actif) boutonAnnuler.focus();
 }
 // Annuler (bouton ou Échap) : la confirmation se ferme, le focus revient sur « Supprimer mon compte »
 function annulerSuppression(){afficher(messageSuppression,"","");modeConfirmation(false);boutonDemander.focus();}
 boutonDemander.addEventListener("click",()=>{
  afficher(messageSuppression,"Tu es sur le point de supprimer ton compte et toutes tes données. Cette action est définitive.","err");
  modeConfirmation(true);
 });
 boutonAnnuler.addEventListener("click",annulerSuppression);
 [boutonConfirmer,boutonAnnuler].forEach(b=>b.addEventListener("keydown",e=>{if(e.key==="Escape"&&!boutonConfirmer.disabled){e.preventDefault();annulerSuppression();}}));
 boutonConfirmer.addEventListener("click",async()=>{
  boutonConfirmer.disabled=true;afficher(messageSuppression,"Suppression en cours…","");
  const caseEffacer=document.getElementById("sup-effacer");
  const effacerAppareil=!!(caseEffacer&&caseEffacer.checked);
  const reponse=await compte.deleteAccount({effacer:effacerAppareil});
  boutonConfirmer.disabled=false;
  if(reponse.ok){
   modeConfirmation(false);
   compteSupprime=true;
   // Message fidèle au choix de la case : les données de l'appareil ne sont effacées que si elle était cochée
   afficher(zoneMessage,effacerAppareil
    ?"Ton compte et les données de cet appareil ont été supprimés."
    :"Ton compte et les données qu'il contenait ont été supprimés. Les données gardées sur cet appareil y sont restées.","ok");
   afficherEtat();
   // Les boutons de suppression disparaissent avec le profil : le focus va sur le message de confirmation
   zoneMessage.setAttribute("tabindex","-1");zoneMessage.focus();
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
  if(compte.user&&!compteSupprime){
   blocProfil.hidden=false;
   if(!bienvenue) zoneMessage.hidden=true;
   document.getElementById("compte-adresse").textContent=compte.user.email||"";
   afficher(messageProfil,"","");afficher(messageSuppression,"","");modeConfirmation(false);
   chargerProfil();chargerQuiz();chargerPlan();chargerPartenaires();
   accueillir();
  }else{
   blocProfil.hidden=true;
   // Compte supprimé : le message de confirmation reste affiché, avec un lien ; sinon, direction la page de connexion
   if(zoneMessage.classList.contains("acc-ok")&&!zoneMessage.hidden){
    if(zoneMessage.querySelector("a")) return; // lien déjà ajouté (fermeture de session annoncée après la suppression)
    const a=document.createElement("a");a.href="connexion.html";a.textContent="Revenir à la connexion";
    zoneMessage.append(" ",a);
   }else location.replace("connexion.html?suite=compte.html");
  }
 }
 compte.ready.then(()=>{
  if(!compte.user) zoneMessage.hidden=true;
  afficherEtat();
  compte.onChange(afficherEtat);
  suivreSynchro();compte.onChange(suivreSynchro);
 }).catch(()=>{ afficher(zoneMessage,"Impossible de charger ton compte pour le moment. Recharge la page.","err"); });
})();
