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
// - Chromium est recyclé périodiquement ;
// - en cas de crash du feed, Chromium est redémarré immédiatement ;
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

// ------------------------------------------------------------
// Utilitaires
// ------------------------------------------------------------

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

// ------------------------------------------------------------
// Adresse
// ------------------------------------------------------------

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
    /(\d{5})\s+([A-Za-zÀ-ÿ0-9'’.\- ]+)/
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

// ------------------------------------------------------------
// Extraction d'une fiche
// ------------------------------------------------------------

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

// ------------------------------------------------------------
// Optimisation des fiches
// ------------------------------------------------------------

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
        // Page potentiellement déjà morte.
      }
    }
  );
}

// ------------------------------------------------------------
// Extraction d'une fiche individuelle
// ------------------------------------------------------------

async function extractListing(
  context: BrowserContext,
  url: string
): Promise<ScrapedListing | null> {
  const t0 = Date.now();

  let detailPage: Page | null = null;

  try {
    detailPage = await context.newPage();

    await optimizeDetailPage(
      detailPage
    );

    const tGotoStart = Date.now();

    await detailPage.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 20000,
    });

    const gotoMs =
      Date.now() - tGotoStart;

    // Ne jamais utiliser page.waitForTimeout().
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

// ------------------------------------------------------------
// Scroll du feed
// ------------------------------------------------------------

async function scrollFeed(
  page: Page,
  feed: Locator
): Promise<void> {
  const cards = feed.locator(
    'a[href*="/maps/place/"]'
  );

  const cardCount = await cards
    .count();

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
      // Le scroll global ci-dessous
      // reste la solution de secours.
    }
  }

  await page.mouse.wheel(0, 900);

  await sleep(250);

  await page.mouse.wheel(0, 900);

  await feed.evaluate((el) => {
    el.scrollBy(0, 1200);
  });
}

// ------------------------------------------------------------
// Lecture du feed
// ------------------------------------------------------------

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
        await sleep(1000);
      }
    }
  }

  throw lastError;
}

// ------------------------------------------------------------
// Vérification DB
// ------------------------------------------------------------

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
        await sleep(
          1000 * attempt
        );
      }
    }
  }

  throw lastError;
}

// ------------------------------------------------------------
// Session Chromium
// ------------------------------------------------------------

type BrowserSessionState = {
  crashed: boolean;
};

type BrowserSession = {
  browser: Browser;
  context: BrowserContext;
  page: Page;
  feed: Locator;

  // IMPORTANT :
  // Objet mutable partagé avec les listeners Playwright.
  //
  // On ne met surtout PAS :
  // crashed: boolean
  //
  // car un boolean retourné depuis createBrowserSession()
  // serait copié par valeur et ne serait jamais mis à jour.
  state: BrowserSessionState;
};

// ------------------------------------------------------------
// Vérifie si une session est morte
// ------------------------------------------------------------

function isSessionDead(
  session: BrowserSession | null
): boolean {
  if (!session) {
    return true;
  }

  return (
    session.state.crashed ||
    session.page.isClosed()
  );
}

// ------------------------------------------------------------
// Création d'une session Chromium
// ------------------------------------------------------------

async function createBrowserSession(
  searchUrl: string
): Promise<BrowserSession> {
  let browser: Browser | null = null;
  let context: BrowserContext | null = null;
  let page: Page | null = null;

  const state: BrowserSessionState = {
    crashed: false,
  };

  try {
    browser = await chromium.launch({
      headless: true,

      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",

        "--disable-background-networking",
        "--disable-background-timer-throttling",
        "--disable-renderer-backgrounding",
        "--disable-extensions",
        "--disable-sync",
        "--disable-translate",
      ],
    });

    browser.on(
      "disconnected",
      () => {
        state.crashed = true;

        log(
          "⚠ Chromium déconnecté"
        );
      }
    );

    context =
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

    page =
      await context.newPage();

    page.on("crash", () => {
      state.crashed = true;

      log(
        "💥 CRASH DU RENDERER DE LA PAGE GOOGLE MAPS"
      );
    });

    await page.goto(searchUrl, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    if (state.crashed) {
      throw new Error(
        "Le renderer Google Maps a crashé pendant le chargement initial"
      );
    }

    log(
      "recherche Google Maps chargée"
    );

    // ----------------------------------------------------------
    // Consentement
    // ----------------------------------------------------------

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

    if (state.crashed) {
      throw new Error(
        "Le renderer Google Maps a crashé après le chargement"
      );
    }

    // ----------------------------------------------------------
    // Feed
    // ----------------------------------------------------------

    const feed = page.locator(
      'div[role="feed"]'
    );

    await feed.waitFor({
      timeout: 15000,
    });

    if (state.crashed) {
      throw new Error(
        "Le renderer Google Maps a crashé pendant la détection du feed"
      );
    }

    log(
      "feed Google Maps détecté"
    );

    return {
      browser,
      context,
      page,
      feed,
      state,
    };
  } catch (err) {
    // Si la création initiale échoue,
    // on nettoie TOUT avant de relancer l'erreur.
    if (page) {
      await page
        .close()
        .catch(() => {});
    }

    if (context) {
      await context
        .close()
        .catch(() => {});
    }

    if (browser) {
      await browser
        .close()
        .catch(() => {});
    }

    throw err;
  }
}

// ------------------------------------------------------------
// Fermeture Chromium
// ------------------------------------------------------------

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

// ------------------------------------------------------------
// Scan principal
// ------------------------------------------------------------

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

  // Nombre de récupérations consécutives.
  //
  // On le remet à zéro après un tour réussi.
  // Ainsi un crash occasionnel ne condamne pas
  // tout le scan.
  let recoveryStreak = 0;

  let processedSinceRecycle = 0;

  // ------------------------------------------------------------
  // Limites de sécurité
  // ------------------------------------------------------------

  // Beaucoup plus prudent que 40.
  //
  // L'objectif est d'éviter de laisser le même Chromium
  // gérer trop longtemps Google Maps + les onglets de fiches.
  const RECYCLE_EVERY = 20;

  // Si Chromium crash plusieurs fois d'affilée,
  // on arrête plutôt que de boucler indéfiniment.
  const MAX_CONSECUTIVE_RECOVERIES = 5;

  const searchTerm =
    `${activite} ${zone}`;

  const searchUrl =
    `https://www.google.com/maps/search/` +
    `${encodeURIComponent(searchTerm)}?hl=fr`;

  // ------------------------------------------------------------
  // Fonction locale de récupération
  // ------------------------------------------------------------

  const recoverSession =
    async (
      reason: string
    ): Promise<boolean> => {
      recoveryStreak++;

      log(
        `💥 récupération Chromium — ` +
          `${reason} — ` +
          `tentative ${recoveryStreak}/${MAX_CONSECUTIVE_RECOVERIES}`
      );

      if (
        recoveryStreak >
        MAX_CONSECUTIVE_RECOVERIES
      ) {
        log(
          "scan arrêté : trop de crashs Chromium consécutifs"
        );

        return false;
      }

      await closeBrowserSession(
        session
      );

      session = null;

      await sleep(2000);

      try {
        session =
          await createBrowserSession(
            searchUrl
          );

        stagnantRounds = 0;
        lastHrefCount = 0;
        consecutiveFailures = 0;
        processedSinceRecycle = 0;

        log(
          `✓ Chromium redémarré — ` +
            `${visited.size} fiches déjà visitées conservées`
        );

        return true;
      } catch (err) {
        logError(
          "échec du redémarrage Chromium",
          err
        );

        session = null;

        return false;
      }
    };

  try {
    log(
      `début scan "${searchTerm}"`
    );

    logMemory("début");

    // ----------------------------------------------------------
    // Première session
    // ----------------------------------------------------------

    try {
      session =
        await createBrowserSession(
          searchUrl
        );
    } catch (err) {
      logError(
        "impossible de démarrer Chromium",
        err
      );

      return "error";
    }

    // ----------------------------------------------------------
    // Boucle principale
    // ----------------------------------------------------------

    while (true) {
      round++;

      const tRoundStart =
        Date.now();

      // --------------------------------------------------------
      // Vérification immédiate de l'état Chromium
      // --------------------------------------------------------

      if (
        isSessionDead(session)
      ) {
        const recovered =
          await recoverSession(
            "feed Chromium mort avant lecture"
          );

        if (!recovered) {
          return "error";
        }

        continue;
      }

      // --------------------------------------------------------
      // Lecture du feed
      // --------------------------------------------------------

      let hrefs: string[];

      try {
        hrefs =
          await readFeedUrls(
            session.feed,
            4
          );

        consecutiveFailures = 0;
      } catch (err) {
        const message =
          errorMessage(err);

        logError(
          `tour ${round} : lecture du feed échouée`,
          err
        );

        // ------------------------------------------------------
        // CRASH = récupération immédiate
        // ------------------------------------------------------

        if (
          isSessionDead(session) ||
          message.includes(
            "Page crashed"
          ) ||
          message.includes(
            "Target crashed"
          )
        ) {
          const recovered =
            await recoverSession(
              "crash pendant lecture du feed"
            );

          if (!recovered) {
            return "error";
          }

          continue;
        }

        // ------------------------------------------------------
        // Erreur temporaire normale
        // ------------------------------------------------------

        consecutiveFailures++;

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
      // Vérification après lecture
      // --------------------------------------------------------

      if (
        isSessionDead(session)
      ) {
        const recovered =
          await recoverSession(
            "crash détecté après lecture du feed"
          );

        if (!recovered) {
          return "error";
        }

        continue;
      }

      // --------------------------------------------------------
      // URLs nouvelles
      // --------------------------------------------------------

      const fresh =
        hrefs.filter(
          (url) =>
            !visited.has(url)
        );

      log(
        `tour ${round} : ` +
          `${hrefs.length} liens visibles, ` +
          `${fresh.length} nouveaux`
      );

      // --------------------------------------------------------
      // Traitement des nouvelles fiches
      // --------------------------------------------------------

      let sessionRecoveredDuringRound =
        false;

      for (const url of fresh) {
        // On mémorise immédiatement l'URL.
        //
        // Si Chromium crash ensuite, elle ne sera pas
        // retraitée indéfiniment.
        visited.add(url);

        // ------------------------------------------------------
        // Vérification session AVANT chaque fiche
        // ------------------------------------------------------

        if (
          isSessionDead(session)
        ) {
          const recovered =
            await recoverSession(
              "crash avant traitement d'une fiche"
            );

          if (!recovered) {
            return "error";
          }

          sessionRecoveredDuringRound =
            true;

          break;
        }

        // ------------------------------------------------------
        // URL connue
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
              `vérification déjà connue lente : ${knownMs}ms`
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
        // IMPORTANT :
        // Une fiche peut avoir crashé sans que Chromium
        // principal soit mort.
        //
        // extractListing() absorbe volontairement son erreur.
        // On continue donc normalement.
        // ------------------------------------------------------

        if (!listing) {
          // Mais on vérifie quand même si Chromium principal
          // est mort pendant ce temps.
          if (
            isSessionDead(session)
          ) {
            const recovered =
              await recoverSession(
                "crash du feed pendant extraction d'une fiche"
              );

            if (!recovered) {
              return "error";
            }

            sessionRecoveredDuringRound =
              true;

            break;
          }

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
        // CRASH DU FEED APRÈS LA FICHE
        // ------------------------------------------------------

        if (
          isSessionDead(session)
        ) {
          const recovered =
            await recoverSession(
              "crash du feed après traitement d'une fiche"
            );

          if (!recovered) {
            return "error";
          }

          sessionRecoveredDuringRound =
            true;

          break;
        }

        // ------------------------------------------------------
        // Recyclage préventif
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
            consecutiveFailures = 0;

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

            session = null;

            return "error";
          }

          sessionRecoveredDuringRound =
            true;

          break;
        }
      }

      // --------------------------------------------------------
      // Une récupération/reconnexion vient d'avoir lieu.
      //
      // On recommence la boucle avec le nouveau feed.
      // visited reste intact.
      // --------------------------------------------------------

      if (
        sessionRecoveredDuringRound
      ) {
        continue;
      }

      // --------------------------------------------------------
      // Vérification session avant scroll
      // --------------------------------------------------------

      if (
        isSessionDead(session)
      ) {
        const recovered =
          await recoverSession(
            "feed mort avant scroll"
          );

        if (!recovered) {
          return "error";
        }

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
        const message =
          errorMessage(err);

        logError(
          `tour ${round} : scroll échoué`,
          err
        );

        // ------------------------------------------------------
        // CRASH = récupération immédiate
        // ------------------------------------------------------

        if (
          isSessionDead(session) ||
          message.includes(
            "Page crashed"
          ) ||
          message.includes(
            "Target crashed"
          )
        ) {
          const recovered =
            await recoverSession(
              "crash pendant scroll"
            );

          if (!recovered) {
            return "error";
          }

          continue;
        }

        // ------------------------------------------------------
        // Erreur scroll temporaire
        // ------------------------------------------------------

        consecutiveFailures++;

        if (
          consecutiveFailures >= 4
        ) {
          log(
            "scan arrêté : scroll impossible après 4 tentatives"
          );

          return "error";
        }

        await sleep(3000);

        continue;
      }

      // --------------------------------------------------------
      // Attente entre deux scrolls
      // --------------------------------------------------------

      // Pas de page.waitForTimeout().
      await sleep(900);

      // --------------------------------------------------------
      // Vérification crash après scroll
      // --------------------------------------------------------

      if (
        isSessionDead(session)
      ) {
        const recovered =
          await recoverSession(
            "crash détecté après scroll"
          );

        if (!recovered) {
          return "error";
        }

        continue;
      }

      // --------------------------------------------------------
      // Tour terminé correctement
      // --------------------------------------------------------

      log(
        `tour ${round} terminé en ` +
          `${Date.now() - tRoundStart}ms ` +
          `(scroll: ${
            Date.now() - tScrollStart
          }ms)`
      );

      // Un tour complet sans crash =
      // on considère que Chromium est à nouveau stable.
      recoveryStreak = 0;

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
    logError(
      "ERREUR FATALE DU SCAN",
      err
    );

    return "error";
  } finally {
    await closeBrowserSession(
      session
    );

    logMemory("fin");
  }
}