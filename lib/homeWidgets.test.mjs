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
    row("as_salaam", "morning"),
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
