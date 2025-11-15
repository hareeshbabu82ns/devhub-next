/**
 * Panchangam utility functions for date and timezone handling
 */

/**
 * Get the current date in a specific timezone
 * @param timeZone - IANA timezone string (e.g., "Asia/Kolkata", "America/Edmonton")
 * @returns Date object representing today in the specified timezone
 */
export function getTodayInTimezone(timeZone: string): Date {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });

  const parts = formatter.formatToParts(new Date());
  const day = parseInt(parts.find((p) => p.type === "day")?.value || "1", 10);
  const month = parseInt(
    parts.find((p) => p.type === "month")?.value || "1",
    10,
  );
  const year = parseInt(
    parts.find((p) => p.type === "year")?.value || "2025",
    10,
  );

  return new Date(year, month - 1, day);
}

/**
 * Format a date to DD/MM/YYYY string in a specific timezone
 * @param date - The date to format
 * @param timeZone - IANA timezone string
 * @returns Formatted date string in DD/MM/YYYY format
 */
export function formatDateInTimezone(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    day: "numeric",
    month: "numeric",
    year: "numeric",
  }).formatToParts(date);

  const day = parts.find((p) => p.type === "day")?.value || "1";
  const month = parts.find((p) => p.type === "month")?.value || "1";
  const year = parts.find((p) => p.type === "year")?.value || "2025";

  return `${day}/${month}/${year}`;
}

/**
 * Get the timezone for a specific place
 * @param placeId - Place identifier (e.g., "calgary", "tirupati")
 * @param defaultTimezone - Default timezone to use if place not found
 * @returns IANA timezone string
 */
export function getPlaceTimezone(
  placeId: string,
  timezones: Record<string, string>,
  defaultTimezone?: string,
): string {
  return (
    timezones[placeId] ||
    defaultTimezone ||
    Intl.DateTimeFormat().resolvedOptions().timeZone
  );
}
