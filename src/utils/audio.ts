/**
 * Calming harmonic acoustic chime and procedural nature soundscapes using pure Web Audio API.
 * 100% offline, zero-asset, procedural synthesis in-browser (<0 KB downloads).
 */

export type NatureSoundType = 'none' | 'waves' | 'rain' | 'brook';

const STORAGE_KEYS = {
  VOLUME: 'cadence_master_volume',
  SOUNDSCAPE: 'cadence_focus_soundscape',
};

let audioCtx: AudioContext | null = null;
let masterGainNode: GainNode | null = null;

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

let compressorNode: DynamicsCompressorNode | null = null;

/**
 * Returns the central master gain node, keeping all audio scaled to user's volume preference
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
 * Boosted gain multiplier ensures loud, crisp clarity on mobile phone speakers through master volume.
 */
export function playGentleBell(type: 'focus_start' | 'break_start' | 'complete' = 'focus_start') {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const master = getCentralMasterGain(ctx);
    const now = ctx.currentTime;

    // Harmonic Solfeggio & golden ratio frequencies
    const frequencies =
      type === 'complete'
        ? [528, 660, 792, 1056] // Harmonic celebratory resolution (528Hz DNA repair / transformation)
        : type === 'break_start'
        ? [432, 540, 648] // Soothing 432Hz warm major chord for mindful unwinding
        : [528, 792, 1056]; // Grounding focus bell (528Hz clarity and awareness)

    // Boosted chime gain: loud, crisp, and audible on phone speakers without clipping
    frequencies.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      // Attack and long harmonic tail
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
 * Continuous Procedural Nature Sound Generator (0 KB Downloads):
 * - Ocean Waves: Brown noise modulated by a 0.09 Hz slow LFO driving a BiquadFilterNode
 * - Rainfall: Pink noise passed through a gentle high-pass filter with subtle random gain variations
 * - Brook Water: Filtered noise with resonant bandpass nodes creating a soft, continuous babbling water texture
 */
export function startAmbientSound(
  type: NatureSoundType,
  volume: number = 0.22
): (fadeTime?: number) => void {
  stopAmbientSound(0.4);

  if (type === 'none') {
    return () => {};
  }

  const ctx = getAudioContext();
  if (!ctx) return () => {};

  try {
    const master = getCentralMasterGain(ctx);
    const soundscapeGain = ctx.createGain();
    
    // Smooth initial fade-in
    soundscapeGain.gain.setValueAtTime(0.0001, ctx.currentTime);
    soundscapeGain.gain.exponentialRampToValueAtTime(volume, ctx.currentTime + 1.2);
    soundscapeGain.connect(master);

    const activeSources: { stop: () => void }[] = [];

    // =========================================================================
    // 1. OCEAN WAVES: Brown noise + 0.09 Hz LFO driving BiquadFilter (0.08-0.12 Hz)
    // =========================================================================
    if (type === 'waves') {
      const bufferSize = 4 * ctx.sampleRate;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);

      // Synthesize deep brown noise (-6dB/octave slope)
      let lastOut = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        lastOut = (lastOut + 0.022 * white) / 1.02;
        output[i] = lastOut * 3.6;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;
      noise.loop = true;

      // Filter mimicking rhythmic rolling ocean swells
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(320, ctx.currentTime);
      filter.Q.setValueAtTime(1.8, ctx.currentTime);

      // Slow LFO oscillator between 0.08–0.12 Hz (~11-second natural wave cycle)
      const lfo = ctx.createOscillator();
      lfo.frequency.setValueAtTime(0.09, ctx.currentTime);

      const lfoDepth = ctx.createGain();
      lfoDepth.gain.setValueAtTime(320, ctx.currentTime);

      lfo.connect(lfoDepth);
      lfoDepth.connect(filter.frequency);

      // Subtle dynamic volume swell tracking the wave crest
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
      activeSources.push(noise, lfo);
    } 

    // =========================================================================
    // 2. RAINFALL: Pink noise passed through high-pass filter + gain variations
    // =========================================================================
    else if (type === 'rain') {
      const bufferSize = 3 * ctx.sampleRate;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);

      // Synthesize pink noise (1/f spectral density via Paul Kellet's filter)
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

      // Gentle high-pass filter to remove rumble and emphasize light patter
      const highPass = ctx.createBiquadFilter();
      highPass.type = 'highpass';
      highPass.frequency.setValueAtTime(260, ctx.currentTime);
      highPass.Q.setValueAtTime(0.7, ctx.currentTime);

      // Lowpass to roll off digital harshness
      const lowPass = ctx.createBiquadFilter();
      lowPass.type = 'lowpass';
      lowPass.frequency.setValueAtTime(4600, ctx.currentTime);

      // Subtle random gain variations for natural wind / droplet density fluctuation
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
      activeSources.push(noise, flutterLfo);
    }

    // =========================================================================
    // 3. BROOK WATER: Filtered noise with resonant bandpass nodes (babbling stream)
    // =========================================================================
    else if (type === 'brook') {
      const bufferSize = 3 * ctx.sampleRate;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);

      // Pink/white balanced stream texture
      let last = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        last = (last * 0.6) + (white * 0.4);
        output[i] = last * 0.18;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;
      noise.loop = true;

      // Base body of continuous flowing water
      const bodyFilter = ctx.createBiquadFilter();
      bodyFilter.type = 'bandpass';
      bodyFilter.frequency.setValueAtTime(480, ctx.currentTime);
      bodyFilter.Q.setValueAtTime(1.4, ctx.currentTime);

      // Resonant bandpass node 1: Mid-frequency bubbling ripples
      const ripple1 = ctx.createBiquadFilter();
      ripple1.type = 'bandpass';
      ripple1.frequency.setValueAtTime(740, ctx.currentTime);
      ripple1.Q.setValueAtTime(4.8, ctx.currentTime); // High resonance for watery bubble

      const lfo1 = ctx.createOscillator();
      lfo1.frequency.setValueAtTime(2.2, ctx.currentTime);
      const lfo1Depth = ctx.createGain();
      lfo1Depth.gain.setValueAtTime(240, ctx.currentTime);
      lfo1.connect(lfo1Depth);
      lfo1Depth.connect(ripple1.frequency);

      // Resonant bandpass node 2: High pebble splashes
      const ripple2 = ctx.createBiquadFilter();
      ripple2.type = 'bandpass';
      ripple2.frequency.setValueAtTime(1380, ctx.currentTime);
      ripple2.Q.setValueAtTime(5.8, ctx.currentTime); // High resonance for watery gurgle

      const lfo2 = ctx.createOscillator();
      lfo2.frequency.setValueAtTime(3.4, ctx.currentTime);
      const lfo2Depth = ctx.createGain();
      lfo2Depth.gain.setValueAtTime(340, ctx.currentTime);
      lfo2.connect(lfo2Depth);
      lfo2Depth.connect(ripple2.frequency);

      // Mix body with resonant droplets
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
      activeSources.push(noise, lfo1, lfo2);
    }

    const stopFn = (fadeTime: number = 0.8) => {
      try {
        const t = ctx.currentTime;
        soundscapeGain.gain.cancelScheduledValues(t);
        soundscapeGain.gain.setValueAtTime(soundscapeGain.gain.value, t);
        soundscapeGain.gain.exponentialRampToValueAtTime(0.0001, t + fadeTime);
        setTimeout(() => {
          activeSources.forEach(s => {
            try {
              s.stop();
            } catch {
              // ignore
            }
          });
          if (currentAmbientNodes?.stop === stopFn) {
            currentAmbientNodes = null;
          }
        }, Math.round((fadeTime + 0.1) * 1000));
      } catch {
        // ignore
      }
    };

    currentAmbientNodes = {
      stop: stopFn,
      gainNode: soundscapeGain,
      type,
    };

    return stopFn;
  } catch (err) {
    console.debug('Ambient generator note:', err);
    return () => {};
  }
}

/**
 * Stop active soundscape with smooth fade out
 */
export function stopAmbientSound(fadeTime: number = 0.8) {
  if (currentAmbientNodes) {
    try {
      currentAmbientNodes.stop(fadeTime);
    } catch {
      // ignore
    }
    currentAmbientNodes = null;
  }
}

/**
 * Returns currently active soundscape type
 */
export function getActiveSoundscapeType(): NatureSoundType {
  return currentAmbientNodes?.type || 'none';
}
