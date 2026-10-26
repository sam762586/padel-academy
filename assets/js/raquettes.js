/* RAQUETTES */
/* controle / puissance notés 1-5 ; niveau : 1 déb, 2 inter, 3 avancé ; genre : mixte|femme ; confort : 1-5 */
/* Base raquettes — relevé du 26/10/2026 (Padel Reference ; prix non retrouvés : relevé du 25/10/2026 chez Padel Nuestro, Decathlon, Padel Pro Shop), souvent en promo : à dater et vérifier avant achat. */
const RACKETS = [
 {marque:"Kuikma",modele:"PR 560 (2025)",forme:"ronde",balance:"bas",poids:"350-365",niveau:1,controle:5,puissance:1,confort:5,genre:"mixte",prix:50,desc:"La porte d'entrée Decathlon : tolérante, légère, idéale pour les 20 premières séances."},
 {marque:"Kuikma",modele:"PR 990 Hybrid Soft (2025)",forme:"goutte",balance:"moyen",poids:"355-370",niveau:2,controle:4,puissance:3,confort:5,genre:"mixte",prix:130,desc:"Le meilleur rapport qualité-prix du marché pour un intermédiaire, mousse souple très confortable."},
 {marque:"Kuikma",modele:"PR 990 Power Hard (2025)",forme:"diamant",balance:"haut",poids:"360-375",niveau:2,controle:2,puissance:4,confort:3,genre:"mixte",prix:150,desc:"De la puissance sans se ruiner, EVA dure, pour le joueur de gauche qui veut finir."},
 {marque:"Adidas",modele:"Match Light 3.4 (2025)",forme:"ronde",balance:"bas",poids:"345-360",niveau:1,controle:5,puissance:2,confort:4,genre:"mixte",prix:45,desc:"Légère et maniable, fibre de verre, parfaite pour débuter sans se faire mal."},
 {marque:"Head",modele:"Zephyr Pro (2025)",forme:"ronde",balance:"bas",poids:"350-365",niveau:1,controle:5,puissance:2,confort:5,genre:"mixte",prix:140,desc:"Référence confort : grand sweet-spot, bras préservé, idéale pour apprendre les sorties de vitre."},
 {marque:"Head",modele:"Zephyr UL (2025)",forme:"ronde",balance:"bas",poids:"335-350",niveau:1,controle:5,puissance:1,confort:5,genre:"femme",prix:110,desc:"Ultra légère, pensée pour les joueuses débutantes et les bras sensibles."},
 {marque:"Head",modele:"Speed Motion (2025)",forme:"goutte",balance:"moyen",poids:"355-370",niveau:2,controle:3,puissance:3,confort:4,genre:"mixte",prix:160,desc:"Polyvalente très équilibrée, grande tolérance, bonne sortie de balle."},
 {marque:"Head",modele:"Speed Pro (2025)",forme:"diamant",balance:"haut",poids:"365-380",niveau:3,controle:2,puissance:5,confort:3,genre:"mixte",prix:260,desc:"La raquette des attaquants, smash lourd, demande de centrer."},
 {marque:"Head",modele:"Extreme Motion (2025)",forme:"goutte",balance:"moyen",poids:"355-370",niveau:2,controle:3,puissance:3,confort:4,genre:"mixte",prix:195,desc:"Goutte accessible, carbone, pour l'intermédiaire qui veut progresser sans exploser le budget."},
 {marque:"Bullpadel",modele:"Vertex 04 Comfort (2025)",forme:"ronde",balance:"bas",poids:"360-370",niveau:2,controle:5,puissance:3,confort:5,genre:"mixte",prix:220,desc:"La version contrôle-confort de la gamme Vertex : précision et bras épargné."},
 {marque:"Bullpadel",modele:"Vertex 05 (2026)",forme:"diamant",balance:"haut",poids:"365-375",niveau:3,controle:2,puissance:5,confort:3,genre:"mixte",prix:220,desc:"Best-seller puissance, MultiEva triple densité, carbone 12K : le smash qui sort par 4."},
 {marque:"Bullpadel",modele:"Hack 04 Hybrid (2026)",forme:"goutte",balance:"moyen",poids:"365-375",niveau:3,controle:3,puissance:4,confort:3,genre:"mixte",prix:210,desc:"Hybride entre puissance et contrôle, pour le compétiteur polyvalent."},
 {marque:"Bullpadel",modele:"Flow (2025)",forme:"goutte",balance:"moyen",poids:"355-365",niveau:2,controle:4,puissance:3,confort:4,genre:"mixte",prix:150,desc:"Polyvalente douce et maniable, excellente pour franchir le cap intermédiaire."},
 {marque:"Bullpadel",modele:"Flow Woman (2025)",forme:"ronde",balance:"bas",poids:"345-355",niveau:2,controle:4,puissance:3,confort:5,genre:"femme",prix:150,desc:"Version féminine allégée de la Flow, très maniable au filet."},
 {marque:"Nox",modele:"ML10 Pro Cup Luxury (2025)",forme:"ronde",balance:"bas",poids:"360-375",niveau:2,controle:5,puissance:3,confort:5,genre:"mixte",prix:190,desc:"La légende du contrôle (Lamperti), gros confort, sortie de balle facile."},
 {marque:"Nox",modele:"ML10 Pro Cup Ultralight (2025)",forme:"ronde",balance:"bas",poids:"340-350",niveau:1,controle:5,puissance:2,confort:5,genre:"femme",prix:160,desc:"La ML10 allégée pour les joueuses et les bras fragiles."},
 {marque:"Nox",modele:"AT10 Genius 18K (2025)",forme:"goutte",balance:"moyen",poids:"360-375",niveau:3,controle:4,puissance:4,confort:3,genre:"mixte",prix:280,desc:"La pala d'Agustín Tapia : polyvalente haut de gamme, précise et vive."},
 {marque:"Nox",modele:"AT10 Genius 12K (2025)",forme:"goutte",balance:"moyen",poids:"360-375",niveau:2,controle:4,puissance:3,confort:4,genre:"mixte",prix:200,desc:"Version plus souple et accessible de l'AT10, excellent compromis."},
 {marque:"Babolat",modele:"Counter Viper (2025)",forme:"ronde",balance:"bas",poids:"360-375",niveau:3,controle:5,puissance:3,confort:4,genre:"mixte",prix:220,desc:"Contrôle chirurgical pour joueur de droite exigeant."},
 {marque:"Babolat",modele:"Air Viper (2025)",forme:"goutte",balance:"moyen",poids:"355-370",niveau:2,controle:4,puissance:3,confort:4,genre:"mixte",prix:255,desc:"Polyvalente légère et maniable, bonne alternative pour les joueurs qui veulent du rythme."},
 {marque:"Babolat",modele:"Technical Viper (2025)",forme:"diamant",balance:"haut",poids:"365-375",niveau:3,controle:2,puissance:5,confort:3,genre:"mixte",prix:220,desc:"La pala de Juan Lebrón, puissance brute, pour bras solides."},
 {marque:"Siux",modele:"Pegasus Pro 4 (2025)",forme:"ronde",balance:"bas",poids:"360-375",niveau:2,controle:5,puissance:3,confort:4,genre:"mixte",prix:200,desc:"Contrôle et confort, 12K, cadre très stable à la volée."},
 {marque:"Siux",modele:"Electra ST3 Pro (2025)",forme:"goutte",balance:"moyen",poids:"360-375",niveau:3,controle:3,puissance:4,confort:3,genre:"mixte",prix:260,desc:"La pala de Stupa : polyvalente agressive, très rapide à l'attaque."},
 {marque:"Siux",modele:"Electra ST3 Light (2025)",forme:"goutte",balance:"moyen",poids:"345-360",niveau:2,controle:3,puissance:4,confort:4,genre:"femme",prix:180,desc:"Même ADN offensif dans une version allégée, parfaite pour une joueuse de gauche."},
 {marque:"Adidas",modele:"Adipower Light 3.4 (2025)",forme:"goutte",balance:"moyen",poids:"345-360",niveau:2,controle:3,puissance:4,confort:3,genre:"femme",prix:220,desc:"Puissance en version allégée, carbone, très réactive au smash."},
 {marque:"Adidas",modele:"Adipower Multiweight 3.4 (2025)",forme:"goutte",balance:"moyen",poids:"360-375",niveau:3,controle:3,puissance:4,confort:3,genre:"mixte",prix:300,desc:"Balance réglable avec les poids fournis : polyvalente premium du compétiteur."},
 {marque:"Adidas",modele:"Metalbone 3.5 (2026)",forme:"diamant",balance:"haut",poids:"350-365",niveau:3,controle:1,puissance:5,confort:2,genre:"mixte",prix:270,desc:"La pala d'Ale Galán, carbone 16K, poids réglable : puissance maximale, exigeante, pour très bon bras."},
 {marque:"Wilson",modele:"Bela Team V2 (2024)",forme:"goutte",balance:"moyen",poids:"355-370",niveau:1,controle:4,puissance:2,confort:4,genre:"mixte",prix:120,desc:"Accessible et tolérante, pour débuter avec une marque premium."},
 {marque:"Wilson",modele:"Bela Elite V2 (2025)",forme:"goutte",balance:"moyen",poids:"360-375",niveau:3,controle:4,puissance:4,confort:3,genre:"mixte",prix:240,desc:"La polyvalente de Fernando Belasteguín, contrôle et punch au smash."},
 {marque:"Star Vie",modele:"Metheora Warrior (2025)",forme:"goutte",balance:"moyen",poids:"360-375",niveau:3,controle:4,puissance:3,confort:4,genre:"mixte",prix:250,desc:"Polyvalente souple, toucher exceptionnel, fabrication espagnole."},
 {marque:"Varlion",modele:"LW Carbon Difusor (2025)",forme:"ronde",balance:"bas",poids:"340-355",niveau:2,controle:5,puissance:2,confort:5,genre:"femme",prix:200,desc:"Légère, contrôle pur, confort, une référence historique pour les joueuses."},
 {marque: "Kuikma", modele: "PR Comfort (2026)", forme: "ronde", balance: "bas", poids: "340-360", niveau: 1, controle: 4, puissance: 1, confort: 5, genre: "mixte", prix: 60, desc: "Débutant : légère et souple, large sweet spot, idéale pour apprendre sans douleurs au bras."},
 {marque: "Kuikma", modele: "Control Carbon (2026)", forme: "ronde", balance: "bas", poids: "360-375", niveau: 2, controle: 4, puissance: 2, confort: 4, genre: "mixte", prix: 110, desc: "Ronde carbone Decathlon, tolérante et précise, le bon rapport qualité-prix pour un intermédiaire défensif."},
 {marque: "Kuikma", modele: "Power Carbon (2026)", forme: "diamant", balance: "haut", poids: "360-375", niveau: 2, controle: 2, puissance: 4, confort: 3, genre: "mixte", prix: 110, desc: "Diamant carbone accessible, équilibre haut pour smasher, pour intermédiaire offensif à budget maîtrisé."},
 {marque: "Kuikma", modele: "Hybrid Pro Coki Nieto (2026)", forme: "goutte", balance: "moyen", poids: "360-375", niveau: 3, controle: 4, puissance: 4, confort: 3, genre: "mixte", prix: 180, desc: "Haut de gamme Decathlon signé Coki Nieto, hybride polyvalente carbone pour joueur avancé."},
 {marque: "Nox", modele: "X-One Silhouette (2026)", forme: "ronde", balance: "bas", poids: "340-360", niveau: 1, controle: 4, puissance: 1, confort: 5, genre: "femme", prix: 85, desc: "Ronde légère et douce pour joueuse débutante, très maniable, confort maximal, prix très accessible."},
 {marque: "Nox", modele: "AT10 Genius Attack 18K (2026)", forme: "goutte", balance: "moyen", poids: "360-375", niveau: 3, controle: 4, puissance: 4, confort: 4, genre: "mixte", prix: 230, desc: "La pala d'Agustín Tapia version 2026, carbone 18K, goutte polyvalente et puissante."},
 {marque: "Nox", modele: "VK10 Ventus Control 12K Osoro (2026)", forme: "ronde", balance: "bas", poids: "350-365", niveau: 3, controle: 5, puissance: 3, confort: 4, genre: "femme", prix: 175, desc: "Ronde de contrôle d'Aranzazu Osoro, carbone 12K, précision et maniabilité pour joueuse avancée."},
 {marque: "Bullpadel", modele: "Neuron 02 (2026)", forme: "ronde", balance: "bas", poids: "360-375", niveau: 3, controle: 5, puissance: 3, confort: 4, genre: "mixte", prix: 217, desc: "Ronde premium carbone 3K, contrôle chirurgical pour joueur tactique avancé."},
 {marque: "Bullpadel", modele: "Xplo Comfort (2026)", forme: "goutte", balance: "moyen", poids: "355-370", niveau: 2, controle: 4, puissance: 3, confort: 5, genre: "mixte", prix: 162, desc: "Goutte polyvalente et confortable, idéale pour progresser en intermédiaire sans fatigue du bras."},
 {marque: "Bullpadel", modele: "Elite W (2025)", forme: "goutte", balance: "moyen", poids: "350-365", niveau: 3, controle: 4, puissance: 4, confort: 4, genre: "femme", prix: 160, desc: "La pala de Gemma Triay : goutte féminine puissante pour joueuse avancée au jeu agressif."},
 {marque: "Bullpadel", modele: "Vertex 05 W (2026)", forme: "diamant", balance: "haut", poids: "350-365", niveau: 3, controle: 3, puissance: 5, confort: 3, genre: "femme", prix: 180, desc: "Version féminine allégée de la Vertex 05, diamant offensif pour joueuse avancée qui veut de la puissance."},
 {marque: "Head", modele: "Extreme Edge (2025)", forme: "diamant", balance: "haut", poids: "350-370", niveau: 1, controle: 3, puissance: 3, confort: 4, genre: "mixte", prix: 100, desc: "Diamant d'entrée de gamme, légère et tolérante, pour le débutant qui veut déjà attaquer."},
 {marque: "Head", modele: "Extreme Pro (2026)", forme: "diamant", balance: "haut", poids: "360-375", niveau: 3, controle: 3, puissance: 5, confort: 3, genre: "mixte", prix: 250, desc: "La raquette diamant d'Arturo Coello : très puissante, cadre rigide, pour joueur avancé offensif."},
 {marque: "Head", modele: "Coello Team (2026)", forme: "goutte", balance: "moyen", poids: "350-370", niveau: 2, controle: 4, puissance: 3, confort: 4, genre: "mixte", prix: 182, desc: "Version accessible de la ligne Coello, goutte équilibrée et confortable pour intermédiaire polyvalent."},
 {marque: "Head", modele: "Coello Motion (2026)", forme: "goutte", balance: "moyen", poids: "355-370", niveau: 3, controle: 4, puissance: 4, confort: 5, genre: "mixte", prix: 280, desc: "Goutte premium anti-vibrations, puissance et confort pour joueur avancé au bras sensible."},
 {marque: "Adidas", modele: "Cross It Light Marta Ortega (2026)", forme: "ronde", balance: "bas", poids: "345-360", niveau: 3, controle: 5, puissance: 3, confort: 4, genre: "femme", prix: 190, desc: "Ronde allégée de Marta Ortega, carbone premium, contrôle et vivacité pour joueuse avancée."},
 {marque: "Adidas", modele: "Metalbone HRD+ (2026)", forme: "diamant", balance: "haut", poids: "360-375", niveau: 3, controle: 2, puissance: 5, confort: 2, genre: "mixte", prix: 240, desc: "Diamant d'Ale Galán, poids ajustable, gomme dure : puissance extrême pour attaquant expert."},
 {marque: "Babolat", modele: "Air Crest (2026)", forme: "ronde", balance: "bas", poids: "345-365", niveau: 1, controle: 4, puissance: 2, confort: 5, genre: "mixte", prix: 70, desc: "Ronde légère et confortable, grande tolérance, excellente première raquette."},
 {marque: "Babolat", modele: "Technical Veron (2025)", forme: "ronde", balance: "bas", poids: "365-375", niveau: 3, controle: 5, puissance: 3, confort: 4, genre: "mixte", prix: 160, desc: "Ronde de contrôle carbone à mousse souple, précision et confort pour joueur avancé défensif."},
 {marque: "Babolat", modele: "Viper Juan Lebrón 3.0 (2025)", forme: "diamant", balance: "haut", poids: "365-375", niveau: 3, controle: 3, puissance: 5, confort: 3, genre: "mixte", prix: 260, desc: "Diamant signature Lebrón, carbone rigide, équilibre haut : puissance maximale pour expert offensif."},
 {marque: "Babolat", modele: "Veron Juan Lebrón 3.1 (2026)", forme: "ronde", balance: "bas", poids: "365-375", niveau: 3, controle: 5, puissance: 3, confort: 4, genre: "mixte", prix: 240, desc: "Nouveauté 2026 : ronde haut de gamme Lebrón, contrôle total et toucher premium."},
 {marque: "Siux", modele: "Electra ST3 Go (2025)", forme: "goutte", balance: "moyen", poids: "355-375", niveau: 1, controle: 3, puissance: 3, confort: 4, genre: "mixte", prix: 75, desc: "Goutte accessible de la gamme Stupaczuk, fibre de verre tolérante, pour débutant ambitieux."},
 {marque: "Siux", modele: "Electra Pro (2026)", forme: "diamant", balance: "haut", poids: "360-375", niveau: 3, controle: 3, puissance: 5, confort: 3, genre: "mixte", prix: 160, desc: "La raquette diamant de Franco Stupaczuk 2026 : carbone, équilibre haut, explosivité en attaque."},
 {marque: "Siux", modele: "Diablo Pro (2026)", forme: "ronde", balance: "bas", poids: "360-375", niveau: 3, controle: 5, puissance: 3, confort: 4, genre: "mixte", prix: 200, desc: "Ronde emblématique Siux, carbone 12K, contrôle et sortie de balle douce pour joueur avancé."},
 {marque: "Siux", modele: "Valkiria Pro (2026)", forme: "goutte", balance: "moyen", poids: "345-360", niveau: 3, controle: 4, puissance: 4, confort: 4, genre: "femme", prix: 220, desc: "Hybride féminine de Sofia Araújo, carbone 24K, polyvalence puissance-contrôle pour joueuse avancée."},
 {marque: "Wilson", modele: "Bela Pro V2.5 (2024)", forme: "diamant", balance: "haut", poids: "365-375", niveau: 3, controle: 3, puissance: 5, confort: 3, genre: "mixte", prix: 135, desc: "Diamant de Belasteguín, carbone 18K, puissance et sensation ferme pour joueur avancé agressif."},
 {marque: "Star Vie", modele: "Metheora+ (2026)", forme: "ronde", balance: "bas", poids: "360-375", niveau: 3, controle: 5, puissance: 3, confort: 4, genre: "mixte", prix: 242, desc: "Ronde premium fabriquée en Espagne, contrôle et confort pour joueur avancé."},
 {marque: "Varlion", modele: "Maxima Prisma Carbon Soft (2026)", forme: "diamant", balance: "haut", poids: "350-360", niveau: 3, controle: 3, puissance: 4, confort: 4, genre: "mixte", prix: 266, desc: "Diamant artisanal à gomme souple : puissante mais confortable, pour joueur avancé au bras fragile."},
 {marque: "Drop Shot", modele: "Conqueror Attack 2.0 (2026)", forme: "diamant", balance: "haut", poids: "365-375", niveau: 3, controle: 3, puissance: 5, confort: 3, genre: "mixte", prix: 281, desc: "Diamant carbone à mousse EVA Pro, équilibre haut, conçue pour l'attaque du joueur confirmé."},
 {marque: "Bullpadel", modele: "Ionic Control (2026)", forme: "ronde", balance: "bas", poids: "352,5", niveau: 2, controle: 4, puissance: 2, confort: 4, genre: "mixte", prix: 144, desc: "Ronde fibre de verre à mousse MultiEva double densité : contrôle et maniabilité pour l'intermédiaire qui construit ses points."},
 {marque: "Bullpadel", modele: "Flow Legend (2026)", forme: "diamant", balance: "haut", poids: "350-360", niveau: 3, controle: 3, puissance: 4, confort: 3, genre: "femme", prix: 173, desc: "Édition hommage à Alejandra Salazar, diamant légère plus puissante que la Flow, pour joueuse avancée offensive."},
 {marque: "Siux", modele: "Beat Play Hybrid (2026)", forme: "goutte", balance: "moyen", poids: "355-375", niveau: 1, controle: 3, puissance: 3, confort: 4, genre: "mixte", prix: 55, desc: "Goutte fibre de verre à EVA souple, tolérante et polyvalente : une première raquette à tout petit budget."},
 {marque: "Adidas", modele: "Arrow Hit Light Ari Sánchez (2026)", forme: "diamant", balance: "haut", poids: "345-360", niveau: 3, controle: 3, puissance: 4, confort: 4, genre: "femme", prix: 230, desc: "La pala d'Ari Sánchez : diamant allégée, faces carbone, gomme souple, pour joueuse avancée qui attaque."},
];

const STYLE_T={controle:{c:5,p:2},poly:{c:4,p:3},puissance:{c:2,p:5}};
const NIV={debutant:1,inter:2,avance:3};
function recommend(a){
 const t={...STYLE_T[a.style]};
 if(a.cote==="gauche"){t.p=Math.min(5,t.p+0.5);} else if(a.cote==="droite"){t.c=Math.min(5,t.c+0.5);}
 const niv=NIV[a.niveau];
 const scored=RACKETS.map(r=>{
  let s=100;
  s-=Math.abs(r.controle-t.c)*12+Math.abs(r.puissance-t.p)*12;
  s-=Math.abs(r.niveau-niv)*14;
  if(a.genre==="femme"){ if(r.genre==="femme") s+=18; else if(parseInt(r.poids)>355) s-=10; }
  else { if(r.genre==="femme") s-=22; }
  if(a.confort==="oui"){ s+= (r.confort-3)*9; if(r.forme==="diamant") s-=12; }
  if(r.prix>a.budget){ if(r.prix<=a.budget*1.1) s-=8; else return null; }
  else { s+=Math.min(8,(a.budget-r.prix)/25); } // slight bonus for spending less, cap
  return {...r,s};
 }).filter(Boolean).sort((x,y)=>y.s-x.s);
 return scored;
}
function why(r,a){
 const w=[];
 w.push({ronde:"forme ronde, balance basse : contrôle et tolérance",goutte:"forme goutte d'eau : l'équilibre contrôle / puissance",diamant:"forme diamant, balance haute : puissance au smash"}[r.forme]);
 if(a.cote==="gauche"&&r.puissance>=4) w.push("assez de punch pour conclure côté gauche");
 if(a.cote==="droite"&&r.controle>=4) w.push("la régularité qu'il faut au joueur de droite");
 if(a.confort==="oui"&&r.confort>=4) w.push("mousse confortable, bras préservé");
 if(a.genre==="femme"&&r.genre==="femme") w.push("gamme allégée");
 if(r.niveau===NIV[a.niveau]) w.push("adaptée à ton niveau");
 if(r.prix<=a.budget*0.8) w.push("bien dans ton budget");
 return w.slice(0,4).join(" · ");
}
function bar(v,cls=""){return `<div class="bar ${cls}"><i style="width:${v*20}%"></i></div>`;}
function render(){
 const f=document.getElementById("quiz");
 const a={cote:f.cote.value,style:f.style.value,niveau:f.niveau.value,genre:f.genre.value,confort:f.confort.value,budget:+f.budget.value};
 const list=recommend(a);
 const top=list.slice(0,3);
 const res=document.getElementById("results");
 document.getElementById("res-count").textContent=list.length?`${list.length} raquettes compatibles sur ${RACKETS.length}`:"";
 if(!top.length){res.innerHTML=`<div class="empty"><b>Aucune raquette dans ce budget avec ce profil.</b><br>Monte le budget de quelques dizaines d'euros ou choisis « Un équilibre » : les goutte d'eau d'entrée de gamme sont très bonnes pour débuter.</div>`;return;}
 res.innerHTML=top.map((r,i)=>`<article class="rk">
  <div class="rank">${i+1}</div>
  <div><span class="brand-l">${r.marque}</span><h3>${r.modele}</h3></div>
  <div class="price">${r.prix} €<small>prix indicatif</small></div>
  <p class="why"><b>Pourquoi :</b> ${why(r,a)}.<br>${r.desc}</p>
  <div><div class="specs"><span>Forme <b>${r.forme}</b></span><span>Balance <b>${r.balance}</b></span><span>Poids <b>${r.poids} g</b></span><span>Niveau <b>${["","débutant","intermédiaire","avancé"][r.niveau]}</b></span></div>
  <div class="bars" style="margin-top:8px"><span>Contrôle</span>${bar(r.controle)}<span>Puissance</span>${bar(r.puissance,"p")}</div></div>
 </article>`).join("");
}
const bud=document.getElementById("budget"),out=document.getElementById("budget-out");
bud.addEventListener("input",()=>{out.textContent=bud.value+" €";});
document.getElementById("quiz").addEventListener("submit",e=>{e.preventDefault();render();document.getElementById("results").scrollIntoView({behavior:"smooth",block:"nearest"});});
document.getElementById("quiz").addEventListener("change",render);
render();
