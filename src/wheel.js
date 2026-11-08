// wheel.js: the R7 wheel, dressed as a Christmas slot machine (the look is in wheelart.js). flow.js gives it the
// live odds (setLayout, R24): slice sizes = live odds, an empty tier shows "SOLD OUT - +2 TICKETS", the €10 CASH
// slice appears when a tier is empty. It waits for the player to click (the lever is pulled), then flow.js picks
// the result with a secure random number and SAVES it, then spin() shows it. Effects grow with the tier (1-4).

import { CONFIG } from './config.js';
import * as fx from './fx.js';
import { wheelSfx } from './wheelsound.js';
import { drawSky, drawSnow } from './world.js';
import { outlined } from './game.js';
import { fmtEuro } from './ledger.js';
import { CX, CY, RAD, TAU, spotlight, drawBuildRays, drawMarquee, drawLever, drawWheel } from './wheelart.js';

const POINTER = -Math.PI / 2;
const REVEAL_SECS = [0, 2.4, 3, 3.8, 6];
const T = CONFIG.text;

// Slices: each outcome with base odds is cut into `pieces` slices, mixed around the wheel. live = liveOdds()
// from prizes.js: a slice whose outcome has no chance now shows the sold-out text and gives the fallback, and
// the cash slice is cut out of the first fallback slice. So the area of each result is exactly its live chance.
export function buildPieces(cfg = CONFIG, live = null) {
  const W = cfg.wheel;
  const L = live ? Object.fromEntries(live.list.map((x) => [x.id, x.odds])) : null;
  const base = W.outcomes.filter((o) => o.odds > 0);
  const left = base.map((o) => ({ o, n: o.pieces }));
  const order = [];
  while (left.some((l) => l.n > 0)) {
    for (const l of left) if (l.n > 0) { order.push(l.o); l.n -= 1; }
  }
  const cashO = W.outcomes.find((o) => o.cash);
  const cashSize = L && cashO ? (TAU * L[cashO.id]) / 100 : 0;
  let cut = cashSize > 0;
  let a = 0;
  const out = [];
  order.forEach((o, k) => {
    const off = L && L[o.id] === 0;
    const show = off ? { ...o, short: o.jackpot ? W.jackpotDone : W.soldOut, icon: 'ticket', color: W.soldOutColor, off: true } : o;
    const gives = off ? W.fallbackTo : o.id;
    let size = (TAU * o.odds) / 100 / o.pieces;
    if (cut && o.id === W.fallbackTo) {
      size -= cashSize;
      out.push({ o: show, gives, start: a, size, k });
      a += size;
      out.push({ o: cashO, gives: cashO.id, start: a, size: cashSize, k: k + 1 });
      a += cashSize;
      cut = false;
      return;
    }
    out.push({ o: show, gives, start: a, size, k });
    a += size;
  });
  return out;
}

export function createWheel() {
  const w = { pieces: buildPieces(), angle: 0, t: 0, phase: 'idle', from: 0, to: 0, dur: 1, result: null, under: -1, peg: -1, lever: -1, flap: 0, resolve: null, revealT: 0, bulbs: 0, face: null, readyT: 0 };

  // R24: the live odds and stock for this spin. The painted face is drawn again only when the slices change.
  w.setLayout = (live) => {
    w.live = live;
    const pieces = buildPieces(CONFIG, live);
    const key = pieces.map((p) => `${p.gives}:${p.o.short}:${p.size.toFixed(4)}`).join('|');
    if (key !== w.layoutKey) { w.layoutKey = key; w.pieces = pieces; w.face = null; }
  };

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
    const mine = w.pieces.filter((p) => p.gives === outcome.id); // any slice that gives this result, by its size
    let r = Math.random() * mine.reduce((acc, p) => acc + p.size, 0);
    let piece = mine[mine.length - 1];
    for (const p of mine) { if (r < p.size) { piece = p; break; } r -= p.size; }
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
    drawOddsLine(ctx, w.live);
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

// S7, R24: the live odds and the items left per tier, always on the wheel screen.
function drawOddsLine(ctx, live) {
  const W = CONFIG.wheel;
  const L = live ? Object.fromEntries(live.list.map((x) => [x.id, x.odds])) : Object.fromEntries(W.outcomes.map((o) => [o.id, o.odds]));
  const parts = W.outcomes.filter((o) => o.odds > 0 || L[o.id] > 0)
    .map((o) => (L[o.id] > 0 ? `${o.label} ${L[o.id]}%` : `${o.label} ${(o.jackpot ? W.jackpotDone : W.soldOut).split('\n')[0]}`));
  ctx.fillStyle = 'rgba(7, 5, 28, 0.78)';
  ctx.fillRect(20, 968, 1240, 104);
  const line = parts.join(' · ');
  let size = 30;
  do { ctx.font = `${size}px VT323`; size -= 1; } while (ctx.measureText(line).width > 1220 && size > 20);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#f4f7ff';
  ctx.fillText(line, CX, 1004);
  if (live) {
    const t = live.tiers;
    const tiers = Object.entries(CONFIG.sponsors).map(([k, T]) => `${T.name} ${t[k].free}`).join(' · ');
    const jp = live.jackpot.closed ? '' : `   ·   ${CONFIG.text.jackpot} ${fmtEuro(live.jackpot.value)}`;
    ctx.font = '30px VT323';
    ctx.textAlign = 'right'; // the BETA badge sits bottom-left
    ctx.fillStyle = '#ffd23f';
    ctx.fillText(`${CONFIG.text.itemsLeft}: ${tiers}${jp}`, 1250, 1046);
  }
}
