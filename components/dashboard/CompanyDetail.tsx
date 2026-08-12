"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Company } from "@/lib/supabase";
import {
  buildMessageAngles,
  canalLabel,
  messageText,
  type Canal,
} from "@/lib/prospection-messages";

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

const CANAUX: Canal[] = ["appel", "sms", "email"];

// Attendre une pause dans la frappe avant de sauvegarder, plutôt qu'un
// appel réseau à chaque caractère.
const SAVE_DELAY_MS = 800;

export default function CompanyDetail({
  company,
  onNotesSaved,
}: {
  company: Company | null;
  onNotesSaved: (companyId: string, notes: string | null) => void;
}) {
  const [notes, setNotes] = useState(company?.notes ?? "");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">(
    "idle"
  );
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedCompanyId = useRef<string | null>(null);

  // Angle et canal de message sélectionnés dans la fiche.
  const [angleIdx, setAngleIdx] = useState(0);
  const [canal, setCanal] = useState<Canal>("appel");
  const [copied, setCopied] = useState(false);

  // Calculé à la volée à partir des données du prospect : pas d'appel API,
  // pas de stockage, régénéré à chaque changement de fiche sélectionnée.
  const angles = useMemo(
    () => (company ? buildMessageAngles(company) : []),
    [company]
  );

  // Resynchronise le brouillon local quand on change de fiche sélectionnée.
  useEffect(() => {
    setNotes(company?.notes ?? "");
    setSaveState("idle");
    setAngleIdx(0);
    setCanal("appel");
    setCopied(false);
  }, [company?.id]);

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  async function saveNotes(companyId: string, value: string) {
    setSaveState("saving");
    try {
      const res = await fetch(`/api/companies/${companyId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: value || null }),
      });
      if (!res.ok) {
        setSaveState("idle");
        return;
      }
      lastSavedCompanyId.current = companyId;
      onNotesSaved(companyId, value || null);
      setSaveState("saved");
    } catch {
      setSaveState("idle");
    }
  }

  function handleNotesChange(value: string) {
    setNotes(value);
    if (!company) return;

    setSaveState("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    const companyId = company.id;
    saveTimer.current = setTimeout(() => {
      saveNotes(companyId, value);
    }, SAVE_DELAY_MS);
  }

  function handleNotesBlur() {
    if (!company) return;
    // Sauvegarde immédiate en quittant le champ, plutôt que d'attendre le
    // délai normal — évite de perdre la dernière frappe si l'utilisateur
    // clique ailleurs juste après avoir écrit.
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveNotes(company.id, notes);
  }

  async function handleCopy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Presse-papier indisponible (permissions navigateur) : on ignore,
      // le texte reste sélectionnable manuellement.
    }
  }

  if (!company) {
    return (
      <div className="border border-line p-6">
        <p className="font-mono text-[11px] uppercase tracking-widest text-text-ink/40">
          Fiche prospect
        </p>
        <p className="mt-3 text-sm text-text-ink/50">
          Sélectionne une ligne pour voir le détail.
        </p>
      </div>
    );
  }

  const currentAngle = angles[angleIdx] ?? angles[0];
  const currentText = currentAngle ? messageText(currentAngle, canal) : "";

  return (
    <div className="border border-line p-6">
      <p className="font-mono text-[11px] uppercase tracking-widest text-text-ink/40">
        Fiche prospect
      </p>
      <h2 className="mt-1 font-display text-lg leading-snug">
        {company.name}
      </h2>
      <span className="mt-2 inline-block border border-ink/20 px-2 py-1 font-mono text-[11px] uppercase tracking-wide text-text-ink/70">
        {STATUS_LABELS[company.status] ?? company.status}
      </span>

      <dl className="mt-5 space-y-3 text-sm">
        {company.category && (
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-widest text-text-ink/40">
              Catégorie
            </dt>
            <dd>{company.category}</dd>
          </div>
        )}
        <div>
          <dt className="font-mono text-[10px] uppercase tracking-widest text-text-ink/40">
            Téléphone
          </dt>
          <dd className="font-mono">{company.phone ?? "—"}</dd>
        </div>
        <div>
          <dt className="font-mono text-[10px] uppercase tracking-widest text-text-ink/40">
            Adresse
          </dt>
          <dd>
            {[company.address, company.postal_code, company.city]
              .filter(Boolean)
              .join(", ") || "—"}
          </dd>
        </div>
        {company.website && (
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-widest text-text-ink/40">
              Site
            </dt>
            <dd>
              <a
                href={company.website}
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                {company.website}
              </a>
            </dd>
          </div>
        )}
        {company.rating != null && (
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-widest text-text-ink/40">
              Note Google
            </dt>
            <dd>
              {company.rating} / 5
              {company.reviews_count != null &&
                ` (${company.reviews_count} avis)`}
            </dd>
          </div>
        )}
        <div>
          <dt className="font-mono text-[10px] uppercase tracking-widest text-text-ink/40">
            Ville source
          </dt>
          <dd>
            {company.activite} · {company.zone}
          </dd>
        </div>
      </dl>

      {currentAngle && (
        <div className="mt-6">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-text-ink/40">
            Messages de prospection
          </p>

          <div className="mb-2 flex flex-wrap gap-2">
            {angles.map((a, i) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setAngleIdx(i)}
                className={`border px-2 py-1 font-mono text-[11px] uppercase tracking-wide ${
                  angleIdx === i
                    ? "border-ink bg-ink/5 text-text-ink"
                    : "border-line text-text-ink/50 hover:text-text-ink"
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>

          <div className="mb-3 flex gap-4">
            {CANAUX.map((cnl) => (
              <button
                key={cnl}
                type="button"
                onClick={() => setCanal(cnl)}
                className={`font-mono text-[11px] uppercase tracking-wide underline-offset-4 ${
                  canal === cnl
                    ? "text-text-ink underline"
                    : "text-text-ink/40 hover:text-text-ink/70"
                }`}
              >
                {canalLabel(cnl)}
              </button>
            ))}
          </div>

          <pre className="whitespace-pre-wrap break-words border border-line bg-paper p-2.5 font-sans text-sm text-text-ink/90">
            {currentText}
          </pre>

          <button
            type="button"
            onClick={() => handleCopy(currentText)}
            className="mt-2 border border-ink/20 px-2 py-1 font-mono text-[11px] uppercase tracking-wide text-text-ink/70 hover:border-ink"
          >
            {copied ? "Copié" : "Copier"}
          </button>
        </div>
      )}

      <div className="mt-6">
        <div className="mb-1 flex items-center justify-between">
          <label
            htmlFor="prospect-notes"
            className="font-mono text-[10px] uppercase tracking-widest text-text-ink/40"
          >
            Notes
          </label>
          {/* Hauteur fixe pour ne pas décaler le champ en dessous. */}
          <span className="h-3 font-mono text-[10px] uppercase tracking-widest text-text-ink/35">
            {saveState === "saving" && "Enregistrement..."}
            {saveState === "saved" && "Enregistré"}
          </span>
        </div>
        <textarea
          id="prospect-notes"
          value={notes}
          onChange={(e) => handleNotesChange(e.target.value)}
          onBlur={handleNotesBlur}
          placeholder="Ex : injoignable le matin, rappeler après 14h..."
          rows={4}
          className="w-full resize-none border border-line bg-paper p-2.5 text-sm outline-none focus:border-ink"
        />
      </div>
    </div>
  );
}
