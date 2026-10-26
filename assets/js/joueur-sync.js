/* SYNCHRONISATION DES DONNÉES DU JOUEUR (espace.html, compte.html)
   Les données vivent d'abord sur l'appareil (le site marche sans compte). Connecté, elles sont aussi gardées
   dans le compte et fusionnées entre appareils :
     - résultats de tournois (simulateur du barème)  localStorage pa-sim-resultats  <-> table resultats_tournois
     - objectifs                                       localStorage pa-objectifs     <-> table objectifs
     - rang FFT déclaré                                localStorage pa-classement-fft <-> profiles.rang_fft (le plus récent gagne)
   Fusion à trois voies : on compare l'appareil, le compte et la dernière version synchronisée (pa-synchro-<liste>:<compte>).
   Un ajout, une modification ou une suppression faits d'un côté sont donc reportés de l'autre, même faits hors connexion.
   Rien n'est appelé tant que "espace" n'est pas dans PA_SUPABASE.activees (SQL : supabase/migrations/2026-10-26-espace-*). */
const JS_CLE_OBJECTIFS="pa-objectifs";
const JS_CLE_RANG="pa-classement-fft";
const JS_TYPES_OBJECTIF=["points","rang","victoires","tournois"];

(function(){
 const B=window.PA_BAREME;
 if(!B)return;
 const ecouteurs=[];
 let etat={texte:"",erreur:false,derniere:null};
 const activee=()=>((window.PA_SUPABASE||{}).activees||[]).includes("espace");
 const compte=()=>window.PA_COMPTE;
 const client=()=>compte()&&compte().client;
 function lire(cle,defaut){try{const v=JSON.parse(localStorage.getItem(cle)||"null");return v===null?defaut:v;}catch(e){return defaut;}}
 function ecrire(cle,v){try{localStorage.setItem(cle,JSON.stringify(v));return true;}catch(e){return false;}}
 function prevenir(){ecouteurs.slice().forEach(f=>{try{f(etat);}catch(e){}});}

 /* ---------- Objectifs (format local) ---------- */
 const jourValide=s=>typeof s==="string"&&!!B.simLireDate(s);
 function normaliserObjectifs(liste){
  if(!Array.isArray(liste))return [];
  return liste.filter(o=>o&&JS_TYPES_OBJECTIF.includes(o.type)&&Number.isInteger(o.cible)&&o.cible>=1&&o.cible<=500000&&jourValide(o.depuis)).map(o=>({
   cle:typeof o.cle==="string"&&B.SIM_CLE_VALIDE.test(o.cle)?o.cle:B.simNouvelleCle(),
   type:o.type,cible:o.cible,echeance:jourValide(o.echeance)?o.echeance:null,depuis:o.depuis
  }));
 }

 /* ---------- Description des listes synchronisées ---------- */
 const LISTES={
  resultats:{
   cleLocale:B.SIM_KEY,table:"resultats_tournois",
   normaliser:B.simNormaliser,
   versLigne:r=>({cle:r.cle,categorie:r.cat,place:r.place,nb_paires:r.nb,sexe:r.sexe,date_tournoi:r.date}),
   depuisLigne:l=>({cle:l.cle,cat:l.categorie,place:l.place,nb:l.nb_paires,sexe:l.sexe,date:l.date_tournoi||null}),
   empreinte:r=>[r.cat,r.place,r.nb,r.sexe,r.date||""].join("|")
  },
  objectifs:{
   cleLocale:JS_CLE_OBJECTIFS,table:"objectifs",
   normaliser:normaliserObjectifs,
   versLigne:o=>({cle:o.cle,type:o.type,cible:o.cible,echeance:o.echeance,depuis:o.depuis}),
   depuisLigne:l=>({cle:l.cle,type:l.type,cible:l.cible,echeance:l.echeance||null,depuis:l.depuis}),
   empreinte:o=>[o.type,o.cible,o.echeance||"",o.depuis].join("|")
  }
 };
 const cleSynchro=(nom,id)=>"pa-synchro-"+nom+":"+id;

 // Fusion à trois voies d'une liste : renvoie { liste fusionnée, opérations à faire sur le compte }
 function fusionner(def,locaux,serveur,base){
  const L=new Map(locaux.map(r=>[r.cle,r])),S=new Map(serveur.map(r=>[r.cle,r]));
  const cles=new Set([...L.keys(),...S.keys(),...Object.keys(base)]);
  const resultat=[],operations=[];
  for(const cle of cles){
   const l=L.get(cle),s=S.get(cle),b=base[cle];
   const el=l&&def.empreinte(l),es=s&&def.empreinte(s);
   if(l&&!s){
    // Absent du compte : nouveau ici, ou supprimé sur un autre appareil (on le garde seulement s'il a changé ici)
    if(b===undefined||el!==b){resultat.push(l);operations.push({type:"ecrire",ligne:l});}
   }else if(!l&&s){
    // Absent de l'appareil : nouveau ailleurs, ou supprimé ici (on le reprend seulement s'il a changé ailleurs)
    if(b===undefined||es!==b)resultat.push(s);
    else operations.push({type:"supprimer",cle});
   }else if(l&&s){
    if(el===es)resultat.push(l);
    else if(es!==b&&el===b)resultat.push(s);           // modifié ailleurs seulement
    else{resultat.push(l);operations.push({type:"ecrire",ligne:l});} // modifié ici (ou des deux côtés : l'appareil gagne)
   }
  }
  return {resultat,operations};
 }

 async function synchroniserListe(nom,id){
  const def=LISTES[nom],c=client();
  const locaux=def.normaliser(lire(def.cleLocale,[]));
  ecrire(def.cleLocale,locaux); // garde les identifiants attribués
  const {data,error}=await c.from(def.table).select("*").eq("user_id",id).limit(500);
  if(error)throw error;
  if(!compte().user||compte().user.id!==id)return false; // session changée entre-temps
  const serveur=def.normaliser((data||[]).map(def.depuisLigne));
  const base=lire(cleSynchro(nom,id),{});
  const {resultat,operations}=fusionner(def,locaux,serveur,base);
  for(const op of operations){
   const r=op.type==="ecrire"
    ?await c.from(def.table).upsert({user_id:id,...def.versLigne(op.ligne),updated_at:new Date().toISOString()},{onConflict:"user_id,cle"})
    :await c.from(def.table).delete().eq("user_id",id).eq("cle",op.cle);
   if(r.error)throw r.error;
   if(!compte().user||compte().user.id!==id)return false;
  }
  // Une modification faite pendant la synchronisation sera prise au prochain passage
  const pendant=def.normaliser(lire(def.cleLocale,[]));
  if(pendant.map(def.empreinte).join()!==locaux.map(def.empreinte).join()||pendant.length!==locaux.length)return true;
  ecrire(def.cleLocale,resultat);
  ecrire(cleSynchro(nom,id),Object.fromEntries(resultat.map(r=>[r.cle,def.empreinte(r)])));
  return false;
 }

 // Rang FFT : la saisie la plus récente (appareil ou compte) gagne
 async function synchroniserRang(id){
  const c=client(),local=lire(JS_CLE_RANG,null);
  const {data,error}=await c.from("profiles").select("rang_fft,rang_sexe,rang_maj").eq("id",id).maybeSingle();
  if(error)throw error;
  const tLocal=local&&Date.parse(local.maj)||0,tServeur=data&&data.rang_maj?Date.parse(data.rang_maj):0;
  if(tLocal>tServeur&&local&&Number.isInteger(local.rang)){
   const r=await c.from("profiles").update({rang_fft:local.rang,rang_sexe:local.sexe,rang_maj:local.maj}).eq("id",id);
   if(r.error)throw r.error;
  }else if(tServeur>tLocal&&data&&data.rang_fft){
   ecrire(JS_CLE_RANG,{rang:data.rang_fft,sexe:data.rang_sexe||"messieurs",maj:data.rang_maj});
  }
 }

 let enCours=null;
 async function synchroniser(){
  if(!activee()||!compte()||!compte().actif)return;
  await compte().ready;
  if(!compte().user)return;
  if(enCours)return enCours;
  const id=compte().user.id;
  enCours=(async()=>{
   try{
    let encore=true,tours=0;
    while(encore&&tours++<3){
     encore=false;
     for(const nom of Object.keys(LISTES))if(await synchroniserListe(nom,id))encore=true;
    }
    await synchroniserRang(id);
    etat={texte:"",erreur:false,derniere:new Date().toISOString()};
   }catch(e){
    const brut=String((e&&e.message)||"").toLowerCase(),code=e&&e.code;
    etat={texte:code==="42P01"||code==="PGRST205"||brut.indexOf("schema cache")>=0
     ?"La sauvegarde dans le compte n'est pas encore activée : tes données restent sur cet appareil."
     :"Synchronisation impossible pour le moment : tes données restent sur cet appareil et partiront plus tard.",erreur:true,derniere:etat.derniere};
   }finally{enCours=null;prevenir();}
  })();
  return enCours;
 }

 window.PA_JOUEUR={
  activee,synchroniser,
  onChange(f){if(typeof f==="function")ecouteurs.push(f);},
  etat:()=>etat,
  lireObjectifs:()=>normaliserObjectifs(lire(JS_CLE_OBJECTIFS,[])),
  ecrireObjectifs:liste=>ecrire(JS_CLE_OBJECTIFS,normaliserObjectifs(liste)),
  _fusionner:fusionner,_LISTES:LISTES // pour les tests
 };
 const c=compte();
 if(c&&c.actif){c.ready.then(synchroniser);c.onChange(()=>synchroniser());}
 window.addEventListener("online",synchroniser);
 document.addEventListener("visibilitychange",()=>{if(!document.hidden)synchroniser();});
})();
