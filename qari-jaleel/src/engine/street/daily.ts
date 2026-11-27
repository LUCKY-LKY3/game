/** Daily Dhamaal: one Street Brawl run per day with a twist, same twist for everyone that day. */
export type DailyMod = 'lathi' | 'sheep_army' | 'double' | 'glass' | 'chai_rush' | 'giants';

export const DAILY_INFO: Record<DailyMod, { title: string; blurb: string }> = {
  lathi: { title: 'Lathi Raj', blurb: 'Every cousin carries a lathi. So do you.' },
  sheep_army: { title: 'Sheep Army', blurb: 'The sheep is on your side and it is ANGRY.' },
  double: { title: 'Double Trouble', blurb: 'Twice the cousins in every wave.' },
  glass: { title: 'Glass Jaw', blurb: 'Everyone hits twice as hard. Cousins AND you.' },
  chai_rush: { title: 'Chai Rush', blurb: 'Chai wallah all day, but cousins are faster.' },
  giants: { title: 'Pehelwan Day', blurb: 'Fewer cousins, but all of them are elite.' },
};

const ORDER: DailyMod[] = ['lathi', 'sheep_army', 'double', 'glass', 'chai_rush', 'giants'];

export function todaysMod(now = Date.now()): DailyMod {
  const day = Math.floor(now / 86400000);
  // simple scramble so neighbouring days differ
  return ORDER[(day * 7 + 3) % ORDER.length];
}

const KEY = 'mafia-bhaiyas-daily-v1';

export function dailyBest(now = Date.now()): number {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '{}') as { day?: number; best?: number };
    return raw.day === Math.floor(now / 86400000) ? raw.best ?? 0 : 0;
  } catch {
    return 0;
  }
}

/** Saves the score if it beats today's best; returns true when it is a new daily best */
export function saveDaily(score: number, now = Date.now()): boolean {
  const best = dailyBest(now);
  if (score <= best) return false;
  try {
    localStorage.setItem(KEY, JSON.stringify({ day: Math.floor(now / 86400000), best: score }));
  } catch {
    // storage blocked
  }
  return true;
}
