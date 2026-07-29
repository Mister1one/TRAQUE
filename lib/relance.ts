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
