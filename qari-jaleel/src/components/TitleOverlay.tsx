import { useMemo, useState } from 'react';
import { Flame, Settings, Swords, Trophy, Users, X } from 'lucide-react';
import { SettingsPanel } from './SettingsPanel';
import { HallOfFame } from './Leaderboard';
import { GameMode } from '../types/game';
import { loadArcadeRecords } from '../utils/storage';
import logoUrl from '../assets/images/mafia-bhaiyas-logo.png?inline';

interface TitleOverlayProps {
  customCount: number;
  onSelectMode: (mode: GameMode) => void;
}

export function TitleOverlay({
  customCount,
  onSelectMode,
}: TitleOverlayProps) {
  const records = useMemo(() => loadArcadeRecords(), []);
  const [showSettings, setShowSettings] = useState(false);
  const [showBoard, setShowBoard] = useState(false);

  const brawlMeta = records.brawlBestRank
    ? `Best Rank ${records.brawlBestRank} · ${records.brawlBestScore.toLocaleString()} pts`
    : '3 Village Zones · Boss Bade Tau';

  const endlessMeta =
    records.endlessBestWave > 0
      ? `Best Wave ${records.endlessBestWave} · ${records.endlessHighScore.toLocaleString()} pts`
      : 'Infinite Escalating Waves';

  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between bg-gradient-to-t from-[#141210] via-[#141210]/35 to-[#141210]/65 p-5 sm:p-10">
      {/* Top quiet header */}
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between">
        <img src={logoUrl} alt="Mafia Bhaiyas" draggable={false} className="h-[min(26vh,10.5rem)] w-auto select-none drop-shadow-[0_6px_18px_rgba(0,0,0,0.8)]" />
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#F59E0B]/90">
          {customCount > 0 ? `Blood and Honour · ${customCount} Custom Fighters` : 'Blood and Honour'}
          <button
            type="button"
            onClick={() => setShowBoard(true)}
            className="pointer-events-auto ml-3 inline-flex h-9 items-center gap-1.5 border border-[#FACC15]/60 bg-[#141210]/90 px-2.5 align-middle text-[10px] font-black uppercase tracking-[0.14em] text-[#FACC15] hover:border-[#FACC15] transition-colors"
          >
            <Trophy className="h-3.5 w-3.5" />
            Hall of Fame
          </button>
          <button
            type="button"
            onClick={() => setShowSettings(true)}
            aria-label="Settings"
            className="pointer-events-auto ml-3 inline-flex h-9 w-9 items-center justify-center border border-[#F8F4EC]/25 bg-[#141210]/90 align-middle text-[#F8F4EC] hover:border-[#F59E0B] hover:text-[#F59E0B] transition-colors"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Bottom-left hero title & mode hub leaving the live 3D village akhara battle unobstructed */}
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 pb-2 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-xl">
          <div className="[@media(max-height:480px)]:hidden font-display text-lg font-extrabold uppercase tracking-[0.22em] text-[#DC2626] drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)] sm:text-2xl">
            Blood and Honour
          </div>
          <p className="mt-3 max-w-lg [@media(max-height:480px)]:hidden text-sm font-bold uppercase tracking-[0.14em] leading-relaxed text-[#F8F4EC] drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)] sm:text-base">
            One Man. One Village. Absolute Power.{' '}
            <span className="text-[#F59E0B]">One Sheep.</span>
          </p>
        </div>

        <div className="pointer-events-auto flex w-full max-w-md flex-col gap-2.5">
          {/* Primary Arcade Modes: Street Brawl + Endless Mohalla */}
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => onSelectMode('street_brawl')}
              className="flex flex-col items-start justify-between bg-[#F59E0B] px-4 py-3 text-left text-[#141210] hover:bg-[#D97706] transition-colors"
            >
              <span className="flex items-center gap-2 text-sm font-black uppercase tracking-wide whitespace-nowrap">
                <Swords className="h-4 w-4 shrink-0" />
                Village Street Brawl
              </span>
              <span className="mt-1 font-mono-num text-[11px] font-bold text-[#141210]/80">
                {brawlMeta}
              </span>
            </button>

            <button
              type="button"
              onClick={() => onSelectMode('endless_mohalla')}
              className="flex flex-col items-start justify-between border border-[#DC2626] bg-[#241312]/95 px-4 py-3 text-left text-[#F8F4EC] hover:border-[#F59E0B] hover:bg-[#2F1715] transition-colors"
            >
              <span className="flex items-center gap-1.5 text-[13px] font-black uppercase tracking-wide text-[#FCD34D] whitespace-nowrap">
                <Flame className="h-4 w-4 shrink-0 text-[#EF4444]" />
                Endless Mohalla
              </span>
              <span className="mt-1 rounded-sm bg-gradient-to-r from-[#FACC15] to-[#F59E0B] px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.16em] text-[#141210]">
                Global Challenge
              </span>
              <span className="mt-1 font-mono-num text-[11px] font-semibold text-[#D6CEC2]">
                {endlessMeta}
              </span>
            </button>
          </div>

          {/* Secondary Modes */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => onSelectMode('arcade')}
              className="flex items-center justify-center gap-2 border border-[#F8F4EC]/25 bg-[#141210]/90 px-3 py-2.5 text-xs font-bold text-[#F8F4EC] hover:border-[#F59E0B] hover:text-[#F59E0B] transition-colors whitespace-nowrap"
            >
              <Trophy className="h-3.5 w-3.5 shrink-0" />
              Arcade 1v1
            </button>

            <button
              type="button"
              onClick={() => onSelectMode('versus_2p')}
              className="flex items-center justify-center gap-2 border border-[#F8F4EC]/25 bg-[#141210]/90 px-3 py-2.5 text-xs font-semibold text-[#F8F4EC] hover:border-[#F59E0B] hover:text-[#F59E0B] transition-colors whitespace-nowrap"
            >
              <Users className="h-3.5 w-3.5 shrink-0" />
              Local 2P
            </button>

          </div>
        </div>
      </div>
      {showSettings && (
        <div className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-[#141210]/88 p-4">
          <div className="w-full max-w-sm border border-[#F8F4EC]/15 bg-[#1D1916] p-6">
            <div className="flex items-center justify-between border-b border-[#F8F4EC]/10 pb-3">
              <h2 className="font-display text-3xl font-black text-[#F8F4EC]">Settings</h2>
              <button type="button" onClick={() => setShowSettings(false)} aria-label="Close settings" className="text-[#B6AA9A] hover:text-[#F8F4EC]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <SettingsPanel />
          </div>
        </div>
      )}
      {showBoard && (
        <div className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-[#141210]/90 p-4">
          <div className="w-full max-w-md">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-display text-3xl font-black uppercase tracking-wider text-[#FACC15]">Hall of Fame</h2>
              <button type="button" onClick={() => setShowBoard(false)} aria-label="Close" className="text-[#B6AA9A] hover:text-[#F8F4EC]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <HallOfFame />
          </div>
        </div>
      )}
    </div>
  );
}
