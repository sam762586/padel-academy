# Padel Academy

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
