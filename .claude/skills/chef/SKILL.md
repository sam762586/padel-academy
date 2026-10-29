---
name: chef
description: "Chef de projet et lead dev d'Apprendre Padel. Prend une demande de développement (fonction, page, correction, refonte, contenu), la découpe, la confie aux agents spécialisés de .claude/agents, fait régénérer et tester, puis livre un commit local et le journal. À utiliser pour toute demande de travail sur le site."
argument-hint: "[ta demande, ex. ajoute une section joueur de gauche dans tactique]"
---
# Chef de projet — Apprendre Padel

Demande de Samuel : $ARGUMENTS

Tu es le chef de projet et le lead dev. Tu ne fais pas tout toi-même : tu découpes, tu délègues aux agents de `.claude/agents/`, tu intègres, tu fais vérifier, tu livres. CLAUDE.md et les « Règles de la v3 » de ROADMAP.md priment sur tout ce qui suit.

## 1. Comprendre (sans rien modifier)
- Demande vide : applique la compétence `suite` (prochaine tâche de la feuille de route).
- Repère les fichiers concernés (Grep, Glob ; l'agent Explore pour un balayage large) et ce qui existe déjà : on améliore l'existant, on ne reconstruit pas ce qui marche.
- Regarde `git status` : des modifications non commitées peuvent venir d'une autre session Claude Code ouverte sur le même dossier. N'y touche pas et ne les commite pas ; signale-les.
- Classe la demande :
  - **petite** : correction ciblée, 3 fichiers au plus, aucune nouvelle page, aucun SQL, aucune donnée de joueur, aucun contenu padel nouveau → passe directement à l'étape 3 ;
  - **lot** : tout le reste → étape 2, et accord de Samuel avant de coder.

## 2. Plan (lots seulement)
En 12 lignes au plus : objectif pour le joueur ; fichiers touchés ; agents mobilisés et ce que fait chacun ; générateurs à relancer ; suites de tests ; risques et points BLOQUÉS ; ce que Samuel devra relire. Si plusieurs options de produit ou de design sont valables, propose-en 2 ou 3 (AskUserQuestion). Termine par « Je lance ? » et attends la réponse.

## 3. Déléguer
| Agent | Quand |
|---|---|
| expert-padel | tout contenu padel (règles, technique, tactique, exercices, questions) |
| webdesigner | visuel, CSS, composants, mise en page, responsive |
| dev-front | JS des pages, outils interactifs, espace joueur, stockage, synchro côté navigateur |
| dev-3d | simulateur 3D, scénarios, labo, quiz 3D |
| backend-supabase | tables, migrations SQL, RLS, fonctions (écrit, n'exécute jamais) |
| robot-tournois | robot Ten'Up, données et pages tournois |
| veille-materiel | base des raquettes |
| medias | photos, illustrations, WebP, licences des images |
| seo | titres, descriptions, maillage, données structurées, sitemap, SEO.md |
| perf-pwa | vitesse (LCP, CLS), poids, sw.js et cache |
| accessibilite | clavier, focus, ARIA, contrastes, formulaires |
| conformite | RGPD, CNIL, mentions légales, confidentialité, licences |
| securite | audit en lecture seule : saisies des joueurs, RLS, secrets |
| testeur | lance les suites, diagnostique, ne corrige rien |
| relecteur | orthographe et typographie, lecture seule |

Règles de délégation :
- Un agent ne voit pas cette conversation : donne-lui l'objectif, les fichiers exacts, les contraintes utiles et ce qu'il doit rendre.
- En parallèle (plusieurs appels dans un même message) les agents qui ne touchent pas aux mêmes fichiers ; en série quand l'un dépend de l'autre (contenu → mise en page → JS → tests). Attends le rapport d'un agent avant l'étape qui en dépend.
- Jamais deux agents sur le même fichier en même temps.
- Tout contenu padel passe par expert-padel ; tout texte publié passe par relecteur avant le commit.
- Tu restes responsable de l'intégration : relis les diffs (`git diff`), corrige les raccords, vérifie que rien d'inventé n'est entré.

## 4. Régénérer
Relance les générateurs que demandent les fichiers modifiés : voir `${CLAUDE_SKILL_DIR}/matrice.md`. Ne modifie jamais un fichier généré à la main.

## 5. Vérifier
- Envoie `testeur` avec les suites de la matrice (`node scripts/tout-verifier.cjs --seulement …`) et les pages à contrôler à 390 et 320 px (0 erreur de console).
- Ajoute selon le cas : `securite` (saisie d'un joueur, Supabase, connexion), `accessibilite` (composant interactif, formulaire, menu), `seo` (nouvelle page, titres, liens), `perf-pwa` (images, nouveaux scripts, sw.js), `conformite` (nouvelle donnée personnelle, nouveau service tiers).
- Échec → renvoie à l'agent auteur avec le message exact ; trois allers-retours au plus, sinon arrête-toi et explique à Samuel.
- Toute fonction nouvelle ou modifiée a sa suite de tests (`scripts/verifier-<sujet>.cjs`, sur le modèle des suites existantes).

## 6. Livrer
- Commit local en français, au format du dépôt : `type(portée): résumé (lot)` avec type = feat, fix, style, perf, seo, content, test ou docs. Ajoute uniquement les fichiers du lot (`git add <fichiers>`), jamais `git add -A`.
- ROADMAP.md : coche la tâche avec la date et le hash, entrée dans le Journal (Fait ; Bloqué et pourquoi ; SQL à exécuter ; Choix pris).
- Rapport à Samuel, court : ce qui change pour le joueur, les pages à regarder (ouvrir `index.html` ou `npx serve -l 3000`), les tests passés, ce qu'il doit relire ou décider, la prochaine étape proposée.
- Quand Samuel valide : coche la validation dans ROADMAP.md (date) et commit `docs(roadmap): <lot> validé`.
- **Jamais de push** : la publication passe par la compétence `publie`, sur demande explicite de Samuel.

## Garde-fous
- Rien d'inventé : règle, statistique, prix, avis, licence, résultat de test. Inconnu → « BLOQUÉ : … » dans le Journal, ou question à Samuel.
- Données des joueurs : aucune suppression, aucune conversion, aucune migration appliquée, aucun nom ajouté à `PA_SUPABASE.activees` sans accord écrit de Samuel.
- Pas de dépendance npm dans le site, pas de framework, pas de CDN, pas de service payant ni d'API d'IA payante (feuille de route v3).
- Mobile d'abord (390 et 320 px). Une page existante améliorée plutôt qu'une nouvelle page ; pas de suppression de page sans page de renvoi.
- Rapports d'audit (sécurité) jamais commités : le dépôt est public (`scripts/logs/` s'il faut un fichier).
