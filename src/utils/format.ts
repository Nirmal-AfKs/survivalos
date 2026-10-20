/**
 * Utility helpers for clean editorial typography and chunked task titles
 */

/**
 * Strips any existing '(Part X of Y)', '(chunk X of Y)' and duration suffixes like '— 45m'
 */
export function cleanTaskTitle(title: string | undefined | null): string {
  if (!title) return '';
  return title
    .replace(/\s*\((?:Part|chunk)\s+\d+\s+of\s+\d+\)/gi, '')
    .replace(/\s*—\s*\d+h(\s*\d+m)?|\s*—\s*\d+m/gi, '')
    .trim();
}

/**
 * Ensures '(Part X of Y)' only renders once when a task has multiple chunks
 */
export function formatChunkTitle(
  title: string | undefined | null,
  chunkNumber?: number,
  totalChunks?: number
): string {
  const base = cleanTaskTitle(title);
  if (totalChunks && totalChunks > 1 && chunkNumber) {
    return `${base} (Part ${chunkNumber} of ${totalChunks})`;
  }
  return base;
}

export interface WeekDayOption {
  label: string; // 'M', 'T', 'W', 'T', 'F', 'S', 'S'
  dayIndex: number; // 1, 2, 3, 4, 5, 6, 0 (matches JS Date.getDay())
  shortName: string; // 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'
  fullName: string;
}

/**
 * 7 circular day-pill toggles in Mon-Sun order: [M] [T] [W] [T] [F] [S] [S]
 */
export const RECURRING_WEEK_DAYS: WeekDayOption[] = [
  { label: 'M', dayIndex: 1, shortName: 'Mon', fullName: 'Monday' },
  { label: 'T', dayIndex: 2, shortName: 'Tue', fullName: 'Tuesday' },
  { label: 'W', dayIndex: 3, shortName: 'Wed', fullName: 'Wednesday' },
  { label: 'T', dayIndex: 4, shortName: 'Thu', fullName: 'Thursday' },
  { label: 'F', dayIndex: 5, shortName: 'Fri', fullName: 'Friday' },
  { label: 'S', dayIndex: 6, shortName: 'Sat', fullName: 'Saturday' },
  { label: 'S', dayIndex: 0, shortName: 'Sun', fullName: 'Sunday' },
];

/**
 * Format recurring days cleanly (e.g. "Mon, Wed" or "Weekdays" or "Weekends")
 */
export function formatRecurringDaysShort(days: number[] | undefined | null): string {
  if (!days || days.length === 0) return '';
  if (days.length === 7) return 'Every Day';
  
  // Check weekdays (Mon-Fri)
  const isWeekdays = days.length === 5 && [1, 2, 3, 4, 5].every(d => days.includes(d));
  if (isWeekdays) return 'Weekdays';

  // Check weekends (Sat, Sun)
  const isWeekends = days.length === 2 && [0, 6].every(d => days.includes(d));
  if (isWeekends) return 'Weekends';

  // Sort by visual week order (Mon -> Sun: 1, 2, 3, 4, 5, 6, 0)
  const orderMap: Record<number, number> = { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 0: 7 };
  const sorted = [...days].sort((a, b) => (orderMap[a] ?? a) - (orderMap[b] ?? b));

  const names: Record<number, string> = {
    0: 'Sun',
    1: 'Mon',
    2: 'Tue',
    3: 'Wed',
    4: 'Thu',
    5: 'Fri',
    6: 'Sat',
  };

  return sorted.map(d => names[d] || '').filter(Boolean).join(', ');
}

/**
 * Check if a life event occurs on a target date (supports weekly recurrence and one-time events)
 */
export function isEventOnDate(
  event: { date: string; recurringDays?: number[] },
  targetDate: Date | string
): boolean {
  if (event.recurringDays && event.recurringDays.length > 0) {
    let dayOfWeek: number;
    if (typeof targetDate === 'string') {
      const parts = targetDate.split('-').map(Number);
      if (parts.length === 3 && !isNaN(parts[0])) {
        // Construct local date without timezone offset issues
        dayOfWeek = new Date(parts[0], parts[1] - 1, parts[2]).getDay();
      } else {
        dayOfWeek = new Date().getDay();
      }
    } else {
      dayOfWeek = targetDate.getDay();
    }
    return event.recurringDays.includes(dayOfWeek);
  }

  // One-time event check
  const dateStr = typeof targetDate === 'string'
    ? targetDate
    : `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;
  return event.date === dateStr;
}
