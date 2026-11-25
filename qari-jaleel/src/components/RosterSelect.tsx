import { useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowLeftRight,
  Dices,
  ImagePlus,
  Pencil,
  Plus,
  Swords,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  Difficulty,
  FighterProfile,
  GameMode,
  isStreetBrawlMode,
  StageId,
} from '../types/game';
import {
  ARCHETYPE_INFO,
  FIGHTING_STYLES,
  resolveFighterStyle,
  STAGE_CONFIGS,
} from '../data/roster';
import { parseImportedFighterJson } from '../utils/storage';
import { assistComboFor, getCombo } from '../data/combos';

interface RosterSelectProps {
  mode: GameMode;
  fighters: FighterProfile[];
  p1Id: string;
  p2Id: string;
  stageId: StageId;
  difficulty: Difficulty;
  onSelectP1: (id: string) => void;
  onSelectP2: (id: string) => void;
  onSwapSides: () => void;
  onSelectStage: (stage: StageId) => void;
  onSelectDifficulty: (diff: Difficulty) => void;
  onDeleteCustom: (id: string) => void;
  onStartMatch: () => void;
  onBackToTitle: () => void;
}

function StatBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2 text-xs short:gap-1 short:text-[9px]">
      <span className="w-14 text-[#B6AA9A] short:w-8">{label}</span>
      <div className="h-1.5 flex-1 bg-[#141210]">
        <div className="h-full" style={{ width: `${value * 10}%`, backgroundColor: color }} />
      </div>
      <span className="font-mono-num w-5 text-right text-[#F8F4EC]">{value}</span>
    </div>
  );
}

export function RosterSelect({
  mode,
  fighters,
  p1Id,
  p2Id,
  stageId,
  difficulty,
  onSelectP1,
  onSelectP2,
  onSwapSides,
  onSelectStage,
  onSelectDifficulty,
  onDeleteCustom,
  onStartMatch,
  onBackToTitle,
}: RosterSelectProps) {
  const [activeSlot, setActiveSlot] = useState<1 | 2>(1);

  const p1 = fighters.find((f) => f.id === p1Id) ?? fighters[0];
  const p2 = fighters.find((f) => f.id === p2Id) ?? fighters[1] ?? fighters[0];

  const handleCardPick = (id: string) => {
    if (mode === 'arcade') {
      onSelectP1(id);
      return;
    }
    if (activeSlot === 1) {
      onSelectP1(id);
      setActiveSlot(2);
    } else {
      onSelectP2(id);
      setActiveSlot(1);
    }
  };

  const handleStartMatchClick = () => {
    onStartMatch();
  };

  const isBrawl = isStreetBrawlMode(mode);
  const isEndless = mode === 'endless_mohalla';
  const modeTitle = isEndless
    ? 'Endless Mohalla · Fair Fight'
    : mode === 'street_brawl'
      ? 'Village Street Brawl · Tag Team'
      : mode === 'arcade'
        ? 'Arcade Tournament'
        : mode === 'versus_2p'
          ? 'Local 2-Player Versus'
          : 'Quick Exhibition';

  return (
    <div className="safe-inset fixed inset-0 z-20 flex flex-col bg-[#141210] text-[#F8F4EC]">
      {/* Top Bar */}
      <header className="flex items-center justify-between gap-6 border-b border-[#F8F4EC]/12 px-4 py-3.5 sm:px-8 short:gap-3 short:px-3 short:py-1.5">
        <button
          type="button"
          onClick={onBackToTitle}
          className="flex items-center gap-2 text-sm font-medium text-[#B6AA9A] hover:text-[#F8F4EC] transition-colors whitespace-nowrap shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
          Menu
        </button>

        <h1 className="font-display text-2xl font-black tracking-wide text-[#F8F4EC] sm:text-3xl short:text-lg whitespace-nowrap">
          {modeTitle}
        </h1>

        <button
          type="button"
          onClick={handleStartMatchClick}
          className="flex items-center gap-2 bg-[#F59E0B] px-5 py-2 text-xs font-bold text-[#141210] hover:bg-[#D97706] transition-colors whitespace-nowrap shrink-0 sm:text-sm short:px-3 short:py-1.5"
        >
          <Swords className="h-4 w-4" />
          {isEndless ? 'Start Endless Mohalla' : isBrawl ? 'Start Street Brawl' : 'Start Match'}
        </button>
      </header>

      <div className="akhara-scroll min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 short:overflow-hidden short:p-2">
        <div className="mx-auto max-w-6xl space-y-6 short:flex short:h-full short:max-w-none short:gap-2 short:space-y-0">
          {/* MATCHUP SHOWCASE (P1 vs P2/Arcade Bracket) */}
          <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-[1fr_auto_1fr] short:flex short:w-[38%] short:shrink-0 short:flex-col short:gap-1.5 short:overflow-y-auto">
            {/* Player 1 Preview */}
            <button
              type="button"
              onClick={() => setActiveSlot(1)}
              className={`flex items-center gap-4 border bg-[#1D1916] p-4 text-left transition-colors short:gap-2 short:p-1.5 ${
                activeSlot === 1 ? 'border-[#F59E0B]' : 'border-[#F8F4EC]/12 hover:border-[#F8F4EC]/30'
              }`}
            >
              <div className="h-24 w-24 shrink-0 overflow-hidden border-2 border-[#F59E0B] bg-[#141210] sm:h-28 sm:w-28 short:h-14 short:w-14">
                <img
                  src={p1.portraitUrl || p1.faceTextureUrl}
                  alt={p1.name}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-[#F59E0B]">
                  {isBrawl ? 'Hero 1 (Lead)' : 'Player 1'} {activeSlot === 1 ? '· Selecting' : ''}
                </div>
                <div className="truncate font-display text-3xl font-black leading-none text-[#F8F4EC] short:text-lg">
                  {p1.name}
                </div>
                <div className="mt-0.5 truncate text-xs text-[#B6AA9A] short:hidden">
                  {p1.nickname} · {ARCHETYPE_INFO[p1.archetype].label}
                </div>
                <div
                  className="mt-0.5 truncate text-[11px] font-bold uppercase tracking-wide"
                  style={{ color: FIGHTING_STYLES[resolveFighterStyle(p1)].color }}
                >
                  Style: {FIGHTING_STYLES[resolveFighterStyle(p1)].label}
                </div>
                <div className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-1 short:mt-1 short:gap-x-2 short:gap-y-0">
                  <StatBar label="Power" value={p1.stats.power} color="#F59E0B" />
                  <StatBar label="Speed" value={p1.stats.speed} color="#F59E0B" />
                  <StatBar label="Reach" value={p1.stats.reach} color="#F59E0B" />
                  <StatBar label="Guard" value={p1.stats.defense} color="#F59E0B" />
                </div>
              </div>
            </button>

            {/* VS / Tag-Team + Swap Control */}
            <div className="flex flex-row flex-wrap items-center justify-center gap-3 lg:flex-col short:flex-row short:gap-2">
              <div className="font-display text-4xl font-black text-[#F59E0B] short:text-lg">
                {isBrawl ? 'TAG' : 'VS'}
              </div>
              {mode !== 'arcade' && (
                <button
                  type="button"
                  onClick={onSwapSides}
                  className="flex items-center gap-1.5 border border-[#F8F4EC]/15 bg-[#1D1916] px-3 py-1.5 text-xs font-semibold text-[#B6AA9A] short:px-2 short:py-0.5 short:text-[10px] hover:border-[#F59E0B] hover:text-[#F8F4EC] transition-colors whitespace-nowrap"
                >
                  <ArrowLeftRight className="h-3.5 w-3.5" />
                  {isBrawl ? 'Swap Lead' : 'Swap Sides'}
                </button>
              )}
              {mode !== 'arcade' && fighters.length > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    const a = Math.floor(Math.random() * fighters.length);
                    let b = Math.floor(Math.random() * (fighters.length - 1));
                    if (b >= a) b += 1;
                    onSelectP1(fighters[a].id);
                    onSelectP2(fighters[b].id);
                  }}
                  className="flex items-center gap-1.5 border border-[#F472B6]/40 bg-[#1D1916] px-3 py-1.5 text-xs font-semibold text-[#F472B6] transition-colors whitespace-nowrap hover:border-[#F472B6] short:px-2 short:py-0.5 short:text-[10px]"
                >
                  <Dices className="h-3.5 w-3.5" />
                  Random squad
                </button>
              )}
              {isBrawl && (() => {
                const combo = getCombo(p1.id, p2.id);
                return combo ? (
                  <div className="basis-full rounded border border-[#F472B6]/40 bg-[#2A1020] px-2 py-1 text-center lg:max-w-[11rem] short:basis-full">
                    <div className="font-display text-sm leading-none font-black tracking-wide text-[#F472B6] uppercase">★ Combo: {combo.name}</div>
                    <div className="mt-0.5 text-[10px] leading-tight text-[#E9D5E0]">{combo.blurb}</div>
                    <div className="text-[10px] leading-tight text-[#C9A6BE] short:hidden">{assistComboFor(combo).blurb}</div>
                  </div>
                ) : null;
              })()}
            </div>

            {/* Player 2 OR Arcade Ladder Overview */}
            {mode === 'arcade' ? (
              <div className="flex flex-col justify-center border border-[#F8F4EC]/12 bg-[#1D1916] p-4 short:p-2">
                <div className="text-xs font-semibold text-[#DC2626]">
                  4-Stage Village Tournament Ladder
                </div>
                <h2 className="mt-1 font-display text-3xl font-black text-[#F8F4EC] short:text-lg">
                  Defeat the Village Champions
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-[#B6AA9A] short:hidden">
                  Your custom imported friends automatically enter the challenger bracket alongside
                  the village regulars across all 3 arenas.
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-xs text-[#B6AA9A]">AI Difficulty:</span>
                  <div className="flex items-center gap-1 bg-[#141210] p-1">
                    {(['novice', 'pehelwan', 'grandmaster'] as Difficulty[]).map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => onSelectDifficulty(d)}
                        className={`px-2.5 py-1 text-xs font-semibold capitalize transition-colors whitespace-nowrap ${
                          difficulty === d
                            ? 'bg-[#DC2626] text-white'
                            : 'text-[#B6AA9A] hover:text-[#F8F4EC]'
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setActiveSlot(2)}
                className={`flex flex-row-reverse items-center gap-4 border bg-[#1D1916] p-4 text-right transition-colors short:flex-row short:gap-2 short:p-1.5 short:text-left ${
                  activeSlot === 2
                    ? isBrawl
                      ? 'border-[#38BDF8]'
                      : 'border-[#DC2626]'
                    : 'border-[#F8F4EC]/12 hover:border-[#F8F4EC]/30'
                }`}
              >
                <div
                  className={`h-24 w-24 shrink-0 overflow-hidden border-2 bg-[#141210] sm:h-28 sm:w-28 short:h-14 short:w-14 ${
                    isBrawl ? 'border-[#38BDF8]' : 'border-[#DC2626]'
                  }`}
                >
                  <img
                    src={p2.portraitUrl || p2.faceTextureUrl}
                    alt={p2.name}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div
                    className={`text-xs font-semibold ${
                      isBrawl ? 'text-[#38BDF8]' : 'text-[#F87171]'
                    }`}
                  >
                    {isBrawl
                      ? 'Hero 2 (Tag Partner)'
                      : mode === 'versus_2p'
                        ? 'Player 2'
                        : 'AI Opponent'}{' '}
                    {activeSlot === 2 ? '· Selecting' : ''}
                  </div>
                  <div className="truncate font-display text-3xl font-black leading-none text-[#F8F4EC] short:text-lg">
                    {p2.name}
                  </div>
                  <div className="mt-0.5 truncate text-xs text-[#B6AA9A] short:hidden">
                    {p2.nickname} · {ARCHETYPE_INFO[p2.archetype].label}
                  </div>
                  <div
                    className="mt-0.5 truncate text-[11px] font-bold uppercase tracking-wide"
                    style={{ color: FIGHTING_STYLES[resolveFighterStyle(p2)].color }}
                  >
                    Style: {FIGHTING_STYLES[resolveFighterStyle(p2)].label}
                  </div>
                  <div className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-1 text-left short:mt-1 short:gap-x-2 short:gap-y-0">
                    <StatBar label="Power" value={p2.stats.power} color={isBrawl ? '#38BDF8' : '#DC2626'} />
                    <StatBar label="Speed" value={p2.stats.speed} color={isBrawl ? '#38BDF8' : '#DC2626'} />
                    <StatBar label="Reach" value={p2.stats.reach} color={isBrawl ? '#38BDF8' : '#DC2626'} />
                    <StatBar label="Guard" value={p2.stats.defense} color={isBrawl ? '#38BDF8' : '#DC2626'} />
                  </div>
                </div>
              </button>
            )}
          </div>

          <div className="space-y-6 short:min-w-0 short:flex-1 short:space-y-2 short:overflow-y-auto">
          {/* ROSTER GRID + IMPORT FRIEND CTA */}
          <section>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl font-bold text-[#F8F4EC] short:text-base">
                  Choose Fighter ({fighters.length})
                </h2>
                <p className="text-xs text-[#B6AA9A] short:hidden">
                  {isEndless
                    ? 'Fair fight: chai upgrades are switched off in Endless, so every score counts the same. '
                    : ''}
                  {isBrawl
                    ? `Pick 2 Squad Heroes (flip between both anytime with Tab/C or SWITCH!) — assigning Hero ${activeSlot}.`
                    : mode === 'arcade'
                      ? 'Select your fighter for the tournament ladder.'
                      : `Click a card to assign Player ${activeSlot}.`}
                </p>
              </div>
            </div>


            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 short:mt-1 short:grid-cols-3 short:gap-1.5">
              {fighters.map((f) => {
                const isP1 = f.id === p1.id;
                const isP2 = mode !== 'arcade' && f.id === p2.id;
                return (
                  <div
                    key={f.id}
                    className={`group relative flex flex-col border bg-[#1D1916] transition-colors ${
                      isP1 && isP2
                        ? 'border-[#F59E0B]'
                        : isP1
                          ? 'border-[#F59E0B]'
                          : isP2
                            ? 'border-[#DC2626]'
                            : 'border-[#F8F4EC]/12 hover:border-[#F8F4EC]/35'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleCardPick(f.id)}
                      className="flex flex-1 flex-col text-left"
                    >
                      <div className="relative aspect-square w-full overflow-hidden bg-[#141210] short:aspect-[5/2]">
                        <img
                          src={f.portraitUrl || f.faceTextureUrl}
                          alt={f.name}
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover object-top transition-transform duration-200 group-hover:scale-105"
                        />
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#141210] via-[#141210]/65 to-transparent p-2.5 pt-8 short:p-1 short:pt-4">
                          <div className="truncate font-display text-2xl font-black leading-none text-[#F8F4EC] short:text-sm">
                            {f.name}
                          </div>
                          <div className="mt-0.5 truncate text-[11px] text-[#B6AA9A] short:hidden">
                            {f.nickname} ·{' '}
                            <span
                              className="font-semibold"
                              style={{ color: FIGHTING_STYLES[resolveFighterStyle(f)].color }}
                            >
                              {FIGHTING_STYLES[resolveFighterStyle(f)].shortLabel}
                            </span>
                          </div>
                        </div>

                        {(isP1 || isP2) && (
                          <div className="absolute top-2 left-2 flex gap-1">
                            {isP1 && (
                              <span className="bg-[#F59E0B] px-1.5 py-0.5 font-mono-num text-[10px] font-bold text-[#141210]">
                                {isBrawl ? 'HERO 1' : 'P1'}
                              </span>
                            )}
                            {isP2 && (
                              <span
                                className={`px-1.5 py-0.5 font-mono-num text-[10px] font-bold ${
                                  isBrawl
                                    ? 'bg-[#38BDF8] text-[#141210]'
                                    : 'bg-[#DC2626] text-white'
                                }`}
                              >
                                {isBrawl ? 'HERO 2' : mode === 'versus_2p' ? 'P2' : 'AI'}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </button>

                    <div className="flex items-center justify-between gap-1 border-t border-[#F8F4EC]/10 bg-[#181512] px-2.5 py-1.5 short:hidden">
                      {f.isCustom && !f.id.startsWith('qari_') && !f.id.startsWith('rebel_') && (
                        <button
                          type="button"
                          onClick={() => onDeleteCustom(f.id)}
                          aria-label={`Delete ${f.name}`}
                          className="p-1 text-[#B6AA9A] hover:text-[#DC2626]"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* STAGE SELECT & QUICK AI DIFFICULTY */}
          <section className="border-t border-[#F8F4EC]/10 pt-5 short:pt-1.5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl font-bold text-[#F8F4EC] short:text-base">
                  Indian Village Arena
                </h2>
                <p className="text-xs text-[#B6AA9A] short:hidden">
                  Pick your 3D battleground across the village.
                </p>
              </div>
              {mode === 'quick_ai' && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#B6AA9A]">AI Difficulty:</span>
                  <div className="flex items-center gap-1 bg-[#1D1916] p-1">
                    {(['novice', 'pehelwan', 'grandmaster'] as Difficulty[]).map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => onSelectDifficulty(d)}
                        className={`px-3 py-1 text-xs font-semibold capitalize transition-colors whitespace-nowrap ${
                          difficulty === d
                            ? 'bg-[#F59E0B] text-[#141210]'
                            : 'text-[#B6AA9A] hover:text-[#F8F4EC]'
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3 short:mt-1 short:grid-cols-3 short:gap-1.5">
              {STAGE_CONFIGS.map((stage) => {
                const selected = stage.id === stageId;
                return (
                  <button
                    key={stage.id}
                    type="button"
                    onClick={() => onSelectStage(stage.id)}
                    className={`group relative overflow-hidden border text-left transition-colors ${
                      selected
                        ? 'border-[#F59E0B]'
                        : 'border-[#F8F4EC]/15 hover:border-[#F8F4EC]/40'
                    }`}
                  >
                    <div className="aspect-video w-full overflow-hidden bg-[#1D1916] short:aspect-[16/5]">
                      <img
                        src={stage.backdropUrl}
                        alt={stage.name}
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-[#141210] via-[#141210]/35 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-3 short:p-1">
                      <div className="font-display text-2xl font-black leading-none text-[#F8F4EC] short:text-sm">
                        {stage.name}
                      </div>
                      <div className="mt-0.5 text-xs text-[#B6AA9A] short:hidden">
                        {stage.subtitle} · {stage.timeOfDay}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
          </div>
        </div>
      </div>
    </div>
  );
}
