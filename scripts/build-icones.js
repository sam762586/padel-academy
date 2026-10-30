/* Génère les icônes du site depuis le logo de Samuel (assets/img/logo/), via Playwright (canal msedge).
   Sources : monogramme-sombre-512.png (AP + swoosh + balle, parties bleu nuit passées en blanc) et logo-sombre.png.
   Sorties (mêmes chemins et dimensions qu'avant) :
     assets/img/icons/icon-192.png, icon-512.png, icon-maskable-512.png (zone de sécurité 80 %)
     assets/img/icon-512.png (copie), favicon.png (48), apple-touch-icon.png (180), assets/img/og-image.png (1200x630)
     assets/img/logo/favicon-32.png (aperçu 32 px)
   Les anciens icon.svg / icon-maskable.svg (balle seule) ne servent plus.
   Ensuite, optimisation sans perte des PNG (Pillow : Image.save(..., optimize=True)), ~30 % plus légers.
   Usage : depuis scripts/ -> node build-icones.js */
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const racine = path.join(__dirname, "..");
const img = path.join(racine, "assets", "img");
const NUIT = "#101F35";
const b64 = f => "data:image/png;base64," + fs.readFileSync(f).toString("base64");
const mono = b64(path.join(img, "logo", "monogramme-sombre-512.png"));
const logo = b64(path.join(img, "logo", "logo-sombre.png"));

// Tâches : [fichier, taille, rendu]. largeurMono = part de la taille occupée par le monogramme ; arrondi = rayon / taille.
const icone = (sortie, t, largeurMono, arrondi) => ({ sortie, w: t, h: t, fond: NUIT, arrondi, src: mono, largeur: largeurMono * t });
const taches = [
  icone(path.join(img, "icons", "icon-192.png"), 192, 0.84, 0.1875),
  icone(path.join(img, "icons", "icon-512.png"), 512, 0.84, 0.1875),
  icone(path.join(img, "icon-512.png"), 512, 0.84, 0.1875),
  icone(path.join(img, "icons", "icon-maskable-512.png"), 512, 0.70, 0),   // plein cadre, tout dans le cercle de sécurité
  icone(path.join(racine, "apple-touch-icon.png"), 180, 0.80, 0),          // iOS arrondit lui-même
  icone(path.join(racine, "favicon.png"), 48, 0.88, 0.18),
  icone(path.join(img, "logo", "favicon-32.png"), 32, 0.90, 0.18),
  { sortie: path.join(img, "og-image.png"), w: 1200, h: 630, fond: NUIT, arrondi: 0, src: logo, largeur: 880 }
];

(async () => {
  const nav = await chromium.launch({ channel: "msedge" });
  const page = await nav.newPage();
  await page.setContent("<canvas id=c></canvas>");
  for (const t of taches) {
    const data = await page.evaluate(async ({ t }) => {
      const im = new Image(); im.src = t.src; await im.decode();
      const lw = Math.round(t.largeur), lh = Math.round(im.height * lw / im.width);
      // réduction par paliers (division par 2) pour garder des bords nets
      let cur = im, cw = im.width, ch = im.height;
      while (cw / 2 >= lw) {
        const c = document.createElement("canvas"); c.width = Math.round(cw / 2); c.height = Math.round(ch / 2);
        const x = c.getContext("2d"); x.imageSmoothingQuality = "high"; x.drawImage(cur, 0, 0, c.width, c.height);
        cur = c; cw = c.width; ch = c.height;
      }
      const cv = document.createElement("canvas"); cv.width = t.w; cv.height = t.h;
      const g = cv.getContext("2d"); g.imageSmoothingQuality = "high";
      g.fillStyle = t.fond;
      if (t.arrondi) { g.beginPath(); g.roundRect(0, 0, t.w, t.h, t.arrondi * t.w); g.fill(); } else g.fillRect(0, 0, t.w, t.h);
      g.drawImage(cur, (t.w - lw) / 2, (t.h - lh) / 2, lw, lh);
      return cv.toDataURL("image/png");
    }, { t: { ...t } });
    fs.writeFileSync(t.sortie, Buffer.from(data.split(",")[1], "base64"));
    console.log(path.relative(racine, t.sortie), t.w + "x" + t.h);
  }
  await nav.close();
})();
