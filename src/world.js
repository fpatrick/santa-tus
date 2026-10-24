// world.js: draws the scenery on the game canvas: night sky, stars, moon, the town with a TUS sign,
// falling snow, the rooftop, and the chimneys (bottom: brick chimney, top: ice column).

import { CONFIG } from './config.js';

const W = CONFIG.world.width;
const H = CONFIG.world.height;
const ROOF = H - CONFIG.world.roof;

const stars = [];
const flakes = [];
let town = [];

export function initWorld() {
  for (let i = 0; i < 140; i++) stars.push({ x: Math.random() * W, y: Math.random() * 640, s: Math.random() < 0.15 ? 4 : 2, p: Math.random() * 6 });
  for (let i = 0; i < 90; i++) flakes.push({ x: Math.random() * W, y: Math.random() * H, v: 40 + Math.random() * 70, s: Math.random() < 0.3 ? 4 : 3, w: Math.random() * 6 });
  town = [];
  let x = 0;
  let i = 0;
  while (x < W * 2) {
    const w = 70 + Math.floor(Math.random() * 7) * 16;
    const h = i === 5 ? 420 : 140 + Math.floor(Math.random() * 12) * 18;
    const wins = [];
    for (let wy = 24; wy < h - 20; wy += 34) for (let wx = 14; wx < w - 18; wx += 26) if (Math.random() < 0.3) wins.push([wx, wy]);
    town.push({ x, w, h, wins, tus: i === 5 });
    x += w + 6;
    i++;
  }
}

export function drawSky(ctx, t, scroll, accent = '#c35cff') {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#0b0730');
  g.addColorStop(0.6, '#1d1260');
  g.addColorStop(1, '#3a1a6e');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  for (const s of stars) {
    ctx.globalAlpha = 0.45 + 0.4 * Math.sin(t * 0.8 + s.p);
    ctx.fillStyle = '#f4f7ff';
    ctx.fillRect(s.x, s.y, s.s, s.s);
  }
  ctx.globalAlpha = 1;
  drawMoon(ctx, 1040, 150);
  drawTown(ctx, scroll * 0.22, t, accent);
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

function drawTown(ctx, off, t, accent) {
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
        ctx.font = '40px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillStyle = accent;
        ctx.shadowColor = accent;
        ctx.shadowBlur = 18;
        ctx.fillText('TUS', x + b.w / 2, y - 22);
        ctx.shadowBlur = 0;
      }
    }
  }
}

export function drawSnow(ctx, dt) {
  ctx.fillStyle = '#f4f7ff';
  for (const f of flakes) {
    f.y += f.v * dt;
    f.w += dt;
    if (f.y > H) { f.y = -6; f.x = Math.random() * W; }
    ctx.globalAlpha = 0.75;
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

// One chimney: gap centre gy, gap size from the chimney. passed = already scored.
export function drawChimney(ctx, ch, sx, gy, color, passed) {
  const cw = CONFIG.world.chimneyW;
  const top = gy - ch.gap / 2;
  const bot = gy + ch.gap / 2;
  const x = Math.round(sx - cw / 2);
  // bottom: brick chimney
  ctx.fillStyle = '#a8283f';
  ctx.fillRect(x, bot, cw, ROOF - bot);
  ctx.fillStyle = '#6b1526';
  for (let y = bot + 30; y < ROOF; y += 24) {
    ctx.fillRect(x, y, cw, 4);
    const o = ((y - bot) / 24) % 2 ? 0 : 32;
    for (let bx = x + o; bx < x + cw; bx += 64) ctx.fillRect(bx, y - 20, 4, 20);
  }
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fillRect(x, bot, 12, ROOF - bot);
  ctx.fillStyle = '#7d1b30';
  ctx.fillRect(x - 12, bot, cw + 24, 30);
  ctx.fillStyle = '#f4f7ff';
  ctx.fillRect(x - 14, bot - 10, cw + 28, 12);
  ctx.fillRect(x + 10, bot + 2, 12, 10);
  ctx.fillRect(x + cw - 34, bot + 2, 10, 14);
  // top: ice column with icicles
  ctx.fillStyle = '#8fe3ff';
  ctx.fillRect(x, 0, cw, top - 26);
  ctx.fillStyle = '#c9f2ff';
  ctx.fillRect(x + 10, 0, 16, top - 26);
  ctx.fillStyle = '#27c8ff';
  ctx.fillRect(x - 12, top - 30, cw + 24, 30);
  ctx.fillStyle = '#c9f2ff';
  for (let ix = x - 6; ix < x + cw + 6; ix += 22) ctx.fillRect(ix, top - 6, 10, 6);
  // glow for moving gaps, and the chimney number
  if (ch.move) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.strokeRect(x - 14, top - 32, cw + 28, 34);
    ctx.strokeRect(x - 14, bot - 2, cw + 28, 34);
  }
  ctx.font = '28px "Press Start 2P"';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = passed ? '#3dff8b' : '#f4f7ff';
  ctx.fillText(String(ch.i), sx, Math.min(ROOF - 30, bot + 70));
  ctx.textBaseline = 'alphabetic';
}

export const ROOF_Y = ROOF;
