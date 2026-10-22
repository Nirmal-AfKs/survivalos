import React, { useState, useMemo } from 'react';
import { 
  X, 
  FileText, 
  Lock, 
  Layers, 
  Clock, 
  Calendar, 
  ExternalLink,
  Check
} from 'lucide-react';
import { parseRawCourseOutline } from '../utils/outlineParser';
import { WorkTask } from '../types';
import { 
  WHOP_ANNUAL_CHECKOUT_URL, 
  WHOP_MONTHLY_CHECKOUT_URL 
} from '../utils/addons';

interface ImportOutlineModalProps {
  isOpen: boolean;
  onClose: () => void;
  isImporterUnlocked: boolean;
  onOpenAddOns?: () => void;
  onImportTasks: (tasks: WorkTask[], toastMessage: string) => void;
  todayKey: string;
  focusMinutes?: number;
}

const SAMPLE_OUTLINE = `Calculus Review - 90m @ tomorrow
Lab Report 2h @ Friday
Organic Chemistry Mechanisms (45m) @ in 3 days
Machine Learning Paper Reading`;

export const ImportOutlineModal: React.FC<ImportOutlineModalProps> = ({
  isOpen,
  onClose,
  isImporterUnlocked,
  onOpenAddOns: _onOpenAddOns,
  onImportTasks,
  todayKey: _todayKey,
  focusMinutes = 30,
}) => {
  const [rawText, setRawText] = useState(SAMPLE_OUTLINE);

  const baseDate = useMemo(() => new Date(), []);
  const activeFocusMinutes = Math.max(10, Math.min(180, focusMinutes && focusMinutes > 0 ? focusMinutes : 30));

  const parsed = useMemo(() => {
    return parseRawCourseOutline(rawText, baseDate, activeFocusMinutes);
  }, [rawText, baseDate, activeFocusMinutes]);

  if (!isOpen) return null;

  const handleDistribute = () => {
    if (!isImporterUnlocked) {
      handleOpenAnnualCheckout();
      return;
    }

    if (parsed.tasks.length === 0) return;

    // Create tasks with their natural parsed multi-day deadlineDates
    const newTasks: WorkTask[] = parsed.tasks.map((item, idx) => ({
      id: `task-imported-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
      title: item.title,
      description: `Imported outline (${item.durationMinutes}m total, deadline: ${item.deadlineLabel})`,
      estimatedMinutes: item.durationMinutes,
      completedMinutes: 0,
      deadlineDate: item.deadlineDate, // Distributed deadline from natural syntax!
      category: 'academic',
      color: 'indigo',
      priority: item.relativeDays <= 1 ? 'high' : 'medium',
      status: 'active',
      createdAt: new Date().toISOString(),
    }));

    onImportTasks(
      newTasks,
      `✨ Distributed ${newTasks.length} topics (${parsed.totalChunks} focus blocks) across multi-day schedule.`
    );

    onClose();
  };

  const handleOpenAnnualCheckout = () => {
    try {
      window.open(WHOP_ANNUAL_CHECKOUT_URL, '_blank', 'noopener,noreferrer');
    } catch {
      window.location.href = WHOP_ANNUAL_CHECKOUT_URL;
    }
  };

  const handleOpenMonthlyCheckout = () => {
    try {
      window.open(WHOP_MONTHLY_CHECKOUT_URL, '_blank', 'noopener,noreferrer');
    } catch {
      window.location.href = WHOP_MONTHLY_CHECKOUT_URL;
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/40 backdrop-blur-xs overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="bg-[#FAF8F5] rounded-3xl max-w-xl w-full p-4.5 sm:p-7 shadow-2xl border border-stone-200/90 my-auto sm:my-8 max-h-[92vh] overflow-y-auto space-y-4 sm:space-y-5 text-stone-900 animate-in fade-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-stone-200/80">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 text-xs font-serif text-stone-500">
              <FileText className="w-3.5 h-3.5 text-stone-600" />
              <span>1-Click Task & Course Outline Importer</span>
              <span className="text-[10px] font-sans font-bold uppercase px-1.5 py-0.2 rounded-md bg-amber-200 text-amber-900 border border-amber-300">
                pro
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-serif font-normal tracking-tight text-stone-900">
              Import Outline into Cadence
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

        {/* Informative Guidance & Natural Syntax Help */}
        <div className="space-y-1.5 text-xs font-serif text-stone-600 leading-relaxed bg-stone-100/70 p-3 rounded-2xl border border-stone-200/80">
          <p>
            Paste your syllabus outline or course notes. Supports natural durations (<code className="bg-white px-1 py-0.5 rounded border border-stone-200 text-stone-800 font-mono text-[11px]">90m</code>, <code className="bg-white px-1 py-0.5 rounded border border-stone-200 text-stone-800 font-mono text-[11px]">2h</code>, <code className="bg-white px-1 py-0.5 rounded border border-stone-200 text-stone-800 font-mono text-[11px]">(45m)</code>) and optional deadline tags:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 pt-1 font-mono text-[11px] text-stone-700">
            <div>• <code className="text-indigo-700 font-semibold">@ tomorrow</code></div>
            <div>• <code className="text-indigo-700 font-semibold">@ Friday</code></div>
            <div>• <code className="text-indigo-700 font-semibold">@ in 3 days</code></div>
            <div>• No tag <span className="text-stone-400 font-serif">→ defaults to 2 days</span></div>
          </div>
        </div>

        {/* Text Input Area */}
        <div className="space-y-1.5">
          <label className="block text-xs font-serif font-medium text-stone-700">
            Raw Syllabus / Outline Text:
          </label>
          <textarea
            rows={5}
            value={rawText}
            onChange={e => setRawText(e.target.value)}
            placeholder="e.g.&#10;Calculus Review - 90m @ tomorrow&#10;Lab Report 2h @ Friday&#10;Organic Chemistry Mechanisms (45m) @ in 3 days&#10;Machine Learning Paper Reading"
            className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-mono bg-white border border-stone-200/90 rounded-2xl focus:outline-hidden focus:ring-1 focus:ring-stone-900 text-stone-900 placeholder:text-stone-400 resize-y"
          />
        </div>

        {/* Live Multi-Day Distribution Preview */}
        <div className="space-y-2.5 p-3.5 rounded-2xl bg-white/80 border border-stone-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-serif">
            <span className="font-semibold text-stone-800 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              <span>Live {activeFocusMinutes}-Minute Slicing Preview</span>
            </span>
            <span className="font-mono text-stone-600 text-[11px]">
              {parsed.tasks.length} topics · {parsed.totalDurationMinutes}m · <strong className="text-stone-900">{parsed.totalChunks} focus chunks</strong>
            </span>
          </div>

          {parsed.tasks.length === 0 ? (
            <div className="text-xs font-serif text-stone-400 italic py-2 text-center">
              Enter outline lines above to preview parsed tasks.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-52 overflow-y-auto pr-1">
              {parsed.tasks.map((task, idx) => (
                <div key={idx} className="p-2.5 rounded-xl bg-stone-50 border border-stone-200/70 text-xs font-serif space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-stone-900 truncate">{task.title}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="inline-flex items-center gap-1 font-mono text-[10px] bg-amber-100/80 text-amber-900 px-2 py-0.5 rounded-md border border-amber-200">
                        <Calendar className="w-2.5 h-2.5 text-amber-700" />
                        <span>due: {task.deadlineLabel}</span>
                      </span>
                      <span className="font-mono text-[10px] text-stone-600 bg-stone-200/70 px-2 py-0.5 rounded-md">
                        {task.durationMinutes}m ({task.chunkCount} x {task.chunkSize}m)
                      </span>
                    </div>
                  </div>

                  {/* Multi-day Landing Distribution Chips */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    {task.chunks.map((chunk, cIdx) => (
                      <span 
                        key={chunk.chunkNumber}
                        className={`inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded border transition-colors ${
                          chunk.plannedDayLabel === 'Today'
                            ? 'bg-emerald-50 text-emerald-900 border-emerald-200 font-medium'
                            : chunk.plannedDayLabel === 'Tomorrow'
                            ? 'bg-blue-50 text-blue-900 border-blue-200'
                            : 'bg-white text-stone-700 border-stone-200'
                        }`}
                      >
                        <Clock className="w-2.5 h-2.5 text-stone-400" />
                        <span>Part {chunk.chunkNumber}: {chunk.plannedDayLabel}</span>
                        {cIdx < task.chunks.length - 1 && (
                          <span className="text-stone-300 ml-0.5" aria-hidden="true">|</span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-stone-200/80 space-y-3">
          {isImporterUnlocked ? (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-xs font-serif text-stone-600 hover:text-stone-900 rounded-xl hover:bg-stone-200/60 transition-colors cursor-pointer min-h-[40px] flex items-center justify-center"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={parsed.tasks.length === 0}
                onClick={handleDistribute}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-xs sm:text-sm font-serif font-medium rounded-xl bg-stone-900 hover:bg-stone-800 text-white transition-all shadow-sm active:scale-[0.98] cursor-pointer min-h-[42px] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Distribute Across Schedule</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 text-xs font-serif text-stone-600 hover:text-stone-900 rounded-xl hover:bg-stone-200/60 transition-colors cursor-pointer min-h-[40px] flex items-center justify-center order-2 sm:order-1"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleOpenAnnualCheckout}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-serif text-xs sm:text-sm font-medium shadow-sm transition-all active:scale-[0.98] cursor-pointer flex-1 order-1 sm:order-2"
                >
                  <Lock className="w-3.5 h-3.5 text-amber-300" />
                  <span>Unlock Pro & Distribute — $24/year (Save 50%)</span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                </button>
              </div>

              <div className="flex items-center justify-center px-1 text-xs font-serif">
                <button
                  type="button"
                  onClick={handleOpenMonthlyCheckout}
                  className="text-stone-500 hover:text-stone-900 underline underline-offset-4 decoration-stone-300 transition-colors cursor-pointer"
                >
                  or choose Monthly ($4 / month)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
