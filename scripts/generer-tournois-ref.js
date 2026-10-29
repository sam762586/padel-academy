#!/usr/bin/env node
/* Remplit la table Supabase « tournois_ref » (id, club, date_debut, date_fin, nom, ville, categorie, dep) à partir de assets/data/tournois.json.
   Sans dépendance. Données publiques seulement (ce sont celles de tournois.json), aucune donnée de joueur.

     node scripts/generer-tournois-ref.js                    écrit supabase/donnees/tournois-ref-01.sql, -02.sql… (1 000 lignes par fichier)
     node scripts/generer-tournois-ref.js --sortie <dossier> autre dossier de sortie
     node scripts/generer-tournois-ref.js --envoyer          envoie directement par l'API REST de Supabase (voir ci-dessous)

   Fichiers SQL : à coller, dans l'ordre, dans le SQL Editor de Supabase (voir supabase/LISEZMOI.md, « Stabilisation S2 »).
   Chaque fichier est un « insert … on conflict (id) do update » : relançable sans risque. Le dossier supabase/donnees/ est
   ignoré par git : ces fichiers se régénèrent en une seconde et changeraient à chaque mise à jour hebdomadaire (0,5 Mo de diff).
   Les anciens fichiers tournois-ref-NN.sql du dossier de sortie sont supprimés avant l'écriture (jamais d'ancien reste).

   --envoyer : variables d'environnement SUPABASE_URL (https://xxxx.supabase.co) et SUPABASE_SERVICE_ROLE (clé service_role,
   à ne jamais écrire dans un fichier). Le script refuse de démarrer si l'une manque. Les mêmes paquets de 1 000 lignes
   sont envoyés en upsert sur « id ». Réservé à un ordinateur de confiance : la clé service_role contourne la sécurité.
   Les tournois déjà terminés restent dans la table (les avis en ont besoin) ; rien n'est supprimé. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const racine = path.join(__dirname, '..');
const TAILLE_PAQUET = 1000;
const RE_ID = /^(FED_)?[0-9]{1,12}$/;

// Même logique que lireJour de generer-pages.js, avec en plus le refus des dates qui débordent (2026-02-31)
const lireJour = iso => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : null; };
const jourValide = iso => { const d = lireJour(iso); return !!d && d.toISOString().slice(0, 10) === iso; };

/* Filtre de coordonnées de référence, recopié à l'identique de scripts/verifier-securite-sql.cjs (filtreJs, non exportable
   car ce fichier s'exécute à son chargement). Vrai si le texte contient un contact ; même résultat que
   public.message_sans_contact (s2-24 et s2-25). Si l'un change, l'autre aussi. */
const PA_DATE_HEURE = /(?<![\p{L}\p{N}])(?<![0-9]([^\p{L}\p{N}]*[0-9]){2}[^\p{L}\p{N}]*)(((0?[1-9]|[12][0-9]|3[01])[\/.-](0?[1-9]|1[0-2])[\/.-](20)?2[4-9]|202[4-9]-(0?[1-9]|1[0-2])-(0?[1-9]|[12][0-9]|3[01])|(0[1-9]|[12][0-9]|3[01])(0[1-9]|1[0-2])(20)?2[4-9])([^\p{L}\p{N}]+((à|a|de|dès|des|vers)[^\p{L}\p{N}]+)?([01]?[0-9]|2[0-3])(:[0-5][0-9]|h([0-5][0-9])?)([^\p{L}\p{N}]*([-–\/]|à)[^\p{L}\p{N}]*([01]?[0-9]|2[0-3])(:[0-5][0-9]|h([0-5][0-9])?)?)?)?(?![\p{L}\p{N}])|(((0?[1-9]|[12][0-9]|3[01])\/(0?[1-9]|1[0-2]))([^\p{L}\p{N}]+((à|a|de|dès|des|vers)[^\p{L}\p{N}]+)?([01]?[0-9]|2[0-3])(:[0-5][0-9]|h([0-5][0-9])?)([^\p{L}\p{N}]*([-–\/]|à)[^\p{L}\p{N}]*([01]?[0-9]|2[0-3])(:[0-5][0-9]|h([0-5][0-9])?)?)?)?|([01]?[0-9]|2[0-3])(:[0-5][0-9]|h([0-5][0-9])?)([^\p{L}\p{N}]*([-–\/]|à)[^\p{L}\p{N}]*([01]?[0-9]|2[0-3])(:[0-5][0-9]|h([0-5][0-9])?)?)?)(?![\p{L}\p{N}])(?![^\p{L}\p{N}]*[0-9]))/gu;
const PA_CATEGORIE = /(?<![\p{L}\p{N}])(p[^\p{L}\p{N}]?(25|50|100|250|500|1000|1500|2000|3000)[hdfmx]?|[+][^\p{L}\p{N}]*(35|45|55|60|65)|[1-4]v[1-4])(?![0-9])|^(100|250|500|1000|2000|3000)(?![0-9])/gu;
const PA_CHIFFRES_ZEROS = [0x660, 0x6F0, 0x7C0, 0x966, 0x9E6, 0xA66, 0xAE6, 0xB66, 0xBE6, 0xC66, 0xCE6, 0xD66, 0xDE6, 0xE50, 0xED0, 0xF20, 0x1040, 0x1090, 0x17E0, 0x1810, 0x1946, 0x19D0, 0x1A80, 0x1A90, 0x1B50, 0x1BB0, 0x1C40, 0x1C50, 0xA620, 0xA8D0, 0xA900, 0xA9D0, 0xA9F0, 0xAA50, 0xABF0, 0x104A0, 0x10D30, 0x10D40, 0x11066, 0x110F0, 0x11136, 0x111D0, 0x112F0, 0x11450, 0x114D0, 0x11650, 0x116C0, 0x116D0, 0x116DA, 0x11730, 0x118E0, 0x11950, 0x11BF0, 0x11C50, 0x11D50, 0x11DA0, 0x11DE0, 0x11F50, 0x16130, 0x16A60, 0x16AC0, 0x16B50, 0x16D70, 0x1E140, 0x1E2F0, 0x1E4F0, 0x1E5F1, 0x1E950];
const PA_CHIFFRES = new Map(PA_CHIFFRES_ZEROS.flatMap(z => [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => [String.fromCodePoint(z + i), String(i)])));
function filtreJs(texte) {
  let t = String(texte || '').normalize('NFKC').toLowerCase().replace(/[\u00ad\u200b-\u200f\u2060\ufeff]/gu, '');
  t = Array.from(t, c => PA_CHIFFRES.get(c) || c).join('');
  if (t.indexOf('@') >= 0 || /(arobase|\[at\]|\(at\))/u.test(t)) return true;
  if (/(https?:|www\.)/u.test(t) || /\.(fr|com|net|org|eu|io|be|ch|me|gg|ly|ee|co|app|info|link)(?![\p{L}\p{N}_])/u.test(t) ||
    /(?<![\p{L}\p{N}_])(point|dot)\s*(com|fr|net)(?![\p{L}\p{N}_])/u.test(t) || /(?<![\p{L}\p{N}_])(t|wa)[^\p{L}\p{N}]+me(?![\p{L}\p{N}_])/u.test(t)) return true;
  const j = t.replace(/(?<![\p{L}\p{N}])(\p{L})[^\p{L}\p{N}]+(?=\p{L}(?![\p{L}\p{N}]))/gu, '$1');
  if (/(?<![\p{L}\p{N}_])(gmail|hotmail|outlook|yahoo|icloud|whatsapp|wtsp|telegram|snapchat|snap|instagram|insta|ig|facebook|fb|messenger|tiktok|discord|signal)(?![\p{L}\p{N}_])/u.test(j)) return true;
  if (/(whatsapp|instagram|snapchat|telegram|tiktok)/u.test(t.replace(/[^\p{L}]/gu, ''))) return true;
  t = t.replace(PA_CATEGORIE, ' ').replace(PA_DATE_HEURE, ' ');
  if (/[0-9]{9,}/u.test(t.replace(/[^\p{L}\p{N}]/gu, ''))) return true;
  return (t.match(/[0-9]+(?:[^0-9]{1,4}[0-9]+)*/gu) || []).some(m => m.replace(/[^0-9]/gu, '').length >= 9);
}

/* Texte facultatif : contrôles nettoyés comme pour club ; vide => null ; trop long ou contact => null (compté dans le bilan) */
function texteFacultatif(valeur, max, bilan, cle) {
  if (valeur === null || valeur === undefined) return null;
  const t = String(valeur).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!t) return null;
  if (t.length > max || filtreJs(t)) { bilan.mis_a_null[cle]++; return null; }
  return t;
}

/* Lignes valides, triées par identifiant (sortie stable : deux exécutions donnent les mêmes fichiers) */
function lignesRef(tournois) {
  const retenues = new Map();
  const bilan = {total: tournois.length, valides: 0, invalides: 0, doublons: 0, exemples: [], mis_a_null: {nom: 0, ville: 0, categorie: 0, dep: 0}};
  const refuser = (t, motif) => { bilan.invalides++; if (bilan.exemples.length < 5) bilan.exemples.push(`${t && t.id} : ${motif}`); };
  for (const t of tournois) {
    if (!t || typeof t !== 'object') { refuser(t, 'ligne illisible'); continue; }
    const id = String(t.id);
    if (!RE_ID.test(id)) { refuser(t, 'identifiant'); continue; }
    const club = String(t.club || '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!club || club.length > 120) { refuser(t, 'club'); continue; }
    const debut = t.date_debut, fin = t.date_fin || t.date_debut;
    if (!jourValide(debut) || !jourValide(fin)) { refuser(t, 'date'); continue; }
    if (fin < debut) { refuser(t, 'fin avant début'); continue; }
    if (retenues.has(id)) bilan.doublons++;
    const nom = texteFacultatif(t.nom, 200, bilan, 'nom');
    const ville = texteFacultatif(t.ville, 100, bilan, 'ville');
    const categorie = texteFacultatif(t.categorie, 20, bilan, 'categorie');
    const depBrut = t.dep === null || t.dep === undefined ? '' : String(t.dep).trim();
    let dep = null;
    if (depBrut) { if (/^[0-9A-Za-z]{1,3}$/.test(depBrut)) dep = depBrut; else bilan.mis_a_null.dep++; }
    retenues.set(id, {id, club, date_debut: debut, date_fin: fin, nom, ville, categorie, dep});
  }
  bilan.valides = retenues.size;
  const lignes = [...retenues.values()].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return {lignes, bilan};
}

const litteral = s => "'" + String(s).replace(/'/g, "''") + "'";
const paquets = lignes => { const r = []; for (let i = 0; i < lignes.length; i += TAILLE_PAQUET) r.push(lignes.slice(i, i + TAILLE_PAQUET)); return r; };

function sqlPaquet(lignes, n, total, date) {
  const opt = v => (v === null || v === undefined ? 'null' : litteral(v));
  const valeurs = lignes.map(l => `  (${litteral(l.id)}, ${litteral(l.club)}, ${litteral(l.date_debut)}, ${litteral(l.date_fin)}, ${opt(l.nom)}, ${opt(l.ville)}, ${opt(l.categorie)}, ${opt(l.dep)})`).join(',\n');
  return `-- tournois_ref ${n}/${total} : ${lignes.length} tournois (données publiques de assets/data/tournois.json, source du ${date}).\n` +
    '-- Généré par scripts/generer-tournois-ref.js : ne pas modifier à la main. Relançable sans risque.\n' +
    'insert into public.tournois_ref (id, club, date_debut, date_fin, nom, ville, categorie, dep) values\n' + valeurs + '\n' +
    'on conflict (id) do update set club = excluded.club, date_debut = excluded.date_debut, date_fin = excluded.date_fin, nom = excluded.nom, ville = excluded.ville, categorie = excluded.categorie, dep = excluded.dep, maj = now();\n';
}

function ecrire(lignes, dossier, date) {
  fs.mkdirSync(dossier, {recursive: true});
  for (const f of fs.readdirSync(dossier)) if (/^tournois-ref-\d+\.sql$/.test(f)) fs.rmSync(path.join(dossier, f));
  const liste = paquets(lignes);
  const fichiers = liste.map((p, i) => {
    const f = path.join(dossier, 'tournois-ref-' + String(i + 1).padStart(2, '0') + '.sql');
    fs.writeFileSync(f, sqlPaquet(p, i + 1, liste.length, date), 'utf8');
    return f;
  });
  return fichiers;
}

function lireEnvironnement() {
  const url = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
  const cle = process.env.SUPABASE_SERVICE_ROLE || '';
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url) || !cle) {
    console.error('--envoyer demande deux variables d\'environnement : SUPABASE_URL (https://xxxx.supabase.co) et SUPABASE_SERVICE_ROLE (clé service_role).\nElles ne sont jamais lues dans un fichier. Rien n\'a été envoyé.');
    process.exit(1);
  }
  return {url, cle};
}

async function envoyer(lignes, {url, cle}) {
  const maj = new Date().toISOString();
  const liste = paquets(lignes);
  for (let i = 0; i < liste.length; i++) {
    const rep = await fetch(url + '/rest/v1/tournois_ref?on_conflict=id', {
      method: 'POST',
      headers: {
        apikey: cle, Authorization: 'Bearer ' + cle, 'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal', 'User-Agent': 'ApprendrePadel-maj-tournois-ref',
      },
      body: JSON.stringify(liste[i].map(l => ({id: l.id, club: l.club, date_debut: l.date_debut, date_fin: l.date_fin, nom: l.nom ?? null, ville: l.ville ?? null, categorie: l.categorie ?? null, dep: l.dep ?? null, maj}))),
    });
    if (!rep.ok) { console.error(`Paquet ${i + 1}/${liste.length} refusé (HTTP ${rep.status}) : ${(await rep.text()).slice(0, 300)}`); process.exit(1); }
    console.log(`Paquet ${i + 1}/${liste.length} envoyé (${liste[i].length} tournois).`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const sortieI = args.indexOf('--sortie');
  if (sortieI >= 0 && !args[sortieI + 1]) { console.error('--sortie attend un dossier.'); process.exit(1); }
  const dossier = sortieI >= 0 ? path.resolve(args[sortieI + 1]) : path.join(racine, 'supabase', 'donnees');
  const mode = args.includes('--envoyer');
  const env = mode ? lireEnvironnement() : null; // arrêt immédiat si les variables manquent

  const source = JSON.parse(fs.readFileSync(path.join(racine, 'assets', 'data', 'tournois.json'), 'utf8'));
  const {lignes, bilan} = lignesRef(source.tournois || []);
  const date = String(source.genere_le || '').slice(0, 10) || 'inconnue';
  console.log(`tournois.json : ${bilan.total} tournois, ${bilan.valides} valides, ${bilan.invalides} ignorés` + (bilan.doublons ? `, ${bilan.doublons} doublons fusionnés` : '') + '.');
  const mn = bilan.mis_a_null, rempli = k => lignes.filter(l => l[k] !== null).length;
  console.log(`Colonnes remplies sur ${lignes.length} lignes : nom ${rempli('nom')}, ville ${rempli('ville')}, categorie ${rempli('categorie')}, dep ${rempli('dep')}. Refusés et mis à null : nom ${mn.nom}, ville ${mn.ville}, categorie ${mn.categorie}, dep ${mn.dep}.`);
  if (bilan.exemples.length) console.log('Ignorés (exemples) : ' + bilan.exemples.join(' | '));
  if (mode) { await envoyer(lignes, env); return; }
  const fichiers = ecrire(lignes, dossier, date);
  console.log(`${fichiers.length} fichier(s) SQL écrit(s) dans ${dossier} (${TAILLE_PAQUET} lignes au plus chacun) : à coller dans l'ordre dans le SQL Editor de Supabase.`);
}

if (require.main === module) main().catch(e => { console.error(e); process.exit(1); });
module.exports = {lignesRef, sqlPaquet, paquets, jourValide, TAILLE_PAQUET};
