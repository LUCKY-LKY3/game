import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { CharacterFaceSculptSpec } from './faceSculptor';

type TrackGeo = <T extends THREE.BufferGeometry>(g: T) => T;
type TrackMat = <T extends THREE.Material>(m: T, flashable?: boolean, rimStrength?: number) => T;
type TrackTex = <T extends THREE.Texture>(t: T) => T;

export interface StylizedHeadOptions {
  spec: CharacterFaceSculptSpec;
  skinHex: string;
  hairHex: string;
  headgear: string;
  isMobile: boolean;
  trackGeo: TrackGeo;
  trackMat: TrackMat;
  trackTex: TrackTex;
}

const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
const sstep = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const gauss = (x: number, y: number, cx: number, cy: number, sx: number, sy: number) =>
  Math.exp(-(((x - cx) / sx) ** 2) - ((y - cy) / sy) ** 2);
const hash3 = (x: number, y: number, z: number) => {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return s - Math.floor(s);
};
// smooth value noise
const noise3 = (x: number, y: number, z: number) => {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  const l = (a: number, b: number, t: number) => a + (b - a) * t;
  const c = (i: number, j: number, k: number) => hash3(xi + i, yi + j, zi + k);
  return l(
    l(l(c(0, 0, 0), c(1, 0, 0), u), l(c(0, 1, 0), c(1, 1, 0), u), v),
    l(l(c(0, 0, 1), c(1, 0, 1), u), l(c(0, 1, 1), c(1, 1, 1), u), v),
    w
  );
};

function seededRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Procedural strand-streak bump map so hair and beard read as fibres, not plastic. */
function createFibreBump(size: number): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  g.fillStyle = '#808080';
  g.fillRect(0, 0, size, size);
  const rnd = seededRng(7);
  for (let i = 0; i < size * 5; i++) {
    const x = rnd() * size, y = rnd() * size, len = 6 + rnd() * 18;
    const v = Math.floor(90 + rnd() * 110);
    g.strokeStyle = `rgb(${v},${v},${v})`;
    g.lineWidth = 1 + rnd();
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + (rnd() - 0.5) * 3, y + len);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 3);
  return t;
}

/**
 * Builds a fully sculpted stylised 3D head: shaped skull, nose, brow, lips and jaw, open eyes with
 * lids, brows, moustache, beard and hair as real geometry. Faces forward on +Z, centred on the origin.
 */
export function buildStylizedHead(o: StylizedHeadOptions): THREE.Group {
  const { spec, trackGeo, trackMat, trackTex } = o;
  const group = new THREE.Group();
  group.name = 'stylizedHead';

  const R = 0.21;
  const rx = R * spec.headWidth;
  const ry = R * spec.headHeight;
  const rz = R * spec.headDepth;

  // ───────────── sculpt ─────────────
  const sculpt = (dx: number, dy: number, dz: number, out: THREE.Vector3) => {
    let ex = dx, ey = dy, ez = dz;
    // jaw: narrow toward the chin, keep a strong gonion corner
    if (dy < -0.1) {
      const t = Math.min(1, (-dy - 0.1) / 0.9);
      ex *= 1 - (0.3 - (spec.jawWidth - 1) * 0.2) * Math.pow(t, 1.25);
      ez *= 1 - 0.1 * t;
    }
    // lengthen the lower face slightly so chin sits lower than a plain sphere
    if (dy < -0.2) ey = dy * (1 + 0.1 * sstep(-0.2, -0.9, dy));
    // flatten the back of the skull a little and taper the nape
    if (dz < -0.2) {
      ez *= 1 - 0.05 * sstep(-0.2, -0.9, dz);
      if (dy < -0.3) ex *= 1 - 0.1 * sstep(-0.3, -0.9, dy);
    }
    let px = ex * rx, py = ey * ry, pz = ez * rz;

    const front = sstep(0.12, 0.5, dz);
    const ax = Math.abs(dx);
    let d = 0; // outward displacement (head units)

    if (front > 0) {
      const nProj = spec.noseProjection;
      const lip = spec.lipFullness;
      // forehead & brow
      d += 0.008 * gauss(ax, dy, 0, 0.42, 0.5, 0.2);
      d += (spec.browProminence * 1.5) * gauss(ax, dy, 0, 0.225 - 0.05 * ax * ax, 0.46, 0.065);
      // eye sockets
      d -= 0.011 * gauss(ax, dy, 0.285, 0.085, 0.12, 0.07);
      d -= 0.006 * gauss(ax, dy, 0.0, 0.12, 0.16, 0.06); // between-eyes dip above the nose bridge
      // nose
      const bridgeWin = sstep(-0.16, 0.1, dy) * (1 - sstep(0.1, 0.17, dy));
      d += 0.013 * gauss(ax, 0, 0, 0, 0.07, 1) * bridgeWin * 0.0 + 0.012 * Math.exp(-((ax / 0.07) ** 2)) * bridgeWin;
      d += nProj * 0.95 * gauss(ax, dy, 0, -0.135 - (spec.noseLength - 1) * 0.04, 0.085, 0.075);
      d += 0.012 * spec.noseWidth * gauss(ax, dy, 0.115 * spec.noseWidth, -0.15, 0.055, 0.05);
      d -= 0.009 * gauss(ax, dy, 0.058, -0.195, 0.032, 0.03);
      d -= 0.004 * gauss(ax, dy, 0, -0.235, 0.03, 0.045);
      // cheeks
      d += spec.cheekProminence * 0.95 * gauss(ax, dy, 0.44, -0.06, 0.17, 0.12);
      d -= 0.007 * gauss(ax, dy, 0.4, -0.27, 0.16, 0.12);
      d -= 0.004 * gauss(ax, dy, 0.27, -0.2, 0.05, 0.14); // nasolabial fold
      // lips
      d += lip * 1.15 * gauss(ax, dy, 0, -0.29, 0.15, 0.034);
      d += lip * 1.35 * gauss(ax, dy, 0, -0.38, 0.13, 0.04);
      d -= 0.008 * gauss(ax, dy, 0, -0.335, 0.17, 0.014);
      d -= 0.005 * gauss(ax, dy, 0.19, -0.335, 0.035, 0.05);
      // chin
      d += spec.chinProject * 1.4 * gauss(ax, dy, 0, -0.62, 0.2, 0.11);
      d -= 0.005 * gauss(ax, dy, 0, -0.485, 0.14, 0.025);
      d *= front;
    }
    // temples hollow slightly beside the brow
    d -= 0.006 * gauss(ax, dy, 0.88, 0.22, 0.12, 0.14) * (1 - front);

    out.set(px + dx * d, py + dy * d, pz + dz * d);
    // outward direction scaled by ellipsoid so displacement is visible on wide heads
    return out;
  };

  // ───────────── base mesh ─────────────
  const seg = o.isMobile ? [96, 72] : [128, 96];
  let geo: THREE.BufferGeometry = new THREE.SphereGeometry(1, seg[0], seg[1]);
  geo.deleteAttribute('normal');
  geo.deleteAttribute('uv');
  geo = mergeVertices(geo, 1e-5);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const n = pos.count;
  const dirs = new Float32Array(n * 3);
  const tmp = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    const dx = pos.getX(i), dy = pos.getY(i), dz = pos.getZ(i);
    dirs[i * 3] = dx; dirs[i * 3 + 1] = dy; dirs[i * 3 + 2] = dz;
    sculpt(dx, dy, dz, tmp);
    pos.setXYZ(i, tmp.x, tmp.y, tmp.z);
  }
  geo.computeVertexNormals();

  // ───────────── masks ─────────────
  const hairHex = o.hairHex || '#1C1612';
  const skin = new THREE.Color(o.skinHex);
  const hairCol = new THREE.Color(hairHex);
  const beardCol = new THREE.Color(spec.beardColor);
  const stubbleCol = skin.clone().lerp(new THREE.Color('#1c1815'), 0.82); // dark grey-brown shadow, not orange
  const lipCol = skin.clone().lerp(new THREE.Color('#9b4a3c'), 0.5);
  const warm = skin.clone().lerp(new THREE.Color('#b8553f'), 0.35);
  const shade = skin.clone().multiplyScalar(0.72);

  const hairless = spec.hairStyle === 'bald' || o.headgear === 'turban';
  const hairlineAt = (dz: number, ax: number) => {
    // vertical position of the hairline as the head turns from front to back
    const f = dz;
    let hl: number;
    if (f >= 0.55) hl = 0.5 - 0.14 * sstep(0.4, 0.95, ax);
    else if (f >= -0.3) hl = 0.5 + (0.12 - 0.5) * sstep(0.55, -0.3, f) - 0.02;
    else hl = 0.12 + (-0.34 - 0.12) * sstep(-0.3, -0.9, f);
    return hl;
  };
  const hairMask = (dx: number, dy: number, dz: number) =>
    hairless ? 0 : sstep(hairlineAt(dz, Math.abs(dx)) - 0.03, hairlineAt(dz, Math.abs(dx)) + 0.05, dy);

  const beardStyle = spec.beardStyle;
  const fullBeard = beardStyle === 'full_heavy' || beardStyle === 'full_salt_pepper';
  const beardMask = (dx: number, dy: number, dz: number) => {
    if (beardStyle === 'none') return 0;
    const ax = Math.abs(dx);
    const yb = -0.2 + 0.2 * sstep(0.2, 0.95, ax); // cheek boundary rises toward the sideburn
    let m = sstep(yb + 0.05, yb - 0.04, dy) * sstep(-0.35, -0.05, dz);
    m *= 1 - Math.exp(-((dx / 0.19) ** 2) - ((dy + 0.337) / 0.03) ** 2); // keep the mouth clear
    if (beardStyle === 'boxed') m *= sstep(0.72, 0.58, ax);
    if (beardStyle === 'trimmed') m *= sstep(0.8, 0.6, ax) * sstep(-0.08, -0.22, dy + 0.12 * (1 - ax));
    return m;
  };
  const stubbleMask = (dx: number, dy: number, dz: number) => {
    const ax = Math.abs(dx);
    const yb = -0.16 + 0.22 * sstep(0.25, 0.95, ax);
    let m = sstep(yb + 0.06, yb - 0.04, dy) * sstep(-0.3, 0.0, dz);
    // upper-lip stubble band
    m = Math.max(m, 0.8 * gauss(ax, dy, 0, -0.26, 0.26, 0.05));
    return m;
  };
  const stubbleAmt =
    beardStyle === 'stubble' ? 0.88 : beardStyle === 'none' ? 0 : 0.35; // base layer under real beards

  // vertex colours: skin with lips, warmth, eye shadow, stubble and scalp tint
  const colors = new Float32Array(n * 3);
  const c = new THREE.Color();
  const beardM = new Float32Array(n);
  const hairM = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const dx = dirs[i * 3], dy = dirs[i * 3 + 1], dz = dirs[i * 3 + 2];
    const ax = Math.abs(dx);
    const px = pos.getX(i), py = pos.getY(i), pz = pos.getZ(i);
    c.copy(skin);
    const nz = noise3(px * 60, py * 60, pz * 60);
    c.multiplyScalar(0.96 + 0.08 * nz);
    const front = sstep(0.15, 0.5, dz);
    c.lerp(warm, 0.18 * gauss(ax, dy, 0.44, -0.12, 0.2, 0.14) * front); // cheeks
    c.lerp(warm, 0.12 * gauss(ax, dy, 0, -0.14, 0.09, 0.1) * front); // nose tip
    c.lerp(shade, 0.35 * gauss(ax, dy, 0.285, 0.06, 0.12, 0.075) * front); // eye sockets
    c.lerp(shade, 0.35 * gauss(ax, dy, 0.36, -0.01, 0.15, 0.04) * front); // under-eye
    c.lerp(shade, 0.5 * gauss(ax, dy, 0.058, -0.195, 0.03, 0.026) * front); // nostrils
    c.lerp(lipCol, 0.9 * (gauss(ax, dy, 0, -0.29, 0.14, 0.03) + gauss(ax, dy, 0, -0.38, 0.12, 0.035)) * front);
    c.lerp(shade, 0.7 * gauss(ax, dy, 0, -0.335, 0.15, 0.012) * front); // mouth line
    const grain = noise3(px * 70, py * 70, pz * 70);
    const sm = stubbleMask(dx, dy, dz) * stubbleAmt * (0.78 + 0.34 * grain);
    c.lerp(stubbleCol, clamp(sm, 0, 0.85));
    const hm = hairMask(dx, dy, dz);
    hairM[i] = hm;
    if (hm > 0.01) c.lerp(hairCol, hm);
    // bald heads get a faint dark shadow where hair would grow
    if (hairless && o.headgear !== 'turban') {
      const ghost = sstep(0.1, -0.2, dz) * sstep(0.4, -0.1, dy) * 0.0;
      c.lerp(hairCol, ghost);
    }
    beardM[i] = beardMask(dx, dy, dz);
    colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const headMat = trackMat(
    new THREE.MeshStandardMaterial({ color: '#ffffff', vertexColors: true, roughness: 0.62, metalness: 0.02 }),
    true,
    0.14
  );
  const headMesh = new THREE.Mesh(trackGeo(geo), headMat);
  headMesh.castShadow = true;
  group.add(headMesh);

  // ───────────── shell helper (beard / hair volume) ─────────────
  const makeShell = (
    mask: Float32Array,
    thickness: number,
    tint: (i: number) => THREE.Color,
    extra?: (i: number, p: THREE.Vector3) => void
  ) => {
    const idx = geo.index!;
    const nrm = geo.attributes.normal as THREE.BufferAttribute;
    const remap = new Map<number, number>();
    const P: number[] = [];
    const C: number[] = [];
    const I: number[] = [];
    const get = (v: number) => {
      let r = remap.get(v);
      if (r === undefined) {
        r = P.length / 3;
        remap.set(v, r);
        const w = sstep(0.2, 0.8, mask[v]);
        const p = new THREE.Vector3(pos.getX(v), pos.getY(v), pos.getZ(v));
        p.addScaledVector(new THREE.Vector3(nrm.getX(v), nrm.getY(v), nrm.getZ(v)), thickness * w);
        if (extra) extra(v, p);
        P.push(p.x, p.y, p.z);
        const col = tint(v);
        C.push(col.r, col.g, col.b, sstep(0.1, 0.55, mask[v]));
      }
      return r;
    };
    for (let t = 0; t < idx.count; t += 3) {
      const a = idx.getX(t), b = idx.getX(t + 1), d = idx.getX(t + 2);
      if (Math.max(mask[a], mask[b], mask[d]) > 0.12) {
        I.push(get(a), get(b), get(d));
      }
    }
    if (!I.length) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(C, 4));
    const U: number[] = [];
    for (let k = 0; k < P.length; k += 3) U.push(P[k] * 7 + P[k + 2] * 3, P[k + 1] * 7);
    g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
    g.setIndex(I);
    g.computeVertexNormals();
    return g;
  };

  const fibre = trackTex(createFibreBump(o.isMobile ? 128 : 256));
  const fibreMat = (rough = 0.9) =>
    trackMat(
      new THREE.MeshStandardMaterial({
        color: '#ffffff', vertexColors: true, roughness: rough, metalness: 0.03, bumpMap: fibre, bumpScale: 2.4,
        transparent: true, depthWrite: false,
      }),
      true,
      0.1
    );

  // ───────────── beard ─────────────
  if (beardStyle !== 'none' && beardStyle !== 'stubble') {
    const thick = fullBeard ? 0.02 : beardStyle === 'boxed' ? 0.016 : 0.011;
    const silver = new THREE.Color(spec.hairHighlightColor || '#cfcac4');
    beardCol.lerp(new THREE.Color('#4a3f38'), 0.22);
    const g = makeShell(
      beardM,
      thick,
      (i) => {
        const col = beardCol.clone();
        if (beardStyle === 'full_salt_pepper') {
          const px = pos.getX(i), py = pos.getY(i), pz = pos.getZ(i);
          const k = noise3(px * 14 + 3, py * 26, pz * 14);
          col.lerp(silver, clamp((k - 0.3) * 2.0, 0, 0.9));
          col.lerp(silver, 0.45 * sstep(-0.45, -0.8, dirs[i * 3 + 1])); // greyer toward the chin
        } else {
          const k = noise3(pos.getX(i) * 22, pos.getY(i) * 40, pos.getZ(i) * 22);
          col.multiplyScalar(0.8 + 0.7 * k);
        }
        return col;
      },
      fullBeard || beardStyle === 'boxed'
        ? (i, p) => {
            const dx = dirs[i * 3], dy = dirs[i * 3 + 1], dz = dirs[i * 3 + 2];
            const chin = Math.exp(-((dx / 0.5) ** 2)) * sstep(-0.42, -0.75, dy) * sstep(0.1, 0.6, dz);
            const len = fullBeard ? 0.055 : 0.03;
            p.y -= len * chin;
            p.z += 0.012 * chin;
          }
        : undefined
    );
    if (g) {
      const mesh = new THREE.Mesh(trackGeo(g), fibreMat());
      mesh.castShadow = true;
      group.add(mesh);
    }
  }

  // ───────────── hair ─────────────
  const hs = spec.hairStyle;
  if (!hairless) {
    const silver = new THREE.Color(spec.hairHighlightColor || '#d8d4ce');
    const hairThick = hs === 'curly_hero' ? 0.014 : hs === 'swept_silver' ? 0.018 : hs === 'swept_dark' ? 0.016 : 0.008;
    const g = makeShell(hairM, hairThick, (i) => {
      const col = hairCol.clone();
      const px = pos.getX(i), py = pos.getY(i), pz = pos.getZ(i);
      if (hs === 'swept_silver') col.lerp(new THREE.Color('#8c8782'), clamp((noise3(px * 12, py * 22, pz * 12) - 0.35) * 1.6, 0, 0.75));
      else col.lerp(new THREE.Color(spec.hairHighlightColor || '#2e2622'), noise3(px * 16, py * 30, pz * 16) * 0.6);
      return col;
    }, hs === 'swept_dark' || hs === 'swept_silver'
      ? (i, p) => {
          // swept back: lift the crown into a quiff and add volume at the back
          const dy = dirs[i * 3 + 1], dz = dirs[i * 3 + 2];
          const crown = sstep(0.55, 0.95, dy) * sstep(-0.5, 0.7, dz);
          p.y += 0.022 * crown;
          p.z += 0.012 * crown * sstep(0.2, 0.9, dz);
        }
      : undefined);
    if (g) {
      const mesh = new THREE.Mesh(trackGeo(g), fibreMat(0.85));
      mesh.castShadow = true;
      group.add(mesh);
    }

    if (hs === 'swept_silver') {
      // Man bun: tied-up knot at the back of the head with a red hair tie
      const bunMat = trackMat(
        new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.8, metalness: 0.03, bumpMap: fibre, bumpScale: 1.5 }),
        true,
        0.1
      );
      bunMat.color.copy(hairCol).lerp(new THREE.Color('#8c8782'), 0.35);
      const bun = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.092, 22, 16)), bunMat);
      bun.scale.set(1, 0.9, 1);
      bun.position.set(0, ry * 0.5, -rz * 0.98 - 0.045);
      bun.castShadow = true;
      const base = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.06, 14, 10)), bunMat);
      base.scale.set(1.1, 0.8, 1);
      base.position.set(0, ry * 0.52, -rz * 0.9);
      const tie = new THREE.Mesh(
        trackGeo(new THREE.TorusGeometry(0.06, 0.012, 8, 20)),
        trackMat(new THREE.MeshStandardMaterial({ color: '#b91c1c', roughness: 0.6 }), false)
      );
      tie.position.set(0, ry * 0.52, -rz * 0.94 - 0.005);
      group.add(bun, base, tie);
    }

    if (hs === 'curly_hero') {
      // dense curls: overlapping rounded clumps over the crown, back and hairline
      const rnd = seededRng(1234);
      const curlGeo = trackGeo(new THREE.IcosahedronGeometry(1, 2));
      const curlMat = trackMat(
        new THREE.MeshStandardMaterial({ color: '#ffffff', vertexColors: false, roughness: 0.8, metalness: 0.03, bumpMap: fibre, bumpScale: 1.5 }),
        true,
        0.1
      );
      curlMat.color.copy(hairCol);
      const count = o.isMobile ? 70 : 110;
      const m = new THREE.Matrix4();
      const inst = new THREE.InstancedMesh(curlGeo, curlMat, count);
      const q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), p = new THREE.Vector3();
      let placed = 0;
      let guard = 0;
      while (placed < count && guard++ < 4000) {
        const th = Math.acos(1 - rnd() * 1.4); // from the crown outward
        const ph = rnd() * Math.PI * 2;
        const dx = Math.sin(th) * Math.cos(ph), dy = Math.cos(th), dz = Math.sin(th) * Math.sin(ph);
        const hl = hairlineAt(dz, Math.abs(dx));
        if (dy < hl + 0.04) continue;
        const r = 0.03 + rnd() * 0.026;
        sculpt(dx, dy, dz, p);
        const out = new THREE.Vector3(dx, dy, dz).normalize();
        p.addScaledVector(out, 0.012 + r * 0.55);
        sc.set(r * (1.05 + rnd() * 0.2), r * (0.85 + rnd() * 0.2), r * (1 + rnd() * 0.2));
        e.set(rnd() * 3, rnd() * 3, rnd() * 3);
        q.setFromEuler(e);
        m.compose(p, q, sc);
        inst.setMatrixAt(placed, m);
        placed++;
      }
      inst.count = placed;
      inst.castShadow = true;
      group.add(inst);
    }
  }

  // ───────────── eyes ─────────────
  const eyeX = 0.285;
  const eyeY = 0.085;
  const eyeR = 0.0215;
  const squint = spec.eyeSquint;
  const eyeCol = new THREE.Color(spec.eyeColor || '#2c170b');
  const scleraMat = trackMat(new THREE.MeshStandardMaterial({ color: '#f1ece4', roughness: 0.28, metalness: 0 }), false);
  const irisMat = trackMat(new THREE.MeshStandardMaterial({ color: eyeCol, roughness: 0.25, metalness: 0.05 }), false);
  const pupilMat = trackMat(new THREE.MeshBasicMaterial({ color: '#050403' }), false);
  const glintMat = trackMat(new THREE.MeshBasicMaterial({ color: '#ffffff' }), false);
  const lidMat = trackMat(new THREE.MeshStandardMaterial({ color: skin.clone().multiplyScalar(0.97), roughness: 0.6, metalness: 0.02 }), true, 0.14);
  const lashMat = trackMat(new THREE.MeshStandardMaterial({ color: '#1a120d', roughness: 0.7 }), false);
  const eyeBallGeo = trackGeo(new THREE.SphereGeometry(eyeR, 24, 18));
  const irisGeo = trackGeo(new THREE.SphereGeometry(eyeR * 1.004, 20, 12, 0, Math.PI * 2, 0, 0.46));
  const pupilGeo = trackGeo(new THREE.SphereGeometry(eyeR * 1.008, 16, 10, 0, Math.PI * 2, 0, 0.2));
  const glintGeo = trackGeo(new THREE.SphereGeometry(0.0034, 8, 6));
  const upperEdge = clamp(0.3 - 0.3 * squint, 0.02, 0.4);
  const lowerEdge = -0.62 + 0.14 * squint;
  const lidR = eyeR * 1.14;
  const capGeo = (edgeY: number, up: boolean) => {
    const theta = Math.acos(clamp(up ? edgeY : -edgeY, -1, 1));
    return trackGeo(new THREE.SphereGeometry(lidR, 24, 14, 0, Math.PI * 2, 0, theta));
  };
  const upperLidGeo = capGeo(upperEdge, true);
  const lowerLidGeo = trackGeo(
    new THREE.SphereGeometry(lidR, 24, 14, 0, Math.PI * 2, 0, Math.acos(clamp(-lowerEdge, -1, 1)))
  );
  const lashGeo = trackGeo(new THREE.TorusGeometry(lidR * Math.sqrt(1 - upperEdge * upperEdge), 0.0016, 6, 22, Math.PI));

  const surf = new THREE.Vector3();
  for (const side of [-1, 1]) {
    sculpt(side * eyeX, eyeY, Math.sqrt(Math.max(0, 1 - eyeX * eyeX - eyeY * eyeY)), surf);
    const eye = new THREE.Group();
    eye.position.set(surf.x, surf.y, surf.z - 0.0065);
    eye.rotation.y = side * 0.18; // slight outward gaze so the eyes follow the head curve
    const ball = new THREE.Mesh(eyeBallGeo, scleraMat);
    const iris = new THREE.Mesh(irisGeo, irisMat);
    const pupil = new THREE.Mesh(pupilGeo, pupilMat);
    iris.rotation.x = pupil.rotation.x = Math.PI / 2;
    const glint = new THREE.Mesh(glintGeo, glintMat);
    glint.position.set(-0.0045, 0.0055, eyeR * 0.96);
    const up = new THREE.Mesh(upperLidGeo, lidMat);
    const lo = new THREE.Mesh(lowerLidGeo, lidMat);
    lo.rotation.x = Math.PI; // cap around -Y
    const lash = new THREE.Mesh(lashGeo, lashMat);
    lash.rotation.x = Math.PI / 2;
    lash.position.y = lidR * upperEdge;
    eye.add(ball, iris, pupil, glint, up, lo, lash);
    eye.scale.set(1.28, 1, 1);
    // brow-ward tilt for a fierce martial look
    eye.rotation.z = side * -0.06 * (spec.browFurrow > 0.18 ? 1 : 0.5);
    group.add(eye);
  }

  // ───────────── brows ─────────────
  const browMat = trackMat(new THREE.MeshStandardMaterial({ color: beardCol.clone().lerp(new THREE.Color('#5a4a3e'), 0.25), roughness: 0.85 }), true, 0.1);
  const browThick = 0.0065 + (spec.browProminence - 0.012) * 0.45;
  for (const side of [-1, 1]) {
    const pts: THREE.Vector3[] = [];
    const steps = 6;
    for (let k = 0; k <= steps; k++) {
      const t = k / steps; // inner → outer
      const ax = 0.1 + 0.34 * t;
      const ay = 0.205 + 0.04 * Math.sin(t * Math.PI * 0.9) - spec.browFurrow * 0.1 * (1 - t) + 0.0;
      const dz = Math.sqrt(Math.max(0.02, 1 - ax * ax - ay * ay));
      sculpt(side * ax, ay, dz, surf);
      const out = new THREE.Vector3(side * ax, ay, dz).normalize();
      pts.push(surf.clone().addScaledVector(out, 0.003));
    }
    const tube = new THREE.Mesh(
      trackGeo(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, browThick, 6, false)),
      browMat
    );
    group.add(tube);
  }

  // ───────────── moustache ─────────────
  if (spec.mustacheStyle !== 'none') {
    const mm = trackMat(new THREE.MeshStandardMaterial({ color: beardCol.clone().lerp(new THREE.Color('#5a4a3e'), 0.2), roughness: 0.9, bumpMap: fibre, bumpScale: 1 }), true, 0.1);
    const pt = (ax: number, ay: number, lift: number) => {
      const dz = Math.sqrt(Math.max(0.02, 1 - ax * ax - ay * ay));
      sculpt(ax, ay, dz, surf);
      return surf.clone().add(new THREE.Vector3(ax * 0.1, ay * 0.1, dz).normalize().multiplyScalar(lift));
    };
    for (const side of [-1, 1]) {
      let curve: THREE.CatmullRomCurve3, r: number;
      if (spec.mustacheStyle === 'handlebar') {
        curve = new THREE.CatmullRomCurve3([
          pt(side * 0.01, -0.262, 0.012), pt(side * 0.1, -0.272, 0.012), pt(side * 0.22, -0.298, 0.011),
          pt(side * 0.36, -0.31, 0.01), pt(side * 0.48, -0.285, 0.012), pt(side * 0.52, -0.23, 0.018),
        ]);
        r = 0.0145;
      } else if (spec.mustacheStyle === 'bushy') {
        curve = new THREE.CatmullRomCurve3([
          pt(side * 0.01, -0.262, 0.012), pt(side * 0.11, -0.275, 0.014), pt(side * 0.23, -0.31, 0.012), pt(side * 0.3, -0.35, 0.01),
        ]);
        r = 0.02;
      } else {
        curve = new THREE.CatmullRomCurve3([pt(side * 0.01, -0.262, 0.008), pt(side * 0.1, -0.272, 0.008), pt(side * 0.2, -0.295, 0.007)]);
        r = 0.011;
      }
      const thick = new THREE.Mesh(trackGeo(new THREE.TubeGeometry(curve, 24, r, 8, false)), mm);
      group.add(thick);
      const inner = new THREE.Mesh(
        trackGeo(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(curve.getPoints(6).slice(0, 4)), 12, r * 1.25, 8, false)),
        mm
      );
      group.add(inner);
    }
  }

  return group;
}
