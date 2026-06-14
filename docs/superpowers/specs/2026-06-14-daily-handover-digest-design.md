# Daily Handover Digest — Admin home summary card

**Date:** 2026-06-14
**Status:** Approved (design)

## Goal

When an admin opens the home page (`/`, rendered by `AdminHome`), the first thing
they see is a "Yesterday's Handovers" summary card. At a glance they know whether
all handovers were submitted and whether anything needs attention — without
clicking into individual records.

## Context (real data model)

The prompt's assumed schema (`staff_id`, `expected_values`, `actual_values`) does
NOT match the codebase. Actual `handovers` columns used here:

- `property_id` → joined `properties { code, name_en, name_ar }`
- `shift_type`: `"morning"` (07:00) | `"afternoon"` (15:00) | `"night"` (23:00)
- `shift_date`: `YYYY-MM-DD` (Western form, source of truth)
- `status`: `"pending_incoming"` (outgoing signed, awaiting incoming) | `"completed"` (both signed)
- `outgoing_name`, `incoming_name`
- `cash_drawer`, `cash_recount`, `cash_variance` — variance flagged via existing `hasCashMismatch()`
- Free-text flag fields: `notes`, `pending_requests`, `maintenance_issues`, `variance_note`

**Expected handovers per day = 2 hotels × 3 shifts = 6.** (`PROPERTIES` has
`al_aqeeq`, `as_salaam`; `SHIFT_OPTIONS` has the three shifts.)

## Decisions (from brainstorming)

- **Count format:** total + per-hotel drill-down ("5 of 6 submitted"; expand → Al Aqeeq 3/3, As Salaam 2/3 with per-shift status).
- **Which day:** defaults to **yesterday in Asia/Riyadh**, with `‹ ›` arrows to step the date (cannot go past today).
- **Placement:** top of `AdminHome` (`app/AdminHome.tsx`), above the search box. `/manager` is left unchanged.
- **Attention rules:**
  - **Red / alert** — any expected hotel×shift has no completed handover (missing, or exists-but-unfinished on a past day).
  - **Amber / attention** — all submitted but ≥1 cash variance, OR ≥1 non-empty note/issue/pending/variance_note, OR ≥1 unfinished (`status ≠ completed`).
  - **Green / clear** — 6/6 completed, no variance, no notes.
- **Default state:** collapsed (the three indicator rows visible; each expands on tap).

## Architecture

### 1. `lib/dailyDigest.ts` (pure, tested)

Pure functions over `ManagerRow[]` (reuses the `ManagerRow` type and `hasCashMismatch`
from `lib/manager` / `lib/handover`). No React, no Supabase — cheap to recompute and
unit-testable.

```ts
type CellStatus = "submitted" | "unfinished" | "missing" | "not_due";

type ShiftCell = {
  shift: ShiftType;
  shiftK: StringKey;
  status: CellStatus;
  row: ManagerRow | null; // the matching handover, if any
};

type HotelDigest = {
  slug: PropertySlug;
  propertyK: StringKey;
  submitted: number;       // count of "submitted" cells
  expected: number;        // count of cells that are due (excludes not_due)
  cells: ShiftCell[];      // always 3, in morning/afternoon/night order
};

type MismatchItem = {
  id: string; hotelK: StringKey; shiftK: StringKey;
  outgoing_name: string; expected: number | null; counted: number | null; variance: number | null;
};

type FlagItem = {
  id: string; hotelK: StringKey; shiftK: StringKey;
  outgoing_name: string;
  fields: { labelK: StringKey; text: string }[]; // each non-empty note field
};

type DigestStatus = "clear" | "attention" | "alert";

type DailyDigest = {
  date: string;            // YYYY-MM-DD (the queried day)
  submitted: number;       // total submitted across hotels
  expected: number;        // total due across hotels (≤ 6)
  hotels: HotelDigest[];
  mismatches: MismatchItem[];
  flags: FlagItem[];
  status: DigestStatus;
};

function buildDailyDigest(rows: ManagerRow[], date: string, now: Date): DailyDigest;
```

**`not_due` logic:** a shift is `not_due` only when `date` is today (Riyadh) and the
shift's end time hasn't passed yet. For any past day, every shift is due. This keeps
the card from going red for shifts that simply haven't happened yet today. Uses the
existing shift-end hours (morning 15:00, afternoon 23:00, night 07:00 next day).

A cell is `submitted` only when a `completed` row exists. An `unfinished` cell (row
present, `status ≠ completed`) and a `missing` cell (no row) both count as
not-submitted, so both drive `submitted < expected`.

**Status derivation (first match wins):**
- `alert` — `submitted < expected` (a due hotel×shift has no completed handover, whether missing or only unfinished).
- `attention` — all due slots submitted, but ≥1 cash mismatch or ≥1 non-empty note field.
- `clear` — every due slot submitted, no variance, no notes.

### 2. `lib/riyadhDate.ts` (small helper)

```ts
function riyadhToday(now?: Date): string;        // YYYY-MM-DD in Asia/Riyadh
function riyadhYesterday(now?: Date): string;    // one day before riyadhToday
function addDays(iso: string, n: number): string;
```

Implemented with `Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Riyadh' })`.

### 3. `app/DailyDigestCard.tsx` (client component)

- On mount and when `date` changes, queries:
  `supabase.from("handovers").select("*, properties(name_en, name_ar, code)").eq("shift_date", date)`
- Computes the digest with `buildDailyDigest(rows, date, new Date())`.
- Subscribes via the existing `useHandoverRealtime` so the card refreshes when a
  handover lands (debounced), matching the manager dashboard pattern.
- Renders: header (date + `‹ ›` arrows + status dot), count line, one-line EN/AR
  summary, then three collapsible indicator rows (Submissions / Mismatches / Flagged
  notes). Each row uses a `<details>`-style expand with local state.
- Submitted/mismatch/flag items link to `/history/[id]`.
- Loading, error, and empty/"no handovers expected" states.

### 4. `lib/strings.ts` additions (EN/AR)

New keys (grouped under a "Daily digest" comment): card title, "Handovers: X of Y
submitted", indicator labels, "not submitted", "no handovers expected", the
one-line summary fragments ("all received, no mismatches", "N missing", "N
mismatches", "N flagged"), expected/counted labels (reuse existing if present), and
the note field labels (reuse `fieldNotes`, `fieldPending`, `fieldMaintenance`,
`fieldVarianceNote` which already exist).

### 5. `app/AdminHome.tsx` wiring

Insert `<DailyDigestCard />` as the first child of the `<main>`, above `<HomeSearch />`.

## Visual (collapsed default)

```
┌─────────────────────────────────────────┐
│  Yesterday · ‹ 2026-06-13 ›        🟢/🟡/🔴 │
│  Handovers: 5 of 6 submitted              │
│  1 handover missing, 2 mismatches ⚠️       │
│  ─────────────────────────────────────    │
│  ▸ Submissions   5/6                       │
│  ▸ Mismatches    2                         │
│  ▸ Flagged notes 1                         │
└─────────────────────────────────────────┘
```

Uses existing glass tokens (`glass`/`glass-navy`, `rounded-aurion`, gold/navy/ink,
amber-100/red-50 accents already used in the manager dashboard). Mobile-first
(max-w 480px, ≥44px touch targets). Bilingual via global `useLang` + `translate`;
RTL handled by `dir` like the rest of the app. All numerals Western (client rule).

## Testing

- Unit tests for `buildDailyDigest`: all-clear (6/6), missing shift → alert, variance
  → attention, note → attention, unfinished → attention, `not_due` today, empty day,
  per-hotel counts.
- Unit tests for `riyadhDate`: yesterday across a UTC midnight boundary (Riyadh is
  UTC+3, so the date can differ from server-local).
- Manual: real iPhone + Android, EN + AR (RTL), with a missing shift and a variance
  present; verify links open the right detail; verify date arrows and "today not-due".

## Out of scope / YAGNI

- No changes to `/manager` (its "Missing shifts"/"Variance flags" sections stay).
- No Supabase RPC/function — computed client-side from one scoped query.
- No new DB columns or migrations.
- No email/Resend alerting (separate optional phase).
