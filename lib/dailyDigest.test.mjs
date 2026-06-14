// Standalone assertions. Run: node --experimental-strip-types lib/dailyDigest.test.mjs
import assert from "node:assert/strict";
// Register the `@/` alias + `.ts` resolver BEFORE importing any TS module, then
// pull the modules in dynamically (static imports would resolve too early).
import { fromRoot } from "./_tsAlias.mjs";
const { riyadhToday, riyadhYesterday, addDays } = await import(
  fromRoot("lib/riyadhDate.ts")
);

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

const { buildDailyDigest } = await import(fromRoot("lib/dailyDigest.ts"));

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

console.log(`\n${passed} assertions passed`);
