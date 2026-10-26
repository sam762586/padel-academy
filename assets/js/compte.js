/* COMPTE JOUEUR (module partagé)
   Amélioration progressive : si la config est vide, si le CDN ne répond pas ou si la page est
   ouverte en file://, rien n'est initialisé (PA_COMPTE.actif === false) et le site reste identique.
   Toutes les méthodes réseau ne lèvent jamais d'exception : elles renvoient { ok, ..., message }. */
(function(){
 const config=window.PA_SUPABASE||{};
 const protocoleOk=location.protocol==="http:"||location.protocol==="https:";
 const configOk=!!(config.url&&config.anonKey);
 const sdkOk=!!(window.supabase&&typeof window.supabase.createClient==="function");

 // Raison de l'inactivité, utilisée par compte.html pour afficher un message clair
 let raisonInactif="";
 if(!configOk) raisonInactif="config";
 else if(!protocoleOk) raisonInactif="file";
 else if(!sdkOk) raisonInactif="cdn";

 let client=null;
 if(!raisonInactif){
  try{ client=window.supabase.createClient(config.url,config.anonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}); }
  catch(e){ client=null; raisonInactif="cdn"; }
 }

 const ecouteurs=[];
 const compte={
  actif:!!client,
  raisonInactif:client?"":raisonInactif,
  user:null,
  ready:Promise.resolve(),
  // Abonnement aux changements de session (connexion / déconnexion)
  onChange(rappel){
   if(typeof rappel!=="function") return;
   ecouteurs.push(rappel);
  }
 };
 window.PA_COMPTE=compte;
 if(!client) return; // comptes inactifs : on s'arrête ici, rien d'autre n'est défini
 // Client Supabase partagé (utilisé par partenaires.js pour ne pas créer une seconde session)
 compte.client=client;

 function messageErreur(e,defaut){
  const brut=((e&&e.message)||"").toLowerCase();
  if(brut.includes("failed to fetch")||brut.includes("network")) return "Connexion impossible : vérifie ton réseau puis réessaie.";
  if(brut.includes("rate limit")||brut.includes("security purposes")) return "Trop de demandes d'e-mails. Patiente quelques minutes avant de réessayer.";
  if(brut.includes("invalid")&&brut.includes("email")) return "Cette adresse e-mail n'est pas valide.";
  return defaut||"Une erreur est survenue. Réessaie dans un instant.";
 }
 const echec=(e,defaut)=>({ok:false,message:messageErreur(e,defaut)});
 const nonConnecte=()=>({ok:false,message:"Tu n'es pas connecté."});
 function prevenir(){ ecouteurs.slice().forEach(cb=>{ try{cb(compte.user);}catch(e){} }); }
 // Met à jour l'utilisateur ; renvoie true si l'identité a changé
 function definirUtilisateur(session){
  const nouvelId=session&&session.user?session.user.id:null;
  const ancienId=compte.user?compte.user.id:null;
  compte.user=session&&session.user?session.user:null;
  return nouvelId!==ancienId;
 }

 // Session initiale (lit aussi le jeton présent dans l'URL après le clic sur le lien magique)
 compte.ready=(async()=>{
  try{
   const {data}=await client.auth.getSession();
   definirUtilisateur(data&&data.session);
  }catch(e){ compte.user=null; }
 })();
 try{
  client.auth.onAuthStateChange((evenement,session)=>{
   if(definirUtilisateur(session)) prevenir();
  });
 }catch(e){}

 // Connexion par lien magique : emailRedirectTo = compte.html courante
 compte.signIn=async function(email){
  try{
   const retour=new URL("compte.html",location.href);
   retour.search="";retour.hash="";
   const {error}=await client.auth.signInWithOtp({email:email,options:{emailRedirectTo:retour.href}});
   if(error) return echec(error,"Impossible d'envoyer le lien. Réessaie dans un instant.");
   return {ok:true};
  }catch(e){ return echec(e,"Impossible d'envoyer le lien. Réessaie dans un instant."); }
 };
 compte.signOut=async function(){
  try{
   const {error}=await client.auth.signOut();
   if(error) return echec(error,"Déconnexion impossible.");
   return {ok:true};
  }catch(e){ return echec(e,"Déconnexion impossible."); }
 };

 // Profil
 compte.loadProfile=async function(){
  if(!compte.user) return nonConnecte();
  try{
   const {data,error}=await client.from("profiles").select("*").eq("id",compte.user.id).maybeSingle();
   if(error) return echec(error,"Impossible de charger ton profil.");
   return {ok:true,profile:data||{}};
  }catch(e){ return echec(e,"Impossible de charger ton profil."); }
 };
 compte.saveProfile=async function(champs){
  if(!compte.user) return nonConnecte();
  try{
   const ligne=Object.assign({},champs,{id:compte.user.id,updated_at:new Date().toISOString()});
   const {error}=await client.from("profiles").upsert(ligne);
   if(error) return echec(error,"Impossible d'enregistrer ton profil.");
   return {ok:true};
  }catch(e){ return echec(e,"Impossible d'enregistrer ton profil."); }
 };

 // Quiz : result = { score, niveau (1 à 4), reponses (JSON) }
 compte.saveQuiz=async function(result){
  if(!compte.user) return nonConnecte();
  const themes=["vitre","service","aerien","couple","placement","montee","regularite","transition","communication","compet"];
  if(!result||!Number.isInteger(result.score)||result.score<0||result.score>30||
     result.niveau!==(result.score<9?1:result.score<17?2:result.score<24?3:4)||
     !Array.isArray(result.reponses)||result.reponses.length!==10||
     result.reponses.some((r,i)=>!r||!Number.isInteger(r.pts)||r.pts<0||r.pts>3||r.theme!==themes[i])||
     result.reponses.reduce((s,r)=>s+r.pts,0)!==result.score){
   return {ok:false,message:"Ce résultat est invalide. Recommence le test avant de l'enregistrer."};
  }
  try{
   const {error}=await client.from("quiz_results").insert({user_id:compte.user.id,score:result.score,niveau:result.niveau,reponses:result.reponses||null});
   if(error) return echec(error,"Impossible d'enregistrer ton résultat.");
   return {ok:true};
  }catch(e){ return echec(e,"Impossible d'enregistrer ton résultat."); }
 };
 compte.loadQuizzes=async function(){
  if(!compte.user) return nonConnecte();
  try{
   const {data,error}=await client.from("quiz_results").select("id,score,niveau,created_at").eq("user_id",compte.user.id).order("created_at",{ascending:false}).limit(50);
   if(error) return echec(error,"Impossible de charger ton historique.");
   return {ok:true,results:data||[]};
  }catch(e){ return echec(e,"Impossible de charger ton historique."); }
 };

 // Plan : semaines validées (indices 0 à 7 côté site, stockés tels quels dans plan_progress.semaine)
 compte.loadPlan=async function(proprietaire=compte.user&&compte.user.id){
  if(!compte.user||compte.user.id!==proprietaire) return nonConnecte();
  try{
   const {data,error}=await client.from("plan_progress").select("semaine").eq("user_id",proprietaire);
   if(error) return echec(error,"Impossible de charger ta progression.");
   return {ok:true,weeks:(data||[]).map(l=>l.semaine)};
  }catch(e){ return echec(e,"Impossible de charger ta progression."); }
 };
 compte.savePlanWeek=async function(i,done,proprietaire=compte.user&&compte.user.id){
  if(!compte.user||compte.user.id!==proprietaire) return nonConnecte();
  if(!Number.isInteger(i)||i<0||i>7||typeof done!=="boolean")return {ok:false,message:"Semaine invalide."};
  try{
   const requete=done
    ?client.from("plan_progress").upsert({user_id:proprietaire,semaine:i},{onConflict:"user_id,semaine"})
    :client.from("plan_progress").delete().eq("user_id",proprietaire).eq("semaine",i);
   const {error}=await requete;
   if(error) return echec(error,"Impossible de synchroniser ta progression.");
   return {ok:true};
  }catch(e){ return echec(e,"Impossible de synchroniser ta progression."); }
 };
 // Fusion : écrit sur le serveur une liste de semaines en une seule requête
 compte.savePlanWeeks=async function(liste){
  if(!compte.user) return nonConnecte();
  if(!Array.isArray(liste)||liste.some(i=>!Number.isInteger(i)||i<0||i>7))return {ok:false,message:"Semaines invalides."};
  if(!liste.length) return {ok:true};
  try{
   const {error}=await client.from("plan_progress").upsert(liste.map(s=>({user_id:compte.user.id,semaine:s})),{onConflict:"user_id,semaine"});
   if(error) return echec(error,"Impossible de synchroniser ta progression.");
   return {ok:true};
  }catch(e){ return echec(e,"Impossible de synchroniser ta progression."); }
 };

 // Suppression définitive (fonction SQL delete_my_account), puis fin de session locale
 compte.deleteAccount=async function(){
  if(!compte.user) return nonConnecte();
  const proprietaire=compte.user.id;
  try{
   const {error}=await client.rpc("delete_my_account");
   if(error) return echec(error,"Suppression impossible pour le moment.");
   try{localStorage.removeItem("pa-weeks-v2:"+proprietaire);}catch(e){}
   try{ await client.auth.signOut(); }catch(e){}
   return {ok:true};
  }catch(e){ return echec(e,"Suppression impossible pour le moment."); }
 };
})();
