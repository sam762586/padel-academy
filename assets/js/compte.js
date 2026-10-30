/* COMPTE JOUEUR (module partagé)
   Amélioration progressive : si la config est vide, si le CDN ne répond pas ou si la page est
   ouverte en file://, rien n'est initialisé (PA_COMPTE.actif === false) et le site reste identique.
   Toutes les méthodes réseau ne lèvent jamais d'exception : elles renvoient { ok, ..., message }.
   Appareil partagé : les listes locales pa-* sont communes à l'appareil. On retient le compte à qui elles appartiennent
   (pa-appareil-compte) : si un autre compte se connecte alors qu'elles contiennent des données, rien n'est envoyé dans
   son compte (espace, journal, favoris, Mon académie) tant qu'il n'a pas choisi « les ajouter » ou « les effacer » (espace joueur). */

/* Clés locales gardées quand on efface les données de l'appareil (déconnexion ou suppression du compte, case cochée) :
   préférences de recherche, sans donnée de jeu. Toutes les autres clés « pa-* » sont effacées, en particulier :
     pa-sim-resultats (résultats de tournois), pa-objectifs, pa-objectifs-jeu, pa-classement-fft (rang déclaré),
     pa-synchro-*:<compte> (dernière version synchronisée), pa-score-historique et pa-score-en-cours (compteur),
     pa-journal-manuels, pa-journal-suppressions, pa-diagnostics (bilans), pa-tournois-favoris(-attente),
     pa-exercices-faits, pa-quiz-dernier (test de niveau), pa-weeks et pa-weeks-v2:<compte> (plan 8 semaines),
     pa-ma-position (position approximative), pa-appareil-compte (propriétaire des listes ci-dessus),
     pa-academie et pa-academie-quiz (Mon académie), pa-academie-synchro:<compte>, pa-academie-priorites,
     pa-defis, pa-tableaux-tactiques, pa-quiz-tactique, pa-diagnostic-paire.
   Gardées : pa-mon-departement, pa-tournois-filtres (recherche de tournois) et pa-p3d-qualite (réglage du simulateur 3D).
   Une nouvelle clé « pa-* » est donc effacée par défaut : l'ajouter ici seulement si c'est un pur réglage. */
const PA_CLES_TECHNIQUES_GARDEES=["pa-mon-departement","pa-tournois-filtres","pa-p3d-qualite"];
// Listes envoyées automatiquement dans le compte connecté (joueur-sync.js, journal.js, favoris.js, academie-sync.js) : c'est leur contenu
// qui déclenche la question « ajouter ou effacer » quand l'appareil appartient à un autre compte
const PA_CLES_ENVOYEES_AU_COMPTE=["pa-sim-resultats","pa-objectifs","pa-objectifs-jeu","pa-classement-fft","pa-score-historique",
 "pa-journal-manuels","pa-diagnostics","pa-tournois-favoris","pa-tournois-favoris-attente","pa-academie","pa-academie-quiz"];
// Mon académie : objets toujours présents une fois la page ouverte ; seul leur contenu compte (choix de niveau, séances de quiz)
const PA_CONTENU_UTILE={"pa-academie":v=>!!(v&&Array.isArray(v.historique)&&v.historique.length),
 "pa-academie-quiz":v=>!!(v&&((Array.isArray(v.seances)&&v.seances.length)||v.enCours))};
const PA_CLE_PROPRIETAIRE="pa-appareil-compte";
// Pseudo public : vérifié avant l'envoi ; même règle que la contrainte SQL profiles_pseudo_format prévue (lot S2 bis, pas encore
// appliquée : en attendant, seule cette vérification côté navigateur s'applique)
const PA_PSEUDO_VALIDE=/^[\p{L}\p{N} _.'’-]{2,30}$/u;
const PA_MESSAGE_PSEUDO="2 à 30 caractères : lettres, chiffres, espaces, _ . ' - (apostrophe droite ou courbe). Pas d'e-mail, de numéro, de lien ni de nom de réseau social.";

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
 // Retour de connexion en cours de transmission à connexion.html (nav.js) : pas de client sur cette page, sinon le
 // code serait échangé ici et là-bas
 else if(window.PA_RELAIS_CONNEXION) raisonInactif="relais";

 /* ---------- Retours de connexion (flux PKCE, revue de sécurité 6.6) ----------
    Le client est en flux PKCE : une session ne s'ouvre qu'avec un ?code= échangé contre le « code_verifier » gardé
    dans CE navigateur au moment de la demande (inscription, lien magique, Google, mot de passe oublié). Un lien piégé
    (code d'un autre, ou jetons #access_token=… d'un autre compte) n'ouvre donc aucune session.
    supabase-js ne lit PAS l'adresse (detectSessionInUrl:false) : avec la lecture automatique, un lien forgé
    (?access_token=x, #%61ccess_token=x, ?error_description=x…) était pris pour un flux implicite, rejeté en PKCE, et le
    SDK supprimait au passage la session du visiteur connecté. L'échange du ?code= est fait ici, à la main (compte.ready). */
 // Jetons du flux implicite (query ou fragment, clés décodées : %61ccess_token = access_token) : plus jamais acceptés.
 // Effacés de l'adresse, sans aucun effet sur la session. Fragment qui en contient : piégé, retiré en entier.
 const PA_CLES_JETONS=["access_token","refresh_token","provider_token"];
 try{
  const adresse=new URL(location.href);
  let modifiee=false;
  PA_CLES_JETONS.forEach(cle=>{ if(adresse.searchParams.has(cle)){ adresse.searchParams.delete(cle); modifiee=true; } });
  const fragment=new URLSearchParams(adresse.hash.replace(/^#/,""));
  if(PA_CLES_JETONS.some(cle=>fragment.has(cle))){ adresse.hash=""; modifiee=true; }
  if(modifiee) history.replaceState(history.state,"",adresse.pathname+adresse.search+adresse.hash);
 }catch(e){}
 // Clé de stockage de supabase-js 2.45.4 : sb-<sous-domaine du projet>-auth-token ; le vérificateur PKCE est gardé sous
 // « <clé>-code-verifier ». resetPasswordForEmail y ajoute « /PASSWORD_RECOVERY » : c'est la preuve, propre à ce
 // navigateur, que le code reçu vient d'une demande de récupération du mot de passe faite ici.
 let cleStockage="";
 try{ cleStockage="sb-"+new URL(config.url).hostname.split(".")[0]+"-auth-token"; }catch(e){}
 const codeArrive=()=>{ try{ return new URLSearchParams(location.search).has("code"); }catch(e){ return false; } };
 const codeAuDepart=codeArrive();
 let retourRecuperation=false;
 let verificateurPresent=false; // une demande faite dans ce navigateur attend son code : seul cas où l'on échange
 if(codeAuDepart&&cleStockage){
  let verificateur=null;
  try{ verificateur=localStorage.getItem(cleStockage+"-code-verifier"); }catch(e){}
  try{ verificateur=JSON.parse(verificateur); }catch(e){}
  verificateurPresent=typeof verificateur==="string"&&verificateur.length>0;
  retourRecuperation=verificateurPresent&&/\/PASSWORD_RECOVERY$/.test(verificateur);
 }

 let client=null;
 if(!raisonInactif){
  try{ client=window.supabase.createClient(config.url,config.anonKey,{auth:{flowType:"pkce",persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}}); }
  catch(e){ client=null; raisonInactif="cdn"; }
 }

 const ecouteurs=[];

 /* ---------- Données de l'appareil ---------- */
 const lireCle=cle=>{try{return localStorage.getItem(cle);}catch(e){return null;}};
 function clesLocales(){const l=[];try{for(let i=0;i<localStorage.length;i++)l.push(localStorage.key(i));}catch(e){}return l;}
 // Efface toutes les données de jeu gardées sur l'appareil (pas les réglages de PA_CLES_TECHNIQUES_GARDEES)
 function effacerDonneesAppareil(){
  const effacees=clesLocales().filter(k=>k&&k.indexOf("pa-")===0&&!PA_CLES_TECHNIQUES_GARDEES.includes(k));
  effacees.forEach(k=>{try{localStorage.removeItem(k);}catch(e){}});
  return effacees;
 }
 // Vrai si au moins une liste envoyée au compte contient quelque chose
 function donneesAEnvoyer(){
  return PA_CLES_ENVOYEES_AU_COMPTE.some(cle=>{
   let v=null;try{v=JSON.parse(lireCle(cle)||"null");}catch(e){return false;}
   if(PA_CONTENU_UTILE[cle])return PA_CONTENU_UTILE[cle](v);
   if(Array.isArray(v))return v.length>0;
   if(v&&typeof v==="object")return Object.keys(v).length>0;
   return v!==null&&v!=="";
  });
 }
 // Comptes à qui appartiennent les données de l'appareil : le propriétaire retenu, sinon (données d'avant ce réglage)
 // les comptes déjà synchronisés ici (pa-synchro-<liste>:<compte>, pa-academie-synchro:<compte>)
 function proprietaires(){
  const p=lireCle(PA_CLE_PROPRIETAIRE);
  if(p)return [p];
  return [...new Set(clesLocales().map(k=>/^pa-(?:synchro-[A-Za-z]+|academie-synchro):(.+)$/.exec(k||"")).filter(Boolean).map(m=>m[1]))];
 }

 // Compte supprimé, données de l'appareil gardées : l'appareil n'appartient plus à ce compte (sinon le même joueur,
 // s'il recrée un compte, serait présenté comme « un autre compte »). On retire le propriétaire retenu s'il s'agit de
 // ce compte, et ses marques de synchronisation (qui le désigneraient encore) ; les données de jeu restent intactes.
 function oublierProprietaire(id){
  if(!id)return;
  if(lireCle(PA_CLE_PROPRIETAIRE)===id){try{localStorage.removeItem(PA_CLE_PROPRIETAIRE);}catch(e){}}
  clesLocales().filter(k=>{const m=/^pa-(?:synchro-[A-Za-z]+|academie-synchro):(.+)$/.exec(k||"");return m&&m[1]===id;})
   .forEach(k=>{try{localStorage.removeItem(k);}catch(e){}});
 }

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
 compte.effacerDonneesAppareil=effacerDonneesAppareil;
 // Vrai si l'appareil contient des données d'un autre compte que celui connecté (rien ne doit partir dans le compte
 // sans accord) ; sinon, le compte connecté devient le propriétaire des données de l'appareil
 compte.verifierAppareil=function(){
  if(!compte.user)return false;
  const id=compte.user.id,autres=proprietaires().filter(x=>x!==id);
  if(autres.length&&donneesAEnvoyer())return true;
  try{localStorage.setItem(PA_CLE_PROPRIETAIRE,id);}catch(e){}
  return false;
 };
 // Choix du joueur connecté : "ajouter" (les données de l'appareil partent dans son compte) ou "effacer"
 compte.resoudreAppareil=function(choix){
  if(!compte.user||(choix!=="ajouter"&&choix!=="effacer"))return false;
  if(choix==="effacer")effacerDonneesAppareil();
  try{localStorage.setItem(PA_CLE_PROPRIETAIRE,compte.user.id);}catch(e){}
  return true;
 };
 const appareilBloque=()=>({ok:false,message:"Des données d'un autre compte sont sur cet appareil : choisis dans ton espace joueur si tu veux les ajouter à ton compte. En attendant, rien n'est envoyé."});
 // Pseudo : vide (null) ou conforme à la règle publique (longueur, caractères, pas de coordonnées)
 compte.pseudoValide=function(pseudo){
  if(pseudo===null||pseudo==="")return true;
  if(typeof pseudo!=="string"||!PA_PSEUDO_VALIDE.test(pseudo))return false;
  const t=pseudo.normalize("NFKC").toLowerCase();
  if(/\.(fr|com|net|org|eu|io|be|ch|me|gg|ly|ee|co|app|info|link)(?![\p{L}\p{N}])/u.test(t))return false;
  if(/(^|[^\p{L}])(gmail|hotmail|outlook|yahoo|icloud|whatsapp|telegram|snapchat|snap|instagram|insta|facebook|messenger|tiktok|discord|signal)(?!\p{L})/u.test(t))return false;
  if(/(whatsapp|instagram|snapchat|telegram|tiktok)/.test(t.replace(/[^\p{L}]/gu,"")))return false;
  return !/[0-9]{9,}/.test(t.replace(/[^\p{L}\p{N}]/gu,""));
 };
 if(!client) return; // comptes inactifs : on s'arrête ici, rien d'autre n'est défini
 // Client Supabase partagé (utilisé par partenaires.js pour ne pas créer une seconde session)
 compte.client=client;

 function messageErreur(e,defaut){
  const brut=((e&&e.message)||"").toLowerCase();
  if(brut.includes("failed to fetch")||brut.includes("network")) return "Connexion impossible : vérifie ton réseau puis réessaie.";
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

 // Code d'erreur d'un échange PKCE raté (bad_code_verifier, flow_state_not_found, flow_state_expired…)
 function codeErreurEchange(e){
  if(!e) return "";
  if(typeof e.code==="string"&&e.code) return e.code;
  const brut=String(e.message||"").toLowerCase();
  if(brut.includes("code verifier")) return "bad_code_verifier";
  if(brut.includes("expired")) return "flow_state_expired";
  if(brut.includes("flow state")) return "flow_state_not_found";
  return "";
 }
 // Session initiale. Retour d'un lien ou de Google (?code=) : échangé ici, seulement si ce navigateur garde un
 // vérificateur PKCE (la demande a été faite ici) ; en cas de succès, « code » est retiré de l'adresse (suite,
 // confirme et mode sont gardés pour connexion.js). Sans vérificateur, on n'y touche pas : le code reste dans
 // l'adresse, connexion.js l'explique au visiteur. Un échange raté ne ferme pas une session déjà ouverte.
 compte.retourCode=codeAuDepart;  // l'adresse portait un ?code= à l'arrivée
 compte.erreurCode="";            // échec de l'échange (vide : réussi, ou pas tenté faute de vérificateur)
 function retirerCodeDeLAdresse(){
  try{
   const adresse=new URL(location.href);
   adresse.searchParams.delete("code");
   history.replaceState(history.state,"",adresse.pathname+adresse.search+adresse.hash);
  }catch(e){}
 }
 compte.ready=(async()=>{
  try{
   if(typeof client.auth.initialize==="function") await client.auth.initialize();
   let echangeReussi=false;
   if(codeAuDepart&&verificateurPresent&&typeof client.auth.exchangeCodeForSession==="function"){
    let code="";
    try{ code=new URLSearchParams(location.search).get("code")||""; }catch(e){}
    let reponse=null;
    try{ reponse=await client.auth.exchangeCodeForSession(code); }catch(e){ reponse={error:e}; }
    if(!reponse||reponse.error) compte.erreurCode=codeErreurEchange(reponse&&reponse.error)||"echec";
    else{ echangeReussi=true; retirerCodeDeLAdresse(); }
   }
   const {data}=await client.auth.getSession();
   definirUtilisateur(data&&data.session);
   // Récupération du mot de passe : seulement si le code a vraiment été échangé ici (session ouverte, aucune erreur)
   // ET que le vérificateur, lu avant l'échange, avait été posé par « mot de passe oublié » dans ce navigateur.
   // En PKCE, supabase-js 2.45.4 n'émet pas PASSWORD_RECOVERY au retour (seulement SIGNED_IN) : ce marqueur le remplace.
   if(retourRecuperation&&echangeReussi&&compte.user&&!compte.erreurCode) compte.recuperation=true;
   compte.verifierAppareil();
  }catch(e){ compte.user=null; }
 })();
 try{
  client.auth.onAuthStateChange((evenement,session)=>{
   // Gardé pour une version future de supabase-js qui émettrait l'événement en PKCE (jamais émis en 2.45.4 en PKCE)
   if(evenement==="PASSWORD_RECOVERY") compte.recuperation=true;
   if(definirUtilisateur(session)){ compte.verifierAppareil(); prevenir(); }
  });
 }catch(e){}

 // Connexion par lien magique : le lien revient sur connexion.html (qui échange le code), puis la page « suite »
 // (chemin relatif du site, revérifié par connexion.js au retour)
 compte.signIn=async function(email,suite){
  try{
   const retour=new URL("connexion.html",location.href);
   retour.search="";retour.hash="";
   if(typeof suite==="string"&&/^([a-z0-9_-]+|tournoi\/\d+)\.html(#[a-z0-9_-]+)?$/i.test(suite)) retour.searchParams.set("suite",suite);
   // Connexion seulement : le lien ne crée pas de compte (la création demande la case « J'ai 15 ans ou plus »).
   // Adresse inconnue : même réponse qu'une adresse connue (on ne révèle pas qui a un compte)
   const {error}=await client.auth.signInWithOtp({email:email,options:{emailRedirectTo:retour.href,shouldCreateUser:false}});
   if(error&&/signups? not allowed|user not found/i.test(error.message||"")) return {ok:true};
   if(error) return echec(error,"Impossible d'envoyer le lien. Réessaie dans un instant.");
   return {ok:true};
  }catch(e){ return echec(e,"Impossible d'envoyer le lien. Réessaie dans un instant."); }
 };
 /* Déconnexion. supabase-js 2.45.4 prévient le serveur (POST /logout) AVANT d'effacer la session de l'appareil ; si le
    serveur ne connaît plus cette session (déjà fermée ailleurs par une déconnexion « tous les appareils », compte
    supprimé, session expirée côté serveur alors que le jeton d'accès local est encore valide), il répond
    session_not_found, le SDK renvoie AuthSessionMissingError (statut 400) et garde la session locale : le joueur
    restait connecté avec « Déconnexion impossible. ». Dans ce cas, la session est terminée sur l'appareil. */
 const sessionAbsente=e=>!!e&&(e.name==="AuthSessionMissingError"||e.code==="session_not_found"||[400,401,403,404].includes(e.status));
 const erreurReseau=e=>!!e&&(e.name==="AuthRetryableFetchError"||/failed to fetch|network|load failed/i.test(String(e.message||"")));
 // Termine la session sur cet appareil seulement, sans dépendre du serveur : signOut local du SDK (son erreur est
 // ignorée : en 2.45.4 il interroge aussi le serveur), puis effacement des clés de session et abonnés prévenus
 async function terminerSessionLocale(){
  try{ await client.auth.signOut({scope:"local"}); }catch(e){}
  if(cleStockage){
   [cleStockage,cleStockage+"-code-verifier",cleStockage+"-user"].forEach(cle=>{try{localStorage.removeItem(cle);}catch(e){}});
  }
  if(definirUtilisateur(null)) prevenir();
 }
 compte.terminerSessionLocale=terminerSessionLocale;
 // options.effacer : efface aussi les données de jeu gardées sur l'appareil (appareil partagé)
 compte.signOut=async function(options){
  let erreur=null;
  try{ erreur=(await client.auth.signOut({scope:"local"})).error||null; }catch(e){ erreur=e||new Error("echec"); }
  if(erreur&&!sessionAbsente(erreur)){
   // Réseau absent : rien n'est effacé ; l'interface peut proposer compte.terminerSessionLocale() (déconnexion de cet
   // appareil seulement, la session restant ouverte côté serveur jusqu'à son expiration)
   if(erreurReseau(erreur)) return {ok:false,reseau:true,message:"Connexion impossible : vérifie ton réseau puis réessaie."};
   return echec(erreur,"Déconnexion impossible.");
  }
  if(erreur) await terminerSessionLocale();  // (succès : supabase-js a déjà effacé la session et émis SIGNED_OUT, suivi par onAuthStateChange)
  if(options&&options.effacer) effacerDonneesAppareil();
  return {ok:true};
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
   if(champs&&"pseudo" in champs&&!compte.pseudoValide(champs.pseudo)) return {ok:false,champ:"pseudo",message:PA_MESSAGE_PSEUDO};
   const ligne=Object.assign({},champs,{id:compte.user.id,updated_at:new Date().toISOString()});
   const {error}=await client.from("profiles").upsert(ligne);
   // Contrainte profiles_pseudo_format (23514 = violation d'une contrainte CHECK)
   if(error&&(error.code==="23514"||/check constraint/i.test(error.message||""))&&/pseudo/i.test((error.message||"")+" "+(error.details||""))) return {ok:false,champ:"pseudo",message:PA_MESSAGE_PSEUDO};
   if(error) return echec(error,"Impossible d'enregistrer ton profil.");
   return {ok:true};
  }catch(e){ return echec(e,"Impossible d'enregistrer ton profil."); }
 };

 const activee=nom=>((window.PA_SUPABASE||{}).activees||[]).includes(nom);
 // Quiz : result = { score, niveau (1 à 4), reponses (JSON) }.
 // Test v2 : en plus palier (0 Découverte à 5 P1000 et +), niveau = niveau des exercices du palier, chaque réponse porte son palier.
 // Le v2 s'enregistre seulement si "quiz2" est dans PA_SUPABASE.activees (SQL 2026-10-26-quiz-03 à -05).
 compte.saveQuiz=async function(result){
  if(!compte.user) return nonConnecte();
  const themes=["vitre","service","aerien","couple","placement","montee","regularite","transition","communication","compet"];
  const v2=!!result&&result.palier!==undefined;
  if(!result||!Number.isInteger(result.score)||result.score<0||result.score>30||
     (v2?!Number.isInteger(result.palier)||result.palier<0||result.palier>5||result.niveau!==[1,1,2,3,4,4][result.palier]||!activee("quiz2")
        :result.niveau!==(result.score<9?1:result.score<17?2:result.score<24?3:4))||
     !Array.isArray(result.reponses)||result.reponses.length!==10||
     result.reponses.some((r,i)=>!r||!Number.isInteger(r.pts)||r.pts<0||r.pts>3||r.theme!==themes[i]||(v2&&(!Number.isInteger(r.palier)||r.palier<0||r.palier>5)))||
     result.reponses.reduce((s,r)=>s+r.pts,0)!==result.score){
   return {ok:false,message:"Ce résultat est invalide. Recommence le test avant de l'enregistrer."};
  }
  try{
   const ligne={user_id:compte.user.id,score:result.score,niveau:result.niveau,reponses:result.reponses||null};
   if(v2)ligne.palier=result.palier;
   const {error}=await client.from("quiz_results").insert(ligne);
   if(error) return echec(error,"Impossible d'enregistrer ton résultat.");
   return {ok:true};
  }catch(e){ return echec(e,"Impossible d'enregistrer ton résultat."); }
 };
 compte.loadQuizzes=async function(){
  if(!compte.user) return nonConnecte();
  try{
   const {data,error}=await client.from("quiz_results").select("id,score,niveau,reponses,created_at"+(activee("quiz2")?",palier":"")).eq("user_id",compte.user.id).order("created_at",{ascending:false}).limit(50);
   if(error) return echec(error,"Impossible de charger ton historique.");
   return {ok:true,results:data||[]};
  }catch(e){ return echec(e,"Impossible de charger ton historique."); }
 };

 // Suppression d'un résultat du test (politique RLS quiz_delete : seulement ses propres lignes). Le delete renvoie les
 // lignes effacées (.select) : zéro ligne = rien supprimé (résultat déjà effacé ailleurs ou refusé), annoncé comme un échec.
 compte.deleteQuiz=async function(id){
  if(!compte.user) return nonConnecte();
  if(id===undefined||id===null||id==="") return {ok:false,message:"Résultat introuvable. Recharge la page puis réessaie."};
  try{
   const {data,error}=await client.from("quiz_results").delete().eq("id",id).eq("user_id",compte.user.id).select("id");
   if(error) return echec(error,"Impossible de supprimer ce résultat. Réessaie dans un instant.");
   if(!Array.isArray(data)||!data.length) return {ok:false,message:"Ce résultat n'a pas été supprimé : recharge la page puis réessaie."};
   return {ok:true};
  }catch(e){ return echec(e,"Impossible de supprimer ce résultat. Réessaie dans un instant."); }
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

 // Matchs du compteur (score.html) : match = { config, points, fin, interrompu, score, vainqueur }
 // Journal de l'espace joueur (migrations 2026-10-26-journal-*) : identifiant, partenaire, type, saisie manuelle
 const journalActif=()=>((window.PA_SUPABASE||{}).activees||[]).includes("journal");
 // Bilan après match dans la ligne du match (SQL 2026-10-27-diagnostic-01) : avec "journal" et "diagnostic"
 const diagnosticActif=()=>journalActif()&&((window.PA_SUPABASE||{}).activees||[]).includes("diagnostic");
 compte.saveMatch=async function(match){
  if(!compte.user) return nonConnecte();
  const moteur=window.PA_SCORE;
  const manuel=!!match&&match.saisie==="manuelle";
  if(!match||!moteur||!moteur.configValide(match.config)||!moteur.pointsValides(match.points)||(!match.points.length&&!(manuel&&journalActif()))||
     !(match.vainqueur===0||match.vainqueur===1||match.vainqueur===null)||typeof match.score!=="string"||match.score.length>60||
     Number.isNaN(Date.parse(match.fin))){
   return {ok:false,message:"Ce match est invalide et n'a pas été enregistré."};
  }
  // Copie automatique d'un match de l'appareil : bloquée si l'appareil appartient à un autre compte
  if(compte.verifierAppareil()) return appareilBloque();
  const c=match.config;
  const ligne={user_id:compte.user.id,joue_le:match.fin,nom_a:c.nomA,nom_b:c.nomB,
   format:{egalite:c.egalite,dernierSet:c.dernierSet,serveur:c.serveur},
   points:match.points,score:match.score,vainqueur:match.vainqueur,interrompu:!!match.interrompu};
  try{
   let requete;
   if(journalActif()&&typeof match.cle==="string"&&/^[0-9A-Za-z-]{8,40}$/.test(match.cle)){
    Object.assign(ligne,{cle:match.cle,partenaire:match.partenaire||null,type_match:match.type||null,saisie:manuel?"manuelle":"compteur"});
    if(diagnosticActif()&&window.PA_DIAGNOSTIC){const d=window.PA_DIAGNOSTIC.lire(match.cle);if(d)ligne.diagnostic=d;}
    // Déjà dans le compte (même identifiant) : rien à faire
    requete=client.from("matchs").upsert(ligne,{onConflict:"user_id,cle",ignoreDuplicates:true});
   }else requete=client.from("matchs").insert(ligne);
   const {error}=await requete;
   if(error){
    // Table absente : la migration n'a pas encore été appliquée dans Supabase
    if(error.code==="42P01"||error.code==="PGRST205") return {ok:false,message:"La sauvegarde des matchs n'est pas encore activée. Le match reste enregistré sur cet appareil."};
    return echec(error,"Impossible d'enregistrer ce match. Il reste enregistré sur cet appareil.");
   }
   return {ok:true};
  }catch(e){ return echec(e,"Impossible d'enregistrer ce match. Il reste enregistré sur cet appareil."); }
 };
 compte.loadMatches=async function(limite=20){
  if(!compte.user) return nonConnecte();
  try{
   const colonnes="id,joue_le,nom_a,nom_b,format,points,score,vainqueur,interrompu"+(journalActif()?",cle,partenaire,type_match,saisie":"")+(diagnosticActif()?",diagnostic":"");
   const {data,error}=await client.from("matchs").select(colonnes)
    .eq("user_id",compte.user.id).order("joue_le",{ascending:false}).limit(Math.min(Math.max(1,limite|0),500));
   if(error) return echec(error,"Impossible de charger tes matchs.");
   return {ok:true,matchs:data||[]};
  }catch(e){ return echec(e,"Impossible de charger tes matchs."); }
 };

 // Bilan après match : écrit (ou efface avec null) le bilan dans la ligne du match ; sans effet si le match n'est pas encore
 // dans le compte (le bilan part avec lui à sa copie, voir saveMatch)
 compte.saveDiagnostic=async function(cle,diagnostic){
  if(!compte.user) return nonConnecte();
  if(!diagnosticActif()||typeof cle!=="string"||!/^[0-9A-Za-z-]{8,40}$/.test(cle)) return {ok:false,message:"Bilan non enregistré dans le compte."};
  try{
   const {error}=await client.from("matchs").update({diagnostic:diagnostic||null}).eq("user_id",compte.user.id).eq("cle",cle);
   if(error) return echec(error,"Impossible d'enregistrer le bilan dans ton compte. Il reste sur cet appareil.");
   return {ok:true};
  }catch(e){ return echec(e,"Impossible d'enregistrer le bilan dans ton compte. Il reste sur cet appareil."); }
 };

 // Favoris tournois (favoris.js) : identifiants Ten'Up
 const tableAbsente=error=>error&&(error.code==="42P01"||error.code==="PGRST205");
 compte.loadFavoris=async function(proprietaire=compte.user&&compte.user.id){
  if(!compte.user||compte.user.id!==proprietaire) return nonConnecte();
  try{
   const {data,error}=await client.from("favoris").select("tournoi_id").eq("user_id",proprietaire).limit(500);
   if(error) return tableAbsente(error)?{ok:false,message:"La sauvegarde des favoris n'est pas encore activée."}:echec(error,"Impossible de charger tes favoris.");
   return {ok:true,ids:(data||[]).map(l=>String(l.tournoi_id))};
  }catch(e){ return echec(e,"Impossible de charger tes favoris."); }
 };
 compte.saveFavori=async function(id,actif,proprietaire=compte.user&&compte.user.id){
  if(!compte.user||compte.user.id!==proprietaire) return nonConnecte();
  if(typeof id!=="string"||!/^[0-9A-Za-z_-]{1,20}$/.test(id)||typeof actif!=="boolean") return {ok:false,message:"Favori invalide."};
  if(compte.verifierAppareil()) return appareilBloque();
  try{
   const requete=actif
    ?client.from("favoris").upsert({user_id:proprietaire,tournoi_id:id},{onConflict:"user_id,tournoi_id"})
    :client.from("favoris").delete().eq("user_id",proprietaire).eq("tournoi_id",id);
   const {error}=await requete;
   if(error) return tableAbsente(error)?{ok:false,message:"La sauvegarde des favoris n'est pas encore activée."}:echec(error,"Impossible d'enregistrer ce favori.");
   return {ok:true};
  }catch(e){ return echec(e,"Impossible d'enregistrer ce favori."); }
 };

 compte.deleteMatch=async function(cle){
  if(!compte.user) return nonConnecte();
  if(typeof cle!=="string"||!/^[0-9A-Za-z-]{8,40}$/.test(cle)) return {ok:false,message:"Match invalide."};
  try{
   const {error}=await client.from("matchs").delete().eq("user_id",compte.user.id).eq("cle",cle);
   if(error) return echec(error,"Impossible de supprimer ce match.");
   return {ok:true};
  }catch(e){ return echec(e,"Impossible de supprimer ce match."); }
 };

 // Suppression définitive (fonction SQL delete_my_account), puis fin de session locale ;
 // options.effacer : efface aussi les données de jeu gardées sur l'appareil
 compte.deleteAccount=async function(options){
  if(!compte.user) return nonConnecte();
  const proprietaire=compte.user.id;
  try{
   const {error}=await client.rpc("delete_my_account");
   if(error) return echec(error,"Suppression impossible pour le moment.");
   try{localStorage.removeItem("pa-weeks-v2:"+proprietaire);}catch(e){}
   if(options&&options.effacer) effacerDonneesAppareil();
   else oublierProprietaire(proprietaire);
   // Compte supprimé : le serveur ne connaît plus la session (session_not_found, user_not_found…) et supabase-js 2.45.4
   // garderait alors la session locale ; quelle que soit l'erreur, la session est terminée sur l'appareil
   let erreurDeconnexion=null;
   try{ erreurDeconnexion=(await client.auth.signOut()).error||null; }catch(e){ erreurDeconnexion=e||new Error("echec"); }
   if(erreurDeconnexion) await terminerSessionLocale();
   return {ok:true};
  }catch(e){ return echec(e,"Suppression impossible pour le moment."); }
 };
})();
