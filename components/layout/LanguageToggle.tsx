"use client";

import { useLang } from "@/lib/i18n";

// EN | ع segmented toggle. Switches the active language (cookie + context + html).
// (CLAUDE.md §6, §8)
export function LanguageToggle() {
  const { lang, setLang } = useLang();

  const base =
    "min-h-[36px] min-w-[44px] rounded-[10px] px-3 text-[15px] font-bold transition-colors";
  // Active = gold pill. Idle = gold-deep text, legible on both the navy header and
  // the cream login page.
  const active = "bg-gold text-navy-deep";
  const idle = "text-gold-deep hover:text-gold";

  return (
    <div
      role="group"
      aria-label="Language"
      className="flex items-center gap-1 rounded-xl bg-navy-deep/15 p-1"
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
