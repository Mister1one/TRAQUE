import { chromium } from "playwright";

// Scraper Google Maps — moteur de découverte incrémentale.
//
// scanGoogleMaps continue de faire défiler la zone tant que le callback
// `onListing` répond { keepGoing: true }, et détecte lui-même la "zone
// épuisée" (Maps arrête de proposer de nouvelles fiches malgré le scroll
// — en général autour de 100-120 résultats, quelle que soit la zone).
//
// Optimisation : si `isKnownUrl` est fourni, une fiche déjà connue n'est
// jamais rouverte (pas de navigation, pas d'attente) — seul un objet
// minimal est transmis à `onListing`, pour laisser l'appelant compter la
// fiche comme "déjà vue" sans repayer le coût d'une vraie visite de page.
//
// ATTENTION :
// - Contraire aux CGU de Google. Usage à tes risques (CAPTCHA, blocage IP).
// - Sélecteurs CSS de Maps fragiles — à ajuster si plus rien ne remonte.

export type ScrapedListing = {
  googleMapsUrl: string;
  name: string;
  category: string | null;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  phone: string | null;
  website: string | null;
  rating: number | null;
  reviewsCount: number | null;
  /** true si la fiche n'a volontairement pas été rouverte (déjà connue). */
  skipped?: boolean;
};

export type ScanOutcome = "target_reached" | "zone_exhausted" | "error";

function extractPostalCodeAndCity(
  address: string | null
): { postalCode: string | null; city: string | null } {
  if (!address) return { postalCode: null, city: null };
  const match = address.match(/(\d{5})\s+([A-Za-zÀ-ÿ\- ]+)/);
  if (!match) return { postalCode: null, city: null };
  return { postalCode: match[1], city: match[2].trim() };
}

async function extractListing(
  page: import("playwright").Page,
  url: string
): Promise<ScrapedListing | null> {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForTimeout(500);

  const name = await page.locator("h1").first().innerText().catch(() => "");
  if (!name) return null;

  const address = await page
    .locator('button[data-item-id^="address"]')
    .first()
    .getAttribute("aria-label")
    .then((v) => v?.replace(/^Adresse\s*:\s*/i, "").trim() ?? null)
    .catch(() => null);

  const phone = await page
    .locator('button[data-item-id^="phone:tel:"]')
    .first()
    .getAttribute("aria-label")
    .then((v) => v?.replace(/^Téléphone\s*:\s*/i, "").trim() ?? null)
    .catch(() => null);

  const website = await page
    .locator('a[data-item-id="authority"]')
    .first()
    .getAttribute("href")
    .catch(() => null);

  const category = await page
    .locator('button[jsaction*="category"]')
    .first()
    .innerText()
    .catch(() => null);

  const ratingText = await page
    .locator('div.F7nice span[aria-hidden="true"]')
    .first()
    .innerText()
    .catch(() => null);
  const rating = ratingText ? parseFloat(ratingText.replace(",", ".")) : null;

  const reviewsRaw = await page
    .locator('div.F7nice span[aria-label*="avis"]')
    .first()
    .getAttribute("aria-label")
    .catch(() => null);
  const reviewsMatch = reviewsRaw?.match(/(\d[\d\s]*)/);
  const reviewsCount = reviewsMatch
    ? parseInt(reviewsMatch[1].replace(/\s/g, ""), 10)
    : null;

  const { postalCode, city } = extractPostalCodeAndCity(address);

  return {
    googleMapsUrl: url,
    name: name.trim(),
    category: category?.trim() || null,
    address,
    city,
    postalCode,
    phone,
    website,
    rating: Number.isFinite(rating) ? rating : null,
    reviewsCount,
  };
}

export async function scanGoogleMaps(
  activite: string,
  zone: string,
  onListing: (listing: ScrapedListing) => Promise<{ keepGoing: boolean }>,
  options?: { isKnownUrl?: (url: string) => Promise<boolean> }
): Promise<ScanOutcome> {
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });
  const page = await browser.newPage({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    viewport: { width: 1366, height: 900 },
    locale: "fr-FR",
  });

  const visited = new Set<string>();

  try {
    const searchTerm = `${activite} ${zone}`;
    await page.goto(
      `https://www.google.com/maps/search/${encodeURIComponent(searchTerm)}?hl=fr`,
      { waitUntil: "domcontentloaded", timeout: 30000 }
    );

    try {
      const consentButton = page.getByRole("button", {
        name: /tout accepter|j'accepte|accepter/i,
      });
      await consentButton.click({ timeout: 4000 });
    } catch {
      // pas de bandeau
    }

    const feed = page.locator('div[role="feed"]');
    await feed.waitFor({ timeout: 15000 });

    let stagnantRounds = 0;
    let lastHrefCount = 0;

    while (true) {
      const hrefs: string[] = await page
        .locator('a[href*="/maps/place/"]')
        .evaluateAll((els) => els.map((e) => (e as HTMLAnchorElement).href));

      const fresh = hrefs.filter((h) => !visited.has(h));

      for (const url of fresh) {
        visited.add(url);

        const known = options?.isKnownUrl ? await options.isKnownUrl(url) : false;

        let listing: ScrapedListing | null;
        if (known) {
          // Déjà connue : on ne rouvre pas la fiche, juste un objet minimal.
          listing = { googleMapsUrl: url, name: "", category: null, address: null, city: null, postalCode: null, phone: null, website: null, rating: null, reviewsCount: null, skipped: true };
        } else {
          try {
            listing = await extractListing(page, url);
          } catch {
            listing = null;
          }
        }

        if (listing) {
          const { keepGoing } = await onListing(listing);
          if (!keepGoing) return "target_reached";
        }
      }

      if (hrefs.length === lastHrefCount) stagnantRounds++;
      else stagnantRounds = 0;
      lastHrefCount = hrefs.length;

      if (stagnantRounds >= 5) {
        return "zone_exhausted";
      }

      await feed.evaluate((el) => el.scrollBy(0, 1200));
      await page.waitForTimeout(1000);
    }
  } finally {
    await browser.close();
  }
}
