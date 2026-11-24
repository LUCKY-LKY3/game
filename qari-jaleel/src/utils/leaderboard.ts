import { useEffect, useState } from 'react';

/**
 * Endless Mohalla Hall of Fame.
 *
 * Online: scores live in the Artifact `db` capability, one document per player at `scores/<userId>`
 * (each player can only write their own; everyone can read all). On the phone Artifact that means
 * everyone the link is shared with at Contributor level shares one board.
 * Fallback (no db, e.g. plain hosting or view-only access): a board kept on this device.
 */
export interface LBEntry {
  nick: string;
  fighter: string;
  score: number;
  wave: number;
  ts: number;
}

export type BoardSource = 'loading' | 'global' | 'local';

export interface BoardState {
  entries: LBEntry[];
  source: BoardSource;
}

export const BOARD_SIZE = 10;
const PER_PLAYER = 5;
const LOCAL_KEY = 'mafia-bhaiyas-endless-board-v1';

interface DbSnapshotDoc {
  data(): Record<string, unknown> | undefined;
}
interface DbHandle {
  doc(path: string): {
    get(): Promise<{ exists: boolean; data(): Record<string, unknown> | undefined }>;
    set(data: Record<string, unknown>): Promise<void>;
  };
  collection(path: string): {
    onSnapshot(
      next: (snap: { docs: DbSnapshotDoc[]; metadata: { fromCache: boolean } }) => void,
      error?: (e: { code: string }) => void
    ): () => void;
  };
}
interface Online {
  db: DbHandle;
  uid: string;
}

let onlinePromise: Promise<Online | null> | null = null;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | null> {
  return new Promise((resolve) => {
    const t = window.setTimeout(() => resolve(null), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      () => {
        clearTimeout(t);
        resolve(null);
      }
    );
  });
}

function getOnline(): Promise<Online | null> {
  if (!onlinePromise) {
    onlinePromise = (async () => {
      const claude = (window as unknown as { claude?: { use: (n: string) => Promise<unknown> } }).claude;
      if (!claude) return null;
      const db = (await withTimeout(claude.use('db'), 10000)) as DbHandle | null;
      const user = (await withTimeout(claude.use('user'), 10000)) as { id: () => Promise<string | null> } | null;
      if (!db || !user) return null;
      const uid = await withTimeout(user.id(), 10000);
      return uid ? { db, uid } : null;
    })().catch(() => null);
  }
  return onlinePromise;
}

function clean(raw: unknown): LBEntry | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const score = Number(r.score);
  if (!Number.isFinite(score) || score <= 0) return null;
  return {
    nick: String(r.nick ?? '').slice(0, 12) || 'PLAYER',
    fighter: String(r.fighter ?? '').slice(0, 16),
    score: Math.min(99999999, Math.round(score)),
    wave: Math.max(0, Math.min(9999, Math.round(Number(r.wave) || 0))),
    ts: Number(r.ts) || 0,
  };
}

function top(entries: LBEntry[], n: number): LBEntry[] {
  return [...entries].sort((a, b) => b.score - a.score || a.ts - b.ts).slice(0, n);
}

function readLocal(): LBEntry[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (raw) return top((JSON.parse(raw) as unknown[]).map(clean).filter((e): e is LBEntry => e !== null), BOARD_SIZE);
  } catch {
    // storage blocked
  }
  return [];
}

function writeLocal(entries: LBEntry[]) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(top(entries, BOARD_SIZE)));
  } catch {
    // ignore
  }
}

/** Does this score earn a place in the top 10? */
export function qualifies(score: number, entries: LBEntry[]): boolean {
  if (score <= 0) return false;
  return entries.length < BOARD_SIZE || score > entries[BOARD_SIZE - 1].score;
}

/** "Sultan 'Chet' Rathore" -> "Chet" */
export function fighterLabel(name: string): string {
  const m = name.match(/'([^']+)'/);
  return (m ? m[1] : name.split(' ')[0]).slice(0, 16);
}

export function cleanNickname(raw: string): string {
  return raw.replace(/[^A-Za-z0-9 _\-.]/g, '').replace(/\s+/g, ' ').trim().slice(0, 12);
}

/**
 * Save a score. Always stored on this device; also posted to the shared board when online and allowed.
 * Resolves whether it reached the shared board.
 */
export async function submitScore(entry: LBEntry, toLocal = true, toGlobal = true): Promise<{ global: boolean }> {
  if (toLocal) writeLocal([...readLocal(), entry]);
  if (!toGlobal) return { global: false };
  const online = await getOnline();
  if (!online) return { global: false };
  try {
    const ref = online.db.doc(`scores/${online.uid}`);
    const snap = await ref.get();
    const prev = snap.exists && Array.isArray(snap.data()?.entries) ? (snap.data()!.entries as unknown[]) : [];
    const mine = top([...prev.map(clean).filter((e): e is LBEntry => e !== null), entry], PER_PLAYER);
    await ref.set({ uid: online.uid, entries: mine, updated: Date.now() });
    return { global: true };
  } catch {
    return { global: false };
  }
}

export interface Boards {
  local: LBEntry[];
  global: LBEntry[];
  /** loading until the shared board answers; offline means no shared board is reachable */
  globalStatus: 'loading' | 'online' | 'offline';
}

/** Both boards: this device's scores, and the public shared board when it answers. */
export function useBoards(): Boards {
  const [state, setState] = useState<Boards>({ local: readLocal(), global: [], globalStatus: 'loading' });
  useEffect(() => {
    let alive = true;
    let unsub: (() => void) | null = null;
    const offline = () => alive && setState((s) => ({ ...s, local: readLocal(), globalStatus: 'offline' }));
    const fallback = window.setTimeout(() => {
      if (alive) setState((s) => (s.globalStatus === 'loading' ? { ...s, globalStatus: 'offline' } : s));
    }, 11000);
    getOnline().then((online) => {
      if (!alive) return;
      if (!online) return offline();
      unsub = online.db.collection('scores').onSnapshot(
        (snap) => {
          if (!alive) return;
          const all: LBEntry[] = [];
          for (const d of snap.docs) {
            const list = d.data()?.entries;
            if (Array.isArray(list)) for (const raw of list) {
              const e = clean(raw);
              if (e) all.push(e);
            }
          }
          setState({ local: readLocal(), global: top(all, BOARD_SIZE), globalStatus: 'online' });
        },
        offline
      );
    });
    return () => {
      alive = false;
      clearTimeout(fallback);
      if (unsub) unsub();
    };
  }, []);
  return state;
}
