// Vérifie que tous les JSON de assets/data sont lisibles (appelé par maj-hebdo.bat avant tout commit).
const fs = require("fs");
const path = require("path");
let n = 0;
function parcourir(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const f = path.join(d, e.name);
    if (e.isDirectory()) parcourir(f);
    else if (f.endsWith(".json")) { JSON.parse(fs.readFileSync(f, "utf8")); n++; }
  }
}
parcourir(path.join(__dirname, "..", "assets", "data"));
console.log(`${n} fichiers JSON valides.`);
