// Récupère les tournois de padel Ten'Up autour de Franqueville-Saint-Pierre
// et les exporte dans assets/data/tournois.json (+ tournois.js pour l'ouverture en file://).
//
// Usage (depuis le dossier scripts/) :
//   npm install && npx playwright install chromium
//   npm run tournois            -> headless
//   npm run tournois:debug      -> navigateur visible + captures dans scripts/debug/
//
// Identifiants : scripts/.env (TENUP_EMAIL, TENUP_PASSWORD), jamais commité.
// Ten'Up est une application dynamique : on capte d'abord les réponses JSON de son API
// pendant la recherche, et on lit les cartes de résultats en secours. Les sélecteurs
// sont regroupés dans SEL pour pouvoir les ajuster après un premier passage --debug.

const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "assets", "data");
const DEBUG_DIR = path.join(__dirname, "debug");
const ARGS = process.argv.slice(2);
const DEBUG = ARGS.includes("--debug");
const HEADED = ARGS.includes("--headed");

// Point de référence et rayon
const ORIGINE = { nom: "Franqueville-Saint-Pierre", cp: "76520", lat: 49.4019, lng: 1.1653 };
const RAYON_KM = 80;
const MAX_PAGES = 30;

const URL_ACCUEIL = "https://tenup.fft.fr/";
const URL_RECHERCHE = "https://tenup.fft.fr/recherche/tournois";

// Sélecteurs (à ajuster si Ten'Up change son interface)
const SEL = {
  cookies: "#didomi-notice-agree-button, button:has-text('Accepter'), button:has-text('Tout accepter')",
  lienConnexion: "a:has-text('Se connecter'), button:has-text('Se connecter'), a:has-text('Connexion')",
  champEmail: "input[type=email], input[name=username], input#username, input[name=email]",
  champMdp: "input[type=password]",
  boutonValider: "button[type=submit], input[type=submit]",
  champLieu: "input[placeholder*='ville' i], input[placeholder*='lieu' i], input[placeholder*='adresse' i]",
  suggestionLieu: "[role=option], .autocomplete li, .ui-menu-item",
  boutonRechercher: "button:has-text('Rechercher'), input[type=submit][value*='Rechercher' i]",
  carte: "[class*='tournoi' i][class*='card' i], .result-tournament, article",
  pageSuivante: "a:has-text('Suivant'), button:has-text('Voir plus'), button:has-text('Afficher plus'), a[rel=next]",
};

// ---------- utilitaires ----------
function chargerEnv() {
  const f = path.join(__dirname, ".env");
  if (!fs.existsSync(f)) throw new Error("scripts/.env introuvable : copie .env.example en .env et remplis-le.");
  process.loadEnvFile(f);
  const { TENUP_EMAIL, TENUP_PASSWORD } = process.env;
  if (!TENUP_EMAIL || !TENUP_PASSWORD) throw new Error("TENUP_EMAIL ou TENUP_PASSWORD vide dans scripts/.env.");
  return { email: TENUP_EMAIL, mdp: TENUP_PASSWORD };
}

function km(lat1, lng1, lat2, lng2) {
  const r = Math.PI / 180, R = 6371;
  const a = Math.sin((lat2 - lat1) * r / 2) ** 2 +
    Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin((lng2 - lng1) * r / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(a)));
}

// Premier champ non vide parmi plusieurs noms possibles (recherche aussi un niveau en dessous)
function champ(o, noms) {
  for (const n of noms) {
    const v = n.split(".").reduce((x, k) => (x == null ? x : x[k]), o);
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return null;
}

function isoDate(v) {
  if (!v) return null;
  if (typeof v === "number") return new Date(v).toISOString().slice(0, 10);
  const s = String(v).trim();
  const fr = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (fr) return `${fr[3]}-${fr[2].padStart(2, "0")}-${fr[1].padStart(2, "0")}`;
  const iso = s.match(/\d{4}-\d{2}-\d{2}/);
  return iso ? iso[0] : null;
}

function sexe(v) {
  const s = String(v || "").toLowerCase();
  if (/mixte|mx/.test(s)) return "mixte";
  if (/dame|femme|f\b|^f$|sd|dd/.test(s)) return "dames";
  if (/homme|messieurs|h\b|^h$|^m$|sm|dm/.test(s)) return "messieurs";
  return s ? String(v) : null;
}

function categorie(v) {
  const m = String(v || "").toUpperCase().match(/P\s?(25|50|100|250|500|1000|1500|2000)\b/);
  return m ? "P" + m[1] : (v ? String(v) : null);
}

// Transforme un objet brut de l'API (structure inconnue a priori) en tournoi normalisé
function depuisApi(o) {
  const nom = champ(o, ["libelle", "nom", "name", "titre", "label"]);
  const debut = isoDate(champ(o, ["dateDebut", "date_debut", "startDate", "dateDeDebut", "dates.debut"]));
  if (!nom || !debut) return null;
  const lat = +champ(o, ["latitude", "lat", "club.latitude", "installation.latitude", "adresse.latitude"]);
  const lng = +champ(o, ["longitude", "lng", "lon", "club.longitude", "installation.longitude", "adresse.longitude"]);
  const distApi = champ(o, ["distance", "distanceKm"]);
  const id = champ(o, ["id", "idTournoi", "code", "homologation"]);
  const lien = champ(o, ["url", "lien", "link"]);
  return {
    nom: String(nom).trim(),
    club: champ(o, ["club.nom", "club.libelle", "nomClub", "club", "organisateur.nom"]),
    ville: champ(o, ["ville", "club.ville", "installation.ville", "adresse.ville", "commune"]),
    distance_km: isFinite(lat) && isFinite(lng) && lat && lng ? km(ORIGINE.lat, ORIGINE.lng, lat, lng)
      : (distApi != null ? Math.round(parseFloat(distApi)) : null),
    categorie: categorie(champ(o, ["categorie", "niveau", "categorieTournoi", "type", "epreuves.0.categorie"])),
    date_debut: debut,
    date_fin: isoDate(champ(o, ["dateFin", "date_fin", "endDate", "dates.fin"])) || debut,
    sexe: sexe(champ(o, ["sexe", "genre", "nature", "epreuves.0.sexe", "typeEpreuve"])),
    limite_inscription: isoDate(champ(o, ["dateLimiteInscription", "dateFinInscription", "limiteInscription", "dateCloture"])),
    lien: lien ? new URL(lien, URL_ACCUEIL).href : (id ? `${URL_ACCUEIL}tournoi/${id}` : URL_RECHERCHE),
  };
}

// Parcourt récursivement une réponse JSON et garde les objets qui ressemblent à des tournois
function extraireApi(json, acc) {
  if (Array.isArray(json)) json.forEach(x => extraireApi(x, acc));
  else if (json && typeof json === "object") {
    const t = depuisApi(json);
    if (t) acc.push(t);
    else Object.values(json).forEach(v => extraireApi(v, acc));
  }
  return acc;
}

async function debug(page, nom) {
  if (!DEBUG) return;
  fs.mkdirSync(DEBUG_DIR, { recursive: true });
  await page.screenshot({ path: path.join(DEBUG_DIR, nom + ".png"), fullPage: true }).catch(() => {});
  fs.writeFileSync(path.join(DEBUG_DIR, nom + ".html"), await page.content().catch(() => ""));
}

async function cliquerSiPresent(page, sel, ms = 3000) {
  const el = page.locator(sel).first();
  try { await el.waitFor({ state: "visible", timeout: ms }); await el.click(); return true; } catch { return false; }
}

// ---------- étapes ----------
async function connexion(page, { email, mdp }) {
  await page.goto(URL_ACCUEIL, { waitUntil: "domcontentloaded" });
  await cliquerSiPresent(page, SEL.cookies);
  if (!(await cliquerSiPresent(page, SEL.lienConnexion, 8000))) throw new Error("Lien « Se connecter » introuvable (voir SEL.lienConnexion).");
  await page.locator(SEL.champEmail).first().waitFor({ timeout: 20000 });
  await cliquerSiPresent(page, SEL.cookies, 1500);
  await page.locator(SEL.champEmail).first().fill(email);
  // Certains écrans demandent l'e-mail puis le mot de passe sur une seconde étape
  if (!(await page.locator(SEL.champMdp).first().isVisible().catch(() => false))) await page.locator(SEL.boutonValider).first().click();
  await page.locator(SEL.champMdp).first().fill(mdp);
  await debug(page, "1-connexion");
  await Promise.all([page.waitForLoadState("networkidle").catch(() => {}), page.locator(SEL.boutonValider).first().click()]);
  await page.waitForURL(u => u.hostname.startsWith("tenup."), { timeout: 30000 })
    .catch(() => { throw new Error("Connexion refusée ou bloquée (captcha, double authentification ?). Relance avec --headed --debug."); });
}

async function rechercher(page, captes) {
  page.on("response", async r => {
    const ct = r.headers()["content-type"] || "";
    if (!ct.includes("json") || !/tournoi|tournament|competition|recherche/i.test(r.url())) return;
    try {
      const json = await r.json();
      captes.push(...extraireApi(json, []));
      if (DEBUG) {
        fs.mkdirSync(DEBUG_DIR, { recursive: true });
        fs.appendFileSync(path.join(DEBUG_DIR, "api.jsonl"), JSON.stringify({ url: r.url(), json }) + "\n");
      }
    } catch {}
  });

  await page.goto(URL_RECHERCHE, { waitUntil: "domcontentloaded" });
  await cliquerSiPresent(page, SEL.cookies, 1500);
  await page.getByText(/padel/i).first().click({ timeout: 8000 }).catch(() => console.warn("Filtre « Padel » non trouvé : à vérifier en --debug."));

  const lieu = page.locator(SEL.champLieu).first();
  await lieu.fill(`${ORIGINE.nom}`, { timeout: 10000 });
  if (!(await cliquerSiPresent(page, SEL.suggestionLieu, 5000))) await lieu.press("Enter");

  // Rayon : liste déroulante ou curseur selon l'interface
  const rayon = page.locator("select:near(:text('km'))").first();
  if (await rayon.count()) {
    const opts = await rayon.locator("option").allInnerTexts();
    const choix = opts.find(o => o.includes(String(RAYON_KM)));
    if (choix) await rayon.selectOption({ label: choix }).catch(() => {});
    else console.warn(`Rayon ${RAYON_KM} km absent de la liste (${opts.join(", ")}) : filtrage par distance après coup.`);
  }
  await debug(page, "2-filtres");
  await cliquerSiPresent(page, SEL.boutonRechercher, 5000);
  await page.waitForLoadState("networkidle").catch(() => {});

  const dom = [];
  for (let p = 0; p < MAX_PAGES; p++) {
    dom.push(...(await lireCartes(page)));
    await debug(page, `3-resultats-${p + 1}`);
    if (!(await cliquerSiPresent(page, SEL.pageSuivante, 3000))) break;
    await page.waitForLoadState("networkidle").catch(() => {});
  }
  return dom;
}

// Secours : lecture des cartes de résultats affichées
async function lireCartes(page) {
  return page.locator(SEL.carte).evaluateAll(cartes => cartes.map(c => {
    const t = c.innerText.replace(/\s+\n/g, "\n");
    const a = c.querySelector("a[href]");
    const dates = t.match(/\d{1,2}\/\d{1,2}\/\d{4}/g) || [];
    const limite = t.match(/(?:limite|clôture)[^\d]*(\d{1,2}\/\d{1,2}\/\d{4})/i);
    const dist = t.match(/(\d+(?:[.,]\d+)?)\s?km/i);
    return {
      nom: (c.querySelector("h2,h3,h4,strong") || {}).innerText || t.split("\n")[0],
      texte: t, lien: a ? a.href : null, dates, limite: limite && limite[1], distance: dist && dist[1],
    };
  }));
}

function depuisCarte(c) {
  if (!c.dates.length) return null;
  const lignes = c.texte.split("\n").map(s => s.trim()).filter(Boolean);
  const cp = lignes.find(l => /\b\d{5}\b/.test(l));
  return {
    nom: c.nom.trim(),
    club: lignes.find(l => /club|tc |padel|tennis/i.test(l) && l !== c.nom.trim()) || null,
    ville: cp ? cp.replace(/.*\b\d{5}\s*/, "").trim() || null : null,
    distance_km: c.distance ? Math.round(parseFloat(c.distance.replace(",", "."))) : null,
    categorie: categorie(c.texte),
    date_debut: isoDate(c.dates[0]),
    date_fin: isoDate(c.dates[1] || c.dates[0]),
    sexe: sexe((c.texte.match(/mixte|dames|messieurs|femmes|hommes/i) || [])[0]),
    limite_inscription: isoDate(c.limite),
    lien: c.lien || URL_RECHERCHE,
  };
}

function nettoyer(liste) {
  const vus = new Map();
  for (const t of liste) {
    if (!t || !t.nom || !t.date_debut) continue;
    if (t.distance_km != null && t.distance_km > RAYON_KM) continue;
    const cle = `${t.nom.toLowerCase()}|${t.date_debut}|${(t.ville || "").toLowerCase()}`;
    // On garde la version la plus complète
    const plein = o => Object.values(o).filter(v => v != null).length;
    if (!vus.has(cle) || plein(t) > plein(vus.get(cle))) vus.set(cle, t);
  }
  const auj = new Date().toISOString().slice(0, 10);
  return [...vus.values()].filter(t => t.date_fin >= auj).sort((a, b) => a.date_debut.localeCompare(b.date_debut));
}

function ecrire(tournois) {
  const data = {
    genere_le: new Date().toISOString(),
    origine: ORIGINE.nom,
    rayon_km: RAYON_KM,
    source: "Ten'Up (FFT)",
    tournois,
  };
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, "tournois.json"), JSON.stringify(data, null, 2) + "\n");
  // Copie en JS : fetch() ne marche pas en file://, un <script> si
  fs.writeFileSync(path.join(OUT_DIR, "tournois.js"),
    "// Généré par scripts/scrape-tenup.js, ne pas modifier à la main.\nwindow.TOURNOIS_DATA=" + JSON.stringify(data) + ";\n");
}

// ---------- main ----------
(async () => {
  const ids = chargerEnv();
  const browser = await chromium.launch({ headless: !HEADED });
  const page = await browser.newPage({ locale: "fr-FR" });
  try {
    await connexion(page, ids);
    console.log("Connecté à Ten'Up.");
    const captes = [];
    const cartes = await rechercher(page, captes);
    const tournois = nettoyer([...captes, ...cartes.map(depuisCarte)]);
    console.log(`API : ${captes.length} objets captés · cartes : ${cartes.length} · retenus : ${tournois.length}`);
    if (!tournois.length) throw new Error("Aucun tournoi extrait : relance avec --headed --debug et regarde scripts/debug/.");
    ecrire(tournois);
    console.log(`Écrit : assets/data/tournois.json (${tournois.length} tournois).`);
  } catch (e) {
    await debug(page, "erreur");
    console.error("Échec :", e.message);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
