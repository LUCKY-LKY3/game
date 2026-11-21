import { useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowLeftRight,
  ImagePlus,
  Pencil,
  Plus,
  Swords,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  Difficulty,
  FighterProfile,
  GameMode,
  isStreetBrawlMode,
  StageId,
} from '../types/game';
import {
  ARCHETYPE_INFO,
  FIGHTING_STYLES,
  resolveFighterStyle,
  STAGE_CONFIGS,
} from '../data/roster';
import { parseImportedFighterJson } from '../utils/storage';
import { extractPosterSquadFaces, PosterFaceMapping } from '../utils/portraitStylizer';
import { preloadFighter3DHead } from '../utils/FaceTo3DHead';
import { resolveFighter3DConfig } from '../utils/fighterHeads';

interface RosterSelectProps {
  mode: GameMode;
  fighters: FighterProfile[];
  p1Id: string;
  p2Id: string;
  stageId: StageId;
  difficulty: Difficulty;
  onSelectP1: (id: string) => void;
  onSelectP2: (id: string) => void;
  onSwapSides: () => void;
  onSelectStage: (stage: StageId) => void;
  onSelectDifficulty: (diff: Difficulty) => void;
  onOpenStudio: (fighterToEdit?: FighterProfile) => void;
  onDeleteCustom: (id: string) => void;
  onImportJsonFighter: (fighter: FighterProfile) => Promise<void>;
  onApplyPosterFaces: (mappings: PosterFaceMapping[]) => Promise<void>;
  onStartMatch: () => void;
  onBackToTitle: () => void;
}

function StatBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-14 text-[#B6AA9A]">{label}</span>
      <div className="h-1.5 flex-1 bg-[#141210]">
        <div className="h-full" style={{ width: `${value * 10}%`, backgroundColor: color }} />
      </div>
      <span className="font-mono-num w-5 text-right text-[#F8F4EC]">{value}</span>
    </div>
  );
}

export function RosterSelect({
  mode,
  fighters,
  p1Id,
  p2Id,
  stageId,
  difficulty,
  onSelectP1,
  onSelectP2,
  onSwapSides,
  onSelectStage,
  onSelectDifficulty,
  onOpenStudio,
  onDeleteCustom,
  onImportJsonFighter,
  onApplyPosterFaces,
  onStartMatch,
  onBackToTitle,
}: RosterSelectProps) {
  const [activeSlot, setActiveSlot] = useState<1 | 2>(1);
  const [importFeedback, setImportFeedback] = useState('');
  const [mapping3DFaces, setMapping3DFaces] = useState(false);
  const jsonInputRef = useRef<HTMLInputElement | null>(null);
  const posterInputRef = useRef<HTMLInputElement | null>(null);

  const p1 = fighters.find((f) => f.id === p1Id) ?? fighters[0];
  const p2 = fighters.find((f) => f.id === p2Id) ?? fighters[1] ?? fighters[0];

  const handleCardPick = (id: string) => {
    if (mode === 'arcade') {
      onSelectP1(id);
      return;
    }
    if (activeSlot === 1) {
      onSelectP1(id);
      setActiveSlot(2);
    } else {
      onSelectP2(id);
      setActiveSlot(1);
    }
  };

  const handleJsonUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = parseImportedFighterJson(text);
      if (!parsed) {
        setImportFeedback('Invalid fighter card JSON file.');
        return;
      }
      await onImportJsonFighter(parsed);
      setImportFeedback(`Imported ${parsed.name} into your roster.`);
    } catch {
      setImportFeedback('Could not import fighter card.');
    } finally {
      e.target.value = '';
    }
  };

  const handleMapSquad3DFaces = async () => {
    if (mapping3DFaces) return;
    setMapping3DFaces(true);
    setImportFeedback('Building real 3D face meshes for all 6 squad fighters...');
    try {
      const squadIds = new Set([
        'qari_jaleel',
        'rebel_aviator',
        'rebel_tactician',
        'rebel_enforcer',
        'rebel_striker',
        'rebel_shadow',
      ]);
      const targets = fighters.filter((f) => squadIds.has(f.id) || f.isCustom);
      let mappedCount = 0;
      for (const fighter of targets) {
        const src = fighter.rawPhotoUrl || fighter.portraitUrl || fighter.faceTextureUrl;
        if (!src) continue;
        const ok = await preloadFighter3DHead(src, resolveFighter3DConfig(fighter));
        if (ok) mappedCount++;
      }
      setImportFeedback(
        mappedCount > 0
          ? `Mapped ${mappedCount}/${targets.length} real 3D fighter heads — ready for the Indian Village Arena!`
          : '3D face meshes ready with sculpted fallback heads.'
      );
    } catch {
      setImportFeedback('Could not initialize 3D face mapper — using sculpted 3D heads.');
    } finally {
      setMapping3DFaces(false);
    }
  };

  const handlePosterUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = async () => {
        setMapping3DFaces(true);
        setImportFeedback('Slicing poster and mapping 6 real 3D faces...');
        try {
          const skinMap: Record<string, string> = {};
          fighters.forEach((f) => {
            skinMap[f.id] = f.appearance.skinTone;
          });
          const mappings = extractPosterSquadFaces(img, skinMap);
          await onApplyPosterFaces(mappings);
          let mappedCount = 0;
          for (const m of mappings) {
            const target = fighters.find((f) => f.id === m.fighterId);
            if (!target) continue;
            const ok = await preloadFighter3DHead(
              m.portraitUrl,
              resolveFighter3DConfig({ ...target, portraitUrl: m.portraitUrl })
            );
            if (ok) mappedCount++;
          }
          setImportFeedback(
            `Mapped ${mappedCount}/6 real 3D faces from your poster onto the squad!`
          );
        } finally {
          setMapping3DFaces(false);
        }
      };
      img.onerror = () => setImportFeedback('Could not read poster image.');
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleStartMatchClick = () => {
    // Pre-warm MediaPipe 3D heads for active combatants in parallel as the arena mounts
    const p1Src = p1.rawPhotoUrl || p1.portraitUrl || p1.faceTextureUrl;
    const p2Src = p2.rawPhotoUrl || p2.portraitUrl || p2.faceTextureUrl;
    if (p1Src) void preloadFighter3DHead(p1Src, resolveFighter3DConfig(p1));
    if (p2Src && p2Src !== p1Src) void preloadFighter3DHead(p2Src, resolveFighter3DConfig(p2));
    onStartMatch();
  };

  const isBrawl = isStreetBrawlMode(mode);
  const isEndless = mode === 'endless_mohalla';
  const modeTitle = isEndless
    ? 'Endless Mohalla · Survival Squad'
    : mode === 'street_brawl'
      ? 'Village Street Brawl · Tag Team'
      : mode === 'arcade'
        ? 'Arcade Tournament'
        : mode === 'versus_2p'
          ? 'Local 2-Player Versus'
          : 'Quick Exhibition';

  return (
    <div className="fixed inset-0 z-20 flex flex-col bg-[#141210] text-[#F8F4EC]">
      {/* Top Bar */}
      <header className="flex items-center justify-between gap-6 border-b border-[#F8F4EC]/12 px-4 py-3.5 sm:px-8">
        <button
          type="button"
          onClick={onBackToTitle}
          className="flex items-center gap-2 text-sm font-medium text-[#B6AA9A] hover:text-[#F8F4EC] transition-colors whitespace-nowrap shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
          Menu
        </button>

        <h1 className="font-display text-2xl font-black tracking-wide text-[#F8F4EC] sm:text-3xl whitespace-nowrap">
          {modeTitle}
        </h1>

        <button
          type="button"
          onClick={handleStartMatchClick}
          className="flex items-center gap-2 bg-[#F59E0B] px-5 py-2 text-xs font-bold text-[#141210] hover:bg-[#D97706] transition-colors whitespace-nowrap shrink-0 sm:text-sm"
        >
          <Swords className="h-4 w-4" />
          {isEndless ? 'Start Endless Mohalla' : isBrawl ? 'Start Street Brawl' : 'Start Match'}
        </button>
      </header>

      <div className="akhara-scroll flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="mx-auto max-w-6xl space-y-6">
          {/* MATCHUP SHOWCASE (P1 vs P2/Arcade Bracket) */}
          <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-[1fr_auto_1fr]">
            {/* Player 1 Preview */}
            <button
              type="button"
              onClick={() => setActiveSlot(1)}
              className={`flex items-center gap-4 border bg-[#1D1916] p-4 text-left transition-colors ${
                activeSlot === 1 ? 'border-[#F59E0B]' : 'border-[#F8F4EC]/12 hover:border-[#F8F4EC]/30'
              }`}
            >
              <div className="h-24 w-24 shrink-0 overflow-hidden border-2 border-[#F59E0B] bg-[#141210] sm:h-28 sm:w-28">
                <img
                  src={p1.portraitUrl || p1.faceTextureUrl}
                  alt={p1.name}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-[#F59E0B]">
                  {isBrawl ? 'Hero 1 (Lead)' : 'Player 1'} {activeSlot === 1 ? '· Selecting' : ''}
                </div>
                <div className="truncate font-display text-3xl font-black leading-none text-[#F8F4EC]">
                  {p1.name}
                </div>
                <div className="mt-0.5 truncate text-xs text-[#B6AA9A]">
                  {p1.nickname} · {ARCHETYPE_INFO[p1.archetype].label}
                </div>
                <div
                  className="mt-0.5 truncate text-[11px] font-bold uppercase tracking-wide"
                  style={{ color: FIGHTING_STYLES[resolveFighterStyle(p1)].color }}
                >
                  Style: {FIGHTING_STYLES[resolveFighterStyle(p1)].label}
                </div>
                <div className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-1">
                  <StatBar label="Power" value={p1.stats.power} color="#F59E0B" />
                  <StatBar label="Speed" value={p1.stats.speed} color="#F59E0B" />
                  <StatBar label="Reach" value={p1.stats.reach} color="#F59E0B" />
                  <StatBar label="Guard" value={p1.stats.defense} color="#F59E0B" />
                </div>
              </div>
            </button>

            {/* VS / Tag-Team + Swap Control */}
            <div className="flex flex-row items-center justify-center gap-3 lg:flex-col">
              <div className="font-display text-4xl font-black text-[#F59E0B]">
                {isBrawl ? 'TAG' : 'VS'}
              </div>
              {mode !== 'arcade' && (
                <button
                  type="button"
                  onClick={onSwapSides}
                  className="flex items-center gap-1.5 border border-[#F8F4EC]/15 bg-[#1D1916] px-3 py-1.5 text-xs font-semibold text-[#B6AA9A] hover:border-[#F59E0B] hover:text-[#F8F4EC] transition-colors whitespace-nowrap"
                >
                  <ArrowLeftRight className="h-3.5 w-3.5" />
                  {isBrawl ? 'Swap Lead' : 'Swap Sides'}
                </button>
              )}
            </div>

            {/* Player 2 OR Arcade Ladder Overview */}
            {mode === 'arcade' ? (
              <div className="flex flex-col justify-center border border-[#F8F4EC]/12 bg-[#1D1916] p-4">
                <div className="text-xs font-semibold text-[#DC2626]">
                  4-Stage Village Tournament Ladder
                </div>
                <h2 className="mt-1 font-display text-3xl font-black text-[#F8F4EC]">
                  Defeat the Village Champions
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-[#B6AA9A]">
                  Your custom imported friends automatically enter the challenger bracket alongside
                  the village regulars across all 3 arenas.
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-xs text-[#B6AA9A]">AI Difficulty:</span>
                  <div className="flex items-center gap-1 bg-[#141210] p-1">
                    {(['novice', 'pehelwan', 'grandmaster'] as Difficulty[]).map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => onSelectDifficulty(d)}
                        className={`px-2.5 py-1 text-xs font-semibold capitalize transition-colors whitespace-nowrap ${
                          difficulty === d
                            ? 'bg-[#DC2626] text-white'
                            : 'text-[#B6AA9A] hover:text-[#F8F4EC]'
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setActiveSlot(2)}
                className={`flex flex-row-reverse items-center gap-4 border bg-[#1D1916] p-4 text-right transition-colors ${
                  activeSlot === 2
                    ? isBrawl
                      ? 'border-[#38BDF8]'
                      : 'border-[#DC2626]'
                    : 'border-[#F8F4EC]/12 hover:border-[#F8F4EC]/30'
                }`}
              >
                <div
                  className={`h-24 w-24 shrink-0 overflow-hidden border-2 bg-[#141210] sm:h-28 sm:w-28 ${
                    isBrawl ? 'border-[#38BDF8]' : 'border-[#DC2626]'
                  }`}
                >
                  <img
                    src={p2.portraitUrl || p2.faceTextureUrl}
                    alt={p2.name}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div
                    className={`text-xs font-semibold ${
                      isBrawl ? 'text-[#38BDF8]' : 'text-[#F87171]'
                    }`}
                  >
                    {isBrawl
                      ? 'Hero 2 (Tag Partner)'
                      : mode === 'versus_2p'
                        ? 'Player 2'
                        : 'AI Opponent'}{' '}
                    {activeSlot === 2 ? '· Selecting' : ''}
                  </div>
                  <div className="truncate font-display text-3xl font-black leading-none text-[#F8F4EC]">
                    {p2.name}
                  </div>
                  <div className="mt-0.5 truncate text-xs text-[#B6AA9A]">
                    {p2.nickname} · {ARCHETYPE_INFO[p2.archetype].label}
                  </div>
                  <div
                    className="mt-0.5 truncate text-[11px] font-bold uppercase tracking-wide"
                    style={{ color: FIGHTING_STYLES[resolveFighterStyle(p2)].color }}
                  >
                    Style: {FIGHTING_STYLES[resolveFighterStyle(p2)].label}
                  </div>
                  <div className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-1 text-left">
                    <StatBar label="Power" value={p2.stats.power} color={isBrawl ? '#38BDF8' : '#DC2626'} />
                    <StatBar label="Speed" value={p2.stats.speed} color={isBrawl ? '#38BDF8' : '#DC2626'} />
                    <StatBar label="Reach" value={p2.stats.reach} color={isBrawl ? '#38BDF8' : '#DC2626'} />
                    <StatBar label="Guard" value={p2.stats.defense} color={isBrawl ? '#38BDF8' : '#DC2626'} />
                  </div>
                </div>
              </button>
            )}
          </div>

          {/* ROSTER GRID + IMPORT FRIEND CTA */}
          <section>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl font-bold text-[#F8F4EC]">
                  Choose Fighter ({fighters.length})
                </h2>
                <p className="text-xs text-[#B6AA9A]">
                  {isBrawl
                    ? `Pick 2 Squad Heroes (flip between both anytime with Tab/C or SWITCH!) — assigning Hero ${activeSlot}.`
                    : mode === 'arcade'
                      ? 'Select your fighter for the tournament ladder.'
                      : `Click a card to assign Player ${activeSlot}.`}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={posterInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePosterUpload}
                  className="hidden"
                />
                <input
                  ref={jsonInputRef}
                  type="file"
                  accept="application/json"
                  onChange={handleJsonUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  disabled={mapping3DFaces}
                  onClick={handleMapSquad3DFaces}
                  className="flex items-center gap-1.5 border border-[#F59E0B]/60 bg-[#2A2016] px-3 py-2 text-xs font-semibold text-[#F59E0B] hover:bg-[#F59E0B] hover:text-[#141210] disabled:opacity-60 transition-colors whitespace-nowrap"
                >
                  <ImagePlus className="h-3.5 w-3.5" />
                  {mapping3DFaces ? 'Mapping 3D Faces...' : 'Map Real Faces from Poster'}
                </button>
                <button
                  type="button"
                  disabled={mapping3DFaces}
                  onClick={() => posterInputRef.current?.click()}
                  className="flex items-center gap-1.5 border border-[#F8F4EC]/15 bg-[#1D1916] px-3 py-2 text-xs font-semibold text-[#F8F4EC] hover:border-[#F59E0B] disabled:opacity-60 transition-colors whitespace-nowrap"
                >
                  <Upload className="h-3.5 w-3.5" />
                  Upload Poster
                </button>
                <button
                  type="button"
                  onClick={() => jsonInputRef.current?.click()}
                  className="flex items-center gap-1.5 border border-[#F8F4EC]/15 bg-[#1D1916] px-3 py-2 text-xs font-semibold text-[#F8F4EC] hover:border-[#F59E0B] transition-colors whitespace-nowrap"
                >
                  <Upload className="h-3.5 w-3.5" />
                  Load Card (.json)
                </button>
                <button
                  type="button"
                  onClick={() => onOpenStudio()}
                  className="flex items-center gap-1.5 bg-[#F59E0B] px-3.5 py-2 text-xs font-bold text-[#141210] hover:bg-[#D97706] transition-colors whitespace-nowrap"
                >
                  <Plus className="h-4 w-4" />
                  Add Friend Photo
                </button>
              </div>
            </div>

            {importFeedback && (
              <div className="mt-2 text-xs font-medium text-[#F59E0B]">{importFeedback}</div>
            )}

            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {fighters.map((f) => {
                const isP1 = f.id === p1.id;
                const isP2 = mode !== 'arcade' && f.id === p2.id;
                return (
                  <div
                    key={f.id}
                    className={`group relative flex flex-col border bg-[#1D1916] transition-colors ${
                      isP1 && isP2
                        ? 'border-[#F59E0B]'
                        : isP1
                          ? 'border-[#F59E0B]'
                          : isP2
                            ? 'border-[#DC2626]'
                            : 'border-[#F8F4EC]/12 hover:border-[#F8F4EC]/35'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleCardPick(f.id)}
                      className="flex flex-1 flex-col text-left"
                    >
                      <div className="relative aspect-square w-full overflow-hidden bg-[#141210]">
                        <img
                          src={f.portraitUrl || f.faceTextureUrl}
                          alt={f.name}
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover object-top transition-transform duration-200 group-hover:scale-105"
                        />
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#141210] via-[#141210]/65 to-transparent p-2.5 pt-8">
                          <div className="truncate font-display text-2xl font-black leading-none text-[#F8F4EC]">
                            {f.name}
                          </div>
                          <div className="mt-0.5 truncate text-[11px] text-[#B6AA9A]">
                            {f.nickname} ·{' '}
                            <span
                              className="font-semibold"
                              style={{ color: FIGHTING_STYLES[resolveFighterStyle(f)].color }}
                            >
                              {FIGHTING_STYLES[resolveFighterStyle(f)].shortLabel}
                            </span>
                          </div>
                        </div>

                        {(isP1 || isP2) && (
                          <div className="absolute top-2 left-2 flex gap-1">
                            {isP1 && (
                              <span className="bg-[#F59E0B] px-1.5 py-0.5 font-mono-num text-[10px] font-bold text-[#141210]">
                                {isBrawl ? 'HERO 1' : 'P1'}
                              </span>
                            )}
                            {isP2 && (
                              <span
                                className={`px-1.5 py-0.5 font-mono-num text-[10px] font-bold ${
                                  isBrawl
                                    ? 'bg-[#38BDF8] text-[#141210]'
                                    : 'bg-[#DC2626] text-white'
                                }`}
                              >
                                {isBrawl ? 'HERO 2' : mode === 'versus_2p' ? 'P2' : 'AI'}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </button>

                    <div className="flex items-center justify-between gap-1 border-t border-[#F8F4EC]/10 bg-[#181512] px-2.5 py-1.5">
                      <button
                        type="button"
                        onClick={() => onOpenStudio(f)}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-[#B6AA9A] hover:text-[#F59E0B] whitespace-nowrap"
                      >
                        <Pencil className="h-3 w-3" />
                        Rename / Photo
                      </button>
                      {f.isCustom && !f.id.startsWith('qari_') && !f.id.startsWith('rebel_') && (
                        <button
                          type="button"
                          onClick={() => onDeleteCustom(f.id)}
                          aria-label={`Delete ${f.name}`}
                          className="p-1 text-[#B6AA9A] hover:text-[#DC2626]"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* STAGE SELECT & QUICK AI DIFFICULTY */}
          <section className="border-t border-[#F8F4EC]/10 pt-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl font-bold text-[#F8F4EC]">
                  Indian Village Arena
                </h2>
                <p className="text-xs text-[#B6AA9A]">
                  Pick your 3D battleground across the village.
                </p>
              </div>
              {mode === 'quick_ai' && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#B6AA9A]">AI Difficulty:</span>
                  <div className="flex items-center gap-1 bg-[#1D1916] p-1">
                    {(['novice', 'pehelwan', 'grandmaster'] as Difficulty[]).map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => onSelectDifficulty(d)}
                        className={`px-3 py-1 text-xs font-semibold capitalize transition-colors whitespace-nowrap ${
                          difficulty === d
                            ? 'bg-[#F59E0B] text-[#141210]'
                            : 'text-[#B6AA9A] hover:text-[#F8F4EC]'
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {STAGE_CONFIGS.map((stage) => {
                const selected = stage.id === stageId;
                return (
                  <button
                    key={stage.id}
                    type="button"
                    onClick={() => onSelectStage(stage.id)}
                    className={`group relative overflow-hidden border text-left transition-colors ${
                      selected
                        ? 'border-[#F59E0B]'
                        : 'border-[#F8F4EC]/15 hover:border-[#F8F4EC]/40'
                    }`}
                  >
                    <div className="aspect-video w-full overflow-hidden bg-[#1D1916]">
                      <img
                        src={stage.backdropUrl}
                        alt={stage.name}
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-[#141210] via-[#141210]/35 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-3">
                      <div className="font-display text-2xl font-black leading-none text-[#F8F4EC]">
                        {stage.name}
                      </div>
                      <div className="mt-0.5 text-xs text-[#B6AA9A]">
                        {stage.subtitle} · {stage.timeOfDay}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
