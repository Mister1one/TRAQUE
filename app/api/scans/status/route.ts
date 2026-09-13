import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = getSupabaseAdmin();

  // Pas de filtre par utilisateur : on veut savoir si QUELQU'UN, tous
  // comptes confondus, fait tourner un scan sur cette instance — c'est
  // Chromium qui sature les ressources, pas les données d'un utilisateur.
  const { data, error } = await admin
    .from("scans")
    .select("id")
    .eq("status", "en_cours")
    .limit(1);

  if (error) {
    console.error("Erreur vérification statut global :", error);
    return NextResponse.json({ locked: false });
  }

  return NextResponse.json({ locked: !!(data && data.length > 0) });
}