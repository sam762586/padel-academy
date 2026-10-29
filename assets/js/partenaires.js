/* TROUVER UN PARTENAIRE POUR UN TOURNOI
   - Page partenaires.html : choix du tournoi, annonces, publication, réponse, signalement, vue admin.
   - Page compte.html : window.PA_PARTENAIRES.rendreMesAnnonces(zone) affiche « mes annonces et réponses ».
   Dépend de compte.js (PA_COMPTE.client). Les annonces ne sont visibles que connecté (RLS côté base).
   Tout le texte venant de la base est inséré avec textContent. Voir supabase/schema-partenaires.sql.
   S2 bis (supabase/migrations/2026-10-29-s2-24 à s2-42) : user_id n'est plus lisible dans annonces ni reponses.
   On demande donc toujours une liste de colonnes sans user_id (jamais "*"), « mes annonces » et « mes réponses »
   passent par les fonctions mes_annonces() et mes_reponses(), et « Ton annonce » se reconnaît à son identifiant.
   Ce script n'attend pas PA_SUPABASE.activees (la page est en ligne) : tant que S2 bis n'est pas exécuté, ces
   fonctions n'existent pas (PGRST202, 404) et on revient à l'ancienne lecture filtrée sur user_id. */
(function(){
 "use strict";

 /* ---------- Données ---------- */
 const NIVEAUX=["Débutant · P25","Loisir · P100","Intermédiaire · P250","Avancé · P500 et +"]; // mêmes libellés que le quiz
 const LIBELLE_SEXE={messieurs:"Messieurs",dames:"Dames",mixte:"Mixte"};
 const LIBELLE_COTE={droite:"Côté droit",gauche:"Côté gauche",indifferent:"Côté indifférent"};
 const MOTIFS=[
  ["contact","Coordonnées ou contact public"],
  ["commercial","Contenu commercial"],
  ["irrespectueux","Propos irrespectueux"],
  ["faux","Fausse annonce ou usurpation"],
  ["autre","Autre"]
 ];
 const MAX_MESSAGE_ANNONCE=500;
 const MAX_MESSAGE_REPONSE=300;
 const MAX_DETAIL_SIGNALEMENT=200;
 const MAX_ANNONCES_ACTIVES=5;
 const VERSION_CHARTE=1;
 const MAX_RESULTATS_TOURNOIS=20;
 const MAX_ANNONCES_AFFICHEES=100;
 // Colonnes lisibles après S2 bis (s2-39, s2-40) : surtout pas user_id ni "*", refusés par la base
 const COLONNES_ANNONCE="id,tournoi_id,tournoi_nom,tournoi_date_debut,tournoi_date_fin,tournoi_ville,tournoi_dep,tournoi_categorie,pseudo,niveau_declare,classement_p,cote,sexe,message,statut,masquee,nb_signalements,created_at";
 const COLONNES_REPONSE="id,annonce_id,pseudo,message,statut,message_retour,created_at";

 // Codes d'erreur levés par les fonctions et triggers SQL -> messages lisibles
 const ERREURS_SQL={
  NON_CONNECTE:"Tu n'es pas connecté.",
  CHARTE_REQUISE:"Confirme que tu as 15 ans ou plus et accepte la charte avant de continuer.",
  PSEUDO_REQUIS:"Choisis d'abord un pseudo valide dans ton compte.",
  TOURNOI_INCONNU:"Ce tournoi n'est pas encore connu du site. Réessaie après la prochaine mise à jour des tournois.",
  TEXTE_TOURNOI_INCORRECT:"Les informations de ce tournoi sont refusées par le site. Réessaie après la prochaine mise à jour des tournois.",
  TOURNOI_PASSE:"Ce tournoi est déjà passé.",
  LIMITE_ANNONCES:"Tu as déjà "+MAX_ANNONCES_ACTIVES+" annonces actives. Supprime-en une pour en publier une autre.",
  ANNONCE_INDISPONIBLE:"Cette annonce n'est plus disponible.",
  ANNONCE_PROPRE:"C'est ta propre annonce.",
  ANNONCE_INTROUVABLE:"Cette annonce n'existe plus.",
  ANNONCE_COMPLETE:"Cette annonce est déjà complète.",
  ANNONCE_MASQUEE:"Cette annonce est masquée.",
  DEJA_SIGNALE:"Tu as déjà signalé cette annonce.",
  REPONSE_INTROUVABLE:"Cette réponse n'existe plus.",
  DEJA_TRAITEE:"Cette réponse a déjà été traitée.",
  INTERDIT:"Action non autorisée.",
  MESSAGE_TROP_LONG:"Le message est trop long.",
  DETAIL_TROP_LONG:"Le détail est trop long.",
  MOTIF_INVALIDE:"Motif de signalement invalide.",
  ACTION_INVALIDE:"Action invalide.",
  LIMITE_SIGNALEMENTS:"Tu as atteint la limite de 10 signalements par 24 h. Réessaie demain."
 };

 /* ---------- Utilitaires ---------- */
 function el(balise,classe,texte){
  const noeud=document.createElement(balise);
  if(classe) noeud.className=classe;
  if(texte!==undefined&&texte!==null) noeud.textContent=texte;
  return noeud;
 }
 function afficher(element,texte,etat){
  if(!element) return;
  element.hidden=!texte;
  element.textContent=texte||"";
  element.classList.remove("acc-ok","acc-err");
  if(etat) element.classList.add(etat==="ok"?"acc-ok":"acc-err");
 }
 function aujourdhui(){
  const d=new Date();
  return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
 }
 function formaterDate(iso){
  if(!iso) return "";
  const p=String(iso).slice(0,10).split("-").map(Number);
  if(p.length!==3||p.some(isNaN)) return String(iso);
  return new Date(p[0],p[1]-1,p[2]).toLocaleDateString("fr-FR",{day:"numeric",month:"short",year:"numeric"});
 }
 function normaliser(texte){
  return String(texte||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase();
 }
 function libelleNiveau(n){ return n&&NIVEAUX[n-1]?NIVEAUX[n-1]:""; }

 // Filtre de coordonnées v3 (S2 bis) : copie exacte, au caractère près, de la référence filtreJs de
 // scripts/verifier-securite-sql.cjs (renommée contientContact), identique dans communaute-tournoi.js et partenaires.js ;
 // même résultat que la fonction SQL message_sans_contact (s2-24 et s2-25). Chiffres non latins ramenés à 0-9,
 // réseaux espacés ou abrégés, catégories (P250, +45) et vraies dates ou heures retirées avant de compter les chiffres :
 // 9 chiffres ou plus, même entrecoupés de lettres, = un numéro. Ne pas modifier ici seul : changer la référence et le SQL.
 const PA_DATE_HEURE = /(?<![\p{L}\p{N}])(?<![0-9]([^\p{L}\p{N}]*[0-9]){2}[^\p{L}\p{N}]*)(((0?[1-9]|[12][0-9]|3[01])[\/.-](0?[1-9]|1[0-2])[\/.-](20)?2[4-9]|202[4-9]-(0?[1-9]|1[0-2])-(0?[1-9]|[12][0-9]|3[01])|(0[1-9]|[12][0-9]|3[01])(0[1-9]|1[0-2])(20)?2[4-9])([^\p{L}\p{N}]+((à|a|de|dès|des|vers)[^\p{L}\p{N}]+)?([01]?[0-9]|2[0-3])(:[0-5][0-9]|h([0-5][0-9])?)([^\p{L}\p{N}]*([-–\/]|à)[^\p{L}\p{N}]*([01]?[0-9]|2[0-3])(:[0-5][0-9]|h([0-5][0-9])?)?)?)?(?![\p{L}\p{N}])|(((0?[1-9]|[12][0-9]|3[01])\/(0?[1-9]|1[0-2]))([^\p{L}\p{N}]+((à|a|de|dès|des|vers)[^\p{L}\p{N}]+)?([01]?[0-9]|2[0-3])(:[0-5][0-9]|h([0-5][0-9])?)([^\p{L}\p{N}]*([-–\/]|à)[^\p{L}\p{N}]*([01]?[0-9]|2[0-3])(:[0-5][0-9]|h([0-5][0-9])?)?)?)?|([01]?[0-9]|2[0-3])(:[0-5][0-9]|h([0-5][0-9])?)([^\p{L}\p{N}]*([-–\/]|à)[^\p{L}\p{N}]*([01]?[0-9]|2[0-3])(:[0-5][0-9]|h([0-5][0-9])?)?)?)(?![\p{L}\p{N}])(?![^\p{L}\p{N}]*[0-9]))/gu;
 const PA_CATEGORIE = /(?<![\p{L}\p{N}])(p[^\p{L}\p{N}]?(25|50|100|250|500|1000|1500|2000|3000)[hdfmx]?|[+][^\p{L}\p{N}]*(35|45|55|60|65)|[1-4]v[1-4])(?![0-9])|^(100|250|500|1000|2000|3000)(?![0-9])/gu;
 const PA_CHIFFRES_ZEROS = [0x660, 0x6F0, 0x7C0, 0x966, 0x9E6, 0xA66, 0xAE6, 0xB66, 0xBE6, 0xC66, 0xCE6, 0xD66, 0xDE6, 0xE50, 0xED0, 0xF20, 0x1040, 0x1090, 0x17E0, 0x1810, 0x1946, 0x19D0, 0x1A80, 0x1A90, 0x1B50, 0x1BB0, 0x1C40, 0x1C50, 0xA620, 0xA8D0, 0xA900, 0xA9D0, 0xA9F0, 0xAA50, 0xABF0, 0x104A0, 0x10D30, 0x10D40, 0x11066, 0x110F0, 0x11136, 0x111D0, 0x112F0, 0x11450, 0x114D0, 0x11650, 0x116C0, 0x116D0, 0x116DA, 0x11730, 0x118E0, 0x11950, 0x11BF0, 0x11C50, 0x11D50, 0x11DA0, 0x11DE0, 0x11F50, 0x16130, 0x16A60, 0x16AC0, 0x16B50, 0x16D70, 0x1E140, 0x1E2F0, 0x1E4F0, 0x1E5F1, 0x1E950];
 const PA_CHIFFRES = new Map(PA_CHIFFRES_ZEROS.flatMap(z => [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => [String.fromCodePoint(z + i), String(i)])));
 function contientContact(texte) {
   let t = String(texte || '').normalize('NFKC').toLowerCase().replace(/[\u00ad\u200b-\u200f\u2060\ufeff]/gu, '');
   t = Array.from(t, c => PA_CHIFFRES.get(c) || c).join('');
   if (t.indexOf('@') >= 0 || /(arobase|\[at\]|\(at\))/u.test(t)) return true;
   if (/(https?:|www\.)/u.test(t) || /\.(fr|com|net|org|eu|io|be|ch|me|gg|ly|ee|co|app|info|link)(?![\p{L}\p{N}_])/u.test(t) ||
     /(?<![\p{L}\p{N}_])(point|dot)\s*(com|fr|net)(?![\p{L}\p{N}_])/u.test(t) || /(?<![\p{L}\p{N}_])(t|wa)[^\p{L}\p{N}]+me(?![\p{L}\p{N}_])/u.test(t)) return true;
   const j = t.replace(/(?<![\p{L}\p{N}])(\p{L})[^\p{L}\p{N}]+(?=\p{L}(?![\p{L}\p{N}]))/gu, '$1');
   if (/(?<![\p{L}\p{N}_])(gmail|hotmail|outlook|yahoo|icloud|whatsapp|wtsp|telegram|snapchat|snap|instagram|insta|ig|facebook|fb|messenger|tiktok|discord|signal)(?![\p{L}\p{N}_])/u.test(j)) return true;
   if (/(whatsapp|instagram|snapchat|telegram|tiktok)/u.test(t.replace(/[^\p{L}]/gu, ''))) return true;
   t = t.replace(PA_CATEGORIE, ' ').replace(PA_DATE_HEURE, ' ');
   if (/[0-9]{9,}/u.test(t.replace(/[^\p{L}\p{N}]/gu, ''))) return true;
   return (t.match(/[0-9]+(?:[^0-9]{1,4}[0-9]+)*/gu) || []).some(m => m.replace(/[^0-9]/gu, '').length >= 9);
 }

 // Transforme une erreur Supabase en phrase lisible
 function traduireErreur(erreur,defaut){
  const brut=String((erreur&&erreur.message)||"");
  const bas=brut.toLowerCase();
  for(const code in ERREURS_SQL){ if(brut.indexOf(code)>=0) return ERREURS_SQL[code]; }
  if(bas.indexOf("failed to fetch")>=0||bas.indexOf("network")>=0) return "Connexion impossible : vérifie ton réseau puis réessaie.";
  // Contraintes de filtre : message de l'annonce ou textes du tournoi recopiés dans l'annonce (S2)
  if(bas.indexOf("annonces_message_sans_contact")>=0||bas.indexOf("annonces_tournoi_sans_contact")>=0) return "Ton message contient un e-mail, un numéro, un lien ou une messagerie. Retire-le : les contacts se partagent en privé.";
  if(bas.indexOf("annonces_unique_idx")>=0) return "Tu as déjà une annonce pour cette épreuve de ce tournoi.";
  if(bas.indexOf("duplicate key")>=0&&bas.indexOf("reponses")>=0) return "Tu as déjà répondu à cette annonce.";
  const code=erreur&&erreur.code;
  if(code==="42P01"||code==="PGRST205"||code==="42501"||bas.indexOf("does not exist")>=0||bas.indexOf("permission denied")>=0||bas.indexOf("schema cache")>=0)
   return "Cette fonction n'est pas encore activée sur le site. Réessaie plus tard.";
  return defaut||"Une erreur est survenue. Réessaie dans un instant.";
 }

 /* ---------- Accès aux données (jamais d'exception : { ok, data, message }) ---------- */
 function client(){ return window.PA_COMPTE&&window.PA_COMPTE.client||null; }
 function idUtilisateur(){ return window.PA_COMPTE&&window.PA_COMPTE.user?window.PA_COMPTE.user.id:null; }
 async function appeler(fabrique,defaut){
  const c=client();
  if(!c||!idUtilisateur()) return {ok:false,message:"Tu n'es pas connecté."};
  try{
   const {data,error}=await fabrique(c);
   if(error) return {ok:false,message:traduireErreur(error,defaut)};
   return {ok:true,data:data};
  }catch(e){ return {ok:false,message:traduireErreur(e,defaut)}; }
 }
 // Fonction SQL absente (S2 bis pas encore exécuté) : PostgREST répond PGRST202 (statut 404)
 function fonctionIntrouvable(erreur,statut){
  const code=erreur&&erreur.code;
  return code==="PGRST202"||code==="42883"||statut===404;
 }
 // Fonctions déjà constatées absentes : on ne les redemande pas à chaque rafraîchissement (une seule 404 par page)
 const fonctionsAbsentes=new Set();
 // Appelle la fonction SQL nom() ; si elle n'existe pas encore, utilise l'ancienne requête (repli)
 async function appelerFonction(nom,repli,defaut){
  const c=client();
  if(!c||!idUtilisateur()) return {ok:false,message:"Tu n'es pas connecté."};
  if(!fonctionsAbsentes.has(nom)){
   try{
    const {data,error,status}=await c.rpc(nom);
    if(!error) return {ok:true,data:Array.isArray(data)?data:[]};
    if(!fonctionIntrouvable(error,status)) return {ok:false,message:traduireErreur(error,defaut)};
   }catch(e){
    if(!fonctionIntrouvable(e,e&&e.status)) return {ok:false,message:traduireErreur(e,defaut)};
   }
   fonctionsAbsentes.add(nom);
  }
  return appeler(repli,defaut);
 }
 const api={
  annonces(tournoiId){
   return appeler(c=>{
    let requete=c.from("annonces").select(COLONNES_ANNONCE).eq("masquee",false).gte("tournoi_date_fin",aujourdhui());
    if(tournoiId) requete=requete.eq("tournoi_id",tournoiId);
    return requete.order("tournoi_date_debut",{ascending:true}).limit(MAX_ANNONCES_AFFICHEES);
   },"Impossible de charger les annonces.");
  },
  // Mes annonces : fonction mes_annonces() (S2 bis), repli sur l'ancienne lecture filtrée sur user_id
  mesAnnonces(){
   return appelerFonction("mes_annonces",c=>c.from("annonces").select(COLONNES_ANNONCE).eq("user_id",idUtilisateur()).order("created_at",{ascending:false}),"Impossible de charger tes annonces.");
  },
  annoncesParIds(ids){
   return appeler(c=>c.from("annonces").select(COLONNES_ANNONCE).in("id",ids),"Impossible de charger les annonces.");
  },
  reponsesSurAnnonces(ids){
   return appeler(c=>c.from("reponses").select(COLONNES_REPONSE).in("annonce_id",ids).order("created_at",{ascending:true}),"Impossible de charger les réponses.");
  },
  // Mes réponses : fonction mes_reponses() (S2 bis), même repli
  mesReponses(){
   return appelerFonction("mes_reponses",c=>c.from("reponses").select(COLONNES_REPONSE).eq("user_id",idUtilisateur()).order("created_at",{ascending:false}),"Impossible de charger tes réponses.");
  },
  mesSignalements(){
   return appeler(c=>c.from("signalements").select("annonce_id").eq("user_id",idUtilisateur()),"Impossible de charger tes signalements.");
  },
  creerAnnonce(champs){
   return appeler(c=>c.from("annonces").insert(Object.assign({user_id:idUtilisateur()},champs)).select(COLONNES_ANNONCE).single(),"Impossible de publier l'annonce.");
  },
  supprimerAnnonce(id){
   return appeler(c=>c.from("annonces").delete().eq("id",id),"Impossible de supprimer l'annonce.");
  },
  creerReponse(annonceId,message){
   return appeler(c=>c.from("reponses").insert({annonce_id:annonceId,user_id:idUtilisateur(),message:message}).select(COLONNES_REPONSE).single(),"Impossible d'envoyer ta réponse.");
  },
  supprimerReponse(id){
   return appeler(c=>c.from("reponses").delete().eq("id",id),"Impossible de retirer ta réponse.");
  },
  decider(reponseId,accepter,message){
   return appeler(c=>c.rpc("repondre_decision",{p_reponse:reponseId,p_accepter:accepter,p_message:message||null}),"Impossible d'enregistrer ta décision.");
  },
  signaler(annonceId,motif,detail){
   return appeler(c=>c.rpc("signaler_annonce",{p_annonce:annonceId,p_motif:motif,p_detail:detail||null}),"Impossible d'envoyer le signalement.");
  },
  accepterCharte(){
   return appeler(c=>c.rpc("accepter_charte",{p_version:VERSION_CHARTE}),"Impossible d'enregistrer ton acceptation.");
  },
  annoncesSignalees(){
   return appeler(c=>c.from("annonces").select(COLONNES_ANNONCE).or("masquee.eq.true,nb_signalements.gt.0").order("created_at",{ascending:false}).limit(100),"Impossible de charger les annonces signalées.");
  },
  signalementsDe(ids){
   return appeler(c=>c.from("signalements").select("*").in("annonce_id",ids).order("created_at",{ascending:true}),"Impossible de charger les signalements.");
  },
  moderer(annonceId,action){
   return appeler(c=>c.rpc("admin_moderer",{p_annonce:annonceId,p_action:action}),"Action de modération impossible.");
  }
 };

 /* ---------- Éléments d'interface réutilisables ---------- */
 // Bouton à deux temps (remplace confirm()) : 1er clic = demande, 2e clic = action
 function boutonAvecConfirmation(libelle,libelleConfirmation,classe,action){
  const conteneur=el("span","pt-confirm");
  const demander=el("button",classe||"btn ghost",libelle);demander.type="button";
  const confirmer=el("button","btn danger",libelleConfirmation);confirmer.type="button";confirmer.hidden=true;
  const annuler=el("button","btn ghost","Annuler");annuler.type="button";annuler.hidden=true;
  function basculer(actif){ demander.hidden=actif;confirmer.hidden=!actif;annuler.hidden=!actif;if(actif) confirmer.focus(); else demander.focus(); }
  demander.addEventListener("click",()=>basculer(true));
  annuler.addEventListener("click",()=>basculer(false));
  confirmer.addEventListener("click",async()=>{
   confirmer.disabled=true;
   await action();
   confirmer.disabled=false;
   if(confirmer.isConnected) basculer(false);
  });
  conteneur.append(demander,confirmer,annuler);
  return conteneur;
 }
 function creerBadge(texte,variante){ return el("span","pt-badge"+(variante?" pt-"+variante:""),texte); }

 // Bloc des deux cases (15 ans + charte), affiché seulement si le consentement n'est pas déjà enregistré
 function creerBlocConsentement(profil){
  const dejaAccepte=!!(profil&&profil.age_confirme_at&&profil.charte_acceptee_at);
  const element=el("div","pt-consent");
  element.hidden=dejaAccepte;
  const caseAge=document.createElement("input");caseAge.type="checkbox";
  const caseCharte=document.createElement("input");caseCharte.type="checkbox";
  const ligneAge=el("label","pt-check");ligneAge.append(caseAge,el("span",null,"J'ai 15 ans ou plus."));
  const ligneCharte=el("label","pt-check");
  const texteCharte=el("span",null,"J'ai lu et j'accepte la ");
  const lien=el("a",null,"charte");lien.href="#charte";
  texteCharte.append(lien,document.createTextNode(" (respect, pas de contact public, pas de contenu commercial)."));
  ligneCharte.append(caseCharte,texteCharte);
  element.append(ligneAge,ligneCharte);
  return {
   element:element,
   necessaire:!dejaAccepte,
   valide:()=>dejaAccepte||(caseAge.checked&&caseCharte.checked)
  };
 }

 // Carte d'annonce. options : { mesAnnonces (Set des identifiants de MES annonces), dejaRepondu, dejaSignale, profil,
 // apresAction, mode }. user_id n'est plus lisible (S2 bis) : « Ton annonce » = identifiant présent dans mes_annonces().
 function creerCarteAnnonce(annonce,options){
  const carte=el("article","pt-carte");
  const terminee=annonce.tournoi_date_fin<aujourdhui();
  const estMienne=!!(options.mesAnnonces&&options.mesAnnonces.has(annonce.id));
  const entete=el("div","pt-carte-tete");
  entete.appendChild(el("h3",null,annonce.tournoi_nom));
  const badges=el("div","pt-badges");
  if(annonce.statut==="complete") badges.appendChild(creerBadge("Complète","ok"));
  if(annonce.masquee) badges.appendChild(creerBadge("Masquée","err"));
  if(terminee) badges.appendChild(creerBadge("Terminée",""));
  if(estMienne) badges.appendChild(creerBadge("Ton annonce","sand"));
  entete.appendChild(badges);
  carte.appendChild(entete);

  const lieu=[annonce.tournoi_ville,annonce.tournoi_dep?"("+annonce.tournoi_dep+")":""].filter(Boolean).join(" ");
  const meta=[formaterDate(annonce.tournoi_date_debut),lieu,annonce.tournoi_categorie].filter(Boolean).join(" · ");
  carte.appendChild(el("p","pt-meta",meta));

  const profil=el("ul","pt-profil");
  [annonce.pseudo,libelleNiveau(annonce.niveau_declare),annonce.classement_p,LIBELLE_COTE[annonce.cote]||"",LIBELLE_SEXE[annonce.sexe]||""]
   .filter(Boolean).forEach((t,i)=>profil.appendChild(el("li",i===0?"pt-pseudo":null,t)));
  carte.appendChild(profil);
  if(annonce.message) carte.appendChild(el("p","pt-message",annonce.message));

  if(options.mode==="admin") return carte;
  if(estMienne||terminee) return carte;

  // Actions : répondre / signaler
  const actions=el("div","pt-actions");
  const zoneFormulaire=el("div","pt-inline");zoneFormulaire.hidden=true;
  if(annonce.statut==="active"){
   if(options.dejaRepondu){
    actions.appendChild(creerBadge("Tu as répondu","ok"));
   }else{
    const bRepondre=el("button","btn primary","Ça m'intéresse");bRepondre.type="button";
    bRepondre.addEventListener("click",()=>{
     if(!zoneFormulaire.hidden&&zoneFormulaire.dataset.type==="reponse"){zoneFormulaire.hidden=true;return;}
     zoneFormulaire.textContent="";zoneFormulaire.dataset.type="reponse";zoneFormulaire.hidden=false;
     zoneFormulaire.appendChild(creerFormulaireReponse(annonce,options));
     zoneFormulaire.querySelector("textarea").focus();
    });
    actions.appendChild(bRepondre);
   }
  }
  if(options.dejaSignale){
   actions.appendChild(creerBadge("Signalée",""));
  }else{
   const bSignaler=el("button","btn ghost","Signaler");bSignaler.type="button";
   bSignaler.addEventListener("click",()=>{
    if(!zoneFormulaire.hidden&&zoneFormulaire.dataset.type==="signalement"){zoneFormulaire.hidden=true;return;}
    zoneFormulaire.textContent="";zoneFormulaire.dataset.type="signalement";zoneFormulaire.hidden=false;
    zoneFormulaire.appendChild(creerFormulaireSignalement(annonce,options));
    zoneFormulaire.querySelector("select").focus();
   });
   actions.appendChild(bSignaler);
  }
  carte.append(actions,zoneFormulaire);
  return carte;
 }

 function creerFormulaireReponse(annonce,options){
  const form=el("form","acc-form pt-form");form.noValidate=true;
  const etiquette=el("label",null,"Ton message pour "+annonce.pseudo);
  const zone=document.createElement("textarea");
  zone.maxLength=MAX_MESSAGE_REPONSE;zone.rows=3;
  zone.id="rep-"+annonce.id;etiquette.htmlFor=zone.id;
  const aide=el("p","pt-aide","Seul l'auteur de l'annonce lira ce message. Tu peux y mettre un moyen de te joindre si tu le souhaites.");
  const consentement=creerBlocConsentement(options.profil);
  const bouton=el("button","btn primary","Envoyer");bouton.type="submit";
  const message=el("p","acc-msg");message.hidden=true;message.setAttribute("role","status");
  form.append(etiquette,zone,aide,consentement.element,bouton,message);
  form.addEventListener("submit",async e=>{
   e.preventDefault();
   const texte=zone.value.trim();
   if(!texte){afficher(message,"Écris un court message.","err");return;}
   if(!options.profil||!options.profil.pseudo){afficher(message,"Ajoute d'abord un pseudo dans Mon compte.","err");return;}
   if(!consentement.valide()){afficher(message,"Coche les deux cases pour continuer.","err");return;}
   bouton.disabled=true;afficher(message,"Envoi…","");
   if(consentement.necessaire){
    const consent=await api.accepterCharte();
    if(!consent.ok){bouton.disabled=false;afficher(message,consent.message,"err");return;}
    options.profil.age_confirme_at=options.profil.charte_acceptee_at=new Date().toISOString();
   }
   const resultat=await api.creerReponse(annonce.id,texte);
   bouton.disabled=false;
   if(!resultat.ok){afficher(message,resultat.message,"err");return;}
   afficher(message,"Réponse envoyée. Tu verras la décision dans Mon compte.","ok");
   if(options.apresAction) options.apresAction("Réponse envoyée à "+annonce.pseudo+". Tu verras sa décision dans Mon compte.");
  });
  return form;
 }

 function creerFormulaireSignalement(annonce,options){
  const form=el("form","acc-form pt-form");form.noValidate=true;
  const etiquetteMotif=el("label",null,"Motif du signalement");
  const motif=document.createElement("select");motif.id="sig-motif-"+annonce.id;etiquetteMotif.htmlFor=motif.id;
  MOTIFS.forEach(m=>{const o=document.createElement("option");o.value=m[0];o.textContent=m[1];motif.appendChild(o);});
  const etiquetteDetail=el("label",null,"Précision (facultatif)");
  const detail=document.createElement("input");detail.type="text";detail.maxLength=MAX_DETAIL_SIGNALEMENT;detail.id="sig-detail-"+annonce.id;etiquetteDetail.htmlFor=detail.id;
  const bouton=el("button","btn danger","Envoyer le signalement");bouton.type="submit";
  const message=el("p","acc-msg");message.hidden=true;message.setAttribute("role","status");
  form.append(etiquetteMotif,motif,etiquetteDetail,detail,bouton,message);
  form.addEventListener("submit",async e=>{
   e.preventDefault();
   bouton.disabled=true;afficher(message,"Envoi…","");
   const resultat=await api.signaler(annonce.id,motif.value,detail.value.trim());
   bouton.disabled=false;
   if(!resultat.ok){afficher(message,resultat.message,"err");return;}
   afficher(message,"Merci, ton signalement est transmis.","ok");
   if(options.apresAction) options.apresAction("Merci, ton signalement est transmis.");
  });
  return form;
 }

 /* ---------- Section « Mes annonces et réponses » (compte.html) ---------- */
 const libelleStatutReponse={en_attente:"En attente",acceptee:"Acceptée",refusee:"Refusée"};
 const classeStatutReponse={en_attente:"sand",acceptee:"ok",refusee:"err"};

 async function rendreMesAnnonces(zone){
  if(!zone) return;
  zone.textContent="";
  if(!idUtilisateur()||!client()){return;}
  zone.appendChild(el("p","acc-muted","Chargement…"));
  const [annonces,mesReponses]=await Promise.all([api.mesAnnonces(),api.mesReponses()]);
  zone.textContent="";
  const retour=el("p","acc-msg");retour.hidden=true;retour.setAttribute("role","status");
  const rafraichir=()=>rendreMesAnnonces(zone);

  // --- Mes annonces ---
  zone.appendChild(el("h4","pt-sous-titre","Mes annonces"));
  if(!annonces.ok){zone.appendChild(el("p","acc-msg acc-err",annonces.message));}
  else if(!annonces.data.length){
   const vide=el("p","acc-muted","Tu n'as publié aucune annonce. ");
   const lien=el("a",null,"Trouver un partenaire pour un tournoi");lien.href="partenaires.html";
   vide.appendChild(lien);zone.appendChild(vide);
  }else{
   const mesIds=new Set(annonces.data.map(a=>a.id));
   const reponsesRecues=await api.reponsesSurAnnonces(annonces.data.map(a=>a.id));
   if(!reponsesRecues.ok) zone.appendChild(el("p","acc-msg acc-err",reponsesRecues.message));
   const parAnnonce={};
   (reponsesRecues.ok?reponsesRecues.data:[]).forEach(r=>{(parAnnonce[r.annonce_id]=parAnnonce[r.annonce_id]||[]).push(r);});
   annonces.data.forEach(a=>{
    const carte=creerCarteAnnonce(a,{mesAnnonces:mesIds,mode:"admin"});
    carte.classList.add("pt-carte-gestion");
    const recues=parAnnonce[a.id]||[];
    if(recues.length){
     const liste=el("div","pt-reponses");
     liste.appendChild(el("p","pt-sous-titre-petit","Réponses reçues ("+recues.length+")"));
     recues.forEach(r=>liste.appendChild(creerLigneReponseRecue(r,a,retour,rafraichir)));
     carte.appendChild(liste);
    }else if(a.statut==="active"&&!a.masquee){
     carte.appendChild(el("p","pt-aide","Pas encore de réponse."));
    }
    const actions=el("div","pt-actions");
    actions.appendChild(boutonAvecConfirmation("Supprimer l'annonce","Oui, supprimer","btn ghost",async()=>{
     const r=await api.supprimerAnnonce(a.id);
     if(!r.ok) afficher(retour,r.message,"err"); else {await rafraichir();}
    }));
    carte.appendChild(actions);
    zone.appendChild(carte);
   });
  }

  // --- Mes réponses ---
  zone.appendChild(el("h4","pt-sous-titre","Mes réponses"));
  if(!mesReponses.ok){zone.appendChild(el("p","acc-msg acc-err",mesReponses.message));}
  else if(!mesReponses.data.length){zone.appendChild(el("p","acc-muted","Tu n'as répondu à aucune annonce pour l'instant."));}
  else{
   const infos=await api.annoncesParIds(mesReponses.data.map(r=>r.annonce_id));
   const index={};
   (infos.ok?infos.data:[]).forEach(a=>{index[a.id]=a;});
   mesReponses.data.forEach(r=>{
    const a=index[r.annonce_id];
    const carte=el("article","pt-carte pt-carte-gestion");
    const tete=el("div","pt-carte-tete");
    tete.appendChild(el("h3",null,a?a.tournoi_nom:"Annonce plus disponible"));
    const badges=el("div","pt-badges");badges.appendChild(creerBadge(libelleStatutReponse[r.statut]||r.statut,classeStatutReponse[r.statut]));
    tete.appendChild(badges);carte.appendChild(tete);
    if(a) carte.appendChild(el("p","pt-meta",[formaterDate(a.tournoi_date_debut),a.tournoi_ville,"annonce de "+a.pseudo].filter(Boolean).join(" · ")));
    carte.appendChild(el("p","pt-message","Ton message : "+r.message));
    if(r.message_retour) carte.appendChild(el("p","pt-retour","Réponse de "+(a?a.pseudo:"l'auteur")+" : "+r.message_retour));
    if(r.statut==="acceptee"&&!r.message_retour) carte.appendChild(el("p","pt-aide","L'auteur a accepté sans ajouter de message."));
    const actions=el("div","pt-actions");
    actions.appendChild(boutonAvecConfirmation("Retirer ma réponse","Oui, retirer","btn ghost",async()=>{
     const res=await api.supprimerReponse(r.id);
     if(!res.ok) afficher(retour,res.message,"err"); else {await rafraichir();}
    }));
    carte.appendChild(actions);
    zone.appendChild(carte);
   });
  }
  zone.appendChild(retour);
 }

 // Ligne d'une réponse reçue : message, statut, et boutons accepter / refuser si elle est en attente
 function creerLigneReponseRecue(reponse,annonce,zoneRetour,rafraichir){
  const ligne=el("div","pt-reponse");
  const tete=el("div","pt-carte-tete");
  tete.appendChild(el("b",null,reponse.pseudo));
  const badges=el("div","pt-badges");badges.appendChild(creerBadge(libelleStatutReponse[reponse.statut]||reponse.statut,classeStatutReponse[reponse.statut]));
  tete.appendChild(badges);
  ligne.append(tete,el("p","pt-message",reponse.message));
  if(reponse.message_retour) ligne.appendChild(el("p","pt-retour","Ton message : "+reponse.message_retour));
  if(reponse.statut==="en_attente"&&annonce.statut==="active"&&!annonce.masquee){
   const form=el("form","acc-form pt-form");form.noValidate=true;
   const id="ret-"+reponse.id;
   const etiquette=el("label",null,"Un mot pour "+reponse.pseudo+" (facultatif, tu peux y mettre ton contact)");etiquette.htmlFor=id;
   const champ=document.createElement("input");champ.type="text";champ.id=id;champ.maxLength=MAX_MESSAGE_REPONSE;
   const boutons=el("div","btns");
   const accepter=el("button","btn primary","Accepter");accepter.type="button";
   const refuser=el("button","btn ghost","Refuser");refuser.type="button";
   boutons.append(accepter,refuser);
   form.append(etiquette,champ,boutons);
   async function decider(accepte){
    accepter.disabled=refuser.disabled=true;
    const r=await api.decider(reponse.id,accepte,champ.value.trim());
    accepter.disabled=refuser.disabled=false;
    if(!r.ok){afficher(zoneRetour,r.message,"err");return;}
    await rafraichir();
   }
   accepter.addEventListener("click",()=>decider(true));
   refuser.addEventListener("click",()=>decider(false));
   form.addEventListener("submit",e=>e.preventDefault());
   ligne.appendChild(form);
  }
  return ligne;
 }

 window.PA_PARTENAIRES={rendreMesAnnonces:rendreMesAnnonces,contientContact:contientContact};

 /* ====================================================================
    PAGE partenaires.html
    ==================================================================== */
 const racine=document.getElementById("pt-app");
 if(!racine) return; // autre page : seule l'API ci-dessus est exposée

 const compte=window.PA_COMPTE;
 const zoneEtat=document.getElementById("pt-etat");
 const blocConnexion=document.getElementById("pt-connexion");
 const messageGlobal=document.getElementById("pt-msg");
 const champRecherche=document.getElementById("pt-recherche");
 const listeResultats=document.getElementById("pt-resultats");
 const blocSelection=document.getElementById("pt-selection");
 const titreAnnonces=document.getElementById("pt-titre-annonces");
 const filtreSexe=document.getElementById("pt-filtre-sexe");
 const listeAnnonces=document.getElementById("pt-annonces");
 const blocFormulaire=document.getElementById("pt-publier");
 const formulaire=document.getElementById("pt-form");
 const champSexe=document.getElementById("pt-sexe");
 const champCote=document.getElementById("pt-cote");
 const champMessage=document.getElementById("pt-texte");
 const compteurMessage=document.getElementById("pt-compteur");
 const alerteContact=document.getElementById("pt-alerte-contact");
 const zoneConsentement=document.getElementById("pt-consent-zone");
 const boutonPublier=document.getElementById("pt-publier-btn");
 const messageForm=document.getElementById("pt-form-msg");
 const blocAdmin=document.getElementById("pt-admin");
 const listeAdmin=document.getElementById("pt-admin-liste");
 const messageAdmin=document.getElementById("pt-admin-msg");

 const etat={profil:null,mesAnnonces:new Set(),tournois:null,indexTournois:{},tournoiChoisi:null,tournoiIdUrl:null,consentement:null,demarre:false};

 function montrerEtat(texte,etatMsg){ afficher(zoneEtat,texte,etatMsg); }

 // --- Comptes inactifs ou visiteur non connecté : la page n'est qu'une explication ---
 if(!compte||!compte.actif){
  const raison=compte?compte.raisonInactif:"config";
  let texte="Les comptes ne sont pas encore activés : cette fonction sera disponible dès qu'ils le seront. Le reste du site fonctionne normalement.";
  if(raison==="file") texte="Ouvre le site en ligne pour utiliser cette fonction : les comptes ne fonctionnent pas quand la page est ouverte depuis un fichier.";
  if(raison==="cdn") texte="Le service de comptes ne répond pas pour le moment. Vérifie ta connexion puis recharge la page.";
  montrerEtat(texte,"");
  return;
 }

 /* ---------- Tournois (recherche) ---------- */
 function chargerScript(url){
  return new Promise((resolve,reject)=>{
   const s=document.createElement("script");s.src=url;s.onload=resolve;s.onerror=reject;document.head.appendChild(s);
  });
 }
 async function chargerTournois(){
  let donnees=null;
  try{
   const reponse=await fetch("assets/data/tournois.json",{cache:"no-cache"});
   if(!reponse.ok) throw new Error(reponse.status);
   donnees=await reponse.json();
  }catch(e){
   try{ await chargerScript("assets/data/tournois.js"); donnees=window.TOURNOIS_DATA||null; }catch(e2){ donnees=null; }
  }
  const liste=donnees&&Array.isArray(donnees.tournois)?donnees.tournois:[];
  const aujourdhuiIso=aujourdhui();
  etat.tournois=liste.filter(t=>t&&t.id&&(t.date_fin||t.date_debut)>=aujourdhuiIso).map(t=>{
   t.id=String(t.id);
   t._cle=normaliser([t.nom,t.club,t.ville,t.cp,t.dep?"dep "+t.dep:""].join(" "));
   return t;
  }).sort((a,b)=>String(a.date_debut).localeCompare(String(b.date_debut)));
  etat.tournois.forEach(t=>{etat.indexTournois[t.id]=t;});
  return etat.tournois.length>0;
 }
 function descriptionTournoi(t){
  const lieu=[t.ville,t.dep?"("+t.dep+")":""].filter(Boolean).join(" ");
  return [t.nom,lieu,formaterDate(t.date_debut)+(t.date_fin&&t.date_fin!==t.date_debut?" au "+formaterDate(t.date_fin):""),t.categorie&&t.categorie!==t.nom?t.categorie:""].filter(Boolean).join(" · ");
 }
 function rechercherTournois(texte){
  const mots=normaliser(texte).split(/\s+/).filter(Boolean);
  if(!mots.length||!etat.tournois) return [];
  return etat.tournois.filter(t=>mots.every(m=>t._cle.indexOf(m)>=0)).slice(0,MAX_RESULTATS_TOURNOIS);
 }
 function afficherResultats(){
  listeResultats.textContent="";
  const texte=champRecherche.value.trim();
  if(texte.length<2){listeResultats.hidden=true;return;}
  const trouves=rechercherTournois(texte);
  listeResultats.hidden=false;
  if(!trouves.length){const li=el("li","pt-aucun","Aucun tournoi à venir ne correspond.");listeResultats.appendChild(li);return;}
  trouves.forEach(t=>{
   const li=document.createElement("li");
   const b=el("button",null,descriptionTournoi(t));b.type="button";
   b.addEventListener("click",()=>{choisirTournoi(t);champRecherche.value="";listeResultats.hidden=true;});
   li.appendChild(b);listeResultats.appendChild(li);
  });
 }

 function majUrl(id){
  try{
   const url=new URL(location.href);
   if(id) url.searchParams.set("tournoi",id); else url.searchParams.delete("tournoi");
   history.replaceState(null,"",url.pathname+url.search+url.hash);
  }catch(e){}
 }
 function choisirTournoi(t){
  etat.tournoiChoisi=t;
  majUrl(t?t.id:null);
  afficherSelection();
  preparerFormulaire();
  chargerListe();
 }
 function afficherSelection(){
  blocSelection.textContent="";
  const t=etat.tournoiChoisi;
  blocSelection.hidden=!t;
  if(!t) return;
  blocSelection.appendChild(el("p","pt-choisi-titre","Tournoi choisi"));
  blocSelection.appendChild(el("p","pt-choisi-nom",t._inconnu?"Tournoi n° "+t.id+" (plus dans la liste)":descriptionTournoi(t)));
  const effacer=el("button","btn ghost","Voir toutes les annonces");effacer.type="button";
  effacer.addEventListener("click",()=>choisirTournoi(null));
  blocSelection.appendChild(effacer);
 }

 /* ---------- Liste des annonces ---------- */
 async function chargerListe(message){
  const tournoi=etat.tournoiChoisi;
  titreAnnonces.textContent=tournoi?"Annonces pour ce tournoi":"Annonces à venir";
  listeAnnonces.textContent="";
  listeAnnonces.appendChild(el("p","acc-muted","Chargement…"));
  const [annonces,mesAnnonces,mesReponses,mesSignalements]=await Promise.all([api.annonces(tournoi?tournoi.id:null),api.mesAnnonces(),api.mesReponses(),api.mesSignalements()]);
  listeAnnonces.textContent="";
  if(message) listeAnnonces.appendChild(el("p","acc-msg acc-ok",message));
  if(!annonces.ok){listeAnnonces.appendChild(el("p","acc-msg acc-err",annonces.message));return;}
  const repondues=new Set((mesReponses.ok?mesReponses.data:[]).map(r=>r.annonce_id));
  const signalees=new Set((mesSignalements.ok?mesSignalements.data:[]).map(s=>s.annonce_id));
  etat.mesAnnonces=new Set((mesAnnonces.ok?mesAnnonces.data:[]).map(a=>a.id));
  const sexeFiltre=filtreSexe.value;
  const visibles=annonces.data
   .filter(a=>!sexeFiltre||a.sexe===sexeFiltre)
   .sort((a,b)=>(a.statut==="complete")-(b.statut==="complete"));
  if(!visibles.length){
   listeAnnonces.appendChild(el("p","acc-muted",tournoi
    ?"Aucune annonce pour ce tournoi pour l'instant. Sois le premier ou la première à en publier une."
    :"Aucune annonce à venir pour l'instant. Choisis un tournoi ci-dessus pour publier la première."));
   return;
  }
  const options={
   mesAnnonces:etat.mesAnnonces,profil:etat.profil,
   apresAction:texte=>chargerListe(texte)
  };
  visibles.forEach(a=>{
   listeAnnonces.appendChild(creerCarteAnnonce(a,Object.assign({dejaRepondu:repondues.has(a.id),dejaSignale:signalees.has(a.id)},options)));
  });
 }

 /* ---------- Publication ---------- */
 function preparerFormulaire(){
  const t=etat.tournoiChoisi;
  const possible=!!(t&&!t._inconnu);
  blocFormulaire.hidden=!possible;
  if(!possible) return;
  // Épreuves proposées : celles du tournoi si elles sont connues, sinon les trois
  const proposees=(t.sexes||[]).filter(s=>LIBELLE_SEXE[s]);
  const sexes=proposees.length?proposees:Object.keys(LIBELLE_SEXE);
  champSexe.textContent="";
  sexes.forEach(s=>{const o=document.createElement("option");o.value=s;o.textContent=LIBELLE_SEXE[s];champSexe.appendChild(o);});
  champCote.value=(etat.profil&&etat.profil.cote)||"indifferent";
  afficher(messageForm,"","");
  zoneConsentement.textContent="";
  etat.consentement=creerBlocConsentement(etat.profil);
  zoneConsentement.appendChild(etat.consentement.element);
  const resume=document.getElementById("pt-profil-resume");
  const p=etat.profil||{};
  resume.textContent=p.pseudo
   ?"Ton annonce affichera : "+[p.pseudo,libelleNiveau(p.niveau_declare),p.classement_p].filter(Boolean).join(" · ")+" (repris de ton profil)."
   :"Ajoute d'abord un pseudo dans Mon compte : il est affiché sur l'annonce.";
 }
 function majCompteur(){
  const longueur=champMessage.value.length;
  compteurMessage.textContent=longueur+" / "+MAX_MESSAGE_ANNONCE;
  alerteContact.hidden=!contientContact(champMessage.value);
 }
 champMessage.addEventListener("input",majCompteur);

 formulaire.addEventListener("submit",async e=>{
  e.preventDefault();
  const t=etat.tournoiChoisi;
  if(!t||t._inconnu){afficher(messageForm,"Choisis d'abord un tournoi.","err");return;}
  const texte=champMessage.value.trim();
  if(contientContact(texte)){afficher(messageForm,"Ton message contient un e-mail, un numéro, un lien ou une messagerie. Retire-le : les contacts se partagent en privé, après une réponse.","err");return;}
  if(!etat.profil||!etat.profil.pseudo){afficher(messageForm,"Ajoute d'abord un pseudo dans Mon compte.","err");return;}
  if(!etat.consentement.valide()){afficher(messageForm,"Coche les deux cases (15 ans ou plus, charte) pour publier.","err");return;}
  boutonPublier.disabled=true;afficher(messageForm,"Publication…","");
  if(etat.consentement.necessaire){
   const consent=await api.accepterCharte();
   if(!consent.ok){boutonPublier.disabled=false;afficher(messageForm,consent.message,"err");return;}
   etat.profil.age_confirme_at=etat.profil.charte_acceptee_at=new Date().toISOString();
  }
  const resultat=await api.creerAnnonce({
   tournoi_id:t.id,tournoi_nom:t.nom||("Tournoi "+t.id),
   tournoi_date_debut:t.date_debut||t.date_fin,tournoi_date_fin:t.date_fin||t.date_debut,
   tournoi_ville:t.ville||null,tournoi_dep:t.dep||null,tournoi_categorie:t.categorie||null,
   cote:champCote.value,sexe:champSexe.value,message:texte
  });
  boutonPublier.disabled=false;
  if(!resultat.ok){afficher(messageForm,resultat.message,"err");return;}
  champMessage.value="";majCompteur();
  preparerFormulaire();
  afficher(messageForm,"Annonce publiée. Tu la retrouves dans Mon compte, où tu peux la supprimer à tout moment.","ok");
  chargerListe();
 });

 /* ---------- Vue admin ---------- */
 async function chargerAdmin(){
  if(!blocAdmin) return;
  listeAdmin.textContent="";
  listeAdmin.appendChild(el("p","acc-muted","Chargement…"));
  const [annonces,mesAnnonces]=await Promise.all([api.annoncesSignalees(),api.mesAnnonces()]);
  const mesIds=new Set((mesAnnonces.ok?mesAnnonces.data:[]).map(a=>a.id));
  listeAdmin.textContent="";
  if(!annonces.ok){listeAdmin.appendChild(el("p","acc-msg acc-err",annonces.message));return;}
  if(!annonces.data.length){listeAdmin.appendChild(el("p","acc-muted","Aucune annonce signalée ou masquée."));return;}
  const sigs=await api.signalementsDe(annonces.data.map(a=>a.id));
  const parAnnonce={};
  (sigs.ok?sigs.data:[]).forEach(s=>{(parAnnonce[s.annonce_id]=parAnnonce[s.annonce_id]||[]).push(s);});
  if(!sigs.ok) listeAdmin.appendChild(el("p","acc-msg acc-err",sigs.message));
  annonces.data.forEach(a=>{
   const carte=creerCarteAnnonce(a,{mesAnnonces:mesIds,mode:"admin"});
   const liste=parAnnonce[a.id]||[];
   carte.appendChild(el("p","pt-sous-titre-petit","Signalements : "+(a.nb_signalements||liste.length)));
   if(liste.length){
    const ul=el("ul","pt-signalements");
    liste.forEach(s=>{
     const motif=(MOTIFS.find(m=>m[0]===s.motif)||[0,s.motif])[1];
     ul.appendChild(el("li",null,motif+(s.detail?" : "+s.detail:"")+" ("+formaterDate(s.created_at)+")"));
    });
    carte.appendChild(ul);
   }
   const actions=el("div","pt-actions");
   const lancer=async action=>{
    const r=await api.moderer(a.id,action);
    if(!r.ok){afficher(messageAdmin,r.message,"err");return;}
    afficher(messageAdmin,"Action effectuée.","ok");
    await chargerAdmin();
    chargerListe();
   };
   if(!a.masquee){
    const masquer=el("button","btn ghost","Masquer");masquer.type="button";masquer.addEventListener("click",()=>lancer("masquer"));actions.appendChild(masquer);
   }
   const retablir=el("button","btn ghost","Rétablir");retablir.type="button";retablir.addEventListener("click",()=>lancer("retablir"));actions.appendChild(retablir);
   actions.appendChild(boutonAvecConfirmation("Supprimer","Oui, supprimer","btn ghost",()=>lancer("supprimer")));
   carte.appendChild(actions);
   listeAdmin.appendChild(carte);
  });
 }

 /* ---------- Démarrage selon l'état de connexion ---------- */
 async function demarrerConnecte(){
  blocConnexion.hidden=true;racine.hidden=false;montrerEtat("","");
  const profil=await compte.loadProfile();
  etat.profil=profil.ok?profil.profile:{};
  if(!profil.ok) afficher(messageGlobal,profil.message,"err");
  else afficher(messageGlobal,"","");
  if(etat.profil.is_admin&&blocAdmin){blocAdmin.hidden=false;chargerAdmin();}
  else if(blocAdmin) blocAdmin.hidden=true;
  if(!etat.demarre){
   etat.demarre=true;
   const disponible=await chargerTournois();
   if(!disponible) afficher(messageGlobal,"La liste des tournois n'a pas pu être chargée. Tu peux quand même consulter les annonces.","err");
   if(etat.tournoiIdUrl){
    const t=etat.indexTournois[etat.tournoiIdUrl]||{id:etat.tournoiIdUrl,nom:"Tournoi "+etat.tournoiIdUrl,_inconnu:true,sexes:[]};
    etat.tournoiChoisi=t;
   }
  }
  afficherSelection();preparerFormulaire();majCompteur();chargerListe();
 }
 function montrerDeconnecte(){
  racine.hidden=true;blocConnexion.hidden=false;if(blocAdmin) blocAdmin.hidden=true;
  etat.profil=null;montrerEtat("","");
 }
 function appliquerSession(){ if(compte.user) demarrerConnecte(); else montrerDeconnecte(); }

 champRecherche.addEventListener("input",afficherResultats);
 filtreSexe.addEventListener("change",()=>chargerListe());
 try{ etat.tournoiIdUrl=new URLSearchParams(location.search).get("tournoi")||null; }catch(e){ etat.tournoiIdUrl=null; }

 montrerEtat("Chargement…","");
 compte.ready.then(()=>{ appliquerSession(); compte.onChange(appliquerSession); })
  .catch(()=>montrerEtat("Impossible de charger ton compte pour le moment. Recharge la page.","err"));
})();
