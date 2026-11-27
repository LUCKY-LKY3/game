import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Performance: bake every static mesh under `root` into one mesh per material (in root's local space).
 * Objects in `keep` (and their children) are left alone because they animate on their own.
 */
export function mergeStatic(root: THREE.Object3D, keep: Set<THREE.Object3D>, track: (g: THREE.BufferGeometry) => void) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const buckets = new Map<THREE.Material, { geos: THREE.BufferGeometry[]; cast: boolean; receive: boolean }>();
  const victims: THREE.Mesh[] = [];
  root.traverse((o) => {
    if (!(o as THREE.Mesh).isMesh || (o as THREE.InstancedMesh).isInstancedMesh) return;
    for (let q: THREE.Object3D | null = o; q && q !== root; q = q.parent) if (keep.has(q) || !q.visible) return;
    const m = o as THREE.Mesh;
    if (Array.isArray(m.material)) return;
    let g = m.geometry.clone();
    g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld));
    if (g.index) g = g.toNonIndexed();
    for (const name of Object.keys(g.attributes)) if (name !== 'position' && name !== 'normal' && name !== 'uv') g.deleteAttribute(name);
    if (!g.attributes.normal) g.computeVertexNormals();
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    const b = buckets.get(m.material) ?? { geos: [], cast: false, receive: false };
    b.geos.push(g);
    b.cast ||= m.castShadow;
    b.receive ||= m.receiveShadow;
    buckets.set(m.material, b);
    victims.push(m);
  });
  if (victims.length < 4) return;
  for (const v of victims) v.parent?.remove(v);
  buckets.forEach((b, mat) => {
    const merged = mergeGeometries(b.geos, false);
    b.geos.forEach((g) => g.dispose());
    if (!merged) return;
    track(merged);
    const mesh = new THREE.Mesh(merged, mat);
    mesh.castShadow = b.cast;
    mesh.receiveShadow = b.receive;
    root.add(mesh);
  });
}

