import type { dictionary } from "@/lib/i18n";

export default function Problem({
  dict,
}: {
  dict: (typeof dictionary)["fr"]["problem"];
}) {
  return (
    <section className="border-b border-line bg-paper">
      <div className="container-tight grid gap-10 py-20 md:grid-cols-[0.8fr_1.2fr] md:py-24">
        <p className="eyebrow text-text-ink/50">{dict.eyebrow}</p>

        <div>
          <h2 className="font-display text-3xl font-semibold uppercase leading-tight md:text-4xl">
            {dict.title}
          </h2>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-text-ink/75">
            {dict.p1}
          </p>
          <p className="mt-4 max-w-xl text-lg leading-relaxed text-text-ink/75">
            {dict.p2}
          </p>
        </div>
      </div>
    </section>
  );
}
