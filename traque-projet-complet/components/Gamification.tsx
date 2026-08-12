import type { dictionary } from "@/lib/i18n";

export default function Gamification({
  dict,
}: {
  dict: (typeof dictionary)["fr"]["gamification"];
}) {
  return (
    <section id="progression" className="border-b border-line bg-ink text-text-paper">
      <div className="container-tight grid gap-14 py-20 md:grid-cols-[1fr_1fr] md:py-24">
        <div>
          <p className="eyebrow mb-4 text-text-paper/45">{dict.eyebrow}</p>
          <h2 className="font-display text-3xl font-semibold uppercase leading-tight md:text-4xl">
            {dict.titleLine1}
            <br />
            <span className="text-blaze">{dict.titleLine2}</span>
          </h2>
          <p className="mt-6 max-w-md text-base leading-relaxed text-text-paper/70">
            {dict.subtitle}
          </p>
        </div>

        <ul className="divide-y divide-line-paper border-t border-line-paper">
          {dict.levels.map((l) => (
            <li key={l.rank} className="flex items-center gap-6 py-5">
              <span className="font-mono text-sm text-blaze">{l.rank}</span>
              <div>
                <p className="font-display text-lg font-semibold uppercase leading-none">
                  {l.title}
                </p>
                <p className="mt-1.5 text-sm text-text-paper/55">{l.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
