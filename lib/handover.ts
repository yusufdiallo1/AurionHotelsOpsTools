// Shared handover domain helpers. (CLAUDE.md)

import type { StringKey } from "@/lib/strings";
import type { Lang } from "@/lib/i18n/config";
import type { Database } from "@/lib/supabase/types";

export type Handover = Database["public"]["Tables"]["handovers"]["Row"];
export type HandoverInsert = Database["public"]["Tables"]["handovers"]["Insert"];

export type ShiftType = "night" | "morning" | "afternoon";

export const SHIFT_OPTIONS: { value: ShiftType; k: StringKey }[] = [
  { value: "night", k: "shiftNight" },
  { value: "morning", k: "shiftMorning" },
  { value: "afternoon", k: "shiftAfternoon" },
];

// Fixed shift end times (local hours): morning 07–15, afternoon 15–23, night 23–07.
const SHIFT_END_HOUR: Record<ShiftType, number> = {
  morning: 15,
  afternoon: 23,
  night: 7, // ends 07:00 the following morning
};
// Handover window: from 30 min BEFORE shift end until 90 min AFTER shift end.
export const WINDOW_BEFORE_MIN = 30;
export const WINDOW_AFTER_MIN = 90;
const MIN = 60_000;

/**
 * Resolve the handover window relative to `now`.
 *  open      — true when now ∈ [end−30min, end+90min]
 *  opensAt   — Date the (current or next) window opens
 *  closesAt  — Date the current window closes (end+90min)
 *  opensInMs — ms until opensAt (≤0 while open)
 *
 * Picks the *current* shift-end occurrence if its window hasn't fully closed yet;
 * otherwise rolls to the next day's occurrence. This means: locked DURING the
 * shift body, open in the last 30 min + 90 min after end, then locked again
 * (showing the next day's window).
 */
export function handoverWindow(shift: ShiftType, now: Date): {
  open: boolean;
  opensAt: Date;
  closesAt: Date;
  opensInMs: number;
  /** True while still on shift today (before shift end), where leaving early is meaningful. */
  canRequestEarly: boolean;
} {
  const h = SHIFT_END_HOUR[shift];
  // Candidate end = today at h:00.
  const end = new Date(now);
  end.setHours(h, 0, 0, 0);
  // If this occurrence's window has already CLOSED (now > end+90min), roll forward a day.
  let rolled = false;
  if (now.getTime() > end.getTime() + WINDOW_AFTER_MIN * MIN) {
    end.setDate(end.getDate() + 1);
    rolled = true;
  }
  const opensAt = new Date(end.getTime() - WINDOW_BEFORE_MIN * MIN);
  const closesAt = new Date(end.getTime() + WINDOW_AFTER_MIN * MIN);
  const open = now.getTime() >= opensAt.getTime() && now.getTime() <= closesAt.getTime();
  // Early-leave only makes sense while still on shift TODAY (locked, before the
  // pre-window, same-day occurrence). Once the shift + grace has passed (window
  // rolled to the next day) there's nothing to leave early from → no button.
  const canRequestEarly = !open && !rolled && now.getTime() < opensAt.getTime();
  return { open, opensAt, closesAt, opensInMs: opensAt.getTime() - now.getTime(), canRequestEarly };
}

/** 12-hour clock label, e.g. "2:30 PM". */
export function formatClock12(d: Date): string {
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, "0")} ${ampm}`;
}

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
export function formatSAR(value: number | string | null | undefined, _lang?: Lang): string {
  if (value === null || value === undefined || value === "") return "—";
  const n = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(n)) return "—";
  const grouped = n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  // Client requirement: SAR symbol on the LEFT, Latin digits, in every language.
  // Wrapped in a Unicode LTR isolate so it reads left-to-right inside RTL text.
  return ltr(`SAR ${grouped}`);
}

/** Wrap a value in a Unicode LTR isolate (U+2066 … U+2069) so numbers/dates
 *  render left-to-right even within Arabic (RTL) surrounding text. */
export function ltr(value: string): string {
  return `⁦${value}⁩`;
}

/** Format a YYYY-MM-DD date for display — Latin digits, LTR-isolated. */
export function formatDate(iso: string | null | undefined, _lang?: Lang): string {
  if (!iso) return "—";
  return ltr(iso);
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
