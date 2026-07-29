import { NextRequest, NextResponse } from "next/server";
import { scrapeGoogleMaps } from "@/lib/scraper";
import { scoreProspect } from "@/lib/scoring";
import { getSupabaseServer } from "@/lib/supabase-server";
import { POINTS } from "@/lib/points";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const query: string | undefined = body?.query;
  const zone: string | undefined = body?.zone;
  const maxResults: number = Math.min(Math.max(body?.maxResults ?? 20, 1), 40);

  if (!query || !zone) {
    return NextResponse.json(
      { error: "Les champs 'query' (activité) et 'zone' sont requis." },
      { status: 400 }
    );
  }

  let listings;
  try {
    listings = await scrapeGoogleMaps(query, zone, maxResults);
  } catch (err) {
    console.error("Erreur de scraping :", err);
    return NextResponse.json(
      {
        error:
          "Le scraping a échoué (Google a probablement changé quelque chose, ou bloqué la requête). Voir les logs serveur pour le détail.",
      },
      { status: 502 }
    );
  }

  if (listings.length === 0) {
    return NextResponse.json(
      { inserted: 0, message: "Aucun résultat trouvé pour cette recherche." },
      { status: 200 }
    );
  }

  const supabase = await getSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const rows = listings.map((l) => {
    const { score, reasons } = scoreProspect({
      hasWebsite: !!l.website,
      rating: l.rating,
      reviewsCount: l.reviewsCount,
      phone: l.phone,
    });

    return {
      name: l.name,
      category: l.category,
      address: l.address,
      city: l.city,
      postal_code: l.postalCode,
      phone: l.phone,
      google_maps_url: l.googleMapsUrl,
      website: l.website,
      has_website: !!l.website,
      rating: l.rating,
      reviews_count: l.reviewsCount,
      source_zone: zone,
      source_query: query,
      score,
      score_reasons: reasons,
      status: "a_contacter" as const,
    };
  });

  const { data, error } = await supabase
    .from("prospects")
    .upsert(rows, {
      onConflict: "user_id,google_maps_url",
      ignoreDuplicates: true,
    })
    .select();

  if (error) {
    console.error("Erreur Supabase :", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const inserted = data ?? [];

  if (inserted.length > 0) {
    await supabase.from("points_log").insert(
      inserted.map((p) => ({
        action_type: "prospect_source",
        points: POINTS.prospect_source,
        prospect_id: p.id,
      }))
    );
  }

  return NextResponse.json({ inserted: inserted.length, prospects: inserted });
}
