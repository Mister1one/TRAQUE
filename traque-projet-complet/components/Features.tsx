import type { dictionary } from "@/lib/i18n";

export default function Features({
  dict,
}: {
  dict: (typeof dictionary)["fr"]["features"];
}) {
  return (
    <section id="fonctionnalites" className="border-b border-line bg-paper">
      <div className="container-tight py-20 md:py-24">
        <p className="eyebrow mb-4 text-text-ink/50">{dict.eyebrow}</p>
        <h2 className="max-w-xl font-display text-3xl font-semibold uppercase leading-tight md:text-4xl">
          {dict.title}
        </h2>

        <div className="mt-14 grid gap-px overflow-hidden border border-line bg-line sm:grid-cols-2">
          {dict.items.map((f) => (
            <div key={f.title} className="bg-paper p-8">
              <h3 className="font-display text-lg font-semibold uppercase">
                {f.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-text-ink/70">
                {f.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
