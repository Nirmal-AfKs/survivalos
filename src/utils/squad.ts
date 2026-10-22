import { SquadSharePayload, SquadFocusBlock, ScheduledSlot, ScheduleSettings } from '../types';

/**
 * Universal squad radar serializer and decoder.
 * Supports URL hash (#squad=...) and query parameters (?squad=...).
 * Works offline, client-side, zero-login, and webview-resilient.
 */

/**
 * Dynamic live URL generator:
 * Always dynamically uses window.location.origin (or window.location.href.split('?')[0])
 * rather than any hardcoded URL or legacy domain.
 * Ensures scanning QR codes or clicking share links on desktop always opens
 * the exact current live site URL on mobile.
 */
export function getSquadBaseUrl(): string {
  if (typeof window === 'undefined') {
    return 'https://cadence.app';
  }
  const origin = window.location.origin;
  if (origin && origin !== 'null') {
    const path = (window.location.pathname || '').replace(/\/+$/, '');
    return `${origin}${path}`;
  }
  return (window.location.href || 'https://cadence.app').split(/[?#]/)[0].replace(/\/+$/, '');
}

export function getLiveBaseUrl(): string {
  return getSquadBaseUrl();
}

/**
 * Returns exact live site URL for clean PWA installation.
 * Dynamically uses window.location.origin (or window.location.href.split('?')[0])
 * ensuring desktop users scanning the QR code with phone camera open the exact live site URL.
 */
export function getExactLiveSiteUrl(): string {
  if (typeof window === 'undefined') {
    return 'https://cadence.app/';
  }
  try {
    const cleanHref = (window.location.href || '').split('?')[0].split('#')[0];
    if (cleanHref && cleanHref.startsWith('http')) {
      return cleanHref.endsWith('/') ? cleanHref : `${cleanHref}/`;
    }
    const origin = window.location.origin;
    if (origin && origin !== 'null') {
      const pathname = window.location.pathname || '/';
      const cleanPath = pathname.endsWith('/') ? pathname : `${pathname}/`;
      return `${origin}${cleanPath}`;
    }
  } catch (err) {
    console.warn('Failed to resolve exact live site URL', err);
  }
  return 'https://cadence.app/';
}

/**
 * Encodes squad payload into a clean, compact URL-safe base64 string using btoa.
 * Avoids raw percent-encoded JSON (%22 strings).
 */
function normalizeSquadData(raw: any): SquadSharePayload | null {
  if (!raw) return null;

  // Case 1: Minimal array schema: [1, curfewTime, dateKey, isFreeRest ? 1 : 0, blocks.map(b => [b.start, b.end]), friendName?, matched?]
  if (Array.isArray(raw)) {
    const version = Number(raw[0]) || 1;
    const curfew = typeof raw[1] === 'string' ? raw[1] : '21:30';
    const dateKey = typeof raw[2] === 'string' ? raw[2] : '';
    const isFreeRest = raw[3] === 1;
    const rawPairs = Array.isArray(raw[4]) ? raw[4] : [];
    const friendName = typeof raw[5] === 'string' && raw[5] ? raw[5] : undefined;
    const matched = Boolean(raw[6]);

    const blocks: SquadFocusBlock[] = rawPairs.map((pair: any) => {
      const start = Array.isArray(pair) ? pair[0] : (pair?.startTime || pair?.start || '16:00');
      const end = Array.isArray(pair) ? pair[1] : (pair?.endTime || pair?.end || '16:45');
      const [sh, sm] = String(start).split(':').map(Number);
      const [eh, em] = String(end).split(':').map(Number);
      const dur = (!isNaN(sh) && !isNaN(eh)) ? Math.max(15, (eh * 60 + (em || 0)) - (sh * 60 + (sm || 0))) : 45;
      return {
        startTime: String(start),
        endTime: String(end),
        title: 'Daylight Focus Sprint',
        category: 'focus',
        durationMinutes: dur,
      };
    });

    return {
      v: version,
      curfew,
      dateKey,
      dayMode: isFreeRest ? 'free_rest' : 'routine_work',
      friendName,
      blocks: blocks.length > 0 ? blocks : [
        {
          startTime: '16:00',
          endTime: '16:45',
          title: 'Pure Mathematics Review',
          category: 'study',
          durationMinutes: 45,
        }
      ],
      matched,
    };
  }

  // Case 2: Legacy JSON object format
  if (typeof raw === 'object') {
    const rawBlocks = Array.isArray(raw.blocks) ? raw.blocks : [];
    const blocks: SquadFocusBlock[] = rawBlocks.map((b: any) => {
      const start = b.startTime || b.start || '16:00';
      const end = b.endTime || b.end || '16:45';
      const [sh, sm] = String(start).split(':').map(Number);
      const [eh, em] = String(end).split(':').map(Number);
      const dur = b.durationMinutes || ((!isNaN(sh) && !isNaN(eh)) ? Math.max(15, (eh * 60 + (em || 0)) - (sh * 60 + (sm || 0))) : 45);
      return {
        startTime: String(start),
        endTime: String(end),
        title: (b.title || 'Daylight Focus').trim(),
        category: b.category || 'focus',
        durationMinutes: dur,
      };
    });

    return {
      v: raw.v || 1,
      curfew: raw.curfew || '21:30',
      dateKey: raw.dateKey || '',
      dayMode: raw.dayMode || 'routine_work',
      friendName: raw.friendName,
      blocks: blocks.length > 0 ? blocks : [
        {
          startTime: '16:00',
          endTime: '16:45',
          title: 'Pure Mathematics Review',
          category: 'study',
          durationMinutes: 45,
        }
      ],
      matched: Boolean(raw.matched),
      matchedTime: raw.matchedTime,
    };
  }

  return null;
}

/**
 * Compact Schema Encoder:
 * Minimal array schema cuts base64 string length by over 65%:
 * [1, curfewTime, dateKey, isFreeRest ? 1 : 0, blocks.map(b => [b.start, b.end])]
 */
export function encodeSquadPayload(payload: SquadSharePayload): string {
  try {
    const isFreeRest = payload.dayMode === 'free_rest' ? 1 : 0;
    const curfewTime = payload.curfew || '21:30';
    const dateKey = payload.dateKey || '';
    const blockPairs = (payload.blocks || []).map(b => [b.startTime, b.endTime]);

    const compactArray: any[] = [
      1,
      curfewTime,
      dateKey,
      isFreeRest,
      blockPairs,
    ];

    if (payload.friendName || payload.matched) {
      compactArray.push(payload.friendName || '', payload.matched ? 1 : 0);
    }

    const jsonStr = JSON.stringify(compactArray);
    const b64 = btoa(unescape(encodeURIComponent(jsonStr)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    return b64;
  } catch (err) {
    console.error('Error encoding squad payload', err);
    return '';
  }
}

export function buildSquadShareUrl(payload: SquadSharePayload): string {
  const hash = encodeSquadPayload(payload);
  const base = getSquadBaseUrl();
  return `${base}#squad=${hash}`;
}

export function buildSquadReplyUrl(payload: SquadSharePayload): string {
  const hash = encodeSquadPayload({
    ...payload,
    matched: true,
  });
  const base = getSquadBaseUrl();
  return `${base}#squad=${hash}`;
}

/**
 * Parses both the minimal compact array schema and legacy JSON/Base64 payloads gracefully.
 */
export function parseSquadPayloadString(rawStr: string): SquadSharePayload | null {
  if (!rawStr) return null;
  const trimmed = rawStr.trim();

  // 1. Try URL decode first
  let decodedStr = trimmed;
  try {
    decodedStr = decodeURIComponent(trimmed);
  } catch {
    decodedStr = trimmed;
  }

  // 2. Check if it's already JSON (legacy raw or percent-decoded array/object)
  if (decodedStr.startsWith('{') || decodedStr.startsWith('[')) {
    try {
      const parsed = JSON.parse(decodedStr);
      const normalized = normalizeSquadData(parsed);
      if (normalized) return normalized;
    } catch {
      // continue
    }
  }

  // 3. Try Base64 decoding (compact array format or legacy base64)
  try {
    let b64 = decodedStr.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) {
      b64 += '=';
    }
    const binStr = atob(b64);
    let jsonStr: string;
    try {
      jsonStr = decodeURIComponent(escape(binStr));
    } catch {
      jsonStr = binStr;
    }
    const parsed = JSON.parse(jsonStr);
    const normalized = normalizeSquadData(parsed);
    if (normalized) return normalized;
  } catch {
    // continue
  }

  // 4. Final fallback: raw JSON.parse directly
  try {
    const parsed = JSON.parse(trimmed);
    const normalized = normalizeSquadData(parsed);
    if (normalized) return normalized;
  } catch {
    // ignore
  }

  return null;
}

export function parseSquadFromUrl(): SquadSharePayload | null {
  try {
    let rawEncoded = '';

    // Check hash first: #squad=...
    if (window.location.hash.includes('squad=')) {
      const hashPart = window.location.hash.slice(1);
      const params = new URLSearchParams(hashPart);
      rawEncoded = params.get('squad') || '';
      if (!rawEncoded && hashPart.startsWith('squad=')) {
        rawEncoded = hashPart.split('squad=')[1].split('&')[0];
      }
    }

    // Check search query fallback: ?squad=...
    if (!rawEncoded && window.location.search.includes('squad=')) {
      const searchParams = new URLSearchParams(window.location.search);
      rawEncoded = searchParams.get('squad') || '';
    }

    if (!rawEncoded) return null;

    const parsed = parseSquadPayloadString(rawEncoded);
    if (!parsed) return null;

    if (!parsed.curfew) {
      parsed.curfew = '21:30';
    }
    if (!parsed.v) {
      parsed.v = 1;
    }

    // Ensure blocks array exists and has at least one valid fallback block if empty
    if (!parsed.blocks || parsed.blocks.length === 0) {
      parsed.blocks = [
        {
          startTime: '16:00',
          endTime: '16:45',
          title: 'Pure Mathematics Review',
          category: 'study',
          durationMinutes: 45,
        },
      ];
    }

    return parsed;
  } catch (err) {
    console.warn('Failed to parse squad payload from URL', err);
    return null;
  }
}

/**
 * Robust clipboard copy with fallback for mobile webviews (iOS WKWebView / Android WebView).
 */
export async function copyToClipboardSafe(text: string): Promise<boolean> {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to textarea
    }
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textarea);
    return successful;
  } catch (err) {
    console.error('Fallback clipboard copy failed', err);
    return false;
  }
}

/**
 * 1-Tap Share Intent:
 * 1. Native mobile share sheet if available
 * 2. WhatsApp direct intent if requested or as fallback
 * 3. Telegram direct intent as fallback
 * 4. Clipboard copy fallback
 */
export async function shareRadarIntent(message: string): Promise<'native' | 'whatsapp' | 'copied'> {
  // Try native share sheet first (supported on mobile iOS/Android Safari & Chrome)
  if (navigator.share) {
    try {
      await navigator.share({
        title: 'cadence. sanctuary — Daylight Matched!',
        text: message,
      });
      return 'native';
    } catch (err: unknown) {
      // If user cancelled, don't open secondary app
      if (err instanceof Error && err.name === 'AbortError') {
        return 'native';
      }
      // Otherwise fallback to WhatsApp intent
    }
  }

  // Fallback to WhatsApp intent
  try {
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    const win = window.open(waUrl, '_blank');
    if (!win) {
      await copyToClipboardSafe(message);
      return 'copied';
    }
    return 'whatsapp';
  } catch {
    await copyToClipboardSafe(message);
    return 'copied';
  }
}

/**
 * Mobile Device Cadence Pairing & PWA Sync (Pro Feature)
 * Serializes active schedule, tasks, events, and Pro unlock status
 * into a compact base64 URL fragment (#pair=...) for instant 1-camera-scan sync.
 */
export interface CadencePairData {
  v: number;
  pro?: boolean;
  dateKey?: string;
  tasks?: Array<{
    id?: string;
    title: string;
    estimatedMinutes: number;
    completedMinutes: number;
    category?: string;
    priority?: 'high' | 'medium' | 'low';
    color?: string;
    dueDate?: string;
  }>;
  events?: Array<{
    id?: string;
    title: string;
    time: string;
    date: string;
    durationMinutes: number;
    category?: string;
    color?: string;
  }>;
  settings?: Partial<ScheduleSettings>;
}

export function encodePairPayload(data: CadencePairData): string {
  try {
    const compact = [
      data.v || 1,
      data.pro ? 1 : 0,
      data.dateKey || '',
      (data.tasks || []).slice(0, 15).map(t => [
        t.title,
        t.estimatedMinutes,
        t.completedMinutes || 0,
        t.category || 'focus',
        t.priority || 'medium',
        t.color || 'stone',
        t.dueDate || '',
      ]),
      (data.events || []).slice(0, 10).map(e => [
        e.title,
        e.time,
        e.date || '',
        e.durationMinutes || 60,
        e.category || 'general',
        e.color || 'stone',
      ]),
      data.settings ? {
        averageDay: data.settings.averageDay,
        fullyHomeDay: data.settings.fullyHomeDay,
      } : null,
    ];
    const jsonStr = JSON.stringify(compact);
    const b64 = btoa(unescape(encodeURIComponent(jsonStr)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    return b64;
  } catch (err) {
    console.error('Failed to encode pair payload', err);
    return '';
  }
}

export function parsePairPayloadString(rawStr: string): CadencePairData | null {
  if (!rawStr) return null;
  const trimmed = rawStr.trim();
  try {
    let b64 = trimmed.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) {
      b64 += '=';
    }
    const binStr = atob(b64);
    let jsonStr: string;
    try {
      jsonStr = decodeURIComponent(escape(binStr));
    } catch {
      jsonStr = binStr;
    }
    const parsed = JSON.parse(jsonStr);

    if (Array.isArray(parsed)) {
      const v = Number(parsed[0]) || 1;
      const pro = parsed[1] === 1;
      const dateKey = typeof parsed[2] === 'string' ? parsed[2] : '';
      const rawTasks = Array.isArray(parsed[3]) ? parsed[3] : [];
      const rawEvents = Array.isArray(parsed[4]) ? parsed[4] : [];
      const rawSettings = parsed[5] || undefined;

      const tasks = rawTasks.map((t: any, idx: number) => ({
        id: `pair-task-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
        title: String(t[0] || 'Focus Sprint'),
        estimatedMinutes: Math.max(15, Number(t[1]) || 30),
        completedMinutes: Math.max(0, Number(t[2]) || 0),
        category: String(t[3] || 'focus'),
        priority: (t[4] as 'high' | 'medium' | 'low') || 'medium',
        color: String(t[5] || 'stone'),
        dueDate: t[6] ? String(t[6]) : undefined,
      }));

      const events = rawEvents.map((e: any, idx: number) => ({
        id: `pair-event-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
        title: String(e[0] || 'Calendar Event'),
        time: String(e[1] || '12:00'),
        date: String(e[2] || ''),
        durationMinutes: Math.max(15, Number(e[3]) || 60),
        category: String(e[4] || 'general'),
        color: String(e[5] || 'stone'),
      }));

      return {
        v,
        pro,
        dateKey,
        tasks,
        events,
        settings: rawSettings,
      };
    }
  } catch (err) {
    console.warn('Failed to parse pair payload string', err);
  }
  return null;
}

export function buildPairShareUrl(data: CadencePairData): string {
  const hash = encodePairPayload(data);
  const base = getSquadBaseUrl();
  return `${base}#pair=${hash}`;
}

export function parsePairFromUrl(): CadencePairData | null {
  if (typeof window === 'undefined') return null;
  try {
    let rawEncoded = '';
    if (window.location.hash.includes('pair=')) {
      const hashPart = window.location.hash.slice(1);
      const params = new URLSearchParams(hashPart);
      rawEncoded = params.get('pair') || '';
      if (!rawEncoded && hashPart.startsWith('pair=')) {
        rawEncoded = hashPart.split('pair=')[1].split('&')[0];
      }
    }
    if (!rawEncoded && window.location.search.includes('pair=')) {
      const searchParams = new URLSearchParams(window.location.search);
      rawEncoded = searchParams.get('pair') || '';
    }
    if (!rawEncoded) return null;
    return parsePairPayloadString(rawEncoded);
  } catch (err) {
    console.warn('Failed to parse pair from URL', err);
    return null;
  }
}

