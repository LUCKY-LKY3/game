/**
 * Procedural street-brawl score for Mafia Bhayas (zero audio files).
 *
 * Desi-fusion groove in A Phrygian, built around a recorded drum/percussion loop: tanpura drone, dhol (dagga + tilli), ghungroo shaker,
 * plucked bass, a sitar riff, and a shehnai lead that joins as the fight heats up.
 * Modes: 'normal' (street fight), 'hype' (big combos / crowd hype), 'boss' (Bade Tau).
 * A lookahead scheduler keeps timing tight even when the game loop stutters.
 */

import grooveUrl from '../assets/audio/groove.mp3?inline';

export type MusicMode = 'normal' | 'hype' | 'boss';

/**
 * The user's own recorded groove (src/assets/audio/groove.mp3) is the rhythmic backbone.
 * It was trimmed to exactly 96 beats (24 bars) on its beat grid, so it loops seamlessly.
 * Measured from the recording: 132.99 BPM (beat = 0.45113 s), centred on A (Phrygian-ish).
 * Everything synthesised here is locked to that grid.
 */
const BEAT = 0.45113;
const GROOVE_SECONDS = 96 * BEAT;
/** If the groove feels a beat early or late against the bass/sitar, nudge this (in beats, can be 1, 2 or 3). */
const GROOVE_BAR_OFFSET_STEPS = 0;
/** How loud the recording sits per mode */
const GROOVE_LEVEL: Record<MusicMode, number> = { normal: 1.5, hype: 1.75, boss: 2.0 };

const ROOT_HZ = 220; // A3
const SCALE = [0, 1, 3, 5, 7, 8, 10, 12, 13, 15, 17, 19]; // A Phrygian, two octaves
const semi = (n: number, oct = 0) => ROOT_HZ * Math.pow(2, (n + oct * 12) / 12);

/** Sitar riff, one bar each: [step 0-15, scale degree index, length in steps]. */
const RIFF: [number, number, number][][] = [
  [
    [0, 4, 2], [3, 5, 1], [4, 4, 2], [6, 2, 2], [8, 3, 2], [10, 2, 1], [11, 1, 1], [12, 0, 3],
  ],
  [
    [0, 0, 1], [1, 1, 1], [2, 2, 2], [4, 4, 2], [6, 5, 1], [7, 4, 1], [8, 6, 3], [12, 5, 1], [13, 4, 1], [14, 2, 2],
  ],
  [
    [0, 4, 2], [3, 5, 1], [4, 6, 2], [6, 5, 1], [7, 4, 1], [8, 7, 3], [12, 6, 2], [14, 4, 2],
  ],
  [
    [0, 5, 2], [2, 4, 1], [3, 2, 1], [4, 1, 2], [6, 0, 2], [8, 1, 1], [9, 2, 1], [10, 4, 2], [12, 2, 2], [14, 0, 2],
  ],
];
/** Bass root (semitones from D) per bar of a 4-bar loop */
const BASS_ROOTS = [0, 1, 0, 7];
/** Shehnai phrases (scale index, beats in steps) played in bars 3-4 of each 4-bar phrase */
const SHEHNAI: [number, number, number][][] = [
  [[0, 5, 4], [4, 4, 4], [8, 2, 4], [12, 3, 4]],
  [[0, 7, 6], [6, 6, 2], [8, 5, 4], [12, 4, 4]],
];

class MusicEngine {
  private ctx: AudioContext | null = null;
  public master: GainNode | null = null;
  private dry: GainNode | null = null;
  private reverbSend: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private timer: number | null = null;
  private nextTime = 0;
  private step = 0;
  private mode: MusicMode = 'normal';
  private muted = false;
  private volume = 0.55;
  private droneNodes: { stop: () => void } | null = null;
  private duckUntil = 0;
  private grooveBuf: AudioBuffer | null = null;
  private grooveDelay = 0;
  private grooveLoading = false;
  private grooveSrc: AudioBufferSourceNode | null = null;
  private grooveGain: GainNode | null = null;
  private useGroove = typeof window === 'undefined' || !window.location.search.includes('nosample');

  /** Called by the sound engine with its AudioContext */
  public attach(ctx: AudioContext) {
    if (this.ctx === ctx && this.master) return;
    this.ctx = ctx;
    const master = ctx.createGain();
    master.gain.value = this.muted ? 0 : this.volume;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.ratio.value = 3.5;
    comp.attack.value = 0.01;
    comp.release.value = 0.2;
    master.connect(comp);
    comp.connect(ctx.destination);
    const dry = ctx.createGain();
    dry.connect(master);
    // Small plate-style reverb from generated noise
    const conv = ctx.createConvolver();
    const len = Math.floor(ctx.sampleRate * 1.3);
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
    conv.buffer = ir;
    const send = ctx.createGain();
    send.gain.value = 0.28;
    send.connect(conv);
    conv.connect(master);
    this.master = master;
    if (typeof window !== 'undefined' && window.location.search.includes('musicdebug')) {
      (window as unknown as { __music: MusicEngine }).__music = this;
    }
    this.dry = dry;
    this.reverbSend = send;
    this.loadGroove(ctx);
    this.noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.25), ctx.sampleRate);
    const nd = this.noise.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  }

  private loadGroove(ctx: AudioContext) {
    if (!this.useGroove || this.grooveBuf || this.grooveLoading) return;
    this.grooveLoading = true;
    fetch(grooveUrl)
      .then((r) => r.arrayBuffer())
      .then((ab) => ctx.decodeAudioData(ab))
      .then((buf) => {
        // MP3 decoders may leave encoder delay at the head; skip any excess so beat 0 stays on the grid
        this.grooveDelay = Math.min(0.06, Math.max(0, buf.duration - GROOVE_SECONDS));
        this.grooveBuf = buf;
      })
      .catch(() => {
        this.useGroove = false;
      })
      .finally(() => {
        this.grooveLoading = false;
      });
  }

  private startGroove(t: number) {
    const ctx = this.ctx as AudioContext;
    if (!this.grooveBuf || this.grooveSrc) return;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(GROOVE_LEVEL[this.mode], t + 0.6);
    const src = ctx.createBufferSource();
    src.buffer = this.grooveBuf;
    src.loop = true;
    src.loopStart = this.grooveDelay;
    src.loopEnd = this.grooveDelay + GROOVE_SECONDS;
    src.connect(g);
    g.connect(this.dry as GainNode);
    src.start(t, this.grooveDelay);
    this.grooveSrc = src;
    this.grooveGain = g;
  }

  public setMuted(m: boolean) {
    this.muted = m;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(m ? 0 : this.volume, this.ctx.currentTime, 0.05);
  }

  public setVolume(v: number) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.master && this.ctx && !this.muted) this.master.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
  }

  public setMode(mode: MusicMode) {
    this.mode = mode;
    if (this.grooveGain && this.ctx) this.grooveGain.gain.setTargetAtTime(GROOVE_LEVEL[mode], this.ctx.currentTime, 0.4);
  }

  /** Briefly lower the music so a big power-move sound effect cuts through */
  public duck(seconds: number) {
    if (!this.ctx || !this.master || this.muted) return;
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setTargetAtTime(this.volume * 0.35, t, 0.04);
    this.master.gain.setTargetAtTime(this.volume, t + seconds, 0.25);
  }

  public isPlaying() {
    return this.timer !== null;
  }

  public start(ctx: AudioContext) {
    this.attach(ctx);
    if (this.timer !== null || typeof window === 'undefined') return;
    this.step = 0;
    this.nextTime = ctx.currentTime + 0.12;
    this.startDrone();
    this.timer = window.setInterval(() => this.tick(), 25);
  }

  public stop() {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.droneNodes) {
      this.droneNodes.stop();
      this.droneNodes = null;
    }
    if (this.grooveSrc) {
      try {
        this.grooveSrc.stop();
      } catch {
        // already stopped
      }
      this.grooveSrc = null;
      this.grooveGain = null;
    }
  }

  // ───────────────────────── scheduler ─────────────────────────
  private bpm() {
    return 60 / BEAT;
  }

  private tick() {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') {
      if (ctx) this.nextTime = Math.max(this.nextTime, ctx.currentTime + 0.05);
      return;
    }
    while (this.nextTime < ctx.currentTime + 0.14) {
      this.scheduleStep(this.step, this.nextTime);
      this.nextTime += 60 / this.bpm() / 4;
      this.step++;
    }
  }

  private scheduleStep(n: number, t: number) {
    const s = n % 16;
    const bar = Math.floor(n / 16);
    const barInLoop = bar % 4;
    const mode = this.mode;
    const boss = mode === 'boss';
    const hype = mode === 'hype' || boss;
    const fillBar = barInLoop === 3;
    // Start the recorded groove on a 4-bar boundary once it has decoded (keeps it phase-locked to the synth bars)
    if (this.useGroove && !this.grooveSrc && this.grooveBuf && s === 0 && barInLoop === 0) {
      this.startGroove(t + GROOVE_BAR_OFFSET_STEPS * (BEAT / 4));
    }
    const hasGroove = this.grooveSrc !== null;

    // ── Dhol dagga (bass head)
    const dagga = boss ? [0, 3, 6, 8, 10, 12, 14] : hype ? [0, 6, 8, 10, 12] : [0, 6, 10];
    if (dagga.includes(s) && (!hasGroove || hype)) this.dagga(t, (s === 0 ? 1 : 0.75) * (hasGroove ? 0.45 : 1));
    // ── Tilli (stick/treble head) backbeat + fills
    const tilli = [4, 12];
    if (!hasGroove) {
      if (tilli.includes(s)) this.tilli(t, 1);
      if (hype && (s === 7 || s === 15)) this.tilli(t, 0.55);
      if (fillBar && s >= 12) this.tilli(t, 0.7 + (s - 12) * 0.1);
    }
    // ── Ghungroo shaker 16ths
    if (!hasGroove && (s % 2 === 1 || hype)) this.shaker(t, s % 4 === 2 ? 1 : 0.55, hype ? 1.25 : 1);

    // ── Bass
    const root = BASS_ROOTS[barInLoop];
    const bassSteps = boss ? [0, 2, 3, 6, 8, 10, 11, 14] : [0, 3, 6, 8, 10, 14];
    if (bassSteps.includes(s)) {
      const fifth = s === 6 || s === 14;
      this.bass(t, semi(root + (fifth ? 7 : 0), -2), boss ? 0.24 : 0.2, boss ? 0.14 : 0.2);
    }

    // ── Sitar riff (2-bar phrases, picks one of four by position)
    const riff = RIFF[bar % 4];
    for (const [rs, deg, len] of riff) {
      if (rs === s) {
        this.sitar(t, semi(SCALE[deg]), (60 / this.bpm() / 4) * len, hype ? 0.15 : 0.12);
        if (boss) this.sitar(t, semi(SCALE[deg], -1), (60 / this.bpm() / 4) * len, 0.08);
      }
    }

    // ── Shehnai lead: joins in hype/boss on the second half of each 4-bar loop
    if (hype && barInLoop >= 2) {
      const phrase = SHEHNAI[(Math.floor(bar / 4)) % 2];
      for (const [ps, deg, len] of phrase) {
        if (ps === s) this.shehnai(t, semi(SCALE[deg], 1), (60 / this.bpm() / 4) * len, boss ? 0.1 : 0.08);
      }
    }

    // ── Boss war-horn stab on every downbeat
    if (boss && s === 0) this.horn(t, semi(root, -2), 0.5);
  }

  // ───────────────────────── voices ─────────────────────────
  private out(node: AudioNode, reverb = 0) {
    node.connect(this.dry as GainNode);
    if (reverb > 0 && this.reverbSend) {
      const g = (this.ctx as AudioContext).createGain();
      g.gain.value = reverb;
      node.connect(g);
      g.connect(this.reverbSend);
    }
  }

  private dagga(t: number, v: number) {
    const ctx = this.ctx as AudioContext;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(52, t + 0.16);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.5 * v, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
    o.connect(g);
    this.out(g, 0.05);
    o.start(t);
    o.stop(t + 0.3);
    // woody skin slap
    this.noiseHit(t, 700, 1.2, 0.03, 0.12 * v);
  }

  private tilli(t: number, v: number) {
    const ctx = this.ctx as AudioContext;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(520, t);
    o.frequency.exponentialRampToValueAtTime(330, t + 0.06);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.22 * v, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    o.connect(g);
    this.out(g, 0.12);
    o.start(t);
    o.stop(t + 0.12);
    this.noiseHit(t, 2400, 1.6, 0.05, 0.2 * v);
  }

  private shaker(t: number, v: number, gain: number) {
    this.noiseHit(t, 7200, 0.9, 0.035, 0.06 * v * gain, 'highpass');
  }

  private noiseHit(t: number, freq: number, q: number, dur: number, vol: number, type: BiquadFilterType = 'bandpass') {
    const ctx = this.ctx as AudioContext;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    src.connect(f);
    f.connect(g);
    this.out(g);
    src.start(t, Math.random() * 0.1);
    src.stop(t + dur + 0.01);
  }

  private bass(t: number, hz: number, vol: number, dur: number) {
    const ctx = this.ctx as AudioContext;
    const o = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    const lp = ctx.createBiquadFilter();
    const g = ctx.createGain();
    o.type = 'sawtooth';
    o2.type = 'sine';
    o.frequency.value = hz;
    o2.frequency.value = hz;
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(900, t);
    lp.frequency.exponentialRampToValueAtTime(220, t + dur + 0.05);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur + 0.12);
    o.connect(lp);
    o2.connect(g);
    lp.connect(g);
    this.out(g);
    o.start(t);
    o2.start(t);
    o.stop(t + dur + 0.15);
    o2.stop(t + dur + 0.15);
  }

  /** Plucked sitar-ish voice: detuned saws through a resonant band with a quick meend slide */
  private sitar(t: number, hz: number, len: number, vol: number) {
    const ctx = this.ctx as AudioContext;
    const g = ctx.createGain();
    const bp = ctx.createBiquadFilter();
    const lp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = Math.min(5000, hz * 3.2);
    bp.Q.value = 3.5;
    lp.type = 'lowpass';
    lp.frequency.value = 4200;
    const dur = Math.max(0.28, Math.min(0.9, len * 1.35));
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.004);
    g.gain.exponentialRampToValueAtTime(vol * 0.35, t + 0.09);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    for (const det of [-4, 5]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(hz * 1.03, t);
      o.frequency.exponentialRampToValueAtTime(hz, t + 0.05);
      o.detune.value = det;
      o.connect(bp);
      o.start(t);
      o.stop(t + dur + 0.02);
    }
    bp.connect(lp);
    lp.connect(g);
    this.out(g, 0.55);
  }

  /** Reedy shehnai lead with vibrato */
  private shehnai(t: number, hz: number, len: number, vol: number) {
    const ctx = this.ctx as AudioContext;
    const o = ctx.createOscillator();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    const lp = ctx.createBiquadFilter();
    const bp = ctx.createBiquadFilter();
    const g = ctx.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(hz * 0.97, t);
    o.frequency.exponentialRampToValueAtTime(hz, t + 0.07);
    lfo.frequency.value = 5.6;
    lfoGain.gain.value = hz * 0.012;
    lfo.connect(lfoGain);
    lfoGain.connect(o.frequency);
    lp.type = 'lowpass';
    lp.frequency.value = 2600;
    bp.type = 'peaking';
    bp.frequency.value = hz * 4;
    bp.gain.value = 6;
    const dur = Math.max(0.3, len * 0.95);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.05);
    g.gain.setValueAtTime(vol, t + dur * 0.7);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(lp);
    lp.connect(bp);
    bp.connect(g);
    this.out(g, 0.7);
    o.start(t);
    lfo.start(t);
    o.stop(t + dur + 0.02);
    lfo.stop(t + dur + 0.02);
  }

  private horn(t: number, hz: number, dur: number) {
    const ctx = this.ctx as AudioContext;
    const g = ctx.createGain();
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(500, t);
    lp.frequency.exponentialRampToValueAtTime(1400, t + 0.12);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.11, t + 0.04);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    for (const mult of [1, 1.5]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = hz * mult;
      o.detune.value = mult === 1 ? -6 : 6;
      o.connect(lp);
      o.start(t);
      o.stop(t + dur + 0.02);
    }
    lp.connect(g);
    this.out(g, 0.35);
  }

  /** Tanpura-style drone that runs under the whole track */
  private startDrone() {
    const ctx = this.ctx as AudioContext;
    const g = ctx.createGain();
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 520;
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.07, ctx.currentTime + 1.5);
    const oscs: OscillatorNode[] = [];
    for (const [mult, det] of [[0.5, -5], [0.5, 6], [0.75, 0]] as const) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = ROOT_HZ * mult;
      o.detune.value = det;
      o.connect(lp);
      o.start();
      oscs.push(o);
    }
    lp.connect(g);
    this.out(g, 0.3);
    this.droneNodes = {
      stop: () => {
        const t = ctx.currentTime;
        g.gain.cancelScheduledValues(t);
        g.gain.setTargetAtTime(0.0001, t, 0.15);
        oscs.forEach((o) => o.stop(t + 0.8));
      },
    };
  }
}

export const musicEngine = new MusicEngine();
