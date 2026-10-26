/* TUTO 1 : QUAND MONTER */
const MONTER={
 lobP:{ok:"MONTE",cls:"go",t:"Lob profond = feu vert. Les deux adversaires reculent, ils joueront une bandeja défensive ou une balle lente. On monte ensemble, tout de suite, en regardant la balle.",c:["On monte pendant que la balle est en l'air, pas après leur frappe.","Fente d'arrêt (split step) au moment où l'adversaire frappe, à peu près à la ligne de service.","Première volée : longue, au centre. On s'installe, on ne cherche pas à gagner."]},
 lobC:{ok:"RESTE AU FOND, RECULE",cls:"stop",t:"Lob court = smash adverse. Monter maintenant, c'est prendre la balle dans le corps. On recule d'un pas, chacun au centre de sa moitié, et on attend la sortie de vitre.",c:["Les deux joueurs reculent, pas un seul.","Lis le smash : plat → vitre du fond ; par 3 → vitre latérale.","Après le smash, si la balle revient lentement, le lob suivant sera la vraie occasion de monter."]},
 chiq:{ok:"MONTE, MAIS EN REGARDANT",cls:"go",t:"La chiquita force une volée basse, donc lente et montante. On avance immédiatement derrière la balle pour prendre la volée suivante à hauteur de filet.",c:["Avance en position basse, raquette devant.","Si leur volée est bonne et profonde : stop, demi-volée, on reste à mi-chemin et on repart au fond si besoin.","Si leur volée remonte : volée gagnante ou volée placée dans les pieds."]},
 fort:{ok:"NE MONTE PAS",cls:"stop",t:"Une balle forte au centre revient vite, souvent en volée bloquée dans tes pieds. On n'a pas le temps de traverser la zone de transition. On reste au fond et on prépare le lob suivant.",c:["La vitesse que tu mets est la vitesse qui revient.","Monter se fait derrière une balle LENTE ou HAUTE, jamais derrière une balle rapide.","Exception : la balle forte a mis l'adversaire en déséquilibre évident et sa réponse est molle."]},
 haute:{ok:"RECULE",cls:"stop",t:"Tu as offert une balle haute facile : attends-toi à un smash ou une víbora. On recule tous les deux, chacun au centre de sa moitié, poids sur l'avant des pieds.",c:["Ne reste jamais à mi-court sur une balle haute adverse.","Regarde son épaule et sa raquette : cadre ouvert = bandeja, bras armé = smash.","Joue la balle après la vitre, pas avant."]},
 vitre:{ok:"MONTE SI ELLE EST VRAIMENT LONGUE",cls:"maybe",t:"Une sortie de vitre lente et longue qui arrive à hauteur d'épaule de l'adversaire est une balle de montée. Si elle est courte ou qu'elle reste basse et rapide, on reste.",c:["Test simple : si l'adversaire doit lever la raquette pour la jouer, on monte.","Si l'adversaire est en train d'avancer dessus, on reste.","Monte en diagonale vers le centre, pas en ligne droite vers la vitre."]},
 retour:{ok:"MONTE DERRIÈRE LE LOB",cls:"go",t:"Le retour lobé sur le partenaire du serveur est le classique du padel amateur : il recule, le serveur est seul au filet. On monte tous les deux, le relanceur et son partenaire.",c:["Le lob va sur le joueur de droite adverse (son revers) de préférence.","Monte à la même hauteur que ton partenaire.","Première balle au centre, entre eux deux."]},
};
const MONTER_RULES=[
 ["SI ma balle est haute ou lente et qu'elle fait reculer l'adversaire","ALORS je monte, avec mon partenaire."],
 ["SI ma balle est rapide ou courte","ALORS je reste au fond et je prépare un lob."],
 ["SI l'adversaire a une balle facile au-dessus de l'épaule","ALORS on recule tous les deux."],
 ["SI je suis entre la ligne de service et le filet au moment où il frappe","ALORS je m'arrête en fente (split step) et je joue la balle avant de repartir."],
];
function renderMonter(){
 const v=document.querySelector('input[name="monter"]:checked').value, d=MONTER[v];
 document.getElementById("monter-verdict").innerHTML=`<span class="vtag ${d.cls}">${d.ok}</span><p>${d.t}</p><ul>${d.c.map(x=>`<li>${x}</li>`).join("")}</ul>`;
}
document.getElementById("monter-opts").addEventListener("change",renderMonter);renderMonter();
document.getElementById("monter-rules").innerHTML=MONTER_RULES.map(([a,b])=>`<div class="rule"><span>${a}</span><b>${b}</b></div>`).join("");
