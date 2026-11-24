import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeftRight,
  ArrowUp,
  Bike,
  ChevronRight,
  Flame,
  Gamepad2,
  Pause,
  Shield,
  Sparkles,
  Swords,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import { GameMode, HudSnapshot, isStreetBrawlMode, VillageBoonId } from '../types/game';
import { ArenaCanvasHandle } from './ArenaCanvas';
import { VirtualThumbstick } from './VirtualThumbstick';
import { BUTTON_SCALE, useSettings } from '../utils/settings';

const BOON_SHORT_LABELS: Record<VillageBoonId, { label: string; color: string }> = {
  extra_mirchi: { label: 'EXTRA MIRCHI', color: '#EF4444' },
  iron_lungi: { label: 'IRON LUNGI', color: '#38BDF8' },
  bazaar_bargain: { label: 'BAZAAR BARGAIN', color: '#F59E0B' },
  double_dhol: { label: 'DOUBLE DHOL', color: '#A855F7' },
  kadak_chai: { label: 'KADAK CHAI', color: '#22C55E' },
};

function triggerHaptic(ms: number) {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate(ms);
    } catch {
      // ignore unsupported vibration
    }
  }
}

interface CombatHudProps {
  hud: HudSnapshot;
  mode: GameMode;
  stageName: string;
  arcadeProgress?: { current: number; total: number };
  muted: boolean;
  showTouchControls: boolean;
  onToggleMute: () => void;
  onToggleTouchControls: () => void;
  onOpenPause: () => void;
  arenaRef: React.RefObject<ArenaCanvasHandle | null>;
}

const TUTORIAL_KEY = 'mafia-bhaiyas-tutorial-v1';

/** One-time tip card shown over the first fight. Tap to dismiss. */
function TutorialHint() {
  const [open, setOpen] = useState(() => {
    try {
      return !localStorage.getItem(TUTORIAL_KEY);
    } catch {
      return false;
    }
  });
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => close(), 14000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  const close = () => {
    setOpen(false);
    try {
      localStorage.setItem(TUTORIAL_KEY, '1');
    } catch {
      // ignore
    }
  };
  if (!open) return null;
  const tips: [string, string][] = [
    ['Stick', 'move · flick to dash'],
    ['Punch / Kick', 'chain taps for combos'],
    ['Shield', 'tap = dodge, hold = guard'],
    ['Dodge a swing', 'then hit back for x1.5'],
    ['Swap', 'tag your partner in mid-combo'],
    ['Power', 'fires when the ring is full'],
  ];
  return (
    <button
      type="button"
      onClick={close}
      className="pointer-events-auto fixed top-[18%] left-1/2 z-40 w-[min(22rem,88vw)] -translate-x-1/2 rounded-xl bg-[#141210]/92 p-3 text-left [@media(max-height:400px)]:top-[33%] [@media(max-height:400px)]:w-[min(17rem,60vw)] [@media(max-height:400px)]:p-2 shadow-xl ring-1 ring-[#F59E0B]/50"
    >
      <div className="mb-1 text-[11px] font-black uppercase tracking-[0.2em] text-[#F59E0B]">Quick tips · tap to close</div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
        {tips.map(([k, v]) => (
          <div key={k} className="text-[11px] leading-tight text-[#D6CEC2] [@media(max-height:400px)]:text-[9px]">
            <span className="font-black text-[#F8F4EC]">{k}</span> {v}
          </div>
        ))}
      </div>
    </button>
  );
}

function FighterPortraitThumb({
  url,
  name,
  accentClass,
}: {
  url: string;
  name: string;
  accentClass: string;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <div
      className={`relative h-12 w-12 shrink-0 overflow-hidden border bg-[#221E1A] sm:h-14 sm:w-14 ${accentClass}`}
    >
      {!failed && url ? (
        <img
          src={url}
          alt={name}
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center font-display text-2xl font-bold text-[#F59E0B]">
          {name.slice(0, 2).toUpperCase()}
        </div>
      )}
    </div>
  );
}

export function CombatHud({
  hud,
  mode,
  stageName,
  arcadeProgress,
  muted,
  showTouchControls,
  onToggleMute,
  onToggleTouchControls,
  onOpenPause,
  arenaRef,
}: CombatHudProps) {
  const p1Pct = Math.max(0, Math.min(100, (hud.p1.hp / hud.p1.maxHp) * 100));
  const p1RecPct = Math.max(
    0,
    Math.min(100 - p1Pct, ((hud.p1.recoverableHp ?? 0) / hud.p1.maxHp) * 100)
  );
  const p1TrailPct = Math.max(p1Pct + p1RecPct, Math.min(100, (hud.p1.trailHp / hud.p1.maxHp) * 100));
  const p2Pct = Math.max(0, Math.min(100, (hud.p2.hp / hud.p2.maxHp) * 100));
  const p2RecPct = Math.max(
    0,
    Math.min(100 - p2Pct, ((hud.p2.recoverableHp ?? 0) / hud.p2.maxHp) * 100)
  );
  const p2TrailPct = Math.max(p2Pct + p2RecPct, Math.min(100, (hud.p2.trailHp / hud.p2.maxHp) * 100));

  const settings = useSettings();
  const guardPressTimeRef = useRef<number>(0);
  const swapHoldTimerRef = useRef<number | null>(null);
  const swapHoldFiredRef = useRef<boolean>(false);

  const brawl = isStreetBrawlMode(mode) ? hud.brawl : undefined;
  const activeHero = brawl ? (brawl.activeHeroIndex === 0 ? hud.p1 : hud.p2) : hud.p1;

  // Support 1/2/3 keyboard hotkeys during Between-Zone Village Boon Card selection
  useEffect(() => {
    const boons = brawl?.pendingBoons;
    if (!boons || boons.length === 0) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Digit1' && boons[0]) {
        triggerHaptic(35);
        arenaRef.current?.selectVillageBoon(boons[0].id);
      } else if (e.code === 'Digit2' && boons[1]) {
        triggerHaptic(35);
        arenaRef.current?.selectVillageBoon(boons[1].id);
      } else if (e.code === 'Digit3' && boons[2]) {
        triggerHaptic(35);
        arenaRef.current?.selectVillageBoon(boons[2].id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [brawl?.pendingBoons, arenaRef]);

  const bindTap = (
    action:
      | 'lp'
      | 'rp'
      | 'kick'
      | 'sidestep'
      | 'throw'
      | 'rage'
      | 'switch'
      | 'assist'
      | 'panic_special'
      | 'jump',
    hapticMs = 25
  ) => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      triggerHaptic(hapticMs);
      arenaRef.current?.triggerTouchAction(action);
    },
  });

  // Tap (<300ms) = Instant Tag-Swap with Ambush; Hold (>=300ms) = Drive-By Partner Assist!
  const bindSwapOrAssist = {
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      swapHoldFiredRef.current = false;
      if (swapHoldTimerRef.current !== null) window.clearTimeout(swapHoldTimerRef.current);
      swapHoldTimerRef.current = window.setTimeout(() => {
        swapHoldFiredRef.current = true;
        swapHoldTimerRef.current = null;
        triggerHaptic(45);
        arenaRef.current?.triggerTouchAction('assist');
      }, 300);
    },
    onPointerUp: (e: React.PointerEvent) => {
      e.preventDefault();
      if (swapHoldTimerRef.current !== null) {
        window.clearTimeout(swapHoldTimerRef.current);
        swapHoldTimerRef.current = null;
      }
      if (!swapHoldFiredRef.current) {
        triggerHaptic(30);
        arenaRef.current?.triggerTouchAction('switch');
      }
      swapHoldFiredRef.current = false;
    },
    onPointerCancel: () => {
      if (swapHoldTimerRef.current !== null) {
        window.clearTimeout(swapHoldTimerRef.current);
        swapHoldTimerRef.current = null;
      }
      swapHoldFiredRef.current = false;
    },
  };

  // Smart ergonomic GUARD / DODGE button:
  // Raises Guard immediately on press (so timed Parry works with zero latency!),
  // and if released within 190ms fires STEP 3D Dodge with invulnerability frames!
  const bindGuardOrDodge = {
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      guardPressTimeRef.current = performance.now();
      triggerHaptic(25);
      arenaRef.current?.setTouchHold('block', true);
    },
    onPointerUp: (e: React.PointerEvent) => {
      e.preventDefault();
      arenaRef.current?.setTouchHold('block', false);
      const heldMs = performance.now() - guardPressTimeRef.current;
      if (heldMs > 0 && heldMs < 190) {
        arenaRef.current?.triggerTouchAction('sidestep');
      }
      guardPressTimeRef.current = 0;
    },
    onPointerCancel: () => {
      arenaRef.current?.setTouchHold('block', false);
      guardPressTimeRef.current = 0;
    },
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between p-2.5 sm:p-4">
      {/* Powerup Activation Banner Flash */}
      {hud.rageFlashSide && (
        <div className="pointer-events-none fixed inset-x-0 top-24 z-20 flex justify-center sm:top-28">
          <div className="border-y-2 border-[#F59E0B] bg-[#141210]/95 px-8 py-2.5 text-center shadow-lg">
            <div className="text-[10px] font-bold tracking-[0.25em] text-[#FCD34D] uppercase">
              Special Powerup Activated
            </div>
            <div className="font-display text-2xl font-black tracking-wider text-[#F59E0B] sm:text-4xl">
              {hud.rageFlashSide === 1 ? hud.p1.callout : hud.p2.callout}
            </div>
          </div>
        </div>
      )}

      <TutorialHint />

      {/* Live Comic Speech Bubble for Unique Powerups (e.g. Jam's snooker cue line, Jav's story) */}
      {hud.speechBubble && (
        <div
          key={`${hud.speechBubble.speaker}-${hud.speechBubble.text}`}
          className={`pointer-events-none fixed top-[24%] z-30 flex w-full px-5 sm:top-[22%] ${
            hud.speechBubble.side === 1 ? 'justify-start sm:pl-20' : 'justify-end sm:pr-20'
          }`}
        >
          <div className="bubble-pop relative max-w-[14rem] rounded-2xl bg-[#FFFDF8] px-3 py-1.5 text-[#141210] shadow-[0_4px_14px_rgba(0,0,0,0.4)] sm:max-w-[17rem]">
            <div className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-[#B45309]">
              {hud.speechBubble.speaker}
            </div>
            <div className="text-[13px] font-semibold leading-tight [text-wrap:balance] sm:text-[15px]">
              {hud.speechBubble.text}
            </div>
            <div
              className={`absolute -bottom-1 h-2.5 w-2.5 rotate-45 bg-[#FFFDF8] ${
                hud.speechBubble.side === 1 ? 'left-6' : 'right-6'
              }`}
            />
          </div>
        </div>
      )}

      {/* Endless no-hit streak chip */}
      {hud.streakMult !== undefined && hud.streakMult > 1 && (
        <div className="pointer-events-none fixed top-[15%] left-1/2 z-20 -translate-x-1/2 rounded-full bg-[#0B1F2A]/90 px-3 py-0.5 text-[11px] font-black tracking-widest text-[#38BDF8] ring-1 ring-[#38BDF8]/50">
          STREAK x{hud.streakMult.toFixed(2)}
        </div>
      )}

      {/* Qari's "two mins bro" countdown clock: races down, stalls on 0:01, then adds ten minutes */}
      {hud.comedyTimer && (
        <div className="pointer-events-none fixed top-[46%] left-1/2 z-30 -translate-x-1/2">
          <div
            className={`flex items-center gap-2 border-[3px] border-[#141210] bg-[#0B0B0B] px-4 py-1.5 shadow-[4px_4px_0px_#141210] ${
              hud.comedyTimer === '0:01' || hud.comedyTimer === '+10:00' ? 'animate-pulse' : ''
            }`}
          >
            <span className="text-[10px] font-black tracking-wider text-[#F59E0B] uppercase">Two mins</span>
            <span
              className="font-mono-num text-2xl font-black text-[#FF4D3D] tabular-nums"
              style={{ textShadow: '0 0 10px rgba(255,77,61,0.7)' }}
            >
              {hud.comedyTimer}
            </span>
          </div>
        </div>
      )}

      {/* Bollywood Comic Impact Popups (capped & smoothly fading within 0.55s) */}
      {brawl && brawl.comicPopups.length > 0 && (
        <div className="pointer-events-none fixed inset-0 z-25 overflow-hidden">
          {brawl.comicPopups.map((popup) => {
            const tilt = ((popup.id % 5) - 2) * 3.5;
            const sc = popup.scale ?? 1;
            return (
              <div
                key={popup.id}
                style={{
                  left: `${popup.xPct}%`,
                  top: `${popup.yPct}%`,
                  color: popup.color,
                  opacity: popup.opacity,
                  transform: `translate(-50%, -50%) rotate(${tilt}deg) scale(${sc.toFixed(3)})`,
                  textShadow:
                    '2px 2px 0 #141210, -1px -1px 0 #141210, 1px -1px 0 #141210, -1px 1px 0 #141210',
                }}
                className="comic-popup absolute font-display text-base font-black tracking-wider uppercase sm:text-2xl whitespace-nowrap will-change-transform"
              >
                {popup.text}
              </div>
            );
          })}
        </div>
      )}

      {/* Auto-Rickshaw Incoming Lane Warning */}
      {brawl?.rickshawWarning && (
        <div className="pointer-events-none fixed inset-x-0 top-20 z-30 flex justify-center sm:top-24">
          <div className="animate-pulse border-2 border-[#FACC15] bg-[#14532D]/95 px-6 py-2 text-center shadow-[0_0_24px_rgba(250,204,21,0.5)]">
            <div className="font-display text-xl font-black tracking-wider text-[#FACC15] uppercase sm:text-2xl">
              HONK HONK! AUTO-RICKSHAW INCOMING!
            </div>
            <div className="text-[10px] font-bold tracking-[0.18em] text-[#FEF9C3] uppercase">
              Dodge off the center lane or let it flatten the cousins!
            </div>
          </div>
        </div>
      )}

      {/* Street Brawl Tag-Switch / Pickup Toasts */}
      {brawl && (brawl.switchBanner || brawl.pickupToast) && (
        <div className="pointer-events-none fixed inset-x-0 top-28 z-20 flex flex-col items-center gap-1.5 sm:top-32">
          {brawl.switchBanner && (
            <div className="border-x-2 border-[#38BDF8] bg-[#141210]/92 px-5 py-1 text-xs font-black tracking-[0.18em] text-[#38BDF8] uppercase">
              {brawl.switchBanner}
            </div>
          )}
          {brawl.pickupToast && (
            <div className="border-x-2 border-[#F59E0B] bg-[#141210]/92 px-5 py-1 text-xs font-black tracking-[0.16em] text-[#FCD34D] uppercase">
              {brawl.pickupToast}
            </div>
          )}
        </div>
      )}

      {/* Boss Intro Cinematic Arcade Title Banner (1.25s zoom-in) */}
      {brawl?.bossIntroBanner && (
        <div className="pointer-events-none fixed inset-x-0 top-1/3 z-35 flex justify-center px-4">
          <div className="border-y-4 border-[#F59E0B] bg-[#141210]/96 px-8 py-4 text-center shadow-[0_14px_48px_rgba(0,0,0,0.9)] sm:px-14">
            <div className="text-[11px] font-black tracking-[0.28em] text-[#EF4444] uppercase">
              Village Boss Approaches
            </div>
            <div className="mt-1 font-display text-4xl font-black tracking-wider text-[#F59E0B] uppercase sm:text-6xl">
              {brawl.bossIntroBanner.name}
            </div>
            <div className="mt-1 text-xs font-bold tracking-[0.2em] text-[#F8F4EC] uppercase sm:text-sm">
              {brawl.bossIntroBanner.subtitle}
            </div>
          </div>
        </div>
      )}

      {/* Overhead Dizzy FINISH! Takedown Prompt */}
      {brawl?.dizzyPrompt && !brawl.grabEscapePrompt && (
        <div
          className="pointer-events-none fixed z-30 -translate-x-1/2 -translate-y-full"
          style={{
            left: `${brawl.dizzyPrompt.xPct}%`,
            top: `${brawl.dizzyPrompt.yPct}%`,
          }}
        >
          <div className="animate-bounce border-2 border-[#FDE047] bg-[#141210]/95 px-3 py-1 text-center shadow-[0_0_20px_rgba(250,204,21,0.65)]">
            <div className="font-display text-xl font-black leading-none tracking-wider text-[#FDE047] uppercase">
              FINISH!
            </div>
            <div className="mt-0.5 font-mono-num text-[9px] font-bold tracking-wider text-[#F8F4EC] uppercase whitespace-nowrap">
              HOOK (G) · GRAB (R)
            </div>
          </div>
        </div>
      )}

      {/* Enemy Cooperative Rear-Grab Escape Prompt */}
      {brawl?.grabEscapePrompt && (
        <div className="pointer-events-none fixed inset-x-0 top-[26%] z-35 flex justify-center px-4">
          <div className="w-full max-w-xs border-2 border-[#EF4444] bg-[#141210]/96 px-4 py-2.5 text-center shadow-[0_0_26px_rgba(239,68,68,0.55)]">
            <div className="font-display text-2xl font-black tracking-wider text-[#FDE047] uppercase">
              MASH JAB! (F)
            </div>
            <div className="mt-1.5 h-2.5 w-full overflow-hidden border border-[#F59E0B]/50 bg-[#261414]">
              <div
                className="h-full bg-gradient-to-r from-[#EF4444] to-[#FACC15] transition-[width] duration-75"
                style={{ width: `${Math.round(brawl.grabEscapePrompt.progress * 100)}%` }}
              />
            </div>
            {brawl.grabEscapePrompt.partnerCanRescue && (
              <div className="mt-1.5 text-[10px] font-black tracking-[0.14em] text-[#38BDF8] uppercase">
                OR PRESS SWITCH (TAB) FOR PARTNER RESCUE!
              </div>
            )}
          </div>
        </div>
      )}

      {/* Co-op Partner Down / Revive Progress Banner */}
      {brawl?.partnerDown && (
        <div className="pointer-events-none fixed inset-x-0 bottom-24 z-25 flex justify-center px-4 sm:bottom-16">
          <div className="w-full max-w-sm border-2 border-[#22C55E] bg-[#141210]/94 px-4 py-2 text-center shadow-[0_0_18px_rgba(34,197,94,0.35)]">
            <div className="text-[11px] font-black tracking-[0.14em] text-[#4ADE80] uppercase">
              {brawl.partnerReviveProgress > 0
                ? 'REVIVING FALLEN PARTNER...'
                : 'PARTNER DOWN · STAND IN GREEN RING + GUARD'}
            </div>
            {brawl.partnerReviveProgress > 0 && (
              <div className="mt-1.5 h-2.5 w-full overflow-hidden border border-[#22C55E]/60 bg-[#052E16]">
                <div
                  className="h-full bg-[#22C55E] transition-[width] duration-75"
                  style={{ width: `${Math.round(brawl.partnerReviveProgress * 100)}%` }}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Rideable Raju Splendor Motorbike Mount Prompt & Rampage Timer */}
      {brawl && brawl.nearSplendorBike && brawl.ridingBikeTimer <= 0 && (
        <div className="pointer-events-auto fixed inset-x-0 bottom-28 z-30 flex justify-center px-4 sm:bottom-20">
          <button
            type="button"
            onClick={() => {
              triggerHaptic(40);
              arenaRef.current?.triggerTouchAction('throw');
            }}
            className="flex items-center gap-2 border-2 border-[#FACC15] bg-[#141210]/95 px-5 py-2 text-xs font-black tracking-[0.14em] text-[#FACC15] uppercase shadow-[0_0_22px_rgba(250,204,21,0.55)] animate-pulse active:scale-95"
          >
            <Bike className="h-4.5 w-4.5" />
            <span>
              HOP ON SPLENDOR BIKE! (PRESS R / TAP · {brawl.splendorBikeRemaining}s)
            </span>
          </button>
        </div>
      )}

      {brawl && brawl.ridingBikeTimer > 0 && (
        <div className="pointer-events-none fixed inset-x-0 bottom-28 z-25 flex justify-center px-4 sm:bottom-20">
          <div className="flex items-center gap-2 border-2 border-[#FACC15] bg-[#141210]/95 px-5 py-1.5 text-xs font-black tracking-[0.16em] text-[#FACC15] uppercase shadow-lg">
            <Bike className="h-4 w-4" />
            <span>SPLENDOR RAMPAGE! {brawl.ridingBikeTimer.toFixed(1)}s LEFT · JUMP TO BAIL</span>
          </div>
        </div>
      )}

      {/* BETWEEN-ZONE VILLAGE BOON CARD PICKER OVERLAY */}
      {brawl?.pendingBoons && brawl.pendingBoons.length > 0 && (
        <div className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-[#141210]/88 p-4">
          <div className="w-full max-w-3xl border-2 border-[#F59E0B] bg-[#1A1613] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.85)] sm:p-7">
            <div className="flex items-center justify-between border-b border-[#F59E0B]/30 pb-3">
              <div>
                <div className="text-[11px] font-black tracking-[0.22em] text-[#F59E0B] uppercase">
                  Zone {brawl.zone} Cleared · Village Boon
                </div>
                <h2 className="mt-0.5 font-display text-3xl font-black tracking-wide text-[#F8F4EC] uppercase sm:text-4xl">
                  Pick 1 Street Upgrade
                </h2>
              </div>
              <div className="hidden text-right text-xs font-semibold text-[#B6AA9A] sm:block">
                Active for the rest of this run
                <div className="text-[10px] text-[#F59E0B]">Tap a card or press 1 · 2 · 3</div>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
              {brawl.pendingBoons.map((card, idx) => (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => {
                    triggerHaptic(40);
                    arenaRef.current?.selectVillageBoon(card.id);
                  }}
                  style={{ borderColor: card.accentColor }}
                  className="group flex flex-col justify-between border-2 bg-[#231D19] p-4 text-left transition-transform hover:-translate-y-1 hover:bg-[#2B241F] active:scale-[0.97]"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span
                        style={{ backgroundColor: card.accentColor }}
                        className="px-2 py-0.5 font-mono-num text-[10px] font-black text-[#141210] uppercase"
                      >
                        [{idx + 1}] BOON
                      </span>
                      <Sparkles className="h-4 w-4" style={{ color: card.accentColor }} />
                    </div>
                    <div className="mt-3 font-display text-2xl font-black leading-tight text-[#F8F4EC] uppercase">
                      {card.title}
                    </div>
                    <div
                      className="mt-0.5 text-[11px] font-bold tracking-wider uppercase"
                      style={{ color: card.accentColor }}
                    >
                      {card.subtitle}
                    </div>
                    <p className="mt-2.5 text-xs leading-relaxed text-[#D6CEC2]">
                      {card.description}
                    </p>
                  </div>
                  <div
                    style={{ borderColor: card.accentColor, color: card.accentColor }}
                    className="mt-4 border-t pt-2.5 text-center text-[11px] font-black tracking-[0.16em] uppercase group-hover:underline"
                  >
                    Claim Boon →
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Classic Double Dragon Flashing GO >> Prompt */}
      {brawl?.goArrowVisible && (
        <div className="pointer-events-none fixed right-5 top-1/2 z-20 -translate-y-1/2 animate-pulse sm:right-10">
          <div className="flex items-center gap-1 border-2 border-[#F59E0B] bg-[#141210]/92 px-4 py-2 shadow-[0_0_24px_rgba(245,158,11,0.55)]">
            <span className="font-display text-4xl font-black tracking-wider text-[#F59E0B] sm:text-5xl">
              GO
            </span>
            <ChevronRight className="h-9 w-9 stroke-[3] text-[#F59E0B]" />
            <ChevronRight className="-ml-4 h-9 w-9 stroke-[3] text-[#FDE047]" />
          </div>
          <div className="mt-1 text-center text-[10px] font-bold tracking-[0.2em] text-[#F8F4EC] uppercase">
            Walk Right
          </div>
        </div>
      )}

      {/* TOP COMBAT HUD (Compact, zero-pill, high contrast, no backdrop-filter) */}
      <div className="hud-safe mx-auto w-full max-w-6xl">
        {brawl ? (
          <div className="hud-top hud-safe grid grid-cols-[1.15fr_auto_1fr] items-start gap-2 sm:gap-4">
            {/* LEFT: TAG-TEAM HERO 1 & HERO 2 SQUAD BARS */}
            <div className="flex flex-col gap-1.5">
              {([0, 1] as const).map((idx) => {
                const hero = idx === 0 ? hud.p1 : hud.p2;
                const isActive = brawl.activeHeroIndex === idx;
                const hpPct = Math.max(0, Math.min(100, (hero.hp / hero.maxHp) * 100));
                const recPct = Math.max(
                  0,
                  Math.min(100 - hpPct, ((hero.recoverableHp ?? 0) / hero.maxHp) * 100)
                );
                const trailPct = Math.max(
                  hpPct + recPct,
                  Math.min(100, (hero.trailHp / hero.maxHp) * 100)
                );
                const weapon = idx === 0 ? brawl.hero1Weapon : brawl.hero2Weapon;
                const styleLabel = idx === 0 ? brawl.hero1StyleLabel : brawl.hero2StyleLabel;
                const weaponLabel = weapon
                  ? weapon.kind === 'chair'
                    ? `CHAIR x${weapon.durability}`
                    : weapon.kind === 'stool'
                      ? 'STOOL · THROW'
                      : weapon.kind === 'coconut'
                        ? 'COCONUT · THROW'
                        : `LATHI x${weapon.durability}`
                  : null;

                const canTagIn = !isActive && hero.hp > 0 && brawl.switchCooldownPct <= 0.01;
                const cdRadius = 18;
                const cdCirc = 2 * Math.PI * cdRadius;
                const cdDash = cdCirc * (1 - brawl.switchCooldownPct);

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      if (canTagIn) {
                        triggerHaptic(30);
                        arenaRef.current?.triggerTouchAction('switch');
                      }
                    }}
                    className={`pointer-events-auto flex items-center gap-2 px-2 py-1.5 text-left transition-all active:scale-[0.97] ${
                      isActive
                        ? 'border-2 border-[#FACC15] bg-[#1C1710]/96 shadow-[0_0_16px_rgba(250,204,21,0.34)]'
                        : hero.hp <= 0
                          ? 'border border-[#F8F4EC]/10 bg-[#141210]/60 opacity-50'
                          : canTagIn
                            ? 'border border-[#38BDF8]/55 bg-[#12161B]/86 opacity-85 hover:border-[#7DD3FC] hover:opacity-100'
                            : 'border border-[#38BDF8]/25 bg-[#141210]/76 opacity-75'
                    }`}
                  >
                    <div
                      className={`relative h-10 w-10 shrink-0 overflow-hidden border bg-[#221E1A] sm:h-11 sm:w-11 ${
                        isActive ? 'border-2 border-[#FACC15]' : 'border-[#38BDF8]/60'
                      }`}
                    >
                      <img
                        src={hero.portraitUrl}
                        alt={hero.name}
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover"
                      />
                      {/* Partner Portrait TAG SWITCH Radial Cooldown Ring */}
                      {!isActive && hero.hp > 0 && (
                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-[#141210]/35">
                          {brawl.switchCooldownPct > 0.01 ? (
                            <svg
                              viewBox="0 0 44 44"
                              className="h-full w-full -rotate-90"
                              aria-hidden="true"
                            >
                              <circle
                                cx="22"
                                cy="22"
                                r={cdRadius}
                                fill="rgba(20,18,16,0.55)"
                                stroke="rgba(56,189,248,0.22)"
                                strokeWidth="3.5"
                              />
                              <circle
                                cx="22"
                                cy="22"
                                r={cdRadius}
                                fill="none"
                                stroke="#38BDF8"
                                strokeWidth="3.5"
                                strokeDasharray={cdCirc}
                                strokeDashoffset={cdDash}
                                strokeLinecap="round"
                              />
                            </svg>
                          ) : (
                            <span className="flex items-center gap-0.5 bg-[#0284C7]/90 px-1 py-0.5 text-[7px] font-black tracking-wide text-white uppercase shadow">
                              <ArrowLeftRight className="h-2.5 w-2.5" />
                              TAG
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="flex min-w-0 items-center gap-1.5">
                          <span
                            className={`px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide ${
                              isActive
                                ? 'bg-[#FACC15] text-[#141210]'
                                : canTagIn
                                  ? 'bg-[#38BDF8]/85 text-[#141210]'
                                  : 'bg-[#38BDF8]/20 text-[#38BDF8]'
                            }`}
                          >
                            {isActive ? '▶ P1 · YOU' : canTagIn ? 'AI · TAG' : 'AI'}
                          </span>
                          <span className="truncate font-display text-base font-extrabold leading-none text-[#F8F4EC] sm:text-lg">
                            {hero.name}
                          </span>
                          {styleLabel && (
                            <span className="hidden truncate text-[9px] font-bold tracking-wide text-[#B6AA9A] uppercase sm:inline">
                              · {styleLabel}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {weaponLabel && (
                            <span className="border border-[#F59E0B]/60 bg-[#2A2016] px-1.5 py-0.5 font-mono-num text-[9px] font-bold text-[#FCD34D] uppercase">
                              {weaponLabel}
                            </span>
                          )}
                          <span className="font-mono-num text-[11px] font-semibold text-[#F8F4EC]">
                            {hero.hp > 0 ? `${hero.hp}` : 'K.O.'}
                          </span>
                        </div>
                      </div>

                      {/* Health Bar with Glowing Recoverable Green HP Segment */}
                      <div className="relative mt-1 h-2.5 w-full overflow-hidden border border-[#F8F4EC]/15 bg-[#141210]">
                        <div
                          className="absolute inset-y-0 left-0 bg-[#DC2626] transition-[width] duration-150"
                          style={{ width: `${trailPct}%` }}
                        />
                        {recPct > 0.2 && (
                          <div
                            className="absolute inset-y-0 bg-[#4ADE80] animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.85)]"
                            style={{ left: `${hpPct}%`, width: `${recPct}%` }}
                          />
                        )}
                        <div
                          className={`absolute inset-y-0 left-0 ${
                            isActive
                              ? 'bg-gradient-to-r from-[#D97706] to-[#F59E0B]'
                              : 'bg-gradient-to-r from-[#0284C7] to-[#38BDF8]'
                          }`}
                          style={{ width: `${hpPct}%` }}
                        />
                      </div>

                      {/* Powerup bar */}
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <div className="h-1 flex-1 overflow-hidden bg-[#26211D]">
                          <div
                            className={`h-full ${
                              hero.rage >= 100 ? 'bg-[#FDE047]' : 'bg-[#F59E0B]/70'
                            }`}
                            style={{ width: `${hero.rage}%` }}
                          />
                        </div>
                        <span className="font-mono-num text-[9px] font-bold text-[#F59E0B] whitespace-nowrap">
                          {hero.rage >= 100 ? 'POWER READY' : `${hero.rage}%`}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
              {/* Active Village Boons Strip */}
              {brawl.activeBoons.length > 0 && (
                <div className="flex flex-wrap items-center gap-1 pt-0.5">
                  {brawl.activeBoons.map((boonId) => {
                    const meta = BOON_SHORT_LABELS[boonId];
                    return (
                      <span
                        key={boonId}
                        style={{ borderColor: meta.color, color: meta.color }}
                        className="border bg-[#141210]/92 px-1.5 py-0.5 text-[9px] font-black tracking-wider uppercase"
                      >
                        ★ {meta.label}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            {/* CENTER: ZONE / WAVE / SCORE / UTILITY BUTTONS */}
            <div className="flex flex-col items-center">
              <div className="border border-[#F59E0B]/40 bg-[#141210]/92 px-3 py-1 text-center sm:px-4 sm:py-1.5">
                <div className="font-mono-num text-[10px] font-bold tracking-[0.18em] text-[#F59E0B] uppercase whitespace-nowrap">
                  {brawl.isEndless
                    ? `Wave ${brawl.endlessWave}${brawl.endlessBestWave > 0 ? ` · Best ${brawl.endlessBestWave}` : ''}`
                    : `Zone ${brawl.zone}/${brawl.totalZones} · ${brawl.zoneName}`}
                </div>
                <div className="font-mono-num text-xl font-black leading-tight text-[#F8F4EC] sm:text-2xl">
                  {brawl.score.toLocaleString()}
                </div>
                <div className="text-[10px] font-medium text-[#B6AA9A] whitespace-nowrap">
                  {brawl.goArrowVisible
                    ? 'Advance Right >>'
                    : `${brawl.enemiesRemaining} Left`}
                </div>
              </div>

              <div className="pointer-events-auto mt-1.5 flex items-center gap-1">
                <button
                  type="button"
                  onClick={onOpenPause}
                  aria-label="Pause match"
                  className="flex h-8 w-8 items-center justify-center border border-[#F8F4EC]/15 bg-[#141210]/88 text-[#F8F4EC] hover:border-[#F59E0B] hover:text-[#F59E0B] transition-colors"
                >
                  <Pause className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={onToggleMute}
                  aria-label={muted ? 'Unmute audio' : 'Mute audio'}
                  className="flex h-8 w-8 items-center justify-center border border-[#F8F4EC]/15 bg-[#141210]/88 text-[#F8F4EC] hover:border-[#F59E0B] hover:text-[#F59E0B] transition-colors"
                >
                  {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={onToggleTouchControls}
                  aria-label="Toggle touch arcade pad"
                  title="Toggle on-screen touch controls"
                  className={`flex h-8 w-8 items-center justify-center border transition-colors ${
                    showTouchControls
                      ? 'border-[#F59E0B] bg-[#F59E0B] text-[#141210]'
                      : 'border-[#F8F4EC]/15 bg-[#141210]/88 text-[#F8F4EC] hover:border-[#F59E0B]'
                  }`}
                >
                  <Gamepad2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* RIGHT: CURRENT VILLAGE COUSIN / BOSS TARGET BAR (Clean Arcade — hidden when idle) */}
            <div className="flex flex-col items-end">
              {brawl.targetEnemy && (
                <div
                  className={`w-full max-w-xs border px-3 py-1.5 text-right ${
                    brawl.targetEnemy.isBoss && brawl.bossPhase2Active
                      ? 'border-2 border-[#FDE047] bg-[#2D140B]/96 shadow-[0_0_22px_rgba(250,204,21,0.45)]'
                      : brawl.targetEnemy.isBoss
                        ? 'border-[#F59E0B] bg-[#261212]/94'
                        : 'border-[#DC2626]/55 bg-[#141210]/90'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono-num text-[10px] font-bold text-[#F87171]">
                      {brawl.targetEnemy.hp}/{brawl.targetEnemy.maxHp}
                    </span>
                    <div className="truncate font-display text-lg font-black leading-none text-[#F8F4EC] sm:text-xl">
                      {brawl.targetEnemy.isBoss ? 'BOSS · ' : ''}
                      {brawl.targetEnemy.name}
                    </div>
                  </div>
                  <div className="mt-0.5 truncate text-[10px] font-semibold text-[#B6AA9A]">
                    {brawl.targetEnemy.isBoss && brawl.bossPhase2Active ? (
                      <span className="font-black tracking-wider text-[#FDE047] uppercase">
                        Moustache Rage · Jump Shockwaves!
                      </span>
                    ) : (
                      brawl.targetEnemy.subtitle
                    )}
                  </div>
                  <div className="relative mt-1 h-2.5 w-full overflow-hidden border border-[#F8F4EC]/20 bg-[#141210]">
                    <div
                      className={`absolute inset-y-0 right-0 transition-[width] duration-150 ${
                        brawl.targetEnemy.isBoss && brawl.bossPhase2Active
                          ? 'bg-gradient-to-l from-[#FDE047] via-[#F59E0B] to-[#DC2626]'
                          : brawl.targetEnemy.isBoss
                            ? 'bg-gradient-to-l from-[#F59E0B] to-[#DC2626]'
                            : 'bg-gradient-to-l from-[#991B1B] to-[#EF4444]'
                      }`}
                      style={{
                        width: `${Math.max(
                          0,
                          Math.min(100, (brawl.targetEnemy.hp / brawl.targetEnemy.maxHp) * 100)
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {activeHero.combo >= 2 && (
                <div className="mt-2 font-display text-2xl font-black text-[#F59E0B] drop-shadow">
                  {activeHero.combo} HIT COMBO!
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2 sm:gap-4">
          {/* PLAYER 1 BAR */}
          <div className="flex items-center gap-2 sm:gap-3">
            <FighterPortraitThumb
              url={hud.p1.portraitUrl}
              name={hud.p1.name}
              accentClass="border-[#F59E0B]"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <div className="truncate font-display text-xl font-extrabold leading-none text-[#F8F4EC] sm:text-2xl">
                  {hud.p1.name}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-mono-num text-xs text-[#F59E0B]">
                    {hud.p1.hp}/{hud.p1.maxHp}
                  </span>
                  <div className="flex items-center gap-1" aria-label={`P1 rounds won: ${hud.p1.roundsWon}`}>
                    {[0, 1].map((i) => (
                      <span
                        key={i}
                        className={`h-2.5 w-2.5 border ${
                          i < hud.p1.roundsWon
                            ? 'border-[#F59E0B] bg-[#F59E0B]'
                            : 'border-[#F8F4EC]/30 bg-[#141210]/80'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Dual-layer health bar (damage drain trail + green recoverable HP + active health) */}
              <div className="relative mt-1.5 h-4 w-full overflow-hidden border border-[#F8F4EC]/20 bg-[#141210]/90 sm:h-5">
                <div
                  className="absolute inset-y-0 left-0 bg-[#DC2626] transition-[width] duration-150"
                  style={{ width: `${p1TrailPct}%` }}
                />
                {p1RecPct > 0.2 && (
                  <div
                    className="absolute inset-y-0 bg-[#4ADE80] animate-pulse"
                    style={{ left: `${p1Pct}%`, width: `${p1RecPct}%` }}
                  />
                )}
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#D97706] to-[#F59E0B]"
                  style={{ width: `${p1Pct}%` }}
                />
              </div>

              {/* Rage Meter + Live State Callout */}
              <div className="mt-1 flex items-center justify-between gap-2">
                <div className="h-1.5 w-28 overflow-hidden bg-[#141210]/90 sm:w-40">
                  <div
                    className={`h-full transition-[width] duration-150 ${
                      hud.p1.rage >= 100 ? 'bg-[#F59E0B]' : 'bg-[#B6AA9A]/60'
                    }`}
                    style={{ width: `${hud.p1.rage}%` }}
                  />
                </div>
                <span className="font-mono-num text-[11px] font-semibold text-[#F59E0B] whitespace-nowrap">
                  {hud.p1.rage >= 100 ? 'POWERUP READY' : `POWERUP ${hud.p1.rage}%`}
                </span>
              </div>
            </div>
          </div>

          {/* CENTER TIMER & UTILITY CONTROLS */}
          <div className="flex flex-col items-center">
            <div className="border border-[#F8F4EC]/20 bg-[#141210]/92 px-3 py-1 text-center sm:px-4 sm:py-1.5">
              <div className="font-mono-num text-2xl font-bold leading-none text-[#F8F4EC] sm:text-3xl">
                {String(hud.timer).padStart(2, '0')}
              </div>
              <div className="mt-0.5 text-[10px] font-medium text-[#B6AA9A] whitespace-nowrap">
                Round {hud.roundNumber}
              </div>
            </div>

            <div className="pointer-events-auto mt-1.5 flex items-center gap-1">
              <button
                type="button"
                onClick={onOpenPause}
                aria-label="Pause match"
                className="flex h-8 w-8 items-center justify-center border border-[#F8F4EC]/15 bg-[#141210]/88 text-[#F8F4EC] hover:border-[#F59E0B] hover:text-[#F59E0B] transition-colors"
              >
                <Pause className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={onToggleMute}
                aria-label={muted ? 'Unmute audio' : 'Mute audio'}
                className="flex h-8 w-8 items-center justify-center border border-[#F8F4EC]/15 bg-[#141210]/88 text-[#F8F4EC] hover:border-[#F59E0B] hover:text-[#F59E0B] transition-colors"
              >
                {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
              </button>
              <button
                type="button"
                onClick={onToggleTouchControls}
                aria-label="Toggle touch arcade pad"
                title="Toggle on-screen touch controls"
                className={`flex h-8 w-8 items-center justify-center border transition-colors ${
                  showTouchControls
                    ? 'border-[#F59E0B] bg-[#F59E0B] text-[#141210]'
                    : 'border-[#F8F4EC]/15 bg-[#141210]/88 text-[#F8F4EC] hover:border-[#F59E0B]'
                }`}
              >
                <Gamepad2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* PLAYER 2 / AI BAR */}
          <div className="flex flex-row-reverse items-center gap-2 sm:gap-3">
            <FighterPortraitThumb
              url={hud.p2.portraitUrl}
              name={hud.p2.name}
              accentClass="border-[#DC2626]"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-row-reverse items-baseline justify-between gap-2">
                <div className="truncate text-right font-display text-xl font-extrabold leading-none text-[#F8F4EC] sm:text-2xl">
                  {hud.p2.name}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center gap-1" aria-label={`P2 rounds won: ${hud.p2.roundsWon}`}>
                    {[0, 1].map((i) => (
                      <span
                        key={i}
                        className={`h-2.5 w-2.5 border ${
                          i < hud.p2.roundsWon
                            ? 'border-[#DC2626] bg-[#DC2626]'
                            : 'border-[#F8F4EC]/30 bg-[#141210]/80'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="font-mono-num text-xs text-[#F87171]">
                    {hud.p2.hp}/{hud.p2.maxHp}
                  </span>
                </div>
              </div>

              <div className="relative mt-1.5 h-4 w-full overflow-hidden border border-[#F8F4EC]/20 bg-[#141210]/90 sm:h-5">
                <div
                  className="absolute inset-y-0 right-0 bg-[#F59E0B] transition-[width] duration-150"
                  style={{ width: `${p2TrailPct}%` }}
                />
                {p2RecPct > 0.2 && (
                  <div
                    className="absolute inset-y-0 bg-[#4ADE80] animate-pulse"
                    style={{ right: `${p2Pct}%`, width: `${p2RecPct}%` }}
                  />
                )}
                <div
                  className="absolute inset-y-0 right-0 bg-gradient-to-l from-[#991B1B] to-[#DC2626]"
                  style={{ width: `${p2Pct}%` }}
                />
              </div>

              <div className="mt-1 flex flex-row-reverse items-center justify-between gap-2">
                <div className="h-1.5 w-28 overflow-hidden bg-[#141210]/90 sm:w-40">
                  <div
                    className={`ml-auto h-full transition-[width] duration-150 ${
                      hud.p2.rage >= 100 ? 'bg-[#DC2626]' : 'bg-[#B6AA9A]/60'
                    }`}
                    style={{ width: `${hud.p2.rage}%` }}
                  />
                </div>
                <span className="font-mono-num text-[11px] font-semibold text-[#F87171] whitespace-nowrap">
                  {hud.p2.rage >= 100 ? 'POWERUP READY' : `POWERUP ${hud.p2.rage}%`}
                </span>
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Quiet unboxed stage & combo metadata row (1v1 modes) */}
        {!brawl && (
        <div className="mt-2 flex items-center justify-between text-xs text-[#F8F4EC]/85">
          <div className="min-h-[1.25rem]">
            {hud.p1.combo >= 2 && (
              <span className="font-display text-2xl font-black text-[#F59E0B] drop-shadow">
                {hud.p1.combo} HIT COMBO
              </span>
            )}
            {hud.p1.combo < 2 && hud.p1.callout && (
              <span className="font-mono-num text-xs font-bold text-[#F59E0B]">
                {hud.p1.callout}
              </span>
            )}
          </div>

          <div className="hidden items-center gap-2 text-xs text-[#B6AA9A] sm:flex">
            <span>{stageName}</span>
            <span aria-hidden="true">·</span>
            <span>
              {mode === 'versus_2p'
                ? 'Local 2-Player'
                : mode === 'arcade' && arcadeProgress
                  ? `Arcade Stage ${arcadeProgress.current}/${arcadeProgress.total}`
                  : '1P vs AI'}
            </span>
          </div>

          <div className="min-h-[1.25rem] text-right">
            {hud.p2.combo >= 2 && (
              <span className="font-display text-2xl font-black text-[#F87171] drop-shadow">
                {hud.p2.combo} HIT COMBO
              </span>
            )}
            {hud.p2.combo < 2 && hud.p2.callout && (
              <span className="font-mono-num text-xs font-bold text-[#F87171]">
                {hud.p2.callout}
              </span>
            )}
          </div>
        </div>
        )}
      </div>

      {/* CENTER ROUND / FIGHT / KO ANNOUNCER */}
      {hud.announcement && hud.phase !== 'MATCH_OVER' && (
        <div className="pointer-events-none flex flex-col items-center justify-center text-center">
          <div className="border-y border-[#F59E0B]/60 bg-[#141210]/90 px-10 py-3">
            <div className="font-display text-5xl font-black tracking-wider text-[#F59E0B] sm:text-7xl">
              {hud.announcement}
            </div>
            {hud.subAnnouncement && (
              <div className="mt-1 text-sm font-medium text-[#F8F4EC]">{hud.subAnnouncement}</div>
            )}
          </div>
        </div>
      )}

      {/* BOTTOM ZONE: Desktop Compact Key Hints OR Ergonomic Arcade Touch Pad */}
      <div className="mx-auto w-full max-w-6xl">
        {showTouchControls ? (
          <div className={`pointer-events-auto flex items-end justify-between gap-2 pb-1 ${settings.leftHanded ? 'flex-row-reverse' : ''}`}>
            {/* LEFT THUMB ZONE: Floating Dynamic Virtual Joystick anywhere in bottom-left quadrant */}
            <VirtualThumbstick
              onChange={(dirs) => arenaRef.current?.setTouchDirections(dirs)}
              onDash={(dir) => arenaRef.current?.triggerTouchDash(dir)}
            />

            {/* RIGHT THUMB ZONE: Ergonomic Thumb-Arc Combat Cluster */}
            <div
              className="touch-cluster relative h-[222px] w-[244px] shrink-0 sm:h-[232px] sm:w-[254px]"
              style={{ transform: `scale(${BUTTON_SCALE[settings.buttonSize]})`, transformOrigin: settings.leftHanded ? 'bottom left' : 'bottom right' }}
              aria-label="Ergonomic thumb-arc combat buttons"
            >
              {/* UPPER-LEFT OF ARC (Street Brawl only): 52px SWAP / HOLD ASSIST button */}
              {brawl && (() => {
                const partner = brawl.activeHeroIndex === 0 ? hud.p2 : hud.p1;
                const canSwap = partner.hp > 0 && brawl.switchCooldownPct <= 0.01;
                const cdPct = Math.max(0, Math.min(1, brawl.switchCooldownPct));
                const r = 23;
                const circ = 2 * Math.PI * r;
                const dashOffset = circ * (1 - cdPct);
                return (
                  <button
                    type="button"
                    {...bindSwapOrAssist}
                    aria-label={`Tap to swap to ${partner.name}, hold 0.3s for drive-by assist`}
                    className={`touch-control absolute top-[2px] left-[22px] flex h-[52px] w-[52px] flex-col items-center justify-center rounded-full border-2 transition-transform active:scale-[0.92] ${
                      canSwap
                        ? 'border-[#38BDF8] bg-gradient-to-b from-[#0C354D] to-[#131920] text-[#38BDF8] shadow-[0_0_16px_rgba(56,189,248,0.45)] active:bg-[#38BDF8] active:text-[#141210]'
                        : 'border-[#38BDF8]/35 bg-[#141210]/90 text-[#64748B]'
                    }`}
                  >
                    {cdPct > 0.01 && (
                      <svg
                        viewBox="0 0 52 52"
                        className="pointer-events-none absolute inset-0 h-full w-full -rotate-90"
                        aria-hidden="true"
                      >
                        <circle
                          cx="26"
                          cy="26"
                          r={r}
                          fill="none"
                          stroke="rgba(56,189,248,0.18)"
                          strokeWidth="3.2"
                        />
                        <circle
                          cx="26"
                          cy="26"
                          r={r}
                          fill="none"
                          stroke="#38BDF8"
                          strokeWidth="3.2"
                          strokeDasharray={circ}
                          strokeDashoffset={dashOffset}
                          strokeLinecap="round"
                        />
                      </svg>
                    )}
                    <ArrowLeftRight className="h-4 w-4 stroke-[2.5]" />
                    <span className="mt-0.5 text-[8px] font-black leading-none tracking-wider text-[#F8F4EC]">
                      {brawl.grabEscapePrompt?.partnerCanRescue
                        ? 'RESCUE'
                        : partner.hp <= 0
                          ? 'DOWN'
                          : 'SWAP'}
                    </span>
                    <span className="text-[6.5px] font-bold leading-none text-[#7DD3FC]">
                      HOLD ASSIST
                    </span>
                  </button>
                );
              })()}

              {/* INNER-UPPER-LEFT: 46px PANIC BURST (Green Health Defense Special!) */}
              <button
                type="button"
                {...bindTap('panic_special', 45)}
                aria-label="Defense Panic Special Burst (uses recoverable green health)"
                className="touch-control absolute top-[72px] left-[-16px] flex h-[46px] w-[46px] flex-col items-center justify-center rounded-full border-2 border-[#4ADE80]/90 bg-[#0B2317]/95 text-[#4ADE80] shadow-[0_0_14px_rgba(74,222,128,0.38)] active:scale-[0.92] active:bg-[#4ADE80] active:text-[#141210] transition-transform"
              >
                <Sparkles className="h-4 w-4 stroke-[2.5]" />
                <span className="mt-0.5 text-[7.5px] font-black leading-none tracking-wider text-[#F8F4EC]">
                  BURST
                </span>
              </button>

              {/* TOP-RIGHT OF ARC: 60px Radial-Charge POWER Button (pulses gold + flame ring at 100%) */}
              {(() => {
                const pct = Math.max(0, Math.min(100, activeHero.rage));
                const ready = pct >= 100;
                const radius = 26;
                const circ = 2 * Math.PI * radius;
                const dashOffset = circ * (1 - pct / 100);
                return (
                  <button
                    type="button"
                    {...bindTap('rage', ready ? 60 : 25)}
                    aria-label={ready ? 'Activate Special Powerup' : `Powerup charging ${pct}%`}
                    className={`touch-control absolute top-0 right-[68px] flex h-[60px] w-[60px] flex-col items-center justify-center rounded-full border-2 transition-transform active:scale-[0.92] ${
                      ready
                        ? 'animate-pulse border-[#FEF08A] bg-gradient-to-b from-[#F59E0B] to-[#DC2626] text-[#141210] shadow-[0_0_26px_rgba(245,158,11,0.92)]'
                        : 'border-[#F59E0B]/40 bg-[#141210]/90 text-[#B6AA9A]'
                    }`}
                  >
                    {ready && (
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute -inset-1.5 rounded-full border-2 border-dashed border-[#FDE047]/90 animate-spin"
                        style={{ animationDuration: '5s' }}
                      />
                    )}
                    <svg
                      viewBox="0 0 60 60"
                      className="pointer-events-none absolute inset-0 h-full w-full -rotate-90"
                      aria-hidden="true"
                    >
                      <circle
                        cx="30"
                        cy="30"
                        r={radius}
                        fill="none"
                        stroke="rgba(255,255,255,0.12)"
                        strokeWidth="3.5"
                      />
                      <circle
                        cx="30"
                        cy="30"
                        r={radius}
                        fill="none"
                        stroke={ready ? '#FEF08A' : '#F59E0B'}
                        strokeWidth="3.5"
                        strokeDasharray={circ}
                        strokeDashoffset={dashOffset}
                        strokeLinecap="round"
                      />
                    </svg>
                    {ready ? (
                      <Flame className="h-5 w-5 fill-[#141210] text-[#141210]" />
                    ) : (
                      <Zap className="h-4.5 w-4.5 text-[#F59E0B]" />
                    )}
                    <span className="mt-0.5 text-[9px] font-black leading-none tracking-wider">
                      {ready ? 'POWER' : `${pct}%`}
                    </span>
                  </button>
                );
              })()}

              {/* TOP-FAR-RIGHT: 54px JUMP */}
              <button
                type="button"
                {...bindTap('jump', 25)}
                aria-label="Jump"
                className="touch-control absolute top-[26px] right-[2px] flex h-[54px] w-[54px] flex-col items-center justify-center rounded-full border-2 border-[#38BDF8]/90 bg-[#181614]/94 text-[#38BDF8] shadow-[0_0_14px_rgba(56,189,248,0.32)] active:scale-[0.92] active:bg-[#38BDF8] active:text-[#141210] transition-transform"
              >
                <ArrowUp className="h-5 w-5 stroke-[2.8]" />
                <span className="mt-0.5 text-[9px] font-black leading-none tracking-wider text-[#F8F4EC]">
                  JUMP
                </span>
              </button>

              {/* MID-LEFT OF ATTACK: 54px HEAVY / FINISH / THROW */}
              <button
                type="button"
                {...bindTap('rp', 35)}
                aria-label="Heavy Hook, Finisher or Throw"
                className={`touch-control absolute top-[78px] left-[38px] flex h-[54px] w-[54px] flex-col items-center justify-center rounded-full border-2 active:scale-[0.92] transition-transform ${
                  brawl?.dizzyPrompt
                    ? 'animate-pulse border-[#FDE047] bg-[#F59E0B] text-[#141210] shadow-[0_0_20px_rgba(250,204,21,0.85)]'
                    : 'border-[#34D399]/90 bg-[#181614]/94 text-[#34D399] shadow-[0_0_14px_rgba(52,211,153,0.32)] active:bg-[#34D399] active:text-[#141210]'
                }`}
              >
                <Zap className="h-4.5 w-4.5 stroke-[2.5]" />
                <span
                  className={`mt-0.5 text-[9px] font-black leading-none tracking-wider ${
                    brawl?.dizzyPrompt ? 'text-[#141210]' : 'text-[#F8F4EC]'
                  }`}
                >
                  {brawl?.dizzyPrompt ? 'FINISH' : brawl?.isClinching ? 'THROW' : 'HEAVY'}
                </span>
              </button>

              {/* RIGHT OF ATTACK: 58px MARTIAL ARTS KICK (Roundhouse -> Spin Heel -> Tornado / Axe / Sweep / Flying Side!) */}
              <button
                type="button"
                {...bindTap('kick', 32)}
                aria-label="Martial Arts Kick Combo"
                className="touch-control absolute top-[94px] right-[2px] flex h-[58px] w-[58px] flex-col items-center justify-center rounded-full border-2 border-[#FB923C] bg-gradient-to-b from-[#33180E] to-[#181210] text-[#FB923C] shadow-[0_0_16px_rgba(249,115,22,0.42)] active:scale-[0.92] active:bg-[#FB923C] active:text-[#141210] transition-transform"
              >
                <Flame className="h-5 w-5 stroke-[2.5]" />
                <span className="mt-0.5 text-[9.5px] font-black leading-none tracking-wider text-[#F8F4EC]">
                  KICK
                </span>
              </button>

              {/* INNER-LEFT OF ATTACK: 52px GUARD / DODGE (Tap = STEP 3D, Hold = GUARD/PARRY) */}
              <button
                type="button"
                {...bindGuardOrDodge}
                aria-label="Tap to Dodge 3D or Hold to Guard and Parry"
                className="touch-control absolute bottom-[4px] left-[6px] flex h-[66px] w-[66px] flex-col items-center justify-center rounded-full border-[3px] border-[#60A5FA]/90 bg-[#181614]/94 text-[#60A5FA] shadow-[0_0_14px_rgba(96,165,250,0.3)] active:scale-[0.92] active:bg-[#60A5FA] active:text-[#141210] transition-transform"
              >
                <Shield className="h-4.5 w-4.5 stroke-[2.4]" />
                <span className="mt-0.5 text-[8px] font-black leading-none tracking-wider text-[#F8F4EC]">
                  GUARD
                </span>
                <span className="text-[7px] font-bold leading-none text-[#93C5FD]">
                  TAP DODGE
                </span>
              </button>

              {/* BOTTOM-CENTER OF THUMB ARC: 68px Primary ATTACK (JAB / COMBO / MASH) */}
              <button
                type="button"
                {...bindTap('lp', 25)}
                aria-label="Primary Attack Jab Combo"
                className={`touch-control absolute bottom-[6px] right-[68px] flex h-[68px] w-[68px] flex-col items-center justify-center rounded-full border-2 active:scale-[0.92] transition-transform ${
                  brawl?.grabEscapePrompt
                    ? 'animate-pulse border-[#EF4444] bg-[#DC2626] text-[#FEF08A] shadow-[0_0_24px_rgba(239,68,68,0.85)]'
                    : 'border-[#F59E0B] bg-gradient-to-b from-[#2B1F14] to-[#171310] text-[#F59E0B] shadow-[0_0_20px_rgba(245,158,11,0.45)] active:bg-[#F59E0B] active:text-[#141210]'
                }`}
              >
                <Swords className="h-6 w-6 stroke-[2.5]" />
                <span className="mt-0.5 text-[10px] font-black leading-none tracking-wider text-[#F8F4EC]">
                  {brawl?.grabEscapePrompt
                    ? 'MASH!'
                    : brawl?.isClinching
                      ? 'KNEE'
                      : 'ATTACK'}
                </span>
              </button>
            </div>
          </div>
        ) : !brawl ? (
          <div className="hidden items-center justify-between border-t border-[#F8F4EC]/10 bg-[#141210]/88 px-4 py-2 text-xs text-[#B6AA9A] sm:flex">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <span className="font-semibold text-[#F59E0B]">P1</span>
              <span>WASD Move</span>
              <span aria-hidden="true">·</span>
              <span>F Attack</span>
              <span aria-hidden="true">·</span>
              <span>G Heavy</span>
              <span aria-hidden="true">·</span>
              <span>H Kick</span>
              <span aria-hidden="true">·</span>
              <span>Q Guard</span>
              <span aria-hidden="true">·</span>
              <span>E Dodge</span>
              <span aria-hidden="true">·</span>
              <span className="font-semibold text-[#FCD34D]">T Power</span>
            </div>
            {mode === 'versus_2p' && (
              <div className="flex items-center gap-2 text-[#F87171]">
                <span className="font-semibold">P2</span>
                <span>Arrows · J/K/L · O Step · U Throw · I Power · ; Guard</span>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
