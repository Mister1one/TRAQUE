import type { SupabaseClient } from "@supabase/supabase-js";
import { toDateInputValue } from "@/lib/relance";

// Enregistre qu'une action de prospection a eu lieu aujourd'hui pour
// l'utilisateur courant. À appeler à chaque changement de statut.
// Idempotent dans l'esprit : peu importe le nombre d'appels dans la
// journée, le jour ne compte qu'une fois pour le streak (actions_count
// sert juste d'info annexe, pas au calcul du streak lui-même).
export async function recordActivity(supabase: SupabaseClient) {
  const today = toDateInputValue(new Date());

  const { data: existing } = await supabase
    .from("activity_days")
    .select("actions_count")
    .eq("day", today)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("activity_days")
      .update({ actions_count: existing.actions_count + 1 })
      .eq("day", today);
  } else {
    await supabase.from("activity_days").insert({ day: today, actions_count: 1 });
  }
}

// Calcule la série de jours consécutifs avec au moins une action,
// en remontant depuis aujourd'hui. Si rien n'a encore été fait
// aujourd'hui, on part d'hier — le streak n'est cassé qu'après un jour
// complet sans aucune action, pas dès le matin.
export function computeStreak(activeDays: Set<string>): number {
  const cursor = new Date();

  if (!activeDays.has(toDateInputValue(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!activeDays.has(toDateInputValue(cursor))) return 0;
  }

  let streak = 0;
  while (activeDays.has(toDateInputValue(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
