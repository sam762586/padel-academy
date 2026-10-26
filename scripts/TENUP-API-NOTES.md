# Ten'Up — cartographie de la recherche de tournois (relevé le 26/10/2026, 10 h)

Analyse faite dans Chrome sur tenup.fft.fr. Objectif : alimenter `scripts/scrape-tenup.js`.

## 1. Conclusions qui changent le script

1. **Aucune connexion nécessaire.** La recherche et la fiche tournoi sont publiques. `TENUP_EMAIL` / `TENUP_PASSWORD` ne servent à rien pour la collecte : supprimer l'étape de login du script (moins fragile, pas d'identifiants à stocker).
2. **Pas d'API JSON côté client.** Les résultats sont rendus côté serveur (Next.js / Turbopack) directement dans le HTML de `/recherche/tournois/resultats`. Aucune requête XHR/fetch de données n'est émise par la page : il n'y a donc **rien à intercepter** avec `page.on('response')`. Il faut **parser le HTML**.
3. **Salle d'attente Queue-it.** Un `curl`/`fetch` sans navigateur est redirigé en 302 vers `tenup.queue-it.net` (cookie de passage requis). Un navigateur Playwright qui charge une première page obtient le cookie, et ensuite toutes les pages passent. Garder Playwright, headless OK.
4. Les routes `public/v2/tournois`, `public/v1/tournois/formulaire` vues dans les bundles sont l'API **d'inscription** (authentifiée), pas de recherche.

## 2. URL de recherche (GET, tout dans la query string)

```
https://tenup.fft.fr/recherche/tournois/resultats
  ?searchType=ville
  &pratique=PADEL                 (TENNIS | PADEL | BEACH | PICKLE)
  &ville=Franqueville-Saint-Pierre
  &distance=80                    (km)
  &dateDebut=2026-10-26           (AAAA-MM-JJ)
  &dateFin=2027-01-26
  &utiliserMesDonnees=false
  &sort=DISTANCE
  &page=1                         (24 résultats par page)
  &lat=49.403115
  &lng=1.180328
```

- `lat`/`lng` sont ceux de la commune choisie dans l'autocomplétion (Franqueville-Saint-Pierre 76520 → 49.403115 / 1.180328). Le nom `ville` seul ne suffit pas : **toujours passer lat/lng**.
- Autres `searchType` possibles : `club`, `comite`, `ligue` (non testés).
- Exemple relevé : 80 km / 3 mois → **9 pages ≈ 200 tournois padel**.
- Pagination : bloc « Précédent 1 2 … 9 Suivant ». Boucler sur `page=N` jusqu'à ce qu'une page ne contienne plus d'`<article>`, ou lire le dernier numéro.

## 3. Structure d'une carte de résultat (`<article>`)

```html
<article>
  <div><p><a href="/tournoi/305235">P25 Soirée Cocoon Padel club</a><span></span></p></div>
  <div>
    <span><svg/>ST AUBIN CELLOVILLE</span>                 <!-- ville -->
    <span><svg/>ENTENTE TENNIS PLATEAU EST</span>          <!-- club -->
    <span data-testid="badge-global">939 m</span>          <!-- distance : "939 m" ou "12,4 km" -->
  </div>
  <span><svg/>30/10/2026 - 30/10/2026</span>               <!-- dates JJ/MM/AAAA - JJ/MM/AAAA -->
</article>
```

Sélecteurs robustes (pas de classes stables, elles sont hashées) :
- carte : `main article`
- lien + titre : `article a[href^="/tournoi/"]` → `href` (id = `305235` ou `FED_82634134`), `textContent` = titre. La **catégorie** (P25…P3000, DM250…) est le premier mot du titre.
- ville / club : les deux premiers `span` du 2e `div` (ville en MAJUSCULES, puis club).
- distance : `[data-testid="badge-global"]`.
- dates : dernier `span` de l'article, regex `(\d{2}/\d{2}/\d{4}) - (\d{2}/\d{2}/\d{4})`.
- Les titres sont souvent en MAJUSCULES : `MIXTE`, `HOMMES / FEMMES`, `SOIRÉE`, `JOURNÉE` donnent le sexe/format.

## 4. Fiche tournoi (`/tournoi/<id>`), publique

Texte structuré, libellés fixes utilisables comme ancres :
- H1 : titre ; puis `JJ/MM/AAAA - JJ/MM/AAAA` ; nom du club ; adresse (rue + `76520 VILLE`).
- `Horaires`, `Balles`, `Juge-arbitre` (nom), puis un **commentaire organisateur** libre (ex. « Inscriptions via l'appli cocoon padel ou par mail … »).
- `Les épreuves` : pour chaque épreuve, code (`DM`, `DD`, `DX`), libellé (`DOUBLE MESSIEURS SENIOR`), catégorie (`P25`), dates, `Classement : Interdit au top 30000` (= cut), `Tarif : 25,00 €`, `Tableau final : 16 places`.
- Le bouton d'inscription n'apparaît qu'une fois connecté (« Veuillez vous connecter pour pouvoir vous inscrire ») : **pas besoin de se connecter pour lire**.
- Date limite d'inscription : non affichée sur la fiche sans connexion (à confirmer connecté).

## 5. Implémentation recommandée

```js
// 1. Lancer Chromium, ouvrir une fois https://tenup.fft.fr/ (passe Queue-it, accepte/refuse cookies Didomi).
// 2. Pour page = 1..N : page.goto(URL_RESULTATS + '&page=' + page), attendre 'main article'.
//    Extraire les cartes via page.$$eval('main article', ...). Stop quand 0 article.
// 3. (Option) Pour chaque tournoi nouveau : page.goto('/tournoi/' + id), lire épreuves/tarif/cut/JA.
//    Limiter à ~1 req/s, et ne refaire les fiches que pour les ids non encore connus (cache dans tournois.json).
// 4. Écrire assets/data/tournois.json { generatedAt, origine:{lat,lng,rayon}, tournois:[...] }.
```

Champs JSON conseillés : `id, url, titre, categorie, pratique, ville, club, distanceKm, dateDebut, dateFin, epreuves:[{code,libelle,categorie,cut,tarif,tableau}], jugeArbitre, commentaire, adresse`.

Politesse : ≤ 1 requête/seconde, User-Agent de navigateur normal, exécution hebdomadaire, usage personnel.

## 6. Non vérifié
- Comportement avec `searchType=comite|ligue` et les codes attendus.
- Présence d'une date limite d'inscription sur la fiche une fois connecté.
- Stabilité de Queue-it en période de forte affluence (ouverture des inscriptions) : prévoir un délai d'attente de 60 s.
