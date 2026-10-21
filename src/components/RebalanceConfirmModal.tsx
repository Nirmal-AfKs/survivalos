import React from 'react';
import { RotateCcw, X, ShieldAlert, Check } from 'lucide-react';

interface RebalanceConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const RebalanceConfirmModal: React.FC<RebalanceConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/40 backdrop-blur-xs overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="bg-[#FAF8F5] rounded-3xl max-w-md w-full p-4.5 sm:p-7 shadow-xl border border-stone-200/90 my-auto sm:my-8 max-h-[92vh] overflow-y-auto space-y-4 sm:space-y-5 text-stone-900 animate-in fade-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between pb-3 border-b border-stone-200/80">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-serif text-stone-500">
              <RotateCcw className="w-3.5 h-3.5 text-stone-600" />
              <span>rhythm recalibration</span>
            </div>
            <h2 className="text-xl font-serif font-normal tracking-tight text-stone-900">
              Re-balance Schedule
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

        <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-xs font-serif text-amber-950 space-y-2 leading-relaxed">
          <div className="flex items-center gap-2 font-medium text-amber-900">
            <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
            <span>Earliest Deadline First (EDF) Protection</span>
          </div>
          <p>
            Cadence will recalculate your upcoming slots, protect near deadlines first, and move overflowing furthest tasks to holding.
          </p>
        </div>

        <p className="text-xs text-stone-600 font-serif leading-relaxed">
          Completed sessions remain locked. Incomplete chunks will be redistributed across your biological daylight hours.
        </p>

        <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 text-xs font-serif text-stone-600 hover:text-stone-900 rounded-xl hover:bg-stone-200/60 transition-colors cursor-pointer min-h-[44px] flex items-center justify-center"
          >
            Keep Current Plan
          </button>

          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-serif font-medium text-white bg-stone-900 hover:bg-stone-800 rounded-xl transition-all shadow-xs active:scale-[0.98] cursor-pointer min-h-[44px]"
          >
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span>Confirm Re-balance</span>
          </button>
        </div>
      </div>
    </div>
  );
};
