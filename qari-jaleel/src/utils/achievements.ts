import { useSyncExternalStore } from 'react';
import { boughtLevels, TOTAL_LEVELS } from './upgrades';

/** Silly achievements. Each one grants a title you can show next to your name on the Hall of Fame. */
export interface RunSummary {
  endless: boolean;
  wave: number;
  score: number;
  victory: boolean;
  rank: string;
  totalDefeated: number;
  highestCombo: number;
  rickshawed: number;
  finishers: number;
  flawless: number;
  pickups: number;
  onBeat: number;
  bosses: number;
  perfectDodges: number;
  comboTriggers: number;
}

export interface LifetimeStats {
  runs: number;
  cousins: number;
  rickshawed: number;
  bosses: number;
  pickups: number;
}

export interface AchievementDef {
  id: string;
  title: string;
  desc: string;
  check: (run: RunSummary | null, life: LifetimeStats) => boolean;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first_run', title: 'Mohalla Rookie', desc: 'Finish your first fight', check: (_r, l) => l.runs >= 1 },
  { id: 'rickshaw5', title: 'Rickshaw Whisperer', desc: "Rickshaw 5 cousins in one run", check: (r) => !!r && r.rickshawed >= 5 },
  { id: 'rickshaw25', title: 'Road Safety Officer', desc: "25 cousins rickshaw'd in total", check: (_r, l) => l.rickshawed >= 25 },
  { id: 'combo15', title: 'Combo Chacha', desc: 'Land a 15-hit combo', check: (r) => !!r && r.highestCombo >= 15 },
  { id: 'wave5', title: 'Wave Walker', desc: 'Reach wave 5 in Endless', check: (r) => !!r && r.endless && r.wave >= 5 },
  { id: 'wave10', title: 'Mohalla Legend', desc: 'Reach wave 10 in Endless', check: (r) => !!r && r.endless && r.wave >= 10 },
  { id: 'wave20', title: 'Immortal Bhaiya', desc: 'Reach wave 20 in Endless', check: (r) => !!r && r.endless && r.wave >= 20 },
  { id: 'flawless3', title: 'Not A Scratch', desc: '3 flawless waves in one run', check: (r) => !!r && r.flawless >= 3 },
  { id: 'finisher8', title: 'Finisher Fanatic', desc: '8 finishers in one run', check: (r) => !!r && r.finishers >= 8 },
  { id: 'brawl_win', title: 'Pizza Hero', desc: 'Win Street Brawl', check: (r) => !!r && !r.endless && r.victory },
  { id: 'rank_s', title: 'Rank S Baby', desc: 'Earn an S rank in Street Brawl', check: (r) => !!r && !r.endless && r.rank === 'S' },
  { id: 'bosses3', title: 'Boss Basher', desc: 'Defeat 3 bosses in total', check: (_r, l) => l.bosses >= 3 },
  { id: 'snacks20', title: 'Samosa Slayer', desc: 'Grab 20 chai or snacks in total', check: (_r, l) => l.pickups >= 20 },
  { id: 'dodge5', title: 'Matrix Uncle', desc: '5 perfect dodges in one run', check: (r) => !!r && r.perfectDodges >= 5 },
  { id: 'combos5', title: 'Dream Team', desc: 'Trigger 5 squad combos in one run', check: (r) => !!r && r.comboTriggers >= 5 },
  { id: 'beat10', title: 'Dhol Dancer', desc: '10 on-beat hits in one run', check: (r) => !!r && r.onBeat >= 10 },
  { id: 'cousins100', title: 'Cousin Crusher', desc: 'Defeat 100 cousins in total', check: (_r, l) => l.cousins >= 100 },
  { id: 'score20k', title: 'Score Sultan', desc: 'Score 20,000 in Endless', check: (r) => !!r && r.endless && r.score >= 20000 },
  { id: 'runs10', title: 'Regular Customer', desc: 'Play 10 runs', check: (_r, l) => l.runs >= 10 },
  { id: 'chacha', title: "Chacha's Favourite", desc: "Put every item on Chacha Chai's menu", check: () => boughtLevels() >= TOTAL_LEVELS },
];

interface AchState {
  life: LifetimeStats;
  unlocked: Record<string, number>;
  equipped: string | null;
}

const KEY = 'mafia-bhaiyas-ach-v1';

function load(): AchState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<AchState>;
      return {
        life: { runs: 0, cousins: 0, rickshawed: 0, bosses: 0, pickups: 0, ...(p.life ?? {}) },
        unlocked: p.unlocked ?? {},
        equipped: p.equipped ?? null,
      };
    }
  } catch {
    // storage blocked
  }
  return { life: { runs: 0, cousins: 0, rickshawed: 0, bosses: 0, pickups: 0 }, unlocked: {}, equipped: null };
}

let state: AchState = load();
const listeners = new Set<() => void>();

function commit(next: AchState) {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
  listeners.forEach((l) => l());
}

export function getAch(): AchState {
  return state;
}

export function titleById(id: string | null): string | null {
  return ACHIEVEMENTS.find((a) => a.id === id)?.title ?? null;
}

export function equippedTitle(): string | null {
  return titleById(state.equipped);
}

export function equipTitle(id: string | null) {
  if (id === null || state.unlocked[id]) commit({ ...state, equipped: id });
}

/** Unlock any achievements that are now true. Returns the titles unlocked this time. */
function evaluate(run: RunSummary | null, base: AchState): { next: AchState; fresh: string[] } {
  const unlocked = { ...base.unlocked };
  const fresh: string[] = [];
  for (const a of ACHIEVEMENTS) {
    if (!unlocked[a.id] && a.check(run, base.life)) {
      unlocked[a.id] = Date.now();
      fresh.push(a.title);
    }
  }
  const firstNew = ACHIEVEMENTS.find((a) => unlocked[a.id] && !base.unlocked[a.id]);
  const equipped = base.equipped ?? (firstNew ? firstNew.id : null);
  return { next: { ...base, unlocked, equipped }, fresh };
}

/** Called when a run ends. Updates lifetime stats and returns the titles unlocked by this run. */
export function recordRun(run: RunSummary): string[] {
  const life: LifetimeStats = {
    runs: state.life.runs + 1,
    cousins: state.life.cousins + run.totalDefeated,
    rickshawed: state.life.rickshawed + run.rickshawed,
    bosses: state.life.bosses + run.bosses,
    pickups: state.life.pickups + run.pickups,
  };
  const { next, fresh } = evaluate(run, { ...state, life });
  commit(next);
  return fresh;
}

/** Re-check achievements that don't depend on a run (such as the chai menu). */
export function refreshAchievements() {
  const { next, fresh } = evaluate(null, state);
  if (fresh.length) commit(next);
}

export function useAch(): AchState {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
    () => state
  );
}
