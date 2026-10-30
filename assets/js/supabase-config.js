/* CONFIG SUPABASE
   L'URL du projet et la clé « anon » sont PUBLIQUES par conception : elles sont visibles par
   n'importe quel visiteur dans le navigateur. La sécurité ne repose pas sur le secret de cette clé
   mais sur les règles RLS (Row Level Security) définies dans supabase/schema.sql :
   chaque joueur ne peut lire et modifier que ses propres lignes.
   NE JAMAIS mettre ici la clé « service_role » (elle, est secrète).
   Tant que ces deux valeurs sont vides, les comptes sont désactivés et le site fonctionne comme avant. */
window.PA_SUPABASE = { url: "https://bvhfizdfgccrkhdfqzkf.supabase.co", anonKey: "sb_publishable_HEqA8dPV_WX4FPtJwN_riw_4HgjgkRB" }; // clé « publishable » (équivalent moderne de la clé anon), projet padel-academy, région eu-west-1
// Fonctions dont le SQL a été exécuté dans Supabase (voir supabase/LISEZMOI.md). Tant qu'un nom manque ici,
// le site n'appelle pas les tables correspondantes (pas d'erreur 404 dans la console des visiteurs).
//   "favoris"     : migrations 2026-10-26-favoris-01 à 03 (étoiles des tournois synchronisées avec le compte)
//   "espace"      : migrations 2026-10-26-espace-01 à 06 (résultats, objectifs et rang synchronisés avec le compte)
//   "journal"     : migrations 2026-10-26-journal-01 à 03 (journal de matchs : partenaire, type, matchs saisis après coup)
//   "communaute"  : migrations 2026-10-26-t4-*.sql (« J'y vais », annonces et avis sur les fiches tournois)
//   "quiz2"       : migrations 2026-10-26-quiz-03 à 05 (test de niveau v2 enregistré dans le profil)
//   "progression" : migrations 2026-10-27-progression-01 et 02, avec "espace" (objectifs de jeu synchronisés)
//   "diagnostic"  : migrations 2026-10-27-diagnostic-01 et 02, avec "journal" (bilans après match dans le compte)
//   "academie"    : migrations 2026-10-27-academie-01 à 03, après "espace" (niveau déclaré et quiz de Mon académie)
window.PA_SUPABASE.activees = ["academie", "communaute", "quiz2"]; // academie : SQL appliqué le 29/10/2026 ; communaute : t4-01…12 et s2-01…42 appliqués et tournois_ref remplie le 30/10/2026 ; quiz2 : quiz-01…05 appliqués le 30/10/2026
// Bouton « Continuer avec Google » (connexion.html) : fournisseur Google configuré dans Supabase le 27/10/2026.
window.PA_SUPABASE.google = true;
