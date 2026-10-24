import React, { useState } from 'react';
import { 
  Sliders, 
  Clock, 
  Sun, 
  Moon, 
  Coffee, 
  ShieldCheck, 
  Sparkles, 
  Check, 
  Info,
  Calendar,
  Briefcase,
  Smile,
  Volume2,
  VolumeX,
  Waves,
  CloudRain,
  Wind,
  Bell
} from 'lucide-react';
import { ScheduleSettings, DayMode } from '../types';
import { 
  getMasterVolume, 
  setMasterVolume, 
  getMasterSoundscape, 
  setMasterSoundscape, 
  playGentleBell,
  NatureSoundType 
} from '../utils/audio';

interface SettingsViewProps {
  settings: ScheduleSettings;
  onSaveSettings: (settings: ScheduleSettings) => void;
  onOpenLegal?: () => void;
}

const DAYS_META: { id: number; name: string; short: string }[] = [
  { id: 1, name: 'Monday', short: 'Mon' },
  { id: 2, name: 'Tuesday', short: 'Tue' },
  { id: 3, name: 'Wednesday', short: 'Wed' },
  { id: 4, name: 'Thursday', short: 'Thu' },
  { id: 5, name: 'Friday', short: 'Fri' },
  { id: 6, name: 'Saturday', short: 'Sat' },
  { id: 0, name: 'Sunday', short: 'Sun' },
];

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onSaveSettings,
  onOpenLegal,
}) => {
  const [formData, setFormData] = useState<ScheduleSettings>(settings);
  const [savedFeedback, setSavedFeedback] = useState(false);
  const [masterVolume, setMasterVolState] = useState<number>(() => getMasterVolume());
  const [defaultSoundscape, setDefaultSoundscape] = useState<NatureSoundType>(() => getMasterSoundscape());
  const [testPlaying, setTestPlaying] = useState(false);

  const handleVolumeChange = (newVol: number) => {
    const clamped = Math.max(0, Math.min(1, newVol));
    setMasterVolState(clamped);
    setMasterVolume(clamped);
  };

  const handleSoundscapeChange = (type: NatureSoundType) => {
    setDefaultSoundscape(type);
    setMasterSoundscape(type);
  };

  const handleTestChime = () => {
    setTestPlaying(true);
    playGentleBell('focus_start');
    setTimeout(() => setTestPlaying(false), 1200);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(formData);
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2500);
  };

  const setDayMode = (dayId: number, mode: DayMode) => {
    const updatedModes = { ...formData.dayModes, [dayId]: mode };

    // Update applicableDays for backward compatibility
    const avgDays: number[] = [];
    const homeDays: number[] = [];
    Object.entries(updatedModes).forEach(([k, v]) => {
      const num = Number(k);
      if (v === 'routine_work') avgDays.push(num);
      if (v === 'fully_home') homeDays.push(num);
    });

    setFormData({
      ...formData,
      dayModes: updatedModes,
      averageDay: { ...formData.averageDay, applicableDays: avgDays },
      fullyHomeDay: { ...formData.fullyHomeDay, applicableDays: homeDays },
    });
  };

  return (
    <div className="space-y-8 pb-12 max-w-4xl text-stone-900">
      {/* Title */}
      <div>
        <div className="text-xs font-serif text-stone-500">
          locked cadence. & 7-day spread.
        </div>
        <h1 className="text-3xl sm:text-4xl font-serif font-normal tracking-tight text-stone-900 mt-1">
          life rhythm.
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 mt-1 max-w-2xl font-serif italic">
          set your biological availability. the cadence engine distributes upcoming work across your exact open hours without fatigue.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* SECTION 1: 7-DAY SCHEDULE ASSIGNMENT */}
        <div className="bg-white/80 border border-stone-200/80 rounded-3xl p-6 sm:p-7 shadow-2xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-200/60">
            <div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-stone-700" />
                <h3 className="text-lg font-serif font-medium text-stone-900">
                  1. weekly day baseline & 7-day spread.
                </h3>
              </div>
              <p className="text-xs font-serif italic text-stone-500 mt-0.5">
                mark each day as work/school, free home day, or sanctuary rest day.
              </p>
            </div>

          </div>

          {/* 7 Days Grid Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-2.5">
            {DAYS_META.map(day => {
              const currentMode: DayMode = formData.dayModes?.[day.id] || (
                formData.fullyHomeDay.applicableDays.includes(day.id) ? 'fully_home' : 'routine_work'
              );

              return (
                <div
                  key={day.id}
                  className="bg-stone-50/70 border border-stone-200 rounded-2xl p-3 flex flex-col justify-between space-y-2.5"
                >
                  <div className="text-xs font-bold text-stone-900 flex items-center justify-between">
                    <span>{day.short}</span>
                    <span className="text-[10px] text-stone-400 font-normal">{day.name}</span>
                  </div>

                  <div className="space-y-1">
                    <button
                      type="button"
                      onClick={() => setDayMode(day.id, 'routine_work')}
                      className={`w-full py-1.5 px-2 text-[11px] rounded-lg font-medium transition-all text-left cursor-pointer flex items-center gap-1.5 ${
                        currentMode === 'routine_work'
                          ? 'bg-stone-900 text-white font-semibold shadow-xs'
                          : 'text-stone-600 hover:bg-stone-200/60'
                      }`}
                    >
                      <Briefcase className="w-3 h-3 shrink-0" />
                      <span>Work/School</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDayMode(day.id, 'fully_home')}
                      className={`w-full py-1.5 px-2 text-[11px] rounded-lg font-medium transition-all text-left cursor-pointer flex items-center gap-1.5 ${
                        currentMode === 'fully_home'
                          ? 'bg-emerald-800 text-white font-semibold shadow-xs'
                          : 'text-stone-600 hover:bg-stone-200/60'
                      }`}
                    >
                      <Sun className="w-3 h-3 shrink-0" />
                      <span>Free / Home</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDayMode(day.id, 'free_rest')}
                      className={`w-full py-1.5 px-2 text-[11px] rounded-lg font-medium transition-all text-left cursor-pointer flex items-center gap-1.5 ${
                        currentMode === 'free_rest'
                          ? 'bg-stone-300 text-stone-900 font-semibold shadow-xs'
                          : 'text-stone-400 hover:bg-stone-200/60'
                      }`}
                    >
                      <Smile className="w-3 h-3 shrink-0" />
                      <span>Rest Day</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* SECTION 2: Work Days Available Window */}
        <div className="bg-white/90 border border-stone-200/80 rounded-3xl p-6 sm:p-7 shadow-2xs space-y-5">
          <div className="pb-4 border-b border-stone-100">
            <div className="flex items-center gap-2">
              <Moon className="w-4 h-4 text-stone-700" />
              <h3 className="text-base font-serif font-medium text-stone-900">
                2. routine work / school day window.
              </h3>
            </div>
            <p className="text-xs font-serif italic text-stone-500 mt-0.5">
              simply set when you can start after work/classes and when you wrap up for the night.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-serif font-medium text-stone-700 mb-1.5">
                Start Time (When you can start)
              </label>
              <input
                type="time"
                value={formData.averageDay.startHour}
                onChange={e => setFormData({
                  ...formData,
                  averageDay: { ...formData.averageDay, startHour: e.target.value }
                })}
                className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-stone-900 tabular-nums font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-serif font-medium text-stone-700 mb-1.5">
                Wrap-Up Time (Night rest / curfew)
              </label>
              <input
                type="time"
                value={formData.averageDay.endHour}
                onChange={e => setFormData({
                  ...formData,
                  averageDay: { ...formData.averageDay, endHour: e.target.value }
                })}
                className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-stone-900 tabular-nums font-mono"
                required
              />
            </div>
          </div>

          {/* Dynamic Window Rhythm Insight */}
          {(() => {
            const [sh, sm] = (formData.averageDay.startHour || '18:00').split(':').map(Number);
            const [eh, em] = (formData.averageDay.endHour || '21:30').split(':').map(Number);
            let totalMins = (eh * 60 + em) - (sh * 60 + sm);
            if (totalMins < 0) totalMins += 24 * 60;
            const cycle = formData.focusBlockMinutes + formData.breakIntervalMinutes;
            const blockCount = cycle > 0 ? Math.floor((totalMins + formData.breakIntervalMinutes) / cycle) : 0;
            const totalWorkMins = blockCount * formData.focusBlockMinutes;
            const wH = Math.floor(totalMins / 60);
            const wM = totalMins % 60;
            const fH = Math.floor(totalWorkMins / 60);
            const fM = totalWorkMins % 60;

            return (
              <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-stone-50/80 border border-stone-200/70 text-xs font-serif text-stone-700">
                <Sparkles className="w-4 h-4 text-stone-500 shrink-0" />
                <span>
                  <strong>Window:</strong> {wH > 0 ? `${wH}h ` : ''}{wM > 0 ? `${wM}m` : ''} ({formData.averageDay.startHour} – {formData.averageDay.endHour}) • Automatically accommodates <strong>{blockCount} focus {blockCount === 1 ? 'block' : 'blocks'}</strong> ({formData.focusBlockMinutes}m straight + {formData.breakIntervalMinutes}m rest = {fH > 0 ? `${fH}h ` : ''}{fM > 0 ? `${fM}m` : ''} focus).
                </span>
              </div>
            );
          })()}
        </div>

        {/* SECTION 3: Fully Home Days Window */}
        <div className="bg-white/90 border border-stone-200/80 rounded-3xl p-6 sm:p-7 shadow-2xs space-y-5">
          <div className="pb-4 border-b border-stone-100">
            <div className="flex items-center gap-2">
              <Sun className="w-4 h-4 text-stone-700" />
              <h3 className="text-base font-serif font-medium text-stone-900">
                3. fully free / home day window.
              </h3>
            </div>
            <p className="text-xs font-serif italic text-stone-500 mt-0.5">
              expansive daytime availability with a dedicated lunch/rest pause in between.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-serif font-medium text-stone-700 mb-1.5">
                Morning Start Time
              </label>
              <input
                type="time"
                value={formData.fullyHomeDay.startHour}
                onChange={e => setFormData({
                  ...formData,
                  fullyHomeDay: { ...formData.fullyHomeDay, startHour: e.target.value }
                })}
                className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-stone-900 tabular-nums font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-serif font-medium text-stone-700 mb-1.5">
                Evening Wrap-Up Time
              </label>
              <input
                type="time"
                value={formData.fullyHomeDay.endHour}
                onChange={e => setFormData({
                  ...formData,
                  fullyHomeDay: { ...formData.fullyHomeDay, endHour: e.target.value }
                })}
                className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-stone-900 tabular-nums font-mono"
                required
              />
            </div>
          </div>

          {/* Lunch Break */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div>
              <label className="block text-xs font-serif font-medium text-stone-700 mb-1.5">
                Lunch / Rest Break Start
              </label>
              <input
                type="time"
                value={formData.fullyHomeDay.lunchBreakStart}
                onChange={e => setFormData({
                  ...formData,
                  fullyHomeDay: { ...formData.fullyHomeDay, lunchBreakStart: e.target.value }
                })}
                className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-stone-900 tabular-nums font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-serif font-medium text-stone-700 mb-1.5">
                Lunch Break End
              </label>
              <input
                type="time"
                value={formData.fullyHomeDay.lunchBreakEnd}
                onChange={e => setFormData({
                  ...formData,
                  fullyHomeDay: { ...formData.fullyHomeDay, lunchBreakEnd: e.target.value }
                })}
                className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-stone-900 tabular-nums font-mono"
              />
            </div>
          </div>

          {/* Dynamic Home Window Rhythm Insight */}
          {(() => {
            const [sh, sm] = (formData.fullyHomeDay.startHour || '09:30').split(':').map(Number);
            const [eh, em] = (formData.fullyHomeDay.endHour || '17:30').split(':').map(Number);
            let totalMins = (eh * 60 + em) - (sh * 60 + sm);
            if (totalMins < 0) totalMins += 24 * 60;

            const [lsh, lsm] = (formData.fullyHomeDay.lunchBreakStart || '12:30').split(':').map(Number);
            const [leh, lem] = (formData.fullyHomeDay.lunchBreakEnd || '13:30').split(':').map(Number);
            const lunchMins = Math.max(0, (leh * 60 + lem) - (lsh * 60 + lsm));
            const availableMins = Math.max(0, totalMins - lunchMins);

            const cycle = formData.focusBlockMinutes + formData.breakIntervalMinutes;
            const blockCount = cycle > 0 ? Math.floor((availableMins + formData.breakIntervalMinutes) / cycle) : 0;
            const totalWorkMins = blockCount * formData.focusBlockMinutes;
            const wH = Math.floor(availableMins / 60);
            const wM = availableMins % 60;
            const fH = Math.floor(totalWorkMins / 60);
            const fM = totalWorkMins % 60;

            return (
              <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-stone-50/80 border border-stone-200/70 text-xs font-serif text-stone-700">
                <Sun className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>Daylight Window:</strong> {wH > 0 ? `${wH}h ` : ''}{wM > 0 ? `${wM}m` : ''} available ({formData.fullyHomeDay.startHour} – {formData.fullyHomeDay.endHour}, with {lunchMins > 0 ? `${lunchMins}m lunch` : 'no lunch break'}) • Generates <strong>{blockCount} focus blocks</strong> ({fH > 0 ? `${fH}h ` : ''}{fM > 0 ? `${fM}m` : ''} focus total).
                </span>
              </div>
            );
          })()}
        </div>

        {/* SECTION 4: Straight Work Interval & Break Duration */}
        <div className="bg-white/90 border border-stone-200/80 rounded-3xl p-6 sm:p-7 shadow-2xs space-y-5">
          <div className="pb-4 border-b border-stone-100">
            <div className="flex items-center gap-2">
              <Coffee className="w-4 h-4 text-stone-700" />
              <h3 className="text-base font-serif font-medium text-stone-900">
                4. straight work & mindful break rhythm.
              </h3>
            </div>
            <p className="text-xs font-serif italic text-stone-500 mt-0.5">
              choose how long you work straight and how long you pause. the engine shapes every available window into these cycles.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-serif font-medium text-stone-700 mb-1.5">
                Work Straight For (Focus Block)
              </label>
              <select
                value={formData.focusBlockMinutes}
                onChange={e => setFormData({ ...formData, focusBlockMinutes: Number(e.target.value) })}
                className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-stone-900 font-serif"
              >
                <option value={25}>25 minutes (Classic Pomodoro)</option>
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes (Recommended Deep Flow)</option>
                <option value={50}>50 minutes (Ultradian Rhythm)</option>
                <option value={60}>60 minutes (1 Hour)</option>
                <option value={90}>90 minutes (Deep Immersion)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-serif font-medium text-stone-700 mb-1.5">
                Mindful Break Length
              </label>
              <select
                value={formData.breakIntervalMinutes}
                onChange={e => setFormData({ ...formData, breakIntervalMinutes: Number(e.target.value) })}
                className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-stone-900 font-serif"
              >
                <option value={5}>5 minutes</option>
                <option value={10}>10 minutes</option>
                <option value={15}>15 minutes (Optimal Rest & Reset)</option>
                <option value={20}>20 minutes</option>
                <option value={30}>30 minutes</option>
              </select>
            </div>
          </div>

          {/* Toggle: Pre-Deadline Completion */}
          <div className="flex items-start justify-between gap-4 p-4 rounded-2xl bg-stone-50 border border-stone-200">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-stone-900">
                  Pre-Deadline Peace Buffer (Finish by day before)
                </span>
              </div>
              <p className="text-xs text-stone-600">
                If deadline is the 28th, all work must finish by the 27th end so you sleep with peace of mind.
              </p>
            </div>

            <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
              <input
                type="checkbox"
                checked={formData.finishDayBeforeDeadline}
                onChange={e => setFormData({ ...formData, finishDayBeforeDeadline: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-stone-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-stone-900"></div>
            </label>
          </div>

          {/* Toggle: Cognitive Interleaving */}
          <div className="flex items-start justify-between gap-4 p-4 rounded-2xl bg-stone-50 border border-stone-200">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-bold text-stone-900">
                  Cognitive Task Interleaving
                </span>
              </div>
              <p className="text-xs text-stone-600">
                Mix up different active tasks across slots to prevent mental burnout and monotony.
              </p>
            </div>

            <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
              <input
                type="checkbox"
                checked={formData.interleaveTasks}
                onChange={e => setFormData({ ...formData, interleaveTasks: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-stone-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-stone-900"></div>
            </label>
          </div>
        </div>

        {/* SECTION 5: MASTER VOLUME & PROCEDURAL SOUNDSCAPES */}
        <div className="bg-white/90 border border-stone-200/80 rounded-3xl p-6 sm:p-7 shadow-2xs space-y-5">
          <div className="pb-4 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-stone-700" />
                <h3 className="text-base font-serif font-medium text-stone-900">
                  5. master audio volume & procedural focus soundscapes.
                </h3>
              </div>
              <p className="text-xs font-serif italic text-stone-500 mt-0.5">
                central master GainNode control for focus chimes and procedural nature soundscapes. 100% offline synthesis.
              </p>
            </div>

            <button
              type="button"
              onClick={handleTestChime}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-serif font-medium rounded-xl border transition-all cursor-pointer shadow-2xs self-start sm:self-auto min-h-[38px] ${
                testPlaying 
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-xs' 
                  : 'bg-stone-50 text-stone-700 hover:bg-stone-100 border-stone-200'
              }`}
            >
              <Bell className="w-3.5 h-3.5 text-stone-600" />
              <span>{testPlaying ? 'Chiming...' : 'Test Chime Loudness'}</span>
            </button>
          </div>

          {/* Master Volume Slider (0% to 100%, default 75%) */}
          <div className="space-y-2 p-4 rounded-2xl bg-stone-50/80 border border-stone-200/80">
            <div className="flex items-center justify-between">
              <label className="text-xs font-serif font-medium text-stone-700 flex items-center gap-2">
                {masterVolume === 0 ? (
                  <VolumeX className="w-4 h-4 text-stone-400" />
                ) : (
                  <Volume2 className="w-4 h-4 text-stone-700" />
                )}
                <span>Master Volume Control</span>
              </label>
              <span className="font-mono text-xs font-semibold text-stone-900 bg-white px-2.5 py-1 rounded-lg border border-stone-200 tabular-nums">
                {Math.round(masterVolume * 100)}%
              </span>
            </div>
            
            <div className="flex items-center gap-3 pt-1">
              <span className="text-[11px] font-serif text-stone-400">0%</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={masterVolume}
                onChange={e => handleVolumeChange(parseFloat(e.target.value))}
                className="w-full h-2 bg-stone-200 accent-stone-900 rounded-lg cursor-pointer"
                aria-label="Master volume slider"
              />
              <span className="text-[11px] font-serif text-stone-400">100%</span>
            </div>
            <p className="text-[11px] font-serif text-stone-500 pt-1">
              Scales all Solfeggio focus bells, transition chimes, and ambient noise generators through central master GainNode.
            </p>
          </div>

          {/* Default Focus Soundscape Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-serif font-medium text-stone-700">
              Default Focus Soundscape (0 KB Procedural Synthesis)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => handleSoundscapeChange('none')}
                className={`py-2 px-3 text-xs font-serif rounded-xl border transition-all text-left cursor-pointer flex items-center gap-2 ${
                  defaultSoundscape === 'none'
                    ? 'bg-stone-900 text-white font-medium shadow-xs border-stone-900'
                    : 'bg-stone-50 text-stone-600 hover:bg-stone-100 border-stone-200'
                }`}
              >
                <span>Mute</span>
              </button>
              <button
                type="button"
                onClick={() => handleSoundscapeChange('waves')}
                className={`py-2 px-3 text-xs font-serif rounded-xl border transition-all text-left cursor-pointer flex items-center gap-2 ${
                  defaultSoundscape === 'waves'
                    ? 'bg-emerald-900 text-white font-medium shadow-xs border-emerald-900'
                    : 'bg-stone-50 text-stone-600 hover:bg-stone-100 border-stone-200'
                }`}
              >
                <Waves className="w-3.5 h-3.5 text-emerald-400" />
                <span>Ocean Waves</span>
              </button>
              <button
                type="button"
                onClick={() => handleSoundscapeChange('rain')}
                className={`py-2 px-3 text-xs font-serif rounded-xl border transition-all text-left cursor-pointer flex items-center gap-2 ${
                  defaultSoundscape === 'rain'
                    ? 'bg-emerald-900 text-white font-medium shadow-xs border-emerald-900'
                    : 'bg-stone-50 text-stone-600 hover:bg-stone-100 border-stone-200'
                }`}
              >
                <CloudRain className="w-3.5 h-3.5 text-emerald-400" />
                <span>Rainfall</span>
              </button>
              <button
                type="button"
                onClick={() => handleSoundscapeChange('brook')}
                className={`py-2 px-3 text-xs font-serif rounded-xl border transition-all text-left cursor-pointer flex items-center gap-2 ${
                  defaultSoundscape === 'brook'
                    ? 'bg-emerald-900 text-white font-medium shadow-xs border-emerald-900'
                    : 'bg-stone-50 text-stone-600 hover:bg-stone-100 border-stone-200'
                }`}
              >
                <Wind className="w-3.5 h-3.5 text-emerald-400" />
                <span>Brook Water</span>
              </button>
            </div>
          </div>
        </div>

        {/* SECTION 6: STATUTORY & LEGAL SANCTUARY */}
        <div className="bg-white/80 border border-stone-200/80 rounded-3xl p-6 sm:p-7 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-stone-700" />
                <h3 className="text-base font-serif font-medium text-stone-900">
                  6. open source & zero-leak sanctuary terms
                </h3>
              </div>
              <p className="text-xs font-serif italic text-stone-500">
                100% offline client storage. no tracking, no servers, zero data collection.
              </p>
            </div>
            {onOpenLegal && (
              <button
                type="button"
                onClick={onOpenLegal}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-serif font-medium text-stone-800 bg-stone-100 hover:bg-stone-200/80 border border-stone-200/90 rounded-xl transition-all cursor-pointer shadow-2xs min-h-[38px] self-start sm:self-auto"
              >
                <span>⚖️ Legal & MIT License</span>
              </button>
            )}
          </div>
        </div>

        {/* Action Save Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
          {savedFeedback ? (
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3.5 py-2.5 rounded-xl border border-emerald-200">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Schedule updated according to your daylight rhythm!</span>
            </div>
          ) : (
            <span className="text-xs text-stone-400 font-serif">
              Saving updates your available daily focus slots.
            </span>
          )}

          <button
            type="submit"
            className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 text-xs font-serif font-medium text-white bg-stone-900 hover:bg-stone-800 rounded-xl transition-all shadow-sm active:scale-[0.98] cursor-pointer min-h-[44px]"
          >
            Save & Recalculate Horizon
          </button>
        </div>
      </form>
    </div>
  );
};
