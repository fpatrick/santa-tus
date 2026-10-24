// wheel.js: the R7 wheel. A wooden wheel with big slices and icons. It waits for the player to click,
// then flow.js picks the result with a secure random number and SAVES it, then spin() shows it.
// Effects and sounds grow with the tier of the result (1-4).

import { CONFIG } from './config.js';
import * as fx from './fx.js';
import { wheelSfx } from './wheelsound.js';
import { drawSky, drawSnow } from './world.js';
import { outlined } from './game.js';
import { iconCanvas } from './sprites.js';

const CX = 640;
const CY = 575;
const RAD = 360;
const POINTER = -Math.PI / 2;
const TAU = Math.PI * 2;
const REVEAL_SECS = [0, 2.4, 3, 3.8, 6];
const T = CONFIG.text;

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
  const w = { pieces: buildPieces(), angle: 0, t: 0, phase: 'idle', from: 0, to: 0, dur: 1, result: null, under: -1, flap: 0, resolve: null, revealT: 0, bulbs: 0, face: null, readyT: 0 };

  // Shows the wheel and waits for the player's click (S7).
  w.waitForClick = () => new Promise((resolve) => {
    w.phase = 'ready';
    w.result = null;
    w.readyT = 0;
    w.onClick = resolve;
  });
  w.click = () => {
    if (w.phase !== 'ready' || !w.onClick) return;
    const r = w.onClick;
    w.onClick = null;
    w.phase = 'windup';
    fx.ring(CX, CY, { color: '#ffd23f', max: RAD + 80, life: 0.5 });
    r();
  };

  // Spins to a random spot inside a slice of `outcome`. Resolves when the reveal is over.
  w.spin = (outcome) => new Promise((resolve) => {
    const mine = w.pieces.filter((p) => p.o.id === outcome.id);
    const piece = mine[Math.floor(Math.random() * mine.length)];
    const spot = piece.start + piece.size * (0.2 + Math.random() * 0.6);
    const base = ((POINTER - spot) % TAU + TAU) % TAU;
    w.from = w.angle % TAU;
    w.to = base + TAU * (CONFIG.wheel.turns + (base < w.from ? 1 : 0));
    w.dur = CONFIG.wheel.spinSeconds;
    w.t = -0.35; // a short wind-up backwards first
    w.result = outcome;
    w.piece = piece;
    w.phase = 'spin';
    w.resolve = resolve;
    wheelSfx.spin(w.dur + 0.35, outcome.tier);
  });

  w.update = (dt) => {
    w.flap = Math.max(0, w.flap - dt * 8);
    w.bulbs += dt;
    if (w.phase === 'ready') {
      w.readyT += dt;
      w.angle += dt * 0.25; // turns slowly while it waits
      if (Math.floor(w.readyT / 1.6) !== Math.floor((w.readyT - dt) / 1.6)) wheelSfx.ready();
    } else if (w.phase === 'spin') {
      w.t += dt;
      if (w.t < 0) { w.angle = w.from - 0.25 * Math.sin(((w.t + 0.35) / 0.35) * Math.PI / 2); return; }
      const k = Math.min(1, w.t / w.dur);
      w.angle = w.from - 0.25 + (w.to - w.from + 0.25) * (1 - (1 - k) ** 4);
      const idx = pieceAt(w);
      if (idx !== w.under) { w.under = idx; w.flap = 1; wheelSfx.tick(1 - k); }
      if (k > 0.5 && Math.random() < dt * 30 * w.result.tier * k) {
        const a = Math.random() * TAU;
        fx.burst(CX + Math.cos(a) * (RAD + 26), CY + Math.sin(a) * (RAD + 26), { count: 2, colors: [w.result.color, '#f4f7ff'], speed: 120, kind: 'star', gravity: 0, life: 0.6 });
      }
      if (k > 0.85 && w.result.tier >= 3) fx.shake(2 + w.result.tier, 0.1);
      if (k >= 1) reveal(w);
    } else if (w.phase === 'reveal') {
      w.revealT += dt;
      if (w.revealT > REVEAL_SECS[w.result.tier]) { w.phase = 'idle'; const r = w.resolve; w.resolve = null; if (r) r(); }
    }
  };

  w.render = (ctx, dt, t) => {
    drawSky(ctx, t, t * 40, 3);
    ctx.fillStyle = 'rgba(7, 5, 28, 0.62)';
    ctx.fillRect(0, 0, 1280, 1080);
    spotlight(ctx, w, t);
    drawBuildRays(ctx, w, t);
    drawWheel(ctx, w);
    drawSnow(ctx, dt, 2);
    outlined(ctx, T.wheelTitle, CX, 110, 56, '#ffd23f', 'center');
    if (w.phase === 'ready') {
      const k = 1 + 0.06 * Math.sin(w.readyT * Math.PI * 2); // breathes, no flashing
      ctx.save();
      ctx.translate(CX, CY + 190);
      ctx.scale(k, k);
      ctx.fillStyle = 'rgba(7, 5, 28, 0.85)';
      ctx.fillRect(-330, -52, 660, 80);
      outlined(ctx, T.clickToSpin, 0, 6, 44, '#ffd23f', 'center');
      ctx.restore();
    }
    ctx.font = '30px VT323';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#c9d2f0';
    ctx.fillText(CONFIG.wheel.outcomes.map((o) => `${o.label} ${o.odds}%`).join('   '), CX, 1030);
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
  wheelSfx.reveal(o.tier);
  fx.celebrate(o.tier, CX, CY, '', o.color);
  const life = REVEAL_SECS[o.tier] + 0.6;
  fx.popText(CONFIG.wheel.tierNames[o.tier], { x: CX, y: CY - 80, size: 34 + o.tier * 6, color: '#f4f7ff', life, rise: 0, plate: true });
  fx.popText(o.label, { x: CX, y: CY + 20, size: o.label.length > 12 ? 40 + o.tier * 4 : 50 + o.tier * 8, color: o.color, life, rise: 0, plate: true, pulse: o.tier >= 4 });
  if (o.tickets) fx.burst(CX, CY, { count: o.tickets * 10, kind: 'ticket', colors: ['#ff8fd0', '#ffd23f'], speed: 900, size: 22, gravity: 900, life: 2 });
}

// A warm spotlight on the wheel; it gets brighter while the player can click.
function spotlight(ctx, w, t) {
  const k = w.phase === 'ready' ? 0.35 + 0.1 * Math.sin(t * 3) : 0.25;
  const g = ctx.createRadialGradient(CX, CY, RAD * 0.6, CX, CY, RAD * 1.7);
  g.addColorStop(0, `rgba(255, 210, 120, ${k})`);
  g.addColorStop(1, 'rgba(255, 210, 120, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1280, 1080);
}

// Light rays behind the wheel. They get stronger as it slows, coloured by the result tier (a hint).
function drawBuildRays(ctx, w, t) {
  if (!w.result || w.phase === 'idle' || w.phase === 'ready') return;
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

// The wheel face is drawn once (wood, paint, icons, labels) and then only rotated.
function face(w) {
  if (w.face) return w.face;
  const size = RAD * 2 + 20;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const g = c.getContext('2d');
  const m = size / 2;
  g.translate(m, m);
  // wood: planks with grain
  g.save();
  g.beginPath();
  g.arc(0, 0, RAD, 0, TAU);
  g.clip();
  g.fillStyle = '#8a5a2b';
  g.fillRect(-m, -m, size, size);
  for (let y = -m; y < m; y += 46) {
    g.fillStyle = (y / 46) % 2 ? '#94622f' : '#7f5126';
    g.fillRect(-m, y, size, 44);
    g.fillStyle = 'rgba(40,20,5,0.55)';
    g.fillRect(-m, y + 44, size, 2);
    for (let k = 0; k < 6; k++) {
      g.strokeStyle = 'rgba(60,30,10,0.25)';
      g.lineWidth = 2;
      g.beginPath();
      const yy = y + 6 + k * 6;
      g.moveTo(-m, yy);
      for (let x = -m; x < m; x += 40) g.quadraticCurveTo(x + 20, yy + Math.sin(x * 0.03 + k + y) * 4, x + 40, yy);
      g.stroke();
    }
  }
  // painted slices (wood shows through)
  for (const p of w.pieces) {
    g.beginPath();
    g.moveTo(0, 0);
    g.arc(0, 0, RAD, p.start, p.start + p.size);
    g.closePath();
    g.globalAlpha = 0.72;
    g.fillStyle = p.k % 2 ? shade(p.o.color) : p.o.color;
    g.fill();
    g.globalAlpha = 1;
    g.strokeStyle = '#3b2210';
    g.lineWidth = 8;
    g.stroke();
    g.strokeStyle = '#d9a35a';
    g.lineWidth = 2;
    g.stroke();
  }
  g.restore();
  // icons and labels
  for (const p of w.pieces) {
    const mid = p.start + p.size / 2;
    g.save();
    g.rotate(mid);
    const thin = p.size < 0.3;
    g.font = `${thin ? 26 : 40}px "Press Start 2P"`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.translate(RAD * (thin ? 0.78 : 0.8), 0);
    g.rotate(Math.PI / 2);
    g.lineWidth = 8;
    g.strokeStyle = '#2a1608';
    g.strokeText(p.o.short, 0, 0);
    g.fillStyle = '#fff6e0';
    g.fillText(p.o.short, 0, 0);
    g.restore();
    if (!thin) {
      g.save();
      g.rotate(mid);
      g.translate(RAD * 0.5, 0);
      g.rotate(Math.PI / 2);
      const ic = iconCanvas(p.o.icon, 6);
      g.drawImage(ic, -ic.width / 2, -ic.height / 2);
      g.restore();
    }
  }
  w.face = c;
  return c;
}

function drawWheel(ctx, w) {
  const win = w.phase === 'reveal' && w.result ? w.piece : null;
  // wooden rim with brass studs and light bulbs
  ctx.fillStyle = '#2a1608';
  ctx.beginPath();
  ctx.arc(CX, CY, RAD + 48, 0, TAU);
  ctx.fill();
  const rim = ctx.createRadialGradient(CX, CY, RAD, CX, CY, RAD + 44);
  rim.addColorStop(0, '#5a3418');
  rim.addColorStop(0.5, '#a8743c');
  rim.addColorStop(1, '#4a2a12');
  ctx.fillStyle = rim;
  ctx.beginPath();
  ctx.arc(CX, CY, RAD + 42, 0, TAU);
  ctx.fill();
  ctx.save();
  ctx.translate(CX, CY);
  ctx.rotate(w.angle);
  const img = face(w);
  ctx.drawImage(img, -img.width / 2, -img.height / 2);
  ctx.restore();
  if (win && Math.floor(w.revealT * 4) % 2 === 0) {
    ctx.save();
    ctx.strokeStyle = '#fff6c8';
    ctx.lineWidth = 12;
    ctx.shadowColor = win.o.color;
    ctx.shadowBlur = 30;
    ctx.beginPath();
    ctx.moveTo(CX, CY);
    ctx.arc(CX, CY, RAD, win.start + w.angle, win.start + w.angle + win.size);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
  const n = 28;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const on = (i + Math.floor(w.bulbs * (w.phase === 'spin' ? 5 : 2))) % 2 === 0; // A4: under 3 flashes a second
    const bx = CX + Math.cos(a) * (RAD + 22);
    const by = CY + Math.sin(a) * (RAD + 22);
    ctx.fillStyle = '#3b2210';
    ctx.beginPath();
    ctx.arc(bx, by, 10, 0, TAU);
    ctx.fill();
    ctx.fillStyle = on ? '#fff6c8' : '#c08a2a';
    ctx.beginPath();
    ctx.arc(bx, by, 7, 0, TAU);
    ctx.fill();
  }
  // hub: wood and brass
  const hub = ctx.createRadialGradient(CX - 20, CY - 20, 10, CX, CY, 74);
  hub.addColorStop(0, '#ffe08a');
  hub.addColorStop(0.5, '#c9962e');
  hub.addColorStop(1, '#6b4612');
  ctx.fillStyle = '#2a1608';
  ctx.beginPath();
  ctx.arc(CX, CY, 80, 0, TAU);
  ctx.fill();
  ctx.fillStyle = hub;
  ctx.beginPath();
  ctx.arc(CX, CY, 72, 0, TAU);
  ctx.fill();
  outlined(ctx, 'SPIN', CX, CY - 2, 26, '#fff6e0', 'center');
  // pointer: a brass arrow with a red jewel
  ctx.save();
  ctx.translate(CX, CY - RAD - 36);
  ctx.rotate(-w.flap * 0.35);
  ctx.fillStyle = '#2a1608';
  ctx.beginPath();
  ctx.moveTo(-38, -44); ctx.lineTo(38, -44); ctx.lineTo(0, 54); ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#d9a83a';
  ctx.beginPath();
  ctx.moveTo(-28, -36); ctx.lineTo(28, -36); ctx.lineTo(0, 40); ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ff3b4f';
  ctx.beginPath();
  ctx.arc(0, -16, 10, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function shade(hex) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.round(v * 0.78);
  return `rgb(${f(n >> 16)}, ${f((n >> 8) & 255)}, ${f(n & 255)})`;
}
