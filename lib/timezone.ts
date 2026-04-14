// Malaysia timezone: UTC+8
const MYT_OFFSET = "+08:00";
const MYT_OFFSET_MS = 8 * 60 * 60 * 1000;

/**
 * Create a Date object representing a specific hour on a date in Malaysia time.
 * Stored as ISO string with correct UTC offset.
 * e.g. toMYT("2026-04-15", 10) => "2026-04-15T10:00:00+08:00" => UTC: 02:00
 */
export function toMYTISOString(date: string, hour: number): string {
  return `${date}T${String(hour).padStart(2, "0")}:00:00${MYT_OFFSET}`;
}

/**
 * Get the Malaysia hour (0-23) from a timestamptz string.
 * Works regardless of how the timestamp is stored (UTC or with offset).
 */
export function getMYTHour(timestamp: string): number {
  const d = new Date(timestamp);
  // Convert UTC ms to Malaysia ms, then extract hours
  const mytMs = d.getTime() + MYT_OFFSET_MS;
  return new Date(mytMs).getUTCHours();
}

/**
 * Get the Malaysia date string (YYYY-MM-DD) from a timestamptz string.
 */
export function getMYTDateStr(timestamp: string): string {
  const d = new Date(timestamp);
  const mytMs = d.getTime() + MYT_OFFSET_MS;
  return new Date(mytMs).toISOString().split("T")[0];
}

/**
 * Get today's date string in Malaysia time.
 */
export function getTodayMYT(): string {
  return getMYTDateStr(new Date().toISOString());
}
