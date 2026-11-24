import { useEffect, useState } from 'react';
import logoUrl from '../assets/images/mafia-bhaiyas-logo.png?inline';

const MESSAGES: string[] = [
  "Oi! Turn your phone sideways, bro. The pizza won't fight itself.",
  'Portrait mode is for selfies. Rotate it, champ!',
  'Fady says: Oye, phone nu ghuma, paaji!',
  'Jam says: Rotate it. Then drop me home.',
  'Jav says: Rotate the #£&@ phone, I was napping here.',
  'Chet says: rotating your phone has a 12% return on investment.',
  'Saf says: I love you. Now please rotate me.',
  "Immy says: sideways looks better on everyone. Trust me.",
  'The cousins are waiting. Rude to keep them standing.',
  "Tilt it sideways, like your uncle's head at every wedding.",
  'This game needs widescreen, like Harry\'s needs extra cheese.',
  'Rotate it, or the sheep gets it. (The sheep is fine. Rotate it anyway.)',
  "Your phone's the wrong way round. Don't worry, it happens to the best of us.",
  'Landscape, bhaiyo! Landscape!',
];

/** Shown by CSS only when the phone is held upright. Picks a new cheeky line each time it appears. */
export function RotateHint() {
  const [msg, setMsg] = useState(() => MESSAGES[Math.floor(Math.random() * MESSAGES.length)]);
  useEffect(() => {
    const mq = window.matchMedia?.('(orientation: portrait)');
    if (!mq) return;
    const reroll = () => {
      if (mq.matches) setMsg(MESSAGES[Math.floor(Math.random() * MESSAGES.length)]);
    };
    mq.addEventListener('change', reroll);
    return () => mq.removeEventListener('change', reroll);
  }, []);
  return (
    <div className="rotate-hint" aria-hidden="true">
      <img src={logoUrl} alt="" draggable={false} className="h-24 w-auto drop-shadow-[0_6px_18px_rgba(0,0,0,0.8)]" />
      <div className="mt-5 text-5xl">📱↻</div>
      <div className="mt-4 max-w-[19rem] px-4 font-display text-2xl leading-tight font-black tracking-wide text-[#F59E0B] uppercase [text-wrap:balance]">
        {msg}
      </div>
      <div className="mt-3 text-xs text-[#B6AA9A]">Mafia Bhaiyas plays in landscape</div>
    </div>
  );
}
