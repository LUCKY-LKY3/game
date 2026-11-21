import * as THREE from 'three';
import { FighterProfile } from '../types/game';

/**
 * Per-character 3D anatomical facial proportions, expression, hair, and beard specifications
 * sculpted to match each portrait as a true 3D game character (zero 2D photo stickers).
 */
export interface CharacterFaceSculptSpec {
  headWidth: number;       // Temporal width multiplier
  headHeight: number;      // Cranial height multiplier
  headDepth: number;       // Front-to-back depth multiplier
  jawWidth: number;        // Lower jawbone breadth (0.92 slim -> 1.16 powerhouse)
  chinProject: number;     // Forward chin prominence
  browProminence: number;  // Brow ridge depth
  browFurrow: number;      // Inner brow downward fierce angle (radians)
  eyeSquint: number;       // 0..1 intensity of martial arts upper eyelid angle
  noseLength: number;      // Nose bridge vertical length
  noseProjection: number;  // Forward tip projection
  noseWidth: number;       // Nostril alar wing breadth
  cheekProminence: number; // Zygomatic cheekbone fullness
  lipFullness: number;     // Sculpted mouth/lip relief
  beardStyle: 'none' | 'stubble' | 'trimmed' | 'boxed' | 'full_heavy' | 'full_salt_pepper';
  mustacheStyle: 'none' | 'trimmed' | 'handlebar' | 'bushy';
  hairStyle: 'bald' | 'curly_hero' | 'swept_silver' | 'swept_dark' | 'short';
  beardColor: string;
  hairHighlightColor?: string;
  eyeColor: string;
}

export function getCharacterFaceSculptSpec(profile: FighterProfile): CharacterFaceSculptSpec {
  const { id, appearance } = profile;

  switch (id) {
    case 'qari_jaleel':
      // Qari 'Fady' Jaleel: angular chiseled jaw, strong straight nose, thick curved handlebar mustache,
      // rugged jaw stubble, fierce dark brows, lush wild curly black hair
      return {
        headWidth: 0.85,
        headHeight: 1.16,
        headDepth: 1.0,
        jawWidth: 0.96,
        chinProject: 0.022,
        browProminence: 0.018,
        browFurrow: 0.22,
        eyeSquint: 0.35,
        noseLength: 1.06,
        noseProjection: 0.04,
        noseWidth: 1.0,
        cheekProminence: 0.014,
        lipFullness: 0.011,
        beardStyle: 'stubble',
        mustacheStyle: 'handlebar',
        hairStyle: appearance.bald ? 'bald' : 'curly_hero',
        beardColor: '#15110F',
        hairHighlightColor: '#2E2622',
        eyeColor: '#2C170B',
      };

    case 'rebel_aviator':
      // Sardar 'Saf' Chauhan: broad strong jaw, full sculpted salt-and-pepper beard & bushy mustache,
      // thick swept silver-streaked hair, gold reflective aviators
      return {
        headWidth: 0.91,
        headHeight: 1.14,
        headDepth: 1.02,
        jawWidth: 1.12,
        chinProject: 0.026,
        browProminence: 0.018,
        browFurrow: 0.16,
        eyeSquint: 0.28,
        noseLength: 1.02,
        noseProjection: 0.038,
        noseWidth: 1.08,
        cheekProminence: 0.014,
        lipFullness: 0.01,
        beardStyle: 'full_salt_pepper',
        mustacheStyle: 'bushy',
        hairStyle: appearance.bald ? 'bald' : 'swept_silver',
        beardColor: '#3E3D3B',
        hairHighlightColor: '#DBD7D0',
        eyeColor: '#2B180D',
      };

    case 'rebel_tactician':
      // Dara 'Jav' Malik: refined oval face, neat sculpted dark full beard & mustache,
      // brushed dark hair with side wave, dark rectangular eyeglasses
      return {
        headWidth: 0.84,
        headHeight: 1.17,
        headDepth: 0.99,
        jawWidth: 0.93,
        chinProject: 0.02,
        browProminence: 0.014,
        browFurrow: 0.14,
        eyeSquint: 0.22,
        noseLength: 1.04,
        noseProjection: 0.036,
        noseWidth: 0.94,
        cheekProminence: 0.011,
        lipFullness: 0.01,
        beardStyle: 'boxed',
        mustacheStyle: 'trimmed',
        hairStyle: appearance.bald ? 'bald' : 'swept_dark',
        beardColor: '#171311',
        hairHighlightColor: '#342D28',
        eyeColor: '#27150A',
      };

    case 'rebel_enforcer':
      // Sher 'Jam' Thakur: clean-shaved square bald cranium, heavy furrowed brow, intense gaze,
      // short boxed dark beard & mustache framing a strong square jaw
      return {
        headWidth: 0.89,
        headHeight: 1.15,
        headDepth: 1.01,
        jawWidth: 1.08,
        chinProject: 0.022,
        browProminence: 0.021,
        browFurrow: 0.25,
        eyeSquint: 0.38,
        noseLength: 1.0,
        noseProjection: 0.038,
        noseWidth: 1.06,
        cheekProminence: 0.014,
        lipFullness: 0.011,
        beardStyle: 'boxed',
        mustacheStyle: 'trimmed',
        hairStyle: 'bald',
        beardColor: '#161210',
        eyeColor: '#24140A',
      };

    case 'rebel_striker':
      // Sultan 'Chet' Rathore: sleek athletic bald head, sharp cheekbones, fierce narrowed eyes,
      // neatly trimmed dark chin/jaw beard & mustache
      return {
        headWidth: 0.85,
        headHeight: 1.17,
        headDepth: 0.99,
        jawWidth: 0.97,
        chinProject: 0.024,
        browProminence: 0.019,
        browFurrow: 0.26,
        eyeSquint: 0.42,
        noseLength: 1.02,
        noseProjection: 0.038,
        noseWidth: 0.98,
        cheekProminence: 0.015,
        lipFullness: 0.01,
        beardStyle: 'trimmed',
        mustacheStyle: 'trimmed',
        hairStyle: 'bald',
        beardColor: '#15110F',
        eyeColor: '#221208',
      };

    case 'rebel_shadow':
      // Ustad 'Immy' Mirza: massive powerhouse bald cranium, deep heavy brow ridge, strong aquiline nose,
      // thick rugged full dark beard & heavy mustache
      return {
        headWidth: 0.92,
        headHeight: 1.16,
        headDepth: 1.04,
        jawWidth: 1.15,
        chinProject: 0.028,
        browProminence: 0.024,
        browFurrow: 0.28,
        eyeSquint: 0.4,
        noseLength: 1.06,
        noseProjection: 0.042,
        noseWidth: 1.14,
        cheekProminence: 0.016,
        lipFullness: 0.01,
        beardStyle: 'full_heavy',
        mustacheStyle: 'bushy',
        hairStyle: 'bald',
        beardColor: '#161210',
        eyeColor: '#231309',
      };

    default:
      return {
        headWidth: 0.87,
        headHeight: 1.16,
        headDepth: 1.0,
        jawWidth: 1.0,
        chinProject: 0.021,
        browProminence: 0.016,
        browFurrow: 0.16,
        eyeSquint: 0.25,
        noseLength: 1.0,
        noseProjection: 0.036,
        noseWidth: 1.0,
        cheekProminence: 0.012,
        lipFullness: 0.01,
        beardStyle: 'stubble',
        mustacheStyle: 'trimmed',
        hairStyle: appearance.bald ? 'bald' : 'short',
        beardColor: appearance.hairColor || '#1A1614',
        eyeColor: '#2A170B',
      };
  }
}

interface RgbColor {
  r: number;
  g: number;
  b: number;
}

function parseHexColor(hex: string): RgbColor {
  const clean = hex.replace('#', '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean.padEnd(6, '0');
  const num = parseInt(full.slice(0, 6), 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function rgbCss({ r, g, b }: RgbColor, alpha = 1): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return alpha < 1
    ? `rgba(${c(r)}, ${c(g)}, ${c(b)}, ${alpha.toFixed(3)})`
    : `rgb(${c(r)}, ${c(g)}, ${c(b)})`;
}

function mixRgb(a: RgbColor, b: RgbColor, t: number): RgbColor {
  return {
    r: a.r * (1 - t) + b.r * t,
    g: a.g * (1 - t) + b.g * t,
    b: a.b * (1 - t) + b.b * t,
  };
}

/**
 * Generates purely procedural, realistic human skin PBR texture maps (Albedo, Normal, Roughness)
 * mapped cleanly to our sculpted 3D anatomical head (NO 2D photo pasted onto the mesh):
 *  - Natural warm/cool subcutaneous color zones (cheeks, nose bridge, brow shadow, orbital socket AO)
 *  - Natural terracotta-brown lip shading matching the sculpted lip geometry
 *  - Subtle brow worry lines, skin pores, shaved bald scalp hairline fade, and jaw stubble shading
 */
export function createSculptedHeadSkinPbrMaps(
  skinHex: string,
  spec: CharacterFaceSculptSpec,
  hairHex: string,
  maxAnisotropy: number
): {
  map: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
} {
  const size = 512;
  const skin = parseHexColor(skinHex);
  const beard = parseHexColor(spec.beardColor);
  const hair = parseHexColor(hairHex);

  const albedo = document.createElement('canvas');
  albedo.width = size;
  albedo.height = size;
  const ctx = albedo.getContext('2d')!;

  const cx = size * 0.5;
  const cy = size * 0.5;

  // 1. Base natural skin tone with subtle vertical light/warmth gradient
  const baseGrad = ctx.createLinearGradient(0, 0, 0, size);
  baseGrad.addColorStop(0, rgbCss(mixRgb(skin, { r: 255, g: 222, b: 190 }, 0.1)));
  baseGrad.addColorStop(0.45, rgbCss(skin));
  baseGrad.addColorStop(0.78, rgbCss(mixRgb(skin, { r: 75, g: 38, b: 22 }, 0.14)));
  baseGrad.addColorStop(1, rgbCss(mixRgb(skin, { r: 38, g: 18, b: 10 }, 0.34)));
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, size, size);

  // 2. Subtle warm subcutaneous blush on cheekbones, nose tip, and brow ridge
  const blushColor = mixRgb(skin, { r: 192, g: 82, b: 56 }, 0.28);
  const drawSoftZone = (x: number, y: number, rx: number, ry: number, color: RgbColor, alpha: number) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, ry / rx);
    const g = ctx.createRadialGradient(0, 0, rx * 0.1, 0, 0, rx);
    g.addColorStop(0, rgbCss(color, alpha));
    g.addColorStop(1, rgbCss(color, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, rx, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  // Cheek warmth & nose tip warmth
  drawSoftZone(cx - 56, cy + 16, 36, 26, blushColor, 0.34);
  drawSoftZone(cx + 56, cy + 16, 36, 26, blushColor, 0.34);
  drawSoftZone(cx, cy + 20, 18, 22, blushColor, 0.32);

  // Orbital eye-socket ambient occlusion (deepens the real 3D eye sockets naturally)
  const socketAO = mixRgb(skin, { r: 34, g: 16, b: 10 }, 0.56);
  drawSoftZone(cx - 34, cy - 12, 24, 18, socketAO, 0.52);
  drawSoftZone(cx + 34, cy - 12, 24, 18, socketAO, 0.52);

  // Subtle forehead & nasal bridge sunlit highlight
  const highlight = mixRgb(skin, { r: 255, g: 234, b: 205 }, 0.26);
  drawSoftZone(cx, cy - 52, 46, 24, highlight, 0.3);
  drawSoftZone(cx, cy + 6, 10, 26, highlight, 0.25);

  // Brow furrow crease shadow between eyebrows (glabella)
  const creaseColor = mixRgb(skin, { r: 36, g: 16, b: 10 }, 0.55);
  ctx.strokeStyle = rgbCss(creaseColor, 0.45);
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - 5, cy - 42);
  ctx.lineTo(cx - 4, cy - 26);
  ctx.moveTo(cx + 5, cy - 42);
  ctx.lineTo(cx + 4, cy - 26);
  ctx.stroke();

  // Subtle forehead expression lines
  ctx.strokeStyle = rgbCss(creaseColor, 0.22);
  ctx.lineWidth = 2;
  for (const fy of [-62, -74]) {
    ctx.beginPath();
    ctx.moveTo(cx - 38, cy + fy);
    ctx.quadraticCurveTo(cx, cy + fy - 4, cx + 38, cy + fy);
    ctx.stroke();
  }

  // Subtle nasolabial folds flanking nose & mouth
  ctx.strokeStyle = rgbCss(creaseColor, 0.25);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx - 20, cy + 20);
  ctx.quadraticCurveTo(cx - 34, cy + 40, cx - 32, cy + 62);
  ctx.moveTo(cx + 20, cy + 20);
  ctx.quadraticCurveTo(cx + 34, cy + 40, cx + 32, cy + 62);
  ctx.stroke();

  // Natural warm lip coloration aligned with sculpted 3D lips (ny = -0.285 -> y ≈ cy + 48)
  const lipColor = mixRgb(skin, { r: 122, g: 54, b: 44 }, 0.52);
  const lipDark = mixRgb(skin, { r: 44, g: 18, b: 14 }, 0.68);
  drawSoftZone(cx, cy + 46, 26, 11, lipColor, 0.72);
  ctx.strokeStyle = rgbCss(lipDark, 0.7);
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(cx - 23, cy + 47);
  ctx.quadraticCurveTo(cx, cy + 50, cx + 23, cy + 47);
  ctx.stroke();

  // 3. Hairline / shaved bald scalp stubble fade
  if (spec.hairStyle === 'bald') {
    // Realistic shaved-head stubble shadow wrapping around sides & back of cranium
    const scalpStubble = mixRgb(skin, beard, 0.34);
    const sGrad = ctx.createLinearGradient(0, size * 0.18, 0, size * 0.54);
    sGrad.addColorStop(0, rgbCss(scalpStubble, 0));
    sGrad.addColorStop(0.55, rgbCss(scalpStubble, 0.35));
    sGrad.addColorStop(1, rgbCss(scalpStubble, 0));
    ctx.fillStyle = sGrad;
    ctx.fillRect(0, size * 0.18, size * 0.34, size * 0.36);
    ctx.fillRect(size * 0.66, size * 0.18, size * 0.34, size * 0.36);

    // Subtle shaved hairline across upper forehead
    drawSoftZone(cx, size * 0.14, 120, 48, scalpStubble, 0.24);
  } else {
    // Smooth dark scalp shadow under sculpted 3D hair so there's never skin peeking between curls
    ctx.fillStyle = rgbCss(hair, 0.92);
    ctx.fillRect(0, 0, size, size * 0.25);
    ctx.fillRect(0, size * 0.16, size * 0.31, size * 0.42);
    ctx.fillRect(size * 0.69, size * 0.16, size * 0.31, size * 0.42);
  }

  // 4. Natural jaw stubble / under-beard skin blend so 3D beard meshes sit seamlessly on skin!
  if (spec.beardStyle !== 'none') {
    const isHeavy = spec.beardStyle === 'full_heavy' || spec.beardStyle === 'full_salt_pepper';
    const isBoxed = spec.beardStyle === 'boxed' || spec.beardStyle === 'trimmed';
    const beardAlpha = isHeavy ? 0.9 : isBoxed ? 0.78 : 0.46;

    // Jaw, chin, and cheek beard base shadow
    drawSoftZone(cx, cy + 88, 92, 58, beard, beardAlpha);
    drawSoftZone(cx - 58, cy + 54, 42, 48, beard, beardAlpha * 0.85);
    drawSoftZone(cx + 58, cy + 54, 42, 48, beard, beardAlpha * 0.85);
    // Upper-lip mustache shadow base
    drawSoftZone(cx, cy + 34, 34, 11, beard, beardAlpha * 0.85);

    // Fine stubble/beard follicle grain
    for (let i = 0; i < 2400; i++) {
      const rx = ((i * 197 + 13) % 190) - 95;
      const ry = ((i * 313 + 29) % 120) + 18;
      // Skip around lips center slightly
      if (Math.abs(rx) < 22 && ry > 42 && ry < 56) continue;
      if ((rx * rx) / (95 * 95) + ((ry - 72) * (ry - 72)) / (64 * 64) > 1) continue;
      const isSalt = spec.beardStyle === 'full_salt_pepper' && i % 4 === 0;
      ctx.fillStyle = isSalt ? 'rgba(225, 222, 216, 0.45)' : rgbCss(beard, 0.38);
      ctx.fillRect(cx + rx, cy + ry, 2, 2);
    }
  }

  // 5. Fine natural skin pores & warm village dust weathering across cheeks
  for (let i = 0; i < 1800; i++) {
    const px = (i * 173 + 17) % size;
    const py = (i * 257 + 43) % size;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(30, 14, 6, 0.04)' : 'rgba(255, 232, 205, 0.035)';
    ctx.fillRect(px, py, 2, 2);
  }

  // 6. Procedural Normal Map (skin pores + brow creases + coarse beard follicle bump)
  const norm = document.createElement('canvas');
  norm.width = 256;
  norm.height = 256;
  const nctx = norm.getContext('2d')!;
  nctx.fillStyle = 'rgb(128, 128, 255)';
  nctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 3800; i++) {
    const x = (i * 97 + 11) % 256;
    const y = (i * 151 + 23) % 256;
    const inBeard = spec.beardStyle !== 'none' && y > 142 && Math.abs(x - 128) < 58;
    const delta = inBeard ? 28 : 10;
    const nx = 128 + ((i * 31) % (delta * 2)) - delta;
    const ny = 128 + ((i * 53) % (delta * 2)) - delta;
    nctx.fillStyle = `rgb(${nx},${ny},248)`;
    nctx.fillRect(x, y, 2, 2);
  }

  // 7. Procedural Roughness Map (slightly smoother T-zone & bald crown ~0.46, soft cheeks ~0.60, matte beard ~0.88)
  const rough = document.createElement('canvas');
  rough.width = 256;
  rough.height = 256;
  const rctx = rough.getContext('2d')!;
  rctx.fillStyle = 'rgb(156, 156, 156)'; // ~0.61 default skin roughness
  rctx.fillRect(0, 0, 256, 256);

  // Subtle forehead, nose bridge, and bald crown sheen
  const tZone = rctx.createRadialGradient(128, 102, 8, 128, 108, 48);
  tZone.addColorStop(0, 'rgb(116, 116, 116)');
  tZone.addColorStop(1, 'rgba(156, 156, 156, 0)');
  rctx.fillStyle = tZone;
  rctx.fillRect(60, 40, 136, 115);

  if (spec.hairStyle === 'bald') {
    const domeSheen = rctx.createRadialGradient(128, 56, 10, 128, 62, 64);
    domeSheen.addColorStop(0, 'rgb(112, 112, 112)');
    domeSheen.addColorStop(1, 'rgba(156, 156, 156, 0)');
    rctx.fillStyle = domeSheen;
    rctx.fillRect(40, 0, 176, 125);
  }

  if (spec.beardStyle !== 'none') {
    const beardMatte = rctx.createRadialGradient(128, 174, 12, 128, 174, 58);
    beardMatte.addColorStop(0, 'rgb(232, 232, 232)');
    beardMatte.addColorStop(1, 'rgba(156, 156, 156, 0)');
    rctx.fillStyle = beardMatte;
    rctx.fillRect(64, 124, 128, 110);
  }

  const map = new THREE.CanvasTexture(albedo);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = maxAnisotropy;

  const normalMap = new THREE.CanvasTexture(norm);
  normalMap.anisotropy = maxAnisotropy;

  const roughnessMap = new THREE.CanvasTexture(rough);
  roughnessMap.anisotropy = maxAnisotropy;

  return { map, normalMap, roughnessMap };
}

/** Procedural detailed realistic human iris + sclera eyeball texture */
function createRealisticEyeTexture(irisHex: string): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Warm realistic sclera (never harsh pure #FFFFFF)
  ctx.fillStyle = '#EFE9E0';
  ctx.fillRect(0, 0, size, size);

  // Subtle capillary warmth near sclera edges
  const scleraGrad = ctx.createRadialGradient(128, 128, 42, 128, 128, 128);
  scleraGrad.addColorStop(0, 'rgba(242, 236, 228, 0)');
  scleraGrad.addColorStop(0.75, 'rgba(218, 178, 162, 0.25)');
  scleraGrad.addColorStop(1, 'rgba(182, 120, 104, 0.45)');
  ctx.fillStyle = scleraGrad;
  ctx.fillRect(0, 0, size, size);

  // Centered iris at u=0.5, v=0.5 (facing +X in SphereGeometry, rotated to +Z)
  const cx = 128;
  const cy = 128;
  const irisR = 30;
  const irisBase = parseHexColor(irisHex);
  const irisLight = mixRgb(irisBase, { r: 165, g: 108, b: 56 }, 0.48);

  // Dark outer limbal ring
  ctx.fillStyle = '#120A06';
  ctx.beginPath();
  ctx.arc(cx, cy, irisR + 2.5, 0, Math.PI * 2);
  ctx.fill();

  // Rich radial iris gradient
  const iGrad = ctx.createRadialGradient(cx - 4, cy - 4, 5, cx, cy, irisR);
  iGrad.addColorStop(0, rgbCss(irisLight));
  iGrad.addColorStop(0.65, rgbCss(irisBase));
  iGrad.addColorStop(1, '#120A06');
  ctx.fillStyle = iGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, irisR, 0, Math.PI * 2);
  ctx.fill();

  // Subtle iris radial fibers
  ctx.strokeStyle = rgbCss(irisLight, 0.35);
  ctx.lineWidth = 1.2;
  for (let a = 0; a < 24; a++) {
    const ang = (a / 24) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(ang) * 11, cy + Math.sin(ang) * 11);
    ctx.lineTo(cx + Math.cos(ang) * (irisR - 3), cy + Math.sin(ang) * (irisR - 3));
    ctx.stroke();
  }

  // Deep black pupil
  ctx.fillStyle = '#070504';
  ctx.beginPath();
  ctx.arc(cx, cy, 12.5, 0, Math.PI * 2);
  ctx.fill();

  // Crisp studio catchlight glint
  ctx.fillStyle = 'rgba(255, 250, 240, 0.92)';
  ctx.beginPath();
  ctx.arc(cx - 7, cy - 8, 4.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 244, 224, 0.55)';
  ctx.beginPath();
  ctx.arc(cx + 6, cy + 7, 2.0, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Builds a high-resolution (64x48) anatomically sculpted 3D human head BufferGeometry
 * with genuine facial topography:
 *  - Cranial vault & temple hollowing
 *  - Strong brow ridge & properly recessed orbital cavities for 3D eyeballs
 *  - Raised nasal bridge, projecting nasal tip, and flared alar nostril wings
 *  - Zygomatic cheekbones, buccal hollows, and sculpted upper/lower lips
 *  - Per-character jawline breadth & chin projection
 */
export function createAnatomicalHeadGeometry(spec: CharacterFaceSculptSpec): THREE.BufferGeometry {
  const radius = 0.21;
  const geo = new THREE.SphereGeometry(radius, 64, 48);
  const pos = geo.attributes.position;

  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);

    const len = Math.sqrt(x * x + y * y + z * z) || 1;
    const nx = x / len; // +1 = front face center (nose), -1 = occiput
    const ny = y / len; // +1 = crown, -1 = under-chin
    const nz = z / len; // +/-1 = left/right temples
    const absZ = Math.abs(nz);

    // 1. Human cranium oval proportions
    y *= spec.headHeight;
    z *= spec.headWidth;
    x *= spec.headDepth;

    // 2. Occipital skull curve & nape taper at back of skull
    if (nx < -0.05) {
      const occ = Math.pow(-nx, 1.35) * Math.exp(-Math.pow((ny - 0.14) / 0.55, 2));
      x -= 0.018 * occ;
      if (ny < -0.25) {
        const nape = Math.min(1, (-ny - 0.25) / 0.65) * Math.min(1, -nx * 1.4);
        x += 0.024 * nape;
      }
    }

    // 3. Temple hollowing beside forehead
    if (nx > 0.15 && nx < 0.72 && ny > 0.08 && ny < 0.45 && absZ > 0.58) {
      const temple =
        Math.exp(-Math.pow((ny - 0.24) / 0.16, 2)) *
        Math.exp(-Math.pow((absZ - 0.78) / 0.18, 2));
      z -= Math.sign(nz) * 0.01 * temple;
    }

    // 4. Jawline, gonion corner & chin sculpting
    if (ny < -0.1) {
      const jawT = Math.min(1, (-ny - 0.1) / 0.9);
      const widthBlend = 1 - (0.28 - (spec.jawWidth - 1) * 0.18) * Math.pow(jawT, 1.3);
      z *= widthBlend;

      if (nx > 0.02 && nx < 0.62 && absZ > 0.36 && ny > -0.68 && ny < -0.2) {
        const gonion =
          Math.exp(-Math.pow((ny + 0.44) / 0.16, 2)) *
          Math.exp(-Math.pow((absZ - 0.66) / 0.2, 2));
        z += Math.sign(nz) * (0.012 * spec.jawWidth) * gonion;
      }

      if (nx > 0.48 && absZ < 0.45) {
        const chinY = Math.exp(-Math.pow((ny + 0.56) / 0.19, 2));
        const chinZ = Math.exp(-Math.pow(nz / 0.25, 2));
        x += spec.chinProject * chinY * chinZ;
      }
    }

    // 5. Detailed front facial topography (front hemisphere nx > 0.32)
    if (nx > 0.32) {
      const frontMask = Math.min(1, (nx - 0.32) / 0.42);

      // Strong sculpted brow ridge arch
      const browY = Math.exp(-Math.pow((ny - 0.215) / 0.082, 2));
      const browZ = Math.exp(-Math.pow(nz / 0.44, 2));
      x += spec.browProminence * browY * browZ * frontMask;

      // Deep recessed orbital eye sockets so 3D eyeballs sit naturally inside the skull!
      const socketY = Math.exp(-Math.pow((ny - 0.068) / 0.082, 2));
      const socketZ = Math.exp(-Math.pow((absZ - 0.285) / 0.125, 2));
      x -= 0.026 * socketY * socketZ * frontMask;

      // Sculpted 3D Nose: bridge + projecting tip + alar nostril wings
      const noseTop = 0.165;
      const noseTipY = -0.115 * spec.noseLength;
      if (ny < noseTop + 0.08 && ny > noseTipY - 0.12 && absZ < 0.26) {
        const bridgeT = Math.max(0, Math.min(1, (noseTop - ny) / (noseTop - noseTipY)));
        const bridgeEnvelope =
          ny <= noseTop && ny >= noseTipY
            ? Math.pow(Math.sin(bridgeT * Math.PI * 0.72), 0.85)
            : Math.exp(-Math.pow((ny - noseTipY) / 0.052, 2)) * (ny < noseTipY ? 0.65 : 0.2);
        const bridgeWidth = (0.082 + bridgeT * 0.032) * spec.noseWidth;
        const bridgeZ = Math.exp(-Math.pow(nz / bridgeWidth, 2));
        x += spec.noseProjection * bridgeEnvelope * bridgeZ * frontMask;

        const tipY = Math.exp(-Math.pow((ny - noseTipY) / 0.048, 2));
        const tipZ = Math.exp(-Math.pow(nz / (0.09 * spec.noseWidth), 2));
        x += spec.noseProjection * 0.44 * tipY * tipZ * frontMask;

        // Flared left & right alar nostril wings
        const wingY = Math.exp(-Math.pow((ny - (noseTipY - 0.014)) / 0.042, 2));
        const wingZ = Math.exp(-Math.pow((absZ - 0.115 * spec.noseWidth) / 0.046, 2));
        x += spec.noseProjection * 0.46 * wingY * wingZ * frontMask;
        z += Math.sign(nz) * 0.008 * spec.noseWidth * wingY * wingZ * frontMask;
      }

      // Zygomatic cheekbones
      const cheekY = Math.exp(-Math.pow((ny + 0.068) / 0.13, 2));
      const cheekZ = Math.exp(-Math.pow((absZ - 0.49) / 0.19, 2));
      x += spec.cheekProminence * cheekY * cheekZ * frontMask;
      z += Math.sign(nz) * spec.cheekProminence * 0.9 * cheekY * cheekZ * frontMask;

      // Subtle sub-cheek buccal hollowing
      const buccalY = Math.exp(-Math.pow((ny + 0.24) / 0.12, 2));
      const buccalZ = Math.exp(-Math.pow((absZ - 0.46) / 0.15, 2));
      x -= 0.006 * buccalY * buccalZ * frontMask;

      // Sculpted upper & lower lips + philtrum + mouth parting seam
      const mouthCenterY = -0.285;
      const mouthZ = Math.exp(-Math.pow(nz / 0.21, 2));
      const upperLip = Math.exp(-Math.pow((ny - (mouthCenterY + 0.036)) / 0.034, 2));
      const lowerLip = Math.exp(-Math.pow((ny - (mouthCenterY - 0.042)) / 0.038, 2));
      const lipSeam = Math.exp(-Math.pow((ny - mouthCenterY) / 0.018, 2));
      x += (spec.lipFullness * (upperLip * 1.15 + lowerLip * 1.0) - 0.007 * lipSeam) * mouthZ * frontMask;

      // Mentolabial cleft under lower lip
      const cleftY = Math.exp(-Math.pow((ny + 0.415) / 0.045, 2));
      const cleftZ = Math.exp(-Math.pow(nz / 0.2, 2));
      x -= 0.007 * cleftY * cleftZ * frontMask;
    }

    pos.setXYZ(i, x, y, z);
  }

  geo.computeVertexNormals();
  geo.computeTangents();
  return geo;
}

/**
 * Builds sculpted 3D anatomical ears (outer helix rim + inner concha + ear lobe).
 */
export function buildSculptedEar(
  side: -1 | 1,
  skinMat: THREE.Material,
  trackGeo: <T extends THREE.BufferGeometry>(g: T) => T
): THREE.Group {
  const ear = new THREE.Group();
  ear.position.set(side * 0.18, 0.005, -0.015);
  ear.rotation.set(0.06, side * 0.34, -side * 0.08);

  const helix = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(0.034, 0.011, 8, 18, Math.PI * 1.45)),
    skinMat
  );
  helix.scale.set(0.75, 1.32, 0.72);
  helix.rotation.z = side === 1 ? -0.35 : Math.PI + 0.35;
  ear.add(helix);

  const shell = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.031, 10, 8)), skinMat);
  shell.scale.set(0.42, 1.12, 0.65);
  shell.position.set(-side * 0.004, -0.002, -0.004);
  ear.add(shell);

  const lobe = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.016, 8, 8)), skinMat);
  lobe.scale.set(0.65, 1.05, 0.8);
  lobe.position.set(-side * 0.002, -0.042, 0.002);
  ear.add(lobe);

  return ear;
}

/** Procedural hair strand bump texture so sculpted 3D hair & beards read as natural fiber */
function createHairStrandBumpTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#7c7c7c';
  ctx.fillRect(0, 0, size, size);
  for (let x = 0; x < size; x += 2) {
    const shade = 88 + ((x * 37) % 80);
    ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
    ctx.fillRect(x, 0, 1, size);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 2);
  return tex;
}

/** Procedural salt-and-pepper streaked hair/beard color map for Sardar 'Saf' Chauhan */
function createSaltPepperHairTexture(baseHex: string, highlightHex: string): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, size, size);
  for (let x = 0; x < size; x += 3) {
    const h = (x * 43 + 17) % 100;
    if (h > 44) {
      ctx.fillStyle = highlightHex;
      ctx.globalAlpha = 0.48 + ((h % 38) / 100);
      ctx.fillRect(x, 0, 2, size);
    }
  }
  ctx.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 2);
  return tex;
}

/**
 * Attaches real 3D-modeled facial features onto `headGroup`:
 *  - Real 3D glossy eyeballs with textured iris/pupil/catchlight inside the sculpted sockets
 *  - Sculpted 3D upper & lower eyelids with character-specific fierce squint
 *  - Sculpted 3D curved eyebrows matching each character's expression
 *  - Sculpted dark nostril openings under the 3D nose wings
 *  - Character-matched 3D hair, 3D mustaches, and sculpted 3D beards
 */
export function attachSculptedFaceFeatures3D(
  headGroup: THREE.Group,
  profile: FighterProfile,
  spec: CharacterFaceSculptSpec,
  skinMat: THREE.Material,
  trackGeo: <T extends THREE.BufferGeometry>(g: T) => T,
  trackMat: <T extends THREE.Material>(m: T, flashable?: boolean) => T,
  trackTex: <T extends THREE.Texture>(t: T) => T
) {
  const hairBump = trackTex(createHairStrandBumpTexture());

  const isSaltPepper = spec.beardStyle === 'full_salt_pepper' || spec.hairStyle === 'swept_silver';
  const spTex = isSaltPepper
    ? trackTex(createSaltPepperHairTexture(spec.beardColor, spec.hairHighlightColor || '#DCD8D2'))
    : null;

  const hairMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: spTex ? '#FFFFFF' : profile.appearance.hairColor,
      map: spTex ?? undefined,
      bumpMap: hairBump,
      bumpScale: 0.012,
      roughness: 0.78,
      metalness: 0.06,
    })
  );

  const beardMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: spTex ? '#FFFFFF' : spec.beardColor,
      map: spTex ?? undefined,
      bumpMap: hairBump,
      bumpScale: 0.014,
      roughness: 0.88,
      metalness: 0.04,
    })
  );

  const browMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: isSaltPepper ? '#4A4846' : spec.beardColor,
      bumpMap: hairBump,
      bumpScale: 0.01,
      roughness: 0.86,
      metalness: 0.04,
    })
  );

  // ── 1. REAL 3D MODELED EYES (Glossy Eyeballs + Sculpted Upper/Lower Eyelids) ──
  const eyeTex = trackTex(createRealisticEyeTexture(spec.eyeColor));
  const eyeMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: '#FFFFFF',
      map: eyeTex,
      roughness: 0.1,
      metalness: 0.02,
      clearcoat: 1.0,
      clearcoatRoughness: 0.06,
    }),
    false
  );

  const lashMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#17110E',
      roughness: 0.85,
      metalness: 0.02,
    })
  );

  const eyeballGeo = trackGeo(new THREE.SphereGeometry(0.0265, 20, 16));
  const upperLidGeo = trackGeo(
    new THREE.SphereGeometry(0.0292, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.48)
  );
  const lowerLidGeo = trackGeo(
    new THREE.SphereGeometry(0.0285, 16, 10, 0, Math.PI * 2, Math.PI * 0.6, Math.PI * 0.4)
  );
  const lashRimGeo = trackGeo(new THREE.TorusGeometry(0.0282, 0.0026, 6, 16, Math.PI));

  const eyeX = 0.056 * (spec.headWidth / 0.87);
  const eyeY = 0.016 * (spec.headHeight / 1.16);
  const eyeZ = 0.172 * spec.headDepth;

  for (const side of [-1, 1] as const) {
    const eyeSocket = new THREE.Group();
    eyeSocket.position.set(side * eyeX, eyeY, eyeZ);
    // Slightly outward follow of facial curve
    eyeSocket.rotation.y = side * 0.12;

    const eyeball = new THREE.Mesh(eyeballGeo, eyeMat);
    // SphereGeometry u=0.5 faces +X, so rotate -PI/2 around Y so pupil looks straight ahead (+Z)
    eyeball.rotation.y = -Math.PI / 2;
    eyeSocket.add(eyeball);

    // Sculpted upper eyelid with character-specific stern squint
    const upperLid = new THREE.Mesh(upperLidGeo, skinMat);
    upperLid.rotation.x = 0.24 + spec.eyeSquint * 0.32;
    upperLid.rotation.z = -side * (0.06 + spec.browFurrow * 0.35);

    // Subtle dark upper lash rim hugging the front lower margin of the upper eyelid
    const lash = new THREE.Mesh(lashRimGeo, lashMat);
    lash.rotation.set(Math.PI / 2, 0, 0);
    lash.position.set(0, 0.0018, 0);
    upperLid.add(lash);
    eyeSocket.add(upperLid);

    // Sculpted lower eyelid
    const lowerLid = new THREE.Mesh(lowerLidGeo, skinMat);
    lowerLid.rotation.x = -0.18 - spec.eyeSquint * 0.14;
    eyeSocket.add(lowerLid);

    eyeSocket.userData.faceFeature = true;

    headGroup.add(eyeSocket);
  }

  // ── 2. SCULPTED 3D EYEBROWS (Curved 3D ridges matching each portrait's intensity) ──
  const browBaseY = eyeY + 0.036;
  const browBaseZ = 0.194 * spec.headDepth;
  for (const side of [-1, 1] as const) {
    const furrowDrop = spec.browFurrow * 0.032;
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.018, browBaseY - furrowDrop, browBaseZ + 0.008),
      new THREE.Vector3(side * 0.052, browBaseY + 0.008, browBaseZ + 0.002),
      new THREE.Vector3(side * 0.092, browBaseY - 0.002, browBaseZ - 0.018),
    ]);
    const browRadius = spec.browProminence > 0.018 ? 0.0088 : 0.0074;
    const browGeo = trackGeo(new THREE.TubeGeometry(curve, 12, browRadius, 7, false));
    const browMesh = new THREE.Mesh(browGeo, browMat);
    browMesh.scale.set(1, 0.72, 0.85);
    browMesh.castShadow = true;
    browMesh.userData.faceFeature = true;
    headGroup.add(browMesh);
  }

  // ── 3. SCULPTED NOSTRIL OPENINGS UNDER THE 3D NOSE WINGS ────────────────────
  const nostrilMat = trackMat(
    new THREE.MeshStandardMaterial({ color: '#2B130B', roughness: 0.95, metalness: 0 })
  );
  const nostrilGeo = trackGeo(new THREE.SphereGeometry(0.0085, 8, 6));
  const noseTipY = -0.033 * spec.noseLength;
  const noseTipZ = 0.205 * spec.headDepth + spec.noseProjection * 0.45;
  for (const side of [-1, 1] as const) {
    const nostril = new THREE.Mesh(nostrilGeo, nostrilMat);
    nostril.scale.set(1.15 * spec.noseWidth, 0.45, 0.85);
    nostril.position.set(side * 0.014 * spec.noseWidth, noseTipY - 0.005, noseTipZ - 0.006);
    nostril.userData.faceFeature = true;
    headGroup.add(nostril);
  }

  // ── 4. SCULPTED 3D HAIR (tailored per portrait) ─────────────────────────────
  if (spec.hairStyle !== 'bald' && profile.appearance.headgear !== 'turban') {
    const hairGroup = new THREE.Group();

    const crownCap = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.214, 28, 18, 0, Math.PI * 2, 0, Math.PI * 0.52)),
      hairMat
    );
    crownCap.position.set(0, 0.052, -0.028);
    crownCap.rotation.x = -0.3;
    crownCap.scale.set(spec.headWidth * 1.04, spec.headHeight * 0.96, spec.headDepth * 1.02);
    crownCap.castShadow = true;
    hairGroup.add(crownCap);

    const backCap = new THREE.Mesh(
      trackGeo(
        new THREE.SphereGeometry(0.212, 22, 16, Math.PI * 0.65, Math.PI * 1.7, 0.2, Math.PI * 0.62)
      ),
      hairMat
    );
    backCap.rotation.y = Math.PI / 2;
    backCap.position.set(0, 0.01, -0.02);
    backCap.scale.set(spec.headWidth * 1.03, spec.headHeight * 0.96, spec.headDepth * 1.03);
    hairGroup.add(backCap);

    // Sideburns blending naturally down to ears/beard
    const sbGeo = trackGeo(new THREE.CapsuleGeometry(0.016, 0.068, 5, 8));
    for (const side of [-1, 1] as const) {
      const sb = new THREE.Mesh(sbGeo, hairMat);
      sb.position.set(side * (0.168 * (spec.headWidth / 0.87)), 0.025, 0.042);
      sb.rotation.z = side * 0.08;
      hairGroup.add(sb);
    }

    if (spec.hairStyle === 'curly_hero') {
      // Qari 'Fady' Jaleel: Lush messy dark curly volume framing forehead & temples
      const curlGeo = trackGeo(new THREE.SphereGeometry(0.062, 12, 10));
      const curls: [number, number, number, number, number, number][] = [
        [0, 0.25, 0.072, 1.3, 0.8, 1.05],
        [-0.078, 0.238, 0.068, 1.18, 0.82, 1.0],
        [0.078, 0.238, 0.068, 1.18, 0.82, 1.0],
        [-0.035, 0.195, 0.142, 0.92, 0.52, 0.65], // iconic forehead curl wave
        [0.055, 0.205, 0.135, 0.85, 0.5, 0.62],
        [-0.138, 0.188, 0.032, 1.08, 0.86, 0.95],
        [0.138, 0.188, 0.032, 1.08, 0.86, 0.95],
        [-0.17, 0.112, -0.012, 0.85, 1.05, 0.9],
        [0.17, 0.112, -0.012, 0.85, 1.05, 0.9],
        [0.02, 0.268, -0.015, 1.38, 0.84, 1.25],
        [-0.095, 0.225, -0.075, 1.22, 0.86, 1.15],
        [0.095, 0.225, -0.075, 1.22, 0.86, 1.15],
        [0, 0.188, -0.155, 1.35, 0.96, 1.12],
        [-0.125, 0.12, -0.13, 1.02, 1.06, 1.0],
        [0.125, 0.12, -0.13, 1.02, 1.06, 1.0],
      ];
      for (const [cx, cy, cz, sx, sy, sz] of curls) {
        const c = new THREE.Mesh(curlGeo, hairMat);
        c.position.set(cx, cy, cz);
        c.scale.set(sx, sy, sz);
        c.castShadow = true;
        hairGroup.add(c);
      }
    } else if (spec.hairStyle === 'swept_silver') {
      // Sardar 'Saf' Chauhan: Thick swept-up salt-and-pepper textured crown
      const waveGeo = trackGeo(new THREE.CapsuleGeometry(0.052, 0.125, 8, 12));
      const waves: [number, number, number, number, number, number][] = [
        [0, 0.258, 0.048, 0.28, 0, 1.57],
        [0, 0.252, -0.04, 0.1, 0, 1.57],
        [-0.088, 0.228, 0.018, 0.22, 0.35, 1.25],
        [0.088, 0.228, 0.018, 0.22, -0.35, -1.25],
        [-0.145, 0.162, -0.025, 0.15, 0.4, 0.5],
        [0.145, 0.162, -0.025, 0.15, -0.4, -0.5],
      ];
      for (const [wx, wy, wz, rx, ry, rz] of waves) {
        const w = new THREE.Mesh(waveGeo, hairMat);
        w.position.set(wx, wy, wz);
        w.rotation.set(rx, ry, rz);
        w.castShadow = true;
        hairGroup.add(w);
      }
    } else if (spec.hairStyle === 'swept_dark') {
      // Dara 'Jav' Malik: Thick brushed dark hair with natural side wave
      const puffGeo = trackGeo(new THREE.SphereGeometry(0.066, 12, 10));
      const puffs: [number, number, number, number, number, number][] = [
        [-0.028, 0.25, 0.055, 1.48, 0.74, 1.15],
        [0.078, 0.236, 0.042, 1.22, 0.7, 1.05],
        [-0.115, 0.202, 0.01, 1.02, 0.8, 1.0],
        [0.125, 0.188, -0.008, 0.94, 0.8, 0.98],
        [0, 0.222, -0.075, 1.42, 0.8, 1.25],
      ];
      for (const [px, py, pz, sx, sy, sz] of puffs) {
        const p = new THREE.Mesh(puffGeo, hairMat);
        p.position.set(px, py, pz);
        p.scale.set(sx, sy, sz);
        p.castShadow = true;
        hairGroup.add(p);
      }
    } else {
      const tuft = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.115, 12, 10)), hairMat);
      tuft.position.set(0, 0.215, 0.01);
      tuft.scale.set(1.25, 0.52, 1.15);
      hairGroup.add(tuft);
    }

    headGroup.add(hairGroup);
  }

  // ── 5. SCULPTED 3D MUSTACHE (Tailored per portrait!) ────────────────────────
  if (spec.mustacheStyle !== 'none') {
    const isHandlebar = spec.mustacheStyle === 'handlebar';
    const isBushy = spec.mustacheStyle === 'bushy';
    const curve = new THREE.CatmullRomCurve3(
      isHandlebar
        ? [
            new THREE.Vector3(-0.076, -0.064, 0.172),
            new THREE.Vector3(-0.044, -0.058, 0.198),
            new THREE.Vector3(0, -0.048, 0.208),
            new THREE.Vector3(0.044, -0.058, 0.198),
            new THREE.Vector3(0.076, -0.064, 0.172),
          ]
        : isBushy
          ? [
              new THREE.Vector3(-0.072, -0.072, 0.18),
              new THREE.Vector3(-0.038, -0.056, 0.205),
              new THREE.Vector3(0, -0.048, 0.215),
              new THREE.Vector3(0.038, -0.056, 0.205),
              new THREE.Vector3(0.072, -0.072, 0.18),
            ]
          : [
              new THREE.Vector3(-0.058, -0.068, 0.18),
              new THREE.Vector3(-0.03, -0.055, 0.198),
              new THREE.Vector3(0, -0.049, 0.204),
              new THREE.Vector3(0.03, -0.055, 0.198),
              new THREE.Vector3(0.058, -0.068, 0.18),
            ]
    );
    const radius = isBushy ? 0.0175 : isHandlebar ? 0.0155 : 0.0115;
    const stacheGeo = trackGeo(new THREE.TubeGeometry(curve, 20, radius, 8, false));
    const stache = new THREE.Mesh(stacheGeo, beardMat);
    stache.castShadow = true;
    stache.userData.faceFeature = true;
    headGroup.add(stache);
  }

  // ── 6. SCULPTED 3D BEARD VOLUMES (Matched accurately to every character!) ───
  if (
    spec.beardStyle === 'full_heavy' ||
    spec.beardStyle === 'full_salt_pepper' ||
    spec.beardStyle === 'boxed' ||
    spec.beardStyle === 'trimmed'
  ) {
    const isHeavy = spec.beardStyle === 'full_heavy';
    const isSaltFull = spec.beardStyle === 'full_salt_pepper';
    const isBoxed = spec.beardStyle === 'boxed';

    // Contoured 3D chin & jaw beard shell
    const chinScaleX = isHeavy ? 1.2 : isSaltFull ? 1.15 : isBoxed ? 1.02 : 0.94;
    const chinScaleY = isHeavy ? 1.06 : isSaltFull ? 0.98 : isBoxed ? 0.78 : 0.68;
    const chinScaleZ = isHeavy ? 0.96 : isSaltFull ? 0.9 : isBoxed ? 0.76 : 0.72;
    const chinY = isHeavy ? -0.158 : isSaltFull ? -0.152 : isBoxed ? -0.138 : -0.132;
    const chinZ = isHeavy ? 0.095 : isSaltFull ? 0.09 : 0.088;

    const chinBeard = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.118, 22, 16)),
      beardMat
    );
    chinBeard.scale.set(spec.headWidth * chinScaleX, chinScaleY, chinScaleZ);
    chinBeard.position.set(0, chinY, chinZ);
    chinBeard.castShadow = true;
    chinBeard.userData.faceFeature = true;
    headGroup.add(chinBeard);

    // Sculpted side-jaw beard strips connecting chin smoothly up toward sideburns/ears
    const sideRad = isHeavy ? 0.038 : isSaltFull ? 0.034 : isBoxed ? 0.024 : 0.02;
    const sideLen = isHeavy || isSaltFull ? 0.115 : 0.095;
    const sideBeardGeo = trackGeo(new THREE.CapsuleGeometry(sideRad, sideLen, 6, 10));
    for (const side of [-1, 1] as const) {
      const sideBeard = new THREE.Mesh(sideBeardGeo, beardMat);
      sideBeard.position.set(
        side * (0.128 * (spec.headWidth / 0.87) * (isHeavy ? 1.08 : 1.0)),
        -0.088,
        0.072
      );
      sideBeard.rotation.set(0.36, side * 0.28, side * 0.34);
      sideBeard.castShadow = true;
      sideBeard.userData.faceFeature = true;
      headGroup.add(sideBeard);
    }

    // Soul patch / lower-lip beard connector for natural continuity under the sculpted lips
    const soulPatch = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(isHeavy ? 0.032 : 0.024, 10, 8)),
      beardMat
    );
    soulPatch.scale.set(1.15, 0.95, 0.65);
    soulPatch.position.set(0, -0.105, 0.175 * spec.headDepth);
    soulPatch.userData.faceFeature = true;
    headGroup.add(soulPatch);
  }
}
