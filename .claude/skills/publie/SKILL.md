---
name: publie
description: "Publie apprendre-padel.fr (contrôles complets, journal à jour, push vers GitHub Pages, vérification en ligne). Uniquement quand Samuel demande explicitement de publier, pousser ou mettre en ligne ; sa demande vaut autorisation de push pour ce qui est déjà commité."
argument-hint: "[facultatif : ce qu'il faut publier]"
---
# Publier le site

Précision de Samuel : $ARGUMENTS

Le site est servi par GitHub Pages depuis la branche `main` de github.com/sam762586/padel-academy (domaine apprendre-padel.fr). Seul ce qui est commité part. Si une étape échoue : arrête-toi, explique, ne force rien (jamais de `--force`).

## 1. État
- `git branch --show-current` : si ce n'est pas `main`, demande comment intégrer avant d'aller plus loin.
- `git status --short` : les modifications non commitées NE partent PAS (elles peuvent venir d'une autre session en cours). Liste-les ; si Samuel veut les publier, elles passent d'abord par la compétence `chef`.
- `git fetch origin`, puis `git log --oneline origin/main..HEAD` (ce qui va partir) et `git log --oneline HEAD..origin/main` (ce qui manque en local). Rien à publier : dis-le et arrête-toi. En retard sur origin/main : demande avant `git pull --rebase`.

## 2. Contrôles (tous obligatoires)
1. `node scripts/tout-verifier.cjs` (toutes les suites). Code 1 : stop, envoie `testeur` diagnostiquer et rends la liste des échecs. Code 2 : dis quelles suites n'ont pas tourné et pourquoi, et demande à Samuel s'il publie quand même.
2. `node scripts/appliquer-gabarit.js --verifier` : aucune page en retard sur le gabarit.
3. Selon `git diff --stat origin/main..HEAD` : textes visibles changés → `relecteur` sur ces fichiers ; Supabase, connexion, compte ou saisies des joueurs → `securite` sur le diff ; nouvelle donnée personnelle ou nouveau service → `conformite`. Un point bloquant = pas de publication.
4. ROADMAP.md : chaque lot qui part est coché ; ajoute au Journal « Publié le JJ/MM/AAAA » avec les lots concernés, puis commit `docs(roadmap): publication du JJ/MM/AAAA`.

## 3. Publier
- Résume en 5 lignes : commits qui partent, suites passées, relectures faites.
- `git push origin main` (Claude Code demande une confirmation : c'est voulu).

## 4. Vérifier en ligne
- GitHub Pages met 1 à 3 minutes. Suis le déploiement (`gh run list --limit 3` si `gh` est installé), sinon recharge l'accueil toutes les 30 s environ, 10 fois au plus.
- Contrôle `https://apprendre-padel.fr/` et 2 ou 3 pages modifiées, avec `?v=<horodatage>` pour éviter les caches : réponse 200 et empreinte `style.css?v=…` identique à celle du `index.html` local.
- Rapport : publié (hash), pages vérifiées, et le rappel que le cache hors connexion sert la nouvelle version au chargement suivant (si une page paraît ancienne, la recharger deux fois).
