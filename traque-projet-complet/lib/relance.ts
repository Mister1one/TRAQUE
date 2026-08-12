// Cycle de relance : J+1, J+3, J+5, puis reprise tous les 7 jours.
// `stage` = nombre de relances déjà passées (0 avant le premier appel).

const CYCLE_DAYS = [1, 3, 5];
const REPEAT_EVERY_DAYS = 7;

export function nextRelanceDate(stage: number, from: Date = new Date()): Date {
  const daysToAdd =
    stage < CYCLE_DAYS.length
      ? CYCLE_DAYS[stage]
      : REPEAT_EVERY_DAYS;

  const d = new Date(from);
  d.setDate(d.getDate() + daysToAdd);
  return d;
}

export function toDateInputValue(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// Traduit next_relance_date/status en indication lisible ("à relancer
// aujourd'hui", "en retard de 3 j", "relance dans 2 j"), pour que le
// tableau vive dans le temps sans colonne supplémentaire en base.
export function relanceHint(
  status: string,
  nextRelanceDate: string | null
): string | null {
  if (status !== "relance_prevue" || !nextRelanceDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(nextRelanceDate);
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86_400_000);

  if (diffDays < 0) return `En retard de ${Math.abs(diffDays)} j`;
  if (diffDays === 0) return "À relancer aujourd'hui";
  return `Relance dans ${diffDays} j`;
}
