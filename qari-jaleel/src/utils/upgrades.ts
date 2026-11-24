import { useSyncExternalStore } from 'react';

/** Road to Chacha Chai's: chai coins and permanent upgrades, kept on this device. */
export type UpgradeId = 'masala_chai' | 'kebab_roll' | 'cold_lassi' | 'jalebi' | 'paratha' | 'falooda';

export interface UpgradeDef {
  id: UpgradeId;
  name: string;
  emoji: string;
  blurb: string;
  /** Price of each level; the length is the max level */
  costs: number[];
}

export const UPGRADES: UpgradeDef[] = [
  { id: 'masala_chai', name: 'Masala Chai', emoji: '☕', blurb: '+8 max health per cup', costs: [30, 50, 75, 105, 140] },
  { id: 'kebab_roll', name: 'Kebab Roll', emoji: '🌯', blurb: '+4% damage per roll', costs: [40, 65, 95, 130, 170] },
  { id: 'cold_lassi', name: 'Cold Lassi', emoji: '🥛', blurb: 'Power meter fills 8% faster', costs: [35, 55, 80, 110, 150] },
  { id: 'jalebi', name: 'Jalebi', emoji: '🍯', blurb: '+3% chance of chai and snack drops', costs: [30, 50, 75, 105] },
  { id: 'paratha', name: 'Paratha', emoji: '🥙', blurb: '+3 health between Endless waves', costs: [35, 60, 90, 125] },
  { id: 'falooda', name: 'Falooda', emoji: '🍨', blurb: 'Start fights with +10 power', costs: [45, 80, 120] },
];

export const TOTAL_LEVELS = UPGRADES.reduce((n, u) => n + u.costs.length, 0);

export interface ChaiState {
  coins: number;
  earned: number;
  levels: Partial<Record<UpgradeId, number>>;
}

const KEY = 'mafia-bhaiyas-chai-v1';

function load(): ChaiState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<ChaiState>;
      return { coins: Math.max(0, Number(p.coins) || 0), earned: Math.max(0, Number(p.earned) || 0), levels: p.levels ?? {} };
    }
  } catch {
    // storage blocked
  }
  return { coins: 0, earned: 0, levels: {} };
}

let state: ChaiState = load();
const listeners = new Set<() => void>();

function commit(next: ChaiState) {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
  listeners.forEach((l) => l());
}

export function getChai(): ChaiState {
  return state;
}

export function levelOf(id: UpgradeId): number {
  return state.levels[id] ?? 0;
}

export function addCoins(n: number) {
  const add = Math.max(0, Math.round(n));
  if (add > 0) commit({ ...state, coins: state.coins + add, earned: state.earned + add });
}

/** Returns true if the next level was bought */
export function buyUpgrade(id: UpgradeId): boolean {
  const def = UPGRADES.find((u) => u.id === id);
  if (!def) return false;
  const lvl = levelOf(id);
  if (lvl >= def.costs.length) return false;
  const cost = def.costs[lvl];
  if (state.coins < cost) return false;
  commit({ ...state, coins: state.coins - cost, levels: { ...state.levels, [id]: lvl + 1 } });
  return true;
}

export function boughtLevels(): number {
  return UPGRADES.reduce((n, u) => n + (state.levels[u.id] ?? 0), 0);
}

/** What the upgrades do in a fight */
export function getMods() {
  return {
    maxHpBonus: 8 * levelOf('masala_chai'),
    damageMul: 1 + 0.04 * levelOf('kebab_roll'),
    rageMul: 1 + 0.08 * levelOf('cold_lassi'),
    dropBonus: 0.03 * levelOf('jalebi'),
    waveHealBonus: 3 * levelOf('paratha'),
    startRage: 10 * levelOf('falooda'),
  };
}

export function useChai(): ChaiState {
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
