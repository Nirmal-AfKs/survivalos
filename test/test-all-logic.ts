import assert from 'node:assert';
import { 
  formatDateKey, 
  parseDateKey, 
  addDays, 
  recalculateSchedule,
  calculateTodayCapacity
} from '../src/utils/scheduler';
import { 
  encodeSquadPayload, 
  parseSquadPayloadString, 
  buildSquadShareUrl, 
  buildSquadReplyUrl, 
  getSquadBaseUrl,
  getLiveBaseUrl,
  getExactLiveSiteUrl,
  encodePairPayload,
  parsePairPayloadString,
  buildPairShareUrl,
  CadencePairData
} from '../src/utils/squad';
import { 
  cleanTaskTitle, 
  formatChunkTitle, 
  formatRecurringDaysShort, 
  isEventOnDate, 
  RECURRING_WEEK_DAYS,
  calculateEndTime,
  calculateDurationFromTimes,
  formatEventTimeSpan,
  formatBufferLabel
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
import { 
  encodeTemplatePayload, 
  decodeTemplatePayload, 
  materializeTemplate, 
  buildTemplateShareUrl,
  CourseTemplatePayload 
} from '../src/utils/template';
import {
  getMasterVolume,
  setMasterVolume,
  getMasterSoundscape,
  setMasterSoundscape,
  getTrackVolumes,
  saveTrackVolume
} from '../src/utils/audio';
import {
  parseRawCourseOutline,
  parseOutlineLine
} from '../src/utils/outlineParser';
import {
  getAddonStatus,
  setAddonUnlocked,
  resetAddonsToFree,
  applyBypassCode,
  ADDON_PRICING,
  PRO_ADDON,
  PRO_CHECKOUT_URL,
  WHOP_ANNUAL_CHECKOUT_URL,
  WHOP_MONTHLY_CHECKOUT_URL,
  checkAndApplyPostPurchaseUnlock
} from '../src/utils/addons';

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

it('dynamically uses live site origin rather than hardcoded domain', () => {
  // When window is undefined (e.g. Node test environment)
  const defaultUrl = getSquadBaseUrl();
  assert.strictEqual(defaultUrl, 'https://cadence.app');
  assert.strictEqual(getLiveBaseUrl(), 'https://cadence.app');
  assert.ok(!defaultUrl.includes('survivalos-b63.pages.dev'));

  // When window is present (browser runtime)
  const originalWindow = (global as any).window;
  try {
    (global as any).window = {
      location: {
        origin: 'https://ais-dev-example.asia-southeast1.run.app',
        pathname: '/',
        href: 'https://ais-dev-example.asia-southeast1.run.app/?utm_source=test#squad=old',
        hostname: 'ais-dev-example.asia-southeast1.run.app',
      }
    };
    const liveUrl = getSquadBaseUrl();
    assert.strictEqual(liveUrl, 'https://ais-dev-example.asia-southeast1.run.app');
    
    // Exact live site URL stripped of query params and hash for PWA install QR code
    const exactPwaUrl = getExactLiveSiteUrl();
    assert.strictEqual(exactPwaUrl, 'https://ais-dev-example.asia-southeast1.run.app/');

    // With subpath
    (global as any).window.location.pathname = '/cadence/';
    (global as any).window.location.href = 'https://ais-dev-example.asia-southeast1.run.app/cadence/?test=1';
    assert.strictEqual(getSquadBaseUrl(), 'https://ais-dev-example.asia-southeast1.run.app/cadence');
    assert.strictEqual(getExactLiveSiteUrl(), 'https://ais-dev-example.asia-southeast1.run.app/cadence/');
  } finally {
    (global as any).window = originalWindow;
  }
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

it('builds share URLs with #squad= parameter pointing to dynamic live domain', () => {
  const payload: SquadSharePayload = {
    v: 1,
    curfew: '21:30',
    dateKey: '2026-10-20',
    dayMode: 'routine_work',
    blocks: [{ startTime: '15:00', endTime: '15:45', title: 'Writing', category: 'focus', durationMinutes: 45 }]
  };
  const shareUrl = buildSquadShareUrl(payload);
  assert.ok(shareUrl.startsWith('https://cadence.app#squad='));
  assert.ok(!shareUrl.includes('survivalos-b63.pages.dev'));

  const replyUrl = buildSquadReplyUrl(payload);
  assert.ok(replyUrl.startsWith('https://cadence.app#squad='));
  // Reply payload has matched=true
  const replyHash = replyUrl.split('#squad=')[1];
  const decodedReply = parseSquadPayloadString(replyHash);
  assert.ok(decodedReply !== null);
  assert.strictEqual(decodedReply.matched, true);
});

it('encodes and decodes Pair with Phone cadence sync payloads seamlessly', () => {
  const pairData: CadencePairData = {
    v: 1,
    pro: true,
    dateKey: '2026-10-20',
    tasks: [
      {
        title: 'Microeconomics Problem Set',
        estimatedMinutes: 60,
        completedMinutes: 0,
        category: 'academic',
        priority: 'high',
        color: 'stone',
      },
      {
        title: 'Organic Chemistry Lab Notes',
        estimatedMinutes: 90,
        completedMinutes: 30,
        category: 'study',
        priority: 'medium',
        color: 'emerald',
      }
    ],
    events: [
      {
        title: 'Department Seminar',
        time: '14:00',
        date: '2026-10-20',
        durationMinutes: 60,
        category: 'academic',
        color: 'stone',
      }
    ],
    settings: {
      averageDay: { startHour: '08:30', endHour: '21:00', applicableDays: [1, 2, 3, 4, 5] },
      fullyHomeDay: { startHour: '09:00', endHour: '22:00', applicableDays: [0, 6], lunchBreakStart: '12:30', lunchBreakEnd: '13:30' },
      breakIntervalMinutes: 10,
      focusBlockMinutes: 45,
    }
  };

  const encoded = encodePairPayload(pairData);
  assert.ok(encoded.length > 0);
  assert.ok(!encoded.includes('{'));

  // Test pair share URL
  const pairUrl = buildPairShareUrl(pairData);
  assert.ok(pairUrl.startsWith('https://cadence.app#pair='));
  assert.ok(!pairUrl.includes('survivalos'));

  // Decode back
  const decoded = parsePairPayloadString(encoded);
  assert.ok(decoded !== null);
  assert.strictEqual(decoded.v, 1);
  assert.strictEqual(decoded.pro, true);
  assert.strictEqual(decoded.dateKey, '2026-10-20');
  assert.strictEqual(decoded.tasks?.length, 2);
  assert.strictEqual(decoded.tasks?.[0].title, 'Microeconomics Problem Set');
  assert.strictEqual(decoded.tasks?.[0].estimatedMinutes, 60);
  assert.strictEqual(decoded.tasks?.[1].title, 'Organic Chemistry Lab Notes');
  assert.strictEqual(decoded.tasks?.[1].completedMinutes, 30);
  assert.strictEqual(decoded.events?.length, 1);
  assert.strictEqual(decoded.events?.[0].title, 'Department Seminar');
  assert.strictEqual(decoded.events?.[0].time, '14:00');
  assert.strictEqual(decoded.settings?.averageDay?.startHour, '08:30');
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

it('gracefully moves overflowing chunks to Unscheduled / Capacity Exceeded holding shelf when capacity is exceeded', () => {
  const baseDate = new Date(2026, 9, 20);
  // Task needs 20 hours (40 chunks of 30 min), but deadline is tomorrow
  const tasks: WorkTask[] = [
    {
      id: 'task-overflow',
      title: 'Massive Research Compendium',
      estimatedMinutes: 20 * 60, // 1200 mins
      completedMinutes: 0,
      deadlineDate: formatDateKey(addDays(baseDate, 1)), // Tomorrow
      category: 'academic',
      color: 'amber',
      priority: 'high',
      status: 'active',
      createdAt: baseDate.toISOString()
    }
  ];

  const settings: ScheduleSettings = {
    ...DEFAULT_SETTINGS,
    finishDayBeforeDeadline: false
  };

  const slots = recalculateSchedule(tasks, [], settings, [], baseDate);
  const unscheduled = slots.filter(s => s.isUnscheduled);

  assert.ok(unscheduled.length > 0, 'Expected overflowing chunks to be placed in holding shelf');
  assert.strictEqual(unscheduled[0].date, 'unscheduled');
  assert.strictEqual(unscheduled[0].unscheduledReason, 'Capacity exceeded before deadline window');
});

// ==========================================
// 5. PWA MANIFEST & INSTALLABILITY
// ==========================================
console.log('\n📌 Testing PWA Manifest & Web Standards:');

it('validates PWA manifest.json configuration for standalone offline installation', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const manifestPath = path.resolve('public/manifest.json');
  assert.ok(fs.existsSync(manifestPath), 'manifest.json must exist in public directory');
  
  const content = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  assert.strictEqual(content.display, 'standalone', 'display must be standalone');
  assert.ok(content.start_url, 'start_url must be defined');
  assert.ok(content.theme_color, 'theme_color must match aesthetic');
  assert.ok(Array.isArray(content.icons), 'icons must be an array');
  assert.ok(content.icons.some((i: any) => i.sizes === '192x192'), 'must include 192x192 icon');
  assert.ok(content.icons.some((i: any) => i.sizes === '512x512'), 'must include 512x512 icon');
});

// ==========================================
// 6. 1-CLICK COURSE TEMPLATE ENGINE TESTS
// ==========================================
console.log('\n📌 Testing 1-Click Course Template Engine (Scenario C+ Hyperedge Seeding):');

it('encodes and decodes course syllabus templates using compact base64 representation', () => {
  const sampleTemplate: CourseTemplatePayload = {
    v: 1,
    name: 'Organic Chemistry Fall Syllabus',
    tasks: [
      {
        title: 'Reaction Mechanisms Problem Set 1',
        estimatedMinutes: 180,
        relativeDays: 3,
        category: 'academic',
        priority: 'high',
        color: 'stone'
      },
      {
        title: 'Midterm 1 Examination Prep',
        estimatedMinutes: 300,
        relativeDays: 8,
        category: 'study',
        priority: 'high',
        color: 'stone'
      }
    ],
    events: [
      {
        title: 'Orgo Lecture',
        time: '10:00',
        durationMinutes: 90,
        recurringDays: [1, 3], // Mon, Wed
        category: 'academic'
      }
    ]
  };

  const encoded = encodeTemplatePayload(sampleTemplate);
  assert.ok(encoded.length > 0, 'Encoded string should be non-empty');
  assert.strictEqual(typeof encoded, 'string');

  const decoded = decodeTemplatePayload(encoded);
  assert.ok(decoded !== null, 'Decoded template must not be null');
  assert.strictEqual(decoded!.name, 'Organic Chemistry Fall Syllabus');
  assert.strictEqual(decoded!.tasks.length, 2);
  assert.strictEqual(decoded!.tasks[0].title, 'Reaction Mechanisms Problem Set 1');
  assert.strictEqual(decoded!.tasks[0].estimatedMinutes, 180);
  assert.strictEqual(decoded!.tasks[0].relativeDays, 3);
  assert.strictEqual(decoded!.events?.length, 1);
  assert.strictEqual(decoded!.events![0].title, 'Orgo Lecture');
});

it('materializes template tasks with relative deadlines anchored to local today date', () => {
  const template: CourseTemplatePayload = {
    v: 1,
    name: 'Calculus III Intensive',
    tasks: [
      {
        title: 'Vector Fields Homework',
        estimatedMinutes: 90,
        relativeDays: 2,
        category: 'academic'
      },
      {
        title: 'Green Theorem Project',
        estimatedMinutes: 240,
        relativeDays: 7,
        category: 'academic'
      }
    ]
  };

  const baseDate = new Date(2026, 9, 20); // Tuesday, Oct 20
  const result = materializeTemplate(template, baseDate);

  assert.strictEqual(result.tasks.length, 2);
  // Task 1: 2 days after Oct 20 -> Oct 22
  assert.strictEqual(result.tasks[0].deadlineDate, '2026-10-22');
  assert.strictEqual(result.tasks[0].title, 'Vector Fields Homework');
  assert.strictEqual(result.tasks[0].estimatedMinutes, 90);
  // Task 2: 7 days after Oct 20 -> Oct 27
  assert.strictEqual(result.tasks[1].deadlineDate, '2026-10-27');
  assert.strictEqual(result.tasks[1].title, 'Green Theorem Project');
});

it('builds valid template share URLs with #template= fragment', () => {
  const template: CourseTemplatePayload = {
    v: 1,
    name: 'CS106B',
    tasks: [
      { title: 'Recursion Lab', estimatedMinutes: 60, relativeDays: 1, category: 'academic' }
    ]
  };

  const url = buildTemplateShareUrl(template);
  assert.ok(url.includes('#template='), 'Share URL must contain #template=');
  assert.ok(url.startsWith('https://'), 'Share URL must use secure https://');
});

// ==========================================
// 8. MASTER VOLUME & PROCEDURAL SOUNDSCAPES
// ==========================================
console.log('📌 Testing Master Volume & Procedural Soundscapes:');

it('correctly returns 0.75 default master volume when unset', () => {
  localStorage.removeItem('cadence_master_volume');
  assert.strictEqual(getMasterVolume(), 0.75);
});

it('clamps and persists master volume updates between 0.0 and 1.0 in localStorage', () => {
  setMasterVolume(0.85);
  assert.strictEqual(getMasterVolume(), 0.85);

  // Test lower clamp
  setMasterVolume(-0.2);
  assert.strictEqual(getMasterVolume(), 0);

  // Test upper clamp
  setMasterVolume(1.5);
  assert.strictEqual(getMasterVolume(), 1);

  // Reset to default 75%
  setMasterVolume(0.75);
  assert.strictEqual(getMasterVolume(), 0.75);
});

it('defaults to none soundscape when unset and persists valid nature soundscapes', () => {
  localStorage.removeItem('cadence_focus_soundscape');
  assert.strictEqual(getMasterSoundscape(), 'none');

  setMasterSoundscape('waves');
  assert.strictEqual(getMasterSoundscape(), 'waves');

  setMasterSoundscape('rain');
  assert.strictEqual(getMasterSoundscape(), 'rain');

  setMasterSoundscape('brook');
  assert.strictEqual(getMasterSoundscape(), 'brook');

  setMasterSoundscape('none');
  assert.strictEqual(getMasterSoundscape(), 'none');
});

// ============================================================
// 9. EVENT START/END TIMES & WORK BUFFER PROTECTION CORRIDORS
// ============================================================
console.log('📌 Testing Event Start/End Times & Work Buffer Corridors:');

it('calculates ending time and handles positive and negative offsets accurately', () => {
  assert.strictEqual(calculateEndTime('14:00', 90), '15:30');
  assert.strictEqual(calculateEndTime('09:00', 60), '10:00');
  assert.strictEqual(calculateEndTime('10:00', -30), '09:30'); // Work pause before event
  assert.strictEqual(calculateEndTime('15:30', 45), '16:15'); // Work resume after event
});

it('calculates duration in minutes accurately between start and end times', () => {
  assert.strictEqual(calculateDurationFromTimes('10:00', '11:30'), 90);
  assert.strictEqual(calculateDurationFromTimes('13:15', '14:45'), 90);
  assert.strictEqual(calculateDurationFromTimes('15:00', '16:00'), 60);
});

it('formats event time spans and buffer labels for clear human reading', () => {
  const eventWithEnd: LifeEvent = {
    id: 'e1',
    title: 'Design Review',
    date: '2026-10-25',
    time: '10:00',
    endTime: '11:30',
    durationMinutes: 90,
    category: 'academic',
    color: 'indigo',
    whatToBring: []
  };
  assert.strictEqual(formatEventTimeSpan(eventWithEnd), '10:00 – 11:30');

  const eventWithoutEnd: LifeEvent = {
    id: 'e2',
    title: 'Lab Session',
    date: '2026-10-25',
    time: '14:00',
    durationMinutes: 60,
    category: 'academic',
    color: 'emerald',
    whatToBring: []
  };
  assert.strictEqual(formatEventTimeSpan(eventWithoutEnd), '14:00 – 15:00');

  assert.strictEqual(formatBufferLabel(0), '0m');
  assert.strictEqual(formatBufferLabel(15), '15m');
  assert.strictEqual(formatBufferLabel(45), '45m');
  assert.strictEqual(formatBufferLabel(60), '1h');
  assert.strictEqual(formatBufferLabel(90), '1.5h');
  assert.strictEqual(formatBufferLabel(120), '2h');
});

it('strictly preserves work blackout buffer corridor before and after life events', () => {
  const baseDate = new Date(2026, 9, 25); // Sunday (2026-10-25)
  const targetDateKey = formatDateKey(baseDate);
  const testSettings: ScheduleSettings = {
    ...DEFAULT_SETTINGS,
    dateSpecificModes: { [targetDateKey]: 'fully_home' },
    fullyHomeDay: {
      ...DEFAULT_SETTINGS.fullyHomeDay,
      startHour: '09:00',
      endHour: '18:00',
      applicableDays: [0, 6],
      maxDailyMinutes: 360,
    },
    focusBlockMinutes: 45,
    breakIntervalMinutes: 15,
  };

  // Event from 13:00 to 14:30 with 30m prep buffer and 45m recovery buffer
  // Blackout corridor must span 12:30 to 15:15
  const protectedEvent: LifeEvent = {
    id: 'ev-protected-symposium',
    title: 'Thesis Symposium',
    date: targetDateKey,
    time: '13:00',
    endTime: '14:30',
    durationMinutes: 90,
    bufferBeforeMinutes: 30, // Stop work at 12:30
    bufferAfterMinutes: 45,  // Resume work at 15:15
    category: 'academic',
    color: 'indigo',
    whatToBring: []
  };

  const testTask: WorkTask = {
    id: 'task-long-prep',
    title: 'Prepare Presentation Slides',
    category: 'academic',
    deadlineDate: formatDateKey(addDays(baseDate, 3)),
    estimatedMinutes: 270,
    completedMinutes: 0,
    color: 'emerald',
    priority: 'high',
    status: 'active',
    createdAt: baseDate.toISOString(),
  };

  const slots = recalculateSchedule(
    [testTask],
    [protectedEvent],
    testSettings,
    [],
    baseDate
  );

  const daySlots = slots.filter(s => s.date === targetDateKey);
  assert.ok(daySlots.length > 0, 'Should have generated slots for fully_home day');

  // Verify that NO slot falls inside the blackout corridor [12:30 (750m), 15:15 (915m)]
  const corridorStartMinutes = 12 * 60 + 30; // 750
  const corridorEndMinutes = 15 * 60 + 15;   // 915

  for (const slot of daySlots) {
    const [sh, sm] = slot.startTime.split(':').map(Number);
    const [eh, em] = slot.endTime.split(':').map(Number);
    const slotStartMin = sh * 60 + sm;
    const slotEndMin = eh * 60 + em;

    const overlaps = (slotStartMin < corridorEndMinutes && slotEndMin > corridorStartMinutes);
    assert.strictEqual(
      overlaps, 
      false, 
      `Slot ${slot.startTime}-${slot.endTime} must not overlap protected buffer corridor 12:30-15:15`
    );
  }
});

// ============================================================
// 10. REALITY & CAPACITY METRICS CALCULATION
// ============================================================
console.log('📌 Testing Daylight Reality & Capacity Calculation:');

it('calculates remaining daylight capacity accurately factoring out past time and completed blocks', () => {
  const baseDate = new Date(2026, 9, 21, 14, 0); // 14:00 (2:00 PM)
  const targetDateKey = formatDateKey(baseDate);

  const testSettings: ScheduleSettings = {
    ...DEFAULT_SETTINGS,
    dateSpecificModes: { [targetDateKey]: 'fully_home' },
    fullyHomeDay: {
      ...DEFAULT_SETTINGS.fullyHomeDay,
      startHour: '09:00',
      endHour: '18:00',
      lunchBreakStart: '12:00',
      lunchBreakEnd: '13:00',
      applicableDays: [0, 1, 2, 3, 4, 5, 6],
    },
    focusBlockMinutes: 60,
    breakIntervalMinutes: 0,
  };

  // Day slots would normally be:
  // 09:00-10:00, 10:00-11:00, 11:00-12:00, (12-13 lunch), 13:00-14:00, 14:00-15:00, 15:00-16:00, 16:00-17:00, 17:00-18:00
  // Total = 8 slots across the entire day

  // At 14:00, past slots: 09:00, 10:00, 11:00, 13:00 (4 past slots)
  // Remaining slots starting at or after 14:00: 14:00, 15:00, 16:00, 17:00 (4 open slots)

  const existingCompletedSlot: ScheduledSlot = {
    id: 's-comp-1',
    workTaskId: 't1',
    workTitle: 'Morning Work',
    category: 'work',
    color: 'stone',
    date: targetDateKey,
    startTime: '14:00',
    endTime: '15:00',
    durationMinutes: 60,
    isCompleted: true,
    chunkNumber: 1,
    totalChunks: 1,
  };

  const capacity = calculateTodayCapacity(
    testSettings,
    [],
    [existingCompletedSlot],
    baseDate
  );

  assert.strictEqual(capacity.totalDaylightSlots, 8);
  assert.strictEqual(capacity.completedSlotsCount, 1);
  // Open remaining slots after 14:00 minus the completed 14:00 slot = 3 slots (15:00, 16:00, 17:00)
  assert.strictEqual(capacity.remainingOpenSlotsCount, 3);
  assert.strictEqual(capacity.remainingMinutesAvailable, 180);
});

// ============================================================
// 11. COGNITIVE TRIAGE DEFERRAL & SCHEDULE REFLOW (EDF)
// ============================================================
console.log('📌 Testing Cognitive Triage Deferral & Schedule Reflow:');

it('strictly removes deferred tasks from today and reflows kept tasks with EDF priority', () => {
  const baseDate = new Date(2026, 9, 21); // Today
  const todayKey = formatDateKey(baseDate);
  const tomorrowKey = formatDateKey(addDays(baseDate, 1));
  const plus3Key = formatDateKey(addDays(baseDate, 3));

  const testSettings: ScheduleSettings = {
    ...DEFAULT_SETTINGS,
    dateSpecificModes: { [todayKey]: 'routine_work' },
    averageDay: {
      startHour: '18:00',
      endHour: '20:00', // 2 hours = two 45m blocks
      applicableDays: [0, 1, 2, 3, 4, 5, 6],
    },
    focusBlockMinutes: 45,
    breakIntervalMinutes: 15,
  };

  // Task A: Urgent deadline tomorrow, but user deferred to tomorrow during triage
  const taskA_Deferred: WorkTask = {
    id: 'task-a',
    title: 'Deferred Heavy Analysis',
    category: 'work',
    deadlineDate: tomorrowKey,
    deferredUntilDate: tomorrowKey, // Deferred!
    estimatedMinutes: 45,
    completedMinutes: 0,
    color: 'indigo',
    priority: 'high',
    status: 'active',
    createdAt: baseDate.toISOString(),
  };

  // Task B: Urgent task kept for today
  const taskB_Kept: WorkTask = {
    id: 'task-b',
    title: 'Kept Urgent Revision',
    category: 'study',
    deadlineDate: plus3Key,
    estimatedMinutes: 45,
    completedMinutes: 0,
    color: 'emerald',
    priority: 'high',
    status: 'active',
    createdAt: baseDate.toISOString(),
  };

  const rebalanced = recalculateSchedule(
    [taskA_Deferred, taskB_Kept],
    [],
    testSettings,
    [],
    baseDate
  );

  const todaySlots = rebalanced.filter(s => s.date === todayKey);
  
  // Task A must NOT be scheduled today
  assert.strictEqual(todaySlots.some(s => s.workTaskId === 'task-a'), false, 'Deferred task must not be scheduled today');
  
  // Task B must be scheduled today in the open slot
  assert.strictEqual(todaySlots.some(s => s.workTaskId === 'task-b'), true, 'Kept task must be scheduled today');

  // Task A should be scheduled starting tomorrow
  const tomorrowSlots = rebalanced.filter(s => s.date === tomorrowKey);
  assert.strictEqual(tomorrowSlots.some(s => s.workTaskId === 'task-a'), true, 'Deferred task resumes tomorrow');
});

// ==========================================
// 10. FAST COURSE NOTES & SYLLABUS REGEX PARSING TESTS
// ==========================================
console.log('\n📌 Testing Course Outline Regex & 30m Chunking Engine:');

it('parses "Calculus Review - 90m" into 90m total and 3 30m chunks', () => {
  const parsed = parseOutlineLine('Calculus Review - 90m');
  assert.ok(parsed, 'Line should be parsed');
  assert.strictEqual(parsed!.title, 'Calculus Review');
  assert.strictEqual(parsed!.durationMinutes, 90);
  assert.strictEqual(parsed!.chunks.length, 3);
  assert.strictEqual(parsed!.chunks[0].title, 'Calculus Review (Part 1 of 3)');
  assert.strictEqual(parsed!.chunks[1].title, 'Calculus Review (Part 2 of 3)');
  assert.strictEqual(parsed!.chunks[2].title, 'Calculus Review (Part 3 of 3)');
});

it('parses "Lab Report 2h" into 120m and 4 30m chunks', () => {
  const parsed = parseOutlineLine('Lab Report 2h');
  assert.ok(parsed, 'Line should be parsed');
  assert.strictEqual(parsed!.title, 'Lab Report');
  assert.strictEqual(parsed!.durationMinutes, 120);
  assert.strictEqual(parsed!.chunks.length, 4);
});

it('parses "Organic Chemistry Mechanisms (45m)" into 45m and 2 30m chunks', () => {
  const parsed = parseOutlineLine('Organic Chemistry Mechanisms (45m)');
  assert.ok(parsed, 'Line should be parsed');
  assert.strictEqual(parsed!.title, 'Organic Chemistry Mechanisms');
  assert.strictEqual(parsed!.durationMinutes, 45);
  // Math.max(1, Math.ceil(45 / 30)) = 2 chunks
  assert.strictEqual(parsed!.chunks.length, 2);
  assert.strictEqual(parsed!.chunks[0].durationMinutes, 30);
  assert.strictEqual(parsed!.chunks[1].durationMinutes, 15);
});

it('defaults to 30m when no duration pattern is provided in line', () => {
  const parsed = parseOutlineLine('Machine Learning Paper Reading');
  assert.ok(parsed, 'Line should be parsed');
  assert.strictEqual(parsed!.title, 'Machine Learning Paper Reading');
  assert.strictEqual(parsed!.durationMinutes, 30);
  assert.strictEqual(parsed!.chunks.length, 1);
  assert.strictEqual(parsed!.chunks[0].title, 'Machine Learning Paper Reading');
});

it('parses mixed multiline syllabus outlines ignoring blank lines and leading bullets', () => {
  const raw = `
    * Calculus Review - 90m
    - Lab Report 2h
    
    1. Organic Chemistry Mechanisms (45m)
    Machine Learning Paper Reading
  `;
  const result = parseRawCourseOutline(raw);
  assert.strictEqual(result.tasks.length, 4);
  assert.strictEqual(result.totalDurationMinutes, 90 + 120 + 45 + 30); // 285 mins
  assert.strictEqual(result.totalChunks, 3 + 4 + 2 + 1); // 10 30m chunks
  assert.strictEqual(result.tasks[0].title, 'Calculus Review');
  assert.strictEqual(result.tasks[1].title, 'Lab Report');
  assert.strictEqual(result.tasks[2].title, 'Organic Chemistry Mechanisms');
  assert.strictEqual(result.tasks[3].title, 'Machine Learning Paper Reading');
});

it('parses natural deadline tags "@ tomorrow", "@ Friday", "@ in 3 days", and defaults to 2 days', () => {
  const baseDate = new Date(2026, 9, 20); // Tuesday, Oct 20, 2026
  
  // 1. @ tomorrow
  const taskTomorrow = parseOutlineLine('Calculus Review - 90m @ tomorrow', 0, baseDate);
  assert.ok(taskTomorrow);
  assert.strictEqual(taskTomorrow!.title, 'Calculus Review');
  assert.strictEqual(taskTomorrow!.durationMinutes, 90);
  assert.strictEqual(taskTomorrow!.deadlineDate, '2026-10-21'); // Wednesday (tomorrow)
  assert.strictEqual(taskTomorrow!.relativeDays, 1);
  assert.strictEqual(taskTomorrow!.deadlineLabel, 'Tomorrow');

  // 2. @ Friday
  const taskFriday = parseOutlineLine('Lab Report 2h @ Friday', 1, baseDate);
  assert.ok(taskFriday);
  assert.strictEqual(taskFriday!.title, 'Lab Report');
  assert.strictEqual(taskFriday!.durationMinutes, 120);
  assert.strictEqual(taskFriday!.deadlineDate, '2026-10-23'); // Friday (3 days from Tuesday)
  assert.strictEqual(taskFriday!.relativeDays, 3);
  assert.strictEqual(taskFriday!.deadlineLabel, 'Friday');

  // 3. @ in 3 days
  const task3Days = parseOutlineLine('Organic Chemistry Mechanisms (45m) @ in 3 days', 2, baseDate);
  assert.ok(task3Days);
  assert.strictEqual(task3Days!.title, 'Organic Chemistry Mechanisms');
  assert.strictEqual(task3Days!.durationMinutes, 45);
  assert.strictEqual(task3Days!.deadlineDate, '2026-10-23'); // 3 days from Oct 20
  assert.strictEqual(task3Days!.relativeDays, 3);
  assert.strictEqual(task3Days!.deadlineLabel, 'In 3 days');

  // 4. Default fallback: No @ deadline tag defaults to 2 days from today
  const taskFallback = parseOutlineLine('Machine Learning Paper Reading', 3, baseDate);
  assert.ok(taskFallback);
  assert.strictEqual(taskFallback!.title, 'Machine Learning Paper Reading');
  assert.strictEqual(taskFallback!.deadlineDate, '2026-10-22'); // 2 days from Oct 20
  assert.strictEqual(taskFallback!.relativeDays, 2);
  assert.strictEqual(taskFallback!.deadlineLabel, 'In 2 days (Default)');
});

it('projects chunk landing labels across the week (e.g. Part 1: Today | Part 2: Tomorrow | Part 3: Friday)', () => {
  const baseDate = new Date(2026, 9, 20); // Tuesday, Oct 20, 2026
  
  // 3 chunks due on Friday (3 days from Tuesday)
  const task = parseOutlineLine('Calculus Review - 90m @ Friday', 0, baseDate);
  assert.ok(task);
  assert.strictEqual(task!.chunks.length, 3);
  assert.strictEqual(task!.chunks[0].plannedDayLabel, 'Today');
  assert.strictEqual(task!.chunks[1].plannedDayLabel, 'Tomorrow');
  assert.strictEqual(task!.chunks[2].plannedDayLabel, 'Friday');

  // 4 chunks due on Friday
  const labTask = parseOutlineLine('Lab Report 2h @ Friday', 1, baseDate);
  assert.ok(labTask);
  assert.strictEqual(labTask!.chunks.length, 4);
  assert.strictEqual(labTask!.chunks[0].plannedDayLabel, 'Today');
  assert.strictEqual(labTask!.chunks[1].plannedDayLabel, 'Tomorrow');
  assert.strictEqual(labTask!.chunks[2].plannedDayLabel, 'Thursday');
  assert.strictEqual(labTask!.chunks[3].plannedDayLabel, 'Friday');
});

it('distributes imported outline tasks across multi-day schedule avoiding capacity exceeded overflow', () => {
  const baseDate = new Date(2026, 9, 20); // Tuesday, Oct 20, 2026
  const raw = `
    Calculus Review - 90m @ tomorrow
    Lab Report 2h @ Friday
    Organic Chemistry Mechanisms (45m) @ in 3 days
    Machine Learning Paper Reading
  `;
  const result = parseRawCourseOutline(raw, baseDate);
  assert.strictEqual(result.tasks.length, 4);
  assert.strictEqual(result.totalChunks, 10); // 3 + 4 + 2 + 1 = 10 chunks (5 hours)

  // Convert to WorkTasks with their parsed multi-day deadlineDates
  const newTasks: WorkTask[] = result.tasks.map((item, idx) => ({
    id: `task-imported-${idx}`,
    title: item.title,
    estimatedMinutes: item.durationMinutes,
    completedMinutes: 0,
    deadlineDate: item.deadlineDate, // Multi-day deadline!
    category: 'academic',
    color: 'indigo',
    priority: 'high',
    status: 'active',
    createdAt: baseDate.toISOString(),
  }));

  const settings: ScheduleSettings = {
    ...DEFAULT_SETTINGS,
    finishDayBeforeDeadline: false,
    focusBlockMinutes: 30,
    breakIntervalMinutes: 10,
    averageDay: {
      startHour: '18:00',
      endHour: '21:30', // 3.5 hours per evening
      applicableDays: [1, 2, 3, 4, 5],
    },
  };

  const slots = recalculateSchedule(newTasks, [], settings, [], baseDate);
  
  // Verify chunks are distributed across multiple days (not crammed into today)
  const scheduledDays = new Set(slots.filter(s => !s.isUnscheduled).map(s => s.date));
  assert.ok(scheduledDays.size >= 3, `Expected chunks distributed across at least 3 days, got ${scheduledDays.size}`);

  // Crucial fix: ZERO chunks should enter the yellow "Capacity Exceeded / Holding" shelf
  const unscheduled = slots.filter(s => s.isUnscheduled);
  assert.strictEqual(unscheduled.length, 0, `Expected 0 unscheduled capacity exceeded chunks, got ${unscheduled.length}`);
});

// ==========================================
// 11. CADENCE PRO ADD-ON & LICENSING TESTS
// ==========================================
console.log('\n📌 Testing Cadence Pro Importer Licensing, Bypass & Whop Checkout:');

it('starts with Cadence Pro locked in free tier by default', () => {
  resetAddonsToFree();
  const status = getAddonStatus();
  assert.strictEqual(status.importer, false);
});

it('applies "test-importer" bypass code to unlock Cadence Pro', () => {
  resetAddonsToFree();
  const res = applyBypassCode('test-importer');
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.unlocked.importer, true);
  assert.strictEqual(getAddonStatus().importer, true);
});

it('applies "test-all" bypass code to unlock Cadence Pro', () => {
  resetAddonsToFree();
  const res = applyBypassCode('test-all');
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.unlocked.importer, true);
  assert.strictEqual(getAddonStatus().importer, true);
});

it('rejects invalid or misspelled bypass codes with clean feedback', () => {
  const res = applyBypassCode('unknown-code-xyz');
  assert.strictEqual(res.success, false);
});

it('resets Cadence Pro back to free tier', () => {
  applyBypassCode('test-all');
  resetAddonsToFree();
  const status = getAddonStatus();
  assert.strictEqual(status.importer, false);
});

it('contains correct Whop live checkout link and pricing structure', () => {
  assert.strictEqual(PRO_CHECKOUT_URL, 'https://whop.com/softmarket-2/cadence-pro-course-importer');
  assert.strictEqual(WHOP_ANNUAL_CHECKOUT_URL, 'https://whop.com/checkout/plan_1Hv3fzf6nWAxP');
  assert.strictEqual(WHOP_MONTHLY_CHECKOUT_URL, 'https://whop.com/checkout/plan_r9yJOZILo1wsG');
  assert.strictEqual(PRO_ADDON.checkoutUrl, 'https://whop.com/softmarket-2/cadence-pro-course-importer');
  assert.strictEqual(PRO_ADDON.annualCheckoutUrl, 'https://whop.com/checkout/plan_1Hv3fzf6nWAxP');
  assert.strictEqual(PRO_ADDON.monthlyCheckoutUrl, 'https://whop.com/checkout/plan_r9yJOZILo1wsG');
  assert.strictEqual(PRO_ADDON.monthlyPrice, 4);
  assert.strictEqual(PRO_ADDON.yearlyPrice, 24);
});

it('detects ?unlocked=true URL param and unlocks Cadence Pro', () => {
  resetAddonsToFree();
  // Mock window.location
  (globalThis as any).window = {
    location: {
      search: '?unlocked=true',
      pathname: '/',
    },
    history: {
      replaceState: (_data: any, _unused: any, url: string) => {
        (globalThis as any).window.location.pathname = url;
        (globalThis as any).window.location.search = '';
      }
    },
    dispatchEvent: () => {}
  };

  const detected = checkAndApplyPostPurchaseUnlock();
  assert.strictEqual(detected, true);
  assert.strictEqual(getAddonStatus().importer, true);
  assert.strictEqual((globalThis as any).window.location.search, '');
});

// ==========================================
// 12. MULTI-TRACK ACOUSTIC MIXER VOLUME STATE TESTS
// ==========================================
console.log('\n📌 Testing Multi-Track Acoustic Volume Storage:');

it('stores and retrieves individual track volumes correctly', () => {
  saveTrackVolume('rain', 0.85);
  saveTrackVolume('waves', 0.40);
  saveTrackVolume('brook', 0.65);

  const volumes = getTrackVolumes();
  assert.strictEqual(volumes.rain, 0.85);
  assert.strictEqual(volumes.waves, 0.40);
  assert.strictEqual(volumes.brook, 0.65);
});

it('clamps track volume between 0 and 1', () => {
  saveTrackVolume('waves', 1.5);
  assert.strictEqual(getTrackVolumes().waves, 1);

  saveTrackVolume('brook', -0.5);
  assert.strictEqual(getTrackVolumes().brook, 0);
});

console.log(`\n🎉 ALL ${passedTests}/${totalTests} TESTS PASSED WITH 100% SUCCESS!`);



