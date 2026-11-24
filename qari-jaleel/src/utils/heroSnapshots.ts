import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { FighterProfile } from '../types/game';
import { resolveFighterStyle } from '../data/roster';
import { applyFighterPose, createFighterRig, getCharacterBodySpec } from '../engine/fighterRig';

/** Renders full-body stills of the in-game 3D fighters (comic intro). Returns {} if WebGL fails. */
export function renderHeroSnapshots(profiles: FighterProfile[], w = 360, h = 520): Record<string, string> {
  const out: Record<string, string> = {};
  try {
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(1);
    renderer.setSize(w, h, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.setClearColor(0x000000, 0);
    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envRT.texture;
    pmrem.dispose();
    scene.add(new THREE.HemisphereLight(0xffe6cc, 0x3b2214, 1.05));
    const key = new THREE.DirectionalLight(0xffd296, 1.85);
    key.position.set(2.4, 4.2, 3.4);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xfff4e6, 0.65);
    fill.position.set(-0.6, 2.0, 4.5);
    scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffbe76, 1.4);
    rim.position.set(-2.4, 2.7, -3.1);
    scene.add(rim);
    const camera = new THREE.PerspectiveCamera(30, w / h, 0.1, 40);

    profiles.forEach((profile, i) => {
      const rig = createFighterRig(profile, '#F59E0B', renderer.capabilities.getMaxAnisotropy());
      scene.add(rig.root);
      applyFighterPose(rig, 'idle', 0, 0.4 + i, 1, 0, 0, false, resolveFighterStyle(profile));
      rig.torso.rotation.y *= 0.25;
      rig.headGroup.rotation.y = 0;
      rig.root.rotation.y = i % 2 === 0 ? -0.4 : 0.4;
      const hs = getCharacterBodySpec(profile).heightScale;
      camera.position.set(0, 1.0 * hs, 5.3 * hs);
      camera.lookAt(0, 0.98 * hs, 0);
      renderer.render(scene, camera);
      out[profile.id] = renderer.domElement.toDataURL('image/png');
      scene.remove(rig.root);
      rig.dispose?.();
    });
    envRT.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
  } catch {
    // fall back to portraits
  }
  return out;
}
