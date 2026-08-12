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

/**
 * Un scan long met la machine sous charge (Chromium qui ouvre des dizaines
 * de fiches), et ça peut provoquer de vrais hoquets réseau transitoires
 * vers Supabase (ex: "TypeError: fetch failed") — le client Supabase ne
 * lève pas d'exception dans ce cas, il renvoie juste { error }, donc sans
 * retry ces leads étaient perdus silencieusement. Un code d'erreur Postgres
 * réel (ex: 23505 = doublon) n'est PAS transitoire et ne doit pas être
 * réessayé ; seule une erreur réseau sans code l'est.
 */
function isTransientError(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  if (error.code) return false;
  return /fetch failed|timeout|ECONNRESET|network/i.test(error.message ?? "");
}

async function withRetry<T extends { error: { message?: string; code?: string } | null }>(
  fn: () => PromiseLike<T>,
  { retries = 2, baseDelayMs = 1000 }: { retries?: number; baseDelayMs?: number } = {}
): Promise<T> {
  let result = await fn();
  let attempt = 0;
  while (result.error && isTransientError(result.error) && attempt < retries) {
    attempt++;
    await new Promise((r) => setTimeout(r, baseDelayMs * attempt));
    result = await fn();
  }
  return result;
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
        const { error: insertError } = await withRetry(() =>
          admin.from("companies").insert({
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
          })
        );

        // Code 23505 = violation de contrainte unique (déjà connue) : ce
        // n'est pas une erreur, c'est le dédoublonnage qui fonctionne.
        alreadyKnown = insertError?.code === "23505";
        if (!alreadyKnown) {
          if (insertError) {
            console.error("Erreur insertion company (après retry) :", insertError);
          } else {
            newCount++;
          }
        }
      }

      await withRetry(() =>
        admin
          .from("scans")
          .update({ seen_count: seenCount, new_count: newCount, updated_at: new Date().toISOString() })
          .eq("id", scanId)
      );

      return { keepGoing: newCount < target };
    },
    {
      // Évite de rouvrir une fiche déjà connue (gain de temps important
      // sur les recherches relancées) : on vérifie juste son URL avant de
      // charger la page.
      isKnownUrl: async (url) => {
        const { data } = await withRetry(() =>
          admin
            .from("companies")
            .select("id")
            .eq("user_id", userId)
            .eq("google_maps_url", url)
            .maybeSingle()
        );
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

    await withRetry(() =>
      admin
        .from("scans")
        .update({ status, message, seen_count: seenCount, new_count: newCount, updated_at: new Date().toISOString() })
        .eq("id", scanId)
    );
  } catch (err) {
    // Sans ce filet, une erreur ici (ex: Chromium non installé) laissait
    // le scan bloqué à "en_cours" pour toujours, sans jamais rien dire à
    // l'utilisateur.
    //
    // Le détail technique (err) va dans les logs serveur pour le
    // diagnostic ; l'utilisateur reçoit un message générique, jamais le
    // message brut de l'exception (souvent illisible / trop technique).
    console.error("Erreur pendant le scan :", err);
    await admin
      .from("scans")
      .update({
        status: "erreur",
        message:
          "Le scan s'est arrêté à cause d'un problème technique. Réessaie ; si ça persiste, ce n'est pas lié à ta recherche.",
        seen_count: seenCount,
        new_count: newCount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", scanId);
  }
}
