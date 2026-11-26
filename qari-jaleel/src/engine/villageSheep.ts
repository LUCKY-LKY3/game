import * as THREE from 'three';

export interface VillageSheepHandle {
  group: THREE.Group;
  update: (time: number, dt: number, scrollCenterX?: number) => void;
  reactToNearbyBrawl: (brawlX: number, brawlZ: number) => boolean;
  getPosition: () => { x: number; z: number };
  /** Send the sheep charging at a spot (it headbutts whatever is there) */
  chargeAt: (x: number, z: number) => void;
  /** Update the charge target while charging (follows a moving cousin); false once the charge is over */
  steer: (x: number, z: number) => boolean;
  /** Pop-up moments since the last call (text + where; bonk = headbutt landed) */
  takeEvents: () => SheepEvent[];
  dispose: () => void;
}

export interface SheepEvent {
  text: string;
  x: number;
  z: number;
  bonk?: boolean;
  baa?: boolean;
}

type SheepBehavior = 'trot' | 'scamper' | 'graze' | 'look' | 'faint' | 'spin' | 'pronk' | 'moonwalk' | 'stare' | 'charge';
const STUPID: SheepBehavior[] = ['faint', 'spin', 'pronk', 'moonwalk', 'stare'];

/**
 * Creates a lively, multi-part 3D Indian village sheep that hangs around, grazes,
 * looks curiously at the fight, and scampers across the arena.
 * Grounded with bottom-center pivot at y = 0 and zero per-frame allocations.
 */
export function createVillageSheep(): VillageSheepHandle {
  const group = new THREE.Group();
  group.name = 'village_sheep';

  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geometries.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    materials.push(m);
    return m;
  };

  // Materials with clear roughness/metalness contrast
  const woolMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#F6F0E4',
      roughness: 0.94,
      metalness: 0.02,
    })
  );
  const woolCreamMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#EAE0CE',
      roughness: 0.96,
      metalness: 0.01,
    })
  );
  const faceMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#2B2420',
      roughness: 0.78,
      metalness: 0.04,
    })
  );
  const hoofMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#171311',
      roughness: 0.34,
      metalness: 0.14,
    })
  );
  const hornMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#CDB58E',
      roughness: 0.46,
      metalness: 0.08,
    })
  );
  const eyeWhiteMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#FAF7F0',
      roughness: 0.15,
      metalness: 0.05,
    })
  );
  const pupilMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#110E0C',
      roughness: 0.08,
      metalness: 0.1,
    })
  );
  const collarMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#DC2626',
      roughness: 0.72,
      metalness: 0.05,
    })
  );
  const bellMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#F59E0B',
      roughness: 0.2,
      metalness: 0.9,
    })
  );
  const shadowMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: '#180E08',
      transparent: true,
      opacity: 0.34,
      depthWrite: false,
    })
  );

  // Soft contact shadow grounded right at y = 0.02
  const shadowDisc = new THREE.Mesh(trackGeo(new THREE.CircleGeometry(0.62, 20)), shadowMat);
  shadowDisc.rotation.x = -Math.PI / 2;
  shadowDisc.position.y = 0.022;
  shadowDisc.scale.set(0.82, 1.16, 1);
  group.add(shadowDisc);

  // Articulated body rig pivoted so hooves touch y = 0 cleanly
  const bodyRig = new THREE.Group();
  bodyRig.position.y = 0.62;
  group.add(bodyRig);

  // ── FLUFFY CLOUD-WOOL BODY (Composite multi-puff silhouette) ────────────────
  const coreGeo = trackGeo(new THREE.SphereGeometry(0.38, 16, 14));
  const coreWool = new THREE.Mesh(coreGeo, woolMat);
  coreWool.scale.set(0.92, 0.88, 1.38);
  coreWool.castShadow = true;
  coreWool.receiveShadow = true;
  bodyRig.add(coreWool);

  const puffGeo = trackGeo(new THREE.SphereGeometry(0.22, 12, 10));
  const puffSpecs: [number, number, number, number, boolean][] = [
    [0.0, 0.2, 0.24, 1.05, false],
    [0.0, 0.22, -0.18, 1.1, true],
    [-0.22, 0.08, 0.22, 0.95, true],
    [0.22, 0.08, 0.22, 0.95, true],
    [-0.24, 0.06, -0.18, 1.0, false],
    [0.24, 0.06, -0.18, 1.0, false],
    [-0.18, -0.06, 0.02, 0.92, true],
    [0.18, -0.06, 0.02, 0.92, true],
    [0.0, 0.06, 0.42, 0.95, false],
    [0.0, 0.04, -0.44, 0.96, true],
  ];
  for (let i = 0; i < puffSpecs.length; i++) {
    const [px, py, pz, s, alt] = puffSpecs[i];
    const puff = new THREE.Mesh(puffGeo, alt ? woolCreamMat : woolMat);
    puff.position.set(px, py, pz);
    puff.scale.setScalar(s);
    puff.castShadow = true;
    puff.receiveShadow = true;
    bodyRig.add(puff);
  }

  // Cute wagging fluffy tail at the rear (-Z)
  const tailPivot = new THREE.Group();
  tailPivot.position.set(0, 0.02, -0.56);
  const tailMesh = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.11, 10, 8)), woolMat);
  tailMesh.scale.set(0.85, 0.9, 1.25);
  tailMesh.position.set(0, -0.04, -0.06);
  tailMesh.castShadow = true;
  tailPivot.add(tailMesh);
  bodyRig.add(tailPivot);

  // Festive red village collar & gleaming brass bell around the neck
  const collar = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.21, 0.028, 8, 18)), collarMat);
  collar.position.set(0, 0.14, 0.46);
  collar.rotation.x = Math.PI * 0.34;
  bodyRig.add(collar);

  const bellPivot = new THREE.Group();
  bellPivot.position.set(0, -0.02, 0.56);
  const bellMesh = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.028, 0.052, 0.085, 10)), bellMat);
  bellMesh.position.y = -0.045;
  bellMesh.castShadow = true;
  bellPivot.add(bellMesh);
  bodyRig.add(bellPivot);

  // ── SCULPTED HEAD, FLOPPY EARS, CURVED HORNS & EXPRESSIVE EYES (+Z) ────────
  const headPivot = new THREE.Group();
  headPivot.position.set(0, 0.22, 0.5);
  bodyRig.add(headPivot);

  // Cranium & tapered dark muzzle
  const skull = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.18, 14, 12)), faceMat);
  skull.scale.set(0.94, 0.95, 1.18);
  skull.position.set(0, 0.04, 0.12);
  skull.castShadow = true;
  headPivot.add(skull);

  const snout = new THREE.Mesh(trackGeo(new THREE.CapsuleGeometry(0.105, 0.14, 6, 12)), faceMat);
  snout.rotation.x = Math.PI * 0.45;
  snout.position.set(0, -0.03, 0.28);
  snout.castShadow = true;
  headPivot.add(snout);

  // Fluffy cream wool crown tuft right on top of the sheep's forehead
  const tuft1 = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.135, 10, 8)), woolMat);
  tuft1.scale.set(1.15, 0.72, 1.1);
  tuft1.position.set(0, 0.19, 0.1);
  const tuft2 = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.095, 10, 8)), woolCreamMat);
  tuft2.position.set(0, 0.21, 0.19);
  headPivot.add(tuft1, tuft2);

  // Glossy eyes on left and right of head
  const eyeGeo = trackGeo(new THREE.SphereGeometry(0.042, 10, 8));
  const pupilGeo = trackGeo(new THREE.SphereGeometry(0.024, 8, 8));
  [-1, 1].forEach((side) => {
    const eye = new THREE.Mesh(eyeGeo, eyeWhiteMat);
    eye.position.set(side * 0.125, 0.06, 0.22);
    const pupil = new THREE.Mesh(pupilGeo, pupilMat);
    pupil.position.set(side * 0.145, 0.06, 0.25);
    headPivot.add(eye, pupil);
  });

  // Floppy articulated ears that bounce while running
  const earGeo = trackGeo(new THREE.CapsuleGeometry(0.042, 0.14, 6, 8));
  const leftEarPivot = new THREE.Group();
  leftEarPivot.position.set(-0.15, 0.1, 0.08);
  const leftEar = new THREE.Mesh(earGeo, faceMat);
  leftEar.position.set(-0.08, -0.05, 0);
  leftEar.rotation.z = 0.85;
  leftEar.scale.set(0.65, 1, 0.85);
  leftEarPivot.add(leftEar);
  headPivot.add(leftEarPivot);

  const rightEarPivot = new THREE.Group();
  rightEarPivot.position.set(0.15, 0.1, 0.08);
  const rightEar = new THREE.Mesh(earGeo, faceMat);
  rightEar.position.set(0.08, -0.05, 0);
  rightEar.rotation.z = -0.85;
  rightEar.scale.set(0.65, 1, 0.85);
  rightEarPivot.add(rightEar);
  headPivot.add(rightEarPivot);

  // Cute small curled village horns
  const hornGeo = trackGeo(new THREE.TorusGeometry(0.08, 0.024, 8, 14, Math.PI * 1.15));
  [-1, 1].forEach((side) => {
    const horn = new THREE.Mesh(hornGeo, hornMat);
    horn.position.set(side * 0.11, 0.19, 0.05);
    horn.rotation.set(0.25, side * 1.25, side * 0.4);
    horn.castShadow = true;
    headPivot.add(horn);
  });

  // ── 4 ARTICULATED TROTTING LEGS WITH DARK HOOVES ───────────────────────────
  const upperLegGeo = trackGeo(new THREE.CylinderGeometry(0.058, 0.044, 0.36, 10));
  const hoofGeo = trackGeo(new THREE.CylinderGeometry(0.046, 0.054, 0.1, 10));

  const buildLeg = (lx: number, lz: number) => {
    const legPivot = new THREE.Group();
    legPivot.position.set(lx, -0.18, lz);

    const leg = new THREE.Mesh(upperLegGeo, faceMat);
    leg.position.y = -0.18;
    leg.castShadow = true;
    legPivot.add(leg);

    const hoof = new THREE.Mesh(hoofGeo, hoofMat);
    hoof.position.y = -0.39;
    hoof.castShadow = true;
    legPivot.add(hoof);

    bodyRig.add(legPivot);
    return legPivot;
  };

  const flLeg = buildLeg(-0.18, 0.28);
  const frLeg = buildLeg(0.18, 0.28);
  const blLeg = buildLeg(-0.18, -0.28);
  const brLeg = buildLeg(0.18, -0.28);

  // Compact natural village lamb/sheep scale so it trots playfully without overshadowing fighters
  group.scale.setScalar(0.62);

  // ── AUTONOMOUS SHEEP ROAMING AI STATE ──────────────────────────────────────
  let posX = -3.4;
  let posZ = -2.2;
  let yaw = Math.PI * 0.45;
  let targetX = 4.6;
  let targetZ = -2.6;
  let behavior: SheepBehavior = 'trot';
  let stateTimer = 3.2;
  let gaitPhase = 0;
  let baaCooldown = 0;
  let startleHopTimer = 0;
  let roll = 0; // fainting: tipped on its side
  let stupidCooldown = 6 + Math.random() * 6;
  const events: SheepEvent[] = [];
  const say = (text: string, extra: Partial<SheepEvent> = {}) => events.push({ text, x: posX, z: posZ, ...extra });

  // Scenic roadside waypoints keeping the sheep trotting along the edges without obstructing the expanded central combat lane
  const waypoints: [number, number][] = [
    [5.8, -4.35],
    [2.4, -4.5],
    [-4.8, -4.3],
    [-6.6, -4.15],
    [-3.2, 3.35],
    [3.8, 3.45],
    [6.8, -4.2],
    [0.2, -4.55],
    [-5.8, 3.25],
    [5.4, 3.35],
  ];
  let wpIdx = 0;

  let currentCenterX = 0;

  const startStupid = () => {
    behavior = STUPID[Math.floor(Math.random() * STUPID.length)];
    stupidCooldown = 8 + Math.random() * 10;
    if (behavior === 'faint') {
      stateTimer = 2.2;
      say('*FAINTS*', { baa: true });
    } else if (behavior === 'spin') {
      stateTimer = 2.0;
      say('BAA?! (chasing own tail)');
    } else if (behavior === 'pronk') {
      stateTimer = 2.2;
      say('BOING! BOING!', { baa: true });
    } else if (behavior === 'moonwalk') {
      stateTimer = 2.6;
      say('SHEEP MOONWALK!');
    } else {
      stateTimer = 2.6;
      say('...');
    }
  };

  const pickNextBehavior = () => {
    if (stupidCooldown <= 0 && Math.random() < 0.45) {
      startStupid();
      return;
    }
    const roll = Math.random();
    if (behavior === 'graze' || behavior === 'look') {
      // After pausing, pick a new visible spot across the active view and either trot or scamper!
      wpIdx = (wpIdx + 1 + Math.floor(Math.random() * 3)) % waypoints.length;
      const [wx, wz] = waypoints[wpIdx];
      targetX = currentCenterX + wx + (Math.random() - 0.5) * 1.4;
      targetZ = wz + (Math.random() - 0.5) * 0.8;
      behavior = roll < 0.52 ? 'scamper' : 'trot';
      stateTimer = 3.5 + Math.random() * 3.0;
    } else if (roll < 0.45) {
      behavior = 'graze';
      stateTimer = 1.6 + Math.random() * 1.6;
    } else if (roll < 0.72) {
      behavior = 'look';
      stateTimer = 1.2 + Math.random() * 1.2;
    } else {
      // Suddenly dart to another side of the visible street!
      wpIdx = (wpIdx + 2 + Math.floor(Math.random() * 4)) % waypoints.length;
      const [wx, wz] = waypoints[wpIdx];
      targetX = currentCenterX + wx + (Math.random() - 0.5) * 1.2;
      targetZ = wz + (Math.random() - 0.5) * 0.7;
      behavior = 'scamper';
      stateTimer = 3.0 + Math.random() * 2.5;
    }
  };

  group.position.set(posX, 0, posZ);
  group.rotation.y = yaw;

  const update = (time: number, rawDt: number, scrollCenterX = 0) => {
    const dt = Math.min(0.05, Math.max(0.001, rawDt));
    currentCenterX = scrollCenterX;
    stateTimer -= dt;
    stupidCooldown -= dt;
    if (baaCooldown > 0) baaCooldown = Math.max(0, baaCooldown - dt);
    // Stand back up after fainting
    roll = THREE.MathUtils.damp(roll, behavior === 'faint' && stateTimer > 0.35 ? Math.PI / 2 : 0, behavior === 'faint' ? 14 : 6, dt);
    group.rotation.z = roll;

    // ── Silly behaviours ──
    if (behavior === 'faint' || behavior === 'spin' || behavior === 'pronk' || behavior === 'moonwalk' || behavior === 'stare' || behavior === 'charge') {
      let moving = false;
      if (behavior === 'faint') {
        // stiff legs sticking straight out
        flLeg.rotation.x = frLeg.rotation.x = blLeg.rotation.x = brLeg.rotation.x = 0;
        bodyRig.position.y = 0.62;
        if (stateTimer <= 0) {
          say('...baa?');
          behavior = 'look';
          stateTimer = 1.2;
        }
      } else if (behavior === 'spin') {
        yaw += dt * 9;
        moving = true;
        if (stateTimer <= 0) {
          say('*dizzy baa*');
          behavior = 'look';
          stateTimer = 1.4;
        }
      } else if (behavior === 'pronk') {
        // all four legs stiff, boinging straight up and down
        bodyRig.position.y = 0.62 + Math.abs(Math.sin(time * 8.5)) * 0.75;
        flLeg.rotation.x = frLeg.rotation.x = blLeg.rotation.x = brLeg.rotation.x = 0;
        bodyRig.rotation.x = Math.sin(time * 8.5) * 0.1;
        if (stateTimer <= 0) {
          behavior = 'graze';
          stateTimer = 1.5;
        }
      } else if (behavior === 'moonwalk') {
        posX -= Math.sin(yaw) * 1.1 * dt;
        posZ -= Math.cos(yaw) * 1.1 * dt;
        gaitPhase -= dt * 9; // legs run backwards
        flLeg.rotation.x = Math.sin(gaitPhase) * 0.45;
        brLeg.rotation.x = Math.sin(gaitPhase) * 0.45;
        frLeg.rotation.x = -Math.sin(gaitPhase) * 0.45;
        blLeg.rotation.x = -Math.sin(gaitPhase) * 0.45;
        bodyRig.position.y = 0.62 + Math.abs(Math.sin(gaitPhase)) * 0.04;
        if (stateTimer <= 0) {
          say('HEE-BAA!');
          behavior = 'look';
          stateTimer = 1.0;
        }
      } else if (behavior === 'stare') {
        // turns to the camera and stares... head slowly tilting
        const lookYaw = Math.atan2(0, 1);
        yaw += (lookYaw - yaw) * (1 - Math.exp(-4 * dt));
        headPivot.rotation.z = Math.min(0.6, (2.6 - stateTimer) * 0.3);
        headPivot.rotation.x = -0.15;
        if (stateTimer <= 0) {
          headPivot.rotation.z = 0;
          say('BAA.');
          behavior = 'scamper';
          pickNextBehavior();
        }
      } else {
        // charge: head down, sprint at the target, headbutt
        const dx = targetX - posX;
        const dz = targetZ - posZ;
        const dist = Math.hypot(dx, dz);
        yaw = Math.atan2(dx, dz);
        headPivot.rotation.x = 0.45;
        if (dist < 0.6 || stateTimer <= 0) {
          if (dist < 0.9) say('BAA-BOOM!', { bonk: true, baa: true });
          behavior = 'look';
          stateTimer = 1.2;
          headPivot.rotation.x = 0;
        } else {
          const step = Math.min(dist, 5.4 * dt);
          posX += (dx / dist) * step;
          posZ += (dz / dist) * step;
          moving = true;
        }
      }
      if (moving) {
        gaitPhase += dt * 16;
        const sw = Math.sin(gaitPhase) * 0.7;
        flLeg.rotation.x = sw;
        brLeg.rotation.x = -sw;
        frLeg.rotation.x = -sw;
        blLeg.rotation.x = sw;
        bodyRig.position.y = 0.62 + Math.abs(Math.sin(gaitPhase)) * 0.12;
      }
      posZ = Math.max(-4.65, Math.min(3.55, posZ));
      group.position.set(posX, 0, posZ);
      group.rotation.y = yaw;
      return;
    }
    if (startleHopTimer > 0) startleHopTimer = Math.max(0, startleHopTimer - dt);

    // If the street scrolled ahead, gently encourage the sheep to scamper along the roadside into view!
    if (Math.abs(posX - scrollCenterX) > 9.0) {
      behavior = 'scamper';
      targetX = scrollCenterX + (posX < scrollCenterX ? -3.0 : 3.0) + (Math.random() - 0.5) * 2.4;
      targetZ = Math.random() < 0.65 ? -4.35 : 3.35;
      stateTimer = 3.0;
    }

    let speed = 0;
    if (behavior === 'trot' || behavior === 'scamper') {
      const dx = targetX - posX;
      const dz = targetZ - posZ;
      const dist = Math.hypot(dx, dz);

      if (dist < 0.45 || stateTimer <= 0) {
        pickNextBehavior();
      } else {
        const desiredYaw = Math.atan2(dx, dz);
        // Shortest-angle damped turn
        let diff = desiredYaw - yaw;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        yaw += diff * (1 - Math.exp(-7.5 * dt));

        speed = behavior === 'scamper' ? 3.9 : 2.15;
        const step = Math.min(dist, speed * dt);
        posX += Math.sin(yaw) * step;
        posZ += Math.cos(yaw) * step;
      }
    } else {
      // Grazing or looking curiously toward the camera/fight
      if (behavior === 'look') {
        const lookYaw = Math.atan2(-posX * 0.35, 6 - posZ);
        let diff = lookYaw - yaw;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        yaw += diff * (1 - Math.exp(-5 * dt));
      }
      if (stateTimer <= 0) {
        pickNextBehavior();
      }
    }

    // Clamp cleanly around the active visible street roadside window
    const minX = scrollCenterX - 9.8;
    const maxX = scrollCenterX + 9.8;
    if (posX < minX - 1.5) posX = minX;
    if (posX > maxX + 1.5) posX = maxX;
    posZ = Math.max(-4.65, Math.min(3.55, posZ));
    group.position.set(posX, 0, posZ);
    group.rotation.y = yaw;

    // ── PROCEDURAL GALLOP, BOUNCE, GRAZE & EAR/TAIL ANIMATION ───────────────
    if (speed > 0.1) {
      const strideRate = behavior === 'scamper' ? 16.5 : 10.2;
      gaitPhase += dt * strideRate;
      const swingAmp = behavior === 'scamper' ? 0.72 : 0.46;
      const hopHeight = behavior === 'scamper' ? 0.16 : 0.065;
      const startleBoost = startleHopTimer > 0 ? Math.sin((startleHopTimer / 0.45) * Math.PI) * 0.34 : 0;
      const hop = Math.abs(Math.sin(gaitPhase)) * hopHeight + startleBoost;

      bodyRig.position.y = 0.62 + hop;
      bodyRig.rotation.x = Math.sin(gaitPhase * 2) * (behavior === 'scamper' ? 0.11 : 0.045);
      bodyRig.rotation.z = Math.cos(gaitPhase) * 0.05;

      // Diagonal trot / scamper legs
      const s1 = Math.sin(gaitPhase) * swingAmp;
      const s2 = Math.sin(gaitPhase + (behavior === 'scamper' ? 0.55 : Math.PI)) * swingAmp;
      flLeg.rotation.x = s1;
      brLeg.rotation.x = behavior === 'scamper' ? -s1 : s1;
      frLeg.rotation.x = behavior === 'scamper' ? s2 : -s1;
      blLeg.rotation.x = behavior === 'scamper' ? -s2 : -s1;

      headPivot.rotation.x = -0.06 + Math.sin(gaitPhase * 2) * 0.08;
      headPivot.rotation.y = Math.sin(time * 2.4) * 0.1;

      // Floppy ears, brass bell & tail bounce happily
      const earBounce = Math.abs(Math.sin(gaitPhase)) * 0.34;
      leftEarPivot.rotation.z = earBounce;
      rightEarPivot.rotation.z = -earBounce;
      bellPivot.rotation.z = Math.sin(gaitPhase * 1.4) * 0.45;
      tailPivot.rotation.y = Math.sin(time * 18) * 0.45;

      // Shrink contact shadow subtly during scamper hops
      shadowDisc.scale.set(0.82 - hop * 0.6, 1.16 - hop * 0.8, 1);
    } else {
      // Idle graze or curious head tilt
      const damp = 1 - Math.exp(-8 * dt);
      flLeg.rotation.x *= 1 - damp;
      frLeg.rotation.x *= 1 - damp;
      blLeg.rotation.x *= 1 - damp;
      brLeg.rotation.x *= 1 - damp;
      bodyRig.rotation.z *= 1 - damp;
      shadowDisc.scale.set(0.82, 1.16, 1);

      if (behavior === 'graze') {
        const nibble = Math.sin(time * 11) * 0.06;
        bodyRig.position.y = THREE.MathUtils.damp(bodyRig.position.y, 0.59, 8, dt);
        bodyRig.rotation.x = THREE.MathUtils.damp(bodyRig.rotation.x, 0.14, 7, dt);
        headPivot.rotation.x = THREE.MathUtils.damp(headPivot.rotation.x, 0.68 + nibble, 8, dt);
        headPivot.rotation.y = THREE.MathUtils.damp(
          headPivot.rotation.y,
          Math.sin(time * 2.2) * 0.18,
          6,
          dt
        );
      } else {
        // Curious look + occasional cheeky little hop
        const happyHop = Math.max(0, Math.sin(time * 7.5)) * 0.04;
        bodyRig.position.y = THREE.MathUtils.damp(bodyRig.position.y, 0.62 + happyHop, 10, dt);
        bodyRig.rotation.x = THREE.MathUtils.damp(bodyRig.rotation.x, -0.04, 7, dt);
        headPivot.rotation.x = THREE.MathUtils.damp(headPivot.rotation.x, -0.1, 8, dt);
        headPivot.rotation.y = THREE.MathUtils.damp(
          headPivot.rotation.y,
          Math.sin(time * 3.1) * 0.34,
          7,
          dt
        );
      }

      const earTwitch = Math.sin(time * 9) > 0.85 ? 0.28 : 0;
      leftEarPivot.rotation.z = THREE.MathUtils.damp(leftEarPivot.rotation.z, earTwitch, 12, dt);
      rightEarPivot.rotation.z = THREE.MathUtils.damp(rightEarPivot.rotation.z, -earTwitch * 0.6, 12, dt);
      bellPivot.rotation.z = THREE.MathUtils.damp(bellPivot.rotation.z, Math.sin(time * 3) * 0.08, 8, dt);
      tailPivot.rotation.y = Math.sin(time * 12) * 0.25;
    }
  };

  const reactToNearbyBrawl = (brawlX: number, brawlZ: number): boolean => {
    if (baaCooldown > 0) return false;
    const dist = Math.hypot(posX - brawlX, posZ - brawlZ);
    if (dist > 3.85) return false;
    baaCooldown = 4.6;
    startleHopTimer = 0.45;
    behavior = 'scamper';
    const fleeDir = posX >= brawlX ? 1 : -1;
    targetX = currentCenterX + Math.max(-7.5, Math.min(7.5, posX - currentCenterX + fleeDir * 4.2));
    targetZ = posZ < 0 ? -4.45 : 3.4;
    stateTimer = 2.4;
    return true;
  };

  const getPosition = () => ({ x: posX, z: posZ });

  const chargeAt = (x: number, z: number) => {
    if (behavior === 'faint' || behavior === 'charge') return;
    behavior = 'charge';
    targetX = x;
    targetZ = z;
    stateTimer = 3.2;
    say('BAAAAA!!', { baa: true });
  };

  const steer = (x: number, z: number) => {
    if (behavior !== 'charge') return false;
    targetX = x;
    targetZ = z;
    return true;
  };

  const takeEvents = () => events.splice(0, events.length);

  const dispose = () => {
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
  };

  return { group, update, reactToNearbyBrawl, getPosition, chargeAt, steer, takeEvents, dispose };
}
