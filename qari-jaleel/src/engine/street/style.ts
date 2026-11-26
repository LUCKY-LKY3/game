import type { StreetBrawlEngine } from '../streetBrawlEngine';

/** Style grade: rewards mixing moves, dodges, parries, guard breaks and on-beat hits. Getting hit drops it. */
export const STYLE_GRADES = ['D', 'C', 'B', 'A', 'S'] as const;
export type StyleGrade = (typeof STYLE_GRADES)[number];
const THRESHOLDS = [0, 20, 42, 68, 92];
const MULTS = [1, 1.1, 1.25, 1.5, 2];

export function styleIndex(meter: number): number {
  let i = 0;
  for (let k = 0; k < THRESHOLDS.length; k++) if (meter >= THRESHOLDS[k]) i = k;
  return i;
}

export function styleMult(this: StreetBrawlEngine): number {
  return MULTS[styleIndex(this.styleMeter)];
}

/** Add style for a named moment. `move` (hit only) is the attack used: repeating the same one earns almost nothing. */
export function addStyle(this: StreetBrawlEngine, kind: 'hit' | 'dodge' | 'parry' | 'guardbreak' | 'beat' | 'finisher' | 'throw' | 'blocked', move?: string) {
  let gain = 0;
  if (kind === 'hit') {
    const recent = this.styleRecent;
    const repeats = move ? recent.filter((m) => m === move).length : 0;
    gain = repeats === 0 ? 4.5 : repeats === 1 ? 1.5 : 0.2;
    if (move) {
      recent.push(move);
      if (recent.length > 4) recent.shift();
    }
  } else if (kind === 'dodge') gain = 12;
  else if (kind === 'parry') gain = 14;
  else if (kind === 'guardbreak') gain = 9;
  else if (kind === 'beat') gain = 5;
  else if (kind === 'finisher') gain = 10;
  else if (kind === 'throw') gain = 7;
  else if (kind === 'blocked') gain = -6;
  if (kind !== 'hit' && kind !== 'blocked') this.progressChallenge(kind);
  if (kind === 'hit') {
    this.practiceProgress('hit');
    if (move && /rp|kick|finisher|sweep/.test(move)) this.practiceProgress('heavyhit');
  } else if (kind === 'guardbreak' || kind === 'throw' || kind === 'dodge' || kind === 'parry') {
    this.practiceProgress(kind);
  }
  const before = styleIndex(this.styleMeter);
  this.styleMeter = Math.max(0, Math.min(100, this.styleMeter + gain));
  if (gain > 0) this.styleIdle = 0;
  const after = styleIndex(this.styleMeter);
  this.bestStyle = Math.max(this.bestStyle, after);
  if (after >= 3) this.progressChallenge('style');
  if (after > before && after >= 2) {
    const h = this.getActiveHero();
    this.spawnComicPopup(h.x, 2.9, h.z, `STYLE ${STYLE_GRADES[after]}!`, after === 4 ? '#F472B6' : '#FDE047');
  }
}

export function stepStyle(this: StreetBrawlEngine, dt: number) {
  const h = this.getActiveHero();
  // Getting hit costs a big chunk
  const key = this.activeHeroIndex * 100000 + h.hp;
  if (this.styleLastHp >= 0 && Math.floor(this.styleLastHp / 100000) === this.activeHeroIndex && h.hp < (this.styleLastHp % 100000) - 4) {
    this.styleMeter = Math.max(0, this.styleMeter - 30);
    this.progressChallenge('hurt');
  }
  // Desi Gussa: below 25% HP the active hero hits 30% harder (comeback)
  const low = h.hp > 0 && h.hp < h.maxHp * 0.25;
  if (low && !this.gussaOn) {
    this.gussaOn = true;
    this.spawnComicPopup(h.x, 2.6, h.z, 'DESI GUSSA! +30% DMG', '#EF4444');
  } else if (!low && h.hp > h.maxHp * 0.35) {
    this.gussaOn = false;
  }
  this.styleLastHp = key;
  this.styleIdle += dt;
  if (this.styleIdle > 1.6) this.styleMeter = Math.max(0, this.styleMeter - 10 * dt);
  this.beatFlash = Math.max(0, this.beatFlash - dt);
}
