import * as THREE from 'three';
import { FIGHTER_LINES } from '../data/jokes';
import {
  CombatAction,
  Difficulty,
  FighterProfile,
  GameMode,
  HudSnapshot,
  MatchPhase,
  MatchStats,
  PlayerInputState,
  SpeechBubbleState,
} from '../types/game';
import { ArticulatedFighterRig, applyFighterPose } from './fighterRig';
import { getPowerupKindForFighter, PowerupDirector, PowerupKind } from './powerupDirector';
import { resolveFighterStyle } from '../data/roster';
import { soundEngine } from './sound';

interface MoveSpec {
  duration: number;
  activeStart: number;
  activeEnd: number;
  rangeX: number;
  rangeZ: number;
  damage: number;
  height: 'high' | 'mid' | 'low' | 'throw' | 'super';
  knockbackX: number;
  launchY: number;
  hitstun: number;
  blockstun: number;
  hitstop: number;
  rageGain: number;
  heavy: boolean;
  label: string;
}

const MOVE_DATA: Partial<Record<CombatAction, MoveSpec>> = {
  lp: {
    duration: 0.3,
    activeStart: 0.08,
    activeEnd: 0.16,
    rangeX: 1.55,
    rangeZ: 0.65,
    damage: 7,
    height: 'high',
    knockbackX: 0.38,
    launchY: 0,
    hitstun: 0.3,
    blockstun: 0.18,
    hitstop: 0.045,
    rageGain: 8,
    heavy: false,
    label: 'JAB',
  },
  lp2: {
    duration: 0.34,
    activeStart: 0.09,
    activeEnd: 0.19,
    rangeX: 1.65,
    rangeZ: 0.68,
    damage: 9,
    height: 'mid',
    knockbackX: 0.55,
    launchY: 0,
    hitstun: 0.34,
    blockstun: 0.2,
    hitstop: 0.055,
    rageGain: 10,
    heavy: false,
    label: 'CROSS',
  },
  rp: {
    duration: 0.48,
    activeStart: 0.15,
    activeEnd: 0.28,
    rangeX: 1.78,
    rangeZ: 0.72,
    damage: 14,
    height: 'mid',
    knockbackX: 1.15,
    launchY: 3.1,
    hitstun: 0.44,
    blockstun: 0.26,
    hitstop: 0.075,
    rageGain: 13,
    heavy: true,
    label: 'HEAVY HOOK',
  },
  combo_finisher: {
    duration: 0.54,
    activeStart: 0.14,
    activeEnd: 0.3,
    rangeX: 1.95,
    rangeZ: 0.92,
    damage: 17,
    height: 'mid',
    knockbackX: 1.95,
    launchY: 4.1,
    hitstun: 0.55,
    blockstun: 0.28,
    hitstop: 0.09,
    rageGain: 15,
    heavy: true,
    label: 'CYCLONE FINISH',
  },
  kick: {
    duration: 0.44,
    activeStart: 0.13,
    activeEnd: 0.26,
    rangeX: 2.05,
    rangeZ: 0.78,
    damage: 13,
    height: 'high',
    knockbackX: 1.35,
    launchY: 2.2,
    hitstun: 0.4,
    blockstun: 0.24,
    hitstop: 0.07,
    rageGain: 12,
    heavy: true,
    label: 'ROUNDHOUSE',
  },
  sweep: {
    duration: 0.5,
    activeStart: 0.14,
    activeEnd: 0.28,
    rangeX: 1.95,
    rangeZ: 0.85,
    damage: 11,
    height: 'low',
    knockbackX: 0.7,
    launchY: 0,
    hitstun: 0.65,
    blockstun: 0.26,
    hitstop: 0.065,
    rageGain: 11,
    heavy: true,
    label: 'DRAGON SWEEP',
  },
  spinning_heel_kick: {
    duration: 0.44,
    activeStart: 0.12,
    activeEnd: 0.28,
    rangeX: 2.15,
    rangeZ: 0.9,
    damage: 15,
    height: 'high',
    knockbackX: 1.65,
    launchY: 2.6,
    hitstun: 0.46,
    blockstun: 0.26,
    hitstop: 0.075,
    rageGain: 13,
    heavy: true,
    label: 'SPIN HEEL KICK',
  },
  tornado_kick: {
    duration: 0.52,
    activeStart: 0.15,
    activeEnd: 0.34,
    rangeX: 2.25,
    rangeZ: 0.98,
    damage: 19,
    height: 'mid',
    knockbackX: 2.25,
    launchY: 4.3,
    hitstun: 0.58,
    blockstun: 0.28,
    hitstop: 0.09,
    rageGain: 16,
    heavy: true,
    label: 'TORNADO KICK',
  },
  axe_kick: {
    duration: 0.48,
    activeStart: 0.19,
    activeEnd: 0.32,
    rangeX: 2.0,
    rangeZ: 0.82,
    damage: 16,
    height: 'mid',
    knockbackX: 1.25,
    launchY: 3.6,
    hitstun: 0.52,
    blockstun: 0.3,
    hitstop: 0.082,
    rageGain: 14,
    heavy: true,
    label: 'AXE KICK',
  },
  flying_side_kick: {
    duration: 0.42,
    activeStart: 0.08,
    activeEnd: 0.3,
    rangeX: 2.2,
    rangeZ: 0.88,
    damage: 16,
    height: 'mid',
    knockbackX: 2.3,
    launchY: 3.0,
    hitstun: 0.48,
    blockstun: 0.24,
    hitstop: 0.08,
    rageGain: 14,
    heavy: true,
    label: 'FLYING SIDE KICK',
  },
  throw_attempt: {
    duration: 0.42,
    activeStart: 0.1,
    activeEnd: 0.22,
    rangeX: 1.35,
    rangeZ: 0.7,
    damage: 16,
    height: 'throw',
    knockbackX: 2.1,
    launchY: 3.4,
    hitstun: 0.68,
    blockstun: 0,
    hitstop: 0.09,
    rageGain: 14,
    heavy: true,
    label: 'AKHARA THROW',
  },
  rage_art: {
    duration: 1.15,
    activeStart: 0.22,
    activeEnd: 0.92,
    rangeX: 2.55,
    rangeZ: 1.2,
    damage: 32,
    height: 'super',
    knockbackX: 2.8,
    launchY: 5.2,
    hitstun: 0.85,
    blockstun: 0.36,
    hitstop: 0.11,
    rageGain: 0,
    heavy: true,
    label: 'RAGE ART',
  },
};

interface FighterRuntime {
  side: 1 | 2;
  profile: FighterProfile;
  rig: ArticulatedFighterRig;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  facing: 1 | -1;
  hp: number;
  maxHp: number;
  trailHp: number;
  recoverableHp: number;
  rage: number;
  roundsWon: number;
  action: CombatAction;
  actionTimer: number;
  actionDuration: number;
  hasHitCurrentMove: boolean;
  rageHitsLanded: number;
  comboCount: number;
  comboResetTimer: number;
  chainWindow: number;
  hitFlash: number;
  invulnTimer: number;
  callout: string;
  calloutSeq: number;
  aiThinkTimer: number;
  aiGoal: 'approach' | 'retreat' | 'pressure' | 'guard' | 'sidestep';
}

interface Particle {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  size: number;
  color: THREE.Color;
}

interface ActivePowerupSession {
  kind: PowerupKind;
  attacker: FighterRuntime;
  defender: FighterRuntime;
  elapsed: number;
  duration: number;
  startX: number;
  startZ: number;
  flags: number;
}

const ARENA_X_LIMIT = 7.2;
const ARENA_Z_LIMIT = 2.45;
const GRAVITY = -22;
const PARTICLE_POOL_SIZE = 72;

export function createEmptyInput(): PlayerInputState {
  return {
    left: false,
    right: false,
    up: false,
    down: false,
    block: false,
    lpPressed: false,
    rpPressed: false,
    kickPressed: false,
    sidestepPressed: false,
    throwPressed: false,
    ragePressed: false,
    switchPressed: false,
    assistPressed: false,
    panicSpecialPressed: false,
    jumpPressed: false,
    dashDir: 0,
  };
}

export class AkharaCombatEngine {
  public phase: MatchPhase = 'ATTRACT';
  public roundNumber = 1;
  public roundTimer = 99;
  public announcement = '';
  public subAnnouncement = '';
  public rageFlashSide: 1 | 2 | null = null;
  public paused = false;

  private p1: FighterRuntime;
  private p2: FighterRuntime;
  private mode: GameMode;
  private difficulty: Difficulty;
  private phaseTimer = 0;
  private hitstopTimer = 0;
  private slowMoTimer = 0;
  private shakeIntensity = 0;
  private rageZoomTimer = 0;
  private rageFlashTimer = 0;
  private elapsed = 0;
  private stats: MatchStats;

  // Bespoke 3D powerups (chair/smoke, snooker cue, Red Ford car, 3 girls) & speech bubbles
  private powerupDirector: PowerupDirector;
  private activePowerup: ActivePowerupSession | null = null;
  private speechBubble: SpeechBubbleState | null = null;
  private speechBubbleTimer = 0;
  private chatterTimer = 6;

  // Pooled 3D particle VFX (dust puffs & impact sparks, zero GC)
  private particleMesh: THREE.InstancedMesh;
  private particleGeo: THREE.BufferGeometry;
  private particleMat: THREE.MeshBasicMaterial;
  private particles: Particle[] = [];
  private _dummy = new THREE.Object3D();
  private _camTargetPos = new THREE.Vector3();
  private _camLookAt = new THREE.Vector3();
  private _currentLookAt = new THREE.Vector3(0, 1.35, 0);

  constructor(
    private scene: THREE.Scene,
    p1Profile: FighterProfile,
    p2Profile: FighterProfile,
    p1Rig: ArticulatedFighterRig,
    p2Rig: ArticulatedFighterRig,
    mode: GameMode,
    difficulty: Difficulty,
    startInAttract: boolean
  ) {
    this.mode = mode;
    this.difficulty = difficulty;
    this.stats = {
      p1MaxCombo: 0,
      p2MaxCombo: 0,
      p1DamageDealt: 0,
      p2DamageDealt: 0,
      p1PerfectRounds: 0,
      p2PerfectRounds: 0,
      winnerSide: null,
    };

    this.p1 = this.makeRuntime(1, p1Profile, p1Rig, -2.1, 1);
    this.p2 = this.makeRuntime(2, p2Profile, p2Rig, 2.1, -1);
    this.powerupDirector = new PowerupDirector(this.scene);

    // Pooled VFX mesh
    this.particleGeo = new THREE.DodecahedronGeometry(0.11, 0);
    this.particleMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.particleMesh = new THREE.InstancedMesh(
      this.particleGeo,
      this.particleMat,
      PARTICLE_POOL_SIZE
    );
    this.particleMesh.frustumCulled = false;
    this.scene.add(this.particleMesh);

    for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
      this.particles.push({
        active: false,
        x: 0,
        y: -10,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 0.4,
        size: 1,
        color: new THREE.Color('#F59E0B'),
      });
      this._dummy.position.set(0, -10, 0);
      this._dummy.scale.setScalar(0.001);
      this._dummy.updateMatrix();
      this.particleMesh.setMatrixAt(i, this._dummy.matrix);
      this.particleMesh.setColorAt(i, this.particles[i].color);
    }
    this.particleMesh.instanceMatrix.needsUpdate = true;

    if (startInAttract) {
      this.phase = 'ATTRACT';
    } else {
      this.beginRound(1);
    }
  }

  private makeRuntime(
    side: 1 | 2,
    profile: FighterProfile,
    rig: ArticulatedFighterRig,
    startX: number,
    facing: 1 | -1
  ): FighterRuntime {
    const maxHp = 100 + Math.round((profile.stats.defense - 6) * 4);
    return {
      side,
      profile,
      rig,
      x: startX,
      y: 0,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      facing,
      hp: maxHp,
      maxHp,
      trailHp: maxHp,
      recoverableHp: 0,
      rage: 0,
      roundsWon: 0,
      action: 'idle',
      actionTimer: 0,
      actionDuration: 0,
      hasHitCurrentMove: false,
      rageHitsLanded: 0,
      comboCount: 0,
      comboResetTimer: 0,
      chainWindow: 0,
      hitFlash: 0,
      invulnTimer: 0,
      callout: '',
      calloutSeq: 0,
      aiThinkTimer: 0.25,
      aiGoal: 'approach',
    };
  }

  public beginRound(num: number) {
    this.roundNumber = num;
    this.roundTimer = 99;
    this.phase = 'ROUND_INTRO';
    this.phaseTimer = 1.65;
    this.announcement = `ROUND ${num}`;
    this.subAnnouncement = 'READY';
    this.hitstopTimer = 0;
    this.slowMoTimer = 0;
    this.rageZoomTimer = 0;
    this.activePowerup = null;
    this.speechBubble = null;
    this.speechBubbleTimer = 0;
    this.powerupDirector.hideAll();

    this.resetFighterForRound(this.p1, -2.15, 1);
    this.resetFighterForRound(this.p2, 2.15, -1);
    soundEngine.playRoundStart();
  }

  private resetFighterForRound(f: FighterRuntime, x: number, facing: 1 | -1) {
    f.x = x;
    f.y = 0;
    f.z = 0;
    f.vx = 0;
    f.vy = 0;
    f.vz = 0;
    f.facing = facing;
    f.hp = f.maxHp;
    f.trailHp = f.maxHp;
    f.recoverableHp = 0;
    f.action = 'idle';
    f.actionTimer = 0;
    f.actionDuration = 0;
    f.hasHitCurrentMove = false;
    f.rageHitsLanded = 0;
    f.comboCount = 0;
    f.comboResetTimer = 0;
    f.chainWindow = 0;
    f.hitFlash = 0;
    f.invulnTimer = 0;
    f.callout = '';
    // Start P1 ready to pop their unique Powerup immediately; P2 starts at 45%
    f.rage = f.side === 1 ? 100 : 45;
  }

  public restartMatch() {
    this.p1.roundsWon = 0;
    this.p2.roundsWon = 0;
    this.p1.rage = 0;
    this.p2.rage = 0;
    this.stats = {
      p1MaxCombo: 0,
      p2MaxCombo: 0,
      p1DamageDealt: 0,
      p2DamageDealt: 0,
      p1PerfectRounds: 0,
      p2PerfectRounds: 0,
      winnerSide: null,
    };
    this.beginRound(1);
  }

  private spawnParticles(
    x: number,
    y: number,
    z: number,
    count: number,
    hexColor: string,
    speed: number,
    size = 1
  ) {
    let spawned = 0;
    for (let i = 0; i < this.particles.length && spawned < count; i++) {
      const p = this.particles[i];
      if (!p.active) {
        p.active = true;
        p.x = x + (Math.random() - 0.5) * 0.25;
        p.y = y + (Math.random() - 0.5) * 0.25;
        p.z = z + (Math.random() - 0.5) * 0.25;
        const a = Math.random() * Math.PI * 2;
        const elev = (Math.random() - 0.2) * speed;
        p.vx = Math.cos(a) * speed * (0.4 + Math.random() * 0.8);
        p.vy = Math.abs(elev) + 1.2;
        p.vz = Math.sin(a) * speed * 0.5;
        p.maxLife = 0.25 + Math.random() * 0.3;
        p.life = p.maxLife;
        p.size = size * (0.65 + Math.random() * 0.7);
        p.color.set(hexColor);
        spawned++;
      }
    }
  }

  private pushCallout(f: FighterRuntime, text: string) {
    f.callout = text;
    f.calloutSeq += 1;
  }

  private startAction(f: FighterRuntime, action: CombatAction, durationOverride?: number) {
    const spec = MOVE_DATA[action];
    const speedFactor = 1.12 - (f.profile.stats.speed - 5) * 0.025;
    f.action = action;
    f.actionTimer = 0;
    f.actionDuration =
      durationOverride ?? (spec ? spec.duration * Math.max(0.84, speedFactor) : 0.35);
    f.hasHitCurrentMove = false;
    f.rageHitsLanded = 0;

    if (spec && action !== 'rage_art') {
      if (
        action === 'kick' ||
        action === 'sweep' ||
        action === 'spinning_heel_kick' ||
        action === 'tornado_kick' ||
        action === 'axe_kick' ||
        action === 'flying_side_kick'
      ) {
        soundEngine.playKickWhoosh(action === 'tornado_kick' ? 1.25 : action === 'axe_kick' ? 0.9 : 1.08);
      } else {
        soundEngine.playWhoosh(spec.heavy ? 0.82 : 1.18);
      }
    }
  }

  private computeAiInput(ai: FighterRuntime, opp: FighterRuntime, dt: number): PlayerInputState {
    const inp = createEmptyInput();
    ai.aiThinkTimer -= dt;
    const dx = opp.x - ai.x;
    const dist = Math.abs(dx);
    const dz = Math.abs(opp.z - ai.z);
    const towardRight = dx > 0;

    const aggro =
      this.difficulty === 'grandmaster' ? 0.82 : this.difficulty === 'pehelwan' ? 0.58 : 0.34;
    const blockChance =
      this.difficulty === 'grandmaster' ? 0.72 : this.difficulty === 'pehelwan' ? 0.48 : 0.22;

    if (ai.aiThinkTimer <= 0) {
      ai.aiThinkTimer =
        this.difficulty === 'grandmaster'
          ? 0.14 + Math.random() * 0.16
          : this.difficulty === 'pehelwan'
            ? 0.22 + Math.random() * 0.25
            : 0.36 + Math.random() * 0.38;

      const oppAttacking = Boolean(MOVE_DATA[opp.action]);
      if (oppAttacking && dist < 2.3 && Math.random() < blockChance) {
        ai.aiGoal = Math.random() < 0.28 ? 'sidestep' : 'guard';
      } else if (dist > 2.2) {
        ai.aiGoal = 'approach';
      } else if (dist < 1.15 && Math.random() < 0.3) {
        ai.aiGoal = 'retreat';
      } else {
        ai.aiGoal = Math.random() < aggro ? 'pressure' : 'guard';
      }
    }

    if (ai.aiGoal === 'guard') {
      inp.block = true;
      return inp;
    }

    if (ai.aiGoal === 'sidestep') {
      inp.sidestepPressed = true;
      ai.aiGoal = 'pressure';
      return inp;
    }

    if (ai.aiGoal === 'approach') {
      if (dist > 1.35) {
        if (towardRight) inp.right = true;
        else inp.left = true;
      }
      // Double Dragon lane alignment: walk smoothly up/down along Z to match opponent's lane
      if (opp.z < ai.z - 0.34) inp.up = true;
      else if (opp.z > ai.z + 0.34) inp.down = true;
    } else if (ai.aiGoal === 'retreat') {
      if (towardRight) inp.left = true;
      else inp.right = true;
    } else if (ai.aiGoal === 'pressure' && dz > 0.42) {
      if (opp.z < ai.z - 0.32) inp.up = true;
      else if (opp.z > ai.z + 0.32) inp.down = true;
    }

    // Attack execution when within fighting range
    if (dist < 2.15 && dz < 0.85 && Math.random() < aggro * 0.22) {
      if (ai.rage >= 100 && Math.random() < 0.45 && this.phase === 'FIGHTING') {
        inp.ragePressed = true;
      } else if (opp.action === 'block' && dist < 1.38 && Math.random() < 0.42) {
        inp.throwPressed = true;
      } else {
        const roll = Math.random();
        if (roll < 0.34) inp.lpPressed = true;
        else if (roll < 0.54) inp.rpPressed = true;
        else if (roll < 0.76) inp.kickPressed = true;
        else if (roll < 0.88) {
          inp.up = true;
          inp.kickPressed = true;
        } else {
          inp.down = true;
          inp.kickPressed = true;
        }
      }
    }

    return inp;
  }

  private handleFighterInput(f: FighterRuntime, opp: FighterRuntime, inp: PlayerInputState) {
    const canAct =
      f.action === 'idle' ||
      f.action === 'walk_fwd' ||
      f.action === 'walk_back' ||
      f.action === 'crouch' ||
      f.action === 'block';

    // Airborne Jump + Kick -> Iconic Bruce Lee Flying Side Kick!
    if (f.y > 0.1 && f.action === 'jump' && inp.kickPressed) {
      f.vx = f.facing * 5.8;
      this.startAction(f, 'flying_side_kick');
      return;
    }

    // 3-hit Tekken / Martial Arts combo chain windows (LP -> LP2 -> Finisher / Tornado, Kick -> Spin Heel -> Tornado)
    if (f.chainWindow > 0) {
      if (f.action === 'lp' && inp.lpPressed) {
        f.chainWindow = 0;
        this.startAction(f, 'lp2');
        return;
      }
      if ((f.action === 'lp' || f.action === 'lp2') && inp.rpPressed) {
        f.chainWindow = 0;
        this.startAction(f, 'combo_finisher');
        return;
      }
      if ((f.action === 'lp' || f.action === 'kick') && inp.kickPressed) {
        f.chainWindow = 0;
        f.vx = f.facing * 2.6;
        this.startAction(f, 'spinning_heel_kick');
        return;
      }
      if ((f.action === 'lp2' || f.action === 'spinning_heel_kick') && inp.kickPressed) {
        f.chainWindow = 0;
        f.vx = f.facing * 3.4;
        f.vy = 3.2;
        this.startAction(f, 'tornado_kick');
        return;
      }
    }

    // Risk-Reward "Green Health" Panic Special (GUARD + HEAVY or Defense Special even during hitstun!)
    if (
      (inp.panicSpecialPressed || (inp.block && inp.rpPressed)) &&
      f.hp > 6 &&
      f.action !== 'panic_special' &&
      f.action !== 'ko' &&
      !this.activePowerup
    ) {
      const convert = Math.min(f.hp - 1, Math.max(2, Math.round(f.hp * 0.15)));
      f.hp -= convert;
      f.recoverableHp = Math.min(f.maxHp - f.hp, f.recoverableHp + convert);
      f.invulnTimer = 0.58;
      this.startAction(f, 'panic_special', 0.38);
      this.pushCallout(f, 'PANIC BURST!');
      soundEngine.playPanicBurst();
      this.spawnParticles(f.x, 1.15, f.z, 22, '#4ADE80', 5.2, 1.2);
      if (Math.hypot(opp.x - f.x, opp.z - f.z) <= 3.1 && opp.invulnTimer <= 0) {
        const pushDir = opp.x >= f.x ? 1 : -1;
        opp.vx = pushDir * 6.5;
        opp.vy = 3.6;
        this.startAction(opp, 'knockdown', 0.65);
        this.shakeIntensity = 0.24;
      }
      return;
    }

    if (!canAct) return;

    // 1. Unique Character Powerup (requires 100% Powerup meter)
    if (inp.ragePressed && f.rage >= 100 && !this.activePowerup) {
      this.activateUniquePowerup(f, opp);
      return;
    }

    // 2. Close-range Guard-Breaking Throw
    if (inp.throwPressed) {
      this.startAction(f, 'throw_attempt');
      return;
    }

    // 3. Z-Axis 2.5D Tekken Sidestep Dodge
    if (inp.sidestepPressed && f.y <= 0.02) {
      const stepOut = f.z < 0.25 ? 1 : -1;
      f.vz = stepOut * 4.8;
      f.invulnTimer = 0.22;
      soundEngine.playWhoosh(1.45);
      this.spawnParticles(f.x, 0.12, f.z, 6, '#C88D60', 1.8, 0.85);
      this.startAction(f, stepOut > 0 ? 'sidestep_out' : 'sidestep_in', 0.3);
      return;
    }

    // 3b. Dedicated Jump Action
    if (inp.jumpPressed && f.y <= 0.02) {
      f.vy = 8.4;
      soundEngine.playJump();
      this.spawnParticles(f.x, 0.1, f.z, 6, '#D49A6A', 2.0, 0.8);
      this.startAction(f, 'jump', 0.62);
      return;
    }

    // 4. Strikes (LP, RP, High Kick, Crouching Low Sweep)
    if (inp.lpPressed) {
      this.startAction(f, 'lp');
      return;
    }
    if (inp.rpPressed) {
      this.startAction(f, 'rp');
      return;
    }
    if (inp.kickPressed) {
      if (inp.down) {
        this.startAction(f, 'sweep');
      } else if (inp.up) {
        this.startAction(f, 'axe_kick');
      } else {
        this.startAction(f, 'kick');
      }
      return;
    }

    // 5. Blocking (explicit block button OR holding back while opponent attacks)
    const holdingBack = (f.facing === 1 && inp.left) || (f.facing === -1 && inp.right);
    const oppAttacking = Boolean(MOVE_DATA[opp.action]);
    if (inp.block || (holdingBack && oppAttacking && Math.abs(opp.x - f.x) < 2.6 && !inp.up && !inp.down)) {
      f.action = 'block';
      f.vx = 0;
      f.vz = 0;
      return;
    }

    // 6. Double Dragon 8-Way Belt-Scrolling Movement (Left/Right along X, Up/Down deeper/closer along Z)
    const moveSpeedX = 3.45 + (f.profile.stats.speed - 5) * 0.24;
    const moveSpeedZ = 2.65 + (f.profile.stats.speed - 5) * 0.16;
    const dirX = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
    const dirZ = (inp.down ? 1 : 0) - (inp.up ? 1 : 0);

    if (dirX !== 0 || dirZ !== 0) {
      const diag = dirX !== 0 && dirZ !== 0 ? 0.78 : 1;
      f.vx = dirX * moveSpeedX * diag;
      f.vz = dirZ * moveSpeedZ * diag;
      if (dirX !== 0) {
        f.action = dirX === f.facing ? 'walk_fwd' : 'walk_back';
      } else {
        f.action = 'walk_fwd';
      }
    } else {
      f.vx = 0;
      f.vz = 0;
      f.action = 'idle';
    }
  }

  private resolveAttackHit(attacker: FighterRuntime, defender: FighterRuntime) {
    const spec = MOVE_DATA[attacker.action];
    if (!spec) return;

    const isRageMulti = attacker.action === 'rage_art';
    if (!isRageMulti && attacker.hasHitCurrentMove) return;

    // Multi-hit cadence during Rage Art (3 impacts across active window)
    if (isRageMulti) {
      const hitSlots = [0.24, 0.52, 0.8];
      if (attacker.rageHitsLanded >= hitSlots.length) return;
      if (attacker.actionTimer < hitSlots[attacker.rageHitsLanded]) return;
    } else {
      if (attacker.actionTimer < spec.activeStart || attacker.actionTimer > spec.activeEnd) return;
    }

    if (defender.invulnTimer > 0 || defender.action === 'knockdown' || defender.action === 'ko') {
      return;
    }

    // Spatial 2.5D hitbox test (X reach + facing + Z depth alignment!)
    const dx = (defender.x - attacker.x) * attacker.facing;
    const reachBonus = (attacker.profile.stats.reach - 7) * 0.08;
    const dz = Math.abs(defender.z - attacker.z);
    if (dx < -0.2 || dx > spec.rangeX + reachBonus || dz > spec.rangeZ) {
      return;
    }

    // High strikes whiff over crouching opponents!
    if (spec.height === 'high' && defender.action === 'crouch') {
      return;
    }

    if (isRageMulti) {
      attacker.rageHitsLanded += 1;
    } else {
      attacker.hasHitCurrentMove = true;
    }

    // Open combo chain window on LP / LP2 / Kick / Spinning Heel contact
    if (
      attacker.action === 'lp' ||
      attacker.action === 'lp2' ||
      attacker.action === 'kick' ||
      attacker.action === 'spinning_heel_kick'
    ) {
      attacker.chainWindow = 0.28;
    }

    // Check Guard Block (standing block stops high/mid/super; low sweep beats standing block; throws beat all blocks!)
    const isBlocking =
      defender.action === 'block' &&
      spec.height !== 'throw' &&
      spec.height !== 'low';

    const impactX = (attacker.x + defender.x) * 0.5;
    const impactY = spec.height === 'low' ? 0.35 : 1.25;
    const impactZ = (attacker.z + defender.z) * 0.5;

    if (isBlocking) {
      const chip = spec.height === 'super' ? 4 : Math.max(1, Math.round(spec.damage * 0.14));
      if (this.phase === 'FIGHTING') {
        defender.hp = Math.max(1, defender.hp - chip);
      }
      defender.vx = attacker.facing * spec.knockbackX * 0.45;
      defender.action = 'block';
      defender.actionTimer = 0;
      defender.actionDuration = spec.blockstun;
      attacker.rage = Math.min(100, attacker.rage + Math.round(spec.rageGain * 0.4));
      defender.rage = Math.min(100, defender.rage + 6);
      this.hitstopTimer = spec.hitstop * 0.55;
      this.pushCallout(defender, 'GUARDED');
      soundEngine.playBlock();
      this.spawnParticles(impactX, impactY, impactZ, 8, '#0D9488', 2.8, 0.9);
      return;
    }

    // Clean Hit! Scale by Power stat & combo scaling
    const powerMult = 0.86 + (attacker.profile.stats.power / 10) * 0.34;
    const rawDamage = isRageMulti
      ? Math.round(spec.damage / 3)
      : Math.round(spec.damage * powerMult);
    const comboScale = Math.max(0.55, 1 - attacker.comboCount * 0.1);
    const finalDamage = Math.max(2, Math.round(rawDamage * comboScale));

    // Counter-hit bonus if defender was mid-startup
    const isCounter = Boolean(MOVE_DATA[defender.action]) && !isRageMulti;
    const appliedDamage = isCounter ? Math.round(finalDamage * 1.2) : finalDamage;

    if (this.phase === 'FIGHTING') {
      defender.hp = Math.max(0, defender.hp - appliedDamage);
      // Taking an unblocked hit permanently loses recoverable Green Health!
      defender.recoverableHp = 0;
      if (attacker.side === 1) this.stats.p1DamageDealt += appliedDamage;
      else this.stats.p2DamageDealt += appliedDamage;

      // Landing normal JAB or HOOK hits restores Recoverable Green Health back into solid HP!
      if (
        attacker.recoverableHp > 0 &&
        (attacker.action === 'lp' ||
          attacker.action === 'lp2' ||
          attacker.action === 'rp' ||
          attacker.action === 'combo_finisher')
      ) {
        const heal = Math.min(attacker.recoverableHp, Math.max(3, Math.round(appliedDamage * 0.5)));
        attacker.recoverableHp -= heal;
        attacker.hp = Math.min(attacker.maxHp, attacker.hp + heal);
      }
    }

    // Combo counter tracking
    attacker.comboCount += 1;
    attacker.comboResetTimer = 1.15;
    if (attacker.side === 1 && attacker.comboCount > this.stats.p1MaxCombo) {
      this.stats.p1MaxCombo = attacker.comboCount;
    }
    if (attacker.side === 2 && attacker.comboCount > this.stats.p2MaxCombo) {
      this.stats.p2MaxCombo = attacker.comboCount;
    }

    // Rage generation
    attacker.rage = Math.min(100, attacker.rage + spec.rageGain);
    defender.rage = Math.min(100, defender.rage + Math.round(appliedDamage * 1.1));

    // Hitstop, camera shake & callouts
    this.hitstopTimer = spec.hitstop;
    this.shakeIntensity = spec.heavy ? 0.28 : 0.11;
    defender.hitFlash = 1.0;

    if (spec.height === 'throw') {
      this.startAction(attacker, 'throw_execute', 0.45);
      this.pushCallout(attacker, 'GUARD BREAK');
    } else if (isCounter) {
      this.pushCallout(attacker, 'COUNTER HIT');
    } else if (spec.height === 'low') {
      this.pushCallout(attacker, 'SWEEP');
    } else if (attacker.comboCount >= 2) {
      this.pushCallout(attacker, `${attacker.comboCount} HIT COMBO`);
    }

    soundEngine.playHit(spec.heavy);
    this.spawnParticles(
      impactX,
      impactY,
      impactZ,
      spec.heavy ? 16 : 9,
      spec.heavy ? '#F59E0B' : '#FDE68A',
      spec.heavy ? 4.8 : 3.2,
      spec.heavy ? 1.2 : 0.85
    );
    // Red akhara earth dust burst
    this.spawnParticles(defender.x, 0.15, defender.z, 6, '#B85D38', 2.4, 1.0);

    // Check K.O. or Knockdown / Hitstun
    if (this.phase === 'FIGHTING' && defender.hp <= 0) {
      this.triggerRoundKO(attacker, defender);
      return;
    }

    defender.vx = attacker.facing * spec.knockbackX * 2.6;
    if (spec.launchY > 0) {
      defender.vy = spec.launchY;
    }

    const causesKnockdown =
      spec.height === 'low' ||
      spec.height === 'throw' ||
      attacker.action === 'combo_finisher' ||
      (isRageMulti && attacker.rageHitsLanded === 3);

    if (causesKnockdown) {
      this.startAction(defender, 'knockdown', 0.88);
    } else {
      this.startAction(defender, 'hitstun', spec.hitstun);
    }
  }

  private setSpeechBubble(f: FighterRuntime, text: string, duration = 1.6) {
    this.speechBubble = {
      side: f.side,
      speaker: f.profile.name,
      text,
    };
    this.speechBubbleTimer = duration;
  }

  private activateUniquePowerup(attacker: FighterRuntime, defender: FighterRuntime) {
    attacker.rage = 0;
    attacker.facing = defender.x >= attacker.x ? 1 : -1;
    defender.facing = attacker.facing === 1 ? -1 : 1;

    const kind = getPowerupKindForFighter(attacker.profile.id);
    this.rageFlashTimer = 0.72;
    this.rageFlashSide = attacker.side;
    this.pushCallout(attacker, attacker.profile.specialMoveName.toUpperCase());
    soundEngine.playRageActivate();
    this.spawnParticles(attacker.x, 1.2, attacker.z, 18, '#F59E0B', 4.6, 1.35);

    if (kind === 'generic') {
      attacker.invulnTimer = 0.5;
      this.rageZoomTimer = 0.95;
      this.startAction(attacker, 'rage_art');
      return;
    }

    const durationMap: Record<Exclude<PowerupKind, 'generic'>, number> = {
      fady_smoke: 3.5,
      saf_hug: 3.0,
      jav_story: 3.5,
      jam_snooker: 3.7,
      chet_ford: 3.1,
      immy_girls: 3.8,
    };
    const actionMap: Record<Exclude<PowerupKind, 'generic'>, CombatAction> = {
      fady_smoke: 'powerup_fady',
      saf_hug: 'powerup_saf',
      jav_story: 'powerup_jav',
      jam_snooker: 'powerup_jam',
      chet_ford: 'powerup_chet',
      immy_girls: 'powerup_immy',
    };

    const duration = durationMap[kind];
    attacker.invulnTimer = duration + 0.2;
    attacker.vx = 0;
    attacker.vy = 0;
    attacker.vz = 0;
    defender.vx = 0;
    defender.vz = 0;
    this.rageZoomTimer = Math.min(2.6, duration * 0.75);

    this.startAction(attacker, actionMap[kind], duration);

    this.activePowerup = {
      kind,
      attacker,
      defender,
      elapsed: 0,
      duration,
      startX: attacker.x,
      startZ: attacker.z,
      flags: 0,
    };
  }

  private dealPowerupHit(
    attacker: FighterRuntime,
    defender: FighterRuntime,
    damage: number,
    opts: {
      knockbackX: number;
      launchY: number;
      knockdown?: boolean;
      sparkColor?: string;
      heavy?: boolean;
      callout?: string;
    }
  ): boolean {
    if (this.phase === 'FIGHTING') {
      defender.hp = Math.max(0, defender.hp - damage);
      if (attacker.side === 1) this.stats.p1DamageDealt += damage;
      else this.stats.p2DamageDealt += damage;
    }

    attacker.comboCount += 1;
    attacker.comboResetTimer = 1.6;
    if (attacker.side === 1 && attacker.comboCount > this.stats.p1MaxCombo) {
      this.stats.p1MaxCombo = attacker.comboCount;
    }
    if (attacker.side === 2 && attacker.comboCount > this.stats.p2MaxCombo) {
      this.stats.p2MaxCombo = attacker.comboCount;
    }

    defender.rage = Math.min(100, defender.rage + Math.round(damage * 0.9));
    defender.hitFlash = 1.0;
    this.shakeIntensity = opts.heavy ? 0.34 : 0.16;
    if (opts.callout) this.pushCallout(attacker, opts.callout);

    this.spawnParticles(
      defender.x,
      1.2,
      defender.z,
      opts.heavy ? 18 : 10,
      opts.sparkColor ?? '#F59E0B',
      opts.heavy ? 5.2 : 3.4,
      opts.heavy ? 1.3 : 0.95
    );

    if (this.phase === 'FIGHTING' && defender.hp <= 0) {
      this.triggerRoundKO(attacker, defender);
      return true;
    }

    if (opts.knockdown) {
      defender.vx = attacker.facing * opts.knockbackX;
      defender.vy = opts.launchY;
      this.startAction(defender, 'knockdown', 1.05);
    } else if (opts.knockbackX > 0 || opts.launchY > 0) {
      defender.vx = attacker.facing * opts.knockbackX;
      defender.vy = opts.launchY;
      this.startAction(defender, 'hitstun', 0.42);
    }
    return false;
  }

  private updateActivePowerup(dt: number) {
    const s = this.activePowerup;
    if (!s) return;

    s.elapsed += dt;
    const phase = Math.min(1, s.elapsed / s.duration);
    const { attacker, defender } = s;
    const facing = attacker.facing;

    // Sync attacker actionTimer accurately with choreography phase
    attacker.actionTimer = s.elapsed;
    attacker.actionDuration = s.duration;

    const once = (bit: number): boolean => {
      if ((s.flags & bit) !== 0) return false;
      s.flags |= bit;
      return true;
    };

    switch (s.kind) {
      case 'fady_smoke': {
        // Sits on chair smoking, fills arena with smoke, then charges and smashes!
        if (phase < 0.62) {
          attacker.x = THREE.MathUtils.damp(attacker.x, s.startX, 10, dt);
          attacker.z = THREE.MathUtils.damp(attacker.z, s.startZ, 10, dt);
          if (phase > 0.14 && once(1)) {
            soundEngine.playSmokePuff();
            this.setSpeechBubble(attacker, 'Hold on... smoke break.', 1.4);
          }
          if (phase > 0.34 && once(2)) {
            soundEngine.playSmokePuff();
            if (defender.action !== 'ko') {
              this.startAction(defender, 'coughing', 1.25);
            }
          }
          if (phase > 0.5 && once(4)) {
            soundEngine.playSmokePuff();
          }
        } else if (phase < 0.8) {
          // Sprint out of the smoke straight to opponent!
          const targetX = THREE.MathUtils.clamp(
            defender.x - facing * 1.15,
            -ARENA_X_LIMIT,
            ARENA_X_LIMIT
          );
          attacker.x = THREE.MathUtils.damp(attacker.x, targetX, 14, dt);
          attacker.z = THREE.MathUtils.damp(attacker.z, defender.z, 12, dt);
        } else if (once(8)) {
          // Massive smoke-ambush punch!
          soundEngine.playHit(true);
          this.hitstopTimer = 0.11;
          this.dealPowerupHit(attacker, defender, 32, {
            knockbackX: 5.2,
            launchY: 5.0,
            knockdown: true,
            sparkColor: '#F59E0B',
            heavy: true,
            callout: 'SMOKE AMBUSH!',
          });
        }
        this.powerupDirector.updateFadySmoke(
          phase,
          attacker.x,
          attacker.z,
          facing,
          s.startX,
          s.startZ,
          this.elapsed
        );
        break;
      }

      case 'saf_hug': {
        // Charges in, wraps opponent in a massive bear hug, squeezes 3x tight, then pops them away!
        if (phase < 0.22) {
          const targetX = THREE.MathUtils.clamp(
            defender.x - facing * 0.62,
            -ARENA_X_LIMIT,
            ARENA_X_LIMIT
          );
          attacker.x = THREE.MathUtils.damp(attacker.x, targetX, 16, dt);
          attacker.z = THREE.MathUtils.damp(attacker.z, defender.z, 14, dt);
        } else if (phase < 0.82) {
          // Lock defender chest-to-chest inside the tight hug!
          defender.x = THREE.MathUtils.clamp(
            attacker.x + facing * 0.56,
            -ARENA_X_LIMIT,
            ARENA_X_LIMIT
          );
          defender.z = attacker.z;
          defender.y = 0;
          if (defender.action !== 'squeezed' && defender.action !== 'ko') {
            this.startAction(defender, 'squeezed', 1.9);
          }
          if (phase > 0.24 && once(1)) {
            this.setSpeechBubble(attacker, 'Come here bro!! BIG HUG!!', 1.6);
          }
          if (phase > 0.32 && once(2)) {
            soundEngine.playSqueeze();
            this.dealPowerupHit(attacker, defender, 9, {
              knockbackX: 0,
              launchY: 0,
              sparkColor: '#FBBF24',
              callout: 'SQUEEZE!',
            });
          }
          if (phase > 0.52 && once(4)) {
            soundEngine.playSqueeze();
            this.dealPowerupHit(attacker, defender, 10, {
              knockbackX: 0,
              launchY: 0,
              sparkColor: '#F97316',
              callout: 'TIGHTER!!',
            });
          }
          if (phase > 0.72 && once(8)) {
            soundEngine.playSqueeze();
            this.dealPowerupHit(attacker, defender, 13, {
              knockbackX: 0,
              launchY: 0,
              sparkColor: '#EF4444',
              heavy: true,
              callout: 'CRUSHED!!',
            });
          }
        } else if (once(16)) {
          // Release pop knockdown!
          soundEngine.playHit(true);
          if (defender.action !== 'ko') {
            defender.vx = facing * 4.4;
            defender.vy = 4.8;
            this.startAction(defender, 'knockdown', 0.95);
          }
        }
        break;
      }

      case 'jav_story': {
        // Walks up, tells an animated story while opponent listens, then delivers a MEGA SLAP!
        const talkX = THREE.MathUtils.clamp(
          defender.x - facing * 1.18,
          -ARENA_X_LIMIT,
          ARENA_X_LIMIT
        );
        if (phase < 0.72) {
          attacker.x = THREE.MathUtils.damp(attacker.x, talkX, 11, dt);
          attacker.z = THREE.MathUtils.damp(attacker.z, defender.z, 11, dt);
          if (phase > 0.12 && once(1)) {
            if (defender.action !== 'ko') {
              this.startAction(defender, 'listening', 2.4);
            }
            this.setSpeechBubble(attacker, 'Bro listen, crazy story from last week...', 1.4);
          }
          if (phase > 0.44 && once(2)) {
            this.setSpeechBubble(attacker, 'So anyway long story short—', 1.1);
          }
        } else if (phase < 0.82) {
          // Wind up slap!
          if (once(4)) {
            soundEngine.playWhoosh(1.3);
          }
        } else if (once(8)) {
          // THUNDEROUS OPEN-HAND SLAP!!
          soundEngine.playSlap();
          this.hitstopTimer = 0.12;
          this.setSpeechBubble(attacker, 'SMACK!!', 0.9);
          this.dealPowerupHit(attacker, defender, 31, {
            knockbackX: 5.8,
            launchY: 5.2,
            knockdown: true,
            sparkColor: '#FDE047',
            heavy: true,
            callout: 'MEGA SLAP!!',
          });
        }
        break;
      }

      case 'jam_snooker': {
        // Pulls out 3D snooker cue, whacks opponent 3 times, then drops iconic speech bubble!
        const whackX = THREE.MathUtils.clamp(
          defender.x - facing * 1.32,
          -ARENA_X_LIMIT,
          ARENA_X_LIMIT
        );
        if (phase < 0.62) {
          attacker.x = THREE.MathUtils.damp(attacker.x, whackX, 13, dt);
          attacker.z = THREE.MathUtils.damp(attacker.z, defender.z, 12, dt);
        }
        if (phase > 0.22 && once(1)) {
          soundEngine.playWoodWhack();
          this.dealPowerupHit(attacker, defender, 10, {
            knockbackX: 0.9,
            launchY: 0,
            sparkColor: '#38BDF8',
            callout: 'WHACK!',
          });
        }
        if (phase > 0.4 && once(2)) {
          soundEngine.playWoodWhack();
          this.dealPowerupHit(attacker, defender, 10, {
            knockbackX: 1.1,
            launchY: 0,
            sparkColor: '#38BDF8',
            callout: 'WHACK!!',
          });
        }
        if (phase > 0.56 && once(4)) {
          soundEngine.playWoodWhack();
          this.hitstopTimer = 0.1;
          this.dealPowerupHit(attacker, defender, 12, {
            knockbackX: 4.8,
            launchY: 4.5,
            knockdown: true,
            sparkColor: '#F59E0B',
            heavy: true,
            callout: 'SNOOKERED!',
          });
        }
        if (phase > 0.64 && once(8)) {
          this.setSpeechBubble(attacker, 'you know what bro just drop me off home', 2.6);
        }
        this.powerupDirector.updateJamSnooker(phase, attacker.x, attacker.y, attacker.z, facing);
        break;
      }

      case 'chet_ford': {
        // Steps back & whistles as a 3D Red Ford car blasts across the screen and drives over opponent!
        if (phase < 0.24) {
          const safeX = THREE.MathUtils.clamp(
            s.startX - facing * 1.1,
            -ARENA_X_LIMIT,
            ARENA_X_LIMIT
          );
          attacker.x = THREE.MathUtils.damp(attacker.x, safeX, 7, dt);
          attacker.z = THREE.MathUtils.damp(attacker.z, -0.95, 7, dt);
          if (once(1)) {
            soundEngine.playCarHorn();
            this.setSpeechBubble(attacker, 'Watch out—Red Ford coming through!', 1.5);
          }
        }
        const { carX, carActive } = this.powerupDirector.updateChetFord(
          phase,
          s.startX,
          defender.z,
          facing
        );
        if (carActive && Math.random() < 0.55) {
          this.spawnParticles(carX - facing * 1.35, 0.14, defender.z, 2, '#B85D38', 2.4, 0.9);
        }
        if (carActive && Math.abs(carX - defender.x) < 1.25 && once(2)) {
          soundEngine.playCarCrash();
          this.hitstopTimer = 0.1;
          this.dealPowerupHit(attacker, defender, 34, {
            knockbackX: 6.2,
            launchY: 6.4,
            knockdown: true,
            sparkColor: '#EF4444',
            heavy: true,
            callout: 'RED FORD RUNOVER!',
          });
        }
        break;
      }

      case 'immy_girls': {
        // 3 random girls sprint on screen, hug Immy with hearts, then rush and punch the opponent!
        if (phase > 0.22 && once(1)) {
          soundEngine.playCheerPop();
          this.setSpeechBubble(attacker, 'OMG Immy!! ❤️', 1.3);
        }
        if (phase > 0.54 && once(2)) {
          this.setSpeechBubble(attacker, 'Girls—get him!!', 1.2);
        }
        if (phase > 0.65 && once(4)) {
          soundEngine.playHit(false);
          this.dealPowerupHit(attacker, defender, 10, {
            knockbackX: 0.7,
            launchY: 0,
            sparkColor: '#EC4899',
            callout: 'SQUAD PUNCH!',
          });
        }
        if (phase > 0.74 && once(8)) {
          soundEngine.playHit(false);
          this.dealPowerupHit(attacker, defender, 10, {
            knockbackX: 0.8,
            launchY: 0,
            sparkColor: '#14B8A6',
            callout: 'DOUBLE HIT!',
          });
        }
        if (phase > 0.83 && once(16)) {
          soundEngine.playHit(true);
          this.hitstopTimer = 0.1;
          this.dealPowerupHit(attacker, defender, 13, {
            knockbackX: 5.2,
            launchY: 4.9,
            knockdown: true,
            sparkColor: '#A855F7',
            heavy: true,
            callout: 'FAN SQUAD K.O.!',
          });
        }
        this.powerupDirector.updateImmyGirls(
          phase,
          attacker.x,
          attacker.z,
          defender.x,
          defender.z,
          facing,
          this.elapsed
        );
        break;
      }

      default:
        break;
    }

    if (s.elapsed >= s.duration || this.phase !== 'FIGHTING') {
      // If Jam triggered a KO right before his bubble, still let the speech bubble linger nicely!
      if (s.kind === 'jam_snooker' && (s.flags & 8) === 0) {
        this.setSpeechBubble(attacker, 'you know what bro just drop me off home', 2.4);
      }
      this.powerupDirector.hideAll();
      this.activePowerup = null;
      if (attacker.action.startsWith('powerup_')) {
        attacker.action = 'idle';
        attacker.actionTimer = 0;
      }
      if (
        defender.action === 'squeezed' ||
        defender.action === 'listening' ||
        defender.action === 'coughing'
      ) {
        defender.action = 'idle';
        defender.actionTimer = 0;
      }
    }
  }

  private triggerRoundKO(winner: FighterRuntime, loser: FighterRuntime) {
    this.phase = 'ROUND_KO';
    this.phaseTimer = 2.6;
    this.slowMoTimer = 1.1;
    this.shakeIntensity = 0.48;
    winner.roundsWon += 1;

    if (winner.hp >= winner.maxHp) {
      if (winner.side === 1) this.stats.p1PerfectRounds += 1;
      else this.stats.p2PerfectRounds += 1;
      this.announcement = 'PERFECT K.O.!';
    } else {
      this.announcement = 'K.O.!';
    }
    this.subAnnouncement = `${winner.profile.name} wins Round ${this.roundNumber}`;

    loser.vx = winner.facing * 4.5;
    loser.vy = 4.6;
    this.startAction(loser, 'ko', 3.0);
    this.startAction(winner, 'victory', 3.0);
    soundEngine.playKO();
    this.spawnParticles(loser.x, 1.2, loser.z, 24, '#DC2626', 5.8, 1.4);
  }

  private updateFighterPhysics(f: FighterRuntime, opp: FighterRuntime, dt: number) {
    // Advance action timers
    f.actionTimer += dt;
    if (f.chainWindow > 0) f.chainWindow = Math.max(0, f.chainWindow - dt);
    if (f.hitFlash > 0) f.hitFlash = Math.max(0, f.hitFlash - dt * 5.2);
    if (f.invulnTimer > 0) f.invulnTimer = Math.max(0, f.invulnTimer - dt);

    if (f.comboResetTimer > 0) {
      f.comboResetTimer -= dt;
      if (f.comboResetTimer <= 0) f.comboCount = 0;
    }

    // Smooth red damage-drain trail on health bar
    if (f.trailHp > f.hp) {
      f.trailHp = Math.max(f.hp, f.trailHp - dt * 26);
    } else {
      f.trailHp = f.hp;
    }

    // Return to idle when finite actions finish
    const isLoopingState =
      f.action === 'idle' ||
      f.action === 'walk_fwd' ||
      f.action === 'walk_back' ||
      f.action === 'crouch' ||
      f.action === 'block' ||
      f.action === 'ko' ||
      f.action === 'victory';

    if (!isLoopingState && f.actionTimer >= f.actionDuration) {
      if (f.action === 'knockdown') {
        f.invulnTimer = 0.45;
        this.startAction(f, 'wakeup', 0.34);
      } else {
        f.action = 'idle';
        f.actionTimer = 0;
      }
    }

    // Integrate X / Y / Z velocity
    f.x += f.vx * dt;
    f.z += f.vz * dt;
    f.y += f.vy * dt;

    // Friction on grounded states
    if (f.y <= 0) {
      f.y = 0;
      if (f.vy < -2.5) {
        this.spawnParticles(f.x, 0.08, f.z, 6, '#B85D38', 2.0, 0.9);
      }
      f.vy = 0;
      if (f.action !== 'walk_fwd' && f.action !== 'walk_back') {
        f.vx *= Math.exp(-9 * dt);
      }
      if (
        f.action !== 'sidestep_in' &&
        f.action !== 'sidestep_out' &&
        f.action !== 'walk_fwd' &&
        f.action !== 'walk_back'
      ) {
        f.vz *= Math.exp(-9 * dt);
      }
    } else {
      f.vy += GRAVITY * dt;
    }

    // Keep inside village akhara bounds
    f.x = THREE.MathUtils.clamp(f.x, -ARENA_X_LIMIT, ARENA_X_LIMIT);
    f.z = THREE.MathUtils.clamp(f.z, -ARENA_Z_LIMIT, ARENA_Z_LIMIT);

    // Auto-face opponent when grounded & neutral
    if (f.action === 'idle' || f.action === 'walk_fwd' || f.action === 'walk_back' || f.action === 'block') {
      if (Math.abs(opp.x - f.x) > 0.18) {
        f.facing = opp.x >= f.x ? 1 : -1;
      }
    }
  }

  private resolveBodyPushbox() {
    if (this.activePowerup && this.activePowerup.kind === 'saf_hug') return;
    const minSep = 0.92;
    const dz = Math.abs(this.p1.z - this.p2.z);
    if (dz > 0.72) return; // Sidestepped past each other in 3D depth!
    const dx = this.p2.x - this.p1.x;
    const dist = Math.abs(dx);
    if (dist < minSep) {
      const push = (minSep - dist) * 0.5;
      const dir = dx >= 0 ? 1 : -1;
      this.p1.x = THREE.MathUtils.clamp(this.p1.x - dir * push, -ARENA_X_LIMIT, ARENA_X_LIMIT);
      this.p2.x = THREE.MathUtils.clamp(this.p2.x + dir * push, -ARENA_X_LIMIT, ARENA_X_LIMIT);
    }
  }

  public update(
    rawDt: number,
    p1Input: PlayerInputState,
    p2Input: PlayerInputState,
    camera: THREE.PerspectiveCamera
  ) {
    const clampedDt = Math.min(rawDt, 0.05);
    if (this.paused) return;

    this.elapsed += clampedDt;

    if (this.rageFlashTimer > 0) {
      this.rageFlashTimer = Math.max(0, this.rageFlashTimer - clampedDt);
      if (this.rageFlashTimer === 0) this.rageFlashSide = null;
    }
    if (this.speechBubbleTimer > 0) {
      this.speechBubbleTimer = Math.max(0, this.speechBubbleTimer - clampedDt * 0.7); // bubbles linger ~40% longer
      if (this.speechBubbleTimer === 0) this.speechBubble = null;
    }
    // Random fighter banter in 1v1 and versus fights
    if (this.phase === 'FIGHTING' && this.speechBubbleTimer === 0) {
      this.chatterTimer -= clampedDt;
      if (this.chatterTimer <= 0) {
        this.chatterTimer = 8 + Math.random() * 7;
        const f = Math.random() < 0.5 ? this.p1 : this.p2;
        const lines = FIGHTER_LINES[f.profile.id];
        if (lines && !String(f.action).includes('powerup')) {
          this.setSpeechBubble(f, lines[Math.floor(Math.random() * lines.length)], 3.2);
        }
      }
    }
    if (this.rageZoomTimer > 0) {
      this.rageZoomTimer = Math.max(0, this.rageZoomTimer - clampedDt);
    }
    if (this.shakeIntensity > 0) {
      this.shakeIntensity = Math.max(0, this.shakeIntensity - clampedDt * 1.9);
    }

    // Hitstop freeze frame for chunky Tekken impact feel
    if (this.hitstopTimer > 0) {
      this.hitstopTimer = Math.max(0, this.hitstopTimer - clampedDt);
      this.updateCamera(camera, clampedDt);
      return;
    }

    const timeScale = this.slowMoTimer > 0 ? 0.32 : 1.0;
    if (this.slowMoTimer > 0) {
      this.slowMoTimer = Math.max(0, this.slowMoTimer - clampedDt);
    }
    const dt = clampedDt * timeScale;

    if (this.phase === 'ATTRACT') {
      // Lively background sparring showcase on Title Screen
      const ai1 = this.computeAiInput(this.p1, this.p2, dt);
      const ai2 = this.computeAiInput(this.p2, this.p1, dt);
      this.handleFighterInput(this.p1, this.p2, ai1);
      this.handleFighterInput(this.p2, this.p1, ai2);
      this.resolveAttackHit(this.p1, this.p2);
      this.resolveAttackHit(this.p2, this.p1);
    } else if (this.phase === 'ROUND_INTRO') {
      this.phaseTimer -= clampedDt;
      if (this.phaseTimer < 0.65) {
        this.announcement = 'FIGHT!';
        this.subAnnouncement = '';
      }
      if (this.phaseTimer <= 0) {
        this.phase = 'FIGHTING';
        this.announcement = '';
        this.subAnnouncement = '';
      }
    } else if (this.phase === 'FIGHTING') {
      // Round countdown timer
      this.roundTimer = Math.max(0, this.roundTimer - dt);
      if (this.roundTimer <= 0) {
        const winner = this.p1.hp >= this.p2.hp ? this.p1 : this.p2;
        const loser = winner === this.p1 ? this.p2 : this.p1;
        this.announcement = 'TIME UP!';
        this.triggerRoundKO(winner, loser);
      } else if (this.activePowerup) {
        this.updateActivePowerup(dt);
      } else {
        // Gentle passive Powerup recharge so players can unleash powers frequently!
        this.p1.rage = Math.min(100, this.p1.rage + dt * 7.5);
        this.p2.rage = Math.min(100, this.p2.rage + dt * 4.5);

        const effectiveP2Input =
          this.mode === 'versus_2p' ? p2Input : this.computeAiInput(this.p2, this.p1, dt);

        this.handleFighterInput(this.p1, this.p2, p1Input);
        if (!this.activePowerup) {
          this.handleFighterInput(this.p2, this.p1, effectiveP2Input);
        }
        if (!this.activePowerup) {
          this.resolveAttackHit(this.p1, this.p2);
          this.resolveAttackHit(this.p2, this.p1);
        }
      }
    } else if (this.phase === 'ROUND_KO') {
      this.phaseTimer -= clampedDt;
      if (this.phaseTimer <= 0) {
        if (this.p1.roundsWon >= 2 || this.p2.roundsWon >= 2) {
          this.phase = 'MATCH_OVER';
          this.stats.winnerSide = this.p1.roundsWon >= 2 ? 1 : 2;
          const champ = this.stats.winnerSide === 1 ? this.p1 : this.p2;
          this.announcement = `${champ.profile.name.toUpperCase()} WINS`;
          this.subAnnouncement = champ.profile.taunt;
        } else {
          this.beginRound(this.roundNumber + 1);
        }
      }
    }

    // Consume edge-triggered button flags
    p1Input.lpPressed = false;
    p1Input.rpPressed = false;
    p1Input.kickPressed = false;
    p1Input.sidestepPressed = false;
    p1Input.throwPressed = false;
    p1Input.ragePressed = false;
    p1Input.switchPressed = false;
    p1Input.assistPressed = false;
    p1Input.panicSpecialPressed = false;
    p1Input.jumpPressed = false;
    p1Input.dashDir = 0;
    p2Input.lpPressed = false;
    p2Input.rpPressed = false;
    p2Input.kickPressed = false;
    p2Input.sidestepPressed = false;
    p2Input.throwPressed = false;
    p2Input.ragePressed = false;
    p2Input.switchPressed = false;
    p2Input.assistPressed = false;
    p2Input.panicSpecialPressed = false;
    p2Input.jumpPressed = false;
    p2Input.dashDir = 0;

    this.updateFighterPhysics(this.p1, this.p2, dt);
    this.updateFighterPhysics(this.p2, this.p1, dt);
    this.resolveBodyPushbox();

    // Sync 3D fighter rigs
    this.syncRig(this.p1);
    this.syncRig(this.p2);

    // Update pooled 3D VFX particles
    this.updateParticles(dt);

    // Smooth Tekken dynamic camera tracking
    this.updateCamera(camera, clampedDt);
  }

  private syncRig(f: FighterRuntime) {
    f.rig.root.position.set(f.x, f.y, f.z);
    const phase = f.actionDuration > 0 ? Math.min(1, f.actionTimer / f.actionDuration) : 0;
    applyFighterPose(
      f.rig,
      f.action,
      phase,
      this.elapsed,
      f.facing,
      f.y,
      f.hitFlash,
      f.rage >= 100,
      resolveFighterStyle(f.profile),
      f.vx
    );
  }

  private updateParticles(dt: number) {
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        this._dummy.position.set(0, -10, 0);
        this._dummy.scale.setScalar(0.001);
        this._dummy.updateMatrix();
        this.particleMesh.setMatrixAt(i, this._dummy.matrix);
        continue;
      }
      p.vy -= 11 * dt;
      p.x += p.vx * dt;
      p.y = Math.max(0.05, p.y + p.vy * dt);
      p.z += p.vz * dt;
      const ratio = p.life / p.maxLife;
      this._dummy.position.set(p.x, p.y, p.z);
      this._dummy.scale.setScalar(p.size * ratio);
      this._dummy.rotation.set(p.life * 6, p.life * 4, 0);
      this._dummy.updateMatrix();
      this.particleMesh.setMatrixAt(i, this._dummy.matrix);
      this.particleMesh.setColorAt(i, p.color);
    }
    this.particleMesh.instanceMatrix.needsUpdate = true;
    if (this.particleMesh.instanceColor) {
      this.particleMesh.instanceColor.needsUpdate = true;
    }
  }

  private updateCamera(camera: THREE.PerspectiveCamera, dt: number) {
    const midX = (this.p1.x + this.p2.x) * 0.5;
    const midZ = (this.p1.z + this.p2.z) * 0.5;
    const sep = Math.abs(this.p1.x - this.p2.x);

    const isPortraitViewport = camera.aspect < 0.9;
    const portraitDistBoost = isPortraitViewport ? 3.2 : 0;

    if (this.phase === 'ATTRACT') {
      // Wide Double Dragon elevated street-brawler showcase
      const orbitX = Math.sin(this.elapsed * 0.22) * 2.4;
      this._camTargetPos.set(midX * 0.5 + orbitX, 5.05, 14.2 + portraitDistBoost);
      this._camLookAt.set(midX * 0.55, 1.05, midZ * 0.4);
    } else if (this.rageZoomTimer > 0) {
      // Slight cinematic beat-'em-up punch-in while keeping full lane props (car, 3 girls, smoke) in frame
      this._camTargetPos.set(midX, 4.15, midZ * 0.4 + 11.2 + portraitDistBoost * 0.75);
      this._camLookAt.set(midX, 1.15, midZ * 0.5);
    } else {
      // Classic zoomed-out Double Dragon 3/4 overhead beat-'em-up camera
      const targetDist = THREE.MathUtils.clamp(12.2 + sep * 0.58, 13.0, 17.2) + portraitDistBoost;
      this._camTargetPos.set(midX, 5.15 + sep * 0.08, midZ * 0.45 + targetDist);
      this._camLookAt.set(midX, 1.05, midZ * 0.45);
    }

    camera.position.x = THREE.MathUtils.damp(camera.position.x, this._camTargetPos.x, 5.5, dt);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, this._camTargetPos.y, 5.5, dt);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, this._camTargetPos.z, 5.5, dt);

    // Impact camera shake
    if (this.shakeIntensity > 0.005) {
      camera.position.x += (Math.random() - 0.5) * this.shakeIntensity;
      camera.position.y += (Math.random() - 0.5) * this.shakeIntensity * 0.7;
    }

    this._currentLookAt.x = THREE.MathUtils.damp(this._currentLookAt.x, this._camLookAt.x, 7, dt);
    this._currentLookAt.y = THREE.MathUtils.damp(this._currentLookAt.y, this._camLookAt.y, 7, dt);
    this._currentLookAt.z = THREE.MathUtils.damp(this._currentLookAt.z, this._camLookAt.z, 7, dt);
    camera.lookAt(this._currentLookAt);
  }

  public getHudSnapshot(): HudSnapshot {
    const toHud = (f: FighterRuntime) => ({
      id: f.profile.id,
      name: f.profile.name,
      nickname: f.profile.nickname,
      portraitUrl: f.profile.portraitUrl,
      hp: Math.ceil(f.hp),
      maxHp: f.maxHp,
      trailHp: f.trailHp,
      recoverableHp: Math.ceil(f.recoverableHp),
      rage: Math.round(f.rage),
      combo: f.comboCount,
      roundsWon: f.roundsWon,
      action: f.action,
      callout: f.callout,
      calloutSeq: f.calloutSeq,
    });

    return {
      phase: this.phase,
      roundNumber: this.roundNumber,
      timer: Math.ceil(this.roundTimer),
      announcement: this.announcement,
      subAnnouncement: this.subAnnouncement,
      p1: toHud(this.p1),
      p2: toHud(this.p2),
      stats: { ...this.stats },
      rageFlashSide: this.rageFlashSide,
      speechBubble: this.speechBubble ? { ...this.speechBubble } : null,
    };
  }

  public dispose() {
    this.powerupDirector.dispose();
    this.scene.remove(this.particleMesh);
    this.particleGeo.dispose();
    this.particleMat.dispose();
  }
}
