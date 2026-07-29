"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NouvelleRechercheForm() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [zone, setZone] = useState("");
  const [maxResults, setMaxResults] = useState(20);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, zone, maxResults }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Une erreur est survenue.");
        return;
      }

      setResult(
        `${data.inserted} prospect${data.inserted > 1 ? "s" : ""} enregistré${
          data.inserted > 1 ? "s" : ""
        }.`
      );
      router.refresh();
    } catch {
      setError("Impossible de contacter le serveur.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-6">
      <div>
        <label
          htmlFor="query"
          className="mb-2 block font-mono text-xs uppercase tracking-widest text-text-ink/60"
        >
          Activité recherchée
        </label>
        <input
          id="query"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ex : plombier, agence immobilière, boulangerie"
          required
          className="w-full border border-ink/25 bg-paper px-4 py-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink"
        />
      </div>

      <div>
        <label
          htmlFor="zone"
          className="mb-2 block font-mono text-xs uppercase tracking-widest text-text-ink/60"
        >
          Zone géographique
        </label>
        <input
          id="zone"
          value={zone}
          onChange={(e) => setZone(e.target.value)}
          placeholder="ex : Montpellier 34"
          required
          className="w-full border border-ink/25 bg-paper px-4 py-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink"
        />
      </div>

      <div>
        <label
          htmlFor="maxResults"
          className="mb-2 block font-mono text-xs uppercase tracking-widest text-text-ink/60"
        >
          Nombre de résultats max ({maxResults})
        </label>
        <input
          id="maxResults"
          type="range"
          min={5}
          max={40}
          step={5}
          value={maxResults}
          onChange={(e) => setMaxResults(Number(e.target.value))}
          className="w-full accent-blaze"
        />
      </div>

      <button type="submit" disabled={loading} className="btn-blaze disabled:opacity-50">
        {loading ? "Scan en cours…" : "Lancer le scan"}
      </button>

      {loading && (
        <p className="font-mono text-xs text-text-ink/50">
          Ça peut prendre 30 secondes à 2 minutes selon le nombre de résultats —
          le scraping visite chaque fiche une par une.
        </p>
      )}

      {error && (
        <p className="border border-blaze/40 bg-blaze/5 p-3 text-sm text-blaze">
          {error}
        </p>
      )}

      {result && (
        <p className="border border-signal/40 bg-signal/10 p-3 text-sm text-text-ink">
          {result}
        </p>
      )}
    </form>
  );
}
