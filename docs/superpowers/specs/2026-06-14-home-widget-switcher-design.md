# Home Widget Switcher — glass pill tabs

**Date:** 2026-06-14
**Status:** Approved (design)

## Goal

Replace the standalone daily-digest card on the home page with a **widget switcher**: a
glass pill segmented tab bar above a single swappable card. The handover digest becomes
the first tab and gets a visual polish. Tabs and scope are tailored per role.

## Decisions (from brainstorming)

- **Switch UX:** glass pill segmented tabs (styled like the language tabs) above ONE
  visible card. Tap a tab → swap the panel below. One widget at a time.
- **Role-tailored tabs:**
  - **Admin** (portfolio, both hotels): `Handovers` · `Cash` · `Occupancy` · `Issues` · `Week`
  - **Receptionist** (their hotel only): `Handovers` · `Issues` · `Occupancy`
  - Cash + Week are **admin-only**.
- **Receptionist scope:** their own hotel only.
- **Issues window:** last 7 days of open items (maintenance issues, pending requests,
  cash variances), not just today.
- **Tab labels:** short single words (`Handovers / Cash / Occupancy / Issues / Week`).
- **Selected tab persistence:** component state only (resets on reload). No cookie (YAGNI).

## Scope model

A panel renders for one of two scopes, passed as a prop:

```ts
type WidgetScope =
  | { kind: "portfolio" }                          // admin — both hotels
  | { kind: "hotel"; slug: PropertySlug; propertyId: string }; // receptionist — one hotel
```

`page.tsx` already has the receptionist's `property_id` (UUID). The server resolves its
`code` (= `PropertySlug`) from the `properties` table and passes both into
`ReceptionistHome` → `WidgetSwitcher`. (`properties.code` === `PROPERTIES[].slug`, an
established convention — see `app/manager/ManagerDashboard.tsx`.)

## Architecture

### Shared shell

- `app/widgets/WidgetSwitcher.tsx` (client) — the glass pill tab bar + active-tab state.
  Props: `{ scope: WidgetScope; role: "admin" | "receptionist" }`. Picks the tab list
  from `lib/homeWidgets.ts` and renders ONLY the active panel.

  Data ownership: each panel owns its own fetch + its own `useHandoverRealtime`
  subscription (debounced), exactly like the current `DailyDigestCard`. Because the
  switcher mounts only the active panel, only one subscription runs at a time. This
  trades a tiny re-subscribe on tab change for clean panel isolation — acceptable, and
  avoids a tangled shared-fetch layer.

- `lib/homeWidgets.ts` (pure) — tab configuration + any new pure selectors:
  ```ts
  export type WidgetKey = "handovers" | "cash" | "occupancy" | "issues" | "week";
  export type WidgetTab = { key: WidgetKey; labelK: StringKey };
  export const ADMIN_TABS: WidgetTab[];          // 5 tabs
  export const RECEPTIONIST_TABS: WidgetTab[];   // 3 tabs (handovers, issues, occupancy)
  export function tabsForRole(role): WidgetTab[];
  // New selector (others reused from lib/manager.ts / lib/dailyDigest.ts):
  export type OpenIssue = {
    id: string; hotelK: StringKey; shiftK: StringKey; shift_date: string;
    outgoing_name: string; kind: "maintenance" | "pending" | "variance"; text: string;
  };
  export function openIssues(rows: ManagerRow[]): OpenIssue[]; // newest first
  ```

### Panels (each in app/widgets/, one responsibility)

All panels take `{ scope: WidgetScope }`. Each fetches handovers it needs, scoping by
`property_id` (hotel scope) or all (portfolio), recomputes via pure selectors, and
subscribes to realtime. All use existing glass tokens, ≥44px targets, Western numerals,
EN/AR.

1. `HandoversPanel.tsx` — the polished digest. Refactor of the current
   `DailyDigestCard` body: title + Riyadh date stepper + status accent/dot + "X of N
   submitted" + 3 expandable indicators (submissions, mismatches, flagged notes). For
   hotel scope, `buildDailyDigest` is filtered to the one hotel → expected = 3.
   **Requires** a scope-aware digest: extend `buildDailyDigest` to accept an optional
   `slugFilter?: PropertySlug` (when set, only that hotel's cells/rows count). Default
   (undefined) = portfolio (current behavior, all tests still pass).
2. `CashPanel.tsx` (admin only) — per-hotel cash in drawer + portfolio total via
   `propertySnapshots` + `dashboardTotals`. Snapshot query = latest completed per hotel.
3. `OccupancyPanel.tsx` — rooms occupied / total + gold progress bar. Portfolio: both
   hotels + portfolio %. Hotel: that hotel only. Via `propertySnapshots`.
4. `IssuesPanel.tsx` — `openIssues(rows)` over the last 7 days (use `isoDaysBefore`),
   each item links to `/history/[id]`. Hotel scope filters to the one property.
5. `WeekPanel.tsx` (admin only) — `weekStats` over last 7 days: handovers count, total
   variance, mismatch count. Three stat tiles.

### Visual polish (the "look better" part)

- Glass pill tab bar: rounded-full container `bg-line/60 p-1`; active pill =
  `bg-paper shadow-sm` + 2px gold ring + bold ink label; inactive = `text-ink-soft`.
  (Mirror of the manager `ScopeToggle`, upgraded with the gold ring from the design
  tokens.) Tabs scroll horizontally if they overflow on narrow screens.
- Card: cleaner header, a colored LEFT accent bar keyed to status (digest only), the
  primary number rendered large (`text-[28px] font-bold`), tighter secondary text.
- Tabs mirror correctly in RTL (flex row reverses with `dir`).

### Wiring

- `AdminHome`: replace `<DailyDigestCard />` with
  `<WidgetSwitcher role="admin" scope={{ kind: "portfolio" }} />`.
- `ReceptionistHome`: add `<WidgetSwitcher role="receptionist" scope={{ kind: "hotel", slug, propertyId }} />`
  as the first child. Requires `page.tsx` to pass `slug` + `propertyId`.
- `page.tsx`: resolve the receptionist's property `code` (slug) from `property_id` and
  pass both into `ReceptionistHome`. If the receptionist has no `property_id`, render
  `ReceptionistHome` without the switcher (graceful).
- `DailyDigestCard.tsx` is removed (its logic moves into `HandoversPanel`).

## Data flow

Each panel: mount → fetch scoped rows from `handovers` (joined `properties`) → pure
selector → render. Realtime upsert → debounced refetch. Only the active panel is
mounted, so only one subscription runs.

## Error / empty / loading states

Every panel: loading (skeleton or "Loading…"), error ("Couldn't load"), empty
("No data" / "No handovers expected" / "No open issues"). Same pattern as the current
card.

## Testing

- Extend `lib/dailyDigest.test.mjs`: `buildDailyDigest` with `slugFilter` → only that
  hotel's 3 shifts count (expected = 3); portfolio behavior unchanged (existing 13 pass).
- New `lib/homeWidgets.test.mjs`: `openIssues` extracts maintenance/pending/variance
  from rows, newest first, skips empty fields; `tabsForRole` returns the right tab sets.
- Typecheck + eslint + `npm run build` (NO dev server / localhost — hard rule).
- Manual (user, on a phone): both roles, EN + AR/RTL, tab switching, links open detail.

## Out of scope / YAGNI

- No carousel/swipe (chose tabs).
- No per-user tab persistence cookie.
- No new DB columns/migrations.
- No changes to `/manager` (it keeps its own dashboard).
- Week/Cash remain admin-only; not built for receptionist scope.
