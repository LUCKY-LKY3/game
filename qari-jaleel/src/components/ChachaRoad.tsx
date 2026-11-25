import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { boughtLevels, buyUpgrade, levelOf, TOTAL_LEVELS, UPGRADES, useChai } from '../utils/upgrades';

const CHACHA_LINES = [
  'Chacha says: pay first, chai later.',
  'Chacha says: the kebab roll is 40% roll, 60% love.',
  'Chacha says: no, we do not have WiFi. We have conversation.',
  'Chacha says: sugar is a state of mind.',
  'Chacha says: you want it spicy? I will see your face.',
  'Chacha says: the desert is hot, the chai is hotter.',
  'Chacha says: my cousin owns the other parlour. Do not go there.',
  'Chacha says: free refill? That is a good joke, beta.',
];

/** The Road to Chacha Chai's: spend chai coins on permanent upgrades; the road shows how far you've walked. */
export function ChachaRoad({ onClose }: { onClose: () => void }) {
  const chai = useChai();
  const bought = boughtLevels();
  const pct = Math.round((bought / TOTAL_LEVELS) * 100);
  const line = useMemo(() => CHACHA_LINES[Math.floor(Math.random() * CHACHA_LINES.length)], []);
  const [flash, setFlash] = useState<string | null>(null);

  const buy = (id: Parameters<typeof buyUpgrade>[0]) => {
    if (buyUpgrade(id)) {
      setFlash(id);
      window.setTimeout(() => setFlash(null), 500);
    }
  };

  return (
    <div className="safe-inset pointer-events-auto fixed inset-0 z-50 flex flex-col bg-[#1A1208] text-[#F8F4EC]">
      <header className="flex items-center justify-between gap-3 border-b border-[#F59E0B]/25 px-4 py-2.5 short:px-3 short:py-1.5">
        <h2 className="font-display text-2xl font-black tracking-wide text-[#FCD34D] short:text-lg">Road to Chacha Chai&apos;s</h2>
        <div className="flex items-center gap-3">
          <div className="font-mono-num rounded-full border border-[#FCD34D]/60 bg-[#2A1D0A] px-3 py-1 text-sm font-black text-[#FCD34D] short:text-xs">
            🪙 {chai.coins}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="border border-[#F8F4EC]/25 p-1.5 text-[#B6AA9A] hover:text-[#F8F4EC]">
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-3 short:p-2">
        {/* The road through the desert */}
        <div className="relative h-24 overflow-hidden rounded-lg border-2 border-[#78350F] bg-gradient-to-b from-[#FDE68A] via-[#F6C66D] to-[#D9A05B] short:h-16">
          <div className="absolute inset-x-0 bottom-[22%] h-6 bg-[#44403C] short:h-4" />
          <div className="absolute inset-x-0 bottom-[22%] mb-[0.7rem] h-0 border-t-[3px] border-dashed border-[#FEF3C7]/80 short:mb-2" />
          <div className="absolute bottom-[8%] left-[12%] text-xl short:text-sm">🌵</div>
          <div className="absolute bottom-[8%] left-[38%] text-lg short:text-sm">🐪</div>
          <div className="absolute bottom-[8%] left-[58%] text-xl short:text-sm">🌵</div>
          {/* Chacha Chai's parlour */}
          <div className="absolute top-1 right-2 text-center">
            <div className="neon-sign rounded-md border-2 px-2 py-0.5">
              <div className="neon-text font-display text-sm leading-none font-black tracking-wider uppercase short:text-[11px]">Chacha Chai&apos;s</div>
            </div>
            <div className="mt-0.5 text-2xl leading-none short:text-lg">🏪</div>
          </div>
          {/* You */}
          <div className="absolute bottom-[26%] transition-[left] duration-700" style={{ left: `calc(${Math.min(pct, 100) * 0.74}% + 0.5rem)` }}>
            <span className="text-2xl short:text-lg">🚶</span>
          </div>
        </div>
        <div className="mt-1 flex items-center justify-between text-[11px] text-[#D6CEC2]">
          <span>
            {bought} of {TOTAL_LEVELS} items on the menu ({pct}%)
          </span>
          <span className="italic text-[#B6AA9A]">{pct >= 100 ? 'You made it! Free chai for life. ☕' : line}</span>
        </div>

        {/* The menu: permanent upgrades */}
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 short:grid-cols-3 short:gap-1.5">
          {UPGRADES.map((u) => {
            const lvl = levelOf(u.id);
            const max = u.costs.length;
            const maxed = lvl >= max;
            const cost = maxed ? 0 : u.costs[lvl];
            const can = !maxed && chai.coins >= cost;
            return (
              <div
                key={u.id}
                className={`flex flex-col border bg-[#241A0B] p-2.5 short:p-1.5 ${flash === u.id ? 'border-[#4ADE80]' : 'border-[#F59E0B]/25'}`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-2xl short:text-lg">{u.emoji}</span>
                  <div className="min-w-0">
                    <div className="truncate font-display text-lg leading-none font-black text-[#FCD34D] short:text-sm">{u.name}</div>
                    <div className="mt-1 flex gap-0.5">
                      {Array.from({ length: max }, (_, i) => (
                        <span key={i} className={`h-1.5 w-3 rounded-sm ${i < lvl ? 'bg-[#4ADE80]' : 'bg-[#F8F4EC]/15'}`} />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mt-1.5 text-[11px] leading-tight text-[#D6CEC2] short:mt-1 short:text-[10px]">{u.blurb}</div>
                <button
                  type="button"
                  disabled={!can}
                  onClick={() => buy(u.id)}
                  className={`mt-auto pt-0 text-xs font-black uppercase ${
                    maxed
                      ? 'mt-2 bg-[#14532D] py-1 text-[#4ADE80]'
                      : can
                        ? 'mt-2 bg-[#F59E0B] py-1 text-[#141210] hover:bg-[#D97706]'
                        : 'mt-2 bg-[#F8F4EC]/10 py-1 text-[#B6AA9A]'
                  } short:mt-1 short:py-0.5 short:text-[10px]`}
                >
                  {maxed ? 'On the menu!' : `Order · 🪙 ${cost}`}
                </button>
              </div>
            );
          })}
        </div>
        <div className="mt-2 text-center text-[11px] text-[#B6AA9A]">Earn chai coins in Street Brawl and Endless Mohalla. Upgrades work in Street Brawl only, so Endless stays a fair fight for the leaderboard. Saved on this device.</div>
      </div>
    </div>
  );
}
