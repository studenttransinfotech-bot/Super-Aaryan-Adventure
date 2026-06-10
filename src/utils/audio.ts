// Procedural Retro Audio Synthesizer using Web Audio API

class RetroAudioEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private gameVolume: number = 0.08; // default comfortable safe volume level (0 to 1) to protect ears!
  private currentBgmTheme: string | null = null;
  private bgmIntervalId: any = null;
  private currentOscillators: { osc: OscillatorNode; gain: GainNode }[] = [];
  private step: number = 0;

  constructor() {
    // Audio engine starts dormant until first user gesture
  }

  private initCtx() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setVolume(vol: number) {
    this.gameVolume = Math.max(0, Math.min(1, vol));
  }

  public getVolume(): number {
    return this.gameVolume;
  }

  public setMute(muted: boolean) {
    this.isMuted = muted;
    if (muted) {
      this.stopBgm();
    } else {
      this.initCtx();
      if (this.currentBgmTheme) {
        this.playBgm(this.currentBgmTheme);
      }
    }
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  // Create clean 8-bit synthetic bleeps and bloops
  private playTone(
    freq: number,
    type: OscillatorType,
    duration: number,
    volume: number,
    pitchSweepPercent: number = 0,
    slideTime: number = 0
  ) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    // Map harsh waveforms to much softer, ear-friendly alternatives and lower volumes
    let actualType = type;
    let volFactor = 0.015;

    if (type === 'square') {
      actualType = 'triangle';
      volFactor = 0.008; // extremely soft, warm, safe volume
    } else if (type === 'sawtooth') {
      actualType = 'triangle';
      volFactor = 0.006;
    } else if (type === 'triangle') {
      actualType = 'triangle';
      volFactor = 0.012;
    } else if (type === 'sine') {
      actualType = 'sine';
      volFactor = 0.010;
    }

    osc.type = actualType;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

    if (pitchSweepPercent !== 0 && slideTime > 0) {
      const targetFreq = freq * (1 + pitchSweepPercent);
      osc.frequency.exponentialRampToValueAtTime(targetFreq, this.ctx.currentTime + slideTime);
    }

    gain.gain.setValueAtTime(volume * volFactor * this.gameVolume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  // Create warm physical-modeled plucked acoustic guitar note
  private playGuitarTone(
    freq: number,
    duration: number,
    volume: number,
    isBass: boolean = false
  ) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    if (isBass) {
      // Warm, deep acoustic bass guitar/ukulele response
      const oscBody = this.ctx.createOscillator();
      const gainBody = this.ctx.createGain();
      oscBody.type = 'triangle';
      oscBody.frequency.setValueAtTime(freq, now);

      gainBody.gain.setValueAtTime(0, now);
      gainBody.gain.linearRampToValueAtTime(volume * 0.09 * this.gameVolume, now + 0.008);
      gainBody.gain.exponentialRampToValueAtTime(0.0001, now + duration * 1.5); // long warm bass decay

      oscBody.connect(gainBody);
      gainBody.connect(this.ctx.destination);
      oscBody.start(now);
      oscBody.stop(now + duration * 1.5);

      // Thicker string winding vibration (octave higher harmonic)
      const oscWinding = this.ctx.createOscillator();
      const gainWinding = this.ctx.createGain();
      oscWinding.type = 'sine';
      oscWinding.frequency.setValueAtTime(freq * 2, now);

      gainWinding.gain.setValueAtTime(volume * 0.03 * this.gameVolume, now);
      gainWinding.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

      oscWinding.connect(gainWinding);
      gainWinding.connect(this.ctx.destination);
      oscWinding.start(now);
      oscWinding.stop(now + 0.15);
    } else {
      // Treble Nylon / Steel String Guitar Pluck Synthesizer
      // 1. Primary String / Body Resonance (Triangle wave)
      const oscBody = this.ctx.createOscillator();
      const gainBody = this.ctx.createGain();
      oscBody.type = 'triangle';
      oscBody.frequency.setValueAtTime(freq, now);

      // Ultra subtle guitar string bend / vibrato over string life
      oscBody.frequency.setValueAtTime(freq, now);
      oscBody.frequency.linearRampToValueAtTime(freq * 0.997, now + duration);

      // Envelope has fast attack (0.005s) and slow exponential ring-out decay
      gainBody.gain.setValueAtTime(0, now);
      gainBody.gain.linearRampToValueAtTime(volume * 0.08 * this.gameVolume, now + 0.005);
      gainBody.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      oscBody.connect(gainBody);
      gainBody.connect(this.ctx.destination);
      oscBody.start(now);
      oscBody.stop(now + duration);

      // 2. High-Chimey Sweet Wooden Harmonic (Sine wave, 3rd harmonic)
      const oscHarmonic = this.ctx.createOscillator();
      const gainHarmonic = this.ctx.createGain();
      oscHarmonic.type = 'sine';
      oscHarmonic.frequency.setValueAtTime(freq * 3.0, now);

      gainHarmonic.gain.setValueAtTime(0, now);
      gainHarmonic.gain.linearRampToValueAtTime(volume * 0.03 * this.gameVolume, now + 0.012);
      gainHarmonic.gain.exponentialRampToValueAtTime(0.0001, now + duration * 0.6);

      oscHarmonic.connect(gainHarmonic);
      gainHarmonic.connect(this.ctx.destination);
      oscHarmonic.start(now);
      oscHarmonic.stop(now + duration);

      // 3. String Pick / Pluck Friction (Sawtooth wave with near-instantaneous decay)
      const oscPluck = this.ctx.createOscillator();
      const gainPluck = this.ctx.createGain();
      oscPluck.type = 'sawtooth';
      oscPluck.frequency.setValueAtTime(freq * 2.0, now); // octave higher fret impact

      gainPluck.gain.setValueAtTime(volume * 0.05 * this.gameVolume, now);
      gainPluck.gain.exponentialRampToValueAtTime(0.0001, now + 0.025); // click decay

      oscPluck.connect(gainPluck);
      gainPluck.connect(this.ctx.destination);
      oscPluck.start(now);
      oscPluck.stop(now + 0.035);
    }
  }

  // Coin Sound Icon
  public playCoin() {
    this.playTone(987, 'square', 0.08, 0.4);
    setTimeout(() => {
      this.playTone(1318, 'square', 0.25, 0.4);
    }, 80);
  }

  // Jump Sound Icon
  public playJump() {
    this.playTone(150, 'triangle', 0.18, 0.5, 3.0, 0.15);
  }

  // Dash Sound Icon (rapid electronic sweeping zip/whoosh)
  public playDash() {
    this.playTone(520, 'triangle', 0.14, 0.55, -0.65, 0.11);
    setTimeout(() => {
      this.playTone(390, 'sine', 0.08, 0.35, -0.3, 0.07);
    }, 25);
  }

  // Enemy Stomp Sound Icon
  public playStomp() {
    this.playTone(280, 'triangle', 0.15, 0.6, -0.6, 0.12);
  }

  // Checkpoint flag sound
  public playCheckpoint() {
    const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // Beautiful C Major Arpeggio
    notes.forEach((freq, index) => {
      setTimeout(() => {
        this.playTone(freq, 'square', 0.12, 0.3);
      }, index * 80);
    });
  }

  // Pleasant soft retro death chime arpeggio (no muting of the background music)
  public playDeath() {
    // Keep BGM playing! No stopBgm()
    const notes = [1046.50, 783.99, 659.25, 523.25]; // pleasant arpeggio (C6 -> G5 -> E5 -> C5)
    notes.forEach((freq, index) => {
      setTimeout(() => {
        this.playTone(freq, 'sine', 0.15, 0.22, -0.05, 0.05); // sweet soft sine tone of short duration
      }, index * 90);
    });
  }

  // Victory Fanfare
  public playLevelClear() {
    this.stopBgm();
    // Iconic 8-bit game triumph ditty: C5 -> C5 -> C5 -> C5 -> Ab4 -> Bb4 -> C-chord
    const melody = [
      { f: 523.25, d: 0.08, t: 0, v: 0.4 },
      { f: 523.25, d: 0.08, t: 90, v: 0.4 },
      { f: 523.25, d: 0.08, t: 180, v: 0.4 },
      { f: 523.25, d: 0.25, t: 270, v: 0.5 },
      { f: 415.30, d: 0.22, t: 420, v: 0.4 },
      { f: 466.16, d: 0.22, t: 560, v: 0.4 },
      { f: 523.25, d: 0.55, t: 700, v: 0.6 },
    ];
    const harmonies = [
      { f: 659.25, d: 0.55, t: 700, v: 0.35 }, // E5
      { f: 783.99, d: 0.55, t: 700, v: 0.35 }, // G5
    ];
    
    melody.concat(harmonies).forEach((note) => {
      setTimeout(() => {
        this.playTone(note.f, 'square', note.d, note.v);
      }, note.t);
    });
  }

  // Play Procedural BGM Theme Loop using a step sequencer to save performance
  public playBgm(theme: string) {
    this.currentBgmTheme = theme;
    if (this.isMuted) return;

    this.initCtx();
    this.stopBgm();

    this.step = 0;
    let tempo = 150; // BPM

    // Note scales for procedural synthesis
    let bassMelody: number[] = [];
    let trebleMelody: number[] = [];

    if (theme === 'title') {
      tempo = 136;
      // High-energy syncopated tropical Calypso/Ska beach theme (alike Mario Wonder)
      // Chords: C Major -> F Major -> G Major -> C Major -> Am -> Dm -> G -> C -> F -> G -> Em -> Am -> Bb -> G -> C -> C (bouncy, sunny, syncopated!)
      bassMelody = [
        130.81, 0, 196.00, 164.81, // C Major step
        174.61, 0, 261.63, 220.00, // F Major step
        196.00, 0, 293.66, 246.94, // G Major step
        130.81, 164.81, 196.00, 261.63, // Turnaround C Major

        110.00, 0, 165.00, 220.00, // Am step
        146.83, 0, 220.00, 293.66, // Dm step
        196.00, 0, 293.66, 392.00, // G step
        130.81, 164.81, 196.00, 261.63, // C Major step

        174.61, 0, 261.63, 174.61, // F step
        196.00, 0, 293.66, 196.00, // G step
        164.81, 0, 246.94, 164.81, // Em step
        220.00, 0, 329.63, 220.00, // Am step

        116.54, 0, 174.61, 116.54, // Bb step
        196.00, 0, 293.66, 196.00, // G step
        130.81, 196.00, 261.63, 329.63, // C ascending
        392.00, 523.25, 261.63, 130.81
      ];
      trebleMelody = [
        523.25, 0, 659.25, 783.99, // Bright syncopated jumps
        698.46, 0, 880.00, 1046.50, 
        783.99, 0, 987.77, 1174.66, 
        1046.50, 880.00, 783.99, 1318.51, // High-pitched sweet beach steelpan chime

        440.00, 0, 523.25, 659.25, // Am arpeggiated highlights
        587.33, 0, 698.46, 880.00, // Dm
        783.99, 0, 987.77, 1174.66, // G
        1046.50, 0, 1318.51, 1567.98, // C high ring out

        698.46, 0, 880.00, 698.46, // F heroic lines
        783.99, 0, 987.77, 783.99, // G
        659.25, 0, 783.99, 659.25, // Em
        880.00, 1046.50, 1318.51, 1567.98, // Am climax run

        932.33, 0, 698.46, 932.33, // Bb calypso cascade
        783.99, 0, 987.77, 1174.66, // G
        1046.50, 1318.51, 1567.98, 1318.51, // Full dual octave resolution
        1046.50, 783.99, 523.25, 0
      ];
    } else if (theme === 'thankyou') {
      tempo = 80;
      // Whisper-quiet, ultra-soft, lovely and relaxing cozy gratitude melody
      bassMelody = [
        130.81, 0, 164.81, 0, 196.00, 0, 164.81, 0,
        174.61, 0, 220.00, 0, 261.63, 0, 220.00, 0,
        164.81, 0, 196.00, 0, 246.94, 0, 196.00, 0,
        174.61, 0, 196.00, 0, 130.81, 0, 0, 0
      ];
      trebleMelody = [
        261.63, 0, 329.63, 0, 392.00, 0, 329.63, 0,
        349.23, 0, 440.00, 0, 523.25, 0, 440.00, 0,
        329.63, 0, 392.00, 0, 493.88, 0, 392.00, 0,
        349.23, 0, 392.00, 0, 261.63, 0, 0, 0
      ];
    } else if (theme === 'underwater') {
      tempo = 120;
      // Precise transcription of the happy, bouncy Delfino Plaza accordion motif & alternating ragtime bassline
      bassMelody = [
        130.81, 0, 196.00, 0, 130.81, 0, 196.00, 164.81,
        174.61, 0, 261.63, 0, 196.00, 0, 246.94, 0,
        174.61, 0, 261.63, 0, 174.61, 0, 261.63, 174.61,
        196.00, 0, 293.66, 0, 130.81, 0, 196.00, 0
      ];
      trebleMelody = [
        659.25, 0, 698.46, 783.99, 0, 1046.50, 987.77, 880.00,
        783.99, 0, 659.25, 523.25, 587.33, 0, 587.33, 0,
        698.46, 0, 783.99, 880.00, 0, 1174.66, 1046.50, 987.77,
        880.00, 0, 698.46, 587.33, 659.25, 0, 523.25, 0
      ];
    } else if (theme === 'beach') {
      tempo = 135;
      // Reggae/Ska styled warm melodies
      bassMelody = [
        110.00, 137.50, 165.00, 137.50, 146.83, 183.54, 220.00, 183.54,
        130.81, 164.81, 196.00, 164.81, 146.83, 183.54, 220.00, 183.54,
        146.83, 183.54, 220.00, 183.54, 164.81, 207.65, 246.94, 207.65,
        110.00, 137.50, 165.00, 196.00, 220.00, 0, 220.00, 0
      ];
      trebleMelody = [
        440.00, 554.37, 659.25, 0, 587.33, 739.99, 880.00, 0,
        523.25, 659.25, 783.99, 0, 587.33, 739.99, 880.00, 0,
        587.33, 739.99, 880.00, 0, 659.25, 830.61, 987.77, 0,
        880.00, 0, 783.99, 0, 659.25, 554.37, 440.00, 0
      ];
    } else if (theme === 'river') {
      tempo = 110; // Placid, flowing water speed with rain vibes
      // Mystical, flowing river tones
      bassMelody = [
        110.00, 130.81, 146.83, 164.81, 110.00, 130.81, 146.83, 0,
         98.00, 116.54, 130.81, 146.83,  98.00, 116.54, 130.81, 0,
         87.31, 110.00, 130.81, 146.83,  87.31, 110.00, 130.81, 0,
        110.00, 130.81, 146.83, 164.81, 196.00, 0, 110.00, 0
      ];
      trebleMelody = [
        440.00, 0, 523.25, 587.33, 659.25, 587.33, 523.25, 0,
        392.00, 0, 466.16, 523.25, 587.33, 523.25, 466.16, 0,
        349.23, 0, 440.00, 523.25, 587.33, 523.25, 440.00, 0,
        659.25, 587.33, 523.25, 440.00, 392.00, 0, 440.00, 0
      ];
    } else if (theme === 'jungle') {
      tempo = 145;
      // Fast rhythmic, mysterious jungle scales
      bassMelody = [
        87.31, 110.00, 130.81, 110.00, 98.00, 123.47, 146.83, 123.47,
        87.31, 110.00, 130.81, 110.00, 110.00, 137.50, 165.00, 137.50,
        98.00, 123.47, 146.83, 123.47, 110.00, 137.50, 165.00, 137.50,
        73.42, 110.00, 146.83, 110.00, 73.42, 0, 73.42, 0
      ];
      trebleMelody = [
        349.23, 0, 440.00, 0, 392.00, 0, 493.88, 0,
        349.23, 0, 440.00, 440.00, 0, 554.37, 659.25, 0,
        392.00, 0, 493.88, 493.88, 0, 554.37, 659.25, 0,
        587.33, 523.25, 493.88, 440.00, 293.66, 0, 293.66, 0
      ];
    } else if (theme === 'desert') {
      tempo = 120;
      // Middle Eastern Arabian/Phrygian desert scales
      bassMelody = [
        146.83, 0, 146.83, 146.83, 155.56, 0, 155.56, 155.56, 
        185.00, 0, 185.00, 155.56, 146.83, 0, 146.83, 0,
        146.83, 0, 146.83, 146.83, 155.56, 0, 155.56, 155.56, 
        220.00, 0, 196.00, 0, 146.83, 0, 146.83, 0
      ];
      trebleMelody = [
        293.66, 311.13, 369.99, 415.30, 440.00, 415.30, 369.99, 311.13, 
        293.66, 0, 311.13, 0, 293.66, 0, 0, 0,
        293.66, 311.13, 369.99, 415.30, 440.00, 415.30, 369.99, 311.13,
        493.88, 440.00, 369.99, 311.13, 293.66, 0, 293.66, 0
      ];
    } else if (theme === 'island') {
      tempo = 125; // Happy energetic tropical breeze tempo
      // Breezy C-Major / F-Major / G-Major light beach paradise walking-bass
      bassMelody = [
        130.81, 164.81, 196.00, 164.81, 130.81, 164.81, 196.00, 0,
        174.61, 220.00, 261.63, 220.00, 174.61, 220.00, 261.63, 0,
        196.00, 246.94, 293.66, 246.94, 196.00, 246.94, 293.66, 0,
        261.63, 220.00, 196.00, 164.81, 130.81, 0, 130.81, 0
      ];
      // Sparkling high wind-chime and bell pentatonic bright melody
      trebleMelody = [
        523.25, 0, 659.25, 0, 783.99, 659.25, 523.25, 0,
        587.33, 0, 698.46, 0, 880.00, 698.46, 587.33, 0,
        783.99, 0, 987.77, 0, 1174.66, 987.77, 783.99, 0,
        1046.50, 880.00, 783.99, 659.25, 523.25, 0, 523.25, 0
      ];
    } else if (theme === 'cave') {
      tempo = 95;
      // Echoey, quiet, atmospheric caves
      bassMelody = [
        110.00, 0, 130.81, 0, 146.83, 0, 130.81, 0, 
        123.47, 0, 110.00, 0, 98.00, 0, 110.00, 0,
        110.00, 0, 130.81, 0, 146.83, 0, 130.81, 0,
        164.81, 0, 146.83, 0, 110.00, 0, 0, 0
      ];
      trebleMelody = [
        440.00, 0, 523.25, 0, 587.33, 0, 659.25, 0, 
        523.25, 0, 493.88, 0, 392.00, 0, 440.00, 0,
        440.00, 0, 523.25, 0, 587.33, 0, 659.25, 0,
        783.99, 0, 587.33, 0, 440.00, 0, 0, 0
      ];
    } else if (theme === 'underground') {
      tempo = 88;
      // Subterranean plumbing/excavation rhythm
      bassMelody = [
        82.41, 0, 98.00, 0, 110.00, 110.00, 98.00, 0,
        82.41, 0, 98.00, 0, 110.00, 0, 123.47, 0,
        82.41, 0, 98.00, 0, 110.00, 110.00, 98.00, 0,
        130.81, 123.47, 110.00, 98.00, 82.41, 0, 82.41, 0
      ];
      trebleMelody = [
        329.63, 0, 392.00, 0, 440.00, 440.00, 392.00, 0,
        329.63, 0, 392.00, 0, 440.00, 0, 493.88, 0,
        329.63, 0, 392.00, 0, 440.00, 440.00, 392.00, 0,
        523.25, 493.88, 440.00, 392.00, 329.63, 0, 329.63, 0
      ];
    } else if (theme === 'prison') {
      tempo = 105;
      // Tense prison corridor clanks (very nervous, warning tones)
      bassMelody = [
        110.00, 110.00, 0, 116.54, 116.54, 0, 110.00, 0,
        123.47, 123.47, 0, 130.81, 130.81, 0, 110.00, 0,
        110.00, 110.00, 0, 116.54, 116.54, 0, 110.00, 0,
        146.83, 0, 138.59, 0, 110.00, 0, 110.00, 0
      ];
      trebleMelody = [
        220.00, 0, 233.08, 0, 220.00, 0, 196.00, 0,
        246.94, 0, 261.63, 0, 246.94, 0, 220.00, 0,
        220.00, 0, 233.08, 0, 220.00, 0, 196.00, 0,
        293.66, 0, 277.18, 0, 220.00, 0, 220.00, 0
      ];
    } else if (theme === 'city') {
      tempo = 135;
      // Upbeat, jazzy, brassy/bouncing city sidewalk strolling walking-bass
      bassMelody = [
        130.81, 164.81, 196.00, 220.00, 146.83, 174.61, 220.00, 246.94,
        130.81, 164.81, 196.00, 220.00, 196.00, 164.81, 130.81, 0,
        130.81, 164.81, 196.00, 220.00, 146.83, 174.61, 220.00, 246.94,
        220.00, 196.00, 174.61, 146.83, 130.81, 0, 130.81, 0
      ];
      trebleMelody = [
        523.25, 0, 523.25, 659.25, 587.33, 0, 587.33, 783.99,
        659.25, 0, 880.00, 0, 783.99, 659.25, 523.25, 0,
        523.25, 0, 523.25, 659.25, 587.33, 0, 587.33, 783.99,
        987.77, 880.00, 783.99, 659.25, 523.25, 0, 523.25, 0
      ];
    } else if (theme === 'snowy') {
      tempo = 115;
      // Sparkly ice and snowy glacier bells
      bassMelody = [
        130.81, 0, 164.81, 0, 174.61, 0, 196.00, 0, 
        220.00, 0, 174.61, 0, 130.81, 0, 196.00, 0,
        130.81, 0, 164.81, 0, 174.61, 0, 196.00, 0,
        261.63, 0, 220.00, 0, 196.00, 0, 130.81, 0
      ];
      trebleMelody = [
        783.99, 880.00, 1046.50, 1174.66, 1318.51, 1174.66, 1046.50, 880.00, 
        987.77, 783.99, 659.25, 783.99, 523.25, 0, 0, 0,
        783.99, 880.00, 1046.50, 1174.66, 1318.51, 1174.66, 1046.50, 880.00,
        1567.98, 1318.51, 1174.66, 1046.50, 783.99, 0, 783.99, 0
      ];
    } else if (theme === 'sky') {
      tempo = 125;
      // Breezy floating clouds and sky-high winds
      bassMelody = [
        146.83, 0, 196.00, 0, 220.00, 0, 196.00, 0,
        146.83, 0, 196.00, 0, 261.63, 0, 220.00, 0,
        146.83, 0, 196.00, 0, 220.00, 0, 196.00, 0,
        293.66, 0, 261.63, 0, 220.00, 0, 146.83, 0
      ];
      trebleMelody = [
        587.33, 0, 783.99, 0, 880.00, 783.99, 587.33, 0,
        587.33, 0, 783.99, 0, 1046.50, 880.00, 783.99, 0,
        587.33, 0, 783.99, 0, 880.00, 783.99, 587.33, 0,
        1174.66, 1046.50, 880.00, 783.99, 587.33, 0, 587.33, 0
      ];
    } else if (theme === 'magma') {
      tempo = 160;
      // Intimidating rhythmic lava marches
      bassMelody = [
        73.42, 0, 73.42, 87.31, 98.00, 0, 98.00, 87.31, 
        110.00, 0, 110.00, 98.00, 87.31, 0, 73.42, 0,
        73.42, 0, 73.42, 87.31, 98.00, 0, 98.00, 87.31,
        116.54, 0, 110.00, 0, 73.42, 0, 73.42, 0
      ];
      trebleMelody = [
        293.66, 0, 293.66, 349.23, 392.00, 0, 392.00, 349.23, 
        440.00, 0, 440.00, 392.00, 349.23, 0, 293.66, 0,
        293.66, 0, 293.66, 349.23, 392.00, 0, 392.00, 349.23,
        466.16, 0, 440.00, 0, 293.66, 0, 293.66, 0
      ];
    } else if (theme === 'castle') {
      tempo = 130;
      // Heavy sinister castle organ march (eerie minor scales)
      bassMelody = [
        110.00, 0, 110.00, 0, 103.83, 0, 103.83, 0,
        98.00, 0, 98.00, 0, 87.31, 0, 110.00, 0,
        110.00, 0, 110.00, 0, 130.81, 0, 130.81, 0,
        146.83, 0, 138.59, 130.81, 110.00, 0, 110.00, 0
      ];
      trebleMelody = [
        440.00, 0, 440.00, 523.25, 415.30, 0, 415.30, 493.88,
        392.00, 0, 392.00, 466.16, 349.23, 440.00, 440.00, 0,
        440.00, 0, 440.00, 523.25, 523.25, 0, 659.25, 0,
        587.33, 0, 554.37, 523.25, 440.00, 0, 440.00, 0
      ];
    } else if (theme === 'candy') {
      tempo = 155;
      // Bouncy, sweet high-register cute theme
      bassMelody = [
        130.81, 130.81, 164.81, 164.81, 196.00, 196.00, 164.81, 164.81, 
        146.83, 146.83, 174.61, 174.61, 220.00, 220.00, 196.00, 246.94,
        130.81, 130.81, 164.81, 164.81, 196.00, 196.00, 164.81, 164.81,
        261.63, 0, 220.00, 0, 196.00, 164.81, 130.81, 0
      ];
      trebleMelody = [
        1046.50, 1046.50, 1318.51, 1318.51, 1567.98, 1567.98, 1318.51, 1318.51, 
        1174.66, 1174.66, 1396.91, 1396.91, 1760.00, 1760.00, 1567.98, 1975.53,
        1046.50, 1046.50, 1318.51, 1318.51, 1567.98, 1567.98, 1318.51, 1318.51,
        2093.00, 0, 1760.00, 0, 1567.98, 1318.51, 1046.50, 0
      ];
    } else if (theme === 'mushroom') {
      tempo = 128;
      // Whimsical, mysterious, squishy fungal forest groove with spooky nature roots
      bassMelody = [
        146.83, 0, 174.61, 0, 220.00, 220.00, 174.61, 0,
        130.81, 0, 164.81, 0, 196.00, 196.00, 164.81, 0,
        146.83, 0, 174.61, 0, 220.00, 220.00, 174.61, 0,
        220.00, 0, 246.94, 0, 261.63, 196.00, 146.83, 0
      ];
      trebleMelody = [
        587.33, 0, 698.46, 0, 880.00, 880.00, 698.46, 0,
        523.25, 0, 659.25, 0, 783.99, 783.99, 659.25, 0,
        587.33, 0, 698.46, 0, 880.00, 880.00, 698.46, 0,
        880.00, 0, 987.77, 0, 1046.50, 783.99, 587.33, 0
      ];
    } else if (theme === 'factory') {
      tempo = 140;
      // Mechanical industrial machine workshop beat
      bassMelody = [
        110.00, 110.00, 0, 110.00, 123.47, 123.47, 0, 123.47, 
        130.81, 130.81, 0, 130.81, 146.83, 146.83, 110.00, 0,
        110.00, 110.00, 0, 110.00, 123.47, 123.47, 0, 123.47,
        165.00, 0, 146.83, 0, 110.00, 0, 110.00, 0
      ];
      trebleMelody = [
        440.00, 440.00, 0, 440.00, 493.88, 493.88, 0, 493.88, 
        523.25, 523.25, 0, 523.25, 587.33, 587.33, 440.00, 0,
        440.00, 440.00, 0, 440.00, 493.88, 493.88, 0, 493.88,
        659.25, 0, 587.33, 0, 440.00, 0, 440.00, 0
      ];
    } else if (theme === 'lab') {
      tempo = 120;
      // High-tech bubbly sci-fi research lab loop (digital beeps)
      bassMelody = [
        146.83, 0, 146.83, 0, 196.00, 0, 196.00, 0,
        220.00, 0, 165.00, 0, 146.83, 146.83, 0, 0,
        146.83, 0, 146.83, 0, 174.61, 0, 174.61, 0,
        196.00, 220.00, 196.00, 174.61, 146.83, 0, 146.83, 0
      ];
      trebleMelody = [
        587.33, 880.00, 0, 880.00, 783.99, 987.77, 0, 987.77,
        880.00, 1174.66, 659.25, 987.77, 587.33, 587.33, 0, 0,
        587.33, 880.00, 0, 880.00, 698.46, 880.00, 0, 880.00,
        783.99, 880.00, 783.99, 698.46, 587.33, 0, 587.33, 0
      ];
    } else if (theme === 'village') {
      tempo = 110;
      // Cozy, warm stroll through village alleys
      bassMelody = [
        130.81, 0, 164.81, 0, 196.00, 0, 164.81, 0, 
        146.83, 0, 174.61, 0, 220.00, 0, 196.00, 0,
        130.81, 0, 164.81, 0, 196.00, 0, 164.81, 0,
        174.61, 196.00, 220.00, 246.94, 261.63, 0, 261.63, 0
      ];
      trebleMelody = [
        523.25, 523.25, 659.25, 0, 783.99, 783.99, 659.25, 0, 
        587.33, 587.33, 698.46, 0, 880.00, 880.00, 783.99, 0,
        523.25, 523.25, 659.25, 0, 783.99, 783.99, 659.25, 0,
        349.23, 392.00, 440.00, 493.88, 523.25, 0, 523.25, 0
      ];
    } else if (theme === 'farm') {
      tempo = 122;
      // Rustic country-living barn dance swing melody
      bassMelody = [
        130.81, 196.00, 130.81, 196.00, 130.81, 196.00, 130.81, 196.00,
        146.83, 220.00, 146.83, 220.00, 146.83, 220.00, 196.00, 0,
        130.81, 196.00, 130.81, 196.00, 130.81, 196.00, 130.81, 196.00,
        174.61, 220.00, 196.00, 246.94, 130.81, 0, 130.81, 0
      ];
      trebleMelody = [
        523.25, 587.33, 659.25, 0, 783.99, 659.25, 523.25, 0,
        587.33, 659.25, 698.46, 0, 880.00, 698.46, 587.33, 0,
        523.25, 587.33, 659.25, 0, 783.99, 659.25, 523.25, 0,
        698.46, 783.99, 880.00, 987.77, 1046.50, 0, 1046.50, 0
      ];
    } else if (theme === 'zoo') {
      tempo = 132;
      // Comedic hopping safari cartoon groove
      bassMelody = [
        98.00, 0, 116.54, 130.81, 0, 146.83, 0, 110.00,
        130.81, 0, 146.83, 164.81, 0, 196.00, 164.81, 0,
        98.00, 0, 116.54, 130.81, 0, 146.83, 0, 110.00,
        146.83, 0, 196.00, 0, 130.81, 0, 130.81, 0
      ];
      trebleMelody = [
        392.00, 0, 466.16, 523.25, 0, 587.33, 0, 440.00,
        523.25, 0, 587.33, 659.25, 0, 783.99, 659.25, 0,
        392.00, 0, 466.16, 523.25, 0, 587.33, 0, 440.00,
        587.33, 0, 783.99, 0, 523.25, 0, 523.25, 0
      ];
    } else if (theme === 'spooky') {
      tempo = 90;
      // Ghost house classical harpsichord arpeggio
      bassMelody = [
        110.00, 0, 110.00, 0, 116.54, 0, 116.54, 0,
        123.47, 0, 123.47, 0, 110.00, 0, 110.00, 0,
        110.00, 0, 110.00, 0, 116.54, 0, 116.54, 0,
        146.83, 0, 164.81, 0, 110.00, 0, 0, 0
      ];
      trebleMelody = [
        440.00, 523.25, 659.25, 523.25, 466.16, 554.37, 698.46, 554.37,
        493.88, 587.33, 739.99, 587.33, 440.00, 523.25, 659.25, 523.25,
        440.00, 523.25, 659.25, 523.25, 466.16, 554.37, 698.46, 554.37,
        587.33, 698.46, 659.25, 783.99, 880.00, 0, 0, 0
      ];
    } else if (theme === 'pirate') {
      tempo = 145;
      // High seas bouncy ship deck minor sea shanty
      bassMelody = [
        110.00, 165.00, 110.00, 165.00, 130.81, 196.00, 130.81, 196.00, 
        146.83, 220.00, 146.83, 220.00, 110.00, 165.00, 110.00, 165.00,
        110.00, 165.00, 110.00, 165.00, 130.81, 196.00, 130.81, 196.00,
        146.83, 220.00, 196.00, 246.94, 110.00, 0, 110.00, 0
      ];
      trebleMelody = [
        440.00, 440.00, 440.00, 493.88, 523.25, 523.25, 523.25, 587.33, 
        659.25, 587.33, 523.25, 493.88, 440.00, 0, 440.00, 0,
        440.00, 440.00, 440.00, 493.88, 523.25, 523.25, 523.25, 587.33,
        587.33, 659.25, 783.99, 587.33, 440.00, 0, 440.00, 0
      ];
    } else if (theme === 'egypt') {
      tempo = 130;
      // Exotic mysterious pharaoh scale rhythms
      bassMelody = [
        146.83, 0, 146.83, 0, 155.56, 0, 155.56, 185.00, 
        146.83, 0, 146.83, 0, 110.00, 116.54, 146.83, 0,
        146.83, 0, 146.83, 0, 155.56, 0, 155.56, 220.00,
        196.00, 185.00, 155.56, 146.83, 146.83, 0, 0, 0
      ];
      trebleMelody = [
        293.66, 311.13, 369.99, 0, 440.00, 0, 466.16, 440.00, 
        369.99, 0, 311.13, 146.83, 293.66, 0, 0, 0,
        293.66, 311.13, 369.99, 0, 440.00, 0, 587.33, 554.37,
        493.88, 440.00, 369.99, 311.13, 293.66, 0, 293.66, 0
      ];
    } else if (theme === 'park') {
      tempo = 120;
      // Cheerful, sun-drenched playful bells
      bassMelody = [
        130.81, 130.81, 164.81, 164.81, 174.61, 174.61, 196.00, 196.00, 
        146.83, 146.83, 174.61, 174.61, 196.00, 196.00, 220.00, 246.94,
        130.81, 130.81, 164.81, 164.81, 174.61, 174.61, 196.00, 196.00,
        261.63, 0, 220.00, 196.00, 164.81, 146.83, 130.81, 0
      ];
      trebleMelody = [
        523.25, 0, 659.25, 783.99, 880.00, 0, 783.99, 0, 
        587.33, 0, 698.46, 880.00, 987.77, 0, 783.99, 0,
        523.25, 0, 659.25, 783.99, 880.00, 987.77, 1046.50, 0,
        1318.51, 1174.66, 1046.50, 880.00, 783.99, 659.25, 523.25, 0
      ];
    } else if (theme === 'stadium') {
      tempo = 175;
      // High-speed energetic rock synth theme
      bassMelody = [
        110.00, 110.00, 110.00, 110.00, 130.81, 130.81, 130.81, 130.81, 
        146.83, 146.83, 146.83, 146.83, 164.81, 164.81, 164.81, 164.81,
        110.00, 110.00, 110.00, 110.00, 130.81, 130.81, 130.81, 130.81,
        146.83, 0, 164.81, 0, 110.00, 110.00, 110.00, 0
      ];
      trebleMelody = [
        440.00, 440.00, 523.25, 440.00, 587.33, 587.33, 523.25, 0, 
        659.25, 659.25, 587.33, 659.25, 783.99, 880.00, 783.99, 0,
        440.00, 440.00, 523.25, 440.00, 587.33, 587.33, 523.25, 0,
        880.00, 987.77, 1046.50, 1174.66, 1318.51, 0, 1318.51, 0
      ];
    } else if (theme === 'space') {
      tempo = 110; // Slow spacey flow
      // Futuristic celestial minor arpeggio
      bassMelody = [
        110.00, 0, 165.00, 0, 196.00, 0, 165.00, 0,
        116.54, 0, 174.61, 0, 207.65, 0, 174.61, 0,
        130.81, 0, 196.00, 0, 233.08, 0, 196.00, 0,
        98.00, 0, 146.83, 0, 196.00, 165.00, 146.83, 0
      ];
      trebleMelody = [
        440.00, 523.25, 659.25, 783.99, 880.00, 0, 783.99, 0,
        466.16, 554.37, 698.46, 830.61, 932.33, 0, 830.61, 0,
        523.25, 587.33, 783.99, 932.33, 1046.50, 0, 932.33, 0,
        392.00, 493.88, 587.33, 783.99, 783.99, 698.46, 587.33, 493.88
      ];
    } else if (theme === 'superstar') {
      tempo = 210; // Mega-fast energetic upbeat star power!
      bassMelody = [
        130.81, 196.00, 130.81, 220.00, 130.81, 196.00, 164.81, 196.00,
        146.83, 220.00, 146.83, 246.94, 146.83, 220.00, 196.00, 220.00,
        164.81, 246.94, 164.81, 261.63, 164.81, 246.94, 220.00, 246.94,
        196.00, 293.66, 196.00, 329.63, 196.00, 293.66, 246.94, 293.66
      ];
      trebleMelody = [
        523.25, 523.25, 0, 523.25, 659.25, 659.25, 0, 587.33,
        587.33, 587.33, 0, 587.33, 739.99, 739.99, 0, 698.46,
        659.25, 659.25, 0, 659.25, 783.99, 783.99, 0, 880.00,
        783.99, 880.00, 987.77, 1046.50, 1174.66, 1318.51, 1567.98, 1975.53
      ];
    } else if (theme === 'boss') {
      tempo = 180; // Fast dramatic
      // Aggressive tense chromatic minor
      bassMelody = [
        73.42, 73.42, 77.78, 77.78, 82.41, 82.41, 87.31, 82.41,
        73.42, 73.42, 77.78, 77.78, 87.31, 87.31, 92.50, 87.31,
        110.00, 110.00, 116.54, 116.54, 123.47, 123.47, 130.81, 123.47,
        146.83, 138.59, 130.81, 123.47, 110.00, 98.00, 87.31, 73.42
      ];
      trebleMelody = [
        293.66, 311.13, 329.63, 349.23, 329.63, 311.13, 293.66, 0,
        293.66, 311.13, 329.63, 349.23, 349.23, 369.99, 349.23, 0,
        440.00, 466.16, 493.88, 523.25, 554.37, 523.25, 493.88, 440.00,
        587.33, 554.37, 523.25, 493.88, 440.00, 392.00, 349.23, 293.66
      ];
    } else if (theme === 'cybercity') {
      tempo = 155; // Fast synthwave tempo
      // Bass: steady rhythmic deep pumping synth 16-step bassline (A minor with retro vibes)
      bassMelody = [
        110.00, 110.00, 165.00, 110.00, 110.00, 165.00, 130.81, 165.00,
        146.83, 146.83, 220.00, 146.83, 146.83, 220.00, 196.00, 246.94,
        110.00, 110.00, 165.00, 110.00, 110.00, 165.00, 130.81, 165.00,
        146.83, 0, 196.00, 0, 220.00, 220.00, 110.00, 0
      ];
      trebleMelody = [
        440.00, 0, 523.25, 0, 587.33, 523.25, 440.00, 0,
        587.33, 0, 698.46, 0, 783.99, 698.46, 587.33, 0,
        880.00, 783.99, 880.00, 0, 1046.50, 987.77, 1046.50, 0,
        1174.66, 0, 1046.50, 0, 880.00, 0, 880.00, 0
      ];
    } else if (theme === 'steampunk') {
      tempo = 112; // Ticking gear-tock speed
      // Clockwork ticking harpsichord arpeggio
      bassMelody = [
        130.81, 164.81, 130.81, 164.81, 146.83, 174.61, 146.83, 174.61,
        123.47, 146.83, 123.47, 146.83, 110.00, 130.81, 110.00, 130.81,
        130.81, 164.81, 130.81, 164.81, 146.83, 174.61, 146.83, 174.61,
        196.00, 164.81, 146.83, 130.81, 110.00, 0, 110.00, 0
      ];
      trebleMelody = [
        523.25, 0, 659.25, 0, 587.33, 0, 698.46, 0,
        493.88, 0, 587.33, 0, 440.00, 0, 523.25, 0,
        659.25, 523.25, 659.25, 783.99, 587.33, 493.88, 587.33, 698.46,
        783.99, 698.46, 587.33, 523.25, 440.00, 0, 440.00, 0
      ];
    } else if (theme === 'cyber_atlantis') {
      tempo = 105; // Flowing aquatic bubbles
      // Liquid melody with echo delays
      bassMelody = [
        146.83, 196.00, 220.00, 0, 146.83, 220.00, 293.66, 0,
        164.81, 220.00, 246.94, 0, 164.81, 246.94, 329.63, 0,
        146.83, 196.00, 220.00, 0, 146.83, 220.00, 293.66, 0,
        116.54, 146.83, 174.61, 233.08, 196.00, 0, 196.00, 0
      ];
      trebleMelody = [
        587.33, 659.25, 783.99, 880.00, 1046.50, 0, 880.00, 0,
        659.25, 739.99, 880.00, 987.77, 1174.66, 0, 987.77, 0,
        587.33, 659.25, 783.99, 880.00, 1046.50, 0, 880.00, 0,
        466.16, 587.33, 700.00, 932.33, 783.99, 0, 783.99, 0
      ];
    } else if (theme === 'void_nebula') {
      tempo = 90; // Eerie slow space cosmic void
      bassMelody = [
        110.00, 0, 165.00, 0, 110.00, 0, 196.00, 0,
        123.47, 0, 165.00, 0, 123.47, 0, 220.00, 0,
        110.00, 0, 165.00, 0, 110.00, 0, 196.00, 0,
        130.81, 0, 196.00, 0, 220.00, 0, 220.00, 0
      ];
      trebleMelody = [
        440.00, 659.25, 880.00, 0, 783.99, 0, 659.25, 0,
        493.88, 659.25, 987.77, 0, 880.00, 0, 659.25, 0,
        440.00, 659.25, 880.00, 0, 783.99, 0, 659.25, 0,
        523.25, 783.99, 1046.50, 0, 1174.66, 0, 1318.51, 0
      ];
    } else if (theme === 'sky_pagoda') {
      tempo = 120; // Pentatonic Japanese/Asian inspired sky melody
      bassMelody = [
        146.83, 146.83, 220.00, 0, 164.81, 164.81, 246.94, 0,
        196.00, 196.00, 293.66, 0, 220.00, 220.00, 329.63, 0,
        146.83, 146.83, 220.00, 0, 164.81, 164.81, 246.94, 0,
        220.00, 0, 196.00, 0, 146.83, 146.83, 110.00, 0
      ];
      trebleMelody = [
        587.33, 659.25, 880.00, 0, 659.25, 880.00, 987.77, 0,
        783.99, 880.00, 1174.66, 0, 880.00, 987.77, 1318.51, 0,
        587.33, 659.25, 880.00, 0, 659.25, 880.00, 987.77, 0,
        880.00, 0, 783.99, 0, 587.33, 0, 587.33, 0
      ];
    } else if (theme === 'primal_jungle') {
      tempo = 136; // Tribal primal drum signature
      bassMelody = [
        110.00, 110.00, 0, 110.00, 130.81, 0, 146.83, 146.83,
        98.00, 98.00, 0, 98.00, 123.47, 0, 130.81, 130.81,
        110.00, 110.00, 0, 110.00, 130.81, 0, 146.83, 146.83,
        165.00, 165.00, 196.00, 220.00, 110.00, 0, 110.00, 0
      ];
      trebleMelody = [
        440.00, 0, 440.00, 523.25, 587.33, 0, 587.33, 0,
        392.00, 0, 392.00, 493.88, 523.25, 0, 523.25, 0,
        440.00, 0, 440.00, 523.25, 587.33, 0, 587.33, 0,
        659.25, 0, 783.99, 880.00, 440.00, 0, 440.00, 0
      ];
    } else if (theme === 'cryo_cave') {
      tempo = 145; // Crystallized hyper cold glacial cave synth arpeggio
      bassMelody = [
        130.81, 261.63, 196.00, 261.63, 146.83, 293.66, 220.00, 293.66,
        164.81, 329.63, 246.94, 329.63, 130.81, 261.63, 196.00, 261.63,
        130.81, 261.63, 196.00, 261.63, 146.83, 293.66, 220.00, 293.66,
        196.00, 0, 246.94, 0, 130.81, 0, 130.81, 0
      ];
      trebleMelody = [
        523.25, 1046.50, 783.99, 1046.50, 587.33, 1174.66, 880.00, 1174.66,
        659.25, 1318.51, 987.77, 1318.51, 523.25, 1046.50, 783.99, 1046.50,
        1046.50, 0, 1174.66, 0, 1318.51, 0, 1174.66, 0,
        783.99, 987.77, 1174.66, 1479.98, 1046.50, 0, 1046.50, 0
      ];
    } else if (theme === 'retrowave_highway') {
      tempo = 160; // Pumping retro outrun driving beat
      bassMelody = [
        110.00, 110.00, 110.00, 110.00, 146.83, 146.83, 146.83, 146.83,
        165.00, 165.00, 165.00, 165.00, 110.00, 110.00, 130.81, 146.83,
        110.00, 110.00, 110.00, 110.00, 146.83, 146.83, 146.83, 146.83,
        196.00, 196.00, 165.00, 165.00, 110.00, 0, 110.00, 0
      ];
      trebleMelody = [
        440.00, 0, 440.00, 523.25, 587.33, 0, 587.33, 0,
        659.25, 0, 587.33, 0, 440.00, 0, 440.00, 0,
        523.25, 0, 587.33, 0, 659.25, 783.99, 659.25, 0,
        783.99, 0, 880.00, 0, 440.00, 0, 440.00, 0
      ];
    } else {
      // Default: UPBEAT SURFACE theme
      tempo = 150;
      // Happy energetic Mario-like chord progression
      bassMelody = [
        130.81, 196.00, 164.81, 196.00, 174.61, 220.00, 196.00, 246.94,
        110.00, 165.00, 130.81, 165.00, 146.83, 220.00, 196.00, 293.66,
        174.61, 220.00, 196.00, 246.94, 164.81, 220.00, 110.00, 220.00,
        174.61, 0, 196.00, 0, 130.81, 164.81, 196.00, 261.63
      ];
      trebleMelody = [
        523.25, 659.25, 783.99, 523.25 * 1.5, 587.33, 698.46, 783.99, 987.77,
        440.00, 523.25, 659.25, 880.00, 587.33, 698.46, 783.99, 1174.66,
        698.46, 880.00, 783.99, 987.77, 659.25, 880.00, 440.00, 880.00,
        1046.50, 0, 1174.66, 0, 1318.51, 1046.50, 783.99, 523.25
      ];
    }

    const stepDuration = 60 / tempo / 2; // Eighth note duration

    const playSequence = () => {
      if (this.isMuted || !this.ctx) return;

      const idx = this.step % bassMelody.length;

      // Bass note (plucked bass guitar string)
      const bassFreq = bassMelody[idx];
      if (bassFreq > 0) {
        const volMod = theme === 'thankyou' ? 0.22 : 1.0;
        this.playGuitarTone(bassFreq, stepDuration * 1.4, 0.38 * volMod, true);
      }

      // Treble note (plucked nylon/steel treble guitar string)
      const trebleFreq = trebleMelody[idx];
      if (trebleFreq > 0) {
        const volMod = theme === 'thankyou' ? 0.18 : 1.0;
        this.playGuitarTone(trebleFreq, stepDuration * 1.5, 0.16 * volMod, false);
      }

      // Synthesized retro-drum machine backing beats with custom thematic signatures!
      if (theme !== 'thankyou') {
        const beat = this.step % 4;
        if (theme === 'retrowave_highway' || theme === 'cybercity') {
          if (beat === 0) {
            // Synthwave Kick Drum
            this.playTone(60, 'triangle', 0.12, 0.18, -0.6, 0.06);
          } else if (beat === 2) {
            // Synthwave Gated Snare - sharp & retro-compressed digital burst
            this.playTone(180, 'square', 0.08, 0.05);
            this.playTone(480, 'triangle', 0.04, 0.04);
          }
        } else if (theme === 'primal_jungle') {
          if (beat === 0) {
            // Low deep primal tribal drum impact
            this.playTone(70, 'triangle', 0.15, 0.22, -0.3, 0.10);
          } else if (beat === 2) {
            // High tom punch
            this.playTone(110, 'triangle', 0.10, 0.14, -0.2, 0.08);
          }
        } else if (theme === 'sky_pagoda') {
          if (beat === 2) {
            // Eastern bronze bowl bell chiming resonance
            this.playTone(1650, 'sine', 0.22, 0.06);
          }
        } else if (theme === 'cryo_cave') {
          if (beat === 1 || beat === 3) {
            // Crystalline frosted high-frequency ice ticks
            this.playTone(2500, 'sine', 0.03, 0.04);
          }
        } else if (theme === 'void_nebula') {
          if (beat === 0) {
            // Low cosmic gravity sub-bass pulse waves
            this.playTone(45, 'sine', 0.22, 0.16, 0.30, 0.12);
          }
        } else if (theme === 'city') {
          if (beat === 0 || beat === 2) {
            // Smooth jazz ride-cymbal sizzle
            this.playTone(3200, 'triangle', 0.02, 0.03);
          }
        } else {
          // Standard traditional retro woodblock snap
          if (beat === 2) {
            this.playTone(450, 'triangle', 0.04, 0.05);
          }
        }
      }

      this.step++;
    };

    // Run first immediately, then interval
    playSequence();
    this.bgmIntervalId = setInterval(playSequence, stepDuration * 1000);
  }

  public stopBgm() {
    if (this.bgmIntervalId) {
      clearInterval(this.bgmIntervalId);
      this.bgmIntervalId = null;
    }
  }

  // Speak text using SpeechSynthesis
  public speak(text: string, options?: { pitch?: number; rate?: number; volume?: number; gender?: 'male' | 'female' | 'baby' }) {
    // Disabled robot speaking audio - only text bubble is supported
    return;
    if (this.isMuted) return;
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.volume = (options?.volume ?? 0.85) * this.gameVolume;
        
        let targetPitch = options?.pitch ?? 1.2;
        let targetRate = options?.rate ?? 1.1;

        if (options?.gender === 'baby') {
          // Extremely cute child-like fast baby voice
          targetPitch = 1.95;
          targetRate = 1.4;
        } else if (options?.gender === 'female') {
          targetPitch = 1.45;
          targetRate = 1.15;
        } else if (options?.gender === 'male') {
          targetPitch = 1.05;
          targetRate = 1.1;
        }

        utterance.pitch = targetPitch;
        utterance.rate = targetRate;

        // Dynamic voice identification
        const voices = window.speechSynthesis.getVoices();
        if (voices && voices.length > 0) {
          const englishVoices = voices.filter(v => v.lang.toLowerCase().startsWith('en'));
          const candidates = englishVoices.length > 0 ? englishVoices : voices;

          let selectedVoice: SpeechSynthesisVoice | null = null;
          const genderType = options?.gender;

          if (genderType === 'female') {
            selectedVoice = candidates.find(v => {
              const name = v.name.toLowerCase();
              return name.includes('female') || name.includes('zira') || name.includes('samantha') || name.includes('susan') || name.includes('hazel') || name.includes('moira') || name.includes('fiona') || name.includes('karen') || name.includes('tessa');
            }) || null;
          } else if (genderType === 'baby') {
            // Find a high-pitched sweet child voice or female voice to capture "cute baby boy/baby talk"
            selectedVoice = candidates.find(v => {
              const name = v.name.toLowerCase();
              return name.includes('samantha') || name.includes('zira') || name.includes('tessa') || name.includes('google us english') || name.includes('natural');
            }) || null;
          } else if (genderType === 'male') {
            selectedVoice = candidates.find(v => {
              const name = v.name.toLowerCase();
              return name.includes('male') || name.includes('david') || name.includes('alex') || name.includes('daniel') || name.includes('ravi') || name.includes('george') || name.includes('fred');
            }) || null;
          }

          if (selectedVoice) {
            utterance.voice = selectedVoice;
          }
        }

        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn("Speech synthesis failed", err);
      }
    }
  }

  // Renters high-fidelity title theme audio sequence in memory and returns a standard WAV Blob
  public async renderTitleThemeToWavBlob(): Promise<Blob> {
    const tempo = 136;
    const bassMelody = [
      130.81, 0, 196.00, 164.81, // C Major step
      174.61, 0, 261.63, 220.00, // F Major step
      196.00, 0, 293.66, 246.94, // G Major step
      130.81, 164.81, 196.00, 261.63, // Turnaround C Major

      110.00, 0, 165.00, 220.00, // Am step
      146.83, 0, 220.00, 293.66, // Dm step
      196.00, 0, 293.66, 392.00, // G step
      130.81, 164.81, 196.00, 261.63, // C Major step

      174.61, 0, 261.63, 174.61, // F step
      196.00, 0, 293.66, 196.00, // G step
      164.81, 0, 246.94, 164.81, // Em step
      220.00, 0, 329.63, 220.00, // Am step

      116.54, 0, 174.61, 116.54, // Bb step
      196.00, 0, 293.66, 196.00, // G step
      130.81, 196.00, 261.63, 329.63, // C ascending
      392.00, 523.25, 261.63, 130.81
    ];
    const trebleMelody = [
      523.25, 0, 659.25, 783.99, // Bright syncopated jumps
      698.46, 0, 880.00, 1046.50, 
      783.99, 0, 987.77, 1174.66, 
      1046.50, 880.00, 783.99, 1318.51, // High-pitched sweet beach steelpan chime

      440.00, 0, 523.25, 659.25, // Am arpeggiated highlights
      587.33, 0, 698.46, 880.00, // Dm
      783.99, 0, 987.77, 1174.66, // G
      1046.50, 0, 1318.51, 1567.98, // C high ring out

      698.46, 0, 880.00, 698.46, // F heroic lines
      783.99, 0, 987.77, 783.99, // G
      659.25, 0, 783.99, 659.25, // Em
      880.00, 1046.50, 1318.51, 1567.98, // Am climax run

      932.33, 0, 698.46, 932.33, // Bb calypso cascade
      783.99, 0, 987.77, 1174.66, // G
      1046.50, 1318.51, 1567.98, 1318.51, // Full dual octave resolution
      1046.50, 783.99, 523.25, 0
    ];

    const stepDuration = 60 / tempo / 2; // Eighth note duration
    const totalSteps = 128; // Play the fully extended 64-step sequence twice!
    const totalDuration = totalSteps * stepDuration + 1.5; // padding for acoustic ring-decay

    const sampleRate = 44100;
    // Create dual-channel offline render context
    const offlineCtx = new (window.OfflineAudioContext || (window as any).OfflineAudioContext)(2, sampleRate * totalDuration, sampleRate);

    // Schedule note sequences offline
    for (let step = 0; step < totalSteps; step++) {
      const idx = step % bassMelody.length;
      const startTime = step * stepDuration;

      // Bass note
      const bassFreq = bassMelody[idx];
      if (bassFreq > 0) {
        this.playGuitarToneOffline(offlineCtx, bassFreq, startTime, stepDuration * 1.4, 0.38, true);
      }

      // Treble note
      const trebleFreq = trebleMelody[idx];
      if (trebleFreq > 0) {
        this.playGuitarToneOffline(offlineCtx, trebleFreq, startTime, stepDuration * 1.5, 0.16, false);
      }

      // Soft physical tambourine/wood accent
      if (step % 4 === 2) {
        this.playToneOffline(offlineCtx, 450, startTime, 'triangle', 0.04, 0.05);
      }
    }

    const renderedBuffer = await offlineCtx.startRendering();
    return bufferToWav(renderedBuffer);
  }

  // Exact reproduction offline tone generators
  private playGuitarToneOffline(
    ctx: OfflineAudioContext,
    freq: number,
    startTime: number,
    duration: number,
    volume: number,
    isBass: boolean = false
  ) {
    const now = startTime;

    if (isBass) {
      const oscBody = ctx.createOscillator();
      const gainBody = ctx.createGain();
      oscBody.type = 'triangle';
      oscBody.frequency.setValueAtTime(freq, now);

      gainBody.gain.setValueAtTime(0, now);
      gainBody.gain.linearRampToValueAtTime(volume * 0.40, now + 0.008);
      gainBody.gain.exponentialRampToValueAtTime(0.0001, now + duration * 1.5);

      oscBody.connect(gainBody);
      gainBody.connect(ctx.destination);
      oscBody.start(now);
      oscBody.stop(now + duration * 1.5);

      const oscWinding = ctx.createOscillator();
      const gainWinding = ctx.createGain();
      oscWinding.type = 'sine';
      oscWinding.frequency.setValueAtTime(freq * 2, now);

      gainWinding.gain.setValueAtTime(volume * 0.15, now);
      gainWinding.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

      oscWinding.connect(gainWinding);
      gainWinding.connect(ctx.destination);
      oscWinding.start(now);
      oscWinding.stop(now + 0.15);
    } else {
      const oscBody = ctx.createOscillator();
      const gainBody = ctx.createGain();
      oscBody.type = 'triangle';
      oscBody.frequency.setValueAtTime(freq, now);
      oscBody.frequency.linearRampToValueAtTime(freq * 0.997, now + duration);

      gainBody.gain.setValueAtTime(0, now);
      gainBody.gain.linearRampToValueAtTime(volume * 0.35, now + 0.005);
      gainBody.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      oscBody.connect(gainBody);
      gainBody.connect(ctx.destination);
      oscBody.start(now);
      oscBody.stop(now + duration);

      const oscHarmonic = ctx.createOscillator();
      const gainHarmonic = ctx.createGain();
      oscHarmonic.type = 'sine';
      oscHarmonic.frequency.setValueAtTime(freq * 3.0, now);

      gainHarmonic.gain.setValueAtTime(0, now);
      gainHarmonic.gain.linearRampToValueAtTime(volume * 0.12, now + 0.012);
      gainHarmonic.gain.exponentialRampToValueAtTime(0.0001, now + duration * 0.6);

      oscHarmonic.connect(gainHarmonic);
      gainHarmonic.connect(ctx.destination);
      oscHarmonic.start(now);
      oscHarmonic.stop(now + duration);

      const oscPluck = ctx.createOscillator();
      const gainPluck = ctx.createGain();
      oscPluck.type = 'sawtooth';
      oscPluck.frequency.setValueAtTime(freq * 2.0, now);

      gainPluck.gain.setValueAtTime(volume * 0.22, now);
      gainPluck.gain.exponentialRampToValueAtTime(0.0001, now + 0.025);

      oscPluck.connect(gainPluck);
      gainPluck.connect(ctx.destination);
      oscPluck.start(now);
      oscPluck.stop(now + 0.035);
    }
  }

  private playToneOffline(
    ctx: OfflineAudioContext,
    freq: number,
    startTime: number,
    type: OscillatorType,
    duration: number,
    volume: number,
  ) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(volume * 0.15, startTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);
  }
}

// Global WAV Encoding Subroutines
function bufferToWav(buffer: AudioBuffer): Blob {
  const numOfChan = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // 1 = raw uncompressed 16-bit PCM
  const bitDepth = 16;
  
  let result;
  if (numOfChan === 2) {
    result = interleave(buffer.getChannelData(0), buffer.getChannelData(1));
  } else {
    result = buffer.getChannelData(0);
  }
  
  const bufferLen = result.length * 2;
  const arrayBuffer = new ArrayBuffer(44 + bufferLen);
  const view = new DataView(arrayBuffer);
  
  /* RIFF identifier */
  writeString(view, 0, 'RIFF');
  /* file length */
  view.setUint32(4, 36 + bufferLen, true);
  /* RIFF type */
  writeString(view, 8, 'WAVE');
  /* format chunk identifier */
  writeString(view, 12, 'fmt ');
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (raw) */
  view.setUint16(20, format, true);
  /* channel count */
  view.setUint16(22, numOfChan, true);
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate (sample rate * block align) */
  view.setUint32(28, sampleRate * numOfChan * (bitDepth / 8), true);
  /* block align (channel count * bytes per sample) */
  view.setUint16(32, numOfChan * (bitDepth / 8), true);
  /* bits per sample */
  view.setUint16(34, bitDepth, true);
  /* data chunk identifier */
  writeString(view, 36, 'data');
  /* data chunk length */
  view.setUint32(40, bufferLen, true);
  
  // Write 16-bit PCM samples
  floatTo16BitPCM(view, 44, result);
  
  return new Blob([view], { type: 'audio/wav' });
}

function interleave(inputL: Float32Array, inputR: Float32Array): Float32Array {
  const length = inputL.length + inputR.length;
  const result = new Float32Array(length);
  let index = 0;
  let inputIndex = 0;
  
  while (index < length) {
    result[index++] = inputL[inputIndex];
    result[index++] = inputR[inputIndex];
    inputIndex++;
  }
  return result;
}

function floatTo16BitPCM(output: DataView, offset: number, input: Float32Array) {
  for (let i = 0; i < input.length; i++, offset += 2) {
    let s = Math.max(-1, Math.min(1, input[i]));
    output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

export const audioEngine = new RetroAudioEngine();
