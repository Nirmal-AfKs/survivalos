import React, { useState } from 'react';
import { X, Share2, Copy, Check, MessageSquare, Send, Users, Sparkles, Sun, Clock } from 'lucide-react';
import { ScheduledSlot, ScheduleSettings, LifeEvent, SquadSharePayload } from '../types';
import { formatDateKey } from '../utils/scheduler';
import { buildSquadShareUrl, copyToClipboardSafe } from '../utils/squad';

interface SquadRadarModalProps {
  isOpen: boolean;
  onClose: () => void;
  slots: ScheduledSlot[];
  events: LifeEvent[];
  settings: ScheduleSettings;
  todayKey: string;
}

export const SquadRadarModal: React.FC<SquadRadarModalProps> = ({
  isOpen,
  onClose,
  slots,
  events,
  settings,
  todayKey,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const todayDateObj = new Date();
  const dayName = todayDateObj.toLocaleDateString('en-US', { weekday: 'long' });
  const monthDay = todayDateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const todaySlots = slots.filter(s => s.date === todayKey);
  const todayEvents = events.filter(e => e.date === todayKey);

  const dayOfWeek = todayDateObj.getDay();
  const todayMode = (settings.dateSpecificModes && settings.dateSpecificModes[todayKey]) ||
    (settings.dayModes && settings.dayModes[dayOfWeek]) ||
    (settings.fullyHomeDay.applicableDays.includes(dayOfWeek) ? 'fully_home' : 'routine_work');

  const userCurfew = todayMode === 'fully_home' 
    ? settings.fullyHomeDay.endHour 
    : settings.averageDay.endHour;

  const payload: SquadSharePayload = {
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
  };

  const squadShareUrl = buildSquadShareUrl(payload);

  // Build warm natural availability text for the squad
  const generateShareText = () => {
    let text = `🌿 My cadence for ${dayName}, ${monthDay}:\n\n`;

    if (todayMode === 'free_rest') {
      text += `🏖️ Today is a full free rest day! Free anytime to hang out or chat.\n`;
    } else {
      if (todaySlots.length > 0) {
        text += `🎯 Focused blocks:\n`;
        todaySlots.forEach(s => {
          text += `  • ${s.startTime}–${s.endTime} (${s.workTitle})\n`;
        });
      } else {
        text += `✨ Open day: Zero scheduled work blocks.\n`;
      }

      if (todayEvents.length > 0) {
        text += `\n📍 Commitments:\n`;
        todayEvents.forEach(e => {
          text += `  • ${e.time}: ${e.title} (${e.durationMinutes}m)\n`;
        });
      }

      if (todayMode === 'fully_home') {
        text += `\n☕ Best free overlap: Lunch 12:30–13:30 or evening after 17:30.\n`;
      } else {
        text += `\n☕ Best free overlap: Before 18:00 or late evening after 21:30.\n`;
      }
    }

    text += `\n⚡ 1-Tap Match daylight & co-work with me on cadence:\n${squadShareUrl}\n`;
    text += `\n(Shared from cadence. sanctuary • curfew locked at ${userCurfew || '21:30'})`;
    return text;
  };

  const shareText = generateShareText();
  const encodedText = encodeURIComponent(shareText);

  const handleCopy = async () => {
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
      handleCopy();
    }
  };

  const shareTelegram = () => {
    try {
      window.open(`https://t.me/share/url?url=${encodeURIComponent(squadShareUrl)}&text=${encodedText}`, '_blank');
    } catch {
      handleCopy();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs overflow-y-auto">
      <div 
        className="bg-[#faf7f2] rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-xl border border-stone-200/80 my-8 space-y-6 animate-in fade-in zoom-in-95 duration-150 text-stone-900"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="text-xs font-serif italic text-stone-500">
              social harmony & study sync
            </div>
            <h2 className="text-2xl font-serif font-normal tracking-tight text-stone-900">
              squad overlap radar.
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 rounded-xl hover:bg-stone-200/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-stone-600 leading-relaxed font-sans">
          Share your daily flow, focus windows, and open coffee slots with friends, co-workers, or study partners in one tap so they know when you are in flow and when you are free.
        </p>

        {/* Preview Card */}
        <div className="bg-white/80 border border-stone-200/70 rounded-2xl p-4 space-y-3 font-mono text-xs text-stone-700 whitespace-pre-line leading-relaxed shadow-2xs">
          {shareText}
        </div>

        {/* 1-Tap Sharing Loops */}
        <div className="space-y-2.5 pt-1">
          <div className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
            1-Tap Instant Sharing Loops
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* WhatsApp */}
            <button
              onClick={shareWhatsApp}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/30 text-[#128C7E] font-medium text-xs rounded-xl transition-all cursor-pointer active:scale-[0.98] min-h-[44px]"
            >
              <MessageSquare className="w-4 h-4 text-[#25D366]" />
              <span>Share to WhatsApp</span>
            </button>

            {/* Telegram */}
            <button
              onClick={shareTelegram}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-[#0088cc]/10 hover:bg-[#0088cc]/20 border border-[#0088cc]/30 text-[#0088cc] font-medium text-xs rounded-xl transition-all cursor-pointer active:scale-[0.98] min-h-[44px]"
            >
              <Send className="w-4 h-4 text-[#0088cc]" />
              <span>Share to Telegram</span>
            </button>
          </div>

          {/* Copy Button */}
          <button
            onClick={handleCopy}
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

        {/* Subtle footer */}
        <div className="text-[11px] text-stone-400 text-center font-serif italic pt-1">
          cadence. sanctuary — zero spam, gentle human coordination
        </div>
      </div>
    </div>
  );
};
