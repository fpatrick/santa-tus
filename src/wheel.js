// wheel.js: the R7 wheel. The result is decided with a secure random number AND saved before
// spin() is called. The animation only shows it. Effects and sounds grow with the tier (1-4).

import { CONFIG } from './config.js';
import * as fx from './fx.js';
import { sfx } from './sound.js';
import { drawSky, drawSnow } from './world.js';
import { outlined } from './game.js';

const CX = 640;
const CY = 560;
const RAD = 350;
const POINTER = -Math.PI / 2;
const TAU = Math.PI * 2;
const REVEAL_SECS = [0, 2.4, 3, 3.8, 6];

// Slices: each outcome is cut into `pieces` slices, mixed around the wheel. Sizes follow the odds.
export function buildPieces(cfg = CONFIG) {
  const left = cfg.wheel.outcomes.map((o) => ({ o, n: o.pieces }));
  const order = [];
  while (left.some((l) => l.n > 0)) {
    for (const l of left) if (l.n > 0) { order.push(l.o); l.n -= 1; }
  }
  let a = 0;
  return order.map((o, k) => {
    const size = (TAU * o.odds) / 100 / o.pieces;
    const p = { o, start: a, size, k };
    a += size;
    return p;
  });
}

export function createWheel() {
  const w = { pieces: buildPieces(), angle: 0, t: 0, phase: 'idle', from: 0, to: 0, dur: 1, result: null, under: -1, flap: 0, glow: 0, resolve: null, revealT: 0, bulbs: 0 };

  // Spins to a random spot inside a slice of `outcome`. Resolves when the reveal is over.
  w.spin = (outcome) => new Promise((resolve) => {
    const mine = w.pieces.filter((p) => p.o.id === outcome.id);
    const piece = mine[Math.floor(Math.random() * mine.length)];
    const spot = piece.start + piece.size * (0.2 + Math.random() * 0.6);
    const base = ((POINTER - spot) % TAU + TAU) % TAU;
    w.from = w.angle % TAU;
    w.to = base + TAU * (CONFIG.wheel.turns + (base < w.from ? 1 : 0));
    w.dur = CONFIG.wheel.spinSeconds;
    w.t = 0;
    w.result = outcome;
    w.piece = piece;
    w.phase = 'spin';
    w.resolve = resolve;
    w.built = false;
    sfx.whoosh();
  });

  w.update = (dt) => {
    w.flap = Math.max(0, w.flap - dt * 8);
    w.bulbs += dt;
    if (w.phase === 'spin') {
      w.t += dt;
      const k = Math.min(1, w.t / w.dur);
      w.angle = w.from + (w.to - w.from) * (1 - (1 - k) ** 4);
      const idx = pieceAt(w);
      if (idx !== w.under) {
        w.under = idx;
        w.flap = 1;
        sfx.tick(1 - k);
      }
      if (!w.built && k > 0.45) { w.built = true; sfx.build(w.result.tier, w.dur * 0.55); }
      if (k > 0.5 && Math.random() < dt * 30 * w.result.tier * k) {
        const a = Math.random() * TAU;
        fx.burst(CX + Math.cos(a) * (RAD + 20), CY + Math.sin(a) * (RAD + 20), { count: 2, colors: [w.result.color, '#f4f7ff'], speed: 120, kind: 'star', gravity: 0, life: 0.6 });
      }
      if (k >= 1) reveal(w);
    } else if (w.phase === 'reveal') {
      w.revealT += dt;
      if (w.revealT > REVEAL_SECS[w.result.tier]) { w.phase = 'idle'; const r = w.resolve; w.resolve = null; if (r) r(); }
    }
  };

  w.render = (ctx, dt, t) => {
    drawSky(ctx, t, t * 40, w.result ? w.result.color : '#c35cff');
    ctx.fillStyle = 'rgba(7, 5, 28, 0.55)';
    ctx.fillRect(0, 0, 1280, 1080);
    drawBuildRays(ctx, w, t);
    drawWheel(ctx, w);
    drawSnow(ctx, dt);
    outlined(ctx, 'WHEEL SPIN!', CX, 120, 56, '#ffd23f', 'center');
    ctx.font = '30px VT323';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#c9d2f0';
    ctx.fillText(CONFIG.wheel.outcomes.map((o) => `${o.label} ${o.odds}%`).join('   '), CX, 1010);
  };

  return w;
}

function pieceAt(w) {
  const a = (((POINTER - w.angle) % TAU) + TAU) % TAU;
  return w.pieces.findIndex((p) => a >= p.start && a < p.start + p.size);
}

function reveal(w) {
  w.phase = 'reveal';
  w.revealT = 0;
  const o = w.result;
  sfx.reveal(o.tier);
  fx.celebrate(o.tier, CX, CY, '', o.color);
  const life = REVEAL_SECS[o.tier] + 0.6;
  fx.popText(CONFIG.wheel.tierNames[o.tier], { x: CX, y: CY - 70, size: 34 + o.tier * 6, color: '#f4f7ff', life, rise: 0, plate: true });
  fx.popText(o.label, { x: CX, y: CY + 30, size: 50 + o.tier * 8, color: o.color, life, rise: 0, plate: true, pulse: o.tier >= 4 });
  if (o.tickets) fx.burst(CX, CY, { count: o.tickets * 10, kind: 'ticket', colors: ['#ff8fd0', '#ffd23f'], speed: 900, size: 22, gravity: 900, life: 2 });
}

// Light rays behind the wheel. They get stronger as it slows, coloured by the result tier (a hint).
function drawBuildRays(ctx, w, t) {
  if (!w.result || w.phase === 'idle') return;
  const k = w.phase === 'spin' ? Math.max(0, (w.t / w.dur - 0.4) / 0.6) : 1;
  const tier = w.result.tier;
  const colors = tier >= 4 ? ['#ff3b4f', '#ffd23f', '#3dff8b', '#27c8ff', '#c35cff'] : [tier >= 2 ? w.result.color : '#f4f7ff'];
  const count = 8 + tier * 4;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < count; i++) {
    const a = t * (0.3 + tier * 0.15) + (i / count) * TAU;
    ctx.globalAlpha = k * (0.08 + tier * 0.05);
    ctx.fillStyle = colors[i % colors.length];
    ctx.beginPath();
    ctx.moveTo(CX, CY);
    ctx.lineTo(CX + Math.cos(a - 0.1) * 1400, CY + Math.sin(a - 0.1) * 1400);
    ctx.lineTo(CX + Math.cos(a + 0.1) * 1400, CY + Math.sin(a + 0.1) * 1400);
    ctx.fill();
  }
  ctx.restore();
}

function drawWheel(ctx, w) {
  const win = w.phase !== 'spin' && w.result ? w.piece : null;
  ctx.fillStyle = '#07051c';
  ctx.beginPath();
  ctx.arc(CX, CY, RAD + 40, 0, TAU);
  ctx.fill();
  for (const p of w.pieces) {
    const a0 = p.start + w.angle;
    const a1 = a0 + p.size;
    ctx.fillStyle = p.k % 2 ? shade(p.o.color) : p.o.color;
    ctx.beginPath();
    ctx.moveTo(CX, CY);
    ctx.arc(CX, CY, RAD, a0, a1);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#07051c';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.save();
    ctx.translate(CX, CY);
    ctx.rotate(a0 + p.size / 2);
    ctx.font = `${p.size < 0.2 ? 20 : 22}px "Press Start 2P"`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#07051c';
    ctx.fillText(p.o.id === 'cash' ? '€10' : p.o.label.replace(' TICKETS', ' TIX'), RAD - 24, 0);
    ctx.restore();
  }
  if (win && Math.floor(w.revealT * 4) % 2 === 0) {
    ctx.save();
    ctx.strokeStyle = '#f4f7ff';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(CX, CY);
    ctx.arc(CX, CY, RAD, win.start + w.angle, win.start + w.angle + win.size);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
  // rim bulbs: they chase while it spins
  const n = 32;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const on = (i + Math.floor(w.bulbs * (w.phase === 'spin' ? 5 : 2))) % 2 === 0; // A4: under 3 flashes a second
    ctx.fillStyle = on ? '#fff6c8' : '#b37c00';
    ctx.fillRect(CX + Math.cos(a) * (RAD + 20) - 7, CY + Math.sin(a) * (RAD + 20) - 7, 14, 14);
  }
  ctx.fillStyle = '#ff3b4f';
  ctx.beginPath();
  ctx.arc(CX, CY, 70, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#f4f7ff';
  ctx.fillRect(CX - 70, CY + 20, 140, 22);
  outlined(ctx, 'SPIN', CX, CY - 4, 26, '#f4f7ff', 'center');
  // pointer
  ctx.save();
  ctx.translate(CX, CY - RAD - 30);
  ctx.rotate(-w.flap * 0.35);
  ctx.fillStyle = '#07051c';
  ctx.beginPath();
  ctx.moveTo(-34, -40); ctx.lineTo(34, -40); ctx.lineTo(0, 46); ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ff3b4f';
  ctx.beginPath();
  ctx.moveTo(-24, -32); ctx.lineTo(24, -32); ctx.lineTo(0, 30); ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function shade(hex) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.round(v * 0.78);
  return `rgb(${f(n >> 16)}, ${f((n >> 8) & 255)}, ${f(n & 255)})`;
}
