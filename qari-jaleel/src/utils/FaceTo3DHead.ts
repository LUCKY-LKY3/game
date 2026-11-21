import * as THREE from 'three';
import {
  FaceLandmarker,
  FilesetResolver,
  NormalizedLandmark,
} from '@mediapipe/tasks-vision';
import { Fighter3DConfig } from './fighterHeads';
import precomputedLandmarks from '../data/faceLandmarks.json';

/**
 * Full MediaPipe canonical 468-landmark face triangulation (852 solid triangles, 2,556 indices)
 * extracted directly from FaceLandmarker.FACE_LANDMARKS_TESSELATION edge triples.
 */
export const FACE_MESH_INDICES: number[] = (() => {
  const edges = FaceLandmarker.FACE_LANDMARKS_TESSELATION;
  const indices: number[] = [];
  for (let i = 0; i + 2 < edges.length; i += 3) {
    const e0 = edges[i];
    const e1 = edges[i + 1];
    const e2 = edges[i + 2];
    if (e0.end === e1.start && e1.end === e2.start && e2.end === e0.start) {
      indices.push(e0.start, e1.start, e2.start);
    }
  }
  return indices;
})();

let landmarkerPromise: Promise<FaceLandmarker> | null = null;
const landmarkCache = new Map<string, NormalizedLandmark[] | null>();

async function withMutedTfliteInfo<T>(fn: () => Promise<T>): Promise<T> {
  const origError = console.error;
  console.error = (...args: unknown[]) => {
    const first = typeof args[0] === 'string' ? args[0] : '';
    if (
      first.includes('INFO: Created TensorFlow Lite XNNPACK delegate') ||
      first.includes('TensorFlow Lite XNNPACK delegate')
    ) {
      return;
    }
    origError.apply(console, args);
  };
  try {
    return await fn();
  } finally {
    console.error = origError;
  }
}

async function getFaceLandmarker(): Promise<FaceLandmarker> {
  if (landmarkerPromise) return landmarkerPromise;

  landmarkerPromise = withMutedTfliteInfo(async () => {
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
    );
    const modelAssetPath =
      'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

    try {
      return await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath,
          delegate: 'GPU',
        },
        outputFaceBlendshapes: true,
        runningMode: 'IMAGE',
        numFaces: 1,
      });
    } catch {
      // Automatic fallback to CPU delegate on software WebGL / restricted GPU environments
      return await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath,
          delegate: 'CPU',
        },
        outputFaceBlendshapes: true,
        runningMode: 'IMAGE',
        numFaces: 1,
      });
    }
  });

  try {
    return await landmarkerPromise;
  } catch (err) {
    landmarkerPromise = null;
    throw err;
  }
}

/**
 * Ensures consistent counter-clockwise front-facing winding across all 852 face triangles
 * so vertex normals face outward (+Z) uniformly with smooth PBR shading.
 */
function buildOrientedFaceIndices(landmarks: NormalizedLandmark[]): Uint16Array {
  const out = new Uint16Array(FACE_MESH_INDICES.length);
  for (let i = 0; i < FACE_MESH_INDICES.length; i += 3) {
    const ia = FACE_MESH_INDICES[i];
    const ib = FACE_MESH_INDICES[i + 1];
    const ic = FACE_MESH_INDICES[i + 2];
    const a = landmarks[ia];
    const b = landmarks[ib];
    const c = landmarks[ic];

    if (a && b && c) {
      // In 3D space: x increases right, y is negated (upward), so crossZ > 0 means CCW facing +Z
      const abx = b.x - a.x;
      const aby = -(b.y - a.y);
      const acx = c.x - a.x;
      const acy = -(c.y - a.y);
      const crossZ = abx * acy - aby * acx;
      if (crossZ < 0) {
        out[i] = ia;
        out[i + 1] = ic;
        out[i + 2] = ib;
        continue;
      }
    }
    out[i] = ia;
    out[i + 1] = ib;
    out[i + 2] = ic;
  }
  return out;
}

/**
 * Loads an image URL or data URI into an HTMLImageElement ready for MediaPipe detection
 * and WebGL texture upload.
 */
export function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

/**
 * Runs (and caches) MediaPipe FaceLandmarker detection for an HTMLImageElement.
 */
async function detectCachedLandmarks(
  imageElement: HTMLImageElement
): Promise<NormalizedLandmark[] | null> {
  const cacheKey = imageElement.currentSrc || imageElement.src;
  // Landmarks for the built-in fighters were detected once at build time, so no model or network is needed.
  const pre = /faces3d\/([a-z_]+)\.jpg/.exec(cacheKey || '');
  const table = precomputedLandmarks as unknown as Record<string, number[][]>;
  if (pre && table[pre[1]]) {
    return table[pre[1]].map(([x, y, z]) => ({ x, y, z, visibility: 1 })) as NormalizedLandmark[];
  }
  if (cacheKey && landmarkCache.has(cacheKey)) {
    return landmarkCache.get(cacheKey) ?? null;
  }

  const landmarker = await getFaceLandmarker();
  const result = await withMutedTfliteInfo(async () => landmarker.detect(imageElement));
  const landmarks =
    result.faceLandmarks && result.faceLandmarks.length > 0
      ? result.faceLandmarks[0]
      : null;

  if (cacheKey) {
    landmarkCache.set(cacheKey, landmarks);
  }
  return landmarks;
}

/**
 * Samples the average natural skin tone directly from the center cheek/forehead landmarks of
 * the portrait image so the cranium sides/back blend seamlessly with the mapped 3D face mesh.
 */
function sampleFaceSkinColor(
  imageElement: HTMLImageElement,
  landmarks: NormalizedLandmark[] | null,
  fallbackHex: string
): THREE.Color {
  try {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return new THREE.Color(fallbackHex);
    ctx.drawImage(imageElement, 0, 0, size, size);

    // Sample cheek, forehead, and nose-bridge skin landmarks (avoids eyes, eyebrows, hair, beard)
    const samplePts: [number, number][] =
      landmarks && landmarks.length >= 468
        ? [151, 50, 280, 116, 345, 6].map((idx) => [landmarks[idx].x, landmarks[idx].y])
        : [
            [0.5, 0.42],
            [0.44, 0.48],
            [0.56, 0.48],
          ];

    let rSum = 0;
    let gSum = 0;
    let bSum = 0;
    let count = 0;

    for (const [nx, ny] of samplePts) {
      const px = Math.max(2, Math.min(size - 3, Math.round(nx * size)));
      const py = Math.max(2, Math.min(size - 3, Math.round(ny * size)));
      const patch = ctx.getImageData(px - 2, py - 2, 5, 5).data;
      for (let i = 0; i < patch.length; i += 4) {
        const r = patch[i];
        const g = patch[i + 1];
        const b = patch[i + 2];
        const luma = r * 0.299 + g * 0.587 + b * 0.114;
        // Skip very dark pixels (glasses frames / deep shadows) or blown-out white speculars
        if (luma > 35 && luma < 235) {
          rSum += r;
          gSum += g;
          bSum += b;
          count++;
        }
      }
    }

    if (count > 8) {
      const sampled = new THREE.Color(rSum / count / 255, gSum / count / 255, bSum / count / 255);
      // Convert sRGB canvas bytes into linear Three.js color space and gently harmonize with fallback
      sampled.convertSRGBToLinear();
      const fallback = new THREE.Color(fallbackHex);
      return sampled.lerp(fallback, 0.22);
    }
  } catch {
    // Fallback cleanly if image is tainted or unreadable
  }
  return new THREE.Color(fallbackHex);
}

/**
 * Builds a complete 3D fighter head THREE.Group by projecting the real 2D portrait onto
 * a solid, 852-triangle MediaPipe 468-vertex 3D facial mesh seated flush against a widened,
 * skin-matched anatomical cranium, plus fighter-specific 3D hair cap, turban, and eyewear.
 */
export async function build3DFighterHead(
  imageElement: HTMLImageElement,
  config: Fighter3DConfig
): Promise<THREE.Group> {
  const headGroup = new THREE.Group();
  headGroup.name = `head_${config.id}`;

  const sx = config.skullScale[0];
  const sy = config.skullScale[1];
  const sz = config.skullScale[2];

  // Detect 478 3D Facial Landmarks first so we can sample the exact face skin tone for cranium blending
  let landmarks: NormalizedLandmark[] | null = null;
  try {
    landmarks = await detectCachedLandmarks(imageElement);
  } catch {
    landmarks = null;
  }

  const matchedSkinColor = sampleFaceSkinColor(imageElement, landmarks, config.skinToneHex);

  // 1. Widened & Deepened Base Cranium Mesh (rounded front hemisphere so face photo curves naturally around the head)
  const craniumCenterY = 0.04;
  const craniumCenterZ = -0.04 * sz;
  const craniumRx = 0.82 * 0.96 * sx;
  const craniumRy = 0.82 * 1.12 * sy;
  const craniumRz = 0.82 * 1.05 * sz;
  const frontCompression = 0.62;

  const craniumGeo = new THREE.SphereGeometry(0.82, 28, 24);
  craniumGeo.scale(0.96 * sx, 1.12 * sy, 1.05 * sz);
  const craniumPos = craniumGeo.attributes.position;
  for (let i = 0; i < craniumPos.count; i++) {
    const vz = craniumPos.getZ(i);
    if (vz > 0) {
      craniumPos.setZ(i, vz * frontCompression);
    }
  }
  craniumPos.needsUpdate = true;
  craniumGeo.computeVertexNormals();

  const skinMat = new THREE.MeshStandardMaterial({
    color: matchedSkinColor,
    roughness: 0.68,
    metalness: 0.04,
  });
  const craniumMesh = new THREE.Mesh(craniumGeo, skinMat);
  craniumMesh.position.set(0, craniumCenterY, craniumCenterZ);
  craniumMesh.castShadow = true;
  craniumMesh.receiveShadow = true;
  headGroup.add(craniumMesh);

  // Subtle anatomical side ears mounted cleanly on the widened skull sides
  const earGeo = new THREE.SphereGeometry(0.15, 14, 12);
  earGeo.scale(0.42, 1.25, 0.7);
  [-1, 1].forEach((side) => {
    const ear = new THREE.Mesh(earGeo, skinMat);
    ear.position.set(side * (craniumRx - 0.01), 0.02, craniumCenterZ - 0.04 * sz);
    ear.rotation.y = side * 0.25;
    ear.castShadow = true;
    headGroup.add(ear);
  });

  // Complete sculpted back & top hair dome behind and above the face so head shape looks solid from every angle
  if (config.headwear === 'none') {
    const hairMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(config.hairColorHex || '#181412'),
      roughness: 0.88,
      metalness: 0.04,
    });
    // Top & upper-back crown cap
    const hairCrownGeo = new THREE.SphereGeometry(
      0.855,
      24,
      20,
      0,
      Math.PI * 2,
      0,
      Math.PI * 0.62
    );
    hairCrownGeo.scale(0.98 * sx, 1.12 * sy, 1.08 * sz);
    const hairPos = hairCrownGeo.attributes.position;
    for (let i = 0; i < hairPos.count; i++) {
      const vz = hairPos.getZ(i);
      if (vz > 0) {
        hairPos.setZ(i, vz * 0.42);
      }
    }
    hairPos.needsUpdate = true;
    hairCrownGeo.computeVertexNormals();

    const hairCrown = new THREE.Mesh(hairCrownGeo, hairMat);
    hairCrown.position.set(0, craniumCenterY + 0.06 * sy, craniumCenterZ - 0.04 * sz);
    hairCrown.rotation.x = -0.36;
    hairCrown.castShadow = true;
    headGroup.add(hairCrown);

    // Lower back-of-head / nape hair shell covering the rear skull cleanly behind the ears
    const rearHairGeo = new THREE.SphereGeometry(
      0.84,
      20,
      16,
      Math.PI,
      Math.PI,
      Math.PI * 0.15,
      Math.PI * 0.72
    );
    rearHairGeo.scale(0.98 * sx, 1.06 * sy, 1.06 * sz);
    const rearHair = new THREE.Mesh(rearHairGeo, hairMat);
    rearHair.position.set(0, craniumCenterY - 0.02 * sy, craniumCenterZ - 0.02 * sz);
    rearHair.castShadow = true;
    headGroup.add(rearHair);
  }

  // Helper: exact Z surface height of the contoured front cranium at any (dx, dy)
  const getCraniumFrontZ = (dx: number, dy: number): number => {
    const nx = dx / craniumRx;
    const ny = (dy - craniumCenterY) / craniumRy;
    const inside = Math.max(0, 1 - nx * nx - ny * ny);
    return craniumCenterZ + craniumRz * frontCompression * Math.sqrt(inside);
  };

  // 2. Construct Solid Textured 468-Vertex Face Mesh Seated Flush Against Cranium (+Z, rotation.y = 0)
  let leftEyePos = new THREE.Vector3(-0.24 * sx, 0.12 * sy, 0.36 * sz);
  let rightEyePos = new THREE.Vector3(0.24 * sx, 0.12 * sy, 0.36 * sz);
  let bridgePos = new THREE.Vector3(0, 0.14 * sy, 0.4 * sz);
  let eyeSpan = 0.48 * sx;

  if (landmarks && landmarks.length >= 468) {
    headGroup.userData.hasDetectedFace = true;

    const positions = new Float32Array(landmarks.length * 3);
    const uvs = new Float32Array(landmarks.length * 2);

    const leftCheek = landmarks[234];
    const rightCheek = landmarks[454];
    const foreheadTop = landmarks[10];
    const chinBottom = landmarks[152];

    const midX = (leftCheek.x + rightCheek.x) * 0.5;
    const midY = (foreheadTop.y + chinBottom.y) * 0.5;
    const faceWidthNorm = Math.max(0.06, Math.abs(rightCheek.x - leftCheek.x));
    const faceHeightNorm = Math.max(0.08, Math.abs(chinBottom.y - foreheadTop.y));

    let minZ = Infinity;
    let maxZ = -Infinity;
    for (let i = 0; i < 468; i++) {
      const zVal = landmarks[i].z;
      if (zVal < minZ) minZ = zVal;
      if (zVal > maxZ) maxZ = zVal;
    }
    const zSpan = Math.max(0.02, maxZ - minZ);

    // Slightly trimmed XY (matching 1.85 / 2.05 ratio) so temples, jawline, and forehead tuck right into cranium
    const targetFaceWidth = 1.38 * sx;
    const targetFaceHeight = 1.66 * sy;
    const scaleX = targetFaceWidth / faceWidthNorm;
    const scaleY = targetFaceHeight / faceHeightNorm;

    const mapPoint = (pt: NormalizedLandmark) => {
      const dx = (pt.x - midX) * scaleX;
      const dy = -(pt.y - midY) * scaleY + 0.04;
      const depth01 = Math.max(0, Math.min(1.08, (maxZ - pt.z) / zSpan));

      // Conforms outer cheek/jaw/forehead edges flush onto cranium surface while preserving crisp 3D center relief
      const nx = dx / craniumRx;
      const ny = (dy - craniumCenterY) / craniumRy;
      const r2 = nx * nx + ny * ny;
      const centerWeight = Math.max(0, Math.min(1, 1 - r2 * 0.85));
      const baseZ = getCraniumFrontZ(dx, dy);
      const relief = depth01 * 0.26 * sz * (0.12 + 0.88 * centerWeight);
      const dz = baseZ + 0.012 * sz + relief;
      return [dx, dy, dz] as const;
    };

    for (let i = 0; i < landmarks.length; i++) {
      const pt = landmarks[i];
      const [x, y, z] = mapPoint(pt);
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      uvs[i * 2] = pt.x;
      uvs[i * 2 + 1] = 1.0 - pt.y;
    }

    // Extract precise 3D eye anchor coordinates so eyewear sits directly on the face (shifted flush onto eyes)
    const [lx, ly, lz] = mapPoint(landmarks[159]); // left eye center
    const [rx, ry, rz] = mapPoint(landmarks[386]); // right eye center
    const [bx, by, bz] = mapPoint(landmarks[168]); // nose bridge
    leftEyePos.set(lx, ly, lz + 0.045);
    rightEyePos.set(rx, ry, rz + 0.045);
    bridgePos.set(bx, by, bz + 0.048);
    eyeSpan = Math.max(0.34, Math.abs(rx - lx));

    const faceGeo = new THREE.BufferGeometry();
    faceGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    faceGeo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    // Populate solid triangle index buffer from MediaPipe canonical 468-face triangulation
    const orientedIndices = buildOrientedFaceIndices(landmarks);
    faceGeo.setIndex(new THREE.BufferAttribute(orientedIndices, 1));
    faceGeo.computeVertexNormals();
    faceGeo.computeBoundingSphere();

    const faceTexture = new THREE.Texture(imageElement);
    faceTexture.colorSpace = THREE.SRGBColorSpace;
    faceTexture.generateMipmaps = true;
    faceTexture.minFilter = THREE.LinearMipmapLinearFilter;
    faceTexture.magFilter = THREE.LinearFilter;
    faceTexture.needsUpdate = true;

    const faceMat = new THREE.MeshStandardMaterial({
      map: faceTexture,
      roughness: 0.62,
      metalness: 0.02,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });

    const faceMesh = new THREE.Mesh(faceGeo, faceMat);
    faceMesh.name = `face_mesh_${config.id}`;
    faceMesh.userData.isFacePhotoMesh = true;
    faceMesh.rotation.set(0, 0, 0);
    faceMesh.renderOrder = 2;
    faceMesh.castShadow = true;
    faceMesh.receiveShadow = true;
    headGroup.add(faceMesh);
  } else {
    headGroup.userData.hasDetectedFace = false;
  }

  // 3. Fighter-Specific 3D Turban (Sardar 'Saf' Chauhan / Turban headgear) seated directly on forehead & skull
  if (config.headwear === 'turban_red') {
    const turbanGroup = new THREE.Group();
    turbanGroup.rotation.set(0, 0, 0);

    const turbanMat = new THREE.MeshStandardMaterial({
      color: 0x8b1e1e,
      roughness: 0.8,
      metalness: 0.04,
    });
    const turbanGeo = new THREE.SphereGeometry(0.95, 24, 24, 0, Math.PI * 2, 0, Math.PI * 0.56);
    turbanGeo.scale(0.98 * sx, 0.88 * sy, 1.02 * sz);
    const turban = new THREE.Mesh(turbanGeo, turbanMat);
    turban.position.set(0, 0.44 * sy, -0.34 * sz);
    turban.rotation.x = -0.18;
    turban.castShadow = true;
    turbanGroup.add(turban);

    // Layered front cloth fold wrap seated directly on the forehead hairline
    const wrapBandGeo = new THREE.TorusGeometry(0.79, 0.16, 12, 28);
    wrapBandGeo.scale(1.0 * sx, 1.0 * sz, 0.84);
    const wrapBand = new THREE.Mesh(wrapBandGeo, turbanMat);
    wrapBand.position.set(0, 0.56 * sy, -0.28 * sz);
    wrapBand.rotation.x = Math.PI / 2 - 0.18;
    wrapBand.castShadow = true;
    turbanGroup.add(wrapBand);

    headGroup.add(turbanGroup);
  }

  // 4. Fighter-Specific 3D Eyewear (Sardar's Gold Aviators / Black Frames) seated directly on the face
  if (config.eyewear !== 'none') {
    const glassesGroup = new THREE.Group();
    glassesGroup.rotation.set(0, 0, 0);
    const isGold = config.eyewear === 'gold_aviators';
    const frameMat = new THREE.MeshStandardMaterial({
      color: isGold ? 0xd4af37 : 0x1a1a1a,
      metalness: isGold ? 0.85 : 0.2,
      roughness: 0.25,
    });
    const lensMat = new THREE.MeshPhysicalMaterial({
      color: isGold ? 0x2b1d0e : 0xffffff,
      transparent: true,
      opacity: isGold ? 0.78 : 0.2,
      roughness: 0.1,
      metalness: isGold ? 0.5 : 0.0,
      clearcoat: 1.0,
    });

    const lensRadius = Math.max(0.145, Math.min(0.195, eyeSpan * 0.36));
    const rimGeo = new THREE.TorusGeometry(lensRadius, 0.016, 12, 24);
    const lensGeo = new THREE.CircleGeometry(lensRadius - 0.005, 24);

    [leftEyePos, rightEyePos].forEach((pos, idx) => {
      const side = idx === 0 ? -1 : 1;
      const rim = new THREE.Mesh(rimGeo, frameMat);
      const lens = new THREE.Mesh(lensGeo, lensMat);
      rim.position.copy(pos);
      lens.position.set(pos.x, pos.y, pos.z - 0.003);
      if (!isGold) {
        rim.scale.set(1.12, 0.78, 1);
        lens.scale.set(1.12, 0.78, 1);
      }
      rim.rotation.y = side * 0.12;
      lens.rotation.y = side * 0.12;
      glassesGroup.add(rim, lens);

      // Temple arms reaching cleanly back from front lenses along the widened skull to the ears
      const earZ = craniumCenterZ - 0.04 * sz;
      const templeLen = Math.max(0.45, pos.z - earZ);
      const templeGeo = new THREE.BoxGeometry(0.022, 0.024, templeLen);
      const temple = new THREE.Mesh(templeGeo, frameMat);
      const outerX = side * Math.max(Math.abs(pos.x) + lensRadius + 0.02, craniumRx - 0.03);
      temple.position.set(
        (pos.x + side * lensRadius + outerX) * 0.5,
        pos.y + 0.015,
        (pos.z + earZ) * 0.5
      );
      temple.rotation.y = -side * 0.16;
      glassesGroup.add(temple);
    });

    const bridgeWidth = Math.max(0.12, eyeSpan - lensRadius * 1.85);
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(bridgeWidth, 0.02, 0.02), frameMat);
    bridge.position.set(bridgePos.x, bridgePos.y + 0.01, Math.max(leftEyePos.z, rightEyePos.z) + 0.008);
    glassesGroup.add(bridge);

    if (isGold) {
      const topBar = new THREE.Mesh(
        new THREE.BoxGeometry(bridgeWidth + 0.1, 0.015, 0.016),
        frameMat
      );
      topBar.position.set(
        bridgePos.x,
        bridgePos.y + lensRadius * 0.62,
        Math.max(leftEyePos.z, rightEyePos.z) + 0.008
      );
      glassesGroup.add(topBar);
    }

    headGroup.add(glassesGroup);
  }

  return headGroup;
}

/**
 * Disposes all GPU geometries, materials, and textures owned by a generated 3D head group.
 */
export function disposeHeadGroup(group: THREE.Group): void {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();

  group.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      if (obj.geometry) geometries.add(obj.geometry);
      const matList = Array.isArray(obj.material) ? obj.material : [obj.material];
      matList.forEach((m) => {
        if (!m) return;
        materials.add(m);
        const std = m as THREE.MeshStandardMaterial;
        if (std.map) textures.add(std.map);
      });
    }
  });

  geometries.forEach((g) => g.dispose());
  materials.forEach((m) => m.dispose());
  textures.forEach((t) => t.dispose());
}

/**
 * Pre-warms MediaPipe FaceLandmarker detection and caches 478-point 3D landmarks for a
 * fighter portrait so attaching 3D heads in the Indian Village Arena is instant.
 */
export async function preloadFighter3DHead(
  portraitUrl: string,
  config: Fighter3DConfig
): Promise<boolean> {
  if (!portraitUrl) return false;
  try {
    const img = await loadImageElement(portraitUrl);
    const group = await build3DFighterHead(img, config);
    const detected = Boolean(group.userData.hasDetectedFace);
    disposeHeadGroup(group);
    return detected;
  } catch {
    return false;
  }
}
