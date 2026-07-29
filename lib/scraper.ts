import { chromium } from "playwright";

// Scraper Google Maps — approche directe (pas d'API officielle).
//
// ATTENTION, à lire avant de t'en servir :
// - Ceci est contraire aux Conditions Générales d'Utilisation de Google.
//   Usage à tes risques : blocage d'IP possible, CAPTCHA, ou pire.
// - Les sélecteurs CSS de Google Maps changent régulièrement (classes
//   générées/obfusquées). J'ai privilégié partout où possible des
//   attributs plus stables (`data-item-id`, `role`), mais si le scraper
//   ne remonte plus rien, c'est probablement qu'un sélecteur a changé —
//   ouvre Google Maps, clic droit > Inspecter sur l'élément concerné, et
//   ajuste le sélecteur ici.
// - Reste raisonnable sur `maxResults` et la fréquence des recherches
//   pour limiter le risque de blocage.
// - Le jour où le revenu le justifie, bascule sur l'API officielle
//   Google Places (`lib/googlePlaces.ts` à créer sur le même modèle
//   de retour que `ScrapedListing[]` ci-dessous, pour ne pas toucher au
//   reste de l'app).

export type ScrapedListing = {
  name: string;
  category: string | null;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  phone: string | null;
  website: string | null;
  googleMapsUrl: string;
  rating: number | null;
  reviewsCount: number | null;
};

function extractPostalCodeAndCity(
  address: string | null
): { postalCode: string | null; city: string | null } {
  if (!address) return { postalCode: null, city: null };
  // Format FR courant : "12 rue Exemple, 34000 Montpellier"
  const match = address.match(/(\d{5})\s+([A-Za-zÀ-ÿ\- ]+)/);
  if (!match) return { postalCode: null, city: null };
  return { postalCode: match[1], city: match[2].trim() };
}

export async function scrapeGoogleMaps(
  query: string,
  zone: string,
  maxResults = 20
): Promise<ScrapedListing[]> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    viewport: { width: 1366, height: 900 },
    locale: "fr-FR",
  });

  const results: ScrapedListing[] = [];

  try {
    const searchTerm = `${query} ${zone}`;
    await page.goto(
      `https://www.google.com/maps/search/${encodeURIComponent(searchTerm)}?hl=fr`,
      { waitUntil: "domcontentloaded", timeout: 30000 }
    );

    // Bandeau de consentement cookies (EU) — sélecteur texte, plus stable
    // qu'une classe CSS.
    try {
      const consentButton = page.getByRole("button", {
        name: /tout accepter|j'accepte|accepter/i,
      });
      await consentButton.click({ timeout: 4000 });
    } catch {
      // pas de bandeau, on continue
    }

    const feed = page.locator('div[role="feed"]');
    await feed.waitFor({ timeout: 15000 });

    // Scroll progressif du panneau de résultats jusqu'à obtenir assez de
    // liens ou jusqu'à ce que la liste arrête de grandir.
    const hrefs = new Set<string>();
    let stagnantRounds = 0;
    let lastCount = 0;

    while (hrefs.size < maxResults && stagnantRounds < 4) {
      const links = await page
        .locator('a[href*="/maps/place/"]')
        .evaluateAll((els) => els.map((e) => (e as HTMLAnchorElement).href));
      links.forEach((h) => hrefs.add(h));

      if (hrefs.size === lastCount) stagnantRounds++;
      else stagnantRounds = 0;
      lastCount = hrefs.size;

      await feed.evaluate((el) => el.scrollBy(0, 1200));
      await page.waitForTimeout(1200);
    }

    const targets = Array.from(hrefs).slice(0, maxResults);

    for (const url of targets) {
      try {
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
        await page.waitForTimeout(800);

        const name = await page
          .locator("h1")
          .first()
          .innerText()
          .catch(() => "");
        if (!name) continue;

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
        const rating = ratingText
          ? parseFloat(ratingText.replace(",", "."))
          : null;

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

        results.push({
          name: name.trim(),
          category: category?.trim() || null,
          address,
          city,
          postalCode,
          phone,
          website,
          googleMapsUrl: url,
          rating: Number.isFinite(rating) ? rating : null,
          reviewsCount,
        });
      } catch {
        // une fiche a échoué (mise en page inhabituelle, blocage
        // ponctuel...) : on la saute plutôt que de tout interrompre.
        continue;
      }
    }
  } finally {
    await browser.close();
  }

  return results;
}
