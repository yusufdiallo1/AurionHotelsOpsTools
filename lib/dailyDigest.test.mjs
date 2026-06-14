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
