import type { dictionary } from "@/lib/i18n";

const targets = [
  { name: "Plomberie Dubosc", zone: "Montpellier · 34", rating: 4.8, x: "22%", y: "28%" },
  { name: "Atelier Verrier", zone: "Nîmes · 30", rating: 4.2, x: "62%", y: "18%" },
  { name: "Rénov & Fils", zone: "Béziers · 34", rating: 3.4, x: "40%", y: "58%" },
  { name: "Toiture Occitane", zone: "Sète · 34", rating: 2.9, x: "74%", y: "62%" },
];

function scoreColor(rating: number) {
  if (rating >= 4.5) return "text-blaze border-blaze/50 bg-blaze/10";
  if (rating >= 3.5) return "text-signal border-signal/50 bg-signal/10";
  return "text-text-paper/70 border-text-paper/25 bg-text-paper/5";
}

export default function RadarBoard({
  dict,
}: {
  dict: (typeof dictionary)["fr"]["radar"];
}) {
  return (
    <div className="relative w-full overflow-hidden border border-line-paper bg-ink text-text-paper shadow-[0_30px_80px_-30px_rgba(0,0,0,0.5)]">
      {/* header strip */}
      <div className="flex items-center justify-between border-b border-line-paper px-4 py-2.5">
        <span className="eyebrow text-text-paper/50">{dict.sector}</span>
        <span className="eyebrow flex items-center gap-1.5 text-signal">
          <span className="h-1.5 w-1.5 rounded-full bg-signal animate-blip" aria-hidden />
          {dict.scanning}
        </span>
      </div>

      {/* radar area */}
      <div className="relative aspect-[4/3] w-full bg-grid-ink bg-grid">
        {/* concentric rings */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          {[1, 2, 3].map((r) => (
            <span
              key={r}
              className="absolute rounded-full border border-text-paper/10"
              style={{ width: `${r * 30}%`, height: `${r * 30}%` }}
            />
          ))}
          {/* sweep */}
          <div className="absolute h-[46%] w-[46%] animate-sweep">
            <div className="h-full w-1/2 origin-right bg-gradient-to-l from-signal/25 to-transparent" />
          </div>
        </div>

        {/* target blips */}
        {targets.map((t) => (
          <div
            key={t.name}
            className="group absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: t.x, top: t.y }}
          >
            <span className="block h-2 w-2 animate-blip rounded-full bg-blaze" />
            <div
              className={`absolute left-1/2 top-4 -translate-x-1/2 whitespace-nowrap border px-2 py-1 font-mono text-[10px] ${scoreColor(
                t.rating
              )}`}
            >
              {t.rating.toFixed(1)}
            </div>
          </div>
        ))}
      </div>

      {/* target list */}
      <ul className="divide-y divide-line-paper border-t border-line-paper">
        {targets.slice(0, 3).map((t) => (
          <li key={t.name} className="flex items-center justify-between px-4 py-2.5">
            <div>
              <p className="text-sm font-medium leading-tight">{t.name}</p>
              <p className="font-mono text-[11px] text-text-paper/45">{t.zone}</p>
            </div>
            <span
              className={`border px-2 py-1 font-mono text-xs ${scoreColor(t.rating)}`}
            >
              {t.rating.toFixed(1)}
            </span>
          </li>
        ))}
      </ul>

      {/* level bar */}
      <div className="border-t border-line-paper px-4 py-3">
        <div className="mb-1.5 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-text-paper/50">
          <span>{dict.level}</span>
          <span>{dict.points}</span>
        </div>
        <div className="h-1.5 w-full bg-text-paper/10">
          <div className="h-full w-[71%] bg-blaze" />
        </div>
      </div>
    </div>
  );
}
