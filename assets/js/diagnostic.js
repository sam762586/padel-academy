/* DIAGNOSTIC APRÈS MATCH (score.html, à la fin d'un match ; espace.html, dans le journal)
   Bilan rapide et facultatif rattaché au match par son identifiant (même clé que le journal) : ressenti 1 à 5, difficultés
   techniques et tactiques, point positif, objectif du prochain match. À partir des difficultés notées : jusqu'à 3 axes,
   chacun avec une fiche du site, un exercice existant et « Ajouter à mes objectifs ».
   C'est une auto-évaluation, présentée comme telle : jamais comme une mesure.
   Stockage : pa-diagnostics sur l'appareil ; dans le compte (colonne matchs.diagnostic) si "journal" et "diagnostic"
   sont dans PA_SUPABASE.activees (SQL 2026-10-27-diagnostic-01) : la version la plus récente (maj) gagne.
   Les difficultés des bilans récents orientent aussi les exercices recommandés (exercices.js).
   Dépend, si présents, de exercices-donnees.js / exercices.js (exercices), joueur-sync.js (objectifs), compte.js, journal.js. */
const DG_CLE="pa-diagnostics";
const DG_MAX=300;          // bilans gardés sur l'appareil
const DG_TEXTE_MAX=200;    // caractères des champs libres
const DG_RESSENTI=["Très difficile","Difficile","Correct","Bon","Excellent"];
// [identifiant, libellé, thèmes d'exercices]
const DG_TECHNIQUES=[["defense_vitre","Défense après vitre",["vitre","regularite"]],["volees","Volées",["placement","transition"]],["bandeja","Bandeja",["aerien"]],
 ["smash","Smash",["aerien"]],["lob","Lob",["montee"]],["retour","Retour de service",["regularite"]],["sortie_vitre","Sortie de vitre",["vitre"]],["autre","Autre",[]]];
const DG_TACTIQUES=[["placement","Placement",["placement","couple"]],["communication","Communication avec le partenaire",["communication"]],["choix","Choix des coups",["transition","aerien"]],
 ["montee","Montée au filet",["montee"]],["lobs","Gestion des lobs",["couple","placement"]],["pression","Défense sous pression",["regularite","vitre"]]];
// Fiche du site à revoir pour chaque thème
const DG_FICHES={vitre:["technique.html#coups","Les sorties de vitre"],aerien:["tutos.html","Bandeja, víbora ou smash"],placement:["tactique.html#placement","Le placement phase par phase"],
 couple:["tutos.html","Bouger avec son partenaire"],montee:["tutos.html","Quand monter au filet"],regularite:["conseils.html#erreurs","Les erreurs à éviter"],
 transition:["technique.html#coups","Volée basse et chiquita"],communication:["tactique.html#placement","Jouer à deux"],service:["technique.html#coups","Le service"],compet:["competition.html","Jouer en compétition"]};
// Objectif de jeu proposé pour chaque thème (OBJECTIFS_JEU)
const DG_OBJECTIF={vitre:"vitre",aerien:"bandeja",placement:"placement",couple:"placement",montee:"placement",regularite:"defense",transition:"volees",communication:"tournoi"};

// ---- Moteur pur (testable) ----
const dgTexte=v=>typeof v==="string"?v.replace(/[\u0000-\u001f\u007f]/g," ").trim().slice(0,DG_TEXTE_MAX):"";
function dgNormaliser(d){
 if(!d||typeof d!=="object")return null;
 const ids=(liste,ref)=>[...new Set((Array.isArray(liste)?liste:[]).filter(x=>ref.some(r=>r[0]===x)))];
 const n={ressenti:Number.isInteger(d.ressenti)&&d.ressenti>=1&&d.ressenti<=5?d.ressenti:null,techniques:ids(d.techniques,DG_TECHNIQUES),tactiques:ids(d.tactiques,DG_TACTIQUES),
  positif:dgTexte(d.positif),prochain:dgTexte(d.prochain),maj:typeof d.maj==="string"&&!isNaN(Date.parse(d.maj))?d.maj:new Date().toISOString()};
 return n.ressenti||n.techniques.length||n.tactiques.length||n.positif||n.prochain?n:null;
}
// Même identifiant que le journal (journal.js) : clé du match, sinon déduite de sa date de fin
const dgCleMatch=m=>typeof m.cle==="string"&&/^[0-9A-Za-z-]{8,40}$/.test(m.cle)?m.cle:"m-"+Date.parse(m.fin).toString(36);
// Jusqu'à 3 axes : [{theme, score, raisons, exercice, fiche:[lien, titre], objectif}]
function dgRecommandations(d,niveau,exercicesPour){
 if(!d)return [];
 const scores={},ordre=[];
 const noter=(liste,ref,prefixe)=>liste.forEach(id=>{
  const r=ref.find(x=>x[0]===id);if(!r)return;
  r[2].forEach((th,i)=>{if(!scores[th]){scores[th]={theme:th,score:0,raisons:[]};ordre.push(th);}scores[th].score+=i===0?2:1;scores[th].raisons.push(prefixe+r[1].toLowerCase());});
 });
 noter(d.techniques,DG_TECHNIQUES,"Tu as noté en technique : ");
 noter(d.tactiques,DG_TACTIQUES,"Tu as noté en tactique : ");
 return Object.values(scores).sort((a,b)=>b.score-a.score||ordre.indexOf(a.theme)-ordre.indexOf(b.theme)).slice(0,3).map(s=>({
  ...s,raisons:[...new Set(s.raisons)],exercice:(exercicesPour?exercicesPour(s.theme,Number.isInteger(niveau)?niveau:2):[])[0]||null,
  fiche:DG_FICHES[s.theme]||null,objectif:DG_OBJECTIF[s.theme]||null}));
}
// Difficultés des bilans des 30 derniers jours (3 derniers matchs au plus) : [{theme, raison}] pour exercices.js
function dgDifficultes(tous,maintenant){
 const limite=(maintenant||Date.now())-30*86400000;
 const recents=Object.values(tous||{}).filter(d=>d&&Date.parse(d.maj)>=limite).sort((a,b)=>Date.parse(b.maj)-Date.parse(a.maj)).slice(0,3);
 const r=[];
 recents.forEach(d=>{
  const jour=new Date(d.maj).toLocaleDateString("fr-FR",{day:"numeric",month:"long"});
  [[d.techniques,DG_TECHNIQUES],[d.tactiques,DG_TACTIQUES]].forEach(([liste,ref])=>(liste||[]).forEach(id=>{
   const x=ref.find(y=>y[0]===id);if(x&&x[2][0])r.push({theme:x[2][0],raison:"Ton bilan du "+jour+" : "+x[1].toLowerCase()});
  }));
 });
 return r;
}

(function(){
 const el=(b,c,t)=>{const e=document.createElement(b);if(c)e.className=c;if(t!==undefined)e.textContent=t;return e;};
 const lireTous=()=>{try{const v=JSON.parse(localStorage.getItem(DG_CLE)||"{}");return v&&typeof v==="object"&&!Array.isArray(v)?v:{};}catch(e){return {};}};
 function ecrireTous(t){
  const cles=Object.keys(t);
  if(cles.length>DG_MAX)cles.sort((a,b)=>Date.parse(t[a].maj)-Date.parse(t[b].maj)).slice(0,cles.length-DG_MAX).forEach(k=>delete t[k]);
  try{localStorage.setItem(DG_CLE,JSON.stringify(t));return true;}catch(e){return false;}
 }
 const lire=cle=>dgNormaliser(lireTous()[cle]);
 const signaler=()=>window.dispatchEvent(new Event("pa-progression"));
 const actifCompte=()=>{const a=(window.PA_SUPABASE||{}).activees||[],c=window.PA_COMPTE;return a.includes("journal")&&a.includes("diagnostic")&&!!(c&&c.actif&&c.user&&c.saveDiagnostic);};
 function enregistrer(cle,d){
  const t=lireTous(),n=dgNormaliser({...d,maj:new Date().toISOString()});
  if(n)t[cle]=n;else delete t[cle];
  const ok=ecrireTous(t);
  if(actifCompte())window.PA_COMPTE.saveDiagnostic(cle,n);
  signaler();
  return ok;
 }
 function supprimer(cle){const t=lireTous();delete t[cle];ecrireTous(t);if(actifCompte())window.PA_COMPTE.saveDiagnostic(cle,null);signaler();}
 // Bilans venus du compte (journal) : la version la plus récente gagne
 function fusionnerCompte(){
  const J=window.PA_JOURNAL;if(!J)return;
  const t=lireTous();let change=false;
  J.liste().forEach(m=>{
   const s=dgNormaliser(m.diagnostic);if(!s)return;
   const l=t[m.cle];
   if(!l||Date.parse(s.maj)>Date.parse(l.maj)){t[m.cle]=s;change=true;}
  });
  if(change){ecrireTous(t);signaler();}
 }
 const niveau=()=>{try{const q=JSON.parse(localStorage.getItem("pa-quiz-dernier")||"null");return q&&Number.isInteger(q.niveau)?q.niveau:2;}catch(e){return 2;}};
 const exercicesPour=(th,n)=>window.PA_EXERCICES&&window.PA_EXERCICES.exercicesPour?window.PA_EXERCICES.exercicesPour(th,n):[];
 function ajouterObjectif(id){
  const J=window.PA_JOUEUR,jour=new Date();const depuis=jour.getFullYear()+"-"+String(jour.getMonth()+1).padStart(2,"0")+"-"+String(jour.getDate()).padStart(2,"0");
  if(J&&J.lireObjectifsJeu){const l=J.lireObjectifsJeu();if(!l.some(o=>o.objectif===id))J.ecrireObjectifsJeu([...l,{objectif:id,depuis}]);if(J.synchroniser)J.synchroniser();}
  else{
   let l=[];try{l=JSON.parse(localStorage.getItem("pa-objectifs-jeu")||"[]");}catch(e){}
   if(!Array.isArray(l))l=[];
   if(!l.some(o=>o&&o.objectif===id))l.push({cle:"objectif-"+Date.now().toString(36)+Math.random().toString(36).slice(2,8),objectif:id,depuis});
   try{localStorage.setItem("pa-objectifs-jeu",JSON.stringify(l));}catch(e){}
  }
  signaler();
 }
 const objectifActif=id=>{
  const J=window.PA_JOUEUR;
  if(J&&J.lireObjectifsJeu)return J.lireObjectifsJeu().some(o=>o.objectif===id);
  try{const l=JSON.parse(localStorage.getItem("pa-objectifs-jeu")||"[]");return Array.isArray(l)&&l.some(o=>o&&o.objectif===id);}catch(e){return false;}
 };
 const libelleObjectif=id=>{const o=(typeof OBJECTIFS_JEU!=="undefined"?OBJECTIFS_JEU:[]).find(x=>x.id===id);return o?o.libelle:null;};

 // ---- Affichage ----
 function resume(d){
  const box=el("div","dg-resume");
  if(d.ressenti)box.appendChild(el("p","","Ressenti : "+d.ressenti+"/5 · "+DG_RESSENTI[d.ressenti-1]));
  const lib=(liste,ref)=>liste.map(id=>ref.find(r=>r[0]===id)[1]).join(", ");
  if(d.techniques.length)box.appendChild(el("p","","Technique : "+lib(d.techniques,DG_TECHNIQUES)));
  if(d.tactiques.length)box.appendChild(el("p","","Tactique : "+lib(d.tactiques,DG_TACTIQUES)));
  if(d.positif)box.appendChild(el("p","","Point positif : "+d.positif));
  if(d.prochain)box.appendChild(el("p","","Objectif du prochain match : "+d.prochain));
  return box;
 }
 function recommandations(d){
  const recos=dgRecommandations(d,niveau(),exercicesPour);
  const box=el("div","dg-recos");
  if(!recos.length){
   box.appendChild(el("p","acc-muted",d.techniques.length||d.tactiques.length?"Pour « Autre », note le détail dans ton objectif du prochain match : les exercices recommandés de ton espace t'aideront aussi.":"Note une difficulté technique ou tactique pour recevoir des exercices ciblés."));
   return box;
  }
  box.appendChild(el("h4","dg-recos-titre","À travailler d'ici le prochain match"));
  box.appendChild(el("p","dg-avert","D'après ce que tu as noté : c'est ton ressenti, pas une mesure."));
  recos.forEach(r=>{
   const c=el("article","dg-reco");
   c.appendChild(el("p","dg-reco-titre",(window.PA_EXERCICES&&window.PA_EXERCICES.LIBELLES[r.theme])||r.theme));
   c.appendChild(el("p","dg-reco-pourquoi","Pourquoi : "+r.raisons.join(" · ")));
   if(r.exercice){const p=el("p","dg-reco-ex");p.append(el("b","",r.exercice.titre)," · "+r.exercice.duree+" · "+r.exercice.joueurs);c.appendChild(p);c.appendChild(el("p","dg-reco-consigne",r.exercice.consigne));}
   const actions=el("div","dg-reco-actions");
   if(r.fiche){const a=el("a","","Revoir : "+r.fiche[1]);a.href=r.fiche[0];actions.appendChild(a);}
   if(r.objectif&&libelleObjectif(r.objectif)){
    const deja=objectifActif(r.objectif);
    const b=el("button","btn ghost dg-objectif",deja?"Dans mes objectifs : "+libelleObjectif(r.objectif).toLowerCase():"Ajouter à mes objectifs");
    b.type="button";b.disabled=deja;
    b.addEventListener("click",()=>{ajouterObjectif(r.objectif);b.textContent="Dans mes objectifs : "+libelleObjectif(r.objectif).toLowerCase();b.disabled=true;});
    actions.appendChild(b);
   }
   c.appendChild(actions);box.appendChild(c);
  });
  return box;
 }
 let compteur=0;
 function formulaire(zone,cle,apres){
  const n=++compteur,d=lire(cle)||{ressenti:null,techniques:[],tactiques:[],positif:"",prochain:""};
  zone.textContent="";
  const f=el("form","dg-form");f.noValidate=true;
  f.appendChild(el("p","dg-intro","Bilan rapide et facultatif : réponds seulement à ce qui t'aide."));
  const groupe=(titre,type,nom,options,coches)=>{
   const fs=el("fieldset","dg-groupe");fs.appendChild(el("legend","",titre));
   const o=el("div","opts");
   options.forEach(([v,l])=>{const lab=el("label");const i=document.createElement("input");i.type=type;i.name=nom+"-"+n;i.value=v;i.checked=coches.includes(v);lab.append(i,l);o.appendChild(lab);});
   fs.appendChild(o);return fs;
  };
  f.appendChild(groupe("1. Ressenti général","radio","ressenti",DG_RESSENTI.map((l,i)=>[String(i+1),(i+1)+" · "+l]),d.ressenti?[String(d.ressenti)]:[]));
  f.appendChild(groupe("2. Difficultés techniques","checkbox","tech",DG_TECHNIQUES.map(t=>[t[0],t[1]]),d.techniques));
  f.appendChild(groupe("3. Difficultés tactiques","checkbox","tact",DG_TACTIQUES.map(t=>[t[0],t[1]]),d.tactiques));
  const champ=(titre,valeur,id)=>{const w=el("div","dg-champ");const l=el("label","",titre);l.htmlFor=id;const t=document.createElement("textarea");t.id=id;t.rows=2;t.maxLength=DG_TEXTE_MAX;t.value=valeur;w.append(l,t);return w;};
  f.appendChild(champ("4. Ton principal point positif (facultatif)",d.positif,"dg-positif-"+n));
  f.appendChild(champ("5. Ton objectif pour le prochain match (facultatif)",d.prochain,"dg-prochain-"+n));
  const msg=el("p","acc-msg acc-err");msg.setAttribute("role","status");msg.hidden=true;
  const btns=el("div","btns");
  const ok=el("button","btn primary","Enregistrer le bilan");ok.type="submit";btns.appendChild(ok);
  const annuler=el("button","btn ghost","Annuler");annuler.type="button";annuler.addEventListener("click",()=>apres(false));btns.appendChild(annuler);
  f.append(msg,btns);
  f.addEventListener("submit",e=>{
   e.preventDefault();
   const val=nom=>[...f.querySelectorAll('input[name="'+nom+"-"+n+'"]:checked')].map(i=>i.value);
   const r=val("ressenti")[0];
   const nouveau={ressenti:r?Number(r):null,techniques:val("tech"),tactiques:val("tact"),positif:f.querySelector("#dg-positif-"+n).value,prochain:f.querySelector("#dg-prochain-"+n).value};
   if(!dgNormaliser(nouveau)){msg.hidden=false;msg.textContent="Remplis au moins une réponse, ou clique sur « Annuler ».";return;}
   if(!enregistrer(cle,nouveau)){msg.hidden=false;msg.textContent="Le stockage de cet appareil est indisponible : le bilan n'a pas pu être gardé.";return;}
   apres(true);
  });
  zone.appendChild(f);
  const premier=f.querySelector("input");if(premier)premier.focus({preventScroll:true});
 }
 // Bloc complet pour un match : bilan existant (résumé, recommandations, modifier, supprimer) ou invitation.
 // options.direct : sans bilan, le formulaire s'ouvre tout de suite (journal de l'espace)
 function bloc(zone,cle,options){
  options=options||{};
  let direct=!!options.direct;
  const afficher=()=>{
   zone.textContent="";
   const d=lire(cle);
   if(!d&&direct){direct=false;formulaire(zone,cle,()=>afficher());return;}
   if(!d){
    if(options.invitation!==false){
     zone.appendChild(el("p","dg-question","Comment s'est passé ton match ?"));
     zone.appendChild(el("p","acc-muted","Une minute pour noter ce qui a coincé : tu reçois des exercices ciblés, et ton bilan reste attaché à ce match."));
    }
    const b=el("button","btn primary dg-ouvrir","Faire le bilan");b.type="button";
    b.addEventListener("click",()=>formulaire(zone,cle,()=>afficher()));
    zone.appendChild(b);return;
   }
   zone.appendChild(el("p","dg-question","Ton bilan de ce match"));
   zone.append(resume(d),recommandations(d));
   const btns=el("div","btns");
   const m=el("button","btn ghost","Modifier le bilan");m.type="button";m.addEventListener("click",()=>formulaire(zone,cle,()=>afficher()));
   const s=el("button","btn ghost dg-supprimer","Supprimer le bilan");s.type="button";
   s.addEventListener("click",()=>{
    if(s.dataset.confirme!=="1"){s.dataset.confirme="1";s.textContent="Confirmer la suppression";return;}
    supprimer(cle);afficher();const o=zone.querySelector(".dg-ouvrir");if(o)o.focus();
   });
   btns.append(m,s);zone.appendChild(btns);
  };
  afficher();
 }
 window.PA_DIAGNOSTIC={
  RESSENTI:DG_RESSENTI,TECHNIQUES:DG_TECHNIQUES,TACTIQUES:DG_TACTIQUES,
  cleMatch:dgCleMatch,normaliser:dgNormaliser,recommandations:dgRecommandations,difficultesDe:dgDifficultes,
  lire,existe:cle=>!!lire(cle),difficultes:()=>dgDifficultes(lireTous()),bloc,supprimer
 };
 if(window.PA_JOURNAL){window.PA_JOURNAL.onChange(fusionnerCompte);fusionnerCompte();}
})();
