import React, { useState, useMemo } from 'react';
import { X, Clock, Calendar, Link as LinkIcon, Sparkles, Package, MapPin, Plus, Repeat, Shield, FileText, AlertTriangle, Check } from 'lucide-react';
import { LifeEvent, ScheduleSettings, WorkTask, WhatToBringItem, ScheduledSlot } from '../types';
import { formatDateKey, parseDateKey, addDays, RECURRING_WEEK_DAYS, formatRecurringDaysShort, checkTaskCapacityCeiling } from '../utils/scheduler';
import { calculateEndTime, calculateDurationFromTimes } from '../utils/format';

interface UnifiedAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddWork: (task: Omit<WorkTask, 'id' | 'completedMinutes' | 'createdAt' | 'status'>) => void;
  onAddEvent: (event: Omit<LifeEvent, 'id'>) => void;
  events: LifeEvent[];
  settings: ScheduleSettings;
  tasks?: WorkTask[];
  slots?: ScheduledSlot[];
  initialMode?: 'work' | 'event';
  isSampleSchedule?: boolean;
  onOpenImportOutline?: () => void;
}

const DURATION_PRESETS = [
  { label: '30m', minutes: 30 },
  { label: '45m', minutes: 45 },
  { label: '1h', minutes: 60 },
  { label: '1.5h', minutes: 90 },
  { label: '2h', minutes: 120 },
  { label: '3h', minutes: 180 },
  { label: '4h', minutes: 240 },
  { label: '6h', minutes: 360 },
];

const BUFFER_BEFORE_OPTIONS = [
  { value: 0, label: '0m · Stop work right at start time' },
  { value: 15, label: '15m · Quick pack up & wind-down' },
  { value: 30, label: '30m · Commute & prep (Recommended)' },
  { value: 45, label: '45m · Extended transit & setup' },
  { value: 60, label: '1 hour · Transit & wind-down' },
  { value: 90, label: '1.5 hours · Distance commute' },
  { value: 120, label: '2 hours · Heavy prep / long journey' },
  { value: 150, label: '2.5 hours · Extended commute' },
  { value: 180, label: '3 hours · Full travel corridor' },
  { value: 240, label: '4 hours · Deep wind-down / travel prep' },
];

const BUFFER_AFTER_OPTIONS = [
  { value: 0, label: '0m · Resume work immediately after' },
  { value: 15, label: '15m · Quick breather & desk reset' },
  { value: 30, label: '30m · Return home & coffee (Recommended)' },
  { value: 45, label: '45m · Return to workflow & reset' },
  { value: 60, label: '1 hour · Travel home & meal break' },
  { value: 90, label: '1.5 hours · Decompress & dinner' },
  { value: 120, label: '2 hours · Full decompression & rest' },
  { value: 150, label: '2.5 hours · Evening buffer' },
  { value: 180, label: '3 hours · Extended recovery' },
  { value: 240, label: '4 hours · Complete rest until next day' },
];

const CATEGORIES = ['Writing', 'Study', 'Design', 'Code', 'Deep Work', 'Life', 'Reading'];

const COMMON_ITEMS = [
  'Laptop & Charger',
  'ID Card / Badge',
  'Notebook & Pen',
  'Water Bottle',
  'USB-C Adapter',
  'Headphones',
];

export const UnifiedAddModal: React.FC<UnifiedAddModalProps> = ({
  isOpen,
  onClose,
  onAddWork,
  onAddEvent,
  events,
  settings,
  tasks = [],
  slots = [],
  initialMode = 'work',
  isSampleSchedule = false,
  onOpenImportOutline,
}) => {
  const [mode, setMode] = useState<'work' | 'event'>(initialMode);

  // Work Form State
  const defaultDeadline = formatDateKey(addDays(new Date(), 4));
  const [workTitle, setWorkTitle] = useState('');
  const [workDescription, setWorkDescription] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState(135);
  const [deadlineDate, setDeadlineDate] = useState(defaultDeadline);
  const [linkedEventId, setLinkedEventId] = useState<string>('');
  const [workCategory, setWorkCategory] = useState('Deep Work');

  // Event Form State
  const defaultEventDate = formatDateKey(new Date());
  const [eventTitle, setEventTitle] = useState('');
  const [eventDate, setEventDate] = useState(defaultEventDate);
  const [eventTime, setEventTime] = useState('11:00');
  const [eventEndTime, setEventEndTime] = useState('12:00');
  const [eventDuration, setEventDuration] = useState(60);
  const [bufferBeforeMinutes, setBufferBeforeMinutes] = useState(30);
  const [bufferAfterMinutes, setBufferAfterMinutes] = useState(30);
  const [recurringDays, setRecurringDays] = useState<number[]>([]);
  const [eventLocation, setEventLocation] = useState('');
  const [eventCategory, setEventCategory] = useState<'academic' | 'work' | 'personal' | 'social' | 'health'>('work');
  const [whatToBringList, setWhatToBringList] = useState<string[]>([
    'Notebook & Pen',
    'Water Bottle',
  ]);
  const [newBringItem, setNewBringItem] = useState('');

  const handleStartTimeChange = (newStart: string) => {
    setEventTime(newStart);
    setEventEndTime(calculateEndTime(newStart, eventDuration));
  };

  const handleEndTimeChange = (newEnd: string) => {
    setEventEndTime(newEnd);
    setEventDuration(calculateDurationFromTimes(eventTime, newEnd));
  };

  const handleDurationPresetSelect = (mins: number) => {
    setEventDuration(mins);
    setEventEndTime(calculateEndTime(eventTime, mins));
  };

  const workPausesAt = calculateEndTime(eventTime, -bufferBeforeMinutes);
  const workResumesAt = calculateEndTime(eventEndTime, bufferAfterMinutes);

  const toggleRecurringDay = (dayIndex: number) => {
    setRecurringDays(prev =>
      prev.includes(dayIndex)
        ? prev.filter(d => d !== dayIndex)
        : [...prev, dayIndex].sort((a, b) => a - b)
    );
  };

  const calculatedChunks = Math.ceil(estimatedMinutes / settings.focusBlockMinutes);

  const capacityCheck = useMemo(() => {
    return checkTaskCapacityCeiling(
      estimatedMinutes,
      deadlineDate,
      tasks,
      events,
      settings,
      slots,
      new Date()
    );
  }, [estimatedMinutes, deadlineDate, tasks, events, settings, slots]);

  const handleAddBringItem = (itemText: string) => {
    const trimmed = itemText.trim();
    if (!trimmed || whatToBringList.includes(trimmed)) return;
    setWhatToBringList([...whatToBringList, trimmed]);
    setNewBringItem('');
  };

  const handleRemoveBringItem = (idx: number) => {
    setWhatToBringList(whatToBringList.filter((_, i) => i !== idx));
  };

  const handleWorkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workTitle.trim()) return;

    // Strict Hard Ceiling Enforcement: Cannot overplan beyond available daylight focus slots
    if (capacityCheck.isOverCapacity) {
      return;
    }

    onAddWork({
      title: workTitle.trim(),
      description: workDescription.trim() || undefined,
      estimatedMinutes,
      deadlineDate,
      linkedEventId: linkedEventId || undefined,
      category: workCategory,
      color: 'stone',
      priority: 'medium',
    });

    onClose();
  };

  const handleEventSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle.trim()) return;

    const items: WhatToBringItem[] = whatToBringList.map((text, idx) => ({
      id: `bring-${Date.now()}-${idx}`,
      text,
      packed: false,
    }));

    const isRecurring = recurringDays.length > 0;
    const finalDate = isRecurring
      ? formatDateKey(new Date())
      : (eventDate || formatDateKey(new Date()));

    onAddEvent({
      title: eventTitle.trim(),
      date: finalDate,
      time: eventTime,
      endTime: eventEndTime,
      durationMinutes: eventDuration,
      bufferBeforeMinutes,
      bufferAfterMinutes,
      category: eventCategory,
      location: eventLocation.trim() || undefined,
      color: 'stone',
      whatToBring: items,
      recurringDays: isRecurring ? recurringDays : undefined,
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/40 backdrop-blur-xs overflow-y-auto">
      <div 
        className="bg-[#FAF8F5] rounded-3xl max-w-lg w-full p-4.5 sm:p-7 shadow-xl border border-stone-200/80 my-auto sm:my-8 max-h-[92vh] overflow-y-auto space-y-4 sm:space-y-5 animate-in fade-in zoom-in-95 duration-150 text-stone-900"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-0.5">
            <div className="text-xs font-serif italic text-stone-500">
              gentle input.
            </div>
            <h2 className="text-xl sm:text-2xl font-serif font-normal tracking-tight text-stone-900">
              add to cadence.
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

        {/* Mode Segmented Switcher */}
        <div className="flex items-center gap-1 p-1 bg-stone-200/60 rounded-xl">
          <button
            type="button"
            onClick={() => setMode('work')}
            className={`flex-1 py-2.5 sm:py-2 text-xs font-serif rounded-lg transition-all cursor-pointer min-h-[42px] flex items-center justify-center ${
              mode === 'work'
                ? 'bg-white text-stone-900 font-semibold shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            focus work.
          </button>
          <button
            type="button"
            onClick={() => setMode('event')}
            className={`flex-1 py-2.5 sm:py-2 text-xs font-serif rounded-lg transition-all cursor-pointer min-h-[42px] flex items-center justify-center ${
              mode === 'event'
                ? 'bg-white text-stone-900 font-semibold shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            life event.
          </button>
        </div>

        {/* Note if sample schedule is active */}
        {isSampleSchedule && (
          <div className="bg-[#f4f1ea] border border-stone-200/90 rounded-xl px-3.5 py-2 text-xs font-serif text-stone-700 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>Adding your own {mode === 'work' ? 'work task' : 'event'} will automatically vanish all default sample items.</span>
          </div>
        )}

        {/* WORK FORM */}
        {mode === 'work' ? (
          <form onSubmit={handleWorkSubmit} className="space-y-4">
            {onOpenImportOutline && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenImportOutline();
                }}
                className="w-full p-3 bg-indigo-50/90 hover:bg-indigo-100/90 border border-indigo-200/90 rounded-2xl flex items-center justify-between text-left transition-all cursor-pointer group shadow-2xs"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-serif font-semibold text-indigo-950 flex items-center gap-1.5">
                      <span>Add All Work in One Go (Paste Syllabus / Outline)</span>
                      <span className="text-[10px] font-sans font-bold uppercase px-1.5 py-0.2 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-md">
                        100% Free
                      </span>
                    </div>
                    <p className="text-[11px] font-serif text-indigo-800/80">
                      Paste full course notes or raw bullets — auto-spreads across your week
                    </p>
                  </div>
                </div>
                <span className="text-xs font-serif font-semibold text-indigo-700 group-hover:translate-x-0.5 transition-transform shrink-0 hidden sm:inline">
                  Open →
                </span>
              </button>
            )}

            <div>
              <label className="block text-xs font-serif text-stone-700 mb-1">
                what needs to be crafted?
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Chapter outline, client prototype, thesis research"
                value={workTitle}
                onChange={e => setWorkTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-white/80 border border-stone-200/90 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-stone-900 text-stone-900 placeholder:text-stone-400"
                autoFocus
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-serif text-stone-700">
                  rough time to finish
                </label>
                <span className="text-xs font-medium text-stone-900 tabular-nums">
                  {Math.floor(estimatedMinutes / 60)}h {estimatedMinutes % 60 > 0 ? `${estimatedMinutes % 60}m` : ''} ({estimatedMinutes} min)
                </span>
              </div>

              {/* Quick Presets */}
              <div className="flex flex-wrap gap-1.5 mb-2">
                {DURATION_PRESETS.map(preset => (
                  <button
                    type="button"
                    key={preset.minutes}
                    onClick={() => setEstimatedMinutes(preset.minutes)}
                    className={`px-2.5 py-1 text-xs rounded-lg transition-colors cursor-pointer ${
                      estimatedMinutes === preset.minutes
                        ? 'bg-stone-900 text-white font-medium'
                        : 'bg-stone-200/60 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              <input
                type="range"
                min="15"
                max="480"
                step="15"
                value={estimatedMinutes}
                onChange={e => setEstimatedMinutes(Number(e.target.value))}
                className="w-full accent-stone-900 cursor-pointer"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-serif text-stone-700 mb-1">
                  deadline date
                </label>
                <input
                  type="date"
                  required
                  value={deadlineDate}
                  onChange={e => setDeadlineDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white/80 border border-stone-200/90 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-stone-900 tabular-nums text-stone-800"
                />
              </div>

              <div>
                <label className="block text-xs font-serif text-stone-700 mb-1">
                  category
                </label>
                <select
                  value={workCategory}
                  onChange={e => setWorkCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white/80 border border-stone-200/90 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-stone-900 text-stone-800"
                >
                  {CATEGORIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Optional Event Link */}
            {events.length > 0 && (
              <div>
                <label className="block text-xs font-serif text-stone-700 mb-1">
                  link to upcoming event (optional)
                </label>
                <select
                  value={linkedEventId}
                  onChange={e => {
                    setLinkedEventId(e.target.value);
                    if (e.target.value) {
                      const ev = events.find(item => item.id === e.target.value);
                      if (ev) setDeadlineDate(ev.date);
                    }
                  }}
                  className="w-full px-3 py-2 text-xs bg-white/80 border border-stone-200/90 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-stone-900 text-stone-800"
                >
                  <option value="">No linked event</option>
                  {events.map(ev => (
                    <option key={ev.id} value={ev.id}>
                      {ev.title} ({ev.date})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* HARD CAPACITY CEILING & SLOTS FULL STATUS */}
            {capacityCheck.isOverCapacity ? (
              <div className="bg-rose-50/95 border border-rose-200/90 rounded-2xl p-3.5 space-y-3 text-rose-950 shadow-2xs">
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-xl bg-rose-100 text-rose-800 flex items-center justify-center shrink-0 mt-0.5">
                    <AlertTriangle className="w-4 h-4 text-rose-700" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-serif font-bold text-sm text-rose-950">
                        Slots Are Full — Hard Capacity Ceiling
                      </span>
                      <span className="text-[10px] font-mono uppercase bg-rose-200/80 text-rose-900 px-1.5 py-0.5 rounded font-bold">
                        Hard Ceiling
                      </span>
                    </div>
                    <p className="text-xs text-rose-800 leading-relaxed font-sans">
                      This task requires <strong>{capacityCheck.neededChunks} focus slots</strong> ({estimatedMinutes} min), but only <strong>{capacityCheck.totalAvailableSlotsBeforeDeadline} open slot{capacityCheck.totalAvailableSlotsBeforeDeadline === 1 ? '' : 's'}</strong> remain before your deadline ({deadlineDate}). Overplanning is strictly prevented so you never take on more work than daylight allows.
                    </p>
                  </div>
                </div>

                {/* Day-by-Day Slot Availability Strip */}
                {capacityCheck.daysBreakdown.length > 0 && (
                  <div className="space-y-1 pt-1.5 border-t border-rose-200/70">
                    <div className="text-[11px] font-serif font-medium text-rose-900 flex items-center justify-between">
                      <span>Daily slot breakdown until deadline:</span>
                      <span className="font-mono text-[10px] text-rose-700">
                        {capacityCheck.totalAvailableSlotsBeforeDeadline} open slots total
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {capacityCheck.daysBreakdown.map((day) => {
                        const isToday = day.dateKey === formatDateKey(new Date());
                        const label = isToday ? 'Today' : day.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                        return (
                          <span
                            key={day.dateKey}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-mono border ${
                              day.isRestDay
                                ? 'bg-amber-100/70 text-amber-900 border-amber-200'
                                : day.availableSlots === 0
                                ? 'bg-rose-200/90 text-rose-950 border-rose-300 font-bold'
                                : 'bg-white text-stone-800 border-stone-200'
                            }`}
                          >
                            <span>{label}:</span>
                            <span>
                              {day.isRestDay ? 'Rest' : day.availableSlots === 0 ? 'Full (0 open)' : `${day.availableSlots} open`}
                            </span>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 1-Click Action to Make Deadline Longer */}
                <div className="space-y-1.5 pt-1.5 border-t border-rose-200/70">
                  <div className="text-[11px] font-serif font-medium text-rose-950">
                    Make the deadline longer so this work fits comfortably:
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {capacityCheck.suggestedDeadlineDate && (
                      <button
                        type="button"
                        onClick={() => setDeadlineDate(capacityCheck.suggestedDeadlineDate)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-900 hover:bg-rose-800 text-white text-xs font-serif font-medium transition-all shadow-xs cursor-pointer active:scale-95"
                      >
                        <Calendar className="w-3.5 h-3.5 text-rose-300" />
                        <span>Extend to {capacityCheck.suggestedDeadlineDate} (fits all chunks)</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        const current = parseDateKey(deadlineDate);
                        setDeadlineDate(formatDateKey(addDays(current, 1)));
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-rose-100 text-rose-900 border border-rose-300 text-xs font-serif transition-colors cursor-pointer"
                    >
                      +1 Day
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const current = parseDateKey(deadlineDate);
                        setDeadlineDate(formatDateKey(addDays(current, 2)));
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-rose-100 text-rose-900 border border-rose-300 text-xs font-serif transition-colors cursor-pointer"
                    >
                      +2 Days
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const current = parseDateKey(deadlineDate);
                        setDeadlineDate(formatDateKey(addDays(current, 7)));
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-rose-100 text-rose-900 border border-rose-300 text-xs font-serif transition-colors cursor-pointer"
                    >
                      +1 Week
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-3 text-xs text-emerald-950 space-y-1">
                <div className="font-serif font-medium flex items-center gap-1.5 text-emerald-900">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Sufficient Capacity Guaranteed (Hard Ceiling Respected)</span>
                </div>
                <p className="text-emerald-800 font-sans text-[11px] leading-relaxed">
                  {capacityCheck.neededChunks} focus block{capacityCheck.neededChunks === 1 ? '' : 's'} ({estimatedMinutes}m) will interleave peacefully. {capacityCheck.totalAvailableSlotsBeforeDeadline} open slots available before {deadlineDate}.
                </p>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs text-stone-500 hover:text-stone-900 transition-colors cursor-pointer"
              >
                cancel
              </button>
              <button
                type="submit"
                disabled={capacityCheck.isOverCapacity || !workTitle.trim()}
                className={`px-5 py-2.5 text-xs font-serif rounded-xl transition-all shadow-xs flex items-center gap-1.5 ${
                  capacityCheck.isOverCapacity
                    ? 'bg-rose-100 text-rose-700 border border-rose-300 cursor-not-allowed opacity-90'
                    : 'bg-stone-900 hover:bg-stone-800 text-white cursor-pointer active:scale-95'
                }`}
                title={capacityCheck.isOverCapacity ? 'Daily slots are full before this deadline. Extend deadline to add.' : 'Add task to cadence'}
              >
                {capacityCheck.isOverCapacity ? (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-700" />
                    <span>Slots Full (Extend Deadline)</span>
                  </>
                ) : (
                  <span>add to cadence.</span>
                )}
              </button>
            </div>
          </form>
        ) : (
          /* EVENT FORM */
          <form onSubmit={handleEventSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-serif text-stone-700 mb-1">
                event or milestone title
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Design critique, thesis defense, flight to Kyoto"
                value={eventTitle}
                onChange={e => setEventTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-white/80 border border-stone-200/90 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-stone-900 text-stone-900 placeholder:text-stone-400"
                autoFocus
              />
            </div>

            {/* Date Field */}
            <div>
              <label className="block text-xs font-serif text-stone-700 mb-1">
                date {recurringDays.length > 0 && <span className="text-stone-400 font-sans italic text-[11px]">(repeats weekly)</span>}
              </label>
              <input
                type="date"
                required={recurringDays.length === 0}
                disabled={recurringDays.length > 0}
                value={eventDate}
                onChange={e => setEventDate(e.target.value)}
                className={`w-full px-3 py-2 text-xs bg-white/80 border border-stone-200/90 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-stone-900 tabular-nums text-stone-800 ${
                  recurringDays.length > 0 ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              />
            </div>

            {/* Starting Time & Ending Time with Synced Duration */}
            <div className="space-y-2 p-3.5 rounded-2xl bg-white/70 border border-stone-200/80">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-serif font-medium text-stone-700 mb-1 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-stone-500" />
                    <span>starting time</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={eventTime}
                    onChange={e => handleStartTimeChange(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-stone-200/90 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-stone-900 tabular-nums font-mono text-stone-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-serif font-medium text-stone-700 mb-1 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-stone-500" />
                    <span>ending time</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={eventEndTime}
                    onChange={e => handleEndTimeChange(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-stone-200/90 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-stone-900 tabular-nums font-mono text-stone-900"
                  />
                </div>
              </div>

              {/* Quick duration presets chips */}
              <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1.5 border-t border-stone-100">
                <span className="text-[11px] font-serif text-stone-500">quick duration:</span>
                <div className="flex flex-wrap items-center gap-1">
                  {[
                    { label: '30m', mins: 30 },
                    { label: '45m', mins: 45 },
                    { label: '1h', mins: 60 },
                    { label: '1.5h', mins: 90 },
                    { label: '2h', mins: 120 },
                    { label: '3h', mins: 180 },
                  ].map(preset => (
                    <button
                      key={preset.mins}
                      type="button"
                      onClick={() => handleDurationPresetSelect(preset.mins)}
                      className={`px-2 py-0.5 text-[11px] font-serif rounded-lg border transition-colors cursor-pointer ${
                        eventDuration === preset.mins
                          ? 'bg-stone-900 text-white font-medium border-stone-900 shadow-2xs'
                          : 'bg-white text-stone-600 hover:bg-stone-100 border-stone-200/80'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                  <span className="text-[11px] font-mono text-stone-700 bg-stone-100 px-2 py-0.5 rounded-lg border border-stone-200 font-semibold">
                    {eventDuration}m total
                  </span>
                </div>
              </div>
            </div>

            {/* Work Protection Buffers Before & After Event */}
            <div className="space-y-3 p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/90 shadow-2xs">
              <div className="flex items-center gap-1.5 text-xs font-serif font-semibold text-stone-900">
                <Shield className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                <span>Focus Protection Corridors (Reliable Workflow Planning)</span>
              </div>
              <p className="text-[11px] text-stone-600 font-serif leading-relaxed">
                Reserve dedicated time before the event to stop work and prepare, and specify when you can return to normal work chunks afterward. Cadence ensures no work chunks are scheduled here.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Wind-Down Before Buffer */}
                <div className="space-y-1.5 bg-white/80 p-2.5 rounded-xl border border-amber-200/60">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-serif font-medium text-stone-800">
                      Stop work before event:
                    </label>
                    <span className="text-[11px] font-mono font-bold text-amber-900">
                      {bufferBeforeMinutes === 0 ? '0m' : bufferBeforeMinutes < 60 ? `${bufferBeforeMinutes}m` : `${bufferBeforeMinutes / 60}h`}
                    </span>
                  </div>

                  {/* 1-Tap Quick Preset Chips */}
                  <div className="flex flex-wrap gap-1">
                    {[
                      { label: '0m', val: 0 },
                      { label: '15m', val: 15 },
                      { label: '30m', val: 30 },
                      { label: '45m', val: 45 },
                      { label: '1h', val: 60 },
                      { label: '1.5h', val: 90 },
                      { label: '2h', val: 120 },
                      { label: '3h', val: 180 },
                    ].map(chip => (
                      <button
                        key={chip.val}
                        type="button"
                        onClick={() => setBufferBeforeMinutes(chip.val)}
                        className={`px-2 py-0.5 text-[10px] font-serif rounded-md border transition-all cursor-pointer ${
                          bufferBeforeMinutes === chip.val
                            ? 'bg-stone-900 text-white border-stone-900 font-medium shadow-2xs'
                            : 'bg-white text-stone-600 hover:bg-stone-100 border-stone-200'
                        }`}
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>

                  <select
                    value={bufferBeforeMinutes}
                    onChange={e => setBufferBeforeMinutes(Number(e.target.value))}
                    className="w-full px-2 py-1 text-xs bg-white border border-stone-200/90 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-stone-900 text-stone-800 font-serif"
                  >
                    {BUFFER_BEFORE_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>

                  <div className="text-[10px] text-stone-500 font-serif">
                    Focus stops by <strong className="text-stone-900 font-mono">{workPausesAt}</strong>
                  </div>
                </div>

                {/* Recovery After Buffer */}
                <div className="space-y-1.5 bg-white/80 p-2.5 rounded-xl border border-amber-200/60">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-serif font-medium text-stone-800">
                      Resume workflow after:
                    </label>
                    <span className="text-[11px] font-mono font-bold text-amber-900">
                      {bufferAfterMinutes === 0 ? '0m' : bufferAfterMinutes < 60 ? `${bufferAfterMinutes}m` : `${bufferAfterMinutes / 60}h`}
                    </span>
                  </div>

                  {/* 1-Tap Quick Preset Chips */}
                  <div className="flex flex-wrap gap-1">
                    {[
                      { label: '0m', val: 0 },
                      { label: '15m', val: 15 },
                      { label: '30m', val: 30 },
                      { label: '45m', val: 45 },
                      { label: '1h', val: 60 },
                      { label: '1.5h', val: 90 },
                      { label: '2h', val: 120 },
                      { label: '3h', val: 180 },
                    ].map(chip => (
                      <button
                        key={chip.val}
                        type="button"
                        onClick={() => setBufferAfterMinutes(chip.val)}
                        className={`px-2 py-0.5 text-[10px] font-serif rounded-md border transition-all cursor-pointer ${
                          bufferAfterMinutes === chip.val
                            ? 'bg-stone-900 text-white border-stone-900 font-medium shadow-2xs'
                            : 'bg-white text-stone-600 hover:bg-stone-100 border-stone-200'
                        }`}
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>

                  <select
                    value={bufferAfterMinutes}
                    onChange={e => setBufferAfterMinutes(Number(e.target.value))}
                    className="w-full px-2 py-1 text-xs bg-white border border-stone-200/90 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-stone-900 text-stone-800 font-serif"
                  >
                    {BUFFER_AFTER_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>

                  <div className="text-[10px] text-stone-500 font-serif">
                    Normal chunks resume at <strong className="text-stone-900 font-mono">{workResumesAt}</strong>
                  </div>
                </div>
              </div>

              {/* Protected Corridor Indicator */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px] font-mono text-stone-700 border-t border-amber-200/70">
                <span className="text-amber-900 font-medium font-serif">Blackout corridor:</span>
                <span className="bg-white px-2 py-0.5 rounded-md border border-amber-200 text-stone-900" title="Work pauses">{workPausesAt}</span>
                <span className="text-stone-400">→</span>
                <span className="bg-stone-900 text-white px-2 py-0.5 rounded-md font-semibold" title="Event duration">{eventTime} – {eventEndTime}</span>
                <span className="text-stone-400">→</span>
                <span className="bg-white px-2 py-0.5 rounded-md border border-amber-200 text-stone-900" title="Work resumes">{workResumesAt}</span>
              </div>
            </div>

            {/* Repeats Weekly: 7 circular day-pill toggles [M] [T] [W] [T] [F] [S] [S] */}
            <div className="space-y-2 pt-1 pb-1">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-serif text-stone-700">
                  repeats weekly (optional)
                </label>
                {recurringDays.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setRecurringDays([])}
                    className="text-[11px] font-serif text-stone-500 hover:text-stone-900 transition-colors cursor-pointer"
                  >
                    clear (one-time event)
                  </button>
                ) : (
                  <span className="text-[11px] font-serif text-stone-400 italic">
                    one-time today if unselected
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between sm:justify-start gap-2">
                {RECURRING_WEEK_DAYS.map((d, idx) => {
                  const isActive = recurringDays.includes(d.dayIndex);
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => toggleRecurringDay(d.dayIndex)}
                      title={d.fullName}
                      aria-label={d.fullName}
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-serif font-medium transition-all cursor-pointer ${
                        isActive
                          ? 'bg-[#1F1E1D] text-[#FAF8F5] shadow-xs ring-2 ring-[#1F1E1D] ring-offset-1'
                          : 'bg-white/80 text-stone-600 hover:bg-stone-200/70 border border-stone-200/90'
                      }`}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>

              {recurringDays.length > 0 && (
                <div className="text-[11px] font-serif text-stone-700 flex items-center gap-1.5 pt-0.5">
                  <Repeat className="w-3 h-3 text-stone-500 shrink-0" />
                  <span>repeats every {formatRecurringDaysShort(recurringDays)}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-serif text-stone-700 mb-1">
                  category
                </label>
                <select
                  value={eventCategory}
                  onChange={e => setEventCategory(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs bg-white/80 border border-stone-200/90 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-stone-900 text-stone-800"
                >
                  <option value="work">Work & Presentation</option>
                  <option value="academic">Academic & Study</option>
                  <option value="personal">Personal Life</option>
                  <option value="social">Social & Gathering</option>
                  <option value="health">Rest & Health</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-serif text-stone-700 mb-1">
                  location (optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Studio B / Zoom"
                  value={eventLocation}
                  onChange={e => setEventLocation(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white/80 border border-stone-200/90 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-stone-900 text-stone-800"
                />
              </div>
            </div>

            {/* What to bring packing list */}
            <div className="space-y-2 pt-1 border-t border-stone-200/60">
              <div className="text-xs font-serif text-stone-700 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-stone-500" />
                <span>what to bring. ({whatToBringList.length} items)</span>
              </div>

              {/* Quick suggestions */}
              <div className="flex flex-wrap gap-1">
                {COMMON_ITEMS.filter(i => !whatToBringList.includes(i)).slice(0, 4).map(item => (
                  <button
                    type="button"
                    key={item}
                    onClick={() => handleAddBringItem(item)}
                    className="px-2 py-0.5 text-[11px] bg-white/80 hover:bg-stone-200/60 text-stone-600 rounded-md border border-stone-200/60 transition-colors"
                  >
                    + {item}
                  </button>
                ))}
              </div>

              {/* Current items */}
              <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                {whatToBringList.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-1.5 bg-white/80 rounded-lg text-xs text-stone-800 border border-stone-200/50">
                    <span>{item}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveBringItem(idx)}
                      className="text-stone-400 hover:text-stone-700 p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add item input */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Add item to bring..."
                  value={newBringItem}
                  onChange={e => setNewBringItem(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddBringItem(newBringItem);
                    }
                  }}
                  className="flex-1 px-3 py-1.5 text-xs bg-white/80 border border-stone-200/80 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-stone-900"
                />
                <button
                  type="button"
                  onClick={() => handleAddBringItem(newBringItem)}
                  className="px-3 py-1.5 text-xs font-serif bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-lg transition-colors cursor-pointer"
                >
                  add
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs text-stone-500 hover:text-stone-900 transition-colors"
              >
                cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 text-xs font-serif bg-stone-900 hover:bg-stone-800 text-white rounded-xl transition-all shadow-xs cursor-pointer"
              >
                save event.
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
