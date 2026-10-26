/* PLACEMENT */
const PH={
 def:{zone:[10,10,60,220],you:[[45,65,"Toi"],[45,175,"Partenaire"]],opp:[[320,65],[320,175]],ball:[300,120]},
 trans:{zone:[60,10,100,220],you:[[120,70,"Montée"],[120,170,"Montée"]],opp:[[330,70],[330,170]],ball:[345,195]},
 att:{zone:[160,10,55,220],you:[[185,70,"Filet"],[200,170,"Filet"]],opp:[[400,65],[400,175]],ball:[190,100]},
 smash:{zone:[10,10,80,220],you:[[60,60,"Recul"],[60,180,"Recul"]],opp:[[260,120],[320,60]],ball:[270,118]}
};
function drawPhase(k){
 const p=PH[k];
 document.getElementById("zone").innerHTML=`<rect x="${p.zone[0]}" y="${p.zone[1]}" width="${p.zone[2]}" height="${p.zone[3]}" fill="rgba(255,255,255,.3)" rx="4"/>`;
 let s="";
 p.you.forEach((y,i)=>{s+=`<circle cx="${y[0]}" cy="${y[1]}" r="13" fill="#35e27f" stroke="#06110b" stroke-width="2"/><text x="${y[0]}" y="${y[1]-18}" text-anchor="middle" font-size="10" font-weight="700" fill="#fff" font-family="Barlow,sans-serif">${y[2]}</text>`;});
 p.opp.forEach(o=>{s+=`<circle cx="${o[0]}" cy="${o[1]}" r="13" fill="#fff" stroke="#15202b" stroke-width="2"/>`;});
 s+=`<circle cx="${p.ball[0]}" cy="${p.ball[1]}" r="6" fill="#f5f04a" stroke="#15202b" stroke-width="1.5"/>`;
 document.getElementById("players").innerHTML=s;
 document.querySelectorAll("#placement .phases button").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.phase===k)));
 document.querySelectorAll(".phase-text").forEach(t=>t.classList.toggle("on",t.dataset.phase===k));
}
document.querySelectorAll("#placement .phases button").forEach(b=>b.addEventListener("click",()=>drawPhase(b.dataset.phase)));
drawPhase("def");
