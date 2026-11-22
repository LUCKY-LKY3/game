/**
 * Game music: the user's own recordings, nothing synthesised.
 *
 * - groove  : src/assets/audio/groove.mp3, a 96-beat (24 bar) loop at 132.99 BPM (street fighting)
 * - song    : src/assets/audio/rain-slicked-escape.mp3, 3:02 at ~120 BPM (bosses and duels)
 *
 * The fight mode picks the track and nudges its tempo with playbackRate (small steps, so the
 * pitch shift stays subtle). Tracks crossfade when the mode changes.
 */
import grooveUrl from '../assets/audio/groove.mp3?inline';
import songUrl from '../assets/audio/rain-slicked-escape.mp3?inline';

export type MusicMode = 'normal' | 'hype' | 'danger' | 'boss' | 'rage' | 'duel';

type TrackId = 'groove' | 'song';

/** Groove is trimmed to exactly 96 beats on its grid so it loops seamlessly. */
const GROOVE_SECONDS = 96 * 0.45113;

interface Plan {
  track: TrackId;
  /** playbackRate: 1 = original tempo */
  rate: number;
  level: number;
}

/** Tune tempo and loudness per point of the fight here. */
const PLANS: Record<MusicMode, Plan> = {
  normal: { track: 'groove', rate: 1.0, level: 3.4 }, // street fighting at the recorded 133 BPM
  hype: { track: 'groove', rate: 1.05, level: 3.7 }, // big combo / crowd hype: ~140 BPM
  danger: { track: 'groove', rate: 1.09, level: 3.7 }, // a hero is nearly down: ~145 BPM
  boss: { track: 'song', rate: 1.0, level: 0.9 }, // boss fight at the recorded 120 BPM
  rage: { track: 'song', rate: 1.06, level: 0.95 }, // boss phase 2: ~127 BPM
  duel: { track: 'song', rate: 1.0, level: 0.9 }, // arcade 1v1 and local 2P
};

const CROSSFADE = 0.45; // time constant, seconds

interface TrackState {
  buf: AudioBuffer | null;
  loading: boolean;
  failed: boolean;
  delay: number;
  src: AudioBufferSourceNode | null;
  gain: GainNode | null;
}

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

const newTrack = (): TrackState => ({ buf: null, loading: false, failed: false, delay: 0, src: null, gain: null });

class MusicEngine {
  private ctx: AudioContext | null = null;
  public master: GainNode | null = null;
  private tracks: Record<TrackId, TrackState> = { groove: newTrack(), song: newTrack() };
  private timer: number | null = null;
  private songPrefetch: number | null = null;
  private mode: MusicMode = 'normal';
  private muted = false;
  private volume = 0.55;

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
    this.load('groove');
  }

  private load(id: TrackId) {
    const ctx = this.ctx;
    const tr = this.tracks[id];
    if (!ctx || tr.buf || tr.loading || tr.failed) return;
    tr.loading = true;
    Promise.resolve()
      .then(() => decode(ctx, dataUriToArrayBuffer(id === 'groove' ? grooveUrl : songUrl)))
      .then((buf) => {
        // MP3 decoders can leave encoder delay at the head; skip any excess so the loop stays on its grid
        if (id === 'groove') tr.delay = Math.min(0.06, Math.max(0, buf.duration - GROOVE_SECONDS));
        tr.buf = buf;
      })
      .catch((err) => {
        console.warn('music: could not load', id, err);
        tr.failed = true;
      })
      .finally(() => {
        tr.loading = false;
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
    if (PLANS[mode].track === 'song') this.load('song');
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

  public start(ctx: AudioContext) {
    this.attach(ctx);
    if (this.timer !== null || typeof window === 'undefined') return;
    // The song is large: fetch it a few seconds in, unless this mode needs it right away
    if (PLANS[this.mode].track === 'song') this.load('song');
    else this.songPrefetch = window.setTimeout(() => this.load('song'), 4000);
    this.timer = window.setInterval(() => this.sync(), 250);
    this.sync();
  }

  public stop() {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.songPrefetch !== null) {
      clearTimeout(this.songPrefetch);
      this.songPrefetch = null;
    }
    for (const id of ['groove', 'song'] as TrackId[]) this.halt(id);
  }

  private halt(id: TrackId) {
    const tr = this.tracks[id];
    if (tr.src) {
      try {
        tr.src.stop();
      } catch {
        // already stopped
      }
    }
    tr.src = null;
    tr.gain = null;
  }

  /** Make the right track play at the right tempo/level; crossfade away from the other one */
  private sync() {
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    if (ctx.state !== 'running') {
      ctx.resume().catch(() => {});
      return;
    }
    const plan = PLANS[this.mode];
    // If the wanted track hasn't decoded yet, keep (or start) the other one meanwhile
    let active: TrackId = plan.track;
    if (!this.tracks[active].buf) active = active === 'song' ? 'groove' : 'song';
    if (!this.tracks[active].buf) return;
    const planned = active === plan.track;
    const rate = planned ? plan.rate : 1;
    const level = planned ? plan.level : PLANS[active === 'groove' ? 'normal' : 'boss'].level;
    const now = ctx.currentTime;

    for (const id of ['groove', 'song'] as TrackId[]) {
      const tr = this.tracks[id];
      if (id === active) {
        if (!tr.src && tr.buf) {
          const g = ctx.createGain();
          g.gain.setValueAtTime(0.0001, now);
          const src = ctx.createBufferSource();
          src.buffer = tr.buf;
          src.loop = true;
          if (id === 'groove') {
            src.loopStart = tr.delay;
            src.loopEnd = tr.delay + GROOVE_SECONDS;
          }
          src.playbackRate.value = rate;
          src.connect(g);
          g.connect(this.master);
          src.start(now + 0.02, id === 'groove' ? tr.delay : 0);
          tr.src = src;
          tr.gain = g;
        }
        if (tr.src && tr.gain) {
          tr.gain.gain.setTargetAtTime(level, now, CROSSFADE);
          tr.src.playbackRate.setTargetAtTime(rate, now, 0.7);
        }
      } else if (tr.src && tr.gain) {
        const old = tr.src;
        tr.gain.gain.setTargetAtTime(0.0001, now, CROSSFADE);
        tr.src = null;
        tr.gain = null;
        window.setTimeout(() => {
          try {
            old.stop();
          } catch {
            // already stopped
          }
        }, 2500);
      }
    }
  }
}

export const musicEngine = new MusicEngine();
