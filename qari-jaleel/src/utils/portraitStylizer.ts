import { FaceCrop, HeadgearType, PortraitFaceRect, PortraitFilterStyle } from '../types/game';
import { FIGHTER_3D_PROFILES } from './fighterHeads';

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

function rgbToHex({ r, g, b }: RgbColor): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return `rgb(${clamp(r)}, ${clamp(g)}, ${clamp(b)})`;
}

function mixRgb(a: RgbColor, b: RgbColor, t: number): RgbColor {
  return {
    r: a.r * (1 - t) + b.r * t,
    g: a.g * (1 - t) + b.g * t,
    b: a.b * (1 - t) + b.b * t,
  };
}

/**
 * Samples average cheek/forehead/chin tones from a drawn face patch so the surrounding
 * 3D head skin, ears, and jawline transition match the actual portrait lighting seamlessly.
 */
function samplePortraitFacePerimeter(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  fallbackSkinHex: string
): { skin: RgbColor; jaw: RgbColor; crown: RgbColor } {
  const fallback = parseHexColor(fallbackSkinHex);

  const sampleRegion = (sx: number, sy: number, r: number): RgbColor | null => {
    try {
      const x0 = Math.max(0, Math.floor(sx - r));
      const y0 = Math.max(0, Math.floor(sy - r));
      const w = Math.max(2, Math.floor(r * 2));
      const h = Math.max(2, Math.floor(r * 2));
      const data = ctx.getImageData(x0, y0, w, h).data;
      let tr = 0;
      let tg = 0;
      let tb = 0;
      let count = 0;
      for (let i = 0; i < data.length; i += 16) {
        if (data[i + 3] < 200) continue;
        tr += data[i];
        tg += data[i + 1];
        tb += data[i + 2];
        count++;
      }
      if (count === 0) return null;
      return { r: tr / count, g: tg / count, b: tb / count };
    } catch {
      return null;
    }
  };

  // Sample forehead and both upper cheeks (clean skin areas)
  const forehead = sampleRegion(cx, cy - ry * 0.56, 12);
  const leftCheek = sampleRegion(cx - rx * 0.48, cy - ry * 0.04, 12);
  const rightCheek = sampleRegion(cx + rx * 0.48, cy - ry * 0.04, 12);
  const chinSample = sampleRegion(cx, cy + ry * 0.68, 14);
  const crownSample = sampleRegion(cx, cy - ry * 0.78, 12);

  const skinSamples = [forehead, leftCheek, rightCheek].filter(Boolean) as RgbColor[];
  let skin = fallback;
  if (skinSamples.length > 0) {
    const avg = skinSamples.reduce(
      (acc, c) => ({ r: acc.r + c.r, g: acc.g + c.g, b: acc.b + c.b }),
      { r: 0, g: 0, b: 0 }
    );
    const sampled = {
      r: avg.r / skinSamples.length,
      g: avg.g / skinSamples.length,
      b: avg.b / skinSamples.length,
    };
    // Blend 72% real sampled portrait skin with 28% fighter base tone for stability
    skin = mixRgb(fallback, sampled, 0.72);
  }

  const jaw = chinSample ? mixRgb(skin, chinSample, 0.7) : mixRgb(skin, { r: 24, g: 16, b: 12 }, 0.25);
  const crown = crownSample ? mixRgb(skin, crownSample, 0.65) : skin;

  return { skin, jaw, crown };
}

/**
 * Composites a seamless 1024x1024 equirectangular 3D head texture directly from an image
 * and normalized face rectangle, automatically matching skin tone, scalp/hair back wrap,
 * and beard/jaw shading with zero harsh sticker seams.
 */
export function buildSeamlessHeadCanvasFromRect(
  img: HTMLImageElement,
  rect: PortraitFaceRect,
  skinTone: string,
  options?: { hairColor?: string; bald?: boolean }
): HTMLCanvasElement {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const iw = img.naturalWidth || img.width || 512;
  const ih = img.naturalHeight || img.height || 512;

  // Source face square centered on (rect.cx, rect.cy)
  const srcSide = Math.min(iw, ih) * rect.size;
  const sx = rect.cx * iw - srcSide * 0.5;
  const sy = rect.cy * ih - srcSide * 0.52;

  // Exact 1:1 non-stretched equirectangular projection on the sculpted anatomical head UV:
  // Horizontal UV spans 2*PI*0.87 while vertical UV spans PI*1.16 -> ratio ≈ 0.665
  const cx = size * 0.5;
  const cy = size * 0.51;
  const destH = size * 0.56;
  const destW = destH * 0.665;
  const rx = destW * 0.45;
  const ry = destH * 0.46;

  // 1. Draw unmasked face onto offscreen canvas first so we can sample true portrait skin/beard tones
  const faceLayer = document.createElement('canvas');
  faceLayer.width = size;
  faceLayer.height = size;
  const fctx = faceLayer.getContext('2d')!;

  fctx.drawImage(
    img,
    sx,
    sy,
    srcSide,
    srcSide,
    cx - destW * 0.5,
    cy - destH * 0.5,
    destW,
    destH
  );

  const sampled = samplePortraitFacePerimeter(fctx, cx, cy, rx, ry, skinTone);
  const hairRgb = parseHexColor(options?.hairColor || '#1A1614');

  // 2. Paint organic base head skin matching sampled portrait tones
  ctx.fillStyle = rgbToHex(sampled.skin);
  ctx.fillRect(0, 0, size, size);

  // Subtle vertical anatomical skin shading (warmer sunlit crown -> natural cheeks -> shaded under-chin/neck)
  const vertGrad = ctx.createLinearGradient(0, 0, 0, size);
  vertGrad.addColorStop(0, rgbToHex(mixRgb(sampled.crown, { r: 255, g: 230, b: 200 }, 0.08)));
  vertGrad.addColorStop(0.45, rgbToHex(sampled.skin));
  vertGrad.addColorStop(0.78, rgbToHex(mixRgb(sampled.skin, sampled.jaw, 0.55)));
  vertGrad.addColorStop(1, rgbToHex(mixRgb(sampled.skin, { r: 30, g: 16, b: 10 }, 0.35)));
  ctx.fillStyle = vertGrad;
  ctx.fillRect(0, 0, size, size);

  // Subtle side-of-head & back-of-head ambient shadow so temples/nape have natural volume
  const sideGrad = ctx.createRadialGradient(cx, cy, size * 0.16, cx, cy, size * 0.54);
  sideGrad.addColorStop(0, 'rgba(255, 240, 220, 0.05)');
  sideGrad.addColorStop(0.65, 'rgba(35, 18, 10, 0.10)');
  sideGrad.addColorStop(1, 'rgba(18, 10, 6, 0.24)');
  ctx.fillStyle = sideGrad;
  ctx.fillRect(0, 0, size, size);

  // If fighter has hair, wrap realistic hair coloration smoothly around crown, temples, and back of skull
  if (!options?.bald) {
    // Upper crown & back of skull hair tone (leaves front face window completely open)
    const backHair = ctx.createLinearGradient(0, 0, 0, size * 0.72);
    backHair.addColorStop(0, rgbToHex(hairRgb));
    backHair.addColorStop(0.55, rgbToHex(mixRgb(hairRgb, sampled.skin, 0.12)));
    backHair.addColorStop(0.85, 'rgba(20, 14, 10, 0)');
    ctx.fillStyle = backHair;

    // Left back wrap (u = 0..0.30) & right back wrap (u = 0.70..1.0) + top crown (v = 0..0.28)
    ctx.fillRect(0, 0, size, size * 0.26);
    ctx.fillRect(0, size * 0.18, size * 0.27, size * 0.44);
    ctx.fillRect(size * 0.73, size * 0.18, size * 0.27, size * 0.44);

    // Soft sideburn transition strips
    const leftFade = ctx.createLinearGradient(size * 0.24, 0, size * 0.33, 0);
    leftFade.addColorStop(0, rgbToHex(hairRgb));
    leftFade.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = leftFade;
    ctx.fillRect(size * 0.24, size * 0.2, size * 0.09, size * 0.38);

    const rightFade = ctx.createLinearGradient(size * 0.76, 0, size * 0.67, 0);
    rightFade.addColorStop(0, rgbToHex(hairRgb));
    rightFade.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rightFade;
    ctx.fillRect(size * 0.67, size * 0.2, size * 0.09, size * 0.38);
  } else {
    // Realistic warm scalp sheen & subtle shaved-head tone variation on bald fighters
    const domeGlow = ctx.createRadialGradient(cx, size * 0.2, 24, cx, size * 0.24, size * 0.34);
    domeGlow.addColorStop(0, 'rgba(255, 226, 195, 0.18)');
    domeGlow.addColorStop(1, 'rgba(255, 226, 195, 0)');
    ctx.fillStyle = domeGlow;
    ctx.fillRect(0, 0, size, size * 0.5);
  }

  // Natural chin/jaw beard wrap directly under the face oval if portrait chin is darker (bearded)
  const chinLuma = sampled.jaw.r * 0.299 + sampled.jaw.g * 0.587 + sampled.jaw.b * 0.114;
  const skinLuma = sampled.skin.r * 0.299 + sampled.skin.g * 0.587 + sampled.skin.b * 0.114;
  if (skinLuma - chinLuma > 18) {
    const beardWrap = ctx.createRadialGradient(
      cx,
      cy + ry * 0.78,
      rx * 0.25,
      cx,
      cy + ry * 0.85,
      rx * 1.15
    );
    beardWrap.addColorStop(0, rgbToHex(sampled.jaw));
    beardWrap.addColorStop(0.55, `rgba(${Math.round(sampled.jaw.r)}, ${Math.round(sampled.jaw.g)}, ${Math.round(sampled.jaw.b)}, 0.55)`);
    beardWrap.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = beardWrap;
    ctx.fillRect(cx - rx * 1.3, cy + ry * 0.2, rx * 2.6, ry * 1.2);
  }

  // 3. Soft elliptical feather mask on the portrait face layer so it melts seamlessly into the head
  fctx.save();
  fctx.globalCompositeOperation = 'destination-in';
  fctx.translate(cx, cy);
  fctx.scale(1, ry / rx);
  const maskGrad = fctx.createRadialGradient(0, 0, rx * 0.62, 0, 0, rx * 1.04);
  maskGrad.addColorStop(0, 'rgba(0,0,0,1)');
  maskGrad.addColorStop(0.72, 'rgba(0,0,0,0.96)');
  maskGrad.addColorStop(0.88, 'rgba(0,0,0,0.52)');
  maskGrad.addColorStop(1, 'rgba(0,0,0,0)');
  fctx.fillStyle = maskGrad;
  fctx.beginPath();
  fctx.arc(0, 0, rx * 1.06, 0, Math.PI * 2);
  fctx.fill();
  fctx.restore();

  ctx.drawImage(faceLayer, 0, 0);

  // 4. Subtle skin micro-grain across the whole head map so lighting feels natural
  ctx.fillStyle = 'rgba(25, 14, 8, 0.035)';
  for (let i = 0; i < 900; i++) {
    const px = (i * 197 + 31) % size;
    const py = (i * 313 + 73) % size;
    ctx.fillRect(px, py, 2, 2);
  }

  return canvas;
}

// In-memory cache of asynchronously built real portrait head textures (keyed by URL + framing)
const portraitHeadCanvasCache = new Map<string, Promise<HTMLCanvasElement | null>>();

/**
 * Loads a fighter's profile picture (`portraitUrl`) and builds a cached, seamless 1024x1024
 * 3D head texture mapped directly onto their sculpted 3D head.
 */
export function loadPortraitFaceHeadCanvas(
  portraitUrl: string,
  skinTone: string,
  faceRect?: PortraitFaceRect,
  options?: { hairColor?: string; bald?: boolean }
): Promise<HTMLCanvasElement | null> {
  const rect: PortraitFaceRect = faceRect ?? { cx: 0.5, cy: 0.34, size: 0.42 };
  const cacheKey = `${portraitUrl}|${skinTone}|${rect.cx.toFixed(3)},${rect.cy.toFixed(3)},${rect.size.toFixed(3)}|${options?.hairColor ?? ''}|${options?.bald ? '1' : '0'}`;

  const existing = portraitHeadCanvasCache.get(cacheKey);
  if (existing) return existing;

  const promise = new Promise<HTMLCanvasElement | null>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = buildSeamlessHeadCanvasFromRect(img, rect, skinTone, options);
        resolve(canvas);
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = portraitUrl;
  });

  portraitHeadCanvasCache.set(cacheKey, promise);
  return promise;
}

/**
 * Generates a high-resolution, UV-ready 1024x1024 face texture blended seamlessly
 * into the fighter's sampled skin tone for custom uploaded friend photos in Studio.
 */
export function buildFaceTextureFromImage(
  img: HTMLImageElement,
  crop: FaceCrop,
  skinTone: string,
  options?: { hairColor?: string; bald?: boolean }
): string {
  const rect: PortraitFaceRect = {
    cx: 0.5 - crop.offsetX * 0.28,
    cy: 0.5 - crop.offsetY * 0.28,
    size: Math.max(0.22, Math.min(0.95, 0.82 / Math.max(0.6, crop.zoom))),
  };
  const canvas = buildSeamlessHeadCanvasFromRect(img, rect, skinTone, options);
  return canvas.toDataURL('image/jpeg', 0.92);
}

/**
 * Generates a stylized procedural 3D head face texture for starter fighters
 * (or custom fighters without a photo yet) so every 3D head looks expressive.
 */
export function buildStylizedStarterFaceTexture(options: {
  skinTone: string;
  hairColor: string;
  beardColor?: string;
  hasMustache?: boolean;
  hasBeard?: boolean;
  hasFullBeard?: boolean;
  hasBindi?: boolean;
  hasTilak?: boolean;
  hasGlasses?: boolean;
  eyeColor?: string;
}): string {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.fillStyle = options.skinTone;
  ctx.fillRect(0, 0, size, size);

  const cx = size * 0.5;
  const cy = size * 0.52;

  // Subtle cheekbone & brow shading
  const shade = ctx.createRadialGradient(cx, cy - 10, 20, cx, cy, 130);
  shade.addColorStop(0, 'rgba(255,240,210,0.12)');
  shade.addColorStop(1, 'rgba(30,15,5,0.16)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, size, size);

  // Eyebrows (fierce martial arts angle)
  ctx.strokeStyle = options.hairColor;
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - 56, cy - 36);
  ctx.lineTo(cx - 16, cy - 26);
  ctx.moveTo(cx + 56, cy - 36);
  ctx.lineTo(cx + 16, cy - 26);
  ctx.stroke();

  // Eyes
  const drawEye = (ex: number) => {
    ctx.fillStyle = '#F7F3EA';
    ctx.beginPath();
    ctx.ellipse(ex, cy - 12, 16, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = options.eyeColor || '#23160E';
    ctx.beginPath();
    ctx.arc(ex, cy - 12, 7.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(ex - 2.5, cy - 14.5, 2.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#1B110B';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(ex, cy - 12, 16, 9, 0, 0, Math.PI * 2);
    ctx.stroke();
  };
  drawEye(cx - 34);
  drawEye(cx + 34);

  // Nose bridge shadow
  ctx.strokeStyle = 'rgba(40, 18, 8, 0.35)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 12);
  ctx.lineTo(cx - 4, cy + 16);
  ctx.lineTo(cx + 7, cy + 18);
  ctx.stroke();

  // Tilak or Bindi
  if (options.hasTilak) {
    ctx.fillStyle = '#DC2626';
    ctx.beginPath();
    ctx.ellipse(cx, cy - 52, 6, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#F59E0B';
    ctx.beginPath();
    ctx.arc(cx, cy - 42, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  if (options.hasBindi) {
    ctx.fillStyle = '#F59E0B';
    ctx.beginPath();
    ctx.arc(cx, cy - 42, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#92400E';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // Beard / stubble
  if (options.hasFullBeard) {
    ctx.fillStyle = options.beardColor || '#231D1A';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 52, 62, 44, 0, 0, Math.PI);
    ctx.fill();
  } else if (options.hasBeard) {
    ctx.fillStyle = options.beardColor || 'rgba(24, 18, 14, 0.42)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 48, 56, 36, 0, 0, Math.PI);
    ctx.fill();
  }

  // Mouth (determined fighting grit/smirk)
  ctx.strokeStyle = '#4A2018';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(cx - 24, cy + 44);
  ctx.quadraticCurveTo(cx + 4, cy + 49, cx + 26, cy + 39);
  ctx.stroke();

  // Bold Mustache
  if (options.hasMustache) {
    ctx.strokeStyle = options.beardColor || options.hairColor;
    ctx.lineWidth = 13;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx, cy + 28);
    ctx.bezierCurveTo(cx - 22, cy + 25, cx - 44, cy + 38, cx - 54, cy + 34);
    ctx.moveTo(cx, cy + 28);
    ctx.bezierCurveTo(cx + 22, cy + 25, cx + 44, cy + 38, cx + 54, cy + 34);
    ctx.stroke();
  }

  return canvas.toDataURL('image/png');
}

export interface PosterFaceMapping {
  fighterId: string;
  portraitUrl: string;
  faceTextureUrl: string;
}

/**
 * Slices all 6 character faces directly from the "Revenge of Qari Jaleel" squad poster
 * and creates crisp portrait cards + seamless 3D head textures for every fighter.
 */
export function extractPosterSquadFaces(
  posterImg: HTMLImageElement,
  skinTones: Record<string, string>
): PosterFaceMapping[] {
  const w = posterImg.naturalWidth || posterImg.width;
  const h = posterImg.naturalHeight || posterImg.height;

  // Exact poster grid crops aligned to FIGHTER_3D_PROFILES:
  // Row 1: Qari (col 1), Sardar (col 2), Ustad (col 3), Sultan (col 4), Sher (col 5)
  // Row 2: Dara (col 1)
  const squadEntries: { id: string; profileKey: keyof typeof FIGHTER_3D_PROFILES }[] = [
    { id: 'qari_jaleel', profileKey: 'qari' },
    { id: 'rebel_aviator', profileKey: 'sardar' },
    { id: 'rebel_shadow', profileKey: 'ustad' },
    { id: 'rebel_striker', profileKey: 'sultan' },
    { id: 'rebel_enforcer', profileKey: 'sher' },
    { id: 'rebel_tactician', profileKey: 'dara' },
  ];

  return squadEntries.map(({ id, profileKey }) => {
    const cfg = FIGHTER_3D_PROFILES[profileKey];
    const [nx, ny, nw, nh] = cfg.posterCrop;

    // Exact rectangular crop from the poster grid, centered cleanly into a 512x512 square card thumbnail
    const sx = Math.max(0, Math.min(w - 1, nx * w));
    const sy = Math.max(0, Math.min(h - 1, ny * h));
    const sw = Math.max(16, Math.min(w - sx, nw * w));
    const sh = Math.max(16, Math.min(h - sy, nh * h));

    const pCanvas = document.createElement('canvas');
    pCanvas.width = 512;
    pCanvas.height = 512;
    const pCtx = pCanvas.getContext('2d')!;
    // Cover-fit the portrait box into 512x512 preserving aspect ratio with no stretching
    const coverScale = Math.max(512 / sw, 512 / sh);
    const dw = sw * coverScale;
    const dh = sh * coverScale;
    const dx = (512 - dw) * 0.5;
    const dy = (512 - dh) * 0.35;
    pCtx.drawImage(posterImg, sx, sy, sw, sh, dx, dy, dw, dh);

    const cx = nx + nw * 0.5;
    const cy = ny + nh * 0.5;
    const isBald = cfg.headwear === 'bald';
    const hairColor = cfg.hairColorHex || '#181412';
    const headCanvas = buildSeamlessHeadCanvasFromRect(
      posterImg,
      { cx, cy, size: Math.max(nw, nh) },
      skinTones[id] || cfg.skinToneHex,
      { hairColor, bald: isBald }
    );

    return {
      fighterId: id,
      portraitUrl: pCanvas.toDataURL('image/jpeg', 0.92),
      faceTextureUrl: headCanvas.toDataURL('image/jpeg', 0.92),
    };
  });
}

/**
 * Client-side Zero-API-Key Arcade Fighter Portrait Stylizer!
 * Transforms an uploaded friend/selfie photo into a bold Indian arcade fighting
 * game portrait card with selectable painterly/comic filters and village aura.
 */
export function generateStylizedPortrait(
  img: HTMLImageElement,
  crop: FaceCrop,
  style: PortraitFilterStyle,
  vestColor: string,
  accentColor: string,
  headgear: HeadgearType
): string {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // 1. Dramatic fighting-game backdrop
  const bg = ctx.createRadialGradient(size * 0.5, size * 0.38, 30, size * 0.5, size * 0.5, size * 0.72);
  if (style === 'mela_poster') {
    bg.addColorStop(0, '#F59E0B');
    bg.addColorStop(0.45, '#9A3412');
    bg.addColorStop(1, '#1C130E');
  } else if (style === 'arcade_ink') {
    bg.addColorStop(0, '#3D2F23');
    bg.addColorStop(0.6, '#1E1A17');
    bg.addColorStop(1, '#0F0D0C');
  } else {
    bg.addColorStop(0, '#3A2C22');
    bg.addColorStop(0.55, '#1D1916');
    bg.addColorStop(1, '#110F0D');
  }
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);

  // Diagonal dynamic brush rays behind fighter
  ctx.save();
  ctx.translate(size / 2, size * 0.44);
  const rayCount = style === 'mela_poster' ? 18 : 10;
  for (let i = 0; i < rayCount; i++) {
    ctx.rotate((Math.PI * 2) / rayCount);
    ctx.fillStyle = i % 2 === 0 ? 'rgba(245, 158, 11, 0.09)' : 'rgba(220, 38, 38, 0.05)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-22, -size);
    ctx.lineTo(22, -size);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // 2. Stylized fighter shoulders / village vest silhouette at bottom
  ctx.save();
  ctx.fillStyle = vestColor;
  ctx.beginPath();
  ctx.moveTo(size * 0.1, size);
  ctx.quadraticCurveTo(size * 0.16, size * 0.72, size * 0.36, size * 0.67);
  ctx.lineTo(size * 0.64, size * 0.67);
  ctx.quadraticCurveTo(size * 0.84, size * 0.72, size * 0.9, size);
  ctx.closePath();
  ctx.fill();

  // Gold embroidered collar V-trim
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(size * 0.36, size * 0.68);
  ctx.lineTo(size * 0.5, size * 0.92);
  ctx.lineTo(size * 0.64, size * 0.68);
  ctx.stroke();
  ctx.restore();

  // 3. Process the framed user photo onto an offscreen canvas with art filter
  const faceSize = 310;
  const off = document.createElement('canvas');
  off.width = faceSize;
  off.height = faceSize;
  const octx = off.getContext('2d');
  if (octx) {
    const minSide = Math.min(img.naturalWidth || img.width, img.naturalHeight || img.height);
    const scale = (faceSize / minSide) * crop.zoom * 1.05;
    const dw = (img.naturalWidth || img.width) * scale;
    const dh = (img.naturalHeight || img.height) * scale;
    const dx = faceSize / 2 - dw / 2 + crop.offsetX * faceSize * 0.45;
    const dy = faceSize / 2 - dh / 2 + crop.offsetY * faceSize * 0.45;

    if (style === 'gouache') {
      octx.filter = 'contrast(1.22) saturate(1.28) brightness(1.04)';
    } else if (style === 'arcade_ink') {
      octx.filter = 'contrast(1.38) saturate(1.35) brightness(1.05)';
    } else if (style === 'mela_poster') {
      octx.filter = 'contrast(1.3) saturate(1.5) sepia(0.18) brightness(1.06)';
    } else {
      octx.filter = 'contrast(1.1) saturate(1.1)';
    }
    octx.drawImage(img, dx, dy, dw, dh);
    octx.filter = 'none';

    // Apply pixel-level posterization / ink-edge stylization for non-natural styles
    if (style !== 'natural') {
      const imgData = octx.getImageData(0, 0, faceSize, faceSize);
      const data = imgData.data;
      const levels = style === 'arcade_ink' ? 6 : style === 'mela_poster' ? 7 : 10;
      const step = 255 / levels;

      // Copy luminance for edge detection if arcade_ink or gouache
      const gray = new Uint8Array(faceSize * faceSize);
      for (let i = 0; i < gray.length; i++) {
        const idx = i * 4;
        gray[i] = (data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114) | 0;
      }

      for (let y = 1; y < faceSize - 1; y++) {
        for (let x = 1; x < faceSize - 1; x++) {
          const p = y * faceSize + x;
          const idx = p * 4;

          // Warm painterly quantization
          let r = Math.round(data[idx] / step) * step;
          let g = Math.round(data[idx + 1] / step) * step;
          let b = Math.round(data[idx + 2] / step) * step;

          // Blend slightly with original for pleasing skin tones
          const blend = style === 'arcade_ink' ? 0.65 : 0.45;
          r = data[idx] * (1 - blend) + r * blend;
          g = data[idx + 1] * (1 - blend) + g * blend;
          b = data[idx + 2] * (1 - blend) + b * blend;

          // Sobel ink edge accent
          const gx =
            -gray[p - faceSize - 1] +
            gray[p - faceSize + 1] -
            2 * gray[p - 1] +
            2 * gray[p + 1] -
            gray[p + faceSize - 1] +
            gray[p + faceSize + 1];
          const gy =
            -gray[p - faceSize - 1] -
            2 * gray[p - faceSize] -
            gray[p - faceSize + 1] +
            gray[p + faceSize - 1] +
            2 * gray[p + faceSize] +
            gray[p + faceSize + 1];
          const mag = Math.sqrt(gx * gx + gy * gy);
          const edgeThreshold = style === 'arcade_ink' ? 72 : 105;

          if (mag > edgeThreshold) {
            const inkFactor = Math.min(0.72, (mag - edgeThreshold) / 140);
            r *= 1 - inkFactor;
            g *= 1 - inkFactor * 1.05;
            b *= 1 - inkFactor * 1.1;
          }

          // Subtle golden-hour warm highlight push
          data[idx] = Math.min(255, r + 8);
          data[idx + 1] = Math.min(255, g + 3);
          data[idx + 2] = Math.max(0, b - 4);
        }
      }
      octx.putImageData(imgData, 0, 0);
    }
  }

  // 4. Composite framed portrait bust with warm arcade rim halo
  const px = size / 2;
  const py = size * 0.42;
  const rx = 136;
  const ry = 158;

  // Rim glow behind head
  ctx.save();
  ctx.shadowColor = '#F59E0B';
  ctx.shadowBlur = 26;
  ctx.fillStyle = '#F59E0B';
  ctx.beginPath();
  ctx.ellipse(px, py, rx + 4, ry + 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Clip & draw stylized face
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(px, py, rx, ry, 0, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(off, px - faceSize / 2, py - faceSize / 2);

  // Subtle warm directional rim light overlay inside portrait
  const rim = ctx.createLinearGradient(px - rx, py - ry, px + rx, py + ry);
  rim.addColorStop(0, 'rgba(245, 158, 11, 0.24)');
  rim.addColorStop(0.35, 'rgba(255, 255, 255, 0)');
  rim.addColorStop(1, 'rgba(15, 10, 8, 0.34)');
  ctx.fillStyle = rim;
  ctx.fillRect(px - rx, py - ry, rx * 2, ry * 2);
  ctx.restore();

  // Optional headgear accent on portrait card
  if (headgear === 'headband') {
    ctx.save();
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 22;
    ctx.beginPath();
    ctx.arc(px, py + 12, rx - 4, Math.PI * 1.12, Math.PI * 1.88);
    ctx.stroke();
    ctx.restore();
  } else if (headgear === 'tilak') {
    ctx.fillStyle = '#DC2626';
    ctx.beginPath();
    ctx.ellipse(px, py - 62, 6, 20, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Crisp inner arcade frame border
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.55)';
  ctx.lineWidth = 6;
  ctx.strokeRect(12, 12, size - 24, size - 24);

  return canvas.toDataURL('image/jpeg', 0.9);
}

/**
 * Generates a high-craft hand-painted procedural portrait for Balram "Tractor" Singh
 * (ensuring all 4 starter fighters have rich, zero-broken-image portraits).
 */
export function createBalramPortraitDataUrl(): string {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Dark charcoal & warm golden-hour rim backdrop
  const bg = ctx.createRadialGradient(256, 200, 35, 256, 256, 360);
  bg.addColorStop(0, '#4E2A17');
  bg.addColorStop(0.55, '#1D1815');
  bg.addColorStop(1, '#0E0C0B');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);

  // Subtle earthen red dust particles
  ctx.fillStyle = 'rgba(245, 158, 11, 0.14)';
  for (let i = 0; i < 24; i++) {
    const x = (i * 97) % size;
    const y = (i * 61) % size;
    ctx.beginPath();
    ctx.arc(x, y, 2 + (i % 4), 0, Math.PI * 2);
    ctx.fill();
  }

  // Massive Pehelwan shoulders & chest
  const skinGrad = ctx.createLinearGradient(90, 260, 420, 500);
  skinGrad.addColorStop(0, '#B86E3E');
  skinGrad.addColorStop(0.5, '#92512A');
  skinGrad.addColorStop(1, '#5D3018');
  ctx.fillStyle = skinGrad;
  ctx.beginPath();
  ctx.moveTo(42, 512);
  ctx.quadraticCurveTo(60, 330, 178, 305);
  ctx.lineTo(334, 305);
  ctx.quadraticCurveTo(452, 330, 470, 512);
  ctx.closePath();
  ctx.fill();

  // Red akhara clay dusting on shoulders
  ctx.fillStyle = 'rgba(180, 62, 32, 0.28)';
  ctx.beginPath();
  ctx.ellipse(130, 390, 60, 38, -0.3, 0, Math.PI * 2);
  ctx.ellipse(382, 390, 60, 38, 0.3, 0, Math.PI * 2);
  ctx.fill();

  // Crimson pehelwan shoulder sash
  ctx.fillStyle = '#B91C1C';
  ctx.beginPath();
  ctx.moveTo(310, 306);
  ctx.lineTo(395, 332);
  ctx.lineTo(255, 512);
  ctx.lineTo(170, 512);
  ctx.closePath();
  ctx.fill();

  // Gold border on sash
  ctx.strokeStyle = '#F59E0B';
  ctx.lineWidth = 5;
  ctx.stroke();

  // Brass armlet on left bicep
  ctx.strokeStyle = '#EAB308';
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.moveTo(74, 430);
  ctx.quadraticCurveTo(118, 444, 152, 428);
  ctx.stroke();

  // Thick muscular neck
  ctx.fillStyle = '#854623';
  ctx.fillRect(212, 245, 88, 76);

  // Head
  const headGrad = ctx.createRadialGradient(242, 180, 20, 256, 195, 115);
  headGrad.addColorStop(0, '#C57B48');
  headGrad.addColorStop(0.7, '#99552D');
  headGrad.addColorStop(1, '#68351A');
  ctx.fillStyle = headGrad;
  ctx.beginPath();
  ctx.ellipse(256, 195, 84, 102, 0, 0, Math.PI * 2);
  ctx.fill();

  // Ears
  ctx.fillStyle = '#8D4D28';
  ctx.beginPath();
  ctx.ellipse(170, 202, 14, 24, -0.1, 0, Math.PI * 2);
  ctx.ellipse(342, 202, 14, 24, 0.1, 0, Math.PI * 2);
  ctx.fill();

  // Thick dark hair
  ctx.fillStyle = '#181412';
  ctx.beginPath();
  ctx.arc(256, 158, 86, Math.PI * 0.96, Math.PI * 2.04);
  ctx.quadraticCurveTo(320, 128, 256, 122);
  ctx.quadraticCurveTo(192, 128, 170, 162);
  ctx.closePath();
  ctx.fill();

  // Saffron & sindoor tilak on forehead
  ctx.fillStyle = '#DC2626';
  ctx.beginPath();
  ctx.ellipse(256, 148, 7, 20, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#F59E0B';
  ctx.beginPath();
  ctx.arc(256, 156, 4.5, 0, Math.PI * 2);
  ctx.fill();

  // Fierce thick eyebrows
  ctx.strokeStyle = '#16110E';
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(198, 174);
  ctx.lineTo(240, 184);
  ctx.moveTo(314, 174);
  ctx.lineTo(272, 184);
  ctx.stroke();

  // Eyes
  for (const ex of [222, 290]) {
    ctx.fillStyle = '#F8F4EC';
    ctx.beginPath();
    ctx.ellipse(ex, 195, 15, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1C110B';
    ctx.beginPath();
    ctx.arc(ex, 195, 6.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(ex - 2, 193, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Nose
  ctx.strokeStyle = 'rgba(42, 18, 8, 0.5)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(256, 190);
  ctx.lineTo(248, 224);
  ctx.lineTo(266, 226);
  ctx.stroke();

  // Iconic curled Pehelwan handlebar mustache
  ctx.strokeStyle = '#14100E';
  ctx.lineWidth = 15;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(256, 238);
  ctx.bezierCurveTo(222, 232, 192, 260, 166, 226);
  ctx.moveTo(256, 238);
  ctx.bezierCurveTo(290, 232, 320, 260, 346, 226);
  ctx.stroke();

  // Confident jaw grin
  ctx.strokeStyle = '#F8F4EC';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(234, 256);
  ctx.quadraticCurveTo(256, 264, 278, 256);
  ctx.stroke();

  // Golden rim highlight along left edge
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.45)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(256, 195, 86, Math.PI * 0.72, Math.PI * 1.38);
  ctx.stroke();

  return canvas.toDataURL('image/png');
}
