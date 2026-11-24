import { WEB_BOARD } from '../config';
import type { LBEntry } from './leaderboard';

/** Minimal CSV parser (handles quoted fields, commas and newlines inside quotes). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cur += '"';
          i++;
        } else q = false;
      } else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') {
      row.push(cur);
      cur = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cur);
      cur = '';
      if (row.some((c) => c !== '')) rows.push(row);
      row = [];
    } else cur += ch;
  }
  row.push(cur);
  if (row.some((c) => c !== '')) rows.push(row);
  return rows;
}

/** Sheet rows -> entries. Columns: Timestamp, Nickname, Fighter, Score, Wave. Drops junk and implausible scores. */
export function rowsToEntries(rows: string[][]): LBEntry[] {
  const out: LBEntry[] = [];
  for (const r of rows) {
    if (r.length < 5) continue;
    const score = Number(String(r[3]).replace(/[, ]/g, ''));
    const wave = Number(r[4]);
    if (!Number.isFinite(score) || !Number.isFinite(wave) || score <= 0 || wave < 1) continue; // also skips the header row
    if (wave > 9999 || score > 99999999 || score > wave * 25000) continue; // simple anti-cheat sanity check
    const nick = r[1].replace(/[^A-Za-z0-9 _\-.]/g, '').trim().slice(0, 12);
    if (!nick) continue;
    const ts = Date.parse(r[0]);
    out.push({ nick, fighter: r[2].slice(0, 16), score: Math.round(score), wave: Math.round(wave), ts: Number.isFinite(ts) ? ts : 0 });
  }
  return out;
}

export async function fetchWebBoard(): Promise<LBEntry[] | null> {
  try {
    const res = await fetch(`${WEB_BOARD.csvUrl}${WEB_BOARD.csvUrl.includes('?') ? '&' : '?'}t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return rowsToEntries(parseCsv(await res.text()));
  } catch {
    return null;
  }
}

/** Sends a score to the Google Form. The response is opaque (no-cors), so success means "sent". */
export async function postWebScore(e: LBEntry): Promise<boolean> {
  try {
    const body = new URLSearchParams();
    body.set(WEB_BOARD.entryNick, e.nick);
    body.set(WEB_BOARD.entryFighter, e.fighter);
    body.set(WEB_BOARD.entryScore, String(e.score));
    body.set(WEB_BOARD.entryWave, String(e.wave));
    await fetch(WEB_BOARD.formUrl, { method: 'POST', mode: 'no-cors', body });
    return true;
  } catch {
    return false;
  }
}
