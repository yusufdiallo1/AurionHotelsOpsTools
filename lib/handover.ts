// Shared handover domain helpers. (CLAUDE.md)

import type { StringKey } from "@/lib/strings";
import type { Lang } from "@/lib/i18n/config";
import { displayDigits } from "@/lib/digits";
import type { Database } from "@/lib/supabase/types";

export type Handover = Database["public"]["Tables"]["handovers"]["Row"];
export type HandoverInsert = Database["public"]["Tables"]["handovers"]["Insert"];

export type ShiftType = "night" | "morning" | "afternoon";

export const SHIFT_OPTIONS: { value: ShiftType; k: StringKey }[] = [
  { value: "night", k: "shiftNight" },
  { value: "morning", k: "shiftMorning" },
  { value: "afternoon", k: "shiftAfternoon" },
];

/** Today's date as YYYY-MM-DD in local time (source-of-truth Western form). */
export function todayIso(): string {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
}

/** YYYY-MM-DD `days` before today (local). For date-range presets. */
export function isoDaysBeforeToday(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
}

/**
 * Format an amount as SAR with thousands separators, localising digits in AR.
 * `value` is a Western-form number or numeric string (source of truth).
 */
export function formatSAR(value: number | string | null | undefined, lang: Lang): string {
  if (value === null || value === undefined || value === "") return "—";
  const n = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(n)) return "—";
  const grouped = n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const localized = displayDigits(grouped, lang);
  return lang === "ar" ? `${localized} ر.س` : `SAR ${localized}`;
}

/** Format a YYYY-MM-DD date for display, localising digits in AR. */
export function formatDate(iso: string | null | undefined, lang: Lang): string {
  if (!iso) return "—";
  return displayDigits(iso, lang);
}

/** Parse a Western-digit numeric string to a number, or null if blank/invalid. */
export function parseAmount(western: string): number | null {
  const trimmed = western.trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  return Number.isNaN(n) ? null : n;
}

// ── Input hardening (CLAUDE.md reliability) ──────────────────────────
export const MAX_NAME = 80;
export const MAX_TEXTAREA = 1000;
export const MAX_ROOMS = 9999;
export const MAX_CASH = 10_000_000;

/** Keep only integer digits (rooms): strip non-digits, no sign, no decimals. */
export function sanitizeIntInput(raw: string): string {
  return raw.replace(/[^0-9]/g, "").replace(/^0+(?=\d)/, "");
}

/** Money input: digits + a single decimal point, max two decimals, no sign. */
export function sanitizeMoneyInput(raw: string): string {
  let s = raw.replace(/[^0-9.]/g, "");
  const firstDot = s.indexOf(".");
  if (firstDot !== -1) {
    s = s.slice(0, firstDot + 1) + s.slice(firstDot + 1).replace(/\./g, "");
    const [int, dec] = s.split(".");
    s = int + "." + (dec ?? "").slice(0, 2);
  }
  return s;
}

/** Trim + cap a free-text field. */
export function clampText(value: string, max: number): string {
  return value.slice(0, max);
}

/** True when a completed handover's cash didn't reconcile. */
export function hasCashMismatch(h: Pick<Handover, "cash_variance">): boolean {
  return h.cash_variance !== null && Math.abs(h.cash_variance) > 0.005;
}

export type SyncState = "synced" | "pending" | "failed";

/** Derive the Sheets-sync state from the row's flags. */
export function syncState(
  h: Pick<Handover, "synced_to_sheets" | "sheet_sync_error">,
): SyncState {
  if (h.synced_to_sheets) return "synced";
  if (h.sheet_sync_error) return "failed";
  return "pending";
}

export const SYNC_STRING_KEY: Record<SyncState, "syncSynced" | "syncPending" | "syncFailed"> = {
  synced: "syncSynced",
  pending: "syncPending",
  failed: "syncFailed",
};
