import { SquadSharePayload, SquadFocusBlock, ScheduledSlot, ScheduleSettings } from '../types';

/**
 * Universal squad radar serializer and decoder.
 * Supports URL hash (#squad=...) and query parameters (?squad=...).
 * Works offline, client-side, zero-login, and webview-resilient.
 */

/**
 * Fallback to 'https://survivalos-b63.pages.dev' if current domain is not 'survivalos-b63.pages.dev'
 * Ensures internal dev URLs (*.run.app, localhost) are never leaked in share links.
 */
export function getSquadBaseUrl(): string {
  if (typeof window === 'undefined') {
    return 'https://survivalos-b63.pages.dev';
  }
  const hostname = (window.location.hostname || '').toLowerCase();
  if (hostname === 'survivalos-b63.pages.dev') {
    return `${window.location.origin}${window.location.pathname.replace(/\/+$/, '')}`;
  }
  return 'https://survivalos-b63.pages.dev';
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
