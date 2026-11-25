import { FighterProfile } from '../types/game';

const DB_NAME = 'akhara_clash_db';
const DB_VERSION = 1;
const STORE_NAME = 'custom_fighters';
const FALLBACK_KEY = 'akhara_clash_custom_fighters_v1';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function loadCustomFighters(): Promise<FighterProfile[]> {
  try {
    const db = await openDb();
    return await new Promise<FighterProfile[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const list = (req.result as FighterProfile[]) || [];
        list.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
        resolve(list);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    try {
      const raw = localStorage.getItem(FALLBACK_KEY);
      return raw ? (JSON.parse(raw) as FighterProfile[]) : [];
    } catch {
      return [];
    }
  }
}

export async function saveCustomFighter(fighter: FighterProfile): Promise<void> {
  const payload: FighterProfile = {
    ...fighter,
    isCustom: true,
    createdAt: fighter.createdAt ?? Date.now(),
  };
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(payload);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    const existing = await loadCustomFighters();
    const next = [payload, ...existing.filter((f) => f.id !== payload.id)];
    localStorage.setItem(FALLBACK_KEY, JSON.stringify(next));
  }
}

export async function deleteCustomFighter(id: string): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    const existing = await loadCustomFighters();
    const next = existing.filter((f) => f.id !== id);
    localStorage.setItem(FALLBACK_KEY, JSON.stringify(next));
  }
}



export interface ArcadeRecords {
  brawlBestScore: number;
  brawlBestRank: 'S' | 'A' | 'B' | 'C' | null;
  brawlFastestClearSec: number | null;
  brawlBestCombo: number;
  endlessBestWave: number;
  endlessHighScore: number;
  endlessBestCombo: number;
}

const ARCADE_RECORDS_KEY = 'qari_jaleel_arcade_records_v1';
const RANK_ORDER: Record<'S' | 'A' | 'B' | 'C', number> = { S: 4, A: 3, B: 2, C: 1 };

const DEFAULT_RECORDS: ArcadeRecords = {
  brawlBestScore: 0,
  brawlBestRank: null,
  brawlFastestClearSec: null,
  brawlBestCombo: 0,
  endlessBestWave: 0,
  endlessHighScore: 0,
  endlessBestCombo: 0,
};

export function loadArcadeRecords(): ArcadeRecords {
  try {
    const raw = localStorage.getItem(ARCADE_RECORDS_KEY);
    if (!raw) return { ...DEFAULT_RECORDS };
    const parsed = JSON.parse(raw) as Partial<ArcadeRecords>;
    return {
      brawlBestScore: typeof parsed.brawlBestScore === 'number' ? parsed.brawlBestScore : 0,
      brawlBestRank:
        parsed.brawlBestRank === 'S' ||
        parsed.brawlBestRank === 'A' ||
        parsed.brawlBestRank === 'B' ||
        parsed.brawlBestRank === 'C'
          ? parsed.brawlBestRank
          : null,
      brawlFastestClearSec:
        typeof parsed.brawlFastestClearSec === 'number' ? parsed.brawlFastestClearSec : null,
      brawlBestCombo: typeof parsed.brawlBestCombo === 'number' ? parsed.brawlBestCombo : 0,
      endlessBestWave: typeof parsed.endlessBestWave === 'number' ? parsed.endlessBestWave : 0,
      endlessHighScore: typeof parsed.endlessHighScore === 'number' ? parsed.endlessHighScore : 0,
      endlessBestCombo: typeof parsed.endlessBestCombo === 'number' ? parsed.endlessBestCombo : 0,
    };
  } catch {
    return { ...DEFAULT_RECORDS };
  }
}

export function saveStreetBrawlRecord(run: {
  score: number;
  rank: 'S' | 'A' | 'B' | 'C';
  clearTimeSec: number;
  highestCombo: number;
  victory: boolean;
}): { records: ArcadeRecords; isNewBestScore: boolean; isNewBestRank: boolean } {
  const prev = loadArcadeRecords();
  const isNewBestScore = run.score > prev.brawlBestScore;
  const prevRankVal = prev.brawlBestRank ? RANK_ORDER[prev.brawlBestRank] : 0;
  const isNewBestRank = run.victory && RANK_ORDER[run.rank] > prevRankVal;

  const next: ArcadeRecords = {
    ...prev,
    brawlBestScore: Math.max(prev.brawlBestScore, run.score),
    brawlBestRank: isNewBestRank ? run.rank : prev.brawlBestRank,
    brawlFastestClearSec: run.victory
      ? prev.brawlFastestClearSec === null
        ? run.clearTimeSec
        : Math.min(prev.brawlFastestClearSec, run.clearTimeSec)
      : prev.brawlFastestClearSec,
    brawlBestCombo: Math.max(prev.brawlBestCombo, run.highestCombo),
  };
  try {
    localStorage.setItem(ARCADE_RECORDS_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage quota / private mode failures
  }
  return { records: next, isNewBestScore, isNewBestRank };
}

export function saveEndlessRecord(run: {
  wave: number;
  score: number;
  highestCombo: number;
}): { records: ArcadeRecords; isNewBestScore: boolean; isNewBestWave: boolean } {
  const prev = loadArcadeRecords();
  const isNewBestScore = run.score > prev.endlessHighScore;
  const isNewBestWave = run.wave > prev.endlessBestWave;
  const next: ArcadeRecords = {
    ...prev,
    endlessBestWave: Math.max(prev.endlessBestWave, run.wave),
    endlessHighScore: Math.max(prev.endlessHighScore, run.score),
    endlessBestCombo: Math.max(prev.endlessBestCombo, run.highestCombo),
  };
  try {
    localStorage.setItem(ARCADE_RECORDS_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage quota / private mode failures
  }
  return { records: next, isNewBestScore, isNewBestWave };
}

