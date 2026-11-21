import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createStarterRoster, resolveFighterStyle } from '../data/roster';
import { applyFighterPose, createFighterRig, getCharacterBodySpec } from '../engine/fighterRig';

/**
 * Developer-only head inspection sheet (open the game with ?headlab).
 * Shows every starter fighter's head close up from the front and from three-quarter angles.
 */
export function HeadLab() {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = ref.current!;
    const W = 1500, H = 760;
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
    const key = new THREE.DirectionalLight(0xffd296, 1.8); key.position.set(2.4, 4.2, 3.4); scene.add(key);
    const fill = new THREE.DirectionalLight(0xfff4e6, 0.7); fill.position.set(-0.6, 2.0, 4.5); scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffbe76, 1.4); rim.position.set(-2.4, 2.7, -3.1); scene.add(rim);

    const bodyView = new URLSearchParams(window.location.search).has('body');
    const onlyRaw = new URLSearchParams(window.location.search).get('only');
    const all = createStarterRoster().slice(0, 6);
    const roster = onlyRaw ? onlyRaw.split(',').map((i) => all[+i]) : all;
    const rigs = roster.map((p) => {
      const rig = createFighterRig(p, '#F59E0B', 8);
      scene.add(rig.root);
      return { p, rig };
    });
    const cols = rigs.length, rows = 2, cw = W / cols, ch = H / rows;
    const yaws = [0, 0.7];
    const camera = new THREE.PerspectiveCamera(24, cw / ch, 0.05, 20);
    let raf = 0;
    const draw = () => {
      renderer.clear();
      rigs.forEach(({ p, rig }, c) => {
        applyFighterPose(rig, 'idle', 0, 0, 1, 0, 0, false, resolveFighterStyle(p));
        rig.torso.rotation.y = 0; rig.headGroup.rotation.set(0, 0, 0);
        const headY = 1.9 * getCharacterBodySpec(p).heightScale;
        rigs.forEach(({ rig: o }) => (o.root.visible = o === rig));
        for (let r = 0; r < rows; r++) {
          rig.root.rotation.y = yaws[r];
          if (bodyView) {
            const hs = getCharacterBodySpec(p).heightScale;
            camera.position.set(0, 1.05 * hs, 4.4 * hs);
            camera.lookAt(0, 0.98 * hs, 0);
          } else {
            camera.position.set(0, headY - 0.01, 1.35);
            camera.lookAt(0, headY - 0.01, 0);
          }
          const x = c * cw, y = H - (r + 1) * ch;
          renderer.setViewport(x, y, cw, ch);
          renderer.setScissor(x, y, cw, ch);
          renderer.render(scene, camera);
        }
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    const t = setTimeout(() => ((window as unknown as { HEADLAB_READY: boolean }).HEADLAB_READY = true), 3500);
    return () => { cancelAnimationFrame(raf); clearTimeout(t); renderer.dispose(); el.innerHTML = ''; };
  }, []);
  return <div ref={ref} style={{ background: '#000', minHeight: '100vh' }} />;
}
