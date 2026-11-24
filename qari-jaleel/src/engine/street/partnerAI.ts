// Street brawl engine: partnerAI methods (bound onto StreetBrawlEngine).
import * as THREE from 'three';
import { CombatAction, PlayerInputState } from '../../types/game';
import { soundEngine } from '../sound';
import { HeroRuntime, EnemyRuntime } from './types';
import { HERO_MOVES, LANE_MIN_Z, LANE_MAX_Z, triggerHaptic } from './data';
import type { StreetBrawlEngine } from '../streetBrawlEngine';

export function updatePartnerHeroAI(this: StreetBrawlEngine, partner: HeroRuntime, leader: HeroRuntime, dt: number) {
  if (partner.hp <= 0) {
    partner.action = 'ko';
    return;
  }

  partner.trailHp = THREE.MathUtils.damp(partner.trailHp, partner.hp, 4.5, dt);
  partner.hitFlash = Math.max(0, partner.hitFlash - dt * 5);
  partner.invulnTimer = Math.max(0, partner.invulnTimer - dt);
  partner.superArmorTimer = Math.max(0, partner.superArmorTimer - dt);
  if (partner.comboTimer > 0) {
    partner.comboTimer -= dt;
    if (partner.comboTimer <= 0) partner.comboCount = 0;
  }

  if (this.isPowerupAction(partner.action)) {
    this.stepHeroPowerup(partner, dt);
    return;
  }

  // ── DRIVE-BY TAG-TEAM ASSIST STATE MACHINE (HOLD SWITCH 0.3s) ───────────
  if (partner.assistState !== 'none') {
    partner.assistTimer -= dt;
    if (partner.assistState === 'dash_in') {
      const target = this.findNearestLivingEnemy(leader.x, leader.z);
      const goalX = target ? target.x - partner.facing * 1.15 : leader.x + partner.facing * 2.2;
      const goalZ = target ? target.z : leader.z;
      partner.x = THREE.MathUtils.lerp(partner.x, goalX, Math.min(1, dt * 15));
      partner.z = THREE.MathUtils.lerp(partner.z, goalZ, Math.min(1, dt * 15));
      partner.action = 'sprint';
      if (partner.assistTimer <= 0 || Math.hypot(goalX - partner.x, goalZ - partner.z) < 0.55) {
        partner.assistState = 'attack';
        partner.assistTimer = 0.44;
        const assistMove: CombatAction =
          partner.style === 'kalari_kicker'
            ? 'kick'
            : partner.style === 'kushti_pehelwan'
              ? 'dash_attack'
              : 'combo_finisher';
        this.startHeroMove(partner, assistMove);
        partner.vx = partner.facing * 5.8;
        partner.vy = partner.style === 'kalari_kicker' ? 3.4 : 0;
        // Guaranteed combo-juggle launcher burst around partner!
        for (let i = 0; i < this.enemies.length; i++) {
          const e = this.enemies[i];
          if (!e.alive) continue;
          if (Math.abs(e.x - partner.x) <= 2.75 && Math.abs(e.z - partner.z) <= 1.35) {
            const label =
              partner.style === 'kalari_kicker'
                ? 'TORNADO SPIN!'
                : partner.profile.appearance.hasAxe || partner.style === 'weapon_master'
                  ? 'AXE CLEAVE!'
                  : 'SHOULDER TACKLE!';
            this.damageEnemy(e, partner, 26, true, partner.facing * 2.4, 5.2, label);
            partner.hitIdsThisSwing.add(e.uid);
          }
        }
        soundEngine.playHit(true);
        this.shakeIntensity = Math.max(this.shakeIntensity, 0.24);
        this.spawnParticles(partner.x + partner.facing * 0.8, 1.15, partner.z, 18, 4.6);
      }
      this.clampHeroPosition(partner);
      return;
    }

    if (partner.assistState === 'attack') {
      partner.actionTime += dt;
      partner.x += partner.vx * dt;
      partner.vx *= Math.exp(-5.5 * dt);
      if (partner.y > 0 || partner.vy !== 0) {
        partner.y += partner.vy * dt;
        partner.vy -= 14 * dt;
        if (partner.y <= 0) {
          partner.y = 0;
          partner.vy = 0;
        }
      }
      this.clampHeroPosition(partner);
      if (partner.assistTimer <= 0) {
        partner.assistState = 'dash_out';
        partner.assistTimer = 0.28;
        partner.action = 'sprint';
        partner.actionDuration = 0;
      }
      return;
    }

    if (partner.assistState === 'dash_out') {
      const openZSide = leader.z > -0.35 ? -1 : 1;
      const backX = leader.x - leader.facing * 3.2;
      const backZ = THREE.MathUtils.clamp(leader.z + openZSide * 1.6, LANE_MIN_Z, LANE_MAX_Z);
      partner.x = THREE.MathUtils.lerp(partner.x, backX, Math.min(1, dt * 12));
      partner.z = THREE.MathUtils.lerp(partner.z, backZ, Math.min(1, dt * 12));
      this.clampHeroPosition(partner);
      if (partner.assistTimer <= 0) {
        partner.assistState = 'none';
        partner.action = 'idle';
        partner.actionTime = 0;
        partner.actionDuration = 0;
      }
      return;
    }
  }

  if (partner.actionDuration > 0) {
    partner.actionTime += dt;
    if (HERO_MOVES[partner.action]) {
      this.evaluateHeroAttackHits(partner);
    }
    if (partner.y > 0 || partner.vy !== 0) {
      partner.y += partner.vy * dt;
      partner.vy -= 14 * dt;
      if (partner.y <= 0) {
        partner.y = 0;
        partner.vy = 0;
      }
    }
    partner.x += partner.vx * dt;
    partner.vx *= Math.exp(-7.5 * dt);
    this.clampHeroPosition(partner);

    if (partner.actionTime >= partner.actionDuration) {
      partner.action = 'idle';
      partner.actionTime = 0;
      partner.actionDuration = 0;
    }
    return;
  }

  partner.aiThinkTimer -= dt;

  // Smart tag-team spacing: split crowd targets and flank from the opposite side of the leader
  const distToLeader = Math.hypot(partner.x - leader.x, partner.z - leader.z);
  const target = this.findPartnerTarget(partner, leader);
  const targetIsCloseToLeader = target !== null && Math.abs(target.x - leader.x) <= 6.2;

  if (distToLeader <= 5.8 && target && targetIsCloseToLeader) {
    if (partner.heldWeapon?.throwable && Math.abs(target.x - partner.x) < 5.5) {
      partner.facing = target.x >= partner.x ? 1 : -1;
      this.throwHeldProp(partner);
      return;
    }
    // If the leader is also close to this enemy, pincer from the opposite X side + open Z offset!
    const leaderNearTarget = Math.hypot(target.x - leader.x, target.z - leader.z) < 2.9;
    const flankSide = leaderNearTarget
      ? leader.x <= target.x
        ? 1
        : -1
      : partner.x <= target.x
        ? -1
        : 1;
    const desiredX = THREE.MathUtils.clamp(
      target.x + flankSide * 1.55,
      this.lockedMinX + 0.65,
      (this.zoneCleared ? 44.5 : this.lockedMaxX) - 0.65
    );
    const zSpread = leaderNearTarget ? (leader.z > -0.35 ? -0.55 : 0.55) : 0;
    const desiredZ = THREE.MathUtils.clamp(target.z + zSpread, LANE_MIN_Z, LANE_MAX_Z);
    const dx = desiredX - partner.x;
    const dz = desiredZ - partner.z;
    const dist = Math.hypot(dx, dz);

    partner.facing = target.x >= partner.x ? 1 : -1;

    if (dist > 0.45) {
      const speed = 4.35;
      partner.x += (dx / dist) * speed * dt;
      partner.z += (dz / dist) * (speed * 0.78) * dt;
      partner.action = 'walk_fwd';
    } else {
      partner.action = 'idle';
      if (partner.aiThinkTimer <= 0) {
        const roll = Math.random();
        if (roll < 0.36) this.startHeroMove(partner, 'lp');
        else if (roll < 0.54) this.startHeroMove(partner, 'kick');
        else if (roll < 0.72) this.startHeroMove(partner, 'spinning_heel_kick');
        else if (roll < 0.84) this.startHeroMove(partner, 'axe_kick');
        else this.startHeroMove(partner, 'rp');
        partner.aiThinkTimer = 0.52 + Math.random() * 0.42;
      }
    }
  } else {
    // Wide open-lane squad formation so partner stays visibly distinct from the active hero
    const openZSide = leader.z > -0.35 ? -1 : 1;
    const followX = THREE.MathUtils.clamp(
      leader.x - leader.facing * 3.25,
      this.lockedMinX + 0.65,
      (this.zoneCleared ? 44.5 : this.lockedMaxX) - 0.65
    );
    const followZ = THREE.MathUtils.clamp(leader.z + openZSide * 1.65, LANE_MIN_Z, LANE_MAX_Z);
    const dx = followX - partner.x;
    const dz = followZ - partner.z;
    const dist = Math.hypot(dx, dz);
    if (dist > 0.45) {
      const catchupSpeed = dist > 3.6 ? 6.8 : 4.9;
      partner.x += (dx / dist) * catchupSpeed * dt;
      partner.z += (dz / dist) * catchupSpeed * 0.78 * dt;
      partner.facing = dx >= 0 ? 1 : -1;
      partner.action = 'walk_fwd';
    } else {
      partner.facing = leader.facing;
      partner.action = 'idle';
    }
  }

  // Hard leash clamp so both heroes remain comfortably on screen while keeping wide room to flank
  const maxSepX = 6.0;
  if (partner.x < leader.x - maxSepX) partner.x = leader.x - maxSepX;
  if (partner.x > leader.x + maxSepX) partner.x = leader.x + maxSepX;

  this.clampHeroPosition(partner);
}

export function findPartnerTarget(this: StreetBrawlEngine, partner: HeroRuntime, leader: HeroRuntime): EnemyRuntime | null {
  let best: EnemyRuntime | null = null;
  let bestScore = Infinity;
  for (let i = 0; i < this.enemies.length; i++) {
    const e = this.enemies[i];
    if (!e.alive) continue;
    if (Math.abs(e.x - leader.x) > 6.4) continue;
    const distToPartner = Math.hypot(e.x - partner.x, (e.z - partner.z) * 1.15);
    const distToLeader = Math.hypot(e.x - leader.x, e.z - leader.z);
    const crowdingPenalty = distToLeader < 2.2 ? 4.4 : 0;
    const score = distToPartner + crowdingPenalty;
    if (score < bestScore) {
      bestScore = score;
      best = e;
    }
  }
  return best;
}

export function performHeroSwitch(this: StreetBrawlEngine, autoBecauseKO = false) {
  if (!autoBecauseKO && this.switchCooldown > 0) return;
  const nextIdx: 0 | 1 = this.activeHeroIndex === 0 ? 1 : 0;
  const nextHero = this.heroes[nextIdx];
  if (nextHero.hp <= 0) return;

  const prevHero = this.getActiveHero();
  this.releaseClinch(prevHero);
  this.activeHeroIndex = nextIdx;
  this.activeTagPopTimer = 0.45;
  this.switchCooldown = autoBecauseKO ? 0.5 : 1.5;
  this.switchSeq++;
  nextHero.invulnTimer = Math.max(nextHero.invulnTimer, 0.55);
  this.spawnParticles(nextHero.x, 1.1, nextHero.z, 14, 3.6);
  soundEngine.playTagSwitch();
  triggerHaptic(30);

  // Check if there is a nearby living cousin for a Tag-In Ambush combo extender!
  const target = this.findNearestLivingEnemy(prevHero.x, prevHero.z);
  if (!autoBecauseKO && target && Math.abs(target.x - prevHero.x) <= 6.2) {
    nextHero.facing = target.x >= nextHero.x ? 1 : -1;
    // Leap right into striking range with an ambush flying kick!
    nextHero.x = THREE.MathUtils.lerp(nextHero.x, target.x - nextHero.facing * 1.25, 0.72);
    nextHero.z = THREE.MathUtils.lerp(nextHero.z, target.z, 0.75);
    nextHero.vx = nextHero.facing * 4.5;
    nextHero.vy = 2.8;
    // Give the outgoing partner a crisp step-back into the open lane so they never clip together
    if (Math.hypot(prevHero.x - nextHero.x, prevHero.z - nextHero.z) < 2.6) {
      const openZSide = nextHero.z > -0.35 ? -1 : 1;
      prevHero.vx = -nextHero.facing * 4.4;
      prevHero.z = THREE.MathUtils.clamp(nextHero.z + openZSide * 1.45, LANE_MIN_Z, LANE_MAX_Z);
      this.clampHeroPosition(prevHero);
    }
    this.startHeroMove(nextHero, 'kick');
    this.spawnComicPopup(target.x, 1.85, target.z, 'TAG AMBUSH!', '#38BDF8');
    // Tag slam: switching mid-combo adds a joint finisher hit
    if (prevHero.comboCount >= 3) {
      this.damageEnemy(target, null, 12 + prevHero.comboCount * 3, true, nextHero.facing * 3.4, 3.4, 'TAG SLAM!');
      this.shakeIntensity = Math.max(this.shakeIntensity, 0.3);
      this.sayQuip('tag', 0.5);
    }
    this.switchBanner = `TAG AMBUSH · ${nextHero.profile.name.toUpperCase()}!`;
  } else {
    this.switchBanner = autoBecauseKO
      ? `${nextHero.profile.name.toUpperCase()} STEPS IN!`
      : `SWITCHED TO ${nextHero.profile.name.toUpperCase()}`;
  }
  this.switchBannerTimer = 1.45;
  if (!autoBecauseKO) this.triggerSquadCombo(nextHero, prevHero);
}

export function performPartnerAssist(this: StreetBrawlEngine) {
  if (this.assistCooldown > 0) return;
  const active = this.getActiveHero();
  const partner = this.getPartnerHero();
  if (partner.hp <= 0 || partner.assistState !== 'none') return;

  this.assistCooldown = 5.5;
  partner.assistReturnX = partner.x;
  partner.assistReturnZ = partner.z;
  // Dash in dramatically from behind the active hero's screen edge
  partner.x = THREE.MathUtils.clamp(
    active.x - active.facing * 7.2,
    this.lockedMinX + 0.4,
    this.lockedMaxX - 0.4
  );
  partner.z = active.z;
  partner.y = 0;
  partner.facing = active.facing;
  partner.invulnTimer = 1.45;
  partner.assistState = 'dash_in';
  partner.assistTimer = 0.28;
  partner.action = 'sprint';
  partner.actionTime = 0;
  partner.actionDuration = 0;

  soundEngine.playTagSwitch();
  this.spawnParticles(partner.x, 0.85, partner.z, 14, 3.6);
  this.switchSeq++;
  const moveName =
    partner.style === 'kalari_kicker'
      ? 'TORNADO SPIN ASSIST!'
      : partner.style === 'weapon_master' || partner.profile.appearance.hasAxe
        ? 'AXE CLEAVE ASSIST!'
        : partner.style === 'kushti_pehelwan'
          ? 'PEHELWAN TACKLE ASSIST!'
          : 'DRIVE-BY ASSIST!';
  this.switchBanner = `${partner.profile.name.toUpperCase()} · ${moveName}`;
  this.switchBannerTimer = 1.65;
  this.spawnComicPopup(active.x, 2.0, active.z, 'TAG ASSIST!', '#38BDF8');
  triggerHaptic(35);
}

export function performPanicSpecial(this: StreetBrawlEngine, hero: HeroRuntime) {
  if (hero.hp <= 6 || hero.ridingBikeTimer > 0) return;
  this.releaseClinch(hero);
  hero.isSprinting = false;
  const convertCost = Math.min(hero.hp - 1, Math.max(2, Math.round(hero.hp * 0.15)));
  hero.hp -= convertCost;
  hero.recoverableHp = Math.min(hero.maxHp - hero.hp, hero.recoverableHp + convertCost);
  hero.invulnTimer = Math.max(hero.invulnTimer, 0.6);
  hero.action = 'panic_special';
  hero.actionTime = 0;
  hero.actionDuration = 0.36;
  hero.vx = 0;
  hero.vz = 0;
  hero.callout = 'PANIC BURST!';
  hero.calloutSeq++;

  soundEngine.playPanicBurst();
  this.spawnParticles(hero.x, 1.1, hero.z, 26, 5.6);
  this.spawnComicPopup(hero.x, 2.05, hero.z, 'PANIC BURST!', '#4ADE80');
  this.shakeIntensity = Math.max(this.shakeIntensity, 0.28);
  this.hitstopTimer = Math.max(this.hitstopTimer, 0.055);
  triggerHaptic(55);

  // 360° crowd-clearing knockback to surrounding cousins
  for (let i = 0; i < this.enemies.length; i++) {
    const e = this.enemies[i];
    if (!e.alive) continue;
    const dist = Math.hypot(e.x - hero.x, (e.z - hero.z) * 1.15);
    if (dist <= 3.35) {
      const pushDir = e.x >= hero.x ? 1 : -1;
      this.damageEnemy(e, hero, 16, true, pushDir * 4.4, 4.1, 'BACK OFF!');
    }
  }
}

export function updatePartnerRevive(this: StreetBrawlEngine,
  active: HeroRuntime,
  partner: HeroRuntime,
  inp: PlayerInputState,
  dt: number
) {
  if (partner.hp > 0 || active.hp <= 0) {
    this.partnerReviveProgress = 0;
    return;
  }
  const dist = Math.hypot(active.x - partner.x, active.z - partner.z);
  if (dist <= 1.85 && (inp.block || inp.throwPressed)) {
    this.partnerReviveProgress = Math.min(1, this.partnerReviveProgress + dt * 0.92);
    if (this.partnerReviveProgress >= 1) {
      this.partnerReviveProgress = 0;
      partner.hp = Math.round(partner.maxHp * 0.38);
      partner.trailHp = partner.hp;
      partner.action = 'idle';
      partner.invulnTimer = 1.4;
      soundEngine.playReviveChime();
      this.spawnParticles(partner.x, 1.1, partner.z, 18, 4.0);
      this.spawnComicPopup(partner.x, 1.9, partner.z, 'REVIVED!', '#22C55E');
      this.pickupSeq++;
      this.pickupToast = `${partner.profile.name.toUpperCase()} IS BACK IN THE FIGHT!`;
      this.pickupToastTimer = 1.8;
    }
  } else {
    this.partnerReviveProgress = Math.max(0, this.partnerReviveProgress - dt * 0.65);
  }
}

export function triggerPartnerRescueDropkick(this: StreetBrawlEngine, active: HeroRuntime, partner: HeroRuntime) {
  const grabber = this.enemies.find((e) => e.uid === this.grabbedByEnemyUid && e.alive);
  this.releaseRearGrab();
  active.action = 'idle';
  active.actionTime = 0;
  active.actionDuration = 0;
  active.invulnTimer = 0.8;

  const rescueDir: 1 | -1 = grabber && grabber.x < active.x ? 1 : -1;
  partner.x = active.x - rescueDir * 2.4;
  partner.z = active.z;
  partner.y = 0.28;
  partner.facing = rescueDir;
  partner.invulnTimer = 0.85;
  partner.action = 'rescue_dropkick';
  partner.actionTime = 0;
  partner.actionDuration = 0.45;
  partner.vx = rescueDir * 6.5;

  soundEngine.playHit(true);
  this.spawnParticles(active.x, 1.2, active.z, 20, 4.8);
  this.spawnComicPopup(active.x, 2.05, active.z, 'TAG RESCUE!', '#38BDF8');
  this.shakeIntensity = Math.max(this.shakeIntensity, 0.24);
  this.hitstopTimer = Math.max(this.hitstopTimer, 0.055);
  triggerHaptic(50);

  for (let i = 0; i < this.enemies.length; i++) {
    const e = this.enemies[i];
    if (!e.alive) continue;
    if (Math.hypot(e.x - active.x, e.z - active.z) <= 2.65) {
      const pushDir = e.x >= active.x ? 1 : -1;
      this.damageEnemy(e, partner, 26, true, pushDir * 4.2, 4.4);
    }
  }
}
