import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Share2, 
  Copy, 
  Check, 
  MessageSquare, 
  Send, 
  Users, 
  QrCode, 
  ShieldCheck 
} from 'lucide-react';
import { ScheduledSlot, ScheduleSettings, LifeEvent, SquadSharePayload } from '../types';
import { 
  buildSquadShareUrl, 
  copyToClipboardSafe, 
  getExactLiveSiteUrl 
} from '../utils/squad';

interface SquadRadarModalProps {
  isOpen: boolean;
  onClose: () => void;
  slots: ScheduledSlot[];
  events: LifeEvent[];
  settings: ScheduleSettings;
  todayKey: string;
  onOpenLegal?: () => void;
}

export const SquadRadarModal: React.FC<SquadRadarModalProps> = ({
  isOpen,
  onClose,
  slots,
  events: _events,
  settings,
  todayKey,
  onOpenLegal,
}) => {
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [qrSvg, setQrSvg] = useState<string>('');
  const [qrLoading, setQrLoading] = useState(false);

  const todayDateObj = new Date();
  const todaySlots = slots.filter(s => s.date === todayKey);

  const dayOfWeek = todayDateObj.getDay();
  const todayMode = (settings.dateSpecificModes && settings.dateSpecificModes[todayKey]) ||
    (settings.dayModes && settings.dayModes[dayOfWeek]) ||
    (settings.fullyHomeDay.applicableDays.includes(dayOfWeek) ? 'fully_home' : 'routine_work');

  const userCurfew = todayMode === 'fully_home' 
    ? settings.fullyHomeDay.endHour 
    : settings.averageDay.endHour;

  // Squad share payload strictly focused on daylight focus availability
  const squadPayload: SquadSharePayload = useMemo(() => ({
    v: 1,
    curfew: userCurfew || '21:30',
    dateKey: todayKey,
    dayMode: todayMode,
    blocks: todaySlots.length > 0 
      ? todaySlots.map(s => ({
          startTime: s.startTime,
          endTime: s.endTime,
          title: s.workTitle.replace(/\s*—\s*\d+h(\s*\d+m)?|\s*—\s*\d+m/gi, '').trim(),
          category: s.category,
          durationMinutes: s.durationMinutes,
        }))
      : [
          {
            startTime: todayMode === 'fully_home' ? settings.fullyHomeDay.startHour : settings.averageDay.startHour,
            endTime: '16:45',
            title: 'Open Daylight Cadence Sprint',
            category: 'focus',
            durationMinutes: 45,
          }
        ],
  }), [userCurfew, todayKey, todayMode, todaySlots, settings]);

  const squadShareUrl = useMemo(() => buildSquadShareUrl(squadPayload), [squadPayload]);
  
  // Live site domain & host display helper
  const liveHost = typeof window !== 'undefined' ? (window.location.host || window.location.hostname) : 'live site';

  // Reactive QR code generator for table camera scan
  useEffect(() => {
    let isCancelled = false;
    const generateQr = async () => {
      if (!showQr) return;

      setQrLoading(true);
      try {
        const QRCode = (await import('qrcode')).default;
        const svg = await QRCode.toString(squadShareUrl, {
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
        console.error('Failed to generate QR code', err);
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
  }, [showQr, squadShareUrl]);

  if (!isOpen) return null;

  // Punchy and natural share text
  const curfew = userCurfew || '21:30';
  const shareText = `⚡ Matching daylight focus today (wrapping by ${curfew}). Tap to sync focus sprints & breaks: ${squadShareUrl} (No login, 100% free)`;
  const encodedText = encodeURIComponent(shareText);

  const handleCopySquad = async () => {
    const ok = await copyToClipboardSafe(shareText);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const shareWhatsApp = () => {
    try {
      window.open(`https://api.whatsapp.com/send?text=${encodedText}`, '_blank');
    } catch {
      handleCopySquad();
    }
  };

  const shareTelegram = () => {
    try {
      window.open(`https://t.me/share/url?url=${encodeURIComponent(squadShareUrl)}&text=${encodedText}`, '_blank');
    } catch {
      handleCopySquad();
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: 'cadence. squad rhythm',
          text: shareText,
          url: squadShareUrl,
        });
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          handleCopySquad();
        }
      }
    } else {
      handleCopySquad();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/40 backdrop-blur-xs overflow-y-auto">
      <div 
        className="bg-[#FAF8F5] rounded-3xl max-w-lg w-full p-4.5 sm:p-7 shadow-xl border border-stone-200/80 my-auto sm:my-8 max-h-[92vh] overflow-y-auto space-y-4 sm:space-y-5 animate-in fade-in zoom-in-95 duration-150 text-stone-900"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-serif italic text-stone-500">
              <Users className="w-3.5 h-3.5 text-stone-600" />
              <span>live sync & social harmony</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-serif font-normal tracking-tight text-stone-900">
              squad overlap radar.
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 rounded-xl hover:bg-stone-200/50 transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informative Guidance */}
        <p className="text-xs text-stone-600 leading-relaxed font-sans">
          Share your daily flow, focus windows, and open coffee slots with friends, co-workers, or study partners in one tap so they know when you are in flow and when you are free.
        </p>

        {/* 🔒 Zero-Leak Privacy Banner */}
        <div className="bg-stone-100/80 border border-stone-200/90 rounded-2xl px-3.5 py-2.5 flex items-center gap-2 text-xs font-serif text-stone-800 shadow-2xs">
          <span>🔒 Zero-Leak: Only your open daylight hours are shared. Your tasks and private notes remain strictly on your device.</span>
        </div>

        {/* Share Text Preview Card */}
        <div className="bg-white/80 border border-stone-200/70 rounded-2xl p-4 space-y-3 break-all whitespace-normal overflow-hidden max-w-full font-mono text-xs text-stone-700 leading-relaxed shadow-2xs">
          {shareText}
        </div>

        {/* 1-Tap Sharing Loops */}
        <div className="space-y-2.5 pt-1">
          <div className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
            1-Tap Instant Sharing Loops
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* Phone native share loop */}
            {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
              <button
                onClick={handleNativeShare}
                className="col-span-1 sm:col-span-3 flex items-center justify-center gap-2 px-4 py-3 bg-stone-900 text-white font-medium text-xs rounded-xl transition-all cursor-pointer active:scale-[0.98] min-h-[44px] shadow-xs"
              >
                <Share2 className="w-4 h-4 text-stone-200" />
                <span>Share via Phone Apps (iMessage, WhatsApp, Telegram)</span>
              </button>
            )}

            {/* WhatsApp */}
            <button
              onClick={shareWhatsApp}
              className="flex items-center justify-center gap-2 px-3 py-3 bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/30 text-[#128C7E] font-medium text-xs rounded-xl transition-all cursor-pointer active:scale-[0.98] min-h-[44px]"
            >
              <MessageSquare className="w-4 h-4 text-[#25D366] shrink-0" />
              <span>WhatsApp</span>
            </button>

            {/* Telegram */}
            <button
              onClick={shareTelegram}
              className="flex items-center justify-center gap-2 px-3 py-3 bg-[#0088cc]/10 hover:bg-[#0088cc]/20 border border-[#0088cc]/30 text-[#0088cc] font-medium text-xs rounded-xl transition-all cursor-pointer active:scale-[0.98] min-h-[44px]"
            >
              <Send className="w-4 h-4 text-[#0088cc] shrink-0" />
              <span>Share to Telegram</span>
            </button>

            {/* Table QR */}
            <button
              onClick={() => setShowQr(!showQr)}
              className={`flex items-center justify-center gap-2 px-3 py-3 font-medium text-xs rounded-xl transition-all cursor-pointer active:scale-[0.98] min-h-[44px] ${
                showQr
                  ? 'bg-[#1F1E1D] text-[#FAF8F5] border border-[#1F1E1D] shadow-xs'
                  : 'bg-stone-100 hover:bg-stone-200/80 border border-stone-200/90 text-stone-800'
              }`}
            >
              <QrCode className="w-4 h-4 shrink-0" />
              <span>📷 Table QR</span>
            </button>
          </div>

          {/* Inline Table QR Code Display */}
          {showQr && (
            <div className="p-5 bg-white border border-stone-200/90 rounded-2xl shadow-xs text-center space-y-3 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-1 border-b border-stone-100">
                <div className="text-xs font-serif font-medium text-stone-800 flex items-center gap-1.5">
                  <QrCode className="w-3.5 h-3.5 text-stone-600" />
                  <span>table camera scan · sync daylight</span>
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

              {/* Clean display of dynamic live target URL */}
              <div className="text-[11px] font-mono text-stone-600 bg-stone-50 px-2.5 py-1.5 rounded-xl border border-stone-200/70 truncate max-w-full text-center select-all">
                {squadShareUrl}
              </div>

              <p className="text-[11px] font-serif text-stone-500 max-w-xs mx-auto leading-relaxed">
                Study buddy at your table? Point their camera at this screen to instantly sync daylight focus blocks on this live site.
              </p>
            </div>
          )}

          {/* Copy Button */}
          <button
            onClick={handleCopySquad}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-stone-900 hover:bg-stone-800 text-white font-medium text-xs rounded-xl transition-all shadow-xs cursor-pointer active:scale-[0.98] min-h-[44px]"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Copied to Clipboard!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copy Cadence Summary</span>
              </>
            )}
          </button>
        </div>

        {/* Subtle footer with Legal & MIT License link */}
        <div className="text-[11px] text-stone-400 text-center font-serif italic pt-1 flex flex-wrap items-center justify-center gap-2">
          <span>cadence. sanctuary — zero spam, gentle human coordination</span>
          {onOpenLegal && (
            <>
              <span aria-hidden="true">·</span>
              <button
                type="button"
                onClick={onOpenLegal}
                className="hover:text-stone-700 underline decoration-stone-300 cursor-pointer not-italic font-sans"
              >
                ⚖️ Legal & MIT License
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
