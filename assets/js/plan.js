/* PLAN 8 SEMAINES */
/* Typo :   = espace insécable dans le texte affiché.
   « match » doit commencer par « En match : » : le rendu met en gras ce qui précède le premier « : ». */
const WEEKS=[
 {t:"La vitre est ton amie",obj:"Jouer 20 sorties de vitre de suite sans faute, en lob.",ex:"Partenaire au filet qui envoie des balles vers la vitre du fond. Tu laisses rebondir, tu pivotes, tu lobes. 3 × 20 balles, en alternant coup droit et revers. Compte les lobs qui dépassent la ligne de service adverse.",match:"En match : interdiction de frapper une balle avant la vitre si elle va la toucher."},
 {t:"Volée de blocage",obj:"Volée placée dans les pieds 8 fois sur 10.",ex:"Volée-volée à 2–2,5 m du filet, geste court, raquette ouverte. Puis le partenaire au fond t'envoie des balles à mi-hauteur : tu bloques long au centre. 3 × 2 min + 3 × 15 balles.",match:"En match : aucune volée « frappée ». On place, on avance d'un pas."},
 {t:"Le lob d'attaque",obj:"Lob qui retombe à moins d'1 m de la vitre 6 fois sur 10.",ex:"Cible : une serviette posée à 1 m de la vitre du fond adverse. 3 × 15 lobs croisés, 3 × 15 lobs parallèles. Note les lobs trop courts (smash) et trop longs (vitre directe).",match:"En match : chaque fois que tu es sous pression au fond, lob. Compte les montées au filet obtenues."},
 {t:"Monter à deux",obj:"Monter 100 % des fois derrière un bon lob, 0 % derrière un mauvais.",ex:"Exercice « lob → montée → split » : le partenaire au filet te donne 10 balles. Tu lobes, tu montes à petits pas, split step à sa frappe, volée longue au centre. 3 × 10, puis on inverse. Dis « on monte ! » à voix haute.",match:"En match : règle de la corde. Un seul objectif, ne jamais être un devant / un derrière."},
 {t:"La bandeja",obj:"10 bandejas de suite qui rebondissent avant la vitre et restent basses.",ex:"Partenaire qui lobe à mi-court. Tu te déplaces de côté (jamais en reculant), frappe à hauteur d'épaule, coupée, cible la vitre latérale adverse. 4 × 10. Puis la même chose en annonçant « bandeja ! » avant la frappe.",match:"En match : interdiction de smasher. Tout lob profond ou mi-court se joue en bandeja. Compte combien de fois tu gardes le filet."},
 {t:"Chiquita et transition",obj:"Chiquita qui force une volée basse 7 fois sur 10.",ex:"Partenaire au filet. Depuis le fond tu joues une balle molle et basse dans ses pieds, tu avances derrière, demi-volée si besoin, puis tu finis au filet. 3 × 12. Variante : chiquita au centre entre deux volleyeurs.",match:"En match : alterner lob et chiquita pour monter. Observer lequel marche le mieux contre cette paire."},
 {t:"Smash ou pas smash",obj:"Bonne décision 9 fois sur 10 sur lob (smash / bandeja / laisser).",ex:"Lanceur qui envoie 20 lobs de profondeurs variées. Tu annonces la décision avant la frappe. Sur les lobs courts : smash plat vers la ligne de fond, puis essai de par 3. 2 × 20.",match:"En match : smash uniquement sur balle courte avec toi sous la balle. Sinon bandeja. Note les smashs qui reviennent."},
 {t:"Semaine match",obj:"Mettre tout ensemble, jouer un tournoi P25 ou P100.",ex:"Séance de points joués à thème : 1) points qui commencent par un lob, 2) points où l'équipe au fond doit monter en moins de 3 balles, 3) tie-breaks à 7 points avec punto de oro.",match:"En match : inscris-toi sur Ten'Up à un tournoi avec un partenaire de niveau proche. Objectif : zéro faute directe inutile, pas le résultat."},
];
const wk=document.getElementById("weeks");
let done=[];try{done=JSON.parse(localStorage.getItem("pa-weeks")||"[]");}catch(e){}
function wRender(){
 wk.innerHTML=WEEKS.map((w,i)=>`<article class="week ${done.includes(i)?'done':''}">
  <label class="wcheck"><input type="checkbox" id="w${i}" ${done.includes(i)?'checked':''} data-i="${i}"><span></span></label>
  <div class="wnum">S${i+1}</div>
  <div class="wbody"><h3>${w.t}</h3><p class="wobj"><b>Objectif :</b> ${w.obj}</p>
  <details><summary>Exercice clé + consigne match</summary><p><b>Exercice (45 min) :</b> ${w.ex}</p><p style="margin-top:8px"><b>${w.match.split(":")[0].trim()} :</b>${w.match.split(":").slice(1).join(":")}</p></details></div>
 </article>`).join("");
}
wk.addEventListener("change",e=>{const i=+e.target.dataset.i;if(isNaN(i))return;done=e.target.checked?[...new Set([...done,i])]:done.filter(x=>x!==i);try{localStorage.setItem("pa-weeks",JSON.stringify(done));}catch(err){}wRender();});
wRender();
