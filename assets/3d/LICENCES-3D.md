# Simulateur 3D : sources et licences

Tout ce qui est utilisé par `simulateur-3d.html` est listé ici. Aucun service ni API payante, aucun abonnement :
les fichiers sont dans le dépôt et servis par le site.

| Fichier | Source | Auteur | Licence | Attribution |
|---|---|---|---|---|
| `assets/3d/modeles/joueur.glb` | Universal Animation Library (Standard), fichier `AnimationLibrary_Godot_Standard.glb` de l'archive https://opengameart.org/sites/default/files/universal_animation_librarystandard.zip | Quaternius (https://quaternius.com) | CC0 1.0 Universal (domaine public), d'après le `License.txt` de l'archive : « CC0 1.0 Universal … Models by @Quaternius » | Non requise ; créditée sur la page par courtoisie |
| `assets/3d/vendor/three.module.min.js`, `assets/3d/vendor/three-addons.min.js` | three.js 0.186.1 (paquet npm `three`), réduits avec esbuild 0.24.0. Le second regroupe `GLTFLoader`, `OrbitControls` et `SkeletonUtils` (`examples/jsm`) | three.js authors | MIT, « Copyright © 2010-2026 three.js authors » | Mention de licence ci-dessous |
| Textures (sol, grillage, filet) | Dessinées par le code (`assets/js/p3d/terrain.js`), aucune image | Apprendre Padel | Celle du site | — |
| Dimensions du terrain, de la balle et de la raquette | FIP, *Rules of Padel*, application au 01.01.2026 : https://www.padelfip.com/wp-content/uploads/2025/12/FIP_Rules-of-Padel.pdf | Fédération internationale de padel | Données réglementaires (pas de reprise de texte) | Citée sur la page |

## Modèle des joueurs : ce qui a été modifié

Le fichier d'origine (6,6 Mo, 46 animations) a été allégé avec `@gltf-transform` 4.1.1 : seules cinq animations sont
gardées (`Idle_Loop`, `Walk_Loop`, `Jog_Fwd_Loop`, `Sprint_Loop`, `Crouch_Idle_Loop`), rééchantillonnées, sans données
orphelines. Résultat : 704 Ko (328 Ko compressé). Le maillage, le squelette (53 os) et les matériaux ne sont pas modifiés ;
la couleur d'équipe est appliquée au chargement.

Le modèle ne contient **aucune animation de padel**. Les gestes (lob, bandeja, sortie de vitre, volée) sont posés par le
code sur le bras droit et les épaules (`assets/js/p3d/gestes.js`), avec le statut « simplifié ». Les gestes non
construits ont le statut « à venir » et le joueur reste en position d'attente : l'interface le signale.

## Licence MIT de three.js

```
The MIT License

Copyright © 2010-2026 three.js authors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```

## Ajouter un asset

Ne jamais ajouter un modèle, une animation ou une texture sans avoir vérifié sa licence (CC0, CC-BY avec attribution,
MIT…) et l'avoir inscrit dans ce tableau. Mixamo, par exemple, n'autorise pas la redistribution des fichiers bruts :
à exclure.
