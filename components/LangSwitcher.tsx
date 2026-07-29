"use client";

import { useRouter } from "next/navigation";
import type { Lang } from "@/lib/i18n";

export default function LangSwitcher({ lang }: { lang: Lang }) {
  const router = useRouter();

  function switchTo(next: Lang) {
    document.cookie = `lang=${next}; path=/; max-age=31536000`;
    router.refresh();
  }

  return (
    <div className="flex items-center gap-1 font-mono text-xs uppercase tracking-widest text-text-ink/50">
      <button
        onClick={() => switchTo("fr")}
        className={lang === "fr" ? "text-text-ink" : "hover:text-text-ink"}
        aria-current={lang === "fr"}
      >
        Fr
      </button>
      <span aria-hidden>/</span>
      <button
        onClick={() => switchTo("en")}
        className={lang === "en" ? "text-text-ink" : "hover:text-text-ink"}
        aria-current={lang === "en"}
      >
        En
      </button>
    </div>
  );
}
