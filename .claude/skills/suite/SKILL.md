---
name: suite
description: "Fait avancer la feuille de route ROADMAP.md en choisissant la prochaine tâche (ou celle nommée), puis la réalise avec l'équipe d'agents selon la compétence chef. À utiliser quand Samuel dit « la suite », « tâche suivante », « continue la feuille de route » ou nomme une tâche (ex. lot 3b, T6)."
argument-hint: "[tâche facultative, ex. lot 3b ou T6]"
---
# La suite de la feuille de route

Tâche demandée : $ARGUMENTS

1. Lis ROADMAP.md en entier : « Règles de la v3 », phases en cours, Journal, puis l'archive v2.
2. Choisis la tâche :
   - une tâche est nommée : prends-la ; si elle est BLOQUÉE, attend un accord de Samuel ou dépend d'une phase non validée, dis-le et propose une alternative ;
   - sinon, parmi les cases non cochées de la v3 : une phase à la fois (finir ou faire valider la phase en cours avant d'en ouvrir une autre), hors BLOQUÉ et hors « sur accord de Samuel » non obtenu. L'archive v2 (lots T, M, C, V, R) n'est reprise que si Samuel la demande, et en respectant les choix de la v3 (pas de FAQPage, pas de coach IA, pas de service payant, pas de suppression de page).
   - Présente les 3 meilleures candidates (AskUserQuestion) : intitulé exact, ce que ça apporte au joueur, taille (petite, moyenne, grosse), dépendances ; recommande-en une.
3. La tâche choisie, applique la compétence `chef` avec l'identifiant et l'intitulé exacts de ROADMAP.md, les contraintes écrites pour cette tâche et ce que le Journal dit déjà.
4. À la fin, ROADMAP.md est à jour (case, date, hash, Journal) comme le prévoit `chef` ; propose la tâche suivante en une ligne.
