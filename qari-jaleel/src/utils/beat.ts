// Dhol beat helper: a steady pulse that is independent of the music (the track's own rhythm is too loose to sync to).
// The HUD ring and the engine both read the same clock, so landing a hit as the ring closes counts as "on beat".
export const BEAT_PERIOD = 0.6; // seconds (100 BPM)
const BEAT_WINDOW = 0.12; // seconds either side of the beat
const T0 = typeof performance !== 'undefined' ? performance.now() : 0;

export function beatPhase(now = performance.now()): number {
  const t = (now - T0) / 1000 / BEAT_PERIOD;
  return t - Math.floor(t);
}

/** Is a hit landing right now on the beat? idx lets the caller allow one bonus per beat. */
export function beatHit(now = performance.now()): { on: boolean; idx: number } {
  const t = (now - T0) / 1000 / BEAT_PERIOD;
  const idx = Math.round(t);
  return { on: Math.abs(t - idx) * BEAT_PERIOD <= BEAT_WINDOW, idx };
}
