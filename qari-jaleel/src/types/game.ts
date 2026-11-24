export type FighterArchetype = 'striker' | 'kicker' | 'pehelwan' | 'boxer';

export type FightingStyle =
  | 'bollywood_hero'
  | 'kushti_pehelwan'
  | 'kalari_kicker'
  | 'street_boxer'
  | 'weapon_master'
  | 'kung_fu_master'
  | 'lazy_giant';

export type HeadgearType = 'none' | 'headband' | 'turban' | 'sunglasses' | 'glasses' | 'tilak';

export type LowerOutfitStyle = 'rolled_trousers' | 'pathani_salwar' | 'split_dhoti';

export type PortraitFilterStyle = 'gouache' | 'arcade_ink' | 'mela_poster' | 'natural';

export type StageId = 'banyan_akhara' | 'chai_chowk' | 'mela_dusk';

export type GameMode = 'street_brawl' | 'endless_mohalla' | 'arcade' | 'versus_2p' | 'quick_ai';

export function isStreetBrawlMode(mode: GameMode): boolean {
  return mode === 'street_brawl' || mode === 'endless_mohalla';
}

export type Difficulty = 'novice' | 'pehelwan' | 'grandmaster';

export type GameScreen = 'TITLE' | 'ROSTER' | 'STUDIO' | 'PLAYING';

export type MatchPhase = 'ATTRACT' | 'ROUND_INTRO' | 'FIGHTING' | 'ROUND_KO' | 'MATCH_OVER';

export interface FighterAppearance {
  skinTone: string;
  vestColor: string;
  pantsColor: string;
  wrapColor: string;
  hairColor: string;
  headgear: HeadgearType;
  buildScale: number; // 0.92 slim to 1.18 powerhouse
  bald?: boolean;
  lowerOutfitStyle?: LowerOutfitStyle;
  plaidLungi?: boolean;
  hasAxe?: boolean;
  /** Tailored henley-style top: no chest pocket or lapels */
  fittedTop?: boolean;
}

export interface FighterStats {
  power: number;   // 1..10
  speed: number;   // 1..10
  reach: number;   // 1..10
  defense: number; // 1..10
}

export interface PortraitFaceRect {
  cx: number;   // 0..1 normalized horizontal face center in portraitUrl
  cy: number;   // 0..1 normalized vertical face center in portraitUrl
  size: number; // 0..1 normalized face diameter fraction of portrait width
}

export interface FighterProfile {
  id: string;
  name: string;
  nickname: string;
  isCustom: boolean;
  archetype: FighterArchetype;
  fightingStyle?: FightingStyle;
  portraitUrl: string;
  rawPhotoUrl?: string; // Clean uploaded photo used for real-time MediaPipe 2D-to-3D face mapping
  faceTextureUrl?: string; // Pre-baked 3D head texture (used for custom photo uploads / poster crops)
  portraitFaceRect?: PortraitFaceRect; // Normalized face framing for automatic portrait-to-3D-head mapping
  appearance: FighterAppearance;
  stats: FighterStats;
  specialMoveName: string;
  taunt: string;
  wins: number;
  createdAt?: number;
}

export interface StageConfig {
  id: StageId;
  name: string;
  subtitle: string;
  timeOfDay: string;
  backdropUrl: string;
  skyColor: string;
  fogColor: string;
  groundColor: string;
  ringRimColor: string;
  accentColor: string;
}

export type CombatAction =
  | 'idle'
  | 'walk_fwd'
  | 'walk_back'
  | 'sprint'
  | 'sidestep_in'
  | 'sidestep_out'
  | 'crouch'
  | 'jump'
  | 'jump_kick'
  | 'jump_slam'
  | 'dash_attack'
  | 'clinch'
  | 'clinch_knee'
  | 'parry'
  | 'panic_special'
  | 'block'
  | 'lp'
  | 'lp2'
  | 'rp'
  | 'combo_finisher'
  | 'kick'
  | 'sweep'
  | 'throw_attempt'
  | 'throw_execute'
  | 'thrown'
  | 'rage_art'
  | 'powerup_fady'
  | 'powerup_saf'
  | 'powerup_jav'
  | 'powerup_jam'
  | 'powerup_chet'
  | 'powerup_immy'
  | 'squeezed'
  | 'listening'
  | 'coughing'
  | 'hitstun'
  | 'knockdown'
  | 'wakeup'
  | 'victory'
  | 'ko'
  | 'back_elbow'
  | 'finisher_slam'
  | 'grabbed_struggle'
  | 'rescue_dropkick'
  | 'high_five'
  | 'spinning_heel_kick'
  | 'tornado_kick'
  | 'axe_kick'
  | 'flying_side_kick';

export interface PlayerInputState {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  block: boolean;
  // Edge-triggered press queues (consumed by engine tick)
  lpPressed: boolean;
  rpPressed: boolean;
  kickPressed: boolean;
  sidestepPressed: boolean;
  throwPressed: boolean;
  ragePressed: boolean;
  switchPressed: boolean;
  assistPressed: boolean;
  panicSpecialPressed: boolean;
  jumpPressed: boolean;
  dashDir: -1 | 0 | 1;
}

export interface FighterHudState {
  id: string;
  name: string;
  nickname: string;
  portraitUrl: string;
  hp: number;
  maxHp: number;
  trailHp: number;
  recoverableHp?: number;
  rage: number; // 0..100
  combo: number;
  roundsWon: number;
  action: CombatAction;
  callout: string;
  calloutSeq: number;
}

export interface MatchStats {
  p1MaxCombo: number;
  p2MaxCombo: number;
  p1DamageDealt: number;
  p2DamageDealt: number;
  p1PerfectRounds: number;
  p2PerfectRounds: number;
  winnerSide: 1 | 2 | null;
}

export interface SpeechBubbleState {
  side: 1 | 2;
  speaker: string;
  text: string;
}

export type BrawlWeaponKind = 'lathi' | 'chair' | 'chai' | 'stool' | 'coconut';

export interface BrawlHeldWeapon {
  kind: 'lathi' | 'chair' | 'stool' | 'coconut';
  durability: number;
  maxDurability: number;
  throwable?: boolean;
}

export interface BrawlTargetEnemyHud {
  name: string;
  subtitle: string;
  hp: number;
  maxHp: number;
  isBoss: boolean;
}

export interface ComicPopupItem {
  id: number;
  text: string;
  xPct: number;
  yPct: number;
  color: string;
  opacity: number;
  scale?: number;
}

export type VillageBoonId =
  | 'extra_mirchi'
  | 'iron_lungi'
  | 'bazaar_bargain'
  | 'double_dhol'
  | 'kadak_chai';

export interface VillageBoonCard {
  id: VillageBoonId;
  title: string;
  subtitle: string;
  description: string;
  accentColor: string;
}

export type BrawlRank = 'S' | 'A' | 'B' | 'C';

export interface BrawlScorecard {
  clearTimeSec: number;
  highestCombo: number;
  cousinsRickshawed: number;
  coinsEarned?: number;
  flawlessWaves?: number;
  pickupsTaken?: number;
  finishersLanded: number;
  score: number;
  totalDefeated: number;
  rank: BrawlRank;
  isEndless: boolean;
  endlessWave: number;
  isNewBestScore: boolean;
  isNewBestWave: boolean;
  isNewBestRank: boolean;
}

export interface StreetBrawlHudState {
  activeHeroIndex: 0 | 1;
  hero1Weapon: BrawlHeldWeapon | null;
  hero2Weapon: BrawlHeldWeapon | null;
  hero1StyleLabel: string;
  hero2StyleLabel: string;
  zone: number;
  totalZones: number;
  zoneName: string;
  score: number;
  enemiesRemaining: number;
  totalDefeated: number;
  goArrowVisible: boolean;
  targetEnemy: BrawlTargetEnemyHud | null;
  switchBanner: string;
  switchSeq: number;
  pickupToast: string;
  pickupSeq: number;
  comicPopups: ComicPopupItem[];
  rickshawWarning: boolean;
  partnerDown: boolean;
  partnerReviveProgress: number; // 0..1
  switchCooldownPct: number; // 0 = ready, 1 = just switched
  assistCooldownPct: number; // 0 = ready, 1 = just assisted
  isClinching: boolean;
  isSprinting: boolean;
  zAligned: boolean;
  nearSplendorBike: boolean;
  ridingBikeTimer: number;
  splendorBikeRemaining: number;
  pendingBoons: VillageBoonCard[] | null;
  activeBoons: VillageBoonId[];
  crowdHypeTier: number;
  isEndless: boolean;
  endlessWave: number;
  endlessBestWave: number;
  bossIntroBanner: { name: string; subtitle: string } | null;
  dizzyPrompt: { xPct: number; yPct: number; enemyName: string } | null;
  grabEscapePrompt: { progress: number; partnerCanRescue: boolean } | null;
  bossPhase2Active: boolean;
  scorecard: BrawlScorecard | null;
}

export interface HudSnapshot {
  phase: MatchPhase;
  roundNumber: number;
  timer: number;
  announcement: string;
  subAnnouncement: string;
  p1: FighterHudState;
  p2: FighterHudState;
  stats: MatchStats;
  rageFlashSide: 1 | 2 | null;
  speechBubble: SpeechBubbleState | null;
  streakMult?: number; // Endless no-hit score multiplier (1 = none)
  comedyTimer?: string | null; // comic countdown clock shown during Qari's "two mins bro" move
  brawl?: StreetBrawlHudState;
}

export interface FaceCrop {
  offsetX: number; // -1 to 1
  offsetY: number; // -1 to 1
  zoom: number;    // 0.7 to 2.8
}
