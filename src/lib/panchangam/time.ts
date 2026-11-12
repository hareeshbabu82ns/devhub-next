/**
 * Time helpers shared by the panchangam scraper (server) and UI (client).
 *
 * Drik Panchang renders times in 24h local time of the place. Times past
 * midnight carry the next day's date as a suffix, e.g. "05:47, Nov 13".
 * We convert these to "minutes since local midnight of the selected date",
 * so next-day times become >= 1440 and everything sorts on one axis.
 */

export interface ParsedTime {
  /** "HH:mm" display string (without the date suffix) */
  time: string;
  /** minutes from midnight of the selected date (>= 1440 when next day) */
  min: number;
  nextDay: boolean;
}

const TIME_RE = /^(\d{1,2}):(\d{2})(?:\s*,\s*([A-Za-z]{3,}\s+\d{1,2}))?$/;

/** Remove info icons, nbsp and collapse whitespace from scraped text */
export function cleanText(value: string | undefined | null): string {
  return (value ?? "")
    .replace(/[ⓘ ​]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Parse "HH:mm" or "HH:mm, Mon DD" into minutes. Returns null if not a time. */
export function parseTime(raw: string | undefined | null): ParsedTime | null {
  const value = cleanText(raw);
  const m = TIME_RE.exec(value);
  if (!m) return null;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  const nextDay = Boolean(m[3]);
  return {
    time: `${String(hour).padStart(2, "0")}:${m[2]}`,
    min: hour * 60 + minute + (nextDay ? 1440 : 0),
    nextDay,
  };
}

/** Parse "HH:mm[, Mon DD] to HH:mm[, Mon DD]" into a range. */
export function parseTimeRange(
  raw: string,
): { start: ParsedTime; end: ParsedTime } | null {
  const parts = cleanText(raw).split(/\s+to\s+/);
  if (parts.length !== 2) return null;
  const start = parseTime(parts[0]);
  const end = parseTime(parts[1]);
  if (!start || !end) return null;
  // Guard: an end earlier than start without a suffix means it rolled over
  if (end.min < start.min) end.min += 1440;
  return { start, end };
}

/** Minutes -> "HH:mm" (wraps past midnight) */
export function minToTime(min: number): string {
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/** Human duration, e.g. "1h 24m" */
export function formatDuration(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

/** Current hour/minute and civil date in an IANA timezone */
export function nowInTimezone(timeZone: string, at: Date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(at);
  const get = (t: string) =>
    parseInt(parts.find((p) => p.type === t)?.value || "0", 10);
  const hour = get("hour") % 24; // some engines emit "24" at midnight
  const minute = get("minute");
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour,
    minute,
    minutes: hour * 60 + minute,
  };
}

/** Short timezone name such as "MST" or "GMT+5:30" */
export function timezoneAbbr(timeZone: string, at: Date = new Date()): string {
  try {
    return (
      new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "short" })
        .formatToParts(at)
        .find((p) => p.type === "timeZoneName")?.value ?? timeZone
    );
  } catch {
    return timeZone;
  }
}
