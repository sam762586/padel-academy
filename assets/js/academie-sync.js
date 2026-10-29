/* MON ACADÉMIE · Synchronisation avec le compte (academie.html, espace.html)
   Mon académie marche sans compte : tout vit d'abord sur l'appareil. Connecté, le niveau déclaré et les quiz terminés
   sont aussi gardés dans le compte et réunis entre appareils :
     - historique des niveaux déclarés   pa-academie       <-> table academie_niveaux (une ligne par choix)
     - séances de quiz terminées         pa-academie-quiz  <-> table academie_quiz (une ligne par séance)
   Les deux tables n'acceptent que des ajouts (RLS : chacun ses lignes, aucune modification) : la fusion est une union,
   par date de choix pour les niveaux et par identifiant de séance pour les quiz ; le niveau actuel est le choix le plus
   récent, d'où qu'il vienne. Un quiz en cours reste sur l'appareil jusqu'à sa fin. Rien n'est jamais effacé.
   Plusieurs comptes sur un même appareil : ce qui a déjà été synchronisé avec un compte (pa-academie-synchro:<id>)
   n'est jamais envoyé dans un autre ; ce qui n'a jamais été synchronisé part dans le compte connecté.
   Rien n'est chargé ni appelé tant que "academie" n'est pas dans PA_SUPABASE.activees
   (SQL : supabase/migrations/2026-10-27-academie-01 à 03, voir supabase/LISEZMOI.md). */
const AS_CLE_NIVEAUX="pa-academie",AS_CLE_QUIZ="pa-academie-quiz",AS_PREFIXE="pa-academie-synchro:";
const AS_MAX_HISTORIQUE=50,AS_MAX_SEANCES=30;

/* ---------- Fusion (pure, testée sous Node) ---------- */
// Niveaux : union par date ; niveau actuel = choix le plus récent
function asFusionNiveaux(local,distants){
 const parDate=new Map();
 (local.historique||[]).forEach(h=>parDate.set(Date.parse(h.date),{niveau:h.niveau,date:h.date}));
 (distants||[]).forEach(r=>{const t=Date.parse(r.choisi_le);if(!parDate.has(t))parDate.set(t,{niveau:r.niveau,date:new Date(t).toISOString()});});
 const historique=[...parDate.entries()].sort((a,b)=>a[0]-b[0]).map(e=>e[1]).slice(-AS_MAX_HISTORIQUE);
 return {version:1,niveau:historique.length?historique[historique.length-1].niveau:(local.niveau||null),historique};
}
// Séance distante → séance locale (questions reconstituées depuis les réponses)
function asSeanceLocale(r){
 return {id:r.cle,niveau:r.niveau,debut:r.debut,fin:r.fin||undefined,adaptee:false,
  questions:r.reponses.map(x=>({id:x.id,type:x.type||"reference",cible:r.niveau,ordre:[]})),
  reponses:r.reponses.map(x=>({id:x.id,choix:x.choix,juste:x.juste,type:x.type||"reference",theme:x.theme}))};
}
// Quiz : union par identifiant de séance, dans l'ordre de début, 30 séances au plus ; la séance en cours est gardée
function asFusionQuiz(local,distants){
 const vus=new Set((local.seances||[]).map(s=>s.id));
 const seances=(local.seances||[]).concat((distants||[]).filter(r=>!vus.has(r.cle)).map(asSeanceLocale))
  .sort((a,b)=>Date.parse(a.debut)-Date.parse(b.debut)).slice(-AS_MAX_SEANCES);
 return {enCours:local.enCours||null,seances};
}
// Ligne à envoyer pour une séance terminée
function asLigneQuiz(s,userId){
 const reponses=s.reponses.map(r=>({id:r.id,choix:r.choix,juste:r.juste,type:r.type,theme:r.theme}));
 return {user_id:userId,cle:s.id,niveau:s.niveau,debut:s.debut,fin:s.fin||null,score:reponses.filter(r=>r.juste).length,total:reponses.length,reponses};
}

function asDemarrer(){
 const C=window.PA_COMPTE;
 if(!C||!C.actif||!C.client)return;
 const lire=(cle,def)=>{try{const v=JSON.parse(localStorage.getItem(cle)||"null");return v===null?def:v;}catch(e){return def;}};
 const ecrire=(cle,v)=>{try{localStorage.setItem(cle,JSON.stringify(v));return true;}catch(e){return false;}};
 const marqueurs=()=>Object.keys(localStorage).filter(k=>k.startsWith(AS_PREFIXE));
 let enCours=false,encore=false,applique=false,etat={ok:null,message:""};

 async function synchroniser(){
  const user=C.user;
  if(!user)return;
  if(enCours){encore=true;return;}
  enCours=true;
  try{
   do{
    encore=false;
    const uid=user.id,cleMarque=AS_PREFIXE+uid,marque=lire(cleMarque,{niveaux:[],quiz:[]});
    // Entrées déjà synchronisées avec un AUTRE compte de cet appareil : jamais envoyées ici
    const autres={niveaux:new Set(),quiz:new Set()};
    marqueurs().filter(k=>k!==cleMarque).forEach(k=>{const m=lire(k,{});(m.niveaux||[]).forEach(d=>autres.niveaux.add(d));(m.quiz||[]).forEach(c=>autres.quiz.add(c));});
    const [n,q]=await Promise.all([
     C.client.from("academie_niveaux").select("niveau,choisi_le").eq("user_id",uid),
     C.client.from("academie_quiz").select("cle,niveau,debut,fin,score,total,reponses").eq("user_id",uid)]);
    if(n.error||q.error)throw n.error||q.error;
    if(!C.user||C.user.id!==uid)return; // le compte a changé pendant la requête
    const local=lire(AS_CLE_NIVEAUX,{version:1,niveau:null,historique:[]}),localQ=lire(AS_CLE_QUIZ,{enCours:null,seances:[]});
    const distDates=new Set((n.data||[]).map(r=>Date.parse(r.choisi_le))),distCles=new Set((q.data||[]).map(r=>r.cle));
    // Envoi de ce qui manque au compte
    const aEnvoyerN=(local.historique||[]).filter(h=>!distDates.has(Date.parse(h.date))&&!autres.niveaux.has(h.date)).map(h=>({user_id:uid,niveau:h.niveau,choisi_le:h.date}));
    const aEnvoyerQ=(localQ.seances||[]).filter(s=>!distCles.has(s.id)&&!autres.quiz.has(s.id)&&s.reponses.length===s.questions.length).map(s=>asLigneQuiz(s,uid));
    if(aEnvoyerN.length){const r=await C.client.from("academie_niveaux").upsert(aEnvoyerN,{onConflict:"user_id,choisi_le",ignoreDuplicates:true});if(r.error)throw r.error;}
    if(aEnvoyerQ.length){const r=await C.client.from("academie_quiz").upsert(aEnvoyerQ,{onConflict:"user_id,cle",ignoreDuplicates:true});if(r.error)throw r.error;}
    // Réception : union, puis signal aux pages si quelque chose a changé
    const fusionN=asFusionNiveaux(local,n.data),fusionQ=asFusionQuiz(localQ,q.data);
    const changeN=JSON.stringify(fusionN)!==JSON.stringify(local),changeQ=JSON.stringify(fusionQ.seances)!==JSON.stringify(localQ.seances||[]);
    if(changeN)ecrire(AS_CLE_NIVEAUX,fusionN);
    if(changeQ)ecrire(AS_CLE_QUIZ,{...lire(AS_CLE_QUIZ,{}),seances:fusionQ.seances});
    ecrire(cleMarque,{niveaux:[...new Set([...(marque.niveaux||[]),...fusionN.historique.filter(h=>!autres.niveaux.has(h.date)).map(h=>h.date)])].slice(-AS_MAX_HISTORIQUE*2),
     quiz:[...new Set([...(marque.quiz||[]),...fusionQ.seances.filter(s=>!autres.quiz.has(s.id)).map(s=>s.id)])].slice(-AS_MAX_SEANCES*2)});
    etat={ok:true,message:"Ton niveau et tes quiz sont synchronisés avec ton compte."};
    applique=true;
    try{if(changeN)window.dispatchEvent(new Event("pa-academie"));if(changeQ)window.dispatchEvent(new Event("pa-academie-quiz"));}finally{applique=false;}
   }while(encore);
  }catch(e){
   etat={ok:false,message:"Synchronisation de ton académie impossible pour le moment : tout reste sur cet appareil, nouvel essai à la prochaine connexion."};
  }finally{enCours=false;}
 }
 const relancer=()=>{if(!applique)setTimeout(synchroniser,0);};
 ["pa-academie","pa-academie-quiz"].forEach(ev=>window.addEventListener(ev,relancer));
 window.addEventListener("online",synchroniser);
 C.onChange(()=>synchroniser());
 C.ready.then(synchroniser).catch(()=>{});
 window.PA_ACADEMIE_SYNC={synchroniser,etat:()=>etat};
}
// Activée seulement si "academie" est dans PA_SUPABASE.activees. Mon académie ne charge pas Supabase d'elle-même :
// le client et le module de compte sont alors chargés à la demande (Mon espace les charge déjà).
(function(){
 if(!((window.PA_SUPABASE||{}).activees||[]).includes("academie"))return;
 if(window.PA_COMPTE){asDemarrer();return;}
 const charger=src=>new Promise((ok,ko)=>{const s=document.createElement("script");s.src=src;s.onload=ok;s.onerror=ko;document.head.appendChild(s);});
 charger("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js").then(()=>charger("assets/js/compte.js?v=e010abe739")).then(asDemarrer).catch(()=>{});
})();
window.PA_ACADEMIE_SYNC_FUSION={niveaux:asFusionNiveaux,quiz:asFusionQuiz,seanceLocale:asSeanceLocale,ligneQuiz:asLigneQuiz};
