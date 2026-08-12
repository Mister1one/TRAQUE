"use client";

import { useEffect, useRef, useState } from "react";

type Scan = {
  id: string;
  activite: string;
  zone: string;
  target: number;
  seen_count: number;
  new_count: number;
  status: "en_cours" | "termine" | "zone_epuisee" | "erreur";
  message: string | null;
};

export default function ScanForm() {
  const [activite, setActivite] = useState("");
  const [zone, setZone] = useState("");
  const [target, setTarget] = useState(100);
  const [scan, setScan] = useState<Scan | null>(null);
  const [starting, setStarting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  async function pollScan(id: string) {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      const res = await fetch(`/api/scans/${id}`);
      const data = await res.json();
      if (!res.ok) {
        clearInterval(pollRef.current!);
        setFormError(data.error ?? "Erreur pendant le suivi du scan.");
        return;
      }
      setScan(data.scan);
      if (data.scan.status !== "en_cours") {
        clearInterval(pollRef.current!);
      }
    }, 1000);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setStarting(true);
    setScan(null);
    try {
      const res = await fetch("/api/scans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activite, zone, target }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error ?? "Impossible de démarrer le scan.");
        return;
      }
      pollScan(data.scanId);
    } catch {
      setFormError("Impossible de contacter le serveur.");
    } finally {
      setStarting(false);
    }
  }

  const isRunning = scan?.status === "en_cours";
  const progressPct = scan ? Math.min(100, Math.round((scan.new_count / scan.target) * 100)) : 0;

  return (
    <div className="mx-auto max-w-xl">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="mb-1 block font-mono text-[11px] uppercase tracking-widest text-text-ink/50">
            Activité recherchée
          </label>
          <input
            value={activite}
            onChange={(e) => setActivite(e.target.value)}
            placeholder="ex : plombier"
            required
            disabled={isRunning}
            className="w-full border border-line bg-paper px-3 py-2.5 outline-none focus:border-ink"
          />
        </div>
        <div>
          <label className="mb-1 block font-mono text-[11px] uppercase tracking-widest text-text-ink/50">
            Zone géographique
          </label>
          <input
            value={zone}
            onChange={(e) => setZone(e.target.value)}
            placeholder="ex : Montpellier"
            required
            disabled={isRunning}
            className="w-full border border-line bg-paper px-3 py-2.5 outline-none focus:border-ink"
          />
        </div>
        <div>
          <label className="mb-1 block font-mono text-[11px] uppercase tracking-widest text-text-ink/50">
            Objectif de nouvelles entreprises ({target})
          </label>
          <input
            type="range"
            min={10}
            max={200}
            step={10}
            value={target}
            onChange={(e) => setTarget(Number(e.target.value))}
            disabled={isRunning}
            className="w-full"
          />
        </div>

        {formError && (
          <p className="border border-blaze/40 bg-blaze/5 p-3 text-sm text-blaze">
            {formError}
          </p>
        )}

        <button
          type="submit"
          disabled={starting || isRunning}
          className="btn-blaze w-full disabled:opacity-50"
        >
          {isRunning ? "Scan en cours..." : "Lancer le scan"}
        </button>
      </form>

      {scan && (
        <div className="mt-8 border border-line p-6">
          <p className="font-mono text-[11px] uppercase tracking-widest text-text-ink/45">
            {scan.activite} · {scan.zone}
          </p>

          <div className="mt-4 h-2 w-full bg-ink/10">
            <div
              className="h-2 bg-blaze transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          <p className="mt-3 font-display text-2xl">
            {scan.new_count} <span className="text-text-ink/40">/ {scan.target}</span>
          </p>
          <p className="font-mono text-[11px] uppercase tracking-widest text-text-ink/45">
            nouvelles entreprises · {scan.seen_count} fiches consultées
          </p>

          {scan.status === "zone_epuisee" && (
            <p className="mt-4 font-mono text-sm text-text-ink/70">
              {scan.message}
            </p>
          )}
          {scan.status === "termine" && (
            <p className="mt-4 font-mono text-sm text-text-ink/70">
              Objectif atteint.
            </p>
          )}
          {scan.status === "erreur" && (
            <p className="mt-4 font-mono text-sm text-blaze">
              {scan.message ?? "Une erreur est survenue."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
