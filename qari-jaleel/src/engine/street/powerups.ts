// Street brawl engine: powerups methods (bound onto StreetBrawlEngine).
import { CombatAction } from '../../types/game';
import { soundEngine } from '../sound';
import { musicEngine } from '../music';
import { HeroRuntime } from './types';
import type { StreetBrawlEngine } from '../streetBrawlEngine';

export function startHeroPowerup(this: StreetBrawlEngine, hero: HeroRuntime) {
  musicEngine.duck(1.3);
  hero.rage = 0;
  hero.invulnTimer = 2.6;
  hero.actionTime = 0;
  hero.powerupOriginX = hero.x;
  hero.powerupOriginZ = hero.z;
  hero.powerupHitsMask = 0;

  const nearest = this.findNearestLivingEnemy(hero.x, hero.z);
  hero.powerupTargetId = nearest ? nearest.uid : null;
  if (nearest) {
    hero.facing = nearest.x >= hero.x ? 1 : -1;
  }

  this.rageFlashSide = hero.index === 0 ? 1 : 2;
  this.rageFlashTimer = 0.7;
  soundEngine.playRageActivate();

  switch (hero.powerupKind) {
    case 'fady_smoke':
      hero.action = 'powerup_fady';
      hero.actionDuration = 6.2;
      hero.invulnTimer = 6.4;
      hero.callout = "I'LL BE 2 MINS BRO!";
      this.speechBubble = {
        side: hero.index === 0 ? 1 : 2,
        speaker: hero.profile.name,
        text: 'Two mins bro.',
      };
      this.speechTimer = 1.5;
      this.comedyTimer = null;
      break;
    case 'saf_hug':
      hero.action = 'powerup_saf';
      hero.actionDuration = 6.4;
      hero.invulnTimer = 6.6;
      hero.callout = 'GYM BRO HUG!';
      this.hugVictimUid = null;
      this.hugSquash = 0;
      this.speechBubble = {
        side: hero.index === 0 ? 1 : 2,
        speaker: hero.profile.name,
        text: 'Bro. Watch this.',
      };
      this.speechTimer = 1.0;
      break;
    case 'jav_story':
      hero.action = 'powerup_jav';
      hero.actionDuration = 6.8;
      hero.invulnTimer = 7.0;
      hero.callout = 'NAP TIME KNOCKOUT!';
      this.speechBubble = {
        side: hero.index === 0 ? 1 : 2,
        speaker: hero.profile.name,
        text: 'Ughhh... I was napping.',
      };
      this.speechTimer = 1.4;
      break;
    case 'jam_snooker':
      hero.action = 'powerup_jam';
      hero.actionDuration = 7.0;
      hero.invulnTimer = 7.2;
      hero.callout = 'CHALK MY TIP, BOYS!';
      this.speechBubble = {
        side: hero.index === 0 ? 1 : 2,
        speaker: hero.profile.name,
        text: 'Let me just chalk my tip real quick.',
      };
      this.speechTimer = 1.5;
      break;
    case 'chet_ford':
      hero.action = 'powerup_chet';
      hero.actionDuration = 2.45;
      hero.callout = 'RED FORD RUNOVER!';
      soundEngine.playCarHorn();
      break;
    case 'immy_girls':
      hero.action = 'powerup_immy';
      hero.actionDuration = 2.85;
      hero.callout = 'SQUAD FAN CLUB RUSH!';
      soundEngine.playCheerPop();
      break;
    default:
      hero.action = 'rage_art';
      hero.actionDuration = 1.4;
      hero.callout = hero.profile.specialMoveName.toUpperCase();
      break;
  }
  hero.calloutSeq++;
}

export function stepHeroPowerup(this: StreetBrawlEngine, hero: HeroRuntime, dt: number) {
  hero.actionTime += dt;
  const phase = Math.min(1, hero.actionTime / Math.max(0.01, hero.actionDuration));

  const target =
    this.enemies.find((e) => e.uid === hero.powerupTargetId && e.alive) ??
    this.findNearestLivingEnemy(hero.x, hero.z);

  const tx = target ? target.x : hero.x + hero.facing * 2.8;
  const tz = target ? target.z : hero.z;

  if (hero.powerupKind === 'fady_smoke') {
    this.powerupDirector.updateFadySmoke(
      phase,
      hero.x,
      hero.z,
      hero.facing,
      hero.powerupOriginX,
      hero.powerupOriginZ,
      this.elapsed,
      tx,
      tz
    );
    const side = hero.index === 0 ? 1 : 2;
    const otherSide = side === 1 ? 2 : 1;
    // Comic countdown: races down from 2:00, stalls on 0:01, then he adds ten more minutes
    if (phase >= 0.1 && phase < 0.8) {
      const t = Math.min(1, (phase - 0.1) / 0.56);
      const fmt = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
      if (t < 0.5) this.comedyTimer = fmt(Math.max(3, Math.round(120 - 117 * (t / 0.5))));
      else if (t < 0.62) this.comedyTimer = '0:03';
      else if (t < 0.72) this.comedyTimer = '0:02';
      else if (t < 0.88) this.comedyTimer = '0:01';
      else this.comedyTimer = '+10:00';
    } else {
      this.comedyTimer = null;
    }
    if (phase > 0.12 && (hero.powerupHitsMask & 1) === 0) {
      hero.powerupHitsMask |= 1;
      soundEngine.playSmokePuff();
    }
    if (phase > 0.3 && (hero.powerupHitsMask & 4) === 0) {
      hero.powerupHitsMask |= 4;
      this.speechBubble = { side: otherSide, speaker: 'Cousin', text: "Bhai it's been 20 minutes!" };
      this.speechTimer = 1.6;
    }
    if (phase > 0.5 && (hero.powerupHitsMask & 8) === 0) {
      hero.powerupHitsMask |= 8;
      this.speechBubble = { side, speaker: hero.profile.name, text: 'Nearly there bro. Two more mins.' };
      this.speechTimer = 1.6;
    }
    if (phase > 0.7 && (hero.powerupHitsMask & 16) === 0) {
      hero.powerupHitsMask |= 16;
      this.speechBubble = { side, speaker: hero.profile.name, text: 'Right. Where were we?' };
      this.speechTimer = 1.1;
    }
    if (phase > 0.86 && (hero.powerupHitsMask & 2) === 0) {
      hero.powerupHitsMask |= 2;
      this.spawnParticles(tx, 0.8, tz, 26, 5);
      this.dealPowerupAoeDamage(hero, tx, tz, 4.4, 60, true, 'KHALLAS!');
    }
  } else if (hero.powerupKind === 'saf_hug') {
    const side = hero.index === 0 ? 1 : 2;
    const otherSide = side === 1 ? 2 : 1;
    const say = (s: 1 | 2, speaker: string, text: string, secs: number) => {
      this.speechBubble = { side: s, speaker, text };
      this.speechTimer = secs;
    };
    const once = (bit: number, at: number, fn: () => void) => {
      if (phase > at && (hero.powerupHitsMask & bit) === 0) {
        hero.powerupHitsMask |= bit;
        fn();
      }
    };
    // Flex show: poses, sparkles, cousin heckling, shirt rips off
    once(2, 0.11, () => {
      soundEngine.playCheerPop();
      this.spawnParticles(hero.x, 1.2, hero.z, 22, 4);
      this.spawnComicPopup(hero.x, 2.15, hero.z, 'SHIRT: GONE!', '#F59E0B');
      say(otherSide, 'Cousin', 'BHAI PUT YOUR SHIRT ON!!', 1.5);
    });
    once(1, 0.16, () => {
      soundEngine.playCheerPop();
      this.spawnComicPopup(hero.x, 2.15, hero.z, 'SIX PACK!', '#FDE047');
    });
    once(32, 0.25, () => say(otherSide, 'Cousin', 'Bro, where did the belly go?', 1.5));
    once(4, 0.34, () => say(side, hero.profile.name, 'Come give me a hug bro.', 1.4));
    once(8, 0.42, () => this.spawnComicPopup(hero.x, 2.15, hero.z, 'HUG TIME!', '#F472B6'));
    once(512, 0.47, () => say(side, hero.profile.name, "WHERE'S CHETZY BABY?!", 1.7));
    // Charge in, closing the gap exactly by the time the hug starts
    if (target && phase >= 0.46 && phase < 0.6) {
      const k = Math.min(1, dt / Math.max(0.05, (0.6 - phase) * hero.actionDuration));
      hero.x += (target.x - hero.facing * 0.62 - hero.x) * k;
      hero.z += (target.z - hero.z) * k;
    }
    // The grab: victim is lifted into Saf's arms and squeezed like a squeaky toy
    if (target && phase >= 0.6 && phase < 0.9) {
      this.hugVictimUid = target.uid;
      const u = (phase - 0.6) / 0.3;
      this.hugSquash = Math.abs(Math.sin(u * Math.PI * 3));
      this.hugPos.x = hero.x + hero.facing * 0.6;
      this.hugPos.z = hero.z;
      this.hugPos.y = 0.3 + this.hugSquash * 0.08;
      target.x = this.hugPos.x;
      target.z = this.hugPos.z;
      target.y = this.hugPos.y;
      target.vx = 0;
      target.vz = 0;
      target.vy = 0;
      target.facing = (-hero.facing) as 1 | -1;
    } else {
      this.hugVictimUid = null;
      this.hugSquash = 0;
    }
    once(16, 0.65, () => {
      soundEngine.playSqueak(1.0);
      this.dealPowerupAoeDamage(hero, tx, tz, 1.8, 10, false, 'SQUEAK!');
    });
    once(1024, 0.73, () => say(otherSide, 'Cousin', "Bhai he's not a toy!", 1.3));
    once(64, 0.75, () => {
      soundEngine.playSqueak(1.25);
      this.dealPowerupAoeDamage(hero, tx, tz, 1.8, 10, false, 'SQUEAK!!');
    });
    once(128, 0.85, () => {
      soundEngine.playSqueak(1.55);
      this.dealPowerupAoeDamage(hero, tx, tz, 1.8, 14, false, 'SQUEEEAK!!!');
    });
    once(256, 0.9, () => {
      soundEngine.playSqueeze();
      this.dealPowerupAoeDamage(hero, tx, tz, 3.6, 34, true, 'DHISHUM!');
      say(side, hero.profile.name, '...sorry bro. Love you though.', 1.6);
    });
  } else if (hero.powerupKind === 'jav_story') {
    const side = hero.index === 0 ? 1 : 2;
    const otherSide = side === 1 ? 2 : 1;
    const say = (s: 1 | 2, speaker: string, text: string, secs: number) => {
      this.speechBubble = { side: s, speaker, text };
      this.speechTimer = secs;
    };
    const once = (bit: number, at: number, fn: () => void) => {
      if (phase > at && (hero.powerupHitsMask & bit) === 0) {
        hero.powerupHitsMask |= bit;
        fn();
      }
    };
    const name = hero.profile.name;
    // Zzz floats up while he dozes
    if (phase > 0.12 && phase < 0.46 && Math.floor(phase * 40) % 5 === 0 && (hero.powerupHitsMask & 4096) === 0) {
      hero.powerupHitsMask |= 4096;
      this.spawnComicPopup(hero.x + hero.facing * 0.4, 2.6, hero.z, 'Zzz...', '#93C5FD');
    }
    if (Math.floor(phase * 40) % 5 !== 0) hero.powerupHitsMask &= ~4096;
    once(1, 0.08, () => this.spawnComicPopup(hero.x, 2.5, hero.z, 'YAAAWN!', '#FDE047'));
    once(2, 0.15, () => say(otherSide, 'Cousin', 'Bhai... look how BIG he is.', 1.7));
    once(4, 0.25, () => say(otherSide, 'Cousin 2', 'His arm is bigger than my whole body!', 1.8));
    once(8, 0.34, () => say(side, name, 'Five more minutes, bro.', 1.4));
    once(16, 0.4, () => say(otherSide, 'Cousin', 'Should we... wake him up?', 1.4));
    once(32, 0.47, () => {
      this.shakeIntensity = Math.max(this.shakeIntensity, 0.2);
      say(side, name, 'Fine. One punch.', 1.4);
    });
    once(64, 0.54, () => {
      this.shakeIntensity = Math.max(this.shakeIntensity, 0.3);
      this.spawnParticles(hero.x, 0.2, hero.z, 18, 3.4);
    });
    once(128, 0.67, () => {
      soundEngine.playSlap();
      this.shakeIntensity = Math.max(this.shakeIntensity, 0.55);
      this.hitstopTimer = Math.max(this.hitstopTimer, 0.14);
      this.spawnParticles(tx, 1.0, tz, 40, 7);
      this.dealPowerupAoeDamage(hero, tx, tz, 6.5, 90, true, 'LAZY PUNCH!');
    });
    once(256, 0.76, () => say(otherSide, 'Cousin', '...He did that while yawning.', 1.8));
    once(512, 0.86, () => say(side, name, 'Wake me when it is lunch.', 1.6));
    once(1024, 0.92, () => this.spawnComicPopup(hero.x + hero.facing * 0.4, 2.6, hero.z, 'Zzz...', '#93C5FD'));
  } else if (hero.powerupKind === 'jam_snooker') {
    this.powerupDirector.updateJamSnooker(phase, hero.x, hero.y, hero.z, hero.facing);
    const side = hero.index === 0 ? 1 : 2;
    const otherSide = side === 1 ? 2 : 1;
    const say = (s: 1 | 2, speaker: string, text: string, secs: number) => {
      this.speechBubble = { side: s, speaker, text };
      this.speechTimer = secs;
    };
    const once = (bit: number, at: number, fn: () => void) => {
      if (phase > at && (hero.powerupHitsMask & bit) === 0) {
        hero.powerupHitsMask |= bit;
        fn();
      }
    };
    const name = hero.profile.name;
    const front = hero.x + hero.facing * 1.5;
    once(1, 0.05, () => {
      this.spawnParticles(hero.x + hero.facing * 0.5, 1.5, hero.z, 14, 2.2);
      this.spawnComicPopup(hero.x, 2.2, hero.z, 'CHALK!', '#38BDF8');
    });
    once(2, 0.13, () => say(otherSide, 'Cousin', "Bro, you've been chalking that for five minutes.", 1.8));
    once(4, 0.24, () => say(side, name, "Size isn't everything. It's all about technique.", 1.9));
    once(8, 0.34, () => say(otherSide, 'Cousin', 'Nobody asked, bhai!', 1.4));
    once(16, 0.5, () => {
      soundEngine.playBilliardClack();
      this.spawnParticles(front, 0.8, hero.z, 24, 5);
      this.dealPowerupAoeDamage(hero, front, hero.z, 4.0, 24, false, 'BREAK!');
      say(side, name, 'Look at the balls on this guy!', 1.6);
    });
    once(32, 0.6, () => {
      soundEngine.playWoodWhack();
      this.dealPowerupAoeDamage(hero, front, hero.z, 3.8, 14, false, 'POTTED THE PINK!');
      say(side, name, 'Potting the pink!', 1.0);
    });
    once(64, 0.665, () => {
      soundEngine.playWoodWhack();
      this.dealPowerupAoeDamage(hero, front, hero.z, 3.8, 14, false, 'AND THE BLACK!');
      say(side, name, 'Nice and deep in the middle pocket.', 1.3);
    });
    once(128, 0.73, () => {
      soundEngine.playWoodWhack();
      this.dealPowerupAoeDamage(hero, front, hero.z, 3.8, 14, false, 'LONG SHOT!');
    });
    once(256, 0.82, () => {
      soundEngine.playWoodWhack();
      this.dealPowerupAoeDamage(hero, front, hero.z, 4.4, 34, true, 'DHISHUM!');
      say(side, name, 'Straight in the corner pocket. Every time.', 1.8);
    });
    once(512, 0.9, () => say(otherSide, 'Cousin', "Bhai, that's enough innuendo for one match.", 1.7));
    once(1024, 0.96, () => say(side, name, 'you know what bro just drop me off home', 1.4));
  } else if (hero.powerupKind === 'chet_ford') {
    const car = this.powerupDirector.updateChetFord(phase, hero.powerupOriginX, tz, hero.facing);
    if (car.carActive) {
      for (let i = 0; i < this.enemies.length; i++) {
        const e = this.enemies[i];
        if (!e.alive) continue;
        const bit = 1 << (i % 24);
        if ((hero.powerupHitsMask & bit) === 0 && Math.abs(e.x - car.carX) < 1.95) {
          hero.powerupHitsMask |= bit;
          soundEngine.playCarCrash();
          this.damageEnemy(e, hero, 66, true, hero.facing * 3.5, 5.2, 'HONK HONK!');
        }
      }
    }
  } else if (hero.powerupKind === 'immy_girls') {
    this.powerupDirector.updateImmyGirls(phase, hero.x, hero.z, tx, tz, hero.facing, this.elapsed);
    if (phase > 0.65 && (hero.powerupHitsMask & 1) === 0) {
      hero.powerupHitsMask |= 1;
      this.dealPowerupAoeDamage(hero, tx, tz, 4.5, 32, false, 'OYE!');
    }
    if (phase > 0.8 && (hero.powerupHitsMask & 2) === 0) {
      hero.powerupHitsMask |= 2;
      this.dealPowerupAoeDamage(hero, tx, tz, 4.8, 38, true, 'DHISHUM!');
    }
  } else {
    if (phase > 0.42 && (hero.powerupHitsMask & 1) === 0) {
      hero.powerupHitsMask |= 1;
      this.dealPowerupAoeDamage(hero, hero.x + hero.facing * 1.5, hero.z, 4.8, 62, true, 'KHALLAS!');
    }
  }

  if (hero.actionTime >= hero.actionDuration) {
    hero.action = 'idle';
    hero.actionTime = 0;
    hero.actionDuration = 0;
    this.powerupDirector.hideAll();
    this.hugVictimUid = null;
    this.hugSquash = 0;
  }
}

export function dealPowerupAoeDamage(this: StreetBrawlEngine,
  hero: HeroRuntime,
  cx: number,
  cz: number,
  radius: number,
  dmg: number,
  launch: boolean,
  popupText: string
) {
  this.shakeIntensity = Math.max(this.shakeIntensity, 0.36);
  this.spawnParticles(cx, 1.15, cz, 22, 5.2);
  this.spawnComicPopup(cx, 1.95, cz, popupText, '#F59E0B');
  for (let i = 0; i < this.enemies.length; i++) {
    const e = this.enemies[i];
    if (!e.alive) continue;
    const dist = Math.hypot(e.x - cx, (e.z - cz) * 1.2);
    if (dist <= radius) {
      const dir = e.x >= hero.x ? 1 : -1;
      this.damageEnemy(e, hero, dmg, launch, dir * (launch ? 2.8 : 1.0), launch ? 4.8 : 0);
    }
  }
}

export function isPowerupAction(this: StreetBrawlEngine, a: CombatAction): boolean {
  return (
    a === 'rage_art' ||
    a === 'powerup_fady' ||
    a === 'powerup_saf' ||
    a === 'powerup_jav' ||
    a === 'powerup_jam' ||
    a === 'powerup_chet' ||
    a === 'powerup_immy'
  );
}
