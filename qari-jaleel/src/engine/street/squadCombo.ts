// Squad combos (bound onto StreetBrawlEngine): fire when the player tags from one fighter to the other.
import { getCombo } from '../../data/combos';
import { soundEngine } from '../sound';
import type { HeroRuntime } from './types';
import type { StreetBrawlEngine } from '../streetBrawlEngine';

export function triggerSquadCombo(this: StreetBrawlEngine, next: HeroRuntime, prev: HeroRuntime) {
  if (this.comboCooldown > 0) return;
  const combo = getCombo(prev.profile.id, next.profile.id);
  if (!combo) return;
  this.comboCooldown = 6;

  switch (combo.effect) {
    case 'heal':
      for (const h of this.heroes) if (h.hp > 0) h.hp = Math.min(h.maxHp, h.hp + combo.amount);
      break;
    case 'shield':
      next.invulnTimer = Math.max(next.invulnTimer, combo.amount);
      break;
    case 'rage':
      next.rage = Math.min(100, next.rage + combo.amount);
      break;
    case 'shockwave':
      for (const e of this.enemies) {
        if (!e.alive || Math.abs(e.x - next.x) > 4.2 || Math.abs(e.z - next.z) > 2.2) continue;
        this.damageEnemy(e, null, combo.amount, true, Math.sign(e.x - next.x || 1) * 3.2, 3.2);
      }
      this.shakeIntensity = Math.max(this.shakeIntensity, 0.32);
      this.spawnParticles(next.x, 0.8, next.z, 22, 5);
      soundEngine.playGroundSlam();
      break;
    case 'charm':
      for (const e of this.enemies) {
        if (!e.alive || e.spec.archetype === 'boss' || Math.abs(e.x - next.x) > 5.2 || Math.abs(e.z - next.z) > 2.4) continue;
        e.action = 'dizzy';
        e.dizzyTimer = combo.amount;
        e.actionTime = 0;
        e.vx = 0;
      }
      this.spawnParticles(next.x, 1.4, next.z, 14, 2.8);
      break;
  }

  this.spawnComicPopup(next.x, 2.9, next.z, `${combo.name.toUpperCase()}!`, '#F472B6');
  this.switchBanner = `SQUAD COMBO · ${combo.name.toUpperCase()}!`;
  this.speechBubble = { side: this.activeHeroIndex === 0 ? 1 : 2, speaker: next.profile.name, text: combo.line };
  this.speechTimer = 2.6;
}
