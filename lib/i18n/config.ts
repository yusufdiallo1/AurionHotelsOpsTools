// Shared i18n constants. Safe to import from both server and client.

export type Lang = "en" | "ar";

export const LANGS: readonly Lang[] = ["en", "ar"] as const;

// Default UI language for first paint, from NEXT_PUBLIC_DEFAULT_LANG ('en' | 'ar').
// The toggle still switches instantly at runtime. (CLAUDE.md §6)
export const DEFAULT_LANG: Lang =
  process.env.NEXT_PUBLIC_DEFAULT_LANG === "ar" ? "ar" : "en";

// Cookie the server root layout reads to set <html lang dir> on first paint (no flash).
export const LANG_COOKIE = "aurion_lang";
export const LANG_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export function isLang(value: unknown): value is Lang {
  return value === "en" || value === "ar";
}

export function dirFor(lang: Lang): "ltr" | "rtl" {
  return lang === "ar" ? "rtl" : "ltr";
}
