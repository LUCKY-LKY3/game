import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { applyFighterPose, createFighterRig } from '../engine/fighterRig';
import { buildStreetStage } from '../engine/streetStage';
import { createStarterRoster, resolveFighterStyle, STAGE_CONFIGS } from '../data/roster';

/**
 * Developer-only trailer shot (open the game with ?lineup): the six brothers walk down the
 * village street side by side, toward the camera. Time comes from performance.now(), so a
 * frame-stepping capture can drive it.
 * Options: &dir=1 walks the other way along the street (longer walks fit), &start=X sets the start.
 * window.__lineup.say(slot, text) shows a speech bubble over a brother (slot 0..5 left to right),
 * say(slot, '') clears it, stop() makes them halt and stand.
 */
export function LineupLab() {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = ref.current!;
    const q = new URLSearchParams(window.location.search);
    const dir = q.get('dir') === '1' ? 1 : -1;
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
    // clear the walking lane: hide props standing in the street (pots, carts, pillars, haystacks...)
    {
      const box = new THREE.Box3();
      const c = new THREE.Vector3();
      const size = new THREE.Vector3();
      stage.group.updateMatrixWorld(true);
      for (const child of [...stage.group.children]) {
        if (!child.visible || (child as THREE.Light).isLight) continue;
        box.setFromObject(child);
        if (box.isEmpty()) continue;
        box.getCenter(c);
        box.getSize(size);
        if (size.x > 8 || size.z > 8) continue; // road, backdrop, big layers
        if (c.z > -3.2 && c.z < 3.0 && c.y < 2.5) child.visible = false;
      }
    }

    // order across the lane, left to right as seen by the camera
    const roster = createStarterRoster().slice(0, 6);
    const order = [5, 3, 0, 2, 1, 4]; // Immy, Jam, Fady, Jav, Saf, Chet
    const zSign = dir === 1 ? -1 : 1;
    const rigs = order.map((i, k) => {
      const p = roster[i];
      const rig = createFighterRig(p, '#F59E0B', 8);
      scene.add(rig.root);
      rig.rageRing.visible = false;
      return { p, rig, z: zSign * (1.7 - k * 0.68), lag: (k % 2) * 0.35 };
    });

    // speech bubbles (HTML over the canvas)
    const bubbles = rigs.map(({ p }) => {
      const b = document.createElement('div');
      b.style.cssText =
        'position:fixed;transform:translate(-50%,-100%);display:none;max-width:300px;width:max-content;background:#FFFDF8;color:#141210;border-radius:16px;padding:7px 13px;box-shadow:0 4px 14px rgba(0,0,0,.45);font:600 19px/1.2 system-ui,sans-serif;z-index:5';
      const name = (p.name.match(/'([^']+)'/) ?? [, p.name])[1];
      b.innerHTML = `<div style="font:800 11px system-ui;letter-spacing:.14em;text-transform:uppercase;color:#B45309">${name}</div><div class="t"></div><div style="position:absolute;left:50%;bottom:-6px;width:12px;height:12px;background:#FFFDF8;transform:translateX(-50%) rotate(45deg)"></div>`;
      el.appendChild(b);
      return b;
    });
    let stopped = false;
    let stopAt = 0;
    (window as unknown as { __lineup: unknown }).__lineup = {
      say: (slot: number, text: string) => {
        const b = bubbles[slot];
        if (!b) return;
        b.style.display = text ? 'block' : 'none';
        (b.querySelector('.t') as HTMLElement).textContent = text;
      },
      stop: () => {
        if (!stopped) {
          stopped = true;
          stopAt = performance.now() / 1000;
        }
      },
    };

    const camera = new THREE.PerspectiveCamera(38, W / H, 0.1, 200);
    // warm key light from the camera side so the faces read
    const front = new THREE.DirectionalLight(0xffe2c0, 1.6);
    scene.add(front);
    scene.add(front.target);
    const startX = Number(q.get('start') ?? (dir === 1 ? -9 : 6));
    const speed = 1.25;
    const head = new THREE.Vector3();
    let raf = 0;
    let last = performance.now() / 1000;
    const draw = () => {
      const t = performance.now() / 1000;
      const dt = Math.min(0.05, Math.max(0.001, t - last));
      last = t;
      const walkT = stopped ? stopAt : t;
      const leadX = startX + dir * walkT * speed;
      rigs.forEach(({ p, rig, z, lag }) => {
        const x = leadX - dir * lag;
        rig.root.position.set(x, 0, z);
        applyFighterPose(rig, stopped ? 'idle' : 'walk_fwd', 0, t + lag, dir === 1 ? 1 : -1, 0, 0, false, resolveFighterStyle(p), dir * speed, (dir * Math.PI) / 2);
      });
      // camera backs away slowly as they come closer
      const camX = leadX + dir * (5.6 + walkT * 0.05);
      camera.position.set(camX, 1.4, zSign * 2.0);
      camera.lookAt(leadX - dir * 3, 1.15, -zSign * 1.0);
      front.position.set(camX + dir * 2, 4, zSign * 4);
      front.target.position.set(leadX, 1, 0);
      stage.update(t, dt, leadX);
      renderer.render(scene, camera);
      // keep bubbles over the heads
      rigs.forEach(({ rig }, i) => {
        const b = bubbles[i];
        if (b.style.display === 'none') return;
        rig.headGroup.getWorldPosition(head);
        head.y += 0.42;
        head.project(camera);
        b.style.left = `${Math.min(88, Math.max(12, (head.x * 0.5 + 0.5) * 100))}%`;
        b.style.top = `${Math.max(14, (-head.y * 0.5 + 0.5) * 100)}%`;
      });
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
