// Endless Mohalla extras (bound onto StreetBrawlEngine): pickups, taunts, hero quips, no-hit streak, screamers.
import { getMods } from '../../utils/upgrades';
import * as THREE from 'three';
import { soundEngine } from '../sound';
import { COUSIN_TAUNTS, CROWD_SCREAMS, FIGHTER_LINES, IMMY_CHATUP, JAV_GAALIS, nickOf, PARTNER_LINES, HERO_QUIPS, pick, SPECIFIC_TAUNTS } from '../../data/jokes';
import type { EnemyRuntime } from './types';
import type { StreetBrawlEngine } from '../streetBrawlEngine';

export type PickupKind = 'chai' | 'snack';
export interface Pickup {
  kind: PickupKind;
  x: number;
  z: number;
  life: number;
  mesh: THREE.Group;
}

const chaiGeo = new THREE.CylinderGeometry(0.17, 0.12, 0.26, 12);
const handleGeo = new THREE.TorusGeometry(0.09, 0.025, 6, 12);
const snackGeo = new THREE.ConeGeometry(0.22, 0.3, 3);
const ringGeo = new THREE.RingGeometry(0.3, 0.4, 20);
const chaiMat = new THREE.MeshStandardMaterial({ color: '#C2410C', emissive: '#7C2D12', emissiveIntensity: 0.6 });
const snackMat = new THREE.MeshStandardMaterial({ color: '#D97706', emissive: '#92400E', emissiveIntensity: 0.6 });
const glowChai = new THREE.MeshBasicMaterial({ color: '#4ADE80', transparent: true, opacity: 0.7, side: THREE.DoubleSide });
const glowSnack = new THREE.MeshBasicMaterial({ color: '#FACC15', transparent: true, opacity: 0.7, side: THREE.DoubleSide });

/** Speak a hero one-liner if nothing else is being said */
export function sayQuip(this: StreetBrawlEngine, kind: keyof typeof HERO_QUIPS, chance = 1) {
  if (this.speechTimer > 0 || Math.random() > chance) return;
  const hero = this.getActiveHero();
  let text = pick(HERO_QUIPS[kind]);
  if (hero.profile.id === 'rebel_tactician') text = `${text} ${pick(JAV_GAALIS)}`;
  this.speechBubble = { side: this.activeHeroIndex === 0 ? 1 : 2, speaker: hero.profile.name, text };
  this.speechTimer = 2.2;
}

export function maybeDropPickup(this: StreetBrawlEngine, e: EnemyRuntime) {
  const hp = this.heroes[0].hp + this.heroes[1].hp;
  const lowHp = hp < (this.heroes[0].maxHp + this.heroes[1].maxHp) * 0.45;
  let kind: PickupKind | null = null;
  if (e.spec.trait === 'thief') kind = 'snack';
  else if (Math.random() < (lowHp ? 0.3 : 0.12) + getMods(this.endlessMode).dropBonus) kind = 'chai';
  else if (Math.random() < 0.1 + getMods(this.endlessMode).dropBonus) kind = 'snack';
  if (!kind || this.pickups.length >= 3) return;
  const mesh = new THREE.Group();
  const body = new THREE.Mesh(kind === 'chai' ? chaiGeo : snackGeo, kind === 'chai' ? chaiMat : snackMat);
  body.position.y = 0.55;
  mesh.add(body);
  if (kind === 'chai') {
    const h = new THREE.Mesh(handleGeo, chaiMat);
    h.position.set(0.17, 0.56, 0);
    mesh.add(h);
  }
  const ring = new THREE.Mesh(ringGeo, kind === 'chai' ? glowChai : glowSnack);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.03;
  mesh.add(ring);
  mesh.position.set(e.x, 0, e.z);
  this.scene.add(mesh);
  this.pickups.push({ kind, x: e.x, z: e.z, life: 11, mesh });
}

export function clearPickups(this: StreetBrawlEngine) {
  for (const p of this.pickups) this.scene.remove(p.mesh);
  this.pickups = [];
}

export function updateEndlessExtras(this: StreetBrawlEngine, dt: number) {
  // Pickups: bob, expire, collect
  for (let i = this.pickups.length - 1; i >= 0; i--) {
    const p = this.pickups[i];
    p.life -= dt;
    p.mesh.rotation.y += dt * 2.2;
    p.mesh.position.y = Math.sin(this.elapsed * 4 + i) * 0.06;
    p.mesh.visible = p.life > 3 || Math.floor(p.life * 6) % 2 === 0;
    let taken = false;
    for (let h = 0; h < 2 && !taken; h++) {
      const hero = this.heroes[h];
      if (hero.hp <= 0 || Math.abs(hero.x - p.x) > 0.95 || Math.abs(hero.z - p.z) > 0.85) continue;
      taken = true;
      this.pickupsTaken += 1;
      if (p.kind === 'chai') {
        this.heroes.forEach((o) => {
          if (o.hp > 0) o.hp = Math.min(o.maxHp, o.hp + (o === hero ? 18 : 9));
        });
        this.spawnComicPopup(hero.x, 2.2, hero.z, 'CHAI! +HP', '#4ADE80');
        this.sayQuip('chai', 0.6);
      } else {
        hero.rage = Math.min(100, hero.rage + 24);
        this.spawnComicPopup(hero.x, 2.2, hero.z, 'SAMOSA! +POWER', '#FACC15');
        this.sayQuip('snack', 0.6);
      }
      soundEngine.playTagSwitch();
    }
    if (taken || p.life <= 0) {
      this.scene.remove(p.mesh);
      this.pickups.splice(i, 1);
    }
  }

  // Background crowd run: they scream, Immy chats them up
  if (this.stage.crowdRun.startedSeq !== this.crowdSeqSeen) {
    this.crowdSeqSeen = this.stage.crowdRun.startedSeq;
    this.crowdTimer = 2.4;
  }
  if (this.crowdTimer > 0) {
    this.crowdTimer -= dt;
    if (this.crowdTimer <= 0) {
      this.spawnComicPopup(this.stage.crowdRun.x, 2.2, -4.2, pick(CROWD_SCREAMS), '#F472B6');
      this.crowdScreams = 2;
      this.crowdScreamGap = 1.1;
      if (this.speechTimer <= 0) {
        this.speechBubble = { side: 2, speaker: "Ustad 'Immy' Mirza", text: pick(IMMY_CHATUP) };
        this.speechTimer = 3.4;
      }
    }
  }
  if (this.crowdScreams > 0 && this.crowdTimer <= 0) {
    this.crowdScreamGap -= dt;
    if (this.crowdScreamGap <= 0 && this.stage.crowdRun.active) {
      this.crowdScreams--;
      this.crowdScreamGap = 1.3;
      this.spawnComicPopup(this.stage.crowdRun.x, 2.2, -4.2, pick(CROWD_SCREAMS), '#F472B6');
    }
  }

  // Each fighter's own random banter, in every mode
  if (this.phase === 'FIGHTING') {
    this.chatTimer -= dt;
    if (this.chatTimer <= 0) {
      const hero = this.getActiveHero();
      // Jav cannot keep his mouth shut
      this.chatTimer = hero.profile.id === 'rebel_tactician' ? 4 + Math.random() * 3 : 9 + Math.random() * 7;
      const partner = this.getPartnerHero();
      const partnerLines = PARTNER_LINES[hero.profile.id];
      const lines = FIGHTER_LINES[hero.profile.id];
      if (lines && hero.hp > 0 && this.speechTimer <= 0 && !String(hero.action).startsWith('powerup')) {
        const aboutPartner = partnerLines && partner.hp > 0 && Math.random() < 0.28;
        const text = aboutPartner ? pick(partnerLines).replace('{p}', nickOf(partner.profile.name)) : pick(lines);
        this.speechBubble = { side: this.activeHeroIndex === 0 ? 1 : 2, speaker: hero.profile.name, text };
        this.speechTimer = 3.2;
      }
    }
  }

  this.comboCooldown = Math.max(0, this.comboCooldown - dt);

  if (!this.endlessMode || this.phase !== 'FIGHTING') return;

  // No-hit streak multiplier: every 12 hit-free seconds adds x0.25 (max x2)
  this.noHitSec += dt;
  const tier = Math.min(4, Math.floor(this.noHitSec / 12));
  if (tier > this.streakTier) {
    this.spawnComicPopup(this.getActiveHero().x, 2.9, this.getActiveHero().z, `STREAK x${(1 + tier * 0.25).toFixed(2)}`, '#38BDF8');
    this.sayQuip('streak', 0.5);
  }
  this.streakTier = tier;
  this.scoreMult = 1 + tier * 0.25;

  // Low-HP quip
  const lead = this.getActiveHero();
  if (lead.hp < lead.maxHp * 0.25 && this.quipCooldown <= 0) {
    this.sayQuip('lowhp', 0.5);
    this.quipCooldown = 14;
  }
  this.quipCooldown -= dt;

  // Screamers boost every other cousin now and then
  for (const e of this.enemies) {
    if (!e.alive || e.spec.trait !== 'screamer') continue;
    e.specialCooldown -= dt;
    if (e.specialCooldown > 0 || e.action === 'hitstun' || e.action === 'knockdown') continue;
    e.specialCooldown = 9;
    e.action = 'taunt';
    e.actionTime = 0;
    e.actionDuration = 0.8;
    this.spawnComicPopup(e.x, 2.4, e.z, 'RAGE SCREAM!', '#F97316');
    this.spawnParticles(e.x, 1.4, e.z, 16, 4.2);
    this.shakeIntensity = Math.max(this.shakeIntensity, 0.2);
    let buffed = 0;
    for (const o of this.enemies) {
      if (!o.alive || o.uid === e.uid || this.buffedUids.has(o.uid)) continue;
      this.buffedUids.add(o.uid);
      o.spec.damage = Math.round(o.spec.damage * 1.22);
      o.spec.speed *= 1.12;
      buffed++;
    }
    if (buffed > 0 && this.speechTimer <= 0) {
      this.speechBubble = { side: 2, speaker: e.spec.name, text: 'LOUDER! HIT HARDER, BHAIYAS!' };
      this.speechTimer = 2;
    }
  }

  // Cousin trash talk and jokes
  this.tauntTimer -= dt;
  if (this.tauntTimer <= 0) {
    this.tauntTimer = 8 + Math.random() * 6;
    const alive = this.enemies.filter((o) => o.alive && o.spec.archetype !== 'boss');
    if (alive.length > 0 && this.speechTimer <= 0) {
      const e = alive[Math.floor(Math.random() * alive.length)];
      const key = e.spec.id.replace(/_\d+$/, '');
      const lines = SPECIFIC_TAUNTS[key];
      const text = lines && Math.random() < 0.55 ? pick(lines) : pick(COUSIN_TAUNTS);
      this.speechBubble = { side: 2, speaker: e.spec.name, text };
      this.speechTimer = 2.6;
    }
  }
}
