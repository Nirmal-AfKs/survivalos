import { WorkTask, LifeEvent, ScheduledSlot, ScheduleSettings } from '../types';
import { cleanTaskTitle, formatChunkTitle, isEventOnDate, formatRecurringDaysShort, RECURRING_WEEK_DAYS } from './format';
export { cleanTaskTitle, formatChunkTitle, isEventOnDate, formatRecurringDaysShort, RECURRING_WEEK_DAYS };

export function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDateKey(key: string): Date {
  if (!key || typeof key !== 'string') return new Date();
  const parts = key.split('-').map(Number);
  if (parts.length !== 3 || isNaN(parts[0])) return new Date();
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToTime(totalMin: number): string {
  const h = Math.floor(totalMin / 60) % 24;
  const m = totalMin % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export interface DaySlotTemplate {
  startTime: string;
  endTime: string;
  durationMinutes: number;
}

/**
 * Returns available time slots for a given date according to settings
 */
export function getDailySlotTemplates(date: Date, settings: ScheduleSettings, eventsForDay: LifeEvent[] = []): DaySlotTemplate[] {
  const dateKey = formatDateKey(date);
  const dayOfWeek = date.getDay(); // 0 is Sunday, 6 is Saturday
  
  // 1. Check date-specific override first (e.g. user set Oct 21 as Full Free)
  let mode: 'routine_work' | 'fully_home' | 'free_rest' = 'routine_work';
  if (settings.dateSpecificModes && settings.dateSpecificModes[dateKey]) {
    mode = settings.dateSpecificModes[dateKey];
  } else if (settings.dayModes && settings.dayModes[dayOfWeek]) {
    mode = settings.dayModes[dayOfWeek];
  } else if (settings.fullyHomeDay.applicableDays.includes(dayOfWeek)) {
    mode = 'fully_home';
  }

  // If this day is designated as a free rest day, schedule zero work slots
  if (mode === 'free_rest') {
    return [];
  }

  const isFullyHome = mode === 'fully_home';
  
  let startMin = isFullyHome 
    ? timeToMinutes(settings.fullyHomeDay.startHour) 
    : timeToMinutes(settings.averageDay.startHour);
  let endMin = isFullyHome 
    ? timeToMinutes(settings.fullyHomeDay.endHour) 
    : timeToMinutes(settings.averageDay.endHour);

  const focusDuration = settings.focusBlockMinutes;
  const breakDuration = settings.breakIntervalMinutes;

  const lunchStart = isFullyHome && settings.fullyHomeDay.lunchBreakStart ? timeToMinutes(settings.fullyHomeDay.lunchBreakStart) : null;
  const lunchEnd = isFullyHome && settings.fullyHomeDay.lunchBreakEnd ? timeToMinutes(settings.fullyHomeDay.lunchBreakEnd) : null;

  // Convert events on this day into blackout windows
  const blackoutWindows: { start: number; end: number }[] = [];
  
  if (lunchStart !== null && lunchEnd !== null && lunchEnd > lunchStart) {
    blackoutWindows.push({ start: lunchStart, end: lunchEnd });
  }

  for (const ev of eventsForDay) {
    const evStart = timeToMinutes(ev.time);
    const evEnd = evStart + (ev.durationMinutes || 60);
    // add small buffer before & after event
    blackoutWindows.push({ start: Math.max(0, evStart - 15), end: evEnd + 15 });
  }

  const slots: DaySlotTemplate[] = [];
  let currentMin = startMin;

  // Fill the entire available window with straight focus blocks followed by mindful breaks
  while (currentMin + focusDuration <= endMin) {
    const slotEnd = currentMin + focusDuration;
    
    // Check if slot overlaps with any blackout window
    const hasOverlap = blackoutWindows.some(b => 
      (currentMin < b.end && slotEnd > b.start)
    );

    if (!hasOverlap) {
      slots.push({
        startTime: minutesToTime(currentMin),
        endTime: minutesToTime(slotEnd),
        durationMinutes: focusDuration,
      });
      currentMin = slotEnd + breakDuration;
    } else {
      // Find the end of overlapping blackout window and jump forward
      const overlapping = blackoutWindows.find(b => (currentMin < b.end && slotEnd > b.start));
      if (overlapping) {
        currentMin = Math.max(currentMin + 15, overlapping.end);
      } else {
        currentMin += 15;
      }
    }
  }

  return slots;
}

/**
 * Core Algorithm: Spreads incomplete work across available slots up to deadline buffer.
 * Interleaves tasks to prevent cognitive monotony.
 */
export function recalculateSchedule(
  tasks: WorkTask[],
  events: LifeEvent[],
  settings: ScheduleSettings,
  existingSlots: ScheduledSlot[],
  startDate: Date = new Date()
): ScheduledSlot[] {
  // 1. Keep completed slots intact
  const preservedCompletedSlots = existingSlots.filter(s => s.isCompleted);
  
  // 2. Determine remaining work for each active task
  // Calculate completed minutes from preserved completed slots
  const completedMinutesByTask: Record<string, number> = {};
  for (const s of preservedCompletedSlots) {
    completedMinutesByTask[s.workTaskId] = (completedMinutesByTask[s.workTaskId] || 0) + s.durationMinutes;
  }

  const activeTasks = tasks.filter(t => t.status === 'active');
  if (activeTasks.length === 0) {
    return preservedCompletedSlots;
  }

  // Pre-calculate effective deadline for each task
  // Rule: If finishDayBeforeDeadline is true, work must finish on or before (deadline - 1 day)
  const taskMeta = activeTasks.map(task => {
    let rawDeadlineStr = task.deadlineDate;
    if (task.linkedEventId) {
      const linked = events.find(e => e.id === task.linkedEventId);
      if (linked) {
        rawDeadlineStr = linked.date;
      }
    }

    const rawDeadlineDate = parseDateKey(rawDeadlineStr);
    let effectiveLastDayDate = rawDeadlineDate;
    if (settings.finishDayBeforeDeadline) {
      const dayBefore = addDays(rawDeadlineDate, -1);
      // If deadline is today or tomorrow, ensure user can still schedule today
      const startKey = formatDateKey(startDate);
      const dayBeforeKey = formatDateKey(dayBefore);
      if (dayBeforeKey < startKey && formatDateKey(rawDeadlineDate) >= startKey) {
        effectiveLastDayDate = new Date(startDate);
      } else {
        effectiveLastDayDate = dayBefore;
      }
    }

    const alreadyDoneMin = completedMinutesByTask[task.id] || 0;
    const remainingMin = Math.max(0, task.estimatedMinutes - alreadyDoneMin);
    const chunkSize = settings.focusBlockMinutes;
    const chunksNeeded = Math.ceil(remainingMin / chunkSize);

    return {
      task,
      rawDeadlineStr,
      effectiveLastDayKey: formatDateKey(effectiveLastDayDate),
      effectiveLastDayDate,
      remainingMinutes: remainingMin,
      chunksNeeded,
      chunksScheduled: 0,
      totalChunks: Math.ceil(task.estimatedMinutes / chunkSize),
    };
  }).filter(t => t.chunksNeeded > 0);

  // Sort tasks by effective deadline ascending (most urgent first)
  taskMeta.sort((a, b) => a.effectiveLastDayDate.getTime() - b.effectiveLastDayDate.getTime());

  // We will build a pool of days starting from startDate up to max horizon (e.g. 30 days)
  const horizonDays = 30;
  const newSlots: ScheduledSlot[] = [];

  // Group preserved completed slots by date + startTime so we don't double book
  const occupiedSlotsMap: Record<string, Set<string>> = {};
  for (const slot of preservedCompletedSlots) {
    if (!occupiedSlotsMap[slot.date]) {
      occupiedSlotsMap[slot.date] = new Set();
    }
    occupiedSlotsMap[slot.date].add(slot.startTime);
  }

  // Queue of chunks to schedule with interleaving
  // We schedule day by day
  let dayOffset = 0;
  
  // Track last scheduled task ID to maximize interleaving across adjacent slots
  let lastTaskId: string | null = null;

  while (dayOffset < horizonDays) {
    const currentDay = addDays(startDate, dayOffset);
    const dayKey = formatDateKey(currentDay);
    
    // Find events on this day (including recurring weekly events)
    const dayEvents = events.filter(e => isEventOnDate(e, currentDay));
    const templates = getDailySlotTemplates(currentDay, settings, dayEvents);

    for (const tpl of templates) {
      // Check if slot was already occupied by a completed slot
      if (occupiedSlotsMap[dayKey]?.has(tpl.startTime)) {
        continue;
      }

      // Find candidates for this slot:
      // Must be a task that still needs chunks AND where currentDay <= effectiveLastDayDate
      const eligibleTasks = taskMeta.filter(t => 
        t.chunksScheduled < t.chunksNeeded && 
        dayKey <= t.effectiveLastDayKey
      );

      if (eligibleTasks.length === 0) {
        // No task can be scheduled here or all are completed/past deadline
        continue;
      }

      // Interleaving selection:
      // 1. If interleaving is enabled and multiple eligible tasks exist, pick one that is NOT the same as lastTaskId
      let selectedTask = eligibleTasks.find(t => t.task.id !== lastTaskId);
      if (!selectedTask) {
        // If all available tasks are the same task, take it
        selectedTask = eligibleTasks[0];
      }

      // Check urgency: If a task has ONLY as many remaining slots left before its deadline as chunks needed, it must be prioritized
      const urgentTask = eligibleTasks.find(t => {
        // days between currentDay and effectiveLastDayDate
        const diffDays = Math.max(0, Math.round((t.effectiveLastDayDate.getTime() - currentDay.getTime()) / (1000 * 3600 * 24)));
        const slotsNeeded = t.chunksNeeded - t.chunksScheduled;
        return diffDays <= 1 || slotsNeeded >= diffDays * 2;
      });

      if (urgentTask) {
        selectedTask = urgentTask;
      }

      selectedTask.chunksScheduled++;
      lastTaskId = selectedTask.task.id;

      const completedCount = preservedCompletedSlots.filter(s => s.workTaskId === selectedTask.task.id).length;
      const currentChunkNum = completedCount + selectedTask.chunksScheduled;

      newSlots.push({
        id: `slot-${dayKey}-${tpl.startTime}-${selectedTask.task.id}-${Math.random().toString(36).slice(2, 6)}`,
        workTaskId: selectedTask.task.id,
        workTitle: cleanTaskTitle(selectedTask.task.title),
        category: selectedTask.task.category,
        color: selectedTask.task.color,
        date: dayKey,
        startTime: tpl.startTime,
        endTime: tpl.endTime,
        durationMinutes: tpl.durationMinutes,
        isCompleted: false,
        chunkNumber: currentChunkNum,
        totalChunks: selectedTask.totalChunks,
      });

      // If all tasks are done, break early
      const allDone = taskMeta.every(t => t.chunksScheduled >= t.chunksNeeded);
      if (allDone) break;
    }

    const allDone = taskMeta.every(t => t.chunksScheduled >= t.chunksNeeded);
    if (allDone) break;

    dayOffset++;
  }

  // Combine preserved completed slots and new slots, sorted by date and startTime
  const allSlots = [...preservedCompletedSlots, ...newSlots];
  allSlots.sort((a, b) => {
    if (a.date !== b.date) {
      return a.date.localeCompare(b.date);
    }
    return a.startTime.localeCompare(b.startTime);
  });

  return allSlots;
}
