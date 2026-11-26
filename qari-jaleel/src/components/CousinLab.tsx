import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { applyThugPose, createVillageThugRig, VILLAGE_COUSIN_ROSTER } from '../engine/villageThugs';
import { applyFighterPose, createFighterRig } from '../engine/fighterRig';
import { createStarterRoster, resolveFighterStyle } from '../data/roster';

/**
 * Developer-only cousin inspection sheet (open the game with ?cousinlab).
 * Every cousin in a row (front and three-quarter), with Fady at the end for comparison.
 * Add &only=bunty,golu to pick cousins, &face for head close-ups.
 */
export function CousinLab() {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = ref.current!;
    const q = new URLSearchParams(window.location.search);
    const only = q.get('only')?.split(',');
    const keys = Object.keys(VILLAGE_COUSIN_ROSTER).filter((k) => !only || only.includes(k));
    const face = q.has('face');
    const cols = keys.length + 1;
    const W = Math.min(2400, cols * 170), H = 640;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.setSize(W, H);
    renderer.setScissorTest(true);
    renderer.shadowMap.enabled = true;
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#3a2a22');
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.add(new THREE.HemisphereLight(0xffe6cc, 0x3b2214, 1.0));
    const key = new THREE.DirectionalLight(0xffd296, 1.8);
    key.position.set(2.4, 4.2, 3.4);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xffbe76, 1.2);
    rim.position.set(-2.4, 2.7, -3.1);
    scene.add(rim);

    const rigs: { root: THREE.Object3D; pose: (t: number) => void; label: string }[] = keys.map((k) => {
      const rig = createVillageThugRig({ ...VILLAGE_COUSIN_ROSTER[k], id: `${k}_lab` });
      scene.add(rig.root);
      return { root: rig.root, label: k, pose: (t: number) => applyThugPose(rig, 'idle', 0, t, 1, 0, 0, VILLAGE_COUSIN_ROSTER[k].archetype === 'idiot', false, 0) };
    });
    const fady = createStarterRoster()[0];
    const frig = createFighterRig(fady, '#F59E0B', 4);
    scene.add(frig.root);
    rigs.push({ root: frig.root, label: 'fady', pose: (t) => applyFighterPose(frig, 'idle', 0, t, 1, 0, 0, false, resolveFighterStyle(fady)) });

    const cw = W / cols, ch = H / 2;
    const camera = new THREE.PerspectiveCamera(face ? 20 : 30, cw / ch, 0.05, 30);
    let raf = 0;
    const draw = () => {
      renderer.clear();
      rigs.forEach((r, c) => {
        r.pose(0.4);
        rigs.forEach((o) => (o.root.visible = o === r));
        for (let row = 0; row < 2; row++) {
          r.root.rotation.y = row === 0 ? 0 : 0.75;
          if (face) {
            camera.position.set(0, 1.75, 1.5);
            camera.lookAt(0, 1.65, 0);
          } else {
            camera.position.set(0, 1.15, 4.3);
            camera.lookAt(0, 1.0, 0);
          }
          renderer.setViewport(c * cw, (1 - row) * ch, cw, ch);
          renderer.setScissor(c * cw, (1 - row) * ch, cw, ch);
          renderer.render(scene, camera);
        }
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      cancelAnimationFrame(raf);
      renderer.dispose();
    };
  }, []);
  return <div ref={ref} style={{ background: '#000', minHeight: '100vh' }} />;
}
