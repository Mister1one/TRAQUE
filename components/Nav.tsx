import type { Lang, dictionary } from "@/lib/i18n";
import LangSwitcher from "./LangSwitcher";

export default function Nav({
  lang,
  dict,
}: {
  lang: Lang;
  dict: (typeof dictionary)["fr"]["nav"];
}) {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-paper/90 backdrop-blur">
      <div className="container-tight flex h-16 items-center justify-between">
        <a href="#top" className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-blaze" aria-hidden />
          <span className="font-display text-xl font-semibold tracking-wide">
            TRAQUE
          </span>
        </a>

        <nav className="hidden items-center gap-8 md:flex">
          <a
            href="#fonctionnement"
            className="font-mono text-xs uppercase tracking-widest text-text-ink/70 transition-colors hover:text-text-ink"
          >
            {dict.fonctionnement}
          </a>
          <a
            href="#fonctionnalites"
            className="font-mono text-xs uppercase tracking-widest text-text-ink/70 transition-colors hover:text-text-ink"
          >
            {dict.fonctionnalites}
          </a>
          <a
            href="#progression"
            className="font-mono text-xs uppercase tracking-widest text-text-ink/70 transition-colors hover:text-text-ink"
          >
            {dict.progression}
          </a>
        </nav>

        <div className="flex items-center gap-5">
          <LangSwitcher lang={lang} />
          <a href="/login" className="btn-blaze !px-4 !py-2.5 text-xs">
            {dict.cta}
          </a>
        </div>
      </div>
    </header>
  );
}
