/* TUTO 3 : BOUGER AVEC SON PARTENAIRE */
let pairMode="att"; let ball={x:340,y:175};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function pairPositions(){
 // our half : x 10..220 ; their half : 220..430. y 10..230, center 120.
 const bx=ball.x, by=ball.y;
 const lateral=(by-120)/110; // -1 top (our "left" from reader's view) .. 1 bottom
 let us,them,txt;
 if(pairMode==="att"){
   // we're at net ~ x 170-200
   const shift=lateral*28;
   const near=bx>220; // ball on their side
   const depthAdj=near?0:-25; // ball on our side at net => we're volleying, step in
   const yA=clamp(70+shift,40,120), yB=clamp(170+shift,120,200);
   const xSide=185+depthAdj+(near?0:0), xOther=175+depthAdj;
   if(bx<=220){ // ball on our side while we're at the net: it's a lob over us or a ball at our feet
     if(bx<120){ // deep: lob passed over us
       us=[[80,yA,"Recul"],[95,yB,"Recul"]];
       txt=["<b>Lob passé :</b> la balle est derrière vous. Celui qui est lobé recule en diagonale, l'autre recule aussi (jamais un au filet, un au fond).","Le lobé joue bajada ou lob ; vous remontez ensemble ensuite.","Si le lob est vraiment imprenable, c'est le partenaire qui croise derrière pour le jouer (« cambio ») et vous échangez de côté."];
     } else {
       us=[[185,yA,"Volée"],[180,yB,"Couvre"]];
       txt=["<b>Balle dans nos pieds :</b> celui du côté de la balle la joue en volée basse, l'autre reste à hauteur et couvre le centre.","Volée de sécurité : longue, au centre, pas de tentative gagnante sur une balle basse.","Restez à 2–3 m du filet, ne reculez pas sur une balle basse."];
     }
   } else {
     const lobRisk=bx>380;
     const yAa=clamp(70+lateral*30,40,118), yBb=clamp(170+lateral*30,122,200);
     const ballTop=by<120;
     // player on ball side slightly more advanced and toward the line
     if(ballTop){us=[[195,clamp(yAa-6,40,118),"Ligne"],[172,yBb,"Centre"]];}
     else{us=[[172,yAa,"Centre"],[195,clamp(yBb+6,122,200),"Ligne"]];}
     if(lobRisk){us[0][0]-=15;us[1][0]-=15;}
     txt=[`<b>Balle côté ${ballTop?"haut":"bas"} du schéma :</b> vous glissez tous les deux vers la balle. Le joueur côté balle ferme la ligne (1 pas plus avancé), l'autre ferme le centre, un demi-pas en retrait.`,
          lobRisk?"<b>Adversaire au fond près de la vitre :</b> risque de lob, reculez d'un demi-pas tous les deux et levez la raquette.":"<b>Adversaire à mi-court :</b> il va jouer bas ou vite. Raquette devant, poids sur l'avant, prêts à bloquer.",
          "La corde entre vous reste tendue mais jamais plus de 3-4 m : si elle casse, le centre est ouvert."];
   }
 } else {
   // we're at the back, they're at net
   const near=bx<=220;
   if(near){ // ball on our side: one of us plays it
     const ballTop=by<120; const deep=bx<80;
     const yA=clamp(60+lateral*18,35,110), yB=clamp(180+lateral*18,130,205);
     const xS=deep?45:70;
     if(ballTop){us=[[deep?30:55,clamp(by,35,110),"Joue"],[60,yB,"Centre"]];}
     else{us=[[60,yA,"Centre"],[deep?30:55,clamp(by,130,205),"Joue"]];}
     txt=[`<b>Balle dans notre camp :</b> celui du côté de la balle la joue ; l'autre se décale <i>vers le centre</i> pour couvrir, à la même profondeur.`,
          deep?"<b>Balle profonde / vitre :</b> laissez-la toucher la vitre et ressortir. Jouez lob ou balle lente croisée.":"<b>Balle courte :</b> option chiquita dans les pieds du volleyeur, puis vous montez tous les deux.",
          "Jamais un joueur qui monte seul pendant que l'autre défend."];
   } else {
     // ball on their side, they're volleying; we stay back, shift laterally slightly
     const ballTop=by<120;
     us=[[55,clamp(65+lateral*15,40,110),ballTop?"Ligne":"Centre"],[55,clamp(175+lateral*15,130,200),ballTop?"Centre":"Ligne"]];
     txt=["<b>Ils volleyent :</b> restez à 1–1,5 m de la vitre du fond, même hauteur tous les deux, légèrement décalés vers le côté de la balle.","Lisez la raquette : ouverte = balle lente → prêts à monter ; fermée/haute = volée forte ou smash → reculez.","Objectif de la balle suivante : lob profond ou chiquita, pas une frappe forte."];
   }
 }
 // opponents
 if(pairMode==="att"){
   if(bx>220){ // they play from the back
     const ballTop=by<120;
     them=ballTop?[[clamp(bx,300,415),clamp(by,40,118)],[380,170]]:[[380,70],[clamp(bx,300,415),clamp(by,122,200)]];
   } else them=[[385,70],[385,170]];
 } else {
   if(bx>220){const ballTop=by<120;them=ballTop?[[clamp(bx,230,300),clamp(by,40,118)],[262,170]]:[[262,70],[clamp(bx,230,300),clamp(by,122,200)]];}
   else them=[[255,70],[255,170]];
 }
 return {us,them,txt};
}
function drawPair(){
 const p=pairPositions();
 document.getElementById("pair-us").innerHTML=p.us.map(u=>`<circle cx="${u[0]}" cy="${u[1]}" r="13" fill="#35e27f" stroke="#06110b" stroke-width="2" style="transition:all .35s ease"/><text x="${u[0]}" y="${u[1]-18}" text-anchor="middle" font-size="10" font-weight="700" fill="#fff" font-family="Manrope,sans-serif" style="transition:all .35s ease">${u[2]}</text>`).join("");
 document.getElementById("pair-opp").innerHTML=p.them.map(o=>`<circle cx="${o[0]}" cy="${o[1]}" r="13" fill="#fff" stroke="#06110b" stroke-width="2" style="transition:all .35s ease"/>`).join("");
 const r=document.getElementById("rope");r.setAttribute("x1",p.us[0][0]);r.setAttribute("y1",p.us[0][1]);r.setAttribute("x2",p.us[1][0]);r.setAttribute("y2",p.us[1][1]);
 const b=document.getElementById("pair-ball");b.setAttribute("cx",ball.x);b.setAttribute("cy",ball.y);
 const dist=Math.hypot(p.us[0][0]-p.us[1][0],p.us[0][1]-p.us[1][1]);
 r.setAttribute("stroke",dist>125?"#ff5d4a":"rgba(255,255,255,.55)");
 document.getElementById("pair-verdict").innerHTML=`<span class="vtag ${pairMode==="att"?"go":"maybe"}">${pairMode==="att"?"Nous au filet":"Nous au fond"}</span><ul>${p.txt.map(t=>`<li>${t}</li>`).join("")}</ul>`;
}
const pairSvg=document.getElementById("pair");
function svgPoint(e){const pt=pairSvg.createSVGPoint();const t=e.touches?e.touches[0]:e;pt.x=t.clientX;pt.y=t.clientY;const m=pairSvg.getScreenCTM().inverse();return pt.matrixTransform(m);}
pairSvg.addEventListener("click",e=>{const p=svgPoint(e);ball={x:clamp(p.x,15,425),y:clamp(p.y,15,225)};drawPair();});
document.querySelectorAll('#tutos .phases button[data-mode]').forEach(b=>b.addEventListener("click",()=>{pairMode=b.dataset.mode;document.querySelectorAll('#tutos .phases button[data-mode]').forEach(x=>x.setAttribute("aria-pressed",String(x===b)));ball=pairMode==="att"?{x:340,y:175}:{x:70,y:175};drawPair();}));
drawPair();
