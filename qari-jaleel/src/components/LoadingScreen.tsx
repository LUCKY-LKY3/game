import { useMemo } from 'react';
import logoUrl from '../assets/images/mafia-bhaiyas-logo.png?inline';

const TIPS = [
  'Chai bubbling on the stove...',
  'Oiling the lathis...',
  'Teaching the cousins to fight...',
  'Hanging the festival flags...',
  'Warming up the dhol...',
  'Counting the clay pots...',
  'Polishing Raju’s Splendor...',
];

interface LoadingScreenProps {
  visible: boolean;
  /** How long the progress bar takes to fill (ms) */
  durationMs: number;
}

/** Full-screen splash with the Mafia Bhaiyas logo, shown while the game boots and while a match starts */
export function LoadingScreen({ visible, durationMs }: LoadingScreenProps) {
  const tip = useMemo(() => TIPS[Math.floor(Math.random() * TIPS.length)], [visible]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div
      aria-hidden={!visible}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#141210] transition-opacity duration-500 ${
        visible ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
      style={{
        backgroundImage:
          'radial-gradient(ellipse at 50% 42%, rgba(250,204,21,0.22), rgba(220,38,38,0.10) 45%, rgba(20,18,16,0) 72%)',
      }}
    >
      <style>{`
        @keyframes bhLogoPulse { 0%,100% { transform: scale(1) rotate(-1deg); } 50% { transform: scale(1.04) rotate(1deg); } }
        @keyframes bhBarFill { from { width: 4%; } to { width: 100%; } }
      `}</style>
      <img
        src={logoUrl}
        alt="Mafia Bhaiyas"
        draggable={false}
        className="h-[min(46vh,18rem)] w-auto select-none drop-shadow-[0_10px_30px_rgba(0,0,0,0.85)]"
        style={{ animation: 'bhLogoPulse 1.8s ease-in-out infinite' }}
      />
      <div className="mt-5 h-2.5 w-[min(64vw,20rem)] overflow-hidden rounded-full border-2 border-[#141210] bg-[#2A221A] shadow-[0_0_14px_rgba(0,0,0,0.6)]">
        {visible && (
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#EF4444] via-[#F59E0B] to-[#FDE047]"
            style={{ animation: `bhBarFill ${durationMs}ms cubic-bezier(0.2,0.7,0.3,1) forwards` }}
          />
        )}
      </div>
      <div className="mt-3 text-[11px] font-black uppercase tracking-[0.22em] text-[#F8F4EC]/80">{tip}</div>
    </div>
  );
}
