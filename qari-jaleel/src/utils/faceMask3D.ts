import * as THREE from 'three';
import { FACE_MESH_INDICES } from './FaceTo3DHead';

// MediaPipe face-oval landmark loop (used to feather the photo edge into the head skin)
const FACE_OVAL = [
  10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148,
  176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109,
];

export interface FaceMask3D {
  geometry: THREE.BufferGeometry;
  texture: THREE.CanvasTexture;
}

/**
 * Builds a 3D relief face from saved landmarks: the flat photo is wrapped over the front of the head
 * ellipsoid (radii rx, ry, rz) and each point is pushed in or out by its measured depth, so the nose,
 * brow and cheeks have real shape. The photo edge fades out so it blends into the head.
 */
export function buildFaceMask3D(
  img: HTMLImageElement,
  lm: number[][],
  rx: number,
  ry: number,
  rz: number,
  texSize: number
): FaceMask3D {
  const oval = FACE_OVAL.map((i) => lm[i]);
  const xs = oval.map((p) => p[0]);
  const ys = oval.map((p) => p[1]);
  const xMin = Math.min(...xs), xMax = Math.max(...xs);
  const yMin = Math.min(...ys), yMax = Math.max(...ys);
  const cx = (xMin + xMax) / 2, cy = (yMin + yMax) / 2;
  const halfW = ((xMax - xMin) / 2) * 1.04;
  const halfH = ((yMax - yMin) / 2) * 1.04;

  const yawMax = 1.0;
  const pitchMax = 0.82;
  const widthOnHead = 2 * rx * Math.sin(yawMax);
  const depthScale = widthOnHead / (xMax - xMin); // same scale as x so relief is proportionate

  const zs = lm.slice(0, 468).map((p) => p[2]).sort((a, b) => a - b);
  const zMedian = zs[Math.floor(zs.length / 2)];

  const positions: number[] = [];
  const uvs: number[] = [];
  const n = Math.min(468, lm.length);
  for (let i = 0; i < n; i++) {
    const [x, y, z] = lm[i];
    const yaw = THREE.MathUtils.clamp((x - cx) / halfW, -1.25, 1.25) * yawMax;
    const pitch = THREE.MathUtils.clamp(-(y - cy) / halfH, -1.25, 1.25) * pitchMax;
    const cp = Math.cos(pitch);
    const px = rx * Math.sin(yaw) * cp;
    const py = ry * Math.sin(pitch);
    const pz = rz * Math.cos(yaw) * cp;
    const nx = px / (rx * rx), ny = py / (ry * ry), nz = pz / (rz * rz);
    const nl = Math.hypot(nx, ny, nz) || 1;
    const relief = THREE.MathUtils.clamp((zMedian - z) * depthScale, -0.05, 0.07) + 0.004;
    positions.push(px + (nx / nl) * relief, py + (ny / nl) * relief, pz + (nz / nl) * relief);
    uvs.push(x, 1 - y);
  }

  const idx = FACE_MESH_INDICES.filter((v) => v < n);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(idx);
  geometry.computeVertexNormals();

  // Photo with a feathered oval edge
  const c = document.createElement('canvas');
  c.width = c.height = texSize;
  const g = c.getContext('2d')!;
  g.drawImage(img, 0, 0, texSize, texSize);
  const mask = document.createElement('canvas');
  mask.width = mask.height = texSize;
  const m = mask.getContext('2d')!;
  const ocx = (oval.reduce((s, p) => s + p[0], 0) / oval.length) * texSize;
  const ocy = (oval.reduce((s, p) => s + p[1], 0) / oval.length) * texSize;
  const steps = 10;
  for (let k = 0; k < steps; k++) {
    const sc = 1.02 - k * 0.022;
    m.globalAlpha = 1 / steps + 0.02;
    m.beginPath();
    oval.forEach((p, i) => {
      const X = ocx + (p[0] * texSize - ocx) * sc;
      const Y = ocy + (p[1] * texSize - ocy) * sc;
      if (i === 0) m.moveTo(X, Y); else m.lineTo(X, Y);
    });
    m.closePath();
    m.fillStyle = '#fff';
    m.fill();
  }
  g.globalCompositeOperation = 'destination-in';
  g.drawImage(mask, 0, 0);

  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  return { geometry, texture };
}
