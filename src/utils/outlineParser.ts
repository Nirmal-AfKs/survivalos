/**
 * Fast Course Notes & Syllabus Regex Outline Parser (100% offline, zero-asset, <250 KB)
 * Parses raw text lines with duration and optional natural deadline syntax:
 *   - 'Calculus Review - 90m @ tomorrow'
 *   - 'Lab Report 2h @ Friday'
 *   - 'Organic Chemistry (45m) @ in 3 days'
 *   - 'Machine Learning Paper Reading' (defaults to 2 days from today)
 * Slices tasks into 30m focus chunks and projects their multi-day distribution.
 */

import { formatDateKey, addDays, parseDateKey } from './scheduler';

export interface OutlineChunk {
  chunkNumber: number;
  totalChunks: number;
  durationMinutes: number;
  title: string;
  plannedDayLabel: string; // e.g. "Today", "Tomorrow", "Friday"
  plannedDate: string;     // 'YYYY-MM-DD'
}

export interface ParsedOutlineTask {
  id: string;
  rawText: string;
  title: string;
  durationMinutes: number;
  deadlineTag?: string;     // Raw string e.g. "tomorrow", "Friday", "in 3 days"
  deadlineDate: string;    // 'YYYY-MM-DD'
  relativeDays: number;    // Days from baseDate (0 = today, 1 = tomorrow, etc.)
  deadlineLabel: string;   // Clean label e.g. "Tomorrow", "Friday", "In 3 days"
  chunkCount: number;
  chunks: OutlineChunk[];
}

export interface OutlineParseResult {
  tasks: ParsedOutlineTask[];
  totalDurationMinutes: number;
  totalChunks: number;
}

const DAY_OF_WEEK_NAMES: Record<string, number> = {
  sunday: 0, sun: 0,
  monday: 1, mon: 1,
  tuesday: 2, tue: 2, tues: 2,
  wednesday: 3, wed: 3,
  thursday: 4, thu: 4, thur: 4, thurs: 4,
  friday: 5, fri: 5,
  saturday: 6, sat: 6,
};

const CAPITALIZED_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Strips list numbering, bullets, leading symbols
 */
function cleanLeadingBullets(text: string): string {
  return text
    .replace(/^[\s\t]*[•*\-+–—]\s*/, '')
    .replace(/^[\s\t]*\d+[\.\)]\s*/, '')
    .replace(/^[\s\t]*\[[\sx]?\]\s*/i, '')
    .trim();
}

/**
 * Parses natural deadline expressions like "tomorrow", "Friday", "in 3 days", "2d".
 * Default fallback: 2 days from baseDate.
 */
export function parseDeadlineString(
  rawTag: string | null | undefined, 
  baseDate: Date = new Date()
): { deadlineDate: string; relativeDays: number; deadlineLabel: string } {
  if (!rawTag || !rawTag.trim()) {
    // Default fallback: 2 days from today
    const defaultDate = addDays(baseDate, 2);
    return {
      deadlineDate: formatDateKey(defaultDate),
      relativeDays: 2,
      deadlineLabel: 'In 2 days (Default)',
    };
  }

  const clean = rawTag
    .trim()
    .toLowerCase()
    .replace(/^(this|next)\s+/i, '')
    .replace(/[)\]]+$/, '')
    .trim();

  // 1. "today"
  if (clean === 'today' || clean === 'tonight') {
    return {
      deadlineDate: formatDateKey(baseDate),
      relativeDays: 0,
      deadlineLabel: 'Today',
    };
  }

  // 2. "tomorrow" / "tmrw"
  if (clean === 'tomorrow' || clean === 'tmrw') {
    const d = addDays(baseDate, 1);
    return {
      deadlineDate: formatDateKey(d),
      relativeDays: 1,
      deadlineLabel: 'Tomorrow',
    };
  }

  // 3. "in X days" / "in X day" / "X days" / "Xd"
  const inDaysMatch = clean.match(/^(?:in\s+)?(\d+)\s*(?:days?|d)$/i);
  if (inDaysMatch) {
    const days = Math.max(0, parseInt(inDaysMatch[1], 10));
    const d = addDays(baseDate, days);
    return {
      deadlineDate: formatDateKey(d),
      relativeDays: days,
      deadlineLabel: days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `In ${days} days`,
    };
  }

  // 4. Day of the week: "monday", "fri", "friday", etc.
  if (DAY_OF_WEEK_NAMES[clean] !== undefined) {
    const targetDayIndex = DAY_OF_WEEK_NAMES[clean];
    const currentDayIndex = baseDate.getDay();
    let diff = (targetDayIndex - currentDayIndex + 7) % 7;
    // If user writes "@ Friday" on Friday, they mean upcoming week's deadline (+7 days)
    if (diff === 0) {
      diff = 7;
    }
    const d = addDays(baseDate, diff);
    const dayName = CAPITALIZED_DAYS[targetDayIndex];
    return {
      deadlineDate: formatDateKey(d),
      relativeDays: diff,
      deadlineLabel: diff === 1 ? 'Tomorrow' : dayName,
    };
  }

  // 5. Standard ISO or formatted date (e.g. "2026-10-25" or "10/25")
  const isoMatch = clean.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const targetDate = parseDateKey(clean);
    const diff = Math.max(0, Math.round((targetDate.getTime() - baseDate.getTime()) / (1000 * 3600 * 24)));
    return {
      deadlineDate: clean,
      relativeDays: diff,
      deadlineLabel: diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : `In ${diff} days`,
    };
  }

  // Fallback default: 2 days from today
  const fallbackDate = addDays(baseDate, 2);
  return {
    deadlineDate: formatDateKey(fallbackDate),
    relativeDays: 2,
    deadlineLabel: 'In 2 days (Default)',
  };
}

/**
 * Calculates planned day label for multi-day distribution preview
 */
function formatPlannedDayLabel(offset: number, baseDate: Date): string {
  if (offset === 0) return 'Today';
  if (offset === 1) return 'Tomorrow';
  const targetDate = addDays(baseDate, offset);
  const weekday = targetDate.toLocaleDateString('en-US', { weekday: 'long' });
  return weekday; // e.g. "Friday", "Thursday"
}

/**
 * Parses a single line of text into a task with 30m chunking and natural deadline
 */
export function parseOutlineLine(
  line: string, 
  index: number = 0, 
  baseDate: Date = new Date()
): ParsedOutlineTask | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#')) {
    return null;
  }

  let textWithoutDeadline = trimmed;
  let rawDeadlineTag: string | null = null;

  // 1. Extract optional natural deadline tag: e.g. '@ tomorrow', '@ Friday', '@ in 3 days'
  const atMatch = trimmed.match(/@\s*([^@\n\r]+)$/i);
  if (atMatch) {
    rawDeadlineTag = atMatch[1].trim();
    textWithoutDeadline = trimmed.slice(0, atMatch.index).trim();
  }

  const deadlineInfo = parseDeadlineString(rawDeadlineTag, baseDate);

  let durationMinutes = 30; // Default to 30m
  let cleanedTitle = textWithoutDeadline;

  // 2. Try Hour + Min regex (e.g. '2h', '1.5h', '1h 30m')
  const hourMatch = textWithoutDeadline.match(/(?:[-–—:\s(\[]*)\b(\d+(?:\.\d+)?)\s*(?:hours|hour|hrs|hr|h)(?:\s*(\d+)\s*(?:minutes|minute|mins|min|m)?)?\b[)\]]*/i);
  if (hourMatch) {
    const hours = parseFloat(hourMatch[1]) || 0;
    const mins = hourMatch[2] ? parseInt(hourMatch[2], 10) : 0;
    durationMinutes = Math.round(hours * 60 + mins);
    cleanedTitle = textWithoutDeadline.replace(hourMatch[0], '');
  } else {
    // 3. Try Minutes regex (e.g. '90m', '45 min')
    const minMatch = textWithoutDeadline.match(/(?:[-–—:\s(\[]*)\b(\d+)\s*(?:minutes|minute|mins|min|m)\b[)\]]*/i);
    if (minMatch) {
      durationMinutes = parseInt(minMatch[1], 10) || 30;
      cleanedTitle = textWithoutDeadline.replace(minMatch[0], '');
    }
  }

  // Fallback sanity clamp for duration (at least 15m, max 12 hours)
  durationMinutes = Math.max(15, Math.min(720, durationMinutes));

  // Clean title
  cleanedTitle = cleanLeadingBullets(cleanedTitle)
    .replace(/[-–—:\s]+$/, '')
    .replace(/^[-–—:\s]+/, '')
    .trim();

  if (!cleanedTitle) {
    cleanedTitle = `Study Topic ${index + 1}`;
  }

  // 4. Slicing into 30-min chunks
  const chunkSize = 30;
  const chunkCount = Math.max(1, Math.ceil(durationMinutes / chunkSize));
  const relDays = deadlineInfo.relativeDays;

  const chunks: OutlineChunk[] = Array.from({ length: chunkCount }, (_, i) => {
    const chunkNum = i + 1;
    const isLast = chunkNum === chunkCount;
    const rem = durationMinutes % chunkSize;
    const chunkDur = isLast && rem > 0 ? rem : chunkSize;
    const title = chunkCount > 1 
      ? `${cleanedTitle} (Part ${chunkNum} of ${chunkCount})` 
      : cleanedTitle;

    // Distribute chunk across available days up to relativeDays
    let dayOffset = 0;
    if (chunkCount === 1) {
      dayOffset = 0; // Single chunk starts Today
    } else if (relDays === 0) {
      dayOffset = 0;
    } else if (chunkCount <= relDays + 1) {
      // Step sequentially: e.g. 3 chunks across 3 days -> 0 (Today), 1 (Tomorrow), relDays (Friday)
      if (i === 0) {
        dayOffset = 0;
      } else if (i === chunkCount - 1) {
        dayOffset = relDays;
      } else {
        dayOffset = Math.min(relDays, i);
      }
    } else {
      // More chunks than days: spread evenly across available days
      dayOffset = Math.min(relDays, Math.floor((i / chunkCount) * (relDays + 1)));
    }

    const plannedDate = formatDateKey(addDays(baseDate, dayOffset));
    const plannedDayLabel = formatPlannedDayLabel(dayOffset, baseDate);

    return {
      chunkNumber: chunkNum,
      totalChunks: chunkCount,
      durationMinutes: chunkDur,
      title,
      plannedDayOffset: dayOffset,
      plannedDayLabel,
      plannedDate,
    };
  });

  return {
    id: `outline-task-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
    rawText: line,
    title: cleanedTitle,
    durationMinutes,
    deadlineTag: rawDeadlineTag || undefined,
    deadlineDate: deadlineInfo.deadlineDate,
    relativeDays: deadlineInfo.relativeDays,
    deadlineLabel: deadlineInfo.deadlineLabel,
    chunkCount,
    chunks,
  };
}

/**
 * Parses raw multi-line outline into structured tasks with multi-day distribution
 */
export function parseRawCourseOutline(
  rawText: string, 
  baseDate: Date = new Date()
): OutlineParseResult {
  const lines = rawText.split(/\r?\n/);
  const tasks: ParsedOutlineTask[] = [];

  lines.forEach((line, idx) => {
    const parsed = parseOutlineLine(line, idx, baseDate);
    if (parsed) {
      tasks.push(parsed);
    }
  });

  const totalDurationMinutes = tasks.reduce((sum, t) => sum + t.durationMinutes, 0);
  const totalChunks = tasks.reduce((sum, t) => sum + t.chunkCount, 0);

  return {
    tasks,
    totalDurationMinutes,
    totalChunks,
  };
}
