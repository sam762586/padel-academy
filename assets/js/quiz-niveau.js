/* QUIZ NIVEAU */
const QL=[
 {q:"Sur un lob adverse profond qui te passe par-dessus au filet, tu…",o:[["Je me retourne et je frappe avant la vitre, souvent dans la vitre",0,"vitre"],["Je laisse rebondir, je joue après la vitre, mais la balle revient courte",1,"vitre"],["Je joue la sortie de vitre en lob profond ou en bajada",2,"vitre"],["Je choisis bajada / lob / contre-pied selon le placement adverse",3,"vitre"]]},
 {q:"Ton service, c'est…",o:[["Je fais passer la balle, point",0,"service"],["Long, mais toujours au même endroit",1,"service"],["Slicé, vers la vitre latérale ou le T, et je monte derrière",2,"service"],["Je varie zones et effets selon le relanceur, et je monte en diagonale",3,"service"]]},
 {q:"Sur un lob mi-court, raquette ouverte, tu joues…",o:[["Je smashe tout, et ça revient souvent",0,"aerien"],["Je remets la balle sans vraiment savoir comment",1,"aerien"],["Bandeja, et je garde le filet",2,"aerien"],["Bandeja ou víbora selon la hauteur, en annonçant mon choix",3,"aerien"]]},
 {q:"Quand ton partenaire recule sur un lob, toi…",o:[["Je reste au filet, c'est sa balle",0,"couple"],["Je recule un peu, parfois",1,"couple"],["Je recule avec lui et on remonte ensemble",2,"couple"],["Je lis la profondeur : je couvre le centre s'il peut remonter, sinon je recule",3,"couple"]]},
 {q:"Au filet, où es-tu quand l'adversaire frappe ?",o:[["Collé au filet",0,"placement"],["Je ne sais pas, ça dépend",1,"placement"],["À 2-2,5 m, raquette haute, fente d'arrêt",2,"placement"],["Base à 2,5 m, un demi-pas en arrière sur balle haute adverse, un pas en avant pour conclure",3,"placement"]]},
 {q:"Pour monter au filet depuis le fond, tu utilises…",o:[["Je monte quand j'ai frappé fort",0,"montee"],["Je monte après n'importe quel lob",1,"montee"],["Lob profond ou chiquita, et je monte à deux",2,"montee"],["Je choisis le coup d'approche selon la paire adverse et je monte en petits pas avec split step",3,"montee"]]},
 {q:"Tes fautes directes en match viennent surtout de…",o:[["Un peu partout, je ne sais pas trop",0,"regularite"],["Frappes trop fortes depuis le fond",1,"regularite"],["Tentatives de coups gagnants sur mauvaises balles",2,"regularite"],["Rares ; je perds plutôt sur des points construits par l'adversaire",3,"regularite"]]},
 {q:"La chiquita, pour toi, c'est…",o:[["Aucune idée",0,"transition"],["Je connais le nom, je ne la joue pas",1,"transition"],["Je la joue pour monter quand le lob est risqué",2,"transition"],["Je l'utilise au centre ou dans les pieds du moins bon volleyeur, avec changement de rythme",3,"transition"]]},
 {q:"Pendant le point, avec ton partenaire, vous…",o:[["On ne se parle pas",0,"communication"],["On dit « tienne » quand c'est trop tard",1,"communication"],["On annonce « moi / toi / lob / on monte »",2,"communication"],["On a défini avant le match qui prend le centre, les lobs, et qui dirige",3,"communication"]]},
 {q:"Ton expérience en compétition :",o:[["Jamais joué de tournoi",0,"compet"],["Un ou deux P25 / P100",1,"compet"],["Je joue des P100 / P250 régulièrement",2,"compet"],["Je gagne des matchs en P250 ou plus",3,"compet"]]},
];
const QL_THEMES={vitre:["Sorties de vitre","#coups"],service:["Service et montée","#coups"],aerien:["Bandeja / víbora / smash","#tutos"],couple:["Bouger avec son partenaire","#tutos"],placement:["Placement au filet","#placement"],montee:["Quand monter","#tutos"],regularite:["Régularité, moins de fautes","#erreurs"],transition:["Chiquita et transition","#coups"],communication:["Communication","#placement"],compet:["Compétition","#competition"]};
let qi=0, qa=[];
function qRender(){
 const q=QL[qi];
 document.getElementById("qnum").textContent=`Question ${qi+1} / ${QL.length}`;
 document.getElementById("qbarfill").style.width=(qi/QL.length*100)+"%";
 document.getElementById("qtext").textContent=q.q;
 document.getElementById("qopts").innerHTML=q.o.map((o,i)=>`<button type="button" class="qopt" data-i="${i}">${o[0]}</button>`).join("");
}
document.getElementById("qopts").addEventListener("click",e=>{
 const b=e.target.closest(".qopt");if(!b)return;
 const o=QL[qi].o[+b.dataset.i];qa.push({pts:o[1],theme:o[2]});
 qi++; if(qi<QL.length){qRender();} else qResult();
});
function qResult(){
 const total=qa.reduce((s,a)=>s+a.pts,0), max=QL.length*3;
 const pct=Math.round(total/max*100);
 let lvl,txt,cls;
 if(pct<30){lvl="Débutant · P25";cls="go";txt="Tu découvres le jeu. Priorité absolue : laisser rebondir sur la vitre, jouer long, et ne jamais rester à mi-court. Ta raquette : ronde, légère, confort.";}
 else if(pct<55){lvl="Loisir · P100";cls="go";txt="Tu tiens l'échange et tu connais les coups. Ce qui te fait passer un cap : la bandeja fiable, monter à deux derrière un vrai lob, et parler avec ton partenaire.";}
 else if(pct<80){lvl="Intermédiaire · P250";cls="maybe";txt="Tu construis des points. La différence avec le niveau au-dessus se joue sur la décision : bandeja ou víbora, quand ne pas monter, et la gestion des balles de jeu.";}
 else{lvl="Avancé · P500 et +";cls="stop";txt="Ton jeu est structuré. Travaille la variété (rulo, par 3, amago), la lecture de la paire adverse et la condition physique pour tenir trois sets.";}
 const weak=qa.filter(a=>a.pts<=1).map(a=>a.theme);
 const uniq=[...new Set(weak)].slice(0,4);
 document.getElementById("qcard").hidden=true;
 const r=document.getElementById("qresult");r.hidden=false;
 r.innerHTML=`<span class="vtag ${cls}">${lvl}</span><p class="score">${total} / ${max} points</p><p>${txt}</p>
 ${uniq.length?`<h4 style="margin-top:18px">À travailler en priorité</h4><ul class="steps">${uniq.map(t=>`<li><a href="${QL_THEMES[t][1]}">${QL_THEMES[t][0]}</a></li>`).join("")}</ul>`:`<p style="margin-top:12px">Aucun point faible marqué. Passe au plan d'entraînement pour affiner.</p>`}
 <div class="btns" style="margin-top:20px"><a class="btn primary" href="#entrainement">Voir le plan 8 semaines</a><a class="btn ghost" href="#raquette">Choisir ma raquette</a><button type="button" class="btn ghost" id="qagain">Refaire le test</button></div>`;
 document.getElementById("qagain").addEventListener("click",()=>{qi=0;qa=[];r.hidden=true;document.getElementById("qcard").hidden=false;qRender();});
}
qRender();
