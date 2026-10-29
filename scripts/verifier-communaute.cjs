/* Vérification de la communauté sur la fiche tournoi (T4 + S2 + S2 bis) : « J'y vais », annonces du tournoi, avis, note
   du club, signalement, modération admin, et page « Trouver un partenaire » (partenaires.html, Mon compte).
   Supabase est remplacé par un faux serveur en mémoire (tables + règles des déclencheurs SQL : pseudo obligatoire,
   charte, unicité ; S2 : user_id des avis illisible, presences_tournoi, mon_avis, tournois_ref, quotas, 10 signalements
   par 24 h ; S2 bis : user_id des annonces et réponses illisible, select("*") refusé, mes_annonces() et mes_reponses(),
   liste « J'y vais » limitée aux 60 jours avant le tournoi, e-mail confirmé et compte ancien pour un avis).
   partenaires.js est testé AVANT S2 bis (fonctions absentes : PGRST202, repli) et APRÈS. Le filtre de coordonnées des
   deux scripts (communaute-tournoi.js et partenaires.js) doit être identique à la référence filtreJs. Edge, 390 px.
   Lancer depuis la racine du site : node scripts/verifier-communaute.cjs */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const racine=path.join(__dirname,'..');
let nb=0;
function ok(nom){nb++;console.log('OK '+nom);}
process.on('unhandledRejection',e=>{if(e&&e.name==='TargetClosedError')return;console.error(e);process.exitCode=1;});

// Faux SDK : état dans sessionStorage (survit aux rechargements), utilisateur choisi par window.__utilisateur.
// Reprend les règles S2 (supabase/migrations/2026-10-29-s2-*.sql) : user_id des avis illisible (droits par colonne),
// présences des autres lisibles seulement par presences_tournoi(), tournoi connu de tournois_ref obligatoire,
// club et dates de l'avis recopiés par la base, quotas (LIMITE_LIGNES) et 10 signalements par 24 h.
// S2 bis (base.s2bis vrai, sinon état d'avant l'exécution) : annonces et réponses lisibles par colonnes sans user_id
// (demander user_id, filtrer dessus ou « * », même au retour d'un insert, échoue : 42501), mes_annonces() et
// mes_reponses() (absentes avant S2 bis : PGRST202 et statut 404), presences_tournoi() limitée aux tournois qui
// commencent dans les 60 jours, avis refusé sans e-mail confirmé ou avec un compte trop récent, TOURNOI_INCONNU.
// Chaque requête est notée dans sessionStorage « journal » (table ou fonction, colonnes, filtres, connecté ou non).
const FAUX=`(function(){
 const lire=()=>JSON.parse(sessionStorage.getItem('base')||'null');
 const base=lire()||{utilisateur:null,profils:{},presences:[],annonces:[],reponses:[],avis:[],signalements:[],admins:[],tournois_ref:{},quota_atteint:[],s2bis:true};
 const garder=()=>sessionStorage.setItem('base',JSON.stringify(base));
 const noter=x=>{const j=JSON.parse(sessionStorage.getItem('journal')||'[]');j.push(x);sessionStorage.setItem('journal',JSON.stringify(j));};
 window.__base=base;window.__garder=garder;
 const erreur=(message,code)=>({data:null,error:{message,code}});
 const isoLocal=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
 const dans=n=>{const d=new Date();d.setDate(d.getDate()+n);return isoLocal(d);};
 // Colonnes de avis lisibles (s2-08) : sans user_id ; masque et nb_signalements pour les connectés seulement
 const COLS_AVIS_ANON=['id','tournoi_id','tournoi_date_debut','tournoi_date_fin','club','pseudo','organisation','niveau_reel','recommande','texte','created_at'];
 const COLS_AVIS_AUTH=COLS_AVIS_ANON.concat(['masque','nb_signalements']);
 // Colonnes de annonces et reponses lisibles après S2 bis (s2-39, s2-40) : sans user_id
 const COLS_S2BIS={
  annonces:'id,tournoi_id,tournoi_nom,tournoi_date_debut,tournoi_date_fin,tournoi_ville,tournoi_dep,tournoi_categorie,pseudo,niveau_declare,classement_p,cote,sexe,message,statut,masquee,nb_signalements,created_at'.split(','),
  reponses:'id,annonce_id,pseudo,message,statut,message_retour,created_at'.split(',')
 };
 const liste=c=>String(c).split(',').map(x=>x.trim());
 const projeter=(r,c)=>c==='*'?{...r}:Object.fromEntries(liste(c).map(x=>[x,r[x]]));
 function requete(table){
  let op='select',ligne=null,filtres=[],ordre=null,limite=1000,ou=null,colonnes=null,parmi=null,minimum=null,unique=false,retour=null;
  const q={
   select(c){if(op==='select')colonnes=c||'*';else retour=c||'*';return q;},eq(c,v){filtres.push([c,v]);return q;},order(c,o){ordre=[c,o&&o.ascending];return q;},limit(n){limite=n;return q;},
   or(expr){ou=expr.split(',').map(x=>x.split('.'));return q;},insert(l){op='insert';ligne=l;return q;},delete(){op='delete';return q;},
   in(c,v){parmi=[c,v.map(String)];return q;},gte(c,v){minimum=[c,v];return q;},
   maybeSingle(){op='single';return q;},single(){unique=true;return q;},
   then(res,rej){return Promise.resolve(executer()).then(res,rej);}
  };
  function executer(){
   const u=base.utilisateur;
   if(op==='insert'&&!base[table])base[table]=[];
   const lignes=base[table]||[];
   const champsFiltres=filtres.map(f=>f[0]).concat(parmi?[parmi[0]]:[]);
   noter({table,op,colonnes,retour,filtres:champsFiltres,cles:ligne?Object.keys(ligne):null,connecte:!!u});
   const garde=r=>filtres.every(([c,v])=>String(r[c])===String(v))&&(!ou||ou.some(([c,o,v])=>o==='eq'?String(r[c])===v:o==='gt'?r[c]>+v:false))&&(!parmi||parmi[1].includes(String(r[parmi[0]])))&&(!minimum||String(r[minimum[0]])>=String(minimum[1]));
   if(table==='profiles'){const p=u?base.profils[u]:null;return {data:p?{id:u,...p}:null,error:null};}
   // S2 bis : droits par colonne sur annonces et reponses (lecture, filtres, retour d'un insert)
   const restreinte=base.s2bis&&COLS_S2BIS[table];
   const refusees=c=>restreinte&&liste(c).some(x=>!COLS_S2BIS[table].includes(x));
   if(op==='select'&&(refusees(colonnes||'*')||(restreinte&&champsFiltres.includes('user_id'))))return erreur('permission denied for table '+table,'42501');
   if(op==='insert'&&retour!==null&&refusees(retour))return erreur('permission denied for table '+table,'42501');
   if(op==='insert'){
    if(!u||ligne.user_id!==u)return erreur('NON_CONNECTE','P0001');
    const p=base.profils[u]||{},ref=base.tournois_ref[ligne.tournoi_id];
    if(base.quota_atteint.includes(table))return erreur('LIMITE_LIGNES','P0001');
    let nouvelle=null;
    if(table==='presences'){
     if(!p.pseudo||p.pseudo_invalide)return erreur('PSEUDO_REQUIS','P0001');
     if(!ref)return erreur('TOURNOI_INCONNU','P0001');
     if(ref.date_fin<new Date().toISOString().slice(0,10))return erreur('TOURNOI_TERMINE','P0001');
     if(lignes.some(r=>r.user_id===u&&r.tournoi_id===ligne.tournoi_id))return erreur('duplicate key value','23505');
     lignes.push(nouvelle={...ligne,pseudo:p.pseudo,classement_p:p.classement_p||null,created_at:new Date().toISOString()});
    }
    if(table==='avis'){
     if(!p.charte)return erreur('CHARTE_REQUISE','P0001');
     if(!p.pseudo||p.pseudo_invalide)return erreur('PSEUDO_REQUIS','P0001');
     if(!ref)return erreur('TOURNOI_INCONNU','P0001');
     // S2 bis (s2-30) : e-mail confirmé, compte créé avant le premier jour du tournoi
     if(p.email_non_confirme)return erreur('EMAIL_NON_CONFIRME','P0001');
     if(p.compte_recent)return erreur('AVIS_COMPTE_RECENT','P0001');
     if(/connard|@/.test(ligne.texte))return erreur('new row violates check constraint "avis_texte_correct"','23514');
     if(lignes.some(r=>r.user_id===u&&r.tournoi_id===ligne.tournoi_id))return erreur('duplicate key value','23505');
     // Club et dates recopiés depuis tournois_ref (s2-06), quoi que le navigateur envoie
     lignes.push(nouvelle={...ligne,club:ref.club,tournoi_date_debut:ref.date_debut,tournoi_date_fin:ref.date_fin,id:'avis-'+(lignes.length+1),pseudo:p.pseudo,masque:false,nb_signalements:0,created_at:new Date().toISOString()});
    }
    if(table==='annonces'){
     if(!p.pseudo||p.pseudo_invalide)return erreur('PSEUDO_REQUIS','P0001');
     if(!p.charte_acceptee_at)return erreur('CHARTE_REQUISE','P0001');
     // S2 bis (s2-29) : tournoi de tournois_ref obligatoire, dates recopiées
     if(base.s2bis&&!ref)return erreur('TOURNOI_INCONNU','P0001');
     nouvelle={...ligne,id:'an-'+(lignes.length+1),pseudo:p.pseudo,niveau_declare:p.niveau_declare||null,classement_p:p.classement_p||null,statut:'active',masquee:false,nb_signalements:0,created_at:new Date().toISOString()};
     if(base.s2bis){nouvelle.tournoi_date_debut=ref.date_debut;nouvelle.tournoi_date_fin=ref.date_fin;}
     lignes.push(nouvelle);
    }
    if(table==='reponses'){
     if(!p.pseudo||p.pseudo_invalide)return erreur('PSEUDO_REQUIS','P0001');
     lignes.push(nouvelle={...ligne,id:'re-'+(lignes.length+1),pseudo:p.pseudo,statut:'en_attente',message_retour:null,created_at:new Date().toISOString()});
    }
    garder();
    if(retour===null||!nouvelle)return {data:null,error:null};
    const rendu=projeter(nouvelle,retour);
    return {data:unique?rendu:[rendu],error:null};
   }
   if(op==='delete'){const garde2=lignes.filter(r=>!garde(r));base[table]=garde2;garder();return {data:null,error:null};}
   let res=lignes.filter(garde);
   if(table==='avis'){
    // Droits par colonne : demander user_id (ou une colonne non accordée) fait échouer toute la requête
    const permises=u?COLS_AVIS_AUTH:COLS_AVIS_ANON,cols=liste(colonnes||'*');
    if(cols.some(c=>!permises.includes(c)))return erreur('permission denied for table avis','42501');
    // Règles de lecture (RLS) : masqués invisibles sauf pour l'admin et l'auteur
    res=res.filter(r=>!r.masque||r.user_id===u||base.admins.includes(u));
    if(ordre)res=res.slice().sort((a,b)=>(a[ordre[0]]<b[ordre[0]]?-1:1)*(ordre[1]?1:-1));
    return {data:res.slice(0,limite).map(r=>Object.fromEntries(cols.map(c=>[c,r[c]]))),error:null};
   }
   if(table==='presences')res=res.filter(r=>r.user_id===u); // s2-11 : chacun ne lit que ses lignes
   if(table==='annonces')res=u?res.filter(r=>!r.masquee||r.user_id===u||base.admins.includes(u)):[];
   // Réponses : les miennes et celles reçues sur mes annonces (s2-38)
   if(table==='reponses')res=u?res.filter(r=>r.user_id===u||base.annonces.some(a=>a.id===r.annonce_id&&a.user_id===u)):[];
   if(ordre)res=res.slice().sort((a,b)=>(a[ordre[0]]<b[ordre[0]]?-1:1)*(ordre[1]?1:-1));
   return {data:res.slice(0,limite).map(r=>projeter(r,colonnes||'*')),error:null};
  }
  return q;
 }
 window.supabase={createClient(){
  return {
   auth:{getSession:async()=>({data:{session:base.utilisateur?{user:{id:base.utilisateur,email:base.utilisateur+'@test.fr'}}:null}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),signOut:async()=>({})},
   from:requete,
   async rpc(nom,a){
    const u=base.utilisateur;
    noter({rpc:nom,connecte:!!u});
    if(nom==='nb_presences')return {data:base.presences.filter(p=>p.tournoi_id===a.p_tournoi).length,error:null};
    if(nom==='nb_annonces_tournoi')return {data:base.annonces.filter(p=>p.tournoi_id===a.p_tournoi).length,error:null};
    // presences_tournoi et mon_avis : réservées aux connectés (s2-09, s2-13)
    if((nom==='presences_tournoi'||nom==='mon_avis')&&!u)return erreur('permission denied for function '+nom,'42501');
    if(nom==='presences_tournoi'){
     // s2-32 : les autres joueurs seulement si le tournoi n'est pas terminé et commence dans les 60 jours
     const ref=base.tournois_ref[a.p_tournoi],ouverte=!!ref&&ref.date_fin>=isoLocal(new Date())&&ref.date_debut<=dans(60);
     return {data:base.presences.filter(p=>p.tournoi_id===a.p_tournoi&&(ouverte||p.user_id===u)).sort((x,y)=>x.created_at<y.created_at?-1:1).map(p=>({pseudo:p.pseudo,classement_p:p.classement_p,est_moi:p.user_id===u})),error:null};
    }
    if(nom==='mon_avis'){const av=base.avis.find(x=>x.user_id===u&&x.tournoi_id===a.p_tournoi);return {data:av?av.id:null,error:null};}
    // mes_annonces et mes_reponses (s2-41, s2-42) : absentes tant que S2 bis n'est pas exécuté
    if(nom==='mes_annonces'||nom==='mes_reponses'){
     if(!base.s2bis)return {data:null,error:{code:'PGRST202',message:'Could not find the function public.'+nom+' without parameters in the schema cache'},status:404};
     if(!u)return erreur('permission denied for function '+nom,'42501');
     const table=nom==='mes_annonces'?'annonces':'reponses';
     return {data:base[table].filter(r=>r.user_id===u).sort((x,y)=>x.created_at<y.created_at?1:-1).map(r=>projeter(r,COLS_S2BIS[table].join(','))),error:null,status:200};
    }
    if(nom==='accepter_charte'){base.profils[u].charte=true;base.profils[u].age_confirme_at=base.profils[u].charte_acceptee_at=new Date().toISOString();garder();return {data:null,error:null};}
    if(nom==='est_admin')return {data:base.admins.includes(u),error:null};
    if(nom==='signaler_avis'){
     const av=base.avis.find(x=>x.id===a.p_avis);if(av.user_id===u)return erreur('AVIS_PROPRE');
     if(base.signalements.some(s=>s.avis_id===a.p_avis&&s.user_id===u))return erreur('DEJA_SIGNALE');
     if(base.signalements.filter(s=>s.user_id===u).length>=10)return erreur('LIMITE_SIGNALEMENTS','P0001');
     base.signalements.push({avis_id:a.p_avis,user_id:u});av.nb_signalements=base.signalements.filter(s=>s.avis_id===a.p_avis).length;if(av.nb_signalements>=3)av.masque=true;garder();return {data:av.nb_signalements,error:null};
    }
    if(nom==='admin_moderer_avis'){
     if(!base.admins.includes(u))return erreur('NON_ADMIN');
     const av=base.avis.find(x=>x.id===a.p_avis);
     if(a.p_action==='retablir'){av.masque=false;av.nb_signalements=0;base.signalements=base.signalements.filter(s=>s.avis_id!==a.p_avis);}
     if(a.p_action==='supprimer')base.avis=base.avis.filter(x=>x.id!==a.p_avis);
     if(a.p_action==='masquer')av.masque=true;
     garder();return {data:null,error:null};
    }
    return {data:null,error:{message:'fonction inconnue',code:'PGRST202'},status:404};
   }
  };
 }};
})();`;

// Fonctions activées pour le test (sur le site, la liste de supabase-config.js est vide tant que le SQL n'est pas exécuté)
const CONFIG_ACTIVE=fs.readFileSync(path.join(__dirname,'..','assets/js/supabase-config.js'),'utf8')+'\nwindow.PA_SUPABASE.activees=["favoris","communaute"];\n';
const serveur=http.createServer((req,res)=>{
 const rel=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\//,'')||'index.html';
 const p=path.resolve(racine,rel);
 if(!p.startsWith(racine+path.sep)){res.writeHead(403);res.end();return;}
 fs.readFile(p,(e,b)=>{if(e){res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.webp':'image/webp','.webmanifest':'application/manifest+json'})[path.extname(p)]||'text/plain');res.end(b);
 });
});

/* Filtre de coordonnées v3 : les deux scripts doivent porter exactement le code de la référence filtreJs de
   scripts/verifier-securite-sql.cjs (PA_DATE_HEURE, PA_CATEGORIE, PA_CHIFFRES_ZEROS, PA_CHIFFRES et la fonction,
   renommée contientContact, indentée d'une espace dans la fonction englobante). On extrait chaque copie, on la compare
   au caractère près à la référence, puis on l'exécute dans Node sur des cas connus. */
function extraireFiltre(rel){
 const src=fs.readFileSync(path.join(racine,rel),'utf8').replace(/\r\n/g,'\n');
 const debut=src.indexOf(' const PA_DATE_HEURE = '),fin=src.indexOf('\n }\n',src.indexOf(' function contientContact(texte) {',debut));
 assert.ok(debut>=0&&fin>debut,'filtre de coordonnées introuvable dans '+rel);
 return src.slice(debut,fin+3);
}
function filtreReference(){
 const ref=fs.readFileSync(path.join(__dirname,'verifier-securite-sql.cjs'),'utf8').replace(/\r\n/g,'\n');
 const debut=ref.indexOf('const PA_DATE_HEURE = '),fin=ref.indexOf('\n}\n',ref.indexOf('function filtreJs(texte) {',debut));
 assert.ok(debut>=0&&fin>debut,'référence filtreJs introuvable dans verifier-securite-sql.cjs');
 return ref.slice(debut,fin+2).replace('function filtreJs(texte) {','function contientContact(texte) {');
}
const FILTRE_REFUSES=['06/12/34/56/78','insta jdupont','bit.ly/abc','０６１２３４５６７８','jean@mail.fr','06 12 34 56 78','ajoute moi sur Snap','w h a t s a p p',
 // S2 bis : contournements du filtre v2
 '06 et 12 et 34 et 56 et 78','06a12b34c56d78','٠٦١٢٣٤٥٦٧٨','i n s t a jean','t me jean'];
const FILTRE_ACCEPTES=['P100 141126','P250+45 20/11 17h','Super ambiance, balles neuves.','Dispo le 12/11/2026 à 18:30, niveau P250.','Tableau relevé, 6/4 3/6 10/8 en quart.',"Signaler un problème à l'organisation",
 'Dispo le 12/11 à 18h30, P250 + 45 ans','6/4 3/6 10/8','P1000 du 12 au 14/12/2026, 32 paires'];
// Chaînes de texte avec une espace ordinaire avant « : ; ? ! » (il faut une espace insécable U+00A0), hors commentaires
const ESPACE_MANQUANTE=/"[^"\n]* [:;?!][^"\n]*"/;
function verifierFiltres(){
 const a=extraireFiltre('assets/js/communaute-tournoi.js'),b=extraireFiltre('assets/js/partenaires.js');
 assert.equal(a,b,'les deux copies du filtre de coordonnées diffèrent');
 assert.equal(a.split('\n').map(l=>l.replace(/^ /,'')).join('\n'),filtreReference(),'le filtre diffère de la référence filtreJs (verifier-securite-sql.cjs)');
 const contientContact=new Function(a+'\nreturn contientContact;')();
 FILTRE_REFUSES.forEach(t=>assert.equal(contientContact(t),true,'contact non détecté : '+t));
 FILTRE_ACCEPTES.forEach(t=>assert.equal(contientContact(t),false,'faux positif : '+t));
 ok('filtre de coordonnées v3 identique au caractère près à la référence filtreJs, dans communaute-tournoi.js et partenaires.js');
 ok('filtre v3 : '+FILTRE_REFUSES.length+' contacts refusés (dont « 06 et 12 et 34 et 56 et 78 », « 06a12b34c56d78 », chiffres arabes, « i n s t a jean », « t me jean »), '+FILTRE_ACCEPTES.length+' textes acceptés (dont « Dispo le 12/11 à 18h30, P250 + 45 ans », « P1000 du 12 au 14/12/2026, 32 paires »)');
 // Messages d'erreur des fonctions SQL : S2 et S2 bis traduits
 const part=fs.readFileSync(path.join(racine,'assets/js/partenaires.js'),'utf8').replace(/\r\n/g,'\n');
 const comm=fs.readFileSync(path.join(racine,'assets/js/communaute-tournoi.js'),'utf8').replace(/\r\n/g,'\n');
 assert.match(part,/LIMITE_SIGNALEMENTS:"[^"]*10 signalements par 24( | )h/);
 assert.match(part,/annonces_tournoi_sans_contact/);
 ['TOURNOI_INCONNU','TEXTE_TOURNOI_INCORRECT','PSEUDO_REQUIS'].forEach(c=>assert.match(part,new RegExp(' '+c+':"'),'partenaires.js : '+c+' non traduit'));
 ['AVIS_COMPTE_RECENT','EMAIL_NON_CONFIRME','PSEUDO_REQUIS'].forEach(c=>assert.match(comm,new RegExp(' '+c+':"'),'communaute-tournoi.js : '+c+' non traduit'));
 assert.match(part,/PSEUDO_REQUIS:"Choisis d'abord un pseudo valide dans ton compte\."/);
 ok('erreurs S2 bis traduites : TOURNOI_INCONNU, TEXTE_TOURNOI_INCORRECT, PSEUDO_REQUIS (partenaires.js), AVIS_COMPTE_RECENT, EMAIL_NON_CONFIRME (communaute-tournoi.js)');
 // partenaires.js n'attend pas « activees » : plus de select("*"), ni de .select() vide après insert, ni de user_id lu
 assert.doesNotMatch(part,/from\("(annonces|reponses)"\)\.select\("\*"\)/);
 assert.doesNotMatch(part,/\.select\(\)\.single\(\)/,'.select() vide après insert : « returning * » refusé après S2 bis');
 assert.doesNotMatch(part,/annonce\.user_id/,'user_id des annonces n\'est plus lisible');
 assert.match(part,/rpc\(nom\)/);assert.match(part,/appelerFonction\("mes_annonces"/);assert.match(part,/appelerFonction\("mes_reponses"/);
 ok('partenaires.js : colonnes listées sans user_id, mes_annonces() et mes_reponses() avec repli, plus de annonce.user_id');
 // Relecture : tutoiement sans point médian, espaces insécables avant la ponctuation haute dans les textes affichés
 assert.doesNotMatch(part,/·e"|·ère/);assert.match(part,/"Ça m'intéresse"/);assert.match(part,/Sois le premier ou la première/);
 assert.doesNotMatch(comm,/Supprimes-en/);
 for(const [nom,src] of [['partenaires.js',part],['communaute-tournoi.js',comm]]){
  const fautes=src.split('\n').filter(l=>!/^\s*\/\//.test(l)&&ESPACE_MANQUANTE.test(l));
  assert.deepEqual(fautes,[],nom+' : espace ordinaire avant « : ; ? ! » dans un texte');
 }
 ok('relecture : « Ça m\'intéresse », « Sois le premier ou la première », « Supprime-en », espaces insécables avant « : ; ? ! »');
}

(async()=>{
 verifierFiltres();
 await new Promise(r=>serveur.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+serveur.address().port;
 // Tournoi de test : le premier tournoi publié qui commence dans le futur, et un autre du même club pour la note
 const donnees=JSON.parse(fs.readFileSync(path.join(racine,'assets/data/tournois.json'),'utf8')).tournois;
 const auj=new Date().toISOString().slice(0,10);
 const t=donnees.find(x=>x.dep==='76'&&x.date_debut>auj&&fs.existsSync(path.join(racine,'tournoi',x.id+'.html')));
 const page0=`/tournoi/${t.id}.html`;
 const etatInitial={utilisateur:null,profils:{U1:{pseudo:'Sam',classement_p:'P100'},U2:{pseudo:'Léo',classement_p:'P50',charte:true},U3:{pseudo:''},ADM:{pseudo:'Admin',charte:true}},
  presences:[{user_id:'U2',tournoi_id:t.id,pseudo:'Léo',classement_p:'P50',created_at:'2026-10-20T10:00:00Z'}],
  annonces:[{id:'a1',user_id:'U2',tournoi_id:t.id,tournoi_nom:t.nom,tournoi_date_debut:t.date_debut,tournoi_date_fin:t.date_fin||t.date_debut,tournoi_ville:t.ville||null,tournoi_dep:t.dep||null,tournoi_categorie:t.categorie||null,
   pseudo:'Léo',niveau_declare:null,classement_p:'P50',cote:'gauche',sexe:'messieurs',message:'Cherche partenaire côté droit',statut:'active',masquee:false,nb_signalements:0,created_at:'2026-10-20T10:00:00Z'}],
  reponses:[],
  avis:[{id:'avis-0',user_id:'U2',tournoi_id:'autre',club:t.club,pseudo:'Léo',organisation:4,niveau_reel:3,recommande:true,texte:'Bien organisé.',masque:false,nb_signalements:0,created_at:'2026-09-01T10:00:00Z'}],
  signalements:[],admins:['ADM'],
  // Table de référence des tournois (s2-01) : sans elle, avis et « J'y vais » sont refusés (TOURNOI_INCONNU)
  tournois_ref:{[t.id]:{club:t.club,date_debut:t.date_debut,date_fin:t.date_fin||t.date_debut}},quota_atteint:[],
  // S2 bis exécuté (s2bis:false = état d'avant : mes_annonces et mes_reponses absentes, select("*") accepté)
  s2bis:true};
 const copie=o=>JSON.parse(JSON.stringify(o));
 const journal=page=>page.evaluate(()=>JSON.parse(sessionStorage.getItem('journal')||'[]'));
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const erreurs=[];
 const nouveau=async(options={})=>{
  const ctx=await browser.newContext({serviceWorkers:'block',viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await ctx.route('**/assets/vendor/supabase-*.js*',r=>r.fulfill({contentType:'text/javascript',body:FAUX}));
  await ctx.route('**/assets/js/supabase-config.js*',r=>r.fulfill({contentType:'text/javascript',body:CONFIG_ACTIVE}));
  // Les fiches publiées ne chargent supabase-js que si « favoris » ou « communaute » est activé dans supabase-config.js
  // (scripts/generer-pages.js) : on simule la page régénérée après activation
  await ctx.route('**/tournoi/*.html',async r=>{
   const rep=await r.fetch();
   const html=(await rep.text()).replace(/(<script src="\.\.\/assets\/js\/supabase-config\.js)/,'<script src="../assets/vendor/supabase-2.45.4.js" defer></script>\n$1');
   await r.fulfill({response:rep,body:html});
  });
  await ctx.route('https://gc.zgo.at/**',r=>r.fulfill({contentType:'text/javascript',body:''}));
  const page=await ctx.newPage();
  if(options.date)await page.clock.install({time:new Date(options.date)});
  page.on('pageerror',e=>erreurs.push(e.message));
  page.on('console',m=>{if(m.type()==='error')erreurs.push(m.text());});
  await page.goto(base+'/index.html');
  await page.evaluate(([e,u])=>{e.utilisateur=u;sessionStorage.setItem('base',JSON.stringify(e));sessionStorage.removeItem('journal');},[options.etat||etatInitial,options.utilisateur||null]);
  await page.goto(base+(options.url||page0));
  return {ctx,page};
 };
 try{
  /* Sans compte */
  let {ctx,page}=await nouveau();
  await page.waitForFunction(()=>/joueur du site y va/.test(document.getElementById('ft-presences').textContent));
  assert.match(await page.textContent('#ft-presences'),/1 joueur du site y va/);
  assert.match(await page.textContent('#ft-presences'),/Connecte-toi/);
  await page.waitForFunction(()=>/annonce pour ce tournoi/.test(document.getElementById('ft-annonces').textContent));
  assert.match(await page.textContent('#ft-annonces'),/Connecte-toi pour lire les annonces/);
  await page.waitForFunction(()=>/Note du club/.test(document.getElementById('ft-avis').textContent));
  assert.match(await page.textContent('#ft-avis'),/Note du club : 4\/5 sur 1 avis · 100 % recommandent/);
  assert.match(await page.textContent('#ft-avis'),/apparaîtront après le tournoi/);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),390);
  ok('sans compte : nombre de « J\'y vais » et d\'annonces, note du club, invitation à se connecter');
  let j=await journal(page);
  assert.ok(j.some(x=>x.table==='avis'&&x.op==='select'),'la liste des avis doit être demandée sans compte');
  assert.deepEqual(j.filter(x=>/user_id/.test(x.colonnes||'')),[],'un visiteur ne doit jamais demander user_id');
  assert.deepEqual(j.filter(x=>x.rpc==='presences_tournoi'||x.rpc==='mon_avis'||x.table==='presences'),[],'presences_tournoi, mon_avis et presences réservés aux connectés');
  ok('sans compte : aucune demande de user_id, ni de presences_tournoi ou mon_avis');
  await ctx.close();

  /* Connecté avec pseudo : J'y vais (tournoi dans 10 jours : la liste des joueurs est visible) */
  const proche=new Date(new Date(t.date_debut+'T12:00:00').getTime()-10*86400000);
  ({ctx,page}=await nouveau({utilisateur:'U1',date:proche}));
  await page.waitForSelector('#ft-presences .ct-jyvais');
  assert.equal(await page.getAttribute('#ft-presences .ct-jyvais','aria-pressed'),'false');
  assert.match(await page.textContent('#ft-presences .ct-joueurs'),/Léo · P50/);
  await page.click('#ft-presences .ct-jyvais');
  await page.waitForFunction(()=>/2 joueurs du site y vont/.test(document.getElementById('ft-presences').textContent));
  assert.match(await page.textContent('#ft-presences .ct-joueurs'),/Sam · P100/);
  assert.match(await page.textContent('#ft-presences .ct-joueur.moi'),/Sam/);
  assert.equal(await page.locator('#ft-presences .ct-joueur.moi').count(),1);
  assert.equal(await page.getAttribute('#ft-presences .ct-jyvais','aria-pressed'),'true');
  await page.click('#ft-presences .ct-jyvais');
  await page.waitForFunction(()=>/1 joueur du site y va/.test(document.getElementById('ft-presences').textContent));
  ok('connecté : « J\'y vais » ajoute puis retire le joueur (pseudo + classement)');
  j=await journal(page);
  assert.ok(j.some(x=>x.rpc==='presences_tournoi'),'liste par presences_tournoi');
  assert.ok(j.some(x=>x.rpc==='mon_avis'),'mon avis par mon_avis');
  assert.deepEqual(j.filter(x=>x.op==='select'&&(x.table==='presences'||/user_id/.test(x.colonnes||''))),[],'plus de lecture directe de presences ni de user_id');
  ok('connecté : liste par presences_tournoi (est_moi), mon avis par mon_avis, aucun select de user_id');
  await page.waitForSelector('#ft-annonces .ct-annonces li');
  assert.match(await page.textContent('#ft-annonces'),/Cherche partenaire côté droit/);
  assert.match(await page.getAttribute('#ft-annonces a.btn','href'),new RegExp('partenaires\\.html\\?tournoi='+t.id));
  ok('connecté : annonces du tournoi listées, lien vers le formulaire');
  await ctx.close();

  /* S2 bis : tournoi dans plus de 60 jours, presences_tournoi ne renvoie que ma ligne : le nombre et une explication */
  const loin=new Date(new Date(t.date_debut+'T12:00:00').getTime()-90*86400000);
  ({ctx,page}=await nouveau({utilisateur:'U1',date:loin}));
  await page.waitForSelector('#ft-presences .ct-jyvais');
  assert.match(await page.textContent('#ft-presences'),/1 joueur du site y va/);
  assert.match(await page.textContent('#ft-presences .ct-liste-plus-tard'),/La liste des joueurs s'affiche dans les 60 jours avant le tournoi\./);
  assert.equal(await page.locator('#ft-presences .ct-joueurs').count(),0,'pas de liste à plus de 60 jours');
  await page.click('#ft-presences .ct-jyvais');
  await page.waitForFunction(()=>/2 joueurs du site y vont/.test(document.getElementById('ft-presences').textContent));
  assert.equal(await page.getAttribute('#ft-presences .ct-jyvais','aria-pressed'),'true');
  assert.match(await page.textContent('#ft-presences .ct-liste-plus-tard'),/Tu fais partie des inscrits/);
  assert.equal(await page.locator('#ft-presences .ct-joueurs').count(),0);
  assert.doesNotMatch(await page.textContent('#ft-presences'),/Léo/,'le pseudo des autres joueurs ne doit pas apparaître');
  ok('tournoi dans plus de 60 jours : nombre de joueurs (nb_presences), « La liste des joueurs s\'affiche dans les 60 jours avant le tournoi. », pas de pseudo, bouton juste');
  await ctx.close();

  /* Sans pseudo : message clair */
  ({ctx,page}=await nouveau({utilisateur:'U3'}));
  await page.waitForSelector('#ft-presences .ct-jyvais');
  await page.click('#ft-presences .ct-jyvais');
  await page.waitForFunction(()=>/Choisis d'abord un pseudo valide dans ton compte/.test((document.querySelector('#ft-presences .ct-msg')||{}).textContent||''));
  ok('sans pseudo valide (PSEUDO_REQUIS) : « J\'y vais » refusé, « Choisis d\'abord un pseudo valide dans ton compte. »');
  await ctx.close();

  /* Pendant le tournoi : formulaire d'avis (charte à accepter), filtres */
  const pendant=new Date(t.date_debut+'T12:00:00');
  ({ctx,page}=await nouveau({utilisateur:'U1',date:pendant}));
  await page.waitForSelector('#ft-avis form.ct-form');
  assert.ok(await page.isHidden('#ft-presences .ct-jyvais')===false);
  await page.click('#ft-avis button[type=submit]');
  assert.match(await page.textContent('#ft-avis .ct-msg'),/trois questions/);
  await page.click('#ft-avis label.tchip:has(input[name=organisation][value="5"])');
  await page.click('#ft-avis label.tchip:has(input[name=niveau][value="4"])');
  await page.click('#ft-avis label.tchip:has(input[name=recommande][value="1"])');
  for(const texte of ['Écris-moi sur jean@mail.fr','06/12/34/56/78','insta jdupont','bit.ly/abc','０６１２３４５６７８','06 et 12 et 34 et 56 et 78','٠٦١٢٣٤٥٦٧٨','i n s t a jean']){
   await page.fill('#ct-texte',texte);
   await page.click('#ft-avis button[type=submit]');
   assert.match(await page.textContent('#ft-avis .ct-msg'),/coordonnées/,'texte non refusé : '+texte);
   await page.fill('#ct-texte','Super ambiance, balles neuves.');
   await page.click('#ft-avis button[type=submit]');
   assert.match(await page.textContent('#ft-avis .ct-msg'),/15 ans/);
  }
  assert.equal(await page.evaluate(()=>window.__base.avis.filter(a=>a.user_id==='U1').length),0);
  ok('avis : « 06/12/34/56/78 », « insta jdupont », « bit.ly/abc » et les chiffres pleine chasse refusés avant envoi');
  await page.fill('#ct-texte','P250+45 20/11 17h');
  await page.check('#ft-avis .ct-charte input');
  await page.click('#ft-avis button[type=submit]');
  await page.waitForFunction(()=>/visible par les autres joueurs après la fin/.test(document.getElementById('ft-avis').textContent));
  assert.ok(await page.isHidden('#ft-avis form.ct-form').catch(()=>true));
  const stocke=await page.evaluate(()=>window.__base.avis.find(a=>a.user_id==='U1'));
  assert.equal(stocke.organisation,5);assert.equal(stocke.niveau_reel,4);assert.equal(stocke.recommande,true);assert.equal(stocke.club,t.club);
  assert.equal(stocke.texte,'P250+45 20/11 17h');
  assert.equal(await page.evaluate(()=>window.__base.profils.U1.charte),true);
  // Mon avis (retrouvé par mon_avis) s'affiche avant la fin, avec « Supprimer mon avis » et sans « Signaler »
  assert.match(await page.textContent('#ft-avis .ct-avis'),/P250\+45 20\/11 17h/);
  assert.equal(await page.locator('#ft-avis .ct-avis button:has-text("Supprimer mon avis")').count(),1);
  assert.equal(await page.locator('#ft-avis .ct-avis .ct-signaler').count(),0);
  const envoi=(await journal(page)).find(x=>x.table==='avis'&&x.op==='insert');
  assert.deepEqual(envoi.cles.filter(c=>/club|date/.test(c)),[],'club et dates ne sont plus envoyés (recopiés par la base)');
  ok('avis : « P250+45 20/11 17h » accepté, charte acceptée, club et dates recopiés par la base, mon avis reconnu par mon_avis');
  await page.click('#ft-avis button:has-text("Supprimer mon avis")');
  await page.waitForSelector('#ft-avis form.ct-form');
  assert.equal(await page.evaluate(()=>window.__base.avis.filter(a=>a.user_id==='U1').length),0);
  ok('avis : « Supprimer mon avis » efface l\'avis et rouvre le formulaire');
  await ctx.close();

  /* Nouvelles erreurs S2 : messages clairs */
  const etatInconnu=copie(etatInitial);etatInconnu.tournois_ref={};
  ({ctx,page}=await nouveau({utilisateur:'U1',etat:etatInconnu}));
  await page.waitForSelector('#ft-presences .ct-jyvais');
  await page.click('#ft-presences .ct-jyvais');
  await page.waitForFunction(()=>/pas encore connu du site/.test((document.querySelector('#ft-presences .ct-msg')||{}).textContent||''));
  ok('« J\'y vais » sur un tournoi absent de tournois_ref : « Ce tournoi n\'est pas encore connu du site »');
  await ctx.close();
  const etatTermine=copie(etatInitial);etatTermine.tournois_ref[t.id].date_fin='2020-01-01';
  ({ctx,page}=await nouveau({utilisateur:'U1',etat:etatTermine}));
  await page.waitForSelector('#ft-presences .ct-jyvais');
  await page.click('#ft-presences .ct-jyvais');
  await page.waitForFunction(()=>/Ce tournoi est terminé : tu ne peux plus/.test((document.querySelector('#ft-presences .ct-msg')||{}).textContent||''));
  ok('« J\'y vais » refusé par la base (TOURNOI_TERMINE) : message clair, espace insécable avant « : »');
  await ctx.close();
  const etatQuota=copie(etatInitial);etatQuota.quota_atteint=['avis'];Object.assign(etatQuota.profils.U1,{charte:true,age_confirme_at:'2026-01-01T00:00:00Z',charte_acceptee_at:'2026-01-01T00:00:00Z'});
  ({ctx,page}=await nouveau({utilisateur:'U1',date:pendant,etat:etatQuota}));
  await page.waitForSelector('#ft-avis form.ct-form');
  await page.click('#ft-avis label.tchip:has(input[name=organisation][value="3"])');
  await page.click('#ft-avis label.tchip:has(input[name=niveau][value="3"])');
  await page.click('#ft-avis label.tchip:has(input[name=recommande][value="2"])');
  await page.fill('#ct-texte','P100 141126');
  await page.click('#ft-avis button[type=submit]');
  await page.waitForFunction(()=>/nombre maximum d'enregistrements/.test((document.querySelector('#ft-avis .ct-msg')||{}).textContent||''));
  assert.equal(await page.isEnabled('#ft-avis button[type=submit]'),true);
  assert.match(await page.textContent('#ft-avis .ct-msg'),/Supprime-en un ancien/);
  ok('avis : « P100 141126 » passe le filtre, quota atteint (LIMITE_LIGNES) affiché clairement, bouton réactivé');
  // S2 bis (s2-30) : e-mail non confirmé, puis compte créé après le début du tournoi
  await page.evaluate(()=>{window.__base.quota_atteint=[];window.__base.profils.U1.email_non_confirme=true;window.__garder();});
  await page.fill('#ct-texte','Dispo le 12/11 à 18h30, P250 + 45 ans');
  await page.click('#ft-avis button[type=submit]');
  await page.waitForFunction(()=>/Confirme d'abord ton adresse e-mail \(lien reçu à l'inscription\)\./.test((document.querySelector('#ft-avis .ct-msg')||{}).textContent||''));
  await page.evaluate(()=>{window.__base.profils.U1.email_non_confirme=false;window.__base.profils.U1.compte_recent=true;window.__garder();});
  await page.click('#ft-avis button[type=submit]');
  await page.waitForFunction(()=>/Pour éviter les faux avis, il faut un compte créé avant le début du tournoi\./.test((document.querySelector('#ft-avis .ct-msg')||{}).textContent||''));
  await page.evaluate(()=>{window.__base.profils.U1.compte_recent=false;window.__base.profils.U1.pseudo_invalide=true;window.__garder();});
  await page.click('#ft-avis button[type=submit]');
  await page.waitForFunction(()=>/Choisis d'abord un pseudo valide dans ton compte\./.test((document.querySelector('#ft-avis .ct-msg')||{}).textContent||''));
  assert.equal(await page.evaluate(()=>window.__base.avis.filter(a=>a.user_id==='U1').length),0);
  assert.equal(await page.isEnabled('#ft-avis button[type=submit]'),true);
  ok('avis refusé par la base (S2 bis) : EMAIL_NON_CONFIRME, AVIS_COMPTE_RECENT et PSEUDO_REQUIS affichés en clair, « Dispo le 12/11 à 18h30, P250 + 45 ans » accepté par le filtre');
  await ctx.close();

  /* Après le tournoi : avis visibles par tous, signalement, masquage à 3 */
  const apres=new Date(new Date((t.date_fin||t.date_debut)+'T12:00:00').getTime()+5*86400000);
  const etatApres=JSON.parse(JSON.stringify(etatInitial));
  etatApres.avis.push({id:'avis-9',user_id:'U2',tournoi_id:t.id,club:t.club,pseudo:'Léo',organisation:2,niveau_reel:5,recommande:false,texte:'Tableau très relevé.',masque:false,nb_signalements:2,created_at:'2026-12-01T10:00:00Z'});
  etatApres.signalements=[{avis_id:'avis-9',user_id:'X1'},{avis_id:'avis-9',user_id:'X2'}];
  ({ctx,page}=await nouveau({date:apres,etat:etatApres}));
  await page.waitForSelector('#ft-avis .ct-avis');
  assert.match(await page.textContent('#ft-avis'),/Tableau très relevé/);assert.match(await page.textContent('#ft-avis'),/Ne le recommande pas/);
  assert.match(await page.textContent('#ft-avis'),/Note du club : 3\/5 sur 2 avis · 50 % recommandent/);
  assert.equal(await page.locator('#ft-presences .ct-jyvais').count(),0);
  assert.match(await page.textContent('#ft-presences'),/y était/);
  ok('après le tournoi : avis visibles sans compte, note du club recalculée, plus de « J\'y vais »');
  await ctx.close();
  ({ctx,page}=await nouveau({date:apres,etat:etatApres,utilisateur:'U1'}));
  await page.waitForSelector('#ft-avis .ct-signaler');
  await page.click('#ft-avis .ct-signaler summary');
  await page.selectOption('#ft-avis .ct-signaler select','nom');
  await page.click('#ft-avis .ct-signaler button');
  await page.waitForFunction(()=>/Merci/.test(document.querySelector('#ft-avis .ct-signaler').textContent));
  assert.equal(await page.evaluate(()=>window.__base.avis.find(a=>a.id==='avis-9').masque),true);
  ok('signalement : 3e signalement, avis masqué automatiquement');
  await ctx.close();
  // 10 signalements déjà envoyés dans les dernières 24 h : refus de la base (LIMITE_SIGNALEMENTS)
  const etatLimite=copie(etatApres);
  for(let i=0;i<10;i++)etatLimite.signalements.push({avis_id:'autre-'+i,user_id:'U1'});
  ({ctx,page}=await nouveau({date:apres,etat:etatLimite,utilisateur:'U1'}));
  await page.waitForSelector('#ft-avis .ct-signaler');
  await page.click('#ft-avis .ct-signaler summary');
  await page.click('#ft-avis .ct-signaler button');
  await page.waitForFunction(()=>/10 signalements par 24 h/.test(document.querySelector('#ft-avis .ct-signaler').textContent));
  assert.equal(await page.evaluate(()=>window.__base.avis.find(a=>a.id==='avis-9').masque),false);
  ok('signalement : limite de 10 par 24 h (LIMITE_SIGNALEMENTS) affichée clairement');
  await ctx.close();

  /* Modération admin dans compte.html */
  ({ctx,page}=await nouveau({utilisateur:'ADM',url:'/compte.html',etat:{...etatApres,avis:etatApres.avis.map(a=>a.id==='avis-9'?{...a,masque:true,nb_signalements:3}:a)}}));
  await page.waitForSelector('#moderation-avis:not([hidden]) .ct-avis');
  assert.match(await page.textContent('#moderation-avis'),/Tableau très relevé.*3 signalements|3 signalements/);
  await page.click('#moderation-avis button:has-text("Rétablir")');
  await page.waitForFunction(()=>/Aucun avis signalé/.test(document.getElementById('moderation-avis').textContent));
  assert.equal(await page.evaluate(()=>window.__base.avis.find(a=>a.id==='avis-9').masque),false);
  ok('admin : avis signalés listés dans Mon compte, « Rétablir » efface les signalements');
  await ctx.close();
  ({ctx,page}=await nouveau({utilisateur:'U1',url:'/compte.html'}));
  await page.waitForTimeout(800);
  // Le filtre de partenaires.js chargé dans la page donne les mêmes résultats que dans Node
  const filtrePage=await page.evaluate(([r,a])=>{const f=window.PA_PARTENAIRES.contientContact;return [r.map(f),a.map(f)];},[FILTRE_REFUSES,FILTRE_ACCEPTES]);
  assert.deepEqual(filtrePage,[FILTRE_REFUSES.map(()=>true),FILTRE_ACCEPTES.map(()=>false)]);
  ok('compte.html : filtre de partenaires.js chargé avec communaute-tournoi.js, mêmes résultats, aucun conflit de noms');
  assert.ok(await page.isHidden('#moderation-avis'));
  ok('non admin : section de modération invisible');
  await ctx.close();

  /* ===== Trouver un partenaire (partenaires.html, Mon compte) : AVANT et APRÈS S2 bis ===== */
  // partenaires.js n'attend pas « activees » : il doit marcher avec la base actuelle et avec S2 bis exécuté
  const etatPart=copie(etatInitial);
  Object.assign(etatPart.profils.U1,{charte:true,age_confirme_at:'2026-01-01T00:00:00Z',charte_acceptee_at:'2026-01-01T00:00:00Z'});
  const modele=etatPart.annonces[0];
  etatPart.annonces.push({...modele,id:'a2',user_id:'U1',pseudo:'Sam',classement_p:'P100',sexe:'mixte',cote:'droite',message:'Cherche une partenaire pour le mixte',created_at:'2026-10-21T10:00:00Z'});
  etatPart.annonces.push({...modele,id:'a3',user_id:'U4',pseudo:'Max',classement_p:'P250',sexe:'mixte',cote:'gauche',message:'Mixte, je joue à gauche',created_at:'2026-10-22T10:00:00Z'});
  etatPart.reponses=[
   {id:'r1',annonce_id:'a2',user_id:'U2',pseudo:'Léo',message:'Je suis dispo.',statut:'en_attente',message_retour:null,created_at:'2026-10-23T10:00:00Z'},
   {id:'r2',annonce_id:'a1',user_id:'U1',pseudo:'Sam',message:'Partant pour le tableau messieurs.',statut:'en_attente',message_retour:null,created_at:'2026-10-24T10:00:00Z'}];
  const urlPart='/partenaires.html?tournoi='+encodeURIComponent(t.id);
  const carte=(page,texte)=>page.locator('#pt-annonces .pt-carte',{hasText:texte});
  // Lectures interdites après S2 bis : « * », user_id demandé ou filtré, sur annonces et reponses
  const interdites=j=>j.filter(x=>(x.table==='annonces'||x.table==='reponses')&&(x.colonnes==='*'||x.retour==='*'||/user_id/.test((x.colonnes||'')+(x.retour||''))||(x.filtres||[]).includes('user_id')));

  // --- Après S2 bis ---
  ({ctx,page}=await nouveau({utilisateur:'U1',url:urlPart,etat:etatPart}));
  await page.waitForFunction(()=>document.querySelectorAll('#pt-annonces .pt-carte').length===3);
  assert.equal(await carte(page,'Cherche une partenaire pour le mixte').locator('.pt-badge',{hasText:'Ton annonce'}).count(),1);
  assert.equal(await carte(page,'Cherche une partenaire pour le mixte').locator('button').count(),0,'pas de « Ça m\'intéresse » ni de « Signaler » sur ma propre annonce');
  assert.equal(await carte(page,'Cherche partenaire côté droit').locator('.pt-badge',{hasText:'Tu as répondu'}).count(),1);
  assert.equal(await carte(page,'Mixte, je joue à gauche').locator('button',{hasText:"Ça m'intéresse"}).count(),1);
  assert.equal(await page.locator('#pt-annonces .pt-badge',{hasText:'Ton annonce'}).count(),1);
  j=await journal(page);
  assert.ok(j.some(x=>x.rpc==='mes_annonces')&&j.some(x=>x.rpc==='mes_reponses'),'mes_annonces() et mes_reponses() appelées');
  assert.deepEqual(interdites(j),[],'aucune lecture de user_id ni de « * » sur annonces et reponses');
  ok('partenaires.html après S2 bis : « Ton annonce » reconnue par mes_annonces(), « Tu as répondu » par mes_reponses(), aucune lecture de user_id ni « * »');
  // Filtre v3 dans le formulaire de publication
  await page.fill('#pt-texte','06 et 12 et 34 et 56 et 78');
  assert.equal(await page.isVisible('#pt-alerte-contact'),true);
  await page.click('#pt-publier-btn');
  assert.match(await page.textContent('#pt-form-msg'),/Ton message contient un e-mail, un numéro/);
  assert.equal(await page.evaluate(()=>window.__base.annonces.length),3);
  await page.fill('#pt-texte','Dispo le 12/11 à 18h30, P250 + 45 ans');
  assert.equal(await page.isVisible('#pt-alerte-contact'),false);
  await page.click('#pt-publier-btn');
  await page.waitForFunction(()=>/Annonce publiée/.test(document.getElementById('pt-form-msg').textContent));
  const publiee=await page.evaluate(()=>window.__base.annonces[3]);
  assert.equal(publiee.user_id,'U1');assert.equal(publiee.message,'Dispo le 12/11 à 18h30, P250 + 45 ans');
  await page.waitForFunction(()=>document.querySelectorAll('#pt-annonces .pt-carte').length===4);
  assert.equal(await page.locator('#pt-annonces .pt-badge',{hasText:'Ton annonce'}).count(),2,'la nouvelle annonce est reconnue comme la mienne');
  const insertion=(await journal(page)).find(x=>x.table==='annonces'&&x.op==='insert');
  assert.ok(insertion.cles.includes('user_id'),'user_id toujours envoyé à l\'insertion');
  assert.ok(insertion.retour&&insertion.retour!=='*'&&!/user_id/.test(insertion.retour),'retour de l\'insert : colonnes listées sans user_id');
  ok('publication : « 06 et 12 et 34 et 56 et 78 » refusé, « Dispo le 12/11 à 18h30, P250 + 45 ans » publié, insert avec user_id et retour sans user_id');
  // Répondre à une annonce : bouton « Ça m'intéresse »
  await carte(page,'Mixte, je joue à gauche').locator('button',{hasText:"Ça m'intéresse"}).click();
  await page.fill('#rep-a3','Partant, je joue à droite.');
  await carte(page,'Mixte, je joue à gauche').locator('button[type=submit]').click();
  await page.waitForFunction(()=>/Réponse envoyée à Max/.test(document.getElementById('pt-annonces').textContent));
  await page.waitForFunction(()=>[...document.querySelectorAll('#pt-annonces .pt-carte')].some(c=>/Mixte, je joue à gauche/.test(c.textContent)&&/Tu as répondu/.test(c.textContent)));
  assert.equal(await page.evaluate(()=>window.__base.reponses.filter(r=>r.user_id==='U1').length),2);
  assert.deepEqual(interdites(await journal(page)),[]);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),390);
  ok('réponse : « Ça m\'intéresse », message envoyé, « Tu as répondu » affiché ; 390 px sans débordement');
  await ctx.close();

  // --- Erreurs de publication S2 bis : pseudo au mauvais format, tournoi absent de tournois_ref ---
  const etatPartInconnu=copie(etatPart);etatPartInconnu.tournois_ref={};etatPartInconnu.profils.U1.pseudo_invalide=true;
  ({ctx,page}=await nouveau({utilisateur:'U1',url:urlPart,etat:etatPartInconnu}));
  await page.waitForFunction(()=>document.querySelectorAll('#pt-annonces .pt-carte').length===3);
  await page.fill('#pt-texte','P1000 du 12 au 14/12/2026, 32 paires');
  await page.click('#pt-publier-btn');
  await page.waitForFunction(()=>/Choisis d'abord un pseudo valide dans ton compte\./.test(document.getElementById('pt-form-msg').textContent));
  assert.equal(await page.isEnabled('#pt-publier-btn'),true);
  await page.evaluate(()=>{window.__base.profils.U1.pseudo_invalide=false;window.__garder();});
  await page.click('#pt-publier-btn');
  await page.waitForFunction(()=>/Ce tournoi n'est pas encore connu du site/.test(document.getElementById('pt-form-msg').textContent));
  assert.equal(await page.evaluate(()=>window.__base.annonces.length),3);
  ok('publication refusée par la base : PSEUDO_REQUIS (« Choisis d\'abord un pseudo valide dans ton compte. ») et TOURNOI_INCONNU traduits ; « P1000 du 12 au 14/12/2026, 32 paires » passe le filtre');
  await ctx.close();

  // --- Mon compte après S2 bis : mes annonces, réponses reçues, mes réponses ---
  ({ctx,page}=await nouveau({utilisateur:'U1',url:'/compte.html',etat:etatPart}));
  await page.waitForSelector('#compte-partenaires .pt-carte');
  await page.waitForFunction(()=>/Mes réponses/.test(document.getElementById('compte-partenaires').textContent)&&/Ton message/.test(document.getElementById('compte-partenaires').textContent));
  const zoneCompte=await page.textContent('#compte-partenaires');
  assert.match(zoneCompte,/Cherche une partenaire pour le mixte/);assert.match(zoneCompte,/Ton annonce/);
  assert.match(zoneCompte,/Réponses reçues \(1\)/);assert.match(zoneCompte,/Je suis dispo\./);
  assert.match(zoneCompte,/Ton message : Partant pour le tableau messieurs\./);
  assert.doesNotMatch(zoneCompte,/Cherche partenaire côté droit.*Ton annonce/);
  j=await journal(page);
  assert.ok(j.some(x=>x.rpc==='mes_annonces')&&j.some(x=>x.rpc==='mes_reponses'));
  assert.deepEqual(interdites(j),[],'Mon compte : aucune lecture de user_id ni de « * » sur annonces et reponses');
  ok('Mon compte après S2 bis : mes annonces (mes_annonces), réponse reçue, mes réponses (mes_reponses), aucune lecture de user_id');
  await ctx.close();

  // --- Avant S2 bis : fonctions absentes (PGRST202, 404), repli sur l'ancienne lecture filtrée sur user_id ---
  const etatAvant=copie(etatPart);etatAvant.s2bis=false;
  ({ctx,page}=await nouveau({utilisateur:'U1',url:urlPart,etat:etatAvant}));
  await page.waitForFunction(()=>document.querySelectorAll('#pt-annonces .pt-carte').length===3);
  assert.equal(await carte(page,'Cherche une partenaire pour le mixte').locator('.pt-badge',{hasText:'Ton annonce'}).count(),1);
  assert.equal(await carte(page,'Cherche partenaire côté droit').locator('.pt-badge',{hasText:'Tu as répondu'}).count(),1);
  // Rafraîchissements de la liste (filtre par épreuve) : la fonction absente n'est plus redemandée
  await page.selectOption('#pt-filtre-sexe','mixte');
  await page.waitForFunction(()=>document.querySelectorAll('#pt-annonces .pt-carte').length===2);
  await page.selectOption('#pt-filtre-sexe','');
  await page.waitForFunction(()=>document.querySelectorAll('#pt-annonces .pt-carte').length===3);
  await page.fill('#pt-texte','Dispo le 12/11 à 18h30, P250 + 45 ans');
  await page.click('#pt-publier-btn');
  await page.waitForFunction(()=>/Annonce publiée/.test(document.getElementById('pt-form-msg').textContent));
  await page.waitForFunction(()=>document.querySelectorAll('#pt-annonces .pt-carte').length===4);
  assert.equal(await page.locator('#pt-annonces .pt-badge',{hasText:'Ton annonce'}).count(),2);
  j=await journal(page);
  assert.equal(j.filter(x=>x.rpc==='mes_annonces').length,1,'mes_annonces absente : demandée une seule fois par page');
  assert.equal(j.filter(x=>x.rpc==='mes_reponses').length,1,'mes_reponses absente : demandée une seule fois par page');
  assert.ok(j.filter(x=>x.table==='annonces'&&x.op==='select'&&x.filtres.includes('user_id')).length>=3,'repli : lecture filtrée sur user_id');
  assert.ok(j.some(x=>x.table==='reponses'&&x.op==='select'&&x.filtres.includes('user_id')));
  assert.deepEqual(j.filter(x=>x.colonnes==='*'&&(x.table==='annonces'||x.table==='reponses')),[]);
  ok('partenaires.html avant S2 bis : mes_annonces() et mes_reponses() introuvables (PGRST202, 404), repli sur la lecture filtrée sur user_id, « Ton annonce » et publication OK');
  await ctx.close();
  ({ctx,page}=await nouveau({utilisateur:'U1',url:'/compte.html',etat:etatAvant}));
  await page.waitForFunction(()=>/Ton message/.test((document.getElementById('compte-partenaires')||{}).textContent||''));
  assert.match(await page.textContent('#compte-partenaires'),/Réponses reçues \(1\)/);
  ok('Mon compte avant S2 bis : mes annonces et mes réponses par le repli');
  await ctx.close();

  assert.deepEqual(erreurs,[]);
  ok('aucune erreur console');
  console.log('TOTAL '+nb+' contrôles réussis.');
 }finally{await browser.close();serveur.close();}
})().catch(e=>{console.error(e);serveur.close();process.exitCode=1;});
