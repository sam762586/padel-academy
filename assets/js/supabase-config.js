/* CONFIG SUPABASE
   L'URL du projet et la clé « anon » sont PUBLIQUES par conception : elles sont visibles par
   n'importe quel visiteur dans le navigateur. La sécurité ne repose pas sur le secret de cette clé
   mais sur les règles RLS (Row Level Security) définies dans supabase/schema.sql :
   chaque joueur ne peut lire et modifier que ses propres lignes.
   NE JAMAIS mettre ici la clé « service_role » (elle, est secrète).
   Tant que ces deux valeurs sont vides, les comptes sont désactivés et le site fonctionne comme avant. */
window.PA_SUPABASE = { url: "https://bvhfizdfgccrkhdfqzkf.supabase.co", anonKey: "sb_publishable_HEqA8dPV_WX4FPtJwN_riw_4HgjgkRB" }; // clé « publishable » (équivalent moderne de la clé anon), projet padel-academy, région eu-west-1
