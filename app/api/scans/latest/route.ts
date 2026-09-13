import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  // Le scan le plus récent de l'utilisateur, tous statuts confondus —
  // sert à reprendre le suivi après un Ctrl+F5 ou un rechargement, quand
  // le composant a perdu le scanId en mémoire mais que le scan (en cours
  // ou tout juste terminé) existe toujours côté serveur.
  const { data: scan, error } = await supabase
    .from("scans")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Erreur récupération dernier scan :", error);
    return NextResponse.json({ scan: null });
  }

  return NextResponse.json({ scan: scan ?? null });
}