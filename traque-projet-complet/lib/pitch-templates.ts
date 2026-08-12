import type { Prospect } from "./supabase";

// Génération de pitch 100% gratuite : pas d'appel API, juste des templates
// remplis avec les données scrapées. Moins fin qu'un texte généré par IA,
// mais suffisant pour démarrer sans budget. Le jour où tu factures des
// clients, remplace cette fonction par un appel à lib/anthropic.ts
// (déjà prêt, juste désactivé pour l'instant faute de moyen de paiement).

function accroche(p: Prospect): string {
  if (!p.has_website) {
    return `J'ai vu que ${p.name} n'a pas encore de site — vous devez perdre pas mal de monde qui vous cherche sur Google.`;
  }
  const reviews = p.reviews_count ?? 0;
  if (reviews > 0 && reviews < 10) {
    return `J'ai vu ${p.name} sur Google Maps, vous avez très peu d'avis pour une activité comme la vôtre — c'est souvent le premier frein pour les nouveaux clients.`;
  }
  if (p.rating && p.rating >= 3.5 && p.rating < 4.7) {
    return `J'ai vu ${p.name} sur Google Maps, vous avez une bonne base (note à ${p.rating}/5) mais votre présence en ligne pourrait clairement en ramener plus.`;
  }
  return `J'ai repéré ${p.name} en cherchant des ${p.category ?? "professionnels"} sur ${p.city ?? "votre secteur"}.`;
}

function objectif(p: Prospect): string {
  if (!p.has_website) {
    return "Décrocher 10 minutes pour montrer ce qu'un site simple changerait pour eux.";
  }
  return "Décrocher un rendez-vous pour un audit rapide de leur présence en ligne.";
}

function objection(p: Prospect): { objection: string; reponse: string } {
  if (!p.has_website) {
    return {
      objection: "\"On a jamais eu besoin de site, le bouche-à-oreille suffit.\"",
      reponse:
        "\"Justement, un site sert à capter ceux qui n'ont pas encore entendu parler de vous — le bouche-à-oreille, on ne le remplace pas, on l'ajoute.\"",
    };
  }
  return {
    objection: "\"On a déjà un site, ça nous suffit.\"",
    reponse:
      "\"Avoir un site et être trouvé sont deux choses différentes — c'est justement ce qu'on peut vérifier ensemble en 10 minutes.\"",
  };
}

export function generatePitch(p: Prospect): string {
  const { objection: obj, reponse } = objection(p);
  return [
    `Accroche : ${accroche(p)}`,
    `Objectif de l'appel : ${objectif(p)}`,
    `Objection probable : ${obj}`,
    `Réponse : ${reponse}`,
  ].join("\n");
}
