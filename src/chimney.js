// chimney.js: one obstacle = a brick chimney (bottom) + a stack of Christmas presents (top).
// When Santa passes, the presents fly into his bag. The last chimney of a level shows a warning
// (electric arcs in the gap) so players know the game is about to get harder.
// Textures are drawn once into small canvases and reused, so drawing stays fast.

import { CONFIG } from './config.js';

const CW = CONFIG.world.chimneyW;
const ROOF = CONFIG.world.height - CONFIG.world.roof;
const GIFT_COLORS = [
  ['#d62839', '#ffd23f'], ['#1f9e55', '#d62839'], ['#ffd23f', '#d62839'], ['#2a6fdb', '#f4f7ff'],
  ['#8e3bd6', '#ffd23f'], ['#f4f7ff', '#d62839'], ['#e86a1a', '#1f9e55'],
];
const bricks = [];

function rand(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A tall brick texture with mixed brick colours, mortar and soot.
function brickTexture(v) {
  if (bricks[v]) return bricks[v];
  const c = document.createElement('canvas');
  c.width = CW;
  c.height = 1000;
  const g = c.getContext('2d');
  const r = rand(77 + v);
  g.fillStyle = '#5a1420';
  g.fillRect(0, 0, CW, 1000);
  const bw = 32;
  const bh = 16;
  for (let row = 0; row * bh < 1000; row++) {
    const off = row % 2 ? -bw / 2 : 0;
    for (let x = off; x < CW; x += bw) {
      const shade = 0.75 + r() * 0.35;
      const base = [168, 44, 60].map((n) => Math.round(n * shade));
      g.fillStyle = `rgb(${base.join(',')})`;
      g.fillRect(x + 2, row * bh + 2, bw - 3, bh - 3);
      g.fillStyle = 'rgba(255,255,255,0.10)';
      g.fillRect(x + 2, row * bh + 2, bw - 3, 3);
      if (r() < 0.12) { g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x + 4 + r() * 18, row * bh + 5, 6, 4); }
    }
  }
  const side = g.createLinearGradient(0, 0, CW, 0);
  side.addColorStop(0, 'rgba(255,220,200,0.18)');
  side.addColorStop(0.25, 'rgba(0,0,0,0)');
  side.addColorStop(0.75, 'rgba(0,0,0,0.1)');
  side.addColorStop(1, 'rgba(0,0,0,0.45)');
  g.fillStyle = side;
  g.fillRect(0, 0, CW, 1000);
  const soot = g.createLinearGradient(0, 0, 0, 60);
  soot.addColorStop(0, 'rgba(20,10,20,0.6)');
  soot.addColorStop(1, 'rgba(20,10,20,0)');
  g.fillStyle = soot;
  g.fillRect(0, 0, CW, 60);
  bricks[v] = c;
  return c;
}

// The presents of one chimney, from the gap upwards (bottom present first).
function gifts(ch) {
  if (ch._gifts) return ch._gifts;
  const r = rand(ch.i * 131 + 7);
  const list = [];
  let h = 0;
  while (h < 1000) {
    const gh = 58 + Math.floor(r() * 5) * 9;
    const gw = CW - 8 + Math.floor(r() * 4) * 8;
    list.push({ w: gw, h: gh, dx: Math.round((r() - 0.5) * 10), y: h, col: GIFT_COLORS[Math.floor(r() * GIFT_COLORS.length)], dots: r() < 0.35 });
    h += gh;
  }
  ch._gifts = list;
  return list;
}

// One present centred on (0, 0) of the current transform.
function drawGift(g, p) {
  const { w, h, col: [box, rib] } = p;
  const x = -w / 2;
  const y = -h / 2;
  g.fillStyle = '#07051c';
  g.fillRect(x - 3, y - 3, w + 6, h + 6);
  g.fillStyle = box;
  g.fillRect(x, y, w, h);
  g.fillStyle = 'rgba(0,0,0,0.22)';
  g.fillRect(x + w * 0.72, y, w * 0.28, h);
  g.fillStyle = 'rgba(255,255,255,0.18)';
  g.fillRect(x, y, w, 10); // lid
  g.fillStyle = 'rgba(0,0,0,0.25)';
  g.fillRect(x, y + 10, w, 3);
  if (p.dots) {
    g.fillStyle = 'rgba(255,255,255,0.35)';
    for (let yy = y + 20; yy < y + h - 6; yy += 16) for (let xx = x + 8; xx < x + w - 6; xx += 18) g.fillRect(xx, yy, 5, 5);
  }
  g.fillStyle = rib;
  g.fillRect(-7, y, 14, h); // ribbon down
  g.fillRect(x, -6, w, 12); // ribbon across
  g.fillStyle = 'rgba(0,0,0,0.2)';
  g.fillRect(3, y, 4, h);
  // bow on the side
  g.fillStyle = rib;
  g.beginPath();
  g.ellipse(-16, y + 4, 12, 7, -0.5, 0, Math.PI * 2);
  g.ellipse(16, y + 4, 12, 7, 0.5, 0, Math.PI * 2);
  g.fill();
}

function stackImage(ch) {
  if (ch._stack) return ch._stack;
  const list = gifts(ch);
  const c = document.createElement('canvas');
  c.width = CW + 60;
  c.height = 1000;
  const g = c.getContext('2d');
  for (const p of list) {
    g.save();
    g.translate(c.width / 2 + p.dx, c.height - p.y - p.h / 2);
    drawGift(g, p);
    g.restore();
  }
  ch._stack = c;
  return c;
}

// o = { passed, t (seconds), warn (colour or null), collect ({ t0, x, y } or null) }
export function drawChimney(ctx, ch, sx, gy, o = {}) {
  const top = gy - ch.gap / 2;
  const bot = gy + ch.gap / 2;
  const x = Math.round(sx - CW / 2);
  // brick chimney
  ctx.drawImage(brickTexture(ch.i % 3), 0, 0, CW, Math.max(1, ROOF - bot), x, Math.round(bot), CW, Math.max(1, ROOF - bot));
  // stone cap with snow
  ctx.fillStyle = '#4a3a48';
  ctx.fillRect(x - 14, bot + 18, CW + 28, 8);
  ctx.fillStyle = '#8c7a86';
  ctx.fillRect(x - 14, bot, CW + 28, 18);
  ctx.fillStyle = '#b3a3ad';
  ctx.fillRect(x - 14, bot, CW + 28, 4);
  drawSnowCap(ctx, x - 16, bot, CW + 32, ch.i);
  // number plate
  ctx.fillStyle = 'rgba(7,5,28,0.55)';
  ctx.fillRect(sx - 34, Math.min(ROOF - 56, bot + 52), 68, 40);
  ctx.font = '24px "Press Start 2P"';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = o.passed ? '#3dff8b' : '#f4f7ff';
  ctx.fillText(String(ch.i), sx, Math.min(ROOF - 36, bot + 72));
  ctx.textBaseline = 'alphabetic';
  // presents
  if (!o.collect) {
    const img = stackImage(ch);
    ctx.drawImage(img, Math.round(sx - img.width / 2), Math.round(top - img.height));
  } else flyIntoBag(ctx, ch, sx, top, o.collect, o.t);
  if (o.warn) drawWarning(ctx, sx, top, bot, o.warn, o.t);
}

// A soft heap of snow with drips and a little sparkle.
function drawSnowCap(ctx, x, y, w, seed) {
  const r = rand(seed * 17 + 3);
  ctx.fillStyle = '#dfe8ff';
  ctx.beginPath();
  ctx.moveTo(x, y + 4);
  for (let k = 0; k <= 6; k++) ctx.arc(x + (w * k) / 6, y - 2, 10 + r() * 8, Math.PI, 0);
  ctx.lineTo(x + w, y + 6);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x + 6, y - 14, w - 12, 10);
  ctx.fillStyle = '#dfe8ff';
  for (let k = 0; k < 4; k++) ctx.fillRect(x + 10 + r() * (w - 24), y + 4, 8, 8 + r() * 16);
  ctx.fillStyle = 'rgba(160,190,255,0.5)';
  ctx.fillRect(x + 4, y + 2, w - 8, 4);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x + 20 + r() * (w - 40), y - 18, 4, 4);
}

// After Santa passes: each present shrinks and flies into the bag, one after another (~0.8 s).
function flyIntoBag(ctx, ch, sx, top, c, t) {
  const list = gifts(ch);
  for (let j = 0; j < list.length; j++) {
    const p = list[j];
    const k = (t - c.t0 - j * 0.04) / 0.45;
    if (k >= 1) continue;
    const px = sx + p.dx;
    const py = top - p.y - p.h / 2;
    if (k <= 0) {
      if (py + p.h < 0) continue;
      ctx.save();
      ctx.translate(px, py);
      drawGift(ctx, p);
      ctx.restore();
      continue;
    }
    const e = k * k;
    ctx.save();
    ctx.translate(px + (c.x - px) * e, py + (c.y - py) * e - Math.sin(k * Math.PI) * 60);
    ctx.rotate(k * 3);
    ctx.scale(1 - 0.8 * k, 1 - 0.8 * k);
    drawGift(ctx, p);
    ctx.restore();
  }
}

// Difficulty spike ahead: electric arcs and a glow between the chimney and the presents.
function drawWarning(ctx, sx, top, bot, color, t) {
  const pulse = 0.5 + 0.5 * Math.sin(t * Math.PI * 4); // 2 pulses a second (A4)
  ctx.save();
  ctx.globalAlpha = 0.18 + 0.2 * pulse;
  ctx.fillStyle = color;
  ctx.fillRect(sx - CW / 2 - 10, top, CW + 20, bot - top);
  ctx.globalAlpha = 0.9;
  ctx.strokeStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 16;
  ctx.lineWidth = 4;
  const r = rand(Math.floor(t * 6) + 1); // the arcs change shape 6 times a second
  for (let n = 0; n < 3; n++) {
    ctx.beginPath();
    let x = sx - CW / 2 + 20 + n * (CW / 2 - 20);
    ctx.moveTo(x, top);
    for (let y = top; y < bot; y += 22) {
      x += (r() - 0.5) * 34;
      ctx.lineTo(x, Math.min(bot, y + 22));
    }
    ctx.stroke();
  }
  ctx.restore();
}
