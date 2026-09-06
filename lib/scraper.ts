import { chromium, type BrowserContext, type Page } from "playwright";

// Scraper Google Maps — moteur de découverte incrémentale.
//
// scanGoogleMaps continue de faire défiler la zone tant que le callback
// `onListing` répond { keepGoing: true }.
//
// Robustesse :
// - une fiche individuelle qui échoue ne tue pas le scan ;
// - les lectures du feed sont retentées avant abandon ;
// - isKnownUrl est protégé contre les erreurs temporaires ;
// - onListing est protégé contre les erreurs pour éviter qu'une exception
//   applicative fasse disparaître tout le scan sans diagnostic ;
// - les erreurs réelles sont loguées avec leur stack pour identifier
//   rapidement un problème Railway / DB / réseau / Playwright.
//
// IMPORTANT : la page principale (feed) ne navigue JAMAIS vers une fiche.
// Chaque fiche est ouverte dans un onglet séparé puis refermée.
//
// ATTENTION :
// - Contraire aux CGU de Google. Usage à tes risques (CAPTCHA, blocage IP).
// - Sélecteurs CSS de Maps fragiles — à ajuster si nécessaire.

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

function log(msg: string) {
  console.log(`[scan ${new Date().toISOString().slice(11, 19)}] ${msg}`);
}

function logError(context: string, err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;

  console.error(`[scan] ${context}: ${message}`);

  if (stack) {
    console.error(stack);
  }
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function extractPostalCodeAndCity(
  address: string | null
): { postalCode: string | null; city: string | null } {
  if (!address) {
    return { postalCode: null, city: null };
  }

  const match = address.match(/(\d{5})\s+([A-Za-zÀ-ÿ\- ]+)/);

  if (!match) {
    return { postalCode: null, city: null };
  }

  return {
    postalCode: match[1],
    city: match[2].trim(),
  };
}

async function extractListingFromPage(
  page: Page,
  url: string
): Promise<ScrapedListing | null> {
  const name = await page
    .locator("h1")
    .first()
    .innerText({ timeout: 5000 })
    .catch(() => "");

  if (!name) {
    return null;
  }

  const address = await page
    .locator('button[data-item-id^="address"]')
    .first()
    .getAttribute("aria-label", { timeout: 3000 })
    .then(
      (value) =>
        value?.replace(/^Adresse\s*:\s*/i, "").trim() ?? null
    )
    .catch(() => null);

  const phone = await page
    .locator('button[data-item-id^="phone:tel:"]')
    .first()
    .getAttribute("aria-label", { timeout: 3000 })
    .then(
      (value) =>
        value?.replace(/^[^\d+]+/, "").trim() ?? null
    )
    .catch(() => null);

  const website = await page
    .locator('a[data-item-id="authority"]')
    .first()
    .getAttribute("href", { timeout: 3000 })
    .catch(() => null);

  const category = await page
    .locator('button[jsaction*="category"]')
    .first()
    .innerText({ timeout: 3000 })
    .catch(() => null);

  const ratingText = await page
    .locator('div.F7nice span[aria-hidden="true"]')
    .first()
    .innerText({ timeout: 3000 })
    .catch(() => null);

  const rating = ratingText
    ? parseFloat(ratingText.replace(",", "."))
    : null;

  const reviewsRaw = await page
    .locator('div.F7nice span[aria-label*="avis"]')
    .first()
    .getAttribute("aria-label", { timeout: 3000 })
    .catch(() => null);

  const reviewsMatch = reviewsRaw?.match(/(\d[\d\s]*)/);

  const reviewsCount = reviewsMatch
    ? parseInt(reviewsMatch[1].replace(/\s/g, ""), 10)
    : null;

  const { postalCode, city } =
    extractPostalCodeAndCity(address);

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

/**
 * Ouvre une fiche dans un onglet dédié, l'extrait, puis referme l'onglet.
 *
 * Une erreur sur cette fiche ne tue JAMAIS le scan complet.
 */
async function extractListing(
  context: BrowserContext,
  url: string
): Promise<ScrapedListing | null> {
  const t0 = Date.now();
  let detailPage: Page | null = null;

  try {
    detailPage = await context.newPage();

    const tGotoStart = Date.now();

    await detailPage.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 20000,
    });

    const gotoMs = Date.now() - tGotoStart;

    await detailPage.waitForTimeout(500);

    const result = await extractListingFromPage(
      detailPage,
      url
    );

    if (result) {
      log(
        `✓ fiche "${result.name}" — goto ${gotoMs}ms, total ${
          Date.now() - t0
        }ms`
      );
    } else {
      log(
        `⚠ fiche illisible — total ${Date.now() - t0}ms`
      );
    }

    return result;
  } catch (err) {
    logError(
      `échec extraction fiche après ${Date.now() - t0}ms`,
      err
    );

    return null;
  } finally {
    if (detailPage) {
      await detailPage.close().catch(() => {});
    }
  }
}

/**
 * Fait défiler le feed avec un vrai geste de molette positionné sur la
 * dernière fiche visible.
 */
async function scrollFeed(
  page: Page,
  feed: import("playwright").Locator
) {
  const cards = feed.locator(
    'a[href*="/maps/place/"]'
  );

  const cardCount = await cards
    .count()
    .catch(() => 0);

  if (cardCount > 0) {
    try {
      const lastCard = cards.nth(cardCount - 1);

      await lastCard.scrollIntoViewIfNeeded({
        timeout: 3000,
      });

      const box = await lastCard.boundingBox();

      if (box) {
        await page.mouse.move(
          box.x + box.width / 2,
          box.y + box.height / 2
        );
      }
    } catch {
      // On continue avec le scroll global.
    }
  }

  await page.mouse.wheel(0, 900);

  await page.waitForTimeout(250);

  await page.mouse.wheel(0, 900);

  await feed
    .evaluate((el) => el.scrollBy(0, 1200))
    .catch(() => {});
}

/**
 * Lit les URLs du feed avec plusieurs tentatives.
 *
 * Maps peut temporairement reconstruire le DOM pendant un scroll.
 * Une erreur ponctuelle ne doit donc pas tuer le scan.
 */
async function readFeedUrls(
  feed: import("playwright").Locator,
  attempts = 4
): Promise<string[]> {
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const hrefs = await feed
        .locator('a[href*="/maps/place/"]')
        .evaluateAll((els) =>
          els
            .map((element) =>
              (element as HTMLAnchorElement).href
            )
            .filter(Boolean)
        );

      return hrefs;
    } catch (err) {
      lastError = err;

      if (attempt < attempts) {
        await new Promise((resolve) =>
          setTimeout(resolve, 1500)
        );
      }
    }
  }

  throw lastError;
}

/**
 * Vérifie une URL connue avec quelques retries.
 *
 * On ne considère jamais une erreur DB/réseau comme "URL inconnue",
 * afin d'éviter d'insérer accidentellement des doublons.
 */
async function checkKnownUrl(
  isKnownUrl: ((url: string) => Promise<boolean>) | undefined,
  url: string
): Promise<boolean> {
  if (!isKnownUrl) {
    return false;
  }

  let lastError: unknown = null;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await isKnownUrl(url);
    } catch (err) {
      lastError = err;

      logError(
        `vérification URL connue échouée (${attempt}/3)`,
        err
      );

      if (attempt < 3) {
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * attempt)
        );
      }
    }
  }

  throw lastError;
}

export async function scanGoogleMaps(
  activite: string,
  zone: string,
  onListing: (
    listing: ScrapedListing
  ) => Promise<{ keepGoing: boolean }>,
  options?: {
    isKnownUrl?: (url: string) => Promise<boolean>;
  }
): Promise<ScanOutcome> {
  let browser: Awaited<
    ReturnType<typeof chromium.launch>
  > | null = null;

  let context: BrowserContext | null = null;
  let page: Page | null = null;

  const visited = new Set<string>();

  try {
    // ------------------------------------------------------------
    // 1. Chromium
    // ------------------------------------------------------------

    browser = await chromium.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
      ],
    });

    context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
        "AppleWebKit/537.36 (KHTML, like Gecko) " +
        "Chrome/124.0 Safari/537.36",
      viewport: {
        width: 1366,
        height: 900,
      },
      locale: "fr-FR",
    });

    page = await context.newPage();

    // ------------------------------------------------------------
    // 2. Recherche Google Maps
    // ------------------------------------------------------------

    const searchTerm = `${activite} ${zone}`;

    const searchUrl =
      `https://www.google.com/maps/search/` +
      `${encodeURIComponent(searchTerm)}?hl=fr`;

    const tSearchStart = Date.now();

    await page.goto(searchUrl, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    log(
      `recherche "${searchTerm}" chargée en ${
        Date.now() - tSearchStart
      }ms`
    );

    // ------------------------------------------------------------
    // 3. Consentement
    // ------------------------------------------------------------

    try {
      const consentButton = page.getByRole(
        "button",
        {
          name: /tout accepter|j'accepte|accepter/i,
        }
      );

      await consentButton.click({
        timeout: 4000,
      });

      log("bandeau de consentement accepté");
    } catch {
      // Aucun bandeau : normal.
    }

    // ------------------------------------------------------------
    // 4. Feed
    // ------------------------------------------------------------

    const feed = page.locator(
      'div[role="feed"]'
    );

    await feed.waitFor({
      timeout: 15000,
    });

    log("feed Google Maps détecté");

    // ------------------------------------------------------------
    // 5. État du scan
    // ------------------------------------------------------------

    let stagnantRounds = 0;
    let lastHrefCount = 0;
    let consecutiveFailures = 0;
    let round = 0;

    // ------------------------------------------------------------
    // 6. Boucle principale
    // ------------------------------------------------------------

    while (true) {
      round++;

      const tRoundStart = Date.now();

      // ----------------------------------------------------------
      // Lecture des fiches visibles
      // ----------------------------------------------------------

      let hrefs: string[];

      try {
        hrefs = await readFeedUrls(feed, 4);

        consecutiveFailures = 0;
      } catch (err) {
        consecutiveFailures++;

        logError(
          `tour ${round} : lecture du feed échouée ` +
            `(${consecutiveFailures}/4)`,
          err
        );

        if (consecutiveFailures >= 4) {
          log(
            `scan arrêté : impossible de lire le feed après 4 tentatives`
          );

          return "error";
        }

        await page.waitForTimeout(3000);

        continue;
      }

      // ----------------------------------------------------------
      // Nouvelles URLs
      // ----------------------------------------------------------

      const fresh = hrefs.filter(
        (url) => !visited.has(url)
      );

      log(
        `tour ${round} : ${hrefs.length} liens visibles, ` +
          `${fresh.length} nouveaux`
      );

      // ----------------------------------------------------------
      // Traitement des fiches
      // ----------------------------------------------------------

      for (const url of fresh) {
        visited.add(url);

        // --------------------------------------------------------
        // Vérification "déjà connue"
        // --------------------------------------------------------

        let known = false;

        try {
          const tKnownStart = Date.now();

          known = await checkKnownUrl(
            options?.isKnownUrl,
            url
          );

          const knownMs =
            Date.now() - tKnownStart;

          if (knownMs > 1000) {
            log(
              `vérification déjà connue lente : ${knownMs}ms`
            );
          }
        } catch (err) {
          // IMPORTANT :
          // On arrête plutôt que de considérer la fiche comme nouvelle.
          // Sinon une panne DB peut provoquer des doublons.
          logError(
            `impossible de vérifier si la fiche est déjà connue`,
            err
          );

          return "error";
        }

        // --------------------------------------------------------
        // Extraction
        // --------------------------------------------------------

        let listing: ScrapedListing | null;

        if (known) {
          listing = {
            googleMapsUrl: url,
            name: "",
            category: null,
            address: null,
            city: null,
            postalCode: null,
            phone: null,
            website: null,
            rating: null,
            reviewsCount: null,
            skipped: true,
          };
        } else {
          listing = await extractListing(
            context,
            url
          );
        }

        // --------------------------------------------------------
        // Callback applicatif
        // --------------------------------------------------------

        if (!listing) {
          // Une fiche Google Maps illisible ne doit PAS tuer le scan.
          continue;
        }

        try {
          const result = await onListing(
            listing
          );

          if (!result || typeof result.keepGoing !== "boolean") {
            log(
              `onListing a retourné une réponse invalide`
            );

            return "error";
          }

          if (!result.keepGoing) {
            log(
              `objectif atteint après ${visited.size} fiches consultées`
            );

            return "target_reached";
          }
        } catch (err) {
          // C'est extrêmement important :
          // avant, une exception de onListing pouvait remonter
          // directement jusqu'au niveau supérieur et transformer
          // le scan en simple "problème technique".
          logError(
            `ERREUR DANS onListing pour la fiche "${listing.name || "?"}"`,
            err
          );

          return "error";
        }
      }

      // ----------------------------------------------------------
      // Détection de zone épuisée
      // ----------------------------------------------------------

      if (hrefs.length === lastHrefCount) {
        stagnantRounds++;
      } else {
        stagnantRounds = 0;
      }

      lastHrefCount = hrefs.length;

      if (stagnantRounds >= 6) {
        log(
          `zone épuisée après ${round} tours`
        );

        return "zone_exhausted";
      }

      // ----------------------------------------------------------
      // Scroll
      // ----------------------------------------------------------

      const tScrollStart = Date.now();

      try {
        await scrollFeed(page, feed);

        consecutiveFailures = 0;
      } catch (err) {
        consecutiveFailures++;

        logError(
          `tour ${round} : scroll échoué ` +
            `(${consecutiveFailures}/4)`,
          err
        );

        if (consecutiveFailures >= 4) {
          log(
            `scan arrêté : scroll impossible après 4 tentatives`
          );

          return "error";
        }
      }

      await page.waitForTimeout(900);

      log(
        `tour ${round} terminé en ${
          Date.now() - tRoundStart
        }ms ` +
          `(scroll: ${
            Date.now() - tScrollStart
          }ms)`
      );
    }
  } catch (err) {
    // ------------------------------------------------------------
    // ERREUR GLOBALE
    // ------------------------------------------------------------
    //
    // Toute erreur qui aurait échappé aux protections précédentes
    // est capturée ici avec sa vraie stack.
    //
    // L'interface peut continuer à afficher "problème technique",
    // mais Railway aura maintenant la vraie cause dans les logs.

    logError(
      "ERREUR FATALE DU SCAN",
      err
    );

    return "error";
  } finally {
    // ------------------------------------------------------------
    // Nettoyage
    // ------------------------------------------------------------

    if (page) {
      await page.close().catch(() => {});
    }

    if (context) {
      await context.close().catch(() => {});
    }

    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}