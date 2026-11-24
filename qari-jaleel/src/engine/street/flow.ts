// Street brawl engine: flow methods (bound onto StreetBrawlEngine).
import * as THREE from 'three';
import { BrawlRank, BrawlScorecard, VillageBoonId } from '../../types/game';
import { saveEndlessRecord, saveStreetBrawlRecord } from '../../utils/storage';
import { createVillageThugRig, VILLAGE_COUSIN_ROSTER, VillageThugSpec } from '../villageThugs';
import { soundEngine } from '../sound';
import { StreetZoneConfig, HeroRuntime, EnemyRuntime } from './types';
import { VILLAGE_BOON_POOL, STREET_ZONES } from './data';
import type { StreetBrawlEngine } from '../streetBrawlEngine';

/** Endless wave plan: who comes, in what order, plus the banner text. Bosses rotate every 5th wave. */
export function planEndlessWave(waveNum: number): { keys: string[]; sub: string } {
  const bossCycle = ['chappal_chaudhary', 'dhol_daku', 'bade_tau'];
  const isBossWave = waveNum % 5 === 0;
  const tier1 = ['bunty', 'golu', 'tinku', 'chintu'];
  const tier2 = ['pappu', 'lathi_lala', 'chappal_chacha', 'thali_tiwari'];
  const pool = waveNum < 3 ? tier1 : waveNum < 6 ? [...tier1, ...tier2.slice(0, 2)] : [...tier1, ...tier2, 'kalu_goon'];
  const total = Math.min(10, 3 + Math.floor(waveNum * 0.7));
  const keys: string[] = [];
  let sub = 'FRESH COUSIN WAVE INCOMING';
  if (isBossWave) {
    const boss = bossCycle[(waveNum / 5 - 1) % bossCycle.length];
    keys.push(boss);
    sub = boss === 'bade_tau' ? 'BADE TAU JOINS THE MOHALLA!' : `${VILLAGE_COUSIN_ROSTER[boss].name.toUpperCase()} ARRIVES!`;
  }
  let ranged = 0;
  const minions = isBossWave ? 2 + Math.floor(waveNum / 10) : total;
  for (let i = 0; i < minions; i++) {
    let k = pool[(waveNum * 3 + i * 2) % pool.length];
    if (k === 'chappal_chacha' && ++ranged > 1) k = 'bunty';
    keys.push(k);
  }
  if (!isBossWave && waveNum % 5 === 3) {
    keys.splice(Math.ceil(keys.length / 2), 0, 'moti_pehelwan');
    sub = 'MOTI PEHELWAN AMBUSH!';
  } else if (!isBossWave && waveNum >= 2 && waveNum % 2 === 0) {
    keys.splice(Math.ceil(keys.length / 2), 0, 'raju_bike');
    sub = 'RAJU ON THE BIKE!';
  }
  return { keys, sub };
}

/** Spawn the next few of the queued cousins (never more than 3 at once, keeps the lane readable). */
export function spawnEndlessBatch(this: StreetBrawlEngine) {
  const endlessZone: StreetZoneConfig = {
    index: 1,
    name: 'Endless Mohalla',
    lockMinX: this.lockedMinX,
    lockMaxX: this.lockedMaxX,
    triggerX: 0,
    wave1: [],
    wave2: [],
  };
  const batch = this.endlessQueue.splice(0, 3);
  if (batch.length) this.spawnWave(batch, endlessZone, Math.min(2.2, 1 + (this.endlessWave - 1) * 0.08));
}

export function spawnEndlessWave(this: StreetBrawlEngine, waveNum: number) {
  this.endlessQueue = planEndlessWave(waveNum).keys;
  this.spawnEndlessBatch();
}

export function spawnWave(this: StreetBrawlEngine, keys: string[], zone: StreetZoneConfig, waveScale = 1) {
  keys.forEach((key, idx) => {
    const base = VILLAGE_COUSIN_ROSTER[key] ?? VILLAGE_COUSIN_ROSTER.bunty;
    const uid = this.nextEnemyUid++;
    const spec: VillageThugSpec = {
      ...base,
      id: `${key}_${uid}`,
      maxHp: Math.round(base.maxHp * this.difficultyScale * waveScale),
      damage: Math.max(4, Math.round(base.damage * this.difficultyScale * Math.min(1.5, waveScale))),
    };
    const rig = createVillageThugRig(spec);
    const fromRight = idx % 2 === 0 || spec.archetype === 'boss' || spec.archetype === 'biker';
    const spawnX = fromRight
      ? zone.lockMaxX - 0.6 + idx * 1.15
      : Math.max(zone.lockMinX + 0.6, this.cameraX - 6.8 - idx * 0.7);
    const spawnZ = -2.4 + ((idx * 1.45) % 4.6);

    rig.root.position.set(spawnX, 0, spawnZ);
    this.scene.add(rig.root);

    const enemy: EnemyRuntime = {
      uid,
      spec,
      rig,
      x: spawnX,
      y: 0,
      z: spawnZ,
      vx: 0,
      vy: 0,
      vz: 0,
      facing: fromRight ? -1 : 1,
      visualYaw: fromRight ? -Math.PI * 0.42 : Math.PI * 0.42,
      hp: spec.maxHp,
      maxHp: spec.maxHp,
      action: 'walk',
      actionTime: 0,
      actionDuration: 0,
      hasHitThisSwing: false,
      telegraphed: false,
      hitFlash: 0,
      aiCooldown: 0.45 + idx * 0.28,
      aiState: 'circle',
      orbitAngle: (fromRight ? 0 : Math.PI) + (idx - 1) * 0.65,
      orbitDir: idx % 2 === 0 ? 1 : -1,
      stateTimer: 0.65 + (idx % 3) * 0.35,
      reactionTimer: 0,
      onBike: spec.archetype === 'biker',
      bowlingActive: false,
      bowlingOwnerIdx: 0,
      bowlingHitUids: new Set(),
      wallBounced: false,
      burnTimer: 0,
      burnTickTimer: 0,
      burnOwnerIdx: 0,
      dizzyTimer: 0,
      rearGrabCooldown: 5.5 + idx * 1.4,
      specialCooldown: 3.2,
      specialIdx: 0,
      special: null,
      specialFired: false,
      chargeTimer: 0,
      phase3: false,
      phase2Rage: false,
      koFadeTimer: 0,
      alive: true,
      removed: false,
    };
    this.enemies.push(enemy);

    if (spec.archetype === 'boss') {
      this.lastHitEnemyUid = enemy.uid;
      this.bossPhase2Triggered = false;
      this.bossShockwaveCooldown = 3.2;
      soundEngine.setDholIntensity('boss');
      // Dramatic 1.2s Boss Intro Zoom & Arcade Title Banner!
      this.bossIntroTimer = 1.25;
      this.bossIntroTargetUid = enemy.uid;
      this.bossIntroBanner = {
        name: spec.name,
        subtitle: spec.subtitle.toUpperCase(),
      };
      soundEngine.playBossRoar();
    }
    if (spec.archetype === 'boss' || spec.archetype === 'biker' || key === 'moti_pehelwan') {
      this.speechBubble = {
        side: 2,
        speaker: spec.name,
        text: spec.battleCry,
      };
      this.speechTimer = 2.6;
    }
  });
}

export function clearEnemies(this: StreetBrawlEngine) {
  for (let i = 0; i < this.enemies.length; i++) {
    const e = this.enemies[i];
    if (!e.removed) {
      this.scene.remove(e.rig.root);
      e.rig.dispose();
      e.removed = true;
    }
  }
  this.enemies = [];
}

export function updateZoneProgression(this: StreetBrawlEngine) {
  const livingCount = this.enemies.filter((e) => e.alive).length;

  // Endless Mohalla Survival Mode: infinite escalating waves!
  if (this.endlessMode) {
    // Reinforcements trickle in once the lane thins out
    if (this.endlessQueue.length > 0 && livingCount <= 1 && this.phase === 'FIGHTING') {
      this.spawnEndlessBatch();
      return;
    }
    if (livingCount === 0 && this.endlessQueue.length === 0 && this.slowMoTimer <= 0.05) {
      this.endlessWave += 1;
      this.heroes.forEach((h) => {
        if (h.hp > 0) h.hp = Math.min(h.maxHp, h.hp + 16);
      });
      if (this.endlessWave % 3 === 1) {
        // Offer Village Boon + celebratory High-Five every 3 waves!
        this.highFiveTimer = 1.05;
        this.highFiveChimePlayed = false;
      }
      this.announcement = `WAVE ${this.endlessWave}`;
      this.subAnnouncement = planEndlessWave(this.endlessWave).sub;
      this.phase = 'ROUND_INTRO';
      this.phaseTimer = 1.05;
      this.spawnEndlessWave(this.endlessWave);
      soundEngine.playRoundStart();
    }
    return;
  }

  const zone = STREET_ZONES[this.currentZoneIdx];

  if (livingCount === 0 && !this.wave2Spawned) {
    this.wave2Spawned = true;
    this.spawnWave(zone.wave2, zone);
    return;
  }

  if (livingCount === 0 && this.wave2Spawned && !this.zoneCleared && this.slowMoTimer <= 0.05) {
    if (this.currentZoneIdx >= STREET_ZONES.length - 1) {
      this.finishRun(true);
      return;
    }

    this.zoneCleared = true;
    this.heroes.forEach((h) => {
      if (h.hp > 0) h.hp = Math.min(h.maxHp, h.hp + 20);
    });
    // Celebratory Zone-Clear Tag-Team High-Five before Boon Cards & flashing GO >>!
    this.highFiveTimer = 1.05;
    this.highFiveChimePlayed = false;
  }

  if (this.zoneCleared && this.currentZoneIdx < STREET_ZONES.length - 1) {
    const nextZone = STREET_ZONES[this.currentZoneIdx + 1];
    const active = this.getActiveHero();
    if (active.x >= nextZone.triggerX) {
      this.currentZoneIdx += 1;
      this.wave2Spawned = false;
      this.zoneCleared = false;
      this.lockedMinX = nextZone.lockMinX;
      this.lockedMaxX = nextZone.lockMaxX;
      this.announcement = `ZONE ${nextZone.index} · ${nextZone.name.toUpperCase()}`;
      this.subAnnouncement =
        nextZone.index === 3
          ? 'MELA FESTIVAL SHOWDOWN'
          : 'MID-BOSS AMBUSH AHEAD';
      this.phase = 'ROUND_INTRO';
      this.phaseTimer = 1.25;
      this.spawnWave(nextZone.wave1, nextZone);
      soundEngine.playRoundStart();
    }
  }
}

export function computeScorecard(this: StreetBrawlEngine, victory: boolean): BrawlScorecard {
  const highestCombo = Math.max(this.stats.p1MaxCombo, this.stats.p2MaxCombo);
  const clearTimeSec = Math.max(1, Math.round(this.runElapsedSec));
  let points = 0;
  if (victory) points += 40;
  if (clearTimeSec <= 125) points += 25;
  else if (clearTimeSec <= 185) points += 15;
  else points += 6;
  points += Math.min(20, highestCombo);
  points += Math.min(12, this.finishersLanded * 4);
  points += Math.min(10, this.cousinsRickshawed * 3);
  if (this.endlessMode) {
    points = this.endlessWave * 10 + highestCombo + this.finishersLanded * 3;
  }

  const rank: BrawlRank = points >= 84 ? 'S' : points >= 62 ? 'A' : points >= 40 ? 'B' : 'C';

  let isNewBestScore = false;
  let isNewBestWave = false;
  let isNewBestRank = false;

  if (this.endlessMode) {
    const saved = saveEndlessRecord({
      wave: this.endlessWave,
      score: this.score,
      highestCombo,
    });
    isNewBestScore = saved.isNewBestScore;
    isNewBestWave = saved.isNewBestWave;
    this.endlessBestWave = saved.records.endlessBestWave;
  } else {
    const saved = saveStreetBrawlRecord({
      score: this.score,
      rank,
      clearTimeSec,
      highestCombo,
      victory,
    });
    isNewBestScore = saved.isNewBestScore;
    isNewBestRank = saved.isNewBestRank;
  }

  return {
    clearTimeSec,
    highestCombo,
    cousinsRickshawed: this.cousinsRickshawed,
    finishersLanded: this.finishersLanded,
    score: this.score,
    totalDefeated: this.totalDefeated,
    rank,
    isEndless: this.endlessMode,
    endlessWave: this.endlessWave,
    isNewBestScore,
    isNewBestWave,
    isNewBestRank,
  };
}

export function finishRun(this: StreetBrawlEngine, victory: boolean) {
  this.phase = 'MATCH_OVER';
  this.stats.winnerSide = victory ? 1 : 2;
  this.scorecard = this.computeScorecard(victory);
  if (victory) {
    this.announcement = 'VILLAGE STREET CLEARED!';
    this.subAnnouncement = 'BADE TAU & THE COUSINS HAVE BEEN DEFEATED';
    this.heroes.forEach((h) => {
      if (h.hp > 0) h.action = 'victory';
    });
    soundEngine.playGoPrompt();
  } else {
    this.announcement = this.endlessMode ? `MOHALLA WAVE ${this.endlessWave} FALLEN` : 'SQUAD KNOCKED OUT';
    this.subAnnouncement = this.endlessMode
      ? 'THE ENDLESS COUSIN SWARM PREVAILED'
      : 'THE VILLAGE COUSINS HELD THE STREET';
    soundEngine.playKO();
  }
  soundEngine.stopDholLoop();
  this.onMatchFinish?.(victory ? 1 : 2);
}

export function stepTagHighFive(this: StreetBrawlEngine, dt: number) {
  this.highFiveTimer = Math.max(0, this.highFiveTimer - dt);
  const active = this.getActiveHero();
  const partner = this.getPartnerHero();
  const midX = THREE.MathUtils.clamp((active.x + partner.x) * 0.5, this.lockedMinX + 2.0, this.lockedMaxX - 2.0);
  const midZ = THREE.MathUtils.clamp((active.z + partner.z) * 0.5, -1.6, 1.4);

  active.x = THREE.MathUtils.lerp(active.x, midX - 0.62, Math.min(1, dt * 8));
  active.z = THREE.MathUtils.lerp(active.z, midZ, Math.min(1, dt * 8));
  active.facing = 1;
  active.action = 'high_five';
  active.actionDuration = 1.05;
  active.actionTime = 1.05 - this.highFiveTimer;

  if (partner.hp > 0) {
    partner.x = THREE.MathUtils.lerp(partner.x, midX + 0.62, Math.min(1, dt * 8));
    partner.z = THREE.MathUtils.lerp(partner.z, midZ, Math.min(1, dt * 8));
    partner.facing = -1;
    partner.action = 'high_five';
    partner.actionDuration = 1.05;
    partner.actionTime = 1.05 - this.highFiveTimer;
  }

  if (!this.highFiveChimePlayed && this.highFiveTimer <= 0.55) {
    this.highFiveChimePlayed = true;
    soundEngine.playHighFive();
    this.spawnParticles(midX, 1.65, midZ, 18, 4.2);
    this.spawnComicPopup(midX, 2.25, midZ, 'TAG TEAM!', '#FACC15');
  }

  if (this.highFiveTimer <= 0) {
    active.action = 'idle';
    active.actionTime = 0;
    active.actionDuration = 0;
    if (partner.hp > 0) {
      partner.action = 'idle';
      partner.actionTime = 0;
      partner.actionDuration = 0;
    }
    soundEngine.playGoPrompt();
    // Offer 3 random Village Boon Cards right after the celebratory high-five!
    const available = VILLAGE_BOON_POOL.filter((b) => !this.activeBoons.has(b.id));
    if (available.length > 0) {
      const shuffled = [...available].sort(() => Math.random() - 0.5);
      this.pendingBoons = shuffled.slice(0, 3);
    }
  }
}

/** Between-Zone Village Boon Card selection called from CombatHud / ArenaCanvas */
export function selectVillageBoon(this: StreetBrawlEngine, boonId: VillageBoonId) {
  if (!this.pendingBoons) return;
  const chosen = this.pendingBoons.find((b) => b.id === boonId);
  if (!chosen) return;
  this.activeBoons.add(boonId);
  this.pendingBoons = null;
  soundEngine.playBoonPick();
  this.pickupSeq++;
  this.pickupToast = `VILLAGE BOON: ${chosen.title.toUpperCase()} ACTIVE!`;
  this.pickupToastTimer = 2.6;
  const active = this.getActiveHero();
  this.spawnParticles(active.x, 1.2, active.z, 22, 4.4);
  this.spawnComicPopup(active.x, 2.0, active.z, chosen.title.toUpperCase(), chosen.accentColor);
}

export function checkCrowdHypeDrops(this: StreetBrawlEngine, active: HeroRuntime) {
  const thresholds = [10, 20, 30];
  for (const tier of thresholds) {
    if (this.noKnockdownCombo >= tier && this.crowdHypeTier < tier) {
      this.crowdHypeTier = tier;
      this.stage.triggerCrowdCheer();
      soundEngine.playCrowdCheer();
      soundEngine.setDholIntensity('hype');
      this.spawnComicPopup(active.x, 2.15, active.z, `CROWD HYPE ${tier}x!`, '#FDE047');
      this.pickupSeq++;
      this.pickupToast = `CROWD HYPE ${tier}x! VILLAGERS TOSSED EXTRA LOOT!`;
      this.pickupToastTimer = 2.2;

      // Background villagers toss Hot Masala Chai + Bamboo Lathi / Giant Coconut onto the street!
      const drops: ('chai' | 'lathi' | 'coconut')[] =
        tier >= 30 ? ['chai', 'lathi', 'coconut'] : tier >= 20 ? ['chai', 'coconut'] : ['chai', 'lathi'];
      drops.forEach((kind, idx) => {
        const tx = THREE.MathUtils.clamp(
          active.x + (idx - 0.5) * 2.2,
          this.lockedMinX + 1.2,
          this.lockedMaxX - 1.2
        );
        const tz = THREE.MathUtils.clamp(active.z + (idx % 2 === 0 ? -0.5 : 0.7), -1.8, 1.4);
        this.stage.spawnCrowdDrop(kind, tx, -4.15, tx, tz);
      });
    }
  }
}
