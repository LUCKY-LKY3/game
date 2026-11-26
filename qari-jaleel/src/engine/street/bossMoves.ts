// Boss special attacks (bound onto StreetBrawlEngine). Bosses rotate through `spec.bossMoves`:
//   volley : fan of flying slippers      summon : two cousins run in as reinforcements
//   charge : bull-rush at the hero        stomp  : ground-pound shockwave (jump it!)
import { soundEngine } from '../sound';
import type { StreetBrawlEngine } from '../streetBrawlEngine';
import type { EnemyRuntime, HeroRuntime } from './types';

const TELEGRAPH: Record<string, [string, string]> = {
  volley: ['SLIPPER STORM!', '#FACC15'],
  summon: ['REINFORCEMENTS!', '#38BDF8'],
  charge: ['BULL RUSH!', '#EF4444'],
  stomp: ['GROUND POUND!', '#F97316'],
};

/** Returns true when the boss is busy with a special this frame (skip normal AI). */
export function updateBossSpecials(this: StreetBrawlEngine, e: EnemyRuntime, dt: number, target: HeroRuntime): boolean {
  const moves = e.spec.bossMoves;
  if (!moves || !e.alive) return false;
  if (e.spec.specialsAfterRage && !e.phase2Rage) return false;

  // Final phase for the last boss: below 25% HP everything gets faster
  if (e.spec.specialsAfterRage && !e.phase3 && e.hp <= e.maxHp * 0.25) {
    e.phase3 = true;
    e.specialCooldown = 0.6;
    this.spawnComicPopup(e.x, 2.4, e.z, 'FINAL RAGE!', '#EF4444');
    this.shakeIntensity = Math.max(this.shakeIntensity, 0.4);
    soundEngine.playBossRoar();
  }

  // Bull-rush in progress: barrel straight at the hero until contact
  if (e.chargeTimer > 0) {
    e.chargeTimer -= dt;
    e.action = 'walk';
    e.x += e.facing * 9.5 * dt;
    e.z += Math.sign(target.z - e.z) * Math.min(Math.abs(target.z - e.z), 2.2 * dt);
    if (!e.hasHitThisSwing && Math.abs(target.x - e.x) < 1.5 && Math.abs(target.z - e.z) < 0.9) {
      this.checkEnemyAttackHit(e);
      if (e.hasHitThisSwing) e.chargeTimer = Math.min(e.chargeTimer, 0.05);
    }
    if (e.chargeTimer <= 0) {
      e.special = null;
      e.action = 'idle';
      e.aiCooldown = 0.6;
      e.specialCooldown = e.phase3 ? 2.4 : 4.4;
    }
    return true;
  }

  if (e.special) return false; // wind-up handled by the action loop
  e.specialCooldown -= dt;
  const busy = e.action === 'hitstun' || e.action === 'knockdown' || e.action === 'windup' || e.action === 'attack' || e.action === 'dizzy';
  if (e.specialCooldown > 0 || busy || this.shockwaveActive) return false;

  const move = moves[e.specialIdx % moves.length];
  e.specialIdx++;
  // Don't summon when the street is already crowded
  if (move === 'summon' && this.enemies.filter((o) => o.alive && o.uid !== e.uid).length >= 3) {
    e.specialCooldown = 1.2;
    return false;
  }
  e.special = move;
  e.specialFired = false;
  e.action = 'taunt';
  e.actionTime = 0;
  // Longer, readable wind-up on Easy/Normal
  e.actionDuration = (move === 'charge' ? 0.8 : 0.95) + [0.4, 0.2, 0][this.difficultyLevel];
  e.vx = 0;
  e.hitFlash = 0.8;
  this.bossWarning(move);
  const [text, color] = TELEGRAPH[move];
  this.spawnComicPopup(e.x, 2.3, e.z, text, color);
  soundEngine.playBossRoar();
  return true;
}

/** Called partway through the wind-up: the attack itself */
export function fireBossSpecial(this: StreetBrawlEngine, e: EnemyRuntime) {
  e.specialFired = true;
  const target = this.getActiveHero();
  e.specialCooldown = e.phase3 ? 2.4 : 4.4;
  switch (e.special) {
    case 'volley': {
      const count = e.phase2Rage ? 7 : 5;
      for (let k = 0; k < count; k++) {
        this.spawnEnemyChappal(e, target, (k - (count - 1) / 2) * 1.5, 7.2);
      }
      break;
    }
    case 'summon': {
      const zone = {
        index: 1,
        name: 'Reinforcements',
        lockMinX: this.lockedMinX,
        lockMaxX: this.lockedMaxX,
        triggerX: 0,
        wave1: [] as string[],
        wave2: [] as string[],
      };
      this.spawnWave(e.phase2Rage ? ['chintu', 'bunty', 'chintu'] : ['chintu', 'bunty'], zone, 0.9);
      break;
    }
    case 'charge': {
      e.facing = target.x >= e.x ? 1 : -1;
      e.chargeTimer = 0.85;
      e.hasHitThisSwing = false;
      soundEngine.playWhoosh(0.7);
      break;
    }
    case 'stomp': {
      e.action = 'boss_shockwave';
      e.actionTime = 0;
      e.actionDuration = 0.85;
      e.hasHitThisSwing = false;
      e.special = null;
      break;
    }
  }
}
