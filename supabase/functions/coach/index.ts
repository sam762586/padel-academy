// FONCTION SUPABASE « coach » : répond aux questions de padel d'un joueur connecté.
// - Connexion obligatoire (jeton de session Supabase), quota de LIMITE_JOUR questions par jour (table coach_usage,
//   fonctions SQL coach_consommer / coach_rembourser, appelées avec la clé de service) ; une question qui échoue est rendue.
// - La clé de l'API Claude reste ici (secret ANTHROPIC_API_KEY), jamais dans le site.
// Déploiement et secrets : supabase/LISEZMOI.md, section « Coach IA ».
import Anthropic from "npm:@anthropic-ai/sdk@1.3.0";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { CONNAISSANCES } from "./connaissances.ts";
import { LIMITE_JOUR, construireRequete, lireReponse, validerDemande } from "./logique.ts";

const ORIGINES = ["https://apprendre-padel.fr", "https://www.apprendre-padel.fr", "http://localhost:8000", "http://127.0.0.1:8000"];
const anthropic = new Anthropic(); // lit ANTHROPIC_API_KEY
const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

function entetes(origine: string | null): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origine && ORIGINES.includes(origine) ? origine : ORIGINES[0],
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Vary": "Origin",
  };
}

Deno.serve(async (req: Request) => {
  const h = entetes(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response("ok", { headers: h });
  const repondre = (statut: number, corps: Record<string, unknown>) =>
    new Response(JSON.stringify(corps), { status: statut, headers: { ...h, "Content-Type": "application/json" } });
  if (req.method !== "POST") return repondre(405, { erreur: "Méthode non autorisée." });

  const jeton = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const { data: session } = await admin.auth.getUser(jeton);
  const user = session?.user;
  if (!user) return repondre(401, { erreur: "Connecte-toi pour parler au coach." });

  let corps: unknown;
  try { corps = await req.json(); } catch { return repondre(400, { erreur: "Demande illisible." }); }
  const v = validerDemande(corps);
  if (!v.ok) return repondre(400, { erreur: v.message });

  const { data: restant, error } = await admin.rpc("coach_consommer", { p_user: user.id, p_limite: LIMITE_JOUR });
  if (error || typeof restant !== "number") return repondre(500, { erreur: "Le coach est indisponible pour le moment." });
  if (restant < 0) return repondre(429, { erreur: `Tu as posé tes ${LIMITE_JOUR} questions du jour. Le coach te retrouve demain.`, restant: 0 });
  const rendre = () => admin.rpc("coach_rembourser", { p_user: user.id });

  try {
    const params = construireRequete(v.demande, CONNAISSANCES) as unknown as Parameters<typeof anthropic.beta.messages.create>[0];
    const r = await anthropic.beta.messages.create(params) as unknown as Parameters<typeof lireReponse>[0];
    const lu = lireReponse(r);
    if (!lu.ok) { await rendre(); return repondre(200, { erreur: lu.message, restant: restant + 1 }); }
    return repondre(200, { reponse: lu.texte, restant });
  } catch (e) {
    await rendre();
    if (e instanceof Anthropic.RateLimitError) return repondre(503, { erreur: "Le coach est très demandé : réessaie dans une minute.", restant: restant + 1 });
    if (e instanceof Anthropic.APIError) {
      console.error("API Claude", e.status);
      return repondre(502, { erreur: "Le coach est indisponible pour le moment.", restant: restant + 1 });
    }
    console.error("coach", e instanceof Error ? e.name : "erreur");
    return repondre(500, { erreur: "Le coach est indisponible pour le moment.", restant: restant + 1 });
  }
});
