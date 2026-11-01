# Apprendre Padel

Site d'apprentissage du padel (français) : coups, tactique, tutos interactifs, test de niveau, plan 8 semaines, règles, lexique, compétition et sélecteur de raquette.

## Lancer
Aucune installation. Ouvrir `index.html` dans un navigateur, ou servir le dossier :
```
python -m http.server 8080
```
puis http://localhost:8080

## Continuer avec Claude Code
Dans ce dossier :
```
claude
```
Les agents spécialisés sont dans `.claude/agents/` :
- `@agent-webdesigner` — design, CSS, responsive, identité visuelle
- `@agent-dev-front` — JS, nouvelles fonctionnalités, interactivité
- `@agent-expert-padel` — contenu technique et tactique, exactitude padel
- `@agent-veille-materiel` — mise à jour de la base de raquettes et des prix
- `@agent-relecteur` — relecture orthographe/ton/cohérence, lecture seule

Exemples :
- « @agent-expert-padel ajoute une fiche sur le smash par 4 dans technique.html »
- « @agent-veille-materiel mets à jour les prix des raquettes Bullpadel 2026 »
- « @agent-webdesigner propose une version claire du thème »

## Déployer
Dossier statique : glisser-déposer sur Netlify Drop, ou GitHub Pages, ou n'importe quel hébergeur.

## Mise à jour automatique (GitHub Actions)
Les deux mises à jour tournent sur GitHub, PC éteint (dépôt public : gratuit, aucun secret à créer). Les workflows sont dans `.github/workflows/` ; ils ne se lancent ni sur un push ni sur une pull request, seulement à l'heure prévue ou à la main.

| Workflow | Quand | Ce qu'il fait |
|---|---|---|
| `actus-pro.yml` | chaque jour à 3 h UTC (4 h ou 5 h à Paris) | `scrape-pro.js` → `generer-pro.js` → `generer-pages.js` (fiches passées « Terminé », `prochains/` à la date du jour), commit « Actus pro : mise à jour du AAAA-MM-JJ » |
| `tournois.yml` | chaque lundi à 4 h UTC (5 h ou 6 h à Paris), environ 4 à 5 h de collecte | `npm ci` + Chromium de Playwright → `scrape-tenup.js` → `verifier-json.js` → `generer-pages.js`, commit « Tournois : mise à jour hebdomadaire du AAAA-MM-JJ » |

- Les commits sont signés `github-actions[bot]` et poussés sur `main` (le site se met à jour tout seul). Si rien n'a changé, il n'y a pas de commit.
- Les deux partagent le groupe `maj-site` : ils passent l'un après l'autre, jamais en même temps.
- Si le robot échoue (Ten'Up bloque, Queue-it, format changé), le job est en échec, rien n'est commité et GitHub envoie un e-mail à Samuel.
- **Lancer à la main** : onglet Actions du dépôt > choisir le workflow > Run workflow. Pour `tournois.yml`, le champ « departements » (ex. `76,27`) fait un essai : aucun push, seulement un résumé et un artefact `essai-tournois`.
- **Voir les échecs** : onglet Actions, les exécutions en rouge ; cliquer sur l'étape en échec pour lire le journal.
- Un `git pull` sur le PC est nécessaire avant de retravailler : les robots ajoutent des commits sur `main`.

## Secours manuel sur le PC
`scripts\maj-hebdo.bat` (tournois, le lundi) et `scripts\maj-quotidienne.bat` (actus pro) font la même chose sur le PC, avec Microsoft Edge. Si les workflows tournent, désactive les tâches planifiées Windows pour éviter les doublons.

`scripts\maj-hebdo.bat` enchaîne :
1. le robot Ten'Up (`scripts/scrape-tenup.js --edge`, 1 requête par seconde, reprise automatique après une coupure) ;
2. la vérification des JSON de `assets/data` ;
3. la génération des pages (`scripts/generer-pages.js` : `tournoi/`, `tournois/`, `sitemap.xml`, `assets/data/prochains/`) ;
3 bis. la génération des fichiers SQL de la table Supabase `tournois_ref` (`scripts/generer-tournois-ref.js` → `supabase/donnees/tournois-ref-NN.sql`, ignorés par git, aucun envoi) : à coller ensuite dans le SQL Editor, voir `supabase/LISEZMOI.md` (« Stabilisation S2 ») ;
4. un commit local des seules données et pages générées ;
5. la **publication automatique** (`git push origin HEAD:main`), seulement si ce commit est le seul en avance sur `origin/main` et que rien n'est en retard (`git fetch` au début, comparaison avant le push, jamais de `--force`). S'il reste des commits locaux non publiés ou si la branche est en retard, il n'y a **pas de push** : le journal le dit et Samuel publie avec « publie ». Les tournois passés sont masqués chaque jour par le navigateur, sans attendre la mise à jour du lundi.

Journal : `scripts/logs/maj-hebdo.log`. Essai sur quelques départements : `scripts\maj-hebdo.bat --departements 76,27` (les autres départements gardent leurs données ; le sitemap n'est pas modifié).

**Planifier chaque lundi à 6 h** avec le Planificateur de tâches Windows :
- automatiquement : clic droit sur `scripts\installer-maj-tournois.ps1` > « Exécuter avec PowerShell » (crée la tâche « Apprendre Padel - Tournois » et supprime l'ancienne tâche « Padel Academy - Tournois » de 4 h) ;
- ou à la main : Planificateur de tâches > Créer une tâche > Déclencheur « Hebdomadaire, lundi, 6:00 » > Action « Démarrer un programme » : `cmd.exe`, arguments `/c "C:\cheminers\padel-academy\scripts\maj-hebdo.bat"`, dossier de départ : le dossier du site > Paramètres : cocher « Exécuter la tâche dès que possible si un démarrage planifié est manqué ».

Le PC doit être allumé et Microsoft Edge installé. Pour tout générer d'un coup (toute la France) : `node scripts/generer-pages.js --tout`.

### Actus pro (secours sur le PC)
`scriptsmaj-quotidienne.bat` refait la mise à jour quotidienne des actus pro sur le PC (robot Premier Padel, `actus-pro.html`, commit des fichiers concernés). Journal : `scripts/logs/maj-quotidienne.log`. Le workflow `actus-pro.yml` fait la même chose chaque jour sur GitHub.

