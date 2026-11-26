import { X } from 'lucide-react';
import logoUrl from '../assets/images/mafia-bhaiyas-logo.png?inline';

const SECTIONS: { title: string; rows: [string, string][] }[] = [
  {
    title: 'Production',
    rows: [
      ['Executive Producer', 'The Guy Holding This Phone'],
      ['Producer', 'Whoever Paid For The Chai'],
      ['Associate Producer', "Bro's Cousin's Friend"],
      ['Line Producer', 'Uncle Ji (He "Knows Computers")'],
      ['Catering', 'One Samosa, Shared By Seven People'],
    ],
  },
  {
    title: 'Design',
    rows: [
      ['Game Design', 'Several Strongly Worded WhatsApp Messages'],
      ['Art Direction', 'Aunty (She Chose The Curtains)'],
      ['Character Design', 'A Mirror, Mostly'],
      ['3D Modelling', '400 Triangles And A Dream'],
      ['Level Design', 'A Street. Some Pots.'],
    ],
  },
  {
    title: 'Technical',
    rows: [
      ['Lead Programmer', 'An AI Who Has Never Eaten Pizza'],
      ['Additional Programming', 'Turning It Off And On Again'],
      ['Physics', 'Things Fall Down. Usually.'],
      ['Frame Rate Consultant', "Your Phone's Mood"],
    ],
  },
  {
    title: 'Sound',
    rows: [
      ['Music', 'Rain-Slicked Escape (The One That Actually Plays)'],
      ['Percussion', "Sharma Ji's Dhol (Borrowed, Dented)"],
      ['Rickshaw Horn', 'Real Rickshaw. Very Annoyed.'],
    ],
  },
  {
    title: 'Cast & Crew',
    rows: [
      ['Fady', 'Head of Elocution and Fine Manners'],
      ['Saf', 'Head Of Hugs'],
      ['Jav', 'Animation (Was Asleep, Still Got Credit)'],
      ['Jav', 'Punjabi Gaali Consultant (HR Complaint Pending)'],
      ['Jam', 'Voice Direction. "Can Someone Drop Me Home?"'],
      ['Chet', 'Finance. Charged A 12% Management Fee'],
      ['Immy', "Charm Coach. Please Don't Ask"],
      ['Raju', 'Rickshaw Wrangler'],
      ['The Cousins', 'Stunts. Many Were Annoyed'],
      ['14 Sheep', 'Quality Assurance'],
    ],
  },
  {
    title: 'Pizza Division',
    rows: [
      ['Pizza Logistics', "Harry's (Please Open Earlier)"],
      ['Route Planning', 'The Other Side Of Town'],
      ['Chai Supply', 'Everyone'],
    ],
  },
];

const THANKS = [
  'Aunty',
  'Nani (Her Slap Is Legendary)',
  'The WiFi (Sometimes)',
  "Harry's Pizza",
  'The Person Who Invented Samosas',
  'Cricket, Coming To The Olympics!',
  'Everyone Who Said "Bro, One More Fight"',
];

/** Scrolling movie-style credits. Tap anywhere or press Close to leave. */
export function Credits({ onClose }: { onClose: () => void }) {
  return (
    <div className="safe-inset pointer-events-auto fixed inset-0 z-50 overflow-hidden bg-[#0B0907]" onClick={onClose}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="Close credits"
        className="absolute top-3 right-3 z-10 inline-flex h-9 items-center gap-1.5 border border-[#F8F4EC]/30 bg-[#141210]/90 px-3 text-[11px] font-black tracking-widest text-[#F8F4EC] uppercase"
      >
        <X className="h-4 w-4" /> Close
      </button>
      <div className="credits-roll mx-auto flex w-[min(34rem,92vw)] flex-col items-center px-2 py-[100vh] text-center" onAnimationEnd={onClose}>
        <img src={logoUrl} alt="Mafia Bhaiyas" draggable={false} className="h-28 w-auto" />
        <div className="mt-3 font-display text-lg font-extrabold tracking-[0.25em] text-[#DC2626] uppercase">A Mohalla Pictures Production</div>
        <div className="mt-1 text-xs text-[#B6AA9A]">(Not An Actual Studio. Please Do Not Sue.)</div>

        {SECTIONS.map((sec) => (
          <div key={sec.title} className="mt-12 w-full">
            <div className="font-display text-2xl font-black tracking-[0.2em] text-[#F59E0B] uppercase">{sec.title}</div>
            <div className="mt-4 flex flex-col gap-3">
              {sec.rows.map(([role, name], i) => (
                <div key={`${role}-${i}`}>
                  <div className="text-[10px] font-bold tracking-[0.22em] text-[#B6AA9A] uppercase">{role}</div>
                  <div className="text-base font-extrabold text-[#F8F4EC]">{name}</div>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="mt-12 w-full">
          <div className="font-display text-2xl font-black tracking-[0.2em] text-[#F59E0B] uppercase">Special Thanks</div>
          <div className="mt-4 flex flex-col gap-1.5 text-base font-bold text-[#F8F4EC]">
            {THANKS.map((t) => (
              <div key={t}>{t}</div>
            ))}
          </div>
        </div>

        <div className="mt-14 text-sm text-[#D6CEC2]">No cousins were harmed in the making of this game.</div>
        <div className="mt-1 text-sm text-[#D6CEC2]">The sheep's pride, however, took a hit.</div>
        <div className="mt-8 font-display text-3xl font-black tracking-[0.2em] text-[#F8F4EC] uppercase">The End</div>
        <div className="font-mono-num mt-2 text-xs text-[#B6AA9A]">v{__APP_VERSION__}</div>
        <div className="mt-24 text-xs italic text-[#8A7F70]">P.S. Jam is still waiting for a lift home.</div>
      </div>
    </div>
  );
}
