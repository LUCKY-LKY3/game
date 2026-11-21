import { FighterProfile } from '../types/game';

export interface Fighter3DConfig {
  id: string;
  name: string;
  alias: string;
  posterCrop: [number, number, number, number];
  headwear: 'none' | 'turban_red' | 'bald';
  eyewear: 'none' | 'gold_aviators' | 'black_frames';
  facialHair: 'thick_mustache_stubble' | 'full_beard' | 'trimmed_beard' | 'goatee_beard';
  skinToneHex: string;
  skullScale: [number, number, number];
  hairColorHex?: string;
}

export const FIGHTER_3D_PROFILES: Record<string, Fighter3DConfig> = {
  qari: {
    id: 'qari',
    name: "Qari 'Fady' Jaleel",
    alias: 'The Rebel Axe',
    posterCrop: [0.02, 0.32, 0.18, 0.25],
    headwear: 'none',
    eyewear: 'none',
    facialHair: 'thick_mustache_stubble',
    skinToneHex: '#c68b59',
    skullScale: [1.0, 1.05, 1.0],
    hairColorHex: '#151210',
  },
  sardar: {
    id: 'sardar',
    name: "Sardar 'Saf' Chauhan",
    alias: 'Gold Aviator',
    posterCrop: [0.21, 0.32, 0.18, 0.25],
    headwear: 'turban_red',
    eyewear: 'gold_aviators',
    facialHair: 'full_beard',
    skinToneHex: '#b97a4b',
    skullScale: [1.08, 1.02, 1.05],
    hairColorHex: '#5e5b58',
  },
  ustad: {
    id: 'ustad',
    name: "Ustad 'Immy' Mirza",
    alias: 'The Enforcer',
    posterCrop: [0.40, 0.32, 0.18, 0.25],
    headwear: 'none',
    eyewear: 'black_frames',
    facialHair: 'trimmed_beard',
    skinToneHex: '#c88d5d',
    skullScale: [0.98, 1.03, 0.98],
    hairColorHex: '#161210',
  },
  sultan: {
    id: 'sultan',
    name: "Sultan 'Chet' Rathore",
    alias: 'Stone Cold',
    posterCrop: [0.59, 0.32, 0.18, 0.25],
    headwear: 'bald',
    eyewear: 'none',
    facialHair: 'trimmed_beard',
    skinToneHex: '#c28554',
    skullScale: [1.04, 1.04, 1.02],
    hairColorHex: '#191412',
  },
  sher: {
    id: 'sher',
    name: "Sher 'Jam' Thakur",
    alias: 'Red Lungi',
    posterCrop: [0.78, 0.32, 0.18, 0.25],
    headwear: 'bald',
    eyewear: 'none',
    facialHair: 'goatee_beard',
    skinToneHex: '#b57647',
    skullScale: [0.97, 1.06, 0.98],
    hairColorHex: '#1a1512',
  },
  dara: {
    id: 'dara',
    name: "Dara 'Jav' Malik",
    alias: 'The Tactician',
    posterCrop: [0.02, 0.60, 0.18, 0.25],
    headwear: 'bald',
    eyewear: 'none',
    facialHair: 'trimmed_beard',
    skinToneHex: '#b8794a',
    skullScale: [1.05, 1.04, 1.03],
    hairColorHex: '#181412',
  },
};

/**
 * Resolves any in-game FighterProfile (6 core squad fighters or a newly uploaded friend)
 * to its matching Fighter3DConfig while staying synchronized with headwear, eyewear,
 * shaved-head toggle, and skin tone settings.
 */
export function resolveFighter3DConfig(profile: FighterProfile): Fighter3DConfig {
  const idToKey: Record<string, keyof typeof FIGHTER_3D_PROFILES> = {
    qari_jaleel: 'qari',
    rebel_aviator: 'sardar',
    rebel_tactician: 'dara',
    rebel_enforcer: 'sher',
    rebel_striker: 'sultan',
    rebel_shadow: 'ustad',
  };

  const baseKey = idToKey[profile.id];
  const base = baseKey ? FIGHTER_3D_PROFILES[baseKey] : undefined;

  const eyewear: Fighter3DConfig['eyewear'] =
    profile.id === 'rebel_aviator'
      ? 'gold_aviators'
      : profile.appearance.headgear === 'sunglasses'
        ? 'gold_aviators'
        : profile.appearance.headgear === 'glasses'
          ? 'black_frames'
          : 'none';

  const headwear: Fighter3DConfig['headwear'] =
    profile.id === 'rebel_aviator'
      ? 'turban_red'
      : profile.appearance.headgear === 'turban'
        ? 'turban_red'
        : profile.appearance.bald
          ? 'bald'
          : 'none';

  if (base) {
    return {
      ...base,
      name: profile.name,
      alias: profile.nickname,
      headwear,
      eyewear,
      skinToneHex: profile.appearance.skinTone || base.skinToneHex,
      hairColorHex: profile.appearance.hairColor || base.hairColorHex,
    };
  }

  return {
    id: profile.id,
    name: profile.name,
    alias: profile.nickname,
    posterCrop: [0, 0, 1, 1],
    headwear,
    eyewear,
    facialHair: 'trimmed_beard',
    skinToneHex: profile.appearance.skinTone || '#c28554',
    skullScale: [1.0, 1.04, 1.0],
    hairColorHex: profile.appearance.hairColor || '#181412',
  };
}
