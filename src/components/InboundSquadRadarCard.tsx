import React, { useState } from 'react';
import { 
  Users, 
  Sparkles, 
  Zap, 
  Share2, 
  MessageSquare, 
  Send, 
  Copy, 
  Check, 
  Moon, 
  Sun, 
  Clock, 
  X,
  CheckCircle2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { SquadSharePayload, SquadFocusBlock, ScheduledSlot, ScheduleSettings } from '../types';
import { shareRadarIntent, copyToClipboardSafe, buildSquadShareUrl, buildSquadReplyUrl, getSquadBaseUrl } from '../utils/squad';

interface InboundSquadRadarCardProps {
  inboundSquad: SquadSharePayload;
  todaySlots: ScheduledSlot[];
  matchedSlotId: string | null;
  settings: ScheduleSettings;
  onMatchDaylight: (friendBlock: SquadFocusBlock) => void;
  onDismiss: () => void;
}

export const InboundSquadRadarCard: React.FC<InboundSquadRadarCardProps> = ({
  inboundSquad,
  todaySlots,
  matchedSlotId,
  settings,
  onMatchDaylight,
  onDismiss,
}) => {
  const [copied, setCopied] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  const friendName = inboundSquad.friendName || 'Friend';
  const friendBlocks = inboundSquad.blocks || [];
  const primaryFriendBlock: SquadFocusBlock = friendBlocks[0] || {
    startTime: '16:00',
    endTime: '16:45',
    title: 'Pure Mathematics Review',
    category: 'study',
    durationMinutes: 45,
  };

  const dayOfWeek = new Date().getDay();
  const isFullyHome = settings.fullyHomeDay.applicableDays.includes(dayOfWeek);
  const userCurfew = isFullyHome ? settings.fullyHomeDay.endHour : settings.averageDay.endHour;

  // Check if visitor has matched slot
  const matchedSlot = todaySlots.find(s => 
    s.id === matchedSlotId || 
    s.category === 'co-working' || 
    s.workTitle.includes('Squad') ||
    (s.startTime === primaryFriendBlock.startTime && s.endTime === primaryFriendBlock.endTime)
  );

  const isMatched = Boolean(matchedSlot || inboundSquad.matched);
  const activeMatchedTime = matchedSlot 
    ? `${matchedSlot.startTime} – ${matchedSlot.endTime}` 
    : `${primaryFriendBlock.startTime} – ${primaryFriendBlock.endTime}`;

  const handleMatch = () => {
    try {
      confetti({
        particleCount: 55,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#2e5339', '#52795d', '#d97706', '#1c1917'],
      });
    } catch {
      // ignore
    }
    onMatchDaylight(primaryFriendBlock);
  };

  const generateReplySquadUrl = (): string => {
    return buildSquadReplyUrl({
      v: 1,
      curfew: userCurfew || '21:30',
      dateKey: inboundSquad.dateKey || new Date().toISOString().slice(0, 10),
      dayMode: isFullyHome ? 'fully_home' : 'routine_work',
      blocks: todaySlots.length > 0
        ? todaySlots.map(s => ({
            startTime: s.startTime,
            endTime: s.endTime,
            title: s.workTitle.replace(/\s*—\s*\d+h(\s*\d+m)?|\s*—\s*\d+m/gi, '').trim(),
            category: s.category,
            durationMinutes: s.durationMinutes,
          }))
        : [primaryFriendBlock],
      friendName: 'You',
      matched: true,
    });
  };

  const getReturnShareText = () => {
    const replyUrl = generateReplySquadUrl();
    return `⚡ Matched daylight focus with ${friendName}! Overlap sprint locked in before our curfew hits (${userCurfew || '21:30'}): ${replyUrl} (No login, 100% free)`;
  };

  const handleReturnShare = async () => {
    const text = getReturnShareText();
    const result = await shareRadarIntent(text);
    if (result === 'copied') {
      setCopied(true);
      setShareFeedback('⚡ Reply squad URL generated & copied to clipboard!');
      setTimeout(() => {
        setCopied(false);
        setShareFeedback(null);
      }, 3500);
    } else {
      setShareFeedback('⚡ Reply radar intent opened!');
      setTimeout(() => setShareFeedback(null), 3000);
    }
  };

  const handleShareWhatsApp = () => {
    const text = getReturnShareText();
    try {
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
    } catch {
      handleReturnShare();
    }
  };

  const handleShareTelegram = () => {
    const text = getReturnShareText();
    const replyUrl = generateReplySquadUrl();
    try {
      window.open(`https://t.me/share/url?url=${encodeURIComponent(replyUrl)}&text=${encodeURIComponent(text)}`, '_blank');
    } catch {
      handleReturnShare();
    }
  };

  const handleCopyLink = async () => {
    const text = getReturnShareText();
    const ok = await copyToClipboardSafe(text);
    if (ok) {
      setCopied(true);
      setShareFeedback('⚡ Reply squad URL generated & copied to clipboard!');
      setTimeout(() => {
        setCopied(false);
        setShareFeedback(null);
      }, 3500);
    }
  };

  return (
    <div className="bg-[#FAF8F5] border-2 border-stone-300/80 rounded-3xl p-5 sm:p-7 shadow-xs relative overflow-hidden transition-all text-stone-900 animate-in fade-in slide-in-from-top-2 duration-200">
      {/* Background warm sage glow */}
      <div 
        aria-hidden="true" 
        className="absolute -top-12 -right-12 w-48 h-48 bg-[#E2E8DE]/60 rounded-full blur-2xl pointer-events-none" 
      />

      {/* Top Banner: ⚡ Viewing [Friend]'s daylight focus for today. */}
      <div className="flex items-start justify-between gap-4 relative z-10 pb-4 border-b border-stone-200/80">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm sm:text-base font-serif font-semibold text-stone-900">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#E2E8DE] text-stone-900 border border-[#C8D6C2] text-xs">
              ⚡
            </span>
            <span className="tracking-tight">
              ⚡ Viewing {friendName}&apos;s daylight focus for today.
            </span>
          </div>
          <p className="text-xs font-serif italic text-stone-600">
            curfew locked at {inboundSquad.curfew || '21:30'} • daylight focus blocks active alongside your schedule.
          </p>
        </div>

        <button
          onClick={onDismiss}
          className="p-1.5 text-stone-400 hover:text-stone-700 rounded-xl hover:bg-stone-200/50 transition-colors cursor-pointer"
          title="Dismiss friend's radar"
          aria-label="Dismiss radar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Side-by-Side Daylight Comparison: Overlay local blocks alongside friend's blocks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 relative z-10">
        {/* Left: Friend's Focus Blocks */}
        <div className="bg-white/80 border border-stone-200/90 rounded-2xl p-4 space-y-2.5 shadow-2xs">
          <div className="flex items-center justify-between text-[11px] font-serif uppercase tracking-wider text-stone-700 font-semibold">
            <span>{friendName}&apos;s Daylight Focus</span>
            <span className="text-stone-400 font-mono font-normal">curfew: {inboundSquad.curfew || '21:30'}</span>
          </div>

          <div className="space-y-2">
            {friendBlocks.map((block, idx) => {
              const isBlockMatched = isMatched && (
                idx === 0 || 
                (matchedSlot && matchedSlot.startTime === block.startTime)
              );

              return (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border transition-all ${
                    isBlockMatched
                      ? 'bg-[#E2E8DE] border-[#C8D6C2] text-stone-900 font-medium shadow-2xs ring-1 ring-[#BAC7B4]'
                      : 'bg-stone-50 border-stone-200/80 text-stone-800'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="tabular-nums font-mono font-semibold">
                      {block.startTime} – {block.endTime}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-serif ${
                      isBlockMatched
                        ? 'bg-white/90 border-[#BAC7B4] text-stone-900 font-medium'
                        : 'bg-white/70 border-stone-200 text-stone-700'
                    }`}>
                      {block.durationMinutes}m sprint
                    </span>
                  </div>
                  <div className="text-sm font-serif font-medium mt-1">
                    {block.title}
                  </div>
                  {isBlockMatched && (
                    <div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-serif text-stone-800 font-medium">
                      <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block" />
                      <span>🌿 overlapping daylight slot synchronized</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Viewer's Local Daylight Schedule Overlay */}
        <div className="bg-white/80 border border-stone-200/80 rounded-2xl p-4 space-y-2.5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[11px] font-serif uppercase tracking-wider text-stone-700 font-semibold">
              <span>Your Daylight Schedule</span>
              <span className="text-stone-400 font-serif lowercase">cadence. sanctuary</span>
            </div>

            <div className="mt-2.5">
              {matchedSlot ? (
                /* Overlapping Free/Focus Slot highlighted in warm sage green (#E2E8DE) */
                <div className="p-3.5 rounded-xl bg-[#E2E8DE] border-2 border-[#BAC7B4] text-stone-900 shadow-xs ring-2 ring-[#BAC7B4]/40 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="tabular-nums font-mono font-semibold text-stone-900">
                      {matchedSlot.startTime} – {matchedSlot.endTime}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/90 font-bold text-stone-900 border border-[#BAC7B4] font-serif">
                      🌿 OVERLAP IN SAGE (#E2E8DE)
                    </span>
                  </div>
                  <div className="text-sm font-serif font-medium text-stone-900">
                    {matchedSlot.workTitle}
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-stone-700 font-serif">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-800 shrink-0" />
                    <span>Synchronized co-working slot saved to your device.</span>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 text-stone-600 text-xs font-serif leading-relaxed space-y-2">
                  <p>
                    Your daylight is open. Tapping below overlays your blocks and locks in this shared co-focus sprint before curfew.
                  </p>
                  <div className="text-stone-600 font-mono text-[11px] bg-white/90 border border-stone-200/70 p-2 rounded-lg">
                    Overlap Candidate: {primaryFriendBlock.startTime} – {primaryFriendBlock.endTime} ({primaryFriendBlock.durationMinutes}m)
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="pt-2 text-[11px] font-serif italic text-stone-500">
            curfew harmony: wraps before {inboundSquad.curfew || 'curfew'}
          </div>
        </div>
      </div>

      {/* Action Zone: [ Match My Schedule ] OR 1-Tap [ Send Overlap Back ] */}
      <div className="pt-5 mt-4 border-t border-stone-200/80 relative z-10">
        {!isMatched ? (
          /* STEP 1: [ Match My Schedule ] */
          <div className="space-y-2">
            <button
              onClick={handleMatch}
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-serif font-medium text-white bg-stone-900 hover:bg-stone-800 rounded-2xl transition-all shadow-md active:scale-[0.99] cursor-pointer min-h-[48px] group"
            >
              <Zap className="w-4 h-4 text-amber-300 group-hover:scale-110 transition-transform fill-current" />
              <span>[ Match My Schedule ]</span>
            </button>
            <p className="text-[11px] text-center font-serif text-stone-500 italic">
              1-tap locks in the overlap, highlights shared daylight in warm sage (#E2E8DE), and prepares your reply link.
            </p>
          </div>
        ) : (
          /* STEP 2: 1-Tap [ Send Overlap Back ] (generates reply squad URL) */
          <div className="space-y-3">
            <div className="p-3 rounded-2xl bg-[#E2E8DE]/70 border border-[#C8D6C2] text-stone-900 text-xs font-serif flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">🌿</span>
                <span>
                  <strong>Overlap Active:</strong> {activeMatchedTime} • Both schedules aligned in warm sage green!
                </span>
              </div>
            </div>

            {/* Primary Return Share Button: [ Send Overlap Back ] */}
            <button
              onClick={handleReturnShare}
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-serif font-medium text-stone-900 bg-[#E2E8DE] hover:bg-[#d5ded0] border border-[#BAC7B4] rounded-2xl transition-all shadow-xs active:scale-[0.99] cursor-pointer min-h-[48px]"
            >
              <MessageSquare className="w-4 h-4 text-stone-800" />
              <span>[ Send Overlap Back ]</span>
            </button>

            {/* Instant Webview & App Fallbacks */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-xs font-serif">
              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/30 text-[#128C7E] cursor-pointer transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5 text-[#25D366]" />
                <span>WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={handleShareTelegram}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0088cc]/10 hover:bg-[#0088cc]/20 border border-[#0088cc]/30 text-[#0088cc] cursor-pointer transition-colors"
              >
                <Send className="w-3.5 h-3.5 text-[#0088cc]" />
                <span>Telegram</span>
              </button>

              <button
                type="button"
                onClick={handleCopyLink}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 border border-stone-200 text-stone-700 cursor-pointer transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-stone-600" />}
                <span>{copied ? 'Copied Reply URL!' : 'Copy Reply Link'}</span>
              </button>
            </div>

            {shareFeedback && (
              <div className="text-center text-xs font-serif font-medium text-emerald-800 animate-in fade-in duration-150">
                {shareFeedback}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 🔒 Zero-Leak Privacy Note */}
      <div className="pt-3 text-[11px] font-serif text-stone-600 flex items-center justify-center gap-1.5 border-t border-stone-200/70 mt-3 relative z-10 text-center">
        <span>🔒 Zero-Leak: Only your open daylight hours are shared. Your tasks and private notes remain strictly on your device.</span>
      </div>
    </div>
  );
};
