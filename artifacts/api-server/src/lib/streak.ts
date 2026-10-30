/*
 * The reading streak: days in a row on which you sorted at least one story (keep or skip),
 * counted in your own time zone. Today counts once you've sorted something; until then the
 * streak still stands if yesterday did.
 */

export const STREAK_TIME_ZONE = process.env["TIME_ZONE"] ?? "Europe/Amsterdam";

/** A moment as a calendar day (YYYY-MM-DD) in `timeZone`. */
export function localDay(date: Date, timeZone = STREAK_TIME_ZONE) {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

function previousDay(day: string) {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function streakDays(days: Iterable<string>, today: string) {
  const set = new Set(days);
  let day = set.has(today) ? today : previousDay(today);
  let streak = 0;
  while (set.has(day)) {
    streak++;
    day = previousDay(day);
  }
  return streak;
}
