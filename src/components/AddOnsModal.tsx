import React, { useState, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  Check, 
  FileText, 
  ExternalLink,
  Clock,
  Heart,
  Lock
} from 'lucide-react';
import { 
  getAddonStatus, 
  AddonStatus, 
  WHOP_LIFETIME_CHECKOUT_URL 
} from '../utils/addons';

interface AddOnsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStatusChange?: (status: AddonStatus) => void;
}

export const AddOnsModal: React.FC<AddOnsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [status, setStatus] = useState<AddonStatus>(() => getAddonStatus());

  useEffect(() => {
    if (isOpen) {
      setStatus(getAddonStatus());
    }
  }, [isOpen]);

  // Keep synced if status changes in background
  useEffect(() => {
    const handleStatusUpdate = () => {
      setStatus(getAddonStatus());
    };
    window.addEventListener('cadence_addons_changed', handleStatusUpdate);
    window.addEventListener('storage', handleStatusUpdate);
    return () => {
      window.removeEventListener('cadence_addons_changed', handleStatusUpdate);
      window.removeEventListener('storage', handleStatusUpdate);
    };
  }, []);

  if (!isOpen) return null;

  const isUnlocked = status.importer;

  const openCheckout = () => {
    try {
      window.open(WHOP_LIFETIME_CHECKOUT_URL, '_blank', 'noopener,noreferrer');
    } catch {
      window.location.href = WHOP_LIFETIME_CHECKOUT_URL;
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/40 backdrop-blur-xs overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="bg-[#FAF8F5] rounded-3xl max-w-lg w-full p-5 sm:p-7 shadow-2xl border border-stone-200/90 my-auto sm:my-8 max-h-[92vh] overflow-y-auto space-y-5 text-stone-900 animate-in fade-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-stone-200/80">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-serif text-stone-500">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Cadence Sanctuary Pro</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-serif font-normal tracking-tight text-stone-900">
              Unlock Cadence Pro
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 rounded-xl hover:bg-stone-200/50 transition-colors cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pro Status Banner if Already Unlocked */}
        {isUnlocked ? (
          <div className="p-5 rounded-2xl bg-emerald-50/90 border border-emerald-200 space-y-2 text-emerald-950">
            <div className="flex items-center justify-between">
              <span className="font-serif font-semibold text-base flex items-center gap-2 text-emerald-900">
                <Check className="w-5 h-5 text-emerald-600 stroke-[2.5]" />
                <span>Cadence Pro is Active</span>
              </span>
              <span className="text-[10px] font-sans font-bold uppercase tracking-wider bg-emerald-200 text-emerald-900 px-2.5 py-0.5 rounded-full border border-emerald-300">
                Unlocked
              </span>
            </div>
            <p className="text-xs font-serif text-emerald-800 leading-relaxed">
              1-Click Task & Course Outline Importer and multi-day intelligent scheduling distribution are permanently unlocked on your device.
            </p>
          </div>
        ) : (
          /* Single $15 One-Time Lifetime Pricing */
          <div className="space-y-4">
            <p className="text-xs sm:text-sm font-serif text-stone-600 leading-relaxed">
              Instantly turn course notes, syllabi, and raw outlines into balanced focus chunks distributed across your daylight schedule.
            </p>

            {/* Feature Highlights Grid */}
            <div className="p-3.5 rounded-2xl bg-white border border-stone-200/90 shadow-2xs space-y-2.5 text-xs font-serif text-stone-700">
              <div className="flex items-start gap-2.5">
                <FileText className="w-3.5 h-3.5 text-stone-900 shrink-0 mt-0.5" />
                <span>
                  <strong>Natural Deadline Regex Importer:</strong> Parses lines like <code className="bg-stone-100 px-1 py-0.5 rounded text-stone-900 font-mono text-[11px]">Calculus - 90m @ tomorrow</code> or <code className="bg-stone-100 px-1 py-0.5 rounded text-stone-900 font-mono text-[11px]">Lab 2h @ Friday</code>.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <Clock className="w-3.5 h-3.5 text-stone-900 shrink-0 mt-0.5" />
                <span>
                  <strong>Multi-Day Interleaved Pacing:</strong> Automatically distributes focus blocks across the week leading to each deadline with zero cramming.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <Heart className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Nature Soundscapes Always Free:</strong> Ocean Waves, Rainfall, and Brook soundscapes remain 100% free for all users.
                </span>
              </div>
            </div>

            {/* Single Lifetime $15 Highlighted Card */}
            <div className="relative p-5 rounded-2xl bg-white border-2 border-stone-900 shadow-md space-y-3.5 text-stone-900">
              {/* Highlight Badge */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <h3 className="text-base font-serif font-bold text-stone-900">
                    Lifetime Sanctuary Pass
                  </h3>
                </div>
                <span className="text-[10px] font-sans font-bold uppercase tracking-wider bg-amber-200 text-amber-950 px-2 py-0.5 rounded-full border border-amber-300 shadow-2xs">
                  One-Time Payment
                </span>
              </div>

              {/* Price Line */}
              <div className="space-y-0.5">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-serif font-bold text-stone-900">$15</span>
                  <span className="text-xs font-serif text-stone-500">one-time payment</span>
                </div>
                <p className="text-[11px] font-serif text-stone-500 leading-relaxed">
                  Pay once. Unlimited syllabus parsing for your entire degree. Zero subscriptions.
                </p>
              </div>

              {/* Primary Direct Whop Checkout Button */}
              <button
                type="button"
                onClick={openCheckout}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-serif font-semibold bg-stone-900 hover:bg-stone-800 text-white rounded-xl shadow-xs transition-all active:scale-[0.98] cursor-pointer min-h-[46px]"
              >
                <Lock className="w-4 h-4 text-amber-300" />
                <span>Unlock Lifetime Importer — $15 (One-Time)</span>
                <ExternalLink className="w-4 h-4 ml-0.5 opacity-80" />
              </button>

              {/* Subtle sub-caption below button */}
              <p className="text-center text-[11px] font-serif text-stone-500 italic">
                Pay once. Unlimited syllabus parsing for your entire degree. Zero subscriptions.
              </p>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-3 border-t border-stone-200/80 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 text-xs font-serif bg-stone-200/70 hover:bg-stone-300/70 text-stone-800 rounded-xl transition-colors cursor-pointer min-h-[38px] font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
