import { createClient } from "@supabase/supabase-js";

// Client "admin" — utilise la clé service-role, qui ignore la Row Level
// Security. Nécessaire ici parce que le scan Google Maps continue de
// tourner en tâche de fond APRÈS que la réponse HTTP a été envoyée : à ce
// moment-là il n'y a plus de requête/cookies utilisateur disponibles pour
// s'authentifier normalement. On passe donc explicitement `user_id` sur
// chaque écriture, et RLS reste actif pour tout le reste de l'app (lecture
// utilisateur normale via lib/supabase-server.ts).
//
// Nécessite SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY dans .env.local
// (Supabase > Project Settings > API Keys > service_role — à ne JAMAIS
// exposer côté navigateur, d'où l'absence du préfixe NEXT_PUBLIC_).
export function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY doivent être définis dans .env.local pour lancer un scan."
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}
