import { soundEngine } from '../sound';
import type { StreetBrawlEngine } from '../streetBrawlEngine';
import type { EnemyRuntime, HeroRuntime } from './types';

/**
 * Each fighter's own combo finisher (jab, jab, heavy). Same input for everyone, different payoff:
 * Fady stuns with hot chai, Saf tackles everything in front, Jav belly-bumps all around him,
 * Jam launches sky-high, Chet "crashes the stock" (target takes +25% for 4 s), Immy charms (dizzy).
 */
export const SIGNATURE_NAMES: Record<string, string> = {
  qari_jaleel: 'GARAM CHAI SPLASH!',
  rebel_aviator: 'FLEX TACKLE!',
  rebel_tactician: 'BELLY BUMP!',
  rebel_enforcer: 'DROP ME HOME UPPERCUT!',
  rebel_striker: 'STOCK CRASH!',
  rebel_shadow: 'CHARM SLAP!',
};

/** Called once when a finisher starts */
export function announceSignature(this: StreetBrawlEngine, hero: HeroRuntime) {
  const name = SIGNATURE_NAMES[hero.profile.id];
  if (!name) return;
  hero.callout = name;
  hero.calloutSeq++;
  hero.signatureDone = false;
}

/** Called for every cousin the finisher connects with */
export function signatureFinisherFx(this: StreetBrawlEngine, hero: HeroRuntime, e: EnemyRuntime) {
  const id = hero.profile.id;
  const dir = e.x >= hero.x ? 1 : -1;
  if (id === 'qari_jaleel') {
    // Hot chai in the face: everyone close in front is stunned
    if (!hero.signatureDone) {
      hero.signatureDone = true;
      this.spawnParticles(hero.x + hero.facing * 1.2, 1.4, hero.z, 18, 3.6);
      this.spawnComicPopup(hero.x + hero.facing * 1.2, 2.3, hero.z, 'GARAM CHAI!', '#F59E0B');
      for (const o of this.enemies) {
        if (!o.alive || o.spec.archetype === 'boss') continue;
        const front = (o.x - hero.x) * hero.facing;
        if (front > -0.2 && front < 2.8 && Math.abs(o.z - hero.z) < 1.1) {
          o.action = 'hitstun';
          o.actionTime = 0;
          o.actionDuration = 1.1;
          o.rig.hitKind = 0;
        }
      }
    }
  } else if (id === 'rebel_aviator') {
    // Shoulder tackle: big shove for everyone in front
    e.vx = hero.facing * 6.5;
    if (!hero.signatureDone) {
      hero.signatureDone = true;
      this.shakeIntensity = Math.max(this.shakeIntensity, 0.3);
      for (const o of this.enemies) {
        if (!o.alive || o.uid === e.uid) continue;
        const front = (o.x - hero.x) * hero.facing;
        if (front > 0 && front < 3 && Math.abs(o.z - hero.z) < 1.1) {
          hero.hitIdsThisSwing.add(o.uid);
          this.damageEnemy(o, hero, 10, true, hero.facing * 5.5, 2.6, 'TACKLED!');
        }
      }
    }
  } else if (id === 'rebel_tactician') {
    // Belly bump: launches everyone around him, front and back
    if (!hero.signatureDone) {
      hero.signatureDone = true;
      soundEngine.playHit(true);
      this.shakeIntensity = Math.max(this.shakeIntensity, 0.35);
      this.spawnDust(hero.x, hero.z, 8);
      for (const o of this.enemies) {
        if (!o.alive || o.uid === e.uid) continue;
        if (Math.hypot(o.x - hero.x, (o.z - hero.z) * 1.4) < 2.4) {
          hero.hitIdsThisSwing.add(o.uid);
          this.damageEnemy(o, hero, 12, true, (o.x >= hero.x ? 1 : -1) * 4.5, 4.2, 'BOING!');
        }
      }
    }
  } else if (id === 'rebel_enforcer') {
    // Uppercut to the moon
    if (e.alive) {
      e.vy = Math.max(e.vy, 8.2);
      e.vx = dir * 1.2;
      e.action = 'knockdown';
      e.actionTime = 0;
      e.actionDuration = 1.1;
    }
  } else if (id === 'rebel_striker') {
    // Stock crash: target takes extra damage for a while
    if (e.alive) {
      e.markTimer = 4;
      this.spawnComicPopup(e.x, 2.6, e.z, 'COUSIN PLC -25%', '#F87171');
    }
  } else if (id === 'rebel_shadow') {
    // Charm slap: the cousin goes weak at the knees
    if (e.alive && e.spec.archetype !== 'boss') {
      e.action = 'hitstun';
      e.actionTime = 0;
      e.actionDuration = 1.6;
      e.vx = 0;
      this.spawnComicPopup(e.x, 2.5, e.z, 'CHARMED!', '#F472B6');
    }
  }
}
