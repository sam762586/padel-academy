/* JOURNAL DE MATCHS (espace joueur) : réunit
     - les matchs comptés avec le compteur (score.js, localStorage pa-score-historique, 50 derniers) ;
     - les matchs saisis après coup (localStorage pa-journal-manuels) ;
     - les matchs gardés dans le compte (table matchs), quand on est connecté.
   Le compte sert d'archive : un match de l'appareil y est copié une fois (identifiant « cle »). Effacer l'historique
   du compteur ne supprime rien du compte ; seule une suppression faite ici efface un match partout (mise en attente
   hors connexion). Copie et suppression dans le compte : seulement si "journal" est dans PA_SUPABASE.activees
   (SQL : supabase/migrations/2026-10-26-journal-*). Dépend de score.js (PA_SCORE). */
const JN_CLE_MANUELS="pa-journal-manuels";
const JN_CLE_SUPPRESSIONS="pa-journal-suppressions";
const JN_TYPES={amical:"Amical",tournoi:"Tournoi",entrainement:"Entraînement"};
const JN_MAX_MANUELS=300;
const JN_CLE_VALIDE=/^[0-9A-Za-z-]{8,40}$/;

(function(){
 const S=window.PA_SCORE;
 if(!S)return;
 const ecouteurs=[];
 let serveur=[],etat={texte:"",erreur:false};
 function lire(cle,defaut){try{const v=JSON.parse(localStorage.getItem(cle)||"null");return v===null?defaut:v;}catch(e){return defaut;}}
 function ecrire(cle,v){try{localStorage.setItem(cle,JSON.stringify(v));return true;}catch(e){return false;}}
 function prevenir(){ecouteurs.slice().forEach(f=>{try{f(etat);}catch(e){}});}
 const actif=()=>((window.PA_SUPABASE||{}).activees||[]).includes("journal");
 const compte=()=>window.PA_COMPTE;
 const connecte=()=>{const c=compte();return !!(c&&c.actif&&c.user);};
 const seconde=d=>Math.floor(Date.parse(d)/1000);
 // Ancien match du compteur sans identifiant : identifiant déduit de sa date de fin (toujours le même)
 const cleDe=m=>typeof m.cle==="string"&&JN_CLE_VALIDE.test(m.cle)?m.cle:"m-"+Date.parse(m.fin).toString(36);

 // Points perdus par motif : { faute: 4, smash: 2, ... } (paire 1 = le joueur, g === 1 = point de l'adversaire)
 function motifsPerdus(points){
  const r={};
  (Array.isArray(points)?points:[]).forEach(p=>{if(p&&p.g===1&&typeof p.m==="string")r[p.m]=(r[p.m]||0)+1;});
  return r;
 }
 // Match de l'appareil (format score.js) -> entrée du journal
 function depuisAppareil(m,manuel){
  const g=m.points.filter(p=>p.g===0).length;
  return {cle:cleDe(m),fin:m.fin,partenaire:m.partenaire||null,adversaires:m.config.nomB,score:m.score||"",vainqueur:m.vainqueur===0||m.vainqueur===1?m.vainqueur:null,
   interrompu:!!m.interrompu,type:JN_TYPES[m.type]?m.type:(manuel?"amical":null),saisie:manuel?"manuelle":"compteur",
   pointsGagnes:g,pointsTotal:m.points.length,motifsPerdus:motifsPerdus(m.points),origine:m};
 }
 // Ligne du compte -> entrée du journal
 function depuisCompte(l){
  const pts=Array.isArray(l.points)?l.points:[];
  return {cle:l.cle||l.id,fin:l.joue_le,partenaire:l.partenaire||null,adversaires:l.nom_b,score:l.score||"",vainqueur:l.vainqueur===0||l.vainqueur===1?l.vainqueur:null,
   interrompu:!!l.interrompu,type:JN_TYPES[l.type_match]?l.type_match:null,saisie:l.saisie||"compteur",pointsGagnes:pts.filter(p=>p&&p.g===0).length,pointsTotal:pts.length,motifsPerdus:motifsPerdus(pts),origine:null};
 }
 const valideAppareil=m=>m&&S.configValide(m.config)&&S.pointsValides(m.points)&&!Number.isNaN(Date.parse(m.fin));
 function locaux(){
  const compteur=lire(S.CLE_HISTORIQUE,[]),manuels=lire(JN_CLE_MANUELS,[]);
  return [...(Array.isArray(compteur)?compteur:[]).filter(valideAppareil).map(m=>depuisAppareil(m,false)),
          ...(Array.isArray(manuels)?manuels:[]).filter(valideAppareil).map(m=>depuisAppareil(m,true))];
 }
 const suppressions=()=>{const s=lire(JN_CLE_SUPPRESSIONS,[]);return Array.isArray(s)?s.filter(x=>typeof x==="string"):[];};
 // Même match des deux côtés : même identifiant, ou (anciens matchs) même seconde de fin et même score
 const memeMatch=(a,b)=>a.cle===b.cle||(seconde(a.fin)===seconde(b.fin)&&a.score===b.score);

 function liste(){
  const sup=new Set(suppressions()),res=[];
  locaux().forEach(m=>{if(!sup.has(m.cle))res.push({...m,dansCompte:serveur.some(s=>memeMatch(s,m))});});
  serveur.forEach(s=>{if(!sup.has(s.cle)&&!res.some(m=>memeMatch(m,s)))res.push({...s,dansCompte:true});});
  return res.sort((a,b)=>Date.parse(b.fin)-Date.parse(a.fin));
 }

 let enCours=null;
 async function synchroniser(){
  const c=compte();
  if(!c||!c.actif)return;
  await c.ready;
  if(!c.user){serveur=[];prevenir();return;}
  if(enCours)return enCours;
  const id=c.user.id;
  enCours=(async()=>{
   try{
    // 1. Suppressions en attente
    if(actif()){
     for(const cle of suppressions()){
      const r=await c.deleteMatch(cle);
      if(!c.user||c.user.id!==id)return;
      if(!r.ok)throw new Error(r.message);
      ecrire(JN_CLE_SUPPRESSIONS,suppressions().filter(x=>x!==cle));
     }
    }
    // 2. Matchs du compte
    const r=await c.loadMatches(500);
    if(!c.user||c.user.id!==id)return;
    if(!r.ok)throw new Error(r.message);
    serveur=r.matchs.map(depuisCompte);
    // 3. Copie dans le compte des matchs de l'appareil qui n'y sont pas encore
    if(actif()){
     const sup=new Set(suppressions());
     for(const m of locaux()){
      if(sup.has(m.cle)||serveur.some(s=>memeMatch(s,m)))continue;
      const envoi=await c.saveMatch({...m.origine,cle:m.cle});
      if(!c.user||c.user.id!==id)return;
      if(!envoi.ok)throw new Error(envoi.message);
      serveur.push({...m,origine:null});
     }
    }
    etat={texte:"",erreur:false};
   }catch(e){
    etat={texte:"Journal non synchronisé pour le moment : tes matchs restent sur cet appareil.",erreur:true};
   }finally{enCours=null;prevenir();}
  })();
  return enCours;
 }

 // Match saisi après coup. donnees : { date (AAAA-MM-JJ), partenaire, adversaires, type, vainqueur (0 ou 1), score }
 function ajouterManuel(d){
  const manuels=lire(JN_CLE_MANUELS,[]),liste_=Array.isArray(manuels)?manuels:[];
  if(liste_.length>=JN_MAX_MANUELS)return {ok:false,message:JN_MAX_MANUELS+" matchs saisis au maximum sur cet appareil."};
  const m={cle:S.nouvelleCle(),config:{nomA:"Nous",nomB:d.adversaires||"Adversaires",serveur:0,egalite:"decisif",dernierSet:"super"},points:[],
   fin:d.date+"T12:00:00.000Z",interrompu:false,score:d.score||"",vainqueur:d.vainqueur,partenaire:d.partenaire||null,type:d.type,saisie:"manuelle"};
  liste_.push(m);
  if(!ecrire(JN_CLE_MANUELS,liste_))return {ok:false,message:"Le stockage de cet appareil est indisponible."};
  prevenir();synchroniser();
  return {ok:true};
 }
 // Suppression partout : appareil tout de suite, compte maintenant ou à la prochaine connexion
 async function supprimer(cle){
  const garder=x=>cleDe(x)!==cle;
  const compteur=lire(S.CLE_HISTORIQUE,[]),manuels=lire(JN_CLE_MANUELS,[]);
  if(Array.isArray(compteur))ecrire(S.CLE_HISTORIQUE,compteur.filter(x=>!x||!x.fin||garder(x)));
  if(Array.isArray(manuels))ecrire(JN_CLE_MANUELS,manuels.filter(x=>!x||!x.fin||garder(x)));
  const dansCompte=serveur.some(s=>s.cle===cle);
  serveur=serveur.filter(s=>s.cle!==cle);
  if(dansCompte&&actif()){
   const c=compte();
   const r=connecte()?await c.deleteMatch(cle):{ok:false};
   if(!r.ok)ecrire(JN_CLE_SUPPRESSIONS,[...new Set([...suppressions(),cle])]);
  }
  prevenir();
 }

 window.PA_JOURNAL={TYPES:JN_TYPES,liste,synchroniser,ajouterManuel,supprimer,actif,etat:()=>etat,onChange(f){if(typeof f==="function")ecouteurs.push(f);}};
 const c=compte();
 if(c&&c.actif){c.ready.then(synchroniser);c.onChange(()=>synchroniser());}
 window.addEventListener("online",synchroniser);
})();
