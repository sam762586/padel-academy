/* BARÈME FFT PADEL 2026/2027 — Chapitre II « Classements, barèmes & assimilations », applicable au 1er septembre 2026.
   Valeurs reprises du règlement FFT (relevé octobre 2026). Indicatif : vérifier le règlement officiel avant toute réclamation.
   P25 → P250 : points selon le nombre de paires (7 tranches). P500 et P1000 : barèmes messieurs / dames. P2000 et P3000 : barème commun.
   Nouveauté 2026/2027 : le P1500 disparaît (renommé P2000), l'ancien P2000 devient P3000. */
const TRANCHES=["4-8","9-12","13-16","17-20","21-24","25-28","29+"];
const N=null;
const BAREME={
 P25:[[25,25,25,25,25,25,25],[20,20,20,22,22,22,22],[15,16,17,19,19,19,19],[9,14,15,17,17,17,17],[6,10,14,15,15,15,15],[4,8,13,13,13,13,14],[2,7,12,12,12,12,13],[1,6,11,11,11,11,12],[N,4,8,9,9,8,10],[N,3,7,8,8,7,9],[N,2,6,7,7,6,8],[N,1,5,6,6,5,7],[N,N,4,5,5,4,6],[N,N,3,4,5,4,5],[N,N,2,3,5,4,4],[N,N,1,2,5,4,3],[N,N,N,1,4,3,2],[N,N,N,1,4,3,2],[N,N,N,1,3,3,2],[N,N,N,1,3,3,2],[N,N,N,N,2,2,2],[N,N,N,N,2,2,2],[N,N,N,N,1,2,2],[N,N,N,N,1,2,1],[N,N,N,N,N,1,1],[N,N,N,N,N,1,1],[N,N,N,N,N,1,1],[N,N,N,N,N,1,1],[N,N,N,N,N,N,1],[N,N,N,N,N,N,1],[N,N,N,N,N,N,1],[N,N,N,N,N,N,1]],
 P50:[[50,50,50,50,50,50,50],[40,40,40,43,43,43,43],[30,33,35,38,38,38,38],[20,28,30,35,35,35,35],[13,20,25,30,30,30,30],[5,15,23,28,28,28,29],[3,10,20,25,25,25,28],[1,5,15,23,23,23,27],[N,3,13,18,19,19,23],[N,2,11,15,18,18,22],[N,1,9,13,17,17,21],[N,1,8,12,16,16,20],[N,N,5,10,15,15,19],[N,N,3,9,14,14,18],[N,N,2,8,13,13,17],[N,N,1,6,12,12,16],[N,N,N,5,10,10,14],[N,N,N,3,9,9,13],[N,N,N,2,8,8,13],[N,N,N,1,6,7,12],[N,N,N,N,5,6,12],[N,N,N,N,3,5,11],[N,N,N,N,2,4,11],[N,N,N,N,1,3,10],[N,N,N,N,N,2,9],[N,N,N,N,N,2,8],[N,N,N,N,N,1,7],[N,N,N,N,N,1,6],[N,N,N,N,N,N,5],[N,N,N,N,N,N,4],[N,N,N,N,N,N,3],[N,N,N,N,N,N,2]],
 P100:[[100,100,100,100,100,100,100],[80,80,80,85,85,85,85],[60,65,70,75,75,75,75],[40,55,60,70,70,70,70],[25,40,50,60,60,60,60],[10,30,45,55,55,55,58],[5,20,40,50,50,50,56],[1,10,30,45,45,45,54],[N,5,25,35,38,38,45],[N,3,21,30,36,36,43],[N,2,18,25,34,34,41],[N,1,15,23,32,32,39],[N,N,10,20,30,30,37],[N,N,5,18,28,28,35],[N,N,3,15,26,26,33],[N,N,1,12,24,24,31],[N,N,N,10,20,20,27],[N,N,N,5,18,18,26],[N,N,N,3,15,16,25],[N,N,N,1,12,14,24],[N,N,N,N,10,12,23],[N,N,N,N,5,10,22],[N,N,N,N,3,8,21],[N,N,N,N,1,6,20],[N,N,N,N,N,4,17],[N,N,N,N,N,3,15],[N,N,N,N,N,2,13],[N,N,N,N,N,1,11],[N,N,N,N,N,N,9],[N,N,N,N,N,N,7],[N,N,N,N,N,N,5],[N,N,N,N,N,N,3]],
 P250:[[250,250,250,250,250,250,250],[200,200,200,213,213,213,213],[150,165,175,188,188,188,188],[100,140,150,175,175,175,175],[63,100,125,150,150,150,150],[25,75,115,138,138,138,145],[13,50,100,125,125,125,140],[3,25,75,113,113,113,135],[N,13,63,88,95,95,113],[N,8,53,75,90,90,108],[N,5,45,63,85,85,103],[N,3,38,58,80,80,98],[N,N,25,50,75,75,93],[N,N,13,45,70,70,88],[N,N,8,38,65,65,83],[N,N,3,30,60,60,78],[N,N,N,25,50,50,68],[N,N,N,13,45,45,65],[N,N,N,8,38,40,63],[N,N,N,3,30,35,60],[N,N,N,N,25,30,58],[N,N,N,N,13,25,55],[N,N,N,N,8,20,53],[N,N,N,N,3,15,50],[N,N,N,N,N,10,43],[N,N,N,N,N,8,38],[N,N,N,N,N,5,33],[N,N,N,N,N,3,28],[N,N,N,N,N,N,23],[N,N,N,N,N,N,18],[N,N,N,N,N,N,13],[N,N,N,N,N,N,8]],
 P500:{messieurs:[500,425,375,350,300,290,280,270,225,215,205,195,185,175,165,155,135,130,125,120,115,110,105,100,85,75,65,55,45,35,25,15],dames:[500,425,375,350,300,275,250,225,190,180,170,160,150,140,130,120,100,90,80,70,60,50,40,30,20]},
 P1000:{messieurs:[1000,850,750,700,600,580,560,540,450,430,410,390,370,350,330,310,270,260,250,240,230,220,210,200,170,150,130,110,90,70,50,30],dames:[1000,850,750,700,600,550,500,450,380,360,340,320,300,280,260,240,200,180,160,140,120,100,80,60,40]},
 P2000:[2000,1700,1500,1400,1200,1160,1120,1080,900,860,820,780,740,700,660,620,540,520,500,480,460,440,420,400,340,300,260,220,180,140,100,60],
 P3000:[3000,2550,2250,2100,1800,1740,1680,1620,1350,1290,1230,1170,1110,1050,990,930,810,780,750,720,690,660,630,600,510,450,390,330,270,210,150,90],
};
/* Cuts des épreuves seniors : la catégorie est INTERDITE aux joueurs classés dans ce top.
   Relevé sur les fiches Ten'Up le 26/10/2026 (plusieurs milliers d'épreuves, valeurs identiques partout). */
const CUTS=[["P25","Top 30 000","Top 3 000"],["P50","Top 10 000","Top 1 000"],["P100","Top 5 000","Top 500"],["P250","Top 1 000","Top 100"],["P500","Open (liste à la charge des paires)","Open"],["P1000","Open / invitation","Open / invitation"],["P2000","Open","Open"],["P3000","Open","Open"]];
const PLACE_LABEL=i=>i===0?"Vainqueur":i===1?"Finaliste":(i===2||i===3)?`${i+1}e (½ finale)`:(i>=4&&i<=7)?`${i+1}e (¼ finale)`:(i>=8&&i<=15)?`${i+1}e (⅛ finale)`:(i===31?"32e et plus":`${i+1}e`);
const trancheIdx=n=>n<=8?0:n<=12?1:n<=16?2:n<=20?3:n<=24?4:n<=28?5:6;

/* Simulateur : résultats saisis par le joueur (localStorage), utilisés par bareme.html et le tableau de bord du compte */
const SIM_KEY="pa-sim-resultats";
const simIso=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
function simLireDate(texte){
 if(typeof texte!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(texte))return null;
 const [a,m,j]=texte.split("-").map(Number), d=new Date(a,m-1,j,12);
 return a>=1900&&simIso(d)===texte?d:null;
}
function simExpire(date){
 const d=simLireDate(date);
 if(!d)return null;
 const annee=d.getFullYear()+1, mois=d.getMonth();
 // Le 29 février expire le 28 février de l'année suivante.
 return simIso(new Date(annee,mois,Math.min(d.getDate(),new Date(annee,mois+1,0).getDate()),12));
}
function ptsFor(cat,place,nb,sexe){
 if(!Object.prototype.hasOwnProperty.call(BAREME,cat)||!Number.isInteger(place)||place<1||place>32||
    !Number.isInteger(nb)||nb<4||nb>40||!["messieurs","dames"].includes(sexe))return null;
 const d=BAREME[cat];
 if(Array.isArray(d)&&Array.isArray(d[0]))return place>nb?null:d[place-1]?.[trancheIdx(nb)]??null;
 if(Array.isArray(d))return d[place-1]??null;
 return (sexe==="messieurs"?d.messieurs[place-1]:d.dames[Math.min(place-1,24)])??null;
}
function simNormaliser(liste){
 if(!Array.isArray(liste))return [];
 return liste.filter(r=>r&&ptsFor(r.cat,r.place,r.nb,r.sexe)!==null).map(r=>({
  cat:r.cat,place:r.place,nb:r.nb,sexe:r.sexe,date:simLireDate(r.date)?r.date:null
 }));
}

// Classement estimé à une date donnée (AAAA-MM-JJ) : les 12 meilleurs résultats encore valables (12 mois glissants)
function classementEstime(resultats,jour){
 const lignes=simNormaliser(resultats).map((r,index)=>({...r,index,pts:ptsFor(r.cat,r.place,r.nb,r.sexe)}));
 const retenus=lignes.filter(r=>r.date&&r.date<=jour&&simExpire(r.date)>jour).sort((a,b)=>b.pts-a.pts||a.index-b.index).slice(0,12);
 return {retenus,total:retenus.reduce((s,r)=>s+r.pts,0)};
}
// Cuts en nombres : classement à partir duquel la catégorie est FERMÉE au joueur (mêmes valeurs que CUTS)
const CUTS_NUM={P25:{messieurs:30000,dames:3000},P50:{messieurs:10000,dames:1000},P100:{messieurs:5000,dames:500},P250:{messieurs:1000,dames:100}};
window.PA_BAREME={BAREME,TRANCHES,CUTS,CUTS_NUM,PLACE_LABEL,trancheIdx,ptsFor,simIso,simLireDate,simExpire,simNormaliser,classementEstime,SIM_KEY};
