"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import {
  dirFor,
  LANG_COOKIE,
  LANG_COOKIE_MAX_AGE,
  type Lang,
} from "@/lib/i18n/config";
import { translate, type StringKey } from "@/lib/strings";

type LanguageContextValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  toggle: () => void;
  /** Translate a key into the active language. */
  t: (key: StringKey) => string;
  dir: "ltr" | "rtl";
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function persistAndApply(lang: Lang) {
  // Cookie so the server root layout can set <html lang dir> on next paint (no flash).
  document.cookie = `${LANG_COOKIE}=${lang}; path=/; max-age=${LANG_COOKIE_MAX_AGE}; samesite=lax`;
  // Apply immediately to the live document for this session.
  const root = document.documentElement;
  root.lang = lang;
  root.dir = dirFor(lang);
  root.classList.toggle("font-ar", lang === "ar");
}

/**
 * Holds the active language. `initialLang` comes from the server (cookie) so the
 * first client render matches the server-rendered <html lang dir> — no flash.
 */
export function LanguageProvider({
  initialLang,
  children,
}: {
  initialLang: Lang;
  children: React.ReactNode;
}) {
  const [lang, setLangState] = useState<Lang>(initialLang);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    persistAndApply(next);
  }, []);

  const toggle = useCallback(() => {
    setLangState((prev) => {
      const next: Lang = prev === "ar" ? "en" : "ar";
      persistAndApply(next);
      return next;
    });
  }, []);

  const value = useMemo<LanguageContextValue>(
    () => ({
      lang,
      setLang,
      toggle,
      t: (key: StringKey) => translate(key, lang),
      dir: dirFor(lang),
    }),
    [lang, setLang, toggle],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLang must be used within a <LanguageProvider>.");
  }
  return ctx;
}
