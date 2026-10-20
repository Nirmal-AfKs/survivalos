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
  Quote
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ScheduledSlot } from '../types';
import { playGentleBell, startAmbientSound, stopAmbientSound } from '../utils/audio';
import { formatChunkTitle } from '../utils/format';

interface FocusTimerModalProps {
  slot: ScheduledSlot | null;
  onClose: () => void;
  onCompleteSlot: (slotId: string) => void;
  breakDurationMinutes: number;
}

type AmbientType = 'none' | 'bowl' | 'rain' | 'waves';

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
}) => {
  const initialFocusSeconds = (slot?.durationMinutes ?? 45) * 60;
  const initialBreakSeconds = breakDurationMinutes * 60;

  const [mode, setMode] = useState<'focus' | 'break'>('focus');
  const [totalSeconds, setTotalSeconds] = useState(initialFocusSeconds);
  const [secondsRemaining, setSecondsRemaining] = useState(initialFocusSeconds);
  const [isActive, setIsActive] = useState(true);
  const [ambientSound, setAmbientSound] = useState<AmbientType>('none');
  const [mantraIndex, setMantraIndex] = useState(0);

  const displayTitle = formatChunkTitle(slot?.workTitle, slot?.chunkNumber, slot?.totalChunks);

  // Track ambient stop function
  const stopAmbientRef = useRef<(() => void) | null>(null);

  // Initialize timer on slot change
  useEffect(() => {
    if (!slot) return;

    try {
      playGentleBell('focus_start');
    } catch {
      // browser audio restrictions
    }
    const secs = slot.durationMinutes * 60;
    setTotalSeconds(secs);
    setSecondsRemaining(secs);
    setMode('focus');
    setIsActive(true);
    setMantraIndex(Math.floor(Math.random() * MANTRAS.length));

    return () => {
      stopAmbientSound();
      if (stopAmbientRef.current) {
        stopAmbientRef.current();
        stopAmbientRef.current = null;
      }
    };
  }, [slot?.id]);

  // Handle ambient sound changes
  useEffect(() => {
    if (stopAmbientRef.current) {
      stopAmbientRef.current();
      stopAmbientRef.current = null;
    }

    if (isActive && ambientSound !== 'none') {
      stopAmbientRef.current = startAmbientSound(ambientSound);
    } else {
      stopAmbientSound();
    }

    return () => {
      stopAmbientSound();
    };
  }, [ambientSound, isActive]);

  // Timer tick
  useEffect(() => {
    let interval: number | null = null;
    if (isActive && secondsRemaining > 0) {
      interval = window.setInterval(() => {
        setSecondsRemaining(prev => Math.max(0, prev - 1));
      }, 1000);
    } else if (isActive && secondsRemaining === 0) {
      if (mode === 'focus') {
        playGentleBell('break_start');
        setMode('break');
        const breakSecs = breakDurationMinutes * 60;
        setTotalSeconds(breakSecs);
        setSecondsRemaining(breakSecs);
      } else {
        playGentleBell('complete');
        setIsActive(false);
      }
    }
    return () => {
      if (interval !== null) clearInterval(interval);
    };
  }, [isActive, secondsRemaining, mode, breakDurationMinutes]);

  const toggleActive = () => {
    setIsActive(!isActive);
  };

  const handleReset = () => {
    setIsActive(false);
    const resetTarget = mode === 'focus' ? (slot?.durationMinutes || 45) * 60 : breakDurationMinutes * 60;
    setTotalSeconds(resetTarget);
    setSecondsRemaining(resetTarget);
  };

  const handleAddFiveMinutes = () => {
    setTotalSeconds(prev => prev + 300);
    setSecondsRemaining(prev => prev + 300);
  };

  const handleSubtractFiveMinutes = () => {
    if (secondsRemaining > 300) {
      setTotalSeconds(prev => Math.max(60, prev - 300));
      setSecondsRemaining(prev => Math.max(60, prev - 300));
    }
  };

  const handleSwitchToBreak = () => {
    playGentleBell('break_start');
    setMode('break');
    const breakSecs = breakDurationMinutes * 60;
    setTotalSeconds(breakSecs);
    setSecondsRemaining(breakSecs);
    setIsActive(true);
  };

  const handleSwitchToFocus = () => {
    playGentleBell('focus_start');
    setMode('focus');
    const focusSecs = (slot?.durationMinutes || 45) * 60;
    setTotalSeconds(focusSecs);
    setSecondsRemaining(focusSecs);
    setIsActive(true);
  };

  const handleCompleteNow = () => {
    stopAmbientSound();
    try {
      confetti({
        particleCount: 65,
        spread: 75,
        origin: { y: 0.6 },
        colors: ['#FAF8F5', '#10b981', '#f59e0b', '#6366f1'],
      });
    } catch {
      // ignore
    }
    playGentleBell('complete');
    if (slot) onCompleteSlot(slot.id);
    onClose();
  };

  const handleCycleMantra = () => {
    setMantraIndex((mantraIndex + 1) % MANTRAS.length);
  };

  const progressRatio = totalSeconds > 0 ? (totalSeconds - secondsRemaining) / totalSeconds : 0;
  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  // Dial geometry
  const radius = 104;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - progressRatio * circumference;

  // Angle for the glowing orbital lead bead
  const currentAngle = progressRatio * 360 - 90;
  const beadX = 130 + radius * Math.cos((currentAngle * Math.PI) / 180);
  const beadY = 130 + radius * Math.sin((currentAngle * Math.PI) / 180);

  if (!slot) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/85 backdrop-blur-lg overflow-y-auto selection:bg-stone-800">
      <div 
        className="bg-[#181615] border border-stone-800/90 text-[#FAF8F5] rounded-3xl max-w-lg w-full p-6 sm:p-9 shadow-2xl relative flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-200 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Ambient organic breathing glow aura */}
        <div 
          className={`absolute inset-0 pointer-events-none transition-all duration-1000 ${
            mode === 'focus' 
              ? 'bg-[radial-gradient(ellipse_at_50%_40%,rgba(16,185,129,0.14),transparent_70%)]' 
              : 'bg-[radial-gradient(ellipse_at_50%_40%,rgba(245,158,11,0.14),transparent_70%)]'
          } ${isActive ? 'animate-pulse' : 'opacity-40'}`} 
        />

        {/* Close Button */}
        <button
          onClick={() => {
            stopAmbientSound();
            onClose();
          }}
          className="absolute top-5 right-5 p-2 text-stone-400 hover:text-white rounded-full hover:bg-stone-800/80 transition-colors z-20 cursor-pointer"
          title="Exit Focus Mode"
        >
          <X className="w-5 h-5" />
        </button>

        {/* State Badge & Title */}
        <div className="space-y-2 relative z-10 max-w-md">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-serif bg-stone-800/80 border border-stone-700/60 shadow-2xs">
            {mode === 'focus' ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-emerald-300 font-medium tracking-wide">cadence focus session.</span>
              </>
            ) : (
              <>
                <Coffee className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-amber-300 font-medium tracking-wide">mindful rest & restore.</span>
              </>
            )}
          </div>

          <h2 className="text-2xl sm:text-3xl font-serif font-normal tracking-tight text-white px-2">
            {displayTitle}
          </h2>

          <div className="flex items-center justify-center gap-2 text-xs text-stone-400 font-serif">
            <span>{slot.category.toLowerCase()}.</span>
            <span aria-hidden="true">·</span>
            <span>{slot.durationMinutes}m sprint</span>
            <span aria-hidden="true">·</span>
            <span>chunk {slot.chunkNumber} of {slot.totalChunks}</span>
          </div>
        </div>

        {/* Serene Circular Progress Dial */}
        <div className="relative w-68 h-68 sm:w-72 sm:h-72 flex items-center justify-center my-4 relative z-10">
          <svg className="w-full h-full transform -rotate-90">
            {/* Soft background track */}
            <circle
              cx="130"
              cy="130"
              r={radius}
              stroke="currentColor"
              strokeWidth="4"
              className="text-stone-800/80"
              fill="transparent"
            />

            {/* Subtle orbital dashed guideline */}
            <circle
              cx="130"
              cy="130"
              r={radius + 12}
              stroke="currentColor"
              strokeWidth="1"
              strokeDasharray="3 6"
              className="text-stone-800/50"
              fill="transparent"
            />

            {/* Active glowing progress track */}
            <circle
              cx="130"
              cy="130"
              r={radius}
              stroke="currentColor"
              strokeWidth="6"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className={`transition-all duration-1000 ${
                mode === 'focus' ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]' : 'text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]'
              }`}
              fill="transparent"
            />

            {/* Glowing orbital lead bead */}
            {progressRatio > 0 && progressRatio < 1 && (
              <circle
                cx={beadX}
                cy={beadY}
                r="5"
                className={mode === 'focus' ? 'fill-emerald-300 drop-shadow-[0_0_6px_#34d399]' : 'fill-amber-300 drop-shadow-[0_0_6px_#fbbf24]'}
              />
            )}
          </svg>

          {/* Center Digital & Pacing Readout */}
          <div className="absolute flex flex-col items-center">
            <span className="text-5xl sm:text-6xl font-serif font-light tracking-tight tabular-nums text-white">
              {formattedTime}
            </span>
            <div className="flex items-center gap-1.5 mt-2 text-[11px] font-serif tracking-widest uppercase text-stone-400">
              {isActive ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>{mode === 'focus' ? 'in flow.' : 'exhale gently.'}</span>
                </>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-stone-500" />
                  <span>paused.</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Ambient Soundscapes Bar (Generative Web Audio) */}
        <div className="w-full bg-stone-900/70 border border-stone-800/70 rounded-2xl p-2.5 flex items-center justify-between gap-2 relative z-10 text-xs font-serif">
          <span className="text-stone-400 flex items-center gap-1.5 pl-1.5">
            <Volume2 className="w-3.5 h-3.5 text-stone-400" />
            <span className="hidden sm:inline">ambient:</span>
          </span>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setAmbientSound('bowl')}
              className={`px-2.5 py-1 rounded-xl text-xs flex items-center gap-1 transition-all cursor-pointer ${
                ambientSound === 'bowl'
                  ? 'bg-emerald-950 text-emerald-200 border border-emerald-800/60 font-semibold'
                  : 'text-stone-400 hover:text-white hover:bg-stone-800'
              }`}
              title="432Hz Tibetan Singing Bowl Drone"
            >
              <Wind className="w-3 h-3" />
              <span>singing bowl</span>
            </button>

            <button
              onClick={() => setAmbientSound('rain')}
              className={`px-2.5 py-1 rounded-xl text-xs flex items-center gap-1 transition-all cursor-pointer ${
                ambientSound === 'rain'
                  ? 'bg-emerald-950 text-emerald-200 border border-emerald-800/60 font-semibold'
                  : 'text-stone-400 hover:text-white hover:bg-stone-800'
              }`}
              title="Soft gentle rainfall pink noise"
            >
              <CloudRain className="w-3 h-3" />
              <span>rain</span>
            </button>

            <button
              onClick={() => setAmbientSound('waves')}
              className={`px-2.5 py-1 rounded-xl text-xs flex items-center gap-1 transition-all cursor-pointer ${
                ambientSound === 'waves'
                  ? 'bg-emerald-950 text-emerald-200 border border-emerald-800/60 font-semibold'
                  : 'text-stone-400 hover:text-white hover:bg-stone-800'
              }`}
              title="Ocean breath wave cycles"
            >
              <Waves className="w-3 h-3" />
              <span>waves</span>
            </button>

            <button
              onClick={() => setAmbientSound('none')}
              className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                ambientSound === 'none'
                  ? 'text-white bg-stone-800'
                  : 'text-stone-500 hover:text-stone-300'
              }`}
              title="Mute ambient audio"
            >
              <VolumeX className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Primary Controls */}
        <div className="flex items-center justify-center gap-3 pt-4 w-full relative z-10">
          <button
            onClick={handleReset}
            className="p-3.5 rounded-2xl bg-stone-900 border border-stone-800 text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
            title="Reset timer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={handleSubtractFiveMinutes}
            className="p-3.5 rounded-2xl bg-stone-900 border border-stone-800 text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer flex items-center justify-center"
            title="Trim 5 minutes"
          >
            <Minus className="w-4 h-4" />
          </button>

          <button
            onClick={toggleActive}
            className="px-7 py-3.5 rounded-2xl bg-[#FAF8F5] text-stone-950 font-serif font-medium text-sm flex items-center gap-2 hover:bg-white transition-all shadow-md active:scale-95 cursor-pointer min-h-[48px]"
          >
            {isActive ? (
              <>
                <Pause className="w-4 h-4 fill-current" />
                <span>pause.</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>resume.</span>
              </>
            )}
          </button>

          <button
            onClick={handleAddFiveMinutes}
            className="p-3.5 rounded-2xl bg-stone-900 border border-stone-800 text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer flex items-center justify-center"
            title="Add 5 minutes to this sprint"
          >
            <Plus className="w-4 h-4" />
          </button>

          {mode === 'focus' ? (
            <button
              onClick={handleSwitchToBreak}
              className="p-3.5 rounded-2xl bg-stone-900 border border-stone-800 text-amber-400/90 hover:text-amber-300 hover:bg-stone-800 transition-colors cursor-pointer"
              title="Switch to mindful break"
            >
              <Coffee className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSwitchToFocus}
              className="p-3.5 rounded-2xl bg-stone-900 border border-stone-800 text-emerald-400/90 hover:text-emerald-300 hover:bg-stone-800 transition-colors cursor-pointer"
              title="Return to focus"
            >
              <Sparkles className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Grounding Micro-Mantra */}
        <div 
          onClick={handleCycleMantra}
          className="pt-4 pb-2 px-4 cursor-pointer group relative z-10 transition-transform active:scale-[0.99]"
          title="Tap to read another gentle reminder"
        >
          <div className="flex items-center justify-center gap-1.5 text-xs font-serif italic text-stone-400 group-hover:text-stone-300 transition-colors">
            <Quote className="w-3 h-3 text-stone-600 shrink-0 rotate-180" />
            <span>"{MANTRAS[mantraIndex]}"</span>
          </div>
          <span className="text-[10px] text-stone-600 group-hover:text-stone-500 font-sans mt-0.5 block">
            tap to cycle intention
          </span>
        </div>

        {/* Mark Done Early */}
        <div className="pt-3 w-full border-t border-stone-800/80 relative z-10">
          <button
            onClick={handleCompleteNow}
            className="w-full py-3 px-4 rounded-2xl bg-emerald-950/60 border border-emerald-800/50 text-emerald-300 hover:bg-emerald-900/70 font-serif text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
          >
            <Check className="w-4 h-4" />
            <span>mark block completed early.</span>
          </button>
        </div>
      </div>
    </div>
  );
};
