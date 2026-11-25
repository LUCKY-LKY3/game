import { useEffect } from 'react';
import { ACHIEVEMENTS, equipTitle, refreshAchievements, useAch } from '../utils/achievements';

/** Achievements list: unlocked ones grant a title you can wear on the Hall of Fame. */
export function TitlesPanel() {
  const ach = useAch();
  useEffect(() => {
    refreshAchievements();
  }, []);
  const count = ACHIEVEMENTS.filter((a) => ach.unlocked[a.id]).length;
  return (
    <div className="border border-[#FACC15]/40 bg-[#0B0B0B] p-3">
      <div className="mb-2 flex items-center justify-between text-[10px] font-black tracking-[0.2em] uppercase">
        <span className="text-[#FACC15]">Titles · {count}/{ACHIEVEMENTS.length}</span>
        {ach.equipped && (
          <button type="button" onClick={() => equipTitle(null)} className="text-[#B6AA9A] underline">
            Take off title
          </button>
        )}
      </div>
      <div className="grid max-h-[46vh] grid-cols-1 gap-1.5 overflow-y-auto sm:grid-cols-2 short:max-h-[52vh]">
        {ACHIEVEMENTS.map((a) => {
          const got = !!ach.unlocked[a.id];
          const worn = ach.equipped === a.id;
          return (
            <button
              key={a.id}
              type="button"
              disabled={!got}
              onClick={() => equipTitle(a.id)}
              className={`flex items-center justify-between gap-2 border px-2.5 py-1.5 text-left ${
                worn ? 'border-[#FACC15] bg-[#2A2210]' : got ? 'border-[#F8F4EC]/25 bg-[#1D1916]' : 'border-[#F8F4EC]/10 bg-[#141210] opacity-60'
              }`}
            >
              <span className="min-w-0">
                <span className={`block font-display text-base leading-tight font-black ${got ? 'text-[#FACC15]' : 'text-[#8A7F70]'}`}>
                  {got ? '★ ' : '🔒 '}
                  {a.title}
                </span>
                <span className="mt-0.5 block text-[10px] leading-tight text-[#B6AA9A]">{a.desc}</span>
              </span>
              {got && <span className="shrink-0 text-[10px] font-black text-[#4ADE80] uppercase">{worn ? 'Worn' : 'Wear'}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
