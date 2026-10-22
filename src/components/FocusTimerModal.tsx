import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Check, 
  X, 
  Coffee, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  CloudRain, 
  Wind, 
  Waves, 
  Plus, 
  Minus,
  Quote,
  Zap,
  Eye
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ScheduledSlot } from '../types';
import { 
  playGentleBell, 
  startAmbientSound, 
  stopAmbientSound, 
  startTrack,
  stopTrack,
  setTrackVolume,
  getTrackVolumes,
  getMasterVolume, 
  setMasterVolume, 
  getMasterSoundscape, 
  setMasterSoundscape,
  NatureSoundType,
  ActiveNatureTrack,
  MultiTrackVolumes
} from '../utils/audio';
import { formatChunkTitle, cleanTaskTitle } from '../utils/format';

interface FocusTimerModalProps {
  slot: ScheduledSlot | null;
  onClose: () => void;
  onCompleteSlot: (slotId: string) => void;
  breakDurationMinutes: number;
  initialMode?: 'focus' | 'ramp_up' | 'break';
}

const MANTRAS = [
  'Do one thing at a time, with total devotion and quiet presence.',
  'Clarity over rush. The sanctuary clock protects your boundary.',
  'Flow arrives not from rushing, but from letting urgency dissolve.',
  'Your mind is a quiet pond. Let the ripple of each thought settle.',
  'Deep rest follows deep focus. Honor both in their sacred turn.',
  'You have all the space you need right now.',
];

export const FocusTimerModal: React.FC<FocusTimerModalProps> = ({
  slot,
  onClose,
  onCompleteSlot,
  breakDurationMinutes,
  initialMode = 'focus',
}) => {
  const isRampUpInitial = initialMode === 'ramp_up';
  const initialDurationSeconds = isRampUpInitial 
    ? 120 
    : (slot?.durationMinutes ?? 30) * 60;

  const [mode, setMode] = useState<'focus' | 'break' | 'ramp_up'>(initialMode);
  const [totalSeconds, setTotalSeconds] = useState(initialDurationSeconds);
  const [secondsRemaining, setSecondsRemaining] = useState(initialDurationSeconds);
  const [isActive, setIsActive] = useState(true);
  
  // Multi-track active sounds and individual fader volumes
  const [activeTracks, setActiveTracks] = useState<ActiveNatureTrack[]>(() => {
    const primary = getMasterSoundscape();
    return primary !== 'none' ? [primary] : [];
  });
  const [trackVolumes, setTrackVolumes] = useState<MultiTrackVolumes>(() => getTrackVolumes());
  const [masterVolume, setMasterVolState] = useState<number>(() => getMasterVolume());
  const [mantraIndex, setMantraIndex] = useState(0);
  const [hasWakeLock, setHasWakeLock] = useState(false);

  const baseTitle = cleanTaskTitle(slot?.workTitle);
  const displayTitle = (slot?.totalChunks && slot.totalChunks > 1 && slot.chunkNumber)
    ? `${baseTitle} • Part ${slot.chunkNumber} of ${slot.totalChunks}`
    : (baseTitle || 'Focus Session');

  const stopAmbientRef = useRef<((fadeTime?: number) => void) | null>(null);
  const wakeLockRef = useRef<any>(null);

  // 1. Request Screen WakeLock API so display stays awake
  useEffect(() => {
    let released = false;

    async function requestWakeLock() {
      if (typeof navigator !== 'undefined' && 'wakeLock' in navigator && (navigator as any).wakeLock) {
        try {
          const lock = await (navigator as any).wakeLock.request('screen');
          if (!released) {
            wakeLockRef.current = lock;
            setHasWakeLock(true);
            lock.addEventListener('release', () => {
              setHasWakeLock(false);
            });
          } else {
            lock.release();
          }
        } catch (err) {
          console.debug('Screen WakeLock request skipped or not granted:', err);
        }
      }
    }

    requestWakeLock();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !wakeLockRef.current && !released) {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      released = true;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLockRef.current) {
        try {
          wakeLockRef.current.release();
        } catch {}
        wakeLockRef.current = null;
      }
    };
  }, []);

  // Initialize timer on slot or initialMode change
  useEffect(() => {
    if (!slot) return;

    try {
      playGentleBell(isRampUpInitial ? 'focus_start' : 'focus_start');
    } catch {}

    const secs = isRampUpInitial ? 120 : (slot.durationMinutes || 30) * 60;
    setTotalSeconds(secs);
    setSecondsRemaining(secs);
    setMode(initialMode);
    setIsActive(true);
    setMantraIndex(Math.floor(Math.random() * MANTRAS.length));

    return () => {
      stopAmbientSound();
      if (stopAmbientRef.current) {
        stopAmbientRef.current();
        stopAmbientRef.current = null;
      }
    };
  }, [slot?.id, initialMode]);

  // Ambient sound handler: runs active tracks while focus/ramp_up timer is active
  useEffect(() => {
    if (isActive && mode !== 'break' && activeTracks.length > 0) {
      activeTracks.forEach(track => {
        startTrack(track, trackVolumes[track]);
      });
    } else {
      stopAmbientSound(0.5);
    }

    return () => {
      stopAmbientSound(0.4);
    };
  }, [activeTracks, isActive, mode]);

  // Timer Tick
  useEffect(() => {
    let interval: number | null = null;
    if (isActive && secondsRemaining > 0) {
      interval = window.setInterval(() => {
        setSecondsRemaining(prev => Math.max(0, prev - 1));
      }, 1000);
    } else if (isActive && secondsRemaining === 0) {
      if (mode === 'ramp_up') {
        // When 2-minute ramp finishes: gentle chime and automatically launch full sprint
        playGentleBell('focus_start');
        setMode('focus');
        const sprintSecs = (slot?.durationMinutes || 30) * 60;
        setTotalSeconds(sprintSecs);
        setSecondsRemaining(sprintSecs);
      } else if (mode === 'focus') {
        // When focus sprint finishes: smoothly fade out ambient sound, chime & transition into mindful rest break
        stopAmbientSound(0.8);
        playGentleBell('break_start');
        setMode('break');
        const breakSecs = breakDurationMinutes * 60;
        setTotalSeconds(breakSecs);
        setSecondsRemaining(breakSecs);
      } else {
        // Break finished: chime, release wakeLock, and return to dashboard
        stopAmbientSound(0.4);
        playGentleBell('complete');
        setIsActive(false);
        if (wakeLockRef.current) {
          try {
            wakeLockRef.current.release();
          } catch {}
          wakeLockRef.current = null;
        }
        setTimeout(() => {
          onClose();
        }, 1500);
      }
    }
    return () => {
      if (interval !== null) clearInterval(interval);
    };
  }, [isActive, secondsRemaining, mode, breakDurationMinutes, slot?.durationMinutes, onClose]);

  const toggleActive = () => {
    setIsActive(!isActive);
  };

  const handleReset = () => {
    setIsActive(false);
    const resetTarget = mode === 'ramp_up' 
      ? 120 
      : mode === 'focus' 
      ? (slot?.durationMinutes || 30) * 60 
      : breakDurationMinutes * 60;
    setTotalSeconds(resetTarget);
    setSecondsRemaining(resetTarget);
  };

  const handleJumpToFullSprint = () => {
    playGentleBell('focus_start');
    setMode('focus');
    const sprintSecs = (slot?.durationMinutes || 30) * 60;
    setTotalSeconds(sprintSecs);
    setSecondsRemaining(sprintSecs);
    setIsActive(true);
  };

  const handleVolumeChange = (newVol: number) => {
    const clamped = Math.max(0, Math.min(1, newVol));
    setMasterVolState(clamped);
    setMasterVolume(clamped);
  };

  const handleToggleTrack = (track: ActiveNatureTrack) => {
    if (activeTracks.includes(track)) {
      setActiveTracks([]);
      stopAmbientSound(0.4);
      setMasterSoundscape('none');
    } else {
      stopAmbientSound(0.4);
      setActiveTracks([track]);
      setMasterSoundscape(track);
      if (isActive && mode !== 'break') {
        startTrack(track, masterVolume);
      }
    }
  };

  const handleMuteAll = () => {
    setActiveTracks([]);
    stopAmbientSound(0.4);
    setMasterSoundscape('none');
  };

  const handleTrackVolumeChange = (track: ActiveNatureTrack, vol: number) => {
    const clamped = Math.max(0, Math.min(1, vol));
    setTrackVolumes(prev => ({ ...prev, [track]: clamped }));
    setTrackVolume(track, clamped);
  };

  const handleCompleteChunk = () => {
    stopAmbientSound();
    try {
      confetti({
        particleCount: 65,
        spread: 75,
        origin: { y: 0.6 },
        colors: ['#FAF8F5', '#10b981', '#f59e0b', '#6366f1'],
      });
    } catch {}
    playGentleBell('complete');
    if (wakeLockRef.current) {
      try {
        wakeLockRef.current.release();
      } catch {}
      wakeLockRef.current = null;
    }
    if (slot) onCompleteSlot(slot.id);
    onClose();
  };

  const handleExitZenMode = () => {
    stopAmbientSound();
    if (wakeLockRef.current) {
      try {
        wakeLockRef.current.release();
      } catch {}
      wakeLockRef.current = null;
    }
    onClose();
  };

  const progressRatio = totalSeconds > 0 ? (totalSeconds - secondsRemaining) / totalSeconds : 0;
  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  // Dial geometry
  const radius = 110;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - progressRatio * circumference;

  const currentAngle = progressRatio * 360 - 90;
  const beadX = 140 + radius * Math.cos((currentAngle * Math.PI) / 180);
  const beadY = 140 + radius * Math.sin((currentAngle * Math.PI) / 180);

  if (!slot) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#121110] text-[#FAF8F5] flex flex-col justify-between p-4 sm:p-10 pb-8 sm:pb-10 select-none overflow-y-auto animate-in fade-in duration-300">
      {/* Background ambient gentle illumination */}
      <div 
        aria-hidden="true"
        className={`absolute inset-0 pointer-events-none transition-all duration-1000 ${
          mode === 'ramp_up'
            ? 'bg-[radial-gradient(ellipse_at_50%_35%,rgba(245,158,11,0.12),transparent_70%)]'
            : mode === 'focus' 
            ? 'bg-[radial-gradient(ellipse_at_50%_35%,rgba(16,185,129,0.12),transparent_70%)]' 
            : 'bg-[radial-gradient(ellipse_at_50%_35%,rgba(59,130,246,0.12),transparent_70%)]'
        } ${isActive ? 'animate-pulse' : 'opacity-40'}`} 
      />

      {/* TOP ZONE: Zen Desk-Clock Status Bar & Task Details */}
      <div className="relative z-10 w-full max-w-4xl mx-auto flex items-start justify-between gap-4 pb-4">
        <div className="space-y-1.5 text-left">
          <div className="flex flex-wrap items-center gap-2 text-xs font-serif">
            {mode === 'ramp_up' ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium">
                <Zap className="w-3 h-3 text-amber-400 fill-current" />
                <span>2-minute task-initiation micro-sprint</span>
              </span>
            ) : mode === 'focus' ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>zen desk-clock focus mode</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 font-medium">
                <Coffee className="w-3 h-3 text-blue-400" />
                <span>mindful rest & restore</span>
              </span>
            )}

            {hasWakeLock && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-stone-900 border border-stone-800 text-[11px] text-stone-400">
                <Eye className="w-3 h-3 text-stone-400" />
                <span className="hidden sm:inline">screen kept awake</span>
              </span>
            )}
          </div>

          <h1 className="text-xl sm:text-3xl font-serif font-normal tracking-tight text-white max-w-2xl">
            {displayTitle}
          </h1>

          <div className="flex items-center gap-2 text-xs text-stone-400 font-serif">
            <span>{slot.category.toLowerCase()}.</span>
            <span aria-hidden="true">·</span>
            <span>chunk {slot.chunkNumber} of {slot.totalChunks}</span>
            <span aria-hidden="true">·</span>
            <span>{slot.durationMinutes}m sprint duration</span>
          </div>
        </div>

        {/* Minimal Zen Exit */}
        <button
          onClick={handleExitZenMode}
          className="p-2.5 text-stone-400 hover:text-white rounded-2xl bg-stone-900/60 hover:bg-stone-800/80 border border-stone-800 transition-colors cursor-pointer shrink-0"
          title="Exit Zen Mode"
          aria-label="Exit Zen Mode"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* CENTER ZONE: Prominent Countdown Timer & Smooth Visualization */}
      <div className="relative z-10 my-auto flex flex-col items-center justify-center text-center py-4 sm:py-6">
        {/* 2-Minute Ramp-Up Behavioral Prompt Banner */}
        {mode === 'ramp_up' && (
          <div className="max-w-md mx-auto mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs sm:text-sm font-serif text-amber-200/90 leading-relaxed animate-in fade-in zoom-in-95 duration-200">
            <p className="font-medium text-amber-300 mb-1">🌱 Micro-Initiation Rule:</p>
            <p>&quot;Just open your notes and read/write 1 sentence. You can stop when the timer reaches zero.&quot;</p>
          </div>
        )}

        {/* Circular Smooth Progress Visualization */}
        <div className="relative w-72 h-72 sm:w-84 sm:h-84 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90">
            {/* Background circular track */}
            <circle
              cx="140"
              cy="140"
              r={radius}
              stroke="currentColor"
              strokeWidth="4"
              className="text-stone-800/80"
              fill="transparent"
            />

            {/* Subtle dashed aesthetic guide */}
            <circle
              cx="140"
              cy="140"
              r={radius + 12}
              stroke="currentColor"
              strokeWidth="1"
              strokeDasharray="3 6"
              className="text-stone-800/40"
              fill="transparent"
            />

            {/* Active glowing progress track */}
            <circle
              cx="140"
              cy="140"
              r={radius}
              stroke="currentColor"
              strokeWidth="7"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className={`transition-all duration-1000 ${
                mode === 'ramp_up'
                  ? 'text-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.6)]'
                  : mode === 'focus' 
                  ? 'text-emerald-400 drop-shadow-[0_0_12px_rgba(52,211,153,0.6)]' 
                  : 'text-blue-400 drop-shadow-[0_0_12px_rgba(96,165,250,0.6)]'
              }`}
              fill="transparent"
            />

            {/* Glowing orbital lead bead */}
            {progressRatio > 0 && progressRatio < 1 && (
              <circle
                cx={beadX}
                cy={beadY}
                r="6"
                className={
                  mode === 'ramp_up'
                    ? 'fill-amber-300 drop-shadow-[0_0_8px_#fbbf24]'
                    : mode === 'focus'
                    ? 'fill-emerald-300 drop-shadow-[0_0_8px_#34d399]'
                    : 'fill-blue-300 drop-shadow-[0_0_8px_#60a5fa]'
                }
              />
            )}
          </svg>

          {/* Prominent Desk-Clock Digital Timer */}
          <div className="absolute flex flex-col items-center">
            <span className="text-6xl sm:text-7xl font-serif font-light tracking-tight tabular-nums text-white">
              {formattedTime}
            </span>
            <div className="flex items-center gap-1.5 mt-2.5 text-xs font-serif tracking-widest uppercase text-stone-400">
              {isActive ? (
                <>
                  <span className={`w-2 h-2 rounded-full ${
                    mode === 'ramp_up' ? 'bg-amber-400' : mode === 'focus' ? 'bg-emerald-400' : 'bg-blue-400'
                  }`} />
                  <span>{mode === 'ramp_up' ? 'ramping up.' : mode === 'focus' ? 'in flow.' : 'rest peacefully.'}</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-stone-500" />
                  <span>paused.</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* 2-Minute Ramp-Up: Jump to Full Sprint Early */}
        {mode === 'ramp_up' && (
          <div className="pt-5">
            <button
              onClick={handleJumpToFullSprint}
              className="inline-flex items-center gap-2 px-6 py-3 text-xs sm:text-sm font-serif font-medium text-stone-900 bg-amber-400 hover:bg-amber-300 rounded-2xl transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <Zap className="w-4 h-4 fill-current" />
              <span>Jump to Full Sprint (Momentum Kicked In)</span>
            </button>
          </div>
        )}

        {/* Procedural Nature Soundscape Generator & Multi-Track Mixer Control (0 KB Downloads) */}
        <div className="mt-6 flex flex-col items-center justify-center gap-3 max-w-2xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full">
            {/* Audio Track Selectors */}
            <div className="p-1 bg-stone-900/90 border border-stone-800/90 rounded-2xl sm:rounded-full inline-flex flex-wrap items-center justify-center gap-1 shadow-inner max-w-full">
              <button
                type="button"
                onClick={handleMuteAll}
                className={`px-3 py-1.5 rounded-xl sm:rounded-full transition-all text-xs font-serif cursor-pointer ${
                  activeTracks.length === 0
                    ? 'bg-stone-800 text-white font-medium border border-stone-700 shadow-2xs'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                Mute
              </button>

              <button
                type="button"
                onClick={() => handleToggleTrack('waves')}
                className={`px-3 py-1.5 rounded-xl sm:rounded-full transition-all text-xs font-serif cursor-pointer inline-flex items-center gap-1.5 ${
                  activeTracks.includes('waves')
                    ? 'bg-emerald-950 text-emerald-200 border border-emerald-800/70 font-semibold shadow-2xs'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <Waves className="w-3 h-3 text-emerald-400" />
                <span>Ocean Waves</span>
              </button>

              <button
                type="button"
                onClick={() => handleToggleTrack('rain')}
                className={`px-3 py-1.5 rounded-xl sm:rounded-full transition-all text-xs font-serif cursor-pointer inline-flex items-center gap-1.5 ${
                  activeTracks.includes('rain')
                    ? 'bg-emerald-950 text-emerald-200 border border-emerald-800/70 font-semibold shadow-2xs'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <CloudRain className="w-3 h-3 text-emerald-400" />
                <span>Rainfall</span>
              </button>

              <button
                type="button"
                onClick={() => handleToggleTrack('brook')}
                className={`px-3 py-1.5 rounded-xl sm:rounded-full transition-all text-xs font-serif cursor-pointer inline-flex items-center gap-1.5 ${
                  activeTracks.includes('brook')
                    ? 'bg-emerald-950 text-emerald-200 border border-emerald-800/70 font-semibold shadow-2xs'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <Wind className="w-3 h-3 text-emerald-400" />
                <span>Brook Water</span>
              </button>
            </div>

            {/* Master Volume Slider (0% to 100%, default 75%) */}
            <div className="flex items-center gap-2 text-xs font-serif text-stone-300 bg-stone-900/90 border border-stone-800/90 px-3.5 py-1.5 rounded-2xl sm:rounded-full shadow-inner">
              <button
                type="button"
                onClick={() => handleVolumeChange(masterVolume > 0 ? 0 : 0.75)}
                className="text-stone-400 hover:text-stone-200 transition-colors cursor-pointer"
                title={masterVolume === 0 ? 'Unmute' : 'Mute master audio'}
                aria-label={masterVolume === 0 ? 'Unmute' : 'Mute master audio'}
              >
                {masterVolume === 0 ? (
                  <VolumeX className="w-3.5 h-3.5 text-stone-500" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5 text-stone-300" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={masterVolume}
                onChange={e => handleVolumeChange(parseFloat(e.target.value))}
                className="w-20 sm:w-24 h-1.5 bg-stone-800 accent-emerald-500 rounded-lg cursor-pointer"
                title={`Master Volume: ${Math.round(masterVolume * 100)}%`}
                aria-label="Master volume slider"
              />
              <span className="font-mono text-[11px] text-stone-400 w-8 text-right tabular-nums">
                {Math.round(masterVolume * 100)}%
              </span>
            </div>
          </div>
        </div>

        {/* Grounding Mantra */}
        <div 
          onClick={() => setMantraIndex((mantraIndex + 1) % MANTRAS.length)}
          className="mt-4 cursor-pointer group max-w-md mx-auto"
          title="Tap to cycle mantra"
        >
          <p className="text-xs font-serif italic text-stone-400 group-hover:text-stone-300 transition-colors">
            &quot;{MANTRAS[mantraIndex]}&quot;
          </p>
        </div>
      </div>

      {/* BOTTOM ZONE: Two Primary Buttons ("Complete Chunk" and "Exit Zen Mode") + Controls */}
      <div className="relative z-10 w-full max-w-4xl mx-auto pt-6 border-t border-stone-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Secondary controls: Pause/Resume, Reset */}
        <div className="flex items-center gap-2 order-2 sm:order-1">
          <button
            onClick={toggleActive}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-stone-900 border border-stone-800 hover:bg-stone-800 text-stone-300 text-xs font-serif transition-colors cursor-pointer min-h-[42px]"
          >
            {isActive ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>{isActive ? 'Pause Timer' : 'Resume'}</span>
          </button>

          <button
            onClick={handleReset}
            className="p-2.5 rounded-xl bg-stone-900 border border-stone-800 hover:bg-stone-800 text-stone-400 hover:text-white transition-colors cursor-pointer min-h-[42px]"
            title="Reset timer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* The Two Primary Action Buttons: "Complete Chunk" and "Exit Zen Mode" */}
        <div className="flex items-center gap-3 w-full sm:w-auto order-1 sm:order-2">
          <button
            onClick={handleExitZenMode}
            className="flex-1 sm:flex-initial px-5 py-3 rounded-2xl bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-white border border-stone-800 text-xs sm:text-sm font-serif transition-all cursor-pointer min-h-[46px]"
          >
            Exit Zen
          </button>

          <button
            onClick={handleCompleteChunk}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-[#FAF8F5] text-stone-950 hover:bg-white text-xs sm:text-sm font-serif font-medium transition-all shadow-md active:scale-95 cursor-pointer min-h-[46px]"
          >
            <Check className="w-4 h-4 text-emerald-700 stroke-[3]" />
            <span>Complete Chunk</span>
          </button>
        </div>
      </div>
    </div>
  );
};
