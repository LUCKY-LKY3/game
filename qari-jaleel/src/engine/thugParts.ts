// Shaped body parts for the village cousins: a smooth torso with a built-in belly, tapered limbs,
// fists, chappals, woven fabric textures and a draped gamcha. Used by villageThugs.ts.
import * as THREE from 'three';

export type FabricPattern = 'plain' | 'check' | 'stripe' | 'madras';

/** Small hash so every cousin gets the same pattern each time */
export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function shade(hex: string, k: number): string {
  const c = new THREE.Color(hex);
  c.multiplyScalar(k);
  return `#${c.getHexString()}`;
}

/** Woven cotton look: base colour, a soft pattern and a fine weave so clothes don't look like plastic */
export function fabricTexture(base: string, pattern: FabricPattern, accent: string, size = 128): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const g = c.getContext('2d')!;
  g.fillStyle = base;
  g.fillRect(0, 0, size, size);
  const dark = shade(base, 0.78);
  if (pattern === 'check' || pattern === 'madras') {
    g.globalAlpha = pattern === 'madras' ? 0.5 : 0.35;
    g.fillStyle = accent;
    const step = size / 4;
    for (let i = 0; i < 4; i++) {
      g.fillRect(i * step, 0, step * 0.35, size);
      g.fillRect(0, i * step, size, step * 0.35);
    }
    if (pattern === 'madras') {
      g.fillStyle = dark;
      for (let i = 0; i < 4; i++) {
        g.fillRect(i * step + step * 0.6, 0, 3, size);
        g.fillRect(0, i * step + step * 0.6, size, 3);
      }
    }
  } else if (pattern === 'stripe') {
    g.globalAlpha = 0.45;
    g.fillStyle = accent;
    for (let x = 0; x < size; x += size / 8) g.fillRect(x, 0, size / 20, size);
  }
  // fine weave
  g.globalAlpha = 0.09;
  g.fillStyle = '#000000';
  for (let y = 0; y < size; y += 2) g.fillRect(0, y, size, 1);
  g.globalAlpha = 0.06;
  g.fillStyle = '#FFFFFF';
  for (let x = 0; x < size; x += 3) g.fillRect(x, 0, 1, size);
  g.globalAlpha = 1;
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(2, 2);
  return t;
}

/**
 * Torso from waist (y=0) to shoulders (~0.62) as one smooth shape. The belly is pushed out of the
 * front of the same surface, so it reads as a real pot belly under the shirt instead of a ball.
 */
export function torsoGeometry(bulge: number): THREE.BufferGeometry {
  const pts = [
    [0.0, -0.05],
    [0.2, -0.045],
    [0.222, 0.04],
    [0.228, 0.18],
    [0.236, 0.33],
    [0.255, 0.45],
    [0.25, 0.52],
    [0.2, 0.585],
    [0.1, 0.62],
    [0.0, 0.625],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  const geo = new THREE.LatheGeometry(pts, 22);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const yc = 0.17 - bulge * 0.12;
  const sig = 0.15 + bulge * 0.35;
  const amp = bulge * 1.3;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i) * 1.12;
    const y = pos.getY(i);
    let z = pos.getZ(i) * 0.78;
    const g = Math.exp(-(((y - yc) / sig) ** 2));
    const r = Math.hypot(x, z);
    if (r > 0.001) {
      const front = Math.max(0, z / r);
      z += amp * front ** 1.4 * g;
      x *= 1 + bulge * 0.75 * g;
      if (z < 0) z -= amp * 0.12 * g;
    }
    pos.setXYZ(i, x, y, z);
  }
  geo.computeVertexNormals();
  return geo;
}

/** A limb hanging down from its joint: rounded ends, tapering from rTop to rBot over len */
export function limbGeometry(rTop: number, rBot: number, len: number): THREE.BufferGeometry {
  const pts: THREE.Vector2[] = [];
  const cap = 5;
  for (let i = 0; i <= cap; i++) {
    const a = (i / cap) * (Math.PI / 2);
    pts.push(new THREE.Vector2(Math.sin(a) * rBot, -len - Math.cos(a) * rBot * 0.6 + rBot * 0.6));
  }
  // slight calf / forearm swell in the upper third
  pts.push(new THREE.Vector2(THREE.MathUtils.lerp(rBot, rTop, 0.55) * 1.07, -len * 0.55));
  for (let i = cap; i >= 0; i--) {
    const a = (i / cap) * (Math.PI / 2);
    pts.push(new THREE.Vector2(Math.sin(a) * rTop, Math.cos(a) * rTop * 0.6));
  }
  const geo = new THREE.LatheGeometry(pts, 12);
  geo.computeVertexNormals();
  return geo;
}

/** A clenched fist: palm, knuckles and thumb. Origin at the wrist, hanging down (-Y). */
export function fistGroup(geos: FistGeos, skin: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  const palm = new THREE.Mesh(geos.palm, skin);
  palm.position.y = -0.05;
  palm.scale.set(1.05, 1.15, 0.85);
  palm.castShadow = true;
  g.add(palm);
  for (let k = 0; k < 4; k++) {
    const kn = new THREE.Mesh(geos.knuckle, skin);
    kn.position.set(-0.033 + k * 0.022, -0.1, 0.025);
    g.add(kn);
  }
  const thumb = new THREE.Mesh(geos.thumb, skin);
  thumb.position.set(0.045, -0.06, 0.03);
  thumb.rotation.set(0.4, 0, -0.5);
  g.add(thumb);
  return g;
}
export interface FistGeos {
  palm: THREE.BufferGeometry;
  knuckle: THREE.BufferGeometry;
  thumb: THREE.BufferGeometry;
}
export function makeFistGeos(track: <T extends THREE.BufferGeometry>(g: T) => T): FistGeos {
  return {
    palm: track(new THREE.SphereGeometry(0.055, 10, 8)),
    knuckle: track(new THREE.SphereGeometry(0.019, 6, 5)),
    thumb: track(new THREE.CapsuleGeometry(0.017, 0.035, 3, 6)),
  };
}

/** Bare foot in a village chappal. Origin at the ankle. */
export function chappalFoot(geos: FootGeos, skin: THREE.Material, sole: THREE.Material, strap: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  const foot = new THREE.Mesh(geos.foot, skin);
  foot.position.set(0, -0.03, 0.05);
  foot.scale.set(0.9, 0.55, 1.7);
  foot.castShadow = true;
  const s = new THREE.Mesh(geos.sole, sole);
  s.position.set(0, -0.065, 0.05);
  s.scale.set(1, 1, 1.9);
  s.castShadow = true;
  const st = new THREE.Mesh(geos.strap, strap);
  st.position.set(0, -0.04, 0.09);
  st.rotation.x = Math.PI / 2.4;
  g.add(foot, s, st);
  return g;
}
export interface FootGeos {
  foot: THREE.BufferGeometry;
  sole: THREE.BufferGeometry;
  strap: THREE.BufferGeometry;
}
export function makeFootGeos(track: <T extends THREE.BufferGeometry>(g: T) => T): FootGeos {
  return {
    foot: track(new THREE.SphereGeometry(0.058, 10, 8)),
    sole: track(new THREE.CylinderGeometry(0.068, 0.072, 0.024, 14)),
    strap: track(new THREE.TorusGeometry(0.05, 0.012, 6, 12, Math.PI)),
  };
}

/** A flat cloth band following a path (for the draped gamcha). */
export function ribbonGeometry(path: THREE.Vector3[], width: number, thickness = 0.012): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(path);
  const n = 28;
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  // The band's width runs across the shoulder (X), so it lies flat on the body
  const side = new THREE.Vector3(width / 2, 0, 0);
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const p = curve.getPoint(t);
    // two faces offset by thickness so it renders from both sides
    pos.push(p.x - side.x, p.y - side.y, p.z - side.z, p.x + side.x, p.y + side.y, p.z + side.z);
    uv.push(0, t * 3, 1, t * 3);
    if (i < n) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  void thickness;
  return geo;
}
