import * as THREE from 'three';
import { createVillageThugRig, VILLAGE_COUSIN_ROSTER } from '../engine/villageThugs';

/** Renders still pictures of cousins from their 3D rigs (used for the comic intro). Resolves [] if WebGL fails. */
export function renderCousinSnapshots(keys: string[], w = 260, h = 340): string[] {
  try {
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(1);
    renderer.setSize(w, h, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight('#FFF4DC', '#6B4A2B', 1.5));
    const sun = new THREE.DirectionalLight('#FFFFFF', 2.2);
    sun.position.set(2.5, 4, 4);
    scene.add(sun);
    const camera = new THREE.PerspectiveCamera(30, w / h, 0.1, 50);
    camera.position.set(0, 1.25, 5.2);
    camera.lookAt(0, 1.0, 0);
    const out: string[] = [];
    keys.forEach((key, i) => {
      const base = VILLAGE_COUSIN_ROSTER[key];
      if (!base) return;
      const rig = createVillageThugRig({ ...base, id: `${key}_intro` });
      rig.root.rotation.y = i % 2 === 0 ? -0.45 : 0.45;
      // menacing "come at me" arms
      rig.rightShoulder.rotation.x = -1.1;
      rig.rightElbow.rotation.x = -1.2;
      rig.leftShoulder.rotation.x = -0.6;
      rig.leftElbow.rotation.x = -1.4;
      scene.add(rig.root);
      renderer.render(scene, camera);
      out.push(renderer.domElement.toDataURL('image/png'));
      scene.remove(rig.root);
      rig.dispose();
    });
    renderer.dispose();
    renderer.forceContextLoss();
    return out;
  } catch {
    return [];
  }
}
