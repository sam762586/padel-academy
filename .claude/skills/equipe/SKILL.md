---
name: equipe
description: "Affiche l'équipe d'agents d'Apprendre Padel, qui fait quoi et les commandes disponibles."
disable-model-invocation: true
---
Affiche le texte ci-dessous tel quel, sans rien ajouter et sans rien lancer.

**Commandes**
- `/chef <ta demande>` : le chef de projet découpe, confie aux agents, fait tester et livre un commit local (jamais de push).
- `/suite [tâche]` : la tâche suivante de ROADMAP.md (ou celle que tu nommes), avec un plan à valider avant de coder.
- `/bilan [zone]` : bilan complet en lecture seule (tests, SEO, vitesse, accessibilité, sécurité, conformité) et plan d'action.
- `/publie` : contrôles complets, journal, push vers GitHub Pages, vérification en ligne.
- `node scripts/tout-verifier.cjs` : toutes les suites de tests (`--seulement design,menu`, `--liste`).

**Agents** (appel direct possible : `@agent-<nom> ta demande`)

| Agent | Rôle |
|---|---|
| expert-padel | contenu padel : règles, technique, tactique, exercices, questions |
| webdesigner | visuel, CSS, composants, responsive |
| dev-front | JS des pages, outils interactifs, espace joueur |
| dev-3d | simulateur 3D, scénarios, labo, quiz 3D |
| backend-supabase | tables, migrations SQL, RLS (écrit, n'exécute jamais) |
| robot-tournois | robot Ten'Up, données et pages tournois |
| veille-materiel | base des raquettes |
| medias | photos, WebP, licences des images |
| seo | titres, descriptions, maillage, sitemap |
| perf-pwa | vitesse, poids, cache hors connexion |
| accessibilite | clavier, focus, lecteurs d'écran, contrastes |
| conformite | RGPD, CNIL, mentions légales, confidentialité |
| securite | audit de sécurité, lecture seule |
| testeur | lance et diagnostique les tests, lecture seule |
| relecteur | orthographe et typographie, lecture seule |
