import * as THREE from 'three';
import { soundEngine } from '../sound';
import { applyThugPose, createVillageThugRig, VillageThugRig, VillageThugSpec } from '../villageThugs';
import type { StreetBrawlEngine } from '../streetBrawlEngine';
import type { EnemyRuntime } from './types';
import { LANE_MAX_Z, LANE_MIN_Z } from './data';

/**
 * Street comedy: flying chappals, surrendering cousins, cousins arguing, samosa distractions,
 * the chai wallah's chai break and idle gags for the heroes.
 */

const IDLE_LINES: Record<string, string[]> = {
  qari_jaleel: ['*checks watch* Two minutes, gentlemen. Two.', 'I do hope someone is going to hit me soon. It is rather dull.'],
  rebel_aviator: ['*drops for push-ups* One... two... bro count for me.', 'Anyone? A hug? A fight? Either is fine.'],
  rebel_tactician: ['*sits down* Wake me when they come, khotey.', 'Main so jaanda haan. Bye.'],
  rebel_enforcer: ['So... is anyone driving my way after this?', 'I could have been home by now. Just saying.'],
  rebel_striker: ['*checks phone* Portfolio up 0.3%. Nice.', 'While we wait: SIP. Think about it.'],
  rebel_shadow: ['*checks reflection in a chai glass* Still gorgeous.', 'Is anyone filming this? My left side is better.'],
};

const ARGUE: [string, string][] = [
  ["I'm attacking first!", 'No, ME! I called it!'],
  ['You hit like Pappu!', "Don't drag Pappu into this!"],
  ["That's MY hero to beat!", 'Since WHEN?!'],
];

const CHAI_WALLAH: VillageThugSpec = {
  id: 'chai_wallah',
  name: 'Chai Wallah',
  subtitle: 'Cutting Chai Specialist',
  archetype: 'idiot',
  maxHp: 1,
  damage: 0,
  speed: 1.4,
  scoreValue: 0,
  skinTone: '#9A6A44',
  shirtColor: '#F5F5F4',
  pantsColor: '#78716C',
  gamchaColor: '#DC2626',
  hairColor: '#1C1917',
  heightScale: 0.92,
  widthScale: 0.92,
  bellyBulge: 0.08,
  hasClub: false,
  headAccessory: 'gamcha_knot',
  goofyEyes: true,
  buckTeeth: false,
  battleCry: 'Garam chai!',
};

interface FlyingChappal {
  mesh: THREE.Group;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  ownerUid: number;
  active: boolean;
}

export interface GagState {
  chappals: FlyingChappal[];
  argueTimer: number;
  samosaTimer: number;
  chaiTimer: number;
  chai: { rig: VillageThugRig; x: number; z: number; dir: 1 | -1; announced: boolean } | null;
  idleTimer: number;
  idleLastX: number;
  idleLastZ: number;
  idleHero: number;
}

export function makeGagState(): GagState {
  return {
    chappals: [],
    argueTimer: 18,
    samosaTimer: 26,
    chaiTimer: 40,
    chai: null,
    idleTimer: 0,
    idleLastX: 0,
    idleLastZ: 0,
    idleHero: -1,
  };
}

export function resetGags(this: StreetBrawlEngine) {
  const g = this.gags;
  for (const c of g.chappals) {
    c.active = false;
    c.mesh.visible = false;
  }
  if (g.chai) {
    this.scene.remove(g.chai.rig.root);
    g.chai.rig.dispose();
    g.chai = null;
  }
  g.argueTimer = 18;
  g.samosaTimer = 26;
  g.chaiTimer = 40;
  g.idleTimer = 0;
}

/** A hard hit can knock a cousin's chappal flying; he'll hop after it when he gets up */
export function maybeFlyChappal(this: StreetBrawlEngine, e: EnemyRuntime, dir: number) {
  if (this.practiceMode || e.spec.archetype === 'boss' || e.spec.archetype === 'biker' || e.gag !== 'none' || Math.random() > 0.3) return;
  const g = this.gags;
  let c = g.chappals.find((o) => !o.active && o.ownerUid === -1) ?? g.chappals.find((o) => !o.active);
  if (!c) {
    if (g.chappals.length >= 3) return;
    const mesh = new THREE.Group();
    const sole = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.035, 0.34), new THREE.MeshStandardMaterial({ color: '#92400E', roughness: 0.8 }));
    const strap = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.016, 6, 10, Math.PI), new THREE.MeshStandardMaterial({ color: '#F59E0B' }));
    strap.position.set(0, 0.03, 0.04);
    mesh.add(sole, strap);
    this.scene.add(mesh);
    c = { mesh, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, ownerUid: -1, active: false };
    g.chappals.push(c);
  }
  c.active = true;
  c.ownerUid = e.uid;
  c.x = e.x;
  c.y = 0.3;
  c.z = e.z;
  c.vx = dir * (3 + Math.random() * 2.5);
  c.vy = 6 + Math.random() * 2;
  c.vz = (Math.random() - 0.5) * 2;
  c.mesh.visible = true;
  e.gag = 'chappal';
  e.gagTimer = 9;
  this.spawnComicPopup(e.x, 2.2, e.z, 'CHAPPAL GONE!', '#F59E0B');
}

/** Low on health and nearly alone: some cousins wave a white vest */
export function maybeSurrender(this: StreetBrawlEngine, e: EnemyRuntime) {
  if (this.practiceMode || e.spec.archetype === 'boss' || e.gag !== 'none' || (e.gagUsed & 1) !== 0) return;
  if (e.hp > e.maxHp * 0.3 || this.enemies.filter((o) => o.alive).length > 2) return;
  e.gagUsed |= 1;
  if (Math.random() > 0.4) return;
  e.gag = 'surrender';
  e.gagTimer = 3.2;
  this.spawnComicPopup(e.x, 2.3, e.z, 'I SURRENDER!', '#F8F4EC');
  this.queueLine(0.15, { side: 2, speaker: e.spec.name, text: 'Okay okay! White vest! I give up!' }, 2);
}

/** Called from damageEnemy before the hit is applied */
export function gagOnHit(this: StreetBrawlEngine, e: EnemyRuntime, attacker: boolean) {
  if (e.gag === 'surrender' && attacker) {
    e.gag = 'none';
    this.score += 300;
    this.spawnComicPopup(e.x, 2.5, e.z, 'SHAMEFUL! +300', '#F472B6');
    this.queueLine(0.1, { side: 2, speaker: e.spec.name, text: 'ARRE! I SURRENDERED!' }, 1.8);
  } else if (e.gag === 'argue' || e.gag === 'samosa' || e.gag === 'chai') {
    e.gag = 'none';
  }
}

/** Per-cousin gag behaviour. Returns true when the gag owns this frame (skip normal AI). */
export function stepEnemyGag(this: StreetBrawlEngine, e: EnemyRuntime, dt: number): boolean {
  if (e.gag === 'none') return false;
  e.gagTimer -= dt;
  if (e.gag === 'chappal') {
    const c = this.gags.chappals.find((o) => o.ownerUid === e.uid);
    if (!c || e.gagTimer <= 0) {
      e.gag = 'none';
      return false;
    }
    if (c.y > 0.02) {
      e.action = 'idle';
      return true; // still in the air, he stares at it
    }
    const dx = c.x - e.x;
    const dz = c.z - e.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.5) {
      c.active = false;
      c.mesh.visible = false;
      c.ownerUid = -1;
      e.gag = 'none';
      this.spawnComicPopup(e.x, 2.1, e.z, 'FOUND IT!', '#4ADE80');
      return false;
    }
    // hopping on one foot
    e.facing = dx >= 0 ? 1 : -1;
    e.x += (dx / d) * 1.5 * dt;
    e.z += (dz / d) * 1.2 * dt;
    e.y = Math.abs(Math.sin(this.elapsed * 11)) * 0.18;
    e.action = 'walk';
    return true;
  }
  if (e.gag === 'surrender') {
    e.action = 'taunt'; // hands up, wiggling
    e.actionDuration = 0;
    if (e.gagTimer <= 0) {
      // Not hit? Sneaky attack
      e.gag = 'none';
      this.spawnComicPopup(e.x, 2.3, e.z, 'JUST KIDDING!', '#EF4444');
      e.action = 'windup';
      e.actionTime = 0;
      e.actionDuration = 0.28;
      e.hasHitThisSwing = false;
      const h = this.getActiveHero();
      e.facing = h.x >= e.x ? 1 : -1;
    }
    return true;
  }
  if (e.gag === 'argue') {
    const other = this.enemies.find((o) => o.uid === e.gagOther && o.alive);
    if (!other) {
      e.gag = 'none';
      return false;
    }
    e.facing = other.x >= e.x ? 1 : -1;
    e.action = 'idle';
    if (e.gagTimer <= 0) {
      e.gag = 'none';
      if (e.gagLeader) {
        other.gag = 'none';
        e.action = 'attack';
        e.actionTime = 0;
        e.actionDuration = 0.34;
        e.hasHitThisSwing = true; // the swing is for his cousin, not the hero
        soundEngine.playSlap();
        this.damageEnemy(other, null, 10, false, e.facing * 2.6, 0, 'SLAP!');
        this.queueLine(0.3, { side: 2, speaker: other.spec.name, text: 'Did you just SLAP me?!' }, 1.6);
      }
    }
    return true;
  }
  if (e.gag === 'samosa') {
    const p = this.pickups.find((o) => o.kind === 'snack' && Math.abs(o.x - e.gagX) < 0.1 && Math.abs(o.z - e.gagZ) < 0.1);
    if (!p) {
      e.gag = 'none';
      this.spawnComicPopup(e.x, 2.2, e.z, 'MY SAMOSA!!', '#F87171');
      return false;
    }
    const dx = p.x - e.x;
    const dz = p.z - e.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.6) {
      this.scene.remove(p.mesh);
      this.pickups.splice(this.pickups.indexOf(p), 1);
      e.hp = Math.min(e.maxHp, e.hp + 15);
      e.gag = 'none';
      e.action = 'taunt';
      e.actionTime = 0;
      e.actionDuration = 1.2;
      this.spawnComicPopup(e.x, 2.2, e.z, 'NOM NOM NOM', '#FACC15');
      return true;
    }
    e.facing = dx >= 0 ? 1 : -1;
    e.x += (dx / d) * e.spec.speed * 1.35 * dt;
    e.z += (dz / d) * e.spec.speed * dt;
    e.action = 'walk';
    return true;
  }
  if (e.gag === 'chai') {
    e.action = 'taunt';
    e.actionDuration = 0;
    if (e.gagTimer <= 0) e.gag = 'none';
    return true;
  }
  return false;
}

/** Engine-level timers for the bigger gags, plus flying chappal physics */
export function stepGags(this: StreetBrawlEngine, dt: number) {
  const g = this.gags;
  for (const c of g.chappals) {
    if (!c.active || c.y <= 0) continue;
    c.x += c.vx * dt;
    c.z = THREE.MathUtils.clamp(c.z + c.vz * dt, LANE_MIN_Z, LANE_MAX_Z);
    c.vy -= 16 * dt;
    c.y = Math.max(0, c.y + c.vy * dt);
    c.mesh.position.set(c.x, c.y + 0.02, c.z);
    c.mesh.rotation.x += dt * 14;
    c.mesh.rotation.y += dt * 9;
    if (c.y <= 0) c.mesh.rotation.set(0, c.mesh.rotation.y, 0);
  }
  if (this.phase !== 'FIGHTING' || this.practiceMode) return;
  const bossOut = this.enemies.some((e) => e.alive && e.spec.archetype === 'boss');
  const free = (e: EnemyRuntime) => e.alive && e.gag === 'none' && e.actionDuration <= 0 && e.spec.archetype !== 'boss' && e.spec.archetype !== 'biker';

  // Two cousins argue about who goes first, then one slaps the other
  g.argueTimer -= dt;
  if (g.argueTimer <= 0) {
    g.argueTimer = 25 + Math.random() * 20;
    const list = this.enemies.filter(free);
    outer: for (const a of list) {
      for (const b of list) {
        if (a !== b && Math.abs(a.x - b.x) < 2.4 && Math.abs(a.z - b.z) < 1.6) {
          const [la, lb] = ARGUE[Math.floor(Math.random() * ARGUE.length)];
          a.gag = 'argue';
          b.gag = 'argue';
          a.gagOther = b.uid;
          b.gagOther = a.uid;
          a.gagLeader = true;
          b.gagLeader = false;
          a.gagTimer = 2.4;
          b.gagTimer = 2.6;
          this.queueLine(0, { side: 2, speaker: a.spec.name, text: la }, 1.2);
          this.queueLine(1.2, { side: 2, speaker: b.spec.name, text: lb }, 1.2);
          break outer;
        }
      }
    }
  }

  // A samosa lands on the street; the nearest hungry cousin goes for it (grab it first!)
  g.samosaTimer -= dt;
  if (g.samosaTimer <= 0 && !bossOut) {
    g.samosaTimer = 30 + Math.random() * 20;
    const hungry = this.enemies.filter(free);
    if (hungry.length > 0) {
      const x = this.cameraX + (Math.random() - 0.5) * 6;
      const z = THREE.MathUtils.clamp((Math.random() - 0.5) * 3, LANE_MIN_Z + 0.4, LANE_MAX_Z - 0.4);
      const before = this.pickups.length;
      this.spawnPickupAt('snack', x, z);
      if (this.pickups.length > before) {
        this.spawnComicPopup(x, 1.8, z, 'SAMOSA DROPPED!', '#FACC15');
        const e = hungry.sort((p, q) => Math.hypot(p.x - x, p.z - z) - Math.hypot(q.x - x, q.z - z))[0];
        e.gag = 'samosa';
        e.gagX = x;
        e.gagZ = z;
        e.gagTimer = 8;
        this.queueLine(0.2, { side: 2, speaker: e.spec.name, text: 'SAMOSA?! Hold on, fight later!' }, 1.6);
      }
    }
  }

  // The chai wallah strolls through: everyone stops for chai, heroes sip and heal a little
  g.chaiTimer -= dt;
  if (!g.chai && g.chaiTimer <= 0 && !bossOut) {
    g.chaiTimer = this.dailyMod === 'chai_rush' ? 14 + Math.random() * 6 : 55 + Math.random() * 30;
    const rig = createVillageThugRig(CHAI_WALLAH);
    const kettle = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.22, 12), new THREE.MeshStandardMaterial({ color: '#D1D5DB', metalness: 0.8, roughness: 0.25 }));
    kettle.position.set(0, -0.42, 0.08);
    rig.rightElbow.add(kettle);
    const dir: 1 | -1 = Math.random() < 0.5 ? 1 : -1;
    const x = this.cameraX - dir * 9;
    rig.root.position.set(x, 0, 0.3);
    this.scene.add(rig.root);
    g.chai = { rig, x, z: 0.3, dir, announced: false };
  }
  if (g.chai) {
    const c = g.chai;
    c.x += c.dir * 1.6 * dt;
    c.rig.root.position.set(c.x, 0, c.z);
    applyThugPose(c.rig, 'walk', 0, this.elapsed, c.dir, 0, 0, true, false, c.dir === 1 ? Math.PI * 0.4 : -Math.PI * 0.4);
    if (!c.announced && Math.abs(c.x - this.cameraX) < 5) {
      c.announced = true;
      this.spawnComicPopup(c.x, 2.4, c.z, 'CHAI BREAK!', '#4ADE80');
      this.queueLine(0, { side: 2, speaker: 'Chai Wallah', text: 'Garam chai! Cutting chai! Fight baad mein!' }, 2.4);
    }
    for (const e of this.enemies) {
      if (e.alive && e.spec.archetype !== 'boss' && Math.abs(e.x - c.x) < 3.4 && (e.gag === 'none' || e.gag === 'chai') && e.actionDuration <= 0) {
        e.gag = 'chai';
        e.gagTimer = 0.6;
      }
    }
    for (const h of this.heroes) {
      if (h.hp > 0 && Math.abs(h.x - c.x) < 2.6 && Math.abs(h.z - c.z) < 1.8) h.hp = Math.min(h.maxHp, h.hp + 6 * dt);
    }
    if (Math.abs(c.x - this.cameraX) > 11) {
      this.scene.remove(c.rig.root);
      c.rig.dispose();
      g.chai = null;
    }
  }

  // Idle gags: stand still a while and your fighter gets bored
  const h = this.getActiveHero();
  const still = h.action === 'idle' && Math.abs(h.x - g.idleLastX) < 0.01 && Math.abs(h.z - g.idleLastZ) < 0.01 && g.idleHero === h.index;
  g.idleLastX = h.x;
  g.idleLastZ = h.z;
  g.idleHero = h.index;
  g.idleTimer = still ? g.idleTimer + dt : 0;
  if (g.idleTimer > 6 && this.speechTimer <= 0) {
    g.idleTimer = -8;
    const lines = IDLE_LINES[h.profile.id] ?? ['...hello? Anyone?'];
    this.speechBubble = { side: h.index === 0 ? 1 : 2, speaker: h.profile.name, text: lines[Math.floor(Math.random() * lines.length)] };
    this.speechTimer = 2.6;
  }
}
