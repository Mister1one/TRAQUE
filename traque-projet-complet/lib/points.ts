export const POINTS = {
  prospect_source: 2,
  appel_logue: 5,
  rdv_obtenu: 30,
  vente: 100,
} as const;

export type ActionType = keyof typeof POINTS;

export const LEVELS = [
  { rank: 1, title: "Éclaireur", threshold: 0 },
  { rank: 2, title: "Traqueur", threshold: 150 },
  { rank: 3, title: "Chasseur confirmé", threshold: 500 },
  { rank: 4, title: "Tête de meute", threshold: 1200 },
] as const;

export function levelForPoints(totalPoints: number) {
  let current: (typeof LEVELS)[number] = LEVELS[0];
  let next: (typeof LEVELS)[number] | null = null;

  for (let i = 0; i < LEVELS.length; i++) {
    if (totalPoints >= LEVELS[i].threshold) {
      current = LEVELS[i];
      next = LEVELS[i + 1] ?? null;
    }
  }

  return { current, next };
}
