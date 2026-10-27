/* CARNET DE MATCH · outils du journal (espace.html, bloc « Mes matchs ») : moteur pur, sans DOM, testé sous Node.
   - filtrer : période, type de match, partenaire (s'ajoutent au filtre de période existant) ;
   - tendance : motifs des points perdus sur les n derniers matchs comptés (seulement les points dont le motif a été noté
     au compteur : des comptes, jamais une estimation) ;
   - csv : export du journal filtré pour un tableur (séparateur « ; », BOM pour Excel ; une cellule qui commence par
     = + - @ est neutralisée pour qu'un tableur ne l'exécute pas comme une formule).
   Les entrées sont celles de PA_JOURNAL.liste() (journal.js). */
// Motifs (SC_MOTIFS de score.js, du point de vue de la paire qui gagne) relus du point de vue du joueur qui perd le point
const CA_PERDUS={faute:"Tes fautes directes",double:"Tes doubles fautes",smash:"Smash adverse",volee:"Volée adverse",lob:"Lob adverse",vitre:"Sortie de vitre adverse",gagnant:"Coup gagnant adverse"};
const CA_SANS_PARTENAIRE="-"; // valeur du filtre pour « Partenaire non précisé »

function caFiltrer(liste,{jours=null,type="",partenaire="",maintenant=Date.now()}={}){
 const depuis=jours?maintenant-jours*86400000:-Infinity;
 return liste.filter(m=>Date.parse(m.fin)>=depuis&&(!type||m.type===type)&&
  (!partenaire||(partenaire===CA_SANS_PARTENAIRE?!m.partenaire:m.partenaire===partenaire)));
}
// Partenaires présents dans le journal, du plus fréquent au moins fréquent
function caPartenaires(liste){
 const n=new Map();liste.forEach(m=>{if(m.partenaire)n.set(m.partenaire,(n.get(m.partenaire)||0)+1);});
 return [...n.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0],"fr")).map(x=>x[0]);
}
// Motifs des points perdus sur les n derniers matchs comptés : { matchs, total, motifs: [{ motif, n, part }] } (part de 0 à 1)
function caTendance(liste,n){
 const comptes=liste.filter(m=>m.pointsTotal>0&&m.motifsPerdus).sort((a,b)=>Date.parse(b.fin)-Date.parse(a.fin)).slice(0,n);
 const somme={};let total=0;
 comptes.forEach(m=>Object.entries(m.motifsPerdus).forEach(([k,v])=>{if(CA_PERDUS[k]&&Number.isInteger(v)&&v>0){somme[k]=(somme[k]||0)+v;total+=v;}}));
 const motifs=Object.entries(somme).map(([motif,v])=>({motif,n:v,part:v/total})).sort((a,b)=>b.n-a.n||a.motif.localeCompare(b.motif));
 return {matchs:comptes.length,total,motifs};
}
// Export : une ligne par match, du plus récent au plus ancien
function caCsv(liste,types){
 const cellule=v=>{let s=v==null?"":String(v);if(/^[=+\-@\t\r]/.test(s))s="'"+s;return /[;"\r\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;};
 const lignes=[["Date","Type","Partenaire","Adversaires","Score","Résultat","Points gagnés","Points joués","Saisie","Points perdus par motif"]];
 liste.slice().sort((a,b)=>Date.parse(b.fin)-Date.parse(a.fin)).forEach(m=>{
  const motifs=Object.entries(m.motifsPerdus||{}).filter(([k])=>CA_PERDUS[k]).map(([k,v])=>CA_PERDUS[k]+" : "+v).join(", ");
  lignes.push([new Date(m.fin).toISOString().slice(0,10),m.type?(types||{})[m.type]||m.type:"",m.partenaire||"",m.adversaires||"",m.score||"",
   m.vainqueur===0?"Victoire":m.vainqueur===1?"Défaite":"Match arrêté",m.pointsTotal?m.pointsGagnes:"",m.pointsTotal||"",m.saisie==="manuelle"?"Après coup":"Compteur",motifs]);
 });
 return "﻿"+lignes.map(l=>l.map(cellule).join(";")).join("\r\n")+"\r\n";
}
window.PA_CARNET={filtrer:caFiltrer,partenaires:caPartenaires,tendance:caTendance,csv:caCsv,PERDUS:CA_PERDUS,SANS_PARTENAIRE:CA_SANS_PARTENAIRE};
