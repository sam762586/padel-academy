<!--
NOTES INTERNES (ne pas publier : le générateur retire tout commentaire HTML).
Règlement-type des jeux concours d'Apprendre Padel. Brouillon à faire valider par Samuel (et, si possible, par un professionnel).
Champs remplis depuis le fichier de données de chaque concours : {titre}, {lot}, {valeur}, {date_debut}, {date_fin}, {nb_gagnants} ; accords calculés : {gagnants_designes}, {regle_gagnants}.
Texte au tutoiement, comme le reste du site : aucun texte n'impose le vouvoiement dans un règlement de jeu, l'essentiel est que les règles soient claires.
Typographie : ce fichier utilise des espaces ordinaires (mon outil ne sait pas écrire U+00A0). Le générateur doit remplacer l'espace avant : ; ? ! et à l'intérieur des guillemets « » par une espace insécable (U+00A0 ou &amp;nbsp;), SAUF dans « graine:identifiant du compte », où le « : » est volontairement collé : c'est le texte exact qui est haché.
-->

## Règlement du jeu concours « {titre} »

### Article 1. Organisateur

Le jeu concours « {titre} » (ci-après « le jeu ») est organisé par l'éditeur du site apprendre-padel.fr, Apprendre Padel, site personnel édité à titre non professionnel (voir les [mentions légales](mentions-legales.html)). Contact : samuelkyllian@hotmail.com.

Le jeu n'est ni parrainé, ni géré, ni associé à Facebook, Instagram, Google, Apple, la FFT, la FIP ou toute autre marque ou organisation.

### Article 2. Participation

2.1. Le jeu est gratuit et sans obligation d'achat. Aucun paiement, aucun achat, aucune dépense n'est demandé pour participer, avant comme pendant le jeu. Le seul coût possible est celui de ta connexion à internet, que l'organisateur ne rembourse pas.

2.2. Le jeu est ouvert du {date_debut} au {date_fin} inclus (heure de Paris), à toute personne physique résidant en France métropolitaine, qui a un compte sur le site et qui est connectée au moment de participer. Créer un compte est gratuit.

2.3. Pour participer, tu cliques sur le bouton de participation de la page « Jeu concours », après avoir coché deux cases : « J'ai lu et j'accepte le règlement » et « Je suis majeur, ou j'ai l'accord de mes parents ».

2.4. Une seule participation par compte et par concours. Une personne ne peut avoir qu'un seul compte pour jouer. Les participations multiples, les comptes créés pour augmenter ses chances ou toute tentative de fraude entraînent l'annulation des participations concernées.

2.5. Mineurs. Le compte est réservé aux personnes de 15 ans ou plus (déclaration faite à l'inscription). Si tu es mineur, tu ne participes qu'avec l'accord d'un parent ou du titulaire de l'autorité parentale, qui accepte le présent règlement et reçoit le lot à ta place. En cochant la case prévue, tu déclares avoir cet accord. L'organisateur peut demander à tout moment une preuve de cet accord au gagnant mineur avant de lui remettre le lot.

2.6. Sont exclus du jeu : l'organisateur, qui ne participe pas, et les personnes qui ont participé à l'organisation du jeu.

2.7. Tant que le jeu est ouvert, tu peux retirer ta participation avec le bouton « Retirer ma participation » de la page « Jeu concours », en écrivant à l'organisateur, ou en supprimant ton compte (voir l'article 6.3). Tu peux ensuite participer de nouveau, tant que le jeu est ouvert.

### Article 3. Désignation du ou des gagnants

3.1. Le jeu comporte {gagnants_designes} par tirage au sort parmi toutes les participations valables. Le tirage est effectué dans les 7 jours qui suivent le premier tirage EuroMillions qui suit la date de fin ({date_fin}).

3.2. Méthode du tirage, vérifiable par tous :
- La « graine » est formée de la date et des numéros du premier tirage EuroMillions qui suit la date de fin. Ces numéros sont publics et connus de tous ; l'organisateur ne peut pas les choisir ni les connaître à l'avance.
- Format exact de la graine : « AAAA-MM-JJ:n1-n2-n3-n4-n5:e1-e2 », c'est-à-dire la date du tirage EuroMillions, puis les 5 numéros, puis les 2 étoiles, dans l'ordre de sortie : les numéros sont séparés par des tirets, les trois groupes par deux-points. Exemple fictif, sans rapport avec un vrai tirage : « 2030-01-01:7-12-23-34-45:3-9 ».
- Pour chaque participation valable, on calcule l'empreinte SHA-256 du texte « graine:identifiant du compte ». L'identifiant du compte est un identifiant interne, que les autres joueurs et le public ne connaissent pas.
- {regle_gagnants}
- Chaque participation valable a ainsi la même chance d'être tirée, sans autre critère que la validité de la participation.
- Le jeu n'a aucun lien avec EuroMillions, qui sert seulement de source publique de hasard. La participation au jeu ne demande, ni n'implique, aucun achat.

3.3. L'organisateur publie sur la page « Jeu concours » la graine utilisée, le nombre de participations au moment du tirage, le nombre d'exclusions (article 7.3) et l'empreinte de chaque gagnant, pour que chacun puisse vérifier le tirage. Il conserve une trace du tirage (date, nombre de participations valables, graine, empreintes des gagnants) et la supprime, avec les participations, 60 jours après le tirage (voir l'article 6).

3.4. Un même compte ne peut gagner qu'un seul lot par jeu.

3.5. Le gagnant est annoncé sur la page « Jeu concours » avec l'empreinte de sa participation. Son pseudo n'est publié que si le gagnant coche lui-même la case prévue : l'organisateur ne peut pas la cocher à sa place. Sinon, seule l'empreinte est affichée.

### Article 4. Information du gagnant et lot non réclamé

4.1. Le gagnant est averti par e-mail, à l'adresse de son compte, dans les 7 jours qui suivent le tirage.

4.2. Il dispose de 15 jours à partir de l'envoi de ce message pour répondre à l'organisateur et lui donner ses coordonnées de livraison (nom et adresse postale). Un mineur répond avec son parent ou le titulaire de l'autorité parentale.

4.3. Passé ce délai sans réponse, ou si les informations sont fausses ou incomplètes, ou si l'e-mail revient en erreur, le gagnant perd son lot. L'organisateur désigne alors un remplaçant : la participation qui a la plus petite empreinte suivante, dans le même tirage (même graine). Il peut aussi ne pas attribuer le lot s'il n'y a plus de participation valable.

4.4. L'organisateur n'est pas responsable si l'e-mail du gagnant arrive dans les courriers indésirables ou ne peut pas être lu : pense à vérifier tes courriers indésirables après la fin du jeu.

### Article 5. Remise du lot

5.1. Le lot est {lot}, d'une valeur commerciale indicative de {valeur} € TTC, à la date de rédaction du règlement.

5.2. Le lot est offert par l'organisateur à titre personnel et envoyé par lui, par la poste, à l'adresse indiquée par le gagnant, en France métropolitaine, sans frais pour le gagnant, dans un délai de 30 jours après réception des coordonnées.

5.3. Le lot est nominatif et personnel : il ne peut pas être échangé contre un autre lot, ni contre de l'argent, ni cédé. L'organisateur se réserve toutefois le droit de le remplacer par un lot de nature et de valeur équivalentes si des circonstances indépendantes de sa volonté l'y obligent (par exemple si le produit n'est plus disponible), sans que les participants puissent exiger d'autre compensation. Si la loi impose un remboursement ou un échange (par exemple en cas de produit non conforme ou défectueux), la loi s'applique.

5.4. Le gagnant n'a rien à payer pour recevoir son lot. Les éventuelles obligations fiscales ou sociales du gagnant liées au lot restent les siennes.

5.5. La description du lot est donnée à titre indicatif. L'organisateur n'est pas le fabricant du lot : en cas de défaut, la garantie du fabricant ou du vendeur d'origine s'applique, dans la mesure où elle existe.

### Article 6. Données personnelles

6.1. Pour le jeu, l'organisateur enregistre : l'identifiant de ton compte, la date de ta participation et tes deux cases cochées. Si tu gagnes, l'empreinte de ta participation (calculée selon l'article 3) est publiée sur la page jusqu'à 60 jours après le tirage. L'adresse e-mail de ton compte sert uniquement à contacter le gagnant. Le gagnant donne en plus, par e-mail, son nom et son adresse postale, pour l'envoi du lot.

6.2. Ces données ne servent qu'à gérer le jeu : vérifier les participations, faire le tirage, contacter le gagnant et lui envoyer le lot. Elles ne sont ni revendues, ni utilisées pour t'envoyer de la publicité. Le seul destinataire est l'organisateur.

6.3. Les participations sont supprimées 60 jours après le tirage, avec les données d'exclusion (identifiant du compte et motif). Si le jeu n'a pas pu être tiré, les participations sont supprimées 90 jours après la date de fin. Les coordonnées de livraison du gagnant sont supprimées au plus tard 60 jours après le tirage. Si tu supprimes ton compte, tes participations sont supprimées avec lui.

6.4. Le pseudo du gagnant n'est publié que s'il coche lui-même la case prévue : l'organisateur ne peut pas le faire à sa place.

6.5. Tu peux accéder à tes données, les faire rectifier ou effacer, retirer ta participation tant que le jeu est ouvert, et saisir la CNIL, en écrivant à l'organisateur. Le détail se trouve dans la page [Confidentialité](confidentialite.html#jeu-concours).

### Article 7. Responsabilité

7.1. L'organisateur fait de son mieux pour que le jeu se déroule normalement, mais ne peut pas garantir que le site fonctionne sans interruption.

7.2. Il n'est pas responsable des pannes, des erreurs de transmission, des problèmes de connexion ou de tout autre incident technique qui empêcherait une participation. Il n'est pas non plus responsable des retards ou des pertes d'envoi dus à La Poste ou à un transporteur.

7.3. L'organisateur peut exclure toute participation incomplète, frauduleuse ou contraire au règlement. Chaque exclusion est enregistrée avec son motif, que le joueur concerné peut consulter. Le nombre d'exclusions est publié avec le nombre de participations au tirage (article 3.3). L'organisateur peut aussi suspendre, prolonger, reporter ou annuler le jeu si les circonstances l'exigent, par exemple en cas de fraude ou de défaillance technique. Il l'indique alors sur la page « Jeu concours ». Sa responsabilité ne peut pas être engagée de ce fait, sauf faute de sa part.

7.4. Rien dans ce règlement ne limite les droits que la loi te reconnaît.

### Article 8. Consultation du règlement

Le présent règlement est consultable gratuitement, à tout moment, sur la page « Jeu concours » d'apprendre-padel.fr, avant et après ta participation. Il peut aussi t'être envoyé gratuitement par e-mail sur simple demande.

Une modification du règlement en cours de jeu est annoncée sur la page. Elle ne peut pas réduire les droits des participants déjà inscrits. Participer vaut acceptation du règlement en vigueur au moment de ta participation.

### Article 9. Litiges et loi applicable

Le jeu et son règlement sont soumis au droit français. Toute réclamation doit être envoyée à l'organisateur par e-mail dans les 30 jours qui suivent la date de fin du jeu. En cas de désaccord persistant, tu peux saisir un médiateur de la consommation si ta situation relève de la médiation, ou le tribunal compétent selon les règles du droit commun. Un litige qui concerne tes données personnelles peut aussi être porté devant la CNIL.

<!--
NOTES INTERNES (ne pas publier).
Mention courte à afficher près du bouton :
« Jeu gratuit sans obligation d'achat. Participation réservée aux joueurs connectés, une par compte. Tirage au sort. Règlement ci-dessous. »
Variante plus courte :
« Jeu gratuit sans obligation d'achat. Règlement ci-dessous. »
-->
