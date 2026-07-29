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

export type Prospect = {
  id: string;
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
