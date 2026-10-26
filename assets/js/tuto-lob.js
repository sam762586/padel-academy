/* TUTO 2 : LOB → QUEL COUP */
function lobDecision(){
 const g=n=>document.querySelector(`input[name="${n}"]:checked`).value;
 const prof=g("lprof"),haut=g("lhaut"),pos=g("lpos"),score=g("lscore");
 let coup,cls,why,tips;
 if(prof==="profond"){
   if(pos==="recul"||haut==="bas"){coup="LAISSER PASSER → BAJADA";cls="stop";why="Le lob est trop profond pour être frappé proprement. Vous le laissez rebondir, vous prenez la sortie de vitre en bajada (frappe descendante) et vous remontez derrière.";tips=["Reculez vite en diagonale, raquette prête.","Frappez la balle en avançant, vers le centre ou croisé fort.","Votre partenaire recule avec vous : c'est une phase de défense temporaire."];}
   else{coup="GANCHO OU BANDEJA PROFONDE";cls="maybe";why="Vous êtes dessous mais la balle est profonde : pas de smash. Un gancho (crochet derrière la tête) ou une bandeja lente et profonde pour garder le filet.";tips=["Objectif : rester au filet, pas gagner le point.","Balle longue au centre pour supprimer les angles.","Si vous doutez, laissez passer et jouez la bajada."];}
 } else if(prof==="moyen"){
   if(haut==="bas"){coup="VÍBORA";cls="go";why="Balle tendue à hauteur de tête, vous êtes placé : la víbora (frappe sur le côté, effet latéral) part vite et meurt dans le coin vitre-grille.";tips=["Visez le rincón côté revers adverse.","Avancez d'un pas après la frappe pour fermer le filet.","Si vous reculez, transformez en bandeja."];}
   else{coup="BANDEJA";cls="go";why="Le coup de sécurité par excellence : raquette coupée, balle lente qui rebondit puis touche la vitre basse. Les adversaires restent au fond et vous restez au filet.";tips=["Croisée vers la vitre latérale ou au centre.","Frappe à hauteur d'épaule, un peu devant.","Jamais plus fort que nécessaire : une bandeja forte sort de la vitre et revient."];}
 } else { // court
   if(pos==="recul"){coup="BANDEJA AGRESSIVE";cls="maybe";why="Lob court mais vous n'êtes pas encore dessous : attention au smash déséquilibré. Une bandeja ou víbora rapide fera le même travail sans risque.";tips=["Replacez-vous d'abord, frappez ensuite.","Vous aurez une deuxième balle plus facile.","Si vous arrivez à passer devant la balle, smash."];}
   else if(score==="chaud"){coup="SMASH PLAT OU PAR 3, SI VOUS LE MAÎTRISEZ";cls="maybe";why="Balle courte et haute, vous êtes dessous : c'est la balle de smash. Mais sur balle de jeu, ne tentez que le coup que vous réussissez 8 fois sur 10 à l'entraînement.";tips=["Smash plat vers la ligne de fond pour sortir par 4.","Sinon víbora dans le rincón : presque aussi efficace, bien moins risqué.","Ne changez pas de plan à la dernière seconde."];}
   else{coup="SMASH";cls="go";why="Lob court, balle haute, vous êtes sous la balle : c'est LA balle pour conclure. Smash plat pour sortir par la vitre du fond (par 4), ou croisé avec angle pour sortir par 3.";tips=["Contact devant vous, bras tendu, poids vers l'avant.","Rebond près de la ligne de fond : la balle monte sur la vitre et sort.","Après le smash, restez au filet : s'il revient, volée gagnante."];}
 }
 document.getElementById("lob-verdict").innerHTML=`<span class="vtag ${cls}">${coup}</span><p>${why}</p><ul>${tips.map(x=>`<li>${x}</li>`).join("")}</ul>`;
}
["lprof","lhaut","lpos","lscore"].forEach(n=>document.querySelectorAll(`input[name="${n}"]`).forEach(i=>i.addEventListener("change",lobDecision)));
lobDecision();
