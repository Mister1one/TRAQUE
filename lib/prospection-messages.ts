import type { Company } from "./supabase";

// Génère 2-3 angles d'approche par prospect, chacun décliné en script
// d'appel + SMS + email. 100% templates, pas d'appel API (voir
// lib/pitch-templates.ts pour la même logique côté anthropic.ts si besoin
// de brancher l'IA plus tard). Calculé à la volée à partir des données du
// scan, rien n'est stocké en base.

export type Canal = "appel" | "sms" | "email";

export type MessageAngle = {
  id: string;
  label: string;
  appel: string;
  sms: string;
  email: { objet: string; corps: string };
};

function hasWebsite(c: Company): boolean {
  return Boolean(c.website);
}

function reviewsCount(c: Company): number {
  return c.reviews_count ?? 0;
}

function ratingValue(c: Company): number {
  return c.rating ?? 0;
}

function lieu(c: Company): string {
  return c.city ? `à ${c.city}` : "dans le coin";
}

function activite(c: Company): string {
  return c.category ?? "professionnels";
}

function angle_pas_de_site(c: Company): MessageAngle {
  return {
    id: "pas_de_site",
    label: "Pas de site",
    appel: [
      `Accroche : J'ai vu que ${c.name} n'a pas de site actuellement — vous devez perdre du monde qui vous cherche sur Google.`,
      `Objectif de l'appel : décrocher 10 minutes pour montrer ce qu'un site simple changerait pour vous.`,
      `Objection probable : "On a jamais eu besoin de site, le bouche-à-oreille suffit."`,
      `Réponse : "Justement, un site sert à capter ceux qui n'ont pas encore entendu parler de vous — le bouche-à-oreille, on ne le remplace pas, on l'ajoute."`,
    ].join("\n"),
    sms: `Bonjour, je suis tombé sur ${c.name} en cherchant des ${activite(c)} ${lieu(c)}. Vous n'avez pas de site pour l'instant — ça vous fait sûrement perdre des clients qui vous cherchent sur Google. 10 min cette semaine pour vous montrer ce que ça changerait ?`,
    email: {
      objet: `Une question sur la visibilité de ${c.name}`,
      corps: `Bonjour,\n\nEn cherchant des ${activite(c)} ${lieu(c)}, je suis tombé sur ${c.name} — mais pas de site à votre nom. Aujourd'hui, une bonne partie de vos clients potentiels cherchent d'abord sur Google avant d'appeler.\n\nJe peux vous montrer en 10 minutes ce qu'un site simple changerait concrètement pour vous. Un créneau cette semaine vous conviendrait ?\n\nBien à vous.`,
    },
  };
}

function angle_aucun_avis(c: Company): MessageAngle {
  return {
    id: "aucun_avis",
    label: "Aucun avis",
    appel: [
      `Accroche : J'ai vu ${c.name} sur Google Maps, vous n'avez pas encore un seul avis — c'est souvent la première chose qui rassure un client qui ne vous connaît pas.`,
      `Objectif de l'appel : décrocher un audit rapide de la présence en ligne.`,
      `Objection probable : "Les avis, ça vient tout seul avec le temps."`,
      `Réponse : "Ça peut prendre des mois si on ne demande rien — un simple message après chaque intervention change tout, et c'est gratuit à mettre en place."`,
    ].join("\n"),
    sms: `Bonjour, j'ai vu ${c.name} sur Google Maps — pas encore d'avis sur votre fiche. C'est souvent ce qui manque pour rassurer un nouveau client. Je peux vous montrer une solution simple et gratuite, ça vous dit ?`,
    email: {
      objet: `${c.name} — pas encore d'avis sur Google`,
      corps: `Bonjour,\n\nEn regardant votre fiche Google Maps, j'ai remarqué que vous n'avez pas encore d'avis. C'est souvent le détail qui manque pour rassurer un client qui hésite entre deux prestataires.\n\nJe peux vous montrer en 10 minutes une méthode simple et gratuite pour changer ça. Un créneau cette semaine ?\n\nBien à vous.`,
    },
  };
}

function angle_peu_davis(c: Company): MessageAngle {
  const n = reviewsCount(c);
  return {
    id: "peu_davis",
    label: "Peu d'avis",
    appel: [
      `Accroche : J'ai vu ${c.name} sur Google Maps, vous avez seulement ${n} avis pour une activité comme la vôtre — c'est souvent le premier frein pour les nouveaux clients.`,
      `Objectif de l'appel : décrocher un audit rapide de la présence en ligne.`,
      `Objection probable : "On n'a pas le temps de courir après les avis."`,
      `Réponse : "On ne parle pas de courir après, juste d'un message automatique envoyé après chaque intervention — 5 minutes à mettre en place, une fois."`,
    ].join("\n"),
    sms: `Bonjour, je regardais les ${activite(c)} ${lieu(c)} et j'ai vu que vous avez seulement ${n} avis sur votre fiche Google. C'est souvent ce qui fait hésiter un client qui ne vous connaît pas encore. Je peux vous montrer une solution simple, ça vous dit ?`,
    email: {
      objet: `${c.name} — vos avis Google`,
      corps: `Bonjour,\n\nEn regardant votre fiche Google Maps, j'ai remarqué que vous avez seulement ${n} avis. Pour un client qui hésite entre deux prestataires, c'est souvent ce détail qui fait pencher la balance.\n\nJe peux vous montrer en 10 minutes une méthode simple pour en récolter plus, sans y passer du temps. Un créneau cette semaine ?\n\nBien à vous.`,
    },
  };
}

function angle_note_fragile(c: Company): MessageAngle {
  const r = ratingValue(c);
  return {
    id: "note_fragile",
    label: "Note à travailler",
    appel: [
      `Accroche : J'ai vu ${c.name} sur Google Maps, votre note (${r}/5) est en dessous de ce que la plupart des clients recherchent avant de choisir un pro.`,
      `Objectif de l'appel : proposer un point rapide sur la gestion de la réputation en ligne.`,
      `Objection probable : "On ne va pas changer les avis qu'on a déjà."`,
      `Réponse : "Non, mais on peut changer la tendance : répondre publiquement aux avis et en générer de nouveaux fait remonter la moyenne assez vite."`,
    ].join("\n"),
    sms: `Bonjour, je suis tombé sur ${c.name} sur Google Maps — votre note (${r}/5) freine sûrement des clients qui comparent avant d'appeler. Je peux vous montrer comment y remédier, 10 min cette semaine ?`,
    email: {
      objet: `${c.name} — votre note Google`,
      corps: `Bonjour,\n\nJ'ai vu votre fiche Google Maps : votre note actuelle (${r}/5) est en dessous de ce que regardent la plupart des clients avant de choisir un prestataire.\n\nJe peux vous montrer en 10 minutes une méthode simple pour redresser la tendance. Un créneau cette semaine ?\n\nBien à vous.`,
    },
  };
}

function angle_note_saine(c: Company): MessageAngle {
  const r = ratingValue(c);
  return {
    id: "note_saine",
    label: "Bonne note, marge de progression",
    appel: [
      `Accroche : J'ai vu ${c.name} sur Google Maps, vous avez une bonne base (note à ${r}/5) mais votre présence en ligne pourrait clairement en ramener plus.`,
      `Objectif de l'appel : décrocher un rendez-vous pour un audit rapide de la présence en ligne.`,
      `Objection probable : "On a déjà un site, ça nous suffit."`,
      `Réponse : "Avoir un site et être trouvé sont deux choses différentes — c'est justement ce qu'on peut vérifier ensemble en 10 minutes."`,
    ].join("\n"),
    sms: `Bonjour, je suis tombé sur ${c.name} sur Google Maps — belle note (${r}/5) ! Je voulais juste vérifier un point avec vous sur votre visibilité en ligne, 10 min cette semaine ?`,
    email: {
      objet: `${c.name} — un point rapide sur votre visibilité`,
      corps: `Bonjour,\n\nJ'ai vu votre fiche Google Maps, votre note (${r}/5) montre une activité sérieuse et établie. Ça m'a donné envie de vérifier un point avec vous : avoir une bonne réputation et être bien trouvé en ligne, ce n'est pas toujours la même chose.\n\nJe peux vous montrer en 10 minutes ce que ça donne concrètement pour vous. Un créneau cette semaine ?\n\nBien à vous.`,
    },
  };
}

function angle_note_excellente(c: Company): MessageAngle {
  const r = ratingValue(c);
  return {
    id: "note_excellente",
    label: "Très bonne note, sous-exploitée",
    appel: [
      `Accroche : J'ai vu ${c.name} sur Google Maps, votre note (${r}/5) est excellente — mais est-ce que ça se voit vraiment quand quelqu'un vous cherche en ligne ?`,
      `Objectif de l'appel : décrocher un rendez-vous pour vérifier si cette réputation est bien exploitée.`,
      `Objection probable : "On tourne déjà bien, pas besoin d'en faire plus."`,
      `Réponse : "C'est justement le bon moment : avec une note pareille, chaque nouveau client visible en ligne se convertit plus facilement — autant capitaliser dessus."`,
    ].join("\n"),
    sms: `Bonjour, superbe note sur Google (${r}/5) pour ${c.name} ! Je me demandais si elle était bien mise en avant quand on vous cherche en ligne. 10 min cette semaine pour en parler ?`,
    email: {
      objet: `${c.name} — capitaliser sur votre note Google`,
      corps: `Bonjour,\n\nJ'ai vu votre fiche Google Maps : une note de ${r}/5, c'est excellent. La question que je me pose : est-ce que cette réputation est aussi visible qu'elle le mérite quand un client vous cherche en ligne ?\n\nJe peux vous montrer en 10 minutes comment mieux l'exploiter. Un créneau cette semaine ?\n\nBien à vous.`,
    },
  };
}

function angle_preuve_sociale(c: Company): MessageAngle {
  return {
    id: "preuve_sociale",
    label: "Approche pairs du secteur",
    appel: [
      `Accroche : J'accompagne actuellement plusieurs ${activite(c)} ${lieu(c)} sur leur visibilité en ligne, et je voulais vous proposer la même chose.`,
      `Objectif de l'appel : décrocher un premier échange pour voir si ça peut vous être utile aussi.`,
      `Objection probable : "On ne vous connaît pas, difficile de se lancer comme ça."`,
      `Réponse : "Normal, c'est pour ça que je propose un premier échange sans engagement — vous jugerez sur pièce avant toute décision."`,
    ].join("\n"),
    sms: `Bonjour, j'accompagne plusieurs ${activite(c)} ${lieu(c)} sur leur visibilité en ligne en ce moment. Je vous propose la même chose : 10 min cette semaine pour en discuter ?`,
    email: {
      objet: `${c.name} — un accompagnement pour votre visibilité`,
      corps: `Bonjour,\n\nJ'accompagne actuellement plusieurs ${activite(c)} ${lieu(c)} sur leur présence en ligne, et je voulais vous proposer la même chose.\n\nJe serais curieux d'échanger 10 minutes avec vous cette semaine, sans engagement. Ça vous conviendrait ?\n\nBien à vous.`,
    },
  };
}

function angle_direct(c: Company): MessageAngle {
  return {
    id: "direct",
    label: "Direct",
    appel: [
      `Accroche : Je vous appelle directement : je propose un accompagnement sur la visibilité en ligne pour les ${activite(c)} ${lieu(c)}, et ${c.name} correspond à ce que je recherche.`,
      `Objectif de l'appel : savoir en 2 minutes si le sujet vous intéresse, sinon on en reste là.`,
      `Objection probable : "On me démarche tout le temps pour ça."`,
      `Réponse : "Je comprends, donnez-moi juste 2 minutes pour vous dire pourquoi c'est différent, et vous jugez ensuite."`,
    ].join("\n"),
    sms: `Bonjour, direct : je propose de l'accompagnement en visibilité en ligne pour les ${activite(c)} ${lieu(c)}. ${c.name} m'intéresse. 2 min pour en parler cette semaine ?`,
    email: {
      objet: `${c.name} — proposition directe`,
      corps: `Bonjour,\n\nJe vais droit au but : je propose un accompagnement sur la visibilité en ligne pour les ${activite(c)} ${lieu(c)}, et ${c.name} correspond à ce que je recherche.\n\nSi le sujet vous intéresse, un échange de 10 minutes cette semaine suffit pour voir si ça vaut le coup. Sinon, pas de souci.\n\nBien à vous.`,
    },
  };
}

function angle_generique(c: Company): MessageAngle {
  return {
    id: "generique",
    label: "Généraliste",
    appel: [
      `Accroche : J'ai repéré ${c.name} en cherchant des ${activite(c)} ${lieu(c)}.`,
      `Objectif de l'appel : décrocher un rendez-vous pour un audit rapide de la présence en ligne.`,
      `Objection probable : "On est déjà bien occupés, pas le temps pour ça."`,
      `Réponse : "Justement, l'idée c'est de vous faire gagner du temps sur les prochains clients, pas d'en prendre — 10 minutes suffisent pour voir si ça vaut le coup."`,
    ].join("\n"),
    sms: `Bonjour, je suis tombé sur ${c.name} en cherchant des ${activite(c)} ${lieu(c)}. Je fais un point rapide avec quelques pros du secteur sur leur visibilité en ligne — 10 min cette semaine, ça vous dit ?`,
    email: {
      objet: `${c.name} — un échange rapide`,
      corps: `Bonjour,\n\nJe suis tombé sur ${c.name} en cherchant des ${activite(c)} ${lieu(c)}. Je fais actuellement le point avec plusieurs professionnels du secteur sur leur présence en ligne.\n\nJe serais curieux d'échanger 10 minutes avec vous cette semaine, sans engagement. Ça vous conviendrait ?\n\nBien à vous.`,
    },
  };
}

function angle_generique_alt(c: Company): MessageAngle {
  return {
    id: "generique_alt",
    label: "Curiosité",
    appel: [
      `Accroche : Je fais un tour des ${activite(c)} ${lieu(c)} en ce moment, et ${c.name} en fait partie.`,
      `Objectif de l'appel : simplement vérifier comment vous gérez aujourd'hui la recherche de nouveaux clients en ligne.`,
      `Objection probable : "Pourquoi vous m'appelez, on n'a rien demandé."`,
      `Réponse : "Aucun souci, c'est juste un tour d'horizon — si ça ne vous intéresse pas après 2 minutes, on en reste là."`,
    ].join("\n"),
    sms: `Bonjour, je fais un tour rapide des ${activite(c)} ${lieu(c)} sur la partie visibilité en ligne. Vous auriez 2 minutes pour en parler cette semaine ?`,
    email: {
      objet: `Petite question pour ${c.name}`,
      corps: `Bonjour,\n\nJe fais actuellement un tour d'horizon rapide auprès des ${activite(c)} ${lieu(c)} sur la façon dont ils gèrent leur visibilité en ligne.\n\nAuriez-vous 10 minutes cette semaine pour en discuter, sans engagement de votre part ?\n\nBien à vous.`,
    },
  };
}

/**
 * Retourne 2 à 3 angles d'approche pertinents pour ce prospect, dans un
 * ordre de priorité (les plus spécifiques d'abord). Les angles "site" et
 * "avis" et "note" sont chacun mutuellement exclusifs (un seul déclenché
 * par prospect), donc au plus 3 angles spécifiques peuvent se cumuler. Le
 * reste est complété par un pool d'angles génériques (toujours
 * applicables, dans un ordre fixe) pour garantir au moins 2 angles même
 * pour un prospect "sans défaut apparent" (site + avis + note tous
 * corrects).
 */
export function buildMessageAngles(c: Company): MessageAngle[] {
  const specifics: MessageAngle[] = [];

  if (!hasWebsite(c)) specifics.push(angle_pas_de_site(c));

  const n = reviewsCount(c);
  if (n === 0) specifics.push(angle_aucun_avis(c));
  else if (n < 10) specifics.push(angle_peu_davis(c));

  const r = ratingValue(c);
  if (r > 0 && r < 3.5) specifics.push(angle_note_fragile(c));
  else if (r >= 3.5 && r < 4.7) specifics.push(angle_note_saine(c));
  else if (r >= 4.7) specifics.push(angle_note_excellente(c));

  const generics = [
    angle_generique(c),
    angle_preuve_sociale(c),
    angle_generique_alt(c),
    angle_direct(c),
  ];

  const result = [...specifics];
  for (const g of generics) {
    if (result.length >= 3) break;
    result.push(g);
  }

  return result.slice(0, 3);
}

export function canalLabel(canal: Canal): string {
  if (canal === "appel") return "Appel";
  if (canal === "sms") return "SMS";
  return "Email";
}

export function messageText(angle: MessageAngle, canal: Canal): string {
  if (canal === "appel") return angle.appel;
  if (canal === "sms") return angle.sms;
  return `Objet : ${angle.email.objet}\n\n${angle.email.corps}`;
}
