/* CONTENU PRÉ-RENDU : écrit dans le HTML le contenu que certaines pages construisent en JavaScript (fiches de coups,
   lexique, barème, plan d'entraînement), pour qu'il soit lisible sans JavaScript et par tous les moteurs de recherche.
   Le JavaScript de la page reste inchangé : au chargement, il reconstruit exactement le même contenu (et l'état du
   visiteur, comme les semaines cochées). verifier-seo.cjs contrôle que le HTML est resté identique au rendu.
   À relancer après toute modification des données (assets/js/coups.js, lexique.js, bareme-donnees.js, plan.js…) :
     node scripts/prerendre-contenu.js        (Playwright + Edge, comme les tests)
   Le contenu est placé entre <!-- prerendu:id --> et <!-- /prerendu:id --> dans l'élément visé. */
"use strict";
const fs = require("fs"), path = require("path"), http = require("http");
const { chromium } = require("playwright");
const RACINE = path.join(__dirname, "..");

// Page → éléments dont le contenu est construit par le JavaScript de la page (état par défaut, sans compte)
const CIBLES = {
  "technique.html": ["coups-fond", "coups-trans", "coups-filet", "coups-service"],
  "lexique.html": ["lex"],
  "bareme.html": ["b-table", "cuts"],
  "entrainement.html": ["weeks"],
};

const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css", ".json": "application/json", ".webp": "image/webp", ".png": "image/png", ".svg": "image/svg+xml" };
function serveur() {
  return http.createServer((q, r) => {
    const rel = decodeURIComponent(new URL(q.url, "http://x").pathname).slice(1) || "index.html";
    fs.readFile(path.join(RACINE, rel), (e, b) => {
      if (e) { r.writeHead(404); r.end(); return; }
      r.setHeader("Content-Type", TYPES[path.extname(rel)] || "application/octet-stream"); r.end(b);
    });
  });
}

// Remplace le contenu de l'élément id dans le HTML source (entre marqueurs, ou dans l'élément encore vide)
function injecter(html, id, contenu, page) {
  const debut = `<!-- prerendu:${id} -->`, fin = `<!-- /prerendu:${id} -->`;
  const bloc = debut + contenu + fin;
  if (html.includes(debut)) {
    const a = html.indexOf(debut), b = html.indexOf(fin, a);
    if (b < 0) throw new Error(`${page} : marqueur de fin absent pour ${id}`);
    return html.slice(0, a) + bloc + html.slice(b + fin.length);
  }
  const m = html.match(new RegExp(`(<([a-z]+)\\b[^>]*\\sid="${id}"[^>]*>)(</\\2>)`));
  if (!m) throw new Error(`${page} : élément #${id} introuvable ou déjà rempli sans marqueurs`);
  return html.replace(m[0], m[1] + bloc + m[3]);
}

// Contenu rendu par le navigateur, sans les marqueurs (le script de la page les a remplacés)
async function rendre(navigateur, base, page, ids) {
  const ctx = await navigateur.newContext({ serviceWorkers: "block", viewport: { width: 1280, height: 900 } });
  await ctx.route("https://**", r => r.fulfill({ status: 200, contentType: "text/javascript", body: "" }));
  const p = await ctx.newPage();
  await p.goto(base + "/" + page, { waitUntil: "load" });
  await p.waitForTimeout(300);
  const res = await p.evaluate(ids => Object.fromEntries(ids.map(id => [id, document.getElementById(id)?.innerHTML ?? null])), ids);
  await ctx.close();
  return res;
}

async function principal({ verifier = false } = {}) {
  const srv = serveur();
  await new Promise(r => srv.listen(0, "127.0.0.1", r));
  const base = "http://127.0.0.1:" + srv.address().port;
  const navigateur = await chromium.launch({ channel: "msedge" });
  const ecarts = [];
  try {
    for (const [page, ids] of Object.entries(CIBLES)) {
      const rendu = await rendre(navigateur, base, page, ids);
      const f = path.join(RACINE, page);
      let html = fs.readFileSync(f, "utf8");
      for (const id of ids) {
        if (!rendu[id] || !rendu[id].trim()) throw new Error(`${page} : #${id} vide après le JavaScript`);
        const avant = html;
        html = injecter(html, id, rendu[id], page);
        if (html !== avant) ecarts.push(page + "#" + id);
      }
      if (!verifier) fs.writeFileSync(f, html);
    }
  } finally { await navigateur.close(); srv.close(); }
  return ecarts;
}

module.exports = { CIBLES, principal };
if (require.main === module) {
  principal().then(e => console.log(e.length ? "Contenu pré-rendu mis à jour : " + e.join(", ") : "Contenu pré-rendu déjà à jour."))
    .catch(e => { console.error(e); process.exitCode = 1; });
}
