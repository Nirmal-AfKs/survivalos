export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday, 1 = Monday, ...

export interface WhatToBringItem {
  id: string;
  text: string;
  packed: boolean;
}

export interface LifeEvent {
  id: string;
  title: string;
  date: string; // 'YYYY-MM-DD'
  time: string; // 'HH:mm' (start time)
  endTime?: string; // 'HH:mm' (end time)
  durationMinutes: number;
  bufferBeforeMinutes?: number; // Minutes before event when user stops work (wind-down / prep / travel)
  bufferAfterMinutes?: number; // Minutes after event before normal work chunks resume (decompress / travel / recovery)
  location?: string;
  category: 'academic' | 'work' | 'personal' | 'social' | 'health';
  whatToBring: WhatToBringItem[];
  notes?: string;
  color: string;
  isDefault?: boolean;
  recurringDays?: number[]; // [0..6] (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
}

export interface WorkTask {
  id: string;
  title: string;
  description?: string;
  estimatedMinutes: number;
  completedMinutes: number;
  deadlineDate: string; // 'YYYY-MM-DD'
  linkedEventId?: string;
  category: string;
  color: string;
  priority: 'low' | 'medium' | 'high';
  status: 'active' | 'completed' | 'paused';
  createdAt: string;
  isDefault?: boolean;
}

export interface ScheduledSlot {
  id: string;
  workTaskId: string;
  workTitle: string;
  category: string;
  color: string;
  date: string; // 'YYYY-MM-DD'
  startTime: string; // 'HH:mm'
  endTime: string; // 'HH:mm'
  durationMinutes: number;
  isCompleted: boolean;
  completedAt?: string;
  chunkNumber: number;
  totalChunks: number;
  isDefault?: boolean;
  isUnscheduled?: boolean;
  unscheduledReason?: string;
}

export type DayMode = 'routine_work' | 'fully_home' | 'free_rest';

export interface ScheduleSettings {
  // Explicit day-by-day mode selection (Mon-Sun default weekly baseline)
  dayModes: Record<number, DayMode>; // 0 = Sun, 1 = Mon, ..., 6 = Sat

  // Date-specific overrides ('YYYY-MM-DD' -> DayMode) for holidays, shifts, custom off-days
  dateSpecificModes?: Record<string, DayMode>;

  // Routine days where user has work/school/lectures and then free time after
  averageDay: {
    startHour: string; // e.g. "18:00"
    endHour: string;   // e.g. "21:30"
    applicableDays: number[]; // 1 to 5 (Mon-Fri)
    maxDailyMinutes?: number; // legacy optional cap
  };
  // Fully home / free days (weekends or off-days)
  fullyHomeDay: {
    startHour: string; // e.g. "09:30"
    endHour: string;   // e.g. "17:30"
    applicableDays: number[]; // 0 and 6 (Sun, Sat)
    lunchBreakStart: string; // e.g. "12:30"
    lunchBreakEnd: string;   // e.g. "13:30"
    maxDailyMinutes?: number; // legacy optional cap
  };
  // Cognitive Chunking
  focusBlockMinutes: number; // e.g. 45 or 30 or 50
  breakIntervalMinutes: number; // e.g. 15 or 10 or 5
  // Psychological rule: Finish by day before deadline
  finishDayBeforeDeadline: boolean; // if deadline is 28, finish by 27 end
  interleaveTasks: boolean; // alternate between different subjects/tasks
}

export interface SquadFocusBlock {
  id?: string;
  startTime: string; // "16:00"
  endTime: string;   // "16:45"
  title: string;     // "Pure Mathematics Review"
  category?: string; // "study"
  durationMinutes: number;
}

export interface SquadSharePayload {
  v: number; // version 1
  curfew: string; // e.g. "21:30"
  dateKey?: string; // e.g. "2026-10-19"
  dayMode?: DayMode;
  friendName?: string;
  blocks: SquadFocusBlock[];
  matched?: boolean;
  matchedTime?: string; // e.g. "16:00–16:45"
}
