/**
 * Procedural Web Audio API Soundscape & Interactive Audio Engine
 * Zero external audio files required - works 100% offline, lightweight and cinematic.
 */

class AudioEngine {
  private ctx: AudioContext | null = null;
  private currentMode: 'rain' | 'fireplace' | 'chimes' | 'pen' | 'off' = 'off';
  private masterGain: GainNode | null = null;
  private ambientSourceNodes: (AudioNode | number)[] = [];
  private volume: number = 0.4;
  private isInitialized = false;

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    this.isInitialized = true;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
  }

  public stopAmbient() {
    this.ambientSourceNodes.forEach((node) => {
      if (typeof node === 'number') {
        window.clearInterval(node);
      } else if ('stop' in node && typeof (node as AudioScheduledSourceNode).stop === 'function') {
        try {
          (node as AudioScheduledSourceNode).stop();
        } catch {
          // ignore already stopped
        }
      } else if ('disconnect' in node) {
        node.disconnect();
      }
    });
    this.ambientSourceNodes = [];
    this.currentMode = 'off';
  }

  public playAmbient(mode: 'rain' | 'fireplace' | 'chimes' | 'pen' | 'off') {
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    this.stopAmbient();
    this.currentMode = mode;

    if (mode === 'off') return;

    switch (mode) {
      case 'rain':
        this.startRainSound();
        break;
      case 'fireplace':
        this.startFireplaceSound();
        break;
      case 'chimes':
        this.startCelestialChimes();
        break;
      case 'pen':
        // Pen is triggered per keystroke, keep ambient silent or slight paper rustle
        this.startPaperRustle();
        break;
    }
  }

  // Soft Continuous Rain Generator (Pink noise + Low-pass filter)
  private startRainSound() {
    if (!this.ctx || !this.masterGain) return;

    const bufferSize = 2 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
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
      output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
      output[i] *= 0.11;
      b6 = white * 0.115926;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(850, this.ctx.currentTime);

    const rainGain = this.ctx.createGain();
    rainGain.gain.setValueAtTime(0.45, this.ctx.currentTime);

    whiteNoise.connect(filter);
    filter.connect(rainGain);
    rainGain.connect(this.masterGain);

    whiteNoise.start();
    this.ambientSourceNodes.push(whiteNoise, filter, rainGain);
  }

  // Cozy Crackling Fireplace
  private startFireplaceSound() {
    if (!this.ctx || !this.masterGain) return;

    // Base gentle roar
    const bufferSize = 2 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * 0.08;
    }
    const roar = this.ctx.createBufferSource();
    roar.buffer = noiseBuffer;
    roar.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(280, this.ctx.currentTime);
    filter.Q.setValueAtTime(1.5, this.ctx.currentTime);

    roar.connect(filter);
    filter.connect(this.masterGain);
    roar.start();
    this.ambientSourceNodes.push(roar, filter);

    // Random crackle pops
    const crackleInterval = window.setInterval(() => {
      if (!this.ctx || !this.masterGain || this.currentMode !== 'fireplace') return;
      if (Math.random() > 0.4) {
        this.playPop();
      }
    }, 280);

    this.ambientSourceNodes.push(crackleInterval);
  }

  private playPop() {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(120 + Math.random() * 300, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.06);

    gain.gain.setValueAtTime(0.25 * Math.random(), this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.06);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.07);
  }

  // Ambient Celestial Wind & Gentle Chimes
  private startCelestialChimes() {
    if (!this.ctx || !this.masterGain) return;

    // Pentatonic scale frequencies
    const frequencies = [329.63, 392.00, 440.00, 523.25, 659.25, 783.99, 880.00];

    const chimeInterval = window.setInterval(() => {
      if (!this.ctx || !this.masterGain || this.currentMode !== 'chimes') return;
      if (Math.random() > 0.45) {
        const freq = frequencies[Math.floor(Math.random() * frequencies.length)];
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

        gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 3.2);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start();
        osc.stop(this.ctx.currentTime + 3.3);
      }
    }, 1800);

    this.ambientSourceNodes.push(chimeInterval);
  }

  private startPaperRustle() {
    // Subtle background ambient
  }

  // Fountain Pen Scratch Sound Effect
  public playPenScratch() {
    if (this.currentMode === 'off') return;
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1800 + Math.random() * 400, this.ctx.currentTime);

    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1400, this.ctx.currentTime);

    gain.gain.setValueAtTime(0.025, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.045);
  }

  // Soft page turn acoustic shimmer
  public playPageTurn() {
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    const bufferSize = this.ctx.sampleRate * 0.25;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, this.ctx.currentTime);
    filter.Q.setValueAtTime(2.0, this.ctx.currentTime);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.24);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start();
    noise.stop(this.ctx.currentTime + 0.25);
  }

  // Wax seal stamp / lock chime
  public playLockSound() {
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, this.ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(440.00, this.ctx.currentTime + 0.18); // A4

    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.36);
  }

  // Voice note warm acoustic playback simulation
  public playVoiceNotePreview(durationSeconds: number = 5, onEnded?: () => void): () => void {
    this.initContext();
    if (!this.ctx || !this.masterGain) {
      if (onEnded) setTimeout(onEnded, durationSeconds * 1000);
      return () => {};
    }

    const notes = [261.63, 329.63, 392.00, 523.25, 440.00, 349.23];
    let isStopped = false;
    let step = 0;

    const interval = window.setInterval(() => {
      if (isStopped || !this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(notes[step % notes.length], this.ctx.currentTime);
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.6);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.65);
      step++;
    }, 500);

    const timeout = window.setTimeout(() => {
      isStopped = true;
      clearInterval(interval);
      if (onEnded) onEnded();
    }, durationSeconds * 1000);

    return () => {
      isStopped = true;
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }
}

export const audioEngine = new AudioEngine();
