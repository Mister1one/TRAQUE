import type { dictionary } from "@/lib/i18n";

export default function Footer({
  dict,
}: {
  dict: (typeof dictionary)["fr"]["footer"];
}) {
  return (
    <footer className="bg-ink text-text-paper">
      <div className="container-tight flex flex-col items-center gap-4 py-10 text-center md:flex-row md:justify-between md:text-left">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-blaze" aria-hidden />
          <span className="font-display text-base font-semibold tracking-wide">
            TRAQUE
          </span>
        </div>
        <p className="font-mono text-[11px] uppercase tracking-widest text-text-paper/40">
          {dict.tagline} · {new Date().getFullYear()}
        </p>
      </div>
    </footer>
  );
}
