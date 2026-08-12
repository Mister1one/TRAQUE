import RadarBoard from "./RadarBoard";
import type { dictionary } from "@/lib/i18n";

export default function Hero({
  dict,
  radarDict,
}: {
  dict: (typeof dictionary)["fr"]["hero"];
  radarDict: (typeof dictionary)["fr"]["radar"];
}) {
  return (
    <section id="top" className="relative overflow-hidden border-b border-line bg-grid-paper bg-grid">
      <div className="container-tight grid gap-14 py-20 md:grid-cols-[1.1fr_1fr] md:items-center md:py-28">
        <div className="animate-rise">
          <p className="eyebrow mb-6 flex items-center gap-2 text-blaze">
            <span className="h-1.5 w-1.5 rounded-full bg-blaze" aria-hidden />
            {dict.eyebrow}
          </p>
          <h1 className="font-display text-[13vw] font-semibold uppercase leading-[0.95] tracking-tight md:text-[4.2vw]">
            {dict.titleLine1}
            <br />
            {dict.titleLine2}
            <br />
            <span className="text-blaze">{dict.titleLine3}</span>
          </h1>
          <p className="mt-7 max-w-md text-lg leading-relaxed text-text-ink/75">
            {dict.subtitle}
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <a href="/login" className="btn-blaze">
              {dict.ctaPrimary}
            </a>
            <a href="#fonctionnement" className="btn-ghost">
              {dict.ctaSecondary}
            </a>
          </div>
        </div>

        <div className="animate-rise [animation-delay:150ms]">
          <RadarBoard dict={radarDict} />
        </div>
      </div>
    </section>
  );
}
