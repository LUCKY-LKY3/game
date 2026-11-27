import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { applyFighterPose, createFighterRig } from '../engine/fighterRig';
import { buildStreetStage } from '../engine/streetStage';
import { createStarterRoster, resolveFighterStyle, STAGE_CONFIGS } from '../data/roster';

/**
 * Developer-only trailer shot (open the game with ?lineup): the six brothers walk down the
 * village street side by side, toward the camera. Time comes from performance.now(), so a
 * frame-stepping capture can drive it.
 */
export function LineupLab() {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = ref.current!;
    const W = window.innerWidth;
    const H = window.innerHeight;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(1);
    renderer.shadowMap.enabled = true;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const stage = buildStreetStage(scene, STAGE_CONFIGS[0], false);

    // order across the lane, left to right as seen by the camera
    const roster = createStarterRoster().slice(0, 6);
    const order = [5, 3, 0, 2, 1, 4]; // Immy, Jam, Fady, Jav, Saf, Chet
    const rigs = order.map((i, k) => {
      const p = roster[i];
      const rig = createFighterRig(p, '#F59E0B', 8);
      scene.add(rig.root);
      rig.rageRing.visible = false;
      return { p, rig, z: 1.7 - k * 0.68, lag: (k % 2) * 0.35 };
    });

    const camera = new THREE.PerspectiveCamera(38, W / H, 0.1, 200);
    // warm key light from the camera side so the faces read
    const front = new THREE.DirectionalLight(0xffe2c0, 1.6);
    scene.add(front);
    scene.add(front.target);
    const startX = 6;
    const speed = 1.25;
    let raf = 0;
    let last = performance.now() / 1000;
    const draw = () => {
      const t = performance.now() / 1000;
      const dt = Math.min(0.05, Math.max(0.001, t - last));
      last = t;
      const leadX = startX - t * speed;
      rigs.forEach(({ p, rig, z, lag }) => {
        const x = leadX + lag;
        rig.root.position.set(x, 0, z);
        applyFighterPose(rig, 'walk_fwd', 0, t + lag, -1, 0, 0, false, resolveFighterStyle(p), -speed, -Math.PI / 2);
      });
      // camera backs away slowly as they come closer
      const camX = leadX - 5.6 - t * 0.35;
      camera.position.set(camX, 1.4, 2.0);
      camera.lookAt(leadX + 3, 1.15, -1.0);
      front.position.set(camX - 2, 4, 4);
      front.target.position.set(leadX, 1, 0);
      stage.update(t, dt, leadX);
      renderer.render(scene, camera);
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      cancelAnimationFrame(raf);
      renderer.dispose();
    };
  }, []);
  return <div ref={ref} style={{ position: 'fixed', inset: 0, background: '#000' }} />;
}
