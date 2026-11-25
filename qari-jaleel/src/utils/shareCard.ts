import logoUrl from '../assets/images/mafia-bhaiyas-logo.png?inline';

export interface ShareCardInput {
  endless: boolean;
  victory: boolean;
  heroes: { name: string; portraitUrl?: string }[];
  score: number;
  wave: number;
  rank: string;
  title: string | null;
  coins: number;
}

const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];

function caption(i: ShareCardInput): string {
  if (i.endless) {
    const w = i.wave;
    if (w < 3) return pick([`Survived ${w} waves. Barely. My cousin did better.`, `Wave ${w}. The sheep was not impressed.`, `Lost at wave ${w} to a guy in a lungi. Again.`]);
    if (w < 8) return pick([`Wave ${w} and I still smell of samosas.`, `Wave ${w}! Tell Chacha to put the chai on.`, `${w} waves down. The cousins are filing complaints.`]);
    if (w < 15) return pick([`Wave ${w}! My aunty would be proud. Or confused.`, `Wave ${w}. I have become the Mohalla.`, `Wave ${w}. Rickshaws fear me now.`]);
    return pick([`Wave ${w}. I am basically a legend. Ask anyone. Please ask.`, `Wave ${w}?! Somebody check my pizza for magic.`]);
  }
  return i.victory
    ? pick(["Made it to Chacha Chai's. The chai was cold.", 'Beat the whole Mohalla. Where is my pizza?', 'Street cleared. Kebab roll earned.'])
    : pick(['Lost to a cousin. We do not talk about it.', 'Defeated, but the kebab roll was worth it.', 'The cousins won this round. Rematch, bhai.']);
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

/** Draws a funny 1200x630 result picture and returns it as a PNG data URL. */
export async function makeShareCard(input: ShareCardInput): Promise<string> {
  const W = 1200;
  const H = 630;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  if (!g) return '';
  try {
    await Promise.all([document.fonts.load('900 100px "Big Shoulders Display"'), document.fonts.load('700 28px "Plus Jakarta Sans"')]);
  } catch {
    // fonts optional
  }
  const display = '"Big Shoulders Display", Impact, sans-serif';
  const body = '"Plus Jakarta Sans", system-ui, sans-serif';

  // Background: warm gradient with sunburst rays and dots
  const bg = g.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#2B1408');
  bg.addColorStop(1, '#6B2A0E');
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
  g.save();
  g.translate(W * 0.28, H * 0.55);
  for (let a = 0; a < 36; a++) {
    g.rotate((Math.PI * 2) / 36);
    g.fillStyle = a % 2 ? 'rgba(250,204,21,0.07)' : 'rgba(250,204,21,0)';
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(900, -60);
    g.lineTo(900, 60);
    g.closePath();
    g.fill();
  }
  g.restore();
  g.fillStyle = 'rgba(255,255,255,0.045)';
  for (let y = 10; y < H; y += 22) for (let x = (y / 22) % 2 ? 10 : 21; x < W; x += 22) g.fillRect(x, y, 3, 3);

  // Logo
  const logo = await loadImage(logoUrl);
  if (logo) {
    const lh = 120;
    g.drawImage(logo, 36, 24, (logo.width / logo.height) * lh, lh);
  }

  // Hero portraits
  const ports = await Promise.all(input.heroes.slice(0, 2).map((h) => (h.portraitUrl ? loadImage(h.portraitUrl) : Promise.resolve(null))));
  input.heroes.slice(0, 2).forEach((hero, i) => {
    const x = 48 + i * 210;
    const y = 190;
    const s = 200;
    g.save();
    roundRect(g, x, y, s, s, 18);
    g.clip();
    const img = ports[i];
    if (img) {
      const side = Math.min(img.width, img.height * 1.0);
      g.drawImage(img, (img.width - side) / 2, 0, side, side, x, y, s, s);
    } else {
      g.fillStyle = '#3A2A1C';
      g.fillRect(x, y, s, s);
    }
    g.restore();
    g.lineWidth = 6;
    g.strokeStyle = i === 0 ? '#F59E0B' : '#38BDF8';
    roundRect(g, x, y, s, s, 18);
    g.stroke();
    g.fillStyle = '#FDE047';
    roundRect(g, x + 8, y + s - 40, s - 16, 32, 8);
    g.fill();
    g.fillStyle = '#141210';
    g.font = `800 20px ${body}`;
    g.textAlign = 'center';
    g.fillText((hero.name.match(/'([^']+)'/)?.[1] ?? hero.name.split(' ')[0]).toUpperCase(), x + s / 2, y + s - 16);
  });

  // Result block
  g.textAlign = 'left';
  g.fillStyle = '#FCD34D';
  g.font = `900 40px ${display}`;
  g.fillText(input.endless ? 'ENDLESS MOHALLA' : 'VILLAGE STREET BRAWL', 520, 80);
  g.fillStyle = '#FFFFFF';
  g.font = `900 150px ${display}`;
  g.fillText(input.endless ? `WAVE ${input.wave}` : input.victory ? `RANK ${input.rank}` : 'DEFEATED', 520, 220);
  g.fillStyle = '#FDE047';
  g.font = `900 64px ${display}`;
  g.fillText(`${input.score.toLocaleString()} POINTS`, 520, 290);
  if (input.title) {
    const label = `★ ${input.title}`;
    g.font = `800 30px ${body}`;
    const tw = g.measureText(label).width + 36;
    g.fillStyle = '#2A2210';
    roundRect(g, 520, 316, tw, 50, 25);
    g.fill();
    g.strokeStyle = '#FACC15';
    g.lineWidth = 3;
    g.stroke();
    g.fillStyle = '#FACC15';
    g.fillText(label, 538, 351);
  }

  // Funny caption in a speech bubble
  const text = caption(input);
  g.font = `800 38px ${body}`;
  const maxW = 560;
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const t = line ? `${line} ${w}` : w;
    if (g.measureText(t).width > maxW && line) {
      lines.push(line);
      line = w;
    } else line = t;
  }
  if (line) lines.push(line);
  const bh = lines.length * 48 + 36;
  const bx = 520;
  const by = 560 - bh;
  g.fillStyle = '#FFFDF8';
  roundRect(g, bx, by, maxW + 56, bh, 26);
  g.fill();
  g.beginPath();
  g.moveTo(bx + 40, by + bh - 2);
  g.lineTo(bx + 20, by + bh + 34);
  g.lineTo(bx + 84, by + bh - 2);
  g.closePath();
  g.fill();
  g.fillStyle = '#141210';
  lines.forEach((l, i) => g.fillText(l, bx + 28, by + 52 + i * 48));

  // Footer
  g.fillStyle = 'rgba(248,244,236,0.8)';
  g.font = `700 24px ${body}`;
  g.textAlign = 'right';
  let site = '';
  try {
    if (window.self === window.top && /^https?:/.test(location.protocol)) site = location.host + location.pathname.replace(/\/$/, '');
  } catch {
    // framed
  }
  g.fillText(site ? `Play Mafia Bhaiyas · ${site}` : 'MAFIA BHAIYAS', W - 36, H - 22);

  return c.toDataURL('image/png');
}

/** Opens the phone's share sheet with the picture, when the browser supports it. Returns false if it can't. */
export async function shareCardImage(dataUrl: string, text: string): Promise<boolean> {
  try {
    const blob = await (await fetch(dataUrl)).blob();
    const file = new File([blob], 'mafia-bhaiyas-score.png', { type: 'image/png' });
    const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
    if (nav.share && nav.canShare?.({ files: [file] })) {
      await nav.share({ files: [file], text, title: 'Mafia Bhaiyas' });
      return true;
    }
  } catch {
    // cancelled or unsupported
  }
  return false;
}
