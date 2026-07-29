import Anthropic from "@anthropic-ai/sdk";
import type { Prospect } from "./supabase";

let client: Anthropic | null = null;

function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY doit être défini dans .env.local");
  }
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

export async function generatePitch(prospect: Prospect): Promise<string> {
  const anthropic = getClient();

  const facts = [
    `Nom : ${prospect.name}`,
    prospect.category ? `Activité : ${prospect.category}` : null,
    prospect.city ? `Ville : ${prospect.city}` : null,
    `Site web : ${prospect.has_website ? "oui" : "non"}`,
    prospect.rating ? `Note Google : ${prospect.rating}/5` : null,
    prospect.reviews_count !== null
      ? `Nombre d'avis : ${prospect.reviews_count}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 400,
    messages: [
      {
        role: "user",
        content: `Tu prépares un commercial qui va passer un appel à froid à cette entreprise :

${facts}

Rédige, en français, un pitch court pour l'appel :
1. Une phrase d'accroche (angle d'approche basé sur un fait concret ci-dessus, pas générique)
2. Un objectif d'appel clair et réaliste
3. Une objection probable et une réponse courte à lui opposer

Réponse en 5-6 lignes maximum, ton direct, pas de formules commerciales creuses.`,
      },
    ],
  });

  const textBlock = message.content.find((b) => b.type === "text");
  return textBlock && textBlock.type === "text" ? textBlock.text : "";
}
