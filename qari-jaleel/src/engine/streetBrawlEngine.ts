import * as THREE from 'three';
import { BrawlScorecard, Difficulty, FighterProfile, HudSnapshot, MatchPhase, MatchStats, PlayerInputState, SpeechBubbleState, VillageBoonCard, VillageBoonId } from '../types/game';
import { resolveFighterStyle } from '../data/roster';
import { loadArcadeRecords } from '../utils/storage';
import { ArticulatedFighterRig } from './fighterRig';
import { getPowerupKindForFighter, PowerupDirector } from './powerupDirector';
import { StreetStageHandle } from './streetStage';
import { soundEngine } from './sound';
import { HeroRuntime, EnemyRuntime, ProjectileRuntime, Particle, PopupRuntime } from './street/types';
import { STREET_ZONES, PARTICLE_POOL_SIZE } from './street/data';
import { buildHeroWeaponProps, createOverheadBadgeTexture } from './street/props';
import * as enemyAI from './street/enemyAI';
import * as heroControl from './street/heroControl';
import * as partnerAI from './street/partnerAI';
import * as powerups from './street/powerups';
import * as combat from './street/combat';
import * as flow from './street/flow';
import * as view from './street/view';

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
  // Subsystems live in ./street/*.ts and are bound onto the engine instance.
  updateEnemies = enemyAI.updateEnemies;
  checkEnemyAttackHit = enemyAI.checkEnemyAttackHit;
  spawnEnemyChappal = enemyAI.spawnEnemyChappal;
  updateProjectiles = enemyAI.updateProjectiles;
  updateAutoRickshaw = enemyAI.updateAutoRickshaw;
  updateHeroWithInput = heroControl.updateHeroWithInput;
  executeHeroCombatInput = heroControl.executeHeroCombatInput;
  performDodgeSidestep = heroControl.performDodgeSidestep;
  startClinch = heroControl.startClinch;
  hurlClinchedEnemy = heroControl.hurlClinchedEnemy;
  releaseClinch = heroControl.releaseClinch;
  throwHeldProp = heroControl.throwHeldProp;
  triggerJumpGroundSlamImpact = heroControl.triggerJumpGroundSlamImpact;
  enforceHeroSeparation = heroControl.enforceHeroSeparation;
  clampHeroPosition = heroControl.clampHeroPosition;
  startHeroMove = heroControl.startHeroMove;
  updatePartnerHeroAI = partnerAI.updatePartnerHeroAI;
  findPartnerTarget = partnerAI.findPartnerTarget;
  performHeroSwitch = partnerAI.performHeroSwitch;
  performPartnerAssist = partnerAI.performPartnerAssist;
  performPanicSpecial = partnerAI.performPanicSpecial;
  updatePartnerRevive = partnerAI.updatePartnerRevive;
  triggerPartnerRescueDropkick = partnerAI.triggerPartnerRescueDropkick;
  startHeroPowerup = powerups.startHeroPowerup;
  stepHeroPowerup = powerups.stepHeroPowerup;
  dealPowerupAoeDamage = powerups.dealPowerupAoeDamage;
  isPowerupAction = powerups.isPowerupAction;
  evaluateHeroAttackHits = combat.evaluateHeroAttackHits;
  damageEnemy = combat.damageEnemy;
  checkHeroPickups = combat.checkHeroPickups;
  executeSignatureFinisher = combat.executeSignatureFinisher;
  releaseRearGrab = combat.releaseRearGrab;
  updateInteractiveProps = combat.updateInteractiveProps;
  updateBossShockwave = combat.updateBossShockwave;
  spawnEndlessWave = flow.spawnEndlessWave;
  spawnWave = flow.spawnWave;
  clearEnemies = flow.clearEnemies;
  updateZoneProgression = flow.updateZoneProgression;
  computeScorecard = flow.computeScorecard;
  finishRun = flow.finishRun;
  stepTagHighFive = flow.stepTagHighFive;
  checkCrowdHypeDrops = flow.checkCrowdHypeDrops;
  renderAllRigs = view.renderAllRigs;
  updateCamera = view.updateCamera;
  updateParticles = view.updateParticles;
  spawnParticles = view.spawnParticles;
  spawnComicPopup = view.spawnComicPopup;

  public paused = false;
  public phase: MatchPhase = 'ROUND_INTRO';

  elapsed = 0;
  phaseTimer = 0;
  hitstopTimer = 0;
  shakeIntensity = 0;

  heroes: [HeroRuntime, HeroRuntime];
  activeHeroIndex: 0 | 1 = 0;
  enemies: EnemyRuntime[] = [];
  nextEnemyUid = 1;

  // Zone & belt-scrolling state
  currentZoneIdx = 0;
  wave2Spawned = false;
  zoneCleared = false;
  lockedMinX = STREET_ZONES[0].lockMinX;
  lockedMaxX = STREET_ZONES[0].lockMaxX;
  cameraX = 0.5;
  cameraVelX = 0;
  cameraLeadZ = -0.35;
  cameraLookAt = new THREE.Vector3(0.5, 0.58, -0.45);

  // Endless Mohalla & Style Rank Scorecard Telemetry
  endlessMode: boolean;
  endlessWave = 1;
  endlessBestWave = 0;
  runElapsedSec = 0;
  cousinsRickshawed = 0;
  finishersLanded = 0;
  scorecard: BrawlScorecard | null = null;

  // Dramatic Framing: Boss Intro Zoom, Zone Final KO Slow-Mo, Finisher Punch-In & Tag High-Five
  bossIntroTimer = 0;
  bossIntroTargetUid: number | null = null;
  bossIntroBanner: { name: string; subtitle: string } | null = null;
  slowMoTimer = 0;
  slowMoFocusX = 0;
  slowMoFocusZ = 0;
  finisherZoomTimer = 0;
  finisherZoomX = 0;
  finisherZoomZ = 0;
  finisherTargetUid: number | null = null;
  highFiveTimer = 0;
  highFiveChimePlayed = false;

  // Enemy Cooperative Rear-Grab State
  grabbedByEnemyUid: number | null = null;
  grabEscapeProgress = 0;
  grabHoldTimer = 0;
  grabGlobalCooldown = 5.5;

  // Bade Tau Phase 2 ("Moustache Rage") & Ground-Pound Shockwave Ring
  bossPhase2Triggered = false;
  bossShockwaveCooldown = 3.2;
  shockwaveActive = false;
  shockwaveX = 0;
  shockwaveZ = 0;
  shockwaveRadius = 0;
  shockwaveHitHeroMask = 0;

  // Partner Revive, Tag-Switch & Assist Cooldowns
  partnerReviveProgress = 0;
  switchCooldown = 0;
  assistCooldown = 0;
  zAlignedTargetUid: number | null = null;
  zAlignRing: THREE.Mesh;
  zAlignRingMat: THREE.MeshBasicMaterial;

  // Crowd Hype Drops & Between-Zone Village Boons
  noKnockdownCombo = 0;
  crowdHypeTier = 0;
  pendingBoons: VillageBoonCard[] | null = null;
  activeBoons: Set<VillageBoonId> = new Set();

  // Auto-Rickshaw periodic hazard
  rickshawCooldown = 14.5;
  rickshawWarnTimer = 0;
  rickshawHitUids = new Set<number>();

  // Pooled 3D Projectiles (flying chappals, thrown stools, thrown coconuts)
  projectiles: ProjectileRuntime[] = [];
  projGeos: THREE.BufferGeometry[] = [];
  projMats: THREE.Material[] = [];

  // Comic Bollywood Hit Popups
  popups: PopupRuntime[] = [];
  nextPopupId = 1;
  _projVec = new THREE.Vector3();

  // Scoring & HUD feedback
  score = 0;
  totalDefeated = 0;
  lastHitEnemyUid: number | null = null;
  announcement = 'ZONE 1';
  subAnnouncement = 'CHAI CHOWK';
  switchBanner = '';
  switchSeq = 0;
  switchBannerTimer = 0;
  pickupToast = '';
  pickupSeq = 0;
  pickupToastTimer = 0;
  rageFlashSide: 1 | 2 | null = null;
  rageFlashTimer = 0;
  speechBubble: SpeechBubbleState | null = null;
  speechTimer = 0;
  comedyTimer: string | null = null;
  // Saf's bear hug: the victim is carried in his arms and squeezed like a squeaky toy
  hugVictimUid: number | null = null;
  hugSquash = 0;
  hugPos = { x: 0, y: 0, z: 0 };

  stats: MatchStats = {
    p1MaxCombo: 0,
    p2MaxCombo: 0,
    p1DamageDealt: 0,
    p2DamageDealt: 0,
    p1PerfectRounds: 0,
    p2PerfectRounds: 0,
    winnerSide: null,
  };

  powerupDirector: PowerupDirector;
  particles: Particle[] = [];
  particleMesh: THREE.InstancedMesh;
  particleGeo: THREE.BufferGeometry;
  particleMat: THREE.MeshBasicMaterial;
  dummy = new THREE.Object3D();
  ringGeos: THREE.BufferGeometry[] = [];
  ringMats: THREE.Material[] = [];
  ringTexs: THREE.Texture[] = [];

  // Unmistakable 3D active-character identification markers (zero per-frame allocations)
  activeOverheadGroup: THREE.Group;
  activeOverheadArrow: THREE.Mesh;
  activeOuterRing: THREE.Mesh;
  activeFacingArrow: THREE.Mesh;
  partnerOverheadSprite: THREE.Sprite;
  partnerAiMat: THREE.SpriteMaterial;
  partnerReviveMat: THREE.SpriteMaterial;
  activeTagPopTimer = 0;

  difficultyScale: number;
  isMobile = false;

  constructor(
    public scene: THREE.Scene,
    public camera: THREE.PerspectiveCamera,
    public stage: StreetStageHandle,
    hero1Profile: FighterProfile,
    hero2Profile: FighterProfile,
    hero1Rig: ArticulatedFighterRig,
    hero2Rig: ArticulatedFighterRig,
    difficulty: Difficulty,
    public onMatchFinish?: (winnerSide: 1 | 2) => void,
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

  initProjectilePool() {
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

  createHeroRuntime(
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
      counterTimer: 0,
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
      // Debug: ?foes=thali_tiwari,chintu spawns those cousins in the first wave
      const foesParam =
        typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('foes') : null;
      this.spawnWave(foesParam ? foesParam.split(',') : STREET_ZONES[0].wave1, STREET_ZONES[0]);
    }
    soundEngine.playRoundStart();
    soundEngine.setDholIntensity('normal');
    soundEngine.startDholLoop();
  }

  syncHeroWeaponVisuals(h: HeroRuntime) {
    const k = h.heldWeapon?.kind;
    h.weaponMeshes.lathi.visible = k === 'lathi';
    h.weaponMeshes.chair.visible = k === 'chair';
    h.weaponMeshes.stool.visible = k === 'stool';
    h.weaponMeshes.coconut.visible = k === 'coconut';
  }

  getActiveHero(): HeroRuntime {
    return this.heroes[this.activeHeroIndex];
  }

  getPartnerHero(): HeroRuntime {
    return this.heroes[this.activeHeroIndex === 0 ? 1 : 0];
  }

  /**
   * Instant Double Dragon Tag-In Switch!
   * When an enemy is nearby, the incoming hero executes a flying TAG AMBUSH kick/barge!
   */

  /**
   * Hold SWITCH (0.3s): Calls off-screen/partner fighter to dash in from screen edge,
   * execute a drive-by signature assist attack, and dash back out to extend combo juggles!
   */

  /**
   * Risk-Reward "Green Health" Panic Special:
   * Grants brief i-frames + 360° crowd-clearing knockback, converting 15% of current HP into
   * glowing green recoverable HP that heals back as you land JAB/HOOK hits!
   */

  hasBoon(id: VillageBoonId): boolean {
    return this.activeBoons.has(id);
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

  /**
   * Prefer an enemy that the active hero isn't already crowding, so tag partners
   * naturally split aggro across the street instead of stacking on the same cousin.
   */

  /**
   * Continuous elliptical personal-space separation between active hero & AI partner.
   * Gently and briskly slides the AI partner out of the player's bubble (without hijacking player controls),
   * while allowing close proximity when the partner is downed so the player can revive them.
   */

  findNearestLivingEnemy(x: number, z: number): EnemyRuntime | null {
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

  public getHudSnapshot(): HudSnapshot {
    return view.getHudSnapshot.call(this);
  }

  public selectVillageBoon(boonId: VillageBoonId) {
    flow.selectVillageBoon.call(this, boonId);
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
