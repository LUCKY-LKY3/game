/**
 * Procedural Web Audio API sound engine for Akhara Clash.
 * Synthesizes Indian village dhol drums, combat impacts, blocks, sidesteps,
 * Rage Art drops, and brass temple gongs with zero external audio dependencies.
 */
class AkharaSoundEngine {
  private ctx: AudioContext | null = null;
  private muted = false;
  private dholTimer: number | null = null;
  private dholStep = 0;
  private dholIntensity: 'normal' | 'hype' | 'boss' = 'normal';

  private ensureContext(): AudioContext | null {
    if (this.muted) return null;
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMuted(m: boolean) {
    this.muted = m;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  private noiseBuffer(ctx: AudioContext, durationSec: number): AudioBuffer {
    const length = Math.max(1, Math.floor(ctx.sampleRate * durationSec));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  /** Double-headed village Dhol drum cadence for Round Start */
  public playRoundStart() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const hits = [0, 0.14, 0.28, 0.45];
    hits.forEach((offset, idx) => {
      const t = now + offset;
      // Bass dhol head (dagga)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const baseFreq = idx === hits.length - 1 ? 108 : 88;
      osc.frequency.setValueAtTime(baseFreq * 1.4, t);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.55, t + 0.18);
      gain.gain.setValueAtTime(0.32, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.23);

      // Treble slap head (tilli)
      const noise = ctx.createBufferSource();
      noise.buffer = this.noiseBuffer(ctx, 0.06);
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = idx === hits.length - 1 ? 1500 : 1100;
      const nGain = ctx.createGain();
      nGain.gain.setValueAtTime(0.18, t);
      nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
      noise.connect(filter);
      filter.connect(nGain);
      nGain.connect(ctx.destination);
      noise.start(t);
    });
  }

  /** Snappy punch or kick impact */
  public playHit(heavy: boolean) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Low body thud
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(heavy ? 160 : 210, now);
    osc.frequency.exponentialRampToValueAtTime(heavy ? 36 : 62, now + (heavy ? 0.16 : 0.09));
    gain.gain.setValueAtTime(heavy ? 0.45 : 0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (heavy ? 0.17 : 0.1));
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.18);

    // Crisp slap transient
    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer(ctx, heavy ? 0.12 : 0.07);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = heavy ? 850 : 1400;
    filter.Q.value = 0.9;
    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(heavy ? 0.35 : 0.22, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + (heavy ? 0.12 : 0.07));
    noise.connect(filter);
    filter.connect(nGain);
    nGain.connect(ctx.destination);
    noise.start(now);
  }

  /** Guard block wooden clack */
  public playBlock() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(240, now + 0.065);
    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  /** Attack whiff or Z-axis sidestep swoosh */
  public playWhoosh(pitch = 1.0) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer(ctx, 0.13);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(520 * pitch, now);
    filter.frequency.exponentialRampToValueAtTime(1600 * pitch, now + 0.07);
    filter.frequency.exponentialRampToValueAtTime(340 * pitch, now + 0.13);
    filter.Q.value = 1.6;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.14, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);
  }

  /** Dramatic Village Rage Art activation horn + sub drop */
  public playRageActivate() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Deep sub bass drop
    const sub = ctx.createOscillator();
    const subGain = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(140, now);
    sub.frequency.exponentialRampToValueAtTime(42, now + 0.45);
    subGain.gain.setValueAtTime(0.42, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    sub.connect(subGain);
    subGain.connect(ctx.destination);
    sub.start(now);
    sub.stop(now + 0.52);

    // Rising brass shankh / horn shimmer
    const horn = ctx.createOscillator();
    const hGain = ctx.createGain();
    horn.type = 'sawtooth';
    horn.frequency.setValueAtTime(220, now);
    horn.frequency.exponentialRampToValueAtTime(440, now + 0.25);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1200;
    hGain.gain.setValueAtTime(0.001, now);
    hGain.gain.linearRampToValueAtTime(0.16, now + 0.06);
    hGain.gain.exponentialRampToValueAtTime(0.001, now + 0.46);
    horn.connect(lp);
    lp.connect(hGain);
    hGain.connect(ctx.destination);
    horn.start(now);
    horn.stop(now + 0.48);
  }

  /** Resonant akhara brass temple gong on K.O. */
  public playKO() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const partials = [180, 274, 412, 628];
    partials.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = idx === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.96, now + 1.1);
      gain.gain.setValueAtTime(0.22 / (idx + 1), now);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + 1.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 1.2);
    });
  }

  /** UI crisp confirmation click */
  public playUiSelect() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(640, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.05);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.07);
  }

  /** Sharp comic open-hand slap crack (Jav's Storytime Mega Slap) */
  public playSlap() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer(ctx, 0.14);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2400, now);
    filter.frequency.exponentialRampToValueAtTime(900, now + 0.12);
    filter.Q.value = 1.2;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.55, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);
  }

  /** Crisp hollow wooden snooker cue whack (Jam's Snooker Cue Beatdown) */
  public playWoodWhack() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(740, now);
    osc.frequency.exponentialRampToValueAtTime(210, now + 0.085);
    gain.gain.setValueAtTime(0.38, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.095);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
    this.playHit(false);
  }

  /** Dual-tone classic car horn beep-beep + rev (Chet's Red Ford) */
  public playCarHorn() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [0, 0.24].forEach((offset) => {
      [392, 493.88].forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const lp = ctx.createBiquadFilter();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now + offset);
        lp.type = 'lowpass';
        lp.frequency.value = 1350;
        gain.gain.setValueAtTime(0.001, now + offset);
        gain.gain.linearRampToValueAtTime(0.11, now + offset + 0.02);
        gain.gain.setValueAtTime(0.11, now + offset + 0.14);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.19);
        osc.connect(lp);
        lp.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + offset);
        osc.stop(now + offset + 0.2);
      });
    });

    // Engine roar sweep
    const eng = ctx.createOscillator();
    const eGain = ctx.createGain();
    eng.type = 'sawtooth';
    eng.frequency.setValueAtTime(58, now + 0.1);
    eng.frequency.exponentialRampToValueAtTime(165, now + 0.9);
    eng.frequency.exponentialRampToValueAtTime(72, now + 1.6);
    const eLp = ctx.createBiquadFilter();
    eLp.type = 'lowpass';
    eLp.frequency.value = 340;
    eGain.gain.setValueAtTime(0.001, now + 0.1);
    eGain.gain.linearRampToValueAtTime(0.22, now + 0.35);
    eGain.gain.exponentialRampToValueAtTime(0.001, now + 1.65);
    eng.connect(eLp);
    eLp.connect(eGain);
    eGain.connect(ctx.destination);
    eng.start(now + 0.1);
    eng.stop(now + 1.68);
  }

  /** Heavy car runover crunch */
  public playCarCrash() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    this.playHit(true);
    const now = ctx.currentTime;
    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer(ctx, 0.28);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(620, now);
    bp.Q.value = 0.7;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.36, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    noise.connect(bp);
    bp.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);
  }

  /** Deep bear-hug squeeze crunch (Saf) */
  public playSqueeze() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(135, now);
    osc.frequency.exponentialRampToValueAtTime(52, now + 0.22);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 420;
    gain.gain.setValueAtTime(0.26, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
    osc.connect(lp);
    lp.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  /** Soft smoky puff exhale (Fady) */
  public playSmokePuff() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer(ctx, 0.35);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(950, now);
    lp.frequency.exponentialRampToValueAtTime(320, now + 0.35);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.14, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    noise.connect(lp);
    lp.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);
  }

  /** Playful bright chime cheer (Immy's 3 girls) */
  public playCheerPop() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);
      gain.gain.setValueAtTime(0.12, now + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.23);
    });
  }

  /** Terracotta clay pot shatter crunch */
  public playPotSmash() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    // Ceramic crack burst
    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer(ctx, 0.2);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(1950, now);
    bp.frequency.exponentialRampToValueAtTime(640, now + 0.18);
    bp.Q.value = 1.4;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.42, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    noise.connect(bp);
    bp.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);

    // Ceramic shards clink
    [1380, 1890, 2320].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.032);
      g.gain.setValueAtTime(0.11, now + i * 0.032);
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.032 + 0.075);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(now + i * 0.032);
      osc.stop(now + i * 0.032 + 0.08);
    });
  }

  /** Weapon pickup or warm chai heal chime */
  public playPickup(isHeal: boolean) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const freqs = isHeal ? [440, 554.37, 659.25, 880] : [330, 493.88];
    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = isHeal ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(f, now + idx * 0.055);
      g.gain.setValueAtTime(0.16, now + idx * 0.055);
      g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.055 + 0.16);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(now + idx * 0.055);
      osc.stop(now + idx * 0.055 + 0.17);
    });
  }

  /** Snappy Double Dragon tag-team hero switch whoosh + ding */
  public playTagSwitch() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(840, now + 0.09);
    g.gain.setValueAtTime(0.2, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);
    this.playWhoosh(1.35);
  }

  /** Classic arcade GO >> advance chime */
  public playGoPrompt() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'square';
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 1800;
      osc.frequency.setValueAtTime(f, now + idx * 0.07);
      g.gain.setValueAtTime(0.09, now + idx * 0.07);
      g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.16);
      osc.connect(lp);
      lp.connect(g);
      g.connect(ctx.destination);
      osc.start(now + idx * 0.07);
      osc.stop(now + idx * 0.07 + 0.17);
    });
  }

  /** Classic Indian 3-wheel auto-rickshaw twin-beep horn */
  public playRickshawHorn() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [0, 0.22].forEach((off) => {
      [587.33, 739.99].forEach((freq) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        const bp = ctx.createBiquadFilter();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now + off);
        bp.type = 'bandpass';
        bp.frequency.value = 1400;
        bp.Q.value = 1.6;
        g.gain.setValueAtTime(0.001, now + off);
        g.gain.linearRampToValueAtTime(0.12, now + off + 0.015);
        g.gain.exponentialRampToValueAtTime(0.001, now + off + 0.14);
        osc.connect(bp);
        bp.connect(g);
        g.connect(ctx.destination);
        osc.start(now + off);
        osc.stop(now + off + 0.15);
      });
    });
  }

  /** Partner revive uplifting chord */
  public playReviveChime() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [392, 493.88, 587.33, 783.99].forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, now + idx * 0.06);
      g.gain.setValueAtTime(0.15, now + idx * 0.06);
      g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.28);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.3);
    });
  }

  /** Live procedural Indian Village Dhol rhythm (speeds up during big combos & Boss Bade Tau!) */
  public startDholLoop() {
    if (typeof window === 'undefined') return;
    if (this.dholTimer !== null) return;
    this.dholStep = 0;

    const scheduleNext = () => {
      if (this.dholTimer === null) return;
      this.playDholStep(this.dholStep);
      this.dholStep = (this.dholStep + 1) % 8;
      const intervalMs =
        this.dholIntensity === 'boss' ? 148 : this.dholIntensity === 'hype' ? 162 : 190;
      this.dholTimer = window.setTimeout(scheduleNext, intervalMs);
    };

    this.dholTimer = window.setTimeout(scheduleNext, 220);
  }

  public setDholIntensity(mode: 'normal' | 'hype' | 'boss') {
    this.dholIntensity = mode;
  }

  public stopDholLoop() {
    if (this.dholTimer !== null) {
      clearTimeout(this.dholTimer);
      this.dholTimer = null;
    }
  }

  private playDholStep(step: number) {
    if (this.muted || !this.ctx || this.ctx.state !== 'running') return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    // Authentic Punjabi bhangra / akhara 8-step chaal: DUM - ta - DUM DUM - ta - DUM ta
    const isBass = step === 0 || step === 3 || step === 4 || (this.dholIntensity !== 'normal' && step === 6);
    const isSlap = step === 2 || step === 5 || step === 7 || (this.dholIntensity === 'boss' && step === 1);

    if (isBass) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      const pitch = step === 0 ? 96 : 84;
      osc.frequency.setValueAtTime(pitch * 1.35, now);
      osc.frequency.exponentialRampToValueAtTime(pitch * 0.56, now + 0.12);
      g.gain.setValueAtTime(this.dholIntensity === 'boss' ? 0.12 : 0.085, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.15);
    }

    if (isSlap) {
      const noise = ctx.createBufferSource();
      noise.buffer = this.noiseBuffer(ctx, 0.045);
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = step === 7 ? 1650 : 1220;
      bp.Q.value = 1.8;
      const g = ctx.createGain();
      g.gain.setValueAtTime(this.dholIntensity === 'normal' ? 0.045 : 0.068, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
      noise.connect(bp);
      bp.connect(g);
      g.connect(ctx.destination);
      noise.start(now);
    }
  }

  /** Crisp golden metallic ring when timing a perfect Guard Parry! */
  public playParryClang() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [980, 1480].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = idx === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.15, now + 0.16);
      g.gain.setValueAtTime(idx === 0 ? 0.24 : 0.16, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    });
  }

  /** Snappy upward arcade jump spring */
  public playJump() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(190, now);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.1);
    g.gain.setValueAtTime(0.16, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  /** Grounded dirt scuff dash burst */
  public playDash() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer(ctx, 0.11);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(650, now);
    bp.frequency.exponentialRampToValueAtTime(1800, now + 0.08);
    bp.Q.value = 1.2;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.18, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
    noise.connect(bp);
    bp.connect(g);
    g.connect(ctx.destination);
    noise.start(now);
  }

  /** Earthy shockwave thud for Jump + Hook Ground Slam */
  public playGroundSlam() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(135, now);
    osc.frequency.exponentialRampToValueAtTime(28, now + 0.28);
    g.gain.setValueAtTime(0.5, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.31);

    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer(ctx, 0.18);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 620;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.32, now);
    ng.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    noise.connect(lp);
    lp.connect(ng);
    ng.connect(ctx.destination);
    noise.start(now);
  }

  /** Crisp high metallic PING! when deflecting Chappal Chacha's slipper back at him */
  public playSlipperPing() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [1320, 1980, 2640].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = idx === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.08, now + 0.22);
      g.gain.setValueAtTime(idx === 0 ? 0.24 : 0.14 / idx, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.3);
    });
  }

  /** Gritty Hero Splendor 100cc motorbike revving burst */
  public playBikeRev() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(68, now);
    osc.frequency.exponentialRampToValueAtTime(165, now + 0.16);
    osc.frequency.exponentialRampToValueAtTime(118, now + 0.32);
    osc.frequency.exponentialRampToValueAtTime(195, now + 0.48);
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(340, now);
    filter.Q.value = 2.2;
    g.gain.setValueAtTime(0.24, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.52);
    osc.connect(filter);
    filter.connect(g);
    g.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.54);
  }

  /** Sizzling hot masala chai splash from the brass kadhai */
  public playChaiSplash() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer(ctx, 0.38);
    const hp = ctx.createBiquadFilter();
    hp.type = 'bandpass';
    hp.frequency.setValueAtTime(2400, now);
    hp.frequency.exponentialRampToValueAtTime(900, now + 0.36);
    hp.Q.value = 1.1;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.26, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
    noise.connect(hp);
    hp.connect(g);
    g.connect(ctx.destination);
    noise.start(now);
  }

  /** Cartoonish boomy straw explosion when a cousin slams into a haystack */
  public playHaystackBoom() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(185, now);
    osc.frequency.exponentialRampToValueAtTime(38, now + 0.32);
    g.gain.setValueAtTime(0.45, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.34);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.36);

    const rustle = ctx.createBufferSource();
    rustle.buffer = this.noiseBuffer(ctx, 0.42);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(1450, now);
    bp.Q.value = 0.8;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.28, now);
    ng.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
    rustle.connect(bp);
    bp.connect(ng);
    ng.connect(ctx.destination);
    rustle.start(now);
  }

  /** Defensive green-health Panic Special 360 shockwave burst */
  public playPanicBurst() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [320, 640, 960].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = idx === 0 ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.42, now + 0.28);
      g.gain.setValueAtTime(idx === 0 ? 0.26 : 0.14, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.32);
    });
  }

  /** Village crowd cheering burst when hitting 10x / 20x / 30x Crowd Hype Drops */
  public playCrowdCheer() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer(ctx, 0.55);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(1050, now);
    bp.frequency.linearRampToValueAtTime(1500, now + 0.25);
    bp.frequency.linearRampToValueAtTime(950, now + 0.55);
    bp.Q.value = 1.4;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.02, now);
    g.gain.linearRampToValueAtTime(0.2, now + 0.12);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    noise.connect(bp);
    bp.connect(g);
    g.connect(ctx.destination);
    noise.start(now);

    [523.25, 659.25, 783.99].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const og = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.055);
      og.gain.setValueAtTime(0.14, now + idx * 0.055);
      og.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.055 + 0.22);
      osc.connect(og);
      og.connect(ctx.destination);
      osc.start(now + idx * 0.055);
      osc.stop(now + idx * 0.055 + 0.24);
    });
  }

  /** Satisfying arcade chime when picking a Between-Zone Village Boon card */
  public playBoonPick() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.05);
      g.gain.setValueAtTime(0.18, now + idx * 0.05);
      g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.28);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(now + idx * 0.05);
      osc.stop(now + idx * 0.05 + 0.3);
    });
  }

  /** Playful village sheep "Baaa!" when brawls pass nearby */
  public playSheepBaa() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    const bp = ctx.createBiquadFilter();
    const g = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(340, now);
    osc.frequency.linearRampToValueAtTime(305, now + 0.32);

    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(22, now);
    lfoGain.gain.setValueAtTime(28, now);
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(980, now);
    bp.Q.value = 3.0;

    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(0.14, now + 0.04);
    g.gain.setValueAtTime(0.12, now + 0.22);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.36);

    osc.connect(bp);
    bp.connect(g);
    g.connect(ctx.destination);
    osc.start(now);
    lfo.start(now);
    osc.stop(now + 0.38);
    lfo.stop(now + 0.38);
  }

  /** Pressurized roadside hand-pump water burst */
  public playWaterBurst() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer(ctx, 0.45);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(1600, now);
    bp.frequency.exponentialRampToValueAtTime(480, now + 0.42);
    bp.Q.value = 0.9;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.02, now);
    g.gain.linearRampToValueAtTime(0.32, now + 0.04);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    noise.connect(bp);
    bp.connect(g);
    g.connect(ctx.destination);
    noise.start(now);

    // Metallic clank of iron pump handle
    const clank = ctx.createOscillator();
    const cg = ctx.createGain();
    clank.type = 'triangle';
    clank.frequency.setValueAtTime(520, now);
    clank.frequency.exponentialRampToValueAtTime(190, now + 0.12);
    cg.gain.setValueAtTime(0.24, now);
    cg.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    clank.connect(cg);
    cg.connect(ctx.destination);
    clank.start(now);
    clank.stop(now + 0.15);
  }

  /** Bade Tau Phase 2 Moustache Rage thunderous roar */
  public playBossRoar() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const lp = ctx.createBiquadFilter();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(125, now);
    osc.frequency.exponentialRampToValueAtTime(72, now + 0.65);
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(620, now);
    lp.frequency.exponentialRampToValueAtTime(220, now + 0.65);
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(0.36, now + 0.08);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.72);
    osc.connect(lp);
    lp.connect(g);
    g.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.74);

    // Dhol brass accent
    this.playRageActivate();
  }

  /** Deep seismic ground-pound shockwave boom */
  public playShockwaveBoom() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const sub = ctx.createOscillator();
    const sg = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(110, now);
    sub.frequency.exponentialRampToValueAtTime(24, now + 0.48);
    sg.gain.setValueAtTime(0.54, now);
    sg.gain.exponentialRampToValueAtTime(0.001, now + 0.52);
    sub.connect(sg);
    sg.connect(ctx.destination);
    sub.start(now);
    sub.stop(now + 0.54);
    this.playGroundSlam();
  }

  /** Crisp celebratory tag-team high-five slap + upbeat ding */
  public playHighFive() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.playSlap();
    [587.33, 880].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + 0.04 + idx * 0.06);
      g.gain.setValueAtTime(0.18, now + 0.04 + idx * 0.06);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.28 + idx * 0.06);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(now + 0.04 + idx * 0.06);
      osc.stop(now + 0.3 + idx * 0.06);
    });
  }

  /** Cinematic heavy finisher slam impact */
  public playFinisherImpact() {
    this.playHit(true);
    this.playGroundSlam();
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(980, now + 0.14);
    g.gain.setValueAtTime(0.2, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.26);
  }

  /** Crisp leather cricket ball thwack */
  public playCricketHit() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(940, now);
    osc.frequency.exponentialRampToValueAtTime(280, now + 0.065);
    g.gain.setValueAtTime(0.32, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  /** Sharp martial-arts cloth/air whip snap for high kicks, spinning heel & tornado kicks */
  public playKickWhoosh(pitch = 1.0) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Bandpass air-whip sweep
    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer(ctx, 0.16);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 2.6;
    filter.frequency.setValueAtTime(520 * pitch, now);
    filter.frequency.exponentialRampToValueAtTime(2400 * pitch, now + 0.085);
    filter.frequency.exponentialRampToValueAtTime(700 * pitch, now + 0.155);
    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.001, now);
    nGain.gain.linearRampToValueAtTime(0.3, now + 0.055);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    noise.connect(filter);
    filter.connect(nGain);
    nGain.connect(ctx.destination);
    noise.start(now);

    // Subtle sharp martial-arts snap transient
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(340 * pitch, now + 0.03);
    osc.frequency.exponentialRampToValueAtTime(110 * pitch, now + 0.12);
    g.gain.setValueAtTime(0.14, now + 0.03);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(now + 0.03);
    osc.stop(now + 0.14);
  }
}

export const soundEngine = new AkharaSoundEngine();
