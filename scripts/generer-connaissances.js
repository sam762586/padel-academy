#!/usr/bin/env node
/* BASE DE CONNAISSANCES DU COACH IA (Node, aucune dépendance)
   Rassemble le contenu du site (texte des pages, données des coups, du lexique, du plan, des tutos, des exercices,
   des paliers du test de niveau, des raquettes) dans supabase/functions/coach/connaissances.ts, que la fonction
   « coach » envoie au modèle (mis en cache par l'API). Sortie déterministe : relancer après chaque modification
   de contenu, puis redéployer la fonction (supabase functions deploy coach).
   Usage : node scripts/generer-connaissances.js */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const RACINE = path.join(__dirname, "..");
const SORTIE = path.join(RACINE, "supabase", "functions", "coach", "connaissances.ts");
const SITE = "https://apprendre-padel.fr/";
// Pages de contenu, dans l'ordre où un joueur les découvre
const PAGES = ["regles", "technique", "tactique", "tutos", "conseils", "niveau", "entrainement", "materiel", "competition", "bareme", "tournois", "partenaires", "videos", "lexique"];

const lire = f => fs.readFileSync(path.join(RACINE, f), "utf8").replace(/\r\n/g, "\n");
const ENTITES = { amp: "&", lt: "<", gt: ">", quot: "\"", "#39": "'", nbsp: " ", rsquo: "’", laquo: "«", raquo: "»" };
function texteDePage(html) {
  let s = html.replace(/<(head|script|style|nav|footer|svg|noscript)\b[\s\S]*?<\/\1>/gi, " ");
  s = s.replace(/<(h[1-4])\b[^>]*>/gi, "\n\n### ").replace(/<\/(h[1-4])>/gi, "\n");
  s = s.replace(/<(p|li|tr|div|section|details|summary|figcaption)\b[^>]*>/gi, "\n").replace(/<[^>]+>/g, " ");
  s = s.replace(/&(#39|[a-z]+);/g, (m, e) => ENTITES[e] !== undefined ? ENTITES[e] : m).replace(/ /g, " ");
  return s.split("\n").map(l => l.replace(/[ \t]+/g, " ").trim()).filter(Boolean).join("\n");
}
// Valeur d'une constante de données en tête d'un fichier JS (« const NOM = [ ... ]; » ou « { ... }; »)
function constante(fichier, nom) {
  const src = lire(fichier);
  const m = new RegExp("const\\s+" + nom + "\\s*=\\s*").exec(src);
  if (!m) throw new Error(nom + " introuvable dans " + fichier);
  const debut = m.index + m[0].length, ouvrant = src[debut], fermant = { "[": "]", "{": "}" }[ouvrant];
  let prof = 0, i = debut, chaine = null;
  for (; i < src.length; i++) {
    const c = src[i];
    if (chaine) { if (c === "\\") i++; else if (c === chaine) chaine = null; continue; }
    if (c === "\"" || c === "'" || c === "`") chaine = c;
    else if (c === ouvrant) prof++;
    else if (c === fermant && --prof === 0) break;
  }
  return vm.runInNewContext("(" + src.slice(debut, i + 1) + ")");
}
const compact = v => JSON.stringify(v);

const blocs = [];
blocs.push("# Contenu du site Apprendre Padel (" + SITE + ")\nChaque section reprend le texte d'une page ; son adresse est indiquée en tête.");
for (const p of PAGES) blocs.push("## Page " + SITE + p + ".html\n" + texteDePage(lire(p + ".html")));
blocs.push("## Données : fiches des coups (" + SITE + "technique.html)\n" + compact(constante("assets/js/coups.js", "COUPS")));
blocs.push("## Données : lexique (" + SITE + "lexique.html)\n" + compact(constante("assets/js/lexique.js", "LEX")));
blocs.push("## Données : plan de progression 8 semaines (" + SITE + "entrainement.html)\n" + compact(constante("assets/js/plan.js", "WEEKS")));
blocs.push("## Données : tuto « quand monter au filet » (" + SITE + "tutos.html)\n" + compact(constante("assets/js/tuto-monter.js", "MONTER")) + "\n" + compact(constante("assets/js/tuto-monter.js", "MONTER_RULES")));
blocs.push("## Données : placement phase par phase (" + SITE + "tactique.html)\n" + compact(constante("assets/js/placement.js", "PH")));
blocs.push("## Données : paliers du test de niveau (" + SITE + "niveau.html)\n" + compact(constante("assets/js/quiz-niveau.js", "PN_PALIERS").map(p => ({ nom: p.nom, txt: p.txt }))));
blocs.push("## Données : exercices recommandés (espace joueur)\n" + compact(constante("assets/js/exercices-donnees.js", "EXERCICES")));
const raquettes = constante("assets/js/raquettes.js", "RACKETS");
blocs.push("## Données : raquettes du sélecteur (" + SITE + "materiel.html#raquette), prix indicatifs relevés fin octobre 2026\n"
  + raquettes.map(r => `${r.marque} ${r.modele} : ${r.forme}, balance ${r.balance}, ${r.poids} g, niveau ${["", "débutant", "intermédiaire", "avancé"][r.niveau]}, contrôle ${r.controle}/5, puissance ${r.puissance}/5, confort ${r.confort}/5${r.genre === "femme" ? ", gamme allégée" : ""}, ${r.prix} €`).join("\n"));

const texte = blocs.join("\n\n");
const sortie = "// Fichier généré par scripts/generer-connaissances.js : ne pas modifier à la main.\n"
  + "export const CONNAISSANCES = " + JSON.stringify(texte) + ";\n";
fs.mkdirSync(path.dirname(SORTIE), { recursive: true });
const avant = fs.existsSync(SORTIE) ? fs.readFileSync(SORTIE, "utf8") : "";
if (avant !== sortie) fs.writeFileSync(SORTIE, sortie);
console.log((avant === sortie ? "Inchangé" : "Écrit") + " : " + path.relative(RACINE, SORTIE) + " (" + texte.length + " caractères, environ " + Math.round(texte.length / 3.5) + " jetons)");
