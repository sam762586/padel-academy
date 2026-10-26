#!/usr/bin/env node
/* Recopie le menu et le pied de page du gabarit (scripts/gabarit.js) dans toutes les pages HTML de la racine.
   La page courante est marquée « active » dans le menu quand elle y figure.
   Usage :
     node scripts/appliquer-gabarit.js              écrit les pages qui diffèrent
     node scripts/appliquer-gabarit.js --verifier   n'écrit rien, sort en erreur si une page diffère */
"use strict";
const fs = require("fs");
const path = require("path");
const { nav, footer } = require("./gabarit");

const RACINE = path.join(__dirname, "..");
const verifier = process.argv.includes("--verifier");
const PREFIXES = { "404.html": "/" }; // la 404 est servie à n'importe quelle adresse : liens absolus

const differentes = [];
for (const f of fs.readdirSync(RACINE).filter(n => n.endsWith(".html")).sort()) {
  const fichier = path.join(RACINE, f);
  const avant = fs.readFileSync(fichier, "utf8");
  const prefixe = PREFIXES[f] || "";
  let apres = avant;
  const remplacer = (motif, html) => {
    if (!motif.test(apres)) throw new Error(f + " : bloc introuvable " + motif);
    apres = apres.replace(motif, () => html);
  };
  remplacer(/<nav class="nav"[\s\S]*?<\/nav>/, nav(f, prefixe));
  remplacer(/<footer>[\s\S]*?<\/footer>/, footer(prefixe));
  if (apres !== avant) {
    differentes.push(f);
    if (!verifier) fs.writeFileSync(fichier, apres);
  }
}
if (verifier) {
  if (differentes.length) { console.error("Pages à mettre à jour : " + differentes.join(", ")); process.exitCode = 1; }
  else console.log("Gabarit à jour dans toutes les pages.");
} else console.log(differentes.length ? "Mises à jour : " + differentes.join(", ") : "Rien à changer.");
