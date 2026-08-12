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
        "TRAQUE scanne votre zone de chalandise, récupère les coordonnées et la réputation en ligne de chaque prospect, prépare des messages d'approche prêts à l'emploi et déclenche les relances au bon moment. Vous, vous passez l'appel.",
      ctaPrimary: "Essayer gratuitement",
      ctaSecondary: "Voir comment ça marche",
    },
    radar: {
      sector: "Secteur — Occitanie",
      scanning: "scan actif",
      level: "Streak en cours",
      points: "🔥 12 jours d'affilée",
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
          title: "Enrichissement",
          text: "Chaque fiche est complétée avec adresse, site web, note Google et nombre d'avis, pour juger d'un coup d'œil qui vaut l'appel.",
        },
        {
          n: "03",
          title: "Approche",
          text: "Plusieurs messages de prospection sont générés selon le profil du prospect (note, avis, présence en ligne), prêts à copier pour l'appel, le SMS ou l'email.",
        },
        {
          n: "04",
          title: "Relance",
          text: "Les cycles de relance (J+1, J+3, J+5, puis reprise) sont posés automatiquement, sans fichier à tenir à jour.",
        },
        {
          n: "05",
          title: "Suivi",
          text: "Un dashboard affiche le pipeline en temps réel (contactés, taux de conversion) et un streak quotidien garde le rythme, jour après jour.",
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
          text: "Nom, secteur, coordonnées complètes, note Google et avis réunis sur une seule fiche, pensée pour être lue juste avant l'appel.",
        },
        {
          title: "File de relance",
          text: "Une liste triée par urgence, mise à jour seule, pour savoir qui rappeler aujourd'hui sans tenir un tableau à part.",
        },
        {
          title: "Dashboard & streak",
          text: "Le pipeline en un coup d'œil (contactés, taux de conversion) et un streak quotidien pour garder le rythme de prospection.",
        },
      ],
    },
    gamification: {
      eyebrow: "Progression",
      titleLine1: "La prospection à froid, en solo, use.",
      titleLine2: "La régularité, ça motive.",
      subtitle:
        "Chaque changement de statut compte pour la journée. Le streak garde une trace des jours consécutifs où vous avez avancé, et le dashboard résume où en est votre pipeline — de quoi tenir le rythme sur la durée, pas juste un jour de motivation.",
      levels: [
        { rank: "01", title: "Streak quotidien", detail: "Un jour compte dès la première action de prospection" },
        { rank: "02", title: "File de relance", detail: "Les prospects dus remontent automatiquement, tous tableaux confondus" },
        { rank: "03", title: "Pipeline en direct", detail: "Contactés, vendus et taux de conversion, mis à jour en continu" },
        { rank: "04", title: "Répartition par statut", detail: "Voir en un coup d'œil où ça avance et où ça coince" },
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
        "TRAQUE scans your target area, pulls each prospect's contact details and online reputation, drafts ready-to-use outreach messages, and triggers follow-ups at the right time. You just make the call.",
      ctaPrimary: "Try it free",
      ctaSecondary: "See how it works",
    },
    radar: {
      sector: "Sector — Occitanie",
      scanning: "scanning",
      level: "Streak in progress",
      points: "🔥 12 days in a row",
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
          title: "Enrichment",
          text: "Every sheet is completed with address, website, Google rating and review count, so you can judge at a glance who's worth the call.",
        },
        {
          n: "03",
          title: "Approach",
          text: "Several outreach messages are generated based on the prospect's profile (rating, reviews, online presence), ready to copy for a call, text, or email.",
        },
        {
          n: "04",
          title: "Follow-up",
          text: "Follow-up cycles (day 1, day 3, day 5, then repeat) are scheduled automatically, no spreadsheet to maintain.",
        },
        {
          n: "05",
          title: "Tracking",
          text: "A dashboard shows your pipeline in real time (contacted, conversion rate), and a daily streak keeps the pace going, day after day.",
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
          text: "Name, sector, full contact details, Google rating and reviews on one sheet, built to be read right before the call.",
        },
        {
          title: "Follow-up queue",
          text: "A list sorted by urgency, updated on its own, so you know who to call back today without keeping a separate sheet.",
        },
        {
          title: "Dashboard & streak",
          text: "Your pipeline at a glance (contacted, conversion rate) and a daily streak to keep the pace of your prospecting.",
        },
      ],
    },
    gamification: {
      eyebrow: "Progression",
      titleLine1: "Cold prospecting solo wears you down.",
      titleLine2: "Consistency keeps you going.",
      subtitle:
        "Every status change counts for the day. The streak tracks consecutive days you kept moving, and the dashboard sums up where your pipeline stands — something to keep the pace over time, not just one day of motivation.",
      levels: [
        { rank: "01", title: "Daily streak", detail: "A day counts as soon as you log one action" },
        { rank: "02", title: "Follow-up queue", detail: "Due prospects surface automatically, across every search" },
        { rank: "03", title: "Live pipeline", detail: "Contacted, closed, and conversion rate, updated as you work" },
        { rank: "04", title: "Status breakdown", detail: "See at a glance what's moving and what's stuck" },
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
