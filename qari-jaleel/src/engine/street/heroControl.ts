// Street brawl engine: heroControl methods (bound onto StreetBrawlEngine).
import * as THREE from 'three';
import { CombatAction, PlayerInputState } from '../../types/game';
import { soundEngine } from '../sound';
import { getSettings } from '../../utils/settings';
import { BufferedMoveKind, HeroRuntime, EnemyRuntime } from './types';
import { HERO_MOVES, LANE_MIN_Z, LANE_MAX_Z, triggerHaptic } from './data';
import type { StreetBrawlEngine } from '../streetBrawlEngine';

export function updateHeroWithInput(this: StreetBrawlEngine, hero: HeroRuntime, inp: PlayerInputState, dt: number) {
  if (hero.hp <= 0) {
    this.releaseClinch(hero);
    hero.action = 'ko';
    return;
  }

  hero.trailHp = THREE.MathUtils.damp(hero.trailHp, hero.hp, 4.5, dt);
  hero.hitFlash = Math.max(0, hero.hitFlash - dt * 5);
  hero.invulnTimer = Math.max(0, hero.invulnTimer - dt);
  hero.superArmorTimer = Math.max(0, hero.superArmorTimer - dt);
  hero.counterTimer = Math.max(0, hero.counterTimer - dt);
  if (hero.lpChainWindow > 0) {
    hero.lpChainWindow -= dt;
    if (hero.lpChainWindow <= 0) hero.lpChainStep = 0;
  }
  if (hero.kickChainWindow > 0) {
    hero.kickChainWindow -= dt;
    if (hero.kickChainWindow <= 0) hero.kickChainStep = 0;
  }
  if (hero.comboTimer > 0) {
    hero.comboTimer -= dt;
    if (hero.comboTimer <= 0) hero.comboCount = 0;
  }
  if (hero.bufferTimer > 0) {
    hero.bufferTimer -= dt;
    if (hero.bufferTimer <= 0) hero.bufferedAction = null;
  }

  // Track exact moment Guard is raised for Timed Parry Window (0.24s)
  if (inp.block && !hero.wasBlocking) {
    hero.blockStartElapsed = this.elapsed;
  }
  hero.wasBlocking = inp.block;

  const wantLp = inp.lpPressed;
  const wantRp = inp.rpPressed;
  const wantKick = inp.kickPressed;
  const wantThrow = inp.throwPressed;
  const wantSidestep = inp.sidestepPressed;
  const wantRage = inp.ragePressed;
  const wantPanic = inp.panicSpecialPressed || (inp.block && wantRp);
  const wantJump = inp.jumpPressed;
  const dashDir = inp.dashDir;
  inp.lpPressed = false;
  inp.rpPressed = false;
  inp.kickPressed = false;
  inp.throwPressed = false;
  inp.sidestepPressed = false;
  inp.ragePressed = false;
  inp.panicSpecialPressed = false;
  inp.jumpPressed = false;
  inp.dashDir = 0;

  if (this.isPowerupAction(hero.action)) {
    this.releaseClinch(hero);
    this.stepHeroPowerup(hero, dt);
    return;
  }

  // ── RIDEABLE RAJU SPLENDOR MOTORBIKE RAMPAGE! ────────────────────────────
  if (hero.ridingBikeTimer > 0) {
    hero.ridingBikeTimer = Math.max(0, hero.ridingBikeTimer - dt);
    hero.invulnTimer = Math.max(hero.invulnTimer, 0.25);
    const steerX = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
    const steerZ = (inp.down ? 1 : 0) - (inp.up ? 1 : 0);
    if (steerX !== 0) hero.facing = steerX > 0 ? 1 : -1;

    hero.vx = hero.facing * 9.8;
    hero.vz = steerZ * 4.4;
    hero.x += hero.vx * dt;
    hero.z += hero.vz * dt;
    this.clampHeroPosition(hero);
    // Bounce off zone boundaries cleanly to keep trampling!
    if (hero.x <= this.lockedMinX + 0.65 && hero.facing === -1) {
      hero.facing = 1;
      soundEngine.playBikeRev();
    } else if (hero.x >= (this.zoneCleared ? 44.0 : this.lockedMaxX - 0.65) && hero.facing === 1) {
      hero.facing = -1;
      soundEngine.playBikeRev();
    }

    const bike = this.stage.splendorBike;
    bike.state = 'ridden';
    bike.x = hero.x;
    bike.z = hero.z;
    bike.facing = hero.facing;
    hero.action = 'sprint';

    // Exhaust dust trail
    hero.sprintDustTimer -= dt;
    if (hero.sprintDustTimer <= 0) {
      hero.sprintDustTimer = 0.08;
      this.spawnParticles(hero.x - hero.facing * 0.75, 0.25, hero.z, 3, 2.0);
    }

    // Trample every cousin in path with SPLENDOR RAMPAGE!
    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      if (!e.alive || hero.bikeRamHitUids.has(e.uid)) continue;
      if (Math.abs(e.x - hero.x) < 1.55 && Math.abs(e.z - hero.z) < 1.05) {
        hero.bikeRamHitUids.add(e.uid);
        soundEngine.playCarCrash();
        this.damageEnemy(e, hero, 36, true, hero.facing * 5.2, 5.2, 'SPLENDOR RAMPAGE!');
        this.shakeIntensity = Math.max(this.shakeIntensity, 0.26);
        this.hitstopTimer = Math.max(this.hitstopTimer, 0.045);
        triggerHaptic(55);
      }
    }
    // Allow re-hitting enemies after 0.55s if looping back!
    if (Math.floor((hero.ridingBikeTimer + dt) * 2) !== Math.floor(hero.ridingBikeTimer * 2)) {
      hero.bikeRamHitUids.clear();
    }

    // Dismount when sputtered out or Jump pressed
    if (hero.ridingBikeTimer <= 0 || wantJump) {
      hero.ridingBikeTimer = 0;
      bike.state = 'hidden';
      hero.vy = 5.4;
      hero.y = 0.1;
      hero.action = 'jump';
      this.spawnParticles(hero.x, 0.5, hero.z, 16, 3.8);
      this.spawnComicPopup(hero.x, 1.9, hero.z, 'BIKE SPUTTERED!', '#F59E0B');
    }
    return;
  }

  // ── RISK-REWARD PANIC SPECIAL (Can interrupt hitstun or idle even when POWER isn't full!) ──
  if (wantPanic && hero.hp > 6 && hero.action !== 'panic_special') {
    this.performPanicSpecial(hero);
    return;
  }

  // ── ENEMY COOPERATIVE REAR-GRAB ESCAPE (`MASH JAB!` OR `SWITCH` RESCUE) ──
  if (this.grabbedByEnemyUid !== null && hero.index === this.activeHeroIndex) {
    const grabber = this.enemies.find((e) => e.uid === this.grabbedByEnemyUid && e.alive);
    if (!grabber || grabber.action !== 'rear_grab') {
      this.releaseRearGrab();
    } else {
      this.grabHoldTimer -= dt;
      hero.action = 'grabbed_struggle';
      hero.actionTime += dt;
      hero.vx = 0;
      hero.vz = 0;
      grabber.x = hero.x - hero.facing * 0.68;
      grabber.z = hero.z;
      grabber.facing = hero.facing;
      if (wantLp || wantRp || wantKick) {
        this.grabEscapeProgress = Math.min(1, this.grabEscapeProgress + 0.34);
        this.spawnParticles(hero.x, 1.15, hero.z, 5, 2.2);
        soundEngine.playWhoosh(1.3);
      }
      if (this.grabEscapeProgress >= 1 || this.grabHoldTimer <= 0) {
        const escaped = this.grabEscapeProgress >= 1;
        this.releaseRearGrab();
        hero.action = 'idle';
        hero.actionTime = 0;
        hero.actionDuration = 0;
        hero.invulnTimer = 0.45;
        if (escaped) {
          soundEngine.playHit(true);
          this.damageEnemy(grabber, hero, 14, true, -hero.facing * 3.4, 2.6, 'BREAK FREE!');
        }
      }
      return;
    }
  }

  // ── ACTIVE CLINCH / HEADLOCK STATE (3-HIT KNEE -> SHOULDER THROW COMBO!) ──
  if (hero.clinchTargetUid !== null) {
    const target = this.enemies.find((e) => e.uid === hero.clinchTargetUid && e.alive);
    if (!target || hero.action === 'hitstun' || hero.action === 'knockdown') {
      this.releaseClinch(hero);
    } else {
      hero.clinchTimer -= dt;
      // Keep clinched cousin locked directly in front of hero
      target.x = hero.x + hero.facing * 0.82;
      target.z = hero.z;
      target.y = 0;
      target.vx = 0;
      target.vy = 0;
      target.action = 'clinched';
      target.actionDuration = Math.max(target.actionDuration, 0.4);

      if (hero.action === 'clinch_knee') {
        hero.actionTime += dt;
        if (hero.actionTime >= hero.actionDuration) {
          if (!target.alive) {
            this.releaseClinch(hero);
            hero.action = 'idle';
            hero.actionTime = 0;
            hero.actionDuration = 0;
          } else if (hero.clinchKnees >= 3) {
            // Classic Double Dragon 3-hit Knee-to-Shoulder-Throw automatic combo finisher!
            const throwDir: 1 | -1 = inp.left ? -1 : inp.right ? 1 : hero.facing;
            this.hurlClinchedEnemy(hero, target, throwDir);
          } else {
            hero.action = 'clinch';
            hero.actionTime = 0;
            hero.actionDuration = 0;
          }
        }
        return;
      }

      // Left/Right + HOOK (or Grab/Throw) hurls the cousin across the lane like a bowling ball!
      if (wantRp || wantThrow) {
        const throwDir: 1 | -1 = inp.left ? -1 : inp.right ? 1 : hero.facing;
        this.hurlClinchedEnemy(hero, target, throwDir);
        return;
      }

      // JAB delivers rapid clinch knee strikes (3rd knee chains automatically into Shoulder Throw!)
      if (wantLp || wantKick) {
        hero.clinchKnees += 1;
        hero.action = 'clinch_knee';
        hero.actionTime = 0;
        hero.actionDuration = 0.2;
        const isThirdKnee = hero.clinchKnees >= 3;
        soundEngine.playHit(isThirdKnee);
        this.damageEnemy(
          target,
          hero,
          isThirdKnee ? 15 : 12,
          false,
          0,
          0,
          isThirdKnee ? 'KNEE x3!' : 'KNEE!'
        );
        if (target.alive) {
          target.action = 'clinched';
          target.actionDuration = 0.6;
        } else {
          this.releaseClinch(hero);
        }
        hero.rage = Math.min(100, hero.rage + 10);
        this.hitstopTimer = Math.max(this.hitstopTimer, isThirdKnee ? 0.05 : 0.038);
        this.shakeIntensity = Math.max(this.shakeIntensity, isThirdKnee ? 0.16 : 0.1);
        return;
      }

      if (wantSidestep || hero.clinchTimer <= 0) {
        this.releaseClinch(hero);
        if (wantSidestep) {
          this.performDodgeSidestep(hero, inp);
          return;
        }
        hero.action = 'idle';
        return;
      }

      hero.action = 'clinch';
      return;
    }
  }

  // ── AIRBORNE JUMP & AERIAL COMBO PHYSICS ─────────────────────────────────
  if (hero.y > 0.001 || hero.vy > 0) {
    if (!hero.aerialAttackUsed && hero.action !== 'hitstun' && hero.action !== 'knockdown') {
      if (wantRp) {
        // Jump + Hook -> Diving Ground Slam!
        hero.aerialAttackUsed = true;
        hero.isJumpSlamming = true;
        hero.action = 'jump_slam';
        hero.actionTime = 0;
        hero.actionDuration = 0.65;
        hero.vy = Math.min(hero.vy, -12.8);
        hero.vx = hero.facing * 2.6;
        soundEngine.playWhoosh(0.75);
      } else if (wantKick) {
        // Jump + Kick -> Iconic Bruce Lee Flying Side Kick!
        hero.aerialAttackUsed = true;
        this.startHeroMove(hero, 'flying_side_kick');
        hero.vx = hero.facing * Math.max(Math.abs(hero.vx), 6.4);
        hero.vy = Math.max(hero.vy, 1.4);
      } else if (wantLp) {
        // Jump + Jab -> Aerial Jump Kick!
        hero.aerialAttackUsed = true;
        this.startHeroMove(hero, 'jump_kick');
        hero.vx = hero.facing * Math.max(Math.abs(hero.vx), 4.6);
      }
    }

    if (HERO_MOVES[hero.action]) {
      hero.actionTime += dt;
      this.evaluateHeroAttackHits(hero);
    } else if (hero.action === 'jump_slam') {
      hero.actionTime += dt;
    }

    // Snappy arcade gravity & light air steering
    const airMoveX = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
    const airMoveZ = (inp.down ? 1 : 0) - (inp.up ? 1 : 0);
    if (!hero.isJumpSlamming) {
      if (airMoveX !== 0) {
        hero.vx = THREE.MathUtils.lerp(hero.vx, airMoveX * 5.2, Math.min(1, dt * 6));
        hero.facing = airMoveX > 0 ? 1 : -1;
      }
      hero.vz = THREE.MathUtils.lerp(hero.vz, airMoveZ * 2.6, Math.min(1, dt * 6));
    }

    hero.x += hero.vx * dt;
    hero.z += hero.vz * dt;
    hero.y += hero.vy * dt;
    hero.vy -= 24.5 * dt;

    if (hero.y <= 0) {
      hero.y = 0;
      hero.vy = 0;
      hero.aerialAttackUsed = false;
      hero.landingSquashTimer = 0.18;
      if (hero.isJumpSlamming) {
        this.triggerJumpGroundSlamImpact(hero);
      } else {
        // Grounded landing dust puff & squash!
        this.spawnParticles(hero.x, 0.08, hero.z, 8, 2.2);
        if (
          hero.action === 'jump' ||
          hero.action === 'jump_kick' ||
          hero.action === 'flying_side_kick'
        ) {
          hero.action = 'idle';
          hero.actionTime = 0;
          hero.actionDuration = 0;
        }
      }
    }

    this.clampHeroPosition(hero);
    return;
  }

  // ── LOCKED ACTION FRAMES (WITH 150ms INPUT BUFFERING & LIGHT-JAB CANCELS) ─
  if (hero.actionDuration > 0) {
    const isLightJab = hero.action === 'lp' || hero.action === 'lp2';

    // Allow GUARD or STEP 3D dodge to cancel immediately out of light jabs!
    if (isLightJab && hero.actionTime >= 0.06) {
      if (wantSidestep) {
        hero.bufferedAction = null;
        hero.bufferTimer = 0;
        this.performDodgeSidestep(hero, inp);
        return;
      }
      if (inp.block) {
        hero.bufferedAction = null;
        hero.bufferTimer = 0;
        hero.action = 'block';
        hero.actionTime = 0;
        hero.actionDuration = 0;
        hero.vx *= 0.3;
        hero.vz *= 0.3;
        return;
      }
    }

    // Buffer next strike during short cancel window near end of recovery!
    const remaining = hero.actionDuration - hero.actionTime;
    if (remaining <= 0.3 && hero.action !== 'hitstun' && hero.action !== 'knockdown') {
      if (wantLp) {
        hero.bufferedAction = 'lp';
        hero.bufferTimer = 0.3;
      } else if (wantRp) {
        hero.bufferedAction = 'rp';
        hero.bufferTimer = 0.3;
      } else if (wantKick) {
        hero.bufferedAction = 'kick';
        hero.bufferTimer = 0.3;
      } else if (wantThrow) {
        hero.bufferedAction = 'throw';
        hero.bufferTimer = 0.3;
      } else if (wantJump) {
        hero.bufferedAction = 'jump';
        hero.bufferTimer = 0.3;
      } else if (wantSidestep) {
        hero.bufferedAction = 'dodge';
        hero.bufferTimer = 0.3;
      }
    }

    hero.actionTime += dt;
    if (HERO_MOVES[hero.action]) {
      this.evaluateHeroAttackHits(hero);
    }
    // Characters stay firmly planted during grounded attacks (only hitstun/knockdown/dash/dodge move)
    const canSlideInAction =
      hero.action === 'hitstun' ||
      hero.action === 'knockdown' ||
      hero.action === 'dash_attack' ||
      hero.action === 'sidestep_in' ||
      hero.action === 'sidestep_out' ||
      hero.action === 'rescue_dropkick';
    if (canSlideInAction) {
      hero.x += hero.vx * dt;
      hero.vx *= Math.exp(-8.5 * dt);
      hero.z += hero.vz * dt;
      hero.vz *= Math.exp(-10 * dt);
    } else {
      hero.vx = 0;
      hero.vz = 0;
    }
    this.clampHeroPosition(hero);

    if (hero.actionTime >= hero.actionDuration) {
      hero.action = 'idle';
      hero.actionTime = 0;
      hero.actionDuration = 0;
      // Immediately fire any buffered input on the very first recovery frame!
      if (hero.bufferedAction && hero.bufferTimer > 0) {
        const nextBuf = hero.bufferedAction;
        hero.bufferedAction = null;
        hero.bufferTimer = 0;
        this.executeHeroCombatInput(hero, nextBuf, inp);
      }
    }
    return;
  }

  // ── FREE GROUNDED ACTION DISPATCH ────────────────────────────────────────
  if (wantRage && hero.rage >= 100) {
    hero.isSprinting = false;
    this.startHeroPowerup(hero);
    return;
  }

  // Hurl throwable plastic stool or coconut on any attack button!
  if (hero.heldWeapon?.throwable && (wantLp || wantRp || wantThrow)) {
    hero.isSprinting = false;
    this.throwHeldProp(hero);
    return;
  }

  if (wantJump) {
    hero.isSprinting = false;
    hero.vy = 8.9;
    hero.y = 0.04;
    hero.aerialAttackUsed = false;
    hero.isJumpSlamming = false;
    hero.action = 'jump';
    hero.actionTime = 0;
    hero.actionDuration = 0;
    this.spawnParticles(hero.x, 0.08, hero.z, 7, 2.0);
    soundEngine.playJump();
    return;
  }

  if (wantSidestep) {
    this.performDodgeSidestep(hero, inp);
    return;
  }

  // Mid-sprint Kick -> Blazing Flying Side Kick! Mid-sprint Jab/Hook -> Shoulder Charge!
  if (hero.isSprinting && wantKick) {
    hero.isSprinting = false;
    this.startHeroMove(hero, 'flying_side_kick');
    hero.vx = hero.facing * 8.4;
    hero.vy = 4.6;
    hero.y = 0.06;
    hero.aerialAttackUsed = true;
    this.spawnParticles(hero.x, 0.14, hero.z, 10, 3.0);
    soundEngine.playKickWhoosh(1.18);
    return;
  }
  if (hero.isSprinting && (wantLp || wantRp)) {
    hero.isSprinting = false;
    this.startHeroMove(hero, 'dash_attack');
    hero.vx = hero.facing * 7.8;
    if (hero.style === 'bollywood_hero' || hero.style === 'kalari_kicker') {
      hero.vy = 2.8;
      hero.y = 0.04;
    } else {
      hero.superArmorTimer = 0.38;
    }
    this.spawnParticles(hero.x, 0.14, hero.z, 9, 2.8);
    soundEngine.playDash();
    return;
  }

  if (wantLp) {
    this.executeHeroCombatInput(hero, 'lp', inp);
    return;
  }
  if (wantRp) {
    this.executeHeroCombatInput(hero, 'rp', inp);
    return;
  }
  if (wantKick) {
    this.executeHeroCombatInput(hero, 'kick', inp);
    return;
  }
  if (wantThrow) {
    // Mount idling Raju Splendor motorbike if standing close to it!
    const bike = this.stage.splendorBike;
    if (
      bike.state === 'idle' &&
      Math.hypot(hero.x - bike.x, hero.z - bike.z) <= 1.85
    ) {
      this.releaseClinch(hero);
      hero.ridingBikeTimer = 4.8;
      hero.bikeRamHitUids.clear();
      hero.x = bike.x;
      hero.z = bike.z;
      hero.facing = bike.facing;
      bike.state = 'ridden';
      soundEngine.playBikeRev();
      this.spawnParticles(bike.x, 0.5, bike.z, 16, 3.8);
      this.spawnComicPopup(hero.x, 2.0, hero.z, 'SPLENDOR RAMPAGE!', '#FACC15');
      this.pickupSeq++;
      this.pickupToast = 'SPLENDOR RAMPAGE! STEER WITH WASD/STICK TO TRAMPLE COUSINS!';
      this.pickupToastTimer = 2.4;
      triggerHaptic(55);
      return;
    }
    this.executeHeroCombatInput(hero, 'throw', inp);
    return;
  }

  if (inp.block) {
    hero.isSprinting = false;
    hero.vx *= Math.exp(-14 * dt);
    hero.vz *= Math.exp(-14 * dt);
    hero.action = 'block';
    return;
  }

  // ── WEIGHTY 2.5D BELT-SCROLLER MOVEMENT (0.08s ACCEL, 0.10s FRICTION, 75% Z) ──
  const moveX = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
  const moveZ = (inp.down ? 1 : 0) - (inp.up ? 1 : 0);

  // Double-tap Left/Right or Joystick Flick triggers forward Sprint!
  if (dashDir !== 0) {
    hero.isSprinting = true;
    hero.sprintDir = dashDir;
    hero.facing = dashDir;
    hero.vx = dashDir * 6.8;
    this.spawnParticles(hero.x - dashDir * 0.25, 0.08, hero.z, 8, 2.2);
    soundEngine.playDash();
  }

  if (hero.isSprinting) {
    if (moveX === 0 || (hero.sprintDir !== 0 && Math.sign(moveX) !== hero.sprintDir)) {
      hero.isSprinting = false;
      hero.sprintDir = 0;
    }
  }

  // Brisk Classic Double Dragon Arcade Rhythm movement!
  const styleSpeedBonus =
    hero.profile.id === 'rebel_enforcer' ? 1.15 : hero.style === 'lazy_giant' ? -1.3 : hero.style === 'kalari_kicker' ? 0.72 : hero.style === 'kung_fu_master' ? 0.6 : hero.style === 'street_boxer' ? 0.42 : 0;
  const baseSpeedX = 5.85 + hero.profile.stats.speed * 0.14 + styleSpeedBonus;
  const maxSpeedX = hero.isSprinting ? baseSpeedX * 1.48 : baseSpeedX;
  // Responsive Z-strafe for our +30% wider village lane
  const maxSpeedZ = baseSpeedX * 0.78;

  let targetVx = 0;
  let targetVz = 0;
  if (moveX !== 0 || moveZ !== 0) {
    const len = Math.hypot(moveX, moveZ);
    targetVx = (moveX / len) * maxSpeedX;
    targetVz = (moveZ / len) * maxSpeedZ;
    if (moveX !== 0) hero.facing = moveX > 0 ? 1 : -1;
  }

  // Smooth weighted acceleration (0.13s ease-in) and gentle slide-to-stop deceleration (0.16s)
  const stepAxis = (cur: number, target: number, maxSp: number) => {
    const rate = Math.abs(target) > 0.01 ? maxSp / 0.13 : maxSp / 0.16;
    const diff = target - cur;
    const maxDelta = rate * dt;
    if (Math.abs(diff) <= maxDelta) return target;
    return cur + Math.sign(diff) * maxDelta;
  };

  hero.vx = stepAxis(hero.vx, targetVx, maxSpeedX);
  hero.vz = stepAxis(hero.vz, targetVz, maxSpeedZ);

  hero.x += hero.vx * dt;
  hero.z += hero.vz * dt;

  const planarSpeed = Math.hypot(hero.vx, hero.vz);
  if (hero.isSprinting && planarSpeed > 3.0) {
    hero.action = 'sprint';
    hero.sprintDustTimer -= dt;
    if (hero.sprintDustTimer <= 0) {
      hero.sprintDustTimer = 0.11;
      this.spawnParticles(hero.x - hero.facing * 0.3, 0.06, hero.z, 3, 1.5);
    }
  } else if (planarSpeed > 0.45) {
    hero.action = 'walk_fwd';
  } else {
    hero.action = 'idle';
  }

  this.clampHeroPosition(hero);

  // Contextual Clinch: walking close to a stunned cousin automatically locks them in a collar grab!
  if (moveX !== 0 || moveZ !== 0) {
    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      if (!e.alive || e.onBike || e.bowlingActive || e.action !== 'hitstun') continue;
      if (Math.abs(e.x - hero.x) <= 1.05 && Math.abs(e.z - hero.z) <= 0.65) {
        this.startClinch(hero, e);
        break;
      }
    }
  }
}

export function executeHeroCombatInput(this: StreetBrawlEngine,
  hero: HeroRuntime,
  kind: BufferedMoveKind,
  inp: PlayerInputState
) {
  hero.isSprinting = false;
  if (kind === 'dodge') {
    this.performDodgeSidestep(hero, inp);
    return;
  }
  if (kind === 'jump') {
    hero.vy = 8.9;
    hero.y = 0.04;
    hero.aerialAttackUsed = false;
    hero.isJumpSlamming = false;
    hero.action = 'jump';
    hero.actionTime = 0;
    hero.actionDuration = 0;
    soundEngine.playJump();
    return;
  }
  if (kind === 'lp') {
    // Classic Double Dragon Back-Elbow: holding opposite direction + JAB punishes flanking cousins behind you!
    const holdingOpposite =
      (inp.left && hero.facing === 1) || (inp.right && hero.facing === -1);
    if (holdingOpposite) {
      this.startHeroMove(hero, 'back_elbow');
      return;
    }
    // Street Boxer gets a lightning 4-hit flurry (Jab -> Cross -> Body -> Uppercut Finisher!)
    const maxChain = hero.style === 'street_boxer' || hero.style === 'kung_fu_master' ? 4 : 3;
    const step = hero.lpChainStep;
    const nextMove: CombatAction =
      step === 0
        ? 'lp'
        : step === 1
          ? 'lp2'
          : maxChain === 4 && step === 2
            ? 'lp'
            : 'combo_finisher';
    hero.lpChainStep = (step + 1) % maxChain;
    hero.lpChainWindow = 0.78;
    this.startHeroMove(hero, nextMove);
    return;
  }
  if (kind === 'rp') {
    // Dizzy FINISH! Takedown check (invulnerable signature finisher!)
    const dizzyTarget = this.enemies.find(
      (e) =>
        e.alive &&
        e.action === 'dizzy' &&
        Math.abs(e.x - hero.x) <= 2.15 &&
        Math.abs(e.z - hero.z) <= 1.15
    );
    if (dizzyTarget) {
      this.executeSignatureFinisher(hero, dizzyTarget);
      return;
    }
    // If a stunned cousin is right in front of us, Heavy grabs & hurls them immediately!
    const closeStunned = this.enemies.find(
      (e) =>
        e.alive &&
        !e.onBike &&
        e.action === 'hitstun' &&
        Math.abs(e.x - hero.x) <= 1.25 &&
        Math.abs(e.z - hero.z) <= 0.75
    );
    if (closeStunned && (inp.left || inp.right)) {
      const dir: 1 | -1 = inp.left ? -1 : 1;
      this.hurlClinchedEnemy(hero, closeStunned, dir);
      return;
    }
    this.startHeroMove(hero, 'rp');
    if (hero.style === 'kushti_pehelwan') {
      hero.superArmorTimer = 0.4;
    } else if (hero.style === 'kalari_kicker') {
      hero.vy = 2.6;
      hero.y = 0.04;
    }
    return;
  }
  if (kind === 'kick') {
    // Martial Arts Kick Repertoire:
    // 1) Down + Kick -> Dragon Low Sweep (360° trip!)
    // 2) Up + Kick -> Overhead Crescent Axe Kick (guard-crushing bounce!)
    // 3) Punch-to-Kick mixup OR 3-hit Kick Chain: Roundhouse -> 360° Spin Heel -> 540° Tornado Kick!
    if (inp.down && !inp.up) {
      hero.kickChainStep = 0;
      hero.kickChainWindow = 0;
      this.startHeroMove(hero, 'sweep');
      return;
    }
    if (inp.up && !inp.down) {
      hero.kickChainStep = 0;
      hero.kickChainWindow = 0;
      this.startHeroMove(hero, 'axe_kick');
      return;
    }

    // Seamless Punch -> Kick martial arts combo chains (F -> H = Spin Heel, F -> F -> H = Tornado!)
    let step = hero.kickChainStep;
    if (hero.lpChainWindow > 0 && hero.lpChainStep > 0) {
      step = hero.lpChainStep >= 2 ? 2 : 1;
      hero.lpChainStep = 0;
      hero.lpChainWindow = 0;
    }

    if (step === 0) {
      hero.kickChainStep = 1;
      hero.kickChainWindow = 0.85;
      this.startHeroMove(hero, 'kick');
    } else if (step === 1) {
      hero.kickChainStep = 2;
      hero.kickChainWindow = 0.85;
      this.startHeroMove(hero, 'spinning_heel_kick');
    } else {
      hero.kickChainStep = 0;
      hero.kickChainWindow = 0;
      this.startHeroMove(hero, 'tornado_kick');
      hero.vy = 3.2;
      hero.y = 0.04;
    }
    return;
  }
  if (kind === 'throw') {
    // Dizzy FINISH! Takedown check on GRAB too!
    const dizzyTarget = this.enemies.find(
      (e) =>
        e.alive &&
        e.action === 'dizzy' &&
        Math.abs(e.x - hero.x) <= 2.15 &&
        Math.abs(e.z - hero.z) <= 1.15
    );
    if (dizzyTarget) {
      this.executeSignatureFinisher(hero, dizzyTarget);
      return;
    }
    const grabTarget = this.enemies.find(
      (e) =>
        e.alive &&
        !e.onBike &&
        !e.bowlingActive &&
        Math.abs(e.x - hero.x) <= 1.38 &&
        Math.abs(e.z - hero.z) <= 0.78
    );
    if (grabTarget) {
      this.startClinch(hero, grabTarget);
    } else {
      this.startHeroMove(hero, 'throw_execute');
    }
  }
}

export function performDodgeSidestep(this: StreetBrawlEngine, hero: HeroRuntime, inp: PlayerInputState) {
  this.releaseClinch(hero);
  hero.isSprinting = false;
  const dodgeDirZ = inp.up ? -1 : inp.down ? 1 : hero.z > 0 ? -1 : 1;
  hero.z = THREE.MathUtils.clamp(hero.z + dodgeDirZ * 1.25, LANE_MIN_Z, LANE_MAX_Z);
  hero.vx = hero.facing * 2.2;
  hero.vz = 0;
  hero.invulnTimer = 0.36;
  hero.action = dodgeDirZ < 0 ? 'sidestep_in' : 'sidestep_out';
  hero.actionTime = 0;
  hero.actionDuration = 0.24;
  this.spawnParticles(hero.x, 0.12, hero.z, 7, 2.2);
  soundEngine.playWhoosh(1.28);
}

export function startClinch(this: StreetBrawlEngine, hero: HeroRuntime, target: EnemyRuntime) {
  hero.clinchTargetUid = target.uid;
  hero.clinchTimer = 2.0;
  hero.clinchKnees = 0;
  hero.isSprinting = false;
  hero.vx = 0;
  hero.vz = 0;
  hero.facing = target.x >= hero.x ? 1 : -1;
  hero.action = 'clinch';
  hero.actionTime = 0;
  hero.actionDuration = 0;
  target.action = 'clinched';
  target.actionTime = 0;
  target.actionDuration = 2.2;
  target.vx = 0;
  target.vy = 0;
  target.facing = hero.facing === 1 ? -1 : 1;
  target.x = hero.x + hero.facing * 0.82;
  target.z = hero.z;
  soundEngine.playWhoosh(0.95);
  triggerHaptic(25);
}

export function hurlClinchedEnemy(this: StreetBrawlEngine, hero: HeroRuntime, target: EnemyRuntime, throwDir: 1 | -1) {
  hero.clinchTargetUid = null;
  hero.clinchTimer = 0;
  hero.clinchKnees = 0;
  hero.facing = throwDir;
  hero.action = 'throw_execute';
  hero.actionTime = 0;
  hero.actionDuration = 0.36;
  hero.hitIdsThisSwing.clear();
  hero.hitIdsThisSwing.add(target.uid);
  hero.callout = 'BOWLING THROW!';
  hero.calloutSeq++;

  // Launch enemy horizontally across the lane like a bowling ball!
  target.facing = throwDir === 1 ? -1 : 1;
  target.x = hero.x + throwDir * 0.95;
  target.z = hero.z;
  target.y = 0.38;
  target.vx = throwDir * 13.4;
  target.vy = 2.6;
  target.bowlingActive = true;
  target.bowlingOwnerIdx = hero.index;
  target.bowlingHitUids.clear();
  target.bowlingHitUids.add(target.uid);
  target.action = 'bowled';
  target.actionTime = 0;
  target.actionDuration = 0.82;

  this.damageEnemy(target, hero, 22, true, throwDir * 13.4, 2.6, 'DHISHUM!');
  target.action = 'bowled';
  target.actionDuration = 0.82;
  target.bowlingActive = true;
  soundEngine.playWhoosh(0.72);
  this.hitstopTimer = Math.max(this.hitstopTimer, 0.055);
  this.shakeIntensity = Math.max(this.shakeIntensity, 0.22);
  triggerHaptic(60);
}

export function releaseClinch(this: StreetBrawlEngine, hero: HeroRuntime) {
  if (hero.clinchTargetUid !== null) {
    const target = this.enemies.find((e) => e.uid === hero.clinchTargetUid);
    if (target && target.alive && target.action === 'clinched') {
      target.action = 'idle';
      target.actionTime = 0;
      target.actionDuration = 0;
    }
    hero.clinchTargetUid = null;
    hero.clinchTimer = 0;
    hero.clinchKnees = 0;
  }
}

export function throwHeldProp(this: StreetBrawlEngine, hero: HeroRuntime) {
  const w = hero.heldWeapon;
  if (!w || !w.throwable) return;
  const slot = this.projectiles.find((p) => !p.active && p.kind === w.kind);
  if (slot) {
    slot.active = true;
    slot.fromHero = true;
    slot.ownerHeroIdx = hero.index;
    slot.x = hero.x + hero.facing * 0.7;
    slot.y = 1.15;
    slot.z = hero.z;
    slot.vx = hero.facing * (w.kind === 'coconut' ? 12.2 : 10.2);
    slot.vy = 1.6;
    slot.life = 1.4;
    slot.damage = w.kind === 'stool' ? 34 : 30;
    slot.hitUids.clear();
    slot.mesh.position.set(slot.x, slot.y, slot.z);
    slot.mesh.visible = true;
    soundEngine.playWhoosh(0.8);
  }
  hero.heldWeapon = null;
  this.syncHeroWeaponVisuals(hero);
  hero.action = 'rp';
  hero.actionTime = 0;
  hero.actionDuration = 0.28;
  hero.callout = w.kind === 'stool' ? 'STOOL TOSS!' : 'COCONUT BOMB!';
  hero.calloutSeq++;
}

export function triggerJumpGroundSlamImpact(this: StreetBrawlEngine, hero: HeroRuntime) {
  hero.isJumpSlamming = false;
  hero.action = 'rp';
  hero.actionTime = 0;
  hero.actionDuration = 0.24;
  hero.vx = 0;
  hero.vz = 0;
  soundEngine.playGroundSlam();
  this.spawnParticles(hero.x, 0.18, hero.z, 22, 4.8);
  this.spawnComicPopup(hero.x, 1.55, hero.z, 'GROUND SLAM!', '#F59E0B');
  this.shakeIntensity = Math.max(this.shakeIntensity, 0.3);
  this.hitstopTimer = Math.max(this.hitstopTimer, 0.062);
  triggerHaptic(60);

  // Smash nearby clay pots
  for (let i = 0; i < this.stage.pots.length; i++) {
    const pot = this.stage.pots[i];
    if (!pot.broken && Math.hypot(pot.x - hero.x, pot.z - hero.z) <= 2.5) {
      this.stage.smashPot(pot);
      soundEngine.playPotSmash();
      this.spawnParticles(pot.x, 0.5, pot.z, 12, 3.8);
    }
  }

  // AoE shockwave launch against nearby cousins!
  for (let i = 0; i < this.enemies.length; i++) {
    const e = this.enemies[i];
    if (!e.alive) continue;
    const dist = Math.hypot(e.x - hero.x, (e.z - hero.z) * 1.25);
    if (dist <= 2.85) {
      const pushDir = e.x >= hero.x ? 1 : -1;
      this.damageEnemy(e, hero, 28, true, pushDir * 2.6, 4.2, 'DHISHUM!');
    }
  }
  hero.rage = Math.min(100, hero.rage + 16);
}

export function enforceHeroSeparation(this: StreetBrawlEngine, active: HeroRuntime, partner: HeroRuntime, dt: number) {
  if (active.hp <= 0 || partner.hp <= 0) return;
  if (partner.assistState === 'dash_in' || partner.assistState === 'attack') return;
  if (this.isPowerupAction(active.action) || this.isPowerupAction(partner.action)) return;

  const minSepX = 2.55;
  const minSepZ = 1.5;
  const dx = partner.x - active.x;
  const dz = partner.z - active.z;
  const normX = dx / minSepX;
  const normZ = dz / minSepZ;
  const eDist = Math.hypot(normX, normZ);

  if (eDist >= 1.0) return;

  let pushDirX: number;
  let pushDirZ: number;
  if (eDist < 0.05) {
    pushDirX = -active.facing;
    pushDirZ = active.z > -0.35 ? -1 : 1;
  } else {
    pushDirX = normX / eDist;
    pushDirZ = normZ / eDist;
  }

  // If partner is pinned against a zone X wall, steer separation cleanly along the open Z-lane
  const minX = this.lockedMinX + 0.6;
  const maxX = (this.zoneCleared ? 44.5 : this.lockedMaxX) - 0.6;
  if ((partner.x <= minX + 0.25 && pushDirX < 0) || (partner.x >= maxX - 0.25 && pushDirX > 0)) {
    pushDirX = 0;
    pushDirZ = active.z > -0.35 ? -1 : 1;
  }

  const overlap = 1.0 - eDist;
  const pushRate = Math.min(1, dt * 11.5);
  partner.x += pushDirX * overlap * minSepX * pushRate;
  partner.z += pushDirZ * overlap * minSepZ * pushRate;

  // Hard minimum floor so they never visually clip even if the player sprints straight into the partner
  const postDx = partner.x - active.x;
  const postDz = partner.z - active.z;
  const postEDist = Math.hypot(postDx / (minSepX * 0.78), postDz / (minSepZ * 0.78));
  if (postEDist < 1.0) {
    const rem = 1.0 - postEDist;
    partner.x += pushDirX * rem * minSepX * 0.78;
    partner.z += pushDirZ * rem * minSepZ * 0.78;
  }

  if (partner.action === 'idle' && overlap > 0.12) {
    partner.action = 'walk_fwd';
  }

  this.clampHeroPosition(partner);
}

export function clampHeroPosition(this: StreetBrawlEngine, hero: HeroRuntime) {
  const minX = this.lockedMinX + 0.5;
  const maxX = this.zoneCleared ? 44.5 : this.lockedMaxX - 0.5;
  hero.x = THREE.MathUtils.clamp(hero.x, minX, maxX);
  hero.z = THREE.MathUtils.clamp(hero.z, LANE_MIN_Z, LANE_MAX_Z);
}

export function startHeroMove(this: StreetBrawlEngine, hero: HeroRuntime, move: CombatAction) {
  const spec = HERO_MOVES[move];
  if (!spec) return;
  hero.action = move;
  hero.actionTime = 0;
  const boxerBoost =
    (hero.profile.id === 'rebel_enforcer' && (move === 'lp' || move === 'lp2' || move === 'rp')) ? 0.64 :
    (hero.style === 'street_boxer' && (move === 'lp' || move === 'lp2')) ||
    (hero.style === 'kung_fu_master' && (move === 'lp' || move === 'lp2' || move === 'rp'))
      ? 0.78
      : 1.0;
  const dholBoost = this.hasBoon('double_dhol') ? 0.85 : 1.0;
  const lazyPunch = hero.style === 'lazy_giant' && (move === 'lp' || move === 'lp2' || move === 'rp' || move === 'combo_finisher');
  hero.actionDuration = spec.duration * boxerBoost * dholBoost * (lazyPunch ? 1.45 : 1);
  // Too big to flinch: lazy giant swings cannot be interrupted
  if (lazyPunch) hero.superArmorTimer = Math.max(hero.superArmorTimer, hero.actionDuration * 0.9);
  hero.hitIdsThisSwing.clear();
  // Auto-aim: strikes turn toward a close enemy standing behind you and slide a little toward its lane
  if (getSettings().autoAim && (move === 'lp' || move === 'lp2' || move === 'rp' || move === 'kick')) {
    const near = this.findNearestLivingEnemy(hero.x, hero.z);
    if (near) {
      const dx = near.x - hero.x;
      const dz = near.z - hero.z;
      if (Math.abs(dx) <= 3.0 && Math.abs(dz) <= 1.5) {
        const side: 1 | -1 = dx >= 0 ? 1 : -1;
        const frontClear = !this.enemies.some(
          (o) => o.alive && o.uid !== near.uid && (o.x - hero.x) * hero.facing > 0 && Math.abs(o.x - hero.x) < 2.4 && Math.abs(o.z - hero.z) < 1.0
        );
        if (side !== hero.facing && frontClear) hero.facing = side;
        if (side === hero.facing) hero.z += Math.max(-0.35, Math.min(0.35, dz * 0.6));
      }
    }
  }
  // Plant feet firmly on grounded attacks so characters never slide or teleport mid-swing
  const isAerialOrDash =
    move === 'jump_kick' ||
    move === 'flying_side_kick' ||
    move === 'dash_attack' ||
    move === 'tornado_kick';
  if (!isAerialOrDash) {
    hero.vx = 0;
    hero.vz = 0;
  }
  if (
    move === 'kick' ||
    move === 'sweep' ||
    move === 'spinning_heel_kick' ||
    move === 'tornado_kick' ||
    move === 'axe_kick' ||
    move === 'flying_side_kick' ||
    move === 'jump_kick'
  ) {
    const pitch =
      move === 'tornado_kick'
        ? 1.28
        : move === 'spinning_heel_kick'
          ? 1.15
          : move === 'axe_kick'
            ? 0.88
            : 1.02;
    soundEngine.playKickWhoosh(pitch);
  } else {
    soundEngine.playWhoosh(spec.heavy ? 0.85 : 1.15);
  }
}
