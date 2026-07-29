export default function ScoreBadge({ score }: { score: number | null }) {
  const s = score ?? 0;
  const tone =
    s >= 80
      ? "text-blaze border-blaze/50 bg-blaze/10"
      : s >= 60
      ? "text-signal border-signal/60 bg-signal/10"
      : "text-text-ink/60 border-ink/20 bg-ink/5";

  return (
    <span className={`inline-block border px-2 py-1 font-mono text-xs ${tone}`}>
      {score ?? "—"}
    </span>
  );
}
