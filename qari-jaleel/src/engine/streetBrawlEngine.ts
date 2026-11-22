import * as THREE from 'three';
import {
  BrawlHeldWeapon,
  BrawlRank,
  BrawlScorecard,
  BrawlTargetEnemyHud,
  CombatAction,
  ComicPopupItem,
  Difficulty,
  FighterProfile,
  FightingStyle,
  HudSnapshot,
  MatchPhase,
  MatchStats,
  PlayerInputState,
  SpeechBubbleState,
  VillageBoonCard,
  VillageBoonId,
} from '../types/game';
import { FIGHTING_STYLES, resolveFighterStyle } from '../data/roster';
import { loadArcadeRecords, saveEndlessRecord, saveStreetBrawlRecord } from '../utils/storage';
import { ArticulatedFighterRig, applyFighterPose } from './fighterRig';
import { getPowerupKindForFighter, PowerupDirector, PowerupKind } from './powerupDirector';
import { StreetStageHandle } from './streetStage';
import {
  applyThugPose,
  createVillageThugRig,
  ThugAction,
  VILLAGE_COUSIN_ROSTER,
  VillageThugRig,
  VillageThugSpec,
} from './villageThugs';
import { soundEngine } from './sound';

interface HeroMoveSpec {
  duration: number;
  activeStart: number;
  activeEnd: number;
  rangeX: number;
  rangeZ: number;
  damage: number;
  knockbackX: number;
  launchY: number;
  hitstun: number;
  hitstop: number;
  rageGain: number;
  heavy: boolean;
  label: string;
}

const COMIC_POPUP_DURATION = 0.55;
const COMIC_POPUP_MAX = 3;

const HERO_MOVES: Partial<Record<CombatAction, HeroMoveSpec>> = {
  lp: {
    duration: 0.28,
    activeStart: 0.08,
    activeEnd: 0.16,
    rangeX: 1.82,
    rangeZ: 0.94,
    damage: 14,
    knockbackX: 0.65,
    launchY: 0,
    hitstun: 0.34,
    hitstop: 0.064,
    rageGain: 12,
    heavy: false,
    label: 'JAB',
  },
  lp2: {
    duration: 0.28,
    activeStart: 0.08,
    activeEnd: 0.16,
    rangeX: 1.92,
    rangeZ: 0.96,
    damage: 17,
    knockbackX: 0.85,
    launchY: 0,
    hitstun: 0.38,
    hitstop: 0.072,
    rageGain: 14,
    heavy: false,
    label: 'CROSS',
  },
  rp: {
    duration: 0.36,
    activeStart: 0.1,
    activeEnd: 0.21,
    rangeX: 2.15,
    rangeZ: 1.05,
    damage: 25,
    knockbackX: 1.85,
    launchY: 3.4,
    hitstun: 0.48,
    hitstop: 0.086,
    rageGain: 18,
    heavy: true,
    label: 'HEAVY SMASH',
  },
  combo_finisher: {
    duration: 0.42,
    activeStart: 0.11,
    activeEnd: 0.25,
    rangeX: 2.28,
    rangeZ: 1.12,
    damage: 29,
    knockbackX: 2.45,
    launchY: 4.3,
    hitstun: 0.56,
    hitstop: 0.096,
    rageGain: 20,
    heavy: true,
    label: 'FINISHER!',
  },
  kick: {
    duration: 0.34,
    activeStart: 0.09,
    activeEnd: 0.2,
    rangeX: 2.28,
    rangeZ: 0.98,
    damage: 22,
    knockbackX: 1.85,
    launchY: 2.4,
    hitstun: 0.44,
    hitstop: 0.078,
    rageGain: 16,
    heavy: true,
    label: 'VILLAGE KICK',
  },
  throw_execute: {
    duration: 0.4,
    activeStart: 0.11,
    activeEnd: 0.24,
    rangeX: 2.08,
    rangeZ: 1.08,
    damage: 30,
    knockbackX: 2.9,
    launchY: 4.5,
    hitstun: 0.65,
    hitstop: 0.094,
    rageGain: 22,
    heavy: true,
    label: 'SLAM!',
  },
  dash_attack: {
    duration: 0.38,
    activeStart: 0.09,
    activeEnd: 0.23,
    rangeX: 2.35,
    rangeZ: 1.05,
    damage: 27,
    knockbackX: 3.1,
    launchY: 3.8,
    hitstun: 0.58,
    hitstop: 0.088,
    rageGain: 20,
    heavy: true,
    label: 'DASH CHARGE!',
  },
  jump_kick: {
    duration: 0.34,
    activeStart: 0.05,
    activeEnd: 0.28,
    rangeX: 2.08,
    rangeZ: 1.02,
    damage: 21,
    knockbackX: 1.95,
    launchY: 2.4,
    hitstun: 0.46,
    hitstop: 0.078,
    rageGain: 15,
    heavy: true,
    label: 'JUMP KICK!',
  },
  back_elbow: {
    duration: 0.28,
    activeStart: 0.07,
    activeEnd: 0.17,
    rangeX: 1.98,
    rangeZ: 1.04,
    damage: 20,
    knockbackX: 2.2,
    launchY: 1.6,
    hitstun: 0.48,
    hitstop: 0.078,
    rageGain: 16,
    heavy: true,
    label: 'BACK ELBOW!',
  },
  sweep: {
    duration: 0.36,
    activeStart: 0.08,
    activeEnd: 0.22,
    rangeX: 2.24,
    rangeZ: 1.15,
    damage: 18,
    knockbackX: 1.45,
    launchY: 1.9,
    hitstun: 0.62,
    hitstop: 0.076,
    rageGain: 15,
    heavy: true,
    label: 'DRAGON SWEEP!',
  },
  spinning_heel_kick: {
    duration: 0.38,
    activeStart: 0.1,
    activeEnd: 0.25,
    rangeX: 2.42,
    rangeZ: 1.18,
    damage: 25,
    knockbackX: 2.35,
    launchY: 2.8,
    hitstun: 0.5,
    hitstop: 0.086,
    rageGain: 18,
    heavy: true,
    label: 'SPIN HEEL KICK!',
  },
  tornado_kick: {
    duration: 0.46,
    activeStart: 0.12,
    activeEnd: 0.32,
    rangeX: 2.55,
    rangeZ: 1.32,
    damage: 31,
    knockbackX: 2.85,
    launchY: 4.5,
    hitstun: 0.62,
    hitstop: 0.098,
    rageGain: 22,
    heavy: true,
    label: 'TORNADO KICK!',
  },
  axe_kick: {
    duration: 0.42,
    activeStart: 0.17,
    activeEnd: 0.29,
    rangeX: 2.22,
    rangeZ: 1.02,
    damage: 28,
    knockbackX: 1.75,
    launchY: 3.9,
    hitstun: 0.58,
    hitstop: 0.092,
    rageGain: 20,
    heavy: true,
    label: 'AXE KICK!',
  },
  flying_side_kick: {
    duration: 0.38,
    activeStart: 0.06,
    activeEnd: 0.3,
    rangeX: 2.35,
    rangeZ: 1.08,
    damage: 26,
    knockbackX: 3.15,
    launchY: 3.2,
    hitstun: 0.54,
    hitstop: 0.088,
    rageGain: 19,
    heavy: true,
    label: 'FLYING SIDE KICK!',
  },
};

function triggerHaptic(pattern: number | number[]) {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate(pattern);
    } catch {
      // ignore unsupported or blocked vibration
    }
  }
}

interface StreetZoneConfig {
  index: number;
  name: string;
  lockMinX: number;
  lockMaxX: number;
  triggerX: number;
  wave1: string[];
  wave2: string[];
}

const VILLAGE_BOON_POOL: VillageBoonCard[] = [
  {
    id: 'extra_mirchi',
    title: 'Extra Mirchi',
    subtitle: 'Spicy Chilli Burn',
    description: 'Heavy hooks & finishers ignite cousins with fiery chilli smoke for 3s of burn damage.',
    accentColor: '#EF4444',
  },
  {
    id: 'iron_lungi',
    title: 'Iron Lungi',
    subtitle: 'Unshakeable Stance',
    description: '+30% knockdown resistance and full immunity to Chappal Chacha slipper stuns.',
    accentColor: '#38BDF8',
  },
  {
    id: 'bazaar_bargain',
    title: 'Bazaar Bargain',
    subtitle: 'Heavyweight Hardware',
    description: 'Picked-up weapons have double durability and unleash a shockwave blast on their final hit.',
    accentColor: '#F59E0B',
  },
  {
    id: 'double_dhol',
    title: 'Double Dhol Tempo',
    subtitle: 'High-Speed Rhythm',
    description: '+15% faster attack speed and boosted POWER meter charge on every combo hit.',
    accentColor: '#A855F7',
  },
  {
    id: 'kadak_chai',
    title: 'Kadak Chai Boost',
    subtitle: 'Steaming Stamina',
    description: 'Masala Chai pickups heal +50% more HP and grant 5 seconds of temporary super-armor.',
    accentColor: '#22C55E',
  },
];

const STREET_ZONES: StreetZoneConfig[] = [
  {
    index: 1,
    name: 'Chai Chowk',
    lockMinX: -6.5,
    lockMaxX: 11.5,
    triggerX: -10,
    wave1: ['bunty', 'golu'],
    wave2: ['chappal_chacha', 'tinku', 'pappu'],
  },
  {
    index: 2,
    name: 'Banyan Courtyard',
    lockMinX: 10.0,
    lockMaxX: 28.0,
    triggerX: 14.2,
    wave1: ['lathi_lala', 'raju_bike', 'bunty'],
    wave2: ['moti_pehelwan', 'chappal_chacha', 'pappu'],
  },
  {
    index: 3,
    name: 'Mela Festival Square',
    lockMinX: 26.5,
    lockMaxX: 46.5,
    triggerX: 30.8,
    wave1: ['raju_bike', 'lathi_lala', 'chappal_chacha'],
    wave2: ['kalu_goon', 'bade_tau'],
  },
];

interface HeroWeaponMeshes {
  lathi: THREE.Group;
  chair: THREE.Group;
  stool: THREE.Group;
  coconut: THREE.Group;
  dispose: () => void;
}

type BufferedMoveKind = 'lp' | 'rp' | 'kick' | 'throw' | 'jump' | 'dodge';

interface HeroRuntime {
  index: 0 | 1;
  profile: FighterProfile;
  style: FightingStyle;
  rig: ArticulatedFighterRig;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  facing: 1 | -1;
  visualYaw: number;
  landingSquashTimer: number;
  hp: number;
  maxHp: number;
  trailHp: number;
  recoverableHp: number;
  rage: number;
  comboCount: number;
  comboTimer: number;
  action: CombatAction;
  actionTime: number;
  actionDuration: number;
  hitIdsThisSwing: Set<number>;
  lpChainStep: number;
  lpChainWindow: number;
  kickChainStep: number;
  kickChainWindow: number;
  bufferedAction: BufferedMoveKind | null;
  bufferTimer: number;
  isSprinting: boolean;
  sprintDir: -1 | 0 | 1;
  sprintDustTimer: number;
  aerialAttackUsed: boolean;
  isJumpSlamming: boolean;
  wasBlocking: boolean;
  blockStartElapsed: number;
  clinchTargetUid: number | null;
  clinchTimer: number;
  clinchKnees: number;
  hitFlash: number;
  invulnTimer: number;
  superArmorTimer: number;
  assistState: 'none' | 'dash_in' | 'attack' | 'dash_out';
  assistTimer: number;
  assistReturnX: number;
  assistReturnZ: number;
  ridingBikeTimer: number;
  bikeRamHitUids: Set<number>;
  callout: string;
  calloutSeq: number;
  heldWeapon: BrawlHeldWeapon | null;
  weaponMeshes: HeroWeaponMeshes;
  activeRing: THREE.Mesh;
  activeRingMat: THREE.MeshBasicMaterial;
  aiThinkTimer: number;
  powerupKind: PowerupKind;
  powerupOriginX: number;
  powerupOriginZ: number;
  powerupTargetId: number | null;
  powerupHitsMask: number;
}

interface EnemyRuntime {
  uid: number;
  spec: VillageThugSpec;
  rig: VillageThugRig;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  facing: 1 | -1;
  visualYaw: number;
  hp: number;
  maxHp: number;
  action: ThugAction;
  actionTime: number;
  actionDuration: number;
  hasHitThisSwing: boolean;
  hitFlash: number;
  aiCooldown: number;
  aiState: 'circle' | 'approach' | 'telegraph_pause' | 'retreat';
  orbitAngle: number;
  orbitDir: 1 | -1;
  stateTimer: number;
  reactionTimer: number;
  onBike: boolean;
  bowlingActive: boolean;
  bowlingOwnerIdx: 0 | 1;
  bowlingHitUids: Set<number>;
  wallBounced: boolean;
  burnTimer: number;
  burnTickTimer: number;
  burnOwnerIdx: 0 | 1;
  dizzyTimer: number;
  rearGrabCooldown: number;
  phase2Rage: boolean;
  koFadeTimer: number;
  alive: boolean;
  removed: boolean;
}

interface ProjectileRuntime {
  active: boolean;
  kind: 'chappal' | 'stool' | 'coconut';
  fromHero: boolean;
  ownerHeroIdx: 0 | 1;
  ownerEnemyUid: number | null;
  deflected: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  damage: number;
  hitUids: Set<number>;
  mesh: THREE.Group;
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
  scale: number;
}

interface PopupRuntime extends ComicPopupItem {
  life: number;
}

const PARTICLE_POOL_SIZE = 72;
// Expanded +30% walkable Z-axis depth (7.15u vs original 5.5u) for Double Dragon flanking & sidesteps!
const LANE_MIN_Z = -4.05;
const LANE_MAX_Z = 3.1;

function buildHeroWeaponProps(): HeroWeaponMeshes {
  const geos: THREE.BufferGeometry[] = [];
  const mats: THREE.Material[] = [];

  const woodMat = new THREE.MeshStandardMaterial({ color: '#A16227', roughness: 0.56, metalness: 0.1 });
  const brassMat = new THREE.MeshStandardMaterial({ color: '#F59E0B', roughness: 0.25, metalness: 0.88 });
  const steelMat = new THREE.MeshStandardMaterial({ color: '#CBD5E1', roughness: 0.28, metalness: 0.82 });
  const seatMat = new THREE.MeshStandardMaterial({ color: '#1D4ED8', roughness: 0.52, metalness: 0.18 });
  const stoolMat = new THREE.MeshStandardMaterial({ color: '#EF4444', roughness: 0.42, metalness: 0.08 });
  const cocoMat = new THREE.MeshStandardMaterial({ color: '#4D7C0F', roughness: 0.72, metalness: 0.04 });
  mats.push(woodMat, brassMat, steelMat, seatMat, stoolMat, cocoMat);

  // Lathi stick
  const lathi = new THREE.Group();
  lathi.position.set(0, -0.34, 0.04);
  lathi.rotation.set(Math.PI * 0.45, 0, 0);
  const stickGeo = new THREE.CylinderGeometry(0.032, 0.036, 1.32, 10);
  const bandGeo = new THREE.CylinderGeometry(0.039, 0.039, 0.06, 10);
  geos.push(stickGeo, bandGeo);
  const stick = new THREE.Mesh(stickGeo, woodMat);
  stick.position.y = 0.48;
  stick.castShadow = true;
  lathi.add(stick);
  [0.12, 0.55, 0.95].forEach((yy) => {
    const b = new THREE.Mesh(bandGeo, brassMat);
    b.position.y = yy;
    lathi.add(b);
  });
  lathi.visible = false;

  // Folding steel chair
  const chair = new THREE.Group();
  chair.position.set(0.04, -0.34, 0.1);
  chair.rotation.set(Math.PI * 0.42, 0.2, 0);
  const frameGeo = new THREE.BoxGeometry(0.56, 0.72, 0.08);
  const seatGeo = new THREE.BoxGeometry(0.46, 0.38, 0.1);
  geos.push(frameGeo, seatGeo);
  const frame = new THREE.Mesh(frameGeo, steelMat);
  frame.position.y = 0.34;
  frame.castShadow = true;
  const seat = new THREE.Mesh(seatGeo, seatMat);
  seat.position.y = 0.3;
  chair.add(frame, seat);
  chair.visible = false;

  // Throwable plastic village stool
  const stool = new THREE.Group();
  stool.position.set(0, -0.34, 0.16);
  const sTopGeo = new THREE.BoxGeometry(0.42, 0.08, 0.42);
  const sLegGeo = new THREE.CylinderGeometry(0.03, 0.022, 0.38, 6);
  geos.push(sTopGeo, sLegGeo);
  stool.add(new THREE.Mesh(sTopGeo, stoolMat));
  [
    [-0.14, -0.14],
    [0.14, -0.14],
    [-0.14, 0.14],
    [0.14, 0.14],
  ].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(sLegGeo, stoolMat);
    leg.position.set(lx, -0.2, lz);
    stool.add(leg);
  });
  stool.visible = false;

  // Throwable giant green coconut
  const coconut = new THREE.Group();
  coconut.position.set(0, -0.34, 0.12);
  const cGeo = new THREE.SphereGeometry(0.22, 10, 8);
  geos.push(cGeo);
  const nut = new THREE.Mesh(cGeo, cocoMat);
  nut.scale.set(0.95, 1.15, 0.95);
  coconut.add(nut);
  coconut.visible = false;

  return {
    lathi,
    chair,
    stool,
    coconut,
    dispose: () => {
      geos.forEach((g) => g.dispose());
      mats.forEach((m) => m.dispose());
    },
  };
}

/** Procedural sharp arcade overhead badge texture (`P1 · YOU`, `AI`, `REVIVE!`) with crisp contrast */
function createOverheadBadgeTexture(
  label: string,
  bgHex: string,
  borderHex: string,
  textHex: string
): THREE.CanvasTexture {
  const w = 256;
  const h = 96;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, w, h);

  // Crisp rectangular arcade plate with strong drop shadow
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.78)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = bgHex;
  ctx.fillRect(18, 12, w - 36, h - 28);
  ctx.restore();

  // Sharp double rim border
  ctx.strokeStyle = borderHex;
  ctx.lineWidth = 6;
  ctx.strokeRect(18, 12, w - 36, h - 28);

  // Bold arcade typography
  ctx.fillStyle = textHex;
  ctx.font = '900 40px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, w / 2, (h - 4) / 2);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * True Double Dragon Tag-Team Village Street Brawl Engine:
 * - 5 Distinct Fighting Styles (Bollywood Hero, Kushti Pehelwan, Kalaripayattu, Street Boxer, Weapon Master)
 * - Tag-In Switch Ambush attacks & Co-op Partner Revive
 * - Funny Village Cousins + Chappal Chacha (Flying Slippers) + Raju Splendor (Motorbike) + Boss Bade Tau
 * - Smashable clay pots -> Bamboo Lathi, Folding Steel Chair, Hot Chai, Throwable Stools & Coconuts
 * - Passing 3D Yellow-and-Green Auto-Rickshaw Hazard
 * - Comic Bollywood Popups (DHISHUM!, THAPPAD!, BONK!) + Live Procedural Village Dhol Beat
 */
export class StreetBrawlEngine {
  public paused = false;
  public phase: MatchPhase = 'ROUND_INTRO';

  private elapsed = 0;
  private phaseTimer = 0;
  private hitstopTimer = 0;
  private shakeIntensity = 0;

  private heroes: [HeroRuntime, HeroRuntime];
  private activeHeroIndex: 0 | 1 = 0;
  private enemies: EnemyRuntime[] = [];
  private nextEnemyUid = 1;

  // Zone & belt-scrolling state
  private currentZoneIdx = 0;
  private wave2Spawned = false;
  private zoneCleared = false;
  private lockedMinX = STREET_ZONES[0].lockMinX;
  private lockedMaxX = STREET_ZONES[0].lockMaxX;
  private cameraX = 0.5;
  private cameraVelX = 0;
  private cameraLeadZ = -0.35;
  private cameraLookAt = new THREE.Vector3(0.5, 0.58, -0.45);

  // Endless Mohalla & Style Rank Scorecard Telemetry
  private endlessMode: boolean;
  private endlessWave = 1;
  private endlessBestWave = 0;
  private runElapsedSec = 0;
  private cousinsRickshawed = 0;
  private finishersLanded = 0;
  private scorecard: BrawlScorecard | null = null;

  // Dramatic Framing: Boss Intro Zoom, Zone Final KO Slow-Mo, Finisher Punch-In & Tag High-Five
  private bossIntroTimer = 0;
  private bossIntroTargetUid: number | null = null;
  private bossIntroBanner: { name: string; subtitle: string } | null = null;
  private slowMoTimer = 0;
  private slowMoFocusX = 0;
  private slowMoFocusZ = 0;
  private finisherZoomTimer = 0;
  private finisherZoomX = 0;
  private finisherZoomZ = 0;
  private finisherTargetUid: number | null = null;
  private highFiveTimer = 0;
  private highFiveChimePlayed = false;

  // Enemy Cooperative Rear-Grab State
  private grabbedByEnemyUid: number | null = null;
  private grabEscapeProgress = 0;
  private grabHoldTimer = 0;
  private grabGlobalCooldown = 5.5;

  // Bade Tau Phase 2 ("Moustache Rage") & Ground-Pound Shockwave Ring
  private bossPhase2Triggered = false;
  private bossShockwaveCooldown = 3.2;
  private shockwaveActive = false;
  private shockwaveX = 0;
  private shockwaveZ = 0;
  private shockwaveRadius = 0;
  private shockwaveHitHeroMask = 0;

  // Partner Revive, Tag-Switch & Assist Cooldowns
  private partnerReviveProgress = 0;
  private switchCooldown = 0;
  private assistCooldown = 0;
  private zAlignedTargetUid: number | null = null;
  private zAlignRing: THREE.Mesh;
  private zAlignRingMat: THREE.MeshBasicMaterial;

  // Crowd Hype Drops & Between-Zone Village Boons
  private noKnockdownCombo = 0;
  private crowdHypeTier = 0;
  private pendingBoons: VillageBoonCard[] | null = null;
  private activeBoons: Set<VillageBoonId> = new Set();

  // Auto-Rickshaw periodic hazard
  private rickshawCooldown = 14.5;
  private rickshawWarnTimer = 0;
  private rickshawHitUids = new Set<number>();

  // Pooled 3D Projectiles (flying chappals, thrown stools, thrown coconuts)
  private projectiles: ProjectileRuntime[] = [];
  private projGeos: THREE.BufferGeometry[] = [];
  private projMats: THREE.Material[] = [];

  // Comic Bollywood Hit Popups
  private popups: PopupRuntime[] = [];
  private nextPopupId = 1;
  private _projVec = new THREE.Vector3();

  // Scoring & HUD feedback
  private score = 0;
  private totalDefeated = 0;
  private lastHitEnemyUid: number | null = null;
  private announcement = 'ZONE 1';
  private subAnnouncement = 'CHAI CHOWK';
  private switchBanner = '';
  private switchSeq = 0;
  private switchBannerTimer = 0;
  private pickupToast = '';
  private pickupSeq = 0;
  private pickupToastTimer = 0;
  private rageFlashSide: 1 | 2 | null = null;
  private rageFlashTimer = 0;
  private speechBubble: SpeechBubbleState | null = null;
  private speechTimer = 0;
  private comedyTimer: string | null = null;
  // Saf's bear hug: the victim is carried in his arms and squeezed like a squeaky toy
  private hugVictimUid: number | null = null;
  private hugSquash = 0;
  private hugPos = { x: 0, y: 0, z: 0 };

  private stats: MatchStats = {
    p1MaxCombo: 0,
    p2MaxCombo: 0,
    p1DamageDealt: 0,
    p2DamageDealt: 0,
    p1PerfectRounds: 0,
    p2PerfectRounds: 0,
    winnerSide: null,
  };

  private powerupDirector: PowerupDirector;
  private particles: Particle[] = [];
  private particleMesh: THREE.InstancedMesh;
  private particleGeo: THREE.BufferGeometry;
  private particleMat: THREE.MeshBasicMaterial;
  private dummy = new THREE.Object3D();
  private ringGeos: THREE.BufferGeometry[] = [];
  private ringMats: THREE.Material[] = [];
  private ringTexs: THREE.Texture[] = [];

  // Unmistakable 3D active-character identification markers (zero per-frame allocations)
  private activeOverheadGroup: THREE.Group;
  private activeOverheadArrow: THREE.Mesh;
  private activeOuterRing: THREE.Mesh;
  private activeFacingArrow: THREE.Mesh;
  private partnerOverheadSprite: THREE.Sprite;
  private partnerAiMat: THREE.SpriteMaterial;
  private partnerReviveMat: THREE.SpriteMaterial;
  private activeTagPopTimer = 0;

  private difficultyScale: number;
  private isMobile = false;

  constructor(
    private scene: THREE.Scene,
    private camera: THREE.PerspectiveCamera,
    private stage: StreetStageHandle,
    hero1Profile: FighterProfile,
    hero2Profile: FighterProfile,
    hero1Rig: ArticulatedFighterRig,
    hero2Rig: ArticulatedFighterRig,
    difficulty: Difficulty,
    private onMatchFinish?: (winnerSide: 1 | 2) => void,
    endlessMode = false,
    isMobile = false
  ) {
    this.isMobile = isMobile;
    this.endlessMode = endlessMode;
    this.endlessBestWave = loadArcadeRecords().endlessBestWave;
    this.difficultyScale = difficulty === 'novice' ? 0.82 : difficulty === 'grandmaster' ? 1.25 : 1.0;
    this.powerupDirector = new PowerupDirector(scene);

    // Pre-allocated particle pool (zero GC in render loop)
    this.particleGeo = new THREE.DodecahedronGeometry(0.11, 0);
    this.particleMat = new THREE.MeshBasicMaterial({ color: '#FBBF24' });
    this.particleMesh = new THREE.InstancedMesh(this.particleGeo, this.particleMat, PARTICLE_POOL_SIZE);
    this.particleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.particleMesh.frustumCulled = false;
    for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
      this.particles.push({
        active: false,
        x: 0,
        y: -50,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 0.4,
        scale: 1,
      });
      this.dummy.position.set(0, -50, 0);
      this.dummy.scale.setScalar(0.001);
      this.dummy.updateMatrix();
      this.particleMesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.scene.add(this.particleMesh);

    this.initProjectilePool();

    // Soft ground-ring alignment indicator when active hero is lined up on the same Z-plane as a cousin
    const zAlignGeo = new THREE.RingGeometry(0.68, 0.92, 24);
    this.zAlignRingMat = new THREE.MeshBasicMaterial({
      color: '#4ADE80',
      transparent: true,
      opacity: 0.72,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.ringGeos.push(zAlignGeo);
    this.ringMats.push(this.zAlignRingMat);
    this.zAlignRing = new THREE.Mesh(zAlignGeo, this.zAlignRingMat);
    this.zAlignRing.rotation.x = -Math.PI / 2;
    this.zAlignRing.position.y = 0.036;
    this.zAlignRing.visible = false;
    this.scene.add(this.zAlignRing);

    // High-visibility active-character 3D overhead P1 · YOU badge + bobbing gold downward chevron
    this.activeOverheadGroup = new THREE.Group();
    const p1BadgeTex = createOverheadBadgeTexture('P1 · YOU', '#FACC15', '#FFFFFF', '#141210');
    this.ringTexs.push(p1BadgeTex);
    const p1SpriteMat = new THREE.SpriteMaterial({
      map: p1BadgeTex,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    this.ringMats.push(p1SpriteMat);
    const p1Sprite = new THREE.Sprite(p1SpriteMat);
    p1Sprite.scale.set(1.08, 0.4, 1);
    p1Sprite.position.y = 0.28;
    p1Sprite.renderOrder = 26;
    this.activeOverheadGroup.add(p1Sprite);

    const arrowGeo = new THREE.ConeGeometry(0.115, 0.22, 4);
    const arrowMat = new THREE.MeshBasicMaterial({
      color: '#FDE047',
      depthTest: false,
      depthWrite: false,
    });
    this.ringGeos.push(arrowGeo);
    this.ringMats.push(arrowMat);
    this.activeOverheadArrow = new THREE.Mesh(arrowGeo, arrowMat);
    this.activeOverheadArrow.rotation.x = Math.PI; // point straight down at active fighter's crown
    this.activeOverheadArrow.position.y = 0.0;
    this.activeOverheadArrow.renderOrder = 25;
    this.activeOverheadGroup.add(this.activeOverheadArrow);
    this.scene.add(this.activeOverheadGroup);

    // Compact overhead tag for AI Partner (`AI` normally, green `REVIVE!` when downed)
    const aiBadgeTex = createOverheadBadgeTexture('AI', 'rgba(15, 23, 42, 0.85)', '#38BDF8', '#BAE6FD');
    const reviveBadgeTex = createOverheadBadgeTexture('REVIVE!', '#16A34A', '#DCFCE7', '#FFFFFF');
    this.ringTexs.push(aiBadgeTex, reviveBadgeTex);
    this.partnerAiMat = new THREE.SpriteMaterial({
      map: aiBadgeTex,
      transparent: true,
      opacity: 0.78,
      depthTest: false,
      depthWrite: false,
    });
    this.partnerReviveMat = new THREE.SpriteMaterial({
      map: reviveBadgeTex,
      transparent: true,
      opacity: 0.96,
      depthTest: false,
      depthWrite: false,
    });
    this.ringMats.push(this.partnerAiMat, this.partnerReviveMat);
    this.partnerOverheadSprite = new THREE.Sprite(this.partnerAiMat);
    this.partnerOverheadSprite.scale.set(0.56, 0.22, 1);
    this.partnerOverheadSprite.renderOrder = 22;
    this.scene.add(this.partnerOverheadSprite);

    // Bright rotating outer golden ground halo + directional facing chevron beneath the active fighter
    const outerHaloGeo = new THREE.RingGeometry(0.86, 0.96, 32);
    const outerHaloMat = new THREE.MeshBasicMaterial({
      color: '#FDE047',
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.ringGeos.push(outerHaloGeo);
    this.ringMats.push(outerHaloMat);
    this.activeOuterRing = new THREE.Mesh(outerHaloGeo, outerHaloMat);
    this.activeOuterRing.rotation.x = -Math.PI / 2;
    this.activeOuterRing.position.y = 0.034;
    this.scene.add(this.activeOuterRing);

    const facingArrowGeo = new THREE.ConeGeometry(0.18, 0.34, 3);
    facingArrowGeo.rotateX(Math.PI / 2); // lie flat on the street pointing along +Z
    const facingArrowMat = new THREE.MeshBasicMaterial({
      color: '#FACC15',
      transparent: true,
      opacity: 0.92,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.ringGeos.push(facingArrowGeo);
    this.ringMats.push(facingArrowMat);
    this.activeFacingArrow = new THREE.Mesh(facingArrowGeo, facingArrowMat);
    this.activeFacingArrow.position.y = 0.038;
    this.scene.add(this.activeFacingArrow);

    this.heroes = [
      this.createHeroRuntime(0, hero1Profile, hero1Rig, -2.2, 0.85),
      this.createHeroRuntime(1, hero2Profile, hero2Rig, -5.1, -1.25),
    ];

    this.restartMatch();
  }

  private initProjectilePool() {
    const chappalMat = new THREE.MeshStandardMaterial({ color: '#0284C7', roughness: 0.65 });
    const strapMat = new THREE.MeshStandardMaterial({ color: '#F8FAFC', roughness: 0.7 });
    const stoolMat = new THREE.MeshStandardMaterial({ color: '#EF4444', roughness: 0.42 });
    const cocoMat = new THREE.MeshStandardMaterial({ color: '#4D7C0F', roughness: 0.72 });
    this.projMats.push(chappalMat, strapMat, stoolMat, cocoMat);

    const soleGeo = new THREE.BoxGeometry(0.18, 0.04, 0.38);
    const strapGeo = new THREE.TorusGeometry(0.07, 0.018, 6, 10, Math.PI);
    const stoolGeo = new THREE.BoxGeometry(0.46, 0.36, 0.46);
    const cocoGeo = new THREE.SphereGeometry(0.24, 10, 8);
    this.projGeos.push(soleGeo, strapGeo, stoolGeo, cocoGeo);

    const specs: ('chappal' | 'stool' | 'coconut')[] = [
      'chappal',
      'chappal',
      'chappal',
      'stool',
      'stool',
      'coconut',
      'coconut',
    ];
    for (const kind of specs) {
      const g = new THREE.Group();
      if (kind === 'chappal') {
        const sole = new THREE.Mesh(soleGeo, chappalMat);
        const strap = new THREE.Mesh(strapGeo, strapMat);
        strap.position.set(0, 0.03, 0.04);
        g.add(sole, strap);
      } else if (kind === 'stool') {
        const m = new THREE.Mesh(stoolGeo, stoolMat);
        m.castShadow = true;
        g.add(m);
      } else {
        const m = new THREE.Mesh(cocoGeo, cocoMat);
        m.castShadow = true;
        g.add(m);
      }
      g.visible = false;
      this.scene.add(g);
      this.projectiles.push({
        active: false,
        kind,
        fromHero: false,
        ownerHeroIdx: 0,
        ownerEnemyUid: null,
        deflected: false,
        x: 0,
        y: -20,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        damage: 10,
        hitUids: new Set(),
        mesh: g,
      });
    }
  }

  private createHeroRuntime(
    index: 0 | 1,
    profile: FighterProfile,
    rig: ArticulatedFighterRig,
    x: number,
    z: number
  ): HeroRuntime {
    const weaponMeshes = buildHeroWeaponProps();
    rig.rightElbow.add(weaponMeshes.lathi);
    rig.rightElbow.add(weaponMeshes.chair);
    rig.rightElbow.add(weaponMeshes.stool);
    rig.rightElbow.add(weaponMeshes.coconut);

    const ringGeo = new THREE.RingGeometry(0.62, 0.84, 24);
    const ringMat = new THREE.MeshBasicMaterial({
      color: index === 0 ? '#F59E0B' : '#38BDF8',
      transparent: true,
      opacity: index === 0 ? 0.85 : 0.35,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.ringGeos.push(ringGeo);
    this.ringMats.push(ringMat);
    const activeRing = new THREE.Mesh(ringGeo, ringMat);
    activeRing.rotation.x = -Math.PI / 2;
    activeRing.position.y = 0.032;
    rig.root.add(activeRing);

    const maxHp = 135 + profile.stats.defense * 5;
    return {
      index,
      profile,
      style: resolveFighterStyle(profile),
      rig,
      x,
      y: 0,
      z,
      vx: 0,
      vy: 0,
      vz: 0,
      facing: 1,
      visualYaw: Math.PI * 0.4,
      landingSquashTimer: 0,
      hp: maxHp,
      maxHp,
      trailHp: maxHp,
      recoverableHp: 0,
      rage: 45,
      comboCount: 0,
      comboTimer: 0,
      action: 'idle',
      actionTime: 0,
      actionDuration: 0,
      hitIdsThisSwing: new Set(),
      lpChainStep: 0,
      lpChainWindow: 0,
      kickChainStep: 0,
      kickChainWindow: 0,
      bufferedAction: null,
      bufferTimer: 0,
      isSprinting: false,
      sprintDir: 0,
      sprintDustTimer: 0,
      aerialAttackUsed: false,
      isJumpSlamming: false,
      wasBlocking: false,
      blockStartElapsed: -10,
      clinchTargetUid: null,
      clinchTimer: 0,
      clinchKnees: 0,
      hitFlash: 0,
      invulnTimer: 0,
      superArmorTimer: 0,
      assistState: 'none',
      assistTimer: 0,
      assistReturnX: x,
      assistReturnZ: z,
      ridingBikeTimer: 0,
      bikeRamHitUids: new Set(),
      callout: '',
      calloutSeq: 0,
      heldWeapon: null,
      weaponMeshes,
      activeRing,
      activeRingMat: ringMat,
      aiThinkTimer: 0.25,
      powerupKind: getPowerupKindForFighter(profile.id),
      powerupOriginX: x,
      powerupOriginZ: z,
      powerupTargetId: null,
      powerupHitsMask: 0,
    };
  }

  public restartMatch() {
    this.clearEnemies();
    this.stage.resetProps();
    this.powerupDirector.hideAll();
    this.stage.rickshaw.active = false;
    this.stage.rickshaw.group.visible = false;

    for (const pr of this.projectiles) {
      pr.active = false;
      pr.mesh.visible = false;
    }

    this.activeHeroIndex = 0;
    this.currentZoneIdx = this.endlessMode ? 1 : 0;
    this.wave2Spawned = false;
    this.zoneCleared = false;
    this.lockedMinX = this.endlessMode ? 10.5 : STREET_ZONES[0].lockMinX;
    this.lockedMaxX = this.endlessMode ? 28.5 : STREET_ZONES[0].lockMaxX;
    this.cameraX = this.endlessMode ? 19.5 : 0.2;
    this.cameraVelX = 0;
    this.cameraLeadZ = -0.35;

    this.endlessWave = 1;
    this.endlessBestWave = loadArcadeRecords().endlessBestWave;
    this.runElapsedSec = 0;
    this.cousinsRickshawed = 0;
    this.finishersLanded = 0;
    this.scorecard = null;
    this.bossIntroTimer = 0;
    this.bossIntroTargetUid = null;
    this.bossIntroBanner = null;
    this.slowMoTimer = 0;
    this.finisherZoomTimer = 0;
    this.finisherTargetUid = null;
    this.highFiveTimer = 0;
    this.highFiveChimePlayed = false;
    this.grabbedByEnemyUid = null;
    this.grabEscapeProgress = 0;
    this.grabHoldTimer = 0;
    this.grabGlobalCooldown = 6.5;
    this.bossPhase2Triggered = false;
    this.bossShockwaveCooldown = 3.2;
    this.shockwaveActive = false;
    this.stage.setShockwaveRing(false, 0, 0, 1, 0);

    this.partnerReviveProgress = 0;
    this.switchCooldown = 0;
    this.assistCooldown = 0;
    this.noKnockdownCombo = 0;
    this.crowdHypeTier = 0;
    this.pendingBoons = null;
    this.activeBoons.clear();
    this.zAlignedTargetUid = null;
    this.zAlignRing.visible = false;
    this.rickshawCooldown = 14.0;
    this.rickshawWarnTimer = 0;
    this.rickshawHitUids.clear();
    this.popups = [];

    this.score = 0;
    this.totalDefeated = 0;
    this.lastHitEnemyUid = null;
    this.hitstopTimer = 0;
    this.shakeIntensity = 0;
    this.switchBanner = '';
    this.pickupToast = '';
    this.speechBubble = null;
    this.comedyTimer = null;
    this.speechTimer = 0;
    this.rageFlashSide = null;
    this.rageFlashTimer = 0;

    this.stats = {
      p1MaxCombo: 0,
      p2MaxCombo: 0,
      p1DamageDealt: 0,
      p2DamageDealt: 0,
      p1PerfectRounds: 0,
      p2PerfectRounds: 0,
      winnerSide: null,
    };

    const startBaseX = this.endlessMode ? 18.0 : -2.2;
    const starts: [number, number][] = [
      [startBaseX, 0.85],
      [startBaseX - 2.9, -1.25],
    ];
    this.heroes.forEach((h, i) => {
      h.x = starts[i][0];
      h.y = 0;
      h.z = starts[i][1];
      h.vx = 0;
      h.vy = 0;
      h.vz = 0;
      h.facing = 1;
      h.visualYaw = Math.PI * 0.4;
      h.landingSquashTimer = 0;
      h.hp = h.maxHp;
      h.trailHp = h.maxHp;
      h.recoverableHp = 0;
      h.rage = typeof window !== 'undefined' && window.location.search.includes('fullrage') ? 100 : 45; // ?fullrage: debug
      h.comboCount = 0;
      h.comboTimer = 0;
      h.action = 'idle';
      h.actionTime = 0;
      h.actionDuration = 0;
      h.bufferedAction = null;
      h.bufferTimer = 0;
      h.isSprinting = false;
      h.sprintDir = 0;
      h.sprintDustTimer = 0;
      h.aerialAttackUsed = false;
      h.isJumpSlamming = false;
      h.wasBlocking = false;
      h.blockStartElapsed = -10;
      h.clinchTargetUid = null;
      h.clinchTimer = 0;
      h.clinchKnees = 0;
      h.hitFlash = 0;
      h.invulnTimer = 0;
      h.superArmorTimer = 0;
      h.assistState = 'none';
      h.assistTimer = 0;
      h.ridingBikeTimer = 0;
      h.bikeRamHitUids.clear();
      h.callout = '';
      h.heldWeapon = null;
      this.syncHeroWeaponVisuals(h);
      h.powerupTargetId = null;
      h.powerupHitsMask = 0;
    });

    this.phase = 'ROUND_INTRO';
    this.phaseTimer = 1.35;
    if (this.endlessMode) {
      this.announcement = 'ENDLESS MOHALLA';
      this.subAnnouncement = 'WAVE 1 · SURVIVE THE COUSIN SWARM';
      this.spawnEndlessWave(1);
    } else {
      this.announcement = 'ZONE 1 · CHAI CHOWK';
      this.subAnnouncement = 'CLEAN OUT THE VILLAGE LANE';
      this.spawnWave(STREET_ZONES[0].wave1, STREET_ZONES[0]);
    }
    soundEngine.playRoundStart();
    soundEngine.setDholIntensity('normal');
    soundEngine.startDholLoop();
  }

  private spawnEndlessWave(waveNum: number) {
    const endlessZone: StreetZoneConfig = {
      index: 1,
      name: 'Endless Mohalla',
      lockMinX: this.lockedMinX,
      lockMaxX: this.lockedMaxX,
      triggerX: 0,
      wave1: [],
      wave2: [],
    };
    const pool = ['bunty', 'golu', 'tinku', 'pappu', 'lathi_lala', 'kalu_goon', 'chappal_chacha'];
    const count = Math.min(7, 2 + Math.floor(waveNum * 0.75));
    const keys: string[] = [];
    for (let i = 0; i < count; i++) {
      if (waveNum >= 2 && i === count - 1 && waveNum % 2 === 0) {
        keys.push('raju_bike');
      } else {
        const cap = Math.min(pool.length, 3 + waveNum);
        keys.push(pool[(waveNum * 3 + i * 2) % cap]);
      }
    }
    if (waveNum % 4 === 0) {
      keys.push('bade_tau');
    } else if (waveNum % 3 === 0) {
      keys.push('moti_pehelwan');
    }
    this.spawnWave(keys, endlessZone, 1 + (waveNum - 1) * 0.08);
  }

  private syncHeroWeaponVisuals(h: HeroRuntime) {
    const k = h.heldWeapon?.kind;
    h.weaponMeshes.lathi.visible = k === 'lathi';
    h.weaponMeshes.chair.visible = k === 'chair';
    h.weaponMeshes.stool.visible = k === 'stool';
    h.weaponMeshes.coconut.visible = k === 'coconut';
  }

  private clearEnemies() {
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

  private spawnWave(keys: string[], zone: StreetZoneConfig, waveScale = 1) {
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

  private getActiveHero(): HeroRuntime {
    return this.heroes[this.activeHeroIndex];
  }

  private getPartnerHero(): HeroRuntime {
    return this.heroes[this.activeHeroIndex === 0 ? 1 : 0];
  }

  /**
   * Instant Double Dragon Tag-In Switch!
   * When an enemy is nearby, the incoming hero executes a flying TAG AMBUSH kick/barge!
   */
  private performHeroSwitch(autoBecauseKO = false) {
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
      this.switchBanner = `TAG AMBUSH · ${nextHero.profile.name.toUpperCase()}!`;
    } else {
      this.switchBanner = autoBecauseKO
        ? `${nextHero.profile.name.toUpperCase()} STEPS IN!`
        : `SWITCHED TO ${nextHero.profile.name.toUpperCase()}`;
    }
    this.switchBannerTimer = 1.45;
  }

  /**
   * Hold SWITCH (0.3s): Calls off-screen/partner fighter to dash in from screen edge,
   * execute a drive-by signature assist attack, and dash back out to extend combo juggles!
   */
  private performPartnerAssist() {
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

  /**
   * Risk-Reward "Green Health" Panic Special:
   * Grants brief i-frames + 360° crowd-clearing knockback, converting 15% of current HP into
   * glowing green recoverable HP that heals back as you land JAB/HOOK hits!
   */
  private performPanicSpecial(hero: HeroRuntime) {
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

  /** Between-Zone Village Boon Card selection called from CombatHud / ArenaCanvas */
  public selectVillageBoon(boonId: VillageBoonId) {
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

  private hasBoon(id: VillageBoonId): boolean {
    return this.activeBoons.has(id);
  }

  private checkCrowdHypeDrops(active: HeroRuntime) {
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

  private spawnComicPopup(wx: number, wy: number, wz: number, text: string, color: string) {
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

  public step(rawDt: number, p1Input: PlayerInputState, _p2Input: PlayerInputState) {
    if (this.paused) return;
    const realDt = Math.min(0.05, Math.max(0.001, rawDt));

    // Crisp 0.5s Slow-Motion Zoom on final knockout hit of each zone!
    let timeScale = 1.0;
    if (this.slowMoTimer > 0) {
      this.slowMoTimer = Math.max(0, this.slowMoTimer - realDt);
      timeScale = 0.25;
    }
    if (this.finisherZoomTimer > 0) {
      this.finisherZoomTimer = Math.max(0, this.finisherZoomTimer - realDt);
    }

    const dt = realDt * timeScale;
    this.elapsed += dt;

    // Decay HUD banners & comic popups
    if (this.switchBannerTimer > 0) {
      this.switchBannerTimer -= realDt;
      if (this.switchBannerTimer <= 0) this.switchBanner = '';
    }
    if (this.pickupToastTimer > 0) {
      this.pickupToastTimer -= realDt;
      if (this.pickupToastTimer <= 0) this.pickupToast = '';
    }
    if (this.rageFlashTimer > 0) {
      this.rageFlashTimer -= realDt;
      if (this.rageFlashTimer <= 0) this.rageFlashSide = null;
    }
    if (this.speechTimer > 0) {
      this.speechTimer -= realDt;
      if (this.speechTimer <= 0) this.speechBubble = null;
    }
    for (let i = this.popups.length - 1; i >= 0; i--) {
      this.popups[i].life -= realDt;
      this.popups[i].yPct -= realDt * 9.5;
      if (this.popups[i].life <= 0) this.popups.splice(i, 1);
    }

    const activeForStage = this.getActiveHero();
    const lightingOverride = this.endlessMode ? Math.floor((this.endlessWave - 1) / 3) % 3 : undefined;
    // Update scrolling village street stage, 3-zone dusk lighting, parallax & roadside sheep
    this.stage.update(this.elapsed, dt, this.cameraX, activeForStage.comboCount, lightingOverride);
    this.updateParticles(dt);

    // Hitstop freeze for crunchy arcade impact feel
    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= realDt;
      this.updateCamera(realDt);
      this.renderAllRigs(realDt);
      return;
    }

    // Dramatic 1.2s Boss Intro Zoom when Bade Tau appears!
    if (this.bossIntroTimer > 0) {
      this.bossIntroTimer = Math.max(0, this.bossIntroTimer - realDt);
      if (this.bossIntroTimer <= 0) {
        this.bossIntroBanner = null;
        this.bossIntroTargetUid = null;
      }
      this.updateCamera(realDt);
      this.renderAllRigs(realDt);
      return;
    }

    if (this.phase === 'ROUND_INTRO') {
      this.phaseTimer -= realDt;
      if (this.phaseTimer <= 0) {
        this.phase = 'FIGHTING';
        this.announcement = '';
        this.subAnnouncement = '';
      }
      this.updateCamera(realDt);
      this.renderAllRigs(realDt);
      return;
    }

    if (this.phase === 'MATCH_OVER') {
      soundEngine.stopDholLoop();
      this.updateCamera(realDt);
      this.renderAllRigs(realDt);
      return;
    }

    // Pause combat cleanly while player picks a Between-Zone Village Boon Card!
    if (this.pendingBoons) {
      this.updateCamera(realDt);
      this.renderAllRigs(realDt);
      return;
    }

    this.runElapsedSec += dt;

    // Zone-Clear Tag-Team High-Five Celebration!
    if (this.highFiveTimer > 0) {
      this.stepTagHighFive(realDt);
      this.updateCamera(realDt);
      this.renderAllRigs(realDt);
      return;
    }

    if (this.switchCooldown > 0) {
      this.switchCooldown = Math.max(0, this.switchCooldown - dt);
    }
    if (this.assistCooldown > 0) {
      this.assistCooldown = Math.max(0, this.assistCooldown - dt);
    }
    if (this.grabGlobalCooldown > 0) {
      this.grabGlobalCooldown = Math.max(0, this.grabGlobalCooldown - dt);
    }

    const active = this.getActiveHero();
    const partner = this.getPartnerHero();

    // Handle SWITCH: if grabbed in a rear hold, partner dashes in with an instant RESCUE DROPKICK!
    if (p1Input.switchPressed) {
      p1Input.switchPressed = false;
      if (this.grabbedByEnemyUid !== null && partner.hp > 0) {
        this.triggerPartnerRescueDropkick(active, partner);
      } else {
        this.performHeroSwitch(false);
      }
    }
    if (p1Input.assistPressed) {
      p1Input.assistPressed = false;
      this.performPartnerAssist();
    }

    // Update dynamic Dhol tempo intensity based on Boss Bade Tau, Crowd Hype, or 5+ hit combo
    const bossAlive = this.enemies.some((e) => e.alive && e.spec.archetype === 'boss');
    if (bossAlive) soundEngine.setDholIntensity('boss');
    else if (active.comboCount >= 5 || this.crowdHypeTier >= 10) soundEngine.setDholIntensity('hype');
    else soundEngine.setDholIntensity('normal');

    // Startle the scenic roadside village sheep with a playful "Baaa!" when brawls pass near it
    if (this.enemies.some((e) => e.alive) && this.stage.reactSheepToBrawl(active.x, active.z)) {
      soundEngine.playSheepBaa();
    }

    this.updateHeroWithInput(active, p1Input, dt);
    this.updatePartnerHeroAI(partner, active, dt);
    this.enforceHeroSeparation(active, partner, dt);
    this.updatePartnerRevive(active, partner, p1Input, dt);

    // Update idling Raju Splendor motorbike countdown (8s window to mount!)
    if (this.stage.splendorBike.state === 'idle') {
      this.stage.splendorBike.idleTimer = Math.max(0, this.stage.splendorBike.idleTimer - dt);
      if (this.stage.splendorBike.idleTimer <= 0) {
        this.stage.splendorBike.state = 'hidden';
      }
    }

    // Check pickups & interactive scenic props (rolling fruit & stray street cricket balls!)
    this.checkHeroPickups(active);
    if (partner.hp > 0) this.checkHeroPickups(partner);
    this.updateInteractiveProps(active, dt);

    // Step Bade Tau Phase 2 Ground-Pound Shockwave Ring!
    this.updateBossShockwave(dt);

    // Step flying projectiles (Chappal slippers, thrown stools & coconuts)
    this.updateProjectiles(dt);

    // Step passing 3D Yellow-and-Green Auto-Rickshaw hazard
    this.updateAutoRickshaw(dt);

    // Step all village cousins / thugs / bikers / chappal chacha / boss
    this.updateEnemies(dt);

    // Check zone wave progression, Endless Mohalla waves & Double Dragon GO >> unlock
    this.updateZoneProgression();

    // Check squad defeat / auto-switch if active hero falls
    if (active.hp <= 0) {
      this.releaseRearGrab();
      if (partner.hp > 0) {
        this.performHeroSwitch(true);
      } else {
        this.finishRun(false);
      }
    }

    this.updateCamera(realDt);
    this.renderAllRigs(realDt);
  }

  private computeScorecard(victory: boolean): BrawlScorecard {
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

  private finishRun(victory: boolean) {
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

  private stepTagHighFive(dt: number) {
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

  private releaseRearGrab() {
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

  private triggerPartnerRescueDropkick(active: HeroRuntime, partner: HeroRuntime) {
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

  private executeSignatureFinisher(hero: HeroRuntime, target: EnemyRuntime) {
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

  private updateInteractiveProps(active: HeroRuntime, _dt: number) {
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

  private updateBossShockwave(dt: number) {
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

  private updatePartnerRevive(
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

  private isPowerupAction(a: CombatAction): boolean {
    return (
      a === 'rage_art' ||
      a === 'powerup_fady' ||
      a === 'powerup_saf' ||
      a === 'powerup_jav' ||
      a === 'powerup_jam' ||
      a === 'powerup_chet' ||
      a === 'powerup_immy'
    );
  }

  private throwHeldProp(hero: HeroRuntime) {
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

  private releaseClinch(hero: HeroRuntime) {
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

  private performDodgeSidestep(hero: HeroRuntime, inp: PlayerInputState) {
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

  private triggerJumpGroundSlamImpact(hero: HeroRuntime) {
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

  private startClinch(hero: HeroRuntime, target: EnemyRuntime) {
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

  private hurlClinchedEnemy(hero: HeroRuntime, target: EnemyRuntime, throwDir: 1 | -1) {
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

  private updateHeroWithInput(hero: HeroRuntime, inp: PlayerInputState, dt: number) {
    if (hero.hp <= 0) {
      this.releaseClinch(hero);
      hero.action = 'ko';
      return;
    }

    hero.trailHp = THREE.MathUtils.damp(hero.trailHp, hero.hp, 4.5, dt);
    hero.hitFlash = Math.max(0, hero.hitFlash - dt * 5);
    hero.invulnTimer = Math.max(0, hero.invulnTimer - dt);
    hero.superArmorTimer = Math.max(0, hero.superArmorTimer - dt);
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
      if (remaining <= 0.14 && hero.action !== 'hitstun' && hero.action !== 'knockdown') {
        if (wantLp) {
          hero.bufferedAction = 'lp';
          hero.bufferTimer = 0.14;
        } else if (wantRp) {
          hero.bufferedAction = 'rp';
          hero.bufferTimer = 0.14;
        } else if (wantKick) {
          hero.bufferedAction = 'kick';
          hero.bufferTimer = 0.14;
        } else if (wantThrow) {
          hero.bufferedAction = 'throw';
          hero.bufferTimer = 0.14;
        } else if (wantJump) {
          hero.bufferedAction = 'jump';
          hero.bufferTimer = 0.14;
        } else if (wantSidestep) {
          hero.bufferedAction = 'dodge';
          hero.bufferTimer = 0.14;
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
      hero.style === 'kalari_kicker' ? 0.72 : hero.style === 'kung_fu_master' ? 0.6 : hero.style === 'street_boxer' ? 0.42 : 0;
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

  private executeHeroCombatInput(
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

  private updatePartnerHeroAI(partner: HeroRuntime, leader: HeroRuntime, dt: number) {
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

  /**
   * Prefer an enemy that the active hero isn't already crowding, so tag partners
   * naturally split aggro across the street instead of stacking on the same cousin.
   */
  private findPartnerTarget(partner: HeroRuntime, leader: HeroRuntime): EnemyRuntime | null {
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

  /**
   * Continuous elliptical personal-space separation between active hero & AI partner.
   * Gently and briskly slides the AI partner out of the player's bubble (without hijacking player controls),
   * while allowing close proximity when the partner is downed so the player can revive them.
   */
  private enforceHeroSeparation(active: HeroRuntime, partner: HeroRuntime, dt: number) {
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

  private clampHeroPosition(hero: HeroRuntime) {
    const minX = this.lockedMinX + 0.5;
    const maxX = this.zoneCleared ? 44.5 : this.lockedMaxX - 0.5;
    hero.x = THREE.MathUtils.clamp(hero.x, minX, maxX);
    hero.z = THREE.MathUtils.clamp(hero.z, LANE_MIN_Z, LANE_MAX_Z);
  }

  private startHeroMove(hero: HeroRuntime, move: CombatAction) {
    const spec = HERO_MOVES[move];
    if (!spec) return;
    hero.action = move;
    hero.actionTime = 0;
    const boxerBoost =
      (hero.style === 'street_boxer' && (move === 'lp' || move === 'lp2')) ||
      (hero.style === 'kung_fu_master' && (move === 'lp' || move === 'lp2' || move === 'rp'))
        ? 0.78
        : 1.0;
    const dholBoost = this.hasBoon('double_dhol') ? 0.85 : 1.0;
    hero.actionDuration = spec.duration * boxerBoost * dholBoost;
    hero.hitIdsThisSwing.clear();
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

  private startHeroPowerup(hero: HeroRuntime) {
    hero.rage = 0;
    hero.invulnTimer = 2.6;
    hero.actionTime = 0;
    hero.powerupOriginX = hero.x;
    hero.powerupOriginZ = hero.z;
    hero.powerupHitsMask = 0;

    const nearest = this.findNearestLivingEnemy(hero.x, hero.z);
    hero.powerupTargetId = nearest ? nearest.uid : null;
    if (nearest) {
      hero.facing = nearest.x >= hero.x ? 1 : -1;
    }

    this.rageFlashSide = hero.index === 0 ? 1 : 2;
    this.rageFlashTimer = 0.7;
    soundEngine.playRageActivate();

    switch (hero.powerupKind) {
      case 'fady_smoke':
        hero.action = 'powerup_fady';
        hero.actionDuration = 6.2;
        hero.invulnTimer = 6.4;
        hero.callout = "I'LL BE 2 MINS BRO!";
        this.speechBubble = {
          side: hero.index === 0 ? 1 : 2,
          speaker: hero.profile.name,
          text: 'Two mins bro.',
        };
        this.speechTimer = 1.5;
        this.comedyTimer = null;
        break;
      case 'saf_hug':
        hero.action = 'powerup_saf';
        hero.actionDuration = 6.4;
        hero.invulnTimer = 6.6;
        hero.callout = 'GYM BRO HUG!';
        this.hugVictimUid = null;
        this.hugSquash = 0;
        this.speechBubble = {
          side: hero.index === 0 ? 1 : 2,
          speaker: hero.profile.name,
          text: 'Bro. Watch this.',
        };
        this.speechTimer = 1.0;
        break;
      case 'jav_story':
        hero.action = 'powerup_jav';
        hero.actionDuration = 2.7;
        hero.callout = 'STORYTIME MEGA SLAP!';
        this.speechBubble = {
          side: hero.index === 0 ? 1 : 2,
          speaker: hero.profile.name,
          text: 'Listen cousin, let me tell you a quick story...',
        };
        this.speechTimer = 2.1;
        break;
      case 'jam_snooker':
        hero.action = 'powerup_jam';
        hero.actionDuration = 2.7;
        hero.callout = 'SNOOKER CUE BEATDOWN!';
        break;
      case 'chet_ford':
        hero.action = 'powerup_chet';
        hero.actionDuration = 2.45;
        hero.callout = 'RED FORD RUNOVER!';
        soundEngine.playCarHorn();
        break;
      case 'immy_girls':
        hero.action = 'powerup_immy';
        hero.actionDuration = 2.85;
        hero.callout = 'SQUAD FAN CLUB RUSH!';
        soundEngine.playCheerPop();
        break;
      default:
        hero.action = 'rage_art';
        hero.actionDuration = 1.4;
        hero.callout = hero.profile.specialMoveName.toUpperCase();
        break;
    }
    hero.calloutSeq++;
  }

  private stepHeroPowerup(hero: HeroRuntime, dt: number) {
    hero.actionTime += dt;
    const phase = Math.min(1, hero.actionTime / Math.max(0.01, hero.actionDuration));

    const target =
      this.enemies.find((e) => e.uid === hero.powerupTargetId && e.alive) ??
      this.findNearestLivingEnemy(hero.x, hero.z);

    const tx = target ? target.x : hero.x + hero.facing * 2.8;
    const tz = target ? target.z : hero.z;

    if (hero.powerupKind === 'fady_smoke') {
      this.powerupDirector.updateFadySmoke(
        phase,
        hero.x,
        hero.z,
        hero.facing,
        hero.powerupOriginX,
        hero.powerupOriginZ,
        this.elapsed,
        tx,
        tz
      );
      const side = hero.index === 0 ? 1 : 2;
      const otherSide = side === 1 ? 2 : 1;
      // Comic countdown: races down from 2:00, stalls on 0:01, then he adds ten more minutes
      if (phase >= 0.1 && phase < 0.8) {
        const t = Math.min(1, (phase - 0.1) / 0.56);
        const fmt = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
        if (t < 0.5) this.comedyTimer = fmt(Math.max(3, Math.round(120 - 117 * (t / 0.5))));
        else if (t < 0.62) this.comedyTimer = '0:03';
        else if (t < 0.72) this.comedyTimer = '0:02';
        else if (t < 0.88) this.comedyTimer = '0:01';
        else this.comedyTimer = '+10:00';
      } else {
        this.comedyTimer = null;
      }
      if (phase > 0.12 && (hero.powerupHitsMask & 1) === 0) {
        hero.powerupHitsMask |= 1;
        soundEngine.playSmokePuff();
      }
      if (phase > 0.3 && (hero.powerupHitsMask & 4) === 0) {
        hero.powerupHitsMask |= 4;
        this.speechBubble = { side: otherSide, speaker: 'Cousin', text: "Bhai it's been 20 minutes!" };
        this.speechTimer = 1.6;
      }
      if (phase > 0.5 && (hero.powerupHitsMask & 8) === 0) {
        hero.powerupHitsMask |= 8;
        this.speechBubble = { side, speaker: hero.profile.name, text: 'Nearly there bro. Two more mins.' };
        this.speechTimer = 1.6;
      }
      if (phase > 0.7 && (hero.powerupHitsMask & 16) === 0) {
        hero.powerupHitsMask |= 16;
        this.speechBubble = { side, speaker: hero.profile.name, text: 'Right. Where were we?' };
        this.speechTimer = 1.1;
      }
      if (phase > 0.86 && (hero.powerupHitsMask & 2) === 0) {
        hero.powerupHitsMask |= 2;
        this.spawnParticles(tx, 0.8, tz, 26, 5);
        this.dealPowerupAoeDamage(hero, tx, tz, 4.4, 60, true, 'KHALLAS!');
      }
    } else if (hero.powerupKind === 'saf_hug') {
      const side = hero.index === 0 ? 1 : 2;
      const otherSide = side === 1 ? 2 : 1;
      const say = (s: 1 | 2, speaker: string, text: string, secs: number) => {
        this.speechBubble = { side: s, speaker, text };
        this.speechTimer = secs;
      };
      const once = (bit: number, at: number, fn: () => void) => {
        if (phase > at && (hero.powerupHitsMask & bit) === 0) {
          hero.powerupHitsMask |= bit;
          fn();
        }
      };
      // Flex show: poses, sparkles, cousin heckling, shirt rips off
      once(2, 0.11, () => {
        soundEngine.playCheerPop();
        this.spawnParticles(hero.x, 1.2, hero.z, 22, 4);
        this.spawnComicPopup(hero.x, 2.15, hero.z, 'SHIRT: GONE!', '#F59E0B');
        say(otherSide, 'Cousin', 'BHAI PUT YOUR SHIRT ON!!', 1.5);
      });
      once(1, 0.16, () => {
        soundEngine.playCheerPop();
        this.spawnComicPopup(hero.x, 2.15, hero.z, 'SIX PACK!', '#FDE047');
      });
      once(32, 0.25, () => say(otherSide, 'Cousin', 'Bro, where did the belly go?', 1.5));
      once(4, 0.34, () => say(side, hero.profile.name, 'Come give me a hug bro.', 1.4));
      once(8, 0.42, () => this.spawnComicPopup(hero.x, 2.15, hero.z, 'HUG TIME!', '#F472B6'));
      once(512, 0.47, () => say(side, hero.profile.name, "WHERE'S CHETZY BABY?!", 1.7));
      // Charge in, closing the gap exactly by the time the hug starts
      if (target && phase >= 0.46 && phase < 0.6) {
        const k = Math.min(1, dt / Math.max(0.05, (0.6 - phase) * hero.actionDuration));
        hero.x += (target.x - hero.facing * 0.62 - hero.x) * k;
        hero.z += (target.z - hero.z) * k;
      }
      // The grab: victim is lifted into Saf's arms and squeezed like a squeaky toy
      if (target && phase >= 0.6 && phase < 0.9) {
        this.hugVictimUid = target.uid;
        const u = (phase - 0.6) / 0.3;
        this.hugSquash = Math.abs(Math.sin(u * Math.PI * 3));
        this.hugPos.x = hero.x + hero.facing * 0.6;
        this.hugPos.z = hero.z;
        this.hugPos.y = 0.3 + this.hugSquash * 0.08;
        target.x = this.hugPos.x;
        target.z = this.hugPos.z;
        target.y = this.hugPos.y;
        target.vx = 0;
        target.vz = 0;
        target.vy = 0;
        target.facing = (-hero.facing) as 1 | -1;
      } else {
        this.hugVictimUid = null;
        this.hugSquash = 0;
      }
      once(16, 0.65, () => {
        soundEngine.playSqueak(1.0);
        this.dealPowerupAoeDamage(hero, tx, tz, 1.8, 10, false, 'SQUEAK!');
      });
      once(1024, 0.73, () => say(otherSide, 'Cousin', "Bhai he's not a toy!", 1.3));
      once(64, 0.75, () => {
        soundEngine.playSqueak(1.25);
        this.dealPowerupAoeDamage(hero, tx, tz, 1.8, 10, false, 'SQUEAK!!');
      });
      once(128, 0.85, () => {
        soundEngine.playSqueak(1.55);
        this.dealPowerupAoeDamage(hero, tx, tz, 1.8, 14, false, 'SQUEEEAK!!!');
      });
      once(256, 0.9, () => {
        soundEngine.playSqueeze();
        this.dealPowerupAoeDamage(hero, tx, tz, 3.6, 34, true, 'DHISHUM!');
        say(side, hero.profile.name, '...sorry bro. Love you though.', 1.6);
      });
    } else if (hero.powerupKind === 'jav_story') {
      if (phase > 0.72 && (hero.powerupHitsMask & 1) === 0) {
        hero.powerupHitsMask |= 1;
        soundEngine.playSlap();
        this.dealPowerupAoeDamage(hero, tx, tz, 4.8, 65, true, 'MEGA THAPPAD!');
      }
    } else if (hero.powerupKind === 'jam_snooker') {
      this.powerupDirector.updateJamSnooker(phase, hero.x, hero.y, hero.z, hero.facing);
      if (phase > 0.16 && (hero.powerupHitsMask & 1) === 0) {
        hero.powerupHitsMask |= 1;
        soundEngine.playWoodWhack();
        this.dealPowerupAoeDamage(hero, hero.x + hero.facing * 1.4, hero.z, 3.6, 22, false, 'WHACK!');
      }
      if (phase > 0.36 && (hero.powerupHitsMask & 2) === 0) {
        hero.powerupHitsMask |= 2;
        soundEngine.playWoodWhack();
        this.dealPowerupAoeDamage(hero, hero.x + hero.facing * 1.4, hero.z, 3.8, 22, false, 'BONK!');
      }
      if (phase > 0.56 && (hero.powerupHitsMask & 4) === 0) {
        hero.powerupHitsMask |= 4;
        soundEngine.playWoodWhack();
        this.dealPowerupAoeDamage(hero, hero.x + hero.facing * 1.5, hero.z, 4.2, 28, true, 'DHISHUM!');
        this.speechBubble = {
          side: hero.index === 0 ? 1 : 2,
          speaker: hero.profile.name,
          text: 'you know what bro just drop me off home',
        };
        this.speechTimer = 2.4;
      }
    } else if (hero.powerupKind === 'chet_ford') {
      const car = this.powerupDirector.updateChetFord(phase, hero.powerupOriginX, tz, hero.facing);
      if (car.carActive) {
        for (let i = 0; i < this.enemies.length; i++) {
          const e = this.enemies[i];
          if (!e.alive) continue;
          const bit = 1 << (i % 24);
          if ((hero.powerupHitsMask & bit) === 0 && Math.abs(e.x - car.carX) < 1.95) {
            hero.powerupHitsMask |= bit;
            soundEngine.playCarCrash();
            this.damageEnemy(e, hero, 66, true, hero.facing * 3.5, 5.2, 'HONK HONK!');
          }
        }
      }
    } else if (hero.powerupKind === 'immy_girls') {
      this.powerupDirector.updateImmyGirls(phase, hero.x, hero.z, tx, tz, hero.facing, this.elapsed);
      if (phase > 0.65 && (hero.powerupHitsMask & 1) === 0) {
        hero.powerupHitsMask |= 1;
        this.dealPowerupAoeDamage(hero, tx, tz, 4.5, 32, false, 'OYE!');
      }
      if (phase > 0.8 && (hero.powerupHitsMask & 2) === 0) {
        hero.powerupHitsMask |= 2;
        this.dealPowerupAoeDamage(hero, tx, tz, 4.8, 38, true, 'DHISHUM!');
      }
    } else {
      if (phase > 0.42 && (hero.powerupHitsMask & 1) === 0) {
        hero.powerupHitsMask |= 1;
        this.dealPowerupAoeDamage(hero, hero.x + hero.facing * 1.5, hero.z, 4.8, 62, true, 'KHALLAS!');
      }
    }

    if (hero.actionTime >= hero.actionDuration) {
      hero.action = 'idle';
      hero.actionTime = 0;
      hero.actionDuration = 0;
      this.powerupDirector.hideAll();
      this.hugVictimUid = null;
      this.hugSquash = 0;
    }
  }

  private dealPowerupAoeDamage(
    hero: HeroRuntime,
    cx: number,
    cz: number,
    radius: number,
    dmg: number,
    launch: boolean,
    popupText: string
  ) {
    this.shakeIntensity = Math.max(this.shakeIntensity, 0.36);
    this.spawnParticles(cx, 1.15, cz, 22, 5.2);
    this.spawnComicPopup(cx, 1.95, cz, popupText, '#F59E0B');
    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      if (!e.alive) continue;
      const dist = Math.hypot(e.x - cx, (e.z - cz) * 1.2);
      if (dist <= radius) {
        const dir = e.x >= hero.x ? 1 : -1;
        this.damageEnemy(e, hero, dmg, launch, dir * (launch ? 2.8 : 1.0), launch ? 4.8 : 0);
      }
    }
  }

  private evaluateHeroAttackHits(hero: HeroRuntime) {
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
    const effectiveDmg = Math.round((spec.damage + bonusDmg) * (0.9 + hero.profile.stats.power * 0.03));

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

  private damageEnemy(
    e: EnemyRuntime,
    attacker: HeroRuntime | null,
    damage: number,
    heavy: boolean,
    knockbackVx: number,
    launchVy: number,
    popupText?: string
  ) {
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

  private checkHeroPickups(hero: HeroRuntime) {
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

  private spawnEnemyChappal(e: EnemyRuntime, target: HeroRuntime) {
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
    slot.vx = (dx / len) * 8.2;
    slot.vy = 0;
    slot.vz = (dz / len) * 2.2;
    slot.life = 1.9;
    slot.damage = e.spec.damage;
    slot.hitUids.clear();
    slot.mesh.position.set(slot.x, slot.y, slot.z);
    slot.mesh.visible = true;
    soundEngine.playWhoosh(1.4);
  }

  private updateProjectiles(dt: number) {
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

  private updateAutoRickshaw(dt: number) {
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

  private updateEnemies(dt: number) {
    const active = this.getActiveHero();
    const partner = this.getPartnerHero();

    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      if (e.removed) continue;

      e.hitFlash = Math.max(0, e.hitFlash - dt * 5);

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
          const sp = e.spec.speed * (isFastEnemy ? 1.04 : 0.96);
          e.x += (adx / aDist) * sp * dt;
          e.z += (adz / aDist) * (sp * 0.78) * dt;
          e.action = 'walk';
        } else {
          // Reached strike range: enter brief readable reaction delay before windup
          e.aiState = 'telegraph_pause';
          e.reactionTimer = isFastEnemy ? 0.18 : isHeavyEnemy ? 0.3 : 0.24;
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
  }

  private checkEnemyAttackHit(e: EnemyRuntime) {
    const reachX = e.spec.hasClub ? 2.15 : 1.68;
    const reachZ = 0.9;

    for (let h = 0; h < 2; h++) {
      const hero = this.heroes[h];
      if (hero.hp <= 0 || hero.invulnTimer > 0) continue;
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

  private updateZoneProgression() {
    const livingCount = this.enemies.filter((e) => e.alive).length;

    // Endless Mohalla Survival Mode: infinite escalating waves!
    if (this.endlessMode) {
      if (livingCount === 0 && this.slowMoTimer <= 0.05) {
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
        this.subAnnouncement =
          this.endlessWave % 4 === 0
            ? 'BADE TAU JOINS THE MOHALLA!'
            : this.endlessWave % 3 === 0
              ? 'MOTI PEHELWAN AMBUSH!'
              : 'FRESH COUSIN WAVE INCOMING';
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

  private findNearestLivingEnemy(x: number, z: number): EnemyRuntime | null {
    let best: EnemyRuntime | null = null;
    let bestDist = Infinity;
    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      if (!e.alive) continue;
      const d = Math.hypot(e.x - x, (e.z - z) * 1.2);
      if (d < bestDist) {
        bestDist = d;
        best = e;
      }
    }
    return best;
  }

  private spawnParticles(x: number, y: number, z: number, count: number, speed: number) {
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

  private updateParticles(dt: number) {
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

  private updateCamera(dt: number) {
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

  private renderAllRigs(_dt: number) {
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

  public getHudSnapshot(): HudSnapshot {
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
      ? this.enemies.filter((e) => e.alive).length
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

  public dispose() {
    soundEngine.stopDholLoop();
    this.clearEnemies();
    this.powerupDirector.dispose();
    this.heroes.forEach((h) => {
      h.rig.rightElbow.remove(h.weaponMeshes.lathi);
      h.rig.rightElbow.remove(h.weaponMeshes.chair);
      h.rig.rightElbow.remove(h.weaponMeshes.stool);
      h.rig.rightElbow.remove(h.weaponMeshes.coconut);
      h.rig.root.remove(h.activeRing);
      h.weaponMeshes.dispose();
    });
    this.scene.remove(this.zAlignRing);
    this.scene.remove(this.activeOverheadGroup);
    this.scene.remove(this.partnerOverheadSprite);
    this.scene.remove(this.activeOuterRing);
    this.scene.remove(this.activeFacingArrow);
    this.projectiles.forEach((p) => this.scene.remove(p.mesh));
    this.projGeos.forEach((g) => g.dispose());
    this.projMats.forEach((m) => m.dispose());
    this.ringGeos.forEach((g) => g.dispose());
    this.ringMats.forEach((m) => m.dispose());
    this.ringTexs.forEach((t) => t.dispose());
    this.scene.remove(this.particleMesh);
    this.particleGeo.dispose();
    this.particleMat.dispose();
  }
}
