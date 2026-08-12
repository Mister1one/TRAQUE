import { createClient } from "@supabase/supabase-js";

// Ce client utilise la clé service_role : il ne doit JAMAIS être importé
// dans un composant client ("use client") ni exposé au navigateur.
// Il n'est utilisé que dans les Server Components et les routes /app/api/*.
export function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY doivent être définis dans .env.local"
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

export type Tableau = {
  id: string;
  user_id: string;
  nom: string;
  activite: string;
  zone: string;
  created_at: string;
};

export type Prospect = {
  id: string;
  tableau_id: string;
  name: string;
  category: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  phone: string | null;
  google_maps_url: string | null;
  website: string | null;
  has_website: boolean;
  rating: number | null;
  reviews_count: number | null;
  source_zone: string | null;
  source_query: string | null;
  score: number | null;
  score_reasons: Record<string, number> | null;
  pitch: string | null;
  pitch_generated_at: string | null;
  status:
    | "a_contacter"
    | "appele"
    | "relance_prevue"
    | "rdv"
    | "gagne"
    | "perdu";
  next_relance_date: string | null;
  relance_stage: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

// Table réellement alimentée par le scan Google Maps actuel
// (app/api/scans/route.ts). Distincte de `prospects` ci-dessus, qui vient
// de l'ancien schéma (tableaux/scoring/pitch/relance) et n'est plus écrite
// par aucun code du produit — à ne pas utiliser comme source du tableur.
export type Company = {
  id: string;
  user_id: string;
  google_maps_url: string;
  name: string;
  category: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  phone: string | null;
  website: string | null;
  rating: number | null;
  reviews_count: number | null;
  activite: string;
  zone: string;
  status:
    | "a_contacter"
    | "envoyee"
    | "conversation"
    | "refus"
    | "a_relancer"
    | "injoignable"
    | "a_rappeler"
    | "rdv"
    | "vendu";
  notes: string | null;
  next_relance_date: string | null;
  relance_stage: number;
  created_at: string;
};
