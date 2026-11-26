import { soundEngine } from '../sound';
import type { StreetBrawlEngine } from '../streetBrawlEngine';
import { STREET_ZONES } from './data';
import { styleIndex } from './style';

/** Practice Yard: a guided lesson list. Progress comes from the same hooks as challenges (addStyle) plus a few extras. */
export type LessonKind = 'hit' | 'heavyhit' | 'guardbreak' | 'throw' | 'dodge' | 'parry' | 'style' | 'power';

interface Lesson {
  title: string;
  hint: string;
  kind: LessonKind;
  need: number;
  foes: string[];
}

export const LESSONS: Lesson[] = [
  { title: 'Combo', hint: 'Walk up and tap ATTACK quickly to string hits together.', kind: 'hit', need: 4, foes: ['bunty'] },
  { title: 'Heavy & Kick', hint: 'HEAVY and KICK send cousins flying. Land 2 of them.', kind: 'heavyhit', need: 2, foes: ['golu'] },
  { title: 'Guard Break', hint: 'Kalu blocks jabs (GUARD UP!). Break his guard with HEAVY, KICK or a hit from behind.', kind: 'guardbreak', need: 2, foes: ['kalu_goon'] },
  { title: 'Throw', hint: 'Tap GRAB next to a cousin, then GRAB again to throw him.', kind: 'throw', need: 2, foes: ['golu'] },
  { title: 'Perfect Dodge', hint: 'When the red ! appears over a cousin, tap GUARD/DODGE to sidestep.', kind: 'dodge', need: 2, foes: ['bunty', 'chintu'] },
  { title: 'Parry', hint: 'HOLD GUARD just as a swing lands. Timing is everything.', kind: 'parry', need: 1, foes: ['pappu'] },
  { title: 'Style', hint: 'Mix punches, kicks, throws and dodges. Reach style B (repeats earn little).', kind: 'style', need: 1, foes: ['bunty', 'golu'] },
  { title: 'Power Move', hint: 'Your POWER bar is full. Press POWER and enjoy the show!', kind: 'power', need: 1, foes: ['bunty', 'golu', 'tinku'] },
];

export function startPractice(this: StreetBrawlEngine) {
  this.practiceLesson = 0;
  this.practiceHave = 0;
  this.practiceDone = false;
  this.announcement = 'PRACTICE YARD';
  this.subAnnouncement = 'NOBODY GETS HURT. MUCH.';
  setupLesson.call(this);
}

function setupLesson(this: StreetBrawlEngine) {
  this.clearEnemies();
  const l = LESSONS[this.practiceLesson];
  if (!l) return;
  this.practiceHave = 0;
  this.spawnWave(l.foes, STREET_ZONES[0]);
  if (l.kind === 'power') this.getActiveHero().rage = 100;
}

/** Feed progress into the current lesson */
export function practiceProgress(this: StreetBrawlEngine, kind: LessonKind, amount = 1) {
  if (!this.practiceMode || this.practiceDone) return;
  const l = LESSONS[this.practiceLesson];
  if (!l || l.kind !== kind) return;
  this.practiceHave = Math.min(l.need, this.practiceHave + amount);
  if (this.practiceHave >= l.need) {
    soundEngine.playCheerPop();
    const h = this.getActiveHero();
    this.spawnComicPopup(h.x, 2.7, h.z, 'LESSON DONE!', '#4ADE80');
    this.practiceLesson += 1;
    this.practiceNextAt = this.elapsed + 1.4;
    if (this.practiceLesson >= LESSONS.length) {
      this.practiceDone = true;
      this.speechBubble = { side: h.index === 0 ? 1 : 2, speaker: h.profile.name, text: "Practice done. The mohalla isn't ready for me." };
      this.speechTimer = 3;
    }
  }
}

export function stepPractice(this: StreetBrawlEngine) {
  if (!this.practiceMode) return;
  // Nobody really gets hurt here
  for (const h of this.heroes) if (h.hp > 0 && h.hp < h.maxHp * 0.4) h.hp = h.maxHp;
  if (this.practiceDone) return;
  if (this.practiceNextAt > 0 && this.elapsed >= this.practiceNextAt) {
    this.practiceNextAt = 0;
    setupLesson.call(this);
    return;
  }
  const l = LESSONS[this.practiceLesson];
  if (!l) return;
  if (l.kind === 'style' && styleIndex(this.styleMeter) >= 2) practiceProgress.call(this, 'style');
  if (l.kind === 'power' && String(this.getActiveHero().action).startsWith('powerup')) practiceProgress.call(this, 'power');
  // Everyone knocked out before the lesson is done: send in fresh cousins
  if (this.practiceNextAt === 0 && !this.enemies.some((e) => e.alive)) {
    this.spawnWave(l.foes, STREET_ZONES[0]);
    if (l.kind === 'power') this.getActiveHero().rage = 100;
  }
}

export function practiceHud(this: StreetBrawlEngine) {
  if (!this.practiceMode) return null;
  if (this.practiceDone) return { step: LESSONS.length, total: LESSONS.length, title: 'All done!', hint: "You're ready for the mohalla, bhai. Pause to quit.", have: 1, need: 1 };
  const i = Math.min(this.practiceLesson, LESSONS.length - 1);
  const l = LESSONS[i];
  return { step: i + 1, total: LESSONS.length, title: l.title, hint: l.hint, have: this.practiceHave, need: l.need };
}
