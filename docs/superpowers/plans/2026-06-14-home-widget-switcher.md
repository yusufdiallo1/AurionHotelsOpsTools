# Home Widget Switcher Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the standalone daily-digest card on the home page with a glass-pill tabbed widget switcher (Handovers/Cash/Occupancy/Issues/Week), role-tailored: admin sees portfolio-wide with 5 tabs, receptionist sees their hotel with 3 tabs.

**Architecture:** A pure config/selector module `lib/homeWidgets.ts`; a shared `WidgetSwitcher` shell that renders glass pill tabs + only the active panel; five focused panel components in `app/widgets/`, each owning its own scoped Supabase fetch + realtime subscription and reusing existing pure selectors (`lib/manager.ts`, `lib/dailyDigest.ts`). `buildDailyDigest` gains an optional `slugFilter` for hotel scope. The standalone `DailyDigestCard` is removed (its logic moves into `HandoversPanel`).

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind v4, Supabase JS, existing `useHandoverRealtime` + `lib/i18n` + `lib/strings`. Standalone Node tests via `node --experimental-strip-types`. **Do NOT run the dev server / localhost.**

---

## File Structure

- `lib/dailyDigest.ts` (modify) — add optional `slugFilter?: PropertySlug` param to `buildDailyDigest`.
- `lib/dailyDigest.test.mjs` (modify) — add slugFilter assertions; existing 13 stay green.
- `lib/homeWidgets.ts` (create) — `WidgetScope`, `WidgetKey`, tab config per role, `openIssues` selector.
- `lib/homeWidgets.test.mjs` (create) — tests for `openIssues` + `tabsForRole`.
- `lib/strings.ts` (modify) — tab labels + panel strings (EN/AR).
- `app/widgets/WidgetSwitcher.tsx` (create) — pill tabs + active panel.
- `app/widgets/HandoversPanel.tsx` (create) — polished digest (from DailyDigestCard).
- `app/widgets/CashPanel.tsx` (create) — admin cash.
- `app/widgets/OccupancyPanel.tsx` (create) — occupancy.
- `app/widgets/IssuesPanel.tsx` (create) — open issues (7d).
- `app/widgets/WeekPanel.tsx` (create) — week stats (admin).
- `app/widgets/useScopedHandovers.ts` (create) — shared hook: fetch scoped rows + realtime.
- `app/AdminHome.tsx` (modify) — swap DailyDigestCard → WidgetSwitcher.
- `app/ReceptionistHome.tsx` (modify) — add WidgetSwitcher; accept slug+propertyId props.
- `app/page.tsx` (modify) — resolve receptionist slug, pass to ReceptionistHome.
- `app/DailyDigestCard.tsx` (delete) — superseded by HandoversPanel.

Reuse from `lib/manager.ts`: `ManagerRow`, `propertySnapshots`, `dashboardTotals`, `weekStats`, `isoDaysBefore`. From `lib/handover.ts`: `SHIFT_OPTIONS`, `hasCashMismatch`. From `lib/properties.ts`: `PROPERTIES`, `PropertySlug`.

---

## Task 1: Add slugFilter to buildDailyDigest

**Files:**
- Modify: `lib/dailyDigest.ts`
- Modify: `lib/dailyDigest.test.mjs`

- [ ] **Step 1: Add failing test**

Append to `lib/dailyDigest.test.mjs` BEFORE the final `console.log`:

```js
check("slugFilter scopes to one hotel → expected 3", () => {
  const d = buildDailyDigest(fullDay(), "2026-06-13", NOW, "al_aqeeq");
  assert.equal(d.expected, 3);
  assert.equal(d.submitted, 3);
  assert.equal(d.hotels.length, 1);
  assert.equal(d.hotels[0].slug, "al_aqeeq");
  assert.equal(d.status, "clear");
});

check("slugFilter: missing shift in scoped hotel → alert 2/3", () => {
  const rows = fullDay().filter((r) => r.id !== "al_aqeeq-night");
  const d = buildDailyDigest(rows, "2026-06-13", NOW, "al_aqeeq");
  assert.equal(d.expected, 3);
  assert.equal(d.submitted, 2);
  assert.equal(d.status, "alert");
});

check("slugFilter: mismatch only counted for scoped hotel", () => {
  const rows = fullDay({ "as_salaam|morning": { cash_recount: 4950, cash_variance: -50 } });
  const d = buildDailyDigest(rows, "2026-06-13", NOW, "al_aqeeq");
  assert.equal(d.mismatches.length, 0); // the variance is in as_salaam, not scoped hotel
  assert.equal(d.status, "clear");
});
```

- [ ] **Step 2: Run to verify fail**

Run: `node --experimental-strip-types lib/dailyDigest.test.mjs`
Expected: FAIL (buildDailyDigest ignores the 4th arg, so expected=6 not 3).

- [ ] **Step 3: Implement slugFilter**

In `lib/dailyDigest.ts`, change the signature and three internals. The function currently is `export function buildDailyDigest(rows, date, now)`. Change to:

```ts
export function buildDailyDigest(
  rows: ManagerRow[],
  date: string,
  now: Date,
  slugFilter?: PropertySlug,
): DailyDigest {
```

Then, where `PROPERTIES.map((p) => {` builds hotels, scope the property list:

```ts
  const props = slugFilter
    ? PROPERTIES.filter((p) => p.slug === slugFilter)
    : PROPERTIES;
  const hotels: HotelDigest[] = props.map((p) => {
```

And where `completedRows` is computed, also filter by hotel when scoped:

```ts
  const completedRows = rows.filter(
    (r) =>
      r.shift_date === date &&
      r.status === "completed" &&
      (!slugFilter || r.properties?.code === slugFilter),
  );
```

Leave everything else unchanged. (`byKey` indexing already keys by `code|shift`; since `hotels` only iterates scoped props, out-of-scope rows are simply never looked up.)

- [ ] **Step 4: Run to verify pass**

Run: `node --experimental-strip-types lib/dailyDigest.test.mjs`
Expected: PASS — "16 assertions passed" (13 existing + 3 new). The existing 13 must still pass (default undefined slugFilter = portfolio).

- [ ] **Step 5: Typecheck**

Run: `npx --no-install tsc --noEmit`
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add lib/dailyDigest.ts lib/dailyDigest.test.mjs
git commit -m "Add optional slugFilter to buildDailyDigest for hotel scope" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: homeWidgets module (config + openIssues)

**Files:**
- Create: `lib/homeWidgets.ts`
- Create: `lib/homeWidgets.test.mjs`

- [ ] **Step 1: Write failing tests**

Create `lib/homeWidgets.test.mjs`:

```js
// Run: node --experimental-strip-types lib/homeWidgets.test.mjs
import assert from "node:assert/strict";
import { fromRoot } from "./_tsAlias.mjs";
const { openIssues, tabsForRole, ADMIN_TABS, RECEPTIONIST_TABS } = await import(
  fromRoot("lib/homeWidgets.ts")
);

let passed = 0;
function check(name, fn) { fn(); passed++; console.log("ok -", name); }

function row(code, shift, over = {}) {
  return {
    id: `${code}-${shift}`, property_id: code, shift_date: "2026-06-13",
    shift_type: shift, status: "completed", outgoing_name: "Ahmed",
    incoming_name: "Sara", cash_drawer: 5000, cash_recount: 5000, cash_variance: 0,
    notes: null, pending_requests: null, maintenance_issues: null, variance_note: null,
    rooms_occupied: 10, created_at: "2026-06-13T08:00:00Z",
    properties: { name_en: code, name_ar: code, code }, ...over,
  };
}

check("tabsForRole admin → 5 tabs incl cash+week", () => {
  const keys = tabsForRole("admin").map((t) => t.key);
  assert.deepEqual(keys, ["handovers", "cash", "occupancy", "issues", "week"]);
});

check("tabsForRole receptionist → 3 tabs, no cash/week", () => {
  const keys = tabsForRole("receptionist").map((t) => t.key);
  assert.deepEqual(keys, ["handovers", "issues", "occupancy"]);
});

check("openIssues extracts maintenance/pending/variance, skips clean rows", () => {
  const rows = [
    row("al_aqeeq", "morning", { maintenance_issues: "AC leaking" }),
    row("al_aqeeq", "afternoon", { pending_requests: "Late checkout 203" }),
    row("as_salaam", "night", { cash_variance: -50, cash_recount: 4950, variance_note: "short" }),
    row("as_salaam", "morning"), // clean → no issue
  ];
  const issues = openIssues(rows);
  const kinds = issues.map((i) => i.kind).sort();
  assert.deepEqual(kinds, ["maintenance", "pending", "variance"]);
});

check("openIssues newest first by created_at", () => {
  const rows = [
    row("al_aqeeq", "morning", { maintenance_issues: "older", created_at: "2026-06-13T06:00:00Z" }),
    row("al_aqeeq", "night", { maintenance_issues: "newer", created_at: "2026-06-13T20:00:00Z" }),
  ];
  const issues = openIssues(rows);
  assert.equal(issues[0].text, "newer");
});

check("openIssues only includes completed rows", () => {
  const rows = [row("al_aqeeq", "morning", { status: "pending_incoming", maintenance_issues: "x" })];
  assert.equal(openIssues(rows).length, 0);
});

console.log(`\n${passed} assertions passed`);
```

- [ ] **Step 2: Run to verify fail**

Run: `node --experimental-strip-types lib/homeWidgets.test.mjs`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

Create `lib/homeWidgets.ts`:

```ts
// Home widget switcher config + selectors. Pure (no React/Supabase) so panels can
// recompute cheaply and the config is unit-testable. (spec 2026-06-14)

import type { StringKey } from "@/lib/strings";
import { SHIFT_OPTIONS, hasCashMismatch } from "@/lib/handover";
import type { ManagerRow } from "@/lib/manager";

export type Role = "admin" | "receptionist";

export type WidgetScope =
  | { kind: "portfolio" }
  | { kind: "hotel"; slug: string; propertyId: string };

export type WidgetKey = "handovers" | "cash" | "occupancy" | "issues" | "week";

export type WidgetTab = { key: WidgetKey; labelK: StringKey };

export const ADMIN_TABS: WidgetTab[] = [
  { key: "handovers", labelK: "widgetHandovers" },
  { key: "cash", labelK: "widgetCash" },
  { key: "occupancy", labelK: "widgetOccupancy" },
  { key: "issues", labelK: "widgetIssues" },
  { key: "week", labelK: "widgetWeek" },
];

export const RECEPTIONIST_TABS: WidgetTab[] = [
  { key: "handovers", labelK: "widgetHandovers" },
  { key: "issues", labelK: "widgetIssues" },
  { key: "occupancy", labelK: "widgetOccupancy" },
];

export function tabsForRole(role: Role): WidgetTab[] {
  return role === "admin" ? ADMIN_TABS : RECEPTIONIST_TABS;
}

export type OpenIssue = {
  id: string;
  hotelK: StringKey;
  shiftK: StringKey;
  shift_date: string;
  outgoing_name: string;
  kind: "maintenance" | "pending" | "variance";
  text: string;
};

const propK = (r: ManagerRow): StringKey =>
  r.properties?.code === "al_aqeeq" ? "propAlAqeeq" : "propAsSalaam";
const shiftK = (st: string): StringKey =>
  SHIFT_OPTIONS.find((s) => s.value === st)?.k ?? "shiftLabel";

/** Open follow-up items across the provided (already-scoped) completed rows:
 *  maintenance issues, pending requests, and cash variances. Newest first. */
export function openIssues(rows: ManagerRow[]): OpenIssue[] {
  const completed = rows.filter((r) => r.status === "completed");
  const issues: OpenIssue[] = [];
  for (const r of completed) {
    const base = {
      id: r.id,
      hotelK: propK(r),
      shiftK: shiftK(r.shift_type),
      shift_date: r.shift_date,
      outgoing_name: r.outgoing_name,
    };
    const maint = (r.maintenance_issues ?? "").trim();
    if (maint) issues.push({ ...base, kind: "maintenance", text: maint });
    const pend = (r.pending_requests ?? "").trim();
    if (pend) issues.push({ ...base, kind: "pending", text: pend });
    if (hasCashMismatch(r)) {
      const note = (r.variance_note ?? "").trim();
      issues.push({
        ...base,
        kind: "variance",
        text: note || `${r.cash_variance ?? 0}`,
      });
    }
  }
  // Newest first by the parent row's created_at (look up via id map).
  const order = new Map(completed.map((r) => [r.id, r.created_at ?? ""]));
  return issues.sort((a, b) =>
    (order.get(b.id) ?? "").localeCompare(order.get(a.id) ?? ""),
  );
}
```

- [ ] **Step 4: Run to verify pass**

Run: `node --experimental-strip-types lib/homeWidgets.test.mjs`
Expected: PASS — "5 assertions passed".

- [ ] **Step 5: Typecheck + commit**

Run: `npx --no-install tsc --noEmit` → exit 0. (This will fail if the `widget*` StringKeys don't exist yet — that's fine, Task 3 adds them; if it fails ONLY on missing widget* keys, proceed to Task 3 then re-run. If it fails for any other reason, fix it.)

```bash
git add lib/homeWidgets.ts lib/homeWidgets.test.mjs
git commit -m "Add home widget config + openIssues selector" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Strings (EN/AR)

**Files:**
- Modify: `lib/strings.ts`

- [ ] **Step 1: Add keys**

In `lib/strings.ts`, inside the `strings` object (as siblings of existing keys, before the closing `} as const`), add:

```ts
  // Home widget switcher
  widgetHandovers: { en: "Handovers", ar: "التسليمات" },
  widgetCash: { en: "Cash", ar: "النقد" },
  widgetOccupancy: { en: "Occupancy", ar: "الإشغال" },
  widgetIssues: { en: "Issues", ar: "الملاحظات" },
  widgetWeek: { en: "Week", ar: "الأسبوع" },
  widgetCashInDrawer: { en: "Cash in drawer", ar: "النقد في الدرج" },
  widgetPortfolioTotal: { en: "Total", ar: "الإجمالي" },
  widgetRoomsOccupied: { en: "Rooms occupied", ar: "الغرف المشغولة" },
  widgetOccupancyPct: { en: "Occupancy", ar: "الإشغال" },
  widgetIssuesNone: { en: "No open issues", ar: "لا ملاحظات مفتوحة" },
  widgetIssueMaintenance: { en: "Maintenance", ar: "الصيانة" },
  widgetIssuePending: { en: "Pending request", ar: "طلب معلّق" },
  widgetIssueVariance: { en: "Cash variance", ar: "فرق نقدي" },
  widgetWeekHandovers: { en: "Handovers", ar: "التسليمات" },
  widgetWeekVariance: { en: "Total variance", ar: "إجمالي الفروقات" },
  widgetWeekMismatches: { en: "Mismatches", ar: "الفروقات" },
  widgetWeekTitle: { en: "Last 7 days", ar: "آخر ٧ أيام" },
  widgetLoading: { en: "Loading…", ar: "جارٍ التحميل…" },
  widgetError: { en: "Couldn't load", ar: "تعذّر التحميل" },
```

Match existing single-line formatting. Do not alter the `StringKey` type or `DEFAULT_LANG`.

- [ ] **Step 2: Typecheck**

Run: `npx --no-install tsc --noEmit` → exit 0 (now homeWidgets.ts resolves all widget* keys).

- [ ] **Step 3: Re-run widget tests**

Run: `node --experimental-strip-types lib/homeWidgets.test.mjs` → "5 assertions passed".

- [ ] **Step 4: Commit**

```bash
git add lib/strings.ts
git commit -m "Add home widget strings (EN/AR)" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Shared scoped-handovers hook

**Files:**
- Create: `app/widgets/useScopedHandovers.ts`

This hook centralises the fetch+realtime pattern every panel needs, so panels stay tiny.

- [ ] **Step 1: Implement**

Create `app/widgets/useScopedHandovers.ts`:

```ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useHandoverRealtime } from "@/lib/useHandoverRealtime";
import type { ManagerRow } from "@/lib/manager";
import type { WidgetScope } from "@/lib/homeWidgets";

type Filter =
  | { byDate: string } // single shift_date
  | { fromDate: string; toDate: string }; // inclusive range

/**
 * Fetch handovers (joined to properties) for a date or range, optionally scoped
 * to one hotel, and keep them fresh via realtime (debounced). Returns null while
 * loading, [] on error (with `error=true`). channelName must be unique per panel.
 */
export function useScopedHandovers(
  scope: WidgetScope,
  filter: Filter,
  channelName: string,
): { rows: ManagerRow[] | null; error: boolean } {
  const [rows, setRows] = useState<ManagerRow[] | null>(null);
  const [error, setError] = useState(false);

  const filterKey =
    "byDate" in filter ? `d:${filter.byDate}` : `r:${filter.fromDate}:${filter.toDate}`;
  const propertyId = scope.kind === "hotel" ? scope.propertyId : null;

  const load = useCallback(async () => {
    setError(false);
    const supabase = createClient();
    let q = supabase.from("handovers").select("*, properties(name_en, name_ar, code)");
    if ("byDate" in filter) q = q.eq("shift_date", filter.byDate);
    else q = q.gte("shift_date", filter.fromDate).lte("shift_date", filter.toDate);
    if (propertyId) q = q.eq("property_id", propertyId);
    const { data, error: err } = await q;
    if (err) {
      setError(true);
      setRows([]);
      return;
    }
    setRows((data ?? []) as ManagerRow[]);
    // filterKey/propertyId are the real inputs; q is rebuilt from them each call.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey, propertyId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  useHandoverRealtime(
    {
      onUpsert: () => {
        if (debounce.current) clearTimeout(debounce.current);
        debounce.current = setTimeout(() => load(), 300);
      },
      onReconcile: () => load(),
    },
    { channelName },
  );

  return { rows, error };
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `npx --no-install tsc --noEmit && npx --no-install eslint app/widgets/useScopedHandovers.ts`
Expected: exit 0, no lint errors.

- [ ] **Step 3: Commit**

```bash
git add app/widgets/useScopedHandovers.ts
git commit -m "Add shared scoped-handovers fetch+realtime hook" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: HandoversPanel (polished digest)

**Files:**
- Create: `app/widgets/HandoversPanel.tsx`

This is the existing `DailyDigestCard` body, scope-aware and visually cleaned up.
Read `app/DailyDigestCard.tsx` first — reuse its `summaryLine`, `MARK`, `STATUS_DOT`,
the date stepper, and the three IndicatorRows verbatim, with these changes:
- It receives `{ scope }` instead of being standalone.
- It uses `useScopedHandovers(scope, { byDate: date }, "widget-handovers")` instead of its own fetch.
- `buildDailyDigest(rows, date, new Date(), scope.kind === "hotel" ? scope.slug : undefined)`.
- Polish: add a colored left accent bar keyed to status; render the count number large.

- [ ] **Step 1: Implement**

Create `app/widgets/HandoversPanel.tsx`:

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/i18n";
import { translate, type StringKey } from "@/lib/strings";
import type { PropertySlug } from "@/lib/properties";
import {
  buildDailyDigest,
  type DailyDigest,
  type CellStatus,
} from "@/lib/dailyDigest";
import { riyadhToday, riyadhYesterday, addDays } from "@/lib/riyadhDate";
import type { WidgetScope } from "@/lib/homeWidgets";
import { useScopedHandovers } from "./useScopedHandovers";

function sar(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `SAR ${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const STATUS_DOT: Record<DailyDigest["status"], string> = {
  clear: "bg-green-500",
  attention: "bg-amber-500",
  alert: "bg-red-500",
};
const STATUS_ACCENT: Record<DailyDigest["status"], string> = {
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

export function HandoversPanel({ scope }: { scope: WidgetScope }) {
  const { lang } = useLang();
  const t = (k: StringKey) => translate(k, lang);

  const [date, setDate] = useState<string>(() => riyadhYesterday());
  const today = riyadhToday();
  const [open, setOpen] = useState<null | "subs" | "mis" | "flags">(null);

  const { rows, error } = useScopedHandovers(scope, { byDate: date }, "widget-handovers");
  const slug: PropertySlug | undefined =
    scope.kind === "hotel" ? (scope.slug as PropertySlug) : undefined;
  const digest = rows === null ? null : buildDailyDigest(rows, date, new Date(), slug);

  const titleK: StringKey =
    date === today
      ? "digestTitleToday"
      : date === addDays(today, -1)
        ? "digestTitleYesterday"
        : "digestTitleOther";

  function summaryLine(d: DailyDigest): string {
    if (d.expected === 0) return t("digestNoneExpected");
    if (d.status === "clear") return t("digestAllClear");
    const parts: string[] = [];
    const missing = d.expected - d.submitted;
    if (missing > 0) parts.push(`${missing} ${t("digestMissingN")}`);
    if (d.mismatches.length > 0) parts.push(`${d.mismatches.length} ${t("digestMismatchesN")}`);
    if (d.flags.length > 0) parts.push(`${d.flags.length} ${t("digestFlagsN")}`);
    const emoji = d.status === "alert" ? "🔴" : "⚠️";
    return `${parts.join(" · ")} ${emoji}`;
  }

  return (
    <div className="relative overflow-hidden">
      {digest ? (
        <span className={`absolute inset-y-0 start-0 w-1 ${STATUS_ACCENT[digest.status]}`} aria-hidden />
      ) : null}
      <div className="ps-2">
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
            <span className="min-w-[92px] text-center text-[13px] font-medium text-ink-soft">{date}</span>
            <button
              type="button"
              aria-label="next day"
              disabled={date >= today}
              onClick={() => setDate((dd) => (dd >= today ? dd : addDays(dd, 1)))}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-paper text-ink-soft disabled:opacity-40"
            >
              ›
            </button>
            {digest ? <span className={`ml-1 h-3 w-3 rounded-full ${STATUS_DOT[digest.status]}`} aria-hidden /> : null}
          </div>
        </div>

        {digest === null ? (
          <p className="mt-3 text-[14px] text-ink-soft">{t("widgetLoading")}</p>
        ) : error ? (
          <p className="mt-3 text-[14px] text-red-700">{t("widgetError")}</p>
        ) : (
          <>
            <p className="mt-2 text-[28px] font-bold leading-tight text-ink">
              {digest.submitted} {t("digestOf")} {digest.expected}
            </p>
            <p className="text-[13px] text-ink-soft">
              {t("digestSubmittedWord")} · {summaryLine(digest)}
            </p>

            <div className="mt-3 flex flex-col divide-y divide-line/70 border-t border-line/70">
              <IndicatorRow label={t("digestIndSubmissions")} value={`${digest.submitted}/${digest.expected}`} expanded={open === "subs"} onToggle={() => setOpen(open === "subs" ? null : "subs")}>
                <div className="flex flex-col gap-2 pb-2">
                  {digest.hotels.map((h) => (
                    <div key={h.slug}>
                      <p className="text-[13px] font-bold text-ink">{t(h.propertyK)} {h.submitted}/{h.expected}</p>
                      <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                        {h.cells.map((c) => {
                          const label = `${t(c.shiftK)} ${MARK[c.status]}`;
                          return c.row && c.status === "submitted" ? (
                            <li key={c.shift}><Link href={`/history/${c.row.id}`} className="text-[13px] text-gold-deep">{label}</Link></li>
                          ) : (
                            <li key={c.shift} className={`text-[13px] ${c.status === "missing" ? "text-red-700" : "text-ink-soft"}`}>
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

              <IndicatorRow label={t("digestIndMismatches")} value={String(digest.mismatches.length)} flag={digest.mismatches.length > 0} expanded={open === "mis"} onToggle={() => setOpen(open === "mis" ? null : "mis")}>
                <ul className="flex flex-col gap-2 pb-2">
                  {digest.mismatches.map((m) => (
                    <li key={m.id}>
                      <Link href={`/history/${m.id}`} className="flex items-center justify-between gap-3 rounded-aurion border border-red-200 bg-red-50/80 p-2.5">
                        <span className="text-[13px] text-red-900">
                          {t(m.hotelK)} · {t(m.shiftK)} · {m.outgoing_name}
                          <br />
                          <span className="text-ink-soft">{t("digestExpected")} {sar(m.expected)} → {t("digestCounted")} {sar(m.counted)}</span>
                        </span>
                        <span className="font-bold text-red-700">{sar(m.variance)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </IndicatorRow>

              <IndicatorRow label={t("digestIndFlags")} value={String(digest.flags.length)} flag={digest.flags.length > 0} expanded={open === "flags"} onToggle={() => setOpen(open === "flags" ? null : "flags")}>
                <ul className="flex flex-col gap-2 pb-2">
                  {digest.flags.map((f) => (
                    <li key={f.id}>
                      <Link href={`/history/${f.id}`} className="block rounded-aurion border border-line bg-paper-tint p-2.5">
                        <span className="text-[13px] font-bold text-ink">{t(f.hotelK)} · {t(f.shiftK)} · {f.outgoing_name}</span>
                        {f.fields.map((fl) => (
                          <span key={fl.labelK} className="mt-1 block text-[13px] text-ink-soft">
                            <span className="font-medium text-ink">{t(fl.labelK)}:</span> {fl.text}
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
      </div>
    </div>
  );
}

function IndicatorRow({ label, value, flag, expanded, onToggle, children }: {
  label: string; value: string; flag?: boolean; expanded: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div>
      <button type="button" onClick={onToggle} aria-expanded={expanded} className="flex min-h-[44px] w-full items-center justify-between gap-2 py-1 text-start">
        <span className="flex items-center gap-2 text-[14px] font-medium text-ink">
          <span className={`transition-transform ${expanded ? "rotate-90" : ""}`}>›</span>
          {label}
        </span>
        <span className={`text-[14px] font-bold ${flag ? "text-red-700" : "text-ink-soft"}`}>{value}</span>
      </button>
      {expanded ? <div className="px-1">{children}</div> : null}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `npx --no-install tsc --noEmit && npx --no-install eslint app/widgets/HandoversPanel.tsx`
Expected: exit 0, no lint errors.

- [ ] **Step 3: Commit**

```bash
git add app/widgets/HandoversPanel.tsx
git commit -m "Add HandoversPanel (scope-aware polished digest)" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Cash, Occupancy, Issues, Week panels

**Files:**
- Create: `app/widgets/CashPanel.tsx`, `app/widgets/OccupancyPanel.tsx`, `app/widgets/IssuesPanel.tsx`, `app/widgets/WeekPanel.tsx`

For snapshot-based panels (Cash, Occupancy), reuse `propertySnapshots`/`dashboardTotals` from `lib/manager.ts`. Read its exports first. `propertySnapshots(rows)` returns one entry per property in `PROPERTIES` with `{ slug, totalRooms, roomsOccupied, occupancyPct, cashInDrawer, count, latest }`. For hotel scope, filter the result to the matching slug.

- [ ] **Step 1: CashPanel (admin only — portfolio)**

Create `app/widgets/CashPanel.tsx`:

```tsx
"use client";

import { useLang } from "@/lib/i18n";
import { translate, type StringKey } from "@/lib/strings";
import { propertySnapshots, dashboardTotals } from "@/lib/manager";
import { riyadhToday, addDays } from "@/lib/riyadhDate";
import type { WidgetScope } from "@/lib/homeWidgets";
import { useScopedHandovers } from "./useScopedHandovers";

function sar(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `SAR ${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
const propK = (slug: string): StringKey => (slug === "al_aqeeq" ? "propAlAqeeq" : "propAsSalaam");

export function CashPanel({ scope }: { scope: WidgetScope }) {
  const { lang } = useLang();
  const t = (k: StringKey) => translate(k, lang);
  // Snapshot = latest completed state; query a recent window to capture the latest.
  const today = riyadhToday();
  const { rows, error } = useScopedHandovers(
    scope,
    { fromDate: addDays(today, -30), toDate: today },
    "widget-cash",
  );

  if (rows === null) return <p className="text-[14px] text-ink-soft">{t("widgetLoading")}</p>;
  if (error) return <p className="text-[14px] text-red-700">{t("widgetError")}</p>;

  const snaps = propertySnapshots(rows);
  const totals = dashboardTotals(snaps);

  return (
    <div>
      <h2 className="text-[15px] font-bold text-ink">{t("widgetCashInDrawer")}</h2>
      <p className="mt-2 text-[28px] font-bold leading-tight text-ink">{sar(totals.cashInDrawer)}</p>
      <p className="text-[13px] text-ink-soft">{t("widgetPortfolioTotal")}</p>
      <ul className="mt-3 flex flex-col divide-y divide-line/70 border-t border-line/70">
        {snaps.map((s) => (
          <li key={s.slug} className="flex items-center justify-between py-2 text-[14px]">
            <span className="text-ink">{t(propK(s.slug))}</span>
            <span className="font-bold text-ink">{sar(s.cashInDrawer)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: OccupancyPanel**

Create `app/widgets/OccupancyPanel.tsx`:

```tsx
"use client";

import { useLang } from "@/lib/i18n";
import { translate, type StringKey } from "@/lib/strings";
import { propertySnapshots, dashboardTotals } from "@/lib/manager";
import { riyadhToday, addDays } from "@/lib/riyadhDate";
import type { WidgetScope } from "@/lib/homeWidgets";
import { useScopedHandovers } from "./useScopedHandovers";

const propK = (slug: string): StringKey => (slug === "al_aqeeq" ? "propAlAqeeq" : "propAsSalaam");

export function OccupancyPanel({ scope }: { scope: WidgetScope }) {
  const { lang } = useLang();
  const t = (k: StringKey) => translate(k, lang);
  const today = riyadhToday();
  const { rows, error } = useScopedHandovers(
    scope,
    { fromDate: addDays(today, -30), toDate: today },
    "widget-occupancy",
  );

  if (rows === null) return <p className="text-[14px] text-ink-soft">{t("widgetLoading")}</p>;
  if (error) return <p className="text-[14px] text-red-700">{t("widgetError")}</p>;

  const allSnaps = propertySnapshots(rows);
  const snaps = scope.kind === "hotel" ? allSnaps.filter((s) => s.slug === scope.slug) : allSnaps;
  const totals = dashboardTotals(snaps);

  return (
    <div>
      <h2 className="text-[15px] font-bold text-ink">{t("widgetOccupancyPct")}</h2>
      <p className="mt-2 text-[28px] font-bold leading-tight text-ink">{totals.occupancyPct}%</p>
      <p className="text-[13px] text-ink-soft">
        {totals.roomsOccupied} / {totals.totalRooms} {t("widgetRoomsOccupied")}
      </p>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-line">
        <div className="h-full rounded-full bg-gold transition-all duration-500" style={{ width: `${totals.occupancyPct}%` }} />
      </div>
      <ul className="mt-3 flex flex-col divide-y divide-line/70 border-t border-line/70">
        {snaps.map((s) => (
          <li key={s.slug} className="flex items-center justify-between py-2 text-[14px]">
            <span className="text-ink">{t(propK(s.slug))}</span>
            <span className="font-bold text-ink">
              {s.roomsOccupied === null ? "—" : `${s.roomsOccupied} / ${s.totalRooms}`}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 3: IssuesPanel (last 7 days)**

Create `app/widgets/IssuesPanel.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useLang } from "@/lib/i18n";
import { translate, type StringKey } from "@/lib/strings";
import { openIssues, type OpenIssue, type WidgetScope } from "@/lib/homeWidgets";
import { riyadhToday, addDays } from "@/lib/riyadhDate";
import { useScopedHandovers } from "./useScopedHandovers";

const KIND_K: Record<OpenIssue["kind"], StringKey> = {
  maintenance: "widgetIssueMaintenance",
  pending: "widgetIssuePending",
  variance: "widgetIssueVariance",
};

export function IssuesPanel({ scope }: { scope: WidgetScope }) {
  const { lang } = useLang();
  const t = (k: StringKey) => translate(k, lang);
  const today = riyadhToday();
  const { rows, error } = useScopedHandovers(
    scope,
    { fromDate: addDays(today, -6), toDate: today },
    "widget-issues",
  );

  if (rows === null) return <p className="text-[14px] text-ink-soft">{t("widgetLoading")}</p>;
  if (error) return <p className="text-[14px] text-red-700">{t("widgetError")}</p>;

  const issues = openIssues(rows);

  return (
    <div>
      <h2 className="text-[15px] font-bold text-ink">{t("widgetIssues")}</h2>
      {issues.length === 0 ? (
        <p className="mt-3 text-[14px] text-ink-soft">{t("widgetIssuesNone")}</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {issues.map((it, i) => (
            <li key={`${it.id}-${it.kind}-${i}`}>
              <Link href={`/history/${it.id}`} className="block rounded-aurion border border-line bg-paper-tint p-2.5">
                <span className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-bold text-ink">{t(KIND_K[it.kind])}</span>
                  <span className="text-[11px] text-muted" dir="ltr">{it.shift_date}</span>
                </span>
                <span className="mt-0.5 block text-[12px] text-ink-soft">{t(it.hotelK)} · {t(it.shiftK)} · {it.outgoing_name}</span>
                <span className="mt-1 block text-[13px] text-ink">{it.text}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 4: WeekPanel (admin only)**

Create `app/widgets/WeekPanel.tsx`:

```tsx
"use client";

import { useLang } from "@/lib/i18n";
import { translate, type StringKey } from "@/lib/strings";
import { weekStats } from "@/lib/manager";
import { riyadhToday, addDays } from "@/lib/riyadhDate";
import type { WidgetScope } from "@/lib/homeWidgets";
import { useScopedHandovers } from "./useScopedHandovers";

function sar(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `SAR ${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function WeekPanel({ scope }: { scope: WidgetScope }) {
  const { lang } = useLang();
  const t = (k: StringKey) => translate(k, lang);
  const today = riyadhToday();
  const { rows, error } = useScopedHandovers(
    scope,
    { fromDate: addDays(today, -6), toDate: today },
    "widget-week",
  );

  if (rows === null) return <p className="text-[14px] text-ink-soft">{t("widgetLoading")}</p>;
  if (error) return <p className="text-[14px] text-red-700">{t("widgetError")}</p>;

  const stats = weekStats(rows);

  return (
    <div>
      <h2 className="text-[15px] font-bold text-ink">{t("widgetWeekTitle")}</h2>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <Stat label={t("widgetWeekHandovers")} value={String(stats.count)} />
        <Stat label={t("widgetWeekVariance")} value={sar(stats.totalVariance)} flag={Math.abs(stats.totalVariance) > 0.005} />
        <Stat label={t("widgetWeekMismatches")} value={String(stats.mismatches)} flag={stats.mismatches > 0} />
      </div>
    </div>
  );
}

function Stat({ label, value, flag }: { label: string; value: string; flag?: boolean }) {
  return (
    <div className="glass-cream rounded-aurion px-3 py-3">
      <p className="text-[12px] text-ink-soft">{label}</p>
      <p className={`mt-1 text-[16px] font-bold ${flag ? "text-red-700" : "text-ink"}`}>{value}</p>
    </div>
  );
}
```

- [ ] **Step 5: Typecheck + lint all four**

Run: `npx --no-install tsc --noEmit && npx --no-install eslint app/widgets/CashPanel.tsx app/widgets/OccupancyPanel.tsx app/widgets/IssuesPanel.tsx app/widgets/WeekPanel.tsx`
Expected: exit 0, no lint errors. If `glass-cream` doesn't exist, check globals.css and substitute the real class (e.g. `glass`); report it.

- [ ] **Step 6: Commit**

```bash
git add app/widgets/CashPanel.tsx app/widgets/OccupancyPanel.tsx app/widgets/IssuesPanel.tsx app/widgets/WeekPanel.tsx
git commit -m "Add Cash, Occupancy, Issues, Week widget panels" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: WidgetSwitcher shell (glass pill tabs)

**Files:**
- Create: `app/widgets/WidgetSwitcher.tsx`

- [ ] **Step 1: Implement**

Create `app/widgets/WidgetSwitcher.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useLang } from "@/lib/i18n";
import { translate, type StringKey } from "@/lib/strings";
import {
  tabsForRole,
  type Role,
  type WidgetKey,
  type WidgetScope,
} from "@/lib/homeWidgets";
import { HandoversPanel } from "./HandoversPanel";
import { CashPanel } from "./CashPanel";
import { OccupancyPanel } from "./OccupancyPanel";
import { IssuesPanel } from "./IssuesPanel";
import { WeekPanel } from "./WeekPanel";

export function WidgetSwitcher({ role, scope }: { role: Role; scope: WidgetScope }) {
  const { lang } = useLang();
  const t = (k: StringKey) => translate(k, lang);
  const tabs = tabsForRole(role);
  const [active, setActive] = useState<WidgetKey>(tabs[0].key);

  function renderPanel() {
    switch (active) {
      case "handovers": return <HandoversPanel scope={scope} />;
      case "cash": return <CashPanel scope={scope} />;
      case "occupancy": return <OccupancyPanel scope={scope} />;
      case "issues": return <IssuesPanel scope={scope} />;
      case "week": return <WeekPanel scope={scope} />;
    }
  }

  return (
    <section className="glass rounded-aurion p-4">
      {/* Glass pill tab bar */}
      <div className="mb-4 flex gap-1 overflow-x-auto rounded-full bg-line/60 p-1">
        {tabs.map((tab) => {
          const on = active === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              aria-pressed={on}
              onClick={() => setActive(tab.key)}
              className={[
                "min-h-[40px] shrink-0 rounded-full px-4 text-[13px] font-bold transition-colors",
                on
                  ? "border-2 border-gold bg-paper text-ink shadow-sm"
                  : "border-2 border-transparent text-ink-soft",
              ].join(" ")}
            >
              {t(tab.labelK)}
            </button>
          );
        })}
      </div>
      {renderPanel()}
    </section>
  );
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `npx --no-install tsc --noEmit && npx --no-install eslint app/widgets/WidgetSwitcher.tsx`
Expected: exit 0, no lint errors.

- [ ] **Step 3: Commit**

```bash
git add app/widgets/WidgetSwitcher.tsx
git commit -m "Add WidgetSwitcher shell with glass pill tabs" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: Wire into AdminHome + ReceptionistHome + page.tsx, remove DailyDigestCard

**Files:**
- Modify: `app/AdminHome.tsx`
- Modify: `app/ReceptionistHome.tsx`
- Modify: `app/page.tsx`
- Delete: `app/DailyDigestCard.tsx`

- [ ] **Step 1: AdminHome — swap card for switcher**

In `app/AdminHome.tsx`, replace the import:

```tsx
import { DailyDigestCard } from "./DailyDigestCard";
```

with:

```tsx
import { WidgetSwitcher } from "./widgets/WidgetSwitcher";
```

and replace `<DailyDigestCard />` with:

```tsx
      <WidgetSwitcher role="admin" scope={{ kind: "portfolio" }} />
```

- [ ] **Step 2: page.tsx — resolve receptionist slug + pass props**

In `app/page.tsx`, the receptionist branch fetches `propertyId`. After that, resolve the property code. Find the block that fetches `mineRaw` and, before the `return`, add a lookup. Modify the receptionist return to pass slug+propertyId. Concretely, in the receptionist branch add:

```tsx
  // Resolve the receptionist's hotel slug (properties.code) for the widget switcher.
  let propSlug: string | null = null;
  if (propertyId) {
    const { data: prop } = await db
      .from("properties")
      .select("code")
      .eq("id", propertyId)
      .maybeSingle();
    propSlug = prop?.code ?? null;
  }
```

and change the `<ReceptionistHome ... />` usage to also pass:

```tsx
      <ReceptionistHome
        myName={name}
        pending={(pending ?? []) as unknown as MyHandover[]}
        mine={(mineRaw ?? []) as unknown as MyHandover[]}
        propertyId={propertyId ?? null}
        propSlug={propSlug}
      />
```

- [ ] **Step 3: ReceptionistHome — accept props + render switcher**

In `app/ReceptionistHome.tsx`, extend the props type and signature:

```tsx
export function ReceptionistHome({
  myName,
  pending,
  mine,
  propertyId,
  propSlug,
}: {
  myName: string;
  pending: MyHandover[];
  mine: MyHandover[];
  propertyId: string | null;
  propSlug: string | null;
}) {
```

Add the import at the top:

```tsx
import { WidgetSwitcher } from "./widgets/WidgetSwitcher";
```

Then as the FIRST child inside the `<main ...>` (before the pending section), add:

```tsx
      {propertyId && propSlug ? (
        <WidgetSwitcher
          role="receptionist"
          scope={{ kind: "hotel", slug: propSlug, propertyId }}
        />
      ) : null}
```

- [ ] **Step 4: Delete the old card**

```bash
git rm app/DailyDigestCard.tsx
```

- [ ] **Step 5: Typecheck + lint + build**

Run: `npx --no-install tsc --noEmit && npx --no-install eslint app/AdminHome.tsx app/ReceptionistHome.tsx app/page.tsx`
Expected: exit 0, no errors. Confirm no remaining references to DailyDigestCard: `grep -rn "DailyDigestCard" app lib` returns nothing.

Run: `npm run build`
Expected: "Compiled successfully", no errors. (Do NOT run the dev server.)

- [ ] **Step 6: Commit**

```bash
git add app/AdminHome.tsx app/ReceptionistHome.tsx app/page.tsx
git commit -m "Wire WidgetSwitcher into admin + receptionist home, remove DailyDigestCard" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: Final verification

- [ ] **Step 1: Run all logic tests**

Run: `node --experimental-strip-types lib/dailyDigest.test.mjs && node --experimental-strip-types lib/homeWidgets.test.mjs`
Expected: "16 assertions passed" then "5 assertions passed".

- [ ] **Step 2: Full typecheck + lint + build**

Run: `npx --no-install tsc --noEmit && npx --no-install eslint && npm run build`
Expected: tsc exit 0; eslint 0 errors (warnings in `.remember/` scratch files are unrelated, ignore); build "Compiled successfully".

- [ ] **Step 3: Manual review (no localhost)**

Confirm by reading code/build output only:
- Admin home renders `<WidgetSwitcher role="admin" scope={portfolio}>` with 5 tabs; first tab = handovers digest.
- Receptionist home renders the switcher (when they have a hotel) with 3 tabs, scoped to their hotel.
- Tabs are glass pills; active = gold border + paper bg.
- Each panel links into `/history/[id]` where applicable.

NOTE for the user: real-device check (iPhone + Android, EN + AR/RTL, tab switching) on the deployed build remains the user's step — not localhost.

---

## Self-review notes

- **Spec coverage:** glass pill tabs ✓ (Task 7), role-tailored tab sets ✓ (Task 2 ADMIN_TABS/RECEPTIONIST_TABS + Task 7), 5 panels ✓ (Tasks 5–6), hotel vs portfolio scope ✓ (WidgetScope + slugFilter Task 1 + panel filtering), receptionist hotel-only ✓ (page.tsx slug resolution Task 8), issues last-7-days ✓ (Task 6 Step 3 uses addDays(today,-6)), polish (accent bar + large number + pills) ✓ (Tasks 5,7), DailyDigestCard removed ✓ (Task 8), realtime ✓ (useScopedHandovers Task 4), EN/AR strings ✓ (Task 3), tests ✓ (Tasks 1,2).
- **Type consistency:** `WidgetScope` defined once (Task 2), imported by hook (Task 4) + all panels (5,6) + switcher (7). `buildDailyDigest(rows, date, now, slugFilter?)` signature consistent Tasks 1 & 5. `Role`/`WidgetKey`/`WidgetTab`/`tabsForRole`/`openIssues`/`OpenIssue` all defined in Task 2, consumed in 6,7. `useScopedHandovers(scope, filter, channelName)` defined Task 4, called identically in all panels. Panels all take `{ scope }`. `propertySnapshots`/`dashboardTotals`/`weekStats` are existing exports (verified in lib/manager.ts).
- **Placeholder scan:** none — every code step shows full code.
- **Risk flagged:** `glass-cream` class (Task 6 Step 4) — used by the existing manager dashboard `Stat`, so it exists; instruction to substitute if not is a safety net, not a placeholder. `IssuesPanel` key uses `${id}-${kind}-${i}` because one row can yield multiple issue kinds (id alone not unique).
