/* COMMUNAUTÉ SUR LA FICHE TOURNOI (tournoi/<id>.html) + modération des avis (compte.html, admin)
   - « J'y vais » (table presences) : compteur visible sans compte (fonction nb_presences), liste et bouton connecté.
   - Annonces « cherche partenaire » du tournoi (table annonces) : nombre sans compte, liste connecté, formulaire
     sur partenaires.html?tournoi=<id>.
   - Avis après tournoi (table avis) : 3 questions + texte court filtré ; visibles par tous après la fin du tournoi ;
     note du club calculée ici à partir des avis de tous ses tournois ; signalement (masqué à 3).
   SQL : supabase/migrations/2026-10-26-t4-*.sql. Sans ces tables, la fiche affiche « bientôt » et rien ne casse. */
const CT_MAX_TEXTE=300;
const CT_VERSION_CHARTE=1;
const CT_MOTIFS=[["contact","Contient des coordonnées"],["nom","Cite une personne"],["irrespectueux","Irrespectueux"],["faux","Faux ou hors sujet"],["autre","Autre"]];
const CT_ERREURS={
 NON_CONNECTE:"Connecte-toi pour continuer.",
 PSEUDO_REQUIS:"Ajoute d'abord un pseudo dans Mon compte.",
 CHARTE_REQUISE:"Confirme que tu as 15 ans ou plus et accepte la charte avant de continuer.",
 TOURNOI_PAS_COMMENCE:"Tu pourras donner ton avis à partir du premier jour du tournoi.",
 DEJA_SIGNALE:"Tu as déjà signalé cet avis.",
 AVIS_PROPRE:"Tu ne peux pas signaler ton propre avis.",
 AVIS_INTROUVABLE:"Cet avis n'est plus disponible.",
 NON_ADMIN:"Action réservée à l'administrateur."
};
// Même liste que la fonction SQL avis_texte_correct (insultes) ; les contacts : même filtre que les annonces
const CT_INSULTES=/(connard|connasse|salop|encul|enfoir|putain|\bpute|abruti|crétin|cretin|débile|debile|bouffon|batard|bâtard|merdique|\bnique|\bntm\b|\bfdp\b|tocard|minable)/i;

(function(){
 function el(b,c,t){const e=document.createElement(b);if(c)e.className=c;if(t!==undefined)e.textContent=t;return e;}
 function contientContact(t){
  t=String(t||"");
  return t.indexOf("@")>=0||/(arobase|\[at\]|\(at\))/i.test(t)||/[0-9]([\s.\-]{0,3}[0-9]){8,}/.test(t)||/(https?:|www\.)/i.test(t)||
   /\b(gmail|hotmail|outlook|yahoo|icloud|whatsapp|telegram|snapchat|instagram|facebook|messenger)\b/i.test(t);
 }
 function traduire(erreur,defaut){
  const brut=String((erreur&&erreur.message)||""),bas=brut.toLowerCase();
  for(const code in CT_ERREURS)if(brut.indexOf(code)>=0)return CT_ERREURS[code];
  if(bas.indexOf("avis_texte_correct")>=0)return "Ton texte contient des coordonnées, un lien ou un mot interdit. Corrige-le avant d'envoyer.";
  if(erreur&&erreur.code==="23505")return "C'est déjà fait.";
  if(bas.indexOf("failed to fetch")>=0||bas.indexOf("network")>=0)return "Connexion impossible : vérifie ton réseau puis réessaie.";
  const code=erreur&&erreur.code;
  if(code==="42P01"||code==="PGRST205"||code==="PGRST202"||code==="42883"||bas.indexOf("does not exist")>=0||bas.indexOf("schema cache")>=0)return "Cette fonction n'est pas encore activée sur le site.";
  return defaut||"Une erreur est survenue. Réessaie dans un instant.";
 }
 // Appel Supabase qui ne lève jamais d'exception : { ok, data, message }
 async function appeler(fabrique,defaut){
  const c=window.PA_COMPTE&&window.PA_COMPTE.client;
  if(!c)return {ok:false,message:"Comptes indisponibles."};
  try{const {data,error}=await fabrique(c);return error?{ok:false,message:traduire(error,defaut),code:error.code}:{ok:true,data};}
  catch(e){return {ok:false,message:traduire(e,defaut)};}
 }
 const moi=()=>window.PA_COMPTE&&window.PA_COMPTE.user?window.PA_COMPTE.user.id:null;
 const aujourdhui=()=>{const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");};
 const dateFr=iso=>new Date(iso).toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"});
 const chiffre=n=>n.toLocaleString("fr-FR",{maximumFractionDigits:1});
 function message(zone,texte,erreur){let p=zone.querySelector(":scope > .ct-msg");if(!p){p=el("p","acc-msg ct-msg");p.setAttribute("role","status");zone.appendChild(p);}p.textContent=texte||"";p.hidden=!texte;p.classList.toggle("acc-err",!!erreur);}
 // Lien vers « Mon compte » depuis une page en sous-dossier (tournoi/) ou à la racine
 const racine=/\/tournois?\//.test(location.pathname)?"../":"";
 function lienCompte(texte){const a=el("a","",texte);a.href=racine+"compte.html";return a;}

 /* ===================== Fiche tournoi ===================== */
 // Rien n'est appelé tant que le SQL n'est pas exécuté (PA_SUPABASE.activees, supabase-config.js)
 const active=((window.PA_SUPABASE||{}).activees||[]).includes("communaute");
 const bloc=document.getElementById("tournoi-donnees"),zoneP=document.getElementById("ft-presences");
 if(active&&bloc&&zoneP){
  let t=null;try{t=JSON.parse(bloc.textContent);}catch(e){}
  const zoneA=document.getElementById("ft-annonces"),zoneV=document.getElementById("ft-avis");
  const compte=window.PA_COMPTE;
  if(t&&compte&&compte.actif){
   const fin=t.date_fin||t.date_debut,termine=fin<aujourdhui(),commence=t.date_debut<=aujourdhui();
   const lienPartenaires=(zoneA.querySelector("a")||{}).href||"";
   let profil=null,version=0;

   /* ---- J'y vais ---- */
   async function rendrePresences(v){
    const n=await appeler(c=>c.rpc("nb_presences",{p_tournoi:t.id}));
    if(v!==version)return;
    zoneP.textContent="";
    if(!n.ok){zoneP.append(el("p","acc-muted",n.message.indexOf("pas encore activée")>=0?"Bientôt : les joueurs du site qui participent à ce tournoi.":n.message));return;}
    const nb=n.data||0;
    const tete=el("p","ct-compte");tete.append(el("b","",String(nb)),nb>1?(termine?" joueurs du site y étaient":" joueurs du site y vont"):(termine?" joueur du site y était":" joueur du site y va"));
    zoneP.appendChild(tete);
    if(!moi()){if(!termine){const p=el("p","acc-muted");p.append(lienCompte("Connecte-toi"),", puis clique sur « J'y vais » pour apparaître ici et trouver d'autres joueurs.");zoneP.appendChild(p);}return;}
    const liste=await appeler(c=>c.from("presences").select("user_id,pseudo,classement_p").eq("tournoi_id",t.id).order("created_at",{ascending:true}).limit(60));
    if(v!==version)return;
    const jeSuisInscrit=liste.ok&&liste.data.some(p=>p.user_id===moi());
    if(liste.ok&&liste.data.length){
     const ul=el("ul","ct-joueurs");
     liste.data.forEach(p=>{const li=el("li","ct-joueur"+(p.user_id===moi()?" moi":""));li.append(el("span","ct-initiale",(p.pseudo||"?").charAt(0).toUpperCase()),el("span","",p.pseudo+(p.classement_p?" · "+p.classement_p:"")));ul.appendChild(li);});
     zoneP.appendChild(ul);
    }
    if(!termine){
     const b=el("button","btn ct-jyvais",jeSuisInscrit?"Je n'y vais plus":"J'y vais");b.type="button";b.setAttribute("aria-pressed",String(jeSuisInscrit));
     b.addEventListener("click",async()=>{
      b.disabled=true;
      const r=jeSuisInscrit
       ?await appeler(c=>c.from("presences").delete().eq("user_id",moi()).eq("tournoi_id",t.id))
       :await appeler(c=>c.from("presences").insert({user_id:moi(),tournoi_id:t.id,pseudo:"-"}));
      b.disabled=false;
      if(!r.ok){message(zoneP,r.message,true);return;}
      rendrePresences(++version);
     });
     zoneP.appendChild(b);
    }
   }

   /* ---- Annonces partenaires ---- */
   async function rendreAnnonces(v){
    const n=await appeler(c=>c.rpc("nb_annonces_tournoi",{p_tournoi:t.id}));
    if(v!==version)return;
    zoneA.textContent="";
    const titre=el("h3","ct-titre","Cherche partenaire");zoneA.appendChild(titre);
    if(n.ok){const p=el("p","ct-compte");p.append(el("b","",String(n.data||0)),(n.data>1?" annonces":" annonce")+" pour ce tournoi");zoneA.appendChild(p);}
    if(moi()&&n.ok&&n.data>0){
     const r=await appeler(c=>c.from("annonces").select("id,pseudo,classement_p,cote,sexe,message").eq("tournoi_id",t.id).order("created_at",{ascending:false}).limit(10));
     if(v!==version)return;
     if(r.ok&&r.data.length){
      const ul=el("ul","ct-annonces");
      const cotes={droite:"côté droit",gauche:"côté gauche",indifferent:"côté indifférent"};
      r.data.forEach(a=>{const li=el("li");li.append(el("b","",a.pseudo+(a.classement_p?" · "+a.classement_p:"")),el("span","acc-muted"," · "+(a.sexe||"")+", "+(cotes[a.cote]||"")));if(a.message)li.append(el("p","",a.message));ul.appendChild(li);});
      zoneA.appendChild(ul);
     }
    }else if(!moi()&&n.ok&&n.data>0){const p=el("p","acc-muted");p.append(lienCompte("Connecte-toi")," pour lire les annonces et y répondre.");zoneA.appendChild(p);}
    if(!termine&&lienPartenaires){const a=el("a","btn ghost",n.ok&&n.data>0?"Répondre ou publier une annonce":"Publier une annonce « cherche partenaire »");a.href=lienPartenaires;zoneA.appendChild(a);}
   }

   /* ---- Avis ---- */
   const etoiles=n=>"★".repeat(n)+"☆".repeat(5-n);
   async function rendreAvis(v){
    zoneV.textContent="";
    zoneV.appendChild(el("h3","ct-titre","Avis des joueurs"));
    const [liste,club]=await Promise.all([
     appeler(c=>c.from("avis").select("id,user_id,pseudo,organisation,niveau_reel,recommande,texte,created_at").eq("tournoi_id",t.id).order("created_at",{ascending:false}).limit(50)),
     appeler(c=>c.from("avis").select("organisation,recommande").eq("club",t.club).limit(500))
    ]);
    if(v!==version)return;
    if(!liste.ok){zoneV.append(el("p","acc-muted",liste.message.indexOf("pas encore activée")>=0?"Bientôt : les avis des joueurs après le tournoi.":liste.message));return;}
    // Note du club : moyenne « organisation » de tous les avis visibles de ses tournois
    if(club.ok&&club.data.length){
     const moy=club.data.reduce((s,a)=>s+a.organisation,0)/club.data.length,reco=club.data.filter(a=>a.recommande).length;
     const p=el("p","ct-club");p.append("Note du club : ",el("b","",chiffre(moy)+"/5")," sur "+club.data.length+" avis · "+Math.round(100*reco/club.data.length)+" % recommandent");zoneV.appendChild(p);
    }
    const visibles=liste.data.filter(a=>termine||a.user_id===moi());
    const monAvis=liste.data.find(a=>a.user_id===moi());
    if(!visibles.length)zoneV.append(el("p","acc-muted",termine?"Pas encore d'avis sur ce tournoi.":"Les avis des joueurs apparaîtront après le tournoi."));
    visibles.forEach(a=>zoneV.appendChild(carteAvis(a)));
    if(monAvis&&!termine)zoneV.append(el("p","acc-muted","Ton avis sera visible par les autres joueurs après la fin du tournoi."));
    if(!moi()){if(commence){const p=el("p","acc-muted");p.append(lienCompte("Connecte-toi")," pour donner ton avis sur ce tournoi.");zoneV.appendChild(p);}return;}
    if(!monAvis&&commence)zoneV.appendChild(formulaireAvis());
   }
   function carteAvis(a){
    const art=el("article","ct-avis");
    const tete=el("p","ct-avis-tete");tete.append(el("b","",a.pseudo)," · "+dateFr(a.created_at));
    const notes=el("ul","ct-notes");
    const niveaux=["bien plus faible que la catégorie","un peu plus faible","conforme à la catégorie","un peu plus fort","bien plus fort que la catégorie"];
    notes.append(el("li","",""),el("li","","Niveau du tableau : "+niveaux[a.niveau_reel-1]),el("li","",a.recommande?"Recommande ce tournoi":"Ne le recommande pas"));
    notes.firstChild.append("Organisation : ",el("span","ct-etoiles",etoiles(a.organisation)));
    notes.firstChild.querySelector(".ct-etoiles").setAttribute("aria-label",a.organisation+" sur 5");
    art.append(tete,notes);
    if(a.texte)art.append(el("p","ct-avis-texte",a.texte));
    if(moi()&&a.user_id!==moi())art.appendChild(signalement(a));
    if(a.user_id===moi()){
     const b=el("button","ct-lien","Supprimer mon avis");b.type="button";
     b.addEventListener("click",async()=>{const r=await appeler(c=>c.from("avis").delete().eq("id",a.id));if(!r.ok){message(art,r.message,true);return;}rendreAvis(++version);});
     art.appendChild(b);
    }
    return art;
   }
   function signalement(a){
    const d=el("details","ct-signaler");d.appendChild(el("summary","","Signaler"));
    const s=el("select");s.setAttribute("aria-label","Motif du signalement");CT_MOTIFS.forEach(([v,l])=>s.append(new Option(l,v)));
    const b=el("button","btn ghost","Envoyer le signalement");b.type="button";
    b.addEventListener("click",async()=>{b.disabled=true;const r=await appeler(c=>c.rpc("signaler_avis",{p_avis:a.id,p_motif:s.value}));b.disabled=false;message(d,r.ok?"Merci, ton signalement a été envoyé.":r.message,!r.ok);});
    d.append(s,b);return d;
   }
   function formulaireAvis(){
    const f=el("form","ct-form");f.noValidate=true;
    f.appendChild(el("h4","","Ton avis en 30 secondes"));
    const echelle=(nom,legende,libelles)=>{const fs=el("fieldset");fs.appendChild(el("legend","",legende));const div=el("div","tchips");
     libelles.forEach((l,i)=>{const lab=el("label","tchip"),inp=el("input");inp.type="radio";inp.name=nom;inp.value=String(i+1);inp.required=true;lab.append(inp,el("span","",l));div.appendChild(lab);});fs.appendChild(div);return fs;};
    f.append(echelle("organisation","Organisation (horaires, accueil, arbitrage)",["1","2","3","4","5"]),
     echelle("niveau","Niveau réel du tableau",["Bien plus faible","Un peu plus faible","Conforme","Un peu plus fort","Bien plus fort"]),
     echelle("recommande","Tu recommandes ce tournoi ?",["Oui","Non"]));
    const lab=el("label","ct-label","Un mot sur le tournoi (facultatif, 300 caractères)");lab.htmlFor="ct-texte";
    const ta=el("textarea");ta.id="ct-texte";ta.maxLength=CT_MAX_TEXTE;ta.rows=3;
    ta.placeholder="Ex. Bien organisé, balles neuves à chaque match, tableau plus relevé que prévu.";
    const aide=el("p","note","Pas de nom de personne, pas de coordonnées, pas d'insulte : sinon l'avis est refusé ou masqué.");
    f.append(lab,ta,aide);
    const dejaCharte=!!(profil&&profil.age_confirme_at&&profil.charte_acceptee_at);
    let caseCharte=null;
    if(!dejaCharte){
     const l=el("label","ct-charte");caseCharte=el("input");caseCharte.type="checkbox";
     const lien=el("a","","charte");lien.href=lienPartenaires?lienPartenaires.replace(/\?.*$/,"")+"#charte":"#";
     l.append(caseCharte," J'ai 15 ans ou plus et j'accepte la ",lien," du site.");f.appendChild(l);
    }
    const b=el("button","btn primary","Publier mon avis");b.type="submit";f.appendChild(b);
    f.addEventListener("submit",async e=>{
     e.preventDefault();
     const val=n=>(f.querySelector(`input[name="${n}"]:checked`)||{}).value;
     const org=+val("organisation"),niv=+val("niveau"),reco=val("recommande");
     const texte=ta.value.trim();
     if(!org||!niv||!reco){message(f,"Réponds aux trois questions.",true);return;}
     if(contientContact(texte)||CT_INSULTES.test(texte)){message(f,"Ton texte contient des coordonnées, un lien ou un mot interdit. Corrige-le avant d'envoyer.",true);ta.focus();return;}
     if(caseCharte&&!caseCharte.checked){message(f,CT_ERREURS.CHARTE_REQUISE,true);caseCharte.focus();return;}
     b.disabled=true;
     if(caseCharte){const r=await appeler(c=>c.rpc("accepter_charte",{p_version:CT_VERSION_CHARTE}));if(!r.ok){b.disabled=false;message(f,r.message,true);return;}profil=Object.assign(profil||{},{age_confirme_at:new Date().toISOString(),charte_acceptee_at:new Date().toISOString()});}
     const r=await appeler(c=>c.from("avis").insert({user_id:moi(),tournoi_id:t.id,tournoi_date_debut:t.date_debut,tournoi_date_fin:t.date_fin||t.date_debut,club:t.club,pseudo:"-",organisation:org,niveau_reel:niv,recommande:reco==="1",texte}));
     b.disabled=false;
     if(!r.ok){message(f,r.message,true);return;}
     rendreAvis(++version);
    });
    return f;
   }

   async function tout(){
    const v=++version;
    profil=null;
    if(moi()){const r=await compte.loadProfile();if(v!==version)return;profil=r.ok?r.profile:null;}
    rendrePresences(v);rendreAnnonces(v);rendreAvis(v);
   }
   compte.ready.then(tout);
   compte.onChange(()=>tout());
  }
 }

 /* ===================== Modération des avis (compte.html, admin seulement) ===================== */
 const zoneModeration=document.getElementById("moderation-avis");
 if(active&&zoneModeration&&window.PA_COMPTE&&window.PA_COMPTE.actif){
  const compte=window.PA_COMPTE,liste=document.getElementById("moderation-avis-liste");
  async function rendre(){
   zoneModeration.hidden=true;liste.textContent="";
   if(!moi())return;
   const admin=await appeler(c=>c.rpc("est_admin"));
   if(!admin.ok||admin.data!==true)return;
   zoneModeration.hidden=false;
   const r=await appeler(c=>c.from("avis").select("id,tournoi_id,club,pseudo,organisation,texte,masque,nb_signalements,created_at").or("masque.eq.true,nb_signalements.gt.0").order("nb_signalements",{ascending:false}).limit(100));
   if(!r.ok){liste.append(el("p","acc-msg acc-err",r.message));return;}
   if(!r.data.length){liste.append(el("p","acc-muted","Aucun avis signalé."));return;}
   r.data.forEach(a=>{
    const art=el("article","ct-avis");
    const tete=el("p","ct-avis-tete");tete.append(el("b","",a.pseudo)," · "+a.club+" · tournoi "+a.tournoi_id+" · "+a.nb_signalements+" signalement"+(a.nb_signalements>1?"s":"")+(a.masque?" · masqué":""));
    art.append(tete,el("p","ct-avis-texte",a.texte||"(sans texte)"));
    const btns=el("div","btns");
    [["masquer","Masquer"],["retablir","Rétablir"],["supprimer","Supprimer"]].forEach(([action,libelle])=>{
     const b=el("button","btn ghost",libelle);b.type="button";
     b.addEventListener("click",async()=>{b.disabled=true;const x=await appeler(c=>c.rpc("admin_moderer_avis",{p_avis:a.id,p_action:action}));b.disabled=false;if(!x.ok){message(art,x.message,true);return;}rendre();});
     btns.appendChild(b);
    });
    art.appendChild(btns);liste.appendChild(art);
   });
  }
  compte.ready.then(rendre);compte.onChange(()=>rendre());
 }
})();
