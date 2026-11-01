# Premier Padel — cartographie des données du circuit pro (relevé le 01/11/2026)

Analyse faite avec `curl` sur premierpadel.com. Objectif : alimenter `scripts/scrape-pro.js` (-> `assets/data/pro.json`).

## 1. Conclusions qui changent le script

1. **Aucune connexion nécessaire.** Les pages tournois sont rendues côté client (Next.js) : le HTML ne contient **ni résultats ni liste** (juste `initialTournamentStrip`, le prochain tournoi). Les données viennent d'une **API JSON publique** appelée par le site : `https://api-prod.premierpadel.com/api/` (axios, `withCredentials`, pas de jeton). Trouvée dans les bundles `_next/static/chunks/*.js` de la page `/en/tournaments-detail/<slug>`.
2. **Pas de captcha, pas de redirection.** Un `fetch` Node avec un User-Agent de navigateur normal et `Origin`/`Referer` de premierpadel.com suffit.
3. **Source retenue : premierpadel.com uniquement.** padelfip.com est **exclu, même en secours** : ses CGU interdisent expressément « data mining, robots or similar data gathering or extraction methods » (même si son robots.txt autorise). Les CGU de premierpadel.com ne contiennent qu'une notice de confidentialité, aucune clause contre l'extraction (vérifié par Samuel dans un navigateur le 01/11/2026).
4. Si l'API répond 401/403/429, ou exige une connexion, ou si les conditions changent : s'arrêter et prévenir Samuel (le script sort en code 1 sans rien écrire).

## 2. Points d'accès utiles (tous en POST JSON, `Content-Type: application/json`)

| Route | Corps | Rôle |
|---|---|---|
| `/tournament/getTournaments` | `{"year":2026,"type":"P1"}` | **Toute la saison** (le `type` est obligatoire mais ne filtre pas : renvoie Major, P1, P2 et Finals). 25 tournois en 2026. |
| `/tournament/getTournamentMatchDraws` | `{"slug":"kuwait-p1-2","draw_type":"MD"}` (`MD` hommes, `WD` femmes) | Tableau final : `rounds`, `contestants`, `matches`. **Source des résultats.** |
| `/tournament/getTournamentMatches` | `{"slug":"..."}` | Matches par jour et par court (prénoms, noms, classements) ; ne donne qu'un jour à la fois : non utilisé. |
| `/tournament/getTournamentStrip` (GET) | — | Prochain tournoi (même contenu que `initialTournamentStrip`). |

Autres routes vues dans les bundles (non utilisées) : `getLiveTournament`, `getTournamentInfo`, `getTournamentPlayersV2`, `getTournamentDetails`, `getPadelZone`.

Erreurs de validation : HTTP 400 avec `{"status":false,"message":"\"slug\" is required, ..."}` (utile pour deviner les paramètres : l'API les liste).

## 3. Liste des tournois (`getTournaments`)

`data[]`, un objet par tournoi. Champs utilisés : `id`, `slug`, `organization` (`FIP`), `year`, `type` (`MAJOR`, `P1`, `P2`, `FINALS`), `name`, `city` (MAJUSCULES, parfois avec espace final), `country` (anglais), `start_date_utc` / `end_date_utc` (`2026-10-23T00:00:00.000Z`, on garde la date), `status` : `F` (terminé), `N` (à venir) ; le code d'un tournoi en cours n'a pas été observé (le script traite tout autre code comme `en_cours`). `gender` vaut `C` (hommes et femmes ensemble).

Champs ignorés volontairement (images, logos, liens billetterie, sponsors) : `image`, `flag_url`, `logo_image_url`, `sponsor_*`, `ticket_url`, `broadcast_*`, `padel_zone_*`…

Pièges :
- le `slug` n'est pas toujours le nom : `kuwait-p1-2` est le **Kuwait Major** ; `dubai-p1-3`, `milano-p1-2`…
- le nom contient parfois des doubles espaces (`CUPRA ROTTERDAM  PREMIER PADEL P2`).

## 4. Tableau (`getTournamentMatchDraws`)

```json
{ "status": true, "data": {
  "rounds": [{"name":"R64"},{"name":"R32"},{"name":"R16"},{"name":"Quarterfinals"},{"name":"Semifinals"},{"name":"Final"}],
  "contestants": { "14945": { "players": [ {"title":"Coello","rank":1,"nationality":"<image>"}, {"title":"Tapia"} ] } },
  "matches": [ { "roundIndex":5, "order":0, "sides":[
      {"contestantId":"14945","isWinner":true, "scores":[{"mainScore":"6","isWinner":true},{"mainScore":"6","isWinner":true}]},
      {"contestantId":"14943","isWinner":false,"scores":[{"mainScore":"1","isWinner":false},{"mainScore":"1","isWinner":false}]} ] } ] } }
```

- La finale est le match dont `roundIndex` = indice de la manche nommée `Final`. Les demi-finales sont `Semifinals` (non collectées pour l'instant).
- `scores[i].mainScore` = jeux du set `i` ; tie-breaks non repris (le « 7-6 » reste « 7-6 »). Le script écrit le score du **point de vue du vainqueur** (`3-6 6-1 6-1` : le vainqueur a perdu le premier set).
- **Seuls les noms de famille** sont dans ce tableau (`title`). Les prénoms n'existent que dans `getTournamentMatches` (un jour par appel) : non repris.
- **Tirage absent** : `{"status":true,"message":"Draws not found","data":{}}` (cas du Qatar Major 2026 : tournoi terminé sans tableau). Le script met `null`, il ne devine rien.
- Tournoi en cours : tableau partiel, la finale n'a pas de vainqueur -> `null` tant qu'elle n'est pas jouée.

## 5. Politesse

- 1 requête par seconde au plus (pause de 1,1 s) ; première exécution : 1 + 2 × (tournois terminés) requêtes, soit environ 45 en 2026.
- Les tournois terminés dont les résultats sont déjà dans `pro.json` ne sont pas redemandés : un passage quotidien normal fait 1 requête + 2 par tournoi qui vient de se terminer.
- Une exécution par jour, saison en cours seulement (pas d'archive).
- User-Agent de navigateur ordinaire (demande de Samuel) ; aucune connexion, aucun cookie.

## 6. Tests

`node scripts/verifier-pro.cjs` : fixtures réelles allégées dans `scripts/fixtures/pro/` (sans images), serveur local ; vérifie l'analyse, l'écriture atomique et les échecs (format changé, 500, 429, serveur injoignable -> code 1, fichier conservé).
