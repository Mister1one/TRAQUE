import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { nextRelanceDate, toDateInputValue } from "@/lib/relance";
import { POINTS, type ActionType } from "@/lib/points";

export const runtime = "nodejs";

// outcome -> statut résultant + action de points associée (si applicable)
const OUTCOME_MAP: Record<
  string,
  { status: string; pointsAction?: ActionType; advanceStage: boolean }
> = {
  injoignable: { status: "relance_prevue", advanceStage: true },
  pas_interesse: { status: "perdu", advanceStage: false },
  a_rappeler: { status: "relance_prevue", advanceStage: true },
  rdv_pris: {
    status: "rdv",
    pointsAction: "rdv_obtenu",
    advanceStage: false,
  },
  vendu: { status: "gagne", pointsAction: "vente", advanceStage: false },
};

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const prospectId: string | undefined = body?.prospectId;
  const outcome: string | undefined = body?.outcome;
  const note: string | undefined = body?.note;

  if (!prospectId || !outcome || !OUTCOME_MAP[outcome]) {
    return NextResponse.json(
      {
        error:
          "Champs requis : 'prospectId' et 'outcome' (injoignable, pas_interesse, a_rappeler, rdv_pris, vendu).",
      },
      { status: 400 }
    );
  }

  const supabase = await getSupabaseServer();
  const { status, pointsAction, advanceStage } = OUTCOME_MAP[outcome];

  const { data: current, error: fetchError } = await supabase
    .from("prospects")
    .select("relance_stage")
    .eq("id", prospectId)
    .single();

  if (fetchError || !current) {
    return NextResponse.json({ error: "Prospect introuvable." }, { status: 404 });
  }

  const newStage = advanceStage ? current.relance_stage + 1 : current.relance_stage;
  const relanceDate = advanceStage
    ? toDateInputValue(nextRelanceDate(current.relance_stage))
    : null;

  const { data: updated, error: updateError } = await supabase
    .from("prospects")
    .update({
      status,
      relance_stage: newStage,
      next_relance_date: relanceDate,
      notes: note ?? undefined,
      updated_at: new Date().toISOString(),
    })
    .eq("id", prospectId)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  await supabase.from("call_log").insert({
    prospect_id: prospectId,
    outcome,
    note: note ?? null,
  });

  await supabase.from("points_log").insert({
    action_type: "appel_logue",
    points: POINTS.appel_logue,
    prospect_id: prospectId,
  });

  if (pointsAction) {
    await supabase.from("points_log").insert({
      action_type: pointsAction,
      points: POINTS[pointsAction],
      prospect_id: prospectId,
    });
  }

  return NextResponse.json({ prospect: updated });
}
