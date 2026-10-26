/* BARÈME (bareme.html) : tableau des points et simulateur « mes 12 meilleurs résultats ».
   Les données et les calculs partagés sont dans bareme-donnees.js, chargé avant ce fichier. */

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
 if(Array.isArray(data)&&Array.isArray(data[0])&&place>nb)mine=null;
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
const simDate=document.getElementById("sim-date"), simMessage=document.getElementById("sim-message");
let sim=[];
try{sim=simNormaliser(JSON.parse(localStorage.getItem(SIM_KEY)||"[]"));}catch(e){}
function simInfo(texte){simMessage.textContent=texte;simMessage.hidden=!texte;}
function simSauver(){
 try{localStorage.setItem(SIM_KEY,JSON.stringify(sim));}
 catch(e){simInfo("Le stockage est indisponible : ces résultats seront perdus à la fermeture de la page.");}
}
function simRender(){
 const el=document.getElementById("sim-list"), aujourd=simIso(new Date());
 simDate.max=aujourd;simDate.min="1900-01-01";
 const rows=sim.map((r,index)=>({...r,index,pts:ptsFor(r.cat,r.place,r.nb,r.sexe)})).sort((a,b)=>b.pts-a.pts||a.index-b.index);
 const kept=rows.filter(r=>r.date&&r.date<=aujourd&&simExpire(r.date)>aujourd).slice(0,12);
 const retenus=new Set(kept.map(r=>r.index)), total=kept.reduce((s,r)=>s+r.pts,0);
 el.textContent="";
 if(!rows.length){const cellule=el.insertRow().insertCell();cellule.colSpan=7;cellule.textContent="Aucun résultat saisi. Ajoute tes tournois des 12 derniers mois.";}
 rows.forEach(r=>{
  const ligne=el.insertRow();if(!retenus.has(r.index))ligne.className="dim";
  const date=document.createElement("input");date.type="date";date.value=r.date||"";
  date.className="bsel";date.min="1900-01-01";date.max=aujourd;date.dataset.i=String(r.index);
  date.setAttribute("aria-label","Date du résultat "+(r.index+1)+" : "+r.cat+", "+PLACE_LABEL(r.place-1));
  ligne.insertCell().appendChild(date);
  [r.cat,PLACE_LABEL(r.place-1),['P500','P1000'].includes(r.cat)?r.sexe:r.nb+' paires',r.pts].forEach(t=>{ligne.insertCell().textContent=String(t);});
  ligne.insertCell().textContent=!r.date?"Date à renseigner":r.date>aujourd?"À venir":simExpire(r.date)<=aujourd?"Expiré":retenus.has(r.index)?"Retenu":"Hors des 12 meilleurs";
  const bouton=document.createElement("button");bouton.type="button";bouton.className="x";bouton.dataset.i=String(r.index);bouton.textContent="✕";
  bouton.setAttribute("aria-label","Supprimer le résultat "+(r.index+1)+" : "+r.cat);
  ligne.insertCell().appendChild(bouton);
 });
 document.getElementById("sim-total").textContent=total;
 document.getElementById("sim-count").textContent=`${kept.length} résultat${kept.length>1?'s':''} retenu${kept.length>1?'s':''} sur ${rows.length}`;
}
document.getElementById("sim-add").addEventListener("click",()=>{
 const resultat={cle:simNouvelleCle(),cat:document.getElementById("b-cat").value,place:+document.getElementById("b-place").value,nb:+document.getElementById("b-nb").value,sexe:document.querySelector('input[name="b-sexe"]:checked').value,date:simDate.value};
 if(!simLireDate(resultat.date)||resultat.date>simIso(new Date())){simInfo("Choisis une date de tournoi valide, aujourd'hui ou dans le passé.");simDate.focus();return;}
 if(ptsFor(resultat.cat,resultat.place,resultat.nb,resultat.sexe)===null){simInfo("Cette place n'existe pas pour le tableau choisi.");return;}
 simInfo("");sim.push(resultat);simSauver();simRender();
});
document.getElementById("sim-list").addEventListener("click",e=>{
 const b=e.target.closest(".x");if(!b)return;
 const i=Number(b.dataset.i);if(!Number.isInteger(i)||i<0||i>=sim.length)return;
 sim.splice(i,1);simInfo("");simSauver();simRender();
});
document.getElementById("sim-list").addEventListener("change",e=>{
 const i=Number(e.target.dataset.i), valeur=e.target.value;
 if(e.target.type!=="date"||!Number.isInteger(i)||i<0||i>=sim.length)return;
 if(!simLireDate(valeur)||valeur>simIso(new Date())){simInfo("Choisis une date valide, aujourd'hui ou dans le passé.");e.target.value=sim[i].date||"";return;}
 sim[i].date=valeur;simInfo("");simSauver();simRender();
});
document.getElementById("sim-clear").addEventListener("click",()=>{sim=[];simInfo("");simSauver();simRender();});
simDate.value=simIso(new Date());
document.addEventListener("visibilitychange",()=>{if(!document.hidden)simRender();});
renderTable();simRender();
