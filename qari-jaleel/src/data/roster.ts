import {
  FighterAppearance,
  FighterArchetype,
  FighterProfile,
  FightingStyle,
  LowerOutfitStyle,
  StageConfig,
  StageId,
} from '../types/game';

export const STAGE_CONFIGS: StageConfig[] = [
  {
    id: 'banyan_akhara',
    name: 'Banyan Akhara',
    subtitle: 'Earthen Wrestling Pit',
    timeOfDay: 'Golden Hour',
    backdropUrl: '/src/assets/images/stage_banyan_akhara_1795100646521.jpg',
    skyColor: '#C87E46',
    fogColor: '#A8663B',
    groundColor: '#8B4527',
    ringRimColor: '#69341D',
    accentColor: '#F59E0B',
  },
  {
    id: 'chai_chowk',
    name: 'Chai Chowk',
    subtitle: 'Village Bazaar Square',
    timeOfDay: 'Midday Sun',
    backdropUrl: '/src/assets/images/stage_chai_chowk_1795100648259.jpg',
    skyColor: '#7CB3D9',
    fogColor: '#D6B892',
    groundColor: '#B58D60',
    ringRimColor: '#8F6A43',
    accentColor: '#0D9488',
  },
  {
    id: 'mela_dusk',
    name: 'Mela Dusk',
    subtitle: 'Lantern Festival Ground',
    timeOfDay: 'Twilight',
    backdropUrl: '/src/assets/images/stage_mela_dusk_1795100683730.jpg',
    skyColor: '#1E2542',
    fogColor: '#25263D',
    groundColor: '#5B4030',
    ringRimColor: '#3E2B20',
    accentColor: '#DC2626',
  },
];

export function getStageById(id: StageId): StageConfig {
  return STAGE_CONFIGS.find((s) => s.id === id) ?? STAGE_CONFIGS[0];
}

export const ARCHETYPE_INFO: Record<
  FighterArchetype,
  {
    label: string;
    style: string;
    description: string;
    baseStats: { power: number; speed: number; reach: number; defense: number };
    defaultSpecial: string;
  }
> = {
  striker: {
    label: 'Akhara Striker',
    style: 'Balanced Martial Arts',
    description: 'Fluid 3-hit punch combos, crisp kicks, and fast sidesteps.',
    baseStats: { power: 7, speed: 8, reach: 7, defense: 7 },
    defaultSpecial: 'Monsoon Cyclone Rush',
  },
  kicker: {
    label: 'Kalaripayattu Flow',
    style: 'Acrobatic Kicks & Sweeps',
    description: 'Long-reach kicks, rapid low sweeps, and agile footwork.',
    baseStats: { power: 6, speed: 9, reach: 9, defense: 6 },
    defaultSpecial: 'Banyan Tempest Kick',
  },
  pehelwan: {
    label: 'Kushti Pehelwan',
    style: 'Heavy Power & Grapples',
    description: 'Devastating heavy hooks, crushing throws, and iron toughness.',
    baseStats: { power: 10, speed: 5, reach: 7, defense: 9 },
    defaultSpecial: 'Earthshaker Mud Slam',
  },
  boxer: {
    label: 'Bazaar Counter-Boxer',
    style: 'Precision Boxing & Guard',
    description: 'Tight defensive guard, lightning jabs, and punishing uppercuts.',
    baseStats: { power: 8, speed: 8, reach: 6, defense: 8 },
    defaultSpecial: 'Kettle Steam Uppercut',
  },
};

export const FIGHTING_STYLES: Record<
  FightingStyle,
  {
    label: string;
    shortLabel: string;
    description: string;
    signatureMove: string;
    color: string;
  }
> = {
  bollywood_hero: {
    label: 'Bollywood Hero',
    shortLabel: 'Bollywood',
    description: 'Wide-arc open-hand THAPPAD slaps that send multiple cousins spinning + flying dropkick.',
    signatureMove: 'Multi-Cousin Thappad & Flying Dropkick',
    color: '#F59E0B',
  },
  kushti_pehelwan: {
    label: 'Kushti Pehelwan',
    shortLabel: 'Kushti',
    description: 'Low wrestling stance, armored shoulder tackle on Heavy, and shockwave ground slam.',
    signatureMove: 'Armored Shoulder Tackle & Shockwave Slam',
    color: '#EF4444',
  },
  kalari_kicker: {
    label: 'Kalaripayattu',
    shortLabel: 'Kalari',
    description: 'Bouncy acrobatic stance, lightning flying knee lunge, and spinning tornado roundhouse.',
    signatureMove: 'Flying Knee & Tornado Spin Kick',
    color: '#14B8A6',
  },
  street_boxer: {
    label: 'Desi Street Boxer',
    shortLabel: 'Boxer',
    description: 'Tight bob-and-weave guard, rapid 4-hit jab-cross-body-uppercut flurry.',
    signatureMove: '4-Hit Bob & Weave Uppercut Flurry',
    color: '#38BDF8',
  },
  weapon_master: {
    label: 'Weapon Master',
    shortLabel: 'Weapons',
    description: '360° crowd-cleaving spin sweeps with Lathi & Chairs + extra weapon durability.',
    signatureMove: '360° Crowd-Clear Weapon Cyclone',
    color: '#A855F7',
  },
};

export function resolveFighterStyle(profile: FighterProfile): FightingStyle {
  if (profile.fightingStyle) return profile.fightingStyle;
  switch (profile.id) {
    case 'qari_jaleel':
      return 'weapon_master';
    case 'rebel_aviator':
      return 'kushti_pehelwan';
    case 'rebel_tactician':
      return 'bollywood_hero';
    case 'rebel_enforcer':
      return 'street_boxer';
    case 'rebel_striker':
      return 'bollywood_hero';
    case 'rebel_shadow':
      return 'kalari_kicker';
    default:
      if (profile.archetype === 'pehelwan') return 'kushti_pehelwan';
      if (profile.archetype === 'kicker') return 'kalari_kicker';
      if (profile.archetype === 'boxer') return 'street_boxer';
      return 'bollywood_hero';
  }
}

export function resolveLowerOutfitStyle(appearance: FighterAppearance): LowerOutfitStyle {
  if (appearance.lowerOutfitStyle) return appearance.lowerOutfitStyle;
  return appearance.plaidLungi ? 'split_dhoti' : 'rolled_trousers';
}

export function createStarterRoster(): FighterProfile[] {
  return [
    {
      id: 'qari_jaleel',
      name: "Qari 'Fady' Jaleel",
      nickname: 'The Rebel Axe',
      isCustom: false,
      archetype: 'pehelwan',
      portraitUrl: '/src/assets/images/qari_jaleel_hero_1795104584255.jpg',
      portraitFaceRect: { cx: 0.505, cy: 0.315, size: 0.3 },
      appearance: {
        skinTone: '#BE7D4E',
        vestColor: '#6E5B3C',
        pantsColor: '#34426A',
        wrapColor: '#E5DCCB',
        hairColor: '#151210',
        headgear: 'none',
        buildScale: 0.92,
        bald: false,
        lowerOutfitStyle: 'split_dhoti',
        plaidLungi: true,
        hasAxe: true,
      },
      stats: { power: 10, speed: 7, reach: 9, defense: 8 },
      specialMoveName: 'Smoke Break Chair Smash',
      taunt: 'The rebellion begins right here in the village dust.',
      wins: 0,
    },
    {
      id: 'rebel_aviator',
      name: "Sardar 'Saf' Chauhan",
      nickname: 'Gold Aviator',
      isCustom: false,
      archetype: 'boxer',
      portraitUrl: '/src/assets/images/rebel_aviator_boss_1795104578513.jpg',
      portraitFaceRect: { cx: 0.5, cy: 0.355, size: 0.42 },
      appearance: {
        skinTone: '#C8895C',
        vestColor: '#E4D6BA',
        pantsColor: '#8A7558',
        wrapColor: '#F59E0B',
        hairColor: '#7A7874',
        headgear: 'sunglasses',
        buildScale: 1.06,
        bald: false,
        lowerOutfitStyle: 'pathani_salwar',
        plaidLungi: false,
      },
      stats: { power: 9, speed: 7, reach: 7, defense: 9 },
      specialMoveName: 'Bone-Crusher Bear Hug',
      taunt: 'Not a scratch on the aviators—bring your whole squad.',
      wins: 0,
    },
    {
      id: 'rebel_tactician',
      name: "Dara 'Jav' Malik",
      nickname: 'The Tactician',
      isCustom: false,
      archetype: 'boxer',
      portraitUrl: '/src/assets/images/rebel_glasses_tactician_1795104809936.jpg',
      portraitFaceRect: { cx: 0.502, cy: 0.222, size: 0.22 },
      appearance: {
        skinTone: '#C58657',
        vestColor: '#4C2B23',
        pantsColor: '#40624A',
        wrapColor: '#F3EDE0',
        hairColor: '#181412',
        headgear: 'glasses',
        buildScale: 1.14,
        bald: false,
        lowerOutfitStyle: 'split_dhoti',
        plaidLungi: true,
      },
      stats: { power: 7, speed: 9, reach: 7, defense: 8 },
      specialMoveName: 'Storytime Mega Slap',
      taunt: 'I read your next three moves before the bell even rang.',
      wins: 0,
    },
    {
      id: 'rebel_enforcer',
      name: "Sher 'Jam' Thakur",
      nickname: 'Red Lungi',
      isCustom: false,
      archetype: 'striker',
      portraitUrl: '/src/assets/images/rebel_left_bald_1795104569340.jpg',
      portraitFaceRect: { cx: 0.502, cy: 0.205, size: 0.23 },
      appearance: {
        skinTone: '#C48456',
        vestColor: '#EEE7D8',
        pantsColor: '#8F3124',
        wrapColor: '#F3EDE0',
        hairColor: '#1A1512',
        headgear: 'none',
        buildScale: 0.92,
        bald: true,
        lowerOutfitStyle: 'split_dhoti',
        plaidLungi: true,
      },
      stats: { power: 8, speed: 8, reach: 8, defense: 7 },
      specialMoveName: 'Snooker Cue Beatdown',
      taunt: 'Arms uncrossed means the fight is already finished.',
      wins: 0,
    },
    {
      id: 'rebel_striker',
      name: "Sultan 'Chet' Rathore",
      nickname: 'Stone Cold',
      isCustom: false,
      archetype: 'kicker',
      portraitUrl: '/src/assets/images/rebel_center_bald_1795104619931.jpg',
      portraitFaceRect: { cx: 0.505, cy: 0.215, size: 0.23 },
      appearance: {
        skinTone: '#BD7E50',
        vestColor: '#BDB5A8',
        pantsColor: '#364764',
        wrapColor: '#E2E8F0',
        hairColor: '#191412',
        headgear: 'none',
        buildScale: 1.0,
        bald: true,
        lowerOutfitStyle: 'split_dhoti',
        plaidLungi: true,
      },
      stats: { power: 7, speed: 9, reach: 9, defense: 6 },
      specialMoveName: 'Red Ford Runover',
      taunt: 'Blink once and you are kissing the akhara clay.',
      wins: 0,
    },
    {
      id: 'rebel_shadow',
      name: "Ustad 'Immy' Mirza",
      nickname: 'The Enforcer',
      isCustom: false,
      archetype: 'pehelwan',
      portraitUrl: '/src/assets/images/rebel_right_bald_1795104552522.jpg',
      portraitFaceRect: { cx: 0.595, cy: 0.375, size: 0.43 },
      appearance: {
        skinTone: '#AE6F43',
        vestColor: '#DCCFB6',
        pantsColor: '#6B4A2C',
        wrapColor: '#DC2626',
        hairColor: '#161210',
        headgear: 'none',
        buildScale: 0.82,
        bald: true,
        lowerOutfitStyle: 'split_dhoti',
        plaidLungi: true,
      },
      stats: { power: 9, speed: 6, reach: 8, defense: 9 },
      specialMoveName: 'Three Girls Fan Squad',
      taunt: 'You stepped into the wrong rebellion tonight.',
      wins: 0,
    },
  ];
}

// Instant zero-API-key Indian village persona generator for imported friends
const VILLAGE_NICKNAMES = [
  'Samosa Crusher',
  'Monsoon Thunder',
  'Chai Express',
  'Banyan Titan',
  'Lassi Lightning',
  'Tractor Turbo',
  'Mela Menace',
  'Dhol Breaker',
  'Panchayat Boss',
  'Mango Cyclone',
  'Gully Legend',
  'Kite Slicer',
];

const VILLAGE_SPECIALS = [
  'Tandoori Tornado Uppercut',
  'Monsoon Thunder Kick',
  'Banyan Root Slam',
  'Midnight Dhol Rush',
  'Bazaar Lightning Flurry',
  'Red Clay Meteor Strike',
  'Chai Kettle Crusher',
  'Festival Firework Finisher',
];

const VILLAGE_TAUNTS = [
  'The whole village came out just to watch me take this round!',
  'Better grab some extra chai—you will need the energy.',
  'From the narrow lanes to the akhara pit, nobody out-steps me.',
  'Even the banyan tree shook when that combo landed!',
  'Bring the entire squad next time—I am just warming up.',
  'My footwork is faster than the morning milk cart.',
];

export function generateVillagePersona(archetype: FighterArchetype): {
  nickname: string;
  specialMoveName: string;
  taunt: string;
} {
  const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
  const specialPool = [...VILLAGE_SPECIALS, ARCHETYPE_INFO[archetype].defaultSpecial];
  return {
    nickname: pick(VILLAGE_NICKNAMES),
    specialMoveName: pick(specialPool),
    taunt: pick(VILLAGE_TAUNTS),
  };
}
