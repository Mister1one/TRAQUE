export type Lang = "fr" | "en";

export const dictionary = {
  fr: {
    nav: {
      fonctionnement: "Fonctionnement",
      fonctionnalites: "Fonctionnalités",
      progression: "Progression",
      cta: "Essayer gratuitement",
    },
    hero: {
      eyebrow: "Outil de prospection — bêta privée",
      titleLine1: "Arrête de chercher",
      titleLine2: "tes clients.",
      titleLine3: "Traque-les.",
      subtitle:
        "TRAQUE scanne votre zone de chalandise, note chaque prospect selon son potentiel, prépare l'approche et déclenche les relances au bon moment. Vous, vous passez l'appel.",
      ctaPrimary: "Essayer gratuitement",
      ctaSecondary: "Voir comment ça marche",
    },
    radar: {
      sector: "Secteur — Occitanie",
      scanning: "scan actif",
      level: "Niveau 3 — Chasseur confirmé",
      points: "640 / 900 pts",
    },
    problem: {
      eyebrow: "Le constat",
      title: "La chasse à l'aveugle, ça ressemble à ça",
      p1: "Ouvrir un fichier texte. Copier un message. Revenir sur la messagerie. Coller. Trouver le nom du prospect suivant. Personnaliser à la main. Envoyer. Recommencer, des centaines de fois. Sans souris, chaque geste devient une corvée — et la moitié du temps passe à répéter la même tâche plutôt qu'à vendre.",
      p2: "TRAQUE reprend ce travail de repérage et de mise en forme, pour que chaque minute passée serve la conversation, pas le copier-coller.",
    },
    pipeline: {
      eyebrow: "Fonctionnement",
      title: "Cinq étapes entre « zone à prospecter » et « client au téléphone »",
      steps: [
        {
          n: "01",
          title: "Sourçage",
          text: "TRAQUE scanne une zone (Google Maps) et remonte les entreprises correspondant à votre cible, avec leurs coordonnées.",
        },
        {
          n: "02",
          title: "Scoring",
          text: "Chaque prospect reçoit une note d'opportunité, pour repérer en un coup d'œil les cibles qui valent l'appel.",
        },
        {
          n: "03",
          title: "Approche",
          text: "Un angle et un pitch personnalisés sont générés pour chaque prospect, prêts à être adaptés en quelques secondes.",
        },
        {
          n: "04",
          title: "Relance",
          text: "Les cycles de relance (J+1, J+3, J+5, puis reprise) sont posés automatiquement, sans fichier à tenir à jour.",
        },
        {
          n: "05",
          title: "Progression",
          text: "Chaque action rapporte des points. Les paliers marquent la montée en compétence, appel après appel.",
        },
      ],
    },
    features: {
      eyebrow: "Fonctionnalités",
      title: "Un poste de travail, pas dix onglets",
      items: [
        {
          title: "Carte de zone",
          text: "Délimitez un secteur géographique et un type d'activité : TRAQUE remonte les prospects correspondants, coordonnées incluses.",
        },
        {
          title: "Fiche prospect",
          text: "Nom, secteur, note d'opportunité et angle d'approche réunis sur une seule fiche, pensée pour être lue juste avant l'appel.",
        },
        {
          title: "File de relance",
          text: "Une liste triée par urgence, mise à jour seule, pour savoir qui rappeler aujourd'hui sans tenir un tableau à part.",
        },
        {
          title: "Historique d'appels",
          text: "Chaque échange est noté au même endroit, pour retrouver en un clic où en est une conversation entamée.",
        },
      ],
    },
    gamification: {
      eyebrow: "Progression",
      titleLine1: "La prospection à froid, en solo, use.",
      titleLine2: "La progression, ça motive.",
      subtitle:
        "Sourcer une fiche, décrocher, obtenir un rendez-vous : chaque action rapporte des points. Les paliers marquent une vraie montée en compétence, pas un gadget — de quoi garder le rythme sur la durée.",
      levels: [
        { rank: "01", title: "Éclaireur", detail: "Premiers prospects sourcés" },
        { rank: "02", title: "Traqueur", detail: "Premiers rendez-vous décrochés" },
        { rank: "03", title: "Chasseur confirmé", detail: "Cadence de relance tenue" },
        { rank: "04", title: "Tête de meute", detail: "Portefeuille en croissance régulière" },
      ],
    },
    waitlist: {
      eyebrow: "Bêta gratuite",
      title: "Passez votre premier appel en moins de 5 minutes",
      subtitle:
        "Le produit est déjà en ligne. Connexion en un clic par lien magique, sans mot de passe, aucune carte bancaire requise.",
      cta: "Essayer gratuitement",
    },
    footer: {
      tagline: "Prospection terrain — France",
    },
  },
  en: {
    nav: {
      fonctionnement: "How it works",
      fonctionnalites: "Features",
      progression: "Progression",
      cta: "Try it free",
    },
    hero: {
      eyebrow: "Prospecting tool — private beta",
      titleLine1: "Stop looking for",
      titleLine2: "your clients.",
      titleLine3: "Track them down.",
      subtitle:
        "TRAQUE scans your target area, scores each prospect by potential, drafts the approach, and triggers follow-ups at the right time. You just make the call.",
      ctaPrimary: "Try it free",
      ctaSecondary: "See how it works",
    },
    radar: {
      sector: "Sector — Occitanie",
      scanning: "scanning",
      level: "Level 3 — Seasoned hunter",
      points: "640 / 900 pts",
    },
    problem: {
      eyebrow: "The problem",
      title: "Prospecting blind looks like this",
      p1: "Open a text file. Copy a message. Switch to your messaging app. Paste. Find the next prospect's name. Personalize by hand. Send. Repeat, hundreds of times. Every step becomes a chore — and half your time goes into repeating the same task instead of actually selling.",
      p2: "TRAQUE takes over this repetitive lookup-and-format work, so every minute you spend goes into the conversation, not the copy-paste.",
    },
    pipeline: {
      eyebrow: "How it works",
      title: "Five steps between \"area to prospect\" and \"client on the phone\"",
      steps: [
        {
          n: "01",
          title: "Sourcing",
          text: "TRAQUE scans an area (Google Maps) and pulls the businesses matching your target, with their contact details.",
        },
        {
          n: "02",
          title: "Scoring",
          text: "Every prospect gets an opportunity score, so you can spot at a glance which ones are worth the call.",
        },
        {
          n: "03",
          title: "Approach",
          text: "A personalized angle and pitch are generated for each prospect, ready to adapt in seconds.",
        },
        {
          n: "04",
          title: "Follow-up",
          text: "Follow-up cycles (day 1, day 3, day 5, then repeat) are scheduled automatically, no spreadsheet to maintain.",
        },
        {
          n: "05",
          title: "Progression",
          text: "Every action earns points. Levels mark your progress, call after call.",
        },
      ],
    },
    features: {
      eyebrow: "Features",
      title: "One workspace, not ten tabs",
      items: [
        {
          title: "Area map",
          text: "Set a geographic area and a type of business: TRAQUE pulls up matching prospects, contact details included.",
        },
        {
          title: "Prospect sheet",
          text: "Name, sector, opportunity score and approach angle on one sheet, built to be read right before the call.",
        },
        {
          title: "Follow-up queue",
          text: "A list sorted by urgency, updated on its own, so you know who to call back today without keeping a separate sheet.",
        },
        {
          title: "Call history",
          text: "Every exchange is logged in the same place, so you can see where a conversation stands in one click.",
        },
      ],
    },
    gamification: {
      eyebrow: "Progression",
      titleLine1: "Cold prospecting solo wears you down.",
      titleLine2: "Progression keeps you going.",
      subtitle:
        "Sourcing a lead, making the call, landing a meeting: every action earns points. Levels mark real skill progression, not a gimmick — something to keep the pace over time.",
      levels: [
        { rank: "01", title: "Scout", detail: "First prospects sourced" },
        { rank: "02", title: "Tracker", detail: "First meetings booked" },
        { rank: "03", title: "Seasoned hunter", detail: "Follow-up cadence kept" },
        { rank: "04", title: "Pack leader", detail: "Portfolio growing steadily" },
      ],
    },
    waitlist: {
      eyebrow: "Free beta",
      title: "Make your first call in under 5 minutes",
      subtitle:
        "The product is already live. One-click magic-link sign in, no password, no credit card required.",
      cta: "Try it free",
    },
    footer: {
      tagline: "Field prospecting — France",
    },
  },
};

export function getDictionary(lang: Lang) {
  return dictionary[lang];
}
