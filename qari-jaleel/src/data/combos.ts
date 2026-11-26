// Squad combos: each pair of fighters has a bonus that fires when you tag from one to the other mid-fight.
export type ComboEffect = 'heal' | 'shield' | 'rage' | 'shockwave' | 'charm';

export interface SquadCombo {
  name: string;
  /** Shown on the squad select screen */
  blurb: string;
  effect: ComboEffect;
  amount: number;
  /** Said by the fighter who tags in */
  line: string;
}

const Q = 'qari_jaleel'; // Fady
const S = 'rebel_aviator'; // Saf
const V = 'rebel_tactician'; // Jav
const M = 'rebel_enforcer'; // Jam
const C = 'rebel_striker'; // Chet
const I = 'rebel_shadow'; // Immy

const key = (a: string, b: string) => [a, b].sort().join('|');

const HEAL = (n: number) => `Tag in: both fighters heal ${n}.`;
const SHIELD = 'Tag in: a short invincible shield for the new fighter.';
const RAGE = (n: number) => `Tag in: the new fighter gains ${n} power.`;
const WAVE = (n: number) => `Tag in: a shockwave hits nearby cousins for ${n}.`;
const CHARM = 'Tag in: nearby cousins get dizzy, ready to finish.';

export const SQUAD_COMBOS: Record<string, SquadCombo> = {
  [key(Q, S)]: { name: 'Gentleman\'s Embrace', blurb: RAGE(25), effect: 'rage', amount: 25, line: 'Saf, a fraternal embrace, if you please!' },
  [key(Q, V)]: { name: 'Rude Awakening', blurb: SHIELD, effect: 'shield', amount: 2.2, line: 'Jav, do rouse yourself, there is work afoot.' },
  [key(Q, M)]: { name: 'Lift to Lahore', blurb: HEAL(14), effect: 'heal', amount: 14, line: 'Jam, I should be grateful for a lift home.' },
  [key(Q, C)]: { name: 'Distinguished Portfolio', blurb: WAVE(22), effect: 'shockwave', amount: 22, line: 'Chet, a sound investment awaits.' },
  [key(Q, I)]: { name: 'Charm Offensive', blurb: CHARM, effect: 'charm', amount: 2.6, line: 'Immy, work your considerable charm.' },
  [key(S, V)]: { name: 'Big Hug, Little Nap', blurb: HEAL(18), effect: 'heal', amount: 18, line: 'Jav, I love you, wake up!' },
  [key(S, M)]: { name: 'Hug and a Lift', blurb: HEAL(16), effect: 'heal', amount: 16, line: 'Group hug, then drop me home!' },
  [key(S, C)]: { name: 'Love and Returns', blurb: RAGE(22), effect: 'rage', amount: 22, line: 'Chet, my love is a great investment!' },
  [key(S, I)]: { name: 'Love Triangle', blurb: CHARM, effect: 'charm', amount: 2.6, line: 'Immy, no flirting, only hugging!' },
  [key(V, M)]: { name: 'Giant and the Stick', blurb: WAVE(28), effect: 'shockwave', amount: 28, line: 'Jam, hit them with the stick, khotey!' },
  [key(V, C)]: { name: 'Sleepy Investor', blurb: SHIELD, effect: 'shield', amount: 2.2, line: 'Chet, wake me when it is done, saaleya.' },
  [key(V, I)]: { name: 'Slow Charm', blurb: CHARM, effect: 'charm', amount: 2.6, line: 'Immy, do your thing, kanjar.' },
  [key(M, C)]: { name: 'Quick Returns', blurb: RAGE(20), effect: 'rage', amount: 20, line: "Chet, my uncle's cousin has stocks!" },
  [key(M, I)]: { name: 'Wingmen', blurb: WAVE(20), effect: 'shockwave', amount: 20, line: "Immy, I'll drive, you charm." },
  [key(C, I)]: { name: 'Smooth Returns', blurb: SHIELD, effect: 'shield', amount: 2.2, line: 'Immy, smooth talk the market.' },
};

export function getCombo(idA: string, idB: string): SquadCombo | null {
  return SQUAD_COMBOS[key(idA, idB)] ?? null;
}

const ORDER: ComboEffect[] = ['heal', 'shield', 'rage', 'shockwave', 'charm'];
const ASSIST_AMOUNT: Record<ComboEffect, number> = { heal: 12, shield: 1.6, rage: 15, shockwave: 18, charm: 2.2 };

/** The second half of each combo: holding SWAP (partner assist) fires a different effect, two steps along the list. */
export function assistComboFor(combo: SquadCombo): { effect: ComboEffect; amount: number; blurb: string } {
  const effect = ORDER[(ORDER.indexOf(combo.effect) + 2) % ORDER.length];
  const amount = ASSIST_AMOUNT[effect];
  const blurb =
    effect === 'heal'
      ? `Hold Swap: both heal ${amount}.`
      : effect === 'shield'
        ? 'Hold Swap: a quick shield for the lead.'
        : effect === 'rage'
          ? `Hold Swap: the lead gains ${amount} power.`
          : effect === 'shockwave'
            ? `Hold Swap: a shockwave hits cousins for ${amount}.`
            : 'Hold Swap: nearby cousins get dizzy.';
  return { effect, amount, blurb };
}
