import { WorkTask, LifeEvent, ScheduledSlot, ScheduleSettings } from '../types';
import { formatDateKey, addDays, parseDateKey } from './scheduler';
import { cleanTaskTitle } from './format';

export interface CourseTemplateTask {
  title: string;
  estimatedMinutes: number;
  relativeDays: number; // Days from template import date (e.g. 3 = due 3 days after import)
  category: string;
  color?: string;
  priority?: 'high' | 'medium' | 'low';
}

export interface CourseTemplateEvent {
  title: string;
  time: string;
  durationMinutes: number;
  recurringDays?: number[];
  category?: string;
  location?: string;
}

export interface CourseTemplatePayload {
  v: number;
  name: string;
  description?: string;
  tasks: CourseTemplateTask[];
  events?: CourseTemplateEvent[];
}

/**
 * Returns safe base URL for templates, ensuring internal dev servers aren't leaked.
 */
export function getTemplateBaseUrl(): string {
  if (typeof window === 'undefined') {
    return 'https://cadence.pages.dev';
  }
  const hostname = (window.location.hostname || '').toLowerCase();
  if (hostname.endsWith('.pages.dev') || hostname === 'cadence.app') {
    return `${window.location.origin}${window.location.pathname.replace(/\/+$/, '')}`;
  }
  return 'https://cadence.pages.dev';
}

/**
 * Encode template into an ultra-compact URL-safe base64 string.
 * Minimal array format: [1, name, tasksArray, eventsArray]
 */
export function encodeTemplatePayload(payload: CourseTemplatePayload): string {
  try {
    const compactTasks = payload.tasks.map(t => [
      t.title,
      t.estimatedMinutes,
      Math.max(0, Math.round(t.relativeDays)),
      t.category || 'academic',
      t.priority || 'medium',
      t.color || 'stone'
    ]);

    const compactEvents = (payload.events || []).map(e => [
      e.title,
      e.time,
      e.durationMinutes,
      e.recurringDays || [],
      e.category || 'academic',
      e.location || ''
    ]);

    const minimal = [
      1, // version
      payload.name || 'Course Syllabus',
      compactTasks,
      compactEvents
    ];

    const json = JSON.stringify(minimal);
    // URL-safe Unicode-friendly base64 encoding
    const encoded = btoa(unescape(encodeURIComponent(json)));
    return encoded;
  } catch (err) {
    console.error('Failed to encode course template:', err);
    return '';
  }
}

/**
 * Decode template from base64 string supporting both minimal array and object schemas
 */
export function decodeTemplatePayload(rawStr: string): CourseTemplatePayload | null {
  if (!rawStr) return null;
  try {
    let clean = rawStr.trim();
    if (clean.startsWith('#template=')) clean = clean.slice(10);
    else if (clean.startsWith('template=')) clean = clean.slice(9);

    const json = decodeURIComponent(escape(atob(clean)));
    const parsed = JSON.parse(json);

    if (Array.isArray(parsed)) {
      const version = Number(parsed[0]) || 1;
      const name = String(parsed[1] || 'Course Syllabus');
      const rawTasks = Array.isArray(parsed[2]) ? parsed[2] : [];
      const rawEvents = Array.isArray(parsed[3]) ? parsed[3] : [];

      const tasks: CourseTemplateTask[] = rawTasks.map((rt: any) => {
        if (Array.isArray(rt)) {
          return {
            title: cleanTaskTitle(String(rt[0] || 'Assignment')),
            estimatedMinutes: Number(rt[1]) || 60,
            relativeDays: Math.max(0, Number(rt[2]) || 3),
            category: String(rt[3] || 'academic'),
            priority: (rt[4] as any) || 'medium',
            color: String(rt[5] || 'stone'),
          };
        }
        return {
          title: cleanTaskTitle(rt.title || 'Assignment'),
          estimatedMinutes: Number(rt.estimatedMinutes || rt.est) || 60,
          relativeDays: Math.max(0, Number(rt.relativeDays || rt.rel) || 3),
          category: rt.category || rt.cat || 'academic',
          priority: rt.priority || rt.prio || 'medium',
          color: rt.color || 'stone',
        };
      });

      const events: CourseTemplateEvent[] = rawEvents.map((re: any) => {
        if (Array.isArray(re)) {
          return {
            title: String(re[0] || 'Class Lecture'),
            time: String(re[1] || '10:00'),
            durationMinutes: Number(re[2]) || 60,
            recurringDays: Array.isArray(re[3]) ? re[3] : [],
            category: String(re[4] || 'academic'),
            location: String(re[5] || ''),
          };
        }
        return {
          title: re.title || 'Class Lecture',
          time: re.time || '10:00',
          durationMinutes: Number(re.durationMinutes || re.dur) || 60,
          recurringDays: re.recurringDays || re.days || [],
          category: re.category || 'academic',
          location: re.location || '',
        };
      });

      return {
        v: version,
        name,
        tasks,
        events,
      };
    }

    if (typeof parsed === 'object' && parsed.tasks) {
      return {
        v: parsed.v || 1,
        name: parsed.name || 'Course Syllabus',
        tasks: parsed.tasks,
        events: parsed.events || [],
      };
    }

    return null;
  } catch (err) {
    console.error('Failed to decode template string:', err);
    return null;
  }
}

/**
 * Parses #template=... or ?template=... from window URL
 */
export function parseTemplateFromUrl(): CourseTemplatePayload | null {
  if (typeof window === 'undefined') return null;

  try {
    // 1. Check window.location.hash (#template=...)
    const hash = window.location.hash;
    if (hash && hash.includes('template=')) {
      const match = hash.match(/template=([^&]+)/);
      if (match && match[1]) {
        return decodeTemplatePayload(match[1]);
      }
    }

    // 2. Check window.location.search (?template=...)
    const search = window.location.search;
    if (search && search.includes('template=')) {
      const params = new URLSearchParams(search);
      const val = params.get('template');
      if (val) {
        return decodeTemplatePayload(val);
      }
    }
  } catch (err) {
    console.error('Error parsing template from URL:', err);
  }

  return null;
}

/**
 * Builds full template share URL (e.g. cadence.pages.dev/#template=...)
 */
export function buildTemplateShareUrl(payload: CourseTemplatePayload): string {
  const base = getTemplateBaseUrl();
  const encoded = encodeTemplatePayload(payload);
  return `${base}/#template=${encoded}`;
}

/**
 * Extracts current tasks and recurring events into a CourseTemplatePayload
 * with calculated relative day offsets.
 */
export function createTemplateFromCurrentSchedule(
  name: string,
  tasks: WorkTask[],
  events: LifeEvent[],
  todayKey: string
): CourseTemplatePayload {
  const todayDate = parseDateKey(todayKey);

  const activeTasks = tasks.filter(t => t.status === 'active' && !t.isDefault);
  const tasksToUse = activeTasks.length > 0 ? activeTasks : tasks.filter(t => t.status === 'active');

  const templateTasks: CourseTemplateTask[] = tasksToUse.map(t => {
    let relDays = 3;
    if (t.deadlineDate) {
      const taskDeadlineDate = parseDateKey(t.deadlineDate);
      const diffTime = taskDeadlineDate.getTime() - todayDate.getTime();
      const diffDays = Math.round(diffTime / (1000 * 3600 * 24));
      relDays = Math.max(1, diffDays);
    }
    return {
      title: cleanTaskTitle(t.title),
      estimatedMinutes: t.estimatedMinutes,
      relativeDays: relDays,
      category: t.category,
      color: t.color,
      priority: t.priority,
    };
  });

  const recurringEvents = events.filter(e => (e.recurringDays && e.recurringDays.length > 0) || e.category === 'academic');
  const templateEvents: CourseTemplateEvent[] = recurringEvents.map(e => ({
    title: e.title,
    time: e.time,
    durationMinutes: e.durationMinutes,
    recurringDays: e.recurringDays,
    category: e.category,
    location: e.location,
  }));

  return {
    v: 1,
    name: name.trim() || 'Course Syllabus Schedule',
    tasks: templateTasks,
    events: templateEvents,
  };
}

/**
 * Converts a CourseTemplatePayload into concrete WorkTasks and LifeEvents
 * anchored to user's local today date.
 */
export function materializeTemplate(
  template: CourseTemplatePayload,
  baseDate: Date = new Date()
): { tasks: WorkTask[]; events: LifeEvent[] } {
  const newTasks: WorkTask[] = template.tasks.map((t, idx) => {
    const deadline = addDays(baseDate, t.relativeDays);
    const deadlineStr = formatDateKey(deadline);
    const id = `task-tpl-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`;
    return {
      id,
      title: cleanTaskTitle(t.title),
      estimatedMinutes: t.estimatedMinutes || 60,
      completedMinutes: 0,
      deadlineDate: deadlineStr,
      category: (t.category as any) || 'academic',
      color: t.color || 'stone',
      priority: t.priority || 'medium',
      status: 'active',
      isDefault: false,
      createdAt: new Date().toISOString(),
    };
  });

  const newEvents: LifeEvent[] = (template.events || []).map((e, idx) => {
    const id = `ev-tpl-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`;
    return {
      id,
      title: e.title,
      date: formatDateKey(baseDate),
      time: e.time,
      durationMinutes: e.durationMinutes,
      category: (e.category as any) || 'academic',
      recurringDays: e.recurringDays,
      location: e.location,
      whatToBring: [],
      color: 'stone',
      isDefault: false,
    };
  });

  return { tasks: newTasks, events: newEvents };
}
