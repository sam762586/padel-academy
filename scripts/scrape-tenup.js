// Récupère les tournois de padel publics de Ten'Up autour de Franqueville-Saint-Pierre
// et les exporte dans assets/data/tournois.json (+ tournois.js, copie pour l'ouverture en file://).
// Structure des pages relevée dans scripts/TENUP-API-NOTES.md.
//
// Usage (depuis le dossier scripts/) :
//   npm install && npx playwright install chromium
//   npm run tournois            -> headless
//   npm run tournois:debug      -> captures dans scripts/debug/
//   option --edge : utilise Microsoft Edge déjà installé au lieu du Chromium de Playwright
//
// Aucune connexion : la recherche et les fiches tournoi sont publiques.
// Politesse : 1 requête par seconde maximum, fiches lues uniquement pour les nouveaux ids,
// usage personnel, exécution hebdomadaire. Si Ten'Up bloque l'accès, le script s'arrête :
// on ne cherche pas à contourner la protection.

const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "assets", "data");
const OUT_JSON = path.join(OUT_DIR, "tournois.json");
const DEBUG_DIR = path.join(__dirname, "debug");
const ARGS = process.argv.slice(2);
const DEBUG = ARGS.includes("--debug");

// Point de référence (coordonnées de l'autocomplétion Ten'Up) et fenêtre de recherche
const ORIGINE = { nom: "Franqueville-Saint-Pierre", lat: 49.403115, lng: 1.180328 };
const RAYON_KM = 80;
const MOIS = 3;
const MAX_PAGES = 40;
const DELAI_MS = 1000;

const BASE = "https://tenup.fft.fr";
const BLOCAGE = /Accès temporairement restreint|comportement du navigateur nous a intrigué/i;

// ---------- utilitaires ----------
const pause = ms => new Promise(r => setTimeout(r, ms));
const iso = d => d.toISOString().slice(0, 10);
const frVersIso = s => { const m = /(\d{2})\/(\d{2})\/(\d{4})/.exec(s || ""); return m ? `${m[3]}-${m[2]}-${m[1]}` : null; };

function urlResultats(page) {
  const debut = new Date(), fin = new Date();
  fin.setMonth(fin.getMonth() + MOIS);
  const q = new URLSearchParams({
    searchType: "ville", pratique: "PADEL", ville: ORIGINE.nom, distance: RAYON_KM,
    dateDebut: iso(debut), dateFin: iso(fin), utiliserMesDonnees: "false", sort: "DISTANCE",
    page, lat: ORIGINE.lat, lng: ORIGINE.lng,
  });
  return `${BASE}/recherche/tournois/resultats?${q}`;
}

// "939 m" -> 0.9 ; "12,4 km" -> 12.4
function distanceKm(txt) {
  const m = /([\d\s]+(?:[.,]\d+)?)\s*(km|m)\b/i.exec(txt || "");
  if (!m) return null;
  const v = parseFloat(m[1].replace(/\s/g, "").replace(",", "."));
  return Math.round((m[2].toLowerCase() === "m" ? v / 1000 : v) * 10) / 10;
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

async function debug(page, nom) {
  if (!DEBUG) return;
  fs.mkdirSync(DEBUG_DIR, { recursive: true });
  await page.screenshot({ path: path.join(DEBUG_DIR, nom + ".png"), fullPage: true }).catch(() => {});
  fs.writeFileSync(path.join(DEBUG_DIR, nom + ".html"), await page.content().catch(() => ""));
}

async function verifierBlocage(page) {
  const txt = await page.locator("body").innerText().catch(() => "");
  if (BLOCAGE.test(txt)) {
    await debug(page, "blocage");
    throw new Error("Ten'Up bloque l'accès automatisé (« Accès temporairement restreint »). Arrêt : réessaie plus tard, sans insister.");
  }
}

// Ouvre une URL ; Queue-it peut faire patienter jusqu'à 60 s
async function ouvrir(page, url) {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  if (/queue-it\.net/.test(page.url())) {
    console.log("Salle d'attente Queue-it…");
    await page.waitForURL(u => u.hostname === "tenup.fft.fr", { timeout: 60000 });
  }
  await verifierBlocage(page);
}

// ---------- étape 1 : pages de résultats ----------
async function lireResultats(page) {
  const cartes = [];
  for (let n = 1; n <= MAX_PAGES; n++) {
    await ouvrir(page, urlResultats(n));
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
        distance: (a.querySelector('[data-testid="badge-global"]') || {}).textContent || null,
        dates: spans.length ? spans[spans.length - 1].textContent : "",
      };
    }));
    if (n === 1) await debug(page, "resultats-1");
    console.log(`Page ${n} : ${lot.length} tournois`);
    if (!lot.length) break;
    cartes.push(...lot);
    await pause(DELAI_MS);
  }
  return cartes;
}

function depuisCarte(c) {
  if (!c.href || !c.titre) return null;
  const id = c.href.split("/").pop();
  const d = /(\d{2}\/\d{2}\/\d{4})\s*-\s*(\d{2}\/\d{2}\/\d{4})/.exec(c.dates || "");
  const debut = d ? frVersIso(d[1]) : frVersIso(c.dates);
  if (!debut) return null;
  return {
    id,
    lien: BASE + c.href,
    nom: c.titre,
    categorie: categorie(c.titre.split(/\s+/)[0]) || categorie(c.titre),
    ville: c.ville,
    club: c.club,
    distance_km: distanceKm(c.distance),
    date_debut: debut,
    date_fin: d ? frVersIso(d[2]) : debut,
    sexes: sexesTitre(c.titre),
  };
}

// ---------- étape 2 : fiche tournoi ----------
async function lireFiche(page, t) {
  await ouvrir(page, t.lien);
  await page.locator("h1").first().waitFor({ timeout: 15000 }).catch(() => {});
  const lignes = (await page.locator("main").innerText().catch(() => ""))
    .split("\n").map(s => s.trim()).filter(Boolean);
  const apres = lib => { const i = lignes.findIndex(l => l.toLowerCase() === lib.toLowerCase()); return i >= 0 ? lignes[i + 1] || null : null; };

  // Adresse : « 12 D Rue des terres Rouges76520 ST AUBIN » (rue et code postal collés)
  const ligneAdresse = lignes.find(l => /\d{5}\s+\S/.test(l));
  const adresse = ligneAdresse ? ligneAdresse.replace(/(\D)(\d{5}\s)/, "$1, $2").trim() : null;
  const iEpreuves = lignes.findIndex(l => /^les épreuves$/i.test(l));
  const iJa = lignes.findIndex(l => /^juge-arbitre$/i.test(l));
  // Commentaire organisateur : texte libre entre le nom du JA et « Les épreuves ».
  // Le nom du JA n'est pas exporté, et on retire e-mails et téléphones (données publiées sur le site).
  const commentaire = iJa >= 0 && iEpreuves > iJa + 2
    ? lignes.slice(iJa + 2, iEpreuves).join(" ")
        .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "[e-mail sur Ten'Up]")
        .replace(/(?:\+33\s?|0)[1-9](?:[\s.-]?\d{2}){4}/g, "[téléphone sur Ten'Up]")
    : null;

  // Épreuves : chaque bloc commence par son code (DM, DD, DX…), les libellés et valeurs sont sur des lignes séparées
  const epreuves = [];
  let bloc = null;
  for (const l of iEpreuves >= 0 ? lignes.slice(iEpreuves + 1) : []) {
    if (/^(DM|DD|DX|SM|SD)$/.test(l)) { bloc = [l]; epreuves.push(bloc); }
    else if (bloc) bloc.push(l);
  }
  const lireEpreuve = b => {
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
  };
  const ep = epreuves.map(lireEpreuve);
  const limite = /(?:limite|clôture)[^\n]*?(\d{2}\/\d{2}\/\d{4})/i.exec(lignes.join("\n"));
  const sexes = ep.map(e => SEXE_CODE[e.code]).filter(Boolean);
  const horaires = apres("Horaires"), balles = apres("Balles");
  return {
    ...t,
    categorie: t.categorie || (ep.find(e => e.categorie) || {}).categorie || null,
    sexes: [...new Set(sexes.length ? sexes : t.sexes)],
    adresse,
    horaires: horaires && !/non renseigné/i.test(horaires) ? horaires : null,
    balles: balles && !/non renseigné/i.test(balles) ? balles : null,
    commentaire,
    epreuves: ep,
    limite_inscription: limite ? frVersIso(limite[1]) : null,
    fiche_lue_le: iso(new Date()),
  };
}

// ---------- main ----------
(async () => {
  let cache = {};
  // --refaire-fiches : ignore le cache et relit toutes les fiches
  if (!ARGS.includes("--refaire-fiches"))
    try { for (const t of JSON.parse(fs.readFileSync(OUT_JSON, "utf8")).tournois || []) if (t.fiche_lue_le) cache[t.id] = t; } catch {}

  const browser = await chromium.launch({ headless: !ARGS.includes("--headed"), channel: ARGS.includes("--edge") ? "msedge" : undefined });
  const page = await browser.newPage({ locale: "fr-FR" });
  try {
    // Première visite : passage Queue-it et bandeau cookies (on refuse si possible)
    await ouvrir(page, BASE + "/");
    await page.locator("#didomi-notice-disagree-button, #didomi-notice-agree-button").first().click({ timeout: 5000 }).catch(() => {});
    await pause(DELAI_MS);

    const vus = new Map();
    for (const c of await lireResultats(page)) { const t = depuisCarte(c); if (t && !vus.has(t.id)) vus.set(t.id, t); }
    console.log(`${vus.size} tournois uniques dans les résultats.`);

    const tournois = [];
    let nouveaux = 0;
    for (const t of vus.values()) {
      if (cache[t.id]) { tournois.push({ ...cache[t.id], ...t, sexes: cache[t.id].sexes, categorie: t.categorie || cache[t.id].categorie }); continue; }
      try {
        tournois.push(await lireFiche(page, t));
        if (DEBUG && nouveaux === 0) await debug(page, "fiche-1");
        nouveaux++;
      } catch (e) {
        if (BLOCAGE.test(e.message)) throw e;
        console.warn(`Fiche ${t.id} illisible (${e.message.split("\n")[0]}) : gardé sans détail.`);
        tournois.push(t);
      }
      await pause(DELAI_MS);
    }
    tournois.sort((a, b) => a.date_debut.localeCompare(b.date_debut) || (a.distance_km ?? 999) - (b.distance_km ?? 999));

    const data = {
      genere_le: new Date().toISOString(),
      origine: ORIGINE.nom,
      lat: ORIGINE.lat, lng: ORIGINE.lng,
      rayon_km: RAYON_KM,
      source: "Ten'Up (FFT)",
      tournois,
    };
    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.writeFileSync(OUT_JSON, JSON.stringify(data, null, 2) + "\n");
    // Copie en JS : fetch() ne marche pas en file://, un <script> si
    fs.writeFileSync(path.join(OUT_DIR, "tournois.js"),
      "// Généré par scripts/scrape-tenup.js, ne pas modifier à la main.\nwindow.TOURNOIS_DATA=" + JSON.stringify(data) + ";\n");
    console.log(`Écrit : assets/data/tournois.json (${tournois.length} tournois, ${nouveaux} fiches lues, ${tournois.length - nouveaux} depuis le cache).`);
  } catch (e) {
    await debug(page, "erreur");
    console.error("Échec :", e.message);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
