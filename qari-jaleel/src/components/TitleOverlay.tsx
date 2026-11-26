import { useMemo, useState } from 'react';
import { Clapperboard, Coffee, Download, Dumbbell, Flame, Settings, Swords, Trophy, Users, X } from 'lucide-react';
import { SettingsPanel } from './SettingsPanel';
import { HallOfFame } from './Leaderboard';
import { Credits } from './Credits';
import { TitlesPanel } from './TitlesPanel';
import { ChachaRoad } from './ChachaRoad';
import { useChai } from '../utils/upgrades';
import { usePwaInstall, useUpdateAvailable } from '../utils/pwa';
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
  const [showCredits, setShowCredits] = useState(false);
  const [showRoad, setShowRoad] = useState(false);
  const [hofTab, setHofTab] = useState<'scores' | 'titles'>('scores');
  const chai = useChai();
  const pwa = usePwaInstall();
  const update = useUpdateAvailable();
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [showInstallTip, setShowInstallTip] = useState(() => {
    try {
      return !localStorage.getItem('mafia-bhaiyas-install-tip-v1');
    } catch {
      return true;
    }
  });
  const dismissInstallTip = () => {
    setShowInstallTip(false);
    try {
      localStorage.setItem('mafia-bhaiyas-install-tip-v1', '1');
    } catch {
      // ignore
    }
  };

  const brawlMeta = records.brawlBestRank
    ? `Best Rank ${records.brawlBestRank} · ${records.brawlBestScore.toLocaleString()} pts`
    : '3 Village Zones · Boss Bade Tau';

  const endlessMeta =
    records.endlessBestWave > 0
      ? `Best Wave ${records.endlessBestWave} · ${records.endlessHighScore.toLocaleString()} pts`
      : 'Infinite Escalating Waves';

  return (
    <div className="safe-inset pointer-events-none fixed inset-0 z-20 flex flex-col justify-between bg-gradient-to-t from-[#141210] via-[#141210]/35 to-[#141210]/65 p-5 sm:p-10 [@media(max-height:480px)]:p-3">
      <div className="pointer-events-none fixed right-2 bottom-1 z-30 font-mono-num text-[10px] font-bold tracking-widest text-[#F8F4EC]/60">
        v{__APP_VERSION__}
      </div>
      {update.latest && (
        <button
          type="button"
          onClick={update.reload}
          className="pointer-events-auto fixed top-2 left-1/2 z-40 -translate-x-1/2 animate-pulse rounded-full border-2 border-[#FDE047] bg-[#F59E0B] px-4 py-1.5 text-[11px] [@media(max-height:400px)]:top-0.5 [@media(max-height:400px)]:py-0.5 [@media(max-height:400px)]:text-[10px] font-black tracking-wider whitespace-nowrap text-[#141210] uppercase shadow-[0_0_18px_rgba(250,204,21,0.7)]"
        >
          New version v{update.latest} ready · tap to update
        </button>
      )}
      {/* Top quiet header */}
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between">
        <img src={logoUrl} alt="Mafia Bhaiyas" draggable={false} className="h-[min(26vh,10.5rem)] w-auto select-none drop-shadow-[0_6px_18px_rgba(0,0,0,0.8)]" />
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#F59E0B]/90">
          <span className="[@media(max-height:400px)]:hidden">
            {customCount > 0 ? `Blood and Honour · ${customCount} Custom Fighters` : 'Blood and Honour'}
          </span>
          <button
            type="button"
            onClick={() => setShowBoard(true)}
            className="pointer-events-auto ml-3 inline-flex h-9 items-center gap-1.5 border border-[#FACC15]/60 bg-[#141210]/90 px-2.5 align-middle text-[10px] font-black uppercase tracking-[0.14em] text-[#FACC15] hover:border-[#FACC15] transition-colors"
          >
            <Trophy className="h-3.5 w-3.5" />
            Hall of Fame
          </button>
          {pwa.available && (
            <span className="relative ml-3 inline-block align-middle">
              <button
                type="button"
                onClick={() => {
                  dismissInstallTip();
                  if (pwa.manualIos) setShowIosHelp(true);
                  else void pwa.install();
                }}
                aria-label="Install the app"
                className="pointer-events-auto inline-flex h-9 items-center gap-1.5 border border-[#4ADE80]/60 bg-[#06210F]/90 px-2.5 text-[10px] font-black uppercase tracking-[0.14em] text-[#4ADE80] hover:border-[#4ADE80] transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                <span className="[@media(max-height:400px)]:hidden">Install</span>
              </button>
              {showInstallTip && (
                <button
                  type="button"
                  onClick={dismissInstallTip}
                  aria-label="Dismiss install tip"
                  className="neon-tip pointer-events-auto absolute top-full left-1/2 z-30 mt-0.5 flex w-[12.5rem] -translate-x-[72%] flex-col items-stretch normal-case"
                >
                  {/* curved neon arrow up to the Install button */}
                  <svg viewBox="0 0 90 56" className="neon-arrow mr-[18%] ml-auto h-11 w-[4.5rem]" fill="none" aria-hidden="true">
                    <path d="M8 52 C 4 30, 30 34, 52 14 C 58 9, 64 6, 70 5" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" />
                    <path d="M58 3 L 72 4.5 L 66 17" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="neon-sign relative rounded-xl border-2 px-3 py-1.5 text-center">
                    <span className="neon-text block font-display text-[19px] leading-none font-black tracking-[0.08em] uppercase">Install here, bhai!</span>
                    <span className="neon-text-soft mt-1 block font-display text-[11px] leading-none font-bold tracking-[0.2em] uppercase">for a better experience</span>
                  </span>
                </button>
              )}
            </span>
          )}
          <button
            type="button"
            onClick={() => setShowRoad(true)}
            aria-label="Road to Chacha Chai's"
            className="pointer-events-auto ml-3 inline-flex h-9 items-center gap-1.5 border border-[#FCD34D]/60 bg-[#2A1D0A]/90 px-2.5 align-middle text-[10px] font-black uppercase tracking-[0.14em] text-[#FCD34D] hover:border-[#FCD34D] transition-colors"
          >
            <Coffee className="h-3.5 w-3.5" />
            <span className="[@media(max-height:400px)]:hidden">Chacha Chai&apos;s</span>
            <span className="font-mono-num rounded-full bg-[#FCD34D] px-1.5 text-[#2A1D0A]">{chai.coins}</span>
          </button>
          <button
            type="button"
            onClick={() => setShowCredits(true)}
            aria-label="Credits"
            className="pointer-events-auto ml-3 inline-flex h-9 items-center gap-1.5 border border-[#F8F4EC]/25 bg-[#141210]/90 px-2.5 align-middle text-[10px] font-black uppercase tracking-[0.14em] text-[#F8F4EC] hover:border-[#F59E0B] hover:text-[#F59E0B] transition-colors"
          >
            <Clapperboard className="h-3.5 w-3.5" />
            Credits
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

        <div className="pointer-events-auto flex w-full max-w-md flex-col gap-2.5 landscape:max-w-lg">
          {/* Primary Arcade Modes: Street Brawl + Endless Mohalla */}
          <div className="grid grid-cols-1 gap-2.5 landscape:grid-cols-2">
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
          <div className="grid grid-cols-1 gap-2 landscape:grid-cols-2">
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

            <button
              type="button"
              onClick={() => onSelectMode('practice_yard')}
              className="flex items-center justify-center gap-2 border border-[#38BDF8]/45 bg-[#0B1F2A]/90 px-3 py-2.5 text-xs font-bold text-[#BAE6FD] hover:border-[#38BDF8] hover:text-[#F8F4EC] transition-colors whitespace-nowrap landscape:col-span-2"
            >
              <Dumbbell className="h-3.5 w-3.5 shrink-0" />
              Practice Yard · learn the moves
            </button>

          </div>
        </div>
      </div>
      {showSettings && (
        <div className="safe-inset pointer-events-auto fixed inset-0 z-40 flex overflow-y-auto bg-[#141210]/88 p-4 short:p-2">
          <div className="m-auto w-full max-w-sm border border-[#F8F4EC]/15 bg-[#1D1916] p-6 short:p-3">
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
      {showIosHelp && (
        <div className="safe-inset pointer-events-auto fixed inset-0 z-50 flex overflow-y-auto bg-[#141210]/90 p-4" onClick={() => setShowIosHelp(false)}>
          <div className="m-auto w-full max-w-sm border border-[#4ADE80]/50 bg-[#1A1714] p-5 text-left text-[#F8F4EC]">
            <div className="font-display text-xl font-black tracking-wider text-[#4ADE80] uppercase">Install on iPhone</div>
            <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm">
              <li>Open this page in <b>Safari</b>.</li>
              <li>Tap the <b>Share</b> button (the square with an arrow).</li>
              <li>Scroll and tap <b>Add to Home Screen</b>.</li>
              <li>Tap <b>Add</b>. Open it from the new icon: full screen, no browser bars.</li>
            </ol>
            <button type="button" className="mt-4 w-full bg-[#F59E0B] py-2 text-sm font-black text-[#141210] uppercase">Got it</button>
          </div>
        </div>
      )}
      {showRoad && <ChachaRoad onClose={() => setShowRoad(false)} />}
      {showCredits && <Credits onClose={() => setShowCredits(false)} />}
      {showBoard && (
        <div className="safe-inset pointer-events-auto fixed inset-0 z-40 flex overflow-y-auto bg-[#141210]/90 p-4 short:p-2">
          <div className="m-auto w-full max-w-md">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-display text-3xl font-black uppercase tracking-wider text-[#FACC15]">Hall of Fame</h2>
              <button type="button" onClick={() => setShowBoard(false)} aria-label="Close" className="text-[#B6AA9A] hover:text-[#F8F4EC]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mb-2 flex gap-2">
              {(['scores', 'titles'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setHofTab(t)}
                  className={`px-3 py-1 text-[11px] font-black uppercase tracking-widest ${
                    hofTab === t ? 'bg-[#FACC15] text-[#141210]' : 'border border-[#FACC15]/40 text-[#FACC15]'
                  }`}
                >
                  {t === 'scores' ? 'Scores' : 'Titles'}
                </button>
              ))}
            </div>
            {hofTab === 'scores' ? <HallOfFame /> : <TitlesPanel />}
          </div>
        </div>
      )}
    </div>
  );
}
