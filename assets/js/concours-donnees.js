/* JEU CONCOURS : données des concours (concours.html, lues par assets/js/concours.js et scripts/generer-concours.js).
   Un objet par concours, du plus ancien au plus récent :
     id          identifiant unique au format AAAA-MM-nom (minuscules, chiffres et tirets), ex. "2026-12-raquette" ;
                 c'est aussi l'id de la ligne de public.concours (le SQL d'insertion est affiché par le générateur)
     titre       nom du concours (120 caractères au plus), repris dans le règlement
     lot         description du lot, ex. "une raquette Bullpadel Vertex 04 (2026)"
     valeur      valeur commerciale indicative en euros TTC (nombre), ex. 249.95
     date_debut  premier jour du jeu, "AAAA-MM-JJ", heure de Paris (ouvert dès 0 h)
     date_fin    dernier jour du jeu, "AAAA-MM-JJ", heure de Paris (inclus, jusqu'à 23 h 59 min 59 s)
     nb_gagnants nombre de gagnants tirés au sort (entier de 1 à 20)
     tire        facultatif : true une fois le tirage fait (aucune donnée personnelle ici : les gagnants, leurs
                 empreintes et leur pseudo s'ils l'acceptent viennent de la base, rpc concours_gagnants_publics)
     annule      facultatif : {le:"AAAA-MM-JJ",motif:"…"} si l'organisateur annule le jeu (règlement, article 7.3) ;
                 le = jour de l'annulation, motif = fin de la phrase « Jeu annulé le 4 novembre 2026, <motif>. »
                 (ex. "à la suite d'un problème technique", 200 caractères au plus). Le concours reste dans le tableau
                 (historique) ; la page affiche l'annulation, plus aucune participation n'est proposée, et le
                 générateur n'affiche plus de SQL d'insertion. Jamais avec tire:true.
   Après toute modification : node scripts/generer-concours.js (écrit la page et affiche le SQL à exécuter dans
   Supabase), puis node scripts/appliquer-gabarit.js. Aucun concours inventé : le tableau reste vide tant que
   l'organisateur n'en lance pas un.
   Exemple (à recopier dans le tableau) :
     {id:"2026-12-raquette",titre:"La raquette de Noël",lot:"une raquette de padel Bullpadel Vertex 04 (2026)",valeur:249.95,
      date_debut:"2026-12-01",date_fin:"2026-12-24",nb_gagnants:1},
*/
const CONCOURS=[
  {id:"2026-11-pack-nox",titre:"Ton pack Nox offert",lot:"un t-shirt de padel Nox Team 2026 (taille au choix du gagnant) et 2 tubes de 3 balles Nox Pro Titanium",valeur:47.89,
   date_debut:"2026-11-01",date_fin:"2026-11-30",nb_gagnants:1,
   annule:{le:"2026-11-04",motif:"à la suite d'un problème technique"}},
];
