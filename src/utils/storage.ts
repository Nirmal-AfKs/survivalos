import { WorkTask, LifeEvent, ScheduledSlot, ScheduleSettings } from '../types';
import { formatDateKey, recalculateSchedule, addDays } from './scheduler';

const STORAGE_KEYS = {
  TASKS: 'flowstate_tasks_v1',
  EVENTS: 'flowstate_events_v1',
  SETTINGS: 'flowstate_settings_v1',
  SLOTS: 'flowstate_slots_v1',
  IS_SAMPLE: 'cadence_is_sample_v1',
};

export const DEFAULT_SETTINGS: ScheduleSettings = {
  dayModes: {
    0: 'fully_home',   // Sunday: Free / Home day
    1: 'routine_work', // Monday: Work / School
    2: 'routine_work', // Tuesday: Work / School
    3: 'routine_work', // Wednesday: Work / School
    4: 'routine_work', // Thursday: Work / School
    5: 'routine_work', // Friday: Work / School
    6: 'fully_home',   // Saturday: Free / Home day
  },
  dateSpecificModes: {},
  averageDay: {
    startHour: '18:00',
    endHour: '21:30',
    applicableDays: [1, 2, 3, 4, 5], // Monday - Friday
    maxDailyMinutes: 180, // 3 hours max after work/school
  },
  fullyHomeDay: {
    startHour: '09:30',
    endHour: '17:30',
    applicableDays: [0, 6], // Saturday, Sunday
    lunchBreakStart: '12:30',
    lunchBreakEnd: '13:30',
    maxDailyMinutes: 270, // 4.5 hours focus max
  },
  focusBlockMinutes: 45,
  breakIntervalMinutes: 15,
  finishDayBeforeDeadline: true, // Finish work on or before (deadline - 1 day)
  interleaveTasks: true, // Mix up different tasks
};

export function loadIsSampleSchedule(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.IS_SAMPLE);
    if (raw !== null) {
      return raw === 'true';
    }
  } catch (e) {
    console.error('Failed to load isSampleSchedule', e);
  }
  return true; // Default to true on first run
}

export function saveIsSampleSchedule(val: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEYS.IS_SAMPLE, val ? 'true' : 'false');
  } catch (e) {
    console.error('Failed to save isSampleSchedule', e);
  }
}

export function isDefaultItem(item: { isDefault?: boolean; id?: string; workTaskId?: string } | null | undefined): boolean {
  if (!item) return false;
  if (item.isDefault === true) return true;
  if (typeof item.id === 'string') {
    if (
      item.id.startsWith('default-') ||
      item.id.startsWith('task-math-review') ||
      item.id.startsWith('task-physics-set') ||
      item.id.startsWith('task-evening-walk') ||
      item.id.startsWith('task-lit-review') ||
      item.id.startsWith('task-systems-arch') ||
      item.id.startsWith('task-creative-research') ||
      item.id.startsWith('task-logic-proofs') ||
      item.id.startsWith('task-weekly-retro') ||
      item.id.startsWith('event-study-group') ||
      item.id.startsWith('slot-sample-') ||
      item.id.startsWith('slot-default-')
    ) {
      return true;
    }
  }
  if ('workTaskId' in item && typeof item.workTaskId === 'string') {
    if (
      item.workTaskId.startsWith('default-') ||
      item.workTaskId.startsWith('task-math-review') ||
      item.workTaskId.startsWith('task-physics-set') ||
      item.workTaskId.startsWith('task-evening-walk') ||
      item.workTaskId.startsWith('task-lit-review') ||
      item.workTaskId.startsWith('task-systems-arch') ||
      item.workTaskId.startsWith('task-creative-research') ||
      item.workTaskId.startsWith('task-logic-proofs') ||
      item.workTaskId.startsWith('task-weekly-retro')
    ) {
      return true;
    }
  }
  return false;
}

export function getInitialEvents(): LifeEvent[] {
  const today = new Date();
  const in3Days = addDays(today, 3);

  return [
    {
      id: 'default-event-study-group',
      title: 'Physics & Math Group Problem Session',
      date: formatDateKey(in3Days),
      time: '14:00',
      durationMinutes: 90,
      location: 'Science Library Room 3B',
      category: 'academic',
      color: 'indigo',
      notes: 'Work through problem set together and compare solutions.',
      isDefault: true,
      whatToBring: [
        { id: 'b1', text: 'Calculus textbook & notes', packed: true },
        { id: 'b2', text: 'Scientific calculator', packed: true },
        { id: 'b3', text: 'Graphing notebook & pens', packed: false },
        { id: 'b4', text: 'Water bottle', packed: true },
      ],
    },
  ];
}

export function getInitialTasks(): WorkTask[] {
  const today = new Date();
  const in1 = addDays(today, 1);
  const in2 = addDays(today, 2);
  const in3 = addDays(today, 3);
  const in4 = addDays(today, 4);
  const in5 = addDays(today, 5);
  const in6 = addDays(today, 6);
  const in7 = addDays(today, 7);

  return [
    {
      id: 'default-task-math-review',
      title: 'Pure Mathematics Review',
      description: 'Linear algebra, vector projections, and proof problem sets.',
      estimatedMinutes: 90,
      completedMinutes: 0,
      deadlineDate: formatDateKey(in1),
      category: 'Study',
      color: 'indigo',
      priority: 'high',
      status: 'active',
      isDefault: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'default-task-physics-set',
      title: 'Physics Mechanics Problem Set',
      description: 'Rotational dynamics, harmonic motion, and equilibrium vectors.',
      estimatedMinutes: 90,
      completedMinutes: 0,
      deadlineDate: formatDateKey(in2),
      category: 'Study',
      color: 'emerald',
      priority: 'medium',
      status: 'active',
      isDefault: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'default-task-evening-walk',
      title: 'Evening Walk / Rest Buffer',
      description: 'Unhurried neighborhood stroll to reset cognitive fatigue and clear mind.',
      estimatedMinutes: 30,
      completedMinutes: 0,
      deadlineDate: formatDateKey(today),
      category: 'Rest',
      color: 'amber',
      priority: 'low',
      status: 'active',
      isDefault: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'default-task-lit-review',
      title: 'Literature & Critical Analysis',
      description: 'Close reading of primary sources, thematic synthesis, and chapter notes.',
      estimatedMinutes: 90,
      completedMinutes: 0,
      deadlineDate: formatDateKey(in3),
      category: 'Writing',
      color: 'sky',
      priority: 'medium',
      status: 'active',
      isDefault: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'default-task-systems-arch',
      title: 'Systems Architecture Design',
      description: 'Modular state management, schema boundaries, and reactive pipelines.',
      estimatedMinutes: 90,
      completedMinutes: 0,
      deadlineDate: formatDateKey(in4),
      category: 'Code',
      color: 'purple',
      priority: 'high',
      status: 'active',
      isDefault: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'default-task-creative-research',
      title: 'Deep Creative Research',
      description: 'Exploratory synthesis, visual moodboards, and sanctuary design principles.',
      estimatedMinutes: 90,
      completedMinutes: 0,
      deadlineDate: formatDateKey(in5),
      category: 'Design',
      color: 'rose',
      priority: 'medium',
      status: 'active',
      isDefault: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'default-task-logic-proofs',
      title: 'Discrete Logic & Proof Synthesis',
      description: 'Predicate calculus, induction exercises, and algorithmic invariants.',
      estimatedMinutes: 90,
      completedMinutes: 0,
      deadlineDate: formatDateKey(in6),
      category: 'Study',
      color: 'violet',
      priority: 'medium',
      status: 'active',
      isDefault: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'default-task-weekly-retro',
      title: 'Weekly Synthesis & Sanctuary Retrospective',
      description: 'Reflecting on cognitive bandwidth, pacing, and restorative boundaries.',
      estimatedMinutes: 45,
      completedMinutes: 0,
      deadlineDate: formatDateKey(in7),
      category: 'Planning',
      color: 'stone',
      priority: 'low',
      status: 'active',
      isDefault: true,
      createdAt: new Date().toISOString(),
    },
  ];
}

/**
 * Generates default focus blocks for every single day in the 14-day horizon.
 * Every day has 2-3 calm default focus work blocks!
 */
export function getInitialSlots(todayKey: string): ScheduledSlot[] {
  const [y, m, d] = todayKey.split('-').map(Number);
  const baseDate = new Date(y, m - 1, d);

  const daySchedules = [
    // Day 0: Today
    [
      {
        taskId: 'default-task-math-review',
        title: 'Pure Mathematics Review (Part 1 of 2)',
        category: 'Study',
        color: 'indigo',
        startTime: '16:00',
        endTime: '16:45',
        duration: 45,
        chunk: 1,
        total: 2,
      },
      {
        taskId: 'default-task-physics-set',
        title: 'Physics Mechanics Problem Set',
        category: 'Study',
        color: 'emerald',
        startTime: '17:00',
        endTime: '17:45',
        duration: 45,
        chunk: 1,
        total: 2,
      },
      {
        taskId: 'default-task-evening-walk',
        title: 'Evening Walk / Rest Buffer',
        category: 'Rest',
        color: 'amber',
        startTime: '18:00',
        endTime: '18:30',
        duration: 30,
        chunk: 1,
        total: 1,
      },
    ],
    // Day 1: Tomorrow
    [
      {
        taskId: 'default-task-math-review',
        title: 'Pure Mathematics Review (Part 2 of 2)',
        category: 'Study',
        color: 'indigo',
        startTime: '16:00',
        endTime: '16:45',
        duration: 45,
        chunk: 2,
        total: 2,
      },
      {
        taskId: 'default-task-lit-review',
        title: 'Literature & Critical Analysis',
        category: 'Writing',
        color: 'sky',
        startTime: '17:00',
        endTime: '17:45',
        duration: 45,
        chunk: 1,
        total: 2,
      },
      {
        taskId: 'default-task-evening-walk',
        title: 'Evening Walk / Rest Buffer',
        category: 'Rest',
        color: 'amber',
        startTime: '18:00',
        endTime: '18:30',
        duration: 30,
        chunk: 1,
        total: 1,
      },
    ],
    // Day 2
    [
      {
        taskId: 'default-task-physics-set',
        title: 'Physics Mechanics Problem Set (Part 2 of 2)',
        category: 'Study',
        color: 'emerald',
        startTime: '16:00',
        endTime: '16:45',
        duration: 45,
        chunk: 2,
        total: 2,
      },
      {
        taskId: 'default-task-systems-arch',
        title: 'Systems Architecture Design',
        category: 'Code',
        color: 'purple',
        startTime: '17:00',
        endTime: '17:45',
        duration: 45,
        chunk: 1,
        total: 2,
      },
      {
        taskId: 'default-task-evening-walk',
        title: 'Evening Walk / Rest Buffer',
        category: 'Rest',
        color: 'amber',
        startTime: '18:00',
        endTime: '18:30',
        duration: 30,
        chunk: 1,
        total: 1,
      },
    ],
    // Day 3
    [
      {
        taskId: 'default-task-lit-review',
        title: 'Literature & Critical Analysis (Part 2 of 2)',
        category: 'Writing',
        color: 'sky',
        startTime: '16:00',
        endTime: '16:45',
        duration: 45,
        chunk: 2,
        total: 2,
      },
      {
        taskId: 'default-task-systems-arch',
        title: 'Systems Architecture Design (Part 2 of 2)',
        category: 'Code',
        color: 'purple',
        startTime: '17:00',
        endTime: '17:45',
        duration: 45,
        chunk: 2,
        total: 2,
      },
      {
        taskId: 'default-task-evening-walk',
        title: 'Evening Walk / Rest Buffer',
        category: 'Rest',
        color: 'amber',
        startTime: '18:00',
        endTime: '18:30',
        duration: 30,
        chunk: 1,
        total: 1,
      },
    ],
    // Day 4
    [
      {
        taskId: 'default-task-creative-research',
        title: 'Deep Creative Research',
        category: 'Design',
        color: 'rose',
        startTime: '16:00',
        endTime: '16:45',
        duration: 45,
        chunk: 1,
        total: 2,
      },
      {
        taskId: 'default-task-logic-proofs',
        title: 'Discrete Logic & Proof Synthesis',
        category: 'Study',
        color: 'violet',
        startTime: '17:00',
        endTime: '17:45',
        duration: 45,
        chunk: 1,
        total: 2,
      },
      {
        taskId: 'default-task-evening-walk',
        title: 'Evening Walk / Rest Buffer',
        category: 'Rest',
        color: 'amber',
        startTime: '18:00',
        endTime: '18:30',
        duration: 30,
        chunk: 1,
        total: 1,
      },
    ],
    // Day 5
    [
      {
        taskId: 'default-task-creative-research',
        title: 'Deep Creative Research (Part 2 of 2)',
        category: 'Design',
        color: 'rose',
        startTime: '10:00',
        endTime: '10:45',
        duration: 45,
        chunk: 2,
        total: 2,
      },
      {
        taskId: 'default-task-logic-proofs',
        title: 'Discrete Logic & Proof Synthesis (Part 2 of 2)',
        category: 'Study',
        color: 'violet',
        startTime: '11:00',
        endTime: '11:45',
        duration: 45,
        chunk: 2,
        total: 2,
      },
      {
        taskId: 'default-task-weekly-retro',
        title: 'Weekly Synthesis & Sanctuary Retrospective',
        category: 'Planning',
        color: 'stone',
        startTime: '16:00',
        endTime: '16:45',
        duration: 45,
        chunk: 1,
        total: 1,
      },
    ],
    // Day 6
    [
      {
        taskId: 'default-task-systems-arch',
        title: 'Systems Architecture Design',
        category: 'Code',
        color: 'purple',
        startTime: '10:00',
        endTime: '10:45',
        duration: 45,
        chunk: 1,
        total: 2,
      },
      {
        taskId: 'default-task-math-review',
        title: 'Pure Mathematics Review',
        category: 'Study',
        color: 'indigo',
        startTime: '11:00',
        endTime: '11:45',
        duration: 45,
        chunk: 1,
        total: 2,
      },
      {
        taskId: 'default-task-evening-walk',
        title: 'Evening Walk / Rest Buffer',
        category: 'Rest',
        color: 'amber',
        startTime: '16:00',
        endTime: '16:30',
        duration: 30,
        chunk: 1,
        total: 1,
      },
    ],
  ];

  const allSlots: ScheduledSlot[] = [];

  // Generate 14 days of default slots (days 0 through 13)
  for (let offset = 0; offset < 14; offset++) {
    const curDate = addDays(baseDate, offset);
    const dateKey = formatDateKey(curDate);
    const scheduleTemplate = daySchedules[offset % daySchedules.length];

    scheduleTemplate.forEach((item, slotIndex) => {
      allSlots.push({
        id: `slot-default-${dateKey}-${slotIndex}`,
        workTaskId: item.taskId,
        workTitle: item.title,
        category: item.category,
        color: item.color,
        date: dateKey,
        startTime: item.startTime,
        endTime: item.endTime,
        durationMinutes: item.duration,
        isCompleted: false,
        chunkNumber: item.chunk,
        totalChunks: item.total,
        isDefault: true,
      });
    });
  }

  return allSlots;
}

export function loadSettings(): ScheduleSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (!parsed.dayModes) {
        parsed.dayModes = DEFAULT_SETTINGS.dayModes;
      }
      if (!parsed.dateSpecificModes) {
        parsed.dateSpecificModes = {};
      }
      return parsed;
    }
  } catch (e) {
    console.error('Failed to load settings', e);
  }
  return DEFAULT_SETTINGS;
}

export function saveSettings(settings: ScheduleSettings) {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings', e);
  }
}

export function loadEvents(): LifeEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.EVENTS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load events', e);
  }
  const defaults = getInitialEvents();
  saveEvents(defaults);
  return defaults;
}

export function saveEvents(events: LifeEvent[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));
  } catch (e) {
    console.error('Failed to save events', e);
  }
}

export function loadTasks(): WorkTask[] {
  const isSample = loadIsSampleSchedule();
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TASKS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // If in sample mode and all tasks are default items, upgrade if older 3-item list
        if (isSample && parsed.every((t: WorkTask) => isDefaultItem(t))) {
          if (parsed.length <= 3) {
            const defaults = getInitialTasks();
            saveTasks(defaults);
            return defaults;
          }
        }
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load tasks', e);
  }
  const defaults = getInitialTasks();
  saveTasks(defaults);
  saveIsSampleSchedule(true);
  return defaults;
}

export function saveTasks(tasks: WorkTask[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
  } catch (e) {
    console.error('Failed to save tasks', e);
  }
}

export function loadSlots(tasks: WorkTask[], events: LifeEvent[], settings: ScheduleSettings): ScheduledSlot[] {
  const isSample = loadIsSampleSchedule();
  const todayKey = formatDateKey(new Date());

  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SLOTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // If in sample schedule mode and all slots are default items,
        // ensure everyday slots across the 14-day horizon exist!
        if (isSample && parsed.every((s: ScheduledSlot) => isDefaultItem(s))) {
          const uniqueDates = new Set(parsed.map((s: ScheduledSlot) => s.date));
          if (uniqueDates.size <= 2) {
            const fullHorizonSlots = getInitialSlots(todayKey);
            saveSlots(fullHorizonSlots);
            return fullHorizonSlots;
          }
        }
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load slots', e);
  }

  // First run or empty: seed full everyday default focus blocks across 14-day horizon
  const sampleSlots = getInitialSlots(todayKey);
  saveSlots(sampleSlots);
  return sampleSlots;
}

export function saveSlots(slots: ScheduledSlot[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.SLOTS, JSON.stringify(slots));
  } catch (e) {
    console.error('Failed to save slots', e);
  }
}

export function clearSampleData(
  currentTasks: WorkTask[] = [],
  currentEvents: LifeEvent[] = [],
  currentSlots: ScheduledSlot[] = []
): {
  tasks: WorkTask[];
  events: LifeEvent[];
  slots: ScheduledSlot[];
} {
  // Only vanish items that are default/sample items! User-created items are strictly preserved!
  const userTasks = currentTasks.filter(t => !isDefaultItem(t));
  const userEvents = currentEvents.filter(e => !isDefaultItem(e));
  const userSlots = currentSlots.filter(s => !isDefaultItem(s) && userTasks.some(ut => ut.id === s.workTaskId));

  saveTasks(userTasks);
  saveEvents(userEvents);
  saveSlots(userSlots);
  saveIsSampleSchedule(false);
  return {
    tasks: userTasks,
    events: userEvents,
    slots: userSlots,
  };
}
