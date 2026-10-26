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
/* Cuts (classement maximal pour s'inscrire) — Chapitre II 2026, épreuves seniors */
const CUTS=[["P25","Top 30 000","Top 3 000"],["P50","Top 10 000","Top 1 000"],["P100","Top 3 000","Top 300"],["P250","Top 800","Top 100"],["P500","Open (liste à la charge des paires)","Open"],["P1000","Open / invitation","Open / invitation"],["P2000","Open","Open"],["P3000","Open","Open"]];
const PLACE_LABEL=i=>i===0?"Vainqueur":i===1?"Finaliste":(i===2||i===3)?`${i+1}e (½ finale)`:(i>=4&&i<=7)?`${i+1}e (¼ finale)`:(i>=8&&i<=15)?`${i+1}e (⅛ finale)`:(i===31?"32e et plus":`${i+1}e`);
const trancheIdx=n=>n<=8?0:n<=12?1:n<=16?2:n<=20?3:n<=24?4:n<=28?5:6;

function renderTable(){
 const cat=document.getElementById("b-cat").value;
 const sexe=document.querySelector('input[name="b-sexe"]:checked').value;
 const nb=+document.getElementById("b-nb").value;
 const place=+document.getElementById("b-place").value;
 const wrap=document.getElementById("b-table"), v=document.getElementById("b-verdict"), note=document.getElementById("b-note");
 let rows="", mine=null, header="";
 const data=BAREME[cat];
 if(Array.isArray(data)&&Array.isArray(data[0])){ // P25-P250 : colonnes par tranche
   const ti=trancheIdx(nb);
   header=`<tr><th>Place</th>${TRANCHES.map((t,i)=>`<th class="${i===ti?'hi':''}">${t} paires</th>`).join("")}</tr>`;
   rows=data.map((r,i)=>`<tr class="${i===place-1?'me':''}"><td>${PLACE_LABEL(i)}</td>${r.map((p,j)=>`<td class="n ${j===ti?'hi':''}">${p===null?'–':p}</td>`).join("")}</tr>`).join("");
   mine=data[place-1]?data[place-1][ti]:null;
   note.textContent=`${cat} : les points dépendent du nombre de paires inscrites (colonne surlignée : ${TRANCHES[ti]} paires). Un tiret = la place n'existe pas pour ce nombre de paires.`;
 } else if(Array.isArray(data)){ // P2000/P3000
   header=`<tr><th>Place</th><th>Points</th></tr>`;
   rows=data.map((p,i)=>`<tr class="${i===place-1?'me':''}"><td>${PLACE_LABEL(i)}</td><td class="n">${p}</td></tr>`).join("");
   mine=data[place-1]??null;
   note.textContent=`${cat} : barème commun messieurs / dames, indépendant du nombre de paires.`;
 } else { // P500/P1000 par sexe
   header=`<tr><th>Place</th><th class="${sexe==='messieurs'?'hi':''}">Messieurs</th><th class="${sexe==='dames'?'hi':''}">Dames</th></tr>`;
   const m=data.messieurs,d=data.dames;
   rows=m.map((p,i)=>`<tr class="${i===place-1?'me':''}"><td>${PLACE_LABEL(i)}</td><td class="n ${sexe==='messieurs'?'hi':''}">${p}</td><td class="n ${sexe==='dames'?'hi':''}">${d[i]??(i===24?'':'–')}${i===24&&d[24]!==undefined?' (25e et +)':''}</td></tr>`).join("");
   mine=(sexe==="messieurs"?m[place-1]:(d[Math.min(place-1,24)]))??null;
   note.textContent=`${cat} : barèmes distincts messieurs / dames, indépendants du nombre de paires. Dames : à partir de la 25e place, points identiques.`;
 }
 wrap.innerHTML=`<table><thead>${header}</thead><tbody>${rows}</tbody></table>`;
 const lbl=PLACE_LABEL(place-1);
 v.innerHTML=mine===null?`<span class="vtag stop">Place inexistante</span><p>Avec ${nb} paires, il n'y a pas de ${place}e place dans un ${cat}. Réduis la place ou augmente le nombre de paires.</p>`
  :`<span class="vtag go">${mine} point${mine>1?'s':''}</span><p><b>${cat}</b>, ${lbl}${Array.isArray(data)&&Array.isArray(data[0])?`, ${nb} paires inscrites`:(data.messieurs?`, tableau ${sexe}`:'')} → <b>${mine} pts</b> au classement.</p>`;
 const sel=document.getElementById("b-place");
 const maxPlace=Array.isArray(data)&&Array.isArray(data[0])?32:Array.isArray(data)?32:(sexe==="messieurs"?32:25);
 if(sel.max!=maxPlace){sel.max=maxPlace;}
 document.getElementById("b-place-out").textContent=lbl;
 document.getElementById("b-nb-out").textContent=nb+" paires";
 const nbRow=document.getElementById("b-nb-row"), sxRow=document.getElementById("b-sexe-row");
 nbRow.style.display=(Array.isArray(data)&&Array.isArray(data[0]))?"":"none";
 sxRow.style.display=data.messieurs?"":"none";
}
["b-cat","b-nb","b-place"].forEach(id=>document.getElementById(id).addEventListener("input",renderTable));
document.querySelectorAll('input[name="b-sexe"]').forEach(i=>i.addEventListener("change",renderTable));
document.getElementById("cuts").innerHTML=CUTS.map(([c,m,d])=>`<tr><td><b>${c}</b></td><td>${m}</td><td>${d}</td></tr>`).join("");

/* Simulateur : mes 12 meilleurs résultats */
const SIM_KEY="pa-sim-resultats";
let sim=[];try{sim=JSON.parse(localStorage.getItem(SIM_KEY)||"[]");}catch(e){}
function ptsFor(cat,place,nb,sexe){const d=BAREME[cat];if(Array.isArray(d)&&Array.isArray(d[0]))return d[place-1]?.[trancheIdx(nb)]??0;if(Array.isArray(d))return d[place-1]??0;return (sexe==="messieurs"?d.messieurs[place-1]:d.dames[Math.min(place-1,24)])??0;}
function simRender(){
 const el=document.getElementById("sim-list");
 const rows=sim.map(r=>({...r,pts:ptsFor(r.cat,r.place,r.nb,r.sexe)})).sort((a,b)=>b.pts-a.pts);
 const kept=rows.slice(0,12), total=kept.reduce((s,r)=>s+r.pts,0);
 el.innerHTML=rows.length?rows.map((r,i)=>`<tr class="${i>=12?'dim':''}"><td>${r.cat}</td><td>${PLACE_LABEL(r.place-1)}</td><td>${['P500','P1000'].includes(r.cat)?r.sexe:(r.nb+' paires')}</td><td class="n">${r.pts}</td><td><button type="button" class="x" data-i="${sim.indexOf(sim.find(s=>s===r||(s.cat===r.cat&&s.place===r.place&&s.nb===r.nb&&s.sexe===r.sexe)))}">✕</button></td></tr>`).join(""):`<tr><td colspan="5" style="color:var(--dim)">Aucun résultat saisi. Ajoute tes tournois des 12 derniers mois.</td></tr>`;
 document.getElementById("sim-total").textContent=total;
 document.getElementById("sim-count").textContent=`${Math.min(rows.length,12)} résultat${rows.length>1?'s':''} retenu${rows.length>1?'s':''} sur ${rows.length}`;
 try{localStorage.setItem(SIM_KEY,JSON.stringify(sim));}catch(e){}
}
document.getElementById("sim-add").addEventListener("click",()=>{
 sim.push({cat:document.getElementById("b-cat").value,place:+document.getElementById("b-place").value,nb:+document.getElementById("b-nb").value,sexe:document.querySelector('input[name="b-sexe"]:checked').value});
 simRender();
});
document.getElementById("sim-list").addEventListener("click",e=>{const b=e.target.closest(".x");if(!b)return;sim.splice(+b.dataset.i,1);simRender();});
document.getElementById("sim-clear").addEventListener("click",()=>{sim=[];simRender();});
renderTable();simRender();
