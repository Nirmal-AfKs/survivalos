import React, { useState, useMemo } from 'react';
import { X, Copy, Check, Share2, BookOpen, Clock, Calendar, Sparkles } from 'lucide-react';
import { WorkTask, LifeEvent } from '../types';
import { 
  createTemplateFromCurrentSchedule, 
  buildTemplateShareUrl,
  CourseTemplatePayload 
} from '../utils/template';

interface CourseTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: WorkTask[];
  events: LifeEvent[];
  todayKey: string;
}

export const CourseTemplateModal: React.FC<CourseTemplateModalProps> = ({
  isOpen,
  onClose,
  tasks,
  events,
  todayKey,
}) => {
  const [templateName, setTemplateName] = useState('Course Syllabus & Workload Plan');
  const [copied, setCopied] = useState(false);

  // Generate template payload
  const templatePayload: CourseTemplatePayload = useMemo(() => {
    return createTemplateFromCurrentSchedule(templateName, tasks, events, todayKey);
  }, [templateName, tasks, events, todayKey]);

  // Generate share link
  const shareUrl = useMemo(() => {
    return buildTemplateShareUrl(templatePayload);
  }, [templatePayload]);

  if (!isOpen) return null;

  const totalMinutes = templatePayload.tasks.reduce((sum, t) => sum + t.estimatedMinutes, 0);
  const totalHours = Math.round((totalMinutes / 60) * 10) / 10;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      const input = document.createElement('textarea');
      input.value = shareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleShareNative = async () => {
    if (typeof navigator !== 'undefined' && (navigator as any).share) {
      try {
        await (navigator as any).share({
          title: templatePayload.name,
          text: `Here is the syllabus and study schedule for ${templatePayload.name} on Cadence. Tap to load it into your daily focus rhythm in 1 click:`,
          url: shareUrl,
        });
      } catch (err) {
        console.debug('Share dismissed or failed:', err);
      }
    } else {
      handleCopyLink();
    }
  };

  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(
    `📚 *${templatePayload.name}* Syllabus & Study Plan:\nTap to load the schedule into your daylight rhythm in 1 tap:\n${shareUrl}`
  )}`;

  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(
    `📚 ${templatePayload.name} Syllabus & Study Plan for Cadence:`
  )}`;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/40 backdrop-blur-xs overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="bg-[#FAF8F5] rounded-3xl max-w-lg w-full p-4.5 sm:p-8 shadow-xl border border-stone-200/90 my-auto sm:my-8 max-h-[92vh] overflow-y-auto space-y-4 sm:space-y-6 text-stone-900 animate-in fade-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-stone-200/80">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-serif text-stone-500">
              <BookOpen className="w-3.5 h-3.5 text-stone-600" />
              <span>Scenario C+ Hyperedge Seeding</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-serif font-normal tracking-tight text-stone-900">
              Share as Course / Syllabus Template
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

        {/* Template Name Input */}
        <div className="space-y-1.5">
          <label className="text-xs font-serif text-stone-600 block">
            Course or Syllabus Title:
          </label>
          <input
            type="text"
            value={templateName}
            onChange={e => setTemplateName(e.target.value)}
            placeholder="e.g. Organic Chemistry Fall Syllabus"
            className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-stone-900 text-xs sm:text-sm font-serif focus:outline-none focus:ring-2 focus:ring-stone-900 shadow-2xs"
          />
        </div>

        {/* Summary Stats */}
        <div className="flex items-center gap-4 p-3.5 rounded-2xl bg-white/80 border border-stone-200/80 text-xs font-serif text-stone-700">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span><strong>{templatePayload.tasks.length}</strong> tasks</span>
          </div>
          <span>•</span>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-stone-500" />
            <span><strong>{totalHours}h</strong> estimated total</span>
          </div>
          {templatePayload.events && templatePayload.events.length > 0 && (
            <>
              <span>•</span>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-stone-500" />
                <span><strong>{templatePayload.events.length}</strong> lectures/labs</span>
              </div>
            </>
          )}
        </div>

        {/* Task Preview (Max 4 items shown) */}
        <div className="space-y-2">
          <div className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
            Included Assignments & Relative Deadlines
          </div>
          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
            {templatePayload.tasks.slice(0, 5).map((t, idx) => (
              <div 
                key={idx}
                className="flex items-center justify-between p-2.5 rounded-xl bg-white/70 border border-stone-200/60 text-xs font-serif"
              >
                <div className="truncate pr-2 font-medium text-stone-800">
                  {t.title}
                </div>
                <div className="flex items-center gap-2 shrink-0 text-stone-500 text-[11px]">
                  <span>{t.estimatedMinutes}m</span>
                  <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 border border-stone-200 text-[10px]">
                    due in {t.relativeDays}d
                  </span>
                </div>
              </div>
            ))}
            {templatePayload.tasks.length > 5 && (
              <div className="text-[11px] text-stone-400 font-serif italic text-center pt-1">
                + {templatePayload.tasks.length - 5} more tasks
              </div>
            )}
          </div>
        </div>

        {/* Generated Share Link Box */}
        <div className="space-y-2">
          <div className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider flex items-center justify-between">
            <span>Template Link (#template=)</span>
            <span className="text-emerald-700 font-normal">1-tap instant load</span>
          </div>
          <div className="p-3 bg-stone-100/90 border border-stone-200/90 rounded-2xl break-all whitespace-normal overflow-hidden max-w-full font-mono text-xs text-stone-600 select-all leading-relaxed max-h-24 overflow-y-auto">
            {shareUrl}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pt-1">
          <button
            onClick={handleCopyLink}
            className={`w-full py-3 px-4 rounded-2xl text-xs sm:text-sm font-serif font-medium transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2 min-h-[46px] active:scale-[0.98] ${
              copied
                ? 'bg-emerald-800 text-white'
                : 'bg-stone-900 text-white hover:bg-stone-800'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-300 stroke-[3]" />
                <span>Copied Template Link to Clipboard!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copy Template Link</span>
              </>
            )}
          </button>

          {/* Quick Class Chat Share Options */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2.5 px-3 rounded-xl bg-white hover:bg-stone-50 border border-stone-200 text-stone-800 text-xs font-serif flex items-center justify-center gap-1.5 transition-colors text-center"
            >
              <span>WhatsApp Chat</span>
            </a>

            <a
              href={telegramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2.5 px-3 rounded-xl bg-white hover:bg-stone-50 border border-stone-200 text-stone-800 text-xs font-serif flex items-center justify-center gap-1.5 transition-colors text-center"
            >
              <span>Telegram</span>
            </a>

            <button
              onClick={handleShareNative}
              className="col-span-2 sm:col-span-1 py-2.5 px-3 rounded-xl bg-white hover:bg-stone-50 border border-stone-200 text-stone-800 text-xs font-serif flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-center"
            >
              <Share2 className="w-3.5 h-3.5 text-stone-600" />
              <span>Share...</span>
            </button>
          </div>
        </div>

        <p className="text-[11px] text-stone-500 font-serif leading-relaxed text-center">
          💡 Anyone opening this link will have all assignments and relative deadlines auto-scheduled into their local daylight focus rhythm in 1 tap, zero login required.
        </p>
      </div>
    </div>
  );
};
