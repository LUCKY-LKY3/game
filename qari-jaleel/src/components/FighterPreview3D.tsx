import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { FighterProfile } from '../types/game';
import { resolveFighterStyle } from '../data/roster';
import { applyFighterPose, createFighterRig, getCharacterBodySpec } from '../engine/fighterRig';

interface FighterPreview3DProps {
  profile: FighterProfile;
  cameraModeRequest?: { mode: 'face' | 'body'; seq: number };
}

/**
 * Live interactive 3D fighter turntable preview inside the Fighter Studio.
 * Supports drag-to-rotate inspection and a smooth Face Close-Up / Full Body camera toggle
 * so players can examine the 3D-sculpted face, hair, beard, and portrait projection up close.
 */
export function FighterPreview3D({ profile, cameraModeRequest }: FighterPreview3DProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [cameraMode, setCameraMode] = useState<'face' | 'body'>('face');
  const cameraModeRef = useRef<'face' | 'body'>('face');
  const manualYawRef = useRef<number | null>(null);
  const dragRef = useRef<{ active: boolean; startX: number; baseYaw: number }>({
    active: false,
    startX: 0,
    baseYaw: 0,
  });

  useEffect(() => {
    cameraModeRef.current = cameraMode;
  }, [cameraMode]);

  useEffect(() => {
    if (cameraModeRequest) {
      setCameraMode(cameraModeRequest.mode);
    }
  }, [cameraModeRequest]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const width = el.clientWidth || 320;
    const height = el.clientHeight || 360;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    el.innerHTML = '';
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envRT.texture;
    pmrem.dispose();

    const camera = new THREE.PerspectiveCamera(32, width / height, 0.1, 30);
    const camPos = new THREE.Vector3(0, 1.92, 1.48);
    const camLook = new THREE.Vector3(0, 1.88, 0);
    camera.position.copy(camPos);
    camera.lookAt(camLook);

    // Warm village akhara 3-point + soft frontal face-fill lighting
    scene.add(new THREE.HemisphereLight(0xffe6cc, 0x3b2214, 1.05));
    const key = new THREE.DirectionalLight(0xffd296, 1.85);
    key.position.set(2.4, 4.2, 3.4);
    scene.add(key);
    const frontFill = new THREE.DirectionalLight(0xfff4e6, 0.65);
    frontFill.position.set(-0.6, 2.0, 4.5);
    scene.add(frontFill);
    const rim = new THREE.DirectionalLight(0xffbe76, 1.55);
    rim.position.set(-2.4, 2.7, -3.1);
    scene.add(rim);

    // Earthen pedestal disc
    const baseGeo = new THREE.CylinderGeometry(0.95, 1.08, 0.14, 32);
    const baseMat = new THREE.MeshStandardMaterial({
      color: '#6E371F',
      roughness: 0.88,
      metalness: 0.06,
    });
    const pedestal = new THREE.Mesh(baseGeo, baseMat);
    pedestal.position.y = -0.07;
    scene.add(pedestal);

    const rig = createFighterRig(profile, '#F59E0B', renderer.capabilities.getMaxAnisotropy());
    scene.add(rig.root);

    const clock = new THREE.Clock();
    let frameId = 0;
    let disposed = false;
    let currentYaw = 0;

    const tick = () => {
      if (disposed) return;
      const dt = Math.min(0.05, clock.getDelta());
      const t = clock.getElapsedTime();
      applyFighterPose(rig, 'idle', 0, t, 1, 0, 0, false, resolveFighterStyle(profile));

      // Keep head facing forward in preview so the user gets a clean look at the 3D sculpted face
      rig.torso.rotation.y *= 0.25;
      rig.headGroup.rotation.y = 0;

      const targetYaw =
        manualYawRef.current !== null ? manualYawRef.current : Math.sin(t * 0.75) * 0.58;
      currentYaw = THREE.MathUtils.damp(currentYaw, targetYaw, 8, dt);
      rig.root.rotation.y = currentYaw;

      // Smoothly damp camera between Face Close-Up and Full Body inspection
      const bodySpec = getCharacterBodySpec(profile);
      const headY = 1.9 * bodySpec.heightScale;
      const desiredPosY = cameraModeRef.current === 'face' ? headY + 0.03 : 1.44;
      const desiredPosZ = cameraModeRef.current === 'face' ? 1.38 : 3.55;
      const desiredLookY = cameraModeRef.current === 'face' ? headY : 1.05 * bodySpec.heightScale;

      camPos.y = THREE.MathUtils.damp(camPos.y, desiredPosY, 7, dt);
      camPos.z = THREE.MathUtils.damp(camPos.z, desiredPosZ, 7, dt);
      camLook.y = THREE.MathUtils.damp(camLook.y, desiredLookY, 7, dt);

      camera.position.copy(camPos);
      camera.lookAt(camLook);

      renderer.render(scene, camera);
      frameId = requestAnimationFrame(tick);
    };
    tick();

    const onResize = () => {
      if (!el || disposed) return;
      const w = el.clientWidth || 320;
      const h = el.clientHeight || 360;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', onResize);
      rig.dispose();
      baseGeo.dispose();
      baseMat.dispose();
      envRT.dispose();
      renderer.dispose();
    };
  }, [profile]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      active: true,
      startX: e.clientX,
      baseYaw: manualYawRef.current ?? 0,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return;
    const dx = e.clientX - dragRef.current.startX;
    manualYawRef.current = dragRef.current.baseYaw + dx * 0.012;
  };

  const handlePointerUp = () => {
    dragRef.current.active = false;
  };

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className="relative h-full w-full cursor-grab overflow-hidden bg-gradient-to-b from-[#2A2018] via-[#1C1714] to-[#141210] active:cursor-grabbing select-none"
      style={{ touchAction: 'none' }}
    >
      <div ref={containerRef} className="h-full w-full" />

      {/* Camera View Switcher (Face Close-Up vs Full Body) */}
      <div
        className="absolute right-3 top-3 flex items-center gap-1 rounded-lg bg-[#141210]/85 p-1 border border-[#F8F4EC]/15"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => setCameraMode('face')}
          className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
            cameraMode === 'face'
              ? 'bg-[#F59E0B] text-[#141210]'
              : 'text-[#B6AA9A] hover:text-[#F8F4EC]'
          }`}
        >
          3D Face Close-Up
        </button>
        <button
          type="button"
          onClick={() => setCameraMode('body')}
          className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
            cameraMode === 'body'
              ? 'bg-[#F59E0B] text-[#141210]'
              : 'text-[#B6AA9A] hover:text-[#F8F4EC]'
          }`}
        >
          Full Body
        </button>
      </div>

      <div className="pointer-events-none absolute bottom-3 left-3 text-xs text-[#B6AA9A]">
        Live 3D Sculpted Model · Drag to rotate
      </div>
    </div>
  );
}
