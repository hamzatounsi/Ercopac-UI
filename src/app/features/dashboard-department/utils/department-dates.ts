/** Date helpers for the My Department workspace. Dates from the API are ISO "YYYY-MM-DD" strings (local days). */

export function isoDay(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function todayIso(): string {
  return isoDay(new Date());
}

/** Monday and Sunday of the current week. */
export function currentWeek(): { start: string; end: string } {
  const today = new Date();
  const offset = (today.getDay() + 6) % 7;
  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - offset);
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
  return { start: isoDay(monday), end: isoDay(sunday) };
}

/** True when [start, end] overlaps [from, to]; all bounds inclusive ISO days. */
export function overlaps(start: string | null | undefined, end: string | null | undefined, from: string, to: string): boolean {
  if (!start) {
    return false;
  }
  const finish = end || start;
  return start <= to && finish >= from;
}

/** Calendar days between two ISO days, both included. */
export function daysInclusive(start: string, end: string): number {
  const [sy, sm, sd] = start.split('-').map(Number);
  const [ey, em, ed] = end.split('-').map(Number);
  const ms = Date.UTC(ey, em - 1, ed) - Date.UTC(sy, sm - 1, sd);
  return Math.max(1, Math.round(ms / 86_400_000) + 1);
}

export function initialsOf(name: string | null | undefined): string {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) {
    return '?';
  }
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}
