// Procedural props and textures used by the street brawl engine.
import * as THREE from 'three';
import { HeroWeaponMeshes } from './types';

export function buildHeroWeaponProps(): HeroWeaponMeshes {
  const geos: THREE.BufferGeometry[] = [];
  const mats: THREE.Material[] = [];

  const woodMat = new THREE.MeshStandardMaterial({ color: '#A16227', roughness: 0.56, metalness: 0.1 });
  const brassMat = new THREE.MeshStandardMaterial({ color: '#F59E0B', roughness: 0.25, metalness: 0.88 });
  const steelMat = new THREE.MeshStandardMaterial({ color: '#CBD5E1', roughness: 0.28, metalness: 0.82 });
  const seatMat = new THREE.MeshStandardMaterial({ color: '#1D4ED8', roughness: 0.52, metalness: 0.18 });
  const stoolMat = new THREE.MeshStandardMaterial({ color: '#EF4444', roughness: 0.42, metalness: 0.08 });
  const cocoMat = new THREE.MeshStandardMaterial({ color: '#4D7C0F', roughness: 0.72, metalness: 0.04 });
  mats.push(woodMat, brassMat, steelMat, seatMat, stoolMat, cocoMat);

  // Lathi stick
  const lathi = new THREE.Group();
  lathi.position.set(0, -0.34, 0.04);
  lathi.rotation.set(Math.PI * 0.45, 0, 0);
  const stickGeo = new THREE.CylinderGeometry(0.032, 0.036, 1.32, 10);
  const bandGeo = new THREE.CylinderGeometry(0.039, 0.039, 0.06, 10);
  geos.push(stickGeo, bandGeo);
  const stick = new THREE.Mesh(stickGeo, woodMat);
  stick.position.y = 0.48;
  stick.castShadow = true;
  lathi.add(stick);
  [0.12, 0.55, 0.95].forEach((yy) => {
    const b = new THREE.Mesh(bandGeo, brassMat);
    b.position.y = yy;
    lathi.add(b);
  });
  lathi.visible = false;

  // Folding steel chair
  const chair = new THREE.Group();
  chair.position.set(0.04, -0.34, 0.1);
  chair.rotation.set(Math.PI * 0.42, 0.2, 0);
  const frameGeo = new THREE.BoxGeometry(0.56, 0.72, 0.08);
  const seatGeo = new THREE.BoxGeometry(0.46, 0.38, 0.1);
  geos.push(frameGeo, seatGeo);
  const frame = new THREE.Mesh(frameGeo, steelMat);
  frame.position.y = 0.34;
  frame.castShadow = true;
  const seat = new THREE.Mesh(seatGeo, seatMat);
  seat.position.y = 0.3;
  chair.add(frame, seat);
  chair.visible = false;

  // Throwable plastic village stool
  const stool = new THREE.Group();
  stool.position.set(0, -0.34, 0.16);
  const sTopGeo = new THREE.BoxGeometry(0.42, 0.08, 0.42);
  const sLegGeo = new THREE.CylinderGeometry(0.03, 0.022, 0.38, 6);
  geos.push(sTopGeo, sLegGeo);
  stool.add(new THREE.Mesh(sTopGeo, stoolMat));
  [
    [-0.14, -0.14],
    [0.14, -0.14],
    [-0.14, 0.14],
    [0.14, 0.14],
  ].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(sLegGeo, stoolMat);
    leg.position.set(lx, -0.2, lz);
    stool.add(leg);
  });
  stool.visible = false;

  // Throwable giant green coconut
  const coconut = new THREE.Group();
  coconut.position.set(0, -0.34, 0.12);
  const cGeo = new THREE.SphereGeometry(0.22, 10, 8);
  geos.push(cGeo);
  const nut = new THREE.Mesh(cGeo, cocoMat);
  nut.scale.set(0.95, 1.15, 0.95);
  coconut.add(nut);
  coconut.visible = false;

  return {
    lathi,
    chair,
    stool,
    coconut,
    dispose: () => {
      geos.forEach((g) => g.dispose());
      mats.forEach((m) => m.dispose());
    },
  };
}

/** Procedural sharp arcade overhead badge texture (`P1 · YOU`, `AI`, `REVIVE!`) with crisp contrast */
export function createOverheadBadgeTexture(
  label: string,
  bgHex: string,
  borderHex: string,
  textHex: string
): THREE.CanvasTexture {
  const w = 256;
  const h = 96;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, w, h);

  // Crisp rectangular arcade plate with strong drop shadow
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.78)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = bgHex;
  ctx.fillRect(18, 12, w - 36, h - 28);
  ctx.restore();

  // Sharp double rim border
  ctx.strokeStyle = borderHex;
  ctx.lineWidth = 6;
  ctx.strokeRect(18, 12, w - 36, h - 28);

  // Bold arcade typography
  ctx.fillStyle = textHex;
  ctx.font = '900 40px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, w / 2, (h - 4) / 2);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}
