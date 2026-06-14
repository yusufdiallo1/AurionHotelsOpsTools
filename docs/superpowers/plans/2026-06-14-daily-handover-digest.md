# Daily Handover Digest Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Yesterday's Handovers" summary card to the admin home page (`/`) showing X-of-6 submitted with a green/amber/red status and three expandable indicators (submissions, mismatches, flagged notes).

**Architecture:** Pure digest logic in `lib/dailyDigest.ts` over the existing `ManagerRow` type, a tiny Riyadh-date helper in `lib/riyadhDate.ts`, and a client card `app/DailyDigestCard.tsx` that queries Supabase for one day's rows and renders the digest. Wired in at the top of `app/AdminHome.tsx`. No DB changes, no `/manager` changes.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind v4, Supabase JS client, existing `useHandoverRealtime` + `lib/i18n` + `lib/strings`. Tests are standalone Node scripts run via `node --experimental-strip-types` (no test framework is installed, no network to add one). **Do NOT run the dev server / localhost.**

---

## File Structure

- `lib/riyadhDate.ts` (create) — Asia/Riyadh date helpers (`riyadhToday`, `riyadhYesterday`, `addDays`). Pure.
- `lib/dailyDigest.ts` (create) — `buildDailyDigest(rows, date, now)` + types. Pure, no React/Supabase.
- `lib/dailyDigest.test.mjs` (create) — standalone Node assertions for digest + date logic.
- `lib/strings.ts` (modify) — add EN/AR keys for the card.
- `app/DailyDigestCard.tsx` (create) — client component: fetch + render + realtime + expand/collapse.
- `app/AdminHome.tsx` (modify) — render `<DailyDigestCard />` at the top.

Shift end hours (for "not due today" logic) already exist conceptually in `lib/handover.ts` (`morning` 15:00, `afternoon` 23:00, `night` 07:00 next day) but the constant `SHIFT_END_HOUR` there is NOT exported. Task 1 exports it.

---

## Task 1: Export shift-end hours from lib/handover.ts

**Files:**
- Modify: `lib/handover.ts` (the `SHIFT_END_HOUR` const, currently around line 19)

- [ ] **Step 1: Export the existing constant**

In `lib/handover.ts`, change the declaration from:

```ts
const SHIFT_END_HOUR: Record<ShiftType, number> = {
```

to:

```ts
export const SHIFT_END_HOUR: Record<ShiftType, number> = {
```

(Leave the values exactly as they are: `morning: 15, afternoon: 23, night: 7`.)

- [ ] **Step 2: Typecheck**

Run: `npx --no-install tsc --noEmit`
Expected: exit code 0 (no errors).

- [ ] **Step 3: Commit**

```bash
git add lib/handover.ts
git commit -m "Export SHIFT_END_HOUR for reuse in daily digest

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Riyadh date helpers

**Files:**
- Create: `lib/riyadhDate.ts`
- Test: `lib/dailyDigest.test.mjs` (created here, extended in Task 4)

- [ ] **Step 1: Write the failing test**

Create `lib/dailyDigest.test.mjs`:

```js
// Standalone assertions. Run: node --experimental-strip-types lib/dailyDigest.test.mjs
import assert from "node:assert/strict";
import { riyadhToday, riyadhYesterday, addDays } from "./riyadhDate.ts";

let passed = 0;
function check(name, fn) {
  fn();
  passed++;
  console.log("ok -", name);
}

// Riyadh is UTC+3. 2026-06-14T22:30:00Z is 2026-06-15T01:30 in Riyadh.
check("riyadhToday rolls forward past UTC midnight boundary", () => {
  const now = new Date("2026-06-14T22:30:00Z");
  assert.equal(riyadhToday(now), "2026-06-15");
});

check("riyadhToday before the +3 boundary stays same UTC day", () => {
  const now = new Date("2026-06-14T10:00:00Z"); // 13:00 Riyadh, same day
  assert.equal(riyadhToday(now), "2026-06-14");
});

check("riyadhYesterday is one day before riyadhToday", () => {
  const now = new Date("2026-06-14T10:00:00Z");
  assert.equal(riyadhYesterday(now), "2026-06-13");
});

check("addDays handles month boundary", () => {
  assert.equal(addDays("2026-06-30", 1), "2026-07-01");
  assert.equal(addDays("2026-07-01", -1), "2026-06-30");
});

console.log(`\n${passed} assertions passed`);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types lib/dailyDigest.test.mjs`
Expected: FAIL — `Cannot find module './riyadhDate.ts'` (file not created yet).

- [ ] **Step 3: Write minimal implementation**

Create `lib/riyadhDate.ts`:

```ts
// Asia/Riyadh (UTC+3, no DST) date helpers. The digest "yesterday" must be
// computed in Riyadh time, which can differ from the server's local/UTC date.
// All dates are YYYY-MM-DD strings (Western form, matching handovers.shift_date).

const RIYADH_TZ = "Asia/Riyadh";

/** Today's date (YYYY-MM-DD) in Asia/Riyadh. `en-CA` formats as YYYY-MM-DD. */
export function riyadhToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: RIYADH_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** YYYY-MM-DD `n` days after `iso` (negative `n` = before). Parsed as a plain
 *  calendar date (noon UTC anchor avoids any tz/DST drift). */
export function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Yesterday's date (YYYY-MM-DD) in Asia/Riyadh. */
export function riyadhYesterday(now: Date = new Date()): string {
  return addDays(riyadhToday(now), -1);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --experimental-strip-types lib/dailyDigest.test.mjs`
Expected: PASS — all 4 assertions, prints "4 assertions passed".

- [ ] **Step 5: Typecheck**

Run: `npx --no-install tsc --noEmit`
Expected: exit code 0.

- [ ] **Step 6: Commit**

```bash
git add lib/riyadhDate.ts lib/dailyDigest.test.mjs
git commit -m "Add Asia/Riyadh date helpers for daily digest

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Daily digest types + builder

**Files:**
- Create: `lib/dailyDigest.ts`

- [ ] **Step 1: Write the implementation**

Create `lib/dailyDigest.ts`:

```ts
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
```

- [ ] **Step 2: Typecheck**

Run: `npx --no-install tsc --noEmit`
Expected: exit code 0.

NOTE: `shiftLabel` and the `fieldNotes`/`fieldPending`/`fieldMaintenance`/`fieldVarianceNote` keys already exist in `lib/strings.ts` (verify with `grep -n "shiftLabel\|fieldNotes\|fieldPending\|fieldMaintenance\|fieldVarianceNote" lib/strings.ts`). If any is missing, the typecheck will fail on the `StringKey` cast — add it in Task 5 before this compiles. They are expected to exist.

- [ ] **Step 3: Commit**

```bash
git add lib/dailyDigest.ts
git commit -m "Add pure daily handover digest builder

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Digest builder tests

**Files:**
- Modify: `lib/dailyDigest.test.mjs`

- [ ] **Step 1: Add failing assertions**

Append to `lib/dailyDigest.test.mjs` (before the final `console.log`):

```js
import { buildDailyDigest } from "./dailyDigest.ts";

// Minimal row factory matching the ManagerRow shape used by the builder.
function row(code, shift, over = {}) {
  return {
    id: `${code}-${shift}`,
    property_id: code,
    shift_date: "2026-06-13",
    shift_type: shift,
    status: "completed",
    outgoing_name: "Ahmed",
    incoming_name: "Sara",
    cash_drawer: 5000,
    cash_recount: 5000,
    cash_variance: 0,
    notes: null,
    pending_requests: null,
    maintenance_issues: null,
    variance_note: null,
    rooms_occupied: 10,
    created_at: "2026-06-13T08:00:00Z",
    properties: { name_en: code, name_ar: code, code },
    ...over,
  };
}

const SHIFTS = ["morning", "afternoon", "night"];
function fullDay(over = {}) {
  const rows = [];
  for (const code of ["al_aqeeq", "as_salaam"])
    for (const s of SHIFTS) rows.push(row(code, s, over[`${code}|${s}`] ?? {}));
  return rows;
}

// A fixed "now" well past 2026-06-13 so every shift that day is due.
const NOW = new Date("2026-06-14T12:00:00Z");

check("full clean day → 6/6, clear", () => {
  const d = buildDailyDigest(fullDay(), "2026-06-13", NOW);
  assert.equal(d.submitted, 6);
  assert.equal(d.expected, 6);
  assert.equal(d.status, "clear");
  assert.equal(d.mismatches.length, 0);
  assert.equal(d.flags.length, 0);
});

check("missing one shift → 5/6, alert", () => {
  const rows = fullDay().filter((r) => r.id !== "as_salaam-night");
  const d = buildDailyDigest(rows, "2026-06-13", NOW);
  assert.equal(d.submitted, 5);
  assert.equal(d.expected, 6);
  assert.equal(d.status, "alert");
  const asSalaam = d.hotels.find((h) => h.slug === "as_salaam");
  const night = asSalaam.cells.find((c) => c.shift === "night");
  assert.equal(night.status, "missing");
});

check("unfinished shift counts as not submitted → alert", () => {
  const rows = fullDay({ "al_aqeeq|morning": { status: "pending_incoming" } });
  const d = buildDailyDigest(rows, "2026-06-13", NOW);
  assert.equal(d.submitted, 5);
  assert.equal(d.status, "alert");
  const cell = d.hotels
    .find((h) => h.slug === "al_aqeeq")
    .cells.find((c) => c.shift === "morning");
  assert.equal(cell.status, "unfinished");
});

check("cash variance on a full day → attention with mismatch item", () => {
  const rows = fullDay({
    "al_aqeeq|afternoon": { cash_recount: 4950, cash_variance: -50 },
  });
  const d = buildDailyDigest(rows, "2026-06-13", NOW);
  assert.equal(d.submitted, 6);
  assert.equal(d.status, "attention");
  assert.equal(d.mismatches.length, 1);
  assert.equal(d.mismatches[0].variance, -50);
});

check("non-empty note on a full day → attention with flag item", () => {
  const rows = fullDay({
    "as_salaam|morning": { maintenance_issues: "AC room 305 leaking" },
  });
  const d = buildDailyDigest(rows, "2026-06-13", NOW);
  assert.equal(d.status, "attention");
  assert.equal(d.flags.length, 1);
  assert.equal(d.flags[0].fields[0].text, "AC room 305 leaking");
});

check("empty day → 0/6, alert", () => {
  const d = buildDailyDigest([], "2026-06-13", NOW);
  assert.equal(d.submitted, 0);
  assert.equal(d.expected, 6);
  assert.equal(d.status, "alert");
});

check("today: night shift not due yet → excluded from expected", () => {
  // now = 2026-06-14T08:00:00Z = 11:00 Riyadh. On 2026-06-14:
  //   morning ends 15:00 → not due (11<15), afternoon ends 23:00 → not due,
  //   night → not due. So expected should be 0 for an empty current day.
  const earlyNow = new Date("2026-06-14T08:00:00Z");
  const d = buildDailyDigest([], "2026-06-14", earlyNow);
  assert.equal(d.expected, 0);
  assert.equal(d.status, "clear"); // nothing due, nothing missing
});

check("today after morning end: morning due, afternoon/night not", () => {
  // now = 2026-06-14T13:00:00Z = 16:00 Riyadh. morning(end 15) due, others not.
  const now = new Date("2026-06-14T13:00:00Z");
  const d = buildDailyDigest([], "2026-06-14", now);
  assert.equal(d.expected, 2); // morning at each of 2 hotels
  assert.equal(d.status, "alert"); // both missing
});

check("per-hotel counts split correctly", () => {
  const rows = fullDay().filter((r) => r.property_id === "al_aqeeq");
  const d = buildDailyDigest(rows, "2026-06-13", NOW);
  const aq = d.hotels.find((h) => h.slug === "al_aqeeq");
  const ss = d.hotels.find((h) => h.slug === "as_salaam");
  assert.equal(aq.submitted, 3);
  assert.equal(ss.submitted, 0);
});
```

- [ ] **Step 2: Run test to verify the new assertions execute**

Run: `node --experimental-strip-types lib/dailyDigest.test.mjs`
Expected: PASS — all assertions (4 date + 9 digest = 13), prints "13 assertions passed". If any fail, fix `lib/dailyDigest.ts` (not the test) until they pass.

- [ ] **Step 3: Commit**

```bash
git add lib/dailyDigest.test.mjs
git commit -m "Add daily digest builder tests

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Strings (EN/AR)

**Files:**
- Modify: `lib/strings.ts`

- [ ] **Step 1: Verify reused keys exist**

Run: `grep -n "shiftLabel\|fieldNotes\|fieldPending\|fieldMaintenance\|fieldVarianceNote\|propAlAqeeq\|propAsSalaam\|expectedLabel\|countedLabel\|varianceLabel" lib/strings.ts`
Expected: all present. If `expectedLabel`/`countedLabel`/`varianceLabel` are missing, they're added below anyway.

- [ ] **Step 2: Add the digest keys**

In `lib/strings.ts`, inside the `strings` object (before the closing `}` of the object, after the last existing group), add:

```ts
  // Daily handover digest (admin home card)
  digestTitleToday: { en: "Today's handovers", ar: "تسليمات اليوم" },
  digestTitleYesterday: { en: "Yesterday's handovers", ar: "تسليمات الأمس" },
  digestTitleOther: { en: "Handovers", ar: "التسليمات" },
  digestCount: { en: "Handovers", ar: "التسليمات" }, // used as "{title}: X of Y submitted" via digestOf
  digestOf: { en: "of", ar: "من" },
  digestSubmittedWord: { en: "submitted", ar: "مُسلَّمة" },
  digestAllClear: { en: "All handovers received, no mismatches ✅", ar: "تم استلام جميع التسليمات، لا فروقات ✅" },
  digestNoneExpected: { en: "No handovers expected", ar: "لا تسليمات متوقعة" },
  digestMissingN: { en: "missing", ar: "ناقصة" }, // "{n} {missing}"
  digestMismatchesN: { en: "mismatches", ar: "فروقات" },
  digestFlagsN: { en: "flagged", ar: "ملاحظات" },
  digestIndSubmissions: { en: "Submissions", ar: "التسليمات" },
  digestIndMismatches: { en: "Mismatches", ar: "الفروقات" },
  digestIndFlags: { en: "Flagged notes", ar: "ملاحظات مُعلَّمة" },
  digestNotSubmitted: { en: "not submitted", ar: "غير مُسلَّمة" },
  digestUnfinished: { en: "unfinished", ar: "غير مكتملة" },
  digestNotDue: { en: "not due yet", ar: "لم يحن وقتها" },
  digestExpected: { en: "Expected", ar: "المتوقع" },
  digestCounted: { en: "Counted", ar: "المحسوب" },
  digestLoading: { en: "Loading…", ar: "جارٍ التحميل…" },
  digestError: { en: "Couldn't load handovers", ar: "تعذّر تحميل التسليمات" },
```

- [ ] **Step 3: Typecheck**

Run: `npx --no-install tsc --noEmit`
Expected: exit code 0.

- [ ] **Step 4: Commit**

```bash
git add lib/strings.ts
git commit -m "Add daily digest UI strings (EN/AR)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: DailyDigestCard component

**Files:**
- Create: `app/DailyDigestCard.tsx`

Reference for the existing patterns (read before writing):
- `app/manager/ManagerDashboard.tsx` — the `load` query shape (`from("handovers").select("*, properties(name_en, name_ar, code)")`), `useHandoverRealtime` usage, `sar()` formatter, glass classes.
- `lib/i18n` — `useLang()` returns `{ lang }`; `lib/strings` — `translate(key, lang)`.

- [ ] **Step 1: Write the component**

Create `app/DailyDigestCard.tsx`:

```tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/i18n";
import { translate, type StringKey } from "@/lib/strings";
import { createClient } from "@/lib/supabase/client";
import { useHandoverRealtime } from "@/lib/useHandoverRealtime";
import type { ManagerRow } from "@/lib/manager";
import {
  buildDailyDigest,
  type DailyDigest,
  type CellStatus,
} from "@/lib/dailyDigest";
import { riyadhToday, riyadhYesterday, addDays } from "@/lib/riyadhDate";

// Latin numerals + SAR-on-left in every language (client requirement).
function sar(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `SAR ${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const STATUS_DOT: Record<DailyDigest["status"], string> = {
  clear: "bg-green-500",
  attention: "bg-amber-500",
  alert: "bg-red-500",
};
const MARK: Record<CellStatus, string> = {
  submitted: "✅",
  unfinished: "⏳",
  missing: "❌",
  not_due: "·",
};

export function DailyDigestCard() {
  const { lang } = useLang();
  const t = (k: StringKey) => translate(k, lang);

  const [date, setDate] = useState<string>(() => riyadhYesterday());
  const today = riyadhToday();
  const [rows, setRows] = useState<ManagerRow[] | null>(null);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState<null | "subs" | "mis" | "flags">(null);

  const load = useCallback(async (d: string) => {
    setError(false);
    const supabase = createClient();
    const { data, error: err } = await supabase
      .from("handovers")
      .select("*, properties(name_en, name_ar, code)")
      .eq("shift_date", d);
    if (err) {
      setError(true);
      setRows([]);
      return;
    }
    setRows((data ?? []) as ManagerRow[]);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(date);
  }, [date, load]);

  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dateRef = useRef(date);
  useEffect(() => {
    dateRef.current = date;
  }, [date]);
  useHandoverRealtime(
    {
      onUpsert: () => {
        if (debounce.current) clearTimeout(debounce.current);
        debounce.current = setTimeout(() => load(dateRef.current), 300);
      },
      onReconcile: () => load(dateRef.current),
    },
    { channelName: "daily-digest" },
  );

  const digest =
    rows === null ? null : buildDailyDigest(rows, date, new Date());

  const titleK: StringKey =
    date === today
      ? "digestTitleToday"
      : date === addDays(today, -1)
        ? "digestTitleYesterday"
        : "digestTitleOther";

  // One-line summary
  function summaryLine(d: DailyDigest): string {
    if (d.expected === 0) return t("digestNoneExpected");
    if (d.status === "clear") return t("digestAllClear");
    const parts: string[] = [];
    const missing = d.expected - d.submitted;
    if (missing > 0) parts.push(`${missing} ${t("digestMissingN")}`);
    if (d.mismatches.length > 0)
      parts.push(`${d.mismatches.length} ${t("digestMismatchesN")}`);
    if (d.flags.length > 0) parts.push(`${d.flags.length} ${t("digestFlagsN")}`);
    const emoji = d.status === "alert" ? "🔴" : "⚠️";
    return `${parts.join(" · ")} ${emoji}`;
  }

  return (
    <section className="glass rounded-aurion p-4">
      {/* Header: title + date stepper + status dot */}
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[15px] font-bold text-ink">{t(titleK)}</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="previous day"
            onClick={() => setDate((dd) => addDays(dd, -1))}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-paper text-ink-soft"
          >
            ‹
          </button>
          <span className="min-w-[92px] text-center text-[13px] font-medium text-ink-soft">
            {date}
          </span>
          <button
            type="button"
            aria-label="next day"
            disabled={date >= today}
            onClick={() => setDate((dd) => (dd >= today ? dd : addDays(dd, 1)))}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-paper text-ink-soft disabled:opacity-40"
          >
            ›
          </button>
          {digest ? (
            <span
              className={`ml-1 h-3 w-3 rounded-full ${STATUS_DOT[digest.status]}`}
              aria-hidden
            />
          ) : null}
        </div>
      </div>

      {/* Body */}
      {digest === null ? (
        <p className="mt-3 text-[14px] text-ink-soft">{t("digestLoading")}</p>
      ) : error ? (
        <p className="mt-3 text-[14px] text-red-700">{t("digestError")}</p>
      ) : (
        <>
          <p className="mt-2 text-[20px] font-bold text-ink">
            {t("digestCount")}: {digest.submitted} {t("digestOf")} {digest.expected}{" "}
            {t("digestSubmittedWord")}
          </p>
          <p className="mt-0.5 text-[13px] text-ink-soft">{summaryLine(digest)}</p>

          <div className="mt-3 flex flex-col divide-y divide-line/70 border-t border-line/70">
            {/* Submissions */}
            <IndicatorRow
              label={t("digestIndSubmissions")}
              value={`${digest.submitted}/${digest.expected}`}
              expanded={open === "subs"}
              onToggle={() => setOpen(open === "subs" ? null : "subs")}
            >
              <div className="flex flex-col gap-2 pb-2">
                {digest.hotels.map((h) => (
                  <div key={h.slug}>
                    <p className="text-[13px] font-bold text-ink">
                      {t(h.propertyK)} {h.submitted}/{h.expected}
                    </p>
                    <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                      {h.cells.map((c) => {
                        const label = `${t(c.shiftK)} ${MARK[c.status]}`;
                        return c.row && c.status === "submitted" ? (
                          <li key={c.shift}>
                            <Link
                              href={`/history/${c.row.id}`}
                              className="text-[13px] text-gold-deep"
                            >
                              {label}
                            </Link>
                          </li>
                        ) : (
                          <li
                            key={c.shift}
                            className={`text-[13px] ${c.status === "missing" ? "text-red-700" : "text-ink-soft"}`}
                          >
                            {label}
                            {c.status === "missing" ? ` ${t("digestNotSubmitted")}` : ""}
                            {c.status === "unfinished" ? ` ${t("digestUnfinished")}` : ""}
                            {c.status === "not_due" ? ` ${t("digestNotDue")}` : ""}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            </IndicatorRow>

            {/* Mismatches */}
            <IndicatorRow
              label={t("digestIndMismatches")}
              value={String(digest.mismatches.length)}
              flag={digest.mismatches.length > 0}
              expanded={open === "mis"}
              onToggle={() => setOpen(open === "mis" ? null : "mis")}
            >
              <ul className="flex flex-col gap-2 pb-2">
                {digest.mismatches.map((m) => (
                  <li key={m.id}>
                    <Link
                      href={`/history/${m.id}`}
                      className="flex items-center justify-between gap-3 rounded-aurion border border-red-200 bg-red-50/80 p-2.5"
                    >
                      <span className="text-[13px] text-red-900">
                        {t(m.hotelK)} · {t(m.shiftK)} · {m.outgoing_name}
                        <br />
                        <span className="text-ink-soft">
                          {t("digestExpected")} {sar(m.expected)} → {t("digestCounted")}{" "}
                          {sar(m.counted)}
                        </span>
                      </span>
                      <span className="font-bold text-red-700">{sar(m.variance)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </IndicatorRow>

            {/* Flagged notes */}
            <IndicatorRow
              label={t("digestIndFlags")}
              value={String(digest.flags.length)}
              flag={digest.flags.length > 0}
              expanded={open === "flags"}
              onToggle={() => setOpen(open === "flags" ? null : "flags")}
            >
              <ul className="flex flex-col gap-2 pb-2">
                {digest.flags.map((f) => (
                  <li key={f.id}>
                    <Link
                      href={`/history/${f.id}`}
                      className="block rounded-aurion border border-line bg-paper-tint p-2.5"
                    >
                      <span className="text-[13px] font-bold text-ink">
                        {t(f.hotelK)} · {t(f.shiftK)} · {f.outgoing_name}
                      </span>
                      {f.fields.map((fl, i) => (
                        <span key={i} className="mt-1 block text-[13px] text-ink-soft">
                          <span className="font-medium text-ink">{t(fl.labelK)}:</span>{" "}
                          {fl.text}
                        </span>
                      ))}
                    </Link>
                  </li>
                ))}
              </ul>
            </IndicatorRow>
          </div>
        </>
      )}
    </section>
  );
}

function IndicatorRow({
  label,
  value,
  flag,
  expanded,
  onToggle,
  children,
}: {
  label: string;
  value: string;
  flag?: boolean;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex min-h-[44px] w-full items-center justify-between gap-2 py-1 text-start"
      >
        <span className="flex items-center gap-2 text-[14px] font-medium text-ink">
          <span className={`transition-transform ${expanded ? "rotate-90" : ""}`}>›</span>
          {label}
        </span>
        <span className={`text-[14px] font-bold ${flag ? "text-red-700" : "text-ink-soft"}`}>
          {value}
        </span>
      </button>
      {expanded ? <div className="px-1">{children}</div> : null}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx --no-install tsc --noEmit`
Expected: exit code 0. Common fixes: confirm `useLang` is exported from `@/lib/i18n` and returns `{ lang }`; confirm `translate` and `StringKey` are exported from `@/lib/strings`; confirm `useHandoverRealtime`'s option key is `channelName` and callback names are `onUpsert`/`onReconcile` (cross-check against `app/manager/ManagerDashboard.tsx` lines ~129-144).

- [ ] **Step 3: Lint**

Run: `npx --no-install eslint app/DailyDigestCard.tsx`
Expected: no errors (warnings ok).

- [ ] **Step 4: Commit**

```bash
git add app/DailyDigestCard.tsx
git commit -m "Add DailyDigestCard component

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Wire into AdminHome

**Files:**
- Modify: `app/AdminHome.tsx`

- [ ] **Step 1: Import and render the card**

In `app/AdminHome.tsx`, add the import after the existing imports:

```tsx
import { DailyDigestCard } from "./DailyDigestCard";
```

Then inside `<main ...>`, make `<DailyDigestCard />` the FIRST child (above `<HomeSearch />`):

```tsx
    <main className="mx-auto flex w-full max-w-[480px] flex-col gap-3.5 px-5 py-8">
      <DailyDigestCard />
      <HomeSearch />
```

- [ ] **Step 2: Typecheck + lint**

Run: `npx --no-install tsc --noEmit && npx --no-install eslint app/AdminHome.tsx`
Expected: exit code 0, no lint errors.

- [ ] **Step 3: Production build (does NOT start a server)**

Run: `npm run build`
Expected: build succeeds (compiles `/` route). Do NOT run `npm run dev` / `npm start` — localhost is off-limits per the user.

- [ ] **Step 4: Commit**

```bash
git add app/AdminHome.tsx
git commit -m "Show daily handover digest at top of admin home

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: Final verification

- [ ] **Step 1: Run the full logic test suite**

Run: `node --experimental-strip-types lib/dailyDigest.test.mjs`
Expected: "13 assertions passed".

- [ ] **Step 2: Full typecheck + lint + build**

Run: `npx --no-install tsc --noEmit && npx --no-install eslint && npm run build`
Expected: all clean.

- [ ] **Step 3: Manual review checklist (no localhost)**

Confirm by reading the rendered route output / code (NOT by starting a dev server):
- Card is the first element on `/` for admins.
- Defaults to Riyadh-yesterday; `‹`/`›` step the date; `›` disabled at today.
- Status dot color matches rule (clear/attention/alert).
- Submissions expand shows per-hotel + per-shift; submitted shifts link to `/history/[id]`.
- Mismatches/flags expand show items linking to detail.

NOTE for the user: per CLAUDE.md Definition of Done, the real-device check (iPhone + Android, EN + AR/RTL) on the deployed build is still required before calling this fully shipped. That step is the user's to run on a phone against the Vercel deploy — not via localhost.

---

## Self-review notes

- **Spec coverage:** summary card ✓ (Task 6), X-of-Y ✓, status colors ✓, one-line EN/AR summary ✓ (Task 5 strings + summaryLine), 3 expandable indicators ✓, submissions/mismatches/flags drill-down ✓, collapsed default ✓ (`open` starts `null`), Riyadh yesterday + date arrows ✓ (Task 2 + 6), no-handovers-expected ✓ (summaryLine), attention rules ✓ (Task 3 status derivation), placement on admin home ✓ (Task 7), reuse of `hasCashMismatch`/`SHIFT_OPTIONS`/`PROPERTIES`/`ManagerRow`/glass tokens ✓.
- **Type consistency:** `buildDailyDigest(rows, date, now)` signature identical across Task 3, 4, 6. `CellStatus`/`DailyDigest`/`MismatchItem`/`FlagItem` defined once (Task 3), consumed in 6. `MARK` keyed by `CellStatus` (all 4 variants). Strings keys referenced in Task 6 all defined in Task 5 or pre-existing (verified in Task 3 note + Task 5 step 1).
- **Placeholder:** none. Every step shows complete code; the only emoji/glyph map is `MARK` (Task 6), keyed by all four `CellStatus` variants.
