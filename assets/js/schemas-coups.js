/* SCHÉMAS ANIMÉS DES COUPS
   Pour ajouter un coup : ajouter une entrée dans SCHEMAS (le rendu est générique).
   - coup : nom EXACT du coup dans coups.js (champ n), c'est la liaison avec la fiche.
   - vue : "cote" (terrain vu de profil, 20 m sur 390 px, sol y=200, filet x=215, vitres x=20 et x=410)
           ou "dessus" (terrain vu de dessus, 420 x 210 px, filet x=220, joueur de gauche à droite).
   - joueurs : cote -> {x, sens:1|-1, pose:"frappe"|"attente", qui:"toi"|"adv"} (x = pieds, sol y=200)
               dessus -> {x, y, qui:"toi"|"adv"}
   - notes : petits textes dans le schéma {x, y, t, c:"sand"|"sky"|"turf"|"coral", a:"start"|"middle"|"end"}
   - segments : la balle les parcourt dans l'ordre. d = chemin SVG, c = couleur (sky = adversaire,
     turf = ton coup, sand = après la vitre, coral = sortie), ms = durée de lecture.
   - etapes : légendes numérotées. seg + at (0..1) = moment du parcours ; x,y = position du repère
     (par défaut, sur la trajectoire, décalé de dx,dy). */
const SCHEMAS = [
 {
  id:"bandeja", coup:"Bandeja", vue:"cote",
  titre:"Bandeja, vue de profil",
  desc:"Vue de profil du terrain. Un lob adverse monte puis redescend vers toi. Tu le frappes à hauteur d'épaule, raquette coupée : la balle part à plat et lente vers le fond, passe le filet, rebondit puis touche la vitre du fond bas. Elle retombe presque morte et tu restes au filet.",
  joueurs:[{x:372,sens:-1,pose:"frappe",qui:"adv"},{x:150,sens:1,pose:"frappe",qui:"toi"}],
  notes:[{x:236,y:184,t:"slice",c:"turf",a:"start"},{x:255,y:80,t:"lob adverse",c:"sky",a:"middle"}],
  segments:[
   {d:"M345,172 C325,-5 185,-5 165,164",c:"sky",ms:1700},
   {d:"M165,164 Q265,150 335,200",c:"turf",ms:1100},
   {d:"M335,200 Q385,150 410,166",c:"sand",ms:650},
   {d:"M410,166 Q398,172 388,200",c:"sand",ms:700}
  ],
  etapes:[
   {seg:0,at:.6,x:122,y:122,txt:"Lob adverse : décale-toi sur le côté (ne recule pas) et place-toi de profil, raquette devant."},
   {seg:1,at:0,dx:18,dy:-26,txt:"Frappe à hauteur d'épaule, raquette coupée (slice) : tu accompagnes, tu ne claques pas."},
   {seg:1,at:1,dx:0,dy:-20,txt:"Balle lente et à plat vers le fond : elle passe le filet et rebondit avant la vitre."},
   {seg:2,at:1,dx:-18,dy:-16,txt:"Elle touche la vitre du fond bas et retombe presque morte."},
   {seg:3,at:1,x:118,y:172,txt:"Tu restes au filet : le but est de garder la position, pas de gagner le point."}
  ]
 },
 {
  id:"vibora", coup:"Víbora", vue:"cote",
  titre:"Víbora, vue de profil",
  desc:"Vue de profil du terrain. Sur un lob un peu court, tu frappes plus haut, au-dessus de la tête, sur le côté de la balle. La trajectoire est plus rapide et tendue que celle de la bandeja, elle rebondit près de la vitre, touche le coin vitre-grille, puis ressort vite et très bas.",
  joueurs:[{x:372,sens:-1,pose:"frappe",qui:"adv"},{x:150,sens:1,pose:"frappe",qui:"toi"}],
  notes:[{x:222,y:136,t:"plus tendue, plus rapide",c:"turf",a:"start"},{x:262,y:80,t:"lob un peu court",c:"sky",a:"middle"},{x:404,y:112,t:"rincón",c:"sand",a:"end"}],
  segments:[
   {d:"M345,172 C320,-5 195,-5 170,150",c:"sky",ms:1600},
   {d:"M170,150 Q290,148 378,200",c:"turf",ms:850},
   {d:"M378,200 Q396,176 410,172",c:"sand",ms:300},
   {d:"M410,172 Q370,188 300,198",c:"sand",ms:450}
  ],
  etapes:[
   {seg:0,at:.6,x:118,y:118,txt:"Lob un peu court : décale-toi sur le côté et place-toi de profil, balle au-dessus de la tête."},
   {seg:1,at:0,dx:18,dy:-26,txt:"Frappe haute, sur le côté de la balle : geste plus coupé et plus tendu que la bandeja."},
   {seg:1,at:1,dx:-4,dy:-20,txt:"Trajectoire plus rapide : la balle rebondit près de la vitre du fond."},
   {seg:2,at:1,dx:-16,dy:-18,txt:"Elle tape le coin vitre-grille (rincón), côté revers adverse."},
   {seg:3,at:1,dx:0,dy:-20,txt:"Elle ressort vite et très bas, avec un effet latéral : difficile à relever. Reste au filet."}
  ]
 },
 {
  id:"par3", coup:"Smash par 3 (por tres)", vue:"dessus",
  titre:"Smash par 3, vue de dessus",
  desc:"Vue de dessus du terrain. Tu es côté gauche, près du filet. Tu smashes en croisé : la balle rebondit près de la ligne de fond adverse, touche la vitre latérale, puis passe par-dessus et sort du terrain par le côté.",
  joueurs:[{x:178,y:190,qui:"toi"},{x:335,y:178,qui:"adv"}],
  notes:[{x:20,y:20,t:"Vitre latérale",c:"sky",a:"start"}],
  segments:[
   {d:"M184,184 L345,95",c:"turf",ms:1100},
   {d:"M345,95 Q388,72 402,33",c:"sand",ms:650},
   {d:"M402,33 L416,8",c:"coral",ms:450}
  ],
  etapes:[
   {seg:0,at:0,x:140,y:200,txt:"Lob court côté croisé : avance, place-toi de profil à 2–2,5 m du filet."},
   {seg:0,at:.02,x:214,y:150,txt:"Smash croisé avec de l'angle, tout en contrôle : tu vises la ligne de fond, côté croisé."},
   {seg:0,at:1,dx:-22,dy:18,txt:"La balle rebondit près de la ligne de fond adverse."},
   {seg:1,at:1,dx:-24,dy:12,txt:"Elle touche la vitre latérale..."},
   {seg:2,at:1,dx:-22,dy:8,txt:"... puis passe par-dessus et sort du terrain par le côté : le point est gagné."}
  ]
 },
 {
  id:"par4", coup:"Smash plat (remate)", vue:"cote",
  titre:"Smash plat par 4, vue de profil",
  desc:"Vue de profil du terrain. Sur un lob court, tu frappes un smash plat et fort au-dessus de la tête. La balle rebondit près de la ligne de fond adverse puis monte et passe par-dessus la vitre et la grille du fond (4 m) : c'est le par 4.",
  joueurs:[{x:380,sens:-1,pose:"attente",qui:"adv"},{x:170,sens:1,pose:"frappe",qui:"toi"}],
  notes:[{x:262,y:80,t:"lob court",c:"sky",a:"middle"}],
  segments:[
   {d:"M345,172 C320,10 220,10 187,148",c:"sky",ms:1400},
   {d:"M187,148 Q330,122 392,200",c:"turf",ms:700},
   {d:"M392,200 Q405,70 435,70",c:"coral",ms:650}
  ],
  etapes:[
   {seg:0,at:.62,x:118,y:118,txt:"Lob court : avance et place-toi de profil, à 2–2,5 m du filet."},
   {seg:1,at:0,dx:18,dy:-24,txt:"Smash plat et fort, bras tendu, au point le plus haut."},
   {seg:1,at:1,dx:-18,dy:-18,txt:"Le rebond tombe près de la ligne de fond adverse."},
   {seg:2,at:1,dx:-26,dy:20,txt:"La balle monte, passe au-dessus de la vitre et de la grille (4 m) : sortie par 4."}
  ]
 },
 {
  id:"sortie-fond", coup:"Sortie de vitre de fond", vue:"cote",
  titre:"Sortie de vitre de fond, vue de profil",
  desc:"Vue de profil du terrain. Un lob adverse rebondit dans ton camp puis touche ta vitre du fond. Tu recules et tu te places de profil, tu laisses la balle ressortir et redescendre, puis tu la frappes devant toi pour renvoyer un lob.",
  joueurs:[{x:372,sens:-1,pose:"frappe",qui:"adv"},{x:82,sens:1,pose:"attente",qui:"toi"}],
  notes:[{x:262,y:80,t:"lob adverse",c:"sky",a:"middle"}],
  segments:[
   {d:"M345,172 C300,-20 120,-10 62,200",c:"sky",ms:1600},
   {d:"M62,200 Q30,172 20,150",c:"sand",ms:420},
   {d:"M20,150 Q62,108 120,162",c:"sand",ms:800},
   {d:"M120,162 C150,20 300,10 350,170",c:"turf",ms:1300}
  ],
  etapes:[
   {seg:0,at:.75,x:130,y:70,txt:"Le lob va toucher ta vitre : recule, ne joue pas avant."},
   {seg:1,at:1,dx:22,dy:-14,txt:"La balle touche la vitre du fond. Plus elle arrive vite, plus elle ressort loin."},
   {seg:2,at:.5,dx:6,dy:-22,txt:"Pivote, place-toi de profil et attends : laisse-la passer devant toi."},
   {seg:2,at:1,dx:14,dy:-18,txt:"Frappe quand elle redescend, devant toi, à hauteur d'épaule."},
   {seg:3,at:.55,dx:0,dy:-20,txt:"Renvoie un lob (ou une balle longue) pour te replacer."}
  ]
 }
];

(function(){
 const NS="http://www.w3.org/2000/svg";
 const esc=s=>String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
 const reduit=window.matchMedia("(prefers-reduced-motion: reduce)");

 /* ---- Décors ---- */
 function bonhomme(j){
  const x=j.x,y=200,s=j.sens,cl=j.qui==="toi"?"sch-toi":"sch-adv";
  const main=j.pose==="frappe"?[x+s*7,y-40]:[x+s*9,y-21];
  const rac=j.pose==="frappe"?[x+s*9,y-48]:[x+s*14,y-27];
  return `<g class="sch-fig ${cl}"><circle cx="${x}" cy="${y-34}" r="5"/><path d="M${x},${y-28}V${y-14}M${x},${y-14}L${x-4},${y}M${x},${y-14}L${x+5},${y}M${x},${y-26}L${main[0]},${main[1]}"/><ellipse cx="${rac[0]}" cy="${rac[1]}" rx="4.5" ry="7" transform="rotate(${s*25} ${rac[0]} ${rac[1]})"/></g>`;
 }
 function decorCote(sc){
  const mur=x=>`<rect x="${x-3}" y="141" width="6" height="59" class="sch-vitre"/><rect x="${x-2}" y="121" width="4" height="20" class="sch-grille"/>`;
  return `<rect x="8" y="200" width="424" height="9" rx="3" class="sch-sol"/>`+mur(20)+mur(410)
   +`<path d="M215,200V183" class="sch-filet"/>`
   +`<text x="40" y="226" class="sch-lab">TON CÔTÉ</text><text x="400" y="226" class="sch-lab" text-anchor="end">CÔTÉ ADVERSE</text>`
   +sc.joueurs.map(bonhomme).join("");
 }
 function decorDessus(sc){
  const gid="sch-g-"+sc.id;
  return `<defs><linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#1c7f4a"/><stop offset="1" stop-color="#0f5a33"/></linearGradient></defs>`
   +`<rect x="10" y="30" width="420" height="210" rx="6" fill="url(#${gid})" class="sch-cour"/>`
   +`<path d="M74,30V240M366,30V240M74,135H366" class="sch-ligne"/>`
   +`<path d="M220,30V240" class="sch-filet"/>`
   +`<path d="M10,30H430M10,240H430" class="sch-vitre-l"/>`
   +`<text x="80" y="232" class="sch-lab" text-anchor="middle">NOUS</text><text x="360" y="232" class="sch-lab" text-anchor="middle">EUX</text>`
   +sc.joueurs.map(j=>`<g class="${j.qui==="toi"?"sch-toi":"sch-adv"} sch-pion"><circle cx="${j.x}" cy="${j.y}" r="11"/>${j.qui==="toi"?`<text x="${j.x}" y="${j.y+4}" text-anchor="middle">TOI</text>`:""}</g>`).join("");
 }

 /* ---- Rendu d'un schéma ---- */
 function html(sc){
  const traj=sc.segments.map((g,i)=>`<path d="${g.d}" class="sch-ghost sch-${g.c}" data-i="${i}"/>`).join("")
   +sc.segments.map((g,i)=>`<path d="${g.d}" pathLength="1" class="sch-trace sch-${g.c}" data-i="${i}"/>`).join("");
  const notes=(sc.notes||[]).map(n=>`<text x="${n.x}" y="${n.y}" class="sch-note sch-${n.c}" text-anchor="${n.a||"middle"}">${esc(n.t)}</text>`).join("");
  const mk=sc.etapes.map((e,i)=>`<g class="sch-mk" data-j="${i}"><circle r="11"/><text y="5" text-anchor="middle">${i+1}</text></g>`).join("");
  const vb=sc.vue==="dessus"?"0 0 440 250":"0 22 440 210";
  return `<div class="sch" data-id="${sc.id}">
   <svg viewBox="${vb}" role="img" aria-label="${esc(sc.desc)}" focusable="false"><desc>${esc(sc.desc)}</desc>
    ${sc.vue==="dessus"?decorDessus(sc):decorCote(sc)}${notes}<g class="sch-traj">${traj}</g><g class="sch-mks">${mk}</g>
    <circle class="sch-balle" r="6.5" cx="-20" cy="-20"/></svg>
   <div class="sch-ctl" role="group" aria-label="Commandes du schéma : ${esc(sc.titre)}">
    <button type="button" class="btn ghost sch-b" data-a="lecture">Lecture</button>
    <button type="button" class="btn ghost sch-b" data-a="pause">Pause</button>
    <button type="button" class="btn ghost sch-b" data-a="rejouer">Rejouer</button>
    <button type="button" class="btn ghost sch-b" data-a="suivante">Étape suivante</button>
   </div>
   <ol class="sch-steps">${sc.etapes.map((e,i)=>`<li data-j="${i}"><span class="sch-n" aria-hidden="true">${i+1}</span><span>${esc(e.txt)}</span></li>`).join("")}</ol>
  </div>`;
 }

 /* ---- Animation ---- */
 function activer(root,sc){
  const svg=root.querySelector("svg");
  const paths=[...root.querySelectorAll(".sch-ghost")];
  const traces=[...root.querySelectorAll(".sch-trace")];
  const balle=root.querySelector(".sch-balle");
  const lis=[...root.querySelectorAll(".sch-steps li")];
  const mks=[...root.querySelectorAll(".sch-mk")];
  const lens=paths.map(p=>p.getTotalLength());
  const starts=[];let total=0;
  sc.segments.forEach(g=>{starts.push(total);total+=g.ms;});
  const tEt=sc.etapes.map(e=>starts[e.seg]+e.at*sc.segments[e.seg].ms);
  sc.etapes.forEach((e,i)=>{
   let x=e.x,y=e.y;
   if(x==null){const p=paths[e.seg].getPointAtLength(e.at*lens[e.seg]);x=p.x+(e.dx||0);y=p.y+(e.dy||0);}
   mks[i].setAttribute("transform",`translate(${x.toFixed(1)} ${y.toFixed(1)})`);
  });
  let t=0,jouer=false,cible=null,raf=0,last=0;
  const ctl=root.querySelector(".sch-ctl");

  function dessiner(){
   const stat=reduit.matches;
   root.classList.toggle("sch-statique",stat);
   const tt=stat?total:t;
   let cur=-1;
   tEt.forEach((te,j)=>{if(tt>=te-1)cur=j;});
   traces.forEach((tr,i)=>{
    const p=Math.min(1,Math.max(0,(tt-starts[i])/sc.segments[i].ms));
    tr.style.strokeDashoffset=String(1-p);
    tr.style.opacity=p>0?"1":"0";
   });
   let i=sc.segments.length-1;
   while(i>0&&tt<starts[i])i--;
   const p=Math.min(1,Math.max(0,(tt-starts[i])/sc.segments[i].ms));
   const pt=paths[i].getPointAtLength(p*lens[i]);
   balle.setAttribute("cx",pt.x.toFixed(1));balle.setAttribute("cy",pt.y.toFixed(1));
   mks.forEach((m,j)=>{m.classList.toggle("vu",stat||tt>=tEt[j]-1);m.classList.toggle("cur",!stat&&j===cur);});
   lis.forEach((l,j)=>{
    l.classList.toggle("cur",!stat&&j===cur);
    if(!stat&&j===cur)l.setAttribute("aria-current","step");else l.removeAttribute("aria-current");
   });
   root.querySelectorAll('[data-a="lecture"]').forEach(b=>b.setAttribute("aria-pressed",jouer?"true":"false"));
   root.querySelectorAll('[data-a="pause"]').forEach(b=>b.setAttribute("aria-pressed",!jouer&&t>0&&t<total?"true":"false"));
  }
  function boucle(now){
   if(!jouer)return;
   t+=Math.min(now-last,60);last=now;
   const fin=cible!=null?cible:total;
   if(t>=fin){t=fin;jouer=false;cible=null;}
   dessiner();
   if(jouer)raf=requestAnimationFrame(boucle);
  }
  function lecture(){
   if(reduit.matches)return;
   if(t>=total)t=0;
   if(jouer)return;
   jouer=true;last=performance.now();raf=requestAnimationFrame(boucle);
  }
  function pause(){jouer=false;cible=null;cancelAnimationFrame(raf);dessiner();}
  function rejouer(){pause();t=0;cible=null;dessiner();lecture();}
  function suivante(){
   if(reduit.matches)return;
   pause();
   let n=tEt.findIndex(te=>te>t+2);
   if(n<0){t=0;n=0;}
   cible=tEt[n];jouer=true;last=performance.now();raf=requestAnimationFrame(boucle);
  }
  ctl.addEventListener("click",e=>{
   const b=e.target.closest("button");if(!b)return;
   ({lecture,pause,rejouer,suivante})[b.dataset.a]();
  });
  reduit.addEventListener("change",()=>{pause();t=0;dessiner();});
  root._sch={lecture,pause,dessiner};
  dessiner();
 }

 /* ---- Intégration dans les fiches (rendu à l'ouverture seulement) ---- */
 document.querySelectorAll("article.card").forEach(card=>{
  const h=card.querySelector("h3");if(!h)return;
  const sc=SCHEMAS.find(s=>s.coup===h.textContent.trim());if(!sc)return;
  const det=document.createElement("details");
  det.className="coup geste";
  det.innerHTML=`<summary>Voir le geste</summary><div class="sch-hote"></div>`;
  const ref=card.querySelector("details.coup");
  card.insertBefore(det,ref);
  det.addEventListener("toggle",()=>{
   const hote=det.querySelector(".sch-hote");
   card.classList.toggle("card-geste",det.open);
   if(det.open){
    if(!hote.firstChild){
     hote.innerHTML=html(sc);
     activer(hote.firstElementChild,sc);
    }
    const r=hote.firstElementChild;
    if(!reduit.matches)r._sch.lecture();
   }else if(hote.firstElementChild){
    hote.firstElementChild._sch.pause();
   }
  });
 });
})();
