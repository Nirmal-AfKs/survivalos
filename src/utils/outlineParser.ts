/**
 * Fast Course Notes & Syllabus Regex Outline Parser (100% offline, zero-asset)
 * Parses raw text lines (e.g. 'Calculus Review - 90m', 'Lab Report 2h') into
 * titles and durations (default 30m) and slices them into 30m focus chunks.
 */

export interface ParsedOutlineTask {
  id: string;
  rawText: string;
  title: string;
  durationMinutes: number;
  chunkCount: number;
  chunks: {
    chunkNumber: number;
    totalChunks: number;
    durationMinutes: number;
    title: string;
  }[];
}

export interface OutlineParseResult {
  tasks: ParsedOutlineTask[];
  totalDurationMinutes: number;
  totalChunks: number;
}

/**
 * Regex to match and extract durations:
 * - '1h 30m', '1.5h', '2h', '2 hrs', '1 hour'
 * - '90m', '45 min', '60 mins', '30 minutes'
 * - '(90m)', '[- 90m]', ': 2h'
 */
const DURATION_REGEXES = [
  // 1h 30m or 1.5h
  /(?:[-–—:\s(\[]*)\b(\d+(?:\.\d+)?)\s*(?:hours|hour|hrs|hr|h)\s*(\d+)?\s*(?:minutes|minute|mins|min|m)?\b[)\]]*/i,
  // 90m, 45 min
  /(?:[-–—:\s(\[]*)\b(\d+)\s*(?:minutes|minute|mins|min|m)\b[)\]]*/i,
];

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
 * Parses a single line of text into a task with 30m chunking
 */
export function parseOutlineLine(line: string, index: number = 0): ParsedOutlineTask | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#')) {
    return null;
  }

  let durationMinutes = 30; // Default to 30m
  let cleanedTitle = trimmed;

  // 1. Try Hour + Min regex (e.g. '2h', '1.5h', '1h 30m')
  const hourMatch = trimmed.match(/(?:[-–—:\s(\[]*)\b(\d+(?:\.\d+)?)\s*(?:hours|hour|hrs|hr|h)(?:\s*(\d+)\s*(?:minutes|minute|mins|min|m)?)?\b[)\]]*/i);
  if (hourMatch) {
    const hours = parseFloat(hourMatch[1]) || 0;
    const mins = hourMatch[2] ? parseInt(hourMatch[2], 10) : 0;
    durationMinutes = Math.round(hours * 60 + mins);
    cleanedTitle = trimmed.replace(hourMatch[0], '');
  } else {
    // 2. Try Minutes regex (e.g. '90m', '45 min')
    const minMatch = trimmed.match(/(?:[-–—:\s(\[]*)\b(\d+)\s*(?:minutes|minute|mins|min|m)\b[)\]]*/i);
    if (minMatch) {
      durationMinutes = parseInt(minMatch[1], 10) || 30;
      cleanedTitle = trimmed.replace(minMatch[0], '');
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

  // Slicing into 30-min chunks
  const chunkSize = 30;
  const chunkCount = Math.max(1, Math.ceil(durationMinutes / chunkSize));

  const chunks = Array.from({ length: chunkCount }, (_, i) => {
    const chunkNum = i + 1;
    const isLast = chunkNum === chunkCount;
    const rem = durationMinutes % chunkSize;
    const chunkDur = isLast && rem > 0 ? rem : chunkSize;
    const title = chunkCount > 1 
      ? `${cleanedTitle} (Part ${chunkNum} of ${chunkCount})` 
      : cleanedTitle;

    return {
      chunkNumber: chunkNum,
      totalChunks: chunkCount,
      durationMinutes: chunkDur,
      title,
    };
  });

  return {
    id: `outline-task-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
    rawText: line,
    title: cleanedTitle,
    durationMinutes,
    chunkCount,
    chunks,
  };
}

/**
 * Parses raw multi-line outline into structured tasks
 */
export function parseRawCourseOutline(rawText: string): OutlineParseResult {
  const lines = rawText.split(/\r?\n/);
  const tasks: ParsedOutlineTask[] = [];

  lines.forEach((line, idx) => {
    const parsed = parseOutlineLine(line, idx);
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
