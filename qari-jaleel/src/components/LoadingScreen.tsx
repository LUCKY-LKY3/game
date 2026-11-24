import { useEffect, useState } from 'react';
import logoUrl from '../assets/images/mafia-bhaiyas-logo.png?inline';

const TIPS = [
  'Chai bubbling on the stove...',
  'Oiling the lathis...',
  'Teaching the cousins to fight...',
  'Hanging the festival flags...',
  'Warming up the dhol...',
  'Counting the clay pots...',
  'Polishing Raju’s Splendor...',
  'Asking the sheep for permission...',
  'Blowing on the cartridge...',
  'Inflating the cricket ball...',
  'Ironing the lungis...',
  'Arguing about who pays for the pizza...',
  'Buffering the samosas...',
  'Looking for the TV remote...',
  'Untangling the phone chargers...',
  'Sharpening the chappals...',
  'Waking up the rickshaw...',
  'Dusting off the clay pots...',
  'Finding a parking spot for the bullock cart...',
  'Loading 4 percent of 100 percent...',
  'Checking if the WiFi is plugged in...',
  'Frying the jalebis...',
  'Hiding the last biscuit...',
  'Negotiating with a pigeon...',
  'Turning it off and on again...',
  'Calling the neighbour to ask what is going on...',
  'Adding extra sugar to the chai...',
  'Waiting for the uncle to finish his story...',
  'Rolling out the red carpet. It is a bedsheet.',
  'Stretching before the fight...',
  'Looking for matching socks...',
  'Dividing the last samosa into seven...',
  'Putting the tiffin in the fridge...',
  'Practising the dramatic stare...',
  'Shooing the monkey off the roof...',
  'Counting to ten before punching...',
  'Borrowing sugar from next door...',
  'Pretending to know how this works...',
  'Locating the good lathi...',
  'Making the dramatic slow-motion entrance...',
  'Shaking the dhol until it behaves...',
  'Reading the terms and conditions. Just kidding.',
  'Messaging the cousins in the group chat...',
  'Sweeping the street. Mostly the dust moved.',
  'Charging the phone to 1 percent...',
  'Arranging the folding chairs...',
  'Checking the weather. It is spicy.',
  'Cooking up some trouble. And dal.',
];

interface LoadingScreenProps {
  visible: boolean;
  /** How long the progress bar takes to fill (ms) */
  durationMs: number;
}

/** Full-screen splash with the Mafia Bhaiyas logo, shown while the game boots and while a match starts */
export function LoadingScreen({ visible, durationMs }: LoadingScreenProps) {
  const pick = (not?: string) => {
    let t = TIPS[Math.floor(Math.random() * TIPS.length)];
    while (t === not && TIPS.length > 1) t = TIPS[Math.floor(Math.random() * TIPS.length)];
    return t;
  };
  const [tip, setTip] = useState(() => pick());
  // New slogan each time the screen appears, and a fresh one every couple of seconds while it stays up
  useEffect(() => {
    if (!visible) return;
    setTip((t) => pick(t));
    const id = window.setInterval(() => setTip((t) => pick(t)), 2200);
    return () => clearInterval(id);
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps
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
      <div className="mt-3 max-w-[min(90vw,28rem)] px-4 text-center text-[11px] leading-snug font-black uppercase tracking-[0.22em] text-[#F8F4EC]/80">{tip}</div>
    </div>
  );
}
