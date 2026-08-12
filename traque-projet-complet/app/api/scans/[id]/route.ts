import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const { data: scan, error } = await supabase
    .from("scans")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error || !scan) {
    return NextResponse.json({ error: "Scan introuvable." }, { status: 404 });
  }

  return NextResponse.json({ scan });
}
