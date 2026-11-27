// Shared runtime types for the street brawl engine.
import * as THREE from 'three';
import { BrawlHeldWeapon, CombatAction, ComicPopupItem, FighterProfile, FightingStyle } from '../../types/game';
import { ArticulatedFighterRig } from '../fighterRig';
import { PowerupKind } from '../powerupDirector';
import { ThugAction, VillageThugRig, VillageThugSpec } from '../villageThugs';

export interface HeroMoveSpec {
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

export interface StreetZoneConfig {
  index: number;
  name: string;
  lockMinX: number;
  lockMaxX: number;
  triggerX: number;
  wave1: string[];
  wave2: string[];
}

export interface HeroWeaponMeshes {
  lathi: THREE.Group;
  chair: THREE.Group;
  stool: THREE.Group;
  coconut: THREE.Group;
  dispose: () => void;
}

export type BufferedMoveKind = 'lp' | 'rp' | 'kick' | 'throw' | 'jump' | 'dodge';

export interface HeroRuntime {
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
  footTimer: number;
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
  counterTimer: number;
  /** rises with each dodge, drains over time; a tired dodge gives almost no invulnerability */
  dodgeFatigue: number;
  /** stamina 0..100 (engine/energy.ts) */
  energy: number;
  energyIdle: number;
  tiredShown: boolean;
  /** times the energy bar was emptied recently (slows recovery) */
  exhaust: number;
  emptied: boolean;
  /** fighter's own combo-finisher effect already fired this swing */
  signatureDone: boolean;
  /** distance still to cover by the short step-in at the start of a strike */
  stepInLeft: number;
  aiThinkTimer: number;
  powerupKind: PowerupKind;
  powerupOriginX: number;
  powerupOriginZ: number;
  powerupTargetId: number | null;
  powerupHitsMask: number;
}

export interface EnemyRuntime {
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
  telegraphed: boolean;
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
  /** light hits taken in a row (cousins raise their guard against button mashing) */
  lightStreak: number;
  lightStreakTimer: number;
  /** hits soaked while guarding; at 2 they counter-attack */
  blockedHits: number;
  /** boss banter lines already said (bits) */
  banter: number;
  /** ground roll after a big knockdown landing (seconds left) */
  rollTimer: number;
  /** Chet's STOCK CRASH: takes +25% damage while > 0 */
  markTimer: number;
  /** comedy gag in progress (see street/gags.ts) */
  gag: 'none' | 'chappal' | 'surrender' | 'argue' | 'samosa' | 'chai';
  gagTimer: number;
  gagX: number;
  gagZ: number;
  gagOther: number;
  gagLeader: boolean;
  gagUsed: number;
  guardCooldown: number;
  specialCooldown: number;
  specialIdx: number;
  special: 'volley' | 'summon' | 'charge' | 'stomp' | null;
  specialFired: boolean;
  chargeTimer: number;
  phase3: boolean;
  phase2Rage: boolean;
  koFadeTimer: number;
  alive: boolean;
  removed: boolean;
}

export interface ProjectileRuntime {
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

export interface Particle {
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

export interface PopupRuntime extends ComicPopupItem {
  life: number;
}
