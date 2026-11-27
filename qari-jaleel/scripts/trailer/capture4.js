// Frame-by-frame trailer capture: freezes the game clock and advances it exactly 1/30 s per frame.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUT = process.argv[2];
const W = 1280, H = 720, FPS = 30, STEP = 1000 / FPS;
const BASE = 'http://localhost:4173/';

const INIT = () => {
  try {
    localStorage.setItem('mafia-bhaiyas-tutorial-v2', '1');
    localStorage.setItem('mafia-bhaiyas-settings-v1', JSON.stringify({ difficulty: 'novice', musicMuted: true }));
  } catch (e) {}
  let fake = 0;
  const realNow = performance.now.bind(performance);
  const t0 = realNow();
  performance.now = () => fake;
  let q = [];
  let id = 1;
  window.requestAnimationFrame = (cb) => { q.push(cb); return id++; };
  window.cancelAnimationFrame = () => {};
  window.__tick = (ms) => { fake += ms; const run = q; q = []; run.forEach((cb) => { try { cb(fake); } catch (e) { console.error(e); } }); };
  // keep the game alive in real time while menus load
  window.__pump = setInterval(() => window.__tick(33), 33);
  window.__stopPump = () => clearInterval(window.__pump);
  window.__caption = (html) => {
    let el = document.getElementById('__cap');
    if (!el) {
      el = document.createElement('div');
      el.id = '__cap';
      el.style.cssText = 'position:fixed;left:0;right:0;bottom:9%;z-index:99999;display:flex;justify-content:center;pointer-events:none;';
      document.body.appendChild(el);
    }
    el.innerHTML = html
      ? `<div style="transform:skewX(-10deg);background:linear-gradient(90deg,#DC2626,#F59E0B);border-left:6px solid #FDE047;padding:10px 26px;box-shadow:6px 6px 0 rgba(0,0,0,.55);font:900 34px/1.05 'Bangers','Impact',system-ui,sans-serif;letter-spacing:1px;color:#FFFBEB;text-shadow:3px 3px 0 #7C2D12;text-transform:uppercase;text-align:center">${html}</div>`
      : '';
  };
};

async function clip(browser, name, { url, pick, start, frames, setup, act, captions, speed = 1, skip = 0 }) {
  const dir = path.join(OUT, name);
  fs.mkdirSync(dir, { recursive: true });
  const p = await browser.newPage({ viewport: { width: W, height: H } });
  p.on('pageerror', (e) => console.log(name, 'pageerror', e.message));
  await p.addInitScript(INIT);
  await p.goto(BASE + url);
  await p.waitForTimeout(5200);
  if (pick) {
    await p.getByText(pick.mode).first().click();
    await p.waitForTimeout(900);
    if (pick.hero) {
      await p.getByRole('button', { name: new RegExp(pick.hero) }).first().click();
      await p.waitForTimeout(300);
    }
    await p.getByRole('button', { name: new RegExp(pick.start) }).click();
    await p.waitForTimeout(start ?? 7000);
    // hide the touch pad for a clean shot
    const pad = p.getByRole('button', { name: 'Toggle touch arcade pad' }).first();
    if (await pad.count()) await pad.click().catch(() => {});
  }
  await p.evaluate(() => window.__stopPump());
  if (setup) await setup(p);
  for (let k = 0; k < skip * speed; k++) { if (act) await act(p, -1); await p.evaluate((ms) => window.__tick(ms), STEP); }
  for (let f = 0; f < frames; f++) {
    const cap = captions ? captions.find((c) => f >= c.from && f < c.to) : null;
    await p.evaluate((h) => window.__caption(h), cap ? cap.text : '');
    if (act) await act(p, f);
    for (let k = 0; k < speed; k++) await p.evaluate((ms) => window.__tick(ms), STEP);
    await p.screenshot({ path: path.join(dir, String(f).padStart(4, '0') + '.jpg'), type: 'jpeg', quality: 88 });
  }
  await p.close();
  console.log('clip done', name, frames);
}

// simple scripted fighter: walk at cousins and throw a mix of strikes
const brawler = (keys) => async (p, f) => {
  if (f % 12 === 0) await p.keyboard.down('KeyD');
  if (f % 12 === 7) await p.keyboard.up('KeyD');
  if (f % 6 === 3) await p.keyboard.press(keys[Math.floor(f / 6) % keys.length]);
};

(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const only = process.argv[3];
  // slots in the lineup: 0 Immy, 1 Jam, 2 Fady, 3 Jav, 4 Saf, 5 Chet
  const SLOT = { immy: 0, jam: 1, fady: 2, jav: 3, saf: 4, chet: 5 };
  const LINES = [
    [0.5, 'chet', 2.0, 'Lads. Hear me out.'],
    [2.6, 'chet', 1.8, 'Doner meat.'],
    [4.6, 'immy', 2.4, 'You can eat my kebab...'],
    [7.2, 'jav', 2.6, 'Oye kutteya! Shut the f### up!'],
    [10.0, 'chet', 3.0, 'The spinning kind. Twelve percent return on happiness.'],
    [13.2, 'fady', 3.8, 'If I may. I once ate a samosa so profound, I wept in three languages.'],
    [17.2, 'jav', 3.2, 'Oye khotey, stop talking and walk! My feet are killing me, kutteya!'],
    [20.6, 'immy', 2.6, 'Is it hot in here, or is it the kebabs?'],
    [23.3, 'immy', 3.2, "That chilli sauce keeps looking at me. I'm looking back."],
    [26.7, 'saf', 2.6, 'Whoever feeds us first gets a HUG, bro.'],
    [29.4, 'fady', 3.6, 'Gentlemen, we could simply cook. I have a recipe for... toast.'],
    [33.1, 'jav', 2.2, 'TOAST?! Ullu da pattha!'],
    [35.5, 'chet', 3.0, 'Doner. Extra garlic. My treat... on the car insurance.'],
    [39.0, 'jam', 3.4, 'Bro... can you just take me home?'],
  ];
  const STOP_AT = 38.7;
  const jobs = {
    walk_talk: () => clip(browser, 'walk_talk', {
      url: '?lineup&start=45',
      frames: Math.round(43 * 30),
      act: async (p, f) => {
        const t = f / 30, prev = (f - 1) / 30;
        for (const [at, who, dur, text] of LINES) {
          if (prev < at && t >= at) await p.evaluate(([s, x]) => window.__lineup.say(s, x), [SLOT[who], text]);
          if (prev < at + dur && t >= at + dur) await p.evaluate((s) => window.__lineup.say(s, ''), SLOT[who]);
        }
        if (prev < STOP_AT && t >= STOP_AT) await p.evaluate(() => window.__lineup.stop());
      },
    }),
  };
  for (const [k, fn] of Object.entries(jobs)) if (!only || only.split(',').includes(k)) await fn();
  await browser.close();
})();
