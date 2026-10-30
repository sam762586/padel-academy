/* TABLEAU DE BORD « MON PADEL » (compte.html)
   Fonctionne sans compte : il lit ce qui est gardé sur l'appareil (résultats du simulateur de barème,
   matchs du compteur, favoris tournois, rang saisi). Connecté, il ajoute les matchs enregistrés dans le compte.
   Dépend de bareme-donnees.js (PA_BAREME) et score.js (PA_SCORE), chargés avant. */
const MP_CLE_RANG="pa-classement-fft";
const MP_CLE_FAVORIS="pa-tournois-favoris"; // tableau d'identifiants Ten'Up (rempli par la page Tournois)
const MP_CATEGORIES_CUT=["P25","P50","P100","P250"];
const MP_NB_MATCHS=5;

(function(){
 const racine=document.getElementById("mon-padel");
 if(!racine||!window.PA_BAREME||!window.PA_SCORE)return;
 const B=window.PA_BAREME,S=window.PA_SCORE;
 const $=id=>document.getElementById(id);
 const nombre=n=>n.toLocaleString("fr-FR");
 const dateCourte=iso=>new Date(iso).toLocaleDateString("fr-FR",{day:"numeric",month:"short"});
 function lireJSON(cle,defaut){try{const v=JSON.parse(localStorage.getItem(cle)||"null");return v===null?defaut:v;}catch(e){return defaut;}}
 function el(balise,classe,texte){const e=document.createElement(balise);if(classe)e.className=classe;if(texte!==undefined)e.textContent=texte;return e;}
 const aujourdhui=()=>B.simIso(new Date());
 const dansJours=n=>{const d=new Date();d.setDate(d.getDate()+n);return B.simIso(d);};

 /* ---------- 1. Classement estimé (résultats du simulateur) ---------- */
 function rendreClassement(){
  const zone=$("mp-points");zone.textContent="";
  const resultats=lireJSON(B.SIM_KEY,[]);
  const maintenant=B.classementEstime(resultats,aujourdhui());
  const dans30=B.classementEstime(resultats,dansJours(30));
  if(!B.simNormaliser(resultats).length){
   zone.append(el("p","acc-muted","Aucun résultat saisi. Ajoute tes tournois des 12 derniers mois dans le simulateur du barème : ton total s'affichera ici."));
   return;
  }
  const chiffres=el("div","mp-chiffres");
  const bloc=(valeur,libelle,classe)=>{const d=el("div","mp-chiffre"+(classe?" "+classe:""));d.append(el("b","",valeur),el("span","",libelle));return d;};
  const perte=maintenant.total-dans30.total;
  chiffres.append(
   bloc(nombre(maintenant.total),`points · ${maintenant.retenus.length} résultat${maintenant.retenus.length>1?"s":""} retenu${maintenant.retenus.length>1?"s":""} sur 12`),
   bloc(perte>0?"−"+nombre(perte):"0",perte>0?`points qui sortent d'ici 30 jours (total : ${nombre(dans30.total)})`:"point qui sort dans les 30 prochains jours",perte>0?"alerte":"")
  );
  zone.appendChild(chiffres);
  // Résultats qui expirent dans les 30 jours : la date à laquelle il faut les remplacer
  const sortants=maintenant.retenus.filter(r=>B.simExpire(r.date)<=dansJours(30)).sort((a,b)=>a.date<b.date?-1:1);
  if(sortants.length){
   const liste=el("ul","mp-liste");
   sortants.forEach(r=>{
    const fin=B.simLireDate(B.simExpire(r.date));
    liste.append(el("li","",`${r.cat}, ${B.PLACE_LABEL(r.place-1)} : ${nombre(r.pts)} pts, sortent le ${fin.toLocaleDateString("fr-FR",{day:"numeric",month:"long"})}`));
   });
   zone.appendChild(liste);
  }
 }

 /* ---------- 2. Rang Ten'Up saisi et prochain cut ---------- */
 const formRang=$("mp-form-rang");
 function lireRang(){
  const r=lireJSON(MP_CLE_RANG,null);
  return r&&Number.isInteger(r.rang)&&r.rang>=1&&r.rang<=500000&&["messieurs","dames"].includes(r.sexe)?r:null;
 }
 function rendreRang(){
  const zone=$("mp-palier"),r=lireRang();zone.textContent="";
  if(!r){zone.append(el("p","acc-muted","Saisis ton classement FFT (visible sur Ten'Up) pour savoir quelles catégories te sont ouvertes et à combien de places tu es du prochain seuil de catégorie."));return;}
  formRang.elements["mp-rang"].value=String(r.rang);
  formRang.querySelector(`input[name="mp-sexe"][value="${r.sexe}"]`).checked=true;
  // Un cut ferme la catégorie aux joueurs classés à ce rang ou mieux
  const ouvertes=MP_CATEGORIES_CUT.filter(c=>r.rang>B.CUTS_NUM[c][r.sexe]);
  const prochain=MP_CATEGORIES_CUT.filter(c=>r.rang>B.CUTS_NUM[c][r.sexe]).map(c=>({c,cut:B.CUTS_NUM[c][r.sexe]})).sort((a,b)=>b.cut-a.cut)[0];
  const p1=el("p","mp-palier-ligne");
  p1.append("Avec le rang ",el("b","",nombre(r.rang)+"e")," ("+r.sexe+"), tu peux t'inscrire en ",el("b","",[...ouvertes,"P500 et plus"].join(", ")),".");
  zone.appendChild(p1);
  if(prochain){
   const p2=el("p","mp-palier-ligne");
   p2.append("Prochain palier : ",el("b","","Top "+nombre(prochain.cut)),`, encore ${nombre(r.rang-prochain.cut)} places. Une fois dedans, les ${prochain.c} te seront fermés.`);
   zone.appendChild(p2);
  }
  zone.append(el("p","note",`Cuts relevés sur Ten'Up (tableau de la page Barème). Ton rang évolue chaque mois avec les points de tous les joueurs : vérifie-le sur Ten'Up. Saisi le ${new Date(r.maj).toLocaleDateString("fr-FR")}.`));
 }
 formRang.addEventListener("submit",e=>{
  e.preventDefault();
  const champ=formRang.elements["mp-rang"],rang=Number(champ.value);
  const sexe=formRang.querySelector('input[name="mp-sexe"]:checked').value;
  const msg=$("mp-rang-msg");
  if(!Number.isInteger(rang)||rang<1||rang>500000){msg.hidden=false;msg.textContent="Saisis un rang entre 1 et 500 000.";champ.focus();return;}
  try{localStorage.setItem(MP_CLE_RANG,JSON.stringify({rang,sexe,maj:new Date().toISOString()}));msg.hidden=true;}
  catch(err){msg.hidden=false;msg.textContent="Le stockage de cet appareil est indisponible : le rang ne sera pas gardé.";}
  rendreRang();
  if(window.PA_JOUEUR)window.PA_JOUEUR.synchroniser();
 });

 /* ---------- 3. Derniers matchs du compteur et tendance ---------- */
 let matchsServeur=[];
 function matchsFusionnes(){
  // Espace joueur : le journal (journal.js) réunit déjà compteur, matchs saisis après coup et compte
  if(window.PA_JOURNAL)return window.PA_JOURNAL.liste().map(m=>({fin:m.fin,nomA:m.partenaire?"Avec "+m.partenaire:"Nous",nomB:m.adversaires,score:m.score,vainqueur:m.vainqueur,interrompu:m.interrompu,
   gagnes:m.pointsGagnes,total:m.pointsTotal}));
  const locaux=lireJSON(S.CLE_HISTORIQUE,[]);
  const liste=[];
  (Array.isArray(locaux)?locaux:[]).forEach(m=>{
   if(m&&S.configValide(m.config)&&S.pointsValides(m.points)&&!Number.isNaN(Date.parse(m.fin)))
    liste.push({fin:m.fin,nomA:m.config.nomA,nomB:m.config.nomB,score:m.score||"",vainqueur:m.vainqueur,interrompu:!!m.interrompu,gagnes:m.points.filter(p=>p.g===0).length,total:m.points.length});
  });
  matchsServeur.forEach(m=>{
   if(!m||!S.pointsValides(m.points)||Number.isNaN(Date.parse(m.joue_le)))return;
   // Un match présent sur l'appareil ET dans le compte n'est affiché qu'une fois
   // (comparaison à la seconde : le format de date renvoyé par la base peut différer de celui de l'appareil)
   const seconde=d=>Math.floor(Date.parse(d)/1000);
   if(liste.some(x=>seconde(x.fin)===seconde(m.joue_le)&&x.score===m.score))return;
   liste.push({fin:m.joue_le,nomA:m.nom_a,nomB:m.nom_b,score:m.score||"",vainqueur:m.vainqueur,interrompu:!!m.interrompu,gagnes:m.points.filter(p=>p&&p.g===0).length,total:m.points.length});
  });
  return liste.sort((a,b)=>Date.parse(b.fin)-Date.parse(a.fin));
 }
 // % de points gagnés par la paire 1 (toi)
 // null pour un match saisi après coup (pas de détail des points)
 const pctPoints=m=>m.total?Math.round(100*m.gagnes/m.total):null;
 function rendreMatchs(){
  const zone=$("mp-matchs"),matchs=matchsFusionnes();zone.textContent="";
  if(!matchs.length){zone.append(el("p","acc-muted","Aucun match compté pour l'instant. Lance le compteur au prochain match : la paire 1, c'est toi."));return;}
  const derniers=matchs.slice(0,MP_NB_MATCHS);
  const victoires=derniers.filter(m=>m.vainqueur===0).length;
  const resume=el("p","mp-tendance");
  resume.append(el("b","",`${victoires} victoire${victoires>1?"s":""} sur ${derniers.length}`)," dernier"+(derniers.length>1?"s":"")+" match"+(derniers.length>1?"s":""));
  // Tendance : % de points gagnés sur les 3 derniers matchs contre les 3 précédents
  const comptes=matchs.filter(m=>pctPoints(m)!==null);
  if(comptes.length>=4){
   const moyenne=l=>l.reduce((s,m)=>s+pctPoints(m),0)/l.length;
   const recent=moyenne(comptes.slice(0,3)),avant=moyenne(comptes.slice(3,6)),ecart=Math.round(recent-avant);
   const sens=ecart>=3?["hausse","↗ en progrès"]:ecart<=-3?["baisse","↘ en baisse"]:["stable","→ stable"];
   const t=el("span","mp-sens "+sens[0],sens[1]);
   t.title=`${Math.round(recent)} % de points gagnés sur les 3 derniers matchs, contre ${Math.round(avant)} % avant`;
   resume.append(" · ",t,el("span","acc-muted",` (${Math.round(recent)} % des points sur les 3 derniers, ${Math.round(avant)} % avant)`));
  }
  zone.appendChild(resume);
  const liste=el("ul","mp-matchs");
  derniers.forEach(m=>{
   const li=el("li");
   const issue=m.vainqueur===0?["v","V"]:m.vainqueur===1?["d","D"]:["n","–"];
   const badge=el("span","mp-issue "+issue[0],issue[1]);
   badge.setAttribute("aria-label",m.vainqueur===0?"Victoire":m.vainqueur===1?"Défaite":"Match arrêté");
   const texte=el("span","mp-match-texte");
   texte.append(el("span","mp-match-date",dateCourte(m.fin)),el("span","mp-match-noms",`${m.nomA} – ${m.nomB}`),el("span","mp-match-score",(m.score||"–")+(m.interrompu?" (arrêté)":"")));
   const pct=pctPoints(m);
   const barre=el("span","mp-pct");barre.setAttribute("aria-label",pct===null?"Points non comptés":`${pct} % des points gagnés`);
   const rempli=el("span","mp-pct-rempli");rempli.style.width=(pct||0)+"%";barre.append(rempli);
   li.append(badge,texte,barre,el("span","mp-pct-val",pct===null?"–":pct+" %"));
   liste.appendChild(li);
  });
  zone.appendChild(liste);
 }
 async function chargerMatchsCompte(){
  if(window.PA_JOURNAL){rendreMatchs();return;} // le journal charge lui-même les matchs du compte
  const compte=window.PA_COMPTE;
  if(!compte||!compte.actif||typeof compte.loadMatches!=="function")return;
  await compte.ready;
  const proprietaire=compte.user&&compte.user.id;
  if(!proprietaire){matchsServeur=[];rendreMatchs();return;}
  const reponse=await compte.loadMatches(20);
  // Réponse d'une session précédente (déconnexion ou changement de compte entre-temps) : ignorée
  if(!compte.user||compte.user.id!==proprietaire)return;
  matchsServeur=reponse.ok?reponse.matchs:[];
  rendreMatchs();
 }

 /* ---------- 4. Prochains tournois favoris ---------- */
 async function rendreFavoris(){
  const zone=$("mp-favoris");zone.textContent="";
  const ids=lireJSON(MP_CLE_FAVORIS,[]);
  const favoris=Array.isArray(ids)?ids.filter(x=>typeof x==="string"&&/^[0-9A-Za-z_-]{1,20}$/.test(x)):[];
  if(!favoris.length){zone.append(el("p","acc-muted","Aucun tournoi en favori pour l'instant."));return;}
  let donnees=null;
  try{const r=await fetch("assets/data/tournois.json",{cache:"no-cache"});if(r.ok)donnees=await r.json();}catch(e){}
  if(!donnees||!Array.isArray(donnees.tournois)){zone.append(el("p","acc-muted","Liste des tournois indisponible pour le moment."));return;}
  const jour=aujourdhui();
  const prochains=donnees.tournois.filter(t=>t&&favoris.includes(String(t.id))&&(t.date_fin||t.date_debut)>=jour)
   .sort((a,b)=>a.date_debut<b.date_debut?-1:1).slice(0,5);
  if(!prochains.length){zone.append(el("p","acc-muted","Aucun de tes tournois favoris n'est à venir."));return;}
  const liste=el("ul","mp-liste");
  prochains.forEach(t=>{
   const li=el("li");
   li.append(el("b","",B.simLireDate(t.date_debut)?B.simLireDate(t.date_debut).toLocaleDateString("fr-FR",{day:"numeric",month:"short"}):t.date_debut)," · ",
    `${t.categorie} ${t.nom&&t.nom!==t.categorie?"« "+t.nom+" » ":""}à ${t.ville}`);
   liste.appendChild(li);
  });
  zone.appendChild(liste);
 }

 rendreClassement();rendreRang();rendreMatchs();rendreFavoris();
 if(window.PA_FAVORIS)window.PA_FAVORIS.onChange(()=>rendreFavoris());
 // Espace joueur : résultats et rang synchronisés avec le compte (joueur-sync.js)
 if(window.PA_JOUEUR)window.PA_JOUEUR.onChange(()=>{rendreClassement();rendreRang();});
 if(window.PA_JOURNAL)window.PA_JOURNAL.onChange(()=>rendreMatchs());
 chargerMatchsCompte();
 if(window.PA_COMPTE&&window.PA_COMPTE.actif)window.PA_COMPTE.onChange(chargerMatchsCompte);
 // Retour sur l'onglet (après avoir saisi un résultat ou compté un match ailleurs) : on rafraîchit
 document.addEventListener("visibilitychange",()=>{if(!document.hidden){rendreClassement();rendreMatchs();rendreFavoris();}});
})();
