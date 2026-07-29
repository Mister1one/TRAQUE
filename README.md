# TRAQUE — Landing page

Landing page Next.js (App Router, TypeScript, Tailwind CSS) pour TRAQUE,
l'outil de prospection qui scanne un secteur, note les prospects, prépare
l'approche et gère les relances.

## Démarrer en local

```bash
npm install
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000).

## Structure

- `app/layout.tsx` — polices (Oswald, Inter, JetBrains Mono) + metadata
- `app/page.tsx` — assemblage des sections
- `components/` — chaque section (Hero, Problem, Pipeline, Features,
  Gamification, Waitlist, Footer) + `RadarBoard.tsx`, le visuel signature
  de la hero section
- `tailwind.config.ts` — tokens de design (couleurs, polices, animations)

## Design

- **Palette** : fond papier `#E7E8E1`, encre `#13161A`, orange chasse
  (blaze) `#FF4E1F` en accent unique, vert forêt `#21362B` et olive
  `#8A9A6B` en soutien.
- **Typo** : Oswald (display, condensé, majuscules) / Inter (texte) /
  JetBrains Mono (labels, coordonnées, scores).
- **Signature** : le `RadarBoard`, un tableau de repérage façon carte
  tactique avec balayage radar, prospects notés et barre de niveau —
  qui relie le scoring, l'approche et la gamification en un seul visuel.

## Dashboard MVP (sourçage, scoring, pitch, relances)

Le dashboard vit sous `/dashboard`. Il scrape Google Maps, note chaque
prospect, génère un pitch d'appel à la demande, et gère les relances et
la progression (points/niveaux).

### 1. Créer un projet Supabase

1. Va sur [supabase.com](https://supabase.com), crée un projet (gratuit).
2. Dans **SQL Editor**, colle le contenu de `supabase/schema.sql` et
   exécute-le. Ça crée les tables `prospects`, `call_log`, `points_log`.
3. Dans **Project Settings > API**, récupère :
   - `Project URL` → `SUPABASE_URL`
   - `service_role` key (⚠️ pas la clé `anon`) → `SUPABASE_SERVICE_ROLE_KEY`

### 2. Récupérer une clé Anthropic

Sur [console.anthropic.com](https://console.anthropic.com), crée une clé
API → `ANTHROPIC_API_KEY`. C'est elle qui génère les pitchs d'appel.

### 3. Configurer l'environnement

```bash
cp .env.local.example .env.local
```

Remplis les trois valeurs dans `.env.local`.

### 4. Installer les dépendances + le navigateur du scraper

```bash
npm install
npx playwright install chromium
```

La deuxième commande télécharge le navigateur headless utilisé pour
scraper Google Maps (indépendant de ton navigateur habituel).

### 5. Lancer

```bash
npm run dev
```

Va sur `http://localhost:3000/dashboard`.

### Important — à savoir avant d'utiliser le scraper

- Le scraping direct de Google Maps est **contraire aux CGU de Google**.
  C'est un choix assumé pour aller vite en V1, mais ça peut se faire
  bloquer (CAPTCHA, IP bannie) et demandera de la maintenance quand
  Google change son HTML. Le code est isolé dans `lib/scraper.ts` pour
  pouvoir basculer facilement vers l'API officielle Google Places plus
  tard (payante, quelques centimes par requête, mais stable).
- Pas d'authentification pour l'instant (V1 solo) : les policies Supabase
  sont ouvertes (`using (true)`). **Ne déploie pas ce projet publiquement
  tel quel** — n'importe qui connaissant l'URL pourrait lire/écrire les
  données. Si tu veux le mettre en ligne, il faut ajouter une auth basique
  avant.
- Les règles de scoring (`lib/scoring.ts`) supposent que tu vends une
  offre "présence digitale" (site web, visibilité). Si ton offre est
  différente, ajuste les poids dans ce fichier — c'est le seul endroit à
  changer.

## Prochaines étapes possibles

- Brancher le formulaire de la waitlist sur un vrai endpoint (ex. Resend,
  un webhook, ou une table Supabase).
- Ajouter des mentions légales / politique de confidentialité avant tout
  trafic public.
- Ajouter une authentification basique avant tout déploiement public du
  dashboard.
- Basculer `lib/scraper.ts` vers l'API officielle Google Places une fois
  le revenu au rendez-vous.
