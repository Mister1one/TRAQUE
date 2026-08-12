import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";

// Limite large mais volontaire : une fiche prospect n'a pas vocation à
// devenir un journal d'appel complet, juste de quoi noter un détail utile
// avant la prochaine relance.
const MAX_NOTES_LENGTH = 2000;

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
  const notes = typeof body?.notes === "string" ? body.notes : null;

  if (notes !== null && notes.length > MAX_NOTES_LENGTH) {
    return NextResponse.json(
      { error: "Note trop longue." },
      { status: 400 }
    );
  }

  const { data: company, error } = await supabase
    .from("companies")
    .update({ notes })
    .eq("id", params.id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error || !company) {
    return NextResponse.json(
      { error: "Impossible d'enregistrer la note." },
      { status: 500 }
    );
  }

  return NextResponse.json({ company });
}
