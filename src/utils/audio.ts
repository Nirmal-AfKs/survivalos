/**
 * Calming harmonic acoustic chime and procedural nature soundscapes using pure Web Audio API.
 * 100% offline, zero-asset, procedural synthesis in-browser (<0 KB downloads).
 * Supports single-track mode and multi-track acoustic layering with individual volume faders
 * routed through a master DynamicsCompressorNode limiter.
 */

export type NatureSoundType = 'none' | 'waves' | 'rain' | 'brook';
export type ActiveNatureTrack = 'waves' | 'rain' | 'brook';

const STORAGE_KEYS = {
  VOLUME: 'cadence_master_volume',
  SOUNDSCAPE: 'cadence_focus_soundscape',
  TRACK_VOLUMES: 'cadence_multitrack_volumes',
};

let audioCtx: AudioContext | null = null;
let masterGainNode: GainNode | null = null;
let compressorNode: DynamicsCompressorNode | null = null;

interface ActiveTrackHandle {
  type: ActiveNatureTrack;
  gainNode: GainNode;
  activeSources: { stop: () => void }[];
  stop: (fadeTime?: number) => void;
  setVolume: (vol: number) => void;
}

const runningTracks = new Map<ActiveNatureTrack, ActiveTrackHandle>();

// Legacy single-track pointer
let currentAmbientNodes: {
  stop: (fadeTime?: number) => void;
  gainNode: GainNode;
  type: NatureSoundType;
} | null = null;

/**
 * Get or load persisted master volume (0.0 to 1.0, default 0.75)
 */
export function getMasterVolume(): number {
  if (typeof window === 'undefined' && typeof localStorage === 'undefined') return 0.75;
  try {
    const storage = typeof localStorage !== 'undefined' ? localStorage : null;
    const raw = storage?.getItem(STORAGE_KEYS.VOLUME);
    if (raw !== null && raw !== undefined) {
      const val = parseFloat(raw);
      if (!isNaN(val) && val >= 0 && val <= 1) {
        return val;
      }
    }
  } catch {
    // localStorage unavailable
  }
  return 0.75;
}

/**
 * Set master volume (0.0 to 1.0) and update central master GainNode in real-time
 */
export function setMasterVolume(vol: number): void {
  const clamped = Math.max(0, Math.min(1, vol));
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.VOLUME, clamped.toFixed(2));
    }
  } catch {
    // ignore
  }

  if (masterGainNode && audioCtx) {
    try {
      const now = audioCtx.currentTime;
      masterGainNode.gain.cancelScheduledValues(now);
      masterGainNode.gain.setValueAtTime(masterGainNode.gain.value, now);
      masterGainNode.gain.linearRampToValueAtTime(clamped, now + 0.05);
    } catch {
      masterGainNode.gain.value = clamped;
    }
  }
}

/**
 * Get persisted track volumes for multi-track mixer (0.0 to 1.0 each)
 */
export interface MultiTrackVolumes {
  waves: number;
  rain: number;
  brook: number;
}

export function getTrackVolumes(): MultiTrackVolumes {
  const defaultVolumes: MultiTrackVolumes = {
    waves: 0.6,
    rain: 0.55,
    brook: 0.5,
  };
  if (typeof window === 'undefined' && typeof localStorage === 'undefined') return defaultVolumes;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TRACK_VOLUMES);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        waves: typeof parsed.waves === 'number' ? Math.max(0, Math.min(1, parsed.waves)) : defaultVolumes.waves,
        rain: typeof parsed.rain === 'number' ? Math.max(0, Math.min(1, parsed.rain)) : defaultVolumes.rain,
        brook: typeof parsed.brook === 'number' ? Math.max(0, Math.min(1, parsed.brook)) : defaultVolumes.brook,
      };
    }
  } catch {}
  return defaultVolumes;
}

/**
 * Save track volume in localStorage
 */
export function saveTrackVolume(track: ActiveNatureTrack, vol: number): void {
  try {
    const current = getTrackVolumes();
    current[track] = Math.max(0, Math.min(1, vol));
    localStorage.setItem(STORAGE_KEYS.TRACK_VOLUMES, JSON.stringify(current));
  } catch {}
}

/**
 * Get persisted preferred soundscape ('none' | 'waves' | 'rain' | 'brook')
 */
export function getMasterSoundscape(): NatureSoundType {
  if (typeof window === 'undefined' && typeof localStorage === 'undefined') return 'none';
  try {
    const storage = typeof localStorage !== 'undefined' ? localStorage : null;
    const raw = storage?.getItem(STORAGE_KEYS.SOUNDSCAPE);
    if (raw === 'waves' || raw === 'rain' || raw === 'brook' || raw === 'none') {
      return raw;
    }
  } catch {
    // ignore
  }
  return 'none';
}

/**
 * Set preferred soundscape and persist to localStorage
 */
export function setMasterSoundscape(type: NatureSoundType): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.SOUNDSCAPE, type);
    }
  } catch {
    // ignore
  }
}

/**
 * Lazy initialize AudioContext and Central Master GainNode
 */
function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }

  if (audioCtx) {
    if (!masterGainNode) {
      masterGainNode = audioCtx.createGain();
      masterGainNode.gain.value = getMasterVolume();
      masterGainNode.connect(audioCtx.destination);
    }

    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {
        // User gesture may be needed
      });
    }
  }

  return audioCtx;
}

/**
 * Returns the central master gain node, keeping all audio scaled to user's volume preference
 * and routed through a DynamicsCompressorNode limiter to avoid clipping.
 */
function getCentralMasterGain(ctx: AudioContext): GainNode {
  if (!masterGainNode || masterGainNode.context !== ctx) {
    masterGainNode = ctx.createGain();
    masterGainNode.gain.value = getMasterVolume();

    // Soft-knee brickwall limiter prevents any clipping at maximum volume on small phone speakers
    if (!compressorNode || compressorNode.context !== ctx) {
      try {
        compressorNode = ctx.createDynamicsCompressor();
        compressorNode.threshold.setValueAtTime(-3, ctx.currentTime);
        compressorNode.knee.setValueAtTime(10, ctx.currentTime);
        compressorNode.ratio.setValueAtTime(8, ctx.currentTime);
        compressorNode.attack.setValueAtTime(0.003, ctx.currentTime);
        compressorNode.release.setValueAtTime(0.2, ctx.currentTime);
        compressorNode.connect(ctx.destination);
        masterGainNode.connect(compressorNode);
      } catch {
        masterGainNode.connect(ctx.destination);
      }
    } else {
      masterGainNode.connect(compressorNode);
    }
  }
  return masterGainNode;
}

/**
 * Synthesizes pure harmonic Tibetan singing bowl & Solfeggio bells.
 */
export function playGentleBell(type: 'focus_start' | 'break_start' | 'complete' = 'focus_start') {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const master = getCentralMasterGain(ctx);
    const now = ctx.currentTime;

    const frequencies =
      type === 'complete'
        ? [528, 660, 792, 1056]
        : type === 'break_start'
        ? [432, 540, 648]
        : [528, 792, 1056];

    frequencies.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(0.0001, now + idx * 0.08);
      const peakGain = 0.78 / Math.sqrt(idx + 1);
      gain.gain.exponentialRampToValueAtTime(peakGain, now + idx * 0.08 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 2.6);

      osc.connect(gain);
      gain.connect(master);

      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 2.7);
    });
  } catch (e) {
    console.debug('Gentle chime note:', e);
  }
}

/**
 * Synthesizes Ocean Waves: Brown noise + 0.09 Hz slow LFO driving BiquadFilter
 */
function createWavesGraph(ctx: AudioContext, master: GainNode, volume: number): ActiveTrackHandle {
  const soundscapeGain = ctx.createGain();
  soundscapeGain.gain.setValueAtTime(0.0001, ctx.currentTime);
  soundscapeGain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume), ctx.currentTime + 1.2);
  soundscapeGain.connect(master);

  const bufferSize = 4 * ctx.sampleRate;
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const output = noiseBuffer.getChannelData(0);

  let lastOut = 0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    lastOut = (lastOut + 0.022 * white) / 1.02;
    output[i] = lastOut * 3.6;
  }

  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer;
  noise.loop = true;

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(320, ctx.currentTime);
  filter.Q.setValueAtTime(1.8, ctx.currentTime);

  const lfo = ctx.createOscillator();
  lfo.frequency.setValueAtTime(0.09, ctx.currentTime);

  const lfoDepth = ctx.createGain();
  lfoDepth.gain.setValueAtTime(320, ctx.currentTime);
  lfo.connect(lfoDepth);
  lfoDepth.connect(filter.frequency);

  const swellGain = ctx.createGain();
  swellGain.gain.setValueAtTime(0.7, ctx.currentTime);

  const lfoAmpDepth = ctx.createGain();
  lfoAmpDepth.gain.setValueAtTime(0.3, ctx.currentTime);
  lfo.connect(lfoAmpDepth);
  lfoAmpDepth.connect(swellGain.gain);

  noise.connect(filter);
  filter.connect(swellGain);
  swellGain.connect(soundscapeGain);

  noise.start();
  lfo.start();

  const activeSources = [noise, lfo];

  const stop = (fadeTime: number = 0.8) => {
    try {
      const t = ctx.currentTime;
      soundscapeGain.gain.cancelScheduledValues(t);
      soundscapeGain.gain.setValueAtTime(soundscapeGain.gain.value, t);
      soundscapeGain.gain.exponentialRampToValueAtTime(0.0001, t + fadeTime);
      setTimeout(() => {
        activeSources.forEach(s => {
          try { s.stop(); } catch {}
        });
      }, Math.round((fadeTime + 0.1) * 1000));
    } catch {}
  };

  const setVolume = (newVol: number) => {
    try {
      const t = ctx.currentTime;
      soundscapeGain.gain.cancelScheduledValues(t);
      soundscapeGain.gain.setValueAtTime(soundscapeGain.gain.value, t);
      soundscapeGain.gain.linearRampToValueAtTime(Math.max(0.0001, newVol), t + 0.08);
    } catch {}
  };

  return { type: 'waves', gainNode: soundscapeGain, activeSources, stop, setVolume };
}

/**
 * Synthesizes Rainfall: Pink noise passed through high-pass filter + gain variations
 */
function createRainGraph(ctx: AudioContext, master: GainNode, volume: number): ActiveTrackHandle {
  const soundscapeGain = ctx.createGain();
  soundscapeGain.gain.setValueAtTime(0.0001, ctx.currentTime);
  soundscapeGain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume), ctx.currentTime + 1.2);
  soundscapeGain.connect(master);

  const bufferSize = 3 * ctx.sampleRate;
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const output = noiseBuffer.getChannelData(0);

  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.96900 * b2 + white * 0.1538520;
    b3 = 0.86650 * b3 + white * 0.3104856;
    b4 = 0.55000 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.0168980;
    output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.042;
    b6 = white * 0.115926;
  }

  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer;
  noise.loop = true;

  const highPass = ctx.createBiquadFilter();
  highPass.type = 'highpass';
  highPass.frequency.setValueAtTime(260, ctx.currentTime);
  highPass.Q.setValueAtTime(0.7, ctx.currentTime);

  const lowPass = ctx.createBiquadFilter();
  lowPass.type = 'lowpass';
  lowPass.frequency.setValueAtTime(4600, ctx.currentTime);

  const flutterLfo = ctx.createOscillator();
  flutterLfo.frequency.setValueAtTime(0.85, ctx.currentTime);

  const flutterGain = ctx.createGain();
  flutterGain.gain.setValueAtTime(0.12, ctx.currentTime);

  const rainGain = ctx.createGain();
  rainGain.gain.setValueAtTime(0.88, ctx.currentTime);

  flutterLfo.connect(flutterGain);
  flutterGain.connect(rainGain.gain);

  noise.connect(highPass);
  highPass.connect(lowPass);
  lowPass.connect(rainGain);
  rainGain.connect(soundscapeGain);

  noise.start();
  flutterLfo.start();

  const activeSources = [noise, flutterLfo];

  const stop = (fadeTime: number = 0.8) => {
    try {
      const t = ctx.currentTime;
      soundscapeGain.gain.cancelScheduledValues(t);
      soundscapeGain.gain.setValueAtTime(soundscapeGain.gain.value, t);
      soundscapeGain.gain.exponentialRampToValueAtTime(0.0001, t + fadeTime);
      setTimeout(() => {
        activeSources.forEach(s => {
          try { s.stop(); } catch {}
        });
      }, Math.round((fadeTime + 0.1) * 1000));
    } catch {}
  };

  const setVolume = (newVol: number) => {
    try {
      const t = ctx.currentTime;
      soundscapeGain.gain.cancelScheduledValues(t);
      soundscapeGain.gain.setValueAtTime(soundscapeGain.gain.value, t);
      soundscapeGain.gain.linearRampToValueAtTime(Math.max(0.0001, newVol), t + 0.08);
    } catch {}
  };

  return { type: 'rain', gainNode: soundscapeGain, activeSources, stop, setVolume };
}

/**
 * Synthesizes Brook Water: Filtered noise with resonant bandpass nodes (babbling stream)
 */
function createBrookGraph(ctx: AudioContext, master: GainNode, volume: number): ActiveTrackHandle {
  const soundscapeGain = ctx.createGain();
  soundscapeGain.gain.setValueAtTime(0.0001, ctx.currentTime);
  soundscapeGain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume), ctx.currentTime + 1.2);
  soundscapeGain.connect(master);

  const bufferSize = 3 * ctx.sampleRate;
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const output = noiseBuffer.getChannelData(0);

  let last = 0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    last = (last * 0.6) + (white * 0.4);
    output[i] = last * 0.18;
  }

  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer;
  noise.loop = true;

  const bodyFilter = ctx.createBiquadFilter();
  bodyFilter.type = 'bandpass';
  bodyFilter.frequency.setValueAtTime(480, ctx.currentTime);
  bodyFilter.Q.setValueAtTime(1.4, ctx.currentTime);

  const ripple1 = ctx.createBiquadFilter();
  ripple1.type = 'bandpass';
  ripple1.frequency.setValueAtTime(740, ctx.currentTime);
  ripple1.Q.setValueAtTime(4.8, ctx.currentTime);

  const lfo1 = ctx.createOscillator();
  lfo1.frequency.setValueAtTime(2.2, ctx.currentTime);
  const lfo1Depth = ctx.createGain();
  lfo1Depth.gain.setValueAtTime(240, ctx.currentTime);
  lfo1.connect(lfo1Depth);
  lfo1Depth.connect(ripple1.frequency);

  const ripple2 = ctx.createBiquadFilter();
  ripple2.type = 'bandpass';
  ripple2.frequency.setValueAtTime(1380, ctx.currentTime);
  ripple2.Q.setValueAtTime(5.8, ctx.currentTime);

  const lfo2 = ctx.createOscillator();
  lfo2.frequency.setValueAtTime(3.4, ctx.currentTime);
  const lfo2Depth = ctx.createGain();
  lfo2Depth.gain.setValueAtTime(340, ctx.currentTime);
  lfo2.connect(lfo2Depth);
  lfo2Depth.connect(ripple2.frequency);

  const mixer = ctx.createGain();
  mixer.gain.setValueAtTime(1.0, ctx.currentTime);

  noise.connect(bodyFilter);
  bodyFilter.connect(mixer);

  noise.connect(ripple1);
  ripple1.connect(mixer);

  noise.connect(ripple2);
  ripple2.connect(mixer);

  mixer.connect(soundscapeGain);

  noise.start();
  lfo1.start();
  lfo2.start();

  const activeSources = [noise, lfo1, lfo2];

  const stop = (fadeTime: number = 0.8) => {
    try {
      const t = ctx.currentTime;
      soundscapeGain.gain.cancelScheduledValues(t);
      soundscapeGain.gain.setValueAtTime(soundscapeGain.gain.value, t);
      soundscapeGain.gain.exponentialRampToValueAtTime(0.0001, t + fadeTime);
      setTimeout(() => {
        activeSources.forEach(s => {
          try { s.stop(); } catch {}
        });
      }, Math.round((fadeTime + 0.1) * 1000));
    } catch {}
  };

  const setVolume = (newVol: number) => {
    try {
      const t = ctx.currentTime;
      soundscapeGain.gain.cancelScheduledValues(t);
      soundscapeGain.gain.setValueAtTime(soundscapeGain.gain.value, t);
      soundscapeGain.gain.linearRampToValueAtTime(Math.max(0.0001, newVol), t + 0.08);
    } catch {}
  };

  return { type: 'brook', gainNode: soundscapeGain, activeSources, stop, setVolume };
}

/**
 * Start or stop an individual track in the Multi-Track Acoustic Mixer
 */
export function startTrack(track: ActiveNatureTrack, volume?: number): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const currentTrack = runningTracks.get(track);
  if (currentTrack) {
    if (typeof volume === 'number') {
      currentTrack.setVolume(volume);
    }
    return;
  }

  const vol = volume ?? getTrackVolumes()[track];
  const master = getCentralMasterGain(ctx);

  let handle: ActiveTrackHandle;
  if (track === 'waves') {
    handle = createWavesGraph(ctx, master, vol);
  } else if (track === 'rain') {
    handle = createRainGraph(ctx, master, vol);
  } else {
    handle = createBrookGraph(ctx, master, vol);
  }

  runningTracks.set(track, handle);
}

/**
 * Stops an individual track in the Multi-Track Acoustic Mixer
 */
export function stopTrack(track: ActiveNatureTrack, fadeTime: number = 0.8): void {
  const handle = runningTracks.get(track);
  if (handle) {
    handle.stop(fadeTime);
    runningTracks.delete(track);
  }
}

/**
 * Adjust volume for an individual track (0.0 to 1.0)
 */
export function setTrackVolume(track: ActiveNatureTrack, volume: number): void {
  const clamped = Math.max(0, Math.min(1, volume));
  saveTrackVolume(track, clamped);
  const handle = runningTracks.get(track);
  if (handle) {
    handle.setVolume(clamped);
  }
}

/**
 * Returns whether a specific track is currently active
 */
export function isTrackActive(track: ActiveNatureTrack): boolean {
  return runningTracks.has(track);
}

/**
 * Returns list of currently active tracks
 */
export function getActiveTracks(): ActiveNatureTrack[] {
  return Array.from(runningTracks.keys());
}

/**
 * Continuous Procedural Nature Sound Generator (Single track or master starter):
 * Maintained for backward compatibility.
 */
export function startAmbientSound(
  type: NatureSoundType,
  volume: number = 0.22
): (fadeTime?: number) => void {
  stopAmbientSound(0.4);

  if (type === 'none') {
    return () => {};
  }

  startTrack(type, volume);

  const stopFn = (fadeTime: number = 0.8) => {
    stopTrack(type, fadeTime);
    if (currentAmbientNodes?.type === type) {
      currentAmbientNodes = null;
    }
  };

  currentAmbientNodes = {
    stop: stopFn,
    gainNode: runningTracks.get(type)?.gainNode as any,
    type,
  };

  return stopFn;
}

/**
 * Stop all active soundscapes with smooth fade out
 */
export function stopAmbientSound(fadeTime: number = 0.8) {
  if (currentAmbientNodes) {
    try {
      currentAmbientNodes.stop(fadeTime);
    } catch {}
    currentAmbientNodes = null;
  }

  runningTracks.forEach(handle => {
    try {
      handle.stop(fadeTime);
    } catch {}
  });
  runningTracks.clear();
}

/**
 * Returns currently active soundscape type
 */
export function getActiveSoundscapeType(): NatureSoundType {
  const active = getActiveTracks();
  if (active.length === 0) return 'none';
  if (active.length === 1) return active[0];
  return active[0]; // Primary active
}
