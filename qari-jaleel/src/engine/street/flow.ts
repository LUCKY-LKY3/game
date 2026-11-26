// Street brawl engine: flow methods (bound onto StreetBrawlEngine).
import * as THREE from 'three';
import { BrawlRank, BrawlScorecard, VillageBoonId } from '../../types/game';
import { saveEndlessRecord, saveStreetBrawlRecord } from '../../utils/storage';
import { addCoins, getMods } from '../../utils/upgrades';
import { recordRun } from '../../utils/achievements';
import { createVillageThugRig, VILLAGE_COUSIN_ROSTER, VillageThugSpec } from '../villageThugs';
import { soundEngine } from '../sound';
import { StreetZoneConfig, HeroRuntime, EnemyRuntime } from './types';
import { VILLAGE_BOON_POOL, STREET_ZONES } from './data';
import { STYLE_GRADES } from './style';
import { JAV_GAALIS } from '../../data/jokes';
import type { StreetBrawlEngine } from '../streetBrawlEngine';

/** Endless wave plan: who comes, in what order, the twist (if any), plus banner text. Boss every 5th wave. */
export function planEndlessWave(waveNum: number): { keys: string[]; sub: string; mod: 'lathi' | 'rickshaw' | 'mela' | null } {
  const seed = Math.floor(Date.now() / 86400000); // same wave order for everyone on a given day
  const bossCycle = ['chappal_chaudhary', 'dhol_daku', 'bade_tau'];
  const phase = waveNum % 5;
  const isBossWave = phase === 0;
  const mod = isBossWave
    ? null
    : phase === 1 && waveNum > 1
      ? 'lathi'
      : phase === 2 && waveNum > 2
        ? 'rickshaw'
        : phase === 4
          ? 'mela'
          : null;
  const tier1 = ['bunty', 'golu', 'tinku', 'chintu'];
  const tier2 = ['pappu', 'lathi_lala', 'chappal_chacha', 'thali_tiwari', 'bowler_bablu', 'mama_ji'];
  let pool = waveNum < 3 ? tier1 : waveNum < 6 ? [...tier1, ...tier2.slice(0, 2)] : [...tier1, ...tier2, 'kalu_goon'];
  if (mod === 'mela') pool = tier1;
  let total = Math.min(12, 3 + Math.floor(waveNum * 0.85));
  if (mod === 'mela') total = Math.min(14, Math.round(total * 1.7));
  const keys: string[] = [];
  let sub = 'FRESH COUSIN WAVE INCOMING';
  if (isBossWave) {
    const boss = bossCycle[(waveNum / 5 - 1 + seed) % bossCycle.length];
    keys.push(boss);
    sub = boss === 'bade_tau' ? 'BADE TAU JOINS THE MOHALLA!' : `${VILLAGE_COUSIN_ROSTER[boss].name.toUpperCase()} ARRIVES!`;
  }
  let ranged = 0;
  const minions = isBossWave ? 2 + Math.floor(waveNum / 10) : total;
  for (let i = 0; i < minions; i++) {
    let k = pool[(waveNum * 3 + i * 2 + seed) % pool.length];
    if ((k === 'chappal_chacha' || k === 'bowler_bablu') && ++ranged > 1) k = 'bunty';
    if (k === 'mama_ji' && keys.includes('mama_ji')) k = 'golu';
    keys.push(k);
  }
  if (!isBossWave && mod !== 'mela') {
    if (waveNum >= 4 && waveNum % 3 === 1) keys.splice(1, 1, 'bullhorn_bhai');
    if (waveNum >= 5 && waveNum % 3 === 2) keys.splice(Math.min(2, keys.length - 1), 1, 'jeb_katra');
  }
  // Shield wall pair later on: Thali Tiwari brings his partner
  const ti = keys.indexOf('thali_tiwari');
  if (waveNum >= 7 && ti >= 0 && !keys.includes('dhaal_dinesh')) keys.splice(ti + 1, 0, 'dhaal_dinesh');
  if (!isBossWave && phase === 3) {
    keys.splice(Math.ceil(keys.length / 2), 0, 'moti_pehelwan');
    sub = 'MOTI PEHELWAN AMBUSH!';
  } else if (!isBossWave && mod !== 'mela' && waveNum >= 2 && waveNum % 2 === 0) {
    keys.splice(Math.ceil(keys.length / 2), 0, 'raju_bike');
    sub = 'RAJU ON THE BIKE!';
  }
  if (mod === 'lathi') sub = "LATHI NIGHT · EVERYONE'S ARMED!";
  if (mod === 'rickshaw') sub = 'RICKSHAW RUSH · WATCH THE ROAD!';
  if (mod === 'mela') sub = 'MELA CROWD · SO MANY COUSINS!';
  return { keys, sub, mod };
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
  // Harder than before: tougher cousins sooner, bigger groups later, hits that hurt more
  const batch = this.endlessQueue.splice(0, this.endlessWave >= 8 ? 4 : 3);
  const scale = Math.min(3.0, 1 + (this.endlessWave - 1) * 0.11) * (this.endlessMod === 'mela' ? 0.72 : 1);
  const dmgScale = Math.min(2.0, 1 + (this.endlessWave - 1) * 0.06);
  if (batch.length) this.spawnWave(batch, endlessZone, scale, this.endlessMod === 'lathi', dmgScale);
}

export function spawnEndlessWave(this: StreetBrawlEngine, waveNum: number) {
  const plan = planEndlessWave(waveNum);
  this.endlessQueue = plan.keys;
  this.endlessMod = plan.mod;
  if (plan.mod === 'rickshaw') this.rickshawCooldown = Math.min(this.rickshawCooldown, 4);
  this.spawnEndlessBatch();
}

export function spawnWave(this: StreetBrawlEngine, keys: string[], zone: StreetZoneConfig, waveScale = 1, armed = false, dmgScale?: number) {
  keys.forEach((key, idx) => {
    const base = VILLAGE_COUSIN_ROSTER[key] ?? VILLAGE_COUSIN_ROSTER.bunty;
    const uid = this.nextEnemyUid++;
    const spec: VillageThugSpec = {
      ...base,
      id: `${key}_${uid}`,
      maxHp: Math.round(base.maxHp * this.difficultyScale * waveScale),
      damage: Math.max(4, Math.round(base.damage * this.enemyDmgScale * (dmgScale ?? Math.min(1.5, waveScale)))),
      hasClub: armed || base.hasClub,
    };
    // Elite gold-turban cousins from Zone 2 / Endless wave 6: tougher, worth double
    const lateRun = this.endlessMode ? this.endlessWave >= 6 : this.currentZoneIdx >= 1;
    if (
      !this.practiceMode &&
      lateRun &&
      (spec.archetype === 'idiot' || spec.archetype === 'thug') &&
      !spec.trait &&
      Math.random() < [0.08, 0.16, 0.25][this.difficultyLevel]
    ) {
      spec.elite = true;
      spec.name = `Elite ${spec.name}`;
      spec.maxHp = Math.round(spec.maxHp * 1.6);
      spec.damage = Math.round(spec.damage * 1.25);
      spec.scoreValue *= 2;
      spec.headAccessory = 'boss_turban';
      spec.gamchaColor = '#EAB308';
    }
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
      lightStreak: 0,
      lightStreakTimer: 0,
      blockedHits: 0,
      banter: 0,
      rollTimer: 0,
      gag: 'none',
      gagTimer: 0,
      gagX: 0,
      gagZ: 0,
      gagOther: -1,
      gagLeader: false,
      gagUsed: 0,
      guardCooldown: 1 + Math.random(),
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
      this.bossIntroReply();
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
  this.clearPickups();
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
  if (this.practiceMode) return;
  const livingCount = this.enemies.filter((e) => e.alive).length;

  // Endless Mohalla Survival Mode: infinite escalating waves!
  if (this.endlessMode) {
    // Reinforcements trickle in once the lane thins out
    if (this.endlessQueue.length > 0 && livingCount <= 1 && this.phase === 'FIGHTING') {
      this.spawnEndlessBatch();
      return;
    }
    // Track whether the squad took any damage during this wave (for the flawless bonus)
    const hpSum = this.heroes[0].hp + this.heroes[1].hp;
    if (hpSum < this.endlessLastHp - 0.01) {
      this.endlessDamaged = true;
      this.noHitSec = 0;
      this.streakTier = 0;
      this.scoreMult = 1;
    }
    this.endlessLastHp = hpSum;
    if (livingCount === 0 && this.endlessQueue.length === 0 && this.slowMoTimer <= 0.05) {
      const cleared = this.endlessWave;
      const bossCleared = cleared % 5 === 0;
      const clearBonus = cleared * 40;
      const flawless = !this.endlessDamaged;
      const flawlessBonus = flawless ? 50 + cleared * 10 : 0;
      this.score += clearBonus + flawlessBonus;
      const lead = this.getActiveHero();
      this.spawnComicPopup(lead.x, 2.6, lead.z, `WAVE ${cleared} CLEAR +${clearBonus}`, '#FACC15');
      if (flawless) {
        this.flawlessWaves += 1;
        this.spawnComicPopup(lead.x, 3.1, lead.z, `FLAWLESS +${flawlessBonus}`, '#4ADE80');
        this.sayQuip('flawless', 0.7);
      }
      this.endlessWave += 1;
      this.endlessDamaged = false;
      const heal = bossCleared ? 35 : 12;
      this.heroes.forEach((h) => {
        if (h.hp > 0) h.hp = Math.min(h.maxHp, h.hp + heal);
      });
      this.endlessLastHp = this.heroes[0].hp + this.heroes[1].hp;
      if (this.endlessWave % 3 === 1) {
        // Offer Village Boon + celebratory High-Five every 3 waves!
        this.highFiveTimer = CELEBRATE_SECS;
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
      if (h.hp > 0) h.hp = Math.min(h.maxHp, h.hp + 20 + getMods(this.endlessMode).zoneHealBonus);
    });
    // Celebratory Zone-Clear Tag-Team High-Five before Boon Cards & flashing GO >>!
    this.highFiveTimer = CELEBRATE_SECS;
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

  // Chai coins for Road to Chacha Chai's
  const coinsEarned = this.endlessMode
    ? this.endlessWave * 6 + Math.floor(this.score / 500)
    : this.totalDefeated * 2 + (victory ? 80 + ({ S: 60, A: 40, B: 20, C: 0 } as Record<string, number>)[rank] : 0);
  addCoins(coinsEarned);
  const newTitles = recordRun({
    endless: this.endlessMode,
    wave: this.endlessWave,
    score: this.score,
    victory,
    rank,
    totalDefeated: this.totalDefeated,
    highestCombo,
    rickshawed: this.cousinsRickshawed,
    finishers: this.finishersLanded,
    flawless: this.flawlessWaves,
    pickups: this.pickupsTaken,
    onBeat: this.onBeatHits,
    bosses: this.bossesDefeated,
    perfectDodges: this.perfectDodges,
    comboTriggers: this.comboTriggers,
  });

  return {
    coinsEarned,
    newTitles,
    clearTimeSec,
    highestCombo,
    cousinsRickshawed: this.cousinsRickshawed,
    flawlessWaves: this.flawlessWaves,
    onBeatHits: this.onBeatHits,
    bestStyle: STYLE_GRADES[this.bestStyle],
    challengesDone: this.challengesDone,
    pickupsTaken: this.pickupsTaken,
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

const CELEBRATE_SECS = 2.3;
const CELEBRATE_CALLS: Record<number, string> = {
  2: 'BALLE BALLE!', 3: 'FLEX!', 4: 'DAB!', 5: 'THUMKA!', 6: 'NAMASTE!', 7: 'WOOO!',
  8: 'TOO EASY.', 9: 'NEXT!', 10: 'RESPECT!', 11: 'MWAH!', 12: 'YAAAWN...',
};
/** Each fighter's own celebration routines (rig.celebrateKind, poses in fighterRig 'high_five') */
const CELEBRATIONS: Record<string, number[]> = {
  qari_jaleel: [6, 2, 7], // namaste bow, bhangra, spin
  rebel_aviator: [3, 1, 2], // flex, chest bump, bhangra
  rebel_tactician: [12, 8, 3], // yawn, arms folded, flex
  rebel_enforcer: [9, 7, 2], // shadow boxing, spin, bhangra
  rebel_striker: [10, 4, 7], // kung fu salute, dab, spin
  rebel_shadow: [11, 5, 4], // blow a kiss, thumka, dab
};
function pickCelebrations(active: HeroRuntime, partner: HeroRuntime) {
  active.rig.celebrateGag = false;
  partner.rig.celebrateGag = false;
  if (partner.hp > 0 && Math.random() < 0.3) {
    const k = Math.random() < 0.5 ? 0 : 1; // together: high five or chest bump
    active.rig.celebrateKind = k;
    partner.rig.celebrateKind = k;
    if (k === 0) {
      const miss = Math.random() < 0.6; // the high five usually misses
      active.rig.celebrateGag = miss;
      partner.rig.celebrateGag = miss;
    } else {
      partner.rig.celebrateGag = true; // somebody always bounces off the chest bump
    }
    return;
  }
  for (const h of [active, partner]) {
    const list = CELEBRATIONS[h.profile.id] ?? [2, 3, 7];
    let k = list[Math.floor(Math.random() * list.length)];
    if (h === partner && k === active.rig.celebrateKind) k = list[(list.indexOf(k) + 1) % list.length];
    h.rig.celebrateKind = k;
    h.rig.celebrateGag = Math.random() < 0.8;
  }
}

/** What goes wrong, said by whoever it happened to, plus a pop-up */
const GAG_LINES: Record<number, { line: string; pop: string }[]> = {
  0: [{ line: "...We'll practise that one.", pop: 'MISSED!' }, { line: 'Bro, my hand was RIGHT there!', pop: 'AIR FIVE!' }],
  1: [{ line: 'Bro, are you made of concrete?!', pop: 'BOUNCED!' }, { line: 'I saw my Nani for a second there.', pop: 'TIMBER!' }],
  2: [{ line: 'OOF! My back! Too much bhangra!', pop: 'CRACK!' }, { line: 'Somebody call the physio uncle!', pop: 'OUCH!' }],
  3: [{ line: 'RIIIP. That was my good kurta.', pop: 'RIIIP!' }, { line: 'Too... much... muscle...', pop: 'VEIN POP!' }],
  4: [{ line: 'Is dabbing still cool? ...Nobody answer.', pop: 'CRINGE!' }, { line: 'Dabbed so hard I saw tomorrow.', pop: 'WHOOPS!' }],
  5: [{ line: 'Shake it like the shaadi DJ is watching!', pop: 'THUMKA!' }, { line: 'Aunty taught me this. Aunty would be proud.', pop: 'SHAADI MODE!' }],
  6: [{ line: 'BONK. The floor was nearer than anticipated.', pop: 'BONK!' }, { line: 'A most humble bow. Too humble, evidently.', pop: 'BONK!' }],
  7: [{ line: 'The street... is spinning... is that normal?', pop: 'DIZZY!' }, { line: 'Which one of you is the real cousin?', pop: 'WOBBLE!' }],
  8: [{ line: 'Too easy. Wake me for the hard part.', pop: 'Zzz...' }, { line: 'Cousins? More like snoozins.', pop: 'Zzz...' }],
  9: [{ line: 'OW! Who hit me? ...Oh.', pop: 'SELF K.O.!' }, { line: 'Undefeated. Except by myself.', pop: 'OOPS!' }],
  10: [{ line: 'Perfect balaaaance— WHOA!', pop: 'TIMBER!' }, { line: 'The crane has... landed.', pop: 'FLOP!' }],
  11: [{ line: "This one's for the aunties. Mwah!", pop: 'AUNTY: CHHI!' }, { line: "Careful, ladies. I'm dangerously charming.", pop: 'EWW!' }],
  12: [{ line: 'Wake me at the next zone... zzz', pop: 'Zzz...' }, { line: 'Five more minutes...', pop: 'SNORE!' }],
};

export function stepTagHighFive(this: StreetBrawlEngine, dt: number) {
  this.highFiveTimer = Math.max(0, this.highFiveTimer - dt);
  const active = this.getActiveHero();
  const partner = this.getPartnerHero();
  const midX = THREE.MathUtils.clamp((active.x + partner.x) * 0.5, this.lockedMinX + 2.0, this.lockedMaxX - 2.0);
  const midZ = THREE.MathUtils.clamp((active.z + partner.z) * 0.5, -1.6, 1.4);

  const gap = this.celebrationPicked && active.rig.celebrateKind > 1 ? 1.1 : 0.62; // solo routines need room
  active.x = THREE.MathUtils.lerp(active.x, midX - gap, Math.min(1, dt * 8));
  active.z = THREE.MathUtils.lerp(active.z, midZ, Math.min(1, dt * 8));
  active.facing = 1;
  if (!this.celebrationPicked) {
    this.celebrationPicked = true;
    pickCelebrations(active, partner);
  }
  const paired = active.rig.celebrateKind <= 1;
  active.action = 'high_five';
  active.actionDuration = CELEBRATE_SECS;
  active.actionTime = CELEBRATE_SECS - this.highFiveTimer;

  if (partner.hp > 0) {
    partner.x = THREE.MathUtils.lerp(partner.x, midX + gap, Math.min(1, dt * 8));
    partner.z = THREE.MathUtils.lerp(partner.z, midZ, Math.min(1, dt * 8));
    partner.facing = -1;
    partner.action = 'high_five';
    partner.actionDuration = CELEBRATE_SECS;
    partner.actionTime = CELEBRATE_SECS - this.highFiveTimer;
  }

  if (!this.highFiveChimePlayed && this.highFiveTimer <= CELEBRATE_SECS * 0.5) {
    this.highFiveChimePlayed = true;
    soundEngine.playHighFive();
    this.spawnParticles(midX, 1.65, midZ, 18, 4.2);
    this.spawnComicPopup(midX, 2.25, midZ, paired ? (active.rig.celebrateKind === 1 ? 'CHEST BUMP!' : 'TAG TEAM!') : CELEBRATE_CALLS[active.rig.celebrateKind] ?? 'TAG TEAM!', '#FACC15');
  }
  // The comic beat: whoever's routine goes wrong says so
  if (!this.celebrationGagSaid && this.highFiveTimer <= CELEBRATE_SECS * 0.38) {
    this.celebrationGagSaid = true;
    const who = active.rig.celebrateGag && active.rig.celebrateKind !== 1 ? active : partner.hp > 0 && partner.rig.celebrateGag ? partner : null;
    if (who) {
      const opts = GAG_LINES[who.rig.celebrateKind] ?? GAG_LINES[0];
      const pick = opts[Math.floor(Math.random() * opts.length)];
      let line = pick.line;
      if (who.profile.id === 'rebel_tactician') line += ' ' + JAV_GAALIS[Math.floor(Math.random() * JAV_GAALIS.length)];
      this.speechBubble = { side: who.index === 0 ? 1 : 2, speaker: who.profile.name, text: line };
      this.speechTimer = 2.2;
      this.spawnComicPopup(who.x, 2.5, who.z, pick.pop, '#F472B6');
      if (pick.pop === 'BONK!' || pick.pop === 'SELF K.O.!' || pick.pop === 'TIMBER!' || pick.pop === 'BOUNCED!') {
        soundEngine.playHit(false);
        this.shakeIntensity = Math.max(this.shakeIntensity, 0.15);
      }
    }
  }

  if (this.highFiveTimer <= 0) {
    this.celebrationPicked = false;
    this.celebrationGagSaid = false;
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
