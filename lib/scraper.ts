import {
  chromium,
  type Browser,
  type BrowserContext,
  type Page,
  type Locator,
} from "playwright";

// Scraper Google Maps — moteur de découverte incrémentale.
//
// Robustesse :
// - une fiche individuelle qui échoue ne tue pas le scan ;
// - les lectures du feed sont retentées ;
// - isKnownUrl est protégé contre les erreurs temporaires ;
// - onListing est protégé contre les erreurs ;
// - les crashs Chromium sont détectés explicitement ;
// - le navigateur est recyclé périodiquement pour limiter
//   l'accumulation mémoire sur Railway ;
// - en cas de crash du feed, Chromium est redémarré automatiquement ;
// - visited est conservé pendant les redémarrages.
//
// IMPORTANT : la page principale (feed) ne navigue JAMAIS vers une fiche.
// Chaque fiche est ouverte dans un onglet séparé puis refermée.
//
// ATTENTION :
// - Contraire aux CGU de Google. Usage à tes risques.
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
  skipped?: boolean;
};

export type ScanOutcome =
  | "target_reached"
  | "zone_exhausted"
  | "error";

function log(msg: string) {
  console.log(
    `[scan ${new Date().toISOString().slice(11, 19)}] ${msg}`
  );
}

function logError(context: string, err: unknown) {
  const message =
    err instanceof Error ? err.message : String(err);

  const stack =
    err instanceof Error ? err.stack : undefined;

  console.error(`[scan] ${context}: ${message}`);

  if (stack) {
    console.error(stack);
  }
}

function errorMessage(err: unknown): string {
  return err instanceof Error
    ? err.message
    : String(err);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function logMemory(label: string) {
  const memory = process.memoryUsage();

  const rss = Math.round(
    memory.rss / 1024 / 1024
  );

  const heapUsed = Math.round(
    memory.heapUsed / 1024 / 1024
  );

  const heapTotal = Math.round(
    memory.heapTotal / 1024 / 1024
  );

  log(
    `mémoire ${label} — RSS ${rss}MB, ` +
      `heap ${heapUsed}/${heapTotal}MB`
  );
}

function extractPostalCodeAndCity(
  address: string | null
): {
  postalCode: string | null;
  city: string | null;
} {
  if (!address) {
    return {
      postalCode: null,
      city: null,
    };
  }

  const match = address.match(
    /(\d{5})\s+([A-Za-zÀ-ÿ\- ]+)/
  );

  if (!match) {
    return {
      postalCode: null,
      city: null,
    };
  }

  return {
    postalCode: match[1],
    city: match[2].trim(),
  };
}

/**
 * Extrait les données d'une fiche Google Maps.
 */
async function extractListingFromPage(
  page: Page,
  url: string
): Promise<ScrapedListing | null> {
  const name = await page
    .locator("h1")
    .first()
    .innerText({
      timeout: 5000,
    })
    .catch(() => "");

  if (!name) {
    return null;
  }

  const address = await page
    .locator(
      'button[data-item-id^="address"]'
    )
    .first()
    .getAttribute("aria-label", {
      timeout: 3000,
    })
    .then(
      (value) =>
        value
          ?.replace(/^Adresse\s*:\s*/i, "")
          .trim() ?? null
    )
    .catch(() => null);

  const phone = await page
    .locator(
      'button[data-item-id^="phone:tel:"]'
    )
    .first()
    .getAttribute("aria-label", {
      timeout: 3000,
    })
    .then(
      (value) =>
        value
          ?.replace(/^[^\d+]+/, "")
          .trim() ?? null
    )
    .catch(() => null);

  const website = await page
    .locator(
      'a[data-item-id="authority"]'
    )
    .first()
    .getAttribute("href", {
      timeout: 3000,
    })
    .catch(() => null);

  const category = await page
    .locator(
      'button[jsaction*="category"]'
    )
    .first()
    .innerText({
      timeout: 3000,
    })
    .catch(() => null);

  const ratingText = await page
    .locator(
      'div.F7nice span[aria-hidden="true"]'
    )
    .first()
    .innerText({
      timeout: 3000,
    })
    .catch(() => null);

  const rating = ratingText
    ? parseFloat(
        ratingText.replace(",", ".")
      )
    : null;

  const reviewsRaw = await page
    .locator(
      'div.F7nice span[aria-label*="avis"]'
    )
    .first()
    .getAttribute("aria-label", {
      timeout: 3000,
    })
    .catch(() => null);

  const reviewsMatch =
    reviewsRaw?.match(/(\d[\d\s]*)/);

  const reviewsCount = reviewsMatch
    ? parseInt(
        reviewsMatch[1].replace(/\s/g, ""),
        10
      )
    : null;

  const {
    postalCode,
    city,
  } = extractPostalCodeAndCity(address);

  return {
    googleMapsUrl: url,
    name: name.trim(),
    category:
      category?.trim() || null,
    address,
    city,
    postalCode,
    phone,
    website,
    rating:
      Number.isFinite(rating)
        ? rating
        : null,
    reviewsCount,
  };
}

/**
 * Bloque les ressources lourdes uniquement sur les fiches.
 *
 * On NE bloque PAS les scripts, stylesheets ou XHR :
 * Google Maps peut en avoir besoin pour afficher les données.
 */
async function optimizeDetailPage(
  page: Page
): Promise<void> {
  await page.route(
    "**/*",
    async (route) => {
      try {
        const resourceType =
          route.request().resourceType();

        if (
          resourceType === "image" ||
          resourceType === "media" ||
          resourceType === "font"
        ) {
          await route.abort();
          return;
        }

        await route.continue();
      } catch {
        // La page peut déjà être morte.
      }
    }
  );
}

/**
 * Ouvre une fiche dans un onglet dédié,
 * l'extrait, puis referme l'onglet.
 *
 * Une erreur sur cette fiche ne tue JAMAIS
 * le scan complet.
 */
async function extractListing(
  context: BrowserContext,
  url: string
): Promise<ScrapedListing | null> {
  const t0 = Date.now();

  let detailPage: Page | null = null;

  try {
    detailPage = await context.newPage();

    await optimizeDetailPage(detailPage);

    const tGotoStart = Date.now();

    await detailPage.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 20000,
    });

    const gotoMs =
      Date.now() - tGotoStart;

    // Pas de page.waitForTimeout :
    // un renderer mort peut provoquer exactement
    // "page.waitForTimeout: Page crashed".
    await sleep(500);

    const result =
      await extractListingFromPage(
        detailPage,
        url
      );

    if (result) {
      log(
        `✓ fiche "${result.name}" — ` +
          `goto ${gotoMs}ms, total ${
            Date.now() - t0
          }ms`
      );
    } else {
      log(
        `⚠ fiche illisible — total ${
          Date.now() - t0
        }ms`
      );
    }

    return result;
  } catch (err) {
    logError(
      `échec extraction fiche après ${
        Date.now() - t0
      }ms`,
      err
    );

    return null;
  } finally {
    if (detailPage) {
      await detailPage
        .close()
        .catch(() => {});
    }
  }
}

/**
 * Fait défiler le feed avec un vrai geste
 * de molette positionné sur la dernière fiche visible.
 */
async function scrollFeed(
  page: Page,
  feed: Locator
): Promise<void> {
  const cards = feed.locator(
    'a[href*="/maps/place/"]'
  );

  const cardCount = await cards
    .count()
    .catch(() => 0);

  if (cardCount > 0) {
    try {
      const lastCard =
        cards.nth(cardCount - 1);

      await lastCard.scrollIntoViewIfNeeded({
        timeout: 3000,
      });

      const box =
        await lastCard.boundingBox();

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

  await sleep(250);

  await page.mouse.wheel(0, 900);

  await feed
    .evaluate((el) => {
      el.scrollBy(0, 1200);
    })
    .catch(() => {});
}

/**
 * Lit les URLs du feed avec plusieurs tentatives.
 */
async function readFeedUrls(
  feed: Locator,
  attempts = 4
): Promise<string[]> {
  let lastError: unknown = null;

  for (
    let attempt = 1;
    attempt <= attempts;
    attempt++
  ) {
    try {
      const hrefs = await feed
        .locator(
          'a[href*="/maps/place/"]'
        )
        .evaluateAll((els) =>
          els
            .map(
              (element) =>
                (
                  element as HTMLAnchorElement
                ).href
            )
            .filter(Boolean)
        );

      return hrefs;
    } catch (err) {
      lastError = err;

      if (attempt < attempts) {
        await sleep(1500);
      }
    }
  }

  throw lastError;
}

/**
 * Vérifie une URL connue avec retries.
 *
 * Une erreur DB/réseau n'est jamais considérée
 * comme "URL inconnue".
 */
async function checkKnownUrl(
  isKnownUrl:
    | ((url: string) => Promise<boolean>)
    | undefined,
  url: string
): Promise<boolean> {
  if (!isKnownUrl) {
    return false;
  }

  let lastError: unknown = null;

  for (
    let attempt = 1;
    attempt <= 3;
    attempt++
  ) {
    try {
      return await isKnownUrl(url);
    } catch (err) {
      lastError = err;

      logError(
        `vérification URL connue échouée (${attempt}/3)`,
        err
      );

      if (attempt < 3) {
        await sleep(1000 * attempt);
      }
    }
  }

  throw lastError;
}

type BrowserSession = {
  browser: Browser;
  context: BrowserContext;
  page: Page;
  feed: Locator;
  crashed: boolean;
};

/**
 * Lance une nouvelle session Chromium et ouvre
 * la recherche Google Maps.
 */
async function createBrowserSession(
  searchUrl: string
): Promise<BrowserSession> {
  const browser =
    await chromium.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",

        // Réduisent certaines activités secondaires
        // de Chromium sur un serveur headless.
        "--disable-background-networking",
        "--disable-background-timer-throttling",
        "--disable-renderer-backgrounding",
        "--disable-extensions",
        "--disable-sync",
        "--disable-translate",
      ],
    });

  let crashed = false;

  browser.on("disconnected", () => {
    crashed = true;

    log(
      "⚠ Chromium déconnecté"
    );
  });

  const context =
    await browser.newContext({
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

  const page =
    await context.newPage();

  page.on("crash", () => {
    crashed = true;

    log(
      "💥 CRASH DU RENDERER DE LA PAGE GOOGLE MAPS"
    );
  });

  await page.goto(searchUrl, {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });

  log("recherche Google Maps chargée");

  // ------------------------------------------------------------
  // Consentement
  // ------------------------------------------------------------

  try {
    const consentButton =
      page.getByRole("button", {
        name:
          /tout accepter|j'accepte|accepter/i,
      });

    await consentButton.click({
      timeout: 4000,
    });

    log(
      "bandeau de consentement accepté"
    );
  } catch {
    // Aucun bandeau : normal.
  }

  // ------------------------------------------------------------
  // Feed
  // ------------------------------------------------------------

  const feed = page.locator(
    'div[role="feed"]'
  );

  await feed.waitFor({
    timeout: 15000,
  });

  log(
    "feed Google Maps détecté"
  );

  return {
    browser,
    context,
    page,
    feed,
    crashed,
  };
}

/**
 * Ferme proprement une session Chromium.
 */
async function closeBrowserSession(
  session: BrowserSession | null
): Promise<void> {
  if (!session) {
    return;
  }

  await session.page
    .close()
    .catch(() => {});

  await session.context
    .close()
    .catch(() => {});

  await session.browser
    .close()
    .catch(() => {});
}

export async function scanGoogleMaps(
  activite: string,
  zone: string,
  onListing: (
    listing: ScrapedListing
  ) => Promise<{
    keepGoing: boolean;
  }>,
  options?: {
    isKnownUrl?: (
      url: string
    ) => Promise<boolean>;
  }
): Promise<ScanOutcome> {
  const visited = new Set<string>();

  let session:
    | BrowserSession
    | null = null;

  let round = 0;

  let stagnantRounds = 0;

  let lastHrefCount = 0;

  let consecutiveFailures = 0;

  let recoveryCount = 0;

  let processedSinceRecycle = 0;

  // ------------------------------------------------------------
  // Limites de sécurité
  // ------------------------------------------------------------

  // On recycle Chromium régulièrement.
  // Cela évite de garder un renderer Google Maps vivant
  // pendant plusieurs centaines de fiches.
  const RECYCLE_EVERY = 40;

  // Évite une boucle infinie si Railway/Chromium
  // est réellement incapable de tenir le scan.
  const MAX_RECOVERIES = 3;

  const searchTerm =
    `${activite} ${zone}`;

  const searchUrl =
    `https://www.google.com/maps/search/` +
    `${encodeURIComponent(searchTerm)}?hl=fr`;

  try {
    log(
      `début scan "${searchTerm}"`
    );

    logMemory("début");

    // ----------------------------------------------------------
    // Première session Chromium
    // ----------------------------------------------------------

    session =
      await createBrowserSession(
        searchUrl
      );

    // ----------------------------------------------------------
    // Boucle principale
    // ----------------------------------------------------------

    while (true) {
      round++;

      const tRoundStart =
        Date.now();

      // --------------------------------------------------------
      // Vérification du renderer
      // --------------------------------------------------------

      if (
        session.crashed ||
        session.page.isClosed()
      ) {
        recoveryCount++;

        log(
          `💥 feed Chromium mort — ` +
            `récupération ${recoveryCount}/${MAX_RECOVERIES}`
        );

        if (
          recoveryCount > MAX_RECOVERIES
        ) {
          log(
            "scan arrêté : trop de crashs Chromium"
          );

          return "error";
        }

        await closeBrowserSession(
          session
        );

        session = null;

        await sleep(2000);

        session =
          await createBrowserSession(
            searchUrl
          );

        // Le feed repart du début.
        // visited est conservé, donc les anciennes
        // fiches ne seront pas retraitées.
        stagnantRounds = 0;
        lastHrefCount = 0;
        consecutiveFailures = 0;

        log(
          `✓ Chromium redémarré — ` +
            `${visited.size} fiches déjà visitées conservées`
        );

        continue;
      }

      // --------------------------------------------------------
      // Lecture du feed
      // --------------------------------------------------------

      let hrefs: string[];

      try {
        hrefs = await readFeedUrls(
          session.feed,
          4
        );

        consecutiveFailures = 0;
      } catch (err) {
        consecutiveFailures++;

        logError(
          `tour ${round} : lecture du feed échouée ` +
            `(${consecutiveFailures}/4)`,
          err
        );

        // Si c'est un crash renderer, on ne perd
        // pas de temps avec 4 retries inutiles.
        if (
          session.crashed ||
          errorMessage(err).includes(
            "Page crashed"
          )
        ) {
          recoveryCount++;

          log(
            `💥 crash détecté pendant lecture feed — ` +
              `récupération ${recoveryCount}/${MAX_RECOVERIES}`
          );

          if (
            recoveryCount > MAX_RECOVERIES
          ) {
            return "error";
          }

          await closeBrowserSession(
            session
          );

          session = null;

          await sleep(2000);

          session =
            await createBrowserSession(
              searchUrl
            );

          stagnantRounds = 0;
          lastHrefCount = 0;
          consecutiveFailures = 0;

          continue;
        }

        if (
          consecutiveFailures >= 4
        ) {
          log(
            "scan arrêté : impossible de lire le feed après 4 tentatives"
          );

          return "error";
        }

        await sleep(3000);

        continue;
      }

      // --------------------------------------------------------
      // Nouvelles URLs
      // --------------------------------------------------------

      const fresh = hrefs.filter(
        (url) =>
          !visited.has(url)
      );

      log(
        `tour ${round} : ` +
          `${hrefs.length} liens visibles, ` +
          `${fresh.length} nouveaux`
      );

      // --------------------------------------------------------
      // Traitement des fiches
      // --------------------------------------------------------

      for (const url of fresh) {
        visited.add(url);

        // ------------------------------------------------------
        // Vérification URL connue
        // ------------------------------------------------------

        let known = false;

        try {
          const tKnownStart =
            Date.now();

          known =
            await checkKnownUrl(
              options?.isKnownUrl,
              url
            );

          const knownMs =
            Date.now() -
            tKnownStart;

          if (knownMs > 1000) {
            log(
              `vérification déjà connue lente : ` +
                `${knownMs}ms`
            );
          }
        } catch (err) {
          logError(
            "impossible de vérifier si la fiche est déjà connue",
            err
          );

          return "error";
        }

        // ------------------------------------------------------
        // Extraction
        // ------------------------------------------------------

        let listing:
          | ScrapedListing
          | null;

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
          listing =
            await extractListing(
              session.context,
              url
            );
        }

        processedSinceRecycle++;

        // ------------------------------------------------------
        // Fiche illisible
        // ------------------------------------------------------

        if (!listing) {
          continue;
        }

        // ------------------------------------------------------
        // Callback applicatif
        // ------------------------------------------------------

        try {
          const result =
            await onListing(
              listing
            );

          if (
            !result ||
            typeof result.keepGoing !==
              "boolean"
          ) {
            log(
              "onListing a retourné une réponse invalide"
            );

            return "error";
          }

          if (
            !result.keepGoing
          ) {
            log(
              `objectif atteint après ` +
                `${visited.size} fiches consultées`
            );

            return "target_reached";
          }
        } catch (err) {
          logError(
            `ERREUR DANS onListing pour la fiche ` +
              `"${listing.name || "?"}"`,
            err
          );

          return "error";
        }

        // ------------------------------------------------------
        // Recyclage préventif Chromium
        // ------------------------------------------------------

        if (
          processedSinceRecycle >=
          RECYCLE_EVERY
        ) {
          log(
            `♻ recyclage préventif Chromium après ` +
              `${processedSinceRecycle} fiches`
          );

          logMemory(
            "avant recyclage"
          );

          await closeBrowserSession(
            session
          );

          session = null;

          await sleep(1500);

          try {
            session =
              await createBrowserSession(
                searchUrl
              );

            processedSinceRecycle = 0;

            stagnantRounds = 0;
            lastHrefCount = 0;

            log(
              `✓ Chromium recyclé — ` +
                `${visited.size} fiches conservées`
            );

            logMemory(
              "après recyclage"
            );
          } catch (err) {
            logError(
              "échec du recyclage Chromium",
              err
            );

            return "error";
          }
        }

        // ------------------------------------------------------
        // Si le feed a crashé pendant l'extraction
        // ------------------------------------------------------

        if (
          session.crashed ||
          session.page.isClosed()
        ) {
          recoveryCount++;

          log(
            `💥 crash du feed détecté après traitement ` +
              `de ${visited.size} fiches — ` +
              `récupération ${recoveryCount}/${MAX_RECOVERIES}`
          );

          if (
            recoveryCount > MAX_RECOVERIES
          ) {
            return "error";
          }

          await closeBrowserSession(
            session
          );

          session = null;

          await sleep(2000);

          session =
            await createBrowserSession(
              searchUrl
            );

          stagnantRounds = 0;
          lastHrefCount = 0;
          consecutiveFailures = 0;

          break;
        }
      }

      // --------------------------------------------------------
      // Si la session a été recyclée/crashée pendant le tour
      // --------------------------------------------------------

      if (!session) {
        continue;
      }

      if (
        session.crashed ||
        session.page.isClosed()
      ) {
        continue;
      }

      // --------------------------------------------------------
      // Détection de zone épuisée
      // --------------------------------------------------------

      if (
        hrefs.length ===
        lastHrefCount
      ) {
        stagnantRounds++;
      } else {
        stagnantRounds = 0;
      }

      lastHrefCount =
        hrefs.length;

      if (
        stagnantRounds >= 6
      ) {
        log(
          `zone épuisée après ${round} tours`
        );

        return "zone_exhausted";
      }

      // --------------------------------------------------------
      // Scroll
      // --------------------------------------------------------

      const tScrollStart =
        Date.now();

      try {
        await scrollFeed(
          session.page,
          session.feed
        );

        consecutiveFailures = 0;
      } catch (err) {
        consecutiveFailures++;

        logError(
          `tour ${round} : scroll échoué ` +
            `(${consecutiveFailures}/4)`,
          err
        );

        // Crash du renderer = récupération immédiate.
        if (
          session.crashed ||
          session.page.isClosed() ||
          errorMessage(err).includes(
            "Page crashed"
          )
        ) {
          recoveryCount++;

          log(
            `💥 crash pendant scroll — ` +
              `récupération ${recoveryCount}/${MAX_RECOVERIES}`
          );

          if (
            recoveryCount > MAX_RECOVERIES
          ) {
            return "error";
          }

          await closeBrowserSession(
            session
          );

          session = null;

          await sleep(2000);

          session =
            await createBrowserSession(
              searchUrl
            );

          stagnantRounds = 0;
          lastHrefCount = 0;
          consecutiveFailures = 0;

          continue;
        }

        if (
          consecutiveFailures >= 4
        ) {
          log(
            "scan arrêté : scroll impossible après 4 tentatives"
          );

          return "error";
        }
      }

      // IMPORTANT :
      // Ne plus utiliser page.waitForTimeout ici.
      //
      // Si Chromium vient de mourir pendant le scroll,
      // waitForTimeout() lui-même déclenche :
      // "page.waitForTimeout: Page crashed"
      await sleep(900);

      if (
        session.crashed ||
        session.page.isClosed()
      ) {
        recoveryCount++;

        log(
          `💥 crash détecté après scroll — ` +
            `récupération ${recoveryCount}/${MAX_RECOVERIES}`
        );

        if (
          recoveryCount > MAX_RECOVERIES
        ) {
          return "error";
        }

        await closeBrowserSession(
          session
        );

        session = null;

        await sleep(2000);

        session =
          await createBrowserSession(
            searchUrl
          );

        stagnantRounds = 0;
        lastHrefCount = 0;
        consecutiveFailures = 0;

        continue;
      }

      log(
        `tour ${round} terminé en ` +
          `${Date.now() - tRoundStart}ms ` +
          `(scroll: ${
            Date.now() - tScrollStart
          }ms)`
      );

      // --------------------------------------------------------
      // Monitoring mémoire
      // --------------------------------------------------------

      if (
        round % 10 === 0
      ) {
        logMemory(
          `tour ${round}`
        );
      }
    }
  } catch (err) {
    // ----------------------------------------------------------
    // ERREUR GLOBALE
    // ----------------------------------------------------------

    logError(
      "ERREUR FATALE DU SCAN",
      err
    );

    return "error";
  } finally {
    // ----------------------------------------------------------
    // Nettoyage
    // ----------------------------------------------------------

    await closeBrowserSession(
      session
    );

    logMemory(
      "fin"
    );
  }
}