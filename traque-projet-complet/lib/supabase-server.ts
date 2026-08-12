import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

// Client "au nom de l'utilisateur connecté" : utilise la clé publique
// (anon/publishable) + le cookie de session posé par Supabase Auth.
// C'est la Row Level Security côté base de données qui garantit qu'un
// utilisateur ne voit et ne modifie que ses propres lignes — pas de filtre
// manuel à ajouter dans le code des routes.
export async function getSupabaseServer() {
  const cookieStore = await cookies();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY doivent être définis dans .env.local"
    );
  }

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(
        cookiesToSet: {
          name: string;
          value: string;
          options: CookieOptions;
        }[]
      ) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // appelé depuis un Server Component : le middleware s'occupe
          // déjà de rafraîchir la session, on peut ignorer cette écriture.
        }
      },
    },
  });
}
