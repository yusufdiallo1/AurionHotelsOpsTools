// Pure daily-handover digest over the day's handover rows. No React, no Supabase
// — cheap to recompute on every realtime event and unit-testable. Mirrors the
// manager dashboard's missingShifts/varianceFlags logic but rolls it into one
// at-a-glance summary for the admin home card. (spec 2026-06-14)

import type { StringKey } from "@/lib/strings";
import {
  SHIFT_OPTIONS,
  SHIFT_END_HOUR,
  hasCashMismatch,
  type ShiftType,
} from "@/lib/handover";
import { PROPERTIES, type PropertySlug } from "@/lib/properties";
import type { ManagerRow } from "@/lib/manager";

export type CellStatus = "submitted" | "unfinished" | "missing" | "not_due";

export type ShiftCell = {
  shift: ShiftType;
  shiftK: StringKey;
  status: CellStatus;
  row: ManagerRow | null;
};

export type HotelDigest = {
  slug: PropertySlug;
  propertyK: StringKey;
  submitted: number; // completed cells
  expected: number; // due cells (excludes not_due)
  cells: ShiftCell[]; // always 3, in SHIFT_OPTIONS order
};

export type MismatchItem = {
  id: string;
  hotelK: StringKey;
  shiftK: StringKey;
  outgoing_name: string;
  expected: number | null; // cash_drawer
  counted: number | null; // cash_recount
  variance: number | null; // cash_variance
};

// The free-text fields that, when non-empty, surface as a flag.
const NOTE_FIELDS: { key: keyof ManagerRow; labelK: StringKey }[] = [
  { key: "notes", labelK: "fieldNotes" },
  { key: "pending_requests", labelK: "fieldPending" },
  { key: "maintenance_issues", labelK: "fieldMaintenance" },
  { key: "variance_note", labelK: "fieldVarianceNote" },
];

export type FlagItem = {
  id: string;
  hotelK: StringKey;
  shiftK: StringKey;
  outgoing_name: string;
  fields: { labelK: StringKey; text: string }[];
};

export type DigestStatus = "clear" | "attention" | "alert";

export type DailyDigest = {
  date: string;
  submitted: number;
  expected: number;
  hotels: HotelDigest[];
  mismatches: MismatchItem[];
  flags: FlagItem[];
  status: DigestStatus;
};

/** True if `shift` on `date` has not reached its end time yet, relative to `now`
 *  (Riyadh wall-clock). Only meaningful for the current Riyadh day; past days are
 *  always due. Night ends 07:00 the NEXT day, so it's due once that has passed. */
function isNotDueYet(
  date: string,
  shift: ShiftType,
  riyadhNowIso: string,
  riyadhNowHour: number,
): boolean {
  if (date < riyadhNowIso) return false; // a past day: everything due
  if (date > riyadhNowIso) return true; // a future day: nothing due
  // Same Riyadh day:
  const endHour = SHIFT_END_HOUR[shift];
  if (shift === "night") return true; // ends 07:00 tomorrow → not due within today
  return riyadhNowHour < endHour;
}

/** Riyadh wall-clock hour (0-23) for `now`. */
function riyadhHour(now: Date): number {
  const h = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Riyadh",
    hour: "2-digit",
    hour12: false,
  }).format(now);
  // "24" can appear for midnight in some environments; normalise to 0.
  const n = Number(h);
  return n === 24 ? 0 : n;
}

function riyadhIso(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/**
 * Build the digest for `date` (YYYY-MM-DD) from that day's handover rows.
 * `now` drives the "not due yet" logic for the current Riyadh day.
 */
export function buildDailyDigest(
  rows: ManagerRow[],
  date: string,
  now: Date,
): DailyDigest {
  const riyadhNowIso = riyadhIso(now);
  const riyadhNowHour = riyadhHour(now);

  // Index completed + any rows by property code | shift.
  const byKey = new Map<string, ManagerRow>();
  for (const r of rows) {
    if (r.shift_date !== date) continue;
    const code = r.properties?.code;
    if (!code) continue;
    const key = `${code}|${r.shift_type}`;
    // Prefer a completed row over an unfinished one if both somehow exist.
    const existing = byKey.get(key);
    if (!existing || (r.status === "completed" && existing.status !== "completed")) {
      byKey.set(key, r);
    }
  }

  const hotels: HotelDigest[] = PROPERTIES.map((p) => {
    let submitted = 0;
    let expected = 0;
    const cells: ShiftCell[] = SHIFT_OPTIONS.map((s) => {
      const row = byKey.get(`${p.slug}|${s.value}`) ?? null;
      let status: CellStatus;
      if (row && row.status === "completed") status = "submitted";
      else if (row) status = "unfinished";
      else if (isNotDueYet(date, s.value, riyadhNowIso, riyadhNowHour))
        status = "not_due";
      else status = "missing";

      if (status !== "not_due") expected++;
      if (status === "submitted") submitted++;
      return { shift: s.value, shiftK: s.k, status, row };
    });
    return { slug: p.slug, propertyK: p.k, submitted, expected, cells };
  });

  const submitted = hotels.reduce((a, h) => a + h.submitted, 0);
  const expected = hotels.reduce((a, h) => a + h.expected, 0);

  const propK = (r: ManagerRow): StringKey =>
    r.properties?.code === "al_aqeeq" ? "propAlAqeeq" : "propAsSalaam";
  const shiftK = (st: string): StringKey =>
    SHIFT_OPTIONS.find((s) => s.value === st)?.k ?? "shiftLabel";

  const completedRows = rows.filter(
    (r) => r.shift_date === date && r.status === "completed",
  );

  const mismatches: MismatchItem[] = completedRows
    .filter((r) => hasCashMismatch(r))
    .map((r) => ({
      id: r.id,
      hotelK: propK(r),
      shiftK: shiftK(r.shift_type),
      outgoing_name: r.outgoing_name,
      expected: r.cash_drawer,
      counted: r.cash_recount,
      variance: r.cash_variance,
    }));

  const flags: FlagItem[] = [];
  for (const r of completedRows) {
    const fields = NOTE_FIELDS.map((f) => ({
      labelK: f.labelK,
      text: ((r[f.key] as string | null) ?? "").trim(),
    })).filter((f) => f.text.length > 0);
    if (fields.length > 0) {
      flags.push({
        id: r.id,
        hotelK: propK(r),
        shiftK: shiftK(r.shift_type),
        outgoing_name: r.outgoing_name,
        fields,
      });
    }
  }

  let status: DigestStatus;
  if (submitted < expected) status = "alert";
  else if (mismatches.length > 0 || flags.length > 0) status = "attention";
  else status = "clear";

  return { date, submitted, expected, hotels, mismatches, flags, status };
}
