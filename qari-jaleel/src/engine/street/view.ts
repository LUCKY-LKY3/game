// Street brawl engine: view methods (bound onto StreetBrawlEngine).
import * as THREE from 'three';
import { BrawlTargetEnemyHud, HudSnapshot } from '../../types/game';
import { FIGHTING_STYLES } from '../../data/roster';
import { applyFighterPose } from '../fighterRig';
import { applyThugPose } from '../villageThugs';
import { HeroRuntime, EnemyRuntime } from './types';
import { COMIC_POPUP_DURATION, COMIC_POPUP_MAX, STREET_ZONES, PARTICLE_POOL_SIZE } from './data';
import type { StreetBrawlEngine } from '../streetBrawlEngine';

export function renderAllRigs(this: StreetBrawlEngine, _dt: number) {
  const activeHero = this.getActiveHero();

  // Update soft ground-ring Z-plane alignment indicator beneath the nearest Z-aligned living cousin
  let bestAligned: EnemyRuntime | null = null;
  let bestAlignedDx = Infinity;
  for (let i = 0; i < this.enemies.length; i++) {
    const e = this.enemies[i];
    if (!e.alive || e.removed) continue;
    const adx = Math.abs(e.x - activeHero.x);
    const adz = Math.abs(e.z - activeHero.z);
    if (adz <= 0.62 && adx <= 6.2 && adx < bestAlignedDx) {
      bestAlignedDx = adx;
      bestAligned = e;
    }
  }
  if (bestAligned && activeHero.hp > 0) {
    this.zAlignedTargetUid = bestAligned.uid;
    this.zAlignRing.visible = true;
    this.zAlignRing.position.set(bestAligned.x, 0.036, bestAligned.z);
    const aPulse = 1 + Math.sin(this.elapsed * 9) * 0.07;
    this.zAlignRing.scale.set(aPulse, aPulse, 1);
    this.zAlignRingMat.color.set(bestAligned.action === 'windup' ? '#EF4444' : '#4ADE80');
    this.zAlignRingMat.opacity = bestAligned.action === 'windup' ? 0.85 : 0.58;
  } else {
    this.zAlignedTargetUid = null;
    this.zAlignRing.visible = false;
  }

  for (let i = 0; i < 2; i++) {
    const h = this.heroes[i];
    const isActive = i === this.activeHeroIndex;
    const targetYaw = h.facing === 1 ? Math.PI * 0.3 : -Math.PI * 0.3; // more toward camera so faces read
    h.visualYaw = THREE.MathUtils.damp(h.visualYaw, targetYaw, 14, _dt);
    if (h.landingSquashTimer > 0) {
      h.landingSquashTimer = Math.max(0, h.landingSquashTimer - _dt);
    }
    h.rig.root.position.set(h.x, h.y, h.z);
    const phase = h.actionDuration > 0 ? Math.min(1, h.actionTime / h.actionDuration) : 0;
    applyFighterPose(
      h.rig,
      h.action,
      phase,
      this.elapsed,
      h.facing,
      h.y,
      h.hitFlash,
      h.rage >= 100 || h.superArmorTimer > 0,
      h.style,
      h.vx,
      h.visualYaw,
      h.vy,
      h.landingSquashTimer / 0.18
    );

    // Seated motorbike posture while hero is riding Raju's Splendor!
    if (h.ridingBikeTimer > 0) {
      h.rig.hips.position.y = 1.04;
      h.rig.leftHip.rotation.x = -0.82;
      h.rig.rightHip.rotation.x = -0.82;
      h.rig.leftKnee.rotation.x = 1.15;
      h.rig.rightKnee.rotation.x = 1.15;
      h.rig.leftShoulder.rotation.x = -1.18;
      h.rig.rightShoulder.rotation.x = -1.18;
    }

    // Active hero high-contrast golden ground beacon vs muted thin AI partner ring (or green REVIVE ring if downed)
    h.activeRing.visible = true;
    if (h.hp <= 0) {
      h.activeRingMat.color.set('#22C55E');
      h.activeRingMat.opacity = 0.62 + Math.sin(this.elapsed * 8) * 0.34;
      const rPulse = 1.18 + Math.sin(this.elapsed * 8) * 0.14;
      h.activeRing.scale.set(rPulse, rPulse, 1);
    } else {
      const alignedHighlight = isActive && this.zAlignedTargetUid !== null;
      h.activeRingMat.color.set(
        isActive ? (alignedHighlight ? '#FEF08A' : '#FACC15') : '#38BDF8'
      );
      h.activeRingMat.opacity = isActive ? 0.96 : 0.22;
      const popBoost = isActive && this.activeTagPopTimer > 0 ? this.activeTagPopTimer * 0.45 : 0;
      const pulse = isActive ? 1.04 + Math.sin(this.elapsed * 7) * 0.06 + popBoost : 0.78;
      h.activeRing.scale.set(pulse, pulse, 1);
    }
    h.activeRing.position.y = 0.033 - h.y;
  }

  // Update unmistakable overhead `P1 · YOU` gold chevron & double ground halo for the active controlled hero
  if (this.activeTagPopTimer > 0) {
    this.activeTagPopTimer = Math.max(0, this.activeTagPopTimer - _dt);
  }
  const partnerHero = this.getPartnerHero();
  if (activeHero.hp > 0) {
    const bob = Math.sin(this.elapsed * 6.5) * 0.075;
    const popScale = 1 + Math.max(0, this.activeTagPopTimer) * 0.75;
    this.activeOverheadGroup.visible = true;
    this.activeOverheadGroup.position.set(activeHero.x, activeHero.y + 2.48 + bob, activeHero.z);
    this.activeOverheadGroup.scale.setScalar(popScale);
    this.activeOverheadArrow.rotation.y = this.elapsed * 2.6;

    this.activeOuterRing.visible = true;
    this.activeOuterRing.position.set(activeHero.x, 0.035, activeHero.z);
    const outerScale = 1.0 + Math.sin(this.elapsed * 5.2) * 0.07 + this.activeTagPopTimer * 0.5;
    this.activeOuterRing.scale.set(outerScale, outerScale, 1);

    this.activeFacingArrow.visible = true;
    this.activeFacingArrow.position.set(
      activeHero.x + activeHero.facing * 1.02,
      0.038,
      activeHero.z
    );
    this.activeFacingArrow.rotation.y = activeHero.facing === 1 ? Math.PI / 2 : -Math.PI / 2;
  } else {
    this.activeOverheadGroup.visible = false;
    this.activeOuterRing.visible = false;
    this.activeFacingArrow.visible = false;
  }

  // Update subtle compact `AI` tag (or prominent green `REVIVE!` tag when downed) above the partner
  if (partnerHero.hp <= 0) {
    this.partnerOverheadSprite.visible = true;
    if (this.partnerOverheadSprite.material !== this.partnerReviveMat) {
      this.partnerOverheadSprite.material = this.partnerReviveMat;
    }
    const rBob = Math.sin(this.elapsed * 8) * 0.08;
    this.partnerOverheadSprite.position.set(partnerHero.x, 1.35 + rBob, partnerHero.z);
    this.partnerOverheadSprite.scale.set(1.02, 0.38, 1);
  } else {
    this.partnerOverheadSprite.visible = true;
    if (this.partnerOverheadSprite.material !== this.partnerAiMat) {
      this.partnerOverheadSprite.material = this.partnerAiMat;
    }
    this.partnerOverheadSprite.position.set(partnerHero.x, partnerHero.y + 2.34, partnerHero.z);
    this.partnerOverheadSprite.scale.set(0.54, 0.21, 1);
  }

  for (let i = 0; i < this.enemies.length; i++) {
    const e = this.enemies[i];
    if (e.removed) continue;
    const targetYaw = e.facing === 1 ? Math.PI * 0.32 : -Math.PI * 0.32;
    e.visualYaw = THREE.MathUtils.damp(e.visualYaw, targetYaw, 12, _dt);
    const hugged = this.hugVictimUid === e.uid;
    if (hugged) e.rig.root.position.set(this.hugPos.x, this.hugPos.y, this.hugPos.z);
    else e.rig.root.position.set(e.x, e.y, e.z);
    const phase = e.actionDuration > 0 ? Math.min(1, e.actionTime / e.actionDuration) : 0;
    applyThugPose(
      e.rig,
      e.action,
      phase,
      this.elapsed,
      e.facing,
      e.y,
      e.hitFlash,
      e.spec.archetype === 'idiot' || e.spec.archetype === 'ranged',
      e.phase2Rage,
      e.visualYaw
    );
    if (hugged) {
      // Squeaky-toy victim: squashed by each squeeze, legs dangling, arms flailing
      const sq = this.hugSquash;
      e.rig.hips.scale.set(1 + sq * 0.32, 1 - sq * 0.3, 1 + sq * 0.32);
      const wob = Math.sin(this.elapsed * 22);
      e.rig.leftHip.rotation.x = -0.15 + wob * 0.25;
      e.rig.rightHip.rotation.x = -0.15 - wob * 0.25;
      e.rig.leftKnee.rotation.x = 0.4;
      e.rig.rightKnee.rotation.x = 0.4;
      e.rig.leftShoulder.rotation.x = -0.6 + wob * 0.3;
      e.rig.rightShoulder.rotation.x = -0.6 - wob * 0.3;
      e.rig.leftShoulder.rotation.z = -0.9;
      e.rig.rightShoulder.rotation.z = 0.9;
      e.rig.headGroup.scale.set(1 + sq * 0.2, 1 + sq * 0.28, 1 + sq * 0.2);
    } else if (e.rig.hips.scale.y !== 1) {
      e.rig.hips.scale.set(1, 1, 1);
    }
    if (e.onBike) {
      // Seated biker posture on top of the 3D Splendor bike!
      e.rig.hips.position.y = 1.02;
      e.rig.leftHip.rotation.x = -0.85;
      e.rig.rightHip.rotation.x = -0.85;
      e.rig.leftKnee.rotation.x = 1.15;
      e.rig.rightKnee.rotation.x = 1.15;
      e.rig.leftShoulder.rotation.x = -1.15;
      e.rig.rightShoulder.rotation.x = -1.15;
    }
  }
}

export function updateCamera(this: StreetBrawlEngine, dt: number) {
  const active = this.getActiveHero();
  const partner = this.getPartnerHero();
  const focusX = partner.hp > 0 ? active.x * 0.68 + partner.x * 0.32 : active.x;
  const minCamX = this.lockedMinX + 5.8;
  const maxCamX = this.zoneCleared && !this.endlessMode ? 40.5 : this.lockedMaxX - 5.8;
  let desiredCamX = THREE.MathUtils.clamp(focusX + 0.85, minCamX, Math.max(minCamX, maxCamX));
  let desiredZLead = THREE.MathUtils.clamp(active.z * 0.22 - 0.4, -1.1, 0.35);

  // Classic ~30-degree elevated Double Dragon arcade angle!
  // Closer, lower camera so fighters read clearly on phone screens.
  let camY = 6.1;
  let camZ = 10.4;
  let lookY = 0.95;
  // Debug: ?closeup puts the camera right beside the hero so characters can be inspected.
  if (typeof window !== 'undefined' && window.location.search.includes('closeup')) {
    camY = 2.1;
    camZ = 4.6;
    lookY = 1.35;
  }

  // Dramatic zoom-ins for Boss Intro, Signature FINISH!, and Final Zone KO Slow-Mo!
  if (this.bossIntroTimer > 0 && this.bossIntroTargetUid !== null) {
    const boss = this.enemies.find((e) => e.uid === this.bossIntroTargetUid);
    if (boss) {
      desiredCamX = boss.x;
      desiredZLead = boss.z;
      camY = 4.6;
      camZ = 8.4 + boss.z * 0.4;
      lookY = 1.45;
    }
  } else if (this.slowMoTimer > 0) {
    desiredCamX = this.slowMoFocusX;
    desiredZLead = this.slowMoFocusZ;
    camY = 6.2;
    camZ = 10.6;
    lookY = 1.05;
  } else if (this.finisherZoomTimer > 0) {
    desiredCamX = this.finisherZoomX;
    desiredZLead = this.finisherZoomZ;
    camY = 6.6;
    camZ = 11.2;
    lookY = 1.0;
  }

  // Smooth critically-damped spring follow
  const stiffness = 40;
  const damping = 12.6;
  const accel = (desiredCamX - this.cameraX) * stiffness - this.cameraVelX * damping;
  this.cameraVelX += accel * dt;
  this.cameraX += this.cameraVelX * dt;
  this.cameraLeadZ = THREE.MathUtils.damp(this.cameraLeadZ, desiredZLead, 6.0, dt);

  let sx = 0;
  let sy = 0;
  if (this.shakeIntensity > 0.005) {
    sx = (Math.random() - 0.5) * this.shakeIntensity;
    sy = (Math.random() - 0.5) * this.shakeIntensity;
    this.shakeIntensity *= Math.exp(-12 * dt);
  } else {
    this.shakeIntensity = 0;
  }

  const portraitBoost = this.camera.aspect < 0.9 ? 3.4 : 0;
  const targetCamPosX = this.cameraX + sx;
  const targetCamPosY = camY + sy;
  const targetCamPosZ = camZ + portraitBoost;

  this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, targetCamPosX, 16, dt);
  this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, targetCamPosY, 7.5, dt);
  this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, targetCamPosZ, 7.5, dt);

  this.cameraLookAt.set(this.cameraX + sx * 0.4, lookY + sy * 0.4, this.cameraLeadZ);
  this.camera.lookAt(this.cameraLookAt);
}

export function getHudSnapshot(this: StreetBrawlEngine): HudSnapshot {
  const toHud = (h: HeroRuntime) => ({
    id: h.profile.id,
    name: h.profile.name,
    nickname: h.profile.nickname,
    portraitUrl: h.profile.portraitUrl,
    hp: Math.ceil(h.hp),
    maxHp: h.maxHp,
    trailHp: h.trailHp,
    recoverableHp: Math.ceil(h.recoverableHp),
    rage: Math.round(h.rage),
    combo: h.comboCount,
    roundsWon: 0,
    action: h.action,
    callout: h.callout,
    calloutSeq: h.calloutSeq,
  });

  const boss = this.enemies.find((e) => e.alive && e.spec.archetype === 'boss');
  const lastHit = this.enemies.find((e) => e.uid === this.lastHitEnemyUid && e.alive);
  const activeHero = this.getActiveHero();
  const partnerHero = this.getPartnerHero();
  const target = boss ?? lastHit ?? this.findNearestLivingEnemy(activeHero.x, activeHero.z);

  const targetEnemy: BrawlTargetEnemyHud | null = target
    ? {
        name: target.spec.name,
        subtitle: target.spec.subtitle,
        hp: Math.ceil(target.hp),
        maxHp: target.maxHp,
        isBoss: target.spec.archetype === 'boss',
      }
    : null;

  const zone = STREET_ZONES[Math.min(this.currentZoneIdx, STREET_ZONES.length - 1)];
  const remainingInZone = this.endlessMode
    ? this.enemies.filter((e) => e.alive).length + this.endlessQueue.length
    : this.enemies.filter((e) => e.alive).length + (this.wave2Spawned ? 0 : zone.wave2.length);
  const bike = this.stage.splendorBike;
  const nearSplendorBike =
    bike.state === 'idle' &&
    activeHero.ridingBikeTimer <= 0 &&
    Math.hypot(activeHero.x - bike.x, activeHero.z - bike.z) <= 2.2;

  // Project nearest Dizzy FINISH! enemy to screen percentage for crisp overhead indicator
  let dizzyPrompt: { xPct: number; yPct: number; enemyName: string } | null = null;
  const dizzyEnemy = this.enemies.find((e) => e.alive && e.action === 'dizzy');
  if (dizzyEnemy) {
    this._projVec.set(dizzyEnemy.x, dizzyEnemy.y + 2.35, dizzyEnemy.z).project(this.camera);
    dizzyPrompt = {
      xPct: THREE.MathUtils.clamp((this._projVec.x * 0.5 + 0.5) * 100, 12, 88),
      yPct: THREE.MathUtils.clamp((-this._projVec.y * 0.5 + 0.5) * 100, 16, 72),
      enemyName: dizzyEnemy.spec.name,
    };
  }

  const grabEscapePrompt =
    this.grabbedByEnemyUid !== null
      ? {
          progress: Number(this.grabEscapeProgress.toFixed(2)),
          partnerCanRescue: partnerHero.hp > 0,
        }
      : null;

  return {
    phase: this.phase,
    roundNumber: this.endlessMode ? this.endlessWave : zone.index,
    timer: 99,
    announcement: this.announcement,
    subAnnouncement: this.subAnnouncement,
    p1: toHud(this.heroes[0]),
    p2: toHud(this.heroes[1]),
    stats: { ...this.stats },
    rageFlashSide: this.rageFlashSide,
    speechBubble: this.speechBubble ? { ...this.speechBubble } : null,
    comedyTimer: this.comedyTimer,
    streakMult: this.endlessMode ? this.scoreMult : 1,
    brawl: {
      activeHeroIndex: this.activeHeroIndex,
      hero1Weapon: this.heroes[0].heldWeapon ? { ...this.heroes[0].heldWeapon } : null,
      hero2Weapon: this.heroes[1].heldWeapon ? { ...this.heroes[1].heldWeapon } : null,
      hero1StyleLabel: FIGHTING_STYLES[this.heroes[0].style].shortLabel,
      hero2StyleLabel: FIGHTING_STYLES[this.heroes[1].style].shortLabel,
      zone: zone.index,
      totalZones: STREET_ZONES.length,
      zoneName: this.endlessMode ? `Endless Mohalla · Wave ${this.endlessWave}` : zone.name,
      score: this.score,
      enemiesRemaining: remainingInZone,
      totalDefeated: this.totalDefeated,
      goArrowVisible:
        !this.endlessMode &&
        this.zoneCleared &&
        this.highFiveTimer <= 0 &&
        !this.pendingBoons &&
        this.currentZoneIdx < STREET_ZONES.length - 1,
      targetEnemy,
      switchBanner: this.switchBanner,
      switchSeq: this.switchSeq,
      pickupToast: this.pickupToast,
      pickupSeq: this.pickupSeq,
      comicPopups: this.popups.map(({ id, text, xPct, yPct, color, life }) => {
        const age = Math.max(0, COMIC_POPUP_DURATION - life);
        const popIn = Math.min(1, age / 0.08);
        const fadeWindow = 0.34;
        const opacity = life >= fadeWindow ? 1 : Math.pow(Math.max(0, life / fadeWindow), 1.35);
        const scale = popIn < 1 ? 1.24 - popIn * 0.24 : 0.92 + opacity * 0.08;
        return {
          id,
          text,
          xPct,
          yPct,
          color,
          opacity: Number(opacity.toFixed(3)),
          scale: Number(scale.toFixed(3)),
        };
      }),
      rickshawWarning: this.rickshawWarnTimer > 0,
      partnerDown: partnerHero.hp <= 0 && activeHero.hp > 0,
      partnerReviveProgress: this.partnerReviveProgress,
      switchCooldownPct: Math.min(1, this.switchCooldown / 1.5),
      assistCooldownPct: Math.min(1, this.assistCooldown / 5.5),
      isClinching: activeHero.clinchTargetUid !== null,
      isSprinting: activeHero.isSprinting,
      zAligned: this.zAlignedTargetUid !== null,
      nearSplendorBike,
      ridingBikeTimer: Number(activeHero.ridingBikeTimer.toFixed(1)),
      splendorBikeRemaining: bike.state === 'idle' ? Math.ceil(bike.idleTimer) : 0,
      pendingBoons: this.pendingBoons ? [...this.pendingBoons] : null,
      activeBoons: Array.from(this.activeBoons),
      crowdHypeTier: this.crowdHypeTier,
      isEndless: this.endlessMode,
      endlessWave: this.endlessWave,
      endlessBestWave: this.endlessBestWave,
      bossIntroBanner: this.bossIntroBanner ? { ...this.bossIntroBanner } : null,
      dizzyPrompt,
      grabEscapePrompt,
      bossPhase2Active: this.bossPhase2Triggered && Boolean(boss),
      scorecard: this.scorecard ? { ...this.scorecard } : null,
    },
  };
}

export function updateParticles(this: StreetBrawlEngine, dt: number) {
  for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
    const p = this.particles[i];
    if (!p.active) continue;
    p.life -= dt;
    if (p.life <= 0) {
      p.active = false;
      this.dummy.position.set(0, -50, 0);
      this.dummy.scale.setScalar(0.001);
      this.dummy.updateMatrix();
      this.particleMesh.setMatrixAt(i, this.dummy.matrix);
      continue;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.z += p.vz * dt;
    p.vy -= 11 * dt;
    const s = p.scale * (p.life / p.maxLife);
    this.dummy.position.set(p.x, Math.max(0.06, p.y), p.z);
    this.dummy.rotation.set(p.life * 7, p.life * 5, 0);
    this.dummy.scale.setScalar(s);
    this.dummy.updateMatrix();
    this.particleMesh.setMatrixAt(i, this.dummy.matrix);
  }
  this.particleMesh.instanceMatrix.needsUpdate = true;
}

export function spawnParticles(this: StreetBrawlEngine, x: number, y: number, z: number, count: number, speed: number) {
  const targetCount = this.isMobile ? Math.max(2, Math.round(count * 0.52)) : count;
  let spawned = 0;
  for (let i = 0; i < PARTICLE_POOL_SIZE && spawned < targetCount; i++) {
    const p = this.particles[i];
    if (p.active) continue;
    const a = Math.random() * Math.PI * 2;
    const sp = (0.4 + Math.random() * 0.8) * speed;
    p.active = true;
    p.x = x;
    p.y = y;
    p.z = z;
    p.vx = Math.cos(a) * sp;
    p.vy = 1.8 + Math.random() * 3.4;
    p.vz = Math.sin(a) * sp * 0.6;
    p.maxLife = 0.28 + Math.random() * 0.24;
    p.life = p.maxLife;
    p.scale = 0.6 + Math.random() * 0.9;
    spawned++;
  }
}

export function spawnComicPopup(this: StreetBrawlEngine, wx: number, wy: number, wz: number, text: string, color: string) {
  this._projVec.set(wx, wy, wz).project(this.camera);
  const xPct = THREE.MathUtils.clamp((this._projVec.x * 0.5 + 0.5) * 100, 14, 86);
  const yPct = THREE.MathUtils.clamp((-this._projVec.y * 0.5 + 0.5) * 100, 18, 70);

  // Replace an existing near-fresh identical callout so big multi-hit sweeps never spam overlapping text
  for (let i = this.popups.length - 1; i >= 0; i--) {
    const existing = this.popups[i];
    if (existing.text === text && existing.life > COMIC_POPUP_DURATION * 0.62) {
      existing.xPct = xPct;
      existing.yPct = yPct;
      existing.life = COMIC_POPUP_DURATION;
      return;
    }
  }

  this.popups.push({
    id: this.nextPopupId++,
    text,
    xPct,
    yPct,
    color,
    opacity: 1,
    life: COMIC_POPUP_DURATION,
  });
  while (this.popups.length > COMIC_POPUP_MAX) {
    this.popups.shift();
  }
}
