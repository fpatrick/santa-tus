// world.js: draws the scenery on the game canvas: the sky (a colour per level), stars, moon,
// the town with the TUS logo on a building, falling snow (more and faster each level) and the rooftop.
// The chimneys and presents are in chimney.js.

import { CONFIG } from './config.js';

const W = CONFIG.world.width;
const H = CONFIG.world.height;
const ROOF = H - CONFIG.world.roof;
const SC = CONFIG.scenery;

const stars = [];
const flakes = [];
let town = [];
const sky = { from: SC.skies[0], to: SC.skies[0], k: 1, level: 1 };
const snow = { count: SC.snow[0].count, speed: SC.snow[0].speed };
let logoCache = null;

export function initWorld() {
  for (let i = 0; i < 140; i++) stars.push({ x: Math.random() * W, y: Math.random() * 640, s: Math.random() < 0.15 ? 4 : 2, p: Math.random() * 6 });
  const max = Math.max(...SC.snow.map((s) => s.count));
  for (let i = 0; i < max; i++) flakes.push({ x: Math.random() * W, y: Math.random() * H, v: 0.6 + Math.random() * 0.8, s: Math.random() < 0.3 ? 4 : 3, w: Math.random() * 6 });
  town = [];
  let x = 0;
  let i = 0;
  while (x < W * 2) {
    const tus = i === 4;
    const w = tus ? 190 : 70 + Math.floor(Math.random() * 7) * 16;
    const h = tus ? 440 : 140 + Math.floor(Math.random() * 12) * 18;
    const wins = [];
    for (let wy = 24; wy < h - 20; wy += 34) {
      for (let wx = 14; wx < w - 18; wx += 26) if (Math.random() < 0.3 && !(tus && wy < 230)) wins.push([wx, wy]);
    }
    town.push({ x, w, h, wins, tus });
    x += w + 6;
    i++;
  }
}

// Level 1-5: the sky fades to that level's colours, the snow changes.
export function setLevel(n) {
  if (n === sky.level) return;
  sky.from = currentSky();
  sky.to = SC.skies[Math.min(n, SC.skies.length) - 1];
  sky.k = 0;
  sky.level = n;
}

function mix(a, b, k) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const c = [16, 8, 0].map((s) => Math.round(((pa >> s) & 255) * (1 - k) + ((pb >> s) & 255) * k));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}
const currentSky = () => sky.to.map((c, i) => mix(sky.from[i], c, sky.k));

export function drawSky(ctx, t, scroll, level = sky.level) {
  if (level !== sky.level) setLevel(level);
  sky.k = Math.min(1, sky.k + 1 / 90); // about 1.5 seconds to fade
  const [c0, c1, c2] = currentSky();
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, c0);
  g.addColorStop(0.6, c1);
  g.addColorStop(1, c2);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  for (const s of stars) {
    ctx.globalAlpha = 0.45 + 0.4 * Math.sin(t * 0.8 + s.p);
    ctx.fillStyle = '#f4f7ff';
    ctx.fillRect(s.x, s.y, s.s, s.s);
  }
  ctx.globalAlpha = 1;
  drawMoon(ctx, 1040, 150);
  drawTown(ctx, scroll * 0.22);
}

function drawMoon(ctx, cx, cy) {
  ctx.fillStyle = 'rgba(255, 246, 200, 0.12)';
  ctx.beginPath();
  ctx.arc(cx, cy, 120, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff6c8';
  for (let y = -72; y <= 72; y += 8) {
    const half = Math.floor(Math.sqrt(72 * 72 - y * y) / 8) * 8;
    ctx.fillRect(cx - half, cy + y, half * 2, 8);
  }
  ctx.fillStyle = '#e8d890';
  ctx.fillRect(cx - 30, cy - 20, 24, 16);
  ctx.fillRect(cx + 16, cy + 18, 16, 16);
  ctx.fillRect(cx - 8, cy + 36, 12, 8);
}

function drawTown(ctx, off) {
  const total = town.length ? town[town.length - 1].x + town[town.length - 1].w + 6 : W;
  const shift = off % total;
  for (const b of town) {
    for (const rep of [0, total]) {
      const x = Math.round(b.x - shift + rep);
      if (x > W || x + b.w < 0) continue;
      const y = ROOF - b.h;
      ctx.fillStyle = '#150d45';
      ctx.fillRect(x, y, b.w, b.h);
      ctx.fillStyle = '#c9942a';
      for (const [wx, wy] of b.wins) ctx.fillRect(x + wx, y + wy, 10, 14);
      ctx.fillStyle = '#f4f7ff';
      ctx.fillRect(x - 2, y - 6, b.w + 4, 8);
      if (b.tus) {
        const logo = tusLogo(130);
        ctx.fillStyle = '#0c0830';
        ctx.fillRect(x + (b.w - 156) / 2, y + 22, 156, 196);
        ctx.shadowColor = '#e8c97a';
        ctx.shadowBlur = 16;
        ctx.drawImage(logo, x + (b.w - logo.width) / 2, y + 36);
        ctx.shadowBlur = 0;
      }
    }
  }
}

// The TUS logo (from the image the team sent), drawn as shapes so it is sharp at any size.
// Measured on the original: 5 columns of 166 px, 1084 px high, arch radius 249.
export function tusLogo(width, color = '#d8b96a') {
  if (logoCache && logoCache.width === Math.round(width) && logoCache.color === color) return logoCache.c;
  const s = width / 830;
  const c = document.createElement('canvas');
  c.width = Math.round(width);
  c.height = Math.round(1084 * s);
  const g = c.getContext('2d');
  g.fillStyle = color;
  const r = (x, y, w, h) => g.fillRect(x * s, y * s, w * s, h * s);
  r(0, 0, 166, 82); r(332, 0, 166, 82); r(664, 0, 166, 82); // battlements
  r(0, 82, 830, 418); // top block
  g.globalCompositeOperation = 'destination-out';
  g.beginPath();
  g.arc(415 * s, 500 * s, 249 * s, Math.PI, 0);
  g.fill(); // the arch
  g.globalCompositeOperation = 'source-over';
  r(0, 585, 166, 166); r(664, 585, 166, 166);
  r(166, 751, 498, 83);
  r(0, 834, 166, 83); r(664, 834, 166, 83);
  r(166, 917, 498, 83);
  r(0, 1000, 166, 84); r(332, 1000, 166, 84); r(664, 1000, 166, 84);
  logoCache = { c, width: Math.round(width), color };
  return c;
}

// Snow: level 1 almost none, then more and faster each level (CONFIG.scenery.snow).
export function drawSnow(ctx, dt, level = sky.level) {
  const want = SC.snow[Math.min(level, SC.snow.length) - 1];
  snow.count += (want.count - snow.count) * Math.min(1, dt * 1.5);
  snow.speed += (want.speed - snow.speed) * Math.min(1, dt * 1.5);
  const n = Math.round(snow.count);
  const wind = (snow.speed - 35) * 0.35;
  ctx.fillStyle = '#f4f7ff';
  ctx.globalAlpha = 0.8;
  for (let i = 0; i < n; i++) {
    const f = flakes[i];
    f.y += f.v * snow.speed * dt;
    f.x -= f.v * wind * dt;
    f.w += dt;
    if (f.y > H) { f.y = -6; f.x = Math.random() * (W + 200); }
    if (f.x < -20) f.x += W + 40;
    ctx.fillRect(Math.round(f.x + Math.sin(f.w) * 12), Math.round(f.y), f.s, f.s);
  }
  ctx.globalAlpha = 1;
}

export function drawRoof(ctx, scroll) {
  ctx.fillStyle = '#2a1e5c';
  ctx.fillRect(0, ROOF, W, H - ROOF);
  const off = scroll % 64;
  ctx.fillStyle = '#20164a';
  for (let x = -off; x < W; x += 64) for (let y = ROOF + 34; y < H; y += 28) ctx.fillRect(x + ((y / 28) % 2) * 32, y, 58, 22);
  ctx.fillStyle = '#f4f7ff';
  ctx.fillRect(0, ROOF, W, 18);
  for (let x = -off; x < W; x += 32) ctx.fillRect(x, ROOF + 18, 16, 8);
}

export { drawChimney } from './chimney.js';
export const ROOF_Y = ROOF;
