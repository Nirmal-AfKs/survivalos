import React, { useState, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  Check, 
  FileText, 
  KeyRound, 
  RotateCcw, 
  ExternalLink,
  Clock,
  Heart,
  Smartphone,
  ShieldCheck,
  ArrowRight
} from 'lucide-react';
import { 
  getAddonStatus, 
  resetAddonsToFree, 
  applyBypassCode, 
  AddonStatus, 
  PRO_ADDON,
  WHOP_ANNUAL_CHECKOUT_URL,
  WHOP_MONTHLY_CHECKOUT_URL 
} from '../utils/addons';

interface AddOnsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStatusChange?: (status: AddonStatus) => void;
}

export const AddOnsModal: React.FC<AddOnsModalProps> = ({
  isOpen,
  onClose,
  onStatusChange,
}) => {
  const [status, setStatus] = useState<AddonStatus>(() => getAddonStatus());
  const [bypassCode, setBypassCode] = useState('');
  const [feedback, setFeedback] = useState<{ message: string; isError?: boolean } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStatus(getAddonStatus());
      setFeedback(null);
      setBypassCode('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleApplyCode = (e?: React.FormEvent, codeToApply?: string) => {
    if (e) e.preventDefault();
    const code = (codeToApply !== undefined ? codeToApply : bypassCode).trim();
    if (!code) return;

    const result = applyBypassCode(code);
    setStatus(result.unlocked);
    setFeedback({
      message: result.message,
      isError: !result.success,
    });
    if (result.success) {
      onStatusChange?.(result.unlocked);
    }
  };

  const handleResetToFree = () => {
    const updated = resetAddonsToFree();
    setStatus(updated);
    setFeedback({
      message: 'Cadence Pro reset to Free tier.',
    });
    onStatusChange?.(updated);
  };

  const isUnlocked = status.importer;

  const openCheckout = (url: string) => {
    try {
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      window.location.href = url;
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

        {/* Feedback Alert */}
        {feedback && (
          <div className={`p-3 rounded-2xl text-xs font-serif flex items-center justify-between gap-2 animate-in fade-in duration-150 ${
            feedback.isError 
              ? 'bg-rose-50 text-rose-900 border border-rose-200' 
              : 'bg-emerald-50 text-emerald-900 border border-emerald-200'
          }`}>
            <span>{feedback.message}</span>
            <button 
              onClick={() => setFeedback(null)}
              className="text-stone-400 hover:text-stone-700 p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

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
              1-Click Task & Course Outline Importer, multi-day intelligent scheduling distribution, and 1-scan mobile device pairing are permanently unlocked on your device.
            </p>
          </div>
        ) : (
          /* Checkout Tier Options */
          <div className="space-y-4">
            <p className="text-xs sm:text-sm font-serif text-stone-600 leading-relaxed">
              Instantly turn course notes, syllabi, and raw outlines into balanced 30-minute focus chunks distributed across your daylight schedule.
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
                <Smartphone className="w-3.5 h-3.5 text-stone-900 shrink-0 mt-0.5" />
                <span>
                  <strong>1-Camera-Scan Mobile Pairing:</strong> Point your phone camera to transfer your schedule and install Cadence PWA to your mobile home screen.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <Heart className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Nature Soundscapes Always Free:</strong> Ocean Waves, Rainfall, and Brook soundscapes remain 100% free for all users.
                </span>
              </div>
            </div>

            {/* 1. Annual Plan (Primary Highlighted Card) */}
            <div className="relative p-5 rounded-2xl bg-white border-2 border-stone-900 shadow-md space-y-3.5 text-stone-900">
              {/* Highlight Badge */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <h3 className="text-base font-serif font-bold text-stone-900">
                    Annual Pass (Best Value)
                  </h3>
                </div>
                <span className="text-[10px] font-sans font-bold uppercase tracking-wider bg-amber-200 text-amber-950 px-2 py-0.5 rounded-full border border-amber-300 shadow-2xs">
                  Save 50%
                </span>
              </div>

              {/* Price Line */}
              <div className="space-y-0.5">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-serif font-bold text-stone-900">$24</span>
                  <span className="text-xs font-serif text-stone-500">/ year</span>
                  <span className="text-xs font-serif text-emerald-800 font-medium ml-1">
                    (Just $2/month — Save 50% / 6 Months Free)
                  </span>
                </div>
                <p className="text-[11px] font-serif text-stone-500">
                  Full 1-year access to all Cadence Pro features and mobile sync.
                </p>
              </div>

              {/* Primary Direct Whop Checkout Button */}
              <a
                href={WHOP_ANNUAL_CHECKOUT_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  e.preventDefault();
                  openCheckout(WHOP_ANNUAL_CHECKOUT_URL);
                }}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-serif font-semibold bg-stone-900 hover:bg-stone-800 text-white rounded-xl shadow-xs transition-all active:scale-[0.98] cursor-pointer min-h-[46px]"
              >
                <span>Get Annual Pass ($24/yr)</span>
                <ExternalLink className="w-4 h-4 ml-0.5 opacity-80" />
              </a>
            </div>

            {/* 2. Monthly Plan (Secondary Option) */}
            <div className="text-center pt-0.5">
              <a
                href={WHOP_MONTHLY_CHECKOUT_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  e.preventDefault();
                  openCheckout(WHOP_MONTHLY_CHECKOUT_URL);
                }}
                className="inline-flex items-center gap-1.5 text-xs font-serif text-stone-600 hover:text-stone-950 underline decoration-stone-300 hover:decoration-stone-900 transition-colors cursor-pointer py-1"
              >
                <span>or choose Monthly ($4 / month)</span>
                <ExternalLink className="w-3 h-3 text-stone-400 inline" />
              </a>
            </div>
          </div>
        )}

        {/* Developer Bypass & Promo Code Input */}
        <div className="p-3.5 bg-white/70 border border-stone-200/80 rounded-2xl space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-serif font-medium text-stone-700 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-stone-500" />
              <span>Developer Bypass & Promo Code</span>
            </label>
            <span className="text-[10px] font-mono text-stone-400">
              test-importer · test-all
            </span>
          </div>

          <form onSubmit={(e) => handleApplyCode(e)} className="flex items-center gap-2">
            <input
              type="text"
              placeholder="e.g. test-importer"
              value={bypassCode}
              onChange={e => setBypassCode(e.target.value)}
              className="flex-1 px-3 py-1.5 text-xs font-mono bg-white border border-stone-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-stone-900 text-stone-900 placeholder:text-stone-400"
            />
            <button
              type="submit"
              className="px-3.5 py-1.5 text-xs font-serif bg-stone-900 hover:bg-stone-800 text-white rounded-xl transition-all shadow-xs cursor-pointer min-h-[34px]"
            >
              Apply
            </button>
          </form>

          {/* Quick 1-click test button for reviewers */}
          <div className="flex items-center justify-between pt-1 text-[11px] font-serif text-stone-500">
            <span>Quick test:</span>
            <button
              type="button"
              onClick={() => handleApplyCode(undefined, 'test-importer')}
              className="text-stone-700 hover:text-stone-900 underline font-mono text-[10px] cursor-pointer"
            >
              Click to unlock with test-importer
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-2 border-t border-stone-200/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleResetToFree}
            className="inline-flex items-center justify-center gap-1.5 text-xs font-serif text-stone-500 hover:text-stone-900 transition-colors cursor-pointer py-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Free Tier</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-serif bg-stone-200/70 hover:bg-stone-300/70 text-stone-800 rounded-xl transition-colors cursor-pointer min-h-[38px]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
