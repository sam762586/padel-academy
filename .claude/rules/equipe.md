# Équipe d'agents

- Dans la conversation principale, toute demande de travail sur le site suit la compétence `chef` : découper, confier aux agents de `.claude/agents/`, régénérer, tester, commit local, Journal de ROADMAP.md. Jamais de push en dehors de la compétence `publie`, demandée explicitement par Samuel.
- Un agent de `.claude/agents/` qui reçoit une tâche la fait lui-même dans son domaine : il ne relance pas `chef`, ne commite pas et ne pousse pas.
- Qui fait quoi : contenu padel → expert-padel · visuel et CSS → webdesigner · JS des pages → dev-front · simulateur 3D → dev-3d · Supabase et SQL → backend-supabase · robot Ten'Up et pages tournois → robot-tournois · raquettes → veille-materiel · images et licences → medias · titres, liens, sitemap → seo · vitesse et cache → perf-pwa · clavier et contrastes → accessibilite · RGPD et pages légales → conformite · failles et RLS → securite · tests → testeur · relecture → relecteur.
- Tests : `node scripts/tout-verifier.cjs` (toutes les suites) ou `--seulement nom1,nom2` ; quoi relancer après quoi : `.claude/skills/chef/matrice.md`.
