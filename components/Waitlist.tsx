import Link from "next/link";
import type { dictionary } from "@/lib/i18n";

export default function Waitlist({
  dict,
}: {
  dict: (typeof dictionary)["fr"]["waitlist"];
}) {
  return (
    <section id="waitlist" className="border-b border-line bg-paper">
      <div className="container-tight py-20 text-center md:py-28">
        <p className="eyebrow mb-4 text-blaze">{dict.eyebrow}</p>
        <h2 className="mx-auto max-w-2xl font-display text-3xl font-semibold uppercase leading-tight md:text-5xl">
          {dict.title}
        </h2>
        <p className="mx-auto mt-5 max-w-md text-base leading-relaxed text-text-ink/70">
          {dict.subtitle}
        </p>

        <div className="mx-auto mt-9 flex justify-center">
          <Link href="/login" className="btn-blaze">
            {dict.cta}
          </Link>
        </div>
      </div>
    </section>
  );
}
