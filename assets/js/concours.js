/* JEU CONCOURS (concours.html) : partie interactive des concours écrits dans la page par scripts/generer-concours.js.
   Données : CONCOURS (assets/js/concours-donnees.js). Base : migrations supabase/migrations/2026-11-01-concours-01 à 17
     public.concours                    lecture publique (tire_le : tirage fait)
     public.concours_participations     ajout pour soi pendant la période, lecture et retrait de sa ligne tant que c'est ouvert
     public.concours_nb_participants()  compteur, lisible par tous
     public.concours_gagnants           le gagnant lit sa propre ligne
     public.concours_exclusions         le joueur écarté lit sa ligne (motif) ; nombre public : concours.nb_exclusions
   Aucune donnée de gagnant dans concours-donnees.js (seulement tire:true) : gagnants, empreintes et pseudos acceptés
   viennent de la rpc concours_gagnants_publics.
   Concours mis en avant : celui qui est ouvert, sinon le prochain, sinon le dernier terminé, tant que le tirage n'est pas
   fait puis 60 jours après le tirage (tire_le). Les autres concours de la page reçoivent seulement leur état (terminé, à venir).
   États du concours mis en avant : non activé (« bientôt disponible », aucun appel à la base tant que "concours" n'est
   pas dans PA_SUPABASE.activees), pas de compte possible (hors ligne, fichier ouvert en local), à venir, non connecté,
   formulaire (deux cases obligatoires), « Tu participes » avec retrait, terminé en attente du tirage, tiré (« Tu as gagné »).
   Concours annulé (champ annule, règlement article 7.3) : statut et excuses écrits dans la page par le générateur, gardés
   tels quels ; plus de formulaire, de compteur ni de partage, aucune écriture de participation. Joueur connecté : lecture
   de sa propre participation seulement ; s'il avait participé, « Tu avais participé. » et le bouton de retrait (la base
   peut le refuser : on renvoie alors vers l'organisateur). Un concours annulé n'est jamais « ouvert » ni « à venir ».
   Concours tiré (règlement, article 3) : graine (colonne publique concours.graine), méthode, empreintes des gagnants
   (rpc concours_gagnants_publics : pseudo seulement après accord) ; le gagnant peut cocher « afficher mon pseudo »
   (update de affiche_publiquement sur sa ligne) ; le joueur connecté qui a participé voit son empreinte SHA-256 de
   « graine:son identifiant », calculée dans le navigateur, comparée à celle du dernier gagnant. Seul l'identifiant du
   joueur connecté sert à ce calcul : celui d'un autre joueur n'est jamais demandé ni affiché.
   Rien n'est gardé sur l'appareil ; les textes venant de la base passent par textContent. Dépend de compte.js (PA_COMPTE). */
(function(){
 "use strict";
 const racine=document.getElementById("concours");
 if(!racine) return;
 const LISTE=typeof CONCOURS!=="undefined"&&Array.isArray(CONCOURS)?CONCOURS:[];
 if(!LISTE.length) return; // page générée avec « Aucun concours en ce moment »

 /* ---------- Réglages ---------- */
 const ACTIVE=(((window.PA_SUPABASE||{}).activees)||[]).includes("concours");
 // Un concours terminé reste mis en avant tant que le tirage n'est pas fait, puis 60 jours après le tirage (tire_le) :
 // c'est aussi la durée de conservation des gagnants dans la base (purger_concours, concours-12)
 const JOURS_APRES_TIRAGE=60;
 const SUITE_CONNEXION="connexion.html?suite=concours.html";
 const MOIS=["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];
 // Erreurs levées par le déclencheur concours-05 -> messages lisibles
 const ERREURS={
  CONCOURS_INCONNU:"Ce concours n'est pas encore ouvert en ligne. Réessaie un peu plus tard.",
  CONCOURS_PAS_COMMENCE:"Le jeu n'a pas encore commencé.",
  CONCOURS_TERMINE:"Le jeu est terminé\u00a0: les participations sont closes.",
  CASES_NON_COCHEES:"Coche les deux cases pour participer.",
  PARTICIPATION_EXCLUE:"Ta participation à ce concours a été écartée\u00a0: tu ne peux pas t'y inscrire à nouveau.",
  // concours-18 à 24 (annulation) : déclencheur, ou refus RLS de l'insertion
  CONCOURS_ANNULE:"Ce jeu a été annulé : il n'est plus possible de participer.",
  ORGANISATEUR_EXCLU:"Le compte de l'organisateur ne peut pas participer au jeu."
 };

 /* ---------- Utilitaires ---------- */
 function el(balise,classe,texte){
  const n=document.createElement(balise);
  if(classe) n.className=classe;
  if(texte!==undefined&&texte!==null) n.textContent=texte;
  return n;
 }
 function message(texte,genre,role){
  const p=el("p","msg msg-"+(genre||"info"),texte);
  p.setAttribute("role",role||"status");
  return p;
 }
 function bouton(texte,classe){
  const b=el("button","btn "+(classe||"primary"),texte);
  b.type="button";
  return b;
 }
 function occuper(b,texte){ b.disabled=true; b.setAttribute("aria-busy","true"); b.dataset.libelle=b.textContent; b.textContent=texte; }
 function liberer(b){ b.disabled=false; b.removeAttribute("aria-busy"); if(b.dataset.libelle) b.textContent=b.dataset.libelle; }
 function messageErreur(erreur){
  const texte=String((erreur&&(erreur.message||erreur.details))||"");
  for(const code in ERREURS) if(texte.includes(code)) return ERREURS[code];
  if(navigator.onLine===false) return "Pas de connexion internet\u00a0: réessaie quand tu seras en ligne.";
  return "Ça n'a pas marché. Réessaie dans un instant.";
 }
 // « 2026-12-01 » -> « 1er décembre 2026 » (même écriture que scripts/generer-concours.js)
 function dateLongue(iso){
  const [a,m,j]=iso.split("-").map(Number);
  return (j===1?"1er":j)+" "+MOIS[m-1]+" "+a;
 }
 // Instant (ms) d'une heure de Paris : début du jeu à 0 h, fin à 23 h 59 min 59 s, heure d'été comprise
 const FORMAT_PARIS=new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/Paris",hourCycle:"h23",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit"});
 function decalageParis(t){
  const parties=FORMAT_PARIS.formatToParts(new Date(t));
  const v=type=>Number(parties.find(p=>p.type===type).value);
  return Date.UTC(v("year"),v("month")-1,v("day"),v("hour"),v("minute"),v("second"))-t;
 }
 function instantParis(iso,h,min,s){
  const [a,m,j]=iso.split("-").map(Number);
  const t=Date.UTC(a,m-1,j,h,min,s);
  return t-decalageParis(t-decalageParis(t));
 }
 function phase(c,maintenant){
  if(maintenant<instantParis(c.date_debut,0,0,0)) return "avenir";
  if(maintenant<instantParis(c.date_fin,23,59,59)) return "ouvert";
  return "termine";
 }
 const estAnnule=c=>!!(c&&c.annule&&c.annule.le);
 // Jour de clôture : annulation, sinon date de fin (sert à choisir le dernier concours clos)
 const clotureDe=c=>estAnnule(c)?c.annule.le:c.date_fin;
 const zoneDe=c=>{
  const article=[...racine.querySelectorAll("article[data-concours]")].find(a=>a.dataset.concours===c.id);
  return article?article.querySelector("[data-action]"):null;
 };

 /* ---------- Concours annulé (règlement, article 7.3) ----------
    Le statut et les excuses viennent de la page (générateur) ; ici, seulement la participation du joueur connecté,
    lue sur sa propre ligne (RLS), et son retrait. Aucune insertion, aucun compteur, aucun partage. Affiché tant que
    les participations existent (article 6.3 : 90 jours après la date de fin prévue), puis simple statut. */
 function concoursAnnule(){
  const zone=zoneDe(vedette);
  if(Date.now()-instantParis(vedette.date_fin,23,59,59)>90*864e5){
   zone.closest("article").classList.remove("cc-vedette");
   aucunConcours();
   return;
  }
  const perso=el("div","cc-corps");
  const retourAnnule=el("div","cc-retour");
  zone.append(perso,retourAnnule);
  const ecrire=(texte,genre)=>retourAnnule.replaceChildren(texte?message(texte,genre,genre==="erreur"?"alert":"status"):"");
  const lienRetrait="Retrait impossible depuis cette page : écris à l'organisateur (adresse à l'article 1 du règlement), il supprimera ta participation.";
  let jeton=0;
  async function maj(){
   const mien=++jeton;
   perso.replaceChildren();
   if(!(ACTIVE&&C&&C.actif&&C.client)) return;
   try{ await C.ready; }catch(e){}
   if(mien!==jeton||!C.user) return;
   let participe=false;
   try{
    const r=await C.client.from("concours_participations").select("concours_id").eq("concours_id",vedette.id).maybeSingle();
    if(r.error) return; // lecture impossible : le texte général de la page suffit
    participe=!!r.data;
   }catch(e){ return; }
   if(mien!==jeton||!participe) return;
   const retirer=bouton("Retirer ma participation","ghost");
   retirer.addEventListener("click",async()=>{
    occuper(retirer,"Retrait…"); ecrire("");
    let r;
    try{ r=await C.client.from("concours_participations").delete().eq("concours_id",vedette.id).select("concours_id"); }
    catch(e){ r={error:e}; }
    if(r.error||!Array.isArray(r.data)||!r.data.length){
     liberer(retirer);
     ecrire(navigator.onLine===false?"Pas de connexion internet : réessaie quand tu seras en ligne.":lienRetrait,"erreur");
     return;
    }
    perso.replaceChildren();
    ecrire("Ta participation est retirée.","ok");
   });
   perso.replaceChildren(message("Tu avais participé.","info"),ligneBoutons(retirer));
  }
  maj();
  if(C&&typeof C.onChange==="function") C.onChange(()=>{ ecrire(""); maj(); });
 }

 /* ---------- Choix du concours mis en avant ---------- */
 const maintenant=Date.now();
 const ouverts=LISTE.filter(c=>!estAnnule(c)&&phase(c,maintenant)==="ouvert");
 const aVenir=LISTE.filter(c=>!estAnnule(c)&&phase(c,maintenant)==="avenir").sort((a,b)=>a.date_debut<b.date_debut?-1:1);
 // Terminés ou annulés : le plus récemment clos est candidat ; pour un terminé, la date du tirage, connue de la base
 // seulement, décide ensuite (majVedette)
 const recents=LISTE.filter(c=>estAnnule(c)||phase(c,maintenant)==="termine").sort((a,b)=>clotureDe(a)<clotureDe(b)?1:-1);
 const vedette=ouverts[0]||aVenir[0]||recents[0]||null;

 // Autres concours : leur état en une ligne, à la place du lien de connexion écrit pour la lecture sans JavaScript
 // (annulé : le statut écrit par le générateur reste tel quel)
 LISTE.filter(c=>c!==vedette&&!estAnnule(c)).forEach(c=>{
  const zone=zoneDe(c);
  if(!zone) return;
  const ph=phase(c,maintenant);
  zone.replaceChildren(el("p","cc-statut",ph==="avenir"?"À venir\u00a0: le jeu ouvre le "+dateLongue(c.date_debut)+"."
   :ph==="ouvert"?"Jeu ouvert jusqu'au "+dateLongue(c.date_fin)+" inclus."
   :c.tire?"Jeu terminé, tirage au sort fait.":"Jeu terminé."));
 });
 const etatPage=document.getElementById("cc-etat");
 function aucunConcours(){ if(etatPage){ etatPage.textContent="Aucun concours en ce moment, reviens bientôt."; etatPage.hidden=false; } }
 if(!vedette){ aucunConcours(); return; }
 const zone=zoneDe(vedette);
 if(!zone) return;
 zone.closest("article").classList.add("cc-vedette");
 const C=window.PA_COMPTE||null;
 if(estAnnule(vedette)){ concoursAnnule(); return; }

 /* ---------- Concours mis en avant ---------- */
 const finTexte=dateLongue(vedette.date_fin);
 let tour=0; // chaque nouvel affichage annule les réponses en retard du précédent

 // Compteur de participants (rpc lisible par tous) : place gardée, rempli quand le nombre arrive
 const compteur=el("p","cc-compteur"," ");
 async function majCompteur(){
  if(!(ACTIVE&&C&&C.actif&&C.client)) return;
  try{
   const r=await C.client.rpc("concours_nb_participants",{p_concours:vedette.id});
   if(r.error||typeof r.data!=="number"){ compteur.textContent=" "; return; }
   compteur.textContent=r.data===0?"Aucun participant pour l'instant.":r.data===1?"1 joueur participe.":r.data+" joueurs participent.";
  }catch(e){ compteur.textContent=" "; }
 }
 const corps=el("div","cc-corps");
 const retour=el("div","cc-retour"); // messages d'action (participation enregistrée, retrait, erreur)
 zone.replaceChildren(compteur,corps,retour);

 function afficher(...noeuds){ corps.replaceChildren(...noeuds); }
 function annoncer(texte,genre){ retour.replaceChildren(texte?message(texte,genre,genre==="erreur"?"alert":"status"):""); }
 function lienConnexion(texte){ const a=el("a","btn primary",texte); a.href=SUITE_CONNEXION; return a; }
 function ligneBoutons(...b){ const d=el("div","btns"); d.append(...b); return d; }

 // Lectures dans la base (appels décrits dans supabase/LISEZMOI.md, « Jeu concours ») : ligne publique du concours
 // (tirage fait, graine), participation et gain du joueur connecté (la RLS ne renvoie que sa propre ligne)
 // Toutes les colonnes : la ligne est publique et sans donnée personnelle ; nb_exclusions n'est lu que s'il existe
 async function lireConcours(){
  const r=await C.client.from("concours").select("*").eq("id",vedette.id).maybeSingle();
  if(r.error) throw r.error;
  return r.data||null;
 }
 async function lireParticipation(){
  const r=await C.client.from("concours_participations").select("concours_id,cree_le").eq("concours_id",vedette.id).maybeSingle();
  if(r.error) throw r.error;
  return !!r.data;
 }
 async function lireGain(){
  const r=await C.client.from("concours_gagnants").select("concours_id,rang,affiche_publiquement,empreinte").eq("concours_id",vedette.id).maybeSingle();
  if(r.error) throw r.error;
  return r.data||null;
 }
 // Participation écartée par l'organisateur (table concours_exclusions, sa propre ligne seulement) : motif affiché au joueur.
 // Table absente ou illisible : rien n'est affiché (l'erreur n'empêche pas le reste de la page)
 async function lireExclusion(){
  try{
   const r=await C.client.from("concours_exclusions").select("concours_id,motif").eq("concours_id",vedette.id).maybeSingle();
   return r.error?null:(r.data||null);
  }catch(e){ return null; }
 }
 function messageExclusion(ex){
  return message((ex.motif?"Ta participation a été écartée\u00a0: motif «\u00a0"+ex.motif+"\u00a0».":"Ta participation a été écartée.")+" Pour toute question, écris à l'organisateur (adresse à l'article 1 du règlement).","alerte");
 }
 // Résultat public : rang, pseudo seulement si le gagnant l'a accepté, empreinte (jamais d'identifiant)
 async function lireGagnantsPublics(){
  const r=await C.client.rpc("concours_gagnants_publics",{p_concours:vedette.id});
  if(r.error) throw r.error;
  return Array.isArray(r.data)?r.data.slice().sort((x,y)=>x.rang-y.rang):[];
 }
 // Empreinte SHA-256 (hexadécimale) du texte « graine:identifiant », encodé en UTF-8 : même calcul que la base (concours-09)
 async function empreinte(texte){
  if(!(window.crypto&&crypto.subtle&&window.TextEncoder)) return null;
  const octets=new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(texte)));
  return [...octets].map(o=>o.toString(16).padStart(2,"0")).join("");
 }
 const code=t=>el("code","cc-empreinte",t);

 // Bloc « Résultat du tirage », lisible par tous : graine, nombre de participations, méthode, empreintes des gagnants
 function blocResultat(ligne,gagnants){
  const bloc=el("div","cc-resultat");
  bloc.append(el("h3","","Résultat du tirage"));
  // Graine affich\u00e9e telle qu'enregistr\u00e9e dans la base, sans retouche (c'est elle qui sert au calcul)
  if(ligne&&ligne.graine){
   const p=el("p","","Graine du tirage, telle qu'enregistr\u00e9e\u00a0: "); p.append(code(ligne.graine)); bloc.append(p);
   bloc.append(el("p","cc-format","Format\u00a0: AAAA-MM-JJ:n1-n2-n3-n4-n5:e1-e2 (num\u00e9ros dans l'ordre de sortie)."));
  }
  if(ligne&&typeof ligne.nb_participants==="number"){
   let t="Participations au tirage\u00a0: "+ligne.nb_participants;
   if(typeof ligne.nb_exclusions==="number") t+=" \u00b7 participations \u00e9cart\u00e9es\u00a0: "+ligne.nb_exclusions;
   bloc.append(el("p","",t+"."));
  }
  bloc.append(el("p","cc-methode","Méthode\u00a0: pour chaque participation, empreinte SHA-256 (écriture hexadécimale) du texte «\u00a0graine:identifiant du compte\u00a0», encodé en UTF-8. "
   +(vedette.nb_gagnants>1?"Les "+vedette.nb_gagnants+" plus petites empreintes gagnent.":"La plus petite empreinte gagne.")));
  if(gagnants.length){
   const liste=el("ol","cc-gagnants");
   gagnants.forEach(g=>{
    const li=el("li");
    li.append(el("b","",g.pseudo||"Pseudo non publié")," · empreinte ",code(g.empreinte||""));
    liste.append(li);
   });
   bloc.append(liste);
  }else bloc.append(el("p","","Aucun gagnant\u00a0: il n'y avait aucune participation valable."));
  return bloc;
 }

 // Case « Afficher mon pseudo parmi les gagnants » (gagnant seulement : update de sa ligne de concours_gagnants)
 function caseAffichage(gain){
  const form=el("div","acc-form cc-form");
  const input=document.createElement("input");
  input.type="checkbox"; input.id="cc-case-pseudo"; input.checked=!!gain.affiche_publiquement;
  const label=el("label","cx-case"); label.htmlFor=input.id;
  label.append(input,el("span","","Afficher mon pseudo parmi les gagnants sur cette page (facultatif\u00a0: sans cette case, seule ton empreinte est affichée)"));
  const etat=el("div","cc-retour-pseudo");
  input.addEventListener("change",async()=>{
   const voulu=input.checked;
   input.disabled=true; etat.replaceChildren(el("p","chargement","Enregistrement…"));
   let r;
   try{ r=await C.client.from("concours_gagnants").update({affiche_publiquement:voulu}).eq("concours_id",vedette.id).select("concours_id"); }
   catch(e){ r={error:e}; }
   input.disabled=false;
   if(r.error||!Array.isArray(r.data)||!r.data.length){ input.checked=!voulu; etat.replaceChildren(message(messageErreur(r.error),"erreur","alert")); return; }
   etat.replaceChildren(message(voulu?"Ton pseudo est affiché parmi les gagnants.":"Ton pseudo n'est plus affiché\u00a0: seule ton empreinte reste visible.","ok"));
  });
  form.append(label,etat);
  return form;
 }

 async function majVedette(){
  const jeton=++tour;
  const encore=()=>jeton===tour;
  const ph=phase(vedette,Date.now());
  if(!ACTIVE){
   // Fonction pas encore activée (SQL non exécuté) : aucune requête vers la base
   afficher(ph==="termine"?message("Le jeu est terminé.","info")
    :message("La participation en ligne au jeu concours sera bientôt disponible. Reviens dans quelques jours\u00a0!","info"));
   return;
  }
  if(!C||!C.actif||!C.client){
   afficher(message("La participation demande une connexion internet\u00a0: ouvre cette page en ligne, sur apprendre-padel.fr, pour participer.","alerte"));
   return;
  }
  afficher(el("p","chargement","Chargement…"));
  try{ await C.ready; }catch(e){}
  if(!encore()) return;
  majCompteur();
  const uid=C.user?C.user.id:null;
  try{
   if(ph==="avenir"){
    const noeuds=[message("Le jeu ouvre le "+dateLongue(vedette.date_debut)+". Reviens ce jour-là pour participer.","info")];
    if(!uid) noeuds.push(ligneBoutons(lienConnexion("Créer mon compte gratuit")));
    afficher(...noeuds);
    return;
   }
   if(ph==="ouvert"){
    if(!uid){
     afficher(message("Connecte-toi pour participer\u00a0: c'est gratuit, une participation par compte.","info"),ligneBoutons(lienConnexion("Me connecter pour participer")));
     return;
    }
    // Écartée par l'organisateur (la participation est alors supprimée) : motif, et plus de formulaire
    const [participe,exclusion]=await Promise.all([lireParticipation(),lireExclusion()]);
    if(!encore()) return;
    if(exclusion){ afficher(messageExclusion(exclusion)); return; }
    if(participe) montrerParticipation(); else montrerFormulaire();
    return;
   }
   // Terminé : tirage fait si la base l'indique (tire_le)
   const ligne=await lireConcours();
   if(!encore()) return;
   // Tiré depuis plus de 60 jours : plus mis en avant (résultat effacé de la base), simple ligne d'état comme les autres
   if(ligne&&ligne.tire_le&&Date.now()-Date.parse(ligne.tire_le)>JOURS_APRES_TIRAGE*864e5){
    zone.closest("article").classList.remove("cc-vedette");
    zone.replaceChildren(el("p","cc-statut","Jeu terminé, tirage au sort fait."));
    aucunConcours();
    return;
   }
   if(!(ligne&&ligne.tire_le)){
    const noeuds=[message("Le jeu est terminé. Le tirage au sort a lieu dans les 7 jours qui suivent le premier tirage EuroMillions après le "+finTexte+" (article 3 du règlement).","info")];
    if(uid){
     const [participe,exclusion]=await Promise.all([lireParticipation(),lireExclusion()]);
     if(exclusion) noeuds.push(messageExclusion(exclusion));
     else if(participe) noeuds.push(message("Tu participes au tirage. Bonne chance\u00a0!","ok"));
    }
    if(!encore()) return;
    afficher(...noeuds);
    return;
   }
   const gagnants=await lireGagnantsPublics();
   if(!encore()) return;
   if(!uid){
    const p=message("Le tirage au sort a eu lieu. Si tu as participé, ","info");
    const a=el("a","","connecte-toi pour voir si tu as gagné");a.href=SUITE_CONNEXION;
    p.append(a,".");
    afficher(p,blocResultat(ligne,gagnants));
    return;
   }
   const [gain,participe,exclusion]=await Promise.all([lireGain(),lireParticipation(),lireExclusion()]);
   if(!encore()) return;
   const noeuds=[];
   if(exclusion&&!gain){
    noeuds.push(messageExclusion(exclusion),blocResultat(ligne,gagnants));
    afficher(...noeuds);
    return;
   }
   if(gain){
    const p=message("","ok");
    p.append(el("b","","Tu as gagné\u00a0!"),"Regarde ta boîte e-mail (et tes courriers indésirables)\u00a0: un message t'attend pour l'envoi de ton lot.");
    noeuds.push(p,caseAffichage(gain));
   }else if(participe) noeuds.push(message("Le tirage au sort a eu lieu. Tu n'as pas gagné cette fois\u00a0: merci d'avoir joué, et à bientôt pour le prochain concours\u00a0!","info"));
   else noeuds.push(message("Le tirage au sort a eu lieu.","info"));
   noeuds.push(blocResultat(ligne,gagnants));
   // Vérification personnelle : ton empreinte, calculée ici avec TON identifiant (jamais celui d'un autre joueur)
   if((gain||participe)&&ligne.graine){
    const mienne=await empreinte(ligne.graine+":"+uid);
    if(!encore()) return;
    if(mienne){
     const verif=el("div","cc-verification");
     const p=el("p","","Ton empreinte, calculée dans ton navigateur\u00a0: ");p.append(code(mienne));
     verif.append(el("h3","","Vérifie ton tirage"),p);
     // Plus grande empreinte parmi les gagnants (remplaçants compris) : comparaison de textes hexadécimaux en minuscules,
     // même ordre que la base (collate "C")
     const derniere=gagnants.reduce((max,g)=>g.empreinte&&(!max||g.empreinte>max)?g.empreinte:max,null);
     if(gain){
      const juste=mienne===gain.empreinte;
      verif.append(message(juste?"C'est bien l'empreinte enregistrée pour ta participation gagnante.":"Cette empreinte ne correspond pas à celle enregistrée\u00a0: écris à l'organisateur (adresse à l'article 1 du règlement).",juste?"ok":"alerte"));
     }else if(derniere){
      const juste=mienne>derniere;
      verif.append(message(juste?"Ton empreinte est plus grande que celle du dernier gagnant\u00a0: le tirage est conforme pour toi."
       :"Ton empreinte n'est pas plus grande que celle du dernier gagnant\u00a0: écris à l'organisateur (adresse à l'article 1 du règlement) pour qu'il vérifie le tirage.",juste?"ok":"alerte"));
     }
     noeuds.push(verif);
    }
   }
   afficher(...noeuds);
  }catch(e){
   if(!encore()) return;
   const reessayer=bouton("Réessayer","ghost");
   reessayer.addEventListener("click",()=>{ annoncer(""); majVedette(); });
   afficher(message(navigator.onLine===false?"Pas de connexion internet\u00a0: réessaie quand tu seras en ligne.":"Impossible de joindre le site pour le moment. Réessaie dans un instant.","erreur","alert"),ligneBoutons(reessayer));
  }
 }

 // Formulaire : deux cases obligatoires, vérifiées avant tout envoi
 function montrerFormulaire(){
  const form=el("form","acc-form cc-form");
  form.noValidate=true;
  const caseReglement=document.createElement("input"),caseAge=document.createElement("input");
  const ligneCase=(input,id,texte,lien)=>{
   input.type="checkbox"; input.id=id;
   const label=el("label","cx-case");
   label.htmlFor=id;
   const s=el("span","",texte);
   if(lien){ const a=el("a","",lien);a.href="#concours-"+vedette.id+"-reglement"; a.addEventListener("click",ouvrirReglement); s.append(" (",a,")"); }
   label.append(input,s);
   return label;
  };
  const bout=el("button","btn primary","Je participe");
  bout.type="submit";
  form.append(ligneCase(caseReglement,"cc-case-reglement","J'ai lu et j'accepte le règlement","lire le règlement"),
   ligneCase(caseAge,"cc-case-age","Je suis majeur, ou j'ai l'accord de mes parents"),bout);
  [caseReglement,caseAge].forEach(c=>c.addEventListener("change",()=>c.removeAttribute("aria-invalid")));
  form.addEventListener("submit",async ev=>{
   ev.preventDefault();
   const manquantes=[caseReglement,caseAge].filter(c=>!c.checked);
   manquantes.forEach(c=>c.setAttribute("aria-invalid","true"));
   if(manquantes.length){
    annoncer("Coche les deux cases pour participer.","erreur");
    manquantes[0].focus();
    return;
   }
   occuper(bout,"Envoi…");
   annoncer("");
   let r;
   try{ r=await C.client.from("concours_participations").insert({concours_id:vedette.id,atteste_majeur_ou_accord:true,accepte_reglement:true}); }
   catch(e){ r={error:e}; }
   // Déjà inscrit (autre onglet, autre appareil) : même résultat qu'une participation réussie
   if(r.error&&r.error.code!=="23505"){ liberer(bout); annoncer(messageErreur(r.error),"erreur"); return; }
   montrerParticipation();
   annoncer("C'est enregistré\u00a0: tu participes au tirage au sort.","ok");
   majCompteur();
   mettreEnAvantPartage();
  });
  afficher(form);
 }

 // Participation enregistrée : retrait possible tant que le jeu est ouvert, avec confirmation dans la page
 function montrerParticipation(){
  const retirer=bouton("Retirer ma participation","ghost");
  retirer.addEventListener("click",()=>{
   annoncer("");
   const oui=bouton("Oui, retirer ma participation","ghost"),non=bouton("Annuler","primary");
   const confirmation=el("div","msg msg-alerte cc-confirmation");
   confirmation.setAttribute("role","group");
   confirmation.setAttribute("aria-label","Confirmer le retrait");
   confirmation.append(el("p","","Retirer ta participation\u00a0? Tu pourras participer à nouveau tant que le jeu est ouvert."),ligneBoutons(oui,non));
   non.addEventListener("click",()=>{ montrerParticipation(); corps.querySelector("button").focus(); });
   oui.addEventListener("click",async()=>{
    occuper(oui,"Retrait…"); non.disabled=true;
    let r;
    try{ r=await C.client.from("concours_participations").delete().eq("concours_id",vedette.id).select("concours_id"); }
    catch(e){ r={error:e}; }
    if(r.error||!Array.isArray(r.data)||!r.data.length){
     // Rien supprimé sans erreur : le jeu s'est fermé entre-temps (la base refuse le retrait après la fin)
     liberer(oui); non.disabled=false;
     annoncer(r.error?messageErreur(r.error):"Retrait impossible\u00a0: le jeu est terminé.","erreur");
     return;
    }
    montrerFormulaire();
    annoncer("Ta participation est retirée.","ok");
    majCompteur();
    const premiere=corps.querySelector("input");
    if(premiere) premiere.focus();
   });
   afficher(confirmation);
   non.focus();
  });
  afficher(message("Tu participes au tirage au sort. Tirage après le "+finTexte+", résultat sur cette page. Bonne chance\u00a0!","ok"),ligneBoutons(retirer));
 }

 // Lien « lire le règlement » : ouvre le règlement dépliable du concours
 const reglement=zone.closest("article").querySelector("details.cc-reglement");
 if(reglement) reglement.id="concours-"+vedette.id+"-reglement";
 function ouvrirReglement(){ if(reglement) reglement.open=true; }

 /* ---------- Partager le concours (facultatif, validé par l'organisateur) ----------
    Jamais une condition de participation, aucune chance en plus. Aucun script, pixel ni image de réseau social : de
    simples liens, rien n'est envoyé à un réseau tant que le joueur ne clique pas. Partage natif du téléphone
    (navigator.share) s'il existe, sinon liens WhatsApp, Facebook, X (nouvel onglet) et « Copier le lien ».
    Affiché sous le concours ouvert ; mis en avant juste après une participation réussie. */
 const URL_CONCOURS="https://apprendre-padel.fr/concours.html";
 const TITRE_PARTAGE="Jeu concours d'Apprendre Padel";
 const TEXTE_PARTAGE="Je participe au jeu concours d'Apprendre Padel\u00a0: "+vedette.lot+" à gagner, c'est gratuit\u00a0!";
 const partage=el("div","cc-partage");
 const boutonPartage=bouton("Partager le concours","ghost");
 function preparerPartage(){
  const options=el("div","cc-partage-options");
  options.id="cc-partage-options";
  options.hidden=true;
  const lien=(nom,adresse)=>{
   const a=el("a","btn ghost petit",nom);
   a.href=adresse; a.target="_blank"; a.rel="noopener noreferrer";
   a.append(el("span","sr-only"," (nouvel onglet)"));
   return a;
  };
  const copier=bouton("Copier le lien","ghost petit");
  const retourCopie=el("div","cc-retour-copie");
  copier.addEventListener("click",async()=>{
   try{
    if(!(navigator.clipboard&&navigator.clipboard.writeText)) throw new Error("presse-papiers indisponible");
    await navigator.clipboard.writeText(URL_CONCOURS);
    retourCopie.replaceChildren(message("Lien copié\u00a0: "+URL_CONCOURS,"ok"));
   }catch(e){
    retourCopie.replaceChildren(message("Copie impossible sur cet appareil. Voici le lien à copier\u00a0: "+URL_CONCOURS,"alerte"));
   }
  });
  const liens=el("div","btns");
  liens.append(lien("WhatsApp","https://wa.me/?text="+encodeURIComponent(TEXTE_PARTAGE+" "+URL_CONCOURS)),
   lien("Facebook","https://www.facebook.com/sharer.php?u="+encodeURIComponent(URL_CONCOURS)),
   lien("X","https://x.com/intent/post?text="+encodeURIComponent(TEXTE_PARTAGE)+"&url="+encodeURIComponent(URL_CONCOURS)),copier);
  options.append(liens,retourCopie);
  boutonPartage.setAttribute("aria-expanded","false");
  boutonPartage.setAttribute("aria-controls",options.id);
  boutonPartage.addEventListener("click",async()=>{
   if(typeof navigator.share==="function"){
    try{ await navigator.share({title:TITRE_PARTAGE,text:TEXTE_PARTAGE,url:URL_CONCOURS}); return; }
    catch(e){ if(e&&e.name==="AbortError") return; } // partage annulé par le joueur ; autre échec : liens ci-dessous
   }
   options.hidden=!options.hidden;
   boutonPartage.setAttribute("aria-expanded",String(!options.hidden));
  });
  partage.append(ligneBoutons(boutonPartage),options,el("p","cc-partage-note","Partager est facultatif et ne donne aucune chance supplémentaire."));
 }
 function mettreEnAvantPartage(){
  if(!partage.isConnected) return;
  partage.classList.add("cc-partage-avant");
  boutonPartage.className="btn primary";
 }
 if(phase(vedette,maintenant)==="ouvert"){ preparerPartage(); zone.append(partage); }

 majVedette();
 if(C&&typeof C.onChange==="function") C.onChange(()=>{ annoncer(""); majVedette(); });
})();
