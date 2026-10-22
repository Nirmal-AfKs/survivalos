import React, { useState, useMemo } from 'react';
import { X, FileText, Sparkles, Check, Lock, Layers, Clock, AlertCircle, ExternalLink } from 'lucide-react';
import { parseRawCourseOutline, ParsedOutlineTask } from '../utils/outlineParser';
import { WorkTask } from '../types';
import { PRO_ADDON, PRO_CHECKOUT_URL } from '../utils/addons';

interface ImportOutlineModalProps {
  isOpen: boolean;
  onClose: () => void;
  isImporterUnlocked: boolean;
  onOpenAddOns: () => void;
  onImportTasks: (tasks: WorkTask[], toastMessage: string) => void;
  todayKey: string;
}

const SAMPLE_OUTLINE = `Calculus Review - 90m
Lab Report 2h
Organic Chemistry Mechanisms (45m)
Machine Learning Paper Reading`;

export const ImportOutlineModal: React.FC<ImportOutlineModalProps> = ({
  isOpen,
  onClose,
  isImporterUnlocked,
  onOpenAddOns,
  onImportTasks,
  todayKey,
}) => {
  const [rawText, setRawText] = useState(SAMPLE_OUTLINE);

  const parsed = useMemo(() => {
    return parseRawCourseOutline(rawText);
  }, [rawText]);

  if (!isOpen) return null;

  const handleAppend = () => {
    if (!isImporterUnlocked) {
      onOpenAddOns();
      return;
    }

    if (parsed.tasks.length === 0) return;

    const newTasks: WorkTask[] = parsed.tasks.map((item, idx) => ({
      id: `task-imported-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
      title: item.title,
      description: `Imported from course notes outline (${item.durationMinutes}m total)`,
      estimatedMinutes: item.durationMinutes,
      completedMinutes: 0,
      deadlineDate: todayKey,
      category: 'academic',
      color: 'indigo',
      priority: 'high',
      status: 'active',
      createdAt: new Date().toISOString(),
    }));

    onImportTasks(
      newTasks,
      `Appended ${newTasks.length} tasks (${parsed.totalChunks} focus blocks) directly to today's cadence.`
    );

    onClose();
  };

  const handleOpenCheckout = () => {
    try {
      window.open(PRO_CHECKOUT_URL, '_blank', 'noopener,noreferrer');
    } catch {
      window.location.href = PRO_CHECKOUT_URL;
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

        {/* Informative Guidance */}
        <p className="text-xs font-serif text-stone-600 leading-relaxed">
          Paste your syllabus outline or course notes below. Durations like <code className="bg-stone-200/70 px-1 py-0.5 rounded text-stone-800">90m</code>, <code className="bg-stone-200/70 px-1 py-0.5 rounded text-stone-800">2h</code>, or <code className="bg-stone-200/70 px-1 py-0.5 rounded text-stone-800">(45m)</code> are automatically parsed and sliced into cognitive 30-min chunks. Unspecified lines default to 30m.
        </p>

        {/* Text Input Area */}
        <div className="space-y-1.5">
          <label className="block text-xs font-serif font-medium text-stone-700">
            Raw Syllabus / Outline Text:
          </label>
          <textarea
            rows={5}
            value={rawText}
            onChange={e => setRawText(e.target.value)}
            placeholder="e.g.&#10;Calculus Review - 90m&#10;Lab Report 2h&#10;Reaction Mechanisms (45m)"
            className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-mono bg-white border border-stone-200/90 rounded-2xl focus:outline-hidden focus:ring-1 focus:ring-stone-900 text-stone-900 placeholder:text-stone-400 resize-y"
          />
        </div>

        {/* Live Parsing Preview */}
        <div className="space-y-2 p-3.5 rounded-2xl bg-white/80 border border-stone-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-serif">
            <span className="font-semibold text-stone-800 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              <span>Live 30-Minute Slicing Preview:</span>
            </span>
            <span className="font-mono text-stone-600">
              {parsed.tasks.length} topics · {parsed.totalDurationMinutes}m total · <strong className="text-stone-900">{parsed.totalChunks} chunks</strong>
            </span>
          </div>

          {parsed.tasks.length === 0 ? (
            <div className="text-xs font-serif text-stone-400 italic py-2 text-center">
              Enter outline lines above to preview parsed tasks.
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {parsed.tasks.map((task, idx) => (
                <div key={idx} className="p-2.5 rounded-xl bg-stone-50 border border-stone-200/60 text-xs font-serif space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-stone-900">{task.title}</span>
                    <span className="font-mono text-[11px] text-stone-600 bg-stone-200/80 px-2 py-0.5 rounded-md">
                      {task.durationMinutes}m ({task.chunkCount} × 30m)
                    </span>
                  </div>

                  {/* Sliced chunk chips */}
                  <div className="flex flex-wrap gap-1">
                    {task.chunks.map(chunk => (
                      <span 
                        key={chunk.chunkNumber}
                        className="inline-flex items-center gap-1 text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-stone-200 text-stone-700"
                      >
                        <Clock className="w-2.5 h-2.5 text-stone-400" />
                        <span>Part {chunk.chunkNumber}/{chunk.totalChunks} ({chunk.durationMinutes}m)</span>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Free Tier Notice & Pro Upgrade Banner */}
        {!isImporterUnlocked && (
          <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-200 text-xs font-serif text-amber-950 space-y-2.5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div className="space-y-0.5 leading-relaxed">
                  <strong className="text-amber-950 font-semibold">
                    {PRO_ADDON.name}
                  </strong>
                  <p className="text-[11px] text-amber-900/90">
                    Pricing: $4 / month or $24 / year (Save 50% — 6 Months Free). Instant 1-tap slicing and interleaving into your active daylight cadence.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleOpenCheckout}
                className="shrink-0 px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-serif text-xs font-medium inline-flex items-center gap-1 shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                <span>Unlock Pro</span>
                <ExternalLink className="w-3 h-3 opacity-80" />
              </button>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-2 border-t border-stone-200/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-serif text-stone-600 hover:text-stone-900 rounded-xl hover:bg-stone-200/60 transition-colors cursor-pointer min-h-[40px] flex items-center justify-center"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={parsed.tasks.length === 0}
            onClick={handleAppend}
            className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-serif font-medium rounded-xl transition-all shadow-xs active:scale-[0.98] cursor-pointer min-h-[42px] ${
              !isImporterUnlocked
                ? 'bg-amber-400 hover:bg-amber-300 text-stone-950'
                : 'bg-stone-900 hover:bg-stone-800 text-white'
            }`}
          >
            {!isImporterUnlocked ? (
              <>
                <Lock className="w-3.5 h-3.5" />
                <span>Unlock Pro to Append to Today ({parsed.totalChunks} blocks)</span>
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Append to Today's Cadence ({parsed.totalChunks} blocks)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
