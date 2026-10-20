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
import { shareRadarIntent, copyToClipboardSafe, buildSquadShareUrl } from '../utils/squad';

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

  const friendBlocks = inboundSquad.blocks || [];
  const primaryFriendBlock: SquadFocusBlock = friendBlocks[0] || {
    startTime: '16:00',
    endTime: '16:45',
    title: 'Pure Mathematics Review',
    category: 'study',
    durationMinutes: 45,
  };

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
        colors: ['#d97706', '#b45309', '#15803d', '#1c1917'],
      });
    } catch {
      // ignore
    }
    onMatchDaylight(primaryFriendBlock);
  };

  const getReturnShareText = () => {
    // Current URL with squad hash preserved
    const url = window.location.href;
    return `Matched our daylight on cadence! Overlap sprint locked in before our sleep curfew hits 🌙: ${url}`;
  };

  const handleReturnShare = async () => {
    const text = getReturnShareText();
    const result = await shareRadarIntent(text);
    if (result === 'copied') {
      setCopied(true);
      setShareFeedback('Copied matched radar link to clipboard!');
      setTimeout(() => {
        setCopied(false);
        setShareFeedback(null);
      }, 3000);
    } else {
      setShareFeedback('Radar intent opened!');
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
    try {
      window.open(`https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(text)}`, '_blank');
    } catch {
      handleReturnShare();
    }
  };

  const handleCopyLink = async () => {
    const text = getReturnShareText();
    const ok = await copyToClipboardSafe(text);
    if (ok) {
      setCopied(true);
      setShareFeedback('Copied matched radar message & link!');
      setTimeout(() => {
        setCopied(false);
        setShareFeedback(null);
      }, 3000);
    }
  };

  return (
    <div className="bg-[#FAF8F5] border-2 border-amber-300/80 rounded-3xl p-6 sm:p-7 shadow-xs relative overflow-hidden transition-all text-stone-900 animate-in fade-in slide-in-from-top-2 duration-200">
      {/* Background warm amber glow */}
      <div 
        aria-hidden="true" 
        className="absolute -top-12 -right-12 w-48 h-48 bg-amber-200/30 rounded-full blur-2xl pointer-events-none" 
      />

      {/* Header Bar */}
      <div className="flex items-start justify-between gap-4 relative z-10 pb-4 border-b border-amber-200/60">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-serif font-medium text-amber-900">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-200/70 text-amber-900">
              👥
            </span>
            <span className="tracking-wide">
              friend's daylight rhythm active • curfew locked at {inboundSquad.curfew || '21:30'}
            </span>
          </div>
          <p className="text-xs font-serif italic text-stone-600">
            their daylight focus blocks are active alongside your day. zero typing to lock in overlap.
          </p>
        </div>

        <button
          onClick={onDismiss}
          className="p-1 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-200/50 transition-colors cursor-pointer"
          title="Dismiss friend's radar"
          aria-label="Dismiss radar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Side-by-Side Daylight Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 relative z-10">
        {/* Left: Friend's Focus Blocks */}
        <div className="bg-white/80 border border-amber-200/70 rounded-2xl p-4 space-y-2.5 shadow-2xs">
          <div className="flex items-center justify-between text-[11px] font-serif uppercase tracking-wider text-amber-900 font-semibold">
            <span>Friend's Daylight Focus</span>
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
                      ? 'bg-amber-100/80 border-amber-400 text-amber-950 font-medium shadow-2xs ring-1 ring-amber-300'
                      : 'bg-stone-50 border-stone-200/80 text-stone-800'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="tabular-nums font-mono font-semibold">
                      {block.startTime} – {block.endTime}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/70 border border-amber-200 text-amber-900 font-serif">
                      {block.durationMinutes}m sprint
                    </span>
                  </div>
                  <div className="text-sm font-serif font-medium mt-1">
                    {block.title}
                  </div>
                  {isBlockMatched && (
                    <div className="mt-1 flex items-center gap-1 text-[11px] font-serif text-amber-800">
                      <Zap className="w-3 h-3 text-amber-600 fill-current" />
                      <span>matched daylight sprint</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Visitor's Matching Schedule */}
        <div className="bg-white/80 border border-stone-200/80 rounded-2xl p-4 space-y-2.5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[11px] font-serif uppercase tracking-wider text-stone-600 font-semibold">
              <span>Your Schedule Today</span>
              <span className="text-stone-400 font-serif lowercase">cadence. sanctuary</span>
            </div>

            <div className="mt-2.5">
              {matchedSlot ? (
                <div className="p-3 rounded-xl bg-amber-100/90 border-2 border-amber-400 text-amber-950 shadow-xs ring-2 ring-amber-300/40">
                  <div className="flex items-center justify-between text-xs">
                    <span className="tabular-nums font-mono font-semibold">
                      {matchedSlot.startTime} – {matchedSlot.endTime}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-200/80 font-bold text-amber-900 font-serif">
                      ⚡ OVERLAP LOCKED
                    </span>
                  </div>
                  <div className="text-sm font-serif font-medium mt-1">
                    {matchedSlot.workTitle}
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 text-[11px] text-amber-800 font-serif">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-700" />
                    <span>Synchronized co-working session active in your cadence!</span>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 text-stone-600 text-xs font-serif leading-relaxed">
                  <p>
                    Your daylight is open. 1-tap locks in an identical sprint alongside your friend before either of your sleep curfews hit.
                  </p>
                  <div className="mt-2 text-stone-500 font-mono text-[11px]">
                    Candidate window: {primaryFriendBlock.startTime} – {primaryFriendBlock.endTime} ({primaryFriendBlock.durationMinutes}m)
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

      {/* Action Zone: 1-Tap Daylight Match OR 1-Tap Return Share */}
      <div className="pt-5 mt-4 border-t border-amber-200/60 relative z-10">
        {!isMatched ? (
          /* STEP 1: 1-TAP DAYLIGHT MATCH (ZERO TYPING) */
          <div className="space-y-2">
            <button
              onClick={handleMatch}
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-serif font-medium text-white bg-stone-900 hover:bg-stone-800 rounded-2xl transition-all shadow-md active:scale-[0.99] cursor-pointer min-h-[48px] group"
            >
              <Zap className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform fill-current" />
              <span>⚡ Match Daylight & Find Overlap</span>
            </button>
            <p className="text-[11px] text-center font-serif text-stone-500 italic">
              instant 1-tap: creates matching focus block, highlights daylight overlap, and saves to your cadence.
            </p>
          </div>
        ) : (
          /* STEP 2: 1-TAP RETURN SHARE (WHATSAPP / TELEGRAM INTENT) */
          <div className="space-y-3">
            <div className="p-3 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-serif flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">⚡</span>
                <span>
                  <strong>Overlap Active:</strong> {activeMatchedTime} • Both calendars locked before evening sleep curfew!
                </span>
              </div>
            </div>

            {/* Primary Return Share Button */}
            <button
              onClick={handleReturnShare}
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-serif font-medium text-stone-900 bg-amber-300 hover:bg-amber-400 border border-amber-400 rounded-2xl transition-all shadow-sm active:scale-[0.99] cursor-pointer min-h-[48px]"
            >
              <MessageSquare className="w-4 h-4 text-stone-900" />
              <span>💬 Send Matched Radar Back (1-Tap)</span>
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
                <span>{copied ? 'Copied!' : 'Copy Link'}</span>
              </button>
            </div>

            {shareFeedback && (
              <div className="text-center text-xs font-serif font-medium text-emerald-700 animate-in fade-in duration-150">
                {shareFeedback}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
