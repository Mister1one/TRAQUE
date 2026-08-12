import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { scanGoogleMaps } from "@/lib/scraper";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const activite = (body?.activite ?? "").trim();
  const zone = (body?.zone ?? "").trim();
  const target = Math.min(Math.max(Number(body?.target) || 100, 1), 200);

  if (!activite || !zone) {
    return NextResponse.json(
      { error: "Activité et zone sont requises." },
      { status: 400 }
    );
  }

  const { data: scan, error } = await supabase
    .from("scans")
    .insert({ activite, zone, target, status: "en_cours" })
    .select()
    .single();

  if (error || !scan) {
    console.error("Erreur création scan :", error);
    return NextResponse.json(
      { error: "Impossible de démarrer le scan." },
      { status: 500 }
    );
  }

  // On ne bloque pas la réponse HTTP sur la durée du scan : on répond
  // tout de suite avec l'id du scan, et on continue le travail en tâche
  // de fond. Le client interroge GET /api/scans/[id] pour suivre la
  // progression en direct.
  runScan(scan.id, user.id, activite, zone, target).catch((err) => {
    console.error("Erreur pendant le scan en tâche de fond :", err);
  });

  return NextResponse.json({ scanId: scan.id });
}

async function runScan(
  scanId: string,
  userId: string,
  activite: string,
  zone: string,
  target: number
) {
  const admin = getSupabaseAdmin();
  let newCount = 0;
  let seenCount = 0;

  try {
    const outcome = await scanGoogleMaps(
    activite,
    zone,
    async (listing) => {
      seenCount++;

      let alreadyKnown = listing.skipped ?? false;

      if (!alreadyKnown) {
        // Dédoublonnage : on ignore silencieusement ce qu'on a déjà vu pour
        // cet utilisateur, sans que ça compte dans "nouvelles trouvées".
        const { error: insertError } = await admin.from("companies").insert({
          user_id: userId,
          google_maps_url: listing.googleMapsUrl,
          name: listing.name,
          category: listing.category,
          address: listing.address,
          city: listing.city,
          postal_code: listing.postalCode,
          phone: listing.phone,
          website: listing.website,
          rating: listing.rating,
          reviews_count: listing.reviewsCount,
          activite,
          zone,
        });

        // Code 23505 = violation de contrainte unique (déjà connue) : ce
        // n'est pas une erreur, c'est le dédoublonnage qui fonctionne.
        alreadyKnown = insertError?.code === "23505";
        if (!alreadyKnown) {
          if (insertError) {
            console.error("Erreur insertion company :", insertError);
          } else {
            newCount++;
          }
        }
      }

      await admin
        .from("scans")
        .update({ seen_count: seenCount, new_count: newCount, updated_at: new Date().toISOString() })
        .eq("id", scanId);

      return { keepGoing: newCount < target };
    },
    {
      // Évite de rouvrir une fiche déjà connue (gain de temps important
      // sur les recherches relancées) : on vérifie juste son URL avant de
      // charger la page.
      isKnownUrl: async (url) => {
        const { data } = await admin
          .from("companies")
          .select("id")
          .eq("user_id", userId)
          .eq("google_maps_url", url)
          .maybeSingle();
        return !!data;
        },
      }
    );

    const status =
      outcome === "target_reached"
        ? "termine"
        : outcome === "zone_exhausted"
        ? "zone_epuisee"
        : "erreur";

    const message =
      outcome === "zone_exhausted"
        ? "Zone entièrement parcourue. Aucune nouvelle entreprise disponible."
        : outcome === "error"
        ? "Le scan a rencontré une erreur avant d'atteindre l'objectif."
        : null;

    await admin
      .from("scans")
      .update({ status, message, seen_count: seenCount, new_count: newCount, updated_at: new Date().toISOString() })
      .eq("id", scanId);
  } catch (err) {
    // Sans ce filet, une erreur ici (ex: Chromium non installé) laissait
    // le scan bloqué à "en_cours" pour toujours, sans jamais rien dire à
    // l'utilisateur.
    console.error("Erreur pendant le scan :", err);
    await admin
      .from("scans")
      .update({
        status: "erreur",
        message: err instanceof Error ? err.message : "Erreur inconnue pendant le scan.",
        seen_count: seenCount,
        new_count: newCount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", scanId);
  }
}
