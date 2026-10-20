import { SquadSharePayload, SquadFocusBlock, ScheduledSlot, ScheduleSettings } from '../types';

/**
 * Universal squad radar serializer and decoder.
 * Supports URL hash (#squad=...) and query parameters (?squad=...).
 * Works offline, client-side, zero-login, and webview-resilient.
 */

export function encodeSquadPayload(payload: SquadSharePayload): string {
  try {
    const compact: SquadSharePayload = {
      v: payload.v || 1,
      curfew: payload.curfew || '21:30',
      dateKey: payload.dateKey,
      dayMode: payload.dayMode,
      friendName: payload.friendName,
      blocks: (payload.blocks || []).map(b => ({
        startTime: b.startTime,
        endTime: b.endTime,
        title: (b.title || 'Daylight Focus').trim(),
        category: b.category || 'study',
        durationMinutes: b.durationMinutes || 45,
      })),
      matched: payload.matched,
      matchedTime: payload.matchedTime,
    };
    return encodeURIComponent(JSON.stringify(compact));
  } catch (err) {
    console.error('Error encoding squad payload', err);
    return '';
  }
}

export function buildSquadShareUrl(payload: SquadSharePayload): string {
  const hash = encodeSquadPayload(payload);
  const base = `${window.location.origin}${window.location.pathname}`;
  return `${base}#squad=${hash}`;
}

export function parseSquadFromUrl(): SquadSharePayload | null {
  try {
    const fullHref = window.location.href;
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

    let jsonStr = '';
    try {
      jsonStr = decodeURIComponent(rawEncoded);
    } catch {
      jsonStr = rawEncoded;
    }

    let parsed: SquadSharePayload;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      // Attempt base64 decode fallback
      try {
        const decodedB64 = atob(jsonStr);
        parsed = JSON.parse(decodedB64);
      } catch {
        return null;
      }
    }

    if (!parsed) return null;
    if (!parsed.curfew) {
      parsed.curfew = '21:30';
    }
    if (!parsed.v) {
      parsed.v = 1;
    }

    // Ensure blocks array exists and has at least one valid fallback block if friend had empty blocks
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
