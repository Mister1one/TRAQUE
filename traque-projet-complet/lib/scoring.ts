// Scoring d'opportunité — 0 à 100.
//
// IMPORTANT : ces règles supposent une offre "présence digitale" (site web,
// visibilité, réputation en ligne). Si tu vends autre chose, change les poids
// ci-dessous : c'est la seule chose à modifier, le reste (V1 dashboard) ne
// bouge pas. Chaque règle est indépendante et documentée.

export type ScoreInput = {
  hasWebsite: boolean;
  rating: number | null;
  reviewsCount: number | null;
  phone: string | null;
};

export type ScoreResult = {
  score: number;
  reasons: Record<string, number>;
};

export function scoreProspect(input: ScoreInput): ScoreResult {
  const reasons: Record<string, number> = {};

  // Pas de site web = opportunité forte si tu vends du web/digital.
  reasons.pas_de_site = input.hasWebsite ? 0 : 35;

  // Peu d'avis = visibilité faible, donc marge de progression claire à
  // montrer au prospect pendant l'appel.
  const reviews = input.reviewsCount ?? 0;
  if (reviews === 0) reasons.avis_quasi_inexistants = 20;
  else if (reviews < 10) reasons.peu_d_avis = 15;
  else if (reviews < 30) reasons.avis_moderes = 5;
  else reasons.avis_moderes = 0;

  // Une note correcte (mais pas excellente) veut dire que l'activité est
  // établie et sérieuse, donc solvable — sans être déjà optimisée partout.
  const rating = input.rating ?? 0;
  if (rating >= 3.5 && rating < 4.7) reasons.note_saine = 20;
  else if (rating >= 4.7) reasons.note_deja_excellente = 5;
  else if (rating > 0) reasons.note_fragile = 10;
  else reasons.pas_de_note = 0;

  // Un numéro joignable = contact direct possible, condition de base pour
  // l'appel à froid.
  reasons.contactable = input.phone ? 20 : 0;

  const score = Object.values(reasons).reduce((a, b) => a + b, 0);

  return { score: Math.min(100, score), reasons };
}
