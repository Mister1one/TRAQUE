"use client";

import { useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    const supabase = getSupabaseBrowser();

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setStatus(error ? "error" : "sent");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-6">
      <div className="w-full max-w-sm border border-line bg-paper p-8">
        <p className="eyebrow mb-2 text-blaze">TRAQUE</p>
        <h1 className="font-display text-2xl font-semibold uppercase leading-tight">
          Accès au dashboard
        </h1>

        {status === "sent" ? (
          <p className="mt-5 text-sm leading-relaxed text-text-ink/75">
            Un lien de connexion vient d&rsquo;être envoyé à{" "}
            <strong>{email}</strong>. Ouvre ta boîte mail et clique dessus
            pour accéder à ton dashboard (pense à vérifier les spams).
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-3">
            <label htmlFor="email" className="sr-only">
              Adresse e-mail
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@entreprise.fr"
              className="w-full border border-ink/25 bg-paper px-4 py-3 text-sm text-text-ink placeholder:text-text-ink/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            />
            <button
              type="submit"
              disabled={status === "sending"}
              className="btn-blaze w-full justify-center disabled:opacity-60"
            >
              {status === "sending" ? "Envoi..." : "Recevoir mon lien de connexion"}
            </button>
            {status === "error" && (
              <p className="text-sm text-blaze">
                Un problème est survenu, réessaie dans un instant.
              </p>
            )}
          </form>
        )}

        <p className="mt-6 text-xs text-text-ink/45">
          Pas de mot de passe : un lien à usage unique t&rsquo;est envoyé par
          e-mail à chaque connexion.
        </p>
      </div>
    </main>
  );
}
