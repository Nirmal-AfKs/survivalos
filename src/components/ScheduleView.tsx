import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  Check, 
  Play, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  ShieldCheck, 
  RotateCcw,
  Sparkles,
  MapPin,
  CalendarDays,
  LayoutGrid,
  Briefcase,
  Sun,
  Smile,
  MousePointer,
  Undo
} from 'lucide-react';
import { ScheduledSlot, LifeEvent, WorkTask, ScheduleSettings, DayMode } from '../types';
import { formatDateKey, addDays, parseDateKey } from '../utils/scheduler';

interface ScheduleViewProps {
  todayKey: string;
  slots: ScheduledSlot[];
  tasks: WorkTask[];
  events: LifeEvent[];
  settings: ScheduleSettings;
  isSampleSchedule?: boolean;
  onClearSample?: () => void;
  onToggleSlotComplete: (slotId: string) => void;
  onStartFocus: (slot: ScheduledSlot) => void;
  onToggleWhatToBring: (eventId: string, itemId: string) => void;
  onRebalance: () => void;
  onSetDateSpecificMode: (dateKey: string, mode: DayMode | null) => void;
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const ScheduleView: React.FC<ScheduleViewProps> = ({
  todayKey,
  slots,
  tasks,
  events,
  settings,
  isSampleSchedule,
  onClearSample,
  onToggleSlotComplete,
  onStartFocus,
  onToggleWhatToBring,
  onRebalance,
  onSetDateSpecificMode,
}) => {
  const [selectedDateKey, setSelectedDateKey] = useState<string>(todayKey);
  const [currentMonthDate, setCurrentMonthDate] = useState<Date>(() => {
    const [y, m, d] = todayKey.split('-').map(Number);
    return new Date(y, m - 1, 1);
  });
  const [viewMode, setViewMode] = useState<'month' | 'horizon'>('month');

  // Quick paint action mode: 'inspect' | 'routine_work' | 'fully_home' | 'free_rest'
  const [clickAction, setClickAction] = useState<'inspect' | DayMode>('inspect');

  // Month navigation
  const prevMonth = () => {
    setCurrentMonthDate(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonthDate(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 1));
  };

  const jumpToTodayMonth = () => {
    const today = new Date();
    setCurrentMonthDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDateKey(todayKey);
  };

  // Build calendar matrix for currentMonthDate
  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth();
  const monthName = currentMonthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // First day of month (0 = Sun, 1 = Mon ... adjust to Mon = 0)
  const firstDayObj = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Convert Sunday (0) to 6, and Monday (1) to 0
  const startDayOfWeek = (firstDayObj.getDay() + 6) % 7;

  // Build grid days
  const calendarDays: {
    dateKey: string;
    dayNum: number;
    isCurrentMonth: boolean;
    dateObj: Date;
  }[] = [];

  // Previous month trailing days
  const prevMonthDaysCount = new Date(year, month, 0).getDate();
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const day = prevMonthDaysCount - i;
    const d = new Date(year, month - 1, day);
    calendarDays.push({
      dateKey: formatDateKey(d),
      dayNum: day,
      isCurrentMonth: false,
      dateObj: d,
    });
  }

  // Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day);
    calendarDays.push({
      dateKey: formatDateKey(d),
      dayNum: day,
      isCurrentMonth: true,
      dateObj: d,
    });
  }

  // Next month leading days to complete 35 or 42 grid cells
  const remainingCells = (7 - (calendarDays.length % 7)) % 7;
  for (let day = 1; day <= remainingCells; day++) {
    const d = new Date(year, month + 1, day);
    calendarDays.push({
      dateKey: formatDateKey(d),
      dayNum: day,
      isCurrentMonth: false,
      dateObj: d,
    });
  }

  // Handle cell click depending on clickAction mode
  const handleCellClick = (dateKey: string) => {
    setSelectedDateKey(dateKey);
    if (clickAction !== 'inspect') {
      onSetDateSpecificMode(dateKey, clickAction);
    }
  };

  // Helper to determine effective mode for any date
  const getEffectiveDayMode = (dateObj: Date, dateKey: string): { mode: DayMode; isOverride: boolean } => {
    if (settings.dateSpecificModes && settings.dateSpecificModes[dateKey]) {
      return { mode: settings.dateSpecificModes[dateKey], isOverride: true };
    }
    const dayOfWeek = dateObj.getDay();
    const mode = settings.dayModes?.[dayOfWeek] || (
      settings.fullyHomeDay.applicableDays.includes(dayOfWeek) ? 'fully_home' : 'routine_work'
    );
    return { mode, isOverride: false };
  };

  // Selected Day Details
  const selectedSlots = slots.filter(s => s.date === selectedDateKey);
  const selectedEvents = events.filter(e => e.date === selectedDateKey);
  const selectedDateObj = parseDateKey(selectedDateKey);
  const { mode: selectedDayMode, isOverride: selectedIsOverride } = getEffectiveDayMode(selectedDateObj, selectedDateKey);

  const totalMin = selectedSlots.reduce((a, b) => a + b.durationMinutes, 0);
  const completedMin = selectedSlots.filter(s => s.isCompleted).reduce((a, b) => a + b.durationMinutes, 0);

  // Finishing tasks on selected date
  const finishingTasks = tasks.filter(t => {
    const taskSlots = slots.filter(s => s.workTaskId === t.id);
    if (taskSlots.length === 0) return false;
    const lastSlot = taskSlots[taskSlots.length - 1];
    return lastSlot.date === selectedDateKey;
  });

  // 14 days horizon dates for alternative view
  const horizonDates = Array.from({ length: 14 }).map((_, i) => {
    const d = addDays(new Date(), i);
    return {
      key: formatDateKey(d),
      dateObj: d,
      dayShort: d.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNum: d.getDate(),
    };
  });

  return (
    <div className="space-y-8 pb-12 text-stone-900">
      {/* 1-Tap Sample Rhythm Handover Banner */}
      {isSampleSchedule && (
        <div className="bg-[#f4f1ea] border border-stone-200/90 rounded-2xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-serif text-stone-700 shadow-2xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <span>🌱</span>
            <span>default sanctuary cadence • everyday has sample work • vanishes automatically as you start adding your own</span>
          </div>
          {onClearSample && (
            <button
              onClick={onClearSample}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-serif text-stone-900 bg-white hover:bg-stone-50 border border-stone-300 rounded-xl transition-all self-start sm:self-auto cursor-pointer shadow-2xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>start mine (vanish defaults)</span>
            </button>
          )}
        </div>
      )}

      {/* Title & Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="text-xs font-serif text-stone-500">
            locked cadence & 7-day spread.
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif font-normal tracking-tight text-stone-900 mt-1">
            calendar.
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 mt-1 font-serif italic">
            click any date to designate work days, free home days, or full rest days.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* View toggle */}
          <div className="flex items-center gap-1 p-1 bg-stone-200/60 rounded-xl">
            <button
              onClick={() => setViewMode('month')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-serif rounded-lg transition-colors cursor-pointer ${
                viewMode === 'month' ? 'bg-white text-stone-900 shadow-xs font-semibold' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>month.</span>
            </button>
            <button
              onClick={() => setViewMode('horizon')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-serif rounded-lg transition-colors cursor-pointer ${
                viewMode === 'horizon' ? 'bg-white text-stone-900 shadow-xs font-semibold' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>7-day spread.</span>
            </button>
          </div>

          <button
            onClick={onRebalance}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-serif text-stone-600 hover:text-stone-900 bg-white/80 border border-stone-200/80 rounded-xl hover:bg-stone-100 transition-colors shadow-2xs"
            title="Auto-rebalance all tasks across horizon"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">re-align.</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: FULL MONTH CALENDAR */}
      {viewMode === 'month' && (
        <div className="bg-white/80 border border-stone-200/80 rounded-3xl p-5 sm:p-7 shadow-2xs space-y-5">
          {/* Calendar Header with Month Navigation & Quick-Paint Tools */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <h2 className="text-2xl sm:text-3xl font-serif font-normal tracking-tight text-stone-900">
                {monthName.toLowerCase()}.
              </h2>
              <button
                onClick={jumpToTodayMonth}
                className="px-2.5 py-1 text-xs font-serif text-stone-600 hover:text-stone-900 bg-stone-200/60 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer"
              >
                today.
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={prevMonth}
                className="p-2 rounded-xl text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors cursor-pointer"
                aria-label="Previous month"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={nextMonth}
                className="p-2 rounded-xl text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors cursor-pointer"
                aria-label="Next month"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Quick-Click Tool: Allows clicking dates to instantly assign mode! */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-2.5 bg-stone-50 rounded-2xl border border-stone-200 text-xs">
            <span className="font-semibold text-stone-700 flex items-center gap-1.5">
              <MousePointer className="w-3.5 h-3.5 text-stone-500" />
              <span>Calendar Click Action:</span>
            </span>

            <div className="flex flex-wrap items-center gap-1">
              <button
                onClick={() => setClickAction('inspect')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  clickAction === 'inspect'
                    ? 'bg-stone-900 text-white font-semibold'
                    : 'bg-white text-stone-600 hover:text-stone-900 border border-stone-200'
                }`}
              >
                Inspect Day
              </button>
              <button
                onClick={() => setClickAction('routine_work')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                  clickAction === 'routine_work'
                    ? 'bg-stone-900 text-white font-semibold'
                    : 'bg-white text-stone-600 hover:text-stone-900 border border-stone-200'
                }`}
              >
                <Briefcase className="w-3 h-3" />
                <span>Tap to set Work</span>
              </button>
              <button
                onClick={() => setClickAction('fully_home')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                  clickAction === 'fully_home'
                    ? 'bg-emerald-800 text-white font-semibold'
                    : 'bg-white text-emerald-800 hover:bg-emerald-50 border border-emerald-200'
                }`}
              >
                <Sun className="w-3 h-3" />
                <span>Tap to set Home</span>
              </button>
              <button
                onClick={() => setClickAction('free_rest')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                  clickAction === 'free_rest'
                    ? 'bg-amber-800 text-white font-semibold'
                    : 'bg-white text-amber-800 hover:bg-amber-50 border border-amber-200'
                }`}
              >
                <Smile className="w-3 h-3" />
                <span>Tap to set Full Free</span>
              </button>
            </div>
          </div>

          {/* Weekday Labels */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center text-xs font-bold text-stone-400 uppercase tracking-wider pb-1">
            {WEEKDAYS.map(w => (
              <div key={w} className="py-1">
                {w}
              </div>
            ))}
          </div>

          {/* Calendar Days Matrix */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {calendarDays.map((cell) => {
              const isSelected = cell.dateKey === selectedDateKey;
              const isToday = cell.dateKey === todayKey;
              const daySlots = slots.filter(s => s.date === cell.dateKey);
              const dayEvents = events.filter(e => e.date === cell.dateKey);

              const { mode: cellMode, isOverride } = getEffectiveDayMode(cell.dateObj, cell.dateKey);

              const hasSlots = daySlots.length > 0;
              const allDone = hasSlots && daySlots.every(s => s.isCompleted);
              const hasEvents = dayEvents.length > 0;

              return (
                <button
                  key={cell.dateKey}
                  onClick={() => handleCellClick(cell.dateKey)}
                  className={`min-h-[76px] sm:min-h-[92px] p-2 sm:p-2.5 rounded-2xl flex flex-col justify-between text-left transition-all cursor-pointer relative ${
                    isSelected
                      ? 'bg-stone-900 text-white shadow-md ring-2 ring-stone-900 ring-offset-2'
                      : !cell.isCurrentMonth
                      ? 'bg-stone-50/40 text-stone-400 opacity-60 hover:bg-stone-100/60'
                      : cellMode === 'free_rest'
                      ? 'bg-amber-50/60 border border-amber-200/60 hover:bg-amber-100/70 text-stone-800'
                      : cellMode === 'fully_home'
                      ? 'bg-emerald-50/60 border border-emerald-200/60 hover:bg-emerald-100/70 text-stone-800'
                      : 'bg-stone-50/80 border border-stone-200/80 hover:bg-stone-100 text-stone-800'
                  }`}
                >
                  {/* Top row: day number, custom override star, and mode badge */}
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-1">
                      <span className={`text-sm sm:text-base font-bold tabular-nums ${
                        isToday && !isSelected ? 'text-indigo-600 font-extrabold' : ''
                      }`}>
                        {cell.dayNum}
                      </span>
                      {isOverride && (
                        <span 
                          className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-amber-300' : 'bg-amber-500'}`} 
                          title="Custom day mode selected for this date"
                        />
                      )}
                    </div>

                    {/* Mode tag */}
                    <span className={`text-[10px] font-medium hidden sm:inline-block ${
                      isSelected 
                        ? 'text-stone-300' 
                        : cellMode === 'free_rest'
                        ? 'text-amber-800 font-semibold'
                        : cellMode === 'fully_home'
                        ? 'text-emerald-800 font-semibold'
                        : 'text-stone-500'
                    }`}>
                      {cellMode === 'free_rest' ? 'Full Free' : cellMode === 'fully_home' ? 'Home' : 'Work'}
                    </span>
                  </div>

                  {/* Indicators strip */}
                  <div className="w-full space-y-1 mt-1">
                    {cellMode === 'free_rest' ? (
                      <div className={`text-[10px] truncate font-medium rounded-md px-1.5 py-0.5 text-center ${
                        isSelected ? 'bg-amber-400/20 text-amber-200' : 'text-amber-700 bg-amber-100/70'
                      }`}>
                        Off Day
                      </div>
                    ) : hasSlots ? (
                      <div className={`text-[10px] sm:text-[11px] truncate font-medium rounded-md px-1.5 py-0.5 ${
                        isSelected 
                          ? 'bg-white/20 text-white' 
                          : allDone 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : 'bg-stone-200 text-stone-800'
                      }`}>
                        {daySlots.length} {daySlots.length === 1 ? 'chunk' : 'chunks'}
                      </div>
                    ) : (
                      <div className={`text-[10px] truncate px-1 hidden sm:block ${
                        isSelected ? 'text-stone-400' : 'text-stone-400'
                      }`}>
                        Open slots
                      </div>
                    )}

                    {hasEvents && (
                      <div className={`text-[10px] truncate px-1.5 py-0.5 rounded-md hidden sm:block ${
                        isSelected ? 'bg-amber-400/20 text-amber-200' : 'bg-amber-100 text-amber-800 font-medium'
                      }`}>
                        {dayEvents[0].title}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Calendar Legend */}
          <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-stone-100 text-xs text-stone-500">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-stone-200" />
              <span>Work Routine (Evening)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-200" />
              <span>Full Free / Home Day</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-200" />
              <span>Full Free / Rest Day (Off)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span>Custom Date Override</span>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: 14-DAY HORIZON STRIP */}
      {viewMode === 'horizon' && (
        <div className="bg-white border border-stone-200 rounded-2xl p-3 shadow-2xs">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {horizonDates.map(item => {
              const isSelected = item.key === selectedDateKey;
              const isToday = item.key === todayKey;
              const daySlots = slots.filter(s => s.date === item.key);
              const dayEvents = events.filter(e => e.date === item.key);
              const hasWork = daySlots.length > 0;
              const allDone = hasWork && daySlots.every(s => s.isCompleted);
              const { mode: dayMode, isOverride } = getEffectiveDayMode(item.dateObj, item.key);

              return (
                <button
                  key={item.key}
                  onClick={() => handleCellClick(item.key)}
                  className={`flex flex-col items-center justify-center min-w-[76px] py-3 px-2 rounded-xl transition-all cursor-pointer shrink-0 min-h-[76px] ${
                    isSelected
                      ? 'bg-stone-900 text-white shadow-sm'
                      : dayMode === 'free_rest'
                      ? 'bg-amber-50 text-stone-800 border border-amber-200'
                      : dayMode === 'fully_home'
                      ? 'bg-emerald-50 text-stone-800 border border-emerald-200'
                      : 'bg-stone-50 hover:bg-stone-100 text-stone-700'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <span className={`text-[11px] ${isSelected ? 'text-stone-300 font-medium' : 'text-stone-500'}`}>
                      {isToday ? 'Today' : item.dayShort}
                    </span>
                    {isOverride && (
                      <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-amber-300' : 'bg-amber-500'}`} />
                    )}
                  </div>
                  <span className="text-lg font-bold tabular-nums mt-0.5">
                    {item.dayNum}
                  </span>
                  
                  <div className="flex items-center gap-1 mt-1.5 h-1.5">
                    {dayMode === 'free_rest' ? (
                      <span className="text-[9px] text-amber-700 font-bold">Rest</span>
                    ) : hasWork ? (
                      <span 
                        className={`w-1.5 h-1.5 rounded-full ${
                          allDone 
                            ? 'bg-emerald-400' 
                            : isSelected 
                            ? 'bg-white' 
                            : 'bg-stone-700'
                        }`} 
                      />
                    ) : null}
                    {dayEvents.length > 0 && (
                      <span 
                        className={`w-1.5 h-1.5 rounded-full ${
                          isSelected ? 'bg-amber-300' : 'bg-amber-500'
                        }`} 
                      />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* SELECTED DAY TIMELINE & DIRECT DAY-MODE SELECTOR */}
      <div className="space-y-6">
        {/* Day Header Summary & Immediate Mode Changer */}
        <div className="bg-white border border-stone-200 rounded-3xl p-6 sm:p-7 shadow-2xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-100">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-stone-500">
                <span>{selectedDateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
                {selectedIsOverride && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded-full">
                      Custom Date Setting
                    </span>
                  </>
                )}
              </div>
              <div className="text-xl sm:text-2xl font-bold text-stone-900 mt-0.5">
                {selectedDayMode === 'free_rest'
                  ? '🏖️ Full Free / Rest Day (Zero Work Allocated)'
                  : selectedDayMode === 'fully_home'
                  ? '☀️ Full Free / Home Day (Daytime Hours)'
                  : '💼 Routine Work/School Day (Evening Hours)'}
              </div>
            </div>

            <div className="text-xs text-stone-600 space-y-0.5 sm:text-right">
              <div>
                Active Availability:{' '}
                <span className="font-semibold text-stone-800">
                  {selectedDayMode === 'free_rest' 
                    ? 'None (Pure Rest)'
                    : selectedDayMode === 'fully_home' 
                    ? `${settings.fullyHomeDay.startHour} – ${settings.fullyHomeDay.endHour}`
                    : `${settings.averageDay.startHour} – ${settings.averageDay.endHour}`}
                </span>
              </div>
              <div>
                Focus Workload:{' '}
                <span className="font-semibold text-stone-800">{totalMin} min</span>
                {completedMin > 0 && <span> ({completedMin}m completed)</span>}
              </div>
            </div>
          </div>

          {/* Direct Date Mode Selector: User can change ANY specific calendar date right here! */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-stone-700">
              <span>Change this specific day to:</span>
              {selectedIsOverride && (
                <button
                  onClick={() => onSetDateSpecificMode(selectedDateKey, null)}
                  className="text-stone-400 hover:text-stone-700 flex items-center gap-1 transition-colors cursor-pointer font-normal"
                >
                  <Undo className="w-3.5 h-3.5" />
                  <span>Reset to weekly default</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => onSetDateSpecificMode(selectedDateKey, 'routine_work')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                  selectedDayMode === 'routine_work'
                    ? 'bg-stone-900 border-stone-900 text-white shadow-sm'
                    : 'bg-stone-50 border-stone-200 hover:bg-stone-100 text-stone-800'
                }`}
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  selectedDayMode === 'routine_work' ? 'bg-stone-800 text-white' : 'bg-white text-stone-700 border border-stone-200'
                }`}>
                  <Briefcase className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold">Work / School Day</div>
                  <div className={`text-[11px] ${selectedDayMode === 'routine_work' ? 'text-stone-300' : 'text-stone-500'}`}>
                    Evening slots ({settings.averageDay.startHour}–{settings.averageDay.endHour})
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => onSetDateSpecificMode(selectedDateKey, 'fully_home')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                  selectedDayMode === 'fully_home'
                    ? 'bg-emerald-900 border-emerald-900 text-white shadow-sm'
                    : 'bg-emerald-50/50 border-emerald-200/80 hover:bg-emerald-100/70 text-stone-800'
                }`}
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  selectedDayMode === 'fully_home' ? 'bg-emerald-800 text-white' : 'bg-white text-emerald-800 border border-emerald-200'
                }`}>
                  <Sun className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold">Full Free / Home Day</div>
                  <div className={`text-[11px] ${selectedDayMode === 'fully_home' ? 'text-emerald-200' : 'text-stone-500'}`}>
                    Daytime slots ({settings.fullyHomeDay.startHour}–{settings.fullyHomeDay.endHour})
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => onSetDateSpecificMode(selectedDateKey, 'free_rest')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                  selectedDayMode === 'free_rest'
                    ? 'bg-amber-900 border-amber-900 text-white shadow-sm'
                    : 'bg-amber-50/50 border-amber-200/80 hover:bg-amber-100/70 text-stone-800'
                }`}
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  selectedDayMode === 'free_rest' ? 'bg-amber-800 text-white' : 'bg-white text-amber-800 border border-amber-200'
                }`}>
                  <Smile className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold">Full Free / Rest Day</div>
                  <div className={`text-[11px] ${selectedDayMode === 'free_rest' ? 'text-amber-200' : 'text-stone-500'}`}>
                    No work allocated (pure rest)
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Pre-Deadline Peace Buffer Notice */}
          {finishingTasks.length > 0 && (
            <div className="bg-stone-50 rounded-2xl p-3.5 flex items-start gap-2.5 text-xs text-stone-700">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-stone-900">Pre-Deadline Peace Buffer:</span>{' '}
                {finishingTasks.map(t => t.title).join(', ')} concludes today—strictly before its deadline so you never suffer crunch panics.
              </div>
            </div>
          )}
        </div>

        {/* Life Events on Selected Day */}
        {selectedEvents.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-base font-bold text-stone-900">Life Events on This Day</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {selectedEvents.map(event => (
                <div key={event.id} className="bg-white border border-stone-200 rounded-2xl p-5 space-y-3 shadow-2xs">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-stone-500">
                      <span className="font-semibold text-stone-800">{event.time}</span>
                      <span aria-hidden="true">·</span>
                      <span>{event.durationMinutes} min</span>
                    </div>
                    <h4 className="text-base font-bold text-stone-900 mt-1">{event.title}</h4>
                    {event.location && (
                      <div className="flex items-center gap-1 text-xs text-stone-500 mt-1">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>{event.location}</span>
                      </div>
                    )}
                  </div>

                  {event.whatToBring && event.whatToBring.length > 0 && (
                    <div className="pt-2 border-t border-stone-100">
                      <div className="text-xs font-semibold text-stone-700 mb-1.5">
                        What to bring:
                      </div>
                      <div className="space-y-1">
                        {event.whatToBring.map(item => (
                          <label
                            key={item.id}
                            className="flex items-center gap-2 text-xs text-stone-700 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={item.packed}
                              onChange={() => onToggleWhatToBring(event.id, item.id)}
                              className="w-3.5 h-3.5 text-stone-900 rounded border-stone-300 focus:ring-stone-900"
                            />
                            <span className={item.packed ? 'line-through text-stone-400' : ''}>
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

        {/* Scheduled Work Slots */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-stone-900">
              Interleaved Focus Slots ({selectedSlots.length})
            </h3>
            <span className="text-xs text-stone-500">
              {settings.focusBlockMinutes}m work + {settings.breakIntervalMinutes}m break
            </span>
          </div>

          {selectedDayMode === 'free_rest' ? (
            <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-8 text-center space-y-2">
              <div className="text-2xl">🏖️</div>
              <div className="text-base font-bold text-stone-900">Full Free Rest Day</div>
              <p className="text-xs text-stone-600 max-w-md mx-auto">
                You have marked this date as a pure rest day. All work has been automatically distributed to your other available days so you can relax completely!
              </p>
            </div>
          ) : selectedSlots.length === 0 ? (
            <div className="bg-white border border-stone-200 rounded-2xl p-8 text-center text-sm text-stone-500">
              No tasks scheduled for this day. Enjoy your free time or add new work to let the engine balance it!
            </div>
          ) : (
            <div className="bg-white border border-stone-200 rounded-2xl divide-y divide-stone-100 overflow-hidden shadow-2xs">
              {selectedSlots.map((slot) => (
                <div
                  key={slot.id}
                  className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                    slot.isCompleted ? 'bg-stone-50/60 opacity-70' : 'hover:bg-stone-50/40'
                  }`}
                >
                  <div className="flex items-start sm:items-center gap-4">
                    <button
                      onClick={() => onToggleSlotComplete(slot.id)}
                      className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-all cursor-pointer shrink-0 mt-0.5 sm:mt-0 ${
                        slot.isCompleted
                          ? 'bg-stone-900 border-stone-900 text-white'
                          : 'border-stone-300 hover:border-stone-500 text-transparent'
                      }`}
                      aria-label="Toggle completed"
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                    </button>

                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 text-xs text-stone-500">
                        <span className="font-semibold text-stone-800 tabular-nums">
                          {slot.startTime} – {slot.endTime}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{slot.durationMinutes} min</span>
                        <span aria-hidden="true">·</span>
                        <span>{slot.category}</span>
                      </div>

                      {(() => {
                        const cleanSlotTitle = (slot.workTitle || '')
                          .replace(/\s*—\s*\d+h(\s*\d+m)?|\s*—\s*\d+m/gi, '')
                          .trim();
                        const displaySlotTitle = slot.totalChunks > 1
                          ? `${cleanSlotTitle} (Part ${slot.chunkNumber} of ${slot.totalChunks})`
                          : cleanSlotTitle;
                        return (
                          <div className={`text-base font-semibold text-stone-900 ${slot.isCompleted ? 'line-through text-stone-400' : ''}`}>
                            {displaySlotTitle}
                          </div>
                        );
                      })()}

                      <div className="text-xs text-stone-400">
                        <span>Chunk {slot.chunkNumber} of {slot.totalChunks}</span>
                      </div>
                    </div>
                  </div>

                  {!slot.isCompleted && (
                    <button
                      onClick={() => onStartFocus(slot)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer self-end sm:self-center min-h-[36px]"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Focus Now</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Handover Button: Below the schedule */}
          {isSampleSchedule && onClearSample && (
            <div className="pt-2 text-center">
              <button
                onClick={onClearSample}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 text-xs font-serif text-stone-900 bg-white hover:bg-stone-50 border border-stone-300 rounded-2xl shadow-xs transition-all active:scale-[0.98] cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>✨ Clear Sample Schedule & Start Mine (1-Click)</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
