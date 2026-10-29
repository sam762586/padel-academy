/* PAGE CONNEXION (connexion.html)
   E-mail + mot de passe (connexion, création de compte, mot de passe oublié), lien magique en option,
   Google si PA_SUPABASE.google === true (fournisseur à activer dans Supabase avant).
   S'appuie sur le client partagé PA_COMPTE.client (compte.js). Ne modifie aucune table : la ligne
   profiles est créée par le trigger handle_new_user à l'inscription.
   Paramètres d'URL : ?suite=espace.html (page à ouvrir après connexion, même site uniquement : page de la racine ou
   fiche tournoi/<id>.html) ; ?confirme=1 (retour du lien de confirmation : premier passage par compte.html?bienvenue=1) ;
   ?mode=nouveau (retour du lien « mot de passe oublié » : le formulaire ne s'ouvre que sur l'événement Supabase
   PASSWORD_RECOVERY ou avec un jeton de récupération dans le fragment, jamais pour une simple session ouverte).
   Accessibilité : les zones de message restent dans la page (vides quand il n'y a rien à dire) ; une erreur passe en
   role=alert, marque le champ en cause (aria-invalid + aria-describedby vers le message) et y place le focus.
   Âge : il faut avoir 15 ans ou plus pour créer un compte (décision du 29/10/2026, RGPD art. 8, loi Informatique
   et Libertés art. 45). La confirmation part dans les métadonnées du compte (age_15_confirme, age_15_confirme_le). */

// Erreurs renvoyées dans l'adresse au retour de Google ou d'un lien reçu par e-mail (error_code, sinon error).
// Seuls ces messages sont affichés : le texte libre error_description venu de l'adresse n'est jamais repris.
const CX_MESSAGES_RETOUR={
 otp_expired:"Ce lien a expiré ou a déjà servi. Recommence la connexion.",
 flow_state_expired:"Ce lien a expiré ou a déjà servi. Recommence la connexion.",
 flow_state_not_found:"Ce lien n'est plus valable (ouvert dans un autre navigateur, ou trop tard). Recommence la connexion.",
 bad_code_verifier:"Ce lien n'est plus valable (ouvert dans un autre navigateur, ou trop tard). Recommence la connexion.",
 bad_oauth_state:"La connexion avec Google n'a pas abouti (page ouverte trop longtemps ou dans un autre navigateur). Recommence.",
 bad_oauth_callback:"La connexion avec Google n'a pas abouti (page ouverte trop longtemps ou dans un autre navigateur). Recommence.",
 access_denied:"Connexion annulée. Tu peux réessayer quand tu veux.",
 email_exists:"Un compte existe déjà avec cette adresse e-mail. Connecte-toi avec ton mot de passe.",
 user_already_exists:"Un compte existe déjà avec cette adresse e-mail. Connecte-toi avec ton mot de passe.",
 identity_already_exists:"Ce compte Google est déjà relié à un autre compte. Connecte-toi avec celui-ci.",
 email_not_confirmed:"Ton e-mail n'est pas encore confirmé : clique sur le lien reçu par e-mail, puis reconnecte-toi.",
 signup_disabled:"La création de compte est fermée pour le moment. Réessaie plus tard.",
 provider_disabled:"La connexion avec Google est indisponible pour le moment. Utilise ton e-mail et ton mot de passe.",
 over_request_rate_limit:"Trop de tentatives. Patiente quelques minutes avant de réessayer.",
 over_email_send_rate_limit:"Trop de demandes d'e-mails. Patiente quelques minutes avant de réessayer.",
 unexpected_failure:"La connexion n'a pas abouti à cause d'un problème de notre côté. Réessaie dans quelques minutes ; si ça continue, écris-nous.",
 server_error:"La connexion n'a pas abouti à cause d'un problème de notre côté. Réessaie dans quelques minutes ; si ça continue, écris-nous.",
 temporarily_unavailable:"Le service de connexion est momentanément indisponible. Réessaie dans quelques minutes."
};
const CX_MESSAGE_RETOUR_DEFAUT="La connexion n'a pas abouti. Réessaie.";
const CX_CLE_AGE_GOOGLE="pa-age-15-google"; // sessionStorage : confirmation des 15 ans donnée avant de partir chez Google

(function(){
 const $=id=>document.getElementById(id);
 const compte=window.PA_COMPTE;
 const msgGlobal=$("cx-msg");
 if(!msgGlobal) return; // page sans formulaire de connexion

 /* ---------- Messages et champs en erreur ---------- */
 // Retire le marquage d'erreur des champs reliés à un message
 function demarquer(msg){
  if(!msg||!msg.id) return;
  document.querySelectorAll('[aria-describedby~="'+msg.id+'"]').forEach(champ=>{
   const reste=(champ.getAttribute("aria-describedby")||"").split(/\s+/).filter(x=>x&&x!==msg.id);
   if(reste.length) champ.setAttribute("aria-describedby",reste.join(" ")); else champ.removeAttribute("aria-describedby");
   champ.removeAttribute("aria-invalid");
  });
 }
 // Affiche un message : type "err" (annoncé tout de suite, role=alert), "ok" ou "" (role=status).
 // champs : champ(s) en cause, marqués aria-invalid et reliés au message ; le premier reçoit le focus.
 function afficher(el,texte,type,champs){
  if(!el) return;
  demarquer(el);
  el.hidden=false;
  el.setAttribute("role",type==="err"?"alert":"status");
  el.className="acc-msg"+(type==="err"?" acc-err":type==="ok"?" acc-ok":"");
  el.textContent=texte||"";
  const liste=(Array.isArray(champs)?champs:[champs]).filter(Boolean);
  if(type==="err"&&liste.length){
   liste.forEach(champ=>{
    champ.setAttribute("aria-invalid","true");
    const ids=(champ.getAttribute("aria-describedby")||"").split(/\s+/).filter(Boolean);
    if(!ids.includes(el.id)) ids.push(el.id);
    champ.setAttribute("aria-describedby",ids.join(" "));
   });
   liste[0].focus();
  }
 }
 const erreur=(el,texte,champs)=>afficher(el,texte,"err",champs);

 // Page de retour : uniquement un chemin relatif du site (jamais une URL externe)
 const params=new URLSearchParams(location.search);
 let suite=params.get("suite")||"espace.html";
 if(!/^([a-z0-9_-]+|tournoi\/\d+)\.html(#[a-z0-9_-]+)?$/i.test(suite)) suite="espace.html";
 const ici=new URL("connexion.html",location.href); ici.search=""; ici.hash="";

 if(!compte||!compte.actif){
  const raison=compte&&compte.raisonInactif;
  erreur(msgGlobal,raison==="file"?"Les comptes ne marchent pas quand la page est ouverte depuis un fichier : ouvre le site en ligne.":"Les comptes sont indisponibles pour le moment (service non joignable). Réessaie dans un instant.");
  document.querySelectorAll(".cx-panneau button, .cx-panneau input").forEach(e=>e.disabled=true);
  return;
 }
 const client=compte.client;

 function messageErreur(e,defaut){
  const brut=((e&&e.message)||"").toLowerCase();
  if(brut.includes("invalid login credentials")) return "E-mail ou mot de passe incorrect.";
  if(brut.includes("email not confirmed")) return "Ton e-mail n'est pas encore confirmé : clique sur le lien reçu par e-mail, puis reconnecte-toi.";
  if(brut.includes("already registered")||brut.includes("already been registered")) return "Un compte existe déjà avec cette adresse e-mail. Connecte-toi, ou utilise « Mot de passe oublié ».";
  if(brut.includes("password")&&brut.includes("least")) return "Le mot de passe doit faire au moins 8 caractères.";
  if(brut.includes("rate limit")||brut.includes("security purposes")||brut.includes("too many")) return "Trop de tentatives. Patiente quelques minutes avant de réessayer.";
  if(brut.includes("failed to fetch")||brut.includes("network")) return "Connexion impossible : vérifie ton réseau puis réessaie.";
  if(brut.includes("error sending")||brut.includes("sending email")||brut.includes("smtp")) return "L'e-mail n'a pas pu partir (souci technique de notre côté, pas de ta faute). Réessaie dans quelques minutes, ou utilise « Continuer avec Google ».";
  if(brut.includes("invalid")&&brut.includes("email")) return "Cette adresse e-mail n'est pas valide.";
  if(brut.includes("same password")||brut.includes("different from the old")) return "Choisis un mot de passe différent de l'ancien.";
  return defaut||"Une erreur est survenue. Réessaie dans un instant.";
 }
 const emailOk=v=>/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
 function occupe(btn,etat,texte){ if(!btn) return; btn.disabled=etat; if(texte){ if(etat){btn.dataset.txt=btn.textContent;btn.textContent=texte;} else if(btn.dataset.txt){btn.textContent=btn.dataset.txt;} } }

 /* ---------- Onglets : simples boutons à état (aria-pressed) ---------- */
 const onglets=[].slice.call(document.querySelectorAll(".cx-onglet"));
 // focus : true quand le visiteur a demandé le changement par un lien du formulaire (le bouton cliqué disparaît) :
 // le focus va au bouton d'onglet ou au titre du panneau, jamais directement dans un champ
 function montrer(nom,focus){
  onglets.forEach(o=>{const actif=o.dataset.cible===nom;o.classList.toggle("actif",actif);o.setAttribute("aria-pressed",String(actif));});
  document.querySelectorAll(".cx-panneau").forEach(p=>{p.hidden=p.id!=="cx-"+nom;});
  afficher(msgGlobal,"");
  if(!focus) return;
  const cible=onglets.find(o=>o.dataset.cible===nom)||document.querySelector("#cx-"+nom+" h3");
  if(cible) cible.focus();
 }
 onglets.forEach(o=>o.addEventListener("click",()=>montrer(o.dataset.cible)));
 document.querySelectorAll("[data-aller]").forEach(b=>b.addEventListener("click",e=>{e.preventDefault();montrer(b.dataset.aller,true);}));

 /* ---------- Afficher / masquer le mot de passe : nom fixe, état dans aria-pressed ---------- */
 document.querySelectorAll(".cx-oeil").forEach(b=>b.addEventListener("click",()=>{
  const champ=$(b.dataset.pour); if(!champ) return;
  const visible=champ.type==="text"; champ.type=visible?"password":"text";
  b.setAttribute("aria-pressed",String(!visible));
 }));

 /* ---------- Google (seulement si le fournisseur est configuré dans Supabase) ---------- */
 const google=(window.PA_SUPABASE||{}).google===true;
 const MESSAGE_AGE="Il faut avoir 15 ans ou plus pour créer un compte : coche la case « J'ai 15 ans ou plus » pour continuer.";
 document.querySelectorAll(".cx-google").forEach(b=>{
  if(!google){ b.closest(".cx-tiers").hidden=true; return; }
  b.addEventListener("click",async()=>{
   const panneau=b.closest(".cx-panneau");
   const caseAge=panneau&&panneau.querySelector(".cx-age");
   const msg=panneau&&panneau.querySelector(".cx-panneau > .acc-msg")||msgGlobal;
   if(caseAge&&!caseAge.checked) return erreur(msg,MESSAGE_AGE,caseAge);
   afficher(msg,"");
   // Gardé le temps de l'aller-retour chez Google, puis écrit dans les métadonnées du compte au retour
   try{sessionStorage.setItem(CX_CLE_AGE_GOOGLE,new Date().toISOString());}catch(e){}
   occupe(b,true);
   const retour=new URL(ici.href); retour.searchParams.set("suite",suite);
   const {error}=await client.auth.signInWithOAuth({provider:"google",options:{redirectTo:retour.href}});
   if(error){ occupe(b,false); erreur(msg,messageErreur(error,"Connexion Google impossible pour le moment.")); }
  });
 });
 // Retour de Google : la confirmation des 15 ans rejoint les métadonnées du compte (une seule fois)
 async function enregistrerAgeGoogle(){
  let date=null;
  try{date=sessionStorage.getItem(CX_CLE_AGE_GOOGLE);sessionStorage.removeItem(CX_CLE_AGE_GOOGLE);}catch(e){}
  const meta=compte.user&&compte.user.user_metadata||{};
  if(!date||meta.age_15_confirme===true) return;
  // 3 s au plus : la redirection ne reste pas bloquée par un réseau lent
  try{ await Promise.race([client.auth.updateUser({data:{age_15_confirme:true,age_15_confirme_le:date}}),new Promise(r=>setTimeout(r,3000))]); }catch(e){}
 }

 /* ---------- Récupération de mot de passe ---------- */
 // Le formulaire « nouveau mot de passe » s'ouvre sur l'événement PASSWORD_RECOVERY de Supabase, ou avec un jeton
 // de récupération dans le fragment (#…type=recovery). ?mode=nouveau seul ne suffit pas.
 let modeRecup=/(^|[#&])type=recovery(&|$)/.test(location.hash)||compte.recuperation===true;
 try{ client.auth.onAuthStateChange((ev)=>{ if(ev==="PASSWORD_RECOVERY"){ modeRecup=true; montrer("nouveau"); } }); }catch(e){}

 // Erreur renvoyée par Supabase au retour de Google ou d'un lien reçu par e-mail (dans ?… ou #…) :
 // on affiche un message connu, jamais le texte de l'adresse
 const retourHash=new URLSearchParams(location.hash.replace(/^#/,""));
 const codeErreur=params.get("error_code")||retourHash.get("error_code")||params.get("error")||retourHash.get("error");
 const messageRetour=code=>Object.prototype.hasOwnProperty.call(CX_MESSAGES_RETOUR,code)?CX_MESSAGES_RETOUR[code]:CX_MESSAGE_RETOUR_DEFAUT;

 // Déjà connecté (hors récupération) : on file vers la suite ; un compte tout neuf (e-mail confirmé, ou créé à l'instant
 // avec Google) passe d'abord par son profil
 compte.ready.then(async()=>{
  if(compte.recuperation===true) modeRecup=true; // événement reçu par compte.js avant ce script
  if(compte.user&&!modeRecup){
   await enregistrerAgeGoogle();
   const cree=Date.parse(compte.user.created_at||"");
   const nouveau=params.get("confirme")==="1"||(!isNaN(cree)&&Date.now()-cree<10*60000);
   location.replace(nouveau?"compte.html?bienvenue=1":suite); return;
  }
  if(modeRecup) montrer("nouveau");
  else if(params.get("onglet")==="inscription") montrer("inscription");
  if(codeErreur){
   erreur(msgGlobal,messageRetour(codeErreur));
   try{history.replaceState(null,"",location.pathname+"?suite="+encodeURIComponent(suite));}catch(e){}
  }
  else if(params.get("mode")==="nouveau"&&!modeRecup) erreur(msgGlobal,"Ce lien pour changer de mot de passe n'est plus valable (déjà utilisé ou expiré). Demande un nouveau lien depuis « Mot de passe oublié ».");
  else if(params.get("confirme")==="1") afficher(msgGlobal,"Ton e-mail est confirmé. Tu peux te connecter.","ok");
 });

 /* ---------- Connexion ---------- */
 $("cx-form-connexion").addEventListener("submit",async e=>{
  e.preventDefault();
  const champEmail=$("cx-email"),champMdp=$("cx-mdp");
  const email=champEmail.value.trim(), mdp=champMdp.value, btn=$("cx-valider"), msg=$("cx-connexion-msg");
  if(!emailOk(email)) return erreur(msg,"Saisis une adresse e-mail valide.",champEmail);
  if(!mdp) return erreur(msg,"Saisis ton mot de passe.",champMdp);
  occupe(btn,true,"Connexion…"); afficher(msg,"");
  const {error}=await client.auth.signInWithPassword({email,password:mdp});
  occupe(btn,false,true);
  if(error){
   const texte=messageErreur(error);
   // Identifiants refusés : les deux champs sont en cause, le focus va à l'e-mail
   return erreur(msg,texte,/incorrect/.test(texte)?[champEmail,champMdp]:/confirmé/.test(texte)?champEmail:null);
  }
  location.replace(suite);
 });

 /* ---------- Création de compte ---------- */
 $("cx-form-inscription").addEventListener("submit",async e=>{
  e.preventDefault();
  const champEmail=$("ins-email"),champMdp=$("ins-mdp"),champMdp2=$("ins-mdp2"),caseAge=$("ins-age"),caseCharte=$("ins-charte");
  const email=champEmail.value.trim(), mdp=champMdp.value, mdp2=champMdp2.value, btn=$("ins-valider"), msg=$("cx-inscription-msg");
  if(!caseAge.checked) return erreur(msg,MESSAGE_AGE,caseAge);
  if(!emailOk(email)) return erreur(msg,"Saisis une adresse e-mail valide.",champEmail);
  if(mdp.length<8) return erreur(msg,"Le mot de passe doit faire au moins 8 caractères.",champMdp);
  if(mdp!==mdp2) return erreur(msg,"Les deux mots de passe ne sont pas identiques.",champMdp2);
  if(!caseCharte.checked) return erreur(msg,"Il faut accepter la politique de confidentialité pour créer un compte.",caseCharte);
  occupe(btn,true,"Création…"); afficher(msg,"");
  const retour=new URL(ici.href); retour.searchParams.set("confirme","1"); retour.searchParams.set("suite","compte.html");
  const {data,error}=await client.auth.signUp({email,password:mdp,options:{emailRedirectTo:retour.href,
   data:{age_15_confirme:true,age_15_confirme_le:new Date().toISOString()}}});
  occupe(btn,false,true);
  if(error){
   const texte=messageErreur(error,"Impossible de créer le compte pour le moment.");
   return erreur(msg,texte,/e-mail|compte existe/.test(texte)?champEmail:/mot de passe/.test(texte)?champMdp:null);
  }
  // Protection anti-énumération de Supabase : un compte existant renvoie un utilisateur sans identités
  if(data&&data.user&&Array.isArray(data.user.identities)&&data.user.identities.length===0){
   return erreur(msg,"Un compte existe déjà avec cette adresse e-mail. Connecte-toi, ou utilise « Mot de passe oublié ».",champEmail);
  }
  if(data&&data.session){ location.replace("compte.html?bienvenue=1"); return; }
  $("cx-form-inscription").hidden=true;
  afficher(msg,"C'est presque fini : ouvre l'e-mail que l'on vient de t'envoyer et clique sur « Confirmer mon adresse ». Pense à regarder dans tes courriers indésirables.","ok");
  // Le formulaire a disparu : le focus va sur la confirmation
  msg.setAttribute("tabindex","-1"); msg.focus();
 });

 /* ---------- Mot de passe oublié ---------- */
 $("cx-form-oubli").addEventListener("submit",async e=>{
  e.preventDefault();
  const champ=$("oubli-email"), email=champ.value.trim(), btn=$("oubli-valider"), msg=$("cx-oubli-msg");
  if(!emailOk(email)) return erreur(msg,"Saisis une adresse e-mail valide.",champ);
  occupe(btn,true,"Envoi…"); afficher(msg,"");
  const retour=new URL(ici.href); retour.searchParams.set("mode","nouveau");
  const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo:retour.href});
  occupe(btn,false,true);
  if(error) return erreur(msg,messageErreur(error,"Impossible d'envoyer l'e-mail pour le moment."));
  afficher(msg,"Si un compte existe avec cette adresse, un e-mail vient de partir avec un lien pour choisir un nouveau mot de passe.","ok");
 });

 /* ---------- Nouveau mot de passe (après le lien reçu) ---------- */
 $("cx-form-nouveau").addEventListener("submit",async e=>{
  e.preventDefault();
  const champMdp=$("nv-mdp"),champMdp2=$("nv-mdp2");
  const mdp=champMdp.value, mdp2=champMdp2.value, btn=$("nv-valider"), msg=$("cx-nouveau-msg");
  if(mdp.length<8) return erreur(msg,"Le mot de passe doit faire au moins 8 caractères.",champMdp);
  if(mdp!==mdp2) return erreur(msg,"Les deux mots de passe ne sont pas identiques.",champMdp2);
  await compte.ready;
  if(!modeRecup||!compte.user) return erreur(msg,"Le lien a expiré ou a déjà servi. Demande un nouveau lien depuis « Mot de passe oublié ».");
  occupe(btn,true,"Enregistrement…"); afficher(msg,"");
  const {error}=await client.auth.updateUser({password:mdp});
  occupe(btn,false,true);
  if(error){
   const texte=messageErreur(error,"Impossible d'enregistrer ce mot de passe.");
   return erreur(msg,texte,/mot de passe/.test(texte)?champMdp:null);
  }
  afficher(msg,"Mot de passe enregistré. Tu es connecté.","ok");
  setTimeout(()=>location.replace("espace.html"),900);
 });

 /* ---------- Lien magique (option) ---------- */
 $("cx-form-lien").addEventListener("submit",async e=>{
  e.preventDefault();
  const champ=$("lien-email"), email=champ.value.trim(), btn=$("lien-valider"), msg=$("cx-lien-msg");
  if(!emailOk(email)) return erreur(msg,"Saisis une adresse e-mail valide.",champ);
  occupe(btn,true,"Envoi…"); afficher(msg,"");
  const r=await compte.signIn(email);
  occupe(btn,false,true);
  if(!r.ok) return erreur(msg,r.message);
  afficher(msg,"Lien envoyé : ouvre l'e-mail et clique dessus, tu seras connecté.","ok");
 });
})();
