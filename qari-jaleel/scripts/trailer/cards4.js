// Cards for trailer "The Walk": typewriter intro, retro phone "coming soon" with pixel snake, logo end
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const OUT = process.argv[2];
const LOGO = 'data:image/png;base64,' + fs.readFileSync('/home/user/game/qari-jaleel/src/assets/images/mafia-bhaiyas-logo.png').toString('base64');
const page = (body, css = '') => `<!doctype html><html><head><style>
html,body{margin:0;width:1280px;height:720px;overflow:hidden;background:#000;font-family:Impact,'Arial Black',system-ui,sans-serif}
.c{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}
${css}</style></head><body>${body}</body></html>`;
const ease = (t) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const render = async (name, frames, html) => {
    const dir = path.join(OUT, name);
    fs.mkdirSync(dir, { recursive: true });
    for (let f = 0; f < frames; f++) {
      await p.setContent(html(f / (frames - 1), f));
      await p.screenshot({ path: path.join(dir, String(f).padStart(4, '0') + '.jpg'), type: 'jpeg', quality: 90 });
    }
  };

  // 1. Typewriter intro (8 s)
  const LINES = [
    [0.3, 'Previously, on Mafia Bhaiyas…', 40, '#F59E0B'],
    [2.0, 'Chetzy crashed the car.', 44, '#F8F4EC'],
    [3.6, 'The brothers are still hungry.', 44, '#F8F4EC'],
    [5.2, 'This is their journey.', 44, '#F8F4EC'],
    [6.6, "(It's mostly walking.)", 30, '#B6AA9A'],
  ];
  await render('w1_intro', 240, (t, f) => {
    const sec = f / 30;
    const rows = LINES.map(([at, text, size, color]) => {
      const n = Math.max(0, Math.min(text.length, Math.floor((sec - at) * 34)));
      if (n <= 0) return `<div style="height:${size * 1.5}px"></div>`;
      const cursor = n < text.length || Math.floor(sec * 2) % 2 === 0 ? '▌' : '&nbsp;';
      return `<div style="font:${size}px/1.5 'Courier New',monospace;color:${color};font-weight:700">${text.slice(0, n)}<span style="opacity:.8">${n < text.length ? cursor : ''}</span></div>`;
    });
    return page(`<div class="c">${rows.join('')}</div>`);
  });

  // 2. "Coming soon to a Nokia phone near you": chunky retro phone screen, pixel snake chases a samosa (6 s)
  const CELL = 22;
  const COLS = 26, ROWS = 9;
  await render('w2_phone', 180, (t, f) => {
    const sec = f / 30;
    const a = ease(sec / 0.6);
    // snake path along the bottom row band toward the samosa
    const head = Math.min(19, Math.floor(sec * 4.5));
    const eaten = head >= 19;
    const cells = [];
    for (let k = 0; k < 6; k++) {
      const x = head - k;
      if (x >= 0) cells.push(`<i style="left:${x * CELL}px;top:${7 * CELL}px"></i>`);
    }
    const samosa = eaten ? '' : `<div style="position:absolute;left:${19 * CELL}px;top:${7 * CELL - 2}px;width:0;height:0;border-left:12px solid transparent;border-right:12px solid transparent;border-bottom:22px solid #1f2d0a"></div>`;
    const score = eaten ? 'SAMOSAS: 1' : 'SAMOSAS: 0';
    const blink = Math.floor(sec * 2) % 2 === 0;
    return page(`<div class="c">
      <div style="opacity:${a};transform:scale(${0.92 + 0.08 * a});background:#2b2f33;border-radius:60px 60px 40px 40px;padding:44px 40px 54px;box-shadow:inset 0 -8px 0 #1b1e21,0 20px 40px rgba(0,0,0,.6)">
        <div style="font:700 18px 'Courier New',monospace;color:#9aa3ab;letter-spacing:6px;margin-bottom:14px">MOHALLA 3310</div>
        <div style="position:relative;width:${COLS * CELL}px;height:${ROWS * CELL + 120}px;background:#9BBC0F;border:8px solid #1b1e21;border-radius:8px;box-shadow:inset 0 0 30px rgba(0,0,0,.25);font-family:'Courier New',monospace;color:#1f2d0a;overflow:hidden">
          <div style="position:absolute;top:14px;left:0;right:0;font-weight:900;font-size:56px;letter-spacing:4px">COMING SOON</div>
          <div style="position:absolute;top:84px;left:0;right:0;font-weight:700;font-size:26px">to a Nokia phone near you</div>
          <div style="position:absolute;top:120px;left:0;width:100%;height:${ROWS * CELL}px">
            <style>i{position:absolute;width:${CELL - 3}px;height:${CELL - 3}px;background:#1f2d0a}</style>
            ${cells.join('')}${samosa}
          </div>
          <div style="position:absolute;bottom:8px;right:14px;font-weight:700;font-size:18px">${score}</div>
          <div style="position:absolute;bottom:8px;left:14px;font-weight:700;font-size:18px;opacity:${blink ? 1 : 0.2}">▮▮▮▯</div>
        </div>
        <div style="display:flex;justify-content:center;gap:26px;margin-top:22px">${['1', '2', '3', '*', '0', '#'].map((k) => `<div style="width:54px;height:30px;border-radius:15px;background:#3c4247;color:#c9d0d6;font:700 18px system-ui;display:flex;align-items:center;justify-content:center">${k}</div>`).join('')}</div>
      </div></div>`, 'body{background:radial-gradient(ellipse at 50% 45%,#3b1d10 0%,#140c08 75%)}');
  });

  // 3. Logo end (3 s)
  await render('w3_logo', 90, (t) => {
    const a = ease(t / 0.25);
    const c = ease((t - 0.3) / 0.25);
    return page(`<div class="c" style="background:radial-gradient(ellipse at 50% 45%,#3b1d10 0%,#140c08 75%)">
      <img src="${LOGO}" style="height:330px;opacity:${a};transform:scale(${0.9 + 0.1 * a})">
      <div style="color:#FDE68A;font-size:30px;letter-spacing:3px;opacity:${c}">THEY NEVER FOUND THE DONER.</div>
      <div style="color:#B6AA9A;font-family:Georgia,serif;font-style:italic;font-size:20px;margin-top:8px;opacity:${c}">Mafia Bhaiyas · Episode VII: The Walk</div></div>`);
  });
  await b.close();
  console.log('cards4 done');
})();
