/* TUTO 2 : LOB → QUEL COUP */
/* Typo :   = espace insécable dans le texte affiché. */
function lobDecision(){
 const g=n=>document.querySelector(`input[name="${n}"]:checked`).value;
 const prof=g("lprof"),haut=g("lhaut"),pos=g("lpos"),score=g("lscore");
 let coup,cls,why,tips;
 if(prof==="profond"){
   if(pos==="recul"||haut==="bas"){coup="LAISSER PASSER → BAJADA";cls="stop";why="Le lob est trop profond pour être frappé proprement. Tu le laisses rebondir, tu prends la sortie de vitre en bajada (frappe descendante) et on remonte à deux derrière.";tips=["Recule vite en diagonale, raquette prête.","Frappe la balle en avançant, vers le centre ou croisé fort.","Ton partenaire recule avec toi : c'est une phase de défense temporaire."];}
   else{coup="BANDEJA PROFONDE";cls="maybe";why="Tu es sous la balle mais elle est profonde : pas de smash. Bandeja lente et profonde (ou víbora lente) pour garder le filet. Si la balle est très haute ou passe au-dessus de ton épaule gauche (droitier), le gancho (crochet derrière la tête) fait le même travail.";tips=["Objectif : rester au filet, pas gagner le point.","Balle longue au centre pour supprimer les angles.","Si tu doutes, laisse passer et joue la bajada."];}
 } else if(prof==="moyen"){
   if(haut==="bas"){coup="VÍBORA";cls="go";why="Balle tendue à hauteur de tête, tu es placé : la víbora (frappe sur le côté, effet latéral) part vite et meurt dans le coin vitre-grille.";tips=["Vise le rincón côté revers adverse.","Avance d'un pas après la frappe pour fermer le filet.","Si tu recules, transforme-la en bandeja."];}
   else{coup="BANDEJA";cls="go";why="Le coup de sécurité par excellence : raquette coupée, balle lente qui rebondit puis touche la vitre basse. Les adversaires restent au fond et on garde le filet.";tips=["Croisée vers la vitre latérale ou au centre.","Frappe à hauteur d'épaule, un peu devant.","Jamais plus fort que nécessaire : une bandeja forte sort de la vitre et revient."];}
 } else { // court
   if(pos==="recul"){coup="BANDEJA AGRESSIVE";cls="maybe";why="Lob court mais tu n'es pas encore dessous : attention au smash déséquilibré. Une bandeja ou une víbora rapide fera le même travail sans risque.";tips=["Replace-toi d'abord, frappe ensuite.","Tu auras une deuxième balle plus facile.","Si tu arrives à te placer sous la balle à temps, smash."];}
   else if(score==="chaud"){coup="SMASH PLAT OU PAR 3, SI TU LE MAÎTRISES";cls="maybe";why="Balle courte et haute, tu es dessous : c'est la balle de smash. Mais sur balle de jeu, ne tente que le coup que tu réussis 8 fois sur 10 à l'entraînement.";tips=["Smash plat vers la ligne de fond pour sortir par 4.","Sinon víbora dans le rincón : presque aussi efficace, bien moins risqué.","Ne change pas de plan à la dernière seconde."];}
   else{coup="SMASH";cls="go";why="Lob court, balle haute, tu es sous la balle : c'est LA balle pour conclure. Smash plat pour sortir par la vitre du fond (par 4), ou croisé avec angle pour sortir par 3.";tips=["Contact devant toi, bras tendu, poids vers l'avant.","Rebond près de la ligne de fond : la balle monte sur la vitre et sort.","Après le smash, reste au filet : s'il revient, volée gagnante."];}
 }
 document.getElementById("lob-verdict").innerHTML=`<span class="vtag ${cls}">${coup}</span><p>${why}</p><ul>${tips.map(x=>`<li>${x}</li>`).join("")}</ul>`;
}
// Le script peut être inclus sur une page sans ce tuto : rien à brancher dans ce cas
if(document.getElementById("lob-verdict")&&document.querySelector('input[name="lprof"]')){
 ["lprof","lhaut","lpos","lscore"].forEach(n=>document.querySelectorAll(`input[name="${n}"]`).forEach(i=>i.addEventListener("change",lobDecision)));
 lobDecision();
}
