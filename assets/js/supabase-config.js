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
//   "communaute"  : migrations 2026-10-26-t4-*.sql (« J'y vais », annonces et avis sur les fiches tournois)
window.PA_SUPABASE.activees = [];
