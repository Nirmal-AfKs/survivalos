import assert from 'node:assert';
import { 
  formatDateKey, 
  parseDateKey, 
  addDays, 
  recalculateSchedule 
} from '../src/utils/scheduler';
import { 
  encodeSquadPayload, 
  parseSquadPayloadString, 
  buildSquadShareUrl, 
  buildSquadReplyUrl, 
  getSquadBaseUrl 
} from '../src/utils/squad';
import { 
  cleanTaskTitle, 
  formatChunkTitle, 
  formatRecurringDaysShort, 
  isEventOnDate, 
  RECURRING_WEEK_DAYS 
} from '../src/utils/format';
import { 
  isDefaultItem, 
  clearSampleData,
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  loadTasks,
  saveTasks,
  loadEvents,
  saveEvents
} from '../src/utils/storage';
import { WorkTask, LifeEvent, ScheduledSlot, ScheduleSettings, SquadSharePayload } from '../src/types';

// In-memory localStorage mock for node test runner
const store: Record<string, string> = {};
(globalThis as any).localStorage = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => { store[key] = String(value); },
  removeItem: (key: string) => { delete store[key]; },
  clear: () => { Object.keys(store).forEach(k => delete store[k]); }
};

console.log('🧪 Starting Cadence Sanctuary Comprehensive Test Suite...\n');

let passedTests = 0;
let totalTests = 0;

function it(name: string, fn: () => void) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passedTests++;
  } catch (err: any) {
    console.error(`  ✗ ${name}`);
    console.error('    ', err.message || err);
    throw err;
  }
}

// ==========================================
// 1. DATE & FORMAT UTILS TESTS
// ==========================================
console.log('📌 Testing Date & Format Utilities:');

it('formats date key into YYYY-MM-DD correctly', () => {
  const d = new Date(2026, 9, 20); // October 20, 2026
  assert.strictEqual(formatDateKey(d), '2026-10-20');
});

it('parses date key accurately', () => {
  const parsed = parseDateKey('2026-10-20');
  assert.strictEqual(parsed.getFullYear(), 2026);
  assert.strictEqual(parsed.getMonth(), 9);
  assert.strictEqual(parsed.getDate(), 20);
});

it('adds days correctly across month boundaries', () => {
  const start = new Date(2026, 9, 30); // Oct 30
  const next = addDays(start, 2);
  assert.strictEqual(formatDateKey(next), '2026-11-01');
});

it('cleans task titles and strips legacy duration tags', () => {
  const cleaned = cleanTaskTitle('Quantum Mechanics Revision — 2h 30m');
  assert.strictEqual(cleaned, 'Quantum Mechanics Revision');
  assert.strictEqual(cleanTaskTitle('Normal Task Title'), 'Normal Task Title');
});

it('formats chunk titles with human-friendly numbering', () => {
  assert.strictEqual(formatChunkTitle('Essay Draft', 1, 3), 'Essay Draft (Part 1 of 3)');
  assert.strictEqual(formatChunkTitle('Quick Review', 1, 1), 'Quick Review');
});

it('formats recurring days accurately into human summaries', () => {
  // [1, 3, 5] = Mon, Wed, Fri
  assert.strictEqual(formatRecurringDaysShort([1, 3, 5]), 'Mon, Wed, Fri');
  // [1, 2, 3, 4, 5] = Weekdays
  assert.strictEqual(formatRecurringDaysShort([1, 2, 3, 4, 5]), 'Weekdays');
  // [0, 6] = Weekends
  assert.strictEqual(formatRecurringDaysShort([6, 0]), 'Weekends');
  // [0..6] = Every Day
  assert.strictEqual(formatRecurringDaysShort([0, 1, 2, 3, 4, 5, 6]), 'Every Day');
});

// ==========================================
// 2. RECURRING EVENT MATCHING TESTS
// ==========================================
console.log('\n📌 Testing Recurring Event Matching:');

it('matches one-time events on matching date string', () => {
  const event: LifeEvent = {
    id: 'e1',
    title: 'Dentist',
    date: '2026-10-20',
    time: '14:00',
    durationMinutes: 60,
    category: 'health',
    whatToBring: [],
    color: 'stone'
  };
  assert.strictEqual(isEventOnDate(event, '2026-10-20'), true);
  assert.strictEqual(isEventOnDate(event, '2026-10-21'), false);
});

it('matches weekly recurring events across future recurring days', () => {
  // Oct 20, 2026 was a Tuesday (day 2 in JS getDay())
  const tuesdayDate = new Date(2026, 9, 20);
  assert.strictEqual(tuesdayDate.getDay(), 2);

  const recurringEvent: LifeEvent = {
    id: 'e2',
    title: 'Algorithms Lecture',
    date: '2026-10-01',
    time: '10:00',
    durationMinutes: 90,
    category: 'academic',
    whatToBring: [],
    color: 'stone',
    recurringDays: [2, 4] // Tuesdays and Thursdays
  };

  // Matches on Tuesday Oct 20
  assert.strictEqual(isEventOnDate(recurringEvent, tuesdayDate), true);

  // Does NOT match on Wednesday Oct 21 (day 3)
  const wedDate = new Date(2026, 9, 21);
  assert.strictEqual(isEventOnDate(recurringEvent, wedDate), false);

  // Matches on Thursday Oct 22 (day 4)
  const thuDate = new Date(2026, 9, 22);
  assert.strictEqual(isEventOnDate(recurringEvent, thuDate), true);
});

// ==========================================
// 3. SQUAD RADAR COMPACT PAYLOAD & BASE64 TESTS
// ==========================================
console.log('\n📌 Testing Squad Overlap Radar & Payload Compaction:');

it('uses fallback URL when hostname is not survivalos-b63.pages.dev', () => {
  const url = getSquadBaseUrl();
  assert.strictEqual(url, 'https://survivalos-b63.pages.dev');
});

it('encodes squad payload into a compact array base64 string', () => {
  const payload: SquadSharePayload = {
    v: 1,
    curfew: '21:30',
    dateKey: '2026-10-20',
    dayMode: 'routine_work',
    friendName: 'Alex',
    blocks: [
      { startTime: '10:00', endTime: '10:45', title: 'Focus Sprint', category: 'focus', durationMinutes: 45 },
      { startTime: '14:00', endTime: '14:45', title: 'Deep Work', category: 'focus', durationMinutes: 45 }
    ]
  };

  const encoded = encodeSquadPayload(payload);
  assert.ok(encoded.length > 0);
  // Verify it does not contain ugly %22 or { characters
  assert.ok(!encoded.includes('%22'));
  assert.ok(!encoded.includes('{'));
  assert.ok(!encoded.includes('}'));

  // Decode it back
  const decoded = parseSquadPayloadString(encoded);
  assert.ok(decoded !== null);
  assert.strictEqual(decoded.curfew, '21:30');
  assert.strictEqual(decoded.dateKey, '2026-10-20');
  assert.strictEqual(decoded.dayMode, 'routine_work');
  assert.strictEqual(decoded.friendName, 'Alex');
  assert.strictEqual(decoded.blocks.length, 2);
  assert.strictEqual(decoded.blocks[0].startTime, '10:00');
  assert.strictEqual(decoded.blocks[0].endTime, '10:45');
  assert.strictEqual(decoded.blocks[1].startTime, '14:00');
  assert.strictEqual(decoded.blocks[1].endTime, '14:45');
});

it('gracefully decodes legacy JSON object payloads and minimal arrays', () => {
  // Legacy JSON string
  const legacyJson = JSON.stringify({
    v: 1,
    curfew: '22:00',
    dateKey: '2026-10-20',
    dayMode: 'free_rest',
    blocks: [{ startTime: '16:00', endTime: '16:45', title: 'Reading', category: 'study', durationMinutes: 45 }]
  });

  const parsedLegacy = parseSquadPayloadString(legacyJson);
  assert.ok(parsedLegacy !== null);
  assert.strictEqual(parsedLegacy.curfew, '22:00');
  assert.strictEqual(parsedLegacy.dayMode, 'free_rest');
  assert.strictEqual(parsedLegacy.blocks[0].startTime, '16:00');

  // Minimal array JSON string
  const minimalArrayJson = JSON.stringify([
    1,
    '21:00',
    '2026-10-20',
    0,
    [['09:00', '09:45'], ['11:00', '11:45']]
  ]);
  const parsedMinimal = parseSquadPayloadString(minimalArrayJson);
  assert.ok(parsedMinimal !== null);
  assert.strictEqual(parsedMinimal.curfew, '21:00');
  assert.strictEqual(parsedMinimal.dayMode, 'routine_work');
  assert.strictEqual(parsedMinimal.blocks.length, 2);
  assert.strictEqual(parsedMinimal.blocks[0].startTime, '09:00');
  assert.strictEqual(parsedMinimal.blocks[1].endTime, '11:45');
});

it('builds share URLs with #squad= parameter pointing to sanitized domain', () => {
  const payload: SquadSharePayload = {
    v: 1,
    curfew: '21:30',
    dateKey: '2026-10-20',
    dayMode: 'routine_work',
    blocks: [{ startTime: '15:00', endTime: '15:45', title: 'Writing', category: 'focus', durationMinutes: 45 }]
  };
  const shareUrl = buildSquadShareUrl(payload);
  assert.ok(shareUrl.startsWith('https://survivalos-b63.pages.dev#squad='));

  const replyUrl = buildSquadReplyUrl(payload);
  assert.ok(replyUrl.startsWith('https://survivalos-b63.pages.dev#squad='));
  // Reply payload has matched=true
  const replyHash = replyUrl.split('#squad=')[1];
  const decodedReply = parseSquadPayloadString(replyHash);
  assert.ok(decodedReply !== null);
  assert.strictEqual(decodedReply.matched, true);
});

// ==========================================
// 4. STORAGE & DEFAULT SAMPLE SANCTUARY TESTS
// ==========================================
console.log('\n📌 Testing Storage & Sample Data Vanishing:');

it('correctly identifies default items vs user items', () => {
  const defaultTask: WorkTask = {
    id: 't-def',
    title: 'Sample Task',
    estimatedMinutes: 60,
    completedMinutes: 0,
    deadlineDate: '2026-10-25',
    category: 'study',
    color: 'amber',
    priority: 'medium',
    status: 'active',
    isDefault: true,
    createdAt: new Date().toISOString()
  };

  const userTask: WorkTask = {
    ...defaultTask,
    id: 't-user',
    isDefault: false
  };

  assert.strictEqual(isDefaultItem(defaultTask), true);
  assert.strictEqual(isDefaultItem(userTask), false);
});

it('clears default samples while preserving user created items', () => {
  const tasks: WorkTask[] = [
    { id: '1', title: 'Default 1', estimatedMinutes: 45, completedMinutes: 0, deadlineDate: '2026-10-25', category: 'study', color: 'amber', priority: 'medium', status: 'active', isDefault: true, createdAt: '' },
    { id: '2', title: 'My Real Task', estimatedMinutes: 90, completedMinutes: 0, deadlineDate: '2026-10-26', category: 'work', color: 'blue', priority: 'high', status: 'active', isDefault: false, createdAt: '' }
  ];
  const events: LifeEvent[] = [
    { id: 'e1', title: 'Default Event', date: '2026-10-25', time: '12:00', durationMinutes: 60, category: 'health', whatToBring: [], color: 'stone', isDefault: true },
    { id: 'e2', title: 'My Flight', date: '2026-10-27', time: '08:00', durationMinutes: 120, category: 'personal', whatToBring: [], color: 'stone', isDefault: false }
  ];
  const slots: ScheduledSlot[] = [
    { id: 's1', workTaskId: '1', workTitle: 'Default 1', category: 'study', color: 'amber', date: '2026-10-25', startTime: '09:00', endTime: '09:45', durationMinutes: 45, isCompleted: false, chunkNumber: 1, totalChunks: 1, isDefault: true },
    { id: 's2', workTaskId: '2', workTitle: 'My Real Task', category: 'work', color: 'blue', date: '2026-10-25', startTime: '10:00', endTime: '10:45', durationMinutes: 45, isCompleted: false, chunkNumber: 1, totalChunks: 2, isDefault: false }
  ];

  const cleaned = clearSampleData(tasks, events, slots);
  assert.strictEqual(cleaned.tasks.length, 1);
  assert.strictEqual(cleaned.tasks[0].id, '2');
  assert.strictEqual(cleaned.events.length, 1);
  assert.strictEqual(cleaned.events[0].id, 'e2');
  assert.strictEqual(cleaned.slots.length, 1);
  assert.strictEqual(cleaned.slots[0].id, 's2');
});

it('persists and reloads settings, tasks, and recurring events accurately in localStorage', () => {
  // Test settings
  const customSettings: ScheduleSettings = {
    ...DEFAULT_SETTINGS,
    finishDayBeforeDeadline: true,
    interleaveTasks: true,
    focusBlockMinutes: 50
  };
  saveSettings(customSettings);
  const loadedSettings = loadSettings();
  assert.strictEqual(loadedSettings.finishDayBeforeDeadline, true);
  assert.strictEqual(loadedSettings.interleaveTasks, true);
  assert.strictEqual(loadedSettings.focusBlockMinutes, 50);

  // Test recurring event persistence with recurringDays
  const customEvent: LifeEvent = {
    id: 'recur-test',
    title: 'Weekly Seminar',
    date: '2026-10-20',
    time: '15:00',
    durationMinutes: 60,
    category: 'academic',
    whatToBring: [{ id: 'b1', text: 'Notebook', packed: true }],
    color: 'stone',
    recurringDays: [1, 3, 5]
  };
  saveEvents([customEvent]);
  const loadedEvents = loadEvents();
  assert.strictEqual(loadedEvents.length, 1);
  assert.strictEqual(loadedEvents[0].id, 'recur-test');
  assert.deepStrictEqual(loadedEvents[0].recurringDays, [1, 3, 5]);
  assert.strictEqual(loadedEvents[0].whatToBring[0].packed, true);
});

// ==========================================
// 5. AUTONOMOUS SCHEDULING ENGINE TESTS
// ==========================================
console.log('\n📌 Testing Neuro-Adaptive Horizon Scheduler Engine:');

it('breaks large tasks into reasonable chunks and schedules them across days', () => {
  const baseDate = new Date(2026, 9, 20); // Tuesday
  const todayStr = formatDateKey(baseDate);
  const deadlineStr = formatDateKey(addDays(baseDate, 3)); // 3 days later

  const tasks: WorkTask[] = [
    {
      id: 'task-big',
      title: 'Neural Networks Final Project',
      estimatedMinutes: 180, // 3 hours = multiple 45-min chunks
      completedMinutes: 0,
      deadlineDate: deadlineStr,
      category: 'study',
      color: 'indigo',
      priority: 'high',
      status: 'active',
      createdAt: baseDate.toISOString()
    }
  ];

  const events: LifeEvent[] = [];
  const settings = { ...DEFAULT_SETTINGS };

  const slots = recalculateSchedule(tasks, events, settings, [], baseDate);
  assert.ok(slots.length >= 3, `Expected at least 3 chunks for 180 min task, got ${slots.length}`);
  
  // Verify chunks don't overlap on the same day
  const slotsByDay: Record<string, ScheduledSlot[]> = {};
  slots.forEach(slot => {
    slotsByDay[slot.date] = slotsByDay[slot.date] || [];
    slotsByDay[slot.date].push(slot);
  });

  Object.entries(slotsByDay).forEach(([day, daySlots]) => {
    for (let i = 0; i < daySlots.length - 1; i++) {
      const a = daySlots[i];
      const b = daySlots[i + 1];
      assert.ok(a.endTime <= b.startTime, `Overlap detected on ${day}: ${a.endTime} > ${b.startTime}`);
    }
  });
});

it('avoids scheduling during recurring life events', () => {
  const baseDate = new Date(2026, 9, 20); // Tuesday (day 2)
  const todayStr = formatDateKey(baseDate);

  // Recurring Tuesday lecture from 10:00 to 12:00
  const events: LifeEvent[] = [
    {
      id: 'ev-tues',
      title: 'Operating Systems Lab',
      date: todayStr,
      time: '10:00',
      durationMinutes: 120, // 10:00 to 12:00
      category: 'academic',
      whatToBring: [],
      color: 'stone',
      recurringDays: [2] // Tuesday
    }
  ];

  const tasks: WorkTask[] = [
    {
      id: 'task-1',
      title: 'Read OS Paper',
      estimatedMinutes: 45,
      completedMinutes: 0,
      deadlineDate: formatDateKey(addDays(baseDate, 2)),
      category: 'study',
      color: 'stone',
      priority: 'medium',
      status: 'active',
      createdAt: baseDate.toISOString()
    }
  ];

  const settings = { ...DEFAULT_SETTINGS };
  const slots = recalculateSchedule(tasks, events, settings, [], baseDate);
  const todaySlots = slots.filter(s => s.date === todayStr);

  // No slot should start between 10:00 and 12:00
  todaySlots.forEach(s => {
    const clashes = (s.startTime >= '10:00' && s.startTime < '12:00') ||
                    (s.endTime > '10:00' && s.endTime <= '12:00');
    assert.strictEqual(clashes, false, `Slot ${s.startTime}-${s.endTime} clashed with 10:00-12:00 event!`);
  });
});

it('enforces finishDayBeforeDeadline buffer when enabled', () => {
  const baseDate = new Date(2026, 9, 20);
  const deadlineDate = addDays(baseDate, 2);
  const deadlineStr = formatDateKey(deadlineDate);

  const tasks: WorkTask[] = [
    {
      id: 'task-deadline',
      title: 'Thesis Final Submission',
      estimatedMinutes: 60,
      completedMinutes: 0,
      deadlineDate: deadlineStr,
      category: 'work',
      color: 'red',
      priority: 'high',
      status: 'active',
      createdAt: baseDate.toISOString()
    }
  ];

  const settings: ScheduleSettings = {
    ...DEFAULT_SETTINGS,
    finishDayBeforeDeadline: true
  };

  const slots = recalculateSchedule(tasks, [], settings, [], baseDate);
  // With finishDayBeforeDeadline true, no slot for this task should be scheduled on or after the deadline date!
  slots.forEach(s => {
    assert.ok(s.date < deadlineStr, `Slot scheduled on deadline day ${s.date} when buffer is active!`);
  });
});

console.log(`\n🎉 ALL ${passedTests}/${totalTests} TESTS PASSED WITH 100% SUCCESS!`);
