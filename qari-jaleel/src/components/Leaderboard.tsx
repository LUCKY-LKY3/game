import { useState } from 'react';
import { Crown, Trophy } from 'lucide-react';
import { webBoardConfigured } from '../config';
import { equippedTitle } from '../utils/achievements';
import {
  Boards,
  cleanNickname,
  fighterLabel,
  LBEntry,
  qualifies,
  submitScore,
  useBoards,
} from '../utils/leaderboard';

const MEDALS = ['#FACC15', '#CBD5E1', '#F59E0B'];

/** Old-arcade style top 10 table */
export function LeaderboardTable({
  entries,
  title,
  tag,
  tagColor,
  highlightTs,
}: {
  entries: LBEntry[];
  title: string;
  tag: string;
  tagColor: string;
  highlightTs?: number;
}) {
  const rows = Array.from({ length: 10 }, (_, i) => entries[i] ?? null);
  return (
    <div className="border border-[#F59E0B]/40 bg-[#0B0B0B] p-3 font-mono-num">
      <div className="mb-2 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.2em]">
        <span className="text-[#FACC15]">{title}</span>
        <span style={{ color: tagColor }}>{tag}</span>
      </div>
      <div className="grid grid-cols-[1.6rem_1fr_auto_auto] gap-x-3 gap-y-0.5 text-xs">
        <div className="text-[#B6AA9A]">#</div>
        <div className="text-[#B6AA9A]">NAME · FIGHTER</div>
        <div className="text-right text-[#B6AA9A]">WAVE</div>
        <div className="text-right text-[#B6AA9A]">SCORE</div>
        {rows.map((e: LBEntry | null, i) => {
          const mine = e !== null && highlightTs !== undefined && e.ts === highlightTs;
          const color = mine ? '#FDE047' : i < 3 ? MEDALS[i] : '#F8F4EC';
          return (
            <div key={i} className="contents" style={{ color }}>
              <div className="font-black">{i === 0 ? <Crown className="h-3.5 w-3.5" /> : i + 1}</div>
              <div className={`truncate font-bold uppercase ${mine ? 'animate-pulse' : ''}`}>
                {e ? (
                  <>
                    {e.nick} <span className="font-medium normal-case opacity-70">· {e.fighter}</span>
                    {e.title && <span className="ml-1 text-[10px] font-bold normal-case text-[#FACC15]">★ {e.title}</span>}
                  </>
                ) : (
                  <span className="opacity-30">---</span>
                )}
              </div>
              <div className="text-right">{e ? e.wave : ''}</div>
              <div className="text-right font-black">{e ? e.score.toLocaleString() : ''}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

type Tab = 'public' | 'local';

/** Two boards with a tab switch: Public (everyone) and This device */
function BoardTabs({ boards, highlightTs, initial }: { boards: Boards; highlightTs?: number; initial?: Tab }) {
  const [tab, setTab] = useState<Tab>(initial ?? 'public');
  const pub = boards.globalStatus;
  return (
    <div>
      <div className="mb-2 flex gap-2">
        {(['public', 'local'] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 text-[11px] font-black uppercase tracking-widest ${
              tab === t ? 'bg-[#F59E0B] text-[#141210]' : 'border border-[#F59E0B]/40 text-[#F59E0B]'
            }`}
          >
            {t === 'public' ? 'Public' : 'This device'}
          </button>
        ))}
      </div>
      {tab === 'public' ? (
        <>
          <LeaderboardTable
            entries={boards.global}
            title="Global Challenge · Top 10"
            tag={pub === 'online' ? '● Everyone' : pub === 'loading' ? 'Loading...' : 'Offline'}
            tagColor={pub === 'online' ? '#4ADE80' : '#B6AA9A'}
            highlightTs={highlightTs}
          />
          {pub === 'offline' && (
            <div className="mt-1 text-[10px] text-[#B6AA9A]">Public board not reachable right now.</div>
          )}
        </>
      ) : (
        <LeaderboardTable
          entries={boards.local}
          title="My Scores · Top 10"
          tag="This device"
          tagColor="#B6AA9A"
          highlightTs={highlightTs}
        />
      )}
    </div>
  );
}

/** Hall of Fame for the title screen */
export function HallOfFame() {
  const boards = useBoards();
  return <BoardTabs boards={boards} />;
}

/**
 * Shown on the Endless Mohalla results: arcade-style name entry when the run makes either top 10,
 * then the boards with your entry highlighted.
 */
export function EndlessScoreEntry({ score, wave, fighterName }: { score: number; wave: number; fighterName: string }) {
  const boards = useBoards();
  const [nick, setNick] = useState('');
  const [saved, setSaved] = useState<{ ts: number; global: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const earnedLocal = qualifies(score, boards.local);
  const earnedGlobal = boards.globalStatus === 'online' && qualifies(score, boards.global);
  const earned = earnedLocal || earnedGlobal || (boards.globalStatus === 'loading' && score > 0 && boards.local.length < 10);

  const submit = async () => {
    const name = cleanNickname(nick) || 'PLAYER';
    setBusy(true);
    const ts = Date.now();
    // On the website the public board can't always be read (offline/blocked), but a score can still be sent to the Form
    const res = await submitScore({ nick: name, fighter: fighterLabel(fighterName), score, wave, ts, title: equippedTitle() ?? undefined }, earnedLocal, earnedGlobal || webBoardConfigured());
    setSaved({ ts, global: res.global });
    setBusy(false);
  };

  return (
    <div className="mt-5">
      {earned && !saved && (
        <div className="mb-3 border-2 border-[#FACC15] bg-[#2A2016] p-3">
          <div className="font-display text-2xl font-black uppercase tracking-wider text-[#FACC15]">
            <Trophy className="mr-2 inline h-5 w-5" />
            Top 10 score! {score.toLocaleString()}
          </div>
          <div className="mt-1 text-xs text-[#D6CEC2]">Enter your nickname for the Hall of Fame:</div>
          <div className="mt-2 flex gap-2">
            <input
              value={nick}
              onChange={(e) => setNick(e.target.value)}
              maxLength={12}
              autoFocus
              placeholder="NICKNAME"
              aria-label="Nickname"
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === 'Enter' && !busy) submit();
              }}
              className="font-mono-num min-w-0 flex-1 border-2 border-[#F59E0B] bg-[#0B0B0B] px-3 py-2 text-base font-black uppercase tracking-widest text-[#FDE047] outline-none placeholder:text-[#F59E0B]/40"
            />
            <button
              type="button"
              disabled={busy}
              onClick={submit}
              className="bg-[#F59E0B] px-4 text-sm font-black uppercase text-[#141210] hover:bg-[#D97706] disabled:opacity-60"
            >
              {busy ? '...' : 'Save'}
            </button>
          </div>
        </div>
      )}
      {saved && saved.global && <div className="mb-2 text-[11px] text-[#4ADE80]">Sent to the public board. It can take a minute to appear.</div>}
      {saved && !saved.global && (earnedGlobal || webBoardConfigured()) && (
        <div className="mb-2 text-[11px] text-[#F87171]">
          Could not post to the public board{webBoardConfigured() ? '' : ' (needs Contributor access)'}. Saved on this device.
        </div>
      )}
      <BoardTabs boards={boards} highlightTs={saved?.ts} initial={earnedGlobal ? 'public' : 'local'} />
    </div>
  );
}
