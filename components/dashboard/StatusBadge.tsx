const LABELS: Record<string, string> = {
  a_contacter: "À contacter",
  appele: "Appelé",
  relance_prevue: "Relance prévue",
  rdv: "RDV",
  gagne: "Gagné",
  perdu: "Perdu",
};

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span className="inline-block border border-ink/20 px-2 py-1 font-mono text-[11px] uppercase tracking-wide text-text-ink/70">
      {LABELS[status] ?? status}
    </span>
  );
}
