/* JEU CONCOURS : écrit dans concours.html le contenu des concours, lisible sans JavaScript et par les moteurs de recherche.
   Sources : assets/js/concours-donnees.js (tableau CONCOURS) et le règlement-type scripts/donnees/concours-reglement.md
   (texte entre les deux lignes « --- », champs {titre} {lot} {valeur} {date_debut} {date_fin} {nb_gagnants},
   et les accords {gagnants_designes} {regle_gagnants}).
   Pour chaque concours : titre, dates, lot, valeur indicative, nombre de gagnants, gagnants publics, et règlement complet
   rempli (dépliable). Aucun concours : « Aucun concours en ce moment, reviens bientôt. »
   Le contenu va entre <!-- concours:debut --> et <!-- concours:fin --> ; tout est échappé ; relancer sans changement
   ne modifie pas la page. Données invalides : code 1, rien n'est écrit.
   La partie interactive (participation, retrait, compteur, gagnant) est faite par assets/js/concours.js.
   Le script affiche aussi, pour chaque concours, le SQL d'insertion dans public.concours (migration
   supabase/migrations/2026-11-01-concours-01) que l'organisateur exécute dans Supabase : sortie console seulement.
   Le SQL n'écrase jamais un concours existant (on conflict do nothing) : pour corriger une ligne, la modifier à la main.
   Lancer depuis la racine du site :
     node scripts/generer-concours.js                 écrit concours.html et affiche le SQL
     node scripts/generer-concours.js --verifier      code 1 si concours.html n'est pas à jour (rien n'est écrit)
   Options de test : --donnees <fichier.js> (autre fichier de données) et --page <fichier.html> (autre page). */
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const RACINE = path.join(__dirname, "..");

const DEBUT = "<!-- concours:debut -->", FIN = "<!-- concours:fin -->";
const CHAMPS = ["titre", "lot", "valeur", "date_debut", "date_fin", "nb_gagnants"];
const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
// Mêmes règles que la table public.concours (concours-01) : id « AAAA-MM-nom », titre de 120 caractères au plus, 1 à 20 gagnants
const ID_VALIDE = /^[0-9]{4}-[0-9]{2}-[a-z0-9-]{1,40}$/;
const AUCUN = '<p class="msg msg-info cc-aucun" id="cc-aucun">Aucun concours en ce moment, reviens bientôt.</p>';

/* ---------- Lecture ---------- */
function lireOptions(argv) {
  const o = { verifier: false, donnees: path.join(RACINE, "assets/js/concours-donnees.js"), page: path.join(RACINE, "concours.html"),
    reglement: path.join(RACINE, "scripts/donnees/concours-reglement.md") };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--verifier") o.verifier = true;
    else if (argv[i] === "--donnees") o.donnees = path.resolve(argv[++i]);
    else if (argv[i] === "--page") o.page = path.resolve(argv[++i]);
    else throw new Error("option inconnue : " + argv[i]);
  }
  return o;
}
// Le fichier de données est un script de navigateur (const CONCOURS=[…]) : exécuté à part, sans accès à Node
function lireConcours(fichier) {
  const source = fs.readFileSync(fichier, "utf8");
  const liste = vm.runInNewContext(source + "\n;typeof CONCOURS===\"undefined\"?undefined:CONCOURS", Object.create(null), { timeout: 1000 });
  return liste;
}
// Texte du règlement : notes internes (commentaires HTML <!-- … -->) retirées ; si le fichier a encore deux lignes
// « --- » (ancienne présentation), seul le texte entre elles est gardé
function lireReglement(fichier) {
  const texte = fs.readFileSync(fichier, "utf8").replace(/\r\n/g, "\n").replace(/<!--[\s\S]*?-->/g, "");
  if (texte.includes("<!--") || texte.includes("-->")) throw new Error("règlement : commentaire HTML mal fermé");
  const lignes = texte.split("\n");
  const separateurs = lignes.map((l, i) => l.trim() === "---" ? i : -1).filter(i => i >= 0);
  const corps = separateurs.length >= 2 ? lignes.slice(separateurs[0] + 1, separateurs[1]) : lignes;
  const resultat = corps.join("\n").trim();
  if (!/^## /m.test(resultat)) throw new Error("règlement : titre « ## Règlement du jeu concours … » introuvable");
  return resultat;
}
// Typographie française : espace insécable (U+00A0) avant : ; ? ! €, et à l'intérieur des guillemets « » ;
// appliquée au texte seulement (jamais aux attributs ni aux adresses). « graine:identifiant » n'a pas d'espace : inchangé.
function typographie(texte) {
  return texte.replace(/[ \u00a0]+([:;?!»€])/g, "\u00a0$1").replace(/«[ \u00a0]+/g, "«\u00a0");
}
const typographieHtml = html => html.replace(/>([^<]+)</g, (m, t) => ">" + typographie(t) + "<");

/* ---------- Contrôle des données ---------- */
const dateValide = s => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && new Date(s + "T00:00:00Z").toISOString().slice(0, 10) === s;
const texteValide = (s, max) => typeof s === "string" && s.trim() === s && s.length >= 1 && s.length <= max && !/[{}\u0000-\u001f]/.test(s);
function erreursDonnees(liste) {
  const e = [];
  if (!Array.isArray(liste)) return ["CONCOURS doit être un tableau"];
  const ids = new Set();
  liste.forEach((c, i) => {
    const nom = `concours n°${i + 1}${c && typeof c.id === "string" ? " (" + c.id + ")" : ""}`;
    if (!c || typeof c !== "object") { e.push(nom + " : objet attendu"); return; }
    const inconnus = Object.keys(c).filter(k => !["id", "tire", ...CHAMPS].includes(k));
    if (inconnus.length) e.push(`${nom} : champ inconnu ${inconnus.join(", ")}`);
    if (typeof c.id !== "string" || !ID_VALIDE.test(c.id)) e.push(nom + " : id attendu au format AAAA-MM-nom (minuscules, chiffres, tirets), ex. 2026-12-raquette");
    else if (ids.has(c.id)) e.push(nom + " : id en double"); else ids.add(c.id);
    if (!texteValide(c.titre, 120)) e.push(nom + " : titre attendu (1 à 120 caractères, sans { })");
    if (!texteValide(c.lot, 300)) e.push(nom + " : lot attendu (1 à 300 caractères, sans { })");
    if (typeof c.valeur !== "number" || !Number.isFinite(c.valeur) || c.valeur < 0 || Math.round(c.valeur * 100) !== c.valeur * 100) e.push(nom + " : valeur attendue en euros (nombre positif, 2 décimales au plus)");
    if (!dateValide(c.date_debut)) e.push(nom + " : date_debut attendue au format AAAA-MM-JJ");
    if (!dateValide(c.date_fin)) e.push(nom + " : date_fin attendue au format AAAA-MM-JJ");
    if (dateValide(c.date_debut) && dateValide(c.date_fin) && c.date_fin < c.date_debut) e.push(nom + " : date_fin avant date_debut");
    if (!Number.isInteger(c.nb_gagnants) || c.nb_gagnants < 1 || c.nb_gagnants > 20) e.push(nom + " : nb_gagnants attendu (entier de 1 à 20)");
    // Aucune donnée personnelle dans le fichier : les gagnants viennent de la base (rpc concours_gagnants_publics)
    if ("tire" in c && typeof c.tire !== "boolean") e.push(nom + " : tire attendu (true ou false, facultatif)");
  });
  return e;
}

/* ---------- Rendu ---------- */
const echapper = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
// « 2026-12-01 » → « 1er décembre 2026 »
function dateLongue(iso) {
  const [a, m, j] = iso.split("-").map(Number);
  return `${j === 1 ? "1er" : j} ${MOIS[m - 1]} ${a}`;
}
// 249.95 → « 249,95 » ; 150 → « 150 »
const euros = v => Number.isInteger(v) ? String(v) : v.toFixed(2).replace(".", ",");
function valeursChamps(c) {
  return { titre: c.titre, lot: c.lot, valeur: euros(c.valeur), date_debut: dateLongue(c.date_debut), date_fin: dateLongue(c.date_fin), nb_gagnants: String(c.nb_gagnants),
    // Accords selon le nombre de gagnants (règlement, articles 3.1 et 3.2)
    gagnants_designes: c.nb_gagnants > 1 ? c.nb_gagnants + " gagnants, désignés" : "1 gagnant, désigné",
    regle_gagnants: c.nb_gagnants > 1 ? `Les ${c.nb_gagnants} participations qui ont les plus petites empreintes gagnent.`
      : "La participation qui a la plus petite empreinte gagne." };
}
// Texte échappé, puis champs {…} remplacés par leur valeur échappée, puis liens [texte](page.html) du règlement
function enLigne(texte, valeurs) {
  let html = echapper(texte).replace(/\{([a-z_]+)\}/g, (m, cle) => {
    if (!(cle in valeurs)) throw new Error("règlement : champ inconnu {" + cle + "}");
    return echapper(valeurs[cle]);
  });
  html = html.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, libelle, cible) => {
    if (!/^[a-z0-9-]+\.html(#[a-z0-9-]+)?$/.test(cible)) throw new Error("règlement : lien non interne " + cible);
    return `<a href="${cible}">${libelle}</a>`;
  });
  return html;
}
// Règlement : « ## » = titre (repris dans le résumé dépliable), « ### » = article (h3), le reste = paragraphes
function rendreReglement(md, valeurs) {
  const blocs = md.split(/\n\s*\n/).map(b => b.trim()).filter(Boolean);
  const html = [];
  for (const b of blocs) {
    if (b.startsWith("## ")) continue;
    if (b.startsWith("### ")) { html.push(`<h3>${enLigne(b.slice(4), valeurs)}</h3>`); continue; }
    // Un bloc peut commencer par une phrase puis continuer par une liste « - … » (article 3.2)
    const lignes = b.split("\n"), texte = [], puces = [];
    for (const l of lignes) {
      if (/^- /.test(l)) puces.push(l.slice(2));
      else if (puces.length) puces[puces.length - 1] += " " + l.trim();
      else texte.push(l.trim());
    }
    if (texte.length) html.push(`<p>${enLigne(texte.join(" "), valeurs)}</p>`);
    if (puces.length) html.push(`<ul>\n${puces.map(p => `<li>${enLigne(p, valeurs)}</li>`).join("\n")}\n</ul>`);
  }
  return html.join("\n");
}
function titreReglement(md, valeurs) {
  const ligne = md.split("\n").find(l => l.startsWith("## "));
  return ligne ? enLigne(ligne.slice(3), valeurs) : "Règlement du jeu concours";
}
function rendreConcours(c, md) {
  const v = valeursChamps(c), id = echapper(c.id);
  const gagnants = c.tire ? "\n    <div><dt>Tirage au sort</dt><dd>fait : graine, empreintes des gagnants et pseudos acceptés dans le résultat ci-dessous</dd></div>" : "";
  return `<article class="acc-card cc-concours" id="concours-${id}" data-concours="${id}" aria-labelledby="cc-titre-${id}">
  <h2 id="cc-titre-${id}">${echapper(c.titre)}</h2>
  <p class="cc-dates">Du ${echapper(v.date_debut)} au ${echapper(v.date_fin)} inclus (heure de Paris).</p>
  <dl class="cc-infos">
    <div><dt>Lot</dt><dd>${echapper(c.lot)}</dd></div>
    <div><dt>Valeur indicative</dt><dd>${echapper(v.valeur)} € TTC</dd></div>
    <div><dt>Nombre de gagnants</dt><dd>${c.nb_gagnants} gagnant${c.nb_gagnants > 1 ? "s" : ""}, tiré${c.nb_gagnants > 1 ? "s" : ""} au sort</dd></div>${gagnants}
  </dl>
  <div class="cc-action" data-action><p>Pour participer, <a href="connexion.html?suite=concours.html">connecte-toi à ton compte</a> pendant la période du jeu.</p></div>
  <details class="cc-reglement">
    <summary>${titreReglement(md, v)}</summary>
    <div class="prose">
${rendreReglement(md, v)}
    </div>
  </details>
</article>`;
}
// Du plus récent au plus ancien (date de début), le concours en cours en premier
function rendreBloc(liste, md) {
  if (!liste.length) return AUCUN;
  return typographieHtml(liste.slice().sort((a, b) => a.date_debut < b.date_debut ? 1 : a.date_debut > b.date_debut ? -1 : 0).map(c => rendreConcours(c, md)).join("\n"));
}
function injecter(html, bloc) {
  const a = html.indexOf(DEBUT), b = html.indexOf(FIN);
  if (a < 0 || b < a) throw new Error("marqueurs <!-- concours:debut --> et <!-- concours:fin --> introuvables");
  return html.slice(0, a) + DEBUT + "\n" + bloc + "\n" + html.slice(b);
}

/* ---------- SQL à exécuter par l'organisateur (console seulement) ---------- */
const sqlTexte = s => "'" + String(s).replace(/'/g, "''") + "'";
function sqlInsertion(c) {
  return `insert into public.concours (id, titre, date_debut, date_fin, nb_gagnants)
values (${sqlTexte(c.id)}, ${sqlTexte(c.titre)}, '${c.date_debut} 00:00 Europe/Paris', '${c.date_fin} 23:59:59 Europe/Paris', ${c.nb_gagnants})
on conflict (id) do nothing;`;
}

function principal(argv) {
  let o;
  try { o = lireOptions(argv); } catch (e) { console.error(e.message); return 1; }
  let liste, md;
  try { liste = lireConcours(o.donnees); } catch (e) { console.error("Données illisibles (" + o.donnees + ") : " + e.message); return 1; }
  const erreurs = erreursDonnees(liste);
  if (erreurs.length) { console.error("Données invalides, rien n'est écrit :\n- " + erreurs.join("\n- ")); return 1; }
  let html, nouveau;
  try {
    md = lireReglement(o.reglement);
    html = fs.readFileSync(o.page, "utf8");
    nouveau = injecter(html, rendreBloc(liste, md));
    if (/\{[a-z_]+\}/.test(nouveau.slice(nouveau.indexOf(DEBUT), nouveau.indexOf(FIN)))) throw new Error("champ {…} non rempli");
  } catch (e) { console.error("Génération impossible, rien n'est écrit : " + e.message); return 1; }
  const nom = path.relative(RACINE, o.page) || o.page;
  if (o.verifier) {
    if (nouveau !== html) { console.error(nom + " n'est pas à jour : lancer node scripts/generer-concours.js"); return 1; }
    console.log(nom + " à jour (" + liste.length + " concours).");
    return 0;
  }
  if (nouveau !== html) fs.writeFileSync(o.page, nouveau);
  console.log(`${nom} : ${liste.length} concours, ${nouveau !== html ? "page écrite" : "inchangée"}.`);
  if (liste.length) {
    console.log("\nSQL à exécuter dans Supabase (SQL Editor), après les migrations 2026-11-01-concours-* :\n");
    liste.forEach(c => console.log(sqlInsertion(c) + "\n"));
  }
  return 0;
}

if (require.main === module) process.exitCode = principal(process.argv.slice(2));
module.exports = { typographie, erreursDonnees, rendreBloc, rendreConcours, sqlInsertion, dateLongue, lireReglement, principal };
