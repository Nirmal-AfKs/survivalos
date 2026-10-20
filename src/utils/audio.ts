/**
 * Calming harmonic acoustic chime and generative ambient soundscapes using Web Audio API.
 * Designed according to sound therapy principles for executive focus transitions.
 * 100% offline, asset-free, synthesized in-browser.
 */

let audioCtx: AudioContext | null = null;
let currentAmbientNodes: {
  stop: () => void;
  gainNode: GainNode;
} | null = null;

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
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {
      // User gesture might be required by browser
    });
  }
  return audioCtx;
}

export function playGentleBell(type: 'focus_start' | 'break_start' | 'complete' = 'focus_start') {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Frequencies inspired by Tibetan singing bowls and Solfeggio harmonics
    const frequencies =
      type === 'complete'
        ? [528, 660, 792, 1056] // Harmonic celebratory resolution
        : type === 'break_start'
        ? [432, 540, 648] // Soothing 432Hz warm major chord
        : [528, 792]; // Grounding focus bell (528Hz clarity)

    frequencies.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      // Gentle attack and exponential decay
      gain.gain.setValueAtTime(0.001, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.16 / (idx + 1), now + idx * 0.08 + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 2.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 2.5);
    });
  } catch (e) {
    console.debug('Gentle chime note:', e);
  }
}

/**
 * Start soothing generative ambient soundscapes
 */
export function startAmbientSound(
  type: 'rain' | 'bowl' | 'waves',
  volume: number = 0.12
): () => void {
  stopAmbientSound();

  const ctx = getAudioContext();
  if (!ctx) return () => {};

  try {
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.001, ctx.currentTime);
    masterGain.gain.exponentialRampToValueAtTime(volume, ctx.currentTime + 1.2);
    masterGain.connect(ctx.destination);

    const activeSources: { stop: () => void }[] = [];

    if (type === 'rain') {
      // Pink/soft noise generator filtered into gentle soothing rainfall
      const bufferSize = 2 * ctx.sampleRate;
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
        output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.035;
        b6 = white * 0.115926;
      }

      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, ctx.currentTime);

      whiteNoise.connect(filter);
      filter.connect(masterGain);
      whiteNoise.start();
      activeSources.push(whiteNoise);
    } else if (type === 'bowl') {
      // Tibetan singing bowl drone with gentle beating harmonics (432Hz & 528Hz)
      const freqs = [108, 216, 432, 528];
      freqs.forEach((f, idx) => {
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f + (idx % 2 === 0 ? 0.3 : -0.3), ctx.currentTime);
        oscGain.gain.setValueAtTime(0.08 / (idx + 1), ctx.currentTime);

        osc.connect(oscGain);
        oscGain.connect(masterGain);
        osc.start();
        activeSources.push(osc);
      });
    } else if (type === 'waves') {
      // Ocean breath waves (cyclical volume swells)
      const bufferSize = 2 * ctx.sampleRate;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * 0.05;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;
      noise.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(500, ctx.currentTime);

      const lfo = ctx.createOscillator();
      lfo.frequency.setValueAtTime(0.12, ctx.currentTime); // ~8 sec ocean wave period
      const lfoGain = ctx.createGain();
      lfoGain.gain.setValueAtTime(250, ctx.currentTime);

      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);

      noise.connect(filter);
      filter.connect(masterGain);

      noise.start();
      lfo.start();
      activeSources.push(noise, lfo);
    }

    const stopFn = () => {
      try {
        const t = ctx.currentTime;
        masterGain.gain.setValueAtTime(masterGain.gain.value, t);
        masterGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
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
        }, 850);
      } catch {
        // ignore
      }
    };

    currentAmbientNodes = {
      stop: stopFn,
      gainNode: masterGain,
    };

    return stopFn;
  } catch (err) {
    console.debug('Ambient generator note:', err);
    return () => {};
  }
}

export function stopAmbientSound() {
  if (currentAmbientNodes) {
    try {
      currentAmbientNodes.stop();
    } catch {
      // ignore
    }
    currentAmbientNodes = null;
  }
}
