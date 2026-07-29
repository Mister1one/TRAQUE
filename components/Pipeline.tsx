import type { dictionary } from "@/lib/i18n";

export default function Pipeline({
  dict,
}: {
  dict: (typeof dictionary)["fr"]["pipeline"];
}) {
  return (
    <section id="fonctionnement" className="border-b border-line bg-ink text-text-paper">
      <div className="container-tight py-20 md:py-24">
        <p className="eyebrow mb-4 text-text-paper/45">{dict.eyebrow}</p>
        <h2 className="max-w-2xl font-display text-3xl font-semibold uppercase leading-tight md:text-4xl">
          {dict.title}
        </h2>

        <div className="mt-14 grid gap-x-8 gap-y-12 md:grid-cols-5">
          {dict.steps.map((s) => (
            <div key={s.n} className="border-t border-line-paper pt-5">
              <span className="font-mono text-sm text-blaze">{s.n}</span>
              <h3 className="mt-3 font-display text-xl font-semibold uppercase">
                {s.title}
              </h3>
              <p className="mt-2.5 text-sm leading-relaxed text-text-paper/65">
                {s.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
