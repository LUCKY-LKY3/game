import * as THREE from 'three';
import { chappalFoot, fabricTexture, fistGroup, hashString, headGeometry, limbGeometry, makeFistGeos, makeFootGeos, ribbonGeometry, torsoGeometry } from './thugParts';
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
  | 'boss_shockwave'
  | 'block';

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
  /** shield: blocks light frontal hits. rusher: dashes in fast. */
  trait?: 'shield' | 'rusher' | 'screamer' | 'thief' | 'healer' | 'bowler';
  /** tougher gold-turban version */
  elite?: boolean;
  /** Boss special attacks, used in rotation (see street/bossMoves.ts) */
  bossMoves?: ('volley' | 'summon' | 'charge' | 'stomp')[];
  /** Specials only unlock once the boss enrages (below 50% HP) */
  specialsAfterRage?: boolean;
  rageLine?: string;
  ragePopup?: string;
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
  chintu: {
    name: 'Cousin Chintu',
    subtitle: 'Scooter Sprinter',
    archetype: 'idiot',
    maxHp: 50,
    damage: 9,
    speed: 4.1,
    scoreValue: 260,
    skinTone: '#C99262',
    shirtColor: '#2563EB',
    pantsColor: '#1E293B',
    gamchaColor: '#F97316',
    hairColor: '#111827',
    heightScale: 0.92,
    widthScale: 0.8,
    bellyBulge: 0,
    hasClub: false,
    headAccessory: 'bandana',
    goofyEyes: true,
    buckTeeth: true,
    battleCry: 'Zoom zoom, cousin!',
    trait: 'rusher',
  },
  thali_tiwari: {
    name: 'Thali Tiwari',
    subtitle: 'Steel Plate Shield-Bearer',
    archetype: 'thug',
    maxHp: 112,
    damage: 12,
    speed: 1.7,
    scoreValue: 380,
    skinTone: '#B5764A',
    shirtColor: '#FACC15',
    pantsColor: '#14532D',
    gamchaColor: '#DC2626',
    hairColor: '#292524',
    heightScale: 1.02,
    widthScale: 1.1,
    bellyBulge: 0.14,
    hasClub: false,
    headAccessory: 'gamcha_knot',
    goofyEyes: false,
    buckTeeth: false,
    battleCry: 'Try hitting a thali, na!',
    trait: 'shield',
  },
  bullhorn_bhai: {
    name: 'Bullhorn Bhai',
    subtitle: 'Wedding Loudspeaker Guy',
    archetype: 'idiot',
    maxHp: 64,
    damage: 7,
    speed: 2.1,
    scoreValue: 260,
    skinTone: '#A8693F',
    shirtColor: '#7C3AED',
    pantsColor: '#1E293B',
    gamchaColor: '#F97316',
    hairColor: '#171717',
    heightScale: 1.0,
    widthScale: 0.95,
    bellyBulge: 0.06,
    hasClub: false,
    headAccessory: 'cowlick',
    goofyEyes: true,
    buckTeeth: true,
    battleCry: 'TESTING TESTING, ONE TWO!',
    trait: 'screamer',
  },
  jeb_katra: {
    name: 'Jeb Katra',
    subtitle: 'Pickpocket of the Bazaar',
    archetype: 'idiot',
    maxHp: 48,
    damage: 6,
    speed: 3.4,
    scoreValue: 300,
    skinTone: '#9A5E36',
    shirtColor: '#0F766E',
    pantsColor: '#27272A',
    gamchaColor: '#FACC15',
    hairColor: '#0A0A0A',
    heightScale: 0.94,
    widthScale: 0.86,
    bellyBulge: 0,
    hasClub: false,
    headAccessory: 'bandana',
    goofyEyes: false,
    buckTeeth: false,
    battleCry: 'Nice power bar you have there...',
    trait: 'thief',
  },
  chappal_chaudhary: {
    name: 'Chappal Chaudhary',
    subtitle: 'Slipper-Slinging Kingpin',
    archetype: 'boss',
    maxHp: 175,
    damage: 14,
    speed: 2.1,
    scoreValue: 1100,
    skinTone: '#B87345',
    shirtColor: '#15803D',
    pantsColor: '#F5F0E1',
    gamchaColor: '#FACC15',
    hairColor: '#1C1917',
    heightScale: 1.12,
    widthScale: 1.0,
    bellyBulge: 0.1,
    hasClub: false,
    headAccessory: 'boss_turban',
    goofyEyes: false,
    buckTeeth: false,
    battleCry: 'You dare enter my lane? CHAPPAL STORM!',
    bossMoves: ['volley', 'charge', 'volley', 'summon'],
    rageLine: 'NOW YOU SEE MY FASTEST FLIP-FLOP!',
    ragePopup: 'SLIPPER RAGE!',
  },
  dhol_daku: {
    name: 'Dhol Daku',
    subtitle: 'Beat-Drop Bandit King',
    archetype: 'boss',
    maxHp: 215,
    damage: 16,
    speed: 1.95,
    scoreValue: 1500,
    skinTone: '#A8693D',
    shirtColor: '#7C2D12',
    pantsColor: '#1E3A8A',
    gamchaColor: '#EF4444',
    hairColor: '#0C0A09',
    heightScale: 1.16,
    widthScale: 1.18,
    bellyBulge: 0.18,
    hasClub: true,
    headAccessory: 'boss_turban',
    goofyEyes: false,
    buckTeeth: false,
    battleCry: 'Feel the beat, bhaiya! DHOL DROP!',
    bossMoves: ['summon', 'stomp', 'charge', 'summon'],
    rageLine: 'THE BEAT NEVER STOPS!',
    ragePopup: 'DHOL RAGE!',
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
  mama_ji: {
    name: 'Mama Ji',
    subtitle: 'Revives Fallen Cousins',
    archetype: 'thug',
    maxHp: 92,
    damage: 9,
    speed: 1.75,
    scoreValue: 520,
    skinTone: '#A26B45',
    shirtColor: '#F5F5F4', // white kurta
    pantsColor: '#E7E5E4',
    gamchaColor: '#EA580C',
    hairColor: '#E7E5E4', // white hair
    heightScale: 0.94,
    widthScale: 1.0,
    bellyBulge: 0.2,
    hasClub: true, // walking stick
    headAccessory: 'gamcha_knot',
    goofyEyes: false,
    buckTeeth: false,
    battleCry: 'Uth ja beta, Mama Ji is here!',
    trait: 'healer',
  },
  bowler_bablu: {
    name: 'Bowler Bablu',
    subtitle: 'Fast Bowling Cousin',
    archetype: 'ranged',
    maxHp: 60,
    damage: 11,
    speed: 2.6,
    scoreValue: 340,
    skinTone: '#B57749',
    shirtColor: '#F8FAFC', // cricket whites
    pantsColor: '#F1F5F9',
    gamchaColor: '#1D4ED8',
    hairColor: '#171311',
    heightScale: 1.04,
    widthScale: 0.92,
    bellyBulge: 0.02,
    hasClub: false,
    headAccessory: 'bandana',
    goofyEyes: false,
    buckTeeth: false,
    battleCry: 'HOWZAAAT! Yorker incoming!',
    trait: 'bowler',
  },
  dhaal_dinesh: {
    name: 'Dhaal Dinesh',
    subtitle: 'Shield Wall Partner',
    archetype: 'thug',
    maxHp: 104,
    damage: 11,
    speed: 1.75,
    scoreValue: 380,
    skinTone: '#9A6A44',
    shirtColor: '#0F766E',
    pantsColor: '#FACC15',
    gamchaColor: '#F97316',
    hairColor: '#1C1917',
    heightScale: 1.0,
    widthScale: 1.08,
    bellyBulge: 0.16,
    hasClub: false,
    headAccessory: 'bowl_cut',
    goofyEyes: false,
    buckTeeth: false,
    battleCry: 'Thali bhai, SHIELD WALL!',
    trait: 'shield',
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
    bossMoves: ['charge', 'stomp', 'summon', 'charge'],
    specialsAfterRage: true,
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
  // Woven cotton clothes: each cousin gets a stable pattern from his name
  const h = hashString(spec.name);
  const shirtPattern = spec.archetype === 'idiot' ? (['plain', 'check', 'stripe'] as const)[h % 3] : spec.archetype === 'boss' ? 'plain' : (['plain', 'stripe'] as const)[h % 2];
  const shirtTex = fabricTexture(spec.shirtColor, shirtPattern, spec.gamchaColor);
  const pantsTex = fabricTexture(spec.pantsColor, spec.archetype === 'idiot' && h % 4 === 1 ? 'madras' : 'plain', '#F8F4EC');
  const gamchaTex = fabricTexture(spec.gamchaColor, 'check', '#FFFFFF', 64);
  textures.push(shirtTex, pantsTex, gamchaTex);
  const shirtMat = trackFlashMat(new THREE.MeshStandardMaterial({ map: shirtTex, roughness: 0.86, metalness: 0.0 }));
  const pantsMat = trackFlashMat(new THREE.MeshStandardMaterial({ map: pantsTex, roughness: 0.88, metalness: 0.0 }));
  const gamchaMat = trackFlashMat(new THREE.MeshStandardMaterial({ map: gamchaTex, roughness: 0.84, metalness: 0.0, side: THREE.DoubleSide }));
  const shirtTrimMat = trackFlashMat(new THREE.MeshStandardMaterial({ color: new THREE.Color(spec.shirtColor).multiplyScalar(0.72), roughness: 0.85 }));
  const buttonMat = trackMat(new THREE.MeshStandardMaterial({ color: '#F5F0E6', roughness: 0.4 }));
  const beltMat = trackMat(new THREE.MeshStandardMaterial({ color: '#2A1A10', roughness: 0.55, metalness: 0.1 }));
  const strapMat = trackMat(new THREE.MeshStandardMaterial({ color: '#8B5A2B', roughness: 0.7 }));
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
  const pelvis = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.235, 0.215, 0.3, 18)), pantsMat);
  pelvis.scale.set(1.1 + spec.bellyBulge * 0.5, 1, 0.82 + spec.bellyBulge * 0.6);
  pelvis.position.y = 0.01;
  pelvis.castShadow = true;
  hips.add(pelvis);
  if (spec.archetype !== 'idiot') {
    const belt = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.245, 0.245, 0.055, 18, 1, true)), beltMat);
    belt.scale.copy(pelvis.scale);
    belt.position.y = 0.13;
    const buckle = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.07, 0.05, 0.02)), goldMat);
    buckle.position.set(0, 0.13, 0.205 * pelvis.scale.z + 0.01);
    hips.add(belt, buckle);
  }

  // Torso
  const torso = new THREE.Group();
  torso.position.y = 0.12;
  hips.add(torso);

  // One smooth torso with the belly built in (no more beach balls)
  const chest = new THREE.Mesh(trackGeo(torsoGeometry(spec.bellyBulge)), shirtMat);
  chest.castShadow = true;
  chest.receiveShadow = true;
  torso.add(chest);
  const frontZ = (y: number) => {
    const g = Math.exp(-(((y - (0.17 - spec.bellyBulge * 0.12)) / (0.15 + spec.bellyBulge * 0.35)) ** 2));
    return 0.229 * 0.78 + spec.bellyBulge * 1.3 * g;
  };

  // Shirt hem, collar, button placket
  const hem = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.205, 0.018, 6, 22)), shirtTrimMat);
  hem.rotation.x = Math.PI / 2;
  hem.scale.set(1.12 + spec.bellyBulge * 0.4, 0.78 + spec.bellyBulge * 0.9, 1);
  hem.position.y = -0.03;
  torso.add(hem);
  const collar = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.1, 0.026, 6, 16)), shirtTrimMat);
  collar.rotation.x = Math.PI / 2;
  collar.scale.set(1.1, 0.95, 1);
  collar.position.y = 0.6;
  torso.add(collar);
  const placket = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.035, 0.2, 0.012)), shirtTrimMat);
  placket.position.set(0, 0.47, frontZ(0.47) + 0.012);
  placket.rotation.x = -0.25;
  torso.add(placket);
  const buttonGeo = trackGeo(new THREE.SphereGeometry(0.012, 6, 5));
  for (const by of [0.52, 0.42, 0.3, 0.18, 0.06]) {
    const btn = new THREE.Mesh(buttonGeo, buttonMat);
    btn.position.set(0, by, frontZ(by) + 0.008);
    torso.add(btn);
  }

  // Shoulder caps so arms join the body smoothly
  const capGeo = trackGeo(new THREE.SphereGeometry(spec.archetype === 'idiot' ? 0.085 : 0.1, 12, 10));
  for (const side of [-1, 1]) {
    const capMesh = new THREE.Mesh(capGeo, spec.archetype === 'idiot' ? shirtMat : skinMat);
    capMesh.position.set(side * 0.29, 0.5, 0);
    capMesh.scale.set(1, 0.9, 0.95);
    capMesh.castShadow = true;
    torso.add(capMesh);
  }

  // Draped checked gamcha over the left shoulder, hanging down front and back
  const zF = frontZ(0.36) + 0.02;
  const gamcha = new THREE.Mesh(
    trackGeo(
      ribbonGeometry(
        [
          new THREE.Vector3(-0.15, 0.2, zF - 0.02),
          new THREE.Vector3(-0.17, 0.42, zF),
          new THREE.Vector3(-0.21, 0.6, 0.1),
          new THREE.Vector3(-0.23, 0.63, -0.04),
          new THREE.Vector3(-0.21, 0.5, -0.2),
          new THREE.Vector3(-0.18, 0.22, -0.21),
        ],
        0.13
      )
    ),
    gamchaMat
  );
  gamcha.castShadow = true;
  torso.add(gamcha);

  // Heavy gold chain for thugs & Boss Bade Tau
  if (spec.archetype !== 'idiot') {
    const chain = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.15, 0.02, 8, 20)), goldMat);
    chain.position.set(0, 0.5, 0.07);
    chain.rotation.x = Math.PI * 0.36;
    torso.add(chain);
  }

  // Boss costumes
  if (spec.name === 'BADE TAU') {
    // Maroon shawl with a gold border wrapped round the shoulders
    const shawlTex = fabricTexture('#7F1D1D', 'stripe', '#F59E0B');
    textures.push(shawlTex);
    const shawlMat = trackMat(new THREE.MeshStandardMaterial({ map: shawlTex, roughness: 0.8, side: THREE.DoubleSide }));
    const zf = frontZ(0.4) + 0.03;
    const shawl = new THREE.Mesh(
      trackGeo(
        ribbonGeometry(
          [
            new THREE.Vector3(-0.2, 0.15, zf - 0.04),
            new THREE.Vector3(-0.22, 0.45, zf),
            new THREE.Vector3(-0.28, 0.62, 0.05),
            new THREE.Vector3(0, 0.66, -0.17),
            new THREE.Vector3(0.28, 0.62, 0.05),
            new THREE.Vector3(0.22, 0.45, zf),
            new THREE.Vector3(0.2, 0.15, zf - 0.04),
          ],
          0.2
        )
      ),
      shawlMat
    );
    shawl.castShadow = true;
    torso.add(shawl);
  } else if (spec.name === 'Chappal Chaudhary') {
    // Leather bandolier loaded with spare chappals
    const zf = frontZ(0.3) + 0.025;
    const band = new THREE.Mesh(
      trackGeo(ribbonGeometry([new THREE.Vector3(-0.25, 0.56, 0.08), new THREE.Vector3(-0.12, 0.42, zf), new THREE.Vector3(0.08, 0.22, zf), new THREE.Vector3(0.24, 0.04, zf * 0.85)], 0.07)),
      strapMat
    );
    torso.add(band);
    const soleMat = trackMat(new THREE.MeshStandardMaterial({ color: '#0284C7', roughness: 0.6 }));
    const soleGeo = trackGeo(new THREE.BoxGeometry(0.06, 0.13, 0.02));
    [0.44, 0.33, 0.22, 0.11].forEach((y, k) => {
      const c = new THREE.Mesh(soleGeo, soleMat);
      c.position.set(-0.15 + k * 0.085, y, frontZ(y) + 0.04);
      c.rotation.z = 0.6;
      torso.add(c);
    });
  } else if (spec.name === 'Dhol Daku') {
    // A dhol drum slung on his hip
    const drumTex = (() => {
      const c = document.createElement('canvas');
      c.width = 128;
      c.height = 64;
      const g = c.getContext('2d')!;
      g.fillStyle = '#B91C1C';
      g.fillRect(0, 0, 128, 64);
      g.strokeStyle = '#FDE68A';
      g.lineWidth = 3;
      g.beginPath();
      for (let x = 0; x <= 128; x += 16) {
        g.moveTo(x, 4);
        g.lineTo(x + 8, 60);
        g.lineTo(x + 16, 4);
      }
      g.stroke();
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      return t;
    })();
    textures.push(drumTex);
    const drum = new THREE.Group();
    const body = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.15, 0.15, 0.36, 18, 1, true)), trackMat(new THREE.MeshStandardMaterial({ map: drumTex, roughness: 0.6, side: THREE.DoubleSide })));
    const skinHead = trackMat(new THREE.MeshStandardMaterial({ color: '#F5E6C8', roughness: 0.8 }));
    const capA = new THREE.Mesh(trackGeo(new THREE.CircleGeometry(0.15, 18)), skinHead);
    capA.position.y = 0.18;
    capA.rotation.x = -Math.PI / 2;
    const capB = new THREE.Mesh(trackGeo(new THREE.CircleGeometry(0.15, 18)), skinHead);
    capB.position.y = -0.18;
    capB.rotation.x = Math.PI / 2;
    drum.add(body, capA, capB);
    drum.rotation.z = Math.PI / 2;
    drum.position.set(0.12, 0.08, frontZ(0.08) + 0.12);
    torso.add(drum);
    const zf = frontZ(0.35) + 0.02;
    const strap = new THREE.Mesh(
      trackGeo(ribbonGeometry([new THREE.Vector3(-0.25, 0.58, 0.05), new THREE.Vector3(-0.1, 0.4, zf), new THREE.Vector3(0.08, 0.2, zf + 0.04)], 0.05)),
      trackMat(new THREE.MeshStandardMaterial({ color: '#FACC15', roughness: 0.7, side: THREE.DoubleSide }))
    );
    torso.add(strap);
  }

  // Neck
  const neck = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.078, 0.1, 0.2, 12)), skinMat);
  neck.position.y = 0.66;
  torso.add(neck);

  // ── HILARIOUS EXPRESSIVE 3D HEAD ────────────────────────────────────────────
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.84, 0.02);
  torso.add(headGroup);

  const cranium = new THREE.Mesh(trackGeo(headGeometry(0.2)), faceSkinMat);
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

  if (spec.archetype !== 'idiot') {
    // five o'clock shadow on the jaw (same head shape, slightly larger, lower part only)
    const stubble = new THREE.Mesh(
      trackGeo(headGeometry(0.204, Math.PI * 0.56, Math.PI * 0.44)),
      trackMat(new THREE.MeshStandardMaterial({ color: spec.hairColor, transparent: true, opacity: 0.3, depthWrite: false, roughness: 1 }))
    );
    headGroup.add(stubble);
  }

  // Bulbous nose with a bridge
  const nose = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.05, 12, 10)), faceSkinMat);
  nose.position.set(0, -0.012, 0.212);
  nose.scale.set(0.95, 1.0, 1.05);
  const bridge = new THREE.Mesh(trackGeo(new THREE.CapsuleGeometry(0.022, 0.06, 4, 8)), faceSkinMat);
  bridge.position.set(0, 0.04, 0.198);
  bridge.rotation.x = -0.3;
  headGroup.add(nose, bridge);

  // Eyes: whites, brown iris, pupil, a sparkle, and eyelids that set the mood
  const eyeR = spec.goofyEyes ? 0.05 : 0.04;
  const eyeGeo = trackGeo(new THREE.SphereGeometry(eyeR, 14, 10));
  const irisGeo = trackGeo(new THREE.SphereGeometry(eyeR * 0.55, 12, 8));
  const pupilGeo = trackGeo(new THREE.SphereGeometry(eyeR * 0.3, 8, 6));
  const glintGeo = trackGeo(new THREE.SphereGeometry(eyeR * 0.14, 6, 4));
  const lidGeo = trackGeo(new THREE.SphereGeometry(eyeR * 1.14, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2));
  const irisMat = trackMat(new THREE.MeshStandardMaterial({ color: '#4A2C17', roughness: 0.35 }));
  const glintMat = trackMat(new THREE.MeshBasicMaterial({ color: '#FFFFFF' }));
  [-1, 1].forEach((side) => {
    const eye = new THREE.Group();
    eye.position.set(side * 0.072, 0.045, 0.165);
    const white = new THREE.Mesh(eyeGeo, eyeWhiteMat);
    white.scale.set(1, 1, 0.75);
    eye.add(white);
    // goofy cousins look slightly in different directions
    const look = spec.goofyEyes ? (side < 0 ? new THREE.Vector2(0.012, 0.008) : new THREE.Vector2(-0.01, -0.01)) : new THREE.Vector2(0, -0.004);
    const iris = new THREE.Mesh(irisGeo, irisMat);
    iris.position.set(look.x, look.y, eyeR * 0.62);
    iris.scale.set(1, 1, 0.5);
    const pupil = new THREE.Mesh(pupilGeo, pupilMat);
    pupil.position.set(look.x, look.y, eyeR * 0.82);
    pupil.scale.set(1, 1, 0.5);
    const glint = new THREE.Mesh(glintGeo, glintMat);
    glint.position.set(look.x + eyeR * 0.2, look.y + eyeR * 0.25, eyeR * 0.9);
    eye.add(iris, pupil, glint);
    // upper lid: angry and low for thugs, wide open for idiots
    const lid = new THREE.Mesh(lidGeo, faceSkinMat);
    lid.rotation.set(spec.goofyEyes ? -0.55 : 0.35, 0, spec.goofyEyes ? side * 0.15 : -side * 0.38);
    eye.add(lid);
    headGroup.add(eye);
  });

  // Brows: curved, angry V for thugs, raised and crooked for idiots
  const browMat = hairMat;
  [-1, 1].forEach((side) => {
    const pts = spec.goofyEyes
      ? [
          new THREE.Vector3(side * 0.125, 0.11 + (side > 0 ? -0.012 : 0), 0.16),
          new THREE.Vector3(side * 0.078, 0.142 + (side > 0 ? -0.015 : 0), 0.188),
          new THREE.Vector3(side * 0.032, 0.122 + (side > 0 ? -0.012 : 0), 0.198),
        ]
      : [
          new THREE.Vector3(side * 0.128, 0.122, 0.158),
          new THREE.Vector3(side * 0.08, 0.112, 0.19),
          new THREE.Vector3(side * 0.03, 0.084, 0.2),
        ];
    const brow = new THREE.Mesh(trackGeo(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, spec.archetype === 'boss' ? 0.02 : 0.015, 6)), browMat);
    headGroup.add(brow);
  });

  // Shaped moustache: two curved strands from under the nose, handlebar curls for bosses, lopsided for idiots
  const stacheR = spec.archetype === 'boss' ? 0.026 : 0.02;
  const capGeoStache = trackGeo(new THREE.SphereGeometry(stacheR, 8, 6));
  [-1, 1].forEach((side) => {
    const droop = spec.goofyEyes && side > 0 ? -0.018 : 0;
    const pts = [
      new THREE.Vector3(side * 0.006, -0.058, 0.226),
      new THREE.Vector3(side * 0.05, -0.066 + droop, 0.218),
      new THREE.Vector3(side * 0.095, -0.08 + droop * 1.5, 0.19),
    ];
    if (spec.archetype === 'boss') {
      pts.push(new THREE.Vector3(side * 0.13, -0.06, 0.165), new THREE.Vector3(side * 0.128, -0.022, 0.16));
    } else if (!spec.goofyEyes) {
      pts.push(new THREE.Vector3(side * 0.112, -0.1, 0.17));
    }
    const strand = new THREE.Mesh(trackGeo(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 14, stacheR, 7)), hairMat);
    const tip = new THREE.Mesh(capGeoStache, hairMat);
    tip.position.copy(pts[pts.length - 1]);
    headGroup.add(strand, tip);
  });

  // Mouth: a dark grin with a row of teeth; buck teeth for the idiots
  const mouth = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.05, 14, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2)), mouthMat);
  mouth.position.set(0, -0.105, 0.19);
  mouth.scale.set(1.25, 0.6, 0.45);
  headGroup.add(mouth);
  const teethRow = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.085, 0.016, 0.012)), toothMat);
  teethRow.position.set(0, -0.11, 0.21);
  headGroup.add(teethRow);
  if (spec.buckTeeth) {
    const toothGeo = trackGeo(new THREE.SphereGeometry(0.02, 8, 6));
    [-1, 1].forEach((side) => {
      const t = new THREE.Mesh(toothGeo, toothMat);
      t.position.set(side * 0.018, -0.125, 0.212);
      t.scale.set(0.85, 1.35, 0.5);
      t.rotation.z = side * -0.08;
      headGroup.add(t);
    });
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
  const beefy = spec.archetype === 'idiot' ? 1 : 1.18;
  const upperArmGeo = trackGeo(limbGeometry(0.072 * beefy, 0.06 * beefy, 0.27));
  const foreArmGeo = trackGeo(limbGeometry(0.06 * beefy, 0.045 * beefy, 0.22));
  const sleeveGeo = trackGeo(new THREE.CylinderGeometry(0.088, 0.083, 0.17, 14, 1, true));
  const sleeveHemGeo = trackGeo(new THREE.TorusGeometry(0.084, 0.012, 6, 14));
  const fistGeos = makeFistGeos(trackGeo);
  const elbowCapGeo = trackGeo(new THREE.SphereGeometry(0.06 * beefy, 10, 8));

  const buildArm = (side: -1 | 1) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.31, 0.5, 0);
    torso.add(shoulder);

    const upper = new THREE.Mesh(upperArmGeo, skinMat);
    upper.castShadow = true;
    shoulder.add(upper);
    if (spec.archetype === 'idiot') {
      // half sleeve
      const sleeve = new THREE.Mesh(sleeveGeo, shirtMat);
      sleeve.position.y = -0.07;
      const sleeveHem = new THREE.Mesh(sleeveHemGeo, shirtTrimMat);
      sleeveHem.rotation.x = Math.PI / 2;
      sleeveHem.position.y = -0.155;
      shoulder.add(sleeve, sleeveHem);
    }

    const elbow = new THREE.Group();
    elbow.position.y = -0.31;
    shoulder.add(elbow);

    const elbowCap = new THREE.Mesh(elbowCapGeo, skinMat);
    elbow.add(elbowCap);
    const fore = new THREE.Mesh(foreArmGeo, skinMat);
    fore.castShadow = true;
    elbow.add(fore);

    const fist = fistGroup(fistGeos, skinMat);
    fist.position.y = -0.22;
    fist.scale.setScalar(beefy);
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

  // Steel thali shield on the left forearm
  if (spec.trait === 'shield') {
    const steel = trackMat(new THREE.MeshStandardMaterial({ color: '#D1D5DB', roughness: 0.28, metalness: 0.85 }));
    const shield = new THREE.Group();
    shield.position.set(0, -0.2, 0.12);
    shield.rotation.x = Math.PI / 2;
    const plate = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.34, 0.34, 0.03, 28)), steel);
    plate.castShadow = true;
    const rim = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.34, 0.025, 8, 28)), steel);
    rim.rotation.x = Math.PI / 2;
    const boss = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.07, 12, 10)), goldMat);
    boss.position.y = 0.03;
    boss.scale.y = 0.6;
    shield.add(plate, rim, boss);
    leftArm.elbow.add(shield);
  }

  // ── ARTICULATED LEGS ────────────────────────────────────────────────────────
  const thighGeo = trackGeo(limbGeometry(0.105, 0.082, 0.4));
  const shinGeo = trackGeo(limbGeometry(0.074, 0.052, 0.36));
  const clothShinGeo = trackGeo(limbGeometry(0.086, 0.072, 0.36));
  const shortsHemGeo = trackGeo(new THREE.TorusGeometry(0.098, 0.014, 6, 14));
  const footGeos = makeFootGeos(trackGeo);
  const kneeCapGeo = trackGeo(new THREE.SphereGeometry(0.084, 10, 8));

  const buildLeg = (side: -1 | 1) => {
    const hip = new THREE.Group();
    hip.position.set(side * 0.13, -0.06, 0);
    hips.add(hip);

    const thigh = new THREE.Mesh(thighGeo, pantsMat);
    thigh.castShadow = true;
    hip.add(thigh);

    const knee = new THREE.Group();
    knee.position.y = -0.42;
    hip.add(knee);

    const kneeCap = new THREE.Mesh(kneeCapGeo, spec.archetype === 'idiot' ? skinMat : pantsMat);
    kneeCap.scale.set(0.95, 0.9, 1);
    knee.add(kneeCap);

    if (spec.archetype === 'idiot') {
      // knee-length shorts: bare shins
      const hemRing = new THREE.Mesh(shortsHemGeo, pantsMat);
      hemRing.rotation.x = Math.PI / 2;
      hemRing.position.y = -0.36;
      hip.add(hemRing);
      const shin = new THREE.Mesh(shinGeo, skinMat);
      shin.castShadow = true;
      knee.add(shin);
    } else {
      const shin = new THREE.Mesh(clothShinGeo, pantsMat);
      shin.castShadow = true;
      knee.add(shin);
    }

    const foot = chappalFoot(footGeos, skinMat, sandalMat, strapMat);
    foot.position.set(0, -0.36, 0);
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
    const bike = buildRajuBike(trackGeo, trackMat, (t) => {
      textures.push(t);
      return t;
    });
    bikeGroup = bike.group;
    bikeWheels = bike.wheels;
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
  rig.torso.scale.set(1, 1, 1);
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
    // Each cousin gets his own rhythm so a crowd never moves in sync
    const t = time + (rig.root.id % 11) * 0.53;
    const bob = Math.sin(t * (isIdiot ? 6.2 : 4.4));
    const sway = Math.sin(t * (isIdiot ? 3.1 : 2.2));
    rig.torso.scale.set(1, 1 + Math.sin(t * 2.6) * 0.018, 1);
    if (isIdiot) {
      // goofy weight shuffle, loose arms, head wobble
      rig.hips.position.set(sway * 0.05, 0.92 + Math.abs(bob) * 0.03, 0);
      rig.hips.rotation.z = sway * 0.06;
      rig.leftKnee.rotation.x = 0.12 + Math.max(0, sway) * 0.35;
      rig.rightKnee.rotation.x = 0.12 + Math.max(0, -sway) * 0.35;
      rig.torso.rotation.z = sway * 0.09;
      rig.headGroup.rotation.z = Math.sin(t * 5.2) * 0.16;
      rig.headGroup.rotation.y = Math.sin(t * 1.7) * 0.25;
      rig.leftShoulder.rotation.set(-0.5 + bob * 0.18, 0, -0.25 - sway * 0.1);
      rig.rightShoulder.rotation.set(-0.6 - bob * 0.18, 0, 0.25 - sway * 0.1);
      rig.leftElbow.rotation.x = -0.5 + bob * 0.1;
      rig.rightElbow.rotation.x = -0.6 - bob * 0.1;
    } else {
      // street-fighter guard: fists up, bouncing on the balls of the feet
      const hop = Math.abs(Math.sin(t * 4.4));
      rig.hips.position.set(sway * 0.025, 0.9 + hop * 0.035, 0);
      rig.hips.rotation.z = sway * 0.03;
      rig.leftKnee.rotation.x = 0.22 + hop * 0.1;
      rig.rightKnee.rotation.x = 0.22 + hop * 0.1;
      rig.torso.rotation.x = 0.06;
      rig.torso.rotation.z = -sway * 0.03;
      rig.headGroup.rotation.x = -0.05 + bob * 0.03;
      rig.headGroup.rotation.y = Math.sin(t * 1.3) * 0.12;
      rig.leftShoulder.rotation.set(-1.05 + bob * 0.06, 0, -0.2);
      rig.leftElbow.rotation.x = -1.75 + bob * 0.05;
      rig.rightShoulder.rotation.set(-0.95 - bob * 0.06, 0, 0.2);
      rig.rightElbow.rotation.x = -1.6 - bob * 0.05;
    }
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
  } else if (action === 'block') {
    // Forearms crossed in front of the face, chin tucked, braced stance
    rig.hips.position.y = 0.88;
    rig.hips.position.z = -0.04;
    rig.torso.rotation.x = 0.18;
    rig.headGroup.rotation.x = 0.22;
    rig.leftShoulder.rotation.set(-1.75, 0, 0.55);
    rig.rightShoulder.rotation.set(-1.75, 0, -0.55);
    rig.leftElbow.rotation.x = -1.55;
    rig.rightElbow.rotation.x = -1.55;
    rig.leftHip.rotation.x = 0.28;
    rig.rightHip.rotation.x = -0.18;
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

/** Raju's red Splendor motorbike (front is +Z). Shared by Raju and the parked/rideable street bike. */
export function buildRajuBike(
  trackGeo: <T extends THREE.BufferGeometry>(g: T) => T,
  trackMat: <T extends THREE.Material>(m: T) => T,
  trackTex: <T extends THREE.Texture>(t: T) => T
): { group: THREE.Group; wheels: THREE.Mesh[] } {
  const bikeGroup = new THREE.Group();
  const bikeWheels: THREE.Mesh[] = [];
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

  const engineMat = trackMat(new THREE.MeshStandardMaterial({ color: '#3F3F46', roughness: 0.5, metalness: 0.6 }));
  // Wheels: tyre, chrome rim, hub and spokes (spin with the tyre)
  const tyreGeo = trackGeo(new THREE.TorusGeometry(0.29, 0.065, 10, 26));
  const rimGeo = trackGeo(new THREE.TorusGeometry(0.235, 0.014, 6, 24));
  const hubGeo = trackGeo(new THREE.CylinderGeometry(0.05, 0.05, 0.1, 12));
  const spokeGeo = trackGeo(new THREE.BoxGeometry(0.008, 0.46, 0.008));
  const makeWheel = (z: number) => {
    const tyre = new THREE.Mesh(tyreGeo, tireMat);
    tyre.position.set(0, 0.34, z);
    tyre.rotation.y = Math.PI / 2;
    tyre.castShadow = true;
    const rim = new THREE.Mesh(rimGeo, chrome);
    const hub = new THREE.Mesh(hubGeo, chrome);
    hub.rotation.x = Math.PI / 2;
    tyre.add(rim, hub);
    for (let k = 0; k < 6; k++) {
      const sp = new THREE.Mesh(spokeGeo, chrome);
      sp.rotation.z = (k * Math.PI) / 6;
      tyre.add(sp);
    }
    bikeWheels!.push(tyre);
    bikeGroup!.add(tyre);
    // mudguard arc over the top
    const guard = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.34, 0.03, 6, 16, Math.PI)), bikeRed);
    guard.position.set(0, 0.34, z);
    guard.rotation.y = Math.PI / 2;
    bikeGroup!.add(guard);
  };
  makeWheel(0.62);
  makeWheel(-0.58);

  // Frame tubes
  const tube = (pts: [number, number, number][], r: number, mat: THREE.Material) => {
    const m = new THREE.Mesh(trackGeo(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((q) => new THREE.Vector3(...q))), 12, r, 8)), mat);
    m.castShadow = true;
    bikeGroup!.add(m);
  };
  tube([[0, 1.0, 0.46], [0, 0.66, 0.2], [0, 0.42, -0.05]], 0.032, bikeRed); // down tube
  tube([[0, 1.0, 0.46], [0, 0.88, 0.05], [0, 0.82, -0.32]], 0.028, bikeRed); // top tube
  tube([[0, 0.42, -0.05], [0, 0.38, -0.3], [0, 0.34, -0.58]], 0.026, bikeRed); // swing arm
  for (const x of [-0.06, 0.06]) tube([[x, 1.02, 0.46], [x, 0.7, 0.55], [x, 0.34, 0.62]], 0.022, chrome); // front forks
  tube([[0.14, 0.44, 0.12], [0.16, 0.4, -0.2], [0.15, 0.42, -0.72]], 0.03, chrome); // exhaust

  // Tank, seat, engine
  const tank = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.2, 16, 12)), bikeRed);
  tank.position.set(0, 0.92, 0.18);
  tank.scale.set(0.82, 0.62, 1.25);
  tank.castShadow = true;
  const seat = new THREE.Mesh(trackGeo(new THREE.CapsuleGeometry(0.085, 0.36, 4, 10)), tireMat);
  seat.rotation.x = Math.PI / 2;
  seat.position.set(0, 0.88, -0.27);
  seat.scale.set(1.3, 1, 0.9);
  const engine = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.2, 0.22, 0.3)), engineMat);
  engine.position.set(0, 0.5, 0.06);
  engine.castShadow = true;

  // Handlebar, grips, mirrors, headlight
  const bar = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.018, 0.018, 0.66, 8)), chrome);
  bar.rotation.z = Math.PI / 2;
  bar.position.set(0, 1.08, 0.48);
  const gripGeo = trackGeo(new THREE.CylinderGeometry(0.026, 0.026, 0.12, 8));
  for (const x of [-0.3, 0.3]) {
    const grip = new THREE.Mesh(gripGeo, tireMat);
    grip.rotation.z = Math.PI / 2;
    grip.position.set(x, 1.08, 0.48);
    const mirror = new THREE.Mesh(trackGeo(new THREE.CircleGeometry(0.04, 10)), chrome);
    mirror.position.set(x * 0.8, 1.26, 0.45);
    const stem = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.006, 0.006, 0.18, 4)), chrome);
    stem.position.set(x * 0.8, 1.17, 0.46);
    bikeGroup.add(grip, mirror, stem);
  }
  const lampBody = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.085, 0.075, 0.1, 14)), chrome);
  lampBody.rotation.x = Math.PI / 2;
  lampBody.position.set(0, 0.98, 0.6);
  const headlight = new THREE.Mesh(trackGeo(new THREE.CircleGeometry(0.072, 14)), lightMat);
  headlight.position.set(0, 0.98, 0.652);

  // Number plate
  const plateCanvas = document.createElement('canvas');
  plateCanvas.width = 128;
  plateCanvas.height = 48;
  const pg = plateCanvas.getContext('2d')!;
  pg.fillStyle = '#FEF08A';
  pg.fillRect(0, 0, 128, 48);
  pg.fillStyle = '#111';
  pg.font = 'bold 30px sans-serif';
  pg.textAlign = 'center';
  pg.textBaseline = 'middle';
  pg.fillText('RAJU 1', 64, 26);
  const plateTex = new THREE.CanvasTexture(plateCanvas);
  plateTex.colorSpace = THREE.SRGBColorSpace;
  trackTex(plateTex);
  const plate = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(0.22, 0.08)), trackMat(new THREE.MeshBasicMaterial({ map: plateTex, side: THREE.DoubleSide })));
  plate.position.set(0, 0.62, -0.84);
  plate.rotation.y = Math.PI;

  bikeGroup.add(tank, seat, engine, bar, lampBody, headlight, plate);
  return { group: bikeGroup, wheels: bikeWheels };
}
