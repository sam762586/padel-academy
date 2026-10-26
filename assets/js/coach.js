/* COACH IA (coach.html) : questions de padel au coach, réponses du modèle via la fonction Supabase « coach ».
   - Actif seulement si "coach" est dans PA_SUPABASE.activees et si le joueur est connecté (quota par jour, côté serveur).
   - La conversation reste sur l'appareil (pa-coach-conversation) ; seuls les derniers échanges partent avec la question.
   - Contexte du joueur (facultatif, case à cocher) : palier et priorités du test de niveau, rang FFT, derniers matchs comptés.
   - Les réponses sont affichées sans HTML : paragraphes, listes, gras, et liens seulement vers apprendre-padel.fr.
   Dépend de compte.js (PA_COMPTE.coach), et si présents de score.js / journal.js (PA_SCORE, PA_JOURNAL). */
const CO_CLE_CONVERSATION="pa-coach-conversation";
const CO_CLE_PARTAGE="pa-coach-partage";
const CO_MAX_CONSERVES=30;   // messages gardés sur l'appareil
const CO_MAX_ENVOYES=8;      // derniers messages envoyés avec la question
const CO_PALIERS=["Découverte","P25","P100","P250","P500","P1000 et +"];
const CO_THEMES={vitre:["Sorties de vitre","Comment mieux sortir de la vitre du fond, double vitre comprise ?"],
 service:["Service et première volée","Comment rendre mon service et ma première volée plus efficaces ?"],
 aerien:["Bandeja, víbora, smash","Bandeja ou víbora : comment choisir, et comment garder le filet ?"],
 couple:["Bouger avec son partenaire","Comment mieux bouger avec mon partenaire quand il se fait lober ?"],
 placement:["Placement au filet","Où me placer au filet pour ne plus me faire passer par les lobs ?"],
 montee:["Reprendre le filet","Quand faut-il monter au filet, et quand rester au fond ?"],
 regularite:["Régularité en défense","Comment faire moins de fautes directes en défense ?"],
 transition:["Balles basses et chiquita","Comment jouer les balles basses au milieu du court ?"],
 communication:["Communication","Que dire à mon partenaire pendant et entre les points ?"]};
// Nom affiché des pages du site citées par le coach (sinon l'adresse)
const CO_PAGES={"index.html":"Accueil","regles.html":"Règles","technique.html":"Technique","tactique.html":"Tactique","tutos.html":"Tutos","conseils.html":"Conseils",
 "niveau.html":"Test de niveau","entrainement.html":"Plan d'entraînement","score.html":"Compteur","materiel.html":"Matériel","competition.html":"Compétition",
 "bareme.html":"Barème","tournois.html":"Tournois","partenaires.html":"Partenaires","videos.html":"Vidéos","lexique.html":"Lexique","espace.html":"Mon espace","coach.html":"Coach IA"};
const CO_SUGGESTIONS_DE_BASE=["Je débute : sur quoi travailler en premier ?","Comment préparer mon premier tournoi P25 ?","Quelle raquette pour un joueur de gauche qui aime attaquer ?"];

(function(){
 const racine=document.getElementById("coach");
 if(!racine) return;
 const $=id=>document.getElementById(id);
 const el=(b,c,t)=>{const e=document.createElement(b);if(c)e.className=c;if(t!==undefined)e.textContent=t;return e;};
 const lire=(cle,defaut)=>{try{const v=JSON.parse(localStorage.getItem(cle)||"null");return v===null?defaut:v;}catch(e){return defaut;}};
 const ecrire=(cle,v)=>{try{localStorage.setItem(cle,JSON.stringify(v));}catch(e){}};
 const compte=window.PA_COMPTE;
 const actif=()=>!!(compte&&compte.actif&&((window.PA_SUPABASE||{}).activees||[]).includes("coach"));
 const nombre=n=>n.toLocaleString("fr-FR");

 // ---- Conversation (appareil) ----
 function conversation(){const c=lire(CO_CLE_CONVERSATION,[]);return Array.isArray(c)?c.filter(m=>m&&(m.role==="user"||m.role==="assistant")&&typeof m.texte==="string"):[];}
 function garder(c){ecrire(CO_CLE_CONVERSATION,c.slice(-CO_MAX_CONSERVES));}

 // ---- Contexte du joueur ----
 function contexte(){
  const c={},details=[];
  const q=lire("pa-quiz-dernier",null);
  if(q&&Number.isInteger(q.palier)&&CO_PALIERS[q.palier]){
   c.palier=CO_PALIERS[q.palier];details.push("Palier au test de niveau : "+c.palier);
   const p=(Array.isArray(q.priorites)?q.priorites:[]).filter(t=>CO_THEMES[t]).map(t=>CO_THEMES[t][0]);
   if(p.length){c.priorites=p;details.push("Priorités : "+p.join(", "));}
  }
  const r=lire("pa-classement-fft",null);
  if(r&&Number.isInteger(r.rang)&&["messieurs","dames"].includes(r.sexe)){c.classement=nombre(r.rang)+"e "+r.sexe;details.push("Classement FFT : "+c.classement);}
  const J=window.PA_JOURNAL,S=window.PA_SCORE;
  if(J&&S){
   const comptes=J.liste().filter(m=>m.pointsTotal>0&&m.motifsPerdus).slice(0,10);
   if(comptes.length){
    const perdus={};let total=0;
    comptes.forEach(m=>Object.entries(m.motifsPerdus).forEach(([k,n])=>{perdus[k]=(perdus[k]||0)+n;total+=n;}));
    const libelle=id=>(S.MOTIFS.find(x=>x.id===id)||{}).label||id;
    const top=Object.entries(perdus).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([k,n])=>libelle(k).toLowerCase()+" "+Math.round(100*n/total)+" %");
    const gagnes=comptes.filter(m=>m.vainqueur===0).length;
    c.matchs=comptes.length+" match"+(comptes.length>1?"s":"")+" ("+gagnes+" gagné"+(gagnes>1?"s":"")+")"+(top.length?" ; points perdus surtout sur : "+top.join(", "):"");
    details.push("Derniers matchs : "+c.matchs);
   }
  }
  return {c,details,priorites:(q&&Array.isArray(q.priorites)?q.priorites:[]).filter(t=>CO_THEMES[t])};
 }
 const partage=()=>lire(CO_CLE_PARTAGE,true)!==false;

 // ---- Affichage d'une réponse : texte brut mis en forme, liens internes seulement ----
 function enLigne(parent,texte){
  const morceaux=texte.split(/(\*\*[^*]+\*\*|https?:\/\/[^\s)»"]+)/);
  morceaux.forEach(m=>{
   if(!m) return;
   if(/^\*\*[^*]+\*\*$/.test(m)){parent.appendChild(el("b","",m.slice(2,-2)));return;}
   if(/^https?:\/\//.test(m)){
    const url=m.replace(/[.,;:!?]+$/,""),reste=m.slice(url.length);
    if(/^https:\/\/(www\.)?apprendre-padel\.fr\//.test(url)){
     const chemin=url.replace(/^https:\/\/(www\.)?apprendre-padel\.fr\//,""),page=chemin.split(/[#?]/)[0];
     const a=el("a","",CO_PAGES[page]?"page "+CO_PAGES[page]:chemin);a.href=chemin;parent.appendChild(a);
    }
    else parent.appendChild(document.createTextNode(url));
    if(reste) parent.appendChild(document.createTextNode(reste));
    return;
   }
   parent.appendChild(document.createTextNode(m));
  });
 }
 function miseEnForme(texte){
  const f=document.createDocumentFragment();
  texte.replace(/\r/g,"").split(/\n{2,}/).forEach(bloc=>{
   const lignes=bloc.split("\n").map(l=>l.trim()).filter(Boolean);
   if(!lignes.length) return;
   const liste=lignes.every(l=>/^([-•*]|\d+[.)])\s+/.test(l));
   if(liste){
    const ol=/^\d/.test(lignes[0]),ul=el(ol?"ol":"ul");
    lignes.forEach(l=>{const li=el("li");enLigne(li,l.replace(/^([-•*]|\d+[.)])\s+/,""));ul.appendChild(li);});
    f.appendChild(ul);
   }else{
    const p=el("p");
    lignes.forEach((l,i)=>{if(i)p.appendChild(el("br"));enLigne(p,l.replace(/^#+\s*/,""));});
    f.appendChild(p);
   }
  });
  return f;
 }
 function bulle(m){
  const b=el("div","coach-msg coach-"+(m.role==="user"?"joueur":m.role==="erreur"?"erreur":"coach"));
  b.appendChild(el("span","coach-qui",m.role==="user"?"Toi":m.role==="erreur"?"Coach indisponible":"Coach"));
  if(m.role==="assistant") b.appendChild(miseEnForme(m.texte)); else b.appendChild(el("p","",m.texte));
  return b;
 }

 // ---- Écran ----
 let envoiEnCours=false,restant=null;
 function rendreFil(attente,erreur){
  const fil=$("coach-fil");fil.textContent="";
  const c=conversation();
  if(!c.length){
   const v=el("div","coach-vide");
   v.append(el("p","","Pose une question sur ton jeu : un coup, un placement, une tactique, ton matériel, un tournoi. Le coach s'appuie sur les pages du site et, si tu le veux, sur ton profil."));
   fil.appendChild(v);
  }
  c.forEach(m=>fil.appendChild(bulle(m)));
  if(attente){const a=el("div","coach-msg coach-coach coach-attente");a.append(el("span","coach-qui","Coach"),el("p","","Le coach réfléchit…"));fil.appendChild(a);}
  if(erreur) fil.appendChild(bulle({role:"erreur",texte:erreur}));
  // Suggestions : seulement pour démarrer une conversation
  const s=$("coach-suggestions");s.textContent="";
  if(!c.length&&!attente){
   const {priorites}=contexte();
   const liste=[...priorites.slice(0,2).map(t=>CO_THEMES[t][1]),...CO_SUGGESTIONS_DE_BASE].slice(0,3);
   liste.forEach(q=>{const b=el("button","coach-suggestion",q);b.type="button";b.addEventListener("click",()=>{$("coach-question").value=q;envoyer();});s.appendChild(b);});
  }
  $("coach-nouvelle").hidden=!c.length;
  $("coach-restant").textContent=restant===null?"":restant>0?"Encore "+restant+" question"+(restant>1?"s":"")+" aujourd'hui":"Plus de question aujourd'hui : à demain";
  const dernier=fil.lastElementChild;
  if(dernier&&(attente||erreur||c.length)) dernier.scrollIntoView({block:"nearest"});
 }
 function rendreContexte(){
  const {details}=contexte(),ul=$("coach-contexte-liste");ul.textContent="";
  if(!details.length) ul.appendChild(el("li","","Rien pour l'instant. Passe le test de niveau, saisis ton classement dans ton espace ou compte un match : le coach adaptera ses réponses."));
  details.forEach(d=>ul.appendChild(el("li","",d)));
  $("coach-partage").checked=partage();
 }
 async function envoyer(){
  if(envoiEnCours) return;
  const champ=$("coach-question"),question=champ.value.trim();
  if(!question){champ.focus();return;}
  envoiEnCours=true;$("coach-envoyer").disabled=true;
  const avant=conversation();
  const historique=avant.slice(-CO_MAX_ENVOYES).map(m=>({role:m.role,texte:m.texte}));
  const c=[...avant,{role:"user",texte:question,date:new Date().toISOString()}];
  garder(c);champ.value="";
  rendreFil(true);
  const r=await compte.coach({question,historique,contexte:partage()?contexte().c:{}});
  if(r.restant!==null&&r.restant!==undefined) restant=r.restant;
  envoiEnCours=false;$("coach-envoyer").disabled=false;
  if(r.ok){garder([...c,{role:"assistant",texte:r.reponse,date:new Date().toISOString()}]);rendreFil(false);}
  else{
   // Question non traitée : retirée de la conversation et remise dans le champ
   garder(avant);champ.value=question;rendreFil(false,r.message);
  }
 }
 function statut(){
  const z=$("coach-statut");z.textContent="";
  $("coach-zone").hidden=true;
  if(!actif()){
   z.append(el("p","coach-info","Le coach IA arrive bientôt sur Apprendre Padel. En attendant, le test de niveau et les exercices de ton espace joueur te donnent déjà tes priorités."));
   const b=el("div","btns");const a=el("a","btn primary","Passer le test de niveau");a.href="niveau.html";const e=el("a","btn ghost","Mon espace");e.href="espace.html";b.append(a,e);z.appendChild(b);
   return;
  }
  if(!compte.user){
   const p=el("p","coach-info");const a=el("a","","Connecte-toi");a.href="compte.html";
   p.append(a," pour poser tes questions au coach : c'est gratuit, dans la limite de quelques questions par jour.");
   z.appendChild(p);return;
  }
  $("coach-zone").hidden=false;
  rendreContexte();rendreFil(false);
 }

 $("coach-form").addEventListener("submit",e=>{e.preventDefault();envoyer();});
 $("coach-question").addEventListener("keydown",e=>{if(e.key==="Enter"&&(e.ctrlKey||e.metaKey)){e.preventDefault();envoyer();}});
 $("coach-nouvelle").addEventListener("click",()=>{garder([]);rendreFil(false);$("coach-question").focus();});
 $("coach-partage").addEventListener("change",e=>ecrire(CO_CLE_PARTAGE,e.target.checked));
 if(compte&&compte.actif){compte.onChange(statut);compte.ready.then(statut);}
 statut();
})();
