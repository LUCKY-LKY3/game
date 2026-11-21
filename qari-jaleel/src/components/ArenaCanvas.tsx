import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  Difficulty,
  FighterProfile,
  GameMode,
  HudSnapshot,
  isStreetBrawlMode,
  PlayerInputState,
  StageId,
  VillageBoonId,
} from '../types/game';
import { createFighterRig } from '../engine/fighterRig';
import { buildVillageStage } from '../engine/villageStage';
import { buildStreetStage } from '../engine/streetStage';
import { AkharaCombatEngine, createEmptyInput } from '../engine/combatEngine';
import { StreetBrawlEngine } from '../engine/streetBrawlEngine';
import { soundEngine } from '../engine/sound';
import { getStageById } from '../data/roster';

export interface ArenaCanvasHandle {
  restartMatch: () => void;
  setTouchHold: (control: 'left' | 'right' | 'up' | 'down' | 'block', active: boolean) => void;
  setTouchDirections: (dirs: { left: boolean; right: boolean; up: boolean; down: boolean }) => void;
  triggerTouchAction: (
    action:
      | 'lp'
      | 'rp'
      | 'kick'
      | 'sidestep'
      | 'throw'
      | 'rage'
      | 'switch'
      | 'assist'
      | 'panic_special'
      | 'jump'
  ) => void;
  triggerTouchDash: (dir: -1 | 1) => void;
  selectVillageBoon: (boonId: VillageBoonId) => void;
}

interface ArenaCanvasProps {
  p1Profile: FighterProfile;
  p2Profile: FighterProfile;
  stageId: StageId;
  mode: GameMode;
  difficulty: Difficulty;
  attractMode: boolean;
  paused: boolean;
  onHudUpdate: (snapshot: HudSnapshot) => void;
  onMatchFinish?: (winnerSide: 1 | 2) => void;
}

function detectSoftwareWebGL(): boolean {
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export const ArenaCanvas = forwardRef<ArenaCanvasHandle, ArenaCanvasProps>(function ArenaCanvas(
  {
    p1Profile,
    p2Profile,
    stageId,
    mode,
    difficulty,
    attractMode,
    paused,
    onHudUpdate,
    onMatchFinish,
  },
  ref
) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<AkharaCombatEngine | StreetBrawlEngine | null>(null);
  const p1InputRef = useRef<PlayerInputState>(createEmptyInput());
  const p2InputRef = useRef<PlayerInputState>(createEmptyInput());
  const onHudUpdateRef = useRef(onHudUpdate);
  const onMatchFinishRef = useRef(onMatchFinish);
  const pausedRef = useRef(paused);
  const [contextLost, setContextLost] = useState(false);

  onHudUpdateRef.current = onHudUpdate;
  onMatchFinishRef.current = onMatchFinish;
  pausedRef.current = paused;

  useEffect(() => {
    const engine = engineRef.current;
    if (engine) {
      engine.paused = paused;
      if (engine instanceof StreetBrawlEngine) {
        if (paused) {
          soundEngine.stopDholLoop();
        } else if (engine.getHudSnapshot().phase !== 'MATCH_OVER') {
          soundEngine.startDholLoop();
        }
      }
    }
  }, [paused]);

  useImperativeHandle(ref, () => ({
    restartMatch: () => {
      engineRef.current?.restartMatch();
      if (engineRef.current) {
        onHudUpdateRef.current(engineRef.current.getHudSnapshot());
      }
    },
    setTouchHold: (control, active) => {
      p1InputRef.current[control] = active;
    },
    setTouchDirections: (dirs) => {
      p1InputRef.current.left = dirs.left;
      p1InputRef.current.right = dirs.right;
      p1InputRef.current.up = dirs.up;
      p1InputRef.current.down = dirs.down;
    },
    triggerTouchAction: (action) => {
      const inp = p1InputRef.current;
      if (action === 'lp') inp.lpPressed = true;
      else if (action === 'rp') inp.rpPressed = true;
      else if (action === 'kick') inp.kickPressed = true;
      else if (action === 'sidestep') inp.sidestepPressed = true;
      else if (action === 'throw') inp.throwPressed = true;
      else if (action === 'rage') inp.ragePressed = true;
      else if (action === 'switch') inp.switchPressed = true;
      else if (action === 'assist') inp.assistPressed = true;
      else if (action === 'panic_special') inp.panicSpecialPressed = true;
      else if (action === 'jump') inp.jumpPressed = true;
    },
    triggerTouchDash: (dir) => {
      p1InputRef.current.dashDir = dir;
    },
    selectVillageBoon: (boonId) => {
      const eng = engineRef.current;
      if (eng instanceof StreetBrawlEngine) {
        eng.selectVillageBoon(boonId);
        onHudUpdateRef.current(eng.getHudSnapshot());
      }
    },
  }));

  // Global keyboard bindings for Player 1 and Local Player 2 (with double-tap A/D dash & Tap/Hold Tab/C Assist)
  useEffect(() => {
    let lastLeftTap = 0;
    let lastRightTap = 0;
    let switchHoldTimer: number | null = null;
    let switchHoldFired = false;

    const handleKey = (e: KeyboardEvent, down: boolean) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const code = e.code;
      const p1 = p1InputRef.current;
      const p2 = p2InputRef.current;

      // Prevent arrow/space/tab page scrolling or focus jump during combat
      if (
        ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab'].includes(code) &&
        !attractMode
      ) {
        e.preventDefault();
      }

      // Double-tap A / D sprint dash detection (< 260ms)
      if (down && !e.repeat) {
        const now = performance.now();
        if (code === 'KeyA') {
          if (now - lastLeftTap < 260) p1.dashDir = -1;
          lastLeftTap = now;
        } else if (code === 'KeyD') {
          if (now - lastRightTap < 260) p1.dashDir = 1;
          lastRightTap = now;
        }
      }

      // Tap vs Hold (0.3s) Tag-Team Assist on Tab / KeyC
      if (code === 'Tab' || code === 'KeyC') {
        if (down && !e.repeat) {
          switchHoldFired = false;
          if (switchHoldTimer !== null) window.clearTimeout(switchHoldTimer);
          switchHoldTimer = window.setTimeout(() => {
            switchHoldFired = true;
            switchHoldTimer = null;
            p1.assistPressed = true;
          }, 300);
        } else if (!down) {
          if (switchHoldTimer !== null) {
            window.clearTimeout(switchHoldTimer);
            switchHoldTimer = null;
          }
          if (!switchHoldFired) {
            p1.switchPressed = true;
          }
          switchHoldFired = false;
        }
        return;
      }

      // Player 1: WASD + Space (Jump in Brawl / Block in 1v1) + Q (Guard/Parry) + F/G/H/E/R/T/V
      if (code === 'KeyA') p1.left = down;
      else if (code === 'KeyD') p1.right = down;
      else if (code === 'KeyW') p1.up = down;
      else if (code === 'KeyS') p1.down = down;
      else if (code === 'KeyQ') p1.block = down;
      else if (code === 'Space') {
        if (isStreetBrawlMode(mode)) {
          if (down && !e.repeat) p1.jumpPressed = true;
        } else {
          p1.block = down;
        }
      } else if (down && !e.repeat) {
        if (code === 'KeyF') p1.lpPressed = true;
        else if (code === 'KeyG') p1.rpPressed = true;
        else if (code === 'KeyH') p1.kickPressed = true;
        else if (code === 'KeyE' || code === 'ShiftLeft') p1.sidestepPressed = true;
        else if (code === 'KeyR') p1.throwPressed = true;
        else if (code === 'KeyT') p1.ragePressed = true;
        else if (code === 'KeyV') p1.panicSpecialPressed = true;
      }

      // Player 2 (Local 2-Player): Arrows + J (Jab), K (Heavy), L (Kick), U (Throw), I (Rage), O/ShiftRight (Sidestep), Semicolon/Slash (Block)
      if (code === 'ArrowLeft') p2.left = down;
      else if (code === 'ArrowRight') p2.right = down;
      else if (code === 'ArrowUp') p2.up = down;
      else if (code === 'ArrowDown') p2.down = down;
      else if (code === 'Semicolon' || code === 'Slash' || code === 'ControlRight') p2.block = down;
      else if (down && !e.repeat) {
        if (code === 'KeyJ') p2.lpPressed = true;
        else if (code === 'KeyK') p2.rpPressed = true;
        else if (code === 'KeyL') p2.kickPressed = true;
        else if (code === 'KeyO' || code === 'ShiftRight') p2.sidestepPressed = true;
        else if (code === 'KeyU') p2.throwPressed = true;
        else if (code === 'KeyI') p2.ragePressed = true;
      }
    };

    const onDown = (e: KeyboardEvent) => handleKey(e, true);
    const onUp = (e: KeyboardEvent) => handleKey(e, false);
    const onBlur = () => {
      p1InputRef.current = createEmptyInput();
      p2InputRef.current = createEmptyInput();
    };

    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    window.addEventListener('blur', onBlur);
    return () => {
      if (switchHoldTimer !== null) window.clearTimeout(switchHoldTimer);
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [attractMode, mode]);

  // Isolated Three.js WebGL scene lifecycle
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareWebGL();
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const onContextLost = (e: Event) => {
      e.preventDefault();
      setContextLost(true);
    };
    const onContextRestored = () => {
      setContextLost(false);
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', onContextRestored);

    const scene = new THREE.Scene();

    // Mandatory studio environment map for crisp brass & material reflections
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envRT.texture;
    pmrem.dispose();

    const camera = new THREE.PerspectiveCamera(44, width / height, 0.2, 125);
    camera.position.set(0, 5.3, 15.2);
    camera.lookAt(0, 1.15, 0);

    const maxAniso = renderer.capabilities.getMaxAnisotropy();

    const isStreetBrawl = !attractMode && isStreetBrawlMode(mode);
    const p1Rig = createFighterRig(p1Profile, '#F59E0B', maxAniso);
    const p2Rig = createFighterRig(p2Profile, isStreetBrawl ? '#38BDF8' : '#DC2626', maxAniso);
    scene.add(p1Rig.root);
    scene.add(p2Rig.root);

    let stageDispose: () => void;
    let stageTick: ((elapsed: number, dt: number) => void) | null = null;
    let engine: AkharaCombatEngine | StreetBrawlEngine;

    if (isStreetBrawl) {
      const streetStage = buildStreetStage(scene, getStageById(stageId), isSoftwareGl);
      stageDispose = streetStage.dispose;
      engine = new StreetBrawlEngine(
        scene,
        camera,
        streetStage,
        p1Profile,
        p2Profile,
        p1Rig,
        p2Rig,
        difficulty,
        (winnerSide) => onMatchFinishRef.current?.(winnerSide),
        mode === 'endless_mohalla'
      );
    } else {
      const villageStage = buildVillageStage(scene, stageId, maxAniso);
      stageDispose = villageStage.dispose;
      stageTick = villageStage.update;
      engine = new AkharaCombatEngine(
        scene,
        p1Profile,
        p2Profile,
        p1Rig,
        p2Rig,
        mode,
        difficulty,
        attractMode
      );
    }

    engine.paused = pausedRef.current;
    engineRef.current = engine;

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    onHudUpdateRef.current(engine.getHudSnapshot());

    const clock = new THREE.Clock();
    let frameId = 0;
    let disposed = false;
    let hudAccum = 0;
    let matchFinishReported = false;

    const afterDraw = (cb: () => void) => {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync?.(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) {
          if (sync) gl.deleteSync(sync);
          return;
        }
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    };

    const tick = () => {
      if (disposed) return;
      const dt = Math.min(clock.getDelta(), 0.05);
      const elapsed = clock.elapsedTime;

      if (engine instanceof StreetBrawlEngine) {
        engine.step(dt, p1InputRef.current, p2InputRef.current);
      } else {
        engine.update(dt, p1InputRef.current, p2InputRef.current, camera);
        stageTick?.(elapsed, dt);
      }
      renderer.render(scene, camera);

      // Push HUD snapshots cleanly at ~20Hz so React never thrashes the WebGL loop
      hudAccum += dt;
      if (hudAccum >= 0.05) {
        hudAccum = 0;
        const snap = engine.getHudSnapshot();
        onHudUpdateRef.current(snap);
        if (
          !(engine instanceof StreetBrawlEngine) &&
          snap.phase === 'MATCH_OVER' &&
          snap.stats.winnerSide &&
          !matchFinishReported
        ) {
          matchFinishReported = true;
          onMatchFinishRef.current?.(snap.stats.winnerSide);
        }
        if (snap.phase !== 'MATCH_OVER') {
          matchFinishReported = false;
        }
      }

      if (isSoftwareGl) afterDraw(tick);
      else frameId = requestAnimationFrame(tick);
    };

    tick();

    const handleResize = () => {
      if (!container || disposed) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', onContextRestored);
      engine.dispose();
      p1Rig.dispose();
      p2Rig.dispose();
      stageDispose();
      envRT.dispose();
      renderer.dispose();
      engineRef.current = null;
    };
  }, [p1Profile, p2Profile, stageId, mode, difficulty, attractMode]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#141210]">
      <div ref={mountRef} className="h-full w-full" />
      {contextLost && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#141210]/95 p-6 text-center">
          <div className="max-w-sm border border-[#F59E0B]/30 bg-[#221E1A] p-6">
            <h2 className="font-display text-3xl text-[#F59E0B]">Graphics Context Paused</h2>
            <p className="mt-2 text-sm text-[#B6AA9A]">
              Your browser temporarily paused 3D rendering. Click reload to resume the arena.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 bg-[#F59E0B] px-5 py-2.5 text-sm font-semibold text-[#141210] whitespace-nowrap"
            >
              Reload Arena
            </button>
          </div>
        </div>
      )}
    </div>
  );
});
