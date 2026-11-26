import type { SpeechBubbleState } from '../../types/game';
import { JAV_GAALIS } from '../../data/jokes';
import type { StreetBrawlEngine } from '../streetBrawlEngine';
import type { EnemyRuntime } from './types';

/** Boss fights: intro skit replies, warnings with tips, mid-fight banter, slow-mo finish lines. */

const HERO_REPLY: Record<string, string[]> = {
  qari_jaleel: ['I must object to your entire existence, sir.', 'Charmed, I am sure. Now, kindly fall over.'],
  rebel_aviator: ['Bro, come here. Let me hug the anger out of you.', 'Big words. Bigger hug coming.'],
  rebel_tactician: ['Oye khotey, I was napping!', 'Chal dafa ho, ullu da pattha!'],
  rebel_enforcer: ['Can we do this quick? I need a lift home after.', 'You and me, then you drop me home. Deal?'],
  rebel_striker: ['Your stock is about to crash, uncle.', 'I am shorting you. Hard.'],
  rebel_shadow: ['Easy, handsome. Second-most handsome here.', 'The aunties are watching. Let me look good.'],
};

const BANTER: Record<string, { at75: string; at25: string; down: string }> = {
  chappal_chaudhary: {
    at75: 'Lucky hit! I have forty more chappals!',
    at25: 'Wait... who stole my left chappal?!',
    down: 'My chappals... give them to my uncle...',
  },
  dhol_daku: {
    at75: 'You cannot stop the BEAT!',
    at25: 'Okay the beat is... slowing down... a little.',
    down: 'Dhak... dhak... dhum.',
  },
  bade_tau: {
    at75: 'Back in my day, we hit HARDER than that!',
    at25: 'Ruko! Let me call your Tau ji first!',
    down: 'Fine. FINE. Tell the panchayat I let you win.',
  },
};

const BOSS_TIPS: Record<string, string> = {
  volley: 'JAB or GUARD to send slippers back!',
  summon: 'Reinforcements! Watch your back!',
  charge: 'Step out of his lane! DODGE!',
  stomp: 'JUMP the shockwave!',
};

export function bossKey(e: EnemyRuntime): string {
  return e.spec.id.replace(/_\d+$/, '');
}

/** Queue a bubble to appear after `delay` seconds */
export function queueLine(this: StreetBrawlEngine, delay: number, bubble: SpeechBubbleState, secs = 2.2) {
  this.speechQueue.push({ at: this.elapsed + delay, bubble, secs });
}

export function stepSpeechQueue(this: StreetBrawlEngine) {
  for (let i = this.speechQueue.length - 1; i >= 0; i--) {
    const q = this.speechQueue[i];
    if (this.elapsed >= q.at) {
      this.speechBubble = q.bubble;
      this.speechTimer = q.secs;
      this.speechQueue.splice(i, 1);
    }
  }
}

/** Boss arrives: after his battle cry, the active hero answers back */
export function bossIntroReply(this: StreetBrawlEngine) {
  const h = this.getActiveHero();
  const lines = HERO_REPLY[h.profile.id] ?? ['Bring it on, uncle!'];
  let text = lines[Math.floor(Math.random() * lines.length)];
  if (h.profile.id === 'rebel_tactician' && Math.random() < 0.5) text += ' ' + JAV_GAALIS[Math.floor(Math.random() * JAV_GAALIS.length)];
  this.queueLine(2.4, { side: h.index === 0 ? 1 : 2, speaker: h.profile.name, text }, 2.4);
}

/** Big readable warning (with a tip) as a boss winds up a special */
export function bossWarning(this: StreetBrawlEngine, move: string) {
  this.bossWarn = BOSS_TIPS[move] ?? null;
  this.bossWarnTimer = 1.6;
}

/** Banter at 75% and 25% HP */
export function bossBanter(this: StreetBrawlEngine, e: EnemyRuntime) {
  const b = BANTER[bossKey(e)];
  if (!b) return;
  const pct = e.hp / e.maxHp;
  if (pct <= 0.75 && (e.banter & 1) === 0) {
    e.banter |= 1;
    this.queueLine(0.3, { side: 2, speaker: e.spec.name, text: b.at75 }, 2.2);
  }
  if (pct <= 0.25 && (e.banter & 2) === 0) {
    e.banter |= 2;
    this.queueLine(0.3, { side: 2, speaker: e.spec.name, text: b.at25 }, 2.4);
  }
}

/** Boss knocked out: long slow-mo, a last line and a big pop-up */
export function bossFinish(this: StreetBrawlEngine, e: EnemyRuntime) {
  this.slowMoTimer = 1.4;
  this.slowMoFocusX = e.x;
  this.slowMoFocusZ = e.z;
  this.shakeIntensity = Math.max(this.shakeIntensity, 0.45);
  this.spawnComicPopup(e.x, 2.9, e.z, 'BOSS DEFEATED!', '#FDE047');
  const b = BANTER[bossKey(e)];
  if (b) {
    this.speechBubble = { side: 2, speaker: e.spec.name, text: b.down };
    this.speechTimer = 2.6;
  }
  this.bossWarn = null;
}
