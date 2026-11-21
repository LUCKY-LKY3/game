import * as THREE from 'three';
import { CombatAction, FighterProfile, FightingStyle, LowerOutfitStyle } from '../types/game';
import { resolveLowerOutfitStyle } from '../data/roster';
import {
  attachSculptedFaceFeatures3D,
  buildSculptedEar,
  createAnatomicalHeadGeometry,
  createSculptedHeadSkinPbrMaps,
  getCharacterFaceSculptSpec,
} from './faceSculptor';
import {
  build3DFighterHead,
  disposeHeadGroup,
  loadImageElement,
} from '../utils/FaceTo3DHead';
import { resolveFighter3DConfig } from '../utils/fighterHeads';

export interface CharacterBodySpec {
  heightScale: number;
  widthScale: number;
  depthScale: number;
  bellyBulge: number; // > 0 adds rounded protruding belly, < 0 trims torso extra lean
  limbScale: number;
  headScale: number;
  shoulderMass: number; // 0.88 lean -> 1.0 athletic -> 1.22 pehelwan heavy
  vTaper: number;       // 0.85 broad-waist -> 1.16 crisp athletic V-taper
}

export function getCharacterBodySpec(profile: FighterProfile): CharacterBodySpec {
  const buildScale = profile.appearance.buildScale || 1.0;
  const isPehelwan = profile.archetype === 'pehelwan' || buildScale >= 1.09;
  const buildDelta = buildScale - 1.0;

  switch (profile.id) {
    case 'rebel_striker':
      // Chet: balanced athletic V-taper baseline
      return {
        heightScale: 1.0,
        widthScale: 1.0 + buildDelta * 0.4,
        depthScale: 1.0 + buildDelta * 0.3,
        bellyBulge: 0,
        limbScale: 1.02 + buildDelta * 0.4,
        headScale: 1.0,
        shoulderMass: 1.08 + buildDelta * 0.5,
        vTaper: 1.12,
      };

    case 'rebel_tactician':
      // Jav: larger Pehelwan-broad frame (taller & broader deltoids)
      return {
        heightScale: 1.12,
        widthScale: 1.15,
        depthScale: 1.12,
        bellyBulge: 0.04,
        limbScale: 1.14,
        headScale: 1.04,
        shoulderMass: 1.22,
        vTaper: 1.08,
      };

    case 'rebel_aviator':
      // Saf: shorter, heavy Pehelwan build with wide shoulders & rounded belly
      return {
        heightScale: 0.89,
        widthScale: 1.24,
        depthScale: 1.26,
        bellyBulge: 0.14,
        limbScale: 1.16,
        headScale: 1.01,
        shoulderMass: 1.2,
        vTaper: 0.88,
      };

    case 'rebel_enforcer':
      // Jam: tall, lean athletic wiry striker
      return {
        heightScale: 1.0,
        widthScale: 0.82,
        depthScale: 0.84,
        bellyBulge: -0.02,
        limbScale: 0.82,
        headScale: 0.96,
        shoulderMass: 0.98,
        vTaper: 1.15,
      };

    case 'qari_jaleel':
      // Fady: tall, lean athletic silhouette with defined deltoids
      return {
        heightScale: 1.0,
        widthScale: 0.82,
        depthScale: 0.84,
        bellyBulge: -0.02,
        limbScale: 0.82,
        headScale: 0.96,
        shoulderMass: 1.0,
        vTaper: 1.15,
      };

    case 'rebel_shadow':
      // Immy: compact agile martial artist
      return {
        heightScale: 0.8,
        widthScale: 0.82,
        depthScale: 0.84,
        bellyBulge: -0.02,
        limbScale: 0.82,
        headScale: 0.92,
        shoulderMass: 0.96,
        vTaper: 1.14,
      };

    default: {
      const s = buildScale;
      return {
        heightScale: 0.96 + (s - 1) * 0.6,
        widthScale: s,
        depthScale: s,
        bellyBulge: isPehelwan ? Math.max(0.03, (s - 1.04) * 0.55) : -0.01,
        limbScale: s * (isPehelwan ? 1.06 : 1.0),
        headScale: 1.0,
        shoulderMass: isPehelwan ? 1.18 + Math.max(0, s - 1.08) * 0.6 : 1.05 + (s - 1) * 0.4,
        vTaper: isPehelwan ? 0.96 : 1.14,
      };
    }
  }
}

export interface KurtaFlapState {
  frontFlap: THREE.Group;
  backFlap: THREE.Group;
  frontRotX: number;
  backRotX: number;
}

export interface ArticulatedFighterRig {
  root: THREE.Group;
  bodyRoot: THREE.Group;
  bodyBaseScale: THREE.Vector3;
  headBaseScale: THREE.Vector3;
  hips: THREE.Group;
  torso: THREE.Group;
  headGroup: THREE.Group;
  leftShoulder: THREE.Group;
  leftElbow: THREE.Group;
  rightShoulder: THREE.Group;
  rightElbow: THREE.Group;
  leftHip: THREE.Group;
  leftKnee: THREE.Group;
  rightHip: THREE.Group;
  rightKnee: THREE.Group;
  leftFootMarker: THREE.Object3D;
  rightFootMarker: THREE.Object3D;
  leftFootShadow: THREE.Mesh;
  rightFootShadow: THREE.Mesh;
  kurtaFlaps: KurtaFlapState | null;
  shadowDisc: THREE.Mesh;
  rageRing: THREE.Mesh;
  hitFlashMaterials: THREE.MeshStandardMaterial[];
  facePhotoMaterials: THREE.MeshStandardMaterial[];
  dizzyFaceGroup: THREE.Group;
  strikeTrailGroup: THREE.Group;
  strikeTrailMat: THREE.MeshBasicMaterial;
  faceMaterial: THREE.MeshPhysicalMaterial;
  faceTexture: THREE.Texture | null;
  dispose: () => void;
}

// Reusable math scratch vectors (zero per-frame allocations inside applyFighterPose)
const _footWorld = new THREE.Vector3();
const _footLocal = new THREE.Vector3();

function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(size / 2, size / 2, 6, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(12, 6, 2, 0.56)');
  grad.addColorStop(0.58, 'rgba(12, 6, 2, 0.24)');
  grad.addColorStop(1, 'rgba(12, 6, 2, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Focused dark ambient-occlusion shadow disc placed directly beneath each foot */
function createFootAoShadowTexture(): THREE.CanvasTexture {
  const size = 96;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(size / 2, size / 2, 4, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(8, 4, 2, 0.82)');
  grad.addColorStop(0.45, 'rgba(10, 5, 2, 0.48)');
  grad.addColorStop(1, 'rgba(10, 5, 2, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Subtle organic skin pore & fine dermis grain height map for realistic PBR skin response */
function createSkinBumpTexture(size = 256): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, size, size);
  const poreCount = size <= 128 ? 1600 : 6200;
  // Organic micro-pores
  for (let i = 0; i < poreCount; i++) {
    const x = (i * 73 + 19) % size;
    const y = (i * 137 + 41) % size;
    const v = 108 + ((i * 31) % 36);
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(x, y, i % 5 === 0 ? 2 : 1, i % 7 === 0 ? 2 : 1);
  }
  // Subtle micro skin-crease lines
  ctx.strokeStyle = 'rgba(98, 98, 98, 0.22)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 24; i++) {
    const y = (i * 9 + 4) % size;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(size * 0.33, y + ((i % 3) - 1) * 2, size * 0.66, y - ((i % 2) * 2), size, y);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  return tex;
}

/** Procedural limb skin albedo with warm subsurface tone, forearm hair strokes, and anatomical shadow gradient */
function createLimbSkinAlbedoTexture(
  skinTone: string,
  maxAnisotropy: number,
  size = 256
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = skinTone;
  ctx.fillRect(0, 0, size, size);

  // Subtle vertical anatomical shading (slight shadow near elbow/wrist crease, warm sunlit muscle belly)
  const vGrad = ctx.createLinearGradient(0, 0, 0, size);
  vGrad.addColorStop(0, 'rgba(32, 12, 6, 0.16)');
  vGrad.addColorStop(0.28, 'rgba(255, 165, 115, 0.08)');
  vGrad.addColorStop(0.65, 'rgba(255, 145, 95, 0.05)');
  vGrad.addColorStop(1, 'rgba(42, 16, 8, 0.15)');
  ctx.fillStyle = vGrad;
  ctx.fillRect(0, 0, size, size);

  // Soft wrap-around underside shadow gradient for muscular cylindrical depth
  const hGrad = ctx.createLinearGradient(0, 0, size, 0);
  hGrad.addColorStop(0, 'rgba(28, 10, 6, 0.14)');
  hGrad.addColorStop(0.45, 'rgba(255, 190, 145, 0.06)');
  hGrad.addColorStop(1, 'rgba(28, 10, 6, 0.14)');
  ctx.fillStyle = hGrad;
  ctx.fillRect(0, 0, size, size);

  // Subtle organic forearm / calf hair strokes & fine dermis variation
  ctx.strokeStyle = 'rgba(26, 15, 10, 0.13)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 420; i++) {
    const x = (i * 89 + 17) % size;
    const y = (i * 53 + 29) % size;
    const len = 4 + (i % 5);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + ((i % 3) - 1) * 1.4, y + len);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

/** Procedural high-detail woven linen kurta/shirt texture with front button placket, stitched chest pockets, collar trim & AO shading */
function createWovenKurtaTextures(
  baseColor: string,
  maxAnisotropy: number
): { map: THREE.CanvasTexture; bumpMap: THREE.CanvasTexture } {
  const size = 512;
  const albedo = document.createElement('canvas');
  albedo.width = size;
  albedo.height = size;
  const ctx = albedo.getContext('2d')!;

  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, size, size);

  // Hand-loomed linen slub warp & weft threads
  for (let y = 0; y < size; y += 3) {
    const alt = y % 6 === 0;
    ctx.fillStyle = alt ? 'rgba(255, 246, 232, 0.065)' : 'rgba(18, 12, 8, 0.055)';
    ctx.fillRect(0, y, size, 1.5);
  }
  for (let x = 0; x < size; x += 3) {
    const alt = x % 6 === 0;
    ctx.fillStyle = alt ? 'rgba(255, 244, 226, 0.048)' : 'rgba(22, 14, 10, 0.05)';
    ctx.fillRect(x, 0, 1.5, size);
  }

  // Subtle ambient occlusion under the arms (side seams at u ~ 0.25 & 0.75)
  for (const ax of [size * 0.25, size * 0.75]) {
    const armAo = ctx.createRadialGradient(ax, size * 0.32, 12, ax, size * 0.36, 98);
    armAo.addColorStop(0, 'rgba(14, 8, 4, 0.26)');
    armAo.addColorStop(1, 'rgba(14, 8, 4, 0)');
    ctx.fillStyle = armAo;
    ctx.fillRect(ax - 105, size * 0.08, 210, size * 0.6);
  }

  // Subtle vertical cloth drape folds
  for (let i = 0; i < 14; i++) {
    const fx = (i / 14) * size;
    const fold = ctx.createLinearGradient(fx, 0, fx + 30, 0);
    fold.addColorStop(0, 'rgba(0,0,0,0)');
    fold.addColorStop(0.5, 'rgba(16,10,6,0.1)');
    fold.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = fold;
    ctx.fillRect(fx, 0, 30, size);
  }

  // Decorative woven collar trim along the upper neckline edge (v ~ top)
  ctx.fillStyle = 'rgba(245, 200, 118, 0.28)';
  ctx.fillRect(0, 6, size, 10);
  ctx.strokeStyle = 'rgba(255, 240, 200, 0.42)';
  ctx.setLineDash([6, 4]);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 20);
  ctx.lineTo(size, 20);
  ctx.stroke();

  // Vertical front button placket painted at front UV centerline (u ~ 0.0 / 1.0 & 0.50 for LatheGeometry front alignment)
  for (const px of [0, size * 0.5, size]) {
    ctx.fillStyle = 'rgba(255, 248, 236, 0.08)';
    ctx.fillRect(px - 14, 18, 28, size * 0.72);
    ctx.strokeStyle = 'rgba(20, 12, 8, 0.28)';
    ctx.setLineDash([5, 4]);
    ctx.lineWidth = 1.6;
    ctx.strokeRect(px - 13, 20, 26, size * 0.7);
    // Buttonhole stitch marks
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(24, 16, 10, 0.36)';
    for (let b = 0; b < 4; b++) {
      ctx.fillRect(px - 4, 88 + b * 66, 8, 3);
    }
  }

  // Stitched chest pockets flanking the front placket
  ctx.strokeStyle = 'rgba(248, 238, 220, 0.28)';
  ctx.setLineDash([4, 3]);
  ctx.lineWidth = 1.5;
  for (const cx of [size * 0.1, size * 0.9 - 58]) {
    ctx.fillStyle = 'rgba(18, 12, 8, 0.09)';
    ctx.fillRect(cx, 128, 58, 66);
    ctx.strokeRect(cx + 3, 131, 52, 60);
    // Pocket top hem fold
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255, 246, 230, 0.14)';
    ctx.fillRect(cx, 128, 58, 11);
    ctx.setLineDash([4, 3]);
  }
  ctx.setLineDash([]);

  // Waist tuck ambient occlusion & subtle akhara red-clay dust weathering near lower hem
  const waistAo = ctx.createLinearGradient(0, size * 0.7, 0, size);
  waistAo.addColorStop(0, 'rgba(18, 10, 6, 0)');
  waistAo.addColorStop(0.65, 'rgba(98, 48, 24, 0.16)');
  waistAo.addColorStop(1, 'rgba(18, 10, 6, 0.38)');
  ctx.fillStyle = waistAo;
  ctx.fillRect(0, size * 0.7, size, size * 0.3);

  // Matching linear cloth weave bump map
  const bump = document.createElement('canvas');
  bump.width = 256;
  bump.height = 256;
  const bctx = bump.getContext('2d')!;
  bctx.fillStyle = '#808080';
  bctx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 3) {
    bctx.fillStyle = y % 6 === 0 ? '#9c9c9c' : '#646464';
    bctx.fillRect(0, y, 256, 1);
  }
  for (let x = 0; x < 256; x += 3) {
    bctx.fillStyle = x % 6 === 0 ? '#989898' : '#686868';
    bctx.fillRect(x, 0, 1, 256);
  }

  const map = new THREE.CanvasTexture(albedo);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.ClampToEdgeWrapping;
  map.anisotropy = maxAnisotropy;

  const bumpMap = new THREE.CanvasTexture(bump);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(4, 4);

  return { map, bumpMap };
}

/** High-resolution woven Madras plaid lungi texture (harmonized to fighter palette) + micro-thread bump */
function createPlaidLungiTextures(
  baseColor: string,
  maxAnisotropy: number
): { map: THREE.CanvasTexture; bumpMap: THREE.CanvasTexture } {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const base = new THREE.Color(baseColor);
  const darkBand = base.clone().multiplyScalar(0.45);
  const brightAccent = base.clone().lerp(new THREE.Color('#F7D08A'), 0.55);

  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, size, size);

  // Authentic hand-loomed Madras lungi plaid stripes with warp/weft crossings
  const step = 64;
  for (let i = 0; i < size; i += step) {
    // Broad deep woven band matched to fighter's lungi palette
    ctx.fillStyle = `rgba(${Math.round(darkBand.r * 255)}, ${Math.round(darkBand.g * 255)}, ${Math.round(darkBand.b * 255)}, 0.52)`;
    ctx.fillRect(i + 18, 0, 18, size);
    ctx.fillRect(0, i + 18, size, 18);

    // Crisp cream cotton warp & weft double threads
    ctx.fillStyle = 'rgba(248, 238, 220, 0.48)';
    ctx.fillRect(i + 2, 0, 4, size);
    ctx.fillRect(0, i + 2, size, 4);
    ctx.fillRect(i + 10, 0, 2, size);
    ctx.fillRect(0, i + 10, size, 2);

    // Harmonized warm ochre/gold accent cross-stripe
    ctx.fillStyle = `rgba(${Math.round(brightAccent.r * 255)}, ${Math.round(brightAccent.g * 255)}, ${Math.round(brightAccent.b * 255)}, 0.34)`;
    ctx.fillRect(i + 44, 0, 4, size);
    ctx.fillRect(0, i + 44, size, 4);

    // Fine charcoal pinstripe
    ctx.fillStyle = 'rgba(18, 14, 12, 0.42)';
    ctx.fillRect(i + 54, 0, 2, size);
    ctx.fillRect(0, i + 54, size, 2);
  }

  // Micro-thread cotton crosshatch texture
  for (let y = 0; y < size; y += 3) {
    ctx.fillStyle = y % 6 === 0 ? 'rgba(255,250,240,0.045)' : 'rgba(0,0,0,0.06)';
    ctx.fillRect(0, y, size, 1.5);
  }
  for (let x = 0; x < size; x += 3) {
    ctx.fillStyle = x % 6 === 0 ? 'rgba(255,250,240,0.035)' : 'rgba(0,0,0,0.045)';
    ctx.fillRect(x, 0, 1.5, size);
  }

  // Soft waist-fold AO at top & border stripe at hem
  const topAo = ctx.createLinearGradient(0, 0, 0, 64);
  topAo.addColorStop(0, 'rgba(14, 8, 4, 0.32)');
  topAo.addColorStop(1, 'rgba(14, 8, 4, 0)');
  ctx.fillStyle = topAo;
  ctx.fillRect(0, 0, size, 64);

  const bump = document.createElement('canvas');
  bump.width = 256;
  bump.height = 256;
  const bctx = bump.getContext('2d')!;
  bctx.fillStyle = '#808080';
  bctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 256; i += 3) {
    bctx.fillStyle = i % 6 === 0 ? '#9c9c9c' : '#646464';
    bctx.fillRect(i, 0, 1.5, 256);
    bctx.fillRect(0, i, 256, 1.5);
  }

  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(2.4, 2.0);
  map.anisotropy = maxAnisotropy;

  const bumpMap = new THREE.CanvasTexture(bump);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(5, 5);

  return { map, bumpMap };
}

/** Procedural rugged woven cotton twill / Pathani salwar fabric texture (no button placket!) + weave bump */
function createWovenTwillTextures(
  baseColor: string,
  maxAnisotropy: number,
  isSalwar: boolean
): { map: THREE.CanvasTexture; bumpMap: THREE.CanvasTexture } {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, size, size);

  if (isSalwar) {
    // Soft vertical hand-loomed cotton drape weave for Pathani Salwar
    for (let x = 0; x < size; x += 4) {
      ctx.fillStyle = x % 8 === 0 ? 'rgba(255,248,236,0.055)' : 'rgba(0,0,0,0.06)';
      ctx.fillRect(x, 0, 2, size);
    }
    for (let y = 0; y < size; y += 5) {
      ctx.fillStyle = y % 10 === 0 ? 'rgba(255,248,236,0.035)' : 'rgba(0,0,0,0.04)';
      ctx.fillRect(0, y, size, 1.5);
    }
  } else {
    // Rugged diagonal cotton twill / chino weave for Rolled Trousers
    ctx.strokeStyle = 'rgba(255, 248, 236, 0.045)';
    ctx.lineWidth = 1.5;
    for (let i = -size; i < size * 2; i += 6) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + size, size);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.075)';
    for (let i = -size + 3; i < size * 2; i += 6) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + size, size);
      ctx.stroke();
    }
    // Crisp stitched trouser outseam lines along sides
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(size * 0.25 - 2, 0, 4, size);
    ctx.fillRect(size * 0.75 - 2, 0, 4, size);
    ctx.fillStyle = 'rgba(255, 242, 215, 0.14)';
    ctx.fillRect(size * 0.25 + 2, 0, 1.5, size);
    ctx.fillRect(size * 0.75 + 2, 0, 1.5, size);
  }

  // Subtle horizontal knee/thigh wear shading & upper waist AO
  const topAo = ctx.createLinearGradient(0, 0, 0, 96);
  topAo.addColorStop(0, 'rgba(10, 6, 3, 0.28)');
  topAo.addColorStop(1, 'rgba(10, 6, 3, 0)');
  ctx.fillStyle = topAo;
  ctx.fillRect(0, 0, size, 96);

  const bump = document.createElement('canvas');
  bump.width = 256;
  bump.height = 256;
  const bctx = bump.getContext('2d')!;
  bctx.fillStyle = '#808080';
  bctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 256; i += 4) {
    bctx.fillStyle = i % 8 === 0 ? '#989898' : '#686868';
    bctx.fillRect(i, 0, 1.5, 256);
    bctx.fillRect(0, i, 256, 1.5);
  }

  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(1.5, 1.5);
  map.anisotropy = maxAnisotropy;

  const bumpMap = new THREE.CanvasTexture(bump);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(4, 4);

  return { map, bumpMap };
}

/**
 * Flat-hanging Pathani Kurta front/back panel with deep side slits up to the waist!
 * Hangs straight down (never flares outward like a bell/skirt) and pivots cleanly at the waist
 * to follow forward/back leg strides and kicks independently.
 */
function createKurtaFlapGeometry(
  width: number,
  length: number,
  arcRadius: number,
  isFront: boolean
): THREE.BufferGeometry {
  const segX = 10;
  const segY = 8;
  const geo = new THREE.PlaneGeometry(width, length, segX, segY);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    // Shift so top edge sits cleanly at y = 0 (waist pivot) and hangs down to y = -length
    const py = y - length * 0.5;
    const t = Math.abs(x) / (width * 0.5); // 0 at center, 1 at side slit edge
    const v = -py / length; // 0 at waist, 1 at bottom hem
    // Slight natural cylindrical wrap around front/back torso without outward skirt flare
    const zCurve = (1 - t * t) * arcRadius * (1 - v * 0.12);
    // Very subtle vertical linen drape fold
    const fold = Math.sin(t * Math.PI * 3) * 0.005 * v;
    const pz = isFront ? zCurve + fold : -zCurve - fold;
    pos.setXYZ(i, x, py, pz);
  }
  if (!isFront) {
    // Flip facing outward on the back panel
    geo.scale(-1, 1, 1);
  }
  geo.computeVertexNormals();
  return geo;
}

/**
 * Sculpted V-taper anatomical torso & kurta tunic via LatheGeometry + vertex sculpting:
 * features broad deltoids, defined bilateral pectoral contours, open V-neck collar cutout,
 * and a tucked waist seam scaled from buildSize (Athletic vs Pehelwan Heavy).
 */
function createSculptedTorsoGeometry(
  bellyBulge = 0,
  shoulderMass = 1.05,
  vTaper = 1.1
): THREE.BufferGeometry {
  const bPos = Math.max(0, bellyBulge);
  const bNeg = Math.min(0, bellyBulge);
  const waistTrim = 1 / Math.max(0.85, vTaper);
  const pts: THREE.Vector2[] = [
    new THREE.Vector2((0.232 + bPos * 0.52 + bNeg * 0.32) * waistTrim, -0.055), // tucked waist hem
    new THREE.Vector2((0.218 + bPos * 0.72 + bNeg * 0.42) * waistTrim, 0.03),   // trim waist seam
    new THREE.Vector2((0.244 + bPos * 0.8 + bNeg * 0.3) * (0.95 + (1 - waistTrim) * 0.2), 0.17), // obliques/lats
    new THREE.Vector2((0.296 + bPos * 0.3 + bNeg * 0.14) * shoulderMass, 0.34), // ribcage / lower chest
    new THREE.Vector2((0.324 + bPos * 0.1 + bNeg * 0.1) * shoulderMass, 0.46),  // broad upper chest & delts
    new THREE.Vector2((0.292 + bPos * 0.08) * shoulderMass, 0.545),             // shoulder slope
    new THREE.Vector2(0.142, 0.585),                                             // collar rim
  ];
  const geo = new THREE.LatheGeometry(pts, 32);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);

    // Broad V-taper athletic width across chest/shoulders, flatter front-to-back depth
    const upperFactor = THREE.MathUtils.clamp((y - 0.05) / 0.46, 0, 1);
    const widthBoost = THREE.MathUtils.lerp(1.04, 1.14 * shoulderMass, upperFactor);
    x *= widthBoost;
    z *= 0.76 + bPos * 0.68;

    // Defined bilateral pectoral chest contours (+Z) with subtle sternum center valley
    if (z > 0.03 && y > 0.25 && y < 0.51) {
      const pecY = Math.sin(((y - 0.25) / 0.26) * Math.PI);
      const absX = Math.abs(x);
      const pecLobe = Math.exp(-Math.pow((absX - 0.125) / 0.115, 2));
      const sternumDip = Math.exp(-Math.pow(absX / 0.045, 2)) * 0.012;
      z += (0.036 * shoulderMass * pecLobe - sternumDip) * pecY * Math.min(1, z / 0.18);
    }

    // Broad sculpted deltoid caps along left/right shoulder flanks
    if (y > 0.36 && y < 0.56) {
      const deltY = Math.sin(((y - 0.36) / 0.2) * Math.PI);
      const sideFactor = Math.min(1, Math.abs(x) / 0.24);
      x += Math.sign(x) * 0.024 * shoulderMass * deltY * sideFactor;
    }

    // Carved open V-neck collar plunge at top front (+Z) revealing collarbone/neck base
    if (z > 0.04 && y > 0.44) {
      const centerProximity = Math.max(0, 1 - Math.abs(x) / 0.12);
      const topProximity = THREE.MathUtils.clamp((y - 0.44) / 0.145, 0, 1);
      y -= 0.072 * centerProximity * topProximity;
      z -= 0.018 * centerProximity * topProximity;
    }

    // Rounded protruding belly on front (+Z) for heavier Pehelwan builds like Saf
    if (bPos > 0.01 && z > -0.02 && y > -0.06 && y < 0.38) {
      const bellyCurve = Math.sin(((y + 0.06) / 0.44) * Math.PI);
      const frontWeight = Math.max(0, z / 0.24);
      z += bPos * 0.92 * bellyCurve * (0.35 + 0.65 * frontWeight);
    }

    // Natural upper-back lat & shoulder-blade sweep (-Z)
    if (z < -0.04 && y > 0.26 && y < 0.53) {
      const back = Math.sin(((y - 0.26) / 0.27) * Math.PI);
      z -= 0.022 * shoulderMass * back;
    }

    pos.setXYZ(i, x, y, z);
  }
  geo.computeVertexNormals();
  return geo;
}

/** Anatomical contoured upper arm (deltoid cap -> bicep/tricep muscle belly -> elbow taper) */
function createUpperArmGeometry(shoulderMass = 1.0): THREE.BufferGeometry {
  const s = 0.94 + shoulderMass * 0.08;
  const pts: THREE.Vector2[] = [
    new THREE.Vector2(0.066 * s, -0.33), // elbow joint
    new THREE.Vector2(0.082 * s, -0.23), // lower bicep taper
    new THREE.Vector2(0.102 * s, -0.14), // muscular bicep/tricep peak
    new THREE.Vector2(0.108 * s, -0.04), // broad deltoid sweep
    new THREE.Vector2(0.098 * s, 0.04),  // deltoid crown
    new THREE.Vector2(0.024, 0.095),
  ];
  const geo = new THREE.LatheGeometry(pts, 18);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    let z = pos.getZ(i);
    // Pronounced anterior bicep ridge (+Z) & posterior tricep sweep (-Z)
    if (y > -0.27 && y < -0.04) {
      const curve = Math.sin(((y + 0.27) / 0.23) * Math.PI);
      if (z > 0) z += 0.014 * s * curve;
      else z -= 0.011 * s * curve;
    }
    pos.setZ(i, z);
  }
  geo.computeVertexNormals();
  return geo;
}

/** Anatomical rolled-up cotton kurta sleeve resting over deltoid & upper bicep */
function createRolledSleeveGeometry(shoulderMass = 1.0): THREE.BufferGeometry {
  const s = 0.94 + shoulderMass * 0.08;
  const pts: THREE.Vector2[] = [
    new THREE.Vector2(0.108 * s, -0.165), // cuff rim
    new THREE.Vector2(0.118 * s, -0.142), // rolled cloth puff
    new THREE.Vector2(0.108 * s, -0.115), // fabric crease
    new THREE.Vector2(0.118 * s, -0.035), // woven sleeve drape
    new THREE.Vector2(0.122 * s, 0.045),  // shoulder seam
    new THREE.Vector2(0.068 * s, 0.102),  // deltoid sleeve cap
  ];
  return new THREE.LatheGeometry(pts, 18);
}

/** Anatomical muscular forearm: thickest near the elbow (brachioradialis), tapering cleanly to slender wrist */
function createForearmGeometry(shoulderMass = 1.0): THREE.BufferGeometry {
  const s = 0.94 + shoulderMass * 0.08;
  const pts: THREE.Vector2[] = [
    new THREE.Vector2(0.047 * s, -0.295), // slender sculpted wrist
    new THREE.Vector2(0.056 * s, -0.22),  // lower tendon taper
    new THREE.Vector2(0.074 * s, -0.145), // mid forearm
    new THREE.Vector2(0.089 * s, -0.075), // thick brachioradialis peak below elbow!
    new THREE.Vector2(0.082 * s, -0.015), // elbow join
    new THREE.Vector2(0.066 * s, 0.025),
  ];
  const geo = new THREE.LatheGeometry(pts, 18);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    let x = pos.getX(i);
    let z = pos.getZ(i);
    // Subtle oval anatomical forearm cross-section near wrist
    const wristT = THREE.MathUtils.clamp((-0.14 - y) / 0.155, 0, 1);
    x *= 1 + wristT * 0.14;
    z *= 1 - wristT * 0.16;
    pos.setXYZ(i, x, y, z);
  }
  geo.computeVertexNormals();
  return geo;
}

/** Sculpted individual-leg thigh tailored to each non-skirt lower outfit style */
function createStyledThighGeometry(style: LowerOutfitStyle): THREE.BufferGeometry {
  if (style === 'pathani_salwar') {
    // Tapered Pathani Salwar: relaxed athletic upper thigh with subtle drape folds tapering to knee
    const pts: THREE.Vector2[] = [
      new THREE.Vector2(0.092, -0.44), // knee taper
      new THREE.Vector2(0.114, -0.31), // lower thigh taper
      new THREE.Vector2(0.134, -0.15), // relaxed athletic salwar volume
      new THREE.Vector2(0.14, -0.03),  // upper hip gather
      new THREE.Vector2(0.102, 0.04),
    ];
    const geo = new THREE.LatheGeometry(pts, 20);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const theta = Math.atan2(x, z);
      const v = THREE.MathUtils.clamp((0.04 - y) / 0.48, 0, 1);
      const gather = Math.sin(theta * 8) * 0.0085 * Math.sin(v * Math.PI);
      const r = Math.hypot(x, z);
      if (r > 0.01) {
        const scale = (r + gather) / r;
        pos.setXYZ(i, x * scale, y, z * scale * 1.05);
      }
    }
    geo.computeVertexNormals();
    return geo;
  }

  if (style === 'split_dhoti') {
    // Articulated Split Dhoti: tightly wrapped around each individual thigh with diagonal tucked pleats
    const pts: THREE.Vector2[] = [
      new THREE.Vector2(0.094, -0.44), // knee wrap
      new THREE.Vector2(0.114, -0.3),  // lower thigh tucked fold
      new THREE.Vector2(0.132, -0.14), // wrapped quad contour
      new THREE.Vector2(0.134, -0.02), // hip wrap
      new THREE.Vector2(0.098, 0.04),
    ];
    const geo = new THREE.LatheGeometry(pts, 22);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const theta = Math.atan2(x, z);
      const v = THREE.MathUtils.clamp((0.04 - y) / 0.48, 0, 1);
      const pleat = Math.sin(theta * 10 + v * 2.4) * 0.01 * (0.35 + 0.65 * Math.sin(v * Math.PI));
      const r = Math.hypot(x, z);
      if (r > 0.01) {
        const scale = (r + pleat) / r;
        pos.setXYZ(i, x * scale, y, z * scale);
      }
    }
    geo.computeVertexNormals();
    return geo;
  }

  // Default: Rolled-Cuff Village Trousers / Chinos (fitted-to-relaxed straight-leg silhouette)
  const pts: THREE.Vector2[] = [
    new THREE.Vector2(0.092, -0.44), // articulated knee join
    new THREE.Vector2(0.102, -0.36), // subtle knee crease dip
    new THREE.Vector2(0.114, -0.24), // straight chino thigh
    new THREE.Vector2(0.126, -0.1),  // relaxed upper thigh
    new THREE.Vector2(0.128, -0.01), // hip join
    new THREE.Vector2(0.096, 0.04),
  ];
  const geo = new THREE.LatheGeometry(pts, 18);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    // Subtle natural fabric knee-tension ripple
    const crease = Math.sin(y * 34) * 0.0028;
    const r = Math.hypot(x, z);
    if (r > 0.01) {
      const scale = (r + crease) / r;
      pos.setXYZ(i, x * scale, y, z * scale * 1.04);
    }
  }
  geo.computeVertexNormals();
  return geo;
}

/** Anatomical bare lower leg (used for exposed ankles & Split Dhoti lower calves) */
function createBareCalfGeometry(): THREE.BufferGeometry {
  const pts: THREE.Vector2[] = [
    new THREE.Vector2(0.055, -0.425), // ankle base
    new THREE.Vector2(0.061, -0.395), // sculpted ankle malleolus ridge
    new THREE.Vector2(0.056, -0.35),  // narrow Achilles taper
    new THREE.Vector2(0.074, -0.26),  // lower gastrocnemius
    new THREE.Vector2(0.095, -0.155), // calf muscle peak
    new THREE.Vector2(0.088, -0.06),  // upper calf
    new THREE.Vector2(0.08, 0.02),    // knee base
  ];
  const geo = new THREE.LatheGeometry(pts, 18);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    let x = pos.getX(i);
    let z = pos.getZ(i);
    if (y > -0.3 && y < -0.06) {
      const calfCurve = Math.sin(((y + 0.3) / 0.24) * Math.PI);
      z -= 0.017 * calfCurve;
    }
    if (y < -0.37 && y > -0.42) {
      x *= 1.09;
    }
    pos.setXYZ(i, x, y, z);
  }
  geo.computeVertexNormals();
  return geo;
}

/** Tailored trouser / Pathani salwar / Split Dhoti calf wrap sleeve (individual per leg) */
function createStyledCalfClothGeometry(style: LowerOutfitStyle): THREE.BufferGeometry {
  if (style === 'pathani_salwar') {
    // Tapered Pathani Salwar calf narrowing smoothly to a snug fitted ankle cuff
    const pts: THREE.Vector2[] = [
      new THREE.Vector2(0.062, -0.395), // snug fitted ankle cuff hem
      new THREE.Vector2(0.068, -0.355), // subtle ankle gather puff
      new THREE.Vector2(0.076, -0.28),  // tapered lower calf
      new THREE.Vector2(0.095, -0.15),  // mid calf drape
      new THREE.Vector2(0.096, -0.04),  // upper calf
      new THREE.Vector2(0.088, 0.02),   // knee join
    ];
    const geo = new THREE.LatheGeometry(pts, 18);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const theta = Math.atan2(x, z);
      const fold = Math.sin(theta * 7) * 0.0045;
      const r = Math.hypot(x, z);
      if (r > 0.01) {
        const scale = (r + fold) / r;
        pos.setXYZ(i, x * scale, y, z * scale);
      }
    }
    geo.computeVertexNormals();
    return geo;
  }

  if (style === 'split_dhoti') {
    // Tightly wrapped Split Dhoti upper-to-mid calf sleeve stopping cleanly above lower muscular calf
    const pts: THREE.Vector2[] = [
      new THREE.Vector2(0.079, -0.245), // crisp mid-calf tucked hem
      new THREE.Vector2(0.098, -0.16),  // wrapped calf muscle
      new THREE.Vector2(0.099, -0.05),  // below knee wrap
      new THREE.Vector2(0.092, 0.02),   // knee overlap
    ];
    const geo = new THREE.LatheGeometry(pts, 20);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const theta = Math.atan2(x, z);
      const v = THREE.MathUtils.clamp((0.02 - y) / 0.265, 0, 1);
      const pleat = Math.sin(theta * 10 + v * 2.2) * 0.0085;
      const r = Math.hypot(x, z);
      if (r > 0.01) {
        const scale = (r + pleat) / r;
        pos.setXYZ(i, x * scale, y, z * scale);
      }
    }
    geo.computeVertexNormals();
    return geo;
  }

  // Rolled-Cuff Village Trousers / Chinos: straight-leg trouser ending cleanly at rolled cuff (y = -0.315)
  const pts: THREE.Vector2[] = [
    new THREE.Vector2(0.081, -0.315), // rolled cuff anchor above exposed ankle
    new THREE.Vector2(0.085, -0.25),  // subtle straight chino drape
    new THREE.Vector2(0.093, -0.14),  // mid shin
    new THREE.Vector2(0.096, -0.04),  // upper shin
    new THREE.Vector2(0.09, 0.02),    // knee join
  ];
  const geo = new THREE.LatheGeometry(pts, 18);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const crease = Math.sin(y * 38) * 0.0025;
    const r = Math.hypot(x, z);
    if (r > 0.01) {
      const scale = (r + crease) / r;
      pos.setXYZ(i, x * scale, y, z * scale * 1.03);
    }
  }
  geo.computeVertexNormals();
  return geo;
}

/**
 * Injects a subtle warm #ffbe76 Fresnel silhouette rim highlight into PBR materials
 * so every fighter's edges read crisply against the sunlit village streets.
 */
export function applyWarmRimHighlight(material: THREE.MeshStandardMaterial, strength = 0.24) {
  const key = `warm_rim_ffbe76_${strength.toFixed(2)}`;
  material.customProgramCacheKey = () => key;
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <dithering_fragment>',
      `
      {
        vec3 rimN = normalize(vNormal);
        vec3 rimV = normalize(vViewPosition);
        float rimNdotV = clamp(abs(dot(rimN, rimV)), 0.0, 1.0);
        float rimFresnel = pow(1.0 - rimNdotV, 3.1);
        float rimUpBias = smoothstep(-0.35, 0.75, rimN.y) * 0.45 + 0.55;
        gl_FragColor.rgb += vec3(1.0, 0.745, 0.463) * (rimFresnel * rimUpBias * ${strength.toFixed(3)});
      }
      #include <dithering_fragment>
      `
    );
  };
}

/**
 * Parametric curved front-face photo shell centered squarely at +Z (front of head)
 * so every face photo curves naturally around the cranium rather than sitting flat or on the side.
 */
function createCurvedFrontFaceGeometry(rx: number, ry: number, rz: number): THREE.BufferGeometry {
  const segU = 18;
  const segV = 18;
  const yawMax = 0.9; // ~52° left/right
  const pitchMax = 0.72; // ~41° forehead-to-chin
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let iv = 0; iv <= segV; iv++) {
    const vNorm = iv / segV; // 0 = bottom (chin), 1 = top (forehead)
    const pitch = (vNorm * 2 - 1) * pitchMax;
    const cosP = Math.cos(pitch);
    const sinP = Math.sin(pitch);
    for (let iu = 0; iu <= segU; iu++) {
      const uNorm = iu / segU; // 0 = left (-X), 1 = right (+X)
      const yaw = (uNorm * 2 - 1) * yawMax;
      const x = rx * Math.sin(yaw) * cosP;
      const y = ry * sinP;
      const z = rz * Math.cos(yaw) * cosP;
      positions.push(x, y, z);
      uvs.push(uNorm, vNorm);
    }
  }

  for (let iv = 0; iv < segV; iv++) {
    for (let iu = 0; iu < segU; iu++) {
      const a = iv * (segU + 1) + iu;
      const b = a + 1;
      const c = a + (segU + 1);
      const d = c + 1;
      indices.push(a, b, d);
      indices.push(a, d, c);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Builds a realistic, anatomically sculpted multi-part 3D Indian village martial artist
 * (`THREE.Group`) pivoted at bottom-center (y = 0) with automatic profile-picture face
 * projection onto a sculpted anatomical cranium/jaw head, woven cotton kurta with rolled
 * sleeves, bifurcated lower-body garments, and muscular sculpted limbs/hands/feet.
 */
export function createFighterRig(
  profile: FighterProfile,
  sideColor: string,
  maxAnisotropy = 4,
  isMobile = false
): ArticulatedFighterRig {
  const { appearance } = profile;
  const effAniso = isMobile ? Math.min(2, maxAnisotropy) : maxAnisotropy;

  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];
  const hitFlashMaterials: THREE.MeshStandardMaterial[] = [];
  const facePhotoMaterials: THREE.MeshStandardMaterial[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geometries.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T, flashable = true, rimStrength = 0): T => {
    materials.push(m);
    if (flashable && m instanceof THREE.MeshStandardMaterial) {
      hitFlashMaterials.push(m);
    }
    if (rimStrength > 0 && m instanceof THREE.MeshStandardMaterial) {
      applyWarmRimHighlight(m, rimStrength);
    }
    return m;
  };

  const skinBump = createSkinBumpTexture(isMobile ? 128 : 256);
  textures.push(skinBump);

  const limbSkinAlbedo = createLimbSkinAlbedoTexture(
    appearance.skinTone,
    effAniso,
    isMobile ? 128 : 256
  );
  textures.push(limbSkinAlbedo);

  // Realistic human skin PBR shader with warm subsurface sheen (#ff8559) & micro pore bump
  const skinMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: appearance.skinTone,
      roughness: 0.58,
      metalness: 0.02,
      sheen: 0.35,
      sheenRoughness: 0.65,
      sheenColor: new THREE.Color('#ff8559'),
      clearcoat: 0.06,
      clearcoatRoughness: 0.5,
      bumpMap: skinBump,
      bumpScale: 0.0045,
    }),
    true,
    0.22
  );

  // Organic limb skin shader (forearms, upper arms, calves) with subtle forearm hair & shadow gradient
  const limbSkinMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: '#FFFFFF',
      map: limbSkinAlbedo,
      roughness: 0.58,
      metalness: 0.02,
      sheen: 0.35,
      sheenRoughness: 0.65,
      sheenColor: new THREE.Color('#ff8559'),
      clearcoat: 0.05,
      clearcoatRoughness: 0.52,
      bumpMap: skinBump,
      bumpScale: 0.005,
    }),
    true,
    0.22
  );

  // Woven linen cotton kurta cloth material (with front button placket, stitched chest pockets & collar trim)
  const kurtaTex = createWovenKurtaTextures(appearance.vestColor, maxAnisotropy);
  textures.push(kurtaTex.map, kurtaTex.bumpMap);
  const vestMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: '#FFFFFF',
      map: kurtaTex.map,
      bumpMap: kurtaTex.bumpMap,
      bumpScale: 0.009,
      roughness: 0.89,
      metalness: 0.02,
      sheen: 0.28,
      sheenRoughness: 0.82,
      sheenColor: new THREE.Color('#F5E6CF'),
    }),
    true,
    0.26
  );

  // Tailored Lower Outfit Material: Woven Madras plaid for Split Dhoti, cotton twill/salwar weave for Trousers & Pathani Salwar
  const lowerOutfitStyle = resolveLowerOutfitStyle(appearance);
  const useBoots = lowerOutfitStyle === 'rolled_trousers' && Boolean(appearance.hasAxe);

  let pantsMat: THREE.MeshPhysicalMaterial;
  if (lowerOutfitStyle === 'split_dhoti') {
    const plaid = createPlaidLungiTextures(appearance.pantsColor, maxAnisotropy);
    textures.push(plaid.map, plaid.bumpMap);
    pantsMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: '#FFFFFF',
        map: plaid.map,
        bumpMap: plaid.bumpMap,
        bumpScale: 0.01,
        roughness: 0.88,
        metalness: 0.02,
        sheen: 0.24,
        sheenRoughness: 0.82,
        sheenColor: new THREE.Color('#F6E8D0'),
      }),
      true,
      0.24
    );
  } else {
    const twill = createWovenTwillTextures(
      appearance.pantsColor,
      maxAnisotropy,
      lowerOutfitStyle === 'pathani_salwar'
    );
    textures.push(twill.map, twill.bumpMap);
    pantsMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: '#FFFFFF',
        map: twill.map,
        bumpMap: twill.bumpMap,
        bumpScale: 0.0085,
        roughness: 0.87,
        metalness: 0.02,
        sheen: 0.18,
        sheenRoughness: 0.85,
        sheenColor: new THREE.Color('#EFE3D0'),
      }),
      true,
      0.24
    );
  }

  // Slightly lighter contrasting reverse-fabric material for rolled trouser cuffs
  const cuffColor = new THREE.Color(appearance.pantsColor).lerp(new THREE.Color('#E8DEC8'), 0.22);
  const cuffMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: cuffColor,
      bumpMap: kurtaTex.bumpMap,
      bumpScale: 0.007,
      roughness: 0.9,
      metalness: 0.02,
    }),
    true,
    0.2
  );

  // Double-sided kurta linen material for flat-hanging Pathani side-slit flaps
  const kurtaFlapMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: '#FFFFFF',
      map: kurtaTex.map,
      bumpMap: kurtaTex.bumpMap,
      bumpScale: 0.009,
      roughness: 0.89,
      metalness: 0.02,
      sheen: 0.26,
      sheenRoughness: 0.82,
      sheenColor: new THREE.Color('#F5E6CF'),
      side: THREE.DoubleSide,
    }),
    true,
    0.26
  );

  const wrapMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: appearance.wrapColor,
      bumpMap: kurtaTex.bumpMap,
      bumpScale: 0.006,
      roughness: 0.92,
      metalness: 0.02,
    })
  );

  const leatherMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#3B2214',
      roughness: 0.52,
      metalness: 0.08,
    })
  );

  const leatherSoleMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#25150C',
      roughness: 0.72,
      metalness: 0.05,
    })
  );

  const brassMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#D4A024',
      roughness: 0.24,
      metalness: 0.88,
    })
  );

  const silverMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#CBD5E1',
      roughness: 0.22,
      metalness: 0.9,
    })
  );

  const trimMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#D97706',
      roughness: 0.42,
      metalness: 0.52,
    })
  );

  const trackTex = <T extends THREE.Texture>(t: T): T => {
    textures.push(t);
    return t;
  };
  const faceSpec = getCharacterFaceSculptSpec(profile);

  // Pure 3D sculpted skin PBR maps (albedo + tangent-space normal + roughness — zero pasted 2D photos)
  const headPbr = createSculptedHeadSkinPbrMaps(
    appearance.skinTone,
    faceSpec,
    appearance.hairColor,
    maxAnisotropy
  );
  trackTex(headPbr.map);
  trackTex(headPbr.normalMap);
  trackTex(headPbr.roughnessMap);

  const faceMaterial = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: '#FFFFFF',
      map: headPbr.map,
      normalMap: headPbr.normalMap,
      normalScale: new THREE.Vector2(0.45, 0.45),
      roughnessMap: headPbr.roughnessMap,
      roughness: 0.95,
      metalness: 0.02,
      sheen: 0.35,
      sheenRoughness: 0.65,
      sheenColor: new THREE.Color('#ff8559'),
      clearcoat: 0.06,
      clearcoatRoughness: 0.5,
    }),
    true,
    0.2
  );

  const faceTexture: THREE.Texture | null = headPbr.map;

  const root = new THREE.Group();

  // Overall body contact shadow disc grounded at y = 0.024
  const shadowTex = createContactShadowTexture();
  textures.push(shadowTex);
  const shadowMat = trackMat(
    new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.72,
    }),
    false
  );
  const shadowDisc = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(1.48, 1.48)), shadowMat);
  shadowDisc.rotation.x = -Math.PI / 2;
  shadowDisc.position.y = 0.024;
  root.add(shadowDisc);

  // Crisp soft grounded contact shadows directly beneath each individual sandal/boot
  const footAoTex = createFootAoShadowTexture();
  textures.push(footAoTex);
  const leftFootShadowMat = trackMat(
    new THREE.MeshBasicMaterial({
      map: footAoTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.92,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    }),
    false
  );
  const rightFootShadowMat = trackMat(
    new THREE.MeshBasicMaterial({
      map: footAoTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.92,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    }),
    false
  );
  const footShadowGeo = trackGeo(new THREE.PlaneGeometry(0.36, 0.48));
  const leftFootShadow = new THREE.Mesh(footShadowGeo, leftFootShadowMat);
  leftFootShadow.rotation.x = -Math.PI / 2;
  leftFootShadow.position.set(-0.16, 0.028, 0.04);
  root.add(leftFootShadow);

  const rightFootShadow = new THREE.Mesh(footShadowGeo, rightFootShadowMat);
  rightFootShadow.rotation.x = -Math.PI / 2;
  rightFootShadow.position.set(0.16, 0.028, 0.04);
  root.add(rightFootShadow);

  // Subtle floor ring (P1 marigold / P2 crimson side & pulses when Rage ready)
  const rageRingMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: sideColor,
      transparent: true,
      opacity: 0.42,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
    false
  );
  const rageRing = new THREE.Mesh(trackGeo(new THREE.RingGeometry(0.56, 0.66, 36)), rageRingMat);
  rageRing.rotation.x = -Math.PI / 2;
  rageRing.position.y = 0.032;
  root.add(rageRing);

  const bodySpec = getCharacterBodySpec(profile);
  const bellyFrontPad = Math.max(0, bodySpec.bellyBulge) * 0.95;

  // Scaled body container pivoted cleanly at bottom-center (y = 0)
  const bodyRoot = new THREE.Group();
  const bodyBaseScale = new THREE.Vector3(
    bodySpec.widthScale,
    bodySpec.heightScale,
    bodySpec.depthScale
  );
  bodyRoot.scale.copy(bodyBaseScale);
  root.add(bodyRoot);

  // ── COMPACT BIFURCATED PELVIS / WAISTBAND (NO UNIFIED SKIRT CYLINDER!) ─────
  const hips = new THREE.Group();
  hips.position.y = 0.95;
  bodyRoot.add(hips);

  // Pooled fast-attack motion trail ribbons & speed lines (zero per-frame allocations)
  const strikeTrailGroup = new THREE.Group();
  strikeTrailGroup.visible = false;
  const strikeTrailMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: '#FDE68A',
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
    false
  );
  const trailArcOuter = new THREE.Mesh(
    trackGeo(new THREE.RingGeometry(0.46, 0.62, 18, 1, -0.85, 1.85)),
    strikeTrailMat
  );
  const trailArcInner = new THREE.Mesh(
    trackGeo(new THREE.RingGeometry(0.32, 0.42, 16, 1, -0.65, 1.45)),
    strikeTrailMat
  );
  trailArcInner.position.z = 0.02;
  const speedLineA = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(0.58, 0.036)), strikeTrailMat);
  speedLineA.position.set(0.32, 0.14, 0.12);
  const speedLineB = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(0.46, 0.028)), strikeTrailMat);
  speedLineB.position.set(0.26, -0.1, 0.16);
  strikeTrailGroup.add(trailArcOuter, trailArcInner, speedLineA, speedLineB);
  hips.add(strikeTrailGroup);

  let kurtaFlaps: KurtaFlapState | null = null;
  const waistExpand = 1 + Math.max(0, bodySpec.bellyBulge) * 1.65;

  // Compact tailored pelvis block ending strictly at hip-socket height so both legs separate cleanly
  const pelvisMesh = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.238 * waistExpand, 0.215, 0.2, 20)),
    pantsMat
  );
  pelvisMesh.scale.set(1.06, 1, 0.82 + Math.max(0, bodySpec.bellyBulge) * 0.45);
  pelvisMesh.position.y = 0.02;
  pelvisMesh.castShadow = true;
  pelvisMesh.receiveShadow = true;
  hips.add(pelvisMesh);

  if (lowerOutfitStyle === 'split_dhoti') {
    // Sculpted twisted dhoti waist roll + compact front waist knot + short center tuck (zero skirt bell!)
    const waistRoll = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(0.242 * waistExpand, 0.036, 12, 28)),
      pantsMat
    );
    waistRoll.rotation.x = Math.PI / 2;
    waistRoll.scale.set(1.06, 0.84 + Math.max(0, bodySpec.bellyBulge) * 0.45, 1);
    waistRoll.position.y = 0.112;
    waistRoll.castShadow = true;
    hips.add(waistRoll);

    const knotLeft = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.038, 0.022, 8, 14)), pantsMat);
    knotLeft.position.set(-0.03, 0.106, 0.215 + bellyFrontPad * 0.85);
    knotLeft.rotation.set(0.35, -0.35, 0.55);
    knotLeft.castShadow = true;
    const knotRight = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.038, 0.022, 8, 14)), pantsMat);
    knotRight.position.set(0.03, 0.106, 0.215 + bellyFrontPad * 0.85);
    knotRight.rotation.set(0.35, 0.35, -0.55);
    knotRight.castShadow = true;
    const knotCore = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.05, 12, 10)), pantsMat);
    knotCore.scale.set(1.12, 0.82, 0.68);
    knotCore.position.set(0, 0.1, 0.224 + bellyFrontPad * 0.88);
    knotCore.castShadow = true;
    hips.add(knotLeft, knotRight, knotCore);

    // Compact tucked vertical center dhoti pleat (narrow strap between hips, ends cleanly above mid-thigh)
    const centerTuck = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.095, 0.21, 0.042)),
      pantsMat
    );
    centerTuck.position.set(0, -0.02, 0.185 + bellyFrontPad * 0.72);
    centerTuck.castShadow = true;
    hips.add(centerTuck);
  } else if (lowerOutfitStyle === 'pathani_salwar') {
    // Clean woven Pathani salwar waistband + knee-length kurta front & back flaps with DEEP SIDE SLITS up to the waist!
    const waistCord = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(0.244 * waistExpand, 0.022, 8, 26)),
      vestMat
    );
    waistCord.rotation.x = Math.PI / 2;
    waistCord.scale.set(1.06, 0.84 + Math.max(0, bodySpec.bellyBulge) * 0.42, 1);
    waistCord.position.y = 0.105;
    hips.add(waistCord);

    const flapWidth = 0.34 * waistExpand;
    const flapLength = 0.43;
    const frontZ = 0.188 + bellyFrontPad * 0.78;
    const backZ = -0.182;

    const frontFlapGroup = new THREE.Group();
    frontFlapGroup.position.set(0, 0.09, frontZ);
    const frontFlapMesh = new THREE.Mesh(
      trackGeo(createKurtaFlapGeometry(flapWidth, flapLength, 0.042, true)),
      kurtaFlapMat
    );
    frontFlapMesh.castShadow = true;
    frontFlapMesh.receiveShadow = true;
    frontFlapGroup.add(frontFlapMesh);
    hips.add(frontFlapGroup);

    const backFlapGroup = new THREE.Group();
    backFlapGroup.position.set(0, 0.09, backZ);
    const backFlapMesh = new THREE.Mesh(
      trackGeo(createKurtaFlapGeometry(flapWidth, flapLength, 0.036, false)),
      kurtaFlapMat
    );
    backFlapMesh.castShadow = true;
    backFlapMesh.receiveShadow = true;
    backFlapGroup.add(backFlapMesh);
    hips.add(backFlapGroup);

    kurtaFlaps = {
      frontFlap: frontFlapGroup,
      backFlap: backFlapGroup,
      frontRotX: 0,
      backRotX: 0,
    };
  } else {
    // Rolled-Cuff Village Trousers / Chinos: stitched leather belt + brass buckle + side belt loops
    const belt = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.246 * waistExpand, 0.244 * waistExpand, 0.06, 22)),
      leatherMat
    );
    belt.scale.set(1.07, 1, 0.83 + Math.max(0, bodySpec.bellyBulge) * 0.42);
    belt.position.y = 0.102;
    belt.castShadow = true;
    hips.add(belt);

    const buckle = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.075, 0.056, 0.025)), brassMat);
    buckle.position.set(0, 0.102, 0.208 + bellyFrontPad * 0.82);
    hips.add(buckle);

    const loopGeo = trackGeo(new THREE.BoxGeometry(0.022, 0.074, 0.026));
    for (const lx of [-0.14, 0.14]) {
      const loop = new THREE.Mesh(loopGeo, pantsMat);
      loop.position.set(lx, 0.102, 0.18 + bellyFrontPad * 0.65);
      hips.add(loop);
    }
  }

  // ── ANATOMICAL V-TAPER TORSO & WOVEN VILLAGE KURTA ─────────────────────────
  const torso = new THREE.Group();
  torso.position.y = 0.12;
  hips.add(torso);

  const chestMesh = new THREE.Mesh(
    trackGeo(
      createSculptedTorsoGeometry(bodySpec.bellyBulge, bodySpec.shoulderMass, bodySpec.vTaper)
    ),
    vestMat
  );
  chestMesh.castShadow = true;
  chestMesh.receiveShadow = true;
  torso.add(chestMesh);

  // Tucked waist fabric seam ring where the kurta tucks cleanly into the lungi/belt
  const waistTuckRing = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(0.238 / Math.max(0.85, bodySpec.vTaper), 0.022, 8, 28)),
    vestMat
  );
  waistTuckRing.rotation.x = Math.PI / 2;
  waistTuckRing.scale.set(1.06 + Math.max(0, bodySpec.bellyBulge) * 1.4, 0.82 + Math.max(0, bodySpec.bellyBulge) * 1.8, 1);
  waistTuckRing.position.y = 0.02;
  torso.add(waistTuckRing);

  // Open V-neck collar cavity showing sculpted collarbone / clavicle ridges & sternum skin
  const chestSkinV = new THREE.Mesh(
    trackGeo(new THREE.ConeGeometry(0.102, 0.225, 14)),
    skinMat
  );
  chestSkinV.rotation.x = Math.PI;
  chestSkinV.scale.set(1.04, 1.0, 0.44);
  chestSkinV.position.set(0, 0.468, 0.194 + bellyFrontPad * 0.14);
  torso.add(chestSkinV);

  // Subtle sculpted left/right clavicle ridges visible inside the open V-collar
  const clavicleGeo = trackGeo(new THREE.CapsuleGeometry(0.014, 0.09, 4, 8));
  const leftClavicle = new THREE.Mesh(clavicleGeo, skinMat);
  leftClavicle.position.set(-0.056, 0.532, 0.168);
  leftClavicle.rotation.set(0.12, -0.22, 1.38);
  const rightClavicle = new THREE.Mesh(clavicleGeo, skinMat);
  rightClavicle.position.set(0.056, 0.532, 0.168);
  rightClavicle.rotation.set(0.12, 0.22, -1.38);
  torso.add(leftClavicle, rightClavicle);

  // Folded shirt collar lapels left & right + back standing collar rim
  const collarBackRim = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(0.132, 0.024, 8, 20, Math.PI * 1.35)),
    vestMat
  );
  collarBackRim.rotation.set(Math.PI / 2 + 0.12, 0, Math.PI * 0.82);
  collarBackRim.position.set(0, 0.575, -0.01);
  torso.add(collarBackRim);

  const collarGeo = trackGeo(new THREE.BoxGeometry(0.118, 0.072, 0.026));
  const leftCollar = new THREE.Mesh(collarGeo, vestMat);
  leftCollar.position.set(-0.092, 0.542, 0.15 + bellyFrontPad * 0.12);
  leftCollar.rotation.set(0.32, -0.48, -0.38);
  const rightCollar = new THREE.Mesh(collarGeo, vestMat);
  rightCollar.position.set(0.092, 0.542, 0.15 + bellyFrontPad * 0.12);
  rightCollar.rotation.set(0.32, 0.48, 0.38);
  torso.add(leftCollar, rightCollar);

  // Vertical kurta button placket & stitched horn buttons
  const placket = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.044, 0.345, 0.016)),
    vestMat
  );
  placket.position.set(0, 0.215, 0.218 + bellyFrontPad * 0.95);
  torso.add(placket);

  const buttonGeo = trackGeo(new THREE.CylinderGeometry(0.009, 0.009, 0.009, 10));
  const buttonMat = trackMat(
    new THREE.MeshStandardMaterial({ color: '#27201B', roughness: 0.42, metalness: 0.18 })
  );
  for (let b = 0; b < 3; b++) {
    const btn = new THREE.Mesh(buttonGeo, buttonMat);
    btn.rotation.x = Math.PI / 2;
    btn.position.set(0, 0.34 - b * 0.09, 0.228 + bellyFrontPad * (0.55 + b * 0.28));
    torso.add(btn);
  }

  // Stitched breast pocket on left chest
  const pocket = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.108, 0.116, 0.015)),
    vestMat
  );
  pocket.position.set(0.132 * bodySpec.shoulderMass, 0.358, 0.222 + bellyFrontPad * 0.32);
  pocket.rotation.y = 0.22;
  torso.add(pocket);

  // Qari Jaleel's signature forged double-bladed battle axe strapped across his back!
  if (appearance.hasAxe) {
    const axeGroup = new THREE.Group();
    axeGroup.position.set(0.02, 0.35, -0.255);
    axeGroup.rotation.z = -0.58;

    const steelMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: '#8D959E',
        roughness: 0.26,
        metalness: 0.9,
      })
    );
    const edgeMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: '#DCE2E8',
        roughness: 0.16,
        metalness: 0.95,
      })
    );
    const handleMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: '#3B2518',
        roughness: 0.84,
        metalness: 0.06,
      })
    );
    const shaft = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.03, 0.036, 1.42, 12)),
      handleMat
    );
    shaft.castShadow = true;
    axeGroup.add(shaft);

    // Leather grip wrap rings near bottom of shaft
    const grip = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.038, 0.039, 0.34, 12)),
      leatherMat
    );
    grip.position.y = -0.44;
    axeGroup.add(grip);

    const collar = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.125, 0.17, 0.095)), steelMat);
    collar.position.y = 0.5;
    axeGroup.add(collar);

    const bladeGeo = trackGeo(
      new THREE.CylinderGeometry(0.245, 0.245, 0.032, 16, 1, false, -0.92, 1.84)
    );
    const leftBlade = new THREE.Mesh(bladeGeo, steelMat);
    leftBlade.position.set(-0.185, 0.5, 0);
    leftBlade.rotation.set(Math.PI / 2, 0, Math.PI / 2);
    leftBlade.scale.set(1.16, 1, 0.9);
    const rightBlade = new THREE.Mesh(bladeGeo, steelMat);
    rightBlade.position.set(0.185, 0.5, 0);
    rightBlade.rotation.set(Math.PI / 2, 0, -Math.PI / 2);
    rightBlade.scale.set(1.16, 1, 0.9);

    // Sharpened steel cutting edge highlights
    const edgeGeo = trackGeo(new THREE.TorusGeometry(0.245, 0.008, 6, 16, 1.8));
    const leftEdge = new THREE.Mesh(edgeGeo, edgeMat);
    leftEdge.position.set(-0.185, 0.5, 0);
    leftEdge.rotation.z = Math.PI * 0.72;
    const rightEdge = new THREE.Mesh(edgeGeo, edgeMat);
    rightEdge.position.set(0.185, 0.5, 0);
    rightEdge.rotation.z = -Math.PI * 0.28;

    axeGroup.add(leftBlade, rightBlade, leftEdge, rightEdge);
    torso.add(axeGroup);
  }

  // Sculpted anatomical neck & trapezius transition (seated solidly inside head base so zero gap on tilt)
  const neckPts: THREE.Vector2[] = [
    new THREE.Vector2(0.128, 0.53),
    new THREE.Vector2(0.094, 0.6),
    new THREE.Vector2(0.086, 0.69),
    new THREE.Vector2(0.092, 0.82),
  ];
  const neckMesh = new THREE.Mesh(trackGeo(new THREE.LatheGeometry(neckPts, 16)), skinMat);
  neckMesh.castShadow = true;
  torso.add(neckMesh);

  // ── SCULPTED ANATOMICAL 3D HEAD + FRONT-CURVED FACE PHOTO & MEDIAPIPE 3D MESH ──
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.84, 0.015);
  // Counter-scale non-uniform body dimensions so every fighter's 3D face stays 100% anatomically natural!
  const headBaseScale = new THREE.Vector3(
    bodySpec.headScale / bodySpec.widthScale,
    bodySpec.headScale / bodySpec.heightScale,
    bodySpec.headScale / bodySpec.depthScale
  );
  headGroup.scale.copy(headBaseScale);
  torso.add(headGroup);

  // Synchronous sculpted 3D fallback head (visible immediately while MediaPipe WASM/landmarks resolve)
  const fallbackHeadGroup = new THREE.Group();
  headGroup.add(fallbackHeadGroup);

  const headMesh = new THREE.Mesh(trackGeo(createAnatomicalHeadGeometry(faceSpec)), faceMaterial);
  headMesh.rotation.y = -Math.PI / 2;
  headMesh.castShadow = true;
  fallbackHeadGroup.add(headMesh);

  // Sculpted 3D anatomical ears (outer helix rim, concha shell, lobe)
  fallbackHeadGroup.add(buildSculptedEar(-1, skinMat, trackGeo));
  fallbackHeadGroup.add(buildSculptedEar(1, skinMat, trackGeo));

  // Real 3D glossy eyeballs, eyelids, curved eyebrows, nostrils, hair, mustache & beard
  attachSculptedFaceFeatures3D(
    fallbackHeadGroup,
    profile,
    faceSpec,
    skinMat,
    trackGeo,
    trackMat,
    trackTex
  );

  // Complete back & crown hair cap behind and above the face so head shape is full from all angles
  if (appearance.hairStyle !== 'bald' && appearance.headgear !== 'turban') {
    const capHairMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: appearance.hairColor || '#1C1612',
        roughness: 0.86,
        metalness: 0.04,
      }),
      true,
      0.16
    );
    const crownCap = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.194, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.56)),
      capHairMat
    );
    crownCap.scale.set(faceSpec.headWidth * 1.03, faceSpec.headHeight * 1.04, faceSpec.headDepth * 1.04);
    crownCap.position.set(0, 0.035, -0.022);
    const backCap = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.188, 16, 12, Math.PI * 0.52, Math.PI * 0.96, 0.14, Math.PI * 0.72)),
      capHairMat
    );
    backCap.scale.set(faceSpec.headWidth * 1.01, faceSpec.headHeight * 0.96, faceSpec.headDepth * 1.03);
    backCap.position.set(0, 0.008, -0.028);
    fallbackHeadGroup.add(crownCap, backCap);
  }

  // Curved front-mounted face photo shell strictly on +Z so photo faces forward immediately
  const curvedPhotoMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#FFFFFF',
      roughness: 0.64,
      metalness: 0.02,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    }),
    false,
    0.18
  );
  facePhotoMaterials.push(curvedPhotoMat);
  const curvedPhotoMesh = new THREE.Mesh(
    trackGeo(
      createCurvedFrontFaceGeometry(
        0.2 * faceSpec.headWidth,
        0.24 * faceSpec.headHeight,
        0.228 * faceSpec.headDepth
      )
    ),
    curvedPhotoMat
  );
  curvedPhotoMesh.position.set(0, 0.008, 0.008);
  fallbackHeadGroup.add(curvedPhotoMesh);

  // Dizzy face overlay (spinning X-eyes flush at front +Z eye level + orbiting golden stars above crown)
  const dizzyFaceGroup = new THREE.Group();
  dizzyFaceGroup.visible = false;
  const dizzyEyeMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: '#FEF08A',
      depthTest: true,
    }),
    false
  );
  const dizzyEyeBarGeo = trackGeo(new THREE.BoxGeometry(0.052, 0.011, 0.008));
  for (const ex of [-0.056, 0.056]) {
    const eyePivot = new THREE.Group();
    eyePivot.name = 'dizzyEyePivot';
    eyePivot.position.set(ex, 0.024, 0.228);
    const barA = new THREE.Mesh(dizzyEyeBarGeo, dizzyEyeMat);
    barA.rotation.z = Math.PI / 4;
    const barB = new THREE.Mesh(dizzyEyeBarGeo, dizzyEyeMat);
    barB.rotation.z = -Math.PI / 4;
    eyePivot.add(barA, barB);
    dizzyFaceGroup.add(eyePivot);
  }
  const dizzyStarsOrbit = new THREE.Group();
  dizzyStarsOrbit.name = 'dizzyStarsOrbit';
  dizzyStarsOrbit.position.set(0, 0.31, 0);
  const starGeo = trackGeo(new THREE.OctahedronGeometry(0.032, 0));
  const starMat = trackMat(new THREE.MeshBasicMaterial({ color: '#FACC15' }), false);
  for (let s = 0; s < 4; s++) {
    const ang = (s / 4) * Math.PI * 2;
    const star = new THREE.Mesh(starGeo, starMat);
    star.position.set(Math.cos(ang) * 0.21, 0, Math.sin(ang) * 0.21);
    dizzyStarsOrbit.add(star);
  }
  dizzyFaceGroup.add(dizzyStarsOrbit);
  headGroup.add(dizzyFaceGroup);

  // Dedicated headgear pivot parented directly to headGroup so turbans, glasses & headbands
  // stay anchored to exact anatomical cranium pivots even when MediaPipe 3D heads load
  const headgearGroup = new THREE.Group();
  headgearGroup.name = 'headgearGroup';
  headGroup.add(headgearGroup);

  if (appearance.headgear === 'headband') {
    const band = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(0.198, 0.022, 10, 26)),
      trimMat
    );
    band.rotation.x = Math.PI / 2;
    band.scale.set(faceSpec.headWidth * 1.04, faceSpec.headDepth * 1.02, 1);
    band.position.y = 0.12;
    headgearGroup.add(band);

    const tailGeo = trackGeo(new THREE.BoxGeometry(0.045, 0.22, 0.012));
    const tail1 = new THREE.Mesh(tailGeo, trimMat);
    tail1.position.set(-0.038, 0.02, -0.22);
    tail1.rotation.set(0.45, 0, 0.2);
    const tail2 = new THREE.Mesh(tailGeo, trimMat);
    tail2.position.set(0.038, 0.0, -0.22);
    tail2.rotation.set(0.55, 0, -0.18);
    headgearGroup.add(tail1, tail2);
  } else if (appearance.headgear === 'turban') {
    const turbanMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: appearance.vestColor,
        bumpMap: kurtaTex.bumpMap,
        bumpScale: 0.008,
        roughness: 0.84,
        metalness: 0.05,
      }),
      true,
      0.24
    );
    const wrap1 = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(0.21, 0.066, 12, 26)),
      turbanMat
    );
    wrap1.rotation.x = Math.PI / 2 - 0.16;
    wrap1.position.set(0, 0.16, -0.01);
    const wrap2 = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.218, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.52)),
      turbanMat
    );
    wrap2.position.set(0, 0.16, -0.02);
    const jewel = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.04)), brassMat);
    jewel.position.set(0, 0.205, 0.205);
    headgearGroup.add(wrap1, wrap2, jewel);
  } else if (appearance.headgear === 'sunglasses') {
    const lensMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: '#2A1406',
        roughness: 0.08,
        metalness: 0.54,
        transparent: true,
        opacity: 0.78,
        clearcoat: 1.0,
        clearcoatRoughness: 0.06,
      })
    );
    const rimGeo = trackGeo(new THREE.TorusGeometry(0.044, 0.0046, 8, 22));
    const lensGeo = trackGeo(new THREE.CircleGeometry(0.042, 20));

    const leftRim = new THREE.Mesh(rimGeo, brassMat);
    leftRim.position.set(-0.062, 0.016, 0.222);
    leftRim.scale.set(1.18, 0.94, 1);
    leftRim.rotation.y = -0.18;

    const rightRim = new THREE.Mesh(rimGeo, brassMat);
    rightRim.position.set(0.062, 0.016, 0.222);
    rightRim.scale.set(1.18, 0.94, 1);
    rightRim.rotation.y = 0.18;

    const leftLens = new THREE.Mesh(lensGeo, lensMat);
    leftLens.position.set(-0.062, 0.016, 0.221);
    leftLens.scale.set(1.17, 0.92, 1);
    leftLens.rotation.y = -0.18;

    const rightLens = new THREE.Mesh(lensGeo, lensMat);
    rightLens.position.set(0.062, 0.016, 0.221);
    rightLens.scale.set(1.17, 0.92, 1);
    rightLens.rotation.y = 0.18;

    const bridge = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.042, 0.007, 0.008)), brassMat);
    bridge.position.set(0, 0.034, 0.23);
    const topBar = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.072, 0.005, 0.006)), brassMat);
    topBar.position.set(0, 0.047, 0.229);

    const templeGeo = trackGeo(new THREE.BoxGeometry(0.006, 0.007, 0.215));
    const leftTemple = new THREE.Mesh(templeGeo, brassMat);
    leftTemple.position.set(-0.158, 0.026, 0.105);
    leftTemple.rotation.y = -0.16;
    const rightTemple = new THREE.Mesh(templeGeo, brassMat);
    rightTemple.position.set(0.158, 0.026, 0.105);
    rightTemple.rotation.y = 0.16;

    headgearGroup.add(
      leftRim,
      rightRim,
      leftLens,
      rightLens,
      bridge,
      topBar,
      leftTemple,
      rightTemple
    );
  } else if (appearance.headgear === 'glasses') {
    const rimMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: '#1E1B1A',
        roughness: 0.28,
        metalness: 0.62,
      })
    );
    const glassMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: '#FFFFFF',
        roughness: 0.04,
        metalness: 0.08,
        transparent: true,
        opacity: 0.15,
        clearcoat: 1.0,
      })
    );
    const frameGeo = trackGeo(new THREE.TorusGeometry(0.04, 0.0046, 8, 22));
    const paneGeo = trackGeo(new THREE.CircleGeometry(0.038, 18));

    const leftFrame = new THREE.Mesh(frameGeo, rimMat);
    leftFrame.position.set(-0.056, 0.017, 0.218);
    leftFrame.scale.set(1.18, 0.78, 1);
    leftFrame.rotation.y = -0.15;

    const rightFrame = new THREE.Mesh(frameGeo, rimMat);
    rightFrame.position.set(0.056, 0.017, 0.218);
    rightFrame.scale.set(1.18, 0.78, 1);
    rightFrame.rotation.y = 0.15;

    const leftPane = new THREE.Mesh(paneGeo, glassMat);
    leftPane.position.set(-0.056, 0.017, 0.217);
    leftPane.scale.set(1.16, 0.76, 1);
    leftPane.rotation.y = -0.15;

    const rightPane = new THREE.Mesh(paneGeo, glassMat);
    rightPane.position.set(0.056, 0.017, 0.217);
    rightPane.scale.set(1.16, 0.76, 1);
    rightPane.rotation.y = 0.15;

    const bridge = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.038, 0.007, 0.008)), rimMat);
    bridge.position.set(0, 0.025, 0.226);

    const templeGeo = trackGeo(new THREE.BoxGeometry(0.005, 0.006, 0.21));
    const leftTemple = new THREE.Mesh(templeGeo, rimMat);
    leftTemple.position.set(-0.148, 0.024, 0.102);
    leftTemple.rotation.y = -0.15;
    const rightTemple = new THREE.Mesh(templeGeo, rimMat);
    rightTemple.position.set(0.148, 0.024, 0.102);
    rightTemple.rotation.y = 0.15;

    headgearGroup.add(
      leftFrame,
      rightFrame,
      leftPane,
      rightPane,
      bridge,
      leftTemple,
      rightTemple
    );
  } else if (appearance.headgear === 'tilak') {
    const tilakMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: '#DC2626',
        roughness: 0.52,
        metalness: 0.04,
      })
    );
    const tilak = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.02, 0.062, 0.012)), tilakMat);
    tilak.position.set(0, 0.105, 0.21);
    headgearGroup.add(tilak);
  }

  // Real-time 2D-to-3D MediaPipe FaceLandmarker head replacement attached directly to headGroup pivot
  let rigDisposed = false;
  let mediaPipeHead: THREE.Group | null = null;
  const photoSource = profile.faceCropUrl || profile.rawPhotoUrl || profile.portraitUrl || profile.faceTextureUrl;

  if (photoSource) {
    const headConfig = resolveFighter3DConfig(profile);
    void loadImageElement(photoSource)
      .then((img) => {
        // Immediately paint feathered oval portrait onto the front-mounted curved face shell
        if (!rigDisposed) {
          const texSize = isMobile ? 256 : 512;
          const c = document.createElement('canvas');
          c.width = texSize;
          c.height = texSize;
          const ctx = c.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, texSize, texSize);
            // Center-crop square/portrait face region cleanly onto front of head
            const iw = img.naturalWidth || img.width;
            const ih = img.naturalHeight || img.height;
            const cropSize = Math.min(iw, ih) * (profile.faceCropUrl ? 0.98 : 0.86);
            const sx = (iw - cropSize) * 0.5;
            const sy = Math.max(0, (ih - cropSize) * 0.28);
            ctx.save();
            ctx.beginPath();
            ctx.ellipse(
              texSize * 0.5,
              texSize * 0.5,
              texSize * 0.5,
              texSize * 0.5,
              0,
              0,
              Math.PI * 2
            );
            ctx.clip();
            ctx.drawImage(img, sx, sy, cropSize, cropSize, 0, 0, texSize, texSize);
            ctx.restore();

            // Soft feathered oval alpha edge so photo blends organically into sculpted head skin
            ctx.globalCompositeOperation = 'destination-in';
            const feather = ctx.createRadialGradient(
              texSize * 0.5,
              texSize * 0.5,
              texSize * 0.28,
              texSize * 0.5,
              texSize * 0.5,
              texSize * 0.47
            );
            feather.addColorStop(0, 'rgba(255,255,255,1)');
            feather.addColorStop(0.74, 'rgba(255,255,255,0.96)');
            feather.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = feather;
            ctx.fillRect(0, 0, texSize, texSize);

            const photoTex = new THREE.CanvasTexture(c);
            photoTex.colorSpace = THREE.SRGBColorSpace;
            photoTex.anisotropy = effAniso;
            textures.push(photoTex);
            curvedPhotoMat.map = photoTex;
            curvedPhotoMat.opacity = 1;
            // The photo already shows eyes, brows and facial hair: hide the built-in ones drawn on top of it.
            fallbackHeadGroup.traverse((o) => {
              if (o.userData.faceFeature) o.visible = false;
            });
            curvedPhotoMat.needsUpdate = true;
          }
        }
        // Face-detection head replacement removed: the photo shell above is the face.
        return null as THREE.Group | null;
      })
      .then((mpHead) => {
        if (!mpHead) return;
        if (rigDisposed) {
          disposeHeadGroup(mpHead);
          return;
        }
        if (!mpHead.userData.hasDetectedFace) {
          disposeHeadGroup(mpHead);
          return;
        }
        // Align flush MediaPipe 3D head cleanly over the sculpted neck pivot (+Z, rotation.y = 0)
        mpHead.rotation.set(0, 0, 0);
        mpHead.scale.setScalar(0.242);
        mpHead.position.set(0, 0.03, 0.01);
        mpHead.traverse((obj) => {
          if (obj instanceof THREE.Mesh && obj.material instanceof THREE.MeshStandardMaterial) {
            if (obj.material.map) {
              obj.material.map.anisotropy = Math.min(isMobile ? 2 : 8, effAniso);
            }
            applyWarmRimHighlight(obj.material, 0.2);
            obj.material.needsUpdate = true;
            if (obj.userData.isFacePhotoMesh) {
              facePhotoMaterials.push(obj.material);
            } else {
              hitFlashMaterials.push(obj.material);
            }
          }
        });
        mediaPipeHead = mpHead;
        fallbackHeadGroup.visible = false;
        headGroup.remove(fallbackHeadGroup);
        headGroup.add(mpHead);
      })
      .catch(() => {
        // Keep curved front-mounted photo fallback head seamlessly if offline or MediaPipe unavailable
      });
  }

  // ── SCULPTED MUSCULAR ARMS, ROLLED FABRIC CUFFS & ARTICULATED HANDS ───────
  const upperArmGeo = trackGeo(createUpperArmGeometry(bodySpec.shoulderMass));
  const rolledSleeveGeo = trackGeo(createRolledSleeveGeometry(bodySpec.shoulderMass));
  const cuffRingGeo = trackGeo(
    new THREE.TorusGeometry(0.105 * (0.94 + bodySpec.shoulderMass * 0.08), 0.022, 10, 22)
  );
  const forearmGeo = trackGeo(createForearmGeometry(bodySpec.shoulderMass));
  const palmBlockGeo = trackGeo(new THREE.BoxGeometry(0.092, 0.098, 0.056));
  const knuckleBridgeGeo = trackGeo(new THREE.BoxGeometry(0.096, 0.032, 0.058));
  const fingerBlockGeo = trackGeo(new THREE.BoxGeometry(0.021, 0.048, 0.032));
  const thumbBaseGeo = trackGeo(new THREE.BoxGeometry(0.026, 0.044, 0.028));
  const thumbTipGeo = trackGeo(new THREE.BoxGeometry(0.023, 0.036, 0.025));

  const limbRadial = bodySpec.limbScale / bodySpec.widthScale;
  const deltoidSocketGeo = trackGeo(new THREE.SphereGeometry(0.112 * (0.94 + bodySpec.shoulderMass * 0.08), 12, 10));
  const hipSocketGeo = trackGeo(new THREE.SphereGeometry(0.116, 12, 10));

  const buildArm = (side: -1 | 1) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(
      side * (0.362 * bodySpec.shoulderMass + Math.max(0, bodySpec.bellyBulge) * 0.1),
      0.492,
      0
    );
    shoulder.scale.set(limbRadial, 1, bodySpec.limbScale / bodySpec.depthScale);
    torso.add(shoulder);

    // Anatomical deltoid joint-socket cap so raised arms & wide hooks never reveal armpit seams
    const deltoidSocket = new THREE.Mesh(deltoidSocketGeo, vestMat);
    deltoidSocket.scale.set(0.96, 1.04, 0.96);
    deltoidSocket.castShadow = true;
    shoulder.add(deltoidSocket);

    // Rolled woven cotton kurta sleeve over broad deltoid & upper bicep
    const sleeve = new THREE.Mesh(rolledSleeveGeo, vestMat);
    sleeve.castShadow = true;
    sleeve.receiveShadow = true;
    shoulder.add(sleeve);

    // Double folded-cloth cuff rings (TorusGeometry) at the rolled-up sleeve hem!
    const cuffUpper = new THREE.Mesh(cuffRingGeo, vestMat);
    cuffUpper.rotation.x = Math.PI / 2 + 0.05;
    cuffUpper.position.y = -0.138;
    cuffUpper.castShadow = true;
    const cuffLower = new THREE.Mesh(cuffRingGeo, vestMat);
    cuffLower.rotation.x = Math.PI / 2 - 0.04;
    cuffLower.scale.setScalar(1.03);
    cuffLower.position.y = -0.162;
    cuffLower.castShadow = true;
    shoulder.add(cuffUpper, cuffLower);

    // Sculpted muscular upper arm emerging below rolled cloth cuff
    const upperArm = new THREE.Mesh(upperArmGeo, limbSkinMat);
    upperArm.castShadow = true;
    upperArm.receiveShadow = true;
    shoulder.add(upperArm);

    const elbow = new THREE.Group();
    elbow.position.y = -0.33;
    shoulder.add(elbow);

    // Elbow joint cap for clean bend continuity
    const elbowCap = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.072, 12, 10)), limbSkinMat);
    elbow.add(elbowCap);

    // Sculpted anatomical muscular forearm (thickest near elbow, tapering cleanly to wrist)
    const forearm = new THREE.Mesh(forearmGeo, limbSkinMat);
    forearm.castShadow = true;
    forearm.receiveShadow = true;
    elbow.add(forearm);

    // Traditional steel kara bangle on left wrist (matching village portraits) + martial wrist tape
    if (side === -1) {
      const kara = new THREE.Mesh(
        trackGeo(new THREE.TorusGeometry(0.058, 0.0085, 8, 20)),
        silverMat
      );
      kara.rotation.x = Math.PI / 2;
      kara.position.y = -0.232;
      elbow.add(kara);
    }

    const wristWrap = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.056, 0.052, 0.082, 14)),
      wrapMat
    );
    wristWrap.position.y = -0.265;
    wristWrap.castShadow = true;
    elbow.add(wristWrap);

    // Sculpted articulated martial arts fist (beveled palm + 4 curled finger blocks + separate articulated thumb)
    const fistGroup = new THREE.Group();
    fistGroup.position.y = -0.34;

    const palm = new THREE.Mesh(palmBlockGeo, skinMat);
    palm.position.set(0, 0.004, -0.004);
    palm.castShadow = true;
    fistGroup.add(palm);

    const knuckleBar = new THREE.Mesh(knuckleBridgeGeo, skinMat);
    knuckleBar.position.set(0, -0.036, 0.008);
    knuckleBar.castShadow = true;
    fistGroup.add(knuckleBar);

    // 4 individual curled finger blocks (index -> pinky with natural anatomical step)
    const fingerOffsets = [-0.034, -0.011, 0.012, 0.034];
    const fingerLengths = [0.98, 1.06, 1.0, 0.84];
    for (let fIdx = 0; fIdx < 4; fIdx++) {
      const fBlock = new THREE.Mesh(fingerBlockGeo, skinMat);
      fBlock.scale.set(0.95, fingerLengths[fIdx], 1.0);
      fBlock.position.set(fingerOffsets[fIdx] * side, -0.038 - (fingerLengths[fIdx] - 0.95) * 0.014, 0.032);
      fBlock.rotation.x = 0.58;
      fBlock.castShadow = true;
      fistGroup.add(fBlock);
    }

    // Separate articulated thumb wrapping cleanly across the curled fingers
    const thumbBase = new THREE.Mesh(thumbBaseGeo, skinMat);
    thumbBase.position.set(-side * 0.052, -0.006, 0.022);
    thumbBase.rotation.set(0.32, -side * 0.25, side * 0.45);
    thumbBase.castShadow = true;
    fistGroup.add(thumbBase);

    const thumbTip = new THREE.Mesh(thumbTipGeo, skinMat);
    thumbTip.position.set(-side * 0.024, -0.028, 0.044);
    thumbTip.rotation.set(0.28, -side * 0.15, side * 1.18);
    thumbTip.castShadow = true;
    fistGroup.add(thumbTip);

    // Subtle cloth knuckle wrap over back of hand
    const handStrap = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.102, 0.042, 0.068)),
      wrapMat
    );
    handStrap.position.set(0, 0.008, -0.002);
    fistGroup.add(handStrap);

    elbow.add(fistGroup);

    return { shoulder, elbow };
  };

  const leftArm = buildArm(-1);
  const rightArm = buildArm(1);

  // ── SEPARATE ARTICULATED LEGS (leftLegGroup & rightLegGroup) ───────────────
  const thighGeo = trackGeo(createStyledThighGeometry(lowerOutfitStyle));
  const bareCalfGeo = trackGeo(createBareCalfGeometry());
  const clothCalfGeo = trackGeo(createStyledCalfClothGeometry(lowerOutfitStyle));
  const kneeCreaseGeo = trackGeo(new THREE.TorusGeometry(0.088, 0.012, 8, 18));
  const ankleCreaseGeo = trackGeo(new THREE.TorusGeometry(0.079, 0.011, 8, 18));
  const rolledCuffGeo = trackGeo(new THREE.TorusGeometry(0.081, 0.021, 10, 22));
  const salwarCuffGeo = trackGeo(new THREE.TorusGeometry(0.064, 0.014, 8, 18));
  const dhotiThighBandGeo = trackGeo(new THREE.TorusGeometry(0.118, 0.017, 8, 20));
  const dhotiHemBandGeo = trackGeo(new THREE.TorusGeometry(0.081, 0.015, 8, 20));

  const buildLeg = (side: -1 | 1) => {
    const legGroup = new THREE.Group();
    legGroup.name = side === -1 ? 'leftLegGroup' : 'rightLegGroup';
    // Distinct hip separation so clear open space always reads between legs in stances & strides
    legGroup.position.set(side * 0.16, -0.05, 0);
    legGroup.scale.set(limbRadial, 1, bodySpec.limbScale / bodySpec.depthScale);
    hips.add(legGroup);

    // Anatomical hip joint-socket cap so wide kicks, flying knees & knockdowns never visually detach legs
    const hipSocket = new THREE.Mesh(hipSocketGeo, pantsMat);
    hipSocket.scale.set(1.04, 0.96, 1.02);
    hipSocket.castShadow = true;
    legGroup.add(hipSocket);

    const thigh = new THREE.Mesh(thighGeo, pantsMat);
    thigh.castShadow = true;
    thigh.receiveShadow = true;
    legGroup.add(thigh);

    // Split Dhoti diagonal tucked thigh wrap band hugging each individual leg
    if (lowerOutfitStyle === 'split_dhoti') {
      const thighWrap = new THREE.Mesh(dhotiThighBandGeo, pantsMat);
      thighWrap.position.set(0, -0.22, 0);
      thighWrap.rotation.set(Math.PI / 2 + 0.34, 0, side * 0.22);
      thighWrap.castShadow = true;
      legGroup.add(thighWrap);
    }

    const knee = new THREE.Group();
    knee.position.y = -0.44;
    legGroup.add(knee);

    // Sculpted fabric knee articulation cap
    const kneeCap = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.084, 12, 10)),
      pantsMat
    );
    kneeCap.scale.set(1.0, 0.92, 1.04);
    knee.add(kneeCap);

    // Subtle articulated knee-bend fabric crease ring
    const kneeCrease = new THREE.Mesh(kneeCreaseGeo, pantsMat);
    kneeCrease.rotation.set(Math.PI / 2 - 0.14, 0, 0);
    kneeCrease.position.set(0, -0.025, -0.006);
    knee.add(kneeCrease);

    // Bare anatomical lower calf / ankle core beneath rolled cuffs or split dhoti hem
    if (lowerOutfitStyle === 'rolled_trousers' || lowerOutfitStyle === 'split_dhoti') {
      const bareCalf = new THREE.Mesh(bareCalfGeo, limbSkinMat);
      bareCalf.castShadow = true;
      bareCalf.receiveShadow = true;
      knee.add(bareCalf);
    }

    // Tailored individual-leg cloth sleeve (rolled trouser shin / tapered Pathani salwar / wrapped split dhoti)
    const clothCalf = new THREE.Mesh(clothCalfGeo, pantsMat);
    clothCalf.castShadow = true;
    clothCalf.receiveShadow = true;
    knee.add(clothCalf);

    if (lowerOutfitStyle === 'rolled_trousers') {
      // Two subtle stacked fabric crease rings above the ankle + crisp rolled-up trouser cuff!
      const creaseUpper = new THREE.Mesh(ankleCreaseGeo, pantsMat);
      creaseUpper.rotation.set(Math.PI / 2 + 0.08, 0, 0);
      creaseUpper.position.set(0, -0.245, 0);
      const creaseLower = new THREE.Mesh(ankleCreaseGeo, pantsMat);
      creaseLower.rotation.set(Math.PI / 2 - 0.06, 0, 0);
      creaseLower.position.set(0, -0.278, 0);
      const rolledCuff = new THREE.Mesh(rolledCuffGeo, cuffMat);
      rolledCuff.rotation.x = Math.PI / 2;
      rolledCuff.position.set(0, -0.315, 0);
      rolledCuff.castShadow = true;
      knee.add(creaseUpper, creaseLower, rolledCuff);
    } else if (lowerOutfitStyle === 'pathani_salwar') {
      // Tapered Pathani salwar fitted ankle cuff + soft stacked churidar cloth folds
      const salwarFoldA = new THREE.Mesh(salwarCuffGeo, pantsMat);
      salwarFoldA.rotation.set(Math.PI / 2 + 0.06, 0, 0);
      salwarFoldA.position.set(0, -0.355, 0);
      const salwarCuff = new THREE.Mesh(salwarCuffGeo, pantsMat);
      salwarCuff.rotation.x = Math.PI / 2;
      salwarCuff.position.set(0, -0.388, 0);
      salwarCuff.castShadow = true;
      knee.add(salwarFoldA, salwarCuff);
    } else {
      // Split Dhoti mid-calf tucked cloth fold border cleanly separating wrapped cloth from bare calf
      const dhotiHem = new THREE.Mesh(dhotiHemBandGeo, pantsMat);
      dhotiHem.rotation.set(Math.PI / 2 + 0.16, 0, side * 0.12);
      dhotiHem.position.set(0, -0.24, 0);
      dhotiHem.castShadow = true;
      knee.add(dhotiHem);
    }

    // Sculpted human foot + leather chappal sandal (sole + heel + cross-straps + toes) or combat boots
    const footGroup = new THREE.Group();
    footGroup.position.set(0, -0.425, 0.04);

    if (!useBoots) {
      // Sculpted bare foot arch + subtle toes resting on layered village leather chappal
      const heelCup = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.056, 10, 8)), skinMat);
      heelCup.scale.set(0.92, 0.65, 1.05);
      heelCup.position.set(0, 0.008, -0.042);
      footGroup.add(heelCup);

      const instep = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.06, 12, 10)), skinMat);
      instep.scale.set(0.96, 0.56, 1.65);
      instep.position.set(0, 0.008, 0.022);
      instep.castShadow = true;
      footGroup.add(instep);

      // Sculpted big toe + curled toe block at front of sandal
      const bigToe = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.022, 8, 8)), skinMat);
      bigToe.scale.set(0.95, 0.68, 1.35);
      bigToe.position.set(-side * 0.028, -0.004, 0.112);
      const outerToes = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.06, 0.024, 0.036)), skinMat);
      outerToes.position.set(side * 0.016, -0.005, 0.106);
      footGroup.add(bigToe, outerToes);

      // Layered leather chappal sole + raised heel pad
      const sandalSole = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.068, 0.072, 0.02, 16)),
        leatherSoleMat
      );
      sandalSole.scale.set(0.98, 1, 1.98);
      sandalSole.position.set(0, -0.026, 0.024);
      sandalSole.castShadow = true;
      footGroup.add(sandalSole);

      const heelPad = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.058, 0.062, 0.014, 12)),
        leatherSoleMat
      );
      heelPad.scale.set(0.94, 1, 1.05);
      heelPad.position.set(0, -0.036, -0.048);
      footGroup.add(heelPad);

      // Crisscrossed stitched leather chappal cross-straps (X-pattern over instep + front toe loop)
      const crossStrapGeo = trackGeo(new THREE.TorusGeometry(0.058, 0.011, 6, 16, Math.PI));
      const crossStrapA = new THREE.Mesh(crossStrapGeo, leatherMat);
      crossStrapA.position.set(0, 0.004, 0.032);
      crossStrapA.rotation.set(0.24, 0.42, 0.08);
      const crossStrapB = new THREE.Mesh(crossStrapGeo, leatherMat);
      crossStrapB.position.set(0, 0.004, 0.032);
      crossStrapB.rotation.set(0.24, -0.42, -0.08);
      const toeStrap = new THREE.Mesh(
        trackGeo(new THREE.TorusGeometry(0.044, 0.0085, 6, 14, Math.PI)),
        leatherMat
      );
      toeStrap.position.set(-side * 0.008, -0.002, 0.088);
      toeStrap.rotation.x = 0.28;
      footGroup.add(crossStrapA, crossStrapB, toeStrap);
    } else {
      // Rugged dark leather village combat boot
      const bootBody = new THREE.Mesh(
        trackGeo(new THREE.SphereGeometry(0.068, 12, 10)),
        leatherMat
      );
      bootBody.scale.set(0.98, 0.72, 1.85);
      bootBody.position.set(0, 0.005, 0.018);
      bootBody.castShadow = true;
      footGroup.add(bootBody);

      const bootSole = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.07, 0.072, 0.022, 14)),
        leatherSoleMat
      );
      bootSole.scale.set(1.0, 1, 1.9);
      bootSole.position.set(0, -0.026, 0.02);
      footGroup.add(bootSole);

      const bootAnkle = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.066, 0.063, 0.115, 12)),
        leatherMat
      );
      bootAnkle.position.set(0, 0.056, -0.032);
      footGroup.add(bootAnkle);
    }

    // Ground-tracking marker for per-foot soft dark ambient-occlusion shadow discs
    const footMarker = new THREE.Object3D();
    footMarker.position.set(0, -0.03, 0.02);
    footGroup.add(footMarker);

    knee.add(footGroup);

    return { hip: legGroup, knee, footMarker };
  };

  const leftLeg = buildLeg(-1);
  const rightLeg = buildLeg(1);

  const dispose = () => {
    rigDisposed = true;
    if (mediaPipeHead) {
      disposeHeadGroup(mediaPipeHead);
      mediaPipeHead = null;
    }
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
    textures.forEach((t) => t.dispose());
  };

  return {
    root,
    bodyRoot,
    bodyBaseScale,
    headBaseScale,
    hips,
    torso,
    headGroup,
    leftShoulder: leftArm.shoulder,
    leftElbow: leftArm.elbow,
    rightShoulder: rightArm.shoulder,
    rightElbow: rightArm.elbow,
    leftHip: leftLeg.hip,
    leftKnee: leftLeg.knee,
    rightHip: rightLeg.hip,
    rightKnee: rightLeg.knee,
    leftFootMarker: leftLeg.footMarker,
    rightFootMarker: rightLeg.footMarker,
    leftFootShadow,
    rightFootShadow,
    kurtaFlaps,
    shadowDisc,
    rageRing,
    hitFlashMaterials,
    facePhotoMaterials,
    dizzyFaceGroup,
    strikeTrailGroup,
    strikeTrailMat,
    faceMaterial,
    faceTexture,
    dispose,
  };
}

// Reusable scratch object for allocation-free 3-phase attack evaluation
const _threePhase = { wind: 0, strike: 0, recovery: 0 };

/**
 * Evaluates a crisp 3-phase martial arts timing envelope mapped to exact proportions:
 * Anticipation Wind-Up (0.08s = 28.5%) -> Fast Snap Strike (0.06s = 21.5%) -> Hold & Recovery (0.14s = 50%).
 */
function evalThreePhase(rawPhase: number) {
  const p = Math.min(1, Math.max(0, rawPhase));
  const WIND_END = 0.285;
  const SNAP_END = 0.5;
  const HOLD_END = 0.64;

  if (p < WIND_END) {
    const t = p / WIND_END;
    // Smooth coil-in anticipation
    _threePhase.wind = t * t * (3 - 2 * t);
    _threePhase.strike = 0;
    _threePhase.recovery = 0;
  } else if (p < SNAP_END) {
    const t = (p - WIND_END) / (SNAP_END - WIND_END);
    // Explosive exponential snap strike
    const snapOut = 1 - Math.pow(1 - t, 3);
    _threePhase.wind = 1 - snapOut;
    _threePhase.strike = snapOut;
    _threePhase.recovery = 0;
  } else if (p < HOLD_END) {
    // Crisp impact hold at full extension for silhouette readability
    _threePhase.wind = 0;
    _threePhase.strike = 1;
    _threePhase.recovery = 0;
  } else {
    // Smooth damped recovery back to stance
    const t = (p - HOLD_END) / (1 - HOLD_END);
    const ease = t * t * (3 - 2 * t);
    _threePhase.wind = 0;
    _threePhase.strike = 1 - ease;
    _threePhase.recovery = ease;
  }
  return _threePhase;
}

/**
 * Procedural Tekken-style martial arts skeletal animator!
 * Drives crisp 3-phase fighting style choreography, strict anti-clipping joint clamps,
 * side-slit kurta cloth physics, and grounded per-foot AO contact shadows.
 */
export function applyFighterPose(
  rig: ArticulatedFighterRig,
  action: CombatAction,
  phase: number, // 0..1 progress through current action
  time: number,
  facing: 1 | -1,
  yHeight: number,
  hitFlash: number,
  rageReady: boolean,
  style: FightingStyle = 'bollywood_hero',
  vx = 0,
  visualYaw?: number,
  vy = 0,
  landingSquash = 0
) {
  // Smooth damped turning toward movement direction (falls back to 3/4 Tekken turn)
  const baseYaw = facing === 1 ? Math.PI * 0.4 : -Math.PI * 0.4;
  rig.root.rotation.y = visualYaw !== undefined ? visualYaw : baseYaw;

  // Keep shadow & floor ring grounded even during jumps (clear depth perception while airborne!)
  rig.shadowDisc.position.y = 0.024 - yHeight;
  const shadowScale = Math.max(0.36, 1 - yHeight * 0.22);
  rig.shadowDisc.scale.setScalar(shadowScale);
  const shMat = rig.shadowDisc.material as THREE.MeshBasicMaterial;
  shMat.opacity = Math.max(0.34, 0.72 - yHeight * 0.14);
  rig.rageRing.position.y = 0.032 - yHeight;
  if (rageReady) {
    const pulse = 1 + Math.sin(time * 8) * 0.08;
    rig.rageRing.scale.setScalar(pulse);
    (rig.rageRing.material as THREE.MeshBasicMaterial).opacity = 0.85;
  } else {
    rig.rageRing.scale.setScalar(1);
    (rig.rageRing.material as THREE.MeshBasicMaterial).opacity = 0.36;
  }

  // Crisp arcade WHITE hit-flash on body meshes
  for (let i = 0; i < rig.hitFlashMaterials.length; i++) {
    const m = rig.hitFlashMaterials[i];
    if (hitFlash > 0.01) {
      const f = Math.min(1, hitFlash) * 0.96;
      m.emissive.setRGB(f, f, f);
    } else {
      m.emissive.setRGB(0, 0, 0);
    }
  }

  // Hurt & Dizzy facial expression swaps (red tint + slight squash on hurt, dizzy spiral/stars on KO)
  const isHurtFace = hitFlash > 0.05 || action === 'hitstun' || action === 'thrown';
  const isDizzyFace = action === 'ko';
  for (let i = 0; i < rig.facePhotoMaterials.length; i++) {
    const fm = rig.facePhotoMaterials[i];
    if (isHurtFace) {
      fm.color.setRGB(1.0, 0.36, 0.3);
      fm.emissive.setRGB(0.42, 0.04, 0.02);
    } else if (isDizzyFace) {
      fm.color.setRGB(0.92, 0.86, 0.72);
      fm.emissive.setRGB(0.08, 0.06, 0.01);
    } else {
      fm.color.setRGB(1, 1, 1);
      fm.emissive.setRGB(0, 0, 0);
    }
  }
  if (isHurtFace) {
    rig.headGroup.scale.set(
      rig.headBaseScale.x * 1.09,
      rig.headBaseScale.y * 0.87,
      rig.headBaseScale.z * 1.04
    );
  } else {
    rig.headGroup.scale.copy(rig.headBaseScale);
  }
  rig.dizzyFaceGroup.visible = isDizzyFace;
  if (isDizzyFace) {
    for (let i = 0; i < rig.dizzyFaceGroup.children.length; i++) {
      const ch = rig.dizzyFaceGroup.children[i];
      if (ch.name === 'dizzyEyePivot') {
        ch.rotation.z = time * 10.5 * (i % 2 === 0 ? 1 : -1);
      } else if (ch.name === 'dizzyStarsOrbit') {
        ch.rotation.y = time * 5.2;
      }
    }
  }

  // Jump squash-and-stretch (takeoff squash -> mid-air stretch -> landing squash)
  let bodyScaleX = 1;
  let bodyScaleY = 1;
  let bodyScaleZ = 1;
  if (landingSquash > 0.005) {
    const sq = Math.min(1, landingSquash);
    bodyScaleX = 1 + sq * 0.16;
    bodyScaleY = 1 - sq * 0.18;
    bodyScaleZ = 1 + sq * 0.13;
  } else if (yHeight > 0.03) {
    if (yHeight < 0.45 && vy > 4.2) {
      // Launch takeoff squash
      const tq = 1 - yHeight / 0.45;
      bodyScaleX = 1 + tq * 0.12;
      bodyScaleY = 1 - tq * 0.14;
      bodyScaleZ = 1 + tq * 0.1;
    } else {
      // Mid-air vertical stretch
      const st = Math.min(1, (Math.abs(vy) / 8.5) * 0.65 + 0.35);
      bodyScaleX = 1 - st * 0.07;
      bodyScaleY = 1 + st * 0.11;
      bodyScaleZ = 1 - st * 0.07;
    }
  }
  rig.bodyRoot.scale.set(
    rig.bodyBaseScale.x * bodyScaleX,
    rig.bodyBaseScale.y * bodyScaleY,
    rig.bodyBaseScale.z * bodyScaleZ
  );

  // Neutral fighting guard defaults (slightly angled head toward viewer/opponent)
  let hipsX = 0;
  let hipsY = 0.94;
  let hipsZ = 0;
  let hipsRotX = 0.04;
  let hipsRotY = 0;
  let hipsRotZ = 0;
  let torsoRotX = 0.07;
  let torsoRotY = -0.2;
  let headRotX = -0.04;
  let headRotY = 0.22;
  let headRotZ = 0;

  let lShX = -0.92;
  let lShZ = -0.24;
  let lElX = -1.35;

  let rShX = -1.05;
  let rShZ = 0.26;
  let rElX = -1.48;

  let lHipX = -0.26;
  let lKneeX = 0.44;
  let rHipX = 0.22;
  let rKneeX = 0.38;

  const snap = (t: number) => Math.sin(Math.min(1, Math.max(0, t)) * Math.PI);

  switch (action) {
    case 'idle': {
      const bounce = Math.sin(
        time * (style === 'kalari_kicker' ? 7.4 : style === 'street_boxer' ? 6.8 : style === 'bollywood_hero' ? 5.6 : 4.8)
      );
      // Gentle breathing bob + slight side-to-side weight shift so idle stance feels alive
      const weightShift = Math.sin(time * 2.15);
      hipsX = weightShift * 0.048;
      hipsRotZ = weightShift * 0.036;
      headRotZ = -weightShift * 0.045;
      if (style === 'kushti_pehelwan') {
        // Low, wide sumo/wrestler crouch stance with heavy forward torso lean
        hipsY = 0.8 + bounce * 0.028;
        hipsRotY = Math.sin(time * 2.2) * 0.06;
        torsoRotX = 0.24 + bounce * 0.024;
        torsoRotY = -0.14;
        headRotX = -0.16;
        lShX = -0.84;
        lShZ = -0.52;
        lElX = -1.12;
        rShX = -0.88;
        rShZ = 0.52;
        rElX = -1.12;
        lHipX = -0.56;
        lKneeX = 0.96;
        rHipX = 0.44;
        rKneeX = 0.82;
      } else if (style === 'kalari_kicker') {
        // Upright agile Kalaripayattu martial stance with springy footwork
        hipsY = 0.96 + Math.abs(bounce) * 0.05;
        hipsRotY = -0.18;
        torsoRotX = 0.02 + bounce * 0.02;
        torsoRotY = -0.26;
        headRotY = 0.32;
        lShX = -1.24 + bounce * 0.1;
        lShZ = -0.3;
        lElX = -0.78;
        rShX = -0.82 - bounce * 0.08;
        rShZ = 0.36;
        rElX = -1.24;
        lHipX = -0.34;
        lKneeX = 0.54;
        rHipX = 0.3;
        rKneeX = 0.42;
      } else if (style === 'street_boxer') {
        // Tight high boxing guard near chin with rhythmic head-bob & shoulder weave
        const bob = Math.sin(time * 4.2);
        const weave = Math.cos(time * 4.2);
        hipsY = 0.91 + Math.abs(bob) * 0.032;
        hipsRotY = -0.16 + weave * 0.08;
        torsoRotX = 0.17 + Math.abs(bob) * 0.04;
        torsoRotY = -0.22 + weave * 0.12;
        headRotX = -0.12 + bob * 0.06;
        headRotY = 0.28 - weave * 0.08;
        headRotZ = weave * 0.12;
        // Hands high near chin, kept cleanly outside chest width via shoulder angles
        lShX = -1.42 + bob * 0.06;
        lShZ = -0.06;
        lElX = -1.86;
        rShX = -1.48 - bob * 0.06;
        rShZ = 0.06;
        rElX = -1.92;
        lHipX = -0.32;
        lKneeX = 0.52;
        rHipX = 0.28;
        rKneeX = 0.46;
      } else if (style === 'weapon_master') {
        // Wide balanced akhara stance poised for broad horizontal weapon arcs
        hipsY = 0.9 + bounce * 0.028;
        hipsRotY = -0.2;
        torsoRotX = 0.08 + bounce * 0.02;
        torsoRotY = -0.22;
        lShX = -0.96;
        lShZ = -0.4;
        lElX = -0.95;
        rShX = -0.74 + bounce * 0.07;
        rShZ = 0.48;
        rElX = -0.92;
        lHipX = -0.4;
        lKneeX = 0.62;
        rHipX = 0.34;
        rKneeX = 0.52;
      } else {
        // Bollywood Hero: dramatic chest-out heroic idle bounce!
        hipsY = 0.95 + Math.abs(bounce) * 0.045;
        hipsRotY = Math.sin(time * 2.6) * 0.08;
        torsoRotX = -0.08 + bounce * 0.03;
        torsoRotY = -0.12 + Math.sin(time * 2.6) * 0.1;
        headRotX = 0.03;
        headRotY = 0.18;
        lShX = -0.76 + bounce * 0.09;
        lShZ = -0.42;
        lElX = -0.98;
        rShX = -0.88 - bounce * 0.09;
        rShZ = 0.44;
        rElX = -1.06;
        lHipX = -0.26;
        lKneeX = 0.38;
        rHipX = 0.24;
        rKneeX = 0.34;
      }
      break;
    }

    case 'walk_fwd':
    case 'walk_back': {
      const dir = action === 'walk_fwd' ? 1 : -1;
      const stride = Math.sin(time * 11.5 * dir);
      // Bounce body per step, lean torso forward into movement, opposite-phase arm & leg swing
      hipsY = 0.91 + Math.abs(stride) * 0.056;
      hipsRotY = stride * 0.14;
      hipsRotZ = stride * 0.045;
      torsoRotX = dir === 1 ? 0.22 : -0.04;
      torsoRotY = -stride * 0.18;
      headRotX = dir === 1 ? -0.12 : 0.04;
      headRotY = 0.16 + stride * 0.06;
      lHipX = stride * 0.62;
      lKneeX = Math.max(0.14, -stride * 0.6 + 0.38);
      rHipX = -stride * 0.62;
      rKneeX = Math.max(0.14, stride * 0.6 + 0.38);
      // Opposite-phase arm pump!
      lShX = -0.86 - stride * 0.52;
      lShZ = -0.25;
      lElX = -1.28 + Math.max(0, stride) * 0.28;
      rShX = -0.86 + stride * 0.52;
      rShZ = 0.25;
      rElX = -1.28 + Math.max(0, -stride) * 0.28;
      break;
    }

    case 'sprint': {
      const stride = Math.sin(time * 19);
      hipsY = 0.86 + Math.abs(stride) * 0.07;
      hipsRotY = stride * 0.16;
      torsoRotX = 0.36;
      torsoRotY = stride * 0.16;
      headRotX = -0.22;
      lHipX = stride * 0.92;
      lKneeX = Math.max(0.2, -stride * 0.85 + 0.55);
      rHipX = -stride * 0.92;
      rKneeX = Math.max(0.2, stride * 0.85 + 0.55);
      lShX = -0.75 - stride * 0.72;
      lShZ = -0.26;
      lElX = -1.45;
      rShX = -0.75 + stride * 0.72;
      rShZ = 0.26;
      rElX = -1.45;
      break;
    }

    case 'dash_attack': {
      const tp = evalThreePhase(phase);
      if (style === 'bollywood_hero') {
        // Airborne two-footed Bollywood dropkick charge!
        hipsY = 0.94 - tp.wind * 0.16 + tp.strike * 0.34;
        hipsRotZ = -tp.strike * 0.62;
        torsoRotX = 0.14 * tp.wind - 0.36 * tp.strike;
        rHipX = -0.35 * tp.wind - 1.72 * tp.strike;
        rKneeX = 0.75 * tp.wind + 0.14;
        lHipX = -0.35 * tp.wind - 1.56 * tp.strike;
        lKneeX = 0.75 * tp.wind + 0.18;
        lShX = -0.55;
        lShZ = -0.58;
        lElX = -0.6;
        rShX = -0.55;
        rShZ = 0.58;
        rElX = -0.6;
      } else if (style === 'kalari_kicker') {
        // Explosive Kalaripayattu flying knee launch!
        hipsY = 0.92 - tp.wind * 0.18 + tp.strike * 0.36;
        hipsRotY = -0.25 * tp.wind + 0.35 * tp.strike;
        torsoRotX = 0.18 * tp.wind - 0.16 * tp.strike;
        rHipX = 0.35 * tp.wind - 1.72 * tp.strike;
        rKneeX = 0.55 + 1.42 * tp.strike;
        lHipX = -0.45 * tp.wind + 0.42 * tp.strike;
        lKneeX = 0.85 * tp.wind + 0.62 * tp.strike;
        lShX = -1.45;
        lShZ = -0.22;
        lElX = -0.95;
        rShX = -1.25;
        rShZ = 0.28;
        rElX = -1.1;
      } else {
        // Kushti Pehelwan / Street / Weapon heavy lunging shoulder barge!
        hipsY = 0.84 - tp.wind * 0.1 - tp.strike * 0.08;
        hipsRotY = 0.35 * tp.wind - 0.58 * tp.strike;
        torsoRotX = 0.18 * tp.wind + 0.46 * tp.strike;
        torsoRotY = 0.35 * tp.wind - 0.65 * tp.strike;
        headRotX = -0.26 * tp.strike;
        rShX = -0.82;
        rShZ = 0.42;
        rElX = -1.62;
        lShX = -0.92;
        lShZ = -0.36;
        lElX = -1.48;
        lHipX = -0.38 - tp.strike * 0.36;
        lKneeX = 0.62 + tp.strike * 0.44;
        rHipX = 0.22 + tp.strike * 0.58;
        rKneeX = 0.42;
      }
      break;
    }

    case 'sidestep_in':
    case 'sidestep_out': {
      const s = snap(phase);
      const dir = action === 'sidestep_in' ? -1 : 1;
      hipsY = 0.82 - s * 0.12;
      hipsRotZ = dir * s * 0.42;
      torsoRotY = dir * s * 0.65;
      lHipX = -0.48;
      lKneeX = 0.78;
      rHipX = 0.38;
      rKneeX = 0.72;
      break;
    }

    case 'crouch': {
      hipsY = 0.62;
      torsoRotX = 0.32;
      lHipX = -0.95;
      lKneeX = 1.48;
      rHipX = -0.78;
      rKneeX = 1.38;
      lShX = -1.1;
      rShX = -1.2;
      break;
    }

    case 'jump': {
      hipsY = 0.98;
      torsoRotX = 0.22;
      lHipX = -0.82;
      lKneeX = 1.28;
      rHipX = -0.52;
      rKneeX = 1.1;
      lShX = -1.25;
      rShX = -1.35;
      break;
    }

    case 'jump_kick': {
      const ext = Math.min(1, phase * 1.4);
      hipsY = 1.02;
      hipsRotZ = -0.45 * ext;
      torsoRotX = -0.22 * ext;
      rHipX = -1.78 * ext;
      rKneeX = 0.12;
      lHipX = -0.85;
      lKneeX = 1.5;
      lShX = -0.7;
      lShZ = -0.45;
      rShX = -0.45;
      rShZ = 0.55;
      break;
    }

    case 'jump_slam': {
      const ext = Math.min(1, phase * 1.3);
      hipsY = 0.96 - ext * 0.14;
      torsoRotX = 0.48 * ext;
      lShX = -2.45 + ext * 1.75;
      lShZ = -0.12;
      lElX = -0.35;
      rShX = -2.45 + ext * 1.75;
      rShZ = 0.12;
      rElX = -0.35;
      lHipX = -0.65;
      lKneeX = 1.1;
      rHipX = -0.55;
      rKneeX = 1.05;
      break;
    }

    case 'clinch': {
      const tug = Math.sin(time * 9) * 0.06;
      hipsY = 0.88;
      torsoRotX = 0.24;
      torsoRotY = tug;
      lShX = -1.45;
      lShZ = 0.12;
      lElX = -0.65;
      rShX = -1.45;
      rShZ = -0.12;
      rElX = -0.65;
      lHipX = -0.34;
      lKneeX = 0.58;
      rHipX = 0.3;
      rKneeX = 0.5;
      break;
    }

    case 'clinch_knee': {
      const tp = evalThreePhase(phase);
      hipsY = 0.9 + tp.strike * 0.1;
      torsoRotX = 0.16 - tp.strike * 0.22;
      lShX = -1.5;
      lShZ = 0.12;
      lElX = -0.8;
      rShX = -1.5;
      rShZ = -0.12;
      rElX = -0.8;
      rHipX = 0.2 * tp.wind - 1.72 * tp.strike;
      rKneeX = 0.5 + 1.46 * tp.strike;
      lHipX = 0.15;
      lKneeX = 0.3;
      break;
    }

    case 'parry': {
      const tp = evalThreePhase(phase);
      hipsY = 0.9;
      hipsRotY = -0.18 * tp.wind + 0.32 * tp.strike;
      torsoRotX = -0.06;
      torsoRotY = -0.22 * tp.wind + 0.52 * tp.strike;
      lShX = -1.65;
      lShZ = -0.2 - 0.52 * tp.strike;
      lElX = -0.45;
      rShX = -1.65;
      rShZ = 0.2 + 0.52 * tp.strike;
      rElX = -0.45;
      break;
    }

    case 'block': {
      hipsY = 0.86;
      torsoRotX = 0.18;
      torsoRotY = 0.1;
      lShX = -1.55;
      lShZ = 0.18;
      lElX = -1.58;
      rShX = -1.55;
      rShZ = -0.18;
      rElX = -1.58;
      lHipX = -0.36;
      lKneeX = 0.65;
      rHipX = 0.26;
      rKneeX = 0.55;
      break;
    }

    case 'panic_special': {
      // Explosive 360° crowd-clearing outward burst stance!
      const tp = evalThreePhase(phase);
      hipsY = 0.84 - tp.wind * 0.1 + tp.strike * 0.18;
      hipsRotY = (phase - 0.5) * 0.9;
      torsoRotX = 0.24 * tp.wind - 0.22 * tp.strike;
      lShX = -1.18;
      lShZ = -0.25 - 1.1 * tp.strike;
      lElX = -1.45 * tp.wind - 0.25 * (1 - tp.wind);
      rShX = -1.18;
      rShZ = 0.25 + 1.1 * tp.strike;
      rElX = -1.45 * tp.wind - 0.25 * (1 - tp.wind);
      lHipX = -0.32;
      lKneeX = 0.52;
      rHipX = 0.28;
      rKneeX = 0.48;
      break;
    }

    case 'lp': {
      const tp = evalThreePhase(phase);
      // Slight eased forward body commitment into the punch (no world sliding!)
      hipsZ = -0.04 * tp.wind + 0.13 * tp.strike;
      if (style === 'bollywood_hero') {
        // Wide sweeping left hook punch!
        hipsY = 0.94 - tp.wind * 0.04 + tp.strike * 0.03;
        hipsRotY = -0.42 * tp.wind + 0.62 * tp.strike;
        torsoRotY = -0.48 * tp.wind + 0.72 * tp.strike;
        torsoRotX = 0.04 + tp.strike * 0.16;
        lShX = -1.15 - tp.strike * 0.35;
        lShZ = -1.15 * tp.wind - 0.32 * (1 - tp.wind) + tp.strike * 0.38;
        lElX = -0.95 - tp.strike * 0.25;
        rShX = -0.92;
        rShZ = 0.36;
        rElX = -1.42;
      } else if (style === 'kushti_pehelwan') {
        // Heavy open-palm left chest slap from low wrestler crouch!
        hipsY = 0.8 - tp.wind * 0.05 + tp.strike * 0.04;
        hipsRotY = -0.4 * tp.wind + 0.58 * tp.strike;
        torsoRotY = -0.44 * tp.wind + 0.64 * tp.strike;
        torsoRotX = 0.22 + tp.strike * 0.16;
        lShX = -1.2 - tp.strike * 0.38;
        lShZ = -1.1 * tp.wind - 0.45 * (1 - tp.wind) + tp.strike * 0.42;
        lElX = -0.58 + tp.strike * 0.42;
        rShX = -0.82;
        rShZ = 0.52;
        rElX = -1.18;
        lHipX = -0.56;
        lKneeX = 0.92;
        rHipX = 0.42;
        rKneeX = 0.78;
      } else if (style === 'kalari_kicker') {
        // Crisp snapping front kick (chamber wind-up -> explosive snap -> re-chamber)!
        hipsY = 0.95 + tp.strike * 0.06;
        hipsRotY = -0.22 * tp.wind + 0.28 * tp.strike;
        hipsRotZ = -0.26 * tp.strike;
        torsoRotX = 0.08 * tp.wind - 0.2 * tp.strike;
        torsoRotY = -0.26;
        lHipX = -0.14;
        lKneeX = 0.24;
        rHipX = -1.15 * tp.wind - 1.62 * tp.strike;
        rKneeX = 1.65 * tp.wind + 0.12 * tp.strike + 0.35 * tp.recovery;
        lShX = -1.18;
        lShZ = -0.34;
        lElX = -0.9;
        rShX = -0.78;
        rShZ = 0.42;
        rElX = -1.25;
      } else if (style === 'weapon_master') {
        // Broad horizontal forehand weapon arc!
        hipsY = 0.89 - tp.wind * 0.04;
        hipsRotY = 0.48 * tp.wind - 0.68 * tp.strike;
        torsoRotY = 0.56 * tp.wind - 0.82 * tp.strike;
        torsoRotX = 0.12 + tp.strike * 0.14;
        rShX = -1.42;
        rShZ = 1.25 * tp.wind + 0.35 * (1 - tp.wind) - tp.strike * 0.45;
        rElX = -0.35 + tp.strike * 0.22;
        lShX = -0.9;
        lShZ = -0.42;
        lElX = -1.1;
        lHipX = -0.4;
        lKneeX = 0.64;
        rHipX = 0.34;
        rKneeX = 0.52;
      } else {
        // Desi Street Boxer: tight, laser-straight left jab snapping from the chin!
        hipsY = 0.91 - tp.wind * 0.03;
        hipsRotY = -0.22 * tp.wind + 0.42 * tp.strike;
        torsoRotY = -0.24 * tp.wind + 0.52 * tp.strike;
        torsoRotX = 0.16 + tp.strike * 0.12;
        lShX = -1.32 - tp.strike * 0.34;
        lShZ = -0.12;
        lElX = -1.85 + tp.strike * 1.72;
        // Right hand glued high to chin guard!
        rShX = -1.48;
        rShZ = 0.08;
        rElX = -1.94;
      }
      break;
    }

    case 'lp2': {
      const tp = evalThreePhase(phase);
      hipsZ = -0.05 * tp.wind + 0.15 * tp.strike;
      if (style === 'bollywood_hero') {
        // Wide sweeping right hook punch!
        hipsY = 0.94 - tp.wind * 0.04 + tp.strike * 0.04;
        hipsRotY = 0.45 * tp.wind - 0.68 * tp.strike;
        torsoRotY = 0.54 * tp.wind - 0.78 * tp.strike;
        torsoRotX = 0.06 + tp.strike * 0.18;
        rShX = -1.2 - tp.strike * 0.35;
        rShZ = 1.18 * tp.wind + 0.32 * (1 - tp.wind) - tp.strike * 0.42;
        rElX = -0.92 - tp.strike * 0.24;
        lShX = -0.88;
        lShZ = -0.38;
        lElX = -1.35;
      } else if (style === 'kushti_pehelwan') {
        // Heavy open-palm right chest slap!
        hipsY = 0.79 - tp.wind * 0.05 + tp.strike * 0.05;
        hipsRotY = 0.44 * tp.wind - 0.64 * tp.strike;
        torsoRotY = 0.48 * tp.wind - 0.72 * tp.strike;
        torsoRotX = 0.24 + tp.strike * 0.18;
        rShX = -1.24 - tp.strike * 0.38;
        rShZ = 1.15 * tp.wind + 0.45 * (1 - tp.wind) - tp.strike * 0.45;
        rElX = -0.55 + tp.strike * 0.4;
        lShX = -0.84;
        lShZ = -0.52;
        lElX = -1.2;
        lHipX = -0.56;
        lKneeX = 0.94;
        rHipX = 0.44;
        rKneeX = 0.8;
      } else if (style === 'kalari_kicker') {
        // Sweeping low Kalaripayattu leg kick!
        hipsY = 0.74 - tp.strike * 0.16;
        hipsRotY = 0.42 * tp.wind - 0.85 * tp.strike;
        hipsRotZ = -0.28 * tp.strike;
        torsoRotX = 0.26 + tp.strike * 0.14;
        torsoRotY = 0.38 * tp.wind - 0.72 * tp.strike;
        lHipX = -0.78 - tp.strike * 0.22;
        lKneeX = 1.25 + tp.strike * 0.32;
        rHipX = 0.38 * tp.wind - 1.28 * tp.strike;
        rKneeX = 0.85 * tp.wind + 0.14;
        lShX = -0.92;
        lShZ = -0.45;
        rShX = -0.85;
        rShZ = 0.48;
      } else if (style === 'weapon_master') {
        // Broad horizontal backhand return weapon arc!
        hipsY = 0.88 - tp.wind * 0.04;
        hipsRotY = -0.52 * tp.wind + 0.72 * tp.strike;
        torsoRotY = -0.6 * tp.wind + 0.84 * tp.strike;
        torsoRotX = 0.14 + tp.strike * 0.16;
        rShX = -1.45;
        rShZ = -0.1 * tp.wind + 1.18 * tp.strike;
        rElX = -0.42 + tp.strike * 0.28;
        lShX = -0.94;
        lShZ = -0.46;
        lElX = -1.05;
        lHipX = -0.42;
        lKneeX = 0.66;
        rHipX = 0.36;
        rKneeX = 0.54;
      } else {
        // Desi Street Boxer: crisp straight right cross with full hip pivot!
        hipsY = 0.9 - tp.wind * 0.04;
        hipsRotY = 0.36 * tp.wind - 0.62 * tp.strike;
        torsoRotY = 0.38 * tp.wind - 0.68 * tp.strike;
        torsoRotX = 0.18 + tp.strike * 0.16;
        rShX = -1.36 - tp.strike * 0.34;
        rShZ = 0.12;
        rElX = -1.88 + tp.strike * 1.76;
        // Left hand glued high to chin guard!
        lShX = -1.46;
        lShZ = -0.08;
        lElX = -1.94;
      }
      break;
    }

    case 'rp': {
      const tp = evalThreePhase(phase);
      hipsZ = -0.06 * tp.wind + 0.18 * tp.strike;
      if (style === 'bollywood_hero') {
        // Wide theatrical Bollywood open-palm THAPPAD / massive sweeping hook!
        hipsY = 0.94 - tp.wind * 0.05 + tp.strike * 0.06;
        hipsRotY = 0.62 * tp.wind - 0.88 * tp.strike;
        torsoRotY = 0.68 * tp.wind - 0.98 * tp.strike;
        torsoRotX = -0.04 * tp.wind + 0.18 * tp.strike;
        rShX = -1.48;
        rShZ = 1.32 * tp.wind + 0.26 * (1 - tp.wind) - tp.strike * 0.42;
        rElX = -0.26;
        lShX = -0.68;
        lShZ = -0.58;
        lElX = -1.05;
      } else if (style === 'kushti_pehelwan') {
        // Forward lunging Kushti shoulder barge!
        hipsY = 0.8 - tp.wind * 0.08 - tp.strike * 0.06;
        hipsRotY = 0.38 * tp.wind - 0.56 * tp.strike;
        torsoRotX = 0.18 * tp.wind + 0.48 * tp.strike;
        torsoRotY = 0.36 * tp.wind - 0.62 * tp.strike;
        headRotX = -0.28 * tp.strike;
        rShX = -0.86;
        rShZ = 0.44;
        rElX = -1.64;
        lShX = -0.96;
        lShZ = -0.38;
        lElX = -1.5;
        lHipX = -0.45 - tp.strike * 0.38;
        lKneeX = 0.72 + tp.strike * 0.42;
        rHipX = 0.28 + tp.strike * 0.58;
        rKneeX = 0.44;
      } else if (style === 'kalari_kicker') {
        // Leaping Kalaripayattu Flying Knee strike!
        hipsY = 0.94 - tp.wind * 0.16 + tp.strike * 0.38;
        hipsRotY = -0.24 * tp.wind + 0.32 * tp.strike;
        torsoRotX = 0.22 * tp.wind - 0.18 * tp.strike;
        rHipX = 0.3 * tp.wind - 1.76 * tp.strike;
        rKneeX = 0.6 + 1.38 * tp.strike;
        lHipX = -0.4 * tp.wind + 0.46 * tp.strike;
        lKneeX = 0.88 * tp.wind + 0.62 * tp.strike;
        lShX = -1.48;
        lShZ = -0.24;
        lElX = -1.0;
        rShX = -1.24;
        rShZ = 0.26;
        rElX = -1.08;
      } else if (style === 'weapon_master') {
        // Heavy power horizontal weapon sweep with deep stance drive!
        hipsY = 0.88 - tp.wind * 0.08 + tp.strike * 0.05;
        hipsRotY = 0.68 * tp.wind - 0.92 * tp.strike;
        torsoRotY = 0.72 * tp.wind - 1.02 * tp.strike;
        torsoRotX = -0.06 * tp.wind + 0.24 * tp.strike;
        rShX = -1.52;
        rShZ = 1.36 * tp.wind + 0.32 * (1 - tp.wind) - tp.strike * 0.46;
        rElX = -0.22;
        lShX = -0.82;
        lShZ = -0.52;
        lElX = -0.95;
        lHipX = -0.48;
        lKneeX = 0.74;
        rHipX = 0.42;
        rKneeX = 0.62;
      } else {
        // Desi Street Boxer: rising uppercut launcher!
        hipsY = 0.9 - tp.wind * 0.16 + tp.strike * 0.18;
        hipsRotY = 0.45 * tp.wind - 0.78 * tp.strike;
        torsoRotY = 0.48 * tp.wind - 0.86 * tp.strike;
        torsoRotX = 0.28 * tp.wind - 0.28 * tp.strike;
        rShX = -0.38 * tp.wind - 1.98 * tp.strike - 0.6 * (1 - tp.wind - tp.strike);
        rShZ = 0.3 * tp.wind + 0.16 * tp.strike;
        rElX = -1.42 - tp.wind * 0.25 + tp.strike * 0.38;
        // Left guard hand stays tight near chin!
        lShX = -1.44;
        lShZ = -0.1;
        lElX = -1.92;
        lHipX = -0.45 * tp.wind - 0.2 * tp.strike;
        lKneeX = 0.88 * tp.wind + 0.26 * tp.strike;
      }
      break;
    }

    case 'combo_finisher': {
      const tp = evalThreePhase(phase);
      if (style === 'bollywood_hero') {
        // Airborne two-footed Bollywood dropkick finisher!
        hipsY = 0.94 - tp.wind * 0.18 + tp.strike * 0.38;
        hipsRotZ = -tp.strike * 0.68;
        torsoRotX = 0.2 * tp.wind - 0.38 * tp.strike;
        rHipX = -0.4 * tp.wind - 1.78 * tp.strike;
        rKneeX = 0.85 * tp.wind + 0.12;
        lHipX = -0.4 * tp.wind - 1.66 * tp.strike;
        lKneeX = 0.85 * tp.wind + 0.16;
        lShX = -0.52;
        lShZ = -0.68;
        lElX = -0.55;
        rShX = -0.52;
        rShZ = 0.68;
        rElX = -0.55;
      } else if (style === 'kushti_pehelwan') {
        // Explosive forward lunging shoulder barge + akhara shockwave finish!
        hipsY = 0.78 - tp.wind * 0.1 - tp.strike * 0.04;
        hipsRotY = 0.48 * tp.wind - 0.72 * tp.strike;
        torsoRotX = 0.16 * tp.wind + 0.5 * tp.strike;
        torsoRotY = 0.44 * tp.wind - 0.72 * tp.strike;
        headRotX = -0.3 * tp.strike;
        rShX = -0.88;
        rShZ = 0.48;
        rElX = -1.62;
        lShX = -1.04;
        lShZ = -0.42;
        lElX = -1.45;
        lHipX = -0.52 - tp.strike * 0.38;
        lKneeX = 0.82 + tp.strike * 0.42;
        rHipX = 0.34 + tp.strike * 0.62;
        rKneeX = 0.46;
      } else if (style === 'kalari_kicker') {
        // High airborne Kalaripayattu flying knee finisher!
        hipsY = 0.96 - tp.wind * 0.16 + tp.strike * 0.44;
        hipsRotY = -0.32 * tp.wind + 0.4 * tp.strike;
        torsoRotX = 0.24 * tp.wind - 0.22 * tp.strike;
        rHipX = 0.32 * tp.wind - 1.82 * tp.strike;
        rKneeX = 0.65 + 1.35 * tp.strike;
        lHipX = -0.42 * tp.wind + 0.52 * tp.strike;
        lKneeX = 0.9 * tp.wind + 0.66 * tp.strike;
        lShX = -1.52;
        lShZ = -0.26;
        lElX = -1.05;
        rShX = -1.28;
        rShZ = 0.28;
        rElX = -1.12;
      } else if (style === 'street_boxer') {
        // Sky-piercing rising uppercut launcher finisher!
        hipsY = 0.88 - tp.wind * 0.2 + tp.strike * 0.26;
        hipsRotY = 0.54 * tp.wind - 0.92 * tp.strike;
        torsoRotY = 0.56 * tp.wind - 0.96 * tp.strike;
        torsoRotX = 0.32 * tp.wind - 0.34 * tp.strike;
        rShX = -0.32 * tp.wind - 2.18 * tp.strike - 0.6 * (1 - tp.wind - tp.strike);
        rShZ = 0.32 * tp.wind + 0.18 * tp.strike;
        rElX = -1.55 * tp.wind - 0.88 * tp.strike - 1.2 * (1 - tp.wind - tp.strike);
        lShX = -1.48;
        lShZ = -0.12;
        lElX = -1.94;
        lHipX = -0.52 * tp.wind - 0.18 * tp.strike;
        lKneeX = 0.96 * tp.wind + 0.22 * tp.strike;
      } else {
        // Weapon Master: crisp 360-degree spinning horizontal sweep finisher!
        // Put the full 360° spin on hipsRotY so torso never twists unnaturally against the pelvis!
        const spinT = Math.min(1, Math.max(0, (phase - 0.22) / 0.54));
        const spinEase = 1 - Math.pow(1 - spinT, 2.2);
        hipsY = 0.88 - tp.wind * 0.08 + tp.strike * 0.08;
        hipsRotY = 0.45 * tp.wind - spinEase * Math.PI * 2;
        torsoRotY = 0.35 * tp.wind - 0.42 * tp.strike;
        torsoRotX = 0.16;
        rShX = -1.5;
        rShZ = 1.28;
        rElX = -0.18;
        lShX = -1.12;
        lShZ = -0.68;
        lElX = -0.52;
        lHipX = -0.44;
        lKneeX = 0.68;
        rHipX = 0.36;
        rKneeX = 0.56;
      }
      break;
    }

    case 'kick': {
      const tp = evalThreePhase(phase);
      hipsZ = -0.04 * tp.wind + 0.08 * tp.strike;
      if (style === 'bollywood_hero') {
        // Dramatic flying double-boot dropkick!
        hipsY = 0.96 - tp.wind * 0.14 + tp.strike * 0.32;
        hipsRotZ = -tp.strike * 0.64;
        torsoRotX = 0.16 * tp.wind - 0.36 * tp.strike;
        rHipX = -0.35 * tp.wind - 1.76 * tp.strike;
        rKneeX = 0.8 * tp.wind + 0.12;
        lHipX = -0.35 * tp.wind - 1.56 * tp.strike;
        lKneeX = 0.8 * tp.wind + 0.18;
        lShX = -0.48;
        lShZ = -0.56;
        rShX = -0.48;
        rShZ = 0.56;
      } else if (style === 'kalari_kicker') {
        // High snapping Kalaripayattu front kick with clear backward torso counter-lean!
        hipsY = 0.96 + tp.strike * 0.08;
        hipsRotY = -0.25 * tp.wind + 0.42 * tp.strike;
        hipsRotZ = -tp.strike * 0.42;
        torsoRotX = 0.1 * tp.wind - 0.32 * tp.strike;
        torsoRotY = -0.32 - tp.strike * 0.52;
        rHipX = -1.25 * tp.wind - 1.8 * tp.strike;
        rKneeX = 1.75 * tp.wind + 0.1 * tp.strike + 0.35 * tp.recovery;
        lHipX = -0.12;
        lKneeX = 0.22;
        lShX = -0.82;
        lShZ = -0.38;
        rShX = -0.58;
        rShZ = 0.46;
      } else {
        hipsY = 0.94 - tp.wind * 0.04 + tp.strike * 0.06;
        hipsRotY = -0.22 * tp.wind + 0.38 * tp.strike;
        hipsRotZ = -tp.strike * 0.4;
        torsoRotY = -0.28 - tp.strike * 0.58;
        torsoRotX = 0.08 * tp.wind - 0.28 * tp.strike;
        rHipX = 0.22 - tp.wind * 0.7 - tp.strike * 1.82;
        rKneeX = 1.15 * tp.wind + 0.12 * tp.strike + 0.35 * tp.recovery;
        lHipX = -0.12;
        lKneeX = 0.22;
        lShX = -0.7;
        lShZ = -0.34;
        rShX = -0.5;
        rShZ = 0.38;
      }
      break;
    }

    case 'sweep': {
      const tp = evalThreePhase(phase);
      const sweepSpin = Math.min(1, Math.max(0, (phase - 0.18) / 0.58)) * Math.PI * 1.65;
      hipsY = 0.54 - tp.strike * 0.06;
      hipsRotY = 0.35 * tp.wind - sweepSpin;
      torsoRotX = 0.38;
      torsoRotY = -0.35 * tp.strike;
      rHipX = 0.2 * tp.wind - 1.44 * tp.strike;
      rKneeX = 0.12;
      lHipX = -1.05;
      lKneeX = 1.68;
      lShX = -0.58;
      lShZ = -0.46;
      rShX = -0.58;
      rShZ = 0.46;
      break;
    }

    case 'spinning_heel_kick': {
      // Crisp 360-degree Taekwondo / Kalaripayattu spinning hook heel kick!
      // Full spin drives hipsRotY smoothly through 2*PI so torso never twists unnaturally.
      const tp = evalThreePhase(phase);
      const spinT = Math.min(1, Math.max(0, (phase - 0.1) / 0.68));
      const spinEase = 1 - Math.pow(1 - spinT, 2.1);
      const kickPeak = Math.sin(Math.min(1, Math.max(0, (phase - 0.18) / 0.58)) * Math.PI);
      hipsY = 0.94 + kickPeak * 0.1;
      hipsRotY = 0.35 * tp.wind + spinEase * Math.PI * 2;
      hipsRotZ = -kickPeak * 0.48;
      torsoRotX = -0.2 * kickPeak;
      torsoRotY = 0.32 * tp.wind - 0.38 * kickPeak;
      headRotY = -0.32 * kickPeak;
      // Right leg chambers then whips high and straight across head height!
      rHipX = -0.85 * tp.wind - 1.84 * kickPeak;
      rKneeX = 1.45 * tp.wind + 0.12 * kickPeak + 0.4 * tp.recovery;
      // Planted pivot leg slightly bent for solid balance
      lHipX = -0.14;
      lKneeX = 0.28;
      // High martial-arts guard tucked tight to chest for angular momentum
      lShX = -1.22;
      lShZ = -0.36 - kickPeak * 0.24;
      lElX = -1.62;
      rShX = -1.05;
      rShZ = 0.42 + kickPeak * 0.24;
      rElX = -1.48;
      break;
    }

    case 'tornado_kick': {
      // Explosive airborne 540-degree martial arts Tornado Kick finisher!
      const p = Math.min(1, phase);
      const airArc = Math.sin(p * Math.PI);
      const spinT = Math.min(1, Math.max(0, (p - 0.08) / 0.78));
      const spinAngle = spinT * Math.PI * 2.55;
      const strikeArc = Math.sin(Math.min(1, Math.max(0, (p - 0.24) / 0.52)) * Math.PI);
      hipsY = 0.92 + airArc * 0.58;
      hipsRotY = spinAngle;
      hipsRotZ = -strikeArc * 0.54;
      torsoRotX = -0.18 * strikeArc;
      torsoRotY = -0.35 * strikeArc;
      // Chamber lead knee high while kicking leg snaps out horizontally at apex!
      rHipX = -0.65 * airArc - 1.82 * strikeArc;
      rKneeX = 1.55 * (1 - strikeArc) + 0.12;
      lHipX = -1.28 * airArc + 0.35 * strikeArc;
      lKneeX = 1.72 * airArc;
      lShX = -1.1;
      lShZ = -0.58;
      lElX = -1.35;
      rShX = -1.1;
      rShZ = 0.58;
      rElX = -1.35;
      break;
    }

    case 'axe_kick': {
      // Classic martial arts Overhead Crescent / Axe Kick:
      // Leg swings sky-high past head level, then chops violently straight down!
      const p = Math.min(1, phase);
      if (p < 0.44) {
        // High sweeping lift up past crown
        const lift = Math.sin((p / 0.44) * Math.PI * 0.5);
        hipsY = 0.95 + lift * 0.08;
        hipsRotZ = -0.22 * lift;
        torsoRotX = -0.3 * lift;
        torsoRotY = -0.28 * lift;
        rHipX = -1.86 * lift;
        rKneeX = 0.16;
        lHipX = -0.08;
        lKneeX = 0.18;
        lShX = -0.95;
        lShZ = -0.42;
        lElX = -1.25;
        rShX = -0.75;
        rShZ = 0.52;
        rElX = -1.1;
      } else {
        // Crushing vertical heel chop straight down into the opponent!
        const chop = Math.min(1, (p - 0.44) / 0.22);
        const settle = Math.max(0, (p - 0.66) / 0.34);
        hipsY = THREE.MathUtils.lerp(1.03, 0.84, chop) + settle * 0.1;
        hipsRotZ = -0.22 * (1 - chop);
        torsoRotX = THREE.MathUtils.lerp(-0.28, 0.34, chop) * (1 - settle * 0.7);
        torsoRotY = -0.25 * (1 - chop);
        rHipX = THREE.MathUtils.lerp(-1.86, -0.32, chop);
        rKneeX = THREE.MathUtils.lerp(0.14, 0.42, chop);
        lHipX = -0.24 * chop;
        lKneeX = 0.45 * chop + 0.18;
        lShX = -1.15;
        lShZ = -0.32;
        lElX = -1.45;
        rShX = -0.95;
        rShZ = 0.35;
        rElX = -1.3;
      }
      break;
    }

    case 'flying_side_kick': {
      // Iconic Bruce Lee / Double Dragon soaring horizontal Flying Side Kick!
      const p = Math.min(1, phase);
      const extend = Math.sin(Math.min(1, p * 1.15) * Math.PI * 0.88);
      hipsY = 1.0 + extend * 0.28;
      // Rotate hips side-on so the lead heel drives spear-straight forward!
      hipsRotY = 0.72 * extend;
      hipsRotZ = -0.66 * extend;
      torsoRotX = -0.22 * extend;
      torsoRotY = -0.58 * extend;
      headRotY = -0.18 * extend;
      // Lead right leg thrust razor-straight out in front, rear left knee tucked tightly underneath!
      rHipX = -1.78 * extend;
      rKneeX = 0.12;
      lHipX = -0.95 * extend;
      lKneeX = 1.82 * extend;
      // Classic martial arts flying balance arms
      lShX = -1.25;
      lShZ = -0.62;
      lElX = -1.48;
      rShX = -0.65;
      rShZ = 0.78;
      rElX = -0.82;
      break;
    }

    case 'throw_attempt':
    case 'throw_execute': {
      const tp = evalThreePhase(phase);
      hipsY = 0.88 - tp.wind * 0.06;
      hipsRotY = action === 'throw_execute' ? 0.45 * tp.wind - 0.95 * tp.strike : 0;
      torsoRotX = 0.22 + tp.strike * 0.24;
      torsoRotY = action === 'throw_execute' ? 0.38 * tp.wind - 0.85 * tp.strike : 0;
      lShX = -1.45;
      lShZ = 0.1;
      lElX = -0.4;
      rShX = -1.45;
      rShZ = -0.1;
      rElX = -0.4;
      break;
    }

    case 'rage_art': {
      const flurry = Math.sin(phase * Math.PI * 6);
      const climax = phase > 0.65 ? snap((phase - 0.65) / 0.35) : 0;
      hipsY = 0.96 + climax * 0.38;
      hipsRotY = flurry * 0.45;
      torsoRotY = flurry * 0.68;
      torsoRotX = 0.18 + climax * 0.25;
      lShX = -1.4 - flurry * 0.5;
      lShZ = -0.24;
      lElX = -0.25 - Math.max(0, -flurry) * 1.1;
      rShX = -1.4 + flurry * 0.5;
      rShZ = 0.24;
      rElX = -0.25 - Math.max(0, flurry) * 1.1;
      rHipX = -climax * 1.55;
      rKneeX = 0.2;
      break;
    }

    case 'powerup_fady': {
      if (phase < 0.62) {
        const puff = Math.sin(phase * Math.PI * 8);
        const takeDrag = Math.max(0, puff);
        hipsY = 0.6;
        torsoRotX = -0.14 - takeDrag * 0.08;
        torsoRotY = 0.06;
        headRotX = -0.08 - takeDrag * 0.14;
        lHipX = -1.42;
        lKneeX = 1.44;
        rHipX = -1.36;
        rKneeX = 1.38;
        lShX = -0.68;
        lShZ = -0.18;
        lElX = -0.95;
        rShX = -0.95 - takeDrag * 0.55;
        rShZ = 0.18;
        rElX = -1.35 - takeDrag * 0.55;
      } else if (phase < 0.78) {
        const rise = (phase - 0.62) / 0.16;
        hipsY = THREE.MathUtils.lerp(0.6, 0.94, rise);
        torsoRotX = 0.28;
        lHipX = THREE.MathUtils.lerp(-1.2, -0.35, rise);
        lKneeX = THREE.MathUtils.lerp(1.2, 0.55, rise);
        rHipX = THREE.MathUtils.lerp(-1.2, 0.35, rise);
        rKneeX = THREE.MathUtils.lerp(1.2, 0.45, rise);
        rShX = -0.5;
        rShZ = 0.65;
        rElX = -1.2;
      } else {
        const hitT = snap((phase - 0.78) / 0.22);
        hipsY = 0.92 + hitT * 0.08;
        hipsRotY = 0.35 - hitT * 0.75;
        torsoRotY = 0.4 - hitT * 0.95;
        torsoRotX = 0.22;
        rShX = -0.8 - hitT * 1.15;
        rShZ = 0.55 - hitT * 0.45;
        rElX = -0.9 + hitT * 0.78;
        lShX = -0.85;
        lElX = -1.4;
      }
      break;
    }

    case 'powerup_saf': {
      if (phase < 0.2) {
        hipsY = 0.92;
        torsoRotX = 0.22;
        lShX = -1.35;
        lShZ = -0.75;
        lElX = -0.3;
        rShX = -1.35;
        rShZ = 0.75;
        rElX = -0.3;
      } else if (phase < 0.82) {
        const squeezePulse = Math.abs(Math.sin(((phase - 0.2) / 0.62) * Math.PI * 3));
        hipsY = 0.9 + squeezePulse * 0.06;
        torsoRotX = -0.14 - squeezePulse * 0.18;
        torsoRotY = Math.sin(time * 28) * 0.09;
        headRotX = -0.18;
        lShX = -1.42;
        lShZ = 0.18 + squeezePulse * 0.06;
        lElX = -1.25 - squeezePulse * 0.35;
        rShX = -1.42;
        rShZ = -0.18 - squeezePulse * 0.06;
        rElX = -1.25 - squeezePulse * 0.35;
      } else {
        const rel = (phase - 0.82) / 0.18;
        hipsY = 0.96;
        torsoRotX = -0.1;
        lShX = -1.2;
        lShZ = -0.8 * rel;
        rShX = -1.2;
        rShZ = 0.8 * rel;
      }
      break;
    }

    case 'powerup_jav': {
      if (phase < 0.68) {
        const talk = Math.sin(time * 10);
        const talk2 = Math.cos(time * 7.5);
        hipsY = 0.95;
        torsoRotY = talk * 0.14;
        torsoRotX = 0.04;
        headRotX = talk2 * 0.12;
        headRotY = 0.18 + talk * 0.12;
        lShX = -1.05 + talk * 0.32;
        lShZ = -0.25 + talk2 * 0.15;
        lElX = -1.1 + talk * 0.38;
        rShX = -1.18 - talk * 0.36;
        rShZ = 0.25 - talk2 * 0.15;
        rElX = -1.05 - talk * 0.45;
      } else if (phase < 0.8) {
        const w = (phase - 0.68) / 0.12;
        hipsY = 0.92;
        hipsRotY = 0.45 * w;
        torsoRotY = 0.65 * w;
        torsoRotX = -0.08 * w;
        rShX = -1.35;
        rShZ = 1.15 * w;
        rElX = -0.2;
        lShX = -0.85;
        lElX = -1.1;
      } else {
        const slapT = Math.min(1, (phase - 0.8) / 0.12);
        hipsY = 0.92;
        hipsRotY = THREE.MathUtils.lerp(0.45, -0.65, slapT);
        torsoRotY = THREE.MathUtils.lerp(0.65, -0.85, slapT);
        torsoRotX = 0.2;
        rShX = -1.55;
        rShZ = THREE.MathUtils.lerp(1.15, -0.2, slapT);
        rElX = -0.14;
        lShX = -0.7;
        lElX = -1.25;
      }
      break;
    }

    case 'powerup_jam': {
      if (phase < 0.64) {
        const swingLocal = Math.max(0, (phase - 0.1) / 0.18) % 1;
        const swing = phase < 0.1 ? -0.6 : Math.sin(swingLocal * Math.PI) * 2 - 0.7;
        hipsY = 0.91;
        torsoRotY = -swing * 0.65;
        torsoRotX = 0.16 + Math.max(0, swing) * 0.12;
        rShX = -1.15 - swing * 0.65;
        rShZ = 0.28 - swing * 0.22;
        rElX = -0.65 + Math.max(0, swing) * 0.45;
        lShX = -1.05 - swing * 0.45;
        lShZ = 0.12;
        lElX = -0.9;
      } else {
        hipsY = 0.96;
        torsoRotY = 0.18;
        torsoRotX = -0.04;
        headRotY = 0.15;
        headRotX = Math.sin(time * 8) * 0.06;
        rShX = -2.15;
        rShZ = 0.22;
        rElX = -1.45;
        lShX = -0.42;
        lShZ = -0.45;
        lElX = -1.25;
      }
      break;
    }

    case 'powerup_chet': {
      if (phase < 0.25) {
        const wave = Math.sin(time * 14);
        hipsY = 0.95;
        torsoRotY = 0.25;
        rShX = -2.25 + wave * 0.25;
        rShZ = 0.35;
        rElX = -0.5;
        lShX = -0.5;
        lElX = -1.1;
      } else {
        hipsY = 0.96;
        torsoRotY = 0.18;
        torsoRotX = -0.05;
        lShX = -1.15;
        lShZ = 0.16;
        lElX = -1.55;
        rShX = -1.15;
        rShZ = -0.16;
        rElX = -1.55;
      }
      break;
    }

    case 'powerup_immy': {
      if (phase < 0.54) {
        const flex = Math.sin(time * 6) * 0.08;
        hipsY = 0.97;
        torsoRotY = 0.22;
        torsoRotX = -0.08;
        lShX = -1.55 + flex;
        lShZ = -0.85;
        lElX = -1.65;
        rShX = -1.55 - flex;
        rShZ = 0.85;
        rElX = -1.65;
      } else {
        hipsY = 0.96;
        torsoRotY = -0.35;
        torsoRotX = 0.08;
        rShX = -1.58;
        rShZ = 0.12;
        rElX = -0.12;
        lShX = -0.45;
        lShZ = -0.35;
        lElX = -1.2;
      }
      break;
    }

    case 'squeezed': {
      const jitter = Math.sin(time * 42) * 0.08;
      hipsY = 1.0 + Math.abs(jitter) * 0.5;
      torsoRotX = -0.22;
      torsoRotY = jitter * 1.4;
      headRotX = -0.42 + jitter;
      lShX = -0.55;
      lShZ = -0.18;
      lElX = -0.8;
      rShX = -0.55;
      rShZ = 0.18;
      rElX = -0.8;
      lHipX = 0.25 + jitter;
      lKneeX = 0.55;
      rHipX = -0.25 - jitter;
      rKneeX = 0.55;
      break;
    }

    case 'listening': {
      const nod = Math.sin(time * 4.5);
      hipsY = 0.94;
      torsoRotX = 0.08;
      headRotX = 0.1 + nod * 0.12;
      headRotY = -0.12;
      lShX = -0.35;
      lShZ = -0.16;
      lElX = -0.65;
      rShX = -1.65;
      rShZ = 0.18;
      rElX = -1.45;
      break;
    }

    case 'coughing': {
      const wave = Math.sin(time * 13);
      hipsY = 0.86;
      torsoRotX = 0.26 + Math.abs(wave) * 0.12;
      headRotX = 0.18 + wave * 0.12;
      lShX = -1.45;
      lShZ = -0.15 + wave * 0.28;
      lElX = -1.25;
      rShX = -1.45;
      rShZ = 0.15 - wave * 0.28;
      rElX = -1.25;
      break;
    }

    case 'hitstun':
    case 'thrown': {
      // Crisp head & torso snap-back then smooth recovery
      const p = Math.min(1, Math.max(0, phase));
      const snapBack = p < 0.3 ? 1 - Math.pow(1 - p / 0.3, 3) : 1 - Math.pow((p - 0.3) / 0.7, 1.8);
      hipsY = 0.9 - snapBack * 0.05;
      hipsZ = -0.14 * snapBack;
      torsoRotX = -0.44 * snapBack;
      headRotX = -0.52 * snapBack;
      headRotZ = Math.sin(phase * Math.PI * 2) * 0.14 * snapBack;
      lShX = -0.32;
      lShZ = -0.72 * snapBack - 0.14;
      lElX = -0.4;
      rShX = -0.32;
      rShZ = 0.72 * snapBack + 0.14;
      rElX = -0.4;
      break;
    }

    case 'knockdown': {
      // Fall backward (0..0.32) -> lie on ground briefly (0.32..0.74) -> push up to feet (0.74..1.0)
      const p = Math.min(1, Math.max(0, phase));
      if (p < 0.32) {
        const f = 1 - Math.pow(1 - p / 0.32, 2.2);
        hipsY = THREE.MathUtils.lerp(0.92, 0.22, f);
        hipsRotX = THREE.MathUtils.lerp(0, -Math.PI * 0.48, f);
        torsoRotX = -0.22 * f;
        headRotX = -0.32 * f;
        lShX = -0.4;
        lShZ = -0.95 * f - 0.14;
        rShX = -0.4;
        rShZ = 0.95 * f + 0.14;
        lElX = -0.2;
        rElX = -0.2;
        lHipX = 0.18 * f;
        lKneeX = 0.28;
        rHipX = -0.12 * f;
        rKneeX = 0.38;
      } else if (p < 0.74) {
        // Lying flat on ground briefly
        hipsY = 0.22;
        hipsRotX = -Math.PI * 0.48;
        torsoRotX = -0.18;
        headRotX = -0.12;
        lShX = -0.4;
        lShZ = -1.04;
        rShX = -0.4;
        rShZ = 1.04;
        lElX = -0.2;
        rElX = -0.2;
        lHipX = 0.15;
        lKneeX = 0.24;
        rHipX = -0.08;
        rKneeX = 0.32;
      } else {
        // Pushing back up off the dirt
        const rise = (p - 0.74) / 0.26;
        const ease = rise * rise * (3 - 2 * rise);
        hipsY = THREE.MathUtils.lerp(0.22, 0.92, ease);
        hipsRotX = THREE.MathUtils.lerp(-Math.PI * 0.48, 0, ease);
        torsoRotX = THREE.MathUtils.lerp(0.32, 0.08, ease);
        lShX = THREE.MathUtils.lerp(-1.25, -0.92, ease);
        rShX = THREE.MathUtils.lerp(-1.25, -1.02, ease);
        lShZ = THREE.MathUtils.lerp(-0.52, -0.24, ease);
        rShZ = THREE.MathUtils.lerp(0.52, 0.26, ease);
        lHipX = THREE.MathUtils.lerp(-0.75, -0.26, ease);
        lKneeX = THREE.MathUtils.lerp(1.35, 0.44, ease);
        rHipX = THREE.MathUtils.lerp(-0.45, 0.22, ease);
        rKneeX = THREE.MathUtils.lerp(1.05, 0.38, ease);
      }
      break;
    }

    case 'ko': {
      const fall = Math.min(1, phase * 1.65);
      hipsY = THREE.MathUtils.lerp(0.92, 0.22, fall);
      hipsRotX = THREE.MathUtils.lerp(0, -Math.PI * 0.48, fall);
      torsoRotX = -0.18 * fall;
      headRotZ = Math.sin(time * 3.5) * 0.16;
      lShX = -0.4;
      lShZ = -0.9 * fall - 0.14;
      rShX = -0.4;
      rShZ = 0.9 * fall + 0.14;
      lElX = -0.2;
      rElX = -0.2;
      lHipX = 0.15;
      lKneeX = 0.25;
      rHipX = -0.1;
      rKneeX = 0.35;
      break;
    }

    case 'wakeup': {
      const rise = Math.min(1, phase);
      const ease = rise * rise * (3 - 2 * rise);
      hipsY = THREE.MathUtils.lerp(0.32, 0.92, ease);
      hipsRotX = THREE.MathUtils.lerp(-Math.PI * 0.32, 0, ease);
      torsoRotX = 0.25 * (1 - ease);
      break;
    }

    case 'victory': {
      const pump = Math.sin(time * 5);
      hipsY = 0.96 + Math.abs(pump) * 0.05;
      torsoRotY = 0.25;
      headRotY = -0.1;
      lShX = -2.65 + pump * 0.14;
      lShZ = -0.35;
      lElX = -0.45;
      rShX = -2.65 - pump * 0.14;
      rShZ = 0.35;
      rElX = -0.45;
      break;
    }

    case 'back_elbow': {
      // Classic Double Dragon snappy rear-elbow strike punishing flanking cousins behind you!
      const { wind, strike } = evalThreePhase(phase);
      hipsY = 0.9 - strike * 0.06;
      torsoRotY = 0.42 * wind - 1.12 * strike;
      torsoRotX = 0.16 * strike;
      headRotY = -0.68 * strike;
      // Right elbow drives sharply backward (+X rotation = behind torso, tight bent elbow)
      rShX = -0.4 * wind + 0.85 * strike;
      rShZ = 0.38 + 0.58 * strike;
      rElX = -1.88;
      // Left guard arm stays high & compact
      lShX = -1.25;
      lShZ = -0.24;
      lElX = -1.55;
      lHipX = -0.28 * strike;
      rHipX = 0.32 * strike;
      lKneeX = 0.34;
      rKneeX = 0.24;
      break;
    }

    case 'finisher_slam': {
      // Invulnerable cinematic FINISH! signature takedown (overhead slam / giant swing!)
      const p = Math.min(1, phase);
      if (style === 'kushti_pehelwan') {
        // Giant pehelwan helicopter swing & slam!
        const spin = Math.min(1, p / 0.72);
        hipsRotY = spin * Math.PI * 2;
        hipsY = 0.86 + Math.sin(p * Math.PI) * 0.18;
        torsoRotX = -0.14 + (p > 0.72 ? 0.52 * ((p - 0.72) / 0.28) : 0);
        lShX = -1.65;
        lShZ = -0.78;
        rShX = -1.65;
        rShZ = 0.78;
        lElX = -0.55;
        rElX = -0.55;
      } else if (p < 0.46) {
        // Dramatic high overhead leap wind-up
        const t = p / 0.46;
        hipsY = 0.95 + Math.sin(t * Math.PI * 0.85) * 0.45;
        torsoRotX = -0.28 * t;
        lShX = -2.65 * t;
        rShX = -2.65 * t;
        lShZ = -0.26;
        rShZ = 0.26;
        lElX = -0.55;
        rElX = -0.55;
        lHipX = -0.55 * t;
        lKneeX = 1.05 * t;
        rHipX = 0.3 * t;
      } else {
        // Explosive overhead axe/power slam into the village dirt!
        const t = Math.min(1, (p - 0.46) / 0.24);
        hipsY = THREE.MathUtils.lerp(1.22, 0.72, t);
        torsoRotX = THREE.MathUtils.lerp(-0.22, 0.48, t);
        lShX = THREE.MathUtils.lerp(-2.55, -0.68, t);
        rShX = THREE.MathUtils.lerp(-2.55, -0.68, t);
        lShZ = -0.22;
        rShZ = 0.22;
        lElX = -0.35;
        rElX = -0.35;
        lHipX = -0.58 * t;
        rHipX = 0.35 * t;
        lKneeX = 0.88 * t;
        rKneeX = 0.58 * t;
      }
      break;
    }

    case 'grabbed_struggle': {
      // Hero locked in a cousin's cooperative rear hold, thrashing elbows to break free!
      const thrash = Math.sin(time * 28);
      hipsY = 0.88;
      torsoRotX = 0.14;
      torsoRotY = thrash * 0.22;
      headRotY = -thrash * 0.24;
      lShX = -0.62;
      lShZ = -0.45 + thrash * 0.22;
      lElX = -1.62;
      rShX = -0.62;
      rShZ = 0.45 - thrash * 0.22;
      rElX = -1.62;
      lHipX = -0.22;
      rHipX = 0.22;
      lKneeX = 0.42;
      rKneeX = 0.42;
      break;
    }

    case 'rescue_dropkick': {
      // Tag partner soaring through the air in a heroic twin-boot rescue dropkick!
      const s = Math.sin(Math.min(1, phase) * Math.PI);
      hipsY = 0.96 + s * 0.44;
      hipsRotX = -0.78 * s;
      torsoRotX = -0.22 * s;
      lShX = -0.5;
      lShZ = -1.05 * s - 0.15;
      rShX = -0.5;
      rShZ = 1.05 * s + 0.15;
      lHipX = -1.55 * s;
      rHipX = -1.48 * s;
      lKneeX = 0.16;
      rKneeX = 0.16;
      break;
    }

    case 'high_five': {
      // Celebratory zone-clear tag-team high-five & jump chest-bump!
      const p = Math.min(1, phase);
      const jumpArc = Math.sin(p * Math.PI);
      hipsY = 0.94 + jumpArc * 0.38;
      torsoRotY = 0.36 * jumpArc;
      torsoRotX = -0.1 * jumpArc;
      rShX = -2.55 * Math.min(1, p * 2.2);
      rShZ = 0.22;
      rElX = -0.24;
      lShX = -0.95;
      lShZ = -0.35;
      lElX = -1.15;
      lHipX = -0.28 * jumpArc;
      rHipX = 0.24 * jumpArc;
      lKneeX = 0.55 * jumpArc;
      rKneeX = 0.55 * jumpArc;
      break;
    }
  }

  // ── STRICT ANATOMICAL JOINT ROTATION CLAMPS (ZERO TORSO CLIPPING OR LIMB DETACHMENT) ──
  hipsRotX = THREE.MathUtils.clamp(hipsRotX, -1.55, 0.65);
  hipsRotZ = THREE.MathUtils.clamp(hipsRotZ, -0.74, 0.74);
  torsoRotX = THREE.MathUtils.clamp(torsoRotX, -0.44, 0.54);
  torsoRotY = THREE.MathUtils.clamp(torsoRotY, -1.28, 1.28);
  headRotX = THREE.MathUtils.clamp(headRotX, -0.52, 0.45);
  headRotY = THREE.MathUtils.clamp(headRotY, -0.75, 0.75);
  headRotZ = THREE.MathUtils.clamp(headRotZ, -0.32, 0.32);

  lShX = THREE.MathUtils.clamp(lShX, -2.75, 0.9);
  rShX = THREE.MathUtils.clamp(rShX, -2.75, 0.9);

  // Prevent upper arms from adducting into the ribcage/pectorals!
  // Left arm (side = -1): outward is negative Z, inward toward chest is positive Z.
  const lMaxInwardZ = lShX < -1.3 ? 0.22 : lShX < -0.75 ? 0.12 : -0.1;
  lShZ = THREE.MathUtils.clamp(lShZ, -1.42, lMaxInwardZ);
  // Right arm (side = +1): outward is positive Z, inward toward chest is negative Z.
  const rMaxInwardZ = rShX < -1.3 ? -0.22 : rShX < -0.75 ? -0.12 : 0.1;
  rShZ = THREE.MathUtils.clamp(rShZ, rMaxInwardZ, 1.42);

  // Anatomical hinge limits for elbows & knees (never hyperextend backward)
  lElX = THREE.MathUtils.clamp(lElX, -2.02, -0.1);
  rElX = THREE.MathUtils.clamp(rElX, -2.02, -0.1);

  lHipX = THREE.MathUtils.clamp(lHipX, -1.86, 0.98);
  rHipX = THREE.MathUtils.clamp(rHipX, -1.86, 0.98);
  lKneeX = THREE.MathUtils.clamp(lKneeX, 0.08, 2.02);
  rKneeX = THREE.MathUtils.clamp(rKneeX, 0.08, 2.02);

  rig.hips.position.set(hipsX, hipsY, hipsZ);
  rig.hips.rotation.set(hipsRotX, hipsRotY, hipsRotZ);
  rig.torso.rotation.set(torsoRotX, torsoRotY, 0);
  // Subtle squash effect when squeezed tight by Saf's bear hug!
  if (action === 'squeezed') {
    const sq = 0.78 + Math.sin(time * 24) * 0.06;
    rig.torso.scale.set(sq, 1.14, sq);
  } else {
    rig.torso.scale.set(1, 1, 1);
  }
  rig.headGroup.rotation.set(headRotX, headRotY, headRotZ);

  // Fast-attack motion trails / speed lines during strike phase
  const isFastStrike =
    action === 'lp' ||
    action === 'lp2' ||
    action === 'rp' ||
    action === 'combo_finisher' ||
    action === 'kick' ||
    action === 'spinning_heel_kick' ||
    action === 'tornado_kick' ||
    action === 'axe_kick' ||
    action === 'flying_side_kick' ||
    action === 'back_elbow' ||
    action === 'dash_attack' ||
    action === 'finisher_slam';
  if (isFastStrike) {
    const tpTrail = evalThreePhase(phase);
    const trailAlpha = tpTrail.strike > 0.18 ? Math.min(0.85, tpTrail.strike * 0.85) : 0;
    rig.strikeTrailGroup.visible = trailAlpha > 0.04;
    if (rig.strikeTrailGroup.visible) {
      rig.strikeTrailMat.opacity = trailAlpha;
      const isKickTrail =
        action === 'kick' ||
        action === 'spinning_heel_kick' ||
        action === 'tornado_kick' ||
        action === 'axe_kick' ||
        action === 'flying_side_kick';
      rig.strikeTrailMat.color.set(isKickTrail ? '#FDBA74' : '#FEF3C7');
      if (action === 'axe_kick') {
        rig.strikeTrailGroup.position.set(0.04, 0.36, 0.42);
        rig.strikeTrailGroup.rotation.set(0, Math.PI * 0.5, -0.4 + phase * 1.4);
      } else if (action === 'back_elbow') {
        rig.strikeTrailGroup.position.set(0.08, 0.48, -0.34);
        rig.strikeTrailGroup.rotation.set(Math.PI * 0.5, 0, Math.PI + phase * 1.1);
      } else if (isKickTrail) {
        rig.strikeTrailGroup.position.set(0, 0.24, 0.44);
        rig.strikeTrailGroup.rotation.set(Math.PI * 0.44, 0.15, -0.5 + phase * 2.2);
      } else {
        rig.strikeTrailGroup.position.set(action === 'lp' ? -0.14 : 0.14, 0.52, 0.48);
        rig.strikeTrailGroup.rotation.set(Math.PI * 0.48, 0, -0.8 + phase * 1.8);
      }
      const sc = 0.82 + tpTrail.strike * 0.46;
      rig.strikeTrailGroup.scale.setScalar(sc);
    }
  } else {
    rig.strikeTrailGroup.visible = false;
  }

  rig.leftShoulder.rotation.set(lShX, 0, lShZ);
  rig.leftElbow.rotation.set(lElX, 0, 0);
  rig.rightShoulder.rotation.set(rShX, 0, rShZ);
  rig.rightElbow.rotation.set(rElX, 0, 0);

  // Subtle martial-arts stance leg splay so open daylight always shows cleanly between separate legs
  const stanceSplay =
    action === 'knockdown' || action === 'ko' || action === 'thrown'
      ? 0.03
      : style === 'kushti_pehelwan'
        ? 0.11
        : 0.065;
  rig.leftHip.rotation.set(lHipX, 0, -stanceSplay);
  rig.leftKnee.rotation.set(lKneeX, 0, 0);
  rig.rightHip.rotation.set(rHipX, 0, stanceSplay);
  rig.rightKnee.rotation.set(rKneeX, 0, 0);

  // ── INDEPENDENT SIDE-SLIT PATHANI KURTA FLAP PHYSICS (CLAMPED OUTSIDE THIGHS) ──
  if (rig.kurtaFlaps) {
    const flaps = rig.kurtaFlaps;
    const forwardVel = vx * facing;
    // Negative hip X rotation lifts a leg forward (+Z); positive hip X sweeps a leg backward (-Z)
    const forwardLegLift = Math.max(0, -lHipX, -rHipX);
    const backLegSweep = Math.max(0, lHipX, rHipX);
    const velDrag = THREE.MathUtils.clamp(forwardVel * 0.045, -0.2, 0.32);

    // Strictly clamp front flap <= -0.05 (always outside front thigh) & back flap >= 0.05 (always outside rear thigh)
    const targetFrontX = THREE.MathUtils.clamp(
      -0.06 - forwardLegLift * 0.76 + Math.min(0.08, Math.max(0, velDrag * 0.2)),
      -1.22,
      -0.05
    );
    const targetBackX = THREE.MathUtils.clamp(
      0.06 + backLegSweep * 0.74 + Math.max(0, velDrag),
      0.05,
      1.18
    );

    flaps.frontRotX += (targetFrontX - flaps.frontRotX) * 0.3;
    flaps.backRotX += (targetBackX - flaps.backRotX) * 0.28;

    const flutter = Math.sin(time * 8.5) * (0.01 + Math.min(0.032, Math.abs(forwardVel) * 0.007));
    flaps.frontFlap.rotation.set(Math.min(-0.04, flaps.frontRotX + flutter), 0, 0);
    flaps.backFlap.rotation.set(Math.max(0.04, flaps.backRotX - flutter), 0, 0);
  }

  // ── CRISP GROUNDED PER-FOOT CONTACT SHADOWS DIRECTLY BENEATH EACH SANDAL/BOOT ──
  rig.root.updateMatrixWorld(true);
  const updateFootAo = (marker: THREE.Object3D, disc: THREE.Mesh) => {
    marker.getWorldPosition(_footWorld);
    _footLocal.copy(_footWorld);
    rig.root.worldToLocal(_footLocal);
    const footClearance = Math.max(0, _footWorld.y - 0.02);
    disc.position.set(_footLocal.x, 0.028 - yHeight, _footLocal.z);
    const sc = Math.max(0.42, 1.0 - footClearance * 0.36);
    disc.scale.set(sc, sc, 1);
    const mat = disc.material as THREE.MeshBasicMaterial;
    mat.opacity = Math.max(0.06, 0.92 - footClearance * 0.68);
  };
  updateFootAo(rig.leftFootMarker, rig.leftFootShadow);
  updateFootAo(rig.rightFootMarker, rig.rightFootShadow);
}
