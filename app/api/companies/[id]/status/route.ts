import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { nextRelanceDate, toDateInputValue } from "@/lib/relance";
import { recordActivity } from "@/lib/streak";

const VALID_STATUSES = [
  "a_contacter",
  "envoyee",
  "conversation",
  "refus",
  "a_relancer",
  "injoignable",
  "a_rappeler",
  "rdv",
  "vendu",
];

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const status = body?.status;

  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Statut invalide." }, { status: 400 });
  }

  // On lit le stage actuel pour calculer la prochaine date de relance
  // (J+1, J+3, J+5, puis tous les 7 jours) à partir de là où on en est.
  const { data: current } = await supabase
    .from("companies")
    .select("relance_stage")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  const currentStage = current?.relance_stage ?? 0;

  const updates: { status: string; next_relance_date: string | null; relance_stage: number } = {
    status,
    next_relance_date: null,
    relance_stage: 0,
  };

  if (status === "a_relancer") {
    updates.next_relance_date = toDateInputValue(nextRelanceDate(currentStage));
    updates.relance_stage = currentStage + 1;
  }
  // Pour tout autre statut : on sort du cycle de relance et on remet à
  // zéro, pour repartir proprement si le prospect y revient plus tard.

  // La RLS de `companies` (policy companies_owner) empêche déjà de modifier
  // une ligne qui n'appartient pas à l'utilisateur connecté ; le filtre
  // user_id ci-dessous est une défense en profondeur, pas la seule barrière.
  const { data: company, error } = await supabase
    .from("companies")
    .update(updates)
    .eq("id", params.id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error || !company) {
    return NextResponse.json(
      { error: "Impossible d'enregistrer le statut." },
      { status: 500 }
    );
  }

  // Best-effort : si l'enregistrement du streak échoue, ça ne doit pas
  // faire échouer le changement de statut lui-même.
  try {
    await recordActivity(supabase);
  } catch {
    // silencieux — le streak n'est pas critique
  }

  return NextResponse.json({ company });
}
