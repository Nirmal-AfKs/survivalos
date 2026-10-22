import React, { useState, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  Check, 
  FileText, 
  Zap, 
  Shield, 
  KeyRound, 
  RotateCcw, 
  ExternalLink,
  Layers,
  Clock,
  Heart
} from 'lucide-react';
import { 
  getAddonStatus, 
  setAddonUnlocked, 
  resetAddonsToFree, 
  applyBypassCode, 
  AddonStatus, 
  PRO_ADDON,
  PRO_CHECKOUT_URL 
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
  const [billingCycle, setBillingCycle] = useState<'yearly' | 'monthly'>('yearly');
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

  const handleApplyCode = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!bypassCode.trim()) return;

    const result = applyBypassCode(bypassCode);
    setStatus(result.unlocked);
    setFeedback({
      message: result.message,
      isError: !result.success,
    });
    if (result.success) {
      onStatusChange?.(result.unlocked);
    }
  };

  const handleOpenCheckout = () => {
    try {
      window.open(PRO_CHECKOUT_URL, '_blank', 'noopener,noreferrer');
    } catch {
      window.location.href = PRO_CHECKOUT_URL;
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
              <span>Sanctuary Add-On</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-serif font-normal tracking-tight text-stone-900">
              {PRO_ADDON.name}
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
          <div className={`p-3 rounded-2xl text-xs font-serif flex items-center justify-between gap-2 ${
            feedback.isError 
              ? 'bg-rose-50 text-rose-900 border border-rose-200' 
              : 'bg-emerald-50 text-emerald-900 border border-emerald-200'
          }`}>
            <span>{feedback.message}</span>
            <button 
              onClick={() => setFeedback(null)}
              className="text-stone-400 hover:text-stone-700 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Pro Status Banner if Unlocked */}
        {isUnlocked ? (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200/90 space-y-1.5 text-emerald-950">
            <div className="flex items-center justify-between">
              <span className="font-serif font-semibold text-sm flex items-center gap-1.5 text-emerald-900">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Cadence Pro is Active</span>
              </span>
              <span className="text-[10px] font-sans font-bold uppercase tracking-wider bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full">
                Unlocked
              </span>
            </div>
            <p className="text-xs font-serif text-emerald-800 leading-relaxed">
              1-Click Task & Course Outline Importer is permanently enabled. Slicing notes into 30-minute interleaved focus chunks is ready to use anytime.
            </p>
          </div>
        ) : (
          /* Billing Toggle & Plan Selection */
          <div className="space-y-4">
            {/* Value Proposition Description */}
            <p className="text-xs sm:text-sm font-serif text-stone-600 leading-relaxed">
              Transform syllabus outlines, raw course notes, and multi-topic reading lists into balanced 30-minute interleaved focus blocks in a single tap.
            </p>

            {/* Pricing Cycle Switcher */}
            <div className="grid grid-cols-2 gap-2.5 p-1 bg-stone-200/60 rounded-2xl">
              <button
                type="button"
                onClick={() => setBillingCycle('yearly')}
                className={`py-2 px-3 rounded-xl text-xs font-serif transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                  billingCycle === 'yearly'
                    ? 'bg-white text-stone-900 font-semibold shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <div className="flex items-center gap-1">
                  <span>Annual Billing</span>
                  <span className="text-[9px] font-sans font-bold bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded-md">
                    -50%
                  </span>
                </div>
                <span className="font-mono text-xs font-bold text-stone-800">
                  ${PRO_ADDON.yearlyPrice} / year
                </span>
                <span className="text-[10px] text-emerald-700 font-serif">
                  {PRO_ADDON.yearlySavings}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setBillingCycle('monthly')}
                className={`py-2 px-3 rounded-xl text-xs font-serif transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                  billingCycle === 'monthly'
                    ? 'bg-white text-stone-900 font-semibold shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <span>Monthly Billing</span>
                <span className="font-mono text-xs font-bold text-stone-800">
                  ${PRO_ADDON.monthlyPrice} / month
                </span>
                <span className="text-[10px] text-stone-400 font-serif">
                  Cancel anytime
                </span>
              </button>
            </div>

            {/* Highlights bullet points */}
            <div className="p-3.5 rounded-2xl bg-white border border-stone-200/90 shadow-2xs space-y-2 text-xs font-serif">
              <div className="flex items-start gap-2 text-stone-700">
                <FileText className="w-3.5 h-3.5 text-stone-800 shrink-0 mt-0.5" />
                <span>
                  <strong>Regex Outline Engine:</strong> Parses lines like <code className="bg-stone-100 px-1 py-0.5 rounded text-stone-900">Calculus Review - 90m</code> or <code className="bg-stone-100 px-1 py-0.5 rounded text-stone-900">Lab 2h</code> automatically.
                </span>
              </div>
              <div className="flex items-start gap-2 text-stone-700">
                <Clock className="w-3.5 h-3.5 text-stone-800 shrink-0 mt-0.5" />
                <span>
                  <strong>30-Minute Cognitive Slicing:</strong> Slices multi-hour workloads into humane parts to preserve focus stamina.
                </span>
              </div>
              <div className="flex items-start gap-2 text-stone-700">
                <Heart className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Nature Audio Remains Free:</strong> Ocean Waves, Rainfall, and Brook Water soundscapes remain 100% free for everyone.
                </span>
              </div>
            </div>

            {/* Checkout Action Button */}
            <button
              type="button"
              onClick={handleOpenCheckout}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-serif font-semibold bg-stone-900 hover:bg-stone-800 text-white rounded-2xl shadow-sm transition-all active:scale-[0.98] cursor-pointer min-h-[46px]"
            >
              <span>Unlock Cadence Pro</span>
              <span className="font-mono text-xs text-stone-300">
                ({billingCycle === 'yearly' ? `$${PRO_ADDON.yearlyPrice}/yr` : `$${PRO_ADDON.monthlyPrice}/mo`})
              </span>
              <ExternalLink className="w-3.5 h-3.5 ml-1 opacity-80" />
            </button>
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

          <form onSubmit={handleApplyCode} className="flex items-center gap-2">
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
