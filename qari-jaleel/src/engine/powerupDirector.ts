import * as THREE from 'three';

export type PowerupKind =
  | 'fady_smoke'
  | 'saf_hug'
  | 'jav_story'
  | 'jam_snooker'
  | 'chet_ford'
  | 'immy_girls'
  | 'generic';

export function getPowerupKindForFighter(fighterId: string): PowerupKind {
  switch (fighterId) {
    case 'qari_jaleel':
      return 'fady_smoke';
    case 'rebel_aviator':
      return 'saf_hug';
    case 'rebel_tactician':
      return 'jav_story';
    case 'rebel_enforcer':
      return 'jam_snooker';
    case 'rebel_striker':
      return 'chet_ford';
    case 'rebel_shadow':
      return 'immy_girls';
    default:
      return 'generic';
  }
}

interface SmokePuff {
  mesh: THREE.Mesh;
  mat: THREE.MeshStandardMaterial;
  baseOffset: THREE.Vector3;
  drift: THREE.Vector3;
  phaseOffset: number;
  baseScale: number;
}

interface GirlCharacter3D {
  root: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  torso: THREE.Group;
}

interface HeartProp {
  mesh: THREE.Mesh;
  angle: number;
  speed: number;
  heightOffset: number;
}

/**
 * Manages all bespoke 3D props, vehicles, smoke clouds, snooker cue, and cameo characters
 * for each fighter's unique Powerup move with zero per-frame allocations.
 */
export class PowerupDirector {
  private geometries: THREE.BufferGeometry[] = [];
  private materials: THREE.Material[] = [];
  private textures: THREE.Texture[] = [];

  // Fady: Wooden chair + Cigarette + Swirling Arena Smoke Cloud
  private chairGroup: THREE.Group;
  private cigaretteGroup: THREE.Group;
  private cigaretteEmberMat: THREE.MeshBasicMaterial;
  private smokeGroup: THREE.Group;
  private smokePuffs: SmokePuff[] = [];
  private chaiGroup: THREE.Group;
  private wispGroup: THREE.Group;
  private wisps: { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; seed: number }[] = [];
  private debrisGroup: THREE.Group;
  private debris: { mesh: THREE.Mesh; v: THREE.Vector3; spin: THREE.Vector3 }[] = [];

  // Jam: Polished 3D Snooker Cue
  private snookerCueGroup: THREE.Group;

  // Chet: Glossy 3D Red Ford Car
  private fordCarGroup: THREE.Group;
  private fordWheels: THREE.Group[] = [];

  // Immy: 3 Random Girls + Floating Hearts
  private girlsGroup: THREE.Group;
  private girls: GirlCharacter3D[] = [];
  private heartsGroup: THREE.Group;
  private hearts: HeartProp[] = [];

  constructor(private scene: THREE.Scene) {
    const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
      this.geometries.push(g);
      return g;
    };
    const trackMat = <T extends THREE.Material>(m: T): T => {
      this.materials.push(m);
      return m;
    };
    const trackTex = <T extends THREE.Texture>(t: T): T => {
      this.textures.push(t);
      return t;
    };

    // ── 1. FADY'S WOODEN CHAIR + CIGARETTE + SMOKE CLOUD ────────────────────
    this.chairGroup = this.buildWoodenChair(trackGeo, trackMat);
    this.chairGroup.visible = false;
    this.scene.add(this.chairGroup);

    const cig = this.buildCigarette(trackGeo, trackMat);
    this.cigaretteGroup = cig.group;
    this.cigaretteEmberMat = cig.emberMat;
    this.cigaretteGroup.visible = false;
    this.scene.add(this.cigaretteGroup);

    this.chaiGroup = this.buildChaiGlass(trackGeo, trackMat);
    this.chaiGroup.visible = false;
    this.scene.add(this.chaiGroup);

    // Thin cigarette smoke wisps that curl up from his hand (so the move reads without hiding the screen)
    this.wispGroup = new THREE.Group();
    this.wispGroup.visible = false;
    const wispGeo = trackGeo(new THREE.SphereGeometry(0.1, 8, 6));
    for (let i = 0; i < 18; i++) {
      const mat = trackMat(new THREE.MeshBasicMaterial({ color: '#ECE8E0', transparent: true, opacity: 0, depthWrite: false }));
      const mesh = new THREE.Mesh(wispGeo, mat);
      this.wisps.push({ mesh, mat, seed: i / 18 });
      this.wispGroup.add(mesh);
    }
    this.scene.add(this.wispGroup);

    // Chair splinters that fly when it gets smashed
    this.debrisGroup = new THREE.Group();
    this.debrisGroup.visible = false;
    const debrisGeo = trackGeo(new THREE.BoxGeometry(0.14, 0.05, 0.22));
    const debrisMat = trackMat(new THREE.MeshStandardMaterial({ color: '#D7263D', roughness: 0.35 }));
    for (let i = 0; i < 10; i++) {
      const mesh = new THREE.Mesh(debrisGeo, debrisMat);
      const a = (i / 10) * Math.PI * 2;
      this.debris.push({
        mesh,
        v: new THREE.Vector3(Math.cos(a) * (1.4 + (i % 3) * 0.5), 2.2 + (i % 4) * 0.5, Math.sin(a) * (0.9 + (i % 2) * 0.5)),
        spin: new THREE.Vector3(4 + i, 5 - i * 0.4, 3 + (i % 3)),
      });
      this.debrisGroup.add(mesh);
    }
    this.scene.add(this.debrisGroup);

    this.smokeGroup = new THREE.Group();
    this.smokeGroup.visible = false;
    const smokeGeo = trackGeo(new THREE.SphereGeometry(0.42, 12, 10));
    for (let i = 0; i < 28; i++) {
      const mat = trackMat(
        new THREE.MeshStandardMaterial({
          color: i % 3 === 0 ? '#E2E8F0' : i % 3 === 1 ? '#CBD5E1' : '#94A3B8',
          roughness: 1.0,
          metalness: 0.0,
          transparent: true,
          opacity: 0,
          depthWrite: false,
        })
      );
      const mesh = new THREE.Mesh(smokeGeo, mat);
      const angle = (i / 28) * Math.PI * 2 + (i % 5) * 0.4;
      const radius = 0.25 + (i / 28) * 3.1;
      this.smokePuffs.push({
        mesh,
        mat,
        baseOffset: new THREE.Vector3(
          Math.cos(angle) * radius,
          0.45 + (i % 6) * 0.34,
          Math.sin(angle) * Math.min(1.6, radius * 0.55)
        ),
        drift: new THREE.Vector3(
          Math.cos(angle) * 0.85,
          0.45 + (i % 4) * 0.16,
          Math.sin(angle) * 0.45
        ),
        phaseOffset: (i * 0.13) % 1,
        baseScale: 0.8 + (i % 5) * 0.38,
      });
      this.smokeGroup.add(mesh);
    }
    this.scene.add(this.smokeGroup);

    // ── 2. JAM'S 3D SNOOKER CUE ─────────────────────────────────────────────
    this.snookerCueGroup = this.buildSnookerCue(trackGeo, trackMat);
    this.snookerCueGroup.visible = false;
    this.scene.add(this.snookerCueGroup);

    // ── 3. CHET'S 3D RED FORD CAR ───────────────────────────────────────────
    const ford = this.buildRedFordCar(trackGeo, trackMat, trackTex);
    this.fordCarGroup = ford.group;
    this.fordWheels = ford.wheels;
    this.fordCarGroup.visible = false;
    this.scene.add(this.fordCarGroup);

    // ── 4. IMMY'S 3 RANDOM GIRLS + HEARTS ───────────────────────────────────
    this.girlsGroup = new THREE.Group();
    this.girlsGroup.visible = false;
    const girlConfigs = [
      { dress: '#EC4899', hair: '#1A120E', skin: '#D49A6E', hairStyle: 'ponytail' as const },
      { dress: '#14B8A6', hair: '#3B2314', skin: '#E5B289', hairStyle: 'wavy' as const },
      { dress: '#8B5CF6', hair: '#161210', skin: '#C48556', hairStyle: 'bob' as const },
    ];
    for (const cfg of girlConfigs) {
      const g = this.buildGirlCharacter(cfg, trackGeo, trackMat);
      this.girls.push(g);
      this.girlsGroup.add(g.root);
    }
    this.scene.add(this.girlsGroup);

    this.heartsGroup = new THREE.Group();
    this.heartsGroup.visible = false;
    const heartGeo = trackGeo(this.createHeartGeometry());
    const heartMat = trackMat(
      new THREE.MeshBasicMaterial({ color: '#FB7185', side: THREE.DoubleSide })
    );
    for (let i = 0; i < 8; i++) {
      const mesh = new THREE.Mesh(heartGeo, heartMat);
      mesh.scale.setScalar(0.14);
      this.hearts.push({
        mesh,
        angle: (i / 8) * Math.PI * 2,
        speed: 1.6 + (i % 3) * 0.4,
        heightOffset: (i % 4) * 0.28,
      });
      this.heartsGroup.add(mesh);
    }
    this.scene.add(this.heartsGroup);
  }

  public hideAll() {
    this.chairGroup.visible = false;
    this.cigaretteGroup.visible = false;
    this.smokeGroup.visible = false;
    this.chaiGroup.visible = false;
    this.wispGroup.visible = false;
    this.debrisGroup.visible = false;
    this.snookerCueGroup.visible = false;
    this.fordCarGroup.visible = false;
    this.girlsGroup.visible = false;
    this.heartsGroup.visible = false;
  }

  /**
   * Fady's "two mins bro" move: a red plastic chair drops in, he sits with a chai and a smoke for ages,
   * then hoists the chair overhead and smashes it over the nearest cousin.
   * Phases: 0-.10 chair drops, .10-.66 sitting, .66-.74 stands, .74-.80 hoists, .80-.86 swings, .86+ smash.
   */
  public updateFadySmoke(
    phase: number,
    attackerX: number,
    attackerZ: number,
    facing: 1 | -1,
    chairX: number,
    chairZ: number,
    elapsed: number,
    targetX = attackerX + facing * 1.6,
    targetZ = attackerZ
  ) {
    const SIT0 = 0.1, SIT1 = 0.66, LIFT = 0.74, SWING = 0.8, SMASH = 0.86;
    const lerp = THREE.MathUtils.lerp;
    const clamp01 = (v: number) => THREE.MathUtils.clamp(v, 0, 1);
    const sitting = phase >= SIT0 && phase < SIT1;

    // ── chair ──
    const ch = this.chairGroup;
    const seatX = chairX - facing * 0.08;
    ch.visible = phase < SMASH;
    ch.rotation.set(0, facing === 1 ? Math.PI * 0.4 : -Math.PI * 0.4, 0);
    if (phase < SIT0) {
      const k = phase / SIT0;
      const bounce = k > 0.85 ? Math.sin(((k - 0.85) / 0.15) * Math.PI) * 0.12 : 0;
      ch.position.set(seatX, Math.max(0, 3.2 * (1 - k * k)) + bounce, chairZ);
      ch.rotation.z = (1 - k) * 0.5;
    } else if (phase < LIFT) {
      ch.position.set(seatX, 0, chairZ);
    } else if (phase < SWING) {
      const k = clamp01((phase - LIFT) / (SWING - LIFT));
      const e = k * k * (3 - 2 * k);
      ch.position.set(lerp(seatX, attackerX + facing * 0.3, e), lerp(0, 2.05, e), lerp(chairZ, attackerZ, e));
      ch.rotation.z = -facing * e * 0.2;
    } else {
      const k = clamp01((phase - SWING) / (SMASH - SWING));
      const e = k * k;
      ch.position.set(
        lerp(attackerX + facing * 0.3, targetX - facing * 0.35, e),
        lerp(2.05, 0.55, e),
        lerp(attackerZ, targetZ, e)
      );
      ch.rotation.z = -facing * (0.2 + e * 1.6);
    }

    // ── chai glass on the ground next to the chair ──
    this.chaiGroup.visible = phase >= SIT0 && phase < SMASH;
    this.chaiGroup.position.set(chairX + facing * 0.62, 0, chairZ + 0.46);

    // ── smashed-chair splinters ──
    this.debrisGroup.visible = phase >= SMASH && phase < 0.98;
    if (this.debrisGroup.visible) {
      const tau = clamp01((phase - SMASH) / 0.12) * 0.9;
      const ox = targetX - facing * 0.35, oz = targetZ;
      for (const d of this.debris) {
        d.mesh.position.set(ox + d.v.x * tau * facing, 0.55 + d.v.y * tau - 4.6 * tau * tau, oz + d.v.z * tau);
        d.mesh.position.y = Math.max(0.03, d.mesh.position.y);
        d.mesh.rotation.set(d.spin.x * tau, d.spin.y * tau, d.spin.z * tau);
        d.mesh.scale.setScalar(phase > 0.94 ? Math.max(0.01, (0.98 - phase) / 0.04) : 1);
      }
    }

    // ── cigarette ──
    const lit = phase >= 0.06 && phase < SIT1 + 0.02;
    this.cigaretteGroup.visible = lit;
    let cigX = attackerX, cigY = 1.14, cigZ = attackerZ;
    if (lit) {
      const puffCycle = sitting ? Math.sin((phase - SIT0) * Math.PI * 14) : 0;
      const lift = puffCycle > 0.2 ? 0.06 : 0;
      cigX = attackerX + facing * (0.24 + lift * 0.3);
      cigY = sitting ? 1.14 + lift : 1.42;
      cigZ = attackerZ + 0.14;
      this.cigaretteGroup.position.set(cigX, cigY, cigZ);
      this.cigaretteGroup.rotation.set(0, facing === 1 ? 0 : Math.PI, -0.15);
      const glow = 0.6 + Math.max(0, puffCycle) * 0.4;
      this.cigaretteEmberMat.color.setRGB(1.0, 0.32 * glow, 0.04);
    }

    // ── thin smoke wisps from the cigarette ──
    this.wispGroup.visible = lit;
    if (lit) {
      const fade = sitting ? 1 : 0.5;
      for (let i = 0; i < this.wisps.length; i++) {
        const w = this.wisps[i];
        const cyc = (elapsed * 0.32 + w.seed) % 1;
        w.mesh.position.set(
          cigX + Math.sin(elapsed * 1.4 + i * 1.7) * 0.12 * cyc + facing * cyc * 0.25,
          cigY + 0.04 + cyc * 1.5,
          cigZ + Math.cos(elapsed * 1.1 + i) * 0.1 * cyc
        );
        w.mesh.scale.setScalar(0.35 + cyc * 1.1);
        w.mat.opacity = Math.sin(cyc * Math.PI) * 0.34 * fade;
      }
    }

    // ── gentle low smoke cloud while he waits, plus a short poof when the chair hits ──
    const base =
      phase < SIT0 ? 0
      : phase < 0.35 ? clamp01((phase - SIT0) / 0.25) * 0.8
      : phase < SIT1 ? 0.8
      : phase < SWING ? 0.8 * clamp01((SWING - phase) / 0.14)
      : 0;
    const poof = phase >= SMASH ? clamp01(1 - (phase - SMASH) / 0.1) : 0;
    const smokeIntensity = Math.max(base, poof);
    this.smokeGroup.visible = smokeIntensity > 0.01;
    if (this.smokeGroup.visible) {
      const atTarget = phase >= SMASH;
      this.smokeGroup.position.set(
        atTarget ? targetX : chairX + facing * 0.9,
        0,
        atTarget ? targetZ : chairZ
      );
      for (let i = 0; i < this.smokePuffs.length; i++) {
        const p = this.smokePuffs[i];
        const t = clamp01((phase - 0.06) * 1.35 + p.phaseOffset * 0.35);
        const sway = Math.sin(elapsed * 2.1 + i) * 0.18;
        p.mesh.position.set(
          p.baseOffset.x * (0.2 + t * 0.6) * facing + sway,
          p.baseOffset.y * 0.8 + t * p.drift.y * 0.6,
          p.baseOffset.z * (0.3 + t * 0.6) + Math.cos(elapsed * 1.6 + i) * 0.12
        );
        p.mesh.scale.setScalar(p.baseScale * (0.35 + t * 0.9));
        p.mat.opacity = smokeIntensity * (i % 2 === 0 ? 0.2 : 0.14);
      }
    }
  }

  /** Jam: Swings a 3D polished wooden snooker cue 3 times, then rests it over his shoulder */
  public updateJamSnooker(
    phase: number,
    attackerX: number,
    attackerY: number,
    attackerZ: number,
    facing: 1 | -1
  ) {
    this.snookerCueGroup.visible = true;
    // Position cue anchored around Jam's right hand & swing arc
    if (phase < 0.64) {
      // Three distinct whacks across 0.12..0.64
      const swingLocal = ((phase - 0.1) / 0.18) % 1;
      const swingArc = phase < 0.1 ? -0.9 : Math.sin(Math.max(0, swingLocal) * Math.PI) * 2.2 - 0.7;
      this.snookerCueGroup.position.set(
        attackerX + facing * 0.46,
        attackerY + 1.24,
        attackerZ + 0.16
      );
      this.snookerCueGroup.rotation.set(
        0.25,
        facing === 1 ? -0.35 + swingArc * 0.3 : Math.PI + 0.35 - swingArc * 0.3,
        -0.4 - swingArc * 0.85
      );
    } else {
      // Casually propped over his shoulder while delivering "you know what bro just drop me off home"
      this.snookerCueGroup.position.set(
        attackerX - facing * 0.12,
        attackerY + 1.48,
        attackerZ + 0.18
      );
      this.snookerCueGroup.rotation.set(0.18, facing === 1 ? 0.25 : Math.PI - 0.25, 0.88);
    }
  }

  /** Chet: Drives a glossy 3D Red Ford car straight across the arena and over the opponent */
  public updateChetFord(
    phase: number,
    startX: number,
    targetZ: number,
    facing: 1 | -1
  ): { carX: number; carActive: boolean } {
    if (phase < 0.18 || phase > 0.94) {
      this.fordCarGroup.visible = false;
      return { carX: startX - facing * 12, carActive: false };
    }

    this.fordCarGroup.visible = true;
    const driveT = (phase - 0.18) / 0.72; // 0..1
    const carX = THREE.MathUtils.lerp(startX - facing * 9.5, startX + facing * 11.5, driveT);
    const bounce = Math.abs(Math.sin(driveT * Math.PI * 16)) * 0.035;

    this.fordCarGroup.position.set(carX, bounce, targetZ);
    // Car local +X is the front nose (headlights + blue oval grille)
    this.fordCarGroup.rotation.y = facing === 1 ? 0 : Math.PI;

    const wheelSpin = -driveT * 42;
    for (let i = 0; i < this.fordWheels.length; i++) {
      this.fordWheels[i].rotation.z = wheelSpin;
    }

    return { carX, carActive: true };
  }

  /** Immy: 3 random girls sprint in, hug Immy with hearts, then rush and punch the opponent! */
  public updateImmyGirls(
    phase: number,
    immyX: number,
    immyZ: number,
    oppX: number,
    oppZ: number,
    facing: 1 | -1,
    elapsed: number
  ) {
    this.girlsGroup.visible = true;
    const showHearts = phase >= 0.22 && phase <= 0.54;
    this.heartsGroup.visible = showHearts;
    if (showHearts) {
      this.heartsGroup.position.set(immyX, 1.55, immyZ);
      for (let i = 0; i < this.hearts.length; i++) {
        const h = this.hearts[i];
        const a = h.angle + elapsed * h.speed;
        const r = 0.55 + Math.sin(elapsed * 4 + i) * 0.15;
        h.mesh.position.set(
          Math.cos(a) * r,
          h.heightOffset + ((elapsed * 0.9 + i * 0.2) % 0.9),
          Math.sin(a) * r * 0.65
        );
        h.mesh.rotation.y = Math.sin(elapsed * 3 + i) * 0.4;
      }
    }

    const offsetsZ = [-0.52, 0.52, 0.06];
    const hugOffsetsX = [-facing * 0.48, facing * 0.46, -facing * 0.18];
    const hugOffsetsZ = [-0.36, 0.34, 0.42];
    const punchOffsetsX = [-facing * 0.78, -facing * 0.96, -facing * 0.68];
    const punchOffsetsZ = [-0.46, 0.46, 0.02];

    for (let i = 0; i < this.girls.length; i++) {
      const g = this.girls[i];
      const spawnX = immyX - facing * (6.2 + i * 0.85);
      const hugX = immyX + hugOffsetsX[i];
      const hugZ = immyZ + hugOffsetsZ[i];
      const punchX = oppX + punchOffsetsX[i];
      const punchZ = oppZ + punchOffsetsZ[i];

      let gx = spawnX;
      let gz = immyZ + offsetsZ[i];
      let yaw = facing === 1 ? Math.PI * 0.5 : -Math.PI * 0.5;
      let runCycle = Math.sin(elapsed * 18 + i * 1.9);
      let lArmX = -0.4;
      let rArmX = -0.4;
      let lArmZ = -0.15;
      let rArmZ = 0.15;
      let lLegX = 0;
      let rLegX = 0;
      let hopY = 0;

      if (phase < 0.24) {
        // Sprint onto screen toward Immy
        const t = THREE.MathUtils.smoothstep(phase / 0.24, 0, 1);
        gx = THREE.MathUtils.lerp(spawnX, hugX, t);
        gz = THREE.MathUtils.lerp(immyZ + offsetsZ[i] * 1.6, hugZ, t);
        lLegX = runCycle * 0.85;
        rLegX = -runCycle * 0.85;
        lArmX = -0.6 - runCycle * 0.6;
        rArmX = -0.6 + runCycle * 0.6;
        hopY = Math.abs(runCycle) * 0.08;
      } else if (phase < 0.52) {
        // Hug Immy happily!
        gx = hugX;
        gz = hugZ;
        yaw = Math.atan2(immyX - gx, immyZ - gz);
        const bounce = Math.abs(Math.sin(elapsed * 9 + i));
        hopY = bounce * 0.07;
        // Arms wrapped forward in hug!
        lArmX = -1.35;
        rArmX = -1.35;
        lArmZ = 0.42;
        rArmZ = -0.42;
      } else if (phase < 0.62) {
        // Charge straight at the opponent!
        const t = THREE.MathUtils.smoothstep((phase - 0.52) / 0.1, 0, 1);
        gx = THREE.MathUtils.lerp(hugX, punchX, t);
        gz = THREE.MathUtils.lerp(hugZ, punchZ, t);
        yaw = Math.atan2(oppX - gx, oppZ - gz);
        lLegX = runCycle * 0.95;
        rLegX = -runCycle * 0.95;
        lArmX = -0.8 - runCycle * 0.7;
        rArmX = -0.8 + runCycle * 0.7;
        hopY = Math.abs(runCycle) * 0.09;
      } else if (phase < 0.86) {
        // Rapid synchronized punches on the opponent!
        gx = punchX + Math.sin(elapsed * 26 + i * 2) * 0.12;
        gz = punchZ;
        yaw = Math.atan2(oppX - gx, oppZ - gz);
        const punchWave = Math.sin((phase - 0.62) * Math.PI * 12 + i * 1.4);
        lArmX = -1.55 - Math.max(0, punchWave) * 0.55;
        rArmX = -1.55 - Math.max(0, -punchWave) * 0.55;
        lLegX = -0.25;
        rLegX = 0.25;
        hopY = Math.abs(punchWave) * 0.06;
      } else {
        // Dash back off-screen victoriously
        const t = THREE.MathUtils.smoothstep((phase - 0.86) / 0.14, 0, 1);
        gx = THREE.MathUtils.lerp(punchX, spawnX, t);
        gz = THREE.MathUtils.lerp(punchZ, immyZ + offsetsZ[i] * 1.8, t);
        yaw = facing === 1 ? -Math.PI * 0.5 : Math.PI * 0.5;
        lLegX = runCycle * 0.9;
        rLegX = -runCycle * 0.9;
        lArmX = -2.2 + runCycle * 0.3;
        rArmX = -2.2 - runCycle * 0.3;
        hopY = Math.abs(runCycle) * 0.08;
      }

      g.root.position.set(gx, hopY, gz);
      g.root.rotation.y = yaw;
      g.leftArm.rotation.set(lArmX, 0, lArmZ);
      g.rightArm.rotation.set(rArmX, 0, rArmZ);
      g.leftLeg.rotation.x = lLegX;
      g.rightLeg.rotation.x = rLegX;
    }
  }

  private buildWoodenChair(
    trackGeo: <T extends THREE.BufferGeometry>(g: T) => T,
    trackMat: <T extends THREE.Material>(m: T) => T
  ): THREE.Group {
    // The classic red plastic monobloc chair every chai stall has.
    const group = new THREE.Group();
    const plastic = trackMat(new THREE.MeshStandardMaterial({ color: '#D7263D', roughness: 0.34, metalness: 0.04 }));
    const shade = trackMat(new THREE.MeshStandardMaterial({ color: '#A91B2E', roughness: 0.4, metalness: 0.04 }));

    // Dished seat with a rounded front lip
    const seat = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.64, 0.07, 0.6)), plastic);
    seat.position.set(0, 0.54, 0);
    seat.castShadow = true;
    seat.receiveShadow = true;
    const lip = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.045, 0.045, 0.64, 12)), plastic);
    lip.rotation.z = Math.PI / 2;
    lip.position.set(0, 0.54, 0.3);
    const rear = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.6, 0.05, 0.1)), shade);
    rear.position.set(0, 0.5, -0.27);
    group.add(seat, lip, rear);

    // Four splayed tapered legs
    const legGeo = trackGeo(new THREE.CylinderGeometry(0.034, 0.026, 0.54, 10));
    for (const [cx, cz] of [[-0.27, -0.24], [0.27, -0.24], [-0.27, 0.24], [0.27, 0.24]]) {
      const leg = new THREE.Mesh(legGeo, plastic);
      leg.position.set(cx, 0.27, cz);
      leg.rotation.set(cz > 0 ? -0.09 : 0.09, 0, cx > 0 ? 0.08 : -0.08);
      leg.castShadow = true;
      group.add(leg);
    }

    // Moulded backrest: curved panel with slots and side rails, leaning back
    const back = new THREE.Group();
    back.position.set(0, 0.62, -0.27);
    back.rotation.x = -0.16;
    const railGeo = trackGeo(new THREE.BoxGeometry(0.06, 0.62, 0.05));
    const railL = new THREE.Mesh(railGeo, plastic);
    railL.position.set(-0.28, 0.31, 0);
    const railR = new THREE.Mesh(railGeo, plastic);
    railR.position.set(0.28, 0.31, 0);
    back.add(railL, railR);
    const slatGeo = trackGeo(new THREE.BoxGeometry(0.5, 0.1, 0.045));
    for (const sy of [0.12, 0.28, 0.44, 0.58]) {
      const slat = new THREE.Mesh(slatGeo, plastic);
      slat.position.set(0, sy, 0);
      slat.castShadow = true;
      back.add(slat);
    }
    group.add(back);
    return group;
  }

  private buildChaiGlass(
    trackGeo: <T extends THREE.BufferGeometry>(g: T) => T,
    trackMat: <T extends THREE.Material>(m: T) => T
  ): THREE.Group {
    const group = new THREE.Group();
    const saucer = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.1, 0.085, 0.014, 18)),
      trackMat(new THREE.MeshStandardMaterial({ color: '#F4EFE6', roughness: 0.5 }))
    );
    saucer.position.y = 0.007;
    const chai = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.048, 0.04, 0.09, 14)),
      trackMat(new THREE.MeshStandardMaterial({ color: '#B5651D', roughness: 0.3 }))
    );
    chai.position.y = 0.065;
    const glass = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.052, 0.044, 0.12, 14, 1, true)),
      trackMat(new THREE.MeshStandardMaterial({ color: '#DDF1FA', roughness: 0.1, transparent: true, opacity: 0.32, side: THREE.DoubleSide, depthWrite: false }))
    );
    glass.position.y = 0.075;
    group.add(saucer, chai, glass);
    group.scale.setScalar(1.7);
    return group;
  }

  private buildCigarette(
    trackGeo: <T extends THREE.BufferGeometry>(g: T) => T,
    trackMat: <T extends THREE.Material>(m: T) => T
  ): { group: THREE.Group; emberMat: THREE.MeshBasicMaterial } {
    const group = new THREE.Group();
    const filterMat = trackMat(new THREE.MeshStandardMaterial({ color: '#D97706', roughness: 0.8 }));
    const paperMat = trackMat(new THREE.MeshStandardMaterial({ color: '#F8FAFC', roughness: 0.9 }));
    const emberMat = trackMat(new THREE.MeshBasicMaterial({ color: '#FF5500' }));

    const filter = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.011, 0.011, 0.04, 8)), filterMat);
    filter.rotation.z = Math.PI / 2;
    filter.position.x = 0.02;

    const paper = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.011, 0.011, 0.11, 8)), paperMat);
    paper.rotation.z = Math.PI / 2;
    paper.position.x = 0.095;

    const ember = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.014, 8, 8)), emberMat);
    ember.position.x = 0.155;

    group.add(filter, paper, ember);
    return { group, emberMat };
  }

  private buildSnookerCue(
    trackGeo: <T extends THREE.BufferGeometry>(g: T) => T,
    trackMat: <T extends THREE.Material>(m: T) => T
  ): THREE.Group {
    const group = new THREE.Group();

    const ebonyMat = trackMat(
      new THREE.MeshStandardMaterial({ color: '#1B1410', roughness: 0.35, metalness: 0.15 })
    );
    const ashMat = trackMat(
      new THREE.MeshStandardMaterial({ color: '#E8CFA6', roughness: 0.42, metalness: 0.08 })
    );
    const brassMat = trackMat(
      new THREE.MeshStandardMaterial({ color: '#EAB308', roughness: 0.25, metalness: 0.88 })
    );
    const chalkMat = trackMat(
      new THREE.MeshStandardMaterial({ color: '#0EA5E9', roughness: 0.95, metalness: 0.0 })
    );

    // Lower dark ebony butt
    const butt = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.021, 0.028, 0.56, 12)), ebonyMat);
    butt.position.y = 0.14;
    butt.castShadow = true;
    group.add(butt);

    // Brass center joint ring
    const joint = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.021, 0.021, 0.03, 12)), brassMat);
    joint.position.y = 0.43;
    group.add(joint);

    // Tapered pale ash shaft
    const shaft = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.011, 0.021, 0.98, 12)), ashMat);
    shaft.position.y = 0.93;
    shaft.castShadow = true;
    group.add(shaft);

    // Brass ferrule
    const ferrule = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.011, 0.011, 0.03, 10)), brassMat);
    ferrule.position.y = 1.43;
    group.add(ferrule);

    // Blue chalk leather tip
    const tip = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.012, 8, 8)), chalkMat);
    tip.position.y = 1.455;
    group.add(tip);

    return group;
  }

  private buildRedFordCar(
    trackGeo: <T extends THREE.BufferGeometry>(g: T) => T,
    trackMat: <T extends THREE.Material>(m: T) => T,
    trackTex: <T extends THREE.Texture>(t: T) => T
  ): { group: THREE.Group; wheels: THREE.Group[] } {
    const group = new THREE.Group();

    const redPaint = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: '#D91A1A',
        roughness: 0.2,
        metalness: 0.48,
        clearcoat: 1.0,
        clearcoatRoughness: 0.08,
      })
    );
    const darkTrim = trackMat(
      new THREE.MeshStandardMaterial({ color: '#171717', roughness: 0.65, metalness: 0.2 })
    );
    const chromeMat = trackMat(
      new THREE.MeshStandardMaterial({ color: '#E2E8F0', roughness: 0.18, metalness: 0.92 })
    );
    const glassMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: '#0F172A',
        roughness: 0.08,
        metalness: 0.25,
        clearcoat: 1.0,
      })
    );
    const headlightMat = trackMat(new THREE.MeshBasicMaterial({ color: '#FEF9C3' }));
    const taillightMat = trackMat(new THREE.MeshBasicMaterial({ color: '#FF2A2A' }));

    // Custom crisp Blue Oval Ford-style emblem texture
    const badgeCanvas = document.createElement('canvas');
    badgeCanvas.width = 128;
    badgeCanvas.height = 64;
    const bctx = badgeCanvas.getContext('2d')!;
    bctx.fillStyle = '#E2E8F0';
    bctx.beginPath();
    bctx.ellipse(64, 32, 60, 28, 0, 0, Math.PI * 2);
    bctx.fill();
    bctx.fillStyle = '#1D4ED8';
    bctx.beginPath();
    bctx.ellipse(64, 32, 54, 22, 0, 0, Math.PI * 2);
    bctx.fill();
    bctx.fillStyle = '#FFFFFF';
    bctx.font = 'italic bold 26px Georgia, serif';
    bctx.textAlign = 'center';
    bctx.textBaseline = 'middle';
    bctx.fillText('Ford', 64, 33);
    const badgeTex = trackTex(new THREE.CanvasTexture(badgeCanvas));
    badgeTex.colorSpace = THREE.SRGBColorSpace;
    const badgeMat = trackMat(new THREE.MeshBasicMaterial({ map: badgeTex }));

    // Main lower red chassis body (nose at +X, trunk at -X)
    const chassis = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.95, 0.52, 1.38)), redPaint);
    chassis.position.set(0, 0.56, 0);
    chassis.castShadow = true;
    chassis.receiveShadow = true;
    group.add(chassis);

    // Sculpted sloped front hood
    const hood = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.95, 0.16, 1.32)), redPaint);
    hood.position.set(0.95, 0.84, 0);
    hood.rotation.z = -0.1;
    hood.castShadow = true;
    group.add(hood);

    // Roof cabin
    const cabin = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.42, 0.48, 1.24)), redPaint);
    cabin.position.set(-0.14, 1.04, 0);
    cabin.castShadow = true;
    group.add(cabin);

    // Sloped front windshield & rear window
    const windshield = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.56, 0.44, 1.18)), glassMat);
    windshield.position.set(0.54, 1.02, 0);
    windshield.rotation.z = 0.56;
    group.add(windshield);

    const rearGlass = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.46, 0.42, 1.18)), glassMat);
    rearGlass.position.set(-0.84, 1.02, 0);
    rearGlass.rotation.z = -0.52;
    group.add(rearGlass);

    // Side window strips
    const sideWin = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.26, 0.34, 1.26)), glassMat);
    sideWin.position.set(-0.14, 1.04, 0);
    group.add(sideWin);

    // Front bumper & black honeycomb grille
    const frontBumper = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.18, 0.24, 1.44)), darkTrim);
    frontBumper.position.set(1.48, 0.38, 0);
    group.add(frontBumper);

    const rearBumper = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.16, 0.24, 1.44)), darkTrim);
    rearBumper.position.set(-1.48, 0.38, 0);
    group.add(rearBumper);

    const grille = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.08, 0.22, 0.72)), darkTrim);
    grille.position.set(1.47, 0.62, 0);
    group.add(grille);

    // Blue Oval Ford emblem on nose & side doors so it's unmistakable from the 2.5D camera!
    const frontBadge = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(0.28, 0.14)), badgeMat);
    frontBadge.position.set(1.52, 0.64, 0);
    frontBadge.rotation.y = Math.PI / 2;
    group.add(frontBadge);

    const sideBadgeL = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(0.42, 0.21)), badgeMat);
    sideBadgeL.position.set(0.18, 0.58, 0.702);
    const sideBadgeR = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(0.42, 0.21)), badgeMat);
    sideBadgeR.position.set(0.18, 0.58, -0.702);
    sideBadgeR.rotation.y = Math.PI;
    group.add(sideBadgeL, sideBadgeR);

    // Bright headlights & taillights
    const lightGeo = trackGeo(new THREE.BoxGeometry(0.08, 0.14, 0.26));
    for (const sz of [-0.48, 0.48]) {
      const hl = new THREE.Mesh(lightGeo, headlightMat);
      hl.position.set(1.46, 0.64, sz);
      const tl = new THREE.Mesh(lightGeo, taillightMat);
      tl.position.set(-1.46, 0.64, sz);
      group.add(hl, tl);
    }

    // 4 spinning tires with silver alloy rims
    const tireGeo = trackGeo(new THREE.CylinderGeometry(0.31, 0.31, 0.24, 18));
    const rimGeo = trackGeo(new THREE.CylinderGeometry(0.18, 0.18, 0.255, 10));
    const spokeGeo = trackGeo(new THREE.BoxGeometry(0.3, 0.04, 0.265));
    const wheels: THREE.Group[] = [];
    const wheelCoords = [
      [0.92, 0.31, 0.66],
      [0.92, 0.31, -0.66],
      [-0.92, 0.31, 0.66],
      [-0.92, 0.31, -0.66],
    ];
    for (const [wx, wy, wz] of wheelCoords) {
      const wg = new THREE.Group();
      wg.position.set(wx, wy, wz);
      const tire = new THREE.Mesh(tireGeo, darkTrim);
      tire.rotation.x = Math.PI / 2;
      tire.castShadow = true;
      const rim = new THREE.Mesh(rimGeo, chromeMat);
      rim.rotation.x = Math.PI / 2;
      const spoke = new THREE.Mesh(spokeGeo, darkTrim);
      wg.add(tire, rim, spoke);
      wheels.push(wg);
      group.add(wg);
    }

    return { group, wheels };
  }

  private buildGirlCharacter(
    cfg: { dress: string; hair: string; skin: string; hairStyle: 'ponytail' | 'wavy' | 'bob' },
    trackGeo: <T extends THREE.BufferGeometry>(g: T) => T,
    trackMat: <T extends THREE.Material>(m: T) => T
  ): GirlCharacter3D {
    const root = new THREE.Group();

    const skinMat = trackMat(
      new THREE.MeshStandardMaterial({ color: cfg.skin, roughness: 0.62, metalness: 0.02 })
    );
    const dressMat = trackMat(
      new THREE.MeshStandardMaterial({ color: cfg.dress, roughness: 0.72, metalness: 0.05 })
    );
    const hairMat = trackMat(
      new THREE.MeshStandardMaterial({ color: cfg.hair, roughness: 0.75, metalness: 0.08 })
    );
    const shoeMat = trackMat(
      new THREE.MeshStandardMaterial({ color: '#1F1B18', roughness: 0.6, metalness: 0.1 })
    );
    const eyeMat = trackMat(new THREE.MeshBasicMaterial({ color: '#1A110C' }));
    const lipMat = trackMat(new THREE.MeshBasicMaterial({ color: '#D9466E' }));

    // Skirt / flared dress base
    const skirt = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.24, 0.56, 14)), dressMat);
    skirt.position.set(0, 0.78, 0);
    skirt.castShadow = true;
    root.add(skirt);

    // Torso
    const torso = new THREE.Group();
    torso.position.set(0, 0.96, 0);
    root.add(torso);

    const upperBody = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.145, 0.12, 0.44, 12)),
      dressMat
    );
    upperBody.position.y = 0.22;
    upperBody.scale.set(1.05, 1, 0.78);
    upperBody.castShadow = true;
    torso.add(upperBody);

    // Neck & head
    const neck = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.052, 0.06, 0.12, 10)), skinMat);
    neck.position.y = 0.48;
    torso.add(neck);

    const head = new THREE.Group();
    head.position.set(0, 0.64, 0);
    torso.add(head);

    const cranium = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.145, 14, 12)), skinMat);
    cranium.scale.set(0.92, 1.08, 0.96);
    cranium.castShadow = true;
    head.add(cranium);

    // Eyes & smile
    const eyeGeo = trackGeo(new THREE.SphereGeometry(0.017, 8, 8));
    const lEye = new THREE.Mesh(eyeGeo, eyeMat);
    lEye.position.set(-0.045, 0.015, 0.125);
    const rEye = new THREE.Mesh(eyeGeo, eyeMat);
    rEye.position.set(0.045, 0.015, 0.125);
    const lips = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.046, 0.014, 0.015)), lipMat);
    lips.position.set(0, -0.052, 0.128);
    head.add(lEye, rEye, lips);

    // Hair crown + distinct style
    const crown = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.156, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.56)),
      hairMat
    );
    crown.position.set(0, 0.025, -0.012);
    head.add(crown);

    if (cfg.hairStyle === 'ponytail') {
      const tail = new THREE.Mesh(trackGeo(new THREE.CapsuleGeometry(0.055, 0.24, 6, 10)), hairMat);
      tail.position.set(0, -0.06, -0.16);
      tail.rotation.x = 0.35;
      head.add(tail);
    } else if (cfg.hairStyle === 'wavy') {
      const backHair = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.14, 0.17, 0.36, 12)),
        hairMat
      );
      backHair.position.set(0, -0.1, -0.06);
      head.add(backHair);
    } else {
      const bob = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.16, 12, 10)), hairMat);
      bob.scale.set(1.06, 0.92, 0.98);
      bob.position.set(0, -0.02, -0.035);
      head.add(bob);
    }

    // Articulated arms (with clenched fist / hand)
    const buildArm = (side: -1 | 1) => {
      const arm = new THREE.Group();
      arm.position.set(side * 0.19, 0.39, 0);
      const limb = new THREE.Mesh(trackGeo(new THREE.CapsuleGeometry(0.042, 0.34, 6, 8)), skinMat);
      limb.position.y = -0.19;
      limb.castShadow = true;
      const hand = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.046, 8, 8)), skinMat);
      hand.position.y = -0.39;
      arm.add(limb, hand);
      torso.add(arm);
      return arm;
    };

    const leftArm = buildArm(-1);
    const rightArm = buildArm(1);

    // Articulated legs
    const buildLeg = (side: -1 | 1) => {
      const leg = new THREE.Group();
      leg.position.set(side * 0.085, 0.55, 0);
      const limb = new THREE.Mesh(trackGeo(new THREE.CapsuleGeometry(0.05, 0.42, 6, 8)), skinMat);
      limb.position.y = -0.24;
      limb.castShadow = true;
      const shoe = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.085, 0.07, 0.16)), shoeMat);
      shoe.position.set(0, -0.5, 0.03);
      leg.add(limb, shoe);
      root.add(leg);
      return leg;
    };

    const leftLeg = buildLeg(-1);
    const rightLeg = buildLeg(1);

    root.scale.setScalar(0.94);
    return { root, leftArm, rightArm, leftLeg, rightLeg, torso };
  }

  private createHeartGeometry(): THREE.ShapeGeometry {
    const s = new THREE.Shape();
    s.moveTo(0, 0.25);
    s.bezierCurveTo(0, 0.55, -0.55, 0.55, -0.55, 0.15);
    s.bezierCurveTo(-0.55, -0.25, 0, -0.55, 0, -0.8);
    s.bezierCurveTo(0, -0.55, 0.55, -0.25, 0.55, 0.15);
    s.bezierCurveTo(0.55, 0.55, 0, 0.55, 0, 0.25);
    return new THREE.ShapeGeometry(s, 10);
  }

  public dispose() {
    this.scene.remove(this.chairGroup);
    this.scene.remove(this.cigaretteGroup);
    this.scene.remove(this.smokeGroup);
    this.scene.remove(this.snookerCueGroup);
    this.scene.remove(this.fordCarGroup);
    this.scene.remove(this.girlsGroup);
    this.scene.remove(this.heartsGroup);
    this.geometries.forEach((g) => g.dispose());
    this.materials.forEach((m) => m.dispose());
    this.textures.forEach((t) => t.dispose());
  }
}
