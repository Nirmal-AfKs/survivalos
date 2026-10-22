import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Share2, 
  Copy, 
  Check, 
  MessageSquare, 
  Send, 
  Users, 
  Sparkles, 
  QrCode, 
  Smartphone, 
  Download, 
  ExternalLink,
  ArrowRight,
  ShieldCheck,
  KeyRound
} from 'lucide-react';
import { ScheduledSlot, ScheduleSettings, LifeEvent, SquadSharePayload, WorkTask } from '../types';
import { 
  buildSquadShareUrl, 
  buildPairShareUrl, 
  copyToClipboardSafe, 
  getLiveBaseUrl, 
  getExactLiveSiteUrl,
  CadencePairData 
} from '../utils/squad';
import { isImporterUnlocked, applyBypassCode, PRO_ADDON } from '../utils/addons';

interface SquadRadarModalProps {
  isOpen: boolean;
  onClose: () => void;
  slots: ScheduledSlot[];
  events: LifeEvent[];
  settings: ScheduleSettings;
  todayKey: string;
  tasks?: WorkTask[];
  isPro?: boolean;
  onOpenAddOns?: () => void;
  onOpenLegal?: () => void;
}

export const SquadRadarModal: React.FC<SquadRadarModalProps> = ({
  isOpen,
  onClose,
  slots,
  events,
  settings,
  todayKey,
  tasks = [],
  isPro,
  onOpenAddOns,
  onOpenLegal,
}) => {
  const [tab, setTab] = useState<'squad' | 'pair'>('squad');
  const [pairMode, setPairMode] = useState<'active' | 'pwa'>('active');
  const [squadQrSubMode, setSquadQrSubMode] = useState<'squad' | 'pair'>('squad');
  const [copied, setCopied] = useState(false);
  const [pairCopied, setPairCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [qrSvg, setQrSvg] = useState<string>('');
  const [qrLoading, setQrLoading] = useState(false);
  const [bypassInput, setBypassInput] = useState('');
  const [bypassMsg, setBypassMsg] = useState<string | null>(null);

  // Check Pro unlock state reactively
  const [unlocked, setUnlocked] = useState<boolean>(() => {
    if (isPro !== undefined) return isPro;
    return isImporterUnlocked();
  });

  useEffect(() => {
    if (isPro !== undefined) {
      setUnlocked(isPro);
    } else {
      setUnlocked(isImporterUnlocked());
    }
  }, [isPro]);

  useEffect(() => {
    const handleAddonsChanged = () => {
      setUnlocked(isImporterUnlocked());
    };
    window.addEventListener('cadence_addons_changed', handleAddonsChanged);
    window.addEventListener('storage', handleAddonsChanged);
    return () => {
      window.removeEventListener('cadence_addons_changed', handleAddonsChanged);
      window.removeEventListener('storage', handleAddonsChanged);
    };
  }, []);

  const isProUnlocked = unlocked;

  const todayDateObj = new Date();
  const todaySlots = slots.filter(s => s.date === todayKey);

  const dayOfWeek = todayDateObj.getDay();
  const todayMode = (settings.dateSpecificModes && settings.dateSpecificModes[todayKey]) ||
    (settings.dayModes && settings.dayModes[dayOfWeek]) ||
    (settings.fullyHomeDay.applicableDays.includes(dayOfWeek) ? 'fully_home' : 'routine_work');

  const userCurfew = todayMode === 'fully_home' 
    ? settings.fullyHomeDay.endHour 
    : settings.averageDay.endHour;

  // 1. Squad share payload
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

  // 2. Mobile Pair with Phone payload
  const pairPayload: CadencePairData = useMemo(() => ({
    v: 1,
    pro: isProUnlocked,
    dateKey: todayKey,
    tasks: tasks.slice(0, 15).map(t => ({
      title: t.title,
      estimatedMinutes: t.estimatedMinutes,
      completedMinutes: t.completedMinutes || 0,
      category: t.category,
      priority: t.priority,
      color: t.color,
      dueDate: t.deadlineDate,
    })),
    events: events.slice(0, 10).map(e => ({
      title: e.title,
      time: e.time,
      date: e.date,
      durationMinutes: e.durationMinutes,
      category: e.category,
      color: e.color,
    })),
    settings: {
      averageDay: settings.averageDay,
      fullyHomeDay: settings.fullyHomeDay,
      breakIntervalMinutes: settings.breakIntervalMinutes,
      focusBlockMinutes: settings.focusBlockMinutes,
    },
  }), [isProUnlocked, todayKey, tasks, events, settings]);

  const pairShareUrl = useMemo(() => buildPairShareUrl(pairPayload), [pairPayload]);
  
  // Exact dynamic live site URL: dynamically resolves against window.location.origin / window.location.href.split('?')[0]
  const cleanLiveUrl = useMemo(() => getExactLiveSiteUrl(), []);

  // Live site domain & host display helpers
  const liveHost = typeof window !== 'undefined' ? (window.location.host || window.location.hostname) : 'live site';

  // Active target URL for QR code
  const currentQrUrl = useMemo(() => {
    if (tab === 'squad') {
      if (squadQrSubMode === 'pair' && isProUnlocked) {
        return pairMode === 'active' ? pairShareUrl : cleanLiveUrl;
      }
      return squadShareUrl;
    }
    return pairMode === 'active' ? pairShareUrl : cleanLiveUrl;
  }, [tab, squadQrSubMode, isProUnlocked, pairMode, squadShareUrl, pairShareUrl, cleanLiveUrl]);

  // Reactive QR code generator
  useEffect(() => {
    let isCancelled = false;
    const generateQr = async () => {
      // In squad tab, only generate when table QR is opened
      if (tab === 'squad' && !showQr) return;
      // In pair tab, only generate if Pro is unlocked
      if (tab === 'pair' && !isProUnlocked) return;

      setQrLoading(true);
      try {
        const QRCode = (await import('qrcode')).default;
        const svg = await QRCode.toString(currentQrUrl, {
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
  }, [tab, showQr, squadQrSubMode, pairMode, currentQrUrl, isProUnlocked]);

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

  const handleCopyPair = async () => {
    const targetUrl = pairMode === 'active' ? pairShareUrl : cleanLiveUrl;
    const ok = await copyToClipboardSafe(targetUrl);
    if (ok) {
      setPairCopied(true);
      setTimeout(() => setPairCopied(false), 2500);
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

  const handleNativePairShare = async () => {
    const targetUrl = pairMode === 'active' ? pairShareUrl : cleanLiveUrl;
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: 'Cadence Mobile Sanctuary',
          text: pairMode === 'active' 
            ? 'Pair your active daily cadence schedule with mobile:' 
            : 'Open Cadence sanctuary and install PWA to your home screen:',
          url: targetUrl,
        });
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          handleCopyPair();
        }
      }
    } else {
      handleCopyPair();
    }
  };

  const handleQuickUnlock = (code = 'test-importer') => {
    const res = applyBypassCode(code);
    if (res.success) {
      setUnlocked(true);
      setBypassMsg('✨ Cadence Pro unlocked!');
      setTimeout(() => setBypassMsg(null), 3000);
    } else {
      setBypassMsg(res.message);
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
            <div className="text-xs font-serif italic text-stone-500">
              live sync & social harmony
            </div>
            <h2 className="text-xl sm:text-2xl font-serif font-normal tracking-tight text-stone-900">
              {tab === 'squad' ? 'squad overlap radar.' : 'pair with phone.'}
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

        {/* Tab Switcher: Squad Radar vs Pair with Phone */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-stone-200/60 rounded-2xl">
          <button
            type="button"
            onClick={() => setTab('squad')}
            className={`py-2 px-3 rounded-xl text-xs font-serif font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              tab === 'squad'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Squad Radar</span>
          </button>

          <button
            type="button"
            onClick={() => setTab('pair')}
            className={`py-2 px-3 rounded-xl text-xs font-serif font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer relative ${
              tab === 'pair'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Pair with Phone</span>
            {isProUnlocked ? (
              <span className="text-[9px] font-sans font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-md border border-emerald-300">
                Pro ✓
              </span>
            ) : (
              <span className="text-[9px] font-sans font-bold uppercase tracking-wider bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded-md">
                Pro
              </span>
            )}
          </button>
        </div>

        {/* ========================================================= */}
        {/* TAB 1: SQUAD RADAR                                        */}
        {/* ========================================================= */}
        {tab === 'squad' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <p className="text-xs text-stone-600 leading-relaxed font-sans">
              Share your daily flow, focus windows, and open coffee slots with friends, co-workers, or study partners in one tap so they know when you are in flow and when you are free.
            </p>

            {/* Pro Option: Pair with Phone Toggle Card */}
            {isProUnlocked ? (
              <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-3 sm:p-3.5 flex items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-200/70 text-amber-900 flex items-center justify-center shrink-0">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-serif font-semibold text-stone-900">
                      <span>Pair with Phone</span>
                      <span className="text-[9px] font-sans font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded border border-emerald-200">
                        Pro Active
                      </span>
                    </div>
                    <p className="text-[11px] font-serif text-stone-600 leading-tight">
                      Scan with camera to sync active cadence or install PWA to mobile home screen.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setTab('pair')}
                  className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-serif font-medium transition-all shrink-0 cursor-pointer shadow-xs active:scale-95 whitespace-nowrap"
                >
                  Pair Now →
                </button>
              </div>
            ) : (
              <div className="bg-stone-100/70 border border-stone-200/80 rounded-2xl p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-stone-200/80 text-stone-700 flex items-center justify-center shrink-0">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-serif font-semibold text-stone-900">
                      <span>Pair with Phone</span>
                      <span className="text-[9px] font-sans font-bold uppercase tracking-wider bg-amber-200 text-amber-900 px-1 py-0.2 rounded">
                        Pro
                      </span>
                    </div>
                    <p className="text-[11px] font-serif text-stone-500 leading-tight">
                      Transfer active cadence & install PWA to mobile home screen.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setTab('pair')}
                  className="px-2.5 py-1.5 bg-stone-200 hover:bg-stone-300/80 text-stone-800 rounded-xl text-xs font-serif font-medium transition-all shrink-0 cursor-pointer active:scale-95 whitespace-nowrap"
                >
                  Preview →
                </button>
              </div>
            )}

            {/* 🔒 Zero-Leak Privacy Banner */}
            <div className="bg-stone-100/80 border border-stone-200/90 rounded-2xl px-3.5 py-2.5 flex items-center gap-2 text-xs font-serif text-stone-800 shadow-2xs">
              <span>🔒 Zero-Leak: Only your open daylight hours are shared. Your tasks and private notes remain strictly on your device.</span>
            </div>

            {/* Preview Card */}
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

                  {/* Inline Toggle: Squad Availability QR vs Pair with Phone QR */}
                  {isProUnlocked && (
                    <div className="grid grid-cols-2 gap-1 p-1 bg-stone-100 rounded-xl text-xs font-serif">
                      <button
                        type="button"
                        onClick={() => setSquadQrSubMode('squad')}
                        className={`py-1.5 px-2 rounded-lg transition-all cursor-pointer ${
                          squadQrSubMode === 'squad'
                            ? 'bg-white text-stone-900 font-semibold shadow-2xs'
                            : 'text-stone-600 hover:text-stone-900'
                        }`}
                      >
                        👥 Squad Availability QR
                      </button>
                      <button
                        type="button"
                        onClick={() => setSquadQrSubMode('pair')}
                        className={`py-1.5 px-2 rounded-lg transition-all cursor-pointer ${
                          squadQrSubMode === 'pair'
                            ? 'bg-white text-stone-900 font-semibold shadow-2xs'
                            : 'text-stone-600 hover:text-stone-900'
                        }`}
                      >
                        📱 Pair with Phone QR
                      </button>
                    </div>
                  )}

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
                    {currentQrUrl}
                  </div>

                  <p className="text-[11px] font-serif text-stone-500 max-w-xs mx-auto leading-relaxed">
                    {squadQrSubMode === 'pair' && isProUnlocked
                      ? 'Point your phone camera at this QR code to transfer your active cadence to mobile.'
                      : 'Study buddy at your table? Point their camera at this screen to instantly sync daylight focus blocks on this live site.'}
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
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: PAIR WITH PHONE (PRO FEATURE)                      */}
        {/* ========================================================= */}
        {tab === 'pair' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {!isProUnlocked ? (
              /* Free Tier Pro Gate Card */
              <div className="p-5 bg-white border border-stone-200/90 rounded-2xl shadow-xs space-y-4 text-center">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-100/70 border border-amber-200 text-amber-800 flex items-center justify-center shadow-2xs">
                  <Smartphone className="w-6 h-6" />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-center gap-1.5">
                    <h3 className="text-base font-serif font-semibold text-stone-900">
                      Cadence Pro: 1-Click Mobile Pair & Sync
                    </h3>
                    <span className="text-[9px] font-sans font-bold uppercase tracking-wider bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded-md">
                      Pro
                    </span>
                  </div>
                  <p className="text-xs font-serif text-stone-600 max-w-sm mx-auto leading-relaxed">
                    Point your phone camera to transfer your active daylight schedule, tasks, and settings to your phone in 1 tap, and install Cadence directly to your home screen.
                  </p>
                </div>

                <div className="p-3 bg-stone-50 border border-stone-200/80 rounded-xl text-left space-y-2 text-xs font-serif text-stone-700">
                  <div className="flex items-start gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-stone-900 shrink-0 mt-0.5" />
                    <span><strong>1-Camera-Scan Sync:</strong> No accounts, passwords, or logins. Your active cadence transfers instantly via compact QR code.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Download className="w-3.5 h-3.5 text-stone-900 shrink-0 mt-0.5" />
                    <span><strong>Instant PWA Installation:</strong> Install Cadence sanctuary to your iPhone or Android home screen for pure offline zen focus.</span>
                  </div>
                </div>

                <div className="space-y-3 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (onOpenAddOns) {
                        onOpenAddOns();
                      } else {
                        window.open(PRO_ADDON.checkoutUrl, '_blank');
                      }
                    }}
                    className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-xs sm:text-sm font-serif font-semibold bg-stone-900 hover:bg-stone-800 text-white rounded-xl shadow-xs transition-all active:scale-[0.98] cursor-pointer min-h-[44px]"
                  >
                    <span>Unlock Cadence Pro ({`$${PRO_ADDON.monthlyPrice}/mo or $${PRO_ADDON.yearlyPrice}/yr`})</span>
                    <ArrowRight className="w-4 h-4 ml-0.5" />
                  </button>

                  {/* 1-Click Developer Bypass Unlock */}
                  <div className="pt-2 border-t border-stone-100 flex flex-col items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleQuickUnlock('test-importer')}
                      className="text-xs font-mono text-stone-600 hover:text-stone-900 underline decoration-stone-300 cursor-pointer inline-flex items-center gap-1"
                    >
                      <KeyRound className="w-3 h-3 text-amber-600" />
                      <span>Developer Unlock: Click to activate test-importer</span>
                    </button>
                    {bypassMsg && (
                      <span className="text-[11px] font-serif text-emerald-700">{bypassMsg}</span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* Unlocked Pro Mobile Sync UI */
              <div className="space-y-4">
                <p className="text-xs text-stone-600 leading-relaxed font-sans">
                  Scan this live QR code with your phone camera to instantly transfer your schedule or install Cadence PWA to your mobile home screen.
                </p>

                {/* Sub-mode Toggle: Active Cadence vs Clean PWA Link */}
                <div className="grid grid-cols-2 gap-2 p-1 bg-stone-200/60 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setPairMode('active')}
                    className={`py-2 px-2.5 rounded-lg text-xs font-serif transition-all cursor-pointer text-center ${
                      pairMode === 'active'
                        ? 'bg-white text-stone-900 font-semibold shadow-xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    ⚡ Transfer Active Cadence
                  </button>
                  <button
                    type="button"
                    onClick={() => setPairMode('pwa')}
                    className={`py-2 px-2.5 rounded-lg text-xs font-serif transition-all cursor-pointer text-center ${
                      pairMode === 'pwa'
                        ? 'bg-white text-stone-900 font-semibold shadow-xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    📲 Install Cadence PWA
                  </button>
                </div>

                {/* Interactive Dynamic QR Display */}
                <div className="p-5 bg-white border border-stone-200/90 rounded-2xl shadow-xs text-center space-y-3">
                  <div className="flex items-center justify-between pb-1 border-b border-stone-100">
                    <div className="text-xs font-serif font-medium text-stone-800 flex items-center gap-1.5">
                      <QrCode className="w-3.5 h-3.5 text-stone-600" />
                      <span>
                        {pairMode === 'active' ? 'scan to transfer active schedule' : 'scan to install cadence pwa'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span>{liveHost}</span>
                    </div>
                  </div>

                  <div className="flex justify-center items-center py-1">
                    {qrLoading ? (
                      <div className="w-52 h-52 flex items-center justify-center text-xs font-serif text-stone-400">
                        generating live qr code...
                      </div>
                    ) : qrSvg ? (
                      <div
                        className="w-52 h-52 max-w-full rounded-2xl overflow-hidden p-2.5 bg-[#FAF8F5] border border-stone-200/80 flex items-center justify-center shadow-2xs [&>svg]:w-full [&>svg]:h-full"
                        dangerouslySetInnerHTML={{ __html: qrSvg }}
                      />
                    ) : null}
                  </div>

                  {/* Clean display of dynamic live target URL */}
                  <div className="space-y-1 text-left">
                    <div className="flex items-center justify-between text-[10px] font-serif text-stone-500">
                      <span>Live Target URL (dynamically encoded):</span>
                      <a
                        href={currentQrUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-stone-600 hover:text-stone-900 underline inline-flex items-center gap-0.5"
                      >
                        <span>test link</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                    <div className="text-[11px] font-mono text-stone-700 bg-stone-100/90 px-2.5 py-1.5 rounded-xl border border-stone-200/70 break-all max-w-full select-all">
                      {currentQrUrl}
                    </div>
                  </div>

                  {/* Step-by-Step Instructions */}
                  <div className="grid grid-cols-3 gap-2 text-left pt-1">
                    <div className="p-2 rounded-xl bg-stone-50 border border-stone-200/60 text-[10px] font-serif text-stone-700 leading-tight">
                      <span className="font-sans font-bold text-stone-900 block mb-0.5">1. Scan</span>
                      Point iPhone or Android camera at this QR code
                    </div>
                    <div className="p-2 rounded-xl bg-stone-50 border border-stone-200/60 text-[10px] font-serif text-stone-700 leading-tight">
                      <span className="font-sans font-bold text-stone-900 block mb-0.5">2. Tap Link</span>
                      Opens live app & syncs active cadence in 1s
                    </div>
                    <div className="p-2 rounded-xl bg-stone-50 border border-stone-200/60 text-[10px] font-serif text-stone-700 leading-tight">
                      <span className="font-sans font-bold text-stone-900 block mb-0.5">3. Add to Home</span>
                      Tap browser menu → "Add to Home Screen"
                    </div>
                  </div>
                </div>

                {/* Pair Action Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleCopyPair}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-stone-900 hover:bg-stone-800 text-white font-medium text-xs rounded-xl transition-all shadow-xs cursor-pointer active:scale-[0.98] min-h-[44px]"
                  >
                    {pairCopied ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span>Link Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copy Mobile Sync Link</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleNativePairShare}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-stone-100 hover:bg-stone-200/80 border border-stone-200/90 text-stone-800 font-medium text-xs rounded-xl transition-all cursor-pointer active:scale-[0.98] min-h-[44px]"
                  >
                    <Share2 className="w-4 h-4 text-stone-600" />
                    <span>Send via AirDrop / Share</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

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
