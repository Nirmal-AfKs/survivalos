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
    let evEnd = evStart + (ev.durationMinutes || 60);
    if (ev.endTime) {
      const parsedEnd = timeToMinutes(ev.endTime);
      if (parsedEnd > evStart) {
        evEnd = parsedEnd;
      }
    }
    // Respect user-selected wind-down buffer before event (when to stop work) and recovery buffer after event (when work chunks resume)
    const bufBefore = ev.bufferBeforeMinutes !== undefined ? Math.max(0, ev.bufferBeforeMinutes) : 15;
    const bufAfter = ev.bufferAfterMinutes !== undefined ? Math.max(0, ev.bufferAfterMinutes) : 15;

    blackoutWindows.push({
      start: Math.max(0, evStart - bufBefore),
      end: evEnd + bufAfter,
    });
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

export interface DayCapacityInfo {
  date: Date;
  dateKey: string;
  totalSlots: number;
  usedSlots: number;
  availableSlots: number;
  isFull: boolean;
  isPast: boolean;
  isRestDay: boolean;
}

/**
 * Returns accurate capacity information for a specific day
 */
export function getDayCapacityInfo(
  date: Date,
  tasks: WorkTask[],
  events: LifeEvent[],
  settings: ScheduleSettings,
  slots: ScheduledSlot[],
  referenceTime: Date = new Date()
): DayCapacityInfo {
  const dateKey = formatDateKey(date);
  const refKey = formatDateKey(referenceTime);
  const isToday = dateKey === refKey;
  const isPast = dateKey < refKey;

  // 1. Day mode determination
  const dayOfWeek = date.getDay();
  let mode: 'routine_work' | 'fully_home' | 'free_rest' = 'routine_work';
  if (settings.dateSpecificModes && settings.dateSpecificModes[dateKey]) {
    mode = settings.dateSpecificModes[dateKey];
  } else if (settings.dayModes && settings.dayModes[dayOfWeek]) {
    mode = settings.dayModes[dayOfWeek];
  } else if (settings.fullyHomeDay.applicableDays.includes(dayOfWeek)) {
    mode = 'fully_home';
  }

  if (mode === 'free_rest') {
    return {
      date,
      dateKey,
      totalSlots: 0,
      usedSlots: 0,
      availableSlots: 0,
      isFull: true,
      isPast,
      isRestDay: true,
    };
  }

  const dayEvents = events.filter(e => isEventOnDate(e, date));
  const templates = getDailySlotTemplates(date, settings, dayEvents);
  const totalSlots = templates.length;

  if (totalSlots === 0) {
    return {
      date,
      dateKey,
      totalSlots: 0,
      usedSlots: 0,
      availableSlots: 0,
      isFull: true,
      isPast,
      isRestDay: false,
    };
  }

  if (isPast) {
    return {
      date,
      dateKey,
      totalSlots,
      usedSlots: totalSlots,
      availableSlots: 0,
      isFull: true,
      isPast: true,
      isRestDay: false,
    };
  }

  // Count existing scheduled chunks on this date
  const dayScheduledSlots = slots.filter(s => s.date === dateKey && !s.isUnscheduled);
  const completedSlots = dayScheduledSlots.filter(s => s.isCompleted);
  const activeSlots = dayScheduledSlots.filter(s => !s.isCompleted);

  if (isToday) {
    const currentClockMinutes = referenceTime.getHours() * 60 + referenceTime.getMinutes();
    const completedTimes = new Set(completedSlots.map(s => s.startTime));

    // Future templates for today that haven't passed and haven't been completed
    const futureTemplates = templates.filter(t => {
      if (completedTimes.has(t.startTime)) return false;
      const startMin = timeToMinutes(t.startTime);
      return startMin >= currentClockMinutes;
    });

    // Active uncompleted slots scheduled for today in future
    const activeFutureSlotsCount = activeSlots.filter(s => {
      const startMin = timeToMinutes(s.startTime);
      return startMin >= currentClockMinutes;
    }).length;

    const availableSlots = Math.max(0, futureTemplates.length - activeFutureSlotsCount);
    const usedSlots = totalSlots - availableSlots;

    return {
      date,
      dateKey,
      totalSlots,
      usedSlots,
      availableSlots,
      isFull: availableSlots === 0,
      isPast: false,
      isRestDay: false,
    };
  }

  // Future day
  const usedSlots = Math.min(totalSlots, completedSlots.length + activeSlots.length);
  const availableSlots = Math.max(0, totalSlots - usedSlots);

  return {
    date,
    dateKey,
    totalSlots,
    usedSlots,
    availableSlots,
    isFull: availableSlots === 0,
    isPast: false,
    isRestDay: false,
  };
}

export interface TodayCapacityMetrics {
  currentClockMinutes: number;
  currentClockTimeStr: string;
  totalDaylightSlots: number;
  completedSlotsCount: number;
  pastSlotsCount: number;
  remainingOpenSlotsCount: number;
  remainingMinutesAvailable: number;
  totalPendingChunksToday: number;
  openSlotTemplates: DaySlotTemplate[];
}

/**
 * Calculates real-time daylight capacity for today:
 * Factors out past time, already completed blocks, and focus protection corridors
 */
export function calculateTodayCapacity(
  settings: ScheduleSettings,
  events: LifeEvent[],
  existingSlots: ScheduledSlot[],
  referenceTime: Date = new Date()
): TodayCapacityMetrics {
  const todayKey = formatDateKey(referenceTime);
  const currentClockMinutes = referenceTime.getHours() * 60 + referenceTime.getMinutes();
  const currentClockTimeStr = minutesToTime(currentClockMinutes);

  // Events on today (including recurring)
  const todayEvents = events.filter(e => isEventOnDate(e, referenceTime));
  const allTemplates = getDailySlotTemplates(referenceTime, settings, todayEvents);

  const completedTodaySlots = existingSlots.filter(s => s.date === todayKey && s.isCompleted);
  const completedSlotTimes = new Set(completedTodaySlots.map(s => s.startTime));

  const pendingTodaySlots = existingSlots.filter(s => s.date === todayKey && !s.isCompleted && !s.isUnscheduled);

  // Remaining open slots: must not be completed, and must start >= currentClockMinutes
  const openTemplates = allTemplates.filter(t => {
    if (completedSlotTimes.has(t.startTime)) return false;
    const slotStartMin = timeToMinutes(t.startTime);
    return slotStartMin >= currentClockMinutes;
  });

  const remainingOpenSlotsCount = openTemplates.length;
  const remainingMinutesAvailable = remainingOpenSlotsCount * settings.focusBlockMinutes;

  return {
    currentClockMinutes,
    currentClockTimeStr,
    totalDaylightSlots: allTemplates.length,
    completedSlotsCount: completedTodaySlots.length,
    pastSlotsCount: allTemplates.filter(t => timeToMinutes(t.startTime) < currentClockMinutes).length,
    remainingOpenSlotsCount,
    remainingMinutesAvailable,
    totalPendingChunksToday: pendingTodaySlots.length,
    openSlotTemplates: openTemplates,
  };
}

export interface TaskCapacityCheckResult {
  neededChunks: number;
  totalAvailableSlotsBeforeDeadline: number;
  isOverCapacity: boolean;
  daysBreakdown: DayCapacityInfo[];
  firstDateWithCapacity: string | null;
  daysUntilDeadline: number;
  effectiveDeadlineDateKey: string;
  suggestedDeadlineDate: string;
}

/**
 * Checks if new work fits within available slots before the deadline.
 * Enforces a strict hard ceiling to prevent overplanning.
 */
export function checkTaskCapacityCeiling(
  estimatedMinutes: number,
  deadlineDateStr: string,
  tasks: WorkTask[],
  events: LifeEvent[],
  settings: ScheduleSettings,
  slots: ScheduledSlot[],
  referenceTime: Date = new Date()
): TaskCapacityCheckResult {
  const chunkSize = Math.max(15, settings.focusBlockMinutes || 45);
  const neededChunks = Math.max(1, Math.ceil(estimatedMinutes / chunkSize));
  const todayKey = formatDateKey(referenceTime);
  const rawDeadlineDate = parseDateKey(deadlineDateStr);

  // Calculate effective last day (respecting finishDayBeforeDeadline)
  let effectiveLastDay = rawDeadlineDate;
  if (settings.finishDayBeforeDeadline) {
    const dayBefore = addDays(rawDeadlineDate, -1);
    if (formatDateKey(dayBefore) < todayKey && formatDateKey(rawDeadlineDate) >= todayKey) {
      effectiveLastDay = new Date(referenceTime);
    } else {
      effectiveLastDay = dayBefore;
    }
  }

  const effectiveDeadlineKey = formatDateKey(effectiveLastDay);

  // If deadline is already in the past
  if (effectiveDeadlineKey < todayKey) {
    let accumulated = 0;
    let foundDate: Date | null = null;
    for (let i = 0; i < 60; i++) {
      const d = addDays(referenceTime, i);
      const cap = getDayCapacityInfo(d, tasks, events, settings, slots, referenceTime);
      accumulated += cap.availableSlots;
      if (accumulated >= neededChunks) {
        foundDate = d;
        break;
      }
    }
    const suggestedDate = foundDate 
      ? (settings.finishDayBeforeDeadline ? addDays(foundDate, 1) : foundDate)
      : addDays(referenceTime, 4);
    const suggestedDeadlineDate = formatDateKey(suggestedDate);

    return {
      neededChunks,
      totalAvailableSlotsBeforeDeadline: 0,
      isOverCapacity: true,
      daysBreakdown: [],
      firstDateWithCapacity: suggestedDeadlineDate,
      daysUntilDeadline: 0,
      effectiveDeadlineDateKey: effectiveDeadlineKey,
      suggestedDeadlineDate,
    };
  }

  // Iterate day-by-day from today up to effectiveLastDay
  const daysBreakdown: DayCapacityInfo[] = [];
  let totalAvailableSlots = 0;
  let curr = new Date(referenceTime);
  let daysCount = 0;

  while (formatDateKey(curr) <= effectiveDeadlineKey && daysCount < 60) {
    const cap = getDayCapacityInfo(curr, tasks, events, settings, slots, referenceTime);
    daysBreakdown.push(cap);
    totalAvailableSlots += cap.availableSlots;
    curr = addDays(curr, 1);
    daysCount++;
  }

  const isOverCapacity = totalAvailableSlots < neededChunks;
  let firstDateWithCapacity: string | null = null;
  let suggestedDeadlineDate = deadlineDateStr;

  if (isOverCapacity) {
    let accumulated = totalAvailableSlots;
    let searchDate = curr; // begins on day after effectiveLastDay
    let foundDate: Date | null = null;

    for (let i = 0; i < 60; i++) {
      const cap = getDayCapacityInfo(searchDate, tasks, events, settings, slots, referenceTime);
      accumulated += cap.availableSlots;
      if (accumulated >= neededChunks) {
        foundDate = searchDate;
        break;
      }
      searchDate = addDays(searchDate, 1);
    }

    if (foundDate) {
      const targetDeadlineDate = settings.finishDayBeforeDeadline ? addDays(foundDate, 1) : foundDate;
      firstDateWithCapacity = formatDateKey(targetDeadlineDate);
      suggestedDeadlineDate = firstDateWithCapacity;
    } else {
      const fallback = addDays(rawDeadlineDate, 3);
      firstDateWithCapacity = formatDateKey(fallback);
      suggestedDeadlineDate = firstDateWithCapacity;
    }
  }

  return {
    neededChunks,
    totalAvailableSlotsBeforeDeadline: totalAvailableSlots,
    isOverCapacity,
    daysBreakdown,
    firstDateWithCapacity,
    daysUntilDeadline: daysCount,
    effectiveDeadlineDateKey: effectiveDeadlineKey,
    suggestedDeadlineDate,
  };
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
    // If task has a deferral date that is beyond the current deadline, extend deadline accordingly
    if (task.deferredUntilDate && task.deferredUntilDate > rawDeadlineStr) {
      rawDeadlineStr = task.deferredUntilDate;
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

    // Ensure effective last day is at least the deferral target date
    if (task.deferredUntilDate) {
      const deferredDateObj = parseDateKey(task.deferredUntilDate);
      if (effectiveLastDayDate < deferredDateObj) {
        effectiveLastDayDate = deferredDateObj;
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
    const isToday = dayOffset === 0;
    const currentClockMinutes = isToday ? (startDate.getHours() * 60 + startDate.getMinutes()) : 0;
    
    // Find events on this day (including recurring weekly events)
    const dayEvents = events.filter(e => isEventOnDate(e, currentDay));
    const templates = getDailySlotTemplates(currentDay, settings, dayEvents);

    // Track chunks scheduled per task on this specific day to ensure balanced multi-day pacing
    const chunksTodayMap: Record<string, number> = {};

    for (const tpl of templates) {
      // Check if slot was already occupied by a completed slot
      if (occupiedSlotsMap[dayKey]?.has(tpl.startTime)) {
        continue;
      }

      // If scheduling today with live clock time, only schedule into slots that start in the future
      if (isToday && currentClockMinutes > 0 && timeToMinutes(tpl.startTime) < currentClockMinutes) {
        continue;
      }

      // Find candidates for this slot:
      // Must be a task that still needs chunks AND where currentDay <= effectiveLastDayDate
      // (or currentDay <= rawDeadlineStr if capacity is needed)
      // AND not deferred until a future date
      const eligibleTasks = taskMeta.filter(t => 
        t.chunksScheduled < t.chunksNeeded && 
        (dayKey <= t.effectiveLastDayKey || dayKey <= t.rawDeadlineStr) &&
        (!t.task.deferredUntilDate || dayKey >= t.task.deferredUntilDate)
      );

      if (eligibleTasks.length === 0) {
        // No task can be scheduled here or all are completed/past deadline
        continue;
      }

      // Multi-Day Pacing Logic:
      // Calculate daily quota for each task: how many chunks should it ideally take on this day?
      // Immediately urgent tasks (due today/tomorrow or tight horizon) take what they need.
      // Tasks with future deadlines (e.g. Friday, in 3 days) distribute chunks across days.
      const isUrgent = (t: typeof eligibleTasks[0]) => {
        const diffDays = Math.max(0, Math.round((t.effectiveLastDayDate.getTime() - currentDay.getTime()) / (1000 * 3600 * 24)));
        const slotsNeeded = t.chunksNeeded - t.chunksScheduled;
        return diffDays <= 1 || slotsNeeded >= Math.max(1, diffDays * 2);
      };

      const getDailyPacingQuota = (t: typeof eligibleTasks[0]) => {
        const diffDays = Math.max(1, Math.round((t.effectiveLastDayDate.getTime() - currentDay.getTime()) / (1000 * 3600 * 24)) + 1);
        const slotsNeeded = t.chunksNeeded - t.chunksScheduled;
        return Math.max(1, Math.ceil(slotsNeeded / diffDays));
      };

      // Priority 1: Urgent tasks that must be done now
      const urgentCandidate = eligibleTasks.find(t => isUrgent(t));

      // Priority 2: Tasks that have not yet reached their daily pacing quota for this day
      const pacedCandidates = eligibleTasks.filter(t => {
        const scheduledToday = chunksTodayMap[t.task.id] || 0;
        const quota = getDailyPacingQuota(t);
        return scheduledToday < quota;
      });

      let selectedTask: typeof eligibleTasks[0] | undefined;

      if (urgentCandidate) {
        selectedTask = urgentCandidate;
      } else if (pacedCandidates.length > 0) {
        // Interleave: Pick a task different from the last scheduled task if possible
        selectedTask = pacedCandidates.find(t => t.task.id !== lastTaskId) || pacedCandidates[0];
      }

      if (!selectedTask) {
        // All eligible tasks for this day have reached their paced quota.
        // Move to the next day to distribute remaining chunks cleanly across the schedule.
        break;
      }

      selectedTask.chunksScheduled++;
      chunksTodayMap[selectedTask.task.id] = (chunksTodayMap[selectedTask.task.id] || 0) + 1;
      lastTaskId = selectedTask.task.id;

      const completedCount = preservedCompletedSlots.filter(s => s.workTaskId === selectedTask!.task.id).length;
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

  // 3. Gracefully place overflowing chunks into "Unscheduled / Capacity Exceeded" holding shelf
  for (const t of taskMeta) {
    if (t.chunksScheduled < t.chunksNeeded) {
      const missingCount = t.chunksNeeded - t.chunksScheduled;
      const completedCount = preservedCompletedSlots.filter(s => s.workTaskId === t.task.id).length;
      for (let c = 1; c <= missingCount; c++) {
        const currentChunkNum = completedCount + t.chunksScheduled + c;
        newSlots.push({
          id: `slot-holding-${t.task.id}-${currentChunkNum}-${Math.random().toString(36).slice(2, 6)}`,
          workTaskId: t.task.id,
          workTitle: cleanTaskTitle(t.task.title),
          category: t.task.category,
          color: t.task.color,
          date: 'unscheduled',
          startTime: '--:--',
          endTime: '--:--',
          durationMinutes: settings.focusBlockMinutes,
          isCompleted: false,
          chunkNumber: currentChunkNum,
          totalChunks: t.totalChunks,
          isUnscheduled: true,
          unscheduledReason: 'Capacity exceeded before deadline window',
        });
      }
    }
  }

  // Combine preserved completed slots and new slots, sorted by date and startTime
  const allSlots = [...preservedCompletedSlots, ...newSlots];
  allSlots.sort((a, b) => {
    // Keep unscheduled items at the end
    if (a.date === 'unscheduled') return 1;
    if (b.date === 'unscheduled') return -1;
    if (a.date !== b.date) {
      return a.date.localeCompare(b.date);
    }
    return a.startTime.localeCompare(b.startTime);
  });

  return allSlots;
}
