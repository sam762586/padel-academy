/* Génère les icônes PNG de la PWA depuis les SVG de assets/img/icons/ (Playwright, canal msedge).
   Usage : depuis scripts/ -> node build-icones.js */
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const dossier = path.join(__dirname, "..", "assets", "img", "icons");
const cibles = [["icon.svg", 192, "icon-192.png"], ["icon.svg", 512, "icon-512.png"], ["icon-maskable.svg", 512, "icon-maskable-512.png"]];
(async () => {
  const navigateur = await chromium.launch({ channel: "msedge" });
  for (const [svg, taille, sortie] of cibles) {
    const page = await navigateur.newPage({ viewport: { width: taille, height: taille } });
    const contenu = fs.readFileSync(path.join(dossier, svg), "utf8");
    await page.setContent('<style>html,body{margin:0;background:transparent}svg{display:block;width:' + taille + 'px;height:' + taille + 'px}</style>' + contenu);
    await page.screenshot({ path: path.join(dossier, sortie), omitBackground: true });
    await page.close();
    console.log(sortie);
  }
  await navigateur.close();
})();
