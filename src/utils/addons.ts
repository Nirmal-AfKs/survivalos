/**
 * Cadence Pro Manager (100% offline-first, client-side, zero external dependencies)
 * Persisted in localStorage:
 * - 'cadence_addon_importer': Cadence Pro: 1-Click Course & Outline Importer
 *
 * Nature Audio soundscapes (Waves, Rain, Brook) remain 100% free and simple for all users.
 */

export interface AddonStatus {
  importer: boolean;
}

export const STORAGE_KEYS = {
  IMPORTER: 'cadence_addon_importer',
};

export const WHOP_LIFETIME_CHECKOUT_URL = 'https://whop.com/checkout/plan_1Hv3fzf6nWAxP';
export const PRO_CHECKOUT_URL = WHOP_LIFETIME_CHECKOUT_URL;

// Aliases for backwards compatibility with any legacy imports
export const WHOP_ANNUAL_CHECKOUT_URL = WHOP_LIFETIME_CHECKOUT_URL;
export const WHOP_MONTHLY_CHECKOUT_URL = 'https://whop.com/checkout/plan_r9yJOZILo1wsG';

export const PRO_ADDON = {
  name: 'Cadence Pro: 1-Click Course & Outline Importer',
  price: 15,
  pricingLabel: '$15 (One-Time)',
  subcaption: 'Pay once. Unlimited syllabus parsing for your entire degree. Zero subscriptions.',
  description: 'Instantly transform course notes, syllabi, and raw bullet points into interleaved 30-minute daylight focus chunks with 1 tap.',
  checkoutUrl: WHOP_LIFETIME_CHECKOUT_URL,
  lifetimeCheckoutUrl: WHOP_LIFETIME_CHECKOUT_URL,
  // Backward compatibility fields
  monthlyPrice: 4,
  yearlyPrice: 15,
};

// Backward-compatibility pricing object
export const ADDON_PRICING = {
  importer: {
    name: 'Cadence Pro: 1-Click Course & Outline Importer',
    price: 15,
    pricingLabel: '$15 (One-Time)',
    subcaption: 'Pay once. Unlimited syllabus parsing for your entire degree. Zero subscriptions.',
    description: PRO_ADDON.description,
    checkoutUrl: WHOP_LIFETIME_CHECKOUT_URL,
  },
};

/**
 * Reads current unlock status from localStorage.
 * 1-Click Course & Outline Importer is 100% FREE for all users.
 */
export function getAddonStatus(): AddonStatus {
  return { importer: true };
}

/**
 * Checks if Cadence (Course Importer) is unlocked.
 * Always returns true — 100% free for all users.
 */
export function isImporterUnlocked(): boolean {
  return true;
}

/**
 * Sets unlock status for Cadence Pro
 */
export function setAddonUnlocked(addon: 'importer', unlocked: boolean): void {
  try {
    if (unlocked) {
      localStorage.setItem(STORAGE_KEYS.IMPORTER, 'true');
    } else {
      localStorage.removeItem(STORAGE_KEYS.IMPORTER);
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('cadence_addons_changed'));
    }
  } catch (err) {
    console.error('Failed to update addon status', err);
  }
}

/**
 * Resets Cadence Pro to Free tier
 */
export function resetAddonsToFree(): AddonStatus {
  try {
    localStorage.removeItem(STORAGE_KEYS.IMPORTER);
    // Also clean any legacy keys
    localStorage.removeItem('cadence_addon_mixer');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('cadence_addons_changed'));
    }
  } catch (err) {
    console.error('Failed to reset addons', err);
  }
  return { importer: false };
}

/**
 * Developer Bypass & Promo Code Handler (silent/programmatic only):
 * - 'test-importer' -> unlocks Cadence Pro (Course Importer)
 * - 'test-all' -> unlocks Cadence Pro
 */
export function applyBypassCode(rawCode: string): {
  success: boolean;
  message: string;
  unlocked: AddonStatus;
} {
  const code = rawCode.trim().toLowerCase();

  if (code === 'test-importer' || code === 'test-all') {
    setAddonUnlocked('importer', true);
    return {
      success: true,
      message: '✨ Cadence Pro unlocked via bypass code.',
      unlocked: getAddonStatus(),
    };
  }

  return {
    success: false,
    message: 'Invalid code. Use "test-importer" or "test-all".',
    unlocked: getAddonStatus(),
  };
}

/**
 * Automatic Post-Purchase Unlock Detection:
 * On app load/mount, check if window.location.search contains '?unlocked=true':
 * - If detected: permanently save localStorage.setItem('cadence_addon_importer', 'true').
 * - Clean the URL cleanly without page refresh via window.history.replaceState({}, '', window.location.pathname).
 * - Return true so caller can show toast notification.
 */
export function checkAndApplyPostPurchaseUnlock(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const search = window.location.search || '';
    if (search.includes('unlocked=true')) {
      localStorage.setItem(STORAGE_KEYS.IMPORTER, 'true');
      
      // Clean URL cleanly without page refresh
      const cleanPath = window.location.pathname || '/';
      window.history.replaceState({}, '', cleanPath);
      
      window.dispatchEvent(new Event('cadence_addons_changed'));
      return true;
    }
  } catch (err) {
    console.error('Failed to check post-purchase unlock', err);
  }
  return false;
}

// Silent browser console helpers for developers (zero public UI clutter)
if (typeof window !== 'undefined') {
  (window as any).cadenceDevUnlock = () => {
    localStorage.setItem(STORAGE_KEYS.IMPORTER, 'true');
    window.dispatchEvent(new Event('cadence_addons_changed'));
    return '✨ Cadence Pro unlocked via console.';
  };
  (window as any).cadenceDevReset = () => {
    localStorage.removeItem(STORAGE_KEYS.IMPORTER);
    window.dispatchEvent(new Event('cadence_addons_changed'));
    return '↺ Cadence Pro reset to Free via console.';
  };
}
