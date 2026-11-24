import { SettingsPanel } from './SettingsPanel';
import { EndlessScoreEntry } from './Leaderboard';
import logoUrl from '../assets/images/mafia-bhaiyas-logo.png?inline';
import { useState } from 'react';
import { Award, Flame, Play, RotateCcw, Swords, Users } from 'lucide-react';
import {
  BrawlRank,
  FighterProfile,
  GameMode,
  HudSnapshot,
  isStreetBrawlMode,
} from '../types/game';

interface PauseModalProps {
  mode: GameMode;
  onResume: () => void;
  onRestart: () => void;
  onBackToRoster: () => void;
  onBackToTitle: () => void;
}

export function PauseModal({
  mode,
  onResume,
  onRestart,
  onBackToRoster,
  onBackToTitle,
}: PauseModalProps) {
  const [tab, setTab] = useState<'menu' | 'moves' | 'settings'>('menu');
  const isBrawl = isStreetBrawlMode(mode);

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#141210]/88 p-4">
      <div className="w-full max-w-lg border border-[#F8F4EC]/15 bg-[#1D1916] p-6">
        <div className="flex items-center justify-between border-b border-[#F8F4EC]/10 pb-4">
          <img src={logoUrl} alt="Mafia Bhaiyas" draggable={false} className="h-14 w-auto select-none" />
          <h2 className="sr-only">Match Paused</h2>
          <div className="flex items-center gap-1 bg-[#141210] p-1">
            <button
              type="button"
              onClick={() => setTab('menu')}
              className={`px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                tab === 'menu'
                  ? 'bg-[#F59E0B] text-[#141210]'
                  : 'text-[#B6AA9A] hover:text-[#F8F4EC]'
              }`}
            >
              Options
            </button>
            <button
              type="button"
              onClick={() => setTab('settings')}
              className={`px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                tab === 'settings'
                  ? 'bg-[#F59E0B] text-[#141210]'
                  : 'text-[#B6AA9A] hover:text-[#F8F4EC]'
              }`}
            >
              Settings
            </button>
            <button
              type="button"
              onClick={() => setTab('moves')}
              className={`px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                tab === 'moves'
                  ? 'bg-[#F59E0B] text-[#141210]'
                  : 'text-[#B6AA9A] hover:text-[#F8F4EC]'
              }`}
            >
              Move List
            </button>
          </div>
        </div>

        {tab === 'settings' ? (
          <SettingsPanel />
        ) : tab === 'menu' ? (
          <div className="mt-5 flex flex-col gap-2.5">
            <button
              type="button"
              onClick={onResume}
              className="flex items-center justify-center gap-2 bg-[#F59E0B] px-5 py-3 text-sm font-bold text-[#141210] hover:bg-[#D97706] transition-colors whitespace-nowrap"
            >
              <Play className="h-4 w-4" />
              Resume Fight
            </button>
            <button
              type="button"
              onClick={onRestart}
              className="flex items-center justify-center gap-2 border border-[#F8F4EC]/15 bg-[#26211D] px-5 py-3 text-sm font-semibold text-[#F8F4EC] hover:border-[#F59E0B] transition-colors whitespace-nowrap"
            >
              <RotateCcw className="h-4 w-4" />
              Restart Match
            </button>
            <button
              type="button"
              onClick={onBackToRoster}
              className="flex items-center justify-center gap-2 border border-[#F8F4EC]/15 bg-[#26211D] px-5 py-3 text-sm font-semibold text-[#F8F4EC] hover:border-[#F59E0B] transition-colors whitespace-nowrap"
            >
              <Users className="h-4 w-4" />
              {isBrawl ? 'Change Squad' : 'Change Fighters & Stage'}
            </button>
            <button
              type="button"
              onClick={onBackToTitle}
              className="mt-1 px-5 py-2.5 text-sm font-medium text-[#B6AA9A] hover:text-[#F8F4EC] transition-colors whitespace-nowrap"
            >
              Return to Main Menu
            </button>
          </div>
        ) : (
          <div className="mt-4 space-y-3 text-sm">
            <div className="grid grid-cols-[1fr_auto] gap-y-2 border-b border-[#F8F4EC]/10 pb-3">
              <span className="text-[#F8F4EC]">3-Hit Akhara Combo</span>
              <span className="font-mono-num text-xs text-[#F59E0B]">
                P1: F → F → G {mode === 'versus_2p' ? ' / P2: J → J → K' : ''}
              </span>
              {isBrawl && (
                <>
                  <span className="text-[#F8F4EC]">Rear Back-Elbow Strike</span>
                  <span className="font-mono-num text-xs text-[#F59E0B]">Hold Opposite + F</span>
                  <span className="text-[#F8F4EC]">Grab 3-Hit Knee → Throw</span>
                  <span className="font-mono-num text-xs text-[#F59E0B]">Walk Close / R → F × 3</span>
                  <span className="text-[#F8F4EC]">Dizzy FINISH! Takedown</span>
                  <span className="font-mono-num text-xs text-[#FDE047]">G or R near Staggered</span>
                  <span className="text-[#F8F4EC]">Jump / Leap Shockwaves</span>
                  <span className="font-mono-num text-xs text-[#38BDF8]">Space</span>
                </>
              )}
              <span className="text-[#F8F4EC]">Heavy Hook / Launcher</span>
              <span className="font-mono-num text-xs text-[#F59E0B]">
                P1: G {mode === 'versus_2p' ? ' / P2: K' : ''}
              </span>
              <span className="text-[#F8F4EC]">3-Hit Martial Kick Chain</span>
              <span className="font-mono-num text-xs text-[#FB923C]">
                H → H → H (Roundhouse → Spin Heel → Tornado)
              </span>
              <span className="text-[#F8F4EC]">Overhead Axe Kick / Low Sweep</span>
              <span className="font-mono-num text-xs text-[#FB923C]">
                W + H (Axe) · S + H (Sweep)
              </span>
              <span className="text-[#F8F4EC]">Flying Side Kick</span>
              <span className="font-mono-num text-xs text-[#FB923C]">
                Jump / Sprint + H (or KICK)
              </span>
              <span className="text-[#F8F4EC]">2.5D Sidestep Dodge</span>
              <span className="font-mono-num text-xs text-[#5EEAD4]">
                P1: E / Shift {mode === 'versus_2p' ? ' / P2: O' : ''}
              </span>
              <span className="text-[#F8F4EC]">Unique Character Powerup</span>
              <span className="font-mono-num text-xs text-[#F59E0B]">
                POWER Btn / P1: T {mode === 'versus_2p' ? ' / P2: I' : ''}
              </span>
              {isBrawl && (
                <>
                  <span className="text-[#F8F4EC]">Tag Swap / Grab Rescue</span>
                  <span className="font-mono-num text-xs text-[#38BDF8]">
                    Tap Tab or C · Hold = Assist
                  </span>
                </>
              )}
            </div>
            <p className="text-xs text-[#B6AA9A]">
              {isBrawl
                ? 'Smash fruit carts and clay pots, kick stray cricket balls, throw cousins into Banyan stone pillars or water pumps, and press Switch if grabbed from behind!'
                : 'Use 2.5D Sidestep to slip past linear punches and punish from the flank. On touch devices, tap the gamepad icon in the top bar anytime.'}
            </p>
            <button
              type="button"
              onClick={onResume}
              className="w-full bg-[#F59E0B] px-4 py-2.5 text-sm font-bold text-[#141210] hover:bg-[#D97706] transition-colors"
            >
              Back to Fight
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function formatClearTime(totalSec: number): string {
  const sec = Math.max(0, Math.round(totalSec));
  const mins = Math.floor(sec / 60);
  const rem = sec % 60;
  return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
}

const RANK_STYLE: Record<
  BrawlRank,
  { border: string; bg: string; text: string; title: string }
> = {
  S: {
    border: 'border-[#FDE047]',
    bg: 'bg-gradient-to-b from-[#F59E0B] to-[#B45309]',
    text: 'text-[#141210]',
    title: 'BLOCKBUSTER LEGEND',
  },
  A: {
    border: 'border-[#F59E0B]',
    bg: 'bg-[#2C1E10]',
    text: 'text-[#FCD34D]',
    title: 'MOHALLA CHAMPION',
  },
  B: {
    border: 'border-[#38BDF8]',
    bg: 'bg-[#12202B]',
    text: 'text-[#7DD3FC]',
    title: 'STREET BRAWLER',
  },
  C: {
    border: 'border-[#B6AA9A]/50',
    bg: 'bg-[#24201C]',
    text: 'text-[#D6CEC2]',
    title: 'VILLAGE SCRAPPER',
  },
};

interface MatchOverModalProps {
  hud: HudSnapshot;
  mode: GameMode;
  p1Profile: FighterProfile;
  p2Profile: FighterProfile;
  hasNextArcadeOpponent: boolean;
  arcadeCompleted: boolean;
  onNextArcadeOpponent: () => void;
  onRematch: () => void;
  onBackToRoster: () => void;
  onSwitchMode?: (mode: GameMode) => void;
}

export function MatchOverModal({
  hud,
  mode,
  p1Profile,
  p2Profile,
  hasNextArcadeOpponent,
  arcadeCompleted,
  onNextArcadeOpponent,
  onRematch,
  onBackToRoster,
  onSwitchMode,
}: MatchOverModalProps) {
  const winnerSide = hud.stats.winnerSide ?? 1;
  const winner = winnerSide === 1 ? p1Profile : p2Profile;
  const isBrawl = isStreetBrawlMode(mode) && Boolean(hud.brawl);
  const brawlCleared = isBrawl && winnerSide === 1;
  const scorecard = hud.brawl?.scorecard ?? null;
  const isEndless = Boolean(hud.brawl?.isEndless || mode === 'endless_mohalla');
  const rankMeta = scorecard ? RANK_STYLE[scorecard.rank] : null;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#141210]/88 p-4">
      <div className="w-full max-w-2xl border border-[#F59E0B]/45 bg-[#1D1916] p-6 sm:p-8">
        {isBrawl && hud.brawl ? (
          <>
            <img src={logoUrl} alt="Mafia Bhaiyas" draggable={false} className="mx-auto mb-3 h-12 w-auto select-none" />
            {/* Top Scorecard Header with Squad Portraits & Bollywood Style Rank Seal */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex shrink-0 items-center -space-x-3">
                  {[p1Profile, p2Profile].map((hero, i) => (
                    <div
                      key={hero.id + i}
                      className={`h-20 w-20 overflow-hidden border-2 bg-[#141210] sm:h-24 sm:w-24 ${
                        i === 0 ? 'border-[#F59E0B] z-10' : 'border-[#38BDF8]'
                      }`}
                    >
                      <img
                        src={hero.portraitUrl}
                        alt={hero.name}
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ))}
                </div>
                <div className="min-w-0">
                  <div
                    className={`text-xs font-bold uppercase tracking-[0.18em] ${
                      isEndless
                        ? 'text-[#F59E0B]'
                        : brawlCleared
                          ? 'text-[#F59E0B]'
                          : 'text-[#F87171]'
                    }`}
                  >
                    {isEndless
                      ? `Endless Mohalla · Wave ${scorecard?.endlessWave ?? hud.brawl.endlessWave}`
                      : brawlCleared
                        ? 'Village Street Brawl Victory'
                        : 'Squad Defeated'}
                  </div>
                  <h2 className="mt-1 font-display text-4xl font-black leading-none text-[#F8F4EC] sm:text-5xl">
                    {isEndless
                      ? `Survived ${scorecard?.endlessWave ?? hud.brawl.endlessWave} Waves!`
                      : brawlCleared
                        ? 'Village Street Cleared!'
                        : 'Cousins Held the Street'}
                  </h2>
                  <div className="mt-1.5 text-xs text-[#B6AA9A]">
                    {p1Profile.name} &amp; {p2Profile.name}
                  </div>
                </div>
              </div>

              {/* Stamped Bollywood Arcade Style Rank Seal */}
              {scorecard && rankMeta && (
                <div className="flex shrink-0 flex-row items-center gap-3 sm:flex-col sm:gap-1">
                  <div
                    className={`flex h-20 w-20 flex-col items-center justify-center rounded-full border-4 shadow-[0_6px_24px_rgba(0,0,0,0.65)] ${rankMeta.border} ${rankMeta.bg}`}
                  >
                    <span
                      className={`font-display text-5xl font-black leading-none ${rankMeta.text}`}
                    >
                      {scorecard.rank}
                    </span>
                  </div>
                  <div className="text-left sm:text-center">
                    <div className="text-[10px] font-black tracking-[0.18em] text-[#F59E0B] uppercase">
                      Style Rank
                    </div>
                    <div className="text-[11px] font-bold text-[#F8F4EC]">{rankMeta.title}</div>
                    {scorecard.isNewBestRank && (
                      <div className="text-[10px] font-black tracking-wider text-[#FDE047] uppercase">
                        New Best Rank!
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {isEndless && (
              <EndlessScoreEntry
                score={scorecard?.score ?? hud.brawl.score}
                wave={scorecard?.endlessWave ?? hud.brawl.endlessWave}
                fighterName={p1Profile.name}
              />
            )}

            {/* Clean Tabular Arcade Tally Grid */}
            <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-4 border-y border-[#F8F4EC]/12 py-5 sm:grid-cols-3">
              <div>
                <div className="text-xs text-[#B6AA9A]">
                  {isEndless ? 'Survival Time' : 'Clear Time'}
                </div>
                <div className="font-mono-num mt-1 text-2xl font-bold text-[#F8F4EC]">
                  {formatClearTime(scorecard?.clearTimeSec ?? 0)}
                </div>
              </div>

              <div>
                <div className="text-xs text-[#B6AA9A]">Highest Combo</div>
                <div className="font-mono-num mt-1 text-2xl font-bold text-[#38BDF8]">
                  {scorecard?.highestCombo ??
                    Math.max(hud.stats.p1MaxCombo, hud.stats.p2MaxCombo)}{' '}
                  Hits
                </div>
              </div>

              <div>
                <div className="text-xs text-[#B6AA9A]">Cousins Rickshaw&apos;d</div>
                <div className="font-mono-num mt-1 text-2xl font-bold text-[#4ADE80]">
                  {scorecard?.cousinsRickshawed ?? 0}
                </div>
              </div>

              <div>
                <div className="text-xs text-[#B6AA9A]">Finishers Landed</div>
                <div className="font-mono-num mt-1 text-2xl font-bold text-[#FDE047]">
                  {scorecard?.finishersLanded ?? 0}
                </div>
              </div>

              <div>
                <div className="text-xs text-[#B6AA9A]">
                  {isEndless ? 'Wave Reached' : "Cousins KO'd"}
                </div>
                <div className="font-mono-num mt-1 flex items-baseline gap-2 text-2xl font-bold text-[#F8F4EC]">
                  <span>
                    {isEndless
                      ? `Wave ${scorecard?.endlessWave ?? hud.brawl.endlessWave}`
                      : hud.brawl.totalDefeated}
                  </span>
                  {scorecard?.isNewBestWave && (
                    <span className="text-[10px] font-black tracking-wider text-[#FDE047] uppercase">
                      NEW BEST
                    </span>
                  )}
                </div>
              </div>

              <div>
                <div className="text-xs text-[#B6AA9A]">Total Score</div>
                <div className="font-mono-num mt-1 flex items-baseline gap-2 text-2xl font-bold text-[#F59E0B]">
                  <span>{hud.brawl.score.toLocaleString()}</span>
                  {scorecard?.isNewBestScore && (
                    <span className="text-[10px] font-black tracking-wider text-[#FDE047] uppercase">
                      NEW BEST
                    </span>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="h-28 w-28 shrink-0 overflow-hidden border-2 border-[#F59E0B] bg-[#141210]">
                {winner.portraitUrl ? (
                  <img
                    src={winner.portraitUrl}
                    alt={winner.name}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center font-display text-4xl font-bold text-[#F59E0B]">
                    {winner.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-[#F59E0B]">
                  {arcadeCompleted
                    ? 'Village Akhara Champion'
                    : winnerSide === 1
                      ? 'Player 1 Victory'
                      : mode === 'versus_2p'
                        ? 'Player 2 Victory'
                        : 'Challenger Victory'}
                </div>
                <h2 className="mt-1 font-display text-5xl font-black leading-none text-[#F8F4EC]">
                  {winner.name}
                </h2>
                <div className="mt-1 text-sm text-[#B6AA9A]">“{winner.taunt}”</div>
              </div>
            </div>

            {/* Clean Tabular Match Breakdown */}
            <div className="mt-6 grid grid-cols-3 gap-3 border-y border-[#F8F4EC]/10 py-4 text-center">
              <div>
                <div className="text-xs text-[#B6AA9A]">Score</div>
                <div className="font-mono-num mt-1 text-xl font-bold text-[#F8F4EC]">
                  {hud.p1.roundsWon} – {hud.p2.roundsWon}
                </div>
              </div>
              <div>
                <div className="text-xs text-[#B6AA9A]">Max Combo</div>
                <div className="font-mono-num mt-1 text-xl font-bold text-[#F59E0B]">
                  {Math.max(hud.stats.p1MaxCombo, hud.stats.p2MaxCombo)} Hits
                </div>
              </div>
              <div>
                <div className="text-xs text-[#B6AA9A]">Damage Dealt</div>
                <div className="font-mono-num mt-1 text-xl font-bold text-[#F8F4EC]">
                  {winnerSide === 1 ? hud.stats.p1DamageDealt : hud.stats.p2DamageDealt}
                </div>
              </div>
            </div>

            {arcadeCompleted && (
              <div className="mt-4 flex items-center gap-3 bg-[#2A2218] p-3.5 text-sm text-[#FCD34D]">
                <Award className="h-5 w-5 shrink-0 text-[#F59E0B]" />
                <span>
                  You cleared the entire village tournament ladder and claimed the Banyan Akhara
                  crown!
                </span>
              </div>
            )}
          </>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          {mode === 'arcade' && winnerSide === 1 && hasNextArcadeOpponent && (
            <button
              type="button"
              onClick={onNextArcadeOpponent}
              className="flex flex-1 items-center justify-center gap-2 bg-[#F59E0B] px-5 py-3 text-sm font-bold text-[#141210] hover:bg-[#D97706] transition-colors whitespace-nowrap"
            >
              <Swords className="h-4 w-4" />
              Next Challenger
            </button>
          )}
          <button
            type="button"
            onClick={onRematch}
            className={`flex flex-1 items-center justify-center gap-2 px-5 py-3 text-sm font-bold transition-colors whitespace-nowrap ${
              mode === 'arcade' && winnerSide === 1 && hasNextArcadeOpponent
                ? 'border border-[#F8F4EC]/20 bg-[#26211D] text-[#F8F4EC] hover:border-[#F59E0B]'
                : 'bg-[#F59E0B] text-[#141210] hover:bg-[#D97706]'
            }`}
          >
            <RotateCcw className="h-4 w-4" />
            {isEndless ? 'Retry Endless' : isBrawl ? 'Brawl Again' : 'Rematch'}
          </button>

          {isBrawl && onSwitchMode && (
            <button
              type="button"
              onClick={() => onSwitchMode(isEndless ? 'street_brawl' : 'endless_mohalla')}
              className="flex items-center justify-center gap-2 border border-[#DC2626]/70 bg-[#241312] px-4 py-3 text-sm font-bold text-[#FCD34D] hover:border-[#F59E0B] hover:bg-[#2F1715] transition-colors whitespace-nowrap"
            >
              <Flame className="h-4 w-4 text-[#EF4444]" />
              {isEndless ? 'Street Brawl' : 'Endless Mohalla'}
            </button>
          )}

          <button
            type="button"
            onClick={onBackToRoster}
            className="flex items-center justify-center gap-2 border border-[#F8F4EC]/20 bg-[#26211D] px-5 py-3 text-sm font-semibold text-[#F8F4EC] hover:border-[#F59E0B] transition-colors whitespace-nowrap"
          >
            <Users className="h-4 w-4" />
            {isBrawl ? 'Squad Select' : 'Fighter Select'}
          </button>
        </div>
      </div>
    </div>
  );
}
