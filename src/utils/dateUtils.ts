/**
 * Local-timezone date helpers for Pure Max Factory OS.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * The codebase was computing "today" as:
 *
 *     new Date().toISOString().split('T')[0]
 *
 * `toISOString()` converts to UTC first. Sierra Leone sits at UTC+0 so the bug
 * is invisible there, but any device set to a different timezone (a manager
 * travelling, a phone that kept a roaming time zone, or the factory's own
 * Freetown/Makeni devices after a DST-style offset change) gets a date that is
 * off by one. Records are stored with a LOCAL `date` (they come straight from
 * an <input type="date"> value), so "today's" totals silently miss or double
 * count a day's worth of transactions.
 *
 * Every helper here works in the device's local time zone and formats as
 * YYYY-MM-DD, matching how the records themselves are stored.
 */

/** YYYY-MM-DD in the device's LOCAL time zone. */
export function localDateKey(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Midnight at the start of `d`'s local day, as epoch milliseconds. */
export function startOfLocalDay(d: Date = new Date()): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0).getTime();
}

/** Midnight at the start of the next local day, as epoch milliseconds. */
export function startOfNextLocalDay(d: Date = new Date()): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 0, 0).getTime();
}

/** Milliseconds until the next local midnight (always > 0). */
export function msUntilNextLocalMidnight(from: Date = new Date()): number {
  return Math.max(1000, startOfNextLocalDay(from) - from.getTime());
}

/**
 * Best-effort epoch milliseconds for a stored record.
 * Prefers `createdAt`, falls back to parsing the `YYYY-MM-DD date` field at
 * local midnight. Returns NaN when neither is usable.
 */
export function recordTimestamp(record: { date?: string; createdAt?: string }): number {
  if (record?.createdAt) {
    const parsed = Date.parse(record.createdAt);
    if (!Number.isNaN(parsed)) return parsed;
  }
  if (record?.date) {
    // Parse as LOCAL midnight rather than UTC midnight, which is what
    // `new Date('YYYY-MM-DD')` would give for a date-only string.
    const [y, m, d] = record.date.split('-').map((n) => Number(n));
    if (y && m && d) return new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
  }
  return NaN;
}

/** "07:42" style local time string. */
export function localTimeString(d: Date = new Date()): string {
  return d.toTimeString().slice(0, 5);
}
