"use client";

import { useCallback, useEffect, useState } from "react";
import type { Company } from "@/lib/supabase";
import CompanyDetail from "./CompanyDetail";
import { relanceHint } from "@/lib/relance";

// On matche sur `e.code` (touche physique, ex. "Digit1") plutôt que sur
// `e.key` : en AZERTY, les touches 1-8 sans Shift produisent les
// caractères &, é, ", ', (, -, è, _ — `e.code` reste "Digit1".."Digit8"
// quel que soit le clavier, donc les raccourcis marchent sans avoir à
// appuyer sur Shift.
const SHORTCUTS: { code: string; status: Company["status"]; label: string }[] =
  [
    { code: "Digit1", status: "envoyee", label: "1 Envoyée" },
    { code: "Digit2", status: "conversation", label: "2 Conversation" },
    { code: "Digit3", status: "refus", label: "3 Refus" },
    { code: "Digit4", status: "a_relancer", label: "4 À relancer" },
    { code: "Digit5", status: "injoignable", label: "5 Injoignable" },
    { code: "Digit6", status: "a_rappeler", label: "6 À rappeler" },
    { code: "Digit7", status: "rdv", label: "7 RDV" },
    { code: "Digit8", status: "vendu", label: "8 Vendu" },
  ];

const STATUS_LABELS: Record<Company["status"], string> = {
  a_contacter: "À contacter",
  envoyee: "Envoyée",
  conversation: "Conversation",
  refus: "Refus",
  a_relancer: "À relancer",
  injoignable: "Injoignable",
  a_rappeler: "À rappeler",
  rdv: "RDV",
  vendu: "Vendu",
};

export default function CompanyTable({
  initialCompanies,
}: {
  initialCompanies: Company[];
}) {
  const [companies, setCompanies] = useState(initialCompanies);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialCompanies[0]?.id ?? null
  );
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const applyStatus = useCallback(
    async (
      companyId: string,
      status: Company["status"],
      label: string,
      advance: boolean = true
    ) => {
      setPending(true);
      setFeedback(null);
      try {
        const res = await fetch(`/api/companies/${companyId}/status`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });
        const data = await res.json();
        if (!res.ok) {
          setFeedback(data.error ?? "Échec de l'enregistrement.");
          return;
        }

        setCompanies((prev) => {
          const updated = prev.map((c) =>
            c.id === companyId ? { ...c, ...data.company } : c
          );
          if (advance) {
            const idx = updated.findIndex((c) => c.id === companyId);
            const next = updated[idx + 1];
            setSelectedId(next ? next.id : companyId);
          }
          return updated;
        });
        setFeedback(`${label} enregistré.`);
      } catch {
        setFeedback("Impossible de contacter le serveur.");
      } finally {
        setPending(false);
      }
    },
    []
  );

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (pending) return;

      // Le champ Notes de la fiche prospect doit pouvoir recevoir du texte
      // librement (chiffres compris) sans déclencher les raccourcis de
      // statut du tableau.
      const target = e.target as HTMLElement | null;
      const isTypingInField =
        target?.tagName === "INPUT" || target?.tagName === "TEXTAREA";
      if (isTypingInField) {
        // Échap sort juste du champ, sans désélectionner la ligne : sinon
        // la fiche se démonte et une sauvegarde de note en attente serait
        // perdue.
        if (e.key === "Escape") target?.blur();
        return;
      }

      if (e.key === "Escape") {
        setSelectedId(null);
        setFeedback(null);
        return;
      }

      if (!selectedId) return;

      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const idx = companies.findIndex((c) => c.id === selectedId);
        const nextIdx = e.key === "ArrowDown" ? idx + 1 : idx - 1;
        const next = companies[nextIdx];
        if (next) setSelectedId(next.id);
        return;
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        applyStatus(selectedId, "a_contacter", "Statut annulé", false);
        return;
      }

      const shortcut = SHORTCUTS.find((s) => s.code === e.code);
      if (shortcut) {
        e.preventDefault();
        applyStatus(selectedId, shortcut.status, shortcut.label);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedId, companies, pending, applyStatus]);

  const handleNotesSaved = useCallback(
    (companyId: string, notes: string | null) => {
      setCompanies((prev) =>
        prev.map((c) => (c.id === companyId ? { ...c, notes } : c))
      );
    },
    []
  );

  if (companies.length === 0) {
    return (
      <p className="font-mono text-sm text-text-ink/50">
        Aucun prospect pour cette recherche.
      </p>
    );
  }

  return (
    <div>
      <p className="mb-4 font-mono text-[11px] uppercase tracking-widest text-text-ink/45">
        Clic ou flèches ↑↓ pour sélectionner une ligne, puis 1-8 pour changer
        le statut, Suppr pour annuler. Échap pour désélectionner.
      </p>
      {/* Hauteur fixe même quand vide : sinon l'apparition/disparition de
          ce message décale tout le tableau en dessous à chaque frappe. */}
      <p className="mb-3 h-4 font-mono text-xs text-text-ink/60">
        {feedback ?? "\u00A0"}
      </p>
      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="overflow-x-auto border border-line lg:flex-1">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-ink/5 text-left font-mono text-[11px] uppercase tracking-widest text-text-ink/50">
                <th className="px-3 py-2">Nom</th>
                <th className="px-3 py-2">Recherche</th>
                <th className="px-3 py-2">Téléphone</th>
                <th className="px-3 py-2">Ville</th>
                <th className="px-3 py-2">Site</th>
                <th className="px-3 py-2">Statut</th>
                <th className="px-3 py-2">Relance</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className={`cursor-pointer border-b border-line/60 last:border-0 ${
                    selectedId === c.id ? "bg-blaze/10" : "hover:bg-ink/5"
                  }`}
                >
                  <td className="px-3 py-2">{c.name}</td>
                  <td className="px-3 py-2 text-text-ink/60">
                    {c.activite} · {c.zone}
                  </td>
                  <td className="px-3 py-2 font-mono">{c.phone ?? "—"}</td>
                  <td className="px-3 py-2">{c.city ?? "—"}</td>
                  <td className="px-3 py-2">
                    {c.website ? (
                      <a
                        href={c.website}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="underline"
                      >
                        site
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <span className="inline-block border border-ink/20 px-2 py-1 font-mono text-[11px] uppercase tracking-wide text-text-ink/70">
                      {STATUS_LABELS[c.status] ?? c.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {(() => {
                      const hint = relanceHint(c.status, c.next_relance_date);
                      if (!hint) return "—";
                      return (
                        <span
                          className={
                            hint.startsWith("En retard")
                              ? "text-blaze"
                              : "text-text-ink/60"
                          }
                        >
                          {hint}
                        </span>
                      );
                    })()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="no-scrollbar lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:w-80 lg:shrink-0 lg:self-start lg:overflow-y-auto">
          <CompanyDetail
            company={companies.find((c) => c.id === selectedId) ?? null}
            onNotesSaved={handleNotesSaved}
          />
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-3 font-mono text-[11px] uppercase tracking-widest text-text-ink/45">
        {SHORTCUTS.map((s) => (
          <span key={s.code}>{s.label}</span>
        ))}
        <span>Suppr Annuler</span>
      </div>
    </div>
  );
}
