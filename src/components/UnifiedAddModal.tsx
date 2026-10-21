import React, { useState } from 'react';
import { X, Clock, Calendar, Link as LinkIcon, Sparkles, Package, MapPin, Plus, Repeat, Shield } from 'lucide-react';
import { LifeEvent, ScheduleSettings, WorkTask, WhatToBringItem } from '../types';
import { formatDateKey, addDays, RECURRING_WEEK_DAYS, formatRecurringDaysShort } from '../utils/scheduler';
import { calculateEndTime, calculateDurationFromTimes } from '../utils/format';

interface UnifiedAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddWork: (task: Omit<WorkTask, 'id' | 'completedMinutes' | 'createdAt' | 'status'>) => void;
  onAddEvent: (event: Omit<LifeEvent, 'id'>) => void;
  events: LifeEvent[];
  settings: ScheduleSettings;
  initialMode?: 'work' | 'event';
  isSampleSchedule?: boolean;
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
  { value: 180, label: '3 hours · Full travel corridor' },
];

const BUFFER_AFTER_OPTIONS = [
  { value: 0, label: '0m · Resume work immediately after' },
  { value: 15, label: '15m · Quick breather & desk reset' },
  { value: 30, label: '30m · Return home & coffee (Recommended)' },
  { value: 45, label: '45m · Return to workflow & reset' },
  { value: 60, label: '1 hour · Travel home & meal break' },
  { value: 90, label: '1.5 hours · Decompress & dinner' },
  { value: 120, label: '2 hours · Full decompression & rest' },
  { value: 180, label: '3 hours · Extended recovery' },
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
  initialMode = 'work',
  isSampleSchedule = false,
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

            {/* Sanctuary Promise */}
            <div className="bg-white/80 rounded-2xl p-3 border border-stone-200/70 text-xs text-stone-600 space-y-1">
              <div className="font-serif italic text-stone-900">
                locked cadence guarantee:
              </div>
              <p>
                Spreads across ~{calculatedChunks} blocks of {settings.focusBlockMinutes}m. Concludes smoothly before {deadlineDate} so your deadline eve remains calm.
              </p>
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
                add to cadence.
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
            <div className="space-y-3 p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/90 shadow-2xs">
              <div className="flex items-center gap-1.5 text-xs font-serif font-semibold text-stone-800">
                <Shield className="w-3.5 h-3.5 text-amber-700" />
                <span>Focus Protection Buffers (Stop Before & Resume After)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Wind-Down Before Buffer */}
                <div>
                  <label className="block text-[11px] font-serif text-stone-700 mb-1">
                    Stop work before event (Prep / Commute):
                  </label>
                  <select
                    value={bufferBeforeMinutes}
                    onChange={e => setBufferBeforeMinutes(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-stone-200/90 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-stone-900 text-stone-800 font-serif"
                  >
                    {BUFFER_BEFORE_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <div className="text-[10px] text-stone-500 font-serif pt-1">
                    Focus stops by <strong className="text-stone-800 font-mono">{workPausesAt}</strong>
                  </div>
                </div>

                {/* Recovery After Buffer */}
                <div>
                  <label className="block text-[11px] font-serif text-stone-700 mb-1">
                    Resume workflow after (Recovery / Return):
                  </label>
                  <select
                    value={bufferAfterMinutes}
                    onChange={e => setBufferAfterMinutes(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-stone-200/90 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-stone-900 text-stone-800 font-serif"
                  >
                    {BUFFER_AFTER_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <div className="text-[10px] text-stone-500 font-serif pt-1">
                    Focus resumes at <strong className="text-stone-800 font-mono">{workResumesAt}</strong>
                  </div>
                </div>
              </div>

              {/* Protected Corridor Indicator */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px] font-mono text-stone-700 border-t border-amber-200/70">
                <span className="text-amber-900 font-medium font-serif">Protected window:</span>
                <span className="bg-white px-2 py-0.5 rounded-md border border-amber-200 text-stone-900">{workPausesAt}</span>
                <span className="text-stone-400">→</span>
                <span className="bg-stone-900 text-white px-2 py-0.5 rounded-md font-semibold">{eventTime} – {eventEndTime}</span>
                <span className="text-stone-400">→</span>
                <span className="bg-white px-2 py-0.5 rounded-md border border-amber-200 text-stone-900">{workResumesAt}</span>
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
