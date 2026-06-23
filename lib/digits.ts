// Western <-> Arabic-Indic numeral helpers. (CLAUDE.md §6)
//
// RULE: store and parse numbers/dates in standard Western form. Only *display*
// Arabic-Indic digits in AR mode. Never parse user input that may contain
// Arabic-Indic digits without converting it to Western first.

import type { Lang } from "@/lib/i18n/config";

const WESTERN = "0123456789";
const ARABIC_INDIC = "٠١٢٣٤٥٦٧٨٩"; // U+0660..U+0669
const EXTENDED_ARABIC_INDIC = "۰۱۲۳۴۵۶۷۸۹"; // U+06F0..U+06F9 (Persian/Urdu forms)

/** Convert any Arabic-Indic (and extended) digits in a string to Western digits. */
export function toWesternDigits(input: string): string {
  let out = "";
  for (const ch of input) {
    const ai = ARABIC_INDIC.indexOf(ch);
    if (ai !== -1) {
      out += WESTERN[ai];
      continue;
    }
    const ei = EXTENDED_ARABIC_INDIC.indexOf(ch);
    out += ei !== -1 ? WESTERN[ei] : ch;
  }
  return out;
}

/** Convert Western digits in a string to Arabic-Indic. For display only. */
export function toArabicIndicDigits(input: string): string {
  let out = "";
  for (const ch of input) {
    const wi = WESTERN.indexOf(ch);
    out += wi !== -1 ? ARABIC_INDIC[wi] : ch;
  }
  return out;
}

/**
 * Display numerals. Per client requirement (2026-06-07), ALL languages — including
 * Arabic and Swedish — show Latin/Western numerals (never Arabic-Indic). Numbers
 * and dates read left-to-right even inside RTL text. `lang` is kept for signature
 * stability but no longer changes the output.
 */
export function displayDigits(value: string | number, _lang?: Lang): string {
  return String(value);
}

/**
 * Parse user-entered text into a Western-digit string before any numeric parsing.
 * Always run raw input through this before Number()/parseFloat().
 */
export function normalizeNumericInput(raw: string): string {
  return toWesternDigits(raw);
}
