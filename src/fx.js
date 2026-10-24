// fx.js: effects drawn over the whole stage (1920 x 1080): particles, coins, tickets, light rays,
// rings, fireworks, big text, flashes and screen shake. celebrate(tier) scales everything by rarity.
// A4 safety: flashes and pulses never go above CONFIG.fx.maxFlashPerSec (3 per second).

import { CONFIG } from './config.js';

const parts = [];
const rayList = [];
const rings = [];
const texts = [];
const emitters = [];
let ctx = null;
let shakeEl = null;
let time = 0;
let flashA = 0;
let flashColor = '#fff';
let lastFlash = -10;
let shakeT = 0;
let shakeDur = 1;
let shakePow = 0;

export const PALETTE = ['#ff3b4f', '#3dff8b', '#27c8ff', '#ffd23f', '#c35cff', '#f4f7ff'];
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export function initFx(canvas, shakeElement) {
  ctx = canvas.getContext('2d');
  shakeEl = shakeElement;
}

function add(p) {
  if (parts.length >= CONFIG.fx.particleCap) parts.shift();
  parts.push(p);
}

export function burst(x, y, o = {}) {
  const { count = 40, colors = PALETTE, speed = 600, size = 7, life = 1.1, gravity = 900, kind = 'square', angle = 0, spread = Math.PI * 2 } = o;
  for (let i = 0; i < count; i++) {
    const a = angle + (Math.random() - 0.5) * spread;
    const v = speed * (0.35 + Math.random() * 0.65);
    add({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: gravity, life: life * rnd(0.6, 1.2), age: 0, size: size * rnd(0.6, 1.4), color: pick(colors), kind, rot: rnd(0, 6), vr: rnd(-10, 10) });
  }
}

// Coins (or tickets) falling from the top of an area for some seconds.
export function rain(o = {}) {
  const { seconds = 2, rate = 50, x0 = 0, x1 = 1920, kind = 'coin', colors = ['#ffd23f'] } = o;
  emitters.push({ until: time + seconds, acc: 0, rate, spawn: () => add({ x: rnd(x0, x1), y: -30, vx: rnd(-60, 60), vy: rnd(200, 500), g: 700, life: 3, age: 0, size: kind === 'coin' ? rnd(14, 22) : rnd(10, 16), color: pick(colors), kind, rot: rnd(0, 6), vr: rnd(-6, 6) }) });
}

export function rays(x, y, o = {}) {
  const { color = '#ffd23f', count = 12, life = 2, width = 0.13, alpha = 0.45, spin = 0.5, rainbow = false, radius = 1500 } = o;
  rayList.push({ x, y, color, count, life, age: 0, width, alpha, spin, rainbow, radius });
}

export function ring(x, y, o = {}) {
  const { color = '#f4f7ff', life = 0.7, max = 650, width = 14, delay = 0 } = o;
  rings.push({ x, y, color, life, age: -delay, max, width });
}

export function flash(color = '#fff', alpha = 0.55) {
  if (time - lastFlash < 1 / CONFIG.fx.maxFlashPerSec) return;
  lastFlash = time;
  flashColor = color;
  flashA = alpha;
}

export function shake(power = 12, seconds = 0.4) {
  if (power >= shakePow * (shakeT / shakeDur || 0)) { shakePow = power; shakeT = seconds; shakeDur = seconds; }
}

export function popText(text, o = {}) {
  const { x = 640, y = 420, size = 96, color = '#ffd23f', life = 1.8, pulse = false, rise = 30, font = 'Press Start 2P', plate = false } = o;
  texts.push({ text, x, y, size, color, life, age: 0, pulse, rise, font, plate });
}

export function fireworks(count = 6, seconds = 2.5, x0 = 150, x1 = 1770) {
  for (let i = 0; i < count; i++) {
    const at = (seconds * i) / count + rnd(0, 0.2);
    emitters.push({ start: time + at, until: time + at + 0.01, once: true, spawn: () => {
      const x = rnd(x0, x1);
      const y = rnd(140, 520);
      const c = pick(PALETTE);
      burst(x, y, { count: 70, colors: [c, '#f4f7ff'], speed: 520, size: 7, life: 1.4, gravity: 260, kind: 'star' });
      ring(x, y, { color: c, max: 260, life: 0.5, width: 8 });
    } });
  }
}

// The big one: bigger tier = more of everything. x, y = where the prize appears.
export function celebrate(tier, x = 640, y = 470, label = '', color = '#ffd23f') {
  const big = [0, 1, 1.4, 2.1, 3][tier] || 1;
  burst(x, y, { count: 30 + tier * 35, colors: [color, '#f4f7ff', '#ffd23f'], speed: 380 + tier * 160, size: 6 + tier, kind: 'star' });
  ring(x, y, { color, max: 380 * big, life: 0.6 });
  if (label) popText(label, { x, y: y - 170, size: 46 + tier * 14, color, life: 1.4 + tier * 0.5, pulse: tier >= 3 });
  if (tier >= 2) {
    rays(x, y, { color, count: 6 + tier * 2, life: 1.2 + tier * 0.6, alpha: 0.18 + tier * 0.08, spin: 0.3 + tier * 0.15 });
    burst(x, y, { count: 10 + tier * 8, kind: 'coin', colors: ['#ffd23f'], speed: 700, size: 18, gravity: 1200, angle: -Math.PI / 2, spread: 1.6, life: 1.6 });
  }
  if (tier >= 3) {
    flash(color, 0.35);
    shake(10 + tier * 3, 0.5);
    ring(x, y, { color: '#f4f7ff', max: 700, life: 0.9, delay: 0.15 });
    burst(x, y, { count: 140, kind: 'confetti', speed: 900, size: 10, gravity: 700, life: 2.2 });
    rain({ seconds: 1.4, rate: 50, x0: 0, x1: 1280, kind: 'coin' });
  }
  if (tier >= 4) {
    flash('#fff6c8', 0.6);
    shake(24, 1.1);
    rays(x, y, { count: 18, life: 4.2, alpha: 0.32, spin: 0.9, rainbow: true, width: 0.09 });
    ring(x, y, { color: '#ffd23f', max: 1400, life: 1.2, delay: 0.3, width: 22 });
    fireworks(10, 3.2);
    rain({ seconds: 3.6, rate: 120, kind: 'coin' });
    rain({ seconds: 3.6, rate: 40, kind: 'confetti', colors: PALETTE });
  }
}

export function clearFx() {
  parts.length = 0; rayList.length = 0; rings.length = 0; texts.length = 0; emitters.length = 0;
  flashA = 0;
  shakeT = 0;
}

export function busy() { return parts.length + rayList.length + texts.length + emitters.length > 0; }

export function updateFx(dt) {
  time += dt;
  for (let i = emitters.length - 1; i >= 0; i--) {
    const e = emitters[i];
    if (e.start && time < e.start) continue;
    if (e.once) { e.spawn(); emitters.splice(i, 1); continue; }
    e.acc += e.rate * dt;
    while (e.acc >= 1) { e.spawn(); e.acc -= 1; }
    if (time > e.until) emitters.splice(i, 1);
  }
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    p.age += dt;
    if (p.age > p.life || p.y > 1150) { parts.splice(i, 1); continue; }
    p.vy += p.g * dt;
    p.vx *= 1 - 0.8 * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.rot += p.vr * dt;
  }
  for (const list of [rayList, rings, texts]) {
    for (let i = list.length - 1; i >= 0; i--) { list[i].age += dt; if (list[i].age > list[i].life) list.splice(i, 1); }
  }
  flashA = Math.max(0, flashA - dt * 2.2);
  if (shakeEl) {
    if (shakeT > 0) {
      shakeT -= dt;
      const k = shakePow * Math.max(0, shakeT / shakeDur);
      shakeEl.style.transform = `translate(${rnd(-k, k).toFixed(1)}px, ${rnd(-k, k).toFixed(1)}px)`;
    } else if (shakeEl.style.transform) shakeEl.style.transform = '';
  }
}

export function renderFx() {
  if (!ctx) return;
  ctx.clearRect(0, 0, 1920, 1080);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const r of rayList) drawRays(r);
  ctx.restore();
  for (const r of rings) {
    if (r.age < 0) continue;
    const k = r.age / r.life;
    ctx.strokeStyle = r.color;
    ctx.globalAlpha = 1 - k;
    ctx.lineWidth = r.width * (1 - k) + 2;
    ctx.beginPath();
    ctx.arc(r.x, r.y, r.max * easeOut(k), 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  for (const p of parts) drawPart(p);
  ctx.globalAlpha = 1;
  for (const t of texts) drawText(t);
  if (flashA > 0.01) {
    ctx.globalAlpha = flashA;
    ctx.fillStyle = flashColor;
    ctx.fillRect(0, 0, 1920, 1080);
    ctx.globalAlpha = 1;
  }
}

function drawRays(r) {
  const k = r.age / r.life;
  const a = r.alpha * Math.min(1, r.age * 3) * (1 - Math.max(0, k - 0.7) / 0.3);
  const base = time * r.spin;
  for (let i = 0; i < r.count; i++) {
    const ang = base + (i / r.count) * Math.PI * 2;
    ctx.fillStyle = r.rainbow ? PALETTE[i % 5] : r.color;
    ctx.globalAlpha = Math.max(0, a);
    ctx.beginPath();
    ctx.moveTo(r.x, r.y);
    ctx.lineTo(r.x + Math.cos(ang - r.width) * r.radius, r.y + Math.sin(ang - r.width) * r.radius);
    ctx.lineTo(r.x + Math.cos(ang + r.width) * r.radius, r.y + Math.sin(ang + r.width) * r.radius);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawPart(p) {
  const fade = 1 - Math.max(0, p.age / p.life - 0.7) / 0.3;
  ctx.globalAlpha = Math.max(0, fade);
  const s = p.size;
  if (p.kind === 'coin') {
    const w = Math.abs(Math.cos(p.rot)) * s + 2;
    ctx.fillStyle = '#b37c00';
    ctx.fillRect(p.x - w / 2, p.y - s / 2 + 2, w, s);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - w / 2, p.y - s / 2, w, s - 2);
    ctx.fillStyle = '#fff6c8';
    ctx.fillRect(p.x - w / 4, p.y - s / 3, Math.max(2, w / 5), s / 3);
  } else if (p.kind === 'star') {
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - s / 2, p.y - s / 6, s, s / 3);
    ctx.fillRect(p.x - s / 6, p.y - s / 2, s / 3, s);
  } else if (p.kind === 'confetti' || p.kind === 'ticket') {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.fillStyle = p.color;
    ctx.fillRect(-s / 2, -s / 4, s, s / 2);
    ctx.restore();
  } else {
    ctx.fillStyle = p.color;
    ctx.fillRect(Math.round(p.x - s / 2), Math.round(p.y - s / 2), s, s);
  }
}

function drawText(t) {
  const k = t.age / t.life;
  const scale = t.age < 0.35 ? easeOutBack(t.age / 0.35) : 1;
  const alpha = k > 0.8 ? 1 - (k - 0.8) / 0.2 : 1;
  const on = !t.pulse || Math.floor(t.age * 4) % 2 === 0; // 2 pulses a second (A4)
  ctx.save();
  ctx.globalAlpha = Math.max(0, alpha);
  ctx.translate(t.x, t.y - t.rise * k);
  ctx.scale(scale, scale);
  ctx.font = `${t.size}px "${t.font}"`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  if (t.plate) {
    const w = ctx.measureText(t.text).width + t.size;
    ctx.fillStyle = 'rgba(7, 5, 28, 0.82)';
    ctx.fillRect(-w / 2, -t.size * 0.85, w, t.size * 1.7);
  }
  ctx.lineWidth = Math.max(6, t.size / 6);
  ctx.strokeStyle = '#07051c';
  ctx.strokeText(t.text, 0, 0);
  ctx.fillStyle = on ? t.color : '#f4f7ff';
  ctx.fillText(t.text, 0, 0);
  ctx.restore();
}

const easeOut = (k) => 1 - (1 - k) ** 3;
function easeOutBack(k) {
  const c = 1.7;
  return 1 + (c + 1) * (k - 1) ** 3 + c * (k - 1) ** 2;
}
