// Street brawl engine: enemyAI methods (bound onto StreetBrawlEngine).
import * as THREE from 'three';
import { soundEngine } from '../sound';
import { HeroRuntime, EnemyRuntime } from './types';
import { LANE_MIN_Z, LANE_MAX_Z, triggerHaptic } from './data';
import type { StreetBrawlEngine } from '../streetBrawlEngine';

export function updateEnemies(this: StreetBrawlEngine, dt: number) {
  const active = this.getActiveHero();
  const partner = this.getPartnerHero();

  for (let i = 0; i < this.enemies.length; i++) {
    const e = this.enemies[i];
    if (e.removed) continue;

    e.hitFlash = Math.max(0, e.hitFlash - dt * 5);

    // Attack warning: a red "!" pops over any enemy who starts winding up a strike
    if (e.alive && e.action === 'windup') {
      if (!e.telegraphed) {
        e.telegraphed = true;
        this.spawnComicPopup(e.x, 2.35, e.z, '!', '#EF4444');
      }
    } else {
      e.telegraphed = false;
    }

    if (e.y > 0 || e.vy !== 0) {
      e.y += e.vy * dt;
      e.vy -= 14 * dt;
      if (e.y <= 0) {
        e.y = 0;
        e.vy = 0;
      }
    }
    e.x += e.vx * dt;
    e.z += e.vz * dt;
    e.vx *= Math.exp((e.bowlingActive ? -2.2 : -6.5) * dt);
    e.vz *= Math.exp(-5.0 * dt);

    // Extra Mirchi Boon: spicy chilli burn damage over 3s!
    if (e.alive && e.burnTimer > 0) {
      e.burnTimer = Math.max(0, e.burnTimer - dt);
      e.burnTickTimer -= dt;
      if (e.burnTickTimer <= 0) {
        e.burnTickTimer = 0.6;
        e.hp = Math.max(0, e.hp - 7);
        e.hitFlash = 0.75;
        this.spawnParticles(e.x, 1.25, e.z, 5, 2.2);
        if (e.hp <= 0) {
          this.damageEnemy(e, this.heroes[e.burnOwnerIdx], 1, true, 0, 3.2, 'MIRCHI KO!');
        }
      }
    }

    // Interactive Giant Golden Haystack Instant-KO Hazard!
    const isLaunchedOrBowled =
      e.alive && (e.bowlingActive || e.action === 'knockdown' || e.action === 'bowled') && Math.hypot(e.vx, e.vz) > 1.8;
    if (isLaunchedOrBowled) {
      for (let hi = 0; hi < this.stage.haystacks.length; hi++) {
        const hay = this.stage.haystacks[hi];
        if (!hay.intact) continue;
        if (Math.hypot(e.x - hay.x, e.z - hay.z) <= 1.35) {
          this.stage.triggerHaystackExplosion(hay);
          soundEngine.playHaystackBoom();
          this.spawnParticles(hay.x, 1.0, hay.z, 26, 5.4);
          this.shakeIntensity = Math.max(this.shakeIntensity, 0.34);
          this.hitstopTimer = Math.max(this.hitstopTimer, 0.068);
          const hayDmg = e.spec.archetype === 'boss' ? Math.round(e.maxHp * 0.35) : e.hp + 99;
          this.damageEnemy(e, active, hayDmg, true, 0, 5.6, 'HAYSTACK KO!');
          break;
        }
      }
    }

    // Wall & Prop Bounce Juggle Physics (Back village wall, zone walls, charpoys & clay pots!)
    if (isLaunchedOrBowled && !e.wallBounced && e.alive) {
      let bounced = false;
      let bounceVx = e.vx;
      let bounceVz = e.vz;

      // Back village wall bounce
      if (e.z <= LANE_MIN_Z + 0.12 && e.vz < -0.6) {
        bounced = true;
        bounceVz = 3.6;
      }
      // Zone X wall bounce (bowling throws & heavy launches)
      if ((e.x <= this.lockedMinX - 0.6 && e.vx < -2.4) || (e.x >= this.lockedMaxX + 0.6 && e.vx > 2.4)) {
        bounced = true;
        bounceVx = -Math.sign(e.vx) * 4.2;
        bounceVz = e.z < -0.5 ? 1.8 : -1.2;
      }
      // Wooden Charpoys along back edge
      if (!bounced) {
        for (let ci = 0; ci < this.stage.charpoys.length; ci++) {
          const ch = this.stage.charpoys[ci];
          if (Math.abs(e.x - ch.x) <= 1.15 && Math.abs(e.z - ch.z) <= 0.88) {
            this.stage.triggerCharpoyBounce(ch);
            bounced = true;
            bounceVx = -Math.sign(e.vx || 1) * 3.0;
            bounceVz = 3.8;
            break;
          }
        }
      }
      // Banyan Courtyard Carved Stone Pillars (Bounce thrown cousins back for juggle combos!)
      if (!bounced) {
        for (let spi = 0; spi < this.stage.stonePillars.length; spi++) {
          const pillar = this.stage.stonePillars[spi];
          if (Math.hypot(e.x - pillar.x, e.z - pillar.z) <= pillar.radius + 0.58) {
            this.stage.triggerPillarBounce(pillar);
            bounced = true;
            bounceVx = -Math.sign(e.vx || 1) * 4.2;
            bounceVz = Math.sign(e.z - pillar.z || 1) * 2.4;
            this.spawnComicPopup(pillar.x, 2.2, pillar.z, 'PILLAR BOUNCE!', '#FACC15');
            break;
          }
        }
      }
      // Roadside Cast-Iron Water Hand-Pump (Bursts pressurized water soaking nearby cousins!)
      for (let wpi = 0; wpi < this.stage.waterPumps.length; wpi++) {
        const pump = this.stage.waterPumps[wpi];
        if (pump.cooldown <= 0 && Math.hypot(e.x - pump.x, e.z - pump.z) <= 1.45) {
          this.stage.triggerWaterPumpBurst(pump);
          soundEngine.playWaterBurst();
          this.spawnComicPopup(pump.x, 1.95, pump.z, 'WATER BURST!', '#38BDF8');
          this.shakeIntensity = Math.max(this.shakeIntensity, 0.22);
          this.score += 140;
          for (let wi = 0; wi < this.enemies.length; wi++) {
            const we = this.enemies[wi];
            if (!we.alive) continue;
            if (Math.hypot(we.x - pump.x, we.z - pump.z) <= 3.8) {
              this.damageEnemy(we, active, 20, true, Math.sign(we.x - pump.x || 1) * 2.6, 3.2);
            }
          }
          break;
        }
      }
      // Stacked Clay Pots bounce & shatter!
      if (!bounced) {
        for (let pi = 0; pi < this.stage.pots.length; pi++) {
          const pot = this.stage.pots[pi];
          if (!pot.broken && Math.hypot(e.x - pot.x, e.z - pot.z) <= 1.05) {
            this.stage.smashPot(pot);
            soundEngine.playPotSmash();
            this.spawnParticles(pot.x, 0.6, pot.z, 14, 4.0);
            bounced = true;
            bounceVx = -Math.sign(e.vx || 1) * 3.2;
            bounceVz = 2.6;
            break;
          }
        }
      }

      if (bounced) {
        e.wallBounced = true;
        e.bowlingActive = false;
        e.vx = bounceVx;
        e.vz = bounceVz;
        e.vy = 5.4;
        e.y = Math.max(e.y, 0.35);
        e.action = 'knockdown';
        e.actionTime = 0;
        e.actionDuration = 0.88;
        soundEngine.playHit(true);
        this.spawnParticles(e.x, 1.1, e.z, 14, 4.0);
        this.spawnComicPopup(e.x, 2.0, e.z, 'JUGGLE!', '#FDE047');
        this.hitstopTimer = Math.max(this.hitstopTimer, 0.048);
        this.shakeIntensity = Math.max(this.shakeIntensity, 0.22);
      }
    }

    // Bowling-Pin Throw collision: hurled cousin knocks down every cousin in their path!
    if (e.bowlingActive) {
      const owner = this.heroes[e.bowlingOwnerIdx];
      for (let j = 0; j < this.enemies.length; j++) {
        const other = this.enemies[j];
        if (!other.alive || e.bowlingHitUids.has(other.uid)) continue;
        if (Math.abs(other.x - e.x) < 1.1 && Math.abs(other.z - e.z) < 0.95) {
          e.bowlingHitUids.add(other.uid);
          soundEngine.playHit(true);
          this.damageEnemy(
            other,
            owner,
            30,
            true,
            Math.sign(e.vx || 1) * 3.2,
            4.2,
            'STRIKE!'
          );
          this.hitstopTimer = Math.max(this.hitstopTimer, 0.055);
          this.shakeIntensity = Math.max(this.shakeIntensity, 0.24);
        }
      }
      if (Math.abs(e.vx) < 2.2 || e.action !== 'bowled') {
        e.bowlingActive = false;
      }
    }

    if (!e.alive) {
      e.actionTime += dt;
      e.koFadeTimer -= dt;
      if (e.koFadeTimer <= 0) {
        this.scene.remove(e.rig.root);
        e.rig.dispose();
        e.removed = true;
      } else {
        e.rig.root.visible = Math.floor(e.koFadeTimer * 14) % 2 === 0;
      }
      continue;
    }

    e.x = THREE.MathUtils.clamp(e.x, this.lockedMinX - 1.5, this.lockedMaxX + 2.5);
    e.z = THREE.MathUtils.clamp(e.z, LANE_MIN_Z, LANE_MAX_Z);

    // Clinched or Rear-Grabbing cousin is locked with hero
    if (e.action === 'clinched' || e.action === 'rear_grab') {
      e.actionTime += dt;
      continue;
    }

    // Dizzy stagger countdown waiting for a signature FINISH! takedown
    if (e.action === 'dizzy') {
      e.dizzyTimer -= dt;
      e.actionTime += dt;
      if (e.dizzyTimer <= 0) {
        e.action = 'idle';
        e.actionTime = 0;
        e.actionDuration = 0;
      }
      continue;
    }

    if (e.actionDuration > 0) {
      e.actionTime += dt;

      if (e.action === 'boss_shockwave') {
        if (!e.hasHitThisSwing && e.actionTime >= e.actionDuration * 0.62) {
          e.hasHitThisSwing = true;
          this.shockwaveActive = true;
          this.shockwaveX = e.x;
          this.shockwaveZ = e.z;
          this.shockwaveRadius = 0.85;
          this.shockwaveHitHeroMask = 0;
          soundEngine.playShockwaveBoom();
          this.spawnParticles(e.x, 0.22, e.z, 26, 5.2);
          this.spawnComicPopup(e.x, 2.1, e.z, 'JUMP!', '#FACC15');
          this.shakeIntensity = Math.max(this.shakeIntensity, 0.36);
        }
        if (e.actionTime >= e.actionDuration) {
          e.action = 'idle';
          e.actionTime = 0;
          e.actionDuration = 0;
          e.aiCooldown = 0.9;
        }
        continue;
      }

      if (e.special && e.action === 'taunt') {
        if (!e.specialFired && e.actionTime >= e.actionDuration * 0.6) this.fireBossSpecial(e);
        if (e.actionTime >= e.actionDuration) {
          e.action = 'idle';
          e.actionTime = 0;
          e.actionDuration = 0;
          if (e.chargeTimer <= 0) e.special = null;
        }
        continue;
      }

      if (e.action === 'windup' && e.actionTime >= e.actionDuration) {
        e.action = 'attack';
        e.actionTime = 0;
        e.actionDuration = e.spec.archetype === 'boss' ? 0.42 : 0.34;
        e.hasHitThisSwing = false;
        if (e.spec.archetype === 'ranged') {
          this.spawnEnemyChappal(e, active.hp > 0 ? active : partner);
        } else {
          soundEngine.playWhoosh(0.9);
        }
      } else if (e.action === 'attack') {
        if (e.spec.archetype !== 'ranged' && !e.hasHitThisSwing && e.actionTime >= 0.08 && e.actionTime <= 0.22) {
          this.checkEnemyAttackHit(e);
        }
        if (e.actionTime >= e.actionDuration) {
          e.action = 'idle';
          e.actionTime = 0;
          e.actionDuration = 0;
          // After swinging, briefly retreat & circle so enemies fight like real martial artists
          e.aiState = 'retreat';
          e.stateTimer = e.spec.archetype === 'boss' ? 0.45 : 0.65 + Math.random() * 0.35;
          e.aiCooldown =
            e.spec.archetype === 'boss'
              ? 0.78
              : e.spec.archetype === 'ranged'
                ? 1.9
                : e.spec.speed >= 3.0
                  ? 0.85 + Math.random() * 0.45
                  : 1.25 + Math.random() * 0.6;
        }
      } else if (e.actionTime >= e.actionDuration) {
        e.action = 'idle';
        e.actionTime = 0;
        e.actionDuration = 0;
        e.bowlingActive = false;
      }
      continue;
    }

    let targetHero = active;
    if (
      partner.hp > 0 &&
      (active.hp <= 0 ||
        Math.hypot(partner.x - e.x, partner.z - e.z) + 0.9 <
          Math.hypot(active.x - e.x, active.z - e.z))
    ) {
      targetHero = partner;
    }

    e.facing = targetHero.x >= e.x ? 1 : -1;
    e.aiCooldown -= dt;
    if (e.rearGrabCooldown > 0) e.rearGrabCooldown -= dt;

    // Bade Tau Phase 2 Ground-Pound Shockwave AI cadence!
    if (e.spec.archetype === 'boss' && e.phase2Rage) {
      this.bossShockwaveCooldown -= dt;
      if (this.bossShockwaveCooldown <= 0 && !this.shockwaveActive) {
        this.bossShockwaveCooldown = 6.2;
        e.action = 'boss_shockwave';
        e.actionTime = 0;
        e.actionDuration = 0.85;
        e.hasHitThisSwing = false;
        this.spawnComicPopup(e.x, 2.25, e.z, 'GROUND POUND!', '#F97316');
        continue;
      }
    }

    // Boss special attacks (volley / summon / charge / stomp): rotates through spec.bossMoves
    if (e.spec.archetype === 'boss' && this.updateBossSpecials(e, dt, targetHero)) continue;

    // Motorbike Cousin (Raju Splendor) zoom charge while still on bike!
    if (e.onBike) {
      e.x += e.facing * 5.2 * dt;
      e.z += Math.sign(targetHero.z - e.z) * Math.min(Math.abs(targetHero.z - e.z), 1.4 * dt);
      e.action = 'walk';
      if (e.rig.bikeWheels) {
        e.rig.bikeWheels.forEach((w) => {
          w.rotation.x += dt * 16;
        });
      }
      if (Math.abs(targetHero.x - e.x) < 1.35 && Math.abs(targetHero.z - e.z) < 0.85 && e.aiCooldown <= 0) {
        e.aiCooldown = 1.25;
        this.checkEnemyAttackHit(e);
      }
      continue;
    }

    // Chappal Chacha keeps distance (~4.8 units) and lobs flying slippers!
    if (e.spec.archetype === 'ranged') {
      const distX = Math.abs(targetHero.x - e.x);
      const dz = targetHero.z - e.z;
      if (distX < 3.4) {
        e.x -= e.facing * e.spec.speed * dt;
        e.action = 'walk';
      } else if (distX > 6.2 || Math.abs(dz) > 0.65) {
        if (distX > 6.2) e.x += e.facing * e.spec.speed * dt;
        e.z += Math.sign(dz) * Math.min(Math.abs(dz), 2.1 * dt);
        e.action = 'walk';
      } else if (e.aiCooldown <= 0) {
        e.action = 'windup';
        e.actionTime = 0;
        e.actionDuration = 0.35;
      } else {
        e.action = 'idle';
      }
      continue;
    }

    // Strict Max-2-Attackers Slot Manager: only 2 enemies may engage/attack at once; the rest circle & wait!
    const MAX_ATTACKERS = 2;
    let activeAttackers = 0;
    for (let k = 0; k < this.enemies.length; k++) {
      const o = this.enemies[k];
      if (!o.alive || o.uid === e.uid) continue;
      if (
        o.action === 'windup' ||
        o.action === 'attack' ||
        o.action === 'rear_grab' ||
        o.aiState === 'approach' ||
        o.aiState === 'telegraph_pause'
      ) {
        activeAttackers++;
      }
    }
    const hasAttackSlot = activeAttackers < MAX_ATTACKERS;

    // Cooperative Rear-Grab opportunity for agile village idiots flanking behind the active hero!
    const isBehindActive = (e.x - active.x) * active.facing < -0.35;
    if (
      hasAttackSlot &&
      e.spec.archetype === 'idiot' &&
      targetHero === active &&
      isBehindActive &&
      this.grabbedByEnemyUid === null &&
      this.grabGlobalCooldown <= 0 &&
      e.rearGrabCooldown <= 0 &&
      active.hp > 18 &&
      active.y <= 0.05 &&
      active.invulnTimer <= 0 &&
      active.ridingBikeTimer <= 0 &&
      active.clinchTargetUid === null &&
      Math.abs(e.x - active.x) <= 1.25 &&
      Math.abs(e.z - active.z) <= 0.72 &&
      this.enemies.filter((o) => o.alive).length >= 2
    ) {
      this.grabbedByEnemyUid = e.uid;
      this.grabEscapeProgress = 0;
      this.grabHoldTimer = 2.6;
      e.action = 'rear_grab';
      e.actionTime = 0;
      e.actionDuration = 2.6;
      active.isSprinting = false;
      active.action = 'grabbed_struggle';
      soundEngine.playWhoosh(0.8);
      this.spawnComicPopup(active.x, 2.0, active.z, 'HELD!', '#EF4444');
      continue;
    }

    // Dynamic martial-arts AI state machine: circle -> approach -> reaction pause -> attack -> retreat
    e.stateTimer -= dt;
    const isFastEnemy = e.spec.speed >= 3.0;
    const isHeavyEnemy = e.spec.speed <= 1.95 || e.spec.archetype === 'boss';
    const strikeReachX = e.spec.hasClub ? 1.82 : isHeavyEnemy ? 1.52 : 1.38;

    if (e.aiState === 'retreat') {
      const backX = targetHero.x - e.facing * (isFastEnemy ? 3.5 : 2.8);
      const backZ = THREE.MathUtils.clamp(
        targetHero.z + e.orbitDir * 1.35,
        LANE_MIN_Z + 0.35,
        LANE_MAX_Z - 0.35
      );
      const rdx = backX - e.x;
      const rdz = backZ - e.z;
      const rDist = Math.hypot(rdx, rdz);
      if (rDist > 0.32 && e.stateTimer > 0) {
        const sp = e.spec.speed * 0.84;
        e.x += (rdx / rDist) * sp * dt;
        e.z += (rdz / rDist) * (sp * 0.78) * dt;
        e.action = 'walk';
      } else {
        e.aiState = 'circle';
        e.stateTimer = 0.75 + Math.random() * 0.75;
        if (Math.random() < 0.45) e.orbitDir = e.orbitDir === 1 ? -1 : 1;
        e.action = 'idle';
      }
      continue;
    }

    if (e.aiState === 'telegraph_pause') {
      // Short readable reaction delay before swinging so players can read and dodge!
      e.reactionTimer -= dt;
      e.action = 'idle';
      if (e.reactionTimer <= 0) {
        const distNowX = Math.abs(targetHero.x - e.x);
        const distNowZ = Math.abs(targetHero.z - e.z);
        if (distNowX <= strikeReachX + 0.55 && distNowZ <= 0.85) {
          if (e.spec.archetype === 'idiot' && Math.random() < 0.14) {
            e.action = 'taunt';
            e.actionTime = 0;
            e.actionDuration = 0.55;
            e.aiCooldown = 0.65;
            e.aiState = 'retreat';
            e.stateTimer = 0.55;
          } else {
            e.action = 'windup';
            e.actionTime = 0;
            // Quick step-in lunge so strikes feel sharp (light cousins only)
            if (!isHeavyEnemy && e.spec.archetype !== 'boss') e.vx += Math.sign(targetHero.x - e.x) * 2.6;
            // Distinct windup timings per fighting style (fast skirmisher vs slow heavy powerhouse)
            e.actionDuration =
              e.spec.archetype === 'boss'
                ? 0.52
                : isHeavyEnemy
                  ? 0.48
                  : isFastEnemy
                    ? 0.34
                    : 0.4;
            e.aiState = 'circle';
          }
        } else {
          e.aiState = hasAttackSlot ? 'approach' : 'circle';
          e.stateTimer = 0.7;
        }
      }
      continue;
    }

    if (hasAttackSlot && e.aiCooldown <= 0 && (e.aiState === 'approach' || e.stateTimer <= 0)) {
      e.aiState = 'approach';
      const flankX = targetHero.x - e.facing * strikeReachX;
      const flankZ = THREE.MathUtils.clamp(targetHero.z, LANE_MIN_Z + 0.3, LANE_MAX_Z - 0.3);
      const adx = flankX - e.x;
      const adz = flankZ - e.z;
      const aDist = Math.hypot(adx, adz);
      if (aDist > 0.34) {
        const sp = e.spec.speed * (isFastEnemy ? 1.04 : 0.96) * (e.spec.trait === 'rusher' && aDist > 2.6 ? 1.7 : 1);
        e.x += (adx / aDist) * sp * dt;
        e.z += (adz / aDist) * (sp * 0.78) * dt;
        e.action = 'walk';
      } else {
        // Reached strike range: enter brief readable reaction delay before windup
        e.aiState = 'telegraph_pause';
        e.reactionTimer =
          (isFastEnemy ? 0.18 : isHeavyEnemy ? 0.3 : 0.24) *
          (this.endlessMode ? Math.max(0.65, 1 - this.endlessWave * 0.035) : 1);
        e.action = 'idle';
      }
      continue;
    }

    // Default: smoothly circle & strafe around the player at comfortable range, never walking straight in a line
    e.aiState = 'circle';
    const orbitSpeed = (isFastEnemy ? 1.35 : 0.82) * e.orbitDir;
    e.orbitAngle += orbitSpeed * dt;
    if (e.stateTimer <= 0) {
      e.stateTimer = 1.1 + Math.random() * 1.1;
      if (Math.random() < 0.35) e.orbitDir = e.orbitDir === 1 ? -1 : 1;
    }
    const orbitRx = 3.25 + (e.uid % 3) * 0.48;
    const orbitRz = 1.75 + (e.uid % 2) * 0.42;
    const goalX = targetHero.x + Math.cos(e.orbitAngle) * orbitRx;
    const goalZ = THREE.MathUtils.clamp(
      targetHero.z + Math.sin(e.orbitAngle) * orbitRz,
      LANE_MIN_Z + 0.35,
      LANE_MAX_Z - 0.35
    );
    const cdx = goalX - e.x;
    const cdz = goalZ - e.z;
    const cDist = Math.hypot(cdx, cdz);
    if (cDist > 0.28) {
      const sp = e.spec.speed * 0.78;
      e.x += (cdx / cDist) * sp * dt;
      e.z += (cdz / cDist) * (sp * 0.76) * dt;
      e.action = 'walk';
    } else {
      e.action = 'idle';
    }
  }

  // Soft separation so cousins never stack on top of each other (keeps the crowd readable)
  const live = this.enemies.filter((o) => o.alive && !o.removed && o.y <= 0.05 && Math.abs(o.vx) < 2 && o.action !== 'rear_grab');
  for (let a = 0; a < live.length; a++) {
    for (let b = a + 1; b < live.length; b++) {
      const p = live[a];
      const q = live[b];
      const dx = q.x - p.x;
      const dz = (q.z - p.z) * 1.6;
      const d = Math.hypot(dx, dz);
      const min = 0.95;
      if (d < min) {
        const push = ((min - d) * Math.min(1, dt * 9)) / 2;
        const nx = d > 0.001 ? dx / d : (p.uid % 2 ? 1 : -1);
        const nz = d > 0.001 ? dz / d : 0;
        p.x -= nx * push;
        q.x += nx * push;
        p.z = THREE.MathUtils.clamp(p.z - (nz * push) / 1.6, LANE_MIN_Z + 0.3, LANE_MAX_Z - 0.3);
        q.z = THREE.MathUtils.clamp(q.z + (nz * push) / 1.6, LANE_MIN_Z + 0.3, LANE_MAX_Z - 0.3);
      }
    }
  }
}

export function checkEnemyAttackHit(this: StreetBrawlEngine, e: EnemyRuntime) {
  const reachX = e.spec.hasClub ? 2.15 : 1.68;
  const reachZ = 0.9;

  for (let h = 0; h < 2; h++) {
    const hero = this.heroes[h];
    if (hero.hp <= 0) continue;
    // PERFECT DODGE: sidestepping out of a swing that would have landed -> slow-mo + counter boost
    if (
      (hero.action === 'sidestep_in' || hero.action === 'sidestep_out') &&
      !e.hasHitThisSwing &&
      Math.abs(hero.x - e.x) <= (e.spec.hasClub ? 2.4 : 1.9) &&
      Math.abs(hero.z - e.z) <= 1.5
    ) {
      e.hasHitThisSwing = true;
      hero.counterTimer = 1.6;
      hero.rage = Math.min(100, hero.rage + 12);
      this.slowMoTimer = Math.max(this.slowMoTimer, 0.45);
      soundEngine.playParryClang();
      this.spawnComicPopup(hero.x, 2.05, hero.z, 'PERFECT DODGE!', '#38BDF8');
      break;
    }
    if (hero.invulnTimer > 0) continue;
    const dx = (hero.x - e.x) * e.facing;
    const dz = Math.abs(hero.z - e.z);
    if (dx >= -0.3 && dx <= reachX && dz <= reachZ) {
      e.hasHitThisSwing = true;
      const blocked = hero.action === 'block';
      const isPerfectParry = blocked && this.elapsed - hero.blockStartElapsed <= 0.24;

      if (isPerfectParry) {
        // Timed Guard Parry: 0 damage, golden flash, hitstop, +22 Powerup, staggers attacker!
        hero.rage = Math.min(100, hero.rage + 22);
        hero.hitFlash = 0.65;
        hero.invulnTimer = 0.42;
        hero.action = 'parry';
        hero.actionTime = 0;
        hero.actionDuration = 0.24;
        hero.callout = 'PARRY!';
        hero.calloutSeq++;
        e.action = 'hitstun';
        e.actionTime = 0;
        e.actionDuration = 0.95;
        e.vx = -e.facing * 2.1;
        e.hitFlash = 0.95;
        soundEngine.playParryClang();
        this.spawnParticles(hero.x + hero.facing * 0.5, 1.25, hero.z, 18, 4.4);
        this.spawnComicPopup(hero.x, 1.95, hero.z, 'PARRY!', '#FDE047');
        this.hitstopTimer = Math.max(this.hitstopTimer, 0.055);
        this.shakeIntensity = Math.max(this.shakeIntensity, 0.16);
        triggerHaptic(50);
        break;
      }

      const armored = hero.superArmorTimer > 0;
      const ironLungi = this.hasBoon('iron_lungi');
      const baseDmg = ironLungi && !blocked ? Math.round(e.spec.damage * 0.85) : e.spec.damage;
      const dmg = blocked
        ? Math.max(2, Math.round(e.spec.damage * 0.25))
        : armored
          ? Math.round(baseDmg * 0.5)
          : baseDmg;
      hero.hp = Math.max(0, hero.hp - dmg);
      hero.rage = Math.min(100, hero.rage + (blocked ? 5 : 10));
      hero.hitFlash = blocked ? 0.35 : 0.9;

      if (blocked) {
        soundEngine.playBlock();
        hero.vx = e.facing * 1.4;
      } else {
        // Taking an unblocked hit permanently loses recoverable Green Health!
        hero.recoverableHp = 0;
        if (!armored) {
          this.releaseClinch(hero);
          soundEngine.playHit(e.spec.archetype === 'boss');
          const resistKnockdown = ironLungi && Math.random() < 0.3;
          const knockDown = e.spec.archetype === 'boss' && !resistKnockdown;
          hero.action = knockDown ? 'knockdown' : 'hitstun';
          hero.actionTime = 0;
          hero.actionDuration = knockDown ? 0.92 : 0.3;
          hero.vx = e.facing * (knockDown ? 3.2 : 1.6);
          if (knockDown) {
            hero.vy = 3.2;
            if (hero.index === this.activeHeroIndex) {
              this.noKnockdownCombo = 0;
            }
          }
          this.spawnParticles(hero.x, 1.15, hero.z, 8, 2.8);
          this.hitstopTimer = Math.max(this.hitstopTimer, knockDown ? 0.082 : 0.062);
          this.shakeIntensity = Math.max(this.shakeIntensity, knockDown ? 0.34 : 0.14);
          triggerHaptic(knockDown ? [40, 20, 55] : 26);
        }
      }
      break;
    }
  }
}

export function spawnEnemyChappal(this: StreetBrawlEngine, e: EnemyRuntime, target: HeroRuntime, vzOffset = 0, speed = 8.2) {
  const slot = this.projectiles.find((p) => !p.active && p.kind === 'chappal');
  if (!slot) return;
  slot.active = true;
  slot.fromHero = false;
  slot.ownerEnemyUid = e.uid;
  slot.deflected = false;
  slot.x = e.x + e.facing * 0.65;
  slot.y = 1.2;
  slot.z = e.z;
  const dx = target.x - e.x;
  const dz = target.z - e.z;
  const len = Math.max(0.1, Math.hypot(dx, dz));
  slot.vx = (dx / len) * speed;
  slot.vy = 0;
  slot.vz = (dz / len) * 2.2 + vzOffset;
  slot.life = 1.9;
  slot.damage = e.spec.damage;
  slot.hitUids.clear();
  slot.mesh.position.set(slot.x, slot.y, slot.z);
  slot.mesh.visible = true;
  soundEngine.playWhoosh(1.4);
}

export function updateProjectiles(this: StreetBrawlEngine, dt: number) {
  for (let i = 0; i < this.projectiles.length; i++) {
    const pr = this.projectiles[i];
    if (!pr.active) continue;
    pr.life -= dt;
    pr.x += pr.vx * dt;
    pr.z += pr.vz * dt;
    if (pr.kind !== 'chappal') {
      pr.y = Math.max(0.22, pr.y + pr.vy * dt);
      pr.vy -= 5.8 * dt;
    }
    pr.mesh.position.set(pr.x, pr.y, pr.z);
    pr.mesh.rotation.y += dt * (pr.deflected ? 28 : 15);
    pr.mesh.rotation.z += dt * (pr.deflected ? 22 : 11);

    if (pr.fromHero) {
      const owner = this.heroes[pr.ownerHeroIdx];
      for (let j = 0; j < this.enemies.length; j++) {
        const e = this.enemies[j];
        if (!e.alive || pr.hitUids.has(e.uid)) continue;
        if (Math.abs(e.x - pr.x) < 1.15 && Math.abs(e.z - pr.z) < 1.05) {
          pr.hitUids.add(e.uid);
          soundEngine.playHit(true);
          const isDeflectedChappal = pr.kind === 'chappal' && pr.deflected;
          this.damageEnemy(
            e,
            owner,
            isDeflectedChappal ? 32 : pr.damage,
            true,
            Math.sign(pr.vx || 1) * 2.8,
            isDeflectedChappal ? 0 : 3.8,
            isDeflectedChappal
              ? 'RETURN TO SENDER!'
              : pr.kind === 'coconut'
                ? 'COCONUT BONK!'
                : 'STOOL SMASH!'
          );
          if (isDeflectedChappal && e.alive) {
            // Instant heavy stun on Chappal Chacha!
            e.action = 'hitstun';
            e.actionTime = 0;
            e.actionDuration = 1.9;
            pr.life = 0;
          }
          this.shakeIntensity = Math.max(this.shakeIntensity, 0.22);
        }
      }
    } else {
      // Chappal Chacha's flying slipper vs heroes (deflectable with JAB or timed GUARD!)
      for (let h = 0; h < 2; h++) {
        const hero = this.heroes[h];
        if (hero.hp <= 0 || hero.invulnTimer > 0) continue;

        const distX = Math.abs(hero.x - pr.x);
        const distZ = Math.abs(hero.z - pr.z);
        const isSwingingJab =
          (hero.action === 'lp' || hero.action === 'lp2' || hero.action === 'rp' || hero.action === 'kick') &&
          hero.actionTime <= 0.28;
        const isTimedGuard = hero.action === 'block' && this.elapsed - hero.blockStartElapsed <= 0.3;

        if ((isSwingingJab || isTimedGuard) && distX < 1.45 && distZ < 1.05) {
          // METALLIC PING! Deflect slipper straight back at Chappal Chacha at 2x speed!
          pr.fromHero = true;
          pr.deflected = true;
          pr.ownerHeroIdx = hero.index;
          pr.hitUids.clear();
          const thrower = this.enemies.find((e) => e.uid === pr.ownerEnemyUid && e.alive);
          if (thrower) {
            const dx = thrower.x - pr.x;
            const dz = thrower.z - pr.z;
            const len = Math.max(0.1, Math.hypot(dx, dz));
            pr.vx = (dx / len) * 16.8;
            pr.vz = (dz / len) * 12.0;
          } else {
            pr.vx = -pr.vx * 2.0;
            pr.vz = -pr.vz * 2.0;
          }
          pr.life = 1.5;
          soundEngine.playSlipperPing();
          this.spawnParticles(pr.x, pr.y, pr.z, 18, 4.6);
          this.spawnComicPopup(hero.x, 2.0, hero.z, 'RETURN TO SENDER!', '#38BDF8');
          this.hitstopTimer = Math.max(this.hitstopTimer, 0.055);
          this.shakeIntensity = Math.max(this.shakeIntensity, 0.18);
          hero.rage = Math.min(100, hero.rage + 16);
          triggerHaptic(45);
          break;
        }

        if (distX < 0.8 && distZ < 0.78) {
          pr.life = 0;
          const blocked = hero.action === 'block';
          const ironLungi = this.hasBoon('iron_lungi');
          const dmg = blocked ? 2 : ironLungi ? Math.round(pr.damage * 0.65) : pr.damage;
          hero.hp = Math.max(0, hero.hp - dmg);
          if (!blocked) hero.recoverableHp = 0;
          hero.hitFlash = blocked ? 0.3 : 0.85;
          if (blocked) {
            soundEngine.playBlock();
          } else {
            soundEngine.playSlap();
            if (hero.superArmorTimer <= 0 && !ironLungi) {
              hero.action = 'hitstun';
              hero.actionTime = 0;
              hero.actionDuration = 0.25;
            }
          }
          break;
        }
      }
    }

    if (pr.life <= 0) {
      pr.active = false;
      pr.mesh.visible = false;
    }
  }
}

export function updateAutoRickshaw(this: StreetBrawlEngine, dt: number) {
  const r = this.stage.rickshaw;
  if (r.active) {
    r.x += r.dir * 13.5 * dt;
    r.group.position.set(r.x, Math.abs(Math.sin(this.elapsed * 26)) * 0.04, r.z);
    r.group.rotation.y = r.dir === 1 ? 0 : Math.PI;
    for (let w = 0; w < r.wheels.length; w++) {
      r.wheels[w].rotation.z -= r.dir * dt * 24;
    }

    // Send any village cousins in the rickshaw's lane flying sky-high!
    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      if (!e.alive || this.rickshawHitUids.has(e.uid)) continue;
      if (Math.abs(e.x - r.x) < 1.65 && Math.abs(e.z - r.z) < 1.05) {
        this.rickshawHitUids.add(e.uid);
        this.cousinsRickshawed += 1;
        soundEngine.playCarCrash();
        this.damageEnemy(e, null, 42, true, r.dir * 4.2, 5.8, "RICKSHAW'D!");
        this.score += 150;
        this.shakeIntensity = Math.max(this.shakeIntensity, 0.28);
      }
    }

    // Light bump to heroes if they stand right in the lane without dodging/blocking
    for (let h = 0; h < 2; h++) {
      const hero = this.heroes[h];
      if (hero.hp <= 0 || hero.invulnTimer > 0) continue;
      if (Math.abs(hero.x - r.x) < 1.35 && Math.abs(hero.z - r.z) < 0.85) {
        hero.invulnTimer = 0.9;
        if (hero.action !== 'block') {
          hero.hp = Math.max(1, hero.hp - 8);
          hero.vx = r.dir * 2.8;
          hero.hitFlash = 0.7;
          soundEngine.playHit(false);
          this.spawnComicPopup(hero.x, 1.85, hero.z, 'BEEP BEEP!', '#FACC15');
        } else {
          soundEngine.playBlock();
        }
      }
    }

    if ((r.dir === 1 && r.x > this.cameraX + 18) || (r.dir === -1 && r.x < this.cameraX - 18)) {
      r.active = false;
      r.group.visible = false;
      this.rickshawCooldown = 16 + Math.random() * 6;
    }
    return;
  }

  if (this.rickshawWarnTimer > 0) {
    this.rickshawWarnTimer -= dt;
    if (this.rickshawWarnTimer <= 0) {
      r.active = true;
      r.group.visible = true;
      r.dir = Math.random() < 0.5 ? 1 : -1;
      r.x = this.cameraX - r.dir * 16.5;
      r.z = Math.random() < 0.5 ? -1.45 : 0.75;
      r.group.position.set(r.x, 0, r.z);
      this.rickshawHitUids.clear();
      soundEngine.playRickshawHorn();
    }
    return;
  }

  if (this.enemies.some((e) => e.alive)) {
    this.rickshawCooldown -= dt;
    if (this.rickshawCooldown <= 0) {
      this.rickshawWarnTimer = 1.65;
      soundEngine.playRickshawHorn();
    }
  }
}
