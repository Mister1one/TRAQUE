"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Prospect } from "@/lib/supabase";

const OUTCOMES: { value: string; label: string }[] = [
  { value: "injoignable", label: "Injoignable" },
  { value: "a_rappeler", label: "À rappeler" },
  { value: "pas_interesse", label: "Pas intéressé" },
  { value: "rdv_pris", label: "RDV pris" },
  { value: "vendu", label: "Vendu" },
];

export default function ProspectActions({ prospect }: { prospect: Prospect }) {
  const router = useRouter();
  const [pitchLoading, setPitchLoading] = useState(false);
  const [logLoading, setLogLoading] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleGeneratePitch() {
    setPitchLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/pitch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prospectId: prospect.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Échec de la génération.");
        return;
      }
      router.refresh();
    } catch {
      setError("Impossible de contacter le serveur.");
    } finally {
      setPitchLoading(false);
    }
  }

  async function handleLogCall(outcome: string) {
    setLogLoading(outcome);
    setError(null);
    try {
      const res = await fetch("/api/prospects/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prospectId: prospect.id, outcome, note }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Échec de l'enregistrement.");
        return;
      }
      setNote("");
      router.refresh();
    } catch {
      setError("Impossible de contacter le serveur.");
    } finally {
      setLogLoading(null);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="mb-3 font-display text-lg font-semibold uppercase">
          Pitch d&rsquo;appel
        </h2>
        {prospect.pitch ? (
          <p className="whitespace-pre-line border border-line bg-ink text-text-paper p-4 text-sm leading-relaxed">
            {prospect.pitch}
          </p>
        ) : (
          <p className="mb-3 text-sm text-text-ink/55">
            Pas encore généré pour ce prospect.
          </p>
        )}
        <button
          onClick={handleGeneratePitch}
          disabled={pitchLoading}
          className="btn-ghost mt-3 !px-4 !py-2.5 text-xs disabled:opacity-50"
        >
          {pitchLoading
            ? "Génération…"
            : prospect.pitch
            ? "Régénérer le pitch"
            : "Générer le pitch"}
        </button>
      </div>

      <div>
        <h2 className="mb-3 font-display text-lg font-semibold uppercase">
          Logger l&rsquo;appel
        </h2>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Note rapide sur l'échange (optionnel)"
          rows={2}
          className="mb-3 w-full border border-ink/25 bg-paper px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink"
        />
        <div className="flex flex-wrap gap-2">
          {OUTCOMES.map((o) => (
            <button
              key={o.value}
              onClick={() => handleLogCall(o.value)}
              disabled={logLoading !== null}
              className="btn-ghost !px-3 !py-2 text-[11px] disabled:opacity-50"
            >
              {logLoading === o.value ? "…" : o.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className="border border-blaze/40 bg-blaze/5 p-3 text-sm text-blaze">
          {error}
        </p>
      )}
    </div>
  );
}
