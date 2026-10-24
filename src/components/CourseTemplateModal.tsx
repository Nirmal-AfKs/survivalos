import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, 
  Copy, 
  Check, 
  Share2, 
  BookOpen, 
  Clock, 
  Calendar, 
  Sparkles,
  QrCode,
  ShieldCheck,
  Send,
  MessageSquare
} from 'lucide-react';
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
  const [showQr, setShowQr] = useState(false);
  const [qrSvg, setQrSvg] = useState<string>('');
  const [qrLoading, setQrLoading] = useState(false);

  // Generate template payload
  const templatePayload: CourseTemplatePayload = useMemo(() => {
    return createTemplateFromCurrentSchedule(templateName, tasks, events, todayKey);
  }, [templateName, tasks, events, todayKey]);

  // Generate share link
  const shareUrl = useMemo(() => {
    return buildTemplateShareUrl(templatePayload);
  }, [templatePayload]);

  const liveHost = typeof window !== 'undefined' ? (window.location.host || window.location.hostname) : 'live site';

  // Reactive QR code generator for classroom/desk camera scan
  useEffect(() => {
    let isCancelled = false;
    const generateQr = async () => {
      if (!showQr) return;

      setQrLoading(true);
      try {
        const QRCode = (await import('qrcode')).default;
        const svg = await QRCode.toString(shareUrl, {
          type: 'svg',
          margin: 1,
          errorCorrectionLevel: 'M',
          color: {
            dark: '#1F1E1D',
            light: '#FAF8F5',
          },
        });
        if (!isCancelled) {
          setQrSvg(svg);
        }
      } catch (err) {
        console.error('Failed to generate template QR code', err);
      } finally {
        if (!isCancelled) {
          setQrLoading(false);
        }
      }
    };

    generateQr();
    return () => {
      isCancelled = true;
    };
  }, [showQr, shareUrl]);

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
          text: `📚 Course Workplan for ${templatePayload.name} on Cadence. Tap to test and explore the schedule on your own device:`,
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
    `📚 *${templatePayload.name}* Syllabus & Study Plan:\nTap to open directly on Cadence to test and explore:\n${shareUrl}`
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
        className="bg-[#FAF8F5] rounded-3xl max-w-lg w-full p-4.5 sm:p-8 shadow-xl border border-stone-200/90 my-auto sm:my-8 max-h-[92vh] overflow-y-auto space-y-4 sm:space-y-5 text-stone-900 animate-in fade-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-stone-200/80">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-serif text-stone-500">
              <BookOpen className="w-3.5 h-3.5 text-stone-600" />
              <span>Whole Badge & Class Coordination</span>
              <span className="text-[10px] font-sans font-bold uppercase px-1.5 py-0.2 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300">
                100% Free
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-serif font-normal tracking-tight text-stone-900">
              Share Batch Workplan
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
        <p className="text-xs text-stone-600 leading-relaxed font-sans">
          Share your complete course workplan or syllabus batch with your entire cohort or badge. When classmates open the link, they land directly on their own Cadence page to test, explore, and adopt the schedule with zero login.
        </p>

        {/* Template Name Input */}
        <div className="space-y-1.5">
          <label className="text-xs font-serif text-stone-700 font-medium block">
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
            <span><strong>{templatePayload.tasks.length}</strong> topics</span>
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

        {/* Task Preview (Max 5 items shown) */}
        <div className="space-y-2">
          <div className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
            Included Work Items & Deadlines
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
                + {templatePayload.tasks.length - 5} more topics
              </div>
            )}
          </div>
        </div>

        {/* 1-Tap Sharing Loops */}
        <div className="space-y-2.5 pt-1">
          <div className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
            1-Tap Instant Sharing Loops
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {/* Phone native share */}
            {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
              <button
                onClick={handleShareNative}
                className="col-span-1 sm:col-span-3 flex items-center justify-center gap-2 px-4 py-2.5 bg-stone-900 text-white font-medium text-xs rounded-xl transition-all cursor-pointer active:scale-[0.98] min-h-[42px] shadow-xs"
              >
                <Share2 className="w-4 h-4 text-stone-200" />
                <span>Share via Phone Apps (Class Chat, AirDrop, Messages)</span>
              </button>
            )}

            {/* WhatsApp */}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-3 py-2.5 bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/30 text-[#128C7E] font-medium text-xs rounded-xl transition-all cursor-pointer active:scale-[0.98] min-h-[42px]"
            >
              <MessageSquare className="w-4 h-4 text-[#25D366] shrink-0" />
              <span>WhatsApp</span>
            </a>

            {/* Telegram */}
            <a
              href={telegramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-3 py-2.5 bg-[#0088cc]/10 hover:bg-[#0088cc]/20 border border-[#0088cc]/30 text-[#0088cc] font-medium text-xs rounded-xl transition-all cursor-pointer active:scale-[0.98] min-h-[42px]"
            >
              <Send className="w-4 h-4 text-[#0088cc] shrink-0" />
              <span>Telegram</span>
            </a>

            {/* Table / Class QR */}
            <button
              onClick={() => setShowQr(!showQr)}
              className={`flex items-center justify-center gap-2 px-3 py-2.5 font-medium text-xs rounded-xl transition-all cursor-pointer active:scale-[0.98] min-h-[42px] ${
                showQr
                  ? 'bg-[#1F1E1D] text-[#FAF8F5] border border-[#1F1E1D] shadow-xs'
                  : 'bg-stone-100 hover:bg-stone-200/80 border border-stone-200/90 text-stone-800'
              }`}
            >
              <QrCode className="w-4 h-4 shrink-0" />
              <span>📷 Class QR</span>
            </button>
          </div>

          {/* Inline Table QR Code Display */}
          {showQr && (
            <div className="p-5 bg-white border border-stone-200/90 rounded-2xl shadow-xs text-center space-y-3 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-1 border-b border-stone-100">
                <div className="text-xs font-serif font-medium text-stone-800 flex items-center gap-1.5">
                  <QrCode className="w-3.5 h-3.5 text-stone-600" />
                  <span>class camera scan · load batch workplan</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  <span>{liveHost}</span>
                </div>
              </div>

              <div className="flex justify-center items-center py-1">
                {qrLoading ? (
                  <div className="w-48 h-48 flex items-center justify-center text-xs font-serif text-stone-400">
                    rendering qr code...
                  </div>
                ) : qrSvg ? (
                  <div
                    className="w-48 h-48 max-w-full rounded-xl overflow-hidden p-2 bg-[#FAF8F5] border border-stone-200/80 flex items-center justify-center shadow-2xs [&>svg]:w-full [&>svg]:h-full"
                    dangerouslySetInnerHTML={{ __html: qrSvg }}
                  />
                ) : null}
              </div>

              <div className="text-[11px] font-mono text-stone-600 bg-stone-50 px-2.5 py-1.5 rounded-xl border border-stone-200/70 truncate max-w-full text-center select-all">
                {shareUrl}
              </div>

              <p className="text-[11px] font-serif text-stone-500 max-w-xs mx-auto leading-relaxed">
                Classmates sitting in lecture or lab? Point camera at this screen to instantly load the workplan into their local Cadence app.
              </p>
            </div>
          )}

          {/* Copy Template Link Button */}
          <button
            onClick={handleCopyLink}
            className={`w-full py-3 px-4 rounded-xl text-xs sm:text-sm font-serif font-medium transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2 min-h-[44px] active:scale-[0.98] ${
              copied
                ? 'bg-emerald-800 text-white'
                : 'bg-stone-900 text-white hover:bg-stone-800'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-300 stroke-[3]" />
                <span>Copied Workplan Link to Clipboard!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copy Workplan Link (#template=)</span>
              </>
            )}
          </button>
        </div>

        <p className="text-[11px] text-stone-500 font-serif leading-relaxed text-center">
          💡 Anyone opening this link lands directly on their own Cadence page to test and explore the schedule. Zero signup or login required.
        </p>
      </div>
    </div>
  );
};
