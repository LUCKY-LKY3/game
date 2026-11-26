import * as THREE from 'three';
import { BrawlWeaponKind, StageConfig } from '../types/game';
import { buildRajuBike } from './villageThugs';
import { createVillageSheep, VillageSheepHandle } from './villageSheep';

export interface StreetClayPot {
  id: number;
  x: number;
  z: number;
  broken: boolean;
  dropKind: BrawlWeaponKind;
  group: THREE.Group;
  potBody: THREE.Mesh;
  shards: { mesh: THREE.Mesh; vx: number; vy: number; vz: number; rx: number; rz: number }[];
  breakTimer: number;
}

export interface StreetPickupItem {
  id: number;
  kind: BrawlWeaponKind;
  x: number;
  z: number;
  active: boolean;
  dynamic?: boolean;
  arcTimer?: number;
  arcDuration?: number;
  startX?: number;
  startZ?: number;
  targetX?: number;
  targetZ?: number;
  group: THREE.Group;
  visual: THREE.Group;
  glowRing: THREE.Mesh;
}

export interface StreetHaystack {
  id: number;
  x: number;
  z: number;
  intact: boolean;
  explodeTimer: number;
  group: THREE.Group;
  mound: THREE.Group;
  straws: { mesh: THREE.Mesh; vx: number; vy: number; vz: number; rx: number; rz: number }[];
}

export interface StreetChaiKadhai {
  broken?: boolean;
  id: number;
  x: number;
  z: number;
  cooldown: number;
  splashTimer: number;
  group: THREE.Group;
  steamMesh: THREE.Mesh;
  liquidMesh: THREE.Mesh;
  droplets: { mesh: THREE.Mesh; vx: number; vy: number; vz: number }[];
}

export interface StreetCharpoy {
  broken?: boolean;
  id: number;
  x: number;
  z: number;
  wobbleTimer: number;
  group: THREE.Group;
}

export interface StreetSplendorBike {
  group: THREE.Group;
  wheels: THREE.Mesh[];
  mountRing: THREE.Mesh;
  state: 'hidden' | 'idle' | 'ridden';
  x: number;
  z: number;
  facing: 1 | -1;
  idleTimer: number;
}

export interface StreetAutoRickshaw {
  group: THREE.Group;
  wheels: THREE.Object3D[];
  active: boolean;
  x: number;
  z: number;
  dir: 1 | -1;
}

export interface RollingFruitItem {
  mesh: THREE.Mesh;
  kind: 'watermelon' | 'mango';
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  timer: number;
  hitCooldown: number;
}

export interface StreetFruitCart {
  id: number;
  x: number;
  z: number;
  broken: boolean;
  group: THREE.Group;
  cartVisual: THREE.Group;
  fruits: RollingFruitItem[];
}

export interface StreetCricketBall {
  id: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  kicked: boolean;
  hitCooldown: number;
  mesh: THREE.Mesh;
}

export interface StreetWaterPump {
  broken?: boolean;
  id: number;
  x: number;
  z: number;
  cooldown: number;
  sprayTimer: number;
  group: THREE.Group;
  handlePivot: THREE.Group;
  droplets: { mesh: THREE.Mesh; vx: number; vy: number; vz: number }[];
}

export interface StreetStonePillar {
  broken?: boolean;
  id: number;
  x: number;
  z: number;
  radius: number;
  shakeTimer: number;
  group: THREE.Group;
}

/** A big fixed prop that can be smashed after a few hits (pillars, charpoys, hand pumps, chai stalls) */
export interface StreetSmashProp {
  kind: 'pillar' | 'charpoy' | 'pump' | 'stall';
  x: number;
  z: number;
  hp: number;
  maxHp: number;
  group: THREE.Group;
  ref: { broken?: boolean };
  broken: boolean;
}

export interface StreetStageHandle {
  group: THREE.Group;
  pots: StreetClayPot[];
  pickups: StreetPickupItem[];
  haystacks: StreetHaystack[];
  chaiStalls: StreetChaiKadhai[];
  charpoys: StreetCharpoy[];
  fruitCarts: StreetFruitCart[];
  cricketBalls: StreetCricketBall[];
  waterPumps: StreetWaterPump[];
  stonePillars: StreetStonePillar[];
  smashProps: StreetSmashProp[];
  /** Knocks the prop's chunk of hp off; returns true if it broke. */
  hitSmashProp: (sp: StreetSmashProp, dmg: number, dirX: number) => boolean;
  splendorBike: StreetSplendorBike;
  rickshaw: StreetAutoRickshaw;
  smashPot: (pot: StreetClayPot) => StreetPickupItem;
  smashFruitCart: (cart: StreetFruitCart, launchDir: 1 | -1) => void;
  triggerWaterPumpBurst: (pump: StreetWaterPump) => void;
  triggerPillarBounce: (pillar: StreetStonePillar) => void;
  consumePickup: (pickup: StreetPickupItem) => void;
  triggerHaystackExplosion: (h: StreetHaystack) => void;
  triggerChaiSplash: (stall: StreetChaiKadhai) => void;
  triggerCharpoyBounce: (c: StreetCharpoy) => void;
  triggerCrowdCheer: () => void;
  reactSheepToBrawl: (brawlX: number, brawlZ: number) => boolean;
  sheep: VillageSheepHandle;
  setShockwaveRing: (active: boolean, x: number, z: number, radius: number, opacity: number) => void;
  spawnCrowdDrop: (
    kind: 'chai' | 'lathi' | 'coconut',
    startX: number,
    startZ: number,
    targetX: number,
    targetZ: number
  ) => StreetPickupItem | null;
  resetProps: () => void;
  /** Background crowd run (fan girls, jolly aunties/uncles, Immy chasing). startedSeq bumps each time a run begins; x = lead runner x */
  crowdRun: { startedSeq: number; active: boolean; x: number };
  update: (time: number, dt: number, cameraX: number, comboCount?: number, lightingZoneOverride?: number) => void;
  dispose: () => void;
}

function createVillageStreetRoadTexture(): THREE.CanvasTexture {
  const w = 1024;
  const h = 512;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  // Sun-baked packed terracotta village road
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#6B4229');
  grad.addColorStop(0.14, '#925B3A');
  grad.addColorStop(0.5, '#A96E47');
  grad.addColorStop(0.86, '#8B5535');
  grad.addColorStop(1, '#58331E');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Subtle earthen ruts & village cobblestones
  for (let i = 0; i < 4800; i++) {
    const x = (i * 197 + 31) % w;
    const y = (i * 113 + 73) % h;
    const r = 1 + (i % 5);
    ctx.fillStyle = i % 3 === 0 ? 'rgba(62, 34, 18, 0.2)' : 'rgba(245, 206, 152, 0.14)';
    ctx.fillRect(x, y, r * 2.2, r);
  }

  // Painted chalk village bazaar edge stripes
  ctx.fillStyle = 'rgba(248, 236, 210, 0.22)';
  ctx.fillRect(0, 52, w, 6);
  ctx.fillRect(0, h - 58, w, 6);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.repeat.set(6, 1);
  return tex;
}

function createShopSignTexture(text: string, bg: string, fg: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 128);
  ctx.strokeStyle = '#F59E0B';
  ctx.lineWidth = 8;
  ctx.strokeRect(8, 8, 496, 112);
  ctx.fillStyle = fg;
  ctx.font = '900 44px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 66);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Builds a long belt-scrolling 3D Indian Village Street (Double Dragon vibe)
 * spanning x = -14..+54 across 3 consecutive brawl zones, complete with
 * village shopfronts, chai stalls, banyan trees, marigold banners,
 * smashable terracotta clay pots, weapon/chai pickups, and the roaming village sheep.
 */
export function buildStreetStage(
  scene: THREE.Scene,
  stageCfg: StageConfig,
  isSoftwareRenderer: boolean
): StreetStageHandle {
  const group = new THREE.Group();
  group.name = 'village_street_stage';

  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];
  const lanterns: { mesh: THREE.Mesh; baseY: number; phase: number }[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geometries.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    materials.push(m);
    return m;
  };
  const trackTex = <T extends THREE.Texture>(t: T): T => {
    textures.push(t);
    return t;
  };

  scene.background = new THREE.Color(stageCfg.skyColor);
  scene.fog = new THREE.FogExp2(stageCfg.fogColor, 0.017);

  // Warm Double Dragon golden-hour Indian village lighting
  const hemi = new THREE.HemisphereLight('#FFE4B8', '#5C3724', 1.05);
  group.add(hemi);

  const sun = new THREE.DirectionalLight('#FFD298', 2.25);
  sun.position.set(16, 18, 12);
  sun.castShadow = !isSoftwareRenderer;
  if (!isSoftwareRenderer) {
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.near = 2;
    sun.shadow.camera.far = 52;
    sun.shadow.camera.left = -16;
    sun.shadow.camera.right = 16;
    sun.shadow.camera.top = 12;
    sun.shadow.camera.bottom = -12;
    sun.shadow.bias = -0.0005;
  }
  const sunTarget = new THREE.Object3D();
  sunTarget.position.set(0, 0, 0);
  group.add(sunTarget);
  sun.target = sunTarget;
  group.add(sun);

  // Crisp warm #ffbe76 silhouette rim light so fighters stand out cleanly against village streets
  const rim = new THREE.DirectionalLight('#ffbe76', 1.55);
  rim.position.set(-8, 7.2, -10.5);
  const rimTarget = new THREE.Object3D();
  rimTarget.position.set(0, 1.1, 0);
  group.add(rimTarget);
  rim.target = rimTarget;
  group.add(rim);

  // Distant painted village backdrop that subtly tracks camera X
  const backdropLoader = new THREE.TextureLoader();
  backdropLoader.setCrossOrigin('anonymous');
  const backdropTex = trackTex(backdropLoader.load(stageCfg.backdropUrl));
  backdropTex.colorSpace = THREE.SRGBColorSpace;
  const backdropPlane = new THREE.Mesh(
    trackGeo(new THREE.PlaneGeometry(58, 22)),
    trackMat(
      new THREE.MeshBasicMaterial({
        map: backdropTex,
        fog: false,
      })
    )
  );
  backdropPlane.position.set(0, 7.6, -15.5);
  group.add(backdropPlane);

  // Continuous wide village road (+30% Z-depth covering walkable lane Z = -4.05..+3.10 cleanly)
  const roadTex = trackTex(createVillageStreetRoadTexture());
  const road = new THREE.Mesh(
    trackGeo(new THREE.PlaneGeometry(92, 14.8)),
    trackMat(
      new THREE.MeshStandardMaterial({
        map: roadTex,
        roughness: 0.94,
        metalness: 0.02,
      })
    )
  );
  road.rotation.x = -Math.PI / 2;
  road.position.set(22, 0, -0.55);
  road.receiveShadow = true;
  group.add(road);

  // Raised mud-brick sidewalk / drainage curb pushed back cleanly behind the expanded lane
  const curbMat = trackMat(
    new THREE.MeshStandardMaterial({ color: '#784F36', roughness: 0.9, metalness: 0.04 })
  );
  const northCurb = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(92, 0.34, 1.5)), curbMat);
  northCurb.position.set(22, 0.17, -5.35);
  northCurb.receiveShadow = true;
  group.add(northCurb);

  // Soft sunlit roadside earthen border along the south foreground edge
  const southEdge = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(92, 0.12, 1.8)),
    trackMat(new THREE.MeshStandardMaterial({ color: '#6E452B', roughness: 0.96, metalness: 0.02 }))
  );
  southEdge.position.set(22, 0.06, 4.45);
  southEdge.receiveShadow = true;
  group.add(southEdge);

  // Shared materials for village shops, bazaar stalls, wood, and marigold bunting
  const plasterPalette = ['#C8845A', '#D69A6C', '#B76D45', '#D4A373', '#BC7A52'];
  const plasterMats = plasterPalette.map((c) =>
    trackMat(new THREE.MeshStandardMaterial({ color: c, roughness: 0.92, metalness: 0.02 }))
  );
  const woodMat = trackMat(
    new THREE.MeshStandardMaterial({ color: '#4E2D18', roughness: 0.85, metalness: 0.05 })
  );
  const roofMat = trackMat(
    new THREE.MeshStandardMaterial({ color: '#7C2D12', roughness: 0.88, metalness: 0.04 })
  );
  const awningRedMat = trackMat(
    new THREE.MeshStandardMaterial({ color: '#B91C1C', roughness: 0.78, metalness: 0.04 })
  );
  const awningGoldMat = trackMat(
    new THREE.MeshStandardMaterial({ color: '#D97706', roughness: 0.78, metalness: 0.04 })
  );
  const lanternGlowMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#FDE68A',
      emissive: '#F59E0B',
      emissiveIntensity: 1.4,
      roughness: 0.3,
    })
  );
  const foliageMat = trackMat(
    new THREE.MeshStandardMaterial({ color: '#2F4F24', roughness: 0.9, metalness: 0.02 })
  );
  const marigoldMat = trackMat(
    new THREE.MeshStandardMaterial({ color: '#F97316', roughness: 0.75, metalness: 0.02 })
  );

  // ── VILLAGE BAZAAR SHOPFRONTS, CHAI STALLS & BANYAN TREES ALONG X = -12..+54 ─
  const shopLabels: [string, string, string][] = [
    ['SHARMA CHAI & SAMOSA', '#7C2D12', '#FDE68A'],
    ['VILLAGE AKHARA GYM', '#1E3A5F', '#F8F4EC'],
    ['PANCHAYAT BAZAAR', '#14532D', '#FDE047'],
    ['PAPPU SWEET HOUSE', '#991B1B', '#FEF3C7'],
    ['SHAHI LATHI STORE', '#3B0764', '#FDE68A'],
    ['BADE TAU MANDI', '#7F1D1D', '#FACC15'],
  ];

  const poleGeo = trackGeo(new THREE.CylinderGeometry(0.08, 0.1, 4.4, 8));
  const lanternGeo = trackGeo(new THREE.SphereGeometry(0.18, 10, 8));
  const leafGeo = trackGeo(new THREE.SphereGeometry(1.5, 10, 8));
  const trunkGeo = trackGeo(new THREE.CylinderGeometry(0.36, 0.56, 4.8, 10));

  const garlandGroups: { group: THREE.Group; phase: number }[] = [];
  const duskFestivalMats: THREE.MeshStandardMaterial[] = [];

  for (let idx = 0; idx < 11; idx++) {
    const bx = -10 + idx * 6.4;
    // Zone 2 (x = 12..29) opens up into the spacious Banyan Courtyard Akhara clearing!
    const isBanyanCenter = idx === 5;
    const isTreeSlot = idx === 2 || idx === 4 || idx === 6 || idx === 9;

    if (isBanyanCenter) {
      // MASSIVE ICONIC VILLAGE BANYAN TREE anchoring Zone 2 (Banyan Courtyard)
      const banyan = new THREE.Group();
      banyan.position.set(bx, 0, -7.2);
      const mainTrunk = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.95, 1.45, 5.6, 12)),
        woodMat
      );
      mainTrunk.position.y = 2.8;
      mainTrunk.castShadow = true;
      banyan.add(mainTrunk);

      // Hanging banyan aerial prop roots
      const rootGeo = trackGeo(new THREE.CylinderGeometry(0.08, 0.14, 4.6, 6));
      [-2.8, -1.7, 1.6, 2.9].forEach((rx) => {
        const aerialRoot = new THREE.Mesh(rootGeo, woodMat);
        aerialRoot.position.set(rx, 2.3, 0.65);
        aerialRoot.castShadow = true;
        banyan.add(aerialRoot);
      });

      // Wide shaded banyan crown canopy
      const bigCanopy: [number, number, number, number][] = [
        [0, 6.2, 0, 2.45],
        [-2.7, 5.6, 0.4, 1.85],
        [2.7, 5.7, 0.2, 1.9],
        [-1.3, 6.9, -0.5, 1.6],
        [1.4, 6.8, -0.4, 1.65],
      ];
      for (const [cx, cy, cz, sc] of bigCanopy) {
        const crown = new THREE.Mesh(leafGeo, foliageMat);
        crown.position.set(cx, cy, cz);
        crown.scale.set(sc * 1.25, sc * 0.68, sc);
        crown.castShadow = true;
        banyan.add(crown);
      }

      // Sacred vermilion cloth wrap around trunk + low earthen akhara ring border
      const sacredWrap = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(1.16, 1.24, 0.68, 12)),
        awningRedMat
      );
      sacredWrap.position.y = 1.65;
      banyan.add(sacredWrap);
      group.add(banyan);
    } else if (isTreeSlot) {
      // Secondary Village Banyan / Neem Tree
      const tree = new THREE.Group();
      tree.position.set(bx, 0, -7.1);
      const trunk = new THREE.Mesh(trunkGeo, woodMat);
      trunk.position.y = 2.4;
      trunk.castShadow = true;
      tree.add(trunk);

      const canopyOffsets: [number, number, number, number][] = [
        [0, 5.1, 0, 1.35],
        [-1.3, 4.6, 0.3, 1.05],
        [1.3, 4.7, -0.2, 1.08],
        [0.1, 5.8, -0.4, 0.95],
      ];
      for (const [cx, cy, cz, sc] of canopyOffsets) {
        const crown = new THREE.Mesh(leafGeo, foliageMat);
        crown.position.set(cx, cy, cz);
        crown.scale.set(sc * 1.15, sc * 0.72, sc);
        crown.castShadow = true;
        tree.add(crown);
      }
      group.add(tree);
    } else {
      // Indian Village Mud-Brick Shopfront / Chai & Spice Stall with Balcony
      const h = 4.6 + (idx % 3) * 0.7;
      const w = 5.4;
      const building = new THREE.Group();
      building.position.set(bx, 0, -7.65);

      const wall = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(w, h, 3.6)),
        plasterMats[idx % plasterMats.length]
      );
      wall.position.y = h / 2;
      wall.castShadow = true;
      wall.receiveShadow = true;
      building.add(wall);

      // Sloped awning / chajja
      const awning = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(w + 0.35, 0.16, 1.85)),
        idx % 2 === 0 ? awningRedMat : awningGoldMat
      );
      awning.position.set(0, 2.75, 2.35);
      awning.rotation.x = 0.24;
      awning.castShadow = true;
      building.add(awning);

      // Wooden balcony railing upstairs
      const rail = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(w - 0.6, 0.14, 0.14)), woodMat);
      rail.position.set(0, h + 0.55, 1.72);
      building.add(rail);

      // Doorway & dark shop interior recess
      const doorway = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.75, 2.3, 0.14)), woodMat);
      doorway.position.set(-0.85, 1.18, 1.82);
      building.add(doorway);

      // Wooden counter bench + Zone 1 colorful spice baskets (turmeric, red chilli, saffron!)
      const counter = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.1, 0.95, 0.72)), roofMat);
      counter.position.set(1.1, 0.48, 2.25);
      counter.castShadow = true;
      building.add(counter);

      if (idx <= 3) {
        const spiceColors = ['#EAB308', '#DC2626', '#F97316'];
        spiceColors.forEach((sc, si) => {
          const mound = new THREE.Mesh(
            trackGeo(new THREE.ConeGeometry(0.24, 0.28, 8)),
            trackMat(new THREE.MeshStandardMaterial({ color: sc, roughness: 0.92 }))
          );
          mound.position.set(0.55 + si * 0.54, 1.08, 2.26);
          building.add(mound);
        });
      }

      // Painted bazaar signboard
      const [label, bg, fg] = shopLabels[idx % shopLabels.length];
      const signTex = trackTex(createShopSignTexture(label, bg, fg));
      const sign = new THREE.Mesh(
        trackGeo(new THREE.PlaneGeometry(3.8, 0.92)),
        trackMat(new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.65 }))
      );
      sign.position.set(0, 3.45, 1.84);
      building.add(sign);

      group.add(building);
    }

    // Wooden street lamp pole + warm swinging lantern pushed to north sidewalk edge (-5.25)
    const pole = new THREE.Mesh(poleGeo, woodMat);
    pole.position.set(bx + 2.8, 2.2, -5.25);
    pole.castShadow = true;
    group.add(pole);

    const lantern = new THREE.Mesh(lanternGeo, lanternGlowMat);
    lantern.position.set(bx + 2.8, 3.9, -4.8);
    group.add(lantern);
    lanterns.push({ mesh: lantern, baseY: 3.9, phase: idx * 0.9 });

    // Swaying overhead marigold flower garland swag hanging between poles!
    if (idx < 10) {
      const garland = new THREE.Group();
      garland.position.set(bx + 2.8 + 3.2, 4.28, -4.95);
      const isMelaZone = idx >= 6;
      const bulbMat = isMelaZone
        ? trackMat(
            new THREE.MeshStandardMaterial({
              color: '#FEF08A',
              emissive: '#F59E0B',
              emissiveIntensity: 0.7,
              roughness: 0.25,
            })
          )
        : awningGoldMat;
      if (isMelaZone) duskFestivalMats.push(bulbMat);

      for (let b = 0; b < 7; b++) {
        const t = (b + 1) / 8;
        const gx = (t - 0.5) * 6.4;
        const sag = Math.sin(t * Math.PI) * 0.68;
        const bead = new THREE.Mesh(
          trackGeo(new THREE.SphereGeometry(isMelaZone && b % 2 === 1 ? 0.13 : 0.11, 7, 6)),
          b % 2 === 0 ? marigoldMat : bulbMat
        );
        bead.position.set(gx, -sag, 0);
        garland.add(bead);
      }
      group.add(garland);
      garlandGroups.push({ group: garland, phase: idx * 0.7 });
    }
  }

  // Zone 3 (Mela Festival Square, x = 30..54): Overhead glowing marigold string-light criss-crosses!
  const melaLightMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#FEF08A',
      emissive: '#F97316',
      emissiveIntensity: 0.5,
      roughness: 0.2,
    })
  );
  duskFestivalMats.push(melaLightMat);
  for (let m = 0; m < 4; m++) {
    const mx = 32 + m * 5.6;
    const strand = new THREE.Group();
    strand.position.set(mx, 5.15, -1.6);
    for (let k = 0; k < 7; k++) {
      const t = k / 6;
      const zOff = (t - 0.5) * 6.6;
      const sag = Math.sin(t * Math.PI) * 0.55;
      const bulb = new THREE.Mesh(
        trackGeo(new THREE.SphereGeometry(0.12, 7, 6)),
        k % 2 === 0 ? melaLightMat : marigoldMat
      );
      bulb.position.set(Math.sin(t * Math.PI) * 0.5, -sag, zOff);
      strand.add(bulb);
    }
    group.add(strand);
    garlandGroups.push({ group: strand, phase: 2.1 + m * 0.85 });
  }

  // ── FAR PARALLAX LAYER (~0.35x): DISTANT VILLAGE ROOFTOPS & FLUTTERING SKY KITES ──
  const farParallaxGroup = new THREE.Group();
  const farRoofMat = trackMat(
    new THREE.MeshBasicMaterial({ color: '#6E3C26', transparent: true, opacity: 0.65 })
  );
  for (let r = 0; r < 14; r++) {
    const rw = 3.2 + (r % 4) * 1.4;
    const rh = 2.6 + (r % 5) * 1.1;
    const dome = r % 4 === 1;
    const roof = new THREE.Mesh(
      trackGeo(dome ? new THREE.SphereGeometry(rw * 0.36, 10, 8) : new THREE.BoxGeometry(rw, rh, 0.5)),
      farRoofMat
    );
    roof.position.set(-22 + r * 5.2, dome ? rh + 1.2 : rh * 0.5 + 0.5, -13.4);
    farParallaxGroup.add(roof);
  }

  // Fluttering diamond Indian paper kites (patang) drifting high in the sky!
  const kites: { group: THREE.Group; baseX: number; baseY: number; phase: number }[] = [];
  const kiteColors = ['#EF4444', '#FACC15', '#38BDF8', '#EC4899', '#22C55E', '#F97316'];
  const kiteGeo = trackGeo(new THREE.PlaneGeometry(0.68, 0.68));
  const tailGeo = trackGeo(new THREE.PlaneGeometry(0.14, 0.62));
  for (let k = 0; k < 6; k++) {
    const kg = new THREE.Group();
    const kMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: kiteColors[k % kiteColors.length],
        side: THREE.DoubleSide,
      })
    );
    const body = new THREE.Mesh(kiteGeo, kMat);
    body.rotation.z = Math.PI / 4;
    const tail = new THREE.Mesh(tailGeo, kMat);
    tail.position.set(0, -0.62, 0);
    kg.add(body, tail);
    const bx = -10 + k * 9.5;
    const by = 8.4 + (k % 3) * 1.35;
    kg.position.set(bx, by, -12.6);
    farParallaxGroup.add(kg);
    kites.push({ group: kg, baseX: bx, baseY: by, phase: k * 1.3 });
  }
  group.add(farParallaxGroup);

  // ── DRIFTING GOLDEN SUNLIT DUST MOTES (ZERO GC!) ───────────────────────────
  const dustCount = 46;
  const dustPositions = new Float32Array(dustCount * 3);
  const dustSeeds: { x: number; y: number; z: number; phase: number; speed: number }[] = [];
  for (let d = 0; d < dustCount; d++) {
    const sx = (d / dustCount - 0.5) * 26;
    const sy = 0.7 + ((d * 37) % 42) * 0.11;
    const sz = -3.8 + ((d * 53) % 70) * 0.1;
    dustSeeds.push({ x: sx, y: sy, z: sz, phase: d * 0.73, speed: 0.45 + (d % 4) * 0.18 });
    dustPositions[d * 3] = sx;
    dustPositions[d * 3 + 1] = sy;
    dustPositions[d * 3 + 2] = sz;
  }
  const dustGeo = trackGeo(new THREE.BufferGeometry());
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
  const dustMat = trackMat(
    new THREE.PointsMaterial({
      color: '#FDE68A',
      size: 0.14,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
    })
  );
  const dustPoints = new THREE.Points(dustGeo, dustMat);
  group.add(dustPoints);

  // ── LIGHT EDGE FRAMING FOREGROUND PARALLAX (~1.25x, TOP & BOTTOM BORDERS ONLY!) ──
  const fgParallaxGroup = new THREE.Group();
  const fgLeafMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: '#2B4C20',
      transparent: true,
      opacity: 0.46,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  const fgBokehMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: '#FBBF24',
      transparent: true,
      opacity: 0.24,
      depthWrite: false,
    })
  );
  const fgLeafGeo = trackGeo(new THREE.CircleGeometry(0.55, 7));
  const fgBokehGeo = trackGeo(new THREE.CircleGeometry(0.42, 14));

  // Upper border sunlit neem foliage sprigs + warm bokeh lantern orbs (strictly y >= 6.8 so center is 100% clear)
  for (let i = 0; i < 9; i++) {
    const fx = -16 + i * 9.5;
    const sprig = new THREE.Group();
    sprig.position.set(fx, 7.15 + (i % 2) * 0.35, 6.2);
    for (let l = 0; l < 3; l++) {
      const leaf = new THREE.Mesh(fgLeafGeo, fgLeafMat);
      leaf.scale.set(1.4, 0.52, 1);
      leaf.position.set((l - 1) * 0.65, -l * 0.14, 0);
      leaf.rotation.z = (l - 1) * 0.38;
      sprig.add(leaf);
    }
    if (i % 2 === 1) {
      const bokeh = new THREE.Mesh(fgBokehGeo, fgBokehMat);
      bokeh.position.set(0.35, -0.45, 0.1);
      sprig.add(bokeh);
    }
    fgParallaxGroup.add(sprig);
  }
  // Lower border subtle warm bokeh lanterns & earthen tufts (strictly z = 6.9, y = 0.22 along bottom edge)
  for (let i = 0; i < 8; i++) {
    const fx = -12 + i * 10.2;
    const lowOrb = new THREE.Mesh(fgBokehGeo, i % 2 === 0 ? fgBokehMat : fgLeafMat);
    lowOrb.position.set(fx, 0.22, 6.95);
    lowOrb.scale.set(1.35, 0.72, 1);
    fgParallaxGroup.add(lowOrb);
  }
  group.add(fgParallaxGroup);

  // ── FESTIVE PENNANT BUNTING strung across the street (sways in the breeze, visible above the lane) ──
  const buntingGroup = new THREE.Group();
  const pennantGeo = trackGeo(
    (() => {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-0.17, 0, 0, 0.17, 0, 0, 0, -0.42, 0]), 3));
      g.computeVertexNormals();
      return g;
    })()
  );
  const flagColors = ['#EF4444', '#FACC15', '#22C55E', '#38BDF8', '#F97316', '#EC4899'];
  const flagMats = flagColors.map((c) =>
    trackMat(new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide }))
  );
  const buntingRopeMat = trackMat(new THREE.LineBasicMaterial({ color: '#3B2A1E' }));
  const pennants: { m: THREE.Mesh; ph: number }[] = [];
  for (let st = 0; st < 10; st++) {
    const x0 = -13 + st * 7.2;
    const x1 = x0 + 7.2;
    const pts: THREE.Vector3[] = [];
    for (let k = 0; k <= 12; k++) {
      const t = k / 12;
      pts.push(new THREE.Vector3(x0 + (x1 - x0) * t, 3.75 - Math.sin(t * Math.PI) * 0.55, -3.95));
    }
    buntingGroup.add(new THREE.Line(trackGeo(new THREE.BufferGeometry().setFromPoints(pts)), buntingRopeMat));
    for (let k = 1; k < 12; k++) {
      const pn = new THREE.Mesh(pennantGeo, flagMats[(k + st) % flagMats.length]);
      pn.position.copy(pts[k]);
      buntingGroup.add(pn);
      pennants.push({ m: pn, ph: k * 0.6 + st });
    }
  }
  group.add(buntingGroup);

  // ── AMBIENT VILLAGE LIFE: drifting clouds, pigeon flocks, strolling villagers, dusk fireflies ──
  const cloudGroup = new THREE.Group();
  const cloudMat = trackMat(
    new THREE.MeshBasicMaterial({ color: '#FFF1D6', transparent: true, opacity: 0.42, depthWrite: false, fog: false })
  );
  const cloudPuffGeo = trackGeo(new THREE.CircleGeometry(1, 18));
  const clouds: { g: THREE.Group; x: number; y: number; speed: number }[] = [];
  for (let c = 0; c < 8; c++) {
    const cg = new THREE.Group();
    for (let k = 0; k < 4; k++) {
      const puff = new THREE.Mesh(cloudPuffGeo, cloudMat);
      puff.scale.set(1.5 + (k % 2) * 0.7, 0.55 + (k % 3) * 0.18, 1);
      puff.position.set((k - 1.5) * 1.5, (k % 2) * 0.22, 0);
      cg.add(puff);
    }
    const cy = 10.2 + (c % 3) * 1.5;
    cg.position.set(0, cy, -14.6);
    cloudGroup.add(cg);
    clouds.push({ g: cg, x: c * 9.5, y: cy, speed: 0.18 + (c % 4) * 0.07 });
  }
  group.add(cloudGroup);

  // Pigeon flocks crossing the sky
  const birdMat = trackMat(new THREE.MeshBasicMaterial({ color: '#3A2B25', side: THREE.DoubleSide, fog: false }));
  const wingGeo = trackGeo(new THREE.PlaneGeometry(0.34, 0.12));
  const birds: { g: THREE.Group; wl: THREE.Mesh; wr: THREE.Mesh; off: number; y: number; speed: number; ph: number }[] = [];
  for (let f = 0; f < 2; f++) {
    for (let b = 0; b < 6; b++) {
      const bg = new THREE.Group();
      const wl = new THREE.Mesh(wingGeo, birdMat);
      const wr = new THREE.Mesh(wingGeo, birdMat);
      wl.position.x = -0.17;
      wr.position.x = 0.17;
      bg.add(wl, wr);
      bg.position.z = -12.2;
      group.add(bg);
      birds.push({
        g: bg,
        wl,
        wr,
        off: f * 34 + b * 0.9 + (b % 2) * 0.4,
        y: 9.2 + f * 1.3 + (b % 3) * 0.35 - Math.abs(b - 2.5) * 0.2,
        speed: 2.1 + f * 0.5,
        ph: b * 0.7,
      });
    }
  }

  // Villagers strolling along the far sidewalk behind the fight
  const walkerColors = ['#B45309', '#1D4ED8', '#BE185D', '#15803D', '#7C3AED', '#0F766E', '#C2410C'];
  const walkers: { g: THREE.Group; ll: THREE.Mesh; rl: THREE.Mesh; off: number; dir: 1 | -1; speed: number; z: number }[] = [];
  const wBodyGeo = trackGeo(new THREE.CapsuleGeometry(0.17, 0.5, 4, 8));
  const wHeadGeo = trackGeo(new THREE.SphereGeometry(0.14, 10, 8));
  const wLegGeo = trackGeo(new THREE.CapsuleGeometry(0.075, 0.5, 3, 6));
  const wSkinMat = trackMat(new THREE.MeshStandardMaterial({ color: '#A8693D', roughness: 0.85 }));
  const wPantsMat = trackMat(new THREE.MeshStandardMaterial({ color: '#E8DFC8', roughness: 0.9 }));
  for (let w = 0; w < 7; w++) {
    const wg = new THREE.Group();
    const shirt = trackMat(new THREE.MeshStandardMaterial({ color: walkerColors[w % walkerColors.length], roughness: 0.85 }));
    const body = new THREE.Mesh(wBodyGeo, shirt);
    body.position.y = 1.05;
    const head = new THREE.Mesh(wHeadGeo, wSkinMat);
    head.position.y = 1.62;
    const ll = new THREE.Mesh(wLegGeo, wPantsMat);
    ll.position.set(-0.09, 0.48, 0);
    const rl = new THREE.Mesh(wLegGeo, wPantsMat);
    rl.position.set(0.09, 0.48, 0);
    // pivot legs at the hip
    ll.geometry.translate(0, 0, 0);
    wg.add(body, head, ll, rl);
    wg.scale.setScalar(0.9 + (w % 3) * 0.06);
    group.add(wg);
    walkers.push({ g: wg, ll, rl, off: w * 6.7, dir: w % 2 === 0 ? 1 : -1, speed: 0.55 + (w % 3) * 0.2, z: -4.95 - (w % 2) * 0.4 });
  }

  // Occasional crowd run: excited fan girls and jolly round aunties/uncles dash across the background,
  // with Immy trailing behind chatting them up
  const crowdRun = { startedSeq: 0, active: false, x: 0 };
  const CROWD_CYCLE = 34;
  const CROWD_RUN_TIME = 8;
  const hairMat = trackMat(new THREE.MeshStandardMaterial({ color: '#1B1210', roughness: 0.9 }));
  const armGeo = trackGeo(new THREE.CapsuleGeometry(0.05, 0.4, 3, 6));
  const dressGeo = trackGeo(new THREE.ConeGeometry(0.3, 0.7, 10));
  const roundBodyGeo = trackGeo(new THREE.SphereGeometry(0.34, 12, 10));
  const hairGeo = trackGeo(new THREE.BoxGeometry(0.26, 0.5, 0.1));
  type Runner = { g: THREE.Group; ll: THREE.Mesh; rl: THREE.Mesh; la: THREE.Mesh; ra: THREE.Mesh; lag: number; z: number; ph: number };
  const runners: Runner[] = [];
  const makeRunner = (kind: 'fan' | 'round' | 'immy', color: string, lag: number, z: number): Runner => {
    const g = new THREE.Group();
    const cloth = trackMat(new THREE.MeshStandardMaterial({ color, roughness: 0.8 }));
    const head = new THREE.Mesh(wHeadGeo, wSkinMat);
    const ll = new THREE.Mesh(wLegGeo, kind === 'fan' ? wSkinMat : wPantsMat);
    const rl = new THREE.Mesh(wLegGeo, kind === 'fan' ? wSkinMat : wPantsMat);
    ll.position.set(-0.09, 0.48, 0);
    rl.position.set(0.09, 0.48, 0);
    if (kind === 'round') {
      const body = new THREE.Mesh(roundBodyGeo, cloth);
      body.position.y = 0.95;
      head.position.y = 1.5;
      head.scale.setScalar(1.15);
      g.add(body);
    } else if (kind === 'fan') {
      const dress = new THREE.Mesh(dressGeo, cloth);
      dress.position.y = 0.95;
      head.position.y = 1.55;
      const hair = new THREE.Mesh(hairGeo, hairMat);
      hair.position.set(0, 1.45, -0.08);
      g.add(dress, hair);
    } else {
      const body = new THREE.Mesh(wBodyGeo, cloth);
      body.position.y = 1.05;
      head.position.y = 1.62;
      const hair = new THREE.Mesh(hairGeo, hairMat);
      hair.position.set(0, 1.7, 0);
      hair.scale.set(1, 0.4, 1);
      g.add(body, hair);
    }
    const la = new THREE.Mesh(armGeo, kind === 'fan' ? wSkinMat : cloth);
    const ra = new THREE.Mesh(armGeo, kind === 'fan' ? wSkinMat : cloth);
    la.position.set(-0.3, 1.25, 0);
    ra.position.set(0.3, 1.25, 0);
    g.add(head, ll, rl, la, ra);
    g.visible = false;
    group.add(g);
    return { g, ll, rl, la, ra, lag, z, ph: lag * 1.7 };
  };
  runners.push(
    makeRunner('fan', '#EC4899', 0, -4.2),
    makeRunner('round', '#F59E0B', 1.7, -4.55),
    makeRunner('fan', '#8B5CF6', 3.0, -3.95),
    makeRunner('round', '#10B981', 4.4, -4.4),
    makeRunner('fan', '#EF4444', 5.6, -4.1),
    makeRunner('immy', '#065F46', 7.4, -4.25)
  );
  let lastCrowdCycle = -1;

  // Dusk fireflies (fade in toward the Mela zone)
  const fireflyCount = 34;
  const fireflyPos = new Float32Array(fireflyCount * 3);
  const fireflySeeds: { x: number; y: number; z: number; ph: number }[] = [];
  for (let f = 0; f < fireflyCount; f++) {
    fireflySeeds.push({
      x: (f / fireflyCount - 0.5) * 26,
      y: 0.7 + ((f * 29) % 24) * 0.11,
      z: f % 2 === 0 ? -5.6 + ((f * 7) % 10) * 0.12 : 3.4 + ((f * 11) % 10) * 0.1,
      ph: f * 1.17,
    });
  }
  const fireflyGeo = trackGeo(new THREE.BufferGeometry());
  fireflyGeo.setAttribute('position', new THREE.BufferAttribute(fireflyPos, 3));
  const fireflyMat = trackMat(
    new THREE.PointsMaterial({
      color: '#D9F99D',
      size: 0.12,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  group.add(new THREE.Points(fireflyGeo, fireflyMat));

  // ── SMASHABLE TERRACOTTA CLAY POTS + GLOWING PICKUP DROPS ───────────────────
  const potMat = trackMat(
    new THREE.MeshStandardMaterial({ color: '#B4532A', roughness: 0.78, metalness: 0.04 })
  );
  const potBandMat = trackMat(
    new THREE.MeshStandardMaterial({ color: '#FDE68A', roughness: 0.65, metalness: 0.08 })
  );
  const lathiWoodMat = trackMat(
    new THREE.MeshStandardMaterial({ color: '#A16227', roughness: 0.56, metalness: 0.1 })
  );
  const brassMat = trackMat(
    new THREE.MeshStandardMaterial({ color: '#F59E0B', roughness: 0.25, metalness: 0.88 })
  );
  const chairSteelMat = trackMat(
    new THREE.MeshStandardMaterial({ color: '#CBD5E1', roughness: 0.28, metalness: 0.82 })
  );
  const chairSeatMat = trackMat(
    new THREE.MeshStandardMaterial({ color: '#1D4ED8', roughness: 0.52, metalness: 0.18 })
  );
  const chaiCupMat = trackMat(
    new THREE.MeshStandardMaterial({ color: '#C25E34', roughness: 0.82, metalness: 0.02 })
  );
  const chaiLiquidMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#D97706',
      emissive: '#92400E',
      emissiveIntensity: 0.45,
      roughness: 0.2,
    })
  );

  // Curated pot placement across Zones 1, 2, and 3 (Lathi, Folding Chair, Hot Chai, Throwable Stool & Coconut!)
  const potConfigs: { x: number; z: number; drop: BrawlWeaponKind }[] = [
    { x: 1.8, z: -2.4, drop: 'lathi' },
    { x: 5.5, z: 1.6, drop: 'stool' },
    { x: 8.6, z: -1.9, drop: 'chai' },
    { x: 13.5, z: -2.2, drop: 'chair' },
    { x: 17.8, z: 1.5, drop: 'coconut' },
    { x: 21.4, z: -2.5, drop: 'lathi' },
    { x: 24.2, z: 1.4, drop: 'chai' },
    { x: 29.0, z: 1.6, drop: 'chair' },
    { x: 32.8, z: -2.1, drop: 'stool' },
    { x: 35.8, z: 1.5, drop: 'chai' },
    { x: 39.6, z: 1.7, drop: 'coconut' },
    { x: 42.5, z: -2.4, drop: 'lathi' },
  ];

  const stoolRedMat = trackMat(
    new THREE.MeshStandardMaterial({ color: '#EF4444', roughness: 0.42, metalness: 0.08 })
  );
  const coconutGreenMat = trackMat(
    new THREE.MeshStandardMaterial({ color: '#4D7C0F', roughness: 0.72, metalness: 0.04 })
  );
  const strawMat = trackMat(
    new THREE.MeshStandardMaterial({ color: '#FDE047', roughness: 0.4 })
  );

  const potBodyGeo = trackGeo(new THREE.SphereGeometry(0.42, 14, 12));
  const potRimGeo = trackGeo(new THREE.TorusGeometry(0.24, 0.06, 8, 14));
  const potStripeGeo = trackGeo(new THREE.TorusGeometry(0.41, 0.028, 6, 16));
  const shardGeo = trackGeo(new THREE.TetrahedronGeometry(0.14, 0));

  const pots: StreetClayPot[] = [];
  const pickups: StreetPickupItem[] = [];

  const buildPickupVisual = (kind: BrawlWeaponKind): THREE.Group => {
    const g = new THREE.Group();
    if (kind === 'lathi') {
      const stick = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.036, 0.04, 1.38, 10)),
        lathiWoodMat
      );
      stick.rotation.z = Math.PI * 0.36;
      stick.castShadow = true;
      g.add(stick);
      [-0.4, 0, 0.4].forEach((offset) => {
        const band = new THREE.Mesh(
          trackGeo(new THREE.CylinderGeometry(0.043, 0.043, 0.07, 10)),
          brassMat
        );
        band.position.set(-Math.sin(Math.PI * 0.36) * offset, Math.cos(Math.PI * 0.36) * offset, 0);
        band.rotation.z = Math.PI * 0.36;
        g.add(band);
      });
    } else if (kind === 'chair') {
      // Classic Indian village folding steel chair!
      const frame = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.62, 0.82, 0.09)),
        chairSteelMat
      );
      frame.castShadow = true;
      const seat = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.52, 0.44, 0.11)),
        chairSeatMat
      );
      seat.position.y = -0.05;
      g.add(frame, seat);
      g.rotation.z = 0.25;
    } else if (kind === 'stool') {
      // Classic red plastic village stool (throwable!)
      const top = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.46, 0.09, 0.46)), stoolRedMat);
      top.position.y = 0.22;
      top.castShadow = true;
      g.add(top);
      const legGeo = trackGeo(new THREE.CylinderGeometry(0.035, 0.025, 0.44, 8));
      [
        [-0.17, -0.17],
        [0.17, -0.17],
        [-0.17, 0.17],
        [0.17, 0.17],
      ].forEach(([lx, lz]) => {
        const leg = new THREE.Mesh(legGeo, stoolRedMat);
        leg.position.set(lx, 0, lz);
        g.add(leg);
      });
    } else if (kind === 'coconut') {
      // Giant fresh green village coconut with yellow straw (throwable!)
      const nut = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.24, 12, 10)), coconutGreenMat);
      nut.scale.set(0.95, 1.15, 0.95);
      nut.castShadow = true;
      const straw = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.02, 0.02, 0.28, 6)), strawMat);
      straw.position.set(0.06, 0.28, 0);
      straw.rotation.z = -0.35;
      g.add(nut, straw);
    } else {
      // Steaming Hot Kulhad Chai Cup (+30% HP)
      const cup = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.21, 0.14, 0.34, 12)),
        chaiCupMat
      );
      cup.castShadow = true;
      const tea = new THREE.Mesh(trackGeo(new THREE.CircleGeometry(0.19, 12)), chaiLiquidMat);
      tea.rotation.x = -Math.PI / 2;
      tea.position.y = 0.155;
      const steam = new THREE.Mesh(
        trackGeo(new THREE.SphereGeometry(0.11, 8, 8)),
        trackMat(
          new THREE.MeshBasicMaterial({
            color: '#FFFBEB',
            transparent: true,
            opacity: 0.65,
          })
        )
      );
      steam.position.y = 0.34;
      g.add(cup, tea, steam);
    }
    return g;
  };

  potConfigs.forEach((cfg, idx) => {
    const potGroup = new THREE.Group();
    potGroup.position.set(cfg.x, 0, cfg.z);

    const potBody = new THREE.Mesh(potBodyGeo, potMat);
    potBody.position.y = 0.42;
    potBody.scale.set(1, 1.08, 1);
    potBody.castShadow = true;
    potBody.receiveShadow = true;
    potGroup.add(potBody);

    const rimMesh = new THREE.Mesh(potRimGeo, potMat);
    rimMesh.position.y = 0.84;
    rimMesh.rotation.x = Math.PI / 2;
    potBody.add(rimMesh);

    const stripeMesh = new THREE.Mesh(potStripeGeo, potBandMat);
    stripeMesh.position.y = 0.08;
    stripeMesh.rotation.x = Math.PI / 2;
    potBody.add(stripeMesh);

    // Pre-allocated ceramic shatter shards (zero GC on smash!)
    const shards: StreetClayPot['shards'] = [];
    for (let s = 0; s < 8; s++) {
      const m = new THREE.Mesh(shardGeo, potMat);
      m.visible = false;
      potGroup.add(m);
      const a = (s / 8) * Math.PI * 2 + 0.3;
      shards.push({
        mesh: m,
        vx: Math.cos(a) * (2.2 + (s % 3) * 0.9),
        vy: 3.4 + (s % 4) * 0.85,
        vz: Math.sin(a) * (1.5 + (s % 2) * 0.7),
        rx: 6 + s * 1.3,
        rz: 5 - s * 1.1,
      });
    }

    group.add(potGroup);
    pots.push({
      id: idx + 1,
      x: cfg.x,
      z: cfg.z,
      broken: false,
      dropKind: cfg.drop,
      group: potGroup,
      potBody,
      shards,
      breakTimer: 0,
    });

    // Pre-allocated pickup item (hidden until pot is smashed)
    const pickupGroup = new THREE.Group();
    pickupGroup.position.set(cfg.x, 0, cfg.z);
    pickupGroup.visible = false;

    const visual = buildPickupVisual(cfg.drop);
    visual.position.y = 0.56;
    pickupGroup.add(visual);

    const ringColor = cfg.drop === 'chai' ? '#22C55E' : cfg.drop === 'chair' ? '#38BDF8' : '#F59E0B';
    const glowRing = new THREE.Mesh(
      trackGeo(new THREE.RingGeometry(0.36, 0.54, 20)),
      trackMat(
        new THREE.MeshBasicMaterial({
          color: ringColor,
          transparent: true,
          opacity: 0.78,
          side: THREE.DoubleSide,
          depthWrite: false,
        })
      )
    );
    glowRing.rotation.x = -Math.PI / 2;
    glowRing.position.y = 0.03;
    pickupGroup.add(glowRing);

    group.add(pickupGroup);
    pickups.push({
      id: idx + 1,
      kind: cfg.drop,
      x: cfg.x,
      z: cfg.z,
      active: false,
      group: pickupGroup,
      visual,
      glowRing,
    });
  });

  // ── PASSING 3D INDIAN YELLOW-AND-GREEN AUTO-RICKSHAW HAZARD ────────────────
  const rickshawGroup = new THREE.Group();
  rickshawGroup.visible = false;
  // Classic CNG auto: green tub, yellow canvas roof, open sides, one front wheel. Local +X is the nose.
  const autoGreen = trackMat(new THREE.MeshStandardMaterial({ color: '#15803D', roughness: 0.32, metalness: 0.3 }));
  const autoYellow = trackMat(new THREE.MeshStandardMaterial({ color: '#FACC15', roughness: 0.55, metalness: 0.05 }));
  const autoBlack = trackMat(new THREE.MeshStandardMaterial({ color: '#1C1917', roughness: 0.8, metalness: 0.1 }));
  const autoChrome = trackMat(new THREE.MeshStandardMaterial({ color: '#E5E7EB', roughness: 0.18, metalness: 0.9 }));
  const autoSeat = trackMat(new THREE.MeshStandardMaterial({ color: '#7F1D1D', roughness: 0.7 }));
  const autoGlass = trackMat(new THREE.MeshStandardMaterial({ color: '#BAE6FD', roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.45 }));
  const autoLight = trackMat(new THREE.MeshBasicMaterial({ color: '#FEF9C3' }));
  const autoAmber = trackMat(new THREE.MeshBasicMaterial({ color: '#F97316' }));
  const autoRed = trackMat(new THREE.MeshBasicMaterial({ color: '#DC2626' }));
  const extrude = (shape: THREE.Shape, depth: number, bevel = 0.05) => {
    const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 16 });
    g.translate(0, 0, -depth / 2);
    return trackGeo(g);
  };

  // Lower tub: rounded rear, flat floor, rising into the front cowl
  const tub = new THREE.Shape();
  tub.moveTo(-1.02, 0.42);
  tub.lineTo(0.55, 0.42);
  tub.quadraticCurveTo(0.7, 0.42, 0.72, 0.55);
  tub.lineTo(0.72, 0.95);
  tub.lineTo(-0.9, 0.95);
  tub.quadraticCurveTo(-1.1, 0.95, -1.1, 0.75);
  tub.quadraticCurveTo(-1.1, 0.42, -1.02, 0.42);
  const body = new THREE.Mesh(extrude(tub, 1.12, 0.07), autoGreen);
  body.castShadow = true;
  // Front cowl: narrower, curved nose over the single front wheel
  const cowl = new THREE.Shape();
  cowl.moveTo(0.6, 0.5);
  cowl.lineTo(1.05, 0.5);
  cowl.quadraticCurveTo(1.32, 0.62, 1.3, 0.95);
  cowl.quadraticCurveTo(1.24, 1.22, 0.95, 1.3);
  cowl.lineTo(0.6, 1.3);
  cowl.closePath();
  const nose = new THREE.Mesh(extrude(cowl, 0.62, 0.08), autoGreen);
  nose.castShadow = true;
  // Yellow belt line around the tub
  const belt = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.86, 0.07, 1.3)), autoYellow);
  belt.position.set(-0.18, 0.86, 0);
  // Front mudguard over the front wheel
  const guard = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.33, 0.06, 8, 18, Math.PI)), autoBlack);
  guard.position.set(1.0, 0.3, 0);
  // Rear mudguards
  const rGuardGeo = trackGeo(new THREE.TorusGeometry(0.33, 0.05, 8, 18, Math.PI));
  const rGuardL = new THREE.Mesh(rGuardGeo, autoBlack);
  rGuardL.position.set(-0.72, 0.3, 0.6);
  const rGuardR = rGuardL.clone();
  rGuardR.position.z = -0.6;

  // Canvas roof: one curved yellow shell from the windscreen top over the back
  const roofProfile = new THREE.Shape();
  roofProfile.moveTo(0.92, 1.78);
  roofProfile.quadraticCurveTo(0.6, 1.98, 0.0, 1.98);
  roofProfile.lineTo(-0.75, 1.98);
  roofProfile.quadraticCurveTo(-1.16, 1.96, -1.16, 1.55);
  roofProfile.lineTo(-1.16, 1.0);
  roofProfile.lineTo(-1.06, 1.0);
  roofProfile.lineTo(-1.06, 1.55);
  roofProfile.quadraticCurveTo(-1.06, 1.88, -0.75, 1.88);
  roofProfile.lineTo(0.0, 1.88);
  roofProfile.quadraticCurveTo(0.55, 1.88, 0.86, 1.7);
  roofProfile.closePath();
  const roof = new THREE.Mesh(extrude(roofProfile, 1.2, 0.04), autoYellow);
  roof.castShadow = true;
  // Black rain flaps rolled up along the roof edges
  const flapGeo = trackGeo(new THREE.CylinderGeometry(0.05, 0.05, 1.5, 8));
  [0.66, -0.66].forEach((z) => {
    const flap = new THREE.Mesh(flapGeo, autoBlack);
    flap.rotation.z = Math.PI / 2;
    flap.position.set(-0.3, 1.86, z);
    rickshawGroup.add(flap);
  });
  // Pillars and windscreen frame
  const pillarGeo = trackGeo(new THREE.CylinderGeometry(0.03, 0.03, 0.92, 8));
  [
    [0.82, 0.55],
    [0.82, -0.55],
    [-0.15, 0.6],
    [-0.15, -0.6],
  ].forEach(([px, pz]) => {
    const pil = new THREE.Mesh(pillarGeo, autoChrome);
    pil.position.set(px, 1.38, pz);
    if (px > 0) pil.rotation.z = -0.32;
    rickshawGroup.add(pil);
  });
  const windscreen = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(0.62, 1.04)), autoGlass);
  windscreen.rotation.set(0, Math.PI / 2, -0.32);
  windscreen.rotation.order = 'YXZ';
  windscreen.position.set(0.9, 1.52, 0);
  // Inside: driver seat, handlebar, passenger bench
  const driverSeat = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.34, 0.12, 0.42)), autoSeat);
  driverSeat.position.set(0.3, 1.05, 0);
  const bench = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.42, 0.14, 1.06)), autoSeat);
  bench.position.set(-0.68, 1.08, 0);
  const benchBack = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.1, 0.42, 1.06)), autoSeat);
  benchBack.position.set(-0.94, 1.32, 0);
  const handlebar = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.022, 0.022, 0.62, 8)), autoChrome);
  handlebar.rotation.x = Math.PI / 2;
  handlebar.position.set(0.72, 1.36, 0);
  // Driver: kurta, head, cap
  const driverBody = new THREE.Mesh(trackGeo(new THREE.CapsuleGeometry(0.15, 0.32, 6, 12)), trackMat(new THREE.MeshStandardMaterial({ color: '#94A3B8', roughness: 0.8 })));
  driverBody.position.set(0.32, 1.38, 0);
  const driverHead = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.12, 14, 12)), trackMat(new THREE.MeshStandardMaterial({ color: '#A0673F', roughness: 0.6 })));
  driverHead.position.set(0.36, 1.72, 0);
  const driverCap = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.125, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2)), autoBlack);
  driverCap.position.set(0.36, 1.76, 0);
  // Lights: round chrome headlight with indicators, rear tail lights
  const headRim = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.12, 0.025, 8, 18)), autoChrome);
  headRim.rotation.y = Math.PI / 2;
  headRim.position.set(1.33, 0.98, 0);
  const headlight = new THREE.Mesh(trackGeo(new THREE.CircleGeometry(0.11, 18)), autoLight);
  headlight.rotation.y = Math.PI / 2;
  headlight.position.set(1.335, 0.98, 0);
  const indGeo = trackGeo(new THREE.SphereGeometry(0.045, 10, 8));
  [0.24, -0.24].forEach((z) => {
    const ind = new THREE.Mesh(indGeo, autoAmber);
    ind.position.set(1.27, 1.1, z);
    rickshawGroup.add(ind);
    const tail = new THREE.Mesh(indGeo, autoRed);
    tail.position.set(-1.17, 0.62, z * 2);
    rickshawGroup.add(tail);
  });
  // Number plate on the nose and "HORN OK PLEASE" on the back
  const plateTex = trackTex(createShopSignTexture('DL 1R 4207', '#FDE047', '#111827'));
  const plate = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(0.42, 0.11)), trackMat(new THREE.MeshBasicMaterial({ map: plateTex })));
  plate.rotation.y = Math.PI / 2;
  plate.position.set(1.32, 0.66, 0);
  const hornTex = trackTex(createShopSignTexture('HORN OK PLEASE', '#15803D', '#FDE047'));
  const hornSign = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(0.9, 0.22)), trackMat(new THREE.MeshBasicMaterial({ map: hornTex })));
  hornSign.rotation.y = -Math.PI / 2;
  hornSign.position.set(-1.18, 0.75, 0);
  // Side stripe decal
  const sideTex = trackTex(createShopSignTexture('RAJA AUTO', '#15803D', '#FDE047'));
  const sideMat = trackMat(new THREE.MeshBasicMaterial({ map: sideTex, transparent: true }));
  [0.64, -0.64].forEach((z) => {
    const sd = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(0.8, 0.2)), sideMat);
    sd.position.set(-0.35, 0.66, z);
    if (z < 0) sd.rotation.y = Math.PI;
    rickshawGroup.add(sd);
  });

  // Spoked wheels (group spins on Z)
  const tyreGeo = trackGeo(new THREE.TorusGeometry(0.21, 0.075, 10, 24));
  const rimGeo = trackGeo(new THREE.TorusGeometry(0.15, 0.02, 6, 20));
  const hubGeo = trackGeo(new THREE.CylinderGeometry(0.05, 0.05, 0.14, 10));
  const spokeGeo = trackGeo(new THREE.BoxGeometry(0.018, 0.3, 0.018));
  const rickshawWheels: THREE.Object3D[] = [];
  [
    [1.0, 0.29, 0],
    [-0.72, 0.29, 0.6],
    [-0.72, 0.29, -0.6],
  ].forEach(([wx, wy, wz]) => {
    const w = new THREE.Group();
    const tyre = new THREE.Mesh(tyreGeo, autoBlack);
    tyre.castShadow = true;
    const rim = new THREE.Mesh(rimGeo, autoChrome);
    const hub = new THREE.Mesh(hubGeo, autoChrome);
    hub.rotation.x = Math.PI / 2;
    w.add(tyre, rim, hub);
    for (let k = 0; k < 5; k++) {
      const sp = new THREE.Mesh(spokeGeo, autoChrome);
      sp.rotation.z = (k / 5) * Math.PI;
      w.add(sp);
    }
    w.position.set(wx, wy, wz);
    rickshawWheels.push(w);
    rickshawGroup.add(w);
  });

  rickshawGroup.add(
    body, nose, belt, guard, rGuardL, rGuardR, roof, windscreen, driverSeat, bench, benchBack, handlebar,
    driverBody, driverHead, driverCap, headRim, headlight, plate, hornSign
  );
  group.add(rickshawGroup);

  const rickshaw: StreetAutoRickshaw = {
    group: rickshawGroup,
    wheels: rickshawWheels,
    active: false,
    x: -30,
    z: -1.3,
    dir: 1,
  };

  // ── INTERACTIVE GIANT GOLDEN HAYSTACKS (INSTANT-KO STRAW EXPLOSION HAZARD) ───
  const haystacks: StreetHaystack[] = [];
  const hayMat = trackMat(
    new THREE.MeshStandardMaterial({ color: '#EAB308', roughness: 0.96, metalness: 0.0 })
  );
  const hayDarkMat = trackMat(
    new THREE.MeshStandardMaterial({ color: '#CA8A04', roughness: 0.95, metalness: 0.0 })
  );
  const ropeMat = trackMat(
    new THREE.MeshStandardMaterial({ color: '#78350F', roughness: 0.9, metalness: 0.02 })
  );
  const strawGeo = trackGeo(new THREE.BoxGeometry(0.42, 0.07, 0.09));
  const hayPositions: [number, number][] = [
    [1.6, -2.62],
    [18.4, -2.62],
    [34.8, -2.62],
  ];
  hayPositions.forEach(([hx, hz], idx) => {
    const hGroup = new THREE.Group();
    hGroup.position.set(hx, 0, hz);

    const mound = new THREE.Group();
    const baseCone = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.68, 1.05, 1.15, 12)), hayMat);
    baseCone.position.y = 0.58;
    baseCone.castShadow = true;
    baseCone.receiveShadow = true;
    const topDome = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.72, 12, 8)), hayMat);
    topDome.scale.set(1.0, 0.72, 1.0);
    topDome.position.y = 1.12;
    topDome.castShadow = true;
    const band = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.84, 0.045, 6, 16)), ropeMat);
    band.rotation.x = Math.PI / 2;
    band.position.y = 0.55;
    mound.add(baseCone, topDome, band);

    // Decorative protruding straw tufts
    for (let t = 0; t < 8; t++) {
      const a = (t / 8) * Math.PI * 2;
      const tuft = new THREE.Mesh(strawGeo, t % 2 === 0 ? hayMat : hayDarkMat);
      tuft.position.set(Math.cos(a) * 0.82, 0.35 + (t % 3) * 0.28, Math.sin(a) * 0.82);
      tuft.rotation.set(0.3, -a, 0.45);
      mound.add(tuft);
    }
    hGroup.add(mound);

    // Pre-allocated exploding cartoon straw wisps (zero GC!)
    const straws: StreetHaystack['straws'] = [];
    for (let s = 0; s < 16; s++) {
      const m = new THREE.Mesh(strawGeo, s % 2 === 0 ? hayMat : hayDarkMat);
      m.visible = false;
      hGroup.add(m);
      const a = (s / 16) * Math.PI * 2 + 0.15;
      straws.push({
        mesh: m,
        vx: Math.cos(a) * (2.6 + (s % 4) * 1.15),
        vy: 4.2 + (s % 5) * 0.9,
        vz: Math.sin(a) * (1.8 + (s % 3) * 0.75) + 1.1,
        rx: 7 + (s % 5) * 2.1,
        rz: 5 - (s % 4) * 2.4,
      });
    }
    group.add(hGroup);
    haystacks.push({
      id: idx + 1,
      x: hx,
      z: hz,
      intact: true,
      explodeTimer: 0,
      group: hGroup,
      mound,
      straws,
    });
  });

  // ── STEAMING CHAI STALL KADHAI HAZARDS (STRIKE TO SPLASH GARAM CHAI!) ───────
  const chaiStalls: StreetChaiKadhai[] = [];
  const kadhaiBrassMat = trackMat(
    new THREE.MeshStandardMaterial({ color: '#B45309', roughness: 0.32, metalness: 0.78 })
  );
  const brickStoveMat = trackMat(
    new THREE.MeshStandardMaterial({ color: '#7C2D12', roughness: 0.92, metalness: 0.03 })
  );
  const hotChaiMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#D97706',
      emissive: '#92400E',
      emissiveIntensity: 0.45,
      roughness: 0.25,
    })
  );
  const steamCloudMat = trackMat(
    new THREE.MeshBasicMaterial({ color: '#FFFBEB', transparent: true, opacity: 0.62 })
  );
  const dropletGeo = trackGeo(new THREE.SphereGeometry(0.11, 7, 7));
  const chaiPositions: [number, number][] = [
    [-2.6, -2.42],
    [13.8, -2.42],
    [30.2, -2.42],
  ];
  chaiPositions.forEach(([cx, cz], idx) => {
    const cGroup = new THREE.Group();
    cGroup.position.set(cx, 0, cz);

    // Brick village chulha base
    const stove = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.46, 0.54, 0.62, 10)), brickStoveMat);
    stove.position.y = 0.31;
    stove.castShadow = true;
    const ember = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.26, 0.22, 0.14)),
      trackMat(new THREE.MeshBasicMaterial({ color: '#F97316' }))
    );
    ember.position.set(0, 0.18, 0.46);

    // Wide brass kadhai cauldron
    const kadhai = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.62, 0.36, 0.34, 14)),
      kadhaiBrassMat
    );
    kadhai.position.y = 0.76;
    kadhai.castShadow = true;
    const liquidMesh = new THREE.Mesh(trackGeo(new THREE.CircleGeometry(0.54, 14)), hotChaiMat);
    liquidMesh.rotation.x = -Math.PI / 2;
    liquidMesh.position.y = 0.92;

    const steamMesh = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.28, 8, 8)), steamCloudMat);
    steamMesh.position.y = 1.28;

    cGroup.add(stove, ember, kadhai, liquidMesh, steamMesh);

    // Pre-allocated hot chai splash droplets
    const droplets: StreetChaiKadhai['droplets'] = [];
    for (let d = 0; d < 14; d++) {
      const dm = new THREE.Mesh(dropletGeo, hotChaiMat);
      dm.visible = false;
      cGroup.add(dm);
      const a = (d / 14) * Math.PI * 2;
      droplets.push({
        mesh: dm,
        vx: Math.cos(a) * (2.6 + (d % 3) * 0.95),
        vy: 3.1 + (d % 4) * 0.75,
        vz: Math.sin(a) * (2.2 + (d % 2) * 0.85) + 0.9,
      });
    }
    group.add(cGroup);
    chaiStalls.push({
      id: idx + 1,
      x: cx,
      z: cz,
      cooldown: 0,
      splashTimer: 0,
      group: cGroup,
      steamMesh,
      liquidMesh,
      droplets,
    });
  });

  // ── WOODEN CHARPOYS (WALL-BOUNCE JUGGLE PROPS ALONG BACK LANE EDGE) ────────
  const charpoys: StreetCharpoy[] = [];
  const juteMat = trackMat(
    new THREE.MeshStandardMaterial({ color: '#D6B887', roughness: 0.92, metalness: 0.0 })
  );
  const charpoyPositions: [number, number][] = [
    [-5.0, -2.72],
    [6.2, -2.72],
    [22.8, -2.72],
    [39.2, -2.72],
  ];
  charpoyPositions.forEach(([px, pz], idx) => {
    const cg = new THREE.Group();
    cg.position.set(px, 0, pz);
    const frame = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.75, 0.12, 0.92)), woodMat);
    frame.position.y = 0.44;
    frame.castShadow = true;
    const weave = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.56, 0.08, 0.76)), juteMat);
    weave.position.y = 0.47;
    const legGeo = trackGeo(new THREE.CylinderGeometry(0.055, 0.045, 0.46, 8));
    [
      [-0.78, -0.38],
      [0.78, -0.38],
      [-0.78, 0.38],
      [0.78, 0.38],
    ].forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(legGeo, woodMat);
      leg.position.set(lx, 0.23, lz);
      leg.castShadow = true;
      cg.add(leg);
    });
    cg.add(frame, weave);
    group.add(cg);
    charpoys.push({ id: idx + 1, x: px, z: pz, wobbleTimer: 0, group: cg });
  });

  // ── CHEERING VILLAGE ONLOOKERS (TOSS CROWD HYPE DROPS AT 10x/20x/30x!) ─────
  const onlookers: {
    group: THREE.Group;
    leftArm: THREE.Mesh;
    rightArm: THREE.Mesh;
    baseY: number;
    phase: number;
  }[] = [];
  let crowdCheerTimer = 0;
  const spectatorSkinMat = trackMat(
    new THREE.MeshStandardMaterial({ color: '#B47952', roughness: 0.72 })
  );
  const spectatorKurtaColors = ['#F59E0B', '#DC2626', '#16A34A', '#2563EB', '#EAB308', '#EA580C'];
  const spectatorPositions = [-6.8, -1.2, 4.4, 9.6, 15.6, 20.8, 26.2, 31.2, 34.4, 37.8, 41.0, 44.2, 47.4];
  const specTorsoGeo = trackGeo(new THREE.CylinderGeometry(0.21, 0.25, 0.68, 8));
  const specHeadGeo = trackGeo(new THREE.SphereGeometry(0.17, 10, 8));
  const specTurbanGeo = trackGeo(new THREE.CylinderGeometry(0.19, 0.17, 0.14, 10));
  const specArmGeo = trackGeo(new THREE.CylinderGeometry(0.055, 0.05, 0.44, 6));

  spectatorPositions.forEach((sx, idx) => {
    const sg = new THREE.Group();
    const baseY = 0.34;
    sg.position.set(sx, baseY, -5.05);
    const kurtaMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: spectatorKurtaColors[idx % spectatorKurtaColors.length],
        roughness: 0.85,
      })
    );
    const turbanMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: spectatorKurtaColors[(idx + 2) % spectatorKurtaColors.length],
        roughness: 0.8,
      })
    );
    const torso = new THREE.Mesh(specTorsoGeo, kurtaMat);
    torso.position.y = 0.68;
    const legs = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.2, 0.18, 0.4, 8)), juteMat);
    legs.position.y = 0.2;
    const head = new THREE.Mesh(specHeadGeo, spectatorSkinMat);
    head.position.y = 1.18;
    const turban = new THREE.Mesh(specTurbanGeo, turbanMat);
    turban.position.y = 1.32;
    const leftArm = new THREE.Mesh(specArmGeo, kurtaMat);
    leftArm.position.set(-0.26, 0.78, 0.04);
    const rightArm = new THREE.Mesh(specArmGeo, kurtaMat);
    rightArm.position.set(0.26, 0.78, 0.04);
    sg.add(legs, torso, head, turban, leftArm, rightArm);
    group.add(sg);
    onlookers.push({ group: sg, leftArm, rightArm, baseY, phase: idx * 0.9 });
  });

  // ── PRE-ALLOCATED DYNAMIC CROWD HYPE PICKUPS (ZERO GC!) ────────────────────
  const dynamicPickupKinds: ('chai' | 'lathi' | 'coconut')[] = [
    'chai',
    'chai',
    'chai',
    'lathi',
    'lathi',
    'lathi',
    'coconut',
    'coconut',
    'coconut',
  ];
  dynamicPickupKinds.forEach((kind, idx) => {
    const pickupGroup = new THREE.Group();
    pickupGroup.visible = false;
    const visual = buildPickupVisual(kind);
    visual.position.y = 0.56;
    pickupGroup.add(visual);
    const ringColor = kind === 'chai' ? '#22C55E' : kind === 'coconut' ? '#84CC16' : '#F59E0B';
    const glowRing = new THREE.Mesh(
      trackGeo(new THREE.RingGeometry(0.36, 0.56, 20)),
      trackMat(
        new THREE.MeshBasicMaterial({
          color: ringColor,
          transparent: true,
          opacity: 0.82,
          side: THREE.DoubleSide,
          depthWrite: false,
        })
      )
    );
    glowRing.rotation.x = -Math.PI / 2;
    glowRing.position.y = 0.03;
    pickupGroup.add(glowRing);
    group.add(pickupGroup);
    pickups.push({
      id: 100 + idx,
      kind,
      x: 0,
      z: 0,
      active: false,
      dynamic: true,
      arcTimer: 0,
      arcDuration: 0.58,
      startX: 0,
      startZ: -4.2,
      targetX: 0,
      targetZ: 0,
      group: pickupGroup,
      visual,
      glowRing,
    });
  });

  // ── RIDEABLE 3D RAJU SPLENDOR MOTORBIKE PROP ───────────────────────────────
  const splendorGroup = new THREE.Group();
  splendorGroup.visible = false;

  // Same red Splendor model Raju rides (built facing +Z, turned so +X is the front here)
  const rajuBike = buildRajuBike(trackGeo, trackMat, trackTex);
  rajuBike.group.rotation.y = Math.PI / 2;
  splendorGroup.add(rajuBike.group);
  const splendorWheels: THREE.Mesh[] = rajuBike.wheels;

  const mountRing = new THREE.Mesh(
    trackGeo(new THREE.RingGeometry(0.95, 1.24, 28)),
    trackMat(
      new THREE.MeshBasicMaterial({
        color: '#FACC15',
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    )
  );
  mountRing.rotation.x = -Math.PI / 2;
  mountRing.position.y = 0.04;
  splendorGroup.add(mountRing);
  group.add(splendorGroup);

  const splendorBike: StreetSplendorBike = {
    group: splendorGroup,
    wheels: splendorWheels,
    mountRing,
    state: 'hidden',
    x: 0,
    z: 0,
    facing: 1,
    idleTimer: 0,
  };

  // ── BREAKABLE WOODEN FRUIT CARTS (SPILL ROLLING WATERMELONS & MANGOES!) ────
  const fruitCarts: StreetFruitCart[] = [];
  const melonMat = trackMat(
    new THREE.MeshStandardMaterial({ color: '#15803D', roughness: 0.42, metalness: 0.04 })
  );
  const mangoMat = trackMat(
    new THREE.MeshStandardMaterial({ color: '#F59E0B', roughness: 0.38, metalness: 0.05 })
  );
  const melonGeo = trackGeo(new THREE.SphereGeometry(0.24, 10, 8));
  const mangoGeo = trackGeo(new THREE.SphereGeometry(0.14, 9, 7));

  const cartPositions: [number, number][] = [
    [3.8, -3.45],
    [34.2, 2.35],
  ];
  cartPositions.forEach(([fx, fz], idx) => {
    const cg = new THREE.Group();
    cg.position.set(fx, 0, fz);

    const cartVisual = new THREE.Group();
    const bed = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.72, 0.18, 0.96)), woodMat);
    bed.position.y = 0.68;
    bed.castShadow = true;
    const rimF = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.76, 0.22, 0.08)), roofMat);
    rimF.position.set(0, 0.84, 0.46);
    const rimB = rimF.clone();
    rimB.position.z = -0.46;
    const wheelG = trackGeo(new THREE.TorusGeometry(0.32, 0.05, 7, 14));
    [-0.56, 0.56].forEach((wx) => {
      const cw = new THREE.Mesh(wheelG, woodMat);
      cw.position.set(wx, 0.34, 0.46);
      cw.castShadow = true;
      cartVisual.add(cw);
    });
    // Stacked display fruits atop the cart
    for (let d = 0; d < 5; d++) {
      const m = new THREE.Mesh(d % 2 === 0 ? melonGeo : mangoGeo, d % 2 === 0 ? melonMat : mangoMat);
      m.position.set(-0.52 + d * 0.26, 0.96, (d % 2 === 0 ? -0.14 : 0.16));
      m.castShadow = true;
      cartVisual.add(m);
    }
    cartVisual.add(bed, rimF, rimB);
    cg.add(cartVisual);
    group.add(cg);

    // Pre-allocated rolling fruit projectiles (zero GC on smash!)
    const fruits: RollingFruitItem[] = [];
    for (let f = 0; f < 6; f++) {
      const isMelon = f < 3;
      const fm = new THREE.Mesh(isMelon ? melonGeo : mangoGeo, isMelon ? melonMat : mangoMat);
      fm.visible = false;
      fm.castShadow = true;
      group.add(fm);
      fruits.push({
        mesh: fm,
        kind: isMelon ? 'watermelon' : 'mango',
        active: false,
        x: fx,
        y: 0.9,
        z: fz,
        vx: 0,
        vy: 0,
        vz: 0,
        timer: 0,
        hitCooldown: 0,
      });
    }

    fruitCarts.push({
      id: idx + 1,
      x: fx,
      z: fz,
      broken: false,
      group: cg,
      cartVisual,
      fruits,
    });
  });

  // ── STRAY RED LEATHER STREET CRICKET BALLS (KICK INTO COUSINS!) ────────────
  const cricketBalls: StreetCricketBall[] = [];
  const cricketMat = trackMat(
    new THREE.MeshStandardMaterial({ color: '#B91C1C', roughness: 0.32, metalness: 0.12 })
  );
  const cricketGeo = trackGeo(new THREE.SphereGeometry(0.15, 10, 8));
  const cricketPositions: [number, number][] = [
    [-1.4, 1.35],
    [15.4, 1.85],
    [32.5, -0.65],
  ];
  cricketPositions.forEach(([cx, cz], idx) => {
    const mesh = new THREE.Mesh(cricketGeo, cricketMat);
    mesh.position.set(cx, 0.15, cz);
    mesh.castShadow = true;
    group.add(mesh);
    cricketBalls.push({
      id: idx + 1,
      x: cx,
      y: 0.15,
      z: cz,
      vx: 0,
      vy: 0,
      vz: 0,
      kicked: false,
      hitCooldown: 0,
      mesh,
    });
  });

  // ── ROADSIDE CAST-IRON WATER HAND-PUMPS (BURSTS WATER SPRAY WHEN COUSIN THROWN!) ──
  const waterPumps: StreetWaterPump[] = [];
  const pumpIronMat = trackMat(
    new THREE.MeshStandardMaterial({ color: '#166534', roughness: 0.46, metalness: 0.62 })
  );
  const waterSprayMat = trackMat(
    new THREE.MeshBasicMaterial({ color: '#38BDF8', transparent: true, opacity: 0.85 })
  );
  const pumpPositions: [number, number][] = [
    [14.2, -3.55],
    [37.4, -3.55],
  ];
  pumpPositions.forEach(([px, pz], idx) => {
    const pg = new THREE.Group();
    pg.position.set(px, 0, pz);
    const base = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.28, 0.34, 0.22, 10)), curbMat);
    base.position.y = 0.11;
    const body = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.14, 0.17, 1.08, 10)), pumpIronMat);
    body.position.y = 0.74;
    body.castShadow = true;
    const spout = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.055, 0.06, 0.42, 8)), pumpIronMat);
    spout.rotation.x = Math.PI * 0.42;
    spout.position.set(0, 0.98, 0.24);
    const handlePivot = new THREE.Group();
    handlePivot.position.set(0, 1.18, -0.1);
    const handle = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.032, 0.032, 0.72, 8)), pumpIronMat);
    handle.rotation.x = -0.7;
    handle.position.set(0, 0.18, -0.26);
    handlePivot.add(handle);
    pg.add(base, body, spout, handlePivot);

    const droplets: StreetWaterPump['droplets'] = [];
    for (let d = 0; d < 18; d++) {
      const dm = new THREE.Mesh(dropletGeo, waterSprayMat);
      dm.visible = false;
      pg.add(dm);
      const spread = ((d / 18) - 0.5) * 2.2;
      droplets.push({
        mesh: dm,
        vx: spread * 2.4,
        vy: 3.4 + (d % 4) * 0.95,
        vz: 2.2 + (d % 5) * 0.95,
      });
    }
    group.add(pg);
    waterPumps.push({
      id: idx + 1,
      x: px,
      z: pz,
      cooldown: 0,
      sprayTimer: 0,
      group: pg,
      handlePivot,
      droplets,
    });
  });

  // ── ZONE 2 BANYAN COURTYARD CARVED STONE PILLARS (BOUNCE-JUGGLE COUSINS!) ──
  const stonePillars: StreetStonePillar[] = [];
  const stoneMat = trackMat(
    new THREE.MeshStandardMaterial({ color: '#B49A7E', roughness: 0.88, metalness: 0.06 })
  );
  const stoneAccentMat = trackMat(
    new THREE.MeshStandardMaterial({ color: '#C2410C', roughness: 0.78, metalness: 0.05 })
  );
  const pillarPositions: [number, number][] = [
    [16.8, -2.5],
    [24.6, 1.4],
  ];
  pillarPositions.forEach(([sx, sz], idx) => {
    const sg = new THREE.Group();
    sg.position.set(sx, 0, sz);
    const plinth = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.86, 0.34, 0.86)), stoneMat);
    plinth.position.y = 0.17;
    plinth.castShadow = true;
    const shaft = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.32, 0.37, 2.35, 8)), stoneMat);
    shaft.position.y = 1.48;
    shaft.castShadow = true;
    shaft.receiveShadow = true;
    const band = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.36, 0.36, 0.24, 8)), stoneAccentMat);
    band.position.y = 1.85;
    const cap = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.84, 0.24, 0.84)), stoneMat);
    cap.position.y = 2.74;
    cap.castShadow = true;
    sg.add(plinth, shaft, band, cap);
    sg.scale.set(0.6, 0.74, 0.6); // slimmer and shorter so they stay out of the way
    group.add(sg);
    stonePillars.push({ id: idx + 1, x: sx, z: sz, radius: 0.38, shakeTimer: 0, group: sg });
  });

  // ── BADE TAU PHASE 2 GROUND-POUND SHOCKWAVE RING (JUMP TO EVADE!) ──────────
  const shockwaveMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: '#FACC15',
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  const shockwaveMesh = new THREE.Mesh(
    trackGeo(new THREE.RingGeometry(0.76, 1.0, 36)),
    shockwaveMat
  );
  shockwaveMesh.rotation.x = -Math.PI / 2;
  shockwaveMesh.position.y = 0.08;
  shockwaveMesh.visible = false;
  group.add(shockwaveMesh);

  // ── DYNAMIC 3-ZONE LIGHTING PALETTES (CHAI CHOWK -> BANYAN -> MELA DUSK) ───
  const skyZone1 = new THREE.Color(stageCfg.skyColor);
  const skyZone2 = new THREE.Color('#D99B58');
  const skyZone3 = new THREE.Color('#2E1A3B');
  const fogZone1 = new THREE.Color(stageCfg.fogColor);
  const fogZone2 = new THREE.Color('#B77542');
  const fogZone3 = new THREE.Color('#3D1F3F');
  const sunZone1 = new THREE.Color('#FFD298');
  const sunZone2 = new THREE.Color('#FFBA6B');
  const sunZone3 = new THREE.Color('#F97316');
  const hemiZone1 = new THREE.Color('#FFE4B8');
  const hemiZone2 = new THREE.Color('#FDE68A');
  const hemiZone3 = new THREE.Color('#A855F7');
  const scratchSky = new THREE.Color();
  const scratchFog = new THREE.Color();
  const scratchSun = new THREE.Color();
  const scratchHemi = new THREE.Color();

  // ── NON-INTERACTIVE ROAMING VILLAGE SHEEP (TROTS ALONG ROADSIDE!) ──────────
  const sheep: VillageSheepHandle = createVillageSheep();
  group.add(sheep.group);

  scene.add(group);

  const smashPot = (pot: StreetClayPot): StreetPickupItem => {
    pot.broken = true;
    pot.breakTimer = 0.85;
    pot.potBody.visible = false;
    for (let i = 0; i < pot.shards.length; i++) {
      const sh = pot.shards[i];
      sh.mesh.visible = true;
      sh.mesh.position.set(0, 0.44, 0);
      sh.mesh.rotation.set(0, 0, 0);
    }
    const item = pickups.find((p) => p.id === pot.id)!;
    item.active = true;
    item.group.visible = true;
    return item;
  };

  const consumePickup = (pickup: StreetPickupItem) => {
    pickup.active = false;
    pickup.group.visible = false;
  };

  const triggerHaystackExplosion = (h: StreetHaystack) => {
    h.intact = false;
    h.explodeTimer = 1.05;
    h.mound.visible = false;
    for (let i = 0; i < h.straws.length; i++) {
      const st = h.straws[i];
      st.mesh.visible = true;
      st.mesh.position.set(0, 0.65, 0);
      st.mesh.rotation.set(0, 0, 0);
    }
  };

  const triggerChaiSplash = (stall: StreetChaiKadhai) => {
    stall.cooldown = 5.5;
    stall.splashTimer = 0.72;
    for (let i = 0; i < stall.droplets.length; i++) {
      const d = stall.droplets[i];
      d.mesh.visible = true;
      d.mesh.position.set(0, 0.95, 0);
    }
  };

  const triggerCharpoyBounce = (c: StreetCharpoy) => {
    c.wobbleTimer = 0.45;
  };

  const triggerCrowdCheer = () => {
    crowdCheerTimer = 2.6;
  };

  const smashFruitCart = (cart: StreetFruitCart, launchDir: 1 | -1) => {
    if (cart.broken) return;
    cart.broken = true;
    cart.cartVisual.visible = false;
    for (let i = 0; i < cart.fruits.length; i++) {
      const f = cart.fruits[i];
      f.active = true;
      f.x = cart.x + (i % 3 - 1) * 0.25;
      f.y = 0.85 + (i % 2) * 0.25;
      f.z = cart.z + (i < 3 ? 0.35 : -0.15);
      f.vx = launchDir * (5.2 + (i % 3) * 1.45) + (i % 2 === 0 ? 0.8 : -0.8);
      f.vy = 2.4 + (i % 3) * 0.9;
      f.vz = (cart.z < 0 ? 1 : -1) * (1.8 + (i % 3) * 0.75);
      f.timer = 4.2;
      f.hitCooldown = 0;
      f.mesh.position.set(f.x, f.y, f.z);
      f.mesh.visible = true;
    }
  };

  const triggerWaterPumpBurst = (pump: StreetWaterPump) => {
    pump.cooldown = 4.5;
    pump.sprayTimer = 0.88;
    for (let i = 0; i < pump.droplets.length; i++) {
      const d = pump.droplets[i];
      d.mesh.visible = true;
      d.mesh.position.set(0, 1.0, 0.35);
    }
  };

  const triggerPillarBounce = (pillar: StreetStonePillar) => {
    pillar.shakeTimer = 0.4;
  };

  const reactSheepToBrawl = (brawlX: number, brawlZ: number): boolean => {
    return sheep.reactToNearbyBrawl(brawlX, brawlZ);
  };

  const setShockwaveRing = (active: boolean, x: number, z: number, radius: number, opacity: number) => {
    shockwaveMesh.visible = active;
    if (active) {
      shockwaveMesh.position.set(x, 0.08, z);
      shockwaveMesh.scale.set(radius, radius, 1);
      shockwaveMat.opacity = Math.max(0, Math.min(0.95, opacity));
    }
  };

  const spawnCrowdDrop = (
    kind: 'chai' | 'lathi' | 'coconut',
    startX: number,
    startZ: number,
    targetX: number,
    targetZ: number
  ): StreetPickupItem | null => {
    const slot = pickups.find((p) => p.dynamic && !p.active && p.kind === kind);
    if (!slot) return null;
    slot.active = true;
    slot.startX = startX;
    slot.startZ = startZ;
    slot.targetX = targetX;
    slot.targetZ = targetZ;
    slot.x = targetX;
    slot.z = targetZ;
    slot.arcDuration = 0.62;
    slot.arcTimer = 0.62;
    slot.group.position.set(startX, 0, startZ);
    slot.group.visible = true;
    slot.glowRing.visible = false;
    return slot;
  };

  // ── Slimmer fixed props that can be smashed ─────────────────────────────────
  haystacks.forEach((h) => h.group.scale.setScalar(0.78));
  chaiStalls.forEach((c) => c.group.scale.setScalar(0.82));
  charpoys.forEach((c) => c.group.scale.setScalar(0.82));
  waterPumps.forEach((w) => w.group.scale.setScalar(0.8));
  const smashProps: StreetSmashProp[] = [
    ...stonePillars.map((p) => ({ kind: 'pillar' as const, x: p.x, z: p.z, hp: 3, maxHp: 3, group: p.group, ref: p, broken: false })),
    ...charpoys.map((c) => ({ kind: 'charpoy' as const, x: c.x, z: c.z, hp: 2, maxHp: 2, group: c.group, ref: c, broken: false })),
    ...waterPumps.map((w) => ({ kind: 'pump' as const, x: w.x, z: w.z, hp: 2, maxHp: 2, group: w.group, ref: w, broken: false })),
    ...chaiStalls.map((c) => ({ kind: 'stall' as const, x: c.x, z: c.z, hp: 2, maxHp: 2, group: c.group, ref: c, broken: false })),
  ];
  const debrisColors: Record<StreetSmashProp['kind'], string> = { pillar: '#B49A7E', charpoy: '#8B5E34', pump: '#166534', stall: '#7C2D12' };
  const debris: { mesh: THREE.Mesh; vx: number; vy: number; vz: number; life: number }[] = [];
  const debrisGeo = trackGeo(new THREE.BoxGeometry(0.16, 0.12, 0.14));
  const debrisMats = (Object.keys(debrisColors) as StreetSmashProp['kind'][]).reduce(
    (acc, k) => {
      acc[k] = trackMat(new THREE.MeshStandardMaterial({ color: debrisColors[k], roughness: 0.9 }));
      return acc;
    },
    {} as Record<StreetSmashProp['kind'], THREE.MeshStandardMaterial>
  );
  for (let i = 0; i < 28; i++) {
    const m = new THREE.Mesh(debrisGeo, debrisMats.pillar);
    m.visible = false;
    group.add(m);
    debris.push({ mesh: m, vx: 0, vy: 0, vz: 0, life: 0 });
  }
  const spawnDebris = (sp: StreetSmashProp, dirX: number) => {
    let n = 0;
    for (const d of debris) {
      if (d.life > 0) continue;
      d.mesh.material = debrisMats[sp.kind];
      d.mesh.position.set(sp.x + (Math.random() - 0.5) * 0.5, 0.3 + Math.random() * 1.2, sp.z + (Math.random() - 0.5) * 0.4);
      d.mesh.scale.setScalar(0.7 + Math.random() * 0.9);
      d.vx = dirX * (1 + Math.random() * 2.5) + (Math.random() - 0.5) * 3;
      d.vy = 2 + Math.random() * 3.5;
      d.vz = (Math.random() - 0.5) * 3;
      d.life = 1.6;
      d.mesh.visible = true;
      if (++n >= 12) break;
    }
  };
  const hitSmashProp = (sp: StreetSmashProp, dmg: number, dirX: number): boolean => {
    if (sp.broken) return false;
    sp.hp -= dmg;
    if (sp.kind === 'pillar') (sp.ref as StreetStonePillar).shakeTimer = 0.4;
    if (sp.hp > 0) return false;
    sp.broken = true;
    sp.ref.broken = true;
    sp.group.visible = false;
    spawnDebris(sp, dirX);
    return true;
  };

  const resetProps = () => {
    for (const sp of smashProps) {
      sp.hp = sp.maxHp;
      sp.broken = false;
      sp.ref.broken = false;
      sp.group.visible = true;
    }
    for (const d of debris) {
      d.life = 0;
      d.mesh.visible = false;
    }
    for (let i = 0; i < pots.length; i++) {
      const p = pots[i];
      p.broken = false;
      p.breakTimer = 0;
      p.potBody.visible = true;
      for (let s = 0; s < p.shards.length; s++) {
        p.shards[s].mesh.visible = false;
      }
    }
    for (let i = 0; i < pickups.length; i++) {
      pickups[i].active = false;
      pickups[i].group.visible = false;
      pickups[i].arcTimer = 0;
    }
    for (let i = 0; i < haystacks.length; i++) {
      const h = haystacks[i];
      h.intact = true;
      h.explodeTimer = 0;
      h.mound.visible = true;
      for (let s = 0; s < h.straws.length; s++) {
        h.straws[s].mesh.visible = false;
      }
    }
    for (let i = 0; i < chaiStalls.length; i++) {
      const st = chaiStalls[i];
      st.cooldown = 0;
      st.splashTimer = 0;
      st.steamMesh.visible = true;
      for (let d = 0; d < st.droplets.length; d++) {
        st.droplets[d].mesh.visible = false;
      }
    }
    for (let i = 0; i < charpoys.length; i++) {
      charpoys[i].wobbleTimer = 0;
      charpoys[i].group.rotation.set(0, 0, 0);
    }
    for (let i = 0; i < fruitCarts.length; i++) {
      const fc = fruitCarts[i];
      fc.broken = false;
      fc.cartVisual.visible = true;
      for (let f = 0; f < fc.fruits.length; f++) {
        fc.fruits[f].active = false;
        fc.fruits[f].mesh.visible = false;
      }
    }
    cricketPositions.forEach(([cx, cz], idx) => {
      const b = cricketBalls[idx];
      if (!b) return;
      b.x = cx;
      b.y = 0.15;
      b.z = cz;
      b.vx = 0;
      b.vy = 0;
      b.vz = 0;
      b.kicked = false;
      b.hitCooldown = 0;
      b.mesh.position.set(cx, 0.15, cz);
    });
    for (let i = 0; i < waterPumps.length; i++) {
      const wp = waterPumps[i];
      wp.cooldown = 0;
      wp.sprayTimer = 0;
      wp.handlePivot.rotation.x = 0;
      for (let d = 0; d < wp.droplets.length; d++) wp.droplets[d].mesh.visible = false;
    }
    for (let i = 0; i < stonePillars.length; i++) {
      stonePillars[i].shakeTimer = 0;
      stonePillars[i].group.rotation.set(0, 0, 0);
    }
    shockwaveMesh.visible = false;
    splendorBike.state = 'hidden';
    splendorBike.group.visible = false;
    splendorBike.idleTimer = 0;
    crowdCheerTimer = 0;
  };

  const update = (
    time: number,
    dt: number,
    cameraX: number,
    comboCount = 0,
    lightingZoneOverride?: number
  ) => {
    // Keep directional shadow frustum, warm golden-amber rim light, & parallax layers tracking camera X cleanly
    sun.position.set(cameraX + 14, 18, 12);
    sunTarget.position.set(cameraX, 0, 0);
    rim.position.set(cameraX - 8, 7.5, -10.5);
    rimTarget.position.set(cameraX, 1.1, 0);
    backdropPlane.position.x = cameraX * 0.86;
    farParallaxGroup.position.x = cameraX * 0.62; // net ~0.38x parallax depth against camera
    fgParallaxGroup.position.x = -cameraX * 0.22; // net ~1.22x Light Edge Framing foreground parallax

    // Smooth 3-Zone Dynamic Lighting Cross-Fade (Zone 1 Chai Chowk -> Zone 2 Banyan -> Zone 3 Mela Dusk!)
    const zoneProgress =
      lightingZoneOverride !== undefined
        ? Math.max(0, Math.min(2, lightingZoneOverride))
        : THREE.MathUtils.clamp((cameraX - 4) / 16, 0, 2);
    if (zoneProgress <= 1) {
      scratchSky.copy(skyZone1).lerp(skyZone2, zoneProgress);
      scratchFog.copy(fogZone1).lerp(fogZone2, zoneProgress);
      scratchSun.copy(sunZone1).lerp(sunZone2, zoneProgress);
      scratchHemi.copy(hemiZone1).lerp(hemiZone2, zoneProgress);
      sun.intensity = THREE.MathUtils.lerp(2.25, 2.05, zoneProgress);
      hemi.intensity = THREE.MathUtils.lerp(1.05, 0.96, zoneProgress);
    } else {
      const t = zoneProgress - 1;
      scratchSky.copy(skyZone2).lerp(skyZone3, t);
      scratchFog.copy(fogZone2).lerp(fogZone3, t);
      scratchSun.copy(sunZone2).lerp(sunZone3, t);
      scratchHemi.copy(hemiZone2).lerp(hemiZone3, t);
      sun.intensity = THREE.MathUtils.lerp(2.05, 1.55, t);
      hemi.intensity = THREE.MathUtils.lerp(0.96, 0.82, t);
    }
    if (scene.background instanceof THREE.Color) {
      scene.background.copy(scratchSky);
    }
    if (scene.fog instanceof THREE.FogExp2) {
      scene.fog.color.copy(scratchFog);
    }
    sun.color.copy(scratchSun);
    hemi.color.copy(scratchHemi);

    // Brighten Mela Festival string lights smoothly at dusk!
    const duskGlow = Math.max(0, zoneProgress - 0.85) * 1.45;
    for (let i = 0; i < duskFestivalMats.length; i++) {
      duskFestivalMats[i].emissiveIntensity = 0.55 + duskGlow * (0.9 + Math.sin(time * 5 + i) * 0.18);
    }

    // Swaying overhead marigold flower garlands
    for (let i = 0; i < garlandGroups.length; i++) {
      const g = garlandGroups[i];
      g.group.rotation.x = Math.sin(time * 2.1 + g.phase) * 0.08;
      g.group.rotation.z = Math.cos(time * 1.6 + g.phase) * 0.03;
    }

    for (let i = 0; i < pennants.length; i++) {
      const pn = pennants[i];
      pn.m.rotation.z = Math.sin(time * 2.6 + pn.ph) * 0.14;
      pn.m.rotation.y = Math.sin(time * 1.9 + pn.ph) * 0.35;
    }
    // Drifting clouds, pigeon flocks, strolling villagers, dusk fireflies
    cloudGroup.position.x = cameraX * 0.7;
    cloudMat.color.setRGB(
      THREE.MathUtils.lerp(1.0, 1.0, 0),
      THREE.MathUtils.lerp(0.95, 0.62, Math.min(1, zoneProgress / 2)),
      THREE.MathUtils.lerp(0.84, 0.5, Math.min(1, zoneProgress / 2))
    );
    for (let i = 0; i < clouds.length; i++) {
      const c = clouds[i];
      c.g.position.x = ((c.x + time * c.speed + 40) % 80) - 40;
    }
    for (let i = 0; i < birds.length; i++) {
      const b = birds[i];
      const bx = cameraX + ((b.off + time * b.speed) % 68) - 34;
      b.g.position.set(bx, b.y + Math.sin(time * 1.6 + b.ph) * 0.18, -12.2);
      const flap = Math.sin(time * 11 + b.ph) * 0.7;
      b.wl.rotation.z = flap;
      b.wr.rotation.z = -flap;
    }
    for (let i = 0; i < walkers.length; i++) {
      const w = walkers[i];
      const span = 46;
      const raw = ((w.off + time * w.speed) % span) - span / 2;
      const wx = cameraX + raw * w.dir;
      const step = Math.sin(time * 5.2 * (w.speed + 0.4) + w.off);
      w.g.position.set(wx, Math.abs(step) * 0.03, w.z);
      w.g.rotation.y = w.dir === 1 ? Math.PI / 2 : -Math.PI / 2;
      w.ll.rotation.x = step * 0.5;
      w.rl.rotation.x = -step * 0.5;
    }
    // Crowd run
    {
      const t = time + CROWD_CYCLE - 10; // first run about 10s into the match
      const cycle = Math.floor(t / CROWD_CYCLE);
      const local = t - cycle * CROWD_CYCLE;
      if (cycle !== lastCrowdCycle) {
        lastCrowdCycle = cycle;
        if (cycle > 0) crowdRun.startedSeq++;
      }
      const running = local < CROWD_RUN_TIME && cycle > 0;
      crowdRun.active = running;
      const dirC = cycle % 2 === 0 ? 1 : -1;
      for (let i = 0; i < runners.length; i++) {
        const r = runners[i];
        r.g.visible = running;
        if (!running) continue;
        const pos = -17 + (local * 4.6 - r.lag);
        const rx = cameraX + pos * dirC;
        const step = Math.sin(time * 13 + r.ph);
        r.g.position.set(rx, Math.abs(step) * 0.09, r.z);
        r.g.rotation.y = dirC === 1 ? Math.PI / 2 : -Math.PI / 2;
        r.ll.rotation.x = step * 0.8;
        r.rl.rotation.x = -step * 0.8;
        const waving = i === runners.length - 1 ? 0.5 : 2.6; // fans have arms up, Immy just gestures
        r.la.rotation.z = -waving + Math.sin(time * 14 + r.ph) * 0.35;
        r.ra.rotation.z = waving - Math.sin(time * 14 + r.ph + 1.3) * 0.35;
        if (i === 0) crowdRun.x = rx;
      }
    }
    const ffAlpha = Math.max(0, Math.min(1, (zoneProgress - 0.7) / 0.9));
    fireflyMat.opacity = ffAlpha * 0.9;
    if (ffAlpha > 0.01) {
      const ffAttr = fireflyGeo.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < fireflySeeds.length; i++) {
        const f = fireflySeeds[i];
        ffAttr.setXYZ(
          i,
          cameraX + f.x + Math.sin(time * 0.5 + f.ph) * 0.8,
          f.y + Math.sin(time * 0.9 + f.ph * 1.3) * 0.4,
          f.z + Math.cos(time * 0.6 + f.ph) * 0.3
        );
      }
      ffAttr.needsUpdate = true;
    }
    // Lantern flicker
    lanternGlowMat.emissiveIntensity = 1.4 + Math.sin(time * 9.3) * 0.12 + Math.sin(time * 5.1) * 0.1;

    // Fluttering paper kites drifting gently across sky
    for (let i = 0; i < kites.length; i++) {
      const k = kites[i];
      k.group.position.x = k.baseX + Math.sin(time * 0.65 + k.phase) * 1.1;
      k.group.position.y = k.baseY + Math.cos(time * 1.1 + k.phase) * 0.42;
      k.group.rotation.z = Math.sin(time * 2.8 + k.phase) * 0.22;
    }

    // Drifting sunlit golden dust motes centered cleanly around cameraX (zero GC!)
    const dustAttr = dustGeo.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < dustSeeds.length; i++) {
      const ds = dustSeeds[i];
      const px = cameraX + ((ds.x + time * ds.speed * 0.45 + 13) % 26) - 13;
      const py = ds.y + Math.sin(time * 1.3 + ds.phase) * 0.35;
      const pz = ds.z + Math.cos(time * 0.9 + ds.phase) * 0.35;
      dustAttr.setXYZ(i, px, py, pz);
    }
    dustAttr.needsUpdate = true;

    // Gentle breeze sway on hanging village lanterns
    for (let i = 0; i < lanterns.length; i++) {
      const l = lanterns[i];
      l.mesh.position.y = l.baseY + Math.sin(time * 2.4 + l.phase) * 0.04;
    }

    // Update flying pot shards
    for (let i = 0; i < pots.length; i++) {
      const p = pots[i];
      if (!p.broken || p.breakTimer <= 0) continue;
      p.breakTimer -= dt;
      const elapsed = 0.85 - p.breakTimer;
      for (let s = 0; s < p.shards.length; s++) {
        const sh = p.shards[s];
        const y = Math.max(0.05, 0.44 + sh.vy * elapsed - 7.5 * elapsed * elapsed);
        sh.mesh.position.set(sh.vx * elapsed, y, sh.vz * elapsed);
        sh.mesh.rotation.x += sh.rx * dt;
        sh.mesh.rotation.z += sh.rz * dt;
        if (p.breakTimer <= 0.02) sh.mesh.visible = false;
      }
    }

    // Update exploding haystack straw wisps
    for (let i = 0; i < haystacks.length; i++) {
      const h = haystacks[i];
      if (h.explodeTimer <= 0) continue;
      h.explodeTimer = Math.max(0, h.explodeTimer - dt);
      const elapsed = 1.05 - h.explodeTimer;
      for (let s = 0; s < h.straws.length; s++) {
        const st = h.straws[s];
        const y = Math.max(0.05, 0.65 + st.vy * elapsed - 7.2 * elapsed * elapsed);
        st.mesh.position.set(st.vx * elapsed, y, st.vz * elapsed);
        st.mesh.rotation.x += st.rx * dt;
        st.mesh.rotation.z += st.rz * dt;
        if (h.explodeTimer <= 0.02) st.mesh.visible = false;
      }
    }

    // Update steaming chai stalls & hot splash droplets
    for (let i = 0; i < chaiStalls.length; i++) {
      const st = chaiStalls[i];
      if (st.cooldown > 0) st.cooldown = Math.max(0, st.cooldown - dt);
      st.steamMesh.visible = st.cooldown <= 0.05;
      if (st.steamMesh.visible) {
        st.steamMesh.position.y = 1.24 + Math.sin(time * 3.6 + st.id) * 0.14;
        const sc = 0.88 + Math.sin(time * 4.5 + st.id) * 0.18;
        st.steamMesh.scale.set(sc, sc * 1.15, sc);
      }
      if (st.splashTimer > 0) {
        st.splashTimer = Math.max(0, st.splashTimer - dt);
        const elapsed = 0.72 - st.splashTimer;
        for (let d = 0; d < st.droplets.length; d++) {
          const dr = st.droplets[d];
          const y = Math.max(0.05, 0.95 + dr.vy * elapsed - 8.5 * elapsed * elapsed);
          dr.mesh.position.set(dr.vx * elapsed, y, dr.vz * elapsed);
          if (st.splashTimer <= 0.02) dr.mesh.visible = false;
        }
      }
    }

    // Update charpoy wobble on wall-bounce juggle
    for (let i = 0; i < charpoys.length; i++) {
      const c = charpoys[i];
      if (c.wobbleTimer > 0) {
        c.wobbleTimer = Math.max(0, c.wobbleTimer - dt);
        c.group.rotation.z = Math.sin(c.wobbleTimer * 36) * 0.12 * (c.wobbleTimer / 0.45);
        c.group.rotation.x = Math.cos(c.wobbleTimer * 28) * 0.08 * (c.wobbleTimer / 0.45);
      } else {
        c.group.rotation.z = 0;
        c.group.rotation.x = 0;
      }
    }

    // Update cheering background village onlookers (auto-cheer during 10x+ combos!)
    if (crowdCheerTimer > 0) crowdCheerTimer = Math.max(0, crowdCheerTimer - dt);
    const cheeringNow = crowdCheerTimer > 0 || comboCount >= 10;
    for (let i = 0; i < onlookers.length; i++) {
      const o = onlookers[i];
      if (cheeringNow) {
        const hop = Math.abs(Math.sin(time * 13 + o.phase)) * 0.28;
        o.group.position.y = o.baseY + hop;
        o.leftArm.rotation.z = -2.45 + Math.sin(time * 16 + o.phase) * 0.25;
        o.rightArm.rotation.z = 2.45 - Math.sin(time * 16 + o.phase) * 0.25;
      } else {
        o.group.position.y = o.baseY + Math.sin(time * 2.5 + o.phase) * 0.025;
        o.leftArm.rotation.z = -0.22;
        o.rightArm.rotation.z = 0.22;
      }
    }

    // Update spilled rolling watermelons & mangoes from smashed wooden fruit carts
    for (let i = 0; i < fruitCarts.length; i++) {
      const fc = fruitCarts[i];
      for (let f = 0; f < fc.fruits.length; f++) {
        const fr = fc.fruits[f];
        if (!fr.active) continue;
        fr.timer -= dt;
        if (fr.hitCooldown > 0) fr.hitCooldown = Math.max(0, fr.hitCooldown - dt);
        fr.x += fr.vx * dt;
        fr.z += fr.vz * dt;
        fr.vy -= 14 * dt;
        fr.y += fr.vy * dt;
        const r = fr.kind === 'watermelon' ? 0.24 : 0.14;
        if (fr.y <= r) {
          fr.y = r;
          fr.vy = Math.abs(fr.vy) > 1.2 ? Math.abs(fr.vy) * 0.42 : 0;
        }
        fr.vx *= Math.exp(-1.15 * dt);
        fr.vz *= Math.exp(-1.35 * dt);
        fr.mesh.position.set(fr.x, fr.y, fr.z);
        fr.mesh.rotation.z -= fr.vx * dt * 2.4;
        fr.mesh.rotation.x += fr.vz * dt * 2.4;
        if (fr.timer <= 0) {
          fr.active = false;
          fr.mesh.visible = false;
        }
      }
    }

    // Update stray street cricket balls
    for (let i = 0; i < cricketBalls.length; i++) {
      const b = cricketBalls[i];
      if (b.hitCooldown > 0) b.hitCooldown = Math.max(0, b.hitCooldown - dt);
      if (Math.abs(b.vx) > 0.08 || Math.abs(b.vz) > 0.08 || b.y > 0.16) {
        b.x += b.vx * dt;
        b.z += b.vz * dt;
        b.vy -= 16 * dt;
        b.y += b.vy * dt;
        if (b.y <= 0.15) {
          b.y = 0.15;
          b.vy = Math.abs(b.vy) > 1.1 ? Math.abs(b.vy) * 0.52 : 0;
        }
        b.vx *= Math.exp(-1.4 * dt);
        b.vz *= Math.exp(-1.4 * dt);
        if (b.z < -4.0 || b.z > 3.05) {
          b.z = Math.max(-4.0, Math.min(3.05, b.z));
          b.vz = -b.vz * 0.7;
        }
        b.mesh.position.set(b.x, b.y, b.z);
        b.mesh.rotation.z -= b.vx * dt * 4;
        if (Math.hypot(b.vx, b.vz) < 0.35) b.kicked = false;
      }
    }

    // Update roadside water hand-pumps & burst droplets
    for (let i = 0; i < waterPumps.length; i++) {
      const wp = waterPumps[i];
      if (wp.cooldown > 0) wp.cooldown = Math.max(0, wp.cooldown - dt);
      if (wp.sprayTimer > 0) {
        wp.sprayTimer = Math.max(0, wp.sprayTimer - dt);
        wp.handlePivot.rotation.x = Math.sin(wp.sprayTimer * 28) * 0.55;
        const elapsed = 0.88 - wp.sprayTimer;
        for (let d = 0; d < wp.droplets.length; d++) {
          const dr = wp.droplets[d];
          const y = Math.max(0.05, 1.0 + dr.vy * elapsed - 8.2 * elapsed * elapsed);
          dr.mesh.position.set(dr.vx * elapsed, y, 0.35 + dr.vz * elapsed);
          if (wp.sprayTimer <= 0.02) dr.mesh.visible = false;
        }
      } else {
        wp.handlePivot.rotation.x *= 0.85;
      }
    }

    // Update Banyan Courtyard stone pillar impact shake
    for (let i = 0; i < stonePillars.length; i++) {
      const sp = stonePillars[i];
      if (sp.shakeTimer > 0) {
        sp.shakeTimer = Math.max(0, sp.shakeTimer - dt);
        sp.group.rotation.z = Math.sin(sp.shakeTimer * 44) * 0.06 * (sp.shakeTimer / 0.4);
      } else {
        sp.group.rotation.z = 0;
      }
    }

    // Smash debris chunks
    for (const d of debris) {
      if (d.life <= 0) continue;
      d.life -= dt;
      d.vy -= 11 * dt;
      d.mesh.position.x += d.vx * dt;
      d.mesh.position.y = Math.max(0.05, d.mesh.position.y + d.vy * dt);
      d.mesh.position.z += d.vz * dt;
      d.mesh.rotation.x += d.vx * dt * 2;
      d.mesh.rotation.z += d.vz * dt * 2;
      if (d.life <= 0) d.mesh.visible = false;
    }

    // Update idling/ridden Splendor motorbike visuals
    if (splendorBike.state !== 'hidden') {
      splendorBike.group.visible = true;
      splendorBike.group.position.set(splendorBike.x, 0, splendorBike.z);
      splendorBike.group.rotation.y = splendorBike.facing === 1 ? 0 : Math.PI;
      splendorBike.mountRing.visible = splendorBike.state === 'idle';
      if (splendorBike.state === 'idle') {
        const pulse = 1 + Math.sin(time * 8.5) * 0.14;
        splendorBike.mountRing.scale.set(pulse, pulse, 1);
        splendorBike.group.position.y = Math.abs(Math.sin(time * 32)) * 0.02;
      } else {
        splendorBike.group.position.y = 0;
        for (let w = 0; w < splendorBike.wheels.length; w++) {
          splendorBike.wheels[w].rotation.x += dt * 22;
        }
      }
    } else {
      splendorBike.group.visible = false;
    }

    // Bob & rotate active ground pickups (and arc tossed Crowd Hype drops!)
    for (let i = 0; i < pickups.length; i++) {
      const it = pickups[i];
      if (!it.active) continue;
      if (it.dynamic && it.arcTimer && it.arcTimer > 0) {
        it.arcTimer = Math.max(0, it.arcTimer - dt);
        const dur = it.arcDuration || 0.62;
        const t = 1 - it.arcTimer / dur;
        const sx = it.startX ?? it.x;
        const sz = it.startZ ?? it.z;
        const tx = it.targetX ?? it.x;
        const tz = it.targetZ ?? it.z;
        it.group.position.x = sx + (tx - sx) * t;
        it.group.position.z = sz + (tz - sz) * t;
        const arcH = Math.sin(t * Math.PI) * 2.55;
        it.visual.position.y = 0.56 + arcH;
        it.visual.rotation.y = time * 6.5 + it.id;
        if (it.arcTimer <= 0.001) {
          it.glowRing.visible = true;
        }
      } else {
        it.visual.rotation.y = time * 2.4 + it.id;
        it.visual.position.y = 0.56 + Math.sin(time * 4.2 + it.id) * 0.09;
        const pulse = 1 + Math.sin(time * 5.2 + it.id) * 0.12;
        it.glowRing.scale.set(pulse, pulse, 1);
      }
    }

    // Update our non-interactive roaming village sheep along the scenic roadside!
    sheep.update(time, dt, cameraX);
  };

  const dispose = () => {
    sheep.dispose();
    scene.remove(group);
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
    textures.forEach((t) => t.dispose());
  };

  return {
    group,
    pots,
    pickups,
    haystacks,
    chaiStalls,
    charpoys,
    fruitCarts,
    cricketBalls,
    waterPumps,
    stonePillars,
    smashProps,
    hitSmashProp,
    splendorBike,
    rickshaw,
    smashPot,
    smashFruitCart,
    triggerWaterPumpBurst,
    triggerPillarBounce,
    consumePickup,
    triggerHaystackExplosion,
    triggerChaiSplash,
    triggerCharpoyBounce,
    triggerCrowdCheer,
    reactSheepToBrawl,
    sheep,
    setShockwaveRing,
    spawnCrowdDrop,
    resetProps,
    crowdRun,
    update,
    dispose,
  };
}
