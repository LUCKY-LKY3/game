import { useEffect, useState } from 'react';
import { updateSettings, useSettings, ButtonSize } from '../utils/settings';
import { fullscreenSupported, isFullscreen, toggleFullscreen } from '../utils/fullscreen';

const SIZES: ButtonSize[] = ['S', 'M', 'L'];

/** Music volume, mute, touch button size and auto-aim */
export function SettingsPanel() {
  const s = useSettings();
  const [full, setFull] = useState(isFullscreen());
  useEffect(() => {
    const on = () => setFull(isFullscreen());
    document.addEventListener('fullscreenchange', on);
    return () => document.removeEventListener('fullscreenchange', on);
  }, []);
  return (
    <div className="mt-5 flex flex-col gap-4 text-[#F8F4EC]">
      <div>
        <div className="flex items-center justify-between text-xs font-black uppercase tracking-[0.16em] text-[#B6AA9A]">
          <span>Music volume</span>
          <span className="font-mono-num text-[#FCD34D]">{Math.round(s.musicVolume * 100)}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(s.musicVolume * 100)}
          onChange={(e) => updateSettings({ musicVolume: Number(e.target.value) / 100 })}
          className="mt-2 h-2 w-full cursor-pointer accent-[#F59E0B]"
          aria-label="Music volume"
        />
      </div>

      <Row label="Music">
        <Toggle on={!s.musicMuted} onLabel="On" offLabel="Muted" onClick={() => updateSettings({ musicMuted: !s.musicMuted })} />
      </Row>

      <Row label="Touch button size">
        <div className="flex gap-1.5">
          {SIZES.map((z) => (
            <button
              key={z}
              type="button"
              onClick={() => updateSettings({ buttonSize: z })}
              className={`h-9 w-11 border text-sm font-black transition-colors ${
                s.buttonSize === z
                  ? 'border-[#F59E0B] bg-[#F59E0B] text-[#141210]'
                  : 'border-[#F8F4EC]/20 bg-[#26211D] text-[#F8F4EC] hover:border-[#F59E0B]'
              }`}
            >
              {z}
            </button>
          ))}
        </div>
      </Row>

      <Row label="Difficulty (Brawl & Arcade)">
        <div className="flex gap-1.5">
          {(['novice', 'pehelwan', 'grandmaster'] as const).map((d, i) => (
            <button
              key={d}
              type="button"
              onClick={() => updateSettings({ difficulty: d })}
              className={`h-9 border px-2.5 text-xs font-black transition-colors ${
                s.difficulty === d
                  ? 'border-[#F59E0B] bg-[#F59E0B] text-[#141210]'
                  : 'border-[#F8F4EC]/20 bg-[#26211D] text-[#F8F4EC] hover:border-[#F59E0B]'
              }`}
            >
              {['Easy', 'Normal', 'Hard'][i]}
            </button>
          ))}
        </div>
      </Row>

      <Row label="Game speed">
        <div className="flex gap-1.5">
          {([0.7, 0.85, 1] as const).map((v, i) => (
            <button
              key={v}
              type="button"
              onClick={() => updateSettings({ gameSpeed: v })}
              className={`h-9 border px-2.5 text-xs font-black transition-colors ${
                Math.abs((s.gameSpeed ?? 0.85) - v) < 0.01
                  ? 'border-[#F59E0B] bg-[#F59E0B] text-[#141210]'
                  : 'border-[#F8F4EC]/20 bg-[#26211D] text-[#F8F4EC] hover:border-[#F59E0B]'
              }`}
            >
              {['Chill', 'Relaxed', 'Original'][i]}
            </button>
          ))}
        </div>
      </Row>

      <Row label="Auto-aim strikes">
        <Toggle on={s.autoAim} onLabel="On" offLabel="Off" onClick={() => updateSettings({ autoAim: !s.autoAim })} />
      </Row>
      {fullscreenSupported() && (
        <Row label="Full screen">
          <Toggle on={full} onLabel="On" offLabel="Off" onClick={() => void toggleFullscreen()} />
        </Row>
      )}
      <Row label="Immy wears boxers">
        <Toggle on={s.immyModest} onLabel="On" offLabel="Off" onClick={() => updateSettings({ immyModest: !s.immyModest })} />
      </Row>
      <Row label="Dhol beat bonus">
        <Toggle on={s.beatBonus} onLabel="On" offLabel="Off" onClick={() => updateSettings({ beatBonus: !s.beatBonus })} />
      </Row>
      <Row label="Left-handed layout">
        <Toggle on={s.leftHanded} onLabel="On" offLabel="Off" onClick={() => updateSettings({ leftHanded: !s.leftHanded })} />
      </Row>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs font-black uppercase tracking-[0.16em] text-[#B6AA9A]">{label}</span>
      {children}
    </div>
  );
}

function Toggle({ on, onLabel, offLabel, onClick }: { on: boolean; onLabel: string; offLabel: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-9 min-w-[5.5rem] border px-3 text-sm font-black transition-colors ${
        on ? 'border-[#4ADE80] bg-[#052E16] text-[#4ADE80]' : 'border-[#F8F4EC]/20 bg-[#26211D] text-[#B6AA9A]'
      }`}
    >
      {on ? onLabel : offLabel}
    </button>
  );
}
