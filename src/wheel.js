// wheel.js: the R7 wheel, dressed as a Christmas slot machine (the look is in wheelart.js). It waits for
// the player to click (the lever is pulled), then flow.js picks the result with a secure random number and
// SAVES it, then spin() shows it. Effects and sounds grow with the tier of the result (1-4).

import { CONFIG } from './config.js';
import * as fx from './fx.js';
import { wheelSfx } from './wheelsound.js';
import { drawSky, drawSnow } from './world.js';
import { outlined } from './game.js';
import { CX, CY, RAD, TAU, spotlight, drawBuildRays, drawMarquee, drawLever, drawWheel } from './wheelart.js';

const POINTER = -Math.PI / 2;
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
  const w = { pieces: buildPieces(), angle: 0, t: 0, phase: 'idle', from: 0, to: 0, dur: 1, result: null, under: -1, peg: -1, lever: -1, flap: 0, resolve: null, revealT: 0, bulbs: 0, face: null, readyT: 0 };

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
    w.lever = 0; // the lever is pulled down, then springs back
    wheelSfx.pull();
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
    if (w.lever >= 0) w.lever += dt;
    if (w.phase === 'ready') {
      w.readyT += dt;
      w.angle += dt * 0.25; // turns slowly while it waits
      if (Math.floor(w.readyT / 1.6) !== Math.floor((w.readyT - dt) / 1.6)) wheelSfx.ready();
    } else if (w.phase === 'spin') {
      w.t += dt;
      if (w.t < 0) { w.angle = w.from - 0.25 * Math.sin(((w.t + 0.35) / 0.35) * Math.PI / 2); return; }
      const k = Math.min(1, w.t / w.dur);
      w.angle = w.from - 0.25 + (w.to - w.from + 0.25) * (1 - (1 - k) ** 4);
      w.under = pieceAt(w);
      const peg = Math.floor((((POINTER - w.angle) % TAU) + TAU) % TAU / (TAU / CONFIG.wheel.pegs));
      if (peg !== w.peg) { w.peg = peg; w.flap = 1; wheelSfx.tick(1 - k); } // clicks over each peg
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
    drawWheel(ctx, w, CONFIG.wheel.pegs);
    drawLever(ctx, leverPull(w.lever));
    drawSnow(ctx, dt, 2);
    drawMarquee(ctx, w, T.wheelTitle);
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
  if (o.tickets || o.cash) fx.burst(CX, CY, { count: (o.tickets || 10) * 10, kind: 'coin', colors: ['#ffd23f'], speed: 900, size: 22, gravity: 900, life: 2 }); // a coin payout
}

// How far down the lever is: pulled fast, then it springs back up (seconds since the click).
function leverPull(t) {
  if (t < 0) return 0;
  if (t < 0.15) return t / 0.15;
  return Math.max(0, 1 - (t - 0.15) / 0.5);
}
