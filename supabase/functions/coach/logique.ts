// Logique pure du coach IA (aucune dépendance) : validation de la demande, consignes, requête au modèle, lecture
// de la réponse. Testée par scripts/verifier-coach.cjs ; utilisée par index.ts (fonction Supabase « coach »).

export const MODELE = "claude-opus-5-5";
export const LIMITE_JOUR = 10;          // questions par joueur et par jour
export const MAX_QUESTION = 1000;       // caractères
export const MAX_TOURS = 8;             // derniers échanges renvoyés au modèle (questions + réponses)
export const MAX_TOUR = 4000;           // caractères par message de l'historique

export type Tour = { role: "user" | "assistant"; texte: string };
export type Contexte = {
  palier?: string;            // palier du test de niveau (« P250 »…)
  priorites?: string[];       // thèmes à travailler
  classement?: string;        // « 12 500e messieurs »
  matchs?: string;            // résumé des derniers matchs comptés
};
export type Demande = { question: string; historique: Tour[]; contexte: Contexte };

export const CONSIGNES = `Tu es le coach de padel du site Apprendre Padel (apprendre-padel.fr), un site indépendant écrit par Samuel, joueur de droite et compétiteur en P50/P100 en Normandie. Tu réponds aux joueurs amateurs, du débutant au P500, comme un entraîneur expérimenté qui connaît le jeu de haut niveau.

Manière de répondre :
- En français, en tutoyant, simplement et concrètement : le geste, le placement, la décision, et un exercice ou un repère mesurable quand c'est utile.
- Court par défaut (environ 150 mots), plus long seulement si la question le demande. Pas de titres ; une courte liste si elle aide.
- Appuie-toi d'abord sur le contenu du site fourni ci-dessous. Quand une page du site traite le sujet, donne son adresse complète (https://apprendre-padel.fr/…) pour approfondir. Si le site ne couvre pas la question, réponds avec ta connaissance du padel et dis-le en une phrase.
- Le contexte du joueur (palier, priorités, classement, matchs) vient de ses propres saisies : sers-t'en pour adapter la réponse, sans le recopier.
- Règlement : pour un point de règle douteux ou récent, renvoie au règlement officiel FFT ou FIP. Prix des raquettes : indicatifs, relevés fin octobre 2026.
- Douleurs ou blessures : conseils de prudence généraux (arrêter, adapter le matériel), et oriente vers un médecin ou un kiné ; pas de diagnostic.
- Questions sans rapport avec le padel ou le sport de raquette : réponds en une phrase que tu es là pour le padel.`;

const nettoyer = (s: unknown, max: number): string =>
  typeof s === "string" ? s.replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, "").trim().slice(0, max) : "";

export function validerDemande(corps: unknown): { ok: true; demande: Demande } | { ok: false; message: string } {
  if (!corps || typeof corps !== "object") return { ok: false, message: "Demande vide." };
  const c = corps as Record<string, unknown>;
  const question = nettoyer(c.question, MAX_QUESTION + 1);
  if (!question) return { ok: false, message: "Pose ta question." };
  if (question.length > MAX_QUESTION) return { ok: false, message: `Question trop longue (${MAX_QUESTION} caractères au maximum).` };
  const historique: Tour[] = (Array.isArray(c.historique) ? c.historique : [])
    .filter((t): t is Record<string, unknown> => !!t && typeof t === "object")
    .map(t => ({ role: t.role === "assistant" ? "assistant" as const : "user" as const, texte: nettoyer(t.texte, MAX_TOUR) }))
    .filter(t => t.texte)
    .slice(-MAX_TOURS);
  // L'historique doit commencer par une question du joueur
  while (historique.length && historique[0].role !== "user") historique.shift();
  const x = (c.contexte && typeof c.contexte === "object" ? c.contexte : {}) as Record<string, unknown>;
  const contexte: Contexte = {};
  const palier = nettoyer(x.palier, 30); if (palier) contexte.palier = palier;
  const classement = nettoyer(x.classement, 60); if (classement) contexte.classement = classement;
  const matchs = nettoyer(x.matchs, 400); if (matchs) contexte.matchs = matchs;
  if (Array.isArray(x.priorites)) {
    const p = x.priorites.map(v => nettoyer(v, 60)).filter(Boolean).slice(0, 5);
    if (p.length) contexte.priorites = p;
  }
  return { ok: true, demande: { question, historique, contexte } };
}

export function texteContexte(c: Contexte): string {
  const l: string[] = [];
  if (c.palier) l.push("Palier au test de niveau : " + c.palier);
  if (c.priorites) l.push("Priorités du test : " + c.priorites.join(", "));
  if (c.classement) l.push("Classement FFT déclaré : " + c.classement);
  if (c.matchs) l.push("Derniers matchs comptés : " + c.matchs);
  return l.length ? "<contexte_joueur>\n" + l.join("\n") + "\n</contexte_joueur>\n\n" : "";
}

// Paramètres de la requête : consignes et contenu du site d'abord (identiques à chaque appel, donc mis en cache),
// puis l'échange. L'historique est renvoyé en texte seul (sans blocs de réflexion), ce que l'API accepte.
export function construireRequete(d: Demande, connaissances: string) {
  const messages = d.historique.map(t => ({ role: t.role, content: t.texte }));
  messages.push({ role: "user", content: texteContexte(d.contexte) + d.question });
  return {
    model: MODELE,
    max_tokens: 4000,
    output_config: { effort: "low" },
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: [
      { type: "text", text: CONSIGNES },
      { type: "text", text: connaissances, cache_control: { type: "ephemeral" } },
    ],
    messages,
  };
}

type Bloc = { type: string; text?: string };
export function lireReponse(r: { stop_reason?: string | null; content?: Bloc[] }): { ok: true; texte: string } | { ok: false; message: string } {
  if (r.stop_reason === "refusal") return { ok: false, message: "Le coach ne peut pas répondre à cette question. Reformule-la autour de ton jeu de padel." };
  const texte = (r.content || []).filter(b => b.type === "text" && typeof b.text === "string").map(b => b.text).join("").trim();
  if (!texte) return { ok: false, message: "Le coach n'a pas pu répondre. Réessaie dans un instant." };
  return { ok: true, texte: r.stop_reason === "max_tokens" ? texte + " […]" : texte };
}
