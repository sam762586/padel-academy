/* Vérification du lot S2 et S2 bis (stabilisation, sécurité SQL) : supabase/migrations/2026-10-29-s2-*.sql
   1) contrôles statiques (toujours) : format des fichiers (un objet par fichier, tag $fn$, une instruction par ligne),
      search_path des fonctions, revoke/grant, contraintes NOT VALID sur les tables qui ont des données, plus de
      « using (true) » sur presences, user_id retiré de la lecture des avis, annonces et réponses, purge et pg_cron en
      commentaire, filtre JavaScript de référence identique (texte) au SQL, LISEZMOI ;
   2) Postgres en mémoire (pglite), si le module est disponible : schema.sql, schema-partenaires.sql, matchs, puis
      espace-02 et academie-01 à 03 (déjà en production, dans l'ordre réel), classements, quiz, t4 puis les fichiers s2
      (trois fois : relançables) ; Mon académie intacte après s2 (fonction, déclencheurs, règles, droits), et plusieurs joueurs (anciens, compte récent, e-mail non confirmé, ancien
      pseudo invalide, inactifs) + un visiteur + un admin : avis et annonces non falsifiables (tournois_ref), tournoi inconnu
      refusé, filtre de coordonnées (identique au filtre JS sur un corpus, sur tous les textes de tournois.json et sur des
      textes tirés au hasard), pseudo, droits par colonne, présences (fenêtre de 60 jours), quotas, signalements (par jour,
      masquage par comptes fiables), purge (dernière activité, y compris Mon académie), cascade.
   pglite n'est pas une dépendance du site : s'il n'est pas installé dans scripts/node_modules, la partie 2 est sautée
   (message « pglite absent »). Pour la lancer quand même : PA_PGLITE=<dossier contenant node_modules/@electric-sql/pglite>.
   Lancer depuis la racine du site : node scripts/verifier-securite-sql.cjs */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const racine = path.join(__dirname, '..');
const dossierMig = path.join(racine, 'supabase', 'migrations');
let nb = 0;
function ok(nom) { nb++; console.log('OK ' + nom); }
const lire = rel => fs.readFileSync(path.join(racine, rel), 'utf8').replace(/\r\n/g, '\n');
const mig = nom => fs.readFileSync(path.join(dossierMig, nom), 'utf8').replace(/\r\n/g, '\n');

/* ---- Filtre de coordonnées de référence côté navigateur : vrai si le texte CONTIENT un contact.
   Doit donner exactement le même résultat que « not public.message_sans_contact(texte) » (s2-24 et s2-25).
   C'est le code que communaute-tournoi.js et partenaires.js doivent reprendre (PA_DATE_HEURE, PA_CATEGORIE,
   PA_CHIFFRES_ZEROS, PA_CHIFFRES et la fonction, renommée contientContact). ---- */
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

const CONTACTS = [
  '06 12 34 56 78', '06.12.34.56.78', '06_12_34_56_78', '06/12/34/56/78', '0６ 1２ 34 56 78', '+33 6 12 34 56 78',
  '06​12​34​56​78', '0 6 1 2 3 4 5 6 7 8', '06🎾12🎾34🎾56🎾78', 'appelle 06 12 34 / 56 78',
  '06.12.34 56 78', 'le 12/11/26 06 12 34 56 78', '0612345678', 'Tel : 06-12-34-56-78', '20/11 06 12 34 56 78',
  '06 12 34 56 78 le 20/11', '06/12 34/56 78', '061234 5678',
  'jean@gmail.com', 'jean(at)gmail', 'jean arobase gmail', '＠jean', 'www.padel.fr', 'padel.fr', 'bit.ly/abc', 'linktr.ee/jean',
  'https://x', 'monsite point com', 'wa.me/336', 't.me/jean',
  'ajoute moi sur insta', 'mon snap : jean', 'Instagram jean', 'dispo sur discord', 'écris-moi sur Signal', 'telegram',
  'whatsapp', "what's app", 'w h a t s a p p', 'tik tok', 'INSTA', 'ｉｎｓｔａ', 'Gmail', 'mon fb messenger',
  // S2 bis : contournements trouvés le 29/10/2026
  '06 et 12 et 34 et 56 et 78', '06a12b34c56d78', '06 l2 34 56 78', '06/12/34 5678', '06.12.2034 5678', '06:12 23:45 67',
  '٠٦١٢٣٤٥٦٧٨', '०६१२३४५६७८', '06 ١٢ 34 ٥٦ 78', 'i n s t a', 's n a p', 'ig : jean', 't me jean', 'mon wtsp : jean',
  '06/12 23:45 67 89', '0 6 / 1 2 / 3 4 / 5 6 / 7 8', '06-12-34-56-78 dispo le 20/11 à 18h', 'appelle le 06 12 34 56 78 après 18h',
  '06 12 34 56 78 (P250)', 'zéro six : 06x12x34x56x78',
];
const PROPRES = [
  'Super tournoi, bien organisé, balles neuves.', 'Tableau relevé, on a perdu 6/4 3/6 10/8 en quart.',
  'Dispo le 12/11/2026 à 18:30, niveau P250.', 'Du 12/11/2026 au 13/11/2026, P500 messieurs', 'P250 12/11/2026 - 13/11/2026',
  'Rdv samedi 12, 18:30-20:00', 'On joue le 2026-11-12.', "Signaler un problème à l'organisation", 'Le snapback de mon partenaire',
  'Je cherche un partenaire côté gauche, 3 tournois par mois', 'Prix : 25 € par joueur, 1 000 € de dotation', 'Classement 1250e',
  'Merci au club.Combien de terrains ?', 'Jérémy', 'Padel_Fan.75', 'P25 26/10/26 18H MAISON PADEL', 'Tournoi Padel P250 - 27/10/2026',
  'P100H - FH Nanterre Mer 04/11/2026 17h-23h', '', 'Insta_jean est un pseudo', 'P100 141126', 'P250+45 20/11 17h',
  '12/11/2026 0612345', 'Le 20/11 à 18:30 puis le 21/11/2026', 'P100 14112026',
  // S2 bis : phrases réalistes de joueurs
  'Je joue à droite, niveau P100, dispo le 12/11 à 18h30', 'Cherche partenaire P250 + 45 ans', 'Dispo les 14 et 15/11, 2 tournois par mois',
  'Classé 1250e, je cherche un P500 le 22/11', 'Score 6/3 7/5, super ambiance', 'Rdv à 9h30, terrain 3', 'Tournoi du 14/11 au 15/11 de 9h à 18h',
  'Prix 30 € par paire, 4 terrains, 16 équipes', "J'ai 45 ans, je joue depuis 3 ans, 2 fois par semaine", 'Budget 150-200 € pour une raquette',
  'Il y a à boire et à manger, top', 'Cherche partenaire P100 ou P250 le 21/11 ou le 28/11, plutôt gauche',
  'Défaite 7/6 6/7 10/8 en demie, très bon niveau', 'Dispo samedi 14/11 de 9h à 12h et dimanche 15/11 de 14h à 18h',
  'Classé 3500e en P250, 2 victoires en P100 cette saison', 'P1000 du 12 au 14/12/2026, 32 paires', 'Joueur gaucher, 1m85, 82 kg, 10 ans de tennis',
  'On a fini 3e sur 16 paires, top !', "Tu peux t'inscrire jusqu'au 10/11 à 12h", "Rendez-vous 8h45 pour l'échauffement, début 9h15",
  'Cherche partenaire P100H+45 pour le 2v2 du 21/11/2026 à 9h', 'Je suis dispo, envoie-moi un message privé ici',
];
const PSEUDOS_OK = ['Jo', 'Jérémy', "D'Artagnan", 'D’Artagnan', 'Padel_Fan.75', 'Marie-Ève', 'Ana Lúcia', 'X'.repeat(30)];
const PSEUDOS_KO = ['x', '<b>bob</b>', 'Jean 06 12 34 56 78', 'jean.fr', 'insta', 'a@b', 'X'.repeat(31), 'Jo;drop', 'émoji🎾', 'Jo ٣٤', 'Léa०६', '  ', 'i n s t a'];

/* Textes tirés au hasard (graine fixe) : mêmes résultats en SQL et en JS, y compris sur des cas que personne n'a pensé à écrire */
function textesAleatoires(n) {
  let graine = 42;
  const hasard = () => (graine = (graine * 1103515245 + 12345) % 2147483648) / 2147483648;
  const morceaux = ['06', '12', '34', '5', '78', '2026', '26', '/', '.', ':', '-', ' ', ' ', 'h', 'h30', ' à ', ' de ', 'p250', 'p100h', '+45', '2v2', 'et', 'a', 'x', 'le ', '18:30', '12/11', '14/11/2026', '٣', '०', 'i n s', 'ig', ' - ', '–', '🎾', 'é', '250 ', '0', '9h', '  ', '1000 ', 's n a p'];
  const r = [];
  for (let i = 0; i < n; i++) { let s = ''; const k = 2 + Math.floor(hasard() * 9); for (let m = 0; m < k; m++) s += morceaux[Math.floor(hasard() * morceaux.length)]; r.push(s); }
  return r;
}

/* =============================== 1. Contrôles statiques =============================== */
function statique() {
  const fichiers = fs.readdirSync(dossierMig).filter(f => /^2026-10-29-s2-/.test(f)).sort();
  assert.equal(fichiers.length, 42, 'nombre de fichiers s2');
  fichiers.forEach((f, i) => {
    const n = String(i + 1).padStart(2, '0');
    assert.match(f, new RegExp('^2026-10-29-s2-' + n + '-[a-z0-9-]+\\.sql$'), f);
    const entete = i < 23 ? '-- S2 · ' + (i + 1) + '/23 — ' : '-- S2 bis · ' + (i + 1) + '/42 — ';
    assert.ok(mig(f).startsWith(entete), 'en-tête ' + f);
  });
  ok('42 fichiers s2 numérotés 01 à 42, un objet par fichier, en-tête « S2 · n/23 » puis « S2 bis · n/42 »');

  for (const f of fichiers) {
    const s = mig(f);
    const code = s.split('\n').filter(l => !/^\s*--/.test(l)).join('\n');
    assert.ok(!/\$\$/.test(code), '$$ hors commentaire : ' + f);
    assert.ok(!/\bbegin;|\bcommit;/i.test(code), 'transaction explicite : ' + f);
    const fonctions = code.match(/create or replace function[\s\S]*?\$fn\$;/g) || [];
    if (/create or replace function/.test(code)) assert.equal(fonctions.length, 1, 'une fonction par fichier : ' + f);
    for (const fn of fonctions) {
      assert.match(fn, /\nset search_path = public\nas \$fn\$\n/, 'search_path + tag $fn$ : ' + f);
      const corps = fn.split('$fn$')[1];
      // Une instruction par ligne : au plus un « ; » par ligne (hors chaînes)
      corps.split('\n').forEach(l => assert.ok((l.replace(/'[^']*'/g, "''").match(/;/g) || []).length <= 1, 'une instruction par ligne : ' + f + ' : ' + l));
      const nom = fn.match(/function public\.(\w+)\(/)[1];
      // Toute fonction sauf le filtre (utilisé par les CHECK) retire ses droits à « public »
      if (nom !== 'message_sans_contact') assert.match(code, new RegExp('revoke all on function public\\.' + nom + '\\([^)]*\\) from public'), 'revoke ' + nom);
    }
    // Pas de « using (true) » sauf la lecture publique de tournois_ref
    const vrais = code.match(/using \(true\)/g) || [];
    if (vrais.length) assert.ok(f.includes('tournois-ref') && vrais.length === 1, 'using (true) : ' + f);
  }
  ok('fonctions : tag $fn$, search_path = public, une instruction par ligne, droits retirés à public ; pas de $$ ni de begin/commit');

  // plpgsql lit la condition d'un IF jusqu'au premier THEN : un « case … then » non parenthésé casse la fonction
  for (const f of fs.readdirSync(dossierMig).filter(f => f.endsWith('.sql'))) {
    mig(f).split('\n').forEach(l => assert.ok(!/^\s*(if|elsif)\b(?:(?!\(case\b).)*\bcase\b/i.test(l), 'case non parenthésé dans un if : ' + f + ' : ' + l.trim()));
  }
  ok('aucune migration avec « if … case when … then » non parenthésé (erreur « syntax error at end of input »)');

  const s = n => mig(fichiers[n - 1]);
  assert.match(s(1), /id\s+text primary key check \(id ~ '\^\(FED_\)\?\[0-9\]\{1,12\}\$'\)/);
  assert.match(s(1), /enable row level security/);
  for (const op of ['select', 'insert', 'update', 'delete']) assert.match(s(1), new RegExp('create policy "tournois_ref_' + op + '"'));
  assert.match(s(1), /for insert to authenticated with check \(public\.est_admin\(\)\)/);
  ok('tournois_ref : identifiant Ten\'Up, RLS, lecture par tous, écriture admin (ou service, hors RLS)');

  assert.match(s(2), /t := lower\(normalize\(p_texte, NFKC\)\);/);
  assert.match(s(2), /immutable/);
  assert.match(s(3), /pseudo ~ '\^\[\[:alnum:\]À-ÖØ-öø-ÿ _\.''’-\]\{2,30\}\$' and public\.message_sans_contact\(pseudo\)\)\) not valid;/);
  assert.match(s(4), /annonces_tournoi_id_format check \(tournoi_id ~ '\^\(FED_\)\?\[0-9\]\{1,12\}\$'\) not valid;/);
  assert.match(s(4), /message_sans_contact\(tournoi_nom\) and public\.message_sans_contact\(tournoi_ville\) and public\.message_sans_contact\(tournoi_categorie\)\) not valid;/);
  assert.match(s(7), /avis_tournoi_id_format check \(tournoi_id ~ '\^\(FED_\)\?\[0-9\]\{1,12\}\$'\) not valid;/);
  assert.match(s(15), /check \(pg_column_size\(points\) < 50000 and pg_column_size\(format\) < 200\) not valid;/);
  assert.match(s(17), /pg_column_size\(reponses\) < 3000\) not valid;/);
  for (const n of [3, 4, 7, 15, 17, 27]) assert.match(s(n), /drop constraint if exists/);
  ok('contraintes ajoutées en NOT VALID (profiles, annonces, avis, matchs, quiz_results), relançables');

  assert.match(s(5), /security definer/);
  assert.match(s(5), /pg_advisory_xact_lock/);
  assert.match(s(5), /raise exception 'LIMITE_LIGNES'/);
  const limites = {10: ['avis', '50'], 14: ['presences', '200'], 16: ['matchs', '500'], 18: ['quiz_results', '100']};
  for (const [n, [table, maxi]] of Object.entries(limites)) assert.match(s(+n), new RegExp('before insert on public\\.' + table + ' for each row execute function public\\.limite_lignes_joueur\\(\'' + maxi + '\'\\);'));
  ok('quotas : avis 50, présences 200, matchs 500, quiz 100 (fonction commune, verrou contre les envois simultanés)');

  assert.match(s(8), /revoke all on public\.avis from anon;/);
  const grants = s(8).match(/grant select \(([^)]*)\) on public\.avis to (anon|authenticated);/g);
  assert.equal(grants.length, 2);
  grants.forEach(g => assert.ok(!/\buser_id\b/.test(g), 'user_id lisible : ' + g));
  assert.match(s(9), /returns uuid/);
  assert.match(s(9), /grant execute on function public\.mon_avis\(text\) to authenticated;/);
  assert.match(s(9), /revoke all on function public\.mon_avis\(text\) from public, anon;/);
  ok('avis : lecture par colonnes sans user_id (visiteurs et connectés), « mon avis » par mon_avis() réservé aux connectés');

  assert.match(s(11), /create policy "presences_select" on public\.presences for select to authenticated using \(user_id = auth\.uid\(\)\);/);
  assert.match(s(19), /interval '24 hours'/);
  assert.match(s(19), /if nb >= 10 then/);
  assert.match(s(20), /before insert on public\.signalements for each row/);
  assert.match(s(21), /before insert on public\.signalements_avis for each row/);
  assert.match(s(23), /interval '24 months'/);
  assert.match(s(23), /public\.purger_comptes_inactifs\(\)/);
  assert.match(s(23), /revoke all on function public\.purger_donnees\(\) from public, anon, authenticated;/);
  assert.match(s(23), /^-- select cron\.schedule\('purger-donnees'/m);
  assert.ok(!/^select cron/m.test(s(23)), 'pg_cron doit rester en commentaire');
  ok('présences lues par leur seul auteur, signalements 10 par 24 h, purge non exposée, pg_cron en commentaire');

  // --- S2 bis ---
  // N2 : chiffres non latins, filtre v3 identique (au texte près) à la référence JavaScript
  const liste = s(24).match(/translate\(p_texte, '([^']*)', repeat\('0123456789', (\d+)\)\)/);
  assert.ok(liste, 'translate de chiffres_ascii');
  assert.equal(liste[1], [...PA_CHIFFRES.keys()].join(''), 'liste des chiffres SQL = PA_CHIFFRES_ZEROS (JS)');
  assert.equal(+liste[2], PA_CHIFFRES_ZEROS.length);
  assert.match(s(24), /grant execute on function public\.chiffres_ascii\(text\) to anon, authenticated;/);
  const versSql = re => re.source.replace(/\[\^\\p\{L\}\\p\{N\}\]/g, '[^[:alnum:]]').replace(/\[\\p\{L\}\\p\{N\}\]/g, '[[:alnum:]]').replace(/\\\//g, '/');
  const corps25 = s(25);
  assert.ok(corps25.includes("t := regexp_replace(t, '" + versSql(PA_CATEGORIE) + "', ' ', 'g');"), 'PA_CATEGORIE différente du SQL');
  assert.ok(corps25.includes("t := regexp_replace(t, '" + versSql(PA_DATE_HEURE) + "', ' ', 'g');"), 'PA_DATE_HEURE différente du SQL');
  assert.ok(corps25.indexOf('t := public.chiffres_ascii(t);') < corps25.indexOf("if position('@'"), 'chiffres convertis avant tout contrôle');
  assert.ok(!/for i in/.test(corps25), 'une seule passe d\'effacement');
  assert.match(corps25, /regexp_matches\(t, '\[0-9\]\+\(\?:\[\^0-9\]\{1,4\}\[0-9\]\+\)\*', 'g'\)/);
  for (const mot of ['wtsp', 'ig', 'fb', 'insta', 'snap']) assert.ok(new RegExp('[|(]' + mot + '[|)]').test(corps25), mot);
  assert.match(corps25, /\\m\(t\|wa\)\[\^\[:alnum:\]\]\+me\\M/);
  ok('filtre v3 : chiffres non latins convertis d\'abord (même liste en SQL et en JS), une seule passe, expressions SQL = expressions JS au caractère près');

  assert.match(s(26), /public\.chiffres_ascii\(p_pseudo\) = p_pseudo/);
  assert.match(s(26), /public\.message_sans_contact\(p_pseudo\)/);
  assert.match(s(27), /add constraint profiles_pseudo_format check \(pseudo is null or public\.pseudo_valide\(pseudo\)\) not valid;/);
  for (const n of [29, 30, 31]) {
    assert.match(s(n), /if (not found or )?not public\.pseudo_valide\(profil\.pseudo\) then\n\s+raise exception 'PSEUDO_REQUIS';/, 'PSEUDO_REQUIS ' + n);
  }
  ok('pseudo : une seule définition (pseudo_valide), chiffres non latins refusés ; PSEUDO_REQUIS dans annonces, avis et présences');

  // N1 : annonces recopiées depuis tournois_ref
  for (const c of ['nom', 'ville', 'categorie', 'dep']) assert.match(s(28), new RegExp('add column if not exists ' + c + ' text check'));
  for (const c of ["raise exception 'TOURNOI_INCONNU'", 'new.tournoi_date_debut := ref.date_debut;', 'new.tournoi_date_fin := ref.date_fin;', 'new.tournoi_nom := ref.nom;', 'new.tournoi_ville := ref.ville;', 'new.tournoi_categorie := ref.categorie;', 'new.tournoi_dep := ref.dep;', "raise exception 'TEXTE_TOURNOI_INCORRECT'", 'public.avis_texte_correct(new.tournoi_nom)']) assert.ok(s(29).includes(c), c);
  assert.ok(s(29).indexOf('new.tournoi_date_fin := ref.date_fin;') < s(29).indexOf("raise exception 'TOURNOI_PASSE'"), 'TOURNOI_PASSE sur les dates recopiées');
  ok('annonces : tournoi connu obligatoire, dates (et nom, ville, catégorie, département si remplis) recopiés de tournois_ref, sinon filtre d\'insultes');

  // N5 : avis et signalements
  assert.match(s(30), /raise exception 'EMAIL_NON_CONFIRME'/);
  assert.match(s(30), /if compte\.created_at >= ref\.date_debut::timestamptz then\n\s+raise exception 'AVIS_COMPTE_RECENT';/);
  for (const n of [33, 34]) {
    assert.match(s(n), /u\.email_confirmed_at is not null and u\.created_at < now\(\) - interval '7 days'/);
    assert.match(s(n), /= \(masque(e)? or nb_fiables >= 3\)/);
  }
  ok('avis : compte créé avant le tournoi et e-mail confirmé ; masquage à 3 signaleurs fiables (7 jours, e-mail confirmé)');

  // N3 : purge
  assert.match(s(35), /to_regclass\('auth\.sessions'\) and attname = 'refreshed_at'/);
  assert.match(s(35), /to_regclass\('auth\.sessions'\) and attname = 'updated_at'/);
  assert.match(s(35), /to_regclass\('public\.profiles'\) and attname = 'updated_at'/);
  assert.match(s(35), /revoke all on function public\.comptes_inactifs\(\) from public, anon, authenticated;/);
  assert.match(s(36), /delete from auth\.users where id in \(select public\.comptes_inactifs\(\)\);/);
  assert.match(s(36), /revoke all on function public\.purger_comptes_inactifs\(\) from public, anon, authenticated;/);
  assert.match(s(35), /to_regclass\('public\.academie_niveaux'\) is not null/);
  assert.match(s(35), /to_regclass\('public\.academie_quiz'\) is not null/);
  ok('purge : dernière activité = connexion, session, profil ou ajout dans Mon académie (code défensif), comptage possible avant ; non exposée');

  // Compatibilité avec Mon académie (academie-01 à 03, en production) : aucune s2 ne redéfinit espace_limite_lignes ni
  // ne touche aux tables academie_* (seule s2-35 les lit) ; aucune fonction s2 ne porte le nom d'une fonction d'un autre lot
  // (hors t4), sauf les remplacements voulus des fonctions de la communauté.
  const nomsFonctions = txt => new Set((txt.match(/create or replace function public\.(\w+)\(/g) || []).map(x => x.match(/public\.(\w+)\(/)[1]));
  const autres = fs.readdirSync(dossierMig).filter(f => f.endsWith('.sql') && !/^2026-10-29-s2-/.test(f) && !/^2026-10-26-t4-/.test(f));
  const horsLot = new Set([...autres.map(mig), lire('supabase/schema.sql'), lire('supabase/schema-partenaires.sql')].flatMap(t => [...nomsFonctions(t)]));
  const REMPLACEES = new Set(['message_sans_contact', 'annonces_avant_insertion', 'signaler_annonce', 'purger_comptes_inactifs']);
  for (const f of fichiers) {
    for (const n of nomsFonctions(mig(f))) assert.ok(!horsLot.has(n) || REMPLACEES.has(n), 'fonction s2 en collision avec un autre lot : ' + n + ' (' + f + ')');
    const code = mig(f).split('\n').filter(l => !/^\s*--/.test(l)).join('\n');
    assert.ok(!/espace_limite_lignes/.test(code), 'espace_limite_lignes utilisée par ' + f);
    if (!f.includes('-s2-35-')) assert.ok(!/academie_/.test(code), 'table academie touchée par ' + f);
  }
  assert.ok(horsLot.has('espace_limite_lignes') && !horsLot.has('limite_lignes_joueur'));
  ok('Mon académie : aucune s2 ne redéfinit espace_limite_lignes ni ne touche academie_niveaux / academie_quiz (s2-35 les lit) ; pas de collision de noms de fonctions');

  // N7 : annonces et réponses sans user_id
  assert.match(s(32), /r\.date_fin >= current_date and r\.date_debut <= current_date \+ 60/);
  assert.match(s(38), /using \(user_id = auth\.uid\(\) or public\.est_auteur_annonce\(annonce_id\)\);/);
  for (const n of [39, 40]) {
    const g = s(n).match(/grant select \(([^)]*)\) on public\.(annonces|reponses) to authenticated;/);
    assert.ok(g && !/\buser_id\b/.test(g[1]), 'user_id lisible : ' + n);
    assert.match(s(n), /revoke all on public\.(annonces|reponses) from authenticated;/);
  }
  for (const n of [41, 42]) {
    assert.ok(!/\buser_id\b/.test(s(n).match(/returns table \(([^)]*)\)/)[1]), 'user_id renvoyé : ' + n);
    assert.match(s(n), /revoke all on function public\.mes_(annonces|reponses)\(\) from public, anon;/);
  }
  ok('annonces et réponses : lecture par colonnes sans user_id, mes_annonces() et mes_reponses(), règle des réponses sans lecture de annonces.user_id ; présences listées 60 jours avant');

  // Les fichiers remplacés le signalent
  for (const f of ['2026-10-26-t4-01-table-presences.sql', '2026-10-26-t4-02-fonction-presences-avant-insertion.sql', '2026-10-26-t4-07-table-avis.sql', '2026-10-26-t4-08-fonction-avis-avant-insertion.sql']) {
    assert.match(mig(f), /ATTENTION \(S2\)/, f);
  }
  for (const n of [2, 3, 6, 12, 13, 22]) assert.match(s(n), /ATTENTION \(S2 bis\)/, 's2-' + n);
  assert.match(mig('2026-10-26-t4-11-fonction-signaler-avis.sql'), /ATTENTION \(S2 bis\)/);
  assert.match(lire('supabase/schema-partenaires.sql'), /ATTENTION \(S2\)/);
  ok('t4, schema-partenaires.sql et s2 remplacés avertissent : ne pas les relancer seuls');

  const lisez = lire('supabase/LISEZMOI.md');
  fichiers.forEach(f => assert.ok(lisez.includes(f.replace(/\.sql$/, '')) || lisez.includes(f), 'LISEZMOI : ' + f));
  assert.match(lisez, /partenaires\.js` doit être en ligne AVANT `s2-39` et `s2-40`/);
  assert.match(lisez, /Ne pas activer `"communaute"`/);
  assert.match(lisez, /academie_niveaux/);
  for (const m of ['tournois_ref', 'presences_tournoi', 'mon_avis', 'mes_annonces', 'mes_reponses', 'comptes_inactifs', 'validate constraint', 'AVIS_COMPTE_RECENT', 'EMAIL_NON_CONFIRME', 'TEXTE_TOURNOI_INCORRECT']) assert.ok(lisez.includes(m), 'LISEZMOI : ' + m);
  assert.match(lisez, /select count\(\*\) from public\.comptes_inactifs\(\);/);
  ok('LISEZMOI : les 42 fichiers dans l\'ordre, remplissage de tournois_ref, changements du site, comptage avant purge, validation des contraintes');

  // Le filtre de référence JavaScript reconnaît le corpus
  CONTACTS.forEach(t => assert.equal(filtreJs(t), true, 'contact non détecté (JS) : ' + t));
  PROPRES.forEach(t => assert.equal(filtreJs(t), false, 'faux positif (JS) : ' + t));
  const tournois = JSON.parse(lire('assets/data/tournois.json')).tournois;
  const textes = textesTournois(tournois);
  const rejets = textes.filter(filtreJs);
  assert.deepEqual(rejets.slice(0, 5), [], 'textes de tournois.json refusés par le filtre');
  ok(`filtre JS de référence : ${CONTACTS.length} contacts détectés, ${PROPRES.length} textes propres et ${textes.length} textes de tournois.json acceptés`);
}
function textesTournois(tournois) {
  const s = new Set();
  for (const t of tournois) for (const k of ['nom', 'ville', 'categorie', 'club']) if (t[k]) s.add(String(t[k]));
  return [...s];
}

/* =============================== 2. Postgres en mémoire =============================== */
function trouverPglite() {
  const chemins = [__dirname, process.env.PA_PGLITE].filter(Boolean);
  try { return require(require.resolve('@electric-sql/pglite', {paths: chemins})); } catch (e) { return null; }
}

const SUPABASE = `
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create table auth.users (id uuid primary key, email text, created_at timestamptz not null default now(), last_sign_in_at timestamptz, email_confirmed_at timestamptz);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to anon, authenticated;
grant usage on schema public to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
`;
const uid = c => '00000000-0000-0000-0000-00000000000' + c;
const [A, B, C, D, E, F, G, H, J, K, L, M, N] = ['a', 'b', 'c', 'd', 'e', 'f', '1', '2', '3', '4', '5', '6', '7'].map(uid);

async function dynamique(PGlite) {
  const db = await PGlite.create();
  const exec = s => db.exec(s).catch(e => { e.message += '\n  dans : ' + s.slice(0, 160); throw e; });
  const q = (s, p) => db.query(s, p);
  async function comme(role, u, sql, params) {
    await exec(`reset role; select set_config('request.jwt.claim.sub', '${u || ''}', false); set role ${role};`);
    try { return await q(sql, params); } finally { await exec('reset role'); }
  }
  async function refuse(promesse, motif, nom) {
    let erreur = null;
    try { await promesse; } catch (e) { erreur = e; }
    assert.ok(erreur, 'aurait dû être refusé : ' + nom);
    assert.match(String(erreur.message), motif, nom + ' : ' + erreur.message);
  }

  await exec(SUPABASE);
  await exec(lire('supabase/schema.sql'));
  await exec(lire('supabase/schema-partenaires.sql'));
  await exec(mig('20261026_matchs.sql'));
  // Déjà en production (29/10/2026) : espace-02 puis Mon académie
  const ACADEMIE = ['2026-10-26-espace-02-fonction-limite-lignes.sql', '2026-10-27-academie-01-table-niveaux.sql', '2026-10-27-academie-02-table-quiz.sql', '2026-10-27-academie-03-triggers-limites.sql'];
  for (const f of ACADEMIE) await exec(mig(f));
  const etatAcademie = async () => (await q(`select
    (select md5(prosrc) from pg_proc where proname = 'espace_limite_lignes') fn,
    (select string_agg(tgname || ':' || tgfoid::regproc::text, ',' order by tgname) from pg_trigger where tgrelid in ('public.academie_niveaux'::regclass, 'public.academie_quiz'::regclass) and not tgisinternal) trg,
    (select string_agg(policyname || ':' || cmd || ':' || coalesce(qual, '') || ':' || coalesce(with_check, ''), ',' order by policyname) from pg_policies where tablename like 'academie_%') pol,
    (select string_agg(grantee || ':' || privilege_type || ':' || table_name, ',' order by grantee, privilege_type, table_name) from information_schema.role_table_grants where table_name like 'academie_%') dr,
    (select string_agg(conname, ',' order by conname) from pg_constraint where conrelid in ('public.academie_niveaux'::regclass, 'public.academie_quiz'::regclass)) con`)).rows[0];
  const academieAvant = await etatAcademie();
  for (const f of fs.readdirSync(dossierMig).filter(f => /^2026-10-26-(classements|quiz|t4)-/.test(f)).sort()) await exec(mig(f));

  // Comptes « déjà en production » avant s2 :
  //   A, B, C anciens (1 an), e-mail confirmé ; D inactif (connexion il y a 4 ans) ; E jamais connecté (créé il y a 4 ans) ;
  //   F compte récent ; G e-mail non confirmé ; H ancien pseudo invalide ; J inactif mais session rafraîchie il y a un mois ;
  //   K inactif mais profil modifié il y a un mois ; L inactif mais quiz de Mon académie il y a un mois ; M inactif mais
  //   niveau de Mon académie déclaré il y a un mois ; N inactif, dernier niveau de Mon académie il y a 4 ans.
  await exec(`insert into auth.users (id, email, created_at, last_sign_in_at, email_confirmed_at) values
    ('${A}','a@t.fr', now() - interval '1 year', now(), now() - interval '1 year'), ('${B}','b@t.fr', now() - interval '1 year', now(), now() - interval '1 year'),
    ('${C}','c@t.fr', now() - interval '1 year', now(), now() - interval '1 year'), ('${D}','d@t.fr', now() - interval '5 years', now() - interval '4 years', now() - interval '5 years'),
    ('${E}','e@t.fr', now() - interval '4 years', null, null), ('${F}','f@t.fr', now(), now(), now()), ('${G}','g@t.fr', now() - interval '1 year', now(), null),
    ('${H}','h@t.fr', now() - interval '1 year', now(), now() - interval '1 year'), ('${J}','j@t.fr', now() - interval '5 years', now() - interval '4 years', now() - interval '5 years'),
    ('${K}','k@t.fr', now() - interval '5 years', now() - interval '4 years', now() - interval '5 years'),
    ('${L}','l@t.fr', now() - interval '5 years', now() - interval '4 years', now() - interval '5 years'), ('${M}','m@t.fr', now() - interval '5 years', now() - interval '4 years', now() - interval '5 years'),
    ('${N}','n@t.fr', now() - interval '5 years', now() - interval '4 years', now() - interval '5 years')`);
  await exec(`insert into public.academie_quiz (user_id, cle, niveau, debut, fin, score, total, reponses, created_at) values ('${L}', 's-abcd1234-1', 5, now() - interval '1 month', now() - interval '1 month', 1, 1, '[{"id":"q1","choix":0,"juste":true}]', now() - interval '1 month');
    insert into public.academie_niveaux (user_id, niveau, choisi_le, created_at) values ('${M}', 4, now() - interval '1 month', now() - interval '1 month'), ('${N}', 3, now() - interval '4 years', now() - interval '4 years');`);
  await exec(`update public.profiles set pseudo = '<b>ancien</b>' where id = '${D}'`);
  await exec(`update public.profiles set pseudo = '<b>h</b>' where id = '${H}'`);
  await comme('authenticated', H, 'select public.accepter_charte(1::smallint)');
  await exec(`update public.profiles set updated_at = now() - interval '4 years' where id in ('${D}','${E}','${J}','${L}','${M}','${N}')`);
  await exec(`update public.profiles set updated_at = now() - interval '1 month' where id = '${K}'`);
  // Annonce d'avant s2 avec un identifiant libre ; insérée sans déclencheurs (le rôle postgres n'a pas d'auth.uid())
  await exec(`set session_replication_role = replica`);
  await exec(`insert into public.annonces (user_id, tournoi_id, tournoi_nom, tournoi_date_debut, tournoi_date_fin, pseudo, sexe) values ('${D}', 'ancien-id', 'Ancien', current_date, current_date, 'x', 'mixte')`);
  await exec(`set session_replication_role = origin`);

  const fichiers = fs.readdirSync(dossierMig).filter(f => /^2026-10-29-s2-/.test(f)).sort();
  for (const f of fichiers) await exec(mig(f));
  for (const f of fichiers) await exec(mig(f));
  const politiques = (await q(`select count(*)::int n from pg_policies where tablename in ('tournois_ref','presences','avis','reponses','annonces')`)).rows[0].n;
  for (const f of fichiers) await exec(mig(f));
  assert.equal((await q(`select count(*)::int n from pg_policies where tablename in ('tournois_ref','presences','avis','reponses','annonces')`)).rows[0].n, politiques);
  assert.equal((await q(`select pseudo from public.profiles where id = '${D}'`)).rows[0].pseudo, '<b>ancien</b>');
  assert.equal((await q(`select count(*)::int n from public.annonces where tournoi_id = 'ancien-id'`)).rows[0].n, 1);
  ok('pglite : schémas, Mon académie (production), t4 puis les 42 fichiers s2 exécutés trois fois sans erreur ; anciennes lignes conservées (NOT VALID)');

  // Mon académie après s2 : fonction, déclencheurs, règles, droits et contraintes inchangés ; fonctionne comme avant
  assert.deepEqual(await etatAcademie(), academieAvant, 'Mon académie modifiée par s2');
  assert.match(academieAvant.trg, /academie_niveaux_limite:espace_limite_lignes,academie_quiz_limite:espace_limite_lignes/);
  await comme('authenticated', A, `insert into public.academie_niveaux (user_id, niveau, choisi_le) values (auth.uid(), 6, now())`);
  await refuse(comme('authenticated', A, `insert into public.academie_niveaux (user_id, niveau, choisi_le) values ($1, 6, now())`, [B]), /row-level security/, 'académie : ligne d\'un autre');
  assert.equal((await comme('authenticated', B, 'select count(*)::int n from public.academie_niveaux')).rows[0].n, 0);
  assert.equal((await comme('anon', null, 'select count(*)::int n from public.academie_niveaux')).rows[0].n, 0);
  await comme('authenticated', A, `insert into public.academie_niveaux (user_id, niveau, choisi_le) select auth.uid(), 5, now() + make_interval(mins => g) from generate_series(1, 299) g`);
  await refuse(comme('authenticated', A, `insert into public.academie_niveaux (user_id, niveau, choisi_le) values (auth.uid(), 6, now() - interval '1 day')`), /LIMITE_LIGNES/, 'académie : 301e niveau');
  ok('pglite : Mon académie intacte après s2 (espace_limite_lignes, déclencheurs, règles, droits, contraintes) ; chacun ses lignes, 300 au plus');

  // Filtre SQL = filtre JS de référence (corpus + tous les textes de tournois.json + textes tirés au hasard)
  const tournois = JSON.parse(lire('assets/data/tournois.json')).tournois;
  const aleatoires = textesAleatoires(5000);
  const corpus = [...CONTACTS, ...PROPRES, ...textesTournois(tournois), ...aleatoires];
  const sqlRes = (await q('select x, not public.message_sans_contact(x) as contact from unnest($1::text[]) with ordinality as u(x, n) order by n', [corpus])).rows;
  sqlRes.forEach((r, i) => assert.equal(r.contact, filtreJs(corpus[i]), 'SQL et JS divergent : ' + JSON.stringify(corpus[i])));
  CONTACTS.forEach((t, i) => assert.equal(sqlRes[i].contact, true, 'contact non détecté (SQL) : ' + t));
  PROPRES.forEach((t, i) => assert.equal(sqlRes[CONTACTS.length + i].contact, false, 'faux positif (SQL) : ' + t));
  const nbAlea = aleatoires.filter(filtreJs).length;
  assert.ok(nbAlea > 100 && nbAlea < aleatoires.length - 100, 'textes au hasard : mélange de refus et d\'acceptations');
  assert.equal((await q(`select public.chiffres_ascii('٠٦ ०६ ০৬ ๐๖ 𑁦𑁬') as t`)).rows[0].t, '06 06 06 06 06');
  ok(`pglite : message_sans_contact identique au filtre JS sur ${corpus.length} textes (dont ${aleatoires.length} au hasard) ; contournements refusés, phrases de joueurs et tournois.json acceptés`);

  // Profils : pseudo
  await exec(`select set_config('request.jwt.claim.sub', '', false)`);
  for (const p of PSEUDOS_OK) await comme('authenticated', A, 'update public.profiles set pseudo = $1 where id = auth.uid()', [p]);
  for (const p of PSEUDOS_KO) await refuse(comme('authenticated', A, 'update public.profiles set pseudo = $1 where id = auth.uid()', [p]), /profiles_pseudo_(format|check)/, 'pseudo ' + p);
  for (const [u, p] of [[A, 'Alice'], [B, 'Bruno'], [C, 'Admin'], [F, 'Fanny'], [G, 'Gilles']]) {
    await comme('authenticated', u, 'update public.profiles set pseudo = $1 where id = auth.uid()', [p]);
    await comme('authenticated', u, 'select public.accepter_charte(1::smallint)');
  }
  await exec(`update public.profiles set is_admin = true where id = '${C}'`);
  ok('pglite : pseudo 2 à 30 caractères (accents, apostrophes) ; balises, coordonnées, emoji, chiffres non latins et espaces seuls refusés');

  // tournois_ref
  await exec(`insert into public.tournois_ref (id, club, date_debut, date_fin) values
    ('100', 'CLUB FINI', current_date - 10, current_date - 5), ('101', 'CLUB EN COURS', current_date - 1, current_date + 1),
    ('102', 'CLUB FUTUR', current_date + 10, current_date + 11), ('FED_82670679', 'COMITE', current_date - 1, current_date + 1),
    ('103', 'CLUB LOINTAIN', current_date + 90, current_date + 91);
    insert into public.tournois_ref (id, club, date_debut, date_fin, nom, ville, categorie, dep) values ('110', 'CLUB LYON', current_date + 5, current_date + 6, 'P250 OPEN LYON', 'LYON', 'P250', '69');
    insert into public.tournois_ref (id, club, date_debut, date_fin) select g::text, 'CLUB ' || g, current_date - 1, current_date + 30 from generate_series(1000, 1300) g;`);
  assert.equal((await comme('anon', null, `select club, nom from public.tournois_ref where id = '110'`)).rows[0].nom, 'P250 OPEN LYON');
  await refuse(comme('authenticated', B, `insert into public.tournois_ref (id, club, date_debut, date_fin) values ('5', 'X', current_date, current_date)`), /row-level security/, 'tournois_ref par un joueur');
  await refuse(comme('anon', null, `insert into public.tournois_ref (id, club, date_debut, date_fin) values ('5', 'X', current_date, current_date)`), /permission denied/, 'tournois_ref par un visiteur');
  assert.equal((await comme('authenticated', B, `update public.tournois_ref set club = 'PIRATE' where id = '101'`)).affectedRows, 0);
  await comme('authenticated', C, `insert into public.tournois_ref (id, club, date_debut, date_fin) values ('5', 'ADMIN', current_date, current_date)`);
  await refuse(q(`insert into public.tournois_ref (id, club, date_debut, date_fin) values ('abc', 'X', current_date, current_date)`), /check constraint/, 'identifiant non Ten\'Up');
  await refuse(q(`insert into public.tournois_ref (id, club, date_debut, date_fin, dep) values ('6', 'X', current_date, current_date, 'abcd')`), /check constraint/, 'département trop long');
  // Format attendu du générateur (robot-tournois) : 8 colonnes, on conflict (id)
  await exec(`insert into public.tournois_ref (id, club, date_debut, date_fin, nom, ville, categorie, dep) values ('7', 'L''ARÈNE', '2026-11-01', '2026-11-02', 'P100 L''ARÈNE', 'ST LOUIS', 'P100', '2A'), ('8', 'X', '2026-11-01', '2026-11-01', 'P25', null, null, null)
    on conflict (id) do update set club = excluded.club, date_debut = excluded.date_debut, date_fin = excluded.date_fin, nom = excluded.nom, ville = excluded.ville, categorie = excluded.categorie, dep = excluded.dep, maj = now()`);
  ok('pglite : tournois_ref (nom, ville, catégorie, département facultatifs) lisible par tous, écrite seulement par l\'admin ou le service ; format du générateur accepté');

  // Avis
  const avis = (u, id, extra = {}) => comme('authenticated', u,
    'insert into public.avis (user_id, tournoi_id, tournoi_date_debut, tournoi_date_fin, club, pseudo, organisation, niveau_reel, recommande, texte) values (auth.uid(), $1, $2, $3, $4, $5, 4, 3, true, $6)',
    [id, extra.debut || '2020-01-01', extra.fin || '2020-01-02', extra.club || 'FAUX CLUB', '-', extra.texte || '']);
  await avis(A, '101');
  const ligne = (await q(`select club, tournoi_date_debut::text d, tournoi_date_fin::text f, pseudo from public.avis where user_id = '${A}' and tournoi_id = '101'`)).rows[0];
  const ref = (await q(`select club, date_debut::text d, date_fin::text f from public.tournois_ref where id = '101'`)).rows[0];
  assert.deepEqual([ligne.club, ligne.d, ligne.f, ligne.pseudo], [ref.club, ref.d, ref.f, 'Alice']);
  await refuse(avis(A, '999999'), /TOURNOI_INCONNU/, 'avis sur tournoi inconnu');
  await refuse(avis(A, 'abc'), /TOURNOI_INCONNU|avis_tournoi_id_format/, 'avis identifiant libre');
  await refuse(avis(A, '102'), /TOURNOI_PAS_COMMENCE/, 'avis avant le tournoi');
  await refuse(avis(A, '1000', {texte: 'Mon insta : alice'}), /avis_texte_correct/, 'avis avec réseau social');
  await refuse(avis(A, '1000', {texte: 'Appelle le 06 et 12 et 34 et 56 et 78'}), /avis_texte_correct/, 'avis avec numéro entrecoupé');
  await refuse(avis(F, '101'), /AVIS_COMPTE_RECENT/, 'avis d\'un compte créé pendant le tournoi');
  await refuse(avis(G, '101'), /EMAIL_NON_CONFIRME/, 'avis d\'un compte sans e-mail confirmé');
  await refuse(avis(H, '101'), /PSEUDO_REQUIS/, 'avis avec un ancien pseudo invalide');
  await avis(A, 'FED_82670679');
  await avis(C, '100', {texte: 'Très bien organisé, dispo le 12/11 à 18h30 pour rejouer'});
  ok('pglite : avis — club et dates recopiés, tournoi inconnu ou futur refusé, texte filtré ; compte récent, e-mail non confirmé et pseudo invalide refusés');

  await refuse(comme('anon', null, 'select user_id from public.avis'), /permission denied/, 'user_id lisible par un visiteur');
  await refuse(comme('authenticated', B, 'select user_id from public.avis'), /permission denied/, 'user_id lisible par un joueur');
  await refuse(comme('authenticated', B, 'select * from public.avis'), /permission denied/, 'select * des avis');
  const publics = (await comme('anon', null, 'select id, tournoi_id, club, pseudo, organisation, niveau_reel, recommande, texte, created_at, tournoi_date_fin from public.avis')).rows;
  assert.deepEqual(publics.map(r => r.tournoi_id), ['100']);
  const vusParA = (await comme('authenticated', A, 'select id, tournoi_id from public.avis order by tournoi_id')).rows;
  assert.deepEqual(vusParA.map(r => r.tournoi_id), ['100', '101', 'FED_82670679']);
  const monId = (await comme('authenticated', A, `select public.mon_avis('101') as id`)).rows[0].id;
  assert.equal(monId, vusParA.find(r => r.tournoi_id === '101').id);
  assert.equal((await comme('authenticated', B, `select public.mon_avis('101') as id`)).rows[0].id, null);
  await refuse(comme('anon', null, `select public.mon_avis('101')`), /permission denied/, 'mon_avis par un visiteur');
  assert.equal((await comme('authenticated', B, 'delete from public.avis where id = $1', [monId])).affectedRows, 0);
  ok('pglite : avis lisibles par colonnes sans user_id ; visiteur = avis des tournois finis ; mon_avis() pour l\'appelant seul');

  // Présences
  const jyvais = (u, id) => comme('authenticated', u, `insert into public.presences (user_id, tournoi_id, pseudo) values (auth.uid(), $1, '-')`, [id]);
  await jyvais(A, '1000');
  await jyvais(B, '1000');
  await jyvais(A, '101');
  await refuse(jyvais(A, '100'), /TOURNOI_TERMINE/, 'présence tournoi fini');
  await refuse(jyvais(A, '999999'), /TOURNOI_INCONNU/, 'présence tournoi inconnu');
  await refuse(jyvais(H, '1000'), /PSEUDO_REQUIS/, 'présence avec un ancien pseudo invalide');
  assert.deepEqual((await comme('authenticated', B, 'select user_id, tournoi_id from public.presences')).rows.map(r => r.user_id), [B]);
  const liste = (await comme('authenticated', B, `select * from public.presences_tournoi('1000')`)).rows;
  assert.deepEqual(liste.map(r => [r.pseudo, r.est_moi]), [['Alice', false], ['Bruno', true]]);
  assert.deepEqual(Object.keys(liste[0]).sort(), ['classement_p', 'est_moi', 'pseudo']);
  // Tournoi dans plus de 60 jours : chacun ne voit que sa propre ligne, le nombre reste public
  await jyvais(A, '103');
  await jyvais(C, '103');
  assert.deepEqual((await comme('authenticated', C, `select * from public.presences_tournoi('103')`)).rows.map(r => [r.pseudo, r.est_moi]), [['Admin', true]]);
  assert.deepEqual((await comme('authenticated', A, `select * from public.presences_tournoi('103')`)).rows.map(r => [r.pseudo, r.est_moi]), [['Alice', true]]);
  assert.deepEqual((await comme('authenticated', B, `select * from public.presences_tournoi('103')`)).rows, []);
  assert.equal((await comme('anon', null, `select public.nb_presences('103') as n`)).rows[0].n, 2);
  await exec(`update public.tournois_ref set date_debut = current_date + 59, date_fin = current_date + 60 where id = '103'`);
  assert.equal((await comme('authenticated', B, `select * from public.presences_tournoi('103')`)).rows.length, 2);
  await refuse(comme('anon', null, `select * from public.presences_tournoi('1000')`), /permission denied/, 'presences_tournoi par un visiteur');
  await refuse(comme('anon', null, 'select tournoi_id from public.presences'), /permission denied/, 'presences par un visiteur');
  assert.equal((await comme('anon', null, `select public.nb_presences('1000') as n`)).rows[0].n, 2);
  assert.equal((await comme('authenticated', A, `delete from public.presences where user_id = '${B}'`)).affectedRows, 0);
  ok('pglite : présences — chacun ne lit que les siennes ; liste des autres seulement pour un tournoi non terminé qui commence dans 60 jours ou moins ; compteur public');

  // Quotas
  await comme('authenticated', B, `insert into public.presences (user_id, tournoi_id, pseudo) select auth.uid(), g::text, '-' from generate_series(1001, 1198) g`);
  assert.equal((await q(`select count(*)::int n from public.presences where user_id = '${B}'`)).rows[0].n, 199);
  await jyvais(B, '1199');
  await refuse(jyvais(B, '1200'), /LIMITE_LIGNES/, '201e présence');
  await comme('authenticated', A, `insert into public.avis (user_id, tournoi_id, tournoi_date_debut, tournoi_date_fin, club, pseudo, organisation, niveau_reel, recommande) select auth.uid(), g::text, current_date, current_date, 'x', '-', 3, 3, true from generate_series(1000, 1046) g`);
  assert.equal((await q(`select count(*)::int n from public.avis where user_id = '${A}'`)).rows[0].n, 49);
  await avis(A, '1047');
  await refuse(avis(A, '1048'), /LIMITE_LIGNES/, '51e avis');
  const format = '{"egalite":"decisif","dernierSet":"set","serveur":"0"}';
  const match = (u, points) => comme('authenticated', u, `insert into public.matchs (user_id, joue_le, nom_a, nom_b, format, points, score) values (auth.uid(), now(), 'A', 'B', $1::jsonb, $2::jsonb, '6-4 6-4')`, [format, points]);
  const grand = JSON.stringify(Array.from({length: 1000}, () => ({g: 0, m: 'x'.repeat(60)})));
  await refuse(match(A, grand), /matchs_tailles/, 'points trop lourds');
  const normal = JSON.stringify(Array.from({length: 1000}, () => ({g: 1, m: 'gagnant'})));
  await match(A, normal);
  await comme('authenticated', A, `insert into public.matchs (user_id, joue_le, nom_a, nom_b, format, points, score) select auth.uid(), now(), 'A', 'B', $1::jsonb, '[{"g":0,"m":null}]'::jsonb, '6-0' from generate_series(1, 499)`, [format]);
  await refuse(match(A, '[{"g":0,"m":null}]'), /LIMITE_LIGNES/, '501e match');
  assert.equal((await comme('authenticated', B, 'select count(*)::int n from public.matchs')).rows[0].n, 0);
  const themes = ['vitre', 'service', 'aerien', 'couple', 'placement', 'montee', 'regularite', 'transition', 'communication', 'compet'];
  const reponses = pad => JSON.stringify(themes.map(t => ({theme: t, pts: 1, palier: 1, p: 'x'.repeat(pad)})));
  const quiz = (u, rep) => comme('authenticated', u, 'insert into public.quiz_results (user_id, score, niveau, palier, reponses) values (auth.uid(), 10, 1, 1, $1::jsonb)', [rep]);
  await refuse(quiz(A, reponses(400)), /quiz_results_reponses_taille/, 'réponses trop lourdes');
  await quiz(A, reponses(0));
  await comme('authenticated', A, 'insert into public.quiz_results (user_id, score, niveau) select auth.uid(), 0, 1 from generate_series(1, 99)');
  await refuse(quiz(A, reponses(0)), /LIMITE_LIGNES/, '101e résultat');
  ok('pglite : quotas — présences 200, avis 50, matchs 500 (points < 50 000 octets), quiz 100 (réponses < 3 000 octets)');

  // Annonces : tournoi de tournois_ref obligatoire, dates et textes recopiés
  const COLS_ANNONCE = 'id, tournoi_id, tournoi_nom, tournoi_date_debut, tournoi_date_fin, tournoi_ville, tournoi_dep, tournoi_categorie, pseudo, niveau_declare, classement_p, cote, sexe, message, statut, masquee, nb_signalements, created_at';
  const publier = (u, id, champs = {}) => comme('authenticated', u, `insert into public.annonces (user_id, tournoi_id, tournoi_nom, tournoi_date_debut, tournoi_date_fin, tournoi_ville, tournoi_dep, tournoi_categorie, pseudo, sexe, message) values (auth.uid(), $1, $2, $3, $4, $5, $6, $7, '-', 'mixte', $8) returning id`,
    [id, champs.nom || 'Tournoi Padel P250 - 27/10/2026', champs.debut || '2020-01-01', champs.fin || '2030-01-02', champs.ville || null, champs.dep || null, champs.categorie || null, champs.message || '']);
  for (const id of ['1100', '1101', '1102', '1103', '1104']) await publier(A, id);
  await publier(B, '110', {nom: 'PIRATE 06 12', ville: 'X', dep: '99', categorie: 'P25'});
  const copie = (await q(`select tournoi_nom, tournoi_ville, tournoi_categorie, tournoi_dep, tournoi_date_debut::text d, tournoi_date_fin::text f from public.annonces where user_id = '${B}' and tournoi_id = '110'`)).rows[0];
  const ref110 = (await q(`select nom, ville, categorie, dep, date_debut::text d, date_fin::text f from public.tournois_ref where id = '110'`)).rows[0];
  assert.deepEqual(Object.values(copie), Object.values(ref110));
  await publier(B, '1201', {dep: 'fdp', ville: 'Lyon'});
  const sansNom = (await q(`select tournoi_nom, tournoi_ville, tournoi_dep, tournoi_date_debut::text d from public.annonces where user_id = '${B}' and tournoi_id = '1201'`)).rows[0];
  assert.deepEqual([sansNom.tournoi_nom, sansNom.tournoi_ville, sansNom.tournoi_dep, sansNom.d], ['Tournoi Padel P250 - 27/10/2026', 'Lyon', null, (await q(`select (current_date - 1)::text d`)).rows[0].d]);
  await refuse(publier(B, '999999'), /TOURNOI_INCONNU/, 'annonce sur tournoi inconnu');
  await refuse(publier(B, 'abc'), /TOURNOI_INCONNU|annonces_tournoi_id_format/, 'annonce identifiant libre');
  await refuse(publier(B, '100'), /TOURNOI_PASSE/, 'annonce sur tournoi fini (dates de tournois_ref)');
  await refuse(publier(B, '1202', {nom: 'Tournoi des connards'}), /TEXTE_TOURNOI_INCORRECT/, 'annonce nom insultant');
  await refuse(publier(B, '1202', {nom: 'Tournoi wa.me/33612'}), /TEXTE_TOURNOI_INCORRECT|annonces_tournoi_sans_contact/, 'annonce nom avec contact');
  await refuse(publier(B, '1202', {message: 'mon snap : bruno'}), /annonces_message_sans_contact/, 'annonce message avec réseau');
  await refuse(publier(B, '1202', {message: 'Appelle 06a12b34c56d78'}), /annonces_message_sans_contact/, 'annonce message avec numéro entrecoupé');
  await refuse(publier(H, '1202'), /PSEUDO_REQUIS/, 'annonce avec un ancien pseudo invalide');
  ok('pglite : annonces — tournoi inconnu refusé, dates toujours recopiées, nom/ville/catégorie/département recopiés quand tournois_ref les a, sinon filtre d\'insultes ; pseudo invalide refusé');

  // Annonces et réponses : user_id illisible
  await refuse(comme('authenticated', B, 'select * from public.annonces'), /permission denied/, 'select * des annonces');
  await refuse(comme('authenticated', B, 'select user_id from public.annonces'), /permission denied/, 'user_id des annonces');
  await refuse(comme('anon', null, 'select id from public.annonces'), /permission denied/, 'annonces par un visiteur');
  const vuesB = (await comme('authenticated', B, `select ${COLS_ANNONCE} from public.annonces where tournoi_id like '110%' order by tournoi_id`)).rows;
  assert.deepEqual(vuesB.map(r => r.tournoi_id), ['110', '1100', '1101', '1102', '1103', '1104']);
  const mesB = (await comme('authenticated', B, 'select * from public.mes_annonces()')).rows;
  assert.deepEqual(mesB.map(r => r.tournoi_id).sort(), ['110', '1201']);
  assert.ok(!('user_id' in mesB[0]));
  assert.deepEqual(Object.keys(mesB[0]).sort(), COLS_ANNONCE.split(', ').sort());
  await refuse(comme('anon', null, 'select * from public.mes_annonces()'), /permission denied/, 'mes_annonces par un visiteur');
  await refuse(comme('authenticated', B, `insert into public.annonces (user_id, tournoi_id, tournoi_nom, tournoi_date_debut, tournoi_date_fin, pseudo, sexe) values (auth.uid(), '1203', 'X', current_date, current_date, '-', 'mixte') returning *`), /permission denied/, 'insert … returning * (select() sans colonnes)');
  const nouvelle = (await comme('authenticated', B, `insert into public.annonces (user_id, tournoi_id, tournoi_nom, tournoi_date_debut, tournoi_date_fin, pseudo, sexe) values (auth.uid(), '1203', 'X', current_date, current_date, '-', 'mixte') returning ${COLS_ANNONCE}`)).rows[0];
  assert.equal(nouvelle.pseudo, 'Bruno');
  assert.equal((await comme('authenticated', A, 'delete from public.annonces where id = $1', [nouvelle.id])).affectedRows, 0);
  assert.equal((await comme('authenticated', B, 'delete from public.annonces where id = $1', [nouvelle.id])).affectedRows, 1);
  const annonce1102 = (await q(`select id from public.annonces where user_id = '${A}' and tournoi_id = '1102'`)).rows[0].id;
  const rep = (await comme('authenticated', C, `insert into public.reponses (annonce_id, user_id, message) values ($1, auth.uid(), 'Dispo, je joue à gauche') returning id, annonce_id, pseudo, message, statut, message_retour, created_at`, [annonce1102])).rows[0];
  assert.equal(rep.pseudo, 'Admin');
  await refuse(comme('authenticated', C, `insert into public.reponses (annonce_id, user_id, message) values ($1, auth.uid(), 'x') returning *`, [annonce1102]), /permission denied/, 'réponse returning *');
  const recues = (await comme('authenticated', A, 'select id, annonce_id, pseudo, message, statut, message_retour, created_at from public.reponses where annonce_id = $1', [annonce1102])).rows;
  assert.deepEqual(recues.map(r => r.pseudo), ['Admin']);
  await refuse(comme('authenticated', A, 'select user_id from public.reponses'), /permission denied/, 'user_id des réponses');
  assert.equal((await comme('authenticated', B, 'select id from public.reponses')).rows.length, 0);
  const mesRepC = (await comme('authenticated', C, 'select * from public.mes_reponses()')).rows;
  assert.deepEqual(mesRepC.map(r => r.id), [rep.id]);
  assert.ok(!('user_id' in mesRepC[0]));
  assert.equal((await comme('authenticated', A, 'select * from public.mes_reponses()')).rows.length, 0);
  assert.equal((await comme('authenticated', A, 'select public.est_auteur_annonce($1) as v', [annonce1102])).rows[0].v, true);
  assert.equal((await comme('authenticated', C, 'select public.est_auteur_annonce($1) as v', [annonce1102])).rows[0].v, false);
  await comme('authenticated', A, `select public.repondre_decision($1, true, 'Ok !')`, [rep.id]);
  assert.equal((await comme('authenticated', C, 'select statut from public.mes_reponses()')).rows[0].statut, 'acceptee');
  ok('pglite : annonces et réponses lisibles par colonnes sans user_id ; mes_annonces() et mes_reponses() pour l\'appelant seul ; l\'auteur lit les réponses reçues ; returning * refusé');

  // Signalements : 10 par jour, annonces et avis confondus
  const annoncesA = (await q(`select id from public.annonces where user_id = '${A}' order by tournoi_id`)).rows.map(r => r.id);
  const avisA = (await q(`select id from public.avis where user_id = '${A}' order by tournoi_id limit 6`)).rows.map(r => r.id);
  for (const id of annoncesA) await comme('authenticated', B, `select public.signaler_annonce($1, 'autre')`, [id]);
  for (const id of avisA.slice(0, 5)) await comme('authenticated', B, `select public.signaler_avis($1, 'autre')`, [id]);
  await refuse(comme('authenticated', B, `select public.signaler_avis($1, 'autre')`, [avisA[5]]), /LIMITE_SIGNALEMENTS/, '11e signalement');
  await comme('authenticated', C, `select public.signaler_avis($1, 'autre')`, [avisA[5]]);
  await exec(`update public.signalements_avis set created_at = now() - interval '25 hours' where user_id = '${B}'`);
  await comme('authenticated', B, `select public.signaler_avis($1, 'autre')`, [avisA[5]]);
  ok('pglite : signalements — 10 par joueur sur 24 h (annonces + avis), les autres joueurs ne sont pas bloqués');

  // Masquage : seuls les signaleurs fiables (compte de plus de 7 jours, e-mail confirmé) comptent
  const avis1020 = (await q(`select id from public.avis where user_id = '${A}' and tournoi_id = '1020'`)).rows[0].id;
  const etatAvis = async () => (await q('select nb_signalements n, masque m from public.avis where id = $1', [avis1020])).rows[0];
  for (const [u, n] of [[F, 1], [G, 2], [B, 3], [C, 4]]) {
    assert.equal((await comme('authenticated', u, `select public.signaler_avis($1, 'faux') as n`, [avis1020])).rows[0].n, n);
    assert.deepEqual(await etatAvis(), {n, m: false}, 'avis masqué trop tôt');
  }
  await comme('authenticated', H, `select public.signaler_avis($1, 'faux')`, [avis1020]);
  assert.deepEqual(await etatAvis(), {n: 5, m: true});
  const annonce1101 = annoncesA[1];
  const etatAnnonce = async () => (await q('select nb_signalements n, masquee m from public.annonces where id = $1', [annonce1101])).rows[0];
  for (const u of [F, G, C]) await comme('authenticated', u, `select public.signaler_annonce($1, 'faux')`, [annonce1101]);
  assert.deepEqual(await etatAnnonce(), {n: 4, m: false});
  await comme('authenticated', H, `select public.signaler_annonce($1, 'faux')`, [annonce1101]);
  assert.deepEqual(await etatAnnonce(), {n: 5, m: true});
  ok('pglite : masquage automatique à 3 signaleurs fiables — comptes de moins de 7 jours et e-mails non confirmés comptés mais sans effet');

  // Purge
  for (const f of ['purger_donnees()', 'purger_comptes_inactifs()', 'comptes_inactifs()']) {
    await refuse(comme('authenticated', A, 'select public.' + f), /permission denied/, f + ' par un joueur');
    await refuse(comme('anon', null, 'select public.' + f), /permission denied/, f + ' par un visiteur');
  }
  const inactifs = async () => (await q('select array_agg(x order by x)::text[] l from public.comptes_inactifs() as x')).rows[0].l;
  assert.deepEqual(await inactifs(), [D, E, J, N].sort(), 'sans auth.sessions : connexion, profil et Mon académie');
  await exec(`create table auth.sessions (id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete cascade, created_at timestamptz, updated_at timestamptz, refreshed_at timestamp without time zone);
    insert into auth.sessions (user_id, created_at, updated_at, refreshed_at) values ('${J}', now() - interval '4 years', now() - interval '4 years', (now() - interval '1 month')::timestamp), ('${D}', now() - interval '4 years', now() - interval '4 years', null);`);
  assert.deepEqual(await inactifs(), [D, E, N].sort(), 'session rafraîchie récemment');
  await exec(`update auth.sessions set refreshed_at = null, updated_at = now() - interval '2 months' where user_id = '${J}'`);
  assert.deepEqual(await inactifs(), [D, E, N].sort(), 'session modifiée récemment (updated_at)');
  assert.equal((await q('select count(*)::int n from public.comptes_inactifs()')).rows[0].n, 3);
  await exec(`update public.tournois_ref set date_debut = current_date - 20, date_fin = current_date - 15 where id = '101'`);
  await exec(`update public.avis set created_at = now() - interval '25 months' where user_id = '${C}'`);
  const avant = (await q(`select (select count(*) from public.presences where tournoi_id = '101')::int p, (select count(*) from public.avis where user_id = '${C}')::int a, (select count(*) from auth.users)::int u`)).rows[0];
  assert.deepEqual(avant, {p: 1, a: 1, u: 13});
  const total = (await q('select public.purger_donnees() as n')).rows[0].n;
  const apres = (await q(`select (select count(*) from public.presences where tournoi_id = '101')::int p, (select count(*) from public.avis where user_id = '${C}')::int a, (select count(*) from auth.users)::int u, (select count(*) from public.profiles where id in ('${D}','${E}'))::int pr, (select count(*) from public.annonces where user_id = '${D}')::int an, (select count(*) from auth.users where id in ('${J}','${K}','${L}','${M}'))::int jk, (select count(*) from public.academie_niveaux where user_id = '${N}')::int acn, ((select count(*) from public.academie_niveaux where user_id = '${M}') + (select count(*) from public.academie_quiz where user_id = '${L}'))::int aclm`)).rows[0];
  assert.deepEqual(apres, {p: 0, a: 0, u: 10, pr: 0, an: 0, jk: 4, acn: 0, aclm: 2});
  assert.equal(total, 5);
  assert.equal((await q(`select count(*)::int n from public.presences where tournoi_id = '1000'`)).rows[0].n, 2);
  ok('pglite : purge — dernière activité = connexion, session (refreshed_at, updated_at), profil ou Mon académie ; comptes inactifs comptés puis supprimés (cascade) ; non appelable par le site');

  // Cascade
  await exec(`delete from auth.users where id = '${B}'`);
  const restes = (await q(`select (select count(*) from public.presences where user_id = '${B}')::int p, (select count(*) from public.signalements where user_id = '${B}')::int s, (select count(*) from public.signalements_avis where user_id = '${B}')::int sa, (select count(*) from public.profiles where id = '${B}')::int pr, (select count(*) from public.annonces where user_id = '${B}')::int an`)).rows[0];
  assert.deepEqual(restes, {p: 0, s: 0, sa: 0, pr: 0, an: 0});
  await exec(`delete from auth.users where id = '${A}'`);
  assert.equal((await q(`select (select count(*) from public.avis where user_id = '${A}') + (select count(*) from public.matchs where user_id = '${A}') + (select count(*) from public.quiz_results where user_id = '${A}') + (select count(*) from public.academie_niveaux where user_id = '${A}') + (select count(*) from public.reponses where annonce_id = '${annonce1102}') as n`)).rows[0].n, 0);
  ok('pglite : suppression d\'un compte = présences, annonces (et leurs réponses), avis, signalements, matchs, résultats, Mon académie effacés (cascade)');
  await db.close();
}

(async () => {
  statique();
  const pg = trouverPglite();
  if (!pg) {
    console.log('Note : pglite absent (scripts/node_modules/@electric-sql/pglite) : contrôles en Postgres en mémoire sautés.');
  } else {
    await dynamique(pg.PGlite);
  }
  console.log(`\n${nb} contrôles passés.`);
})().catch(e => { console.error(e); process.exitCode = 1; });
