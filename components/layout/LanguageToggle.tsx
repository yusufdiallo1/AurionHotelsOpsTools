"use client";

import { useLang } from "@/lib/i18n";

// EN | ع segmented toggle. Switches the active language (cookie + context + html).
// (CLAUDE.md §6, §8)
export function LanguageToggle() {
  const { lang, setLang } = useLang();

  const base =
    "min-h-[36px] min-w-[40px] rounded-[10px] px-3 text-[15px] font-bold transition-colors";
  const active = "bg-gold text-navy-deep";
  const idle = "text-cream/80 hover:text-cream";

  return (
    <div
      role="group"
      aria-label="Language"
      className="flex items-center gap-1 rounded-xl bg-white/10 p-1"
    >
      <button
        type="button"
        aria-pressed={lang === "en"}
        onClick={() => setLang("en")}
        className={`${base} ${lang === "en" ? active : idle}`}
      >
        EN
      </button>
      <button
        type="button"
        aria-pressed={lang === "ar"}
        onClick={() => setLang("ar")}
        className={`${base} ${lang === "ar" ? active : idle}`}
      >
        ع
      </button>
    </div>
  );
}
