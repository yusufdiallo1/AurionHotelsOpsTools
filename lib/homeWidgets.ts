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
      issues.push({ ...base, kind: "variance", text: note || `${r.cash_variance ?? 0}` });
    }
  }
  const order = new Map(completed.map((r) => [r.id, r.created_at ?? ""]));
  return issues.sort((a, b) =>
    (order.get(b.id) ?? "").localeCompare(order.get(a.id) ?? ""),
  );
}
