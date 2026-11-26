/**
 * Energy (stamina) shared by both fight engines. Every strike and dodge costs energy; it refills when you
 * stop swinging. Below TIRED_AT the fighter is gassed: slower strikes, weaker hits, no dodge invulnerability.
 */
const COST: Record<string, number> = {
  lp: 5,
  lp2: 6,
  rp: 11,
  kick: 9,
  sweep: 10,
  axe_kick: 12,
  spinning_heel_kick: 11,
  tornado_kick: 14,
  combo_finisher: 14,
  flying_side_kick: 12,
  jump_kick: 8,
  dash_attack: 10,
  throw_attempt: 8,
  back_elbow: 7,
};

export const DODGE_COST = 14;
export const TIRED_AT = 20;
/** Strikes take this much longer when tired */
export const TIRED_SLOW = 1.35;
/** Damage multiplier when tired */
export const TIRED_DMG = 0.7;

export function energyCost(move: string, scale = 1): number {
  return (COST[move] ?? 0) * scale;
}

/** Refill after a short breather: faster standing still than while moving */
export function regenEnergy(energy: number, idleFor: number, resting: boolean, dt: number): number {
  if (idleFor < 0.7) return energy;
  return Math.min(100, energy + (resting ? 26 : 16) * dt);
}
