import * as THREE from 'three';
import { StageId } from '../types/game';
import { getStageById } from '../data/roster';
import { createVillageSheep } from './villageSheep';

export interface VillageStageHandle {
  group: THREE.Group;
  update: (time: number, dt: number) => void;
  dispose: () => void;
}

/** Generates a procedural earthen clay / sandstone village floor CanvasTexture */
function createGroundTexture(stageId: StageId, maxAnisotropy: number): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  if (stageId === 'banyan_akhara') {
    ctx.fillStyle = '#8F4526';
    ctx.fillRect(0, 0, size, size);
    // Warm red akhara soil grain & concentric footprints
    for (let i = 0; i < 4200; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = 1 + Math.random() * 2.5;
      ctx.fillStyle =
        i % 3 === 0
          ? 'rgba(190, 96, 48, 0.32)'
          : i % 3 === 1
            ? 'rgba(72, 28, 14, 0.28)'
            : 'rgba(245, 165, 70, 0.14)';
      ctx.fillRect(x, y, r, r);
    }
    // Subtle akhara chalk circle marking
    ctx.strokeStyle = 'rgba(248, 240, 224, 0.22)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size * 0.41, 0, Math.PI * 2);
    ctx.stroke();
  } else if (stageId === 'chai_chowk') {
    ctx.fillStyle = '#B89162';
    ctx.fillRect(0, 0, size, size);
    // Sun-baked stone courtyard tiles
    ctx.strokeStyle = 'rgba(78, 56, 36, 0.28)';
    ctx.lineWidth = 3;
    const step = 64;
    for (let y = 0; y < size; y += step) {
      for (let x = 0; x < size; x += step) {
        const offset = (y / step) % 2 === 0 ? 0 : step / 2;
        ctx.fillStyle =
          (x + y) % 128 === 0 ? 'rgba(235, 210, 170, 0.14)' : 'rgba(92, 66, 40, 0.1)';
        ctx.fillRect((x + offset) % size, y, step - 4, step - 4);
        ctx.strokeRect((x + offset) % size, y, step, step);
      }
    }
    for (let i = 0; i < 2000; i++) {
      ctx.fillStyle = 'rgba(70, 45, 25, 0.16)';
      ctx.fillRect(Math.random() * size, Math.random() * size, 2, 2);
    }
  } else {
    // Mela Dusk dirt & rangoli festival ground
    ctx.fillStyle = '#553A2C';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 3500; i++) {
      ctx.fillStyle =
        i % 2 === 0 ? 'rgba(130, 82, 52, 0.24)' : 'rgba(28, 16, 12, 0.34)';
      ctx.fillRect(Math.random() * size, Math.random() * size, 2.5, 2.5);
    }
    // Subtle marigold & chalk festival rangoli pattern in center
    ctx.save();
    ctx.translate(size / 2, size / 2);
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.32)';
    ctx.lineWidth = 4;
    for (let i = 0; i < 12; i++) {
      ctx.rotate(Math.PI / 6);
      ctx.beginPath();
      ctx.ellipse(0, 85, 22, 62, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

/**
 * Builds the selected 3D Indian village fighting stage with panoramic stage backdrop,
 * earthen/courtyard combat pit, composite 3D village props, ambient motes, and lighting.
 */
export function buildVillageStage(
  scene: THREE.Scene,
  stageId: StageId,
  maxAnisotropy: number
): VillageStageHandle {
  const cfg = getStageById(stageId);
  const group = new THREE.Group();
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geometries.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    materials.push(m);
    return m;
  };

  scene.background = new THREE.Color(cfg.skyColor);
  scene.fog = new THREE.FogExp2(cfg.fogColor, stageId === 'mela_dusk' ? 0.018 : 0.013);

  // 1. Balanced 3-Point Warm/Cool Outdoor Lighting Rig (<= 1 shadow caster)
  const hemiSky = stageId === 'mela_dusk' ? 0x4b5c9e : stageId === 'chai_chowk' ? 0xcce8ff : 0xffd7a3;
  const hemiGround = stageId === 'mela_dusk' ? 0x422414 : 0x6b3a1f;
  const hemiLight = new THREE.HemisphereLight(
    hemiSky,
    hemiGround,
    stageId === 'mela_dusk' ? 0.85 : 0.95
  );
  group.add(hemiLight);

  const keyLight = new THREE.DirectionalLight(
    stageId === 'mela_dusk' ? 0xffb35c : stageId === 'chai_chowk' ? 0xfff5df : 0xffbe73,
    stageId === 'mela_dusk' ? 1.5 : 2.1
  );
  keyLight.position.set(6, 14, 10);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  keyLight.shadow.camera.near = 1;
  keyLight.shadow.camera.far = 40;
  keyLight.shadow.camera.left = -14;
  keyLight.shadow.camera.right = 14;
  keyLight.shadow.camera.top = 10;
  keyLight.shadow.camera.bottom = -8;
  keyLight.shadow.bias = -0.0005;
  keyLight.shadow.normalBias = 0.02;
  group.add(keyLight);

  // Warm #ffbe76 silhouette rim backlight to carve fighter edges & cloth folds sharply against village scenery
  const rimLight = new THREE.DirectionalLight(
    0xffbe76,
    stageId === 'mela_dusk' ? 1.62 : 1.48
  );
  rimLight.position.set(-5.5, 6.4, -8.5);
  group.add(rimLight);

  // Soft frontal camera-side fill light so real mapped faces remain crisp and warm in combat
  const faceFillLight = new THREE.DirectionalLight(
    stageId === 'mela_dusk' ? 0xffdfc2 : 0xfff3e2,
    stageId === 'mela_dusk' ? 0.62 : 0.5
  );
  faceFillLight.position.set(0.5, 3.2, 8.5);
  group.add(faceFillLight);

  // 2. Expansive Natural Village Terrain extending into horizon fog
  const outerGroundMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: cfg.ringRimColor,
      roughness: 0.95,
      metalness: 0.02,
    })
  );
  const outerGround = new THREE.Mesh(trackGeo(new THREE.CircleGeometry(46, 48)), outerGroundMat);
  outerGround.rotation.x = -Math.PI / 2;
  outerGround.position.y = -0.04;
  outerGround.receiveShadow = true;
  group.add(outerGround);

  // Central combat pit / courtyard surface (offset +0.04 above outer ground so zero Z-fighting)
  const pitTex = createGroundTexture(stageId, maxAnisotropy);
  textures.push(pitTex);
  const pitMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: pitTex,
      roughness: 0.9,
      metalness: 0.03,
    })
  );
  const pitMesh = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(9.6, 10.1, 0.08, 48)),
    pitMat
  );
  pitMesh.scale.set(1.22, 1, 0.72);
  pitMesh.position.y = -0.04;
  pitMesh.receiveShadow = true;
  group.add(pitMesh);

  // Raised mud/stone akhara perimeter rim framing the wide Double Dragon fighting lane
  const rimMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: cfg.ringRimColor,
      roughness: 0.92,
      metalness: 0.04,
    })
  );
  const rimTorus = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(9.8, 0.28, 12, 48)), rimMat);
  rimTorus.rotation.x = Math.PI / 2;
  rimTorus.scale.set(1.22, 0.72, 1);
  rimTorus.position.y = 0.08;
  rimTorus.receiveShadow = true;
  rimTorus.castShadow = true;
  group.add(rimTorus);

  // 3. Curved Panoramic Hand-Painted Indian Village Backdrop behind the 3D arena
  const backdropMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: '#FFFFFF',
      side: THREE.BackSide,
      fog: false,
    })
  );
  const texLoader = new THREE.TextureLoader();
  const backdropTex = texLoader.load(cfg.backdropUrl, (t) => {
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = maxAnisotropy;
    t.needsUpdate = true;
    backdropMat.needsUpdate = true;
  });
  backdropTex.colorSpace = THREE.SRGBColorSpace;
  backdropMat.map = backdropTex;
  textures.push(backdropTex);

  // Wide curved cyclorama arc so the zoomed-out beat-'em-up camera never sees backdrop edges
  const backdropGeo = trackGeo(
    new THREE.CylinderGeometry(28, 28, 22, 48, 1, true, Math.PI * 0.48, Math.PI * 1.04)
  );
  const backdropMesh = new THREE.Mesh(backdropGeo, backdropMat);
  backdropMesh.position.set(0, 7.2, 4.5);
  group.add(backdropMesh);

  // 4. Composite 3D Village Props (Wooden Akhara Posts, Marigold Garlands, Clay Pots, Stage-Specific Hero Props)
  const woodMat = trackMat(
    new THREE.MeshStandardMaterial({ color: '#5A3A24', roughness: 0.88, metalness: 0.04 })
  );
  const marigoldMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#F59E0B',
      emissive: stageId === 'mela_dusk' ? '#78350F' : '#2E1603',
      roughness: 0.62,
      metalness: 0.05,
    })
  );
  const sindoorFlowerMat = trackMat(
    new THREE.MeshStandardMaterial({ color: '#DC2626', roughness: 0.65, metalness: 0.05 })
  );
  const clayPotMat = trackMat(
    new THREE.MeshStandardMaterial({ color: '#9E472A', roughness: 0.76, metalness: 0.06 })
  );
  const brassMat = trackMat(
    new THREE.MeshStandardMaterial({ color: '#EAB308', roughness: 0.2, metalness: 0.9 })
  );

  // Perimeter wooden posts draped with marigold garlands along the wide back edge
  const postPositions: [number, number][] = [
    [-10.2, -3.4],
    [-5.4, -6.1],
    [0, -7.1],
    [5.4, -6.1],
    [10.2, -3.4],
  ];

  const lanternLights: THREE.PointLight[] = [];
  const swayingGarlands: THREE.Object3D[] = [];

  postPositions.forEach(([px, pz], idx) => {
    const postGroup = new THREE.Group();
    postGroup.position.set(px, 0, pz);

    const pole = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.11, 0.14, 2.6, 10)), woodMat);
    pole.position.y = 1.3;
    pole.castShadow = true;
    postGroup.add(pole);

    // Decorative finial cap
    const cap = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.14, 10, 8)), brassMat);
    cap.position.y = 2.64;
    postGroup.add(cap);

    // Stage-specific glowing oil diya / lantern atop posts on Mela Dusk
    if (stageId === 'mela_dusk') {
      const glowMat = trackMat(
        new THREE.MeshStandardMaterial({
          color: '#FDE68A',
          emissive: '#F59E0B',
          emissiveIntensity: 2.2,
          roughness: 0.2,
        })
      );
      const lantern = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.14, 0.1, 0.32, 8)), glowMat);
      lantern.position.y = 2.32;
      postGroup.add(lantern);

      if (idx === 1 || idx === 3) {
        const pt = new THREE.PointLight(0xffa940, 4.2, 11, 1.8);
        pt.position.set(px, 2.4, pz + 0.4);
        group.add(pt);
        lanternLights.push(pt);
      }
    }

    group.add(postGroup);

    // Draped marigold garland connecting consecutive posts
    if (idx < postPositions.length - 1) {
      const [nx, nz] = postPositions[idx + 1];
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(px, 2.25, pz),
        new THREE.Vector3((px + nx) / 2, 1.48, (pz + nz) / 2),
        new THREE.Vector3(nx, 2.25, nz),
      ]);
      const garlandGeo = trackGeo(new THREE.TubeGeometry(curve, 16, 0.065, 8, false));
      const garlandMesh = new THREE.Mesh(
        garlandGeo,
        idx % 2 === 0 ? marigoldMat : sindoorFlowerMat
      );
      garlandMesh.castShadow = true;
      group.add(garlandMesh);
      swayingGarlands.push(garlandMesh);
    }
  });

  // Composite clay matka water pots (LatheGeometry) on left & right foreground flanks
  const potProfile = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(0.18, 0.02),
    new THREE.Vector2(0.32, 0.24),
    new THREE.Vector2(0.28, 0.46),
    new THREE.Vector2(0.14, 0.56),
    new THREE.Vector2(0.19, 0.64),
  ];
  const potGeo = trackGeo(new THREE.LatheGeometry(potProfile, 16));
  const potCoords: [number, number, number][] = [
    [-6.6, -2.0, 1.0],
    [-6.1, -2.5, 0.78],
    [6.5, -2.1, 0.95],
  ];
  potCoords.forEach(([x, z, s]) => {
    const pot = new THREE.Mesh(potGeo, clayPotMat);
    pot.position.set(x, 0, z);
    pot.scale.setScalar(s);
    pot.castShadow = true;
    pot.receiveShadow = true;
    group.add(pot);
  });

  // Stage-specific 3D Hero Accent Props behind the fighting ring
  if (stageId === 'banyan_akhara') {
    // Composite Banyan trunk + gnarled root columns on left rear
    const barkMat = trackMat(
      new THREE.MeshStandardMaterial({ color: '#4A3222', roughness: 0.94, metalness: 0.02 })
    );
    const leafMat = trackMat(
      new THREE.MeshStandardMaterial({ color: '#3F6212', roughness: 0.82, metalness: 0.02 })
    );
    const treeGroup = new THREE.Group();
    treeGroup.position.set(-5.8, 0, -7.2);

    const trunk = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.65, 1.1, 5.2, 12)), barkMat);
    trunk.position.y = 2.6;
    trunk.castShadow = true;
    treeGroup.add(trunk);

    // Hanging aerial banyan roots
    for (let i = 0; i < 5; i++) {
      const rootCol = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.06, 0.09, 4.4, 8)),
        barkMat
      );
      rootCol.position.set(-1.1 + i * 0.62, 2.2, 0.55 - (i % 2) * 0.4);
      treeGroup.add(rootCol);
    }

    // Layered banyan foliage crowns
    const crownPositions: [number, number, number, number][] = [
      [0, 5.4, 0, 2.3],
      [-1.7, 4.9, 0.4, 1.65],
      [1.8, 5.1, 0.2, 1.85],
    ];
    crownPositions.forEach(([cx, cy, cz, r]) => {
      const crown = new THREE.Mesh(trackGeo(new THREE.DodecahedronGeometry(r, 1)), leafMat);
      crown.position.set(cx, cy, cz);
      crown.scale.set(1.25, 0.72, 1.0);
      treeGroup.add(crown);
    });
    group.add(treeGroup);
  } else if (stageId === 'chai_chowk') {
    // Composite Village Chai Stall counter + shining brass kettle on right rear
    const stallGroup = new THREE.Group();
    stallGroup.position.set(5.4, 0, -6.2);
    stallGroup.rotation.y = -0.35;

    const counter = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.4, 1.15, 1.1)), woodMat);
    counter.position.y = 0.575;
    counter.castShadow = true;
    stallGroup.add(counter);

    const awningMat = trackMat(
      new THREE.MeshStandardMaterial({ color: '#DC2626', roughness: 0.82 })
    );
    const roof = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.7, 0.12, 1.5)), awningMat);
    roof.position.set(0, 2.55, 0.1);
    roof.rotation.x = 0.16;
    stallGroup.add(roof);

    for (const sx of [-1.1, 1.1]) {
      const pillar = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.06, 0.06, 2.5, 8)), woodMat);
      pillar.position.set(sx, 1.25, 0.45);
      stallGroup.add(pillar);
    }

    // Gleaming brass chai kettle
    const kettle = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.24, 14, 12)), brassMat);
    kettle.position.set(0, 1.35, 0.12);
    kettle.scale.set(1, 0.85, 1);
    stallGroup.add(kettle);
    group.add(stallGroup);
  } else {
    // Mela Dusk festival archway & warm lantern banner
    const archMat = trackMat(
      new THREE.MeshStandardMaterial({ color: '#991B1B', roughness: 0.78 })
    );
    const banner = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(6.8, 0.52, 0.18)), archMat);
    banner.position.set(0, 3.6, -7.8);
    group.add(banner);
    const goldBorder = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(6.9, 0.08, 0.22)), brassMat);
    goldBorder.position.set(0, 3.34, -7.8);
    group.add(goldBorder);
  }

  // 5. Ambient floating golden village dust motes / fireflies (InstancedMesh)
  const moteCount = 34;
  const moteGeo = trackGeo(new THREE.SphereGeometry(0.032, 6, 6));
  const moteMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: stageId === 'mela_dusk' ? '#FDE047' : '#FCD34D',
      transparent: true,
      opacity: stageId === 'mela_dusk' ? 0.75 : 0.45,
    })
  );
  const motes = new THREE.InstancedMesh(moteGeo, moteMat, moteCount);
  motes.frustumCulled = false;
  const moteSeeds = Array.from({ length: moteCount }, (_, i) => ({
    x: (Math.random() - 0.5) * 12,
    y: 0.4 + Math.random() * 3.8,
    z: -5 + Math.random() * 6,
    speed: 0.35 + (i % 5) * 0.12,
    phase: Math.random() * Math.PI * 2,
  }));
  group.add(motes);

  // 6. The Iconic Village Sheep — hanging around, grazing, and scampering across the arena!
  const villageSheep = createVillageSheep();
  group.add(villageSheep.group);

  scene.add(group);

  const _dummy = new THREE.Object3D();

  const update = (time: number, dt: number) => {
    // Gentle breeze sway on marigold garlands
    for (let i = 0; i < swayingGarlands.length; i++) {
      swayingGarlands[i].position.y = Math.sin(time * 1.8 + i * 1.1) * 0.03;
    }

    // Flickering oil lantern warmth on Mela Dusk
    for (let i = 0; i < lanternLights.length; i++) {
      lanternLights[i].intensity = 3.8 + Math.sin(time * 7 + i * 2.1) * 0.55;
    }

    // Floating dust / firefly motes
    for (let i = 0; i < moteCount; i++) {
      const s = moteSeeds[i];
      _dummy.position.set(
        s.x + Math.sin(time * s.speed + s.phase) * 0.55,
        s.y + Math.cos(time * s.speed * 0.8 + s.phase) * 0.28,
        s.z
      );
      const sc = 0.7 + Math.sin(time * 2.5 + s.phase) * 0.35;
      _dummy.scale.setScalar(sc);
      _dummy.updateMatrix();
      motes.setMatrixAt(i, _dummy.matrix);
    }
    motes.instanceMatrix.needsUpdate = true;

    // Update the roaming village sheep
    villageSheep.update(time, dt);
  };

  const dispose = () => {
    scene.remove(group);
    villageSheep.dispose();
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
    textures.forEach((t) => t.dispose());
  };

  return { group, update, dispose };
}
