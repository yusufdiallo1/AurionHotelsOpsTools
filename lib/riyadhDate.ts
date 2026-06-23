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
