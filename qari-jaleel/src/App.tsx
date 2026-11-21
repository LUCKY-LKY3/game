import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Difficulty,
  FighterProfile,
  GameMode,
  GameScreen,
  HudSnapshot,
  StageId,
} from './types/game';
import { createStarterRoster, getStageById, STAGE_CONFIGS } from './data/roster';
import {
  deleteCustomFighter,
  loadCustomFighters,
  saveCustomFighter,
} from './utils/storage';
import { soundEngine } from './engine/sound';
import { ArenaCanvas, ArenaCanvasHandle } from './components/ArenaCanvas';
import { CombatHud } from './components/CombatHud';
import { TitleOverlay } from './components/TitleOverlay';
import { RosterSelect } from './components/RosterSelect';
import { MatchOverModal, PauseModal } from './components/MatchOverlays';

export default function App() {
  const starterRoster = useMemo(() => createStarterRoster(), []);
  const [customFighters, setCustomFighters] = useState<FighterProfile[]>([]);

  // Merge saved edits/overrides for starter squad fighters cleanly in place, plus any extra added friends
  const allFighters = useMemo(() => {
    const preSwapNames: Record<string, string> = {
      rebel_tactician: "Ustad 'Immy' Mirza",
      rebel_shadow: "Dara 'Jav' Malik",
      rebel_enforcer: "Sultan 'Chet' Rathore",
      rebel_striker: "Sher 'Jam' Thakur",
    };

    const legacySpecials = new Set([
      'Rebellion Axe Cleaver',
      'Golden Shades Uppercut',
      'Calculated Counter Flurry',
      'Red Plaid Cyclone',
      'Monsoon Sweep Barrage',
      'Akhara Crushing Slam',
    ]);

    const overrideMap = new Map(customFighters.map((f) => [f.id, f]));
    const mergedStarters = starterRoster.map((s) => {
      const saved = overrideMap.get(s.id);
      if (!saved) return s;

      // If saved override still carries an old pre-swap default name, adopt the newly swapped name
      const syncedName = preSwapNames[s.id] === saved.name ? s.name : saved.name;
      // Sync legacy starter special move names to the new unique Powerup titles
      const syncedSpecial = legacySpecials.has(saved.specialMoveName)
        ? s.specialMoveName
        : saved.specialMoveName;
      // If saved override still uses the legacy cartoon PNG face on a starter portrait, upgrade to live portrait projection
      const usesLegacyStarterCartoonFace =
        saved.portraitUrl === s.portraitUrl &&
        typeof saved.faceTextureUrl === 'string' &&
        saved.faceTextureUrl.startsWith('data:image/png');

      return {
        ...saved,
        name: syncedName,
        specialMoveName: syncedSpecial,
        portraitFaceRect: saved.portraitFaceRect ?? s.portraitFaceRect,
        faceTextureUrl: usesLegacyStarterCartoonFace ? undefined : saved.faceTextureUrl,
      };
    });
    const starterIds = new Set(starterRoster.map((s) => s.id));
    const extraCustoms = customFighters.filter((f) => !starterIds.has(f.id));
    return [...extraCustoms, ...mergedStarters];
  }, [customFighters, starterRoster]);

  const [screen, setScreen] = useState<GameScreen>('TITLE');
  const [mode, setMode] = useState<GameMode>('street_brawl');
  const [difficulty, setDifficulty] = useState<Difficulty>('pehelwan');
  const [stageId, setStageId] = useState<StageId>('banyan_akhara');

  const [p1Id, setP1Id] = useState<string>(starterRoster[0].id);
  const [p2Id, setP2Id] = useState<string>(starterRoster[1].id);
  const [editingFighter, setEditingFighter] = useState<FighterProfile | null>(null);
  const [studioReturnScreen, setStudioReturnScreen] = useState<GameScreen>('TITLE');

  // Arcade 4-stage tournament ladder state
  const [arcadeBracket, setArcadeBracket] = useState<string[]>([]);
  const [arcadeStageIdx, setArcadeStageIdx] = useState(0);

  // Match HUD & controls state
  const [hud, setHud] = useState<HudSnapshot | null>(null);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [showTouchControls, setShowTouchControls] = useState(true);

  const arenaRef = useRef<ArenaCanvasHandle | null>(null);

  // Load saved custom friends from IndexedDB on startup
  useEffect(() => {
    loadCustomFighters()
      .then((list) => setCustomFighters(list))
      .catch(() => {});
  }, []);

  // ESC key toggles pause during active combat
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape' && screen === 'PLAYING' && hud?.phase !== 'MATCH_OVER') {
        setPaused((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [screen, hud?.phase]);

  const p1Profile = useMemo(
    () => allFighters.find((f) => f.id === p1Id) ?? starterRoster[0],
    [allFighters, p1Id, starterRoster]
  );

  const activeP2Profile = useMemo(() => {
    if (mode === 'arcade' && screen === 'PLAYING' && arcadeBracket.length > 0) {
      const oppId = arcadeBracket[arcadeStageIdx];
      return allFighters.find((f) => f.id === oppId) ?? starterRoster[1];
    }
    return allFighters.find((f) => f.id === p2Id) ?? starterRoster[1];
  }, [mode, screen, arcadeBracket, arcadeStageIdx, allFighters, p2Id, starterRoster]);

  const activeStageId: StageId = useMemo(() => {
    if (mode === 'arcade' && screen === 'PLAYING') {
      const stages: StageId[] = ['banyan_akhara', 'chai_chowk', 'mela_dusk', 'banyan_akhara'];
      return stages[arcadeStageIdx % stages.length];
    }
    return stageId;
  }, [mode, screen, arcadeStageIdx, stageId]);

  const handleToggleMute = () => {
    const next = !muted;
    setMuted(next);
    soundEngine.setMuted(next);
  };

  const handleSelectMode = (nextMode: GameMode) => {
    soundEngine.playUiSelect();
    setMode(nextMode);
    setScreen('ROSTER');
  };



  const handleDeleteCustomFighter = async (id: string) => {
    await deleteCustomFighter(id);
    const refreshed = await loadCustomFighters();
    setCustomFighters(refreshed);
    if (p1Id === id) setP1Id(starterRoster[0].id);
    if (p2Id === id) setP2Id(starterRoster[1].id);
  };



  const handleStartMatch = () => {
    soundEngine.playUiSelect();
    setPaused(false);
    if (mode === 'arcade') {
      // Build 4-opponent village ladder prioritizing custom friends alongside starter champions!
      const others = allFighters.filter((f) => f.id !== p1Profile.id);
      const customOthers = others.filter((f) => f.isCustom);
      const starterOthers = others.filter((f) => !f.isCustom);
      const bracket = [...customOthers, ...starterOthers].slice(0, 4).map((f) => f.id);
      setArcadeBracket(bracket.length > 0 ? bracket : [starterRoster[1].id]);
      setArcadeStageIdx(0);
    }
    setScreen('PLAYING');
  };

  const handleNextArcadeOpponent = () => {
    soundEngine.playUiSelect();
    setPaused(false);
    setArcadeStageIdx((idx) => Math.min(arcadeBracket.length - 1, idx + 1));
  };

  const handleMatchFinish = useCallback(
    (winnerSide: 1 | 2) => {
      const winner = winnerSide === 1 ? p1Profile : activeP2Profile;
      if (winner.isCustom) {
        const updated = { ...winner, wins: (winner.wins || 0) + 1 };
        saveCustomFighter(updated)
          .then(() => loadCustomFighters())
          .then((list) => setCustomFighters(list))
          .catch(() => {});
      }
    },
    [p1Profile, activeP2Profile]
  );

  const stageCfg = getStageById(activeStageId);
  const showArenaCanvas = screen === 'TITLE' || screen === 'PLAYING';
  const hasNextArcadeOpponent =
    mode === 'arcade' && arcadeStageIdx < arcadeBracket.length - 1;
  const arcadeCompleted =
    mode === 'arcade' &&
    hud?.phase === 'MATCH_OVER' &&
    hud.stats.winnerSide === 1 &&
    !hasNextArcadeOpponent;

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[#141210]">
      {/* Live 2.5D Three.js Fighting Canvas (Attract showcase on Title, active combat in Playing) */}
      {showArenaCanvas && (
        <ArenaCanvas
          ref={arenaRef}
          p1Profile={screen === 'TITLE' ? allFighters[0] : p1Profile}
          p2Profile={screen === 'TITLE' ? allFighters[1] ?? allFighters[0] : activeP2Profile}
          stageId={screen === 'TITLE' ? STAGE_CONFIGS[0].id : activeStageId}
          mode={mode}
          difficulty={difficulty}
          attractMode={screen === 'TITLE'}
          paused={paused}
          onHudUpdate={setHud}
          onMatchFinish={handleMatchFinish}
        />
      )}

      {/* Title Screen Hub */}
      {screen === 'TITLE' && (
        <TitleOverlay
          customCount={customFighters.length}
          onSelectMode={handleSelectMode}
        />
      )}

      {/* Fighter & Indian Village Stage Select */}
      {screen === 'ROSTER' && (
        <RosterSelect
          mode={mode}
          fighters={allFighters}
          p1Id={p1Profile.id}
          p2Id={p2Id}
          stageId={stageId}
          difficulty={difficulty}
          onSelectP1={setP1Id}
          onSelectP2={setP2Id}
          onSwapSides={() => {
            setP1Id(p2Id);
            setP2Id(p1Id);
          }}
          onSelectStage={setStageId}
          onSelectDifficulty={setDifficulty}
          onDeleteCustom={handleDeleteCustomFighter}
          onStartMatch={handleStartMatch}
          onBackToTitle={() => setScreen('TITLE')}
        />
      )}

      {/* Active Match HUD & Touch Pad */}
      {screen === 'PLAYING' && hud && (
        <CombatHud
          hud={hud}
          mode={mode}
          stageName={stageCfg.name}
          arcadeProgress={
            mode === 'arcade'
              ? { current: arcadeStageIdx + 1, total: Math.max(1, arcadeBracket.length) }
              : undefined
          }
          muted={muted}
          showTouchControls={showTouchControls}
          onToggleMute={handleToggleMute}
          onToggleTouchControls={() => setShowTouchControls((v) => !v)}
          onOpenPause={() => setPaused(true)}
          arenaRef={arenaRef}
        />
      )}

      {/* Pause & Move List Modal */}
      {screen === 'PLAYING' && paused && hud?.phase !== 'MATCH_OVER' && (
        <PauseModal
          mode={mode}
          onResume={() => setPaused(false)}
          onRestart={() => {
            setPaused(false);
            arenaRef.current?.restartMatch();
          }}
          onBackToRoster={() => {
            setPaused(false);
            setScreen('ROSTER');
          }}
          onBackToTitle={() => {
            setPaused(false);
            setScreen('TITLE');
          }}
        />
      )}

      {/* Match Over / Arcade Victory Summary */}
      {screen === 'PLAYING' && hud?.phase === 'MATCH_OVER' && (
        <MatchOverModal
          hud={hud}
          mode={mode}
          p1Profile={p1Profile}
          p2Profile={activeP2Profile}
          hasNextArcadeOpponent={hasNextArcadeOpponent}
          arcadeCompleted={arcadeCompleted}
          onNextArcadeOpponent={handleNextArcadeOpponent}
          onRematch={() => arenaRef.current?.restartMatch()}
          onBackToRoster={() => setScreen('ROSTER')}
          onSwitchMode={(nextMode) => {
            soundEngine.playUiSelect();
            setPaused(false);
            setMode(nextMode);
            setScreen('PLAYING');
          }}
        />
      )}
    </main>
  );
}
