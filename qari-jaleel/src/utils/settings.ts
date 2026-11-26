import { useSyncExternalStore } from 'react';
import { soundEngine } from '../engine/sound';

export type ButtonSize = 'S' | 'M' | 'L';

export interface GameSettings {
  /** 0..1 */
  musicVolume: number;
  musicMuted: boolean;
  buttonSize: ButtonSize;
  /** Strikes turn toward the nearest enemy when you are not steering */
  autoAim: boolean;
  /** Dhol beat ring + on-beat hit bonus */
  beatBonus: boolean;
  /** Immy keeps heart boxers on during Born To Run instead of going bare behind a censor prop */
  immyModest: boolean;
  /** Mirror the touch layout: attack buttons on the left, stick on the right */
  leftHanded: boolean;
  /** Street Brawl + Arcade cousin difficulty (Endless is always Normal so scores stay fair) */
  difficulty: 'novice' | 'pehelwan' | 'grandmaster';
}

const KEY = 'mafia-bhaiyas-settings-v1';
const DEFAULTS: GameSettings = { musicVolume: 0.55, musicMuted: false, buttonSize: 'M', autoAim: true, beatBonus: true, immyModest: false, leftHanded: false, difficulty: 'pehelwan' };

let current: GameSettings = load();
const listeners = new Set<() => void>();

function load(): GameSettings {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null;
    if (raw) return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<GameSettings>) };
  } catch {
    // storage blocked: use defaults
  }
  return { ...DEFAULTS };
}

function apply(s: GameSettings) {
  soundEngine.setMusicVolume(s.musicVolume);
  soundEngine.setMusicMuted(s.musicMuted);
}
apply(current);

export function getSettings(): GameSettings {
  return current;
}

export function updateSettings(patch: Partial<GameSettings>) {
  current = { ...current, ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    // ignore
  }
  apply(current);
  listeners.forEach((l) => l());
}

export function useSettings(): GameSettings {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => current
  );
}

export const BUTTON_SCALE: Record<ButtonSize, number> = { S: 0.88, M: 1, L: 1.2 };
