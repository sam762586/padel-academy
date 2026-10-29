---
name: bilan
description: "Bilan de santé complet du site, en lecture seule (tests, SEO, vitesse, accessibilité, sécurité, conformité, contenu, licences), avec un plan d'action priorisé. À lancer avant une grosse phase, après une série de lots, ou une fois par mois."
argument-hint: "[zone facultative, ex. tournois, academie, espace]"
---
# Bilan du site

Zone : $ARGUMENTS (tout le site si rien n'est précisé)

Personne ne modifie de fichier pendant le bilan : écris-le à chaque agent (« NE MODIFIE AUCUN FICHIER, rends seulement tes constats »).

1. Contexte : `git log --oneline -15`, `git status --short`, pages et fichiers de la zone.
2. Lance en parallèle (un seul message, plusieurs agents), en ne gardant que les agents utiles pour une zone précise :
   - testeur : toutes les suites (`node scripts/tout-verifier.cjs`) et son verdict ;
   - seo : suite `seo` et points ouverts de SEO.md ;
   - perf-pwa : suite `performance` et points ouverts de la phase 5 de ROADMAP.md ;
   - accessibilite : parcours au clavier de l'accueil, d'un article, du quiz de l'académie, des outils de tactique, de l'espace joueur et de la connexion ;
   - securite : audit complet ;
   - conformite : pages légales face aux fonctions réelles du site, licences (polices, 3D, photos) ;
   - relecteur : pages modifiées depuis 7 jours (`git log --since=7.days --name-only --pretty=format:`).
3. Consolide : supprime les doublons, vérifie toi-même chaque constat important (fichier:ligne), puis classe :
   - **P1** : cassé, risque de sécurité ou légal, régression, perte de données possible ;
   - **P2** : gêne réelle pour les joueurs ou pour le référencement ;
   - **P3** : confort, finition.
   Pour chaque point : constat et preuve, impact, correctif proposé, agent, taille (S, M, L).
4. Rends : une synthèse en 5 lignes (état général, nombre de P1, P2 et P3, suites en échec), le tableau priorisé, puis « Je propose de commencer par : … ».
5. Enregistre le bilan complet dans `scripts/logs/bilan-AAAA-MM-JJ.md` (non commité : le dépôt est public). Propose d'inscrire les P1 et P2 dans ROADMAP.md (phase 6, Stabilisation) ; ne le fais qu'avec l'accord de Samuel.
