import React, { useState } from 'react';
import { 
  Play, 
  CheckCircle2, 
  RotateCcw, 
  Check, 
  Users,
  Compass,
  MapPin,
  Coffee,
  Sparkles,
  Moon,
  Sun,
  Repeat,
  Zap,
  AlertTriangle,
  Shield,
  Share2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ScheduledSlot, LifeEvent, WorkTask, ScheduleSettings, SquadSharePayload, SquadFocusBlock } from '../types';
import { formatDateKey, addDays } from '../utils/scheduler';
import { formatChunkTitle, formatRecurringDaysShort, formatEventTimeSpan, formatBufferLabel } from '../utils/format';
import { InboundSquadRadarCard } from './InboundSquadRadarCard';
import { CognitiveTriageModal } from './CognitiveTriageModal';

interface TodayViewProps {
  todayKey: string;
  slots: ScheduledSlot[];
  tasks: WorkTask[];
  events: LifeEvent[];
  settings: ScheduleSettings;
  isSampleSchedule: boolean;
  inboundSquad?: SquadSharePayload | null;
  matchedSlotId?: string | null;
  onClearSample: () => void;
  onToggleSlotComplete: (slotId: string) => void;
  onStartFocus: (slot: ScheduledSlot, mode?: 'focus' | 'ramp_up') => void;
  onRescheduleSlot: (slotId: string) => void;
  onOpenAdd: () => void;
  onOpenSquadRadar: () => void;
  onPeekTomorrow: () => void;
  onToggleWhatToBring: (eventId: string, itemId: string) => void;
  onRebalance: () => void;
  onApplyTriage?: (updatedTasks: WorkTask[], rebalancedSlots: ScheduledSlot[], toastMessage: string) => void;
  onMatchDaylight?: (friendBlock: SquadFocusBlock) => void;
  onDismissInboundSquad?: () => void;
}

export const TodayView: React.FC<TodayViewProps> = ({
  todayKey,
  slots,
  tasks,
  events,
  settings,
  isSampleSchedule,
  inboundSquad,
  matchedSlotId,
  onClearSample,
  onToggleSlotComplete,
  onStartFocus,
  onRescheduleSlot,
  onOpenAdd,
  onOpenSquadRadar,
  onPeekTomorrow,
  onToggleWhatToBring,
  onRebalance,
  onApplyTriage,
  onMatchDaylight,
  onDismissInboundSquad,
}) => {
  const todayDateObj = new Date();
  const dayOfWeek = todayDateObj.getDay();

  const [isRebalanceConfirmOpen, setIsRebalanceConfirmOpen] = useState(false);
  const unscheduledSlots = slots.filter(s => s.isUnscheduled);

  const todaySlots = slots.filter(s => s.date === todayKey);
  const todayEvents = events.filter(e => {
    if (e.recurringDays && e.recurringDays.length > 0) {
      return e.recurringDays.includes(dayOfWeek);
    }
    return e.date === todayKey;
  });

  const pendingSlots = todaySlots.filter(s => !s.isCompleted);
  const completedSlots = todaySlots.filter(s => s.isCompleted);
  const nextSlot = pendingSlots[0];

  const totalMinutesToday = todaySlots.reduce((acc, s) => acc + s.durationMinutes, 0);
  const completedMinutesToday = completedSlots.reduce((acc, s) => acc + s.durationMinutes, 0);
  const todayMode = (settings.dateSpecificModes && settings.dateSpecificModes[todayKey]) ||
    (settings.dayModes && settings.dayModes[dayOfWeek]) ||
    (settings.fullyHomeDay.applicableDays.includes(dayOfWeek) ? 'fully_home' : 'routine_work');

  const isFullyHome = todayMode === 'fully_home';
  const isRestDay = todayMode === 'free_rest';
  const isEmptyOrRest = (todaySlots.length === 0 && todayEvents.length === 0) || isRestDay;

  // Chronologically sorted timeline items (focus slots + commitments)
  const timelineItems: Array<
    | { type: 'slot'; time: string; slot: ScheduledSlot }
    | { type: 'event'; time: string; event: LifeEvent }
  > = [
    ...todaySlots.map(slot => ({ type: 'slot' as const, time: slot.startTime, slot })),
    ...todayEvents.map(event => ({ type: 'event' as const, time: event.time, event })),
  ].sort((a, b) => a.time.localeCompare(b.time));

  const dayName = todayDateObj.toLocaleDateString('en-US', { weekday: 'long' });
  const monthDay = todayDateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 45,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#292524', '#15803d', '#4f46e5', '#d97706'],
      });
    } catch {
      // ignore
    }
  };

  const handleCompleteWithCelebration = (slotId: string) => {
    triggerConfetti();
    onToggleSlotComplete(slotId);
  };

  return (
    <div className="space-y-8 pb-12 text-stone-900">
      {/* INBOUND SQUAD RADAR HERO CARD */}
      {inboundSquad && (
        <InboundSquadRadarCard
          inboundSquad={inboundSquad}
          todaySlots={todaySlots}
          matchedSlotId={matchedSlotId || null}
          settings={settings}
          onMatchDaylight={onMatchDaylight || (() => {})}
          onDismiss={onDismissInboundSquad || (() => {})}
        />
      )}

      {/* 1-Tap Sample Rhythm Handover Banner (Hidden if Inbound Squad is Active) */}
      {isSampleSchedule && !inboundSquad && (
        <div className="bg-[#f4f1ea] border border-stone-200/90 rounded-2xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-serif text-stone-700 shadow-2xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <span>🌱</span>
            <span>default sanctuary cadence • everyday has sample work • vanishes automatically as you start adding your own</span>
          </div>
          <button
            onClick={onClearSample}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-serif text-stone-900 bg-white hover:bg-stone-50 border border-stone-300 rounded-xl transition-all self-start sm:self-auto cursor-pointer shadow-2xs font-medium"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Clear Defaults & Start Fresh</span>
          </button>
        </div>
      )}

      {/* Editorial Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-serif text-stone-500">
            <span>{dayName.toLowerCase()}.</span>
            <span aria-hidden="true">·</span>
            <span>{monthDay.toLowerCase()}.</span>
            <span aria-hidden="true">·</span>
            <span className="italic text-stone-700">
              {isRestDay ? 'full free rest day' : isFullyHome ? 'home cadence' : 'routine day cadence'}
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif font-normal tracking-tight text-stone-900 mt-1">
            today's cadence.
          </h1>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setIsRebalanceConfirmOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-serif text-stone-600 hover:text-stone-900 bg-white/80 border border-stone-200/80 rounded-xl hover:bg-stone-100 transition-colors shadow-2xs cursor-pointer"
            title="Recalculate slots peacefully"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>re-align.</span>
          </button>
        </div>
      </div>

      {/* CONDITIONAL BRANCH: IF EMPTY OR REST DAY -> SINGLE CONSOLIDATED HERO PEBBLE CARD */}
      {isEmptyOrRest ? (
        <div className="bg-[#faf8f5] border border-stone-200/90 rounded-3xl p-8 sm:p-14 text-center max-w-xl mx-auto space-y-6 shadow-xs animate-in fade-in duration-200">
          <div className="w-14 h-14 rounded-2xl bg-[#f4f1ea] text-stone-700 flex items-center justify-center mx-auto shadow-2xs">
            {isRestDay ? (
              <Moon className="w-6 h-6 text-stone-700" />
            ) : (
              <Sun className="w-6 h-6 text-amber-700" />
            )}
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-serif font-normal text-stone-900 tracking-tight">
              {isRestDay ? '🌙 fully rest day.' : '☀️ open daylight cadence.'}
            </h2>
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed font-sans max-w-md mx-auto">
              Zero focus blocks scheduled for today. Recharging protects high cognitive output.
            </p>
          </div>

          {/* Side-by-side primary action pills */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={onPeekTomorrow}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 text-xs font-serif text-white bg-stone-900 hover:bg-stone-800 rounded-full transition-all shadow-xs active:scale-[0.98] cursor-pointer min-h-[44px]"
            >
              <span>🌅 peek at tomorrow's cadence.</span>
            </button>

            <button
              onClick={onOpenSquadRadar}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 text-xs font-serif text-stone-800 bg-white hover:bg-stone-100 border border-stone-200/90 rounded-full transition-all shadow-2xs cursor-pointer min-h-[44px]"
            >
              <Users className="w-3.5 h-3.5 text-stone-500" />
              <span>👥 share availability with squad.</span>
            </button>
          </div>
        </div>
      ) : (
        /* ACTIVE DAY FLOW: Status Bar + Next Up Card + Timeline */
        <>
          {/* Cadence Status Bar */}
          <div className="bg-white/80 border border-stone-200/80 rounded-3xl p-5 sm:p-6 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="text-xs font-serif italic text-stone-500">
                  locked cadence & 7-day spread.
                </div>
                <div className="text-base sm:text-lg font-serif font-medium text-stone-900">
                  {todaySlots.length === 0 ? (
                    `${todayEvents.length} commitment${todayEvents.length > 1 ? 's' : ''} scheduled today · rest with an easy mind`
                  ) : pendingSlots.length === 0 ? (
                    'all scheduled blocks finished · rest with an easy mind'
                  ) : (
                    `${Math.round(totalMinutesToday / 60 * 10) / 10}h planned · ${completedSlots.length} of ${todaySlots.length} blocks completed`
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <div className="text-xs font-serif text-stone-500 space-x-2">
                  <span>{settings.focusBlockMinutes}m focus</span>
                  <span>·</span>
                  <span>{settings.breakIntervalMinutes}m mindful rest</span>
                </div>
                <button
                  type="button"
                  onClick={onOpenSquadRadar}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-serif text-stone-700 bg-white hover:bg-stone-50 border border-stone-200/90 rounded-xl transition-all cursor-pointer shadow-2xs active:scale-95"
                  title="Share availability or pair with phone"
                >
                  <Share2 className="w-3.5 h-3.5 text-stone-600" />
                  <span>share / pair phone</span>
                </button>
              </div>
            </div>

            <div className="space-y-1 pt-1">
              <div className="h-2 w-full bg-stone-200/60 rounded-full overflow-hidden flex">
                <div 
                  className="bg-stone-900 transition-all duration-500 rounded-full"
                  style={{ width: `${totalMinutesToday > 0 ? (completedMinutesToday / totalMinutesToday) * 100 : 0}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-[11px] text-stone-400 font-sans">
                <span>{completedMinutesToday}m completed</span>
                <span>{Math.max(0, totalMinutesToday - completedMinutesToday)}m remaining</span>
              </div>
            </div>
          </div>

          {/* Main Focus Anchor: Next Up Focus Block */}
          {nextSlot ? (() => {
            const nextTask = tasks.find(t => t.id === nextSlot.workTaskId);
            const displayTitle = formatChunkTitle(nextSlot.workTitle, nextSlot.chunkNumber, nextSlot.totalChunks);
            const totalAllocMin = nextTask 
              ? nextTask.estimatedMinutes 
              : (nextSlot.durationMinutes * nextSlot.totalChunks);
            const formatAlloc = (m: number) => {
              const h = Math.floor(m / 60);
              const rem = m % 60;
              if (h > 0 && rem > 0) return `${h}h ${rem}m`;
              if (h > 0) return `${h}h`;
              return `${rem}m`;
            };

            const isNextSlotMatched = nextSlot.id === matchedSlotId || 
              nextSlot.category === 'co-working' || 
              nextSlot.workTitle.includes('Squad');

            return (
              <div className="bg-[#1c1917] text-[#FAF8F5] rounded-3xl p-6 sm:p-8 shadow-sm relative overflow-hidden">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                  <div className="space-y-3 max-w-xl">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-serif text-stone-300">
                      {isNextSlotMatched ? (
                        <span className="text-amber-400 font-semibold tracking-wider uppercase text-[10px] flex items-center gap-1">
                          ⚡ SQUAD CO-FOCUS OVERLAP
                        </span>
                      ) : (
                        <span className="text-emerald-400 font-semibold tracking-wider uppercase text-[10px]">
                          CURRENT FOCUS BLOCK
                        </span>
                      )}
                      <span className="text-stone-500">•</span>
                      <span className="tabular-nums font-mono">{nextSlot.startTime} – {nextSlot.endTime}</span>
                      <span className="text-stone-500">•</span>
                      <span>{nextSlot.durationMinutes} min</span>
                    </div>

                    <h2 className="text-2xl sm:text-3xl font-serif font-normal tracking-tight text-white">
                      {displayTitle}
                    </h2>

                    <div className="flex items-center gap-2 text-xs text-stone-400 font-serif">
                      <span>{nextSlot.category.toLowerCase()}.</span>
                      <span aria-hidden="true">·</span>
                      <span>{nextSlot.durationMinutes}m sprint</span>
                      <span aria-hidden="true">·</span>
                      <span>{formatAlloc(totalAllocMin)} total allocation</span>
                      {isNextSlotMatched && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-amber-400 font-medium">daylight overlap locked</span>
                        </>
                      )}
                    </div>
                  </div>

                <div className="flex flex-wrap items-center gap-3 shrink-0">
                  <button
                    onClick={() => onStartFocus(nextSlot, 'focus')}
                    className="inline-flex items-center gap-2 px-5 py-3 text-xs font-serif text-stone-900 bg-[#FAF8F5] hover:bg-white rounded-xl transition-all shadow-xs active:scale-[0.98] cursor-pointer min-h-[44px]"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>begin focus.</span>
                  </button>

                  <button
                    onClick={() => onStartFocus(nextSlot, 'ramp_up')}
                    className="inline-flex items-center gap-1.5 px-4 py-3 text-xs font-serif text-amber-300 hover:text-amber-200 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 rounded-xl transition-all cursor-pointer min-h-[44px] active:scale-[0.98]"
                    title="Overcome task initiation friction with a gentle 2-minute micro-start"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-400 fill-current" />
                    <span>Stuck? 2-Min Ramp</span>
                  </button>

                  <button
                    onClick={() => handleCompleteWithCelebration(nextSlot.id)}
                    className="inline-flex items-center gap-1.5 px-4 py-3 text-xs font-serif text-white bg-stone-800 hover:bg-stone-700 rounded-xl transition-colors cursor-pointer min-h-[44px]"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>done.</span>
                  </button>

                  <button
                    onClick={() => onRescheduleSlot(nextSlot.id)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-3 text-xs font-serif text-stone-400 hover:text-white bg-stone-900 hover:bg-stone-800 rounded-xl transition-colors cursor-pointer min-h-[44px]"
                    title="Gently move this session to the next open window"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>postpone.</span>
                  </button>
                </div>
                </div>
              </div>
            );
          })() : (
            <div className="bg-white/80 border border-stone-200/80 rounded-3xl p-8 text-center space-y-3">
              <CheckCircle2 className="w-7 h-7 text-emerald-700 mx-auto" />
              <h3 className="text-xl font-serif text-stone-900">
                {todayEvents.length > 0 ? 'commitments ahead · peaceful daylight.' : 'all daily blocks done.'}
              </h3>
              <p className="text-xs text-stone-600">
                {todayEvents.length > 0 
                  ? 'Your day has life commitments below and no study chunks required.' 
                  : "Rest peacefully. Tomorrow's slots are already arranged."}
              </p>
              <div className="pt-2">
                <button
                  onClick={onPeekTomorrow}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-serif text-white bg-stone-900 rounded-xl hover:bg-stone-800 cursor-pointer"
                >
                  <span>🌅 peek at tomorrow's cadence.</span>
                </button>
              </div>
            </div>
          )}

          {/* Accessible Re-Balance Schedule Action */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-stone-100/90 border border-stone-200/90 rounded-2xl shadow-2xs">
            <div className="flex items-center gap-2.5 text-xs font-serif text-stone-600">
              <RotateCcw className="w-4 h-4 text-stone-500 shrink-0" />
              <span>Fell behind or schedule changed? Recalibrate with Earliest Deadline First protection.</span>
            </div>
            <button
              onClick={() => setIsRebalanceConfirmOpen(true)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-serif font-medium text-stone-800 bg-white hover:bg-stone-50 border border-stone-300 rounded-xl transition-all shadow-2xs hover:shadow-xs cursor-pointer min-h-[38px] shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5 text-stone-600" />
              <span>Fell behind? Re-balance schedule</span>
            </button>
          </div>

          {/* Unscheduled / Capacity Exceeded Holding Shelf with explicit warning badge */}
          {unscheduledSlots.length > 0 && (
            <div className="bg-amber-50/90 border border-amber-300/80 rounded-2xl p-4 sm:p-5 space-y-3 shadow-2xs animate-in fade-in duration-200">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-200/80 text-amber-900 border border-amber-300 text-[11px] font-serif font-semibold uppercase tracking-wider">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                    Unscheduled / Capacity Exceeded
                  </span>
                  <span className="text-xs font-serif text-amber-800 font-medium">
                    {unscheduledSlots.length} chunk{unscheduledSlots.length > 1 ? 's' : ''} held
                  </span>
                </div>
              </div>
              <p className="text-xs font-serif text-amber-900/90 leading-relaxed">
                Total estimated work exceeds your daylight rhythm windows before deadlines. These chunks are safely in holding so your immediate upcoming deadlines remain protected:
              </p>
              <div className="space-y-2 pt-1">
                {unscheduledSlots.map((us) => (
                  <div key={us.id} className="flex items-center justify-between p-3 bg-white/95 border border-amber-200 rounded-xl text-xs font-serif shadow-2xs">
                    <div className="space-y-0.5">
                      <div className="font-medium text-stone-900">
                        {formatChunkTitle(us.workTitle, us.chunkNumber, us.totalChunks)}
                      </div>
                      <div className="text-[11px] text-amber-700 font-sans">
                        ⚠️ {us.unscheduledReason || 'Capacity exceeded before deadline window'} · {us.durationMinutes}m duration
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[10px] font-mono font-semibold tracking-wide border border-amber-200">
                      HOLDING
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Today's Full Interleaved Sequence */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-serif font-medium text-stone-900">
                today's interleaved flow.
              </h3>
              <span className="text-xs font-serif italic text-stone-500">
                {timelineItems.length} {timelineItems.length === 1 ? 'item' : 'items'}
                {todaySlots.length > 0 && todayEvents.length > 0 && ` · ${todaySlots.length} sessions, ${todayEvents.length} commitment${todayEvents.length > 1 ? 's' : ''}`}
              </span>
            </div>

            <div className="bg-white/80 border border-stone-200/80 rounded-2xl divide-y divide-stone-100 overflow-hidden shadow-2xs">
              {timelineItems.map((item) => {
                if (item.type === 'event') {
                  const event = item.event;
                  const packedCount = event.whatToBring ? event.whatToBring.filter(i => i.packed).length : 0;
                  const totalItems = event.whatToBring ? event.whatToBring.length : 0;
                  return (
                    <div
                      key={`timeline-event-${event.id}`}
                      className="p-4 sm:p-5 bg-amber-50/20 border-l-4 border-l-stone-900 transition-colors flex flex-col gap-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="space-y-0.5">
                          <div className="flex flex-wrap items-center gap-2 text-xs font-serif text-stone-500">
                            <span className="font-semibold text-stone-900 font-mono tabular-nums">
                              {formatEventTimeSpan(event)}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>{event.durationMinutes}m</span>
                            <span aria-hidden="true">·</span>
                            <span className="italic">{event.category}.</span>
                            {event.location && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="flex items-center gap-1 text-stone-600">
                                  <MapPin className="w-3 h-3 text-stone-400 inline" />
                                  {event.location}
                                </span>
                              </>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-base font-serif font-medium text-stone-900">{event.title}</h4>
                            {event.recurringDays && event.recurringDays.length > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-serif bg-stone-100 text-stone-800 border border-stone-200/90 font-medium">
                                <Repeat className="w-2.5 h-2.5 text-stone-600" />
                                Every {formatRecurringDaysShort(event.recurringDays)}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-serif bg-stone-100 text-stone-600 border border-stone-200">
                                commitment
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-serif bg-amber-100/70 text-amber-900 border border-amber-200/70">
                              <Shield className="w-2.5 h-2.5 text-amber-700" />
                              pause {formatBufferLabel(event.bufferBeforeMinutes ?? 15)} before · resume {formatBufferLabel(event.bufferAfterMinutes ?? 15)} after
                            </span>
                          </div>
                        </div>

                        {totalItems > 0 && (
                          <div className="text-xs font-serif text-stone-600 bg-white/90 border border-stone-200/80 px-2.5 py-1 rounded-xl shrink-0 self-start sm:self-center">
                            what to bring: <span className="font-medium text-stone-900">{packedCount}/{totalItems} packed</span>
                          </div>
                        )}
                      </div>

                      {/* What to bring checklist items directly inside timeline card */}
                      {event.whatToBring && event.whatToBring.length > 0 && (
                        <div className="pt-2 border-t border-stone-200/60 flex flex-wrap gap-2">
                          {event.whatToBring.map(bItem => (
                            <label
                              key={bItem.id}
                              className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-lg text-xs font-serif border transition-colors cursor-pointer ${
                                bItem.packed 
                                  ? 'bg-stone-100 text-stone-400 border-stone-200/60 line-through' 
                                  : 'bg-white text-stone-800 border-stone-200 hover:bg-stone-50'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={bItem.packed}
                                onChange={() => onToggleWhatToBring(event.id, bItem.id)}
                                className="w-3.5 h-3.5 text-stone-900 rounded border-stone-300 focus:ring-stone-900"
                              />
                              <span>{bItem.text}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }

                const slot = item.slot;
                const isMatchedSlot = slot.id === matchedSlotId || 
                  slot.category === 'co-working' || 
                  slot.workTitle.includes('Squad');

                return (
                  <div
                    key={slot.id}
                    className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                      isMatchedSlot
                        ? 'bg-amber-50/90 border-l-4 border-l-amber-500 shadow-2xs'
                        : slot.isCompleted 
                        ? 'bg-stone-100/50 opacity-70' 
                        : 'hover:bg-stone-50/70'
                    }`}
                  >
                    <div className="flex items-start sm:items-center gap-4">
                      <button
                        onClick={() => handleCompleteWithCelebration(slot.id)}
                        className={`w-8 h-8 sm:w-7 sm:h-7 rounded-lg border flex items-center justify-center transition-all active:scale-90 cursor-pointer shrink-0 mt-0.5 sm:mt-0 ${
                          slot.isCompleted
                            ? 'bg-stone-900 border-stone-900 text-white'
                            : isMatchedSlot
                            ? 'border-amber-400 hover:border-amber-600 text-transparent'
                            : 'border-stone-300 hover:border-stone-500 text-transparent'
                        }`}
                        aria-label="Toggle completed"
                      >
                        <Check className="w-4 h-4 stroke-[3]" />
                      </button>

                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 text-xs font-serif text-stone-500">
                          <span className="font-semibold text-stone-800 tabular-nums font-mono">
                            {slot.startTime} – {slot.endTime}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{slot.durationMinutes}m</span>
                          <span aria-hidden="true">·</span>
                          <span className="italic">{slot.category.toLowerCase()}.</span>
                        </div>

                        {(() => {
                          const displaySlotTitle = formatChunkTitle(slot.workTitle, slot.chunkNumber, slot.totalChunks);
                          return (
                            <div className="text-base font-serif font-medium text-stone-900 flex flex-wrap items-center gap-2">
                              <span className={slot.isCompleted ? 'line-through text-stone-400' : ''}>
                                {displaySlotTitle}
                              </span>
                              {isMatchedSlot && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-200/90 text-amber-950 font-serif font-medium border border-amber-300">
                                  ⚡ matched daylight overlap
                                </span>
                              )}
                            </div>
                          );
                        })()}

                      <div className="text-[11px] font-serif text-stone-400">
                        <span>chunk {slot.chunkNumber} of {slot.totalChunks}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {!slot.isCompleted && (
                      <button
                        onClick={() => onStartFocus(slot)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-serif text-stone-900 bg-stone-100 hover:bg-stone-200 active:scale-95 rounded-lg transition-all cursor-pointer min-h-[40px]"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>focus.</span>
                      </button>
                    )}

                    {!slot.isCompleted && (
                      <button
                        onClick={() => onRescheduleSlot(slot.id)}
                        className="px-2.5 py-2 text-xs font-serif text-stone-400 hover:text-stone-700 active:scale-95 rounded-lg hover:bg-stone-100 transition-all cursor-pointer min-h-[40px]"
                        title="Move to next open slot"
                      >
                        postpone
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

            {/* Handover Button: Below the schedule */}
            {isSampleSchedule && (
              <div className="pt-2 text-center">
                <button
                  onClick={onClearSample}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 text-xs font-serif text-stone-900 bg-white hover:bg-stone-50 border border-stone-300 rounded-2xl shadow-xs transition-all active:scale-[0.98] cursor-pointer font-medium"
                >
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>✨ Clear Defaults & Start Fresh (1-Click)</span>
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Events Today & What To Bring Assistant */}
      {todayEvents.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-stone-200/60">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-serif font-medium text-stone-900">
              commitments today & what to bring.
            </h3>
            <span className="text-xs font-serif italic text-stone-500">
              {todayEvents.length} scheduled
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {todayEvents.map(event => (
              <div key={event.id} className="bg-white/80 border border-stone-200/80 rounded-2xl p-5 space-y-4 shadow-2xs">
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-xs font-serif text-stone-500">
                    {event.recurringDays && event.recurringDays.length > 0 && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-serif bg-stone-100 text-stone-800 border border-stone-200/90 font-medium">
                        <Repeat className="w-2.5 h-2.5 text-stone-600" />
                        Every {formatRecurringDaysShort(event.recurringDays)}
                      </span>
                    )}
                    <span className="font-semibold text-stone-900 font-mono tabular-nums">{formatEventTimeSpan(event)}</span>
                    <span aria-hidden="true">·</span>
                    <span>{event.durationMinutes} min</span>
                    {event.location && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>{event.location}</span>
                      </>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <h4 className="text-base font-serif font-medium text-stone-900">{event.title}</h4>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-serif bg-amber-50 text-amber-900 border border-amber-200/80">
                      <Shield className="w-2.5 h-2.5 text-amber-700" />
                      buffer: -{formatBufferLabel(event.bufferBeforeMinutes ?? 15)} / +{formatBufferLabel(event.bufferAfterMinutes ?? 15)}
                    </span>
                  </div>
                </div>

                {event.whatToBring && event.whatToBring.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-stone-200/60">
                    <div className="text-xs font-serif text-stone-700 flex items-center justify-between">
                      <span>what to bring:</span>
                      <span className="text-stone-400 font-sans text-[11px]">
                        {event.whatToBring.filter(i => i.packed).length}/{event.whatToBring.length} packed
                      </span>
                    </div>
                    <div className="space-y-1">
                      {event.whatToBring.map(item => (
                        <label
                          key={item.id}
                          className="flex items-center gap-2.5 text-xs text-stone-700 cursor-pointer p-1 rounded-lg hover:bg-stone-100/70 transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={item.packed}
                            onChange={() => onToggleWhatToBring(event.id, item.id)}
                            className="w-3.5 h-3.5 text-stone-900 rounded border-stone-300 focus:ring-stone-900"
                          />
                          <span className={item.packed ? 'line-through text-stone-400' : 'text-stone-800'}>
                            {item.text}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cognitive Triage & Deferral Re-alignment Modal */}
      <CognitiveTriageModal
        isOpen={isRebalanceConfirmOpen}
        onClose={() => setIsRebalanceConfirmOpen(false)}
        tasks={tasks}
        events={events}
        slots={slots}
        settings={settings}
        onApplyTriage={onApplyTriage || ((_t, _s) => onRebalance())}
      />
    </div>
  );
};
