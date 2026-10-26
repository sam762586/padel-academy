#!/usr/bin/env node
/* Conversion unique : GeoJSON des départements -> tracés SVG pour assets/js/carte-france.js.
   Usage : node scripts/build-carte-france.js <departements.geojson> [sortie.js]
   Source du GeoJSON : https://github.com/gregoiredavid/france-geojson (departements-version-simplifiee.geojson),
   données IGN / Etalab, licence ouverte 2.0. Aucune dépendance npm.
   Projection : conique conforme de Lambert (parallèles 44° et 49°, origine 46,5°N 3°E), proche de la Lambert-93.
   Seuls la métropole et la Corse sont gardées. Les tracés sont simplifiés (Douglas-Peucker) puis arrondis. */
const fs = require("fs");
const path = require("path");

const entree = process.argv[2];
const sortie = process.argv[3] || path.join(__dirname, "..", "assets", "js", "carte-france.js");
if (!entree) { console.error("Usage : node scripts/build-carte-france.js <departements.geojson> [sortie.js]"); process.exit(1); }

const LARGEUR = 600;      // largeur du viewBox (unités SVG)
const TOLERANCE = 0.55;   // tolérance de simplification (unités SVG)
const MARGE = 6;

// ----- Projection de Lambert (conique conforme, sphère) -----
const rad = Math.PI / 180;
const phi1 = 44 * rad, phi2 = 49 * rad, phi0 = 46.5 * rad, lam0 = 3 * rad;
const n = Math.log(Math.cos(phi1) / Math.cos(phi2)) / Math.log(Math.tan(Math.PI / 4 + phi2 / 2) / Math.tan(Math.PI / 4 + phi1 / 2));
const F = Math.cos(phi1) * Math.pow(Math.tan(Math.PI / 4 + phi1 / 2), n) / n;
const rho = phi => F / Math.pow(Math.tan(Math.PI / 4 + phi / 2), n);
const rho0 = rho(phi0);
function projeter(lng, lat) {
  const r = rho(lat * rad), theta = n * (lng * rad - lam0);
  return [r * Math.sin(theta), rho0 - r * Math.cos(theta)]; // y vers le haut
}

// ----- Douglas-Peucker -----
function simplifier(points, tol) {
  if (points.length < 3) return points;
  const garde = new Uint8Array(points.length); garde[0] = garde[points.length - 1] = 1;
  const pile = [[0, points.length - 1]];
  while (pile.length) {
    const [a, b] = pile.pop();
    let max = 0, idx = -1;
    const [ax, ay] = points[a], [bx, by] = points[b];
    const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1e-9;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs(dy * points[i][0] - dx * points[i][1] + bx * ay - by * ax) / len;
      if (d > max) { max = d; idx = i; }
    }
    if (max > tol && idx > 0) { garde[idx] = 1; pile.push([a, idx], [idx, b]); }
  }
  return points.filter((_, i) => garde[i]);
}

const geo = JSON.parse(fs.readFileSync(entree, "utf8"));
const gardes = geo.features.filter(f => /^(0[1-9]|[1-8]\d|9[0-5]|2[AB])$/.test(f.properties.code));

// Projection brute pour calculer l'emprise globale
const brut = gardes.map(f => {
  const polys = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
  return { code: f.properties.code, nom: f.properties.nom, polys: polys.map(p => p.map(anneau => anneau.map(([x, y]) => projeter(x, y)))) };
});
let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
brut.forEach(d => d.polys.forEach(p => p.forEach(a => a.forEach(([x, y]) => { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }))));
const echelle = (LARGEUR - 2 * MARGE) / (maxX - minX);
const hauteur = Math.ceil((maxY - minY) * echelle + 2 * MARGE);
const versEcran = ([x, y]) => [(x - minX) * echelle + MARGE, (maxY - y) * echelle + MARGE];

const arrondi = v => Math.round(v * 10) / 10;
function chemin(d) {
  let s = "";
  d.polys.forEach(p => p.forEach((anneau, idx) => {
    // On ignore les trous (aucun dans les départements) et les îlots minuscules
    if (idx > 0) return;
    // Anneau fermé : on le coupe en deux pour que Douglas-Peucker ait une corde non nulle
    const brutEcran = anneau.map(versEcran), milieu = Math.floor(brutEcran.length / 2);
    const moitie1 = simplifier(brutEcran.slice(0, milieu + 1), TOLERANCE), moitie2 = simplifier(brutEcran.slice(milieu), TOLERANCE);
    let pts = moitie1.concat(moitie2.slice(1)).map(([x, y]) => [arrondi(x), arrondi(y)]);
    // Supprime les doublons consécutifs après arrondi
    pts = pts.filter((q, i) => i === 0 || q[0] !== pts[i - 1][0] || q[1] !== pts[i - 1][1]);
    if (pts.length < 4) return;
    pts.pop(); // dernier point = premier (fermeture par Z)
    // Commandes relatives : M absolu, puis l dx dy (plus compact)
    let prev = pts[0];
    s += "M" + prev[0] + " " + prev[1];
    let reste = "";
    for (let i = 1; i < pts.length; i++) {
      const dx = arrondi(pts[i][0] - prev[0]), dy = arrondi(pts[i][1] - prev[1]);
      reste += (reste && dy >= 0 ? "" : "") + (i === 1 ? "l" : " ") + dx + (dy < 0 ? "" : " ") + dy;
      prev = pts[i];
    }
    s += reste.replace(/ -/g, "-") + "z";
  }));
  return s;
}

const donnees = brut.sort((a, b) => a.code.localeCompare(b.code)).map(d => ({ code: d.code, nom: d.nom, d: chemin(d) }));
const lignes = donnees.map(d => " " + JSON.stringify(d));
const contenu =
`/* CARTE DE FRANCE : tracés SVG des départements de France métropolitaine et de la Corse.
   Source : France GeoJSON de Grégoire David (departements-version-simplifiee.geojson), d'après les données IGN / Etalab,
   licence ouverte Etalab 2.0. Projection de Lambert approximée, tracés simplifiés et arrondis.
   Fichier généré par scripts/build-carte-france.js : ne pas modifier à la main.
   viewBox : 0 0 ${LARGEUR} ${hauteur}. Les chemins sont en commandes relatives (l) après un M absolu. */
const CARTE_FRANCE_VIEWBOX=[${LARGEUR},${hauteur}];
const CARTE_FRANCE=[
${lignes.join(",\n")}
];
`;
fs.writeFileSync(sortie, contenu);
console.log(donnees.length + " départements, " + Math.round(contenu.length / 1024) + " Ko, viewBox " + LARGEUR + "x" + hauteur);
