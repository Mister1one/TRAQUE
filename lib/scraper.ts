import { chromium, type BrowserContext, type Page } from "playwright";
import { readFileSync } from "fs";

// Scraper Google Maps — moteur de découverte incrémentale.
//
// scanGoogleMaps continue de faire défiler la zone tant que le callback
// `onListing` répond { keepGoing: true }, et détecte lui-même la "zone
// épuisée" (Maps arrête de proposer de nouvelles fiches malgré le scroll).
//
// Optimisation : si `isKnownUrl` est fourni, une fiche déjà connue n'est
// jamais rouverte (pas de navigation, pas d'attente) — seul un objet
// minimal est transmis à `onListing`, pour laisser l'appelant compter la
// fiche comme "déjà vue" sans repayer le coût d'une vraie visite de page.
//
// IMPORTANT : la page qui affiche la liste de résultats (le "feed") ne
// navigue JAMAIS vers une fiche détaillée. Chaque fiche est ouverte dans
// un onglet séparé (context.newPage()) puis refermée aussitôt — sinon la
// page principale se retrouve coincée sur la dernière fiche visitée, le
// feed disparaît, et le scraper croit à tort avoir épuisé la zone après
// le premier lot de résultats (bug historique : arrêt systématique à 10).
//
// NOTE : une tentative précédente ajoutait un second BrowserContext dédié
// aux fiches détail (recyclé périodiquement) pour limiter l'accumulation
// mémoire de Chromium sur les scans longs. Sur cette machine, ça a
// provoqué un blocage total et silencieux dès la toute première fiche
// (aucune erreur, aucun timeout — juste plus rien). On revient donc à un
// SEUL contexte partagé pour tout (feed + fiches détail), qui est la
// version qui a fait ses preuves (100/100 sur "électricien lyon"). Si le
// ralentissement progressif sur les scans très longs revient, on le
// traitera séparément — sans jamais réintroduire un second contexte sans
// l'avoir testé isolément.
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

function log(msg: string) {
  console.log(`[scan ${new Date().toISOString().slice(11, 19)}] ${msg}`);
}

function extractPostalCodeAndCity(
  address: string | null
): { postalCode: string | null; city: string | null } {
  if (!address) return { postalCode: null, city: null };
  const match = address.match(/(\d{5})\s+([A-Za-zÀ-ÿ\- ]+)/);
  if (!match) return { postalCode: null, city: null };
  return { postalCode: match[1], city: match[2].trim() };
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
  if (!name) return null;

  // Timeout court (3s) sur chaque sélecteur optionnel : par défaut Playwright
  // attend 30s avant d'abandonner un élément introuvable, et une fiche peut
  // en avoir plusieurs qui manquent (pas de catégorie, pas d'avis...) — ça
  // gonflait le temps par fiche jusqu'à plusieurs dizaines de secondes sans
  // aucun bénéfice, puisque le résultat est de toute façon "non trouvé".
  const address = await page
    .locator('button[data-item-id^="address"]')
    .first()
    .getAttribute("aria-label", { timeout: 3000 })
    .then((v) => v?.replace(/^Adresse\s*:\s*/i, "").trim() ?? null)
    .catch(() => null);

  const phone = await page
    .locator('button[data-item-id^="phone:tel:"]')
    .first()
    .getAttribute("aria-label", { timeout: 3000 })
    // Google Maps utilise plusieurs libellés selon les fiches
    // ("Téléphone :", "Numéro de téléphone :", ...) : plutôt que de les
    // lister tous, on retire simplement tout ce qui précède le premier
    // chiffre, ce qui reste robuste si Google en introduit un nouveau.
    .then((v) => v?.replace(/^[^\d+]+/, "").trim() ?? null)
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
  const rating = ratingText ? parseFloat(ratingText.replace(",", ".")) : null;

  const reviewsRaw = await page
    .locator('div.F7nice span[aria-label*="avis"]')
    .first()
    .getAttribute("aria-label", { timeout: 3000 })
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

/**
 * Ouvre une fiche dans un onglet dédié, l'extrait, puis referme l'onglet.
 * Ne touche jamais à la page du feed.
 */
async function extractListing(
  context: BrowserContext,
  url: string
): Promise<ScrapedListing | null> {
  const t0 = Date.now();
  log(`ouverture fiche ${url}`);
  const detailPage = await context.newPage();
  log(`onglet ouvert (${Date.now() - t0}ms)`);
  try {
    const tGotoStart = Date.now();
    await detailPage.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
    const gotoMs = Date.now() - tGotoStart;
    await detailPage.waitForTimeout(500);
    const result = await extractListingFromPage(detailPage, url);
    log(
      `fiche "${result?.name || "?"}" — goto ${gotoMs}ms, total ${Date.now() - t0}ms`
    );
    return result;
  } catch (err) {
    log(
      `ÉCHEC fiche ${url} après ${Date.now() - t0}ms — ${
        err instanceof Error ? err.message : String(err)
      }`
    );
    return null;
  } finally {
    await detailPage.close().catch(() => {});
  }
}

/**
 * Fait défiler le feed avec un vrai geste de molette positionné sur la
 * dernière fiche visible (Google Maps ignore souvent un scroll déclenché
 * en JS pur ou un geste "dans le vide").
 */
async function scrollFeed(page: Page, feed: import("playwright").Locator) {
  const cards = feed.locator('a[href*="/maps/place/"]');
  const cardCount = await cards.count().catch(() => 0);

  if (cardCount > 0) {
    try {
      await cards.nth(cardCount - 1).scrollIntoViewIfNeeded({ timeout: 3000 });
      const box = await cards.nth(cardCount - 1).boundingBox();
      if (box) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      }
    } catch {
      // pas grave, on scrolle quand même depuis la position actuelle de la souris
    }
  }

  // Double geste de molette : un seul est parfois ignoré par Maps.
  await page.mouse.wheel(0, 900);
  await page.waitForTimeout(250);
  await page.mouse.wheel(0, 900);

  // Filet de sécurité : scroll JS direct sur le conteneur, en plus du
  // geste de molette (ne fait pas de mal si le geste a déjà fonctionné).
  await feed.evaluate((el) => el.scrollBy(0, 1200)).catch(() => {});
}

// Le scraper (process Node) et Chromium sont deux processus séparés : la
// mémoire qui fait planter le conteneur est celle de Chromium (et ses
// sous-processus renderer), pas celle de Node — `process.memoryUsage()` ne
// la verrait donc jamais. La seule mesure fiable est celle du conteneur
// dans son ensemble, lue directement dans le cgroup (Node + Chromium +
// tous ses enfants).
function readContainerMemoryUsage(): { usedBytes: number; limitBytes: number } | null {
  try {
    // cgroup v2 (Railway et la plupart des conteneurs récents)
    const used = parseInt(readFileSync("/sys/fs/cgroup/memory.current", "utf8").trim(), 10);
    const limitRaw = readFileSync("/sys/fs/cgroup/memory.max", "utf8").trim();
    const limit = limitRaw === "max" ? Infinity : parseInt(limitRaw, 10);
    if (Number.isFinite(used) && limit > 0) return { usedBytes: used, limitBytes: limit };
  } catch {
    // on tente le fallback cgroup v1 ci-dessous
  }
  try {
    // cgroup v1 (anciens conteneurs)
    const used = parseInt(
      readFileSync("/sys/fs/cgroup/memory/memory.usage_in_bytes", "utf8").trim(),
      10
    );
    const limit = parseInt(
      readFileSync("/sys/fs/cgroup/memory/memory.limit_in_bytes", "utf8").trim(),
      10
    );
    if (Number.isFinite(used) && Number.isFinite(limit) && limit > 0) {
      return { usedBytes: used, limitBytes: limit };
    }
  } catch {
    // ni v2 ni v1 lisible (environnement local, macOS, etc.)
  }
  return null;
}

// Seuil de recyclage : dès que le conteneur dépasse cette fraction de sa
// limite mémoire, on ferme le navigateur et on en relance un neuf plutôt
// que d'attendre le crash. Volontairement bas (50%, pas 75%) : le check ne
// se fait qu'entre deux fiches, donc un pic pendant le chargement d'UNE
// fiche peut dépasser le seuil avant même la prochaine vérification (vu en
// pratique : 999Mo/1000Mo avec un seuil à 75%). Une grosse marge évite de
// jouer à un cheveu du crash à chaque scan.
const MEMORY_RECYCLE_THRESHOLD = 0.5;

// Filet de sécurité si /sys/fs/cgroup n'est pas lisible (ex: en local) :
// on garde un plafond fixe de fiches par session pour ne jamais tourner
// indéfiniment sans aucun recyclage.
const HARD_RECYCLE_CEILING = 20;

/**
 * Ouvre un navigateur, lance la recherche et scrolle le feed jusqu'à
 * atteindre l'objectif, épuiser la zone, tomber en erreur, ou dépasser
 * RECYCLE_AFTER_LISTINGS nouvelles fiches (auquel cas le navigateur est
 * fermé et scanGoogleMaps relance une session neuve).
 */
async function runOneSession(
  activite: string,
  zone: string,
  visited: Set<string>,
  onListing: (listing: ScrapedListing) => Promise<{ keepGoing: boolean }>,
  options?: { isKnownUrl?: (url: string) => Promise<boolean> }
): Promise<"target_reached" | "zone_exhausted" | "error" | "recycle"> {
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    viewport: { width: 1366, height: 900 },
    locale: "fr-FR",
  });

  // Bloque images/médias/polices au niveau du context : il est partagé
  // entre le feed et toutes les fiches détail (context.newPage()), donc
  // une seule règle couvre tout, sans toucher à l'architecture page/context
  // (cf. note plus haut sur la tentative de second context qui avait
  // provoqué un blocage silencieux). On ne scrape que du texte (h1,
  // boutons, attributs aria-label) : les images ne servent à rien ici et
  // sont la principale source d'accumulation mémoire sur les scans longs.
  await context.route("**/*", (route) => {
    const type = route.request().resourceType();
    if (type === "image" || type === "media" || type === "font") {
      return route.abort();
    }
    return route.continue();
  });

  const page = await context.newPage();
  let listingsThisSession = 0;

  try {
    const searchTerm = `${activite} ${zone}`;

    // Ouvre la recherche, accepte le bandeau de consentement, et attend le
    // feed — le tout dans une fonction ré-essayable : après un recyclage,
    // cette séquence peut ponctuellement échouer (Google redirige vers
    // consent.google.com et ne revient pas à temps, coupure réseau...)
    // sans que ça veuille dire que la recherche elle-même pose problème.
    // Un simple nouvel essai (nouvelle navigation, sur la même page) suffit
    // dans l'immense majorité des cas.
    const feed = page.locator('div[role="feed"]');
    const MAX_SEARCH_ATTEMPTS = 3;

    for (let attempt = 1; attempt <= MAX_SEARCH_ATTEMPTS; attempt++) {
      try {
        const tSearchStart = Date.now();
        await page.goto(
          `https://www.google.com/maps/search/${encodeURIComponent(searchTerm)}?hl=fr`,
          { waitUntil: "domcontentloaded", timeout: 30000 }
        );
        log(
          `recherche "${searchTerm}" chargée en ${Date.now() - tSearchStart}ms (essai ${attempt}/${MAX_SEARCH_ATTEMPTS})`
        );

        try {
          const consentButton = page.getByRole("button", {
            name: /tout accepter|j'accepte|accepter/i,
          });
          await consentButton.click({ timeout: 4000 });
          log("bandeau de consentement accepté");
        } catch {
          // pas de bandeau
        }

        await feed.waitFor({ timeout: 15000 });
        break; // feed trouvé, on sort de la boucle de tentatives
      } catch (err) {
        if (attempt >= MAX_SEARCH_ATTEMPTS) throw err;
        log(
          `échec chargement recherche/feed (essai ${attempt}/${MAX_SEARCH_ATTEMPTS}) — ${
            err instanceof Error ? err.message : String(err)
          } — nouvel essai dans 3s`
        );
        await page.waitForTimeout(3000);
      }
    }

    let stagnantRounds = 0;
    let lastHrefCount = 0;
    let consecutiveFailures = 0;
    let round = 0;

    while (true) {
      round++;
      const tRoundStart = Date.now();
      let hrefs: string[];
      try {
        // On lit toujours les liens depuis `feed`, jamais depuis `page`
        // en entier : la page principale ne quitte plus jamais cette vue,
        // mais ça reste la lecture la plus fiable si Maps ajoute des
        // liens "/maps/place/" ailleurs sur la page (pub, panneau latéral).
        hrefs = await feed
          .locator('a[href*="/maps/place/"]')
          .evaluateAll((els) => els.map((e) => (e as HTMLAnchorElement).href));
      } catch {
        // Coupure temporaire (page qui se réaffiche, ralentissement) :
        // on laisse une seconde chance avant d'abandonner pour de bon.
        consecutiveFailures++;
        log(`tour ${round} : lecture des liens échouée (${consecutiveFailures}/4)`);
        if (consecutiveFailures >= 4) {
          return "error";
        }
        await page.waitForTimeout(3000);
        continue;
      }
      consecutiveFailures = 0;

      const fresh = hrefs.filter((h) => !visited.has(h));
      log(`tour ${round} : ${hrefs.length} liens visibles, ${fresh.length} nouveaux`);

      for (const url of fresh) {
        visited.add(url);

        const tKnownStart = Date.now();
        const known = options?.isKnownUrl ? await options.isKnownUrl(url) : false;
        const knownMs = Date.now() - tKnownStart;
        if (knownMs > 1000) {
          log(`vérification "déjà connue" lente : ${knownMs}ms`);
        }

        let listing: ScrapedListing | null;
        if (known) {
          // Déjà connue : on ne rouvre pas la fiche, juste un objet minimal.
          listing = { googleMapsUrl: url, name: "", category: null, address: null, city: null, postalCode: null, phone: null, website: null, rating: null, reviewsCount: null, skipped: true };
        } else {
          // Ouverte dans un onglet séparé : la page du feed n'est jamais
          // touchée, elle reste scrollable pour la suite du scan.
          listing = await extractListing(context, url);
        }

        if (listing) {
          const { keepGoing } = await onListing(listing);
          if (!keepGoing) return "target_reached";

          if (!known) {
            listingsThisSession++;

            const mem = readContainerMemoryUsage();
            const ratio = mem && mem.limitBytes !== Infinity ? mem.usedBytes / mem.limitBytes : null;
            const overMemoryThreshold = ratio !== null && ratio >= MEMORY_RECYCLE_THRESHOLD;
            const overHardCeiling = listingsThisSession >= HARD_RECYCLE_CEILING;

            if (overMemoryThreshold || overHardCeiling) {
              const memInfo =
                ratio !== null
                  ? `${Math.round((mem!.usedBytes / 1024 / 1024))}Mo/${Math.round(mem!.limitBytes / 1024 / 1024)}Mo (${Math.round(ratio * 100)}%)`
                  : "mémoire non lisible, plafond fixe atteint";
              log(
                `recyclage du navigateur après ${listingsThisSession} fiches — ${memInfo} — relance de la recherche`
              );
              return "recycle";
            }

            // Petite pause aléatoire entre deux fiches : ça laisse le temps
            // à Chromium de faire un peu de ménage entre deux ouvertures,
            // et ça réduit le rythme de scraping (plus dur à détecter côté
            // Google que 1 fiche toutes les 1-3s en continu).
            await page.waitForTimeout(700 + Math.floor(Math.random() * 900));
          }
        }
      }

      if (hrefs.length === lastHrefCount) stagnantRounds++;
      else stagnantRounds = 0;
      lastHrefCount = hrefs.length;

      if (stagnantRounds >= 6) {
        log(`zone épuisée après ${round} tours`);
        return "zone_exhausted";
      }

      const tScrollStart = Date.now();
      try {
        await scrollFeed(page, feed);
      } catch {
        consecutiveFailures++;
        if (consecutiveFailures >= 4) {
          return "error";
        }
      }
      await page.waitForTimeout(900);
      log(
        `tour ${round} terminé en ${Date.now() - tRoundStart}ms (scroll: ${Date.now() - tScrollStart}ms)`
      );
    }
  } finally {
    await browser.close();
  }
}

export async function scanGoogleMaps(
  activite: string,
  zone: string,
  onListing: (listing: ScrapedListing) => Promise<{ keepGoing: boolean }>,
  options?: { isKnownUrl?: (url: string) => Promise<boolean> }
): Promise<ScanOutcome> {
  // `visited` vit en dehors des sessions : après un recyclage, le nouveau
  // navigateur repart de zéro sur Google Maps mais ignore instantanément
  // tout ce qui a déjà été vu, sans même repasser par la vérification
  // "déjà connue" en base.
  const visited = new Set<string>();

  while (true) {
    const outcome = await runOneSession(activite, zone, visited, onListing, options);
    if (outcome === "recycle") continue;
    return outcome;
  }
}
