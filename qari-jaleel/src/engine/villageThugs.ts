import * as THREE from 'three';
import { applyWarmRimHighlight } from './fighterRig';

export type ThugArchetype = 'idiot' | 'thug' | 'ranged' | 'biker' | 'boss';

export type ThugAction =
  | 'idle'
  | 'walk'
  | 'windup'
  | 'attack'
  | 'hitstun'
  | 'clinched'
  | 'bowled'
  | 'knockdown'
  | 'ko'
  | 'taunt'
  | 'dizzy'
  | 'rear_grab'
  | 'boss_roar'
  | 'boss_shockwave';

export interface VillageThugSpec {
  id: string;
  name: string;
  subtitle: string;
  archetype: ThugArchetype;
  maxHp: number;
  damage: number;
  speed: number;
  scoreValue: number;
  skinTone: string;
  shirtColor: string;
  pantsColor: string;
  gamchaColor: string;
  hairColor: string;
  heightScale: number;
  widthScale: number;
  bellyBulge: number;
  hasClub: boolean;
  headAccessory: 'gamcha_knot' | 'cowlick' | 'bandana' | 'bowl_cut' | 'boss_turban';
  goofyEyes: boolean;
  buckTeeth: boolean;
  battleCry: string;
}

export interface VillageThugRig {
  root: THREE.Group;
  hips: THREE.Group;
  torso: THREE.Group;
  headGroup: THREE.Group;
  leftShoulder: THREE.Group;
  leftElbow: THREE.Group;
  rightShoulder: THREE.Group;
  rightElbow: THREE.Group;
  leftHip: THREE.Group;
  leftKnee: THREE.Group;
  rightHip: THREE.Group;
  rightKnee: THREE.Group;
  shadowDisc: THREE.Mesh;
  hitFlashMaterials: THREE.MeshStandardMaterial[];
  faceSkinMat: THREE.MeshStandardMaterial;
  dizzyStarsGroup: THREE.Group;
  dizzyEyesGroup: THREE.Group;
  bossRageAura?: THREE.Group;
  bikeGroup?: THREE.Group;
  bikeWheels?: THREE.Mesh[];
  dispose: () => void;
}

/** Funny procedural village cousins — idiots, street thugs, and Zone 3 boss Bade Tau */
export const VILLAGE_COUSIN_ROSTER: Record<string, Omit<VillageThugSpec, 'id'>> = {
  bunty: {
    name: 'Cousin Bunty',
    subtitle: 'Fast Nimble Skirmisher',
    archetype: 'idiot',
    maxHp: 46,
    damage: 6,
    speed: 3.15,
    scoreValue: 200,
    skinTone: '#C88E5B',
    shirtColor: '#EAB308', // Loud mustard kurta
    pantsColor: '#1E40AF', // Bright blue lungi
    gamchaColor: '#EF4444',
    hairColor: '#171311',
    heightScale: 0.94,
    widthScale: 0.88,
    bellyBulge: 0.06,
    hasClub: false,
    headAccessory: 'gamcha_knot',
    goofyEyes: true,
    buckTeeth: true,
    battleCry: 'Oye! Masi told me to stop you!',
  },
  golu: {
    name: 'Golu No-Teeth',
    subtitle: 'Quick Slap Flanker',
    archetype: 'idiot',
    maxHp: 42,
    damage: 5,
    speed: 3.45,
    scoreValue: 200,
    skinTone: '#B87A4B',
    shirtColor: '#EC4899', // Loud pink village shirt
    pantsColor: '#4D7C0F', // Olive dhoti
    gamchaColor: '#F59E0B',
    hairColor: '#1A1412',
    heightScale: 0.86,
    widthScale: 0.82,
    bellyBulge: 0.02,
    hasClub: false,
    headAccessory: 'cowlick',
    goofyEyes: true,
    buckTeeth: true,
    battleCry: 'Hehehe! Watch my flying slap!',
  },
  tinku: {
    name: 'Tinku Towel',
    subtitle: 'Agile Gamcha Runner',
    archetype: 'idiot',
    maxHp: 52,
    damage: 7,
    speed: 3.25,
    scoreValue: 240,
    skinTone: '#C99364',
    shirtColor: '#14B8A6', // Loud teal kurta
    pantsColor: '#7C2D12',
    gamchaColor: '#FACC15',
    hairColor: '#1F1A17',
    heightScale: 1.03,
    widthScale: 0.82,
    bellyBulge: 0.02,
    hasClub: false,
    headAccessory: 'bowl_cut',
    goofyEyes: true,
    buckTeeth: true,
    battleCry: 'Wait till Chacha hears about this!',
  },
  pappu: {
    name: 'Chacha Pappu',
    subtitle: 'Slow Heavy Bruiser',
    archetype: 'thug',
    maxHp: 96,
    damage: 13,
    speed: 1.82,
    scoreValue: 300,
    skinTone: '#BC8151',
    shirtColor: '#F8F4EC', // Stretched white banyan vest
    pantsColor: '#991B1B', // Checkered red lungi
    gamchaColor: '#EA580C',
    hairColor: '#57534E', // Salt & pepper hair
    heightScale: 0.95,
    widthScale: 1.2,
    bellyBulge: 0.24,
    hasClub: false,
    headAccessory: 'gamcha_knot',
    goofyEyes: true,
    buckTeeth: false,
    battleCry: 'My belly is harder than brick!',
  },
  lathi_lala: {
    name: 'Lathi Lala',
    subtitle: 'Bazaar Street Thug',
    archetype: 'thug',
    maxHp: 84,
    damage: 11,
    speed: 2.5,
    scoreValue: 350,
    skinTone: '#AE6F41',
    shirtColor: '#1E293B', // Sleeveless dark thug vest
    pantsColor: '#3F3F46',
    gamchaColor: '#DC2626',
    hairColor: '#14110F',
    heightScale: 1.04,
    widthScale: 1.06,
    bellyBulge: 0.05,
    hasClub: true,
    headAccessory: 'bandana',
    goofyEyes: false,
    buckTeeth: false,
    battleCry: 'Pay the cousin toll or eat bamboo!',
  },
  kalu_goon: {
    name: 'Panchayat Kalu',
    subtitle: 'Heavy Alley Enforcer',
    archetype: 'thug',
    maxHp: 102,
    damage: 13,
    speed: 2.05,
    scoreValue: 380,
    skinTone: '#9A5F36',
    shirtColor: '#7F1D1D',
    pantsColor: '#27272A',
    gamchaColor: '#F59E0B',
    hairColor: '#120F0E',
    heightScale: 1.08,
    widthScale: 1.15,
    bellyBulge: 0.1,
    hasClub: true,
    headAccessory: 'bandana',
    goofyEyes: false,
    buckTeeth: false,
    battleCry: 'Nobody crosses Chai Chowk!',
  },
  chappal_chacha: {
    name: 'Chappal Chacha',
    subtitle: 'Flying Slipper Menace',
    archetype: 'ranged',
    maxHp: 56,
    damage: 9,
    speed: 2.35,
    scoreValue: 300,
    skinTone: '#C48B5B',
    shirtColor: '#7E22CE', // Loud purple kurta
    pantsColor: '#F5EFE6', // White pajama
    gamchaColor: '#F43F5E',
    hairColor: '#78716C',
    heightScale: 0.91,
    widthScale: 0.94,
    bellyBulge: 0.14,
    hasClub: false,
    headAccessory: 'gamcha_knot',
    goofyEyes: true,
    buckTeeth: true,
    battleCry: 'Eat my Size-10 Flying Chappal!',
  },
  raju_bike: {
    name: 'Raju Splendor',
    subtitle: 'Motorbike Cousin',
    archetype: 'biker',
    maxHp: 88,
    damage: 13,
    speed: 3.8,
    scoreValue: 450,
    skinTone: '#B57749',
    shirtColor: '#0284C7', // Flashy denim jacket
    pantsColor: '#1E293B',
    gamchaColor: '#FACC15',
    hairColor: '#171311',
    heightScale: 0.98,
    widthScale: 0.96,
    bellyBulge: 0.04,
    hasClub: false,
    headAccessory: 'bandana',
    goofyEyes: false,
    buckTeeth: false,
    battleCry: 'VROOOM! Make way for my Hero bike!',
  },
  moti_pehelwan: {
    name: 'Moti Pehelwan',
    subtitle: 'Slow Powerhouse Mid-Boss',
    archetype: 'thug',
    maxHp: 146,
    damage: 15,
    speed: 1.78,
    scoreValue: 650,
    skinTone: '#AA6B3F',
    shirtColor: '#B91C1C', // Crimson akhara pehelwan vest
    pantsColor: '#FEF3C7', // Cream langot/dhoti
    gamchaColor: '#F59E0B',
    hairColor: '#14110F',
    heightScale: 1.14,
    widthScale: 1.3,
    bellyBulge: 0.25,
    hasClub: false,
    headAccessory: 'bandana',
    goofyEyes: false,
    buckTeeth: false,
    battleCry: 'Welcome to my Banyan Akhara, boys!',
  },
  bade_tau: {
    name: 'BADE TAU',
    subtitle: 'King of the Village Cousins',
    archetype: 'boss',
    maxHp: 220,
    damage: 17,
    speed: 1.92,
    scoreValue: 1200,
    skinTone: '#B27245',
    shirtColor: '#EA580C', // Loud saffron boss kurta
    pantsColor: '#F5EFE6', // Crisp village dhoti
    gamchaColor: '#DC2626',
    hairColor: '#292524',
    heightScale: 1.24,
    widthScale: 1.32,
    bellyBulge: 0.28,
    hasClub: true,
    headAccessory: 'boss_turban',
    goofyEyes: false,
    buckTeeth: false,
    battleCry: 'WHO TOUCHED MY LAND AND MY SHEEP?!',
  },
};

function createThugShadowTex(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(32, 32, 4, 32, 32, 30);
  g.addColorStop(0, 'rgba(15, 8, 4, 0.56)');
  g.addColorStop(0.65, 'rgba(15, 8, 4, 0.24)');
  g.addColorStop(1, 'rgba(15, 8, 4, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Builds a distinctive, hilarious composite 3D Village Cousin / Idiot / Thug / Boss rig.
 */
export function createVillageThugRig(spec: VillageThugSpec): VillageThugRig {
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];
  const hitFlashMaterials: THREE.MeshStandardMaterial[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geometries.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    materials.push(m);
    return m;
  };
  const trackFlashMat = (m: THREE.MeshStandardMaterial, rimStrength = 0.22) => {
    materials.push(m);
    hitFlashMaterials.push(m);
    if (rimStrength > 0) applyWarmRimHighlight(m, rimStrength);
    return m;
  };

  const skinMat = trackFlashMat(
    new THREE.MeshStandardMaterial({ color: spec.skinTone, roughness: 0.68, metalness: 0.03 })
  );
  const faceSkinMat = trackMat(
    new THREE.MeshStandardMaterial({ color: spec.skinTone, roughness: 0.66, metalness: 0.03 })
  );
  applyWarmRimHighlight(faceSkinMat, 0.22);
  faceSkinMat.userData.baseColor = new THREE.Color(spec.skinTone);
  const shirtMat = trackFlashMat(
    new THREE.MeshStandardMaterial({ color: spec.shirtColor, roughness: 0.84, metalness: 0.02 })
  );
  const pantsMat = trackFlashMat(
    new THREE.MeshStandardMaterial({ color: spec.pantsColor, roughness: 0.86, metalness: 0.02 })
  );
  const gamchaMat = trackFlashMat(
    new THREE.MeshStandardMaterial({ color: spec.gamchaColor, roughness: 0.82, metalness: 0.02 })
  );
  const hairMat = trackMat(
    new THREE.MeshStandardMaterial({ color: spec.hairColor, roughness: 0.88, metalness: 0.04 })
  );
  const eyeWhiteMat = trackMat(
    new THREE.MeshStandardMaterial({ color: '#FFFDF7', roughness: 0.2, metalness: 0.02 })
  );
  const pupilMat = trackMat(
    new THREE.MeshStandardMaterial({ color: '#110E0C', roughness: 0.12, metalness: 0.08 })
  );
  const toothMat = trackMat(
    new THREE.MeshStandardMaterial({ color: '#FFFBEB', roughness: 0.28, metalness: 0.04 })
  );
  const mouthMat = trackMat(
    new THREE.MeshStandardMaterial({ color: '#4C1D1D', roughness: 0.75, metalness: 0.02 })
  );
  const goldMat = trackMat(
    new THREE.MeshStandardMaterial({ color: '#F59E0B', roughness: 0.22, metalness: 0.88 })
  );
  const sandalMat = trackMat(
    new THREE.MeshStandardMaterial({ color: '#3E2723', roughness: 0.72, metalness: 0.05 })
  );

  const root = new THREE.Group();
  root.name = `thug_${spec.id}`;

  // Contact shadow disc
  const shadowTex = createThugShadowTex();
  textures.push(shadowTex);
  const shadowDisc = new THREE.Mesh(
    trackGeo(new THREE.PlaneGeometry(1.42 * spec.widthScale, 1.05 * spec.widthScale)),
    trackMat(
      new THREE.MeshBasicMaterial({
        map: shadowTex,
        transparent: true,
        depthWrite: false,
      })
    )
  );
  shadowDisc.rotation.x = -Math.PI / 2;
  shadowDisc.position.y = 0.018;
  root.add(shadowDisc);

  // Articulated body container scaled to cousin proportions
  const bodyScale = new THREE.Group();
  bodyScale.scale.set(spec.widthScale, spec.heightScale, spec.widthScale);
  root.add(bodyScale);

  const hips = new THREE.Group();
  hips.position.y = 0.92;
  bodyScale.add(hips);

  // Pelvis / Lungi wrap
  const pelvis = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.22, 0.24, 0.26, 12)), pantsMat);
  pelvis.castShadow = true;
  hips.add(pelvis);

  // Torso
  const torso = new THREE.Group();
  torso.position.y = 0.12;
  hips.add(torso);

  const chest = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.24, 0.21, 0.56, 12)), shirtMat);
  chest.position.y = 0.28;
  chest.scale.set(1.08, 1, 0.82);
  chest.castShadow = true;
  chest.receiveShadow = true;
  torso.add(chest);

  // Loud colorful stripe / collar accent across chest
  const stripe = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.245, 0.23, 0.1, 12)), gamchaMat);
  stripe.position.y = 0.32;
  stripe.scale.set(1.08, 1, 0.83);
  torso.add(stripe);

  // Comical protruding village pot-belly if bellyBulge > 0.04
  if (spec.bellyBulge > 0.04) {
    const belly = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.21 + spec.bellyBulge * 0.48, 14, 12)),
      shirtMat
    );
    belly.position.set(0, 0.12, 0.1 + spec.bellyBulge * 0.35);
    belly.scale.set(1.05, 0.94, 0.92);
    belly.castShadow = true;
    torso.add(belly);
  }

  // Draped village gamcha towel over shoulder for idiots & boss
  const shoulderTowel = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.11, 0.44, 0.26)),
    gamchaMat
  );
  shoulderTowel.position.set(-0.19, 0.34, 0.03);
  shoulderTowel.rotation.z = 0.14;
  shoulderTowel.castShadow = true;
  torso.add(shoulderTowel);

  // Heavy gold chain for thugs & Boss Bade Tau
  if (spec.archetype !== 'idiot') {
    const chain = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.16, 0.022, 8, 16)), goldMat);
    chain.position.set(0, 0.48, 0.12);
    chain.rotation.x = Math.PI * 0.42;
    torso.add(chain);
  }

  // Neck
  const neck = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.085, 0.1, 0.15, 10)), skinMat);
  neck.position.y = 0.61;
  torso.add(neck);

  // ── HILARIOUS EXPRESSIVE 3D HEAD ────────────────────────────────────────────
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.84, 0.02);
  torso.add(headGroup);

  const cranium = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.2, 16, 14)), faceSkinMat);
  cranium.scale.set(0.94, 1.12, 0.98);
  cranium.castShadow = true;
  headGroup.add(cranium);

  // Big comical protruding village ears
  const earGeo = trackGeo(new THREE.SphereGeometry(0.055, 8, 8));
  [-1, 1].forEach((side) => {
    const ear = new THREE.Mesh(earGeo, skinMat);
    ear.position.set(side * 0.2, -0.01, 0);
    ear.scale.set(0.65, 1.25, 0.72);
    headGroup.add(ear);
  });

  // Bulbous nose
  const nose = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.052, 10, 8)), skinMat);
  nose.position.set(0, -0.01, 0.2);
  nose.scale.set(0.88, 1.12, 1.15);
  headGroup.add(nose);

  // Expressive Eyes: Goofy cross-eyed / wide-eyed for idiots, angry narrowed for thugs/boss
  const eyeGeo = trackGeo(new THREE.SphereGeometry(spec.goofyEyes ? 0.048 : 0.036, 10, 8));
  const pupilGeo = trackGeo(new THREE.SphereGeometry(spec.goofyEyes ? 0.022 : 0.018, 8, 8));

  const lEye = new THREE.Mesh(eyeGeo, eyeWhiteMat);
  lEye.position.set(-0.072, 0.045, 0.17);
  const rEye = new THREE.Mesh(eyeGeo, eyeWhiteMat);
  rEye.position.set(0.072, 0.045, 0.17);
  headGroup.add(lEye, rEye);

  const lPupil = new THREE.Mesh(pupilGeo, pupilMat);
  const rPupil = new THREE.Mesh(pupilGeo, pupilMat);
  if (spec.goofyEyes) {
    // Classic hilarious cross-eyed / slightly mismatched idiot pupils!
    lPupil.position.set(-0.052, 0.054, 0.208);
    rPupil.position.set(0.055, 0.036, 0.208);
  } else {
    lPupil.position.set(-0.07, 0.042, 0.198);
    rPupil.position.set(0.07, 0.042, 0.198);
  }
  headGroup.add(lPupil, rPupil);

  // Bushy comical eyebrows (crooked for idiots, thick angry unibrow for thugs & boss!)
  if (spec.goofyEyes) {
    const browGeo = trackGeo(new THREE.BoxGeometry(0.085, 0.024, 0.03));
    const lb = new THREE.Mesh(browGeo, hairMat);
    lb.position.set(-0.075, 0.115, 0.175);
    lb.rotation.z = 0.28;
    const rb = new THREE.Mesh(browGeo, hairMat);
    rb.position.set(0.075, 0.105, 0.175);
    rb.rotation.z = 0.12;
    headGroup.add(lb, rb);
  } else {
    const unibrow = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.22, 0.035, 0.04)), hairMat);
    unibrow.position.set(0, 0.095, 0.185);
    headGroup.add(unibrow);
  }

  // Oversized comical mustache!
  const stacheGeo = trackGeo(new THREE.CapsuleGeometry(0.028, 0.1, 4, 8));
  const lStache = new THREE.Mesh(stacheGeo, hairMat);
  const rStache = new THREE.Mesh(stacheGeo, hairMat);
  if (spec.archetype === 'boss') {
    // Huge curled handlebar villain mustache
    lStache.scale.set(1.4, 1.6, 1.2);
    rStache.scale.set(1.4, 1.6, 1.2);
    lStache.position.set(-0.09, -0.055, 0.195);
    rStache.position.set(0.09, -0.055, 0.195);
    lStache.rotation.z = 1.15;
    rStache.rotation.z = -1.15;
  } else if (spec.goofyEyes) {
    // Hilariously lopsided crooked village mustache
    lStache.position.set(-0.06, -0.068, 0.185);
    rStache.position.set(0.068, -0.052, 0.185);
    lStache.rotation.z = 1.32;
    rStache.rotation.z = -1.1;
  } else {
    lStache.position.set(-0.065, -0.062, 0.19);
    rStache.position.set(0.065, -0.062, 0.19);
    lStache.rotation.z = 1.38;
    rStache.rotation.z = -1.38;
  }
  headGroup.add(lStache, rStache);

  // Grinning mouth & goofy buck teeth for village idiots
  const mouth = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.11, 0.042, 0.03)), mouthMat);
  mouth.position.set(0, -0.115, 0.172);
  headGroup.add(mouth);

  if (spec.buckTeeth) {
    const toothGeo = trackGeo(new THREE.BoxGeometry(0.032, 0.044, 0.025));
    const t1 = new THREE.Mesh(toothGeo, toothMat);
    t1.position.set(-0.02, -0.112, 0.188);
    t1.rotation.z = 0.08;
    const t2 = new THREE.Mesh(toothGeo, toothMat);
    t2.position.set(0.02, -0.115, 0.188);
    t2.rotation.z = -0.1;
    headGroup.add(t1, t2);
  }

  // Distinct comical headwear / village hairdos
  if (spec.headAccessory === 'gamcha_knot') {
    // Crooked village gamcha tied around forehead with silly floppy knot ears sticking up!
    const wrap = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.195, 0.045, 8, 18)), gamchaMat);
    wrap.position.set(0, 0.11, -0.01);
    wrap.rotation.set(Math.PI * 0.48, 0.12, 0.18);
    headGroup.add(wrap);
    const knot1 = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.055, 0.18, 8)), gamchaMat);
    knot1.position.set(0.13, 0.24, 0.03);
    knot1.rotation.z = -0.55;
    const knot2 = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.05, 0.15, 8)), gamchaMat);
    knot2.position.set(0.06, 0.26, 0.05);
    knot2.rotation.z = 0.25;
    headGroup.add(knot1, knot2);
  } else if (spec.headAccessory === 'cowlick') {
    // Silly sticking-up messy hair tufts
    const cap = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.208, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.5)),
      hairMat
    );
    cap.position.y = 0.03;
    headGroup.add(cap);
    for (let t = 0; t < 3; t++) {
      const tuft = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.04, 0.17, 7)), hairMat);
      tuft.position.set((t - 1) * 0.07, 0.26, 0.03 - t * 0.02);
      tuft.rotation.z = (t - 1) * -0.35;
      headGroup.add(tuft);
    }
  } else if (spec.headAccessory === 'bowl_cut') {
    const bowl = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.22, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.54)),
      hairMat
    );
    bowl.position.set(0, 0.05, -0.01);
    bowl.scale.set(1.06, 0.95, 1.04);
    headGroup.add(bowl);
  } else if (spec.headAccessory === 'bandana') {
    const band = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.205, 0.205, 0.09, 14)),
      gamchaMat
    );
    band.position.set(0, 0.125, 0);
    const tail = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.07, 0.2, 0.02)), gamchaMat);
    tail.position.set(0.06, 0.05, -0.22);
    tail.rotation.x = 0.35;
    headGroup.add(band, tail);
  } else if (spec.headAccessory === 'boss_turban') {
    // Giant imposing scarlet Boss Pagdi with golden jewel
    const turban = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.255, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.68)),
      gamchaMat
    );
    turban.position.set(0, 0.14, -0.01);
    turban.scale.set(1.08, 0.96, 1.06);
    turban.rotation.x = -0.14;
    const band = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.23, 0.048, 8, 18)), gamchaMat);
    band.position.set(0, 0.15, 0.01);
    band.rotation.x = Math.PI * 0.48;
    const jewel = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.055, 0)), goldMat);
    jewel.position.set(0, 0.23, 0.22);
    headGroup.add(turban, band, jewel);
  }

  // ── ARTICULATED ARMS + OPTIONAL CLUB ────────────────────────────────────────
  const upperArmGeo = trackGeo(new THREE.CapsuleGeometry(0.068, 0.24, 6, 8));
  const foreArmGeo = trackGeo(new THREE.CapsuleGeometry(0.058, 0.22, 6, 8));
  const fistGeo = trackGeo(new THREE.SphereGeometry(0.07, 8, 8));

  const buildArm = (side: -1 | 1) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.31, 0.5, 0);
    torso.add(shoulder);

    const upper = new THREE.Mesh(upperArmGeo, spec.archetype === 'idiot' ? shirtMat : skinMat);
    upper.position.y = -0.15;
    upper.castShadow = true;
    shoulder.add(upper);

    const elbow = new THREE.Group();
    elbow.position.y = -0.31;
    shoulder.add(elbow);

    const fore = new THREE.Mesh(foreArmGeo, skinMat);
    fore.position.y = -0.13;
    fore.castShadow = true;
    elbow.add(fore);

    const fist = new THREE.Mesh(fistGeo, skinMat);
    fist.position.y = -0.27;
    fist.castShadow = true;
    elbow.add(fist);

    return { shoulder, elbow };
  };

  const leftArm = buildArm(-1);
  const rightArm = buildArm(1);

  // Heavy bamboo club / boss gada in right hand
  if (spec.hasClub) {
    const woodMat = trackMat(
      new THREE.MeshStandardMaterial({ color: '#784824', roughness: 0.72, metalness: 0.08 })
    );
    const clubGroup = new THREE.Group();
    clubGroup.position.set(0, -0.27, 0.04);
    clubGroup.rotation.x = Math.PI * 0.44;
    const shaft = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.026, 0.036, spec.archetype === 'boss' ? 1.1 : 0.88, 10)),
      woodMat
    );
    shaft.position.y = spec.archetype === 'boss' ? 0.45 : 0.35;
    shaft.castShadow = true;
    clubGroup.add(shaft);

    if (spec.archetype === 'boss') {
      // Brass boss mace bulb
      const bulb = new THREE.Mesh(trackGeo(new THREE.DodecahedronGeometry(0.14, 0)), goldMat);
      bulb.position.y = 0.96;
      bulb.castShadow = true;
      clubGroup.add(bulb);
    }
    rightArm.elbow.add(clubGroup);
  }

  // ── ARTICULATED LEGS ────────────────────────────────────────────────────────
  const thighGeo = trackGeo(new THREE.CapsuleGeometry(0.088, 0.3, 6, 8));
  const shinGeo = trackGeo(new THREE.CapsuleGeometry(0.068, 0.32, 6, 8));
  const footGeo = trackGeo(new THREE.BoxGeometry(0.12, 0.075, 0.24));

  const buildLeg = (side: -1 | 1) => {
    const hip = new THREE.Group();
    hip.position.set(side * 0.13, -0.06, 0);
    hips.add(hip);

    const thigh = new THREE.Mesh(thighGeo, pantsMat);
    thigh.position.y = -0.2;
    thigh.castShadow = true;
    hip.add(thigh);

    const knee = new THREE.Group();
    knee.position.y = -0.42;
    hip.add(knee);

    const shin = new THREE.Mesh(shinGeo, spec.archetype === 'idiot' ? skinMat : pantsMat);
    shin.position.y = -0.2;
    shin.castShadow = true;
    knee.add(shin);

    const foot = new THREE.Mesh(footGeo, sandalMat);
    foot.position.set(0, -0.41, 0.045);
    foot.castShadow = true;
    knee.add(foot);

    return { hip, knee };
  };

  const leftLeg = buildLeg(-1);
  const rightLeg = buildLeg(1);

  // Chappal Chacha holds a bright blue rubber village slipper ready to hurl!
  if (spec.archetype === 'ranged') {
    const chappalMat = trackMat(
      new THREE.MeshStandardMaterial({ color: '#0284C7', roughness: 0.65, metalness: 0.05 })
    );
    const strapMat = trackMat(
      new THREE.MeshStandardMaterial({ color: '#F8FAFC', roughness: 0.7 })
    );
    const slipper = new THREE.Group();
    slipper.position.set(0, -0.27, 0.07);
    const sole = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.11, 0.03, 0.28)), chappalMat);
    const strap = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.05, 0.012, 6, 10, Math.PI)), strapMat);
    strap.position.set(0, 0.02, 0.03);
    slipper.add(sole, strap);
    rightArm.elbow.add(slipper);
  }

  // Raju Splendor rides a glossy 3D Indian Village Motorbike (hidden once knocked off!)
  let bikeGroup: THREE.Group | undefined;
  let bikeWheels: THREE.Mesh[] | undefined;
  if (spec.archetype === 'biker') {
    bikeGroup = new THREE.Group();
    bikeWheels = [];
    const bikeRed = trackMat(
      new THREE.MeshStandardMaterial({ color: '#DC2626', roughness: 0.28, metalness: 0.55 })
    );
    const chrome = trackMat(
      new THREE.MeshStandardMaterial({ color: '#E2E8F0', roughness: 0.18, metalness: 0.9 })
    );
    const tireMat = trackMat(
      new THREE.MeshStandardMaterial({ color: '#18181B', roughness: 0.88, metalness: 0.05 })
    );
    const lightMat = trackMat(
      new THREE.MeshBasicMaterial({ color: '#FEF08A' })
    );

    const wheelGeo = trackGeo(new THREE.TorusGeometry(0.28, 0.08, 8, 16));
    const frontWheel = new THREE.Mesh(wheelGeo, tireMat);
    frontWheel.position.set(0, 0.34, 0.62);
    frontWheel.rotation.y = Math.PI / 2;
    const rearWheel = new THREE.Mesh(wheelGeo, tireMat);
    rearWheel.position.set(0, 0.34, -0.58);
    rearWheel.rotation.y = Math.PI / 2;
    bikeWheels.push(frontWheel, rearWheel);

    const frame = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.26, 0.28, 1.12)), bikeRed);
    frame.position.set(0, 0.62, 0);
    frame.castShadow = true;

    const tank = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.32, 0.22, 0.44)), bikeRed);
    tank.position.set(0, 0.84, 0.24);
    const seat = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.3, 0.14, 0.54)), tireMat);
    seat.position.set(0, 0.79, -0.26);

    const handle = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.024, 0.024, 0.68, 8)), chrome);
    handle.rotation.z = Math.PI / 2;
    handle.position.set(0, 1.05, 0.48);

    const headlight = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.09, 0.07, 0.12, 10)), lightMat);
    headlight.rotation.x = Math.PI / 2;
    headlight.position.set(0, 0.96, 0.64);

    bikeGroup.add(frontWheel, rearWheel, frame, tank, seat, handle, headlight);
    root.add(bikeGroup);
  }

  // Spinning 3D stars above head when enemy enters Dizzy FINISH! or KO state (zero GC!)
  const dizzyStarsGroup = new THREE.Group();
  dizzyStarsGroup.position.set(0, 0.5, 0);
  dizzyStarsGroup.visible = false;
  const starMat = trackMat(
    new THREE.MeshBasicMaterial({ color: '#FDE047' })
  );
  const starGeo = trackGeo(new THREE.OctahedronGeometry(0.085, 0));
  for (let s = 0; s < 4; s++) {
    const angle = (s / 4) * Math.PI * 2;
    const star = new THREE.Mesh(starGeo, starMat);
    star.position.set(Math.cos(angle) * 0.34, 0, Math.sin(angle) * 0.34);
    dizzyStarsGroup.add(star);
  }
  headGroup.add(dizzyStarsGroup);

  // Comic X / Spiral Dizzy Eyes mounted flush over the eyes during Dizzy / KO!
  const dizzyEyesGroup = new THREE.Group();
  dizzyEyesGroup.visible = false;
  const xBarGeo = trackGeo(new THREE.BoxGeometry(0.082, 0.018, 0.012));
  const xMat = trackMat(new THREE.MeshBasicMaterial({ color: '#141210' }));
  const swirlRingGeo = trackGeo(new THREE.TorusGeometry(0.044, 0.009, 6, 16));
  const swirlMat = trackMat(new THREE.MeshBasicMaterial({ color: '#FEF08A' }));
  [-0.074, 0.074].forEach((ex) => {
    const eyeSocket = new THREE.Group();
    eyeSocket.position.set(ex, 0.046, 0.228);
    const ring = new THREE.Mesh(swirlRingGeo, swirlMat);
    const bar1 = new THREE.Mesh(xBarGeo, xMat);
    bar1.rotation.z = Math.PI / 4;
    bar1.position.z = 0.006;
    const bar2 = new THREE.Mesh(xBarGeo, xMat);
    bar2.rotation.z = -Math.PI / 4;
    bar2.position.z = 0.006;
    eyeSocket.add(ring, bar1, bar2);
    dizzyEyesGroup.add(eyeSocket);
  });
  headGroup.add(dizzyEyesGroup);

  // Fiery golden Moustache Rage aura for Boss Bade Tau Phase 2!
  let bossRageAura: THREE.Group | undefined;
  if (spec.archetype === 'boss') {
    bossRageAura = new THREE.Group();
    bossRageAura.visible = false;
    const auraMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: '#F59E0B',
        transparent: true,
        opacity: 0.55,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    const auraCoreMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: '#FEF08A',
        transparent: true,
        opacity: 0.38,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    const groundRing = new THREE.Mesh(trackGeo(new THREE.RingGeometry(0.68, 1.04, 28)), auraMat);
    groundRing.rotation.x = -Math.PI / 2;
    groundRing.position.y = 0.045;
    const flameShell = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.66, 0.88, 2.25, 16, 1, true)),
      auraCoreMat
    );
    flameShell.position.y = 1.15;
    bossRageAura.add(groundRing, flameShell);
    root.add(bossRageAura);
  }

  const dispose = () => {
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
    textures.forEach((t) => t.dispose());
  };

  return {
    root,
    hips,
    torso,
    headGroup,
    leftShoulder: leftArm.shoulder,
    leftElbow: leftArm.elbow,
    rightShoulder: rightArm.shoulder,
    rightElbow: rightArm.elbow,
    leftHip: leftLeg.hip,
    leftKnee: leftLeg.knee,
    rightHip: rightLeg.hip,
    rightKnee: rightLeg.knee,
    shadowDisc,
    hitFlashMaterials,
    faceSkinMat,
    dizzyStarsGroup,
    dizzyEyesGroup,
    bossRageAura,
    bikeGroup,
    bikeWheels,
    dispose,
  };
}

/**
 * Procedural animation for Village Idiots, Street Thugs, and Boss Bade Tau.
 */
export function applyThugPose(
  rig: VillageThugRig,
  action: ThugAction,
  phase: number,
  time: number,
  facing: 1 | -1,
  yHeight: number,
  hitFlash: number,
  isIdiot: boolean,
  phase2Rage = false,
  visualYaw?: number
) {
  // Smooth turning orientation along combat X axis
  rig.root.rotation.y =
    visualYaw !== undefined ? visualYaw : facing === 1 ? Math.PI * 0.48 : -Math.PI * 0.48;

  // Toggle & animate spinning overhead dizzy stars + dizzy X/spiral eyes on Dizzy / KO!
  const isDizzyOrKo = action === 'dizzy' || action === 'ko';
  rig.dizzyStarsGroup.visible = isDizzyOrKo;
  rig.dizzyEyesGroup.visible = isDizzyOrKo;
  if (isDizzyOrKo) {
    rig.dizzyStarsGroup.rotation.y = time * 6.8;
    rig.dizzyStarsGroup.position.y = 0.52 + Math.sin(time * 9) * 0.05;
    for (let c = 0; c < rig.dizzyEyesGroup.children.length; c++) {
      rig.dizzyEyesGroup.children[c].rotation.z = time * (c === 0 ? 7.5 : -7.5);
    }
  }

  // Toggle & pulse Bade Tau Phase 2 Moustache Rage golden aura
  if (rig.bossRageAura) {
    rig.bossRageAura.visible = phase2Rage && action !== 'ko';
    if (rig.bossRageAura.visible) {
      const pulse = 1 + Math.sin(time * 14) * 0.1;
      rig.bossRageAura.scale.set(pulse, 1 + Math.sin(time * 11) * 0.08, pulse);
      rig.bossRageAura.rotation.y = time * 2.8;
    }
  }

  // Crisp WHITE body hit-flash on impact + readable telegraph pulse during windup!
  const flash = Math.max(0, Math.min(1, hitFlash));
  const windupPulse =
    action === 'windup' || action === 'boss_shockwave'
      ? 0.55 + Math.abs(Math.sin(phase * Math.PI * 3.5)) * 0.65
      : action === 'dizzy'
        ? 0.25 + Math.abs(Math.sin(time * 8)) * 0.25
        : 0;
  for (let i = 0; i < rig.hitFlashMaterials.length; i++) {
    if (flash > 0.04) {
      // Crisp arcade white flash on landed hits!
      rig.hitFlashMaterials[i].emissive.setRGB(flash * 0.96, flash * 0.96, flash * 0.96);
    } else if (action === 'dizzy') {
      rig.hitFlashMaterials[i].emissive.setRGB(windupPulse * 0.85, windupPulse * 0.72, 0.08);
    } else if (windupPulse > 0) {
      rig.hitFlashMaterials[i].emissive.setRGB(windupPulse * 0.95, windupPulse * 0.52, 0.04);
    } else if (phase2Rage && action !== 'ko') {
      const glow = 0.16 + Math.sin(time * 9) * 0.08;
      rig.hitFlashMaterials[i].emissive.setRGB(glow * 1.1, glow * 0.45, 0.02);
    } else {
      rig.hitFlashMaterials[i].emissive.setRGB(0, 0, 0);
    }
  }

  // Hurt face red tint + slight squash on impact/hitstun; dazed tint on dizzy/KO
  const isHurtFace = flash > 0.06 || action === 'hitstun';
  const baseSkin = rig.faceSkinMat.userData.baseColor as THREE.Color | undefined;
  if (isHurtFace) {
    rig.faceSkinMat.color.setRGB(1.0, 0.36, 0.32);
    rig.faceSkinMat.emissive.setRGB(0.55 * Math.max(0.5, flash), 0.05, 0.04);
    rig.headGroup.scale.set(1.09, 0.87, 1.04);
  } else if (isDizzyOrKo) {
    if (baseSkin) rig.faceSkinMat.color.copy(baseSkin).lerp(new THREE.Color('#E2E8C8'), 0.25);
    rig.faceSkinMat.emissive.setRGB(0.08, 0.08, 0.02);
    rig.headGroup.scale.set(1, 1, 1);
  } else {
    if (baseSkin) rig.faceSkinMat.color.copy(baseSkin);
    rig.faceSkinMat.emissive.setRGB(0, 0, 0);
    rig.headGroup.scale.set(1, 1, 1);
  }

  // Contact shadow shrinks softly during knockups
  const shScale = Math.max(0.4, 1 - yHeight * 0.24);
  rig.shadowDisc.scale.set(shScale, shScale, 1);
  rig.shadowDisc.position.y = 0.018 - yHeight;

  // Reset defaults
  rig.hips.position.set(0, 0.92, 0);
  rig.hips.rotation.set(0, 0, 0);
  rig.torso.rotation.set(0, 0, 0);
  rig.headGroup.rotation.set(0, 0, 0);
  rig.leftShoulder.rotation.set(-0.35, 0, -0.18);
  rig.leftElbow.rotation.set(-0.65, 0, 0);
  rig.rightShoulder.rotation.set(-0.45, 0, 0.18);
  rig.rightElbow.rotation.set(-0.75, 0, 0);
  rig.leftHip.rotation.set(0, 0, 0);
  rig.leftKnee.rotation.set(0.12, 0, 0);
  rig.rightHip.rotation.set(0, 0, 0);
  rig.rightKnee.rotation.set(0.12, 0, 0);

  if (action === 'idle') {
    const bob = Math.sin(time * (isIdiot ? 6.2 : 4.2));
    const sway = Math.sin(time * (isIdiot ? 3.1 : 2.1));
    rig.hips.position.set(sway * 0.04, 0.92 + bob * 0.028, 0);
    rig.hips.rotation.z = sway * 0.04;
    rig.torso.rotation.z = isIdiot ? sway * 0.08 : -sway * 0.03;
    rig.headGroup.rotation.z = isIdiot ? Math.sin(time * 5.2) * 0.16 : -sway * 0.04;
    rig.leftShoulder.rotation.x = -0.55 + bob * 0.12;
    rig.rightShoulder.rotation.x = -0.65 - bob * 0.12;
  } else if (action === 'walk') {
    const stride = Math.sin(time * (isIdiot ? 12.2 : 8.6));
    const hop = Math.abs(Math.sin(time * (isIdiot ? 12.2 : 8.6)));
    rig.hips.position.y = 0.92 + hop * (isIdiot ? 0.085 : 0.05);
    rig.torso.rotation.x = isIdiot ? 0.18 : 0.12;
    rig.torso.rotation.z = stride * (isIdiot ? 0.12 : 0.05);
    rig.headGroup.rotation.z = -stride * (isIdiot ? 0.18 : 0.06);
    rig.headGroup.rotation.x = -0.06;
    rig.leftHip.rotation.x = stride * 0.68;
    rig.rightHip.rotation.x = -stride * 0.68;
    rig.leftKnee.rotation.x = Math.max(0.1, -stride * 0.54 + 0.25);
    rig.rightKnee.rotation.x = Math.max(0.1, stride * 0.54 + 0.25);
    // Opposite-phase arm swing
    rig.leftShoulder.rotation.x = isIdiot ? -0.95 - stride * 0.62 : -0.55 - stride * 0.55;
    rig.rightShoulder.rotation.x = isIdiot ? -0.95 + stride * 0.62 : -0.55 + stride * 0.55;
  } else if (action === 'windup') {
    // Clear telegraphed arcade anticipation windup so player can read & dodge/parry!
    const t = Math.min(1, phase);
    const ease = t * t * (3 - 2 * t);
    rig.hips.position.z = -0.08 * ease;
    rig.torso.rotation.y = -0.62 * ease;
    rig.torso.rotation.x = -0.2 * ease;
    rig.rightShoulder.rotation.set(-2.3 * ease, 0, 0.58 * ease);
    rig.rightElbow.rotation.x = -0.35;
    rig.leftShoulder.rotation.set(-0.9, 0, -0.4);
    rig.headGroup.rotation.x = -0.14 * ease;
    rig.headGroup.rotation.y = 0.28 * ease;
  } else if (action === 'attack') {
    const p = Math.min(1, phase);
    // Fast eased snap strike -> slower return recovery
    const strike = p < 0.4 ? 1 - Math.pow(1 - p / 0.4, 3) : 1 - Math.pow((p - 0.4) / 0.6, 2);
    rig.hips.position.z = 0.12 * strike;
    rig.hips.rotation.y = 0.28 * strike;
    rig.torso.rotation.y = 0.68 * strike;
    rig.torso.rotation.x = 0.28 * strike;
    rig.headGroup.rotation.y = -0.25 * strike;
    rig.rightShoulder.rotation.set(-1.68 - 0.45 * (1 - strike), 0, -0.12 * strike);
    rig.rightElbow.rotation.x = -0.16;
    rig.leftShoulder.rotation.set(0.35 * strike, 0, -0.35);
    rig.rightHip.rotation.x = -0.3 * strike;
    rig.leftHip.rotation.x = 0.25 * strike;
  } else if (action === 'taunt') {
    const wiggle = Math.sin(time * 14);
    rig.hips.position.y = 0.92 + Math.abs(wiggle) * 0.07;
    rig.leftShoulder.rotation.set(-2.3, 0, -0.5 + wiggle * 0.2);
    rig.rightShoulder.rotation.set(-2.3, 0, 0.5 - wiggle * 0.2);
    rig.headGroup.rotation.z = wiggle * 0.24;
  } else if (action === 'hitstun') {
    const p = Math.min(1, phase);
    // Snappy head & torso whip-back then smooth recovery
    const recoil = p < 0.3 ? 1 - Math.pow(1 - p / 0.3, 3) : Math.cos(((p - 0.3) / 0.7) * Math.PI * 0.5);
    rig.hips.position.z = -0.1 * recoil;
    rig.torso.rotation.x = -0.46 * recoil;
    rig.headGroup.rotation.x = -0.52 * recoil;
    rig.leftShoulder.rotation.set(-0.75, 0, -0.78 * recoil);
    rig.rightShoulder.rotation.set(-0.75, 0, 0.78 * recoil);
  } else if (action === 'clinched') {
    // Hunched over in a headlock/collar grab, flailing helplessly!
    const flail = Math.sin(time * 22);
    rig.hips.position.y = 0.84;
    rig.torso.rotation.x = 0.52;
    rig.headGroup.rotation.x = 0.35;
    rig.leftShoulder.rotation.set(-1.35 + flail * 0.35, 0, -0.55);
    rig.rightShoulder.rotation.set(-1.35 - flail * 0.35, 0, 0.55);
    rig.leftHip.rotation.x = -0.22;
    rig.rightHip.rotation.x = 0.22;
  } else if (action === 'bowled') {
    // Hurled across the village street spinning like a human bowling ball!
    rig.hips.position.y = 0.92;
    rig.hips.rotation.x = -Math.PI * 0.45;
    rig.hips.rotation.z = time * 16;
    rig.leftShoulder.rotation.set(-2.2, 0, -0.75);
    rig.rightShoulder.rotation.set(-2.2, 0, 0.75);
    rig.leftHip.rotation.x = 0.35;
    rig.rightHip.rotation.x = -0.35;
  } else if (action === 'dizzy') {
    // Wobbly groggy stagger waiting for a FINISH! takedown
    const sway = Math.sin(time * 5.2);
    rig.hips.position.y = 0.84 + Math.abs(sway) * 0.03;
    rig.torso.rotation.z = sway * 0.22;
    rig.torso.rotation.x = 0.26;
    rig.headGroup.rotation.z = -sway * 0.34;
    rig.headGroup.rotation.x = 0.28;
    rig.leftShoulder.rotation.set(-0.22, 0, -0.36 + sway * 0.12);
    rig.rightShoulder.rotation.set(-0.22, 0, 0.36 + sway * 0.12);
    rig.leftElbow.rotation.x = -0.35;
    rig.rightElbow.rotation.x = -0.35;
    rig.leftKnee.rotation.x = 0.36;
    rig.rightKnee.rotation.x = 0.36;
  } else if (action === 'rear_grab') {
    // Locking the hero in a tight Double Dragon cooperative rear bear-hug!
    const strain = Math.sin(time * 18) * 0.06;
    rig.hips.position.y = 0.88;
    rig.torso.rotation.x = 0.18 + strain;
    rig.leftShoulder.rotation.set(-1.35, 0, -0.22);
    rig.rightShoulder.rotation.set(-1.35, 0, 0.22);
    rig.leftElbow.rotation.x = -1.45;
    rig.rightElbow.rotation.x = -1.45;
    rig.leftHip.rotation.x = -0.22;
    rig.rightHip.rotation.x = 0.22;
  } else if (action === 'boss_roar') {
    // Dramatic chest-out Moustache Rage roar!
    const tremor = Math.sin(time * 32) * 0.05;
    rig.hips.position.y = 0.9 + Math.abs(tremor);
    rig.torso.rotation.x = -0.28;
    rig.headGroup.rotation.x = -0.38;
    rig.leftShoulder.rotation.set(-1.9 + tremor, 0, -0.95);
    rig.rightShoulder.rotation.set(-1.9 - tremor, 0, 0.95);
    rig.leftElbow.rotation.x = -1.1;
    rig.rightElbow.rotation.x = -1.1;
    rig.leftKnee.rotation.x = 0.28;
    rig.rightKnee.rotation.x = 0.28;
  } else if (action === 'boss_shockwave') {
    // Telegraph raise-arms leap -> seismic ground-pound slam!
    const p = Math.min(1, phase);
    if (p < 0.58) {
      const t = p / 0.58;
      rig.hips.position.y = 0.92 + Math.sin(t * Math.PI) * 0.22;
      rig.torso.rotation.x = -0.24 * t;
      rig.leftShoulder.rotation.set(-2.55 * t, 0, -0.35);
      rig.rightShoulder.rotation.set(-2.55 * t, 0, 0.35);
      rig.leftElbow.rotation.x = -0.5;
      rig.rightElbow.rotation.x = -0.5;
    } else {
      const slam = Math.min(1, (p - 0.58) / 0.2);
      rig.hips.position.y = THREE.MathUtils.lerp(0.96, 0.62, slam);
      rig.torso.rotation.x = 0.48 * slam;
      rig.leftShoulder.rotation.set(-0.75 * slam, 0, -0.45);
      rig.rightShoulder.rotation.set(-0.75 * slam, 0, 0.45);
      rig.leftElbow.rotation.x = -0.25;
      rig.rightElbow.rotation.x = -0.25;
      rig.leftHip.rotation.x = -0.65 * slam;
      rig.rightHip.rotation.x = -0.65 * slam;
      rig.leftKnee.rotation.x = 1.05 * slam;
      rig.rightKnee.rotation.x = 1.05 * slam;
    }
  } else if (action === 'knockdown' || action === 'ko') {
    // Fall backward -> lie flat on ground briefly -> get back up (on knockdown)
    let fall: number;
    if (action === 'ko') {
      const t = Math.min(1, phase * 1.8);
      fall = 1 - Math.pow(1 - t, 2);
      rig.headGroup.rotation.z = Math.sin(time * 7) * 0.16 * fall;
    } else if (phase < 0.3) {
      const t = phase / 0.3;
      fall = 1 - Math.pow(1 - t, 2);
    } else if (phase < 0.72) {
      fall = 1;
    } else {
      const t = (phase - 0.72) / 0.28;
      const easeUp = t * t * (3 - 2 * t);
      fall = 1 - easeUp;
    }
    rig.hips.position.y = THREE.MathUtils.lerp(0.92, 0.22, fall);
    rig.hips.rotation.x = -Math.PI * 0.48 * fall;
    rig.torso.rotation.x = phase > 0.72 && action === 'knockdown' ? 0.28 * (1 - fall) : -0.14 * fall;
    rig.leftShoulder.rotation.set(-0.4, 0, -0.95 * fall - 0.12);
    rig.rightShoulder.rotation.set(-0.4, 0, 0.95 * fall + 0.12);
    rig.leftHip.rotation.x = 0.22 * fall;
    rig.rightHip.rotation.x = -0.15 * fall;
  }

  // Strict anatomical anti-clipping clamps for all enemy limbs
  rig.leftShoulder.rotation.z = THREE.MathUtils.clamp(rig.leftShoulder.rotation.z, -1.4, -0.06);
  rig.rightShoulder.rotation.z = THREE.MathUtils.clamp(rig.rightShoulder.rotation.z, 0.06, 1.4);
  rig.leftElbow.rotation.x = THREE.MathUtils.clamp(rig.leftElbow.rotation.x, -1.95, -0.1);
  rig.rightElbow.rotation.x = THREE.MathUtils.clamp(rig.rightElbow.rotation.x, -1.95, -0.1);
  rig.leftHip.rotation.z = -0.05;
  rig.rightHip.rotation.z = 0.05;
  rig.leftKnee.rotation.x = THREE.MathUtils.clamp(rig.leftKnee.rotation.x, 0.08, 1.95);
  rig.rightKnee.rotation.x = THREE.MathUtils.clamp(rig.rightKnee.rotation.x, 0.08, 1.95);
}
