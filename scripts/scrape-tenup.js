// Récupère tous les tournois de padel publics de Ten'Up en France (métropole + Corse)
// sur les 3 prochains mois, et les exporte pour tournois.html :
//   assets/data/tournois.json (+ .js)       index léger : un tournoi = une ligne, avec lat/lng de la commune
//   assets/data/fiches/<dep>.json (+ .js)   détails des fiches (épreuves, tarif, cut…), un fichier par département
// Structure des pages relevée dans scripts/TENUP-API-NOTES.md.
//
// Usage (depuis le dossier scripts/) :
//   npm install && npx playwright install chromium
//   npm run tournois            -> headless
//   npm run tournois:debug      -> captures dans scripts/debug/
//   --edge            : utilise Microsoft Edge déjà installé au lieu du Chromium de Playwright
//   --refaire-fiches  : ignore le cache et relit toutes les fiches
//   --max-pages N     : limite le nombre de pages de résultats (essais)
//   --departements 76,27 : ne collecte que ces départements (essais) ; les autres gardent leurs données
//
// Aucune connexion : la recherche et les fiches tournoi sont publiques.
// Politesse : 1 requête Ten'Up par seconde maximum ; les fiches déjà lues ne sont pas relues.
// La progression est enregistrée toutes les 100 fiches : un arrêt (blocage, coupure) se reprend
// en relançant simplement le script. Si Ten'Up bloque l'accès, le script s'arrête sans insister.
// Géocodage des communes : API Géoplateforme de l'IGN (publique), avec cache dans scripts/cache/.

const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "assets", "data");
const OUT_JSON = path.join(OUT_DIR, "tournois.json");
const FICHES_DIR = path.join(OUT_DIR, "fiches");
const GEO_CACHE = path.join(__dirname, "cache", "communes.json");
const DEBUG_DIR = path.join(__dirname, "debug");
const ARGS = process.argv.slice(2);
const DEBUG = ARGS.includes("--debug");
const arg = (nom, def) => { const i = ARGS.indexOf(nom); return i >= 0 ? +ARGS[i + 1] : def; };

// Recherche nationale : un cercle de 1000 km centré sur Bourges couvre la métropole et la Corse
const CENTRE = { ville: "Bourges", lat: 47.081, lng: 2.399, distance: 1000 };
const MOIS = 3;
const MAX_PAGES = arg("--max-pages", 500);
// Mode essai : liste de départements (recherche centrée sur chacun, rayon réduit, fusion avec les données existantes)
const DEPARTEMENTS = (() => { const i = ARGS.indexOf("--departements"); return i >= 0 ? (ARGS[i + 1] || "").split(",").map(s => s.trim()).filter(s => /^[0-9AB]{2,3}$/.test(s)) : null; })();
const RAYON_DEPARTEMENT = 70; // km autour du centre des tournois connus du département
const INTERVALLE_MS = 1000;
const SAUVEGARDE_TOUS = 100;

const BASE = "https://tenup.fft.fr";
const GEO = "https://data.geopf.fr/geocodage/search";
const BLOCAGE = /Accès temporairement restreint|comportement du navigateur nous a intrigué/i;

// ---------- utilitaires ----------
const pause = ms => new Promise(r => setTimeout(r, ms));
const iso = d => d.toISOString().slice(0, 10);
const frVersIso = s => { const m = /(\d{2})\/(\d{2})\/(\d{4})/.exec(s || ""); return m ? `${m[3]}-${m[2]}-${m[1]}` : null; };
const lireJson = (f, def) => { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { return def; } };

const debut = new Date(), fin = new Date();
fin.setMonth(fin.getMonth() + MOIS);
const PERIODE = { du: iso(debut), au: iso(fin) };

function urlResultats(page, centre = CENTRE) {
  const q = new URLSearchParams({
    searchType: "ville", pratique: "PADEL", ville: centre.ville, distance: centre.distance,
    dateDebut: PERIODE.du, dateFin: PERIODE.au, utiliserMesDonnees: "false", sort: "DISTANCE",
    page, lat: centre.lat, lng: centre.lng,
  });
  return `${BASE}/recherche/tournois/resultats?${q}`;
}

// Catégorie : P25…P3000, éventuellement préfixée (DM250, DX100…)
function categorie(txt) {
  const m = /\b(?:P|DM|DD|DX|SM|SD)\s?(25|50|100|250|500|1000|1500|2000|3000)\b/i.exec(txt || "");
  return m ? "P" + m[1] : null;
}

const SEXE_CODE = { DM: "messieurs", SM: "messieurs", DD: "dames", SD: "dames", DX: "mixte" };
function sexesTitre(titre) {
  const t = (titre || "").toUpperCase(), s = new Set();
  if (/MIXTE|\bDX\b/.test(t)) s.add("mixte");
  if (/HOMME|MESSIEURS|\bDM\b/.test(t)) s.add("messieurs");
  if (/FEMME|DAMES|\bDD\b/.test(t)) s.add("dames");
  return [...s];
}

// Code département depuis le code postal (Corse : 2A / 2B, outre-mer : 3 chiffres)
function departement(cp) {
  if (!/^\d{5}$/.test(cp || "")) return null;
  if (cp.startsWith("97") || cp.startsWith("98")) return cp.slice(0, 3);
  if (cp.startsWith("20")) return +cp < 20200 ? "2A" : "2B";
  return cp.slice(0, 2);
}

async function debug(page, nom) {
  if (!DEBUG) return;
  fs.mkdirSync(DEBUG_DIR, { recursive: true });
  await page.screenshot({ path: path.join(DEBUG_DIR, nom + ".png"), fullPage: true }).catch(() => {});
  fs.writeFileSync(path.join(DEBUG_DIR, nom + ".html"), await page.content().catch(() => ""));
}

class Bloque extends Error {}

// Ouvre une URL Ten'Up : au plus 1 requête par seconde, Queue-it peut faire patienter jusqu'à 60 s
let derniereRequete = 0;
async function ouvrir(page, url) {
  const attente = derniereRequete + INTERVALLE_MS - Date.now();
  if (attente > 0) await pause(attente);
  derniereRequete = Date.now();
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  if (/queue-it\.net/.test(page.url())) {
    console.log("Salle d'attente Queue-it…");
    await page.waitForURL(u => u.hostname === "tenup.fft.fr", { timeout: 60000 });
  }
  const txt = await page.locator("body").innerText().catch(() => "");
  if (BLOCAGE.test(txt)) {
    await debug(page, "blocage");
    throw new Bloque("Ten'Up bloque l'accès automatisé (« Accès temporairement restreint »). Progression enregistrée : réessaie plus tard, sans insister.");
  }
}

// ---------- géocodage des communes (IGN), avec cache ----------
const geoCache = lireJson(GEO_CACHE, {});
let geoModifie = false;
async function geocoder(cp, ville) {
  const cle = `${cp || ""}|${(ville || "").toUpperCase()}`;
  if (cle in geoCache) return geoCache[cle];
  let res = null;
  // Repli sur le nom seul : certains organisateurs saisissent un code postal erroné
  for (const q of cp ? [{ q: ville, postcode: cp }, { q: `${cp} ${ville}` }, { q: ville }] : [{ q: ville }]) {
    try {
      const r = await fetch(`${GEO}?${new URLSearchParams({ ...q, type: "municipality", limit: "1" })}`);
      if (r.status === 429) { await pause(2000); continue; }
      const f = r.ok ? (await r.json()).features?.[0] : null;
      if (f) { res = { lat: +f.geometry.coordinates[1].toFixed(5), lng: +f.geometry.coordinates[0].toFixed(5), cp: f.properties.postcode }; break; }
    } catch {}
    await pause(150);
  }
  geoCache[cle] = res;
  geoModifie = true;
  await pause(150);
  return res;
}

// ---------- étape 1 : pages de résultats ----------
async function lireResultats(page, centre = CENTRE) {
  const cartes = [];
  for (let n = 1; n <= MAX_PAGES; n++) {
    await ouvrir(page, urlResultats(n, centre));
    await page.locator("main article").first().waitFor({ timeout: 15000 }).catch(() => {});
    const lot = await page.$$eval("main article", arts => arts.map(a => {
      const lien = a.querySelector('a[href^="/tournoi/"]');
      const blocs = a.querySelectorAll(":scope > div");
      const infos = blocs[1] ? [...blocs[1].querySelectorAll(":scope > span")] : [];
      const spans = a.querySelectorAll(":scope > span");
      return {
        href: lien ? lien.getAttribute("href") : null,
        titre: lien ? lien.textContent.trim() : null,
        ville: infos[0] ? infos[0].textContent.trim() : null,
        club: infos[1] ? infos[1].textContent.trim() : null,
        dates: spans.length ? spans[spans.length - 1].textContent : "",
      };
    }));
    if (n === 1) await debug(page, "resultats-1");
    if (n % 20 === 0 || !lot.length) console.log(`Page ${n} : ${lot.length} tournois (${cartes.length + lot.length} au total)`);
    if (!lot.length) break;
    cartes.push(...lot);
  }
  return cartes;
}

function depuisCarte(c) {
  if (!c.href || !c.titre) return null;
  const d = /(\d{2}\/\d{2}\/\d{4})\s*-\s*(\d{2}\/\d{2}\/\d{4})/.exec(c.dates || "");
  const debutT = d ? frVersIso(d[1]) : frVersIso(c.dates);
  if (!debutT) return null;
  return {
    id: c.href.split("/").pop(),
    nom: c.titre,
    categorie: categorie(c.titre.split(/\s+/)[0]) || categorie(c.titre),
    club: c.club,
    ville: c.ville,
    cp: null, dep: null, lat: null, lng: null,
    date_debut: debutT,
    date_fin: d ? frVersIso(d[2]) : debutT,
    sexes: sexesTitre(c.titre),
  };
}

// ---------- étape 2 : fiche tournoi ----------
async function lireFiche(page, id) {
  await ouvrir(page, `${BASE}/tournoi/${id}`);
  await page.locator("h1").first().waitFor({ timeout: 15000 }).catch(() => {});
  const lignes = (await page.locator("main").innerText().catch(() => ""))
    .split("\n").map(s => s.trim()).filter(Boolean);
  const apres = lib => { const i = lignes.findIndex(l => l.toLowerCase() === lib.toLowerCase()); return i >= 0 ? lignes[i + 1] || null : null; };

  // Adresse : « 12 D Rue des terres Rouges76520 ST AUBIN » (rue et code postal collés)
  const ligneAdresse = lignes.find(l => /\d{5}\s+\S/.test(l));
  const adresse = ligneAdresse ? ligneAdresse.replace(/(\D)(\d{5}\s)/, "$1, $2").trim() : null;
  const mCp = ligneAdresse ? /(\d{5})\s+(.+)$/.exec(ligneAdresse) : null;
  const iEpreuves = lignes.findIndex(l => /^les épreuves$/i.test(l));
  const iJa = lignes.findIndex(l => /^juge-arbitre$/i.test(l));
  // Commentaire organisateur : texte libre entre le nom du JA et « Les épreuves ».
  // Le nom du JA n'est pas exporté, et on retire e-mails et téléphones (données publiées sur le site).
  const commentaire = iJa >= 0 && iEpreuves > iJa + 2
    ? lignes.slice(iJa + 2, iEpreuves).join(" ")
        .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "[e-mail sur Ten'Up]")
        .replace(/(?:\+33\s?|0)[1-9](?:[\s.-]?\d{2}){4}/g, "[téléphone sur Ten'Up]")
    : null;

  // Épreuves : chaque bloc commence par son code (DM, DD, DX…), libellés et valeurs sur des lignes séparées
  const blocs = [];
  let bloc = null;
  for (const l of iEpreuves >= 0 ? lignes.slice(iEpreuves + 1) : []) {
    if (/^(DM|DD|DX|SM|SD)$/.test(l)) { bloc = [l]; blocs.push(bloc); }
    else if (bloc) bloc.push(l);
  }
  const epreuves = blocs.map(b => {
    const txt = b.join(" ");
    const m = re => (re.exec(txt) || [])[1] || null;
    const tarif = m(/Tarif\s*:\s*([\d\s]+(?:,\d+)?)\s*€/i);
    const tableau = m(/Tableau final\s*:\s*(\d+)/i);
    return {
      code: b[0],
      libelle: b.find(l => /^(DOUBLE|SIMPLE)\b/i.test(l)) || null,
      categorie: categorie(b.find(l => /^P\d+$/i.test(l))),
      cut: m(/Classement\s*:\s*(.+?)(?=\s+(?:Tarif|Tableau final)\s*:|$)/i),
      tarif: tarif ? parseFloat(tarif.replace(/\s/g, "").replace(",", ".")) : null,
      tableau: tableau ? +tableau : null,
    };
  });
  const horaires = apres("Horaires"), balles = apres("Balles");
  return {
    cp: mCp ? mCp[1] : null,
    villeFiche: mCp ? mCp[2].trim() : null,
    fiche: {
      adresse,
      horaires: horaires && !/non renseigné/i.test(horaires) ? horaires : null,
      balles: balles && !/non renseigné/i.test(balles) ? balles : null,
      commentaire,
      epreuves,
    },
  };
}

// ---------- écriture ----------
function ecrireTout(tournois, fiches) {
  tournois.sort((a, b) => a.date_debut.localeCompare(b.date_debut) || a.nom.localeCompare(b.nom));
  const data = { genere_le: new Date().toISOString(), source: "Ten'Up (FFT)", periode: PERIODE, tournois };
  fs.mkdirSync(FICHES_DIR, { recursive: true });
  fs.writeFileSync(OUT_JSON, JSON.stringify(data) + "\n");
  // Copies en JS : fetch() ne marche pas en file://, un <script> si
  fs.writeFileSync(path.join(OUT_DIR, "tournois.js"),
    "// Généré par scripts/scrape-tenup.js, ne pas modifier à la main.\nwindow.TOURNOIS_DATA=" + JSON.stringify(data) + ";\n");
  const parDep = {};
  for (const t of tournois) if (t.dep && fiches[t.id]) (parDep[t.dep] = parDep[t.dep] || {})[t.id] = fiches[t.id];
  for (const f of fs.readdirSync(FICHES_DIR)) fs.unlinkSync(path.join(FICHES_DIR, f)); // départements disparus
  for (const [dep, contenu] of Object.entries(parDep)) {
    fs.writeFileSync(path.join(FICHES_DIR, dep + ".json"), JSON.stringify(contenu) + "\n");
    fs.writeFileSync(path.join(FICHES_DIR, dep + ".js"),
      `// Généré par scripts/scrape-tenup.js.\n(window.TOURNOIS_FICHES=window.TOURNOIS_FICHES||{})[${JSON.stringify(dep)}]=${JSON.stringify(contenu)};\n`);
  }
  if (geoModifie) { fs.mkdirSync(path.dirname(GEO_CACHE), { recursive: true }); fs.writeFileSync(GEO_CACHE, JSON.stringify(geoCache, null, 0) + "\n"); geoModifie = false; }
}

// ---------- main ----------
(async () => {
  // Cache : tournois déjà complets (fiche lue et département connu) dans l'export précédent
  const connus = {}, fiches = {};
  if (!ARGS.includes("--refaire-fiches")) {
    for (const t of lireJson(OUT_JSON, {}).tournois || []) if (t.dep) connus[t.id] = t;
    if (fs.existsSync(FICHES_DIR))
      for (const f of fs.readdirSync(FICHES_DIR).filter(f => f.endsWith(".json")))
        Object.assign(fiches, lireJson(path.join(FICHES_DIR, f), {}));
  }

  const browser = await chromium.launch({ headless: !ARGS.includes("--headed"), channel: ARGS.includes("--edge") ? "msedge" : undefined });
  const page = await browser.newPage({ locale: "fr-FR" });
  let tournois = [];
  try {
    // Première visite : passage Queue-it et bandeau cookies (on refuse si possible)
    await ouvrir(page, BASE + "/");
    await page.locator("#didomi-notice-disagree-button, #didomi-notice-agree-button").first().click({ timeout: 5000 }).catch(() => {});

    const vus = new Map();
    if (DEPARTEMENTS) {
      // Une recherche par département, centrée sur ses tournois déjà connus ; on ne garde que les tournois
      // dont la commune (géocodée) est dans la liste demandée
      const anciens = lireJson(OUT_JSON, {}).tournois || [];
      for (const dep of DEPARTEMENTS) {
        const pts = anciens.filter(t => t.dep === dep && typeof t.lat === "number");
        if (!pts.length) { console.warn(`Département ${dep} : aucun tournoi connu pour centrer la recherche, ignoré.`); continue; }
        const centre = { ville: dep, lat: +(pts.reduce((s, t) => s + t.lat, 0) / pts.length).toFixed(3), lng: +(pts.reduce((s, t) => s + t.lng, 0) / pts.length).toFixed(3), distance: RAYON_DEPARTEMENT };
        for (const c of await lireResultats(page, centre)) {
          const t = depuisCarte(c);
          if (!t || vus.has(t.id)) continue;
          const depT = connus[t.id] ? connus[t.id].dep : departement((await geocoder(null, t.ville) || {}).cp);
          if (DEPARTEMENTS.includes(depT)) vus.set(t.id, t);
        }
      }
      // Les autres départements gardent leurs données actuelles
      for (const t of anciens) if (t.dep && !DEPARTEMENTS.includes(t.dep) && !vus.has(t.id)) vus.set(t.id, { ...t, _garde: true });
      console.log(`Mode départements (${DEPARTEMENTS.join(", ")}) : ${[...vus.values()].filter(t => !t._garde).length} tournois trouvés.`);
    } else {
      for (const c of await lireResultats(page)) { const t = depuisCarte(c); if (t && !vus.has(t.id)) vus.set(t.id, t); }
    }
    console.log(`${vus.size} tournois uniques dans les résultats.`);

    // Les tournois déjà connus gardent cp / dep / lat / lng ; les autres seront complétés
    tournois = [...vus.values()].map(({ _garde, ...t }) => _garde ? t : connus[t.id] && fiches[t.id]
      ? { ...t, cp: connus[t.id].cp, dep: connus[t.id].dep, lat: connus[t.id].lat, lng: connus[t.id].lng, sexes: connus[t.id].sexes, categorie: t.categorie || connus[t.id].categorie }
      : t);
    const aLire = tournois.filter(t => !t.dep || !fiches[t.id]);
    console.log(`${aLire.length} fiches à lire (${tournois.length - aLire.length} déjà en cache). Durée estimée : ~${Math.ceil(aLire.length * 1.5 / 60)} min.`);

    let lues = 0;
    for (const t of aLire) {
      try {
        const r = await lireFiche(page, t.id);
        if (DEBUG && lues === 0) await debug(page, "fiche-1");
        fiches[t.id] = r.fiche;
        const sx = r.fiche.epreuves.map(e => SEXE_CODE[e.code]).filter(Boolean);
        if (sx.length) t.sexes = [...new Set(sx)];
        if (!t.categorie) t.categorie = (r.fiche.epreuves.find(e => e.categorie) || {}).categorie || null;
        const geo = await geocoder(r.cp, r.villeFiche || t.ville);
        t.cp = (geo && geo.cp) || r.cp || null; // code postal de la commune géocodée, plus fiable que la saisie
        t.dep = departement(t.cp);
        t.lat = geo ? geo.lat : null;
        t.lng = geo ? geo.lng : null;
      } catch (e) {
        if (e instanceof Bloque) throw e;
        console.warn(`Fiche ${t.id} illisible (${e.message.split("\n")[0]}) : gardé sans détail.`);
      }
      if (++lues % SAUVEGARDE_TOUS === 0) { ecrireTout(tournois, fiches); console.log(`${lues}/${aLire.length} fiches lues (progression enregistrée).`); }
    }
    ecrireTout(tournois, fiches);
    const sansGeo = tournois.filter(t => t.lat == null).length;
    console.log(`Écrit : assets/data/tournois.json (${tournois.length} tournois, ${lues} fiches lues, ${sansGeo} sans coordonnées).`);
  } catch (e) {
    if (tournois.length) ecrireTout(tournois, fiches);
    await debug(page, "erreur");
    console.error("Échec :", e.message);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
