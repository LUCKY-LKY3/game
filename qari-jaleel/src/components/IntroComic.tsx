import { useEffect, useMemo, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { createStarterRoster } from '../data/roster';
import { renderCousinSnapshots } from '../utils/cousinSnapshots';
import { renderHeroSnapshots } from '../utils/heroSnapshots';
import logoUrl from '../assets/images/mafia-bhaiyas-logo.png?inline';

export const INTRO_KEY = 'mafia-bhaiyas-intro-v1';

type Who = 'qari_jaleel' | 'rebel_aviator' | 'rebel_tactician' | 'rebel_enforcer' | 'rebel_striker' | 'rebel_shadow';
const NAMES: Record<Who, string> = {
  qari_jaleel: 'Fady',
  rebel_aviator: 'Saf',
  rebel_tactician: 'Jav',
  rebel_enforcer: 'Jam',
  rebel_striker: 'Chet',
  rebel_shadow: 'Immy',
};

const BURSTS: Record<Who, string> = {
  qari_jaleel: 'radial-gradient(circle at 50% 65%, #FDE68A, #F59E0B 55%, #B45309)',
  rebel_aviator: 'radial-gradient(circle at 50% 65%, #FBCFE8, #EC4899 55%, #9D174D)',
  rebel_tactician: 'radial-gradient(circle at 50% 65%, #BBF7D0, #22C55E 55%, #166534)',
  rebel_enforcer: 'radial-gradient(circle at 50% 65%, #BAE6FD, #0EA5E9 55%, #075985)',
  rebel_striker: 'radial-gradient(circle at 50% 65%, #DDD6FE, #8B5CF6 55%, #5B21B6)',
  rebel_shadow: 'radial-gradient(circle at 50% 65%, #FECACA, #EF4444 55%, #991B1B)',
};

function Panel({ children, delay = 0, tilt = 0, grow = 1 }: { children: React.ReactNode; delay?: number; tilt?: number; grow?: number }) {
  return (
    <div
      className="comic-panel relative min-w-0 overflow-hidden border-[3px] border-[#141210] bg-[#FDF6E3] shadow-[4px_4px_0_#141210]"
      style={{ flexGrow: grow, flexBasis: 0, animationDelay: `${delay}s`, transform: `rotate(${tilt}deg)` }}
    >
      {children}
    </div>
  );
}

function Bubble({ text, className = '' }: { text: string; className?: string }) {
  return (
    <div
      className={`absolute z-10 max-w-[88%] rounded-2xl border-2 border-[#141210] bg-white px-2.5 py-1.5 text-center text-[12px] font-extrabold leading-tight text-[#141210] [text-wrap:balance] sm:text-[15px] ${className}`}
    >
      {text}
    </div>
  );
}

function Caption({ text, className = '' }: { text: string; className?: string }) {
  return (
    <div className={`absolute z-10 border-2 border-[#141210] bg-[#FACC15] px-2 py-0.5 font-display text-[11px] font-black tracking-wider text-[#141210] uppercase sm:text-sm ${className}`}>
      {text}
    </div>
  );
}

export function IntroComic({ onDone }: { onDone: () => void }) {
  const [page, setPage] = useState(0);
  const roster = useMemo(() => createStarterRoster(), []);
  const portraits = useMemo(() => {
    const map = {} as Record<Who, string>;
    roster.forEach((f) => {
      map[f.id as Who] = f.portraitUrl ?? '';
    });
    return map;
  }, [roster]);
  const [cousins, setCousins] = useState<string[]>([]);
  const [bodies, setBodies] = useState<Record<string, string>>({});
  useEffect(() => {
    // Draw the real in-game 3D fighters and cousins (falls back to portraits while loading or if WebGL fails)
    const t = window.setTimeout(() => {
      setBodies(renderHeroSnapshots(roster));
      setCousins(renderCousinSnapshots(['tinku', 'moti_pehelwan', 'bunty']));
    }, 50);
    return () => clearTimeout(t);
  }, [roster]);

  const Hero = ({ who, tall = false }: { who: Who; tall?: boolean }) =>
    bodies[who] ? (
      <>
        <div className="absolute inset-0" style={{ background: BURSTS[who] }} />
        <img src={bodies[who]} alt={NAMES[who]} draggable={false} className={`absolute bottom-0 left-0 w-full object-contain object-bottom ${tall ? 'h-full' : 'h-[72%]'}`} />
      </>
    ) : (
      <img src={portraits[who]} alt={NAMES[who]} draggable={false} className="absolute inset-0 h-full w-full object-cover object-top" />
    );

  const pages: React.ReactNode[] = [
    // 1: all the Bhaiyas
    <div key="p1" className="flex h-full flex-col gap-2">
      <div className="flex items-center justify-center gap-3">
        <img src={logoUrl} alt="Mafia Bhaiyas" className="h-[min(18vh,5.5rem)] w-auto" draggable={false} />
        <div className="font-display text-xl font-black tracking-wider text-[#141210] uppercase sm:text-3xl">...and they are HUNGRY!</div>
      </div>
      <div className="flex min-h-0 flex-1 gap-2">
        {(Object.keys(NAMES) as Who[]).map((w, i) => (
          <Panel key={w} delay={i * 0.12} tilt={i % 2 === 0 ? -1.5 : 1.5}>
            <Hero who={w} tall />
            <Caption text={NAMES[w]} className="bottom-0 left-0" />
          </Panel>
        ))}
      </div>
    </div>,
    // 2: starving
    <div key="p2" className="flex h-full gap-2">
      <Panel delay={0}>
        <Hero who="qari_jaleel" />
        <Bubble text="Oye, bhaiyo! I'm STARVING!" className="top-2 left-1/2 -translate-x-1/2" />
      </Panel>
      <Panel delay={0.2} tilt={1}>
        <Hero who="rebel_aviator" />
        <Bubble text="Aww, hungry buddies! Group hug first?" className="top-2 left-1/2 -translate-x-1/2" />
      </Panel>
      <Panel delay={0.4} tilt={-1}>
        <Hero who="rebel_tactician" />
        <Bubble text="I'm so #£&@ hungry I could eat a buffalo!" className="top-2 left-1/2 -translate-x-1/2" />
      </Panel>
    </div>,
    // 3: other side of town
    <div key="p3" className="flex h-full gap-2">
      <Panel delay={0}>
        <Hero who="rebel_striker" />
        <Bubble text="Bro. We should go get some food." className="top-2 left-1/2 -translate-x-1/2" />
      </Panel>
      <Panel delay={0.25} grow={1.2}>
        <div className="absolute inset-0 bg-gradient-to-b from-[#7DD3FC] to-[#FDE68A]" />
        <div className="absolute inset-x-0 bottom-[28%] h-6 bg-[#475569]" />
        <div className="absolute inset-x-0 bottom-[28%] mt-3 h-[3px] border-t-[3px] border-dashed border-white" style={{ marginBottom: '0.6rem' }} />
        <div className="absolute bottom-[40%] left-3 text-3xl">🏠</div>
        <div className="absolute right-3 bottom-[40%] text-3xl">🍕</div>
        <div className="absolute inset-x-0 top-[34%] text-center font-display text-3xl font-black tracking-widest text-[#141210]/80 uppercase">
          ← far far away →
        </div>
        <Caption text="...but it's on the other side of town." className="top-2 left-2" />
      </Panel>
      <Panel delay={0.5} tilt={-1}>
        <Hero who="rebel_enforcer" />
        <Bubble text="Bro, can you drop me off first? My uncle's cousin..." className="top-2 left-1/2 -translate-x-1/2" />
      </Panel>
    </div>,
    // 4: pizza at Harry's
    <div key="p4" className="flex h-full gap-2">
      <Panel delay={0} grow={1.1}>
        <Hero who="rebel_shadow" />
        <Bubble text="Let's go get some pizza at Harry's, bro." className="top-2 left-1/2 -translate-x-1/2" />
      </Panel>
      <Panel delay={0.25} grow={1.2}>
        <div className="absolute inset-0 bg-gradient-to-b from-[#FCA5A5] to-[#B91C1C]" />
        <div className="absolute inset-x-4 top-[18%] rotate-[-3deg] border-4 border-[#141210] bg-[#FEF3C7] px-3 py-2 text-center shadow-[4px_4px_0_#141210]">
          <div className="font-display text-3xl font-black tracking-wider text-[#B91C1C] uppercase sm:text-5xl">Harry&apos;s</div>
          <div className="text-[11px] font-black tracking-[0.3em] text-[#141210] uppercase sm:text-sm">Pizza · Open Late</div>
        </div>
        <div className="absolute inset-x-0 bottom-3 text-center text-5xl sm:text-6xl">🍕</div>
      </Panel>
      <Panel delay={0.5} tilt={1}>
        <Hero who="rebel_aviator" />
        <Bubble text="HARRY'S?! I love Harry's! I love everyone at Harry's!" className="top-2 left-1/2 -translate-x-1/2" />
      </Panel>
    </div>,
    // 5: cousins block the way
    <div key="p5" className="flex h-full gap-2">
      <Panel delay={0} grow={2.3}>
        <div className="absolute inset-0 bg-gradient-to-b from-[#FDBA74] to-[#92400E]" />
        <div className="absolute inset-x-0 bottom-0 flex h-[88%] items-end justify-center">
          {cousins.length === 0 && <div className="mb-10 font-display text-lg font-black text-[#141210]/50 uppercase">Cousins incoming...</div>}
          {cousins.slice(0, 3).map((src, i) => (
            <img key={i} src={src} alt="Angry cousin" draggable={false} className="h-full w-auto object-contain" style={{ marginBottom: i % 2 ? '-4%' : 0 }} />
          ))}
        </div>
        <Bubble text="If you wanna eat, you gotta get past US first!" className="top-2 left-1/2 -translate-x-1/2" />
        <Caption text="Meanwhile, in the road..." className="bottom-1 left-1" />
      </Panel>
      <Panel delay={0.35} tilt={1.5}>
        <Hero who="qari_jaleel" />
        <Bubble text="...Oh, come ON. I just want pizza." className="top-2 left-1/2 -translate-x-1/2" />
      </Panel>
    </div>,
  ];
  const last = page === pages.length - 1;

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col bg-[#F4E9D0] p-3 sm:p-6 [@media(max-height:480px)]:p-2"
      style={{ backgroundImage: 'radial-gradient(#D8C69B 1.3px, transparent 1.6px)', backgroundSize: '10px 10px' }}
      onClick={() => !last && setPage((p) => p + 1)}
    >
      <div key={page} className="comic-page min-h-0 flex-1">
        {pages[page]}
      </div>
      <div className="mt-2 flex items-center justify-between">
        <div className="flex gap-1.5">
          {pages.map((_, i) => (
            <span key={i} className={`h-2 w-2 rounded-full border border-[#141210] ${i === page ? 'bg-[#141210]' : 'bg-transparent'}`} />
          ))}
        </div>
        {last ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDone();
            }}
            className="animate-pulse border-[3px] border-[#141210] bg-[#DC2626] px-5 py-1.5 font-display text-lg font-black tracking-wider text-white uppercase shadow-[3px_3px_0_#141210] sm:text-2xl"
          >
            Fight for pizza!
          </button>
        ) : (
          <span className="text-[11px] font-black tracking-widest text-[#141210]/70 uppercase">Tap to continue</span>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDone();
          }}
          className="inline-flex items-center gap-1 border-2 border-[#141210] bg-white px-3 py-1 text-xs font-black tracking-wider text-[#141210] uppercase shadow-[2px_2px_0_#141210]"
        >
          Skip <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
