// Street brawl engine: combat methods (bound onto StreetBrawlEngine).
import * as THREE from 'three';
import { soundEngine } from '../sound';
import { HeroRuntime, EnemyRuntime } from './types';
import { HERO_MOVES, LANE_MIN_Z, LANE_MAX_Z, triggerHaptic } from './data';
import type { StreetBrawlEngine } from '../streetBrawlEngine';

export function evaluateHeroAttackHits(this: StreetBrawlEngine, hero: HeroRuntime) {
  const spec = HERO_MOVES[hero.action];
  if (!spec) return;
  if (hero.actionTime < spec.activeStart || hero.actionTime > spec.activeEnd) return;

  const weapon = hero.heldWeapon;
  const isWeaponMaster = hero.style === 'weapon_master';
  const isBollywoodSlap = hero.style === 'bollywood_hero' && hero.action === 'rp';
  const isKushtiShockwave = hero.style === 'kushti_pehelwan' && hero.action === 'throw_execute';
  const is360Sweep =
    (isWeaponMaster && Boolean(weapon)) ||
    hero.action === 'combo_finisher' ||
    isKushtiShockwave ||
    hero.action === 'tornado_kick' ||
    hero.action === 'spinning_heel_kick' ||
    hero.action === 'sweep';

  const isMartialKick =
    hero.action === 'kick' ||
    hero.action === 'spinning_heel_kick' ||
    hero.action === 'tornado_kick' ||
    hero.action === 'axe_kick' ||
    hero.action === 'flying_side_kick' ||
    hero.action === 'sweep';

  const bonusRange =
    (weapon ? (weapon.kind === 'lathi' ? 0.95 : 0.5) : 0) +
    (isBollywoodSlap ? 0.75 : 0) +
    (isKushtiShockwave ? 1.05 : 0) +
    (hero.style === 'kalari_kicker' && isMartialKick ? 0.45 : 0);
  const bonusDmg =
    (weapon ? (weapon.kind === 'chair' ? 18 : 12) + (isWeaponMaster ? 7 : 0) : 0) +
    (hero.style === 'kushti_pehelwan' && hero.action === 'rp' ? 6 : 0);

  const effectiveRangeX = spec.rangeX + bonusRange;
  const effectiveRangeZ = spec.rangeZ + (isBollywoodSlap || isKushtiShockwave ? 0.55 : 0);
  const counterMul = hero.counterTimer > 0 ? 1.5 : 1;
  const effectiveDmg = Math.round((spec.damage + bonusDmg) * (0.9 + hero.profile.stats.power * 0.03) * counterMul);

  // 1. Smashable terracotta clay pots
  for (let i = 0; i < this.stage.pots.length; i++) {
    const pot = this.stage.pots[i];
    if (pot.broken) continue;
    const dx = (pot.x - hero.x) * hero.facing;
    const dz = Math.abs(pot.z - hero.z);
    if ((is360Sweep ? Math.abs(dx) <= effectiveRangeX : dx >= -0.45 && dx <= effectiveRangeX + 0.35) && dz <= 1.15) {
      this.stage.smashPot(pot);
      soundEngine.playPotSmash();
      this.spawnParticles(pot.x, 0.6, pot.z, 16, 4.4);
      this.shakeIntensity = Math.max(this.shakeIntensity, 0.14);
      this.score += 50;
    }
  }

  // 1a. Breakable wooden fruit carts (spills rolling watermelons & mangoes across the lane!)
  for (let i = 0; i < this.stage.fruitCarts.length; i++) {
    const fc = this.stage.fruitCarts[i];
    if (fc.broken) continue;
    const dx = (fc.x - hero.x) * hero.facing;
    const dz = Math.abs(fc.z - hero.z);
    if ((is360Sweep ? Math.abs(dx) <= effectiveRangeX + 0.6 : dx >= -0.55 && dx <= effectiveRangeX + 0.65) && dz <= 1.45) {
      this.stage.smashFruitCart(fc, hero.facing);
      soundEngine.playWoodWhack();
      soundEngine.playPotSmash();
      this.spawnParticles(fc.x, 0.8, fc.z, 20, 4.8);
      this.spawnComicPopup(fc.x, 1.85, fc.z, 'FRUIT SPILL!', '#22C55E');
      this.shakeIntensity = Math.max(this.shakeIntensity, 0.22);
      this.score += 120;
    }
  }

  // 1b. Interactive Steaming Chai Stall Kadhai (Strike to splash GARAM CHAI!)
  for (let i = 0; i < this.stage.chaiStalls.length; i++) {
    const stall = this.stage.chaiStalls[i];
    if (stall.cooldown > 0) continue;
    const dx = (stall.x - hero.x) * hero.facing;
    const dz = Math.abs(stall.z - hero.z);
    if ((is360Sweep ? Math.abs(dx) <= effectiveRangeX + 0.5 : dx >= -0.45 && dx <= effectiveRangeX + 0.55) && dz <= 1.45) {
      this.stage.triggerChaiSplash(stall);
      soundEngine.playChaiSplash();
      this.spawnParticles(stall.x, 1.0, stall.z, 22, 4.8);
      this.spawnComicPopup(stall.x, 1.85, stall.z, 'GARAM CHAI!', '#F97316');
      this.shakeIntensity = Math.max(this.shakeIntensity, 0.22);
      this.score += 120;
      // Scald & stun all cousins near the chai stall!
      for (let j = 0; j < this.enemies.length; j++) {
        const ce = this.enemies[j];
        if (!ce.alive) continue;
        if (Math.hypot(ce.x - stall.x, ce.z - stall.z) <= 3.6) {
          this.damageEnemy(ce, hero, 24, false, Math.sign(ce.x - stall.x || 1) * 1.4, 0);
          if (ce.alive) {
            ce.action = 'hitstun';
            ce.actionTime = 0;
            ce.actionDuration = 2.2;
          }
        }
      }
    }
  }

  // 2. Living village cousins / thugs / bikers / boss
  const isBackElbow = hero.action === 'back_elbow';
  let usedWeaponOnEnemy = false;
  for (let i = 0; i < this.enemies.length; i++) {
    const e = this.enemies[i];
    if (!e.alive || hero.hitIdsThisSwing.has(e.uid)) continue;
    const signedDx = (e.x - hero.x) * hero.facing;
    const dz = Math.abs(e.z - hero.z);
    const inRangeX = is360Sweep
      ? Math.abs(signedDx) <= effectiveRangeX
      : isBackElbow
        ? signedDx <= 0.45 && signedDx >= -effectiveRangeX
        : signedDx >= -0.45 && signedDx <= effectiveRangeX;

    if (inRangeX && dz <= effectiveRangeZ) {
      hero.hitIdsThisSwing.add(e.uid);
      usedWeaponOnEnemy = true;

      const heavy = spec.heavy || weapon?.kind === 'chair' || isBollywoodSlap;
      if (isBollywoodSlap) soundEngine.playSlap();
      else if (weapon?.kind === 'lathi') soundEngine.playWoodWhack();
      else soundEngine.playHit(heavy);

      const pushDir = isBackElbow
        ? (hero.facing === 1 ? -1 : 1)
        : is360Sweep
          ? (e.x >= hero.x ? 1 : -1)
          : hero.facing;
      const kb = (spec.knockbackX + (weapon?.kind === 'chair' ? 1.15 : 0) + (isBollywoodSlap ? 0.9 : 0)) * pushDir;
      const launchY = weapon?.kind === 'chair' ? Math.max(spec.launchY, 4.1) : spec.launchY;

      // Clean Hit Feedback: limit comic callouts strictly to combo finishers, throws, back-elbows, and critical hits!
      const isFinisher = hero.action === 'combo_finisher';
      const isThrow = hero.action === 'throw_execute';
      const isCriticalKO = e.hp <= effectiveDmg;
      const isChairCrit = weapon?.kind === 'chair' && (heavy || isCriticalKO);
      const isCriticalSlap = isBollywoodSlap && (isCriticalKO || hero.comboCount >= 3);

      let popup: string | undefined;
      if (e.onBike) {
        e.onBike = false;
        if (e.rig.bikeGroup) e.rig.bikeGroup.visible = false;
        // Leave Raju's idling 3D Splendor motorbike on the street for 8 seconds!
        const bike = this.stage.splendorBike;
        bike.state = 'idle';
        bike.x = THREE.MathUtils.clamp(e.x, this.lockedMinX + 1.0, this.lockedMaxX - 1.0);
        bike.z = THREE.MathUtils.clamp(e.z, LANE_MIN_Z + 0.4, LANE_MAX_Z - 0.4);
        bike.facing = e.facing;
        bike.idleTimer = 8.0;
        popup = 'CLOTHESLINE!';
        this.pickupSeq++;
        this.pickupToast = 'SPLENDOR MOTORBIKE IDLING! WALK UP & PRESS GRAB TO RIDE!';
        this.pickupToastTimer = 2.6;
      } else if (isChairCrit) {
        popup = 'BONK!';
      } else if (isCriticalSlap) {
        popup = 'THAPPAD!';
      } else if (isFinisher) {
        popup = hero.style === 'kung_fu_master' ? 'WATAAAH!' : hero.style === 'bollywood_hero' ? 'THAPPAD!' : hero.comboCount >= 4 ? 'KHALLAS!' : 'DHISHUM!';
      } else if (isThrow) {
        popup = 'DHISHUM!';
      } else if (isCriticalKO) {
        popup = weapon?.kind === 'lathi' ? 'BONK!' : isBollywoodSlap ? 'THAPPAD!' : 'DHISHUM!';
      }

      // Extra Mirchi Boon: heavy hooks & finishers ignite cousins for 3s spicy chilli burn!
      if (this.hasBoon('extra_mirchi') && (hero.action === 'rp' || hero.action === 'combo_finisher' || heavy)) {
        e.burnTimer = 3.0;
        e.burnTickTimer = 0.55;
        e.burnOwnerIdx = hero.index;
      }

      // Subtle Z push on heavy hooks toward back wall for easy wall-bounce juggles
      if (heavy && e.z < -1.2) {
        e.vz = -3.8;
      }

      this.damageEnemy(e, hero, effectiveDmg, heavy, kb, launchY, popup);

      // Landing normal JAB or HOOK hits restores Recoverable Green Health back into solid HP!
      if (
        hero.recoverableHp > 0 &&
        (hero.action === 'lp' || hero.action === 'lp2' || hero.action === 'rp' || hero.action === 'combo_finisher')
      ) {
        const restore = Math.min(hero.recoverableHp, Math.max(4, Math.round(effectiveDmg * 0.45)));
        hero.recoverableHp -= restore;
        hero.hp = Math.min(hero.maxHp, hero.hp + restore);
      }

      const rageMult = this.hasBoon('double_dhol') ? 1.35 : 1.0;
      hero.rage = Math.min(100, hero.rage + Math.round(spec.rageGain * rageMult));
      hero.callout = weapon
        ? weapon.kind === 'chair'
          ? 'CHAIR SMASH!'
          : 'LATHI WHACK!'
        : isBollywoodSlap
          ? 'THAPPAD!'
          : spec.label;
      hero.calloutSeq++;
      this.hitstopTimer = Math.max(this.hitstopTimer, spec.hitstop);
      this.shakeIntensity = Math.max(this.shakeIntensity, heavy ? 0.24 : 0.11);
    }
  }

  if (usedWeaponOnEnemy && hero.heldWeapon && !hero.heldWeapon.throwable) {
    hero.heldWeapon.durability -= 1;
    if (hero.heldWeapon.durability <= 0) {
      // Bazaar Bargain Boon: shockwave explosion on weapon's final hit!
      if (this.hasBoon('bazaar_bargain')) {
        soundEngine.playGroundSlam();
        this.spawnParticles(hero.x + hero.facing * 1.1, 1.0, hero.z, 24, 5.5);
        this.spawnComicPopup(hero.x + hero.facing * 1.1, 1.95, hero.z, 'BARGAIN BLAST!', '#F59E0B');
        this.shakeIntensity = Math.max(this.shakeIntensity, 0.34);
        for (let j = 0; j < this.enemies.length; j++) {
          const be = this.enemies[j];
          if (!be.alive) continue;
          if (Math.hypot(be.x - hero.x, be.z - hero.z) <= 3.6) {
            const bdir = be.x >= hero.x ? 1 : -1;
            this.damageEnemy(be, hero, 30, true, bdir * 4.5, 4.8, 'BOOM!');
          }
        }
      }
      hero.heldWeapon = null;
      this.syncHeroWeaponVisuals(hero);
    }
  }
}

export function damageEnemy(this: StreetBrawlEngine,
  e: EnemyRuntime,
  attacker: HeroRuntime | null,
  damage: number,
  heavy: boolean,
  knockbackVx: number,
  launchVy: number,
  popupText?: string
) {
  // Thali Tiwari's steel plate soaks up light frontal hits; heavy hits, launchers or flanking break through
  if (e.spec.trait === 'shield' && e.alive) {
    const facingAttacker = attacker ? (attacker.x - e.x) * e.facing > 0 : false;
    if (facingAttacker && !heavy && launchVy < 2.5) {
      e.hp = Math.max(1, e.hp - Math.max(1, Math.round(damage * 0.15)));
      e.hitFlash = 0.35;
      e.vx = knockbackVx * 0.25;
      soundEngine.playBlock();
      this.spawnParticles(e.x + e.facing * 0.5, 1.3, e.z, 6, 2.4);
      this.spawnComicPopup(e.x, 1.95, e.z, 'CLANG!', '#9CA3AF');
      this.hitstopTimer = Math.max(this.hitstopTimer, 0.03);
      return;
    }
    if (facingAttacker && !popupText) popupText = 'GUARD BREAK!';
  }
  e.hp = Math.max(0, e.hp - damage);
  e.hitFlash = 1.0;
  this.lastHitEnemyUid = e.uid;

  if (attacker) {
    attacker.comboCount += 1;
    attacker.comboTimer = 2.1;
    if (attacker.index === this.activeHeroIndex) {
      this.noKnockdownCombo += 1;
      this.checkCrowdHypeDrops(attacker);
    }
    if (attacker.index === 0) {
      this.stats.p1DamageDealt += damage;
      this.stats.p1MaxCombo = Math.max(this.stats.p1MaxCombo, attacker.comboCount);
    } else {
      this.stats.p2DamageDealt += damage;
      this.stats.p2MaxCombo = Math.max(this.stats.p2MaxCombo, attacker.comboCount);
    }
    this.score += damage * 4 + attacker.comboCount * 10;
  } else {
    this.score += damage * 3;
  }

  this.spawnParticles(e.x, 1.15, e.z, heavy ? 14 : 7, heavy ? 4.2 : 2.6);
  if (attacker) {
    const isKnockdownHit = e.hp <= 0 || launchVy >= 3.2;
    if (e.hp <= 0) this.hitstopTimer = Math.max(this.hitstopTimer, 0.11);
    else if (isKnockdownHit) this.hitstopTimer = Math.max(this.hitstopTimer, 0.08);
    if (attacker.comboCount > 0 && attacker.comboCount % 5 === 0) {
      this.spawnComicPopup(attacker.x, 2.25, attacker.z, `${attacker.comboCount} HIT COMBO!`, '#FACC15');
    }
    if (isKnockdownHit) {
      triggerHaptic([42, 24, 64]);
      this.shakeIntensity = Math.max(this.shakeIntensity, 0.36);
    } else if (heavy) {
      triggerHaptic(36);
      this.shakeIntensity = Math.max(this.shakeIntensity, 0.21);
    } else {
      triggerHaptic(18);
    }
  }
  if (popupText) {
    this.spawnComicPopup(
      e.x,
      1.85,
      e.z,
      popupText,
      popupText === 'THAPPAD!' || popupText === 'CLOTHESLINE!' || popupText === 'JUGGLE!'
        ? '#FDE047'
        : popupText === 'RETURN TO SENDER!'
          ? '#38BDF8'
          : '#F59E0B'
    );
  }

  if (e.hp <= 0) {
    if (this.grabbedByEnemyUid === e.uid) {
      this.releaseRearGrab();
    }
    if (e.onBike) {
      const bike = this.stage.splendorBike;
      bike.state = 'idle';
      bike.x = THREE.MathUtils.clamp(e.x, this.lockedMinX + 1.0, this.lockedMaxX - 1.0);
      bike.z = THREE.MathUtils.clamp(e.z, LANE_MIN_Z + 0.4, LANE_MAX_Z - 0.4);
      bike.facing = e.facing;
      bike.idleTimer = 8.0;
    }
    e.alive = false;
    e.onBike = false;
    e.dizzyTimer = 0;
    if (e.rig.bikeGroup) e.rig.bikeGroup.visible = false;
    e.action = 'ko';
    e.actionTime = 0;
    e.actionDuration = 1.4;
    e.vx = knockbackVx * 1.45;
    e.vy = Math.max(3.6, launchVy);
    e.koFadeTimer = 1.5;
    this.totalDefeated += 1;
    this.score += e.spec.scoreValue;
    soundEngine.playKO();
    this.shakeIntensity = Math.max(this.shakeIntensity, 0.3);

    // Trigger crisp 0.5-second Slow-Motion Zoom on the final knockout hit of each zone / boss wave!
    const remainingAlive = this.enemies.filter((o) => o.alive).length;
    const isZoneFinalKO = remainingAlive === 0 && (this.endlessMode || this.wave2Spawned);
    if (isZoneFinalKO || e.spec.archetype === 'boss') {
      this.slowMoTimer = 0.52;
      this.slowMoFocusX = e.x;
      this.slowMoFocusZ = e.z;
    }
  } else {
    // Bade Tau Phase 2 ("Moustache Rage") at < 50% HP!
    if (
      e.spec.archetype === 'boss' &&
      !this.bossPhase2Triggered &&
      e.hp <= e.maxHp * 0.5
    ) {
      this.bossPhase2Triggered = true;
      e.phase2Rage = true;
      e.action = 'boss_roar';
      e.actionTime = 0;
      e.actionDuration = 0.95;
      e.vx = 0;
      e.vy = 0;
      this.bossShockwaveCooldown = 1.6;
      soundEngine.playBossRoar();
      this.spawnParticles(e.x, 1.35, e.z, 28, 5.8);
      this.spawnComicPopup(e.x, 2.25, e.z, 'MOUSTACHE RAGE!', '#FACC15');
      this.shakeIntensity = Math.max(this.shakeIntensity, 0.38);
      this.speechBubble = {
        side: 2,
        speaker: e.spec.name,
        text: 'ENOUGH! FEEL MY MOUSTACHE RAGE!',
      };
      this.speechTimer = 2.4;
      // Knock back nearby heroes cleanly when Bade Tau roars!
      for (let h = 0; h < 2; h++) {
        const hr = this.heroes[h];
        if (hr.hp > 0 && Math.hypot(hr.x - e.x, hr.z - e.z) <= 3.6) {
          const pdir = hr.x >= e.x ? 1 : -1;
          hr.vx = pdir * 4.8;
          hr.vy = 2.6;
          hr.action = 'hitstun';
          hr.actionTime = 0;
          hr.actionDuration = 0.32;
        }
      }
      return;
    }

    // Dizzy FINISH! state when a heavy hit drops a non-boss enemy below 22% HP!
    if (
      heavy &&
      e.spec.archetype !== 'boss' &&
      e.hp > 0 &&
      e.hp <= e.maxHp * 0.24 &&
      e.action !== 'dizzy' &&
      !e.onBike
    ) {
      e.action = 'dizzy';
      e.dizzyTimer = 4.2;
      e.actionTime = 0;
      e.actionDuration = 4.2;
      e.vx = knockbackVx * 0.35;
      e.vy = 0;
      this.spawnComicPopup(e.x, 2.05, e.z, 'DIZZY!', '#FDE047');
      return;
    }

    e.action = launchVy > 2.5 ? 'knockdown' : 'hitstun';
    e.actionTime = 0;
    e.actionDuration = launchVy > 2.5 ? 0.72 : 0.34;
    e.vx = knockbackVx;
    e.vy = launchVy;
    if (launchVy > 2.5) e.wallBounced = false;
  }
}

export function checkHeroPickups(this: StreetBrawlEngine, hero: HeroRuntime) {
  for (let i = 0; i < this.stage.pickups.length; i++) {
    const p = this.stage.pickups[i];
    if (!p.active || (p.arcTimer && p.arcTimer > 0)) continue;
    if (Math.hypot(hero.x - p.x, hero.z - p.z) <= 1.2) {
      if (p.kind === 'chai') {
        const healTarget =
          hero.hp < hero.maxHp ? hero : this.getPartnerHero().hp > 0 ? this.getPartnerHero() : hero;
        const kadakMult = this.hasBoon('kadak_chai') ? 1.5 : 1.0;
        const healAmt = Math.round(healTarget.maxHp * 0.35 * kadakMult);
        healTarget.hp = Math.min(healTarget.maxHp, healTarget.hp + healAmt);
        healTarget.recoverableHp = 0;
        if (this.hasBoon('kadak_chai')) {
          hero.superArmorTimer = Math.max(hero.superArmorTimer, 5.0);
        }
        this.stage.consumePickup(p);
        soundEngine.playPickup(true);
        this.spawnParticles(hero.x, 1.0, hero.z, 14, 3.0);
        this.spawnComicPopup(
          hero.x,
          1.9,
          hero.z,
          this.hasBoon('kadak_chai') ? `+${healAmt} KADAK ARMOR!` : `+${healAmt} CHAI!`,
          '#22C55E'
        );
        this.pickupSeq++;
        this.pickupToast = this.hasBoon('kadak_chai')
          ? `KADAK CHAI! +${healAmt} HP & 5s SUPER-ARMOR!`
          : `HOT KULHAD CHAI! +${healAmt} HP`;
        this.pickupToastTimer = 1.8;
      } else if (!hero.heldWeapon) {
        const isThrowable = p.kind === 'stool' || p.kind === 'coconut';
        const masterBonus = hero.style === 'weapon_master' && !isThrowable ? 2 : 0;
        const baseDur = isThrowable ? 1 : (p.kind === 'lathi' ? 5 : 3) + masterBonus;
        const maxDur = !isThrowable && this.hasBoon('bazaar_bargain') ? baseDur * 2 : baseDur;
        hero.heldWeapon = {
          kind: p.kind,
          durability: maxDur,
          maxDurability: maxDur,
          throwable: isThrowable,
        };
        this.syncHeroWeaponVisuals(hero);
        this.stage.consumePickup(p);
        soundEngine.playPickup(false);
        this.pickupSeq++;
        this.pickupToast =
          p.kind === 'lathi'
            ? `PICKED UP BAMBOO LATHI (x${maxDur})!`
            : p.kind === 'chair'
              ? `PICKED UP FOLDING STEEL CHAIR (x${maxDur})!`
              : p.kind === 'stool'
                ? 'PLASTIC STOOL! PRESS ATTACK TO HURL!'
                : 'GIANT COCONUT! PRESS ATTACK TO THROW!';
        this.pickupToastTimer = 1.8;
      }
    }
  }
}

export function executeSignatureFinisher(this: StreetBrawlEngine, hero: HeroRuntime, target: EnemyRuntime) {
  this.releaseClinch(hero);
  hero.isSprinting = false;
  hero.facing = target.x >= hero.x ? 1 : -1;
  hero.x = THREE.MathUtils.lerp(hero.x, target.x - hero.facing * 0.95, 0.78);
  hero.z = THREE.MathUtils.lerp(hero.z, target.z, 0.82);
  hero.vx = 0;
  hero.vz = 0;
  hero.invulnTimer = 0.85;
  hero.action = 'finisher_slam';
  hero.actionTime = 0;
  hero.actionDuration = 0.62;
  this.finisherTargetUid = target.uid;
  this.finisherZoomTimer = 0.62;
  this.finisherZoomX = target.x;
  this.finisherZoomZ = target.z;

  target.dizzyTimer = 0;
  target.action = 'clinched';
  target.actionDuration = 0.55;
  target.vx = 0;
  target.vz = 0;

  const moveLabel = hero.profile.appearance.hasAxe
    ? 'AXE SLAM FINISH!'
    : hero.style === 'kushti_pehelwan'
      ? 'GIANT SWING FINISH!'
      : 'SIGNATURE FINISH!';
  hero.callout = moveLabel;
  hero.calloutSeq++;

  soundEngine.playFinisherImpact();
  this.finishersLanded += 1;
  hero.rage = Math.min(100, hero.rage + 26);
  this.noKnockdownCombo += 3;
  this.checkCrowdHypeDrops(hero);
  this.spawnParticles(target.x, 1.25, target.z, 26, 5.4);
  this.spawnComicPopup(target.x, 2.05, target.z, 'FINISH!', '#FDE047');
  this.hitstopTimer = Math.max(this.hitstopTimer, 0.085);
  this.shakeIntensity = Math.max(this.shakeIntensity, 0.36);
  triggerHaptic(75);

  this.damageEnemy(target, hero, target.hp + 60, true, hero.facing * 4.8, 5.2);
  // Guarantee a mini Chai health orb drop right near the defeated cousin!
  this.stage.spawnCrowdDrop(
    'chai',
    target.x,
    target.z - 0.5,
    THREE.MathUtils.clamp(target.x + hero.facing * 0.8, this.lockedMinX + 1, this.lockedMaxX - 1),
    THREE.MathUtils.clamp(target.z, LANE_MIN_Z + 0.5, LANE_MAX_Z - 0.5)
  );
}

export function releaseRearGrab(this: StreetBrawlEngine) {
  if (this.grabbedByEnemyUid !== null) {
    const grabber = this.enemies.find((e) => e.uid === this.grabbedByEnemyUid);
    if (grabber && grabber.alive && grabber.action === 'rear_grab') {
      grabber.action = 'idle';
      grabber.actionTime = 0;
      grabber.actionDuration = 0;
      grabber.rearGrabCooldown = 9.0;
    }
    this.grabbedByEnemyUid = null;
    this.grabEscapeProgress = 0;
    this.grabHoldTimer = 0;
    this.grabGlobalCooldown = 8.5;
  }
}

export function updateInteractiveProps(this: StreetBrawlEngine, active: HeroRuntime, _dt: number) {
  // 1. Stray Street Cricket Balls: walk into them to kick rapidly across the lane!
  for (let i = 0; i < this.stage.cricketBalls.length; i++) {
    const b = this.stage.cricketBalls[i];
    if (!b.kicked && active.hp > 0 && Math.hypot(active.x - b.x, active.z - b.z) <= 0.95) {
      const nearest = this.findNearestLivingEnemy(b.x, b.z);
      if (nearest && Math.hypot(nearest.x - b.x, nearest.z - b.z) <= 9.5) {
        const dx = nearest.x - b.x;
        const dz = nearest.z - b.z;
        const len = Math.max(0.1, Math.hypot(dx, dz));
        b.vx = (dx / len) * 14.5;
        b.vz = (dz / len) * 9.5;
      } else {
        b.vx = active.facing * 13.8;
        b.vz = active.vz * 0.5;
      }
      b.vy = 2.4;
      b.kicked = true;
      soundEngine.playCricketHit();
      this.spawnParticles(b.x, 0.25, b.z, 6, 2.6);
    }

    if (b.kicked && b.hitCooldown <= 0 && Math.hypot(b.vx, b.vz) > 2.2) {
      for (let j = 0; j < this.enemies.length; j++) {
        const e = this.enemies[j];
        if (!e.alive) continue;
        if (Math.hypot(e.x - b.x, e.z - b.z) <= 0.95) {
          b.hitCooldown = 0.45;
          b.vx = -b.vx * 0.45;
          b.vy = 3.2;
          soundEngine.playCricketHit();
          this.damageEnemy(e, active, 22, true, Math.sign(-b.vx || 1) * 2.4, 2.8, 'HOWZAT!');
          this.score += 110;
          break;
        }
      }
    }
  }

  // 2. Spilled Rolling Watermelons & Mangoes tripping cousins!
  for (let i = 0; i < this.stage.fruitCarts.length; i++) {
    const fc = this.stage.fruitCarts[i];
    for (let f = 0; f < fc.fruits.length; f++) {
      const fr = fc.fruits[f];
      if (!fr.active || fr.hitCooldown > 0 || Math.hypot(fr.vx, fr.vz) < 1.2) continue;
      for (let j = 0; j < this.enemies.length; j++) {
        const e = this.enemies[j];
        if (!e.alive) continue;
        if (Math.hypot(e.x - fr.x, e.z - fr.z) <= 0.92) {
          fr.hitCooldown = 0.55;
          fr.vx *= 0.4;
          fr.vy = 2.6;
          soundEngine.playHit(false);
          this.damageEnemy(
            e,
            active,
            fr.kind === 'watermelon' ? 18 : 12,
            fr.kind === 'watermelon',
            Math.sign(fr.vx || 1) * 2.2,
            fr.kind === 'watermelon' ? 3.2 : 0,
            fr.kind === 'watermelon' ? 'MELON BONK!' : undefined
          );
          break;
        }
      }
    }
  }
}

export function updateBossShockwave(this: StreetBrawlEngine, dt: number) {
  if (!this.shockwaveActive) return;
  this.shockwaveRadius += dt * 7.8;
  const maxR = 7.8;
  const opacity = Math.max(0, 1 - this.shockwaveRadius / maxR);
  this.stage.setShockwaveRing(true, this.shockwaveX, this.shockwaveZ, this.shockwaveRadius, opacity);

  for (let h = 0; h < 2; h++) {
    const bit = 1 << h;
    if ((this.shockwaveHitHeroMask & bit) !== 0) continue;
    const hero = this.heroes[h];
    if (hero.hp <= 0 || hero.invulnTimer > 0) continue;
    // Heroes can jump over the Ground-Pound Shockwave cleanly!
    if (hero.y > 0.34) continue;
    const dist = Math.hypot(hero.x - this.shockwaveX, (hero.z - this.shockwaveZ) * 1.15);
    if (Math.abs(dist - this.shockwaveRadius) <= 0.65) {
      this.shockwaveHitHeroMask |= bit;
      const blocked = hero.action === 'block';
      const dmg = blocked ? 5 : 18;
      hero.hp = Math.max(0, hero.hp - dmg);
      hero.hitFlash = 0.9;
      if (!blocked) {
        hero.recoverableHp = 0;
        hero.action = 'knockdown';
        hero.actionTime = 0;
        hero.actionDuration = 0.58;
        hero.vx = Math.sign(hero.x - this.shockwaveX || 1) * 3.8;
        hero.vy = 3.4;
        soundEngine.playHit(true);
        this.shakeIntensity = Math.max(this.shakeIntensity, 0.24);
      } else {
        soundEngine.playBlock();
      }
    }
  }

  if (this.shockwaveRadius >= maxR) {
    this.shockwaveActive = false;
    this.stage.setShockwaveRing(false, 0, 0, 1, 0);
  }
}
