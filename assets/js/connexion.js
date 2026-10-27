/* PAGE CONNEXION (connexion.html)
   E-mail + mot de passe (connexion, création de compte, mot de passe oublié), lien magique en option,
   Google si PA_SUPABASE.google === true (fournisseur à activer dans Supabase avant).
   S'appuie sur le client partagé PA_COMPTE.client (compte.js). Ne modifie aucune table : la ligne
   profiles est créée par le trigger handle_new_user à l'inscription.
   Paramètres d'URL : ?suite=espace.html (page à ouvrir après connexion, même site uniquement : page de la racine ou
   fiche tournoi/<id>.html) ; ?confirme=1 (retour du lien de confirmation : premier passage par compte.html?bienvenue=1). */
(function(){
 const $=id=>document.getElementById(id);
 const compte=window.PA_COMPTE;
 const msgGlobal=$("cx-msg");
 function afficher(el,texte,type){ if(!el) return; el.textContent=texte||""; el.hidden=!texte; el.className="acc-msg"+(type?" "+type:""); }

 // Page de retour : uniquement un chemin relatif du site (jamais une URL externe)
 const params=new URLSearchParams(location.search);
 let suite=params.get("suite")||"espace.html";
 if(!/^([a-z0-9_-]+|tournoi\/\d+)\.html(#[a-z0-9_-]+)?$/i.test(suite)) suite="espace.html";
 const ici=new URL("connexion.html",location.href); ici.search=""; ici.hash="";

 if(!compte||!compte.actif){
  const raison=compte&&compte.raisonInactif;
  afficher(msgGlobal,raison==="file"?"Les comptes ne marchent pas quand la page est ouverte depuis un fichier : ouvre le site en ligne.":"Les comptes sont indisponibles pour le moment (service non joignable). Réessaie dans un instant.","err");
  document.querySelectorAll(".cx-panneau button, .cx-panneau input").forEach(e=>e.disabled=true);
  return;
 }
 const client=compte.client;

 function messageErreur(e,defaut){
  const brut=((e&&e.message)||"").toLowerCase();
  if(brut.includes("invalid login credentials")) return "E-mail ou mot de passe incorrect.";
  if(brut.includes("email not confirmed")) return "Ton e-mail n'est pas encore confirmé : clique sur le lien reçu par e-mail, puis reconnecte-toi.";
  if(brut.includes("already registered")||brut.includes("already been registered")) return "Un compte existe déjà avec cet e-mail. Connecte-toi, ou utilise « Mot de passe oublié ».";
  if(brut.includes("password")&&brut.includes("least")) return "Le mot de passe doit faire au moins 8 caractères.";
  if(brut.includes("rate limit")||brut.includes("security purposes")||brut.includes("too many")) return "Trop de tentatives. Patiente quelques minutes avant de réessayer.";
  if(brut.includes("failed to fetch")||brut.includes("network")) return "Connexion impossible : vérifie ton réseau puis réessaie.";
  if(brut.includes("error sending")||brut.includes("sending email")||brut.includes("smtp")) return "L'e-mail n'a pas pu partir (souci technique de notre côté, pas de ta faute). Réessaie dans quelques minutes, ou utilise « Continuer avec Google ».";
  if(brut.includes("invalid")&&brut.includes("email")) return "Cette adresse e-mail n'est pas valide.";
  if(brut.includes("same password")||brut.includes("different from the old")) return "Choisis un mot de passe différent de l'ancien.";
  return defaut||"Une erreur est survenue. Réessaie dans un instant.";
 }
 const emailOk=v=>/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
 function occupe(btn,etat,texte){ if(!btn) return; btn.disabled=etat; if(texte){ if(etat){btn.dataset.txt=btn.textContent;btn.textContent=texte;} else if(btn.dataset.txt){btn.textContent=btn.dataset.txt;} } }

 // Onglets
 const onglets=[].slice.call(document.querySelectorAll(".cx-onglet"));
 function montrer(nom){
  onglets.forEach(o=>{const actif=o.dataset.cible===nom;o.classList.toggle("actif",actif);o.setAttribute("aria-selected",String(actif));});
  document.querySelectorAll(".cx-panneau").forEach(p=>{p.hidden=p.id!=="cx-"+nom;});
  afficher(msgGlobal,"");
  const premier=document.querySelector("#cx-"+nom+" input:not([type=hidden])"); if(premier&&nom!=="nouveau") premier.focus({preventScroll:true});
 }
 onglets.forEach(o=>o.addEventListener("click",()=>montrer(o.dataset.cible)));
 document.querySelectorAll("[data-aller]").forEach(a=>a.addEventListener("click",e=>{e.preventDefault();montrer(a.dataset.aller);}));

 // Afficher / masquer le mot de passe
 document.querySelectorAll(".cx-oeil").forEach(b=>b.addEventListener("click",()=>{
  const champ=$(b.dataset.pour); if(!champ) return;
  const visible=champ.type==="text"; champ.type=visible?"password":"text";
  b.setAttribute("aria-pressed",String(!visible)); b.textContent=visible?"Afficher":"Masquer";
 }));

 // Google (seulement si le fournisseur est configuré dans Supabase)
 const google=(window.PA_SUPABASE||{}).google===true;
 document.querySelectorAll(".cx-google").forEach(b=>{
  if(!google){ b.closest(".cx-tiers").hidden=true; return; }
  b.addEventListener("click",async()=>{
   occupe(b,true);
   const retour=new URL(ici.href); retour.searchParams.set("suite",suite);
   const {error}=await client.auth.signInWithOAuth({provider:"google",options:{redirectTo:retour.href}});
   if(error){ occupe(b,false); afficher(msgGlobal,messageErreur(error,"Connexion Google impossible pour le moment."),"err"); }
  });
 });

 // Récupération de mot de passe : Supabase ouvre cette page avec un jeton « recovery » dans l'URL
 let modeRecup=/type=recovery/.test(location.hash)||params.get("mode")==="nouveau";
 try{ client.auth.onAuthStateChange((ev)=>{ if(ev==="PASSWORD_RECOVERY"){ modeRecup=true; montrer("nouveau"); } }); }catch(e){}

 // Erreur renvoyée par Supabase au retour de Google ou d'un lien reçu par e-mail (dans ?… ou #…) :
 // on l'affiche au lieu de laisser croire que rien ne s'est passé
 const retourHash=new URLSearchParams(location.hash.replace(/^#/,""));
 const codeErreur=params.get("error_code")||retourHash.get("error_code")||params.get("error")||retourHash.get("error");
 const detailErreur=params.get("error_description")||retourHash.get("error_description")||"";
 function messageRetour(code,detail){
  const d=(detail||"").toLowerCase();
  if(code==="otp_expired"||d.includes("expired")) return "Ce lien a expiré ou a déjà servi. Recommence la connexion.";
  if(code==="access_denied"||d.includes("denied")) return "Connexion annulée. Tu peux réessayer quand tu veux.";
  if(d.includes("database error")) return "Ton compte n'a pas pu être créé à cause d'un problème de notre côté. Réessaie dans quelques minutes ; si ça continue, écris-nous.";
  if(d.includes("email")&&d.includes("already")) return "Un compte existe déjà avec cette adresse e-mail. Connecte-toi avec ton mot de passe.";
  return "La connexion n'a pas abouti"+(detail?" ("+detail.replace(/\+/g," ").slice(0,140)+")":"")+". Réessaie.";
 }

 // Déjà connecté (hors récupération) : on file vers la suite ; un compte tout neuf (e-mail confirmé, ou créé à l'instant
 // avec Google) passe d'abord par son profil
 compte.ready.then(()=>{
  if(compte.user&&!modeRecup){
   const cree=Date.parse(compte.user.created_at||"");
   const nouveau=params.get("confirme")==="1"||(!isNaN(cree)&&Date.now()-cree<10*60000);
   location.replace(nouveau?"compte.html?bienvenue=1":suite); return;
  }
  if(modeRecup) montrer("nouveau");
  else if(params.get("onglet")==="inscription") montrer("inscription");
  if(codeErreur){
   afficher(msgGlobal,messageRetour(codeErreur,detailErreur),"err");
   try{history.replaceState(null,"",location.pathname+"?suite="+encodeURIComponent(suite));}catch(e){}
  }
  else if(params.get("confirme")==="1") afficher(msgGlobal,"Ton e-mail est confirmé. Tu peux te connecter.","ok");
 });

 // Connexion
 $("cx-form-connexion").addEventListener("submit",async e=>{
  e.preventDefault();
  const email=$("cx-email").value.trim(), mdp=$("cx-mdp").value, btn=$("cx-valider"), msg=$("cx-connexion-msg");
  if(!emailOk(email)) return afficher(msg,"Saisis une adresse e-mail valide.","err");
  if(!mdp) return afficher(msg,"Saisis ton mot de passe.","err");
  occupe(btn,true,"Connexion…"); afficher(msg,"");
  const {error}=await client.auth.signInWithPassword({email,password:mdp});
  occupe(btn,false,true);
  if(error) return afficher(msg,messageErreur(error),"err");
  location.replace(suite);
 });

 // Création de compte
 $("cx-form-inscription").addEventListener("submit",async e=>{
  e.preventDefault();
  const email=$("ins-email").value.trim(), mdp=$("ins-mdp").value, mdp2=$("ins-mdp2").value, btn=$("ins-valider"), msg=$("cx-inscription-msg");
  if(!emailOk(email)) return afficher(msg,"Saisis une adresse e-mail valide.","err");
  if(mdp.length<8) return afficher(msg,"Le mot de passe doit faire au moins 8 caractères.","err");
  if(mdp!==mdp2) return afficher(msg,"Les deux mots de passe ne sont pas identiques.","err");
  if(!$("ins-charte").checked) return afficher(msg,"Il faut accepter la politique de confidentialité pour créer un compte.","err");
  occupe(btn,true,"Création…"); afficher(msg,"");
  const retour=new URL(ici.href); retour.searchParams.set("confirme","1"); retour.searchParams.set("suite","compte.html");
  const {data,error}=await client.auth.signUp({email,password:mdp,options:{emailRedirectTo:retour.href}});
  occupe(btn,false,true);
  if(error) return afficher(msg,messageErreur(error,"Impossible de créer le compte pour le moment."),"err");
  // Protection anti-énumération de Supabase : un compte existant renvoie un utilisateur sans identités
  if(data&&data.user&&Array.isArray(data.user.identities)&&data.user.identities.length===0){
   return afficher(msg,"Un compte existe déjà avec cet e-mail. Connecte-toi, ou utilise « Mot de passe oublié ».","err");
  }
  if(data&&data.session){ location.replace("compte.html?bienvenue=1"); return; }
  $("cx-form-inscription").hidden=true;
  afficher(msg,"C'est presque fini : ouvre l'e-mail que l'on vient de t'envoyer et clique sur « Confirmer mon adresse ». Pense à vérifier les spams.","ok");
 });

 // Mot de passe oublié
 $("cx-form-oubli").addEventListener("submit",async e=>{
  e.preventDefault();
  const email=$("oubli-email").value.trim(), btn=$("oubli-valider"), msg=$("cx-oubli-msg");
  if(!emailOk(email)) return afficher(msg,"Saisis une adresse e-mail valide.","err");
  occupe(btn,true,"Envoi…"); afficher(msg,"");
  const retour=new URL(ici.href); retour.searchParams.set("mode","nouveau");
  const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo:retour.href});
  occupe(btn,false,true);
  if(error) return afficher(msg,messageErreur(error,"Impossible d'envoyer l'e-mail pour le moment."),"err");
  afficher(msg,"Si un compte existe avec cette adresse, un e-mail vient de partir avec un lien pour choisir un nouveau mot de passe.","ok");
 });

 // Nouveau mot de passe (après le lien reçu)
 $("cx-form-nouveau").addEventListener("submit",async e=>{
  e.preventDefault();
  const mdp=$("nv-mdp").value, mdp2=$("nv-mdp2").value, btn=$("nv-valider"), msg=$("cx-nouveau-msg");
  if(mdp.length<8) return afficher(msg,"Le mot de passe doit faire au moins 8 caractères.","err");
  if(mdp!==mdp2) return afficher(msg,"Les deux mots de passe ne sont pas identiques.","err");
  await compte.ready;
  if(!compte.user) return afficher(msg,"Le lien a expiré ou a déjà servi. Redemande un e-mail depuis « Mot de passe oublié ».","err");
  occupe(btn,true,"Enregistrement…"); afficher(msg,"");
  const {error}=await client.auth.updateUser({password:mdp});
  occupe(btn,false,true);
  if(error) return afficher(msg,messageErreur(error,"Impossible d'enregistrer ce mot de passe."),"err");
  afficher(msg,"Mot de passe enregistré. Tu es connecté.","ok");
  setTimeout(()=>location.replace("espace.html"),900);
 });

 // Lien magique (option)
 $("cx-form-lien").addEventListener("submit",async e=>{
  e.preventDefault();
  const email=$("lien-email").value.trim(), btn=$("lien-valider"), msg=$("cx-lien-msg");
  if(!emailOk(email)) return afficher(msg,"Saisis une adresse e-mail valide.","err");
  occupe(btn,true,"Envoi…"); afficher(msg,"");
  const r=await compte.signIn(email);
  occupe(btn,false,true);
  if(!r.ok) return afficher(msg,r.message,"err");
  afficher(msg,"Lien envoyé : ouvre l'e-mail et clique dessus, tu seras connecté.","ok");
 });
})();
