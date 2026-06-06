// Manager dashboard computations. Pure functions over handover rows so they can
// be recomputed cheaply on every realtime event. (CLAUDE.md manager)

import type { StringKey } from "@/lib/strings";
import { SHIFT_OPTIONS, hasCashMismatch, type Handover, type ShiftType } from "@/lib/handover";
import { PROPERTIES, type PropertySlug } from "@/lib/properties";

export type ManagerRow = Handover & {
  properties: { name_en: string; name_ar: string; code: string } | null;
};

export type MissingShift = {
  propertySlug: PropertySlug;
  propertyK: StringKey;
  shift: ShiftType;
  shiftK: StringKey;
};

/**
 * For the selected day, flag each property × shift that has no completed handover.
 * Operates on the day's rows only.
 */
export function missingShifts(dayRows: ManagerRow[]): MissingShift[] {
  const completed = new Set(
    dayRows
      .filter((h) => h.status === "completed")
      .map((h) => `${h.properties?.code}|${h.shift_type}`),
  );

  const missing: MissingShift[] = [];
  for (const p of PROPERTIES) {
    for (const s of SHIFT_OPTIONS) {
      if (!completed.has(`${p.slug}|${s.value}`)) {
        missing.push({
          propertySlug: p.slug,
          propertyK: p.k,
          shift: s.value,
          shiftK: s.k,
        });
      }
    }
  }
  return missing;
}

/** Completed handovers (in the given set) with a non-zero cash variance. */
export function varianceFlags(rows: ManagerRow[]): ManagerRow[] {
  return rows
    .filter((h) => h.status === "completed" && hasCashMismatch(h))
    .sort((a, b) => (a.created_at && b.created_at ? b.created_at.localeCompare(a.created_at) : 0));
}

export type WeekStats = {
  count: number;
  totalVariance: number;
  avgVariance: number;
  mismatches: number;
};

/** Stats over completed handovers in the provided window (caller scopes the rows). */
export function weekStats(rows: ManagerRow[]): WeekStats {
  const completed = rows.filter((h) => h.status === "completed");
  const variances = completed.map((h) => h.cash_variance ?? 0);
  const totalVariance = variances.reduce((a, b) => a + b, 0);
  const mismatches = completed.filter((h) => hasCashMismatch(h)).length;
  return {
    count: completed.length,
    totalVariance,
    avgVariance: completed.length ? totalVariance / completed.length : 0,
    mismatches,
  };
}

/** YYYY-MM-DD of the date `days` before `iso` (inclusive window helper). */
export function isoDaysBefore(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}
