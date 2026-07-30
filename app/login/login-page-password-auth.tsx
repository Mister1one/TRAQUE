"use client";

import { useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    const supabase = getSupabaseBrowser();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("Erreur signInWithPassword :", error);
      if (error.status === 400) {
        setErrorMessage("Email ou mot de passe incorrect.");
      } else if (error.status === 429) {
        setErrorMessage(
          "Trop de tentatives. Attends quelques minutes avant de réessayer."
        );
      } else {
        setErrorMessage("Un problème est survenu, réessaie dans un instant.");
      }
      setStatus("error");
      return;
    }

    // Connexion réussie : la session est posée par Supabase, on redirige.
    window.location.href = "/dashboard";
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-6">
      <div className="w-full max-w-sm border border-line bg-paper p-8">
        <p className="eyebrow mb-2 text-blaze">TRAQUE</p>
        <h1 className="font-display text-2xl font-semibold uppercase leading-tight">
          Accès au dashboard
        </h1>

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

          <label htmlFor="password" className="sr-only">
            Mot de passe
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mot de passe"
            className="w-full border border-ink/25 bg-paper px-4 py-3 text-sm text-text-ink placeholder:text-text-ink/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          />

          <button
            type="submit"
            disabled={status === "sending"}
            className="btn-blaze w-full justify-center disabled:opacity-60"
          >
            {status === "sending" ? "Connexion..." : "Se connecter"}
          </button>

          {status === "error" && (
            <p className="text-sm text-blaze">{errorMessage}</p>
          )}
        </form>

        <p className="mt-6 text-xs text-text-ink/45">
          Pas encore de compte ? Demande ton accès, on te crée tes
          identifiants directement.
        </p>
      </div>
    </main>
  );
}
