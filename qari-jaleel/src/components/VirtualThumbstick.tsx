import { useEffect, useRef, useState } from 'react';

export interface ThumbstickDirections {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
}

interface VirtualThumbstickProps {
  onChange: (dirs: ThumbstickDirections) => void;
  onDash?: (dir: -1 | 1) => void;
}

const OUTER_SIZE = 136;
const KNOB_SIZE = 54;
const MAX_TRAVEL = (OUTER_SIZE - KNOB_SIZE) / 2; // 41px radial travel
const DEADZONE = 0.2;

function vibrateTap(ms: number) {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate(ms);
    } catch {
      // ignore unsupported vibration
    }
  }
}

/**
 * Floating Dynamic Virtual Joystick in the bottom-left quadrant.
 * Spawns centered wherever your left thumb touches, shows a crisp outer deadzone ring,
 * and triggers a forward Sprint Dash when flicked swiftly Left/Right or double-tapped.
 */
export function VirtualThumbstick({ onChange, onDash }: VirtualThumbstickProps) {
  const zoneRef = useRef<HTMLDivElement | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const originRef = useRef<{ x: number; y: number }>({ x: 76, y: 120 });
  const touchDownTimeRef = useRef<number>(0);
  const dashFiredThisTouchRef = useRef<boolean>(false);
  const lastDirTapRef = useRef<{ dir: -1 | 1 | 0; time: number }>({ dir: 0, time: 0 });
  const onChangeRef = useRef(onChange);
  const onDashRef = useRef(onDash);
  onChangeRef.current = onChange;
  onDashRef.current = onDash;

  const [engaged, setEngaged] = useState(false);
  const [basePos, setBasePos] = useState<{ x: number; y: number }>({ x: 74, y: 118 });
  const [knobPos, setKnobPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dashFlash, setDashFlash] = useState<-1 | 0 | 1>(0);
  const [activeDirs, setActiveDirs] = useState<ThumbstickDirections>({
    left: false,
    right: false,
    up: false,
    down: false,
  });

  const resetStick = () => {
    pointerIdRef.current = null;
    dashFiredThisTouchRef.current = false;
    setEngaged(false);
    setKnobPos({ x: 0, y: 0 });
    setDashFlash(0);
    const neutral = { left: false, right: false, up: false, down: false };
    setActiveDirs(neutral);
    onChangeRef.current(neutral);
  };

  useEffect(() => {
    return () => {
      onChangeRef.current({ left: false, right: false, up: false, down: false });
    };
  }, []);

  const triggerDash = (dir: -1 | 1) => {
    dashFiredThisTouchRef.current = true;
    setDashFlash(dir);
    vibrateTap(25);
    onDashRef.current?.(dir);
  };

  const updateFromClientPoint = (clientX: number, clientY: number) => {
    const zone = zoneRef.current;
    if (!zone) return;
    const rect = zone.getBoundingClientRect();
    const localX = clientX - rect.left;
    const localY = clientY - rect.top;

    let dx = localX - originRef.current.x;
    let dy = localY - originRef.current.y;
    const dist = Math.hypot(dx, dy);

    if (dist > MAX_TRAVEL && dist > 0) {
      dx = (dx / dist) * MAX_TRAVEL;
      dy = (dy / dist) * MAX_TRAVEL;
    }

    setKnobPos({ x: dx, y: dy });

    const nx = dx / MAX_TRAVEL; // -1..1
    const ny = dy / MAX_TRAVEL; // -1..1
    const mag = Math.hypot(nx, ny);

    // Quick flick past 82% horizontal within 175ms triggers Sprint Dash!
    const elapsedSinceDown = performance.now() - touchDownTimeRef.current;
    if (
      !dashFiredThisTouchRef.current &&
      elapsedSinceDown <= 185 &&
      Math.abs(nx) >= 0.84 &&
      Math.abs(ny) < 0.55
    ) {
      triggerDash(nx > 0 ? 1 : -1);
    }

    let dirs: ThumbstickDirections;
    if (mag < DEADZONE) {
      dirs = { left: false, right: false, up: false, down: false };
    } else {
      dirs = {
        left: nx < -0.26,
        right: nx > 0.26,
        up: ny < -0.34,
        down: ny > 0.34,
      };
    }

    // Detect double-tap horizontal direction on quick re-touches
    if (!dashFiredThisTouchRef.current && (dirs.left || dirs.right) && Math.abs(ny) < 0.45) {
      const curDir: -1 | 1 = dirs.right ? 1 : -1;
      const now = performance.now();
      if (lastDirTapRef.current.dir === curDir && now - lastDirTapRef.current.time < 280) {
        triggerDash(curDir);
        lastDirTapRef.current = { dir: 0, time: 0 };
      }
    }

    setActiveDirs((prev) =>
      prev.left === dirs.left &&
      prev.right === dirs.right &&
      prev.up === dirs.up &&
      prev.down === dirs.down
        ? prev
        : dirs
    );
    onChangeRef.current(dirs);
  };

  return (
    <div
      ref={zoneRef}
      role="application"
      aria-label="Floating dynamic movement joystick"
      onPointerDown={(e) => {
        if (pointerIdRef.current !== null) return;
        e.preventDefault();
        const zone = zoneRef.current;
        if (!zone) return;
        const rect = zone.getBoundingClientRect();
        // Clamp spawned base cleanly inside the touch quadrant so it never clips off-screen
        const half = OUTER_SIZE / 2;
        const cx = Math.max(half, Math.min(rect.width - half, e.clientX - rect.left));
        const cy = Math.max(half, Math.min(rect.height - half, e.clientY - rect.top));

        pointerIdRef.current = e.pointerId;
        originRef.current = { x: cx, y: cy };
        touchDownTimeRef.current = performance.now();
        dashFiredThisTouchRef.current = false;
        (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);

        setBasePos({ x: cx, y: cy });
        setKnobPos({ x: 0, y: 0 });
        setDashFlash(0);
        setEngaged(true);
      }}
      onPointerMove={(e) => {
        if (pointerIdRef.current !== e.pointerId) return;
        e.preventDefault();
        updateFromClientPoint(e.clientX, e.clientY);
      }}
      onPointerUp={(e) => {
        if (pointerIdRef.current !== e.pointerId) return;
        e.preventDefault();
        if (activeDirs.left || activeDirs.right) {
          lastDirTapRef.current = {
            dir: activeDirs.right ? 1 : -1,
            time: performance.now(),
          };
        }
        resetStick();
      }}
      onPointerCancel={(e) => {
        if (pointerIdRef.current !== e.pointerId) return;
        resetStick();
      }}
      onLostPointerCapture={() => {
        if (pointerIdRef.current !== null) {
          resetStick();
        }
      }}
      className="touch-control relative h-[188px] w-[44vw] max-w-[250px] min-w-[168px] select-none sm:h-[208px]"
    >
      {/* Dynamic Joystick Ring — rests quietly in lower-left until touched, then spawns under thumb */}
      <div
        className={`pointer-events-none absolute flex items-center justify-center rounded-full border-2 transition-opacity ${
          engaged
            ? dashFlash !== 0
              ? 'border-[#FDE047] bg-[#141210]/86 opacity-100 shadow-[0_0_20px_rgba(250,204,21,0.45)]'
              : 'border-[#F59E0B] bg-[#141210]/82 opacity-100 shadow-[0_0_16px_rgba(245,158,11,0.3)]'
            : 'border-[#F8F4EC]/25 bg-[#141210]/52 opacity-75'
        }`}
        style={{
          width: OUTER_SIZE,
          height: OUTER_SIZE,
          left: basePos.x - OUTER_SIZE / 2,
          top: basePos.y - OUTER_SIZE / 2,
        }}
      >
        {/* Clear outer deadzone boundary ring */}
        <div
          className={`pointer-events-none absolute rounded-full border border-dashed ${
            engaged ? 'border-[#F59E0B]/45' : 'border-[#F8F4EC]/18'
          }`}
          style={{ width: OUTER_SIZE * 0.42, height: OUTER_SIZE * 0.42 }}
        />

        {/* Directional Dash Indicator Badges */}
        {dashFlash === -1 && (
          <div className="pointer-events-none absolute -left-8 font-display text-sm font-black tracking-wider text-[#FDE047] drop-shadow">
            ««
          </div>
        )}
        {dashFlash === 1 && (
          <div className="pointer-events-none absolute -right-8 font-display text-sm font-black tracking-wider text-[#FDE047] drop-shadow">
            »»
          </div>
        )}

        {/* Cardinal directional ticks */}
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute top-2 text-[9px] font-bold transition-colors ${
            activeDirs.up ? 'text-[#F59E0B]' : 'text-[#B6AA9A]/55'
          }`}
        >
          ▲
        </span>
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute bottom-2 text-[9px] font-bold transition-colors ${
            activeDirs.down ? 'text-[#F59E0B]' : 'text-[#B6AA9A]/55'
          }`}
        >
          ▼
        </span>
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute left-2 text-[9px] font-bold transition-colors ${
            activeDirs.left ? 'text-[#F59E0B]' : 'text-[#B6AA9A]/55'
          }`}
        >
          ◀
        </span>
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute right-2 text-[9px] font-bold transition-colors ${
            activeDirs.right ? 'text-[#F59E0B]' : 'text-[#B6AA9A]/55'
          }`}
        >
          ▶
        </span>

        {/* Floating Tactile Thumb Puck */}
        <div
          className={`pointer-events-none flex items-center justify-center rounded-full border-2 shadow-md ${
            engaged
              ? dashFlash !== 0
                ? 'border-[#FEF08A] bg-[#FACC15] text-[#141210]'
                : 'border-[#FDE68A] bg-[#F59E0B] text-[#141210]'
              : 'border-[#F59E0B]/70 bg-[#2A221A]/90 text-[#F59E0B]'
          }`}
          style={{
            width: KNOB_SIZE,
            height: KNOB_SIZE,
            transform: `translate3d(${knobPos.x}px, ${knobPos.y}px, 0)`,
            transition: engaged ? 'none' : 'transform 130ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <div
            className={`h-3.5 w-3.5 rounded-full ${
              engaged ? 'bg-[#141210]/40' : 'bg-[#F59E0B]/60'
            }`}
          />
        </div>
      </div>

      {/* Subtle resting hint */}
      {!engaged && (
        <div className="pointer-events-none absolute bottom-1 left-2 text-[9px] font-bold tracking-[0.14em] text-[#B6AA9A]/80 uppercase">
          Drag Move · Flick Dash
        </div>
      )}
    </div>
  );
}
