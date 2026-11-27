/**
 * Game music: the user's own track "Rain-Slicked Escape" (src/assets/audio/rain-slicked-escape.mp3,
 * 3:02, ~120 BPM), used for every game mode. Nothing is synthesised.
 *
 * The fight mode only changes the tempo (playbackRate, in small steps so the pitch shift stays
 * subtle) and the level. Tempo changes glide smoothly.
 */
import songUrl from '../assets/audio/rain-slicked-escape.mp3?inline';

export type MusicMode = 'normal' | 'hype' | 'danger' | 'boss' | 'rage' | 'duel';

interface Plan {
  /** playbackRate: 1 = original tempo (~120 BPM) */
  rate: number;
  level: number;
}

/** Tune tempo and loudness per point of the fight here. */
const PLANS: Record<MusicMode, Plan> = {
  normal: { rate: 1.0, level: 0.9 }, // street fighting: original tempo, 120 BPM
  hype: { rate: 1.05, level: 0.95 }, // big combo / crowd hype: ~126 BPM
  danger: { rate: 1.09, level: 0.95 }, // a hero is nearly down: ~131 BPM
  boss: { rate: 1.03, level: 1.0 }, // boss fight: ~124 BPM
  rage: { rate: 1.09, level: 1.0 }, // boss phase 2: ~131 BPM
  duel: { rate: 1.0, level: 0.9 }, // arcade 1v1 and local 2P
};

/**
 * Turn an inlined `data:` URI into bytes without fetch(): sandboxed pages (like the phone Artifact)
 * block fetch() of data URLs, which used to leave the game silent.
 */
function dataUriToArrayBuffer(uri: string): ArrayBuffer {
  const bin = atob(uri.slice(uri.indexOf(',') + 1));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

/** decodeAudioData in both promise and callback styles (older Safari only has callbacks) */
function decode(ctx: AudioContext, ab: ArrayBuffer): Promise<AudioBuffer> {
  return new Promise((resolve, reject) => {
    const p = ctx.decodeAudioData(ab, resolve, reject);
    if (p && typeof p.then === 'function') p.then(resolve, reject);
  });
}

class MusicEngine {
  private ctx: AudioContext | null = null;
  public master: GainNode | null = null;
  private buf: AudioBuffer | null = null;
  private loading = false;
  private failed = false;
  private src: AudioBufferSourceNode | null = null;
  private gain: GainNode | null = null;
  private timer: number | null = null;
  private mode: MusicMode = 'normal';
  private muted = false;
  private volume = 0.55;
  /**
   * Preferred path: stream the track through an <audio> element (about 2 MB of memory instead of
   * ~64 MB for a fully decoded buffer). Falls back to the decoded buffer if the element can't play.
   */
  private el: HTMLAudioElement | null = null;
  private elGain: GainNode | null = null;
  private elRate = 1;
  private elTriedAt = 0;
  private useBuffer = false;

  /** Called with the sound engine's AudioContext */
  private attach(ctx: AudioContext) {
    if (this.ctx === ctx && this.master) return;
    this.ctx = ctx;
    const master = ctx.createGain();
    master.gain.value = this.muted ? 0 : this.volume;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -12;
    comp.ratio.value = 3;
    comp.attack.value = 0.01;
    comp.release.value = 0.25;
    master.connect(comp);
    comp.connect(ctx.destination);
    this.master = master;
    if (typeof window !== 'undefined' && window.location.search.includes('musicdebug')) {
      (window as unknown as { __music: MusicEngine }).__music = this;
    }
    if (!this.setupElement()) this.load();
  }

  private setupElement(): boolean {
    const ctx = this.ctx;
    if (!ctx || !this.master || typeof Audio === 'undefined' || this.useBuffer) return false;
    try {
      const el = new Audio();
      el.src = songUrl;
      el.loop = true;
      el.preload = 'auto';
      // let the tempo change also shift pitch slightly, like the buffer version did
      const anyEl = el as HTMLAudioElement & { preservesPitch?: boolean; webkitPreservesPitch?: boolean };
      anyEl.preservesPitch = false;
      anyEl.webkitPreservesPitch = false;
      const node = ctx.createMediaElementSource(el);
      const g = ctx.createGain();
      g.gain.value = 0.0001;
      node.connect(g);
      g.connect(this.master);
      el.addEventListener('error', () => this.elementFailed());
      this.el = el;
      this.elGain = g;
      return true;
    } catch {
      this.useBuffer = true;
      return false;
    }
  }

  private elementFailed() {
    if (this.useBuffer) return;
    console.warn('music: streaming failed, decoding the track instead');
    this.useBuffer = true;
    try {
      this.el?.pause();
      this.elGain?.disconnect();
    } catch {
      // ignore
    }
    this.el = null;
    this.elGain = null;
    this.load();
  }

  private load() {
    const ctx = this.ctx;
    if (!ctx || this.buf || this.loading || this.failed) return;
    this.loading = true;
    Promise.resolve()
      .then(() => decode(ctx, dataUriToArrayBuffer(songUrl)))
      .then((buf) => {
        this.buf = buf;
      })
      .catch((err) => {
        console.warn('music: could not load track', err);
        this.failed = true;
      })
      .finally(() => {
        this.loading = false;
      });
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
    if (mode === this.mode) return;
    this.mode = mode;
    this.sync();
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

  /** 'stream' (light) or 'buffer' (fallback), for ?musicdebug */
  public get path() {
    return this.el ? 'stream' : this.buf ? 'buffer' : 'loading';
  }

  public start(ctx: AudioContext) {
    this.attach(ctx);
    if (this.timer !== null || typeof window === 'undefined') return;
    this.timer = window.setInterval(() => this.sync(), 250);
    this.sync();
  }

  public stop() {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.el) {
      this.el.pause();
      this.elTriedAt = 0;
      if (this.elGain && this.ctx) this.elGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
    }
    if (this.src) {
      try {
        this.src.stop();
      } catch {
        // already stopped
      }
    }
    this.src = null;
    this.gain = null;
  }

  /** Start the track if needed and glide to the tempo/level of the current mode */
  private sync() {
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    if (ctx.state !== 'running') {
      ctx.resume().catch(() => {});
      return;
    }
    const plan = PLANS[this.mode];
    const now = ctx.currentTime;
    if (this.el && this.elGain) {
      const el = this.el;
      if (el.paused) {
        if (this.elTriedAt === 0) {
          this.elTriedAt = now;
          el.currentTime = 0;
        }
        el.play().catch(() => {});
        // Still silent after 5 s of trying: the sandbox won't stream it, decode instead
        if (now - this.elTriedAt > 5) this.elementFailed();
        return;
      }
      this.elRate += (plan.rate - this.elRate) * 0.3; // glide tempo between modes
      el.playbackRate = this.elRate;
      this.elGain.gain.setTargetAtTime(plan.level, now, 0.45);
      return;
    }
    if (!this.buf) return;
    if (!this.src) {
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, now);
      const src = ctx.createBufferSource();
      src.buffer = this.buf;
      src.loop = true;
      src.playbackRate.value = plan.rate;
      src.connect(g);
      g.connect(this.master);
      src.start(now + 0.02, 0);
      this.src = src;
      this.gain = g;
    }
    if (this.src && this.gain) {
      this.gain.gain.setTargetAtTime(plan.level, now, 0.45);
      this.src.playbackRate.setTargetAtTime(plan.rate, now, 0.8);
    }
  }
}

export const musicEngine = new MusicEngine();
