import { getSettings } from '../../utils/settings';
import { soundEngine } from '../sound';
import type { StreetBrawlEngine } from '../streetBrawlEngine';

/** One mini challenge per zone (Street Brawl) or wave (Endless). Completing it pays score + power. */
export type ChallengeKind = 'throw' | 'guardbreak' | 'dodge' | 'parry' | 'beat' | 'finisher' | 'style' | 'nohit';

export interface ChallengeState {
  kind: ChallengeKind;
  label: string;
  need: number;
  have: number;
  done: boolean;
}

const POOL: { kind: ChallengeKind; need: number; label: (n: number) => string }[] = [
  { kind: 'throw', need: 2, label: (n) => `Throw ${n} cousins` },
  { kind: 'guardbreak', need: 3, label: (n) => `Break ${n} guards` },
  { kind: 'dodge', need: 2, label: (n) => `Perfect-dodge ${n} swings` },
  { kind: 'parry', need: 1, label: () => 'Parry an attack' },
  { kind: 'beat', need: 4, label: (n) => `${n} ON BEAT hits` },
  { kind: 'finisher', need: 2, label: (n) => `${n} FINISH takedowns` },
  { kind: 'style', need: 1, label: () => 'Reach style A' },
  { kind: 'nohit', need: 20, label: (n) => `${n}s without getting hit` },
];

export function stepChallenge(this: StreetBrawlEngine, dt: number) {
  if (this.practiceMode) {
    this.challenge = null;
    return;
  }
  const key = this.endlessMode ? `w${this.endlessWave}` : `z${this.currentZoneIdx}`;
  if (key !== this.challengeKey) {
    this.challengeKey = key;
    const pool = POOL.filter((c) => c.kind !== 'beat' || getSettings().beatBonus);
    let pick = pool[Math.floor(Math.random() * pool.length)];
    if (this.challenge && pick.kind === this.challenge.kind) pick = pool[(pool.indexOf(pick) + 1) % pool.length];
    this.challenge = { kind: pick.kind, label: pick.label(pick.need), need: pick.need, have: 0, done: false };
    this.challengeNoHit = 0;
  }
  const c = this.challenge;
  if (!c || c.done || this.phase !== 'FIGHTING') return;
  if (c.kind === 'nohit') {
    this.challengeNoHit += dt;
    c.have = Math.min(c.need, Math.floor(this.challengeNoHit));
    if (c.have >= c.need) completeChallenge.call(this);
  }
}

/** Called from addStyle for each stylish moment (and on hits taken for the no-hit challenge) */
export function progressChallenge(this: StreetBrawlEngine, kind: ChallengeKind | 'hurt', amount = 1) {
  const c = this.challenge;
  if (!c || c.done) return;
  if (kind === 'hurt') {
    if (c.kind === 'nohit') {
      this.challengeNoHit = 0;
      c.have = 0;
    }
    return;
  }
  if (kind !== c.kind) return;
  c.have = Math.min(c.need, c.have + amount);
  if (c.have >= c.need) completeChallenge.call(this);
}

function completeChallenge(this: StreetBrawlEngine) {
  const c = this.challenge;
  if (!c) return;
  c.done = true;
  c.have = c.need;
  this.challengesDone += 1;
  const bonus = 750;
  this.score += Math.round(bonus * this.styleMult());
  const h = this.getActiveHero();
  h.rage = Math.min(100, h.rage + 40);
  soundEngine.playCheerPop();
  this.spawnComicPopup(h.x, 2.8, h.z, `CHALLENGE DONE! +${bonus}`, '#4ADE80');
}
