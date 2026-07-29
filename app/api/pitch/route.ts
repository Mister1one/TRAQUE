import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { generatePitch } from "@/lib/pitch-templates";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const prospectId: string | undefined = body?.prospectId;

  if (!prospectId) {
    return NextResponse.json(
      { error: "Le champ 'prospectId' est requis." },
      { status: 400 }
    );
  }

  const supabase = await getSupabaseServer();

  const { data: prospect, error: fetchError } = await supabase
    .from("prospects")
    .select("*")
    .eq("id", prospectId)
    .single();

  if (fetchError || !prospect) {
    return NextResponse.json({ error: "Prospect introuvable." }, { status: 404 });
  }

  let pitch: string;
  try {
    pitch = await generatePitch(prospect);
  } catch (err) {
    console.error("Erreur génération pitch :", err);
    return NextResponse.json(
      { error: "La génération du pitch a échoué." },
      { status: 502 }
    );
  }

  const { data: updated, error: updateError } = await supabase
    .from("prospects")
    .update({ pitch, pitch_generated_at: new Date().toISOString() })
    .eq("id", prospectId)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ prospect: updated });
}
